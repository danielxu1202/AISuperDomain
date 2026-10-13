import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import FormulaPanel, { formulaToCard } from "../components/FormulaPanel.jsx";
import XiangCard from "../components/XiangCard.jsx";

const EMOS = ["焦虑", "助眠", "提神", "静心", "安神"];
const SCENES = ["书房", "茶室", "枕边", "车内", "梅雨", "礼佛"];
const SEASONS = ["梅雨", "大暑", "深秋", "冬至", "春分", "立冬"];

export default function Generate() {
  const [params] = useSearchParams();
  const [query, setQuery] = useState("南方梅雨季，书房用，祛湿安神，不要味道太冲");
  const [emotion, setEmotion] = useState("");
  const [season, setSeason] = useState(params.get("season") || "");
  const [scene, setScene] = useState("");
  const [imagery, setImagery] = useState("");
  const [form, setForm] = useState("线香");
  const [pregnant, setPregnant] = useState(false);
  const [asthma, setAsthma] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [card, setCard] = useState(null);

  useEffect(() => {
    const s = params.get("season");
    if (s) {
      setSeason(s);
      setQuery((q) => (q.includes(s) ? q : `${s}，${q}`));
    }
  }, [params]);

  async function submit() {
    setLoading(true);
    setError("");
    setCard(null);
    try {
      const data = await api.generate({ query, emotion, season, scene, imagery, form, pregnant, asthma, mild: true });
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function adjust(rating) {
    if (!result?.id) return;
    setLoading(true);
    try {
      const data = await api.adjust({ formulaId: result.id, rating });
      setResult(data);
      setCard(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function makeCard() {
    const payload = formulaToCard(result);
    setCard(payload);
    await api.saveCard({ formulaId: result.id, title: payload.title, ...payload });
  }

  return (
    <div className="grid-2">
      <div>
        <h2 style={{ fontFamily: "Ma Shan Zheng, serif", fontSize: 40 }}>自然语言开方</h2>
        <label className="field">
          描述
          <textarea value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <div>情绪</div>
        <div className="chips">
          {EMOS.map((x) => (
            <span key={x} className={`chip ${emotion === x ? "on" : ""}`} onClick={() => setEmotion(emotion === x ? "" : x)}>{x}</span>
          ))}
        </div>
        <div>时令</div>
        <div className="chips">
          {SEASONS.map((x) => (
            <span key={x} className={`chip ${season === x ? "on" : ""}`} onClick={() => setSeason(season === x ? "" : x)}>{x}</span>
          ))}
        </div>
        <div>场景</div>
        <div className="chips">
          {SCENES.map((x) => (
            <span key={x} className={`chip ${scene === x ? "on" : ""}`} onClick={() => setScene(scene === x ? "" : x)}>{x}</span>
          ))}
        </div>
        <label className="field">
          故事意象
          <input type="text" placeholder="西湖落雪 / 古寺庙的味道" value={imagery} onChange={(e) => setImagery(e.target.value)} />
        </label>
        <label className="field">
          形制
          <select value={form} onChange={(e) => setForm(e.target.value)}>
            <option>线香</option>
            <option>香丸</option>
            <option>电熏</option>
          </select>
        </label>
        <label><input type="checkbox" checked={pregnant} onChange={(e) => setPregnant(e.target.checked)} /> 孕妇相关，请回避热辛窜</label>
        <br />
        <label><input type="checkbox" checked={asthma} onChange={(e) => setAsthma(e.target.checked)} /> 哮喘 / 呼吸道敏感</label>
        <div className="btn-row">
          <button className="btn" disabled={loading} onClick={submit}>{loading ? "检索开方中…" : "生成香方"}</button>
        </div>
        {error && <div className="issue block">{error}</div>}
      </div>
      <div>
        <FormulaPanel result={result} onAdjust={adjust} onCard={makeCard} />
        {card && <div style={{ marginTop: 20 }}><XiangCard card={card} /></div>}
      </div>
    </div>
  );
}
