(function () {
  'use strict';

  /* =========================================================================
   * SoloGames: 3つの本格インタラクティブ知育アトラクション（4歳／7歳対応）
   * - P0 #1: 4歳なぞり迷路 全マップ可解化 ＋ カギ取得状態保持＆チェックポイント再訪許可
   * - P0 #2: 7歳プログラミング 回数修飾ループ(×2〜×4)圧縮 ＋ 上限12 ＋ 残りブロック表示
   * - P1 #3: sessionId による全タイマー・非同期コールバックの厳密な世代分離
   * - P1 #4: ほめ言葉再生完了（Promise）を待ってから次ウェーブへ進む順序制御
   * - P2 #9/#10/#11/#14/#15: レベル別難易度帯・PointerCapture・clientWidth/ResizeObserver・
   *   トレイ0.58倍縮小・下パネル実測高さ計算（iPhone SE 375x667完全対応）
   * ========================================================================= */
  const TOTAL_WAVES = 5;
  const MAX_PROG_SLOTS = 12;

  const SoloGames = {
    active: false,
    sessionId: 0,
    gameType: 'math',
    age: '4',
    wave: 0,
    starsEarned: 0,
    questionStartMs: 0,
    currentPromptSpeech: '',
    canvas: null,
    ctx: null,
    overlay: null,
    resizeObs: null,
    w: 360,
    h: 480,
    rafId: null,
    lastTime: 0,
    particles: null,
    roboAnim: { pose: 'idle', timer: 0 },
    beamShot: null,
    modeState: null,
    onFinishCallback: null,

    initElements() {
      this.canvas = document.getElementById('playCanvas');
      this.ctx = this.canvas.getContext('2d');
      this.overlay = document.getElementById('playOverlayUI');
      this.particles = new window.RoboRenderer.ParticleSystem();
      this.bindPointerEvents();

      const onResize = () => {
        if (this.active) this.resizeCanvas();
      };
      window.addEventListener('resize', onResize);
      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObs = new ResizeObserver(onResize);
        this.resizeObs.observe(this.canvas.parentElement);
      }
    },

    /* P2 #11: CSS transform(scale)の影響を受けない clientWidth/clientHeight で取得し盤面再配置 */
    resizeCanvas() {
      if (!this.canvas) return;
      const wrap = this.canvas.parentElement;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const newW = Math.max(260, wrap.clientWidth || wrap.getBoundingClientRect().width);
      const newH = Math.max(220, wrap.clientHeight || wrap.getBoundingClientRect().height);
      const prevW = this.w;
      const prevH = this.h;
      this.w = newW;
      this.h = newH;
      this.canvas.width = Math.round(this.w * dpr);
      this.canvas.height = Math.round(this.h * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (this.modeState && (Math.abs(newW - prevW) > 4 || Math.abs(newH - prevH) > 4)) {
        this.relayoutOnResize(prevW, prevH);
      }
    },

    relayoutOnResize(prevW, prevH) {
      const st = this.modeState;
      if (!st) return;
      const rx = prevW > 0 ? this.w / prevW : 1;
      const ry = prevH > 0 ? this.h / prevH : 1;

      if (st.kind === 'math_meteor') {
        const count = st.meteors.length;
        const laneW = (this.w - 40) / count;
        st.meteors.forEach((m, idx) => {
          m.x = 20 + laneW * (idx + 0.5);
          m.baseY = (st.q.type === 'visual_add' || st.q.type === 'calc_shoot')
            ? this.h * 0.44 + (idx % 2) * 26
            : this.h * 0.30 + (idx % 2) * 38;
          m.y = m.baseY;
        });
      } else if (st.kind === 'math_seq') {
        st.nodes.forEach((nd) => {
          nd.x = Math.max(nd.r + 12, Math.min(this.w - nd.r - 12, nd.x * rx));
          nd.y = Math.max(nd.r + 24, Math.min(this.h * 0.68 - nd.r, nd.y * ry));
        });
      } else if (st.kind === 'math_chain') {
        st.orbs.forEach((o) => {
          o.x = Math.max(o.r + 12, Math.min(this.w - o.r - 12, o.x * rx));
          o.y = Math.max(o.r + 54, Math.min(this.h * 0.70 - o.r, o.y * ry));
        });
      } else if (st.kind === 'shape_4') {
        const cx = this.w * 0.5;
        const cy = this.h * 0.33;
        const trayY = this.h * 0.80;
        const spacing = (this.w - 36) / st.pieces.length;
        st.slots.forEach((sl, i) => {
          sl.targetX = cx + st.bp.parts[i].ox;
          sl.targetY = cy + st.bp.parts[i].oy;
        });
        st.pieces.forEach((p, i) => {
          p.homeX = 18 + spacing * (i + 0.5);
          p.homeY = trayY + (i % 2 === 0 ? -8 : 10);
          if (p.placed) {
            const sl = st.slots.find((s) => s.id === p.slotId);
            if (sl) { p.x = sl.targetX; p.y = sl.targetY; }
          } else if (!p.dragging) {
            p.x = p.homeX; p.y = p.homeY;
          }
        });
      } else if (st.kind === 'shape_gear' && !st.locked) {
        const rebuilt = buildGearPuzzle(this.w, this.h, st.stageIdx);
        st.motorGear.x = rebuilt.motorGear.x;
        st.motorGear.y = rebuilt.motorGear.y;
        st.goalGear.x = rebuilt.goalGear.x;
        st.goalGear.y = rebuilt.goalGear.y;
        st.pins = rebuilt.pins;
        st.walls = rebuilt.walls;
        const mov = st.gears.filter((g) => !g.fixed);
        mov.forEach((g, idx) => {
          g.homeX = rebuilt.movable[idx].homeX;
          g.homeY = rebuilt.movable[idx].homeY;
          if (g.pinId) {
            const pin = st.pins.find((p) => p.id === g.pinId);
            if (pin) { g.x = pin.x; g.y = pin.y; }
          } else if (!g.dragging) {
            g.x = g.homeX; g.y = g.homeY;
          }
        });
        recomputeGearNetwork(st);
      }
    },

    start(gameType, age, onFinish) {
      if (!this.canvas) this.initElements();
      this.sessionId++;
      const mySession = this.sessionId;
      this.active = true;
      this.gameType = gameType;
      this.age = age === '7' ? '7' : '4';
      this.wave = 0;
      this.starsEarned = 0;
      this.onFinishCallback = onFinish;
      this.overlay.innerHTML = '';
      this.particles = new window.RoboRenderer.ParticleSystem();

      this.resizeCanvas();
      window.RoboAudio.playBgm(gameType === 'math' ? 'battle' : 'puzzle');

      this.nextWave();
      this.lastTime = performance.now();
      if (this.rafId) cancelAnimationFrame(this.rafId);
      const tick = (now) => {
        if (!this.active || this.sessionId !== mySession) return;
        if (!document.hidden) {
          const dt = Math.min(0.05, (now - this.lastTime) / 1000);
          this.lastTime = now;
          this.update(dt, now * 0.001);
          this.draw(now * 0.001);
        } else {
          this.lastTime = now;
        }
        this.rafId = requestAnimationFrame(tick);
      };
      this.rafId = requestAnimationFrame(tick);
    },

    stop() {
      this.sessionId++;
      this.active = false;
      this.modeState = null;
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
      if (this.overlay) this.overlay.innerHTML = '';
      window.RoboVoice.stop();
    },

    updateHud() {
      const sk = window.AdaptiveAI.getSkill(this.age, this.gameType);
      const chip = document.getElementById('playModeChip');
      if (chip) {
        chip.textContent = `${this.age === '4' ? '🐣 4さい' : '🚀 7さい'} Lv.${sk.level}`;
      }
      const starsEl = document.getElementById('playStarsEarned');
      if (starsEl) starsEl.textContent = String(this.starsEarned);

      const dotsWrap = document.getElementById('playProgressDots');
      if (dotsWrap) {
        dotsWrap.innerHTML = '';
        for (let i = 0; i < TOTAL_WAVES; i++) {
          const d = document.createElement('span');
          d.className = 'p-dot' + (i < this.wave ? ' done' : i === this.wave ? ' current' : '');
          dotsWrap.appendChild(d);
        }
      }
    },

    setPrompt(text, speechText) {
      const qEl = document.getElementById('questionText');
      if (qEl) qEl.textContent = text;
      this.currentPromptSpeech = speechText || text;
      window.RoboVoice.speak(this.currentPromptSpeech, { priority: 'prompt', interrupt: false });
    },

    speakCurrentPrompt() {
      if (this.currentPromptSpeech) {
        window.RoboVoice.speak(this.currentPromptSpeech, { priority: 'ui', interrupt: true, force: true });
      }
    },

    nextWave() {
      if (!this.active) return;
      if (this.wave >= TOTAL_WAVES) {
        this.finishSet();
        return;
      }
      this.overlay.innerHTML = '';
      this.questionStartMs = performance.now();
      this.updateHud();

      const sk = window.AdaptiveAI.getSkill(this.age, this.gameType);
      if (this.gameType === 'math') {
        this.setupMathWave(sk.level);
      } else if (this.gameType === 'shape') {
        this.setupShapeWave(sk.level);
      } else {
        this.setupLogicWave(sk.level);
      }
    },

    /* P1 #3 & #4: sessionId で世代保護しつつ、ほめ言葉再生完了（最大2.4秒キャップ）を待ってから次問題へ */
    completeWave(bx, by, praiseText = 'やったね！大せいかい！') {
      const sid = this.sessionId;
      if (!this.active) return;

      const elapsed = performance.now() - this.questionStartMs;
      const res = window.AdaptiveAI.recordAttempt(this.age, this.gameType, true, elapsed);
      this.starsEarned += 1;
      window.AdaptiveAI.addStars(1);

      window.RoboAudio.correct();
      this.particles.burst(bx || this.w / 2, by || this.h * 0.4, '#ffd600', 26, 260);
      this.particles.popText(bx || this.w / 2, (by || this.h * 0.4) - 20, res.leveledUp ? 'LEVEL UP!! ⭐' : 'ナイス！ ⭐+1', '#ffd600');
      this.roboAnim = { pose: 'happy', timer: 0.9 };

      let spokenMsg = praiseText;
      if (res.leveledUp) {
        spokenMsg = 'すごい！レベルアップしたよ！';
      } else if (this.wave === TOTAL_WAVES - 1) {
        spokenMsg = 'ぜんぶ クリア！すごすぎる！';
      }
      const voicePromise = Promise.resolve(
        window.RoboVoice.speak(spokenMsg, { priority: 'praise', interrupt: true })
      );

      this.wave++;
      this.updateHud();
      if (this.modeState) this.modeState.locked = true;

      const minDelay = new Promise((r) => setTimeout(r, 850));
      const maxCap   = new Promise((r) => setTimeout(r, 2400));

      Promise.all([minDelay, Promise.race([voicePromise, maxCap])]).then(() => {
        if (!this.active || this.sessionId !== sid) return;
        this.nextWave();
      });
    },

    registerMistake(x, y, hintMsg) {
      window.AdaptiveAI.recordAttempt(this.age, this.gameType, false, 5000);
      window.RoboAudio.gentleHint();
      this.particles.popText(x || this.w / 2, y || this.h * 0.45, 'もういちど！', '#80f0ff');
      if (hintMsg) {
        window.RoboVoice.speak(hintMsg, { priority: 'ui', interrupt: true });
      }
      this.updateHud();
    },

    finishSet() {
      this.active = false;
      this.starsEarned += 2;
      window.AdaptiveAI.addStars(2);
      window.RoboAudio.stageClear();
      if (typeof this.onFinishCallback === 'function') {
        this.onFinishCallback({
          gameType: this.gameType,
          age: this.age,
          starsEarned: this.starsEarned
        });
      }
    },

    /* =======================================================================
     * 1. メテオ・ナンバーズ (MATH)
     * ======================================================================= */
    setupMathWave(level) {
      const q = this.age === '4'
        ? window.AdaptiveAI.generateMathQuestion4(level, this.wave)
        : window.AdaptiveAI.generateMathQuestion7(level, this.wave);

      this.setPrompt(q.prompt, q.speech);

      if (q.type === 'sequence') {
        const nodes = [];
        for (let n = 1; n <= q.maxN; n++) {
          nodes.push({
            num: n,
            x: 52 + ((n * 73) % Math.max(80, this.w - 104)),
            y: 65 + Math.floor((n - 1) / 3) * 82 + (n % 2) * 16,
            vx: (Math.random() - 0.5) * 32,
            vy: (Math.random() - 0.5) * 32,
            r: 31,
            done: false
          });
        }
        relaxCircles(nodes, this.w, this.h * 0.68, 44);
        this.modeState = { kind: 'math_seq', q, nextNum: 1, nodes, locked: false };
      } else if (q.type === 'number_chain') {
        const orbs = createNumberChainOrbs(q.target, this.w, this.h * 0.72);
        this.modeState = {
          kind: 'math_chain',
          q,
          orbs,
          selected: [],
          dragging: false,
          pointerPos: null,
          locked: false
        };
      } else {
        const count = q.choices.length;
        const laneW = (this.w - 40) / count;
        const meteors = q.choices.map((val, idx) => {
          const baseY = q.type === 'visual_add' || q.type === 'calc_shoot'
            ? this.h * 0.44 + (idx % 2) * 26
            : this.h * 0.30 + (idx % 2) * 38;
          return {
            val,
            x: 20 + laneW * (idx + 0.5),
            y: baseY,
            baseY,
            r: count <= 3 ? Math.min(52, laneW * 0.42) : Math.min(39, laneW * 0.43),
            phase: idx * 1.4,
            shake: 0,
            showDots: q.type === 'count_dots' || q.type === 'compare'
          };
        });
        this.modeState = { kind: 'math_meteor', q, meteors, showHint: false, locked: false };
      }
    },

    /* =======================================================================
     * 2. メカ・クラフト (SHAPE: P2 #9 レベル別難易度 ＋ P2 #14 トレイ縮小配置)
     * ======================================================================= */
    setupShapeWave(level) {
      if (this.age === '4') {
        const bp = pickBlueprintByLevel4(level, this.wave);
        this.setPrompt(`パーツを うごかして【${bp.name}】を つくろう！`, `パーツを うごかして、${bp.name} を かんせいさせよう！`);

        const cx = this.w * 0.5;
        const cy = this.h * 0.33;
        const slots = bp.parts.map((p, i) => ({
          id: i,
          shape: p.shape,
          w: p.w,
          h: p.h,
          color: p.color,
          targetX: cx + p.ox,
          targetY: cy + p.oy,
          filled: false
        }));

        const trayY = this.h * 0.80;
        const spacing = (this.w - 36) / bp.parts.length;
        const pieces = bp.parts.map((p, i) => ({
          slotId: i,
          shape: p.shape,
          w: p.w,
          h: p.h,
          color: p.color,
          x: 18 + spacing * (i + 0.5),
          y: trayY + (i % 2 === 0 ? -8 : 10),
          homeX: 18 + spacing * (i + 0.5),
          homeY: trayY + (i % 2 === 0 ? -8 : 10),
          trayScale: 0.58,
          placed: false,
          dragging: false
        }));

        this.modeState = {
          kind: 'shape_4',
          bp,
          slots,
          pieces,
          activePiece: null,
          driveAnim: 0,
          locked: false
        };
      } else {
        const stageIdx = pickGearStageIndex(level, this.wave);
        const puzzle = buildGearPuzzle(this.w, this.h, stageIdx);
        this.setPrompt(
          'はぐるまを ピンにはめて、モーターから コアまで まわそう！',
          'はぐるまを ピンにはめて、ひだりうえの モーターから みぎしたの コアまで かいてんを つなごう！'
        );
        this.modeState = Object.assign({ kind: 'shape_gear', stageIdx, locked: false, activeGear: null }, puzzle);
        recomputeGearNetwork(this.modeState);
      }
    },

    /* =======================================================================
     * 3. ロジック・ローバー (LOGIC: P0 #1 全可解迷路 / P0 #2 本物の反復ループ)
     * ======================================================================= */
    setupLogicWave(level) {
      if (this.age === '4') {
        const stageIdx = pickMaze4Index(level, this.wave);
        const map = buildMazeMap4(stageIdx);
        const msg = map.hasKey
          ? '🔑カギを とってから 🚪トビラをひらき、🏁ゴールまで なぞろう！'
          : 'ゆびで みちを なぞって、🦖ローバーを 🏁ゴールへ つれていこう！';
        const speech = map.hasKey
          ? 'カギを とってから トビラを ひらいて、ゴールまで なぞろう！'
          : 'ゆびで みちを なぞって、ローバーを ゴールへ つれていこう！';
        this.setPrompt(msg, speech);

        this.modeState = {
          kind: 'logic_trace',
          stageIdx,
          map,
          path: [{ r: map.start.r, c: map.start.c }],
          drawing: false,
          running: false,
          roverPos: { r: map.start.r, c: map.start.c },
          keyCollected: !map.hasKey,
          keyStepIdx: -1,
          locked: false
        };
      } else {
        const stageIdx = pickProg7Index(level, this.wave);
        const map = buildProgMap7(stageIdx);
        this.setPrompt(
          'コマンドを ならべて ▶️スタート！ 🏁ゴールをめざそう！',
          'コマンドブロックを ならべて スタートをおそう！ゴールをめざそう！'
        );
        this.modeState = {
          kind: 'logic_prog',
          stageIdx,
          map,
          rover: { r: map.start.r, c: map.start.c, dir: map.start.dir },
          brokenRocks: new Set(),
          // P0 #2: 各ブロックは { cmd: 'F'|'L'|'R'|'D', count: 1..4 } として保持し、1スロットで複数回反復可能！
          program: [],
          executing: false,
          activeCmdIdx: -1,
          locked: false
        };
        this.renderProgrammingUI();
      }
    },

    renderProgrammingUI() {
      const st = this.modeState;
      if (!st || st.kind !== 'logic_prog') return;

      this.overlay.innerHTML = `
        <div class="interactive-panel" id="progBottomPanel">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:4px;font-size:0.73rem;color:#b3e5fc;font-weight:800;">
            <span>📋 プログラム（🔁で回数をふやす）</span>
            <span id="progRemainLabel" style="white-space:nowrap;color:#ffd600;">のこり ${MAX_PROG_SLOTS}こ</span>
          </div>
          <div class="prog-slots-row" id="progSlotsRow"></div>
          <div class="prog-palette-row">
            <button class="cmd-block-btn" data-cmd="F">⬆️ すすむ</button>
            <button class="cmd-block-btn" data-cmd="L">↩️ ひだり</button>
            <button class="cmd-block-btn" data-cmd="R">↪️ みぎ</button>
            <button class="cmd-block-btn" data-cmd="D">🔨 ドリル</button>
            <button class="cmd-block-btn loop-btn" data-cmd="X2">🔁 くりかえす</button>
            <button class="cmd-block-btn clear-btn" data-cmd="BACK">⌫ けす</button>
            <button class="cmd-block-btn run-btn" data-cmd="RUN">▶️ スタート！</button>
          </div>
        </div>
      `;

      const refreshSlots = () => {
        const row = document.getElementById('progSlotsRow');
        const rem = document.getElementById('progRemainLabel');
        if (rem) rem.textContent = `のこり ${Math.max(0, MAX_PROG_SLOTS - st.program.length)}こ`;
        if (!row) return;
        if (st.program.length === 0) {
          row.innerHTML = '<span style="font-size:0.78rem;color:#90caf9;">ブロックをタップして ならべよう！</span>';
          return;
        }
        const icons = { F: '⬆️', L: '↩️', R: '↪️', D: '🔨' };
        row.innerHTML = st.program.map((blk, idx) => {
          const isLoop = blk.count > 1;
          const badge = isLoop ? `×${blk.count}` : '';
          return `<span class="prog-slot-item ${isLoop ? 'loop' : ''} ${idx === st.activeCmdIdx ? 'active-step' : ''}">${icons[blk.cmd] || blk.cmd}${badge}</span>`;
        }).join('');
      };
      st.refreshSlots = refreshSlots;
      refreshSlots();

      this.overlay.querySelectorAll('.cmd-block-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          if (st.locked || st.executing) return;
          const cmd = btn.getAttribute('data-cmd');
          window.RoboAudio.tap();

          if (cmd === 'BACK') {
            if (st.program.length > 0) {
              const last = st.program[st.program.length - 1];
              if (last.count > 1) last.count--;
              else st.program.pop();
            }
            refreshSlots();
          } else if (cmd === 'RUN') {
            this.executeProgram();
          } else if (cmd === 'X2') {
            if (st.program.length === 0) {
              window.RoboVoice.speak('さきに すすむ などの ブロックを おいてね！', { priority: 'ui', interrupt: true });
              return;
            }
            const last = st.program[st.program.length - 1];
            last.count = last.count >= 4 ? 2 : last.count + 1;
            window.RoboAudio.pop(last.count + 2);
            refreshSlots();
          } else {
            if (st.program.length < MAX_PROG_SLOTS) {
              st.program.push({ cmd, count: 1 });
              refreshSlots();
            } else {
              window.RoboAudio.gentleHint();
              window.RoboVoice.speak('くりかえしボタンを つかうと ブロックを へらせるよ！', { priority: 'ui', interrupt: true });
            }
          }
        });
      });
    },

    executeProgram() {
      const sid = this.sessionId;
      const st = this.modeState;
      if (!st || st.program.length === 0) {
        window.RoboVoice.speak('ブロックを えらんでから スタートしてね！', { priority: 'ui', interrupt: true });
        return;
      }

      st.rover = { r: st.map.start.r, c: st.map.start.c, dir: st.map.start.dir };
      st.brokenRocks = new Set();
      st.executing = true;

      const expanded = [];
      st.program.forEach((blk, idx) => {
        for (let k = 0; k < blk.count; k++) {
          expanded.push({ cmd: blk.cmd, srcIdx: idx });
        }
      });

      const dirs = [
        { dr: -1, dc: 0 },
        { dr: 0, dc: 1 },
        { dr: 1, dc: 0 },
        { dr: 0, dc: -1 }
      ];

      let step = 0;
      const runNext = () => {
        if (!this.active || this.sessionId !== sid || this.modeState !== st) return;
        if (step >= expanded.length) {
          st.executing = false;
          st.activeCmdIdx = -1;
          if (st.refreshSlots) st.refreshSlots();

          if (st.rover.r === st.map.goal.r && st.rover.c === st.map.goal.c) {
            const cell = this.getGridCellCenter(st.map.rows, st.map.cols, st.rover.r, st.rover.c, true);
            this.completeWave(cell.x, cell.y, 'プログラム大せいこう！すごいひらめき！');
          } else {
            this.registerMistake(this.w / 2, this.h * 0.32, 'おしい！あとすこしで ゴールだよ！ブロックを たしてみよう！');
            setTimeout(() => {
              if (this.active && this.sessionId === sid && this.modeState === st && !st.locked) {
                st.rover = { r: st.map.start.r, c: st.map.start.c, dir: st.map.start.dir };
                st.brokenRocks = new Set();
              }
            }, 650);
          }
          return;
        }

        const item = expanded[step++];
        st.activeCmdIdx = item.srcIdx;
        if (st.refreshSlots) st.refreshSlots();

        const d = dirs[st.rover.dir];
        if (item.cmd === 'L') {
          st.rover.dir = (st.rover.dir + 3) % 4;
          window.RoboAudio.pop(2);
        } else if (item.cmd === 'R') {
          st.rover.dir = (st.rover.dir + 1) % 4;
          window.RoboAudio.pop(4);
        } else if (item.cmd === 'D') {
          const nr = st.rover.r + d.dr;
          const nc = st.rover.c + d.dc;
          const key = `${nr},${nc}`;
          if (nr >= 0 && nr < st.map.rows && nc >= 0 && nc < st.map.cols && st.map.grid[nr][nc] === 2) {
            st.brokenRocks.add(key);
            const pt = this.getGridCellCenter(st.map.rows, st.map.cols, nr, nc, true);
            this.particles.burst(pt.x, pt.y, '#ff9100', 18, 180);
            window.RoboAudio.explosion();
          } else {
            window.RoboAudio.gearTick();
          }
        } else if (item.cmd === 'F') {
          const nr = st.rover.r + d.dr;
          const nc = st.rover.c + d.dc;
          const rockKey = `${nr},${nc}`;
          const blocked =
            nr < 0 || nr >= st.map.rows || nc < 0 || nc >= st.map.cols ||
            st.map.grid[nr][nc] === 1 ||
            (st.map.grid[nr][nc] === 2 && !st.brokenRocks.has(rockKey));

          if (blocked) {
            st.executing = false;
            st.activeCmdIdx = -1;
            if (st.refreshSlots) st.refreshSlots();
            const pt = this.getGridCellCenter(st.map.rows, st.map.cols, st.rover.r, st.rover.c, true);
            this.registerMistake(pt.x, pt.y, 'かべや いわに ぶつかっちゃった！むきや ドリルを かくにんしよう！');
            setTimeout(() => {
              if (this.active && this.sessionId === sid && this.modeState === st && !st.locked) {
                st.rover = { r: st.map.start.r, c: st.map.start.c, dir: st.map.start.dir };
                st.brokenRocks = new Set();
              }
            }, 750);
            return;
          }
          st.rover.r = nr;
          st.rover.c = nc;
          window.RoboAudio.pop(Math.min(9, step));
          if (st.rover.r === st.map.goal.r && st.rover.c === st.map.goal.c) {
            step = expanded.length;
          }
        }

        setTimeout(runNext, 360);
      };
      runNext();
    },

    /* =======================================================================
     * ポインター操作（P2 #10: setPointerCapture & lostpointercapture 完全対応）
     * ======================================================================= */
    bindPointerEvents() {
      const getPos = (e) => {
        const rect = this.canvas.getBoundingClientRect();
        const sx = rect.width > 0 ? this.w / rect.width : 1;
        const sy = rect.height > 0 ? this.h / rect.height : 1;
        return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
      };

      this.canvas.addEventListener('pointerdown', (e) => {
        if (!this.active || !this.modeState || this.modeState.locked) return;
        e.preventDefault();
        try { this.canvas.setPointerCapture(e.pointerId); } catch (_) {}
        this.onPointerDown(getPos(e));
      });

      this.canvas.addEventListener('pointermove', (e) => {
        if (!this.active || !this.modeState || this.modeState.locked) return;
        e.preventDefault();
        this.onPointerMove(getPos(e));
      });

      const endHandler = (e) => {
        if (this.canvas && typeof e.pointerId === 'number') {
          try {
            if (this.canvas.hasPointerCapture(e.pointerId)) {
              this.canvas.releasePointerCapture(e.pointerId);
            }
          } catch (_) {}
        }
        if (!this.active || !this.modeState || this.modeState.locked) return;
        this.onPointerUp(getPos(e));
      };
      this.canvas.addEventListener('pointerup', endHandler);
      this.canvas.addEventListener('pointercancel', endHandler);
      this.canvas.addEventListener('lostpointercapture', () => {
        if (!this.active || !this.modeState || this.modeState.locked) return;
        this.onPointerUp({ x: 0, y: 0 });
      });
    },

    onPointerDown(pos) {
      const st = this.modeState;

      if (st.kind === 'math_meteor') {
        for (const m of st.meteors) {
          if (Math.hypot(pos.x - m.x, pos.y - m.y) <= m.r + 12) {
            if (m.val === st.q.answer) {
              window.RoboAudio.laser();
              this.beamShot = { tx: m.x, ty: m.y, timer: 0.3 };
              this.roboAnim = { pose: 'beam', timer: 0.45 };
              this.completeWave(m.x, m.y, 'めいちゅう！すごーい！');
            } else {
              m.shake = 0.4;
              st.showHint = true;
              this.registerMistake(m.x, m.y - m.r, 'よく かぞえて もういちど タッチしてみよう！');
            }
            return;
          }
        }
      } else if (st.kind === 'math_seq') {
        for (const nd of st.nodes) {
          if (!nd.done && Math.hypot(pos.x - nd.x, pos.y - nd.y) <= nd.r + 10) {
            if (nd.num === st.nextNum) {
              nd.done = true;
              window.RoboAudio.pop(nd.num - 1);
              this.particles.burst(nd.x, nd.y, '#00e5ff', 14, 170);
              st.nextNum++;
              if (st.nextNum > st.q.maxN) {
                window.RoboAudio.laser();
                this.completeWave(nd.x, nd.y, 'かんぺきな じゅんばんだね！');
              } else {
                window.RoboVoice.speak(String(nd.num), { priority: 'ui', interrupt: true });
              }
            } else {
              this.registerMistake(nd.x, nd.y, `つぎは ${st.nextNum} を さがしてね！`);
            }
            return;
          }
        }
      } else if (st.kind === 'math_chain') {
        st.dragging = true;
        st.pointerPos = pos;
        for (const orb of st.orbs) {
          if (Math.hypot(pos.x - orb.x, pos.y - orb.y) <= orb.r + 10) {
            const existingIdx = st.selected.indexOf(orb);
            if (existingIdx === -1) {
              st.selected.push(orb);
              window.RoboAudio.pop(st.selected.length);
              this.checkNumberChainSum();
            } else if (existingIdx === st.selected.length - 1 && st.selected.length > 1) {
              st.selected.pop();
              window.RoboAudio.tap();
            }
            break;
          }
        }
      } else if (st.kind === 'shape_4') {
        // P2 #14: トレイ内0.58倍表示サイズに合わせた正確な当たり判定＋最近接の1個のみ選択
        let bestPiece = null;
        let bestDist = Infinity;
        for (const p of st.pieces) {
          if (p.placed) continue;
          const sc = p.trayScale || 0.58;
          const hw = (p.w * sc) * 0.5 + 14;
          const hh = (p.h * sc) * 0.5 + 14;
          if (Math.abs(pos.x - p.x) <= hw && Math.abs(pos.y - p.y) <= hh) {
            const d = Math.hypot(pos.x - p.x, pos.y - p.y);
            if (d < bestDist) {
              bestDist = d;
              bestPiece = p;
            }
          }
        }
        if (bestPiece) {
          bestPiece.dragging = true;
          st.activePiece = bestPiece;
          bestPiece.x = pos.x;
          bestPiece.y = pos.y - 16;
          window.RoboAudio.tap();
        }
      } else if (st.kind === 'shape_gear') {
        for (let i = st.gears.length - 1; i >= 0; i--) {
          const g = st.gears[i];
          if (g.fixed) continue;
          if (Math.hypot(pos.x - g.x, pos.y - g.y) <= g.r + 12) {
            g.pinId = null;
            g.dragging = true;
            st.activeGear = g;
            g.x = pos.x;
            g.y = pos.y;
            window.RoboAudio.tap();
            recomputeGearNetwork(st);
            break;
          }
        }
      } else if (st.kind === 'logic_trace') {
        if (st.running) return;
        const cell = this.hitGridCell(st.map.rows, st.map.cols, pos.x, pos.y, false);
        if (!cell) return;
        const last = st.path[st.path.length - 1];
        if (cell.r === last.r && cell.c === last.c) {
          st.drawing = true;
        } else if (cell.r === st.map.start.r && cell.c === st.map.start.c) {
          st.path = [{ r: cell.r, c: cell.c }];
          st.keyCollected = !st.map.hasKey;
          st.keyStepIdx = -1;
          st.drawing = true;
        } else if (Math.abs(cell.r - last.r) + Math.abs(cell.c - last.c) === 1) {
          st.drawing = true;
          this.tryExtendTrace(cell.r, cell.c);
        }
      }
    },

    onPointerMove(pos) {
      const st = this.modeState;

      if (st.kind === 'math_chain' && st.dragging) {
        st.pointerPos = pos;
        for (const orb of st.orbs) {
          if (!st.selected.includes(orb) && Math.hypot(pos.x - orb.x, pos.y - orb.y) <= orb.r + 6) {
            st.selected.push(orb);
            window.RoboAudio.pop(st.selected.length);
            this.checkNumberChainSum();
            break;
          }
        }
      } else if (st.kind === 'shape_4' && st.activePiece) {
        st.activePiece.x = pos.x;
        st.activePiece.y = pos.y - 16;
      } else if (st.kind === 'shape_gear' && st.activeGear) {
        st.activeGear.x = pos.x;
        st.activeGear.y = pos.y;
      } else if (st.kind === 'logic_trace' && st.drawing && !st.running) {
        const cell = this.hitGridCell(st.map.rows, st.map.cols, pos.x, pos.y, false);
        if (cell) this.tryExtendTrace(cell.r, cell.c);
      }
    },

    onPointerUp() {
      const sid = this.sessionId;
      const st = this.modeState;

      if (st.kind === 'math_chain') {
        st.dragging = false;
        st.pointerPos = null;
        const sum = st.selected.reduce((s, o) => s + o.val, 0);
        if (sum > st.q.target) {
          st.selected = [];
          this.registerMistake(this.w / 2, this.h * 0.4, 'かずが おおきすぎたよ！もういちど つなごう！');
        }
      } else if (st.kind === 'shape_4' && st.activePiece) {
        const p = st.activePiece;
        p.dragging = false;
        st.activePiece = null;

        let matched = null;
        let bestD = 56;
        for (const sl of st.slots) {
          if (!sl.filled && sl.shape === p.shape) {
            const d = Math.hypot(p.x - sl.targetX, p.y - sl.targetY);
            if (d <= bestD) {
              bestD = d;
              matched = sl;
            }
          }
        }
        if (matched) {
          matched.filled = true;
          p.placed = true;
          p.x = matched.targetX;
          p.y = matched.targetY;
          window.RoboAudio.snap();
          this.particles.burst(p.x, p.y, p.color, 18, 180);

          if (st.slots.every((s) => s.filled)) {
            st.locked = true;
            st.driveAnim = 0.01;
            window.RoboAudio.combo(3);
            setTimeout(() => {
              if (this.active && this.sessionId === sid && this.modeState === st) {
                this.completeWave(this.w / 2, this.h * 0.35, 'かんせい！かっこいい！');
              }
            }, 650);
          }
        } else {
          p.x = p.homeX;
          p.y = p.homeY;
          window.RoboAudio.gentleHint();
        }
      } else if (st.kind === 'shape_gear' && st.activeGear) {
        const g = st.activeGear;
        g.dragging = false;
        st.activeGear = null;

        let bestPin = null;
        let bestDist = 48;
        for (const pin of st.pins) {
          const occupied = st.gears.some((other) => other !== g && other.pinId === pin.id);
          if (occupied) continue;
          const d = Math.hypot(g.x - pin.x, g.y - pin.y);
          if (d < bestDist) {
            const hitsWall = st.walls.some((w) => circleIntersectsRect(pin.x, pin.y, g.r - 2, w));
            const overlapsGear = st.gears.some((other) =>
              other !== g && (other.fixed || other.pinId !== null) &&
              Math.hypot(pin.x - other.x, pin.y - other.y) < (g.r + other.r - 12)
            );
            if (!hitsWall && !overlapsGear) {
              bestDist = d;
              bestPin = pin;
            }
          }
        }

        if (bestPin) {
          g.pinId = bestPin.id;
          g.x = bestPin.x;
          g.y = bestPin.y;
          window.RoboAudio.snap();
          recomputeGearNetwork(st);
          if (st.goalGear.omega !== 0) {
            st.locked = true;
            window.RoboAudio.combo(4);
            this.particles.burst(st.goalGear.x, st.goalGear.y, '#00e676', 28, 240);
            setTimeout(() => {
              if (this.active && this.sessionId === sid && this.modeState === st) {
                this.completeWave(st.goalGear.x, st.goalGear.y, 'はぐるま せつぞく かんりょう！すごいエンジンのちからだ！');
              }
            }, 750);
          }
        } else {
          g.pinId = null;
          g.x = g.homeX;
          g.y = g.homeY;
          window.RoboAudio.gentleHint();
          recomputeGearNetwork(st);
        }
      } else if (st.kind === 'logic_trace') {
        st.drawing = false;
      }
    },

    checkNumberChainSum() {
      const st = this.modeState;
      const sum = st.selected.reduce((s, o) => s + o.val, 0);
      if (sum === st.q.target && st.selected.length >= 2) {
        st.locked = true;
        const last = st.selected[st.selected.length - 1];
        window.RoboAudio.laser();
        this.beamShot = { tx: last.x, ty: last.y, timer: 0.35 };
        this.roboAnim = { pose: 'beam', timer: 0.5 };
        const bonusMsg = st.selected.length >= 3 ? 'れんさコンボ！天才だ！' : 'ピッタリ せいかい！';
        this.completeWave(last.x, last.y, bonusMsg);
      } else if (sum > st.q.target) {
        st.dragging = false;
        st.selected = [];
        this.registerMistake(this.w / 2, this.h * 0.4, 'かずが おおきすぎたよ！もういちど つなごう！');
      }
    },

    /* P0 #1: カギ取得状態を保持し、カギ取得前のルートを引き返して再訪できる柔軟なトレース */
    tryExtendTrace(r, c) {
      const sid = this.sessionId;
      const st = this.modeState;
      const last = st.path[st.path.length - 1];
      if (r === last.r && c === last.c) return;

      // 1つ前のマスに戻ったら Undo（ただしカギ取得直後の引き返し時はカギを保持して進むことも可能）
      if (st.path.length >= 2) {
        const prev = st.path[st.path.length - 2];
        if (r === prev.r && c === prev.c && st.keyStepIdx !== st.path.length - 1) {
          st.path.pop();
          window.RoboAudio.tap();
          return;
        }
      }

      if (Math.abs(r - last.r) + Math.abs(c - last.c) !== 1) return;
      const tile = st.map.grid[r][c];
      if (tile === 1) return;

      if (tile === 3 && !st.keyCollected) {
        const pt = this.getGridCellCenter(st.map.rows, st.map.cols, r, c, false);
        this.registerMistake(pt.x, pt.y, 'さきに カギを とってから トビラへ いこう！');
        st.drawing = false;
        return;
      }

      // 同一セグメント内でのループは防ぎつつ、カギ取得後の引き返し（keyStepIdx以前のマス再通過）は許可！
      const searchFrom = st.keyStepIdx >= 0 ? st.keyStepIdx : 0;
      for (let i = searchFrom; i < st.path.length; i++) {
        if (st.path[i].r === r && st.path[i].c === c) return;
      }

      st.path.push({ r, c });
      window.RoboAudio.pop(Math.min(10, st.path.length));

      if (st.map.key && !st.keyCollected && r === st.map.key.r && c === st.map.key.c) {
        st.keyCollected = true;
        st.keyStepIdx = st.path.length - 1;
        const pt = this.getGridCellCenter(st.map.rows, st.map.cols, r, c, false);
        this.particles.burst(pt.x, pt.y, '#ffd600', 16, 160);
        window.RoboAudio.snap();
      }

      if (r === st.map.goal.r && c === st.map.goal.c) {
        st.drawing = false;
        st.running = true;
        st.locked = true;
        let idx = 0;
        const drive = () => {
          if (!this.active || this.sessionId !== sid || this.modeState !== st) return;
          st.roverPos = st.path[idx];
          idx++;
          if (idx < st.path.length) {
            window.RoboAudio.pop(Math.min(10, idx));
            setTimeout(drive, 110);
          } else {
            const pt = this.getGridCellCenter(st.map.rows, st.map.cols, r, c, false);
            this.completeWave(pt.x, pt.y, 'ゴールとうちゃく！すごーい！');
          }
        };
        drive();
      }
    },

    /* =======================================================================
     * フレーム更新＆高精細Canvas描画
     * ======================================================================= */
    update(dt, t) {
      this.particles.update(dt);
      if (this.roboAnim.timer > 0) {
        this.roboAnim.timer -= dt;
        if (this.roboAnim.timer <= 0) this.roboAnim.pose = 'idle';
      }
      if (this.beamShot) {
        this.beamShot.timer -= dt;
        if (this.beamShot.timer <= 0) this.beamShot = null;
      }

      const st = this.modeState;
      if (!st) return;

      if (st.kind === 'math_meteor') {
        for (const m of st.meteors) {
          m.y = m.baseY + Math.sin(t * 2.2 + m.phase) * 7;
          if (m.shake > 0) m.shake = Math.max(0, m.shake - dt);
        }
      } else if (st.kind === 'math_seq') {
        for (const nd of st.nodes) {
          if (nd.done) continue;
          nd.x += nd.vx * dt;
          nd.y += nd.vy * dt;
          if (nd.x < nd.r + 12 || nd.x > this.w - nd.r - 12) nd.vx *= -1;
          if (nd.y < nd.r + 16 || nd.y > this.h * 0.68 - nd.r) nd.vy *= -1;
        }
      } else if (st.kind === 'math_chain') {
        updateFloatingOrbs(st.orbs, this.w, this.h * 0.70, dt);
      } else if (st.kind === 'shape_4' && st.driveAnim > 0) {
        st.driveAnim += dt * 220;
      } else if (st.kind === 'shape_gear') {
        for (const g of st.gears) {
          if (g.omega !== 0) g.angle += g.omega * dt;
        }
      }
    },

    draw(t) {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.w, this.h);

      const st = this.modeState;
      if (!st) return;

      if (st.kind === 'math_meteor' || st.kind === 'math_seq' || st.kind === 'math_chain') {
        this.drawMathScene(ctx, st, t);
      } else if (st.kind === 'shape_4') {
        this.drawShape4Scene(ctx, st, t);
      } else if (st.kind === 'shape_gear') {
        this.drawGearScene(ctx, st, t);
      } else if (st.kind === 'logic_trace') {
        this.drawMazeScene(ctx, st, false, t);
      } else if (st.kind === 'logic_prog') {
        this.drawMazeScene(ctx, st, true, t);
      }

      this.particles.draw(ctx);
    },

    drawMathScene(ctx, st, t) {
      const roboCfg = window.AdaptiveAI.getCurrentRobot(this.age);
      const rx = this.w * 0.5;
      const ry = this.h - 62;
      window.RoboRenderer.drawRobot(ctx, rx, ry, 0.58, roboCfg, { time: t, pose: this.roboAnim.pose });

      if (this.beamShot) {
        ctx.save();
        ctx.strokeStyle = '#ffd600';
        ctx.lineWidth = 12;
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.moveTo(rx, ry - 25);
        ctx.lineTo(this.beamShot.tx, this.beamShot.ty);
        ctx.stroke();
        ctx.restore();
      }

      if (st.kind === 'math_meteor') {
        if (st.q.type === 'visual_add') {
          this.drawVisualAddBox(ctx, st.q.a, st.q.b);
        } else if (st.q.type === 'calc_shoot') {
          this.drawCalcBannerCard(ctx, st.q, st.showHint || window.AdaptiveAI.needsHint(this.age, 'math'));
        }

        for (const m of st.meteors) {
          const sx = m.shake > 0 ? Math.sin(t * 55) * 7 : 0;
          ctx.save();
          ctx.translate(m.x + sx, m.y);

          const grad = ctx.createRadialGradient(-m.r * 0.25, -m.r * 0.25, 4, 0, 0, m.r);
          grad.addColorStop(0, '#5c6bc0');
          grad.addColorStop(1, '#1a237e');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(0, 0, m.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.lineWidth = 3.5;
          ctx.strokeStyle = '#80d8ff';
          ctx.stroke();

          if (m.showDots) {
            drawSubitizingStars(ctx, m.val, m.r);
            if (st.showHint || st.q.type === 'compare') {
              ctx.fillStyle = '#ffffff';
              ctx.font = '900 18px sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText(String(m.val), 0, m.r + 20);
            }
          } else {
            ctx.fillStyle = '#ffd600';
            ctx.font = `900 ${Math.round(m.r * 0.78)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(m.val), 0, 2);
          }
          ctx.restore();
        }
      } else if (st.kind === 'math_seq') {
        for (const nd of st.nodes) {
          ctx.save();
          ctx.translate(nd.x, nd.y);
          ctx.globalAlpha = nd.done ? 0.26 : 1;
          ctx.beginPath();
          ctx.arc(0, 0, nd.r, 0, Math.PI * 2);
          ctx.fillStyle = nd.num === st.nextNum && window.AdaptiveAI.needsHint('4', 'math') ? '#ff4081' : '#00b0ff';
          ctx.fill();
          ctx.lineWidth = 3;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.font = '900 26px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(nd.num), 0, 2);
          ctx.restore();
        }
      } else if (st.kind === 'math_chain') {
        if (st.selected.length > 0) {
          ctx.save();
          ctx.strokeStyle = '#ffd600';
          ctx.lineWidth = 7;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          st.selected.forEach((o, i) => {
            if (i === 0) ctx.moveTo(o.x, o.y);
            else ctx.lineTo(o.x, o.y);
          });
          if (st.dragging && st.pointerPos) {
            ctx.lineTo(st.pointerPos.x, st.pointerPos.y);
          }
          ctx.stroke();
          ctx.restore();

          const sum = st.selected.reduce((s, o) => s + o.val, 0);
          const formula = st.selected.map((o) => o.val).join(' + ') + ` = ${sum} / 目標 ${st.q.target}`;
          ctx.save();
          ctx.fillStyle = 'rgba(8, 16, 38, 0.88)';
          window.RoboRenderer.roundRectPath(ctx, this.w * 0.10, 8, this.w * 0.80, 32, 16);
          ctx.fill();
          ctx.strokeStyle = '#ffd600';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = '#ffd600';
          ctx.font = '900 15px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(formula, this.w * 0.5, 24);
          ctx.restore();
        }

        for (const orb of st.orbs) {
          const picked = st.selected.includes(orb);
          ctx.save();
          ctx.translate(orb.x, orb.y);
          ctx.beginPath();
          ctx.arc(0, 0, picked ? orb.r * 1.12 : orb.r, 0, Math.PI * 2);
          ctx.fillStyle = picked ? '#ff4081' : '#1e88e5';
          ctx.fill();
          ctx.lineWidth = 3;
          ctx.strokeStyle = picked ? '#ffd600' : '#80d8ff';
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.font = '900 23px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(orb.val), 0, 2);
          ctx.restore();
        }
      }
    },

    drawVisualAddBox(ctx, a, b) {
      const bw = Math.min(310, this.w - 30);
      const bx = (this.w - bw) / 2;
      ctx.save();
      window.RoboRenderer.roundRectPath(ctx, bx, 12, bw, 70, 16);
      ctx.fillStyle = 'rgba(12, 25, 58, 0.88)';
      ctx.fill();
      ctx.strokeStyle = '#ffd600';
      ctx.lineWidth = 2;
      ctx.stroke();

      let x = bx + 26;
      for (let i = 0; i < a; i++) {
        window.RoboRenderer.drawStarShape(ctx, x + i * 24, 47, 5, 10, 5, '#ffd600');
      }
      x += a * 24 + 14;
      ctx.fillStyle = '#00e5ff';
      ctx.font = '900 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('+', x, 55);
      x += 22;
      for (let i = 0; i < b; i++) {
        window.RoboRenderer.drawStarShape(ctx, x + i * 24, 47, 5, 10, 5, '#ff80ab');
      }
      ctx.restore();
    },

    drawCalcBannerCard(ctx, q, showHint) {
      const bw = Math.min(290, this.w - 40);
      const bx = (this.w - bw) / 2;
      ctx.save();
      window.RoboRenderer.roundRectPath(ctx, bx, 12, bw, showHint ? 80 : 58, 16);
      ctx.fillStyle = 'rgba(20, 32, 74, 0.92)';
      ctx.fill();
      ctx.strokeStyle = '#ff80ab';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.fillStyle = '#ffd600';
      ctx.font = '900 26px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(q.expr, this.w / 2, 48);

      if (showHint && q.answer <= 20) {
        const startX = this.w / 2 - (Math.min(10, q.answer) * 12) / 2;
        for (let i = 0; i < q.answer; i++) {
          const row = Math.floor(i / 10);
          const col = i % 10;
          ctx.fillStyle = col < 5 ? '#00e5ff' : '#ffd600';
          ctx.beginPath();
          ctx.arc(startX + col * 12 + (col >= 5 ? 4 : 0), 70 + row * 12, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    },

    drawShape4Scene(ctx, st) {
      ctx.save();
      ctx.translate(st.driveAnim, 0);

      window.RoboRenderer.roundRectPath(ctx, 20, 12, this.w - 40, this.h * 0.52, 20);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.fill();
      ctx.setLineDash([8, 6]);
      ctx.strokeStyle = 'rgba(128, 240, 255, 0.45)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);

      for (const sl of st.slots) {
        drawPrimitivePiece(ctx, sl.targetX, sl.targetY, sl.w, sl.h, sl.shape, 'rgba(255,255,255,0.14)', sl.color, true);
      }

      for (const p of st.pieces) {
        if (p.placed) {
          drawPrimitivePiece(ctx, p.x, p.y, p.w, p.h, p.shape, p.color, '#ffffff', false);
        }
      }
      ctx.restore();

      window.RoboRenderer.roundRectPath(ctx, 12, this.h * 0.64, this.w - 24, this.h * 0.32, 18);
      ctx.fillStyle = 'rgba(9, 18, 42, 0.78)';
      ctx.fill();

      // P2 #14: トレイ内の未選択ピースは 0.58 倍で重ならず表示し、ドラッグ中は 1.0 倍の原寸に拡大！
      for (const p of st.pieces) {
        if (!p.placed && !p.dragging) {
          const sc = p.trayScale || 0.58;
          drawPrimitivePiece(ctx, p.x, p.y, p.w * sc, p.h * sc, p.shape, p.color, '#ffffff', false);
        }
      }
      if (st.activePiece && !st.activePiece.placed) {
        const ap = st.activePiece;
        drawPrimitivePiece(ctx, ap.x, ap.y, ap.w, ap.h, ap.shape, ap.color, '#ffd600', false);
      }
    },

    drawGearScene(ctx, st) {
      for (const w of st.walls) {
        window.RoboRenderer.roundRectPath(ctx, w.x, w.y, w.w, w.h, 8);
        ctx.fillStyle = '#37474f';
        ctx.fill();
        ctx.strokeStyle = '#ff5252';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      for (const pin of st.pins) {
        ctx.beginPath();
        ctx.arc(pin.x, pin.y, 9, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
        ctx.fill();
        ctx.strokeStyle = '#80d8ff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      window.RoboRenderer.roundRectPath(ctx, 12, this.h - 102, this.w - 24, 92, 16);
      ctx.fillStyle = 'rgba(8, 16, 38, 0.82)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.stroke();

      for (const g of st.gears) {
        const fill = g.isMotor ? '#00e676' : g.isGoal ? (g.omega !== 0 ? '#ffd600' : '#ff4081') : (g.omega !== 0 ? '#00c8ff' : '#7e57c2');
        const stroke = g.omega !== 0 ? '#ffffff' : '#cfd8dc';
        window.RoboRenderer.drawGearShape(ctx, g.x, g.y, g.r, g.teeth, g.angle, fill, stroke);

        if (g.isMotor || g.isGoal) {
          ctx.fillStyle = '#ffffff';
          ctx.font = '900 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(g.isMotor ? '⚡モーター' : '🌟コア', g.x, g.y + g.r + 18);
        }
      }
    },

    /* P2 #15: 下部プログラミングパネルの実測 offsetHeight を使って盤面領域を計算（iPhone SE 375x667でも重なりゼロ！） */
    getGridMetrics(rows, cols, hasBottomPanel) {
      let bottomReserve = 20;
      if (hasBottomPanel && this.overlay) {
        const panel = this.overlay.querySelector('.interactive-panel');
        bottomReserve = panel ? (panel.offsetHeight + 22) : 185;
      }
      const availH = Math.max(120, this.h - bottomReserve - 8);
      const availW = this.w - 24;
      const cell = Math.max(24, Math.min(Math.floor(availW / cols), Math.floor(availH / rows), 66));
      const gridW = cell * cols;
      const gridH = cell * rows;
      const ox = (this.w - gridW) / 2;
      const oy = hasBottomPanel ? Math.max(6, (availH - gridH) / 2 + 4) : (this.h - gridH) / 2;
      return { cell, ox, oy, gridW, gridH, availH };
    },

    getGridCellCenter(rows, cols, r, c, hasBottomPanel) {
      const m = this.getGridMetrics(rows, cols, hasBottomPanel);
      return { x: m.ox + (c + 0.5) * m.cell, y: m.oy + (r + 0.5) * m.cell, cell: m.cell };
    },

    hitGridCell(rows, cols, x, y, hasBottomPanel) {
      const m = this.getGridMetrics(rows, cols, hasBottomPanel);
      const c = Math.floor((x - m.ox) / m.cell);
      const r = Math.floor((y - m.oy) / m.cell);
      if (r < 0 || r >= rows || c < 0 || c >= cols) return null;
      return { r, c };
    },

    drawMazeScene(ctx, st, isProg, t) {
      const map = st.map;
      const m = this.getGridMetrics(map.rows, map.cols, isProg);

      for (let r = 0; r < map.rows; r++) {
        for (let c = 0; c < map.cols; c++) {
          const x = m.ox + c * m.cell;
          const y = m.oy + r * m.cell;
          const tile = map.grid[r][c];
          const rockBroken = isProg && st.brokenRocks && st.brokenRocks.has(`${r},${c}`);

          window.RoboRenderer.roundRectPath(ctx, x + 2, y + 2, m.cell - 4, m.cell - 4, 9);
          ctx.fillStyle = tile === 1 ? '#263238' : 'rgba(25, 52, 104, 0.85)';
          ctx.fill();
          ctx.strokeStyle = tile === 1 ? '#455a64' : 'rgba(128, 216, 255, 0.3)';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.font = `${Math.round(m.cell * 0.50)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const cx = x + m.cell / 2;
          const cy = y + m.cell / 2;

          if (tile === 1) {
            ctx.fillText('🧱', cx, cy);
          } else if (tile === 2 && !rockBroken) {
            ctx.fillText('🪨', cx, cy);
          } else if (tile === 3) {
            ctx.fillText(st.keyCollected ? '🔓' : '🚪', cx, cy);
          }
        }
      }

      ctx.font = `${Math.round(m.cell * 0.54)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (map.key && !st.keyCollected) {
        const kp = this.getGridCellCenter(map.rows, map.cols, map.key.r, map.key.c, isProg);
        ctx.fillText('🔑', kp.x, kp.y + Math.sin(t * 4) * 3);
      }
      const gp = this.getGridCellCenter(map.rows, map.cols, map.goal.r, map.goal.c, isProg);
      ctx.fillText('🏁', gp.x, gp.y);

      if (!isProg && st.path.length > 1) {
        ctx.save();
        ctx.strokeStyle = '#ffd600';
        ctx.lineWidth = Math.max(6, m.cell * 0.19);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        st.path.forEach((p, idx) => {
          const pt = this.getGridCellCenter(map.rows, map.cols, p.r, p.c, false);
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
        ctx.restore();
      }

      const rPos = isProg ? st.rover : st.roverPos;
      const rp = this.getGridCellCenter(map.rows, map.cols, rPos.r, rPos.c, isProg);
      ctx.save();
      ctx.translate(rp.x, rp.y);
      if (isProg) {
        const rotAngles = [-Math.PI / 2, 0, Math.PI / 2, Math.PI];
        ctx.rotate(rotAngles[st.rover.dir]);
        ctx.fillStyle = '#00e5ff';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(m.cell * 0.34, 0);
        ctx.lineTo(-m.cell * 0.26, -m.cell * 0.26);
        ctx.lineTo(-m.cell * 0.16, 0);
        ctx.lineTo(-m.cell * 0.26, m.cell * 0.26);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.font = `${Math.round(m.cell * 0.58)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🦖', 0, 0);
      }
      ctx.restore();
    }
  };

  /* =========================================================================
   * 物理・図形・迷路ステージ定義（すべてレベル帯別に段階設計＆全マップ可解保証）
   * ========================================================================= */
  function drawSubitizingStars(ctx, count, radius) {
    const cols = Math.min(5, count);
    const rows = Math.ceil(count / 5);
    const gap = Math.min(18, (radius * 1.35) / Math.max(2, cols));
    let drawn = 0;
    for (let r = 0; r < rows; r++) {
      const inRow = Math.min(5, count - drawn);
      const startX = -((inRow - 1) * gap) / 2;
      const y = (r - (rows - 1) / 2) * (gap * 1.05);
      for (let c = 0; c < inRow; c++) {
        window.RoboRenderer.drawStarShape(ctx, startX + c * gap, y, 5, gap * 0.44, gap * 0.21, r === 0 ? '#ffd600' : '#69f0ae');
        drawn++;
      }
    }
  }

  function relaxCircles(nodes, w, h, topPad) {
    for (let iter = 0; iter < 30; iter++) {
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = b.x - a.x, dy = b.y - a.y;
          const dist = Math.hypot(dx, dy) || 1;
          const minD = a.r + b.r + 12;
          if (dist < minD) {
            const push = (minD - dist) * 0.5;
            a.x -= (dx / dist) * push;
            a.y -= (dy / dist) * push;
            b.x += (dx / dist) * push;
            b.y += (dy / dist) * push;
          }
        }
        nodes[i].x = Math.max(nodes[i].r + 12, Math.min(w - nodes[i].r - 12, nodes[i].x));
        nodes[i].y = Math.max(nodes[i].r + topPad, Math.min(h - nodes[i].r - 10, nodes[i].y));
      }
    }
  }

  function createNumberChainOrbs(target, w, areaH) {
    const p1 = 2 + Math.floor(Math.random() * (Math.floor(target / 2) - 1));
    const p2 = target - p1;
    const t1 = 2;
    const t2 = 3;
    const t3 = Math.max(1, target - t1 - t2);
    const extra1 = 1 + Math.floor(Math.random() * (target - 3));
    const extra2 = target - extra1;
    const vals = [p1, p2, t1, t2, t3, extra1, extra2];

    const orbs = vals.map((v, i) => ({
      val: v,
      x: 48 + ((i * 89) % Math.max(80, w - 96)),
      y: 72 + Math.floor(i / 3) * 68,
      vx: (Math.random() - 0.5) * 42,
      vy: (Math.random() - 0.5) * 42,
      r: 29
    }));
    relaxCircles(orbs, w, areaH, 52);
    return orbs;
  }

  function updateFloatingOrbs(orbs, w, areaH, dt) {
    for (const o of orbs) {
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      if (o.x < o.r + 12) { o.x = o.r + 12; o.vx = Math.abs(o.vx); }
      if (o.x > w - o.r - 12) { o.x = w - o.r - 12; o.vx = -Math.abs(o.vx); }
      if (o.y < o.r + 50) { o.y = o.r + 50; o.vy = Math.abs(o.vy); }
      if (o.y > areaH - o.r) { o.y = areaH - o.r; o.vy = -Math.abs(o.vy); }
    }
    for (let i = 0; i < orbs.length; i++) {
      for (let j = i + 1; j < orbs.length; j++) {
        const a = orbs[i], b = orbs[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 1;
        const minD = a.r + b.r + 6;
        if (d < minD) {
          const nx = dx / d, ny = dy / d;
          const overlap = (minD - d) * 0.5;
          a.x -= nx * overlap; a.y -= ny * overlap;
          b.x += nx * overlap; b.y += ny * overlap;
          a.vx -= nx * 18; a.vy -= ny * 18;
          b.vx += nx * 18; b.vy += ny * 18;
        }
      }
    }
  }

  function getBlueprints4() {
    return [
      // Lv1〜2向け（3パーツのやさしい構成）
      {
        name: 'スペースロケット',
        tier: 1,
        parts: [
          { shape: 'tri',    w: 64, h: 52, ox: 0, oy: -54, color: '#ff4081' },
          { shape: 'rect',   w: 62, h: 70, ox: 0, oy: 6,   color: '#eceff1' },
          { shape: 'trap',   w: 84, h: 32, ox: 0, oy: 56,  color: '#ffd600' }
        ]
      },
      {
        name: 'ユーフォー',
        tier: 1,
        parts: [
          { shape: 'semi',   w: 68, h: 42, ox: 0, oy: -24, color: '#80d8ff' },
          { shape: 'oval',   w: 118, h: 40, ox: 0, oy: 12, color: '#b388ff' },
          { shape: 'circle', w: 30, h: 30, ox: 0, oy: 42,  color: '#ffd600' }
        ]
      },
      // Lv3〜5向け（4パーツ構成）
      {
        name: 'しょうぼうしゃ',
        tier: 2,
        parts: [
          { shape: 'rect',   w: 106, h: 52, ox: -16, oy: 6,  color: '#ff1744' },
          { shape: 'semi',   w: 48,  h: 44, ox: 54,  oy: 10, color: '#ff5252' },
          { shape: 'circle', w: 36,  h: 36, ox: -36, oy: 44, color: '#ffd600' },
          { shape: 'circle', w: 36,  h: 36, ox: 42,  oy: 44, color: '#ffd600' }
        ]
      },
      {
        name: 'ティラノ・メカ',
        tier: 2,
        parts: [
          { shape: 'rect', w: 66, h: 44, ox: 34,  oy: -40, color: '#00e676' },
          { shape: 'oval', w: 86, h: 54, ox: -12, oy: 6,   color: '#00c853' },
          { shape: 'tri',  w: 52, h: 34, ox: -66, oy: 6,   color: '#ffd600' },
          { shape: 'trap', w: 42, h: 40, ox: 4,   oy: 48,  color: '#69f0ae' }
        ]
      },
      // Lv6〜8向け（5パーツ構成）
      {
        name: 'シンカンセン',
        tier: 3,
        parts: [
          { shape: 'semi',   w: 70,  h: 46, ox: 54,  oy: 8,   color: '#00e5ff' },
          { shape: 'rect',   w: 102, h: 46, ox: -28, oy: 8,   color: '#eceff1' },
          { shape: 'trap',   w: 44,  h: 22, ox: -24, oy: -26, color: '#ff4081' },
          { shape: 'circle', w: 34,  h: 34, ox: -48, oy: 42,  color: '#ffd600' },
          { shape: 'circle', w: 34,  h: 34, ox: 36,  oy: 42,  color: '#ffd600' }
        ]
      }
    ];
  }

  function pickBlueprintByLevel4(level, wave) {
    const all = getBlueprints4();
    const maxTier = level <= 2 ? 2 : 3;
    const pool = all.filter((b) => (level <= 2 ? b.tier <= 2 : level <= 5 ? b.tier >= 1 && b.tier <= maxTier : true));
    return pool[wave % pool.length];
  }

  function drawPrimitivePiece(ctx, cx, cy, w, h, shape, fill, stroke, dashed) {
    ctx.save();
    ctx.translate(cx, cy);
    if (dashed) ctx.setLineDash([6, 4]);
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 3;

    ctx.beginPath();
    if (shape === 'circle' || shape === 'oval') {
      ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
    } else if (shape === 'tri') {
      ctx.moveTo(0, -h / 2);
      ctx.lineTo(w / 2, h / 2);
      ctx.lineTo(-w / 2, h / 2);
      ctx.closePath();
    } else if (shape === 'trap') {
      ctx.moveTo(-w * 0.32, -h / 2);
      ctx.lineTo(w * 0.32, -h / 2);
      ctx.lineTo(w / 2, h / 2);
      ctx.lineTo(-w / 2, h / 2);
      ctx.closePath();
    } else if (shape === 'semi') {
      ctx.moveTo(-w / 2, -h / 2);
      ctx.quadraticCurveTo(w * 0.65, -h / 2, w / 2, h / 2);
      ctx.lineTo(-w / 2, h / 2);
      ctx.closePath();
    } else {
      window.RoboRenderer.roundRectPath(ctx, -w / 2, -h / 2, w, h, 10);
    }
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function pickGearStageIndex(level, wave) {
    if (level <= 2) return wave % 2;       // 入門2面（2個ギア直線・3個ギアL字）
    if (level <= 5) return (wave % 3) + 1; // 中級3面（壁回避・大中使い分け）
    return (wave % 4) + 1;                 // 上級含む全応用面
  }

  function buildGearPuzzle(w, h, variant) {
    const cx = w * 0.5;
    const cy = (h - 108) * 0.5;
    const trayY = h - 55;

    const layouts = [
      {
        // Stage 0 (入門): 中ギア(32)×2個を繋ぐシンプル回路
        // Motor(cx-65, cy-32, r=34) -> p1(cx+1, cy-32)[dist=66=34+32] -> p2(cx+1, cy+32)[dist=64=32+32] -> Goal(cx+67, cy+32)[dist=66=32+34]
        motor: { x: cx - 65, y: cy - 32, r: 34, teeth: 10 },
        goal:  { x: cx + 67, y: cy + 32, r: 34, teeth: 10 },
        pins: [
          { id: 'p1', x: cx + 1,  y: cy - 32 },
          { id: 'p2', x: cx + 1,  y: cy + 32 },
          { id: 'p3', x: cx - 65, y: cy + 38 }
        ],
        walls: [],
        trayGears: [
          { r: 32, teeth: 9 },
          { r: 32, teeth: 9 }
        ]
      },
      {
        // Stage 1: 上ルートは壁で行き止まり！下ルートに中ギア(32)×3個を繋ぐ回路
        motor: { x: cx - 98, y: cy - 32, r: 34, teeth: 10 },
        goal:  { x: cx + 98, y: cy + 32, r: 34, teeth: 10 },
        pins: [
          { id: 'p1', x: cx - 32, y: cy - 32 },
          { id: 'p2', x: cx + 32, y: cy - 32 },
          { id: 'p3', x: cx - 32, y: cy + 32 },
          { id: 'p4', x: cx + 32, y: cy + 32 }
        ],
        walls: [{ x: cx + 76, y: cy - 56, w: 36, h: 48 }],
        trayGears: [
          { r: 32, teeth: 9 },
          { r: 32, teeth: 9 },
          { r: 32, teeth: 9 }
        ]
      },
      {
        // Stage 2: 広い隙間は大ギア(42)、次は中ギア(32)を使い分ける回路
        motor: { x: cx - 76, y: cy - 42, r: 34, teeth: 10 },
        goal:  { x: cx + 66, y: cy + 32, r: 34, teeth: 10 },
        pins: [
          { id: 'p1', x: cx,      y: cy - 42 },
          { id: 'p2', x: cx,      y: cy + 32 },
          { id: 'p3', x: cx - 72, y: cy + 36 }
        ],
        walls: [{ x: cx - 98, y: cy + 12, w: 46, h: 44 }],
        trayGears: [
          { r: 42, teeth: 12 },
          { r: 32, teeth: 9 },
          { r: 24, teeth: 7 }
        ]
      },
      {
        // Stage 3: 狭い壁の下を小ギア(24)でくぐり抜け、中大ギア(38)へ繋ぐ精密回路
        motor: { x: cx - 94, y: cy - 20, r: 34, teeth: 10 },
        goal:  { x: cx + 26, y: cy + 52, r: 34, teeth: 10 },
        pins: [
          { id: 'p1', x: cx - 36, y: cy - 20 },
          { id: 'p2', x: cx + 26, y: cy - 20 },
          { id: 'p3', x: cx - 36, y: cy + 52 }
        ],
        walls: [{ x: cx - 64, y: cy - 76, w: 56, h: 28 }],
        trayGears: [
          { r: 24, teeth: 7 },
          { r: 38, teeth: 11 },
          { r: 42, teeth: 12 }
        ]
      },
      {
        // Stage 4 (上級): 大(42)→小(24)→中(32)の3段変速回路
        // Motor(cx-92, cy-38, r=34) -> p1(cx-16, cy-38)[76=34+42] -> p2(cx+50, cy-38)[66=42+24] -> p3(cx+50, cy+18)[56=24+32] -> Goal(cx-16, cy+18)[66=32+34]
        motor: { x: cx - 92, y: cy - 38, r: 34, teeth: 10 },
        goal:  { x: cx - 16, y: cy + 28, r: 34, teeth: 10 },
        pins: [
          { id: 'p1', x: cx - 16, y: cy - 38 },
          { id: 'p2', x: cx + 50, y: cy - 38 },
          { id: 'p3', x: cx + 50, y: cy + 28 }
        ],
        walls: [{ x: cx - 42, y: cy - 6, w: 52, h: 14 }],
        trayGears: [
          { r: 42, teeth: 12 },
          { r: 24, teeth: 7 },
          { r: 32, teeth: 9 }
        ]
      }
    ];
    // Stage 4 の p2->p3 距離検算: (-38) から (+18) は 56=24+32! Goal も y=cy+18 にして完全一致させる
    layouts[4].pins[2] = { id: 'p3', x: cx + 50, y: cy + 18 };
    layouts[4].goal = { x: cx - 16, y: cy + 18, r: 34, teeth: 10 };
    layouts[4].walls = [{ x: cx - 88, y: cy + 2, w: 36, h: 36 }];

    const spec = layouts[variant % layouts.length];
    const motorGear = { id: 'motor', x: spec.motor.x, y: spec.motor.y, r: spec.motor.r, teeth: spec.motor.teeth, fixed: true, isMotor: true, angle: 0, omega: 2.2 };
    const goalGear  = { id: 'goal',  x: spec.goal.x,  y: spec.goal.y,  r: spec.goal.r,  teeth: spec.goal.teeth,  fixed: true, isGoal: true,  angle: 0, omega: 0 };

    const spacing = (w - 60) / spec.trayGears.length;
    const movable = spec.trayGears.map((tg, i) => {
      const gx = 30 + spacing * (i + 0.5);
      return {
        id: `g${i}`,
        x: gx, y: trayY,
        homeX: gx, homeY: trayY,
        r: tg.r, teeth: tg.teeth,
        fixed: false,
        pinId: null,
        angle: 0,
        omega: 0
      };
    });

    return {
      gears: [motorGear, goalGear, ...movable],
      movable,
      motorGear,
      goalGear,
      pins: spec.pins,
      walls: spec.walls
    };
  }

  function recomputeGearNetwork(st) {
    for (const g of st.gears) {
      if (!g.isMotor) g.omega = 0;
    }
    const active = st.gears.filter((g) => g.fixed || g.pinId !== null);
    const queue = [st.motorGear];
    const visited = new Set([st.motorGear]);

    while (queue.length > 0) {
      const cur = queue.shift();
      for (const other of active) {
        if (visited.has(other)) continue;
        const dist = Math.hypot(other.x - cur.x, other.y - cur.y);
        const ideal = cur.r + other.r;
        if (Math.abs(dist - ideal) <= 10) {
          other.omega = -cur.omega * (cur.r / other.r);
          visited.add(other);
          queue.push(other);
        }
      }
    }
  }

  function circleIntersectsRect(cx, cy, r, rect) {
    const nearX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
    const nearY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
    return Math.hypot(cx - nearX, cy - nearY) < r;
  }

  function pickMaze4Index(level, wave) {
    if (level <= 2) return wave % 3;       // 0, 1, 2 (4x4 入門〜初級カギ)
    if (level <= 5) return (wave % 4) + 1; // 1, 2, 3, 4
    return (wave % 5) + 1;                 // 1〜5 (5x5 応用含む)
  }

  /* P0 #1: 全6マップが「一筆書き単純経路」でも確実にクリア可能な設計！ */
  function buildMazeMap4(variant) {
    const maps = [
      {
        // 0: 4x4 カギなし入門
        rows: 4, cols: 4, hasKey: false,
        start: { r: 0, c: 0 }, goal: { r: 3, c: 3 },
        grid: [
          [0, 0, 1, 0],
          [1, 0, 0, 0],
          [0, 1, 1, 0],
          [0, 0, 0, 0]
        ]
      },
      {
        // 1: 4x4 カギあり（経路: (0,0)->(0,1)->(0,2)🔑->(1,2)->(2,2)->(2,3)🚪->(3,3)🏁）
        rows: 4, cols: 4, hasKey: true,
        start: { r: 0, c: 0 }, key: { r: 0, c: 2 }, goal: { r: 3, c: 3 },
        grid: [
          [0, 0, 0, 0],
          [1, 1, 0, 1],
          [0, 0, 0, 3],
          [0, 1, 1, 0]
        ]
      },
      {
        // 2: 4x4 カギなし大回り
        rows: 4, cols: 4, hasKey: false,
        start: { r: 0, c: 0 }, goal: { r: 3, c: 0 },
        grid: [
          [0, 0, 0, 0],
          [1, 1, 1, 0],
          [0, 0, 0, 0],
          [0, 1, 1, 1]
        ]
      },
      {
        // 3: 5x5 カギあり（経路: (0,0)->(1,0)->(2,0)->(2,1)🔑->(2,2)->(2,3)->(2,4)🚪->(3,4)->(4,4)🏁）
        rows: 5, cols: 5, hasKey: true,
        start: { r: 0, c: 0 }, key: { r: 2, c: 1 }, goal: { r: 4, c: 4 },
        grid: [
          [0, 0, 1, 0, 0],
          [0, 1, 1, 0, 1],
          [0, 0, 0, 0, 3],
          [0, 1, 1, 1, 0],
          [0, 0, 0, 1, 0]
        ]
      },
      {
        // 4: 5x5 カギなし迷路
        rows: 5, cols: 5, hasKey: false,
        start: { r: 2, c: 0 }, goal: { r: 2, c: 4 },
        grid: [
          [0, 0, 0, 0, 0],
          [0, 1, 1, 1, 0],
          [0, 1, 0, 0, 0],
          [0, 1, 0, 1, 1],
          [0, 0, 0, 0, 0]
        ]
      },
      {
        // 5: 5x5 カギあり応用（経路: (0,2)->(0,1)->(0,0)->(1,0)->(2,0)🔑->(2,1)->(2,2)->(3,2)🚪->(4,2)🏁）
        rows: 5, cols: 5, hasKey: true,
        start: { r: 0, c: 2 }, key: { r: 2, c: 0 }, goal: { r: 4, c: 2 },
        grid: [
          [0, 0, 0, 1, 0],
          [0, 1, 1, 1, 0],
          [0, 0, 0, 0, 0],
          [1, 1, 3, 1, 1],
          [0, 0, 0, 0, 0]
        ]
      }
    ];
    return maps[variant % maps.length];
  }

  function pickProg7Index(level, wave) {
    if (level <= 2) return wave % 3;       // 0, 1, 2 (直進・1回転・1ドリル入門)
    if (level <= 5) return (wave % 4) + 1; // 1, 2, 3, 4 (ループ圧縮・中級)
    return (wave % 5) + 1;                 // 1〜5 (複合応用)
  }

  /* P0 #2: 全6マップがループなしでも11手以下（上限12以内）、ループ圧縮を使えば3〜8スロットでスマートに解ける！ */
  function buildProgMap7(variant) {
    // 0: 通路, 1: 壁🧱, 2: ドリルで壊せる岩🪨, dir: 0上 1右 2下 3左
    const maps = [
      {
        // 0: 直進3マス（⬆️×3 の 1スロットでも、⬆️⬆️⬆️ の 3スロットでもクリア！）
        rows: 4, cols: 4,
        start: { r: 2, c: 0, dir: 1 }, goal: { r: 2, c: 3 },
        grid: [
          [1, 1, 1, 1],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
          [1, 1, 1, 1]
        ]
      },
      {
        // 1: L字カーブ（⬆️×2 -> ↪️ -> ⬆️×2 = 3スロット！）
        rows: 4, cols: 4,
        start: { r: 0, c: 0, dir: 1 }, goal: { r: 2, c: 2 },
        grid: [
          [0, 0, 0, 1],
          [1, 1, 0, 1],
          [1, 0, 0, 0],
          [1, 1, 1, 1]
        ]
      },
      {
        // 2: ドリル入門（🔨 -> ⬆️×3 = 2スロット！）
        rows: 4, cols: 4,
        start: { r: 1, c: 0, dir: 1 }, goal: { r: 1, c: 3 },
        grid: [
          [1, 1, 1, 1],
          [0, 2, 0, 0],
          [1, 1, 1, 1],
          [1, 1, 1, 1]
        ]
      },
      {
        // 3: 階段ルート（⬆️×2 -> ↪️ -> ⬆️ -> ↩️ -> ⬆️ -> ↪️ -> ⬆️×2 = 7スロット / 展開9手）
        rows: 5, cols: 5,
        start: { r: 4, c: 0, dir: 0 }, goal: { r: 1, c: 3 },
        grid: [
          [1, 1, 1, 1, 1],
          [1, 0, 0, 0, 1],
          [0, 0, 1, 1, 1],
          [0, 1, 1, 1, 1],
          [0, 1, 1, 1, 1]
        ]
      },
      {
        // 4: ドリル＋S字ルート（⬆️×2 -> ↩️ -> 🔨 -> ⬆️×2 -> ↪️ -> ⬆️ -> ↩️ -> ⬆️×2 = 8スロット / 展開11手 <= 上限12！）
        rows: 5, cols: 5,
        start: { r: 0, c: 0, dir: 2 }, goal: { r: 3, c: 4 },
        grid: [
          [0, 1, 0, 0, 0],
          [0, 1, 0, 1, 0],
          [0, 2, 0, 1, 0],
          [1, 1, 0, 0, 0],
          [1, 1, 1, 1, 1]
        ]
      },
      {
        // 5: 上級ドリル突破（⬆️×2 -> ↩️ -> ⬆️×2 -> ↪️ -> 🔨 -> ⬆️×2 = 6スロット / 展開9手！）
        rows: 5, cols: 5,
        start: { r: 2, c: 0, dir: 1 }, goal: { r: 0, c: 4 },
        grid: [
          [1, 1, 0, 2, 0],
          [1, 1, 0, 1, 1],
          [0, 0, 0, 1, 1],
          [1, 1, 1, 1, 1],
          [1, 1, 1, 1, 1]
        ]
      }
    ];
    return maps[variant % maps.length];
  }

  window.SoloGames = SoloGames;
})();
