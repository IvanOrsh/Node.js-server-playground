'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const logs = {};

logs.baseDir = path.join(__dirname, '/../.logs/');

logs.append = (file, str, cb) => {
  // open a file for appending
  fs.open(logs.baseDir + file + '.log', 'a', (err, fileDescriptor) => {
    if (!err && fileDescriptor) {
      fs.appendFile(fileDescriptor, str + '\n', err => {
        if (!err) {
          fs.close(fileDescriptor, err => {
            if (!err) {
              cb(false);
            } else {
              cb('Error closing file that was being appended');
            }
          });
        } else {
          cb('Error appending to file');
        }
      });
    } else {
      cb('Could not open file for appendign');
    }
  });
};

// list all the logs and optionally include the compressed logs
logs.list = (includeCompressedlogs, cb) => {
  fs.readdir(logs.baseDir, (err, data) => {
    if (!err && data && data.length > 0) {
      const trimmedFileNames = [];
      for (const fileName of data) {
        if (fileName.indexOf('.log') > -1) {
          trimmedFileNames.push(fileName.replace('.log', ''));
        }

        // add on the .gz files
        if (fileName.indexOf('.gz.b64') > -1 && includeCompressedlogs) {
          trimmedFileNames.push(fileName.replace('.gz.b64', ''));
        }
      }
      cb(false, trimmedFileNames);
    } else {
      cb(err, data);
    }
  });
};

// compress the contents of one .log file into a .gz.b64 file
logs.compress = (logId, newFileId, cb) => {
  const sourceFile = logId + '.log';
  const destFile = newFileId + '.gz.b64';

  // read the source file
  fs.readFile(logs.baseDir + sourceFile, 'utf-8', (err, inputString) => {
    if (!err && inputString) {
      // compress the data using gzib
      zlib.gzip(inputString, (err, buffer) => {
        if (!err && buffer) {
          // send the data to the destination file
          fs.open(logs.baseDir + destFile, 'wx', (err, fileDescriptor) => {
            if (!err && fileDescriptor) {
              fs.writeFile(fileDescriptor, buffer.toString('base64'), err => {
                if (!err) {
                  fs.close(fileDescriptor, err => {
                    if (!err) {
                      cb(false);
                    } else {
                      cb(err);
                    }
                  });
                } else {
                  cb(err);
                }
              });
            } else {
              cb(err);
            }
          });
        } else {
          cb(err);
        }
      });
    } else {
      cb(err);
    }
  });
};

// decompress the contents of a .gz.b64 file into a string variable
logs.decompress = (fileId, cb) => {
  const fileName = fileId + '.gz.b64';
  fs.readFile(logs.baseDir + fileName, 'utf-8', (err, str) => {
    if (!err && str) {
      const inputBuffer = Buffer.from(str, 'base64');
      zlib.unzip(inputBuffer, (err, outputBuffer) => {
        if (!err && outputBuffer) {
          const str = outputBuffer.toString();
          cb(false, str);
        } else {
          cb(err);
        }
      });
    } else {
      cb(err);
    }
  });
};

// truncate a log file
logs.truncate = (logId, cb) => {
  fs.truncate(logs.baseDir + logId + '.log', 0, err => {
    if (!err) {
      cb(false);
    } else {
      cb(err);
    }
  });
};

module.exports = logs;
