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



  return (
    <div className="flex flex-col h-full bg-[#141D23]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#3F474C]">
        <span className="text-[11px] font-semibold tracking-wider text-[#787b86] uppercase">
          INSTRUMENTS
        </span>
        <div className="flex gap-1">
          <button className="p-1 text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2c3044] rounded transition-colors leading-none">⋮</button>
          <button className="p-1 text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2c3044] rounded transition-colors leading-none">✕</button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="flex-1 flex items-center gap-1.5 bg-[#1e222d] border border-[#3F474C] rounded-md px-2.5 py-1.5">
          <Search size={14} className="text-[#4a4e5a] shrink-0" />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-[#d1d4dc] text-xs w-full placeholder:text-[#4a4e5a]"
          />
        </div>
        <button className="flex items-center gap-1 bg-[#1e222d] border border-[#3F474C] rounded-md px-2.5 py-1.5 text-[#787b86] text-xs whitespace-nowrap hover:text-[#d1d4dc] transition-colors">
          <span>Favorites</span>
          <ChevronDown size={14} />
        </button>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-[1fr_50px_1fr_1fr] px-3 py-1.5 text-[11px] text-[#4a4e5a] capitalize border-b border-[#3F474C]">
        <span>Symbol</span>
        <span className="text-center">Signal</span>
        <span className="text-right">Bid</span>
        <span className="text-right">Ask</span>
      </div>

      {/* Instrument Rows */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[#2c3044]">
        {filtered.map((inst) => (
          <div
            key={inst.symbol}
            className={`grid grid-cols-[20px_24px_1fr_40px_1fr_1fr] items-center px-3 py-2.5 cursor-pointer transition-colors border-b border-[#3F474C]/30 ${
              inst.symbol.toLowerCase() === selectedSymbol.toLowerCase()
                ? "bg-[#232736]"
                : "hover:bg-[#2c3044]"
            }`}
            onClick={() => onSymbolSelect(inst.symbol)}
          >
            <div className="flex items-center">
              <GripVertical size={12} className="text-[#4a4e5a]" />
            </div>
            <div className="flex items-center justify-center text-base">{inst.icon}</div>
            <span className="font-semibold text-[13px] text-[#d1d4dc] pl-1">{inst.displayName}</span>
            <div className="flex items-center justify-center">
              {inst.direction === "up" && (
                <TrendingUp size={14} className="text-emerald-400" />
              )}
              {inst.direction === "down" && (
                <TrendingDown size={14} className="text-red-400" />
              )}
              {inst.direction === "neutral" && (
                <Minus size={14} className="text-[#4a4e5a]" />
              )}
            </div>
            <div className="text-right">
              <span
                className={`font-mono text-xs px-2 py-0.5 rounded transition-all duration-300 ${
                  inst.direction === "up" ? "bg-[#26a69a]/15 text-[#26a69a]" : 
                  inst.direction === "down" ? "bg-[#ef5350]/15 text-[#ef5350]" : 
                  "text-[#d1d4dc]"
                }`}
              >
                {formatPrice(inst.bid)}
              </span>
            </div>
            <div className="text-right">
              <span
                className={`font-mono text-xs px-2 py-0.5 rounded transition-all duration-300 ${
                  inst.direction === "up" ? "bg-[#26a69a]/15 text-[#26a69a]" : 
                  inst.direction === "down" ? "bg-[#ef5350]/15 text-[#ef5350]" : 
                  "text-[#d1d4dc]"
                }`}
              >
                {formatPrice(inst.ask)}
              </span>
            </div>
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
