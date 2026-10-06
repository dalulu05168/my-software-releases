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

const logoUrl = "/brantone-veyor-logo-v3.png";

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
    name: "Andrei Popescu",
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
  dashboard: "Panou de control",
  products: "Produse",
  orders: "Ordine",
  cash: "Fonduri",
  positions: "Portofoliu",
  loans: "Împrumuturi",
  notifications: "Notificări",
  market: "Piețe",
  support: "Asistență",
  settings: "Profil și securitate",
};


function RoleLabel({ role }: { role: Role }) {
  return (
    <span className={styles.roleLabel}>
      {role === "master" ? "总账户" : role === "ops" ? "子账户" : "Client"}
    </span>
  );
}

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? styles.logoCompact : styles.logoBlock}>
      <img
        src={logoUrl}
        alt="Brantone Veylor Private Capital Advisory"
        draggable={false}
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
    if (mode === "forgot") {
      setResetMessage(
        portal === "client"
          ? "Verificarea a fost finalizată. Setați o parolă nouă."
          : "验证完成，请设置新的登录密码。",
      );
      return;
    }
    if (portal === "admin") {
      setLoggingIn(true);
      try {
        const result = await project4Api.loginAdmin(
          account.trim(),
          password,
          totp,
        );
        onLogin(result.role, result.displayName || account.trim() || (result.role === "master" ? "Master Admin" : "Operations Admin"));
      } catch (error) {
        const code = error instanceof Error ? error.message : "LOGIN_FAILED";
        setLoginError(
          code === "INVALID_TOTP"
            ? "Google 2FA 验证码错误"
            : code === "ACCOUNT_TEMPORARILY_LOCKED"
              ? "账户因连续验证失败已临时锁定，请稍后再试"
              : "后台账户、密码或验证码不正确",
        );
      } finally {
        setLoggingIn(false);
      }
      return;
    }
    const role: Role =
      portal === "client"
        ? "client"
        : /^(ops|sub|运营|子账户)/i.test(account.trim())
          ? "ops"
          : "master";
    const displayName =
      mode === "register"
        ? name.trim() || "Client"
        : account.includes("@")
          ? account.split("@")[0]
          : account.trim() ||
            (role === "master"
              ? "Master Admin"
              : role === "ops"
                ? "Operations Admin"
                : "Andrei Popescu");
    onLogin(role, displayName);
  };

  const isClient = portal === "client";

  return (
    <main className={`${styles.loginPage} ${isClient ? styles.clientLogin : styles.adminLogin}`}>
      <section className={styles.loginVisual}>
        <div className={styles.loginHeroTop}>
          <div className={styles.loginBrand}>
            <Logo />
          </div>
          <div className={styles.brandMeta}>
            <span>EST. 1996</span>
            <span>{isClient ? "BUCUREȘTI · PRIVATE CAPITAL" : "PRIVATE CAPITAL · OPERATIONS"}</span>
          </div>
        </div>

        <div className={styles.visualText}>
          <span className={styles.eyebrow}>
            {isClient
              ? "BRANTONE VEYLOR · PRIVATE CAPITAL ADVISORY"
              : "BRANTONE VEYLOR · PRIVATE CAPITAL ADVISORY"}
          </span>
          <h1>
            {isClient
              ? "Tradiție românească. Capital pentru generațiile viitoare."
              : "私人资本运营管理中心"}
          </h1>
          <p>
            {isClient
              ? "Disciplină. Încredere. Viziune pe termen lung. Acces securizat la portofoliu, piețe, ordine și servicii de consultanță într-un mediu financiar european clar și controlat."
              : "客户、资金、订单、持仓、证券与风险控制统一管理。安全认证、权限分级与全流程审计集中于同一工作台。"}
          </p>
        </div>

        <div className={styles.visualGrid}>
          {isClient ? (
            <>
              <div><ShieldCheck size={20}/><strong>ACCES SECURIZAT</strong><span>Protecție pentru accesul la cont</span></div>
              <div><WalletCards size={20}/><strong>VIZUALIZARE PORTOFOLIU</strong><span>Poziții și valoare într-o singură vedere</span></div>
              <div><Activity size={20}/><strong>ORDINE ȘI TRANZACȚII</strong><span>Flux operațional clar și controlat</span></div>
              <div><MessageSquareText size={20}/><strong>SUPORT DEDICAT</strong><span>Asistență în limba română</span></div>
            </>
          ) : (
            <>
              <div><strong>SECURITY</strong><span>安全认证</span></div>
              <div><strong>2FA</strong><span>动态验证</span></div>
              <div><strong>VIP 1–5</strong><span>客户等级</span></div>
              <div><strong>AUDIT</strong><span>操作审计</span></div>
            </>
          )}
        </div>

        <div className={styles.romanianSignature}>
          <span>{isClient ? "ROMÂNIA · PRIVATE CAPITAL" : "ROMANIA · PRIVATE CAPITAL"}</span>
          <i />
        </div>
      </section>

      <section className={styles.loginPanel}>
        <div className={styles.loginPanelInner}>
          <div className={styles.mobileLogo}><Logo /></div>
          <div className={styles.panelBrandMark}>
            <span>BRANTONE VEYLOR</span>
            <small>{isClient ? "ACCES SECURIZAT" : "SECURE OPERATIONS ACCESS"}</small>
          </div>

          <form className={styles.loginForm} onSubmit={submit}>
            <div className={styles.formTitle}>
              <span className={styles.roleLabel}>
                {isClient ? "CLIENT" : "后台管理"}
              </span>
              <h2>
                {isClient
                  ? mode === "register"
                    ? "Creați cont"
                    : mode === "forgot"
                      ? "Recuperați accesul"
                      : "Autentificare"
                  : "后台登录"}
              </h2>
              <p>
                {isClient
                  ? mode === "forgot"
                    ? "Verificați contul și setați o parolă nouă."
                    : "Introduceți datele contului pentru acces securizat."
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
              <input
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                placeholder={isClient ? "+40 7xx xxx xxx / nume@exemplu.ro" : "请输入后台账户"}
              />
            </label>

            {mode !== "forgot" ? (
              <label>
                <span>{isClient ? "Parolă" : "登录密码"}</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isClient ? "Introduceți parola" : "请输入密码"}
                />
              </label>
            ) : (
              <>
                <label>
                  <span>{isClient ? "Cod de verificare" : "验证码"}</span>
                  <input
                    inputMode="numeric"
                    placeholder={isClient ? "Introduceți codul primit" : "输入收到的验证码"}
                    maxLength={6}
                  />
                </label>
                <label>
                  <span>{isClient ? "Parolă nouă" : "新密码"}</span>
                  <input
                    type="password"
                    placeholder={isClient ? "Setați o parolă nouă" : "设置新的登录密码"}
                  />
                </label>
              </>
            )}

            {isClient && mode === "register" ? (
              <label>
                <span>Confirmați parola</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repetați parola"
                />
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
                <input
                  value={invite}
                  onChange={(e) => setInvite(e.target.value)}
                  placeholder="Introduceți codul de invitație"
                />
              </label>
            ) : null}

            {resetMessage ? <div className={enh.formNotice}>{resetMessage}</div> : null}
            {loginError ? <div className={enh.formNotice}>{loginError}</div> : null}

            {isClient && mode === "login" ? (
              <div className={styles.rememberRow}>
                <label className={styles.rememberCheck}><input type="checkbox" /><span>Ține-mă minte</span></label>
                <button type="button" className={styles.inlineForgot} onClick={() => { setMode("forgot"); setResetMessage(""); }}>Ai uitat parola?</button>
              </div>
            ) : null}

            <button className={styles.primaryButton} type="submit">
              {isClient
                ? mode === "register"
                  ? "Creați cont"
                  : mode === "forgot"
                    ? "Confirmați modificarea"
                    : "Intră"
                : loggingIn ? "验证中…" : "进入后台"}
              <ChevronRight size={17} />
            </button>


            {isClient ? (
              <button
                type="button"
                className={styles.textButton}
                onClick={() => { setMode(mode === "login" ? "register" : "login"); setResetMessage(""); }}
              >
                {mode === "login"
                  ? "Nu aveți cont? Înregistrați-vă cu un cod de invitație"
                  : "Înapoi la autentificare"}
              </button>
            ) : null}
          </form>

          <div className={styles.panelFooter}>
            <span>{isClient ? "Brantone Veylor · România" : "Brantone Veylor · Private Capital Advisory"}</span>
            <i />
          </div>
        </div>
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
      <div className={styles.sidebarLogo}><Logo compact /></div>
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
              <span>{role === "client" ? (clientNavLabels[item.key] ?? item.label) : item.label}</span>
            </button>
          );
        })}
      </nav>
      <button className={styles.logout} onClick={onLogout}>
        <LogOut size={17} />
        <span>{role === "client" ? "Deconectare" : "退出登录"}</span>
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
      <div>
        <strong>{role === "client" ? "Bun venit" : "您好"}，{name}</strong>
        <span>{role === "master" ? "全平台运营控制台" : role === "ops" ? "客户运营工作台" : "Centrul contului de investiții"}</span>
      </div>
      <div className={styles.topbarActions}>
        <button onClick={() => onNavigate(role === "client" ? "market" : "customers")}><Search size={17} /></button>
        <button onClick={() => onNavigate("notifications")}><Bell size={17} /><i /></button>
        <div className={styles.profile}>
          <div className={styles.avatar}>{name.slice(0, 1).toUpperCase()}</div>
          <div><strong>{name}</strong><span>{role === "master" ? "Master Admin" : role === "ops" ? "Operations Admin" : "Cont client"}</span></div>
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
          <div><h1>Panou de control</h1><p>O perspectivă completă asupra portofoliului dumneavoastră, {name}</p></div>
          <button className={styles.primarySmall} onClick={onOpenMarket}>Vezi piețele <ChevronRight size={15} /></button>
        </div>
        <section className={styles.heroBalance}>
          <div><span>Valoarea totală a portofoliului</span><strong>RON 248,630.80</strong><small>Disponibil RON 186,240.00 · EUR 3,471.20</small></div>
          <div className={styles.heroStats}>
            <div><span>Variația de azi</span><strong className={styles.green}>+2,418.70</strong></div>
            <div><span>Poziții</span><strong>8</strong></div>
            <div><span>Nivel cont</span><strong>VIP3</strong></div>
          </div>
        </section>
        <div className={styles.metricGrid}>
          <Metric icon={WalletCards} title="Sold disponibil" value="RON 186,240" sub="Disponibil acum" />
          <Metric icon={LineChart} title="Valoarea pozițiilor" value="RON 62,390" sub="8 poziții" />
          <Metric icon={Heart} title="Lista de urmărire" value="12" sub="US / EU" />
          <Metric icon={ShieldCheck} title="Identitate verificată" value="Finalizat" sub="Cont în stare normală" />
        </div>
        <div className={styles.twoColumns}>
          <section className={styles.panel}>
            <div className={styles.panelTitle}><div><h3>Piețe principale</h3><p>Ultimele prețuri</p></div><button onClick={onOpenMarket}>Vezi toate</button></div>
            <StockRows compact clientLocale />
          </section>
          <section className={styles.panel}>
            <div className={styles.panelTitle}><div><h3>Ordine recente</h3><p>Activitatea contului</p></div></div>
            <OrderRows clientLocale />
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

