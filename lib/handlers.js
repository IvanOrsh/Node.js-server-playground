'use strict';

// TODO: get rid of callback hell (user promises or async / await)

const _data = require('./data');
const helpers = require('./helpers');
const config = require('./config');

// handlers
const handlers = {};

// Users
handlers._users = {};

// Users - post
// Required data: firstName, lastName, phone, password, tosAgreement
// Optional data: none
handlers._users.post = (data, cb) => {
  const firstName = helpers.validName(data.payload.firstName, 0, 50);
  const lastName = helpers.validName(data.payload.lastName, 0, 50);
  const phone = helpers.validPhone(data.payload.phone, 10);
  const password = helpers.validPassword(data.payload.password);
  const tosAgreement = helpers.validTosAgreement(data.payload.tosAgreement);

  if (firstName && lastName && phone && password && tosAgreement) {
    // Make sure that the user doesn't already exist
    _data.read('users', phone, (err, data) => {
      if (err) {
        // Hash the password
        const hashedPassword = helpers.hash(password);
        if (hashedPassword) {
          const userObject = {
            firstName,
            lastName,
            phone,
            hashedPassword,
            tosAgreement
          };
          _data.create(
            'users',
            phone,
            userObject,
            err => {
              if (!err) {
                cb(200);
              } else {
                console.log(err);
                cb(500, { Error: 'Could not create the new user' });
              }
            });
        } else {
          cb(500, { Error: 'Could not hash the user\' password' });
        }
      } else {
        // User already exists
        cb(400, { Error: 'A user with that phone number already exists' });
      }
    });

  } else {
    cb(400, { Error: 'Missing required fields' });
  }
};

// Users - get
// Required data: phone
// Optional data: none
handlers._users.get = (data, cb) => {
  const phone = helpers.validPhone(data.queryStringObject.phone, 10);
  if (phone) {
    // get the token from the headers
    handlers._tokens.verifyToken(data.headers.token, phone, tokenIsValid => {
      if (tokenIsValid) {
        _data.read('users', phone, (err, data) => {
          if (!err && data) {
            delete data.hashedPassword;
            cb(200, data);
          } else {
            cb(404);
          }
        });
      } else {
        cb(403, { Error: 'Missing required token in header, ' +
        'or token is invalid' });
      }
    });
  } else {
    cb(400, { Error: 'Missing required field' });
  }
};

// Users - put
// Required data: phone
// Optional data: firstName, lastName, password (at least one must be specified)
handlers._users.put = (data, cb) => {
  const phone = helpers.validPhone(data.payload.phone, 10);
  const firstName = helpers.validName(data.payload.firstName, 0, 50);
  const lastName = helpers.validName(data.payload.lastName, 0, 50);
  const password = helpers.validPassword(data.payload.password);

  if (phone) {
    if (firstName || lastName || password) {
      handlers._tokens.verifyToken(data.headers.token, phone, tokenIsValid => {
        if (tokenIsValid) {
          _data.read('users', phone, (err, userData) => {
            if (!err && userData) {
              if (firstName) {
                userData.firstName = firstName;
              }
              if (lastName) {
                userData.lastName = lastName;
              }
              if (password) {
                userData.hashedPassword = helpers.hash(password);
              }
              _data.update('users', phone, userData, err => {
                if (!err) {
                  cb(200);
                } else {
                  console.log(err);
                  cb(500, { Error: 'Could not update user' });
                }
              });
            } else {
              cb(400, { Error: 'The specified user does not exist' });
            }
          });
        } else {
          cb(403, { Error: 'Missing required token in header, ' +
          'or token is invalid' });
        }
      });
    } else {
      cb(400, { Error: 'Missing fields to update' });
    }
  } else {
    cb(400, { Error: 'Missing required field' });
  }
};

