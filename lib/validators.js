'use strict';

const Joi = require('joi');

const validators = {};

validators.validStrExactLen = (str, len) => {
  try {
    Joi.attempt(str.trim(), Joi.string().length(len).required());
    return str.trim();
  } catch (e) {
    return false;
  }
};

validators.validStrMin = (str, min) => {
  try {
    Joi.attempt(str.trim(), Joi.string().min(min).required());
    return str.trim();
  } catch (e) {
    return false;
  }
};

validators.validObject = obj => {
  try {
    Joi.attempt(obj, Joi.object().required());
    return obj;
  } catch (e) {
    return {};
  }
};

validators.validProtocol = protocol => {
  try {
    Joi.attempt(protocol, Joi.string()
      .pattern(/^https?$/, 'protocols')
      .required());
    return protocol;
  } catch (e) {
    return false;
  }
};

validators.validMethod = method => {
  try {
    Joi.attempt(method, Joi.string()
      .pattern(/^post$|^get$|^put$|^delete$/, 'methods')
      .required());
    return method;
  } catch (e) {
    return false;
  }
};

validators.validState = state => {
  try {
    Joi.attempt(state, Joi.string()
      .pattern(/^up$|^down$/, 'states')
      .required());
    return state;
  } catch (e) {
    console.log('state');
    return 'down';
  }
};

validators.validUrl = url => {
  try {
    Joi.attempt(url, Joi.string().uri().required());
    return url;
  } catch (e) {
    return false;
  }
};

validators.validArray = arr => {
  try {
    Joi.attempt(arr, Joi.array().min(1).required());
    return arr;
  } catch (e) {
    return false;
  }
};

validators.validTimeoutSec = time => {
  try {
    Joi.attempt(time, Joi.number().integer().min(1).less(6).required());
    return time;
  } catch (e) {
    return false;
  }
};

validators.validLastChecked = lastChecked => {
  try {
    Joi.attempt(lastChecked, Joi.number().integer().min(1).required());
    return lastChecked;
  } catch (e) {
    return false;
  }
};


module.exports = validators;
