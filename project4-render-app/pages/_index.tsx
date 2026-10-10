import { FormEvent, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { project4Api } from "../helpers/project4Api";
import {
  Activity,
  BadgeDollarSign,
  Banknote,
  Bell,
  Building2,
  ChevronRight,
  CircleUserRound,
  CreditCard,
  FileClock,
  FileCheck2,
  Heart,
  KeyRound,
  Landmark,
  Layers3,
  LayoutDashboard,
  LineChart,
  ListFilter,
  LogOut,
  Menu,
  MessageSquareText,
  Search,
  Settings,
  ShieldCheck,
  Smartphone,
  UserCog,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import {
  InteractiveCandleChart,
  InteractiveTrendChart,
} from "../components/InteractiveCharts";
import {
  CoreWorkflowPage,
  type CoreWorkflowView,
} from "../components/CoreWorkflowPages";
import {
  AdminControlPage,
  defaultRiskControls,
  type AdminControlView,
  type RiskControl,
} from "../components/AdminControlPages";
import {
  OperationsPage,
  type OperationsView,
} from "../components/OperationsPages";
import enh from "../components/Enhancements.module.css";
import styles from "./_index.module.css";

type Role = "client" | "ops" | "master";
type Portal = "client" | "admin";
type View =
  | "dashboard"
  | "opsAccounts"
  | "customers"
  | "securities"
  | "purchaseAccess"
  | "products"
  | "orders"
  | "cash"
  | "positions"
  | "loans"
  | "notifications"
  | "risk"
  | "market"
  | "support"
  | "audit"
  | "settings";

type Customer = {
  id: string;
  name: string;
  phone: string;
  vip: "普通会员" | "VIP1" | "VIP2" | "VIP3" | "VIP4" | "VIP5";
  kyc: "已认证" | "待审核";
  login: boolean;
  trading: boolean;
  withdrawal: boolean;
  balance: string;
  invite: string;
};

const initialCustomers: Customer[] = [
  {
    id: "1035821",
    name: "Carlos Ramírez",
    phone: "+52 55 0182 7731",
    vip: "VIP3",
    kyc: "已认证",
    login: true,
    trading: true,
    withdrawal: true,
    balance: "MXN 186,240.00",
    invite: "MX8P2K",
  },
  {
    id: "1035817",
    name: "Daniela Torres",
    phone: "+52 55 7104 8823",
    vip: "VIP1",
    kyc: "待审核",
    login: true,
    trading: false,
    withdrawal: false,
    balance: "MXN 42,860.50",
    invite: "MX8P2K",
  },
  {
    id: "1035799",
    name: "Alejandro Ruiz",
    phone: "+52 55 3916 4088",
    vip: "普通会员",
    kyc: "已认证",
    login: true,
    trading: true,
    withdrawal: true,
    balance: "USD 12,904.30",
    invite: "US4Q9T",
  },
  {
    id: "1035788",
    name: "Fernanda Pérez",
    phone: "+52 55 6027 1185",
    vip: "VIP5",
    kyc: "已认证",
    login: true,
    trading: true,
    withdrawal: true,
    balance: "MXN 526,410.00",
    invite: "MX2L7D",
  },
];

const stocks = [
  { symbol: "AAPL", name: "Apple Inc.", price: "227.19", change: "+1.26%", up: true, market: "US" as const },
  { symbol: "NVDA", name: "NVIDIA Corp.", price: "184.41", change: "+2.72%", up: true, market: "US" as const },
  { symbol: "TSLA", name: "Tesla Inc.", price: "443.21", change: "-0.83%", up: false, market: "US" as const },
  { symbol: "AMZN", name: "Amazon.com", price: "219.78", change: "+0.41%", up: true, market: "US" as const },
  { symbol: "WALMEX", name: "Walmart de México", price: "58.73", change: "-0.12%", up: false, market: "MX" as const },
  { symbol: "AMXL", name: "América Móvil", price: "18.94", change: "+0.64%", up: true, market: "MX" as const },
];

const candles = [30, 42, 34, 58, 52, 67, 60, 75, 70, 88, 78, 94, 84, 101, 92, 111, 103, 118, 108, 124];

const navItems: Array<{ key: View; label: string; icon: any }> = [
  { key: "dashboard", label: "总览", icon: LayoutDashboard },
  { key: "opsAccounts", label: "子账户", icon: Building2 },
  { key: "customers", label: "会员管理", icon: Users },
  { key: "securities", label: "证券管理", icon: LineChart },
  { key: "products", label: "产品中心", icon: Layers3 },
  { key: "orders", label: "订单管理", icon: ListFilter },
  { key: "cash", label: "资金管理", icon: Banknote },
  { key: "positions", label: "客户持仓", icon: WalletCards },
  { key: "loans", label: "贷款", icon: Landmark },
  { key: "notifications", label: "通知", icon: Bell },
  { key: "risk", label: "风控中心", icon: ShieldCheck },
  { key: "market", label: "股票行情", icon: LineChart },
  { key: "support", label: "客服", icon: MessageSquareText },
  { key: "audit", label: "审计", icon: FileClock },
  { key: "settings", label: "系统设置", icon: Settings },
];

const clientNavLabels: Partial<Record<View, string>> = {
  dashboard: "Prezentare",
  products: "Produse",
  orders: "Ordine",
  cash: "Fonduri",
  positions: "Poziții",
  loans: "Credit",
  notifications: "Notificări",
  market: "Piață",
  support: "Asistență",
  settings: "Setări",
};

function RoleLabel({ role }: { role: Role }) {
  return (
    <span className={styles.roleLabel}>
      {role === "master" ? "总账户" : role === "ops" ? "子账户" : "客户"}
    </span>
  );
}

function RomaniaClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const formatted = new Intl.DateTimeFormat("ro-RO", {
    timeZone: "Europe/Bucharest",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(now);
  return <span className={styles.romaniaClock}>{formatted} · Ora României</span>;
}

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? styles.logoCompact : styles.logoBlock}>
      <img
        src="/brantone-veyor-logo-clean.webp"
        alt="Brantone Veylor Private Capital Advisory"
      />
    </div>
  );
}

