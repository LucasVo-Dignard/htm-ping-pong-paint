const { generateCode } = require('./src/utils/amongus-code.js');
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

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

io.on('connection', (socket) => {
  const code = generateCode();
  console.log(`New connection — assigned code: ${code}`);

  socket.emit('code', code);

  socket.on('disconnect', () => {
    console.log(`Connection with code ${code} closed`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
