import { NavLink, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../api.js";

const links = [
  ["/", "首页"],
  ["/generate", "开方"],
  ["/validate", "校验"],
  ["/diy", "手作"],
  ["/library", "香材"],
  ["/solar", "节气"],
  ["/studio", "香笺"],
  ["/device", "电熏"],
  ["/shop", "坊市"],
  ["/about", "凡例"],
];

export default function Layout() {
  const [me, setMe] = useState(null);
  useEffect(() => {
    api.me().then(setMe).catch(() => {});
  }, []);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <h1>香乘新笺</h1>
          <small>合香师助手</small>
        </div>
        <nav className="nav">
          {links.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => (isActive ? "active" : "")}>
              {label}
            </NavLink>
          ))}
        </nav>
        <span className="vip-chip">{me?.vip ? "VIP 已启" : `免费 ${me?.daily_count || 0}/${me?.freeLimit || 3}`}</span>
      </header>
      <div className="disclaimer">
        <b>安全红线</b>
        <span>合香是嗅觉文化休闲，不能替代治病。孕妇、哮喘、过敏请慎用。矿物类（朱砂等）禁止入方。输出仅供参考，须真人试香。</span>
      </div>
      <main className="page">
        <Outlet context={{ me, setMe }} />
      </main>
      <footer className="footer">
        香乘新笺 · 君臣佐使 · 香药同源不是医药 · 现阶段不能在手机上闻到味道 · 知识库 {me ? "" : ""}《香乘》《陈氏香谱》整理
      </footer>
    </div>
  );
}
