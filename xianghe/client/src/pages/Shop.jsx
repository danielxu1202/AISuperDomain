import { useEffect, useState } from "react";
import { api } from "../api.js";
import { useOutletContext } from "react-router-dom";

export default function Shop() {
  const [shop, setShop] = useState(null);
  const { me, setMe } = useOutletContext();
  useEffect(() => { api.shop().then(setShop); }, []);

  async function toggleVip() {
    const u = await api.setVip(!me?.vip);
    setMe({ ...u, vip: Boolean(u.vip), freeLimit: 3 });
  }

  return (
    <div>
      <h2 style={{ fontFamily: "Ma Shan Zheng, serif", fontSize: 40 }}>坊市与会员</h2>
      <div className="grid-2">
        <div className="card">
          <h3>C 端会员</h3>
          <p>免费每日 3 次简单开方。VIP 解锁完整书目对照、高危校验详述、复调不限。</p>
          <p>演示价：年度会员想象中是几十到一百元——这里只切换本地身份。</p>
          <button className="btn gold" onClick={toggleVip}>{me?.vip ? "关闭 VIP 演示" : "开通 VIP 演示"}</button>
        </div>
        <div className="card">
          <h3>B 端与文创</h3>
          <p>香企新品、二十四节气礼盒、景区 IP 香方、汉服主题香，都走同一套安全约束接口。</p>
          <p>数字香笺可配套线下体验课，而不是卖“疗效”。</p>
        </div>
      </div>
      <h3 style={{ marginTop: 24 }}>工具与原料（带货货架演示）</h3>
      <div className="grid-3">
        {(shop?.tools || []).map((t) => (
          <div className="card" key={t.sku}>
            <h3>{t.name}</h3>
            <p>{t.blurb}</p>
            <p>¥{t.price}</p>
            <button className="btn ghost" onClick={() => alert("演示：此处接香材电商与佣金。")}>配齐</button>
          </div>
        ))}
      </div>
      <p style={{ marginTop: 12 }}>{shop?.note}</p>
    </div>
  );
}
