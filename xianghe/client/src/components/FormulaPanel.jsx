const ROLE = { jun: "君", chen: "臣", zuo: "佐", shi: "使" };

export default function FormulaPanel({ result, onAdjust, onCard }) {
  if (!result?.formula) return null;
  const f = result.formula;
  return (
    <div className="formula-board">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h3 style={{ fontFamily: "Ma Shan Zheng, serif", fontSize: 32, margin: 0 }}>{f.title}</h3>
        <small>{result.engine === "llm+rag" ? "大模型 + 知识库" : "知识库规则引擎"}</small>
      </div>
      <div className="roles" style={{ marginTop: 16 }}>
        {Object.entries(ROLE).map(([k, label]) => (
          <div className="role" key={k}>
            <b>{label}</b>
            <ul>
              {(f[k] || []).map((i) => (
                <li key={i.name}>
                  {i.name} {i.grams}g
                  {i.note ? <div style={{ color: "#4a3b2f", fontSize: 12 }}>{i.note}</div> : null}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {result.scent?.prose && <p style={{ lineHeight: 1.9, marginTop: 16 }}>{result.scent.prose}</p>}
      <h4>炮制</h4>
      <ol>{(result.processing || []).map((x) => <li key={x}>{x}</li>)}</ol>
      <h4>制作步骤</h4>
      <ol>{(result.steps || []).map((x) => <li key={x}>{x}</li>)}</ol>
      <h4>禁忌与风险</h4>
      <ul>{(result.contraindications || []).map((x) => <li key={x}>{x}</li>)}</ul>
      {(result.safety?.issues || []).filter((i) => i.level !== "info").map((i) => (
        <div key={i.name + i.message} className={`issue ${i.level === "block" ? "block" : ""}`}>
          {i.message}
        </div>
      ))}
      <p style={{ fontSize: 13, color: "#4a3b2f" }}>{result.disclaimer}</p>
      <div className="btn-row">
        <button className="btn ghost" onClick={() => onAdjust?.("太浓")}>太浓，减一版</button>
        <button className="btn ghost" onClick={() => onAdjust?.("太淡")}>太淡，增一版</button>
        <button className="btn" onClick={onCard}>生成国风香笺</button>
      </div>
    </div>
  );
}

export function formulaToCard(result) {
  const f = result.formula;
  const lines = ["jun", "chen", "zuo", "shi"].flatMap((k) =>
    (f[k] || []).map((i) => ({ role: { jun: "君", chen: "臣", zuo: "佐", shi: "使" }[k], ...i }))
  );
  return {
    title: f.title,
    lines,
    prose: result.scent?.prose || "",
    season: result.intent?.season || "",
    scene: result.intent?.scene || "",
  };
}
