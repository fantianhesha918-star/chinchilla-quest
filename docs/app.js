(function () {
  "use strict";

  var G = window.GAME_DATA;
  var SAVE_KEY_PREFIX = "chinchilla-quest-save-v1-slot";
  var LEGACY_SAVE_KEY = "chinchilla-quest-save-v1";
  var SLOT_COUNT = 3;
  var DIR_VECT = { up: { dx: 0, dy: -1 }, down: { dx: 0, dy: 1 }, left: { dx: -1, dy: 0 }, right: { dx: 1, dy: 0 } };

  // ---------------- Save/load (3 slots) ----------------
  (function migrateLegacySave() {
    var legacy = null;
    try { legacy = localStorage.getItem(LEGACY_SAVE_KEY); } catch (e) { legacy = null; }
    if (!legacy) return;
    var slot1 = null;
    try { slot1 = localStorage.getItem(SAVE_KEY_PREFIX + "1"); } catch (e) { slot1 = null; }
    if (!slot1) localStorage.setItem(SAVE_KEY_PREFIX + "1", legacy);
    localStorage.removeItem(LEGACY_SAVE_KEY);
  })();

  function loadSlot(slot) {
    try {
      var raw = localStorage.getItem(SAVE_KEY_PREFIX + slot);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }
  function save(s) {
    s.updatedAt = Date.now();
    localStorage.setItem(SAVE_KEY_PREFIX + currentSlot, JSON.stringify(s));
  }
  function normalizeState(s) {
    if (!s.flags.openedChests) s.flags.openedChests = [];
    if (!s.flags.npcGifts) s.flags.npcGifts = {};
    if (!s.companions) s.companions = {};
    if (!s.activeParty) s.activeParty = [];
    if (!s.companionLevels) s.companionLevels = {};
    if (!s.companionSkills) s.companionSkills = {};
    if (!s.dex) s.dex = {};
    if (!s.defeatedBosses) s.defeatedBosses = {};
    if (s.flags && s.flags.bossDefeated && !s.defeatedBosses.yougan_golem) s.defeatedBosses.yougan_golem = true;
    if (!s.badges) s.badges = {};
    if (!s.bossBonus) s.bossBonus = { maxHp: 0, maxMp: 0, atk: 0, def: 0, spd: 0 };
    if (!s.activeBattlerId) s.activeBattlerId = "hero";
    Object.keys(s.companionLevels).forEach(function (id) {
      var ld = s.companionLevels[id];
      if (ld.hp === undefined || ld.mp === undefined) {
        var stats = getCompanionMaxStats(id, ld.level);
        if (ld.hp === undefined) ld.hp = stats.maxHp;
        if (ld.mp === undefined) ld.mp = stats.maxMp;
      }
    });
    return s;
  }
  function formatSlotDate(ts) {
    if (!ts) return "";
    var d = new Date(ts);
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    return d.getFullYear() + "/" + pad(d.getMonth() + 1) + "/" + pad(d.getDate()) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }

  function createInitialState(name) {
    var stats = G.calcMaxStats(1, 0);
    return {
      version: 1,
      name: name,
      route: null,
      stageIndex: 0,
      level: 1,
      exp: 0,
      hp: stats.maxHp,
      mp: stats.maxMp,
      learnedSkills: ["tackle"],
      inventory: Object.assign({}, G.STARTING_INVENTORY),
      money: 0,
      companions: {},
      activeParty: [],
      companionLevels: {},
      companionSkills: {},
      dex: {},
      defeatedBosses: {},
      badges: {},
      bossBonus: { maxHp: 0, maxMp: 0, atk: 0, def: 0, spd: 0 },
      activeBattlerId: "hero",
      mapId: G.START_MAP,
      x: G.START_X,
      y: G.START_Y,
      facing: "down",
      flags: { bossDefeated: false, openedChests: [], npcGifts: {} }
    };
  }

  function getMaxStats(s) {
    var base = G.calcMaxStats(s.level, s.stageIndex);
    var bonus = s.bossBonus || {};
    return {
      maxHp: base.maxHp + (bonus.maxHp || 0),
      maxMp: base.maxMp + (bonus.maxMp || 0),
      atk: base.atk + (bonus.atk || 0),
      def: base.def + (bonus.def || 0),
      spd: base.spd + (bonus.spd || 0)
    };
  }

  function getCompanionMaxStats(id, level) {
    var mon = G.MONSTERS[currentCompanionSpeciesId(id, level)];
    return G.getCompanionStats(mon, level);
  }

  function getCompanionLevelData(id) {
    if (!state.companionLevels[id]) {
      var lvl = G.MONSTERS[id].level;
      var stats = getCompanionMaxStats(id, lvl);
      state.companionLevels[id] = { level: lvl, exp: 0, hp: stats.maxHp, mp: stats.maxMp };
    }
    return state.companionLevels[id];
  }

  function markDiscovered(id) {
    if (!state.dex[id]) { state.dex[id] = true; save(state); }
  }

  function currentCompanionSpeciesId(baseId, level) {
    var cur = G.MONSTERS[baseId];
    var curId = baseId;
    while (cur.evolvesTo && level >= cur.evolvesTo.level) {
      curId = cur.evolvesTo.id;
      cur = G.MONSTERS[curId];
    }
    return curId;
  }

  function companionSkillTrack(baseId, level) {
    var mon = G.MONSTERS[currentCompanionSpeciesId(baseId, level)];
    return G.COMPANION_SKILL_TRACKS[mon.element || "none"];
  }

  function getCompanionSkills(baseId) {
    if (!state.companionSkills[baseId]) {
      var ld = getCompanionLevelData(baseId);
      var track = companionSkillTrack(baseId, ld.level);
      state.companionSkills[baseId] = track.filter(function (id) {
        return G.SKILLS[id].learnLevel <= ld.level;
      });
    }
    return state.companionSkills[baseId];
  }

  function renderPlayerSprite() {
    if (state.stageIndex > 0) {
      var stage = G.EVOLUTION_ROUTES[state.route].stages[state.stageIndex - 1];
      return '<img src="' + stage.file + '" alt="' + stage.label + '" style="width:100%;height:100%;object-fit:contain;">';
    }
    return '<img src="' + G.HERO_IMAGE + '" alt="' + state.name + '" style="width:100%;height:100%;object-fit:contain;">';
  }

  function renderFieldPlayerSprite() {
    if (state.stageIndex > 0) {
      var stage = G.EVOLUTION_ROUTES[state.route].stages[state.stageIndex - 1];
      return '<img src="' + stage.file + '" alt="' + stage.label + '" style="width:100%;height:100%;object-fit:contain;">';
    }
    var src = G.HERO_FIELD_SPRITES[state.facing || "down"];
    return '<img src="' + src + '" alt="' + state.name + '" style="width:100%;height:100%;object-fit:contain;">';
  }

  // ---------------- DOM refs ----------------
  var titleScreen = document.getElementById("title-screen");
  var slotSelectScreen = document.getElementById("slot-select-screen");
  var slotSelectHeading = document.getElementById("slot-select-heading");
  var slotListEl = document.getElementById("slot-list");
  var starterScreen = document.getElementById("starter-screen");
  var fieldScreen = document.getElementById("field-screen");
  var battleScreen = document.getElementById("battle-screen");
  var battleFieldEl = document.querySelector(".battle-field");

  var starterGrayCard = document.getElementById("starter-gray");
  var starterNameInput = document.getElementById("starter-name-input");
  var starterStartBtn = document.getElementById("starter-start-btn");

  var mapViewport = document.getElementById("map-viewport");
  var hudNameEl = document.getElementById("hud-name");
  var hudLevelEl = document.getElementById("hud-level");
  var hudHpBar = document.getElementById("hud-hp-bar");
  var hudMoneyEl = document.getElementById("hud-money");

  var dialogueOverlay = document.getElementById("dialogue-overlay");
  var dialogueNameEl = document.getElementById("dialogue-name");
  var dialogueTextEl = document.getElementById("dialogue-text");

  var battleEnemyName = document.getElementById("battle-enemy-name");
  var battleEnemyElemIcon = document.getElementById("battle-enemy-elem-icon");
  var battleEnemyLv = document.getElementById("battle-enemy-lv");
  var battleEnemyHpBar = document.getElementById("battle-enemy-hp-bar");
  var battleEnemyHpText = document.getElementById("battle-enemy-hp-text");
  var battleEnemySprite = document.getElementById("battle-enemy-sprite");
  var battlePlayerName = document.getElementById("battle-player-name");
  var battlePlayerElemIcon = document.getElementById("battle-player-elem-icon");
  var battlePlayerLv = document.getElementById("battle-player-lv");
  var battlePlayerHpBar = document.getElementById("battle-player-hp-bar");
  var battlePlayerHpText = document.getElementById("battle-player-hp-text");
  var battlePlayerMpBar = document.getElementById("battle-player-mp-bar");
  var battlePlayerMpText = document.getElementById("battle-player-mp-text");
  var battlePlayerExpBar = document.getElementById("battle-player-exp-bar");
  var battlePlayerSprite = document.getElementById("battle-player-sprite");
  var battlePartyRowEl = document.getElementById("battle-party-row");
  var battleMessageEl = document.getElementById("battle-message");
  var battleCommandMenu = document.getElementById("battle-command-menu");
  var battleSubMenu = document.getElementById("battle-sub-menu");
  var battleSubList = document.getElementById("battle-sub-list");
  var battleSubBack = document.getElementById("battle-sub-back");
  var runBtn = document.querySelector('.battle-cmd-btn[data-cmd="run"]');

  var menuStatusEl = document.getElementById("menu-status");
  var menuSkillsEl = document.getElementById("menu-skills");
  var menuItemsEl = document.getElementById("menu-items");
  var menuCompanionsEl = document.getElementById("menu-companions");
  var menuBadgesEl = document.getElementById("menu-badges");
  var zukanGridEl = document.getElementById("zukan-grid");
  var zukanDetailEl = document.getElementById("zukan-detail");
  var zukanProgressEl = document.getElementById("zukan-progress");
  var shopListEl = document.getElementById("shop-list");
  var routeChoicesEl = document.getElementById("route-choices");

  var toastEl = document.getElementById("toast");
  var toastTimer = null;
  var areaBannerEl = document.getElementById("area-banner");
  var areaBannerTextEl = document.getElementById("area-banner-text");
  var areaBannerTimer = null;

  var currentSlot = null;
  var state = null;
  var selectedStarter = false;
  var battle = null;
  var battleActive = false;
  var dialogueQueue = [];
  var dialogueActive = false;
  var pendingShopAfterDialogue = false;
  var pendingGiftNpc = null;

  // ---------------- UI helpers ----------------
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.add("hidden"); }, 2200);
  }
  function showAreaBanner(label) {
    areaBannerTextEl.textContent = label;
    areaBannerEl.classList.remove("hidden", "show");
    void areaBannerEl.offsetWidth;
    areaBannerEl.classList.add("show");
    clearTimeout(areaBannerTimer);
    areaBannerTimer = setTimeout(function () {
      areaBannerEl.classList.add("hidden");
      areaBannerEl.classList.remove("show");
    }, 2200);
  }
  function openModal(id) { document.getElementById(id).classList.remove("hidden"); }
  function closeModal(id) { document.getElementById(id).classList.add("hidden"); }
  document.querySelectorAll(".modal-close").forEach(function (btn) {
    btn.addEventListener("click", function (e) { e.target.closest(".modal").classList.add("hidden"); });
  });

  // ---------------- Map helpers ----------------
  function currentMap() { return G.MAPS[state.mapId]; }
  function inBounds(map, x, y) { return y >= 0 && y < map.tiles.length && x >= 0 && x < map.tiles[0].length; }
  function npcAtCoord(map, x, y) { return map.npcs.filter(function (n) { return n.x === x && n.y === y; })[0] || null; }
  function warpAtCoord(map, x, y) { return map.warps.filter(function (w) { return w.x === x && w.y === y; })[0] || null; }
  function chestAtCoord(map, x, y) { return (map.chests || []).filter(function (c) { return c.x === x && c.y === y; })[0] || null; }
  function decoAtCoord(map, x, y) { return (map.decorations || []).filter(function (d) { return d.x === x && d.y === y; })[0] || null; }
  function isChestOpened(chest) { return state.flags.openedChests.indexOf(chest.id) !== -1; }
  function gatedExitAtCoord(map, x, y) { return (map.gatedExits || []).filter(function (g) { return g.x === x && g.y === y; })[0] || null; }
  function isGateLocked(gate) {
    if (gate.requiresItem) return !((state.inventory[gate.requiresItem] || 0) > 0);
    return !state.defeatedBosses[gate.requires];
  }
  function activeBossTriggerAt(map, x, y) {
    var triggers = map.bossTriggers ? map.bossTriggers.slice() : [];
    if (map.bossTrigger) triggers.push(map.bossTrigger);
    for (var i = 0; i < triggers.length; i++) {
      var t = triggers[i];
      if (t.x === x && t.y === y && !state.defeatedBosses[t.monsterId]) return t;
    }
    return null;
  }

  function tileClass(ch) {
    if (ch === "#") return "tile-wall";
    if (ch === "," || ch === "T" || ch === "R") return "tile-grass";
    if (ch === "~") return "tile-water";
    if (ch === "H") return "tile-heal";
    return "tile-ground";
  }
  var TREE_IMAGES = ["assets/tiles/obstacle_tree1.webp", "assets/tiles/obstacle_tree2.webp"];
  var ROCK_IMAGES = ["assets/tiles/obstacle_rock1.webp", "assets/tiles/obstacle_rock2.webp"];
  function obstacleImage(ch, x, y) {
    var variants = ch === "T" ? TREE_IMAGES : ROCK_IMAGES;
    return variants[(x * 3 + y * 7) % variants.length];
  }

  var playerEl = null;
  var heroWalkFrame = 0;
  var mapWorldEl = null;
  var mapTileSize = 0;
  var VISIBLE_TILES = 7;
  var WALK_STEP_MS = 150;
  var lastStepAt = 0;
  var midStepTimer = null;

  function renderMap() {
    heroWalkFrame = 0;
    var map = currentMap();
    var rows = map.tiles.length, cols = map.tiles[0].length;
    mapViewport.className = "map-viewport map-" + map.id;

    var viewportWidth = mapViewport.getBoundingClientRect().width || mapViewport.clientWidth;
    mapTileSize = viewportWidth / VISIBLE_TILES;

    var world = document.createElement("div");
    world.className = "map-world";
    world.style.gridTemplateColumns = "repeat(" + cols + "," + mapTileSize + "px)";
    world.style.gridTemplateRows = "repeat(" + rows + "," + mapTileSize + "px)";
    world.style.width = (cols * mapTileSize) + "px";
    world.style.height = (rows * mapTileSize) + "px";

    var html = "";
    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        var ch = map.tiles[y][x];
        var cls = "tile " + tileClass(ch);
        var warp = warpAtCoord(map, x, y);
        var activeBoss = activeBossTriggerAt(map, x, y);
        var isBoss = !!activeBoss;
        var gatedExit = gatedExitAtCoord(map, x, y);
        var gateLocked = gatedExit && isGateLocked(gatedExit);
        if (gatedExit) cls = "tile " + (gateLocked ? "tile-wall" : "tile-grass tile-warp");
        else if (warp) cls += " tile-warp";
        if (isBoss) cls += " tile-boss";
        var npc = npcAtCoord(map, x, y);
        var chest = chestAtCoord(map, x, y);
        var chestOpened = chest && isChestOpened(chest);
        var inner = "";
        if (npc && npc.image) inner = '<img class="tile-npc-mark tile-npc-img" src="' + npc.image + '" alt="' + npc.name + '">';
        else if (npc) inner = '<span class="tile-npc-mark' + (npc.shop ? " tile-npc-shop" : "") + '">' + (npc.shop ? "🛍️" : "🧑") + "</span>";
        else if (isBoss) {
          var bossMon = G.MONSTERS[activeBoss.monsterId];
          inner = '<img class="tile-deco-img tile-boss-img" src="' + bossMon.image + '" alt="' + bossMon.name + '">';
        }
        else if (gatedExit) {
          inner = gateLocked
            ? '<img class="tile-deco-img tile-obstacle-img" src="assets/tiles/obstacle_rock1.webp" alt="ふさがれた道">'
            : '<img class="tile-warp-img" src="assets/tiles/gate_exit.webp" alt="warp">';
        }
        else if (warp) {
          var gateImg = warp.toMap === "dungeon" ? "assets/tiles/gate_entrance.webp" : "assets/tiles/gate_exit.webp";
          inner = '<img class="tile-warp-img" src="' + gateImg + '" alt="warp">';
        }
        else if (ch === "H") inner = '<span class="tile-heal-mark">✨</span>';
        else if (chest && !chestOpened) inner = '<img class="tile-chest-img" src="assets/tiles/treasure_chest.webp" alt="たからばこ">';
        else if (ch === "T" || ch === "R") inner = '<img class="tile-deco-img tile-obstacle-img" src="' + obstacleImage(ch, x, y) + '" alt="">';
        else {
          var deco = decoAtCoord(map, x, y);
          if (deco) inner = '<img class="tile-deco-img" src="' + deco.image + '" alt="">';
        }
        html += '<div class="' + cls + '">' + inner + "</div>";
      }
    }
    world.innerHTML = html;

    playerEl = document.createElement("div");
    playerEl.className = "tile-player";
    playerEl.innerHTML = '<div class="tile-player-inner">' + renderFieldPlayerSprite() + "</div>";
    world.appendChild(playerEl);

    mapViewport.innerHTML = "";
    mapViewport.appendChild(world);
    mapWorldEl = world;
    positionPlayerSprite(false);
  }

  function updateCamera() {
    if (!mapWorldEl) return;
    var map = currentMap();
    var rows = map.tiles.length, cols = map.tiles[0].length;
    var ts = mapTileSize;
    var vw = mapViewport.clientWidth, vh = mapViewport.clientHeight;
    var worldW = cols * ts, worldH = rows * ts;

    var camX = (state.x + 0.5) * ts - vw / 2;
    var camY = (state.y + 0.5) * ts - vh / 2;
    camX = Math.max(0, Math.min(camX, Math.max(0, worldW - vw)));
    camY = Math.max(0, Math.min(camY, Math.max(0, worldH - vh)));
    if (worldW <= vw) camX = -(vw - worldW) / 2;
    if (worldH <= vh) camY = -(vh - worldH) / 2;

    mapWorldEl.style.transform = "translate(" + (-camX) + "px, " + (-camY) + "px)";
  }

  function positionPlayerSprite(animateStep) {
    if (!playerEl) return;
    var ts = mapTileSize;
    playerEl.style.left = (state.x * ts) + "px";
    playerEl.style.top = (state.y * ts) + "px";
    playerEl.style.width = ts + "px";
    playerEl.style.height = ts + "px";
    var inner = playerEl.querySelector(".tile-player-inner");
    if (midStepTimer) { clearTimeout(midStepTimer); midStepTimer = null; }
    if (inner) {
      if (state.stageIndex > 0) {
        inner.classList.toggle("facing-left", state.facing === "left");
      } else {
        inner.classList.remove("facing-left");
        var img = inner.querySelector("img");
        var frames = G.HERO_WALK_FRAMES[state.facing || "down"];
        if (img) {
          img.src = frames[heroWalkFrame % frames.length];
          if (animateStep !== false) {
            // マスの移動中(スライド中)に2枚目の歩行フレームへ切り替え、足が動いて見えるようにする
            var nextFrameSrc = frames[(heroWalkFrame + 1) % frames.length];
            midStepTimer = setTimeout(function () { img.src = nextFrameSrc; }, WALK_STEP_MS / 2);
          }
        }
      }
    }
    if (animateStep !== false) {
      playerEl.classList.remove("step-bounce");
      void playerEl.offsetWidth;
      playerEl.classList.add("step-bounce");
    }
    updateCamera();
  }

  function updateHud() {
    var stats = getMaxStats(state);
    hudNameEl.textContent = state.name;
    hudLevelEl.textContent = "Lv" + state.level;
    hudHpBar.style.width = Math.max(0, state.hp / stats.maxHp * 100) + "%";
    hudMoneyEl.textContent = state.money;
  }

  function pickWeighted(table) {
    var total = table.reduce(function (s, t) { return s + t.weight; }, 0);
    var r = Math.random() * total;
    for (var i = 0; i < table.length; i++) {
      if (r < table[i].weight) return table[i].id;
      r -= table[i].weight;
    }
    return table[0].id;
  }

  function applyChestReward(reward) {
    if (reward.type === "money") {
      state.money += reward.amount;
      showToast("たからばこから 💰" + reward.amount + " てにいれた!");
    } else if (reward.type === "item") {
      var item = G.ITEMS[reward.itemId];
      state.inventory[reward.itemId] = (state.inventory[reward.itemId] || 0) + reward.amount;
      showToast("たからばこから " + item.name + " ×" + reward.amount + " てにいれた!");
    }
  }

  function tryMove(dir) {
    if (battleActive || dialogueActive) return;
    var now = performance.now();
    if (now - lastStepAt < WALK_STEP_MS) return;
    lastStepAt = now;
    state.facing = dir;
    var d = DIR_VECT[dir];
    var map = currentMap();
    var nx = state.x + d.dx, ny = state.y + d.dy;
    if (!inBounds(map, nx, ny)) return;
    var ch = map.tiles[ny][nx];
    if (ch === "#" || ch === "~" || ch === "T" || ch === "R") return;
    var blockingNpc = npcAtCoord(map, nx, ny);
    if (blockingNpc) { showToast(blockingNpc.name + " が いる。「はなす」で話しかけよう"); return; }
    var gatedExit = gatedExitAtCoord(map, nx, ny);
    if (gatedExit && isGateLocked(gatedExit)) {
      showToast(gatedExit.requiresItem ? "カギが かかっている…" : "大きな岩が 道を ふさいでいる…");
      return;
    }

    state.x = nx; state.y = ny;
    heroWalkFrame += 2;
    save(state);
    positionPlayerSprite();
    updateHud();

    if (ch === "H") {
      var healStats = getMaxStats(state);
      var needsHeal = state.hp < healStats.maxHp || state.mp < healStats.maxMp;
      Object.keys(state.companions || {}).forEach(function (id) {
        var ld = getCompanionLevelData(id);
        var cstats = getCompanionMaxStats(id, ld.level);
        if (ld.hp < cstats.maxHp || ld.mp < cstats.maxMp) needsHeal = true;
      });
      if (needsHeal) {
        state.hp = healStats.maxHp;
        state.mp = healStats.maxMp;
        Object.keys(state.companions || {}).forEach(function (id) {
          var ld = getCompanionLevelData(id);
          var cstats = getCompanionMaxStats(id, ld.level);
          ld.hp = cstats.maxHp;
          ld.mp = cstats.maxMp;
        });
        save(state);
        updateHud();
        showToast("いやしの泉で 元気を 取り戻した!");
      } else {
        showToast("もう げんきいっぱいだ!");
      }
    }

    var chest = chestAtCoord(map, nx, ny);
    if (chest && !isChestOpened(chest)) {
      state.flags.openedChests.push(chest.id);
      applyChestReward(chest.reward);
      save(state);
      updateHud();
      renderMap();
    }

    var activeBoss = activeBossTriggerAt(map, nx, ny);
    if (activeBoss) {
      startBattle(activeBoss.monsterId, true);
      return;
    }
    if (gatedExit) { doWarp(gatedExit); return; }
    var warp = warpAtCoord(map, nx, ny);
    if (warp) { doWarp(warp); return; }

    if (ch === "," && map.encounter && Math.random() < map.encounter.rate) {
      startBattle(pickWeighted(map.encounter.table), false);
    }
  }

  function doWarp(warp) {
    state.mapId = warp.toMap;
    state.x = warp.toX; state.y = warp.toY;
    save(state);
    renderMap();
    updateHud();
    showAreaBanner(G.MAPS[warp.toMap].label);
  }

  function handleTalk() {
    var map = currentMap();
    var d = DIR_VECT[state.facing || "down"];
    var npc = npcAtCoord(map, state.x + d.dx, state.y + d.dy);
    if (!npc) { showToast("ちかくに だれも いないよ"); return; }
    openDialogue(npc);
  }

  function handleAButton() {
    if (dialogueActive) { advanceDialogue(); return; }
    handleTalk();
  }

  function handleBButton() {
    if (dialogueActive) { closeDialogue(); return; }
    var openModalEl = document.querySelector(".modal:not(.hidden)");
    if (openModalEl && openModalEl.id !== "route-modal") { openModalEl.classList.add("hidden"); }
  }

  // ---------------- Dialogue ----------------
  function openDialogue(npc) {
    dialogueActive = true;
    dialogueQueue = npc.dialogue.slice();
    pendingShopAfterDialogue = !!npc.shop;
    pendingGiftNpc = (npc.givesItem && !state.flags.npcGifts[npc.id]) ? npc : null;
    dialogueNameEl.textContent = npc.name;
    dialogueOverlay.classList.remove("hidden");
    advanceDialogue();
  }
  function advanceDialogue() {
    if (dialogueQueue.length > 0) {
      dialogueTextEl.textContent = dialogueQueue.shift();
    } else {
      closeDialogue();
    }
  }
  function closeDialogue() {
    dialogueActive = false;
    dialogueOverlay.classList.add("hidden");
    if (pendingGiftNpc) {
      var gift = pendingGiftNpc.givesItem;
      state.flags.npcGifts[pendingGiftNpc.id] = true;
      state.inventory[gift.itemId] = (state.inventory[gift.itemId] || 0) + gift.amount;
      pendingGiftNpc = null;
      save(state);
      showToast(G.ITEMS[gift.itemId].name + " を もらった!");
    }
    if (pendingShopAfterDialogue) {
      pendingShopAfterDialogue = false;
      openShopModal();
    }
  }
  dialogueOverlay.addEventListener("click", advanceDialogue);

  // ---------------- Battle ----------------
  function calcDamage(atk, power, def, atkElem, defElem) {
    var raw = Math.max(1, atk * power / 20 - def * 0.4);
    var rand = 0.9 + Math.random() * 0.2;
    var crit = Math.random() < G.CRIT_CHANCE;
    var matchup = G.getElementMatchup(atkElem, defElem);
    var dmg = Math.max(1, Math.round(raw * rand * (crit ? G.CRIT_MULT : 1) * matchup.mult));
    return { dmg: dmg, crit: crit, elemTier: matchup.tier };
  }

  function showElementEffect(element, containerEl) {
    if (!element || !G.ELEMENT_EFFECTS[element] || !containerEl) return;
    var img = document.createElement("img");
    img.src = G.ELEMENT_EFFECTS[element];
    img.className = "battle-elem-effect";
    containerEl.appendChild(img);
    setTimeout(function () { img.remove(); }, 650);
  }

  function showDamagePopup(containerEl, dmg, crit) {
    if (!containerEl) return;
    var el = document.createElement("div");
    el.className = "dmg-popup" + (crit ? " crit" : "");
    el.textContent = "-" + dmg;
    containerEl.appendChild(el);
    setTimeout(function () { el.remove(); }, 900);
  }

  function triggerHitEffect(spriteEl, crit) {
    if (!spriteEl) return;
    var cls = crit ? "shake-crit" : "shake";
    spriteEl.classList.add(cls);
    setTimeout(function () { spriteEl.classList.remove(cls); }, crit ? 500 : 400);
    if (crit && battleFieldEl) {
      battleFieldEl.classList.add("field-shake", "crit-flash");
      setTimeout(function () { battleFieldEl.classList.remove("field-shake", "crit-flash"); }, 500);
    }
  }

  // 無属性(体当たり系)の技は踏み込みモーションのみ。着弾処理(onImpact)は踏み込みのピークで呼ぶ。
  function playAttackAnim(attackerEl, onImpact) {
    if (!attackerEl) { onImpact(); return; }
    attackerEl.classList.add("attack-lunge");
    setTimeout(function () {
      onImpact();
      setTimeout(function () { attackerEl.classList.remove("attack-lunge"); }, 160);
    }, 180);
  }

  // 属性ありの技は、その属性のエフェクト画像を弾として相手に向かって飛ばし、着弾した瞬間に onImpact を呼ぶ。
  function playProjectileAnim(attackerEl, defenderEl, element, onImpact) {
    var src = element && G.ELEMENT_EFFECTS[element];
    if (!src || !battleFieldEl || !attackerEl || !defenderEl) { onImpact(); return; }
    var fieldRect = battleFieldEl.getBoundingClientRect();
    var startRect = attackerEl.getBoundingClientRect();
    var endRect = defenderEl.getBoundingClientRect();
    var startX = startRect.left + startRect.width / 2 - fieldRect.left;
    var startY = startRect.top + startRect.height / 2 - fieldRect.top;
    var endX = endRect.left + endRect.width / 2 - fieldRect.left;
    var endY = endRect.top + endRect.height / 2 - fieldRect.top;

    var proj = document.createElement("img");
    proj.className = "atk-projectile";
    proj.src = src;
    proj.style.left = startX + "px";
    proj.style.top = startY + "px";
    battleFieldEl.appendChild(proj);

    requestAnimationFrame(function () {
      proj.classList.add("flying");
      proj.style.left = endX + "px";
      proj.style.top = endY + "px";
    });

    setTimeout(function () {
      proj.remove();
      onImpact();
    }, 320);
  }

  // 技の属性の有無で「踏み込み」か「弾が飛んでいく」かを振り分ける共通入り口。
  function playMoveAnim(attackerEl, defenderEl, element, onImpact) {
    if (element && G.ELEMENT_EFFECTS[element]) {
      playProjectileAnim(attackerEl, defenderEl, element, onImpact);
    } else {
      playAttackAnim(attackerEl, onImpact);
    }
  }

  function setBattleMessage(msg) { battleMessageEl.textContent = msg; }

  function triggerLevelUpEffect() {
    if (battleFieldEl) {
      battleFieldEl.classList.add("levelup-flash");
      setTimeout(function () { battleFieldEl.classList.remove("levelup-flash"); }, 800);
    }
    if (battlePlayerSprite) {
      battlePlayerSprite.classList.add("levelup-glow");
      setTimeout(function () { battlePlayerSprite.classList.remove("levelup-glow"); }, 700);
    }
    if (battleFieldEl) {
      var banner = document.createElement("div");
      banner.className = "levelup-banner";
      banner.textContent = "LEVEL UP!";
      battleFieldEl.appendChild(banner);
      setTimeout(function () { banner.remove(); }, 1300);
    }
  }

  function playSequence(lines, done) {
    var i = 0;
    function step() {
      if (i >= lines.length) { done(); return; }
      var line = lines[i]; i++;
      if (line && typeof line === "object") {
        setBattleMessage(line.text);
        if (line.effect) line.effect();
      } else {
        setBattleMessage(line);
      }
      setTimeout(step, 850);
    }
    step();
  }

  function setCommandButtonsEnabled(enabled) {
    document.querySelectorAll(".battle-cmd-btn").forEach(function (btn) { btn.disabled = !enabled; });
  }
  function showCommandMenu() {
    battleCommandMenu.classList.remove("hidden");
    battleSubMenu.classList.add("hidden");
    battleSubBack.style.display = "";
    setCommandButtonsEnabled(true);
    if (battle && battle.isBoss) runBtn.disabled = true;
  }
  function showSubMenu() { battleCommandMenu.classList.add("hidden"); battleSubMenu.classList.remove("hidden"); }
  function closeSubMenu() { showCommandMenu(); }

  // 単体アクティブバトラー制: idx 0 = 主人公、1..N = battle.party[idx-1]
  function getBattler(idx) {
    if (idx === 0) {
      var stats = getMaxStats(state);
      return {
        idx: 0, kind: "hero", name: state.name, level: state.level,
        hp: state.hp, maxHp: stats.maxHp, mp: state.mp, maxMp: stats.maxMp,
        atk: stats.atk, def: stats.def, spd: stats.spd, element: null,
        fainted: state.hp <= 0, skillIds: state.learnedSkills, image: null
      };
    }
    var comp = battle.party[idx - 1];
    var mon = G.MONSTERS[comp.speciesId];
    return {
      idx: idx, kind: "companion", name: mon.name, level: comp.level,
      hp: comp.hp, maxHp: comp.maxHp, mp: comp.mp, maxMp: comp.maxMp,
      atk: comp.atk, def: comp.def, spd: comp.spd, element: mon.element,
      fainted: comp.hp <= 0, skillIds: getCompanionSkills(comp.id), image: mon.image
    };
  }
  function battlerCount() { return 1 + (battle ? battle.party.length : 0); }
  function livingBattlerIndices(excludeActive) {
    var out = [];
    for (var i = 0; i < battlerCount(); i++) {
      if (excludeActive && i === battle.activeIdx) continue;
      if (!getBattler(i).fainted) out.push(i);
    }
    return out;
  }
  function isRosterWiped() { return livingBattlerIndices(false).length === 0; }
  function setBattlerHp(idx, hp) {
    if (idx === 0) { state.hp = Math.max(0, hp); return; }
    var comp = battle.party[idx - 1];
    comp.hp = Math.max(0, hp);
    getCompanionLevelData(comp.id).hp = comp.hp;
  }
  function setBattlerMp(idx, mp) {
    if (idx === 0) { state.mp = Math.max(0, mp); return; }
    var comp = battle.party[idx - 1];
    comp.mp = Math.max(0, mp);
    getCompanionLevelData(comp.id).mp = comp.mp;
  }

  function setElemIcon(imgEl, element) {
    if (element && G.ELEMENT_ICONS[element]) {
      imgEl.src = G.ELEMENT_ICONS[element];
      imgEl.alt = G.ELEMENT_LABELS[element];
      imgEl.classList.remove("hidden");
    } else {
      imgEl.classList.add("hidden");
    }
  }

  function renderBattle() {
    var def = G.MONSTERS[battle.monsterId];
    battleEnemyName.textContent = def.name;
    setElemIcon(battleEnemyElemIcon, def.element);
    battleEnemyLv.textContent = "Lv" + def.level;
    battleEnemyHpBar.style.width = Math.max(0, battle.monsterHp / battle.monsterMaxHp * 100) + "%";
    battleEnemyHpText.textContent = battle.monsterHp + " / " + battle.monsterMaxHp;
    battleEnemySprite.innerHTML = '<img src="' + def.image + '" alt="' + def.name + '" style="width:100%;height:100%;object-fit:contain;">';

    var active = getBattler(battle.activeIdx);
    battlePlayerName.textContent = active.name;
    setElemIcon(battlePlayerElemIcon, active.element);
    battlePlayerLv.textContent = "Lv" + active.level;
    battlePlayerHpBar.style.width = Math.max(0, active.hp / active.maxHp * 100) + "%";
    battlePlayerHpText.textContent = active.hp + " / " + active.maxHp;
    battlePlayerMpBar.style.width = Math.max(0, active.mp / active.maxMp * 100) + "%";
    battlePlayerMpText.textContent = active.mp + " / " + active.maxMp;
    var expNeed, expCur;
    if (active.kind === "hero") { expNeed = G.expToNext(state.level); expCur = state.exp; }
    else { var ld = getCompanionLevelData(battle.party[active.idx - 1].id); expNeed = G.expToNext(ld.level); expCur = ld.exp; }
    battlePlayerExpBar.style.width = Math.max(0, Math.min(100, expCur / expNeed * 100)) + "%";
    battlePlayerSprite.innerHTML = active.kind === "hero" ? renderPlayerSprite() : '<img src="' + active.image + '" alt="' + active.name + '" style="width:100%;height:100%;object-fit:contain;">';

    battlePartyRowEl.innerHTML = "";
    for (var i = 0; i < battlerCount(); i++) {
      var b = getBattler(i);
      var img = i === 0 ? (state.stageIndex > 0 ? G.EVOLUTION_ROUTES[state.route].stages[state.stageIndex - 1].file : G.HERO_IMAGE) : b.image;
      var div = document.createElement("div");
      div.className = "battle-party-item" + (b.fainted ? " fainted" : "") + (i === battle.activeIdx ? " active" : "");
      div.innerHTML =
        '<img class="battle-party-img" src="' + img + '" alt="' + b.name + '">' +
        '<div class="battle-party-name">' + b.name + " Lv" + b.level + "</div>" +
        '<div class="hud-bar-track battle-party-hpbar"><div class="hud-bar-fill" style="width:' + Math.max(0, b.hp / b.maxHp * 100) + '%"></div></div>';
      battlePartyRowEl.appendChild(div);
    }
  }

  function pickInitialActiveIdx(party) {
    var wanted = 0;
    if (state.activeBattlerId !== "hero") {
      var pIdx = party.findIndex(function (p) { return p.id === state.activeBattlerId; });
      if (pIdx !== -1) wanted = pIdx + 1;
    }
    var wantedAlive = wanted === 0 ? state.hp > 0 : party[wanted - 1].hp > 0;
    if (wantedAlive) return wanted;
    if (state.hp > 0) return 0;
    for (var i = 0; i < party.length; i++) { if (party[i].hp > 0) return i + 1; }
    return 0;
  }

  function startBattle(monsterId, isBoss) {
    var def = G.MONSTERS[monsterId];
    markDiscovered(monsterId);
    battleEnemySprite.style.visibility = "";
    battleEnemySprite.classList.remove("suck-in", "pop-out");
    var party = state.activeParty.map(function (id) {
      var ld = getCompanionLevelData(id);
      var speciesId = currentCompanionSpeciesId(id, ld.level);
      var mon = G.MONSTERS[speciesId];
      var cstats = G.getCompanionStats(mon, ld.level);
      return { id: id, speciesId: speciesId, level: ld.level, hp: Math.min(ld.hp, cstats.maxHp), maxHp: cstats.maxHp, mp: Math.min(ld.mp, cstats.maxMp), maxMp: cstats.maxMp, atk: cstats.atk, def: cstats.def, spd: cstats.spd };
    });
    var anyAlive = state.hp > 0 || party.some(function (p) { return p.hp > 0; });
    if (!anyAlive) {
      var stats = getMaxStats(state);
      state.hp = Math.max(1, Math.round(stats.maxHp * 0.5));
      state.mapId = G.START_MAP; state.x = G.START_X; state.y = G.START_Y;
      save(state);
      renderMap();
      updateHud();
      showToast("みんな ぼろぼろで たたかえない…村に はこばれた。");
      return;
    }
    battle = { monsterId: monsterId, monsterHp: def.hp, monsterMaxHp: def.hp, isBoss: !!isBoss, locked: false, party: party, activeIdx: pickInitialActiveIdx(party) };
    battleActive = true;
    battleFieldEl.classList.remove("bg-grass", "bg-cave", "bg-snow");
    var battleBg = currentMap().battleBg;
    if (battleBg) battleFieldEl.classList.add("bg-" + battleBg);
    runBtn.disabled = !!isBoss;
    fieldScreen.classList.add("hidden");
    battleScreen.classList.remove("hidden");
    renderBattle();
    showCommandMenu();
    setBattleMessage((isBoss ? "ボスの " : "") + def.name + " が あらわれた!");
  }

  function endBattleToField() {
    battleActive = false;
    battle = null;
    battleScreen.classList.add("hidden");
    fieldScreen.classList.remove("hidden");
    renderMap();
    updateHud();
  }

  function doActiveBattlerAction(action) {
    if (!battle || battle.locked) return;
    battle.locked = true;
    setCommandButtonsEnabled(false);
    closeSubMenu();
    var active = getBattler(battle.activeIdx);
    var def = G.MONSTERS[battle.monsterId];

    function finishTurn(lines, skillElement, result) {
      save(state);
      renderBattle();
      if (skillElement) showElementEffect(skillElement, battleEnemySprite);
      if (result) {
        triggerHitEffect(battleEnemySprite, result.crit);
        showDamagePopup(battleEnemySprite, result.dmg, result.crit);
      }
      playSequence(lines, function () {
        if (battle.monsterHp <= 0) { winBattle(); return; }
        enemyTurn();
      });
    }

    if (action.type === "item") {
      var item = G.ITEMS[action.itemId];
      state.inventory[action.itemId] = Math.max(0, (state.inventory[action.itemId] || 0) - 1);
      if (item.kind === "hp") setBattlerHp(active.idx, Math.min(active.maxHp, active.hp + item.amount));
      else if (item.kind === "mp") setBattlerMp(active.idx, Math.min(active.maxMp, active.mp + item.amount));
      else if (item.kind === "full") { setBattlerHp(active.idx, active.maxHp); setBattlerMp(active.idx, active.maxMp); }
      finishTurn([active.name + " は " + item.name + " を つかった!"], null, null);
      return;
    }

    var sk = G.SKILLS[action.skillId];
    setBattlerMp(active.idx, active.mp - sk.mp);
    var lines = [active.name + " の " + sk.name + "!"];
    playMoveAnim(battlePlayerSprite, battleEnemySprite, sk.element, function () {
      var result = calcDamage(active.atk, sk.power, def.def, sk.element, def.element);
      battle.monsterHp = Math.max(0, battle.monsterHp - result.dmg);
      if (result.crit) lines.push("会心の一撃!");
      lines.push(def.name + " に " + result.dmg + " の ダメージ!");
      if (result.elemTier === "strong") lines.push("こうかは ばつぐんだ!");
      else if (result.elemTier === "weak") lines.push("こうかは いまひとつ のようだ…");
      finishTurn(lines, sk.element, result);
    });
  }

  function openSwapSubMenu(forced) {
    var indices = livingBattlerIndices(true);
    if (indices.length === 0) { showToast("いれかえられる なかまが いないよ"); return; }
    battleSubList.innerHTML = "";
    indices.forEach(function (idx) {
      var b = getBattler(idx);
      var row = document.createElement("div");
      row.className = "battle-sub-item";
      row.innerHTML = '<div><div class="sub-item-name">' + b.name + " Lv" + b.level + '</div><div class="sub-item-desc">HP ' + b.hp + " / " + b.maxHp + '</div></div><button>いれかえる</button>';
      row.querySelector("button").addEventListener("click", function () { swapActiveBattler(idx); });
      battleSubList.appendChild(row);
    });
    battleSubBack.style.display = forced ? "none" : "";
    showSubMenu();
  }

  function swapActiveBattler(idx) {
    battle.locked = true;
    setCommandButtonsEnabled(false);
    battle.activeIdx = idx;
    state.activeBattlerId = idx === 0 ? "hero" : battle.party[idx - 1].id;
    save(state);
    var b = getBattler(idx);
    renderBattle();
    playSequence([b.name + " を せんとうに 出した!"], function () {
      battle.locked = false;
      showCommandMenu();
      setBattleMessage("つぎの コマンドを えらんでね");
    });
  }

  function enemyTurn() {
    var def = G.MONSTERS[battle.monsterId];
    var skillId = def.skillIds[Math.floor(Math.random() * def.skillIds.length)];
    var sk = G.SKILLS[skillId];
    var lines = [def.name + " の " + sk.name + "!"];
    playMoveAnim(battleEnemySprite, battlePlayerSprite, sk.element, function () {
      var active = getBattler(battle.activeIdx);
      var result = calcDamage(def.atk, sk.power, active.def, sk.element, active.element);
      var newHp = Math.max(0, active.hp - result.dmg);
      setBattlerHp(active.idx, newHp);
      renderBattle();
      triggerHitEffect(battlePlayerSprite, result.crit);
      showElementEffect(sk.element, battlePlayerSprite);
      showDamagePopup(battlePlayerSprite, result.dmg, result.crit);
      if (result.crit) lines.push("会心の一撃!");
      lines.push(active.name + " に " + result.dmg + " の ダメージ!");
      var justFainted = newHp <= 0;
      if (justFainted) {
        lines.push(active.name + " は たおれてしまった…");
      }
      playSequence(lines, function () {
        if (justFainted) {
          if (isRosterWiped()) { loseBattle(); return; }
          setBattleMessage("つぎの なかまを えらんでね");
          openSwapSubMenu(true);
          return;
        }
        battle.locked = false;
        showCommandMenu();
        setBattleMessage("つぎの コマンドを えらんでね");
      });
    });
  }

  function tryRun() {
    if (!battle || battle.locked) return;
    if (battle.isBoss) { showToast("ボスからは にげられない!"); return; }
    battle.locked = true;
    setCommandButtonsEnabled(false);
    var active = getBattler(battle.activeIdx);
    var def = G.MONSTERS[battle.monsterId];
    var chance = Math.max(0.15, Math.min(0.9, 0.5 + (active.spd - def.spd) * 0.02));
    if (Math.random() < chance) {
      setBattleMessage("うまく にげきれた!");
      setTimeout(endBattleToField, 900);
    } else {
      setBattleMessage(active.name + " は にげようとしたが…つかまってしまった!");
      setTimeout(function () { battle.locked = false; enemyTurn(); }, 900);
    }
  }

  function playCaptureAnimation(anim, success, onDone) {
    if (!anim || !battleFieldEl) { onDone(); return; }
    var fieldRect = battleFieldEl.getBoundingClientRect();
    var playerRect = battlePlayerSprite.getBoundingClientRect();
    var enemyRect = battleEnemySprite.getBoundingClientRect();
    var startX = playerRect.left + playerRect.width / 2 - fieldRect.left;
    var startY = playerRect.top + playerRect.height / 2 - fieldRect.top;
    var endX = enemyRect.left + enemyRect.width / 2 - fieldRect.left;
    var endY = enemyRect.top + enemyRect.height / 2 - fieldRect.top;

    var ball = document.createElement("img");
    ball.className = "capture-ball-anim";
    ball.src = anim.fly;
    ball.style.left = startX + "px";
    ball.style.top = startY + "px";
    battleFieldEl.appendChild(ball);

    requestAnimationFrame(function () {
      ball.classList.add("flying", "spin");
      ball.style.left = endX + "px";
      ball.style.top = endY + "px";
    });

    setTimeout(function () {
      ball.classList.remove("flying", "spin");
      battleEnemySprite.classList.add("suck-in");
      setTimeout(function () {
        battleEnemySprite.style.visibility = "hidden";
        battleEnemySprite.classList.remove("suck-in");
      }, 260);
      ball.src = anim.squish;
      ball.classList.add("squish");
    }, 450);

    setTimeout(function () {
      ball.classList.remove("squish");
      var wobbleIdx = 0;
      function nextWobble() {
        if (wobbleIdx >= anim.wobble.length) {
          finish();
          return;
        }
        ball.src = anim.wobble[wobbleIdx];
        ball.classList.remove("wobble");
        void ball.offsetWidth;
        ball.classList.add("wobble");
        wobbleIdx++;
        setTimeout(nextWobble, 340);
      }
      function finish() {
        if (success) {
          ball.src = anim.success;
          ball.classList.add("success-pop");
          setTimeout(function () { ball.remove(); onDone(); }, 750);
        } else {
          ball.src = anim.fail;
          ball.classList.add("fail-pop");
          battleEnemySprite.style.visibility = "";
          battleEnemySprite.classList.add("pop-out");
          setTimeout(function () { battleEnemySprite.classList.remove("pop-out"); }, 400);
          setTimeout(function () {
            ball.remove();
            onDone();
          }, 550);
        }
      }
      nextWobble();
    }, 700);
  }

  function tryCapture(itemId) {
    if (!battle || battle.locked) return;
    if (battle.isBoss) { showToast("ボスは なかまに できない!"); return; }
    battle.locked = true;
    setCommandButtonsEnabled(false);
    closeSubMenu();
    var item = G.ITEMS[itemId];
    var def = G.MONSTERS[battle.monsterId];
    state.inventory[itemId] = Math.max(0, (state.inventory[itemId] || 0) - 1);

    var hpRatio = battle.monsterHp / battle.monsterMaxHp;
    var baseChance = Math.min(0.9, 0.15 + (1 - hpRatio) * 0.6);
    var chance = item.catchMult === Infinity ? 1 : Math.min(1, baseChance * (item.catchMult || 1) * (def.catchPenalty || 1));
    var success = Math.random() < chance;

    save(state);
    renderBattle();
    setBattleMessage(state.name + " は " + item.name + " を なげた!");

    playCaptureAnimation(item.captureAnim, success, function () {
      if (success) {
        setBattleMessage(def.name + " を なかまに した!");
        setTimeout(function () {
          state.companions[def.id] = (state.companions[def.id] || 0) + 1;
          save(state);
          endBattleToField();
        }, 900);
      } else {
        setBattleMessage(def.name + " は とびだして しまった…");
        setTimeout(function () { battle.locked = false; enemyTurn(); }, 900);
      }
    });
  }

  function tryFeedPellet(itemId) {
    if (!battle || battle.locked) return;
    var item = G.ITEMS[itemId];
    var sk = G.SKILLS[item.skillId];
    var active = getBattler(battle.activeIdx);
    if (active.kind === "companion" && active.element !== item.element) {
      showToast(active.name + " は この ペレットを たべられない…");
      return;
    }
    var known = active.kind === "hero"
      ? state.learnedSkills.indexOf(item.skillId) !== -1
      : active.skillIds.indexOf(item.skillId) !== -1;
    if (known) {
      showToast(active.name + " は もう " + sk.name + " を おぼえている");
      return;
    }
    battle.locked = true;
    setCommandButtonsEnabled(false);
    closeSubMenu();
    state.inventory[itemId] = Math.max(0, (state.inventory[itemId] || 0) - 1);
    if (active.kind === "hero") state.learnedSkills.push(item.skillId);
    else active.skillIds.push(item.skillId);
    save(state);
    renderBattle();
    setBattleMessage(active.name + " は " + item.name + " を たべた!");
    setTimeout(function () {
      setBattleMessage(active.name + " は " + sk.name + " を おぼえた!");
      setTimeout(function () { battle.locked = false; enemyTurn(); }, 900);
    }, 900);
  }

  function gainExp(expGain) {
    var events = [];
    state.exp += expGain;
    while (true) {
      var need = G.expToNext(state.level);
      if (state.exp < need) break;
      state.exp -= need;
      var oldMax = getMaxStats(state);
      state.level += 1;
      var newMax = getMaxStats(state);
      state.hp = newMax.maxHp;
      state.mp = newMax.maxMp;
      events.push({
        type: "levelup", level: state.level,
        deltas: {
          hp: newMax.maxHp - oldMax.maxHp, mp: newMax.maxMp - oldMax.maxMp,
          atk: newMax.atk - oldMax.atk, def: newMax.def - oldMax.def, spd: newMax.spd - oldMax.spd
        }
      });

      G.SKILL_LEARN_ORDER.forEach(function (id) {
        var sk = G.SKILLS[id];
        if (sk.learnLevel === state.level && state.learnedSkills.indexOf(id) === -1) {
          state.learnedSkills.push(id);
          events.push({ type: "skill", skillId: id });
        }
      });

      if (state.level >= G.FIRST_EVOLUTION_LEVEL && !state.route) {
        events.push({ type: "routechoice" });
      } else if (state.route) {
        var stages = G.EVOLUTION_ROUTES[state.route].stages;
        var nextIdx = state.stageIndex;
        if (nextIdx < stages.length && stages[nextIdx].level <= state.level) {
          state.stageIndex += 1;
          events.push({ type: "evolve", stage: stages[nextIdx] });
          if (stages[nextIdx].skillId && state.learnedSkills.indexOf(stages[nextIdx].skillId) === -1) {
            state.learnedSkills.push(stages[nextIdx].skillId);
            events.push({ type: "skill", skillId: stages[nextIdx].skillId });
          }
        }
      }
    }
    return events;
  }

  function openRouteModal(onDone) {
    routeChoicesEl.innerHTML = "";
    Object.keys(G.EVOLUTION_ROUTES).forEach(function (routeKey) {
      var route = G.EVOLUTION_ROUTES[routeKey];
      var firstStage = route.stages[0];
      var card = document.createElement("div");
      card.className = "route-choice-card";
      card.innerHTML =
        '<img src="' + firstStage.file + '" alt="' + firstStage.label + '">' +
        '<div><div class="route-choice-title">' + route.label + '</div>' +
        '<div class="route-choice-desc">' + route.desc + "</div></div>";
      card.addEventListener("click", function () {
        state.route = routeKey;
        state.stageIndex = 1;
        var skillMsg = "";
        if (firstStage.skillId && state.learnedSkills.indexOf(firstStage.skillId) === -1) {
          state.learnedSkills.push(firstStage.skillId);
          skillMsg = " " + G.SKILLS[firstStage.skillId].name + " を おぼえた!";
        }
        save(state);
        closeModal("route-modal");
        showToast(state.name + " は " + firstStage.label + " に しんかした!" + skillMsg);
        onDone();
      });
      routeChoicesEl.appendChild(card);
    });
    openModal("route-modal");
  }

  function handleLevelUpMessages(events, done) {
    if (!events || events.length === 0) { done(); return; }
    var lines = [];
    var routeChoiceNeeded = false;
    events.forEach(function (ev) {
      if (ev.type === "levelup") {
        lines.push({ text: "レベルアップ! Lv" + ev.level + " に なった!", effect: triggerLevelUpEffect });
        var d = ev.deltas;
        lines.push("HP+" + d.hp + " MP+" + d.mp + " こうげき+" + d.atk + " ぼうぎょ+" + d.def + " すばやさ+" + d.spd);
      }
      else if (ev.type === "skill") lines.push(G.SKILLS[ev.skillId].name + " を おぼえた!");
      else if (ev.type === "evolve") lines.push(state.name + " は " + ev.stage.label + " に しんかした!");
      else if (ev.type === "routechoice") routeChoiceNeeded = true;
    });
    playSequence(lines, function () {
      if (routeChoiceNeeded) openRouteModal(done); else done();
    });
  }

  function gainCompanionExp(expGain) {
    var levelUps = [];
    state.activeParty.forEach(function (id) {
      var ld = getCompanionLevelData(id);
      var skills = getCompanionSkills(id);
      var beforeId = currentCompanionSpeciesId(id, ld.level);
      var beforeName = G.MONSTERS[beforeId].name;
      ld.exp += expGain;
      var leveled = false;
      while (true) {
        var need = G.expToNext(ld.level);
        if (ld.exp < need) break;
        ld.exp -= need;
        ld.level += 1;
        var newMax = getCompanionMaxStats(id, ld.level);
        ld.hp = newMax.maxHp;
        ld.mp = newMax.maxMp;
        leveled = true;
        var afterId = currentCompanionSpeciesId(id, ld.level);
        var afterName = G.MONSTERS[afterId].name;
        if (afterId !== beforeId) {
          markDiscovered(afterId);
          levelUps.push(beforeName + " は " + afterName + " に しんかした!");
          beforeId = afterId;
          beforeName = afterName;
        }
        companionSkillTrack(id, ld.level).forEach(function (skillId) {
          var sk = G.SKILLS[skillId];
          if (sk.learnLevel === ld.level && skills.indexOf(skillId) === -1) {
            skills.push(skillId);
            levelUps.push(beforeName + " は " + sk.name + " を おぼえた!");
          }
        });
      }
      if (leveled) levelUps.push({ text: beforeName + " は Lv" + ld.level + " に あがった!", effect: triggerLevelUpEffect });
    });
    return levelUps;
  }

  function winBattle() {
    var def = G.MONSTERS[battle.monsterId];
    state.money += def.money;
    var lines = [def.name + " を たおした!", def.exp + " の けいけんちを 手に入れた!", def.money + "まい の コインを 手に入れた!"];
    if (battle.isBoss) {
      state.defeatedBosses[def.id] = true;
      lines.push("つよい モンスターを たおした! これからも ぼうけんは つづく…");
      var reward = G.BOSS_REWARDS[def.id];
      if (reward) {
        if (!state.badges[def.id]) {
          state.badges[def.id] = true;
          lines.push(reward.badgeLabel + " を 手に入れた!");
          if (reward.itemId) {
            var dropAmount = reward.itemAmount || 1;
            state.inventory[reward.itemId] = (state.inventory[reward.itemId] || 0) + dropAmount;
            lines.push(G.ITEMS[reward.itemId].name + " を " + dropAmount + "こ 手に入れた!");
          }
        }
        if (state.learnedSkills.indexOf(reward.skillId) === -1) {
          state.learnedSkills.push(reward.skillId);
          lines.push(state.name + " は " + G.SKILLS[reward.skillId].name + " を おぼえた!");
        }
        Object.keys(reward.statBonus).forEach(function (key) {
          state.bossBonus[key] = (state.bossBonus[key] || 0) + reward.statBonus[key];
        });
        lines.push("のうりょくが 上がった!");
      }
    }
    var events = gainExp(def.exp);
    var companionLevelUpLines = gainCompanionExp(def.exp);
    save(state);
    renderBattle();
    playSequence(lines, function () {
      handleLevelUpMessages(events, function () {
        if (companionLevelUpLines.length === 0) { endBattleToField(); return; }
        playSequence(companionLevelUpLines, endBattleToField);
      });
    });
  }

  function loseBattle() {
    var lines = [state.name + " は たおれてしまった…", "村に はこばれた。"];
    var stats = getMaxStats(state);
    state.hp = Math.max(1, Math.round(stats.maxHp * 0.5));
    state.mapId = G.START_MAP;
    state.x = G.START_X; state.y = G.START_Y;
    save(state);
    playSequence(lines, endBattleToField);
  }

  // ---------------- Battle sub menus ----------------
  function openMoveSubMenu() {
    var active = getBattler(battle.activeIdx);
    battleSubList.innerHTML = "";
    active.skillIds.forEach(function (id) {
      var sk = G.SKILLS[id];
      var disabled = active.mp < sk.mp;
      var icon = sk.element ? '<img class="elem-icon" src="' + G.ELEMENT_ICONS[sk.element] + '" alt="' + G.ELEMENT_LABELS[sk.element] + '">' : "";
      var row = document.createElement("div");
      row.className = "battle-sub-item";
      row.innerHTML =
        '<div><div class="sub-item-name">' + icon + sk.name + '</div><div class="sub-item-desc">MP' + sk.mp + " ・ " + sk.desc + "</div></div>" +
        "<button" + (disabled ? " disabled" : "") + ">えらぶ</button>";
      row.querySelector("button").addEventListener("click", function () { doActiveBattlerAction({ type: "skill", skillId: id }); });
      battleSubList.appendChild(row);
    });
    showSubMenu();
  }

  function openItemSubMenu() {
    var any = false;
    battleSubList.innerHTML = "";
    G.USABLE_ITEM_IDS.forEach(function (id) {
      var count = state.inventory[id] || 0;
      if (count <= 0) return;
      any = true;
      var item = G.ITEMS[id];
      var row = document.createElement("div");
      row.className = "battle-sub-item";
      row.innerHTML =
        '<div><div class="sub-item-name"><img class="item-icon" src="' + item.icon + '" alt="">' + item.name + " ×" + count + '</div><div class="sub-item-desc">' + item.desc + "</div></div>" +
        "<button>" + (item.kind === "ball" ? "なげる" : item.kind === "pellet" ? "たべる" : "つかう") + "</button>";
      row.querySelector("button").addEventListener("click", function () {
        if (item.kind === "ball") tryCapture(id);
        else if (item.kind === "pellet") tryFeedPellet(id);
        else doActiveBattlerAction({ type: "item", itemId: id });
      });
      battleSubList.appendChild(row);
    });
    if (!any) { showToast("つかえる どうぐが ないよ"); return; }
    showSubMenu();
  }

  document.querySelectorAll(".battle-cmd-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (!battle || battle.locked) return;
      var cmd = btn.dataset.cmd;
      if (cmd === "skill") openMoveSubMenu();
      else if (cmd === "item") openItemSubMenu();
      else if (cmd === "swap") openSwapSubMenu(false);
      else if (cmd === "run") tryRun();
    });
  });
  document.getElementById("battle-sub-back").addEventListener("click", closeSubMenu);

  // ---------------- Menu / Shop ----------------
  function renderInventoryList(container) {
    container.innerHTML = "";
    G.USABLE_ITEM_IDS.forEach(function (id) {
      var item = G.ITEMS[id];
      var count = state.inventory[id] || 0;
      var div = document.createElement("div");
      div.className = "food-item";
      div.innerHTML =
        '<div class="food-info"><img class="item-icon" src="' + item.icon + '" alt=""><div><div class="food-name">' + item.name + " ×" + count + '</div><div class="food-desc">' + item.desc + "</div></div></div>" +
        "<button" + (count <= 0 ? " disabled" : "") + ">" + (item.kind === "ball" ? "なげる" : item.kind === "pellet" ? "たべる" : "つかう") + "</button>";
      div.querySelector("button").addEventListener("click", function () {
        if (count <= 0) return;
        if (item.kind === "ball") { showToast("せんとうちゅうに つかってね"); return; }
        if (item.kind === "pellet") {
          var sk = G.SKILLS[item.skillId];
          if (state.learnedSkills.indexOf(item.skillId) !== -1) {
            showToast(state.name + " は もう " + sk.name + " を おぼえている");
            return;
          }
          state.inventory[id] -= 1;
          state.learnedSkills.push(item.skillId);
          save(state);
          showToast(state.name + " は " + sk.name + " を おぼえた!");
          updateHud();
          refreshMenuData();
          return;
        }
        var stats = getMaxStats(state);
        state.inventory[id] -= 1;
        if (item.kind === "hp") state.hp = Math.min(stats.maxHp, state.hp + item.amount);
        else if (item.kind === "mp") state.mp = Math.min(stats.maxMp, state.mp + item.amount);
        else if (item.kind === "full") { state.hp = stats.maxHp; state.mp = stats.maxMp; }
        save(state);
        showToast(item.name + " を つかった!");
        updateHud();
        refreshMenuData();
      });
      container.appendChild(div);
    });
  }

  var MENU_PAGES = ["top", "status", "skills", "items", "companions", "badges"];
  function showMenuPage(page) {
    MENU_PAGES.forEach(function (p) {
      document.getElementById("menu-page-" + p).classList.toggle("hidden", p !== page);
    });
  }
  document.querySelectorAll(".menu-category-btn[data-page]").forEach(function (btn) {
    btn.addEventListener("click", function () { showMenuPage(btn.dataset.page); });
  });
  document.querySelectorAll("#menu-modal .menu-back-btn").forEach(function (btn) {
    btn.addEventListener("click", function () { showMenuPage("top"); });
  });

  function refreshMenuData() {
    var stats = getMaxStats(state);
    var stageLabel = state.stageIndex > 0 ? G.EVOLUTION_ROUTES[state.route].stages[state.stageIndex - 1].label : "ちんちら";
    menuStatusEl.innerHTML =
      "<div><b>" + state.name + "</b>(" + stageLabel + ") Lv" + state.level + "</div>" +
      "<div>HP " + state.hp + " / " + stats.maxHp + "</div>" +
      "<div>MP " + state.mp + " / " + stats.maxMp + "</div>" +
      "<div>こうげき " + stats.atk + " ・ ぼうぎょ " + stats.def + " ・ すばやさ " + stats.spd + "</div>" +
      "<div>けいけんち " + state.exp + " / " + G.expToNext(state.level) + "</div>" +
      '<div><img class="item-icon" src="' + G.MONEY_ICON + '" alt=""> ' + state.money + "</div>";

    menuSkillsEl.innerHTML = "";
    state.learnedSkills.forEach(function (id) {
      var sk = G.SKILLS[id];
      var row = document.createElement("div");
      row.className = "menu-skill-row";
      row.innerHTML = "<span>" + sk.name + "</span><span>MP" + sk.mp + "</span>";
      menuSkillsEl.appendChild(row);
    });

    renderInventoryList(menuItemsEl);
    renderCompanionsList(menuCompanionsEl);
    renderBadges();

    document.getElementById("menu-cat-skills-count").textContent = "(" + state.learnedSkills.length + ")";
    document.getElementById("menu-cat-companions-count").textContent =
      "(" + state.activeParty.length + "/" + G.MAX_PARTY_SIZE + ")";
  }

  function openMenuModal() {
    refreshMenuData();
    showMenuPage("top");
    openModal("menu-modal");
  }
  document.getElementById("select-btn").addEventListener("click", openMenuModal);

  function renderCompanionsList(container) {
    container.innerHTML = "";

    var heroImg = state.stageIndex > 0 ? G.EVOLUTION_ROUTES[state.route].stages[state.stageIndex - 1].file : G.HERO_IMAGE;
    var heroStats = getMaxStats(state);
    var heroIsLeader = state.activeBattlerId === "hero";
    var heroDiv = document.createElement("div");
    heroDiv.className = "companion-item" + (heroIsLeader ? " in-party" : "");
    heroDiv.innerHTML =
      '<img class="companion-img" src="' + heroImg + '" alt="' + state.name + '">' +
      '<div class="companion-name">' + state.name + " Lv" + state.level + "</div>" +
      '<div class="companion-hp">HP ' + state.hp + "/" + heroStats.maxHp + "</div>" +
      "<button class=\"companion-leader-btn\"" + (heroIsLeader ? " disabled" : "") + ">" + (heroIsLeader ? "リーダー" : "リーダーにする") + "</button>";
    if (!heroIsLeader) {
      heroDiv.querySelector("button").addEventListener("click", function () {
        state.activeBattlerId = "hero";
        save(state);
        renderCompanionsList(container);
      });
    }
    container.appendChild(heroDiv);

    var ids = Object.keys(state.companions || {});
    if (ids.length === 0) {
      var empty = document.createElement("div");
      empty.className = "companion-empty";
      empty.textContent = "まだ なかまは いないよ。「なかまボール」を せんとうで なげてみよう!";
      container.appendChild(empty);
      return;
    }
    var partyCaption = document.createElement("div");
    partyCaption.className = "companion-party-caption";
    partyCaption.textContent = "せんとうに つれていく なかま(さいだい" + G.MAX_PARTY_SIZE + "たいまで)";
    container.appendChild(partyCaption);
    ids.forEach(function (id) {
      if (!G.MONSTERS[id]) return;
      var count = state.companions[id];
      var ld = getCompanionLevelData(id);
      var mon = G.MONSTERS[currentCompanionSpeciesId(id, ld.level)];
      var cstats = getCompanionMaxStats(id, ld.level);
      var inParty = state.activeParty.indexOf(id) !== -1;
      var isLeader = state.activeBattlerId === id;
      var div = document.createElement("div");
      div.className = "companion-item" + (inParty ? " in-party" : "");
      div.innerHTML =
        '<img class="companion-img" src="' + mon.image + '" alt="' + mon.name + '">' +
        '<div class="companion-name">' + mon.name + " ×" + count + " Lv" + ld.level + "</div>" +
        '<div class="companion-hp">HP ' + ld.hp + "/" + cstats.maxHp + "</div>" +
        '<div class="companion-btn-row">' +
        "<button class=\"companion-party-btn\">" + (inParty ? "はずす" : "くわえる") + "</button>" +
        (inParty ? "<button class=\"companion-leader-btn\"" + (isLeader ? " disabled" : "") + ">" + (isLeader ? "リーダー" : "リーダーにする") + "</button>" : "") +
        "</div>";
      div.querySelector(".companion-party-btn").addEventListener("click", function () {
        if (inParty) {
          state.activeParty = state.activeParty.filter(function (pid) { return pid !== id; });
          if (state.activeBattlerId === id) state.activeBattlerId = "hero";
        } else {
          if (state.activeParty.length >= G.MAX_PARTY_SIZE) { showToast("パーティは さいだい" + G.MAX_PARTY_SIZE + "たいまでだよ"); return; }
          state.activeParty.push(id);
        }
        save(state);
        renderCompanionsList(container);
      });
      var leaderBtn = div.querySelector(".companion-leader-btn");
      if (leaderBtn && !isLeader) {
        leaderBtn.addEventListener("click", function () {
          state.activeBattlerId = id;
          save(state);
          renderCompanionsList(container);
        });
      }
      container.appendChild(div);
    });
  }

  function showZukanDetail(mon) {
    var elemLine = mon.element ? '<div><img class="elem-icon" src="' + G.ELEMENT_ICONS[mon.element] + '" alt="">ぞくせい ' + G.ELEMENT_LABELS[mon.element] + "</div>" : "";
    var evoLine = "";
    if (mon.evolvesTo && state.dex[mon.evolvesTo.id]) {
      evoLine = "<div>Lv" + mon.evolvesTo.level + " で " + G.MONSTERS[mon.evolvesTo.id].name + " に しんかする</div>";
    } else if (mon.evolvesTo) {
      evoLine = "<div>さらに しんかしそうな けはいが する…</div>";
    }
    zukanDetailEl.innerHTML =
      "<div><b>" + mon.name + "</b>(Lv" + mon.level + "〜)</div>" +
      "<div>HP " + mon.hp + " ・ こうげき " + mon.atk + " ・ ぼうぎょ " + mon.def + " ・ すばやさ " + mon.spd + "</div>" +
      elemLine + evoLine;
    zukanDetailEl.classList.remove("hidden");
  }

  function renderBadges() {
    if (!menuBadgesEl) return;
    menuBadgesEl.innerHTML = "";
    var got = 0;
    G.BOSS_ORDER.forEach(function (id) {
      var mon = G.MONSTERS[id];
      var reward = G.BOSS_REWARDS[id];
      var earned = !!state.badges[id];
      if (earned) got++;
      var cell = document.createElement("div");
      cell.className = "badge-cell" + (earned ? "" : " badge-locked");
      cell.title = earned ? reward.badgeLabel : "？？？";
      cell.innerHTML = earned
        ? '<img class="badge-icon" src="' + G.ELEMENT_ICONS[mon.element] + '" alt="' + reward.badgeLabel + '"><div class="badge-cell-name">' + reward.badgeLabel + "</div>"
        : '<div class="badge-silhouette">?</div><div class="badge-cell-name">？？？</div>';
      menuBadgesEl.appendChild(cell);
    });
    var progressEl = document.getElementById("badge-progress");
    if (progressEl) progressEl.textContent = got + " / " + G.BOSS_ORDER.length;
    var catCountEl = document.getElementById("menu-cat-badges-count");
    if (catCountEl) catCountEl.textContent = "(" + got + "/" + G.BOSS_ORDER.length + ")";
  }

  function renderZukan() {
    zukanGridEl.innerHTML = "";
    zukanDetailEl.classList.add("hidden");
    var found = 0;
    G.DEX_ORDER.forEach(function (id) {
      var mon = G.MONSTERS[id];
      if (!mon) return;
      var discovered = !!state.dex[id];
      if (discovered) found++;
      var cell = document.createElement("button");
      cell.className = "zukan-cell" + (discovered ? "" : " undiscovered");
      cell.innerHTML = discovered
        ? '<img src="' + mon.image + '" alt="' + mon.name + '"><div class="zukan-cell-name">' + mon.name + "</div>"
        : '<div class="zukan-silhouette">?</div><div class="zukan-cell-name">？？？</div>';
      if (discovered) cell.addEventListener("click", function () { showZukanDetail(mon); });
      zukanGridEl.appendChild(cell);
    });
    zukanProgressEl.textContent = found + " / " + G.DEX_ORDER.length;
  }

  function openZukanModal() {
    renderZukan();
    openModal("zukan-modal");
  }
  document.getElementById("menu-zukan-btn").addEventListener("click", openZukanModal);

  function openShopModal() {
    shopListEl.innerHTML = "";
    G.SHOP_ITEM_IDS.forEach(function (id) {
      var item = G.ITEMS[id];
      var disabled = state.money < item.price;
      var div = document.createElement("div");
      div.className = "food-item";
      div.innerHTML =
        '<div class="food-info"><img class="item-icon" src="' + item.icon + '" alt=""><div><div class="food-name">' + item.name + '</div><div class="food-desc">' + item.desc + "</div></div></div>" +
        "<button" + (disabled ? " disabled" : "") + '><img class="item-icon item-icon-btn" src="' + G.MONEY_ICON + '" alt="">' + item.price + "</button>";
      div.querySelector("button").addEventListener("click", function () {
        if (state.money < item.price) return;
        state.money -= item.price;
        state.inventory[id] = (state.inventory[id] || 0) + 1;
        save(state);
        updateHud();
        showToast(item.name + " を かった!");
        openShopModal();
      });
      shopListEl.appendChild(div);
    });
    openModal("shop-modal");
  }

  // ---------------- Field controls ----------------
  document.querySelectorAll(".dpad-btn[data-dir]").forEach(function (btn) {
    btn.addEventListener("click", function () { tryMove(btn.dataset.dir); });
  });
  document.getElementById("a-btn").addEventListener("click", handleAButton);
  document.getElementById("b-btn").addEventListener("click", handleBButton);

  var KEY_DIR_MAP = {
    ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
    w: "up", s: "down", a: "left", d: "right"
  };
  document.addEventListener("keydown", function (e) {
    if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
    var openModalEl = document.querySelector(".modal:not(.hidden)");
    var fieldIdle = !fieldScreen.classList.contains("hidden") && !openModalEl;

    var dir = KEY_DIR_MAP[e.key];
    if (dir) {
      if (fieldIdle) { e.preventDefault(); tryMove(dir); }
      return;
    }
    if (e.key === "Enter" || e.key === " " || e.key === "z" || e.key === "Z") {
      if (dialogueActive || fieldIdle) { e.preventDefault(); handleAButton(); }
      return;
    }
    if (e.key === "Escape" || e.key === "x" || e.key === "X") {
      if (dialogueActive || openModalEl) { e.preventDefault(); handleBButton(); }
    }
  });

  // ---------------- Title / Slot select / Starter ----------------
  starterGrayCard.querySelector(".starter-avatar").innerHTML = '<img src="' + G.HERO_IMAGE + '" alt="チンチラ" style="width:100%;height:100%;object-fit:contain;">';

  var slotSelectMode = null; // "continue" | "new"
  var pendingNewSlot = null;

  function slotSummary(slot) {
    var s = loadSlot(slot);
    if (!s) return null;
    return { name: s.name, level: s.level, updatedAt: s.updatedAt || 0 };
  }

  function renderSlotSelect(mode) {
    slotSelectMode = mode;
    slotSelectHeading.textContent = mode === "continue" ? "つづきから えらんでね" : "さいしょから えらんでね";
    slotListEl.innerHTML = "";
    for (var i = 1; i <= SLOT_COUNT; i++) {
      (function (slot) {
        var summary = slotSummary(slot);
        var card = document.createElement("div");
        card.className = "slot-card" + (summary ? "" : " empty");
        card.innerHTML = summary
          ? '<div class="slot-card-title">スロット' + slot + " : " + summary.name + " (Lv" + summary.level + ')</div>' +
            '<div class="slot-card-sub">さいごに あそんだ日時 ' + formatSlotDate(summary.updatedAt) + "</div>"
          : '<div class="slot-card-title">スロット' + slot + '</div><div class="slot-card-sub">からっぽ</div>';
        card.addEventListener("click", function () { onSlotCardClick(slot, summary); });
        slotListEl.appendChild(card);
      })(i);
    }
  }

  function enterFieldFromLoadedState() {
    titleScreen.classList.add("hidden");
    slotSelectScreen.classList.add("hidden");
    starterScreen.classList.add("hidden");
    fieldScreen.classList.remove("hidden");
    renderMap();
    updateHud();
  }

  function startNewGameInSlot(slot) {
    currentSlot = slot;
    starterGrayCard.classList.remove("selected");
    selectedStarter = false;
    starterNameInput.value = "";
    updateStarterStartBtn();
    slotSelectScreen.classList.add("hidden");
    starterScreen.classList.remove("hidden");
  }

  function onSlotCardClick(slot, summary) {
    if (slotSelectMode === "continue") {
      if (!summary) { showToast("このスロットには データが ないよ"); return; }
      currentSlot = slot;
      state = normalizeState(loadSlot(slot));
      enterFieldFromLoadedState();
    } else if (summary) {
      pendingNewSlot = slot;
      document.getElementById("slot-overwrite-msg").textContent =
        "スロット" + slot + "(" + summary.name + " Lv" + summary.level + ")の データに うわがきします。よろしいですか?";
      openModal("slot-overwrite-modal");
    } else {
      startNewGameInSlot(slot);
    }
  }

  document.getElementById("title-continue-btn").addEventListener("click", function () {
    titleScreen.classList.add("hidden");
    slotSelectScreen.classList.remove("hidden");
    renderSlotSelect("continue");
  });
  document.getElementById("title-newgame-btn").addEventListener("click", function () {
    titleScreen.classList.add("hidden");
    slotSelectScreen.classList.remove("hidden");
    renderSlotSelect("new");
  });
  document.getElementById("slot-back-btn").addEventListener("click", function () {
    slotSelectScreen.classList.add("hidden");
    titleScreen.classList.remove("hidden");
  });
  document.getElementById("slot-overwrite-confirm-btn").addEventListener("click", function () {
    closeModal("slot-overwrite-modal");
    startNewGameInSlot(pendingNewSlot);
    pendingNewSlot = null;
  });
  document.getElementById("menu-title-btn").addEventListener("click", function () {
    closeModal("menu-modal");
    save(state);
    state = null;
    currentSlot = null;
    fieldScreen.classList.add("hidden");
    titleScreen.classList.remove("hidden");
    document.getElementById("title-continue-btn").disabled = false;
  });

  starterGrayCard.addEventListener("click", function () {
    starterGrayCard.classList.add("selected");
    selectedStarter = true;
    updateStarterStartBtn();
  });
  function updateStarterStartBtn() {
    starterStartBtn.disabled = !(selectedStarter && starterNameInput.value.trim().length > 0);
  }
  starterNameInput.addEventListener("input", updateStarterStartBtn);

  starterStartBtn.addEventListener("click", function () {
    var name = starterNameInput.value.trim().slice(0, 6);
    if (!name || !selectedStarter) return;
    state = createInitialState(name);
    save(state);
    starterScreen.classList.add("hidden");
    fieldScreen.classList.remove("hidden");
    renderMap();
    updateHud();
  });

  // ---------------- Boot ----------------
  (function initTitleButtons() {
    var anyData = false;
    for (var i = 1; i <= SLOT_COUNT; i++) { if (loadSlot(i)) { anyData = true; break; } }
    document.getElementById("title-continue-btn").disabled = !anyData;
  })();
})();
