import * as THREE from 'three';

export type PlatformType = 'gravel' | 'sand' | 'volcanic';

export interface PlatformConfig {
  index: number;
  type: PlatformType;
  variation: number;
  size: number;
  height: number;
}

declare class PlatformFactory {
  constructor();

  createPlatformMesh(config: PlatformConfig): THREE.Object3D;
  createProps(config: PlatformConfig): THREE.Object3D[];
  createButton(config: PlatformConfig): THREE.Object3D;
}

export default PlatformFactory;
