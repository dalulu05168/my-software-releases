import { FormEvent, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { project4Api } from "../helpers/project4Api";
import styles from "./VerifiedOpsAccounts.module.css";

export function VerifiedOpsAccountsPage() {
  const queryClient = useQueryClient();
  const accounts = useQuery({
    queryKey: ["p004-real-ops-accounts"],
    queryFn: project4Api.listOpsAccounts,
    retry: false,
    staleTime: 5000,
  });
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [markets, setMarkets] = useState<Array<"US" | "MX">>(["US", "MX"]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [issued, setIssued] = useState<null | {
    username: string; name: string; invite: string; totpSecret: string; otpauthUri: string;
  }>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (name.trim().length < 2 || username.trim().length < 3 || password.length < 12 || markets.length < 1) {
      setError("请填写名称、至少 3 位账户名、至少 12 位密码，并选择市场。");
      return;
    }
    setBusy(true);
    try {
      const result = await project4Api.createOpsAccount({ name: name.trim(), username: username.trim(), password, markets });
      setIssued({
        name: result.account.name,
        username: result.account.username,
        invite: result.account.invite,
        totpSecret: result.totpSecret,
        otpauthUri: result.otpauthUri,
      });
      setPassword("");
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["p004-real-ops-accounts"] });
    } catch (err) {
      setError("创建失败：" + (err instanceof Error ? err.message : "请求失败"));
    } finally {
      setBusy(false);
    }
  };
  const flipMarket = (value: "US" | "MX") =>
    setMarkets((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);

  return <div className={styles.screen}>
    <header className={styles.header}>
      <div>
        <h1>运营子账户</h1>
        <p>真实数据 · 总管理员权限 · 服务器审计</p>
      </div>
      <button className={styles.primary} onClick={() => { setIssued(null); setError(""); setOpen(true); }}>创建子账户</button>
    </header>
    <section className={styles.card}>
      <div className={styles.cardTitle}>
        <strong>已登记的子账户</strong>
        <button className={styles.lightButton} onClick={() => void accounts.refetch()}>刷新</button>
      </div>
      {accounts.isError ? <p className={styles.error} role="alert">账户列表读取失败。请检查管理员会话或服务状态。</p> : accounts.isPending ?
      <p className={styles.note}>正在读取服务器账户记录…</p> :
      <div className={styles.tableWrap}>
        <table><thead><tr><th>账户名</th><th>显示名称</th><th>市场权限</th><th>状态</th><th>运营邀请码</th></tr></thead>
          <tbody>
            {accounts.data.map((row) => <tr key={row.id}>
              <td>{row.username || "—"}</td><td>{row.name}</td>
              <td>{row.markets?.join(", ") || "—"}</td><td>{row.status}</td><td>{row.invite || "—"}</td>
            </tr>)}
            {accounts.data.length === 0 ? <tr><td colSpan={5}>当前没有真实子账户记录。</td></tr> : null}
          </tbody>
        </table>
      </div>}
    </section>
    <p className={styles.note}>展示的子账户来自项目数据库；不会虚构用户数量、客户数或 2FA 密钥。</p>
    {issued ? <section className={styles.success} role="status">
      <div className={styles.cardTitle}>
        <strong>账户已由服务器创建，以下绑定资料仅在本次页面中显示</strong>
        <button className={styles.lightButton} onClick={() => setIssued(null)}>关闭并清除显示</button>
      </div>
      <p>账户：{issued.username}（{issued.name}）</p>
      <p>邀请码：<code>{issued.invite}</code></p>
      <p>2FA 绑定密钥：<code>{issued.totpSecret}</code></p>
      <p className={styles.note}>立即在授权管理员的身份验证器中绑定。不要在公开场合共享密钥。</p>
    </section> : null}
    {open ? <div className={styles.shade}>
      <form className={styles.dialog} onSubmit={submit}>
        <h2>创建真实子账户</h2>
        <p className={styles.note}>提交后服务器将创建账户并生成一次性 2FA 绑定信息。请确认资料无误。</p>
        <label>子账户名称<input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} required/></label>
        <label>登录用户名<input value={username} onChange={(event) => setUsername(event.target.value)} pattern="[A-Za-z0-9._-]{3,64}" required/></label>
        <label>临时登录密码（至少 12 位）<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={12} maxLength={128} autoComplete="new-password" required/></label>
        <fieldset><legend>允许的市场</legend>
          <label><input type="checkbox" checked={markets.includes("US")} onChange={() => flipMarket("US")}/> US</label>
          <label><input type="checkbox" checked={markets.includes("MX")} onChange={() => flipMarket("MX")}/> MX</label>
        </fieldset>
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        <div className={styles.actions}>
          <button type="button" className={styles.lightButton} onClick={() => { setOpen(false); setPassword(""); setError(""); }}>取消</button>
          <button disabled={busy} type="submit" className={styles.primary}>{busy ? "服务器处理中…" : "确认创建"}</button>
        </div>
      </form>
    </div> : null}
  </div>;
}
