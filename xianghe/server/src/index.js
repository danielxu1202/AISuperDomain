import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { seed } from "./seed.js";
import { MATERIALS, MATERIAL_COUNT } from "./data/materials.js";
import { CLASSICS } from "./data/classics.js";
import { SOLAR_TERMS } from "./data/solarTerms.js";
import { DIY_QA, PHOTO_HINTS } from "./data/diyKnowledge.js";
import { searchMaterials, searchDiy, knowledgeContext } from "./services/retrieve.js";
import { llmGenerate, llmChat } from "./services/llm.js";
import { localGenerate } from "./services/formulaEngine.js";
import { validateText } from "./services/validate.js";
import { DISCLAIMER } from "./services/safety.js";
import { db, getUser, bumpGenerate, setVip } from "./db.js";
import { randomUUID } from "node:crypto";

seed();

const app = express();
const PORT = Number(process.env.PORT || 8787);
app.use(cors({ origin: process.env.CLIENT_ORIGIN || true }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    name: "香乘新笺",
    materials: MATERIAL_COUNT,
    classics: CLASSICS.length,
    solarTerms: SOLAR_TERMS.length,
    llmConfigured: Boolean(process.env.OPENAI_API_KEY),
    disclaimer: DISCLAIMER,
  });
});

app.get("/api/me", (req, res) => {
  const user = getUser(req.query.userId || "demo-user");
  res.json({ ...user, vip: Boolean(user.vip), freeLimit: 3 });
});

app.post("/api/me/vip", (req, res) => {
  const user = setVip(req.body.userId || "demo-user", req.body.vip !== false);
  res.json({ ...user, vip: Boolean(user.vip) });
});

app.get("/api/materials", (req, res) => {
  const q = req.query.q;
  const vip = getUser(req.query.userId || "demo-user").vip;
  let list = q ? searchMaterials(q, 40).map((x) => x.doc) : MATERIALS;
  if (!vip) {
    list = list.filter((m) => m.risk !== "forbidden").map((m) => ({
      ...m,
      encyclopedia: m.encyclopedia,
      source: m.source?.includes("《") ? "古籍（VIP 可看完整书目对照）" : m.source,
    }));
  }
  res.json({ total: MATERIAL_COUNT, list, vip: Boolean(vip) });
});

app.get("/api/materials/:name", (req, res) => {
  const m = MATERIALS.find((x) => x.name === req.params.name || x.aliases.includes(req.params.name));
  if (!m) return res.status(404).json({ error: "未找到香材" });
  res.json(m);
});

app.get("/api/classics", (_req, res) => res.json(CLASSICS));
app.get("/api/solar-terms", (_req, res) => res.json(SOLAR_TERMS));

app.post("/api/generate", async (req, res) => {
  const userId = req.body.userId || "demo-user";
  const user = getUser(userId);
  if (!user.vip && user.daily_count >= 3) {
    return res.status(402).json({
      error: "免费额度用尽",
      message: "今日免费生成已达 3 次。开通 VIP 可解锁完整古籍库、高级定制与批量导出。",
    });
  }
  const result = await llmGenerate({ ...req.body, vip: Boolean(user.vip) });
  bumpGenerate(userId);
  const id = randomUUID();
  db.prepare("INSERT INTO formulas (id, title, kind, payload) VALUES (?, ?, ?, ?)").run(
    id,
    result.formula.title,
    "generate",
    JSON.stringify(result)
  );
  res.json({ id, ...result, user: getUser(userId) });
});

app.post("/api/generate/adjust", async (req, res) => {
  const { formulaId, rating, note, userId } = req.body;
  const row = db.prepare("SELECT payload FROM formulas WHERE id = ?").get(formulaId);
  if (!row) return res.status(404).json({ error: "香方不存在" });
  const prev = JSON.parse(row.payload);
  const mild = rating === "太浓";
  const stronger = rating === "太淡";
  const nextInput = {
    ...prev.intent,
    query: `${prev.intent?.text || ""} ${note || ""} ${rating || ""}`,
    mild: mild || prev.intent?.mild,
    vip: Boolean(getUser(userId || "demo-user").vip),
  };
  const result = localGenerate(nextInput);
  if (stronger) {
    for (const role of ["jun", "chen", "zuo", "shi"]) {
      result.formula[role] = result.formula[role].map((i) => ({
        ...i,
        grams: Math.round(i.grams * 1.15 * 10) / 10,
      }));
    }
    result.scent.prose += " 已按「太淡」整体上调约 15%，仍保持安全上限。";
  }
  if (mild) result.scent.prose += " 已按「太浓」继续减量。";
  const id = randomUUID();
  db.prepare("INSERT INTO formulas (id, title, kind, payload) VALUES (?, ?, ?, ?)").run(
    id,
    result.formula.title + " · 复调",
    "adjust",
    JSON.stringify(result)
  );
  db.prepare("INSERT INTO feedback (id, formula_id, rating, note) VALUES (?, ?, ?, ?)").run(
    randomUUID(),
    formulaId,
    rating || "",
    note || ""
  );
  res.json({ id, ...result, basedOn: formulaId });
});

