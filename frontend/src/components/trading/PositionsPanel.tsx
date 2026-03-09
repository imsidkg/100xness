import React, { useState, useEffect } from "react";
import { API_ENDPOINTS, WS_URL } from "../../config/api";
import { toast } from "sonner";
import { Briefcase, Eye, Layers, MoreVertical, X } from "lucide-react";

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
}

const PositionsPanel: React.FC<PositionsPanelProps> = ({
  token,
  refreshTrigger,
  accountSummary,
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
    <div className="positions-panel">
      {/* Tabs Row */}
      <div className="positions-tabs-row">
        <div className="positions-tabs">
          <button
            className={`positions-tab ${activeTab === "open" ? "positions-tab-active" : ""}`}
            onClick={() => setActiveTab("open")}
          >
            Open
          </button>
          <button
            className={`positions-tab ${activeTab === "pending" ? "positions-tab-active" : ""}`}
            onClick={() => setActiveTab("pending")}
          >
            Pending
          </button>
          <button
            className={`positions-tab ${activeTab === "closed" ? "positions-tab-active" : ""}`}
            onClick={() => setActiveTab("closed")}
          >
            Closed
          </button>
        </div>
        <div className="positions-tab-actions">
          <button className="icon-btn-sm"><Eye size={16} /></button>
          <button className="icon-btn-sm"><Layers size={16} /></button>
          <button className="icon-btn-sm"><MoreVertical size={16} /></button>
          <button className="icon-btn-sm"><X size={16} /></button>
        </div>
      </div>

      {/* Content Area */}
      <div className="positions-content">
        {loading && (
          <div className="positions-empty">Loading...</div>
        )}

        {!loading && !hasPositions && (
          <div className="positions-empty">
            <Briefcase size={48} className="positions-empty-icon" />
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
          <div className="positions-table-wrap">
            <table className="positions-table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Type</th>
                  <th>Entry</th>
                  <th>Qty</th>
                  <th>Margin</th>
                  <th>SL</th>
                  <th>TP</th>
                  <th>PnL</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {openTrades.map((t) => (
                  <tr key={t.order_id}>
                    <td className="font-medium">{t.symbol}</td>
                    <td
                      className={
                        t.type === "buy" ? "text-emerald-400" : "text-red-400"
                      }
                    >
                      {t.type.toUpperCase()}
                    </td>
                    <td>{fmt(t.entry_price, 4)}</td>
                    <td>{fmt(t.quantity, 6)}</td>
                    <td>{fmtCurrency(t.margin)}</td>
                    <td>{t.stop_loss ? fmt(t.stop_loss, 4) : "—"}</td>
                    <td>{t.take_profit ? fmt(t.take_profit, 4) : "—"}</td>
                    <td
                      className={
                        (t.unrealized_pnl || 0) >= 0
                          ? "text-emerald-400"
                          : "text-red-400"
                      }
                    >
                      {fmtCurrency(t.unrealized_pnl || 0)}
                    </td>
                    <td>
                      <button
                        className="positions-close-btn"
                        onClick={() => closeTrade(t.order_id)}
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
          <div className="positions-table-wrap">
            <table className="positions-table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Type</th>
                  <th>Entry</th>
                  <th>Exit</th>
                  <th>Qty</th>
                  <th>PnL</th>
                  <th>Status</th>
                  <th>Closed</th>
                </tr>
              </thead>
              <tbody>
                {closedTrades.map((t) => (
                  <tr key={t.order_id}>
                    <td className="font-medium">{t.symbol}</td>
                    <td
                      className={
                        t.type === "buy" ? "text-emerald-400" : "text-red-400"
                      }
                    >
                      {t.type.toUpperCase()}
                    </td>
                    <td>{fmt(t.entry_price, 4)}</td>
                    <td>{t.exit_price ? fmt(t.exit_price, 4) : "—"}</td>
                    <td>{fmt(t.quantity, 6)}</td>
                    <td
                      className={
                        (t.realized_pnl || 0) >= 0
                          ? "text-emerald-400"
                          : "text-red-400"
                      }
                    >
                      {fmtCurrency(t.realized_pnl || 0)}
                    </td>
                    <td>
                      <span
                        className={`positions-status-badge ${
                          t.status === "closed"
                            ? "positions-status-closed"
                            : "positions-status-liq"
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="text-xs">
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
      <div className="account-summary-footer">
        <div className="account-summary-item">
          <span className="account-summary-label">Equity:</span>
          <span className="account-summary-value">
            {fmtCurrency(accountSummary?.equity || 0)} USD
          </span>
        </div>
        <div className="account-summary-item">
          <span className="account-summary-label">Free Margin:</span>
          <span className="account-summary-value">
            {fmtCurrency(accountSummary?.freeMargin || 0)} USD
          </span>
        </div>
        <div className="account-summary-item">
          <span className="account-summary-label">Balance:</span>
          <span className="account-summary-value">
            {fmtCurrency(accountSummary?.balance || 0)} USD
          </span>
        </div>
        <div className="account-summary-item">
          <span className="account-summary-label">Margin:</span>
          <span className="account-summary-value">
            {fmtCurrency(accountSummary?.totalMarginUsed || 0)} USD
          </span>
        </div>
        <div className="account-summary-item">
          <span className="account-summary-label">Margin level:</span>
          <span className="account-summary-value">—</span>
        </div>
      </div>
    </div>
  );
};

export default PositionsPanel;
