import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { API_ENDPOINTS, WS_URL } from "../../config/api";
import { toast } from "sonner";
import { Briefcase } from "lucide-react";
import type { TradeToEdit } from "../TradingDashboard";

interface Trade {
  order_id: string;
  type: "buy" | "sell";
  order_type?: "market" | "limit" | "stop";
  limit_price?: number;
  margin: number;
  leverage: number;
  symbol: string;
  quantity: number;
  entry_price: number;
  status: "open" | "closed" | "liquidated" | "pending";
  exit_price?: number;
  realized_pnl?: number;
  unrealized_pnl?: number;
  stop_loss?: number;
  take_profit?: number;
  commission?: number;
  swap?: number;
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
    "open",
  );
  const [openTrades, setOpenTrades] = useState<Trade[]>([]);
  const [closedTrades, setClosedTrades] = useState<Trade[]>([]);
  const [pendingTrades, setPendingTrades] = useState<Trade[]>([]);
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
          entry_price: Number(trade.entry_price),
          margin: Number(trade.margin),
          quantity: Number(trade.quantity),
          leverage: Number(trade.leverage),
          stop_loss: trade.stop_loss ? Number(trade.stop_loss) : undefined,
          take_profit: trade.take_profit ? Number(trade.take_profit) : undefined,
          commission: trade.commission ? Number(trade.commission) : 0,
          swap: trade.swap ? Number(trade.swap) : 0,
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

  const fetchPendingTrades = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.TRADE_PENDING, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        const trades = (data.trades || []).map((trade: any) => ({
          ...trade,
          entry_price: Number(trade.entry_price) || 0,
          limit_price: trade.limit_price ? Number(trade.limit_price) : undefined,
          margin: Number(trade.margin),
          quantity: Number(trade.quantity),
          leverage: Number(trade.leverage),
          stop_loss: trade.stop_loss ? Number(trade.stop_loss) : undefined,
          take_profit: trade.take_profit ? Number(trade.take_profit) : undefined,
          commission: trade.commission ? Number(trade.commission) : 0,
        }));
        setPendingTrades(trades);
      }
    } catch (error) {
      console.error("Error fetching pending trades:", error);
    } finally {
      setLoading(false);
    }
  };

  const cancelPendingOrder = async (orderId: string) => {
    if (!token) return;
    try {
      const response = await fetch(API_ENDPOINTS.TRADE_CANCEL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ orderId }),
      });
      if (response.ok) {
        toast.success("Pending order cancelled");
        fetchPendingTrades();
      } else {
        const data = await response.json();
        toast.error("Failed to cancel order", { description: data.message });
      }
    } catch (error) {
      toast.error("Network error", { description: "Unable to cancel order" });
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
      fetchPendingTrades();
    }
  }, [token, refreshTrigger]);

  useEffect(() => {
    if (token) {
      if (activeTab === "open") fetchOpenTrades();
      else if (activeTab === "closed") fetchClosedTrades();
      else if (activeTab === "pending") fetchPendingTrades();
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
                    (t: any) => t.order_id === trade.order_id,
                  );
                  return updated
                    ? { ...trade, unrealized_pnl: updated.unrealized_pnl }
                    : trade;
                }),
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
              }),
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

  const hasPositions =
    activeTab === "open"
      ? openTrades.length > 0
      : activeTab === "pending"
        ? pendingTrades.length > 0
        : closedTrades.length > 0;

  return (
    <div className="flex flex-col h-full bg-[#141D23]">
      {/* Tab Selectors */}
      <div className="flex flex-row items-stretch bg-[#141D23]">
        {(["open", "pending", "closed"] as const).map((tab) => (
          <div
            key={tab}
            className={`relative px-5 py-2.5 text-[13.5px] font-medium cursor-pointer select-none transition-colors duration-200 ${
              activeTab === tab
                ? "text-[#e5e7eb]"
                : "text-[#6b7280] hover:text-[#9ca3af]"
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {activeTab === tab && (
              <motion.div
                layoutId="positions-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-[3px] bg-white rounded-t-sm"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[#ffffff]">
        {loading && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-[#4a4e5a] text-[14px]">
            Loading...
          </div>
        )}

        {!loading && !hasPositions && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-[#4a4e5a] text-[14px]">
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
          <div>
            <table className="w-full border-collapse text-[14px]">
              <thead className="sticky top-0 bg-[#141D23] z-10">
                <tr>
                  <th className="text-left px-3 py-2.5 text-[#4a4e5a] font-medium text-[14px] uppercase tracking-wide border-b border-[#3F474C]">
                    Symbol
                  </th>
                  <th className="text-left px-3 py-2.5 text-[#4a4e5a] font-medium text-[14px] uppercase tracking-wide border-b border-[#3F474C]">
                    Type
                  </th>
                  <th className="text-left px-3 py-2.5 text-[#4a4e5a] font-medium text-[14px] uppercase tracking-wide border-b border-[#3F474C]">
                    Entry
                  </th>
                  <th className="text-left px-3 py-2.5 text-[#4a4e5a] font-medium text-[14px] uppercase tracking-wide border-b border-[#3F474C]">
                    Qty
                  </th>
                  <th className="text-left px-3 py-2.5 text-[#4a4e5a] font-medium text-[14px] uppercase tracking-wide border-b border-[#3F474C]">
                    Margin
                  </th>
                  <th className="text-left px-3 py-2.5 text-[#4a4e5a] font-medium text-[14px] uppercase tracking-wide border-b border-[#3F474C]">
                    SL
                  </th>
                  <th className="text-left px-3 py-2.5 text-[#4a4e5a] font-medium text-[14px] uppercase tracking-wide border-b border-[#3F474C]">
                    TP
                  </th>
                  <th className="text-left px-3 py-2.5 text-[#4a4e5a] font-medium text-[14px] uppercase tracking-wide border-b border-[#3F474C]">
                    Commission
                  </th>
                  <th className="text-left px-3 py-2.5 text-[#4a4e5a] font-medium text-[14px] uppercase tracking-wide border-b border-[#3F474C]">
                    Swap
                  </th>
                  <th className="text-left px-3 py-2.5 text-[#4a4e5a] font-medium text-[14px] uppercase tracking-wide border-b border-[#3F474C]">
                    PnL
                  </th>
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
                        : "hover:bg-[#222E34]"
                    }`}
                    onClick={() =>
                      onTradeSelect?.({
                        order_id: t.order_id,
                        type: t.type,
                        symbol: t.symbol,
                        quantity: t.quantity,
                        entry_price: t.entry_price,
                        margin: t.margin,
                        leverage: t.leverage,
                        stop_loss: t.stop_loss,
                        take_profit: t.take_profit,
                      })
                    }
                  >
                    <td className="px-3 py-2.5 text-[#d1d4dc] font-mono font-medium text-[14px]">
                      {t.symbol}
                    </td>
                    <td
                      className={`px-3 py-2.5 font-mono text-[14px] ${t.type === "buy" ? "text-emerald-400" : "text-red-400"}`}
                    >
                      {t.type.toUpperCase()}
                    </td>
                    <td className="px-3 py-2.5 text-[#d1d4dc] font-mono text-[14px]">
                      {fmt(t.entry_price, 4)}
                    </td>
                    <td className="px-3 py-2.5 text-[#d1d4dc] font-mono text-[14px]">
                      {fmt(t.quantity, 6)}
                    </td>
                    <td className="px-3 py-2.5 text-[#d1d4dc] font-mono text-[14px]">
                      {fmtCurrency(t.margin)}
                    </td>
                    <td className="px-3 py-2.5 text-[#d1d4dc] font-mono text-[14px]">
                      {t.stop_loss ? fmt(t.stop_loss, 4) : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-[#d1d4dc] font-mono text-[14px]">
                      {t.take_profit ? fmt(t.take_profit, 4) : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-[#d1d4dc] font-mono text-[14px]">
                      {fmtCurrency(t.commission || 0)}
                    </td>
                    <td className="px-3 py-2.5 text-[#d1d4dc] font-mono text-[14px]">
                      {fmtCurrency(t.swap || 0)}
                    </td>
                    <td
                      className={`px-3 py-2.5 font-mono text-[14px] ${(t.unrealized_pnl || 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}
                    >
                      {fmtCurrency(t.unrealized_pnl || 0)}
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        className="text-white text-[13px] font-medium cursor-pointer hover:text-white/70 transition-colors"
                        style={{ background: "none", border: "none" }}
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

        {!loading && activeTab === "pending" && pendingTrades.length > 0 && (
          <div>
            <table className="w-full border-collapse text-[14px]">
              <thead className="sticky top-0 bg-[#141D23] z-10">
                <tr>
                  <th className="text-left px-3 py-2.5 text-[#4a4e5a] font-medium text-[14px] uppercase tracking-wide border-b border-[#3F474C]">
                    Symbol
                  </th>
                  <th className="text-left px-3 py-2.5 text-[#4a4e5a] font-medium text-[14px] uppercase tracking-wide border-b border-[#3F474C]">
                    Type
                  </th>
                  <th className="text-left px-3 py-2.5 text-[#4a4e5a] font-medium text-[14px] uppercase tracking-wide border-b border-[#3F474C]">
                    Order
                  </th>
                  <th className="text-left px-3 py-2.5 text-[#4a4e5a] font-medium text-[14px] uppercase tracking-wide border-b border-[#3F474C]">
                    Limit Price
                  </th>
                  <th className="text-left px-3 py-2.5 text-[#4a4e5a] font-medium text-[14px] uppercase tracking-wide border-b border-[#3F474C]">
                    Qty
                  </th>
                  <th className="text-left px-3 py-2.5 text-[#4a4e5a] font-medium text-[14px] uppercase tracking-wide border-b border-[#3F474C]">
                    Margin
                  </th>
                  <th className="text-left px-3 py-2.5 text-[#4a4e5a] font-medium text-[14px] uppercase tracking-wide border-b border-[#3F474C]">
                    SL
                  </th>
                  <th className="text-left px-3 py-2.5 text-[#4a4e5a] font-medium text-[14px] uppercase tracking-wide border-b border-[#3F474C]">
                    TP
                  </th>
                  <th className="text-left px-3 py-2.5 text-[#4a4e5a] font-medium text-[14px] uppercase tracking-wide border-b border-[#3F474C]">
                    Created
                  </th>
                  <th className="border-b border-[#3F474C]"></th>
                </tr>
              </thead>
              <tbody>
                {pendingTrades.map((t) => (
                  <tr
                    key={t.order_id}
                    className="transition-colors border-b border-[#3F474C]/30 hover:bg-[#222E34]"
                  >
                    <td className="px-3 py-2.5 text-[#d1d4dc] font-mono font-medium text-[14px]">
                      {t.symbol}
                    </td>
                    <td
                      className={`px-3 py-2.5 font-mono text-[14px] ${t.type === "buy" ? "text-emerald-400" : "text-red-400"}`}
                    >
                      {t.type.toUpperCase()}
                    </td>
                    <td className="px-3 py-2.5 text-[#d1d4dc] font-mono uppercase text-[14px]">
                      {t.order_type || "limit"}
                    </td>
                    <td className="px-3 py-2.5 text-yellow-400 font-mono font-medium text-[14px]">
                      {t.limit_price ? fmt(t.limit_price, 4) : fmt(t.entry_price, 4)}
                    </td>
                    <td className="px-3 py-2.5 text-[#d1d4dc] font-mono text-[14px]">
                      {fmt(t.quantity, 6)}
                    </td>
                    <td className="px-3 py-2.5 text-[#d1d4dc] font-mono text-[14px]">
                      {fmtCurrency(t.margin)}
                    </td>
                    <td className="px-3 py-2.5 text-[#d1d4dc] font-mono text-[14px]">
                      {t.stop_loss ? fmt(t.stop_loss, 4) : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-[#d1d4dc] font-mono text-[14px]">
                      {t.take_profit ? fmt(t.take_profit, 4) : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-[#d1d4dc] font-mono text-[14px]">
                      {new Date(t.created_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        className="text-white text-[13px] font-medium cursor-pointer hover:text-white/70 transition-colors"
                        style={{ background: "none", border: "none" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          cancelPendingOrder(t.order_id);
                        }}
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && activeTab === "closed" && closedTrades.length > 0 && (
          <div>
            <table className="w-full border-collapse text-[14px]">
              <thead className="sticky top-0 bg-[#141D23] z-10">
                <tr>
                  <th className="text-left px-3 py-2.5 text-[#4a4e5a] font-medium text-[14px] uppercase tracking-wide border-b border-[#3F474C]">
                    Symbol
                  </th>
                  <th className="text-left px-3 py-2.5 text-[#4a4e5a] font-medium text-[14px] uppercase tracking-wide border-b border-[#3F474C]">
                    Type
                  </th>
                  <th className="text-left px-3 py-2.5 text-[#4a4e5a] font-medium text-[14px] uppercase tracking-wide border-b border-[#3F474C]">
                    Entry
                  </th>
                  <th className="text-left px-3 py-2.5 text-[#4a4e5a] font-medium text-[14px] uppercase tracking-wide border-b border-[#3F474C]">
                    Exit
                  </th>
                  <th className="text-left px-3 py-2.5 text-[#4a4e5a] font-medium text-[14px] uppercase tracking-wide border-b border-[#3F474C]">
                    Qty
                  </th>
                  <th className="text-left px-3 py-2.5 text-[#4a4e5a] font-medium text-[14px] uppercase tracking-wide border-b border-[#3F474C]">
                    Commission
                  </th>
                  <th className="text-left px-3 py-2.5 text-[#4a4e5a] font-medium text-[14px] uppercase tracking-wide border-b border-[#3F474C]">
                    Swap
                  </th>
                  <th className="text-left px-3 py-2.5 text-[#4a4e5a] font-medium text-[14px] uppercase tracking-wide border-b border-[#3F474C]">
                    PnL
                  </th>
                  <th className="text-left px-3 py-2.5 text-[#4a4e5a] font-medium text-[14px] uppercase tracking-wide border-b border-[#3F474C]">
                    Status
                  </th>
                  <th className="text-left px-3 py-2.5 text-[#4a4e5a] font-medium text-[14px] uppercase tracking-wide border-b border-[#3F474C]">
                    Closed
                  </th>
                </tr>
              </thead>
              <tbody>
                {closedTrades.map((t) => (
                  <tr
                    key={t.order_id}
                    className="transition-colors border-b border-[#3F474C]/30 hover:bg-[#222E34]"
                  >
                    <td className="px-3 py-2.5 text-[#d1d4dc] font-mono font-medium text-[14px]">
                      {t.symbol}
                    </td>
                    <td
                      className={`px-3 py-2.5 font-mono text-[14px] ${t.type === "buy" ? "text-emerald-400" : "text-red-400"}`}
                    >
                      {t.type.toUpperCase()}
                    </td>
                    <td className="px-3 py-2.5 text-[#d1d4dc] font-mono text-[14px]">
                      {fmt(Number(t.entry_price), 4)}
                    </td>
                    <td className="px-3 py-2.5 text-[#d1d4dc] font-mono text-[14px]">
                      {t.exit_price ? fmt(Number(t.exit_price), 4) : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-[#d1d4dc] font-mono text-[14px]">
                      {fmt(Number(t.quantity), 6)}
                    </td>
                    <td className="px-3 py-2.5 text-[#d1d4dc] font-mono text-[14px]">
                      {fmtCurrency(Number(t.commission) || 0)}
                    </td>
                    <td className="px-3 py-2.5 text-[#d1d4dc] font-mono text-[14px]">
                      {fmtCurrency(Number(t.swap) || 0)}
                    </td>
                    <td
                      className={`px-3 py-2.5 font-mono text-[14px] ${(Number(t.realized_pnl) || 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}
                    >
                      {fmtCurrency(Number(t.realized_pnl) || 0)}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded-[4px] text-[12px] capitalize ${
                          t.status === "closed"
                            ? "bg-[#26a69a]/15 text-[#26a69a]"
                            : "bg-[#ef5350]/15 text-[#ef5350]"
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-[14px] text-[#d1d4dc] font-mono">
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
      <div className="flex items-center justify-evenly px-3 py-1.5 bg-[#141D23] border-t border-[#3F474C] text-[11px] shrink-0 flex-nowrap whitespace-nowrap sticky bottom-0 z-20">
        <div className="flex items-center gap-1">
          <span className="text-[#787b86]">Equity:</span>
          <span className="text-[#d1d4dc] font-mono font-semibold">
            {fmtCurrency(accountSummary?.equity || 0)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[#787b86]">Free Margin:</span>
          <span className="text-[#d1d4dc] font-mono font-semibold">
            {fmtCurrency(accountSummary?.freeMargin || 0)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[#787b86]">Balance:</span>
          <span className="text-[#d1d4dc] font-mono font-semibold">
            {fmtCurrency(accountSummary?.balance || 0)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[#787b86]">Margin:</span>
          <span className="text-[#d1d4dc] font-mono font-semibold">
            {fmtCurrency(accountSummary?.totalMarginUsed || 0)}
          </span>
        </div>
        {/* <div className="flex items-center gap-1">
          <span className="text-[#787b86]">Margin level:</span>
          <span className="text-[#d1d4dc] font-mono font-semibold">—</span>
        </div> */}
        <div className="flex items-center gap-1">
          <span className="text-[#787b86]">Net P&L:</span>
          <span
            className={`font-mono font-semibold ${
              (accountSummary?.totalUnrealizedPnl ?? 0) >= 0
                ? "text-[#26a69a]"
                : "text-[#ef5350]"
            }`}
          >
            {(accountSummary?.totalUnrealizedPnl ?? 0) >= 0 ? "+" : ""}
            {fmtCurrency(accountSummary?.totalUnrealizedPnl || 0)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PositionsPanel;
