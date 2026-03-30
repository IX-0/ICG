import * as THREE from 'three';
import LightingSystem from '../LightingSystem';
import PortalSystem from '../PortalSystem';
import InteractionManager from '../InteractionManager';
import StateManager from '../../engine/StateManager';
import PuzzleManager from '../PuzzleManager';
import PlatformManager from '../PlatformManager';
import PlatformFactory from '../../platforms/PlatformFactory';
import Crown from '../../objects/Crown';
import TriggerZone from '../TriggerZone';

export interface IslandContext {
  scene: THREE.Scene;
  platform: any;
  offset: THREE.Vector3;
  lighting: LightingSystem;
  portalSystem: PortalSystem;
  interaction: InteractionManager;
  puzzleManager: PuzzleManager;
  stateManager: StateManager;
  platformManager: PlatformManager;
  factory: PlatformFactory;
  puzzleObjects: any[];
  addPuzzleObject: (obj: any) => void;
  removePuzzleObject: (obj: any) => void;
  addStaticMesh: (mesh: THREE.Object3D) => void;
  loadObjectState: (obj: any) => boolean;
  spawnCrown: (id: string, position?: THREE.Vector3) => Crown;
  onTransition: (nextIndex: number, oldPlatform: any, newPlatform: any) => void;
  activeZones: TriggerZone[];
}

