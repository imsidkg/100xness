import { useState, useMemo } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { ChartComponent } from "./CandleSticks";
import InstrumentPanel from "./trading/InstrumentPanel";
import TradePanel from "./trading/TradePanel";
import PositionsPanel from "./trading/PositionsPanel";
import UserProfile from "./UserProfile";

export interface TradeToEdit {
  order_id: string;
  type: "buy" | "sell";
  symbol: string;
  quantity: number;
  entry_price: number;
  margin: number;
  leverage: number;
  stop_loss?: number;
  take_profit?: number;
}

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
  const [selectedTradeToEdit, setSelectedTradeToEdit] = useState<TradeToEdit | null>(null);

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
    <div className="h-screen w-screen overflow-hidden bg-[#141D23] text-[#d1d4dc] font-sans text-[13px] flex flex-col">
      <PanelGroup direction="horizontal">
        {/* ============== LEFT PANEL — INSTRUMENTS ============== */}
        <Panel defaultSize={20} minSize={15} maxSize={30} className="flex flex-col bg-[#141D23] overflow-hidden">
          <InstrumentPanel
            prices={prices}
            selectedSymbol={symbol}
            onSymbolSelect={onSymbolChange}
          />
        </Panel>

        <PanelResizeHandle className="w-[2px] bg-[#3F474C] hover:bg-blue-500/50 transition-colors mx-[1px]" />

        {/* ============== CENTER PANEL — CHART + POSITIONS ============== */}
        <Panel defaultSize={60} minSize={40} className="flex flex-col bg-[#141D23] overflow-hidden">
          {/* Chart Toolbar */}
          <div className="flex items-center justify-between px-3 py-1 bg-[#141D23] border-b border-[#3F474C] min-h-[36px]">
            <div className="flex items-center gap-2">
              {/* Timeframe Buttons */}
              <div className="flex gap-[2px]">
                {INTERVAL_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                      interval === opt.value
                        ? "text-white bg-blue-600"
                        : "text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2c3044]"
                    }`}
                    onClick={() => onIntervalChange(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <UserProfile onLogout={onLogout} userEmail={userEmail} />
            </div>
          </div>

          {/* OHLC Header */}
          <div className="flex items-center gap-2 px-3 pt-1.5 pb-0.5 text-xs text-[#787b86]">
            <span className="font-semibold text-[#d1d4dc]">{symbolDisplay} · {interval} ·</span>
            {lastCandle && (
              <>
                <span className="text-[#4a4e5a]">
                  O<span className="text-[#d1d4dc] ml-0.5 font-mono">{lastCandle.open?.toFixed(3)}</span>
                </span>
                <span className="text-[#4a4e5a]">
                  H<span className="text-[#26a69a] ml-0.5 font-mono">{lastCandle.high?.toFixed(3)}</span>
                </span>
                <span className="text-[#4a4e5a]">
                  L<span className="text-[#ef5350] ml-0.5 font-mono">{lastCandle.low?.toFixed(3)}</span>
                </span>
                <span className="text-[#4a4e5a]">
                  C<span className="text-[#d1d4dc] ml-0.5 font-mono">{lastCandle.close?.toFixed(3)}</span>
                </span>
                <span className={`font-mono font-medium ${
                  lastCandle.close >= lastCandle.open ? "text-emerald-400" : "text-red-400"
                }`}>
                  {lastCandle.close >= lastCandle.open ? "+" : ""}
                  {(lastCandle.close - lastCandle.open).toFixed(3)}
                  {" "}
                  ({(((lastCandle.close - lastCandle.open) / lastCandle.open) * 100).toFixed(2)}%)
                </span>
              </>
            )}
          </div>

          <PanelGroup direction="vertical">
            {/* Chart Area */}
            <Panel defaultSize={70} minSize={30} className="flex overflow-hidden pb-1">
              {/* Chart Canvas */}
              <div className="chart-canvas-wrap" style={{ position: "relative", width: "100%", height: "100%" }}>
                <ChartComponent
                  data={candleData}
                  colors={{
                    backgroundColor: "#141D23",
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
            </Panel>

            <PanelResizeHandle className="h-[2px] bg-[#3F474C] hover:bg-blue-500/50 transition-colors my-[1px]" />

            {/* Positions Panel */}
            <Panel defaultSize={30} minSize={20} className="flex flex-col border-t border-[#3F474C] bg-[#141D23]">
              <PositionsPanel
                token={token}
                refreshTrigger={tradesRefreshTrigger}
                accountSummary={accountSummary}
                selectedTradeId={selectedTradeToEdit?.order_id || null}
                onTradeSelect={(trade) => setSelectedTradeToEdit(trade)}
              />
            </Panel>
          </PanelGroup>
        </Panel>

        <PanelResizeHandle className="w-[2px] bg-[#3F474C] hover:bg-blue-500/50 transition-colors mx-[1px]" />

        {/* ============== RIGHT PANEL — TRADING ============== */}
        <Panel defaultSize={20} minSize={15} maxSize={30} className="flex flex-col bg-[#141D23] overflow-hidden">
          <TradePanel
            symbol={symbol}
            symbolDisplay={symbolDisplay}
            bid={currentBid}
            ask={currentAsk}
            onTrade={handleTrade}
            tradeError={tradeError}
            tradeToEdit={selectedTradeToEdit}
            onCancelEdit={() => setSelectedTradeToEdit(null)}
          />
        </Panel>
      </PanelGroup>
    </div>
  );
};

export default TradingDashboard;
