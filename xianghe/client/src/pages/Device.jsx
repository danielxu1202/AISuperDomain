import { useEffect, useState } from "react";
import { api } from "../api.js";

export default function Device() {
  const [data, setData] = useState(null);
  const [log, setLog] = useState("");
  useEffect(() => { api.device().then(setData); }, []);

  async function run(id) {
    const r = await api.runDevice(id);
    setLog(`${r.message} ${r.startedAt}`);
  }

  return (
    <div>
      <h2 style={{ fontFamily: "Ma Shan Zheng, serif", fontSize: 40 }}>AI 智能电熏（演示）</h2>
      <p>{data?.warning}</p>
      <div className="device">
        <div className="furnace">
          <div>低温电熏炉</div>
          <div className="slots" style={{ marginTop: 16 }}>
            {(data?.cartridges || []).map((c) => <div className="slot" key={c}>{c}</div>)}
          </div>
          <p style={{ position: "relative", zIndex: 1, marginTop: 24, fontSize: 12 }}>明火线香不做自动控制</p>
        </div>
        <div>
          {(data?.presets || []).map((p) => (
            <div className="card" key={p.id} style={{ marginBottom: 12 }}>
              <h3>{p.name}</h3>
              <p>温度 {p.temp}°C · {p.minutes} 分钟</p>
              <p>{Object.entries(p.slots).map(([k, v]) => `${k} ${v}min`).join(" · ")}</p>
              <button className="btn" onClick={() => run(p.id)}>模拟下发</button>
            </div>
          ))}
          {log && <div className="issue">{log}</div>}
        </div>
      </div>
    </div>
  );
}
