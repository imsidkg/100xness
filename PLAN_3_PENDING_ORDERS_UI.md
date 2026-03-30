# Feature Plan 3: Pending Orders UI Tab

## Problem

Once Limit & Stop orders are implemented (Plan 2), the frontend needs a dedicated **Pending Orders** tab to display, monitor, and manage orders that haven't been filled yet. Currently, the `Trades.tsx` component only has "Open" and "Closed" tabs.

> **Dependency**: This plan builds directly on top of Plan 2 (Limit & Stop Orders). The backend routes `GET /pending` and `POST /cancel` must exist before this UI can function.

## Scope of Changes

### 1. Frontend — API Config (`src/config/api.ts`)

- Add:
  - `TRADE_PENDING: BASE_URL + '/api/v1/trade/pending'`
  - `TRADE_CANCEL: BASE_URL + '/api/v1/trade/cancel'`

### 2. Frontend — Trades Component (`src/components/Trades.tsx`)

#### State Changes

- Expand `activeTab` type from `"open" | "closed"` to `"open" | "pending" | "closed"`.
- Add `pendingTrades` state: `useState<Trade[]>([])`.

#### Data Fetching

- New `fetchPendingTrades()` function:
  - `GET` from `API_ENDPOINTS.TRADE_PENDING` with auth header.
  - Parse and set `pendingTrades`.
- New `cancelPendingOrder(orderId: string)` function:
  - `POST` to `API_ENDPOINTS.TRADE_CANCEL` with `{ orderId }`.
  - On success, show toast and refresh pending trades.
- Call `fetchPendingTrades()` in the existing `useEffect` hooks when `activeTab === "pending"`.

#### UI — Tab Bar

- Add a third tab button between Open and Closed:
  ```
  Pending Orders ({pendingTrades.length})
  ```

#### UI — Pending Orders Table

Columns:
| Column | Source |
|--------|--------|
| Symbol | `trade.symbol` |
| Type | `trade.type` (BUY/SELL) |
| Order Type | `trade.order_type` (Limit/Stop) |
| Limit Price | `trade.limit_price` |
| Quantity | `trade.quantity` |
| Margin | `trade.margin` |
| Leverage | `trade.leverage` |
| Stop Loss | `trade.stop_loss` |
| Take Profit | `trade.take_profit` |
| Created | `trade.created_at` |
| Actions | Cancel button |

#### Real-Time Updates

- In the WebSocket `onmessage` handler, listen for a `pending_order_filled` channel event.
- When received, remove the filled order from `pendingTrades` and refresh `openTrades`.

### 3. Frontend — TradingDashboard (`src/components/TradingDashboard.tsx`)

- No changes needed beyond what Plan 2 already covers (order type selector + limit price input).
- After placing a limit/stop order, trigger `tradesRefreshTrigger` to update the Pending tab.

## File Change Summary

| File                                 | Action | Description                                                    |
| ------------------------------------ | ------ | -------------------------------------------------------------- |
| `frontend/src/config/api.ts`         | MODIFY | Add `TRADE_PENDING` and `TRADE_CANCEL` endpoints               |
| `frontend/src/components/Trades.tsx` | MODIFY | Add pending tab, fetch/cancel logic, table, WebSocket listener |

## Verification

- Place a Limit order → switch to "Pending Orders" tab → verify the order appears with all columns.
- Click "Cancel" on a pending order → verify it disappears and margin returns to balance.
- When a pending order fills (price hits target) → verify it moves from Pending to Open tab automatically.
- Verify tab counts update correctly in all scenarios.
