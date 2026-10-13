import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { scanFormulaSafety, isForbiddenName, canonicalName } from "../services/safety.js";
import { validateText } from "../services/validate.js";
import { localGenerate } from "../services/formulaEngine.js";
import { MATERIAL_COUNT } from "../data/materials.js";

describe("knowledge base", () => {
  it("has 130+ materials", () => {
    assert.ok(MATERIAL_COUNT >= 130, MATERIAL_COUNT);
  });
});

describe("safety", () => {
  it("blocks cinnabar", () => {
    assert.equal(isForbiddenName("朱砂"), true);
    assert.equal(canonicalName("丹砂"), "朱砂");
    const r = scanFormulaSafety({
      jun: [{ name: "沉香", grams: 8 }],
      chen: [{ name: "朱砂", grams: 1 }],
      zuo: [],
      shi: [],
    });
    assert.equal(r.blocked, true);
  });

  it("rejects folk formula with minerals", () => {
    const v = validateText("君：沉香 10g 臣：朱砂 2g 佐：苍术 8g 使：檀香 3g");
    assert.equal(v.safety.blocked, true);
    assert.ok(v.optimized.changes.some((c) => c.includes("朱砂")));
    assert.ok(!v.optimized.optimized.chen.some((i) => i.name === "朱砂"));
  });
});

describe("generate", () => {
  it("outputs jun-chen-zuo-shi for plum rain study", () => {
    const r = localGenerate({
      query: "南方梅雨季，书房用，祛湿安神，不要味道太冲",
    });
    assert.ok(r.formula.jun.length);
    assert.ok(r.formula.shi.length);
    assert.ok(r.disclaimer.includes("不能替代"));
    assert.equal(r.formula.jun[0].name, "广藿香");
    assert.ok(r.processing.length >= 3);
    assert.ok(r.steps.length >= 4);
  });

  it("never includes musk or cinnabar", () => {
    const r = localGenerate({ query: "安神助眠古方，朱砂麝香都来一点" });
    const names = ["jun", "chen", "zuo", "shi"].flatMap((k) => r.formula[k].map((i) => i.name));
    assert.ok(!names.includes("朱砂"));
    assert.ok(!names.includes("麝香"));
  });
});
