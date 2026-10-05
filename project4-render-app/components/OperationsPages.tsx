import { FormEvent, useMemo, useState } from "react";
import {
  Bell,
  Building2,
  ChevronRight,
  CircleCheck,
  Clock3,
  FileClock,
  KeyRound,
  Landmark,
  Layers3,
  Search,
  ShieldCheck,
  UserPlus,
  X,
} from "lucide-react";
import styles from "./OperationsPages.module.css";
import extra from "./WorkflowEnhancements.module.css";

export type OperationsView =
  | "products"
  | "loans"
  | "notifications"
  | "opsAccounts"
  | "audit";

type ProductStatus = "已上架" | "已暂停" | "已结束";

type Product = {
  id: string;
  type: "大宗" | "IPO" | "基金";
  title: string;
  symbol: string;
  market: "US" | "MX";
  status: ProductStatus;
  value: string;
  window: string;
};

const startingProducts: Product[] = [
  { id: "PRD-BLK-028", type: "大宗", title: "Apple Inc. 大宗项目", symbol: "AAPL", market: "US", status: "已上架", value: "折让 8.0%", window: "09/26 09:00–15:00" },
  { id: "PRD-IPO-014", type: "IPO", title: "Tecnología MX 新股申购", symbol: "TMX", market: "MX", status: "已上架", value: "发行价 MXN 48.00", window: "09/25–09/29" },
  { id: "PRD-FND-019", type: "基金", title: "US Growth Select", symbol: "FG-019", market: "US", status: "已上架", value: "最低 USD 2,500", window: "开放申购" },
  { id: "PRD-BLK-021", type: "大宗", title: "Walmart de México", symbol: "WALMEX", market: "MX", status: "已暂停", value: "折让 5.5%", window: "待恢复" },
];

const loansSeed = [
  { id: "LN-20481", name: "Carlos Ramírez", amount: "MXN 160,000", status: "待审核", date: "2026-09-26 13:42" },
  { id: "LN-20476", name: "Daniela Torres", amount: "MXN 80,000", status: "审核中", date: "2026-09-26 11:08" },
  { id: "LN-20455", name: "Alejandro Ruiz", amount: "USD 12,000", status: "已通过", date: "2026-09-25 16:34" },
  { id: "LN-20441", name: "Fernanda Pérez", amount: "MXN 240,000", status: "已拒绝", date: "2026-09-25 09:16" },
];

const noticesSeed = [
  { id: "NT-9081", name: "Carlos Ramírez", type: "购买授权", subject: "AAPL 大宗购买码", status: "待分配", time: "14:08" },
  { id: "NT-9079", name: "Daniela Torres", type: "身份资料", subject: "补充实名认证资料", status: "已分配", time: "13:54" },
  { id: "NT-9072", name: "Alejandro Ruiz", type: "资金确认", subject: "提现申请确认", status: "已联系", time: "12:33" },
  { id: "NT-9068", name: "Fernanda Pérez", type: "产品通知", subject: "基金申购确认", status: "已确认", time: "11:58" },
];

const auditSeed = [
  { id: "AUD-88214", actor: "Master Admin", action: "修改客户交易权限", target: "1035817", time: "2026-09-26 14:21:48", ip: "10.0.18.24" },
  { id: "AUD-88209", actor: "OPS-MX-01", action: "实名认证审核通过", target: "1035821", time: "2026-09-26 14:03:15", ip: "10.0.24.18" },
  { id: "AUD-88197", actor: "Master Admin", action: "更新基金产品状态", target: "PRD-FND-019", time: "2026-09-26 13:35:26", ip: "10.0.18.24" },
  { id: "AUD-88188", actor: "OPS-MX-01", action: "确认充值申请", target: "DEP-61028", time: "2026-09-26 13:10:44", ip: "10.0.24.18" },
  { id: "AUD-88171", actor: "Master Admin", action: "创建子账户", target: "OPS-US-04", time: "2026-09-26 12:42:08", ip: "10.0.18.24" },
];

