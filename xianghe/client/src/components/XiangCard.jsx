import { useRef } from "react";
import html2canvas from "html2canvas";

export default function XiangCard({ card }) {
  const ref = useRef(null);
  if (!card) return null;

  async function savePng() {
    const canvas = await html2canvas(ref.current, { scale: 2, backgroundColor: "#efe0bc" });
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `${card.title || "香笺"}.png`;
    a.click();
  }

  async function copyText() {
    const text = [
      card.title,
      ...(card.lines || []).map((l) => `${l.role} ${l.name} ${l.grams}g`),
      card.prose,
      "合香为雅事，非医药。",
    ].join("\n");
    await navigator.clipboard.writeText(text);
    alert("香方文本已复制");
  }

  return (
    <div>
      <div className="xiang-card" ref={ref}>
        <div className="seal-abs">香笺</div>
        <div className="meta">香乘新笺 · 君臣佐使</div>
        <h4>{card.title}</h4>
        <div className="meta">{[card.season, card.scene].filter(Boolean).join(" · ")}</div>
        <div className="lines">
          {(card.lines || []).map((l) => (
            <div className="line" key={l.role + l.name}>
              <span>{l.role}　{l.name}</span>
              <span>{l.grams}g</span>
            </div>
          ))}
        </div>
        <div className="prose">{card.prose}</div>
        <div className="foot">此方仅供参考，须真人试香。不可替代医疗。请勿密闭整夜燃香。</div>
      </div>
      <div className="btn-row" style={{ justifyContent: "center" }}>
        <button className="btn" onClick={savePng}>截图保存</button>
        <button className="btn ghost" onClick={copyText}>复制文本</button>
      </div>
    </div>
  );
}
