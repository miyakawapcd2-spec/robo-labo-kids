(function () {
  'use strict';

  const STORAGE_KEY = 'robo_labo_kids_save_v2';

  function makeSkillEntry() {
    return { level: 1, exp: 0, streak: 0, missStreak: 0, solved: 0, attempts: 0, recent: [] };
  }

  function createDefaultState() {
    const unlocked = { head: [], body: [], arm: [], leg: [], color: [] };
    if (window.RoboParts) {
      Object.keys(unlocked).forEach((cat) => {
        unlocked[cat] = window.RoboParts[cat].filter((p) => p.starter).map((p) => p.id);
      });
    }
    return {
      stars: 8,
      selectedAge: '4',
      coopLayout: 'side',
      soundOn: true,
      voiceOn: true,
      voiceSpeakerId: 3,
      activeRobotSlot: 0,
      robots: [
        // スロット0: 4さい（おとうとロボ）恐竜カスタム
        { head: 'tyranno', body: 'dino', arm: 'claw', leg: 'dino', color: 'red' },
        // スロット1: 7さい（おにいちゃんロボ）アストロカスタム
        { head: 'astro', body: 'core', arm: 'punch', leg: 'jet', color: 'cyan' }
      ],
      unlocked,
      skills: {
        '4': {
          math:  makeSkillEntry(),
          shape: makeSkillEntry(),
          logic: makeSkillEntry(),
          word:  makeSkillEntry()
        },
        '7': {
          math:  makeSkillEntry(),
          shape: makeSkillEntry(),
          logic: makeSkillEntry(),
          word:  makeSkillEntry()
        }
      },
      // P2 #8: タッグモード専用の統計をソロ習熟度から完全に分離
      coopStats: {
        chargerHits: 0,
        commanderHits: 0,
        commanderAttempts: 0
      },
      coopStage: 1,
      coopClears: 0
    };
  }

  const AdaptiveAI = {
    state: createDefaultState(),

    init() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('robo_labo_kids_save_v1');
        if (raw) {
          const parsed = JSON.parse(raw);
          const def = createDefaultState();
          this.state = Object.assign(def, parsed);
          ['4', '7'].forEach((age) => {
            this.state.skills[age] = Object.assign({}, def.skills[age], (parsed.skills && parsed.skills[age]) || {});
            ['math', 'shape', 'logic', 'word'].forEach((dom) => {
              this.state.skills[age][dom] = Object.assign(makeSkillEntry(), this.state.skills[age][dom]);
              if (!Array.isArray(this.state.skills[age][dom].recent)) {
                this.state.skills[age][dom].recent = [];
              }
            });
          });
          this.state.coopStats = Object.assign(def.coopStats, parsed.coopStats || {});
          if (!Array.isArray(this.state.robots) || this.state.robots.length < 2) {
            this.state.robots = def.robots;
          }
          if (!this.state.unlocked) {
            this.state.unlocked = def.unlocked;
          }
        }
      } catch (_) {
        this.state = createDefaultState();
      }
      return this.state;
    },

    save() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      } catch (_) {}
    },

    getSkill(age, domain) {
      const a = age === '7' ? '7' : '4';
      return this.state.skills[a][domain] || this.state.skills[a].math;
    },

    getCurrentRobot(ageHint) {
      if (ageHint === '4') return this.state.robots[0];
      if (ageHint === '7') return this.state.robots[1];
      return this.state.robots[this.state.activeRobotSlot] || this.state.robots[0];
    },

    addStars(amount) {
      this.state.stars = Math.max(0, (this.state.stars || 0) + amount);
      this.save();
      return this.state.stars;
    },

    /* P2 #8: タッグモード専用の行動記録（ソロ習熟度Lvを汚染しない） */
    recordCoopAction(role, isCorrect) {
      if (!this.state.coopStats) {
        this.state.coopStats = { chargerHits: 0, commanderHits: 0, commanderAttempts: 0 };
      }
      if (role === 'charger') {
        if (isCorrect) this.state.coopStats.chargerHits++;
      } else {
        this.state.coopStats.commanderAttempts++;
        if (isCorrect) this.state.coopStats.commanderHits++;
      }
      this.save();
    },

    /* P2 #9: 昇格だけでなく直近5問の正答率40%未満（1勝以下）で優しくレベルを1下げる双方向適応AI */
    recordAttempt(age, domain, isCorrect, elapsedMs = 4000) {
      const sk = this.getSkill(age, domain);
      sk.attempts++;
      if (!Array.isArray(sk.recent)) sk.recent = [];
      sk.recent.push(isCorrect ? 1 : 0);
      if (sk.recent.length > 5) sk.recent.shift();

      let leveledUp = false;
      let leveledDown = false;

      if (isCorrect) {
        sk.solved++;
        sk.streak++;
        sk.missStreak = 0;
        const speedBonus = elapsedMs < 5500 ? 18 : 12;
        const streakBonus = Math.min(12, sk.streak * 3);
        sk.exp += speedBonus + streakBonus;

        const needed = 35 + sk.level * 15;
        if (sk.exp >= needed && sk.level < 8) {
          sk.exp -= needed;
          sk.level++;
          sk.recent = [];
          leveledUp = true;
        }
      } else {
        sk.streak = 0;
        sk.missStreak++;
        if (sk.recent.length >= 5) {
          const wins = sk.recent.reduce((s, v) => s + v, 0);
          if (wins < 2 && sk.level > 1) {
            sk.level--;
            sk.exp = 0;
            sk.recent = [];
            leveledDown = true;
          }
        }
      }

      this.save();
      return { level: sk.level, streak: sk.streak, missStreak: sk.missStreak, leveledUp, leveledDown };
    },

    needsHint(age, domain) {
      const sk = this.getSkill(age, domain);
      return sk.missStreak >= 1;
    },

    getLockedPartsPool() {
      const pool = [];
      if (!window.RoboParts) return pool;
      Object.keys(window.RoboParts).forEach((cat) => {
        const owned = this.state.unlocked[cat] || [];
        window.RoboParts[cat].forEach((part) => {
          if (!owned.includes(part.id)) {
            pool.push({ cat, part });
          }
        });
      });
      return pool;
    },

    unlockRandomPart() {
      const pool = this.getLockedPartsPool();
      if (pool.length === 0) return null;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      if (!this.state.unlocked[pick.cat]) this.state.unlocked[pick.cat] = [];
      this.state.unlocked[pick.cat].push(pick.part.id);
      this.save();
      return pick;
    },

    /* =======================================================================
     * 算数問題の適応型生成（オフラインVOICEVOXボイスパック完全対応フレーズ）
     * ======================================================================= */
    generateMathQuestion4(level, waveIndex) {
      if (level >= 3 && waveIndex % 3 === 2) {
        const maxN = level >= 6 ? 7 : level >= 4 ? 6 : 5;
        return {
          type: 'sequence',
          maxN,
          prompt: `1 から ${maxN} まで じゅんばんに タッチしよう！`,
          speech: `1から ${maxN} まで、じゅんばんに タッチしよう！`
        };
      }

      if (level >= 4 && waveIndex % 2 === 1) {
        if (level >= 5) {
          const a = 1 + Math.floor(Math.random() * 4);
          const b = 1 + Math.floor(Math.random() * (level >= 7 ? 5 : 4));
          const ans = a + b;
          const choices = makeUniqueChoices(ans, 1, 10, 3);
          return {
            type: 'visual_add',
            a, b, answer: ans, choices,
            prompt: `⭐${a}こ と ⭐${b}こ、あわせて いくつ？`,
            speech: `ほしが ${a}こ と ${b}こ、あわせて いくつかな？`
          };
        } else {
          const a = 1 + Math.floor(Math.random() * 8);
          let b = 1 + Math.floor(Math.random() * 8);
          if (b === a) b = a < 8 ? a + 1 : a - 1;
          const ans = Math.max(a, b);
          return {
            type: 'compare',
            answer: ans,
            choices: [a, b],
            prompt: `かずが【おおきい】ほうの いんせきを タッチ！`,
            speech: `かずが おおきい ほうの いんせきを タッチしてね！`
          };
        }
      }

      const maxCount = level <= 1 ? 5 : level <= 3 ? 7 : 10;
      const minCount = level <= 2 ? 1 : 3;
      const ans = minCount + Math.floor(Math.random() * (maxCount - minCount + 1));
      const choices = makeUniqueChoices(ans, 1, maxCount, 3);
      return {
        type: 'count_dots',
        answer: ans,
        choices,
        prompt: `ほしが【 ${ans} 】この いんせきを タッチ！`,
        speech: `ほしが ${ans}この いんせきを タッチしてね！`
      };
    },

    generateMathQuestion7(level, waveIndex) {
      if (waveIndex % 2 === 0) {
        const targets = [10, 10, 12, 14, 15, 16, 18, 20];
        const target = targets[Math.min(targets.length - 1, level - 1)];
        return {
          type: 'number_chain',
          target,
          prompt: `ゆびで つないで ごうけい【 ${target} 】をつくろう！`,
          speech: `すうじを つないで、ごうけい ${target} を つくろう！`
        };
      }

      if (level <= 2) {
        if (Math.random() < 0.6) {
          const a = 3 + Math.floor(Math.random() * 7);
          const b = 2 + Math.floor(Math.random() * 7);
          const ans = a + b;
          return {
            type: 'calc_shoot',
            expr: `${a} + ${b} = ?`,
            a, b, op: '+',
            answer: ans,
            choices: makeUniqueChoices(ans, Math.max(2, ans - 4), ans + 5, 4),
            prompt: `けいさんレーザー！  ${a} + ${b} = ?`,
            speech: `${a} + ${b} = ?`
          };
        } else {
          const a = 7 + Math.floor(Math.random() * 6);
          const b = 2 + Math.floor(Math.random() * (a - 2));
          const ans = a - b;
          return {
            type: 'calc_shoot',
            expr: `${a} - ${b} = ?`,
            a, b, op: '-',
            answer: ans,
            choices: makeUniqueChoices(ans, 1, ans + 5, 4),
            prompt: `けいさんレーザー！  ${a} - ${b} = ?`,
            speech: `${a} - ${b} = ?`
          };
        }
      } else if (level <= 5) {
        const mode = waveIndex % 3;
        if (mode === 1) {
          const a = 6 + Math.floor(Math.random() * 4);
          const b = (11 - a) + Math.floor(Math.random() * 5);
          const ans = a + b;
          return {
            type: 'calc_shoot',
            expr: `${a} + ${b} = ?`,
            a, b, op: '+',
            answer: ans,
            choices: makeUniqueChoices(ans, 10, 20, 4),
            prompt: `くりあがりチャージ！  ${a} + ${b} = ?`,
            speech: `${a} + ${b} = ?`
          };
        } else if (mode === 0) {
          const ans = 4 + Math.floor(Math.random() * 6);
          const b = 5 + Math.floor(Math.random() * 5);
          const total = ans + b;
          return {
            type: 'calc_shoot',
            expr: `${total} - ${b} = ?`,
            a: total, b, op: '-',
            answer: ans,
            choices: makeUniqueChoices(ans, 2, 13, 4),
            prompt: `シールドかいじょ！  ${total} - ${b} = ?`,
            speech: `${total} - ${b} = ?`
          };
        } else {
          const ans = 3 + Math.floor(Math.random() * 7);
          const b = 4 + Math.floor(Math.random() * 6);
          const total = ans + b;
          return {
            type: 'calc_shoot',
            expr: `□ + ${b} = ${total}`,
            a: total, b, op: 'missing',
            answer: ans,
            choices: makeUniqueChoices(ans, 1, 12, 4),
            prompt: `□ に はいる かずは？  □ + ${b} = ${total}`,
            speech: `□ + ${b} = ${total}`
          };
        }
      } else {
        if (Math.random() < 0.55) {
          const bases = [2, 3, 4, 5, 6, 7, 8, 9];
          const a = bases[Math.floor(Math.random() * bases.length)];
          const maxMult = Math.min(9, Math.floor(36 / a));
          const b = 2 + Math.floor(Math.random() * Math.max(1, maxMult - 1));
          const ans = a * b;
          return {
            type: 'calc_shoot',
            expr: `${a} × ${b} = ?`,
            a, b, op: 'mul',
            answer: ans,
            choices: makeUniqueChoices(ans, Math.max(4, ans - 6), ans + 8, 4),
            prompt: `ハイパーかけざん！  ${a} × ${b} = ?`,
            speech: `${a} × ${b} = ?`
          };
        } else {
          const a = 12 + Math.floor(Math.random() * 12);
          const b = 5 + Math.floor(Math.random() * 9);
          const ans = a + b;
          return {
            type: 'calc_shoot',
            expr: `${a} + ${b} = ?`,
            a, b, op: '+',
            answer: ans,
            choices: makeUniqueChoices(ans, ans - 5, ans + 6, 4),
            prompt: `マスターけいさん！  ${a} + ${b} = ?`,
            speech: `${a} + ${b} = ?`
          };
        }
      }
    }
  };

  function makeUniqueChoices(correct, minVal, maxVal, count) {
    const set = new Set([correct]);
    let guard = 0;
    while (set.size < count && guard < 80) {
      guard++;
      const cand = minVal + Math.floor(Math.random() * Math.max(count, maxVal - minVal + 1));
      if (cand >= 0) set.add(cand);
    }
    while (set.size < count) {
      set.add(correct + set.size);
    }
    const arr = Array.from(set);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  window.AdaptiveAI = AdaptiveAI;
})();
