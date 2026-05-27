import * as THREE from 'three';
import { RendererCapabilities } from '../../engine/Renderer';

// WebGL post-processing
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export interface PostFxConfig {
  bloom: boolean;
  ssao: boolean;
}

export default class PostProcessing {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private caps: RendererCapabilities;

  // WebGL path
  private composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private ssaoPass: SSAOPass | null = null;

  // WebGPU path (lazy-initialized)
  private webgpuPipeline: any = null;

  private _bloomEnabled = false;
  private _active = false;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    caps: RendererCapabilities,
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.caps = caps;

    if (!caps.isWebGPU) {
      this._initWebGL();
    }
    // WebGPU pipeline built lazily on first setEnabled(bloom/ssao=true)
  }

  private _initWebGL(): void {
    this.composer = new EffectComposer(this.renderer as THREE.WebGLRenderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.2,  // strength (tuned down to prevent blowout)
      0.4,  // radius
      2.0, // threshold (raised massively so sky/sand never blooms, only the actual sun/moon/fire)
    );
    this.bloomPass.enabled = false;
    this.composer.addPass(this.bloomPass);

    this.ssaoPass = new SSAOPass(this.scene, this.camera, window.innerWidth / 2, window.innerHeight / 2);
    this.ssaoPass.kernelRadius = 8;
    this.ssaoPass.enabled = false;

    // Wrap the SSAO render pass to temporarily hide mirror groups.
    // This prevents the flat mirror geometry from writing to the SSAO depth/normal buffers,
    // which completely eliminates screen-space depth-aware blur/shadow smudges.
    const originalSSAORender = this.ssaoPass.render;
    this.ssaoPass.render = (renderer: any, writeBuffer: any, readBuffer: any, deltaTime: any, maskActive: any) => {
      const hiddenObjects: THREE.Object3D[] = [];
      this.scene.traverse((obj) => {
        if (
          (obj as any).isReflector ||
          obj.userData.instance?.objectType === 'mirror' ||
          obj.name === 'mirror'
        ) {
          if (obj.visible) {
            obj.visible = false;
            hiddenObjects.push(obj);
          }
        }
      });

      originalSSAORender.call(this.ssaoPass, renderer, writeBuffer, readBuffer, deltaTime, maskActive);

      hiddenObjects.forEach((obj) => {
        obj.visible = true;
      });
    };

    this.composer.addPass(this.ssaoPass);

    this.composer.addPass(new OutputPass());
  }

  private async _initWebGPU(): Promise<void> {
    try {
      // @ts-ignore — three/tsl types incomplete; pass() is exported at runtime
      const { pass } = await import('three/tsl');
      // @ts-ignore
      const { bloom } = await import('three/examples/jsm/tsl/display/BloomNode.js');
      // @ts-ignore
      const { RenderPipeline } = await import('three/webgpu');

      const scenePass = pass(this.scene, this.camera);
      const bloomNode = bloom(scenePass, 0.2, 0.4, 2.0);

      this.webgpuPipeline = new RenderPipeline(this.renderer as any);
      this.webgpuPipeline.outputNode = this._bloomEnabled ? bloomNode : scenePass;

      console.log('[PostProcessing] WebGPU RenderPipeline initialized');
    } catch (e) {
      console.warn('[PostProcessing] WebGPU pipeline init failed, no post-FX:', e);
    }
  }

  async setEnabled(config: PostFxConfig): Promise<void> {
    this._bloomEnabled = config.bloom;
    this._active = config.bloom || config.ssao;

    if (this.caps.isWebGPU) {
      if (this._active && !this.webgpuPipeline) {
        await this._initWebGPU();
      }
      // Update WebGPU pipeline output node on next _initWebGPU rebuild if needed
      return;
    }

    // WebGL path
    if (this.bloomPass) this.bloomPass.enabled = config.bloom;
    if (this.ssaoPass) this.ssaoPass.enabled = config.ssao;
  }

  render(): void {
    if (!this._active) {
      this.renderer.render(this.scene, this.camera);
      return;
    }

    if (this.caps.isWebGPU) {
      if (this.webgpuPipeline) {
        this.webgpuPipeline.render();
      } else {
        this.renderer.render(this.scene, this.camera);
      }
      return;
    }

    if (this.composer) {
      try {
        this.composer.render();
      } catch (e) {
        console.error('[PostProcessing] Composer render failed, falling back:', e);
        this._active = false;
        this.renderer.render(this.scene, this.camera);
      }
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  onResize(width: number, height: number): void {
    this.composer?.setSize(width, height);
    this.bloomPass?.setSize(width, height);
    this.ssaoPass?.setSize(width / 2, height / 2);
  }

  get isActive(): boolean { return this._active; }
}
