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
              <stop offset="0%" stopColor="#1474e8" stopOpacity=".26" />
              <stop offset="100%" stopColor="#1474e8" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[55, 90, 125, 160, 195].map((y) => (
            <line key={y} x1="30" x2="675" y1={y} y2={y} stroke="#e7edf5" strokeWidth="1" />
          ))}
          <polygon
            points={`40,200 ${polyline} 660,200`}
            fill="url(#trendFill)"
          />
          <polyline points={polyline} fill="none" stroke="#1474e8" strokeWidth="3" />
          <line x1={active.x} x2={active.x} y1="35" y2="200" stroke="#7e9fc7" strokeDasharray="4 4" />
          {points.map((point, index) => (
            <g key={point.label}>
              <circle
                cx={point.x}
                cy={point.y}
                r={index === selected ? 6 : 4}
                fill={index === selected ? "#0b5fc8" : "#ffffff"}
                stroke="#1474e8"
                strokeWidth="2"
              />
              <rect
                x={point.x - 34}
                y="28"
                width="68"
                height="178"
                fill="transparent"
                className={styles.hit}
                onClick={() => setSelected(index)}
              />
              <text x={point.x} y="216" textAnchor="middle" className={styles.axisText}>
                {point.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <div className={styles.chartHint}>点击任意日期节点查看该日详细数据</div>
    </div>
  );
}

type Candle = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

const baseCandles: Candle[] = [
  { time: "09:30", open: 224.12, high: 225.34, low: 223.88, close: 225.02, volume: 128420 },
  { time: "09:45", open: 225.02, high: 226.18, low: 224.81, close: 225.72, volume: 154880 },
  { time: "10:00", open: 225.72, high: 226.04, low: 224.96, close: 225.10, volume: 143690 },
  { time: "10:15", open: 225.10, high: 226.72, low: 225.02, close: 226.48, volume: 188440 },
  { time: "10:30", open: 226.48, high: 227.19, low: 226.14, close: 226.92, volume: 201830 },
  { time: "10:45", open: 226.92, high: 228.08, low: 226.61, close: 227.84, volume: 221940 },
  { time: "11:00", open: 227.84, high: 228.26, low: 227.16, close: 227.31, volume: 179230 },
  { time: "11:15", open: 227.31, high: 228.92, low: 227.22, close: 228.54, volume: 239480 },
  { time: "11:30", open: 228.54, high: 229.10, low: 228.04, close: 228.18, volume: 198740 },
  { time: "11:45", open: 228.18, high: 229.42, low: 228.10, close: 229.05, volume: 244560 },
  { time: "12:00", open: 229.05, high: 229.68, low: 228.63, close: 228.92, volume: 186340 },
  { time: "12:15", open: 228.92, high: 230.18, low: 228.81, close: 229.84, volume: 268170 },
  { time: "12:30", open: 229.84, high: 230.41, low: 229.27, close: 229.51, volume: 207890 },
  { time: "12:45", open: 229.51, high: 230.66, low: 229.34, close: 230.22, volume: 282310 },
];

function symbolFactor(symbol: string) {
  return symbol.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) % 17;
}

export function InteractiveCandleChart({
  symbol,
  interval,
}: {
  symbol: string;
  interval: string;
}) {
  const [selected, setSelected] = useState(baseCandles.length - 1);
  const candles = useMemo(() => {
    const factor = symbolFactor(symbol);
    const intervalFactor =
      interval === "日K" ? 1.14 :
      interval === "1小时" ? 1.08 :
      interval === "15分" ? 1.05 :
      interval === "5分" ? 1.03 :
      interval === "1分" ? 1.01 : 1;
    const scale = symbol === "TSLA" ? 1.78 : symbol === "NVDA" ? .82 : symbol === "WALMEX" ? .26 : symbol === "AMXL" ? .085 : 1;
    return baseCandles.map((c, i) => ({
      ...c,
      open: +(c.open * scale * intervalFactor + factor * .08 + i * .01).toFixed(2),
      high: +(c.high * scale * intervalFactor + factor * .08 + i * .01).toFixed(2),
      low: +(c.low * scale * intervalFactor + factor * .08 + i * .01).toFixed(2),
      close: +(c.close * scale * intervalFactor + factor * .08 + i * .01).toFixed(2),
      volume: Math.round((c.volume + factor * 2700) * intervalFactor),
    }));
  }, [symbol, interval]);

  const active = candles[selected];
  const allPrices = candles.flatMap((c) => [c.high, c.low]);
  const min = Math.min(...allPrices);
  const max = Math.max(...allPrices);
  const top = 24;
  const bottom = 218;
  const toY = (price: number) => bottom - ((price - min) / (max - min)) * (bottom - top);
  const width = 720;
  const left = 34;
  const usable = width - 70;
  const step = usable / candles.length;
  const xFor = (index: number) => left + step * index + step / 2;
  const change = active.close - active.open;
  const percent = (change / active.open) * 100;
  const amount = active.volume * active.close;

  return (
    <div className={styles.candleWrap}>
      <div className={styles.ohlc}>
        <div><span>周期</span><strong>{interval}</strong></div>
        <div><span>时间</span><strong>{active.time}</strong></div>
        <div><span>开</span><strong>{active.open.toFixed(2)}</strong></div>
        <div><span>高</span><strong>{active.high.toFixed(2)}</strong></div>
        <div><span>低</span><strong>{active.low.toFixed(2)}</strong></div>
        <div><span>收</span><strong>{active.close.toFixed(2)}</strong></div>
        <div>
          <span>涨跌</span>
          <strong className={change >= 0 ? styles.up : styles.down}>
            {change >= 0 ? "+" : ""}{change.toFixed(2)} / {percent >= 0 ? "+" : ""}{percent.toFixed(2)}%
          </strong>
        </div>
        <div><span>成交量</span><strong>{active.volume.toLocaleString()}</strong></div>
        <div><span>成交额</span><strong>{amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong></div>
      </div>
      <div className={styles.svgBox}>
        <svg viewBox="0 0 720 250" preserveAspectRatio="none" role="img">
          {[50, 90, 130, 170, 210].map((y) => (
            <line key={y} x1="25" x2="690" y1={y} y2={y} stroke="#e8edf4" strokeWidth="1" />
          ))}
          {candles.map((candle, index) => {
            const x = xFor(index);
            const rising = candle.close >= candle.open;
            const bodyTop = toY(Math.max(candle.open, candle.close));
            const bodyBottom = toY(Math.min(candle.open, candle.close));
            const bodyHeight = Math.max(3, bodyBottom - bodyTop);
            const color = rising ? "#139568" : "#df4b55";
            return (
              <g key={candle.time}>
                <line x1={x} x2={x} y1={toY(candle.high)} y2={toY(candle.low)} stroke={color} strokeWidth="1.5" />
                <rect
                  x={x - 8}
                  y={bodyTop}
                  width="16"
                  height={bodyHeight}
                  fill={rising ? "#e9f8f2" : "#fff0f1"}
                  stroke={color}
                  strokeWidth={index === selected ? "2.2" : "1.5"}
                />
                <rect
                  x={x - step / 2}
                  y="18"
                  width={step}
                  height="210"
                  fill="transparent"
                  className={styles.hit}
                  onClick={() => setSelected(index)}
                />
              </g>
            );
          })}
          <line
            x1={xFor(selected)}
            x2={xFor(selected)}
            y1="18"
            y2="228"
            stroke="#7f9ec3"
            strokeDasharray="4 4"
          />
          {candles.map((candle, index) =>
            index % 2 === 0 ? (
              <text key={candle.time} x={xFor(index)} y="244" textAnchor="middle" className={styles.axisText}>
                {candle.time}
              </text>
            ) : null
          )}
        </svg>
      </div>
      <div className={styles.chartHint}>点击任意K线固定查看该时段交易数据</div>
    </div>
  );
}
