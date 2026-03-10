import { useState, useMemo, useRef, useEffect } from "react";
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
  { value: "1m", label: "1 minute" },
  { value: "5m", label: "5 minutes" },
  { value: "10m", label: "10 minutes" },
  { value: "1h", label: "1 hour" },
];

const INTERVAL_SHORT: Record<string, string> = {
  "1m": "1m",
  "5m": "5m",
  "10m": "10m",
  "1h": "1h",
};

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
  const [selectedTradeToEdit, setSelectedTradeToEdit] =
    useState<TradeToEdit | null>(null);
  const [intervalDropdownOpen, setIntervalDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
  const lastCandle =
    candleData.length > 0 ? candleData[candleData.length - 1] : null;

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIntervalDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div
      className="h-screen w-screen overflow-hidden bg-[#141D23] text-[#d1d4dc] text-[14px] flex flex-col"
      style={{ fontFamily: '"aktiv-grotesk", sans-serif' }}
    >
      {/* ============== TOP NAVBAR ============== */}
      <div className="flex items-center justify-between px-5 py-2 bg-[#141D23] border-b border-[#3F474C] shrink-0">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="Logo" className="h-10 w-10 m-2" />
          {/* <span className="text-white font-semibold text-[16px] tracking-wide">Exness</span> */}
        </div>
        <div className="flex items-center gap-3">
          <UserProfile onLogout={onLogout} userEmail={userEmail} />
        </div>
      </div>

      <PanelGroup direction="horizontal">
        {/* ============== LEFT PANEL — INSTRUMENTS ============== */}
        <Panel
          defaultSize={20}
          minSize={15}
          maxSize={30}
          className="flex flex-col bg-[#141D23] overflow-hidden"
        >
          <InstrumentPanel
            prices={prices}
            selectedSymbol={symbol}
            onSymbolSelect={onSymbolChange}
          />
        </Panel>

        <PanelResizeHandle className="w-[4px] bg-[#3F474C] hover:bg-blue-500/50 transition-colors" />

        {/* ============== CENTER PANEL — CHART + POSITIONS ============== */}
        <Panel
          defaultSize={60}
          minSize={40}
          className="flex flex-col bg-[#141D23] overflow-hidden"
        >
          {/* Chart Toolbar */}
          <div className="flex items-center justify-between px-3 py-1 bg-[#141D23] border-b border-[#3F474C] min-h-[36px]">
            <div className="flex items-center gap-2">
              {/* Timeframe Dropdown */}
              <div className="relative flex items-center" ref={dropdownRef}>
                <span
                  className="text-[14px] font-normal text-[#d1d4dc] cursor-pointer hover:text-[#f0b90b] transition-colors select-none"
                  onClick={() => setIntervalDropdownOpen((v) => !v)}
                >
                  {INTERVAL_SHORT[interval] || interval}
                </span>
                <span className="text-[#3F474C] text-sm ml-2 select-none">
                  |
                </span>
                {intervalDropdownOpen && (
                  <div
                    className="absolute top-full left-0 mt-1 z-50 border border-[#3F474C] rounded shadow-xl min-w-[140px] py-1"
                    style={{ backgroundColor: "#141D23" }}
                  >
                    {INTERVAL_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        className={`w-full text-left px-3 py-1.5 text-[14px] transition-colors border-none hover:bg-[#222E34] ${
                          interval === opt.value
                            ? "text-white"
                            : "text-[#d1d4dc]"
                        }`}
                        style={{
                          backgroundColor:
                            interval === opt.value ? "#222E34" : "#141D23",
                          borderRadius: 0,
                          padding: "6px 12px",
                        }}
                        onClick={() => {
                          onIntervalChange(opt.value);
                          setIntervalDropdownOpen(false);
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
            </div>
          </div>

          {/* OHLC Header */}
          <div className="flex items-center gap-2 px-3 pt-1.5 pb-0.5 text-[13px] text-[#787b86]">
            <span className="font-semibold text-[#d1d4dc]">
              {symbolDisplay} · {INTERVAL_SHORT[interval] || interval} ·
            </span>
            {lastCandle && (
              <>
                <span className="text-[#4a4e5a]">
                  O
                  <span className="text-[#d1d4dc] ml-0.5 font-mono">
                    {lastCandle.open?.toFixed(3)}
                  </span>
                </span>
                <span className="text-[#4a4e5a]">
                  H
                  <span className="text-[#26a69a] ml-0.5 font-mono">
                    {lastCandle.high?.toFixed(3)}
                  </span>
                </span>
                <span className="text-[#4a4e5a]">
                  L
                  <span className="text-[#ef5350] ml-0.5 font-mono">
                    {lastCandle.low?.toFixed(3)}
                  </span>
                </span>
                <span className="text-[#4a4e5a]">
                  C
                  <span className="text-[#d1d4dc] ml-0.5 font-mono">
                    {lastCandle.close?.toFixed(3)}
                  </span>
                </span>
                <span
                  className={`font-mono font-medium ${
                    lastCandle.close >= lastCandle.open
                      ? "text-emerald-400"
                      : "text-red-400"
                  }`}
                >
                  {lastCandle.close >= lastCandle.open ? "+" : ""}
                  {(lastCandle.close - lastCandle.open).toFixed(3)} (
                  {(
                    ((lastCandle.close - lastCandle.open) / lastCandle.open) *
                    100
                  ).toFixed(2)}
                  %)
                </span>
              </>
            )}
          </div>

          <PanelGroup direction="vertical">
            {/* Chart Area */}
            <Panel
              defaultSize={70}
              minSize={30}
              className="flex overflow-hidden pb-1"
            >
              {/* Chart Canvas */}
              <div
                className="chart-canvas-wrap"
                style={{ position: "relative", width: "100%", height: "100%" }}
              >
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

            <PanelResizeHandle className="h-[4px] bg-[#3F474C] hover:bg-blue-500/50 transition-colors" />

            {/* Positions Panel */}
            <Panel
              defaultSize={30}
              minSize={20}
              className="flex flex-col border-t border-[#3F474C] bg-[#141D23]"
            >
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

        <PanelResizeHandle className="w-[4px] bg-[#3F474C] hover:bg-blue-500/50 transition-colors" />

        {/* ============== RIGHT PANEL — TRADING ============== */}
        <Panel
          defaultSize={20}
          minSize={15}
          maxSize={30}
          className="flex flex-col bg-[#141D23] overflow-hidden"
        >
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
