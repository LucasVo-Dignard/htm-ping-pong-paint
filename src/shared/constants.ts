export const ROOM_CODE_LENGTH = 4;
export const ROOM_CODE_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const ROOM_CODE_REGEX = /^[A-Z]{4}$/;
export enum Material {
  METAL = 'metal',
  WOOD = 'wood',
  PLASTIC = 'plastic',
}

export enum SocketEvents {
  CONNECTION = 'connection',
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  REGISTER = 'register',
  JOIN = 'join',
  JOIN_RESPONSE = 'join_response',
  SESSION_ENDED = 'session_ended',
  MOBILE_UPDATE = 'mobile_update',
  CODE = 'code',
  HIT = 'hit',
  MATERIAL_SELECT = 'material_select',
  GAME_START = 'game_start',
}
