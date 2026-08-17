import { useState } from "react";
import { api } from "../api.js";

export default function Diy() {
  const [question, setQuestion] = useState("线香粘粉要加多少？梅雨季阴干要注意什么？");
  const [photoHint, setPhotoHint] = useState("");
  const [data, setData] = useState(null);

  async function ask() {
    setData(await api.diy({ question, photoHint }));
  }

  return (
    <div className="grid-2">
      <div>
        <h2 style={{ fontFamily: "Ma Shan Zheng, serif", fontSize: 40 }}>合香 DIY 助手</h2>
        <p>给手工玩家：细度、粘粉、湿度、阴干。照片识别在无视觉模型时，用描述关键词对照香材库。</p>
        <label className="field">工艺问题<textarea value={question} onChange={(e) => setQuestion(e.target.value)} /></label>
        <label className="field">
          香材外观描述（可代替拍照）
          <input type="text" placeholder="例如：黄褐对生叶，揉搓药草土甜" value={photoHint} onChange={(e) => setPhotoHint(e.target.value)} />
        </label>
        <button className="btn" onClick={ask}>请教助手</button>
      </div>
      <div>
        {data?.identify?.length > 0 && (
          <div className="card">
            <h3>可能的香材</h3>
            {data.identify.map((p) => (
              <p key={p.name}><b>{p.name}</b> — {p.tip}</p>
            ))}
          </div>
        )}
        {(data?.answers || []).map((a) => (
          <div className="card" key={a.q} style={{ marginTop: 12 }}>
            <h3>{a.q}</h3>
            <p>{a.a}</p>
          </div>
        ))}
        {data?.llmAnswer && (
          <div className="card" style={{ marginTop: 12 }}>
            <h3>模型补充</h3>
            <p style={{ whiteSpace: "pre-wrap" }}>{data.llmAnswer}</p>
          </div>
        )}
        {data && <p style={{ fontSize: 13, color: "#4a3b2f" }}>{data.disclaimer}</p>}
      </div>
    </div>
  );
}
