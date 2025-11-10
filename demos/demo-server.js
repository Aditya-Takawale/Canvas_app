const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
  let filePath;
  
  if (req.url === '/' || req.url === '/simple-cursor-demo.html') {
    filePath = path.join(__dirname, 'simple-cursor-demo.html');
  } else if (req.url === '/debug') {
    filePath = path.join(__dirname, 'cursor-debug.html');
  } else {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('File not found');
        return;
      }
      
      res.writeHead(200, {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache'
      });
      res.end(data);
    });
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

const PORT = 3333;
server.listen(PORT, () => {
  console.log(`🌐 Demo server running at http://localhost:${PORT}`);
  console.log(`📂 Serving: simple-cursor-demo.html`);
});