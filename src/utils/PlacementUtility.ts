import * as THREE from 'three';

export default class PlacementUtility {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private markers: THREE.Mesh[] = [];
  private points: { x: number; z: number; y: number }[] = [];
  private lastPlayerPos: THREE.Vector3 = new THREE.Vector3();
  private lastIslandOffset: THREE.Vector3 = new THREE.Vector3();

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;
    
    this.initUI();
    this.initEventListeners();
  }

  private initUI(): void {
    // Premium Glassmorphism Container
    this.containerEl = document.createElement('div');
    Object.assign(this.containerEl.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      width: '320px',
      maxHeight: '80vh',
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(16px) saturate(180%)',
      webkitBackdropFilter: 'blur(16px) saturate(180%)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '16px',
      color: '#f8fafc',
      fontFamily: '"Outfit", "Inter", sans-serif',
      boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5), 0 8px 10px -6px rgb(0 0 0 / 0.5)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      zIndex: '999999',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      userSelect: 'none',
    });

    // Panel Header
    const header = document.createElement('div');
    Object.assign(header.style, {
      padding: '16px 20px',
      borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontWeight: '600',
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
      fontSize: '13px',
      background: 'rgba(255, 255, 255, 0.02)',
    });

    const titleSpan = document.createElement('span');
    titleSpan.innerText = '🌴 Scenery Editor Helper';
    titleSpan.style.background = 'linear-gradient(135deg, #38bdf8, #818cf8)';
    titleSpan.style.webkitBackgroundClip = 'text';
    titleSpan.style.webkitTextFillColor = 'transparent';

    this.minimizeBtnEl = document.createElement('button');
    this.minimizeBtnEl.innerText = '−';
    Object.assign(this.minimizeBtnEl.style, {
      background: 'none',
      border: 'none',
      color: '#94a3b8',
      fontSize: '16px',
      cursor: 'pointer',
      padding: '4px 8px',
      borderRadius: '6px',
      transition: 'all 0.2s ease',
    });
    this.minimizeBtnEl.onmouseover = () => { this.minimizeBtnEl.style.backgroundColor = 'rgba(255, 255, 255, 0.06)'; };
    this.minimizeBtnEl.onmouseout = () => { this.minimizeBtnEl.style.backgroundColor = 'transparent'; };
    this.minimizeBtnEl.onclick = () => this.toggleMinimize();

    header.appendChild(titleSpan);
    header.appendChild(this.minimizeBtnEl);
    this.containerEl.appendChild(header);

    // Inner Content Wrapper
    const contentWrapper = document.createElement('div');
    contentWrapper.id = 'placement-helper-content';
    Object.assign(contentWrapper.style, {
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      overflowY: 'auto',
    });

    // Telemetry display
    this.coordsTextEl = document.createElement('div');
    Object.assign(this.coordsTextEl.style, {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '12px',
      fontSize: '12px',
    });
    contentWrapper.appendChild(this.coordsTextEl);

    // Dynamic Placed List
    const listLabel = document.createElement('div');
    listLabel.innerText = 'Placed Scenery Logs:';
    Object.assign(listLabel.style, {
      fontSize: '11px',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      color: '#94a3b8',
      fontWeight: '600',
      marginTop: '4px',
    });
    contentWrapper.appendChild(listLabel);

    this.listContainerEl = document.createElement('div');
    Object.assign(this.listContainerEl.style, {
      backgroundColor: 'rgba(0, 0, 0, 0.25)',
      borderRadius: '8px',
      padding: '8px',
      height: '140px',
      overflowY: 'auto',
      border: '1px solid rgba(255, 255, 255, 0.04)',
      fontSize: '11px',
      fontFamily: 'monospace',
      color: '#cbd5e1',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
    });
    contentWrapper.appendChild(this.listContainerEl);

    // Hotkey Guide
    const guide = document.createElement('div');
    Object.assign(guide.style, {
      backgroundColor: 'rgba(56, 189, 248, 0.06)',
      border: '1px solid rgba(56, 189, 248, 0.15)',
      borderRadius: '8px',
      padding: '10px 12px',
      fontSize: '11px',
      lineHeight: '1.5',
      color: '#38bdf8',
    });
    guide.innerHTML = `
      <strong>💡 Keyboard Hotkeys:</strong><br/>
      • <code style="background: rgba(0,0,0,0.3); padding: 1px 4px; border-radius: 3px;">T</code> — Plant a scenery marker at player feet<br/>
      • <code style="background: rgba(0,0,0,0.3); padding: 1px 4px; border-radius: 3px;">Y</code> — Undo / Delete last placed marker<br/>
      • <code style="background: rgba(0,0,0,0.3); padding: 1px 4px; border-radius: 3px;">U</code> — Clear all markers
    `;
    contentWrapper.appendChild(guide);

    // Action Buttons
    const btnRow = document.createElement('div');
    Object.assign(btnRow.style, {
      display: 'grid',
      gridTemplateColumns: '2fr 1fr 1fr',
      gap: '8px',
      marginTop: '4px',
    });

    this.copyBtnEl = this.createButton('📋 Copy Array', '#6366f1', '#4f46e5');
    this.copyBtnEl.onclick = () => this.copyToClipboard();
    
    this.undoBtnEl = this.createButton('Undo', '#475569', '#334155');
    this.undoBtnEl.onclick = () => this.undoPlacement();

    this.clearBtnEl = this.createButton('Clear', '#dc2626', '#b91c1c');
    this.clearBtnEl.onclick = () => this.clearAll();

    btnRow.appendChild(this.copyBtnEl);
    btnRow.appendChild(this.undoBtnEl);
    btnRow.appendChild(this.clearBtnEl);
    contentWrapper.appendChild(btnRow);

    this.containerEl.appendChild(contentWrapper);
    document.body.appendChild(this.containerEl);

    // Initial List Refresh
    this.refreshList();
  }

  private createButton(text: string, bg: string, hoverBg: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.innerText = text;
    Object.assign(btn.style, {
      backgroundColor: bg,
      color: '#ffffff',
      border: 'none',
      borderRadius: '8px',
      padding: '8px 12px',
      fontSize: '11px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      textAlign: 'center',
    });
    btn.onmouseover = () => { btn.style.backgroundColor = hoverBg; btn.style.transform = 'translateY(-1px)'; };
    btn.onmouseout = () => { btn.style.backgroundColor = bg; btn.style.transform = 'translateY(0)'; };
    return btn;
  }

  private toggleMinimize(): void {
    this.isMinimized = !this.isMinimized;
    const content = document.getElementById('placement-helper-content');
    if (this.isMinimized) {
      if (content) content.style.display = 'none';
      this.containerEl.style.width = '200px';
      this.minimizeBtnEl.innerText = '+';
    } else {
      if (content) content.style.display = 'flex';
      this.containerEl.style.width = '320px';
      this.minimizeBtnEl.innerText = '−';
    }
  }

  private initEventListeners(): void {
    window.addEventListener('keydown', (e) => {
      // Avoid firing hotkeys if focusing an input
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      const key = e.key.toLowerCase();
      if (key === 't') {
        this.placeMarkerAtPlayer();
      } else if (key === 'y') {
        this.undoPlacement();
      } else if (key === 'u') {
        this.clearAll();
      }
    });
  }

  public update(playerPos: THREE.Vector3, islandOffset?: THREE.Vector3): void {
    this.lastPlayerPos.copy(playerPos);
    if (islandOffset) {
      this.lastIslandOffset.copy(islandOffset);
    } else {
      this.lastIslandOffset.set(0, 0, 0);
    }

    const localX = this.lastPlayerPos.x - this.lastIslandOffset.x;
    const localY = this.lastPlayerPos.y - this.lastIslandOffset.y;
    const localZ = this.lastPlayerPos.z - this.lastIslandOffset.z;

    this.coordsTextEl.innerHTML = `
      <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); padding: 8px; border-radius: 8px;">
        <div style="color: #94a3b8; font-size: 10px; margin-bottom: 2px;">GLOBAL COORDS</div>
        <strong>X:</strong> ${this.lastPlayerPos.x.toFixed(2)}<br/>
        <strong>Y:</strong> ${this.lastPlayerPos.y.toFixed(2)}<br/>
        <strong>Z:</strong> ${this.lastPlayerPos.z.toFixed(2)}
      </div>
      <div style="background: rgba(56, 189, 248, 0.05); border: 1px solid rgba(56, 189, 248, 0.1); padding: 8px; border-radius: 8px; color: #38bdf8;">
        <div style="color: #0ea5e9; font-size: 10px; margin-bottom: 2px;">ISLAND LOCAL</div>
        <strong>X:</strong> ${localX.toFixed(2)}<br/>
        <strong>Y:</strong> ${localY.toFixed(2)}<br/>
        <strong>Z:</strong> ${localZ.toFixed(2)}
      </div>
    `;
  }

  private placeMarkerAtPlayer(): void {
    const localPt = {
      x: parseFloat((this.lastPlayerPos.x - this.lastIslandOffset.x).toFixed(2)),
      z: parseFloat((this.lastPlayerPos.z - this.lastIslandOffset.z).toFixed(2)),
      y: parseFloat((this.lastPlayerPos.y - this.lastIslandOffset.y).toFixed(2))
    };
    
    this.points.push(localPt);

    // Create a physical glowing marker in the Three.js scene
    const markerGeo = new THREE.CylinderGeometry(0.2, 0.2, 3.0, 8);
    const markerMat = new THREE.MeshBasicMaterial({ 
      color: 0x38bdf8, 
      transparent: true, 
      opacity: 0.65,
      wireframe: true 
    });
    
    const markerMesh = new THREE.Mesh(markerGeo, markerMat);
    // Put cylinder so its bottom sits on the ground
    markerMesh.position.set(localPt.x, localPt.y + 1.5, localPt.z).add(this.lastIslandOffset);
    
    this.scene.add(markerMesh);
    this.markers.push(markerMesh);

    // Spawn a small solid red dot sphere at the exact spot
    const dotGeo = new THREE.SphereGeometry(0.12, 8, 8);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
    const dotMesh = new THREE.Mesh(dotGeo, dotMat);
    dotMesh.position.set(localPt.x, localPt.y, localPt.z).add(this.lastIslandOffset);
    markerMesh.add(dotMesh);

    this.refreshList();
    this.flashStatus('Marker placed!');
    console.log(`[PlacementUtility] Placed Point: { x: ${localPt.x.toFixed(2)}, z: ${localPt.z.toFixed(2)}, variation: 1, rotation: 0.0 }`);
  }

  private undoPlacement(): void {
    if (this.points.length === 0) return;
    
    this.points.pop();
    const marker = this.markers.pop();
    if (marker) {
      this.scene.remove(marker);
      // Recursively dispose geometries/materials
      marker.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.geometry.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach(m => m.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      });
    }

    this.refreshList();
    this.flashStatus('Last marker removed.');
  }

  private clearAll(): void {
    if (this.points.length === 0) return;

    this.points = [];
    this.markers.forEach((marker) => {
      this.scene.remove(marker);
      marker.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.geometry.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach(m => m.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      });
    });
    this.markers = [];

    this.refreshList();
    this.flashStatus('Cleared all markers.');
  }

  private refreshList(): void {
    this.listContainerEl.innerHTML = '';
    if (this.points.length === 0) {
      this.listContainerEl.innerHTML = '<div style="color: #64748b; font-style: italic; text-align: center; margin-top: 50px;">No markers spawned yet.<br/>Press T to place.</div>';
      return;
    }

    this.points.forEach((pt, idx) => {
      const line = document.createElement('div');
      line.style.padding = '2px 4px';
      line.style.borderBottom = '1px solid rgba(255,255,255,0.03)';
      line.innerHTML = `<span style="color: #38bdf8;">[#${idx + 1}]</span> { x: <strong>${pt.x.toFixed(2)}</strong>, z: <strong>${pt.z.toFixed(2)}</strong> }`;
      this.listContainerEl.appendChild(line);
    });

    // Auto-scroll to bottom
    this.listContainerEl.scrollTop = this.listContainerEl.scrollHeight;
  }

  private copyToClipboard(): void {
    if (this.points.length === 0) {
      this.flashStatus('Nothing to copy!', '#dc2626');
      return;
    }

    // Format coordinates as a TypeScript/JS array of palm tree configs
    const formatted = this.points.map(pt => {
      return `  { x: ${parseFloat(pt.x.toFixed(2))}, z: ${parseFloat(pt.z.toFixed(2))}, variation: 1, rotation: 0.0 }`;
    }).join(',\n');

    const resultString = `[\n${formatted}\n]`;

    navigator.clipboard.writeText(resultString)
      .then(() => {
        this.flashStatus('Copied array to clipboard!');
      })
      .catch((err) => {
        console.error('[PlacementUtility] Clipboard write failed:', err);
        // Fallback alert prompt for manual copying
        window.prompt('Copy coordinate logs manually:', resultString);
      });
  }

  private flashStatus(message: string, color: string = '#10b981'): void {
    const flash = document.createElement('div');
    Object.assign(flash.style, {
      position: 'absolute',
      bottom: '12px',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: color,
      color: '#ffffff',
      fontSize: '11px',
      fontWeight: '600',
      padding: '4px 12px',
      borderRadius: '20px',
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.3)',
      transition: 'opacity 0.3s ease',
      zIndex: '1000000',
      whiteSpace: 'nowrap',
    });
    flash.innerText = message;
    
    this.containerEl.appendChild(flash);
    
    setTimeout(() => {
      flash.style.opacity = '0';
      setTimeout(() => {
        flash.remove();
      }, 300);
    }, 1500);
  }
}
