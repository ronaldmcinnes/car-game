// Main game logic and state machine

// Game constants
const GAME_CONFIG = {
    CANVAS_WIDTH: 600,
    CANVAS_HEIGHT: 650,
    LANES: 5,
    LANE_WIDTH: 100,
    ROAD_X: 50,
    ROAD_WIDTH: 500,
    
    // Player
    PLAYER_SPEED_INIT: 2.0,
    PLAYER_SPEED_MAX: 8.0,
    PLAYER_SPEED_INC: 0.001, // per frame
    LANE_CHANGE_DURATION: 180, // ms
    LANE_CHANGE_COOLDOWN: 120, // ms
    BRAKE_MULTIPLIER: 0.7,
    
    // Enemy spawn
    ENEMY_SPAWN_INIT: 1800, // ms
    ENEMY_SPAWN_MIN: 800,
    ENEMY_SPAWN_DECREASE: 0.2, // per second
    
    // Pickup spawn
    PICKUP_SPAWN_INIT: 3000,
    PICKUP_SPAWN_MIN: 1500,
    
    // Collision
    NEAR_MISS_MARGIN: 25,
    INVULNERABILITY_TIME: 1200, // ms
    
    // Scoring
    SCORE_DISTANCE_MULT: 0.1,
    SCORE_COIN: 100,
    SCORE_NEAR_MISS: 500,
    MULTIPLIER_MAX: 10,
    MULTIPLIER_DECAY_TIME: 3000, // ms
};

// Color palettes
const PALETTE_NORMAL = {
    bg: '#1a1a2e',
    road: '#16213e',
    roadLine: '#0f3460',
    roadDash: '#e94560',
    player: '#00d4ff',
    enemy1: '#ff6b6b',
    enemy2: '#ffa500',
    enemy3: '#9b59b6',
    enemy4: '#ff1744',
    coin: '#ffd700',
    heart: '#ff1493',
    boost: '#00ff00',
    text: '#ffffff',
    hudBg: 'rgba(0, 0, 0, 0.7)',
    obstacle: '#8b4513'
};

const PALETTE_COLORBLIND = {
    bg: '#1a1a1a',
    road: '#2a2a2a',
    roadLine: '#1a1a1a',
    roadDash: '#ffff00',
    player: '#00ffff',
    enemy1: '#ff4444',
    enemy2: '#ff8800',
    enemy3: '#aa44ff',
    enemy4: '#ff0044',
    coin: '#ffff44',
    heart: '#ff44ff',
    boost: '#44ff44',
    text: '#ffffff',
    hudBg: 'rgba(0, 0, 0, 0.8)',
    obstacle: '#886644'
};

// Entity: Player
class Player {
    constructor() {
        this.lane = Math.floor(GAME_CONFIG.LANES / 2); // Start in middle lane
        this.targetLane = Math.floor(GAME_CONFIG.LANES / 2);
        this.x = GAME_CONFIG.ROAD_X + GAME_CONFIG.LANE_WIDTH / 2 + this.lane * GAME_CONFIG.LANE_WIDTH;
        this.y = GAME_CONFIG.CANVAS_HEIGHT - 140;
        this.width = 70;
        this.height = 100;
        this.speed = GAME_CONFIG.PLAYER_SPEED_INIT;
        this.baseSpeed = GAME_CONFIG.PLAYER_SPEED_INIT;
        this.laneChangeProgress = 1.0; // 0 to 1
        this.laneChangeCooldown = 0;
        this.invulnerable = false;
        this.invulnerableTime = 0;
        this.health = 3;
        this.maxHealth = 3;
        this.boostActive = false;
        this.boostTime = 0;
    }
    
    update(dt, game) {
        // Handle lane change
        const targetX = GAME_CONFIG.ROAD_X + GAME_CONFIG.LANE_WIDTH / 2 + this.targetLane * GAME_CONFIG.LANE_WIDTH;
        
        if (this.laneChangeProgress < 1.0) {
            this.laneChangeProgress += dt / GAME_CONFIG.LANE_CHANGE_DURATION;
            if (this.laneChangeProgress >= 1.0) {
                this.laneChangeProgress = 1.0;
                this.lane = this.targetLane;
            }
            this.x = MathUtils.lerp(
                GAME_CONFIG.ROAD_X + GAME_CONFIG.LANE_WIDTH / 2 + this.lane * GAME_CONFIG.LANE_WIDTH,
                targetX,
                MathUtils.easeOutCubic(this.laneChangeProgress)
            );
        } else {
            this.x = targetX;
        }
        
        // Update cooldown
        if (this.laneChangeCooldown > 0) {
            this.laneChangeCooldown -= dt;
        }
        
        // Update speed
        this.baseSpeed = Math.min(
            GAME_CONFIG.PLAYER_SPEED_MAX,
            this.baseSpeed + GAME_CONFIG.PLAYER_SPEED_INC
        );
        
        // Apply brake
        if (game.input.actions.brake) {
            this.speed = this.baseSpeed * GAME_CONFIG.BRAKE_MULTIPLIER;
        } else {
            this.speed = this.baseSpeed;
        }
        
        // Apply boost
        if (this.boostActive) {
            this.speed = this.baseSpeed * 1.5;
            this.boostTime -= dt;
            if (this.boostTime <= 0) {
                this.boostActive = false;
            }
        }
        
        // Update invulnerability
        if (this.invulnerable) {
            this.invulnerableTime -= dt;
            if (this.invulnerableTime <= 0) {
                this.invulnerable = false;
            }
        }
    }
    
    tryChangeLane(direction, game) {
        if (this.laneChangeProgress < 1.0 || this.laneChangeCooldown > 0) return;
        
        const newLane = this.targetLane + direction;
        if (newLane >= 0 && newLane < GAME_CONFIG.LANES) {
            this.targetLane = newLane;
            this.laneChangeProgress = 0;
            this.laneChangeCooldown = GAME_CONFIG.LANE_CHANGE_COOLDOWN;
        }
    }
    
    takeDamage() {
        if (this.invulnerable) return false;
        this.health--;
        this.invulnerable = true;
        this.invulnerableTime = GAME_CONFIG.INVULNERABILITY_TIME;
        return this.health <= 0;
    }
    
    heal() {
        if (this.health < this.maxHealth) {
            this.health++;
            return true;
        }
        return false;
    }
    
    activateBoost(duration = 3000) {
        this.boostActive = true;
        this.boostTime = duration;
    }
}

