const { generateUniqueCode } = require('./src/utils/amongus-code.js');
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

const PORT = 80; // Default HTTP port: 80, Default HTTPS port: 443

const sessions = {}; // { code: {pcSocket: , mobileSockets: } }

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
  socket.on('register', (type) => {
    if (type == 'pc') {
      const code = generateUniqueCode(Object.keys(sessions));
      console.log(`New connection — assigned code: ${code}`);
      sessions[code] = {pcSocket: socket, mobileSockets: []};
      socket.data.code = code;
      socket.data.type = "pc";
      socket.emit('code', code);
    }
    else if (type == 'mobile') {
      socket.data.type = "mobile";
    }
  });

  socket.on('join', (code) => {
    if (!sessions[code]) { // If the code doesn't correspond to a session
      socket.emit('join_response', 'error');
      return;
    }
    sessions[code].mobileSockets.push(socket);
    socket.data.code = code;
    socket.emit('join_response', 'success');
    sessions[code].pcSocket.emit('mobile_update', {count: sessions[code].mobileSockets.length});
  });

  socket.on('disconnect', () => {
    if (socket.data.type == "pc") {
      delete sessions[socket.data.code];
    }
    else if (socket.data.type == "mobile") {
      const arr = sessions[socket.data.code].mobileSockets;
      arr.splice(arr.indexOf(socket), 1);
      sessions[socket.data.code].pcSocket.emit('mobile_update', {count: sessions[code].mobileSockets.length});
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
