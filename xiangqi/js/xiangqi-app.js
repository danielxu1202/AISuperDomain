/* 人机中国象棋界面 */
(function () {
  "use strict";

  var X = window.Xiangqi;
  var FILES = 9;
  var RANKS = 10;

  var state = {
    pos: X.Position.fromFen(X.START_FEN),
    playerRed: true,
    level: 4,
    selected: -1,
    legalTargets: [],
    lastFrom: -1,
    lastTo: -1,
    thinking: false,
    over: false,
    history: [],
    undone: [],
    requestId: 0,
    worker: null,
  };

  var els = {};
  var audioCtx = null;

  function $(id) {
    return document.getElementById(id);
  }

  function fileOf(s) {
    return s % 9;
  }
  function rankOf(s) {
    return (s / 9) | 0;
  }

  function displaySquare(s) {
    if (state.playerRed) return s;
    return (9 - rankOf(s)) * 9 + (8 - fileOf(s));
  }

  function fromDisplay(ds) {
    return displaySquare(ds);
  }

  function ensureAudio() {
    if (!audioCtx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
  }

  function playTone(freq, dur, type, gain) {
    if (!audioCtx) return;
    var osc = audioCtx.createOscillator();
    var g = audioCtx.createGain();
    osc.type = type || "sine";
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain || 0.05, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    osc.connect(g);
    g.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + dur);
  }

  function soundMove(capture, check) {
    ensureAudio();
    if (capture) {
      playTone(220, 0.12, "triangle", 0.06);
      playTone(140, 0.16, "square", 0.03);
    } else {
      playTone(420, 0.08, "sine", 0.04);
    }
    if (check) setTimeout(function () { playTone(660, 0.18, "sawtooth", 0.03); }, 80);
  }

  function initWorker() {
    if (state.worker) return;
    try {
      state.worker = new Worker("js/xiangqi-worker.js");
      state.worker.onmessage = onWorkerMessage;
      state.worker.onerror = function () {
        state.worker = null;
      };
    } catch (e) {
      state.worker = null;
    }
  }

  function onWorkerMessage(e) {
    var data = e.data || {};
    if (data.requestId !== state.requestId) return;
    if (!data.ok || !data.move) {
      state.thinking = false;
      setStatus(data.error || "引擎无法走子", "danger");
      render();
      return;
    }
    applyEngineMove(data.move, data);
  }

  function applyEngineMove(move, info) {
    if (state.over || !state.pos.isLegalMove(move)) {
      state.thinking = false;
      render();
      return;
    }
    pushHistory(move);
    var captured = X.moveCaptured(move);
    state.pos.make(move);
    state.lastFrom = X.moveFrom(move);
    state.lastTo = X.moveTo(move);
    state.selected = -1;
    state.legalTargets = [];
    state.thinking = false;
    var check = state.pos.inCheck(state.pos.redToMove);
    soundMove(!!captured, check);
    var note = info && info.book ? "开局库" : "搜索 " + (info && info.nodes ? info.nodes : 0) + " 节点";
    setStatus("机器已落子（" + note + "）", check ? "warn" : "");
    finishIfOver();
    render();
    if (!state.over && isHumanTurn()) {
      setStatus(check ? "将军！" : "轮到你了");
    }
  }

  function think() {
    if (state.over || state.thinking || isHumanTurn()) return;
    state.thinking = true;
    setStatus("机器思考中…", "think");
    render();
    var payload = {
      requestId: ++state.requestId,
      fen: state.pos.toFen(),
      level: state.level,
      halfmove: state.pos.halfmove,
      fullmove: state.pos.fullmove,
      hashHistory: Array.prototype.slice.call(state.pos.hashHistory),
    };
    initWorker();
    if (state.worker) {
      state.worker.postMessage(payload);
      return;
    }
    setTimeout(function () {
      var level = X.LEVELS[state.level - 1];
      var result = X.searchBestMove(state.pos, level);
      applyEngineMove(result.move, result);
    }, 40);
  }

  function isHumanTurn() {
    return state.pos.redToMove === state.playerRed;
  }

  function pushHistory(move) {
    state.history.push({
      move: move,
      fen: state.pos.toFen(),
      text: X.moveToChinese(state.pos, move),
      iccs: X.toIccs(move),
    });
    state.undone = [];
  }

  function setStatus(text, kind) {
    els.status.textContent = text;
    els.status.className = "status" + (kind ? " " + kind : "");
  }

  function currentLevel() {
    return X.LEVELS[state.level - 1];
  }

  function finishIfOver() {
    var result = state.pos.gameResult();
    if (!result) return false;
    state.over = true;
    state.thinking = false;
    if (result === "draw") {
      setStatus("和棋", "warn");
      showResult("和棋", "双方不变作和，或六十回合无吃子。");
    } else {
      var humanWin = (result === "red") === state.playerRed;
      setStatus(humanWin ? "你赢了" : "你输了", humanWin ? "ok" : "danger");
      showResult(humanWin ? "红旗凯旋" : "棋差一着", humanWin ? "恭喜，你赢下了这局。" : "再试一盘，或调低机器水平。");
    }
    return true;
  }

  function showResult(title, desc) {
    els.resultTitle.textContent = title;
    els.resultDesc.textContent = desc;
    els.resultMask.classList.add("show");
  }

  function hideResult() {
    els.resultMask.classList.remove("show");
  }

  function newGame() {
    state.pos = X.Position.fromFen(X.START_FEN);
    state.selected = -1;
    state.legalTargets = [];
    state.lastFrom = -1;
    state.lastTo = -1;
    state.thinking = false;
    state.over = false;
    state.history = [];
    state.undone = [];
    state.requestId++;
    hideResult();
    setStatus(state.playerRed ? "你执红，请先走" : "你执黑，机器先走");
    render();
    if (!isHumanTurn()) think();
  }

  function undo() {
    if (state.thinking || state.history.length === 0) return;
    hideResult();
    state.over = false;
    var steps = isHumanTurn() ? 1 : 2;
    if (state.history.length === 1) steps = 1;
    while (steps-- && state.history.length) {
      var rec = state.history.pop();
      state.undone.push(rec);
      state.pos.unmake();
    }
    if (state.history.length) {
      var last = state.history[state.history.length - 1];
      state.lastFrom = X.moveFrom(last.move);
      state.lastTo = X.moveTo(last.move);
    } else {
      state.lastFrom = state.lastTo = -1;
    }
    state.selected = -1;
    state.legalTargets = [];
    setStatus("已悔棋");
    render();
    if (!isHumanTurn() && !state.over) think();
  }

  function hint() {
    if (state.thinking || state.over || !isHumanTurn()) return;
    setStatus("正在计算提示…", "think");
    var pos = state.pos.clone();
    var level = { depth: Math.min(4, currentLevel().depth), time: 350, skill: 100, random: 0, book: true };
    var result = X.searchBestMove(pos, level);
    if (!result.move) {
      setStatus("没有可用提示");
      return;
    }
    state.selected = X.moveFrom(result.move);
    state.legalTargets = [X.moveTo(result.move)];
    setStatus("提示：" + X.moveToChinese(state.pos, result.move));
    render();
  }

  function tryMove(from, to) {
    var move = state.pos.moveFromSquares(from, to);
    if (!move) return false;
    pushHistory(move);
    var captured = X.moveCaptured(move);
    state.pos.make(move);
    state.lastFrom = from;
    state.lastTo = to;
    state.selected = -1;
    state.legalTargets = [];
    var check = state.pos.inCheck(state.pos.redToMove);
    soundMove(!!captured, check);
    if (finishIfOver()) {
      render();
      return true;
    }
    setStatus(check ? "将军！机器思考中…" : "机器思考中…", "think");
    render();
    think();
    return true;
  }

  function onSquareClick(s) {
    if (state.over || state.thinking || !isHumanTurn()) return;
    ensureAudio();
    var piece = state.pos.board[s];
    if (state.selected >= 0) {
      if (s === state.selected) {
        state.selected = -1;
        state.legalTargets = [];
        render();
        return;
      }
      if (tryMove(state.selected, s)) return;
    }
    if (piece && X.isRed(piece) === state.playerRed) {
      state.selected = s;
      state.legalTargets = state.pos.legalMoves()
        .filter(function (m) { return X.moveFrom(m) === s; })
        .map(X.moveTo);
      render();
    }
  }

  function pieceClass(piece) {
    return (X.isRed(piece) ? "red" : "black") + " p-" + X.pieceType(piece);
  }

  function renderBoard() {
    var board = els.board;
    var marks = board.querySelector(".marks");
    var pieces = board.querySelector(".pieces");
    marks.innerHTML = "";
    pieces.innerHTML = "";

    function place(el, s) {
      var ds = displaySquare(s);
      var f = fileOf(ds);
      var r = 9 - rankOf(ds);
      el.style.left = (f / 8) * 100 + "%";
      el.style.top = (r / 9) * 100 + "%";
    }

    if (state.lastFrom >= 0) {
      var a = document.createElement("div");
      a.className = "mark last";
      place(a, state.lastFrom);
      marks.appendChild(a);
      var b = document.createElement("div");
      b.className = "mark last";
      place(b, state.lastTo);
      marks.appendChild(b);
    }
    if (state.selected >= 0) {
      var sel = document.createElement("div");
      sel.className = "mark selected";
      place(sel, state.selected);
      marks.appendChild(sel);
    }
    state.legalTargets.forEach(function (t) {
      var d = document.createElement("div");
      d.className = "mark target" + (state.pos.board[t] ? " capture" : "");
      place(d, t);
      marks.appendChild(d);
    });
    if (state.pos.inCheck(state.pos.redToMove)) {
      var king = state.pos.redToMove ? state.pos.redKing : state.pos.blackKing;
      var ck = document.createElement("div");
      ck.className = "mark check";
      place(ck, king);
      marks.appendChild(ck);
    }

    for (var s = 0; s < 90; s++) {
      var p = state.pos.board[s];
      if (!p) continue;
      var el = document.createElement("button");
      el.type = "button";
      el.className = "piece " + pieceClass(p);
      el.textContent = X.displayName(p);
      el.dataset.sq = String(s);
      place(el, s);
      pieces.appendChild(el);
    }
  }

  function renderHistory() {
    els.moves.innerHTML = "";
    for (var i = 0; i < state.history.length; i += 2) {
      var row = document.createElement("div");
      row.className = "move-row";
      var n = document.createElement("span");
      n.className = "n";
      n.textContent = (i / 2 + 1) + ".";
      var red = document.createElement("span");
      red.textContent = state.history[i].text;
      row.appendChild(n);
      row.appendChild(red);
      if (state.history[i + 1]) {
        var black = document.createElement("span");
        black.textContent = state.history[i + 1].text;
        row.appendChild(black);
      }
      els.moves.appendChild(row);
    }
    els.moves.scrollTop = els.moves.scrollHeight;
  }

  function renderCaptures() {
    var redLost = [];
    var blackLost = [];
    var start = X.Position.fromFen(X.START_FEN);
    var startCount = {};
    var nowCount = {};
    function tally(pos, bag) {
      for (var s = 0; s < 90; s++) {
        var p = pos.board[s];
        if (!p) continue;
        bag[p] = (bag[p] || 0) + 1;
      }
    }
    tally(start, startCount);
    tally(state.pos, nowCount);
    Object.keys(startCount).forEach(function (k) {
      var piece = +k;
      var miss = startCount[k] - (nowCount[k] || 0);
      for (var i = 0; i < miss; i++) {
        if (X.isRed(piece)) redLost.push(piece);
        else blackLost.push(piece);
      }
    });
    function paint(box, list) {
      box.innerHTML = "";
      list.forEach(function (p) {
        var s = document.createElement("span");
        s.className = "mini " + (X.isRed(p) ? "red" : "black");
        s.textContent = X.displayName(p);
        box.appendChild(s);
      });
    }
    paint(els.capRed, redLost);
    paint(els.capBlack, blackLost);
  }

  function renderMeta() {
    var lv = currentLevel();
    els.levelName.textContent = lv.name;
    els.levelTitle.textContent = lv.title;
    els.sideLabel.textContent = state.playerRed ? "执红先行" : "执黑后手";
    els.turnLabel.textContent = state.over ? "对局结束" : state.thinking ? "机器思考" : isHumanTurn() ? "轮到你" : "轮到机器";
    els.thinkDot.classList.toggle("on", state.thinking);
    els.boardWrap.classList.toggle("thinking", state.thinking);
    els.boardWrap.classList.toggle("flipped", !state.playerRed);
  }

  function render() {
    renderBoard();
    renderHistory();
    renderCaptures();
    renderMeta();
  }

  function buildGrid() {
    var svg = els.grid;
    var NS = "http://www.w3.org/2000/svg";
    var W = 800;
    var H = 900;
    var pad = 40;
    var gw = W - pad * 2;
    var gh = H - pad * 2;
    var xf = gw / 8;
    var yf = gh / 9;
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);

    function line(x1, y1, x2, y2, cls) {
      var l = document.createElementNS(NS, "line");
      l.setAttribute("x1", x1);
      l.setAttribute("y1", y1);
      l.setAttribute("x2", x2);
      l.setAttribute("y2", y2);
      l.setAttribute("class", cls || "grid-line");
      svg.appendChild(l);
    }

    var outer = document.createElementNS(NS, "rect");
    outer.setAttribute("x", pad - 10);
    outer.setAttribute("y", pad - 10);
    outer.setAttribute("width", gw + 20);
    outer.setAttribute("height", gh + 20);
    outer.setAttribute("class", "board-frame");
    svg.appendChild(outer);

    var inner = document.createElementNS(NS, "rect");
    inner.setAttribute("x", pad);
    inner.setAttribute("y", pad);
    inner.setAttribute("width", gw);
    inner.setAttribute("height", gh);
    inner.setAttribute("class", "board-inner");
    svg.appendChild(inner);

    var r, f;
    for (r = 0; r <= 9; r++) line(pad, pad + r * yf, pad + gw, pad + r * yf);
    for (f = 0; f <= 8; f++) {
      line(pad + f * xf, pad, pad + f * xf, pad + 4 * yf);
      line(pad + f * xf, pad + 5 * yf, pad + f * xf, pad + 9 * yf);
    }
    line(pad, pad + 4 * yf, pad, pad + 5 * yf);
    line(pad + gw, pad + 4 * yf, pad + gw, pad + 5 * yf);

    function cross(f0, r0, f1, r1) {
      line(pad + f0 * xf, pad + r0 * yf, pad + f1 * xf, pad + r1 * yf, "palace");
    }
    cross(3, 0, 5, 2);
    cross(5, 0, 3, 2);
    cross(3, 7, 5, 9);
    cross(5, 7, 3, 9);

    function mark(f0, r0) {
      var x = pad + f0 * xf;
      var y = pad + r0 * yf;
      var s = 8;
      var g = 4;
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (d) {
        if ((d[0] < 0 && f0 === 0) || (d[0] > 0 && f0 === 8)) return;
        line(x + d[0] * g, y + d[1] * g, x + d[0] * (g + s), y + d[1] * g, "cannon-mark");
        line(x + d[0] * g, y + d[1] * g, x + d[0] * g, y + d[1] * (g + s), "cannon-mark");
      });
    }
    [2, 7].forEach(function (rr) {
      mark(1, rr);
      mark(7, rr);
    });
    [3, 6].forEach(function (rr) {
      [0, 2, 4, 6, 8].forEach(function (ff) { mark(ff, rr); });
    });

    function riverText(txt, x) {
      var t = document.createElementNS(NS, "text");
      t.setAttribute("x", x);
      t.setAttribute("y", pad + 4.62 * yf);
      t.setAttribute("class", "river-text");
      t.textContent = txt;
      svg.appendChild(t);
    }
    riverText("楚 河", pad + gw * 0.25);
    riverText("汉 界", pad + gw * 0.75);
  }

  function buildHitLayer() {
    els.hits.innerHTML = "";
    for (var r = 9; r >= 0; r--) {
      for (var f = 0; f < 9; f++) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "hit";
        btn.dataset.sq = String(X.sq(f, r));
        els.hits.appendChild(btn);
      }
    }
  }

  function bind() {
    els.hits.addEventListener("click", function (e) {
      var btn = e.target.closest(".hit");
      if (!btn) return;
      var ds = +btn.dataset.sq;
      onSquareClick(fromDisplay(ds));
    });

    els.board.addEventListener("click", function (e) {
      var piece = e.target.closest(".piece");
      if (!piece) return;
      onSquareClick(+piece.dataset.sq);
    });

    $("btn-new").addEventListener("click", newGame);
    $("btn-undo").addEventListener("click", undo);
    $("btn-hint").addEventListener("click", hint);
    $("btn-resign").addEventListener("click", function () {
      if (state.over || state.thinking) return;
      state.over = true;
      setStatus("你认输了", "danger");
      showResult("认输", "这一局交给机器。再来一盘？");
    });
    $("btn-again").addEventListener("click", newGame);
    $("btn-close-result").addEventListener("click", hideResult);

    $("level").addEventListener("change", function () {
      state.level = +this.value;
      renderMeta();
      setStatus("已切换到「" + currentLevel().name + "」");
    });

    $("side").addEventListener("change", function () {
      var v = this.value;
      if (v === "random") state.playerRed = Math.random() < 0.5;
      else state.playerRed = v === "red";
      newGame();
    });

    document.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
      }
    });
  }

  function fillSelects() {
    var level = $("level");
    X.LEVELS.forEach(function (lv) {
      var opt = document.createElement("option");
      opt.value = String(lv.id);
      opt.textContent = lv.id + ". " + lv.name + " · " + lv.title;
      if (lv.id === state.level) opt.selected = true;
      level.appendChild(opt);
    });
  }

  function init() {
    els.board = $("board");
    els.boardWrap = $("board-wrap");
    els.grid = $("grid");
    els.hits = $("hits");
    els.status = $("status");
    els.moves = $("moves");
    els.capRed = $("cap-red");
    els.capBlack = $("cap-black");
    els.levelName = $("level-name");
    els.levelTitle = $("level-title");
    els.sideLabel = $("side-label");
    els.turnLabel = $("turn-label");
    els.thinkDot = $("think-dot");
    els.resultMask = $("result-mask");
    els.resultTitle = $("result-title");
    els.resultDesc = $("result-desc");
    buildGrid();
    buildHitLayer();
    fillSelects();
    bind();
    initWorker();
    newGame();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
