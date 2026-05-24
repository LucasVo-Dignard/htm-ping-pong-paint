const { generateUniqueCode } = require('./src/utils/amongus-code.js');
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

const ClientType = Object.freeze({
  PC: 'pc',
  MOBILE: 'mobile'
});

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
    if (type == ClientType.PC) {
      const code = generateUniqueCode(Object.keys(sessions));
      console.log(`New connection — assigned code: ${code}`);
      sessions[code] = {pcSocket: socket, mobileSockets: []};
      socket.data.code = code;
      socket.data.type = ClientType.PC;
      socket.emit('code', code);
    }
    else if (type == ClientType.MOBILE) {
      socket.data.type = ClientType.MOBILE;
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
    if (socket.data.type == ClientType.PC) {
      delete sessions[socket.data.code];
    }
    else if (socket.data.type == ClientType.MOBILE) {
      const session = sessions[socket.data.code];
      if (!session) {
        return;
      }

      const mobileIndex = session.mobileSockets.indexOf(socket);
      if (mobileIndex !== -1) {
        session.mobileSockets.splice(mobileIndex, 1);
      }

      if (session.pcSocket) {
        session.pcSocket.emit('mobile_update', {count: session.mobileSockets.length});
      }
    }
  });

  socket.on('hit', (hitData) => {
    const code = socket.data.code;
    if (!code || !sessions[code]) {
      console.warn('Hit received from socket with no valid session');
      return;
    }

    const session = sessions[code];
    if (session.pcSocket) {
      session.pcSocket.emit('hit', hitData);
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
