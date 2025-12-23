# Cursor Prompt: Flip-Phone-Inspired Car Racing Web App (Vanilla HTML/CSS/JS)

You are Cursor acting as a senior game engineer + UI designer. Build a complete playable browser game inspired by classic flip-phone “lane racer” games (simple pseudo-3D / top-down hybrid vibe, chunky pixels, arcade HUD, tight controls). The project must be **pure vanilla HTML5, JavaScript, and CSS**. No frameworks, no external libraries, no images required (generate sprites via canvas primitives or embedded SVG if needed), no build tools.

## 1) Core vision and constraints
- **Tone:** nostalgic flip-phone game feel: crisp chunky visuals, high contrast, simple but satisfying audio/feedback, minimal UI.
- **Gameplay:** endless runner style racing: you drive forward, dodge cars/obstacles, collect pickups, survive as speed ramps up.
- **Input:** keyboard + touch controls (mobile friendly).
- **Performance target:** smooth on mid-range phones and laptops; stable 60 FPS where possible.
- **Canvas-based rendering** (one `<canvas>`; optional second canvas for UI if helpful, but prefer one).
- **Resolution scaling:** render internally at a low resolution (e.g., 240x320 or 360x640) and scale up with `image-rendering: pixelated;` for retro vibe.
- **Accessibility:** reduced motion option, colorblind-friendly mode toggle, and remappable keys.

## 2) Deliverables (files to create)
Create this file structure:

- `index.html`
- `styles.css`
- `game.js`
- `audio.js` (tiny synth via WebAudio; no assets)
- `storage.js` (localStorage for settings/high scores)
- `utils.js` (math helpers, RNG, input helpers)
- `README.md` (how to run, controls, design notes)

No other files unless absolutely necessary.

## 3) Game modes and screens
Implement a simple state machine with these screens:

1. **Boot/Loading**
   - Prepares audio context on first user interaction.
   - Initializes settings from localStorage.

2. **Title Screen**
   - Game title, high score, “Press Enter / Tap to Start”
   - Buttons: Play, How to Play, Settings
   - Subtle animated background (scrolling road) but keep motion minimal.

3. **How to Play**
   - Short instructions with icons drawn on canvas.
   - Show control mappings.
   - “Back” button.

4. **Settings**
   - Toggles:
     - Sound on/off
     - Music on/off (simple loop)
     - Reduced motion
     - Colorblind-friendly palette
     - Difficulty: Easy / Normal / Hard
   - Key remapping UI: choose actions and press a key to bind.
   - Touch control layout: Left/Right buttons + optional “Brake” button toggle.

5. **Gameplay**
   - HUD: speed, score, distance, combo/multiplier, hearts/health, current level.
   - Pause overlay (Esc / P): Resume, Restart, Title.

6. **Game Over**
   - Final score, distance, reason of death, new high score indicator.
   - Restart / Title options.

## 4) Visual style (flip-phone inspired)
Render to canvas with a retro/pixel look:
- Internal render size: pick something like **240×320** (portrait) but support landscape too.
- Use a limited palette (8–16 colors). Provide two palettes: default and colorblind-friendly.
- Road style:
  - 3 lanes or 4 lanes (choose 3 for simplicity).
  - Road edges, center dashed lines.
  - Optional pseudo-3D: scale lane markers slightly as they move downward to imply depth.
- Car sprites:
  - Player car: chunky, simple rectangles, with headlights/taillights.
  - Enemy cars: different colors/widths; some drift slightly.
- Effects:
  - Screen shake on collision (disable with reduced motion).
  - Particle sparks on near-miss or collision (very light).
  - Flashing “NEAR MISS!” text for tight dodges.
- UI typography: use a monospace/system font; emulate pixel font via CSS (but no external font files).
- Add “flip phone bezel” feel in CSS: center the canvas in a rounded container with subtle border and “speaker slot”.

## 5) Game mechanics (detailed)
Implement these mechanics exactly:

### Movement & lanes
- Player normally stays aligned to lanes but can “slide” between lanes with easing (so it looks smooth, like old phone racers).
- Actions:
  - Move Left / Move Right (lane change)
  - Brake (optional; reduces speed briefly)
  - Boost pickup (temporary speed increase, limited)
- Lane change should have:
  - Cooldown (tiny, like 120ms) to prevent jitter spamming.
  - Smooth interpolation from lane center A to B over ~120–200ms.

### Speed & difficulty ramp
- Start speed: moderate.
- Over time speed increases gradually.
- Difficulty increases by:
  - Increased spawn frequency
  - Increased obstacle variety
  - Slight enemy lateral drift on higher difficulty
- Make the ramp feel fair (no unavoidable spawns).

### Obstacles
- Enemy cars spawn in lanes and move downward relative to player speed.
- At least 4 enemy types:
  1. Normal car: steady speed.
  2. Slow truck: larger hitbox, slower, encourages lane change.
  3. Weaving car: slight lane drift but still avoidable.
  4. “Burst” car: appears with warning indicator, then accelerates.
- Add static obstacles occasionally (oil slick / cone) that cause slip or speed penalty if hit.

### Pickups
- At least 3 pickup types:
  1. Coin: increases score.
  2. Repair/heart: restore health (cap at max).
  3. Boost: temporary speed boost; also increases score multiplier.
