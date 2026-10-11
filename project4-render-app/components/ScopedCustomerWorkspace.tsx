import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { project4Api } from "../helpers/project4Api";
import styles from "./VerifiedAdminRecords.module.css";

type Row = Record<string, string | number | boolean | null>;
type DetailKind = "orders" | "positions" | "cash";
const customerColumns: Array<[string,string]> = [
  ["user_id","客户 ID"],["ops_account_id","所属子账户"],["name","姓名"],
  ["phone","电话"],["email","邮箱"],["vip_level","VIP 等级"],
  ["kyc_status","KYC 状态"],["login_enabled","可登录"],
  ["trading_enabled","可交易"],["withdrawal_enabled","可提现"],
];
const detailColumns: Record<DetailKind, Array<[string,string]>> = {
  orders: [["id","订单 ID"],["security_id","证券 ID"],["side","方向"],["order_type","类型"],["quantity","数量"],["limit_price","限价"],["currency","币种"],["state","状态"],["created_at","创建时间"]],
  positions: [["security_id","证券 ID"],["quantity","数量"],["average_cost","平均成本"],["currency","币种"],["updated_at","更新时间"]],
  cash: [["id","申请 ID"],["type","类型"],["amount","金额"],["currency","币种"],["status","状态"],["created_at","申请时间"],["reviewed_at","审核时间"]],
};
function cell(row: Row, key: string) {
  const value = row[key];
  if (typeof value === "boolean") return value ? "是" : "否";
  return value == null ? "—" : String(value);
}
function saveCsv(rows: Row[], columns: Array<[string,string]>) {
  if (!rows.length) return;
  const quote = (v: string) => {
    const safe = /^[\s]*[=+@-]/.test(v) ? "'" + v : v;
    return '"' + safe.replaceAll('"','""') + '"';
  };
  const lines = [columns.map(([,label]) => quote(label)).join(","),
    ...rows.map(row => columns.map(([key]) => quote(cell(row,key))).join(","))];
  const url = URL.createObjectURL(new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = "P004-customers-" + new Date().toISOString().slice(0,10) + ".csv";
  document.body.appendChild(anchor); anchor.click(); anchor.remove();
  URL.revokeObjectURL(url);
}

function CustomerDetails({ customer, opsAccountId, onBack }: {
  customer: Row; opsAccountId?: string | null; onBack: () => void;
}) {
  const userId = String(customer.user_id || "");
  const [tab, setTab] = useState<DetailKind>("orders");
  const records = useQuery({
    queryKey: ["p004-scoped-customer",opsAccountId||"own",userId,tab],
    queryFn: () => project4Api.listAdminReport(tab,{opsAccountId,userId}),
    staleTime: 0, retry: false,
  });
  const columns = detailColumns[tab];
  return <div className={styles.layout}>
    <header className={styles.header}>
      <div><h1>客户详情：{cell(customer,"name")}</h1>
        <p>客户 ID：{userId} · 所属子账户：{cell(customer,"ops_account_id")}</p></div>
      <div className={styles.actions}><button type="button" onClick={onBack}>返回客户列表</button>
        <button type="button" onClick={() => void records.refetch()}>刷新记录</button></div>
    </header>
    <section className={styles.panel} style={{maxHeight:"none",padding:14,gap:10}}>
      <strong>客户账户档案（只读）</strong>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(115px,1fr))",gap:12}}>
        {(["name","phone","email","vip_level","kyc_status","account_type","login_enabled","trading_enabled","withdrawal_enabled"] as const).map(key=>
          <div key={key} style={{fontSize:12,overflowWrap:"anywhere"}}>
            <div style={{fontSize:11,color:"#667085"}}>{({
              name:"姓名",phone:"电话",email:"邮箱",vip_level:"VIP等级",
              kyc_status:"KYC",account_type:"账户类型",login_enabled:"可登录",
              trading_enabled:"可交易",withdrawal_enabled:"可提现",
            } as Record<string,string>)[key]}</div>
            <strong>{cell(customer,key)}</strong>
          </div>)}
      </div>
    </section>
    <section className={styles.panel}>
      <div className={styles.toolbar}>
        <div className={styles.actions}>
          {(["orders","positions","cash"] as const).map(item=>
            <button key={item} type="button" aria-pressed={tab===item}
              style={tab===item?{background:"#202A37",color:"white"}:undefined}
              onClick={()=>setTab(item)}>{item==="orders"?"交易订单":item==="positions"?"持仓记录":"资金申请"}</button>)}
        </div><span>仅该客户的数据</span>
      </div>
      {records.isPending?<p className={styles.note} style={{padding:12}}>正在从服务器加载…</p>:
        records.isError?<p className={styles.error} role="alert">服务器查询失败或没有权限；不会显示虚拟记录。</p>:
        <div className={styles.tableScroll}><table>
          <thead><tr>{columns.map(([key,label])=><th key={key}>{label}</th>)}</tr></thead>
          <tbody>{records.data.rows.map((r,i)=><tr key={String(r.id||r.security_id||i)}>
            {columns.map(([key])=><td key={key}>{cell(r,key)}</td>)}</tr>)}
            {!records.data.rows.length?<tr><td colSpan={columns.length}>没有已保存的记录。</td></tr>:null}</tbody>
        </table></div>}
    </section>
    <p className={styles.note}>这是服务器核验后的客户业务明细，不是手机 APP 镜像。真实余额、成交执行与利润计算未接入；每次查询最多200条。</p>
  </div>;
}

