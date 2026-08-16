#!/usr/bin/env node
"use strict";

var path = require("path");
var X = require(path.join(__dirname, "..", "js", "xiangqi-engine.js"));

var passed = 0;
var failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed++;
    console.log("  OK  " + msg);
  } else {
    failed++;
    console.error("  FAIL  " + msg);
  }
}

function assertEqual(a, b, msg) {
  assert(a === b, msg + " (got " + a + ", expected " + b + ")");
}

console.log("中国象棋引擎测试");

console.log("\n[起始局面]");
var start = X.Position.fromFen(X.START_FEN);
assertEqual(X.perft(start, 1), 44, "起始着法数为 44");
assertEqual(start.legalMoves().length, 44, "legalMoves 与 perft(1) 一致");
assert(!start.inCheck(true), "红方开局未将军");
assert(!start.inCheck(false), "黑方开局未将军");
assert(!start.kingsFace(), "开局将帅未照面");
assertEqual(start.gameResult(), null, "开局未结束");

var perft2 = X.perft(start, 2);
assertEqual(perft2, 1920, "perft(2) 为 1920");
assertEqual(X.perft(start, 3), 79666, "perft(3) 为 79666");
var restored = start.toFen();
assertEqual(restored, X.START_FEN, "perft 后 FEN 还原");

console.log("\n[棋子走法]");
var horseBlock = X.Position.fromFen("3k5/9/9/9/9/9/9/9/1P7/1N2K4 w");
var hMoves = horseBlock.legalMoves().filter(function (m) {
  return X.moveFrom(m) === X.sq(1, 0);
});
var hIccs = hMoves.map(X.toIccs).sort().join(",");
assert(hIccs.indexOf("b0a2") < 0, "蹩马腿不可跳到 a2");
assert(hIccs.indexOf("b0c2") < 0, "蹩马腿不可跳到 c2");
assert(hIccs.indexOf("b0d1") >= 0, "侧面不蹩腿时可跳到 d1");

var elephant = X.Position.fromFen("3k5/9/9/9/4B4/9/9/9/9/4K4 w");
var eMoves = elephant.legalMoves().filter(function (m) {
  return X.pieceType(elephant.board[X.moveFrom(m)]) === X.ELEPHANT;
});
assert(
  eMoves.every(function (m) { return X.rankOf(X.moveTo(m)) <= 4; }),
  "相不过河"
);

var palace = X.Position.fromFen("4k4/9/9/9/9/9/9/9/9/3K5 w");
var kMoves = palace.legalMoves();
assert(
  kMoves.every(function (m) {
    var t = X.moveTo(m);
    var f = X.fileOf(t);
    var r = X.rankOf(t);
    return f >= 3 && f <= 5 && r <= 2;
  }),
  "帅不出九宫"
);

var cannon = X.Position.fromFen("3k5/9/9/4n4/4p4/9/9/4C4/9/4K4 w");
var cCap = cannon.legalMoves().some(function (m) {
  return X.toIccs(m) === "e2e6";
});
assert(cCap, "炮隔子打马 e2e6");
var cBad = cannon.legalMoves().some(function (m) {
  return X.toIccs(m) === "e2e9";
});
assert(!cBad, "炮不能隔两子打将");

var pawn = X.Position.fromFen("4k4/9/9/9/9/4P4/9/9/9/4K4 w");
var pMoves = pawn.legalMoves().filter(function (m) {
  return X.moveFrom(m) === X.sq(4, 4);
}).map(X.toIccs).sort();
assertEqual(pMoves.join(","), "e4e5", "未过河兵只能向前");

var riverPawn = X.Position.fromFen("3k5/9/9/9/4P4/9/9/9/9/4K4 w");
var rp = riverPawn.legalMoves().filter(function (m) {
  return X.moveFrom(m) === X.sq(4, 5);
}).map(X.toIccs).sort();
assert(rp.indexOf("e5d5") >= 0 && rp.indexOf("e5f5") >= 0 && rp.indexOf("e5e6") >= 0, "过河兵可横走");

console.log("\n[照面与胜负]");
var face = X.Position.fromFen("4k4/9/9/9/9/9/9/9/9/3K5 w");
var faceMove = face.moveFromSquares(X.sq(3, 0), X.sq(4, 0));
assert(faceMove === 0, "不能主动造成将帅照面");

var mate = X.Position.fromFen("4k4/R8/9/9/9/9/9/9/9/3K4R w");
var rookMate = mate.moveFromSquares(X.sq(8, 0), X.sq(8, 9));
assert(rookMate > 0, "存在沉底车杀着 i0i9");
mate.make(rookMate);
assert(mate.isCheckmate(), "沉底车成杀");

var stale = X.Position.fromFen("4k4/R2P1P3/9/9/9/9/9/9/9/3K5 b");
assertEqual(stale.legalMoves().length, 0, "困毙无棋可走");
assert(stale.isStalemate(), "困毙成立");
assertEqual(stale.gameResult(), "red", "困毙判负");

console.log("\n[记谱]");
var notationPos = X.Position.fromFen(X.START_FEN);
var cannonCenter = notationPos.moveFromSquares(X.sq(7, 2), X.sq(4, 2));
assertEqual(X.moveToChinese(notationPos, cannonCenter), "炮二平五", "中炮记谱");
var horse = notationPos.moveFromSquares(X.sq(7, 0), X.sq(6, 2));
assertEqual(X.moveToChinese(notationPos, horse), "马二进三", "马二进三记谱");

console.log("\n[AI]");
var aiPos = X.Position.fromFen("4k4/R8/9/9/9/9/9/9/9/3K4R w");
var ai = X.searchBestMove(aiPos, { depth: 3, time: 400, skill: 100, random: 0, book: false });
assert(ai.move > 0, "AI 返回着法");
assert(aiPos.isLegalMove(ai.move), "AI 着法合法");
assertEqual(X.toIccs(ai.move), "i0i9", "一步杀 AI 应走沉底车");
aiPos.make(ai.move);
assertEqual(aiPos.gameResult(), "red", "一步杀后红胜");

var bookPos = X.Position.fromFen(X.START_FEN);
var book = X.searchBestMove(bookPos, X.LEVELS[5]);
assert(book.move > 0, "大师级开局能走出着法");
assert(bookPos.isLegalMove(book.move), "开局着法合法");

var evalStart = X.evaluate(start);
assert(Math.abs(evalStart) < 80, "开局评估接近均衡: " + evalStart);

console.log("\n结果: " + passed + " 通过, " + failed + " 失败");
process.exit(failed ? 1 : 0);