- Pickups must never spawn in an unavoidable collision situation.

### Health / damage
- Player has 3 hearts (configurable per difficulty).
- Collision with enemy/obstacle removes 1 heart, triggers invulnerability window (~1.2s) with blinking.
- While invulnerable, can still collect pickups.

### Scoring
- Score increases by:
  - Distance traveled (base)
  - Coins
  - Near-miss bonus: if you pass within a small margin of an enemy car without collision, add bonus and increase multiplier.
- Multiplier increases with successive near-misses/coins, decays if you go too long without scoring.
- On higher difficulties, multiplier cap is higher.

### Near-miss detection
- Compute near-miss when enemy passes player (crosses a y threshold) and bounding boxes are within a margin horizontally without overlapping.
- Show “NEAR MISS” text and play a sound.

### Fair spawning
- Implement spawn logic that:
  - Avoids placing an enemy directly overlapping another.
  - Avoids forcing unavoidable collisions.
  - Maintains at least one viable lane path most of the time.
- Use a “lookahead occupancy grid” for upcoming spawns (simple array of lanes with time slots).

## 6) Controls (keyboard + touch)
Keyboard defaults:
- Left: ArrowLeft / A
- Right: ArrowRight / D
- Brake: ArrowDown / S
- Pause: Esc / P
- Confirm/Start: Enter / Space

Touch:
- Two big translucent buttons left/right (and optional brake).
- Touch should support multitouch (e.g., hold brake + steer).
- Add swipe controls as optional: swipe left/right to change lane.

## 7) Audio (no assets, WebAudio synth)
Implement in `audio.js`:
- Tiny synth: square/triangle wave beeps.
- Sounds:
  - UI move/select
  - Start
  - Coin pickup
  - Near miss
  - Crash
  - Game over
- Simple looping “music” using scheduled notes (very subtle, optional).
- Must handle browsers requiring user gesture to start audio:
  - Create AudioContext on first click/tap/key press.
- Provide master volume + separate sfx/music toggles.

## 8) Architecture requirements
Implement a clean code architecture:

### Core loop
- `requestAnimationFrame` main loop with fixed timestep accumulator:
  - Update at 60Hz fixed dt (or 120Hz internal but 60 fine).
  - Render every frame.
- Game states: `TITLE`, `HOWTO`, `SETTINGS`, `PLAYING`, `PAUSED`, `GAMEOVER`.

### Entities
- Player, Enemy, Pickup, Particle, FloatingText
- Use simple arrays; avoid heavy OOP if not needed, but keep code readable.

### Collision
- Axis-aligned bounding boxes (AABB).
- Use consistent coordinate system in “world units” based on internal canvas resolution.

### Responsive scaling
- Canvas scales to fit available viewport while preserving aspect ratio.
- Letterbox/pillarbox with CSS background.

### Deterministic-ish RNG
- Provide seeded RNG option for debugging runs (seed in query string `?seed=123`).

### Debug overlay
- Toggle with `~`:
  - FPS
  - Entity counts
  - Current speed
  - Spawn rate
  - Collision boxes toggle
- Make sure debug code doesn’t hurt performance when off.

## 9) Implementation details (be specific)

### Rendering
- Clear screen with background color.
- Draw road:
  - Road rectangle
  - Edge lines
  - Lane divider dashed segments moving downward based on speed.
- Draw entities with simple shapes:
  - Cars: rectangles + windows + lights.
  - Add slight shading to give depth.
- Add camera “bobbing” or shake only on events (disable if reduced motion).
- Render HUD at top/bottom: pixel style boxes.

### Physics / feel
- Lane change uses easing:
  - Use `t` from 0..1 and ease function like `easeOutCubic`.
- Speed changes:
  - Base speed increases slowly with distance.
  - Brake reduces speed multiplicatively for as long as pressed but never below a minimum.
- Prevent “teleporting”:
  - If user presses left while already switching lanes, queue next lane change if it’s valid.

### Spawning
- Use timers:
  - Enemy spawn interval shrinks as speed increases.
  - Pickup spawn interval separate.
- Spawn warnings:
  - For “burst” car: show blinking indicator at top of lane for 0.6s before spawning.

## 10) Persistence and scoring
In `storage.js`:
- Save:
  - High score (per difficulty)
  - Best distance (per difficulty)
  - Settings + keybinds
- Use versioned storage key so future changes don’t break.

On Game Over:
- If new high score, show “NEW RECORD” banner.
- Save immediately.

## 11) Quality checklist (must meet)
- Works by just opening `index.html` (no server needed).
- No console errors.
- Game playable start-to-finish loop (start → play → game over → restart).
- Touch controls work on mobile.
- Audio works after first user gesture.
- Code is commented but not overly verbose.
- Keep functions small and organized by file responsibility.

## 12) Step-by-step build plan inside the codebase
In `README.md`, include:
- How to run
- Controls
- Game rules
- File overview
- Known limitations
- Ideas for extending (new enemy types, track themes, etc.)

## 13) Coding instructions for Cursor
- Write all files completely.
- Prefer clarity over cleverness.
- After implementing, do a quick self-review:
  - ensure state transitions correct
  - ensure spawning fairness
  - ensure scaling correct
  - ensure settings persist
- If any part is ambiguous, choose the simplest implementation that still matches the flip-phone vibe.

Now implement the entire project.
