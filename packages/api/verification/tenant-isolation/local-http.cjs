'use strict';
const http = require('node:http'),
  path = require('node:path'),
  assert = require('node:assert/strict');
module.exports = async function localHTTP(app, socket, name) {
  assert.match(name, /^[a-z-]+$/);
  const target = path.join(socket, name + '.sock'),
    server = http.createServer(app);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(target, resolve);
  });
  return {
    request(method, url, body, headers = {}) {
      return new Promise((resolve, reject) => {
        const text = body === undefined ? undefined : JSON.stringify(body);
        const req = http.request(
          {
            socketPath: target,
            path: url,
            method,
            agent: false,
            headers: {
              'content-type': 'application/json',
              'x-forwarded-for': '127.0.0.1',
              ...headers,
            },
          },
          (res) => {
            let raw = '';
            res.on('data', (chunk) => (raw += chunk));
            res.on('end', () => {
              try {
                resolve({
                  status: res.statusCode,
                  body: raw ? JSON.parse(raw) : null,
                  headers: res.headers,
                });
              } catch (error) {
                reject(Error('Non-JSON response: ' + res.statusCode));
              }
            });
          },
        );
        req.setTimeout(15000, () => req.destroy(Error('Local HTTP test timeout')));
        req.on('error', reject);
        req.end(text);
      });
    },
    async close() {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    },
  };
};
