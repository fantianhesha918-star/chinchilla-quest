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
        { id: "oyakodon", label: "おやこどん", level: 8, file: "assets/evolutions/oyakodon.webp" },
        { id: "myoga", label: "みょうが", level: 14, file: "assets/evolutions/myoga.webp" },
        { id: "bagel", label: "ベーグル", level: 20, file: "assets/evolutions/bagel.webp" },
        { id: "yakiniku", label: "やきにく", level: 28, file: "assets/evolutions/yakiniku.webp" },
        { id: "tofu", label: "とうふ", level: 36, file: "assets/evolutions/tofu.webp" }
      ]
    },
    takumashii: {
      label: "たくましいルート",
      desc: "いきもの すがた に へんしんしていく、パワフルな みち",
      stages: [
        { id: "itachi", label: "いたち", level: 8, file: "assets/evolutions/itachi.webp" },
        { id: "kaeru", label: "かえる", level: 14, file: "assets/evolutions/kaeru.webp" },
        { id: "katatsumuri", label: "かたつむり", level: 20, file: "assets/evolutions/katatsumuri.webp" },
        { id: "shachi", label: "しゃち", level: 28, file: "assets/evolutions/shachi.webp" },
        { id: "sai", label: "サイ", level: 36, file: "assets/evolutions/sai.webp" }
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
    return Math.round(18 * Math.pow(level, 1.5)) + 10;
  }

  // ---------------- Skills ----------------
  var SKILLS = {
    tackle: { id: "tackle", name: "たいあたり", power: 16, mp: 0, learnLevel: 1, desc: "体当たりで こうげきする" },
    sandkick: { id: "sandkick", name: "すなかけ", power: 22, mp: 3, learnLevel: 5, desc: "すなを かけて こうげきする" },
    headbutt: { id: "headbutt", name: "ずつき", power: 30, mp: 6, learnLevel: 12, desc: "頭突きで つよく こうげきする" },
    renzoku: { id: "renzoku", name: "れんぞくアタック", power: 40, mp: 10, learnLevel: 20, desc: "れんぞくで こうげきする" }
  };
  var SKILL_LEARN_ORDER = ["tackle", "sandkick", "headbutt", "renzoku"];

  // ---------------- Items ----------------
  var ITEMS = {
    kizugusuri: { id: "kizugusuri", name: "きずぐすり", desc: "HPを 30 かいふくする", kind: "hp", amount: 30, price: 20, icon: "assets/items/icon_kizugusuri.webp" },
    manashizuku: { id: "manashizuku", name: "マナのしずく", desc: "MPを 15 かいふくする", kind: "mp", amount: 15, price: 25, icon: "assets/items/icon_manashizuku.webp" }
  };
  var MONEY_ICON = "assets/items/icon_coin.webp";
  var SHOP_ITEM_IDS = ["kizugusuri", "manashizuku"];
  var STARTING_INVENTORY = { kizugusuri: 2, manashizuku: 1 };

  // ---------------- Monsters (illustrated art) ----------------
  var MON_DIR = "assets/monsters/";

  var MONSTERS = {
    slime: { id: "slime", name: "スライム", level: 2, hp: 26, atk: 8, def: 5, spd: 5, exp: 12, money: 9, skillIds: ["tackle"], image: MON_DIR + "slime.webp" },
    aodori: { id: "aodori", name: "あおどり", level: 3, hp: 30, atk: 10, def: 5, spd: 8, exp: 16, money: 11, skillIds: ["tackle"], image: MON_DIR + "aodori.webp" },
    dokukinoko: { id: "dokukinoko", name: "どくきのこ", level: 4, hp: 38, atk: 11, def: 7, spd: 7, exp: 19, money: 14, skillIds: ["tackle"], image: MON_DIR + "dokukinoko.webp" },
    mogura: { id: "mogura", name: "つちもぐら", level: 3, hp: 32, atk: 10, def: 7, spd: 5, exp: 16, money: 11, skillIds: ["tackle"], image: MON_DIR + "mogura.webp" },
    hone_kenshi: { id: "hone_kenshi", name: "ほねのけんし", level: 5, hp: 44, atk: 14, def: 9, spd: 8, exp: 22, money: 16, skillIds: ["tackle", "sandkick"], image: MON_DIR + "hone_kenshi.webp" },
    komori: { id: "komori", name: "こうもり", level: 3, hp: 29, atk: 10, def: 5, spd: 8, exp: 16, money: 11, skillIds: ["tackle"], image: MON_DIR + "komori.webp" },
    hinotama: { id: "hinotama", name: "ひのたま", level: 4, hp: 32, atk: 13, def: 6, spd: 7, exp: 19, money: 14, skillIds: ["tackle"], image: MON_DIR + "hinotama.webp" },
    saboten: { id: "saboten", name: "とげサボテン", level: 4, hp: 38, atk: 11, def: 8, spd: 7, exp: 19, money: 14, skillIds: ["tackle"], image: MON_DIR + "saboten.webp" },
    koyurei: { id: "koyurei", name: "こゆうれい", level: 5, hp: 40, atk: 14, def: 8, spd: 10, exp: 22, money: 16, skillIds: ["tackle", "sandkick"], image: MON_DIR + "koyurei.webp" },

    ankoku_kishi: { id: "ankoku_kishi", name: "あんこくきし", level: 12, hp: 86, atk: 25, def: 18, spd: 14, exp: 44, money: 33, skillIds: ["tackle", "sandkick", "headbutt"], image: MON_DIR + "ankoku_kishi.webp" },
    ankoku_madoushi: { id: "ankoku_madoushi", name: "あんこくまどうし", level: 11, hp: 72, atk: 26, def: 11, spd: 15, exp: 41, money: 30, skillIds: ["tackle", "sandkick", "headbutt"], image: MON_DIR + "ankoku_madoushi.webp" },
    orc: { id: "orc", name: "オーク", level: 10, hp: 81, atk: 22, def: 14, spd: 12, exp: 38, money: 28, skillIds: ["tackle", "sandkick", "headbutt"], image: MON_DIR + "orc.webp" },
    jinrou: { id: "jinrou", name: "じんろう", level: 11, hp: 80, atk: 25, def: 13, spd: 20, exp: 41, money: 30, skillIds: ["tackle", "sandkick", "headbutt"], image: MON_DIR + "jinrou.webp" },
    sarekoube: { id: "sarekoube", name: "うかぶされこうべ", level: 9, hp: 58, atk: 22, def: 10, spd: 14, exp: 35, money: 26, skillIds: ["tackle", "sandkick", "headbutt"], image: MON_DIR + "sarekoube.webp" },
    iwa_golem: { id: "iwa_golem", name: "いわゴーレム", level: 13, hp: 115, atk: 25, def: 21, spd: 12, exp: 48, money: 35, skillIds: ["tackle", "sandkick", "headbutt"], image: MON_DIR + "iwa_golem.webp" },
    mira_otoko: { id: "mira_otoko", name: "ミイラおとこ", level: 10, hp: 81, atk: 20, def: 14, spd: 11, exp: 38, money: 28, skillIds: ["tackle", "sandkick", "headbutt"], image: MON_DIR + "mira_otoko.webp" },
    shokujinsou: { id: "shokujinsou", name: "しょくじんそう", level: 9, hp: 68, atk: 21, def: 10, spd: 13, exp: 35, money: 26, skillIds: ["tackle", "sandkick", "headbutt"], image: MON_DIR + "shokujinsou.webp" },
    hone_kihei: { id: "hone_kihei", name: "ほねのきへい", level: 14, hp: 98, atk: 30, def: 17, spd: 21, exp: 51, money: 38, skillIds: ["tackle", "sandkick", "headbutt"], image: MON_DIR + "hone_kihei.webp" },

    yougan_golem: { id: "yougan_golem", name: "ようがんゴーレム", level: 16, hp: 130, atk: 32, def: 20, spd: 14, exp: 140, money: 110, skillIds: ["tackle", "sandkick", "headbutt"], isBoss: true, image: MON_DIR + "yougan_golem.webp" }
  };

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
        { x: 3, y: 7, name: "村びと2", image: "assets/npc/npc_girl.webp", dialogue: ["南の草むらには スライムや あおどりが 出るよ。", "もっと南に すすむと ほらあなが あるみたい。", "おくに つよい モンスターが いるかも…?", "村の中の たてものの南がわに いやしの泉が あるよ。のると 元気に なれるよ。"] }
      ],
      warps: [{ x: 5, y: 8, toMap: "field", toX: 4, toY: 1 }],
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
    SKILLS: SKILLS,
    SKILL_LEARN_ORDER: SKILL_LEARN_ORDER,
    ITEMS: ITEMS,
    MONEY_ICON: MONEY_ICON,
    SHOP_ITEM_IDS: SHOP_ITEM_IDS,
    STARTING_INVENTORY: STARTING_INVENTORY,
    MONSTERS: MONSTERS,
    MAPS: MAPS,
    START_MAP: START_MAP,
    START_X: START_X,
    START_Y: START_Y
  };
})();
