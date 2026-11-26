(function () {
  'use strict';

  /* =========================================================================
   * RoboAudio: Web Audio API シンセサイザー＆効果音エンジン
   * - P1 #5: navigator.audioSession.type = 'playback' でiPhone消音スイッチ時でも再生試行
   * - iOS Safari タッチアンロック完全対応
   * ========================================================================= */
  const NOTE_FREQ = {
    C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
    C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
    C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00, B5: 987.77,
    C6: 1046.50, D6: 1174.66, E6: 1318.51, G6: 1567.98
  };

  const SCALE_PENTA = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00, 1046.50];

  const BGM_PATTERNS = {
    title: {
      tempo: 132,
      lead: ['C5', 'E5', 'G5', 'A5', 'G5', 'E5', 'D5', 'G4', 'E5', 'G5', 'C6', 'B5', 'A5', 'G5', 'D5', 'E5'],
      bass: ['C3', 'C3', 'G3', 'G3', 'A3', 'A3', 'F3', 'G3', 'C3', 'E3', 'F3', 'F3', 'D3', 'G3', 'C3', 'G3']
    },
    puzzle: {
      tempo: 116,
      lead: ['E5', null, 'G5', 'E5', 'A5', null, 'G5', null, 'F5', 'E5', 'D5', 'C5', 'D5', 'E5', 'G5', null],
      bass: ['C3', 'G3', 'A3', 'E3', 'F3', 'C3', 'G3', 'G3', 'F3', 'C3', 'D3', 'A3', 'G3', 'D3', 'C3', 'G3']
    },
    battle: {
      tempo: 148,
      lead: ['A4', 'C5', 'E5', 'A5', 'G5', 'E5', 'D5', 'E5', 'F5', 'A5', 'G5', 'E5', 'D5', 'C5', 'B4', 'E5'],
      bass: ['A3', 'A3', 'A3', 'G3', 'F3', 'F3', 'G3', 'G3', 'D3', 'D3', 'F3', 'F3', 'E3', 'E3', 'E3', 'G3']
    },
    garage: {
      tempo: 124,
      lead: ['G4', 'C5', 'D5', 'E5', null, 'G5', 'E5', 'C5', 'A4', 'C5', 'D5', 'F5', 'E5', 'D5', 'C5', null],
      bass: ['C3', 'G3', 'C3', 'G3', 'F3', 'C3', 'F3', 'G3', 'A3', 'E3', 'F3', 'C3', 'G3', 'G3', 'C3', 'G3']
    }
  };

  function configureIOSPlaybackSession() {
    if (typeof navigator !== 'undefined' && 'audioSession' in navigator && navigator.audioSession) {
      try {
        navigator.audioSession.type = 'playback';
      } catch (_) {}
    }
  }

  const RoboAudio = {
    ctx: null,
    soundEnabled: true,
    unlocked: false,
    bgmName: null,
    bgmTimer: null,
    bgmStep: 0,
    masterGain: null,
    voiceGain: null,

    init() {
      const unlock = () => {
        configureIOSPlaybackSession();
        this.ensureContext();
        const afterUnlock = () => {
          if (window.RoboLaboBGM && this.soundEnabled) {
            window.RoboLaboBGM.unlock();
            if (this.bgmName && !window.RoboLaboBGM.isPlaying) {
              this.playBgm(this.bgmName);
            }
          }
          const bbl = document.getElementById('heroSpeechBubble');
          if (bbl && bbl.textContent && bbl.textContent.includes('おとが なるよ')) {
            bbl.textContent = 'タッチしてみてね！';
          }
        };
        if (this.ctx && !this.unlocked) {
          try {
            const buf = this.ctx.createBuffer(1, 1, 22050);
            const src = this.ctx.createBufferSource();
            src.buffer = buf;
            src.connect(this.ctx.destination);
            src.start(0);
            this.unlocked = true;
          } catch (_) {}
        }
        // 初回タッチ時に現在選択中キャラのボイスパックを先読みデコード開始
        if (window.RoboVoice) {
          window.RoboVoice.preloadCurrentPack();
        }
        if (this.ctx) {
          if (this.ctx.state === 'suspended') {
            this.ctx.resume().then(afterUnlock).catch(() => {});
          } else {
            afterUnlock();
          }
        }
      };
      window.addEventListener('pointerdown', unlock, { passive: true });
      window.addEventListener('touchstart', unlock, { passive: true });
      window.addEventListener('click', unlock, { passive: true });
      window.addEventListener('keydown', unlock, { passive: true });
    },

    ensureContext() {
      configureIOSPlaybackSession();
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        this.ctx = new AC();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.42;
        this.masterGain.connect(this.ctx.destination);

        this.voiceGain = this.ctx.createGain();
        this.voiceGain.gain.value = 1.28;
        this.voiceGain.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    },

    setSoundEnabled(flag) {
      this.soundEnabled = !!flag;
      if (window.RoboLaboBGM) {
        window.RoboLaboBGM.setMuted(!this.soundEnabled);
      }
      if (!this.soundEnabled) {
        this.stopBgm();
      } else if (this.bgmName) {
        const target = this.bgmName;
        this.bgmName = null;
        this.playBgm(target);
      }
    },

    tone(freq, duration, type = 'triangle', vol = 0.22, delay = 0, slideTo = null) {
      if (!this.soundEnabled) return;
      const ctx = this.ensureContext();
      if (!ctx) return;

      const t0 = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(Math.max(30, freq), t0);
      if (slideTo !== null) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t0 + duration);
      }

      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(vol, t0 + Math.min(0.018, duration * 0.25));
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t0);
      osc.stop(t0 + duration + 0.02);
    },

    noise(duration = 0.2, vol = 0.2, filterFreq = 1200, delay = 0) {
      if (!this.soundEnabled) return;
      const ctx = this.ensureContext();
      if (!ctx) return;

      const t0 = ctx.currentTime + delay;
      const len = Math.max(1, Math.floor(ctx.sampleRate * duration));
      const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      }

      const src = ctx.createBufferSource();
      src.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(filterFreq, t0);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      src.start(t0);
    },

    tap() { this.tone(520, 0.065, 'sine', 0.2, 0, 720); },

    pop(index = 0) {
      const f = SCALE_PENTA[Math.max(0, Math.min(SCALE_PENTA.length - 1, index))];
      this.tone(f, 0.14, 'triangle', 0.28, 0, f * 1.06);
      this.tone(f * 2, 0.09, 'sine', 0.12, 0.01);
    },

    snap() {
      this.tone(440, 0.06, 'triangle', 0.24, 0, 880);
      this.tone(880, 0.11, 'sine', 0.22, 0.045);
    },

    gearTick() { this.tone(320, 0.04, 'square', 0.09, 0, 220); },

    jump() {
      this.tone(220, 0.24, 'sine', 0.26, 0, 680);
      this.noise(0.12, 0.1, 1800, 0);
    },

    laser() {
      this.tone(1150, 0.24, 'sawtooth', 0.2, 0, 160);
      this.tone(860, 0.22, 'triangle', 0.22, 0.02, 120);
    },

    explosion() {
      this.noise(0.38, 0.35, 900, 0);
      this.tone(150, 0.32, 'sawtooth', 0.26, 0, 42);
    },

    correct() {
      this.tone(NOTE_FREQ.C5, 0.12, 'triangle', 0.26, 0.00);
      this.tone(NOTE_FREQ.E5, 0.12, 'triangle', 0.26, 0.08);
      this.tone(NOTE_FREQ.G5, 0.14, 'triangle', 0.28, 0.16);
      this.tone(NOTE_FREQ.C6, 0.32, 'sine', 0.32, 0.24);
    },

    combo(level = 2) {
      const shift = Math.min(5, Math.max(0, level - 1));
      const base = 523.25 * Math.pow(1.06, shift);
      this.tone(base, 0.1, 'triangle', 0.24, 0);
      this.tone(base * 1.25, 0.1, 'triangle', 0.24, 0.06);
      this.tone(base * 1.5, 0.22, 'sine', 0.3, 0.12);
    },

    gentleHint() {
      this.tone(360, 0.13, 'sine', 0.2, 0, 300);
      this.tone(330, 0.16, 'sine', 0.18, 0.11, 380);
    },

    stageClear() {
      const notes = ['C5', 'E5', 'G5', 'C6', 'G5', 'C6'];
      const durs  = [0.11, 0.11, 0.11, 0.20, 0.11, 0.42];
      let t = 0;
      notes.forEach((n, i) => {
        this.tone(NOTE_FREQ[n], durs[i], 'triangle', 0.28, t);
        this.tone(NOTE_FREQ[n] * 0.5, durs[i], 'sine', 0.16, t);
        t += durs[i] * 0.88;
      });
    },

    uniteFanfare() {
      const seq = [
        ['C5', 0.1], ['E5', 0.1], ['G5', 0.1], ['C6', 0.22],
        ['D6', 0.14], ['E6', 0.14], ['G6', 0.48]
      ];
      let t = 0;
      seq.forEach(([n, d]) => {
        this.tone(NOTE_FREQ[n], d, 'sawtooth', 0.18, t);
        this.tone(NOTE_FREQ[n], d * 1.1, 'triangle', 0.25, t);
        t += d * 0.85;
      });
      this.noise(0.55, 0.22, 2200, 0.55);
    },

    gacha() {
      for (let i = 0; i < 6; i++) {
        this.tone(360 + i * 75, 0.07, 'triangle', 0.22, i * 0.07);
      }
      this.tone(NOTE_FREQ.C6, 0.38, 'sine', 0.32, 0.46);
      this.tone(NOTE_FREQ.E6, 0.42, 'triangle', 0.24, 0.52);
    },

    playBgm(name) {
      this.bgmName = name;
      if (!this.soundEnabled) return;
      if (this.bgmTimer) {
        clearInterval(this.bgmTimer);
        this.bgmTimer = null;
      }

      if (window.RoboLaboBGM) {
        const BGM_TRACK_MAP = {
          title: 'standby',
          garage: 'standby',
          zukan: 'standby',
          standby: 'standby',
          battle: 'meteor',
          meteor: 'meteor',
          mecha: 'mecha',
          shape: 'mecha',
          logic: 'logic',
          puzzle: 'logic'
        };
        const mappedId = BGM_TRACK_MAP[name] || 'standby';
        window.RoboLaboBGM.setMuted(false);
        window.RoboLaboBGM.play(mappedId);
        return;
      }

      const pattern = BGM_PATTERNS[name] || BGM_PATTERNS.title;
      this.bgmStep = 0;
      const stepSec = 60 / pattern.tempo / 2;

      this.bgmTimer = setInterval(() => {
        if (!this.soundEnabled || document.hidden) return;
        const ctx = this.ctx;
        if (!ctx || ctx.state !== 'running') return;

        const idx = this.bgmStep % pattern.lead.length;
        const leadNote = pattern.lead[idx];
        const bassNote = pattern.bass[idx];
        const isBattle = name === 'battle';

        if (leadNote && NOTE_FREQ[leadNote]) {
          const lf = NOTE_FREQ[leadNote];
          this.tone(lf, stepSec * 0.78, 'triangle', 0.06, 0);
          // 偶数・奇数ステップで1オクターブ上のキラキラアルペジオを薄く重ねる
          if (idx % 2 === 1) {
            this.tone(lf * 1.5, stepSec * 0.42, 'sine', 0.022, stepSec * 0.08);
          } else {
            this.tone(lf * 2, stepSec * 0.38, 'sine', 0.018, stepSec * 0.12);
          }
        }
        if (bassNote && NOTE_FREQ[bassNote] && idx % 2 === 0) {
          const bf = NOTE_FREQ[bassNote];
          this.tone(bf, stepSec * 1.5, 'sine', 0.075, 0);
          // 4拍ごとに3和音コードパッドを鳴らして厚みを出す
          if (idx % 4 === 0) {
            this.tone(bf * 2, stepSec * 3.2, 'sine', 0.022, 0);
            this.tone(bf * 2.5, stepSec * 3.2, 'sine', 0.018, 0);
            this.tone(bf * 3, stepSec * 3.2, 'sine', 0.016, 0);
          }
        }
        // リズムセクション（キック・スネア・ハイハット）
        if (idx % 4 === 0) {
          this.tone(112, 0.09, 'sine', isBattle ? 0.08 : 0.042, 0, 42);
        } else if (idx % 4 === 2) {
          this.noise(0.055, isBattle ? 0.036 : 0.016, 1900, 0);
        }
        if (idx % 2 === 1) {
          this.noise(0.024, isBattle ? 0.022 : 0.01, 4800, 0);
        }
        this.bgmStep++;
      }, stepSec * 1000);
    },

    stopBgm() {
      if (this.bgmTimer) {
        clearInterval(this.bgmTimer);
        this.bgmTimer = null;
      }
      if (window.RoboLaboBGM) {
        window.RoboLaboBGM.stop();
      }
    }
  };

  /* =========================================================================
   * RoboVoice: 完全オフライン対応 VOICEVOX オーディオスプライト＆優先度キューエンジン
   * - P1 #7: 事前生成された MP3 ボイスパック (audio/pack_*.mp3) により、
   *   PCの電源OFF・機内モード（オフラインPWA）でも本物のVOICEVOXフルボイスで再生！
   * - P1 #4: Promise完了通知＋優先度付き発話キューにより、ほめ言葉が途中で切れずに最後まで再生！
   * - P2 #16: 展開済みスプライトバッファは最大2話者LRUに制限して省メモリ動作！
   * ========================================================================= */
  const OFFLINE_PRESETS = [
    { id: 3,  name: 'ずんだもん',   style: 'ノーマル', emoji: '🫛', credit: 'VOICEVOX:ずんだもん', sample: 'ぼくは ずんだもんなのだ！いっしょに ほしを たんけんするのだ！' },
    { id: 81, name: '青山龍星',     style: '熱血ロボ', emoji: '🔥', credit: 'VOICEVOX:青山龍星',   sample: 'いくぞパイロット！ひらめき合体、出撃だ！' },
    { id: 32, name: '白上虎太郎',   style: 'わーい',   emoji: '👦', credit: 'VOICEVOX:白上虎太郎', sample: 'わーい！きょうも いっしょに あそぼうよ！' }
  ];

  const EXTRA_SERVER_PRESETS = [
    { id: 1,  name: 'ずんだもん',   style: 'あまあま', emoji: '💚', credit: 'VOICEVOX:ずんだもん',   sample: 'えへへ、きみと あそべて とっても うれしいのだ！' },
    { id: 8,  name: '春日部つむぎ', style: 'ノーマル', emoji: '☀️', credit: 'VOICEVOX:春日部つむぎ', sample: 'こんにちは！春日部つむぎだよ！元気いっぱいで いこうね！' },
    { id: 2,  name: '四国めたん',   style: 'ノーマル', emoji: '🌸', credit: 'VOICEVOX:四国めたん',   sample: '準備はいいかしら？ミッションを はじめるわよ！' }
  ];

  const RoboVoice = {
    enabled: true,
    speakerId: 3,
    vvAvailable: false,
    vvMode: 'checking',
    presets: OFFLINE_PRESETS.slice(),

    manifest: null,
    manifestPromise: null,
    rawPackCache: new Map(),       // speakerId -> 圧縮MP3チャンクArrayBuffer (約5MB, 非展開のため超省メモリ!)
    packLoadPromises: new Map(),   // speakerId -> Promise<ArrayBuffer>
    dynamicRawCache: new Map(),    // key -> ArrayBuffer (最大20件)

    activeSources: [],
    activeFinishResolve: null,
    activeRecord: null,
    queuedJob: null,
    abortCtrl: null,
    reqCounter: 0,

    lastPlayback: null,
    playbackHistory: [],
    jaFallbackVoice: null,

    init() {
      if ('speechSynthesis' in window) {
        const pick = () => {
          const voices = window.speechSynthesis.getVoices() || [];
          const jaList = voices.filter((v) => v.lang && v.lang.toLowerCase().startsWith('ja'));
          this.jaFallbackVoice = jaList.find((v) => /kyoko|o-ren|haruka|nanami/i.test(v.name)) || jaList[0] || null;
        };
        pick();
        if (typeof window.speechSynthesis.onvoiceschanged !== 'undefined') {
          window.speechSynthesis.onvoiceschanged = pick;
        }
      }
      this.loadManifest();
      this.checkServerStatus();
    },

    async loadManifest() {
      if (this.manifest) return this.manifest;
      if (this.manifestPromise) return this.manifestPromise;
      this.manifestPromise = fetch('./audio/voicepack_manifest.json')
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data && data.packs) {
            this.manifest = data;
            this.vvAvailable = true;
            if (this.vvMode === 'checking' || this.vvMode === 'unavailable') {
              this.vvMode = 'offline_pack';
            }
          }
          return this.manifest;
        })
        .catch(() => null);
      return this.manifestPromise;
    },

    async ensurePackBytes(speakerId) {
      const key = String(speakerId);
      const mf = await this.loadManifest();
      if (!mf || !mf.packs || !mf.packs[key]) return null;

      if (this.rawPackCache.has(key)) {
        const ab = this.rawPackCache.get(key);
        this.rawPackCache.delete(key);
        this.rawPackCache.set(key, ab);
        return ab;
      }
      if (this.packLoadPromises.has(key)) {
        return this.packLoadPromises.get(key);
      }

      const p = fetch('./' + mf.packs[key].file)
        .then((r) => {
          if (!r.ok) throw new Error('pack fetch failed');
          return r.arrayBuffer();
        })
        .then((ab) => {
          this.packLoadPromises.delete(key);
          // P2 #16: 展開せず圧縮ArrayBuffer(~5MB)のまま最大2話者保持し、再生する1文のみオンデマンド展開
          if (this.rawPackCache.size >= 2) {
            const oldest = this.rawPackCache.keys().next().value;
            this.rawPackCache.delete(oldest);
          }
          this.rawPackCache.set(key, ab);
          return ab;
        })
        .catch(() => {
          this.packLoadPromises.delete(key);
          return null;
        });

      this.packLoadPromises.set(key, p);
      return p;
    },

    preloadCurrentPack() {
      this.ensurePackBytes(this.speakerId);
    },

    async checkServerStatus() {
      await this.loadManifest();
      // 静的配信（GitHub Pages / PWA / 一般静的サーバー）では不要な /api/* 通信を行わず404を出さない
      const isLocalDevServer = window.location.protocol === 'http:' && window.location.port === '8777';
      if (!isLocalDevServer) {
        this.presets = OFFLINE_PRESETS.slice();
        if (!this.presets.some((p) => p.id === this.speakerId)) {
          this.speakerId = this.presets[0].id;
        }
        this.vvAvailable = !!this.manifest;
        this.vvMode = this.manifest ? 'offline_pack' : 'unavailable';
        return { ok: this.vvAvailable, mode: this.vvMode };
      }
      try {
        const res = await fetch('/api/voicevox/status', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data && data.ok) {
            this.vvAvailable = true;
            this.vvMode = this.manifest ? 'hybrid_pack+server' : (data.mode || 'server');
            if (Array.isArray(data.styleIds)) {
              const set = new Set(data.styleIds);
              const extras = EXTRA_SERVER_PRESETS.filter((p) => set.has(p.id));
              this.presets = OFFLINE_PRESETS.concat(extras);
            }
            return data;
          }
        }
      } catch (_) {}

      // 静的ホスティング（GitHub Pages等）またはオフラインPWA稼働時
      this.presets = OFFLINE_PRESETS.slice();
      if (!this.presets.some((p) => p.id === this.speakerId)) {
        this.speakerId = this.presets[0].id;
      }
      if (this.manifest) {
        this.vvAvailable = true;
        this.vvMode = 'offline_pack';
      } else {
        this.vvAvailable = false;
        this.vvMode = 'unavailable';
      }
      return { ok: this.vvAvailable, mode: this.vvMode };
    },

    getCurrentPreset() {
      return this.presets.find((p) => p.id === this.speakerId) || this.presets[0] || OFFLINE_PRESETS[0];
    },

    setSpeaker(styleId) {
      this.speakerId = Number(styleId);
      this.preloadCurrentPack();
      return this.getCurrentPreset();
    },

    cycleSpeaker() {
      const idx = this.presets.findIndex((p) => p.id === this.speakerId);
      const next = this.presets[(idx + 1) % this.presets.length];
      this.speakerId = next.id;
      this.preloadCurrentPack();
      return next;
    },

    cleanTextForSpeech(raw) {
      if (!raw) return '';
      return String(raw)
        .replace(/<ruby>([^<]+)<rt>([^<]+)<\/rt><\/ruby>/g, '$2')
        .replace(/<[^>]+>/g, '')
        .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}⭐🌟⚡🔥🎉🎁🔊🗣️🏠🚀🐣🤝🧭⚙️☄️📖🔧🫛💚👦☀️🌸🎙️🔁💡🟥🟩🔵🔴]/gu, ' ')
        .replace(/(\d+)\s*\+\s*(\d+)/g, '$1 たす $2')
        .replace(/□\s*\+\s*(\d+)/g, 'しかく たす $1')
        .replace(/(\d+)\s*\+\s*□/g, '$1 たす しかく')
        .replace(/(\d+)\s*[-−ー]\s*(\d+)/g, '$1 ひく $2')
        .replace(/(\d+)\s*[×xX]\s*(\d+)/g, '$1 かける $2')
        .replace(/=\s*\?/g, 'は なあに？')
        .replace(/=/g, 'は')
        .replace(/Lv\.(\d+)/gi, 'レベル $1')
        .replace(/\s+/g, ' ')
        .trim();
    },

    isSpeaking() {
      return this.activeSources.length > 0;
    },

    stop() {
      this.reqCounter++;
      if (this.queuedJob) {
        this.queuedJob.resolve(false);
        this.queuedJob = null;
      }
      this._stopActiveOnly(true);
    },

    _stopActiveOnly(markInterrupted) {
      if (window.RoboLaboBGM && window.RoboLaboBGM.setDucking) {
        window.RoboLaboBGM.setDucking(false);
      }
      if (this.abortCtrl) {
        try { this.abortCtrl.abort(); } catch (_) {}
        this.abortCtrl = null;
      }
      if (this.activeRecord && markInterrupted) {
        this.activeRecord.interrupted = true;
        this.activeRecord.endedAt = Date.now();
      }
      const srcs = this.activeSources.slice();
      this.activeSources = [];
      for (const s of srcs) {
        try { s.onended = null; s.stop(0); } catch (_) {}
      }
      if (this.activeFinishResolve) {
        const fn = this.activeFinishResolve;
        this.activeFinishResolve = null;
        fn(false);
      }
      if ('speechSynthesis' in window) {
        try { window.speechSynthesis.cancel(); } catch (_) {}
      }
    },

    /* P1 #4: Promiseを返し、interrupt:false 時は先行するほめ言葉の再生終了を待ってから発話！ */
    speak(text, options) {
      const opts = typeof options === 'boolean'
        ? { force: options, priority: 'ui', interrupt: true }
        : Object.assign({ priority: 'prompt', interrupt: false, force: false }, options || {});

      if (!this.enabled && !opts.force) return Promise.resolve(false);
      const cleaned = this.cleanTextForSpeech(text);
      if (!cleaned) return Promise.resolve(false);

      if (!opts.interrupt && (this.isSpeaking() || this.activeFinishResolve)) {
        if (this.queuedJob) {
          this.queuedJob.resolve(false);
        }
        return new Promise((resolve) => {
          this.queuedJob = { cleaned, spk: this.speakerId, opts, resolve };
        });
      }

      this.stop();
      return this._runSpeakJob(cleaned, this.speakerId, opts);
    },

    _flushQueueIfAny() {
      if (this.queuedJob) {
        const nextJob = this.queuedJob;
        this.queuedJob = null;
        this._runSpeakJob(nextJob.cleaned, nextJob.spk, nextJob.opts).then(nextJob.resolve);
      }
    },

    async _runSpeakJob(cleaned, spk, opts) {
      const myReq = ++this.reqCounter;
      const ctx = RoboAudio.ensureContext();

      // 1. 最優先：静的バンドルされた VOICEVOX オフライン・ボイスパック（PC不要・数KBオンデマンド展開！）
      if (ctx) {
        if (ctx.state === 'suspended') {
          try { await ctx.resume(); } catch (_) {}
          if (myReq !== this.reqCounter) return false;
        }
        const mf = await this.loadManifest();
        const packInfo = mf && mf.packs && mf.packs[String(spk)];
        if (packInfo && packInfo.clips) {
          const segments = this._resolvePackSegments(cleaned, packInfo.clips);
          if (segments) {
            const rawPack = await this.ensurePackBytes(spk);
            if (myReq !== this.reqCounter) return false;
            if (rawPack) {
              const totalClipBytes = segments.reduce((s, seg) => s + seg[1], 0);
              const decodedList = await Promise.all(
                segments.map(([bOff, bLen]) => ctx.decodeAudioData(rawPack.slice(bOff, bOff + bLen)))
              );
              if (myReq !== this.reqCounter) return false;
              return await this._playDecodedBuffers(ctx, decodedList, cleaned, spk, totalClipBytes, 'voicevox');
            }
          }
        }

        // 2. ローカル開発サーバー (server.py) が稼働中の場合の動的 /api/tts フォールバック
        if (window.location.protocol.startsWith('http')) {
          try {
            const cacheKey = `${spk}:${cleaned}`;
            let wavAb = this.dynamicRawCache.get(cacheKey);
            if (!wavAb) {
              const ctrl = new AbortController();
              this.abortCtrl = ctrl;
              const res = await fetch(`/api/tts?speaker=${encodeURIComponent(spk)}&text=${encodeURIComponent(cleaned)}`, { signal: ctrl.signal });
              if (res.ok) {
                wavAb = await res.arrayBuffer();
                if (this.dynamicRawCache.size >= 20) {
                  this.dynamicRawCache.delete(this.dynamicRawCache.keys().next().value);
                }
                this.dynamicRawCache.set(cacheKey, wavAb);
              }
            }
            if (myReq !== this.reqCounter) return false;
            if (wavAb) {
              const decoded = await ctx.decodeAudioData(wavAb.slice(0));
              if (myReq !== this.reqCounter) return false;
              return await this._playDecodedBuffers(
                ctx, [decoded], cleaned, spk, wavAb.byteLength, 'voicevox_server'
              );
            }
          } catch (err) {
            if (err && err.name === 'AbortError') return false;
          }
        }
      }

      // 3. 最終フォールバック（ボイスパック未読込の file:// 直開き等）
      if ('speechSynthesis' in window && myReq === this.reqCounter) {
        return new Promise((resolve) => {
          try {
            const utter = new SpeechSynthesisUtterance(cleaned);
            utter.lang = 'ja-JP';
            if (this.jaFallbackVoice) utter.voice = this.jaFallbackVoice;
            utter.rate = 1.02;
            utter.pitch = 1.1;
            const rec = this._recordStart('webspeech_fallback', spk, cleaned, 0, 0.5);
            utter.onend = () => {
              rec.completed = true;
              rec.endedAt = Date.now();
              resolve(true);
              this._flushQueueIfAny();
            };
            utter.onerror = () => {
              resolve(false);
              this._flushQueueIfAny();
            };
            window.speechSynthesis.speak(utter);
          } catch (_) {
            resolve(false);
          }
        });
      }
      return false;
    },

    _resolvePackSegments(cleaned, clips) {
      if (clips[cleaned]) {
        return [clips[cleaned]];
      }
      // 計算式（例: "14 ひく 6 は なあに？" や "しかく たす 5 は 12"）の単語トークン連結解決
      const tokens = cleaned.split(' ').filter(Boolean);
      if (tokens.length >= 2) {
        // 末尾が ["は", "なあに？"] の場合は自然な1フレーズ "は なあに？" を優先使用
        const merged = [];
        for (let i = 0; i < tokens.length; i++) {
          if (i === tokens.length - 2 && tokens[i] === 'は' && tokens[i + 1] === 'なあに？' && clips['は なあに？']) {
            merged.push('は なあに？');
            break;
          }
          merged.push(tokens[i]);
        }
        if (merged.every((tk) => Array.isArray(clips[tk]))) {
          return merged.map((tk) => clips[tk]);
        }
      }
      return null;
    },

    _recordStart(engine, speaker, text, bytes, durationSec) {
      const rec = {
        engine,
        speaker,
        text,
        bytes,
        durationSec: Number(durationSec.toFixed(2)),
        startedAt: Date.now(),
        endedAt: null,
        completed: false,
        interrupted: false,
        ts: Date.now()
      };
      this.activeRecord = rec;
      this.lastPlayback = rec;
      this.playbackHistory.push(rec);
      if (this.playbackHistory.length > 25) this.playbackHistory.shift();
      return rec;
    },

    _playDecodedBuffers(ctx, bufferList, text, speaker, byteLen, engineName = 'voicevox') {
      return new Promise((resolve) => {
        const gap = 0.02;
        let totalDur = 0;
        bufferList.forEach((b, idx) => {
          totalDur += b.duration + (idx < bufferList.length - 1 ? gap : 0);
        });

        const rec = this._recordStart(engineName, speaker, text, byteLen, totalDur);
        const sources = [];
        let cursor = ctx.currentTime + 0.005;
        let settled = false;
        let safeTimer = null;

        const finish = (ok) => {
          if (settled) return;
          settled = true;
          if (safeTimer !== null) {
            clearTimeout(safeTimer);
            safeTimer = null;
          }
          if (window.RoboLaboBGM && window.RoboLaboBGM.setDucking) {
            window.RoboLaboBGM.setDucking(false);
          }
          this.activeSources = [];
          if (this.activeRecord === rec) {
            if (ok) rec.completed = true;
            rec.endedAt = Date.now();
            this.activeRecord = null;
          }
          if (this.activeFinishResolve === finish) {
            this.activeFinishResolve = null;
          }
          resolve(ok);
          if (ok) this._flushQueueIfAny();
        };

        this.activeFinishResolve = finish;
        if (window.RoboLaboBGM && window.RoboLaboBGM.setDucking) {
          window.RoboLaboBGM.setDucking(true);
        }

        safeTimer = setTimeout(() => {
          finish(true);
        }, Math.ceil((totalDur + 2.5) * 1000));

        bufferList.forEach((buf, idx) => {
          const src = ctx.createBufferSource();
          src.buffer = buf;
          src.connect(RoboAudio.voiceGain || ctx.destination);

          if (idx === bufferList.length - 1) {
            src.onended = () => finish(true);
          }
          src.start(cursor);
          cursor += buf.duration + gap;
          sources.push(src);
        });

        this.activeSources = sources;
      });
    }
  };

  window.RoboAudio = RoboAudio;
  window.RoboVoice = RoboVoice;
})();
