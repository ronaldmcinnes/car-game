// LocalStorage persistence for settings, high scores, and keybinds

const Storage = {
    VERSION: '1.0.0',
    PREFIX: 'flipphone-racer-',
    
    // Get full key name with version
    key(name) {
        return `${this.PREFIX}v${this.VERSION}-${name}`;
    },
    
    // Save data
    save(key, data) {
        try {
            localStorage.setItem(this.key(key), JSON.stringify(data));
            return true;
        } catch (e) {
            console.warn('Failed to save to localStorage:', e);
            return false;
        }
    },
    
    // Load data
    load(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(this.key(key));
            if (item === null) return defaultValue;
            return JSON.parse(item);
        } catch (e) {
            console.warn('Failed to load from localStorage:', e);
            return defaultValue;
        }
    },
    
    // Remove data
    remove(key) {
        try {
            localStorage.removeItem(this.key(key));
        } catch (e) {
            console.warn('Failed to remove from localStorage:', e);
        }
    },
    
    // Settings structure
    defaultSettings: {
        soundEnabled: true,
        musicEnabled: true,
        reducedMotion: false,
        colorblindMode: false,
        difficulty: 'normal', // 'easy', 'normal', 'hard'
        touchLayout: 'standard', // 'standard', 'withBrake'
        masterVolume: 0.7,
        sfxVolume: 0.8,
        musicVolume: 0.5
    },
    
    // Load settings
    loadSettings() {
        const saved = this.load('settings');
        if (!saved) return {...this.defaultSettings};
        
        // Merge with defaults to handle new settings
        return {...this.defaultSettings, ...saved};
    },
    
    // Save settings
    saveSettings(settings) {
        return this.save('settings', settings);
    },
    
    // High scores structure: { easy: { score, distance }, normal: {...}, hard: {...} }
    loadHighScores() {
        return this.load('highScores', {
            easy: { score: 0, distance: 0 },
            normal: { score: 0, distance: 0 },
            hard: { score: 0, distance: 0 }
        });
    },
    
    // Save high score for a difficulty
    saveHighScore(difficulty, score, distance) {
        const scores = this.loadHighScores();
        const current = scores[difficulty] || { score: 0, distance: 0 };
        
        let updated = false;
        if (score > current.score || distance > current.distance) {
            scores[difficulty] = {
                score: Math.max(current.score, score),
                distance: Math.max(current.distance, distance)
            };
            this.save('highScores', scores);
            updated = true;
        }
        
        return updated;
    },
    
    // Load keybinds
    loadKeybinds() {
        return this.load('keybinds', {});
    },
    
    // Save keybinds
    saveKeybinds(keybinds) {
        return this.save('keybinds', keybinds);
    },
    
    // Initialize: load settings and keybinds into game
    init(game) {
        const settings = this.loadSettings();
        const keybinds = this.loadKeybinds();
        
        // Apply settings to game
        Object.assign(game.settings, settings);
        
        // Apply keybinds to Input
        Input.customKeyMap = keybinds;
        Input.updateActions();
        
        return settings;
    }
};

