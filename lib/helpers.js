'use strict';

const crypto = require('crypto');

const config = require('../config');

const helpers = {};

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

module.exports = helpers;
