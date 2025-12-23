# Flip Phone Racer

A retro-inspired endless car racing game with a flip-phone aesthetic. Built with pure vanilla HTML5, CSS, and JavaScript - no frameworks, no external libraries, no build tools required.

## How to Run

### Option 1: Direct (No Server)
Simply open `index.html` in a modern web browser. No server required!

1. Download all files to a folder
2. Open `index.html` in your browser
3. Press any key to start

### Option 2: Docker
Run the game in a Docker container:

**Using Docker:**
```bash
docker build -t flip-phone-racer .
docker run -d -p 8080:80 --name flip-phone-racer flip-phone-racer
```
Then open `http://localhost:8080` in your browser.

**Using Docker Compose:**
```bash
docker-compose up -d
```
Then open `http://localhost:8080` in your browser.

To stop:
```bash
docker-compose down
```

## Controls

### Keyboard
- **Left/Right Arrow** or **A/D**: Change lanes
- **Down Arrow** or **S**: Brake (slow down)
- **Esc** or **P**: Pause game
- **Enter** or **Space**: Confirm/Select
- **~** (tilde): Toggle debug overlay

### Touch (Mobile)
- **Left/Right Buttons**: Change lanes
- **Brake Button**: Slow down
- **Swipe Left/Right**: Alternative lane change method

## Game Rules

### Objective
Survive as long as possible while dodging enemy cars and obstacles. Collect pickups to boost your score and health.

### Scoring
- **Distance Traveled**: Base points increase with distance
- **Coins**: Collect for +100 points each
- **Near Misses**: Pass close to enemy cars for bonus points (+500) and multiplier increase
- **Multiplier**: Increases with successful dodges and pickups, decays over time

### Health
- Start with 3 hearts (varies by difficulty)
- Collision with enemy cars or obstacles removes 1 heart
- Collect heart pickups to restore health
- Game ends when health reaches 0

### Pickups
- **Coin** (yellow circle): +100 points
- **Heart** (pink heart): Restore 1 health point
- **Boost** (green square): Temporary speed boost and score multiplier increase

### Enemy Types
1. **Normal Car**: Steady speed, standard behavior
2. **Slow Truck**: Larger hitbox, moves slower
3. **Weaving Car**: Slightly drifts left and right
4. **Burst Car**: Appears with warning indicator, then accelerates

### Difficulty Levels
- **Easy**: 5 hearts, slower spawn rate
- **Normal**: 3 hearts, standard spawn rate
- **Hard**: 2 hearts, faster spawn rate, higher multiplier cap

## File Overview

- `index.html`: Main HTML structure with canvas element
- `styles.css`: Retro styling, responsive scaling, flip-phone bezel design
- `game.js`: Core game logic, entities, state machine, rendering
- `audio.js`: WebAudio synthesizer for sound effects and background music
- `storage.js`: localStorage wrapper for settings and high scores
- `utils.js`: Math helpers, seeded RNG, input handling

## Architecture

### Game Loop
- Fixed timestep at 60 FPS for consistent physics
- Render every frame for smooth animation
- Accumulator pattern to handle variable frame times

### State Machine
- **BOOT**: Initial loading, wait for user interaction
- **TITLE**: Main menu with play/instructions/settings
- **HOWTO**: Instructions screen
- **SETTINGS**: Configuration options
- **PLAYING**: Active gameplay
- **PAUSED**: Pause overlay
- **GAMEOVER**: Game over screen with restart options

### Entities
- **Player**: Main car with lane-based movement
- **Enemy**: Various enemy car types
- **Pickup**: Collectible items (coins, hearts, boosts)
- **Particle**: Visual effects for collisions and near misses
- **FloatingText**: Score popups and notifications

### Collision Detection
- Axis-Aligned Bounding Boxes (AABB) for all collisions
- Near-miss detection uses horizontal distance threshold

### Spawning System
- Occupancy grid to prevent unfair spawns
- Ensures at least one viable lane is usually available
- Spawn rates increase with game speed

## Settings

Access settings from the title screen:
- **Sound**: Toggle sound effects
- **Music**: Toggle background music
- **Reduced Motion**: Disable screen shake and animations
- **Colorblind Mode**: Switch to colorblind-friendly palette
- **Difficulty**: Easy / Normal / Hard
- **Key Remapping**: Customize controls (planned feature)

## Known Limitations

1. **Settings UI**: Currently simplified - full UI for toggling settings in-game is not fully implemented (settings persist but UI is basic)
2. **Key Remapping**: Storage is ready but UI for remapping keys is not fully implemented
3. **Touch Layout Options**: Touch control layout toggle exists in settings but UI is not fully implemented
4. **Music**: Very simple looping pattern (intentionally minimal)
5. **Mobile Performance**: May struggle on very low-end devices due to canvas rendering

## Technical Details

### Rendering
- Internal resolution: 240×320 pixels (portrait)
- Scales to fit viewport while maintaining aspect ratio
- Pixel-perfect scaling with `image-rendering: pixelated`
- CSS letterboxing for non-matching aspect ratios

### Audio
- WebAudio API synthesizer
- No external audio files
- Square/triangle/sine wave generation
- Master volume, SFX, and music volume controls

### Storage
- Uses localStorage with versioned keys
- Persists: high scores (per difficulty), settings, keybinds
- Gracefully handles localStorage failures

### Accessibility
- Reduced motion support (respects `prefers-reduced-motion`)
- Colorblind-friendly palette option
- Keyboard navigation for all menus
- Touch-friendly controls for mobile

## Ideas for Extension

### New Enemy Types
- Police car (faster, follows player)
- Motorcycle (smaller, faster, weaves more)
- Road block (spans multiple lanes)

### New Pickups
- Shield (temporary invincibility)
- Slow motion (time dilation effect)
- Magnet (attracts nearby pickups)

### New Features
- Power-ups with duration timers
- Combo system with visual feedback
- Daily challenges
- Achievement system
- Leaderboard (requires backend)
- Multiple track themes (rain, night, desert)
- Weather effects (rain reduces visibility)
- Nitro boost with limited charges
- Crash replays

### Visual Enhancements
- Parallax scrolling background
- Particle trail behind player
- More detailed car sprites
- Animated explosions
- Screen transitions between states

### Gameplay Modes
- Time attack (survive X seconds)
- Coin rush (collect as many coins as possible)
- Endless (current mode)
- Challenge mode (specific objectives)

## Browser Compatibility

Tested and working in:
- Chrome/Edge (Chromium)
- Firefox
- Safari (iOS and macOS)
- Mobile browsers (iOS Safari, Chrome Android)

Requires:
- Canvas API support
- WebAudio API support
- localStorage support
- ES6 JavaScript features

## Performance Tips

- Runs best at 60 FPS on mid-range devices
- Debug overlay can be toggled with `~` key
- Reduced motion setting improves performance slightly
- Music can be disabled if performance is an issue

## Credits

Built as a pure vanilla JavaScript implementation with:
- No external dependencies
- No build tools
- No frameworks
- Retro flip-phone game inspiration

## License

Free to use and modify. Enjoy!

