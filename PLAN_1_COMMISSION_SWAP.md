# Feature Plan 1: Commission & Swap Fields

## Problem

The current `trades` table and `Trade` model have no concept of **commission** (trading fee charged on entry/exit) or **swap** (overnight funding fee). These are standard fields in any real trading engine and are needed for the Order History section.

## Scope of Changes

### 1. Database Schema (`src/db/init.ts`)

- Add two new columns to the `trades` table:
  - `commission DOUBLE PRECISION DEFAULT 0` — fee charged when the trade is opened/closed.
  - `swap DOUBLE PRECISION DEFAULT 0` — accumulated overnight funding fee.
- Add safe migration logic (like the existing `stop_loss` / `take_profit` pattern): check if columns exist, `ALTER TABLE` if not.

### 2. Trade Model (`src/models/trade.ts`)

- Add `commission?: number` and `swap?: number` to the `Trade` interface.

### 3. Trade Service (`src/services/tradeService.ts`)

#### Commission Calculation

- Define a `COMMISSION_RATE` constant (e.g., `0.001` = 0.1% per side).
- In `createTrade()`: calculate commission as `quantity * entryPrice * COMMISSION_RATE`, store it in the `INSERT` query.
- In `closeTrade()`: calculate exit-side commission, add it to the existing `commission` value, and subtract total commission from `realized_pnl` before crediting balance.

#### Swap Calculation

- Define a `DAILY_SWAP_RATE` constant (e.g., `0.0001` = 0.01% per day).
- Create a new function `applySwapCharges()`:
  1. Query all `status = 'open'` trades.
  2. For each trade, calculate hours held since `created_at` (or last swap charge time).
  3. If held overnight (crosses 00:00 UTC), apply `swap = quantity * entryPrice * DAILY_SWAP_RATE`.
  4. Update the `swap` column on the trade row.
  5. Deduct the swap amount from the user's balance.

### 4. Swap Worker

- Add a call to `applySwapCharges()` in the existing `pnlWorker.ts` cycle, or create a dedicated interval that runs once per hour to check for overnight crossings.

### 5. Trade Controller (`src/controllers/tradeController.ts`)

- `getClosedTradesForUser`: ensure the response includes `commission` and `swap` fields from the DB rows (no transformation needed if returning `*`).
- `getOpenTradesForUser`: include `swap` in the formatted response so users can see accumulated swap on open positions.

### 6. Frontend — Trades Component (`src/components/Trades.tsx`)

- Add `commission` and `swap` to the `Trade` interface.
- **Open Trades table**: add a `Swap` column showing live accumulated swap.
- **Closed Trades table**: add `Commission` and `Swap` columns.

## File Change Summary

| File                                                 | Action | Description                                               |
| ---------------------------------------------------- | ------ | --------------------------------------------------------- |
| `price-poller-be/src/db/init.ts`                     | MODIFY | Add `commission` and `swap` columns + migration           |
| `price-poller-be/src/models/trade.ts`                | MODIFY | Add fields to `Trade` interface                           |
| `price-poller-be/src/services/tradeService.ts`       | MODIFY | Commission calc in create/close, new `applySwapCharges()` |
| `price-poller-be/src/workers/pnlWorker.ts`           | MODIFY | Hook swap charge logic into the worker cycle              |
| `price-poller-be/src/controllers/tradeController.ts` | MODIFY | Include commission/swap in API responses                  |
| `frontend/src/components/Trades.tsx`                 | MODIFY | Add Commission & Swap columns to both tables              |

## Verification

- Open a trade → verify `commission` is computed and stored in DB.
- Hold a trade past midnight UTC → verify `swap` is applied and balance deducted.
- Close a trade → verify `realized_pnl` accounts for commission.
- Check the Closed Trades UI table for Commission and Swap columns populated correctly.
