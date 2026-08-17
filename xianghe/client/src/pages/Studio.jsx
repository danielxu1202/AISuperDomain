import { useEffect, useState } from "react";
import { api } from "../api.js";
import XiangCard from "../components/XiangCard.jsx";
import { formulaToCard } from "../components/FormulaPanel.jsx";

export default function Studio() {
  const [rows, setRows] = useState([]);
  const [card, setCard] = useState(null);

  useEffect(() => {
    api.formulas().then(setRows).catch(() => {});
  }, []);

  async function open(id) {
    const row = await api.formula(id);
    const payload = row.payload;
    const formula = payload.formula || payload.optimized?.optimized;
    if (!formula) return;
    setCard(formulaToCard({ formula, scent: payload.scent || { prose: payload.optimized?.note || "" }, intent: payload.intent || {} }));
  }

  return (
    <div className="grid-2">
      <div>
        <h2 style={{ fontFamily: "Ma Shan Zheng, serif", fontSize: 40 }}>数字香笺</h2>
        <p>最近开方与校验会留在本地 SQLite。点一条生成国风卡片，截图可发朋友圈——这是传播点，不是疗效证明。</p>
        <ul>
          {rows.map((r) => (
            <li key={r.id} style={{ margin: "8px 0", cursor: "pointer" }} onClick={() => open(r.id)}>
              {r.title} <small>{r.kind} · {r.created_at}</small>
            </li>
          ))}
        </ul>
      </div>
      <XiangCard card={card} />
    </div>
  );
}
