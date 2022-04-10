'use strict';

const _data = require('./data');
const helpers = require('./helpers');

// handlers
const handlers = {};

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
// @TODO: only let an authenticated user access their object
handlers._users.get = (data, cb) => {
  const phone = helpers.validPhone(data.queryStringObject.phone, 10);
  if (phone) {
    _data.read('users', phone, (err, data) => {
      if (!err && data) {
        delete data.hashedPassword;
        cb(200, data);
      } else {
        cb(404);
      }
    });
  } else {
    cb(400, { Error: 'Missing required field' });
  }
};

// Users - put
// Required data: phone
// Optional data: firstName, lastName, password (at least one must be specified)
// @TODO: only let an authenticated user access their OWN object
handlers._users.put = (data, cb) => {
  const phone = helpers.validPhone(data.payload.phone, 10);
  const firstName = helpers.validName(data.payload.firstName, 0, 50);
  const lastName = helpers.validName(data.payload.lastName, 0, 50);
  const password = helpers.validPassword(data.payload.password);

  if (phone) {
    if (firstName || lastName || password) {
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
    _data.read('users', phone, (err, data) => {
      if (!err && data) {
        _data.delete('users', phone, err => {
          if (!err) {
            cb(200);
          } else {
            cb(500, { Error: 'Could not delete the specified user' });
          }
        });
      } else {
        cb(400, { Error: 'Could not found the specified user' });
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

handlers.notFound = (data, cb) => {
  cb(404);
};

handlers.ping = (data, cb) => {
  cb(200);
};

module.exports = handlers;
