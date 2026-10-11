import { FormEvent, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { VerifiedOpsAccountsPage } from "../components/VerifiedOpsAccounts";
import { VerifiedAdminRecordsPage } from "../components/VerifiedAdminRecords";
import { ScopedCustomerWorkspace } from "../components/ScopedCustomerWorkspace";

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
    if (mode === "register" && portal === "client") {
      if (!name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account.trim()) ||
          password.length < 12 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) ||
          !/[0-9]/.test(password) || password !== confirmPassword || !/^[0-9]{6}$/.test(invite.trim())) {
        setLoginError("Completați numele, e-mailul, o parolă de cel puțin 12 caractere (majuscule, minuscule și cifre), confirmarea și codul numeric de invitație din 6 cifre.");
        return;
      }
      setLoggingIn(true);
      try {
        await project4Api.registerClient({ name:name.trim(),email:account.trim(),password,invite:invite.trim() });
        setPassword("");setConfirmPassword("");setInvite("");
        setResetMessage("Contul a fost înregistrat. Verificarea identității este în așteptare; tranzacționarea și retragerile rămân dezactivate.");
        setMode("login");
      } catch (error) {
        const code=error instanceof Error?error.message:"SIGNUP_UNAVAILABLE";
        setLoginError(code==="RATE_LIMITED"?"Prea multe încercări. Așteptați 15 minute.":code==="INVALID_INVITE_OR_ACCOUNT"?"Codul de invitație nu este valid sau contul există deja.":"Înregistrarea nu a reușit. Verificați informațiile și încercați din nou.");
      } finally {setLoggingIn(false);}
      return;
    }
    if (mode !== "login") {
      setLoginError("Recuperarea parolei este disponibilă doar prin administrator până la implementarea verificării securizate.");
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
    // Fail closed: no client identity or balance can be trusted without a server-verified session.
    // This preview does not have an implemented client login endpoint yet.
    setLoggingIn(true);
    try {
      const result = await project4Api.loginClient(account.trim(), password);
      onLogin("client", result.displayName);
    } catch (error) {
      const code = error instanceof Error ? error.message : "CLIENT_LOGIN_FAILED";
      setLoginError(
        code === "ACCOUNT_TEMPORARILY_LOCKED"
          ? "Cont blocat temporar din cauza încercărilor eșuate. Încercați din nou mai târziu."
          : code === "CLIENT_SESSION_REQUIRED" || code === "CLIENT_AUTH_UNAVAILABLE" || code === "SERVICE_UNAVAILABLE"
            ? "Serviciul de autentificare nu este disponibil momentan. Reîncercați mai târziu."
            : "Autentificare nereușită. Verificați datele sau contactați administratorul.",
      );
    } finally {
      setLoggingIn(false);
    }
  };

  const isClient = portal === "client";
  const isInstalledDesktop =
    typeof window !== "undefined" &&
    window.location.hostname === "127.0.0.1" &&
    new URLSearchParams(window.location.search).get("desktop") === "1";


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

      </section>

      <section className={styles.loginPanel}>
        <div className={styles.mobileLogo}><Logo /></div>

        {isInstalledDesktop ? (
          <div style={{display:"flex",gap:10,justifyContent:"center",padding:"12px 0"}}>
            <button type="button" className={styles.textButton} disabled={!isClient}
              onClick={() => window.location.assign("/?desktop=1&portal=admin")}>总账户 / 子账户登录</button>
            <button type="button" className={styles.textButton} disabled={isClient}
              onClick={() => window.location.assign("/?desktop=1&portal=client")}>客户登录</button>
          </div>
        ) : null}
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
            <span>{isClient && mode === "register" ? "E-mail" : isClient ? "Telefon / e-mail / cont" : "后台账户"}</span>
            <input type={isClient && mode === "register" ? "email" : "text"} autoComplete={isClient && mode === "register" ? "email" : "username"} required value={account} onChange={(e) => setAccount(e.target.value)} placeholder={isClient && mode === "register" ? "nume@exemplu.ro" : isClient ? "+40... / nume@exemplu.ro" : "请输入后台账户"} />
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
              <span>Cod de invitație (6 cifre)</span>
              <input type="text" inputMode="numeric" autoComplete="off" maxLength={6} pattern="[0-9]{6}"
                value={invite} onChange={(e) => setInvite(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                placeholder="Introduceți codul numeric (6 cifre)" />
            </label>
          ) : null}

          {resetMessage ? <div className={enh.formNotice}>{resetMessage}</div> : null}
          {isClient && mode==="login" ? <div className={enh.formNotice} role="status">Autentificare verificată pe server. Tranzacționarea și retragerile sunt supuse verificării identității.</div> : null}
          {loginError ? <div className={styles.formError} role="alert">{loginError}</div> : null}

          <button className={styles.primaryButton} type="submit" disabled={loggingIn}>
            {isClient
              ? mode === "register"
                ? "Creează cont"
                : mode === "forgot"
                  ? "Confirmă modificarea"
                  : "Autentificare"
              : loggingIn ? "验证中…" : "进入后台"}
            <ChevronRight size={17} />
          </button>

          {isClient ? <div style={{display:"flex",gap:12,justifyContent:"center",alignItems:"center",flexWrap:"wrap",fontSize:12}}>
            {mode !== "register" ? <button type="button" className={styles.textButton} onClick={()=>{setMode("register");setLoginError("");setResetMessage("");}}>Creează cont cu invitație</button> : null}
            {mode !== "login" ? <button type="button" className={styles.textButton} onClick={()=>{setMode("login");setLoginError("");}}>Înapoi la autentificare</button> : null}
          </div> : null}
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
        <div className={styles.navSectionTitle}>{role === 'client' ? 'Overview' : '业务管理'}</div>
        {allowed.map((item) => {
          const Icon = item.icon;
          const unavailable = ["products", "loans", "notifications", "risk", "support", "audit", "settings", "purchaseAccess"].includes(item.key)
            || (role === "client" && item.key === "cash");
          return (
            <button
              key={item.key}
              type="button"
              disabled={unavailable}
              title={unavailable ? "功能保留，待真实后端接入后开放" : undefined}
              aria-label={unavailable ? item.label + "（尚未接入）" : item.label}
              className={view === item.key ? styles.navActive : styles.navItem}
              style={unavailable ? {opacity:0.54,cursor:"not-allowed"} : undefined}
              onClick={() => { if (!unavailable) onView(item.key); }}
            >
              <Icon size={17} />
              <span>{role === "client" ? clientNavLabels[item.key] ?? item.label : item.label}{unavailable ? " · 待接入" : ""}</span>
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
          <div><strong>Piață · Date publicate</strong><RomaniaClock /></div>
        </div>
      ) : (
        <div className={styles.topSearch}>
          <strong>Dashboard</strong>
          <span> / 运营管理中心</span>
        </div>
      )}
      <div className={styles.topbarActions}>
        <button onClick={() => onNavigate(role === "client" ? "market" : "customers")}><Search size={17} /></button>
        <button type="button" disabled title="通知中心尚未连接真实接口"><Bell size={17} /></button>
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

function PendingIntegrationPage({ title, client = false }: { title: string; client?: boolean }) {
  return (
    <div className={styles.contentStack}>
      <div className={styles.pageHeader}>
        <div><h1>{title}</h1><p>{client ? "Datele vor fi disponibile după verificarea contului." : "业务数据验证状态"}</p></div>
      </div>
      <section className={styles.panel} role="status" style={{ minHeight: 150, display: "grid", gap: 12, alignContent: "center" }}>
        <h3 style={{ margin: 0, color: "#202A37" }}>{client ? "Date reale indisponibile" : "暂未接入可核验的真实数据"}</h3>
        <p style={{ margin: 0, color: "#4B5563", lineHeight: 1.7 }}>
          {client
            ? "Pentru protecția contului, această secțiune nu afișează solduri, ordine sau rezultate simulate. Serviciul de cont securizat nu este încă disponibil."
            : "此模块原先使用前端预置数据或本地状态。已暂停虚拟客户、资金、订单及权限操作展示。完成真实业务接口与权限校验后再开放。"}
        </p>
      </section>
    </div>
  );
}

function Dashboard({
  role,
  name,
  onOpenMarket,
}: {
  role: Role;
  name: string;
  onOpenMarket: () => void;
  onNavigate: (view: View) => void;
}) {
  const securitiesQuery = useQuery({
    queryKey: ["p004-dashboard-verified-securities", role],
    queryFn: role === "master" ? project4Api.listAdminSecurities : project4Api.listClientSecurities,
    staleTime: 10_000,
  });
  const clientPortfolio = useQuery({
    queryKey: ["p004-client-dashboard-portfolio", name],
    queryFn: project4Api.getClientPortfolio,
    enabled: role === "client",
    staleTime: 0,
    retry: false,
  });
  const verified = securitiesQuery.data || [];
  const count = securitiesQuery.isError ? "读取失败" : securitiesQuery.isPending ? "查询中" : String(verified.filter((s) => s.visible && s.status === "ACTIVE").length);
  return (
    <div className={styles.contentStack}>
      <div className={styles.pageHeader}>
        <div><h1>{role === "client" ? "Prezentare cont" : "运营总览"}</h1><p>{name} · {role === "client" ? "Situație verificată" : "只展示已核验的系统记录"}</p></div>
        <button className={styles.secondaryButton} onClick={onOpenMarket}> {role === "client" ? "Piață" : "查看已上架证券"} <ChevronRight size={15}/></button>
      </div>
      <div className={styles.metricGrid}>
        <Metric icon={LineChart} title={role === "client" ? "Instrumente listate" : "已上架证券"} value={count} sub={securitiesQuery.isError ? "服务器读取失败" : "来自证券 API"} />
        <Metric icon={Users} title={role === "client" ? "Poziții reale" : "客户账户"} value={role === "client" && clientPortfolio.isSuccess ? String(clientPortfolio.data.positions.length) : "—"} sub={role === "client" ? "Date din contul autentificat" : "未接入账户汇总"} />
        <Metric icon={WalletCards} title={role === "client" ? "Sold verificat" : "核验资金余额"} value="—" sub="尚未连接真实账本" />
        <Metric icon={ListFilter} title={role === "client" ? "Ordine reale" : "真实订单"} value={role === "client" && clientPortfolio.isSuccess ? String(clientPortfolio.data.orders.length) : "—"} sub={role === "client" ? "Ultimele maximum 100 de ordine" : "尚未连接订单汇总"} />
      </div>
      <section className={styles.panel} role="status">
        <div className={styles.panelTitle}><div><h3>{role === "client" ? "Date reale indisponibile" : "真实业务状态"}</h3><p>{role === "client" ? "Nu se afișează active simulate" : "未连接的数据不展示虚拟资产与趋势"}</p></div></div>
        <p style={{ color: "#4B5563", marginTop: 10, lineHeight: 1.8 }}>
          {role === "client"
            ? clientPortfolio.isError
              ? "Nu se pot încărca datele contului; sesiunea poate fi expirată. Vă rugăm să vă autentificați din nou."
              : "Pozițiile și ordinele sunt citite doar din contul autentificat. Soldul disponibil nu este încă calculat și tranzacționarea este dezactivată."
            : "客户、订单、持仓、资金流水目前未完成前后端联通。本页不再把示例金额和图表当作真实统计。"}
        </p>
      </section>
    </div>
  );
}


function ClientPortfolioRecordsPage({ view }: { view: "orders" | "positions" }) {
  const query = useQuery({
    queryKey: ["p004-client-real-records", view],
    queryFn: project4Api.getClientPortfolio,
    staleTime: 0,
    retry: false,
  });
  const orders = query.data?.orders || [];
  const positions = query.data?.positions || [];
  return (
    <div className={styles.contentStack}>
      <div className={styles.pageHeader}>
        <div>
          <h1>{view === "orders" ? "Ordine" : "Poziții"}</h1>
          <p>Numai înregistrări din contul autentificat · vizualizare fără tranzacționare</p>
        </div>
        <button className={styles.secondaryButton} type="button" onClick={() => void query.refetch()}>Actualizare</button>
      </div>
      {query.isError ? (
        <section className={styles.panel} role="alert" style={{color:"#9F3E1B"}}>
          Datele nu pot fi încărcate. Verificați sesiunea și încercați din nou.
        </section>
      ) : query.isPending ? (
        <section className={styles.panel} role="status">Se verifică înregistrările...</section>
      ) : (
        <section className={styles.tablePanel}>
          {view === "orders" ? (
            <table>
              <thead><tr><th>Ordin</th><th>Sens</th><th>Cantitate</th><th>Monedă</th><th>Stare</th><th>Înregistrat</th></tr></thead>
              <tbody>
                {orders.map((item) => <tr key={item.id}>
                  <td className={styles.mono}>{item.id.slice(0, 12)}</td>
                  <td>{item.side}</td>
                  <td className={styles.mono}>{item.quantity ?? "—"}</td>
                  <td>{item.currency}</td>
                  <td>{item.state}</td>
                  <td>{item.created_at ? new Date(item.created_at).toLocaleString("ro-RO") : "—"}</td>
                </tr>)}
                {orders.length === 0 ? <tr><td colSpan={6}>Nu există ordine înregistrate pentru acest cont.</td></tr> : null}
              </tbody>
            </table>
          ) : (
            <table>
              <thead><tr><th>Instrument</th><th>Cantitate</th><th>Cost mediu</th><th>Monedă</th></tr></thead>
              <tbody>
                {positions.map((item) => <tr key={item.security_id}>
                  <td><strong>{item.security?.symbol || "—"}</strong><span>{item.security?.name || "Instrument neidentificat"}</span></td>
                  <td className={styles.mono}>{item.quantity}</td>
                  <td className={styles.mono}>{item.average_cost}</td>
                  <td>{item.currency}</td>
                </tr>)}
                {positions.length === 0 ? <tr><td colSpan={4}>Nu există poziții înregistrate pentru acest cont.</td></tr> : null}
              </tbody>
            </table>
          )}
        </section>
      )}
      <p style={{fontSize:11,color:"#4B5563"}}>
        Datele provin din API-ul de client; nu se afișează solduri calculate sau profituri estimate.
      </p>
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
  const [favorites, setFavorites] = useState<string[]>([]);
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
  return (
    <div className={styles.marketTerminal}>
      <section className={styles.marketList}>
        <div className={styles.marketListHeader}><strong>Piață</strong><div className={styles.miniSearch}><Search size={14}/><input value={searchText} onChange={(event)=>setSearchText(event.target.value)} placeholder="Caută simbol / companie"/></div></div>
        <div className={styles.marketTabs}>{(["US","MX","Favorite"] as const).map((item)=><button key={item} className={marketTab===item?styles.marketTabActive:""} onClick={()=>setMarketTab(item)}>{item==="Favorite"?"Favoris (local)":item}</button>)}</div>
        {visibleStocks.map((s)=>(
          <button key={s.symbol} className={symbol===s.symbol?styles.stockItemActive:styles.stockItem} onClick={()=>setSymbol(s.symbol)}>
            <div><strong>{s.symbol}</strong><span>{s.name}</span></div><div><strong>{s.price}</strong><span className={s.up?styles.green:styles.red}>{s.change}</span></div>
          </button>
        ))}
        {securitiesQuery.isFetching?<div className={enh.emptyMarket}>Se sincronizează instrumentele…</div>:null}
        {visibleStocks.length===0?<div className={enh.emptyMarket}>Nu există instrumente disponibile</div>:null}
      </section>
      <section className={styles.marketCenter}>
        <div className={styles.quoteHeader}><div><h2>{selected.symbol}</h2><span>{selected.name}</span><button type="button" disabled={!selected.symbol} title="仅本次页面的本地自选，不会虚称为云端保存" className={favorites.includes(selected.symbol)?enh.favoriteOn:enh.favoriteOff} onClick={()=>setFavorites(favorites.includes(selected.symbol)?favorites.filter((item)=>item!==selected.symbol):[...favorites,selected.symbol])}><Heart size={13}/>{favorites.includes(selected.symbol)?"În favorite":"Adaugă la favorite"}</button></div><div className={styles.quoteValue}><strong>{selected.price}</strong><span className={selected.up?styles.green:styles.red}>{selected.change}</span></div><div className={styles.quoteFacts}><span>Maxim <b>—</b></span><span>Minim <b>—</b></span><span>Volum <b>—</b></span><span>Piață <b>{selected.market}</b></span></div></div>
        <div className={styles.chartToolbar}>
          {["1D","7D","1L","3L","1A","Max"].map((item) => (
            <button
              key={item}
              className={interval === item ? styles.chartActive : ""}
              disabled title="真实历史 K 线尚未接入"
              onClick={() => setInterval(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <div className={styles.candleChart}>
          <div role="status" style={{padding:22, color:"#4B5563", fontSize:13}}>Datele istorice verificabile nu sunt încă disponibile. Graficul simulat a fost dezactivat.</div>
        </div>
        <div className={styles.marketBottom}><section><h3>Cumpărători</h3><p style={{color:"#4B5563"}}>Date în timp real indisponibile.</p></section><section><h3>Tranzacții recente</h3><p style={{color:"#4B5563"}}>Nu există tranzacții verificate.</p></section></div>
      </section>
      <section className={styles.orderPanel}>
        <div className={styles.orderTabs}><button className={side==="buy"?styles.buyTab:""} onClick={()=>setSide("buy")}>Cumpără</button><button className={side==="sell"?styles.sellTab:""} onClick={()=>setSide("sell")}>Vinde</button></div>
        <div className={styles.orderSummary}><span>Fonduri disponibile</span><strong>—</strong></div>
        <label><span>Instrument</span><input value={selected.symbol} readOnly/></label>
        <label><span>Preț ordin</span><input value={selected.price} readOnly/></label>
        <label><span>Cantitate</span><input value={qty} onChange={(e)=>setQty(e.target.value)}/></label>
        <div className={styles.quickQty}>{["25%","50%","75%","100%"].map(label=><button key={label} disabled title="Soldul verificat nu este disponibil">{label}</button>)}</div>
        <div className={styles.orderEstimate}><span>Valoare estimată (neexecutabilă)</span>
          <strong>{Number.isFinite(Number(selected.price)) && Number(selected.price)>0 &&
            Number.isFinite(Number(qty)) && Number(qty)>0
              ? (Number(selected.price)*Number(qty)).toLocaleString(undefined,{maximumFractionDigits:2})
              : "—"}</strong></div>
        <button className={side==="buy"?styles.buyButton:styles.sellButton} disabled title="Tranzacționarea este dezactivată până la integrarea backend-ului">Tranzacționare indisponibilă</button>
        <p className={styles.brokerNote}>Nu se înregistrează ordine. Conectarea contului și procesarea ordinelor sunt în curs de implementare.</p>
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

export default function App() {
  const queryClient = useQueryClient();
  const [role, setRole] = useState<Role | null>(null);
  const [name, setName] = useState("");
  const [view, setView] = useState<View>("dashboard");
  const [customers, setCustomers] = useState(initialCustomers);
  const [selectedOpsAccount, setSelectedOpsAccount] = useState<{ id: string; name: string } | null>(null);
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
    return <LoginScreen portal={portal} onLogin={(nextRole, nextName)=>{setSelectedOpsAccount(null);setRole(nextRole);setName(nextName);setView("dashboard");}} />;
  }

  const content =
    view === "dashboard" ? (
      <Dashboard role={role} name={name} onOpenMarket={()=>setView("market")} onNavigate={setView} />
    ) : view === "customers" && role !== "client" ? (
      <ScopedCustomerWorkspace
        opsAccountId={role==="master" ? selectedOpsAccount?.id : null}
        opsAccountName={role==="master" ? selectedOpsAccount?.name : null}
        onClearOpsScope={()=>setSelectedOpsAccount(null)}
      />
    ) : view === "market" ? (
      <MarketPage riskControls={riskControls} />
    ) : view === "opsAccounts" && role === "master" ? (
      <VerifiedOpsAccountsPage onOpenCustomers={account=>{
        setSelectedOpsAccount(account);
        setView("customers");
      }} />
    ) : ["products", "loans", "notifications", "opsAccounts", "audit"].includes(view) ? (
      <PendingIntegrationPage title={navItems.find((item) => item.key === view)?.label || "业务模块"} client={role === "client"}/>
    ) : ["securities", "purchaseAccess", "risk", "support"].includes(view) ? (
      view === "securities" && role === "master"
        ? <AdminControlPage view="securities" role={role} accountName={name} riskControls={riskControls} onRiskControlsChange={setRiskControls} />
        : <PendingIntegrationPage title={navItems.find((item) => item.key === view)?.label || "管理模块"} client={role === "client"}/>
    ) : ["orders", "cash", "positions"].includes(view) ? (
      role === "client" && (view === "orders" || view === "positions")
        ? <ClientPortfolioRecordsPage view={view} />
        : role !== "client"
          ? <VerifiedAdminRecordsPage kind={view as "orders" | "cash" | "positions"} />
          : <PendingIntegrationPage title={clientNavLabels[view] || "Cont"} client />
    ) : view === "settings" ? (
      <PendingIntegrationPage title={role === "client" ? "Setări" : "系统设置"} client={role === "client"}/>
    ) : (
      <PendingIntegrationPage title={navItems.find((item) => item.key === view)?.label || "模块"} client={role === "client"}/>
    );

  return (
    <main className={styles.appShell}>
      <Sidebar role={role} view={view} onView={setView} onLogout={()=>{if(role==="master" || role==="ops") project4Api.logoutAdmin();else void project4Api.logoutClient();queryClient.clear();setSelectedOpsAccount(null);setRole(null);setName("");setView("dashboard");}} />
      <div className={styles.workspace}>
        <Topbar name={name} role={role} onNavigate={setView} />
        <div className={styles.workspaceBody}>{content}</div>
      </div>
    </main>
  );
}
