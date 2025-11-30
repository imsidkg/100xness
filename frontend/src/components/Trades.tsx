import React, { useState, useEffect } from "react";
import { API_ENDPOINTS, WS_URL } from "../config/api";

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

interface TradesProps {
  token: string | null;
}

const Trades: React.FC<TradesProps> = ({ token }) => {
  const [activeTab, setActiveTab] = useState<"open" | "closed">("open");
  const [openTrades, setOpenTrades] = useState<Trade[]>([]);
  const [closedTrades, setClosedTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOpenTrades = async () => {
    if (!token) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(API_ENDPOINTS.TRADE_OPEN, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
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
          unrealized_pnl: 0 
        }));
        setOpenTrades(trades);
      } else {
        setError("Failed to fetch open trades");
      }
    } catch (error) {
      console.error("Error fetching open trades:", error);
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const fetchClosedTrades = async () => {
    if (!token) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(API_ENDPOINTS.TRADE_CLOSED, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setClosedTrades(data);
      } else {
        setError("Failed to fetch closed trades");
      }
    } catch (error) {
      console.error("Error fetching closed trades:", error);
      setError("Network error");
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
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ orderId })
      });
      
      if (response.ok) {
        alert("Trade closed successfully");
        fetchOpenTrades();
        fetchClosedTrades();
      } else {
        const data = await response.json();
        alert(`Failed to close trade: ${data.message}`);
      }
    } catch (error) {
      console.error("Error closing trade:", error);
      alert("Network error");
    }
  };

  useEffect(() => {
    if (token) {
      if (activeTab === "open") {
        fetchOpenTrades();
      } else {
        fetchClosedTrades();
      }
    }
  }, [token, activeTab]);

  // Real-time PnL updates via WebSocket - Calculate PnL directly on frontend
  useEffect(() => {
    if (!token || activeTab !== "open") return;

    const ws = new WebSocket(WS_URL);

    ws.onopen = () => console.log("Connected to WebSocket for real-time PnL updates");

    ws.onmessage = (event) => {
      try {
        console.log("Raw WebSocket message:", event.data);
        let data = JSON.parse(event.data);
        console.log("Parsed WebSocket data:", data);
        
        if (data.channel && data.data) {
          console.log("Detected wrapped format, channel:", data.channel);
          
          // Handle unrealized PnL updates
          if (data.channel === "unrealized_pnl_updates") {
            const pnlData = data.data;
            console.log("Processing unrealized PnL update:", pnlData);
            
            if (pnlData.userId && pnlData.unrealizedPnL) {
              setOpenTrades(prevTrades => {
                return prevTrades.map(trade => {
                  const updatedTrade = pnlData.unrealizedPnL.find((t: any) => t.order_id === trade.order_id);
                  if (updatedTrade) {
                    console.log(`Updating trade ${trade.order_id} PnL to: ${updatedTrade.unrealized_pnl}`);
                    return {
                      ...trade,
                      unrealized_pnl: updatedTrade.unrealized_pnl
                    };
                  }
                  return trade;
                });
              });
            }
          }
          
          // Handle bid/ask updates for direct calculation
          if (data.channel === "bid_ask_updates" && data.data.symbol && data.data.tradePrice) {
            const priceData = data.data;
            console.log(`Updating PnL for ${priceData.symbol} at price ${priceData.tradePrice}`);
            setOpenTrades(prevTrades => {
              return prevTrades.map(trade => {
                if (trade.symbol === priceData.symbol) {
                  // Calculate PnL directly on frontend
                  let unrealized_pnl = 0;
                  if (trade.type === "buy") {
                    unrealized_pnl = (priceData.tradePrice - trade.entry_price) * trade.quantity;
                  } else if (trade.type === "sell") {
                    unrealized_pnl = (trade.entry_price - priceData.tradePrice) * trade.quantity;
                  }
                  
                  console.log(`Trade ${trade.order_id} PnL calculated to: ${unrealized_pnl}`);
                  return {
                    ...trade,
                    unrealized_pnl
                  };
                }
                return trade;
              });
            });
          }
        }
      } catch (error) {
        console.error("Error processing WebSocket message for PnL:", error, event.data);
      }
    };

    ws.onclose = () => console.log("Disconnected from PnL WebSocket");
    ws.onerror = (error) => console.error("PnL WebSocket error:", error);

    return () => {
      ws.close();
    };
  }, [token, activeTab]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatNumber = (num: number, decimals: number = 2) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(num);
  };

  const getPnLColor = (pnl: number) => {
    return pnl >= 0 ? "text-green-600" : "text-red-600";
  };

  if (!token) {
    return (
      <div className="p-4 bg-yellow-100 border border-yellow-400 rounded">
        Please log in to view your trades
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">Your Trades</h2>
      
      <div className="flex mb-4">
        <button
          className={`px-4 py-2 font-medium rounded-t-lg ${
            activeTab === "open"
              ? "border-b-2 border-white-500 text-white"
              : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("open")}
        >
          Open Trades ({openTrades.length})
        </button>
        <button
          className={`px-4 py-2 font-medium rounded-t-lg ml-2 ${
            activeTab === "closed"
              ? "bg-blue-500 text-white"
              : "bg-white text-gray-500  hover:bg-gray-100"
          }`}
          onClick={() => setActiveTab("closed")}
        >
          Closed Trades ({closedTrades.length})
        </button>
      </div>

      {loading && <div className="text-center py-4">Loading trades...</div>}
      {error && <div className="text-red-600 bg-red-100 p-3 rounded mb-4">{error}</div>}

      {activeTab === "open" && (
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Symbol</th>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-left">Entry Price</th>
                <th className="px-4 py-2 text-left">Quantity</th>
                <th className="px-4 py-2 text-left">Margin</th>
                <th className="px-4 py-2 text-left">Leverage</th>
                <th className="px-4 py-2 text-left">Stop Loss</th>
                <th className="px-4 py-2 text-left">Take Profit</th>
                <th className="px-4 py-2 text-left">Unrealized PnL</th>
                <th className="px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {openTrades.map((trade) => (
                <tr key={trade.order_id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">{trade.symbol}</td>
                  <td className={`px-4 py-2 font-medium ${
                    trade.type === "buy" ? "text-green-600" : "text-red-600"
                  }`}>
                    {trade.type.toUpperCase()}
                  </td>
                  <td className="px-4 py-2">{formatNumber(trade.entry_price, 4)}</td>
                  <td className="px-4 py-2">{formatNumber(trade.quantity, 6)}</td>
                  <td className="px-4 py-2">{formatCurrency(trade.margin)}</td>
                  <td className="px-4 py-2">{trade.leverage}x</td>
                  <td className="px-4 py-2">
                    {trade.stop_loss ? formatNumber(trade.stop_loss, 4) : "-"}
                  </td>
                  <td className="px-4 py-2">
                    {trade.take_profit ? formatNumber(trade.take_profit, 4) : "-"}
                  </td>
                  <td className={`px-4 py-2 font-medium ${getPnLColor(trade.unrealized_pnl || 0)}`}>
                    {formatCurrency(trade.unrealized_pnl || 0)}
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => closeTrade(trade.order_id)}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                    >
                      Close
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {openTrades.length === 0 && !loading && (
            <div className="text-center py-8 text-gray-500">
              No open trades found
            </div>
          )}
        </div>
      )}

      {activeTab === "closed" && (
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Symbol</th>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-left">Entry Price</th>
                <th className="px-4 py-2 text-left">Exit Price</th>
                <th className="px-4 py-2 text-left">Quantity</th>
                <th className="px-4 py-2 text-left">Margin</th>
                <th className="px-4 py-2 text-left">Leverage</th>
                <th className="px-4 py-2 text-left">Realized PnL</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Closed At</th>
              </tr>
            </thead>
            <tbody>
              {closedTrades.map((trade) => (
                <tr key={trade.order_id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">{trade.symbol}</td>
                  <td className={`px-4 py-2 font-medium ${
                    trade.type === "buy" ? "text-green-600" : "text-red-600"
                  }`}>
                    {trade.type.toUpperCase()}
                  </td>
                  <td className="px-4 py-2">{formatNumber(trade.entry_price, 4)}</td>
                  <td className="px-4 py-2">
                    {trade.exit_price ? formatNumber(trade.exit_price, 4) : "-"}
                  </td>
                  <td className="px-4 py-2">{formatNumber(trade.quantity, 6)}</td>
                  <td className="px-4 py-2">{formatCurrency(trade.margin)}</td>
                  <td className="px-4 py-2">{trade.leverage}x</td>
                  <td className={`px-4 py-2 font-medium ${getPnLColor(trade.realized_pnl || 0)}`}>
                    {formatCurrency(trade.realized_pnl || 0)}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      trade.status === "closed" 
                        ? "bg-green-100 text-green-800" 
                        : "bg-red-100 text-red-800"
                    }`}>
                      {trade.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm">
                    {trade.closed_at ? new Date(trade.closed_at).toLocaleString() : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {closedTrades.length === 0 && !loading && (
            <div className="text-center py-8 text-gray-500">
              No closed trades found
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Trades;