// Users - delete
// Required data: phone
handlers._users.delete = (data, cb) => {
  const phone = helpers.validPhone(data.queryStringObject.phone, 10);
  if (phone) {
    handlers._tokens.verifyToken(data.headers.token, phone, tokenIsValid => {
      if (tokenIsValid) {
        _data.read('users', phone, (err, userData) => {
          if (!err && userData) {
            _data.delete('users', phone, err => {
              if (!err) {
                // delete each of the check associated with the user
                const userChecks = helpers.validateUserChecks(userData.checks);
                const checksToDelete = userChecks.length;
                if (checksToDelete > 0) {
                  let checksDeleted = 0;
                  let deletionErrors = false;
                  for (const checkId of userChecks) {
                    _data.delete('checks', checkId, err => {
                      if (err) {
                        deletionErrors = true;
                      }
                      checksDeleted++;
                      if (checksDeleted === checksToDelete) {
                        if (!deletionErrors) {
                          cb(200);
                        } else {
                          cb(500, { 'Error': 'Errors encountered while ' +
                          'attempting to delete all of the user\'s checks. ' +
                          'All checks may not have been deleted ' +
                          'from the system successfully.'} );
                        }
                      }
                    });
                  }
                } else {
                  cb(200);
                }
              } else {
                cb(500, { Error: 'Could not delete the specified user' });
              }
            });
          } else {
            cb(400, { Error: 'Could not found the specified user' });
          }
        });
      } else {
        cb(403, { Error: 'Missing required token in header, ' +
        'or token is invalid' });
      }
    });
  } else {
    cb(400, { Error: 'Missing required field' });
  }
};

handlers.users = (data, cb) => {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._users[data.method](data, cb);
  } else {
    cb(405); // method not allowed
  }
};

// Tokens
handlers._tokens = {};

// Tokens - post
// Required data: phone, password
// Optional data: none
handlers._tokens.post = (data, cb) => {
  const phone = helpers.validPhone(data.payload.phone, 10);
  const password = helpers.validPassword(data.payload.password);
  if (phone && password) {
    _data.read('users', phone, (err, userData) => {
      if (!err && userData) {
        const hashedPassword = helpers.hash(password);
        if (hashedPassword === userData.hashedPassword) {
          const tokenId = helpers.createRandomString(20);
          const expires = Date.now() + 1000 * 60 * 60;
          const tokenObject = {
            phone,
            id: tokenId,
            expires,
          };
          _data.create('tokens', tokenId, tokenObject, err => {
            if (!err) {
              cb(200, tokenObject);
            } else {
              cb(500, { Error: 'Could not create the new token' });
            }
          });
        } else {
          cb(400, { Error: 'Password did not match the ' +
           'specified user\'s stored password' });
        }
      } else {
        cb(400, { Error: 'Could not find the specified user' });
      }
    });
  } else {
    cb(400, { Error: 'Missing required fields' });
  }
};

// Tokens - get
// Required data: id
// Optional data: none
handlers._tokens.get = (data, cb) => {
  const id = helpers.validPhone(data.queryStringObject.id, 20); // rename fn
  if (id) {
    _data.read('tokens', id, (err, tokenData) => {
      if (!err && tokenData) {
        cb(200, tokenData);
      } else {
        cb(404);
      }
    });
  } else {
    cb(400, { Error: 'Missing required field' });
  }
};

// Tokens - put
// Required data: id, extend
// Optional data: none
handlers._tokens.put = (data, cb) => {
  const id = helpers.validPhone(data.payload.id, 20); // rename fn
  const extend = helpers.validExtend(data.payload.extend);
  if (id && extend) {
    _data.read('tokens', id, (err, tokenData) => {
      if (!err) {
        if (tokenData.expires > Date.now()) {
          tokenData.expires = Date.now() + 1000 * 60 * 60;
          _data.update('tokens', id, tokenData, err => {
            if (!err) {
              cb(200);
            } else {
              cb(500, { Error: 'Could not update the token\' expiration' });
            }
          });
        } else {
          cb(400, { Error: 'The token has already expires, ' +
           'and cannot be extended' });
        }
      } else {
        cb(400, { Error: 'Specified token does not exist' });
      }
    });
  } else {
    cb(400, { Error: 'Missing required field(s) or field(s) are invalid' });
  }
};

