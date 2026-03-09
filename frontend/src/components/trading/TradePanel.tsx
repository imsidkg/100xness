import React, { useState, useMemo, useEffect } from "react";
import { CircleHelp } from "lucide-react";
import type { TradeToEdit } from "../TradingDashboard";

interface TradePanelProps {
  symbol: string;
  symbolDisplay: string;
  bid: string;
  ask: string;
  onTrade: (type: "buy" | "sell", data: any) => Promise<void>;
  tradeError: string | null;
  tradeToEdit?: TradeToEdit | null;
  onCancelEdit?: () => void;
}

const TradePanel: React.FC<TradePanelProps> = ({
  symbol,
  symbolDisplay,
  bid,
  ask,
  onTrade,
  tradeError,
  tradeToEdit,
  onCancelEdit,
}) => {
  const [orderTab, setOrderTab] = useState<"market" | "pending">("market");
  const [volume, setVolume] = useState(0.2);
  const [takeProfit, setTakeProfit] = useState<number | undefined>(undefined);
  const [stopLoss, setStopLoss] = useState<number | undefined>(undefined);
  const [tpMode, setTpMode] = useState<"price" | "pips">("price");
  const [slMode, setSlMode] = useState<"price" | "pips">("price");
  const [limitPrice, setLimitPrice] = useState<number | undefined>(undefined);
  const [leverage, setLeverage] = useState<number>(1);
  const [margin, setMargin] = useState<number | undefined>(undefined);

  // Modify form state
  const [editTp, setEditTp] = useState<number | undefined>(undefined);
  const [editSl, setEditSl] = useState<number | undefined>(undefined);

  // When tradeToEdit changes, populate edit fields
  useEffect(() => {
    if (tradeToEdit) {
      setEditTp(tradeToEdit.take_profit);
      setEditSl(tradeToEdit.stop_loss);
    }
  }, [tradeToEdit]);

  const bidNum = parseFloat(bid) || 0;
  const askNum = parseFloat(ask) || 0;
  const spread = useMemo(() => {
    const s = Math.abs(askNum - bidNum);
    return s.toFixed(2);
  }, [bidNum, askNum]);

  // Seller / Buyer sentiment bar
  const sellPct = useMemo(() => {
    if (!bidNum || !askNum) return 50;
    const ratio = bidNum / (bidNum + askNum);
    return Math.round(ratio * 100);
  }, [bidNum, askNum]);
  const buyPct = 100 - sellPct;

  const handleVolumeStep = (delta: number) => {
    setVolume((prev: number) => {
      const next = Math.round((prev + delta) * 100) / 100;
      return Math.max(0.01, next);
    });
  };

  const handleTrade = (type: "buy" | "sell") => {
    onTrade(type, {
      symbol,
      quantity: volume,
      leverage,
      orderType: orderTab === "market" ? "market" : "limit",
      limitPrice: orderTab === "pending" ? limitPrice : undefined,
      stopLoss,
      takeProfit,
      margin
    });
  };

  const handleSaveModify = () => {
    if (!tradeToEdit) return;
    // TODO: Call API to modify the trade's TP/SL
    // For now, just close the edit form
    onCancelEdit?.();
  };

  const formatBigPrice = (price: number) => {
    const str = price.toFixed(3);
    const parts = str.split(".");
    const intPart = parts[0];
    const decPart = parts[1] || "000";
    const mainDec = decPart.slice(0, -1);
    const lastDigit = decPart.slice(-1);
    return { intPart, mainDec, lastDigit };
  };

  const bidFormatted = formatBigPrice(bidNum);
  const askFormatted = formatBigPrice(askNum);

  const fmt = (v: number, d = 4) =>
    new Intl.NumberFormat("en-US", {
      minimumFractionDigits: d,
      maximumFractionDigits: d,
    }).format(v);

  // ============== MODIFY ORDER MODE ==============
  if (tradeToEdit) {
    return (
      <div className="flex flex-col h-full bg-[#141D23]">
        {/* Header */}
        <div className="flex items-start justify-between px-4 py-3 border-b border-[#3F474C]">
          <div>
            <div className="text-white font-medium text-sm">Modify Order</div>
            <div className="text-[#787b86] text-xs mt-0.5">
              #{tradeToEdit.order_id.slice(0, 8)}
            </div>
          </div>
          <button className="p-1 text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2c3044] rounded transition-colors" onClick={onCancelEdit}>✕</button>
        </div>

        {/* Trade Info Grid */}
        <div className="grid grid-cols-2 gap-3 p-4 border-b border-[#3F474C]/30">
          <div className="flex flex-col gap-1">
            <span className="text-[#787b86] text-[11px] uppercase tracking-wide">Symbol</span>
            <span className="text-[#d1d4dc] font-medium font-mono text-sm">{tradeToEdit.symbol}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[#787b86] text-[11px] uppercase tracking-wide">Type</span>
            <span className={`font-medium font-mono text-sm ${tradeToEdit.type === "buy" ? "text-emerald-400" : "text-red-400"}`}>
              {tradeToEdit.type.toUpperCase()}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[#787b86] text-[11px] uppercase tracking-wide">Entry Price</span>
            <span className="text-[#d1d4dc] font-mono text-sm">{fmt(tradeToEdit.entry_price)}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[#787b86] text-[11px] uppercase tracking-wide">Volume</span>
            <span className="text-[#d1d4dc] font-mono text-sm">{tradeToEdit.quantity}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[#787b86] text-[11px] uppercase tracking-wide">Leverage</span>
            <span className="text-[#d1d4dc] font-mono text-sm">{tradeToEdit.leverage}x</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[#787b86] text-[11px] uppercase tracking-wide">Margin</span>
            <span className="text-[#d1d4dc] font-mono text-sm">${fmt(tradeToEdit.margin, 2)}</span>
          </div>
        </div>

        {/* TP / SL Edit Fields */}
        <div className="p-4 flex flex-col gap-4 flex-1">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              <label className="text-[#d1d4dc] text-[13px] font-medium">Take Profit</label>
              <CircleHelp size={14} className="text-[#4a4e5a]" />
            </div>
            <div className="flex items-center bg-[#1e222d] border border-[#3F474C] rounded transition-colors focus-within:border-[#2962ff]">
              <input
                type="text"
                className="flex-1 bg-transparent border-none outline-none text-[#d1d4dc] px-3 py-2 text-[13px] placeholder:text-[#4a4e5a] font-mono"
                placeholder="Not set"
                value={editTp ?? ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditTp(e.target.value ? parseFloat(e.target.value) : undefined)
                }
              />
              <button
                className="w-8 h-[34px] flex items-center justify-center text-[#787b86] border-l border-[#3F474C] hover:bg-[#2c3044] hover:text-[#d1d4dc] transition-colors"
                onClick={() =>
                  setEditTp((prev: number | undefined) => (prev ? prev - 1 : askNum + 10))
                }
              >
                −
              </button>
              <button
                className="w-8 h-[34px] flex items-center justify-center text-[#787b86] border-l border-[#3F474C] hover:bg-[#2c3044] hover:text-[#d1d4dc] transition-colors rounded-r"
                onClick={() =>
                  setEditTp((prev: number | undefined) => (prev ? prev + 1 : askNum + 10))
                }
              >
                +
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              <label className="text-[#d1d4dc] text-[13px] font-medium">Stop Loss</label>
              <CircleHelp size={14} className="text-[#4a4e5a]" />
            </div>
            <div className="flex items-center bg-[#1e222d] border border-[#3F474C] rounded transition-colors focus-within:border-[#2962ff]">
              <input
                type="text"
                className="flex-1 bg-transparent border-none outline-none text-[#d1d4dc] px-3 py-2 text-[13px] placeholder:text-[#4a4e5a] font-mono"
                placeholder="Not set"
                value={editSl ?? ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditSl(e.target.value ? parseFloat(e.target.value) : undefined)
                }
              />
              <button
                className="w-8 h-[34px] flex items-center justify-center text-[#787b86] border-l border-[#3F474C] hover:bg-[#2c3044] hover:text-[#d1d4dc] transition-colors"
                onClick={() =>
                  setEditSl((prev: number | undefined) => (prev ? prev - 1 : bidNum - 10))
                }
              >
                −
              </button>
              <button
                className="w-8 h-[34px] flex items-center justify-center text-[#787b86] border-l border-[#3F474C] hover:bg-[#2c3044] hover:text-[#d1d4dc] transition-colors rounded-r"
                onClick={() =>
                  setEditSl((prev: number | undefined) => (prev ? prev + 1 : bidNum - 10))
                }
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 p-4 pt-2">
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded transition-colors text-sm" onClick={handleSaveModify}>
            Save Changes
          </button>
          <button className="bg-[#2c3044] hover:bg-[#363a45] text-[#d1d4dc] font-semibold py-2.5 px-4 rounded transition-colors text-sm" onClick={onCancelEdit}>
            Cancel
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 mt-auto border-t border-[#3F474C] text-xs text-[#787b86]">
          <div className="font-semibold tracking-wider">100x</div>
          <div>4.3.1</div>
        </div>
      </div>
    );
  }

  // ============== REGULAR NEW ORDER MODE ==============
  return (
    <div className="flex flex-col h-full bg-[#141D23] overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[#2c3044]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#3F474C]">
        <div className="flex items-center gap-2">
          <span className="text-lg">🥇</span>
          <span className="text-white font-semibold">{symbolDisplay}</span>
        </div>
        <button className="p-1 text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2c3044] rounded transition-colors">✕</button>
      </div>

      {/* Form Type */}
      <div className="px-4 py-3">
        <select className="w-full bg-[#1e222d] border border-[#3F474C] text-[#d1d4dc] rounded px-3 py-2 text-sm outline-none focus:border-[#2962ff] transition-colors appearance-none cursor-pointer">
          <option>Regular form</option>
        </select>
      </div>

      {/* Sell / Buy Boxes */}
      <div className="flex items-center gap-2 px-4">
        <button
          className="flex-1 flex flex-col items-center justify-center p-3 rounded bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors border border-red-500/20"
          onClick={() => handleTrade("sell")}
        >
          <span className="text-xs font-semibold mb-1 uppercase tracking-wider">Sell</span>
          <span className="font-mono flex items-baseline">
            <span className="text-lg">{bidFormatted.intPart}.</span>
            <span className="text-2xl font-bold">{bidFormatted.mainDec}</span>
            <sup className="text-sm -top-2 relative">{bidFormatted.lastDigit}</sup>
          </span>
        </button>

        <div className="flex flex-col items-center justify-center px-1">
          <span className="text-[10px] text-[#787b86] rounded bg-[#1e222d] border border-[#3F474C] px-1.5 py-0.5 font-mono whitespace-nowrap">{spread} USD</span>
        </div>

        <button
          className="flex-1 flex flex-col items-center justify-center p-3 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 transition-colors border border-blue-500/20"
          onClick={() => handleTrade("buy")}
        >
          <span className="text-xs font-semibold mb-1 uppercase tracking-wider">Buy</span>
          <span className="font-mono flex items-baseline">
            <span className="text-lg">{askFormatted.intPart}.</span>
            <span className="text-2xl font-bold">{askFormatted.mainDec}</span>
            <sup className="text-sm -top-2 relative">{askFormatted.lastDigit}</sup>
          </span>
        </button>
      </div>

      {/* Sentiment Bar */}
      <div className="flex items-center gap-2 px-4 mt-4">
        <span className="text-[10px] font-mono text-red-400 w-8 text-right">{sellPct}%</span>
        <div className="flex-1 h-1 bg-[#2c3044] rounded-full overflow-hidden flex">
          <div
            className="h-full bg-red-500"
            style={{ width: `${sellPct}%` }}
          />
          <div
            className="h-full bg-blue-500"
            style={{ width: `${buyPct}%` }}
          />
        </div>
        <span className="text-[10px] font-mono text-blue-400 w-8">{buyPct}%</span>
      </div>

      {/* Order Type Tabs */}
      <div className="flex gap-4 px-4 mt-6 border-b border-[#3F474C]">
        <button
          className={`pb-2 text-sm font-medium transition-colors border-b-2 ${orderTab === "market" ? "text-white border-white" : "text-[#787b86] border-transparent hover:text-[#d1d4dc]"}`}
          onClick={() => setOrderTab("market")}
        >
          Market
        </button>
        <button
          className={`pb-2 text-sm font-medium transition-colors border-b-2 ${orderTab === "pending" ? "text-white border-white" : "text-[#787b86] border-transparent hover:text-[#d1d4dc]"}`}
          onClick={() => setOrderTab("pending")}
        >
          Pending
        </button>
      </div>

      <div className="flex flex-col gap-4 p-4 flex-1">
        {orderTab === "pending" && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[#d1d4dc] text-[13px] font-medium">Limit Price</label>
            <div className="flex items-center bg-[#1e222d] border border-[#3F474C] rounded transition-colors focus-within:border-[#2962ff]">
              <input
                type="number"
                className="flex-1 bg-transparent border-none outline-none text-[#d1d4dc] px-3 py-2 text-[13px] placeholder:text-[#4a4e5a] font-mono"
                value={limitPrice ?? ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLimitPrice(e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="0.00"
                step="0.01"
              />
            </div>
          </div>
        )}

        {/* Volume */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[#d1d4dc] text-[13px] font-medium">Volume</label>
          <div className="flex items-center bg-[#1e222d] border border-[#3F474C] rounded transition-colors focus-within:border-[#2962ff]">
            <input
              type="number"
              className="flex-1 bg-transparent border-none outline-none text-[#d1d4dc] px-3 py-2 text-[13px] font-mono"
              value={volume}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVolume(parseFloat(e.target.value) || 0.01)}
              step="0.01"
              min="0.01"
            />
            <span className="text-[#787b86] text-xs px-2 select-none border-x border-[#3F474C] py-2">Lots</span>
            <button className="w-8 h-[34px] flex items-center justify-center text-[#787b86] hover:bg-[#2c3044] hover:text-[#d1d4dc] transition-colors" onClick={() => handleVolumeStep(-0.01)}>
              −
            </button>
            <button className="w-8 h-[34px] flex items-center justify-center text-[#787b86] border-l border-[#3F474C] hover:bg-[#2c3044] hover:text-[#d1d4dc] transition-colors rounded-r" onClick={() => handleVolumeStep(0.01)}>
              +
            </button>
          </div>
        </div>

        {/* Take Profit */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <label className="text-[#d1d4dc] text-[13px] font-medium">Take Profit</label>
            <CircleHelp size={14} className="text-[#4a4e5a]" />
          </div>
          <div className="flex items-center bg-[#1e222d] border border-[#3F474C] rounded transition-colors focus-within:border-[#2962ff]">
            <input
              type="text"
              className="flex-1 bg-transparent border-none outline-none text-[#d1d4dc] px-3 py-2 text-[13px] placeholder:text-[#4a4e5a] font-mono"
              placeholder="Not set"
              value={takeProfit ?? ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setTakeProfit(e.target.value ? parseFloat(e.target.value) : undefined)
              }
            />
            <button
              className="text-[#787b86] text-xs px-2 select-none border-x border-[#3F474C] py-2 hover:text-[#d1d4dc] transition-colors"
              onClick={() => setTpMode(tpMode === "price" ? "pips" : "price")}
            >
              {tpMode === "price" ? "Price" : "Pips"} ▾
            </button>
            <button
              className="w-8 h-[34px] flex items-center justify-center text-[#787b86] border-l border-[#3F474C] hover:bg-[#2c3044] hover:text-[#d1d4dc] transition-colors"
              onClick={() =>
                setTakeProfit((prev: number | undefined) => (prev ? prev - 1 : askNum + 10))
              }
            >
              −
            </button>
            <button
              className="w-8 h-[34px] flex items-center justify-center text-[#787b86] border-l border-[#3F474C] hover:bg-[#2c3044] hover:text-[#d1d4dc] transition-colors rounded-r"
              onClick={() =>
                setTakeProfit((prev: number | undefined) => (prev ? prev + 1 : askNum + 10))
              }
            >
              +
            </button>
          </div>
        </div>

        {/* Leverage */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[#d1d4dc] text-[13px] font-medium">Leverage</label>
          <div className="flex items-center bg-[#1e222d] border border-[#3F474C] rounded transition-colors focus-within:border-[#2962ff]">
            <input
              type="number"
              className="flex-1 bg-transparent border-none outline-none text-[#d1d4dc] px-3 py-2 text-[13px] font-mono"
              value={leverage}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLeverage(parseFloat(e.target.value) || 1)}
              min="1"
            />
            <span className="text-[#787b86] text-xs px-3 select-none border-l border-[#3F474C] py-2">x</span>
          </div>
        </div>

        {/* Margin */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <label className="text-[#d1d4dc] text-[13px] font-medium">Margin (Optional)</label>
          </div>
          <div className="flex items-center bg-[#1e222d] border border-[#3F474C] rounded transition-colors focus-within:border-[#2962ff]">
            <input
              type="number"
              className="flex-1 bg-transparent border-none outline-none text-[#d1d4dc] px-3 py-2 text-[13px] placeholder:text-[#4a4e5a] font-mono"
              value={margin ?? ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMargin(e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="Not set"
              step="0.01"
            />
          </div>
        </div>

        {/* Stop Loss */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <label className="text-[#d1d4dc] text-[13px] font-medium">Stop Loss</label>
            <CircleHelp size={14} className="text-[#4a4e5a]" />
          </div>
          <div className="flex items-center bg-[#1e222d] border border-[#3F474C] rounded transition-colors focus-within:border-[#2962ff]">
            <input
              type="text"
              className="flex-1 bg-transparent border-none outline-none text-[#d1d4dc] px-3 py-2 text-[13px] placeholder:text-[#4a4e5a] font-mono"
              placeholder="Not set"
              value={stopLoss ?? ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setStopLoss(e.target.value ? parseFloat(e.target.value) : undefined)
              }
            />
            <button
              className="text-[#787b86] text-xs px-2 select-none border-x border-[#3F474C] py-2 hover:text-[#d1d4dc] transition-colors"
              onClick={() => setSlMode(slMode === "price" ? "pips" : "price")}
            >
              {slMode === "price" ? "Price" : "Pips"} ▾
            </button>
            <button
              className="w-8 h-[34px] flex items-center justify-center text-[#787b86] border-l border-[#3F474C] hover:bg-[#2c3044] hover:text-[#d1d4dc] transition-colors"
              onClick={() =>
                setStopLoss((prev: number | undefined) => (prev ? prev - 1 : bidNum - 10))
              }
            >
              −
            </button>
            <button
              className="w-8 h-[34px] flex items-center justify-center text-[#787b86] border-l border-[#3F474C] hover:bg-[#2c3044] hover:text-[#d1d4dc] transition-colors rounded-r"
              onClick={() =>
                setStopLoss((prev: number | undefined) => (prev ? prev + 1 : bidNum - 10))
              }
            >
              +
            </button>
          </div>
        </div>

        {/* Error */}
        {tradeError && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-3 py-2 rounded text-[13px] mt-2">
            {tradeError}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 mt-auto border-t border-[#3F474C] text-xs text-[#787b86] mt-4">
        <div className="font-semibold tracking-wider">100x</div>
        <div>4.3.1</div>
      </div>
    </div>
  );
};

export default TradePanel;