function StockRows({ compact = false, clientLocale = false }: { compact?: boolean; clientLocale?: boolean }) {
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
      change: item.quote ? `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%` : (clientLocale ? "Fără cotație" : "暂无行情"),
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

function MarketPage({ riskControls, role }: { riskControls: RiskControl[]; role: Role }) {
  const clientLocale = role === "client";
  const [symbol, setSymbol] = useState("AAPL");
  const [side, setSide] = useState<"buy"|"sell">("buy");
  const [interval, setInterval] = useState("分时");
  const [marketTab, setMarketTab] = useState<"US"|"MX"|"自选">("US");
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
      price: item.quote?.lastPrice == null ? "0" : String(item.quote.lastPrice),
      change: item.quote ? `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%` : (clientLocale ? "Fără cotație" : "暂无行情"),
      up: pct >= 0,
      market: item.market,
      tradable: item.tradable,
      quotePercent: item.quote?.percentChange == null ? null : Number(item.quote.percentChange),
      quoteTimestamp: item.quote?.providerTimestamp ?? null,
      quoteProvider: item.referenceProvider ?? item.marketDataProviderKey ?? null,
    };
  });
  const selected = liveStocks.find((s)=>s.symbol===symbol) ?? liveStocks[0] ?? {
    symbol: "",
    name: clientLocale ? "Nu există instrumente listate" : "暂无已上架证券",
    price: "0",
    change: clientLocale ? "Fără cotație" : "暂无行情",
    up: true,
    market: "US" as const,
    tradable: false,
    quotePercent: null,
    quoteTimestamp: null,
    quoteProvider: null,
  };
  const globalOrderEnabled =
    riskControls.find((item) => item.key === "GLOBAL")?.enabled ?? true;
  const marketOrderEnabled =
    riskControls.find((item) => item.key === selected.market)?.enabled ?? true;
  const orderEnabled = globalOrderEnabled && marketOrderEnabled;
  const visibleStocks = liveStocks.filter((stock) => {
    const marketMatch =
      marketTab === "自选"
        ? favorites.includes(stock.symbol)
        : stock.market === marketTab;
    const searchMatch =
      !searchText ||
      stock.symbol.toLowerCase().includes(searchText.toLowerCase()) ||
      stock.name.toLowerCase().includes(searchText.toLowerCase());
    return marketMatch && searchMatch;
  });
  const choosePercent = (ratio: number) => {
    const available = 186240;
    const price = Math.max(0.01, Number(selected.price));
    setQty(String(Math.max(1, Math.floor((available * ratio) / price))));
  };

  return (
    <div className={styles.marketTerminal}>
      <section className={styles.marketList}>
        <div className={styles.marketListHeader}><strong>{clientLocale ? "Piețe" : "证券行情"}</strong><div className={styles.miniSearch}><Search size={14}/><input value={searchText} onChange={(event)=>setSearchText(event.target.value)} placeholder={clientLocale ? "Caută simbol / nume" : "搜索代码 / 名称"}/></div></div>
        <div className={styles.marketTabs}>{(["US","MX","自选"] as const).map((item)=><button key={item} className={marketTab===item?styles.marketTabActive:""} onClick={()=>setMarketTab(item)}>{clientLocale && item === "自选" ? "Urmărite" : item}</button>)}</div>
        {visibleStocks.map((s)=>(
          <button key={s.symbol} className={symbol===s.symbol?styles.stockItemActive:styles.stockItem} onClick={()=>setSymbol(s.symbol)}>
            <div><strong>{s.symbol}</strong><span>{s.name}</span></div><div><strong>{s.price}</strong><span className={s.up?styles.green:styles.red}>{s.change}</span></div>
          </button>
        ))}
        {securitiesQuery.isFetching?<div className={enh.emptyMarket}>{clientLocale ? "Se sincronizează instrumentele…" : "正在同步后台证券…"}</div>:null}
        {visibleStocks.length===0?<div className={enh.emptyMarket}>{clientLocale ? "Nu există instrumente potrivite" : "没有匹配的证券"}</div>:null}
      </section>
      <section className={styles.marketCenter}>
        <div className={styles.quoteHeader}><div><h2>{selected.symbol}</h2><span>{selected.name}</span><button className={favorites.includes(selected.symbol)?enh.favoriteOn:enh.favoriteOff} onClick={()=>setFavorites(favorites.includes(selected.symbol)?favorites.filter((item)=>item!==selected.symbol):[...favorites,selected.symbol])}><Heart size={13}/>{favorites.includes(selected.symbol)?(clientLocale?"Urmărit":"已自选"):(clientLocale?"Adaugă la urmărite":"加入自选")}</button></div><div className={styles.quoteValue}><strong>{selected.price}</strong><span className={selected.up?styles.green:styles.red}>{selected.change}</span></div><div className={styles.quoteFacts}>
          <span>{clientLocale?"Piață":"市场"} <b>{selected.market}</b></span>
          <span>{clientLocale?"Sursă":"数据源"} <b>{selected.quoteProvider || "—"}</b></span>
          <span>{clientLocale?"Ora cotației":"报价时间"} <b>{selected.quoteTimestamp ? new Date(selected.quoteTimestamp).toLocaleTimeString(clientLocale?"ro-RO":"zh-CN",{hour12:false}) : "—"}</b></span>
          <span>{clientLocale?"Stare":"状态"} <b>{selected.quoteTimestamp ? (clientLocale?"Cotație disponibilă":"报价可用") : (clientLocale?"Fără cotație":"暂无报价")}</b></span>
        </div></div>
        <div className={styles.chartToolbar}>
          {["分时","1分","5分","15分","1小时","日K"].map((item) => (
            <button
              key={item}
              className={interval === item ? styles.chartActive : ""}
              onClick={() => setInterval(item)}
            >
              {clientLocale ? ({"分时":"Intraday","1分":"1m","5分":"5m","15分":"15m","1小时":"1h","日K":"1D"} as Record<string,string>)[item] : item}
            </button>
          ))}
        </div>
        <div className={styles.candleChart}>
          <InteractiveCandleChart
            symbol={selected.symbol}
            interval={interval}
            currentPrice={Number(selected.price) || null}
            percentChange={selected.quotePercent}
            providerTimestamp={selected.quoteTimestamp}
            locale={clientLocale ? "ro" : "zh"}
          />
        </div>
        <div className={styles.marketBottom}>
          <section>
            <h3>{clientLocale?"Registru ordine":"盘口"}</h3>
            <div className={styles.marketDataUnavailable}>
              <span>{clientLocale?"Datele Level 2 nu sunt conectate.":"Level 2五档盘口数据源尚未接入。"}</span>
            </div>
          </section>
          <section>
            <h3>{clientLocale?"Tranzacții recente":"最近成交"}</h3>
            <div className={styles.marketDataUnavailable}>
              <span>{clientLocale?"Fluxul de tranzacții tick-by-tick nu este conectat.":"逐笔成交数据源尚未接入。"}</span>
            </div>
          </section>
        </div>
      </section>
      <section className={styles.orderPanel}>
        <div className={styles.orderTabs}><button className={side==="buy"?styles.buyTab:""} onClick={()=>setSide("buy")}>{clientLocale?"Cumpărare":"买入"}</button><button className={side==="sell"?styles.sellTab:""} onClick={()=>setSide("sell")}>{clientLocale?"Vânzare":"卖出"}</button></div>
        <div className={styles.orderSummary}><span>{clientLocale?"Sold disponibil":"可用资金"}</span><strong>{clientLocale?"RON":"MXN"} 186,240.00</strong></div>
        <label><span>{clientLocale?"Instrument":"证券"}</span><input value={selected.symbol} readOnly/></label>
        <label><span>{clientLocale?"Preț":"价格"}</span><input value={selected.price} readOnly/></label>
        <label><span>{clientLocale?"Cantitate":"数量"}</span><input value={qty} onChange={(e)=>setQty(e.target.value)}/></label>
        <div className={styles.quickQty}>{[["25%",.25],["50%",.5],["75%",.75],["100%",1]].map(([label,ratio])=><button key={String(label)} onClick={()=>choosePercent(Number(ratio))}>{label}</button>)}</div>
        <div className={styles.orderEstimate}><span>{clientLocale?"Valoare estimată":"预计金额"}</span><strong>{(Number(selected.price)*Number(qty||0)).toLocaleString(undefined,{maximumFractionDigits:2})}</strong></div>
        <button className={side==="buy"?styles.buyButton:styles.sellButton} disabled={!orderEnabled || !selected.tradable} onClick={()=>orderEnabled&&selected.tradable&&setNotice(clientLocale ? `${side==="buy"?"Ordin de cumpărare":"Ordin de vânzare"} înregistrat: ${selected.symbol} × ${qty}` : `${side==="buy"?"买入":"卖出"}订单已记录：${selected.symbol} × ${qty}`)}>{clientLocale ? (!selected.symbol?"Niciun instrument disponibil":!selected.tradable?"Instrument indisponibil pentru ordine":orderEnabled?(side==="buy"?"Trimite ordin de cumpărare":"Trimite ordin de vânzare"):"Ordinele sunt restricționate") : (!selected.symbol?"暂无可交易证券":!selected.tradable?"该证券未开放内部下单":orderEnabled?(side==="buy"?"提交买单":"提交卖单"):"当前市场下单受限")}</button>
        <p className={styles.brokerNote}>{clientLocale ? "Tranzacționarea prin broker extern nu este conectată; ordinele sunt înregistrate doar în sistem." : "外部券商交易未接入，提交内容仅记录于当前系统。"}</p>
        {!orderEnabled?<div className={enh.riskHint}>{clientLocale ? "Această funcție este dezactivată de controlul de risc." : "该入口已被总账户风控关闭。"}</div>:null}
        {notice?<div className={styles.orderNotice}>{notice}</div>:null}
      </section>
    </div>
  );
}

