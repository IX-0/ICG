import GameEngine from './engine/GameEngine';

// Initialize game on page load
window.addEventListener('load', async () => {
  const game = new GameEngine();
  await game.init();
  game.start();
  // expose for debugging
  (window as any).game = game;
});
