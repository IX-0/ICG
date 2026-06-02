# ICG - Introdução á Computação Gráfica

This is an interactive 3D WebGL game where the player embarks on a symbolic journey mirroring the rise and fall of Napoleon Bonaparte. By navigating across a series of islands—each representing a pivotal stage in his life (The Rise, The Isolation, The Return, and The Tragedy)—the player solves interconnected puzzles that explore themes of power, exile, resurgence, and ultimate demise. The experience features an immersive atmosphere with custom shaders, physics-based interactions, and portal mechanics.

## Project Structure

```text
.
├── src
│   ├── config          # Configuration files for environment, physics, player, etc.
│   ├── engine          # Core game engine logic (rendering, physics, state, audio)
│   ├── interfaces      # TypeScript interfaces and contracts
│   ├── objects         # Game entities and interactables (Boat, Portal, Items)
│   ├── platforms       # Platform generation and mechanics
│   ├── player          # Player controller and interaction logic
│   ├── puzzles         # Puzzle logic for different rituals (Rise, Isolation, etc.)
│   ├── types           # Global TypeScript definitions
│   ├── utils           # Utility functions and placement helpers
│   └── world           # World generation, lighting, water, and islands
├── index.html          # Main HTML entry point
├── package.json        # Project dependencies and scripts
└── vite.config.js      # Vite build configuration
```

## Info
Igor Baltarejo - 118832

Deployment: https://ix-0.github.io/ICG/

Repo: https://github.com/IX-0/ICG

## Video
_Note: Doesnt show puzzle solution, only initial enviroment_  

<video src="./demo.mp4" width="100%" controls></video>

## AI Tools Aknowledgement

I won't write in every single file which was generated or not, since I did not do that from the get go.
I usually use it to make small adjustments and iteration on code design/logic and colors/lighting. 
Used it heavily in the PostFX and when doing some changes to the shaders provided by the Three.js examples (water). For these I used a combination of Claude, for more code focused changes, and Gemini, for the visual design choices.

I also use Gemini very very frequently when working in Blender, as a way to speed up the learning process. Not having to sift through hours fo youtube tutorials or reading the documentation and user threads was vital when learning blender.  


## TODO
- Audio
- Fixing a portal bug introduced in the last version, which only renders the portal if you are in the correct angle.
- Better PostFX
- More animations
- Making the 2 middle islands really work, they were a litle buggy didn't want to show them.