(function () {
  'use strict';

  /* =========================================================================
   * GarageManager: おとうとロボ／おにいちゃんロボ カスタム＆物理テスト＆ガチャ
   * ========================================================================= */
  const GarageManager = {
    active: false,
    slot: 0,
    category: 'head',
    canvas: null,
    ctx: null,
    w: 320,
    h: 240,
    rafId: null,
    lastTime: 0,
    particles: null,
    roboPhys: { yOffset: 0, vy: 0, jumping: false, pose: 'idle', poseTimer: 0, equipFlash: 0 },
    gachaRunning: false,
    gachaRafId: null,
    gachaRevealTimer: null,
    gachaParticles: null,
    pendingWonPart: null,

    init() {
      this.canvas = document.getElementById('garageCanvas');
      this.ctx = this.canvas.getContext('2d');
      this.particles = new window.RoboRenderer.ParticleSystem();

      document.getElementById('btnSlot0').addEventListener('click', () => this.selectSlot(0));
      document.getElementById('btnSlot1').addEventListener('click', () => this.selectSlot(1));

      document.querySelectorAll('#garageCatTabs .pcat-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          window.RoboAudio.tap();
          this.category = btn.getAttribute('data-cat');
          document.querySelectorAll('#garageCatTabs .pcat-btn').forEach((b) => b.classList.toggle('active', b === btn));
          this.renderPartsGrid();
        });
      });

      document.getElementById('btnGarageJump').addEventListener('click', () => this.doJump());
      document.getElementById('btnGarageBeam').addEventListener('click', () => this.doBeam());
      document.getElementById('btnSpinGacha').addEventListener('click', () => this.spinGacha());
      const eqBtn = document.getElementById('btnGachaEquipClose');
      if (eqBtn) eqBtn.addEventListener('click', () => this.finishGachaEquip());
      this.canvas.addEventListener('pointerdown', () => this.doJump());

      window.addEventListener('resize', () => {
        if (this.active) this.resize();
      });
    },

    open(defaultSlot) {
      if (!this.canvas) this.init();
      this.active = true;
      if (typeof defaultSlot === 'number') this.slot = defaultSlot;
      window.AdaptiveAI.state.activeRobotSlot = this.slot;

      this.resize();
      this.selectSlot(this.slot, true);
      window.RoboAudio.playBgm('garage');

      this.lastTime = performance.now();
      if (this.rafId) cancelAnimationFrame(this.rafId);
      const tick = (now) => {
        if (!this.active) return;
        if (!document.hidden) {
          const dt = Math.max(0, Math.min(0.05, (now - this.lastTime) / 1000));
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

    close() {
      this.active = false;
      this.gachaRunning = false;
      this.pendingWonPart = null;
      if (this.gachaRevealTimer) {
        clearTimeout(this.gachaRevealTimer);
        this.gachaRevealTimer = null;
      }
      if (this.gachaRafId) {
        cancelAnimationFrame(this.gachaRafId);
        this.gachaRafId = null;
      }
      const gm = document.getElementById('modal-gacha');
      if (gm) gm.classList.add('hidden');
      window.RoboVoice.stop();
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
    },

    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.w = Math.max(240, this.canvas.clientWidth || this.canvas.getBoundingClientRect().width);
      this.h = Math.max(160, this.canvas.clientHeight || this.canvas.getBoundingClientRect().height);
      this.canvas.width = Math.round(this.w * dpr);
      this.canvas.height = Math.round(this.h * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    },

    selectSlot(slotIdx, silent = false) {
      this.slot = slotIdx;
      window.AdaptiveAI.state.activeRobotSlot = slotIdx;
      window.AdaptiveAI.save();
      document.getElementById('btnSlot0').classList.toggle('active', slotIdx === 0);
      document.getElementById('btnSlot1').classList.toggle('active', slotIdx === 1);
      if (!silent) window.RoboAudio.tap();
      this.refreshHeader();
      this.renderPartsGrid();
    },

    refreshHeader() {
      const cfg = window.AdaptiveAI.state.robots[this.slot];
      const name = window.RoboRenderer.getRobotDisplayName(cfg);
      document.getElementById('garageRoboName').textContent = name;
      document.getElementById('garageStarsCount').textContent = String(window.AdaptiveAI.state.stars);

      const gachaBtn = document.getElementById('btnSpinGacha');
      const pool = window.AdaptiveAI.getLockedPartsPool();
      if (pool.length === 0) {
        gachaBtn.textContent = '👑 コンプリート！';
      } else {
        gachaBtn.textContent = `🎁 ガチャ (⭐5)`;
      }
    },

    renderPartsGrid() {
      const grid = document.getElementById('garagePartsGrid');
      const list = window.RoboParts[this.category] || [];
      const unlocked = window.AdaptiveAI.state.unlocked[this.category] || [];
      const currentCfg = window.AdaptiveAI.state.robots[this.slot];

      grid.innerHTML = '';
      list.forEach((part) => {
        const isOwned = unlocked.includes(part.id);
        const isSelected = currentCfg[this.category] === part.id;
        const btn = document.createElement('button');
        btn.className = 'part-item-btn' + (isSelected ? ' selected' : '') + (!isOwned ? ' locked' : '');
        btn.innerHTML = `
          <span class="part-emoji">${isOwned ? part.emoji : '🔒'}</span>
          <span>${isOwned ? part.name : '？？？'}</span>
        `;
        btn.addEventListener('click', () => {
          if (!isOwned) {
            window.RoboAudio.gentleHint();
            window.RoboVoice.speak('ガチャを まわすと ゲットできるよ！', { priority: 'ui', interrupt: true });
            return;
          }
          currentCfg[this.category] = part.id;
          window.AdaptiveAI.save();
          window.RoboAudio.snap();
          this.roboPhys.equipFlash = 1.0;
          this.particles.burst(this.w * 0.5, this.h * 0.55, '#00e5ff', 22, 220);
          this.refreshHeader();
          this.renderPartsGrid();
          window.RoboVoice.speak(`${part.name} そうちゃく！`, { priority: 'ui', interrupt: true });
        });
        grid.appendChild(btn);
      });
    },

    doJump() {
      if (!this.roboPhys.jumping) {
        this.roboPhys.vy = -310;
        this.roboPhys.jumping = true;
        this.roboPhys.pose = 'happy';
        this.roboPhys.poseTimer = 0.7;
        window.RoboAudio.jump();
        this.particles.burst(this.w * 0.5, this.h * 0.78, '#ffd600', 14, 150);
      }
    },

    doBeam() {
      this.roboPhys.pose = 'beam';
      this.roboPhys.poseTimer = 0.85;
      window.RoboAudio.laser();
      this.particles.burst(this.w * 0.5, this.h * 0.35, '#ff4081', 26, 250);
      this.particles.popText(this.w * 0.5, this.h * 0.25, 'ハイパービーム！！', '#ffd600');
      window.RoboVoice.speak('いくぞ！ハイパービーム！', { priority: 'ui', interrupt: true });
    },

    spinGacha() {
      if (this.gachaRunning) return;
      const pool = window.AdaptiveAI.getLockedPartsPool();
      if (pool.length === 0) {
        window.RoboAudio.stageClear();
        this.particles.confetti(this.w, this.h, 40);
        window.RoboVoice.speak('すべての パーツを コンプリートしているよ！すごすぎる！', { priority: 'ui', interrupt: true });
        return;
      }
      if (window.AdaptiveAI.state.stars < 5) {
        window.RoboAudio.gentleHint();
        window.RoboVoice.speak('スターが 5こ ひつようだよ！ゲームで スターを あつめよう！', { priority: 'ui', interrupt: true });
        this.particles.popText(this.w * 0.5, this.h * 0.4, '⭐あと ' + (5 - window.AdaptiveAI.state.stars) + 'こ！', '#ffd600');
        return;
      }

      window.AdaptiveAI.addStars(-5);
      const won = window.AdaptiveAI.unlockRandomPart();
      this.refreshHeader();
      this.renderPartsGrid();
      if (window.AppMain) window.AppMain.refreshHomeBadges();

      if (won) {
        this.openGachaShow(won);
      }
    },

    openGachaShow(won) {
      const modal = document.getElementById('modal-gacha');
      const titleEl = document.getElementById('gachaPhaseTitle');
      const revInfo = document.getElementById('gachaRevealInfo');
      const revCat = document.getElementById('gachaRevealCat');
      const revName = document.getElementById('gachaRevealName');
      const eqBtn = document.getElementById('btnGachaEquipClose');
      const sun = document.getElementById('gachaSunburst');
      const cv = document.getElementById('gachaFxCanvas');
      const ctx = cv ? cv.getContext('2d') : null;
      if (!modal || !cv || !ctx) {
        this.gachaRunning = false;
        this.pendingWonPart = won || null;
        if (won) this.finishGachaEquip();
        return;
      }

      if (this.gachaRafId) {
        cancelAnimationFrame(this.gachaRafId);
        this.gachaRafId = null;
      }
      if (this.gachaRevealTimer) {
        clearTimeout(this.gachaRevealTimer);
        this.gachaRevealTimer = null;
      }

      this.gachaRunning = true;
      this.pendingWonPart = won;
      this.gachaParticles = new window.RoboRenderer.ParticleSystem();

      const safeCall = (fn) => {
        try {
          fn();
        } catch (_) {}
      };

      const catLabels = {
        head: 'あたま パーツ',
        body: 'からだ パーツ',
        arm:  'うで パーツ',
        leg:  'あし パーツ',
        color:'スペシャル カラー'
      };
      if (revCat) revCat.textContent = `${won.part.emoji || '🎁'} ${catLabels[won.cat] || 'ニューパーツ'}`;
      if (revName) revName.textContent = won.part.name;
      if (revInfo) revInfo.classList.add('hidden');
      if (eqBtn) eqBtn.classList.add('hidden');
      if (sun) sun.classList.remove('burst-mode');
      if (titleEl) titleEl.textContent = '🎰 ガチャを まわしているよ！';

      modal.classList.remove('hidden');

      const logicalW = 320;
      const logicalH = 230;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(logicalW * dpr);
      cv.height = Math.round(logicalH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      safeCall(() => window.RoboAudio.gachaSpin());
      let phase = 0; // 0:まわす(0..1.25s) 1:なにがでるかな(1.25..2.55s) 2:ゲット単体表示(2.55s+)
      let revealed = false;
      let startMs = null;
      let lastMs = null;

      const renderRevealFrame = (tSec, elastic) => {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.globalAlpha = 1;
        ctx.clearRect(0, 0, logicalW, logicalH);
        try {
          window.RoboRenderer.drawPartPreview(
            ctx,
            logicalW * 0.5,
            logicalH * 0.52,
            1.02 * elastic,
            won.cat,
            won.part.id,
            tSec
          );
        } catch (_) {}
      };

      const enterRevealPhase = (nowSec) => {
        if (revealed) return;
        revealed = true;
        phase = 2;
        if (this.gachaRevealTimer) {
          clearTimeout(this.gachaRevealTimer);
          this.gachaRevealTimer = null;
        }
        if (titleEl) titleEl.textContent = '🎉 あたらしい パーツ ゲット！！ 🎉';
        if (sun) sun.classList.add('burst-mode');
        if (revInfo) revInfo.classList.remove('hidden');
        if (eqBtn) eqBtn.classList.remove('hidden');
        safeCall(() => window.RoboAudio.gachaReveal());
        this.gachaParticles.confetti(logicalW, logicalH, 55);
        this.gachaParticles.burst(logicalW * 0.5, logicalH * 0.5, '#ffd600', 36, 250);
        safeCall(() => window.RoboVoice.speak('やったー！あたらしい パーツを ゲットしたよ！', { priority: 'praise', interrupt: true }));
        renderRevealFrame(nowSec, 1);
      };

      // rAFが停止・スロットリングされた端末（バックグラウンド復帰等）でも確実にアイテムを表示するフェイルセーフ
      this.gachaRevealTimer = setTimeout(() => {
        if (this.gachaRunning && this.active && !revealed) {
          enterRevealPhase(performance.now() * 0.001);
        }
      }, 2700);

      const loop = (now) => {
        if (!this.gachaRunning || !this.active) {
          this.gachaRafId = null;
          return;
        }
        if (startMs === null) {
          startMs = now;
          lastMs = now;
        }
        const dt = Math.max(0, Math.min(0.05, (now - lastMs) / 1000));
        lastMs = now;
        const elapsed = Math.max(0, (now - startMs) / 1000);
        const t = now * 0.001;
        this.gachaParticles.update(dt);

        if (phase === 0 && elapsed >= 1.25) {
          phase = 1;
          if (titleEl) titleEl.textContent = '✨ なにが でるかな…！？ ✨';
          safeCall(() => window.RoboAudio.gachaSuspense());
          this.gachaParticles.burst(logicalW * 0.5, logicalH * 0.5, '#00e5ff', 22, 180);
        }
        if (phase < 2 && elapsed >= 2.55) {
          enterRevealPhase(t);
        }

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.globalAlpha = 1;
        ctx.clearRect(0, 0, logicalW, logicalH);

        try {
          if (phase === 0) {
            // フェーズ1：サイバーガチャマシンが回転＆カプセルが跳ねる演出
            const shakeX = Math.sin(t * 28) * 3;
            const shakeY = Math.cos(t * 22) * 2;
            ctx.save();
            ctx.translate(logicalW * 0.5 + shakeX, logicalH * 0.52 + shakeY);

            // ドーム外枠
            const domeG = ctx.createRadialGradient(-16, -24, 6, 0, -14, 72);
            domeG.addColorStop(0, 'rgba(180, 245, 255, 0.35)');
            domeG.addColorStop(0.7, 'rgba(0, 176, 255, 0.16)');
            domeG.addColorStop(1, 'rgba(0, 229, 255, 0.45)');
            ctx.fillStyle = domeG;
            ctx.beginPath();
            ctx.arc(0, -16, 66, 0, Math.PI * 2);
            ctx.fill();
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#80f0ff';
            ctx.stroke();

            // ドーム内で跳ねるカラフルカプセル
            const caps = [
              { x: -24, y: -22, c: '#ff4081', p: 0.2 },
              { x: 22,  y: -18, c: '#00e5ff', p: 1.5 },
              { x: -4,  y: -38, c: '#ffd600', p: 2.7 },
              { x: 18,  y: -40, c: '#00e676', p: 4.1 },
              { x: -20, y: 2,   c: '#b388ff', p: 5.3 }
            ];
            caps.forEach((cp) => {
              const bx = cp.x + Math.sin(t * 11 + cp.p) * 14;
              const by = cp.y + Math.cos(t * 14 + cp.p) * 12;
              ctx.beginPath();
              ctx.arc(bx, by, 13, 0, Math.PI * 2);
              ctx.fillStyle = cp.c;
              ctx.fill();
              ctx.lineWidth = 2;
              ctx.strokeStyle = '#ffffff';
              ctx.stroke();
              ctx.beginPath();
              ctx.arc(bx - 4, by - 4, 3.5, 0, Math.PI * 2);
              ctx.fillStyle = 'rgba(255,255,255,0.8)';
              ctx.fill();
            });

            // 下部ボディ＆回転クランクハンドル
            window.RoboRenderer.roundRectPath(ctx, -48, 36, 96, 48, 12);
            ctx.fillStyle = '#ff3d57';
            ctx.fill();
            ctx.lineWidth = 2.8;
            ctx.strokeStyle = '#ffd600';
            ctx.stroke();

            ctx.save();
            ctx.translate(0, 60);
            ctx.rotate(t * 10);
            ctx.fillStyle = '#ffd600';
            ctx.fillRect(-18, -5, 36, 10);
            ctx.beginPath();
            ctx.arc(0, 0, 10, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.restore();
            ctx.restore();
          } else if (phase === 1) {
            // フェーズ2：「なにがでるかな」巨大カプセル振動＋光の裂け目＋集中線
            const pT = (elapsed - 1.25) / 1.3;
            const vib = 3 + pT * 8;
            const cx = logicalW * 0.5 + Math.sin(t * 58) * vib;
            const cy = logicalH * 0.5 + Math.cos(t * 52) * (vib * 0.7);

            // 収束エネルギーリング
            for (let r = 0; r < 3; r++) {
              const rp = ((elapsed * 2.2 + r * 0.33) % 1);
              ctx.strokeStyle = r % 2 === 0 ? '#ffd600' : '#00e5ff';
              ctx.globalAlpha = rp * 0.8;
              ctx.lineWidth = 2.5;
              ctx.beginPath();
              ctx.arc(logicalW * 0.5, logicalH * 0.5, 110 * (1 - rp) + 18, 0, Math.PI * 2);
              ctx.stroke();
            }
            ctx.globalAlpha = 1;

            // 集中線
            ctx.strokeStyle = 'rgba(255, 214, 0, 0.45)';
            ctx.lineWidth = 2;
            for (let i = 0; i < 16; i++) {
              const ang = (i / 16) * Math.PI * 2 + t * 1.2;
              ctx.beginPath();
              ctx.moveTo(cx + Math.cos(ang) * 44, cy + Math.sin(ang) * 44);
              ctx.lineTo(cx + Math.cos(ang) * 145, cy + Math.sin(ang) * 145);
              ctx.stroke();
            }

            // 巨大カプセル（上：ゴールド、下：シアン、中央から発光）
            const capR = 46 + pT * 10;
            ctx.save();
            ctx.translate(cx, cy);
            ctx.beginPath();
            ctx.arc(0, -pT * 5, capR, Math.PI, 0);
            ctx.closePath();
            ctx.fillStyle = '#ffd600';
            ctx.fill();
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#ffffff';
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(0, pT * 5, capR, 0, Math.PI);
            ctx.closePath();
            ctx.fillStyle = '#00b0ff';
            ctx.fill();
            ctx.stroke();

            // 割れ目からのまぶしい光
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-capR, -3 - pT * 4, capR * 2, 6 + pT * 8);

            ctx.font = '900 32px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#091326';
            ctx.fillText('？', 0, -2);
            ctx.restore();
          } else {
            // フェーズ3：手に入ったパーツ1点だけを大きく表示！
            const revElapsed = Math.max(0, elapsed - 2.55);
            const popScale = Math.min(1, revElapsed / 0.28);
            const elastic = popScale < 1 ? 0.5 + popScale * 0.58 : 1;

            window.RoboRenderer.drawPartPreview(
              ctx,
              logicalW * 0.5,
              logicalH * 0.52,
              1.02 * elastic,
              won.cat,
              won.part.id,
              t
            );

            if (revElapsed < 0.35) {
              ctx.fillStyle = `rgba(255, 255, 255, ${(1 - revElapsed / 0.35) * 0.85})`;
              ctx.fillRect(0, 0, logicalW, logicalH);
            }
          }
        } catch (_) {}

        try {
          this.gachaParticles.draw(ctx);
        } catch (_) {}
        this.gachaRafId = requestAnimationFrame(loop);
      };
      this.gachaRafId = requestAnimationFrame(loop);
    },

    finishGachaEquip() {
      const won = this.pendingWonPart;
      this.gachaRunning = false;
      this.pendingWonPart = null;
      if (this.gachaRevealTimer) {
        clearTimeout(this.gachaRevealTimer);
        this.gachaRevealTimer = null;
      }
      if (this.gachaRafId) {
        cancelAnimationFrame(this.gachaRafId);
        this.gachaRafId = null;
      }
      const modal = document.getElementById('modal-gacha');
      if (modal) modal.classList.add('hidden');

      if (won) {
        this.category = won.cat;
        document.querySelectorAll('#garageCatTabs .pcat-btn').forEach((b) =>
          b.classList.toggle('active', b.getAttribute('data-cat') === won.cat)
        );
        window.AdaptiveAI.state.robots[this.slot][won.cat] = won.part.id;
        window.AdaptiveAI.save();
        this.roboPhys.equipFlash = 1.0;
        window.RoboAudio.snap();
        this.particles.confetti(this.w, this.h, 45);
        this.particles.popText(this.w * 0.5, this.h * 0.32, `NEW! ${won.part.name}`, '#ffd600');
        window.RoboVoice.speak(`${won.part.name} そうちゃく！`, { priority: 'ui', interrupt: true });
      }

      this.refreshHeader();
      this.renderPartsGrid();
      const selectedBtn = document.querySelector('#garagePartsGrid .part-item-btn.selected');
      if (selectedBtn && selectedBtn.scrollIntoView) {
        selectedBtn.scrollIntoView({ block: 'nearest' });
      }
      if (window.AppMain) window.AppMain.refreshHomeBadges();
    },

    update(dt) {
      this.particles.update(dt);
      const rp = this.roboPhys;
      if (rp.jumping || rp.yOffset < 0) {
        rp.yOffset += rp.vy * dt;
        rp.vy += 760 * dt;
        if (rp.yOffset >= 0) {
          rp.yOffset = 0;
          rp.vy = 0;
          rp.jumping = false;
        }
      }
      if (rp.poseTimer > 0) {
        rp.poseTimer -= dt;
        if (rp.poseTimer <= 0) rp.pose = 'idle';
      }
      if (rp.equipFlash > 0) {
        rp.equipFlash = Math.max(0, rp.equipFlash - dt * 2.4);
      }
    },

    draw(t) {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.w, this.h);

      // サイバー・ハンガードック台座（光柱＋回転テクニカルリング）
      ctx.save();
      const baseX = this.w * 0.5;
      const baseY = this.h * 0.82;
      const beamG = ctx.createLinearGradient(0, baseY - 170, 0, baseY);
      beamG.addColorStop(0, 'rgba(0, 229, 255, 0)');
      beamG.addColorStop(1, 'rgba(0, 229, 255, 0.14)');
      ctx.fillStyle = beamG;
      ctx.fillRect(baseX - 64, baseY - 170, 128, 170);

      const glowG = ctx.createRadialGradient(baseX, baseY, 6, baseX, baseY, 84);
      glowG.addColorStop(0, 'rgba(0, 229, 255, 0.34)');
      glowG.addColorStop(0.65, 'rgba(0, 180, 255, 0.12)');
      glowG.addColorStop(1, 'rgba(0, 229, 255, 0)');
      ctx.fillStyle = glowG;
      ctx.beginPath();
      ctx.ellipse(baseX, baseY, 84, 20, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(0, 229, 255, 0.58)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(baseX, baseY, 76, 17, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.save();
      ctx.translate(baseX, baseY);
      ctx.scale(1, 0.24);
      ctx.rotate(t * 0.9);
      ctx.strokeStyle = 'rgba(255, 214, 0, 0.65)';
      ctx.lineWidth = 6;
      ctx.setLineDash([28, 18]);
      ctx.beginPath();
      ctx.arc(0, 0, 62, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      ctx.restore();

      const cfg = window.AdaptiveAI.state.robots[this.slot];
      const sc = Math.min(0.86, this.h / 245);
      window.RoboRenderer.drawRobot(
        ctx,
        this.w * 0.5,
        this.h * 0.56 + this.roboPhys.yOffset,
        sc,
        cfg,
        { time: t, pose: this.roboPhys.pose, jumping: this.roboPhys.jumping, equipFlash: this.roboPhys.equipFlash }
      );
      this.particles.draw(ctx);
    }
  };

  /* =========================================================================
   * ZukanManager: 恐竜・宇宙・のりもの・科学のひみつ 全16ページ動く大図鑑
   * ========================================================================= */
  const ZUKAN_ITEMS = [
    // 🦖 きょうりゅう (6)
    {
      id: 'trex', cat: 'dino', catName: 'きょうりゅう', icon: '🦖',
      title: 'ティラノサウルス',
      sub: 'さいきょうの にくしょく きょうりゅう',
      desc: 'おおきな あご と するどい キバを もつ きょうりゅうの おうさま！かむ ちからは くるまを ぺちゃんこに できるほど つよかったんだよ。',
      fact: '💡 ひらめき まめちしき：バナナの ような ふとい はが やく60ほんも はえていて、おれても なんども はえかわったよ！',
      speechTitle: 'ティラノサウルス',
      speechDesc: 'おおきな あご と するどい キバを もつ きょうりゅうの 王さま！かむ ちからは くるまを ぺちゃんこに できるほど つよかったんだよ。',
      speechFact: '💡 ひらめき豆知識：バナナの ような 太い 歯が 約60本も はえていて、おれても なんども はえかわったよ！'
    },
    {
      id: 'tricera', cat: 'dino', catName: 'きょうりゅう', icon: '🛡️',
      title: 'トリケラトプス',
      sub: '3ぼんの ツノと おおきな フリル',
      desc: 'あたまに 3ぼんの ながい ツノと、たてのような おおきな えりかざり（フリル）を もつ やさしい そうしょく きょうりゅうだよ。',
      fact: '💡 ひらめき まめちしき：「トリケラトプス」という なまえは「3ぼんのツノがある かお」という いみなんだ！',
      speechTitle: 'トリケラトプス',
      speechDesc: 'あたまに 3本の ながい ツノと、たてのような おおきな えりかざり（フリル）を もつ やさしい 草食きょうりゅうだよ。',
      speechFact: '💡 ひらめき豆知識：「トリケラトプス」という なまえは「3本のツノがある顔」という いみなんだ！'
    },
    {
      id: 'ptera', cat: 'dino', catName: 'きょうりゅう', icon: '🦅',
      title: 'プテラノドン',
      sub: 'おおぞらを とぶ そらの よくりゅう',
      desc: 'つばさを ひろげると 7メートル いじょう！グライダーのように かぜに のって うみの うえを とび、さかなを つかまえていたよ。',
      fact: '💡 ひらめき まめちしき：じつは きょうりゅうの なかまではなく「よくりゅう」という そらとぶ はちゅうるいだよ！',
      speechTitle: 'プテラノドン',
      speechDesc: 'つばさを ひろげると 7メートル以上！グライダーのように 風に のって 海の うえを とび、さかなを つかまえていたよ。',
      speechFact: '💡 ひらめき豆知識：じつは きょうりゅうの なかまではなく「翼竜（よくりゅう）」という 空とぶ はちゅうるいだよ！'
    },
    {
      id: 'brachio', cat: 'dino', catName: 'きょうりゅう', icon: '🦕',
      title: 'ブラキオサウルス',
      sub: 'ビルの ように たかい ながい クビ',
      desc: 'マンションの 4かいだて くらい せが たかい ちょうきょだい きょうりゅう！たかい きの うえの はっぱを むしゃむしゃ たべていたよ。',
      fact: '💡 ひらめき まめちしき：あたままで ちを おくるために、とっても おおきくて パワフルな しんぞうを もっていたよ！',
      speechTitle: 'ブラキオサウルス',
      speechDesc: 'マンションの 4かいだて くらい 背が たかい 超巨大きょうりゅう！たかい 木の うえの はっぱを むしゃむしゃ たべていたよ。',
      speechFact: '💡 ひらめき豆知識：あたままで 血を おくるために、とっても おおきくて パワフルな 心臓を もっていたよ！'
    },
    {
      id: 'stego', cat: 'dino', catName: 'きょうりゅう', icon: '🌿',
      title: 'ステゴサウルス',
      sub: 'せなかの プレートと トゲの しっぽ',
      desc: 'せなかに おおきな ひしがたの プレートが ずらりと ならび、しっぽの さきには 4ほんの するどい スパイクが ついているよ。',
      fact: '💡 ひらめき まめちしき：せなかの プレートに たいようの ひかりを あてて、からだの おんどを ちょうせつしていたと いわれているよ！',
      speechTitle: 'ステゴサウルス',
      speechDesc: 'せなかに おおきな ひし形の プレートが ずらりと ならび、しっぽの さきには 4本の するどい スパイクが ついているよ。',
      speechFact: '💡 ひらめき豆知識：せなかの プレートに 太陽の 光を あてて、からだの 温度を ちょうせつしていたと いわれているよ！'
    },
    {
      id: 'spino', cat: 'dino', catName: 'きょうりゅう', icon: '🐊',
      title: 'スピノサウルス',
      sub: 'およぐのが とくいな みずべの ハンター',
      desc: 'せなかに ヨットの ほのような おおきな ヒレが ある きょうりゅう！かわや みずうみを すいすい およいで きょだいぎょを つかまえたよ。',
      fact: '💡 ひらめき まめちしき：ティラノサウルスよりも からだの ながさが ながく、ぜんちょう 15メートルほど あったよ！',
      speechTitle: 'スピノサウルス',
      speechDesc: 'せなかに ヨットの 帆のような おおきな ヒレが ある きょうりゅう！川や みずうみを すいすい およいで 巨大魚を つかまえたよ。',
      speechFact: '💡 ひらめき豆知識：ティラノサウルスよりも からだの 長さが ながく、全長15メートルほど あったよ！'
    },
    // 🚀 うちゅう・のりもの (5)
    {
      id: 'rocket', cat: 'space', catName: 'うちゅう・のりもの', icon: '🚀',
      title: 'スペースロケット',
      sub: 'ちきゅうの じゅうりょくを こえて うちゅうへ！',
      desc: 'ものすごい いきおいで ガスを ふきだして、そらの むこうの うちゅうまで とんでいく のりものだよ！',
      fact: '💡 ひらめき まめちしき：ちきゅうから うちゅうへ とびだすには、1びょうかんに やく8キロメートル（しんかんせんより ずっとはやい！）の スピードが いるよ！',
      speechTitle: 'スペースロケット',
      speechDesc: 'ものすごい いきおいで ガスを ふきだして、空の むこうの 宇宙まで とんでいく のりものだよ！',
      speechFact: '💡 ひらめき豆知識：地球から 宇宙へ とびだすには、1秒間に 約8キロメートル（新幹線より ずっと速い！）の スピードが いるよ！'
    },
    {
      id: 'blackhole', cat: 'space', catName: 'うちゅう・のりもの', icon: '🕳️',
      title: 'ブラックホール',
      sub: 'ひかりも にげられない ふしぎな てんたい',
      desc: 'とっても おおきな ほしが いっしょうの さいごに ぎゅーっと ちぢんで できた、とてつもない じゅうりょくを もつ うちゅうの うずまきだよ。',
      fact: '💡 ひらめき まめちしき：ブラックホールの すぐ ちかくでは、じかんの すすみかたが ゆっくりに なるんだ！',
      speechTitle: 'ブラックホール',
      speechDesc: 'とっても おおきな 星が 一生の さいごに ぎゅーっと ちぢんで できた、とてつもない 重力を もつ 宇宙の うずまきだよ。',
      speechFact: '💡 ひらめき豆知識：ブラックホールの すぐ ちかくでは、時間の すすみかたが ゆっくりに なるんだ！'
    },
    {
      id: 'solar', cat: 'space', catName: 'うちゅう・のりもの', icon: '🪐',
      title: 'たいようけいの わくせい',
      sub: 'たいようの まわりを まわる 8つの ほし',
      desc: 'わたしたちの ちきゅうや、わっかの ある どせい、おおきな もくせいなど 8つの わくせいが たいようの まわりを ぐるぐる まわっているよ。',
      fact: '💡 ひらめき まめちしき：たいように ちかいじゅんばんは「すい・きん・ち・か・もく・ど・てん・かい」と おぼえよう！',
      speechTitle: 'たいようけいの わくせい',
      speechDesc: 'わたしたちの 地球や、わっかの ある 土星、おおきな 木星など 8つの わくせいが 太陽の まわりを ぐるぐる まわっているよ。',
      speechFact: '💡 ひらめき豆知識：太陽に近いじゅんばんは「水・金・地・火・木・土・天・海（すいきんちかもくどってんかい）」と おぼえよう！'
    },
    {
      id: 'shinkansen', cat: 'space', catName: 'うちゅう・のりもの', icon: '🚄',
      title: 'シンカンセン（はやぶさ）',
      sub: 'かぜを きって はしる ちょうとっきゅう！',
      desc: 'ながーい くちばしのような せんとうデザインで、トンネルに はいったときの くうきの おとを ちいさくして はやく はしれるよ！',
      fact: '💡 ひらめき まめちしき：はやぶさごうの ながい はなは、とりの「カワセミ」の くちばしを ヒントに はつめいされたんだよ！',
      speechTitle: 'シンカンセン（新幹線）',
      speechDesc: 'ながーい くちばしのような 先頭デザインで、トンネルに はいったときの 空気の 音を ちいさくして 速く はしれるよ！',
      speechFact: '💡 ひらめき豆知識：はやぶさ号の 長い はなは、鳥の「カワセミ」の くちばしを ヒントに 発明されたんだよ！'
    },
    {
      id: 'firetruck', cat: 'space', catName: 'うちゅう・のりもの', icon: '🚒',
      title: 'はしご しょうぼうしゃ',
      sub: 'たかい ビルの かじも たすける！',
      desc: 'ぐんぐん のびる ながいはしごと きょうりょくな ポンプで、たかい ばしょの ひとを たすけたり みずを かけたりする ヒーローカー！',
      fact: '💡 ひらめき まめちしき：ながい はしごは ビルの 10かい〜15かい くらいの たかさ（30〜50メートル）まで とどくよ！',
      speechTitle: 'はしご しょうぼうしゃ',
      speechDesc: 'ぐんぐん のびる 長いはしごと 強力な ポンプで、たかい 場所の 人を たすけたり 水を かけたりする ヒーローカー！',
      speechFact: '💡 ひらめき豆知識：長い はしごは ビルの 10かい〜15かい くらいの 高さ（30〜50メートル）まで とどくよ！'
    },
    // ⚙️ かがくのひみつ (5)
    {
      id: 'gear', cat: 'mech', catName: 'かがくのひみつ', icon: '⚙️',
      title: 'はぐるま（ギア）の ひみつ',
      sub: 'スピードと パワーを へんしん！',
      desc: 'ギザギザの はが かみあうことで、まわる ちからを つたえる パーツだよ。とけいから ロボット、くるままで だいかつやく！',
      fact: '💡 ひらめき まめちしき：ちいさい ギアで おおきい ギアを まわすと、ゆっくりに なるかわりに ものすごい パワーが でるよ！',
      speechTitle: 'はぐるま（ギア）の ひみつ',
      speechDesc: 'ギザギザの 歯が かみあうことで、回る ちからを つたえる パーツだよ。時計から ロボット、くるままで 大かつやく！',
      speechFact: '💡 ひらめき豆知識：小さい ギアで 大きい ギアを まわすと、ゆっくりに なるかわりに ものすごい パワーが でるよ！'
    },
    {
      id: 'magnet', cat: 'mech', catName: 'かがくのひみつ', icon: '🧲',
      title: 'じしゃくの パワー',
      sub: 'Nきょく と Sきょく の ふしぎ',
      desc: 'てつを ピタッと くっつける ふしぎな いし！あかい Nきょくと あおい Sきょくは なかよく くっつき、おなじ きょくどうしは はなれようと するよ。',
      fact: '💡 ひらめき まめちしき：わたしたちが すむ「ちきゅう」そのものも、じつは きょだいな じしゃく なんだよ！だから コンパスが うごくんだね。',
      speechTitle: 'じしゃくの パワー',
      speechDesc: '鉄を ピタッと くっつける ふしぎな 石！あかい N極と あおい S極は なかよく くっつき、おなじ 極どうしは はなれようと するよ。',
      speechFact: '💡 ひらめき豆知識：わたしたちが すむ「地球」そのものも、じつは 巨大な じしゃく なんだよ！だから コンパスが 動くんだね。'
    },
    {
      id: 'elec', cat: 'mech', catName: 'かがくのひみつ', icon: '⚡',
      title: 'かみなりと でんき',
      sub: 'ピカッ！ゴロゴロ！そらの エネルギー',
      desc: 'くもの なかの こおりの つぶが ぶつかりあって でんきが たまり、いっきに じめんへ ながれるのが カミナリだよ！',
      fact: '💡 ひらめき まめちしき：ひかりの ほうが おとよりも ずっと はやいから、ピカッと ひかってから すこし おくれて ゴロゴロと きこえるよ！',
      speechTitle: 'かみなりと でんき',
      speechDesc: '雲の なかの 氷の つぶが ぶつかりあって でんきが たまり、いっきに 地面へ ながれるのが カミナリだよ！',
      speechFact: '💡 ひらめき豆知識：光の ほうが 音よりも ずっと 速いから、ピカッと 光ってから すこし おくれて ゴロゴロと 聞こえるよ！'
    },
    {
      id: 'rainbow', cat: 'mech', catName: 'かがくのひみつ', icon: '🌈',
      title: 'にじの ひかり',
      sub: 'あめあがりの そらに でる 7いろの アーチ',
      desc: 'たいようの しろい ひかりには、じつは いろんな いろの ひかりが かくれているよ。あまつぶに あたって はねかえると 7いろの にじに みえるんだ！',
      fact: '💡 ひらめき まめちしき：たいようを せなかに して あめあがりの そらを みると にじが みつかりやすいよ！',
      speechTitle: 'にじの ひかり',
      speechDesc: '太陽の 白い 光には、じつは いろんな 色の 光が かくれているよ。雨粒に あたって はねかえると 7色の にじに 見えるんだ！',
      speechFact: '💡 ひらめき豆知識：太陽を せなかに して 雨上がりの 空を 見ると にじが 見つかりやすいよ！'
    },
    {
      id: 'airobo', cat: 'mech', catName: 'かがくのひみつ', icon: '🤖',
      title: 'プログラムと AIロボット',
      sub: 'めいれいで かんがえ うごく ロボット',
      desc: 'ロボットは「まえに すすめ」「もし カベが あったら まがれ」という プログラムの めいれいで せいかくに うごくよ！',
      fact: '💡 ひらめき まめちしき：AI（じんこうちのう）は たくさんの けいけんから じぶんで べんきょうして かしこくなる プログラムだよ！',
      speechTitle: 'プログラムと AIロボット',
      speechDesc: 'ロボットは「まえに すすめ」「もし カベが あったら まがれ」という プログラムの めいれいで 正確に うごくよ！',
      speechFact: '💡 ひらめき豆知識：AI（人工知能）は たくさんの けいけんから 自分で べんきょうして かしこくなる プログラムだよ！'
    }
  ];

  const ZUKAN_IMG_MAP = {
    trex: 'img/zukan_trex.webp',
    tricera: 'img/zukan_tricera.webp',
    ptera: 'img/zukan_ptera.webp',
    rocket: 'img/zukan_rocket.webp',
    blackhole: 'img/zukan_blackhole.webp',
    gear: 'img/zukan_gear.webp',
    magnet: 'img/zukan_magnet.webp'
  };

  const ZukanManager = {
    currentCat: 'all',
    detailItem: null,
    detailRaf: null,
    tapBoost: 0,

    init() {
      document.querySelectorAll('.zcat-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          window.RoboAudio.tap();
          this.currentCat = btn.getAttribute('data-zcat');
          document.querySelectorAll('.zcat-btn').forEach((b) => b.classList.toggle('active', b === btn));
          this.renderGrid();
        });
      });

      const mediaWrap = document.getElementById('zdMediaWrap');
      if (mediaWrap) {
        mediaWrap.addEventListener('click', () => {
          if (!this.detailItem) return;
          this.tapBoost = 1.0;
          window.RoboAudio.pop(6);
          const it = this.detailItem;
          const img = document.getElementById('zukanDetailImg');
          if (img && !img.classList.contains('hidden')) {
            img.style.transition = 'transform 0.25s cubic-bezier(0.2, 1.6, 0.4, 1)';
            img.style.transform = 'scale(1.07)';
            setTimeout(() => { if (img) img.style.transform = 'scale(1)'; }, 260);
          }
          window.RoboVoice.speak(it.speechFact || it.fact, { priority: 'ui', interrupt: true, force: true });
        });
      }

      document.getElementById('btnZdSpeak').addEventListener('click', () => {
        if (this.detailItem) {
          const it = this.detailItem;
          const tTitle = it.speechTitle || it.title;
          const tDesc = it.speechDesc || it.desc;
          const tFact = it.speechFact || it.fact;
          Promise.resolve(
            window.RoboVoice.speak(`${tTitle}。${tDesc}`, { priority: 'praise', interrupt: true, force: true })
          ).then((ok) => {
            if (ok && this.detailItem === it) {
              window.RoboVoice.speak(tFact, { priority: 'prompt', interrupt: false, force: true });
            }
          });
        }
      });

      document.getElementById('btnZdClose').addEventListener('click', () => {
        this.closeDetail();
      });
    },

    open() {
      window.RoboAudio.playBgm('standby');
      this.renderGrid();
    },

    renderGrid() {
      const grid = document.getElementById('zukanGrid');
      const items = this.currentCat === 'all'
        ? ZUKAN_ITEMS
        : ZUKAN_ITEMS.filter((it) => it.cat === this.currentCat);

      document.getElementById('zukanCountLabel').textContent = String(items.length);
      grid.innerHTML = '';

      items.forEach((item) => {
        const card = document.createElement('button');
        card.className = 'zukan-card';
        const imgPath = ZUKAN_IMG_MAP[item.id];
        const mediaHtml = imgPath
          ? `<div class="zukan-thumb-wrap"><img class="zukan-thumb-img" src="${imgPath}" alt="${item.title}"></div>`
          : `<div class="zukan-thumb-wrap"><canvas class="zukan-thumb-canvas" width="210" height="140"></canvas></div>`;

        card.innerHTML = `
          ${mediaHtml}
          <div class="zukan-card-title">${item.icon} ${item.title}</div>
          <div class="zukan-card-sub">${item.sub}</div>
        `;
        if (!imgPath) {
          const tcv = card.querySelector('.zukan-thumb-canvas');
          if (tcv) {
            drawZukanCanvasArt(tcv.getContext('2d'), tcv.width, tcv.height, item, 0.7, 0);
          }
        }
        card.addEventListener('click', () => this.openDetail(item));
        grid.appendChild(card);
      });
    },

    openDetail(item) {
      this.detailItem = item;
      this.tapBoost = 0;
      window.RoboAudio.snap();
      document.getElementById('zdCategoryTag').textContent = item.catName;
      document.getElementById('zdTitle').textContent = item.title;
      document.getElementById('zdDescription').textContent = item.desc;
      document.getElementById('zdFunFact').textContent = item.fact;
      document.getElementById('modal-zukan-detail').classList.remove('hidden');

      window.RoboVoice.speak(`${item.speechTitle || item.title}。${item.speechDesc || item.desc}`, { priority: 'praise', interrupt: true });

      const cv = document.getElementById('zukanDetailCanvas');
      const img = document.getElementById('zukanDetailImg');
      const hint = document.getElementById('zdTapHint');
      const imgPath = ZUKAN_IMG_MAP[item.id];

      if (this.detailRaf) {
        cancelAnimationFrame(this.detailRaf);
        this.detailRaf = null;
      }

      if (imgPath && img) {
        img.src = imgPath;
        img.style.transform = 'scale(1)';
        img.classList.remove('hidden');
        cv.classList.add('hidden');
        if (hint) hint.textContent = '👆 えを タッチすると まめちしきを よむよ！';
        return;
      }

      if (img) img.classList.add('hidden');
      cv.classList.remove('hidden');
      if (hint) hint.textContent = '👆 えを タッチすると ジャンプ＆パワーアップ！';
      const ctx = cv.getContext('2d');
      let lastMs = performance.now();

      const renderAnim = (now) => {
        if (!this.detailItem) return;
        const dt = Math.max(0, Math.min(0.05, (now - lastMs) / 1000));
        lastMs = now;
        if (!document.hidden) {
          this.tapBoost = Math.max(0, this.tapBoost - dt * 2.2);
          drawZukanCanvasArt(ctx, cv.width, cv.height, item, now * 0.001, this.tapBoost);
        }
        this.detailRaf = requestAnimationFrame(renderAnim);
      };
      this.detailRaf = requestAnimationFrame(renderAnim);
    },

    closeDetail() {
      window.RoboAudio.tap();
      window.RoboVoice.stop();
      this.detailItem = null;
      if (this.detailRaf) {
        cancelAnimationFrame(this.detailRaf);
        this.detailRaf = null;
      }
      document.getElementById('modal-zukan-detail').classList.add('hidden');
    }
  };

  function drawZukanCanvasArt(ctx, w, h, item, t, tapBoost = 0) {
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h / 2;
    const sc = Math.min(w / 280, h / 190) * (1 + tapBoost * 0.14);

    ctx.save();
    ctx.translate(cx, cy - tapBoost * 10);
    ctx.scale(sc, sc);

    if (item.id === 'brachio') {
      // 夕暮れの草原と高い木＋長い首のブラキオサウルス
      const sky = ctx.createLinearGradient(0, -95, 0, 95);
      sky.addColorStop(0, '#1a237e');
      sky.addColorStop(0.6, '#ff8a65');
      sky.addColorStop(1, '#2e7d32');
      ctx.fillStyle = sky;
      ctx.fillRect(-140, -95, 280, 190);
      // 木
      ctx.fillStyle = '#5d4037';
      ctx.fillRect(62, -45, 16, 120);
      ctx.fillStyle = '#4caf50';
      ctx.beginPath(); ctx.arc(70, -52, 34, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(46, -42, 24, 0, Math.PI * 2); ctx.fill();
      // 恐竜ボディと長い首
      const chew = Math.sin(t * 4) * 5;
      ctx.fillStyle = '#26a69a';
      ctx.beginPath(); ctx.ellipse(-28, 38, 42, 24, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(-52, 52, 12, 30);
      ctx.fillRect(-20, 52, 12, 30);
      ctx.strokeStyle = '#26a69a';
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-6, 26);
      ctx.quadraticCurveTo(10, -20, 26, -46 + chew);
      ctx.stroke();
      // しっぽ
      ctx.lineWidth = 10;
      ctx.beginPath(); ctx.moveTo(-66, 38); ctx.quadraticCurveTo(-108, 46, -124, 30); ctx.stroke();
      // 頭
      ctx.beginPath(); ctx.ellipse(32, -48 + chew, 14, 9, 0, 0, Math.PI * 2); ctx.fillStyle = '#4db6ac'; ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(36, -50 + chew, 3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      return;
    }

    if (item.id === 'stego') {
      // 太陽の光を浴びてプレートが光るステゴサウルス
      ctx.fillStyle = '#ffb300';
      ctx.beginPath(); ctx.arc(-95, -62, 20 + Math.sin(t * 3) * 2, 0, Math.PI * 2); ctx.fill();
      // しっぽスパイク
      ctx.strokeStyle = '#ffd600';
      ctx.lineWidth = 4;
      [[-98, 22, -116, 4], [-104, 32, -122, 18]].forEach(([x1, y1, x2, y2]) => {
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      });
      // 背中プレート（ひし形）
      [-40, -14, 14, 40].forEach((px, i) => {
        ctx.fillStyle = i % 2 === 0 ? '#ff7043' : '#ffd54f';
        ctx.beginPath();
        ctx.moveTo(px, -44 + Math.abs(px) * 0.25);
        ctx.lineTo(px + 11, -18 + Math.abs(px) * 0.2);
        ctx.lineTo(px, 2);
        ctx.lineTo(px - 11, -18 + Math.abs(px) * 0.2);
        ctx.closePath();
        ctx.fill();
      });
      // 胴体・脚・頭
      ctx.fillStyle = '#66bb6a';
      ctx.beginPath(); ctx.ellipse(0, 20, 58, 28, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-48, 20); ctx.lineTo(-104, 30); ctx.lineTo(-50, 34); ctx.fill();
      ctx.fillRect(-38, 40, 14, 30); ctx.fillRect(24, 40, 14, 30);
      ctx.beginPath(); ctx.ellipse(68, 26, 18, 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(74, 24, 2.8, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      return;
    }

    if (item.id === 'spino') {
      // 水辺＋大きな帆びれのスピノサウルス
      ctx.fillStyle = '#0277bd';
      ctx.fillRect(-140, 34, 280, 65);
      // 背中の巨大な半円ヒレ
      const swimY = Math.sin(t * 3) * 4;
      ctx.fillStyle = '#ff5722';
      ctx.beginPath();
      ctx.arc(-6, 12 + swimY, 54, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = '#ffd54f';
      ctx.lineWidth = 3;
      [-28, -10, 8, 26].forEach((rx) => {
        ctx.beginPath(); ctx.moveTo(rx, 10 + swimY); ctx.lineTo(rx * 1.1, -32 + Math.abs(rx) * 0.5 + swimY); ctx.stroke();
      });
      ctx.fillStyle = '#00bfa5';
      ctx.beginPath(); ctx.ellipse(-4, 20 + swimY, 64, 20, 0, 0, Math.PI * 2); ctx.fill();
      // 長いワニのような口
      ctx.beginPath(); ctx.ellipse(72, 12 + swimY, 30, 10, -0.1, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(64, 8 + swimY, 3, 0, Math.PI * 2); ctx.fill();
      // 跳ねる魚
      const fy = 26 - Math.abs(Math.sin(t * 4.5)) * 34;
      ctx.fillStyle = '#80d8ff';
      ctx.beginPath(); ctx.ellipse(104, fy, 10, 5, -0.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      return;
    }

    if (item.id === 'solar') {
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, Math.PI * 2);
      ctx.fillStyle = '#ffd600';
      ctx.fill();
      [38, 60, 84].forEach((orbR, idx) => {
        ctx.strokeStyle = 'rgba(255,255,255,0.28)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, orbR, 0, Math.PI * 2);
        ctx.stroke();
        const a = t * (1.8 - idx * 0.45) + idx * 2;
        const px = Math.cos(a) * orbR;
        const py = Math.sin(a) * orbR;
        ctx.beginPath();
        ctx.arc(px, py, 7 + idx * 2.2, 0, Math.PI * 2);
        ctx.fillStyle = ['#00e5ff', '#ff5252', '#ffab40'][idx];
        ctx.fill();
        if (idx === 2) {
          ctx.strokeStyle = '#ffe082';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.ellipse(px, py, 20, 6, -0.4, 0, Math.PI * 2);
          ctx.stroke();
        }
      });
      ctx.restore();
      return;
    }

    if (item.id === 'shinkansen') {
      // 富士山＋流線形新幹線
      ctx.fillStyle = '#283593';
      ctx.beginPath(); ctx.moveTo(-60, 42); ctx.lineTo(-10, -48); ctx.lineTo(40, 42); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.moveTo(-28, -16); ctx.lineTo(-10, -48); ctx.lineTo(8, -16); ctx.closePath(); ctx.fill();
      // 線路と新幹線
      ctx.fillStyle = '#455a64'; ctx.fillRect(-140, 44, 280, 12);
      const sx = ((t * 140) % 240) - 120;
      ctx.save();
      ctx.translate(sx * 0.3, 24);
      ctx.fillStyle = '#00e5ff';
      ctx.beginPath();
      ctx.moveTo(-95, 16); ctx.lineTo(-95, -14); ctx.lineTo(30, -14);
      ctx.quadraticCurveTo(95, -8, 108, 16);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ff4081'; ctx.fillRect(-95, 2, 185, 5);
      ctx.fillStyle = '#eceff1'; ctx.fillRect(-80, -8, 92, 8);
      ctx.restore();
      ctx.restore();
      return;
    }

    if (item.id === 'firetruck') {
      // 消防車＋伸びるはしご＋赤色灯
      const ext = 24 + Math.sin(t * 2.5) * 14;
      ctx.strokeStyle = '#cfd8dc'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(-26, 8); ctx.lineTo(40 + ext, -48 - ext * 0.4); ctx.stroke();
      ctx.fillStyle = '#ff1744';
      window.RoboRenderer.roundRectPath(ctx, -78, 4, 128, 46, 10); ctx.fill();
      ctx.fillStyle = '#80d8ff'; ctx.fillRect(14, 12, 28, 18);
      // 回転灯
      ctx.fillStyle = Math.sin(t * 14) > 0 ? '#ffd600' : '#ff5252';
      ctx.beginPath(); ctx.arc(22, -2, 8, 0, Math.PI * 2); ctx.fill();
      // タイヤ
      ctx.fillStyle = '#263238';
      ctx.beginPath(); ctx.arc(-48, 54, 14, 0, Math.PI * 2); ctx.arc(24, 54, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffd600';
      ctx.beginPath(); ctx.arc(-48, 54, 6, 0, Math.PI * 2); ctx.arc(24, 54, 6, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      return;
    }

    if (item.id === 'elec') {
      // 雷雲＋稲妻スパーク
      ctx.fillStyle = '#37474f';
      [[-36, -42, 28], [0, -52, 34], [38, -40, 26]].forEach(([cxp, cyp, r]) => {
        ctx.beginPath(); ctx.arc(cxp, cyp, r, 0, Math.PI * 2); ctx.fill();
      });
      const flash = (Math.sin(t * 9) > 0.2 || tapBoost > 0.1) ? 1 : 0.45;
      ctx.strokeStyle = `rgba(255, 234, 0, ${flash})`;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(-6, -24); ctx.lineTo(-22, 10); ctx.lineTo(4, 12); ctx.lineTo(-14, 66);
      ctx.stroke();
      ctx.strokeStyle = `rgba(0, 229, 255, ${flash})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(22, -20); ctx.lineTo(10, 6); ctx.lineTo(30, 10); ctx.lineTo(14, 52);
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (item.id === 'rainbow') {
      const cols = ['#ff1744', '#ff9100', '#ffd600', '#00e676', '#00b0ff', '#3f51b5', '#ab47bc'];
      cols.forEach((col, i) => {
        ctx.strokeStyle = col;
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.arc(0, 62, 104 - i * 7.5, Math.PI, 0);
        ctx.stroke();
      });
      ctx.restore();
      return;
    }

    if (item.id === 'airobo') {
      const cfg = (window.AdaptiveAI && window.AdaptiveAI.getCurrentRobot)
        ? window.AdaptiveAI.getCurrentRobot('7')
        : { head: 'astro', body: 'core', arm: 'laser', leg: 'jet', color: 'cyan' };
      window.RoboRenderer.drawRobot(ctx, 0, 10, 0.72, cfg, { time: t, pose: tapBoost > 0.1 ? 'beam' : 'happy' });
      ctx.restore();
      return;
    }

    if (item.id === 'gear') {
      window.RoboRenderer.drawGearShape(ctx, -34, 0, 34, 10, t * 1.6, '#00e5ff', '#ffffff');
      window.RoboRenderer.drawGearShape(ctx, 34, 0, 26, 8, -t * 1.6 * (34 / 26), '#ffd600', '#ffffff');
      ctx.restore();
      return;
    }

    // 共通フォールバック
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.35)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 64 + Math.sin(t * 3) * 5, 0, Math.PI * 2);
    ctx.stroke();

    ctx.font = '76px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.icon, Math.sin(t * 2.5) * 8, Math.cos(t * 3.2) * 5);
    ctx.restore();
  }

  window.GarageManager = GarageManager;
  window.ZukanManager = ZukanManager;
})();
