(function () {
  "use strict";

  var HERO_IMAGE = "assets/hero/hero.webp";
  var HERO_DIR = "assets/hero/";
  var HERO_WALK_FRAMES = {
    down: [HERO_DIR + "walk_down.webp", HERO_DIR + "walk_down_2.webp", HERO_DIR + "walk_down_3.webp", HERO_DIR + "walk_down_4.webp"],
    left: [HERO_DIR + "walk_left.webp", HERO_DIR + "walk_left_2.webp", HERO_DIR + "walk_left_3.webp", HERO_DIR + "walk_left_4.webp"],
    right: [HERO_DIR + "walk_right.webp", HERO_DIR + "walk_right_2.webp", HERO_DIR + "walk_right_3.webp", HERO_DIR + "walk_right_4.webp"],
    up: [HERO_DIR + "walk_up.webp", HERO_DIR + "walk_up_2.webp", HERO_DIR + "walk_up_3.webp", HERO_DIR + "walk_up_4.webp"]
  };
  var HERO_FIELD_SPRITES = {
    down: HERO_WALK_FRAMES.down[0],
    left: HERO_WALK_FRAMES.left[0],
    right: HERO_WALK_FRAMES.right[0],
    up: HERO_WALK_FRAMES.up[0]
  };

  // ---------------- Evolution routes ----------------
  var EVOLUTION_ROUTES = {
    nakayoshi: {
      label: "なかよしルート",
      desc: "たべものすがた に へんしんしていく、やさしい みち",
      stages: [
        { id: "oyakodon", label: "おやこどん", level: 8, file: "assets/evolutions/oyakodon.webp", skillId: "oyakodon_nage" },
        { id: "myoga", label: "みょうが", level: 14, file: "assets/evolutions/myoga.webp", skillId: "myoga_giri" },
        { id: "bagel", label: "ベーグル", level: 20, file: "assets/evolutions/bagel.webp", skillId: "bagel_atk" },
        { id: "yakiniku", label: "やきにく", level: 28, file: "assets/evolutions/yakiniku.webp", skillId: "yakiniku_fire" },
        { id: "tofu", label: "とうふ", level: 36, file: "assets/evolutions/tofu.webp", skillId: "tofu_press" }
      ]
    },
    takumashii: {
      label: "たくましいルート",
      desc: "いきもの すがた に へんしんしていく、パワフルな みち",
      stages: [
        { id: "itachi", label: "いたち", level: 8, file: "assets/evolutions/itachi.webp", skillId: "itachi_slash" },
        { id: "kaeru", label: "かえる", level: 14, file: "assets/evolutions/kaeru.webp", skillId: "kaeru_tongue" },
        { id: "katatsumuri", label: "かたつむり", level: 20, file: "assets/evolutions/katatsumuri.webp", skillId: "kara_tackle" },
        { id: "shachi", label: "しゃち", level: 28, file: "assets/evolutions/shachi.webp", skillId: "orca_wave" },
        { id: "sai", label: "サイ", level: 36, file: "assets/evolutions/sai.webp", skillId: "sai_charge" }
      ]
    }
  };

  var FIRST_EVOLUTION_LEVEL = 8;

  // ---------------- Stats ----------------
  function calcMaxStats(level, stageIndex) {
    return {
      maxHp: Math.round(26 + level * 6 + stageIndex * 12),
      maxMp: Math.round(9 + level * 1.4 + stageIndex * 3.5),
      atk: Math.round(8 + level * 1.6 + stageIndex * 3.5),
      def: Math.round(6 + level * 1.2 + stageIndex * 3),
      spd: Math.round(6 + level * 1.0 + stageIndex * 2.2)
    };
  }

  function expToNext(level) {
    var base = Math.round(14 * Math.pow(level, 1.5)) + 8;
    var earlyDiscount = Math.max(0, 24 - level * 2.5);
    return Math.max(8, Math.round(base - earlyDiscount));
  }

  // なかまはMONSTERSの基準レベルからの差分に応じてステータスが伸びる簡易成長式
  function getCompanionStats(mon, level) {
    var lvl = level || mon.level;
    var growth = Math.max(0, lvl - mon.level);
    return {
      level: lvl,
      maxHp: Math.round(mon.hp + growth * mon.hp * 0.16),
      atk: Math.round(mon.atk + growth * mon.atk * 0.14),
      def: Math.round(mon.def + growth * mon.def * 0.14),
      spd: Math.round(mon.spd + growth * mon.spd * 0.12)
    };
  }

  // ---------------- Skills ----------------
  var SKILLS = {
    tackle: { id: "tackle", name: "たいあたり", power: 16, mp: 0, learnLevel: 1, desc: "体当たりで こうげきする" },
    sandkick: { id: "sandkick", name: "すなかけ", power: 22, mp: 3, learnLevel: 5, desc: "すなを かけて こうげきする", element: "earth" },
    headbutt: { id: "headbutt", name: "ずつき", power: 30, mp: 6, learnLevel: 12, desc: "頭突きで つよく こうげきする" },
    renzoku: { id: "renzoku", name: "れんぞくアタック", power: 40, mp: 10, learnLevel: 20, desc: "れんぞくで こうげきする", element: "thunder" },

    // ---- しんか専用わざ(なかよしルート) ----
    oyakodon_nage: { id: "oyakodon_nage", name: "おやこどんナゲット", power: 26, mp: 4, desc: "あつあつの ぐを なげつける" },
    myoga_giri: { id: "myoga_giri", name: "みょうがギリ", power: 34, mp: 6, desc: "しゃきしゃき きって こうげきする" },
    bagel_atk: { id: "bagel_atk", name: "ベーグルアタック", power: 44, mp: 8, desc: "かたい ベーグルを ぶつける" },
    yakiniku_fire: { id: "yakiniku_fire", name: "やきにくファイヤー", power: 54, mp: 10, desc: "あつい てっぱんで こんがり やく", element: "fire" },
    tofu_press: { id: "tofu_press", name: "とうふプレス", power: 66, mp: 12, desc: "ぷるぷるの とうふで おしつぶす" },

    // ---- しんか専用わざ(たくましいルート) ----
    itachi_slash: { id: "itachi_slash", name: "いたちスラッシュ", power: 26, mp: 4, desc: "するどい つめで きりさく" },
    kaeru_tongue: { id: "kaeru_tongue", name: "べろべろアタック", power: 34, mp: 6, desc: "ながい したで まきとって こうげきする" },
    kara_tackle: { id: "kara_tackle", name: "からがらタックル", power: 44, mp: 8, desc: "からに はいって いきおいよく ぶつかる" },
    orca_wave: { id: "orca_wave", name: "オルカウェーブ", power: 54, mp: 10, desc: "つめたい なみで おしながす", element: "ice" },
    sai_charge: { id: "sai_charge", name: "サイクラッシュ", power: 66, mp: 12, desc: "つのを むけて つっこむ" }
  };
  var SKILL_LEARN_ORDER = ["tackle", "sandkick", "headbutt", "renzoku"];

  // ---------------- Elements ----------------
  var ELEMENT_LABELS = { fire: "ほのお", ice: "こおり", thunder: "でんき", earth: "つち" };
  var ELEMENT_EFFECTS = {
    fire: "assets/effects/effect_fire.webp",
    ice: "assets/effects/effect_ice.webp",
    thunder: "assets/effects/effect_thunder.webp",
    earth: "assets/effects/effect_earth.webp"
  };
  var ELEMENT_STRONG_AGAINST = { fire: "earth", earth: "thunder", thunder: "ice", ice: "fire" };
  function getElementMatchup(atkElem, defElem) {
    if (!atkElem || atkElem === "none" || !defElem || defElem === "none") return { mult: 1, tier: "neutral" };
    if (ELEMENT_STRONG_AGAINST[atkElem] === defElem) return { mult: 1.5, tier: "strong" };
    if (ELEMENT_STRONG_AGAINST[defElem] === atkElem) return { mult: 0.7, tier: "weak" };
    return { mult: 1, tier: "neutral" };
  }

  // ---------------- Items ----------------
  var ITEMS = {
    kizugusuri: { id: "kizugusuri", name: "きずぐすり", desc: "HPを 30 かいふくする", kind: "hp", amount: 30, price: 20, icon: "assets/items/icon_kizugusuri.webp" },
    manashizuku: { id: "manashizuku", name: "マナのしずく", desc: "MPを 15 かいふくする", kind: "mp", amount: 15, price: 25, icon: "assets/items/icon_manashizuku.webp" },
    nakama_ball: { id: "nakama_ball", name: "チモシーボール", desc: "やせいの モンスターに なげて なかまに できる(ボスには 使えない) せいこうりつ ×1.0", kind: "ball", catchMult: 1.0, price: 40, icon: "assets/items/icon_ball_timothy.webp" },
    super_ball: { id: "super_ball", name: "スーパーチモシーボール", desc: "やせいの モンスターに なげて なかまに できる(ボスには 使えない) せいこうりつ ×1.5", kind: "ball", catchMult: 1.5, price: 100, icon: "assets/items/icon_ball_super.webp" },
    hyper_ball: { id: "hyper_ball", name: "ハイパーチモシーボール", desc: "やせいの モンスターに なげて なかまに できる(ボスには 使えない) せいこうりつ ×2.0", kind: "ball", catchMult: 2.0, price: 220, icon: "assets/items/icon_ball_hyper.webp" },
    master_ball: { id: "master_ball", name: "マスターチモシーボール", desc: "やせいの モンスターに なげて なかまに できる(ボスには 使えない) かならず なかまに なる", kind: "ball", catchMult: Infinity, price: 800, icon: "assets/items/icon_ball_master.webp" }
  };
  var MONEY_ICON = "assets/items/icon_coin.webp";
  var SHOP_ITEM_IDS = ["kizugusuri", "manashizuku", "nakama_ball", "super_ball", "hyper_ball", "master_ball"];
  var STARTING_INVENTORY = { kizugusuri: 2, manashizuku: 1, nakama_ball: 1 };
  var CRIT_CHANCE = 0.08;
  var CRIT_MULT = 1.8;
  var MAX_PARTY_SIZE = 3;

  // ---------------- Monsters (illustrated art) ----------------
  var MON_DIR = "assets/monsters/";

  var MONSTERS = {
    slime: { id: "slime", name: "スライム", level: 2, hp: 26, atk: 8, def: 5, spd: 5, exp: 12, money: 9, skillIds: ["tackle"], image: MON_DIR + "slime.webp", evolvesTo: { level: 9, id: "slime_2" } },
    aodori: { id: "aodori", name: "あおどり", level: 3, hp: 30, atk: 10, def: 5, spd: 8, exp: 16, money: 11, skillIds: ["tackle"], image: MON_DIR + "aodori.webp", evolvesTo: { level: 10, id: "aodori_2" } },
    dokukinoko: { id: "dokukinoko", name: "どくきのこ", level: 4, hp: 38, atk: 11, def: 7, spd: 7, exp: 19, money: 14, skillIds: ["tackle"], image: MON_DIR + "dokukinoko.webp", element: "earth", evolvesTo: { level: 11, id: "dokukinoko_2" } },
    mogura: { id: "mogura", name: "つちもぐら", level: 3, hp: 32, atk: 10, def: 7, spd: 5, exp: 16, money: 11, skillIds: ["tackle"], image: MON_DIR + "mogura.webp", element: "earth", evolvesTo: { level: 10, id: "mogura_2" } },
    hone_kenshi: { id: "hone_kenshi", name: "ほねのけんし", level: 5, hp: 44, atk: 14, def: 9, spd: 8, exp: 22, money: 16, skillIds: ["tackle", "sandkick"], image: MON_DIR + "hone_kenshi.webp", evolvesTo: { level: 12, id: "hone_kenshi_2" } },
    komori: { id: "komori", name: "こうもり", level: 3, hp: 29, atk: 10, def: 5, spd: 8, exp: 16, money: 11, skillIds: ["tackle"], image: MON_DIR + "komori.webp", evolvesTo: { level: 10, id: "komori_2" } },
    hinotama: { id: "hinotama", name: "ひのたま", level: 4, hp: 32, atk: 13, def: 6, spd: 7, exp: 19, money: 14, skillIds: ["tackle"], image: MON_DIR + "hinotama.webp", element: "fire", evolvesTo: { level: 11, id: "hinotama_2" } },
    saboten: { id: "saboten", name: "とげサボテン", level: 4, hp: 38, atk: 11, def: 8, spd: 7, exp: 19, money: 14, skillIds: ["tackle"], image: MON_DIR + "saboten.webp", element: "earth", evolvesTo: { level: 11, id: "saboten_2" } },
    koyurei: { id: "koyurei", name: "こゆうれい", level: 5, hp: 40, atk: 14, def: 8, spd: 10, exp: 22, money: 16, skillIds: ["tackle", "sandkick"], image: MON_DIR + "koyurei.webp", element: "ice", evolvesTo: { level: 12, id: "koyurei_2" } },

    // ---- フィールド(初級)なかま進化系 ----
    slime_2: { id: "slime_2", name: "スライムプリンス", level: 9, hp: 47, atk: 12, def: 8, spd: 6, exp: 23, money: 17, skillIds: ["tackle"], image: MON_DIR + "slime_2.webp", evolvesTo: { level: 20, id: "slime_3" } },
    slime_3: { id: "slime_3", name: "スライムキング", level: 20, hp: 83, atk: 21, def: 14, spd: 8, exp: 46, money: 32, skillIds: ["tackle"], image: MON_DIR + "slime_3.webp" },
    aodori_2: { id: "aodori_2", name: "はやぶさ", level: 10, hp: 54, atk: 16, def: 8, spd: 10, exp: 30, money: 20, skillIds: ["tackle"], image: MON_DIR + "aodori_2.webp", evolvesTo: { level: 21, id: "aodori_3" } },
    aodori_3: { id: "aodori_3", name: "せいなるグリフォン", level: 21, hp: 96, atk: 26, def: 14, spd: 13, exp: 61, money: 40, skillIds: ["tackle"], image: MON_DIR + "aodori_3.webp" },
    dokukinoko_2: { id: "dokukinoko_2", name: "きのこせんし", level: 11, hp: 68, atk: 17, def: 11, spd: 9, exp: 36, money: 26, skillIds: ["tackle"], image: MON_DIR + "dokukinoko_2.webp", element: "earth", evolvesTo: { level: 22, id: "dokukinoko_3" } },
    dokukinoko_3: { id: "dokukinoko_3", name: "マッシュルームキング", level: 22, hp: 122, atk: 29, def: 20, spd: 11, exp: 72, money: 50, skillIds: ["tackle"], image: MON_DIR + "dokukinoko_3.webp", element: "earth" },
    mogura_2: { id: "mogura_2", name: "ドリルモグラ", level: 10, hp: 58, atk: 16, def: 11, spd: 6, exp: 30, money: 20, skillIds: ["tackle"], image: MON_DIR + "mogura_2.webp", element: "earth", evolvesTo: { level: 21, id: "mogura_3" } },
    mogura_3: { id: "mogura_3", name: "アースブレイカー", level: 21, hp: 102, atk: 26, def: 20, spd: 8, exp: 61, money: 40, skillIds: ["tackle"], image: MON_DIR + "mogura_3.webp", element: "earth" },
    hone_kenshi_2: { id: "hone_kenshi_2", name: "ボーンナイト", level: 12, hp: 79, atk: 22, def: 14, spd: 10, exp: 42, money: 30, skillIds: ["tackle", "sandkick"], image: MON_DIR + "hone_kenshi_2.webp", evolvesTo: { level: 23, id: "hone_kenshi_3" } },
    hone_kenshi_3: { id: "hone_kenshi_3", name: "デスコード", level: 23, hp: 141, atk: 36, def: 26, spd: 13, exp: 84, money: 58, skillIds: ["tackle", "sandkick"], image: MON_DIR + "hone_kenshi_3.webp" },
    komori_2: { id: "komori_2", name: "ナイトバット", level: 10, hp: 52, atk: 16, def: 8, spd: 10, exp: 30, money: 20, skillIds: ["tackle"], image: MON_DIR + "komori_2.webp", evolvesTo: { level: 21, id: "komori_3" } },
    komori_3: { id: "komori_3", name: "ヴァンパイアロード", level: 21, hp: 93, atk: 26, def: 14, spd: 13, exp: 61, money: 40, skillIds: ["tackle"], image: MON_DIR + "komori_3.webp" },
    hinotama_2: { id: "hinotama_2", name: "フレイムファイター", level: 11, hp: 58, atk: 20, def: 10, spd: 9, exp: 36, money: 26, skillIds: ["tackle"], image: MON_DIR + "hinotama_2.webp", element: "fire", evolvesTo: { level: 22, id: "hinotama_3" } },
    hinotama_3: { id: "hinotama_3", name: "えんおうりゅう", level: 22, hp: 102, atk: 34, def: 17, spd: 11, exp: 72, money: 50, skillIds: ["tackle"], image: MON_DIR + "hinotama_3.webp", element: "fire" },
    saboten_2: { id: "saboten_2", name: "サボテンせんし", level: 11, hp: 68, atk: 17, def: 13, spd: 9, exp: 36, money: 26, skillIds: ["tackle"], image: MON_DIR + "saboten_2.webp", element: "earth", evolvesTo: { level: 22, id: "saboten_3" } },
    saboten_3: { id: "saboten_3", name: "サボテンキング", level: 22, hp: 122, atk: 29, def: 23, spd: 11, exp: 72, money: 50, skillIds: ["tackle"], image: MON_DIR + "saboten_3.webp", element: "earth" },
    koyurei_2: { id: "koyurei_2", name: "ゴーストメイジ", level: 12, hp: 72, atk: 22, def: 13, spd: 12, exp: 42, money: 30, skillIds: ["tackle", "sandkick"], image: MON_DIR + "koyurei_2.webp", element: "ice", evolvesTo: { level: 23, id: "koyurei_3" } },
    koyurei_3: { id: "koyurei_3", name: "ゴーストキング", level: 23, hp: 128, atk: 36, def: 23, spd: 16, exp: 84, money: 58, skillIds: ["tackle", "sandkick"], image: MON_DIR + "koyurei_3.webp", element: "ice" },

    ankoku_kishi: { id: "ankoku_kishi", name: "あんこくきし", level: 12, hp: 86, atk: 25, def: 18, spd: 14, exp: 44, money: 33, skillIds: ["tackle", "sandkick", "headbutt"], image: MON_DIR + "ankoku_kishi.webp", evolvesTo: { level: 22, id: "ankoku_kishi_2" } },
    ankoku_madoushi: { id: "ankoku_madoushi", name: "あんこくまどうし", level: 11, hp: 72, atk: 26, def: 11, spd: 15, exp: 41, money: 30, skillIds: ["tackle", "sandkick", "headbutt"], image: MON_DIR + "ankoku_madoushi.webp", element: "thunder", evolvesTo: { level: 21, id: "ankoku_madoushi_2" } },
    orc: { id: "orc", name: "オーク", level: 10, hp: 81, atk: 22, def: 14, spd: 12, exp: 38, money: 28, skillIds: ["tackle", "sandkick", "headbutt"], image: MON_DIR + "orc.webp", evolvesTo: { level: 20, id: "orc_2" } },
    jinrou: { id: "jinrou", name: "じんろう", level: 11, hp: 80, atk: 25, def: 13, spd: 20, exp: 41, money: 30, skillIds: ["tackle", "sandkick", "headbutt"], image: MON_DIR + "jinrou.webp", evolvesTo: { level: 21, id: "jinrou_2" } },
    sarekoube: { id: "sarekoube", name: "うかぶされこうべ", level: 9, hp: 58, atk: 22, def: 10, spd: 14, exp: 35, money: 26, skillIds: ["tackle", "sandkick", "headbutt"], image: MON_DIR + "sarekoube.webp", element: "ice", evolvesTo: { level: 19, id: "sarekoube_2" } },
    iwa_golem: { id: "iwa_golem", name: "いわゴーレム", level: 13, hp: 115, atk: 25, def: 21, spd: 12, exp: 48, money: 35, skillIds: ["tackle", "sandkick", "headbutt"], image: MON_DIR + "iwa_golem.webp", element: "earth", evolvesTo: { level: 23, id: "iwa_golem_2" } },
    mira_otoko: { id: "mira_otoko", name: "ミイラおとこ", level: 10, hp: 81, atk: 20, def: 14, spd: 11, exp: 38, money: 28, skillIds: ["tackle", "sandkick", "headbutt"], image: MON_DIR + "mira_otoko.webp", element: "earth", evolvesTo: { level: 20, id: "mira_otoko_2" } },
    shokujinsou: { id: "shokujinsou", name: "しょくじんそう", level: 9, hp: 68, atk: 21, def: 10, spd: 13, exp: 35, money: 26, skillIds: ["tackle", "sandkick", "headbutt"], image: MON_DIR + "shokujinsou.webp", element: "earth", evolvesTo: { level: 19, id: "shokujinsou_2" } },
    hone_kihei: { id: "hone_kihei", name: "ほねのきへい", level: 14, hp: 98, atk: 30, def: 17, spd: 21, exp: 51, money: 38, skillIds: ["tackle", "sandkick", "headbutt"], image: MON_DIR + "hone_kihei.webp", evolvesTo: { level: 24, id: "hone_kihei_2" } },

    // ---- ダンジョン(中級)なかま進化系 ----
    ankoku_kishi_2: { id: "ankoku_kishi_2", name: "あんこくきしおう", level: 22, hp: 150, atk: 38, def: 28, spd: 17, exp: 84, money: 61, skillIds: ["tackle", "sandkick", "headbutt"], image: MON_DIR + "ankoku_kishi_2.webp" },
    ankoku_madoushi_2: { id: "ankoku_madoushi_2", name: "あんこくだいまどうし", level: 21, hp: 126, atk: 39, def: 17, spd: 18, exp: 78, money: 56, skillIds: ["tackle", "sandkick", "headbutt"], image: MON_DIR + "ankoku_madoushi_2.webp", element: "thunder" },
    orc_2: { id: "orc_2", name: "オークキング", level: 20, hp: 142, atk: 33, def: 22, spd: 14, exp: 72, money: 52, skillIds: ["tackle", "sandkick", "headbutt"], image: MON_DIR + "orc_2.webp" },
    jinrou_2: { id: "jinrou_2", name: "だいじんろう", level: 21, hp: 140, atk: 38, def: 20, spd: 24, exp: 78, money: 56, skillIds: ["tackle", "sandkick", "headbutt"], image: MON_DIR + "jinrou_2.webp" },
    sarekoube_2: { id: "sarekoube_2", name: "デスヘッド", level: 19, hp: 102, atk: 33, def: 16, spd: 17, exp: 66, money: 48, skillIds: ["tackle", "sandkick", "headbutt"], image: MON_DIR + "sarekoube_2.webp", element: "ice" },
    iwa_golem_2: { id: "iwa_golem_2", name: "こだいゴーレム", level: 23, hp: 201, atk: 38, def: 33, spd: 14, exp: 91, money: 65, skillIds: ["tackle", "sandkick", "headbutt"], image: MON_DIR + "iwa_golem_2.webp", element: "earth" },
    mira_otoko_2: { id: "mira_otoko_2", name: "ミイラファラオ", level: 20, hp: 142, atk: 30, def: 22, spd: 13, exp: 72, money: 52, skillIds: ["tackle", "sandkick", "headbutt"], image: MON_DIR + "mira_otoko_2.webp", element: "earth" },
    shokujinsou_2: { id: "shokujinsou_2", name: "デビルフラワー", level: 19, hp: 119, atk: 32, def: 16, spd: 16, exp: 66, money: 48, skillIds: ["tackle", "sandkick", "headbutt"], image: MON_DIR + "shokujinsou_2.webp", element: "earth" },
    hone_kihei_2: { id: "hone_kihei_2", name: "デスライダー", level: 24, hp: 172, atk: 45, def: 26, spd: 25, exp: 97, money: 70, skillIds: ["tackle", "sandkick", "headbutt"], image: MON_DIR + "hone_kihei_2.webp" },

    yougan_golem: { id: "yougan_golem", name: "ようがんゴーレム", level: 16, hp: 130, atk: 32, def: 20, spd: 14, exp: 140, money: 110, skillIds: ["tackle", "sandkick", "headbutt"], isBoss: true, image: MON_DIR + "yougan_golem.webp", element: "fire" }
  };

  // ---------------- Dex (図鑑) display order: base -> evolution stages, grouped by line ----------------
  var DEX_ORDER = [
    "slime", "slime_2", "slime_3",
    "aodori", "aodori_2", "aodori_3",
    "dokukinoko", "dokukinoko_2", "dokukinoko_3",
    "mogura", "mogura_2", "mogura_3",
    "hone_kenshi", "hone_kenshi_2", "hone_kenshi_3",
    "komori", "komori_2", "komori_3",
    "hinotama", "hinotama_2", "hinotama_3",
    "saboten", "saboten_2", "saboten_3",
    "koyurei", "koyurei_2", "koyurei_3",
    "ankoku_kishi", "ankoku_kishi_2",
    "ankoku_madoushi", "ankoku_madoushi_2",
    "orc", "orc_2",
    "jinrou", "jinrou_2",
    "sarekoube", "sarekoube_2",
    "iwa_golem", "iwa_golem_2",
    "mira_otoko", "mira_otoko_2",
    "shokujinsou", "shokujinsou_2",
    "hone_kihei", "hone_kihei_2",
    "yougan_golem"
  ];

  // ---------------- Maps ----------------
  var MAPS = {
    village: {
      id: "village",
      label: "はじまりの村",
      tiles: [
        "###########",
        "#.........#",
        "#.........#",
        "#.........#",
        "#..#####..#",
        "#..#...#..#",
        "#..#.H.#..#",
        "#.........#",
        "#####.#####"
      ],
      npcs: [
        { x: 2, y: 2, name: "村びと", image: "assets/npc/npc_boy.webp", dialogue: ["ようこそ、はじまりの村へ!", "した の ▼ボタンで うごけるよ。", "NPCの そばで「A」ボタンを おすと 会話できるよ。", "村の南に出ると 草むらが あるから 気をつけてね。"] },
        { x: 8, y: 2, name: "おみせのひと", shop: true, image: "assets/npc/shop_building.webp", dialogue: ["いらっしゃい! きずぐすりや マナのしずくを うってるよ。"] },
        { x: 3, y: 7, name: "村びと2", image: "assets/npc/npc_girl.webp", dialogue: ["南の草むらには スライムや あおどりが 出るよ。", "もっと南に すすむと ほらあなが あるみたい。", "おくに つよい モンスターが いるかも…?", "村の中の たてものの南がわに いやしの泉が あるよ。のると 元気に なれるよ。"] },
        { x: 6, y: 3, name: "くすし", image: "assets/npc/npc_herbalist.webp", dialogue: ["わたしは くすし。やくそうから きずぐすりを 作っているんじゃ。", "ダンジョンは くらいから、きずぐすりを 忘れずにね。", "マナのしずくは おみせのひとから 買えるよ。"] }
      ],
      warps: [{ x: 5, y: 8, toMap: "field", toX: 4, toY: 1 }],
      decorations: [{ x: 5, y: 1, image: "assets/tiles/deco_well.webp" }],
      encounter: null
    },
    field: {
      id: "field",
      label: "しばふの草原",
      tiles: [
        "####.####",
        "#,,,,,,,#",
        "#,,,,,,,#",
        "#,,,,,,,#",
        "#,,,,,,,#",
        "#,,,,,,,#",
        "#,,,,,,,#",
        "#,,,,,,,#",
        "#,,,,,,,#",
        "#,,,,,,,#",
        "####.####"
      ],
      npcs: [],
      warps: [
        { x: 4, y: 0, toMap: "village", toX: 5, toY: 7 },
        { x: 4, y: 10, toMap: "dungeon", toX: 4, toY: 1 }
      ],
      chests: [
        { id: "field_chest_1", x: 2, y: 5, reward: { type: "money", amount: 30 } }
      ],
      decorations: [
        { x: 1, y: 2, image: "assets/tiles/deco_flowerbush.webp" },
        { x: 6, y: 3, image: "assets/tiles/deco_flowerbush.webp" },
        { x: 2, y: 8, image: "assets/tiles/deco_flowerbush.webp" },
        { x: 6, y: 7, image: "assets/tiles/deco_flowerbush.webp" }
      ],
      encounter: {
        rate: 0.14,
        table: [
          { id: "slime", weight: 3 }, { id: "aodori", weight: 3 }, { id: "dokukinoko", weight: 2 },
          { id: "mogura", weight: 3 }, { id: "hone_kenshi", weight: 1 }, { id: "komori", weight: 3 },
          { id: "hinotama", weight: 2 }, { id: "saboten", weight: 2 }, { id: "koyurei", weight: 1 }
        ]
      }
    },
    dungeon: {
      id: "dungeon",
      label: "コケむした洞窟",
      tiles: [
        "####.####",
        "#,,,,,,,#",
        "#,,,#,,,#",
        "#,,,,,,,#",
        "#,,,,,,,#",
        "#,,,#,,,#",
        "#,,,,,,,#",
        "#,,,,,,,#",
        "#,,,,,,,#",
        "#,,,,,,,#",
        "#,,,,,,,#",
        "#...B...#",
        "#########"
      ],
      npcs: [],
      warps: [{ x: 4, y: 0, toMap: "field", toX: 4, toY: 9 }],
      chests: [
        { id: "dungeon_chest_1", x: 6, y: 6, reward: { type: "item", itemId: "kizugusuri", amount: 2 } },
        { id: "dungeon_chest_2", x: 1, y: 9, reward: { type: "item", itemId: "manashizuku", amount: 2 } }
      ],
      bossTrigger: { x: 4, y: 11, monsterId: "yougan_golem" },
      encounter: {
        rate: 0.16,
        table: [
          { id: "ankoku_kishi", weight: 2 }, { id: "ankoku_madoushi", weight: 2 }, { id: "orc", weight: 2 },
          { id: "jinrou", weight: 2 }, { id: "sarekoube", weight: 3 }, { id: "iwa_golem", weight: 1 },
          { id: "mira_otoko", weight: 2 }, { id: "shokujinsou", weight: 2 }, { id: "hone_kihei", weight: 1 }
        ]
      }
    }
  };

  var START_MAP = "village";
  var START_X = 5;
  var START_Y = 1;

  window.GAME_DATA = {
    HERO_IMAGE: HERO_IMAGE,
    HERO_FIELD_SPRITES: HERO_FIELD_SPRITES,
    HERO_WALK_FRAMES: HERO_WALK_FRAMES,
    EVOLUTION_ROUTES: EVOLUTION_ROUTES,
    FIRST_EVOLUTION_LEVEL: FIRST_EVOLUTION_LEVEL,
    calcMaxStats: calcMaxStats,
    expToNext: expToNext,
    getCompanionStats: getCompanionStats,
    SKILLS: SKILLS,
    SKILL_LEARN_ORDER: SKILL_LEARN_ORDER,
    ITEMS: ITEMS,
    MONEY_ICON: MONEY_ICON,
    CRIT_CHANCE: CRIT_CHANCE,
    CRIT_MULT: CRIT_MULT,
    MAX_PARTY_SIZE: MAX_PARTY_SIZE,
    ELEMENT_LABELS: ELEMENT_LABELS,
    ELEMENT_EFFECTS: ELEMENT_EFFECTS,
    getElementMatchup: getElementMatchup,
    SHOP_ITEM_IDS: SHOP_ITEM_IDS,
    STARTING_INVENTORY: STARTING_INVENTORY,
    MONSTERS: MONSTERS,
    DEX_ORDER: DEX_ORDER,
    MAPS: MAPS,
    START_MAP: START_MAP,
    START_X: START_X,
    START_Y: START_Y
  };
})();
