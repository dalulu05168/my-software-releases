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
  return (
    <div className={styles.trendWrap}>
      <div className={styles.dataStrip}>
        <div><span>资金趋势</span><strong>—</strong></div>
        <div><span>近 7 日入金</span><strong>—</strong></div>
        <div><span>近 7 日提现</span><strong>—</strong></div>
        <div><span>数据状态</span><strong>未接入</strong></div>
      </div>
      <div className={styles.svgBox}>
        <div className={styles.emptyChart}>真实资金趋势数据源尚未接入</div>
      </div>
      <div className={styles.historyNotice}>未接入真实资金流水接口前，不展示生成或估算趋势数据。</div>
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
