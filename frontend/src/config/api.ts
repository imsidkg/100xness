// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
export const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3002';

// API Endpoints
export const API_ENDPOINTS = {
  // Auth
  SIGNUP: `${API_BASE_URL}/api/v1/user/signup`,
  SIGNIN: `${API_BASE_URL}/api/v1/user/signin`,
  ACCOUNT_SUMMARY: `${API_BASE_URL}/api/v1/user/account-summary`,
  
  // Trades
  TRADE: `${API_BASE_URL}/api/v1/trade`,
  TRADE_OPEN: `${API_BASE_URL}/api/v1/trade/open`,
  TRADE_CLOSED: `${API_BASE_URL}/api/v1/trade/closed`,
  TRADE_CLOSE: `${API_BASE_URL}/api/v1/trade/close`,
  
  // Candles
  CANDLES: (symbol: string) => `${API_BASE_URL}/candles/${symbol}`,
};

// WebSocket URL
export const WS_URL = WS_BASE_URL;
