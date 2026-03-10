import { useState, useMemo, useRef, useEffect } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { ChartComponent } from "./CandleSticks";
import InstrumentPanel from "./trading/InstrumentPanel";
import TradePanel from "./trading/TradePanel";
import PositionsPanel from "./trading/PositionsPanel";
import {
  Bell,
  Settings,
  LayoutGrid,
  User,
  Plus,
  ChevronDown,
  LogOut,
} from "lucide-react";
import DepositModal from "./trading/DepositModal";

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
  onDepositSuccess?: () => void;
  userEmail?: string;
  token: string | null;
}

const SYMBOL_DISPLAY: Record<string, string> = {
  BTCUSDT: "BTC/USDT",
  ETHUSDT: "ETH/USDT",
  SOLUSDT: "SOL/USDT",
};

const SYMBOL_LOGO: Record<string, string> = {
  BTCUSDT: "/bitcoin-btc-logo.svg",
  ETHUSDT: "/ethereum-eth-logo.svg",
  SOLUSDT: "/solana-sol-logo.svg",
};

// ETH logo is a tall diamond, needs contain + circle bg; BTC already has its own circle; SOL is wide
const SYMBOL_LOGO_STYLE: Record<string, React.CSSProperties> = {
  BTCUSDT: {
    width: 24,
    height: 24,
    borderRadius: "50%",
    objectFit: "contain",
  },
  ETHUSDT: {
    width: 24,
    height: 24,
    objectFit: "contain",
    filter: "brightness(0) invert(1)",
  },
  SOLUSDT: {
    width: 16,
    height: 16,
    objectFit: "contain",
  },
};

