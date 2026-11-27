(function () {
  'use strict';

  /* =========================================================================
   * ISO/IEC 18004 準拠 軽量QRコードSVG生成器（Byteモード・ECC Level L）
   * PC画面からiPhone標準カメラで読み取れるQRコードをオフラインでも確実に生成
   * ========================================================================= */
  const QRGenerator = (function () {
    // Version 1〜4 (ECC Level L) パラメータ: [size, totalCodewords, ecCodewords]
    const VERSIONS = [
      null,
      { v: 1, size: 21, total: 26,  ec: 7,  align: [] },
      { v: 2, size: 25, total: 44,  ec: 10, align: [6, 18] },
      { v: 3, size: 29, total: 70,  ec: 15, align: [6, 22] },
      { v: 4, size: 33, total: 100, ec: 20, align: [6, 26] }
    ];

    const GF_EXP = new Uint8Array(512);
    const GF_LOG = new Uint8Array(256);
    (function initGF() {
      let x = 1;
      for (let i = 0; i < 255; i++) {
        GF_EXP[i] = x;
        GF_LOG[x] = i;
        x <<= 1;
        if (x & 0x100) x ^= 0x11d;
      }
      for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
    })();

    function gfMul(a, b) {
      return (a === 0 || b === 0) ? 0 : GF_EXP[GF_LOG[a] + GF_LOG[b]];
    }

    function reedSolomonCompute(data, ecLen) {
      let gen = [1];
      for (let i = 0; i < ecLen; i++) {
        const next = new Array(gen.length + 1).fill(0);
        const factor = GF_EXP[i];
        for (let j = 0; j < gen.length; j++) {
          next[j] ^= gen[j];
          next[j + 1] ^= gfMul(gen[j], factor);
        }
        gen = next;
      }
      const rem = new Uint8Array(ecLen);
      for (let i = 0; i < data.length; i++) {
        const factor = data[i] ^ rem[0];
        for (let j = 0; j < ecLen - 1; j++) rem[j] = rem[j + 1];
        rem[ecLen - 1] = 0;
        for (let j = 0; j < ecLen; j++) {
          rem[j] ^= gfMul(gen[j + 1], factor);
        }
      }
      return rem;
    }

    function encodeBytes(str) {
      const bytes = new TextEncoder().encode(str);
      let ver = VERSIONS.find(( info ) => info && (info.total - info.ec - 2) >= bytes.length);
      if (!ver) return null;

      const dataCap = ver.total - ver.ec;
      const bits = [];
      const pushBits = (val, len) => {
        for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1);
      };

      pushBits(0b0100, 4); // Byte mode
      pushBits(bytes.length, 8);
      for (const b of bytes) pushBits(b, 8);
      for (let i = 0; i < 4 && bits.length < dataCap * 8; i++) bits.push(0);
      while (bits.length % 8 !== 0) bits.push(0);

      const dataWords = [];
      for (let i = 0; i < bits.length; i += 8) {
        let w = 0;
        for (let b = 0; b < 8; b++) w = (w << 1) | bits[i + b];
        dataWords.push(w);
      }
      let padIdx = 0;
      while (dataWords.length < dataCap) {
        dataWords.push(padIdx % 2 === 0 ? 0xec : 0x11);
        padIdx++;
      }

      const ecWords = reedSolomonCompute(dataWords, ver.ec);
      const allWords = dataWords.concat(Array.from(ecWords));

      const N = ver.size;
      const mat = Array.from({ length: N }, () => new Array(N).fill(false));
      const isFunc = Array.from({ length: N }, () => new Array(N).fill(false));

      const setFunc = (r, c, dark) => {
        if (r < 0 || r >= N || c < 0 || c >= N) return;
        mat[r][c] = dark;
        isFunc[r][c] = true;
      };

      const drawFinder = (r0, c0) => {
        for (let dy = -1; dy <= 7; dy++) {
          for (let dx = -1; dx <= 7; dx++) {
            const r = r0 + dy, c = c0 + dx;
            const dark = (dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6) &&
              (dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4));
            setFunc(r, c, dark);
          }
        }
      };

      drawFinder(0, 0);
      drawFinder(0, N - 7);
      drawFinder(N - 7, 0);

      for (let i = 8; i < N - 8; i++) {
        setFunc(6, i, i % 2 === 0);
        setFunc(i, 6, i % 2 === 0);
      }

      if (ver.align.length > 0) {
        const c0 = ver.align[1], r0 = ver.align[1];
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            setFunc(r0 + dy, c0 + dx, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
          }
        }
      }

      // フォーマット情報予約領域 + ダークモジュール
      for (let i = 0; i <= 8; i++) {
        if (!isFunc[8][i]) setFunc(8, i, false);
        if (!isFunc[i][8]) setFunc(i, 8, false);
      }
      for (let i = 0; i < 8; i++) {
        setFunc(8, N - 1 - i, false);
        setFunc(N - 1 - i, 8, false);
      }
      setFunc(N - 8, 8, true);

      // データビット配置（ジグザグ2列スキャン）
      const streamBits = [];
      for (const w of allWords) {
        for (let b = 7; b >= 0; b--) streamBits.push((w >>> b) & 1);
      }

      let bitIdx = 0;
      let upward = true;
      for (let right = N - 1; right >= 1; right -= 2) {
        if (right === 6) right = 5;
        for (let vert = 0; vert < N; vert++) {
          const r = upward ? (N - 1 - vert) : vert;
          for (let j = 0; j < 2; j++) {
            const c = right - j;
            if (!isFunc[r][c]) {
              const bit = bitIdx < streamBits.length ? streamBits[bitIdx++] === 1 : false;
              // Mask 0: (r + c) % 2 === 0
              mat[r][c] = ((r + c) % 2 === 0) ? !bit : bit;
            }
          }
        }
        upward = !upward;
      }

      // Format info for ECC Level L (01) + Mask 0 (000) => BCH encoded + XOR 0x5412 = 0x77c4 (30660)
      const fmtBits = 0x77c4;
      const getFmt = (i) => ((fmtBits >>> i) & 1) === 1;
      for (let i = 0; i <= 5; i++) mat[8][i] = getFmt(14 - i);
      mat[8][7] = getFmt(8);
      mat[8][8] = getFmt(7);
      mat[7][8] = getFmt(6);
      for (let i = 0; i <= 5; i++) mat[5 - i][8] = getFmt(5 - i);

      for (let i = 0; i < 7; i++) mat[N - 1 - i][8] = getFmt(14 - i);
      for (let i = 0; i < 8; i++) mat[8][N - 8 + i] = getFmt(7 - i);

      return { size: N, mat };
    }

    function toSVG(text) {
      const qr = encodeBytes(text);
      if (!qr) return '<div style="color:#111;font-size:11px;">URLが ながすぎます</div>';
      const pad = 2;
      const dim = qr.size + pad * 2;
      let rects = '';
      for (let r = 0; r < qr.size; r++) {
        for (let c = 0; c < qr.size; c++) {
          if (qr.mat[r][c]) {
            rects += `<rect x="${c + pad}" y="${r + pad}" width="1" height="1" fill="#091128"/>`;
          }
        }
      }
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim} ${dim}" shape-rendering="crispEdges"><rect width="${dim}" height="${dim}" fill="#ffffff"/>${rects}</svg>`;
    }

    return { toSVG, encodeBytes };
  })();

  /* =========================================================================
   * AppMain: 画面遷移・タイトルロボ演出・保護者レポート・全体統合
   * ========================================================================= */
  const HERO_GREETINGS = [
    'タッチしてくれて ありがとう！きょうは どの ほしへ いく？',
    'ぼくを カッコよく かいぞうするときは ロボガレージを おしてね！',
    'ふたりタッグなら、きょうだいで 合体レーザーが うてるよ！',
    'もんだいが むずかしくても だいじょうぶ！いっしょに ちょうせんしよう！'
  ];

  const PUBLIC_PWA_URL = 'https://miyakawapcd2-spec.github.io/robo-labo-kids/';

  const AppMain = {
    currentScreen: 'screen-title',
    heroPose: 'idle',
    heroPoseTimer: 0,
    heroRafId: null,
    lastGameContext: null,

    init() {
      window.RoboAudio.init();
      const st = window.AdaptiveAI.init();
      window.RoboVoice.speakerId = typeof st.voiceSpeakerId === 'number' ? st.voiceSpeakerId : 3;
      window.RoboVoice.init();

      window.RoboAudio.setSoundEnabled(st.soundOn);
      window.RoboVoice.enabled = st.voiceOn;

      window.RoboRenderer.startStarfield(document.getElementById('bgCanvas'));
      window.ZukanManager.init();

      this.bindHomeControls();
      this.syncSpeakerBadge();
      this.startHeroRoboLoop();
      this.applySelectedAgeUI(st.selectedAge || '4', true);
      if (st.soundOn) {
        window.RoboAudio.playBgm('title');
        const bbl = document.getElementById('heroSpeechBubble');
        if (bbl && (!window.RoboAudio.ctx || window.RoboAudio.ctx.state !== 'running')) {
          bbl.textContent = '🔊 タッチで おとON！';
        }
      }
      this.refreshHomeBadges();
      this.registerPWA();
    },

    syncSpeakerBadge() {
      const preset = window.RoboVoice.getCurrentPreset();
      const lbl = document.getElementById('currentSpeakerLabel');
      if (lbl && preset) {
        lbl.textContent = preset.credit;
      }
    },

    showScreen(screenId) {
      document.querySelectorAll('.screen').forEach((sec) => {
        sec.classList.toggle('active', sec.id === screenId);
      });
      this.currentScreen = screenId;
      // P2 #17: タイトル画面以外ではヒーローロボCanvasループ自体を停止して省電力化
      if (screenId === 'screen-title') {
        this.startHeroRoboLoop();
      } else if (this.heroRafId) {
        cancelAnimationFrame(this.heroRafId);
        this.heroRafId = null;
      }
    },

    bindHomeControls() {
      // 音・声切替
      const soundBtn = document.getElementById('btnSoundToggle');
      const voiceBtn = document.getElementById('btnVoiceToggle');
      const syncAudioButtons = () => {
        soundBtn.classList.toggle('off', !window.AdaptiveAI.state.soundOn);
        soundBtn.innerHTML = `${window.AdaptiveAI.state.soundOn ? '🔊' : '🔇'} <span>おと</span>`;
        voiceBtn.classList.toggle('off', !window.AdaptiveAI.state.voiceOn);
        voiceBtn.innerHTML = `${window.AdaptiveAI.state.voiceOn ? '🗣️' : '🤫'} <span>こえ</span>`;
      };
      syncAudioButtons();

      soundBtn.addEventListener('click', () => {
        window.AdaptiveAI.state.soundOn = !window.AdaptiveAI.state.soundOn;
        window.RoboAudio.setSoundEnabled(window.AdaptiveAI.state.soundOn);
        window.AdaptiveAI.save();
        if (window.AdaptiveAI.state.soundOn) {
          window.RoboAudio.tap();
          window.RoboAudio.playBgm('title');
        }
        syncAudioButtons();
      });

      voiceBtn.addEventListener('click', () => {
        window.AdaptiveAI.state.voiceOn = !window.AdaptiveAI.state.voiceOn;
        window.RoboVoice.enabled = window.AdaptiveAI.state.voiceOn;
        window.AdaptiveAI.save();
        window.RoboAudio.tap();
        if (window.RoboVoice.enabled) {
          window.RoboVoice.speak('こえで もんだいを よむよ！', true);
        } else {
          window.RoboVoice.stop();
        }
        syncAudioButtons();
      });

      // タイトルロボのタップリアクション
      let greetIdx = 0;
      document.getElementById('heroRoboTapArea').addEventListener('pointerdown', () => {
        window.RoboAudio.jump();
        window.RoboAudio.playBgm('title');
        this.heroPose = 'happy';
        this.heroPoseTimer = 1.0;
        const msg = HERO_GREETINGS[greetIdx++ % HERO_GREETINGS.length];
        document.getElementById('heroSpeechBubble').textContent = 'やったー！✨';
        window.RoboVoice.speak(msg, { priority: 'ui', interrupt: true });
      });

      // タイトル画面のVOICEVOXキャラクターワンタップ切替
      const cycleBtn = document.getElementById('btnCycleSpeaker');
      if (cycleBtn) {
        cycleBtn.addEventListener('click', () => {
          window.RoboAudio.snap();
          const next = window.RoboVoice.cycleSpeaker();
          window.AdaptiveAI.state.voiceSpeakerId = next.id;
          window.AdaptiveAI.save();
          this.syncSpeakerBadge();
          window.RoboVoice.speak(next.sample, true);
        });
      }

      // 年齢・モード切替タブ
      document.querySelectorAll('.age-tab').forEach((tab) => {
        tab.addEventListener('click', () => {
          window.RoboAudio.tap();
          window.RoboAudio.playBgm('title');
          const age = tab.getAttribute('data-age');
          this.applySelectedAgeUI(age, false);
        });
      });

      // ソロ知育ミッション起動
      document.querySelectorAll('.mission-card').forEach((card) => {
        card.addEventListener('click', () => {
          window.RoboAudio.snap();
          const gameType = card.getAttribute('data-game');
          const age = window.AdaptiveAI.state.selectedAge === '7' ? '7' : '4';
          this.launchSoloGame(gameType, age);
        });
      });

      // タッグレイアウト切替＆出撃
      const initCoopLayout = window.AdaptiveAI.state.coopLayout || 'side';
      document.querySelectorAll('[data-coop-layout]').forEach((b) => {
        b.classList.toggle('active', b.getAttribute('data-coop-layout') === initCoopLayout);
      });
      document.querySelectorAll('[data-coop-layout]').forEach((btn) => {
        btn.addEventListener('click', () => {
          window.RoboAudio.tap();
          const lay = btn.getAttribute('data-coop-layout');
          window.AdaptiveAI.state.coopLayout = lay;
          window.AdaptiveAI.save();
          document.querySelectorAll('[data-coop-layout]').forEach((b) => b.classList.toggle('active', b === btn));
        });
      });

      document.getElementById('btnStartCoop').addEventListener('click', () => {
        window.RoboAudio.snap();
        this.launchCoopGame();
      });

      // プレイ中戻る＆読み上げリピート
      document.getElementById('btnPlayBack').addEventListener('click', () => {
        window.RoboAudio.tap();
        window.SoloGames.stop();
        this.returnToHome();
      });
      document.getElementById('btnSpeakQuestion').addEventListener('click', () => {
        window.RoboAudio.tap();
        window.SoloGames.speakCurrentPrompt();
      });

      // タッグ画面戻る＆反転
      document.getElementById('btnCoopBack').addEventListener('click', () => {
        window.RoboAudio.tap();
        window.CoopGame.stop();
        this.returnToHome();
      });
      document.getElementById('btnCoopFlip').addEventListener('click', () => {
        window.CoopGame.toggleFlip();
      });

      // ガレージ＆図鑑
      document.getElementById('btnOpenGarage').addEventListener('click', () => {
        window.RoboAudio.snap();
        const defSlot = window.AdaptiveAI.state.selectedAge === '7' ? 1 : 0;
        this.showScreen('screen-garage');
        window.GarageManager.open(defSlot);
      });
      document.getElementById('btnGarageBack').addEventListener('click', () => {
        window.RoboAudio.tap();
        window.GarageManager.close();
        this.returnToHome();
      });

      document.getElementById('btnOpenZukan').addEventListener('click', () => {
        window.RoboAudio.snap();
        this.showScreen('screen-zukan');
        window.ZukanManager.open();
      });
      document.getElementById('btnZukanBack').addEventListener('click', () => {
        window.RoboAudio.tap();
        if (window.ZukanManager && window.ZukanManager.detailItem) {
          window.ZukanManager.closeDetail();
        } else {
          window.RoboVoice.stop();
        }
        this.returnToHome();
      });

      // リザルトモーダル
      document.getElementById('btnResultNext').addEventListener('click', () => {
        window.RoboAudio.snap();
        document.getElementById('modal-result').classList.add('hidden');
        if (!this.lastGameContext) return;
        if (this.lastGameContext.gameType === 'coop') {
          this.launchCoopGame();
        } else {
          this.launchSoloGame(this.lastGameContext.gameType, this.lastGameContext.age);
        }
      });

      document.getElementById('btnResultHome').addEventListener('click', () => {
        window.RoboAudio.tap();
        document.getElementById('modal-result').classList.add('hidden');
        this.returnToHome();
      });

      // 保護者モーダル＆QR接続ガイド
      const bonusBtn = document.getElementById('btnAddBonusStars');
      let holdTimer = null;
      let holdStart = 0;
      let holdInterval = null;
      let resetLabelTimer = null;
      const defaultBonusLabel = '🔒 3びょう ながおしで スター+15（おうちのひとよう）';
      const cancelHold = (completed = false) => {
        if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
        if (holdInterval) { clearInterval(holdInterval); holdInterval = null; }
        if (resetLabelTimer) { clearTimeout(resetLabelTimer); resetLabelTimer = null; }
        if (!completed) bonusBtn.textContent = defaultBonusLabel;
      };

      document.getElementById('btnParentModal').addEventListener('click', () => {
        window.RoboAudio.tap();
        this.openParentModal();
      });
      document.getElementById('btnParentClose').addEventListener('click', () => {
        cancelHold(false);
        document.getElementById('modal-parent').classList.add('hidden');
      });
      document.getElementById('btnParentCloseBottom').addEventListener('click', () => {
        cancelHold(false);
        document.getElementById('modal-parent').classList.add('hidden');
      });

      // P2 #13: 保護者用関門（3秒間長押しホールドでのみ発火し、子どもの誤タップでは絶対に加算されない）
      bonusBtn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        cancelHold();
        holdStart = performance.now();
        holdInterval = setInterval(() => {
          const sec = Math.max(0, 3 - (performance.now() - holdStart) / 1000);
          bonusBtn.textContent = `⏳ そのまま ながおし… あと ${sec.toFixed(1)}びょう`;
        }, 100);
        holdTimer = setTimeout(() => {
          cancelHold(true);
          window.AdaptiveAI.addStars(15);
          window.RoboAudio.correct();
          bonusBtn.textContent = '✅ +15こ プレゼント かんりょう！';
          this.refreshHomeBadges();
          resetLabelTimer = setTimeout(() => {
            resetLabelTimer = null;
            bonusBtn.textContent = defaultBonusLabel;
          }, 1400);
        }, 3000);
      });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => {
        bonusBtn.addEventListener(ev, () => cancelHold(false));
      });
    },

    applySelectedAgeUI(age, silent) {
      window.AdaptiveAI.state.selectedAge = age;
      window.AdaptiveAI.save();

      document.querySelectorAll('.age-tab').forEach((t) => {
        t.classList.toggle('active', t.getAttribute('data-age') === age);
      });

      const soloPanel = document.getElementById('soloMissionsPanel');
      const coopPanel = document.getElementById('coopMissionsPanel');

      if (age === 'coop') {
        soloPanel.classList.add('hidden');
        coopPanel.classList.remove('hidden');
        if (!silent) window.RoboVoice.speak('ふたりで きょうりょく！きょうだいタッグモード！', { priority: 'ui', interrupt: true });
      } else {
        soloPanel.classList.remove('hidden');
        coopPanel.classList.add('hidden');
        if (age === '4') {
          document.getElementById('tagMath').textContent = 'かず・おおきさ';
          document.getElementById('descMath').textContent = 'ほしを かぞえて いんせきを こわそう！';
          document.getElementById('tagShape').textContent = 'いろ・かたち';
          document.getElementById('descShape').textContent = 'パーツを はめて のりもの・きょうりゅう かんせい！';
          document.getElementById('tagLogic').textContent = 'なぞりめいろ';
          document.getElementById('descLogic').textContent = 'ゆびで みちを かいて カギと ゴールへ！';
          document.getElementById('tagWord').textContent = 'ひらがな・ことば';
          document.getElementById('descWord').textContent = 'えを みて ひらがなを えらんで ビーム！';
          if (!silent) window.RoboVoice.speak('4さい モード！すきな ゲームを えらんでね！', { priority: 'ui', interrupt: true });
        } else {
          document.getElementById('tagMath').textContent = '10づくり・けいさん';
          document.getElementById('descMath').textContent = 'すうじを つないで がったいビームを うとう！';
          document.getElementById('tagShape').textContent = 'はぐるま かいろ';
          document.getElementById('descShape').textContent = 'おおきい・ちいさい ギアで コアを まわそう！';
          document.getElementById('tagLogic').textContent = 'プログラミング';
          document.getElementById('descLogic').textContent = 'コマンドと くりかえしで ローバーを うごかそう！';
          document.getElementById('tagWord').textContent = 'かんじ・よみかた';
          document.getElementById('descWord').textContent = 'かんじの よみかたや かたちを クリアしよう！';
          if (!silent) window.RoboVoice.speak('7さい モード！ひらめきミッションに ちょうせんだ！', { priority: 'ui', interrupt: true });
        }
        this.refreshHomeBadges();
      }
    },

    refreshHomeBadges() {
      const st = window.AdaptiveAI.state;
      document.getElementById('totalStarsCount').textContent = String(st.stars);

      const ageKey = st.selectedAge === '7' ? '7' : '4';
      document.getElementById('lvBadgeMath').textContent  = `Lv.${window.AdaptiveAI.getSkill(ageKey, 'math').level}`;
      document.getElementById('lvBadgeShape').textContent = `Lv.${window.AdaptiveAI.getSkill(ageKey, 'shape').level}`;
      document.getElementById('lvBadgeLogic').textContent = `Lv.${window.AdaptiveAI.getSkill(ageKey, 'logic').level}`;
      const lvWord = document.getElementById('lvBadgeWord');
      if (lvWord) lvWord.textContent = `Lv.${window.AdaptiveAI.getSkill(ageKey, 'word').level}`;

      const canGacha = st.stars >= 5 && window.AdaptiveAI.getLockedPartsPool().length > 0;
      document.getElementById('gachaNotifyBadge').classList.toggle('hidden', !canGacha);
    },

    launchSoloGame(gameType, age) {
      this.lastGameContext = { gameType, age };
      this.showScreen('screen-play');
      window.SoloGames.start(gameType, age, (summary) => {
        this.showResultModal(summary);
      });
    },

    launchCoopGame() {
      const lay = window.AdaptiveAI.state.coopLayout || 'side';
      this.lastGameContext = { gameType: 'coop', age: 'coop' };
      this.showScreen('screen-coop');
      window.CoopGame.start(lay, (summary) => {
        this.showResultModal(summary);
      });
    },

    returnToHome() {
      this.showScreen('screen-title');
      this.refreshHomeBadges();
      window.RoboAudio.playBgm('title');
    },

    showResultModal(summary) {
      this.refreshHomeBadges();
      const comments = {
        math:  'かずと けいさんの パワーが ぐんぐん アップしたよ！',
        shape: 'かたちと しくみを みぬく エンジニアの ひらめきだね！',
        logic: 'じゅんばんを かんがえる プログラミングの てんさいだ！',
        word:  'ひらがなと かんじの ことばパワーが グングン アップしたよ！',
        coop:  'ふたりの きょうだいパワーで うちゅうの へいわを まもったぞ！'
      };
      document.getElementById('resultTitle').textContent =
        summary.gameType === 'coop' ? '🌟 きょうだい だいしょうり！！ 🌟' : '🎉 ステージ クリア！！ 🎉';
      document.getElementById('resultStarsRow').textContent = '⭐'.repeat(Math.min(5, summary.starsEarned));
      document.getElementById('resultComment').textContent = comments[summary.gameType] || comments.math;
      document.getElementById('resultRewardBox').textContent =
        `ごほうび スター +${summary.starsEarned}こ ゲット！（ぜんぶで ⭐${window.AdaptiveAI.state.stars}こ）`;
      document.getElementById('modal-result').classList.remove('hidden');
    },

    openParentModal() {
      // VOICEVOX スピーカー選択グリッド更新
      window.RoboVoice.checkServerStatus().then(() => {
        const badge = document.getElementById('vvStatusBadge');
        if (badge) {
          badge.textContent = window.RoboVoice.vvAvailable
            ? '🟢 VOICEVOX かどうちゅう'
            : '🟡 サーバー みせつぞく';
        }
        this.renderParentSpeakerGrid();
        this.syncSpeakerBadge();
      });
      this.renderParentSpeakerGrid();

      const rep = document.getElementById('parentReportContent');
      const s4 = window.AdaptiveAI.state.skills['4'];
      const s7 = window.AdaptiveAI.state.skills['7'];
      const rows = [
        { label: '🐣 4さい かず',     sk: s4.math },
        { label: '🐣 4さい かたち',   sk: s4.shape },
        { label: '🐣 4さい めいろ',   sk: s4.logic },
        { label: '🐣 4さい ひらがな', sk: s4.word },
        { label: '🚀 7さい けいさん', sk: s7.math },
        { label: '🚀 7さい はぐるま', sk: s7.shape },
        { label: '🚀 7さい ろんり',   sk: s7.logic },
        { label: '🚀 7さい かんじ',   sk: s7.word }
      ];
      rep.innerHTML = rows.map((r) => {
        const pct = Math.min(100, Math.round((r.sk.level / 8) * 100));
        return `
          <div class="rep-row">
            <span class="rep-label">${r.label} (Lv.${r.sk.level})</span>
            <div class="rep-track"><div class="rep-fill" style="width:${pct}%"></div></div>
            <span>${r.sk.solved}もん</span>
          </div>
        `;
      }).join('') + `<div style="font-size:0.78rem;color:#ffe082;margin-top:4px;">🤝 きょうだい がったいバトル げきはすう: ${window.AdaptiveAI.state.coopClears || 0}かい</div>`;

      // HTTPS公開URLを優先表示しつつ、ローカルserver.py稼働時はLAN URLも取得可能にする
      const updateQr = (url) => {
        document.getElementById('lanUrlDisplay').textContent = url;
        document.getElementById('qrCodeContainer').innerHTML = QRGenerator.toSVG(url);
      };

      const isHttpsHosted = window.location.protocol === 'https:';
      updateQr(isHttpsHosted ? window.location.href : PUBLIC_PWA_URL);
      if (window.location.protocol === 'http:' && window.location.port === '8777') {
        fetch('/api/ip').then((r) => r.ok ? r.json() : null).then((data) => {
          if (data && data.url && window.location.hostname === '127.0.0.1') {
            updateQr(data.url);
          }
        }).catch(() => {});
      }

      document.getElementById('modal-parent').classList.remove('hidden');
    },

    renderParentSpeakerGrid() {
      const grid = document.getElementById('vvSpeakerGrid');
      if (!grid) return;
      grid.innerHTML = '';
      window.RoboVoice.presets.forEach((p) => {
        const btn = document.createElement('button');
        btn.className = 'vv-spk-btn' + (p.id === window.RoboVoice.speakerId ? ' active' : '');
        btn.innerHTML = `<span>${p.emoji}</span><span>${p.name}<br><small style="color:#b9f6ca">${p.style}</small></span>`;
        btn.addEventListener('click', () => {
          window.RoboAudio.tap();
          window.RoboVoice.setSpeaker(p.id);
          window.AdaptiveAI.state.voiceSpeakerId = p.id;
          window.AdaptiveAI.save();
          this.syncSpeakerBadge();
          this.renderParentSpeakerGrid();
          window.RoboVoice.speak(p.sample, true);
        });
        grid.appendChild(btn);
      });
    },

    startHeroRoboLoop() {
      const cv = document.getElementById('heroRoboCanvas');
      if (!cv || this.heroRafId) return;
      const ctx = cv.getContext('2d');
      const logicalW = 320;
      const logicalH = 260;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(logicalW * dpr);
      cv.height = Math.round(logicalH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const drawHoloBase = (x, y, rX) => {
        ctx.save();
        const g = ctx.createRadialGradient(x, y, 4, x, y, rX);
        g.addColorStop(0, 'rgba(0, 229, 255, 0.32)');
        g.addColorStop(0.65, 'rgba(0, 200, 255, 0.10)');
        g.addColorStop(1, 'rgba(0, 200, 255, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(x, y, rX, 13, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.45)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.ellipse(x, y, rX * 0.82, 9.5, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      };

      let last = performance.now();

      const loop = (now) => {
        if (this.currentScreen !== 'screen-title') {
          this.heroRafId = null;
          return;
        }
        if (!document.hidden) {
          const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
          last = now;
          if (this.heroPoseTimer > 0) {
            this.heroPoseTimer -= dt;
            if (this.heroPoseTimer <= 0) this.heroPose = 'idle';
          }
          ctx.clearRect(0, 0, logicalW, logicalH);
          const age = window.AdaptiveAI.state.selectedAge;
          if (age === 'coop') {
            drawHoloBase(102, 214, 54);
            drawHoloBase(218, 214, 54);
            window.RoboRenderer.drawRobot(ctx, 102, 138, 0.85, window.AdaptiveAI.state.robots[0], { time: now * 0.001, pose: this.heroPose });
            window.RoboRenderer.drawRobot(ctx, 218, 138, 0.85, window.AdaptiveAI.state.robots[1], { time: now * 0.001 + 0.8, pose: this.heroPose });
          } else {
            drawHoloBase(160, 228, 74);
            const cfg = window.AdaptiveAI.getCurrentRobot(age);
            window.RoboRenderer.drawRobot(ctx, 160, 136, 1.05, cfg, { time: now * 0.001, pose: this.heroPose });
          }
        } else {
          last = now;
        }
        this.heroRafId = requestAnimationFrame(loop);
      };
      this.heroRafId = requestAnimationFrame(loop);
    },

    registerPWA() {
      if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
        const hadController = Boolean(navigator.serviceWorker.controller);
        let reloaded = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (hadController && !reloaded) {
            reloaded = true;
            window.location.reload();
          }
        });
        navigator.serviceWorker.register('./sw.js').catch(() => {});
      }
    }
  };

  window.QRGenerator = QRGenerator;
  window.AppMain = AppMain;

  window.addEventListener('DOMContentLoaded', () => {
    AppMain.init();
  });
})();
