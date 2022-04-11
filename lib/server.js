'use strict';

const http = require('http');
const https = require('https');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const fs = require('fs');
const path = require('path');

const config = require('./config');
const handlers = require('./handlers');
const helpers = require('./helpers');

const server = {};

server.router = {
  ping: handlers.ping,
  notFound: handlers.notFound,
  users: handlers.users,
  tokens: handlers.tokens,
  checks: handlers.checks,
};

server.unifiedServer = (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const trimmedPath = path.replace(/^\/+|\/+$/g, '');
  const queryStringObject = parsedUrl.query;
  const method = req.method.toLowerCase();
  const headers = req.headers;
  const decoder = new StringDecoder('utf-8');

  let buffer = '';
  req.on('data', data => {
    buffer += decoder.write(data);
  });
  req.on('end', () => {
    buffer += decoder.end();

    const chosenHandler = server.router[trimmedPath] || handlers.notFound;

    // construct the data object to send to the handler
    const data = {
      trimmedPath,
      queryStringObject,
      method,
      headers,
      payload: helpers.parseJsonToObject(buffer),
    };

    // Route the request to the handler specified in the router
    chosenHandler(data, (statusCode, payload) => {
      statusCode = typeof statusCode === 'number' ? statusCode : 200;
      payload = typeof payload === 'object' ? payload : {};
      const payloadString = JSON.stringify(payload);
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(statusCode);
      res.end(payloadString);

      console.dir({
        statusCode,
        payloadString,
      });
    });
  });
};

server.httpServer = http.createServer((req, res) => {
  server.unifiedServer(req, res);
});

server.httpsServerOptions = {
  key: fs.readFileSync(path.join(__dirname, '/../https/key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '/../https/cert.pem')),
};

server.httpsServer = https.createServer(
  server.httpsServerOptions, (req, res) => {
    server.unifiedServer(req, res);
  }
);

server.init = () => {
  server.httpServer.listen(config.httpPort, () => {
    console.log(`Listening to ${config.httpPort}`);
  });

  server.httpsServer.listen(config.httpsPort, () => {
    console.log(`Listening to ${config.httpsPort}`);
  });
};

module.exports = server;
