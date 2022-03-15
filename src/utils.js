const req = require('request');

function getInstanceId() {
  return new Promise((resolve, reject) => {
    req.get('http://169.254.169.254/latest/meta-data/instance-id', (error, repsonse, body) => {
      if (error) {
        return reject(error);
      }
      return resolve(body);
    });
  });
}

module.exports = {
  getInstanceId,
};
