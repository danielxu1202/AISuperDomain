import { MATERIALS } from "../data/materials.js";
import { CLASSICS } from "../data/classics.js";
import { SOLAR_TERMS } from "../data/solarTerms.js";
import { DIY_QA } from "../data/diyKnowledge.js";

function tokenize(text) {
  const s = String(text || "").toLowerCase();
  const parts = s.split(/[\s,，。！？、；：:：""''（）()【】\-/]+/).filter(Boolean);
  const grams = [];
  const han = s.replace(/[^\u4e00-\u9fff]/g, "");
  for (let i = 0; i < han.length; i++) {
    grams.push(han[i]);
    if (i + 1 < han.length) grams.push(han.slice(i, i + 2));
  }
  return [...parts, ...grams];
}

function docText(obj) {
  if (obj._doc) return obj._doc;
  return [
    obj.name,
    ...(obj.aliases || []),
    obj.category,
    obj.typicalRole,
    obj.scentFamily,
    obj.notes?.top,
    obj.notes?.mid,
    obj.notes?.base,
    ...(obj.functions || []),
    ...(obj.scenes || []),
    ...(obj.seasons || []),
    ...(obj.emotions || []),
    ...(obj.constitutions || []),
    obj.encyclopedia,
    obj.processing,
    obj.source,
    obj.imagery,
    obj.originalNote,
    obj.optimize,
    obj.q,
    obj.a,
    obj.mood,
    obj.note,
  ]
    .filter(Boolean)
    .join(" ");
}

function buildIndex(docs) {
  const df = new Map();
  const prepared = docs.map((d) => {
    const tokens = tokenize(docText(d));
    const tf = new Map();
    for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
    for (const t of tf.keys()) df.set(t, (df.get(t) || 0) + 1);
    return { d, tf, tokens };
  });
  return { prepared, df, n: docs.length };
}

function scoreQuery(index, query, extraBoost = () => 0) {
  const qTokens = tokenize(query);
  const qtf = new Map();
  for (const t of qTokens) qtf.set(t, (qtf.get(t) || 0) + 1);
  return index.prepared
    .map(({ d, tf }) => {
      let s = extraBoost(d, qTokens);
      for (const [t, qv] of qtf) {
        const df = index.df.get(t) || 0;
        if (!df) continue;
        const idf = Math.log((index.n + 1) / (df + 0.5));
        s += ((tf.get(t) || 0) * qv * idf);
      }
      return { doc: d, score: s };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
}

const materialIndex = buildIndex(MATERIALS.filter((m) => m.risk !== "forbidden"));
const classicIndex = buildIndex(CLASSICS);
const termIndex = buildIndex(SOLAR_TERMS);
const diyIndex = buildIndex(DIY_QA);

export function searchMaterials(query, limit = 12, filters = {}) {
  const rows = scoreQuery(materialIndex, query, (d, tokens) => {
    let b = 0;
    if (filters.emotion && d.emotions?.includes(filters.emotion)) b += 8;
    if (filters.season && d.seasons?.some((s) => s.includes(filters.season) || filters.season.includes(s))) b += 8;
    if (filters.scene && d.scenes?.some((s) => s.includes(filters.scene) || filters.scene.includes(s))) b += 8;
    if (filters.role && d.typicalRole === filters.role) b += 3;
    if (filters.excludeRisk?.includes(d.risk)) b -= 50;
    if (tokens.some((t) => d.name.includes(t))) b += 12;
    return b;
  });
  return rows.slice(0, limit);
}

export function searchClassics(query, limit = 6) {
  return scoreQuery(classicIndex, query).slice(0, limit);
}

export function searchSolar(query, limit = 4) {
  return scoreQuery(termIndex, query).slice(0, limit);
}

export function searchDiy(query, limit = 5) {
  return scoreQuery(diyIndex, query).slice(0, limit);
}

export function knowledgeContext(query, filters = {}) {
  const mats = searchMaterials(query, 14, { ...filters, excludeRisk: ["forbidden"] });
  const classics = searchClassics(query, 4);
  const terms = searchSolar(query, 3);
  return {
    materials: mats.map((x) => ({
      name: x.doc.name,
      score: Number(x.score.toFixed(2)),
      role: x.doc.typicalRole,
      risk: x.doc.risk,
      nature: x.doc.nature,
      scent: x.doc.scentFamily,
      processing: x.doc.processing,
      contra: x.doc.contraindications,
      functions: x.doc.functions,
      heaviness: x.doc.heaviness,
      modernIndoor: x.doc.modernIndoor,
    })),
    classics: classics.map((x) => ({
      name: x.doc.name,
      source: x.doc.source,
      imagery: x.doc.imagery,
      optimize: x.doc.optimize,
      modernSafe: x.doc.modernSafe,
      dropped: x.doc.dropped,
    })),
    solarTerms: terms.map((x) => x.doc),
  };
}
