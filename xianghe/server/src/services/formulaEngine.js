import { MATERIALS } from "../data/materials.js";
import { SOLAR_TERMS } from "../data/solarTerms.js";
import { lookupMaterial, scanFormulaSafety, stripForbidden, audienceWarnings, DISCLAIMER } from "./safety.js";
import { knowledgeContext, searchMaterials } from "./retrieve.js";

const EMOTIONS = ["焦虑", "助眠", "提神", "静心", "安神"];
const SCENES = ["书房", "茶室", "枕边", "车内", "礼佛", "梅雨", "雅集", "礼品"];
const SEASONS = [
  "立春", "雨水", "惊蛰", "春分", "清明", "谷雨",
  "立夏", "小满", "芒种", "夏至", "小暑", "大暑",
  "立秋", "处暑", "白露", "秋分", "寒露", "霜降",
  "立冬", "小雪", "大雪", "冬至", "小寒", "大寒",
  "春", "夏", "秋", "冬", "梅雨", "深秋",
];

export function parseIntent(input = {}) {
  const text = [input.query, input.emotion, input.season, input.scene, input.imagery, input.constitution]
    .filter(Boolean)
    .join(" ");
  const emotion = input.emotion || EMOTIONS.find((e) => text.includes(e)) || (text.includes("睡") ? "助眠" : text.includes("醒") || text.includes("办公") ? "提神" : "静心");
  const season = input.season || SEASONS.find((e) => text.includes(e)) || inferSeason();
  const scene = input.scene || SCENES.find((e) => text.includes(e)) || (text.includes("南方") ? "梅雨" : "书房");
  const imagery = input.imagery || (text.includes("西湖") ? "西湖落雪" : text.includes("寺") ? "古寺庙的味道" : "");
  const mild = /不要?太冲|清淡|小户型|公寓|不要浓/.test(text) || input.mild;
  const pregnant = /孕/.test(text) || input.pregnant;
  const asthma = /哮喘|过敏性鼻炎|呼吸/.test(text) || input.asthma;
  const allergy = /过敏/.test(text) || input.allergy;
  const sealedBedroom = /密闭|整夜|卧室过夜/.test(text) || input.sealedBedroom;
  return {
    text,
    emotion,
    season,
    scene,
    imagery,
    constitution: input.constitution || "",
    mild,
    pregnant,
    asthma,
    allergy,
    sealedBedroom,
    form: input.form || (/香丸/.test(text) ? "香丸" : /电熏/.test(text) ? "电熏" : "线香"),
  };
}

function inferSeason() {
  const m = new Date().getMonth() + 1;
  if (m === 6 || m === 7) return "梅雨";
  if (m >= 3 && m <= 5) return "春";
  if (m >= 6 && m <= 8) return "夏";
  if (m >= 9 && m <= 11) return "秋";
  return "冬";
}

function pickUnique(cands, used, pred) {
  return cands.find((c) => !used.has(c.doc.name) && (!pred || pred(c.doc)));
}

function gramsFor(role, material, mild) {
  const base = { jun: 10, chen: 7, zuo: 5, shi: 3 }[role] || 4;
  const indoor = material.modernIndoor ?? 0.7;
  const heavy = material.heaviness || 2;
  let g = base * indoor * (mild ? 0.85 : 1);
  if (heavy >= 5) g = Math.min(g, 0.4);
  else if (heavy >= 4) g = Math.min(g, 4);
  if (material.risk === "caution") g = Math.min(g, 3.5);
  return Math.round(g * 10) / 10;
}

