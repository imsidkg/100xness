# Feature Plan 4: Enhanced Order History Table

## Problem

The current "Closed Trades" table is missing several important columns that a professional trading engine's order history section should display. Specifically, it lacks: **Order ID**, **Open Time**, **Lot (Quantity)**, **SL**, **TP**, **Commission**, and **Swap**.

> **Dependency**: Commission and Swap columns require Plan 1 to be complete. The other columns can be added independently since the data already exists in the backend.

## Current vs Target Columns

| #   | Column          | Current | Target | Data Source                          |
| --- | --------------- | ------- | ------ | ------------------------------------ |
| 1   | Order ID        | ❌      | ✅     | `trade.order_id` (truncated display) |
| 2   | Open Time       | ❌      | ✅     | `trade.created_at`                   |
| 3   | Symbol          | ✅      | ✅     | `trade.symbol`                       |
| 4   | Order Type      | ❌      | ✅     | `trade.order_type` (after Plan 2)    |
| 5   | Type (Buy/Sell) | ✅      | ✅     | `trade.type`                         |
| 6   | Lot (Quantity)  | ✅      | ✅     | `trade.quantity`                     |
| 7   | Leverage        | ✅      | ✅     | `trade.leverage`                     |
| 8   | SL              | ❌      | ✅     | `trade.stop_loss`                    |
| 9   | TP              | ❌      | ✅     | `trade.take_profit`                  |
| 10  | Entry Price     | ✅      | ✅     | `trade.entry_price`                  |
| 11  | Exit Price      | ✅      | ✅     | `trade.exit_price`                   |
| 12  | Commission      | ❌      | ✅     | `trade.commission` (after Plan 1)    |
| 13  | Swap            | ❌      | ✅     | `trade.swap` (after Plan 1)          |
| 14  | PnL             | ✅      | ✅     | `trade.realized_pnl`                 |
| 15  | Status          | ✅      | ✅     | `trade.status`                       |
| 16  | Close Time      | ✅      | ✅     | `trade.closed_at`                    |

## Scope of Changes

### 1. Backend — Trade Controller (`src/controllers/tradeController.ts`)

- `getClosedTradesForUser`: currently returns `SELECT *`, which already includes all fields. Ensure `created_at`, `stop_loss`, `take_profit`, `commission`, `swap`, and `order_type` are present in the response. No code change needed if `*` is used; just verify.

### 2. Frontend — Trades Component (`src/components/Trades.tsx`)

#### Update Trade Interface

Add any missing fields:

```typescript
interface Trade {
  order_id: string;
  type: "buy" | "sell";
  order_type?: "market" | "limit" | "stop";
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
```

#### Redesign the Closed Trades Table

- Replace the current 10-column table with the full 16-column layout from the target table above.
- Use a horizontally scrollable container (`overflow-x-auto`) since 16 columns is wide.
- Truncate `order_id` to first 8 characters with a tooltip showing the full ID.
- Format `created_at` and `closed_at` as localized date-time strings.
- Color-code PnL (green for profit, red for loss).
- Show Commission and Swap as negative values (costs) in a muted color.

#### Optional: Column Sort / Filter

- Add client-side sorting by clicking column headers (e.g., sort by close time, PnL, symbol).
- Add a symbol filter dropdown to filter history by trading pair.

## File Change Summary

| File                                 | Action | Description                                                                               |
| ------------------------------------ | ------ | ----------------------------------------------------------------------------------------- |
| `frontend/src/components/Trades.tsx` | MODIFY | Expand Trade interface, redesign closed trades table with all 16 columns, add sort/filter |

## Verification

- Close a trade → navigate to Closed Trades tab → verify all 16 columns are populated.
- Verify Order ID is truncated but full ID is visible on hover/tooltip.
- Verify Open Time and Close Time are both displayed and formatted correctly.
- Verify SL and TP show the values that were set when the trade was opened (or "-" if not set).
- Verify Commission and Swap show values (or `$0.00` if Plans 1 is not yet merged).
- Test horizontal scrolling on smaller viewports.