const SYMBOL_SHORT: Record<string, string> = {
  BTCUSDT: "BTC",
  ETHUSDT: "ETH",
  SOLUSDT: "SOL",
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
  onDepositSuccess,
  userEmail,
  token,
}: TradingDashboardProps) => {
  const [tradesRefreshTrigger, setTradesRefreshTrigger] = useState(0);
  const [selectedTradeToEdit, setSelectedTradeToEdit] =
    useState<TradeToEdit | null>(null);
  const [intervalDropdownOpen, setIntervalDropdownOpen] = useState(false);
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

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

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIntervalDropdownOpen(false);
      }
      if (
        profileRef.current &&
        !profileRef.current.contains(e.target as Node)
      ) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div
      className="overflow-hidden bg-[#141D23] text-[#d1d4dc] text-[14px] flex flex-col"
      style={{
        fontFamily: '"DM Sans", sans-serif',
        zoom: 1.15,
        width: `${100 / 1.15}vw`,
        height: `${100 / 1.15}vh`,
      }}
    >
      {/* ============== TOP NAVBAR ============== */}
      <div className="flex items-center justify-between px-3 bg-[#141D23] border-b border-[#3F474C] shrink-0 min-h-[56px]">
        {/* Left: Logo + Instrument Tabs */}
        <div className="flex items-center gap-0 h-full">
          <img src="/logo.svg" alt="Logo" className="h-8 w-8 mx-3 shrink-0" />
          <div className="flex items-center h-full">
            {Object.keys(SYMBOL_DISPLAY).map((sym) => {
              const isActive = sym === symbol;
              return (
                <div
                  key={sym}
                  onClick={() => onSymbolChange(sym)}
                  className={`relative flex items-center gap-2 px-5 py-2.5 cursor-pointer select-none transition-colors duration-200 ${
                    isActive ? "text-[#e5e7eb]" : "text-[#6b7280] hover:text-[#9ca3af]"
                  }`}
                >
                  <img
                    src={SYMBOL_LOGO[sym]}
                    alt={sym}
                    style={SYMBOL_LOGO_STYLE[sym] || { width: 24, height: 24, objectFit: "contain" }}
                  />
                  <span className="text-[13.5px] font-medium whitespace-nowrap">
                    {SYMBOL_SHORT[sym]}
                  </span>
                  {isActive && (
                    <div
                      className="absolute bottom-0 left-0 right-0 h-[3px] bg-white rounded-t-sm"
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Add instrument "+" button */}
          <div
            className="flex items-center justify-center w-8 h-8 ml-1 cursor-pointer text-white/60 hover:text-white transition-colors"
          >
            <Plus size={18} />
          </div>
        </div>

        {/* Right: Account Info + Actions */}
        <div className="flex items-center gap-4">
          {/* Demo + Standard + Balance — vertically stacked */}
          <div className="flex flex-col items-end leading-tight">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-[#00c853] bg-[#00c853]/10 px-1.5 py-0.5 rounded select-none">
                Demo
              </span>
              <span className="text-[12px] text-[#9ca3af] font-medium select-none">
                Standard
              </span>
            </div>
            <div className="flex items-center gap-1 cursor-pointer select-none hover:text-white transition-colors text-[#d1d4dc] mt-0.5">
              <span className="text-[13px] font-semibold">
                {accountSummary?.balance
                  ? Number(accountSummary.balance).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  : "10,000.00"}{" "}
                USD
              </span>
              <ChevronDown size={12} className="text-[#6b7280]" />
            </div>
          </div>

          {/* Divider */}
          <div className="w-px h-7 bg-[#3F474C]" />

          {/* Bell with notification dot */}
          <div className="relative cursor-pointer text-white/70 hover:text-white transition-colors">
            <Bell size={18} />
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />
          </div>

          {/* Settings gear */}
          <div className="cursor-pointer text-white/70 hover:text-white transition-colors">
            <Settings size={18} />
          </div>

          {/* Grid / apps icon */}
          <div className="cursor-pointer text-white/70 hover:text-white transition-colors">
            <LayoutGrid size={18} />
          </div>

          {/* User avatar + dropdown */}
          <div className="relative" ref={profileRef}>
            <div
              className="w-8 h-8 rounded-full bg-[#2a3640] flex items-center justify-center cursor-pointer hover:bg-[#354450] transition-colors"
              onClick={() => setProfileDropdownOpen((v) => !v)}
            >
              <User size={16} className="text-white/70" />
            </div>
            {profileDropdownOpen && (
              <div
                className="absolute top-full right-0 mt-2 z-50 border border-[#3F474C] rounded shadow-xl min-w-[200px] py-1"
                style={{ backgroundColor: "#141D23" }}
              >
                {/* Email */}
                <div className="px-4 py-2.5 border-b border-[#3F474C]">
                  <p className="text-[11px] text-[#6b7280] font-medium">Signed in as</p>
                  <p className="text-[13px] text-[#d1d4dc] font-medium truncate mt-0.5">
                    {userEmail || "user@example.com"}
                  </p>
                </div>
                {/* Logout */}
                <div
                  className="flex items-center gap-2.5 px-4 py-2.5 cursor-pointer text-[#ef5350] hover:bg-[#222E34] transition-colors"
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    onLogout();
                  }}
                >
                  <LogOut size={15} />
                  <span className="text-[13px] font-medium">Log out</span>
                </div>
              </div>
            )}
          </div>

          {/* Deposit button */}
          <div
            onClick={() => setDepositModalOpen(true)}
            className="px-4 py-1.5 bg-[#222E34] hover:bg-[#2a3640] text-[#d1d4dc] text-[13px] font-medium rounded transition-colors cursor-pointer select-none"
          >
            Deposit
          </div>
        </div>
      </div>

      {/* Deposit Modal */}
      <DepositModal
        isOpen={depositModalOpen}
        onClose={() => setDepositModalOpen(false)}
        token={token}
        onSuccess={() => onDepositSuccess?.()}
      />

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
            accountSummary={accountSummary}
          />
        </Panel>
      </PanelGroup>
    </div>
  );
};

export default TradingDashboard;
