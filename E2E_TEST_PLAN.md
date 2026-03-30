# End-to-End Test Plan — Exness Trading Platform

## 1. Authentication

| #   | Test Case                       | Steps                                        | Expected Result                                                          |
| --- | ------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------ |
| 1.1 | **Sign Up — Happy Path**        | Enter valid email + password → click Sign Up | Account created, JWT returned, balance = $5,000, redirected to dashboard |
| 1.2 | **Sign Up — Duplicate Email**   | Sign up with an already-registered email     | Error: "User with this email already exists"                             |
| 1.3 | **Sign Up — Missing Fields**    | Submit with empty email or password          | Error: "Email and password are required"                                 |
| 1.4 | **Sign In — Happy Path**        | Enter valid credentials → click Sign In      | JWT returned, balance shown, redirected to dashboard                     |
| 1.5 | **Sign In — Wrong Password**    | Enter correct email, wrong password          | Error: "Incorrect credentials"                                           |
| 1.6 | **Sign In — Non-existent User** | Enter unregistered email                     | Error: "Incorrect credentials"                                           |
| 1.7 | **JWT Expiry**                  | Wait for token to expire → make API call     | 401 Unauthorized, user redirected to login                               |
| 1.8 | **Logout**                      | Click user avatar → Logout                   | Token cleared, redirected to login page                                  |

---

## 2. Dashboard & Real-Time Data

| #   | Test Case              | Steps                                                   | Expected Result                                                           |
| --- | ---------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------- |
| 2.1 | **Live Price Feed**    | Log in → observe Market Data table                      | BTC, ETH, SOL bid/ask prices update in real-time via WebSocket            |
| 2.2 | **Symbol Switching**   | Select different symbol from dropdown (e.g., ETH → BTC) | Chart updates, price card updates, trade execution targets the new symbol |
| 2.3 | **Candlestick Chart**  | Load dashboard → check chart                            | Candlestick chart renders with correct OHLC data                          |
| 2.4 | **Interval Switching** | Change chart interval (1m → 5m → 1h)                    | Chart re-renders with new interval candles                                |
| 2.5 | **Account Summary**    | Check header bar                                        | Balance, Equity, and Margin values are displayed and accurate             |

---

## 3. Market Orders

| #   | Test Case                | Steps                                               | Expected Result                                                      |
| --- | ------------------------ | --------------------------------------------------- | -------------------------------------------------------------------- |
| 3.1 | **BUY Market Order**     | Select "Market" → enter quantity 0.001 → click BUY  | Trade created, appears in Open Trades tab, balance reduced by margin |
| 3.2 | **SELL Market Order**    | Select "Market" → enter quantity 0.001 → click SELL | Trade created, appears in Open Trades tab                            |
| 3.3 | **With Leverage**        | Set leverage to 10x → place trade                   | Margin = (price × quantity) / 10, trade shows 10x leverage           |
| 3.4 | **With Stop Loss**       | Set SL → place market order                         | Trade appears with SL value in Open Trades                           |
| 3.5 | **With Take Profit**     | Set TP → place market order                         | Trade appears with TP value in Open Trades                           |
| 3.6 | **With Custom Margin**   | Enter specific margin → place trade                 | Quantity auto-calculated based on margin                             |
| 3.7 | **Insufficient Balance** | Try to place order with margin > available balance  | Error: "Insufficient funds to cover margin"                          |
| 3.8 | **Close Market Trade**   | Open Trades → click "Close" on an open trade        | Trade moves to Closed Trades, balance updated with realized PnL      |

---

## 4. Limit Orders

| #   | Test Case                  | Steps                                                                       | Expected Result                                                                 |
| --- | -------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 4.1 | **Place Limit BUY**        | Select "Limit" → set limit price below current ask → BUY                    | Order appears in Pending Orders tab with status `pending`                       |
| 4.2 | **Place Limit SELL**       | Select "Limit" → set limit price above current bid → SELL                   | Order appears in Pending Orders tab                                             |
| 4.3 | **Limit Price Validation** | Select "Limit" but leave limit price empty                                  | Error: limit price is required                                                  |
| 4.4 | **Limit Order Fills**      | Place a limit BUY with price near current → wait for price to drop to limit | Order moves from Pending to Open Trades, WebSocket `pending_order_filled` fires |
| 4.5 | **Cancel Limit Order**     | Pending Orders tab → click "Cancel"                                         | Order removed from Pending, margin refunded to balance                          |

---

## 5. Stop Orders

| #   | Test Case             | Steps                                                   | Expected Result                                              |
| --- | --------------------- | ------------------------------------------------------- | ------------------------------------------------------------ |
| 5.1 | **Place Stop BUY**    | Select "Stop" → set stop price above current ask → BUY  | Order appears in Pending Orders tab                          |
| 5.2 | **Place Stop SELL**   | Select "Stop" → set stop price below current bid → SELL | Order appears in Pending Orders tab                          |
| 5.3 | **Stop Order Fills**  | Place stop order near current price → wait              | Order fills when price hits stop level, moves to Open Trades |
| 5.4 | **Cancel Stop Order** | Pending Orders tab → click "Cancel"                     | Order removed, margin refunded                               |

---

## 6. Pending Orders Tab

