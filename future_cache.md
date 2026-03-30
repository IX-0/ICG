Implementation Plan
This plan details how to introduce long-term caching for game models and textures so that returning players experience significantly faster load times after page reloads.

Goal Description
We will leverage the browser's persistent CacheStorage API by designing a transparent Service Worker. This Service Worker will intercept any network requests targeting the models directory. When a model (or its textures/.glb binaries) is fetched for the first time, it will be downloaded normally and transparently cached in the browser. On subsequent reloads, the Service Worker will serve the asset directly from the cache, circumventing the network entirely and resulting in instantaneous loads.

This approach is highly robust and avoids making any changes to the core ModeledObject or GLTFLoader logic inside the game engine, seamlessly working for all existing and future models.

User Review Required
IMPORTANT

By implementing this Service Worker to aggressively cache the /models/ folder, if you drastically update a model's file content without changing its filename, the player might still see the old cached model. To fix this usually requires bumping a cache version string. Are you comfortable with me writing a basic robust offline cache versioning fallback?
Is there any other media you want to cache alongside /models/? (e.g. /textures/ or /audio/)
Proposed Changes
Phase 1: Service Worker Definition
[NEW] public/sw.js
A standard Service Worker script.

Listens to HTTP fetch events globally.
Checks if event.request.url matches the /models/ origin path.
Resolves with caches.match() if a cached copy exists.
Otherwise, runs the network fetch(), clones the successful response into caches.open('icg-models-cache-v1'), and returns it to the game.
Phase 2: Registration Logic
[MODIFY] src/main.ts
Appends a check to navigator.serviceWorker.

typescript
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(reg => console.log('Asset Caching Service Worker Active.', reg.scope))
    .catch(err => console.error('SW failed', err));
}
Open Questions
Does the game depend on any external URL hosts for models (e.g. CDN) that also need to be cached, or are all models strictly loaded locally from the /models/ relative directory path?
Verification Plan
Automated Tests
N/A
Manual Verification
Run npm run dev and load the game.
In the Chrome/Browser DevTools -> Network Panel, check that subsequent page reloads list the models matching (ServiceWorker) in their Size column.
Validate models still load correctly and render physically in RiseIsland.