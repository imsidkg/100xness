import React, { useState, useMemo } from "react";

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

const SYMBOL_META: Record<string, { displayName: string; icon: string }> = {
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

  return (
    <div className="flex flex-col h-full bg-[#141D23]">
      {/* Header */}
      <div className="flex items-center px-4 border-b border-[#3F474C] min-h-[40px]">
        <span className="text-[14px] font-normal text-[#787b86] uppercase">
          Market Data
        </span>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-3 px-4 py-2 text-[14px] text-[#787b86] border-b border-[#3F474C]">
        <span>Symbol</span>
        <span className="text-right">Bid</span>
        <span className="text-right">Ask</span>
      </div>

      {/* Instrument Rows */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[#ffffff]">
        {instrumentList.map((inst) => (
          <div
            key={inst.symbol}
            className={`grid grid-cols-3 items-center px-4 py-3 cursor-pointer transition-colors border-b border-[#3F474C]/30 ${
              inst.symbol.toLowerCase() === selectedSymbol.toLowerCase()
                ? "bg-[#1E2D38]"
                : "hover:bg-[#1A2730]"
            }`}
            onClick={() => onSymbolSelect(inst.symbol)}
          >
            <div className="flex items-center gap-2">
              <span className="text-base">{inst.icon}</span>
              <span className="font-semibold text-[16px] text-[#d1d4dc]">
                {inst.displayName}
              </span>
            </div>
            <div className="text-right">
              <span className="font-mono text-[16px] text-[#d1d4dc]">
                {formatPrice(inst.bid)}
              </span>
            </div>
            <div className="text-right">
              <span className="font-mono text-[16px] text-[#d1d4dc]">
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
  if (num >= 10000)
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  if (num >= 100) return num.toFixed(3);
  if (num >= 1) return num.toFixed(5);
  return num.toFixed(6);
}

export default InstrumentPanel;
