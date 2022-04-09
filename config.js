'use strict';

const environments = {};

environments.staging = {
  httpPort: 3000,
  httpsPort: 3001,
  envName: 'staging',
  hashingSecret: 'thisIsASecret',
};

environments.production = {
  httpPort: 5000,
  httpsPort: 5001,
  envName: 'production',
  hashingSecret: 'thisIsAlsoASecret',
};

const currentEnv = process.env.NODE_ENV || '';
const envToExport = environments[currentEnv] || environments.staging;

module.exports = envToExport;
