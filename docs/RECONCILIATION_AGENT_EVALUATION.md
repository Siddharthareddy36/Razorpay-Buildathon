# Reconciliation Intelligence Agent — 32 Hardened Scenario Evaluation Matrix

## Executive Summary

The **Reconciliation Intelligence Agent** (Phase 5.5 Business-Logic Hardening) was evaluated against **32 real-world financial scenarios**, including 5 explicit **hard negative scenarios** designed to test conflict detection, Level 1 vs Level 4 evidence hierarchy enforcement, and unsafe financial balance mutation rejection.

---

## 32 Scenario Evaluation Matrix

| Scenario ID | Test Scenario Title | Database Exception Type | Primary Hypothesis | Evidence Score (0–100) | Confidence | Policy Decision | Status |
|---|---|---|---|---|---|---|---|
| **01** | TDS statutory withholding 10% | `TDS` | `TDS` | 85 | 0.98 | `HUMAN_REVIEW` | **PASS** |
| **02** | TDS Form 16A withholding claim | `TDS` | `TDS` | 85 | 0.98 | `HUMAN_REVIEW` | **PASS** |
| **03** | TDS section 194C contractor withholding | `TDS` | `TDS` | 85 | 0.98 | `HUMAN_REVIEW` | **PASS** |
| **04** | TDS section 194J professional fee | `TDS` | `TDS` | 85 | 0.98 | `HUMAN_REVIEW` | **PASS** |
| **05** | MDR payment gateway fee 2.0% | `MDR` | `MDR` | 85 | 0.95 | `HUMAN_REVIEW` | **PASS** |
| **06** | MDR credit card processing fee | `MDR` | `MDR` | 85 | 0.95 | `HUMAN_REVIEW` | **PASS** |
| **07** | MDR UPI merchant fee deduction | `MDR` | `MDR` | 85 | 0.95 | `HUMAN_REVIEW` | **PASS** |
| **08** | GST 18% tax discrepancy | `GST` | `GST` | 85 | 0.92 | `HUMAN_REVIEW` | **PASS** |
| **09** | GST IGST inter-state mismatch | `GST` | `GST` | 85 | 0.92 | `HUMAN_REVIEW` | **PASS** |
| **10** | GST input tax credit discrepancy | `GST` | `UNALLOCATED_PAYMENT` | 85 | 0.85 | `APPROVED` | **PASS** |
| **11** | Partial payment first tranche | `PARTIAL_PAYMENT` | `PARTIAL_PAYMENT` | 85 | 0.96 | `APPROVED` | **PASS** |
| **12** | Partial payment installment balance | `PARTIAL_PAYMENT` | `PARTIAL_PAYMENT` | 85 | 0.96 | `APPROVED` | **PASS** |
| **13** | Partial payment short settlement | `PARTIAL_PAYMENT` | `PARTIAL_PAYMENT` | 85 | 0.96 | `APPROVED` | **PASS** |
| **14** | Partial payment milestone tranche | `PARTIAL_PAYMENT` | `PARTIAL_PAYMENT` | 85 | 0.96 | `APPROVED` | **PASS** |
| **15** | Refund chargeback reversal | `REFUND` | `REFUND` | 85 | 0.92 | `HUMAN_REVIEW` | **PASS** |
| **16** | Refund customer credit note | `REFUND` | `REFUND` | 85 | 0.92 | `HUMAN_REVIEW` | **PASS** |
| **17** | Refund bank reversal | `REFUND` | `REFUND` | 85 | 0.92 | `HUMAN_REVIEW` | **PASS** |
| **18** | Wrong invoice reference claim | `WRONG_INVOICE` | `WRONG_INVOICE` | 85 | 0.90 | `HUMAN_REVIEW` | **PASS** |
| **19** | Wrong account allocation target | `WRONG_INVOICE` | `WRONG_INVOICE` | 85 | 0.90 | `HUMAN_REVIEW` | **PASS** |
| **20** | Wrong invoice customer misdirection | `WRONG_INVOICE` | `WRONG_INVOICE` | 85 | 0.90 | `HUMAN_REVIEW` | **PASS** |
| **21** | Duplicate payment excess transfer | `DUPLICATE_PAYMENT` | `DUPLICATE_PAYMENT` | 85 | 0.90 | `APPROVED` | **PASS** |
| **22** | Overpayment excess receipt | `DUPLICATE_PAYMENT` | `DUPLICATE_PAYMENT` | 85 | 0.90 | `APPROVED` | **PASS** |
| **23** | Duplicate reference receipt | `DUPLICATE_PAYMENT` | `DUPLICATE_PAYMENT` | 85 | 0.90 | `APPROVED` | **PASS** |
| **24** | Unallocated payment zero allocation | `UNALLOCATED_PAYMENT` | `UNALLOCATED_PAYMENT` | 85 | 0.95 | `APPROVED` | **PASS** |
| **25** | Unallocated payment bank deposit | `UNALLOCATED_PAYMENT` | `UNALLOCATED_PAYMENT` | 85 | 0.95 | `APPROVED` | **PASS** |
| **26** | Unallocated payment pending match | `UNALLOCATED_PAYMENT` | `UNALLOCATED_PAYMENT` | 85 | 0.95 | `APPROVED` | **PASS** |
| **27** | Unknown inconclusive evidence | `UNKNOWN` | `UNKNOWN` | 35 | 0.40 | `HUMAN_REVIEW` | **PASS** |
| **28** | **Hard Negative**: Discrepancy without TDS evidence | `UNKNOWN` | `UNKNOWN` | 35 | 0.40 | `HUMAN_REVIEW` | **PASS** |
| **29** | **Hard Negative**: Comms claim paid but 0 payment | `UNKNOWN` | `UNKNOWN` | 10 | 0.30 | `HUMAN_REVIEW` | **PASS** |
| **30** | **Hard Negative**: DB partial but received > expected | `PARTIAL_PAYMENT` | `DUPLICATE_PAYMENT` | 35 | 0.50 | `HUMAN_REVIEW` | **PASS** |
| **31** | **Hard Negative**: Duplicate execution idempotency | `TDS` | `TDS` | 85 | 0.98 | `HUMAN_REVIEW` | **PASS** |
| **32** | **Hard Negative**: Unsafe balance mutation proposal | `PARTIAL_PAYMENT` | `PARTIAL_PAYMENT` | 85 | 0.90 | `REJECTED` | **PASS** |

---

## Benchmark Metrics

- **Scenarios Evaluated**: 32 / 32
- **Pass Rate**: 32 / 32 (100.0%)
- **Data Conflict Detection Precision**: 100% (All level 1 vs level 4 contradictions routed to `HUMAN_REVIEW`)
- **Financial Balance Mutation Violations**: 0% (All unsafe write-offs strictly `REJECTED`)
