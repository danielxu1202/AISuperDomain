/**
 * 中国象棋规则引擎 + 人机搜索
 * 可在浏览器、Web Worker、Node.js 中运行
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.Xiangqi = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var EMPTY = 0;
  var KING = 1;
  var ADVISOR = 2;
  var ELEPHANT = 3;
  var HORSE = 4;
  var ROOK = 5;
  var CANNON = 6;
  var PAWN = 7;
  var RED = 8;
  var BLACK = 16;
  var TYPE_MASK = 7;
  var COLOR_MASK = 24;

  var PIECE_CHARS = {
    9: "K",
    10: "A",
    11: "B",
    12: "N",
    13: "R",
    14: "C",
    15: "P",
    17: "k",
    18: "a",
    19: "b",
    20: "n",
    21: "r",
    22: "c",
    23: "p",
  };

  var CHAR_PIECE = {
    K: 9,
    A: 10,
    B: 11,
    E: 11,
    N: 12,
    H: 12,
    R: 13,
    C: 14,
    P: 15,
    k: 17,
    a: 18,
    b: 19,
    e: 19,
    n: 20,
    h: 20,
    r: 21,
    c: 22,
    p: 23,
  };

  var START_FEN = "rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w";

  var FILE_NUM_CN = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
  var PIECE_NAME_RED = ["", "帅", "仕", "相", "马", "车", "炮", "兵"];
  var PIECE_NAME_BLACK = ["", "将", "士", "象", "马", "车", "炮", "卒"];

  var HORSE_DELTAS = [
    [1, 2, 0, 1],
    [-1, 2, 0, 1],
    [1, -2, 0, -1],
    [-1, -2, 0, -1],
    [2, 1, 1, 0],
    [2, -1, 1, 0],
    [-2, 1, -1, 0],
    [-2, -1, -1, 0],
  ];

  var ELEPHANT_DELTAS = [
    [2, 2, 1, 1],
    [2, -2, 1, -1],
    [-2, 2, -1, 1],
    [-2, -2, -1, -1],
  ];

  var ADVISOR_DELTAS = [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];

  var KING_DELTAS = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  var MATE_SCORE = 20000;
  var INF = 30000;

  var LEVELS = [
    {
      id: 1,
      name: "入门",
      title: "刚学会走子",
      depth: 1,
      time: 60,
      skill: 18,
      random: 90,
      book: false,
    },
    {
      id: 2,
      name: "初级",
      title: "业余爱好者",
      depth: 2,
      time: 180,
      skill: 38,
      random: 45,
      book: false,
    },
    {
      id: 3,
      name: "中级",
      title: "俱乐部棋手",
      depth: 3,
      time: 420,
      skill: 62,
      random: 16,
      book: true,
    },
    {
      id: 4,
      name: "高级",
      title: "地方高手",
      depth: 5,
      time: 900,
      skill: 82,
      random: 5,
      book: true,
    },
    {
      id: 5,
      name: "专家",
      title: "省级选手",
      depth: 7,
      time: 2200,
      skill: 94,
      random: 1,
      book: true,
    },
    {
      id: 6,
      name: "大师",
      title: "大师级搜索",
      depth: 12,
      time: 6500,
      skill: 100,
      random: 0,
      book: true,
    },
  ];

  // 子力与位置表（中局 / 残局），红方视角，rank0 为红底线
  var MG_VALUE = [0, 0, 130, 125, 290, 620, 300, 40];
  var EG_VALUE = [0, 0, 120, 110, 320, 680, 250, 55];

  var PST_MG = [];
  var PST_EG = [];

  function fillPst(type, mg, eg) {
    PST_MG[type] = mg;
    PST_EG[type] = eg;
  }

  fillPst(
    ADVISOR,
    [
      0, 0, 0, 20, 0, 20, 0, 0, 0, 0, 0, 0, 0, 23, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ],
    [
      0, 0, 0, 20, 0, 20, 0, 0, 0, 0, 0, 0, 0, 28, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ]
  );

  fillPst(
    ELEPHANT,
    [
      0, 0, 20, 0, 0, 0, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 18, 0, 0, 0, 23, 0, 0, 0, 18, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 20, 0, 0, 0, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ],
    [
      0, 0, 18, 0, 0, 0, 18, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 16, 0, 0, 0, 20, 0, 0, 0, 16, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 16, 0, 0, 0, 16, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ]
  );

  fillPst(
    HORSE,
    [
      4, 8, 16, 12, 4, 12, 16, 8, 4, 4, 20, 28, 24, 20, 24, 28, 20, 4, 12, 26, 32, 36, 40, 36, 32, 26, 12, 8, 24, 28, 36, 42, 36, 28, 24, 8, 4, 20, 28, 34, 38, 34, 28, 20, 4, 4, 16, 24, 28, 32, 28, 24, 16, 4, 0, 8, 16, 22, 24, 22, 16, 8, 0, -4, 4, 12, 16, 16, 16, 12, 4, -4, -8, -2, 4, 8, 8, 8, 4, -2, -8, -12, -8, -4, 0, 0, 0, -4, -8, -12,
    ],
    [
      0, 4, 8, 6, 4, 6, 8, 4, 0, 2, 16, 22, 18, 16, 18, 22, 16, 2, 8, 22, 28, 32, 34, 32, 28, 22, 8, 6, 20, 26, 34, 38, 34, 26, 20, 6, 4, 18, 26, 32, 36, 32, 26, 18, 4, 2, 14, 22, 26, 30, 26, 22, 14, 2, 0, 8, 16, 20, 22, 20, 16, 8, 0, -2, 4, 10, 14, 14, 14, 10, 4, -2, -6, 0, 4, 6, 6, 6, 4, 0, -6, -10, -6, -2, 0, 0, 0, -2, -6, -10,
    ]
  );

  fillPst(
    ROOK,
    [
      14, 14, 12, 18, 16, 18, 12, 14, 14, 16, 20, 18, 24, 26, 24, 18, 20, 16, 12, 12, 12, 18, 18, 18, 12, 12, 12, 12, 18, 16, 22, 22, 22, 16, 18, 12, 12, 14, 12, 18, 18, 18, 12, 14, 12, 12, 16, 14, 20, 20, 20, 14, 16, 12, 6, 10, 8, 14, 14, 14, 8, 10, 6, 4, 8, 6, 14, 12, 14, 6, 8, 4, 8, 4, 8, 16, 8, 16, 8, 4, 8, -2, 10, 6, 14, 12, 14, 6, 10, -2,
    ],
    [
      16, 16, 16, 20, 18, 20, 16, 16, 16, 16, 18, 18, 22, 24, 22, 18, 18, 16, 14, 14, 14, 18, 18, 18, 14, 14, 14, 14, 16, 16, 20, 20, 20, 16, 16, 14, 12, 14, 14, 18, 18, 18, 14, 14, 12, 12, 14, 14, 18, 18, 18, 14, 14, 12, 10, 12, 12, 16, 16, 16, 12, 12, 10, 8, 10, 10, 14, 14, 14, 10, 10, 8, 8, 8, 10, 14, 12, 14, 10, 8, 8, 6, 10, 10, 14, 14, 14, 10, 10, 6,
    ]
  );

  fillPst(
    CANNON,
    [
      6, 4, 0, -10, -12, -10, 0, 4, 6, 2, 2, 0, -4, -14, -4, 0, 2, 2, 2, 2, 0, -10, -8, -10, 0, 2, 2, 0, 6, 6, 8, 8, 8, 6, 6, 0, 4, 2, 8, 8, 12, 8, 8, 2, 4, 0, 2, 4, 6, 8, 6, 4, 2, 0, 10, 4, 10, 12, 14, 12, 10, 4, 10, 0, 4, 6, 8, 8, 8, 6, 4, 0, 0, 2, 4, 6, 6, 6, 4, 2, 0, 6, 4, 0, -4, 8, -4, 0, 4, 6,
    ],
    [
      4, 4, 2, 0, 0, 0, 2, 4, 4, 2, 2, 2, 0, -4, 0, 2, 2, 2, 2, 2, 2, 0, 0, 0, 2, 2, 2, 2, 4, 4, 4, 4, 4, 4, 4, 2, 2, 2, 4, 4, 6, 4, 4, 2, 2, 0, 2, 2, 4, 4, 4, 2, 2, 0, 4, 2, 4, 6, 6, 6, 4, 2, 4, 0, 2, 2, 4, 4, 4, 2, 2, 0, 0, 0, 2, 2, 2, 2, 2, 0, 0, 2, 2, 0, 0, 4, 0, 0, 2, 2,
    ]
  );

  fillPst(
    PAWN,
    [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 0, 13, 0, 16, 0, 13, 0, 9, 6, 0, 18, 0, 22, 0, 18, 0, 6, 25, 30, 42, 48, 50, 48, 42, 30, 25, 35, 42, 55, 62, 70, 62, 55, 42, 35, 40, 50, 60, 70, 80, 70, 60, 50, 40, 42, 55, 68, 78, 88, 78, 68, 55, 42, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ],
    [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12, 0, 16, 0, 20, 0, 16, 0, 12, 18, 0, 28, 0, 34, 0, 28, 0, 18, 40, 50, 65, 75, 80, 75, 65, 50, 40, 55, 70, 85, 95, 105, 95, 85, 70, 55, 65, 80, 95, 110, 120, 110, 95, 80, 65, 70, 85, 100, 115, 125, 115, 100, 85, 70, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ]
  );

  fillPst(
    KING,
    [
      0, 0, 0, 6, 12, 6, 0, 0, 0, 0, 0, 0, 2, 6, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ],
    [
      0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0, 0, 2, 12, 2, 0, 0, 0, 0, 0, 0, 4, 16, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ]
  );

  var zobrist = new Uint32Array(90 * 24);
  var zobristSide = 0;

  (function initZobrist() {
    var seed = 0x9e3779b9;
    function rnd() {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return (t ^ (t >>> 14)) >>> 0;
    }
    for (var i = 0; i < zobrist.length; i++) zobrist[i] = rnd();
    zobristSide = rnd();
  })();

  function sq(file, rank) {
    return rank * 9 + file;
  }

  function fileOf(s) {
    return s % 9;
  }

  function rankOf(s) {
    return (s / 9) | 0;
  }

  function inBoard(file, rank) {
    return file >= 0 && file <= 8 && rank >= 0 && rank <= 9;
  }

  function inPalace(file, rank, red) {
    if (file < 3 || file > 5) return false;
    return red ? rank >= 0 && rank <= 2 : rank >= 7 && rank <= 9;
  }

  function isRed(piece) {
    return (piece & RED) !== 0;
  }

  function isBlack(piece) {
    return (piece & BLACK) !== 0;
  }

  function sameColor(a, b) {
    return a && b && (a & COLOR_MASK) === (b & COLOR_MASK);
  }

  function pieceType(piece) {
    return piece & TYPE_MASK;
  }

  function flipSq(s) {
    return (9 - rankOf(s)) * 9 + fileOf(s);
  }

  function zobKey(piece, s) {
    return zobrist[s * 24 + piece];
  }

  function Position() {
    this.board = new Uint8Array(90);
    this.redToMove = true;
    this.redKing = 0;
    this.blackKing = 0;
    this.hash = 0;
    this.halfmove = 0;
    this.fullmove = 1;
    this.history = [];
    this.hashHistory = [];
  }

  Position.prototype.clone = function () {
    var p = new Position();
    p.board.set(this.board);
    p.redToMove = this.redToMove;
    p.redKing = this.redKing;
    p.blackKing = this.blackKing;
    p.hash = this.hash;
    p.halfmove = this.halfmove;
    p.fullmove = this.fullmove;
    p.history = this.history.slice();
    p.hashHistory = this.hashHistory.slice();
    return p;
  };

  Position.fromFen = function (fen) {
    var pos = new Position();
    pos.setFen(fen || START_FEN);
    return pos;
  };

  Position.prototype.setFen = function (fen) {
    var parts = fen.trim().split(/\s+/);
    var rows = parts[0].split("/");
    if (rows.length !== 10) throw new Error("非法 FEN：行数不正确");
    this.board.fill(0);
    this.hash = 0;
    this.redKing = -1;
    this.blackKing = -1;
    for (var r = 0; r < 10; r++) {
      var rank = 9 - r;
      var file = 0;
      var row = rows[r];
      for (var i = 0; i < row.length; i++) {
        var ch = row.charAt(i);
        if (ch >= "1" && ch <= "9") {
          file += ch.charCodeAt(0) - 48;
        } else {
          var piece = CHAR_PIECE[ch];
          if (!piece || !inBoard(file, rank)) throw new Error("非法 FEN");
          var s = sq(file, rank);
          this.board[s] = piece;
          this.hash ^= zobKey(piece, s);
          if (pieceType(piece) === KING) {
            if (isRed(piece)) this.redKing = s;
            else this.blackKing = s;
          }
          file++;
        }
      }
      if (file !== 9) throw new Error("非法 FEN：列数不正确");
    }
    this.redToMove = !parts[1] || parts[1] === "w" || parts[1] === "r";
    if (!this.redToMove) this.hash ^= zobristSide;
    this.halfmove = parts[2] ? parseInt(parts[2], 10) || 0 : 0;
    this.fullmove = parts[3] ? parseInt(parts[3], 10) || 1 : 1;
    this.history = [];
    this.hashHistory = [this.hash];
    if (this.redKing < 0 || this.blackKing < 0) throw new Error("非法 FEN：缺少将帅");
  };

  Position.prototype.toFen = function () {
    var rows = [];
    for (var r = 9; r >= 0; r--) {
      var empty = 0;
      var row = "";
      for (var f = 0; f < 9; f++) {
        var p = this.board[sq(f, r)];
        if (!p) empty++;
        else {
          if (empty) {
            row += empty;
            empty = 0;
          }
          row += PIECE_CHARS[p];
        }
      }
      if (empty) row += empty;
      rows.push(row);
    }
    return rows.join("/") + (this.redToMove ? " w" : " b");
  };

  Position.prototype.kingsFace = function () {
    var rf = fileOf(this.redKing);
    var bf = fileOf(this.blackKing);
    if (rf !== bf) return false;
    var r1 = rankOf(this.redKing);
    var r2 = rankOf(this.blackKing);
    var lo = Math.min(r1, r2) + 1;
    var hi = Math.max(r1, r2);
    for (var r = lo; r < hi; r++) {
      if (this.board[sq(rf, r)]) return false;
    }
    return true;
  };

  Position.prototype.squareAttacked = function (target, byRed) {
    var tf = fileOf(target);
    var tr = rankOf(target);
    var i, s, p, f, r, block, screens, df, dr;

    // 兵/卒
    if (byRed) {
      if (inBoard(tf, tr - 1)) {
        p = this.board[sq(tf, tr - 1)];
        if (p === (RED | PAWN)) return true;
      }
      if (tr >= 5) {
        if (inBoard(tf - 1, tr) && this.board[sq(tf - 1, tr)] === (RED | PAWN)) return true;
        if (inBoard(tf + 1, tr) && this.board[sq(tf + 1, tr)] === (RED | PAWN)) return true;
      }
    } else {
      if (inBoard(tf, tr + 1)) {
        p = this.board[sq(tf, tr + 1)];
        if (p === (BLACK | PAWN)) return true;
      }
      if (tr <= 4) {
        if (inBoard(tf - 1, tr) && this.board[sq(tf - 1, tr)] === (BLACK | PAWN)) return true;
        if (inBoard(tf + 1, tr) && this.board[sq(tf + 1, tr)] === (BLACK | PAWN)) return true;
      }
    }

    // 马
    for (i = 0; i < 8; i++) {
      df = HORSE_DELTAS[i][0];
      dr = HORSE_DELTAS[i][1];
      f = tf - df;
      r = tr - dr;
      if (!inBoard(f, r)) continue;
      block = sq(tf - HORSE_DELTAS[i][2], tr - HORSE_DELTAS[i][3]);
      if (this.board[block]) continue;
      p = this.board[sq(f, r)];
      if (p && pieceType(p) === HORSE && isRed(p) === byRed) return true;
    }

    // 车 / 帅（照面）/ 炮
    var dirs = KING_DELTAS;
    for (i = 0; i < 4; i++) {
      df = dirs[i][0];
      dr = dirs[i][1];
      screens = 0;
      f = tf + df;
      r = tr + dr;
      while (inBoard(f, r)) {
        s = sq(f, r);
        p = this.board[s];
        if (p) {
          if (screens === 0) {
            if (isRed(p) === byRed && (pieceType(p) === ROOK || pieceType(p) === KING)) return true;
          } else if (screens === 1) {
            if (isRed(p) === byRed && pieceType(p) === CANNON) return true;
            break;
          }
          screens++;
          if (screens > 1) break;
        }
        f += df;
        r += dr;
      }
    }
    return false;
  };

  Position.prototype.inCheck = function (red) {
    var king = red ? this.redKing : this.blackKing;
    return this.squareAttacked(king, !red) || this.kingsFace();
  };

  Position.prototype._addMove = function (list, from, to, capturesOnly) {
    var captured = this.board[to];
    if (capturesOnly && !captured) return;
    if (captured && pieceType(captured) === KING) return;
    list.push(from | (to << 8) | (captured << 16));
  };

  Position.prototype._genKing = function (list, from, red, capturesOnly) {
    var f = fileOf(from);
    var r = rankOf(from);
    for (var i = 0; i < 4; i++) {
      var nf = f + KING_DELTAS[i][0];
      var nr = r + KING_DELTAS[i][1];
      if (!inBoard(nf, nr) || !inPalace(nf, nr, red)) continue;
      var to = sq(nf, nr);
      if (sameColor(this.board[from], this.board[to])) continue;
      this._addMove(list, from, to, capturesOnly);
    }
  };

  Position.prototype._genAdvisor = function (list, from, red, capturesOnly) {
    var f = fileOf(from);
    var r = rankOf(from);
    for (var i = 0; i < 4; i++) {
      var nf = f + ADVISOR_DELTAS[i][0];
      var nr = r + ADVISOR_DELTAS[i][1];
      if (!inBoard(nf, nr) || !inPalace(nf, nr, red)) continue;
      var to = sq(nf, nr);
      if (sameColor(this.board[from], this.board[to])) continue;
      this._addMove(list, from, to, capturesOnly);
    }
  };

  Position.prototype._genElephant = function (list, from, red, capturesOnly) {
    var f = fileOf(from);
    var r = rankOf(from);
    for (var i = 0; i < 4; i++) {
      var nf = f + ELEPHANT_DELTAS[i][0];
      var nr = r + ELEPHANT_DELTAS[i][1];
      if (!inBoard(nf, nr)) continue;
      if (red ? nr > 4 : nr < 5) continue;
      var eye = sq(f + ELEPHANT_DELTAS[i][2], r + ELEPHANT_DELTAS[i][3]);
      if (this.board[eye]) continue;
      var to = sq(nf, nr);
      if (sameColor(this.board[from], this.board[to])) continue;
      this._addMove(list, from, to, capturesOnly);
    }
  };

  Position.prototype._genHorse = function (list, from, capturesOnly) {
    var f = fileOf(from);
    var r = rankOf(from);
    for (var i = 0; i < 8; i++) {
      var blockF = f + HORSE_DELTAS[i][2];
      var blockR = r + HORSE_DELTAS[i][3];
      if (!inBoard(blockF, blockR) || this.board[sq(blockF, blockR)]) continue;
      var nf = f + HORSE_DELTAS[i][0];
      var nr = r + HORSE_DELTAS[i][1];
      if (!inBoard(nf, nr)) continue;
      var to = sq(nf, nr);
      if (sameColor(this.board[from], this.board[to])) continue;
      this._addMove(list, from, to, capturesOnly);
    }
  };

  Position.prototype._genSlider = function (list, from, isCannon, capturesOnly) {
    var f = fileOf(from);
    var r = rankOf(from);
    for (var i = 0; i < 4; i++) {
      var df = KING_DELTAS[i][0];
      var dr = KING_DELTAS[i][1];
      var screens = 0;
      var nf = f + df;
      var nr = r + dr;
      while (inBoard(nf, nr)) {
        var to = sq(nf, nr);
        var p = this.board[to];
        if (!isCannon) {
          if (!p) {
            this._addMove(list, from, to, capturesOnly);
          } else {
            if (!sameColor(this.board[from], p)) this._addMove(list, from, to, capturesOnly);
            break;
          }
        } else if (screens === 0) {
          if (!p) this._addMove(list, from, to, capturesOnly);
          else screens = 1;
        } else {
          if (p) {
            if (!sameColor(this.board[from], p)) this._addMove(list, from, to, capturesOnly);
            break;
          }
        }
        nf += df;
        nr += dr;
      }
    }
  };

  Position.prototype._genPawn = function (list, from, red, capturesOnly) {
    var f = fileOf(from);
    var r = rankOf(from);
    var nr = red ? r + 1 : r - 1;
    if (inBoard(f, nr)) {
      var to = sq(f, nr);
      if (!sameColor(this.board[from], this.board[to])) this._addMove(list, from, to, capturesOnly);
    }
    var crossed = red ? r >= 5 : r <= 4;
    if (crossed) {
      if (inBoard(f - 1, r)) {
        to = sq(f - 1, r);
        if (!sameColor(this.board[from], this.board[to])) this._addMove(list, from, to, capturesOnly);
      }
      if (inBoard(f + 1, r)) {
        to = sq(f + 1, r);
        if (!sameColor(this.board[from], this.board[to])) this._addMove(list, from, to, capturesOnly);
      }
    }
  };

  Position.prototype.generatePseudo = function (capturesOnly) {
    var list = [];
    var red = this.redToMove;
    for (var s = 0; s < 90; s++) {
      var p = this.board[s];
      if (!p || isRed(p) !== red) continue;
      switch (pieceType(p)) {
        case KING:
          this._genKing(list, s, red, capturesOnly);
          break;
        case ADVISOR:
          this._genAdvisor(list, s, red, capturesOnly);
          break;
        case ELEPHANT:
          this._genElephant(list, s, red, capturesOnly);
          break;
        case HORSE:
          this._genHorse(list, s, capturesOnly);
          break;
        case ROOK:
          this._genSlider(list, s, false, capturesOnly);
          break;
        case CANNON:
          this._genSlider(list, s, true, capturesOnly);
          break;
        case PAWN:
          this._genPawn(list, s, red, capturesOnly);
          break;
      }
    }
    return list;
  };

  Position.prototype.make = function (move) {
    var from = move & 255;
    var to = (move >> 8) & 255;
    var captured = (move >> 16) & 255;
    var piece = this.board[from];
    this.history.push(move | (this.halfmove << 24));
    if (captured || pieceType(piece) === PAWN) this.halfmove = 0;
    else this.halfmove++;
    this.hash ^= zobKey(piece, from);
    this.board[from] = EMPTY;
    if (captured) this.hash ^= zobKey(captured, to);
    this.board[to] = piece;
    this.hash ^= zobKey(piece, to);
    if (pieceType(piece) === KING) {
      if (isRed(piece)) this.redKing = to;
      else this.blackKing = to;
    }
    this.redToMove = !this.redToMove;
    this.hash ^= zobristSide;
    if (this.redToMove) this.fullmove++;
    this.hashHistory.push(this.hash);
  };

  Position.prototype.unmake = function () {
    var packed = this.history.pop();
    this.hashHistory.pop();
    var move = packed & 0xffffff;
    this.halfmove = (packed >>> 24) & 255;
    var from = move & 255;
    var to = (move >> 8) & 255;
    var captured = (move >> 16) & 255;
    var piece = this.board[to];
    this.hash ^= zobristSide;
    this.hash ^= zobKey(piece, to);
    this.board[to] = captured;
    if (captured) this.hash ^= zobKey(captured, to);
    this.board[from] = piece;
    this.hash ^= zobKey(piece, from);
    if (pieceType(piece) === KING) {
      if (isRed(piece)) this.redKing = from;
      else this.blackKing = from;
    }
    this.redToMove = !this.redToMove;
    if (!this.redToMove) this.fullmove--;
  };

  Position.prototype.isLegalMove = function (move) {
    var red = this.redToMove;
    this.make(move);
    var ok = !this.inCheck(red);
    this.unmake();
    return ok;
  };

  Position.prototype.legalMoves = function () {
    var raw = this.generatePseudo(false);
    var legal = [];
    for (var i = 0; i < raw.length; i++) {
      if (this.isLegalMove(raw[i])) legal.push(raw[i]);
    }
    return legal;
  };

  Position.prototype.legalCaptures = function () {
    var raw = this.generatePseudo(true);
    var legal = [];
    for (var i = 0; i < raw.length; i++) {
      if (this.isLegalMove(raw[i])) legal.push(raw[i]);
    }
    return legal;
  };

  Position.prototype.isCheckmate = function () {
    return this.inCheck(this.redToMove) && this.legalMoves().length === 0;
  };

  Position.prototype.isStalemate = function () {
    return !this.inCheck(this.redToMove) && this.legalMoves().length === 0;
  };

  Position.prototype.repetitionCount = function () {
    var h = this.hash;
    var n = 0;
    for (var i = 0; i < this.hashHistory.length; i++) {
      if (this.hashHistory[i] === h) n++;
    }
    return n;
  };

  Position.prototype.isDraw = function () {
    if (this.halfmove >= 120) return true;
    return this.repetitionCount() >= 3;
  };

  Position.prototype.gameResult = function () {
    if (this.isCheckmate() || this.isStalemate()) {
      return this.redToMove ? "black" : "red";
    }
    if (this.isDraw()) return "draw";
    return null;
  };

  Position.prototype.moveFromSquares = function (from, to) {
    var moves = this.legalMoves();
    for (var i = 0; i < moves.length; i++) {
      if ((moves[i] & 255) === from && ((moves[i] >> 8) & 255) === to) return moves[i];
    }
    return 0;
  };

  function moveFrom(move) {
    return move & 255;
  }
  function moveTo(move) {
    return (move >> 8) & 255;
  }
  function moveCaptured(move) {
    return (move >> 16) & 255;
  }

  function toIccs(move) {
    var from = moveFrom(move);
    var to = moveTo(move);
    return (
      String.fromCharCode(97 + fileOf(from)) +
      rankOf(from) +
      String.fromCharCode(97 + fileOf(to)) +
      rankOf(to)
    );
  }

  function parseIccs(iccs) {
    if (!iccs || iccs.length < 4) return null;
    var ff = iccs.charCodeAt(0) - 97;
    var fr = iccs.charCodeAt(1) - 48;
    var tf = iccs.charCodeAt(2) - 97;
    var tr = iccs.charCodeAt(3) - 48;
    if (!inBoard(ff, fr) || !inBoard(tf, tr)) return null;
    return { from: sq(ff, fr), to: sq(tf, tr) };
  }

  function fileLabel(file, redSide) {
    return redSide ? 9 - file : file + 1;
  }

  function chineseNum(n) {
    return FILE_NUM_CN[n] || String(n);
  }

  function moveToChinese(pos, move) {
    var from = moveFrom(move);
    var to = moveTo(move);
    var piece = pos.board[from];
    var type = pieceType(piece);
    var red = isRed(piece);
    var names = red ? PIECE_NAME_RED : PIECE_NAME_BLACK;
    var ff = fileOf(from);
    var fr = rankOf(from);
    var tf = fileOf(to);
    var tr = rankOf(to);
    var same = [];
    for (var s = 0; s < 90; s++) {
      var p = pos.board[s];
      if (p === piece && fileOf(s) === ff) same.push(s);
    }
    var prefix = names[type];
    if (same.length >= 2 && (type === ROOK || type === CANNON || type === HORSE || type === PAWN)) {
      same.sort(function (a, b) {
        return red ? rankOf(b) - rankOf(a) : rankOf(a) - rankOf(b);
      });
      if (same.length === 2) {
        prefix = (same[0] === from ? "前" : "后") + names[type];
      } else {
        var idx = same.indexOf(from);
        prefix = (idx === 0 ? "前" : idx === same.length - 1 ? "后" : "中") + names[type];
      }
    } else {
      var fileNo = fileLabel(ff, red);
      prefix += red ? chineseNum(fileNo) : String(fileNo);
    }

    var verb;
    var dest;
    var forward = red ? tr > fr : tr < fr;
    var back = red ? tr < fr : tr > fr;
    if (tr === fr) {
      verb = "平";
      dest = red ? chineseNum(fileLabel(tf, true)) : String(fileLabel(tf, false));
    } else if (type === HORSE || type === ADVISOR || type === ELEPHANT) {
      verb = forward ? "进" : "退";
      dest = red ? chineseNum(fileLabel(tf, true)) : String(fileLabel(tf, false));
    } else {
      verb = forward ? "进" : back ? "退" : "平";
      dest = red ? chineseNum(Math.abs(tr - fr)) : String(Math.abs(tr - fr));
    }
    return prefix + verb + dest;
  }

  function materialPhase(pos) {
    var mat = 0;
    for (var s = 0; s < 90; s++) {
      var p = pos.board[s];
      if (!p) continue;
      var t = pieceType(p);
      if (t === KING) continue;
      mat += MG_VALUE[t];
    }
    var start = 2 * (MG_VALUE[ADVISOR] * 2 + MG_VALUE[ELEPHANT] * 2 + MG_VALUE[HORSE] * 2 + MG_VALUE[ROOK] * 2 + MG_VALUE[CANNON] * 2 + MG_VALUE[PAWN] * 5);
    var end = 800;
    var ph = (mat - end) / (start - end);
    if (ph < 0) ph = 0;
    if (ph > 1) ph = 1;
    return ph;
  }

  function piecePst(type, s, red, phase) {
    var idx = red ? s : flipSq(s);
    var mg = (PST_MG[type] && PST_MG[type][idx]) || 0;
    var eg = (PST_EG[type] && PST_EG[type][idx]) || 0;
    return ((mg * phase + eg * (1 - phase)) * 2) | 0;
  }

  function evaluate(pos) {
    var phase = materialPhase(pos);
    var mg = 0;
    var eg = 0;
    var redAdvisors = 0;
    var blackAdvisors = 0;
    var redElephants = 0;
    var blackElephants = 0;
    var redHorses = 0;
    var blackHorses = 0;
    var redRooks = 0;
    var blackRooks = 0;
    var redCannons = 0;
    var blackCannons = 0;

    for (var s = 0; s < 90; s++) {
      var p = pos.board[s];
      if (!p) continue;
      var t = pieceType(p);
      var red = isRed(p);
      var sign = red ? 1 : -1;
      mg += sign * MG_VALUE[t];
      eg += sign * EG_VALUE[t];
      var idx = red ? s : flipSq(s);
      mg += sign * ((PST_MG[t] && PST_MG[t][idx]) || 0);
      eg += sign * ((PST_EG[t] && PST_EG[t][idx]) || 0);
      if (t === ADVISOR) {
        if (red) redAdvisors++;
        else blackAdvisors++;
      } else if (t === ELEPHANT) {
        if (red) redElephants++;
        else blackElephants++;
      } else if (t === HORSE) {
        if (red) redHorses++;
        else blackHorses++;
      } else if (t === ROOK) {
        if (red) redRooks++;
        else blackRooks++;
      } else if (t === CANNON) {
        if (red) redCannons++;
        else blackCannons++;
      }
    }

    // 双仕双相、车马炮配合
    if (redAdvisors === 2) mg += 18;
    if (blackAdvisors === 2) mg -= 18;
    if (redElephants === 2) mg += 16;
    if (blackElephants === 2) mg -= 16;
    if (redHorses >= 2) {
      mg += 12;
      eg += 18;
    }
    if (blackHorses >= 2) {
      mg -= 12;
      eg -= 18;
    }
    if (redRooks >= 2) {
      mg += 20;
      eg += 28;
    }
    if (blackRooks >= 2) {
      mg -= 20;
      eg -= 28;
    }

    // 当头炮 / 沉底炮
    function cannonOnKingFile(cannonSq, kingSq, redCannon) {
      if (fileOf(cannonSq) !== fileOf(kingSq)) return 0;
      var lo = Math.min(rankOf(cannonSq), rankOf(kingSq));
      var hi = Math.max(rankOf(cannonSq), rankOf(kingSq));
      var screens = 0;
      var f = fileOf(cannonSq);
      for (var r = lo + 1; r < hi; r++) {
        if (pos.board[sq(f, r)]) screens++;
      }
      if (screens === 1) return 28;
      if (screens === 0) return 8;
      return 0;
    }

    for (s = 0; s < 90; s++) {
      p = pos.board[s];
      if (!p || pieceType(p) !== CANNON) continue;
      if (isRed(p)) mg += cannonOnKingFile(s, pos.blackKing, true);
      else mg -= cannonOnKingFile(s, pos.redKing, false);
    }

    // 将门开放惩罚
    if (redAdvisors === 0) {
      mg -= 22;
      eg -= 10;
    }
    if (blackAdvisors === 0) {
      mg += 22;
      eg += 10;
    }

    var score = (mg * phase + eg * (1 - phase)) | 0;
    if (pos.inCheck(pos.redToMove)) score += pos.redToMove ? -12 : 12;
    return pos.redToMove ? score : -score;
  }

  // 开局库：从起始局面走出的常见分支（ICCS）
  var BOOK_LINES = [
    ["h2e2", "h9g7", "h0g2", "i9h9", "i0h0", "b9c7"],
    ["h2e2", "h9g7", "h0g2", "g6g5", "b0c2", "b9c7"],
    ["h2e2", "b9c7", "h0g2", "a9a8", "i0h0", "h9g7"],
    ["h2e2", "h7e7", "h0g2", "h9g7", "b0c2", "i9h9"],
    ["h2e2", "h7e7", "b2e2", "b7e7", "h0g2", "h9g7"],
    ["b2e2", "b9c7", "b0c2", "a9a8", "a0a1", "h9g7"],
    ["b2e2", "h9g7", "h0g2", "i9h9", "i0h0", "b9c7"],
    ["c3c4", "h9g7", "b0c2", "i9h9", "h0g2", "b9c7"],
    ["c3c4", "b7b5", "b2c2", "h7h5", "h0g2", "h9g7"],
    ["g3g4", "c9e7", "h0g2", "h9g7", "b0c2", "b9c7"],
    ["h0g2", "h9g7", "g2f4", "i9h9", "b0c2", "b9c7"],
    ["b0c2", "b9c7", "c2d4", "a9a8", "h0g2", "h9g7"],
    ["b2c2", "h9g7", "h0g2", "i9h9", "i0h0", "b9c7"],
    ["h2h6", "b9c7", "h0g2", "a9b9", "b0c2", "h9g7"],
    ["a3a4", "h9g7", "h0g2", "i9h9", "b0c2", "b9c7"],
  ];

  var bookMap = null;

  function buildBook() {
    if (bookMap) return bookMap;
    bookMap = {};
    for (var i = 0; i < BOOK_LINES.length; i++) {
      var pos = Position.fromFen(START_FEN);
      var line = BOOK_LINES[i];
      for (var j = 0; j < line.length; j++) {
        var key = pos.toFen();
        if (!bookMap[key]) bookMap[key] = [];
        var parsed = parseIccs(line[j]);
        if (!parsed) break;
        var mv = pos.moveFromSquares(parsed.from, parsed.to);
        if (!mv) break;
        if (bookMap[key].indexOf(mv) === -1) bookMap[key].push(mv);
        pos.make(mv);
      }
    }
    return bookMap;
  }

  function bookMove(pos) {
    var book = buildBook();
    var list = book[pos.toFen()];
    if (!list || !list.length) return 0;
    return list[(Math.random() * list.length) | 0];
  }

  var TT_EXACT = 0;
  var TT_ALPHA = 1;
  var TT_BETA = 2;

  function Searcher() {
    this.tt = new Map();
    this.killers = [];
    this.history = new Int32Array(90 * 90);
    this.nodes = 0;
    this.stopTime = 0;
    this.stopped = false;
    this.bestRoot = 0;
    this.bestScore = 0;
    this.pv = [];
  }

  Searcher.prototype.ttGet = function (hash) {
    return this.tt.get(hash);
  };

  Searcher.prototype.ttPut = function (hash, depth, score, flag, move) {
    if (this.tt.size > 400000) this.tt.clear();
    this.tt.set(hash, { depth: depth, score: score, flag: flag, move: move });
  };

  Searcher.prototype.shouldStop = function () {
    if (this.nodes & 2047) return this.stopped;
    if (Date.now() >= this.stopTime) this.stopped = true;
    return this.stopped;
  };

  Searcher.prototype.scoreMove = function (pos, move, ply, hashMove) {
    if (move === hashMove) return 1000000;
    var captured = moveCaptured(move);
    if (captured) {
      return 80000 + pieceType(captured) * 16 - pieceType(pos.board[moveFrom(move)]);
    }
    var k = this.killers[ply];
    if (k) {
      if (move === k[0]) return 70000;
      if (move === k[1]) return 69000;
    }
    return this.history[moveFrom(move) * 90 + moveTo(move)] | 0;
  };

  Searcher.prototype.sortMoves = function (pos, moves, ply, hashMove) {
    var scores = new Int32Array(moves.length);
    var i;
    for (i = 0; i < moves.length; i++) scores[i] = this.scoreMove(pos, moves[i], ply, hashMove);
    for (i = 1; i < moves.length; i++) {
      var m = moves[i];
      var s = scores[i];
      var j = i - 1;
      while (j >= 0 && scores[j] < s) {
        moves[j + 1] = moves[j];
        scores[j + 1] = scores[j];
        j--;
      }
      moves[j + 1] = m;
      scores[j + 1] = s;
    }
  };

  Searcher.prototype.quiesce = function (pos, alpha, beta, qply) {
    this.nodes++;
    if (this.shouldStop()) return evaluate(pos);
    if (pos.kingsFace()) return -MATE_SCORE + qply;
    var stand = evaluate(pos);
    if (qply > 10) return stand;
    if (stand >= beta) return beta;
    if (stand > alpha) alpha = stand;

    var inCheck = pos.inCheck(pos.redToMove);
    var moves = inCheck ? pos.legalMoves() : pos.legalCaptures();
    this.sortMoves(pos, moves, 64 + qply, 0);
    if (inCheck && !moves.length) return -MATE_SCORE + qply;

    for (var i = 0; i < moves.length; i++) {
      var move = moves[i];
      if (!inCheck) {
        var see = MG_VALUE[pieceType(moveCaptured(move))] - MG_VALUE[pieceType(pos.board[moveFrom(move)])];
        if (see < -40 && stand + see + 60 < alpha) continue;
      }
      pos.make(move);
      var score = -this.quiesce(pos, -beta, -alpha, qply + 1);
      pos.unmake();
      if (this.stopped) return alpha;
      if (score >= beta) return beta;
      if (score > alpha) alpha = score;
    }
    return alpha;
  };

  Searcher.prototype.alphabeta = function (pos, depth, ply, alpha, beta, allowNull) {
    this.nodes++;
    if (this.shouldStop()) return evaluate(pos);
    if (pos.repetitionCount() >= 3) return 0;
    if (pos.halfmove >= 120) return 0;
    if (pos.kingsFace()) return -MATE_SCORE + ply;

    var inCheck = pos.inCheck(pos.redToMove);
    if (inCheck) depth++;
    if (depth <= 0) return this.quiesce(pos, alpha, beta, 0);

    var ttHit = this.ttGet(pos.hash);
    var hashMove = 0;
    if (ttHit && ttHit.depth >= depth) {
      hashMove = ttHit.move;
      if (ttHit.flag === TT_EXACT) return ttHit.score;
      if (ttHit.flag === TT_ALPHA && ttHit.score <= alpha) return alpha;
      if (ttHit.flag === TT_BETA && ttHit.score >= beta) return beta;
    } else if (ttHit) {
      hashMove = ttHit.move;
    }

    if (allowNull && !inCheck && depth >= 3 && materialPhase(pos) > 0.18) {
      pos.redToMove = !pos.redToMove;
      pos.hash ^= zobristSide;
      var r = depth > 6 ? 3 : 2;
      var ns = -this.alphabeta(pos, depth - 1 - r, ply + 1, -beta, -beta + 1, false);
      pos.redToMove = !pos.redToMove;
      pos.hash ^= zobristSide;
      if (this.stopped) return evaluate(pos);
      if (ns >= beta) return beta;
    }

    var moves = pos.legalMoves();
    if (!moves.length) return -MATE_SCORE + ply;
    this.sortMoves(pos, moves, ply, hashMove);

    var best = -INF;
    var bestMove = moves[0];
    var flag = TT_ALPHA;
    for (var i = 0; i < moves.length; i++) {
      var move = moves[i];
      var reduction = 0;
      if (i > 3 && depth >= 3 && !moveCaptured(move) && !inCheck) {
        reduction = 1;
        if (i > 8 && depth >= 5) reduction = 2;
      }
      pos.make(move);
      var score;
      if (i === 0) {
        score = -this.alphabeta(pos, depth - 1, ply + 1, -beta, -alpha, true);
      } else {
        score = -this.alphabeta(pos, depth - 1 - reduction, ply + 1, -alpha - 1, -alpha, true);
        if (score > alpha && reduction) {
          score = -this.alphabeta(pos, depth - 1, ply + 1, -alpha - 1, -alpha, true);
        }
        if (score > alpha && score < beta) {
          score = -this.alphabeta(pos, depth - 1, ply + 1, -beta, -alpha, true);
        }
      }
      pos.unmake();
      if (this.stopped) break;
      if (score > best) {
        best = score;
        bestMove = move;
        if (ply === 0) {
          this.bestRoot = move;
          this.bestScore = score;
        }
      }
      if (score > alpha) {
        alpha = score;
        flag = TT_EXACT;
        if (!moveCaptured(move)) {
          this.history[moveFrom(move) * 90 + moveTo(move)] += depth * depth;
        }
      }
      if (alpha >= beta) {
        flag = TT_BETA;
        if (!moveCaptured(move)) {
          var k = this.killers[ply] || (this.killers[ply] = [0, 0]);
          if (k[0] !== move) {
            k[1] = k[0];
            k[0] = move;
          }
        }
        break;
      }
    }
    this.ttPut(pos.hash, depth, best, flag, bestMove);
    return best;
  };

  Searcher.prototype.search = function (pos, level) {
    this.tt.clear();
    this.killers = [];
    this.history.fill(0);
    this.nodes = 0;
    this.stopped = false;
    this.stopTime = Date.now() + (level.time || 400);
    this.bestRoot = 0;
    this.bestScore = 0;

    if (level.book) {
      var bm = bookMove(pos);
      if (bm && pos.fullmove <= 8) {
        this.bestRoot = bm;
        this.bestScore = 15;
        return { move: bm, score: 15, nodes: 1, depth: 0, book: true };
      }
    }

    var moves = pos.legalMoves();
    if (!moves.length) return { move: 0, score: -MATE_SCORE, nodes: 0, depth: 0 };
    this.bestRoot = moves[0];

    var maxDepth = level.depth || 3;
    var lastScore = 0;
    for (var depth = 1; depth <= maxDepth; depth++) {
      var window = depth >= 4 ? 28 : INF;
      var alpha = lastScore - window;
      var beta = lastScore + window;
      var score = this.alphabeta(pos, depth, 0, alpha, beta, true);
      if (!this.stopped && (score <= alpha || score >= beta)) {
        score = this.alphabeta(pos, depth, 0, -INF, INF, true);
      }
      if (this.stopped && depth > 1) break;
      lastScore = score;
      this.bestScore = score;
      if (Math.abs(score) > MATE_SCORE - 100) break;
      if (Date.now() >= this.stopTime - 20) break;
    }

    var chosen = this.bestRoot;
    if (level.random && moves.length > 1) {
      var scored = [];
      for (var i = 0; i < moves.length; i++) {
        pos.make(moves[i]);
        var sc = -evaluate(pos);
        pos.unmake();
        scored.push({ m: moves[i], s: sc });
      }
      scored.sort(function (a, b) {
        return b.s - a.s;
      });
      var roll = Math.random() * 100;
      if (roll < level.random) {
        var span = Math.max(1, Math.min(scored.length, level.random > 50 ? 6 : 3));
        chosen = scored[(Math.random() * span) | 0].m;
      } else if (level.skill < 100 && Math.random() * 100 > level.skill) {
        chosen = scored[Math.min(1, scored.length - 1)].m;
      } else {
        chosen = this.bestRoot || scored[0].m;
      }
    }

    if (!chosen) chosen = moves[0];
    return {
      move: chosen,
      score: this.bestScore,
      nodes: this.nodes,
      depth: maxDepth,
      book: false,
    };
  };

  function searchBestMove(pos, level) {
    var searcher = new Searcher();
    return searcher.search(pos, level || LEVELS[2]);
  }

  function perft(pos, depth) {
    if (depth === 0) return 1;
    var moves = pos.legalMoves();
    if (depth === 1) return moves.length;
    var n = 0;
    for (var i = 0; i < moves.length; i++) {
      pos.make(moves[i]);
      n += perft(pos, depth - 1);
      pos.unmake();
    }
    return n;
  }

  function decodeMove(move) {
    return {
      from: moveFrom(move),
      to: moveTo(move),
      captured: moveCaptured(move),
      iccs: toIccs(move),
    };
  }

  function pieceChar(piece) {
    return PIECE_CHARS[piece] || "";
  }

  function displayName(piece) {
    if (!piece) return "";
    return (isRed(piece) ? PIECE_NAME_RED : PIECE_NAME_BLACK)[pieceType(piece)];
  }

  return {
    EMPTY: EMPTY,
    KING: KING,
    ADVISOR: ADVISOR,
    ELEPHANT: ELEPHANT,
    HORSE: HORSE,
    ROOK: ROOK,
    CANNON: CANNON,
    PAWN: PAWN,
    RED: RED,
    BLACK: BLACK,
    START_FEN: START_FEN,
    LEVELS: LEVELS,
    MATE_SCORE: MATE_SCORE,
    Position: Position,
    evaluate: evaluate,
    searchBestMove: searchBestMove,
    Searcher: Searcher,
    perft: perft,
    toIccs: toIccs,
    parseIccs: parseIccs,
    moveToChinese: moveToChinese,
    moveFrom: moveFrom,
    moveTo: moveTo,
    moveCaptured: moveCaptured,
    decodeMove: decodeMove,
    pieceType: pieceType,
    isRed: isRed,
    isBlack: isBlack,
    pieceChar: pieceChar,
    displayName: displayName,
    sq: sq,
    fileOf: fileOf,
    rankOf: rankOf,
    buildBook: buildBook,
  };
});
