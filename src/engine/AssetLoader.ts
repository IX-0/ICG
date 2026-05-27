import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface LoadedModel {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
}

class AssetLoader {
  private readonly loader = new GLTFLoader();
  private readonly cache = new Map<string, Promise<LoadedModel>>();
  private readonly textureCache = new Map<string, Promise<THREE.Texture>>();
  private readonly textureLoader = new THREE.TextureLoader();
  private instanceTasks: Promise<any>[] = [];
  private loadedCount = 0;
  private totalCount = 0;

  constructor() {
    // Enable THREE's internal Cache for FileLoader (used by GLTF and Texture loader)
    THREE.Cache.enabled = true;
  }

  public onProgress: ((loaded: number, total: number, label: string) => void) | null = null;

  /** Fetch (or return cached) raw GLTF data. One network request per unique path. */
  public fetchGltf(path: string): Promise<LoadedModel> {
    if (!this.cache.has(path)) {
      this.totalCount++;
      const p = new Promise<LoadedModel>((resolve, reject) => {
        this.loader.load(
          path,
          gltf => {
            this.loadedCount++;
            this.onProgress?.(this.loadedCount, this.totalCount, path);
            resolve({ scene: gltf.scene, animations: gltf.animations ?? [] });
          },
          undefined,
          err => {
            console.error(`[AssetLoader] Failed: "${path}"`, err);
            reject(err);
          }
        );
      });
      this.cache.set(path, p);
    }
    return this.cache.get(path)!;
  }

  /** Fetch (or return cached) texture data. */
  public fetchTexture(path: string): Promise<THREE.Texture> {
    if (!this.textureCache.has(path)) {
      this.totalCount++;
      const p = new Promise<THREE.Texture>((resolve, reject) => {
        this.textureLoader.load(
          path,
          texture => {
            this.loadedCount++;
            this.onProgress?.(this.loadedCount, this.totalCount, path);
            resolve(texture);
          },
          undefined,
          err => {
            console.error(`[AssetLoader] Failed texture: "${path}"`, err);
            reject(err);
          }
        );
      });
      this.textureCache.set(path, p);
    }
    return this.textureCache.get(path)!;
  }

  /** Register a per-instance load task (clone + onModelLoaded) so awaitAll() captures it. */
  public trackInstance(task: Promise<any>): void {
    this.instanceTasks.push(task);
  }

  /**
   * Resolves when every tracked instance task has settled. Rejects on timeout.
   * Clears the tracked-task buffer on success so subsequent island loads
   * don't await stale promises.
   */
  public async awaitAll(timeoutMs = 30_000): Promise<void> {
    const pending = this.instanceTasks.slice();
    this.instanceTasks = [];
    const all = Promise.all(pending);
    if (timeoutMs <= 0) { await all; return; }
    const timer = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`AssetLoader timed out after ${timeoutMs}ms`)), timeoutMs)
    );
    await Promise.race([all, timer]);
  }

  public getProgress(): { loaded: number; total: number } {
    return { loaded: this.loadedCount, total: this.totalCount };
  }
}

export const assetLoader = new AssetLoader();
