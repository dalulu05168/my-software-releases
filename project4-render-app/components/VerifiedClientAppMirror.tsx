import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { project4Api } from "../helpers/project4Api";
import styles from "./VerifiedClientAppMirror.module.css";

type Row = Record<string, string | number | boolean | null>;
type Screen = "home" | "orders" | "positions" | "funds";
type Kind = Exclude<Screen, "home">;

function display(value: unknown) {
  if (value === true) return "Da";
  if (value === false) return "Nu";
  if (value == null || value === "") return "—";
  return String(value);
}
function time(value: unknown) {
  if (typeof value !== "string" || !value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? display(value) : parsed.toLocaleString("ro-RO");
}

const sections: Record<Kind, { label: string; keys: Array<[string, string]> }> = {
  orders: {
    label: "Ordine",
    keys: [["side","Direcție"],["state","Stare"],["quantity","Cantitate"],["currency","Monedă"],["limit_price","Preț limită"],["created_at","Data"]],
  },
  positions: {
    label: "Poziții",
    keys: [["security_id","Instrument"],["quantity","Cantitate"],["average_cost","Cost mediu"],["currency","Monedă"],["updated_at","Actualizat"]],
  },
  funds: {
    label: "Solicitări fonduri",
    keys: [["type","Tip"],["amount","Sumă"],["currency","Monedă"],["status","Stare"],["created_at","Data"]],
  },
};

function ReadonlyRecord({ row, kind }: { row: Row; kind: Kind }) {
  const config = sections[kind];
  const main = kind === "positions" ? row.security_id : kind === "orders" ? row.security_id : row.type;
  return <article className={styles.record}>
    <div className={styles.recordHeading}>
      <strong>{display(main)}</strong>
      <span>{display(row.state ?? row.status ?? "—")}</span>
    </div>
    <dl>{config.keys.map(([key,label])=><div key={key}>
      <dt>{label}</dt><dd>{key.endsWith("_at") ? time(row[key]) : display(row[key])}</dd>
    </div>)}</dl>
  </article>;
}

/**
 * An audited, read-only projection of the client's recorded app data. This is
 * not screen capture, remote phone control, an impersonation session or a fake
 * balance view. Every row is queried using the admin server-validated scope.
 */
export function VerifiedClientAppMirror({
  userId, opsAccountId, onClose,
}: {
  userId: string;
  opsAccountId?: string | null;
  onClose: () => void;
}) {
  const [screen, setScreen] = useState<Screen>("home");
  const user = useQuery({
    queryKey: ["p004-app-mirror-identity",opsAccountId ?? "own",userId],
    queryFn: () => project4Api.listAdminReport("clients",{ opsAccountId, userId }),
    retry: false,
    staleTime: 0,
    refetchInterval: 30_000,
  });
  // Fail closed if a revoked, reassigned or cross-OPS account no longer belongs
  // to the authorized viewing scope. Do not reuse earlier list-row identity.
  const identity = user.isSuccess && user.data.rows.length === 1 &&
    String(user.data.rows[0].user_id) === userId
    ? user.data.rows[0]
    : null;

  const action: "orders" | "positions" | "cash" =
    screen === "funds" ? "cash" : screen === "home" ? "orders" : screen;
  const details = useQuery({
    queryKey: ["p004-app-mirror-data",opsAccountId ?? "own",userId,action],
    queryFn: () => project4Api.listAdminReport(action,{ opsAccountId, userId }),
    enabled: identity !== null && screen !== "home",
    retry: false,
    staleTime: 0,
    refetchInterval: identity && screen !== "home" ? 30_000 : false,
  });

  const refresh = async () => {
    const updated = await user.refetch();
    const permitted = updated.isSuccess &&
      updated.data.rows.length === 1 &&
      String(updated.data.rows[0].user_id) === userId;
    if (permitted && screen !== "home") await details.refetch();
  };

  return <div className={styles.workspace}>
    <div className={styles.toolbar}>
      <div>
        <h1>客户 APP 数据镜像</h1>
        <p>总账户 / 所属子账户授权 · 只读 · 服务器数据，每 30 秒重新核验</p>
      </div>
      <div className={styles.actions}>
        <button type="button" onClick={()=>void refresh()} disabled={user.isFetching || details.isFetching}>刷新服务器数据</button>
        <button type="button" onClick={onClose}>返回客户列表</button>
      </div>
    </div>
    <div className={styles.main}>
      <section className={styles.device} aria-label="客户 APP 只读业务界面">
        <div className={styles.statusBar}>Brantone Veylor <span>LIVE DATA · READ ONLY</span></div>
        {!user.isSuccess
          ? <div className={styles.message} role="status">
              {user.isPending ? "正在从服务器重新验证客户身份及权限…" : "服务器无法验证此客户或当前登录权限，镜像拒绝展示。"}
            </div>
          : !identity
            ? <div className={styles.message} role="alert">客户不存在、已移至其他子账户或没有查看权限。</div>
            : <>
              <header className={styles.deviceHeader}>
                <span>Cont privat</span>
                <strong>{display(identity.name)}</strong>
                <small>Identitate și operațiuni înregistrate</small>
              </header>
              <div className={styles.deviceBody}>
                {screen === "home"
                  ? <>
                      <div className={styles.balance}>
                        <small>Sold disponibil verificat</small>
                        <strong>—</strong>
                        <span>Registrul de solduri nu este conectat. Nu afișăm sume estimate.</span>
                      </div>
                      <div className={styles.fields}>
                        <div><span>Stare KYC</span><b>{display(identity.kyc_status)}</b></div>
                        <div><span>Nivel VIP</span><b>{display(identity.vip_level)}</b></div>
                        <div><span>Tip cont</span><b>{display(identity.account_type)}</b></div>
                        <div><span>Tranzacționare</span><b>Indisponibilă</b></div>
                        <div><span>Retrageri</span><b>Indisponibile</b></div>
                      </div>
                      <p className={styles.note}>Acesta este un rezumat verificat din baza de date, nu o sesiune de control al telefonului clientului.</p>
                    </>
                  : <>
                      <h2>{sections[screen].label}</h2>
                      {details.isPending ? <p className={styles.message}>Se încarcă datele reale…</p> :
                        details.isError ? <p className={styles.message} role="alert">Date indisponibile. Accesul nu a fost verificat.</p> :
                        <div className={styles.records}>
                          {details.data.rows.map((row,index)=><ReadonlyRecord key={String(row.id ?? row.security_id ?? index)} row={row} kind={screen}/>)}
                          {!details.data.rows.length ? <p className={styles.message}>Nicio înregistrare verificată.</p> : null}
                          {details.data.possiblyMore ? <p className={styles.note}>Sunt afișate maximum 200 de înregistrări. Pot exista date suplimentare.</p> : null}
                        </div>}
                    </>}
              </div>
              <nav className={styles.tabs} aria-label="APP 业务页面">
                {([["home","Cont"],["orders","Ordine"],["positions","Poziții"],["funds","Fonduri"]] as const).map(([key,label])=>
                  <button type="button" key={key} aria-current={screen===key?"page":undefined}
                    className={screen===key?styles.active:""} onClick={()=>setScreen(key)}>{label}</button>)}
              </nav>
            </>}
      </section>
      <aside className={styles.side}>
        <h2>数据来源和边界</h2>
        <p>客户身份、KYC、VIP、订单、持仓、资金申请全部通过已认证的 P004 reporting API 获取，后台不能自行伪造余额或交易记录。</p>
        <p>MASTER 可以查询其授权客户，OPS 只能查询属于自己子账户的客户。页面进入与定期刷新都会重新校验客户归属。</p>
        <p>这是一套可操作的 <strong>客户 APP 业务数据镜像</strong>，并非远程控制客户手机、同步其设备屏幕或冒充客户登录。</p>
        <p>真实交易执行、余额账本和提现审批尚未接通，相关行为全部保持不可操作。</p>
      </aside>
    </div>
  </div>;
}
