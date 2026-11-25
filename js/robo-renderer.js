(function () {
  'use strict';

  /* =========================================================================
   * RoboParts: カスタム合体ロボの全24パーツ＆8カラー定義
   * ========================================================================= */
  const RoboParts = {
    head: [
      { id: 'astro',      name: 'アストロバイザー', emoji: '🤖', starter: true,  prefix: 'アストロ' },
      { id: 'tyranno',    name: 'ティラノヘッド',   emoji: '🦖', starter: true,  prefix: 'ティラノ' },
      { id: 'tricera',    name: 'トリケラホーン',   emoji: '🛡️', starter: false, prefix: 'トリケラ' },
      { id: 'rescue',     name: 'レスキューサイレン', emoji: '🚒', starter: false, prefix: 'ファイヤー' },
      { id: 'shinkansen', name: 'はやぶさノーズ',   emoji: '🚄', starter: false, prefix: 'シンカンセン' },
      { id: 'king',       name: 'ギャラクシークラウン', emoji: '👑', starter: false, prefix: 'カイザー' }
    ],
    body: [
      { id: 'core',   name: 'スターコア',       emoji: '⚡', starter: true,  suffix: 'ロボ' },
      { id: 'dino',   name: 'ダイナソーブレスト', emoji: '🔥', starter: true,  suffix: 'レックス' },
      { id: 'rocket', name: 'アポロブースター', emoji: '🚀', starter: false, suffix: 'ボイジャー' },
      { id: 'fire',   name: 'レスキューポンプ', emoji: '🚒', starter: false, suffix: 'セイバー' },
      { id: 'train',  name: 'エクスプレスボディ', emoji: '🚄', starter: false, suffix: 'ライナー' },
      { id: 'cosmic', name: 'コスモアーマー',   emoji: '🌌', starter: false, suffix: 'オービター' }
    ],
    arm: [
      { id: 'punch',  name: 'ロケットナックル', emoji: '✊', starter: true },
      { id: 'claw',   name: 'ダイナソークロー', emoji: '🦖', starter: true },
      { id: 'drill',  name: 'メガドリル',       emoji: '🌀', starter: false },
      { id: 'laser',  name: 'プラズマキャノン', emoji: '🔫', starter: false },
      { id: 'shield', name: 'イージスガード',   emoji: '🛡️', starter: false },
      { id: 'crane',  name: 'パワークレーン',   emoji: '🏗️', starter: false }
    ],
    leg: [
      { id: 'jet',   name: 'ジェットレッグ',   emoji: '🔥', starter: true },
      { id: 'dino',  name: 'ティラノレッグ',   emoji: '🦖', starter: true },
      { id: 'tank',  name: 'パワーキャタピラ', emoji: '🚜', starter: false },
      { id: 'wheel', name: 'ターボホイール',   emoji: '🏎️', starter: false },
      { id: 'frog',  name: 'ハイパージャンパー', emoji: '🐸', starter: false },
      { id: 'star',  name: 'メテオグライダー', emoji: '🌟', starter: false }
    ],
    color: [
      { id: 'cyan',   name: 'スカイブルー',   emoji: '💎', starter: true,  main: '#00c8ff', sub: '#1565c0', dark: '#0a2e5c', glow: '#80f0ff' },
      { id: 'red',    name: 'ファイヤーレッド', emoji: '🔥', starter: true,  main: '#ff3d57', sub: '#c62828', dark: '#5c0a18', glow: '#ff9e80' },
      { id: 'gold',   name: 'サンダーゴールド', emoji: '⚡', starter: true,  main: '#ffd600', sub: '#ff8f00', dark: '#5c3800', glow: '#ffff8d' },
      { id: 'green',  name: 'ダイノグリーン', emoji: '🦖', starter: false, main: '#00e676', sub: '#2e7d32', dark: '#0b3d1b', glow: '#b9f6ca' },
      { id: 'purple', name: 'コスモパープル', emoji: '🌌', starter: false, main: '#b388ff', sub: '#6a1b9a', dark: '#2c0947', glow: '#ea80fc' },
      { id: 'orange', name: 'マグマオレンジ', emoji: '☄️', starter: false, main: '#ff9100', sub: '#e65100', dark: '#541d00', glow: '#ffd180' },
      { id: 'white',  name: 'ホワイトナイト', emoji: '✨', starter: false, main: '#eceff1', sub: '#607d8b', dark: '#263238', glow: '#84ffff' },
      { id: 'black',  name: 'ステルスブラック', emoji: '🌑', starter: false, main: '#37474f', sub: '#ff4081', dark: '#10181d', glow: '#ff80ab' }
    ]
  };

  function getPalette(colorId) {
    return RoboParts.color.find((c) => c.id === colorId) || RoboParts.color[0];
  }

  function getRobotDisplayName(cfg) {
    const h = RoboParts.head.find((p) => p.id === cfg.head) || RoboParts.head[0];
    const b = RoboParts.body.find((p) => p.id === cfg.body) || RoboParts.body[0];
    return `${h.prefix}・${b.suffix}`;
  }

  /* =========================================================================
   * ベクター描画ヘルパー
   * ========================================================================= */
  function roundRectPath(ctx, x, y, w, h, r) {
    const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function drawStarShape(ctx, cx, cy, spikes, outerR, innerR, color) {
    ctx.save();
    ctx.beginPath();
    let rot = -Math.PI / 2;
    const step = Math.PI / spikes;
    ctx.moveTo(cx, cy - outerR);
    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
      rot += step;
      ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
      rot += step;
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  function drawGearShape(ctx, cx, cy, radius, teeth, angle, fill, stroke) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    const outer = radius + 7;
    const inner = radius - 4;
    ctx.beginPath();
    for (let i = 0; i < teeth; i++) {
      const a0 = (i / teeth) * Math.PI * 2;
      const a1 = a0 + (0.22 / teeth) * Math.PI * 2;
      const a2 = a0 + (0.5 / teeth) * Math.PI * 2;
      const a3 = a0 + (0.72 / teeth) * Math.PI * 2;
      if (i === 0) ctx.moveTo(Math.cos(a0) * inner, Math.sin(a0) * inner);
      else ctx.lineTo(Math.cos(a0) * inner, Math.sin(a0) * inner);
      ctx.lineTo(Math.cos(a1) * outer, Math.sin(a1) * outer);
      ctx.lineTo(Math.cos(a2) * outer, Math.sin(a2) * outer);
      ctx.lineTo(Math.cos(a3) * inner, Math.sin(a3) * inner);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = stroke;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.42, 0, Math.PI * 2);
    ctx.fillStyle = stroke;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.18, 0, Math.PI * 2);
    ctx.fillStyle = '#0b132b';
    ctx.fill();
    ctx.restore();
  }

  /* =========================================================================
   * 合体ロボット・プロシージャル描画エンジン
   * ========================================================================= */
  function drawRobot(ctx, cx, cy, scale, config, state = {}) {
    const cfg = Object.assign({ head: 'astro', body: 'core', arm: 'punch', leg: 'jet', color: 'cyan' }, config || {});
    const pal = getPalette(cfg.color);
    const t = state.time || performance.now() * 0.001;
    const bob = Math.sin(t * 3.4) * 4;
    const armWave = state.pose === 'happy' ? -1.1 + Math.sin(t * 10) * 0.25 :
                    state.pose === 'beam'  ? -0.75 : Math.sin(t * 3.4) * 0.12;
    const thrust = state.jumping || state.pose === 'beam';

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    // 足元の接地シャドウ
    ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
    ctx.beginPath();
    ctx.ellipse(0, 88, 52, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    // 背面ウイング／バックパックエフェクト
    if (cfg.body === 'rocket' || cfg.body === 'cosmic' || thrust) {
      ctx.save();
      ctx.translate(0, bob);
      ctx.fillStyle = pal.sub;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-24, -15);
      ctx.lineTo(-68, -38);
      ctx.lineTo(-56, 12);
      ctx.lineTo(-24, 15);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(24, -15);
      ctx.lineTo(68, -38);
      ctx.lineTo(56, 12);
      ctx.lineTo(24, 15);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // ---- 1. 脚パーツ (LEG) ----
    ctx.save();
    const legSpread = 22;
    [-1, 1].forEach((dir) => {
      ctx.save();
      ctx.translate(dir * legSpread, 34 + bob * 0.35);

      if (cfg.leg === 'tank') {
        roundRectPath(ctx, -20, 8, 40, 38, 12);
        ctx.fillStyle = '#37474f';
        ctx.fill();
        ctx.strokeStyle = pal.main;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        for (let w = -10; w <= 10; w += 10) {
          ctx.beginPath();
          ctx.arc(w, 27, 6, 0, Math.PI * 2);
          ctx.fillStyle = pal.glow;
          ctx.fill();
        }
      } else if (cfg.leg === 'wheel') {
        roundRectPath(ctx, -11, -2, 22, 28, 7);
        ctx.fillStyle = pal.sub;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, 32, 17, 0, Math.PI * 2);
        ctx.fillStyle = '#263238';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = pal.main;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 32, 7, 0, Math.PI * 2);
        ctx.fillStyle = '#ffd600';
        ctx.fill();
      } else {
        // 標準・ジェット・恐竜・フロッグ・スター脚
        roundRectPath(ctx, -13, -2, 26, 36, 8);
        ctx.fillStyle = pal.sub;
        ctx.fill();
        ctx.lineWidth = 2.2;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        // つま先
        roundRectPath(ctx, -16, 28, 32, 18, 8);
        ctx.fillStyle = pal.main;
        ctx.fill();
        ctx.stroke();

        if (cfg.leg === 'dino') {
          ctx.fillStyle = '#ffd600';
          [-9, 0, 9].forEach((cxOff) => {
            ctx.beginPath();
            ctx.moveTo(cxOff - 4, 45);
            ctx.lineTo(cxOff, 53);
            ctx.lineTo(cxOff + 4, 45);
            ctx.fill();
          });
        }
        if (cfg.leg === 'jet' || cfg.leg === 'star' || thrust) {
          const flameH = (thrust ? 26 : 13) + Math.sin(t * 28 + dir) * 5;
          const grad = ctx.createLinearGradient(0, 44, 0, 44 + flameH);
          grad.addColorStop(0, '#ffffff');
          grad.addColorStop(0.4, '#ffd600');
          grad.addColorStop(1, 'rgba(255, 64, 129, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.moveTo(-9, 45);
          ctx.lineTo(0, 45 + flameH);
          ctx.lineTo(9, 45);
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.restore();
    });
    ctx.restore();

    // ---- 2. 胴体パーツ (BODY) ----
    ctx.save();
    ctx.translate(0, bob);
    roundRectPath(ctx, -36, -26, 72, 64, 16);
    const bodyGrad = ctx.createLinearGradient(0, -26, 0, 38);
    bodyGrad.addColorStop(0, pal.main);
    bodyGrad.addColorStop(1, pal.sub);
    ctx.fillStyle = bodyGrad;
    ctx.fill();
    ctx.lineWidth = 2.8;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // 胸部デザイン分岐
    if (cfg.body === 'dino') {
      // 恐竜の牙ブレスト
      ctx.fillStyle = '#ffd600';
      ctx.beginPath();
      ctx.moveTo(-24, -10); ctx.lineTo(-14, 8); ctx.lineTo(-4, -10);
      ctx.moveTo(4, -10);   ctx.lineTo(14, 8);  ctx.lineTo(24, -10);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 14, 10, 0, Math.PI * 2);
      ctx.fillStyle = '#ff1744';
      ctx.fill();
    } else if (cfg.body === 'fire') {
      // レスキュークロス
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-6, -12, 12, 32);
      ctx.fillRect(-16, -2, 32, 12);
    } else if (cfg.body === 'train') {
      // 新幹線ライン＆ライト
      ctx.fillStyle = '#ffffff';
      roundRectPath(ctx, -28, -12, 56, 18, 9);
      ctx.fill();
      ctx.fillStyle = '#ffd600';
      ctx.beginPath();
      ctx.arc(-14, -3, 5, 0, Math.PI * 2);
      ctx.arc(14, -3, 5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // スターコア／コスモコア
      ctx.beginPath();
      ctx.arc(0, 4, 16, 0, Math.PI * 2);
      ctx.fillStyle = pal.dark;
      ctx.fill();
      drawStarShape(ctx, 0, 4, 5, 13, 6, '#ffd600');
    }

    // ---- 3. 腕パーツ (ARM) ----
    [-1, 1].forEach((dir) => {
      ctx.save();
      ctx.translate(dir * 42, -14);
      ctx.rotate(dir * armWave);

      // 肩アーマー
      roundRectPath(ctx, -13, -12, 26, 22, 9);
      ctx.fillStyle = pal.main;
      ctx.fill();
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // 前腕
      roundRectPath(ctx, -10, 8, 20, 26, 7);
      ctx.fillStyle = pal.sub;
      ctx.fill();
      ctx.stroke();

      if (cfg.arm === 'drill') {
        ctx.fillStyle = '#cfd8dc';
        ctx.beginPath();
        ctx.moveTo(-12, 32);
        ctx.lineTo(0, 58);
        ctx.lineTo(12, 32);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (cfg.arm === 'laser') {
        roundRectPath(ctx, -11, 30, 22, 18, 6);
        ctx.fillStyle = '#263238';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, 48, 7, 0, Math.PI * 2);
        ctx.fillStyle = '#00e5ff';
        ctx.fill();
      } else if (cfg.arm === 'claw') {
        ctx.strokeStyle = '#ffd600';
        ctx.lineWidth = 4;
        [-6, 0, 6].forEach((xOff) => {
          ctx.beginPath();
          ctx.moveTo(xOff, 33);
          ctx.lineTo(xOff * 1.3, 47);
          ctx.stroke();
        });
      } else if (cfg.arm === 'shield' && dir === -1) {
        roundRectPath(ctx, -22, 6, 30, 42, 12);
        ctx.fillStyle = '#00e5ff';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
      } else if (cfg.arm === 'crane') {
        ctx.strokeStyle = '#ffd600';
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.arc(0, 41, 9, 0.2, Math.PI * 1.8);
        ctx.stroke();
      } else {
        // ロケットナックル
        ctx.beginPath();
        ctx.arc(0, 38, 11, 0, Math.PI * 2);
        ctx.fillStyle = '#ffd600';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
      }
      ctx.restore();
    });

    // ---- 4. 頭パーツ (HEAD) ----
    ctx.save();
    ctx.translate(0, -54 + Math.sin(t * 3.4 + 0.6) * 2);

    if (cfg.head === 'tyranno') {
      // ティラノヘッド
      roundRectPath(ctx, -30, -24, 60, 46, 14);
      ctx.fillStyle = pal.main;
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
      // トサカ
      ctx.fillStyle = '#ffd600';
      [-14, 0, 14].forEach((tx) => {
        ctx.beginPath();
        ctx.moveTo(tx - 6, -24);
        ctx.lineTo(tx, -36);
        ctx.lineTo(tx + 6, -24);
        ctx.fill();
      });
      // キバライン
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(-20, 12); ctx.lineTo(-14, 19); ctx.lineTo(-8, 12);
      ctx.moveTo(8, 12);   ctx.lineTo(14, 19);  ctx.lineTo(20, 12);
      ctx.fill();
    } else if (cfg.head === 'tricera') {
      // トリケラホーン（大きなフリル＋3本ツノ）
      ctx.beginPath();
      ctx.arc(0, -6, 34, Math.PI, 0);
      ctx.fillStyle = pal.sub;
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#ffd600';
      ctx.stroke();

      roundRectPath(ctx, -26, -20, 52, 42, 13);
      ctx.fillStyle = pal.main;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      ctx.fillStyle = '#ffd600';
      [-20, 0, 20].forEach((hx, idx) => {
        const hLen = idx === 1 ? -34 : -40;
        ctx.beginPath();
        ctx.moveTo(hx - 5, -18);
        ctx.lineTo(hx * 1.25, hLen);
        ctx.lineTo(hx + 5, -18);
        ctx.fill();
      });
    } else if (cfg.head === 'rescue') {
      roundRectPath(ctx, -27, -22, 54, 44, 14);
      ctx.fillStyle = pal.main;
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
      // 赤色回転灯
      const sirenGlow = 0.5 + 0.5 * Math.sin(t * 12);
      ctx.fillStyle = `rgba(255, 23, 68, ${0.65 + sirenGlow * 0.35})`;
      roundRectPath(ctx, -14, -34, 28, 13, 6);
      ctx.fill();
      ctx.stroke();
    } else if (cfg.head === 'shinkansen') {
      // 流線型はやぶさヘルメット
      ctx.beginPath();
      ctx.moveTo(-28, 20);
      ctx.quadraticCurveTo(-30, -28, 0, -32);
      ctx.quadraticCurveTo(30, -28, 28, 20);
      ctx.closePath();
      ctx.fillStyle = pal.main;
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
      ctx.fillStyle = '#ff4081';
      ctx.fillRect(-26, 6, 52, 5);
    } else if (cfg.head === 'king') {
      roundRectPath(ctx, -28, -22, 56, 44, 14);
      ctx.fillStyle = pal.main;
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
      // 王冠ブレード
      ctx.fillStyle = '#ffd600';
      ctx.beginPath();
      ctx.moveTo(-22, -22);
      ctx.lineTo(-16, -40);
      ctx.lineTo(-6, -26);
      ctx.lineTo(0, -44);
      ctx.lineTo(6, -26);
      ctx.lineTo(16, -40);
      ctx.lineTo(22, -22);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      // アストロバイザー（アンテナ付き）
      ctx.fillStyle = '#ff4081';
      ctx.fillRect(-3, -38, 6, 16);
      ctx.beginPath();
      ctx.arc(0, -40, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#ffd600';
      ctx.fill();

      roundRectPath(ctx, -28, -22, 56, 44, 15);
      ctx.fillStyle = pal.main;
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
    }

    // 共通バイザー＆キラキラの目
    roundRectPath(ctx, -21, -11, 42, 19, 9);
    ctx.fillStyle = '#091228';
    ctx.fill();

    const blink = Math.sin(t * 2.1) > 0.97 ? 0.18 : 1;
    [-10, 10].forEach((ex) => {
      ctx.save();
      ctx.translate(ex, -2);
      ctx.scale(1, blink);
      ctx.beginPath();
      ctx.arc(0, 0, 5.2, 0, Math.PI * 2);
      ctx.fillStyle = '#ffd600';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-1.6, -1.6, 1.8, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.restore();
    });

    ctx.restore(); // head

    // 必殺ビーム発射エフェクト
    if (state.pose === 'beam') {
      const pulse = 18 + Math.sin(t * 35) * 5;
      const beamGrad = ctx.createLinearGradient(0, 4, 0, -240);
      beamGrad.addColorStop(0, '#ffffff');
      beamGrad.addColorStop(0.3, '#ffd600');
      beamGrad.addColorStop(0.7, '#00e5ff');
      beamGrad.addColorStop(1, 'rgba(0, 229, 255, 0)');
      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.moveTo(-pulse, 4);
      ctx.lineTo(-pulse * 1.8, -230);
      ctx.lineTo(pulse * 1.8, -230);
      ctx.lineTo(pulse, 4);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore(); // body
    ctx.restore(); // root
  }

  /* =========================================================================
   * 宇宙怪獣描画エンジン（タッグバトル用ボス3種）
   * ========================================================================= */
  function drawMonster(ctx, cx, cy, scale, bossIndex, t, hitFlash = 0) {
    ctx.save();
    ctx.translate(cx, cy + Math.sin(t * 2.6) * 5);
    ctx.scale(scale, scale);

    const kind = bossIndex % 3;
    if (kind === 0) {
      // メカギドラ（三つ首スペースドラゴン）
      ctx.fillStyle = '#7b1fa2';
      ctx.strokeStyle = '#ffd600';
      ctx.lineWidth = 3;
      // 翼
      [-1, 1].forEach((d) => {
        ctx.beginPath();
        ctx.moveTo(d * 20, 0);
        ctx.lineTo(d * 78, -36 + Math.sin(t * 5) * 8);
        ctx.lineTo(d * 64, 18);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      });
      // 胴体
      ctx.beginPath();
      ctx.arc(0, 12, 34, 0, Math.PI * 2);
      ctx.fillStyle = '#4a148c';
      ctx.fill();
      ctx.stroke();
      // 3つの首
      [-32, 0, 32].forEach((nx, i) => {
        const ny = -32 - (i === 1 ? 10 : 0) + Math.sin(t * 4 + i) * 4;
        ctx.strokeStyle = '#ab47bc';
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(nx * 0.4, -8);
        ctx.lineTo(nx, ny);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(nx, ny, 15, 0, Math.PI * 2);
        ctx.fillStyle = '#ffd600';
        ctx.fill();
        ctx.fillStyle = '#d50000';
        ctx.beginPath();
        ctx.arc(nx - 5, ny - 2, 3.2, 0, Math.PI * 2);
        ctx.arc(nx + 5, ny - 2, 3.2, 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (kind === 1) {
      // マグマクリスタルゴーレム
      ctx.fillStyle = '#bf360c';
      ctx.strokeStyle = '#ffab00';
      ctx.lineWidth = 3;
      roundRectPath(ctx, -46, -34, 92, 74, 18);
      ctx.fill();
      ctx.stroke();
      // 肩クリスタル
      ctx.fillStyle = '#00e5ff';
      [-48, 48].forEach((sx) => {
        ctx.beginPath();
        ctx.moveTo(sx - 12, -20);
        ctx.lineTo(sx, -54);
        ctx.lineTo(sx + 12, -20);
        ctx.closePath();
        ctx.fill();
      });
      // 1つ目バイザー
      roundRectPath(ctx, -28, -16, 56, 20, 10);
      ctx.fillStyle = '#212121';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(Math.sin(t * 3) * 14, -6, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#ffeb3b';
      ctx.fill();
    } else {
      // キングUFOオクトパス
      ctx.strokeStyle = '#00e676';
      ctx.lineWidth = 7;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 15, 16);
        ctx.quadraticCurveTo(i * 22, 38, i * 18 + Math.sin(t * 5 + i) * 8, 52);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.ellipse(0, 8, 58, 22, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#263238';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#00e5ff';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, -4, 32, Math.PI, 0);
      ctx.fillStyle = 'rgba(0, 229, 255, 0.45)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, -14, 16, 0, Math.PI * 2);
      ctx.fillStyle = '#00e676';
      ctx.fill();
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.arc(-6, -16, 3.5, 0, Math.PI * 2);
      ctx.arc(6, -16, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // P2 #12: Safari非対応の ctx.filter を使わず、全ブラウザ共通のベクター発光オーバーレイで被弾フラッシュを表現
    if (hitFlash > 0) {
      const alpha = Math.min(0.78, hitFlash * 2.2);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(0, 0, 62, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(255, 214, 0, ${alpha.toFixed(2)})`;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 0, 70 + (1 - alpha) * 14, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  /* =========================================================================
   * パーティクルシステム＆常駐パララックス星空
   * ========================================================================= */
  class ParticleSystem {
    constructor() {
      this.items = [];
      this.texts = [];
    }

    burst(x, y, color = '#ffd600', count = 18, speed = 220) {
      for (let i = 0; i < count; i++) {
        const a = (Math.PI * 2 * i) / count + Math.random() * 0.4;
        const sp = speed * (0.35 + Math.random() * 0.85);
        this.items.push({
          x, y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          r: 3 + Math.random() * 5,
          life: 0.55 + Math.random() * 0.35,
          maxLife: 0.9,
          color,
          gravity: 180
        });
      }
    }

    confetti(w, h, count = 40) {
      const cols = ['#ffd600', '#00e5ff', '#ff4081', '#00e676', '#b388ff', '#ff9100'];
      for (let i = 0; i < count; i++) {
        this.items.push({
          x: Math.random() * w,
          y: -10 - Math.random() * 40,
          vx: (Math.random() - 0.5) * 120,
          vy: 90 + Math.random() * 140,
          r: 5 + Math.random() * 4,
          life: 1.6 + Math.random() * 0.8,
          maxLife: 2.4,
          color: cols[i % cols.length],
          gravity: 60
        });
      }
    }

    popText(x, y, text, color = '#ffd600') {
      this.texts.push({ x, y, text, color, life: 0.95, maxLife: 0.95 });
    }

    update(dt) {
      for (let i = this.items.length - 1; i >= 0; i--) {
        const p = this.items[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += p.gravity * dt;
        p.life -= dt;
        if (p.life <= 0) this.items.splice(i, 1);
      }
      for (let i = this.texts.length - 1; i >= 0; i--) {
        const ft = this.texts[i];
        ft.y -= 42 * dt;
        ft.life -= dt;
        if (ft.life <= 0) this.texts.splice(i, 1);
      }
    }

    draw(ctx) {
      for (const p of this.items) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      for (const ft of this.texts) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, ft.life / ft.maxLife * 1.4));
        ctx.font = '900 22px "Hiragino Maru Gothic ProN", "Rounded Mplus 1c", sans-serif';
        ctx.textAlign = 'center';
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#091128';
        ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      }
    }
  }

  function startStarfield(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const stars = [];
    let w = 0, h = 0;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (stars.length === 0) {
        for (let i = 0; i < 65; i++) {
          stars.push({
            x: Math.random() * w,
            y: Math.random() * h,
            r: 0.8 + Math.random() * 2.2,
            sp: 8 + Math.random() * 22,
            phase: Math.random() * Math.PI * 2
          });
        }
      }
    }
    window.addEventListener('resize', resize);
    resize();

    let last = performance.now();
    let frameSkip = 0;
    function loop(now) {
      if (document.hidden) {
        last = now;
        requestAnimationFrame(loop);
        return;
      }
      // P2 #17: ゲームプレイ画面中は背景星空を30fpsに抑えてバッテリーと発熱を節約
      const inTitle = !window.AppMain || window.AppMain.currentScreen === 'screen-title';
      frameSkip = (frameSkip + 1) % 2;
      if (!inTitle && frameSkip === 1) {
        requestAnimationFrame(loop);
        return;
      }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, '#070e22');
      bgGrad.addColorStop(0.55, '#102048');
      bgGrad.addColorStop(1, '#192a56');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // 遠い土星風プラネット
      ctx.save();
      ctx.translate(w * 0.82, h * 0.16);
      ctx.fillStyle = 'rgba(255, 145, 0, 0.16)';
      ctx.beginPath();
      ctx.arc(0, 0, 38, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.22)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(0, 0, 66, 14, -0.3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      const t = now * 0.001;
      for (const s of stars) {
        s.y += s.sp * dt;
        if (s.y > h + 5) {
          s.y = -5;
          s.x = Math.random() * w;
        }
        const alpha = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 2.5 + s.phase));
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  window.RoboParts = RoboParts;
  window.RoboRenderer = {
    getPalette,
    getRobotDisplayName,
    roundRectPath,
    drawStarShape,
    drawGearShape,
    drawRobot,
    drawMonster,
    ParticleSystem,
    startStarfield
  };
})();