const opsAccountsSeed = [
  { id: "OPS-MX-01", name: "Mexico Operations 01", manager: "Fernanda Pérez", markets: "MX", clients: 428, status: "启用", invite: "MX8P2K" },
  { id: "OPS-US-02", name: "US Operations 02", manager: "Daniel Ruiz", markets: "US", clients: 316, status: "启用", invite: "US4Q9T" },
  { id: "OPS-MIX-03", name: "Cross Market 03", manager: "Lucía Torres", markets: "US + MX", clients: 198, status: "暂停", invite: "MX2L7D" },
];

function Status({ value }: { value: string }) {
  const tone =
    value.includes("通过") || value.includes("确认") || value.includes("上架") || value === "启用"
      ? styles.good
      : value.includes("拒绝") || value.includes("结束")
        ? styles.bad
        : styles.wait;
  return <span className={tone}>{value}</span>;
}

export function OperationsPage({
  view,
  role,
}: {
  view: OperationsView;
  role: "client" | "ops" | "master";
}) {
  if (view === "products") return <ProductsPage role={role} />;
  if (view === "loans") return <LoansPage role={role} />;
  if (view === "notifications") return <NotificationsPage role={role} />;
  if (view === "opsAccounts") return <OpsAccountsPage />;
  return <AuditPage />;
}

