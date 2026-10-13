import { useState } from "react";
import { api } from "../api.js";
import FormulaPanel, { formulaToCard } from "../components/FormulaPanel.jsx";
import XiangCard from "../components/XiangCard.jsx";

export default function Validate() {
  const [text, setText] = useState("君：沉香 12g 臣：朱砂 2g 苍术 10g 佐：丁香 6g 使：檀香 3g\n民间流传安神方，味道很厚。");
  const [data, setData] = useState(null);
  const [card, setCard] = useState(null);
  const [error, setError] = useState("");

  async function run() {
    setError("");
    try {
      setData(await api.validate({ text, mild: true }));
      setCard(null);
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div>
      <h2 style={{ fontFamily: "Ma Shan Zheng, serif", fontSize: 40 }}>香方校验与优化</h2>
      <p>把网上找来的民间方贴进来。系统先拦有毒/管制原料，再按现代小户型降低重香。</p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} style={{ minHeight: 140 }} />
      <div className="btn-row">
        <button className="btn" onClick={run}>校验并改良</button>
      </div>
      {error && <div className="issue block">{error}</div>}
      {data && (
        <div className="grid-2" style={{ marginTop: 20 }}>
          <div>
            <h3>冲突与风险</h3>
            {data.safety.blocked && <div className="issue block">原方含禁止项，不可按原方制作。</div>}
            {(data.conflicts || []).map((c) => <div className="issue" key={c}>{c}</div>)}
            {(data.safety.issues || []).map((i) => (
              <div className={`issue ${i.level === "block" ? "block" : ""}`} key={i.message}>{i.message}</div>
            ))}
            <h3>改良说明</h3>
            <ul>{data.optimized.changes.map((c) => <li key={c}>{c}</li>)}</ul>
          </div>
          <div>
            <FormulaPanel
              result={{
                formula: data.optimized.optimized,
                processing: ["按改良方重新炮制，禁止项已删除。"],
                steps: ["称取改良克数", "打粉合香", "现代室内先半炷试闻"],
                scent: { prose: data.optimized.note },
                contraindications: data.optimized.warnings,
                disclaimer: data.disclaimer,
                safety: data.optimized.safety,
                engine: "validate",
              }}
              onCard={() => setCard(formulaToCard({
                formula: data.optimized.optimized,
                scent: { prose: data.optimized.note },
                intent: {},
              }))}
            />
            {card && <XiangCard card={card} />}
          </div>
        </div>
      )}
    </div>
  );
}