// Tokens - delete
// Required data: id
// Optional data: none
handlers._tokens.delete = (data, cb) => {
  const id = helpers.validPhone(data.queryStringObject.id, 20);
  if (id) {
    _data.read('tokens', id, (err, data) => {
      if (!err && data) {
        _data.delete('tokens', id, err => {
          if (!err) {
            cb(200);
          } else {
            cb(500, { Error: 'Could not delete the specified token' });
          }
        });
      } else {
        cb(400, { Error: 'Could not found the specified token' });
      }
    });
  } else {
    cb(400, { Error: 'Missing required field' });
  }
};

handlers.tokens = (data, cb) => {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._tokens[data.method](data, cb);
  } else {
    cb(405); // method not allowed
  }
};

// Verify if a given id is currently valid for a given user
handlers._tokens.verifyToken = (id, phone, cb) => {
  _data.read('tokens', id, (err, tokenData) => {
    if (!err && tokenData) {
      if (tokenData.phone === phone && tokenData.expires > Date.now()) {
        cb(true);
      } else {
        cb(false);
      }
    } else {
      cb(false);
    }
  });
};

// Checks
handlers._checks = {};

// Checks - post
// Required data: protocol, url, method, successCodes, timeoutSeconds
// Optional data: none
handlers._checks.post = (data, cb) => {
  const protocol = helpers.validateProtocol(data.payload.protocol);
  const url = helpers.validateUrl(data.payload.url);
  const method = helpers.validateMethod(data.payload.method);
  const successCodes = helpers.validateSuccessCodes(data.payload.successCodes);
  const timeoutSec = helpers.validateTimeoutSec(data.payload.timeoutSec);
  if (protocol && url && method && successCodes && timeoutSec) {
    _data.read('tokens', data.headers.token, (err, tokenData) => {
      if (!err && tokenData) {
        const userPhone = tokenData.phone;
        _data.read('users', userPhone, (err, userData) => {
          if (!err && userData) {
            const userChecks = helpers.validateUserChecks(userData.checks);
            if (userChecks.length < config.maxChecks) {
              // create a random id for the check
              const checkId = helpers.createRandomString(20);
              // create the check object, and include the user's phone
              const checkObject = {
                id: checkId,
                userPhone,
                protocol,
                url,
                method,
                successCodes,
                timeoutSec,
              };
              _data.create('checks', checkId, checkObject, err => {
                if (!err) {
                  // add the checkId to the user's object
                  userData.checks = userChecks;
                  userData.checks.push(checkId);
                  // save the new user data
                  _data.update('users', userPhone, userData, err => {
                    if (!err) {
                      cb(200, checkObject);
                    } else {
                      cb(500, { Error: 'Could not update the user ' +
                        'with the new check' });
                    }
                  });
                } else {
                  cb(500, { Error: 'Could not create the new check' });
                }
              });
            } else {
              cb(400, { Error: 'The user already has ' +
              `the maximum number of checks ${config.maxChecks}` });
            }
          } else {
            cb(403); // not authorized
          }
        });
      } else {
        cb(403); // not authorized
      }
    });
  } else {
    cb(400, { Error: 'Missing required input, or inputs are invalid' });
  }
};

// Checks - get
// Required data: id
// Optional data: none
handlers._checks.get = (data, cb) => {
  const id = helpers.validPhone(data.queryStringObject.id, 20);
  if (id) {
    // lookup the check
    _data.read('checks', id, (err, checkData) => {
      if (!err && checkData) {
        // get the token from the headers and belongs to the user who created
        // the check
        handlers._tokens.verifyToken(
          data.headers.token, checkData.userPhone, tokenIsValid => {
            if (tokenIsValid) {
              cb(200, checkData);
            } else {
              cb(403);
            }
          });
      } else {
        cb(404);
      }
    });
  } else {
    cb(400, { Error: 'Missing required field' });
  }
};

