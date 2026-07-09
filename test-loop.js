const http = require('http');

const req = http.request({
  hostname: 'localhost',
  port: 3003,
  path: '/dashboard',
  method: 'GET',
}, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.on('data', () => {});
  res.on('end', () => console.log('Done'));
});

req.on('error', console.error);
req.end();