function LoginScreen({
  portal,
  onLogin,
}: {
  portal: Portal;
  onLogin: (role: Role, name: string) => void;
}) {
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [invite, setInvite] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [totp, setTotp] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoginError("");
    setResetMessage("");
    // Never unlock the client area or claim password recovery without a verified server endpoint.
    if (portal === "client") {
      setLoginError("Autentificarea și înregistrarea clienților nu sunt încă disponibile. Nu s-a creat și nu s-a modificat niciun cont.");
      return;
    }
    if (mode !== "login") {
      setLoginError("密码恢复需要后端身份核验，当前不能操作。");
      return;
    }
    if (!account.trim() || !password || !/^\d{6}$/.test(totp)) {
      setLoginError("请输入账户、密码及完整的 6 位动态验证码。");
      return;
    }
    setLoggingIn(true);
    try {
      const result = await project4Api.loginAdmin(account.trim(), password, totp);
      onLogin(result.role, result.displayName || account.trim());
    } catch (error) {
      const code = error instanceof Error ? error.message : "LOGIN_FAILED";
      setLoginError(
        code === "INVALID_TOTP"
          ? "Google 2FA 验证码错误；请检查设备时间与当前绑定的验证器。"
          : code === "ACCOUNT_TEMPORARILY_LOCKED"
            ? "账户因连续验证失败已临时锁定，请稍后再试。"
            : code === "ACCOUNT_SUSPENDED"
              ? "该子账户已暂停，请联系总账户管理员。"
              : code === "INVALID_LOGIN_INPUT"
                ? "请填写账户、密码及 6 位验证码。"
                : "后台登录失败：账号、密码或验证码未通过服务器验证。",
      );
    } finally {
      setLoggingIn(false);
    }
  };

  const isClient = portal === "client";

  return (
    <main className={styles.loginPage}>
      <section className={styles.loginVisual}>
        <div className={styles.loginBrand}>
          <Logo />
        </div>
        <div className={styles.visualText}>
          <span className={styles.eyebrow}>BRANTONE VEYLOR CAPITAL PLATFORM</span>
          <h1>
            {isClient
              ? "Piețe, portofoliu și ordine într-un singur centru privat"
              : "专业、清晰、可审计的私人资本交易工作台"}
          </h1>
          <p>
            {isClient
              ? "Urmăriți piețele, pozițiile, ordinele și fondurile într-o experiență Brantone Veylor construită pentru decizii disciplinate."
              : "统一管理客户、资金、订单、持仓、证券与风险控制，核心数据来自真实后台，不再使用页面临时状态作为业务真源。"}
          </p>
        </div>
        <div className={styles.visualGrid}>
          <div><strong>US</strong><span>{isClient ? "Acțiuni SUA" : "美国市场"}</span></div>
          <div><strong>MX</strong><span>{isClient ? "Piața Mexic" : "墨西哥市场"}</span></div>
          <div><strong>2FA</strong><span>{isClient ? "Securitate activă" : "后台安全登录"}</span></div>
          <div><strong>RO</strong><span>{isClient ? <RomaniaClock /> : "中文运营后台"}</span></div>
        </div>
      </section>

      <section className={styles.loginPanel}>
        <div className={styles.mobileLogo}><Logo /></div>

        <form className={styles.loginForm} onSubmit={submit}>
          <div className={styles.formTitle}>
            <span className={styles.roleLabel}>
              {isClient ? "CLIENT" : "后台管理"}
            </span>
            <h2>
              {isClient
                ? mode === "register"
                  ? "Creează cont"
                  : mode === "forgot"
                    ? "Recuperează accesul"
                    : "Autentificare"
                : "后台登录"}
            </h2>
            <p>
              {isClient
                ? mode === "forgot"
                  ? "Verificați contul și setați o parolă nouă."
                  : "Folosiți telefonul, e-mailul sau contul asociat."
                : "总账户与子账户共用此入口，系统将根据登录凭证自动识别权限。"}
            </p>
          </div>

          {isClient && mode === "register" ? (
            <label>
              <span>Nume complet</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Introduceți numele" />
            </label>
          ) : null}

          <label>
            <span>{isClient ? "Telefon / e-mail / cont" : "后台账户"}</span>
            <input value={account} onChange={(e) => setAccount(e.target.value)} placeholder={isClient ? "+40... / nume@exemplu.ro" : "请输入后台账户"} />
          </label>

          {mode !== "forgot" ? (
            <label>
              <span>{isClient ? "Parolă" : "登录密码"}</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={isClient ? "Introduceți parola" : "请输入密码"} />
            </label>
          ) : (
            <>
              <label>
                <span>{isClient ? "Cod de verificare" : "验证码"}</span>
                <input inputMode="numeric" placeholder={isClient ? "Introduceți codul primit" : "输入收到的验证码"} maxLength={6} />
              </label>
              <label>
                <span>{isClient ? "Parolă nouă" : "新密码"}</span>
                <input type="password" placeholder={isClient ? "Setați o parolă nouă" : "设置新的登录密码"} />
              </label>
            </>
          )}

          {isClient && mode === "register" ? (
            <label>
              <span>Confirmă parola</span>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repetați parola" />
            </label>
          ) : null}

          {!isClient && mode === "login" ? (
            <label>
              <span>2FA 验证码</span>
              <input
                inputMode="numeric"
                placeholder="6 位验证码"
                maxLength={6}
                value={totp}
                onChange={(event) =>
                  setTotp(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
              />
            </label>
          ) : null}

          {isClient && mode === "register" ? (
            <label>
              <span>Cod de invitație</span>
              <input value={invite} onChange={(e) => setInvite(e.target.value)} placeholder="Introduceți codul de invitație" />
            </label>
          ) : null}

          {resetMessage ? <div className={enh.formNotice}>{resetMessage}</div> : null}
          {loginError ? <div className={enh.formNotice}>{loginError}</div> : null}

          <button className={styles.primaryButton} type="submit">
            {isClient
              ? mode === "register"
                ? "Creează cont"
                : mode === "forgot"
                  ? "Confirmă modificarea"
                  : "Autentificare"
              : loggingIn ? "验证中…" : "进入后台"}
            <ChevronRight size={17} />
          </button>

          {isClient && mode === "login" ? (
            <button type="button" className={styles.textButton} onClick={() => { setMode("forgot"); setResetMessage(""); }}>
              Am uitat parola
            </button>
          ) : null}

          {isClient ? (
            <button
              type="button"
              className={styles.textButton}
              onClick={() => { setMode(mode === "login" ? "register" : "login"); setResetMessage(""); }}
            >
              {mode === "login" ? "Nu aveți cont? Înregistrați-vă cu un cod de invitație" : "Înapoi la autentificare"}
            </button>
          ) : null}
        </form>
      </section>
    </main>
  );
}

function Sidebar({
  role,
  view,
  onView,
  onLogout,
}: {
  role: Role;
  view: View;
  onView: (view: View) => void;
  onLogout: () => void;
}) {
  const allowed =
    role === "client"
      ? navItems.filter((item) =>
          ["dashboard", "products", "orders", "cash", "positions", "loans", "notifications", "market", "support", "settings"].includes(item.key),
        )
      : role === "ops"
        ? navItems.filter((item) =>
            ["dashboard", "customers", "products", "orders", "cash", "positions", "loans", "notifications", "market", "settings"].includes(item.key),
          )
        : navItems;

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarLogo}><Logo /></div>
      <div className={styles.sidebarRole}><RoleLabel role={role} /></div>
      <nav className={`${styles.nav} ${enh.scrollNav}`}>
        {allowed.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              className={view === item.key ? styles.navActive : styles.navItem}
              onClick={() => onView(item.key)}
            >
              <Icon size={17} />
              <span>{role === "client" ? clientNavLabels[item.key] ?? item.label : item.label}</span>
            </button>
          );
        })}
      </nav>
      <button className={styles.logout} onClick={onLogout}>
        <LogOut size={17} />
        <span>{role === "client" ? "Ieșire" : "退出登录"}</span>
      </button>
    </aside>
  );
}

function Topbar({
  name,
  role,
  onNavigate,
}: {
  name: string;
  role: Role;
  onNavigate: (view: View) => void;
}) {
  return (
    <header className={styles.topbar}>
      {role === "client" ? (
        <div className={styles.topbarMarket}>
          <span className={styles.liveDot} />
          <div><strong>Piață activă</strong><RomaniaClock /></div>
        </div>
      ) : (
        <div className={styles.topSearch}>
          <Search size={16} />
          <span>搜索客户 / 订单 / 股票代码</span>
        </div>
      )}
      <div className={styles.topbarActions}>
        <button onClick={() => onNavigate(role === "client" ? "market" : "customers")}><Search size={17} /></button>
        <button onClick={() => onNavigate("notifications")}><Bell size={17} /><i /></button>
        <div className={styles.profile}>
          <div className={styles.avatar}>{name.slice(0, 1).toUpperCase()}</div>
          <div><strong>{name}</strong><span>{role === "master" ? "总账户管理员" : role === "ops" ? "运营子账户" : "Cont client"}</span></div>
        </div>
      </div>
    </header>
  );
}

