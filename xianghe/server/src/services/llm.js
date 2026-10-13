import { DISCLAIMER, scanFormulaSafety, stripForbidden, isForbiddenName } from "./safety.js";
import { knowledgeContext } from "./retrieve.js";
import { localGenerate, parseIntent } from "./formulaEngine.js";

const SYSTEM_PROMPT = `你是「合香师助手」，不是替代老师傅的自动调香机。
你必须遵守中式合香的君臣佐使，不是西方香水的头中后调堆砌。
香药同源不等于可以当医药：禁止宣传疗效、治病、安胎、治疗失眠/抑郁等。
只能谈嗅觉文化、时令、场景、体质宜忌（作为使用注意，不是处方）。

硬性规则：
1. 只能使用用户消息里「可用香材」清单中的材料。
2. 严禁输出：朱砂、雄黄、轻粉、铅丹、硫磺、青木香、细辛、苍耳子、麝香、阿魏、樟脑高剂量。
3. 必须输出克数配比、炮制、制作步骤、禁忌风险、香韵描述。
4. 古方味道厚重时，按现代小户型降低重香比例。
5. 明确写：仅供参考，需真人试香。
6. 孕妇、哮喘、过敏给出回避。
7. 不要让用户以为手机能闻到味道。

只输出 JSON，不要 Markdown。结构：
{
  "title": "香名",
  "jun": [{"name":"","grams":0,"note":""}],
  "chen": [{"name":"","grams":0,"note":""}],
  "zuo": [{"name":"","grams":0,"note":""}],
  "shi": [{"name":"","grams":0,"note":""}],
  "processing": ["..."],
  "steps": ["..."],
  "scent": {"top":"","mid":"","base":"","prose":""},
  "contraindications": ["..."],
  "form": "线香|香丸|电熏"
}`;

function extractJson(text) {
  if (!text) return null;
  const fence = text.match(/```json\s*([\s\S]*?)```/);
  const raw = fence ? fence[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end < 0) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

export async function llmGenerate(input) {
  const key = process.env.OPENAI_API_KEY;
  const fallback = localGenerate(input);
  if (!key) {
    return { ...fallback, llm: { used: false, reason: "未配置 OPENAI_API_KEY，已用知识库规则引擎。" } };
  }

  const intent = parseIntent(input);
  const knowledge = knowledgeContext(
    [intent.text, intent.emotion, intent.season, intent.scene, intent.imagery].join(" "),
    intent
  );
  const allow = knowledge.materials.map((m) => m.name).join("、");

  const user = `用户需求：${JSON.stringify({
    query: input.query,
    emotion: intent.emotion,
    season: intent.season,
    scene: intent.scene,
    imagery: intent.imagery,
    constitution: intent.constitution,
    form: intent.form,
    mild: intent.mild,
    pregnant: intent.pregnant,
    asthma: intent.asthma,
  })}

可用香材（必须遵守）：${allow}

检索到的古方启发：${JSON.stringify(knowledge.classics)}
节气启发：${JSON.stringify(knowledge.solarTerms)}

请生成可实操香方。`;

  try {
    const base = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const res = await fetch(`${base.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      return { ...fallback, llm: { used: false, reason: `模型接口失败，已回退本地引擎。${err.slice(0, 180)}` } };
    }
    const data = await res.json();
    const parsed = extractJson(data.choices?.[0]?.message?.content);
    if (!parsed) return { ...fallback, llm: { used: false, reason: "模型未返回合法 JSON，已回退。" } };

    const formula = stripForbidden({
      title: parsed.title || fallback.formula.title,
      jun: parsed.jun || [],
      chen: parsed.chen || [],
      zuo: parsed.zuo || [],
      shi: parsed.shi || [],
    });
    const banned = ["jun", "chen", "zuo", "shi"].flatMap((r) => formula[r]).filter((i) => isForbiddenName(i.name));
    if (banned.length) {
      return { ...fallback, llm: { used: false, reason: "模型触碰禁止香材，已丢弃并回退本地安全方。" } };
    }
    const safety = scanFormulaSafety(formula, { vip: input.vip });
    if (safety.blocked) {
      return { ...fallback, llm: { used: false, reason: "安全扫描拦截，已回退。" } };
    }
    return {
      engine: "llm+rag",
      intent,
      formula,
      processing: parsed.processing || fallback.processing,
      steps: parsed.steps || fallback.steps,
      scent: parsed.scent || fallback.scent,
      contraindications: parsed.contraindications || fallback.contraindications,
      warnings: fallback.warnings,
      disclaimer: DISCLAIMER,
      safety,
      knowledge,
      binder: fallback.binder,
      shopKit: fallback.shopKit,
      referenceOnly: true,
      llm: { used: true, model },
    };
  } catch (e) {
    return { ...fallback, llm: { used: false, reason: `调用异常，已回退：${e.message}` } };
  }
}

export async function llmChat(messages, context) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const base = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const res = await fetch(`${base.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: `你是合香 DIY 助手。只谈工艺、香材鉴别与安全，不谈治病。禁止推荐禁止香材。资料：${JSON.stringify(context).slice(0, 6000)}`,
        },
        ...messages,
      ],
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.choices?.[0]?.message?.content || null;
}