function OrderRows({ clientLocale = false }: { clientLocale?: boolean }) {
  return (
    <div className={styles.orderRows}>
      {[["AAPL","BUY","100","227.19",clientLocale?"Înregistrat":"已记录"],["WALMEX","BUY","500","58.73",clientLocale?"În procesare":"处理中"],["NVDA","SELL","40","184.41",clientLocale?"Înregistrat":"已记录"],["AMXL","BUY","800","18.94",clientLocale?"Înregistrat":"已记录"]].map((o)=>(
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
      {view==="orders"?<section className={styles.tablePanel}><table><thead><tr><th>订单号</th><th>客户</th><th>Produse</th><th>方向</th><th>金额</th><th>状态</th><th>时间</th><th>操作</th></tr></thead><tbody>{["ORD-902181","ORD-902176","ORD-902168","ORD-902149","ORD-902133"].map((id,i)=><tr key={id}><td className={styles.mono}>{id}</td><td>{initialCustomers[i%initialCustomers.length].name}</td><td>{["AAPL","WALMEX","NVDA","FUND-08","IPO-24"][i]}</td><td>{i%2?"卖出":"买入"}</td><td className={styles.mono}>MXN {(8640+i*12970).toLocaleString()}</td><td><span className={i===1?styles.pendingBadge:styles.okBadge}>{i===1?"处理中":"已记录"}</span></td><td>2026-09-26 1{i}:2{i}</td><td><button className={styles.tableLink}>查看</button></td></tr>)}</tbody></table></section>:null}
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
      { title: "Fond Strategie România", meta: "90 zile · Risc moderat", value: "8.2%–11.6%" },
      { title: "Fond Lichiditate EUR", meta: "Deschis · EUR", value: "NAV 1.0842" },
    ],
    block: [
      { title: "WALMEX", meta: "Piață 58.73 · Min. 500", value: "-8.0%" },
      { title: "AMXL", meta: "Piață 18.94 · Min. 800", value: "-6.5%" },
    ],
    ipo: [
      { title: "Energie România", meta: "Interval 1.000–20.000", value: "MXN 24.60" },
      { title: "Nova Infra", meta: "Listare estimată 10/08", value: "MXN 18.20" },
    ],
  };

  const goAccount = () => setTab("account");

  return (
    <div className={styles.mirrorShade} onMouseDown={onClose}>
      <div className={styles.phone} onMouseDown={(e)=>e.stopPropagation()}>
        <div className={styles.phoneTop}><span>9:41</span><i/><button onClick={onClose} aria-label="Închide previzualizarea"><X size={15}/></button></div>

        <div className={styles.phoneHeader}>
          <img src={logoUrl} alt="Brantone Veylor"/>
          <div><strong>Brantone Veylor</strong><span>{customer.name} · {customer.vip}</span></div>
          <button className={styles.phoneHeaderAction} onClick={()=>setTab("support")} aria-label="Asistență"><MessageSquareText size={16}/></button>
        </div>

        {nested ? (
          <div className={styles.phoneSubHeader}>
            <button onClick={() => ["funds","block","ipo","support"].includes(tab) ? setTab("home") : goAccount()}>‹</button>
            <strong>{
              tab==="funds"?"Fonduri":
              tab==="block"?"Tranzacții în bloc":
              tab==="ipo"?"IPO":
              tab==="support"?"Asistență":
              tab==="settings"?"Setări":
              tab==="cash"?"Fonduri":
              tab==="positions"?"Portofoliu":
              tab==="orders"?"Ordine":
              tab==="bank"?"Conturi bancare":
              tab==="kyc"?"Verificare identitate":"Securitate"
            }</strong>
            <span/>
          </div>
        ) : null}

        {tab==="home" ? (
          <div className={styles.phoneContent}>
            <div className={styles.mirrorNotice}>Previzualizare aplicație client · operațiunile autorizate sunt înregistrate pentru audit.</div>
            <div className={styles.phoneSearch}><Search size={14}/>Caută simbol sau denumire</div>
            <div className={styles.phoneBalance}>
              <span>Valoarea totală a portofoliului</span>
              <strong>{customer.balance}</strong>
              <small>Soldul și variațiile sunt afișate conform contului client.</small>
            </div>

            <div className={styles.mirrorProductGrid}>
              <button onClick={()=>setTab("funds")}><Landmark size={18}/><strong>Fonduri</strong><span>Produse</span></button>
              <button onClick={()=>setTab("block")}><BadgeDollarSign size={18}/><strong>Tranzacții în bloc</strong><span>Oportunități</span></button>
              <button onClick={()=>setTab("ipo")}><FileCheck2 size={18}/><strong>IPO</strong><span>Subscriere</span></button>
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
              <div className={styles.mirrorSectionTitle}><h3>Piețe urmărite</h3><button onClick={()=>setTab("market")}>Vezi toate</button></div>
              <StockRows compact/>
            </div>

            <div className={styles.mirrorNews}>
              <div><strong>Notificări și alerte</strong><span>Mesaje sincronizate din sistem</span></div>
              <ChevronRight size={15}/>
            </div>
          </div>
        ) : null}

        {tab==="market" ? (
          <div className={styles.phoneContent}>
            <div className={styles.phoneSearch}><Search size={14}/>Caută instrumente</div>
            <div className={styles.mirrorSegment}>
              <button className={market==="US"?styles.mirrorSegmentActive:""} onClick={()=>setMarket("US")}>SUA</button>
              <button className={market==="MX"?styles.mirrorSegmentActive:""} onClick={()=>setMarket("MX")}>Europa</button>
            </div>
            <div className={styles.mirrorQuoteHero}>
              <div><span>{selected.symbol}</span><small>{selected.name}</small></div>
              <div><strong>{selected.price}</strong><span className={selected.up?styles.green:styles.red}>{selected.change}</span></div>
            </div>
            <div className={styles.mirrorSpark}>
              {[24,36,30,49,42,57,52,66,60,74,69,82].map((h,i)=><i key={i} style={{height:`${h}%`}}/> )}
            </div>
            <div className={styles.mirrorMarketFacts}><span>Max.<b>231.44</b></span><span>Min.<b>223.98</b></span><span>Vol.<b>42.8M</b></span></div>
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
            <div className={styles.phoneSearch}><Search size={14}/>Caută în lista de urmărire</div>
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
              <div><span>Valoare RON</span><strong>MXN 62,390</strong><small className={styles.green}>+2.18%</small></div>
              <div><span>Profit RON</span><strong>+1,324.80</strong><small>Astăzi</small></div>
              <div><span>Valoare EUR</span><strong>USD 3,471</strong><small className={styles.green}>+0.82%</small></div>
              <div><span>Profit EUR</span><strong>+84.30</strong><small>Astăzi</small></div>
            </div>
            <div className={styles.mirrorSectionTitle}><h3>Poziții</h3><button onClick={()=>setTab("positions")}>Detalii</button></div>
            {stocks.slice(0,4).map((item,i)=>(
              <div className={enh.phoneRecord} key={item.symbol}>
                <div><strong>{item.symbol}</strong><span>{[120,600,80,50][i]} acțiuni · Cost {(Number(item.price)*.93).toFixed(2)}</span></div>
                <b className={item.up?styles.green:styles.red}>{item.change}</b>
              </div>
            ))}
            <button className={styles.mirrorWideAction} onClick={()=>setTab("orders")}><ListFilter size={15}/> Istoric ordine <ChevronRight size={14}/></button>
          </div>
        ) : null}

        {tab==="account" ? (
          <div className={styles.phoneContent}>
            <div className={styles.mirrorAccountHero}>
              <div className={styles.avatar}>{customer.name.slice(0,1)}</div>
              <div><strong>{customer.name}</strong><span>ID {customer.id} · {customer.kyc}</span><small>{customer.vip}</small></div>
              <button onClick={()=>setTab("settings")}><Settings size={16}/></button>
            </div>
            <div className={styles.mirrorAccountBalance}><span>Portofoliu total</span><strong>{customer.balance}</strong><small>Disponibil RON 186,240 · În așteptare RON 48,500</small></div>
            <div className={styles.phoneMenu}>
              <button onClick={()=>setTab("cash")}><Banknote size={18}/><span>Depozit</span></button>
              <button onClick={()=>setTab("cash")}><CreditCard size={18}/><span>Retragere</span></button>
              <button onClick={()=>setTab("orders")}><ListFilter size={18}/><span>Istoric</span></button>
              <button onClick={()=>setTab("positions")}><WalletCards size={18}/><span>Poziții</span></button>
            </div>
            <div className={styles.mirrorScoreRow}><span>Credit <strong>100</strong></span><button>Împrumutul meu <ChevronRight size={13}/></button></div>
            <button className={styles.phoneLine} onClick={()=>setTab("bank")}>Cont bancar<ChevronRight size={14}/></button>
            <button className={styles.phoneLine} onClick={()=>setTab("kyc")}>Verificare identitate<ChevronRight size={14}/></button>
            <button className={styles.phoneLine} onClick={()=>setTab("password")}>Parole<ChevronRight size={14}/></button>
            <button className={styles.phoneLine} onClick={()=>setTab("settings")}>Setări și notificări<ChevronRight size={14}/></button>
          </div>
        ) : null}

        {(["funds","block","ipo"] as MirrorTab[]).includes(tab) ? (
          <div className={styles.phoneContent}>
            <div className={styles.mirrorProductBanner}>
              <span>{tab==="funds"?"INVESTIȚII":tab==="block"?"OFERTĂ SPECIALĂ":"OFERTĂ PUBLICĂ"}</span>
              <strong>{tab==="funds"?"Fondos de inversión":tab==="block"?"Tranzacții în bloc":"IPO"}</strong>
              <small>Date sincronizate din sistem · operațiunile autorizate sunt auditate</small>
            </div>
            {productRows[tab as "funds"|"block"|"ipo"].map((item)=>(
              <div className={styles.mirrorProductCard} key={item.title}>
                <div><strong>{item.title}</strong><span>{item.meta}</span></div>
                <b>{item.value}</b>
                <button onClick={()=>setTab("operate")}>Continuă</button>
              </div>
            ))}
            <button className={styles.mirrorWideAction} onClick={()=>setTab("orders")}>Vezi istoricul asociat <ChevronRight size={14}/></button>
          </div>
        ) : null}

        {tab==="support" ? (
          <div className={styles.phoneContent}>
            <div className={styles.mirrorSupportWelcome}><MessageSquareText size={24}/><strong>Bună ziua, cu ce vă putem ajuta?</strong><span>Asistență pentru cont și operațiuni</span></div>
            <div className={styles.mirrorChatBubble}>Bun venit la asistență. Selectați o solicitare sau scrieți un mesaj.</div>
            <div className={styles.mirrorChatBubbleClient}>Doresc să verific starea unui ordin.</div>
            <div className={styles.mirrorChatComposer}><span>Scrieți un mesaj…</span><button>Trimite</button></div>
          </div>
        ) : null}

        {tab==="settings" ? (
          <div className={styles.phoneContent}>
            <button className={styles.phoneLine} onClick={()=>setTab("password")}>Parolă de acces<ChevronRight size={14}/></button>
            <button className={styles.phoneLine} onClick={()=>setTab("password")}>Parolă de tranzacționare<ChevronRight size={14}/></button>
            <button className={styles.phoneLine} onClick={()=>setTab("kyc")}>Verificare identitate<ChevronRight size={14}/></button>
            <button className={styles.phoneLine} onClick={()=>setTab("bank")}>Adăugați cont bancar<ChevronRight size={14}/></button>
            <button className={styles.phoneLine}>Notificări<ChevronRight size={14}/></button>
            <button className={styles.phoneLine}>Limbă · Română<ChevronRight size={14}/></button>
            <button className={styles.mirrorLogout}>Deconectare</button>
          </div>
        ) : null}

        {tab==="cash" ? <div className={styles.phoneContent}><div className={enh.phonePageTitle}><strong>Mișcări de fonduri</strong><span>Depozite / retrageri</span></div>{[["Depozit","RON 120,000","În așteptare"],["Retragere","RON 48,500","În verificare"],["Depozit","EUR 18,000","Aprobat"]].map((row)=><div className={enh.phoneRecord} key={row.join("-")}><div><strong>{row[0]}</strong><span>{row[2]}</span></div><b>{row[1]}</b></div>)}</div> : null}
        {tab==="positions" ? <div className={styles.phoneContent}><div className={enh.phonePageTitle}><strong>Poziții</strong><span>Valoare și randament</span></div>{stocks.slice(0,4).map((s,i)=><div className={enh.phoneRecord} key={s.symbol}><div><strong>{s.symbol}</strong><span>{[120,600,80,50][i]} acțiuni · {s.name}</span></div><b className={s.up?styles.green:styles.red}>{s.change}</b></div>)}</div> : null}
        {tab==="orders" ? <div className={styles.phoneContent}><div className={enh.phonePageTitle}><strong>Istoric ordine</strong><span>Acțiuni / blocuri / IPO / fonduri</span></div>{[["AAPL","Cumpărare","Înregistrat"],["WALMEX","Bloc","În procesare"],["TMX","IPO","În așteptarea alocării"],["FG-019","Fond","În așteptare"]].map((row)=><div className={enh.phoneRecord} key={row.join("-")}><div><strong>{row[0]}</strong><span>{row[1]}</span></div><b>{row[2]}</b></div>)}</div> : null}
        {tab==="bank" ? <div className={styles.phoneContent}><div className={enh.phonePageTitle}><strong>Conturi bancare</strong><span>Administrarea retragerilor</span></div><div className={enh.phoneBank}><CreditCard size={20}/><div><strong>BBVA México</strong><span>•••• 7812 · Implicit</span></div></div><div className={enh.phoneBank}><CreditCard size={20}/><div><strong>Santander</strong><span>•••• 3097</span></div></div><button className={enh.phonePrimary}>Adăugați cont bancar</button></div> : null}
        {tab==="kyc" ? <div className={styles.phoneContent}><div className={enh.phonePageTitle}><strong>Verificare identitate</strong><span>Starea documentelor</span></div><div className={enh.phoneStatusCard}><FileCheck2 size={28}/><strong>{customer.kyc}</strong><span>{customer.name}</span><small>Document de identitate / Pașaport protejat</small></div></div> : null}
        {tab==="password" ? <div className={styles.phoneContent}><div className={enh.phonePageTitle}><strong>Securitate</strong><span>Acces și tranzacții</span></div><label className={enh.phoneField}><span>Parola curentă</span><input type="password"/></label><label className={enh.phoneField}><span>Parolă nouă</span><input type="password"/></label><label className={enh.phoneField}><span>Confirmați parola</span><input type="password"/></label><button className={enh.phonePrimary}>Salvați modificările</button></div> : null}

        <div className={styles.phoneNav}>
          <button className={tab==="home"?styles.phoneNavActive:""} onClick={()=>setTab("home")}><LayoutDashboard size={17}/><span>Acasă</span></button>
          <button className={tab==="market"?styles.phoneNavActive:""} onClick={()=>setTab("market")}><LineChart size={17}/><span>Piețe</span></button>
          <button className={tab==="favorites"?styles.phoneNavActive:""} onClick={()=>setTab("favorites")}><Heart size={17}/><span>Urmărite</span></button>
          <button className={tab==="operate"?styles.phoneNavActive:""} onClick={()=>setTab("operate")}><Activity size={17}/><span>Tranzacții</span></button>
          <button className={tab==="account"?styles.phoneNavActive:""} onClick={()=>setTab("account")}><CircleUserRound size={17}/><span>Cont</span></button>
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
      window.location.hostname.toLowerCase() === "admin.nuvexapro.com" ||
      new URLSearchParams(window.location.search).get("portal") === "admin"
    )
      ? "admin"
      : "client";

  useEffect(() => {
    document.documentElement.lang = portal === "client" ? "ro-RO" : "zh-CN";
  }, [portal]);

  if (!role) {
    return <LoginScreen portal={portal} onLogin={(nextRole, nextName)=>{setRole(nextRole);setName(nextName);setView("dashboard");}} />;
  }

  const content =
    view === "dashboard" ? (
      <Dashboard role={role} name={name} onOpenMarket={()=>setView("market")} onNavigate={setView} />
    ) : view === "customers" && role !== "client" ? (
      <CustomersPage customers={customers} setCustomers={setCustomers} onMirror={setMirrorCustomer} />
    ) : view === "market" ? (
      <MarketPage riskControls={riskControls} role={role} />
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
    <main className={`${styles.appShell} ${role === "client" ? styles.clientShell : styles.adminShell}`}>
      <Sidebar role={role} view={view} onView={setView} onLogout={()=>{if(role==="master" || role==="ops") project4Api.logoutMaster();setRole(null);setName("");}} />
      <div className={styles.workspace}>
        <Topbar name={name} role={role} onNavigate={setView} />
        <div className={styles.workspaceBody}>{content}</div>
      </div>
      {mirrorCustomer ? <AppMirror customer={mirrorCustomer} onClose={()=>setMirrorCustomer(null)} /> : null}
    </main>
  );
}
