(function () {
  "use strict";

  var CHINCHILLA_PALETTE = { body: "#c3b9ae", belly: "#f4ede2", dark: "#8f8478", blush: "#f2b8c6" };

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
    kizugusuri: { id: "kizugusuri", name: "きずぐすり", desc: "HPを 30 かいふくする", kind: "hp", amount: 30, price: 20 },
    manashizuku: { id: "manashizuku", name: "マナのしずく", desc: "MPを 15 かいふくする", kind: "mp", amount: 15, price: 25 }
  };
  var SHOP_ITEM_IDS = ["kizugusuri", "manashizuku"];
  var STARTING_INVENTORY = { kizugusuri: 2, manashizuku: 1 };

  // ---------------- SVG art helpers (shared style with player) ----------------
  var svgUidCounter = 0;

  function faceSvg(mood) {
    switch (mood) {
      case "happy":
        return (
          '<path d="M72 78 Q80 66 88 78" stroke="#4a4238" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
          '<path d="M112 78 Q120 66 128 78" stroke="#4a4238" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
          '<path d="M84 100 Q100 114 116 100" stroke="#4a4238" stroke-width="3.5" fill="none" stroke-linecap="round"/>'
        );
      case "hurt":
        return (
          '<path d="M70 66 L88 73" stroke="#4a4238" stroke-width="2.5" stroke-linecap="round"/>' +
          '<path d="M130 66 L112 73" stroke="#4a4238" stroke-width="2.5" stroke-linecap="round"/>' +
          '<circle cx="80" cy="80" r="5" fill="#4a4238"/>' +
          '<circle cx="120" cy="80" r="5" fill="#4a4238"/>' +
          '<path d="M88 112 Q100 102 112 112" stroke="#4a4238" stroke-width="3" fill="none" stroke-linecap="round"/>'
        );
      default:
        return (
          '<circle cx="80" cy="80" r="6" fill="#4a4238"/>' +
          '<circle cx="120" cy="80" r="6" fill="#4a4238"/>' +
          '<circle cx="82" cy="77" r="2" fill="#fff"/>' +
          '<circle cx="122" cy="77" r="2" fill="#fff"/>' +
          '<path d="M92 100 Q100 106 108 100" stroke="#4a4238" stroke-width="2.5" fill="none" stroke-linecap="round"/>'
        );
    }
  }

  function assembleChinchillaBody(palette, uid) {
    var structural =
      '<g opacity="0.95">' +
      '<circle cx="158" cy="150" r="26" fill="' + palette.dark + '"/>' +
      '<circle cx="172" cy="138" r="20" fill="' + palette.dark + '"/>' +
      '<circle cx="168" cy="160" r="18" fill="' + palette.dark + '"/>' +
      "</g>" +
      '<ellipse cx="72" cy="182" rx="16" ry="10" fill="' + palette.body + '"/>' +
      '<ellipse cx="128" cy="182" rx="16" ry="10" fill="' + palette.body + '"/>' +
      '<ellipse cx="100" cy="150" rx="52" ry="42" fill="' + palette.body + '"/>' +
      '<ellipse cx="100" cy="160" rx="30" ry="24" fill="' + palette.belly + '"/>' +
      '<ellipse cx="78" cy="188" rx="12" ry="8" fill="' + palette.belly + '"/>' +
      '<ellipse cx="122" cy="188" rx="12" ry="8" fill="' + palette.belly + '"/>' +
      '<circle cx="62" cy="48" r="22" fill="' + palette.body + '"/>' +
      '<circle cx="62" cy="48" r="13" fill="' + palette.blush + '" opacity="0.55"/>' +
      '<circle cx="138" cy="48" r="22" fill="' + palette.body + '"/>' +
      '<circle cx="138" cy="48" r="13" fill="' + palette.blush + '" opacity="0.55"/>' +
      '<circle cx="100" cy="88" r="50" fill="' + palette.body + '"/>';

    var shadow = '<ellipse cx="100" cy="195" rx="46" ry="7" fill="#3a2f26" opacity="0.16"/>';
    var outlined = '<g stroke="' + palette.dark + '" stroke-width="2.5" stroke-opacity="0.32" stroke-linejoin="round" stroke-linecap="round">' + structural + "</g>";
    var earShade =
      '<ellipse cx="70" cy="50" rx="7" ry="10" fill="' + palette.dark + '" opacity="0.28"/>' +
      '<ellipse cx="146" cy="50" rx="7" ry="10" fill="' + palette.dark + '" opacity="0.28"/>';
    var cheeks =
      '<circle cx="66" cy="100" r="11" fill="' + palette.blush + '" opacity="0.6"/>' +
      '<circle cx="134" cy="100" r="11" fill="' + palette.blush + '" opacity="0.6"/>';
    var bellyShade = '<path d="M76 142 Q100 132 124 142 Q112 154 100 156 Q88 154 76 142 Z" fill="' + palette.dark + '" opacity="0.18"/>';
    var underShade = '<ellipse cx="100" cy="178" rx="34" ry="14" fill="' + palette.dark + '" opacity="0.16"/>';
    var highlight = '<ellipse cx="76" cy="56" rx="22" ry="15" fill="#ffffff" opacity="0.38"/>';
    var noseShine = '<ellipse cx="97" cy="93" rx="4" ry="2.5" fill="#ffffff" opacity="0.6"/>';
    var defs =
      '<defs><radialGradient id="' + uid + '" cx="34%" cy="22%" r="78%">' +
      '<stop offset="0%" stop-color="#ffffff" stop-opacity="0.55"/>' +
      '<stop offset="42%" stop-color="#ffffff" stop-opacity="0"/>' +
      '<stop offset="100%" stop-color="#000000" stop-opacity="0.28"/>' +
      "</radialGradient></defs>";
    var sheen = '<ellipse cx="100" cy="118" rx="82" ry="96" fill="url(#' + uid + ')"/>';

    return defs + shadow + outlined + earShade + underShade + bellyShade + cheeks + highlight + noseShine + sheen;
  }

  function buildChinchillaSVG(mood) {
    var uid = "pcsvg" + (++svgUidCounter);
    var palette = CHINCHILLA_PALETTE;
    return (
      '<svg viewBox="0 0 200 200" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">' +
      assembleChinchillaBody(palette, uid) +
      faceSvg(mood) +
      '<ellipse cx="100" cy="96" rx="4" ry="3" fill="' + palette.dark + '"/>' +
      '<path d="M60 98 L30 92 M60 102 L28 104 M60 106 L32 116" stroke="' + palette.dark + '" stroke-width="1.5" fill="none" opacity="0.55"/>' +
      '<path d="M140 98 L170 92 M140 102 L172 104 M140 106 L168 116" stroke="' + palette.dark + '" stroke-width="1.5" fill="none" opacity="0.55"/>' +
      "</svg>"
    );
  }

  // ---------------- Monster art ----------------
  function buildBlobMonster(p, opts) {
    opts = opts || {};
    var uid = "monsvg" + (++svgUidCounter);
    var structural = (opts.limbs || "") + '<ellipse cx="100" cy="115" rx="' + (opts.rx || 62) + '" ry="' + (opts.ry || 54) + '" fill="' + p.body + '"/>' + (opts.headExtra || "");
    var shadow = '<ellipse cx="100" cy="185" rx="44" ry="8" fill="#3a2f26" opacity="0.15"/>';
    var outlined = '<g stroke="' + p.dark + '" stroke-width="3" stroke-opacity="0.35" stroke-linejoin="round" stroke-linecap="round">' + structural + "</g>";
    var eyes = opts.eyes ||
      ('<circle cx="78" cy="105" r="9" fill="' + p.dark + '"/><circle cx="122" cy="105" r="9" fill="' + p.dark + '"/>' +
       '<circle cx="81" cy="101" r="3" fill="#fff"/><circle cx="125" cy="101" r="3" fill="#fff"/>');
    var mouth = opts.mouth || ('<path d="M90 128 Q100 134 110 128" stroke="' + p.dark + '" stroke-width="2.5" fill="none" stroke-linecap="round"/>');
    var defs =
      '<defs><radialGradient id="' + uid + '" cx="36%" cy="24%" r="75%">' +
      '<stop offset="0%" stop-color="#ffffff" stop-opacity="0.5"/>' +
      '<stop offset="50%" stop-color="#ffffff" stop-opacity="0"/>' +
      '<stop offset="100%" stop-color="#000000" stop-opacity="0.22"/>' +
      "</radialGradient></defs>";
    var sheen = '<ellipse cx="100" cy="115" rx="72" ry="64" fill="url(#' + uid + ')"/>';
    return (
      '<svg viewBox="0 0 200 200" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">' +
      defs + shadow + outlined + eyes + mouth + (opts.extra || "") + sheen +
      "</svg>"
    );
  }

  var MONSTER_BUILDERS = {
    kusamushiri: function (p) {
      return buildBlobMonster(p, {
        headExtra: '<path d="M100 61 Q92 43 76 48 Q90 58 100 61 Q110 58 124 48 Q108 43 100 61 Z" fill="' + p.accent + '"/>',
        limbs: '<ellipse cx="75" cy="164" rx="15" ry="11" fill="' + p.body + '"/><ellipse cx="125" cy="164" rx="15" ry="11" fill="' + p.body + '"/>'
      });
    },
    tsuchinbo: function (p) {
      return buildBlobMonster(p, {
        limbs: '<ellipse cx="68" cy="168" rx="21" ry="17" fill="' + p.body + '"/><ellipse cx="132" cy="168" rx="21" ry="17" fill="' + p.body + '"/>',
        headExtra:
          '<path d="M85 65 Q80 44 70 38 M115 65 Q120 44 130 38" stroke="' + p.dark + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
          '<circle cx="70" cy="38" r="4" fill="' + p.accent + '"/><circle cx="130" cy="38" r="4" fill="' + p.accent + '"/>'
      });
    },
    awagaeru: function (p) {
      return buildBlobMonster(p, {
        eyes:
          '<circle cx="80" cy="78" r="15" fill="' + p.body + '"/><circle cx="120" cy="78" r="15" fill="' + p.body + '"/>' +
          '<circle cx="80" cy="78" r="8" fill="' + p.dark + '"/><circle cx="120" cy="78" r="8" fill="' + p.dark + '"/>',
        extra:
          '<circle cx="152" cy="66" r="10" fill="' + p.accent + '" opacity="0.6"/>' +
          '<circle cx="168" cy="88" r="6" fill="' + p.accent + '" opacity="0.5"/>' +
          '<circle cx="44" cy="78" r="8" fill="' + p.accent + '" opacity="0.5"/>'
      });
    },
    iwagani: function (p) {
      return buildBlobMonster(p, {
        limbs:
          '<ellipse cx="36" cy="118" rx="22" ry="17" fill="' + p.accent + '"/><ellipse cx="164" cy="118" rx="22" ry="17" fill="' + p.accent + '"/>' +
          '<ellipse cx="70" cy="168" rx="12" ry="9" fill="' + p.body + '"/><ellipse cx="130" cy="168" rx="12" ry="9" fill="' + p.body + '"/>',
        headExtra: '<circle cx="85" cy="140" r="5" fill="' + p.dark + '" opacity="0.3"/><circle cx="115" cy="150" r="6" fill="' + p.dark + '" opacity="0.3"/>'
      });
    },
    ganjou: function (p) {
      return buildBlobMonster(p, {
        rx: 74, ry: 64,
        headExtra:
          '<path d="M68 58 L80 34 L92 58 Z M108 58 L120 34 L132 58 Z" fill="' + p.dark + '"/>' +
          '<path d="M55 95 Q100 116 145 95 L145 109 Q100 130 55 109 Z" fill="#c0473f"/>',
        eyes:
          '<path d="M64 88 L86 97 M136 88 L114 97" stroke="' + p.dark + '" stroke-width="3" stroke-linecap="round"/>' +
          '<circle cx="78" cy="104" r="9" fill="' + p.dark + '"/><circle cx="122" cy="104" r="9" fill="' + p.dark + '"/>' +
          '<circle cx="81" cy="100" r="3" fill="#fff"/><circle cx="125" cy="100" r="3" fill="#fff"/>'
      });
    }
  };

  var MONSTERS = {
    kusamushiri: { id: "kusamushiri", name: "くさむしり", level: 3, hp: 20, atk: 7, def: 4, spd: 5, exp: 10, money: 6, skillIds: ["tackle"], build: MONSTER_BUILDERS.kusamushiri, palette: { body: "#8fc17a", dark: "#5c8a4a", accent: "#ffd76a" } },
    tsuchinbo: { id: "tsuchinbo", name: "つちんぼ", level: 4, hp: 25, atk: 8, def: 6, spd: 3, exp: 13, money: 8, skillIds: ["tackle"], build: MONSTER_BUILDERS.tsuchinbo, palette: { body: "#b98a5a", dark: "#7a5a36", accent: "#e8c98a" } },
    awagaeru: { id: "awagaeru", name: "あわがえる", level: 6, hp: 30, atk: 10, def: 5, spd: 7, exp: 18, money: 12, skillIds: ["tackle", "sandkick"], build: MONSTER_BUILDERS.awagaeru, palette: { body: "#7ac1c9", dark: "#3f7d84", accent: "#e0f6f6" } },
    iwagani: { id: "iwagani", name: "いわがに", level: 8, hp: 38, atk: 12, def: 10, spd: 3, exp: 24, money: 16, skillIds: ["tackle", "sandkick"], build: MONSTER_BUILDERS.iwagani, palette: { body: "#9a9a92", dark: "#5f5f58", accent: "#c0473f" } },
    ganjou: { id: "ganjou", name: "がんじょうネズミ", level: 12, hp: 85, atk: 16, def: 11, spd: 6, exp: 90, money: 70, skillIds: ["tackle", "sandkick", "headbutt"], isBoss: true, build: MONSTER_BUILDERS.ganjou, palette: { body: "#7a6656", dark: "#3a2f26", accent: "#c0473f" } }
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
        { x: 2, y: 2, name: "村びと", dialogue: ["ようこそ、はじまりの村へ!", "した の ▼ボタンで うごけるよ。", "NPCの そばで「はなす」ボタンを おすと 会話できるよ。", "村の南に出ると 草むらが あるから 気をつけてね。"] },
        { x: 8, y: 2, name: "おみせのひと", shop: true, dialogue: ["いらっしゃい! きずぐすりや マナのしずくを うってるよ。"] },
        { x: 3, y: 7, name: "村びと2", dialogue: ["南の草むらには あわがえるや くさむしりが 出るよ。", "もっと南に すすむと ほらあなが あるみたい。", "おくに つよい モンスターが いるかも…?", "村の中の たてものの南がわに いやしの泉が あるよ。のると 元気に なれるよ。"] }
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
      encounter: { rate: 0.14, table: [{ id: "kusamushiri", weight: 5 }, { id: "awagaeru", weight: 3 }] }
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
      bossTrigger: { x: 4, y: 11, monsterId: "ganjou" },
      encounter: { rate: 0.16, table: [{ id: "tsuchinbo", weight: 4 }, { id: "iwagani", weight: 3 }] }
    }
  };

  var START_MAP = "village";
  var START_X = 5;
  var START_Y = 1;

  window.GAME_DATA = {
    CHINCHILLA_PALETTE: CHINCHILLA_PALETTE,
    EVOLUTION_ROUTES: EVOLUTION_ROUTES,
    FIRST_EVOLUTION_LEVEL: FIRST_EVOLUTION_LEVEL,
    calcMaxStats: calcMaxStats,
    expToNext: expToNext,
    SKILLS: SKILLS,
    SKILL_LEARN_ORDER: SKILL_LEARN_ORDER,
    ITEMS: ITEMS,
    SHOP_ITEM_IDS: SHOP_ITEM_IDS,
    STARTING_INVENTORY: STARTING_INVENTORY,
    buildChinchillaSVG: buildChinchillaSVG,
    MONSTERS: MONSTERS,
    MAPS: MAPS,
    START_MAP: START_MAP,
    START_X: START_X,
    START_Y: START_Y
  };
})();
