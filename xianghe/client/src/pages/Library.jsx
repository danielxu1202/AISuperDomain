import { useEffect, useState } from "react";
import { api } from "../api.js";

export default function Library() {
  const [q, setQ] = useState("");
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [cur, setCur] = useState(null);

  async function load(query = q) {
    const data = await api.materials(query);
    setList(data.list);
    setTotal(data.total);
  }

  useEffect(() => { load(""); }, []);

  return (
    <div>
      <h2 style={{ fontFamily: "Ma Shan Zheng, serif", fontSize: 40 }}>香材库 · {total} 种</h2>
      <p>向量检索的本地实现：对《香乘》《陈氏香谱》整理文本做 TF-IDF / 汉字二元语法检索，用来约束开方，而不是让模型自由发挥。</p>
      <input type="text" placeholder="搜：梅雨 安神 沉香 禁忌" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} />
      <div className="btn-row"><button className="btn ghost" onClick={() => load()}>检索</button></div>
      <div className="grid-2" style={{ marginTop: 16 }}>
        <div style={{ maxHeight: 640, overflow: "auto" }}>
          <table className="table">
            <thead><tr><th>香材</th><th>惯任</th><th>香韵</th><th>风险</th></tr></thead>
            <tbody>
              {list.map((m) => (
                <tr key={m.name} onClick={() => setCur(m)} style={{ cursor: "pointer" }}>
                  <td>{m.name}</td>
                  <td>{m.typicalRole}</td>
                  <td>{m.scentFamily}</td>
                  <td className={`risk-${m.risk}`}>{m.risk}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          {cur ? (
            <>
              <h3>{cur.name}</h3>
              <p>别名：{(cur.aliases || []).join("、") || "—"}</p>
              <p>性味：{cur.nature} · 分类：{cur.category} · 惯任{cur.typicalRole}</p>
              <p>头中尾：{cur.notes?.top} / {cur.notes?.mid} / {cur.notes?.base}</p>
              <p>炮制：{cur.processing}</p>
              <p>禁忌：{cur.contraindications}</p>
              <p>{cur.encyclopedia}</p>
              <p style={{ fontSize: 12 }}>出处：{cur.source}</p>
            </>
          ) : <p>点左侧一条，看炮制与禁忌。</p>}
        </div>
      </div>
    </div>
  );
}
