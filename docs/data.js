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
    var base = Math.round(10 * Math.pow(level, 1.5)) + 8;
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
      maxMp: Math.round(8 + lvl * 1.3),
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
    orca_wave: { id: "orca_wave", name: "オルカウェーブ", power: 54, mp: 10, desc: "つめたい なみで おしながす", element: "water" },
    sai_charge: { id: "sai_charge", name: "サイクラッシュ", power: 66, mp: 12, desc: "つのを むけて つっこむ" },

    // ---- ボス撃破の専用わざ(BOSS_REWARDSで習得) ----
    yougan_crush: { id: "yougan_crush", name: "ようがんクラッシュ", power: 58, mp: 11, desc: "ようがんの ちからで たたきつぶす", element: "fire" },
    yeti_blizzard: { id: "yeti_blizzard", name: "ブリザードファング", power: 60, mp: 12, desc: "こおりの きばで きりさく", element: "water" },
    oni_smash: { id: "oni_smash", name: "おにのだいかいてん", power: 64, mp: 13, desc: "だいちを ゆるがす だいかいてん", element: "earth" },
    madoushi_curse: { id: "madoushi_curse", name: "だいまどうのじゅそ", power: 68, mp: 14, desc: "おそろしい じゅそを かける", element: "magic" },
    akuma_claw: { id: "akuma_claw", name: "あんこくのつめ", power: 72, mp: 15, desc: "やみの つめで ひきさく", element: "dark" },
    dragon_thunder: { id: "dragon_thunder", name: "らいめいのつめ", power: 74, mp: 15, desc: "いなずまを まとった つめで ひきさく", element: "thunder" },
    mahitotsu_smash: { id: "mahitotsu_smash", name: "だいちのてっけん", power: 78, mp: 16, desc: "だいちを ふるわせる てっけん", element: "beast" },
    yurei_ou_curse: { id: "yurei_ou_curse", name: "しのちょうふく", power: 82, mp: 16, desc: "たましいを こおりつかせる のろい", element: "dark" },
    shitennou_yougan_blast: { id: "shitennou_yougan_blast", name: "だいばくはつ", power: 84, mp: 17, desc: "ようがんが だいばくはつする", element: "fire" },
    shitennou_yeti_zero: { id: "shitennou_yeti_zero", name: "ぜったいれいど", power: 86, mp: 17, desc: "すべてを こおりつかせる", element: "water" },
    shitennou_oni_split: { id: "shitennou_oni_split", name: "だいちわり", power: 89, mp: 18, desc: "だいちを まっぷたつに わる", element: "earth" },
    shitennou_madoushi_ultima: { id: "shitennou_madoushi_ultima", name: "げんかいじゅもん", power: 92, mp: 18, desc: "げんかいを こえた だいじゅもん", element: "magic" },

    // ---- なかま用 汎用属性わざ(旧: ほのお/こおり。こおりはみず属性に統合) ----
    flame_burst: { id: "flame_burst", name: "ほのおのつぶて", power: 22, mp: 3, learnLevel: 5, desc: "ほのおの たまを なげつける", element: "fire" },
    ice_shard: { id: "ice_shard", name: "こおりのつぶて", power: 22, mp: 3, learnLevel: 5, desc: "するどい こおりを ぶつける", element: "water" },

    // ---- 10属性 わざ一覧(初級/中級/上級/特級、なかまがレベルアップで習得) ----
    fire1_1: { id: "fire1_1", name: "ひのたま", power: 18, mp: 2, learnLevel: 1, desc: "ひのたまで こうげきする", element: "fire" },
    fire1_2: { id: "fire1_2", name: "ほのおのかべ", power: 21, mp: 3, learnLevel: 3, desc: "ほのおのかべで こうげきする", element: "fire" },
    fire1_3: { id: "fire1_3", name: "かえん", power: 24, mp: 4, learnLevel: 5, desc: "かえんで こうげきする", element: "fire" },
    fire1_4: { id: "fire1_4", name: "ほのおのちから", power: 27, mp: 5, learnLevel: 7, desc: "ほのおのちからで こうげきする", element: "fire" },
    fire1_5: { id: "fire1_5", name: "ねっせん", power: 30, mp: 6, learnLevel: 9, desc: "ねっせんで こうげきする", element: "fire" },
    fire2_1: { id: "fire2_1", name: "ほのおのうず", power: 34, mp: 7, learnLevel: 13, desc: "ほのおのうずで こうげきする", element: "fire" },
    fire2_2: { id: "fire2_2", name: "れんごく", power: 39, mp: 8, learnLevel: 17, desc: "れんごくで こうげきする", element: "fire" },
    fire2_3: { id: "fire2_3", name: "ひのもんじ", power: 44, mp: 9, learnLevel: 21, desc: "ひのもんじで こうげきする", element: "fire" },
    fire2_4: { id: "fire2_4", name: "フレア", power: 49, mp: 10, learnLevel: 25, desc: "フレアで こうげきする", element: "fire" },
    fire3_1: { id: "fire3_1", name: "メテオストライク", power: 56, mp: 13, learnLevel: 32, desc: "メテオストライクで こうげきする", element: "fire" },
    fire3_2: { id: "fire3_2", name: "かえんほうしゃ", power: 62, mp: 14, learnLevel: 36, desc: "かえんほうしゃで こうげきする", element: "fire" },
    fire3_3: { id: "fire3_3", name: "ほのおのけん", power: 68, mp: 15, learnLevel: 40, desc: "ほのおのけんで こうげきする", element: "fire" },
    fire3_4: { id: "fire3_4", name: "ぜいえんのつるぎ", power: 74, mp: 16, learnLevel: 44, desc: "ぜいえんのつるぎで こうげきする", element: "fire" },
    fire4_1: { id: "fire4_1", name: "プロミネンス", power: 82, mp: 19, learnLevel: 52, desc: "プロミネンスで こうげきする", element: "fire" },
    fire4_2: { id: "fire4_2", name: "ノヴァブラスト", power: 89, mp: 20, learnLevel: 56, desc: "ノヴァブラストで こうげきする", element: "fire" },
    fire4_3: { id: "fire4_3", name: "サンバースト", power: 96, mp: 21, learnLevel: 60, desc: "サンバーストで こうげきする", element: "fire" },
    fire4_4: { id: "fire4_4", name: "アルティメットフレア", power: 103, mp: 22, learnLevel: 64, desc: "アルティメットフレアで こうげきする", element: "fire" },

    water1_1: { id: "water1_1", name: "みずのはね", power: 18, mp: 2, learnLevel: 1, desc: "みずのはねで こうげきする", element: "water" },
    water1_2: { id: "water1_2", name: "みずでっぽう", power: 21, mp: 3, learnLevel: 3, desc: "みずでっぽうで こうげきする", element: "water" },
    water1_3: { id: "water1_3", name: "みずのまい", power: 24, mp: 4, learnLevel: 5, desc: "みずのまいで こうげきする", element: "water" },
    water1_4: { id: "water1_4", name: "すいしゅりけん", power: 27, mp: 5, learnLevel: 7, desc: "すいしゅりけんで こうげきする", element: "water" },
    water1_5: { id: "water1_5", name: "あわ", power: 30, mp: 6, learnLevel: 9, desc: "あわで こうげきする", element: "water" },
    water2_1: { id: "water2_1", name: "みずのうず", power: 34, mp: 7, learnLevel: 13, desc: "みずのうずで こうげきする", element: "water" },
    water2_2: { id: "water2_2", name: "スプラッシュ", power: 39, mp: 8, learnLevel: 17, desc: "スプラッシュで こうげきする", element: "water" },
    water2_3: { id: "water2_3", name: "ウォータージェット", power: 44, mp: 9, learnLevel: 21, desc: "ウォータージェットで こうげきする", element: "water" },
    water2_4: { id: "water2_4", name: "なみのり", power: 49, mp: 10, learnLevel: 25, desc: "なみのりで こうげきする", element: "water" },
    water2_5: { id: "water2_5", name: "しずくのカーテン", power: 54, mp: 11, learnLevel: 29, desc: "しずくのカーテンで こうげきする", element: "water" },
    water3_1: { id: "water3_1", name: "れいとうつぶて", power: 56, mp: 13, learnLevel: 32, desc: "れいとうつぶてで こうげきする", element: "water" },
    water3_2: { id: "water3_2", name: "アクアブレス", power: 62, mp: 14, learnLevel: 36, desc: "アクアブレスで こうげきする", element: "water" },
    water3_3: { id: "water3_3", name: "タイダルウェーブ", power: 68, mp: 15, learnLevel: 40, desc: "タイダルウェーブで こうげきする", element: "water" },
    water3_4: { id: "water3_4", name: "ウォーターやいば", power: 74, mp: 16, learnLevel: 44, desc: "ウォーターやいばで こうげきする", element: "water" },
    water4_1: { id: "water4_1", name: "オーシャンブレイク", power: 82, mp: 19, learnLevel: 52, desc: "オーシャンブレイクで こうげきする", element: "water" },
    water4_2: { id: "water4_2", name: "だいれいとう", power: 89, mp: 20, learnLevel: 56, desc: "だいれいとうで こうげきする", element: "water" },
    water4_3: { id: "water4_3", name: "アビスノヴァ", power: 96, mp: 21, learnLevel: 60, desc: "アビスノヴァで こうげきする", element: "water" },
    water4_4: { id: "water4_4", name: "しんすいのインパクト", power: 103, mp: 22, learnLevel: 64, desc: "しんすいのインパクトで こうげきする", element: "water" },

    grass1_1: { id: "grass1_1", name: "はっぱカッター", power: 18, mp: 2, learnLevel: 1, desc: "はっぱカッターで こうげきする", element: "grass" },
    grass1_2: { id: "grass1_2", name: "つるのムチ", power: 21, mp: 3, learnLevel: 3, desc: "つるのムチで こうげきする", element: "grass" },
    grass1_3: { id: "grass1_3", name: "タネばくだん", power: 24, mp: 4, learnLevel: 5, desc: "タネばくだんで こうげきする", element: "grass" },
    grass1_4: { id: "grass1_4", name: "せいちょう", power: 27, mp: 5, learnLevel: 7, desc: "せいちょうで こうげきする", element: "grass" },
    grass1_5: { id: "grass1_5", name: "どくのこな", power: 30, mp: 6, learnLevel: 9, desc: "どくのこなで こうげきする", element: "grass" },
    grass2_1: { id: "grass2_1", name: "つるのまきつき", power: 34, mp: 7, learnLevel: 13, desc: "つるのまきつきで こうげきする", element: "grass" },
    grass2_2: { id: "grass2_2", name: "はなふぶき", power: 39, mp: 8, learnLevel: 17, desc: "はなふぶきで こうげきする", element: "grass" },
    grass2_3: { id: "grass2_3", name: "しぜんのめぐみ", power: 44, mp: 9, learnLevel: 21, desc: "しぜんのめぐみで こうげきする", element: "grass" },
    grass2_4: { id: "grass2_4", name: "リーフブレード", power: 49, mp: 10, learnLevel: 25, desc: "リーフブレードで こうげきする", element: "grass" },
    grass3_1: { id: "grass3_1", name: "ジャングルブレス", power: 56, mp: 13, learnLevel: 32, desc: "ジャングルブレスで こうげきする", element: "grass" },
    grass3_2: { id: "grass3_2", name: "しぜんのいかり", power: 62, mp: 14, learnLevel: 36, desc: "しぜんのいかりで こうげきする", element: "grass" },
    grass3_3: { id: "grass3_3", name: "グラスフィールド", power: 68, mp: 15, learnLevel: 40, desc: "グラスフィールドで こうげきする", element: "grass" },
    grass3_4: { id: "grass3_4", name: "リーフストーム", power: 74, mp: 16, learnLevel: 44, desc: "リーフストームで こうげきする", element: "grass" },
    grass4_1: { id: "grass4_1", name: "ユグドラシル", power: 82, mp: 19, learnLevel: 52, desc: "ユグドラシルで こうげきする", element: "grass" },
    grass4_2: { id: "grass4_2", name: "グランドネイチャー", power: 89, mp: 20, learnLevel: 56, desc: "グランドネイチャーで こうげきする", element: "grass" },
    grass4_3: { id: "grass4_3", name: "フラワーヒール", power: 96, mp: 21, learnLevel: 60, desc: "フラワーヒールで こうげきする", element: "grass" },
    grass4_4: { id: "grass4_4", name: "ネイチャーズレイジ", power: 103, mp: 22, learnLevel: 64, desc: "ネイチャーズレイジで こうげきする", element: "grass" },

    wind1_1: { id: "wind1_1", name: "かぜおこし", power: 18, mp: 2, learnLevel: 1, desc: "かぜおこしで こうげきする", element: "wind" },
    wind1_2: { id: "wind1_2", name: "つむじかぜ", power: 21, mp: 3, learnLevel: 3, desc: "つむじかぜで こうげきする", element: "wind" },
    wind1_3: { id: "wind1_3", name: "かまいたち", power: 24, mp: 4, learnLevel: 5, desc: "かまいたちで こうげきする", element: "wind" },
    wind1_4: { id: "wind1_4", name: "すなぼこり", power: 27, mp: 5, learnLevel: 7, desc: "すなぼこりで こうげきする", element: "wind" },
    wind1_5: { id: "wind1_5", name: "はやて", power: 30, mp: 6, learnLevel: 9, desc: "はやてで こうげきする", element: "wind" },
    wind2_1: { id: "wind2_1", name: "ブリーズカッター", power: 34, mp: 7, learnLevel: 13, desc: "ブリーズカッターで こうげきする", element: "wind" },
    wind2_2: { id: "wind2_2", name: "エアスラッシュ", power: 39, mp: 8, learnLevel: 17, desc: "エアスラッシュで こうげきする", element: "wind" },
    wind2_3: { id: "wind2_3", name: "ウィンドカッター", power: 44, mp: 9, learnLevel: 21, desc: "ウィンドカッターで こうげきする", element: "wind" },
    wind2_4: { id: "wind2_4", name: "かぜのおどり", power: 49, mp: 10, learnLevel: 25, desc: "かぜのおどりで こうげきする", element: "wind" },
    wind3_1: { id: "wind3_1", name: "ストームフロー", power: 56, mp: 13, learnLevel: 32, desc: "ストームフローで こうげきする", element: "wind" },
    wind3_2: { id: "wind3_2", name: "スパイラルウィンド", power: 62, mp: 14, learnLevel: 36, desc: "スパイラルウィンドで こうげきする", element: "wind" },
    wind3_3: { id: "wind3_3", name: "エアブレイク", power: 68, mp: 15, learnLevel: 40, desc: "エアブレイクで こうげきする", element: "wind" },
    wind3_4: { id: "wind3_4", name: "ウィンドバースト", power: 74, mp: 16, learnLevel: 44, desc: "ウィンドバーストで こうげきする", element: "wind" },
    wind4_1: { id: "wind4_1", name: "エリアルレイヴ", power: 82, mp: 19, learnLevel: 52, desc: "エリアルレイヴで こうげきする", element: "wind" },
    wind4_2: { id: "wind4_2", name: "ハリケーンブレイク", power: 89, mp: 20, learnLevel: 56, desc: "ハリケーンブレイクで こうげきする", element: "wind" },
    wind4_3: { id: "wind4_3", name: "ウィンドブレード", power: 96, mp: 21, learnLevel: 60, desc: "ウィンドブレードで こうげきする", element: "wind" },
    wind4_4: { id: "wind4_4", name: "エターナルストーム", power: 103, mp: 22, learnLevel: 64, desc: "エターナルストームで こうげきする", element: "wind" },

    earth1_1: { id: "earth1_1", name: "どろだんご", power: 18, mp: 2, learnLevel: 1, desc: "どろだんごで こうげきする", element: "earth" },
    earth1_2: { id: "earth1_2", name: "いわおとし", power: 21, mp: 3, learnLevel: 3, desc: "いわおとしで こうげきする", element: "earth" },
    earth1_3: { id: "earth1_3", name: "どろかけ", power: 24, mp: 4, learnLevel: 5, desc: "どろかけで こうげきする", element: "earth" },
    earth1_4: { id: "earth1_4", name: "すなじごく", power: 27, mp: 5, learnLevel: 7, desc: "すなじごくで こうげきする", element: "earth" },
    earth2_1: { id: "earth2_1", name: "いわなだれ", power: 34, mp: 7, learnLevel: 13, desc: "いわなだれで こうげきする", element: "earth" },
    earth2_2: { id: "earth2_2", name: "マッドショット", power: 39, mp: 8, learnLevel: 17, desc: "マッドショットで こうげきする", element: "earth" },
    earth2_3: { id: "earth2_3", name: "どろのうず", power: 44, mp: 9, learnLevel: 21, desc: "どろのうずで こうげきする", element: "earth" },
    earth2_4: { id: "earth2_4", name: "ストーンエッジ", power: 49, mp: 10, learnLevel: 25, desc: "ストーンエッジで こうげきする", element: "earth" },
    earth2_5: { id: "earth2_5", name: "じしん", power: 54, mp: 11, learnLevel: 29, desc: "じしんで こうげきする", element: "earth" },
    earth3_1: { id: "earth3_1", name: "ロックブラスト", power: 56, mp: 13, learnLevel: 32, desc: "ロックブラストで こうげきする", element: "earth" },
    earth3_2: { id: "earth3_2", name: "アースクエイク", power: 62, mp: 14, learnLevel: 36, desc: "アースクエイクで こうげきする", element: "earth" },
    earth3_3: { id: "earth3_3", name: "アースウォール", power: 68, mp: 15, learnLevel: 40, desc: "アースウォールで こうげきする", element: "earth" },
    earth3_4: { id: "earth3_4", name: "すいちょくのちから", power: 74, mp: 16, learnLevel: 44, desc: "すいちょくのちからで こうげきする", element: "earth" },
    earth4_1: { id: "earth4_1", name: "テラノヴァブレイク", power: 82, mp: 19, learnLevel: 52, desc: "テラノヴァブレイクで こうげきする", element: "earth" },
    earth4_2: { id: "earth4_2", name: "グランドクラッシュ", power: 89, mp: 20, learnLevel: 56, desc: "グランドクラッシュで こうげきする", element: "earth" },
    earth4_3: { id: "earth4_3", name: "メガトンロック", power: 96, mp: 21, learnLevel: 60, desc: "メガトンロックで こうげきする", element: "earth" },
    earth4_4: { id: "earth4_4", name: "ガイアインパクト", power: 103, mp: 22, learnLevel: 64, desc: "ガイアインパクトで こうげきする", element: "earth" },

    thunder1_1: { id: "thunder1_1", name: "でんきショック", power: 18, mp: 2, learnLevel: 1, desc: "でんきショックで こうげきする", element: "thunder" },
    thunder1_2: { id: "thunder1_2", name: "スパーク", power: 21, mp: 3, learnLevel: 3, desc: "スパークで こうげきする", element: "thunder" },
    thunder1_3: { id: "thunder1_3", name: "ライトボルト", power: 24, mp: 4, learnLevel: 5, desc: "ライトボルトで こうげきする", element: "thunder" },
    thunder1_4: { id: "thunder1_4", name: "サンダージャブ", power: 27, mp: 5, learnLevel: 7, desc: "サンダージャブで こうげきする", element: "thunder" },
    thunder1_5: { id: "thunder1_5", name: "エレキボール", power: 30, mp: 6, learnLevel: 9, desc: "エレキボールで こうげきする", element: "thunder" },
    thunder2_1: { id: "thunder2_1", name: "サンダーウェーブ", power: 34, mp: 7, learnLevel: 13, desc: "サンダーウェーブで こうげきする", element: "thunder" },
    thunder2_2: { id: "thunder2_2", name: "チェインライト", power: 39, mp: 8, learnLevel: 17, desc: "チェインライトで こうげきする", element: "thunder" },
    thunder2_3: { id: "thunder2_3", name: "ライトニングランス", power: 44, mp: 9, learnLevel: 21, desc: "ライトニングランスで こうげきする", element: "thunder" },
    thunder2_4: { id: "thunder2_4", name: "エレキフィールド", power: 49, mp: 10, learnLevel: 25, desc: "エレキフィールドで こうげきする", element: "thunder" },
    thunder2_5: { id: "thunder2_5", name: "サンダーアロー", power: 54, mp: 11, learnLevel: 29, desc: "サンダーアローで こうげきする", element: "thunder" },
    thunder3_1: { id: "thunder3_1", name: "ライトニングブレイク", power: 56, mp: 13, learnLevel: 32, desc: "ライトニングブレイクで こうげきする", element: "thunder" },
    thunder3_2: { id: "thunder3_2", name: "サンダーストーム", power: 62, mp: 14, learnLevel: 36, desc: "サンダーストームで こうげきする", element: "thunder" },
    thunder3_3: { id: "thunder3_3", name: "ボルトスピア", power: 68, mp: 15, learnLevel: 40, desc: "ボルトスピアで こうげきする", element: "thunder" },
    thunder3_4: { id: "thunder3_4", name: "サンダーレイン", power: 74, mp: 16, learnLevel: 44, desc: "サンダーレインで こうげきする", element: "thunder" },
    thunder3_5: { id: "thunder3_5", name: "イナズマクラッシュ", power: 80, mp: 17, learnLevel: 48, desc: "イナズマクラッシュで こうげきする", element: "thunder" },
    thunder4_1: { id: "thunder4_1", name: "ギガボルト", power: 82, mp: 19, learnLevel: 52, desc: "ギガボルトで こうげきする", element: "thunder" },
    thunder4_2: { id: "thunder4_2", name: "らいていばんきん", power: 89, mp: 20, learnLevel: 56, desc: "らいていばんきんで こうげきする", element: "thunder" },
    thunder4_3: { id: "thunder4_3", name: "ライトニングノヴァ", power: 96, mp: 21, learnLevel: 60, desc: "ライトニングノヴァで こうげきする", element: "thunder" },
    thunder4_4: { id: "thunder4_4", name: "カミナリイカヅチ", power: 103, mp: 22, learnLevel: 64, desc: "カミナリイカヅチで こうげきする", element: "thunder" },
    thunder4_5: { id: "thunder4_5", name: "アルティメットサンダー", power: 110, mp: 23, learnLevel: 68, desc: "アルティメットサンダーで こうげきする", element: "thunder" },

    heaven1_1: { id: "heaven1_1", name: "ヒーリングライト", power: 18, mp: 2, learnLevel: 1, desc: "ヒーリングライトで こうげきする", element: "heaven" },
    heaven1_2: { id: "heaven1_2", name: "ピュアフラッシュ", power: 21, mp: 3, learnLevel: 3, desc: "ピュアフラッシュで こうげきする", element: "heaven" },
    heaven1_3: { id: "heaven1_3", name: "セイントビーム", power: 24, mp: 4, learnLevel: 5, desc: "セイントビームで こうげきする", element: "heaven" },
    heaven1_4: { id: "heaven1_4", name: "ホーリーガード", power: 27, mp: 5, learnLevel: 7, desc: "ホーリーガードで こうげきする", element: "heaven" },
    heaven1_5: { id: "heaven1_5", name: "ラディアンス", power: 30, mp: 6, learnLevel: 9, desc: "ラディアンスで こうげきする", element: "heaven" },
    heaven2_1: { id: "heaven2_1", name: "プラズマヒール", power: 34, mp: 7, learnLevel: 13, desc: "プラズマヒールで こうげきする", element: "heaven" },
    heaven2_2: { id: "heaven2_2", name: "セイントクロス", power: 39, mp: 8, learnLevel: 17, desc: "セイントクロスで こうげきする", element: "heaven" },
    heaven2_3: { id: "heaven2_3", name: "ホーリーランス", power: 44, mp: 9, learnLevel: 21, desc: "ホーリーランスで こうげきする", element: "heaven" },
    heaven2_4: { id: "heaven2_4", name: "ディバインシールド", power: 49, mp: 10, learnLevel: 25, desc: "ディバインシールドで こうげきする", element: "heaven" },
    heaven2_5: { id: "heaven2_5", name: "シャイニングサークル", power: 54, mp: 11, learnLevel: 29, desc: "シャイニングサークルで こうげきする", element: "heaven" },
    heaven3_1: { id: "heaven3_1", name: "セイクリッドレイ", power: 56, mp: 13, learnLevel: 32, desc: "セイクリッドレイで こうげきする", element: "heaven" },
    heaven3_2: { id: "heaven3_2", name: "ライトオブヘブン", power: 62, mp: 14, learnLevel: 36, desc: "ライトオブヘブンで こうげきする", element: "heaven" },
    heaven3_3: { id: "heaven3_3", name: "ホーリーストーム", power: 68, mp: 15, learnLevel: 40, desc: "ホーリーストームで こうげきする", element: "heaven" },
    heaven3_4: { id: "heaven3_4", name: "ルミナスブレイク", power: 74, mp: 16, learnLevel: 44, desc: "ルミナスブレイクで こうげきする", element: "heaven" },
    heaven3_5: { id: "heaven3_5", name: "ジャッジメント", power: 80, mp: 17, learnLevel: 48, desc: "ジャッジメントで こうげきする", element: "heaven" },
    heaven4_1: { id: "heaven4_1", name: "セイクリッドノヴァ", power: 82, mp: 19, learnLevel: 52, desc: "セイクリッドノヴァで こうげきする", element: "heaven" },
    heaven4_2: { id: "heaven4_2", name: "ヘブンズゲート", power: 89, mp: 20, learnLevel: 56, desc: "ヘブンズゲートで こうげきする", element: "heaven" },
    heaven4_3: { id: "heaven4_3", name: "ラストライト", power: 96, mp: 21, learnLevel: 60, desc: "ラストライトで こうげきする", element: "heaven" },
    heaven4_4: { id: "heaven4_4", name: "スターライトエクスプロード", power: 103, mp: 22, learnLevel: 64, desc: "スターライトエクスプロードで こうげきする", element: "heaven" },
    heaven4_5: { id: "heaven4_5", name: "アルティメットセイバー", power: 110, mp: 23, learnLevel: 68, desc: "アルティメットセイバーで こうげきする", element: "heaven" },

    dark1_1: { id: "dark1_1", name: "ダークショット", power: 18, mp: 2, learnLevel: 1, desc: "ダークショットで こうげきする", element: "dark" },
    dark1_2: { id: "dark1_2", name: "ナイトミスト", power: 21, mp: 3, learnLevel: 3, desc: "ナイトミストで こうげきする", element: "dark" },
    dark1_3: { id: "dark1_3", name: "ダークスラッシュ", power: 24, mp: 4, learnLevel: 5, desc: "ダークスラッシュで こうげきする", element: "dark" },
    dark1_4: { id: "dark1_4", name: "カースアイ", power: 27, mp: 5, learnLevel: 7, desc: "カースアイで こうげきする", element: "dark" },
    dark1_5: { id: "dark1_5", name: "ソウルドレイン", power: 30, mp: 6, learnLevel: 9, desc: "ソウルドレインで こうげきする", element: "dark" },
    dark2_1: { id: "dark2_1", name: "シャドウウェーブ", power: 34, mp: 7, learnLevel: 13, desc: "シャドウウェーブで こうげきする", element: "dark" },
    dark2_2: { id: "dark2_2", name: "ダークバインド", power: 39, mp: 8, learnLevel: 17, desc: "ダークバインドで こうげきする", element: "dark" },
    dark2_3: { id: "dark2_3", name: "ドレインタッチ", power: 44, mp: 9, learnLevel: 21, desc: "ドレインタッチで こうげきする", element: "dark" },
    dark2_4: { id: "dark2_4", name: "カースフィールド", power: 49, mp: 10, learnLevel: 25, desc: "カースフィールドで こうげきする", element: "dark" },
    dark2_5: { id: "dark2_5", name: "ダークサークル", power: 54, mp: 11, learnLevel: 29, desc: "ダークサークルで こうげきする", element: "dark" },
    dark3_1: { id: "dark3_1", name: "ダークネスストライク", power: 56, mp: 13, learnLevel: 32, desc: "ダークネスストライクで こうげきする", element: "dark" },
    dark3_2: { id: "dark3_2", name: "ソウルサクリファイス", power: 62, mp: 14, learnLevel: 36, desc: "ソウルサクリファイスで こうげきする", element: "dark" },
    dark3_3: { id: "dark3_3", name: "デスウェーブ", power: 68, mp: 15, learnLevel: 40, desc: "デスウェーブで こうげきする", element: "dark" },
    dark3_4: { id: "dark3_4", name: "カースブラスト", power: 74, mp: 16, learnLevel: 44, desc: "カースブラストで こうげきする", element: "dark" },
    dark3_5: { id: "dark3_5", name: "シャドウフォール", power: 80, mp: 17, learnLevel: 48, desc: "シャドウフォールで こうげきする", element: "dark" },
    dark4_1: { id: "dark4_1", name: "ダークネスノヴァ", power: 82, mp: 19, learnLevel: 52, desc: "ダークネスノヴァで こうげきする", element: "dark" },
    dark4_2: { id: "dark4_2", name: "デーモンズゲイト", power: 89, mp: 20, learnLevel: 56, desc: "デーモンズゲイトで こうげきする", element: "dark" },
    dark4_3: { id: "dark4_3", name: "ソウルイクリプス", power: 96, mp: 21, learnLevel: 60, desc: "ソウルイクリプスで こうげきする", element: "dark" },
    dark4_4: { id: "dark4_4", name: "ワールドオブダーク", power: 103, mp: 22, learnLevel: 64, desc: "ワールドオブダークで こうげきする", element: "dark" },
    dark4_5: { id: "dark4_5", name: "アルティメットダークネス", power: 110, mp: 23, learnLevel: 68, desc: "アルティメットダークネスで こうげきする", element: "dark" },

    magic1_1: { id: "magic1_1", name: "マジックミサイル", power: 18, mp: 2, learnLevel: 1, desc: "マジックミサイルで こうげきする", element: "magic" },
    magic1_2: { id: "magic1_2", name: "マジックアロー", power: 21, mp: 3, learnLevel: 3, desc: "マジックアローで こうげきする", element: "magic" },
    magic1_3: { id: "magic1_3", name: "マジックブレット", power: 24, mp: 4, learnLevel: 5, desc: "マジックブレットで こうげきする", element: "magic" },
    magic1_4: { id: "magic1_4", name: "マジックシールド", power: 27, mp: 5, learnLevel: 7, desc: "マジックシールドで こうげきする", element: "magic" },
    magic1_5: { id: "magic1_5", name: "スリープ", power: 30, mp: 6, learnLevel: 9, desc: "スリープで こうげきする", element: "magic" },
    magic2_1: { id: "magic2_1", name: "マジックウェーブ", power: 34, mp: 7, learnLevel: 13, desc: "マジックウェーブで こうげきする", element: "magic" },
    magic2_2: { id: "magic2_2", name: "エレメンタルボルト", power: 39, mp: 8, learnLevel: 17, desc: "エレメンタルボルトで こうげきする", element: "magic" },
    magic2_3: { id: "magic2_3", name: "マナバースト", power: 44, mp: 9, learnLevel: 21, desc: "マナバーストで こうげきする", element: "magic" },
    magic2_4: { id: "magic2_4", name: "マジックサークル", power: 49, mp: 10, learnLevel: 25, desc: "マジックサークルで こうげきする", element: "magic" },
    magic2_5: { id: "magic2_5", name: "テレポート", power: 54, mp: 11, learnLevel: 29, desc: "テレポートで こうげきする", element: "magic" },
    magic3_1: { id: "magic3_1", name: "メテオ", power: 56, mp: 13, learnLevel: 32, desc: "メテオで こうげきする", element: "magic" },
    magic3_2: { id: "magic3_2", name: "メイルストロム", power: 62, mp: 14, learnLevel: 36, desc: "メイルストロムで こうげきする", element: "magic" },
    magic3_3: { id: "magic3_3", name: "マジックカノン", power: 68, mp: 15, learnLevel: 40, desc: "マジックカノンで こうげきする", element: "magic" },
    magic3_4: { id: "magic3_4", name: "マジックオーブ", power: 74, mp: 16, learnLevel: 44, desc: "マジックオーブで こうげきする", element: "magic" },
    magic3_5: { id: "magic3_5", name: "ディメンションゲート", power: 80, mp: 17, learnLevel: 48, desc: "ディメンションゲートで こうげきする", element: "magic" },
    magic4_1: { id: "magic4_1", name: "メテオストーム", power: 82, mp: 19, learnLevel: 52, desc: "メテオストームで こうげきする", element: "magic" },
    magic4_2: { id: "magic4_2", name: "カオスバースト", power: 89, mp: 20, learnLevel: 56, desc: "カオスバーストで こうげきする", element: "magic" },
    magic4_3: { id: "magic4_3", name: "アルカナノヴァ", power: 96, mp: 21, learnLevel: 60, desc: "アルカナノヴァで こうげきする", element: "magic" },
    magic4_4: { id: "magic4_4", name: "マナブレイク", power: 103, mp: 22, learnLevel: 64, desc: "マナブレイクで こうげきする", element: "magic" },
    magic4_5: { id: "magic4_5", name: "アルティメットマジック", power: 110, mp: 23, learnLevel: 68, desc: "アルティメットマジックで こうげきする", element: "magic" },

    beast1_1: { id: "beast1_1", name: "ひっかき", power: 18, mp: 2, learnLevel: 1, desc: "ひっかきで こうげきする", element: "beast" },
    beast1_2: { id: "beast1_2", name: "かみつき", power: 21, mp: 3, learnLevel: 3, desc: "かみつきで こうげきする", element: "beast" },
    beast1_3: { id: "beast1_3", name: "しっぽアタック", power: 24, mp: 4, learnLevel: 5, desc: "しっぽアタックで こうげきする", element: "beast" },
    beast1_4: { id: "beast1_4", name: "つきとばし", power: 27, mp: 5, learnLevel: 7, desc: "つきとばしで こうげきする", element: "beast" },
    beast1_5: { id: "beast1_5", name: "いかりのほえ", power: 30, mp: 6, learnLevel: 9, desc: "いかりのほえで こうげきする", element: "beast" },
    beast2_1: { id: "beast2_1", name: "とびかかり", power: 34, mp: 7, learnLevel: 13, desc: "とびかかりで こうげきする", element: "beast" },
    beast2_2: { id: "beast2_2", name: "つめとぎ", power: 39, mp: 8, learnLevel: 17, desc: "つめとぎで こうげきする", element: "beast" },
    beast2_3: { id: "beast2_3", name: "らんぺージ", power: 44, mp: 9, learnLevel: 21, desc: "らんぺージで こうげきする", element: "beast" },
    beast2_4: { id: "beast2_4", name: "ロアー", power: 49, mp: 10, learnLevel: 25, desc: "ロアーで こうげきする", element: "beast" },
    beast2_5: { id: "beast2_5", name: "ダッシュクロー", power: 54, mp: 11, learnLevel: 29, desc: "ダッシュクローで こうげきする", element: "beast" },
    beast3_1: { id: "beast3_1", name: "ハウリングブロー", power: 56, mp: 13, learnLevel: 32, desc: "ハウリングブローで こうげきする", element: "beast" },
    beast3_2: { id: "beast3_2", name: "ビーストファング", power: 62, mp: 14, learnLevel: 36, desc: "ビーストファングで こうげきする", element: "beast" },
    beast3_3: { id: "beast3_3", name: "ワイルドチャージ", power: 68, mp: 15, learnLevel: 40, desc: "ワイルドチャージで こうげきする", element: "beast" },
    beast3_4: { id: "beast3_4", name: "かみくだき", power: 74, mp: 16, learnLevel: 44, desc: "かみくだきで こうげきする", element: "beast" },
    beast3_5: { id: "beast3_5", name: "ビーストラッシュ", power: 80, mp: 17, learnLevel: 48, desc: "ビーストラッシュで こうげきする", element: "beast" },
    beast4_1: { id: "beast4_1", name: "フューリーストライク", power: 82, mp: 19, learnLevel: 52, desc: "フューリーストライクで こうげきする", element: "beast" },
    beast4_2: { id: "beast4_2", name: "キングオブビースト", power: 89, mp: 20, learnLevel: 56, desc: "キングオブビーストで こうげきする", element: "beast" },
    beast4_3: { id: "beast4_3", name: "プライマルブレイク", power: 96, mp: 21, learnLevel: 60, desc: "プライマルブレイクで こうげきする", element: "beast" },
    beast4_4: { id: "beast4_4", name: "デスハウル", power: 103, mp: 22, learnLevel: 64, desc: "デスハウルで こうげきする", element: "beast" },
    beast4_5: { id: "beast4_5", name: "アルティメットビースト", power: 110, mp: 23, learnLevel: 68, desc: "アルティメットビーストで こうげきする", element: "beast" }
  };
  var SKILL_LEARN_ORDER = ["tackle", "sandkick", "headbutt", "renzoku"];

  // なかまが覚えるわざの順番(属性ごと。10属性それぞれ初級→中級→上級→特級の順で習得)
  var COMPANION_SKILL_TRACKS = {
    none: ["tackle", "headbutt"],
    fire: ["tackle", "fire1_1", "fire1_2", "fire1_3", "fire1_4", "fire1_5", "fire2_1", "fire2_2", "fire2_3", "fire2_4", "fire3_1", "fire3_2", "fire3_3", "fire3_4", "fire4_1", "fire4_2", "fire4_3", "fire4_4"],
    water: ["tackle", "water1_1", "water1_2", "water1_3", "water1_4", "water1_5", "water2_1", "water2_2", "water2_3", "water2_4", "water2_5", "water3_1", "water3_2", "water3_3", "water3_4", "water4_1", "water4_2", "water4_3", "water4_4"],
    grass: ["tackle", "grass1_1", "grass1_2", "grass1_3", "grass1_4", "grass1_5", "grass2_1", "grass2_2", "grass2_3", "grass2_4", "grass3_1", "grass3_2", "grass3_3", "grass3_4", "grass4_1", "grass4_2", "grass4_3", "grass4_4"],
    wind: ["tackle", "wind1_1", "wind1_2", "wind1_3", "wind1_4", "wind1_5", "wind2_1", "wind2_2", "wind2_3", "wind2_4", "wind3_1", "wind3_2", "wind3_3", "wind3_4", "wind4_1", "wind4_2", "wind4_3", "wind4_4"],
    earth: ["tackle", "earth1_1", "earth1_2", "earth1_3", "earth1_4", "earth2_1", "earth2_2", "earth2_3", "earth2_4", "earth2_5", "earth3_1", "earth3_2", "earth3_3", "earth3_4", "earth4_1", "earth4_2", "earth4_3", "earth4_4"],
    thunder: ["tackle", "thunder1_1", "thunder1_2", "thunder1_3", "thunder1_4", "thunder1_5", "thunder2_1", "thunder2_2", "thunder2_3", "thunder2_4", "thunder2_5", "thunder3_1", "thunder3_2", "thunder3_3", "thunder3_4", "thunder3_5", "thunder4_1", "thunder4_2", "thunder4_3", "thunder4_4", "thunder4_5"],
    heaven: ["tackle", "heaven1_1", "heaven1_2", "heaven1_3", "heaven1_4", "heaven1_5", "heaven2_1", "heaven2_2", "heaven2_3", "heaven2_4", "heaven2_5", "heaven3_1", "heaven3_2", "heaven3_3", "heaven3_4", "heaven3_5", "heaven4_1", "heaven4_2", "heaven4_3", "heaven4_4", "heaven4_5"],
    dark: ["tackle", "dark1_1", "dark1_2", "dark1_3", "dark1_4", "dark1_5", "dark2_1", "dark2_2", "dark2_3", "dark2_4", "dark2_5", "dark3_1", "dark3_2", "dark3_3", "dark3_4", "dark3_5", "dark4_1", "dark4_2", "dark4_3", "dark4_4", "dark4_5"],
    magic: ["tackle", "magic1_1", "magic1_2", "magic1_3", "magic1_4", "magic1_5", "magic2_1", "magic2_2", "magic2_3", "magic2_4", "magic2_5", "magic3_1", "magic3_2", "magic3_3", "magic3_4", "magic3_5", "magic4_1", "magic4_2", "magic4_3", "magic4_4", "magic4_5"],
    beast: ["tackle", "beast1_1", "beast1_2", "beast1_3", "beast1_4", "beast1_5", "beast2_1", "beast2_2", "beast2_3", "beast2_4", "beast2_5", "beast3_1", "beast3_2", "beast3_3", "beast3_4", "beast3_5", "beast4_1", "beast4_2", "beast4_3", "beast4_4", "beast4_5"]
  };

  // ---------------- Elements (10属性、攻撃側ごとに強い/弱い属性が1つずつ) ----------------
  var ELEMENT_LABELS = {
    fire: "ほのお", water: "みず", grass: "くさ", wind: "かぜ", earth: "つち",
    thunder: "でんき", heaven: "てん", dark: "やみ", magic: "まほう", beast: "けもの"
  };
  var ELEMENT_EFFECTS = {
    fire: "assets/effects/effect_fire.webp",
    water: "assets/effects/effect_water.webp",
    grass: "assets/effects/effect_grass.webp",
    wind: "assets/effects/effect_wind.webp",
    earth: "assets/effects/effect_earth.webp",
    thunder: "assets/effects/effect_thunder.webp",
    heaven: "assets/effects/effect_heaven.webp",
    dark: "assets/effects/effect_dark.webp",
    magic: "assets/effects/effect_magic.webp",
    beast: "assets/effects/effect_beast.webp"
  };
  // 属性ごとの「チャージ→飛翔→着弾+消散」複数コマ演出素材(1属性につき1〜3パターン)。
  // ここに無い属性(つち・やみ・まほう・けもの)は ELEMENT_EFFECTS の単一静止画にフォールバックする。
  var ELEMENT_EFFECT_ANIM = {
    fire: [
      ["assets/effects/anim/fire_1/f1.webp", "assets/effects/anim/fire_1/f2.webp", "assets/effects/anim/fire_1/f3.webp", "assets/effects/anim/fire_1/f4.webp", "assets/effects/anim/fire_1/f5.webp", "assets/effects/anim/fire_1/f6.webp"],
      ["assets/effects/anim/fire_2/f1.webp", "assets/effects/anim/fire_2/f2.webp", "assets/effects/anim/fire_2/f3.webp"],
      ["assets/effects/anim/fire_3/f1.webp", "assets/effects/anim/fire_3/f2.webp", "assets/effects/anim/fire_3/f3.webp"]
    ],
    water: [
      ["assets/effects/anim/water_1/f1.webp", "assets/effects/anim/water_1/f2.webp", "assets/effects/anim/water_1/f3.webp", "assets/effects/anim/water_1/f4.webp"],
      ["assets/effects/anim/water_2/f1.webp", "assets/effects/anim/water_2/f2.webp", "assets/effects/anim/water_2/f3.webp", "assets/effects/anim/water_2/f4.webp"],
      ["assets/effects/anim/water_3/f1.webp", "assets/effects/anim/water_3/f2.webp", "assets/effects/anim/water_3/f3.webp", "assets/effects/anim/water_3/f4.webp"]
    ],
    wind: [
      ["assets/effects/anim/wind_1/f1.webp", "assets/effects/anim/wind_1/f2.webp", "assets/effects/anim/wind_1/f3.webp"],
      ["assets/effects/anim/wind_2/f1.webp", "assets/effects/anim/wind_2/f2.webp", "assets/effects/anim/wind_2/f3.webp"],
      ["assets/effects/anim/wind_3/f1.webp", "assets/effects/anim/wind_3/f2.webp", "assets/effects/anim/wind_3/f3.webp"]
    ],
    thunder: [
      ["assets/effects/anim/thunder_1/f1.webp", "assets/effects/anim/thunder_1/f2.webp", "assets/effects/anim/thunder_1/f3.webp", "assets/effects/anim/thunder_1/f4.webp", "assets/effects/anim/thunder_1/f5.webp", "assets/effects/anim/thunder_1/f6.webp"],
      ["assets/effects/anim/thunder_2/f1.webp", "assets/effects/anim/thunder_2/f2.webp", "assets/effects/anim/thunder_2/f3.webp", "assets/effects/anim/thunder_2/f4.webp", "assets/effects/anim/thunder_2/f5.webp", "assets/effects/anim/thunder_2/f6.webp"],
      ["assets/effects/anim/thunder_3/f1.webp", "assets/effects/anim/thunder_3/f2.webp", "assets/effects/anim/thunder_3/f3.webp", "assets/effects/anim/thunder_3/f4.webp", "assets/effects/anim/thunder_3/f5.webp"]
    ],
    grass: [
      ["assets/effects/anim/grass_1/f1.webp", "assets/effects/anim/grass_1/f2.webp", "assets/effects/anim/grass_1/f3.webp", "assets/effects/anim/grass_1/f4.webp", "assets/effects/anim/grass_1/f5.webp", "assets/effects/anim/grass_1/f6.webp"],
      ["assets/effects/anim/grass_2/f1.webp", "assets/effects/anim/grass_2/f2.webp", "assets/effects/anim/grass_2/f3.webp", "assets/effects/anim/grass_2/f4.webp", "assets/effects/anim/grass_2/f5.webp", "assets/effects/anim/grass_2/f6.webp"],
      ["assets/effects/anim/grass_3/f1.webp", "assets/effects/anim/grass_3/f2.webp", "assets/effects/anim/grass_3/f3.webp", "assets/effects/anim/grass_3/f4.webp", "assets/effects/anim/grass_3/f5.webp", "assets/effects/anim/grass_3/f6.webp"]
    ],
    heaven: [
      ["assets/effects/anim/heaven_1/f1.webp", "assets/effects/anim/heaven_1/f2.webp", "assets/effects/anim/heaven_1/f3.webp", "assets/effects/anim/heaven_1/f4.webp", "assets/effects/anim/heaven_1/f5.webp", "assets/effects/anim/heaven_1/f6.webp"]
    ]
  };
  // わざ(スキル)IDごとに使う演出パターンを決める(同じ属性でも技によって見た目が変わる = 「わざを増やす」)。
  // 同じ技は常に同じパターンになるよう、ID文字列から決定的にハッシュして選ぶ。
  function pickEffectFrames(element, moveId) {
    var variants = ELEMENT_EFFECT_ANIM[element];
    if (!variants || !variants.length || !moveId) return null;
    var hash = 0;
    for (var i = 0; i < moveId.length; i++) {
      hash = (hash * 31 + moveId.charCodeAt(i)) >>> 0;
    }
    return variants[hash % variants.length];
  }
  // 属性アイコン(敵名/わざ一覧/ずかんで属性がひと目で分かるようにするバッジ画像)
  var ELEMENT_ICONS = {
    fire: "assets/icons/elem_fire.webp",
    water: "assets/icons/elem_water.webp",
    grass: "assets/icons/elem_grass.webp",
    wind: "assets/icons/elem_wind.webp",
    earth: "assets/icons/elem_earth.webp",
    thunder: "assets/icons/elem_thunder.webp",
    heaven: "assets/icons/elem_heaven.webp",
    dark: "assets/icons/elem_dark.webp",
    magic: "assets/icons/elem_magic.webp",
    beast: "assets/icons/elem_beast.webp"
  };
  // 攻撃側の属性ごとに「強い(2倍)」「弱い(0.5倍)」相手を1つずつ持つ(それ以外は等倍)
  var ELEMENT_MATCHUP = {
    fire: { strong: "grass", weak: "water" },
    water: { strong: "fire", weak: "thunder" },
    grass: { strong: "water", weak: "fire" },
    wind: { strong: "grass", weak: "earth" },
    earth: { strong: "thunder", weak: "grass" },
    thunder: { strong: "water", weak: "earth" },
    heaven: { strong: "dark", weak: "magic" },
    dark: { strong: "magic", weak: "heaven" },
    magic: { strong: "heaven", weak: "dark" },
    beast: { strong: "magic", weak: "wind" }
  };
  function getElementMatchup(atkElem, defElem) {
    if (!atkElem || atkElem === "none" || !defElem || defElem === "none") return { mult: 1, tier: "neutral" };
    var m = ELEMENT_MATCHUP[atkElem];
    if (!m) return { mult: 1, tier: "neutral" };
    if (m.strong === defElem) return { mult: 2, tier: "strong" };
    if (m.weak === defElem) return { mult: 0.5, tier: "weak" };
    return { mult: 1, tier: "neutral" };
  }

  // ---------------- Boss rewards (撃破時: 専用わざ+能力アップ+バッジ) ----------------
  var BOSS_REWARDS = {
    yougan_golem: { skillId: "yougan_crush", badgeLabel: "ようがんのバッジ", statBonus: { maxHp: 10 }, itemId: "high_potion", itemAmount: 2 },
    yeti: { skillId: "yeti_blizzard", badgeLabel: "こおりのバッジ", statBonus: { maxMp: 8, def: 3 }, itemId: "high_mana", itemAmount: 2 },
    oni_ou: { skillId: "oni_smash", badgeLabel: "だいちのバッジ", statBonus: { atk: 5 }, itemId: "high_potion", itemAmount: 2 },
    majin_madoushi: { skillId: "madoushi_curse", badgeLabel: "まほうのバッジ", statBonus: { maxMp: 10, spd: 3 }, itemId: "high_mana", itemAmount: 2 },
    akuma: { skillId: "akuma_claw", badgeLabel: "あくまのバッジ", statBonus: { maxHp: 15, def: 5 }, itemId: "high_potion", itemAmount: 2 },
    dragon: { skillId: "dragon_thunder", badgeLabel: "りゅうのバッジ", statBonus: { atk: 6 }, itemId: "high_mana", itemAmount: 2 },
    mahitotsu_ou: { skillId: "mahitotsu_smash", badgeLabel: "まひとつめのバッジ", statBonus: { maxHp: 12, def: 4 }, itemId: "high_potion", itemAmount: 2 },
    yurei_ou: { skillId: "yurei_ou_curse", badgeLabel: "ゆうれいおうのバッジ", statBonus: { spd: 6, atk: 4 }, itemId: "high_mana", itemAmount: 2 },
    shitennou_yougan: { skillId: "shitennou_yougan_blast", badgeLabel: "してんのう・えんのバッジ", statBonus: { maxHp: 15 }, itemId: "elixir", itemAmount: 1 },
    shitennou_yeti: { skillId: "shitennou_yeti_zero", badgeLabel: "してんのう・ひょうのバッジ", statBonus: { maxMp: 12, def: 4 }, itemId: "elixir", itemAmount: 1 },
    shitennou_oni: { skillId: "shitennou_oni_split", badgeLabel: "してんのう・ちのバッジ", statBonus: { atk: 8 }, itemId: "elixir", itemAmount: 1 },
    shitennou_madoushi: { skillId: "shitennou_madoushi_ultima", badgeLabel: "してんのう・まのバッジ", statBonus: { maxMp: 15, spd: 5 }, itemId: "elixir", itemAmount: 1 }
  };
  var BOSS_ORDER = [
    "yougan_golem", "yeti", "oni_ou", "majin_madoushi", "akuma",
    "dragon", "mahitotsu_ou", "yurei_ou",
    "shitennou_yougan", "shitennou_yeti", "shitennou_oni", "shitennou_madoushi"
  ];

  // ---------------- Items ----------------
  function ballAnim(prefix) {
    var base = "assets/capture/capture_" + prefix + "_";
    return {
      fly: base + "fly.webp",
      squish: base + "squish.webp",
      wobble: [base + "wobble1.webp", base + "wobble2.webp", base + "wobble3.webp"],
      success: base + "success.webp",
      fail: base + "fail.webp"
    };
  }
  var ITEMS = {
    kizugusuri: { id: "kizugusuri", name: "きずぐすり", desc: "HPを 30 かいふくする", kind: "hp", amount: 30, price: 20, icon: "assets/items/icon_kizugusuri.webp" },
    manashizuku: { id: "manashizuku", name: "マナのしずく", desc: "MPを 15 かいふくする", kind: "mp", amount: 15, price: 25, icon: "assets/items/icon_manashizuku.webp" },
    nakama_ball: { id: "nakama_ball", name: "チモシーボール", desc: "やせいの モンスターに なげて なかまに できる(ボスには 使えない) せいこうりつ ×1.0", kind: "ball", catchMult: 1.0, price: 40, icon: "assets/items/icon_ball_timothy.webp", captureAnim: ballAnim("ball") },
    super_ball: { id: "super_ball", name: "スーパーチモシーボール", desc: "やせいの モンスターに なげて なかまに できる(ボスには 使えない) せいこうりつ ×1.5", kind: "ball", catchMult: 1.5, price: 100, icon: "assets/items/icon_ball_super.webp", captureAnim: ballAnim("super_ball") },
    hyper_ball: { id: "hyper_ball", name: "ハイパーチモシーボール", desc: "やせいの モンスターに なげて なかまに できる(ボスには 使えない) せいこうりつ ×2.0", kind: "ball", catchMult: 2.0, price: 220, icon: "assets/items/icon_ball_hyper.webp", captureAnim: ballAnim("hyper_ball") },
    master_ball: { id: "master_ball", name: "マスターチモシーボール", desc: "やせいの モンスターに なげて なかまに できる(ボスには 使えない) かならず なかまに なる", kind: "ball", catchMult: Infinity, price: 800, icon: "assets/items/icon_ball_master.webp", captureAnim: ballAnim("master_ball") },
    high_potion: { id: "high_potion", name: "ハイポーション", desc: "HPを 60 かいふくする", kind: "hp", amount: 60, price: 55, icon: "assets/items/icon_high_potion.webp" },
    high_mana: { id: "high_mana", name: "せいれいの けっしょう", desc: "MPを 35 かいふくする", kind: "mp", amount: 35, price: 70, icon: "assets/items/icon_high_mana.webp" },
    elixir: { id: "elixir", name: "エリクサー", desc: "HPと MPを ぜんかい かいふくする", kind: "full", icon: "assets/items/icon_elixir.webp" },
    fire_pellet: { id: "fire_pellet", name: "ほのおのペレット", desc: "たべると ほのお属性の わざを おぼえる(なかまは ほのお属性のみ)", kind: "pellet", element: "fire", skillId: "fire3_1", price: 150, icon: "assets/icons/elem_fire.webp" },
    water_pellet: { id: "water_pellet", name: "みずのペレット", desc: "たべると みず属性の わざを おぼえる(なかまは みず属性のみ)", kind: "pellet", element: "water", skillId: "water3_1", price: 150, icon: "assets/icons/elem_water.webp" },
    grass_pellet: { id: "grass_pellet", name: "くさのペレット", desc: "たべると くさ属性の わざを おぼえる(なかまは くさ属性のみ)", kind: "pellet", element: "grass", skillId: "grass3_1", price: 150, icon: "assets/icons/elem_grass.webp" },
    wind_pellet: { id: "wind_pellet", name: "かぜのペレット", desc: "たべると かぜ属性の わざを おぼえる(なかまは かぜ属性のみ)", kind: "pellet", element: "wind", skillId: "wind3_1", price: 150, icon: "assets/icons/elem_wind.webp" },
    earth_pellet: { id: "earth_pellet", name: "つちのペレット", desc: "たべると つち属性の わざを おぼえる(なかまは つち属性のみ)", kind: "pellet", element: "earth", skillId: "earth3_1", price: 150, icon: "assets/icons/elem_earth.webp" },
    thunder_pellet: { id: "thunder_pellet", name: "でんきのペレット", desc: "たべると でんき属性の わざを おぼえる(なかまは でんき属性のみ)", kind: "pellet", element: "thunder", skillId: "thunder3_1", price: 150, icon: "assets/icons/elem_thunder.webp" },
    heaven_pellet: { id: "heaven_pellet", name: "てんのペレット", desc: "たべると てん属性の わざを おぼえる(なかまは てん属性のみ)", kind: "pellet", element: "heaven", skillId: "heaven3_1", price: 150, icon: "assets/icons/elem_heaven.webp" },
    dark_pellet: { id: "dark_pellet", name: "やみのペレット", desc: "たべると やみ属性の わざを おぼえる(なかまは やみ属性のみ)", kind: "pellet", element: "dark", skillId: "dark3_1", price: 150, icon: "assets/icons/elem_dark.webp" },
    magic_pellet: { id: "magic_pellet", name: "まほうのペレット", desc: "たべると まほう属性の わざを おぼえる(なかまは まほう属性のみ)", kind: "pellet", element: "magic", skillId: "magic3_1", price: 150, icon: "assets/icons/elem_magic.webp" },
    beast_pellet: { id: "beast_pellet", name: "けもののペレット", desc: "たべると けもの属性の わざを おぼえる(なかまは けもの属性のみ)", kind: "pellet", element: "beast", skillId: "beast3_1", price: 150, icon: "assets/icons/elem_beast.webp" },
    furui_kagi: { id: "furui_kagi", name: "ふるいカギ", desc: "村のどこかで 使えそうな、古びたカギ。", kind: "key" },
    chika_kagi: { id: "chika_kagi", name: "ちかみちのカギ", desc: "ほらあなの おくで 使えそうな、ひんやりした カギ。", kind: "key" }
  };
  var MONEY_ICON = "assets/items/icon_coin.webp";
  var SHOP_ITEM_IDS = [
    "kizugusuri", "manashizuku", "high_potion", "high_mana", "nakama_ball", "super_ball", "hyper_ball", "master_ball",
    "fire_pellet", "water_pellet", "grass_pellet", "wind_pellet", "earth_pellet",
    "thunder_pellet", "heaven_pellet", "dark_pellet", "magic_pellet", "beast_pellet"
  ];
  var USABLE_ITEM_IDS = SHOP_ITEM_IDS.concat(["elixir"]);
  var STARTING_INVENTORY = { kizugusuri: 2, manashizuku: 1, nakama_ball: 1 };
  var CRIT_CHANCE = 0.08;
  var CRIT_MULT = 1.8;
  var MAX_PARTY_SIZE = 3;

  // ---------------- Monsters (illustrated art) ----------------
  var MON_DIR = "assets/monsters/";

  var MONSTERS = {
    slime: { id: "slime", name: "スライム", level: 2, hp: 26, atk: 8, def: 5, spd: 5, exp: 12, money: 9, skillIds: ["tackle"], image: MON_DIR + "slime.webp", element: "water", evolvesTo: { level: 9, id: "slime_2" } },
    aodori: { id: "aodori", name: "あおどり", level: 3, hp: 30, atk: 10, def: 5, spd: 8, exp: 16, money: 11, skillIds: ["tackle"], image: MON_DIR + "aodori.webp", element: "wind", evolvesTo: { level: 10, id: "aodori_2" } },
    dokukinoko: { id: "dokukinoko", name: "どくきのこ", level: 4, hp: 38, atk: 11, def: 7, spd: 7, exp: 19, money: 14, skillIds: ["tackle"], image: MON_DIR + "dokukinoko.webp", element: "grass", evolvesTo: { level: 11, id: "dokukinoko_2" } },
    mogura: { id: "mogura", name: "つちもぐら", level: 3, hp: 32, atk: 10, def: 7, spd: 5, exp: 16, money: 11, skillIds: ["tackle"], image: MON_DIR + "mogura.webp", element: "earth", evolvesTo: { level: 10, id: "mogura_2" } },
    hone_kenshi: { id: "hone_kenshi", name: "ほねのけんし", level: 5, hp: 44, atk: 14, def: 9, spd: 8, exp: 22, money: 16, skillIds: ["tackle", "sandkick"], image: MON_DIR + "hone_kenshi.webp", element: "dark", evolvesTo: { level: 12, id: "hone_kenshi_2" } },
    komori: { id: "komori", name: "こうもり", level: 3, hp: 29, atk: 10, def: 5, spd: 8, exp: 16, money: 11, skillIds: ["tackle"], image: MON_DIR + "komori.webp", element: "dark", evolvesTo: { level: 10, id: "komori_2" } },
    hinotama: { id: "hinotama", name: "ひのたま", level: 4, hp: 32, atk: 13, def: 6, spd: 7, exp: 19, money: 14, skillIds: ["tackle"], image: MON_DIR + "hinotama.webp", element: "fire", evolvesTo: { level: 11, id: "hinotama_2" } },
    saboten: { id: "saboten", name: "とげサボテン", level: 4, hp: 38, atk: 11, def: 8, spd: 7, exp: 19, money: 14, skillIds: ["tackle"], image: MON_DIR + "saboten.webp", element: "grass", evolvesTo: { level: 11, id: "saboten_2" } },
    koyurei: { id: "koyurei", name: "こゆうれい", level: 5, hp: 40, atk: 14, def: 8, spd: 10, exp: 22, money: 16, skillIds: ["tackle", "sandkick"], image: MON_DIR + "koyurei.webp", element: "dark", evolvesTo: { level: 12, id: "koyurei_2" } },

    // ---- フィールド(初級)着ぐるみ系(レア出現、進化なし) ----
    sai_boya: { id: "sai_boya", name: "サイぼうや", level: 4, hp: 40, atk: 12, def: 10, spd: 4, exp: 19, money: 14, skillIds: ["tackle"], image: MON_DIR + "sai_boya.webp", element: "earth" },
    katatsumuri: { id: "katatsumuri", name: "かたつむり", level: 3, hp: 34, atk: 8, def: 9, spd: 3, exp: 16, money: 11, skillIds: ["tackle"], image: MON_DIR + "katatsumuri.webp", element: "earth" },
    lion_ko: { id: "lion_ko", name: "ライオンのこ", level: 5, hp: 40, atk: 15, def: 7, spd: 9, exp: 22, money: 16, skillIds: ["tackle"], image: MON_DIR + "lion_ko.webp", element: "beast" },
    fukurou_ko: { id: "fukurou_ko", name: "ふくろうのこ", level: 3, hp: 27, atk: 10, def: 5, spd: 11, exp: 16, money: 11, skillIds: ["tackle"], image: MON_DIR + "fukurou_ko.webp", element: "wind" },
    tengu_ko: { id: "tengu_ko", name: "こてんぐ", level: 5, hp: 36, atk: 13, def: 7, spd: 10, exp: 22, money: 16, skillIds: ["tackle"], image: MON_DIR + "tengu_ko.webp", element: "magic" },
    mitsubachi: { id: "mitsubachi", name: "みつばち", level: 3, hp: 24, atk: 9, def: 4, spd: 12, exp: 16, money: 11, skillIds: ["tackle"], image: MON_DIR + "mitsubachi.webp", element: "thunder" },
    usagi_ko: { id: "usagi_ko", name: "つきのうさぎ", level: 3, hp: 28, atk: 9, def: 5, spd: 11, exp: 16, money: 11, skillIds: ["tackle"], image: MON_DIR + "usagi_ko.webp", element: "heaven" },
    kujira_ko: { id: "kujira_ko", name: "くじらのこ", level: 4, hp: 45, atk: 11, def: 8, spd: 5, exp: 19, money: 14, skillIds: ["tackle"], image: MON_DIR + "kujira_ko.webp", element: "water" },

    // ---- フィールド(初級)なかま進化系 ----
    slime_2: { id: "slime_2", name: "スライムプリンス", level: 9, hp: 47, atk: 12, def: 8, spd: 6, exp: 23, money: 17, skillIds: ["tackle"], image: MON_DIR + "slime_2.webp", element: "water", evolvesTo: { level: 20, id: "slime_3" } },
    slime_3: { id: "slime_3", name: "スライムキング", level: 20, hp: 83, atk: 21, def: 14, spd: 8, exp: 46, money: 32, skillIds: ["tackle"], image: MON_DIR + "slime_3.webp", element: "water" },
    aodori_2: { id: "aodori_2", name: "はやぶさ", level: 10, hp: 54, atk: 16, def: 8, spd: 10, exp: 30, money: 20, skillIds: ["tackle"], image: MON_DIR + "aodori_2.webp", element: "wind", evolvesTo: { level: 21, id: "aodori_3" } },
    aodori_3: { id: "aodori_3", name: "せいなるグリフォン", level: 21, hp: 96, atk: 26, def: 14, spd: 13, exp: 61, money: 40, skillIds: ["tackle"], image: MON_DIR + "aodori_3.webp", element: "wind" },
    dokukinoko_2: { id: "dokukinoko_2", name: "きのこせんし", level: 11, hp: 68, atk: 17, def: 11, spd: 9, exp: 36, money: 26, skillIds: ["tackle"], image: MON_DIR + "dokukinoko_2.webp", element: "grass", evolvesTo: { level: 22, id: "dokukinoko_3" } },
    dokukinoko_3: { id: "dokukinoko_3", name: "マッシュルームキング", level: 22, hp: 122, atk: 29, def: 20, spd: 11, exp: 72, money: 50, skillIds: ["tackle"], image: MON_DIR + "dokukinoko_3.webp", element: "grass" },
    mogura_2: { id: "mogura_2", name: "ドリルモグラ", level: 10, hp: 58, atk: 16, def: 11, spd: 6, exp: 30, money: 20, skillIds: ["tackle"], image: MON_DIR + "mogura_2.webp", element: "earth", evolvesTo: { level: 21, id: "mogura_3" } },
    mogura_3: { id: "mogura_3", name: "アースブレイカー", level: 21, hp: 102, atk: 26, def: 20, spd: 8, exp: 61, money: 40, skillIds: ["tackle"], image: MON_DIR + "mogura_3.webp", element: "earth" },
    hone_kenshi_2: { id: "hone_kenshi_2", name: "ボーンナイト", level: 12, hp: 79, atk: 22, def: 14, spd: 10, exp: 42, money: 30, skillIds: ["tackle", "sandkick"], image: MON_DIR + "hone_kenshi_2.webp", element: "dark", evolvesTo: { level: 23, id: "hone_kenshi_3" } },
    hone_kenshi_3: { id: "hone_kenshi_3", name: "デスコード", level: 23, hp: 141, atk: 36, def: 26, spd: 13, exp: 84, money: 58, skillIds: ["tackle", "sandkick"], image: MON_DIR + "hone_kenshi_3.webp", element: "dark" },
    komori_2: { id: "komori_2", name: "ナイトバット", level: 10, hp: 52, atk: 16, def: 8, spd: 10, exp: 30, money: 20, skillIds: ["tackle"], image: MON_DIR + "komori_2.webp", element: "dark", evolvesTo: { level: 21, id: "komori_3" } },
    komori_3: { id: "komori_3", name: "ヴァンパイアロード", level: 21, hp: 93, atk: 26, def: 14, spd: 13, exp: 61, money: 40, skillIds: ["tackle"], image: MON_DIR + "komori_3.webp", element: "dark" },
    hinotama_2: { id: "hinotama_2", name: "フレイムファイター", level: 11, hp: 58, atk: 20, def: 10, spd: 9, exp: 36, money: 26, skillIds: ["tackle"], image: MON_DIR + "hinotama_2.webp", element: "fire", evolvesTo: { level: 22, id: "hinotama_3" } },
    hinotama_3: { id: "hinotama_3", name: "えんおうりゅう", level: 22, hp: 102, atk: 34, def: 17, spd: 11, exp: 72, money: 50, skillIds: ["tackle"], image: MON_DIR + "hinotama_3.webp", element: "fire" },
    saboten_2: { id: "saboten_2", name: "サボテンせんし", level: 11, hp: 68, atk: 17, def: 13, spd: 9, exp: 36, money: 26, skillIds: ["tackle"], image: MON_DIR + "saboten_2.webp", element: "grass", evolvesTo: { level: 22, id: "saboten_3" } },
    saboten_3: { id: "saboten_3", name: "サボテンキング", level: 22, hp: 122, atk: 29, def: 23, spd: 11, exp: 72, money: 50, skillIds: ["tackle"], image: MON_DIR + "saboten_3.webp", element: "grass" },
    koyurei_2: { id: "koyurei_2", name: "ゴーストメイジ", level: 12, hp: 72, atk: 22, def: 13, spd: 12, exp: 42, money: 30, skillIds: ["tackle", "sandkick"], image: MON_DIR + "koyurei_2.webp", element: "dark", evolvesTo: { level: 23, id: "koyurei_3" } },
    koyurei_3: { id: "koyurei_3", name: "ゴーストキング", level: 23, hp: 128, atk: 36, def: 23, spd: 16, exp: 84, money: 58, skillIds: ["tackle", "sandkick"], image: MON_DIR + "koyurei_3.webp", element: "dark" },

    ankoku_kishi: { id: "ankoku_kishi", name: "あんこくきし", level: 12, hp: 86, atk: 25, def: 18, spd: 14, exp: 44, money: 33, skillIds: ["tackle", "sandkick", "headbutt"], image: MON_DIR + "ankoku_kishi.webp", element: "dark", evolvesTo: { level: 22, id: "ankoku_kishi_2" } },
    ankoku_madoushi: { id: "ankoku_madoushi", name: "あんこくまどうし", level: 11, hp: 72, atk: 26, def: 11, spd: 15, exp: 41, money: 30, skillIds: ["tackle", "sandkick", "headbutt"], image: MON_DIR + "ankoku_madoushi.webp", element: "magic", evolvesTo: { level: 21, id: "ankoku_madoushi_2" } },
    orc: { id: "orc", name: "オーク", level: 10, hp: 81, atk: 22, def: 14, spd: 12, exp: 38, money: 28, skillIds: ["tackle", "sandkick", "headbutt"], image: MON_DIR + "orc.webp", element: "beast", evolvesTo: { level: 20, id: "orc_2" } },
    jinrou: { id: "jinrou", name: "じんろう", level: 11, hp: 80, atk: 25, def: 13, spd: 20, exp: 41, money: 30, skillIds: ["tackle", "sandkick", "headbutt"], image: MON_DIR + "jinrou.webp", element: "beast", evolvesTo: { level: 21, id: "jinrou_2" } },
    sarekoube: { id: "sarekoube", name: "うかぶされこうべ", level: 9, hp: 58, atk: 22, def: 10, spd: 14, exp: 35, money: 26, skillIds: ["tackle", "sandkick", "headbutt"], image: MON_DIR + "sarekoube.webp", element: "dark", evolvesTo: { level: 19, id: "sarekoube_2" } },
    iwa_golem: { id: "iwa_golem", name: "いわゴーレム", level: 13, hp: 115, atk: 25, def: 21, spd: 12, exp: 48, money: 35, skillIds: ["tackle", "sandkick", "headbutt"], image: MON_DIR + "iwa_golem.webp", element: "earth", evolvesTo: { level: 23, id: "iwa_golem_2" } },
    mira_otoko: { id: "mira_otoko", name: "ミイラおとこ", level: 10, hp: 81, atk: 20, def: 14, spd: 11, exp: 38, money: 28, skillIds: ["tackle", "sandkick", "headbutt"], image: MON_DIR + "mira_otoko.webp", element: "dark", evolvesTo: { level: 20, id: "mira_otoko_2" } },
    shokujinsou: { id: "shokujinsou", name: "しょくじんそう", level: 9, hp: 68, atk: 21, def: 10, spd: 13, exp: 35, money: 26, skillIds: ["tackle", "sandkick", "headbutt"], image: MON_DIR + "shokujinsou.webp", element: "grass", evolvesTo: { level: 19, id: "shokujinsou_2" } },
    hone_kihei: { id: "hone_kihei", name: "ほねのきへい", level: 14, hp: 98, atk: 30, def: 17, spd: 21, exp: 51, money: 38, skillIds: ["tackle", "sandkick", "headbutt"], image: MON_DIR + "hone_kihei.webp", element: "dark", evolvesTo: { level: 24, id: "hone_kihei_2" } },

    // ---- ダンジョン(中級)なかま進化系 ----
    ankoku_kishi_2: { id: "ankoku_kishi_2", name: "あんこくきしおう", level: 22, hp: 150, atk: 38, def: 28, spd: 17, exp: 84, money: 61, skillIds: ["tackle", "sandkick", "headbutt"], image: MON_DIR + "ankoku_kishi_2.webp", element: "dark" },
    ankoku_madoushi_2: { id: "ankoku_madoushi_2", name: "あんこくだいまどうし", level: 21, hp: 126, atk: 39, def: 17, spd: 18, exp: 78, money: 56, skillIds: ["tackle", "sandkick", "headbutt"], image: MON_DIR + "ankoku_madoushi_2.webp", element: "magic" },
    orc_2: { id: "orc_2", name: "オークキング", level: 20, hp: 142, atk: 33, def: 22, spd: 14, exp: 72, money: 52, skillIds: ["tackle", "sandkick", "headbutt"], image: MON_DIR + "orc_2.webp", element: "beast" },
    jinrou_2: { id: "jinrou_2", name: "だいじんろう", level: 21, hp: 140, atk: 38, def: 20, spd: 24, exp: 78, money: 56, skillIds: ["tackle", "sandkick", "headbutt"], image: MON_DIR + "jinrou_2.webp", element: "beast" },
    sarekoube_2: { id: "sarekoube_2", name: "デスヘッド", level: 19, hp: 102, atk: 33, def: 16, spd: 17, exp: 66, money: 48, skillIds: ["tackle", "sandkick", "headbutt"], image: MON_DIR + "sarekoube_2.webp", element: "dark" },
    iwa_golem_2: { id: "iwa_golem_2", name: "こだいゴーレム", level: 23, hp: 201, atk: 38, def: 33, spd: 14, exp: 91, money: 65, skillIds: ["tackle", "sandkick", "headbutt"], image: MON_DIR + "iwa_golem_2.webp", element: "earth" },
    mira_otoko_2: { id: "mira_otoko_2", name: "ミイラファラオ", level: 20, hp: 142, atk: 30, def: 22, spd: 13, exp: 72, money: 52, skillIds: ["tackle", "sandkick", "headbutt"], image: MON_DIR + "mira_otoko_2.webp", element: "dark" },
    shokujinsou_2: { id: "shokujinsou_2", name: "デビルフラワー", level: 19, hp: 119, atk: 32, def: 16, spd: 16, exp: 66, money: 48, skillIds: ["tackle", "sandkick", "headbutt"], image: MON_DIR + "shokujinsou_2.webp", element: "grass" },
    hone_kihei_2: { id: "hone_kihei_2", name: "デスライダー", level: 24, hp: 172, atk: 45, def: 26, spd: 25, exp: 97, money: 70, skillIds: ["tackle", "sandkick", "headbutt"], image: MON_DIR + "hone_kihei_2.webp", element: "dark" },

    yougan_golem: { id: "yougan_golem", name: "ようがんゴーレム", level: 16, hp: 130, atk: 32, def: 20, spd: 14, exp: 140, money: 110, skillIds: ["tackle", "sandkick", "headbutt"], isBoss: true, image: MON_DIR + "yougan_golem.webp", element: "fire" },

    // ---- 中間ボス(ダンジョン〜隠しエリアの崖を緩和する3体、新マップの終点に配置) ----
    yeti: { id: "yeti", name: "ゆきおとこ", level: 21, hp: 175, atk: 42, def: 26, spd: 18, exp: 175, money: 130, skillIds: ["tackle", "sandkick", "headbutt"], isBoss: true, image: MON_DIR + "yeti.webp", element: "water" },
    oni_ou: { id: "oni_ou", name: "おにおう", level: 25, hp: 205, atk: 50, def: 31, spd: 20, exp: 210, money: 160, skillIds: ["tackle", "sandkick", "headbutt"], isBoss: true, image: MON_DIR + "oni_ou.webp", element: "earth" },
    majin_madoushi: { id: "majin_madoushi", name: "まじんまどうし", level: 28, hp: 228, atk: 56, def: 34, spd: 24, exp: 245, money: 190, skillIds: ["tackle", "sandkick", "headbutt"], isBoss: true, image: MON_DIR + "majin_madoushi.webp", element: "magic" },
    akuma: { id: "akuma", name: "あくま", level: 32, hp: 258, atk: 63, def: 39, spd: 26, exp: 290, money: 220, skillIds: ["tackle", "sandkick", "headbutt"], isBoss: true, image: MON_DIR + "akuma.webp", element: "dark" },

    // ---- 村からの三方向(北/西/東)の signature boss ----
    dragon: { id: "dragon", name: "ドラゴン", level: 34, hp: 280, atk: 68, def: 42, spd: 29, exp: 310, money: 235, skillIds: ["tackle", "sandkick", "headbutt"], isBoss: true, image: MON_DIR + "dragon.webp", element: "thunder" },
    mahitotsu_ou: { id: "mahitotsu_ou", name: "まひとつ目王", level: 38, hp: 315, atk: 76, def: 46, spd: 31, exp: 345, money: 260, skillIds: ["tackle", "sandkick", "headbutt", "renzoku"], isBoss: true, image: MON_DIR + "mahitotsu_ou.webp", element: "beast" },
    yurei_ou: { id: "yurei_ou", name: "幽霊王", level: 42, hp: 350, atk: 84, def: 50, spd: 34, exp: 380, money: 290, skillIds: ["tackle", "sandkick", "headbutt", "renzoku"], isBoss: true, image: MON_DIR + "yurei_ou.webp", element: "dark" },

    // ---- 四天王(既存ボス4体のリベンジ版。同じイラストを再利用し別idで強化) ----
    shitennou_yougan: { id: "shitennou_yougan", name: "してんのう・ようがんゴーレム", level: 45, hp: 380, atk: 90, def: 55, spd: 35, exp: 420, money: 320, skillIds: ["tackle", "sandkick", "headbutt", "renzoku"], isBoss: true, image: MON_DIR + "yougan_golem.webp", element: "fire" },
    shitennou_yeti: { id: "shitennou_yeti", name: "してんのう・ゆきおとこ", level: 47, hp: 400, atk: 94, def: 58, spd: 37, exp: 440, money: 335, skillIds: ["tackle", "sandkick", "headbutt", "renzoku"], isBoss: true, image: MON_DIR + "yeti.webp", element: "water" },
    shitennou_oni: { id: "shitennou_oni", name: "してんのう・おにおう", level: 49, hp: 420, atk: 99, def: 61, spd: 39, exp: 460, money: 350, skillIds: ["tackle", "sandkick", "headbutt", "renzoku"], isBoss: true, image: MON_DIR + "oni_ou.webp", element: "earth" },
    shitennou_madoushi: { id: "shitennou_madoushi", name: "してんのう・まじんまどうし", level: 52, hp: 450, atk: 106, def: 65, spd: 42, exp: 490, money: 375, skillIds: ["tackle", "sandkick", "headbutt", "renzoku"], isBoss: true, image: MON_DIR + "majin_madoushi.webp", element: "magic" },

    // ---- 隠しエリア「奥津宮の霊域」上位ティア(ボス撃破後に解放、なかまボールで捕獲可・成功率は catchPenalty で低下) ----
    kodai_kyubi: { id: "kodai_kyubi", name: "九尾の霊狐", level: 27, hp: 234, atk: 71, def: 58, spd: 42, exp: 116, money: 84, skillIds: ["tackle", "sandkick"], image: MON_DIR + "kodai_kyubi.webp", element: "fire", catchPenalty: 0.6 },
    kodai_oni: { id: "kodai_oni", name: "業火の鬼", level: 27, hp: 212, atk: 64, def: 52, spd: 38, exp: 105, money: 76, skillIds: ["tackle", "headbutt"], image: MON_DIR + "kodai_oni.webp", element: "fire", catchPenalty: 0.6 },
    kodai_tengu: { id: "kodai_tengu", name: "山の大天狗", level: 27, hp: 221, atk: 67, def: 55, spd: 40, exp: 109, money: 78, skillIds: ["tackle", "headbutt"], image: MON_DIR + "kodai_tengu.webp", element: "wind", catchPenalty: 0.6 },
    kodai_yukionna: { id: "kodai_yukionna", name: "雪女", level: 27, hp: 219, atk: 66, def: 54, spd: 39, exp: 108, money: 78, skillIds: ["tackle", "ice_shard"], image: MON_DIR + "kodai_yukionna.webp", element: "water", catchPenalty: 0.6 },
    kodai_gashadokuro: { id: "kodai_gashadokuro", name: "がしゃどくろ", level: 27, hp: 238, atk: 72, def: 59, spd: 43, exp: 118, money: 85, skillIds: ["tackle", "headbutt"], image: MON_DIR + "kodai_gashadokuro.webp", element: "dark", catchPenalty: 0.6 },
    kodai_biwanushi: { id: "kodai_biwanushi", name: "琵琶ぬし", level: 27, hp: 235, atk: 71, def: 58, spd: 42, exp: 117, money: 84, skillIds: ["tackle", "headbutt"], image: MON_DIR + "kodai_biwanushi.webp", element: "water", catchPenalty: 0.6 },
    kodai_hitotsume: { id: "kodai_hitotsume", name: "ひとつ目の子鬼", level: 27, hp: 243, atk: 74, def: 60, spd: 44, exp: 121, money: 87, skillIds: ["tackle", "headbutt"], image: MON_DIR + "kodai_hitotsume.webp", element: "earth", catchPenalty: 0.6 },
    kodai_kappabouzu: { id: "kodai_kappabouzu", name: "沼のカッパ坊主", level: 27, hp: 214, atk: 65, def: 53, spd: 38, exp: 106, money: 76, skillIds: ["tackle", "sandkick"], image: MON_DIR + "kodai_kappabouzu.webp", element: "water", catchPenalty: 0.6 },
    kodai_sakedanuki: { id: "kodai_sakedanuki", name: "酒買い狸", level: 27, hp: 226, atk: 69, def: 56, spd: 41, exp: 112, money: 81, skillIds: ["tackle", "headbutt"], image: MON_DIR + "kodai_sakedanuki.webp", element: "beast", catchPenalty: 0.6 },
    kodai_kitsunemen: { id: "kodai_kitsunemen", name: "狐面の宵祭り", level: 27, hp: 212, atk: 64, def: 52, spd: 38, exp: 105, money: 76, skillIds: ["tackle", "sandkick"], image: MON_DIR + "kodai_kitsunemen.webp", element: "fire", catchPenalty: 0.6 },
    kodai_bakeneko: { id: "kodai_bakeneko", name: "化け猫又", level: 27, hp: 219, atk: 66, def: 54, spd: 39, exp: 108, money: 78, skillIds: ["tackle", "headbutt"], image: MON_DIR + "kodai_bakeneko.webp", element: "beast", catchPenalty: 0.6 },
    kodai_karakasa: { id: "kodai_karakasa", name: "からかさ小僧", level: 27, hp: 229, atk: 69, def: 57, spd: 41, exp: 113, money: 81, skillIds: ["tackle", "ice_shard"], image: MON_DIR + "kodai_karakasa.webp", element: "dark", catchPenalty: 0.6 },
    shinju_reishishi: { id: "shinju_reishishi", name: "紅蓮の霊獅子", level: 34, hp: 257, atk: 78, def: 64, spd: 46, exp: 132, money: 95, skillIds: ["tackle", "sandkick", "headbutt"], image: MON_DIR + "shinju_reishishi.webp", element: "fire", catchPenalty: 0.45 },
    shinju_kamezan: { id: "shinju_kamezan", name: "滝ノ亀山", level: 34, hp: 265, atk: 81, def: 66, spd: 48, exp: 136, money: 98, skillIds: ["tackle", "sandkick", "headbutt"], image: MON_DIR + "shinju_kamezan.webp", element: "water", catchPenalty: 0.45 },
    shinju_unicorn: { id: "shinju_unicorn", name: "聖獣ユニコーン", level: 34, hp: 285, atk: 87, def: 71, spd: 51, exp: 146, money: 105, skillIds: ["tackle", "sandkick", "headbutt"], image: MON_DIR + "shinju_unicorn.webp", element: "heaven", catchPenalty: 0.45 },
    shinju_griffon: { id: "shinju_griffon", name: "蒼翼のグリフォン", level: 34, hp: 280, atk: 85, def: 70, spd: 51, exp: 144, money: 104, skillIds: ["tackle", "sandkick", "headbutt"], image: MON_DIR + "shinju_griffon.webp", element: "wind", catchPenalty: 0.45 },
    shinju_kimaira: { id: "shinju_kimaira", name: "三面の魔獣キマイラ", level: 34, hp: 266, atk: 81, def: 66, spd: 48, exp: 136, money: 98, skillIds: ["tackle", "sandkick", "headbutt"], image: MON_DIR + "shinju_kimaira.webp", element: "beast", catchPenalty: 0.45 },
    shinju_cerberus: { id: "shinju_cerberus", name: "冥犬ケルベロス", level: 34, hp: 282, atk: 86, def: 70, spd: 51, exp: 145, money: 104, skillIds: ["tackle", "sandkick", "headbutt"], image: MON_DIR + "shinju_cerberus.webp", element: "dark", catchPenalty: 0.45 },
    shinju_murasakiryu: { id: "shinju_murasakiryu", name: "闇夜の紫竜", level: 34, hp: 292, atk: 89, def: 73, spd: 53, exp: 150, money: 108, skillIds: ["tackle", "sandkick", "renzoku"], image: MON_DIR + "shinju_murasakiryu.webp", element: "dark", catchPenalty: 0.45 },
    shinju_hakurou: { id: "shinju_hakurou", name: "月影の白狼", level: 34, hp: 256, atk: 78, def: 64, spd: 46, exp: 132, money: 95, skillIds: ["tackle", "ice_shard", "headbutt"], image: MON_DIR + "shinju_hakurou.webp", element: "beast", catchPenalty: 0.45 },
    shinju_pegasus: { id: "shinju_pegasus", name: "光翼のペガサス", level: 34, hp: 292, atk: 89, def: 73, spd: 53, exp: 150, money: 108, skillIds: ["tackle", "sandkick", "renzoku"], image: MON_DIR + "shinju_pegasus.webp", element: "heaven", catchPenalty: 0.45 },
    legend_hoshiryu: { id: "legend_hoshiryu", name: "星の白龍", level: 43, hp: 352, atk: 108, def: 88, spd: 64, exp: 186, money: 134, skillIds: ["tackle", "ice_shard", "headbutt"], image: MON_DIR + "legend_hoshiryu.webp", element: "heaven", catchPenalty: 0.3 },
    legend_shinpan: { id: "legend_shinpan", name: "審判の光神", level: 43, hp: 332, atk: 102, def: 83, spd: 60, exp: 176, money: 127, skillIds: ["tackle", "headbutt", "renzoku"], image: MON_DIR + "legend_shinpan.webp", element: "heaven", catchPenalty: 0.3 },
    legend_kyoshin: { id: "legend_kyoshin", name: "森の古代巨神", level: 43, hp: 322, atk: 99, def: 81, spd: 58, exp: 171, money: 123, skillIds: ["tackle", "sandkick", "headbutt"], image: MON_DIR + "legend_kyoshin.webp", element: "grass", catchPenalty: 0.3 },
    legend_rasetsuou: { id: "legend_rasetsuou", name: "六腕の羅刹王", level: 43, hp: 366, atk: 112, def: 92, spd: 66, exp: 194, money: 140, skillIds: ["tackle", "headbutt", "renzoku"], image: MON_DIR + "legend_rasetsuou.webp", element: "dark", catchPenalty: 0.3 },
    legend_houou: { id: "legend_houou", name: "虹色の不死鳥", level: 43, hp: 332, atk: 102, def: 83, spd: 60, exp: 176, money: 127, skillIds: ["tackle", "sandkick", "headbutt"], image: MON_DIR + "legend_houou.webp", element: "fire", catchPenalty: 0.3 },
    legend_hoshikujira: { id: "legend_hoshikujira", name: "星うみのクジラ", level: 43, hp: 319, atk: 98, def: 80, spd: 58, exp: 169, money: 122, skillIds: ["tackle", "ice_shard", "renzoku"], image: MON_DIR + "legend_hoshikujira.webp", element: "water", catchPenalty: 0.3 },
    legend_meifukishi: { id: "legend_meifukishi", name: "冥府の騎士", level: 43, hp: 319, atk: 98, def: 80, spd: 58, exp: 169, money: 122, skillIds: ["tackle", "headbutt", "renzoku"], image: MON_DIR + "legend_meifukishi.webp", element: "dark", catchPenalty: 0.3 },
    legend_hyoketsuhime: { id: "legend_hyoketsuhime", name: "氷結の妖精姫", level: 43, hp: 360, atk: 110, def: 90, spd: 65, exp: 191, money: 138, skillIds: ["tackle", "ice_shard", "renzoku"], image: MON_DIR + "legend_hyoketsuhime.webp", element: "water", catchPenalty: 0.3 },
    kami_seikuu: { id: "kami_seikuu", name: "星空の大司教", level: 55, hp: 432, atk: 133, def: 109, spd: 79, exp: 235, money: 169, skillIds: ["tackle", "sandkick", "headbutt", "renzoku"], image: MON_DIR + "kami_seikuu.webp", element: "heaven", catchPenalty: 0.18 },
    kami_datenken: { id: "kami_datenken", name: "堕天の剣皇", level: 55, hp: 446, atk: 137, def: 112, spd: 81, exp: 242, money: 174, skillIds: ["tackle", "headbutt", "renzoku"], image: MON_DIR + "kami_datenken.webp", element: "dark", catchPenalty: 0.18 },
    kami_ryokuya: { id: "kami_ryokuya", name: "緑野の女神", level: 55, hp: 441, atk: 136, def: 111, spd: 80, exp: 239, money: 172, skillIds: ["tackle", "sandkick", "headbutt", "renzoku"], image: MON_DIR + "kami_ryokuya.webp", element: "grass", catchPenalty: 0.18 },
    kami_kouyoku: { id: "kami_kouyoku", name: "光翼の大天使", level: 55, hp: 427, atk: 132, def: 108, spd: 78, exp: 232, money: 167, skillIds: ["tackle", "headbutt", "renzoku"], image: MON_DIR + "kami_kouyoku.webp", element: "heaven", catchPenalty: 0.18 }
  };

  var UPPER_TIER_IDS = [
    "kodai_kyubi", "kodai_oni", "kodai_tengu", "kodai_yukionna", "kodai_gashadokuro", "kodai_biwanushi",
    "kodai_hitotsume", "kodai_kappabouzu", "kodai_sakedanuki", "kodai_kitsunemen", "kodai_bakeneko", "kodai_karakasa",
    "shinju_reishishi", "shinju_kamezan", "shinju_unicorn", "shinju_griffon", "shinju_kimaira",
    "shinju_cerberus", "shinju_murasakiryu", "shinju_hakurou", "shinju_pegasus",
    "legend_hoshiryu", "legend_shinpan", "legend_kyoshin", "legend_rasetsuou",
    "legend_houou", "legend_hoshikujira", "legend_meifukishi", "legend_hyoketsuhime",
    "kami_seikuu", "kami_datenken", "kami_ryokuya", "kami_kouyoku"
  ];

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
    "sai_boya", "katatsumuri", "lion_ko", "fukurou_ko", "tengu_ko", "mitsubachi", "usagi_ko", "kujira_ko",
    "ankoku_kishi", "ankoku_kishi_2",
    "ankoku_madoushi", "ankoku_madoushi_2",
    "orc", "orc_2",
    "jinrou", "jinrou_2",
    "sarekoube", "sarekoube_2",
    "iwa_golem", "iwa_golem_2",
    "mira_otoko", "mira_otoko_2",
    "shokujinsou", "shokujinsou_2",
    "hone_kihei", "hone_kihei_2",
    "yougan_golem", "yeti", "oni_ou", "majin_madoushi", "akuma",
    "dragon", "mahitotsu_ou", "yurei_ou",
    "kodai_kyubi", "kodai_oni", "kodai_tengu", "kodai_yukionna", "kodai_gashadokuro", "kodai_biwanushi",
    "kodai_hitotsume", "kodai_kappabouzu", "kodai_sakedanuki", "kodai_kitsunemen", "kodai_bakeneko", "kodai_karakasa",
    "shinju_reishishi", "shinju_kamezan", "shinju_unicorn", "shinju_griffon", "shinju_kimaira",
    "shinju_cerberus", "shinju_murasakiryu", "shinju_hakurou", "shinju_pegasus",
    "legend_hoshiryu", "legend_shinpan", "legend_kyoshin", "legend_rasetsuou",
    "legend_houou", "legend_hoshikujira", "legend_meifukishi", "legend_hyoketsuhime",
    "kami_seikuu", "kami_datenken", "kami_ryokuya", "kami_kouyoku"
  ];

  // ---------------- Maps ----------------
  var MAPS = {
    village: {
      id: "village",
      label: "はじまりの村",
      tiles: [
        "#######.###.###",
        "#.............#",
        "#.............#",
        "#.............#",
        "#....#####....#",
        "#....#...#....#",
        ".....#.H.#.....",
        "#....#...#....#",
        "#.............#",
        "#.............#",
        "#.............#",
        "#.............#",
        "#######.#######"
      ],
      npcs: [
        { x: 3, y: 2, name: "村びと", image: "assets/npc/npc_boy.webp", dialogue: ["ようこそ、はじまりの村へ!", "した の ▼ボタンで うごけるよ。", "NPCの そばで「A」ボタンを おすと 会話できるよ。", "村の南に出ると 草むらが あるから 気をつけてね。"] },
        { x: 11, y: 2, name: "おみせのひと", shop: true, image: "assets/npc/shop_building.webp", dialogue: ["いらっしゃい! きずぐすりや マナのしずくを うってるよ。"] },
        { x: 3, y: 10, name: "村びと2", image: "assets/npc/npc_girl.webp", dialogue: ["南の草むらには スライムや あおどりが 出るよ。", "もっと南に すすむと ほらあなが あるみたい。", "おくに つよい モンスターが いるかも…?", "村の中の たてものの南がわに いやしの泉が あるよ。のると 元気に なれるよ。", "そういえば、村の北の壁の すきまに 古い扉が あるって うわさを 聞いたよ。カギが あれば 開くのかも…?"] },
        { x: 7, y: 3, name: "くすし", image: "assets/npc/npc_herbalist.webp", dialogue: ["わたしは くすし。やくそうから きずぐすりを 作っているんじゃ。", "ダンジョンは くらいから、きずぐすりを 忘れずにね。", "マナのしずくは おみせのひとから 買えるよ。"] }
      ],
      warps: [{ x: 7, y: 12, toMap: "field", toX: 6, toY: 1 }],
      gatedExits: [
        { x: 11, y: 0, requiresItem: "furui_kagi", toMap: "himitsu_beya", toX: 2, toY: 1 },
        { x: 7, y: 0, requires: "akuma", toMap: "north_path", toX: 6, toY: 1 },
        { x: 0, y: 6, requires: "dragon", toMap: "west_path", toX: 6, toY: 1 },
        { x: 14, y: 6, requires: "mahitotsu_ou", toMap: "east_path", toX: 6, toY: 1 }
      ],
      decorations: [{ x: 3, y: 1, image: "assets/tiles/deco_well.webp" }],
      encounter: null
    },
    himitsu_beya: {
      id: "himitsu_beya",
      label: "村の隠し部屋",
      tiles: [
        "##.##",
        "#...#",
        "#...#",
        "#...#",
        "#####"
      ],
      npcs: [],
      warps: [{ x: 2, y: 0, toMap: "village", toX: 11, toY: 1 }],
      chests: [
        { id: "himitsu_beya_chest_1", x: 2, y: 2, reward: { type: "item", itemId: "hyper_ball", amount: 1 } }
      ],
      encounter: null
    },
    field: {
      id: "field",
      label: "しばふの草原",
      battleBg: "grass",
      tiles: [
        "######.######",
        "#,,,,,.,,,,,#",
        "#,T,,,.,,,,R#",
        "#,,,,,.,,,,,#",
        "#,,,,..,,,,,#",
        "#,,,,.,,,,,,#",
        "#,,R,.,,,T,,#",
        "#,,,....,,,,#",
        "#,,,,.,,,,,,#",
        "#,,,,..,,,,,#",
        "#,,,,,.,,,,,#",
        "#,T,,,.,,,R,#",
        "#,,,,,.,,,,,#",
        "#,,R,,.,,T,,#",
        "#,,,,,.,,,,,#",
        "######.######"
      ],
      npcs: [
        { x: 11, y: 8, name: "たびびと", image: "assets/npc/npc_girl.webp", dialogue: ["この草むらの おくの ほらあなに、ほのお属性の ボスが いるらしいよ。", "みず属性の わざが よく効くはずだから、そなえておくと いいかも。"] }
      ],
      warps: [
        { x: 6, y: 0, toMap: "village", toX: 7, toY: 11 },
        { x: 6, y: 15, toMap: "dungeon", toX: 6, toY: 1 }
      ],
      chests: [
        { id: "field_chest_1", x: 4, y: 7, reward: { type: "money", amount: 30 } },
        { id: "field_chest_2", x: 11, y: 3, reward: { type: "item", itemId: "furui_kagi", amount: 1 } }
      ],
      decorations: [
        { x: 2, y: 3, image: "assets/tiles/deco_flowerbush_white.webp" },
        { x: 9, y: 5, image: "assets/tiles/deco_flowerbush_orange.webp" },
        { x: 2, y: 12, image: "assets/tiles/deco_flowerbush.webp" },
        { x: 9, y: 10, image: "assets/tiles/deco_stump.webp" }
      ],
      encounter: {
        rate: 0.14,
        table: [
          { id: "slime", weight: 3 }, { id: "aodori", weight: 3 }, { id: "dokukinoko", weight: 2 },
          { id: "mogura", weight: 3 }, { id: "hone_kenshi", weight: 1 }, { id: "komori", weight: 3 },
          { id: "hinotama", weight: 2 }, { id: "saboten", weight: 2 }, { id: "koyurei", weight: 1 },
          { id: "sai_boya", weight: 1 }, { id: "katatsumuri", weight: 1 }, { id: "lion_ko", weight: 1 },
          { id: "fukurou_ko", weight: 1 }, { id: "tengu_ko", weight: 1 }, { id: "mitsubachi", weight: 1 },
          { id: "usagi_ko", weight: 1 }, { id: "kujira_ko", weight: 1 }
        ]
      }
    },
    dungeon: {
      id: "dungeon",
      label: "コケむした洞窟",
      battleBg: "cave",
      tiles: [
        "######.######",
        "#,,,,,,,,,,,#",
        "#,,,#,,,#,,,#",
        "#,,,,,,,,,,,#",
        "#,,,,,,,,,,,#",
        "#,,,,,#,,,,,.",
        "#,,,,,,,,,,,#",
        "#,,,#,,,#,,,#",
        "#,,,,,,,,,,,#",
        "#,,,,,#,,,,,#",
        "#,,,,,,,,,,,#",
        "#,,,#,,,#,,,#",
        "#,,,,,,,,,,,#",
        "#,,,,,#,,,,,#",
        "#,,,,,,,,,,,#",
        "####.########",
        "#,,,...,,,,,#",
        "#,,#,,,,,#,,#",
        "#,,#,,B,,#,,#",
        "#,,#######,,#"
      ],
      npcs: [
        { id: "dungeon_npc_kagi", x: 9, y: 1, name: "まよえるぼうけんしゃ", image: "assets/npc/npc_boy.webp", dialogue: ["ここで 迷ってしまって… 助けてくれた お礼に、このカギを あげるよ。", "このダンジョンの どこかに 隠し部屋が あるみたいなんだ。", "そういえば、この先の こおりの尾根には みず属性の ボスが いるらしい。でんき属性の わざが 弱点だとか。"], givesItem: { itemId: "chika_kagi", amount: 1 } }
      ],
      gatedExits: [
        { x: 12, y: 5, requiresItem: "chika_kagi", toMap: "chika_beya", toX: 2, toY: 1 }
      ],
      warps: [
        { x: 6, y: 0, toMap: "field", toX: 6, toY: 14 },
        { x: 6, y: 18, toMap: "iceridge", toX: 6, toY: 1 }
      ],
      chests: [
        { id: "dungeon_chest_1", x: 3, y: 4, reward: { type: "item", itemId: "kizugusuri", amount: 2 } },
        { id: "dungeon_chest_2", x: 9, y: 10, reward: { type: "item", itemId: "manashizuku", amount: 2 } }
      ],
      bossTrigger: { x: 6, y: 18, monsterId: "yougan_golem" },
      encounter: {
        rate: 0.16,
        table: [
          { id: "ankoku_kishi", weight: 2 }, { id: "ankoku_madoushi", weight: 2 }, { id: "orc", weight: 2 },
          { id: "jinrou", weight: 2 }, { id: "sarekoube", weight: 3 }, { id: "iwa_golem", weight: 1 },
          { id: "mira_otoko", weight: 2 }, { id: "shokujinsou", weight: 2 }, { id: "hone_kihei", weight: 1 }
        ]
      }
    },
    chika_beya: {
      id: "chika_beya",
      label: "ダンジョンの隠し部屋",
      tiles: [
        "##.##",
        "#...#",
        "#...#",
        "#...#",
        "#####"
      ],
      npcs: [],
      warps: [{ x: 2, y: 0, toMap: "dungeon", toX: 11, toY: 5 }],
      chests: [
        { id: "chika_beya_chest_1", x: 2, y: 2, reward: { type: "money", amount: 200 } }
      ],
      encounter: null
    },
    iceridge: {
      id: "iceridge",
      label: "こおりの尾根",
      battleBg: "snow",
      tiles: [
        "######.######",
        "#,,,,,,,,,,,#",
        "#,T,,,,##,R,#",
        "#,,,,,,,,,,,#",
        "#,,,,,,#,,,,#",
        "#,,,,R,,,,,,#",
        "#,,,,####,,,#",
        "#,T,,,,,,,,,#",
        "####.########",
        "#,,,...,,,,,#",
        "#,#,,,,,#,,,#",
        "#,#,,,Y,#,,,#",
        "#,,#######,,#"
      ],
      npcs: [
        { id: "iceridge_hunter", x: 9, y: 3, name: "こおりの狩人", image: "assets/npc/npc_boy.webp", dialogue: ["この先の たそがれの荒野には、つち属性の ボスが いるらしい。", "みず属性の わざが 弱点だと きいたよ。", "けがの手当てに 使うといい。よければ もらってくれ。"], givesItem: { itemId: "high_potion", amount: 1 } }
      ],
      warps: [
        { x: 6, y: 0, toMap: "dungeon", toX: 6, toY: 17 },
        { x: 6, y: 11, toMap: "wasteland", toX: 6, toY: 1 }
      ],
      chests: [
        { id: "iceridge_chest_1", x: 2, y: 4, reward: { type: "item", itemId: "high_potion", amount: 1 } }
      ],
      decorations: [
        { x: 1, y: 1, image: "assets/tiles/deco_stump.webp" },
        { x: 2, y: 6, image: "assets/tiles/deco_stump.webp" }
      ],
      bossTrigger: { x: 6, y: 11, monsterId: "yeti" },
      encounter: {
        rate: 0.16,
        table: [
          { id: "slime_3", weight: 3 }, { id: "aodori_3", weight: 3 }, { id: "sarekoube_2", weight: 2 },
          { id: "orc_2", weight: 2 }, { id: "mira_otoko_2", weight: 2 }
        ]
      }
    },
    wasteland: {
      id: "wasteland",
      label: "たそがれの荒野",
      tiles: [
        "######.######",
        "#,,,,,,,,,,,#",
        "#,,,,,,,,,,,#",
        "#,,R,,,,,T,,#",
        "#,,,,,,,,,,,#",
        "#,,,,,,,,,,,#",
        "#,,,,T,,,R,,#",
        "#,,,,,,,,,,,#",
        "####.########",
        "#,,,...,,,,,#",
        "#,,#,,,,,#,,#",
        "#,,#,,O,,#,,#",
        "#,,#######,,#"
      ],
      npcs: [
        { id: "wasteland_mage", x: 9, y: 3, name: "さすらいの魔導師", image: "assets/npc/npc_girl.webp", dialogue: ["この先の だいまどうしの塔には、まほう属性の ボスが いるらしいわ。", "やみ属性の わざが 弱点だそうよ。", "わたしが 作った けっしょうを ひとつ わけてあげるわ。"], givesItem: { itemId: "high_mana", amount: 1 } }
      ],
      warps: [
        { x: 6, y: 0, toMap: "iceridge", toX: 6, toY: 10 },
        { x: 6, y: 11, toMap: "madoushi_tower", toX: 6, toY: 1 }
      ],
      chests: [
        { id: "wasteland_chest_1", x: 2, y: 4, reward: { type: "item", itemId: "high_mana", amount: 1 } }
      ],
      bossTrigger: { x: 6, y: 11, monsterId: "oni_ou" },
      encounter: {
        rate: 0.16,
        table: [
          { id: "mogura_3", weight: 3 }, { id: "komori_3", weight: 3 }, { id: "ankoku_madoushi_2", weight: 2 },
          { id: "jinrou_2", weight: 2 }, { id: "shokujinsou_2", weight: 2 }
        ]
      }
    },
    madoushi_tower: {
      id: "madoushi_tower",
      label: "だいまどうしの塔",
      tiles: [
        "######.######",
        "#,,,,,,,,,,,#",
        "#,,R,,,,,,,,#",
        "#,,,,,,,,,,,#",
        "#,,,,,T,,,,,#",
        "#,,,,,,,,,,,#",
        "#,,,,,,,,,,,#",
        "#,T,,,,,R,,,#",
        "####.########",
        "#,,,...,,,,,#",
        "#,,#,,,,,#,,#",
        "#,,#,,M,,#,,#",
        "#,,#######,,#"
      ],
      npcs: [
        { x: 9, y: 3, name: "塔のみはりばん", image: "assets/npc/npc_herbalist.webp", dialogue: ["この先の 魔の回廊には、やみ属性の ボスが いるらしい。", "てん属性の わざが 弱点だと いわれておる。"] }
      ],
      warps: [
        { x: 6, y: 0, toMap: "wasteland", toX: 6, toY: 10 },
        { x: 6, y: 11, toMap: "ma_corridor", toX: 6, toY: 1 }
      ],
      chests: [
        { id: "madoushi_tower_chest_1", x: 2, y: 4, reward: { type: "item", itemId: "high_potion", amount: 2 } }
      ],
      bossTrigger: { x: 6, y: 11, monsterId: "majin_madoushi" },
      encounter: {
        rate: 0.16,
        table: [
          { id: "dokukinoko_3", weight: 2 }, { id: "hinotama_3", weight: 2 }, { id: "saboten_3", weight: 2 },
          { id: "ankoku_kishi_2", weight: 2 }, { id: "hone_kenshi_3", weight: 2 }, { id: "koyurei_3", weight: 2 },
          { id: "iwa_golem_2", weight: 1 }, { id: "hone_kihei_2", weight: 1 }
        ]
      }
    },
    ma_corridor: {
      id: "ma_corridor",
      label: "魔の回廊",
      tiles: [
        "######.######",
        "#,,,,,,,,,,,#",
        "#,T##,,,,,R,#",
        "#,,,,,,,,,,,#",
        "#,,,#,,,,#,,#",
        "#,,,,R,,,,,,#",
        "#,,,#,,,###,#",
        "#,T,,,,,,,,,#",
        "####.########",
        "#,,,...,,,,,#",
        "#,#,,,,,#,,,#",
        "#,#,,,B,#,,,#",
        "#,,#######,,#"
      ],
      npcs: [
        { x: 9, y: 3, name: "まよいびと", image: "assets/npc/npc_boy.webp", dialogue: ["この回廊の おくには、てん属性の わざが 弱点の あくまが いるらしい。", "たおせば、村の 別の道が 開けると うわさで きいたよ。"] }
      ],
      warps: [
        { x: 6, y: 0, toMap: "madoushi_tower", toX: 6, toY: 10 },
        { x: 6, y: 11, toMap: "reizon", toX: 6, toY: 1 }
      ],
      chests: [
        { id: "ma_corridor_chest_1", x: 2, y: 4, reward: { type: "item", itemId: "high_mana", amount: 2 } }
      ],
      decorations: [
        { x: 1, y: 1, image: "assets/tiles/deco_stump.webp" },
        { x: 11, y: 5, image: "assets/tiles/deco_stump.webp" }
      ],
      bossTrigger: { x: 6, y: 11, monsterId: "akuma" },
      encounter: {
        rate: 0.17,
        table: [
          { id: "jinrou_2", weight: 3 }, { id: "ankoku_madoushi_2", weight: 3 },
          { id: "mira_otoko_2", weight: 2 }, { id: "sarekoube_2", weight: 2 }
        ]
      }
    },
    reizon: {
      id: "reizon",
      label: "奥津宮の霊域",
      tiles: [
        "######.######",
        "#,,,,,,,,,,,#",
        "#,,,,,,,,,,,#",
        "#,,R,,,,,R,,#",
        "#,,,,,,,,,,,#",
        "#,,,,,,,,,,,#",
        "#,,,,,,,,,,,#",
        "#,,,,,,,,,,,#",
        "#,,R,,,,,R,,#",
        "#,,,,,,,,,,,#",
        "#,,,,,,,,,,,#",
        "######.######",
        "#############"
      ],
      npcs: [],
      warps: [{ x: 6, y: 11, toMap: "ma_corridor", toX: 6, toY: 10 }],
      gatedExits: [
        { x: 6, y: 0, requires: "yurei_ou", toMap: "shitennou_hall", toX: 6, toY: 1 }
      ],
      encounter: {
        rate: 0.2,
        table: [
          { id: "kodai_kyubi", weight: 5 }, { id: "kodai_oni", weight: 5 }, { id: "kodai_tengu", weight: 5 },
          { id: "kodai_yukionna", weight: 5 }, { id: "kodai_gashadokuro", weight: 5 }, { id: "kodai_biwanushi", weight: 5 },
          { id: "kodai_hitotsume", weight: 5 }, { id: "kodai_kappabouzu", weight: 5 }, { id: "kodai_sakedanuki", weight: 5 },
          { id: "kodai_kitsunemen", weight: 5 }, { id: "kodai_bakeneko", weight: 5 }, { id: "kodai_karakasa", weight: 5 },
          { id: "shinju_reishishi", weight: 2 }, { id: "shinju_kamezan", weight: 2 }, { id: "shinju_unicorn", weight: 2 },
          { id: "shinju_griffon", weight: 2 }, { id: "shinju_kimaira", weight: 2 }, { id: "shinju_cerberus", weight: 2 },
          { id: "shinju_murasakiryu", weight: 2 }, { id: "shinju_hakurou", weight: 2 }, { id: "shinju_pegasus", weight: 2 },
          { id: "legend_hoshiryu", weight: 1 }, { id: "legend_shinpan", weight: 1 }, { id: "legend_kyoshin", weight: 1 },
          { id: "legend_rasetsuou", weight: 1 }, { id: "legend_houou", weight: 1 }, { id: "legend_hoshikujira", weight: 1 },
          { id: "legend_meifukishi", weight: 1 }, { id: "legend_hyoketsuhime", weight: 1 },
          { id: "kami_seikuu", weight: 0.3 }, { id: "kami_datenken", weight: 0.3 },
          { id: "kami_ryokuya", weight: 0.3 }, { id: "kami_kouyoku", weight: 0.3 }
        ]
      }
    },
    north_path: {
      id: "north_path",
      label: "きたの獣道",
      tiles: [
        "######.######",
        "#,,,,,,,,,,,#",
        "#,T,,,,,,,R,#",
        "#,#####,,,,,#",
        "#,,,,,,,,,,,#",
        "#,,,,R,,,,,,#",
        "#,,,,,#####,#",
        "#,T,,,,,,,,,#",
        "####.########",
        "#,,,...,,,,,#",
        "#,#,,,,,#,,,#",
        "#,#,,,B,#,,,#",
        "#,,#######,,#"
      ],
      npcs: [
        { x: 9, y: 3, name: "けもの道の番人", image: "assets/npc/npc_boy.webp", dialogue: ["この先には こだいゴーレムが 道を ふさいでいる。", "そのおくに でんき属性の ドラゴンが いるらしい。つち属性の わざが 弱点だそうだ。"] }
      ],
      warps: [{ x: 6, y: 0, toMap: "village", toX: 7, toY: 1 }],
      chests: [
        { id: "north_path_chest_1", x: 2, y: 4, reward: { type: "item", itemId: "elixir", amount: 1 } }
      ],
      decorations: [
        { x: 1, y: 1, image: "assets/tiles/deco_flowerbush_white.webp" },
        { x: 7, y: 4, image: "assets/tiles/deco_stump.webp" },
        { x: 1, y: 6, image: "assets/tiles/deco_flowerbush_orange.webp" }
      ],
      bossTriggers: [
        { x: 4, y: 8, monsterId: "iwa_golem_2" },
        { x: 6, y: 11, monsterId: "dragon" }
      ],
      encounter: {
        rate: 0.17,
        table: [
          { id: "aodori_3", weight: 3 }, { id: "slime_3", weight: 3 },
          { id: "komori_3", weight: 2 }, { id: "koyurei_3", weight: 2 }
        ]
      }
    },
    west_path: {
      id: "west_path",
      label: "にしの荒れ地",
      tiles: [
        "######.######",
        "#,,,,,,,,,,,#",
        "#,,,,,R,,,,,#",
        "#,,T,,,,,,,,#",
        "#,,,,,,,,,,,#",
        "#,,,,,,,,,,,#",
        "#,,,R,,,T,,,#",
        "#,,,,,,,,,,,#",
        "####.########",
        "#,,,...,,,,,#",
        "#,#,,,,,#,,,#",
        "#,#,,,B,#,,,#",
        "#,,#######,,#"
      ],
      npcs: [
        { x: 9, y: 3, name: "荒れ地の旅人", image: "assets/npc/npc_girl.webp", dialogue: ["この先は デスライダーが うろついてるわ。", "おくに いる まひとつ目王は けもの属性。かぜ属性の わざが 弱点らしいわよ。"] }
      ],
      warps: [{ x: 6, y: 0, toMap: "village", toX: 1, toY: 6 }],
      chests: [
        { id: "west_path_chest_1", x: 2, y: 4, reward: { type: "item", itemId: "elixir", amount: 1 } }
      ],
      decorations: [
        { x: 1, y: 1, image: "assets/tiles/deco_stump.webp" },
        { x: 1, y: 6, image: "assets/tiles/deco_stump.webp" }
      ],
      bossTriggers: [
        { x: 4, y: 8, monsterId: "hone_kihei_2" },
        { x: 6, y: 11, monsterId: "mahitotsu_ou" }
      ],
      encounter: {
        rate: 0.17,
        table: [
          { id: "mogura_3", weight: 3 }, { id: "orc_2", weight: 3 },
          { id: "hinotama_3", weight: 2 }, { id: "hone_kenshi_3", weight: 2 }
        ]
      }
    },
    east_path: {
      id: "east_path",
      label: "ひがしの霧の森",
      tiles: [
        "######.######",
        "#,,,,,,,,,,,#",
        "#,TT,T,,,,,,#",
        "#,,,,,,,,,,,#",
        "#,,,T,,,T,,,#",
        "#,,,,,,,,,,,#",
        "#,,T,,T,,,,,#",
        "#,T,,,,,T,,,#",
        "####.########",
        "#,,,...,,,,,#",
        "#,#,,,,,#,,,#",
        "#,#,,,B,#,,,#",
        "#,,#######,,#"
      ],
      npcs: [
        { x: 9, y: 3, name: "霧の中の学者", image: "assets/npc/npc_herbalist.webp", dialogue: ["この霧の おくには あんこくきしおうが おるぞ。", "そのさきの 幽霊王は やみ属性。てん属性の わざが 弱点じゃ。"] }
      ],
      warps: [{ x: 6, y: 0, toMap: "village", toX: 13, toY: 6 }],
      chests: [
        { id: "east_path_chest_1", x: 2, y: 4, reward: { type: "item", itemId: "elixir", amount: 1 } }
      ],
      decorations: [
        { x: 9, y: 2, image: "assets/tiles/deco_flowerbush.webp" },
        { x: 6, y: 4, image: "assets/tiles/deco_stump.webp" },
        { x: 1, y: 6, image: "assets/tiles/deco_flowerbush_white.webp" }
      ],
      bossTriggers: [
        { x: 4, y: 8, monsterId: "ankoku_kishi_2" },
        { x: 6, y: 11, monsterId: "yurei_ou" }
      ],
      encounter: {
        rate: 0.17,
        table: [
          { id: "dokukinoko_3", weight: 3 }, { id: "saboten_3", weight: 3 },
          { id: "shokujinsou_2", weight: 2 }
        ]
      }
    },
    shitennou_hall: {
      id: "shitennou_hall",
      label: "してんのうの間",
      tiles: [
        "######.######",
        "######.######",
        "#####...#####",
        "######.######",
        "######.######",
        "#####...#####",
        "######.######",
        "######.######",
        "#####...#####",
        "######.######",
        "######.######",
        "#####...#####",
        "######.######"
      ],
      npcs: [],
      warps: [{ x: 6, y: 0, toMap: "reizon", toX: 6, toY: 1 }],
      bossTriggers: [
        { x: 6, y: 2, monsterId: "shitennou_yougan" },
        { x: 6, y: 5, monsterId: "shitennou_yeti" },
        { x: 6, y: 8, monsterId: "shitennou_oni" },
        { x: 6, y: 11, monsterId: "shitennou_madoushi" }
      ],
      chests: [
        { id: "shitennou_chest_1", x: 6, y: 12, reward: { type: "money", amount: 500 } }
      ],
      encounter: null
    }
  };

  var START_MAP = "village";
  var START_X = 7;
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
    COMPANION_SKILL_TRACKS: COMPANION_SKILL_TRACKS,
    ITEMS: ITEMS,
    MONEY_ICON: MONEY_ICON,
    CRIT_CHANCE: CRIT_CHANCE,
    CRIT_MULT: CRIT_MULT,
    MAX_PARTY_SIZE: MAX_PARTY_SIZE,
    ELEMENT_LABELS: ELEMENT_LABELS,
    ELEMENT_EFFECTS: ELEMENT_EFFECTS,
    ELEMENT_EFFECT_ANIM: ELEMENT_EFFECT_ANIM,
    pickEffectFrames: pickEffectFrames,
    ELEMENT_ICONS: ELEMENT_ICONS,
    BOSS_REWARDS: BOSS_REWARDS,
    BOSS_ORDER: BOSS_ORDER,
    getElementMatchup: getElementMatchup,
    SHOP_ITEM_IDS: SHOP_ITEM_IDS,
    USABLE_ITEM_IDS: USABLE_ITEM_IDS,
    STARTING_INVENTORY: STARTING_INVENTORY,
    MONSTERS: MONSTERS,
    DEX_ORDER: DEX_ORDER,
    MAPS: MAPS,
    START_MAP: START_MAP,
    START_X: START_X,
    START_Y: START_Y
  };
})();