export function localGenerate(input) {
  const intent = parseIntent(input);
  const query = [intent.text, intent.emotion, intent.season, intent.scene, intent.imagery].join(" ");
  const filters = { emotion: intent.emotion, season: intent.season, scene: intent.scene };
  const knowledge = knowledgeContext(query, filters);

  const avoid = new Set();
  if (intent.pregnant) ["丁香", "肉桂", "桂皮", "苍术", "龙脑", "冰片", "石菖蒲", "川芎", "没药", "苏合香"].forEach((n) => avoid.add(n));
  if (intent.asthma) ["崖柏", "松针", "松脂", "艾叶", "樟木", "安息香苏门答腊"].forEach((n) => avoid.add(n));

  const pool = searchMaterials(query, 24, filters).filter((x) => {
    const d = x.doc;
    if (d.risk === "forbidden" || d.risk === "restricted") return false;
    if (avoid.has(d.name)) return false;
    if (intent.pregnant && d.avoidConstitutions?.includes("孕妇")) return false;
    if (d.category === "粘合") return false;
    return true;
  });

  const used = new Set();
  const take = (role, pred) => {
    const hit =
      pickUnique(pool, used, (d) => d.typicalRole === role && (!pred || pred(d))) ||
      pickUnique(pool, used, pred) ||
      pickUnique(
        searchMaterials(`${role} ${query}`, 16, { ...filters, role }),
        used,
        (d) => d.risk === "safe" || d.risk === "caution"
      );
    if (!hit) return null;
    used.add(hit.doc.name);
    return { name: hit.doc.name, grams: gramsFor(role, hit.doc, intent.mild), note: hit.doc.scentFamily };
  };

  const solar = SOLAR_TERMS.find((t) => intent.season.includes(t.name) || t.name.includes(intent.season));
  if (solar) {
    for (const [role, name] of [
      ["jun", solar.jun],
      ["chen", solar.chen],
      ["zuo", solar.zuo],
      ["shi", solar.shi],
    ]) {
      const mat = lookupMaterial(name);
      if (mat && !avoid.has(mat.name) && mat.risk !== "forbidden") {
        // prefer later assignment
      }
    }
  }

  let jun = take("jun");
  let chen = take("chen");
  let zuo = take("zuo");
  let shi = take("shi", (d) => d.name.includes("檀") || d.typicalRole === "使");

  if (solar) {
    const force = (role, name) => {
      const mat = lookupMaterial(name);
      if (!mat || avoid.has(mat.name) || mat.risk === "forbidden" || mat.risk === "restricted") return null;
      return { name: mat.name, grams: gramsFor(role, mat, intent.mild), note: mat.scentFamily };
    };
    jun = force("jun", solar.jun) || jun;
    chen = force("chen", solar.chen) || chen;
    zuo = force("zuo", solar.zuo) || zuo;
    shi = force("shi", solar.shi) || shi;
  }

  // 场景特化微调
  if (intent.scene.includes("梅雨") || /湿/.test(intent.text)) {
    jun = { name: "广藿香", grams: intent.mild ? 10 : 12, note: "草木湿香" };
    chen = { name: "苍术", grams: intent.mild ? 6 : 8, note: "辛烈药木" };
    zuo = { name: "合欢花", grams: 6, note: "清甜花香" };
    shi = { name: "白檀香", grams: 3, note: "奶油木香" };
  }
  if (intent.emotion === "助眠" || intent.scene.includes("枕边")) {
    zuo = { name: "合欢花", grams: 5, note: "清甜花香" };
    if (!intent.asthma) {
      chen = chen?.name === "苍术" ? { name: "安息香", grams: 4, note: "香草树脂" } : chen;
    }
    const extra = { name: "酸枣仁", grams: 4, note: "焦甜仁香" };
    // 放入佐
    zuo = extra;
  }
  if (intent.emotion === "提神" || /办公|上午/.test(intent.text)) {
    shi = { name: "薄荷", grams: 2, note: "清凉叶香" };
  }
  if (intent.imagery.includes("西湖") || intent.imagery.includes("落雪")) {
    jun = { name: "降真香", grams: 8, note: "辛甜木香" };
    chen = { name: "白檀香", grams: 6, note: "奶油木香" };
    zuo = { name: "绿萼梅", grams: 4, note: "酸梅冷香" };
    shi = { name: "龙脑", grams: 0.2, note: "冰凉点睛" };
  }
  if (intent.imagery.includes("寺")) {
    jun = { name: "白檀香", grams: 8, note: "奶油木香" };
    chen = { name: "沉香", grams: 5, note: "木质沉韵" };
    zuo = { name: "乳香", grams: 3, note: "柠檬树脂" };
    shi = { name: "松针", grams: 1, note: "山门松风" };
  }

  if (intent.pregnant && shi?.name === "龙脑") shi = { name: "白檀香", grams: 3, note: "温润收束" };
  if (intent.asthma && ["松针", "崖柏", "艾叶"].includes(zuo?.name)) {
    zuo = { name: "合欢花", grams: 5, note: "清甜花香" };
  }

  const formula = stripForbidden({
    title: buildTitle(intent),
    jun: jun ? [jun] : [{ name: "栈香", grams: 8, note: "日常轻沉" }],
    chen: chen ? [chen] : [{ name: "零陵香", grams: 5, note: "甜草花香" }],
    zuo: zuo ? [zuo] : [{ name: "合欢花", grams: 4, note: "清甜花香" }],
    shi: shi ? [shi] : [{ name: "白檀香", grams: 3, note: "收束" }],
  });

  // 去重：同一材料只保留最高角色
  dedupeRoles(formula);

  const processing = buildProcessing(formula);
  const steps = buildSteps(formula, intent);
  const scent = buildScent(formula, intent);
  const safety = scanFormulaSafety(formula, { vip: input.vip });
  const contra = buildContra(formula, intent);

  return {
    engine: "local-knowledge",
    intent,
    formula,
    processing,
    steps,
    scent,
    contraindications: contra,
    warnings: audienceWarnings(intent),
    disclaimer: DISCLAIMER,
    safety,
    knowledge,
    binder: intent.form === "香丸"
      ? { name: "炼蜜", ratio: "蜜:粉约 3.5:6.5" }
      : { name: "楠木粘粉", ratio: "12%" },
    shopKit: buildShopKit(formula, intent),
    referenceOnly: true,
  };
}