// Entity: Enemy Car
class Enemy {
    constructor(lane, type = 'normal') {
        this.lane = lane;
        this.type = type; // 'normal', 'slow', 'weaving', 'burst'
        this.x = GAME_CONFIG.ROAD_X + GAME_CONFIG.LANE_WIDTH / 2 + lane * GAME_CONFIG.LANE_WIDTH;
        this.y = -100;
        this.width = type === 'slow' ? 85 : 70;
        this.height = type === 'slow' ? 120 : 100;
        this.speed = 0;
        this.weaveOffset = 0;
        this.weaveTime = 0;
        this.burstWarning = type === 'burst';
        this.burstTime = 600;
    }
    
    update(dt, playerSpeed) {
        // Move downward
        this.speed = playerSpeed;
        
        if (this.type === 'slow') {
            this.speed *= 0.7;
        } else if (this.type === 'burst') {
            if (this.burstWarning) {
                this.burstTime -= dt;
                if (this.burstTime <= 0) {
                    this.burstWarning = false;
                    this.speed *= 1.3;
                }
            }
        }
        
        this.y += this.speed;
        
        // Weaving motion
        if (this.type === 'weaving') {
            this.weaveTime += dt * 0.005;
            this.weaveOffset = Math.sin(this.weaveTime) * 15;
            this.x = GAME_CONFIG.ROAD_X + GAME_CONFIG.LANE_WIDTH / 2 + this.lane * GAME_CONFIG.LANE_WIDTH + this.weaveOffset;
        }
    }
    
    isOffScreen() {
        return this.y > GAME_CONFIG.CANVAS_HEIGHT + 20;
    }
}

// Entity: Pickup
class Pickup {
    constructor(lane, type) {
        this.lane = lane;
        this.type = type; // 'coin', 'heart', 'boost'
        this.x = GAME_CONFIG.ROAD_X + GAME_CONFIG.LANE_WIDTH / 2 + lane * GAME_CONFIG.LANE_WIDTH;
        this.y = -50;
        this.width = 50;
        this.height = 50;
        this.rotation = 0;
        this.speed = 0;
    }
    
    update(dt, playerSpeed) {
        this.speed = playerSpeed;
        this.y += this.speed;
        this.rotation += dt * 0.01;
    }
    
    isOffScreen() {
        return this.y > GAME_CONFIG.CANVAS_HEIGHT + 20;
    }
}

// Entity: Particle
class Particle {
    constructor(x, y, vx, vy, life, color) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.life = life;
        this.maxLife = life;
        this.color = color;
        this.size = 5 + Math.random() * 5;
    }
    
    update(dt) {
        this.x += this.vx * dt * 0.1;
        this.y += this.vy * dt * 0.1;
        this.life -= dt;
        this.vx *= 0.98;
        this.vy *= 0.98;
    }
    
    isDead() {
        return this.life <= 0;
    }
    
    getAlpha() {
        return this.life / this.maxLife;
    }
}

// Entity: Floating Text
class FloatingText {
    constructor(x, y, text, color = '#ffffff') {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.life = 1000;
        this.maxLife = 1000;
        this.vy = -0.5;
    }
    
    update(dt) {
        this.y += this.vy * dt * 0.1;
        this.life -= dt;
    }
    
    isDead() {
        return this.life <= 0;
    }
    
    getAlpha() {
        return Math.min(1, this.life / (this.maxLife * 0.3));
    }
}

