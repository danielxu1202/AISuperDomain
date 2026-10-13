export default function About() {
  return (
    <div>
      <h2 style={{ fontFamily: "Ma Shan Zheng, serif", fontSize: 40 }}>凡例：定位、人群与坑</h2>
      <div className="grid-2">
        <div className="card">
          <h3>AI 是助手，不是老师傅</h3>
          <p>古籍讲究炮制，模型容易纸上谈兵。每张方都写“仅供参考，须真人试香”。气味主观，所以做了太浓/太淡复调。</p>
        </div>
        <div className="card">
          <h3>三层产品</h3>
          <p>先做纯软件网页 MVP；再低温电熏联动；商业上会员、原料包佣金、B 端节气/文旅定制。不要幻想电子鼻已经廉价成熟。</p>
        </div>
        <div className="card">
          <h3>用户</h3>
          <p>入门爱好者要安全简单方；资深香友要校验与灵感；香厂要节气与礼品研发；汉服文旅要主题香 IP。</p>
        </div>
        <div className="card">
          <h3>红线</h3>
          <p>不宣传治病。朱砂等矿物严禁。孕妇哮喘过敏明确提示。青木香、细辛、麝香等一律拦截。</p>
        </div>
      </div>
    </div>
  );
}