// Checks - put
// Required data: id
// Optional data: protocol, url, method, successCodes, timeoutSec
// (one must be sent)
handlers._checks.put = (data, cb) => {
  const id = helpers.validPhone(data.payload.id, 20);
  const protocol = helpers.validateProtocol(data.payload.protocol);
  const url = helpers.validateUrl(data.payload.url);
  const method = helpers.validateMethod(data.payload.method);
  const successCodes = helpers.validateSuccessCodes(data.payload.successCodes);
  const timeoutSec = helpers.validateTimeoutSec(data.payload.timeoutSec);

  if (id) {
    if (protocol || url || method || successCodes || timeoutSec) {
      _data.read('checks', id, (err, checkData) => {
        if (!err && checkData) {
          handlers._tokens.verifyToken(
            data.headers.token, checkData.userPhone, tokenIsValid => {
              if (tokenIsValid) {
                // update the check where necessary
                if (protocol) {
                  checkData.protocol = protocol;
                }
                if (url) {
                  checkData.url = url;
                }
                if (method) {
                  checkData.method = method;
                }
                if (successCodes) {
                  checkData.successCodes = successCodes;
                }
                if (timeoutSec) {
                  checkData.timeoutSec = timeoutSec;
                }
                _data.update('checks', id, checkData, err => {
                  if (!err) {
                    cb(200);
                  } else {
                    cb(500, { Error: 'Could not update the check' });
                  }
                });
              } else {
                cb(403);
              }
            });
        } else {
          cb(400, { Error: 'Check ID did not exist' });
        }
      });
    } else {
      cb(400, { Error: 'Missing fields to update' });
    }
  } else {
    cb(400, { Error: 'Missing required field' });
  }
};

// Checks - delete
// Required data: id
// Optional data: none
handlers._checks.delete = (data, cb) => {
  const id = helpers.validPhone(data.queryStringObject.id, 20);
  if (id) {
    // Lookup the check to delete
    _data.read('checks', id, (err, checkData) => {
      if (!err && checkData) {
        handlers._tokens.verifyToken(
          data.headers.token, checkData.userPhone, tokenIsValid => {
            if (tokenIsValid) {
              // delete the check data
              _data.delete('checks', id, err => {
                if (!err) {
                  _data.read('users', checkData.userPhone, (err, userData) => {
                    if (!err && userData) {
                      const userChecks = helpers.validateUserChecks(
                        userData.checks);
                      // remove the delete check from their list of checks
                      _data.update(
                        'users',
                        checkData.userPhone,
                        userData,
                        err => {
                          if (!err) {
                            cb(200);
                          } else {
                            cb(500, { Error: 'Could not update the user' });
                          }
                        });
                      const checkPos = userChecks.indexOf(id);
                      if (checkPos > -1) {
                        userChecks.splice(checkPos, 1);
                        // re-save the user's data
                      } else {
                        cb(500, { Error: 'Could not find the check' +
                        'on the user\'s object, so could not remove it' });
                      }
                    } else {
                      cb(500, { Error: 'Could not found the user ' +
                      'who created the check, so could not' +
                      'remove the check from the list of ' +
                      'checks on the user object' });
                    }
                  });
                } else {
                  cb(500, { Error: 'Could not delete the check data' });
                }
              });
            } else {
              cb(403);
            }
          });
      } else {
        cb(400, { Error: 'The specified check ID does not exist' });
      }
    });
  } else {
    cb(400, { Error: 'Missing required field' });
  }
};

handlers.checks = (data, cb) => {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._checks[data.method](data, cb);
  } else {
    cb(405); // method not allowed
  }
};

handlers.notFound = (data, cb) => {
  cb(404);
};

handlers.ping = (data, cb) => {
  cb(200);
};

module.exports = handlers;
