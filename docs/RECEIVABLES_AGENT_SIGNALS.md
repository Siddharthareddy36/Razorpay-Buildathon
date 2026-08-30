# Receivables Intelligence Agent — Deterministic Signals & Baseline Specification

## 1. Overview & Business Rationale

The **Receivables Intelligence Agent** relies on a 2-stage prioritization model:
1. **Deterministic Risk Signals & Baseline Score** (Computed in Python, 0--100 mathematical scale).
2. **Contextual LLM Reasoning** (Gemini 1.5 Pro / Flash).

This document specifies the deterministic signal calculation engine and baseline scoring formula.

---

## 2. Signal Definitions & Calculations

| Signal Field | Input Source | Calculation & Meaning |
|:---|:---|:---|
| `outstandingAmount` | `invoices.amount - invoices.paid_amount` | Remaining unpaid balance in INR |
| `daysOverdue` | `max(0, current_date - due_date)` | Number of days past due date |
| `averagePaymentDelayDays` | `customers.average_payment_delay_days` | Historical average payment delay for customer |
| `overdueInvoiceCount` | `customers.total_overdue_invoices` | Total overdue invoices in customer history |
| `totalPromises` | `customers.total_promises` | Total recorded payment promises |
| `brokenPromiseCount` | `customers.total_broken_promises` | Historical broken promises-to-pay count |
| `hasBrokenPromise` | `brokenPromiseCount > 0` or promise status == `BROKEN` | Boolean flag indicating broken commitment risk |
| `hasOpenException` | `reconciliation_exceptions` count > 0 | Boolean flag indicating short pay or TDS discrepancy |
| `hasDispute` | `communications.message` regex match | Boolean flag indicating dispute or deduction inquiry |
| `hasPartialPayment` | `paidAmount > 0` and `outstandingAmount > 0` | Boolean flag indicating partial credit received |

---

## 3. Mathematical Baseline Priority Score Formula

$$\text{Exposure Score} = \min\left(35.0, \frac{\text{outstandingAmount}}{1,000,000} \times 35.0\right)$$

$$\text{Overdue Score} = \min(40.0, \text{daysOverdue} \times 1.25)$$

$$\text{Broken Promise Score} = \min(15.0, \text{brokenPromiseCount} \times 7.5)$$

$$\text{Exception / Dispute Score} = \begin{cases} 10.0 & \text{if } \text{hasOpenException} \lor \text{hasDispute} \\ 0.0 & \text{otherwise} \end{cases}$$

$$\text{Raw Score} = \text{Exposure Score} + \text{Overdue Score} + \text{Broken Promise Score} + \text{Exception Score}$$

$$\text{Baseline Score} = \min(100.0, \text{round}(\text{Raw Score} \times 10) / 10.0)$$

---

## 4. Priority Threshold Mapping

$$\text{Baseline Priority} = \begin{cases}
\text{CRITICAL} & \text{if } \text{Baseline Score} \ge 70.0 \lor \text{daysOverdue} > 60 \lor \text{brokenPromiseCount} > 1 \\
\text{HIGH} & \text{if } \text{Baseline Score} \ge 45.0 \lor \text{daysOverdue} > 30 \\
\text{MEDIUM} & \text{if } \text{Baseline Score} \ge 20.0 \lor \text{daysOverdue} > 0 \\
\text{LOW} & \text{otherwise}
\end{cases}$$

---

## 5. Real Example Execution (`INV-1013`)

- **Invoice**: `INV-1013` (Sapphire Stores)
- **Outstanding Balance**: ₹60,000
- **Days Overdue**: 54 days
- **Broken Promises**: 3

### Step-by-Step Calculation:
- $\text{Exposure Score} = \min(35.0, (60,000 / 1,000,000) \times 35.0) = 2.1$
- $\text{Overdue Score} = \min(40.0, 54 \times 1.25) = \min(40.0, 67.5) = 40.0$
- $\text{Broken Promise Score} = \min(15.0, 3 \times 7.5) = 15.0$
- $\text{Exception Score} = 0.0$
- $\text{Raw Score} = 2.1 + 40.0 + 15.0 + 0.0 = 57.1$
- $\text{Baseline Score} = \mathbf{57.1}$
- $\text{Baseline Priority} = \mathbf{CRITICAL}$ (Triggered by $\text{brokenPromises} > 1$ & score $\ge 45.0$)
