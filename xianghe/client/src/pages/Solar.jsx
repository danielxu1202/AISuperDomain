import { useEffect, useState } from "react";
import { api } from "../api.js";
import { useNavigate } from "react-router-dom";

export default function Solar() {
  const [list, setList] = useState([]);
  const [classics, setClassics] = useState([]);
  const nav = useNavigate();
  useEffect(() => {
    api.solar().then(setList);
    api.classics().then(setClassics);
  }, []);

  return (
    <div>
      <h2 style={{ fontFamily: "Ma Shan Zheng, serif", fontSize: 40 }}>二十四节气与古方</h2>
      <p>时令香不是日历贴纸：湿、燥、热、藏会改变君药选择。点击节气可带到开方页。</p>
      <div className="grid-3">
        {list.map((t) => (
          <div className="card" key={t.name} style={{ cursor: "pointer" }} onClick={() => nav(`/generate?season=${encodeURIComponent(t.name)}`)}>
            <h3>{t.name}</h3>
            <p>{t.mood}</p>
            <p>君{t.jun} · 臣{t.chen} · 佐{t.zuo} · 使{t.shi}</p>
            <p>{t.note}</p>
          </div>
        ))}
      </div>
      <h3 style={{ marginTop: 28 }}>古籍香方（现代安全改写）</h3>
      <div className="grid-2">
        {classics.map((c) => (
          <div className="card" key={c.name}>
            <h3>{c.name}</h3>
            <p>{c.source} · {c.era}</p>
            <p>{c.imagery}</p>
            <p>{c.optimize}</p>
            {c.dropped?.length ? <p>已剔除：{c.dropped.join("、")}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
