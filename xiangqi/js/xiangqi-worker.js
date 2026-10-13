/* 象棋 AI Worker */
/* global Xiangqi */
importScripts("./xiangqi-engine.js");

self.onmessage = function (e) {
  var data = e.data || {};
  try {
    var pos = Xiangqi.Position.fromFen(data.fen);
    if (data.hashHistory && data.hashHistory.length) {
      pos.hashHistory = data.hashHistory.slice();
    }
    if (typeof data.halfmove === "number") pos.halfmove = data.halfmove;
    if (typeof data.fullmove === "number") pos.fullmove = data.fullmove;
    var level = Xiangqi.LEVELS[data.level - 1] || Xiangqi.LEVELS[2];
    var result = Xiangqi.searchBestMove(pos, level);
    self.postMessage({
      ok: true,
      requestId: data.requestId,
      move: result.move,
      iccs: result.move ? Xiangqi.toIccs(result.move) : "",
      score: result.score,
      nodes: result.nodes,
      depth: result.depth,
      book: !!result.book,
    });
  } catch (err) {
    self.postMessage({
      ok: false,
      requestId: data.requestId,
      error: String(err && err.message ? err.message : err),
    });
  }
};
