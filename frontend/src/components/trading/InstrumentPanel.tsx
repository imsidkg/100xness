import React, { useState, useMemo } from "react";
import {
  Search,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Minus,
  GripVertical,
} from "lucide-react";

interface InstrumentData {
  symbol: string;
  displayName: string;
  icon?: string;
  bid: string;
  ask: string;
  direction: "up" | "down" | "neutral";
}

interface InstrumentPanelProps {
  prices: { [symbol: string]: { bid: string; ask: string } };
  selectedSymbol: string;
  onSymbolSelect: (symbol: string) => void;
}

const SYMBOL_META: Record<
  string,
  { displayName: string; icon: string }
> = {
  btcusdt: { displayName: "BTC", icon: "₿" },
  ethusdt: { displayName: "ETH", icon: "◆" },
  solusdt: { displayName: "SOL", icon: "◎" },
  xauusd: { displayName: "XAU/USD", icon: "🥇" },
  xagusd: { displayName: "XAG/USD", icon: "🥈" },
  eurusd: { displayName: "EUR/USD", icon: "€" },
  usdjpy: { displayName: "USD/JPY", icon: "¥" },
  usoil: { displayName: "USOIL", icon: "🛢" },
};

const InstrumentPanel: React.FC<InstrumentPanelProps> = ({
  prices,
  selectedSymbol,
  onSymbolSelect,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [prevPrices, setPrevPrices] = useState<
    Record<string, { bid: string; ask: string }>
  >({});

  // Track price direction
  const instrumentList: InstrumentData[] = useMemo(() => {
    const list = Object.entries(prices).map(([symbol, price]) => {
      const meta = SYMBOL_META[symbol.toLowerCase()] || {
        displayName: symbol.toUpperCase(),
        icon: "●",
      };
      const prev = prevPrices[symbol];
      let direction: "up" | "down" | "neutral" = "neutral";
      if (prev) {
        const prevBid = parseFloat(prev.bid);
        const currBid = parseFloat(price.bid);
        if (currBid > prevBid) direction = "up";
        else if (currBid < prevBid) direction = "down";
      }
      return {
        symbol,
        displayName: meta.displayName,
        icon: meta.icon,
        bid: price.bid,
        ask: price.ask,
        direction,
      };
    });
    setPrevPrices({ ...prices });
    return list;
  }, [prices]);

  const filtered = useMemo(() => {
    if (!searchQuery) return instrumentList;
    const q = searchQuery.toLowerCase();
    return instrumentList.filter(
      (i) =>
        i.symbol.toLowerCase().includes(q) ||
        i.displayName.toLowerCase().includes(q)
    );
  }, [instrumentList, searchQuery]);

  const getBidAskClass = (direction: "up" | "down" | "neutral") => {
    if (direction === "up") return "instrument-price-up";
    if (direction === "down") return "instrument-price-down";
    return "";
  };

  return (
    <div className="instrument-panel">
      {/* Header */}
      <div className="instrument-panel-header">
        <span className="instrument-panel-title">INSTRUMENTS</span>
        <div className="instrument-panel-actions">
          <button className="icon-btn-sm">⋮</button>
          <button className="icon-btn-sm">✕</button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="instrument-search-row">
        <div className="instrument-search-box">
          <Search size={14} className="instrument-search-icon" />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="instrument-search-input"
          />
        </div>
        <div className="instrument-filter-dropdown">
          <span>Favorites</span>
          <ChevronDown size={14} />
        </div>
      </div>

      {/* Column Headers */}
      <div className="instrument-col-headers">
        <span className="instrument-col-symbol">Symbol</span>
        <span className="instrument-col-signal">Signal</span>
        <span className="instrument-col-bid">Bid</span>
        <span className="instrument-col-ask">Ask</span>
      </div>

      {/* Instrument Rows */}
      <div className="instrument-list">
        {filtered.map((inst) => (
          <div
            key={inst.symbol}
            className={`instrument-row ${
              inst.symbol.toLowerCase() === selectedSymbol.toLowerCase()
                ? "instrument-row-selected"
                : ""
            }`}
            onClick={() => onSymbolSelect(inst.symbol)}
          >
            <div className="instrument-row-grip">
              <GripVertical size={12} className="text-gray-600" />
            </div>
            <div className="instrument-row-icon">{inst.icon}</div>
            <span className="instrument-row-name">{inst.displayName}</span>
            <div className="instrument-row-signal">
              {inst.direction === "up" && (
                <TrendingUp size={14} className="text-emerald-400" />
              )}
              {inst.direction === "down" && (
                <TrendingDown size={14} className="text-red-400" />
              )}
              {inst.direction === "neutral" && (
                <Minus size={14} className="text-gray-500" />
              )}
            </div>
            <span
              className={`instrument-row-bid ${getBidAskClass(inst.direction)}`}
            >
              {formatPrice(inst.bid)}
            </span>
            <span
              className={`instrument-row-ask ${getBidAskClass(inst.direction)}`}
            >
              {formatPrice(inst.ask)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

function formatPrice(price: string): string {
  const num = parseFloat(price);
  if (isNaN(num)) return price;
  if (num >= 10000) return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (num >= 100) return num.toFixed(3);
  if (num >= 1) return num.toFixed(5);
  return num.toFixed(6);
}

export default InstrumentPanel;
