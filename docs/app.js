(function () {
  "use strict";

  var G = window.GAME_DATA;
  var SAVE_KEY = "chinchilla-quest-save-v1";
  var DIR_VECT = { up: { dx: 0, dy: -1 }, down: { dx: 0, dy: 1 }, left: { dx: -1, dy: 0 }, right: { dx: 1, dy: 0 } };

  // ---------------- Save/load ----------------
  function load() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }
  function save(s) { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); }

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
      mapId: G.START_MAP,
      x: G.START_X,
      y: G.START_Y,
      facing: "down",
      flags: { bossDefeated: false }
    };
  }

  function getMaxStats(s) { return G.calcMaxStats(s.level, s.stageIndex); }

  function renderPlayerSprite() {
    if (state.stageIndex > 0) {
      var stage = G.EVOLUTION_ROUTES[state.route].stages[state.stageIndex - 1];
      return '<img src="' + stage.file + '" alt="' + stage.label + '" style="width:100%;height:100%;object-fit:contain;">';
    }
    return '<img src="' + G.HERO_IMAGE + '" alt="' + state.name + '" style="width:100%;height:100%;object-fit:contain;">';
  }

  // ---------------- DOM refs ----------------
  var titleScreen = document.getElementById("title-screen");
  var starterScreen = document.getElementById("starter-screen");
  var fieldScreen = document.getElementById("field-screen");
  var battleScreen = document.getElementById("battle-screen");

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
  var battleEnemyLv = document.getElementById("battle-enemy-lv");
  var battleEnemyHpBar = document.getElementById("battle-enemy-hp-bar");
  var battleEnemyHpText = document.getElementById("battle-enemy-hp-text");
  var battleEnemySprite = document.getElementById("battle-enemy-sprite");
  var battlePlayerName = document.getElementById("battle-player-name");
  var battlePlayerLv = document.getElementById("battle-player-lv");
  var battlePlayerHpBar = document.getElementById("battle-player-hp-bar");
  var battlePlayerHpText = document.getElementById("battle-player-hp-text");
  var battlePlayerMpBar = document.getElementById("battle-player-mp-bar");
  var battlePlayerMpText = document.getElementById("battle-player-mp-text");
  var battlePlayerExpBar = document.getElementById("battle-player-exp-bar");
  var battlePlayerSprite = document.getElementById("battle-player-sprite");
  var battleMessageEl = document.getElementById("battle-message");
  var battleCommandMenu = document.getElementById("battle-command-menu");
  var battleSubMenu = document.getElementById("battle-sub-menu");
  var battleSubList = document.getElementById("battle-sub-list");
  var runBtn = document.querySelector('.battle-cmd-btn[data-cmd="run"]');

  var menuStatusEl = document.getElementById("menu-status");
  var menuSkillsEl = document.getElementById("menu-skills");
  var menuItemsEl = document.getElementById("menu-items");
  var shopListEl = document.getElementById("shop-list");
  var routeChoicesEl = document.getElementById("route-choices");

  var toastEl = document.getElementById("toast");
  var toastTimer = null;

  var state = load();
  var selectedStarter = false;
  var battle = null;
  var battleActive = false;
  var dialogueQueue = [];
  var dialogueActive = false;
  var pendingShopAfterDialogue = false;

  // ---------------- UI helpers ----------------
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.add("hidden"); }, 2200);
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

  function tileClass(ch) {
    if (ch === "#") return "tile-wall";
    if (ch === ",") return "tile-grass";
    if (ch === "~") return "tile-water";
    if (ch === "H") return "tile-heal";
    return "tile-ground";
  }

  var playerEl = null;

  function renderMap() {
    var map = currentMap();
    var rows = map.tiles.length, cols = map.tiles[0].length;
    mapViewport.className = "map-viewport map-" + map.id;
    mapViewport.style.gridTemplateColumns = "repeat(" + cols + ",1fr)";
    mapViewport.style.gridTemplateRows = "repeat(" + rows + ",1fr)";
    mapViewport.style.aspectRatio = cols + " / " + rows;

    var html = "";
    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        var ch = map.tiles[y][x];
        var cls = "tile " + tileClass(ch);
        var warp = warpAtCoord(map, x, y);
        var isBoss = !!(map.bossTrigger && map.bossTrigger.x === x && map.bossTrigger.y === y && !state.flags.bossDefeated);
        if (warp) cls += " tile-warp";
        if (isBoss) cls += " tile-boss";
        var npc = npcAtCoord(map, x, y);
        var inner = "";
        if (npc && npc.image) inner = '<img class="tile-npc-mark tile-npc-img" src="' + npc.image + '" alt="' + npc.name + '">';
        else if (npc) inner = '<span class="tile-npc-mark' + (npc.shop ? " tile-npc-shop" : "") + '">' + (npc.shop ? "🛍️" : "🧑") + "</span>";
        else if (isBoss) inner = '<span class="tile-boss-mark">💀</span>';
        else if (warp) {
          var gateImg = warp.toMap === "dungeon" ? "assets/tiles/gate_entrance.webp" : "assets/tiles/gate_exit.webp";
          inner = '<img class="tile-warp-img" src="' + gateImg + '" alt="warp">';
        }
        else if (ch === "H") inner = '<span class="tile-heal-mark">✨</span>';
        html += '<div class="' + cls + '">' + inner + "</div>";
      }
    }
    mapViewport.innerHTML = html;

    playerEl = document.createElement("div");
    playerEl.className = "tile-player";
    playerEl.innerHTML = '<div class="tile-player-inner">' + renderPlayerSprite() + "</div>";
    mapViewport.appendChild(playerEl);
    positionPlayerSprite(false);
  }

  function positionPlayerSprite(animateStep) {
    if (!playerEl) return;
    var map = currentMap();
    var rows = map.tiles.length, cols = map.tiles[0].length;
    playerEl.style.left = (state.x / cols * 100) + "%";
    playerEl.style.top = (state.y / rows * 100) + "%";
    playerEl.style.width = (100 / cols) + "%";
    playerEl.style.height = (100 / rows) + "%";
    var inner = playerEl.querySelector(".tile-player-inner");
    if (inner) inner.classList.toggle("facing-left", state.facing === "left");
    if (animateStep !== false) {
      playerEl.classList.remove("step-bounce");
      void playerEl.offsetWidth;
      playerEl.classList.add("step-bounce");
    }
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

  function tryMove(dir) {
    if (battleActive || dialogueActive) return;
    state.facing = dir;
    var d = DIR_VECT[dir];
    var map = currentMap();
    var nx = state.x + d.dx, ny = state.y + d.dy;
    if (!inBounds(map, nx, ny)) return;
    var ch = map.tiles[ny][nx];
    if (ch === "#" || ch === "~") return;
    var blockingNpc = npcAtCoord(map, nx, ny);
    if (blockingNpc) { showToast(blockingNpc.name + " が いる。「はなす」で話しかけよう"); return; }

    state.x = nx; state.y = ny;
    save(state);
    positionPlayerSprite();
    updateHud();

    if (ch === "H") {
      var healStats = getMaxStats(state);
      if (state.hp < healStats.maxHp || state.mp < healStats.maxMp) {
        state.hp = healStats.maxHp;
        state.mp = healStats.maxMp;
        save(state);
        updateHud();
        showToast("いやしの泉で 元気を 取り戻した!");
      } else {
        showToast("もう げんきいっぱいだ!");
      }
    }

    var warp = warpAtCoord(map, nx, ny);
    if (warp) { doWarp(warp); return; }

    if (map.bossTrigger && map.bossTrigger.x === nx && map.bossTrigger.y === ny && !state.flags.bossDefeated) {
      startBattle(map.bossTrigger.monsterId, true);
      return;
    }
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
    showToast(G.MAPS[warp.toMap].label + " に着いた");
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
    if (pendingShopAfterDialogue) {
      pendingShopAfterDialogue = false;
      openShopModal();
    }
  }
  dialogueOverlay.addEventListener("click", advanceDialogue);

  // ---------------- Battle ----------------
  function calcDamage(atk, power, def) {
    var raw = Math.max(1, atk * power / 20 - def * 0.4);
    var rand = 0.9 + Math.random() * 0.2;
    return Math.max(1, Math.round(raw * rand));
  }

  function setBattleMessage(msg) { battleMessageEl.textContent = msg; }

  function playSequence(lines, done) {
    var i = 0;
    function step() {
      if (i >= lines.length) { done(); return; }
      setBattleMessage(lines[i]); i++;
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
    setCommandButtonsEnabled(true);
    if (battle && battle.isBoss) runBtn.disabled = true;
  }
  function showSubMenu() { battleCommandMenu.classList.add("hidden"); battleSubMenu.classList.remove("hidden"); }
  function closeSubMenu() { showCommandMenu(); }

  function renderBattle() {
    var def = G.MONSTERS[battle.monsterId];
    battleEnemyName.textContent = def.name;
    battleEnemyLv.textContent = "Lv" + def.level;
    battleEnemyHpBar.style.width = Math.max(0, battle.monsterHp / battle.monsterMaxHp * 100) + "%";
    battleEnemyHpText.textContent = battle.monsterHp + " / " + battle.monsterMaxHp;
    battleEnemySprite.innerHTML = '<img src="' + def.image + '" alt="' + def.name + '" style="width:100%;height:100%;object-fit:contain;">';

    var stats = getMaxStats(state);
    battlePlayerName.textContent = state.name;
    battlePlayerLv.textContent = "Lv" + state.level;
    battlePlayerHpBar.style.width = Math.max(0, state.hp / stats.maxHp * 100) + "%";
    battlePlayerHpText.textContent = state.hp + " / " + stats.maxHp;
    battlePlayerMpBar.style.width = Math.max(0, state.mp / stats.maxMp * 100) + "%";
    battlePlayerMpText.textContent = state.mp + " / " + stats.maxMp;
    var expNeed = G.expToNext(state.level);
    battlePlayerExpBar.style.width = Math.max(0, Math.min(100, state.exp / expNeed * 100)) + "%";
    battlePlayerSprite.innerHTML = renderPlayerSprite();
  }

  function startBattle(monsterId, isBoss) {
    var def = G.MONSTERS[monsterId];
    battle = { monsterId: monsterId, monsterHp: def.hp, monsterMaxHp: def.hp, isBoss: !!isBoss, locked: false };
    battleActive = true;
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

  function doPlayerAction(action) {
    if (!battle || battle.locked) return;
    battle.locked = true;
    setCommandButtonsEnabled(false);
    closeSubMenu();
    var stats = getMaxStats(state);
    var def = G.MONSTERS[battle.monsterId];
    var lines = [];

    if (action.type === "item") {
      var item = G.ITEMS[action.itemId];
      state.inventory[action.itemId] = Math.max(0, (state.inventory[action.itemId] || 0) - 1);
      if (item.kind === "hp") state.hp = Math.min(stats.maxHp, state.hp + item.amount);
      else state.mp = Math.min(stats.maxMp, state.mp + item.amount);
      lines.push(state.name + " は " + item.name + " を つかった!");
    } else {
      var sk = G.SKILLS[action.skillId];
      state.mp = Math.max(0, state.mp - sk.mp);
      var dmg = calcDamage(stats.atk, sk.power, def.def);
      battle.monsterHp = Math.max(0, battle.monsterHp - dmg);
      battleEnemySprite.classList.add("shake");
      setTimeout(function () { battleEnemySprite.classList.remove("shake"); }, 400);
      lines.push(state.name + " の " + sk.name + "!");
      lines.push(def.name + " に " + dmg + " の ダメージ!");
    }

    save(state);
    renderBattle();
    playSequence(lines, function () {
      if (battle.monsterHp <= 0) { winBattle(); return; }
      enemyTurn();
    });
  }

  function enemyTurn() {
    var def = G.MONSTERS[battle.monsterId];
    var stats = getMaxStats(state);
    var skillId = def.skillIds[Math.floor(Math.random() * def.skillIds.length)];
    var sk = G.SKILLS[skillId];
    var dmg = calcDamage(def.atk, sk.power, stats.def);
    state.hp = Math.max(0, state.hp - dmg);
    save(state);
    renderBattle();
    battlePlayerSprite.classList.add("shake");
    setTimeout(function () { battlePlayerSprite.classList.remove("shake"); }, 400);

    var lines = [def.name + " の " + sk.name + "!", state.name + " に " + dmg + " の ダメージ!"];
    playSequence(lines, function () {
      if (state.hp <= 0) { loseBattle(); return; }
      battle.locked = false;
      showCommandMenu();
      setBattleMessage("つぎの コマンドを えらんでね");
    });
  }

  function tryRun() {
    if (!battle || battle.locked) return;
    if (battle.isBoss) { showToast("ボスからは にげられない!"); return; }
    battle.locked = true;
    setCommandButtonsEnabled(false);
    var stats = getMaxStats(state);
    var def = G.MONSTERS[battle.monsterId];
    var chance = Math.max(0.15, Math.min(0.9, 0.5 + (stats.spd - def.spd) * 0.02));
    if (Math.random() < chance) {
      setBattleMessage("うまく にげきれた!");
      setTimeout(endBattleToField, 900);
    } else {
      setBattleMessage(state.name + " は にげようとしたが…つかまってしまった!");
      setTimeout(function () { battle.locked = false; enemyTurn(); }, 900);
    }
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
      state.hp = Math.min(newMax.maxHp, state.hp + (newMax.maxHp - oldMax.maxHp));
      state.mp = Math.min(newMax.maxMp, state.mp + (newMax.maxMp - oldMax.maxMp));
      events.push({ type: "levelup", level: state.level });

      G.SKILL_LEARN_ORDER.forEach(function (id) {
        var sk = G.SKILLS[id];
        if (sk.learnLevel === state.level && state.learnedSkills.indexOf(id) === -1) {
          state.learnedSkills.push(id);
          events.push({ type: "skill", skillId: id });
        }
      });

      if (state.level === G.FIRST_EVOLUTION_LEVEL && !state.route) {
        events.push({ type: "routechoice" });
      } else if (state.route) {
        var stages = G.EVOLUTION_ROUTES[state.route].stages;
        var nextIdx = state.stageIndex;
        if (nextIdx < stages.length && stages[nextIdx].level === state.level) {
          state.stageIndex += 1;
          events.push({ type: "evolve", stage: stages[nextIdx] });
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
        save(state);
        closeModal("route-modal");
        showToast(state.name + " は " + firstStage.label + " に しんかした!");
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
      if (ev.type === "levelup") lines.push("レベルアップ! Lv" + ev.level + " に なった!");
      else if (ev.type === "skill") lines.push(G.SKILLS[ev.skillId].name + " を おぼえた!");
      else if (ev.type === "evolve") lines.push(state.name + " は " + ev.stage.label + " に しんかした!");
      else if (ev.type === "routechoice") routeChoiceNeeded = true;
    });
    playSequence(lines, function () {
      if (routeChoiceNeeded) openRouteModal(done); else done();
    });
  }

  function winBattle() {
    var def = G.MONSTERS[battle.monsterId];
    state.money += def.money;
    var lines = [def.name + " を たおした!", def.exp + " の けいけんちを 手に入れた!", def.money + "ぴき の コインを 手に入れた!"];
    if (battle.isBoss) {
      state.flags.bossDefeated = true;
      lines.push("つよい モンスターを たおした! これからも ぼうけんは つづく…");
    }
    var events = gainExp(def.exp);
    save(state);
    renderBattle();
    playSequence(lines, function () {
      handleLevelUpMessages(events, endBattleToField);
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
  function openSkillSubMenu() {
    var skillIds = state.learnedSkills.filter(function (id) { return id !== "tackle"; });
    if (skillIds.length === 0) { showToast("つかえる わざが まだ ないよ"); return; }
    battleSubList.innerHTML = "";
    skillIds.forEach(function (id) {
      var sk = G.SKILLS[id];
      var disabled = state.mp < sk.mp;
      var row = document.createElement("div");
      row.className = "battle-sub-item";
      row.innerHTML =
        '<div><div class="sub-item-name">' + sk.name + '</div><div class="sub-item-desc">MP' + sk.mp + " ・ " + sk.desc + "</div></div>" +
        "<button" + (disabled ? " disabled" : "") + ">えらぶ</button>";
      row.querySelector("button").addEventListener("click", function () { doPlayerAction({ type: "skill", skillId: id }); });
      battleSubList.appendChild(row);
    });
    showSubMenu();
  }

  function openItemSubMenu() {
    var any = false;
    battleSubList.innerHTML = "";
    G.SHOP_ITEM_IDS.forEach(function (id) {
      var count = state.inventory[id] || 0;
      if (count <= 0) return;
      any = true;
      var item = G.ITEMS[id];
      var row = document.createElement("div");
      row.className = "battle-sub-item";
      row.innerHTML =
        '<div><div class="sub-item-name">' + item.name + " ×" + count + '</div><div class="sub-item-desc">' + item.desc + "</div></div>" +
        "<button>つかう</button>";
      row.querySelector("button").addEventListener("click", function () { doPlayerAction({ type: "item", itemId: id }); });
      battleSubList.appendChild(row);
    });
    if (!any) { showToast("つかえる どうぐが ないよ"); return; }
    showSubMenu();
  }

  document.querySelectorAll(".battle-cmd-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (!battle || battle.locked) return;
      var cmd = btn.dataset.cmd;
      if (cmd === "attack") doPlayerAction({ type: "skill", skillId: "tackle" });
      else if (cmd === "skill") openSkillSubMenu();
      else if (cmd === "item") openItemSubMenu();
      else if (cmd === "run") tryRun();
    });
  });
  document.getElementById("battle-sub-back").addEventListener("click", closeSubMenu);

  // ---------------- Menu / Shop ----------------
  function renderInventoryList(container) {
    container.innerHTML = "";
    G.SHOP_ITEM_IDS.forEach(function (id) {
      var item = G.ITEMS[id];
      var count = state.inventory[id] || 0;
      var div = document.createElement("div");
      div.className = "food-item";
      div.innerHTML =
        '<div class="food-info"><div><div class="food-name">' + item.name + " ×" + count + '</div><div class="food-desc">' + item.desc + "</div></div></div>" +
        "<button" + (count <= 0 ? " disabled" : "") + ">つかう</button>";
      div.querySelector("button").addEventListener("click", function () {
        if (count <= 0) return;
        var stats = getMaxStats(state);
        state.inventory[id] -= 1;
        if (item.kind === "hp") state.hp = Math.min(stats.maxHp, state.hp + item.amount);
        else state.mp = Math.min(stats.maxMp, state.mp + item.amount);
        save(state);
        showToast(item.name + " を つかった!");
        updateHud();
        openMenuModal();
      });
      container.appendChild(div);
    });
  }

  function openMenuModal() {
    var stats = getMaxStats(state);
    var stageLabel = state.stageIndex > 0 ? G.EVOLUTION_ROUTES[state.route].stages[state.stageIndex - 1].label : "ちんちら";
    menuStatusEl.innerHTML =
      "<div><b>" + state.name + "</b>(" + stageLabel + ") Lv" + state.level + "</div>" +
      "<div>HP " + state.hp + " / " + stats.maxHp + "</div>" +
      "<div>MP " + state.mp + " / " + stats.maxMp + "</div>" +
      "<div>こうげき " + stats.atk + " ・ ぼうぎょ " + stats.def + " ・ すばやさ " + stats.spd + "</div>" +
      "<div>けいけんち " + state.exp + " / " + G.expToNext(state.level) + "</div>" +
      "<div>💰 " + state.money + "</div>";

    menuSkillsEl.innerHTML = "";
    state.learnedSkills.forEach(function (id) {
      var sk = G.SKILLS[id];
      var row = document.createElement("div");
      row.className = "menu-skill-row";
      row.innerHTML = "<span>" + sk.name + "</span><span>MP" + sk.mp + "</span>";
      menuSkillsEl.appendChild(row);
    });

    renderInventoryList(menuItemsEl);
    openModal("menu-modal");
  }
  document.getElementById("select-btn").addEventListener("click", openMenuModal);

  function openShopModal() {
    shopListEl.innerHTML = "";
    G.SHOP_ITEM_IDS.forEach(function (id) {
      var item = G.ITEMS[id];
      var disabled = state.money < item.price;
      var div = document.createElement("div");
      div.className = "food-item";
      div.innerHTML =
        '<div class="food-info"><div><div class="food-name">' + item.name + '</div><div class="food-desc">' + item.desc + "</div></div></div>" +
        "<button" + (disabled ? " disabled" : "") + ">💰" + item.price + "</button>";
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

  // ---------------- Title / Starter ----------------
  starterGrayCard.querySelector(".starter-avatar").innerHTML = '<img src="' + G.HERO_IMAGE + '" alt="チンチラ" style="width:100%;height:100%;object-fit:contain;">';

  document.getElementById("title-start-btn").addEventListener("click", function () {
    titleScreen.classList.add("hidden");
    starterScreen.classList.remove("hidden");
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
  if (state) {
    titleScreen.classList.add("hidden");
    starterScreen.classList.add("hidden");
    fieldScreen.classList.remove("hidden");
    renderMap();
    updateHud();
  }
})();
