import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../api.js";

export default function Home() {
  const [health, setHealth] = useState(null);
  useEffect(() => {
    api.health().then(setHealth).catch(() => {});
  }, []);

  return (
    <div>
      <section className="hero">
        <div>
          <h2>合香不是调气味，<br />是君臣佐使。</h2>
          <p className="lead">
            AI 在这里只做合香师助手：检索《香乘》《陈氏香谱》与 {health?.materials || 160} 种天然香材，
            约束大模型输出克数、炮制、步骤与禁忌。它不能替代老师傅，也不能让你在手机上闻到味道。
          </p>
          <div className="btn-row">
            <Link className="btn" to="/generate">自然语言开方</Link>
            <Link className="btn ghost" to="/validate">校验民间香方</Link>
          </div>
        </div>
        <div className="card">
          <div className="seal">雅</div>
          <p style={{ marginTop: 16, lineHeight: 1.8 }}>
            示例：「南方梅雨季，书房用，祛湿安神，不要味道太冲」
            <br />君广藿香、臣苍术、佐合欢、使檀香——再写下炮制与不宜密闭整夜。
          </p>
        </div>
      </section>

      <div className="grid-3" style={{ marginTop: 28 }}>
        {[
          ["01", "开方", "情绪、节气、场景、故事意象都能入方。", "/generate"],
          ["02", "校验", "粘贴网方，拦朱砂、减重香、改小户型。", "/validate"],
          ["03", "手作", "打粉、粘粉、和泥、阴干，工艺答疑。", "/diy"],
          ["04", "香笺", "国风卡片，保存截图，朋友圈可传。", "/studio"],
          ["05", "电熏", "低温电熏演示，明火不做智能控制。", "/device"],
          ["06", "坊市", "原料包与工具带货入口（演示）。", "/shop"],
        ].map(([idx, title, desc, to]) => (
          <Link className="card" key={idx} to={to}>
            <span className="idx">{idx}</span>
            <h3>{title}</h3>
            <p>{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
