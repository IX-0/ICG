export type GameProgress = {
  currentPlatformIndex: number;
  isComplete: boolean;
  elapsedTime: number;
};

declare class GameState {
  currentPlatformIndex: number;
  isComplete: boolean;
  constructor();
  moveToNextPlatform(): boolean;
  getProgress(): number;
  getCurrentType(): number;
  getCurrentVariation(): number;
  getStoryClue(): string;
  getElapsedTime(): number;
}

export default GameState;
