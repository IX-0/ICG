# ICG - Project Architecture & Context Guide

This is a WebGL first-person puzzle game built with **Three.js** and **Rapier Physics (@dimforge/rapier3d-compat)**. It uses a decoupled, strictly-typed OOP architecture.

**Target audience for this doc:** AI models needing immediate context on codebase conventions, systems, and how to add new features without breaking established patterns.

---

## 🏗️ Core Systems & Topology

### 1. Scene Management (The Island Builder Pattern)
- **`World.ts` is NOT a god object.** It acts only as a state coordinator.
- **Islands (`src/world/islands/`)**: Each stage of the game (Rise, Isolation, Return, Tragedy) has an isolated setup function (e.g., `setupRiseIsland(ctx: IslandContext)`). 
- **`IslandContext`**: Passed to builders. It provides access to factories, physics registration, and an `onTransition` callback to cleanly destroy the current island and load the next via Portals.
- **`PlatformManager`**: Creates pure terrain meshes. It does **not** handle story logic or object spawning.

### 2. Physical Objects & Inheritance Hierarchy
All interactive game objects extend from base classes located in `src/objects/`:
- **`ModeledObject`**: Handles async `.glb` loading. **Do not override `loadModel()`**. Instead, override the `onModelLoaded(model: THREE.Group)` hook to apply textures, scaling, or parse animations once the model is ready.
- **`Interactable`**: Extends `ModeledObject`. Adds typed Rapier physics references (`rigidBody`, `collider`) and the `onInteract(player, heldItem)` contract.
- **`Grabbable`**: Objects the player can pick up, carry, throw, and use. Physics-to-mesh sync uses frame-rate independent lerp: `const t = 1 - Math.pow(0.01, dt);`.

### 3. Physics (`PhysicsSystem.ts`)
Physics shapes and meshes must remain tightly synced to Three.js:
- **Primitives**: Use the discriminated union `PrimitiveShape` for `addFixedPrimitive` / `addDynamicPrimitive` (e.g. `{ type: 'box', size: [hx, hy, hz] }`).
- **Static Trimesh**: `addStaticTrimesh(mesh)` - for unmoving environment geometry. Bakes world transforms.
- **Kinematic Trimesh**: `addKinematicTrimesh(mesh)` - for animated meshes (like a Chest lid). Local geometry only. *Must call `physicsSystem.updateKinematicBodyPose()` every frame to sync.*
- **Crucial Rule**: Always run `mesh.updateWorldMatrix(true, false)` before adding custom physics to ensure parent transforms are flushed into the matrix.

### 4. Animations
- Driven entirely by a unified Three.js `AnimationMixer`.
- Do not manually rotate joints in `update()`.
- Export models from Blender with a single baked NLA track named `"animation"`.

### 5. Interaction System (`InteractionManager.ts`)
- Raycasting and interaction logic is safely abstracted here.
- `GameEngine` does not manually resolve intersections. It calls `interaction.resolveInteractable(hit)` which walks the `THREE.Object3D` parent chain to find the node containing `userData.interactable === true` and its attached class `instance`.
- **Contextual Use**: `IGrabbable.onUse(target?: any)` receives the `target` object the player is looking at, allowing contextual actions (e.g., clicking with `Lighter` while looking at `TikiTorch` calls `torch.setLit(true)`).

### 6. Persistence (`StateManager.ts`)
- Saves `Record<string, IObjectState>` to `localStorage`.
- All story-relevant objects implement `IPersistent` and generate a `persistentId`.
- State includes position, rotation, `isHeld`, and custom metadata (e.g. `isOpen`). `IslandContext` handles restoring state when spanning an object.

### 7. Puzzles (`SequentialPuzzle`)
- Puzzles use a Strategy/Command pattern.
- Consist of `IPuzzleStage` instances managing their own entry, update, and completion logic.
- Adding a new puzzle means writing a new file in `src/puzzles/` and adding it to an Island builder.

---

## 🛠️ Adding a New Interactable Object (Checklist)
1. Create `src/objects/MyObject.ts` extending `Interactable` or `Grabbable`.
2. Set `this.modelPath` in the constructor. Call `this.loadModel()`.
3. Put the `.glb` in `public/models/myobject/`. Do **not** put models in `src/`.
4. Override `onModelLoaded(model: THREE.Group)` to do setup (scaling, finding child nodes).
5. Implement `initPhysics()` using proper API (e.g., `physicsSystem.addStaticTrimesh(this.mesh)`).
6. Implement `onInteract()` / `onUse()`.
7. Register it in the relevant `src/world/islands/*Island.ts` file using `ctx.factory` and `ctx.addPuzzleObject()`.