export function ScopedCustomerWorkspace({ opsAccountId, opsAccountName, onClearOpsScope }: {
  opsAccountId?: string | null;
  opsAccountName?: string | null;
  onClearOpsScope?: () => void;
}) {
  const [search,setSearch] = useState("");
  const [selected,setSelected] = useState<Row|null>(null);
  const clients = useQuery({
    queryKey:["p004-scoped-customer-list",opsAccountId||"server-own"],
    queryFn:()=>project4Api.listAdminReport("clients",{opsAccountId}),
    staleTime:0,retry:false,
  });
  const filtered = useMemo(() => (clients.data?.rows||[]).filter(row =>
    !search || customerColumns.some(([key])=>cell(row,key).toLowerCase().includes(search.toLowerCase()))
  ),[clients.data,search]);
  if (selected) {
    return <CustomerDetails key={String(selected.user_id)} customer={selected}
      opsAccountId={opsAccountId} onBack={()=>setSelected(null)}/>;
  }
  return <div className={styles.layout}>
    <header className={styles.header}>
      <div><h1>客户列表{opsAccountName?" · "+opsAccountName:""}</h1>
        <p>{opsAccountId?"仅显示所选子账户的客户":"按登录权限显示客户"} · 只读真实数据</p></div>
      <div className={styles.actions}>
        {opsAccountId&&onClearOpsScope?<button type="button" onClick={onClearOpsScope}>返回全部客户</button>:null}
        <button type="button" onClick={()=>void clients.refetch()}>刷新</button>
        <button type="button" className={styles.export} disabled={!filtered.length}
          onClick={()=>saveCsv(filtered,customerColumns)}>导出当前客户 CSV</button>
      </div>
    </header>
    <section className={styles.panel}>
      <div className={styles.toolbar}>
        <input value={search} onChange={event=>setSearch(event.target.value)}
          placeholder="搜索已加载客户（姓名、电话、ID）" aria-label="搜索客户"/>
        <span>{clients.isSuccess?"已读取 "+clients.data.rows.length+" 条":"待读取"}</span>
      </div>
      {clients.isPending?<p className={styles.note} style={{padding:12}}>正在验证权限并获取客户…</p>:
        clients.isError?<p role="alert" className={styles.error}>无法读取所属客户。请检查登录状态或服务端权限。</p>:
        <div className={styles.tableScroll}><table>
          <thead><tr>{customerColumns.map(([key,label])=><th key={key}>{label}</th>)}<th>操作</th></tr></thead>
          <tbody>{filtered.map((client,i)=><tr key={String(client.user_id||i)}>
            {customerColumns.map(([key])=><td key={key}>{cell(client,key)}</td>)}
            <td><button type="button" onClick={()=>setSelected(client)}>查看客户详情</button></td>
          </tr>)}
          {!filtered.length?<tr><td colSpan={customerColumns.length+1}>没有符合条件的客户记录。</td></tr>:null}</tbody>
        </table></div>}
    </section>
    <p className={styles.note}>权限隔离在服务器进行；搜索与 CSV 仅针对每次最多200条的已加载记录。此页面不执行客户修改或真实交易。</p>
  </div>;
}