// Main Game class
class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.state = 'BOOT';
        this.settings = {...Storage.defaultSettings};
        
        // Game state
        this.player = null;
        this.enemies = [];
        this.pickups = [];
        this.particles = [];
        this.floatingTexts = [];
        
        // Gameplay
        this.score = 0;
        this.distance = 0;
        this.multiplier = 1.0;
        this.multiplierDecayTime = 0;
        this.lastEnemySpawn = 0;
        this.lastPickupSpawn = 0;
        this.enemySpawnInterval = GAME_CONFIG.ENEMY_SPAWN_INIT;
        this.pickupSpawnInterval = GAME_CONFIG.PICKUP_SPAWN_INIT;
        
        // Camera shake
        this.shakeX = 0;
        this.shakeY = 0;
        this.shakeTime = 0;
        
        // Road animation
        this.roadOffset = 0;
        
        // UI
        this.menuSelection = 0;
        this.settingKeybindAction = null;
        this.settingSelection = 0;
        this.debugMode = false;
        this.lastMenuInput = 0; // For debouncing menu navigation
        this.lastTitleInput = 0; // For debouncing title menu navigation
        
        // Timing
        this.lastTime = performance.now();
        this.accumulator = 0;
        this.fixedDt = 1000 / 60; // 60 FPS
        
        // Input reference
        this.input = Input;
        
        // Initialize
        this.init();
    }
    
    init() {
        // Load settings
        Storage.init(this);
        
        // Initialize input
        Input.init();
        
        // Initialize audio
        AudioManager.init();
        AudioManager.updateVolumes(this.settings);
        
        // Set canvas size
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Start game loop
        this.gameLoop();
    }
    
    resizeCanvas() {
        const canvas = this.canvas;
        const wrapper = canvas.parentElement;
        const container = wrapper.parentElement;
        const containerRect = container.getBoundingClientRect();
        
        // Use most of the container space, accounting for padding
        // On mobile, use smaller padding
        const isMobile = window.innerWidth <= 768;
        const padding = isMobile ? 20 : 30;
        
        const availableWidth = containerRect.width - padding;
        const availableHeight = containerRect.height - padding;
        
        const scale = Math.min(
            availableWidth / GAME_CONFIG.CANVAS_WIDTH,
            availableHeight / GAME_CONFIG.CANVAS_HEIGHT
        );
        
        // On mobile, allow scaling down below 1.0 to fit screen
        // On desktop, ensure minimum scale of 1.0
        const finalScale = isMobile ? Math.max(scale, 0.5) : Math.max(scale, 1.0);
        
        canvas.style.width = (GAME_CONFIG.CANVAS_WIDTH * finalScale) + 'px';
        canvas.style.height = (GAME_CONFIG.CANVAS_HEIGHT * finalScale) + 'px';
        canvas.width = GAME_CONFIG.CANVAS_WIDTH;
        canvas.height = GAME_CONFIG.CANVAS_HEIGHT;
    }
    
    // Game loop with fixed timestep
    gameLoop() {
        const now = performance.now();
        let deltaTime = now - this.lastTime;
        this.lastTime = now;
        
        // Cap delta time to prevent huge jumps
        deltaTime = Math.min(deltaTime, 100);
        
        this.accumulator += deltaTime;
        
        // Fixed timestep updates
        while (this.accumulator >= this.fixedDt) {
            this.update(this.fixedDt);
            this.accumulator -= this.fixedDt;
        }
        
        // Render every frame
        this.render();
        
        requestAnimationFrame(() => this.gameLoop());
    }
    
    update(dt) {
        // Update input actions every frame (needed for just-pressed detection)
        Input.updateActions();
        
        // Update camera shake
        if (this.shakeTime > 0) {
            this.shakeTime -= dt;
            if (this.settings.reducedMotion) {
                this.shakeX = 0;
                this.shakeY = 0;
            } else {
                this.shakeX = (Math.random() - 0.5) * 5 * (this.shakeTime / 500);
                this.shakeY = (Math.random() - 0.5) * 5 * (this.shakeTime / 500);
            }
        } else {
            this.shakeX = 0;
            this.shakeY = 0;
        }
        
        // State-specific updates
        switch (this.state) {
            case 'BOOT':
                this.updateBoot(dt);
                break;
            case 'TITLE':
                this.updateTitle(dt);
                break;
            case 'HOWTO':
                this.updateHowto(dt);
                break;
            case 'SETTINGS':
                this.updateSettings(dt);
                break;
            case 'PLAYING':
                this.updatePlaying(dt);
                break;
            case 'PAUSED':
                this.updatePaused(dt);
                break;
            case 'GAMEOVER':
                this.updateGameOver(dt);
                break;
        }
        
        // Update particles and floating text (in all states)
        this.particles = this.particles.filter(p => {
            p.update(dt);
            return !p.isDead();
        });
        
        this.floatingTexts = this.floatingTexts.filter(ft => {
            ft.update(dt);
            return !ft.isDead();
        });
        
        // Update road offset
        if (this.state === 'PLAYING' && this.player) {
            this.roadOffset += this.player.speed * 0.5;
            if (this.roadOffset > 70) this.roadOffset = 0;
        } else if (this.state === 'TITLE') {
            this.roadOffset += 1;
            if (this.roadOffset > 70) this.roadOffset = 0;
        }
    }
    
    updateBoot(dt) {
        // Check for touch confirm on mobile
        this.input.checkTouchConfirm();
        
        // Wait for user interaction to start audio - support touch, key, or mouse
        if (this.input.actionsJustPressed.confirm || this.input.keys.size > 0) {
            AudioManager.resume();
            this.setState('TITLE');
        }
    }
    
    updateTitle(dt) {
        // Check for touch confirm on mobile
        this.input.checkTouchConfirm();
        
        // Handle menu navigation using just-pressed for single-trigger
        if (this.input.actionsJustPressed.confirm) {
            AudioManager.playSound('start', this.settings);
            
            if (this.menuSelection === 0) {
                this.startGame();
            } else if (this.menuSelection === 1) {
                this.setState('HOWTO');
            } else if (this.menuSelection === 2) {
                this.setState('SETTINGS');
                this.settingSelection = 0; // Reset settings selection
            }
        }
        
        // Navigation using just-pressed with debouncing
        const now = Date.now();
        if (this.input.actionsJustPressed.up && (now - this.lastTitleInput >= 200)) {
            AudioManager.playSound('ui', this.settings);
            this.menuSelection = (this.menuSelection - 1 + 3) % 3;
            this.lastTitleInput = now;
        }
        if (this.input.actionsJustPressed.down && (now - this.lastTitleInput >= 200)) {
            AudioManager.playSound('ui', this.settings);
            this.menuSelection = (this.menuSelection + 1) % 3;
            this.lastTitleInput = now;
        }
    }
    
    updateHowto(dt) {
        // Check for touch confirm on mobile
        this.input.checkTouchConfirm();
        
        // Use just-pressed to prevent immediate re-trigger
        if (this.input.actionsJustPressed.confirm || this.input.actionsJustPressed.brake) {
            AudioManager.playSound('ui', this.settings);
            this.setState('TITLE');
        }
    }
    
    updateSettings(dt) {
        // Debounce menu input
        const now = Date.now();
        const canNavigate = (now - this.lastMenuInput >= 200);
        
        // Track previous key states for just-pressed detection of arrow keys
        if (!this.settingsPrevKeys) {
            this.settingsPrevKeys = new Set();
        }
        
        // Check for arrow key presses directly (for navigation in settings)
        // ArrowDown is mapped to "brake" action, but we want it for navigation here
        const arrowUpJustPressed = this.input.keys.has('ArrowUp') && !this.settingsPrevKeys.has('ArrowUp');
        const arrowDownJustPressed = this.input.keys.has('ArrowDown') && !this.settingsPrevKeys.has('ArrowDown');
        
        // Update previous keys for next frame
        this.settingsPrevKeys = new Set(this.input.keys);
        
        // Navigation - use arrow keys directly (they work even though ArrowDown maps to brake)
        if ((this.input.actionsJustPressed.up || arrowUpJustPressed) && !this.settingKeybindAction && canNavigate) {
            AudioManager.playSound('ui', this.settings);
            this.settingSelection = Math.max(0, this.settingSelection - 1);
            this.lastMenuInput = now;
        }
        if ((this.input.actionsJustPressed.down || arrowDownJustPressed) && !this.settingKeybindAction && canNavigate) {
            AudioManager.playSound('ui', this.settings);
            this.settingSelection = Math.min(4, this.settingSelection + 1);
            this.lastMenuInput = now;
        }
        
        // Toggle setting using just-pressed
        if (this.input.actionsJustPressed.confirm && !this.settingKeybindAction && canNavigate) {
            AudioManager.playSound('ui', this.settings);
            if (this.settingSelection === 0) {
                this.settings.soundEnabled = !this.settings.soundEnabled;
            } else if (this.settingSelection === 1) {
                this.settings.musicEnabled = !this.settings.musicEnabled;
                if (!this.settings.musicEnabled) {
                    AudioManager.stopMusic();
                } else if (this.state === 'PLAYING') {
                    AudioManager.startMusic();
                }
            } else if (this.settingSelection === 2) {
                this.settings.reducedMotion = !this.settings.reducedMotion;
            } else if (this.settingSelection === 3) {
                this.settings.colorblindMode = !this.settings.colorblindMode;
            } else if (this.settingSelection === 4) {
                const diffs = ['easy', 'normal', 'hard'];
                const idx = diffs.indexOf(this.settings.difficulty);
                this.settings.difficulty = diffs[(idx + 1) % diffs.length];
            }
            this.lastMenuInput = now;
        }
        
        // Save and exit - only use left arrow or pause (Esc), NOT down/brake
        // This prevents ArrowDown from exiting settings
        if ((this.input.actionsJustPressed.left || this.input.actionsJustPressed.pause) && !this.settingKeybindAction) {
            AudioManager.playSound('ui', this.settings);
            this.saveSettings();
            this.setState('TITLE');
            this.settingsPrevKeys = null; // Reset on exit
        }
    }
    
    updatePaused(dt) {
        // Check for touch confirm on mobile
        this.input.checkTouchConfirm();
        
        // Use just-pressed for pause toggle
        if (this.input.actionsJustPressed.pause) {
            AudioManager.playSound('ui', this.settings);
            this.setState('PLAYING');
            return;
        }
        
        // Navigation with debouncing using just-pressed
        const now = Date.now();
        if (this.input.actionsJustPressed.up && (now - this.lastMenuInput >= 200)) {
            AudioManager.playSound('ui', this.settings);
            this.menuSelection = (this.menuSelection - 1 + 3) % 3;
            this.lastMenuInput = now;
        }
        if (this.input.actionsJustPressed.down && (now - this.lastMenuInput >= 200)) {
            AudioManager.playSound('ui', this.settings);
            this.menuSelection = (this.menuSelection + 1) % 3;
            this.lastMenuInput = now;
        }
        
        // Use just-pressed for confirm
        if (this.input.actionsJustPressed.confirm) {
            if (this.menuSelection === 0) {
                AudioManager.playSound('start', this.settings);
                this.setState('PLAYING');
            } else if (this.menuSelection === 1) {
                AudioManager.playSound('start', this.settings);
                this.startGame();
            } else if (this.menuSelection === 2) {
                AudioManager.playSound('ui', this.settings);
                this.setState('TITLE');
            }
        }
    }
    
    updateGameOver(dt) {
        // Check for touch confirm on mobile
        this.input.checkTouchConfirm();
        
        // Navigation with debouncing using just-pressed
        const now = Date.now();
        if ((this.input.actionsJustPressed.up || this.input.actionsJustPressed.down) && (now - this.lastMenuInput >= 200)) {
            AudioManager.playSound('ui', this.settings);
            this.menuSelection = (this.menuSelection + 1) % 2;
            this.lastMenuInput = now;
        }
        
        // Use just-pressed for confirm
        if (this.input.actionsJustPressed.confirm) {
            if (this.menuSelection === 0) {
                AudioManager.playSound('start', this.settings);
                this.startGame();
            } else {
                AudioManager.playSound('ui', this.settings);
                this.setState('TITLE');
            }
        }
    }
    
    updatePlaying(dt) {
        // Pause using just-pressed
        if (this.input.actionsJustPressed.pause) {
            AudioManager.playSound('ui', this.settings);
            this.setState('PAUSED');
            this.menuSelection = 0;
            return;
        }
        
        // Debug toggle using just-pressed
        if (this.input.actionsJustPressed.debug) {
            this.debugMode = !this.debugMode;
        }
        
        // Player input
        if (this.input.actions.left) {
            this.player.tryChangeLane(-1, this);
        }
        if (this.input.actions.right) {
            this.player.tryChangeLane(1, this);
        }
        
        // Update player
        this.player.update(dt, this);
        
        // Update distance and score
        this.distance += this.player.speed * dt * 0.01;
        this.score += this.player.speed * dt * 0.01 * GAME_CONFIG.SCORE_DISTANCE_MULT * this.multiplier;
        
        // Update multiplier decay
        this.multiplierDecayTime += dt;
        if (this.multiplierDecayTime > GAME_CONFIG.MULTIPLIER_DECAY_TIME) {
            this.multiplier = Math.max(1.0, this.multiplier - 0.1);
            this.multiplierDecayTime = 0;
        }
        
        // Spawn enemies
        this.lastEnemySpawn += dt;
        const difficultyMultiplier = this.settings.difficulty === 'easy' ? 1.2 : this.settings.difficulty === 'hard' ? 0.8 : 1.0;
        const currentSpawnInterval = Math.max(
            GAME_CONFIG.ENEMY_SPAWN_MIN,
            this.enemySpawnInterval - (this.distance * GAME_CONFIG.ENEMY_SPAWN_DECREASE * 0.001)
        ) * difficultyMultiplier;
        
        if (this.lastEnemySpawn >= currentSpawnInterval) {
            this.spawnEnemy();
            this.lastEnemySpawn = 0;
        }
        
        // Spawn pickups
        this.lastPickupSpawn += dt;
        if (this.lastPickupSpawn >= this.pickupSpawnInterval) {
            this.spawnPickup();
            this.lastPickupSpawn = 0;
        }
        
        // Update enemies
        const enemiesToRemove = [];
        for (let enemy of this.enemies) {
            enemy.update(dt, this.player.speed);
            
            // Check collision
            if (MathUtils.aabbOverlap(
                this.player.x - this.player.width / 2, this.player.y - this.player.height / 2,
                this.player.width, this.player.height,
                enemy.x - enemy.width / 2, enemy.y - enemy.height / 2,
                enemy.width, enemy.height
            )) {
                if (this.player.takeDamage()) {
                    this.gameOver('crash');
                    return;
                }
                AudioManager.playSound('crash', this.settings);
                this.addShake(500);
                this.addParticles(enemy.x, enemy.y, '#ff0000');
            }
            
            // Check near miss
            if (enemy.y > this.player.y - 20 && enemy.y < this.player.y + 20) {
                const dist = Math.abs(enemy.x - this.player.x);
                if (dist < GAME_CONFIG.NEAR_MISS_MARGIN + (enemy.width + this.player.width) / 2 &&
                    dist > (enemy.width + this.player.width) / 2 - 5) {
                    this.onNearMiss(enemy.x, enemy.y);
                }
            }
            
            if (enemy.isOffScreen()) {
                enemiesToRemove.push(enemy);
            }
        }
        this.enemies = this.enemies.filter(e => !enemiesToRemove.includes(e));
        
        // Update pickups
        const pickupsToRemove = [];
        for (let pickup of this.pickups) {
            pickup.update(dt, this.player.speed);
            
            // Check collision
            if (MathUtils.aabbOverlap(
                this.player.x - this.player.width / 2, this.player.y - this.player.height / 2,
                this.player.width, this.player.height,
                pickup.x - pickup.width / 2, pickup.y - pickup.height / 2,
                pickup.width, pickup.height
            )) {
                this.onPickupCollected(pickup);
                pickupsToRemove.push(pickup);
            }
            
            if (pickup.isOffScreen()) {
                pickupsToRemove.push(pickup);
            }
        }
        this.pickups = this.pickups.filter(p => !pickupsToRemove.includes(p));
    }
    
    spawnEnemy() {
        // Find available lane (simple spawn logic)
        const occupiedLanes = new Set();
        for (let enemy of this.enemies) {
            if (enemy.y < 100) { // Only check enemies near spawn area
                occupiedLanes.add(enemy.lane);
            }
        }
        
        // Choose lane
        const availableLanes = [];
        for (let i = 0; i < GAME_CONFIG.LANES; i++) {
            if (!occupiedLanes.has(i)) {
                availableLanes.push(i);
            }
        }
        
        if (availableLanes.length === 0) {
            // All lanes occupied, skip spawn
            return;
        }
        
        const lane = globalRNG.choice(availableLanes);
        
        // Choose enemy type
        const rand = globalRNG.random();
        let type = 'normal';
        if (rand < 0.4) type = 'normal';
        else if (rand < 0.6) type = 'slow';
        else if (rand < 0.85) type = 'weaving';
        else type = 'burst';
        
        this.enemies.push(new Enemy(lane, type));
    }
    
    spawnPickup() {
        // Spawn in a lane without an enemy nearby
        const occupiedLanes = new Set();
        for (let enemy of this.enemies) {
            if (enemy.y < 150) {
                occupiedLanes.add(enemy.lane);
            }
        }
        
        const availableLanes = [];
        for (let i = 0; i < GAME_CONFIG.LANES; i++) {
            if (!occupiedLanes.has(i)) {
                availableLanes.push(i);
            }
        }
        
        if (availableLanes.length === 0) return;
        
        const lane = globalRNG.choice(availableLanes);
        const rand = globalRNG.random();
        let type = 'coin';
        if (rand < 0.6) type = 'coin';
        else if (rand < 0.85) type = 'heart';
        else type = 'boost';
        
        this.pickups.push(new Pickup(lane, type));
    }
    
    onPickupCollected(pickup) {
        AudioManager.playSound(pickup.type === 'coin' ? 'coin' : pickup.type === 'heart' ? 'repair' : 'boost', this.settings);
        
        if (pickup.type === 'coin') {
            this.score += GAME_CONFIG.SCORE_COIN * this.multiplier;
            this.addFloatingText(pickup.x, pickup.y, '+' + Math.floor(GAME_CONFIG.SCORE_COIN * this.multiplier), '#ffd700');
            this.increaseMultiplier();
        } else if (pickup.type === 'heart') {
            if (this.player.heal()) {
                this.addFloatingText(pickup.x, pickup.y, 'HEAL', '#ff1493');
            }
        } else if (pickup.type === 'boost') {
            this.player.activateBoost();
            this.score += GAME_CONFIG.SCORE_COIN * 2 * this.multiplier;
            this.increaseMultiplier();
            this.addFloatingText(pickup.x, pickup.y, 'BOOST!', '#00ff00');
        }
    }
    
    onNearMiss(x, y) {
        // Check if we already processed this near miss (simple dedup)
        // For now, just add score
        this.score += GAME_CONFIG.SCORE_NEAR_MISS * this.multiplier;
        this.increaseMultiplier();
        AudioManager.playSound('nearMiss', this.settings);
        this.addFloatingText(x, y, 'NEAR MISS!', '#00ffff');
        this.addParticles(x, y, '#00ffff');
    }
    
    increaseMultiplier() {
        const max = this.settings.difficulty === 'hard' ? GAME_CONFIG.MULTIPLIER_MAX * 1.5 : GAME_CONFIG.MULTIPLIER_MAX;
        this.multiplier = Math.min(max, this.multiplier + 0.5);
        this.multiplierDecayTime = 0;
    }
    
    addShake(duration) {
        if (!this.settings.reducedMotion) {
            this.shakeTime = Math.max(this.shakeTime, duration);
        }
    }
    
    addParticles(x, y, color) {
        for (let i = 0; i < 10; i++) {
            this.particles.push(new Particle(
                x, y,
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10,
                500 + Math.random() * 500,
                color
            ));
        }
    }
    
    addFloatingText(x, y, text, color) {
        this.floatingTexts.push(new FloatingText(x, y, text, color));
    }
    
    startGame() {
        this.player = new Player();
        this.enemies = [];
        this.pickups = [];
        this.particles = [];
        this.floatingTexts = [];
        this.score = 0;
        this.distance = 0;
        this.multiplier = 1.0;
        this.multiplierDecayTime = 0;
        this.lastEnemySpawn = 0;
        this.lastPickupSpawn = 0;
        this.enemySpawnInterval = GAME_CONFIG.ENEMY_SPAWN_INIT;
        this.pickupSpawnInterval = GAME_CONFIG.PICKUP_SPAWN_INIT;
        this.shakeTime = 0;
        
        // Set health based on difficulty
        if (this.settings.difficulty === 'easy') {
            this.player.health = 5;
            this.player.maxHealth = 5;
        } else if (this.settings.difficulty === 'hard') {
            this.player.health = 2;
            this.player.maxHealth = 2;
        }
        
        // Start music
        if (this.settings.musicEnabled) {
            AudioManager.startMusic();
        }
        
        this.setState('PLAYING');
    }
    
    gameOver(reason) {
        AudioManager.stopMusic();
        AudioManager.playSound('gameOver', this.settings);
        
        // Save high score
        const highScores = Storage.loadHighScores();
        const difficulty = this.settings.difficulty;
        const isNewRecord = this.score > highScores[difficulty].score || this.distance > highScores[difficulty].distance;
        
        if (isNewRecord) {
            Storage.saveHighScore(difficulty, this.score, this.distance);
        }
        
        this.gameOverReason = reason;
        this.isNewRecord = isNewRecord;
        this.setState('GAMEOVER');
        this.menuSelection = 0;
    }
    
    setState(newState) {
        this.state = newState;
        this.menuSelection = 0;
        this.settingSelection = 0;
        this.lastMenuInput = 0;
        this.lastTitleInput = 0;
        this.settingsPrevKeys = null; // Reset settings key tracking
        // Clear input to prevent actions from previous state triggering immediately
        Input.clear();
    }
    
    saveSettings() {
        Storage.saveSettings(this.settings);
        Storage.saveKeybinds(Input.customKeyMap);
        AudioManager.updateVolumes(this.settings);
    }
    
    // Rendering
    render() {
        const ctx = this.ctx;
        const palette = this.settings.colorblindMode ? PALETTE_COLORBLIND : PALETTE_NORMAL;
        
        // Clear
        ctx.fillStyle = palette.bg;
        ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
        
        // Apply camera shake
        ctx.save();
        ctx.translate(this.shakeX, this.shakeY);
        
        // State-specific rendering
        switch (this.state) {
            case 'BOOT':
                this.renderBoot(ctx, palette);
                break;
            case 'TITLE':
                this.renderTitle(ctx, palette);
                break;
            case 'HOWTO':
                this.renderHowto(ctx, palette);
                break;
            case 'SETTINGS':
                this.renderSettings(ctx, palette);
                break;
            case 'PLAYING':
            case 'PAUSED':
                this.renderGame(ctx, palette);
                if (this.state === 'PAUSED') {
                    this.renderPauseOverlay(ctx, palette);
                }
                break;
            case 'GAMEOVER':
                this.renderGameOver(ctx, palette);
                break;
        }
        
        ctx.restore();
        
        // Always render particles and floating text on top
        this.renderParticles(ctx, palette);
        this.renderFloatingTexts(ctx, palette);
        
        // Debug overlay
        if (this.debugMode) {
            this.renderDebug(ctx);
        }
    }
    
    renderBoot(ctx, palette) {
        ctx.fillStyle = palette.text;
        ctx.font = '16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Press any key to start', GAME_CONFIG.CANVAS_WIDTH / 2, GAME_CONFIG.CANVAS_HEIGHT / 2);
    }
    
    renderTitle(ctx, palette) {
        // Road background
        this.renderRoad(ctx, palette);
        
        // Title
        ctx.fillStyle = palette.text;
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('FLIP PHONE RACER', GAME_CONFIG.CANVAS_WIDTH / 2, 60);
        
        // High score
        const highScores = Storage.loadHighScores();
        const diff = this.settings.difficulty;
        ctx.font = '12px monospace';
        ctx.fillText(`High Score: ${Math.floor(highScores[diff].score)}`, GAME_CONFIG.CANVAS_WIDTH / 2, 90);
        ctx.fillText(`Best Distance: ${Math.floor(highScores[diff].distance)}m`, GAME_CONFIG.CANVAS_WIDTH / 2, 110);
        
        // Menu
        const menuItems = ['Play', 'How to Play', 'Settings'];
        ctx.font = '16px monospace';
        for (let i = 0; i < menuItems.length; i++) {
            if (i === this.menuSelection) {
                ctx.fillStyle = palette.enemy1;
                ctx.fillText('> ' + menuItems[i], GAME_CONFIG.CANVAS_WIDTH / 2, 160 + i * 30);
            } else {
                ctx.fillStyle = palette.text;
                ctx.fillText(menuItems[i], GAME_CONFIG.CANVAS_WIDTH / 2, 160 + i * 30);
            }
        }
        
        // Instructions
        ctx.fillStyle = palette.text;
        ctx.font = '10px monospace';
        ctx.fillText('Press Enter / Tap to select', GAME_CONFIG.CANVAS_WIDTH / 2, GAME_CONFIG.CANVAS_HEIGHT - 20);
    }
    
    renderHowto(ctx, palette) {
        ctx.fillStyle = palette.bg;
        ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
        
        ctx.fillStyle = palette.text;
        ctx.font = 'bold 18px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('HOW TO PLAY', GAME_CONFIG.CANVAS_WIDTH / 2, 40);
        
        ctx.font = '12px monospace';
        ctx.textAlign = 'left';
        
        const instructions = [
            'CONTROLS:',
            'Left/Right: Change lanes',
            'Brake: Slow down (S/Down)',
            'Pause: P/Esc',
            '',
            'OBJECTIVE:',
            'Dodge cars and obstacles',
            'Collect coins for points',
            'Get near misses for bonus',
            'Survive as long as possible',
            '',
            'PICKUPS:',
            'Coin: +100 points',
            'Heart: Restore health',
            'Boost: Speed boost'
        ];
        
        let y = 70;
        for (let text of instructions) {
            if (text.startsWith('CONTROLS') || text.startsWith('OBJECTIVE') || text.startsWith('PICKUPS')) {
                ctx.fillStyle = palette.enemy1;
                ctx.font = 'bold 14px monospace';
            } else {
                ctx.fillStyle = palette.text;
                ctx.font = '12px monospace';
            }
            ctx.fillText(text, 20, y);
            y += 18;
        }
        
        ctx.fillStyle = palette.text;
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Press Back / Esc to return', GAME_CONFIG.CANVAS_WIDTH / 2, GAME_CONFIG.CANVAS_HEIGHT - 20);
    }
    
    renderSettings(ctx, palette) {
        ctx.fillStyle = palette.bg;
        ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
        
        ctx.fillStyle = palette.text;
        ctx.font = 'bold 18px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('SETTINGS', GAME_CONFIG.CANVAS_WIDTH / 2, 30);
        
        ctx.font = '14px monospace';
        ctx.textAlign = 'left';
        
        const settings = [
            { label: 'Sound', value: this.settings.soundEnabled ? 'ON' : 'OFF' },
            { label: 'Music', value: this.settings.musicEnabled ? 'ON' : 'OFF' },
            { label: 'Reduced Motion', value: this.settings.reducedMotion ? 'ON' : 'OFF' },
            { label: 'Colorblind Mode', value: this.settings.colorblindMode ? 'ON' : 'OFF' },
            { label: 'Difficulty', value: this.settings.difficulty.toUpperCase() },
        ];
        
        let y = 70;
        for (let i = 0; i < settings.length; i++) {
            const s = settings[i];
            if (i === this.settingSelection) {
                ctx.fillStyle = palette.enemy1;
                ctx.fillText('> ' + s.label + ': ' + s.value, 20, y);
            } else {
                ctx.fillStyle = palette.text;
                ctx.fillText(s.label + ': ' + s.value, 20, y);
            }
            y += 28;
        }
        
        ctx.fillStyle = palette.text;
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Arrow Keys: Navigate, Enter: Toggle, Esc/Left: Exit', GAME_CONFIG.CANVAS_WIDTH / 2, GAME_CONFIG.CANVAS_HEIGHT - 20);
    }
    
    renderRoad(ctx, palette) {
        const roadY = 100;
        const roadH = GAME_CONFIG.CANVAS_HEIGHT - roadY;
        
        // Road
        ctx.fillStyle = palette.road;
        ctx.fillRect(GAME_CONFIG.ROAD_X, roadY, GAME_CONFIG.ROAD_WIDTH, roadH);
        
        // Road edges
        ctx.strokeStyle = palette.roadLine;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(GAME_CONFIG.ROAD_X, roadY);
        ctx.lineTo(GAME_CONFIG.ROAD_X, roadY + roadH);
        ctx.moveTo(GAME_CONFIG.ROAD_X + GAME_CONFIG.ROAD_WIDTH, roadY);
        ctx.lineTo(GAME_CONFIG.ROAD_X + GAME_CONFIG.ROAD_WIDTH, roadY + roadH);
        ctx.stroke();
        
        // Lane dividers
        ctx.strokeStyle = palette.roadDash;
        ctx.lineWidth = 3;
        const dashLength = 35;
        const dashGap = 35;
        
        for (let lane = 1; lane < GAME_CONFIG.LANES; lane++) {
            const x = GAME_CONFIG.ROAD_X + lane * GAME_CONFIG.LANE_WIDTH;
            const startY = roadY - (this.roadOffset % (dashLength + dashGap));
            
            for (let y = startY; y < roadY + roadH; y += dashLength + dashGap) {
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x, Math.min(y + dashLength, roadY + roadH));
                ctx.stroke();
            }
        }
    }
    
    renderGame(ctx, palette) {
        // Road
        this.renderRoad(ctx, palette);
        
        // Pickups
        for (let pickup of this.pickups) {
            this.renderPickup(ctx, pickup, palette);
        }
        
        // Enemies
        for (let enemy of this.enemies) {
            this.renderEnemy(ctx, enemy, palette);
        }
        
        // Player
        this.renderPlayer(ctx, palette);
        
        // HUD
        this.renderHUD(ctx, palette);
    }
    
    renderPlayer(ctx, palette) {
        const p = this.player;
        const x = p.x - p.width / 2;
        const y = p.y - p.height / 2;
        
        // Blinking when invulnerable
        if (p.invulnerable && Math.floor(p.invulnerableTime / 100) % 2 === 0) {
            return; // Skip rendering this frame
        }
        
        // Car body
        ctx.fillStyle = palette.player;
        ctx.fillRect(x, y, p.width, p.height);
        
        // Windows
        ctx.fillStyle = palette.bg;
        ctx.fillRect(x + 8, y + 16, p.width - 16, 24);
        ctx.fillRect(x + 8, y + 50, p.width - 16, 24);
        
        // Headlights
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(x, y, 14, 14);
        ctx.fillRect(x + p.width - 14, y, 14, 14);
        
        // Boost effect
        if (p.boostActive) {
            ctx.strokeStyle = palette.boost;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(p.x, p.y + p.height / 2 + 5, 20, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
    
    renderEnemy(ctx, enemy, palette) {
        const x = enemy.x - enemy.width / 2;
        const y = enemy.y - enemy.height / 2;
        
        // Burst warning indicator
        if (enemy.burstWarning) {
            ctx.fillStyle = palette.enemy4;
            ctx.fillRect(enemy.x - 8, 16, 16, 16);
            if (Math.floor(enemy.burstTime / 100) % 2 === 0) {
                ctx.fillRect(enemy.x - 12, 12, 24, 22);
            }
        }
        
        // Car color based on type
        let color = palette.enemy1;
        if (enemy.type === 'slow') color = palette.enemy2;
        else if (enemy.type === 'weaving') color = palette.enemy3;
        else if (enemy.type === 'burst') color = palette.enemy4;
        
        // Car body
        ctx.fillStyle = color;
        ctx.fillRect(x, y, enemy.width, enemy.height);
        
        // Windows
        ctx.fillStyle = palette.bg;
        ctx.fillRect(x + 8, y + 16, enemy.width - 16, 20);
        ctx.fillRect(x + 8, y + 42, enemy.width - 16, 20);
        
        // Taillights
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(x, y + enemy.height - 14, 14, 14);
        ctx.fillRect(x + enemy.width - 14, y + enemy.height - 14, 14, 14);
    }
    
    renderPickup(ctx, pickup, palette) {
        const x = pickup.x - pickup.width / 2;
        const y = pickup.y - pickup.height / 2;
        
        ctx.save();
        ctx.translate(pickup.x, pickup.y);
        ctx.rotate(pickup.rotation);
        
        if (pickup.type === 'coin') {
            ctx.fillStyle = palette.coin;
            ctx.beginPath();
            ctx.arc(0, 0, pickup.width / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = palette.text;
            ctx.lineWidth = 2;
            ctx.stroke();
        } else if (pickup.type === 'heart') {
            ctx.fillStyle = palette.heart;
            ctx.beginPath();
            ctx.arc(-13, 0, 10, 0, Math.PI * 2);
            ctx.arc(13, 0, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(0, 20);
            ctx.lineTo(-20, -10);
            ctx.lineTo(0, 0);
            ctx.lineTo(20, -10);
            ctx.closePath();
            ctx.fill();
        } else if (pickup.type === 'boost') {
            ctx.fillStyle = palette.boost;
            ctx.fillRect(-pickup.width / 2, -pickup.height / 2, pickup.width, pickup.height);
            ctx.fillStyle = palette.text;
            ctx.font = 'bold 28px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('B', 0, 10);
        }
        
        ctx.restore();
    }
    
    renderHUD(ctx, palette) {
        // HUD background
        ctx.fillStyle = palette.hudBg;
        ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, 70);
        ctx.fillRect(0, GAME_CONFIG.CANVAS_HEIGHT - 70, GAME_CONFIG.CANVAS_WIDTH, 70);
        
        // Top HUD
        ctx.fillStyle = palette.text;
        ctx.font = '20px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`Speed: ${Math.floor(this.player.speed * 10)}`, 8, 26);
        ctx.fillText(`Score: ${Math.floor(this.score)}`, 8, 52);
        
        ctx.textAlign = 'right';
        ctx.fillText(`x${this.multiplier.toFixed(1)}`, GAME_CONFIG.CANVAS_WIDTH - 8, 26);
        ctx.fillText(`${Math.floor(this.distance)}m`, GAME_CONFIG.CANVAS_WIDTH - 8, 52);
        
        // Bottom HUD - Health
        ctx.textAlign = 'left';
        ctx.fillText('Health:', 8, GAME_CONFIG.CANVAS_HEIGHT - 44);
        for (let i = 0; i < this.player.maxHealth; i++) {
            ctx.fillStyle = i < this.player.health ? palette.heart : palette.roadLine;
            ctx.fillRect(100 + i * 35, GAME_CONFIG.CANVAS_HEIGHT - 52, 26, 26);
        }
    }
    
    renderPauseOverlay(ctx, palette) {
        // Semi-transparent overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
        
        ctx.fillStyle = palette.text;
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', GAME_CONFIG.CANVAS_WIDTH / 2, 100);
        
        const menuItems = ['Resume', 'Restart', 'Title'];
        ctx.font = '16px monospace';
        for (let i = 0; i < menuItems.length; i++) {
            if (i === this.menuSelection) {
                ctx.fillStyle = palette.enemy1;
                ctx.fillText('> ' + menuItems[i], GAME_CONFIG.CANVAS_WIDTH / 2, 150 + i * 30);
            } else {
                ctx.fillStyle = palette.text;
                ctx.fillText(menuItems[i], GAME_CONFIG.CANVAS_WIDTH / 2, 150 + i * 30);
            }
        }
    }
    
    renderGameOver(ctx, palette) {
        // Render game state in background (dimmed)
        ctx.globalAlpha = 0.3;
        this.renderGame(ctx, palette);
        ctx.globalAlpha = 1.0;
        
        // Overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
        
        ctx.fillStyle = palette.text;
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', GAME_CONFIG.CANVAS_WIDTH / 2, 60);
        
        if (this.isNewRecord) {
            ctx.fillStyle = palette.coin;
            ctx.font = 'bold 16px monospace';
            ctx.fillText('NEW RECORD!', GAME_CONFIG.CANVAS_WIDTH / 2, 90);
        }
        
        ctx.fillStyle = palette.text;
        ctx.font = '14px monospace';
        ctx.fillText(`Score: ${Math.floor(this.score)}`, GAME_CONFIG.CANVAS_WIDTH / 2, 120);
        ctx.fillText(`Distance: ${Math.floor(this.distance)}m`, GAME_CONFIG.CANVAS_WIDTH / 2, 140);
        
        const menuItems = ['Restart', 'Title'];
        ctx.font = '16px monospace';
        for (let i = 0; i < menuItems.length; i++) {
            if (i === this.menuSelection) {
                ctx.fillStyle = palette.enemy1;
                ctx.fillText('> ' + menuItems[i], GAME_CONFIG.CANVAS_WIDTH / 2, 200 + i * 30);
            } else {
                ctx.fillStyle = palette.text;
                ctx.fillText(menuItems[i], GAME_CONFIG.CANVAS_WIDTH / 2, 200 + i * 30);
            }
        }
    }
    
    renderParticles(ctx, palette) {
        for (let particle of this.particles) {
            ctx.globalAlpha = particle.getAlpha();
            ctx.fillStyle = particle.color;
            ctx.fillRect(particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size);
        }
        ctx.globalAlpha = 1.0;
    }
    
    renderFloatingTexts(ctx, palette) {
        ctx.textAlign = 'center';
        for (let text of this.floatingTexts) {
            ctx.globalAlpha = text.getAlpha();
            ctx.fillStyle = text.color;
            ctx.font = 'bold 14px monospace';
            ctx.fillText(text.text, text.x, text.y);
        }
        ctx.globalAlpha = 1.0;
        ctx.textAlign = 'left';
    }
    
    renderDebug(ctx) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(5, 45, 150, 100);
        ctx.fillStyle = '#00ff00';
        ctx.font = '10px monospace';
        ctx.textAlign = 'left';
        
        const fps = Math.round(1000 / (performance.now() - (this.lastTime || performance.now())));
        ctx.fillText(`FPS: ${fps}`, 10, 60);
        ctx.fillText(`Enemies: ${this.enemies.length}`, 10, 75);
        ctx.fillText(`Pickups: ${this.pickups.length}`, 10, 90);
        ctx.fillText(`Particles: ${this.particles.length}`, 10, 105);
        if (this.player) {
            ctx.fillText(`Speed: ${this.player.speed.toFixed(2)}`, 10, 120);
            ctx.fillText(`Lane: ${this.player.lane}`, 10, 135);
        }
    }
}

// Initialize game when DOM is ready
let game = null;
window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    game = new Game(canvas);
    
    // Touch button handlers
    const leftBtn = document.getElementById('touchLeft');
    const rightBtn = document.getElementById('touchRight');
    const brakeBtn = document.getElementById('touchBrake');
    
    // Touch button handlers with proper event handling
    const handleTouchStart = (e, button) => {
        e.preventDefault();
        e.stopPropagation();
        Input.touchButtons[button] = true;
        Input.updateActions(); // Update immediately for responsive controls
    };
    
    const handleTouchEnd = (e, button) => {
        e.preventDefault();
        e.stopPropagation();
        Input.touchButtons[button] = false;
        Input.updateActions(); // Update immediately for responsive controls
    };
    
    if (leftBtn) {
        leftBtn.addEventListener('touchstart', (e) => handleTouchStart(e, 'left'), { passive: false });
        leftBtn.addEventListener('touchend', (e) => handleTouchEnd(e, 'left'), { passive: false });
        leftBtn.addEventListener('touchcancel', (e) => handleTouchEnd(e, 'left'), { passive: false });
        // Also support mouse events for testing
        leftBtn.addEventListener('mousedown', (e) => {
            e.preventDefault();
            Input.touchButtons.left = true;
            Input.updateActions();
        });
        leftBtn.addEventListener('mouseup', (e) => {
            e.preventDefault();
            Input.touchButtons.left = false;
            Input.updateActions();
        });
        leftBtn.addEventListener('mouseleave', (e) => {
            Input.touchButtons.left = false;
            Input.updateActions();
        });
    }
    
    if (rightBtn) {
        rightBtn.addEventListener('touchstart', (e) => handleTouchStart(e, 'right'), { passive: false });
        rightBtn.addEventListener('touchend', (e) => handleTouchEnd(e, 'right'), { passive: false });
        rightBtn.addEventListener('touchcancel', (e) => handleTouchEnd(e, 'right'), { passive: false });
        rightBtn.addEventListener('mousedown', (e) => {
            e.preventDefault();
            Input.touchButtons.right = true;
            Input.updateActions();
        });
        rightBtn.addEventListener('mouseup', (e) => {
            e.preventDefault();
            Input.touchButtons.right = false;
            Input.updateActions();
        });
        rightBtn.addEventListener('mouseleave', (e) => {
            Input.touchButtons.right = false;
            Input.updateActions();
        });
    }
    
    if (brakeBtn) {
        brakeBtn.addEventListener('touchstart', (e) => handleTouchStart(e, 'brake'), { passive: false });
        brakeBtn.addEventListener('touchend', (e) => handleTouchEnd(e, 'brake'), { passive: false });
        brakeBtn.addEventListener('touchcancel', (e) => handleTouchEnd(e, 'brake'), { passive: false });
        brakeBtn.addEventListener('mousedown', (e) => {
            e.preventDefault();
            Input.touchButtons.brake = true;
            Input.updateActions();
        });
        brakeBtn.addEventListener('mouseup', (e) => {
            e.preventDefault();
            Input.touchButtons.brake = false;
            Input.updateActions();
        });
        brakeBtn.addEventListener('mouseleave', (e) => {
            Input.touchButtons.brake = false;
            Input.updateActions();
        });
    }
});

