import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BellRing,
  ChevronRight,
  KeyRound,
  LineChart,
  MessageSquareText,
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  X,
} from "lucide-react";
import styles from "./AdminControlPages.module.css";
import { project4Api } from "../helpers/project4Api";

export type AdminControlView =
  | "securities"
  | "purchaseAccess"
  | "risk"
  | "support";

type Role = "client" | "ops" | "master";

export type RiskControlKey = "GLOBAL" | "US" | "MX" | "WITHDRAW" | "LOCKOUT";

export type RiskControl = {
  key: RiskControlKey;
  label: string;
  desc: string;
  enabled: boolean;
};

type SecurityRow = {
  id?: string;
  status?: "ACTIVE" | "SUSPENDED" | "DELISTED";
  symbol: string;
  name: string;
  market: "US" | "MX";
  exchange: string;
  mic: string;
  currency: "USD" | "MXN";
  visible: boolean;
  internalOrder: boolean;
  quote: string;
  sync: string;
};

const securitySeed: SecurityRow[] = [
  { symbol: "AAPL", name: "Apple Inc.", market: "US", exchange: "NASDAQ", mic: "XNAS", currency: "USD", visible: true, internalOrder: true, quote: "227.19", sync: "14:36:18" },
  { symbol: "NVDA", name: "NVIDIA Corp.", market: "US", exchange: "NASDAQ", mic: "XNAS", currency: "USD", visible: true, internalOrder: true, quote: "184.41", sync: "14:36:16" },
  { symbol: "TSLA", name: "Tesla Inc.", market: "US", exchange: "NASDAQ", mic: "XNAS", currency: "USD", visible: true, internalOrder: false, quote: "443.21", sync: "14:36:12" },
  { symbol: "WALMEX", name: "Walmart de México", market: "MX", exchange: "BMV", mic: "XMEX", currency: "MXN", visible: true, internalOrder: true, quote: "58.73", sync: "14:35:58" },
  { symbol: "AMXL", name: "América Móvil", market: "MX", exchange: "BMV", mic: "XMEX", currency: "MXN", visible: true, internalOrder: false, quote: "18.94", sync: "14:35:54" },
];

type AccessRow = {
  id: string;
  scope: string;
  target: string;
  status: "启用" | "暂停" | "已撤销";
  expires: string;
  uses: string;
};

const accessSeed: AccessRow[] = [
  { id: "AUTH-AAPL-0821", scope: "AAPL", target: "Carlos Ramírez", status: "启用", expires: "2026-09-27 18:00", uses: "0 / 1" },
  { id: "AUTH-BLK-0714", scope: "PRD-BLK-028", target: "VIP3 / VIP4 / VIP5", status: "启用", expires: "2026-09-28 15:00", uses: "6 / 20" },
  { id: "AUTH-WMX-0682", scope: "WALMEX", target: "Mexico Operations 01", status: "暂停", expires: "2026-09-29 13:00", uses: "3 / 10" },
];

export const defaultRiskControls: RiskControl[] = [
  { key: "GLOBAL", label: "全平台内部下单", desc: "控制客户端内部订单提交入口", enabled: true },
  { key: "US", label: "美国市场内部下单", desc: "控制 US 市场内部订单入口", enabled: true },
  { key: "MX", label: "墨西哥市场内部下单", desc: "控制 MX 市场内部订单入口", enabled: true },
  { key: "WITHDRAW", label: "提现申请", desc: "控制客户端提现申请入口", enabled: true },
  { key: "LOCKOUT", label: "购买授权失败锁定", desc: "连续错误后限制再次提交", enabled: true },
];

const supportSeed = [
  {
    id: "SUP-7148",
    customer: "Carlos Ramírez",
    subject: "充值申请资料确认",
    status: "处理中",
    last: "请问付款凭证还需要补充什么资料？",
    time: "14:29",
  },
  {
    id: "SUP-7141",
    customer: "Daniela Torres",
    subject: "实名认证",
    status: "待回复",
    last: "证件反面已经重新上传。",
    time: "13:44",
  },
  {
    id: "SUP-7128",
    customer: "Alejandro Ruiz",
    subject: "账户设置",
    status: "已完成",
    last: "谢谢，已经可以正常查看了。",
    time: "11:18",
  },
];

