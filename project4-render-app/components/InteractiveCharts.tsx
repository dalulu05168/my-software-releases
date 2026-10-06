import { useMemo, useState } from "react";
import styles from "./InteractiveCharts.module.css";

type TrendPoint = {
  label: string;
  value: number;
  deposits: number;
  withdrawals: number;
};

const trendPoints: TrendPoint[] = [
  { label: "09/20", value: 12.84, deposits: 1.42, withdrawals: 0.48 },
  { label: "09/21", value: 13.26, deposits: 1.68, withdrawals: 0.61 },
  { label: "09/22", value: 14.11, deposits: 2.04, withdrawals: 0.72 },
  { label: "09/23", value: 14.86, deposits: 1.91, withdrawals: 0.66 },
  { label: "09/24", value: 15.74, deposits: 2.36, withdrawals: 0.81 },
  { label: "09/25", value: 17.03, deposits: 2.58, withdrawals: 0.93 },
  { label: "09/26", value: 18.62, deposits: 2.91, withdrawals: 1.02 },
];

export function InteractiveTrendChart() {
  const [selected, setSelected] = useState(6);
  const min = Math.min(...trendPoints.map((p) => p.value));
  const max = Math.max(...trendPoints.map((p) => p.value));
  const points = trendPoints.map((point, index) => {
    const x = 40 + (index / (trendPoints.length - 1)) * 620;
    const y = 190 - ((point.value - min) / (max - min)) * 135;
    return { ...point, x, y };
  });
  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");
  const active = points[selected];

  return (
    <div className={styles.trendWrap}>
      <div className={styles.dataStrip}>
        <div><span>日期</span><strong>{active.label}</strong></div>
        <div><span>平台资金</span><strong>MXN {active.value.toFixed(2)}M</strong></div>
        <div><span>当日入金</span><strong>MXN {active.deposits.toFixed(2)}M</strong></div>
        <div><span>当日提现</span><strong>MXN {active.withdrawals.toFixed(2)}M</strong></div>
      </div>
      <div className={styles.svgBox}>
        <svg viewBox="0 0 700 220" preserveAspectRatio="none" role="img">
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b1029" stopOpacity=".16" />
              <stop offset="100%" stopColor="#8b1029" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[55, 90, 125, 160, 195].map((y) => (
            <line key={y} x1="30" x2="675" y1={y} y2={y} stroke="#eadfce" strokeWidth="1" />
          ))}
          <polygon points={`40,200 ${polyline} 660,200`} fill="url(#trendFill)" />
          <polyline points={polyline} fill="none" stroke="#8b1029" strokeWidth="2.5" />
          <line x1={active.x} x2={active.x} y1="35" y2="200" stroke="#b98a45" strokeDasharray="4 4" />
          {points.map((point, index) => (
            <g key={point.label}>
              <circle
                cx={point.x}
                cy={point.y}
                r={index === selected ? 6 : 4}
                fill={index === selected ? "#8b1029" : "#ffffff"}
                stroke="#8b1029"
                strokeWidth="2"
              />
              <rect
                x={point.x - 34}
                y="28"
                width="68"
                height="178"
                fill="transparent"
                className={styles.hit}
                onMouseEnter={() => setSelected(index)}
                onFocus={() => setSelected(index)}
                onClick={() => setSelected(index)}
              />
              <text x={point.x} y="216" textAnchor="middle" className={styles.axisText}>
                {point.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <div className={styles.chartHint}>鼠标经过或点击日期节点查看对应数据</div>
    </div>
  );
}

export function InteractiveCandleChart({
  symbol,
  interval,
  currentPrice,
  percentChange,
  providerTimestamp,
  locale = "zh",
}: {
  symbol: string;
  interval: string;
  currentPrice?: number | null;
  percentChange?: number | null;
  providerTimestamp?: string | null;
  locale?: "zh" | "ro";
}) {
  const price = Number(currentPrice);
  const pct = Number(percentChange ?? 0);
  const hasQuote = Number.isFinite(price) && price > 0;
  const previousClose = useMemo(() => {
    if (!hasQuote) return null;
    const divisor = 1 + pct / 100;
    if (!Number.isFinite(divisor) || divisor === 0) return null;
    return price / divisor;
  }, [hasQuote, pct, price]);

  const values = previousClose == null ? [price] : [previousClose, price];
  const finite = values.filter((value) => Number.isFinite(value));
  const min = finite.length ? Math.min(...finite) : 0;
  const max = finite.length ? Math.max(...finite) : 1;
  const spread = Math.max((max - min) || Math.max(price * 0.01, 1), 0.01);
  const chartMin = min - spread * 1.2;
  const chartMax = max + spread * 1.2;
  const yFor = (value: number) => 190 - ((value - chartMin) / (chartMax - chartMin)) * 130;
  const previousY = previousClose == null ? 125 : yFor(previousClose);
  const currentY = hasQuote ? yFor(price) : 125;
  const rising = pct >= 0;
  const changeColor = rising ? "#168654" : "#b91c2b";
  const timestamp = providerTimestamp
    ? new Date(providerTimestamp).toLocaleString(locale === "ro" ? "ro-RO" : "zh-CN", {
        hour12: false,
      })
    : (locale === "ro" ? "Fără oră furnizor" : "暂无报价时间");

  const labels = locale === "ro"
    ? {
        period: "Interval selectat",
        symbol: "Instrument",
        last: "Ultimul preț",
        change: "Variație",
        time: "Ora furnizorului",
        previous: "Închidere precedentă",
        current: "Cotație curentă",
        noQuote: "Nu există cotație curentă disponibilă.",
        noHistory: "Seria istorică OHLC/K nu este conectată încă. Graficul afișează numai cotația reală curentă și închiderea precedentă derivată din variația furnizorului.",
      }
    : {
        period: "当前周期",
        symbol: "证券",
        last: "当前报价",
        change: "涨跌幅",
        time: "报价时间",
        previous: "前收参考",
        current: "当前价",
        noQuote: "当前没有可用的实时报价。",
        noHistory: "历史OHLC/K线数据源尚未接入；图表只展示真实当前报价，以及根据供应商涨跌幅反算的前收参考值。",
      };

  return (
    <div className={styles.candleWrap}>
      <div className={styles.ohlc}>
        <div><span>{labels.period}</span><strong>{interval}</strong></div>
        <div><span>{labels.symbol}</span><strong>{symbol || "—"}</strong></div>
        <div><span>{labels.last}</span><strong>{hasQuote ? price.toFixed(2) : "—"}</strong></div>
        <div>
          <span>{labels.change}</span>
          <strong className={rising ? styles.up : styles.down}>
            {hasQuote ? `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%` : "—"}
          </strong>
        </div>
        <div className={styles.timestampCell}><span>{labels.time}</span><strong>{timestamp}</strong></div>
      </div>

      <div className={styles.svgBox}>
        {hasQuote ? (
          <svg viewBox="0 0 720 250" preserveAspectRatio="none" role="img">
            {[50, 90, 130, 170, 210].map((y) => (
              <line key={y} x1="25" x2="690" y1={y} y2={y} stroke="#eadfce" strokeWidth="1" />
            ))}
            {previousClose != null ? (
              <>
                <line x1="135" x2="585" y1={previousY} y2={currentY} stroke={changeColor} strokeWidth="2.5" />
                <circle cx="135" cy={previousY} r="6" fill="#fff" stroke="#b98a45" strokeWidth="2" />
                <text x="135" y={Math.max(26, previousY - 13)} textAnchor="middle" className={styles.valueLabel}>
                  {previousClose.toFixed(2)}
                </text>
                <text x="135" y="232" textAnchor="middle" className={styles.axisText}>{labels.previous}</text>
              </>
            ) : null}
            <line x1="585" x2="585" y1="34" y2="208" stroke="#b98a45" strokeDasharray="4 4" />
            <circle cx="585" cy={currentY} r="7" fill={changeColor} stroke="#fff" strokeWidth="3" />
            <text x="585" y={Math.max(26, currentY - 14)} textAnchor="middle" className={styles.valueLabel}>
              {price.toFixed(2)}
            </text>
            <text x="585" y="232" textAnchor="middle" className={styles.axisText}>{labels.current}</text>
          </svg>
        ) : (
          <div className={styles.emptyChart}>{labels.noQuote}</div>
        )}
      </div>

      <div className={styles.historyNotice}>{labels.noHistory}</div>
    </div>
  );
}
