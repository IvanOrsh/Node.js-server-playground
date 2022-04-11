'use strict';

const crypto = require('crypto');
const https = require('https');
const { URLSearchParams } = require('url');

const config = require('./config');

const helpers = {};

helpers.createRandomString = strLength => {
  strLength = (typeof strLength === 'number' && strLength > 0) ?
    strLength : false;
  if (strLength) {
    const possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let str = '';
    for (let i = 1; i <= strLength; i++) {
      const randomChar = possibleCharacters.charAt(
        Math.floor(Math.random() * possibleCharacters.length));
      str += randomChar;
    }
    return str;
  } else {
    return false;
  }
};

helpers.hash = str => {
  if (typeof str === 'string' && str.length > 0) {
    const hash = crypto.createHmac('sha256', config.hashingSecret)
      .update(str)
      .digest('hex');
    return hash;
  } else {
    return false;
  }
};

helpers.parseJsonToObject = str => {
  try {
    const obj = JSON.parse(str);
    return obj;
  } catch (e) {
    return {};
  }
};

// @TODO: use joi instead
helpers.validName = (name, min, max) => (
  typeof(name) === 'string' &&
  name.trim().length > min &&
  name.trim().length < max ? name.trim() : false
);

helpers.validPhone = (phone, length) => (
  typeof(phone) === 'string' &&
  phone.trim().length === length ? phone.trim() : false
);

helpers.validPassword = password => (
  typeof(password) === 'string' &&
  password.trim().length > 0 ? password.trim() : false
);

helpers.validTosAgreement = tosAgreement => (
  typeof(tosAgreement) === 'boolean' &&
  tosAgreement === true
);

helpers.validExtend = extend => (
  typeof(extend) === 'boolean' &&
  extend === true
);

helpers.validateProtocol = protocol => (
  ['http', 'https'].indexOf(protocol) > -1 ? protocol : false
);

helpers.validateUrl = url => (
  (typeof(url) === 'string' && url.length > 0) ? url : false
);

helpers.validateMethod = method => (
  ['get', 'post', 'put', 'delete'].indexOf(method) > -1 ? method : false
);

helpers.validateSuccessCodes = successCode => (
  (Array.isArray(successCode) && successCode.length > 0) ? successCode : false
);

helpers.validateTimeoutSec = timeoutSec => (
  (typeof(timeoutSec) === 'number' && timeoutSec % 1 === 0 &&
  timeoutSec >= 1 && timeoutSec <= 5) ? timeoutSec : false
);

helpers.validateUserChecks = userChecks => (
  Array.isArray(userChecks) ? userChecks : []
);

// Send an SMS message via Twilio
helpers.sendTwilioSms = (phone, msg, cb) => {
  phone = helpers.validPhone(phone, 10);
  msg = helpers.validName(msg, 0, 1601);
  if (phone && msg) {
    // configure the request payload
    const payload = {
      from: config.twilio.fromPhone,
      to: '+1' + phone,
      Body: msg,
    };

    const stringPayload = new URLSearchParams(payload).toString();

    // configure the request details
    const requestDetails = {
      protocol: 'https:',
      host: 'api.twilio.com',
      method: 'POST',
      path: '/2010-04-01/Accounts/' +
        config.twilio.accountSid +
        '/Messages.json',
      config: config.twilio.accountSid + ':' + config.twilio.authToken,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(stringPayload),
      },
    };

    // instantiate the request object
    const req = https.request(requestDetails, res => {
      // grab the status of the sent request
      const status = res.statusCode;
      if (status === 200 || status === 201) {
        cb(false);
      } else {
        cb(`Status code returned was ${status}`);
      }
    });

    // Bind to the error event so it doesn't get thrown
    req.on('error', e => {
      cb(e);
    });

    // Add the payload
    req.write(stringPayload);

    // end the request
    req.end();

  } else {
    cb('Given parameters were missing or invalid');
  }
};

module.exports = helpers;
