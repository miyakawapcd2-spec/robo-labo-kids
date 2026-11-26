/**
 * Robo Labo Kids - Retro Chiptune Web Audio API BGM Player
 * --------------------------------------------------------
 * 依存ライブラリなし・単体動作するWeb Audio API用BGMモジュールです。
 * iPhone Safari / Android Chrome / PCブラウザ対応（初回タッチ自動アンロック機能付き）。
 *
 * 使い方 (<script src="robo_labo_bgm_api.js"></script>):
 *   RoboLaboBGM.play('standby');  // 待機画面（宇宙）
 *   RoboLaboBGM.play('meteor');   // メテオ・ナンバーズ
 *   RoboLaboBGM.play('mecha');    // メカ・クラフト
 *   RoboLaboBGM.play('logic');    // ロジック・ローバー
 *   RoboLaboBGM.stop();           // 停止
 *   RoboLaboBGM.setVolume(0.4);   // 音量設定 (0.0 〜 1.0)
 *   RoboLaboBGM.toggleMute();     // ミュート切替
 */
(function (global) {
  'use strict';

  const NOTE_INDEX = {
    C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3,
    E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8,
    A: 9, 'A#': 10, Bb: 10, B: 11
  };

  function noteToFreq(name) {
    if (!name || name === '-') return 0;
    let pitch, octave;
    if (name.length >= 2 && (name[1] === '#' || name[1] === 'b')) {
      pitch = name.slice(0, 2);
      octave = parseInt(name.slice(2), 10);
    } else {
      pitch = name.slice(0, 1);
      octave = parseInt(name.slice(1), 10);
    }
    const midi = (octave + 1) * 12 + NOTE_INDEX[pitch];
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  function expandPattern(items) {
    const events = [];
    let step = 0;
    for (let i = 0; i < items.length; i++) {
      const [note, dur] = items[i];
      if (note && note !== '-') {
        events.push([step, note, dur]);
      }
      step += dur;
    }
    return events;
  }

  // ==========================================
  // 楽曲データ定義（全4曲・各16小節ループ）
  // ==========================================
  const TRACK_DATA = {
    standby: {
      id: 'standby',
      name: '待機画面（宇宙）',
      fileName: '01_standby_space.mp3',
      bpm: 108,
      bars: 16,
      leadDuty: 0.25,
      arpDuty: 0.125,
      leadGain: 0.24,
      arpGain: 0.11,
      bassGain: 0.28,
      lead: expandPattern([
        ['E5',4],['G5',4],['B5',4],['G5',4], ['A5',6],['G5',2],['E5',8],
        ['F5',4],['A5',4],['C6',4],['A5',4], ['G5',8],['-',8],
        ['E5',4],['A5',4],['C6',4],['B5',4], ['A5',6],['G5',2],['E5',8],
        ['D5',4],['G5',4],['B5',4],['A5',4], ['G5',12],['-',4],
        ['C6',4],['B5',4],['G5',4],['E5',4], ['F5',4],['G5',4],['A5',8],
        ['A5',4],['C6',4],['D6',4],['C6',4], ['B5',8],['G5',8],
        ['F5',4],['A5',4],['G5',4],['F5',4], ['E5',4],['D5',4],['G5',8],
        ['E5',4],['G5',4],['C6',4],['B5',4], ['C6',12],['-',4]
      ]),
      chords: [
        ['C4','E4','G4','B4'],['C4','E4','G4','B4'],['F4','A4','C5','E5'],['F4','A4','C5','E5'],
        ['A3','C4','E4','G4'],['A3','C4','E4','G4'],['G3','B3','D4','E4'],['G3','B3','D4','F4'],
        ['C4','E4','G4','B4'],['C4','E4','G4','B4'],['F4','A4','C5','E5'],['E4','G4','B4','D5'],
        ['D4','F4','A4','C5'],['G3','B3','D4','F4'],['C4','E4','G4','B4'],['G3','B3','D4','G4']
      ],
      arpMode: 'standby',
      bassRoots: ['C3','C3','F2','F2','A2','A2','G2','G2','C3','C3','F2','E2','D2','G2','C3','G2'],
      bassMode: 'standby',
      drums: ['K','H','','H','H','','H','','K','H','','H','S','H','','H']
    },

    meteor: {
      id: 'meteor',
      name: 'メテオ・ナンバーズ',
      fileName: '02_meteor_numbers.mp3',
      bpm: 144,
      bars: 16,
      leadDuty: 0.5,
      arpDuty: 0.25,
      leadGain: 0.25,
      arpGain: 0.12,
      bassGain: 0.28,
      lead: expandPattern([
        ['G5',2],['G5',2],['B5',2],['D6',2],['G5',4],['D5',4],
        ['E5',2],['F#5',2],['G5',2],['A5',2],['B5',6],['-',2],
        ['A5',2],['A5',2],['F#5',2],['D5',2],['A5',4],['D6',4],
        ['C6',2],['B5',2],['A5',2],['G5',2],['F#5',6],['-',2],
        ['E5',2],['G5',2],['B5',2],['E6',2],['D6',4],['B5',4],
        ['C6',2],['B5',2],['A5',2],['G5',2],['E5',6],['-',2],
        ['D5',2],['F#5',2],['A5',2],['C6',2],['B5',4],['A5',4],
        ['G5',8],['-',8],
        ['C6',2],['C6',2],['G5',2],['E5',2],['C6',4],['B5',4],
        ['B5',2],['B5',2],['G5',2],['D5',2],['B5',4],['A5',4],
        ['A5',2],['B5',2],['C6',2],['A5',2],['F#5',4],['A5',4],
        ['D6',4],['C6',4],['B5',4],['A5',4],
        ['G5',2],['B5',2],['E6',4],['D6',4],['B5',4],
        ['C6',2],['D6',2],['E6',4],['C6',4],['A5',4],
        ['D6',2],['C6',2],['B5',2],['A5',2],['G5',4],['F#5',4],
        ['G5',10],['-',6]
      ]),
      chords: [
        ['G4','B4','D5'],['G4','B4','D5'],['D4','F#4','A4'],['D4','F#4','A4'],
        ['E4','G4','B4'],['C4','E4','G4'],['D4','F#4','A4'],['G4','B4','D5'],
        ['C4','E4','G4'],['G4','B4','D5'],['A3','C4','E4'],['D4','F#4','A4'],
        ['E4','G4','B4'],['C4','E4','G4'],['D4','F#4','A4'],['G4','B4','D5']
      ],
      arpMode: 'meteor',
      bassRoots: [
        ['G2','G3'],['G2','G3'],['D2','D3'],['D2','D3'],
        ['E2','E3'],['C3','C4'],['D2','D3'],['G2','G3'],
        ['C3','C4'],['G2','G3'],['A2','A3'],['D2','D3'],
        ['E2','E3'],['C3','C4'],['D2','D3'],['G2','G3']
      ],
      bassMode: 'meteor',
      drums: ['K','H','H','H','S','H','K','H','K','H','K','H','S','H','O','H']
    },

    mecha: {
      id: 'mecha',
      name: 'メカ・クラフト',
      fileName: '03_mecha_craft.mp3',
      bpm: 124,
      bars: 16,
      leadDuty: 0.25,
      arpDuty: 0.125,
      leadGain: 0.26,
      arpGain: 0.12,
      bassGain: 0.28,
      lead: expandPattern([
        ['F5',3],['G5',1],['A5',2],['C6',2],['A5',4],['F5',4],
        ['G5',3],['A5',1],['Bb5',2],['G5',2],['C6',6],['-',2],
        ['D6',2],['C6',2],['Bb5',2],['A5',2],['G5',4],['F5',4],
        ['E5',2],['G5',2],['C6',4],['G5',6],['-',2],
        ['A5',3],['G5',1],['F5',2],['D5',2],['F5',4],['A5',4],
        ['G5',2],['F5',2],['E5',2],['D5',2],['C5',6],['-',2],
        ['G5',2],['A5',2],['Bb5',4],['C6',4],['E5',4],
        ['F5',8],['-',8],
        ['Bb5',2],['D6',2],['C6',2],['Bb5',2],['A5',4],['F5',4],
        ['G5',2],['Bb5',2],['A5',2],['G5',2],['F5',4],['C5',4],
        ['D5',2],['F5',2],['G5',2],['Bb5',2],['A5',4],['G5',4],
        ['C6',4],['G5',4],['E5',4],['C5',4],
        ['F5',2],['A5',2],['C6',4],['D6',2],['C6',2],['Bb5',4],
        ['A5',2],['G5',2],['F5',4],['G5',4],['A5',4],
        ['Bb5',2],['A5',2],['G5',2],['E5',2],['C5',4],['G5',4],
        ['F5',10],['-',6]
      ]),
      chords: [
        ['F4','A4','C5'],['G4','Bb4','C5'],['Bb3','D4','F4'],['C4','E4','G4'],
        ['F4','A4','C5'],['D4','F4','A4'],['G4','Bb4','D5'],['F4','A4','C5'],
        ['Bb3','D4','F4'],['F4','A4','C5'],['G4','Bb4','D5'],['C4','E4','G4'],
        ['F4','A4','C5'],['Bb3','D4','F4'],['C4','E4','G4'],['F4','A4','C5']
      ],
      arpMode: 'mecha',
      bassRoots: ['F2','C3','Bb2','C3','F2','D2','G2','F2','Bb2','F2','G2','C3','F2','Bb2','C3','F2'],
      bassMode: 'mecha',
      drums: ['K','','H','','S','','H','K','K','','H','','S','','H','S']
    },

    logic: {
      id: 'logic',
      name: 'ロジック・ローバー',
      fileName: '04_logic_rover.mp3',
      bpm: 116,
      bars: 16,
      leadDuty: 0.5,
      arpDuty: 0.25,
      leadGain: 0.24,
      arpGain: 0.11,
      bassGain: 0.28,
      lead: expandPattern([
        ['F#5',2],['A5',2],['D6',4],['A5',2],['F#5',2],['E5',4],
        ['D5',2],['E5',2],['F#5',4],['A5',6],['-',2],
        ['G5',2],['B5',2],['D6',4],['B5',2],['G5',2],['F#5',4],
        ['E5',4],['A5',4],['E5',6],['-',2],
        ['D6',2],['C#6',2],['B5',4],['F#5',2],['B5',2],['A5',4],
        ['G5',2],['F#5',2],['E5',4],['D5',6],['-',2],
        ['E5',2],['G5',2],['B5',2],['G5',2],['A5',4],['C#6',4],
        ['D6',8],['-',8],
        ['B5',2],['G5',2],['D5',2],['G5',2],['A5',4],['F#5',4],
        ['G5',2],['E5',2],['A5',2],['G5',2],['F#5',6],['-',2],
        ['B5',2],['D6',2],['C#6',2],['B5',2],['A5',4],['E5',4],
        ['F#5',2],['G#5',2],['A5',4],['E5',4],['A5',4],
        ['D6',4],['A5',2],['F#5',2],['G5',4],['B5',4],
        ['A5',2],['G5',2],['F#5',2],['E5',2],['D5',4],['E5',4],
        ['F#5',2],['G5',2],['A5',4],['E5',4],['C#5',4],
        ['D5',10],['-',6]
      ]),
      chords: [
        ['D4','F#4','A4'],['D4','F#4','A4'],['G4','B4','D5'],['A4','C#5','E5'],
        ['B3','D4','F#4'],['F#4','A4','C#5'],['E4','G4','B4'],['D4','F#4','A4'],
        ['G4','B4','D5'],['D4','F#4','A4'],['B3','D4','F#4'],['A4','C#5','E5'],
        ['D4','F#4','A4'],['G4','B4','D5'],['A4','C#5','E5'],['D4','F#4','A4']
      ],
      arpMode: 'logic',
      bassRoots: ['D3','A2','G2','A2','B2','F#2','E2','D3','G2','D3','B2','A2','D3','G2','A2','D3'],
      bassMode: 'logic',
      drums: ['K','','H','','S','','H','','K','','H','K','S','','H','']
    }
  };

  const ALIASES = {
    standby: 'standby',
    standby_space: 'standby',
    '01_standby_space': 'standby',
    '待機画面': 'standby',
    '宇宙': 'standby',
    meteor: 'meteor',
    meteor_numbers: 'meteor',
    '02_meteor_numbers': 'meteor',
    'メテオ・ナンバーズ': 'meteor',
    'メテオナンバーズ': 'meteor',
    mecha: 'mecha',
    mecha_craft: 'mecha',
    '03_mecha_craft': 'mecha',
    'メカ・クラフト': 'mecha',
    'メカクラフト': 'mecha',
    logic: 'logic',
    logic_rover: 'logic',
    '04_logic_rover': 'logic',
    'ロジック・ローバー': 'logic',
    'ロジックローバー': 'logic'
  };

  function buildStepMap(track) {
    const totalSteps = track.bars * 16;
    const stepMap = new Array(totalSteps);
    for (let i = 0; i < totalSteps; i++) {
      stepMap[i] = { lead: null, arp: null, bass: null, drum: '' };
    }

    track.lead.forEach(([s, note, dur]) => {
      if (s < totalSteps) stepMap[s].lead = [note, dur];
    });

    for (let b = 0; b < track.bars; b++) {
      const ch = track.chords[b];
      if (track.arpMode === 'standby') {
        for (let s = 0; s < 16; s += 2) {
          stepMap[b * 16 + s].arp = [ch[(s / 2) % 4], 2];
        }
      } else if (track.arpMode === 'meteor') {
        for (let s = 0; s < 16; s += 2) {
          stepMap[b * 16 + s].arp = [ch[(s / 2) % 3], 1];
        }
      } else if (track.arpMode === 'mecha') {
        [0, 3, 4, 7, 8, 11, 12, 14].forEach((s) => {
          stepMap[b * 16 + s].arp = [ch[s % 3], 1];
        });
      } else if (track.arpMode === 'logic') {
        for (let s = 0; s < 16; s += 4) {
          stepMap[b * 16 + s].arp = [ch[0], 2];
          stepMap[b * 16 + s + 2].arp = [ch[1], 2];
        }
      }

      const root = track.bassRoots[b];
      if (track.bassMode === 'standby') {
        stepMap[b * 16 + 0].bass = [root, 6];
        stepMap[b * 16 + 8].bass = [root, 6];
      } else if (track.bassMode === 'meteor') {
        for (let s = 0; s < 16; s += 2) {
          stepMap[b * 16 + s].bass = [(s / 2) % 2 === 0 ? root[0] : root[1], 2];
        }
      } else if (track.bassMode === 'mecha') {
        [0, 4, 8, 12].forEach((s) => {
          stepMap[b * 16 + s].bass = [root, 3];
        });
      } else if (track.bassMode === 'logic') {
        stepMap[b * 16 + 0].bass = [root, 4];
        stepMap[b * 16 + 6].bass = [root, 2];
        stepMap[b * 16 + 8].bass = [root, 4];
        stepMap[b * 16 + 14].bass = [root, 2];
      }

      for (let s = 0; s < 16; s++) {
        stepMap[b * 16 + s].drum = track.drums[s];
      }
    }
    return stepMap;
  }

  class RoboLaboBGMPlayer {
    constructor() {
      this.ctx = null;
      this.masterGain = null;
      this.noiseBuffer = null;
      this.pulseWaves = {};
      this.volume = 0.34;
      this.duckFactor = 1.0;
      this.muted = false;
      this.isPlaying = false;
      this.currentTrackId = null;
      this.currentStepMap = null;
      this.currentStep = 0;
      this.nextNoteTime = 0;
      this.timerId = null;
      this.pendingTrackId = null;
      this._bindUnlock();
    }

    _bindUnlock() {
      if (typeof document === 'undefined') return;
      const unlockHandler = () => {
        this.unlock();
      };
      ['touchstart', 'pointerdown', 'click', 'keydown'].forEach((ev) => {
        document.addEventListener(ev, unlockHandler, { passive: true });
      });
    }

    _ensureContext() {
      let nextCtx = null;
      if (global.RoboAudio && typeof global.RoboAudio.ensureContext === 'function') {
        nextCtx = global.RoboAudio.ensureContext();
      }
      if (!nextCtx) {
        if (this.ctx) {
          nextCtx = this.ctx;
        } else {
          const AudioCtx = global.AudioContext || global.webkitAudioContext;
          if (!AudioCtx) return null;
          nextCtx = new AudioCtx();
        }
      }
      if (this.ctx !== nextCtx || !this.masterGain) {
        this.ctx = nextCtx;
        this.masterGain = this.ctx.createGain();
        this._syncGain(true);
        this.masterGain.connect(this.ctx.destination);
        this._createNoiseBuffer();
        this._createPulseWave(0.25);
        this._createPulseWave(0.125);
      }
      return this.ctx;
    }

    _syncGain(immediate = false) {
      if (!this.masterGain || !this.ctx) return;
      const target = this.muted ? 0 : this.volume * this.duckFactor;
      if (immediate) {
        this.masterGain.gain.setValueAtTime(target, this.ctx.currentTime);
      } else {
        this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.03);
      }
    }

    setDucking(isDucking) {
      this.duckFactor = isDucking ? 0.38 : 1.0;
      this._syncGain(false);
      return this.duckFactor;
    }

    _createNoiseBuffer() {
      const length = this.ctx.sampleRate * 0.5;
      const buf = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buf;
    }

    _createPulseWave(duty) {
      const harmonics = 12;
      const real = new Float32Array(harmonics);
      const imag = new Float32Array(harmonics);
      for (let k = 1; k < harmonics; k++) {
        real[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
      }
      this.pulseWaves[duty] = this.ctx.createPeriodicWave(real, imag);
    }

    unlock() {
      const ctx = this._ensureContext();
      if (!ctx) return Promise.resolve(false);
      if (ctx.state === 'suspended') {
        return ctx.resume().then(() => {
          if (this.pendingTrackId && !this.isPlaying && !this.muted) {
            const id = this.pendingTrackId;
            this.pendingTrackId = null;
            this.play(id);
          }
          return true;
        }).catch(() => false);
      }
      if (ctx.state === 'running' && this.pendingTrackId && !this.isPlaying && !this.muted) {
        const id = this.pendingTrackId;
        this.pendingTrackId = null;
        this.play(id);
      }
      return Promise.resolve(true);
    }

    _playPulse(freq, time, dur, duty, gainVal) {
      if (!freq || dur <= 0) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      if (duty === 0.5) {
        osc.type = 'square';
      } else {
        osc.setPeriodicWave(this.pulseWaves[duty] || this.pulseWaves[0.25]);
      }
      const attackEnd = Math.min(0.008, dur * 0.2);
      const decayEnd = Math.max(attackEnd + 0.004, Math.min(dur * 0.4, 0.08));
      const releaseStart = Math.max(decayEnd + 0.004, dur - 0.03);
      osc.frequency.setValueAtTime(freq, time);
      g.gain.setValueAtTime(0.0001, time);
      g.gain.linearRampToValueAtTime(gainVal, time + attackEnd);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0001, gainVal * 0.65), time + decayEnd);
      g.gain.setValueAtTime(Math.max(0.0001, gainVal * 0.6), time + releaseStart);
      g.gain.linearRampToValueAtTime(0.0001, time + dur);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(time);
      osc.stop(time + dur + 0.01);
    }

    _playTriangle(freq, time, dur, gainVal) {
      if (!freq || dur <= 0) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);
      g.gain.setValueAtTime(0.0001, time);
      g.gain.linearRampToValueAtTime(gainVal, time + 0.005);
      g.gain.setValueAtTime(gainVal * 0.85, time + Math.max(0.01, dur - 0.025));
      g.gain.linearRampToValueAtTime(0.0001, time + dur);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(time);
      osc.stop(time + dur + 0.01);
    }

    _playDrum(type, time) {
      if (type === 'K') {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(42, time + 0.12);
        g.gain.setValueAtTime(0.35, time);
        g.gain.exponentialRampToValueAtTime(0.001, time + 0.14);
        osc.connect(g);
        g.connect(this.masterGain);
        osc.start(time);
        osc.stop(time + 0.15);
      } else if (type === 'S') {
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 900;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.20, time);
        g.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
        src.connect(filter);
        filter.connect(g);
        g.connect(this.masterGain);
        src.start(time);
        src.stop(time + 0.13);
      } else if (type === 'H' || type === 'O') {
        const dur = type === 'O' ? 0.10 : 0.045;
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 5000;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.11, time);
        g.gain.exponentialRampToValueAtTime(0.001, time + dur);
        src.connect(filter);
        filter.connect(g);
        g.connect(this.masterGain);
        src.start(time);
        src.stop(time + dur + 0.01);
      }
    }

    _scheduleStep(track, stepIdx, time, stepSec) {
      const ev = this.currentStepMap[stepIdx];
      if (!ev) return;
      if (ev.lead) {
        this._playPulse(noteToFreq(ev.lead[0]), time, ev.lead[1] * stepSec * 0.92, track.leadDuty, track.leadGain);
      }
      if (ev.arp) {
        this._playPulse(noteToFreq(ev.arp[0]), time, ev.arp[1] * stepSec * 0.85, track.arpDuty, track.arpGain);
      }
      if (ev.bass) {
        this._playTriangle(noteToFreq(ev.bass[0]), time, ev.bass[1] * stepSec * 0.90, track.bassGain);
      }
      if (ev.drum) {
        for (let i = 0; i < ev.drum.length; i++) {
          this._playDrum(ev.drum[i], time);
        }
      }
    }

    play(trackKey) {
      const id = ALIASES[trackKey] || ALIASES[String(trackKey).trim()];
      const track = TRACK_DATA[id];
      if (!track) {
        console.warn('[RoboLaboBGM] Unknown track:', trackKey);
        return false;
      }

      const ctx = this._ensureContext();
      if (!ctx) return false;

      if (this.isPlaying && this.currentTrackId === id) {
        return true;
      }

      this.stop();
      this.currentTrackId = id;
      this.currentStepMap = buildStepMap(track);
      this.currentStep = 0;

      if (ctx.state === 'suspended') {
        this.pendingTrackId = id;
        ctx.resume().then(() => {
          if (this.pendingTrackId === id && !this.muted && ctx.state === 'running') {
            this.pendingTrackId = null;
            this._startScheduler(track);
          }
        }).catch(() => {});
        return true;
      }

      this._startScheduler(track);
      return true;
    }

    _startScheduler(track) {
      if (this.timerId !== null) {
        global.clearInterval(this.timerId);
        this.timerId = null;
      }
      const stepSec = 60 / track.bpm / 4;
      const totalSteps = track.bars * 16;
      this.isPlaying = true;
      this.nextNoteTime = this.ctx.currentTime + 0.05;

      this.timerId = global.setInterval(() => {
        if (!this.isPlaying || (typeof document !== 'undefined' && document.hidden)) return;
        if (!this.ctx || this.ctx.state !== 'running') return;
        if (this.nextNoteTime < this.ctx.currentTime - 0.15) {
          this.nextNoteTime = this.ctx.currentTime + 0.05;
        }
        while (this.nextNoteTime < this.ctx.currentTime + 0.15) {
          this._scheduleStep(track, this.currentStep, this.nextNoteTime, stepSec);
          this.nextNoteTime += stepSec;
          this.currentStep = (this.currentStep + 1) % totalSteps;
        }
      }, 25);
    }

    stop() {
      this.isPlaying = false;
      this.pendingTrackId = null;
      if (this.timerId !== null) {
        global.clearInterval(this.timerId);
        this.timerId = null;
      }
    }

    setVolume(vol) {
      this.volume = Math.max(0, Math.min(1, Number(vol)));
      this._syncGain(false);
      return this.volume;
    }

    setMuted(muted) {
      this.muted = Boolean(muted);
      this._syncGain(false);
      return this.muted;
    }

    toggleMute() {
      return this.setMuted(!this.muted);
    }

    getCurrentTrack() {
      return this.currentTrackId ? TRACK_DATA[this.currentTrackId] : null;
    }

    getTracks() {
      return Object.keys(TRACK_DATA).map((k) => ({
        id: TRACK_DATA[k].id,
        name: TRACK_DATA[k].name,
        fileName: TRACK_DATA[k].fileName,
        bpm: TRACK_DATA[k].bpm
      }));
    }
  }

  global.RoboLaboBGM = new RoboLaboBGMPlayer();
})(typeof window !== 'undefined' ? window : globalThis);
