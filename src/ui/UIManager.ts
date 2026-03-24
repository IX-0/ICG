export default class UIManager {
  container: HTMLDivElement;
  storyClue: HTMLDivElement | null = null;
  progressBar: HTMLDivElement | null = null;
  debugInfo: HTMLDivElement | null = null;

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'game-hud';
    this.container.style.cssText = `position: fixed; top:0; left:0; width:100%; height:100%; color:#fff; pointer-events:none; z-index:100;`;
    document.body.appendChild(this.container);
    this.createElements();
  }

  createElements() {
    this.storyClue = document.createElement('div');
    this.storyClue.style.cssText = `position: fixed; top:50%; left:50%; transform:translate(-50%,-50%); font-size:32px; text-align:center; opacity:0; transition:opacity 0.5s; max-width:600px;`;
    this.container.appendChild(this.storyClue);

    this.progressBar = document.createElement('div');
    this.progressBar.style.cssText = `position: fixed; bottom:20px; left:20px; width:200px; height:30px; border:2px solid #fff; background:rgba(0,0,0,0.5); border-radius:5px; overflow:hidden;`;
    const progressFill = document.createElement('div');
    progressFill.id = 'progress-fill';
    progressFill.style.cssText = `height:100%; width:0%; background:linear-gradient(90deg,#0f0,#00f); transition:width 0.3s;`;
    this.progressBar.appendChild(progressFill);
    this.container.appendChild(this.progressBar);

    this.debugInfo = document.createElement('div');
    this.debugInfo.style.cssText = `position: fixed; top:20px; left:20px; font-size:12px; font-family:monospace; background:rgba(0,0,0,0.5); padding:10px; border-radius:5px; max-width:300px; line-height:1.6;`;
    this.container.appendChild(this.debugInfo);

    const instructions = document.createElement('div');
    instructions.style.cssText = `position: fixed; bottom:20px; right:20px; font-size:14px; text-align:right;`;
    instructions.innerHTML = `<p>WASD/Arrows: Move | Mouse: Look | Space: Jump</p><p>Click: Interact | F: Flight Mode (end)</p>`;
    this.container.appendChild(instructions);
  }

  showStoryClue(text: string) {
    if (!this.storyClue) return;
    this.storyClue.textContent = text;
    this.storyClue.style.opacity = '1';
    setTimeout(() => { if (this.storyClue) this.storyClue.style.opacity = '0'; }, 3000);
  }

  update(gameState: any, world: any) {
    const progress = gameState.getProgress();
    const progressFill = document.getElementById('progress-fill');
    if (progressFill) progressFill.style.width = progress + '%';

    const platformType = ['Gravel', 'Sand', 'Volcanic'][gameState.getCurrentType()];
    const platformVar = gameState.getCurrentVariation() + 1;
    const clue = gameState.getStoryClue();

    if (this.debugInfo) {
      this.debugInfo.innerHTML = `<strong>Platform ${gameState.currentPlatformIndex + 1}/9</strong><br>Type: ${platformType}<br>Variation: ${platformVar}/3<br>Progress: ${Math.round(progress)}%<br>Time: ${Math.round(gameState.getElapsedTime())}s<br><br><em>"${clue}"</em>`;
    }

    if (gameState.isComplete) this.showGameComplete();
  }

  showGameComplete() {
    const completeScreen = document.createElement('div');
    completeScreen.style.cssText = `position: fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); display:flex; flex-direction:column; justify-content:center; align-items:center; z-index:1000;`;
    completeScreen.innerHTML = `<h1 style="font-size:48px; margin-bottom:20px;">REVELATION</h1><p style="font-size:24px; max-width:600px; text-align:center; line-height:1.6;">The technology is the antagonist.<br>You are trapped in the system of repetition.<br><br>Press F to enable flight and see the entire map.<br>You are now free to explore the loop itself.</p>`;
    this.container.appendChild(completeScreen);
  }

  clear() {
    this.container.remove();
  }
}
