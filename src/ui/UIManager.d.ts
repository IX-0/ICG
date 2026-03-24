import * as THREE from 'three';
import World from '../world/World';

declare class UIManager {
  container: HTMLDivElement;
  constructor();
  createElements(): void;
  showStoryClue(text: string): void;
  update(gameState: any, world: World): void;
  showGameComplete(): void;
  clear(): void;
}

export default UIManager;
