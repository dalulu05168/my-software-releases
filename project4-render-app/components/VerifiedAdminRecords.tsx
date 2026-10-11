import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { project4Api } from "../helpers/project4Api";
import styles from "./VerifiedAdminRecords.module.css";

type ReportKind = "clients" | "orders" | "cash" | "positions";
type Row = Record<string, string | number | boolean | null>;
const config: Record<ReportKind,{ title:string; help:string; columns:Array<[string,string]> }> = {
  clients: {
    title:"客户账户明细", help:"真实客户注册和归属信息；不创建或修改任何客户",
    columns:[["user_id","账户ID"],["name","姓名"],["phone","电话"],["email","邮箱"],["vip_level","VIP等级"],["kyc_status","实名状态"],["login_enabled","可登录"],["trading_enabled","可交易"],["withdrawal_enabled","可提现"],["account_type","账户类型"],["created_at","创建时间"]],
  },
  orders: {
    title:"交易订单记录", help:"来自数据库的订单明细；不模拟订单执行",
    columns:[["id","订单ID"],["user_id","客户ID"],["security_id","证券ID"],["side","交易方向"],["order_type","委托类型"],["quantity","数量"],["reference_price","参考价"],["limit_price","限价"],["currency","币种"],["state","状态"],["created_at","创建时间"]],
  },
  cash: {
    title:"资金申请明细", help:"显示服务器保存的充值提现申请；未在此页面处理资金",
    columns:[["id","申请ID"],["user_id","客户ID"],["type","类型"],["currency","币种"],["amount","金额"],["status","状态"],["created_at","创建时间"],["reviewed_at","审核时间"],["completed_at","完成时间"]],
  },
  positions: {
    title:"客户持仓明细", help:"数据库原始持仓数量和成本，未加入伪造行情或收益",
    columns:[["user_id","客户ID"],["security_id","证券ID"],["quantity","数量"],["average_cost","平均成本"],["currency","币种"],["updated_at","更新时间"]],
  },
};
const cell = (v: unknown) => typeof v === "boolean" ? (v ? "是" : "否") : v == null ? "—" : String(v);
const csvValue = (input: unknown) => {
  let s = input == null ? "" : String(input);
  if (/^[\s]*[=+@-]/.test(s)) s = "'" + s; // avoid spreadsheet formula injection
  return '"' + s.replaceAll('"','""') + '"';
};
export function VerifiedAdminRecordsPage({ kind }: {kind:ReportKind}) {
  const meta=config[kind];
  const query=useQuery({queryKey:["p004-scoped-report",kind],queryFn:()=>project4Api.listAdminReport(kind),retry:false,staleTime:0});
  const [search,setSearch]=useState("");
  const filtered=useMemo(()=> (query.data?.rows||[]).filter(row=>!search ||
    meta.columns.some(([key])=>cell(row[key]).toLowerCase().includes(search.toLowerCase()))),[query.data,search,meta]);
  const exportCsv=()=>{
    if(!filtered.length)return;
    const cols=meta.columns;
    const body=[cols.map(([,title])=>csvValue(title)).join(","),
      ...filtered.map(row=>cols.map(([key])=>csvValue(row[key])).join(","))].join("\r\n");
    const blob=new Blob(["\uFEFF"+body],{type:"text/csv;charset=utf-8;"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;a.download="P004-"+kind+"-"+new Date().toISOString().slice(0,10)+".csv";
    document.body.appendChild(a);a.click();a.remove();
    URL.revokeObjectURL(url);
  };
  return <div className={styles.layout}>
    <header className={styles.header}>
      <div><h1>{meta.title}</h1><p>{meta.help}</p></div>
      <div className={styles.actions}>
        <button type="button" onClick={()=>void query.refetch()}>刷新查询</button>
        <button type="button" className={styles.export} onClick={exportCsv} disabled={!filtered.length}>导出当前明细 CSV</button>
      </div>
    </header>
    <section className={styles.panel}>
      <div className={styles.toolbar}>
        <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="搜索已加载记录" aria-label="搜索已加载记录"/>
        <span>{query.isSuccess ? "已加载 "+query.data.rows.length+" 条" : "待读取"}</span>
      </div>
      {query.isPending?<p className={styles.note} role="status">正在验证管理员会话并获取数据库记录…</p>:
       query.isError?<p className={styles.error} role="alert">服务器查询失败或没有权限，未显示任何模拟数据。</p>:
       <div className={styles.tableScroll}>
         <table><thead><tr>{meta.columns.map(([key,label])=><th key={key}>{label}</th>)}</tr></thead>
         <tbody>
           {filtered.map((row,index)=><tr key={String(row.id || row.user_id || row.security_id || index)}>
             {meta.columns.map(([key])=><td key={key} title={cell(row[key])}>{cell(row[key])}</td>)}
           </tr>)}
           {filtered.length===0?<tr><td colSpan={meta.columns.length}>没有符合条件的真实记录。</td></tr>:null}
         </tbody></table>
       </div>}
    </section>
    <p className={styles.note}>
      仅可导出当前服务器返回的记录（每次最多 200 条），不是全库导出。
      {query.data?.possiblyMore ? " 结果可能还有更多记录，完整分页查询暂未接入。" : ""}
      子账户只会收到属于其账户的记录，最终访问限制在服务器执行。
    </p>
  </div>;
}
