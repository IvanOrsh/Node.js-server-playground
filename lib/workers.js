'use strict';

const http = require('http');
const https = require('https');
const url = require('url');

const _data = require('./data');
const helpers = require('./helpers');
const validators = require('./validators');

const workers = {};

// @TODO: rewrite with better syntax
workers.validateCheckData = originalCheckData => {
  originalCheckData = validators.validObject(originalCheckData);
  originalCheckData.id = validators.validStrExactLen(originalCheckData.id, 20);
  originalCheckData.userPhone = validators.validStrExactLen(
    originalCheckData.userPhone, 10);
  originalCheckData.protocol = validators.validProtocol(
    originalCheckData.protocol);
  originalCheckData.url = validators.validStrMin(originalCheckData.url, 1);
  originalCheckData.method = validators.validMethod(originalCheckData.method);
  originalCheckData.successCodes = validators.validArray(
    originalCheckData.successCodes);
  originalCheckData.timeoutSeconds = validators.validTimeoutSec(
    originalCheckData.timeoutSec);

  originalCheckData.state = validators.validState(originalCheckData.state);
  originalCheckData.lastChecked = validators.validLastChecked(
    originalCheckData.lastChecked);

  // if all the checks pass, pass the data along to the next step of the process
  if (
    originalCheckData.id &&
    originalCheckData.userPhone &&
    originalCheckData.protocol &&
    originalCheckData.url &&
    originalCheckData.method &&
    originalCheckData.successCodes &&
    originalCheckData.timeoutSeconds
  ) {
    workers.performCheck(originalCheckData);
  } else {
    console.log('Error: One of the checks is not properly formatted. ' +
                'Skipping it.');
  }
};

workers.performCheck = originalCheckData => {
  // prepare the initial check outcome
  const checkOutcome = {
    error: false,
    responseCode: false,
  };

  // mark that the outcome has not been sent yet
  let outcomeSent = false;

  const parsedUrl = url.parse(originalCheckData.protocol + '://' + originalCheckData.url, true);
  const hostname = parsedUrl.hostname;
  const path = parsedUrl.path;

  const requestDetails = {
    protocol: originalCheckData.protocol + ':',
    hostname,
    method: originalCheckData.method.toUpperCase(),
    path,
    timeout: originalCheckData.timeoutSeconds * 1000,
  };

  const _moduleToUse = originalCheckData.protocol === 'http' ? http : https;
  const req = _moduleToUse.request(requestDetails, res => {
    const status = res.statusCode;

    checkOutcome.responseCode = status;
    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  // bind to the error so it doesn't get thrown
  req.on('error', e => {
    checkOutcome.error = {
      error: true,
      value: e,
    };
    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  // bind to the timeout
  req.on('timeout', e => {
    checkOutcome.error = {
      error: true,
      value: 'timeout',
    };
    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  // end the request
  req.end();
};

// process the check outcome, update the check as needed,
// trigger an alert if needed
workers.processCheckOutcome = (originalCheckData, checkOutcome) => {
  const state = !checkOutcome.error &&
  checkOutcome.responseCode &&
  originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1 ?
    'up' : 'down';

  // decide if an alert is warranted
  const alertWarranted = originalCheckData.lastChecked &&
    originalCheckData.state !== state;

  // update the check data
  const newCheckData = originalCheckData;
  newCheckData.state = state;
  newCheckData.lastChecked = Date.now();

  // save the update
  _data.update('checks', newCheckData.id, newCheckData, err => {
    if (!err) {
      // send the new check data to the next phase of the process if needed
      if (alertWarranted) {
        workers.alertUserToStatusChange(newCheckData);
      } else {
        console.log('Check outcome has not changed, no alert needed');
      }
    } else {
      console.log('Error trying to save updates to one of the checks');
    }
  });
};

// alert the user as to a change in their check status
workers.alertUserToStatusChange = newCheckData => {
  const msg = `Alert: You check for ${newCheckData.method.toUpperCase()} ` +
    `${newCheckData.protocol}://${newCheckData.url} is currentlly ${newCheckData.validState}`;
  helpers.sendTwilioSms(newCheckData.userPhone, msg, err => {
    if (!err) {
      console.log('Success: User was alerted to a status change ' +
        'in their check, via sms', msg);
    } else {
      console.log('Error: could not send sms alert to user who had a ' +
        'state change in their check');
    }
  });
};

workers.gatherAllChecks = () => {
  _data.list('checks', (err, checks) => {
    if (!err && checks && checks.length > 0) {
      for (const check of checks) {
        // read in the check data
        _data.read('checks', check, (err, originalCheckData) => {
          if (!err && originalCheckData) {
            workers.validateCheckData(originalCheckData);
          } else {
            console.log('Error reading one of the check\'s data');
          }
        });
      }

    } else {
      console.log('Error: Could not find any checks to process');
    }
  });
};

workers.loop = () => {
  setInterval(() => {
    workers.gatherAllChecks();
  }, 1000 * 60);
};

workers.init = () => {
  // execute all the checks immediately
  workers.gatherAllChecks();

  // call the loop so the checks will execute later on
  workers.loop();
};


module.exports = workers;
