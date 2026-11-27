(function () {
  'use strict';

  /* =========================================================================
   * CoopGame: 4歳＆7歳 同時マルチタッチ協力バトル『きょうだい合体大決戦』
   * - P1 #3: sessionId による全タイマー競合防止
   * - P1 #6: 「🟩 みどりの しかく」修正 ＋ 4歳向け指示ボイス読み上げ ＋ Canvas実図形ターゲット＆ヒント点滅
   * - P2 #8: タッグ専用統計 (recordCoopAction) へ分離しソロ習熟度を汚染しない
   * - P2 #11 & #17: clientWidth/ResizeObserver 対応 ＆ document.hidden 省電力対応
   * ========================================================================= */
  const GEM_SPECS = [
    { id: 'red_circle',  color: '#ff3d57', shape: 'circle', label: '🔴 あかい まる',     speech: 'あかい まるを タッチ！' },
    { id: 'blue_circle', color: '#00c8ff', shape: 'circle', label: '🔵 あおい まる',     speech: 'あおい まるを タッチ！' },
    { id: 'yellow_star', color: '#ffd600', shape: 'star',   label: '⭐ きいろの ほし',   speech: 'きいろの ほしを タッチ！' },
    { id: 'green_rect',  color: '#00e676', shape: 'rect',   label: '🟩 みどりの しかく', speech: 'みどりの しかくを タッチ！' }
  ];

  const BOSS_NAMES = ['メカギドラ', 'マグマゴーレム', 'キングUFO'];

  const CoopGame = {
    active: false,
    sessionId: 0,
    layout: 'side',
    stage: 1,
    bossHp: 100,
    bossMaxHp: 100,
    bossHitFlash: 0,
    synchro: 0,
    uniteReady: false,
    topPressed: false,
    bottomPressed: false,
    uniteBeamTimer: 0,
    victoryPending: false,
    chargerMissStreak: 0,

    topCanvas: null,
    topCtx: null,
    bottomCanvas: null,
    bottomCtx: null,
    fxCanvas: null,
    fxCtx: null,
    resizeObs: null,

    topW: 360, topH: 220,
    botW: 360, botH: 220,
    fxW: 360,  fxH: 640,

    gems: [],
    targetGem: GEM_SPECS[0],
    currentCmdQuiz: null,
    shots: [],
    particlesTop: null,
    particlesBot: null,
    particlesFx: null,

    aiTimer: 0,
    rafId: null,
    lastTime: 0,
    onFinishCallback: null,
    boundOnce: false,

    initElements() {
      this.topCanvas = document.getElementById('coopTopCanvas');
      this.topCtx = this.topCanvas.getContext('2d');
      this.bottomCanvas = document.getElementById('coopBottomCanvas');
      this.bottomCtx = this.bottomCanvas.getContext('2d');
      this.fxCanvas = document.getElementById('coopFxCanvas');
      this.fxCtx = this.fxCanvas.getContext('2d');

      this.particlesTop = new window.RoboRenderer.ParticleSystem();
      this.particlesBot = new window.RoboRenderer.ParticleSystem();
      this.particlesFx  = new window.RoboRenderer.ParticleSystem();

      if (!this.boundOnce) {
        this.boundOnce = true;
        this.bindEvents();
        const onResize = () => {
          if (this.active) this.resizeAll();
        };
        window.addEventListener('resize', onResize);
        if (typeof ResizeObserver !== 'undefined') {
          this.resizeObs = new ResizeObserver(onResize);
          this.resizeObs.observe(document.getElementById('coopContainer'));
        }
      }
    },

    resizeAll() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      const tp = this.topCanvas.parentElement;
      this.topW = Math.max(240, tp.clientWidth || tp.getBoundingClientRect().width);
      this.topH = Math.max(120, tp.clientHeight || tp.getBoundingClientRect().height);
      this.topCanvas.width = Math.round(this.topW * dpr);
      this.topCanvas.height = Math.round(this.topH * dpr);
      this.topCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const bp = this.bottomCanvas.parentElement;
      this.botW = Math.max(240, bp.clientWidth || bp.getBoundingClientRect().width);
      this.botH = Math.max(120, bp.clientHeight || bp.getBoundingClientRect().height);
      this.bottomCanvas.width = Math.round(this.botW * dpr);
      this.bottomCanvas.height = Math.round(this.botH * dpr);
      this.bottomCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const fc = document.getElementById('coopContainer');
      this.fxW = Math.max(260, fc.clientWidth || fc.getBoundingClientRect().width);
      this.fxH = Math.max(360, fc.clientHeight || fc.getBoundingClientRect().height);
      this.fxCanvas.width = Math.round(this.fxW * dpr);
      this.fxCanvas.height = Math.round(this.fxH * dpr);
      this.fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

      for (const g of this.gems) {
        g.x = Math.max(115, Math.min(this.botW - g.r - 10, g.x));
        g.y = Math.max(g.r + 10, Math.min(this.botH - g.r - 10, g.y));
      }
    },

    start(layout, onFinish) {
      this.initElements();
      this.sessionId++;
      const mySession = this.sessionId;
      this.active = true;
      this.layout = layout || 'side';
      this.onFinishCallback = onFinish;

      this.stage = window.AdaptiveAI.state.coopStage || 1;
      this.bossMaxHp = 100 + (this.stage - 1) * 20;
      this.bossHp = this.bossMaxHp;
      this.bossHitFlash = 0;
      this.synchro = 0;
      this.uniteReady = false;
      this.topPressed = false;
      this.bottomPressed = false;
      this.uniteBeamTimer = 0;
      this.victoryPending = false;
      this.chargerMissStreak = 0;
      this.shots = [];
      this.aiTimer = 0;

      this.applyLayoutFlip();
      this.resizeAll();

      document.getElementById('coopUniteOverlay').classList.add('hidden');
      document.getElementById('btnUniteTop').classList.remove('pressed');
      document.getElementById('btnUniteBottom').classList.remove('pressed');

      const bossIdx = (this.stage - 1) % BOSS_NAMES.length;
      document.getElementById('coopBossName').textContent = `${BOSS_NAMES[bossIdx]} Lv.${this.stage}`;
      this.updateBars();

      this.spawnGems();
      this.generateCommanderQuiz();

      window.RoboAudio.playBgm('battle');
      // 開始挨拶の直後に4歳チャージャーへの最初の指示を読み上げる！
      Promise.resolve(
        window.RoboVoice.speak('きょうだいタッグ しゅつげき！力をあわせて かいじゅうを たおそう！', { priority: 'praise', interrupt: true })
      ).then((ok) => {
        if (ok && this.active && this.sessionId === mySession) {
          window.RoboVoice.speak(this.targetGem.speech, { priority: 'prompt', interrupt: false });
        }
      });
      this.pickNextChargerOrder(false);

      this.lastTime = performance.now();
      if (this.rafId) cancelAnimationFrame(this.rafId);
      const loop = (now) => {
        if (!this.active || this.sessionId !== mySession) return;
        if (!document.hidden) {
          const dt = Math.max(0, Math.min(0.05, (now - this.lastTime) / 1000));
          this.lastTime = now;
          this.update(dt, now * 0.001);
          this.draw(now * 0.001);
        } else {
          this.lastTime = now;
        }
        this.rafId = requestAnimationFrame(loop);
      };
      this.rafId = requestAnimationFrame(loop);
    },

    stop() {
      this.sessionId++;
      this.active = false;
      this.uniteReady = false;
      this.uniteBeamTimer = 0;
      this.victoryPending = false;
      const overlay = document.getElementById('coopUniteOverlay');
      if (overlay) overlay.classList.add('hidden');
      if (this.fxCtx) {
        this.fxCtx.clearRect(0, 0, this.fxW, this.fxH);
      }
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
      window.RoboVoice.stop();
    },

    toggleFlip() {
      this.layout = this.layout === 'face' ? 'side' : 'face';
      this.applyLayoutFlip();
      window.RoboAudio.tap();
    },

    applyLayoutFlip() {
      const topZone = document.getElementById('coopTopZone');
      const uniteTop = document.getElementById('btnUniteTop');
      if (this.layout === 'face') {
        topZone.classList.add('flipped');
        uniteTop.classList.add('flipped');
      } else {
        topZone.classList.remove('flipped');
        uniteTop.classList.remove('flipped');
      }
    },

    updateBars() {
      const hpPct = Math.max(0, Math.min(100, (this.bossHp / this.bossMaxHp) * 100));
      document.getElementById('coopBossHpFill').style.width = `${hpPct}%`;

      const synPct = Math.max(0, Math.min(100, this.synchro));
      document.getElementById('coopSynchroFill').style.width = `${synPct}%`;
      document.getElementById('coopSynchroText').textContent =
        synPct >= 100 ? '🌟 がったいOK！！ 🌟' : `きょうだいパワー ${Math.round(synPct)}%`;
    },

    spawnGems() {
      this.gems = [];
      for (let i = 0; i < 6; i++) {
        const spec = GEM_SPECS[i % GEM_SPECS.length];
        this.gems.push(this.makeGem(spec, i));
      }
    },

    makeGem(spec, idx = 0) {
      const minX = 118;
      const maxX = Math.max(minX + 60, this.botW - 36);
      return {
        spec,
        x: minX + ((idx * 67 + Math.random() * 40) % (maxX - minX)),
        y: 34 + Math.random() * Math.max(40, this.botH - 68),
        vx: (Math.random() - 0.5) * 46,
        vy: (Math.random() - 0.5) * 46,
        r: 26
      };
    },

    /* P1 #6: 指示が変わるたびに4歳児向けに短く読み上げ！ */
    pickNextChargerOrder(announce = true) {
      this.targetGem = GEM_SPECS[Math.floor(Math.random() * GEM_SPECS.length)];
      if (!this.gems.some((g) => g.spec.id === this.targetGem.id)) {
        if (this.gems.length > 0) this.gems[0].spec = this.targetGem;
        else this.gems.push(this.makeGem(this.targetGem, 0));
      }
      const orderEl = document.getElementById('chargerOrderText');
      if (orderEl) orderEl.textContent = `${this.targetGem.label} をタッチ！`;
      if (announce && !this.uniteReady) {
        window.RoboVoice.speak(this.targetGem.speech, { priority: 'prompt', interrupt: false });
      }
    },

    handleChargerTouch(x, y) {
      if (!this.active || this.uniteReady || this.uniteBeamTimer > 0) return;
      for (let i = this.gems.length - 1; i >= 0; i--) {
        const g = this.gems[i];
        if (Math.hypot(x - g.x, y - g.y) <= g.r + 14) {
          if (g.spec.id === this.targetGem.id) {
            this.chargerMissStreak = 0;
            window.RoboAudio.pop(5);
            this.particlesBot.burst(g.x, g.y, g.spec.color, 16, 190);
            this.particlesBot.popText(g.x, g.y - 12, 'チャージ！+22%', '#00e676');

            this.gems.splice(i, 1, this.makeGem(GEM_SPECS[Math.floor(Math.random() * GEM_SPECS.length)], i));
            this.damageBoss(9, false);
            this.addSynchro(22);
            window.AdaptiveAI.recordCoopAction('charger', true);
            if (!this.uniteReady && this.bossHp > 0) {
              this.pickNextChargerOrder(true);
            }
          } else {
            this.chargerMissStreak++;
            window.AdaptiveAI.recordCoopAction('charger', false);
            window.RoboAudio.gentleHint();
            this.particlesBot.popText(g.x, g.y - 10, this.targetGem.label, '#ffd600');
            if (this.chargerMissStreak >= 2) {
              window.RoboVoice.speak(this.targetGem.speech, { priority: 'ui', interrupt: true });
            }
          }
          break;
        }
      }
    },

    generateCommanderQuiz() {
      const sk = window.AdaptiveAI.getSkill('7', 'math');
      const q = window.AdaptiveAI.generateMathQuestion7(sk.level, 1);
      this.currentCmdQuiz = q;
      const qText = document.getElementById('cmdQuestionText');
      if (qText) qText.textContent = q.expr || `${q.a} + ${q.b} = ?`;

      const grid = document.getElementById('cmdChoicesGrid');
      if (!grid) return;
      grid.innerHTML = '';
      q.choices.forEach((val) => {
        const btn = document.createElement('button');
        btn.className = 'cmd-ans-btn';
        btn.textContent = String(val);
        btn.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.handleCommanderAnswer(val);
        });
        grid.appendChild(btn);
      });
    },

    handleCommanderAnswer(val) {
      if (!this.active || this.uniteReady || this.uniteBeamTimer > 0 || !this.currentCmdQuiz) return;
      if (val === this.currentCmdQuiz.answer) {
        window.RoboAudio.laser();
        window.AdaptiveAI.recordCoopAction('commander', true);
        this.shots.push({ x: this.topW * 0.35, y: this.topH * 0.85, tx: this.topW * 0.22, ty: this.topH * 0.45, life: 0.28 });
        this.damageBoss(16, true);
        this.addSynchro(28);
        this.generateCommanderQuiz();
      } else {
        window.RoboAudio.gentleHint();
        window.AdaptiveAI.recordCoopAction('commander', false);
        this.particlesTop.popText(this.topW * 0.68, this.topH * 0.3, 'おしい！', '#80f0ff');
      }
    },

    damageBoss(dmg, fromTop) {
      this.bossHp = Math.max(0, this.bossHp - dmg);
      this.bossHitFlash = 0.28;
      this.particlesTop.burst(this.topW * 0.22, this.topH * 0.48, fromTop ? '#00e5ff' : '#ffd600', 16, 180);
      this.updateBars();

      if (this.bossHp <= 0 && this.uniteBeamTimer <= 0) {
        this.victory();
      }
    },

    addSynchro(amount) {
      if (this.uniteReady || this.bossHp <= 0) return;
      this.synchro = Math.min(100, this.synchro + amount);
      this.updateBars();

      if (this.synchro >= 100) {
        this.uniteReady = true;
        this.topPressed = false;
        this.bottomPressed = false;
        document.getElementById('btnUniteTop').classList.remove('pressed');
        document.getElementById('btnUniteBottom').classList.remove('pressed');
        document.getElementById('coopUniteOverlay').classList.remove('hidden');
        window.RoboAudio.combo(5);
        window.RoboVoice.speak('パワー 100パーセント！ふたりで 合体ボタンを タッチしよう！', { priority: 'praise', interrupt: true });
      }
    },

    triggerUniteButton(which) {
      if (!this.uniteReady) return;
      const sid = this.sessionId;
      window.RoboAudio.snap();
      if (which === 'top') {
        this.topPressed = true;
        document.getElementById('btnUniteTop').classList.add('pressed');
      } else {
        this.bottomPressed = true;
        document.getElementById('btnUniteBottom').classList.add('pressed');
      }

      if (this.layout === 'ai') {
        setTimeout(() => {
          if (!this.active || this.sessionId !== sid || !this.uniteReady) return;
          this.topPressed = true;
          this.bottomPressed = true;
          this.fireUniteHyperBeam();
        }, 260);
        return;
      }

      if (this.topPressed && this.bottomPressed) {
        this.fireUniteHyperBeam();
      }
    },

    fireUniteHyperBeam() {
      if (!this.uniteReady) return;
      const sid = this.sessionId;
      this.uniteReady = false;
      this.synchro = 0;
      this.updateBars();
      document.getElementById('coopUniteOverlay').classList.add('hidden');

      this.uniteBeamTimer = 3.2;
      window.RoboAudio.uniteFanfare();
      window.RoboAudio.explosion();
      this.particlesFx.confetti(this.fxW, this.fxH, 95);
      this.particlesFx.burst(this.fxW * 0.5, this.fxH * 0.55, '#ffd600', 40, 280);
      window.RoboVoice.speak('きょうだい合体！ギャラクシー・ハイパーレーザー！！', { priority: 'praise', interrupt: true });

      setTimeout(() => {
        if (!this.active || this.sessionId !== sid) return;
        this.bossHp = Math.max(0, this.bossHp - 45);
        this.bossHitFlash = 0.6;
        window.RoboAudio.explosion();
        this.particlesTop.burst(this.topW * 0.24, this.topH * 0.45, '#ffd600', 36, 260);
        this.updateBars();
        if (this.bossHp <= 0) {
          this.victoryPending = true;
        }
      }, 1650);

      setTimeout(() => {
        if (!this.active || this.sessionId !== sid) return;
        this.bossHp = Math.max(0, this.bossHp - 25);
        this.bossHitFlash = 0.65;
        window.RoboAudio.explosion();
        this.particlesTop.burst(this.topW * 0.24, this.topH * 0.45, '#00e5ff', 42, 300);
        this.updateBars();
        if (this.bossHp <= 0) {
          this.victoryPending = true;
        }
      }, 2350);

      setTimeout(() => {
        if (!this.active || this.sessionId !== sid) return;
        if (this.victoryPending || this.bossHp <= 0) {
          this.victory();
        }
      }, 3100);
    },

    victory() {
      if (!this.active) return;
      this.active = false;
      this.victoryPending = false;
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
      window.AdaptiveAI.state.coopStage = (this.stage || 1) + 1;
      window.AdaptiveAI.state.coopClears = (window.AdaptiveAI.state.coopClears || 0) + 1;
      window.AdaptiveAI.addStars(5);
      window.RoboAudio.stageClear();
      window.RoboVoice.speak('やったー！きょうだいパワーで 大しょうり！', { priority: 'praise', interrupt: true });

      if (typeof this.onFinishCallback === 'function') {
        this.onFinishCallback({
          gameType: 'coop',
          age: 'coop',
          starsEarned: 5,
          stageCleared: this.stage
        });
      }
    },

    bindEvents() {
      this.bottomCanvas.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        const rect = this.bottomCanvas.getBoundingClientRect();
        const sx = rect.width > 0 ? this.botW / rect.width : 1;
        const sy = rect.height > 0 ? this.botH / rect.height : 1;
        this.handleChargerTouch((e.clientX - rect.left) * sx, (e.clientY - rect.top) * sy);
      });

      const btnTop = document.getElementById('btnUniteTop');
      const btnBot = document.getElementById('btnUniteBottom');
      btnTop.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.triggerUniteButton('top');
      });
      btnBot.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.triggerUniteButton('bottom');
      });
    },

    update(dt) {
      this.particlesTop.update(dt);
      this.particlesBot.update(dt);
      this.particlesFx.update(dt);

      if (this.bossHitFlash > 0) this.bossHitFlash = Math.max(0, this.bossHitFlash - dt);
      if (this.uniteBeamTimer > 0) this.uniteBeamTimer = Math.max(0, this.uniteBeamTimer - dt);
      if (this.uniteBeamTimer > 0 && Math.random() < 0.35) {
        this.particlesFx.burst(this.fxW * (0.25 + Math.random() * 0.5), this.fxH * (0.2 + Math.random() * 0.55), '#ffd600', 4, 150);
      }

      for (let i = this.shots.length - 1; i >= 0; i--) {
        this.shots[i].life -= dt;
        if (this.shots[i].life <= 0) this.shots.splice(i, 1);
      }

      const minX = 112;
      for (const g of this.gems) {
        g.x += g.vx * dt;
        g.y += g.vy * dt;
        if (g.x < minX) { g.x = minX; g.vx = Math.abs(g.vx); }
        if (g.x > this.botW - g.r - 10) { g.x = this.botW - g.r - 10; g.vx = -Math.abs(g.vx); }
        if (g.y < g.r + 10) { g.y = g.r + 10; g.vy = Math.abs(g.vy); }
        if (g.y > this.botH - g.r - 10) { g.y = this.botH - g.r - 10; g.vy = -Math.abs(g.vy); }
      }

      if (this.layout === 'ai' && !this.uniteReady && this.uniteBeamTimer <= 0) {
        this.aiTimer += dt;
        if (this.aiTimer >= 4.2) {
          this.aiTimer = 0;
          this.damageBoss(8, false);
          this.addSynchro(18);
          this.particlesBot.popText(62, 40, 'AIサポート！', '#80f0ff');
        }
      }
    },

    draw(t) {
      const tctx = this.topCtx;
      tctx.clearRect(0, 0, this.topW, this.topH);
      const bossIdx = (this.stage - 1) % 3;
      window.RoboRenderer.drawMonster(tctx, this.topW * 0.22, this.topH * 0.52, 0.85, bossIdx, t, this.bossHitFlash);

      for (const s of this.shots) {
        tctx.save();
        tctx.strokeStyle = '#00e5ff';
        tctx.lineWidth = 9;
        tctx.beginPath();
        tctx.moveTo(s.x, s.y);
        tctx.lineTo(s.tx, s.ty);
        tctx.stroke();
        tctx.restore();
      }
      this.particlesTop.draw(tctx);

      const bctx = this.bottomCtx;
      bctx.clearRect(0, 0, this.botW, this.botH);
      const robo4 = window.AdaptiveAI.state.robots[0];
      window.RoboRenderer.drawRobot(bctx, 54, this.botH * 0.60, 0.48, robo4, { time: t, pose: this.uniteBeamTimer > 0 ? 'happy' : 'idle' });

      // P1 #6: ロボの頭上に「今集める図形」の大型実物アイコンバッジを描画！
      bctx.save();
      window.RoboRenderer.roundRectPath(bctx, 10, 6, 88, 36, 12);
      bctx.fillStyle = 'rgba(8, 18, 42, 0.86)';
      bctx.fill();
      bctx.strokeStyle = '#ffd600';
      bctx.lineWidth = 2;
      bctx.stroke();
      bctx.fillStyle = '#ffffff';
      bctx.font = '900 11px sans-serif';
      bctx.fillText('これ！👉', 16, 28);
      drawGemShape(bctx, 76, 24, 12, this.targetGem);
      bctx.restore();

      const showHintGlow = this.chargerMissStreak >= 2;
      for (const g of this.gems) {
        if (showHintGlow && g.spec.id === this.targetGem.id) {
          bctx.save();
          bctx.strokeStyle = '#ffd600';
          bctx.lineWidth = 4;
          bctx.beginPath();
          bctx.arc(g.x, g.y, g.r + 7 + Math.sin(t * 10) * 3, 0, Math.PI * 2);
          bctx.stroke();
          bctx.restore();
        }
        drawGemShape(bctx, g.x, g.y, g.r, g.spec);
      }
      this.particlesBot.draw(bctx);

      const fctx = this.fxCtx;
      fctx.clearRect(0, 0, this.fxW, this.fxH);
      if (this.uniteBeamTimer > 0) {
        const progress = Math.max(0, Math.min(1, 1 - this.uniteBeamTimer / 3.2));
        const r4 = window.AdaptiveAI.state.robots[0];
        const r7 = window.AdaptiveAI.state.robots[1];
        const cx = this.fxW * 0.5;
        const cy = this.fxH * 0.61;
        fctx.save();

        // シネマティック画面シェイク（レーザー発射フェーズ）
        if (progress >= 0.42) {
          const shk = (1 - (progress - 0.42) / 0.58) * 5.5 + 1.5;
          fctx.translate(Math.sin(t * 62) * shk, Math.cos(t * 54) * shk * 0.7);
        }

        // ダーク宇宙フィルター＆放射集中線
        fctx.fillStyle = `rgba(6, 10, 28, ${progress < 0.40 ? 0.72 : 0.44})`;
        fctx.fillRect(-10, -10, this.fxW + 20, this.fxH + 20);

        // 集中線（24本回転）
        fctx.save();
        fctx.translate(cx, cy);
        fctx.rotate(t * 1.1);
        for (let i = 0; i < 24; i++) {
          const ang = (i / 24) * Math.PI * 2;
          fctx.strokeStyle = i % 2 === 0 ? 'rgba(0, 229, 255, 0.28)' : 'rgba(255, 214, 0, 0.24)';
          fctx.lineWidth = i % 3 === 0 ? 3.5 : 1.5;
          fctx.beginPath();
          fctx.moveTo(Math.cos(ang) * 70, Math.sin(ang) * 70);
          fctx.lineTo(Math.cos(ang) * this.fxH, Math.sin(ang) * this.fxH);
          fctx.stroke();
        }
        fctx.restore();

        // 上下シネマティック黒帯
        const barH = Math.round(this.fxH * 0.065);
        fctx.fillStyle = 'rgba(4, 8, 20, 0.92)';
        fctx.fillRect(0, 0, this.fxW, barH);
        fctx.fillRect(0, this.fxH - barH, this.fxW, barH);

        if (progress < 0.26) {
          // Phase 1 (0〜0.83秒)：兄弟ロボがロケット軌跡と電撃リンクを放ち中央へ高速合体接近！
          const mergeT = progress / 0.26;
          const ease = mergeT * mergeT;
          const lx = this.fxW * (0.16 + 0.34 * ease);
          const rx = this.fxW * (0.84 - 0.34 * ease);

          // ジェット軌跡と合体電撃リンク
          fctx.strokeStyle = '#00e5ff';
          fctx.lineWidth = 5;
          fctx.beginPath();
          fctx.moveTo(0, cy);
          fctx.lineTo(lx, cy);
          fctx.moveTo(this.fxW, cy);
          fctx.lineTo(rx, cy);
          fctx.stroke();

          fctx.strokeStyle = '#ffd600';
          fctx.lineWidth = 3.5;
          fctx.beginPath();
          fctx.moveTo(lx, cy - 12);
          fctx.lineTo(cx, cy - 22 + Math.sin(t * 50) * 10);
          fctx.lineTo(rx, cy - 12);
          fctx.stroke();

          window.RoboRenderer.drawRobot(fctx, lx, cy, 0.72, r4, { time: t, pose: 'beam', jumping: true });
          window.RoboRenderer.drawRobot(fctx, rx, cy, 0.72, r7, { time: t, pose: 'beam', jumping: true });

          // 収束エネルギーリング
          fctx.strokeStyle = '#ffd600';
          fctx.lineWidth = 4 + mergeT * 6;
          fctx.beginPath();
          fctx.arc(cx, cy, 18 + (1 - mergeT) * 125, 0, Math.PI * 2);
          fctx.stroke();
        } else {
          // Phase 2 & 3 (0.83〜3.20秒)：閃光ドッキング → ツインカイザー降臨＆7色ハイパーレーザー乱舞！
          const postT = (progress - 0.26) / 0.74;
          const flashAlpha = Math.max(0, 1 - (progress - 0.26) / 0.14);

          // 回転8芒星ギア陣
          fctx.save();
          fctx.translate(cx, cy);
          fctx.rotate(t * 1.8);
          fctx.strokeStyle = 'rgba(255, 214, 0, 0.48)';
          fctx.lineWidth = 3;
          fctx.setLineDash([18, 12]);
          fctx.beginPath();
          fctx.arc(0, 0, 118, 0, Math.PI * 2);
          fctx.stroke();
          fctx.rotate(-t * 3.2);
          fctx.strokeStyle = 'rgba(0, 229, 255, 0.45)';
          fctx.beginPath();
          fctx.arc(0, 0, 92, 0, Math.PI * 2);
          fctx.stroke();
          fctx.setLineDash([]);
          fctx.restore();

          const megaSc = Math.min(1.18, 0.72 + postT * 1.15);
          if (window.RoboRenderer.drawCombinedMegaRobot) {
            window.RoboRenderer.drawCombinedMegaRobot(fctx, cx, cy, megaSc, r4, r7, t, progress >= 0.36);
          }

          // ドッキング閃光フラッシュ＆同心衝撃波
          if (flashAlpha > 0) {
            fctx.fillStyle = `rgba(255, 255, 255, ${(flashAlpha * 0.85).toFixed(2)})`;
            fctx.fillRect(0, 0, this.fxW, this.fxH);
          }

          // 豪華ゴールデン・カットインバナー
          const bw = Math.min(352, this.fxW - 18);
          const bx = (this.fxW - bw) / 2;
          const by = barH + 14;
          const bGrad = fctx.createLinearGradient(bx, by, bx + bw, by);
          bGrad.addColorStop(0, 'rgba(18, 28, 72, 0.94)');
          bGrad.addColorStop(0.5, 'rgba(68, 24, 112, 0.96)');
          bGrad.addColorStop(1, 'rgba(18, 28, 72, 0.94)');
          fctx.fillStyle = bGrad;
          window.RoboRenderer.roundRectPath(fctx, bx, by, bw, 46, 23);
          fctx.fill();
          fctx.lineWidth = 3.2;
          fctx.strokeStyle = '#ffd600';
          fctx.stroke();
          fctx.fillStyle = '#ffd600';
          fctx.font = '900 17px sans-serif';
          fctx.textAlign = 'center';
          fctx.textBaseline = 'middle';
          fctx.fillText('⚡ きょうだい がったい！ツインカイザー！！ ⚡', cx, by + 23);
        }
        fctx.restore();
      }
      this.particlesFx.draw(fctx);
    }
  };

  function drawGemShape(ctx, x, y, r, spec) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = spec.color;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.8;

    if (spec.shape === 'star') {
      window.RoboRenderer.drawStarShape(ctx, 0, 0, 5, r, r * 0.48, spec.color);
    } else if (spec.shape === 'rect') {
      window.RoboRenderer.roundRectPath(ctx, -r * 0.85, -r * 0.85, r * 1.7, r * 1.7, Math.max(4, r * 0.25));
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  window.CoopGame = CoopGame;
})();
