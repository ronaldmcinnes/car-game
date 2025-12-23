// WebAudio synthesizer for game sounds (no external audio assets)

const AudioManager = {
    audioContext: null,
    masterGain: null,
    sfxGain: null,
    musicGain: null,
    initialized: false,
    musicPlaying: false,
    musicStartTime: 0,
    currentMusicNote: 0,
    
    // Initialize audio context (lazy initialization on first use)
    _ensureInitialized() {
        if (this.initialized) return;
        
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create gain nodes for volume control
            this.masterGain = this.audioContext.createGain();
            this.sfxGain = this.audioContext.createGain();
            this.musicGain = this.audioContext.createGain();
            
            // Connect: master -> sfx/music -> destination
            this.sfxGain.connect(this.masterGain);
            this.musicGain.connect(this.masterGain);
            this.masterGain.connect(this.audioContext.destination);
            
            // Set initial volumes
            this.masterGain.gain.value = 0.7;
            this.sfxGain.gain.value = 0.8;
            this.musicGain.gain.value = 0.5;
            
            this.initialized = true;
        } catch (e) {
            console.warn('WebAudio not supported:', e);
        }
    },
    
    // Initialize audio context (public method for early setup - no-op, actual init happens on resume)
    init() {
        // Don't create AudioContext here - wait for user gesture
        // This prevents the browser warning
    },
    
    // Resume audio context if suspended (required by some browsers)
    // This will also initialize the AudioContext if it hasn't been created yet
    async resume() {
        // Initialize AudioContext on first resume (after user gesture)
        if (!this.initialized) {
            this._ensureInitialized();
        }
        
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    },
    
    // Update volumes from settings
    updateVolumes(settings) {
        if (!this.masterGain) return;
        this.masterGain.gain.value = settings.masterVolume || 0.7;
        this.sfxGain.gain.value = settings.sfxVolume || 0.8;
        this.musicGain.gain.value = settings.musicVolume || 0.5;
    },
    
    // Play a tone (basic synth)
    playTone(frequency, duration, type = 'square', volume = 0.3, startTime = null) {
        // Ensure AudioContext is initialized
        if (!this.initialized) {
            this._ensureInitialized();
        }
        if (!this.initialized || !this.sfxGain) return;
        
        const now = startTime || this.audioContext.currentTime;
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(frequency, now);
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(volume, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        
        osc.connect(gain);
        gain.connect(this.sfxGain);
        
        osc.start(now);
        osc.stop(now + duration);
    },
    
    // Play a beep (UI sound)
    playBeep(pitch = 440, duration = 0.1) {
        this.playTone(pitch, duration, 'square', 0.2);
    },
    
    // Play UI move/select sound
    playUI() {
        this.playTone(330, 0.08, 'square', 0.15);
    },
    
    // Play start sound
    playStart() {
        this.playTone(440, 0.1, 'square', 0.2);
        this.playTone(554, 0.1, 'square', 0.2, this.audioContext.currentTime + 0.05);
        this.playTone(659, 0.15, 'square', 0.2, this.audioContext.currentTime + 0.1);
    },
    
    // Play coin pickup sound
    playCoin() {
        this.playTone(659, 0.1, 'triangle', 0.25);
        this.playTone(784, 0.15, 'triangle', 0.25, this.audioContext.currentTime + 0.05);
    },
    
    // Play near miss sound
    playNearMiss() {
        this.playTone(880, 0.15, 'sine', 0.3);
        this.playTone(1108, 0.2, 'sine', 0.25, this.audioContext.currentTime + 0.1);
    },
    
    // Play crash sound
    playCrash() {
        // Noise-like sound with multiple frequencies
        const now = this.audioContext.currentTime;
        for (let i = 0; i < 5; i++) {
            const freq = 100 + i * 50 + Math.random() * 100;
            this.playTone(freq, 0.3, 'square', 0.15, now + i * 0.02);
        }
    },
    
    // Play game over sound
    playGameOver() {
        const now = this.audioContext.currentTime;
        this.playTone(392, 0.2, 'square', 0.3, now);
        this.playTone(330, 0.2, 'square', 0.3, now + 0.2);
        this.playTone(262, 0.4, 'square', 0.3, now + 0.4);
    },
    
    // Play repair/heart pickup sound
    playRepair() {
        this.playTone(523, 0.15, 'triangle', 0.25);
        this.playTone(659, 0.2, 'triangle', 0.25, this.audioContext.currentTime + 0.1);
    },
    
    // Play boost pickup sound
    playBoost() {
        this.playTone(440, 0.1, 'square', 0.25);
        this.playTone(554, 0.1, 'square', 0.25, this.audioContext.currentTime + 0.05);
        this.playTone(659, 0.1, 'square', 0.25, this.audioContext.currentTime + 0.1);
        this.playTone(784, 0.15, 'square', 0.25, this.audioContext.currentTime + 0.15);
    },
    
    // Simple looping music (subtle background)
    startMusic() {
        // Ensure AudioContext is initialized
        if (!this.initialized) {
            this._ensureInitialized();
        }
        if (!this.initialized || this.musicPlaying) return;
        
        this.musicPlaying = true;
        this.musicStartTime = this.audioContext.currentTime;
        this.currentMusicNote = 0;
        this.scheduleMusic();
    },
    
    stopMusic() {
        this.musicPlaying = false;
    },
    
    // Schedule music notes (very simple looping pattern)
    scheduleMusic() {
        if (!this.musicPlaying || !this.initialized) return;
        
        const now = this.audioContext.currentTime;
        const pattern = [
            { freq: 262, time: 0 }, // C
            { freq: 294, time: 0.5 }, // D
            { freq: 330, time: 1.0 }, // E
            { freq: 392, time: 1.5 }, // G
            { freq: 330, time: 2.0 }, // E
            { freq: 294, time: 2.5 }, // D
            { freq: 262, time: 3.0 }, // C
        ];
        
        const noteIndex = this.currentMusicNote % pattern.length;
        const note = pattern[noteIndex];
        const playTime = now + (this.currentMusicNote * 0.5);
        
        // Play very quietly as background
        this.playTone(note.freq, 0.4, 'triangle', 0.08, playTime);
        this.playTone(note.freq * 2, 0.4, 'triangle', 0.05, playTime); // Octave
        
        this.currentMusicNote++;
        
        // Schedule next note
        if (this.musicPlaying) {
            setTimeout(() => this.scheduleMusic(), 500);
        }
    },
    
    // Wrapper methods that check settings
    playSound(soundName, settings) {
        if (!settings || !settings.soundEnabled) return;
        this.resume();
        
        switch (soundName) {
            case 'ui': this.playUI(); break;
            case 'start': this.playStart(); break;
            case 'coin': this.playCoin(); break;
            case 'nearMiss': this.playNearMiss(); break;
            case 'crash': this.playCrash(); break;
            case 'gameOver': this.playGameOver(); break;
            case 'repair': this.playRepair(); break;
            case 'boost': this.playBoost(); break;
        }
    }
};

