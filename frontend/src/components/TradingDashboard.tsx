import { useState, useMemo } from "react";
import { ChartComponent } from "./CandleSticks";
import InstrumentPanel from "./trading/InstrumentPanel";
import TradePanel from "./trading/TradePanel";
import PositionsPanel from "./trading/PositionsPanel";
import UserProfile from "./UserProfile";

interface TradingDashboardProps {
  symbol: string;
  interval: string;
  prices: { [symbol: string]: { bid: string; ask: string } };
  currentPrice: number | null;
  accountSummary: any;
  candleData: any[];
  onTrade: (type: "buy" | "sell", data: any) => Promise<void>;
  tradeError: string | null;
  onSymbolChange: (symbol: string) => void;
  onIntervalChange: (interval: string) => void;
  onLogout: () => void;
  userEmail?: string;
  token: string | null;
}

const SYMBOL_DISPLAY: Record<string, string> = {
  BTCUSDT: "BTC/USDT",
  ETHUSDT: "ETH/USDT",
  SOLUSDT: "SOL/USDT",
};

const INTERVAL_OPTIONS = [
  { value: "1m", label: "1m" },
  { value: "5m", label: "5m" },
  { value: "10m", label: "10m" },
  { value: "1h", label: "1h" },
];

const TradingDashboard = ({
  symbol,
  interval,
  prices,
  currentPrice,
  accountSummary,
  candleData,
  onTrade,
  tradeError,
  onSymbolChange,
  onIntervalChange,
  onLogout,
  userEmail,
  token,
}: TradingDashboardProps) => {
  const [tradesRefreshTrigger, setTradesRefreshTrigger] = useState(0);

  const handleTrade = async (type: "buy" | "sell", data: any) => {
    await onTrade(type, data);
    setTradesRefreshTrigger((p) => p + 1);
  };

  const currentBid = useMemo(() => {
    const key = symbol.toLowerCase();
    return prices[key]?.bid || "0.00";
  }, [prices, symbol]);

  const currentAsk = useMemo(() => {
    const key = symbol.toLowerCase();
    return prices[key]?.ask || "0.00";
  }, [prices, symbol]);

  const symbolDisplay = SYMBOL_DISPLAY[symbol] || symbol;

  // OHLC for header
  const lastCandle = candleData.length > 0 ? candleData[candleData.length - 1] : null;

  return (
    <div className="trading-layout dark">
      {/* ============== LEFT PANEL — INSTRUMENTS ============== */}
      <aside className="trading-left-panel">
        <InstrumentPanel
          prices={prices}
          selectedSymbol={symbol}
          onSymbolSelect={onSymbolChange}
        />
      </aside>

      {/* ============== CENTER PANEL — CHART + POSITIONS ============== */}
      <main className="trading-center-panel">
        {/* Chart Toolbar */}
        <div className="chart-toolbar">
          <div className="chart-toolbar-left">
            {/* Timeframe Buttons */}
            <div className="chart-timeframes">
              {INTERVAL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`chart-tf-btn ${interval === opt.value ? "chart-tf-btn-active" : ""}`}
                  onClick={() => onIntervalChange(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>


          </div>
          <div className="chart-toolbar-right">
            <UserProfile onLogout={onLogout} userEmail={userEmail} />
          </div>
        </div>

        {/* OHLC Header */}
        <div className="chart-ohlc-header">
          <span className="chart-symbol-label">{symbolDisplay} · {interval} ·</span>
          {lastCandle && (
            <>
              <span className="chart-ohlc-item">
                O<span className="chart-ohlc-val">{lastCandle.open?.toFixed(3)}</span>
              </span>
              <span className="chart-ohlc-item">
                H<span className="chart-ohlc-val chart-ohlc-high">{lastCandle.high?.toFixed(3)}</span>
              </span>
              <span className="chart-ohlc-item">
                L<span className="chart-ohlc-val chart-ohlc-low">{lastCandle.low?.toFixed(3)}</span>
              </span>
              <span className="chart-ohlc-item">
                C<span className="chart-ohlc-val">{lastCandle.close?.toFixed(3)}</span>
              </span>
              <span className={`chart-ohlc-change ${lastCandle.close >= lastCandle.open ? "text-emerald-400" : "text-red-400"
                }`}>
                {lastCandle.close >= lastCandle.open ? "+" : ""}
                {(lastCandle.close - lastCandle.open).toFixed(3)}
                {" "}
                ({(((lastCandle.close - lastCandle.open) / lastCandle.open) * 100).toFixed(2)}%)
              </span>
            </>
          )}
        </div>

        {/* Chart Area */}
        <div className="chart-area">
          {/* Chart Canvas */}
          <div className="chart-canvas-wrap" style={{ position: "relative", width: "100%", height: "100%" }}>
            <ChartComponent
              data={candleData}
              colors={{
                backgroundColor: "#131722",
                textColor: "#d1d4dc",
                upColor: "#26a69a",
                downColor: "#ef5350",
                borderUpColor: "#26a69a",
                borderDownColor: "#ef5350",
                wickUpColor: "#26a69a",
                wickDownColor: "#ef5350",
              }}
            />
          </div>
        </div>

        {/* Positions Panel */}
        <div className="positions-area">
          <PositionsPanel
            token={token}
            refreshTrigger={tradesRefreshTrigger}
            accountSummary={accountSummary}
          />
        </div>
      </main>

      {/* ============== RIGHT PANEL — TRADING ============== */}
      <aside className="trading-right-panel">
        <TradePanel
          symbol={symbol}
          symbolDisplay={symbolDisplay}
          bid={currentBid}
          ask={currentAsk}
          onTrade={handleTrade}
          tradeError={tradeError}
        />
      </aside>
    </div>
  );
};

export default TradingDashboard;
