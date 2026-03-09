const http = require('http');

const options = {
  host: 'localhost',
  port: 3000,
  path: '/api/v1/health',
  timeout: 2000,
};

const healthCheck = http.request(options, (res) => {
  console.log(`Health check status: ${res.statusCode}`);
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

healthCheck.on('error', (error) => {
  console.error('Health check failed:', error.message);
  process.exit(1);
});

healthCheck.end();