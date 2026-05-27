import * as THREE from 'three';

export type AnyRenderer = THREE.WebGLRenderer;

export interface RendererCapabilities {
  isWebGPU: boolean;
  supportsTSL: boolean;
  shadowQuality: 'high' | 'medium' | 'low';
}

function probeWebGLQuality(renderer: THREE.WebGLRenderer): 'high' | 'medium' | 'low' {
  const gl = renderer.getContext();
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  if (!ext) return 'medium';
  const name = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string;
  const lower = name.toLowerCase();
  if (lower.includes('intel') || lower.includes('integrated') || lower.includes('mesa')) {
    return 'low';
  }
  if (lower.includes('apple m') && !lower.includes('m3') && !lower.includes('m4')) {
    return 'medium';
  }
  return 'high';
}

export async function createRenderer(): Promise<{ renderer: AnyRenderer; caps: RendererCapabilities }> {
  // WebGPU path — try first; falls through to WebGL on failure or absence
  if (typeof navigator !== 'undefined' && (navigator as any).gpu) {
    try {
      const adapter = await (navigator as any).gpu.requestAdapter();
      if (adapter) {
        // Dynamically import WebGPURenderer to avoid breaking WebGL-only builds
        const { WebGPURenderer } = await import('three/webgpu');
        const r = new WebGPURenderer({ antialias: true }) as any;
        await r.init();
        console.log('[Renderer] Using WebGPURenderer');
        return {
          renderer: r as AnyRenderer,
          caps: { isWebGPU: true, supportsTSL: true, shadowQuality: 'high' },
        };
      }
    } catch (e) {
      console.warn('[Renderer] WebGPU init failed, falling back to WebGL:', e);
    }
  }

  const r = new THREE.WebGLRenderer({ antialias: true });
  const quality = probeWebGLQuality(r);
  console.log(`[Renderer] Using WebGLRenderer (shadow quality: ${quality})`);
  return {
    renderer: r,
    caps: { isWebGPU: false, supportsTSL: false, shadowQuality: quality },
  };
}
