# Feature Plan 2: Limit & Stop Order Support

## Problem

The engine currently only supports **market orders** — trades execute immediately at the current bid/ask price. There is no way to place a **Limit Order** (execute when price reaches a favorable level) or a **Stop Order** (execute when price hits a trigger level). These are fundamental order types for any trading platform.

## Order Type Definitions

- **Limit Buy**: Execute a buy when the ask price drops to or below the specified `limit_price`.
- **Limit Sell**: Execute a sell when the bid price rises to or above the specified `limit_price`.
- **Stop Buy**: Execute a buy when the ask price rises to or above the specified `stop_price` (breakout entry).
- **Stop Sell**: Execute a sell when the bid price drops to or below the specified `stop_price` (breakdown entry).

## Scope of Changes

### 1. Database Schema (`src/db/init.ts`)

- Add new columns to the `trades` table:
  - `order_type TEXT NOT NULL DEFAULT 'market'` — values: `'market'`, `'limit'`, `'stop'`.
  - `limit_price DOUBLE PRECISION` — the target price for limit/stop orders.
- Add a new trade status value: `'pending'` (alongside `'open'`, `'closed'`, `'liquidated'`).
- Add safe migration: check if columns exist before `ALTER TABLE`.

### 2. Trade Model (`src/models/trade.ts`)

- Update the `Trade` interface:
  - Add `order_type: 'market' | 'limit' | 'stop'`.
  - Add `limit_price?: number`.
  - Expand `status` to include `'pending'`.
- Update `NewTrade` interface to accept `order_type` and `limit_price`.

### 3. Global Type (`types.d.ts`)

- Update the `TradeRequest` interface to include `orderType` and `limitPrice` fields.

### 4. Trade Service (`src/services/tradeService.ts`)

- **`createTrade()`**:
  - Accept `order_type` and `limit_price` from the request.
  - If `order_type === 'market'` → existing behavior (immediate execution, status `'open'`).
  - If `order_type === 'limit'` or `'stop'` → insert with status `'pending'`, use `limit_price` instead of current market price for `entry_price` (leave `entry_price` NULL or 0 until filled), lock margin.
- **New `fillPendingOrder(trade, currentPrice)`**:
  - Sets `entry_price = currentPrice`, `status = 'open'`, `created_at = NOW()`.
  - This is called when conditions are met.
- **New `monitorPendingOrders()`**:
  - Query all trades with `status = 'pending'`.
  - For each pending trade, check against current prices:
    - Limit Buy: `askPrice <= trade.limit_price` → fill.
    - Limit Sell: `bidPrice >= trade.limit_price` → fill.
    - Stop Buy: `askPrice >= trade.limit_price` → fill.
    - Stop Sell: `bidPrice <= trade.limit_price` → fill.
  - Call `fillPendingOrder()` when conditions are met.
- **New `cancelPendingOrder(orderId)`**:
  - Sets `status = 'cancelled'`, releases the locked margin back to the user's balance.
- **`getUserOpenTrades()`**: Update query to also return `order_type` and `limit_price`.
- **`getClosedTrades()`**: Update to include `order_type`.

### 5. Trade Controller (`src/controllers/tradeController.ts`)

- **`tradeProcessor()`**:
  - Accept `orderType` and `limitPrice` from request body.
  - Validate: if `orderType` is `'limit'` or `'stop'`, `limitPrice` is required.
  - Pass through to the Redis queue.
- **`isTradeRequest()`**: Update validation to accept the new fields.
- **New `cancelOrder()`**: endpoint handler that calls `cancelPendingOrder()`.
- **New `getPendingOrdersForUser()`**: returns all pending orders for the user.

### 6. Trade Routes (`src/routes/tradeRoutes.ts`)

- Add new routes:
  - `GET /pending` → `getPendingOrdersForUser`
  - `POST /cancel` → `cancelOrder`

### 7. Trade Worker (`src/workers/tradeWorker.ts`)

- In the worker loop, after processing trade queue jobs:
  - Call `monitorPendingOrders()` on each tick to check if any pending orders should be filled.

### 8. WebSocket Server (`src/websockets/websocketServer.ts`)

- Broadcast a `pending_order_filled` event when a pending order transitions to `'open'`, so the frontend can update in real-time.

### 9. Frontend — API Config (`src/config/api.ts`)

- Add endpoints: `TRADE_PENDING`, `TRADE_CANCEL`.

### 10. Frontend — TradingDashboard (`src/components/TradingDashboard.tsx`)

- Add an **Order Type** selector (Market / Limit / Stop) in the Trade Execution card.
- Show a **Limit Price** input field when Limit or Stop is selected.
- Pass `orderType` and `limitPrice` in the trade request payload.

### 11. Frontend — Trades Component (`src/components/Trades.tsx`)

- Add `order_type` and `limit_price` to the `Trade` interface.
- Add a third tab: **Pending Orders**.
- Pending tab shows: Symbol, Type, Order Type, Limit Price, Quantity, Margin, Leverage, SL, TP, and a **Cancel** button.
- Open Trades table: add `Order Type` column (shows "Market", "Limit", or "Stop").

## File Change Summary

| File                                                 | Action | Description                                         |
| ---------------------------------------------------- | ------ | --------------------------------------------------- |
| `price-poller-be/src/db/init.ts`                     | MODIFY | Add `order_type`, `limit_price` columns + migration |
| `price-poller-be/src/models/trade.ts`                | MODIFY | Add fields, expand status union                     |
| `price-poller-be/types.d.ts`                         | MODIFY | Add `orderType`, `limitPrice` to `TradeRequest`     |
| `price-poller-be/src/services/tradeService.ts`       | MODIFY | Pending order logic, fill, cancel, monitor          |
| `price-poller-be/src/controllers/tradeController.ts` | MODIFY | New endpoints, validation updates                   |
| `price-poller-be/src/routes/tradeRoutes.ts`          | MODIFY | Add `/pending` and `/cancel` routes                 |
| `price-poller-be/src/workers/tradeWorker.ts`         | MODIFY | Call `monitorPendingOrders()` in loop               |
| `price-poller-be/src/websockets/websocketServer.ts`  | MODIFY | Broadcast fill events                               |
| `frontend/src/config/api.ts`                         | MODIFY | Add pending/cancel endpoints                        |
| `frontend/src/components/TradingDashboard.tsx`       | MODIFY | Order type selector + limit price input             |
| `frontend/src/components/Trades.tsx`                 | MODIFY | Pending tab, cancel button, order type column       |

## Verification

- Place a Limit Buy at a price below current ask → verify it stays "pending" and margin is locked.
- When ask drops to the limit price → verify the order fills to "open" with the correct entry price.
- Place a Stop Sell → verify it triggers when bid drops to the stop price.
- Cancel a pending order → verify margin is released and status is "cancelled".
- Check all 3 tabs (Open, Pending, Closed) display correctly in the UI.
