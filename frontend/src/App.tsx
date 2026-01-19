import { useEffect, useReducer, useState } from "react";
import { LandingPage } from "./components/LandingPage";
import TradingDashboard from "./components/TradingDashboard";
import { API_ENDPOINTS, WS_URL } from "./config/api";
import { toast } from "sonner";

type State = {
  candleData: any[];
  symbol: string;
  interval: string;
  prices: { [symbol: string]: { bid: string; ask: string } };
  currentPrice: number | null;
};

type Action =
  | { type: "SET_CANDLES"; payload: any[] }
  | { type: "SET_SYMBOL"; payload: string }
  | { type: "SET_INTERVAL"; payload: string }
  | {
      type: "UPDATE_LAST_CANDLE";
      payload: { tradePrice: number; tradeTime: number };
    }
  | {
      type: "SET_BID_ASK";
      payload: { symbol: string; bid: string; ask: string };
    }
  | { type: "UPDATE_CURRENT_PRICE"; payload: number };

const symbolOptions = ["BTCUSDT", "ETHUSDT", "SOLUSDT"];

const initialState: State = {
  candleData: [],
  symbol: symbolOptions[0],
  interval: "1m",
  prices: {},
  currentPrice: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_CANDLES":
      return { ...state, candleData: action.payload };
    case "SET_SYMBOL":
      return { ...state, symbol: action.payload };
    case "SET_INTERVAL":
      return { ...state, interval: action.payload };
    case "SET_BID_ASK":
      return {
        ...state,
        prices: {
          ...state.prices,
          [action.payload.symbol.toLowerCase()]: {
            bid: action.payload.bid,
            ask: action.payload.ask,
          },
        },
      };
    case "UPDATE_CURRENT_PRICE":
      return {
        ...state,
        currentPrice: action.payload,
      };
    case "UPDATE_LAST_CANDLE":
      const { tradePrice, tradeTime } = action.payload;

      // Validate input
      if (!tradePrice || !tradeTime || isNaN(tradePrice) || isNaN(tradeTime)) {
        console.warn("Invalid trade data:", action.payload);
        return state;
      }

      const intervalString = state.interval;
      let intervalSeconds = 60; // default to 1m
      if (intervalString.endsWith("m")) {
        intervalSeconds = parseInt(intervalString.slice(0, -1)) * 60;
      } else if (intervalString.endsWith("h")) {
        intervalSeconds = parseInt(intervalString.slice(0, -1)) * 3600;
      }

      const tradeTimeSeconds = tradeTime / 1000;
      const candleTime =
        Math.floor(tradeTimeSeconds / intervalSeconds) * intervalSeconds;

      const lastCandle =
        state.candleData.length > 0
          ? state.candleData[state.candleData.length - 1]
          : null;

      if (lastCandle && candleTime === lastCandle.time) {
        // Trade belongs to the last candle in the state -> UPDATE
        // Ensure all values are valid numbers
        const open = Number(lastCandle.open);
        const high = Number(Math.max(lastCandle.high, tradePrice));
        const low = Number(Math.min(lastCandle.low, tradePrice));
        const close = Number(tradePrice);

        if (isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close)) {
          console.warn("Invalid candle values after update:", {
            open,
            high,
            low,
            close,
          });
          return state;
        }

        const updatedCandle = {
          time: candleTime,
          open,
          high,
          low,
          close,
        };

        return {
          ...state,
          currentPrice: tradePrice,
          candleData: [...state.candleData.slice(0, -1), updatedCandle],
        };
      } else if (candleTime > (lastCandle?.time || 0)) {
        // Only add new candle if it's newer than the last one
        const newCandle = {
          time: candleTime,
          open: Number(tradePrice),
          high: Number(tradePrice),
          low: Number(tradePrice),
          close: Number(tradePrice),
        };

        return {
          ...state,
          currentPrice: tradePrice,
          candleData: [...state.candleData, newCandle],
        };
      }
      return state;
    default:
      return state;
  }
}
function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(
    !!localStorage.getItem("token"),
  );
  const [userEmail, setUserEmail] = useState<string>("");
  type AccountSummary = {
    balance: number;
    equity: number;
    freeMargin: number;
    totalMarginUsed: number;
    totalUnrealizedPnl: number;
  };
  const [accountSummary, setAccountSummary] = useState<AccountSummary | null>(
    null,
  );
  const [quantity] = useState<number>(0.001);
  const [margin] = useState<number | undefined>(undefined);
  const [leverage] = useState<number>(1);
  const [stopLoss] = useState<number | undefined>(undefined);
  const [takeProfit] = useState<number | undefined>(undefined);
  const [tradeError, setTradeError] = useState<string | null>(null);

  const handleAuthSuccess = () => {
    setIsLoggedIn(true);
    fetchAccountSummary();
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    setUserEmail("");
    setAccountSummary(null);
  };

  const fetchAccountSummary = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await fetch(API_ENDPOINTS.ACCOUNT_SUMMARY, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAccountSummary(data);
      }
    } catch (error) {
      console.error("Error fetching balance:", error);
    }
  };

  const handleTrade = async (type: "buy" | "sell", data: any) => {
    const token = localStorage.getItem("token");
    setTradeError(null); // Clear previous errors
    if (!token) {
      toast.error("Please log in to place a trade.");
      return;
    }

    try {
      const response = await fetch(API_ENDPOINTS.TRADE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type,
          symbol: data.symbol || state.symbol,
          quantity: data.quantity || quantity,
          margin: data.margin || margin,
          leverage: data.leverage || leverage,
          stopLoss: data.stopLoss || stopLoss,
          takeProfit: data.takeProfit || takeProfit,
        }),
      });

      if (response.ok) {
        setTradeError(null); // Clear any previous errors on success
        toast.success(`${type.toUpperCase()} order placed successfully!`, {
          description: `${state.symbol} trade executed`,
        });
        fetchAccountSummary(); // Refresh account summary after trade
      } else {
        let errorMessage = "An unknown error occurred.";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (jsonError) {
          // If response is not JSON, try to get plain text or use generic message
          errorMessage = (await response.text()) || errorMessage;
        }
        setTradeError(errorMessage); // Set error message
        toast.error("Trade failed", { description: errorMessage });
      }
    } catch (error) {
      console.error("Error placing trade:", error);
      setTradeError("Network error or server is unreachable."); // Set network error
      toast.error("Network error", { description: "Server is unreachable" });
    }
  };

  useEffect(() => {
    // Check for token on initial load
    if (localStorage.getItem("token")) {
      setIsLoggedIn(true);
      fetchAccountSummary();
    }

    fetch(`${API_ENDPOINTS.CANDLES(state.symbol)}?interval=${state.interval}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.data) {
          const transformedData = data.data
            .map((item: any) => ({
              time: new Date(item.bucket).getTime() / 1000,
              open: parseFloat(item.open),
              high: parseFloat(item.high),
              low: parseFloat(item.low),
              close: parseFloat(item.close),
            }))
            .filter(
              (item: any) =>
                !isNaN(item.time) &&
                !isNaN(item.open) &&
                !isNaN(item.high) &&
                !isNaN(item.low) &&
                !isNaN(item.close) &&
                item.time > 0,
            )
            .sort((a: any, b: any) => a.time - b.time);

          dispatch({ type: "SET_CANDLES", payload: transformedData });
        }
      });

    // WebSocket for real-time bid/ask updates
    const ws = new WebSocket(WS_URL);

    ws.onopen = () =>
      console.log("Connected to WebSocket server for bid/ask updates");

    ws.onmessage = (event) => {
      try {
        let data = JSON.parse(event.data as string);
        console.log("Raw WebSocket message:", event.data);
        console.log("Parsed WebSocket data:", data);

        // Handle wrapped format {channel: ..., data: ...}
        if (data.channel && data.data) {
          console.log("Detected wrapped format, channel:", data.channel);

          // Only process bid_ask_updates channel
          if (data.channel === "bid_ask_updates") {
            data = data.data; // Extract the actual data
          } else {
            // Ignore other channels (like unrealized_pnl_updates)
            return;
          }
        }

        if (data.symbol && data.bid && data.ask) {
          dispatch({
            type: "SET_BID_ASK",
            payload: {
              symbol: data.symbol,
              bid: parseFloat(data.bid).toFixed(2),
              ask: parseFloat(data.ask).toFixed(2),
            },
          });

          if (data.symbol.toLowerCase() === state.symbol.toLowerCase()) {
            const midPrice = (parseFloat(data.bid) + parseFloat(data.ask)) / 2;
            dispatch({
              type: "UPDATE_CURRENT_PRICE",
              payload: midPrice,
            });
          }
        }

        if (data.symbol && data.tradePrice && data.tradeTime) {
          const incomingSymbol = data.symbol.toLowerCase();
          const currentSymbol = state.symbol.toLowerCase();

          if (incomingSymbol === currentSymbol) {
            console.log("Dispatching UPDATE_LAST_CANDLE with:", {
              symbol: incomingSymbol,
              tradePrice: data.tradePrice,
              tradeTime: data.tradeTime,
              candleDataLength: state.candleData.length,
            });

            dispatch({
              type: "UPDATE_LAST_CANDLE",
              payload: {
                tradePrice: parseFloat(data.tradePrice),
                tradeTime: parseInt(data.tradeTime),
              },
            });
          }
        }
      } catch (error) {
        console.error("Error processing WebSocket message:", error, event.data);
      }
    };

    ws.onclose = () => console.log("Disconnected from WebSocket server");
    ws.onerror = (error) => console.error("WebSocket error:", error);

    // Set up interval to fetch balance every 5 seconds
    const summaryInterval = setInterval(fetchAccountSummary, 5000);

    return () => {
      ws.close();
      clearInterval(summaryInterval);
    };
  }, [state.symbol, state.interval]);

  return (
    <>
      {!isLoggedIn ? (
        <LandingPage onAuthSuccess={handleAuthSuccess} />
      ) : (
        <TradingDashboard
          symbol={state.symbol}
          interval={state.interval}
          prices={state.prices}
          currentPrice={state.currentPrice}
          accountSummary={accountSummary}
          candleData={state.candleData}
          onTrade={handleTrade}
          tradeError={tradeError}
          onSymbolChange={(symbol) =>
            dispatch({ type: "SET_SYMBOL", payload: symbol })
          }
          onIntervalChange={(interval) =>
            dispatch({ type: "SET_INTERVAL", payload: interval })
          }
          onLogout={handleLogout}
          userEmail={userEmail}
          token={localStorage.getItem("token")}
        />
      )}
    </>
  );
}

export default App;
