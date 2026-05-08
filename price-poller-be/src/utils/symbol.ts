export const normalizeSymbol = (symbol: string): string =>
  symbol.trim().replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
