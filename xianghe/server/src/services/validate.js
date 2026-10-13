import { lookupMaterial, canonicalName, scanFormulaSafety, DISCLAIMER, audienceWarnings } from "./safety.js";
import { MATERIALS } from "../data/materials.js";

const ROLE_WORDS = [
  ["jun", /君\s*[：:]?/],
  ["chen", /臣\s*[：:]?/],
  ["zuo", /佐\s*[：:]?/],
  ["shi", /使\s*[：:]?/],
];

export function parseFolkFormula(text) {
  const src = String(text || "").replace(/\r/g, "");
  const items = [];
  const nameAlt = MATERIALS.flatMap((m) => [m.name, ...m.aliases]).sort((a, b) => b.length - a.length);

  const lineRe = /([\u4e00-\u9fff]{1,12})\s*(\d+(?:\.\d+)?)\s*(g|克|钱)?/g;
  let m;
  while ((m = lineRe.exec(src))) {
    const name = canonicalName(m[1]);
    let grams = Number(m[2]);
    if (m[3] === "钱") grams *= 3.75;
    items.push({ name, grams, raw: m[1] });
  }

  if (!items.length) {
    for (const n of nameAlt) {
      if (src.includes(n)) items.push({ name: canonicalName(n), grams: 5, raw: n, inferred: true });
    }
  }

  const formula = { title: "民间香方（待校验）", jun: [], chen: [], zuo: [], shi: [] };
  const used = new Set();
  for (const it of items) {
    if (used.has(it.name)) continue;
    used.add(it.name);
    const mat = lookupMaterial(it.name);
    const role = guessRole(src, it, mat);
    formula[role].push({ name: it.name, grams: it.grams, note: it.inferred ? "未写克数，暂按 5g 估" : "" });
  }
  if (!formula.jun.length && items[0]) {
    formula.jun.push(formula.chen.shift() || formula.zuo.shift() || { name: items[0].name, grams: items[0].grams });
  }
  return { formula, inferred: items.some((i) => i.inferred), raw: src };
}

function guessRole(src, it, mat) {
  for (const [role, re] of ROLE_WORDS) {
    const idx = src.search(re);
    if (idx >= 0) {
      const window = src.slice(idx, idx + 24);
      if (window.includes(it.raw) || window.includes(it.name)) return role;
    }
  }
  return mat?.typicalRole === "君" ? "jun" : mat?.typicalRole === "臣" ? "chen" : mat?.typicalRole === "使" ? "shi" : "zuo";
}

export function optimizeForModernHome(formula, { mild = true, vip = false } = {}) {
  const next = { title: `${formula.title} · 现代室内改良`, jun: [], chen: [], zuo: [], shi: [] };
  const changes = [];
  for (const role of ["jun", "chen", "zuo", "shi"]) {
    for (const it of formula[role] || []) {
      const mat = lookupMaterial(it.name);
      if (!mat) {
        changes.push(`未知材料「${it.name}」已从可执行配方中移除，请核实来源。`);
        continue;
      }
      if (mat.risk === "forbidden") {
        changes.push(`已删除禁止项 ${it.name}。`);
        continue;
      }
      if (mat.risk === "restricted") {
        changes.push(`已删除不建议日常使用的 ${it.name}。`);
        continue;
      }
      let grams = it.grams;
      const cap = mat.heaviness >= 5 ? 0.4 : mat.heaviness >= 4 ? 3.5 : mild ? 10 : 12;
      const scaled = grams * (mat.modernIndoor ?? 0.7) * (mild ? 0.8 : 0.9);
      const after = Math.round(Math.min(grams, Math.max(0.2, scaled), cap) * 10) / 10;
      if (after < grams) changes.push(`${it.name} ${grams}g → ${after}g（降重香 / 适配小户型）`);
      next[role].push({ name: mat.name, grams: after, note: mat.scentFamily });
    }
  }
  if (!next.shi.length) {
    next.shi.push({ name: "白檀香", grams: 3, note: "以檀收束，和众香" });
    changes.push("补使药白檀香 3g，避免有君无使。");
  }
  const safety = scanFormulaSafety(next, { vip });
  return {
    original: formula,
    optimized: next,
    changes,
    safety,
    disclaimer: DISCLAIMER,
    warnings: audienceWarnings({}),
    note: "改良只降低刺激与厚重，不保证你喜欢这个味道。请试香后用太浓/太淡反馈。",
  };
}

export function validateText(text, opts = {}) {
  const parsed = parseFolkFormula(text);
  const safety = scanFormulaSafety(parsed.formula, opts);
  const optimized = optimizeForModernHome(parsed.formula, opts);
  const conflicts = findConflicts(parsed.formula);
  return {
    parsed,
    safety,
    conflicts,
    optimized,
    disclaimer: DISCLAIMER,
  };
}

function findConflicts(formula) {
  const names = ["jun", "chen", "zuo", "shi"].flatMap((r) => formula[r] || []).map((i) => i.name);
  const out = [];
  const has = (n) => names.some((x) => x.includes(n));
  if (has("龙脑") && has("肉桂")) out.push("龙脑大凉与肉桂大热同方，易气味打架，建议只留一极微量。");
  if (has("薄荷") && (has("助眠") || has("酸枣仁")) && has("枕")) out.push("薄荷提神，助眠枕边方宜去掉薄荷。");
  if (has("苍术") && has("麦冬")) out.push("苍术燥、麦冬润，可并存但需降低苍术。");
  if (names.filter((n) => lookupMaterial(n)?.heaviness >= 4).length >= 3) {
    out.push("厚重香材过多，现代室内容易闷冲。");
  }
  return out;
}