function buildTitle(intent) {
  if (intent.imagery) return `${intent.imagery}香`;
  if (intent.season && intent.scene) return `${intent.season}${intent.scene}香`;
  return `${intent.emotion}合香`;
}

function dedupeRoles(formula) {
  const seen = new Set();
  for (const role of ["jun", "chen", "zuo", "shi"]) {
    formula[role] = (formula[role] || []).filter((it) => {
      if (seen.has(it.name)) return false;
      seen.add(it.name);
      return true;
    });
  }
}

function buildProcessing(formula) {
  const lines = [];
  for (const role of ["jun", "chen", "zuo", "shi"]) {
    for (const it of formula[role] || []) {
      const m = lookupMaterial(it.name);
      if (m) lines.push(`${it.name}：${m.processing}`);
    }
  }
  lines.push("诸香分别打粉过筛后合粉，醒粉半日再和泥。");
  return lines;
}

function buildSteps(formula, intent) {
  const total = ["jun", "chen", "zuo", "shi"].flatMap((r) => formula[r] || []).reduce((s, i) => s + i.grams, 0);
  if (intent.form === "香丸") {
    return [
      `按君臣佐使称取，合计约 ${total.toFixed(1)}g。`,
      "分别打粉，80–100 目。",
      "合粉拌匀，加入炼蜜至成团。",
      "搓丸如黄豆至莲子，阴干 10–20 天。",
      "铜炉隔火或低温电熏，勿明火直接燎油。",
    ];
  }
  if (intent.form === "电熏") {
    return [
      "本方建议走低温电熏，不要用明火线香自动化。",
      "花草仓 55–75°C 先出头香 8–12 分钟。",
      "木香仓 90–110°C 接中后段 15–20 分钟。",
      "树脂仓 80–95°C 作尾韵，避免超过 140°C。",
      "手机端只调时长与温度，不会在屏幕上“闻到”味道。",
    ];
  }
  return [
    `按君臣佐使称取，合计约 ${total.toFixed(1)}g。`,
    "打粉 100–120 目，树脂类单独先粉碎。",
    "加入楠木粘粉约 12%，喷水醒泥 20 分钟。",
    "搓条或入香筒，阴干 5–10 天，忌暴晒。",
    "现代小户型一次一炷，保持对流；密闭整夜卧室不要燃香。",
  ];
}

function buildScent(formula, intent) {
  const names = ["jun", "chen", "zuo", "shi"].flatMap((r) => formula[r] || []).map((i) => lookupMaterial(i.name)).filter(Boolean);
  const top = names.map((m) => m.notes.top).filter(Boolean)[0] || "清气";
  const mid = names.map((m) => m.notes.mid).filter(Boolean)[1] || names[0]?.notes.mid || "花木";
  const base = names.map((m) => m.notes.base).reverse().find(Boolean) || "木质收束";
  return {
    top: `初闻${top}`,
    mid: `中段${mid}`,
    base: `尾调${base}`,
    prose: `初闻${top}，中段${mid}，尾调${base}。气味因体质与空间差异很大，请用反馈「太浓 / 太淡」再调一版。${intent.mild ? "本方已按现代室内做了减浓。" : ""}`,
  };
}

function buildContra(formula, intent) {
  const set = new Set();
  set.add("阴虚火旺者慎用燥烈、厚甜、热辛之品。");
  set.add("不适合密闭整夜卧室燃烧。");
  for (const role of ["jun", "chen", "zuo", "shi"]) {
    for (const it of formula[role] || []) {
      const m = lookupMaterial(it.name);
      if (m?.contraindications) set.add(`${it.name}：${m.contraindications}`);
    }
  }
  if (intent.scene.includes("车内")) set.add("车内只可用极淡电熏或停驶通风，驾驶时避免浓香分心。");
  return [...set];
}

function buildShopKit(formula, intent) {
  const items = ["jun", "chen", "zuo", "shi"].flatMap((r) => formula[r] || []).map((i) => ({
    name: i.name,
    grams: i.grams,
    sku: `XH-${Buffer.from(i.name).toString("hex").slice(0, 8)}`,
  }));
  items.push(
    intent.form === "香丸"
      ? { name: "炼蜜（工具包）", grams: 20, sku: "XH-HONEY" }
      : { name: "楠木粘粉", grams: Math.max(6, Math.round(items.reduce((s, i) => s + i.grams, 0) * 0.12)), sku: "XH-BINDER" }
  );
  items.push({ name: "100–120 目筛", grams: 0, sku: "XH-SIEVE" });
  return {
    title: `${formula.title} 原料包`,
    items,
    note: "演示电商：一键配齐是带货入口，真实支付未接入。",
  };
}

export function listSafeMaterials() {
  return MATERIALS.filter((m) => m.risk !== "forbidden").map((m) => ({
    name: m.name,
    aliases: m.aliases,
    category: m.category,
    typicalRole: m.typicalRole,
    nature: m.nature,
    scentFamily: m.scentFamily,
    risk: m.risk,
    functions: m.functions,
    scenes: m.scenes,
    seasons: m.seasons,
    source: m.source,
  }));
}
