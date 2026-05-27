import * as THREE from 'three';
import LightingSystem from '../lighting/LightingSystem';
import PortalSystem from '../portals/PortalSystem';
import InteractionManager from '../interaction/InteractionManager';
import StateManager from '../../engine/StateManager';
import PuzzleManager from '../puzzles/PuzzleManager';
import PlatformManager from '../platforms/PlatformManager';
import PlatformFactory from '../../platforms/PlatformFactory';
import Crown from '../../objects/Crown';
import Boat from '../../objects/Boat';
import TriggerZone from '../interaction/TriggerZone';

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
  loadObjectState: (obj: any, opts?: { restoreTransform?: boolean }) => boolean;
  spawnCrown: (id: string, position?: THREE.Vector3) => Crown;
  onTransition: (nextIndex: number, oldPlatform: any, newPlatform: any) => void;
  registerActivation: (callback: () => void) => void;
  activeZones: TriggerZone[];
  /**
   * Animate a boat sailing in from the sea to `dockPos`, then call `onArrived`.
   * Portals should be spawned inside `onArrived`.
   */
  animateBoatArrival: (
    dockPos: THREE.Vector3,
    onArrived: () => void,
    onTick?: (pos: THREE.Vector3) => void
  ) => Boat;
}

