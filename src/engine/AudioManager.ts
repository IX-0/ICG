import * as THREE from 'three';

export type AudioCategory = 'music' | 'ambient' | 'sfx';

interface AudioEntry {
  audio: THREE.Audio;
  category: AudioCategory;
}

// All known sound keys — file paths relative to public/audio/
const AUDIO_PATHS: Record<string, string> = {
  // Ambient (per-island)
  'ambient-rise':      'audio/ambient_ocean.mp3',
  'ambient-isolation': 'audio/ambient_wind.mp3',
  'ambient-return':    'audio/ambient_night.mp3',
  'ambient-tragedy':   'audio/ambient_volcano.mp3',
  // SFX
  'fire-crackle':      'audio/sfx_fire_crackle.mp3',
  'mirror-shatter':    'audio/sfx_mirror_shatter.mp3',
  'portal-hum':        'audio/sfx_portal_hum.mp3',
  'crown-chime':       'audio/sfx_crown_chime.mp3',
  'dig-shovel':        'audio/sfx_dig_shovel.mp3',
  'coffin-close':      'audio/sfx_coffin_close.mp3',
};

// Map island index → ambient track key
const ISLAND_AMBIENT: Record<number, string> = {
  0: 'ambient-rise',
  1: 'ambient-isolation',
  2: 'ambient-return',
  3: 'ambient-tragedy',
};

class AudioManager {
  private listener: THREE.AudioListener | null = null;
  private loader: THREE.AudioLoader = new THREE.AudioLoader();
  private entries: Map<string, AudioEntry> = new Map();

  private volumes: Record<AudioCategory, number> = {
    music:   0.5,
    ambient: 0.4,
    sfx:     0.8,
  };

  private currentAmbientKey: string | null = null;
  private enabled: boolean = true;

  /** Call once after camera is created. */
  public init(camera: THREE.Camera): void {
    this.listener = new THREE.AudioListener();
    (camera as THREE.PerspectiveCamera).add(this.listener);
  }

  public setEnabled(val: boolean): void {
    this.enabled = val;
    if (!val) this.stopAll();
  }

  public setVolume(category: AudioCategory, vol: number): void {
    this.volumes[category] = Math.max(0, Math.min(1, vol));
    this.entries.forEach((entry) => {
      if (entry.category === category) {
        entry.audio.setVolume(this.volumes[category]);
      }
    });
  }

  public getVolume(category: AudioCategory): number {
    return this.volumes[category];
  }

  /** Load + cache an audio buffer for a key. No-ops silently if file missing. */
  private async _load(key: string): Promise<THREE.Audio | null> {
    if (!this.listener) return null;
    const existing = this.entries.get(key);
    if (existing) return existing.audio;

    const path = AUDIO_PATHS[key];
    if (!path) {
      console.warn(`[AudioManager] Unknown audio key: "${key}"`);
      return null;
    }

    // Pre-check: avoid decodeAudioData errors on missing/invalid stubs
    try {
      const probe = await fetch(path, { method: 'HEAD' });
      const ct = probe.headers.get('content-type') ?? '';
      if (!probe.ok || !ct.startsWith('audio/')) {
        // File missing or served as non-audio (e.g. HTML 404 page)
        return null;
      }
    } catch {
      return null;
    }

    return new Promise((resolve) => {
      const audio = new THREE.Audio(this.listener!);
      this.loader.load(
        path,
        (buffer) => {
          audio.setBuffer(buffer);
          const category: AudioCategory = key.startsWith('ambient-') ? 'ambient'
                                        : key.startsWith('music-')   ? 'music'
                                        : 'sfx';
          audio.setVolume(this.volumes[category]);
          this.entries.set(key, { audio, category });
          resolve(audio);
        },
        undefined,
        (err) => {
          console.warn(`[AudioManager] Could not load "${path}": ${(err as any)?.message ?? err}`);
          resolve(null);
        }
      );
    });
  }

  /** Play a one-shot SFX. */
  public async play(key: string): Promise<void> {
    if (!this.enabled) return;
    const audio = await this._load(key);
    if (!audio) return;
    audio.setLoop(false);
    if (audio.isPlaying) audio.stop();
    audio.play();
  }

  /** Start a looping ambient or music track. */
  public async loop(key: string): Promise<void> {
    if (!this.enabled) return;
    const audio = await this._load(key);
    if (!audio) return;
    audio.setLoop(true);
    if (!audio.isPlaying) audio.play();
  }

  /** Stop a specific track. */
  public stop(key: string): void {
    const entry = this.entries.get(key);
    if (entry?.audio.isPlaying) entry.audio.stop();
  }

  public stopAll(): void {
    this.entries.forEach(({ audio }) => {
      if (audio.isPlaying) audio.stop();
    });
  }

  /** Swap island ambient track. Fades out previous, starts new one. */
  public setIslandAmbient(islandIndex: number): void {
    const nextKey = ISLAND_AMBIENT[islandIndex];
    if (!nextKey || nextKey === this.currentAmbientKey) return;

    if (this.currentAmbientKey) this.stop(this.currentAmbientKey);
    this.currentAmbientKey = nextKey;
    this.loop(nextKey);
  }
}

export const audioManager = new AudioManager();
