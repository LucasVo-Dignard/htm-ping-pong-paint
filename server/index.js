const express = require('express');
const { createServer } = require('http');
const path = require('path');

const app = express();
const httpServer = createServer(app);
const PORT = 80; // Default HTTP port: 80, Default HTTPS port: 443

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pc', 'index.html'));
});

app.get('/testBall', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pc', '3d_pingpong_threejs.html'));
});

app.get('/mobile', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/mobile', 'index.html'));
});

httpServer.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