| #   | Test Case               | Steps                                        | Expected Result                                                                                                          |
| --- | ----------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 6.1 | **View Pending Orders** | Click "Pending Orders" tab                   | Table displays with columns: Symbol, Type, Order Type, Limit Price, Quantity, Margin, Leverage, SL, TP, Created, Actions |
| 6.2 | **Count Badge**         | Place 2 pending orders                       | Tab shows "Pending Orders (2)"                                                                                           |
| 6.3 | **Cancel Action**       | Click Cancel on a pending order              | Order removed, toast success shown, count decremented                                                                    |
| 6.4 | **Real-time Fill**      | Have a pending order fill via backend worker | Order disappears from Pending, appears in Open Trades without page refresh                                               |
| 6.5 | **Empty State**         | No pending orders exist                      | "No pending orders" message displayed                                                                                    |

---

## 7. Open Trades Tab

| #   | Test Case               | Steps                                         | Expected Result                                                                                                                   |
| --- | ----------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 7.1 | **View Open Trades**    | Click "Open Trades" tab                       | Table displays with: Symbol, Order Type, Position, Entry Price, Quantity, Margin, Leverage, Swap, SL, TP, Unrealized PnL, Actions |
| 7.2 | **Live Unrealized PnL** | Open a trade → observe PnL column             | PnL updates in real-time as price changes (green for profit, red for loss)                                                        |
| 7.3 | **Close Trade**         | Click "Close" button                          | Trade closed at current price, moves to Closed Trades                                                                             |
| 7.4 | **Stop Loss Trigger**   | Open BUY trade with SL → price drops below SL | Trade auto-closed by backend, removed from Open Trades                                                                            |
| 7.5 | **Take Profit Trigger** | Open BUY trade with TP → price rises above TP | Trade auto-closed, realized PnL reflects TP exit                                                                                  |
| 7.6 | **Liquidation**         | Open trade → PnL drops below -margin          | Trade auto-liquidated, status = "liquidated" in Closed Trades                                                                     |

---

## 8. Closed Trades / Order History Tab

| #   | Test Case                | Steps                                  | Expected Result                                                                                                                                      |
| --- | ------------------------ | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 8.1 | **View 16-Column Table** | Click "Closed Trades" tab              | All 16 columns visible: Order ID, Open Time, Symbol, Order Type, Type, Lot, Leverage, SL, TP, Entry, Exit, Commission, Swap, PnL, Status, Close Time |
| 8.2 | **Order ID Tooltip**     | Hover over truncated Order ID          | Full UUID shown in tooltip                                                                                                                           |
| 8.3 | **Date Formatting**      | Check Open Time and Close Time columns | Dates formatted as localized date-time strings                                                                                                       |
| 8.4 | **PnL Color Coding**     | Check PnL column                       | Green for profit, red for loss                                                                                                                       |
| 8.5 | **Commission Display**   | Check Commission column                | Shows negative value (cost) or $0.00                                                                                                                 |
| 8.6 | **Swap Display**         | Check Swap column for overnight trades | Shows accumulated swap fee or $0.00                                                                                                                  |
| 8.7 | **Status Badge**         | Check Status column                    | "closed" = gray badge, "liquidated" = red badge                                                                                                      |
| 8.8 | **Horizontal Scroll**    | Resize browser to narrow width         | Table scrolls horizontally, all columns accessible                                                                                                   |

---

## 9. Commission & Swap (Background Workers)

| #   | Test Case                | Steps                           | Expected Result                                                      |
| --- | ------------------------ | ------------------------------- | -------------------------------------------------------------------- |
| 9.1 | **Commission on Open**   | Place a market order            | Commission = 0.1% of (entry_price × quantity), deducted from balance |
| 9.2 | **Commission on Close**  | Close a trade                   | Commission charged on close, reflected in Closed Trades              |
| 9.3 | **Swap Accrual**         | Keep a trade open for >1 hour   | Swap field increments in Open Trades table                           |
| 9.4 | **Swap in Closed Trade** | Close a trade that accrued swap | Swap amount shown in Closed Trades                                   |

---

## 10. WebSocket Real-Time Events

| #    | Test Case                    | Steps                             | Expected Result                                                        |
| ---- | ---------------------------- | --------------------------------- | ---------------------------------------------------------------------- |
| 10.1 | **Price Streaming**          | Connect to `ws://localhost:3002`  | Receive continuous `bid_ask_updates` messages for subscribed symbols   |
| 10.2 | **Pending Order Fill Event** | Have a pending order fill         | WebSocket broadcasts `pending_order_filled` with orderId and fillPrice |
| 10.3 | **Reconnection**             | Kill and restart WebSocket server | Frontend reconnects and resumes price updates                          |
| 10.4 | **Multi-tab Sync**           | Open app in 2 browser tabs        | Both tabs receive price updates simultaneously                         |

---

## 11. Edge Cases & Error Handling

| #    | Test Case                       | Steps                                      | Expected Result                                                         |
| ---- | ------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------- |
| 11.1 | **Zero Quantity**               | Try to place trade with quantity = 0       | Validation error                                                        |
| 11.2 | **Negative Leverage**           | Try leverage = -5                          | Validation error                                                        |
| 11.3 | **Backend Down**                | Stop backend → try to place trade          | Frontend shows "Network error" gracefully                               |
| 11.4 | **DB Connection Lost**          | Stop Postgres → perform action             | Backend logs error, returns 500                                         |
| 11.5 | **Redis Down**                  | Stop Redis → check price feed              | WebSocket stops updating, backend logs Redis errors                     |
| 11.6 | **Concurrent Trades**           | Rapidly place 5 trades in quick succession | All trades processed correctly, balance accurately reflects all margins |
| 11.7 | **Cancel Already-Filled Order** | Try to cancel an order that just filled    | Error: order not found or already filled                                |
