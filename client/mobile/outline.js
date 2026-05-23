// Mobile outline script
// This file defines the client-side structure and page behavior for the mobile version.
const mobileOutline = {
  init() {
    const root = document.getElementById('app');
    if (!root) return;

    const card = root.querySelector('.page-card');
    if (!card) return;

    this.showTouchHint(card);
  },

  showTouchHint(card) {
    const hint = document.createElement('div');
    hint.className = 'hint';
    hint.textContent = 'Tip: Mobile pages should prioritize touch interactions and responsive layout.';
    card.appendChild(hint);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  mobileOutline.init();
});
