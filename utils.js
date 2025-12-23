// Utility functions: math helpers, RNG, input helpers

// Seeded RNG for deterministic gameplay (useful for debugging)
class SeededRNG {
    constructor(seed = Date.now()) {
        this.seed = seed;
    }
    
    next() {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }
    
    random(min = 0, max = 1) {
        return min + this.next() * (max - min);
    }
    
    randomInt(min, max) {
        return Math.floor(this.random(min, max + 1));
    }
    
    choice(array) {
        return array[this.randomInt(0, array.length - 1)];
    }
}

// Global RNG instance (can be seeded via URL param)
let globalRNG = new SeededRNG();

// Initialize RNG from URL seed param if present
(function initRNG() {
    const params = new URLSearchParams(window.location.search);
    const seed = params.get('seed');
    if (seed) {
        globalRNG = new SeededRNG(parseInt(seed, 10));
        console.log('Using seed:', seed);
    }
})();

// Math helpers
const MathUtils = {
    // Linear interpolation
    lerp(a, b, t) {
        return a + (b - a) * t;
    },
    
    // Clamp value between min and max
    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    },
    
    // Easing functions
    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    },
    
    easeInOutCubic(t) {
        return t < 0.5
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2;
    },
    
    // Distance between two points
    dist(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    },
    
    // Check if two AABBs overlap
    aabbOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
        return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
    },
    
    // Sign function
    sign(n) {
        return n > 0 ? 1 : n < 0 ? -1 : 0;
    }
};

