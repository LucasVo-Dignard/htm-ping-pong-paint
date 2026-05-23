const { getRandomInt } = require('./random');

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

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

function generateUniqueCode(existingCodes = [], length = 4, maxAttempts = 1000) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const code = generateCode(length);
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
