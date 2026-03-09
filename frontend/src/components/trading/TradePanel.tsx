import React, { useState, useMemo } from "react";
import { CircleHelp } from "lucide-react";

interface TradePanelProps {
  symbol: string;
  symbolDisplay: string;
  bid: string;
  ask: string;
  onTrade: (type: "buy" | "sell", data: any) => Promise<void>;
  tradeError: string | null;
}

const TradePanel: React.FC<TradePanelProps> = ({
  symbol,
  symbolDisplay,
  bid,
  ask,
  onTrade,
  tradeError,
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

  const bidNum = parseFloat(bid) || 0;
  const askNum = parseFloat(ask) || 0;
  const spread = useMemo(() => {
    const s = Math.abs(askNum - bidNum);
    return s.toFixed(2);
  }, [bidNum, askNum]);

  // Seller / Buyer sentiment bar (mock percentages based on spread ratio)
  const sellPct = useMemo(() => {
    if (!bidNum || !askNum) return 50;
    // Just visual, not real depth. Use ratio for feel
    const ratio = bidNum / (bidNum + askNum);
    return Math.round(ratio * 100);
  }, [bidNum, askNum]);
  const buyPct = 100 - sellPct;

  const handleVolumeStep = (delta: number) => {
    setVolume((prev) => {
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

  const formatBigPrice = (price: number) => {
    const str = price.toFixed(3);
    const parts = str.split(".");
    const intPart = parts[0];
    const decPart = parts[1] || "000";
    // Last digit is the superscript
    const mainDec = decPart.slice(0, -1);
    const lastDigit = decPart.slice(-1);
    return { intPart, mainDec, lastDigit };
  };

  const bidFormatted = formatBigPrice(bidNum);
  const askFormatted = formatBigPrice(askNum);

  return (
    <div className="trade-panel">
      {/* Header */}
      <div className="trade-panel-header">
        <div className="trade-panel-symbol">
          <span className="trade-panel-symbol-icon">🥇</span>
          <span className="trade-panel-symbol-name">{symbolDisplay}</span>
        </div>
        <button className="icon-btn-sm">✕</button>
      </div>

      {/* Form Type */}
      <div className="trade-panel-form-type">
        <select className="trade-panel-form-select">
          <option>Regular form</option>
        </select>
      </div>

      {/* Sell / Buy Boxes */}
      <div className="trade-panel-action-row">
        <button
          className="trade-btn-sell"
          onClick={() => handleTrade("sell")}
        >
          <span className="trade-btn-label">Sell</span>
          <span className="trade-btn-price">
            {bidFormatted.intPart}.
            <span className="trade-btn-price-big">{bidFormatted.mainDec}</span>
            <sup className="trade-btn-price-sup">{bidFormatted.lastDigit}</sup>
          </span>
        </button>

        <div className="trade-spread-badge">
          <span className="trade-spread-value">{spread} USD</span>
        </div>

        <button
          className="trade-btn-buy"
          onClick={() => handleTrade("buy")}
        >
          <span className="trade-btn-label">Buy</span>
          <span className="trade-btn-price">
            {askFormatted.intPart}.
            <span className="trade-btn-price-big">{askFormatted.mainDec}</span>
            <sup className="trade-btn-price-sup">{askFormatted.lastDigit}</sup>
          </span>
        </button>
      </div>

      {/* Sentiment Bar */}
      <div className="trade-sentiment-bar">
        <span className="trade-sentiment-sell">{sellPct}%</span>
        <div className="trade-sentiment-track">
          <div
            className="trade-sentiment-fill-sell"
            style={{ width: `${sellPct}%` }}
          />
          <div
            className="trade-sentiment-fill-buy"
            style={{ width: `${buyPct}%` }}
          />
        </div>
        <span className="trade-sentiment-buy">{buyPct}%</span>
      </div>

      {/* Order Type Tabs */}
      <div className="trade-order-tabs">
        <button
          className={`trade-order-tab ${orderTab === "market" ? "trade-order-tab-active" : ""}`}
          onClick={() => setOrderTab("market")}
        >
          Market
        </button>
        <button
          className={`trade-order-tab ${orderTab === "pending" ? "trade-order-tab-active" : ""}`}
          onClick={() => setOrderTab("pending")}
        >
          Pending
        </button>
      </div>

      {orderTab === "pending" && (
        <div className="trade-field-group">
          <label className="trade-field-label">Limit Price</label>
          <div className="trade-field-row">
            <input
              type="number"
              className="trade-field-input"
              value={limitPrice ?? ""}
              onChange={(e) => setLimitPrice(e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="0.00"
              step="0.01"
            />
          </div>
        </div>
      )}

      {/* Volume */}
      <div className="trade-field-group">
        <label className="trade-field-label">Volume</label>
        <div className="trade-field-row">
          <input
            type="number"
            className="trade-field-input"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value) || 0.01)}
            step="0.01"
            min="0.01"
          />
          <span className="trade-field-unit">Lots</span>
          <button className="trade-stepper-btn" onClick={() => handleVolumeStep(-0.01)}>
            −
          </button>
          <button className="trade-stepper-btn" onClick={() => handleVolumeStep(0.01)}>
            +
          </button>
        </div>
      </div>

      {/* Take Profit */}
      <div className="trade-field-group">
        <div className="trade-field-label-row">
          <label className="trade-field-label">Take Profit</label>
          <CircleHelp size={14} className="text-gray-500" />
        </div>
        <div className="trade-field-row">
          <input
            type="text"
            className="trade-field-input"
            placeholder="Not set"
            value={takeProfit ?? ""}
            onChange={(e) =>
              setTakeProfit(e.target.value ? parseFloat(e.target.value) : undefined)
            }
          />
          <button
            className="trade-mode-toggle"
            onClick={() => setTpMode(tpMode === "price" ? "pips" : "price")}
          >
            {tpMode === "price" ? "Price" : "Pips"} ▾
          </button>
          <button
            className="trade-stepper-btn"
            onClick={() =>
              setTakeProfit((prev) => (prev ? prev - 1 : askNum + 10))
            }
          >
            −
          </button>
          <button
            className="trade-stepper-btn"
            onClick={() =>
              setTakeProfit((prev) => (prev ? prev + 1 : askNum + 10))
            }
          >
            +
          </button>
        </div>
      </div>

      {/* Leverage */}
      <div className="trade-field-group">
        <label className="trade-field-label">Leverage</label>
        <div className="trade-field-row">
          <input
            type="number"
            className="trade-field-input"
            value={leverage}
            onChange={(e) => setLeverage(parseFloat(e.target.value) || 1)}
            min="1"
          />
          <span className="trade-field-unit">x</span>
        </div>
      </div>

      {/* Margin */}
      <div className="trade-field-group">
        <div className="trade-field-label-row">
          <label className="trade-field-label">Margin (Optional)</label>
        </div>
        <div className="trade-field-row">
          <input
            type="number"
            className="trade-field-input"
            value={margin ?? ""}
            onChange={(e) => setMargin(e.target.value ? parseFloat(e.target.value) : undefined)}
            placeholder="Not set"
            step="0.01"
          />
        </div>
      </div>

      {/* Stop Loss */}
      <div className="trade-field-group">
        <div className="trade-field-label-row">
          <label className="trade-field-label">Stop Loss</label>
          <CircleHelp size={14} className="text-gray-500" />
        </div>
        <div className="trade-field-row">
          <input
            type="text"
            className="trade-field-input"
            placeholder="Not set"
            value={stopLoss ?? ""}
            onChange={(e) =>
              setStopLoss(e.target.value ? parseFloat(e.target.value) : undefined)
            }
          />
          <button
            className="trade-mode-toggle"
            onClick={() => setSlMode(slMode === "price" ? "pips" : "price")}
          >
            {slMode === "price" ? "Price" : "Pips"} ▾
          </button>
          <button
            className="trade-stepper-btn"
            onClick={() =>
              setStopLoss((prev) => (prev ? prev - 1 : bidNum - 10))
            }
          >
            −
          </button>
          <button
            className="trade-stepper-btn"
            onClick={() =>
              setStopLoss((prev) => (prev ? prev + 1 : bidNum - 10))
            }
          >
            +
          </button>
        </div>
      </div>

      {/* Error */}
      {tradeError && (
        <div className="trade-error">{tradeError}</div>
      )}

      {/* Footer */}
      <div className="trade-panel-footer">
        <div className="trade-panel-brand">100x</div>
        <div className="trade-panel-version">4.3.1</div>
      </div>
    </div>
  );
};

export default TradePanel;
