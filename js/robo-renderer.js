(function () {
  'use strict';

  /* =========================================================================
   * RoboAssets: 3D生成イラスト(WebP)のプリロード＆安全取得
   * ========================================================================= */
  const ASSET_PATHS = {
    bg_space_lab: './img/bg_space_lab.webp',
    boss_0: './img/boss_0.webp',
    boss_1: './img/boss_1.webp',
    boss_2: './img/boss_2.webp',
    zukan_trex: './img/zukan_trex.webp',
    zukan_tricera: './img/zukan_tricera.webp',
    zukan_ptera: './img/zukan_ptera.webp',
    zukan_rocket: './img/zukan_rocket.webp',
    zukan_blackhole: './img/zukan_blackhole.webp',
    zukan_gear: './img/zukan_gear.webp',
    zukan_magnet: './img/zukan_magnet.webp'
  };

  const RoboAssets = {
    cache: {},
    preloaded: false,
    preload() {
      if (this.preloaded) return;
      this.preloaded = true;
      Object.keys(ASSET_PATHS).forEach((key) => {
        const img = new Image();
        img.decoding = 'async';
        img.src = ASSET_PATHS[key];
        this.cache[key] = img;
      });
    },
    getImage(key) {
      if (!this.preloaded) this.preload();
      const img = this.cache[key];
      return img && img.complete && img.naturalWidth > 0 ? img : null;
    },
    getPath(key) {
      return ASSET_PATHS[key] || null;
    }
  };

  if (typeof window !== 'undefined') {
    RoboAssets.preload();
  }

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

  function hexToRgb(hex) {
    const clean = String(hex || '#00c8ff').replace('#', '');
    if (clean.length !== 6) return { r: 0, g: 200, b: 255 };
    const n = parseInt(clean, 16);
    if (Number.isNaN(n)) return { r: 0, g: 200, b: 255 };
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function mixColor(hexA, hexB, t) {
    const a = hexToRgb(hexA);
    const b = hexToRgb(hexB);
    const k = Math.max(0, Math.min(1, t));
    const r = Math.round(a.r + (b.r - a.r) * k);
    const g = Math.round(a.g + (b.g - a.g) * k);
    const bl = Math.round(a.b + (b.b - a.b) * k);
    return `rgb(${r}, ${g}, ${bl})`;
  }

  function getRichPalette(colorId) {
    const base = getPalette(colorId);
    const isStealth = base.id === 'black';
    const isWhite = base.id === 'white';
    return {
      base,
      main: isStealth ? '#2d3947' : base.main,
      sub: isStealth ? '#17202b' : base.sub,
      dark: base.dark,
      glow: base.glow,
      highlight: isStealth ? '#596b80' : mixColor(base.main, '#ffffff', isWhite ? 0.85 : 0.46),
      bright: isStealth ? '#415164' : mixColor(base.main, '#ffffff', 0.22),
      shade: isStealth ? '#0f1620' : mixColor(base.sub, '#081020', 0.16),
      deep: isStealth ? '#080c14' : mixColor(base.dark, '#050a16', 0.55),
      outline: isStealth ? '#060a12' : '#091326',
      rim: isStealth ? 'rgba(255, 72, 140, 0.88)' : 'rgba(255, 255, 255, 0.62)',
      gunLight: '#49586e',
      gunMid: '#263244',
      gunDark: '#121926',
      chromeHi: '#f4f8ff',
      chromeMid: '#90a4b8',
      chromeDark: '#47596e',
      goldHi: '#fff8b0',
      goldMid: '#ffc400',
      goldDark: '#b36b00'
    };
  }

  function getRobotDisplayName(cfg) {
    const h = RoboParts.head.find((p) => p.id === cfg.head) || RoboParts.head[0];
    const b = RoboParts.body.find((p) => p.id === cfg.body) || RoboParts.body[0];
    return `${h.prefix}・${b.suffix}`;
  }

  /* =========================================================================
   * ベクター描画ヘルパー（超合金・面取りメカ造形用）
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

  function polyPath(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i][0], pts[i][1]);
    }
    ctx.closePath();
  }

  function fillBevelArmor(ctx, pts, gradOrFill, outlineColor, lineWidth = 2.1, rimColor = 'rgba(255,255,255,0.58)') {
    polyPath(ctx, pts);
    ctx.fillStyle = gradOrFill;
    ctx.fill();
    ctx.lineJoin = 'round';
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = outlineColor;
    ctx.stroke();

    // 上辺・左上エッジのシャープなメタリックリムライト
    if (pts.length >= 3 && rimColor) {
      ctx.save();
      polyPath(ctx, pts);
      ctx.clip();
      ctx.beginPath();
      const edgeCount = Math.min(pts.length - 1, Math.max(2, Math.ceil(pts.length * 0.45)));
      ctx.moveTo(pts[0][0], pts[0][1] + 0.8);
      for (let i = 1; i <= edgeCount; i++) {
        ctx.lineTo(pts[i][0], pts[i][1] + 0.8);
      }
      ctx.strokeStyle = rimColor;
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.restore();
    }
  }

  function makeMetalGrad(ctx, x0, y0, x1, y1, rp, dir = 1) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    if (dir >= 0) {
      g.addColorStop(0, rp.highlight);
      g.addColorStop(0.28, rp.main);
      g.addColorStop(0.75, rp.sub);
      g.addColorStop(1, rp.deep);
    } else {
      g.addColorStop(0, rp.deep);
      g.addColorStop(0.25, rp.sub);
      g.addColorStop(0.72, rp.main);
      g.addColorStop(1, rp.highlight);
    }
    return g;
  }

  function makeGoldGrad(ctx, x0, y0, x1, y1) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, '#fff9c4');
    g.addColorStop(0.35, '#ffd500');
    g.addColorStop(0.78, '#ff9800');
    g.addColorStop(1, '#9e5200');
    return g;
  }

  function makeGunmetalGrad(ctx, x0, y0, x1, y1) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, '#5a6b82');
    g.addColorStop(0.45, '#2b3648');
    g.addColorStop(1, '#121925');
    return g;
  }

  function drawJointSocket(ctx, x, y, r, outline = '#091326') {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = makeGunmetalGrad(ctx, x - r, y - r, x + r, y + r);
    ctx.fill();
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = outline;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y, r * 0.48, 0, Math.PI * 2);
    ctx.fillStyle = '#90a4b8';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x - r * 0.16, y - r * 0.16, r * 0.18, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();
  }

  function drawSpringSegment(ctx, x, yTop, yBot, halfW, coils) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const step = (yBot - yTop) / coils;
    // 影側ストローク
    ctx.beginPath();
    for (let i = 0; i < coils; i++) {
      const y0 = yTop + i * step;
      const y1 = y0 + step * 0.5;
      const y2 = y0 + step;
      ctx.moveTo(x - halfW, y0);
      ctx.lineTo(x + halfW, y1);
      ctx.lineTo(x - halfW, y2);
    }
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#182232';
    ctx.stroke();

    // メタリッククローム
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#cfd8dc';
    ctx.stroke();

    // 上面ハイライト
    ctx.beginPath();
    for (let i = 0; i < coils; i++) {
      const y0 = yTop + i * step;
      const y1 = y0 + step * 0.5;
      ctx.moveTo(x - halfW + 1, y0);
      ctx.lineTo(x + halfW - 1, y1);
    }
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.restore();
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
   * 合体ロボット・超合金プロシージャル描画エンジン
   * ========================================================================= */
  function drawRobot(ctx, cx, cy, scale, config, state = {}) {
    const cfg = Object.assign({ head: 'astro', body: 'core', arm: 'punch', leg: 'jet', color: 'cyan' }, config || {});
    const rp = getRichPalette(cfg.color);
    const t = state.time || performance.now() * 0.001;
    const ef = Math.max(0, Math.min(1, state.equipFlash || 0));
    const equipBounce = ef > 0 ? 1 + Math.sin(ef * Math.PI) * 0.09 : 1;
    const recoilY = state.pose === 'beam' ? Math.sin(t * 48) * 1.6 : 0;
    const bob = Math.sin(t * 3.4) * 3.5 + recoilY;
    const armWave = state.pose === 'happy' ? -1.12 + Math.sin(t * 10) * 0.24 :
                    state.pose === 'beam'  ? -0.72 + Math.sin(t * 28) * 0.05 :
                    state.pose === 'surprised' ? -0.55 :
                    Math.sin(t * 3.4) * 0.09;
    const thrust = Boolean(state.jumping || state.pose === 'beam');

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale * equipBounce, scale * equipBounce);

    // 0. 接地ホログラムシャドウ＆足元光彩
    ctx.save();
    const shGrad = ctx.createRadialGradient(0, 88, 6, 0, 88, 56);
    shGrad.addColorStop(0, 'rgba(0, 0, 0, 0.56)');
    shGrad.addColorStop(0.65, 'rgba(4, 12, 30, 0.28)');
    shGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = shGrad;
    ctx.beginPath();
    ctx.ellipse(0, 88, 54, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    if (thrust || ef > 0) {
      ctx.strokeStyle = rp.glow;
      ctx.globalAlpha = thrust ? 0.55 : ef * 0.8;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 88, 46, 9.5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // 1. 背面バックパック／ウイング（胴体パーツ連動＋スラスト展開）
    if (cfg.body === 'rocket' || cfg.body === 'cosmic' || cfg.body === 'train' || cfg.body === 'dino' || cfg.body === 'fire' || thrust) {
      ctx.save();
      ctx.translate(0, bob);

      if (cfg.body === 'cosmic') {
        // 多層エナジー・プラズマウイング
        [-1, 1].forEach((dir) => {
          ctx.save();
          ctx.scale(dir, 1);
          const wg = ctx.createLinearGradient(18, -10, 70, -48);
          wg.addColorStop(0, rp.main);
          wg.addColorStop(0.55, '#00e5ff');
          wg.addColorStop(1, 'rgba(255, 255, 255, 0.15)');
          fillBevelArmor(ctx, [
            [20, -18], [68, -48], [60, -10], [66, 12], [22, 16]
          ], wg, rp.outline, 1.8, 'rgba(180,250,255,0.8)');
          // 内側光の筋
          ctx.strokeStyle = '#ffffff';
          ctx.globalAlpha = 0.65;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(26, -8);
          ctx.lineTo(58, -32);
          ctx.moveTo(26, 4);
          ctx.lineTo(56, 2);
          ctx.stroke();
          ctx.restore();
        });
      } else if (cfg.body === 'fire') {
        // レスキュー・ハイドロタンク＆配管
        [-1, 1].forEach((dir) => {
          ctx.save();
          ctx.scale(dir, 1);
          roundRectPath(ctx, 22, -32, 16, 42, 6);
          ctx.fillStyle = makeMetalGrad(ctx, 22, -32, 38, 10, rp);
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = rp.outline;
          ctx.stroke();
          ctx.fillStyle = '#ffd600';
          ctx.fillRect(24, -18, 12, 5);
          ctx.restore();
        });
      } else if (cfg.body === 'dino') {
        // メタリック背びれブレード
        [-1, 1].forEach((dir) => {
          ctx.save();
          ctx.scale(dir, 1);
          fillBevelArmor(ctx, [
            [20, -24], [52, -42], [44, -8], [56, 4], [24, 14]
          ], makeGoldGrad(ctx, 20, -42, 56, 14), rp.outline, 1.9);
          ctx.restore();
        });
      } else {
        // rocket / train / thrust共通：メカニカル・デルタウイング＋ブースターポッド
        const spread = thrust ? 1.08 : 0.94;
        [-1, 1].forEach((dir) => {
          ctx.save();
          ctx.scale(dir * spread, 1);
          fillBevelArmor(ctx, [
            [20, -16], [64, -38], [56, 6], [22, 14]
          ], makeMetalGrad(ctx, 20, -38, 64, 14, rp), rp.outline, 2, rp.rim);
          // 翼端ライン
          ctx.strokeStyle = rp.glow;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(28, -10);
          ctx.lineTo(57, -28);
          ctx.stroke();
          if (cfg.body === 'rocket' || thrust) {
            // スラスターノズル
            polyPath(ctx, [[26, 8], [38, 8], [41, 20], [23, 20]]);
            ctx.fillStyle = makeGunmetalGrad(ctx, 23, 8, 41, 20);
            ctx.fill();
            ctx.lineWidth = 1.6;
            ctx.strokeStyle = rp.outline;
            ctx.stroke();
            const fLen = (thrust ? 20 : 9) + Math.sin(t * 28 + dir) * 3.5;
            const fg = ctx.createLinearGradient(32, 20, 32, 20 + fLen);
            fg.addColorStop(0, '#ffffff');
            fg.addColorStop(0.45, '#00e5ff');
            fg.addColorStop(1, 'rgba(0, 229, 255, 0)');
            ctx.fillStyle = fg;
            ctx.beginPath();
            ctx.moveTo(25, 20);
            ctx.lineTo(32, 20 + fLen);
            ctx.lineTo(39, 20);
            ctx.closePath();
            ctx.fill();
          }
          ctx.restore();
        });
      }
      ctx.restore();
    }

    // 2. 脚パーツ (LEG: ガンメタル関節 + 立体面取りスネ装甲 + 専用ブーツ/機能)
    const legSpread = 22;
    [-1, 1].forEach((dir) => {
      ctx.save();
      ctx.translate(dir * legSpread, 34 + bob * 0.35);

      if (cfg.leg === 'tank') {
        // 重装甲大腿フレーム＋キャタピラポッド
        roundRectPath(ctx, -10, -4, 20, 18, 4);
        ctx.fillStyle = makeGunmetalGrad(ctx, -10, -4, 10, 14);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = rp.outline;
        ctx.stroke();

        // 履帯アウター装甲
        fillBevelArmor(ctx, [
          [-19, 8], [19, 8], [22, 22], [18, 47], [-18, 47], [-22, 22]
        ], makeGunmetalGrad(ctx, -22, 8, 22, 47), rp.outline, 2.2, 'rgba(255,255,255,0.38)');

        // 上部カラー装甲カバー
        fillBevelArmor(ctx, [
          [-16, 7], [16, 7], [14, 16], [-14, 16]
        ], makeMetalGrad(ctx, -16, 7, 16, 16, rp), rp.outline, 1.8, rp.rim);

        // 回転履帯コマアニメーション
        const treadShift = ((t * 18) % 8);
        ctx.strokeStyle = '#607690';
        ctx.lineWidth = 2;
        for (let tx = -14 + treadShift * 0.5; tx <= 14; tx += 7) {
          ctx.beginPath();
          ctx.moveTo(tx, 43);
          ctx.lineTo(tx, 47);
          ctx.stroke();
        }
        // 3連転輪＋発光ハブ
        [-10.5, 0, 10.5].forEach((wx) => {
          ctx.beginPath();
          ctx.arc(wx, 31, 6.2, 0, Math.PI * 2);
          ctx.fillStyle = '#182230';
          ctx.fill();
          ctx.lineWidth = 1.6;
          ctx.strokeStyle = '#90a4b8';
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(wx, 31, 2.6, 0, Math.PI * 2);
          ctx.fillStyle = rp.glow;
          ctx.fill();
        });
      } else if (cfg.leg === 'wheel') {
        // 大腿＋フロントストラット
        fillBevelArmor(ctx, [
          [-11, -3], [11, -3], [13, 18], [0, 22], [-13, 18]
        ], makeMetalGrad(ctx, -12, -3, 12, 22, rp), rp.outline, 2, rp.rim);

        // 回転ホイール本体
        const wy = 32;
        ctx.beginPath();
        ctx.arc(0, wy, 17.5, 0, Math.PI * 2);
        ctx.fillStyle = '#141c26';
        ctx.fill();
        ctx.lineWidth = 2.4;
        ctx.strokeStyle = rp.outline;
        ctx.stroke();

        // 発光タイヤリム
        ctx.beginPath();
        ctx.arc(0, wy, 13.5, 0, Math.PI * 2);
        ctx.lineWidth = 2.6;
        ctx.strokeStyle = rp.main;
        ctx.stroke();

        // 回転5本メタリックスポーク
        ctx.save();
        ctx.translate(0, wy);
        ctx.rotate(dir * t * 6.5);
        ctx.strokeStyle = '#cfd8dc';
        ctx.lineWidth = 2.2;
        for (let s = 0; s < 5; s++) {
          const ang = (s / 5) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(ang) * 11.5, Math.sin(ang) * 11.5);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(0, 0, 5.2, 0, Math.PI * 2);
        ctx.fillStyle = makeGoldGrad(ctx, -5, -5, 5, 5);
        ctx.fill();
        ctx.strokeStyle = rp.outline;
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.restore();
      } else {
        // 共通ガンメタル太もも
        roundRectPath(ctx, -10, -4, 20, 15, 4);
        ctx.fillStyle = makeGunmetalGrad(ctx, -10, -4, 10, 11);
        ctx.fill();
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = rp.outline;
        ctx.stroke();

        if (cfg.leg === 'frog') {
          // ハイパージャンパー：クローム油圧スプリング脚
          drawSpringSegment(ctx, 0, 10, 31, 10, 4);
          drawJointSocket(ctx, 0, 10, 5.5, rp.outline);
          // ワイドブースターフットパッド
          fillBevelArmor(ctx, [
            [-14, 30], [14, 30], [19, 44], [12, 48], [-12, 48], [-19, 44]
          ], makeMetalGrad(ctx, -18, 30, 18, 48, rp), rp.outline, 2, rp.rim);
          // 足裏ショック吸収エネルギーライン
          ctx.fillStyle = '#00e676';
          ctx.fillRect(-13, 42, 26, 3.5);
        } else {
          // 立体スネ装甲（jet / dino / star）
          const shinPts = cfg.leg === 'dino'
            ? [[-12, 7], [12, 7], [15, 29], [10, 34], [-10, 34], [-15, 29]]
            : [[-13, 7], [13, 7], [14, 31], [-14, 31]];
          fillBevelArmor(ctx, shinPts, makeMetalGrad(ctx, -14, 7, 14, 32, rp), rp.outline, 2, rp.rim);

          // 膝アーマー（面取り＋発光スリット）
          fillBevelArmor(ctx, [
            [-9, 3], [0, -1], [9, 3], [7, 14], [-7, 14]
          ], makeMetalGrad(ctx, -9, -1, 9, 14, rp, -dir), rp.outline, 1.8, '#ffffff');
          ctx.fillStyle = rp.glow;
          ctx.fillRect(-3.5, 5, 7, 2.5);

          // サイドスタビライザーフィン（jet / star）
          if (cfg.leg === 'jet' || cfg.leg === 'star') {
            ctx.save();
            ctx.scale(dir, 1);
            fillBevelArmor(ctx, [
              [12, 11], [21, 5], [19, 26], [12, 28]
            ], makeGoldGrad(ctx, 12, 5, 21, 28), rp.outline, 1.6);
            ctx.restore();
          }

          // 重装甲ブーツ・つま先
          fillBevelArmor(ctx, [
            [-15, 29], [15, 29], [18, 44], [13, 47], [-13, 47], [-18, 44]
          ], makeMetalGrad(ctx, -18, 29, 18, 47, rp), rp.outline, 2.1, rp.rim);

          // 足の甲メタリックトリム
          ctx.fillStyle = rp.deep;
          ctx.fillRect(-10, 39, 20, 4);

          if (cfg.leg === 'dino') {
            // 黄金メタリック3本爪
            [-9, 0, 9].forEach((cxOff) => {
              polyPath(ctx, [[cxOff - 4, 44], [cxOff + 4, 44], [cxOff, 54]]);
              ctx.fillStyle = makeGoldGrad(ctx, cxOff - 4, 44, cxOff + 4, 54);
              ctx.fill();
              ctx.lineWidth = 1.4;
              ctx.strokeStyle = rp.outline;
              ctx.stroke();
            });
          }

          if (cfg.leg === 'star') {
            // 浮遊回転する星型エネルギーリング
            ctx.save();
            ctx.translate(0, 50 + Math.sin(t * 5 + dir) * 1.5);
            ctx.strokeStyle = '#ffd600';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.ellipse(0, 0, 19, 4.5, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.strokeStyle = '#00e5ff';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.ellipse(0, 0, 14, 3.2, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }

          if (cfg.leg === 'jet' || cfg.leg === 'star' || thrust) {
            const flameH = (thrust ? 24 : 12) + Math.sin(t * 30 + dir) * 4;
            const fGrad = ctx.createLinearGradient(0, 46, 0, 46 + flameH);
            fGrad.addColorStop(0, '#ffffff');
            fGrad.addColorStop(0.35, '#ffd600');
            fGrad.addColorStop(0.75, '#ff6d00');
            fGrad.addColorStop(1, 'rgba(255, 64, 129, 0)');
            ctx.fillStyle = fGrad;
            ctx.beginPath();
            ctx.moveTo(-9, 46);
            ctx.lineTo(0, 46 + flameH);
            ctx.lineTo(9, 46);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(-4, 46);
            ctx.lineTo(0, 46 + flameH * 0.52);
            ctx.lineTo(4, 46);
            ctx.closePath();
            ctx.fill();
          }
        }
      }
      ctx.restore();
    });

    // 3. 腰・股関節フレーム（脚と胴を一体化するヒーロー装甲）
    ctx.save();
    ctx.translate(0, bob * 0.65);
    // 骨盤インナーフレーム
    polyPath(ctx, [[-30, 22], [30, 22], [24, 39], [-24, 39]]);
    ctx.fillStyle = makeGunmetalGrad(ctx, -30, 22, 30, 39);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = rp.outline;
    ctx.stroke();
    // サイドスカートアーマー
    [-1, 1].forEach((dir) => {
      ctx.save();
      ctx.scale(dir, 1);
      fillBevelArmor(ctx, [
        [13, 24], [32, 23], [34, 38], [16, 40]
      ], makeMetalGrad(ctx, 13, 23, 34, 40, rp), rp.outline, 1.8, rp.rim);
      ctx.restore();
    });
    // 中央V字フロントベルト＋コアバックル
    fillBevelArmor(ctx, [
      [-12, 22], [12, 22], [9, 39], [0, 44], [-9, 39]
    ], makeMetalGrad(ctx, -12, 22, 12, 44, rp), rp.outline, 1.9, '#ffffff');
    polyPath(ctx, [[-5, 26], [5, 26], [3, 33], [0, 36], [-3, 33]]);
    ctx.fillStyle = makeGoldGrad(ctx, -5, 26, 5, 36);
    ctx.fill();
    ctx.restore();

    // 4. 上半身（胴体＋腕＋頭＋ビーム演出）
    ctx.save();
    ctx.translate(0, bob);

    // 首シリンダー＆襟ガード
    roundRectPath(ctx, -12, -35, 24, 14, 4);
    ctx.fillStyle = makeGunmetalGrad(ctx, -12, -35, 12, -21);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = rp.outline;
    ctx.stroke();

    // 胸部メイン装甲（逆三角形Vシルエット＋面取り）
    const chestPts = [
      [-37, -23], [-20, -29], [20, -29], [37, -23],
      [33, 10], [24, 28], [-24, 28], [-33, 10]
    ];
    fillBevelArmor(ctx, chestPts, makeMetalGrad(ctx, -37, -29, 37, 28, rp), rp.outline, 2.3, rp.rim);

    // 胸部パネルライン＆斜めメタリック光沢
    ctx.save();
    polyPath(ctx, chestPts);
    ctx.clip();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
    polyPath(ctx, [[-40, -32], [8, -32], [-18, 32], [-44, 32]]);
    ctx.fill();
    // 腹部インテークダクト
    ctx.fillStyle = '#141e2e';
    polyPath(ctx, [[-20, 18], [20, 18], [16, 28], [-16, 28]]);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-34, -8);
    ctx.lineTo(-18, -16);
    ctx.lineTo(18, -16);
    ctx.lineTo(34, -8);
    ctx.stroke();
    ctx.restore();

    // ボルトアクセント
    [[-28, -19], [28, -19], [-21, 18], [21, 18]].forEach(([bx, by]) => {
      ctx.beginPath();
      ctx.arc(bx, by, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#cfd8dc';
      ctx.fill();
    });

    // 胸部デザイン分岐（全6種）
    if (cfg.body === 'dino') {
      // 恐竜の牙ゴールド・シェブロンブレスト＋マグマコア
      fillBevelArmor(ctx, [
        [-28, -15], [-15, 2], [-3, -11], [0, -6], [3, -11], [15, 2], [28, -15],
        [24, -22], [14, -10], [0, -19], [-14, -10], [-24, -22]
      ], makeGoldGrad(ctx, -28, -22, 28, 2), rp.outline, 1.8);
      const pulseR = 10 + Math.sin(t * 6) * 1.1;
      ctx.beginPath();
      ctx.arc(0, 8, 12.5, 0, Math.PI * 2);
      ctx.fillStyle = '#121925';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 8, pulseR, 0, Math.PI * 2);
      const mg = ctx.createRadialGradient(-2, 6, 1, 0, 8, pulseR);
      mg.addColorStop(0, '#fff59d');
      mg.addColorStop(0.55, '#ff1744');
      mg.addColorStop(1, '#7f0000');
      ctx.fillStyle = mg;
      ctx.fill();
    } else if (cfg.body === 'fire') {
      // 重装レスキュープレート＋発光エンブレム＋放水ベント
      fillBevelArmor(ctx, [
        [-25, -18], [25, -18], [22, 16], [-22, 16]
      ], '#eef4fa', rp.outline, 1.8, '#ffffff');
      ctx.fillStyle = '#ff1744';
      ctx.fillRect(-4.5, -12, 9, 22);
      ctx.fillRect(-11, -5.5, 22, 9);
      // 腹部の黄黒ハザードライン
      ctx.fillStyle = '#ffd600';
      ctx.fillRect(-16, 20, 32, 4);
      ctx.fillStyle = '#141c28';
      for (let hx = -14; hx < 14; hx += 8) {
        ctx.fillRect(hx, 20, 4, 4);
      }
    } else if (cfg.body === 'train') {
      // 新幹線エアロノーズフェアリング＋2灯LEDヘッドライト
      fillBevelArmor(ctx, [
        [-29, -18], [29, -18], [23, 12], [0, 19], [-23, 12]
      ], '#f5f8fc', rp.outline, 1.9, '#ffffff');
      ctx.fillStyle = '#ff4081';
      ctx.fillRect(-26, -5, 52, 4.5);
      // 2灯シャープLEDライト
      [-15, 15].forEach((lx) => {
        ctx.beginPath();
        ctx.ellipse(lx, -10, 6.2, 3.6, lx < 0 ? 0.18 : -0.18, 0, Math.PI * 2);
        ctx.fillStyle = '#fff59d';
        ctx.fill();
        ctx.strokeStyle = rp.outline;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      });
    } else if (cfg.body === 'rocket') {
      // アポロ・ツインインテークタービン＋中央ゲージ
      [-16, 16].forEach((tx) => {
        ctx.beginPath();
        ctx.arc(tx, -4, 9.5, 0, Math.PI * 2);
        ctx.fillStyle = '#121a28';
        ctx.fill();
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = '#cfd8dc';
        ctx.stroke();
        ctx.save();
        ctx.translate(tx, -4);
        ctx.rotate(t * 7 * (tx < 0 ? 1 : -1));
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 1.8;
        for (let b = 0; b < 3; b++) {
          const a = (b / 3) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(a) * 6.5, Math.sin(a) * 6.5);
          ctx.stroke();
        }
        ctx.restore();
      });
      // 中央計器バー
      roundRectPath(ctx, -6, -12, 12, 22, 4);
      ctx.fillStyle = '#121a28';
      ctx.fill();
      ctx.fillStyle = '#ffd600';
      ctx.fillRect(-3.5, -8, 7, 4);
      ctx.fillStyle = '#00e5ff';
      ctx.fillRect(-3.5, -1, 7, 4);
    } else if (cfg.body === 'cosmic') {
      // ダークマター・リアクター＋周回プラネットリング
      ctx.beginPath();
      ctx.arc(0, 0, 15.5, 0, Math.PI * 2);
      ctx.fillStyle = '#0b1022';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#b388ff';
      ctx.stroke();

      const cg = ctx.createRadialGradient(-3, -3, 1, 0, 0, 11);
      cg.addColorStop(0, '#ffffff');
      cg.addColorStop(0.45, '#00e5ff');
      cg.addColorStop(1, '#4a148c');
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(0, 0, 10.5, 0, Math.PI * 2);
      ctx.fill();

      // 斜め周回リング
      ctx.save();
      ctx.rotate(-0.35 + Math.sin(t * 1.8) * 0.12);
      ctx.strokeStyle = '#ffd600';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.ellipse(0, 0, 26, 7, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else {
      // スターコア：凹型タービンベゼル＋回転ホロリング＋スターコア
      ctx.beginPath();
      ctx.arc(0, -1, 16.5, 0, Math.PI * 2);
      ctx.fillStyle = makeGunmetalGrad(ctx, -16, -17, 16, 15);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = rp.outline;
      ctx.stroke();

      ctx.save();
      ctx.translate(0, -1);
      ctx.rotate(t * 2.4);
      ctx.strokeStyle = rp.glow;
      ctx.lineWidth = 2.2;
      ctx.setLineDash([7, 5]);
      ctx.beginPath();
      ctx.arc(0, 0, 13, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      drawStarShape(ctx, 0, -1, 5, 11.5, 5.2, '#ffd600');
      drawStarShape(ctx, 0, -1, 5, 6.2, 2.8, '#ffffff');
    }

    // 首の落ち影
    ctx.fillStyle = 'rgba(4, 10, 24, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, -29, 16, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 5. 両腕パーツ (ARM: 面取り肩パウルドロン + 肘関節 + 武器全6種差別化)
    [-1, 1].forEach((dir) => {
      ctx.save();
      ctx.translate(dir * 42, -16);
      ctx.rotate(dir * armWave);

      // 立体肩パウルドロン（外側へせり出すヒーロー肩装甲）
      ctx.save();
      ctx.scale(dir, 1);
      fillBevelArmor(ctx, [
        [-11, -14], [15, -18], [19, 3], [11, 11], [-12, 8]
      ], makeMetalGrad(ctx, -12, -18, 19, 11, rp), rp.outline, 2, rp.rim);
      // 肩スリット発光
      ctx.fillStyle = rp.glow;
      polyPath(ctx, [[-4, -8], [10, -10], [11, -6], [-4, -4]]);
      ctx.fill();
      ctx.restore();

      // 上腕フレーム＆肘関節
      roundRectPath(ctx, -7, 7, 14, 12, 4);
      ctx.fillStyle = makeGunmetalGrad(ctx, -7, 7, 7, 19);
      ctx.fill();
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = rp.outline;
      ctx.stroke();
      drawJointSocket(ctx, 0, 17, 6.2, rp.outline);

      // 面取り前腕アーマー
      fillBevelArmor(ctx, [
        [-11, 19], [11, 19], [10, 35], [-10, 35]
      ], makeMetalGrad(ctx, -11, 19, 11, 35, rp, -dir), rp.outline, 1.9, rp.rim);

      // 先端武装分岐
      if (cfg.arm === 'drill') {
        // 回転スパイラル・メガドリル
        ctx.save();
        polyPath(ctx, [[-11, 35], [11, 35], [0, 62]]);
        const dg = ctx.createLinearGradient(-11, 35, 11, 35);
        dg.addColorStop(0, '#546e7a');
        dg.addColorStop(0.42, '#eceff1');
        dg.addColorStop(0.7, '#90a4ae');
        dg.addColorStop(1, '#37474f');
        ctx.fillStyle = dg;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = rp.outline;
        ctx.stroke();

        ctx.clip();
        const phase = (t * 3.4) % 1;
        ctx.strokeStyle = '#ffd600';
        ctx.lineWidth = 2.6;
        for (let k = -1; k <= 4; k++) {
          const y0 = 33 + (k + phase) * 7;
          ctx.beginPath();
          ctx.moveTo(-12, y0);
          ctx.lineTo(12, y0 + 5);
          ctx.stroke();
        }
        ctx.restore();
      } else if (cfg.arm === 'laser') {
        // デュアルレール・プラズマキャノン
        fillBevelArmor(ctx, [
          [-12, 33], [12, 33], [10, 50], [-10, 50]
        ], makeGunmetalGrad(ctx, -12, 33, 12, 50), rp.outline, 1.8, '#90a4b8');
        ctx.fillStyle = '#00e5ff';
        ctx.fillRect(-7, 36, 3.5, 10);
        ctx.fillRect(3.5, 36, 3.5, 10);
        const orbR = 5.5 + Math.sin(t * 10) * 0.9;
        const og = ctx.createRadialGradient(0, 52, 1, 0, 52, orbR);
        og.addColorStop(0, '#ffffff');
        og.addColorStop(0.55, '#00e5ff');
        og.addColorStop(1, 'rgba(0, 229, 255, 0)');
        ctx.fillStyle = og;
        ctx.beginPath();
        ctx.arc(0, 52, orbR + 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (cfg.arm === 'claw') {
        // 3本サイバーラプトル・クロー
        [-7, 0, 7].forEach((xOff, idx) => {
          const tipY = idx === 1 ? 55 : 51;
          polyPath(ctx, [[xOff - 3, 35], [xOff + 3, 35], [xOff * 1.25, tipY]]);
          ctx.fillStyle = makeGoldGrad(ctx, xOff - 3, 35, xOff + 3, tipY);
          ctx.fill();
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = rp.outline;
          ctx.stroke();
        });
      } else if (cfg.arm === 'shield') {
        if (dir === -1) {
          // 左腕：エネルギーフィールド付きイージス・タワーシールド
          fillBevelArmor(ctx, [
            [-23, 8], [5, 8], [7, 42], [-9, 55], [-25, 42]
          ], makeMetalGrad(ctx, -25, 8, 7, 55, rp), rp.outline, 2.2, '#ffffff');
          // 内側シアンエネルギープレート
          polyPath(ctx, [[-19, 14], [1, 14], [2, 39], [-9, 48], [-20, 39]]);
          const sg = ctx.createLinearGradient(-20, 14, 2, 48);
          sg.addColorStop(0, 'rgba(0, 229, 255, 0.88)');
          sg.addColorStop(1, 'rgba(21, 101, 192, 0.92)');
          ctx.fillStyle = sg;
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.4;
          ctx.stroke();
          drawStarShape(ctx, -9, 30, 4, 7, 3.2, '#ffd600');
        } else {
          // 右腕：ビームサーベル＆装甲ガントレット
          fillBevelArmor(ctx, [
            [-9, 34], [9, 34], [8, 44], [-8, 44]
          ], makeGunmetalGrad(ctx, -9, 34, 9, 44), rp.outline, 1.8);
          // 発光ビームブレード
          const bg = ctx.createLinearGradient(0, 44, 0, 74);
          bg.addColorStop(0, '#ffffff');
          bg.addColorStop(0.55, '#00e5ff');
          bg.addColorStop(1, 'rgba(0, 229, 255, 0)');
          ctx.fillStyle = bg;
          ctx.beginPath();
          ctx.moveTo(-4, 44);
          ctx.lineTo(0, 75);
          ctx.lineTo(4, 44);
          ctx.closePath();
          ctx.fill();
        }
      } else if (cfg.arm === 'crane') {
        // 黄黒ハザード＋油圧ピストン＋大型グラップル爪
        ctx.fillStyle = '#ffd600';
        ctx.fillRect(-8, 22, 16, 10);
        ctx.fillStyle = '#141c28';
        ctx.fillRect(-4, 22, 4, 10);
        ctx.fillRect(4, 22, 4, 10);
        // ツイン爪
        [-1, 1].forEach((cd) => {
          ctx.save();
          ctx.scale(cd, 1);
          polyPath(ctx, [[3, 35], [10, 35], [12, 46], [5, 53], [2, 49], [6, 44]]);
          ctx.fillStyle = '#cfd8dc';
          ctx.fill();
          ctx.lineWidth = 1.6;
          ctx.strokeStyle = rp.outline;
          ctx.stroke();
          ctx.restore();
        });
      } else {
        // ロケットナックル：黄金ナックルガード付き重装甲拳
        fillBevelArmor(ctx, [
          [-11, 34], [11, 34], [10, 48], [-10, 48]
        ], makeGoldGrad(ctx, -11, 34, 11, 48), rp.outline, 1.9, '#ffffff');
        ctx.strokeStyle = rp.outline;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(-5, 42);
        ctx.lineTo(-5, 48);
        ctx.moveTo(0, 42);
        ctx.lineTo(0, 48);
        ctx.moveTo(5, 42);
        ctx.lineTo(5, 48);
        ctx.stroke();
      }
      ctx.restore();
    });

    // 5.5 必殺ハイパービーム本体（頭部の背後に走らせて英雄シルエットを保つ）
    if (state.pose === 'beam') {
      ctx.save();
      const pulse = 18 + Math.sin(t * 36) * 4.5;
      const beamGrad = ctx.createLinearGradient(0, 2, 0, -235);
      beamGrad.addColorStop(0, '#ffffff');
      beamGrad.addColorStop(0.25, '#ffd600');
      beamGrad.addColorStop(0.65, '#00e5ff');
      beamGrad.addColorStop(1, 'rgba(0, 229, 255, 0)');
      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.moveTo(-pulse * 0.85, 2);
      ctx.lineTo(-pulse * 1.85, -235);
      ctx.lineTo(pulse * 1.85, -235);
      ctx.lineTo(pulse * 0.85, 2);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.moveTo(-pulse * 0.38, 2);
      ctx.lineTo(-pulse * 0.72, -210);
      ctx.lineTo(pulse * 0.72, -210);
      ctx.lineTo(pulse * 0.38, 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // 6. 頭部パーツ (HEAD: 立体ヘルメット + 曲面ガラスバイザー + シャープLEDアイ)
    ctx.save();
    ctx.translate(0, -54 + Math.sin(t * 3.4 + 0.6) * 1.8);

    // 耳センサーポッド（全頭共通サイドメカディテール）
    [-1, 1].forEach((dir) => {
      ctx.save();
      ctx.scale(dir, 1);
      fillBevelArmor(ctx, [
        [24, -12], [33, -8], [33, 10], [24, 14]
      ], makeGunmetalGrad(ctx, 24, -12, 33, 14), rp.outline, 1.8, '#90a4b8');
      ctx.fillStyle = rp.glow;
      ctx.fillRect(27, -3, 3, 7);
      ctx.restore();
    });

    if (cfg.head === 'tyranno') {
      // ティラノ装甲ヘルム＋多層ゴールドトサカ＋メタリック牙ガード
      fillBevelArmor(ctx, [
        [-27, -20], [0, -26], [27, -20], [29, 10], [20, 22], [-20, 22], [-29, 10]
      ], makeMetalGrad(ctx, -29, -26, 29, 22, rp), rp.outline, 2.2, rp.rim);

      [-13, 0, 13].forEach((tx, idx) => {
        const tipY = idx === 1 ? -40 : -34;
        polyPath(ctx, [[tx - 5.5, -21], [tx + 5.5, -21], [tx, tipY]]);
        ctx.fillStyle = makeGoldGrad(ctx, tx - 5, tipY, tx + 5, -21);
        ctx.fill();
        ctx.lineWidth = 1.6;
        ctx.strokeStyle = rp.outline;
        ctx.stroke();
      });
    } else if (cfg.head === 'tricera') {
      // 大型装甲フリル＋リベット＋立体3本ゴールドホーン
      fillBevelArmor(ctx, [
        [-34, 4], [-31, -24], [-14, -34], [14, -34], [31, -24], [34, 4], [24, 14], [-24, 14]
      ], makeMetalGrad(ctx, -34, -34, 34, 14, rp, -1), rp.outline, 2.1, '#ffd600');
      // フリルリベット
      [-25, -13, 0, 13, 25].forEach((rx) => {
        ctx.beginPath();
        ctx.arc(rx, -22, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = '#ffd600';
        ctx.fill();
      });

      fillBevelArmor(ctx, [
        [-25, -18], [25, -18], [26, 11], [17, 22], [-17, 22], [-26, 11]
      ], makeMetalGrad(ctx, -26, -18, 26, 22, rp), rp.outline, 2.1, rp.rim);

      [-18, 0, 18].forEach((hx, idx) => {
        const tipY = idx === 1 ? -34 : -42;
        polyPath(ctx, [[hx - 5, -17], [hx + 5, -17], [hx * 1.25, tipY]]);
        ctx.fillStyle = makeGoldGrad(ctx, hx - 5, tipY, hx + 5, -17);
        ctx.fill();
        ctx.lineWidth = 1.6;
        ctx.strokeStyle = rp.outline;
        ctx.stroke();
      });
    } else if (cfg.head === 'rescue') {
      // コマンダーヘルム＋赤/青交互発光サイレン＋回転サーチライト
      fillBevelArmor(ctx, [
        [-27, -20], [27, -20], [28, 10], [18, 22], [-18, 22], [-28, 10]
      ], makeMetalGrad(ctx, -28, -20, 28, 22, rp), rp.outline, 2.2, rp.rim);

      const phase = Math.sin(t * 10) > 0;
      const beamAng = Math.sin(t * 5) * 0.45;
      ctx.save();
      ctx.translate(0, -28);
      ctx.rotate(beamAng);
      const sg = ctx.createLinearGradient(0, 0, 0, -26);
      sg.addColorStop(0, phase ? 'rgba(255, 23, 68, 0.52)' : 'rgba(0, 229, 255, 0.52)');
      sg.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.moveTo(-4, 0);
      ctx.lineTo(-16, -24);
      ctx.lineTo(16, -24);
      ctx.lineTo(4, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      roundRectPath(ctx, -14, -33, 28, 13, 5);
      ctx.fillStyle = '#182232';
      ctx.fill();
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = rp.outline;
      ctx.stroke();
      ctx.fillStyle = phase ? '#ff1744' : '#7f0000';
      ctx.fillRect(-11, -30, 10, 7);
      ctx.fillStyle = phase ? '#004d73' : '#00e5ff';
      ctx.fillRect(1, -30, 10, 7);
    } else if (cfg.head === 'shinkansen') {
      // エアロ流線形はやぶさヘルム＋鋭角フィン＋スピードライン
      fillBevelArmor(ctx, [
        [-27, 16], [-28, -4], [-14, -27], [0, -34], [14, -27], [28, -4], [27, 16], [17, 22], [-17, 22]
      ], makeMetalGrad(ctx, -28, -34, 28, 22, rp), rp.outline, 2.2, '#ffffff');
      // 額スピードライン
      ctx.fillStyle = '#ff4081';
      polyPath(ctx, [[-24, 5], [24, 5], [22, 10], [-22, 10]]);
      ctx.fill();
      // 中央エアロノーズブレード
      polyPath(ctx, [[-4, -33], [4, -33], [3, -14], [-3, -14]]);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    } else if (cfg.head === 'king') {
      // カイザーヘルム＋豪華5本ゴールドクラウン＋中央ジュエル
      fillBevelArmor(ctx, [
        [-27, -20], [27, -20], [28, 10], [18, 22], [-18, 22], [-28, 10]
      ], makeMetalGrad(ctx, -28, -20, 28, 22, rp), rp.outline, 2.2, rp.rim);

      fillBevelArmor(ctx, [
        [-24, -18], [-20, -40], [-9, -25], [0, -45], [9, -25], [20, -40], [24, -18]
      ], makeGoldGrad(ctx, -24, -45, 24, -18), rp.outline, 1.9, '#ffffff');

      // 中央ダイヤジュエル
      polyPath(ctx, [[0, -29], [5, -22], [0, -15], [-5, -22]]);
      ctx.fillStyle = '#00e5ff';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    } else {
      // アストロバイザー：ツインVフィンアンテナ＋額センサー
      fillBevelArmor(ctx, [
        [-27, -20], [0, -25], [27, -20], [28, 10], [18, 22], [-18, 22], [-28, 10]
      ], makeMetalGrad(ctx, -28, -25, 28, 22, rp), rp.outline, 2.2, rp.rim);

      // ヒーローVフィン
      [-1, 1].forEach((dir) => {
        ctx.save();
        ctx.scale(dir, 1);
        polyPath(ctx, [[2, -20], [24, -42], [20, -32], [5, -16]]);
        ctx.fillStyle = makeGoldGrad(ctx, 2, -42, 24, -16);
        ctx.fill();
        ctx.lineWidth = 1.6;
        ctx.strokeStyle = rp.outline;
        ctx.stroke();
        ctx.restore();
      });
      // 額メインカメラ
      roundRectPath(ctx, -5, -26, 10, 8, 2.5);
      ctx.fillStyle = '#00e5ff';
      ctx.fill();
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = rp.outline;
      ctx.stroke();
    }

    // 下顎・マウスガード（かっこいいロボット顔らしさの要！）
    fillBevelArmor(ctx, [
      [-14, 11], [14, 11], [10, 21], [-10, 21]
    ], rp.base.id === 'white' ? '#cfd8dc' : '#e6eef6', rp.outline, 1.7, '#ffffff');
    if (cfg.head === 'tyranno') {
      // キバ塗装ディテール
      ctx.fillStyle = '#ff3d57';
      polyPath(ctx, [[-11, 11], [-7, 17], [-3, 11]]);
      ctx.fill();
      polyPath(ctx, [[3, 11], [7, 17], [11, 11]]);
      ctx.fill();
    } else {
      // フェイスプレート・スリット
      ctx.strokeStyle = '#546e7a';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(-6, 15);
      ctx.lineTo(6, 15);
      ctx.moveTo(-4, 18);
      ctx.lineTo(4, 18);
      ctx.stroke();
    }

    // 曲面ガラスバイザー＆シャープLEDアイ
    const visorPts = [[-22, -11], [22, -11], [19, 8], [8, 10], [-8, 10], [-19, 8]];
    polyPath(ctx, visorPts);
    const vg = ctx.createLinearGradient(0, -11, 0, 10);
    vg.addColorStop(0, '#070f22');
    vg.addColorStop(1, '#102242');
    ctx.fillStyle = vg;
    ctx.fill();
    ctx.lineWidth = 1.9;
    ctx.strokeStyle = rp.outline;
    ctx.stroke();

    // バイザー内側の斜めガラス光沢
    ctx.save();
    polyPath(ctx, visorPts);
    ctx.clip();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
    polyPath(ctx, [[-24, -13], [-4, -13], [-16, 12], [-26, 12]]);
    ctx.fill();
    polyPath(ctx, [[4, -13], [11, -13], [-1, 12], [-8, 12]]);
    ctx.fill();
    ctx.restore();

    const blink = Math.sin(t * 2.1) > 0.97 ? 0.16 : 1;
    if (state.pose === 'happy') {
      ctx.strokeStyle = '#ffd600';
      ctx.lineWidth = 3.2;
      ctx.lineCap = 'round';
      [-10, 10].forEach((ex) => {
        ctx.beginPath();
        ctx.arc(ex, 0.5, 5.2, Math.PI * 1.12, Math.PI * 1.88);
        ctx.stroke();
      });
      ctx.fillStyle = 'rgba(255, 110, 160, 0.58)';
      ctx.beginPath();
      ctx.arc(-15, 4.5, 3, 0, Math.PI * 2);
      ctx.arc(15, 4.5, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (state.pose === 'surprised') {
      [-10, 10].forEach((ex) => {
        ctx.beginPath();
        ctx.arc(ex, -1.5, 5.8, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ex, -1.5, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#091228';
        ctx.fill();
      });
      ctx.fillStyle = '#40c4ff';
      ctx.beginPath();
      ctx.moveTo(23, -15);
      ctx.quadraticCurveTo(28, -7, 23, -3);
      ctx.quadraticCurveTo(18, -7, 23, -15);
      ctx.fill();
    } else if (state.pose === 'beam') {
      // 白熱発光ツインオプティック＋光フレア
      [-1, 1].forEach((dir) => {
        ctx.save();
        ctx.translate(dir * 10, -1.5);
        polyPath(ctx, [[-dir * 6, -3.5], [dir * 6.5, -5.5], [dir * 5.5, 3], [-dir * 5, 3.5]]);
        ctx.fillStyle = '#00e5ff';
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-3, -1.5, 6, 2.4);
        ctx.restore();
      });
    } else {
      // カッコいい鋭角ヒーローLEDアイ（自然なまばたき＋光彩）
      [-1, 1].forEach((dir) => {
        ctx.save();
        ctx.translate(dir * 10, -1.5);
        ctx.scale(1, blink);
        polyPath(ctx, [
          [-dir * 5.8, -3.2],
          [dir * 6.4, -5.2],
          [dir * 5.2, 3.2],
          [-dir * 4.8, 3.6]
        ]);
        ctx.fillStyle = '#ffd600';
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-dir * 1.2, -1, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }

    ctx.restore(); // head

    // 7. 必殺ハイパービーム前景チャージ＆電撃スパーク
    if (state.pose === 'beam') {
      ctx.save();
      // 胸元チャージリング＆コアフレア
      const flare = ctx.createRadialGradient(0, 0, 2, 0, 0, 26);
      flare.addColorStop(0, 'rgba(255, 255, 255, 0.92)');
      flare.addColorStop(0.55, 'rgba(0, 229, 255, 0.48)');
      flare.addColorStop(1, 'rgba(0, 229, 255, 0)');
      ctx.fillStyle = flare;
      ctx.beginPath();
      ctx.arc(0, 0, 26, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(0, 229, 255, 0.85)';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.arc(0, 0, 21 + Math.sin(t * 42) * 3, 0, Math.PI * 2);
      ctx.stroke();

      // 電撃スパーク（頭部外側を駆け上がる）
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.8;
      for (let s = -1; s <= 1; s += 2) {
        ctx.beginPath();
        ctx.moveTo(s * 14, -14);
        ctx.lineTo(s * 34, -58 + Math.sin(t * 50) * 6);
        ctx.lineTo(s * 24, -116);
        ctx.lineTo(s * 38, -176);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 8. 装着フラッシュ演出（ガレージパーツ交換時）
    if (ef > 0) {
      ctx.save();
      const ringR = 24 + (1 - ef) * 58;
      ctx.strokeStyle = rp.glow;
      ctx.globalAlpha = ef * 0.85;
      ctx.lineWidth = 3.5 * ef + 1;
      ctx.beginPath();
      ctx.arc(0, -10, ringR, 0, Math.PI * 2);
      ctx.stroke();

      // 斜めキラリ閃光
      const sweepY = -95 + (1 - ef) * 185;
      ctx.globalAlpha = ef * 0.7;
      ctx.fillStyle = '#ffffff';
      polyPath(ctx, [[-48, sweepY - 8], [48, sweepY - 24], [48, sweepY - 12], [-48, sweepY + 4]]);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore(); // body
    ctx.restore(); // root
  }

  /* =========================================================================
   * きょうだい合体ロボ「ギャラクシー・ツインカイザー」DX超合金描画
   * ========================================================================= */
  function drawCombinedMegaRobot(ctx, cx, cy, scale, cfgLeft, cfgRight, t, beamActive = false) {
    const rp1 = getRichPalette((cfgLeft && cfgLeft.color) || 'cyan');
    const rp2 = getRichPalette((cfgRight && cfgRight.color) || 'red');
    const bob = Math.sin(t * 5) * 3.5 + (beamActive ? Math.sin(t * 48) * 1.5 : 0);

    ctx.save();
    ctx.translate(cx, cy + bob);
    ctx.scale(scale, scale);

    // 背面巨大エネルギー光翼（左右カラー＋黄金＋シアン多段ブレード）
    const wingPulse = 1 + Math.sin(t * 14) * 0.06;
    [-1, 1].forEach((d) => {
      const rp = d === -1 ? rp1 : rp2;
      ctx.save();
      ctx.scale(d * wingPulse, 1);
      const wg = ctx.createLinearGradient(18, -10, 142, -92);
      wg.addColorStop(0, rp.main);
      wg.addColorStop(0.5, '#ffd600');
      wg.addColorStop(1, 'rgba(0, 229, 255, 0.25)');
      fillBevelArmor(ctx, [
        [24, -18], [138, -90], [116, -24], [140, -2], [108, 22], [28, 22]
      ], wg, '#0a1428', 2.4, '#ffffff');

      // 羽根内部の光線スリット
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(34, -8);
      ctx.lineTo(122, -72);
      ctx.moveTo(34, 6);
      ctx.lineTo(120, -2);
      ctx.stroke();
      ctx.restore();
    });

    // 左右合体レッグ（膝ゴールドスパイク付き重装甲）
    [-1, 1].forEach((d) => {
      const rp = d === -1 ? rp1 : rp2;
      ctx.save();
      ctx.translate(d * 24, 42);
      roundRectPath(ctx, -12, -8, 24, 18, 5);
      ctx.fillStyle = makeGunmetalGrad(ctx, -12, -8, 12, 10);
      ctx.fill();

      fillBevelArmor(ctx, [
        [-15, 6], [15, 6], [17, 38], [-17, 38]
      ], makeMetalGrad(ctx, -17, 6, 17, 38, rp), '#0a1428', 2.4, '#ffffff');
      // 膝スパイク
      fillBevelArmor(ctx, [
        [-10, 2], [0, -8], [10, 2], [8, 15], [-8, 15]
      ], makeGoldGrad(ctx, -10, -8, 10, 15), '#0a1428', 1.8);
      // 重装甲ブーツ
      fillBevelArmor(ctx, [
        [-18, 35], [18, 35], [22, 50], [-22, 50]
      ], makeMetalGrad(ctx, -22, 35, 22, 50, rp), '#0a1428', 2.4, '#ffffff');
      ctx.restore();
    });

    // 骨盤ガード
    fillBevelArmor(ctx, [
      [-34, 26], [34, 26], [28, 44], [0, 50], [-28, 44]
    ], makeGunmetalGrad(ctx, -34, 26, 34, 50), '#ffd600', 2.4);

    // 巨大合体ボディ（左右ツートン面取り装甲）
    const megaChest = [
      [-48, -32], [-22, -38], [22, -38], [48, -32],
      [42, 16], [30, 36], [-30, 36], [-42, 16]
    ];
    ctx.save();
    polyPath(ctx, megaChest);
    ctx.clip();
    ctx.fillStyle = makeMetalGrad(ctx, -48, -38, 0, 36, rp1);
    ctx.fillRect(-52, -40, 52, 80);
    ctx.fillStyle = makeMetalGrad(ctx, 0, -38, 48, 36, rp2);
    ctx.fillRect(0, -40, 52, 80);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    polyPath(ctx, [[-50, -40], [18, -40], [-14, 40], [-52, 40]]);
    ctx.fill();
    ctx.restore();
    polyPath(ctx, megaChest);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffd600';
    ctx.stroke();

    // 黄金V字クレスト＆逆回転ツインスター・リアクター
    fillBevelArmor(ctx, [
      [-42, -26], [-26, -26], [0, -5], [26, -26], [42, -26], [36, -10], [0, 12], [-36, -10]
    ], makeGoldGrad(ctx, -42, -26, 42, 12), '#091326', 2, '#ffffff');

    ctx.save();
    ctx.translate(0, 8);
    ctx.rotate(t * 2.5);
    drawStarShape(ctx, 0, 0, 8, 21, 10, '#ffffff');
    ctx.rotate(-t * 5.0);
    drawStarShape(ctx, 0, 0, 8, 14.5, 6.8, '#00e5ff');
    ctx.restore();

    // 両肩バスターキャノン＆大型ガントレットアーム
    [-1, 1].forEach((d) => {
      const rp = d === -1 ? rp1 : rp2;
      ctx.save();
      ctx.translate(d * 56, -14);
      // ショルダーアーマー＋肩キャノン
      ctx.save();
      ctx.scale(d, 1);
      fillBevelArmor(ctx, [
        [-14, -18], [18, -24], [22, 4], [14, 15], [-15, 12]
      ], makeMetalGrad(ctx, -15, -24, 22, 15, rp), '#ffd600', 2.4, '#ffffff');
      ctx.restore();
      roundRectPath(ctx, -12, 12, 24, 34, 6);
      ctx.fillStyle = makeGunmetalGrad(ctx, -12, 12, 12, 46);
      ctx.fill();
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = '#00e5ff';
      ctx.stroke();
      ctx.fillStyle = '#00e5ff';
      ctx.beginPath();
      ctx.arc(0, 48, 9.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 48, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 7色ハイパーレーザー（背後の空へ発射し、合体皇帝の頭部シルエットを際立たせる）
    if (beamActive) {
      const pulse = 32 + Math.sin(t * 42) * 8;
      const g = ctx.createLinearGradient(0, -10, 0, -420);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.25, '#ffd600');
      g.addColorStop(0.55, '#00e5ff');
      g.addColorStop(0.85, '#ff4081');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-pulse * 0.85, -10);
      ctx.lineTo(-pulse * 2.1, -420);
      ctx.lineTo(pulse * 2.1, -420);
      ctx.lineTo(pulse * 0.85, -10);
      ctx.closePath();
      ctx.fill();
    }

    // 合体皇帝ヘッド＋巨大Vフィンクラウン
    ctx.save();
    ctx.translate(0, -64);
    fillBevelArmor(ctx, [
      [-31, -24], [31, -24], [32, 11], [21, 24], [-21, 24], [-32, 11]
    ], '#182644', '#ffd600', 2.8, '#ffffff');

    fillBevelArmor(ctx, [
      [-28, -22], [-37, -56], [-12, -32], [0, -60], [12, -32], [37, -56], [28, -22]
    ], makeGoldGrad(ctx, -37, -60, 37, -22), '#091326', 2, '#ffffff');

    polyPath(ctx, [[0, -34], [5.5, -25], [0, -16], [-5.5, -25]]);
    ctx.fillStyle = '#00e5ff';
    ctx.fill();

    // 合体マウスガード
    fillBevelArmor(ctx, [
      [-15, 11], [15, 11], [11, 23], [-11, 23]
    ], '#e6eef6', '#091326', 1.8, '#ffffff');
    ctx.strokeStyle = '#546e7a';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-7, 15);
    ctx.lineTo(7, 15);
    ctx.moveTo(-4, 19);
    ctx.lineTo(4, 19);
    ctx.stroke();

    // バイザー＋鋭角ツインアイ
    polyPath(ctx, [[-23, -12], [23, -12], [20, 8], [-20, 8]]);
    ctx.fillStyle = '#060d1f';
    ctx.fill();
    [-1, 1].forEach((dir) => {
      ctx.save();
      ctx.translate(dir * 11, -2);
      polyPath(ctx, [[-dir * 6, -3.5], [dir * 7, -5.5], [dir * 6, 3.5], [-dir * 5, 3.5]]);
      ctx.fillStyle = '#00e5ff';
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-3, -1.5, 6, 2.5);
      ctx.restore();
    });
    ctx.restore();

    // 胸コア発光フレア＆同心円ショックウェーブ
    if (beamActive) {
      const flare = ctx.createRadialGradient(0, 6, 2, 0, 6, 34);
      flare.addColorStop(0, 'rgba(255,255,255,0.9)');
      flare.addColorStop(0.5, 'rgba(0,229,255,0.45)');
      flare.addColorStop(1, 'rgba(0,229,255,0)');
      ctx.fillStyle = flare;
      ctx.beginPath();
      ctx.arc(0, 6, 34, 0, Math.PI * 2);
      ctx.fill();

      for (let w = 0; w < 3; w++) {
        const prog = ((t * 2.6 + w * 0.33) % 1);
        const ry = -126 - prog * 150;
        ctx.strokeStyle = w % 2 === 0 ? '#ffd600' : '#00e5ff';
        ctx.globalAlpha = (1 - prog) * 0.8;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(0, ry, 28 + prog * 36, 9 + prog * 10, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  /* =========================================================================
   * 宇宙怪獣描画エンジン（3D透過スプライト優先 + ベクターフォールバック）
   * ========================================================================= */
  function drawMonster(ctx, cx, cy, scale, bossIndex, t, hitFlash = 0) {
    ctx.save();
    ctx.translate(cx, cy + Math.sin(t * 2.6) * 5);
    ctx.scale(scale, scale);

    const kind = bossIndex % 3;
    const bossImg = RoboAssets.getImage('boss_' + kind);
    if (bossImg) {
      const breath = 1 + Math.sin(t * 3.1) * 0.03;
      const w = 152 * breath;
      const h = 152 * breath;
      // 背後オーラ
      const aura = ctx.createRadialGradient(0, 0, 14, 0, 0, 78);
      aura.addColorStop(0, kind === 0 ? 'rgba(186,104,200,0.45)' : kind === 1 ? 'rgba(255,145,0,0.45)' : 'rgba(0,229,255,0.45)');
      aura.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(0, 0, 78, 0, Math.PI * 2);
      ctx.fill();

      ctx.drawImage(bossImg, -w / 2, -h / 2, w, h);
    } else if (kind === 0) {
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

      const bgImg = RoboAssets.getImage('bg_space_lab');
      if (bgImg) {
        const imgRatio = bgImg.naturalWidth / bgImg.naturalHeight;
        const viewRatio = w / h;
        let dw = w, dh = h, dx = 0, dy = 0;
        if (viewRatio > imgRatio) {
          dw = w;
          dh = w / imgRatio;
          dy = (h - dh) * 0.5;
        } else {
          dh = h;
          dw = h * imgRatio;
          dx = (w - dw) * 0.5;
        }
        ctx.drawImage(bgImg, dx, dy, dw, dh);
        const veil = ctx.createLinearGradient(0, 0, 0, h);
        veil.addColorStop(0, 'rgba(7, 14, 34, 0.36)');
        veil.addColorStop(0.55, 'rgba(12, 24, 56, 0.44)');
        veil.addColorStop(1, 'rgba(14, 24, 52, 0.58)');
        ctx.fillStyle = veil;
        ctx.fillRect(0, 0, w, h);
      } else {
        const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
        bgGrad.addColorStop(0, '#070e22');
        bgGrad.addColorStop(0.55, '#102048');
        bgGrad.addColorStop(1, '#192a56');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);
      }

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

  window.RoboAssets = RoboAssets;
  window.RoboParts = RoboParts;
  window.RoboRenderer = {
    getPalette,
    getRobotDisplayName,
    roundRectPath,
    drawStarShape,
    drawGearShape,
    drawRobot,
    drawCombinedMegaRobot,
    drawMonster,
    ParticleSystem,
    startStarfield
  };
})();
