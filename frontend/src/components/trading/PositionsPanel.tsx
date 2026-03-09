import React, { useState, useEffect } from "react";
import { API_ENDPOINTS, WS_URL } from "../../config/api";
import { toast } from "sonner";
import { Briefcase, Eye, Layers, MoreVertical, X } from "lucide-react";
import type { TradeToEdit } from "../TradingDashboard";

interface Trade {
  order_id: string;
  type: "buy" | "sell";
  margin: number;
  leverage: number;
  symbol: string;
  quantity: number;
  entry_price: number;
  status: "open" | "closed" | "liquidated";
  exit_price?: number;
  realized_pnl?: number;
  unrealized_pnl?: number;
  stop_loss?: number;
  take_profit?: number;
  created_at: string;
  closed_at?: string;
}

interface PositionsPanelProps {
  token: string | null;
  refreshTrigger?: number;
  accountSummary: any;
  selectedTradeId?: string | null;
  onTradeSelect?: (trade: TradeToEdit) => void;
}

const PositionsPanel: React.FC<PositionsPanelProps> = ({
  token,
  refreshTrigger,
  accountSummary,
  selectedTradeId,
  onTradeSelect,
}) => {
  const [activeTab, setActiveTab] = useState<"open" | "pending" | "closed">(
    "open"
  );
  const [openTrades, setOpenTrades] = useState<Trade[]>([]);
  const [closedTrades, setClosedTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchOpenTrades = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.TRADE_OPEN, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        const trades = data.trades.map((trade: any) => ({
          ...trade,
          order_id: trade.orderId,
          entry_price: trade.openPrice / 10000,
          margin: trade.margin / 100,
          stop_loss: trade.stopLoss ? trade.stopLoss / 10000 : undefined,
          take_profit: trade.takeProfit ? trade.takeProfit / 10000 : undefined,
          unrealized_pnl: 0,
        }));
        setOpenTrades(trades);
      }
    } catch (error) {
      console.error("Error fetching open trades:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClosedTrades = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.TRADE_CLOSED, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setClosedTrades(data);
      }
    } catch (error) {
      console.error("Error fetching closed trades:", error);
    } finally {
      setLoading(false);
    }
  };

  const closeTrade = async (orderId: string) => {
    if (!token) return;
    try {
      const response = await fetch(API_ENDPOINTS.TRADE_CLOSE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ orderId }),
      });
      if (response.ok) {
        toast.success("Trade closed successfully");
        fetchOpenTrades();
        fetchClosedTrades();
      } else {
        const data = await response.json();
        toast.error("Failed to close trade", { description: data.message });
      }
    } catch (error) {
      toast.error("Network error", { description: "Unable to close trade" });
    }
  };

  useEffect(() => {
    if (token) {
      fetchOpenTrades();
      fetchClosedTrades();
    }
  }, [token, refreshTrigger]);

  useEffect(() => {
    if (token) {
      if (activeTab === "open") fetchOpenTrades();
      else if (activeTab === "closed") fetchClosedTrades();
    }
  }, [token, activeTab]);

  // WebSocket for realtime PnL
  useEffect(() => {
    if (!token || activeTab !== "open") return;
    const ws = new WebSocket(WS_URL);
    ws.onmessage = (event) => {
      try {
        let data = JSON.parse(event.data);
        if (data.channel && data.data) {
          if (data.channel === "unrealized_pnl_updates") {
            const pnlData = data.data;
            if (pnlData.userId && pnlData.unrealizedPnL) {
              setOpenTrades((prev) =>
                prev.map((trade) => {
                  const updated = pnlData.unrealizedPnL.find(
                    (t: any) => t.order_id === trade.order_id
                  );
                  return updated
                    ? { ...trade, unrealized_pnl: updated.unrealized_pnl }
                    : trade;
                })
              );
            }
          }
          if (
            data.channel === "bid_ask_updates" &&
            data.data.symbol &&
            data.data.tradePrice
          ) {
            const priceData = data.data;
            setOpenTrades((prev) =>
              prev.map((trade) => {
                if (trade.symbol === priceData.symbol) {
                  let pnl = 0;
                  if (trade.type === "buy") {
                    pnl =
                      (priceData.tradePrice - trade.entry_price) *
                      trade.quantity;
                  } else {
                    pnl =
                      (trade.entry_price - priceData.tradePrice) *
                      trade.quantity;
                  }
                  return { ...trade, unrealized_pnl: pnl };
                }
                return trade;
              })
            );
          }
        }
      } catch {}
    };
    return () => ws.close();
  }, [token, activeTab]);

  const fmt = (v: number, d = 2) =>
    new Intl.NumberFormat("en-US", {
      minimumFractionDigits: d,
      maximumFractionDigits: d,
    }).format(v);
  const fmtCurrency = (v: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(v);

  const hasPositions = activeTab === "open" ? openTrades.length > 0 : closedTrades.length > 0;

  return (
    <div className="flex flex-col h-full bg-[#141D23]">
      {/* Tabs Row */}
      <div className="flex items-center justify-between px-3 border-b border-[#3F474C]">
        <div className="flex">
          <button
            className={`px-4 py-2.5 text-[13px] font-medium transition-colors border-b-2 ${
              activeTab === "open"
                ? "text-white border-white"
                : "text-[#787b86] border-transparent hover:text-[#d1d4dc]"
            }`}
            onClick={() => setActiveTab("open")}
          >
            Open
          </button>
          <button
            className={`px-4 py-2.5 text-[13px] font-medium transition-colors border-b-2 ${
              activeTab === "pending"
                ? "text-white border-white"
                : "text-[#787b86] border-transparent hover:text-[#d1d4dc]"
            }`}
            onClick={() => setActiveTab("pending")}
          >
            Pending
          </button>
          <button
            className={`px-4 py-2.5 text-[13px] font-medium transition-colors border-b-2 ${
              activeTab === "closed"
                ? "text-white border-white"
                : "text-[#787b86] border-transparent hover:text-[#d1d4dc]"
            }`}
            onClick={() => setActiveTab("closed")}
          >
            Closed
          </button>
        </div>
        <div className="flex gap-1">
          <button className="p-1 text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2c3044] rounded transition-colors"><Eye size={16} /></button>
          <button className="p-1 text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2c3044] rounded transition-colors"><Layers size={16} /></button>
          <button className="p-1 text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2c3044] rounded transition-colors"><MoreVertical size={16} /></button>
          <button className="p-1 text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2c3044] rounded transition-colors"><X size={16} /></button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[#2c3044]">
        {loading && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-[#4a4e5a] text-sm">
            Loading...
          </div>
        )}

        {!loading && !hasPositions && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-[#4a4e5a] text-sm">
            <Briefcase size={48} className="opacity-50" />
            <span>
              {activeTab === "open"
                ? "No open positions"
                : activeTab === "pending"
                ? "No pending orders"
                : "No closed trades"}
            </span>
          </div>
        )}

        {!loading && activeTab === "open" && openTrades.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead className="sticky top-0 bg-[#141D23]/90 backdrop-blur-sm z-10">
                <tr>
                  <th className="text-left px-3 py-2 text-[#4a4e5a] font-medium text-[11px] uppercase tracking-wide border-b border-[#3F474C]">Symbol</th>
                  <th className="text-left px-3 py-2 text-[#4a4e5a] font-medium text-[11px] uppercase tracking-wide border-b border-[#3F474C]">Type</th>
                  <th className="text-left px-3 py-2 text-[#4a4e5a] font-medium text-[11px] uppercase tracking-wide border-b border-[#3F474C]">Entry</th>
                  <th className="text-left px-3 py-2 text-[#4a4e5a] font-medium text-[11px] uppercase tracking-wide border-b border-[#3F474C]">Qty</th>
                  <th className="text-left px-3 py-2 text-[#4a4e5a] font-medium text-[11px] uppercase tracking-wide border-b border-[#3F474C]">Margin</th>
                  <th className="text-left px-3 py-2 text-[#4a4e5a] font-medium text-[11px] uppercase tracking-wide border-b border-[#3F474C]">SL</th>
                  <th className="text-left px-3 py-2 text-[#4a4e5a] font-medium text-[11px] uppercase tracking-wide border-b border-[#3F474C]">TP</th>
                  <th className="text-left px-3 py-2 text-[#4a4e5a] font-medium text-[11px] uppercase tracking-wide border-b border-[#3F474C]">PnL</th>
                  <th className="border-b border-[#3F474C]"></th>
                </tr>
              </thead>
              <tbody>
                {openTrades.map((t) => (
                  <tr
                    key={t.order_id}
                    className={`cursor-pointer transition-colors border-b border-[#3F474C]/30 ${
                      selectedTradeId === t.order_id 
                        ? "bg-[#232736] border-l-2 border-l-blue-600" 
                        : "hover:bg-[#2c3044]"
                    }`}
                    onClick={() => onTradeSelect?.({
                      order_id: t.order_id,
                      type: t.type,
                      symbol: t.symbol,
                      quantity: t.quantity,
                      entry_price: t.entry_price,
                      margin: t.margin,
                      leverage: t.leverage,
                      stop_loss: t.stop_loss,
                      take_profit: t.take_profit,
                    })}
                  >
                    <td className="px-3 py-2 text-[#d1d4dc] font-mono font-medium">{t.symbol}</td>
                    <td className={`px-3 py-2 font-mono ${t.type === "buy" ? "text-emerald-400" : "text-red-400"}`}>
                      {t.type.toUpperCase()}
                    </td>
                    <td className="px-3 py-2 text-[#d1d4dc] font-mono">{fmt(t.entry_price, 4)}</td>
                    <td className="px-3 py-2 text-[#d1d4dc] font-mono">{fmt(t.quantity, 6)}</td>
                    <td className="px-3 py-2 text-[#d1d4dc] font-mono">{fmtCurrency(t.margin)}</td>
                    <td className="px-3 py-2 text-[#d1d4dc] font-mono">{t.stop_loss ? fmt(t.stop_loss, 4) : "—"}</td>
                    <td className="px-3 py-2 text-[#d1d4dc] font-mono">{t.take_profit ? fmt(t.take_profit, 4) : "—"}</td>
                    <td className={`px-3 py-2 font-mono ${(t.unrealized_pnl || 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {fmtCurrency(t.unrealized_pnl || 0)}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        className="bg-red-500/90 hover:bg-red-600 text-white border-none px-3 py-1 rounded-[4px] text-[11px] font-medium cursor-pointer transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          closeTrade(t.order_id);
                        }}
                      >
                        Close
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && activeTab === "closed" && closedTrades.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead className="sticky top-0 bg-[#141D23]/90 backdrop-blur-sm z-10">
                <tr>
                  <th className="text-left px-3 py-2 text-[#4a4e5a] font-medium text-[11px] uppercase tracking-wide border-b border-[#3F474C]">Symbol</th>
                  <th className="text-left px-3 py-2 text-[#4a4e5a] font-medium text-[11px] uppercase tracking-wide border-b border-[#3F474C]">Type</th>
                  <th className="text-left px-3 py-2 text-[#4a4e5a] font-medium text-[11px] uppercase tracking-wide border-b border-[#3F474C]">Entry</th>
                  <th className="text-left px-3 py-2 text-[#4a4e5a] font-medium text-[11px] uppercase tracking-wide border-b border-[#3F474C]">Exit</th>
                  <th className="text-left px-3 py-2 text-[#4a4e5a] font-medium text-[11px] uppercase tracking-wide border-b border-[#3F474C]">Qty</th>
                  <th className="text-left px-3 py-2 text-[#4a4e5a] font-medium text-[11px] uppercase tracking-wide border-b border-[#3F474C]">PnL</th>
                  <th className="text-left px-3 py-2 text-[#4a4e5a] font-medium text-[11px] uppercase tracking-wide border-b border-[#3F474C]">Status</th>
                  <th className="text-left px-3 py-2 text-[#4a4e5a] font-medium text-[11px] uppercase tracking-wide border-b border-[#3F474C]">Closed</th>
                </tr>
              </thead>
              <tbody>
                {closedTrades.map((t) => (
                  <tr key={t.order_id} className="transition-colors border-b border-[#3F474C]/30 hover:bg-[#2c3044]">
                    <td className="px-3 py-2 text-[#d1d4dc] font-mono font-medium">{t.symbol}</td>
                    <td className={`px-3 py-2 font-mono ${t.type === "buy" ? "text-emerald-400" : "text-red-400"}`}>
                      {t.type.toUpperCase()}
                    </td>
                    <td className="px-3 py-2 text-[#d1d4dc] font-mono">{fmt(t.entry_price, 4)}</td>
                    <td className="px-3 py-2 text-[#d1d4dc] font-mono">{t.exit_price ? fmt(t.exit_price, 4) : "—"}</td>
                    <td className="px-3 py-2 text-[#d1d4dc] font-mono">{fmt(t.quantity, 6)}</td>
                    <td className={`px-3 py-2 font-mono ${(t.realized_pnl || 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {fmtCurrency(t.realized_pnl || 0)}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded-[4px] text-[11px] capitalize ${
                          t.status === "closed"
                            ? "bg-[#26a69a]/15 text-[#26a69a]"
                            : "bg-[#ef5350]/15 text-[#ef5350]"
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-[#d1d4dc] font-mono">
                      {t.closed_at
                        ? new Date(t.closed_at).toLocaleString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Account Summary Footer */}
      <div className="flex items-center gap-6 px-4 py-2 bg-[#141D23] border-t border-[#3F474C] text-xs shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[#787b86]">Equity:</span>
          <span className="text-[#d1d4dc] font-mono font-semibold">
            {fmtCurrency(accountSummary?.equity || 0)} USD
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[#787b86]">Free Margin:</span>
          <span className="text-[#d1d4dc] font-mono font-semibold">
            {fmtCurrency(accountSummary?.freeMargin || 0)} USD
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[#787b86]">Balance:</span>
          <span className="text-[#d1d4dc] font-mono font-semibold">
            {fmtCurrency(accountSummary?.balance || 0)} USD
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[#787b86]">Margin:</span>
          <span className="text-[#d1d4dc] font-mono font-semibold">
            {fmtCurrency(accountSummary?.totalMarginUsed || 0)} USD
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[#787b86]">Margin level:</span>
          <span className="text-[#d1d4dc] font-mono font-semibold">—</span>
        </div>
      </div>
    </div>
  );
};

export default PositionsPanel;