function Switch({
  value,
  onChange,
}: {
  value: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      className={value ? styles.switchOn : styles.switchOff}
      onClick={onChange}
    >
      <i />
    </button>
  );
}

function Status({ value }: { value: string }) {
  const className =
    value === "启用" || value === "已完成"
      ? styles.good
      : value === "已撤销"
        ? styles.bad
        : styles.wait;
  return <span className={className}>{value}</span>;
}

export function AdminControlPage({
  view,
  role,
  accountName,
  riskControls,
  onRiskControlsChange,
}: {
  view: AdminControlView;
  role: Role;
  accountName: string;
  riskControls: RiskControl[];
  onRiskControlsChange: (next: RiskControl[]) => void;
}) {
  if (view === "securities") return <SecuritiesPage />;
  if (view === "purchaseAccess") return <PurchaseAccessPage />;
  if (view === "risk") return <RiskPage rows={riskControls} onChange={onRiskControlsChange} />;
  return <SupportPage role={role} accountName={accountName} />;
}

function SecuritiesPage() {
  const queryClient = useQueryClient();
  const securitiesQuery = useQuery({
    queryKey: ["project4-admin-securities"],
    queryFn: project4Api.listAdminSecurities,
    staleTime: 5_000,
  });
  const rows: SecurityRow[] = (securitiesQuery.data || []).map((row) => ({
    id: row.id,
    status: row.status,
    symbol: row.symbol,
    name: row.name,
    market: row.market,
    exchange: row.providerExchange || (row.market === "MX" ? "BMV" : "NASDAQ"),
    mic: row.micCode || (row.market === "MX" ? "XMEX" : "XNAS"),
    currency: row.currency,
    visible: row.visible,
    internalOrder: row.tradable,
    quote: row.quote?.lastPrice == null ? "—" : String(row.quote.lastPrice),
    sync: row.providerSyncedAt ? new Date(row.providerSyncedAt).toLocaleString() : "—",
  }));
  const [market, setMarket] = useState<"ALL" | "US" | "MX">("ALL");
  const [query, setQuery] = useState("");
  const [providerRows, setProviderRows] = useState<SecurityRow[]>([]);
  const [selected, setSelected] = useState<SecurityRow | null>(null);

  const visible = rows.filter(
    (row) =>
      (market === "ALL" || row.market === market) &&
      [row.symbol, row.name, row.exchange]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase()),
  );

  // Until a real external provider lookup is connected, only search securities
  // returned by the backend. Never invent symbol / price / sync timestamps.
  const searchProvider = () => {
    setProviderRows(rows.filter((row) =>
      [row.symbol, row.name].join(" ").toLowerCase().includes(query.toLowerCase()),
    ));
  };

  const refreshSecurities = async () => {
    await queryClient.invalidateQueries({ queryKey: ["project4-admin-securities"] });
    await queryClient.invalidateQueries({ queryKey: ["project4-client-securities"] });
  };

  const updateMutation = useMutation({
    mutationFn: ({ row, patch }: { row: SecurityRow; patch: Partial<SecurityRow> }) =>
      project4Api.updateSecurity(row.id || "", {
        visible: typeof patch.visible === "boolean" ? patch.visible : undefined,
        tradable:
          typeof patch.internalOrder === "boolean" ? patch.internalOrder : undefined,
      }),
    onSuccess: refreshSecurities,
  });

  const upsertMutation = useMutation({
    mutationFn: (row: SecurityRow) =>
      project4Api.upsertSecurity({
        symbol: row.symbol,
        name: row.name,
        market: row.market,
        currency: row.currency,
        visible: true,
        tradable: false,
        providerExchange: row.exchange,
        micCode: row.mic,
      }),
    onSuccess: refreshSecurities,
  });

  const update = (symbol: string, patch: Partial<SecurityRow>) => {
    const row = rows.find((item) => item.symbol === symbol);
    if (!row?.id) return;
    updateMutation.mutate({ row, patch });
  };

  return (
    <div className={styles.stack}>
      <div className={styles.header}>
        <div>
          <h1>证券管理</h1>
          <p>真实证券资料、行情同步与客户端可见性管理</p>
        </div>
        <span className={styles.boundary}>外部券商交易未接入</span>
      </div>

      <section className={styles.providerBox}>
        <div className={styles.providerTitle}>
          <div>
            <strong>已入库证券查询</strong>
            <span>查询真实 API 内的 US / MX 证券；外部数据源检索尚未接入，不生成虚构证券</span>
          </div>
          <LineChart size={20} />
        </div>
        <div className={styles.searchRow}>
          <select
            value={market}
            onChange={(event) =>
              setMarket(event.target.value as "ALL" | "US" | "MX")
            }
          >
            <option value="ALL">全部市场</option>
            <option value="US">US</option>
            <option value="MX">MX</option>
          </select>
          <div className={styles.search}>
            <Search size={14} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="AAPL / WALMEX / 公司名称"
            />
          </div>
          <button className={styles.primary} onClick={searchProvider}>
            查询已上架证券
          </button>
        </div>
        {providerRows.length ? (
          <div className={styles.providerResults}>
            {providerRows.map((row) => (
              <div key={row.symbol}>
                <strong>{row.symbol}</strong>
                <span>{row.name}</span>
                <span>{row.exchange} · {row.mic}</span>
                <button
                  onClick={() => upsertMutation.mutate({ ...row, internalOrder: false })}
                >
                  {upsertMutation.isPending ? "上架中…" : "加入证券列表"}
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {securitiesQuery.isError ? (
        <p role="alert">证券列表从服务器同步失败。请检查后台会话与网络连接，当前不会展示模拟证券。</p>
      ) : null}
      {!securitiesQuery.isFetching && !securitiesQuery.isError && rows.length === 0 ? (
        <p role="status">服务器暂无证券记录；没有使用默认演示行情代替。</p>
      ) : null}
      {updateMutation.isError || upsertMutation.isError ? (
        <p role="alert">证券写入未通过服务器验证；页面未确认操作成功。</p>
      ) : null}
      <section className={styles.tablePanel}>
        <table>
          <thead>
            <tr>
              <th>代码</th>
              <th>名称</th>
              <th>市场</th>
              <th>交易所 / MIC</th>
              <th>币种</th>
              <th>最新价</th>
              <th>同步时间</th>
              <th>客户端可见</th>
              <th>内部下单</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.symbol}>
                <td className={styles.mono}>{row.symbol}</td>
                <td>{row.name}</td>
                <td>{row.market}</td>
                <td>{row.exchange} · {row.mic}</td>
                <td>{row.currency}</td>
                <td className={styles.mono}>{row.quote}</td>
                <td>{row.sync}</td>
                <td>
                  <Switch
                    value={row.visible}
                    onChange={() =>
                      update(row.symbol, { visible: !row.visible })
                    }
                  />
                </td>
                <td>
                  <Switch
                    value={row.internalOrder}
                    onChange={() =>
                      update(row.symbol, {
                        internalOrder: !row.internalOrder,
                      })
                    }
                  />
                </td>
                <td>
                  <button
                    className={styles.link}
                    onClick={() => setSelected(row)}
                  >
                    详情
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {selected ? (
        <div className={styles.shade} onMouseDown={() => setSelected(null)}>
          <aside
            className={styles.drawer}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={styles.drawerHeader}>
              <div>
                <span>证券详情</span>
                <h2>{selected.symbol}</h2>
              </div>
              <button onClick={() => setSelected(null)}>
                <X size={18} />
              </button>
            </div>
            <div className={styles.detailGrid}>
              <div><span>名称</span><strong>{selected.name}</strong></div>
              <div><span>市场</span><strong>{selected.market}</strong></div>
              <div><span>交易所</span><strong>{selected.exchange}</strong></div>
              <div><span>MIC</span><strong>{selected.mic}</strong></div>
              <div><span>币种</span><strong>{selected.currency}</strong></div>
              <div><span>最新价</span><strong>{selected.quote}</strong></div>
            </div>
            <section className={styles.drawerSection}>
              <h3>证券状态</h3>
              <div className={styles.controlRow}>
                <span>客户端可见</span>
                <Switch
                  value={selected.visible}
                  onChange={() =>
                    setSelected({ ...selected, visible: !selected.visible })
                  }
                />
              </div>
              <div className={styles.controlRow}>
                <span>内部下单</span>
                <Switch
                  value={selected.internalOrder}
                  onChange={() =>
                    setSelected({
                      ...selected,
                      internalOrder: !selected.internalOrder,
                    })
                  }
                />
              </div>
            </section>
            <div className={styles.drawerFooter}>
              <button
                className={styles.primary}
                onClick={() => {
                  update(selected.symbol, selected);
                  setSelected(null);
                }}
              >
                保存修改
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function PurchaseAccessPage() {
  const [rows, setRows] = useState(accessSeed);
  const [creating, setCreating] = useState(false);
  const [scope, setScope] = useState("AAPL");
  const [target, setTarget] = useState("Carlos Ramírez");
  const [createdCode, setCreatedCode] = useState("");

  const create = (event: FormEvent) => {
    event.preventDefault();
    const id = `AUTH-${scope.replaceAll(" ", "-")}-${String(rows.length + 900).padStart(4, "0")}`;
    setRows([
      {
        id,
        scope,
        target,
        status: "启用",
        expires: "2026-09-28 18:00",
        uses: "0 / 1",
      },
      ...rows,
    ]);
    setCreatedCode(
      `${scope.replace(/[^A-Z0-9]/gi, "").slice(0, 4).toUpperCase()}-${String(Date.now()).slice(-6)}`,
    );
  };

  return (
    <div className={styles.stack}>
      <div className={styles.header}>
        <div>
          <h1>购买授权码</h1>
          <p>按证券、产品和客户范围生成购买授权信息</p>
        </div>
        <button
          className={styles.primary}
          onClick={() => {
            setCreating(true);
            setCreatedCode("");
          }}
        >
          <KeyRound size={15} />
          创建授权
        </button>
      </div>
      <section className={styles.tablePanel}>
        <table>
          <thead>
            <tr>
              <th>授权编号</th>
              <th>证券 / 产品</th>
              <th>目标范围</th>
              <th>有效时间</th>
              <th>使用次数</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className={styles.mono}>{row.id}</td>
                <td className={styles.mono}>{row.scope}</td>
                <td>{row.target}</td>
                <td>{row.expires}</td>
                <td className={styles.mono}>{row.uses}</td>
                <td><Status value={row.status} /></td>
                <td>
                  <div className={styles.actions}>
                    {row.status === "启用" ? (
                      <button
                        onClick={() =>
                          setRows(
                            rows.map((item) =>
                              item.id === row.id
                                ? { ...item, status: "暂停" }
                                : item,
                            ),
                          )
                        }
                      >
                        暂停
                      </button>
                    ) : null}
                    {row.status === "暂停" ? (
                      <button
                        onClick={() =>
                          setRows(
                            rows.map((item) =>
                              item.id === row.id
                                ? { ...item, status: "启用" }
                                : item,
                            ),
                          )
                        }
                      >
                        恢复
                      </button>
                    ) : null}
                    {row.status !== "已撤销" ? (
                      <button
                        onClick={() =>
                          setRows(
                            rows.map((item) =>
                              item.id === row.id
                                ? { ...item, status: "已撤销" }
                                : item,
                            ),
                          )
                        }
                      >
                        撤销
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {creating ? (
        <div className={styles.shade}>
          <div className={styles.modal}>
            <div className={styles.drawerHeader}>
              <div>
                <span>总账户授权</span>
                <h2>创建购买授权</h2>
              </div>
              <button onClick={() => setCreating(false)}>
                <X size={18} />
              </button>
            </div>
            {!createdCode ? (
              <form className={styles.form} onSubmit={create}>
                <label>
                  <span>证券 / 产品</span>
                  <input
                    value={scope}
                    onChange={(event) => setScope(event.target.value)}
                  />
                </label>
                <label>
                  <span>目标客户 / 范围</span>
                  <input
                    value={target}
                    onChange={(event) => setTarget(event.target.value)}
                  />
                </label>
                <label>
                  <span>有效期</span>
                  <input defaultValue="2026-09-28 18:00" />
                </label>
                <label>
                  <span>最大使用次数</span>
                  <input defaultValue="1" />
                </label>
                <button className={styles.primary} type="submit">
                  生成授权
                </button>
              </form>
            ) : (
              <div className={styles.codeResult}>
                <ShieldCheck size={34} />
                <h3>授权已创建</h3>
                <p>授权码只在当前创建流程显示，请按业务流程交付给目标客户。</p>
                <div>
                  <span>购买授权码</span>
                  <strong>{createdCode}</strong>
                </div>
                <button
                  className={styles.primary}
                  onClick={() => setCreating(false)}
                >
                  完成
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function RiskPage({
  rows,
  onChange,
}: {
  rows: RiskControl[];
  onChange: (next: RiskControl[]) => void;
}) {
  return (
    <div className={styles.stack}>
      <div className={styles.header}>
        <div>
          <h1>风控中心</h1>
          <p>集中控制内部订单、提现和安全策略</p>
        </div>
        <span className={styles.boundary}>所有变更写入审计记录</span>
      </div>
      <div className={styles.riskGrid}>
        {rows.map((row) => (
          <article key={row.key}>
            <div className={styles.riskIcon}>
              {row.enabled ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
            </div>
            <div>
              <strong>{row.label}</strong>
              <span>{row.desc}</span>
            </div>
            <Switch
              value={row.enabled}
              onChange={() =>
                onChange(
                  rows.map((item) =>
                    item.key === row.key
                      ? { ...item, enabled: !item.enabled }
                      : item,
                  ),
                )
              }
            />
          </article>
        ))}
      </div>
    </div>
  );
}

function SupportPage({
  role,
  accountName,
}: {
  role: Role;
  accountName: string;
}) {
  const [threads, setThreads] = useState(supportSeed);
  const [selectedId, setSelectedId] = useState(supportSeed[0].id);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    { from: "client", text: "请问付款凭证还需要补充什么资料？", time: "14:29" },
    { from: "staff", text: "您好，当前凭证清晰，可以继续等待审核结果。", time: "14:31" },
  ]);
  const selected =
    threads.find((thread) => thread.id === selectedId) ?? threads[0];
  const visible =
    role === "client"
      ? threads.filter(
          (thread) =>
            thread.customer === accountName ||
            thread.customer === "Carlos Ramírez",
        )
      : threads;

  const send = (event: FormEvent) => {
    event.preventDefault();
    if (!message.trim()) return;
    setMessages([
      ...messages,
      {
        from: role === "client" ? "client" : "staff",
        text: message.trim(),
        time: "刚刚",
      },
    ]);
    setThreads(
      threads.map((thread) =>
        thread.id === selected.id
          ? { ...thread, last: message.trim(), time: "刚刚" }
          : thread,
      ),
    );
    setMessage("");
  };

  return (
    <div className={styles.stack}>
      <div className={styles.header}>
        <div>
          <h1>{role === "client" ? "客服支持" : "客户服务"}</h1>
          <p>{role === "client" ? "查看并继续账户服务会话" : "处理客户咨询与业务跟进"}</p>
        </div>
        <button
          className={styles.primary}
          onClick={() => {
            const id = `SUP-${7200 + threads.length}`;
            setThreads([
              {
                id,
                customer: role === "client" ? accountName : "新客户",
                subject: "新服务会话",
                status: "待回复",
                last: "新会话已创建",
                time: "刚刚",
              },
              ...threads,
            ]);
            setSelectedId(id);
            setMessages([]);
          }}
        >
          <MessageSquareText size={15} />
          新建会话
        </button>
      </div>
      <div className={styles.supportLayout}>
        <aside className={styles.threadList}>
          <div className={styles.threadSearch}>
            <Search size={14} />
            <input placeholder="搜索客户 / 会话" />
          </div>
          {visible.map((thread) => (
            <button
              key={thread.id}
              className={
                selectedId === thread.id ? styles.threadActive : styles.thread
              }
              onClick={() => setSelectedId(thread.id)}
            >
              <div>
                <strong>{thread.customer}</strong>
                <span>{thread.subject}</span>
              </div>
              <small>{thread.time}</small>
              <p>{thread.last}</p>
            </button>
          ))}
        </aside>
        <section className={styles.chat}>
          <div className={styles.chatHeader}>
            <div>
              <strong>{selected.customer}</strong>
              <span>{selected.subject} · {selected.id}</span>
            </div>
            <Status value={selected.status} />
          </div>
          <div className={styles.chatBody}>
            {messages.map((item, index) => (
              <div
                key={index}
                className={
                  item.from === "client"
                    ? styles.clientMessage
                    : styles.staffMessage
                }
              >
                <p>{item.text}</p>
                <span>{item.time}</span>
              </div>
            ))}
          </div>
          <form className={styles.chatForm} onSubmit={send}>
            <input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="输入消息内容"
            />
            <button className={styles.primary} type="submit">
              发送
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
