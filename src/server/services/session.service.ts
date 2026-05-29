import { Service } from 'typedi';
import { Socket } from 'socket.io';
import { SocketEvents } from '../../shared/constants';

export interface Session {
  pcSocket: Socket | null;
  mobileSockets: Socket[];
}

@Service()
export class SessionService {
  private sessions: Record<string, Session> = {};

  createSession(code: string, pcSocket: Socket): void {
    this.sessions[code] = { pcSocket, mobileSockets: [] };
  }

  addMobileSocket(code: string, mobileSocket: Socket): boolean {
    if (!this.sessions[code]) {
      return false;
    }
    this.sessions[code].mobileSockets.push(mobileSocket);
    return true;
  }

  removePcSession(code: string): void {
    delete this.sessions[code];
  }

  removeMobileSocket(code: string, mobileSocket: Socket): number {
    const session = this.sessions[code];
    if (!session) {
      return 0;
    }

    const index = session.mobileSockets.indexOf(mobileSocket);
    if (index !== -1) {
      session.mobileSockets.splice(index, 1);
    }

    return session.mobileSockets.length;
  }

  getSession(code: string): Session | undefined {
    return this.sessions[code];
  }

  getExistingCodes(): string[] {
    return Object.keys(this.sessions);
  }

  emitHit(code: string, hitData: any): void {
    const session = this.sessions[code];
    if (session && session.pcSocket) {
      session.pcSocket.emit(SocketEvents.HIT, hitData);
    }
  }

  emitMaterialSelect(code: string, data: any): void {
    const session = this.sessions[code];
    if (session && session.pcSocket) {
      session.pcSocket.emit(SocketEvents.MATERIAL_SELECT, data);
    }
  }

  emitGameStart(code: string): void {
    const session = this.sessions[code];
    if (session) {
      session.mobileSockets.forEach(mobileSocket => {
        mobileSocket.emit(SocketEvents.GAME_START);
      });
    }
  }

  emitBallHit(code: string): void {
    const session = this.sessions[code];
    if (session) {
      console.log(`Server: Broadcasting BALL_HIT to ${session.mobileSockets.length} mobile sockets in room ${code}`);
      session.mobileSockets.forEach(mobileSocket => {
        mobileSocket.emit(SocketEvents.BALL_HIT);
      });
    } else {
      console.warn(`Server: emitBallHit failed — no session found for room: ${code}`);
    }
  }
}
