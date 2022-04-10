'use strict';

const crypto = require('crypto');

const config = require('../config');

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

module.exports = helpers;