function ProductsPage({ role }: { role: "client" | "ops" | "master" }) {
  const [type, setType] = useState<"大宗" | "IPO" | "基金">("大宗");
  const [products, setProducts] = useState(startingProducts);
  const [selected, setSelected] = useState<Product | null>(null);
  const [clientProduct, setClientProduct] = useState<Product | null>(null);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [productTitle, setProductTitle] = useState("");
  const [productSymbol, setProductSymbol] = useState("");
  const [amount, setAmount] = useState("50000");
  const [submitMessage, setSubmitMessage] = useState("");
  const rows = products.filter((item) => item.type === type);
  const updateStatus = (id: string, status: ProductStatus) =>
    setProducts(products.map((item) => (item.id === id ? { ...item, status } : item)));

  return (
    <div className={styles.stack}>
      <div className={styles.header}>
        <div>
          <h1>{role === "master" ? "产品管理" : role === "ops" ? "产品运营" : "产品中心"}</h1>
          <p>{role === "master" ? "大宗、IPO 与基金项目统一配置和状态管理" : role === "ops" ? "查看当前开放项目、客户范围与运营状态" : "查看当前可参与的大宗、IPO 与基金项目"}</p>
        </div>
        {role === "master" ? <button className={styles.primary} onClick={() => setCreatingProduct(true)}><Layers3 size={15} /> 创建产品</button> : null}
      </div>
      <div className={styles.tabs}>
        {(["大宗", "IPO", "基金"] as const).map((item) => (
          <button key={item} className={type === item ? styles.tabActive : ""} onClick={() => setType(item)}>
            {item}
            <span>{products.filter((p) => p.type === item).length}</span>
          </button>
        ))}
      </div>
      <section className={styles.tablePanel}>
        <table>
          <thead><tr><th>产品编号</th><th>产品</th><th>证券</th><th>市场</th><th>核心参数</th><th>开放时间</th><th>状态</th><th>操作</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className={styles.mono}>{row.id}</td>
                <td><strong>{row.title}</strong><span>{row.type}产品</span></td>
                <td className={styles.mono}>{row.symbol}</td>
                <td>{row.market}</td>
                <td>{row.value}</td>
                <td>{row.window}</td>
                <td><Status value={row.status} /></td>
                <td>
                  <div className={styles.actions}>
                    <button onClick={() => setSelected(row)}>详情</button>
                    {role === "master" && row.status === "已上架" ? <button onClick={() => updateStatus(row.id, "已暂停")}>暂停</button> : null}
                    {role === "master" && row.status === "已暂停" ? <button onClick={() => updateStatus(row.id, "已上架")}>恢复</button> : null}
                    {role === "master" && row.status !== "已结束" ? <button onClick={() => updateStatus(row.id, "已结束")}>结束</button> : null}
                    {role === "client" && row.status === "已上架" ? (
                      <button onClick={() => { setClientProduct(row); setSubmitMessage(""); }}>进入</button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {selected ? (
        <div className={styles.shade} onMouseDown={() => setSelected(null)}>
          <aside className={styles.drawer} onMouseDown={(e) => e.stopPropagation()}>
            <div className={styles.drawerHeader}><div><span>产品详情</span><h2>{selected.title}</h2></div><button onClick={() => setSelected(null)}><X size={18}/></button></div>
            <div className={styles.detailGrid}>
              <div><span>产品编号</span><strong>{selected.id}</strong></div>
              <div><span>产品类型</span><strong>{selected.type}</strong></div>
              <div><span>证券代码</span><strong>{selected.symbol}</strong></div>
              <div><span>市场</span><strong>{selected.market}</strong></div>
              <div><span>核心参数</span><strong>{selected.value}</strong></div>
              <div><span>当前状态</span><Status value={selected.status}/></div>
            </div>
            <section className={styles.drawerSection}>
              <h3>客户条件</h3>
              <label><span>允许等级</span><input defaultValue="VIP1 / VIP2 / VIP3 / VIP4 / VIP5"/></label>
              <label><span>单客户额度</span><input defaultValue={selected.type === "大宗" ? "MXN 2,000,000" : "MXN 500,000"}/></label>
              <label><span>开放窗口</span><input defaultValue={selected.window}/></label>
            </section>
            <div className={styles.drawerFooter}><button className={styles.secondary} onClick={() => setSelected(null)}>关闭</button><button className={styles.primary} onClick={() => setSelected(null)}>保存配置</button></div>
          </aside>
        </div>
      ) : null}
      {clientProduct ? (
        <div className={styles.shade} onMouseDown={() => setClientProduct(null)}>
          <div className={styles.modal} onMouseDown={(event) => event.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <div><span>{clientProduct.type}项目</span><h2>{clientProduct.title}</h2></div>
              <button onClick={() => setClientProduct(null)}><X size={18}/></button>
            </div>
            <div className={styles.detailGrid}>
              <div><span>证券 / 产品</span><strong>{clientProduct.symbol}</strong></div>
              <div><span>市场</span><strong>{clientProduct.market}</strong></div>
              <div><span>项目条件</span><strong>{clientProduct.value}</strong></div>
              <div><span>开放时间</span><strong>{clientProduct.window}</strong></div>
            </div>
            <section className={styles.drawerSection}>
              <h3>{clientProduct.type === "IPO" ? "申购信息" : "参与信息"}</h3>
              <label><span>提交金额</span><input value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
              <label><span>确认密码</span><input type="password" placeholder="请输入交易确认密码" /></label>
              {submitMessage ? <div className={extra.successMessage}>{submitMessage}</div> : null}
            </section>
            <div className={styles.drawerFooter}>
              <button className={styles.secondary} onClick={() => setClientProduct(null)}>取消</button>
              <button
                className={styles.primary}
                onClick={() => setSubmitMessage(`${clientProduct.type === "IPO" ? "申购" : "订单"}已提交：${clientProduct.symbol} · ${amount}`)}
              >
                {clientProduct.type === "IPO" ? "提交申购" : "提交订单"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {creatingProduct ? (
        <div className={styles.shade}>
          <form
            className={styles.modal}
            onSubmit={(event) => {
              event.preventDefault();
              const nextId = `PRD-${type === "大宗" ? "BLK" : type === "IPO" ? "IPO" : "FND"}-${String(products.length + 30).padStart(3, "0")}`;
              setProducts([
                {
                  id: nextId,
                  type,
                  title: productTitle.trim() || `${productSymbol || "NEW"} ${type}项目`,
                  symbol: productSymbol.trim().toUpperCase() || "NEW",
                  market: "MX",
                  status: "已上架",
                  value: type === "大宗" ? "折让 6.0%" : type === "IPO" ? "发行价 MXN 50.00" : "最低 MXN 10,000",
                  window: "当前开放",
                },
                ...products,
              ]);
              setCreatingProduct(false);
              setProductTitle("");
              setProductSymbol("");
            }}
          >
            <div className={styles.drawerHeader}><div><span>总账户产品配置</span><h2>创建{type}产品</h2></div><button type="button" onClick={() => setCreatingProduct(false)}><X size={18}/></button></div>
            <div className={styles.form}>
              <label><span>产品名称</span><input value={productTitle} onChange={(event) => setProductTitle(event.target.value)} placeholder="输入产品名称"/></label>
              <label><span>证券 / 产品代码</span><input value={productSymbol} onChange={(event) => setProductSymbol(event.target.value)} placeholder="例如 WALMEX"/></label>
              <label><span>市场</span><select><option>MX</option><option>US</option></select></label>
              <label><span>开放条件</span><input defaultValue={type === "大宗" ? "折让 6.0%" : type === "IPO" ? "发行价 MXN 50.00" : "最低 MXN 10,000"}/></label>
              <button className={styles.primary} type="submit">创建并上架</button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function LoansPage({ role }: { role: "client" | "ops" | "master" }) {
  const [rows, setRows] = useState(loansSeed);
  const [selected, setSelected] = useState<(typeof loansSeed)[number] | null>(null);
  const [creating, setCreating] = useState(false);
  const [loanAmount, setLoanAmount] = useState("50000");
  const update = (id: string, status: string) =>
    setRows(rows.map((row) => (row.id === id ? { ...row, status } : row)));

  return (
    <div className={styles.stack}>
      <div className={styles.header}><div><h1>{role === "client" ? "我的贷款" : "贷款申请"}</h1><p>{role === "client" ? "查看贷款申请与审核进度" : "审核客户贷款申请和查看处理记录"}</p></div>{role === "client" ? <button className={styles.primary} onClick={() => setCreating(true)}><Landmark size={15}/> 新申请</button> : null}</div>
      <section className={styles.tablePanel}>
        <table>
          <thead><tr><th>申请编号</th>{role !== "client" ? <th>客户</th> : null}<th>申请金额</th><th>状态</th><th>申请时间</th><th>操作</th></tr></thead>
          <tbody>
            {rows.slice(0, role === "client" ? 2 : rows.length).map((row) => (
              <tr key={row.id}>
                <td className={styles.mono}>{row.id}</td>
                {role !== "client" ? <td>{row.name}</td> : null}
                <td className={styles.mono}>{row.amount}</td>
                <td><Status value={row.status}/></td>
                <td>{row.date}</td>
                <td><div className={styles.actions}><button onClick={() => setSelected(row)}>查看</button>{role !== "client" && row.status !== "已通过" && row.status !== "已拒绝" ? <><button onClick={() => update(row.id, "已通过")}>通过</button><button onClick={() => update(row.id, "已拒绝")}>拒绝</button></> : null}</div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {selected ? (
        <div className={styles.shade} onMouseDown={() => setSelected(null)}>
          <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
            <div className={styles.drawerHeader}><div><span>贷款申请</span><h2>{selected.id}</h2></div><button onClick={() => setSelected(null)}><X size={18}/></button></div>
            <div className={styles.detailGrid}><div><span>客户</span><strong>{selected.name}</strong></div><div><span>申请金额</span><strong>{selected.amount}</strong></div><div><span>申请时间</span><strong>{selected.date}</strong></div><div><span>当前状态</span><Status value={selected.status}/></div></div>
            <section className={styles.drawerSection}><h3>审核说明</h3><textarea placeholder="输入审核备注或说明" /></section>
            <div className={styles.drawerFooter}><button className={styles.secondary} onClick={() => setSelected(null)}>关闭</button>{role !== "client" ? <button className={styles.primary} onClick={() => { update(selected.id, "已通过"); setSelected(null); }}>确认通过</button> : null}</div>
          </div>
        </div>
      ) : null}
      {creating ? (
        <div className={styles.shade}>
          <form
            className={styles.modal}
            onSubmit={(event) => {
              event.preventDefault();
              const id = `LN-${20500 + rows.length}`;
              setRows([{ id, name: "Carlos Ramírez", amount: `MXN ${Number(loanAmount || 0).toLocaleString()}`, status: "待审核", date: "刚刚" }, ...rows]);
              setCreating(false);
            }}
          >
            <div className={styles.drawerHeader}><div><span>客户申请</span><h2>新建贷款申请</h2></div><button type="button" onClick={() => setCreating(false)}><X size={18}/></button></div>
            <div className={styles.form}>
              <label><span>申请币种</span><select><option>MXN</option><option>USD</option></select></label>
              <label><span>申请金额</span><input value={loanAmount} onChange={(event) => setLoanAmount(event.target.value)}/></label>
              <label><span>用途说明</span><input placeholder="输入资金用途"/></label>
              <button className={styles.primary} type="submit">提交申请</button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function NotificationsPage({ role }: { role: "client" | "ops" | "master" }) {
  const [rows, setRows] = useState(noticesSeed);
  const move = (id: string, status: string) => setRows(rows.map((row) => row.id === id ? { ...row, status } : row));
  return (
    <div className={styles.stack}>
      <div className={styles.header}><div><h1>{role === "client" ? "通知中心" : "人工通知任务"}</h1><p>{role === "client" ? "查看账户与业务通知" : "跟踪客户联系、确认和后续处理状态"}</p></div><button className={styles.secondary} onClick={() => setRows(rows.map((row) => ({ ...row, status: "已确认" })))}><Bell size={15}/> 全部确认</button></div>
      <div className={styles.noticeGrid}>
        {rows.map((row) => (
          <article key={row.id}>
            <div className={styles.noticeIcon}><Bell size={17}/></div>
            <div><div className={styles.noticeMeta}><span>{row.type}</span><small>{row.time}</small></div><h3>{row.subject}</h3>{role !== "client" ? <p>{row.name} · {row.id}</p> : <p>账户通知 · {row.id}</p>}</div>
            <div className={styles.noticeRight}><Status value={row.status}/>{role !== "client" ? <button onClick={() => move(row.id, row.status === "已确认" ? "已确认" : row.status === "已联系" ? "已确认" : "已联系")}>{row.status === "已确认" ? "查看" : row.status === "已联系" ? "确认完成" : "标记已联系"}</button> : <button onClick={() => move(row.id, "已确认")}>查看</button>}</div>
          </article>
        ))}
      </div>
    </div>
  );
}

function OpsAccountsPage() {
  const [rows, setRows] = useState(opsAccountsSeed);
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<{ invite: string; secret: string } | null>(null);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [editing, setEditing] = useState<(typeof opsAccountsSeed)[number] | null>(null);
  const [resetSecret, setResetSecret] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next = rows.length + 1;
    const id = `OPS-MX-0${next}`;
    const invite = `MX${String(6800 + next * 97)}K`;
    setRows([{ id, name: name || `Operations ${next}`, manager: username || "New Admin", markets: "US + MX", clients: 0, status: "启用", invite }, ...rows]);
    setResult({ invite, secret: `VS${id.replaceAll("-", "")}2FA${Date.now().toString().slice(-6)}` });
  };

  return (
    <div className={styles.stack}>
      <div className={styles.header}><div><h1>子账户管理</h1><p>创建子账户并管理邀请码、2FA 与市场权限</p></div><button className={styles.primary} onClick={() => { setCreating(true); setResult(null); }}><UserPlus size={15}/> 创建子账户</button></div>
      <section className={styles.tablePanel}>
        <table>
          <thead><tr><th>子账户</th><th>名称</th><th>管理员</th><th>市场</th><th>客户数</th><th>邀请码</th><th>2FA</th><th>状态</th><th>操作</th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.id}><td className={styles.mono}>{row.id}</td><td>{row.name}</td><td>{row.manager}</td><td>{row.markets}</td><td>{row.clients}</td><td className={styles.mono}>{row.invite}</td><td><span className={styles.good}>已启用</span></td><td><Status value={row.status}/></td><td><div className={styles.actions}><button onClick={() => { setEditing(row); setResetSecret(""); }}>权限</button><button onClick={() => { setEditing(row); setResetSecret(`VS${row.id.replaceAll("-", "")}${Date.now().toString().slice(-6)}`); }}>重置2FA</button><button onClick={() => setRows(rows.map((item) => item.id === row.id ? { ...item, status: item.status === "启用" ? "暂停" : "启用" } : item))}>{row.status === "启用" ? "暂停" : "恢复"}</button></div></td></tr>)}</tbody>
        </table>
      </section>
      {creating ? (
        <div className={styles.shade}>
          <div className={styles.modal}>
            <div className={styles.drawerHeader}><div><span>总账户操作</span><h2>创建子账户</h2></div><button onClick={() => setCreating(false)}><X size={18}/></button></div>
            {!result ? (
              <form className={styles.form} onSubmit={submit}>
                <label><span>子账户名称</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="例如 Mexico Operations 04"/></label>
                <label><span>管理员账户</span><input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="输入管理员账户"/></label>
                <label><span>初始密码</span><input type="password" defaultValue="ChangeMe2026!"/></label>
                <div className={styles.checks}><label><input type="checkbox" defaultChecked/> US 市场</label><label><input type="checkbox" defaultChecked/> MX 市场</label><label><input type="checkbox" defaultChecked/> 股票</label><label><input type="checkbox" defaultChecked/> 大宗 / IPO / 基金</label></div>
                <button className={styles.primary} type="submit">创建并生成登录资料</button>
              </form>
            ) : (
              <div className={styles.resultBox}>
                <CircleCheck size={34}/>
                <h3>子账户创建完成</h3>
                <p>以下资料只在当前创建流程展示，请交给对应管理员保存。</p>
                <div><span>专属邀请码</span><strong>{result.invite}</strong></div>
                <div><span>2FA 密钥</span><strong>{result.secret}</strong></div>
                <button className={styles.primary} onClick={() => setCreating(false)}>完成</button>
              </div>
            )}
          </div>
        </div>
      ) : null}
      {editing ? (
        <div className={styles.shade} onMouseDown={() => setEditing(null)}>
          <div className={styles.modal} onMouseDown={(event) => event.stopPropagation()}>
            <div className={styles.drawerHeader}><div><span>子账户安全与权限</span><h2>{editing.id}</h2></div><button onClick={() => setEditing(null)}><X size={18}/></button></div>
            {resetSecret ? (
              <div className={styles.resultBox}><ShieldCheck size={32}/><h3>新的2FA密钥已生成</h3><div><span>2FA密钥</span><strong>{resetSecret}</strong></div><p>保存后旧密钥不再使用。</p></div>
            ) : (
              <div className={styles.form}>
                <label><span>子账户名称</span><input defaultValue={editing.name}/></label>
                <div className={styles.checks}><label><input type="checkbox" defaultChecked={editing.markets.includes("US")}/> US 市场</label><label><input type="checkbox" defaultChecked={editing.markets.includes("MX")}/> MX 市场</label><label><input type="checkbox" defaultChecked/> 股票</label><label><input type="checkbox" defaultChecked/> 大宗 / IPO / 基金</label></div>
              </div>
            )}
            <div className={styles.drawerFooter}><button className={styles.secondary} onClick={() => setEditing(null)}>关闭</button>{!resetSecret ? <button className={styles.primary} onClick={() => setEditing(null)}>保存权限</button> : null}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AuditPage() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<(typeof auditSeed)[number] | null>(null);
  const rows = useMemo(() => auditSeed.filter((row) => Object.values(row).join(" ").toLowerCase().includes(query.toLowerCase())), [query]);
  return (
    <div className={styles.stack}>
      <div className={styles.header}><div><h1>审计日志</h1><p>查看后台敏感操作、对象与时间记录</p></div><div className={styles.auditSearch}><Search size={14}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="操作人 / 动作 / 对象ID"/></div></div>
      <section className={styles.tablePanel}>
        <table>
          <thead><tr><th>日志编号</th><th>时间</th><th>操作人</th><th>动作</th><th>对象</th><th>来源IP</th><th>详情</th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.id}><td className={styles.mono}>{row.id}</td><td>{row.time}</td><td>{row.actor}</td><td>{row.action}</td><td className={styles.mono}>{row.target}</td><td className={styles.mono}>{row.ip}</td><td><button className={styles.auditButton} onClick={() => setSelected(row)}><FileClock size={14}/> 查看</button></td></tr>)}</tbody>
        </table>
      </section>
      {selected ? (
        <div className={styles.shade} onMouseDown={() => setSelected(null)}>
          <div className={styles.modal} onMouseDown={(event) => event.stopPropagation()}>
            <div className={styles.drawerHeader}><div><span>审计详情</span><h2>{selected.id}</h2></div><button onClick={() => setSelected(null)}><X size={18}/></button></div>
            <div className={styles.detailGrid}><div><span>操作人</span><strong>{selected.actor}</strong></div><div><span>动作</span><strong>{selected.action}</strong></div><div><span>对象</span><strong>{selected.target}</strong></div><div><span>来源IP</span><strong>{selected.ip}</strong></div><div><span>时间</span><strong>{selected.time}</strong></div><div><span>结果</span><strong>已记录</strong></div></div>
            <div className={styles.drawerFooter}><button className={styles.secondary} onClick={() => setSelected(null)}>关闭</button></div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
