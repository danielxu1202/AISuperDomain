import { MATERIALS } from "../data/materials.js";

export const DISCLAIMER =
  "合香、熏香属于嗅觉文化与休闲雅事，不能替代医疗诊断或治疗。孕妇、哮喘、过敏及呼吸系统敏感人群请谨慎，必要时先咨询专业人士。本输出仅供参考，实际闻感需真人试香调整。";

const FORBIDDEN = new Set(
  MATERIALS.filter((x) => x.risk === "forbidden").map((x) => x.name)
);
const RESTRICTED = new Set(
  MATERIALS.filter((x) => x.risk === "restricted").map((x) => x.name)
);

const ALIAS_TO_NAME = new Map();
for (const mat of MATERIALS) {
  ALIAS_TO_NAME.set(mat.name, mat.name);
  for (const a of mat.aliases) ALIAS_TO_NAME.set(a, mat.name);
}

export function canonicalName(raw) {
  if (!raw) return "";
  const t = String(raw).trim();
  if (ALIAS_TO_NAME.has(t)) return ALIAS_TO_NAME.get(t);
  for (const [k, v] of ALIAS_TO_NAME) {
    if (t.includes(k) || k.includes(t)) return v;
  }
  return t;
}

export function lookupMaterial(name) {
  const c = canonicalName(name);
  return MATERIALS.find((m) => m.name === c || m.aliases.includes(name)) || null;
}

export function riskOf(name) {
  const m = lookupMaterial(name);
  if (!m) return { risk: "unknown", material: null };
  return { risk: m.risk, material: m };
}

export function isForbiddenName(name) {
  const c = canonicalName(name);
  return FORBIDDEN.has(c);
}

export function isRestrictedName(name) {
  const c = canonicalName(name);
  return RESTRICTED.has(c);
}

export function collectIngredients(formula) {
  const roles = ["jun", "chen", "zuo", "shi"];
  const items = [];
  for (const role of roles) {
    const list = formula?.[role] || [];
    for (const it of list) {
      items.push({
        role,
        name: canonicalName(it.name),
        grams: Number(it.grams) || 0,
        raw: it,
      });
    }
  }
  return items;
}

export function scanFormulaSafety(formula, { vip = false } = {}) {
  const issues = [];
  const items = collectIngredients(formula);
  let blocked = false;

  for (const it of items) {
    const { risk, material } = riskOf(it.name);
    if (risk === "forbidden") {
      blocked = true;
      issues.push({
        level: "block",
        name: it.name,
        message: `${it.name} 属于禁止香材（${material?.contraindications || "有明确安全或法律风险"}）。系统不会输出含此材料的可执行配方。`,
      });
    } else if (risk === "restricted") {
      issues.push({
        level: "warn",
        name: it.name,
        message: `${it.name} 不建议用于日常熏香：${material?.contraindications || "刺激或来源不当"}。`,
      });
    } else if (risk === "caution") {
      issues.push({
        level: "caution",
        name: it.name,
        message: `${it.name} 需控量。${material?.contraindications || ""} 建议 ≤ ${suggestMaxGrams(material)}g。`,
      });
      if (material && it.grams > suggestMaxGrams(material) * 1.2) {
        issues.push({
          level: "warn",
          name: it.name,
          message: `${it.name} 当前 ${it.grams}g 偏高，现代室内建议下调。`,
        });
      }
    } else if (risk === "unknown") {
      issues.push({
        level: "warn",
        name: it.name,
        message: `${it.name} 不在可信香材库中，请勿使用来源不明或矿物类粉末。`,
      });
    }

    if (material?.avoidConstitutions?.length) {
      issues.push({
        level: "info",
        name: it.name,
        message: `${it.name} 不宜体质：${material.avoidConstitutions.join("、")}。`,
      });
    }
  }

  const heavy = items
    .map((it) => ({ it, m: lookupMaterial(it.name) }))
    .filter((x) => x.m && x.m.heaviness >= 4);
  const heavyGrams = heavy.reduce((s, x) => s + x.it.grams, 0);
  const total = items.reduce((s, x) => s + x.grams, 0) || 1;
  if (heavyGrams / total > 0.45) {
    issues.push({
      level: "warn",
      name: "配比",
      message: "重香（沉、奇楠、苏合、龙脑、丁香等）占比偏高，小户型建议整体下调并增加檀、花、草的清透。",
    });
  }

  if (!vip) {
    const hidden = issues.filter((i) => i.level === "caution").length;
    if (hidden) {
      issues.push({
        level: "info",
        name: "会员",
        message: "完整高危药材校验说明、批量导出与古籍对照为 VIP 功能。免费版已拦截禁止项。",
      });
    }
  }

  return { blocked, issues, items, totalGrams: items.reduce((s, x) => s + x.grams, 0) };
}

export function suggestMaxGrams(material) {
  if (!material) return 3;
  if (material.heaviness >= 5) return 0.5;
  if (material.heaviness >= 4) return 3;
  if (material.risk === "caution") return 4;
  return 12;
}

export function stripForbidden(formula) {
  const next = { ...formula };
  for (const role of ["jun", "chen", "zuo", "shi"]) {
    next[role] = (formula[role] || []).filter((it) => !isForbiddenName(it.name));
  }
  return next;
}

export function audienceWarnings({ pregnant, asthma, allergy, sealedBedroom }) {
  const list = [
    "孕妇、备孕人群：避免辛窜、热性及任何矿物/动物管制香材；建议只使用清淡花木，并保持通风。",
    "哮喘及呼吸道敏感：避免柏脂、松脂、艾烟、樟脑、浓树脂烟感。",
    "过敏体质：新方先微量短时试闻，出现不适立即停止并通风。",
  ];
  if (pregnant) list.unshift("已勾选孕妇相关：本方已倾向排除丁香、肉桂、苍术高剂量、龙脑、石菖蒲。");
  if (asthma) list.unshift("已勾选哮喘：已降低烟感与针叶树脂。");
  if (allergy) list.unshift("已勾选过敏：请先以单材试闻，再合香。");
  if (sealedBedroom) list.unshift("密闭整夜卧室不适合燃香。助眠向请改短时电熏或睡前一炷后熄灭通风。");
  return list;
}
