import 'reflect-metadata';
import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import path from 'path';
import { Container } from 'typedi';
import { generateUniqueCode } from './utils/amongus-code';
import { SessionService } from './services/session.service';

import { PORT } from './constants';
import { SocketEvents } from '../shared/constants';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

const sessionService = Container.get(SessionService);

enum ClientType {
  PC = 'pc',
  MOBILE = 'mobile'
}

function detectDeviceType(req: Request): 'pc' | 'mobile' {
  const userAgent = req.headers['user-agent'] || '';
  const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet|phone/i;
  return mobileRegex.test(userAgent) ? 'mobile' : 'pc';
}

const publicDir = path.join(process.cwd(), 'server/public');
app.use(express.static(publicDir));

app.get('/', (req: Request, res: Response) => {
  const deviceType = detectDeviceType(req);
  if (deviceType === 'mobile') {
    res.sendFile(path.join(publicDir, 'mobile', 'index.html'));
  } else {
    res.sendFile(path.join(publicDir, 'pc', 'index.html'));
  }
});

app.get('/pc', (req: Request, res: Response) => {
  res.sendFile(path.join(publicDir, 'pc', 'index.html'));
});

app.get('/mobile', (req: Request, res: Response) => {
  res.sendFile(path.join(publicDir, 'mobile', 'index.html'));
});

io.on(SocketEvents.CONNECTION, (socket: Socket) => {
  socket.on(SocketEvents.REGISTER, (type: string) => {
    if (type === ClientType.PC) {
      const code = generateUniqueCode(sessionService.getExistingCodes());
      console.log(`New connection — assigned code: ${code}`);
      sessionService.createSession(code, socket);
      socket.data.code = code;
      socket.data.type = ClientType.PC;
      socket.emit(SocketEvents.CODE, code);
    } else if (type === ClientType.MOBILE) {
      socket.data.type = ClientType.MOBILE;
    }
  });

  socket.on(SocketEvents.JOIN, (code: string) => {
    const success = sessionService.addMobileSocket(code, socket);
    if (!success) {
      socket.emit(SocketEvents.JOIN_RESPONSE, 'error');
      return;
    }
    socket.data.code = code;
    socket.emit(SocketEvents.JOIN_RESPONSE, 'success');
    
    const session = sessionService.getSession(code);
    if (session && session.pcSocket) {
      session.pcSocket.emit(SocketEvents.MOBILE_UPDATE, { count: session.mobileSockets.length });
    }
  });

  socket.on(SocketEvents.DISCONNECT, () => {
    const code = socket.data.code;
    const type = socket.data.type;

    if (type === ClientType.PC) {
      if (code) {
        sessionService.removePcSession(code);
      }
    } else if (type === ClientType.MOBILE) {
      if (code) {
        const newCount = sessionService.removeMobileSocket(code, socket);
        const session = sessionService.getSession(code);
        if (session && session.pcSocket) {
          session.pcSocket.emit(SocketEvents.MOBILE_UPDATE, { count: newCount });
        }
      }
    }
  });

  socket.on(SocketEvents.HIT, (hitData: any) => {
    const code = socket.data.code;
    if (!code) {
      console.warn('Hit received from socket with no valid session');
      return;
    }
    sessionService.emitHit(code, hitData);
  });

  socket.on(SocketEvents.MATERIAL_SELECT, (data: any) => {
    const code = socket.data.code;
    if (!code) {
      console.warn('Material select received from socket with no valid session');
      return;
    }
    sessionService.emitMaterialSelect(code, data);
  });

  socket.on(SocketEvents.GAME_START, () => {
    const code = socket.data.code;
    if (!code) {
      console.warn('Game start received from socket with no valid session');
      return;
    }
    sessionService.emitGameStart(code);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
