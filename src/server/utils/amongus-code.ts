import { getRandomInt } from './random';
import { ROOM_CODE_LENGTH, ROOM_CODE_LETTERS } from '../../shared/constants';
import { MAX_ATTEMPTS } from '../constants';

export function generateCode(length = ROOM_CODE_LENGTH): string {
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += ROOM_CODE_LETTERS.charAt(getRandomInt(ROOM_CODE_LETTERS.length));
  }
  return code;
}

export function isCodeAvailable(code: string, existingCodes: string[] = []): boolean {
  if (!code || !Array.isArray(existingCodes)) {
    return false;
  }
  return !existingCodes.includes(code);
}

export function generateUniqueCode(existingCodes: string[] = []): string {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const code = generateCode(ROOM_CODE_LENGTH);
    if (isCodeAvailable(code, existingCodes)) {
      return code;
    }
  }
  throw new Error('Unable to generate a unique code after maximum attempts');
}
