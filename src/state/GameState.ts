export default class GameState {
  currentPlatformIndex: number = 0;
  completedPlatforms: Set<number> = new Set();
  isComplete: boolean = false;
  gameStartTime: number = Date.now();

  moveToNextPlatform(): boolean {
    if (this.isComplete) return false;
    this.completedPlatforms.add(this.currentPlatformIndex);
    this.currentPlatformIndex++;
    if (this.currentPlatformIndex >= 9) {
      this.isComplete = true;
      return false;
    }
    return true;
  }

  getCurrentType(): number {
    return Math.floor(this.currentPlatformIndex / 3);
  }

  getCurrentVariation(): number {
    return this.currentPlatformIndex % 3;
  }

  getStoryClue(): string {
    if (this.currentPlatformIndex < 3) return 'Where am I?';
    else if (this.currentPlatformIndex < 6) return 'This looks familiar...';
    else return "It's repeating. I'm trapped in a loop.";
  }

  isPlatformCompleted(index: number): boolean {
    return this.completedPlatforms.has(index);
  }

  getProgress(): number {
    return (this.currentPlatformIndex / 9) * 100;
  }

  reset(): void {
    this.currentPlatformIndex = 0;
    this.completedPlatforms.clear();
    this.isComplete = false;
    this.gameStartTime = Date.now();
  }

  getElapsedTime(): number {
    return (Date.now() - this.gameStartTime) / 1000;
  }
}
