import { FormEvent, useMemo, useState } from "react";
import {
  Banknote,
  Building2,
  ChevronRight,
  CircleCheck,
  CreditCard,
  FileCheck2,
  Filter,
  KeyRound,
  Landmark,
  ListFilter,
  Search,
  ShieldCheck,
  WalletCards,
  X,
} from "lucide-react";
import styles from "./CoreWorkflowPages.module.css";
import extra from "./WorkflowEnhancements.module.css";
import type { RiskControl } from "./AdminControlPages";

export type CoreWorkflowView = "orders" | "cash" | "positions" | "settings";

type Role = "client" | "ops" | "master";

const orderSeed = [
  { id: "ORD-902181", user: "Carlos Ramírez", type: "股票", product: "AAPL", side: "买入", amount: "USD 22,719", status: "已记录", time: "2026-09-26 14:26" },
  { id: "ORD-902176", user: "Daniela Torres", type: "大宗", product: "WALMEX", side: "买入", amount: "MXN 146,825", status: "处理中", time: "2026-09-26 14:18" },
  { id: "ORD-902168", user: "Alejandro Ruiz", type: "股票", product: "NVDA", side: "卖出", amount: "USD 7,376", status: "已记录", time: "2026-09-26 13:52" },
  { id: "ORD-902149", user: "Fernanda Pérez", type: "基金", product: "FG-019", side: "申购", amount: "USD 25,000", status: "待确认", time: "2026-09-26 13:11" },
  { id: "ORD-902133", user: "Carlos Ramírez", type: "IPO", product: "TMX", side: "申购", amount: "MXN 96,000", status: "待配售", time: "2026-09-26 12:48" },
];

const cashSeed = [
  { id: "DEP-61028", user: "Carlos Ramírez", type: "充值", currency: "MXN", amount: "120,000.00", status: "待审核", bank: "BBVA México · ••7812", ref: "TRX889201", time: "14:02" },
  { id: "WDR-42018", user: "Daniela Torres", type: "提现", currency: "MXN", amount: "48,500.00", status: "审核中", bank: "Santander · ••3097", ref: "WD42018", time: "13:37" },
  { id: "DEP-61011", user: "Alejandro Ruiz", type: "充值", currency: "USD", amount: "18,000.00", status: "已通过", bank: "Citibanamex · ••5541", ref: "TRX887144", time: "11:42" },
  { id: "WDR-42002", user: "Fernanda Pérez", type: "提现", currency: "MXN", amount: "86,000.00", status: "已通过", bank: "Banorte · ••2248", ref: "WD42002", time: "10:18" },
];

const positionSeed = [
  { user: "Carlos Ramírez", symbol: "AAPL", name: "Apple Inc.", market: "US", quantity: 120, cost: 211.44, price: 227.19, currency: "USD" },
  { user: "Carlos Ramírez", symbol: "WALMEX", name: "Walmart de México", market: "MX", quantity: 600, cost: 54.72, price: 58.73, currency: "MXN" },
  { user: "Daniela Torres", symbol: "NVDA", name: "NVIDIA Corp.", market: "US", quantity: 80, cost: 171.05, price: 184.41, currency: "USD" },
  { user: "Alejandro Ruiz", symbol: "AMXL", name: "América Móvil", market: "MX", quantity: 1200, cost: 17.84, price: 18.94, currency: "MXN" },
  { user: "Fernanda Pérez", symbol: "TSLA", name: "Tesla Inc.", market: "US", quantity: 50, cost: 418.60, price: 443.21, currency: "USD" },
];

function Badge({ value }: { value: string }) {
  const cls =
    value.includes("通过") || value.includes("记录") || value.includes("完成") || value.includes("Aprobat") || value.includes("Înregistrat") || value.includes("Finalizat")
      ? styles.good
      : value.includes("拒绝") || value.includes("取消") || value.includes("Respins") || value.includes("Anulat")
        ? styles.bad
        : styles.wait;
  return <span className={cls}>{value}</span>;
}

function roStatus(value: string) {
  const map: Record<string, string> = {
    "已记录": "Înregistrat",
    "处理中": "În procesare",
    "待确认": "În așteptare",
    "待配售": "În alocare",
    "已配售": "Alocat",
    "已完成": "Finalizat",
    "已取消": "Anulat",
    "待审核": "În verificare",
    "审核中": "În analiză",
    "已通过": "Aprobat",
    "已拒绝": "Respins",
  };
  return map[value] || value;
}

