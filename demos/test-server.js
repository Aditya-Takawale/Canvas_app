// Simple HTTP server to serve the test page
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3002;

const server = http.createServer((req, res) => {
  let filePath;
  
  if (req.url === '/' || req.url === '/test') {
    filePath = path.join(__dirname, 'test-realtime-cursors.html');
  } else if (req.url === '/simple') {
    filePath = path.join(__dirname, 'simple-cursor-test.html');
  } else {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500);
      res.end('Server error');
      return;
    }
    
    res.writeHead(200, {
      'Content-Type': 'text/html',
      'Cache-Control': 'no-cache'
    });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`🌐 Test server running at http://localhost:${PORT}`);
  console.log(`📝 Test page: http://localhost:${PORT}/test`);
});

module.exports = server;