app.post("/api/validate", (req, res) => {
  const user = getUser(req.body.userId || "demo-user");
  const result = validateText(req.body.text || "", { vip: Boolean(user.vip), mild: req.body.mild !== false });
  const id = randomUUID();
  db.prepare("INSERT INTO formulas (id, title, kind, payload) VALUES (?, ?, ?, ?)").run(
    id,
    result.optimized.optimized.title,
    "validate",
    JSON.stringify(result)
  );
  res.json({ id, ...result });
});

app.post("/api/diy", async (req, res) => {
  const q = req.body.question || req.body.query || "";
  const hits = searchDiy(q, 4);
  const photo = req.body.photoHint || "";
  const photoHits = PHOTO_HINTS.filter((p) => p.keys.some((k) => (q + photo).includes(k)));
  const local = {
    answers: hits.map((h) => ({ q: h.doc.q, a: h.doc.a, score: h.score })),
    identify: photoHits,
    disclaimer: DISCLAIMER,
  };
  const llm = await llmChat(
    [{ role: "user", content: q || `请根据描述鉴别：${photo}` }],
    { diy: local.answers, identify: photoHits }
  );
  res.json({ ...local, llmAnswer: llm });
});

app.get("/api/formulas", (_req, res) => {
  const rows = db.prepare("SELECT id, title, kind, created_at FROM formulas ORDER BY created_at DESC LIMIT 50").all();
  res.json(rows);
});

app.get("/api/formulas/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM formulas WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "未找到" });
  res.json({ ...row, payload: JSON.parse(row.payload) });
});

app.post("/api/cards", (req, res) => {
  const id = randomUUID();
  db.prepare("INSERT INTO cards (id, formula_id, title, payload) VALUES (?, ?, ?, ?)").run(
    id,
    req.body.formulaId || "",
    req.body.title || "香笺",
    JSON.stringify(req.body)
  );
  res.json({ id, sharePath: `/card/${id}` });
});

app.get("/api/cards/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM cards WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "未找到香笺" });
  res.json({ ...row, payload: JSON.parse(row.payload) });
});

app.get("/api/shop/kits", (_req, res) => {
  res.json({
    tools: [
      { sku: "XH-SIEVE", name: "100–120 目铜筛", price: 39, blurb: "打粉过筛" },
      { sku: "XH-BINDER", name: "楠木粘粉 50g", price: 28, blurb: "线香粘合 10–14%" },
      { sku: "XH-HONEY", name: "炼蜜工具说明卡", price: 9, blurb: "香丸用，非食用宣传" },
      { sku: "XH-MOLD", name: "线香筒 / 香丸板", price: 45, blurb: "成型工具" },
    ],
    note: "演示带货货架。真实分销与支付需另接电商。",
  });
});

app.get("/api/device/presets", (_req, res) => {
  res.json({
    warning: "传统明火线香很难自动化。硬件方案优先低温电熏。手机不能产生气味。",
    cartridges: ["薄荷", "广藿香", "合欢花", "酸枣仁", "乳香", "白檀香"],
    presets: [
      { id: "morning", name: "上午办公 · 醒神", slots: { 薄荷: 12, 广藿香: 10 }, temp: 70, minutes: 25 },
      { id: "night", name: "睡前 · 安神向", slots: { 合欢花: 14, 酸枣仁: 10, 乳香: 8 }, temp: 65, minutes: 20 },
      { id: "rain", name: "梅雨 · 祛湿意象", slots: { 广藿香: 16, 白檀香: 8 }, temp: 75, minutes: 30 },
    ],
  });
});

app.post("/api/device/run", (req, res) => {
  const preset = req.body.preset || "morning";
  res.json({
    ok: true,
    preset,
    message: "已模拟下发低温电熏指令（演示）。不会控制真实明火。",
    startedAt: new Date().toISOString(),
  });
});

app.get("/api/knowledge", (req, res) => {
  res.json(knowledgeContext(req.query.q || "合香 君臣佐使"));
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.join(__dirname, "../../client/dist");
app.use(express.static(clientDist));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(clientDist, "index.html"), (err) => (err ? next() : null));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`香乘新笺 API http://127.0.0.1:${PORT}  香材 ${MATERIAL_COUNT} 种`);
});