function roType(value: string) {
  const map: Record<string, string> = {
    "股票": "Acțiuni",
    "大宗": "Bloc",
    "基金": "Fond",
    "充值": "Depunere",
    "提现": "Retragere",
    "买入": "Cumpărare",
    "卖出": "Vânzare",
    "申购": "Subscriere",
  };
  return map[value] || value;
}

export function CoreWorkflowPage({
  view,
  role,
  accountName,
  riskControls,
}: {
  view: CoreWorkflowView;
  role: Role;
  accountName: string;
  riskControls: RiskControl[];
}) {
  if (view === "orders") return <OrdersPage role={role} accountName={accountName} />;
  if (view === "cash") return <CashPage role={role} accountName={accountName} riskControls={riskControls} />;
  if (view === "positions") return <PositionsPage role={role} accountName={accountName} />;
  return <SettingsPage role={role} accountName={accountName} />;
}

function OrdersPage({ role, accountName }: { role: Role; accountName: string }) {
  const [rows, setRows] = useState(orderSeed);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("全部");
  const [selected, setSelected] = useState<(typeof orderSeed)[number] | null>(null);
  const [exported, setExported] = useState(false);
  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        const roleMatch = role !== "client" || row.user === accountName || row.user === "Carlos Ramírez";
        const typeMatch = type === "全部" || row.type === type;
        const textMatch = [row.id, row.user, row.product, row.status].join(" ").toLowerCase().includes(query.toLowerCase());
        return roleMatch && typeMatch && textMatch;
      }),
    [rows, query, type, role, accountName],
  );

  const transition = (id: string, status: string) =>
    setRows(rows.map((row) => (row.id === id ? { ...row, status } : row)));

  return (
    <div className={styles.stack}>
      <div className={styles.header}>
        <div><h1>{role === "client" ? "Ordinele mele" : "订单管理"}</h1><p>{role === "client" ? "Urmăriți starea ordinelor și istoricul operațiunilor." : "查看股票、大宗、IPO 与基金订单状态和处理记录"}</p></div>
        <button className={styles.secondary} onClick={() => setExported(true)}><Filter size={14}/> {role === "client" ? (exported ? "Export pregătit" : "Exportă") : (exported ? "已生成导出记录" : "导出筛选结果")}</button>
      </div>
      <section className={styles.filters}>
        <div className={styles.search}><Search size={14}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={role === "client" ? "Nr. ordin / produs / stare" : "订单号 / 客户 / 产品 / 状态"}/></div>
        <div className={styles.segment}>
          {["全部","股票","大宗","IPO","基金"].map((item) => <button key={item} className={type === item ? styles.activeSegment : ""} onClick={() => setType(item)}>{item}</button>)}
        </div>
      </section>
      <section className={styles.tablePanel}>
        <table>
          <thead><tr><th>{role === "client" ? "Nr. ordin" : "订单号"}</th>{role !== "client" ? <th>客户</th> : null}<th>{role === "client" ? "Tip" : "类型"}</th><th>{role === "client" ? "Produs" : "产品"}</th><th>{role === "client" ? "Direcție" : "方向"}</th><th>{role === "client" ? "Valoare" : "金额"}</th><th>{role === "client" ? "Stare" : "状态"}</th><th>{role === "client" ? "Timp" : "时间"}</th><th>{role === "client" ? "Acțiune" : "操作"}</th></tr></thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id}>
                <td className={styles.mono}>{row.id}</td>
                {role !== "client" ? <td>{row.user}</td> : null}
                <td>{role === "client" ? roType(row.type) : row.type}</td>
                <td className={styles.mono}>{row.product}</td>
                <td>{role === "client" ? roType(row.side) : row.side}</td>
                <td className={styles.mono}>{row.amount}</td>
                <td><Badge value={role === "client" ? roStatus(row.status) : row.status}/></td>
                <td>{row.time}</td>
                <td><div className={styles.actions}><button onClick={() => setSelected(row)}>详情</button>{role !== "client" && row.type === "IPO" && row.status === "待配售" ? <button onClick={() => transition(row.id, "已配售")}>配售</button> : null}{role !== "client" && ["待确认","处理中","已配售"].includes(row.status) ? <button onClick={() => transition(row.id, "已完成")}>完成</button> : null}{role === "client" && ["待确认","处理中","待配售"].includes(row.status) ? <button onClick={() => transition(row.id, "已取消")}>取消</button> : null}</div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {selected ? (
        <div className={styles.shade} onMouseDown={() => setSelected(null)}>
          <aside className={styles.drawer} onMouseDown={(e) => e.stopPropagation()}>
            <div className={styles.drawerHeader}><div><span>订单详情</span><h2>{selected.id}</h2></div><button onClick={() => setSelected(null)}><X size={18}/></button></div>
            <div className={styles.detailGrid}>
              <div><span>客户</span><strong>{selected.user}</strong></div>
              <div><span>类型</span><strong>{selected.type}</strong></div>
              <div><span>产品</span><strong>{selected.product}</strong></div>
              <div><span>方向</span><strong>{selected.side}</strong></div>
              <div><span>金额</span><strong>{selected.amount}</strong></div>
              <div><span>状态</span><Badge value={selected.status}/></div>
            </div>
            <section className={styles.timeline}>
              <h3>订单流程</h3>
              {["订单创建","资金校验","订单记录","状态更新"].map((label, index) => <div key={label}><i className={index < 3 ? styles.timelineDone : ""}/><span>{label}</span><small>{index === 0 ? selected.time : index === 1 ? "已完成" : index === 2 ? "已记录" : selected.status}</small></div>)}
            </section>
            <div className={styles.drawerFooter}><button className={styles.secondary} onClick={() => setSelected(null)}>关闭</button></div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function CashPage({
  role,
  accountName,
  riskControls,
}: {
  role: Role;
  accountName: string;
  riskControls: RiskControl[];
}) {
  const [rows, setRows] = useState(cashSeed);
  const [type, setType] = useState<"充值" | "提现">("充值");
  const [selected, setSelected] = useState<(typeof cashSeed)[number] | null>(null);
  const [creating, setCreating] = useState(false);
  const [amount, setAmount] = useState("50000");
  const [created, setCreated] = useState("");
  const [proofOpen, setProofOpen] = useState(false);
  const withdrawEnabled =
    riskControls.find((item) => item.key === "WITHDRAW")?.enabled ?? true;
  const visible = rows.filter((row) => row.type === type && (role !== "client" || row.user === "Carlos Ramírez" || row.user === accountName));

  const move = (id: string, status: string) => setRows(rows.map((row) => row.id === id ? { ...row, status } : row));

  const createRequest = (event: FormEvent) => {
    event.preventDefault();
    const id = `${type === "充值" ? "DEP" : "WDR"}-${String(70000 + rows.length * 13)}`;
    const next = { id, user: accountName || "Carlos Ramírez", type, currency: "MXN", amount: Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }), status: "待审核", bank: "BBVA México · ••7812", ref: id, time: "刚刚" };
    setRows([next, ...rows]);
    setCreated(id);
  };

  return (
    <div className={styles.stack}>
      <div className={styles.header}><div><h1>{role === "client" ? "Fonduri" : "资金审核"}</h1><p>{role === "client" ? "Depuneri, retrageri și starea solicitărilor." : "处理客户充值、提现与银行信息"}</p></div>{role === "client" ? <button className={styles.primary} disabled={type === "提现" && !withdrawEnabled} onClick={() => { if (type === "提现" && !withdrawEnabled) return; setCreating(true); setCreated(""); }}><Banknote size={14}/> Solicitare nouă</button> : null}</div>
      <div className={styles.summaryGrid}>
        <div><span>{role === "client" ? "Disponibil" : "可用资金"}</span><strong>MXN 186,240.00</strong></div>
        <div><span>{role === "client" ? "Blocat" : "冻结资金"}</span><strong>MXN 21,400.00</strong></div>
        <div><span>{role === "client" ? "Depuneri azi" : "今日充值"}</span><strong>MXN 120,000.00</strong></div>
        <div><span>{role === "client" ? "Retrageri azi" : "今日提现"}</span><strong>MXN 48,500.00</strong></div>
      </div>
      <div className={styles.segmentWide}><button className={type === "充值" ? styles.activeSegment : ""} onClick={() => setType("充值")}>{role === "client" ? "Depuneri" : "充值申请"}</button><button className={type === "提现" ? styles.activeSegment : ""} disabled={role === "client" && !withdrawEnabled} onClick={() => withdrawEnabled && setType("提现")}>{role === "client" ? "Retrageri" : "提现申请"}</button></div>
      {role === "client" && !withdrawEnabled ? <div className={extra.riskNotice}>Retragerile sunt restricționate temporar de controlul de risc.</div> : null}
      <section className={styles.tablePanel}>
        <table>
          <thead><tr><th>申请号</th>{role !== "client" ? <th>客户</th> : null}<th>币种</th><th>金额</th><th>银行信息</th><th>参考号</th><th>状态</th><th>时间</th><th>操作</th></tr></thead>
          <tbody>{visible.map((row) => <tr key={row.id}><td className={styles.mono}>{row.id}</td>{role !== "client" ? <td>{row.user}</td> : null}<td>{row.currency}</td><td className={styles.mono}>{row.amount}</td><td>{row.bank}</td><td className={styles.mono}>{row.ref}</td><td><Badge value={role === "client" ? roStatus(row.status) : row.status}/></td><td>{row.time}</td><td><div className={styles.actions}><button onClick={() => setSelected(row)}>查看</button>{role !== "client" && !["已通过","已拒绝"].includes(row.status) ? <><button onClick={() => move(row.id, "已通过")}>通过</button><button onClick={() => move(row.id, "已拒绝")}>拒绝</button></> : null}</div></td></tr>)}</tbody>
        </table>
      </section>
      {selected ? (
        <div className={styles.shade} onMouseDown={() => setSelected(null)}>
          <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
            <div className={styles.drawerHeader}><div><span>{selected.type}申请</span><h2>{selected.id}</h2></div><button onClick={() => setSelected(null)}><X size={18}/></button></div>
            <div className={styles.detailGrid}><div><span>客户</span><strong>{selected.user}</strong></div><div><span>金额</span><strong>{selected.currency} {selected.amount}</strong></div><div><span>银行信息</span><strong>{selected.bank}</strong></div><div><span>状态</span><Badge value={selected.status}/></div></div>
            <section className={styles.proof}><FileCheck2 size={26}/><div><strong>{selected.type === "充值" ? "付款凭证" : "银行账户快照"}</strong><span>{selected.type === "充值" ? "已提交凭证 · 可查看凭证信息" : "申请时账户信息已锁定"}</span></div><button onClick={() => setProofOpen(!proofOpen)}>{proofOpen ? "收起" : "查看"}</button></section>
            {proofOpen ? <section className={extra.proofDetail}><div><span>文件编号</span><strong>{selected.ref}-DOC</strong></div><div><span>提交时间</span><strong>{selected.time}</strong></div><div><span>校验状态</span><strong>资料完整</strong></div></section> : null}
            <div className={styles.drawerFooter}><button className={styles.secondary} onClick={() => setSelected(null)}>关闭</button></div>
          </div>
        </div>
      ) : null}
      {creating ? (
        <div className={styles.shade}>
          <div className={styles.modal}>
            <div className={styles.drawerHeader}><div><span>资金申请</span><h2>新建{type}申请</h2></div><button onClick={() => setCreating(false)}><X size={18}/></button></div>
            {!created ? <form className={styles.form} onSubmit={createRequest}><label><span>币种</span><select><option>MXN</option><option>USD</option></select></label><label><span>金额</span><input value={amount} onChange={(e) => setAmount(e.target.value)}/></label><label><span>银行账户</span><select><option>BBVA México · ••7812</option><option>Santander · ••3097</option></select></label>{type === "充值" ? <label><span>付款参考号</span><input placeholder="输入银行转账参考号"/></label> : <label><span>交易密码</span><input type="password" placeholder="输入交易密码"/></label>}<button className={styles.primary} type="submit">提交申请</button></form> : <div className={styles.doneBox}><CircleCheck size={34}/><h3>申请已提交</h3><p>申请编号 {created}</p><button className={styles.primary} onClick={() => setCreating(false)}>完成</button></div>}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PositionsPage({ role, accountName }: { role: Role; accountName: string }) {
  const [selected, setSelected] = useState<(typeof positionSeed)[number] | null>(null);
  const [market, setMarket] = useState<"ALL"|"US"|"MX">("ALL");
  const visible = positionSeed.filter((row) => (role !== "client" || row.user === "Carlos Ramírez" || row.user === accountName) && (market === "ALL" || row.market === market));
  return (
    <div className={styles.stack}>
      <div className={styles.header}><div><h1>{role === "client" ? "Pozițiile mele" : "客户持仓"}</h1><p>{role === "client" ? "Cantitate, cost, valoare și variația pozițiilor curente." : "查看当前证券数量、成本、市值与浮动变化"}</p></div><div className={extra.marketFilter}>{(["ALL","US","MX"] as const).map((item)=><button key={item} className={market===item?extra.marketFilterActive:""} onClick={()=>setMarket(item)}>{item==="ALL"?(role === "client" ? "Toate" : "全部"):item}</button>)}</div></div>
      <div className={styles.summaryGrid}><div><span>持仓市值</span><strong>MXN 248,630.80</strong></div><div><span>累计成本</span><strong>MXN 226,410.20</strong></div><div><span>浮动金额</span><strong className={styles.positive}>+22,220.60</strong></div><div><span>持仓项目</span><strong>{visible.length}</strong></div></div>
      <section className={styles.tablePanel}><table><thead><tr>{role !== "client" ? <th>客户</th> : null}<th>证券</th><th>市场</th><th>数量</th><th>平均成本</th><th>现价</th><th>市值</th><th>浮动</th><th>操作</th></tr></thead><tbody>{visible.map((row) => { const pnl = (row.price-row.cost)*row.quantity; const pct=(row.price-row.cost)/row.cost*100; return <tr key={row.user+row.symbol}>{role !== "client" ? <td>{row.user}</td> : null}<td><strong>{row.symbol}</strong><span>{row.name}</span></td><td>{row.market}</td><td className={styles.mono}>{row.quantity.toLocaleString()}</td><td className={styles.mono}>{row.cost.toFixed(2)}</td><td className={styles.mono}>{row.price.toFixed(2)}</td><td className={styles.mono}>{row.currency} {(row.price*row.quantity).toLocaleString(undefined,{maximumFractionDigits:2})}</td><td className={pnl>=0?styles.positive:styles.negative}>{pnl>=0?"+":""}{pnl.toFixed(2)} · {pct.toFixed(2)}%</td><td><button className={styles.linkButton} onClick={() => setSelected(row)}>详情</button></td></tr>; })}</tbody></table></section>
      {selected ? <div className={styles.shade} onMouseDown={() => setSelected(null)}><aside className={styles.drawer} onMouseDown={(e) => e.stopPropagation()}><div className={styles.drawerHeader}><div><span>持仓详情</span><h2>{selected.symbol}</h2></div><button onClick={() => setSelected(null)}><X size={18}/></button></div><div className={styles.positionHero}><strong>{selected.price.toFixed(2)}</strong><span>{selected.name} · {selected.market}</span></div><div className={styles.detailGrid}><div><span>客户</span><strong>{selected.user}</strong></div><div><span>数量</span><strong>{selected.quantity.toLocaleString()}</strong></div><div><span>平均成本</span><strong>{selected.cost.toFixed(2)}</strong></div><div><span>当前价格</span><strong>{selected.price.toFixed(2)}</strong></div></div><section className={styles.drawerSection}><h3>持仓记录</h3><div className={styles.miniTimeline}><div><i/><span>09/22</span><strong>首次买入</strong><small>40%</small></div><div><i/><span>09/24</span><strong>追加持仓</strong><small>35%</small></div><div><i/><span>09/26</span><strong>当前持仓</strong><small>100%</small></div></div></section></aside></div> : null}
    </div>
  );
}

function SettingsPage({ role, accountName }: { role: Role; accountName: string }) {
  const [section, setSection] = useState<"security"|"bank"|"identity"|"permissions"|null>(null);
  const [saved, setSaved] = useState("");
  const [banks, setBanks] = useState([
    { name: "BBVA México", number: "•••• 7812", primary: true },
    { name: "Santander", number: "•••• 3097", primary: false },
  ]);
  const [addingBank, setAddingBank] = useState(false);
  const [bankName, setBankName] = useState("");
  const [bankNumber, setBankNumber] = useState("");
  const cards = role === "client"
    ? [
        ["security","Securitate",ShieldCheck,"Parole și sesiuni active"],
        ["bank","Conturi bancare",CreditCard,"Gestionați conturile bancare asociate"],
        ["identity","Verificare identitate",FileCheck2,"Starea verificării contului"],
      ] as const
    : [
        ["security","登录与安全",ShieldCheck,"后台密码、2FA 与会话"],
        ["permissions","权限管理",KeyRound,"市场、产品与操作权限"],
        ["bank","资金账户",CreditCard,"维护平台银行信息"],
        ["identity","资料审核",FileCheck2,"身份资料与审核规则"],
      ] as const;
  return (
    <div className={styles.stack}>
      <div className={styles.header}><div><h1>{role === "client" ? "Setări" : "系统设置"}</h1><p>{role === "client" ? "Cont, securitate și informații bancare." : "账户、安全、银行和权限设置"}</p></div></div>
      <div className={styles.settingsGrid}>{cards.map(([key,title,Icon,desc]) => <button key={key} onClick={() => { setSection(key); setSaved(""); }}><div className={styles.settingsIcon}><Icon size={20}/></div><div><strong>{title}</strong><span>{desc}</span></div><ChevronRight size={16}/></button>)}</div>
      {section ? <div className={styles.shade} onMouseDown={() => setSection(null)}><div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}><div className={styles.drawerHeader}><div><span>账户设置</span><h2>{cards.find((item)=>item[0]===section)?.[1]}</h2></div><button onClick={() => setSection(null)}><X size={18}/></button></div>{section==="security"?<div className={styles.form}><label><span>当前账户</span><input value={accountName} readOnly/></label><label><span>当前密码</span><input type="password"/></label><label><span>新密码</span><input type="password"/></label><label><span>确认新密码</span><input type="password"/></label>{saved?<div className={extra.savedMessage}>{saved}</div>:null}<button className={styles.primary} onClick={()=>setSaved("密码设置已保存")}>保存密码</button></div>:null}{section==="bank"?<div className={styles.bankList}>{banks.map((bank,index)=><article key={bank.name+index}><div className={styles.bankIcon}>{index===0?<Building2 size={18}/>:<Landmark size={18}/>}</div><div><strong>{bank.name}</strong><span>{bank.number} · MXN{bank.primary?" · 默认账户":""}</span></div>{bank.primary?<Badge value="已绑定"/>:<button className={styles.linkButton} onClick={()=>setBanks(banks.map((item,i)=>({...item,primary:i===index})))}>设为默认</button>}</article>)}{addingBank?<form className={extra.inlineBankForm} onSubmit={(event)=>{event.preventDefault();setBanks([...banks,{name:bankName||"新银行",number:bankNumber||"•••• 0000",primary:false}]);setAddingBank(false);setBankName("");setBankNumber("");}}><input value={bankName} onChange={(e)=>setBankName(e.target.value)} placeholder="银行名称"/><input value={bankNumber} onChange={(e)=>setBankNumber(e.target.value)} placeholder="账户尾号"/><button className={styles.primary} type="submit">添加</button></form>:<button className={styles.addBank} onClick={()=>setAddingBank(true)}><CreditCard size={16}/> 添加银行卡</button>}</div>:null}{section==="identity"?<div className={styles.identityPanel}><div><FileCheck2 size={28}/><strong>实名认证已完成</strong><span>姓名：{accountName || "Carlos Ramírez"}</span><span>证件：MEX••••••2481</span></div><button className={styles.secondary} onClick={()=>setSaved("身份资料完整，当前状态正常")}>查看身份资料</button>{saved?<div className={extra.savedMessage}>{saved}</div>:null}</div>:null}{section==="permissions"?<div className={styles.permissionList}>{["US 市场","MX 市场","股票","大宗","IPO","基金","客户审核","资金审核"].map((label)=><label key={label}><span>{label}</span><input type="checkbox" defaultChecked={label!=="IPO"}/></label>)}{saved?<div className={extra.savedMessage}>{saved}</div>:null}<button className={styles.primary} onClick={()=>setSaved("权限设置已保存")}>保存权限</button></div>:null}</div></div> : null}
    </div>
  );
}
