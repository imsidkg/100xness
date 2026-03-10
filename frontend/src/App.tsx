import { useEffect, useReducer, useState, useRef } from "react";
import { LandingPage } from "./components/LandingPage";
import TradingDashboard from "./components/TradingDashboard";
import { API_ENDPOINTS, WS_URL } from "./config/api";
import { toast } from "sonner";

// ============================================================
// MOCK DATA — Used when backend is offline
// ============================================================
const MOCK_PRICES: Record<string, { bid: number; ask: number; spread: number }> = {
  BTCUSDT: { bid: 68533.32, ask: 68551.32, spread: 18 },
  ETHUSDT: { bid: 2016.04, ask: 2017.44, spread: 1.4 },
  SOLUSDT: { bid: 84.718, ask: 84.764, spread: 0.046 },
  XAUUSD: { bid: 5181.400, ask: 5181.752, spread: 0.352 },
  USDJPY: { bid: 149.852, ask: 149.874, spread: 0.022 },
  EURUSD: { bid: 1.08432, ask: 1.08456, spread: 0.00024 },
  USOIL: { bid: 71.34, ask: 71.39, spread: 0.05 },
};

/** Format a price with appropriate decimal places based on magnitude */
function fmtPrice(val: number): string {
  if (val >= 10000) return val.toFixed(2);
  if (val >= 100) return val.toFixed(3);
  if (val >= 1) return val.toFixed(5);
  return val.toFixed(6);
}

function generateMockCandles(symbol: string, interval: string, count = 120) {
  const base = MOCK_PRICES[symbol]?.bid || 68000;
  const now = Math.floor(Date.now() / 1000);
  let intervalSec = 60;
  if (interval === "5m") intervalSec = 300;
  else if (interval === "10m") intervalSec = 600;
  else if (interval === "1h") intervalSec = 3600;

  const candles = [];
  let price = base * (1 - 0.005); // start slightly below current
  for (let i = count; i > 0; i--) {
    const volatility = base * 0.001; // 0.1% volatility
    const open = price;
    const rand1 = (Math.random() - 0.48) * volatility;
    const rand2 = (Math.random() - 0.48) * volatility;
    const close = open + rand1;
    const high = Math.max(open, close) + Math.abs(rand2) * 0.5;
    const low = Math.min(open, close) - Math.abs(rand2) * 0.5;
    price = close;

    candles.push({
      time: now - i * intervalSec,
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
    });
  }
  return candles;
}

function tickPrice(
  current: number,
  baseVolatility: number
): number {
  const change = (Math.random() - 0.5) * baseVolatility;
  return parseFloat((current + change).toFixed(6));
}

// ============================================================
// STATE
// ============================================================
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

