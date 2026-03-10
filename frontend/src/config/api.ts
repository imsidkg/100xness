export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001";
export const WS_BASE_URL = import.meta.env.VITE_WS_URL || "ws://localhost:3002";

export const API_ENDPOINTS = {
  SIGNUP: `${API_BASE_URL}/api/v1/user/signup`,
  SIGNIN: `${API_BASE_URL}/api/v1/user/signin`,
  ACCOUNT_SUMMARY: `${API_BASE_URL}/api/v1/user/account-summary`,
  DEPOSIT: `${API_BASE_URL}/api/v1/user/deposit`,

  TRADE: `${API_BASE_URL}/api/v1/trade`,
  TRADE_OPEN: `${API_BASE_URL}/api/v1/trade/open`,
  TRADE_CLOSED: `${API_BASE_URL}/api/v1/trade/closed`,
  TRADE_CLOSE: `${API_BASE_URL}/api/v1/trade/close`,
  TRADE_PENDING: `${API_BASE_URL}/api/v1/trade/pending`,
  TRADE_CANCEL: `${API_BASE_URL}/api/v1/trade/cancel`,

  CANDLES: (symbol: string) => `${API_BASE_URL}/candles/${symbol}`,
};

export const WS_URL = WS_BASE_URL;
