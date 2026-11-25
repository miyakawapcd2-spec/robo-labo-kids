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
    roboPhys: { yOffset: 0, vy: 0, jumping: false, pose: 'idle', poseTimer: 0 },

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

    close() {
      this.active = false;
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
            window.RoboVoice.speak('ガチャを まわすと ゲットできるよ！');
            return;
          }
          currentCfg[this.category] = part.id;
          window.AdaptiveAI.save();
          window.RoboAudio.snap();
          this.particles.burst(this.w * 0.5, this.h * 0.55, '#00e5ff', 20, 200);
          this.refreshHeader();
          this.renderPartsGrid();
          window.RoboVoice.speak(`${part.name} そうちゃく！`);
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
      const pool = window.AdaptiveAI.getLockedPartsPool();
      if (pool.length === 0) {
        window.RoboAudio.stageClear();
        this.particles.confetti(this.w, this.h, 40);
        window.RoboVoice.speak('すべての パーツを コンプリートしているよ！すごすぎる！');
        return;
      }
      if (window.AdaptiveAI.state.stars < 5) {
        window.RoboAudio.gentleHint();
        window.RoboVoice.speak('スターが 5こ ひつようだよ！ゲームで スターを あつめよう！');
        this.particles.popText(this.w * 0.5, this.h * 0.4, '⭐あと ' + (5 - window.AdaptiveAI.state.stars) + 'こ！', '#ffd600');
        return;
      }

      window.AdaptiveAI.addStars(-5);
      const won = window.AdaptiveAI.unlockRandomPart();
      window.RoboAudio.gacha();
      this.particles.confetti(this.w, this.h, 45);

      if (won) {
        this.category = won.cat;
        document.querySelectorAll('#garageCatTabs .pcat-btn').forEach((b) =>
          b.classList.toggle('active', b.getAttribute('data-cat') === won.cat)
        );
        // ゲットした新パーツを早速装着！
        window.AdaptiveAI.state.robots[this.slot][won.cat] = won.part.id;
        window.AdaptiveAI.save();
        this.particles.popText(this.w * 0.5, this.h * 0.32, `NEW! ${won.part.name}`, '#ffd600');
        Promise.resolve(
          window.RoboVoice.speak('やったー！あたらしい パーツを ゲットしたよ！', { priority: 'praise', interrupt: true })
        ).then(() => {
          window.RoboVoice.speak(`${won.part.name} そうちゃく！`, { priority: 'prompt', interrupt: false });
        });
      }

      this.refreshHeader();
      this.renderPartsGrid();
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
    },

    draw(t) {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.w, this.h);

      // ドック床リング
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.45)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(this.w * 0.5, this.h * 0.82, 74, 16, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      const cfg = window.AdaptiveAI.state.robots[this.slot];
      const sc = Math.min(0.86, this.h / 245);
      window.RoboRenderer.drawRobot(
        ctx,
        this.w * 0.5,
        this.h * 0.56 + this.roboPhys.yOffset,
        sc,
        cfg,
        { time: t, pose: this.roboPhys.pose, jumping: this.roboPhys.jumping }
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
      desc: 'おおきな あご と するどい キバを もつ きょうりゅうの 王さま！かむ ちからは くるまを ぺちゃんこに できるほど つよかったんだよ。',
      fact: '💡 ひらめき豆知識：バナナの ような 太い 歯が 約60本も はえていて、おれても なんども はえかわったよ！'
    },
    {
      id: 'tricera', cat: 'dino', catName: 'きょうりゅう', icon: '🛡️',
      title: 'トリケラトプス',
      sub: '3本の ツノと おおきな フリル',
      desc: 'あたまに 3本の ながい ツノと、たてのような おおきな えりかざり（フリル）を もつ やさしい 草食きょうりゅうだよ。',
      fact: '💡 ひらめき豆知識：「トリケラトプス」という なまえは「3本のツノがある顔」という いみなんだ！'
    },
    {
      id: 'ptera', cat: 'dino', catName: 'きょうりゅう', icon: '🦅',
      title: 'プテラノドン',
      sub: 'おおぞらを とぶ 翼竜（よくりゅう）',
      desc: 'つばさを ひろげると 7メートル以上！グライダーのように 風に のって 海の うえを とび、さかなを つかまえていたよ。',
      fact: '💡 ひらめき豆知識：じつは きょうりゅうの なかまではなく「翼竜（よくりゅう）」という 空とぶ はちゅうるいだよ！'
    },
    {
      id: 'brachio', cat: 'dino', catName: 'きょうりゅう', icon: '🦕',
      title: 'ブラキオサウルス',
      sub: 'ビルのように たかい ながいクビ',
      desc: 'マンションの 4かいだて くらい 背が たかい 超巨大きょうりゅう！たかい 木の うえの はっぱを むしゃむしゃ たべていたよ。',
      fact: '💡 ひらめき豆知識：あたままで 血を おくるために、とっても おおきくて パワフルな 心臓を もっていたよ！'
    },
    {
      id: 'stego', cat: 'dino', catName: 'きょうりゅう', icon: '🌿',
      title: 'ステゴサウルス',
      sub: 'せなかの プレートと トゲのしっぽ',
      desc: 'せなかに おおきな ひし形の プレートが ずらりと ならび、しっぽの さきには 4本の するどい スパイクが ついているよ。',
      fact: '💡 ひらめき豆知識：せなかの プレートに 太陽の 光を あてて、からだの 温度を ちょうせつしていたと いわれているよ！'
    },
    {
      id: 'spino', cat: 'dino', catName: 'きょうりゅう', icon: '🐊',
      title: 'スピノサウルス',
      sub: 'およぐのが とくいな 水辺のハンター',
      desc: 'せなかに ヨットの 帆のような おおきな ヒレが ある きょうりゅう！川や みずうみを すいすい およいで 巨大魚を つかまえたよ。',
      fact: '💡 ひらめき豆知識：ティラノサウルスよりも からだの 長さが ながく、全長15メートルほど あったよ！'
    },
    // 🚀 うちゅう・のりもの (5)
    {
      id: 'rocket', cat: 'space', catName: 'うちゅう・のりもの', icon: '🚀',
      title: 'スペースロケット',
      sub: '地球の 重力を こえて 宇宙へ！',
      desc: 'ものすごい いきおいで ガスを ふきだして、空の むこうの 宇宙まで とんでいく のりものだよ！',
      fact: '💡 ひらめき豆知識：地球から 宇宙へ とびだすには、1秒間に 約8キロメートル（新幹線より ずっと速い！）の スピードが いるよ！'
    },
    {
      id: 'blackhole', cat: 'space', catName: 'うちゅう・のりもの', icon: '🕳️',
      title: 'ブラックホール',
      sub: '光も にげられない ふしぎな天体',
      desc: 'とっても おおきな 星が 一生の さいごに ぎゅーっと ちぢんで できた、とてつもない 重力を もつ 宇宙の うずまきだよ。',
      fact: '💡 ひらめき豆知識：ブラックホールの すぐ ちかくでは、時間の すすみかたが ゆっくりに なるんだ！'
    },
    {
      id: 'solar', cat: 'space', catName: 'うちゅう・のりもの', icon: '🪐',
      title: 'たいようけいの わくせい',
      sub: '太陽の まわりを まわる 8つの星',
      desc: 'わたしたちの 地球や、わっかの ある 土星、おおきな 木星など 8つの わくせいが 太陽の まわりを ぐるぐる まわっているよ。',
      fact: '💡 ひらめき豆知識：太陽に近いじゅんばんは「水・金・地・火・木・土・天・海（すいきんちかもくどってんかい）」と おぼえよう！'
    },
    {
      id: 'shinkansen', cat: 'space', catName: 'うちゅう・のりもの', icon: '🚄',
      title: 'シンカンセン（新幹線）',
      sub: '風を きって はしる 超特急！',
      desc: 'ながーい くちばしのような 先頭デザインで、トンネルに はいったときの 空気の 音を ちいさくして 速く はしれるよ！',
      fact: '💡 ひらめき豆知識：はやぶさ号の 長い はなは、鳥の「カワセミ」の くちばしを ヒントに 発明されたんだよ！'
    },
    {
      id: 'firetruck', cat: 'space', catName: 'うちゅう・のりもの', icon: '🚒',
      title: 'はしご しょうぼうしゃ',
      sub: 'たかい ビルの 火事も たすける！',
      desc: 'ぐんぐん のびる 長いはしごと 強力な ポンプで、たかい 場所の 人を たすけたり 水を かけたりする ヒーローカー！',
      fact: '💡 ひらめき豆知識：長い はしごは ビルの 10かい〜15かい くらいの 高さ（30〜50メートル）まで とどくよ！'
    },
    // ⚙️ かがくのひみつ (5)
    {
      id: 'gear', cat: 'mech', catName: 'かがくのひみつ', icon: '⚙️',
      title: 'はぐるま（ギア）の ひみつ',
      sub: 'スピードと パワーを へんしん！',
      desc: 'ギザギザの 歯が かみあうことで、回る ちからを つたえる パーツだよ。時計から ロボット、くるままで 大かつやく！',
      fact: '💡 ひらめき豆知識：小さい ギアで 大きい ギアを まわすと、ゆっくりに なるかわりに ものすごい パワーが でるよ！'
    },
    {
      id: 'magnet', cat: 'mech', catName: 'かがくのひみつ', icon: '🧲',
      title: 'じしゃくの パワー',
      sub: 'Nきょく と Sきょく の ふしぎ',
      desc: '鉄を ピタッと くっつける ふしぎな 石！あかい N極と あおい S極は なかよく くっつき、おなじ 極どうしは はなれようと するよ。',
      fact: '💡 ひらめき豆知識：わたしたちが すむ「地球」そのものも、じつは 巨大な じしゃく なんだよ！だから コンパスが 動くんだね。'
    },
    {
      id: 'elec', cat: 'mech', catName: 'かがくのひみつ', icon: '⚡',
      title: 'かみなりと でんき',
      sub: 'ピカッ！ゴロゴロ！空のエネルギー',
      desc: '雲の なかの 氷の つぶが ぶつかりあって でんきが たまり、いっきに 地面へ ながれるのが カミナリだよ！',
      fact: '💡 ひらめき豆知識：光の ほうが 音よりも ずっと 速いから、ピカッと 光ってから すこし おくれて ゴロゴロと 聞こえるよ！'
    },
    {
      id: 'rainbow', cat: 'mech', catName: 'かがくのひみつ', icon: '🌈',
      title: 'にじの ひかり',
      sub: '雨あがりの 空に でる 7色のアーチ',
      desc: '太陽の 白い 光には、じつは いろんな 色の 光が かくれているよ。雨粒に あたって はねかえると 7色の にじに 見えるんだ！',
      fact: '💡 ひらめき豆知識：太陽を せなかに して 雨上がりの 空を 見ると にじが 見つかりやすいよ！'
    },
    {
      id: 'airobo', cat: 'mech', catName: 'かがくのひみつ', icon: '🤖',
      title: 'プログラムと AIロボット',
      sub: 'めいれいで 考え、うごく ロボット',
      desc: 'ロボットは「まえに すすめ」「もし カベが あったら まがれ」という プログラムの めいれいで 正確に うごくよ！',
      fact: '💡 ひらめき豆知識：AI（人工知能）は たくさんの けいけんから 自分で べんきょうして かしこくなる プログラムだよ！'
    }
  ];

  const ZukanManager = {
    currentCat: 'all',
    detailItem: null,
    detailRaf: null,

    init() {
      document.querySelectorAll('.zcat-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          window.RoboAudio.tap();
          this.currentCat = btn.getAttribute('data-zcat');
          document.querySelectorAll('.zcat-btn').forEach((b) => b.classList.toggle('active', b === btn));
          this.renderGrid();
        });
      });

      document.getElementById('btnZdSpeak').addEventListener('click', () => {
        if (this.detailItem) {
          const it = this.detailItem;
          Promise.resolve(
            window.RoboVoice.speak(`${it.title}。${it.desc}`, { priority: 'praise', interrupt: true, force: true })
          ).then(() => {
            if (this.detailItem === it) {
              window.RoboVoice.speak(it.fact, { priority: 'prompt', interrupt: false, force: true });
            }
          });
        }
      });

      document.getElementById('btnZdClose').addEventListener('click', () => {
        this.closeDetail();
      });
    },

    open() {
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
        card.innerHTML = `
          <div class="zukan-card-icon">${item.icon}</div>
          <div class="zukan-card-title">${item.title}</div>
          <div class="zukan-card-sub">${item.sub}</div>
        `;
        card.addEventListener('click', () => this.openDetail(item));
        grid.appendChild(card);
      });
    },

    openDetail(item) {
      this.detailItem = item;
      window.RoboAudio.snap();
      document.getElementById('zdCategoryTag').textContent = item.catName;
      document.getElementById('zdTitle').textContent = item.title;
      document.getElementById('zdDescription').textContent = item.desc;
      document.getElementById('zdFunFact').textContent = item.fact;
      document.getElementById('modal-zukan-detail').classList.remove('hidden');

      window.RoboVoice.speak(`${item.title}。${item.desc}`);

      const cv = document.getElementById('zukanDetailCanvas');
      const ctx = cv.getContext('2d');
      if (this.detailRaf) cancelAnimationFrame(this.detailRaf);

      const renderAnim = (now) => {
        if (!this.detailItem) return;
        const t = now * 0.001;
        drawZukanCanvasArt(ctx, cv.width, cv.height, item, t);
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

  function drawZukanCanvasArt(ctx, w, h, item, t) {
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h / 2;

    if (item.id === 'gear') {
      window.RoboRenderer.drawGearShape(ctx, cx - 34, cy, 34, 10, t * 1.6, '#00e5ff', '#ffffff');
      window.RoboRenderer.drawGearShape(ctx, cx + 34, cy, 26, 8, -t * 1.6 * (34 / 26), '#ffd600', '#ffffff');
      return;
    }
    if (item.id === 'solar') {
      ctx.beginPath();
      ctx.arc(cx, cy, 22, 0, Math.PI * 2);
      ctx.fillStyle = '#ffd600';
      ctx.fill();
      [44, 68, 92].forEach((orbR, idx) => {
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.beginPath();
        ctx.arc(cx, cy, orbR, 0, Math.PI * 2);
        ctx.stroke();
        const a = t * (1.8 - idx * 0.45) + idx * 2;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * orbR, cy + Math.sin(a) * orbR, 7 + idx * 2, 0, Math.PI * 2);
        ctx.fillStyle = ['#00e5ff', '#ff5252', '#ffab40'][idx];
        ctx.fill();
      });
      return;
    }
    if (item.id === 'rainbow') {
      const cols = ['#ff1744', '#ff9100', '#ffd600', '#00e676', '#00b0ff', '#3f51b5', '#ab47bc'];
      cols.forEach((col, i) => {
        ctx.strokeStyle = col;
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.arc(cx, h - 18, 92 - i * 7, Math.PI, 0);
        ctx.stroke();
      });
      return;
    }

    // 共通ダイナミックアイコン＆オーラ演出
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.35)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, 64 + Math.sin(t * 3) * 5, 0, Math.PI * 2);
    ctx.stroke();

    ctx.font = '76px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.icon, cx + Math.sin(t * 2.5) * 8, cy + Math.cos(t * 3.2) * 5);
    ctx.restore();
  }

  window.GarageManager = GarageManager;
  window.ZukanManager = ZukanManager;
})();
