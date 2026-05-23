// PC outline script
// This file defines the client-side structure and page behavior for the desktop version.
const pcOutline = {
  init() {
    const root = document.getElementById('app');
    if (!root) return;

    const card = root.querySelector('.page-card');
    if (!card) return;

    this.setupKeyboardHints(card);
  },

  setupKeyboardHints(card) {
    const hint = document.createElement('div');
    hint.className = 'hint';
    hint.textContent = 'Tip: Desktop pages can use keyboard and mouse controls.';
    card.appendChild(hint);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  pcOutline.init();
});
