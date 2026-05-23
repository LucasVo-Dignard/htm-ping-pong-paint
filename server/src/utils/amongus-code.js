const { getRandomInt } = require('./random');

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const CODE_LENGTH = 4;
const MAX_ATTEMPTS = 1000;

function generateCode(length = 4) {
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += LETTERS.charAt(getRandomInt(LETTERS.length));
  }
  return code;
}

function isCodeAvailable(code, existingCodes = []) {
  if (!code || !Array.isArray(existingCodes)) {
    return false;
  }
  return !existingCodes.includes(code);
}

function generateUniqueCode(existingCodes = []) {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const code = generateCode(CODE_LENGTH);
    if (isCodeAvailable(code, existingCodes)) {
      return code;
    }
  }
  throw new Error('Unable to generate a unique code after maximum attempts');
}

module.exports = {
  generateCode,
  isCodeAvailable,
  generateUniqueCode,
};
