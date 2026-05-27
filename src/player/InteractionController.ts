import Player from './Player';
import InteractionManager from '../world/interaction/InteractionManager';

export default class InteractionController {
  private player: Player;
  private interaction: InteractionManager;

  constructor(
    player: Player,
    interaction: InteractionManager,
    domElement: HTMLElement,
    onToggleF3: () => void
  ) {
    this.player = player;
    this.interaction = interaction;

    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.code === 'KeyE') this.handleGrabDrop();
      if (e.code === 'KeyF') this.handleUse();
      if (e.code === 'F3') {
        e.preventDefault();
        onToggleF3();
      }
    });

    domElement.addEventListener('mousedown', (e: MouseEvent) => {
      if (!player.getIsLocked()) return;
      if (e.button === 0) this.handleGrabDrop();
      else if (e.button === 2) this.handleUse();
    });

    domElement.addEventListener('contextmenu', (e: MouseEvent) => {
      e.preventDefault();
    });
  }

  public handleGrabDrop(): void {
    const player = this.player;
    if (player.heldItem) {
      const item = player.heldItem;
      player.drop();
      this.interaction.registerInteractive(item.mesh);
      return;
    }

    const hit = this.interaction.raycastFromCamera();
    if (!hit) return;

    let grabObj = hit.object as import('three').Object3D | null;
    while (grabObj) {
      if (grabObj.userData?.grabbable && grabObj.userData.instance) {
        player.grab(grabObj.userData.instance);
        this.interaction.unregisterInteractive(grabObj);
        return;
      }
      grabObj = grabObj.parent;
    }

    const resolved = this.interaction.resolveInteractable(hit);
    if (resolved) resolved.instance.onInteract(player, player.heldItem);
  }

  public handleUse(): void {
    const player = this.player;
    const hit = this.interaction.raycastFromCamera();

    if (hit) {
      const resolved = this.interaction.resolveInteractable(hit);
      if (resolved) {
        resolved.instance.onInteract(player, player.heldItem);
        return;
      }
    }

    if (player.heldItem) {
      const hitTarget = hit ? this.interaction.resolveInteractable(hit) : null;
      player.heldItem.onUse(hitTarget?.instance ?? null);
    }
  }
}