function Metric({ title, value, sub, icon: Icon }: any) {
  return (
    <div className={styles.metricCard}>
      <div className={styles.metricIcon}><Icon size={18} /></div>
      <div><span>{title}</span><strong>{value}</strong><small>{sub}</small></div>
    </div>
  );
}

function Dashboard({
  role,
  name,
  onOpenMarket,
  onNavigate,
}: {
  role: Role;
  name: string;
  onOpenMarket: () => void;
  onNavigate: (view: View) => void;
}) {
  if (role === "client") {
    return (
      <div className={styles.contentStack}>
        <div className={styles.pageHeader}>
          <div><h1>Prezentare cont</h1><p>Bine ai revenit, {name}</p></div>
          <button className={styles.primarySmall} onClick={onOpenMarket}>Deschide piața <ChevronRight size={15} /></button>
        </div>
        <section className={styles.heroBalance}>
          <div><span>Valoare totală cont</span><strong>248,630.80</strong><small>Disponibil 186,240.00 · USD 3,471.20</small></div>
          <div className={styles.heroStats}>
            <div><span>Variație astăzi</span><strong className={styles.green}>+2,418.70</strong></div>
            <div><span>Poziții</span><strong>8</strong></div>
            <div><span>Nivel cont</span><strong>VIP3</strong></div>
          </div>
        </section>
        <div className={styles.metricGrid}>
          <Metric icon={WalletCards} title="Fonduri disponibile" value="186,240" sub="Disponibil acum" />
          <Metric icon={LineChart} title="Valoare poziții" value="62,390" sub="8 poziții" />
          <Metric icon={Heart} title="Favorite" value="12" sub="US / MX" />
          <Metric icon={ShieldCheck} title="Verificare" value="Finalizată" sub="Cont activ" />
        </div>
        <div className={styles.twoColumns}>
          <section className={styles.panel}>
            <div className={styles.panelTitle}><div><h3>Instrumente urmărite</h3><p>Ultimele cotații</p></div><button onClick={onOpenMarket}>Toată piața</button></div>
            <StockRows compact />
          </section>
          <section className={styles.panel}>
            <div className={styles.panelTitle}><div><h3>Ordine recente</h3><p>Activitatea contului</p></div></div>
            <OrderRows />
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.contentStack}>
      <div className={styles.pageHeader}>
        <div><h1>{role === "master" ? "运营总览" : "子账户总览"}</h1><p>{role === "master" ? "查看全平台客户、资金与订单状态" : "查看当前子账户名下客户和运营数据"}</p></div>
        <div className={styles.headerPills}><span>US</span><span>MX</span><span>系统正常</span></div>
      </div>
      <div className={styles.metricGrid}>
        <Metric icon={Users} title="客户总数" value={role === "master" ? "2,846" : "428"} sub="+18 今日新增" />
        <Metric icon={Banknote} title="累计入金" value="MXN 18.62M" sub="USD 624,830" />
        <Metric icon={Activity} title="订单数量" value="1,284" sub="今日 74" />
        <Metric icon={BadgeDollarSign} title="持仓市值" value="MXN 26.84M" sub="USD 906,420" />
      </div>
      <div className={styles.fourStats}>
        {[
          ["今日充值", "MXN 386,200", "+12.8%"],
          ["今日提现", "MXN 94,700", "-4.2%"],
          ["今日买入", "MXN 612,540", "+18.6%"],
          ["今日卖出", "MXN 428,310", "+7.4%"],
        ].map(([title, value, change]) => (
          <div key={title}><span>{title}</span><strong>{value}</strong><small>{change}</small></div>
        ))}
      </div>
      <div className={styles.twoColumnsWide}>
        <section className={styles.panel}>
          <div className={styles.panelTitle}><div><h3>资金趋势</h3><p>近 7 日运营变化</p></div><div className={styles.segment}><button className={styles.segmentActive}>MXN</button><button>USD</button></div></div>
          <div className={styles.chartArea}>
            <InteractiveTrendChart />
          </div>
        </section>
        <section className={styles.panel}>
          <div className={styles.panelTitle}><div><h3>待处理事项</h3><p>需要运营确认</p></div></div>
          <div className={styles.todoList}>
            {[
              ["实名认证审核", "18", FileCheck2, "customers"],
              ["充值审核", "12", Banknote, "cash"],
              ["提现审核", "7", CreditCard, "cash"],
              ["人工通知", "24", Bell, "notifications"],
            ].map(([label,count,Icon,target]:any)=>(
              <button key={label} onClick={() => onNavigate(target)}><span><Icon size={16}/>{label}</span><strong>{count}</strong><ChevronRight size={15}/></button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: () => void }) {
  return <button className={value ? styles.toggleOn : styles.toggleOff} onClick={onChange}><i /></button>;
}

function CustomersPage({
  customers,
  setCustomers,
  onMirror,
}: {
  customers: Customer[];
  setCustomers: (rows: Customer[]) => void;
  onMirror: (customer: Customer) => void;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Customer | null>(null);
  const [vipCustomer, setVipCustomer] = useState<Customer | null>(null);
  const [kycCustomer, setKycCustomer] = useState<Customer | null>(null);
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newVip, setNewVip] = useState<Customer["vip"]>("普通会员");
  const [newInvite, setNewInvite] = useState("MX8P2K");
  const filtered = customers.filter((c) =>
    [c.id, c.name, c.phone, c.invite].join(" ").toLowerCase().includes(query.toLowerCase()),
  );

  const update = (id: string, patch: Partial<Customer>) =>
    setCustomers(customers.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const createCustomer = (event: FormEvent) => {
    event.preventDefault();
    const id = String(1035900 + customers.length + 1);
    setCustomers([
      {
        id,
        name: newName.trim() || "新客户",
        phone: newPhone.trim() || "+52 55 0000 0000",
        vip: newVip,
        kyc: "待审核",
        login: true,
        trading: false,
        withdrawal: false,
        balance: "MXN 0.00",
        invite: newInvite.trim() || "MX8P2K",
      },
      ...customers,
    ]);
    setCreatingCustomer(false);
    setNewName("");
    setNewPhone("");
    setNewVip("普通会员");
  };

  return (
    <div className={styles.contentStack}>
      <div className={styles.pageHeader}><div><h1>会员管理</h1><p>客户账户、权限、等级与身份资料</p></div><button className={styles.primarySmall} onClick={()=>setCreatingCustomer(true)}><Users size={15}/> 新增客户</button></div>
      <section className={styles.filterBar}>
        <div className={styles.searchBox}><Search size={15}/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="用户ID / 手机 / 姓名 / 邀请码"/></div>
        <select><option>全部等级</option><option>VIP1</option><option>VIP2</option><option>VIP3</option><option>VIP4</option><option>VIP5</option></select>
        <select><option>全部状态</option><option>已认证</option><option>待审核</option></select>
        <button className={styles.secondaryButton}>查询</button>
      </section>
      <section className={styles.tablePanel}>
        <table>
          <thead><tr><th>用户ID</th><th>客户</th><th>VIP</th><th>实名认证</th><th>登录</th><th>交易</th><th>提现</th><th>余额</th><th>邀请码</th><th>操作</th></tr></thead>
          <tbody>
            {filtered.map((c)=>(
              <tr key={c.id}>
                <td className={styles.mono}>{c.id}</td>
                <td><strong>{c.name}</strong><span>{c.phone}</span></td>
                <td><button className={styles.vipBadge} onClick={()=>setVipCustomer(c)}>{c.vip}</button></td>
                <td><button className={c.kyc==="已认证"?styles.okBadge:styles.pendingBadge} onClick={()=>setKycCustomer(c)}>{c.kyc}</button></td>
                <td><Toggle value={c.login} onChange={()=>update(c.id,{login:!c.login})}/></td>
                <td><Toggle value={c.trading} onChange={()=>update(c.id,{trading:!c.trading})}/></td>
                <td><Toggle value={c.withdrawal} onChange={()=>update(c.id,{withdrawal:!c.withdrawal})}/></td>
                <td className={styles.mono}>{c.balance}</td>
                <td className={styles.mono}>{c.invite}</td>
                <td><div className={styles.rowActions}><button onClick={()=>setSelected(c)}>编辑</button><button onClick={()=>onMirror(c)}><Smartphone size={14}/> APP</button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {selected ? (
        <div className={styles.drawerShade} onMouseDown={()=>setSelected(null)}>
          <aside className={styles.drawer} onMouseDown={(e)=>e.stopPropagation()}>
            <div className={styles.drawerHeader}><div><span>客户详情</span><h2>{selected.name}</h2></div><button onClick={()=>setSelected(null)}><X size={18}/></button></div>
            <div className={styles.drawerSection}><h3>基本资料</h3><label><span>姓名</span><input defaultValue={selected.name}/></label><label><span>手机</span><input defaultValue={selected.phone}/></label><label><span>账户ID</span><input defaultValue={selected.id} disabled/></label></div>
            <div className={styles.drawerSection}><h3>权限控制</h3>
              {([["允许登录","login"],["允许交易","trading"],["允许提现","withdrawal"]] as const).map(([label,key])=>(
                <div className={styles.permissionRow} key={key}><span>{label}</span><Toggle value={selected[key]} onChange={()=>{update(selected.id,{[key]:!selected[key]} as any);setSelected({...selected,[key]:!selected[key]});}}/></div>
              ))}
            </div>
            <div className={styles.drawerSection}><h3>安全设置</h3><button className={styles.drawerAction}>修改登录密码<ChevronRight size={15}/></button><button className={styles.drawerAction}>修改交易密码<ChevronRight size={15}/></button></div>
            <div className={styles.drawerFooter}><button className={styles.secondaryButton} onClick={()=>setSelected(null)}>取消</button><button className={styles.primarySmall} onClick={()=>setSelected(null)}>保存修改</button></div>
          </aside>
        </div>
      ) : null}

      {vipCustomer ? (
        <div className={styles.modalShade}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}><div><span>客户等级</span><h2>{vipCustomer.name}</h2></div><button onClick={()=>setVipCustomer(null)}><X size={18}/></button></div>
            <div className={styles.vipOptions}>
              {(["普通会员","VIP1","VIP2","VIP3","VIP4","VIP5"] as Customer["vip"][]).map((level)=>(
                <button key={level} className={vipCustomer.vip===level?styles.vipOptionActive:styles.vipOption} onClick={()=>setVipCustomer({...vipCustomer,vip:level})}><strong>{level}</strong><span>{level==="普通会员"?"基础客户等级":`客户权益等级 ${level.replace("VIP","")}`}</span></button>
              ))}
            </div>
            <div className={styles.modalFooter}><button className={styles.secondaryButton} onClick={()=>setVipCustomer(null)}>取消</button><button className={styles.primarySmall} onClick={()=>{update(vipCustomer.id,{vip:vipCustomer.vip});setVipCustomer(null);}}>确认等级</button></div>
          </div>
        </div>
      ) : null}

      {kycCustomer ? (
        <div className={styles.modalShade}>
          <div className={styles.modalWide}>
            <div className={styles.modalHeader}><div><span>实名认证</span><h2>{kycCustomer.name}</h2></div><button onClick={()=>setKycCustomer(null)}><X size={18}/></button></div>
            <div className={styles.kycGrid}><label><span>姓名</span><input defaultValue={kycCustomer.name}/></label><label><span>证件号码</span><input defaultValue="MEX••••••2481"/></label><div className={styles.idCard}><span>证件正面</span><FileCheck2 size={28}/><small>已上传</small></div><div className={styles.idCard}><span>证件反面</span><FileCheck2 size={28}/><small>已上传</small></div></div>
            <div className={styles.modalFooter}><button className={styles.secondaryButton} onClick={()=>setKycCustomer(null)}>关闭</button><button className={styles.primarySmall} onClick={()=>{update(kycCustomer.id,{kyc:"已认证"});setKycCustomer(null);}}>审核通过</button></div>
          </div>
        </div>
      ) : null}

      {creatingCustomer ? (
        <div className={styles.modalShade} onMouseDown={()=>setCreatingCustomer(false)}>
          <form className={styles.modalWide} onSubmit={createCustomer} onMouseDown={(event)=>event.stopPropagation()}>
            <div className={styles.modalHeader}><div><span>客户账户</span><h2>新增客户</h2></div><button type="button" onClick={()=>setCreatingCustomer(false)}><X size={18}/></button></div>
            <div className={styles.kycGrid}>
              <label><span>客户姓名</span><input value={newName} onChange={(event)=>setNewName(event.target.value)} placeholder="请输入姓名"/></label>
              <label><span>手机号码</span><input value={newPhone} onChange={(event)=>setNewPhone(event.target.value)} placeholder="+52 55..."/></label>
              <label><span>VIP等级</span><select value={newVip} onChange={(event)=>setNewVip(event.target.value as Customer["vip"])}><option>普通会员</option><option>VIP1</option><option>VIP2</option><option>VIP3</option><option>VIP4</option><option>VIP5</option></select></label>
              <label><span>邀请码</span><input value={newInvite} onChange={(event)=>setNewInvite(event.target.value)} placeholder="输入归属邀请码"/></label>
              <label><span>初始登录密码</span><input type="password" placeholder="设置初始密码"/></label>
              <label><span>账户币种</span><select><option>MXN</option><option>USD</option></select></label>
            </div>
            <div className={styles.modalFooter}><button type="button" className={styles.secondaryButton} onClick={()=>setCreatingCustomer(false)}>取消</button><button type="submit" className={styles.primarySmall}>创建客户</button></div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function StockRows({ compact = false }: { compact?: boolean }) {
  const securitiesQuery = useQuery({
    queryKey: ["project4-client-securities"],
    queryFn: project4Api.listClientSecurities,
    staleTime: 10_000,
  });
  const rows = (securitiesQuery.data || []).map((item) => {
    const pct = Number(item.quote?.percentChange ?? 0);
    return {
      symbol: item.symbol,
      name: item.name,
      price: item.quote?.lastPrice == null ? "—" : String(item.quote.lastPrice),
      change: item.quote ? `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%` : "暂无行情",
      up: pct >= 0,
    };
  });
  return (
    <div className={styles.stockRows}>
      {rows.slice(0, compact ? 4 : rows.length).map((s)=>(
        <div key={s.symbol}><div><strong>{s.symbol}</strong><span>{s.name}</span></div><div className={styles.stockPrice}><strong>{s.price}</strong><span className={s.up?styles.green:styles.red}>{s.change}</span></div></div>
      ))}
      {!securitiesQuery.isFetching && rows.length === 0 ? <div className={enh.emptyMarket}>暂无已上架证券</div> : null}
    </div>
  );
}

function MarketPage({ riskControls }: { riskControls: RiskControl[] }) {
  const [symbol, setSymbol] = useState("AAPL");
  const [side, setSide] = useState<"buy"|"sell">("buy");
  const [interval, setInterval] = useState("1D");
  const [marketTab, setMarketTab] = useState<"US"|"MX"|"Favorite">("US");
  const [searchText, setSearchText] = useState("");
  const [favorites, setFavorites] = useState<string[]>(["AAPL","NVDA","WALMEX"]);
  const [qty, setQty] = useState("100");
  const [notice, setNotice] = useState("");
  const securitiesQuery = useQuery({
    queryKey: ["project4-client-securities"],
    queryFn: project4Api.listClientSecurities,
    staleTime: 10_000,
  });
  const liveStocks = (securitiesQuery.data || []).map((item) => {
    const pct = Number(item.quote?.percentChange ?? 0);
    return {
      symbol: item.symbol,
      name: item.name,
      price: item.quote?.lastPrice == null ? "—" : String(item.quote.lastPrice),
      change: item.quote ? `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%` : "暂无行情",
      up: pct >= 0,
      market: item.market,
      tradable: item.tradable,
    };
  });
  const selected = liveStocks.find((s)=>s.symbol===symbol) ?? liveStocks[0] ?? {
    symbol: "",
    name: "暂无已上架证券",
    price: "—",
    change: "暂无行情",
    up: true,
    market: "US" as const,
    tradable: false,
  };
  const globalOrderEnabled =
    riskControls.find((item) => item.key === "GLOBAL")?.enabled ?? true;
  const marketOrderEnabled =
    riskControls.find((item) => item.key === selected.market)?.enabled ?? true;
  const orderEnabled = globalOrderEnabled && marketOrderEnabled;
  const visibleStocks = liveStocks.filter((stock) => {
    const marketMatch =
      marketTab === "Favorite"
        ? favorites.includes(stock.symbol)
        : stock.market === marketTab;
    const searchMatch =
      !searchText ||
      stock.symbol.toLowerCase().includes(searchText.toLowerCase()) ||
      stock.name.toLowerCase().includes(searchText.toLowerCase());
    return marketMatch && searchMatch;
  });
  const choosePercent = (ratio: number) => {
    const available = 0; // Never fabricate an account balance for order sizing.
    const price = Math.max(0.01, Number(selected.price));
    setQty(String(Math.max(1, Math.floor((available * ratio) / price))));
  };

  return (
    <div className={styles.marketTerminal}>
      <section className={styles.marketList}>
        <div className={styles.marketListHeader}><strong>Piață</strong><div className={styles.miniSearch}><Search size={14}/><input value={searchText} onChange={(event)=>setSearchText(event.target.value)} placeholder="Caută simbol / companie"/></div></div>
        <div className={styles.marketTabs}>{(["US","MX","Favorite"] as const).map((item)=><button key={item} className={marketTab===item?styles.marketTabActive:""} onClick={()=>setMarketTab(item)}>{item}</button>)}</div>
        {visibleStocks.map((s)=>(
          <button key={s.symbol} className={symbol===s.symbol?styles.stockItemActive:styles.stockItem} onClick={()=>setSymbol(s.symbol)}>
            <div><strong>{s.symbol}</strong><span>{s.name}</span></div><div><strong>{s.price}</strong><span className={s.up?styles.green:styles.red}>{s.change}</span></div>
          </button>
        ))}
        {securitiesQuery.isFetching?<div className={enh.emptyMarket}>Se sincronizează instrumentele…</div>:null}{securitiesQuery.isError?<div role="alert" className={enh.emptyMarket}>Sincronizarea nu a reușit. Verificați conexiunea și reîncărcați pagina.</div>:null}
        {visibleStocks.length===0?<div className={enh.emptyMarket}>Nu există instrumente disponibile</div>:null}
      </section>
      <section className={styles.marketCenter}>
        <div className={styles.quoteHeader}><div><h2>{selected.symbol}</h2><span>{selected.name}</span><button className={favorites.includes(selected.symbol)?enh.favoriteOn:enh.favoriteOff} onClick={()=>setFavorites(favorites.includes(selected.symbol)?favorites.filter((item)=>item!==selected.symbol):[...favorites,selected.symbol])}><Heart size={13}/>{favorites.includes(selected.symbol)?"În favorite":"Adaugă la favorite"}</button></div><div className={styles.quoteValue}><strong>{selected.price}</strong><span className={selected.up?styles.green:styles.red}>{selected.change}</span></div><div className={styles.quoteFacts}><span>Piață <b>{selected.market}</b></span><span>Maxim / Minim / Volum: date indisponibile</span></div></div>
        <div className={styles.chartToolbar}>
          {["1D","7D","1L","3L","1A","Max"].map((item) => (
            <button
              key={item}
              className={interval === item ? styles.chartActive : ""}
              onClick={() => setInterval(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <div className={styles.candleChart}>
          <p role="status">Datele OHLC în timp real nu sunt disponibile. Nu afișăm lumânări simulate ca date de piață.</p>
        </div>
        <div className={styles.marketBottom}><p>Registrul de ordine și tranzacțiile recente necesită un furnizor de date verificat; nu sunt simulate.</p></div>
      </section>
      <section className={styles.orderPanel}>
        <div className={styles.orderTabs}><button className={side==="buy"?styles.buyTab:""} onClick={()=>setSide("buy")}>Cumpără</button><button className={side==="sell"?styles.sellTab:""} onClick={()=>setSide("sell")}>Vinde</button></div>
        <div className={styles.orderSummary}><span>Fonduri disponibile</span><strong>— (neconectat)</strong></div>
        <label><span>Instrument</span><input value={selected.symbol} readOnly/></label>
        <label><span>Preț ordin</span><input value={selected.price} readOnly/></label>
        <label><span>Cantitate</span><input value={qty} onChange={(e)=>setQty(e.target.value)}/></label>
        <div className={styles.quickQty}>{[["25%",.25],["50%",.5],["75%",.75],["100%",1]].map(([label,ratio])=><button key={String(label)} disabled title="Soldul real nu este conectat">{label}</button>)}</div>
        <div className={styles.orderEstimate}><span>Valoare estimată</span><strong>{selected.price === "—" ? "—" : (Number(selected.price)*Number(qty||0)).toLocaleString(undefined,{maximumFractionDigits:2})}</strong></div>
        <button className={side==="buy"?styles.buyButton:styles.sellButton} disabled title="Endpoint-ul securizat pentru ordine nu este conectat">Plasarea ordinelor indisponibilă</button>
        <p className={styles.brokerNote}>Cotațiile și instrumentele provin din API-ul existent; soldurile și ordinele NU sunt conectate. Nicio tranzacție nu poate fi transmisă din această pagină.</p>
        {!orderEnabled?<div className={enh.riskHint}>Accesul la ordine este restricționat de controlul de risc.</div>:null}
        {notice?<div className={styles.orderNotice}>{notice}</div>:null}
      </section>
    </div>
  );
}

function OrderRows() {
  return (
    <div className={styles.orderRows}>
      {[["AAPL","BUY","100","227.19","已记录"],["WALMEX","BUY","500","58.73","处理中"],["NVDA","SELL","40","184.41","已记录"],["AMXL","BUY","800","18.94","已记录"]].map((o)=>(
        <div key={o.join("-")}><strong>{o[0]}</strong><span>{o[1]}</span><span>{o[2]}</span><span>{o[3]}</span><em>{o[4]}</em></div>
      ))}
    </div>
  );
}

function GenericPage({ view }: { view: View }) {
  const title = view==="orders"?"订单管理":view==="cash"?"资金管理":view==="positions"?"客户持仓":"系统设置";
  return (
    <div className={styles.contentStack}>
      <div className={styles.pageHeader}><div><h1>{title}</h1><p>查看和处理当前业务数据</p></div><button className={styles.secondaryButton}><ListFilter size={15}/> 筛选</button></div>
      {view==="orders"?<section className={styles.tablePanel}><table><thead><tr><th>订单号</th><th>客户</th><th>产品</th><th>方向</th><th>金额</th><th>状态</th><th>时间</th><th>操作</th></tr></thead><tbody>{["ORD-902181","ORD-902176","ORD-902168","ORD-902149","ORD-902133"].map((id,i)=><tr key={id}><td className={styles.mono}>{id}</td><td>{initialCustomers[i%initialCustomers.length].name}</td><td>{["AAPL","WALMEX","NVDA","FUND-08","IPO-24"][i]}</td><td>{i%2?"卖出":"买入"}</td><td className={styles.mono}>MXN {(8640+i*12970).toLocaleString()}</td><td><span className={i===1?styles.pendingBadge:styles.okBadge}>{i===1?"处理中":"已记录"}</span></td><td>2026-09-26 1{i}:2{i}</td><td><button className={styles.tableLink}>查看</button></td></tr>)}</tbody></table></section>:null}
      {view==="cash"?<><div className={styles.metricGrid}><Metric icon={Banknote} title="可用资金" value="MXN 18.62M" sub="全平台"/><Metric icon={CreditCard} title="冻结资金" value="MXN 1.84M" sub="订单与提现"/><Metric icon={Activity} title="今日入金" value="MXN 386,200" sub="12 笔"/><Metric icon={WalletCards} title="今日提现" value="MXN 94,700" sub="7 笔"/></div><section className={styles.panel}><div className={styles.panelTitle}><div><h3>资金申请</h3><p>充值与提现审核</p></div></div><OrderRows/></section></>:null}
      {view==="positions"?<section className={styles.tablePanel}><table><thead><tr><th>客户</th><th>证券</th><th>市场</th><th>数量</th><th>成本</th><th>现价</th><th>市值</th><th>浮动</th></tr></thead><tbody>{stocks.slice(0,5).map((s,i)=><tr key={s.symbol}><td>{initialCustomers[i%4].name}</td><td><strong>{s.symbol}</strong><span>{s.name}</span></td><td>{s.symbol==="WALMEX"||s.symbol==="AMXL"?"MX":"US"}</td><td className={styles.mono}>{[120,80,50,240,600][i]}</td><td className={styles.mono}>{(Number(s.price)*.93).toFixed(2)}</td><td className={styles.mono}>{s.price}</td><td className={styles.mono}>{(Number(s.price)*[120,80,50,240,600][i]).toLocaleString()}</td><td className={s.up?styles.green:styles.red}>{s.change}</td></tr>)}</tbody></table></section>:null}
      {view==="settings"?<div className={styles.settingsGrid}>{[["登录与安全",ShieldCheck,"管理后台账户、2FA 与会话"],["权限管理",UserCog,"管理客户与运营权限"],["银行配置",CreditCard,"维护资金账户信息"],["系统通知",Bell,"管理站内通知规则"],["品牌设置",CircleUserRound,"Logo 与界面基础信息"],["市场设置",LineChart,"US / MX 证券信息配置"]].map(([t,Icon,d]:any)=><button key={t}><Icon size={20}/><div><strong>{t}</strong><span>{d}</span></div><ChevronRight size={16}/></button>)}</div>:null}
    </div>
  );
}

function AppMirror({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  type MirrorTab =
    | "home" | "market" | "favorites" | "operate" | "account"
    | "funds" | "block" | "ipo" | "support" | "settings"
    | "cash" | "positions" | "orders" | "bank" | "kyc" | "password";

  const [tab, setTab] = useState<MirrorTab>("home");
  const [market, setMarket] = useState<"US" | "MX">("US");
  const [favorites, setFavorites] = useState(["AAPL", "NVDA", "WALMEX"]);
  const [selectedSymbol, setSelectedSymbol] = useState("AAPL");
  const selected = stocks.find((item) => item.symbol === selectedSymbol) ?? stocks[0];
  const marketStocks = stocks.filter((item) => item.market === market);
  const nested = !["home", "market", "favorites", "operate", "account"].includes(tab);

  const productRows = {
    funds: [
      { title: "Fondo Estrategia MX", meta: "90 días · Riesgo moderado", value: "8.2%–11.6%" },
      { title: "Fondo Liquidez USD", meta: "Abierto · USD", value: "NAV 1.0842" },
    ],
    block: [
      { title: "WALMEX", meta: "Mercado 58.73 · Mín. 500", value: "-8.0%" },
      { title: "AMXL", meta: "Mercado 18.94 · Mín. 800", value: "-6.5%" },
    ],
    ipo: [
      { title: "TMX Energía", meta: "Rango 1,000–20,000", value: "MXN 24.60" },
      { title: "Nova Infra", meta: "Listado estimado 10/08", value: "MXN 18.20" },
    ],
  };

  const goAccount = () => setTab("account");

  return (
    <div className={styles.mirrorShade} onMouseDown={onClose}>
      <div className={styles.phone} onMouseDown={(e)=>e.stopPropagation()}>
        <div className={styles.phoneTop}><span>9:41</span><i/><button onClick={onClose} aria-label="Cerrar espejo"><X size={15}/></button></div>

        <div className={styles.phoneHeader}>
          <img src={logoUrl} alt="Visionary Studio"/>
          <div><strong>Visionary Trading</strong><span>{customer.name} · {customer.vip}</span></div>
          <button className={styles.phoneHeaderAction} onClick={()=>setTab("support")} aria-label="Soporte"><MessageSquareText size={16}/></button>
        </div>

        {nested ? (
          <div className={styles.phoneSubHeader}>
            <button onClick={() => ["funds","block","ipo","support"].includes(tab) ? setTab("home") : goAccount()}>‹</button>
            <strong>{
              tab==="funds"?"基金":
              tab==="block"?"Operaciones en bloque":
              tab==="ipo"?"IPO":
              tab==="support"?"客服":
              tab==="settings"?"设置":
              tab==="cash"?"资金记录":
              tab==="positions"?"持仓":
              tab==="orders"?"订单":
              tab==="bank"?"银行账户":
              tab==="kyc"?"身份认证":"安全"
            }</strong>
            <span/>
          </div>
        ) : null}

        {tab==="home" ? (
          <div className={styles.phoneContent}>
            <div className={styles.mirrorNotice}>中文客户APP镜像 · 后台授权操作将记录审计。</div>
            <div className={styles.phoneSearch}><Search size={14}/>搜索股票代码或名称</div>
            <div className={styles.phoneBalance}>
              <span>账户总资产</span>
              <strong>{customer.balance}</strong>
              <small>可用资金与涨跌数据以正式客户账户为准</small>
            </div>

            <div className={styles.mirrorProductGrid}>
              <button onClick={()=>setTab("funds")}><Landmark size={18}/><strong>基金</strong><span>产品</span></button>
              <button onClick={()=>setTab("block")}><BadgeDollarSign size={18}/><strong>大宗交易</strong><span>折扣项目</span></button>
              <button onClick={()=>setTab("ipo")}><FileCheck2 size={18}/><strong>IPO</strong><span>申购</span></button>
            </div>

            <div className={styles.mirrorIndexGrid}>
              {stocks.slice(0,3).map((item)=>(
                <button key={item.symbol} onClick={()=>{setSelectedSymbol(item.symbol);setMarket(item.market);setTab("market");}}>
                  <span>{item.symbol}</span>
                  <strong>{item.price}</strong>
                  <small className={item.up?styles.green:styles.red}>{item.change}</small>
                  <i className={item.up?styles.miniTrendUp:styles.miniTrendDown}/>
                </button>
              ))}
            </div>

            <div className={styles.phoneSection}>
              <div className={styles.mirrorSectionTitle}><h3>关注行情</h3><button onClick={()=>setTab("market")}>查看全部</button></div>
              <StockRows compact/>
            </div>

            <div className={styles.mirrorNews}>
              <div><strong>通知与提醒</strong><span>正式系统消息同步</span></div>
              <ChevronRight size={15}/>
            </div>
          </div>
        ) : null}

        {tab==="market" ? (
          <div className={styles.phoneContent}>
            <div className={styles.phoneSearch}><Search size={14}/>搜索证券</div>
            <div className={styles.mirrorSegment}>
              <button className={market==="US"?styles.mirrorSegmentActive:""} onClick={()=>setMarket("US")}>美股</button>
              <button className={market==="MX"?styles.mirrorSegmentActive:""} onClick={()=>setMarket("MX")}>México</button>
            </div>
            <div className={styles.mirrorQuoteHero}>
              <div><span>{selected.symbol}</span><small>{selected.name}</small></div>
              <div><strong>{selected.price}</strong><span className={selected.up?styles.green:styles.red}>{selected.change}</span></div>
            </div>
            <div className={styles.mirrorSpark}>
              {[24,36,30,49,42,57,52,66,60,74,69,82].map((h,i)=><i key={i} style={{height:`${h}%`}}/> )}
            </div>
            <div className={styles.mirrorMarketFacts}><span>Máx.<b>231.44</b></span><span>Mín.<b>223.98</b></span><span>Vol.<b>42.8M</b></span></div>
            <div className={styles.mirrorStockList}>
              {marketStocks.map((item)=>(
                <button key={item.symbol} className={selected.symbol===item.symbol?styles.mirrorStockActive:""} onClick={()=>setSelectedSymbol(item.symbol)}>
                  <div><strong>{item.symbol}</strong><span>{item.name}</span></div>
                  <div><strong>{item.price}</strong><span className={item.up?styles.green:styles.red}>{item.change}</span></div>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {tab==="favorites" ? (
          <div className={styles.phoneContent}>
            <div className={styles.phoneSearch}><Search size={14}/>Buscar en favoritos</div>
            <div className={styles.mirrorIndexGrid}>
              {stocks.slice(0,3).map((item)=><button key={item.symbol}><span>{item.symbol}</span><strong>{item.price}</strong><small className={item.up?styles.green:styles.red}>{item.change}</small></button>)}
            </div>
            <div className={styles.mirrorStockList}>
              {stocks.filter((item)=>favorites.includes(item.symbol)).map((item)=>(
                <button key={item.symbol} onClick={()=>setFavorites(favorites.filter((symbol)=>symbol!==item.symbol))}>
                  <div><strong>♥ {item.symbol}</strong><span>{item.name} · {item.market}</span></div>
                  <div><strong>{item.price}</strong><span className={item.up?styles.green:styles.red}>{item.change}</span></div>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {tab==="operate" ? (
          <div className={styles.phoneContent}>
            <div className={styles.mirrorPortfolioGrid}>
              <div><span>Valor MX</span><strong>MXN 62,390</strong><small className={styles.green}>+2.18%</small></div>
              <div><span>Ganancia MX</span><strong>+1,324.80</strong><small>Hoy</small></div>
              <div><span>Valor US</span><strong>USD 3,471</strong><small className={styles.green}>+0.82%</small></div>
              <div><span>Ganancia US</span><strong>+84.30</strong><small>Hoy</small></div>
            </div>
            <div className={styles.mirrorSectionTitle}><h3>Posiciones</h3><button onClick={()=>setTab("positions")}>Detalle</button></div>
            {stocks.slice(0,4).map((item,i)=>(
              <div className={enh.phoneRecord} key={item.symbol}>
                <div><strong>{item.symbol}</strong><span>{[120,600,80,50][i]} acciones · Costo {(Number(item.price)*.93).toFixed(2)}</span></div>
                <b className={item.up?styles.green:styles.red}>{item.change}</b>
              </div>
            ))}
            <button className={styles.mirrorWideAction} onClick={()=>setTab("orders")}><ListFilter size={15}/> Historial de órdenes <ChevronRight size={14}/></button>
          </div>
        ) : null}

        {tab==="account" ? (
          <div className={styles.phoneContent}>
            <div className={styles.mirrorAccountHero}>
              <div className={styles.avatar}>{customer.name.slice(0,1)}</div>
              <div><strong>{customer.name}</strong><span>ID {customer.id} · {customer.kyc}</span><small>{customer.vip}</small></div>
              <button onClick={()=>setTab("settings")}><Settings size={16}/></button>
            </div>
            <div className={styles.mirrorAccountBalance}><span>Portafolio total</span><strong>{customer.balance}</strong><small>Disponible MXN 186,240 · Pendiente MXN 48,500</small></div>
            <div className={styles.phoneMenu}>
              <button onClick={()=>setTab("cash")}><Banknote size={18}/><span>Depositar</span></button>
              <button onClick={()=>setTab("cash")}><CreditCard size={18}/><span>Retirar</span></button>
              <button onClick={()=>setTab("orders")}><ListFilter size={18}/><span>Historial</span></button>
              <button onClick={()=>setTab("positions")}><WalletCards size={18}/><span>Posiciones</span></button>
            </div>
            <div className={styles.mirrorScoreRow}><span>Crédito <strong>100</strong></span><button>Mi préstamo <ChevronRight size={13}/></button></div>
            <button className={styles.phoneLine} onClick={()=>setTab("bank")}>Cuenta bancaria<ChevronRight size={14}/></button>
            <button className={styles.phoneLine} onClick={()=>setTab("kyc")}>Verificación de identidad<ChevronRight size={14}/></button>
            <button className={styles.phoneLine} onClick={()=>setTab("password")}>Contraseñas<ChevronRight size={14}/></button>
            <button className={styles.phoneLine} onClick={()=>setTab("settings")}>Configuración y notificaciones<ChevronRight size={14}/></button>
          </div>
        ) : null}

        {(["funds","block","ipo"] as MirrorTab[]).includes(tab) ? (
          <div className={styles.phoneContent}>
            <div className={styles.mirrorProductBanner}>
              <span>{tab==="funds"?"INVERSIÓN":tab==="block"?"PRECIO ESPECIAL":"OFERTA PÚBLICA"}</span>
              <strong>{tab==="funds"?"Fondos de inversión":tab==="block"?"Operaciones en bloque":"IPO"}</strong>
              <small>正式系统数据同步 · 后台授权操作将记录审计</small>
            </div>
            {productRows[tab as "funds"|"block"|"ipo"].map((item)=>(
              <div className={styles.mirrorProductCard} key={item.title}>
                <div><strong>{item.title}</strong><span>{item.meta}</span></div>
                <b>{item.value}</b>
                <button onClick={()=>setTab("operate")}>进入操作</button>
              </div>
            ))}
            <button className={styles.mirrorWideAction} onClick={()=>setTab("orders")}>Ver historial relacionado <ChevronRight size={14}/></button>
          </div>
        ) : null}

        {tab==="support" ? (
          <div className={styles.phoneContent}>
            <div className={styles.mirrorSupportWelcome}><MessageSquareText size={24}/><strong>Hola, ¿en qué podemos ayudarle?</strong><span>Soporte de cuenta y operaciones</span></div>
            <div className={styles.mirrorChatBubble}>Bienvenido a soporte. Seleccione una consulta o escriba un mensaje.</div>
            <div className={styles.mirrorChatBubbleClient}>Necesito revisar el estado de una orden.</div>
            <div className={styles.mirrorChatComposer}><span>Escriba un mensaje…</span><button>Enviar</button></div>
          </div>
        ) : null}

        {tab==="settings" ? (
          <div className={styles.phoneContent}>
            <button className={styles.phoneLine} onClick={()=>setTab("password")}>Contraseña de acceso<ChevronRight size={14}/></button>
            <button className={styles.phoneLine} onClick={()=>setTab("password")}>Contraseña de transacción<ChevronRight size={14}/></button>
            <button className={styles.phoneLine} onClick={()=>setTab("kyc")}>Verificación de identidad<ChevronRight size={14}/></button>
            <button className={styles.phoneLine} onClick={()=>setTab("bank")}>Agregar cuenta bancaria<ChevronRight size={14}/></button>
            <button className={styles.phoneLine}>Notificaciones<ChevronRight size={14}/></button>
            <button className={styles.phoneLine}>Idioma · Español (México)<ChevronRight size={14}/></button>
            <button className={styles.mirrorLogout}>Cerrar sesión</button>
          </div>
        ) : null}

        {tab==="cash" ? <div className={styles.phoneContent}><div className={enh.phonePageTitle}><strong>Movimientos</strong><span>Depósitos / retiros</span></div>{[["Depósito","MXN 120,000","Pendiente"],["Retiro","MXN 48,500","En revisión"],["Depósito","USD 18,000","Aprobado"]].map((row)=><div className={enh.phoneRecord} key={row.join("-")}><div><strong>{row[0]}</strong><span>{row[2]}</span></div><b>{row[1]}</b></div>)}</div> : null}
        {tab==="positions" ? <div className={styles.phoneContent}><div className={enh.phonePageTitle}><strong>Posiciones</strong><span>Valor y rendimiento</span></div>{stocks.slice(0,4).map((s,i)=><div className={enh.phoneRecord} key={s.symbol}><div><strong>{s.symbol}</strong><span>{[120,600,80,50][i]} acciones · {s.name}</span></div><b className={s.up?styles.green:styles.red}>{s.change}</b></div>)}</div> : null}
        {tab==="orders" ? <div className={styles.phoneContent}><div className={enh.phonePageTitle}><strong>Historial de órdenes</strong><span>Acciones / bloques / IPO / fondos</span></div>{[["AAPL","Compra","Registrada"],["WALMEX","Bloque","Procesando"],["TMX","IPO","Pendiente de asignación"],["FG-019","Fondo","Pendiente"]].map((row)=><div className={enh.phoneRecord} key={row.join("-")}><div><strong>{row[0]}</strong><span>{row[1]}</span></div><b>{row[2]}</b></div>)}</div> : null}
        {tab==="bank" ? <div className={styles.phoneContent}><div className={enh.phonePageTitle}><strong>Cuentas bancarias</strong><span>Administración de retiro</span></div><div className={enh.phoneBank}><CreditCard size={20}/><div><strong>BBVA México</strong><span>•••• 7812 · Predeterminada</span></div></div><div className={enh.phoneBank}><CreditCard size={20}/><div><strong>Santander</strong><span>•••• 3097</span></div></div><button className={enh.phonePrimary}>Agregar cuenta bancaria</button></div> : null}
        {tab==="kyc" ? <div className={styles.phoneContent}><div className={enh.phonePageTitle}><strong>Verificación de identidad</strong><span>Estado de documentación</span></div><div className={enh.phoneStatusCard}><FileCheck2 size={28}/><strong>{customer.kyc}</strong><span>{customer.name}</span><small>CURP / Pasaporte protegido</small></div></div> : null}
        {tab==="password" ? <div className={styles.phoneContent}><div className={enh.phonePageTitle}><strong>Seguridad</strong><span>Acceso y transacciones</span></div><label className={enh.phoneField}><span>Contraseña actual</span><input type="password"/></label><label className={enh.phoneField}><span>Nueva contraseña</span><input type="password"/></label><label className={enh.phoneField}><span>Confirmar contraseña</span><input type="password"/></label><button className={enh.phonePrimary}>Guardar cambios</button></div> : null}

        <div className={styles.phoneNav}>
          <button className={tab==="home"?styles.phoneNavActive:""} onClick={()=>setTab("home")}><LayoutDashboard size={17}/><span>首页</span></button>
          <button className={tab==="market"?styles.phoneNavActive:""} onClick={()=>setTab("market")}><LineChart size={17}/><span>行情</span></button>
          <button className={tab==="favorites"?styles.phoneNavActive:""} onClick={()=>setTab("favorites")}><Heart size={17}/><span>自选</span></button>
          <button className={tab==="operate"?styles.phoneNavActive:""} onClick={()=>setTab("operate")}><Activity size={17}/><span>交易</span></button>
          <button className={tab==="account"?styles.phoneNavActive:""} onClick={()=>setTab("account")}><CircleUserRound size={17}/><span>账户</span></button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [role, setRole] = useState<Role | null>(null);
  const [name, setName] = useState("");
  const [view, setView] = useState<View>("dashboard");
  const [customers, setCustomers] = useState(initialCustomers);
  const [mirrorCustomer, setMirrorCustomer] = useState<Customer | null>(null);
  const [riskControls, setRiskControls] = useState<RiskControl[]>(defaultRiskControls);
  const portal: Portal =
    typeof window !== "undefined" &&
    (
      window.location.hostname.toLowerCase() === "admin.sasakic.cc" ||
      new URLSearchParams(window.location.search).get("portal") === "admin"
    )
      ? "admin"
      : "client";

  if (!role) {
    return <LoginScreen portal={portal} onLogin={(nextRole, nextName)=>{setRole(nextRole);setName(nextName);setView("dashboard");}} />;
  }

  const content =
    view === "dashboard" ? (
      <Dashboard role={role} name={name} onOpenMarket={()=>setView("market")} onNavigate={setView} />
    ) : view === "customers" && role !== "client" ? (
      <CustomersPage customers={customers} setCustomers={setCustomers} onMirror={setMirrorCustomer} />
    ) : view === "market" ? (
      <MarketPage riskControls={riskControls} />
    ) : ["products", "loans", "notifications", "opsAccounts", "audit"].includes(view) ? (
      <OperationsPage view={view as OperationsView} role={role} />
    ) : ["securities", "purchaseAccess", "risk", "support"].includes(view) ? (
      <AdminControlPage view={view as AdminControlView} role={role} accountName={name} riskControls={riskControls} onRiskControlsChange={setRiskControls} />
    ) : ["orders", "cash", "positions", "settings"].includes(view) ? (
      <CoreWorkflowPage view={view as CoreWorkflowView} role={role} accountName={name} riskControls={riskControls} />
    ) : (
      <GenericPage view={view} />
    );

  return (
    <main className={styles.appShell}>
      <Sidebar role={role} view={view} onView={setView} onLogout={()=>{project4Api.logoutAdmin();setRole(null);setName("");}} />
      <div className={styles.workspace}>
        <Topbar name={name} role={role} onNavigate={setView} />
        <div className={styles.workspaceBody}>
          {view !== "securities" && view !== "opsAccounts" ? (
            <p role="status" style={{ padding: "9px 16px", margin: "0 0 12px", borderRadius: 10, background: "#fff1dc", color: "#593b16", fontSize: 13 }}>
              演示数据区域：此页面的账户、订单、余额、持仓、贷款及业务操作尚未接入真实后端；不得用于真实交易或作为操作成功凭据。
            </p>
          ) : null}
          {content}
        </div>
      </div>
      {mirrorCustomer ? <AppMirror customer={mirrorCustomer} onClose={()=>setMirrorCustomer(null)} /> : null}
    </main>
  );
}