// Input helpers
const Input = {
    keys: new Set(),
    touches: new Map(), // touchId -> {x, y, startX, startY}
    mouseButtons: new Set(),
    
    // Key code to action name mapping (defaults)
    keyMap: {
        'ArrowLeft': 'left',
        'KeyA': 'left',
        'ArrowRight': 'right',
        'KeyD': 'right',
        'ArrowUp': 'up',
        'KeyW': 'up',
        'ArrowDown': 'brake',
        'KeyS': 'brake',
        'Escape': 'pause',
        'KeyP': 'pause',
        'Enter': 'confirm',
        'Space': 'confirm',
        'Backquote': 'debug' // ~ key
    },
    
    // Custom keybinds (loaded from storage)
    customKeyMap: {},
    
    // Active actions (computed from keys + touches)
    actions: {
        left: false,
        right: false,
        up: false,
        down: false,
        brake: false,
        pause: false,
        confirm: false,
        debug: false
    },
    
    // Actions that were just pressed this frame (transitions from false to true)
    actionsJustPressed: {
        left: false,
        right: false,
        up: false,
        down: false,
        brake: false,
        pause: false,
        confirm: false,
        debug: false
    },
    
    // Previous frame actions for detecting transitions
    prevActions: {
        left: false,
        right: false,
        up: false,
        down: false,
        brake: false,
        pause: false,
        confirm: false,
        debug: false
    },
    
    // Touch button states
    touchButtons: {
        left: false,
        right: false,
        brake: false
    },
    
    // Swipe detection
    swipeThreshold: 50,
    swipeVelocity: 0,
    lastSwipeX: 0,
    lastSwipeTime: 0,
    
    init() {
        // Keyboard events - just update keys set, updateActions() called in game loop
        window.addEventListener('keydown', (e) => {
            this.keys.add(e.code);
            // Don't call updateActions() here - it's called once per frame in game loop
            // This prevents multiple calls per frame which breaks just-pressed detection
            
            // Prevent default for game keys
            if (this.keyMap[e.code] || this.customKeyMap[e.code]) {
                e.preventDefault();
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys.delete(e.code);
            // Don't call updateActions() here - it's called once per frame in game loop
        });
        
        // Touch events - just update touch state, updateActions() called in game loop
        window.addEventListener('touchstart', (e) => {
            e.preventDefault();
            for (let touch of e.changedTouches) {
                this.touches.set(touch.identifier, {
                    x: touch.clientX,
                    y: touch.clientY,
                    startX: touch.clientX,
                    startY: touch.clientY,
                    startTime: Date.now()
                });
            }
        });
        
        window.addEventListener('touchmove', (e) => {
            e.preventDefault();
            for (let touch of e.changedTouches) {
                if (this.touches.has(touch.identifier)) {
                    const t = this.touches.get(touch.identifier);
                    t.x = touch.clientX;
                    t.y = touch.clientY;
                }
            }
        });
        
        window.addEventListener('touchend', (e) => {
            e.preventDefault();
            for (let touch of e.changedTouches) {
                const t = this.touches.get(touch.identifier);
                if (t) {
                    // Check for swipe
                    const dx = touch.clientX - t.startX;
                    const dy = touch.clientY - t.startY;
                    const dt = Date.now() - t.startTime;
                    
                    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > this.swipeThreshold && dt < 300) {
                        this.swipeVelocity = dx / dt;
                        this.lastSwipeX = touch.clientX;
                        this.lastSwipeTime = Date.now();
                    }
                    
                    this.touches.delete(touch.identifier);
                }
            }
        });
        
        window.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            for (let touch of e.changedTouches) {
                this.touches.delete(touch.identifier);
            }
        });
        
        // Mouse events (for desktop testing) - just update state
        window.addEventListener('mousedown', (e) => {
            this.mouseButtons.add(e.button);
        });
        
        window.addEventListener('mouseup', (e) => {
            this.mouseButtons.delete(e.button);
        });
    },
    
    // Update action states from keys and touches
    updateActions() {
        // Save previous frame actions
        for (let key in this.actions) {
            this.prevActions[key] = this.actions[key];
            this.actions[key] = false;
            this.actionsJustPressed[key] = false;
        }
        
        // Check keyboard
        for (let code of this.keys) {
            const action = this.customKeyMap[code] || this.keyMap[code];
            if (action) {
                this.actions[action] = true;
            }
        }
        
        // Check touch buttons (updated separately)
        if (this.touchButtons.left) this.actions.left = true;
        if (this.touchButtons.right) this.actions.right = true;
        if (this.touchButtons.brake) this.actions.brake = true;
        
        // Check swipe (recent swipes)
        if (Date.now() - this.lastSwipeTime < 200) {
            if (this.swipeVelocity > 0.5) {
                this.actions.right = true;
            } else if (this.swipeVelocity < -0.5) {
                this.actions.left = true;
            }
        }
        
        // Detect just-pressed actions (transition from false to true)
        for (let key in this.actions) {
            if (this.actions[key] && !this.prevActions[key]) {
                this.actionsJustPressed[key] = true;
            }
        }
    },
    
    // Set custom keybind
    setKeybind(action, keyCode) {
        // Remove old binding for this action
        for (let code in this.customKeyMap) {
            if (this.customKeyMap[code] === action) {
                delete this.customKeyMap[code];
            }
        }
        this.customKeyMap[keyCode] = action;
        this.updateActions();
    },
    
    // Get key code for an action
    getKeyCode(action) {
        for (let code in this.customKeyMap) {
            if (this.customKeyMap[code] === action) {
                return code;
            }
        }
        for (let code in this.keyMap) {
            if (this.keyMap[code] === action) {
                return code;
            }
        }
        return null;
    },
    
    // Check if touch is over a button (helper for UI)
    isTouchOverButton(touch, buttonX, buttonY, buttonW, buttonH) {
        for (let t of this.touches.values()) {
            if (t.x >= buttonX && t.x <= buttonX + buttonW &&
                t.y >= buttonY && t.y <= buttonY + buttonH) {
                return true;
            }
        }
        return false;
    },
    
    // Clear all input (useful when transitioning states)
    clear() {
        this.keys.clear();
        this.mouseButtons.clear();
        this.touches.clear();
        // Reset all actions and just-pressed flags
        for (let key in this.actions) {
            this.actions[key] = false;
            this.actionsJustPressed[key] = false;
            this.prevActions[key] = false;
        }
        this.touchButtons.left = false;
        this.touchButtons.right = false;
        this.touchButtons.brake = false;
        this.updateActions();
    }
};