const symbolOptions = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "XAUUSD" ,"USDJPY", "EURUSD", "USOIL"];

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
      if (!tradePrice || !tradeTime || isNaN(tradePrice) || isNaN(tradeTime)) {
        return state;
      }
      // Don't update candles if we haven't loaded initial data yet
      if (state.candleData.length === 0) {
        return { ...state, currentPrice: tradePrice };
      }

      const intervalString = state.interval;
      let intervalSeconds = 60;
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
        const open = Number(lastCandle.open);
        const high = Number(Math.max(lastCandle.high, tradePrice));
        const low = Number(Math.min(lastCandle.low, tradePrice));
        const close = Number(tradePrice);

        if (isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close)) {
          return state;
        }

        const updatedCandle = { time: candleTime, open, high, low, close };
        return {
          ...state,
          currentPrice: tradePrice,
          candleData: [...state.candleData.slice(0, -1), updatedCandle],
        };
      } else if (candleTime > (lastCandle?.time || 0)) {
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

// ============================================================
// APP
// ============================================================
function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(
    !!localStorage.getItem("token")
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
    null
  );
  const [tradeError, setTradeError] = useState<string | null>(null);
  const [isBackendOnline, setIsBackendOnline] = useState<boolean>(true);
  const mockPricesRef = useRef<Record<string, { bid: number; ask: number }>>({});
  const symbolRef = useRef(state.symbol);

  // Keep symbolRef in sync with current symbol
  useEffect(() => {
    symbolRef.current = state.symbol;
  }, [state.symbol]);

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
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setAccountSummary(data);
      }
    } catch {
      // Backend offline — use mock account
      if (!accountSummary) {
        setAccountSummary({
          balance: 9967.92,
          equity: 9967.92,
          freeMargin: 9967.92,
          totalMarginUsed: 0,
          totalUnrealizedPnl: 0,
        });
      }
    }
  };

  const handleTrade = async (type: "buy" | "sell", data: any) => {
    const token = localStorage.getItem("token");
    setTradeError(null);
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
          quantity: data.quantity || 0.001,
          margin: data.margin,
          leverage: data.leverage || 1,
          stopLoss: data.stopLoss,
          takeProfit: data.takeProfit,
          orderType: data.orderType || "market",
          limitPrice: data.limitPrice,
        }),
      });
      if (response.ok) {
        setTradeError(null);
        toast.success(`${type.toUpperCase()} order placed successfully!`, {
          description: `${state.symbol} trade executed`,
        });
        fetchAccountSummary();
      } else {
        let errorMessage = "An unknown error occurred.";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = (await response.text()) || errorMessage;
        }
        setTradeError(errorMessage);
        toast.error("Trade failed", { description: errorMessage });
      }
    } catch {
      // If backend is offline, show a demo toast instead of error
      if (!isBackendOnline) {
        toast.info(`${type.toUpperCase()} order simulated (demo mode)`, {
          description: `${state.symbol} @ ${state.currentPrice?.toFixed(2) || "N/A"}`,
        });
      } else {
        setTradeError("Network error or server is unreachable.");
        toast.error("Network error", { description: "Server is unreachable" });
      }
    }
  };

  // ---- MAIN EFFECT: fetch data + WebSocket ----
  useEffect(() => {
    if (localStorage.getItem("token")) {
      setIsLoggedIn(true);
      fetchAccountSummary();
    }

    let wsConnected = false;
    let useMockData = false;

    // Try fetching candle data from backend
    fetch(`${API_ENDPOINTS.CANDLES(state.symbol)}?interval=${state.interval}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.data && data.data.length > 0) {
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
                item.time > 0
            )
            .sort((a: any, b: any) => a.time - b.time);
          dispatch({ type: "SET_CANDLES", payload: transformedData });
          setIsBackendOnline(true);
        } else {
          throw new Error("No data");
        }
      })
      .catch(() => {
        // Backend offline → use mock candle data IMMEDIATELY
        useMockData = true;
        setIsBackendOnline(false);
        const mockCandles = generateMockCandles(state.symbol, state.interval);
        dispatch({ type: "SET_CANDLES", payload: mockCandles });
        startMockTicker(); // Start prices immediately
      });

    // Try WebSocket connection for live prices
    const ws = new WebSocket(WS_URL);
    const wsTimeout = setTimeout(() => {
      if (!wsConnected && !mockTickerStarted) {
        startMockTicker();
      }
    }, 1500);

    ws.onopen = () => {
      wsConnected = true;
      setIsBackendOnline(true);
      clearTimeout(wsTimeout);
    };

    ws.onmessage = (event) => {
      try {
        let data = JSON.parse(event.data as string);
        if (data.channel && data.data) {
          if (data.channel === "bid_ask_updates") {
            data = data.data;
          } else {
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
          if (data.symbol.toLowerCase() === symbolRef.current.toLowerCase()) {
            const midPrice =
              (parseFloat(data.bid) + parseFloat(data.ask)) / 2;
            dispatch({ type: "UPDATE_CURRENT_PRICE", payload: midPrice });
          }
        }
        if (data.symbol && data.tradePrice && data.tradeTime) {
          const incomingSymbol = data.symbol.toLowerCase();
          const currentSymbol = symbolRef.current.toLowerCase();
          if (incomingSymbol === currentSymbol) {
            dispatch({
              type: "UPDATE_LAST_CANDLE",
              payload: {
                tradePrice: parseFloat(data.tradePrice),
                tradeTime: parseInt(data.tradeTime),
              },
            });
          }
        }
      } catch { }
    };

    ws.onclose = () => {
      if (!wsConnected && !useMockData) {
        startMockTicker();
      }
    };
    ws.onerror = () => {
      if (!wsConnected) {
        startMockTicker();
      }
    };

    // ---- MOCK TICKER when backend is offline ----
    let mockInterval: ReturnType<typeof setInterval> | null = null;
    let mockTickerStarted = false;

    function startMockTicker() {
      if (mockTickerStarted) return;
      mockTickerStarted = true;
      setIsBackendOnline(false);

      // Initialize mock prices
      for (const [sym, p] of Object.entries(MOCK_PRICES)) {
        mockPricesRef.current[sym] = { bid: p.bid, ask: p.ask };
        dispatch({
          type: "SET_BID_ASK",
          payload: {
            symbol: sym,
            bid: fmtPrice(p.bid),
            ask: fmtPrice(p.ask),
          },
        });
      }

      // Set initial current price
      const curr = MOCK_PRICES[symbolRef.current];
      if (curr) {
        dispatch({
          type: "UPDATE_CURRENT_PRICE",
          payload: (curr.bid + curr.ask) / 2,
        });
      }

      // Set up mock account if needed
      if (!accountSummary) {
        setAccountSummary({
          balance: 9967.92,
          equity: 9967.92,
          freeMargin: 9967.92,
          totalMarginUsed: 0,
          totalUnrealizedPnl: 0,
        });
      }

      // If we haven't loaded candles yet, generate mock
      if (useMockData) {
        const mockCandles = generateMockCandles(state.symbol, state.interval);
        dispatch({ type: "SET_CANDLES", payload: mockCandles });
      }

      // Tick prices every 1.5 seconds
      mockInterval = setInterval(() => {
        for (const [sym, p] of Object.entries(MOCK_PRICES)) {
          const current = mockPricesRef.current[sym] || { bid: p.bid, ask: p.ask };
          const volatility = p.bid * 0.0001; // 0.01% per tick
          const newBid = tickPrice(current.bid, volatility);
          const newAsk = parseFloat((newBid + p.spread).toFixed(6));
          mockPricesRef.current[sym] = { bid: newBid, ask: newAsk };

          dispatch({
            type: "SET_BID_ASK",
            payload: {
              symbol: sym,
              bid: fmtPrice(newBid),
              ask: fmtPrice(newAsk),
            },
          });

          if (sym.toLowerCase() === symbolRef.current.toLowerCase()) {
            const mid = (newBid + newAsk) / 2;
            dispatch({ type: "UPDATE_CURRENT_PRICE", payload: mid });
            dispatch({
              type: "UPDATE_LAST_CANDLE",
              payload: {
                tradePrice: mid,
                tradeTime: Date.now(),
              },
            });
          }
        }
      }, 1500);
    }

    const summaryInterval = setInterval(fetchAccountSummary, 5000);

    return () => {
      clearTimeout(wsTimeout);
      ws.close();
      if (mockInterval) clearInterval(mockInterval);
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
          onDepositSuccess={fetchAccountSummary}
          userEmail={userEmail}
          token={localStorage.getItem("token")}
        />
      )}
    </>
  );
}

export default App;
