import React, { useRef, useState, useEffect } from "react";

interface InstrumentPanelProps {
  prices: { [symbol: string]: { bid: string; ask: string } };
  selectedSymbol: string;
  onSymbolSelect: (symbol: string) => void;
}

const SYMBOL_META: Record<string, { displayName: string; icon: string; logo?: string; logoStyle?: React.CSSProperties }> = {
  btcusdt: {
    displayName: "BTC",
    icon: "₿",
    logo: "/bitcoin-btc-logo.svg",
    logoStyle: { width: 20, height: 20, borderRadius: "50%", objectFit: "contain" },
  },
  ethusdt: {
    displayName: "ETH",
    icon: "◆",
    logo: "/ethereum-eth-logo.svg",
    logoStyle: { width: 20, height: 20, objectFit: "contain", filter: "brightness(0) invert(1)" },
  },
  solusdt: {
    displayName: "SOL",
    icon: "◎",
    logo: "/solana-sol-logo.svg",
    logoStyle: { width: 14, height: 14, objectFit: "contain" },
  },
  xauusd: { displayName: "XAU/USD", icon: "🥇" },
  xagusd: { displayName: "XAG/USD", icon: "🥈" },
  eurusd: { displayName: "EUR/USD", icon: "€" },
  usdjpy: { displayName: "USD/JPY", icon: "¥" },
  usoil: { displayName: "USOIL", icon: "🛢" },
};

const GREEN = "#26a69a";
const RED = "#ef5350";
const NEUTRAL = "#1E2830";

/** Single price cell that tracks its own value and flashes green/red */
const PriceCell: React.FC<{ value: string }> = ({ value }) => {
  const prevVal = useRef<number | null>(null);
  const [bg, setBg] = useState(NEUTRAL);

  useEffect(() => {
    const numVal = parseFloat(value) || 0;
    if (prevVal.current !== null) {
      if (numVal > prevVal.current) {
        setBg(GREEN);
      } else if (numVal < prevVal.current) {
        setBg(RED);
      }
    }
    prevVal.current = numVal;
  }, [value]);

  return (
    <span
      style={{
        backgroundColor: bg,
        transition: "background-color 0.2s ease",
        fontFamily: '"JetBrains Mono", "SF Mono", "Cascadia Code", monospace',
        fontSize: "15px",
        color: "#fff",
        display: "inline-block",
        width: "100%",
        padding: "6px 8px",
        borderRadius: "4px",
        textAlign: "right",
      }}
    >
      {formatPrice(value)}
    </span>
  );
};

const InstrumentPanel: React.FC<InstrumentPanelProps> = ({
  prices,
  selectedSymbol,
  onSymbolSelect,
}) => {
  const symbols = Object.entries(prices);

  return (
    <div className="flex flex-col h-full bg-[#141D23]">
      {/* Header */}
      <div className="flex items-center px-4 border-b border-[#3F474C] min-h-[40px]">
        <span className="text-[14px] font-normal text-[#ffffff] uppercase">
          Market Data
        </span>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-[1fr_1fr_1fr] px-3 py-2 text-[14px] text-[#787b86] border-b border-[#3F474C]">
        <span>Symbol</span>
        <span className="text-right">Bid</span>
        <span className="text-right">Ask</span>
      </div>

      {/* Instrument Rows */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[#ffffff]">
        {symbols.map(([symbol, price]) => {
          const meta = SYMBOL_META[symbol.toLowerCase()] || {
            displayName: symbol.toUpperCase(),
            icon: "●",
          };

          return (
            <div
              key={symbol}
              className={`grid grid-cols-[1fr_1fr_1fr] items-center px-3 py-2 cursor-pointer border-b border-[#3F474C]/30 ${
                symbol.toLowerCase() === selectedSymbol.toLowerCase()
                  ? "bg-[#1E2D38]"
                  : "hover:bg-[#1A2730]"
              }`}
              onClick={() => onSymbolSelect(symbol)}
            >
              <div className="flex items-center gap-2">
                {meta.logo ? (
                  <img
                    src={meta.logo}
                    alt={meta.displayName}
                    style={meta.logoStyle || { width: 20, height: 20, objectFit: "contain" }}
                  />
                ) : (
                  <span className="text-base">{meta.icon}</span>
                )}
                <span className="font-semibold text-[16px] text-[#d1d4dc]">
                  {meta.displayName}
                </span>
              </div>
              <div className="text-right pl-1">
                <PriceCell value={price.bid} />
              </div>
              <div className="text-right pl-1">
                <PriceCell value={price.ask} />
              </div>
            </div>
          );
        })}
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
