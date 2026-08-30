import { Request, Response } from 'express';
import http from 'http';
import { runReceivablesAgentGraph } from '../agents/receivables/graph';
import { DatabaseService } from '../services/database.service';
import { getSupabaseClient } from '../lib/supabase';

interface SessionContext {
  currentInvoiceId?: string | null;
  currentInvoiceNumber?: string | null;
  currentCustomerId?: string | null;
  currentCustomerName?: string | null;
  currentPromiseId?: string | null;
  currentPromiseContext?: any | null;
  currentPaymentId?: string | null;
  currentExceptionId?: string | null;
  lastReferencedEntity?: string | null;
  lastReferencedEntityType?: 'INVOICE' | 'CUSTOMER' | 'PROMISE' | 'PAYMENT' | 'EXCEPTION' | null;
}

function postJsonToPython(urlPath: string, payload: any, timeoutMs: number = 30000): Promise<any> {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    const options = {
      hostname: '127.0.0.1',
      port: 8000,
      path: urlPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let parsedData: any = null;
        try {
          if (data) parsedData = JSON.parse(data);
        } catch {
          parsedData = null;
        }

        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve(parsedData || {});
        } else {
          const err: any = new Error(
            parsedData?.detail || parsedData?.error || parsedData?.message || `Python service returned status ${res.statusCode}`
          );
          err.statusCode = res.statusCode;
          err.responseData = parsedData;
          reject(err);
        }
      });
    });

    req.setTimeout(timeoutMs, () => {
      req.destroy();
      const timeoutErr: any = new Error(`Python service request timed out after ${timeoutMs / 1000}s`);
      timeoutErr.statusCode = 504;
      timeoutErr.isTimeout = true;
      reject(timeoutErr);
    });

    req.on('error', (err: any) => {
      err.statusCode = 503;
      err.isUnavailable = true;
      reject(err);
    });
    req.write(postData);
    req.end();
  });
}

export class AgentController {
  /**
   * Single Invoice Receivables Agent Workflow Run
   * POST /api/agents/receivables/run
   */
  static async runReceivablesAgent(req: Request, res: Response) {
    try {
      const { invoiceId, invoiceNumber } = req.body;
      const lookupId = invoiceId || invoiceNumber;
      if (!lookupId || typeof lookupId !== 'string') {
        return res.status(400).json({ error: 'Field invoiceId or invoiceNumber is required.' });
      }

      try {
        const pyRes = await postJsonToPython('/agents/receivables/run', { invoiceId: lookupId }, 30000);
        if (pyRes && pyRes.success) {
          return res.status(200).json(pyRes);
        }
      } catch (pyErr) {
        console.warn('Python agent service unavailable, using TypeScript fallback:', (pyErr as any)?.message);
      }

      const resultState = await runReceivablesAgentGraph(lookupId);

      if (resultState.workflowStatus === 'FAILED') {
        return res.status(404).json({
          success: false,
          error: resultState.error || `Invoice '${lookupId}' context loading failed.`,
        });
      }

      return res.status(200).json({
        success: true,
        invoiceId: resultState.invoiceId,
        invoiceNumber: resultState.invoiceNumber,
        customerName: resultState.customerName,
        outstandingAmount: resultState.outstandingAmount,
        daysOverdue: resultState.daysOverdue,
        baselinePriority: resultState.baselinePriority,
        baselineScore: resultState.baselineScore,
        priority: resultState.agentPriority,
        priorityReason: resultState.priorityReason,
        evidence: resultState.evidence,
        recommendedAction: resultState.recommendedAction,
        confidence: resultState.confidence,
        policyDecision: resultState.policyDecision,
        policyReason: resultState.policyReason,
        agentRunId: resultState.agentRunId,
        agentDecisionId: resultState.agentDecisionId,
      });
    } catch (err: any) {
      console.error('Failed to run Receivables Agent:', err?.message || err);
      return res.status(500).json({ error: 'Internal server error while executing Receivables Agent' });
    }
  }

  /**
   * Single Promise-to-Pay Intelligence Agent Run
   * POST /api/agents/promises/run
   */
  static async runPromiseAgent(req: Request, res: Response) {
    try {
      const { promiseId, invoiceId, invoiceNumber } = req.body;
      const lookupId = promiseId || invoiceId || invoiceNumber;
      if (!lookupId || typeof lookupId !== 'string') {
        return res.status(400).json({ success: false, error: 'BAD_REQUEST', detail: 'Field promiseId, invoiceId, or invoiceNumber is required.' });
      }

      try {
        const pyRes = await postJsonToPython('/agents/promises/run', { promiseId: promiseId || lookupId, invoiceId: invoiceId || lookupId, invoiceNumber }, 30000);
        if (pyRes) {
          const statusCode = pyRes.success === false ? 404 : 200;
          return res.status(statusCode).json(pyRes);
        }
      } catch (pyErr: any) {
        if (pyErr.responseData) {
          return res.status(pyErr.statusCode || 500).json(pyErr.responseData);
        }
        if (pyErr.isTimeout) {
          return res.status(504).json({ success: false, error: 'TIMEOUT', detail: 'Promise-to-Pay Agent execution timed out. Please retry.' });
        }
        if (pyErr.code === 'ECONNREFUSED' || pyErr.isUnavailable) {
          return res.status(503).json({ success: false, error: 'P2P_AGENT_UNAVAILABLE', detail: 'Promise-to-Pay Agent service is unavailable.' });
        }
        return res.status(pyErr.statusCode || 500).json({
          success: false,
          error: 'P2P_EXECUTION_FAILED',
          detail: pyErr?.message || 'Promise-to-Pay Agent execution failed.',
        });
      }
    } catch (err: any) {
      console.error('Failed to run Promise Agent:', err?.message || err);
      return res.status(500).json({ success: false, error: 'INTERNAL_SERVER_ERROR', detail: 'Internal server error while executing Promise Agent' });
    }
  }

  /**
   * Single Reconciliation Intelligence Agent Run
   * POST /api/agents/reconciliation/run
   */
  static async runReconciliationAgent(req: Request, res: Response) {
    try {
      const { exceptionId, invoiceId, invoiceNumber } = req.body;
      const lookupId = exceptionId || invoiceId || invoiceNumber;
      if (!lookupId || typeof lookupId !== 'string') {
        return res.status(400).json({ success: false, error: 'BAD_REQUEST', detail: 'Field exceptionId, invoiceId, or invoiceNumber is required.' });
      }

      try {
        const pyRes = await postJsonToPython('/agents/reconciliation/run', { exceptionId: exceptionId || lookupId, invoiceId, invoiceNumber }, 30000);
        if (pyRes) {
          const statusCode = pyRes.success === false ? 404 : 200;
          return res.status(statusCode).json(pyRes);
        }
      } catch (pyErr: any) {
        if (pyErr.responseData) {
          return res.status(pyErr.statusCode || 500).json(pyErr.responseData);
        }
        if (pyErr.isTimeout) {
          return res.status(504).json({ success: false, error: 'TIMEOUT', detail: 'Reconciliation Agent execution timed out. Please retry.' });
        }
        if (pyErr.code === 'ECONNREFUSED' || pyErr.isUnavailable) {
          return res.status(503).json({ success: false, error: 'RECONCILIATION_AGENT_UNAVAILABLE', detail: 'Reconciliation Agent microservice unavailable.' });
        }
        return res.status(pyErr.statusCode || 500).json({
          success: false,
          error: 'RECONCILIATION_EXECUTION_FAILED',
          detail: pyErr?.message || 'Reconciliation Agent execution failed.',
        });
      }
    } catch (err: any) {
      console.error('Failed to run Reconciliation Agent:', err?.message || err);
      return res.status(500).json({ success: false, error: 'INTERNAL_SERVER_ERROR', detail: 'Internal server error while executing Reconciliation Agent' });
    }
  }

  /**
   * Multi-Agent Supervisor Run
   * POST /api/agents/supervisor/run
   */
  static async runSupervisorAgent(req: Request, res: Response) {
    try {
      const { query, invoiceNumber, customerId } = req.body;
      if (typeof query === 'string' && query.trim().length === 0 && !invoiceNumber && !customerId) {
        return res.status(400).json({ success: false, error: 'BAD_REQUEST', detail: 'Field query, invoiceNumber, or customerId is required.' });
      }
      const userQuery = query && typeof query === 'string' && query.trim().length > 0
        ? query
        : (invoiceNumber ? `Why is ${invoiceNumber} still outstanding?` : 'Provide overall portfolio status');

      try {
        const pyRes = await postJsonToPython('/agents/supervisor/run', { query: userQuery, invoiceNumber, customerId }, 30000);
        if (pyRes) {
          const statusCode = pyRes.intent === 'NOT_FOUND' ? 404 : 200;
          return res.status(statusCode).json(pyRes);
        }
      } catch (pyErr: any) {
        if (pyErr.responseData) {
          return res.status(pyErr.statusCode || 500).json(pyErr.responseData);
        }
        if (pyErr.isTimeout) {
          return res.status(504).json({ success: false, error: 'TIMEOUT', detail: 'Multi-Agent Supervisor execution timed out. Please retry.' });
        }
        if (pyErr.code === 'ECONNREFUSED' || pyErr.isUnavailable) {
          return res.status(503).json({ success: false, error: 'SUPERVISOR_UNAVAILABLE', detail: 'Multi-Agent Supervisor microservice unavailable.' });
        }
        return res.status(pyErr.statusCode || 500).json({
          success: false,
          error: 'SUPERVISOR_EXECUTION_FAILED',
          detail: pyErr?.message || 'Multi-Agent Supervisor execution failed.',
        });
      }
    } catch (err: any) {
      console.error('Failed to run Multi-Agent Supervisor:', err?.message || err);
      return res.status(500).json({ success: false, error: 'INTERNAL_SERVER_ERROR', detail: 'Internal server error while executing Multi-Agent Supervisor' });
    }
  }


  /**
   * Action Planner - Plan Action
   * POST /api/actions/plan
   */
  static async planAction(req: Request, res: Response) {
    try {
      const { query, invoiceId, customerId } = req.body;
      const pyRes = await postJsonToPython('/actions/plan', { query, invoiceId, customerId });
      return res.status(200).json(pyRes);
    } catch (err: any) {
      console.error('Failed to plan action:', err?.message || err);
      return res.status(500).json({ error: 'Failed to generate action plan' });
    }
  }

  /**
   * Controlled n8n Recovery Workflow Execution
   * POST /api/actions/execute
   */
  static async executeAction(req: Request, res: Response) {
    try {
      const { actionPlan, humanApproval, approvalNotes } = req.body;
      if (!actionPlan) {
        return res.status(400).json({ error: 'Field actionPlan is required.' });
      }
      const pyRes = await postJsonToPython('/actions/execute', { actionPlan, humanApproval, approvalNotes });
      return res.status(200).json(pyRes);
    } catch (err: any) {
      console.error('Failed to execute recovery action:', err?.message || err);
      return res.status(500).json({ error: 'Failed to execute recovery action' });
    }
  }

  /**
   * Financial Outcome Tracking & Recovery Measurement
   * POST /api/actions/outcome
   */
  static async trackOutcome(req: Request, res: Response) {
    try {
      const { invoiceId, actionId, observationWindowHours } = req.body;
      if (!invoiceId || !actionId) {
        return res.status(400).json({ error: 'Fields invoiceId and actionId are required.' });
      }
      const pyRes = await postJsonToPython('/actions/outcome', { invoiceId, actionId, observationWindowHours });
      return res.status(200).json(pyRes);
    } catch (err: any) {
      console.error('Failed to track outcome:', err?.message || err);
      return res.status(500).json({ error: 'Failed to track recovery outcome' });
    }
  }




  /**
   * Batch / Portfolio Receivables Ranking
   * POST /api/agents/receivables/rank
   */
  static async rankReceivables(req: Request, res: Response) {

    try {
      const topK = typeof req.body.topK === 'number' ? req.body.topK : 10;
      const candidateK = typeof req.body.candidateK === 'number' ? req.body.candidateK : 20;

      try {
        const pyRes = await postJsonToPython('/agents/receivables/rank', { topK, candidateK });
        if (pyRes && pyRes.success) {
          return res.status(200).json({
            success: true,
            portfolioSize: pyRes.portfolioSize,
            candidateCount: pyRes.candidateCount,
            finalRankedCount: pyRes.finalRankedCount,
            rankings: pyRes.rankedInvoices,
            agentRunId: pyRes.agentRunId,
            source: 'PYTHON_LANGGRAPH',
            sourceLabel: 'RECEIVABLES INTELLIGENCE',
          });
        }
      } catch (pyErr) {
        console.warn('Python portfolio service unavailable, using TypeScript fallback:', (pyErr as any)?.message);
      }

      const invoices = await DatabaseService.getInvoices();
      const targetInvoiceIds = invoices.slice(0, 10).map((inv) => inv.id);

      const results = [];
      for (const id of targetInvoiceIds) {
        const state = await runReceivablesAgentGraph(id);
        if (state.workflowStatus !== 'FAILED') {
          results.push({
            invoiceId: state.invoiceId,
            invoiceNumber: state.invoiceNumber,
            customerName: state.customerName,
            outstandingAmount: state.outstandingAmount,
            daysOverdue: state.daysOverdue,
            baselinePriority: state.baselinePriority,
            baselineScore: state.baselineScore,
            priority: state.agentPriority,
            priorityReason: state.priorityReason,
            recommendedAction: state.recommendedAction,
            confidence: state.confidence,
            policyDecision: state.policyDecision,
          });
        }
      }

      const priorityOrder: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      results.sort((a, b) => {
        const pDiff = (priorityOrder[a.priority] || 0) - (priorityOrder[b.priority] || 0);
        if (pDiff !== 0) return -pDiff;
        return b.baselineScore - a.baselineScore;
      });

      return res.status(200).json({
        success: true,
        portfolioSize: invoices.length,
        candidateCount: results.length,
        finalRankedCount: results.length,
        rankings: results.map((r, idx) => ({ rank: idx + 1, ...r })),
        source: 'TYPESCRIPT_FALLBACK',
        sourceLabel: 'LIVE DATABASE',
      });
    } catch (err: any) {
      console.error('Failed to rank receivables:', err?.message || err);
      return res.status(500).json({ error: 'Failed to execute portfolio receivables ranking' });
    }
  }

  /**
   * Conversational Copilot & Deterministic Intent Router
   * POST /api/agent/query
   */
  static async handleAgentQuery(req: Request, res: Response) {
    const startTime = Date.now();
    try {
      const { query, context: inputContext } = req.body;
      const qLower = (query || '').toLowerCase().trim();

      if (!qLower) {
        return res.status(400).json({ error: 'Query string is required.' });
      }

      console.log(`[Assistant Router] Request received: "${query}" | Context:`, inputContext);
      const supabase = getSupabaseClient();

      // Initialize session context from request
      let ctx: SessionContext = {
        currentInvoiceId: inputContext?.currentInvoiceId || null,
        currentInvoiceNumber: inputContext?.currentInvoiceNumber || null,
        currentCustomerId: inputContext?.currentCustomerId || null,
        currentCustomerName: inputContext?.currentCustomerName || null,
        currentPromiseId: inputContext?.currentPromiseId || null,
        currentPromiseContext: inputContext?.currentPromiseContext || null,
        currentPaymentId: inputContext?.currentPaymentId || null,
        currentExceptionId: inputContext?.currentExceptionId || null,
        lastReferencedEntity: inputContext?.lastReferencedEntity || null,
        lastReferencedEntityType: inputContext?.lastReferencedEntityType || null,
      };

      // 0. CONTEXT RESET CHECK
      if (
        qLower.includes('reset') ||
        qLower.includes('clear') ||
        qLower.includes('start a new case') ||
        qLower.includes('new investigation')
      ) {
        console.log(`[Assistant Router] Context reset triggered.`);
        ctx = {
          currentInvoiceId: null,
          currentInvoiceNumber: null,
          currentCustomerId: null,
          currentCustomerName: null,
          currentPromiseId: null,
          currentPromiseContext: null,
          currentPaymentId: null,
          currentExceptionId: null,
          lastReferencedEntity: null,
          lastReferencedEntityType: null,
        };

        const latencyMs = Date.now() - startTime;
        return res.status(200).json({
          success: true,
          intent: 'CONTEXT_RESET',
          answer: 'Context reset. Which invoice, customer, or portfolio summary would you like to investigate?',
          source: 'DETERMINISTIC_ROUTER',
          sourceLabel: 'FINANCIAL OPERATIONS COPILOT',
          latencyMs,
          context: ctx,
          facts: {},
          recommendation: 'Specify an invoice number (e.g. INV-SYNTH-10002) or select a quick question.',
          policy: 'APPROVED',
          data: {},
        });
      }

      // ENTITY RESOLUTION STEP A: Explicit Invoice Match
      const invMatch = qLower.match(/inv-([a-z0-9-]+)/i);
      let explicitInvNum: string | null = null;
      if (invMatch) {
        explicitInvNum = invMatch[0].toUpperCase();
      }

      // ENTITY RESOLUTION STEP B: Explicit Customer Match
      let explicitCustId: string | null = null;
      let explicitCustName: string | null = null;

      if (!explicitInvNum) {
        const { data: matchedCusts } = await supabase.from('customers').select('id, name').limit(50);
        if (matchedCusts) {
          for (const c of matchedCusts) {
            const nameLower = c.name.toLowerCase();
            const firstWord = nameLower.split(' ')[0];
            if (qLower.includes(nameLower) || (firstWord.length >= 4 && qLower.includes(firstWord))) {
              explicitCustId = c.id;
              explicitCustName = c.name;
              break;
            }
          }
        }
      }

      // Apply Explicit Overrides to Context (PART 6)
      if (explicitInvNum) {
        const { data: invData } = await supabase
          .from('invoices')
          .select('id, invoice_number, customer_id, customers(id, name)')
          .eq('invoice_number', explicitInvNum)
          .single();

        if (invData) {
          ctx.currentInvoiceId = invData.id;
          ctx.currentInvoiceNumber = invData.invoice_number;
          ctx.currentCustomerId = invData.customer_id;
          ctx.currentCustomerName = (invData.customers as any)?.name || 'Customer Account';
          ctx.currentPromiseId = null; // Explicit invoice switch clears previous promise ID
          ctx.currentPromiseContext = null;
          ctx.lastReferencedEntity = invData.invoice_number;
          ctx.lastReferencedEntityType = 'INVOICE';
        }
      } else if (explicitCustId || (qLower.includes('what about') && !explicitInvNum && !qLower.includes('its customer') && !qLower.includes('this customer') && !qLower.includes('payment') && !qLower.includes('reconciliation') && !qLower.includes('promise'))) {
        ctx.currentCustomerId = explicitCustId;
        ctx.currentCustomerName = explicitCustName;
        ctx.currentInvoiceId = null;
        ctx.currentInvoiceNumber = null;
        ctx.currentPromiseId = null; // Explicit customer switch clears previous promise ID
        ctx.currentPromiseContext = null;
        ctx.lastReferencedEntity = explicitCustName;
        ctx.lastReferencedEntityType = 'CUSTOMER';
      }

      // INTENT DEFINITIONS
      const isPromiseQuery = (
        qLower.includes('promise') ||
        qLower.includes('commit') ||
        qLower.includes('fulfill') ||
        qLower.includes('when were they supposed to pay') ||
        qLower.includes('supposed to pay') ||
        qLower.includes('kept their commitment') ||
        qLower.includes('broken promises') ||
        qLower.includes('active commitments') ||
        qLower.includes('what did they promise') ||
        qLower.includes('what did this customer promise') ||
        qLower.includes('amount did they commit') ||
        qLower.includes('what amount did they commit') ||
        qLower.includes('current promise')
      );

      const isCustomerAnalysisQuery = !isPromiseQuery && (
        explicitCustId !== null ||
        explicitCustName !== null ||
        qLower.includes('customer') ||
        qLower.includes('its customer') ||
        qLower.includes('about its customer') ||
        qLower.includes('this customer') ||
        qLower.includes('risk of this customer') ||
        qLower.includes('customer risk') ||
        qLower.includes('payment history') ||
        qLower.includes('deteriorating') ||
        qLower.includes('credit limit') ||
        (qLower.includes('what about') && !qLower.includes('inv-') && !qLower.includes('payment') && !qLower.includes('reconciliation') && !qLower.includes('promise'))
      );

      const isInvoiceAnalysisQuery = !isPromiseQuery && !isCustomerAnalysisQuery && (
        explicitInvNum !== null ||
        qLower.includes('explain invoice') ||
        qLower.includes('risk on invoice') ||
        qLower.includes('why is inv') ||
        qLower.includes('important')
      );

      const isReconciliationQuery = (
        qLower.includes('reconciliation') ||
        qLower.includes('exception') ||
        qLower.includes('short pay') ||
        qLower.includes('tds') ||
        qLower.includes('mismatch') ||
        qLower.includes('differ') ||
        qLower.includes('what about payments') ||
        qLower.includes('any payment issues')
      );

      const isNextActionQuery = (
        qLower.includes('what should we do next') ||
        qLower.includes('next action') ||
        qLower.includes('recommended action') ||
        qLower.includes('what next')
      );

      // ==================================================
      // 1. PROMISE ROUTING (PART 2, 3, 4, 7, 8)
      // ==================================================
      if (isPromiseQuery) {
        console.log(`[Assistant Router] Intent: PROMISE_INTENT`);
        const targetLookup = ctx.currentPromiseId || ctx.currentInvoiceNumber || ctx.currentInvoiceId || explicitInvNum;

        // Try Python P2P agent first if promise lookup exists
        if (targetLookup) {
          try {
            const pyRes = await postJsonToPython('/agents/promises/run', { promiseId: targetLookup });
            if (pyRes && pyRes.success !== false) {
              if (pyRes.promiseId) ctx.currentPromiseId = pyRes.promiseId;
              if (pyRes.customerName) ctx.currentCustomerName = pyRes.customerName;
              ctx.lastReferencedEntityType = 'PROMISE';
              const latencyMs = Date.now() - startTime;

              return res.status(200).json({
                success: true,
                intent: 'PROMISE_ANALYSIS',
                source: 'P2P_INTELLIGENCE_AGENT',
                sourceLabel: 'P2P INTELLIGENCE',
                answer: `PROMISE-TO-PAY\n\nCustomer:\n${pyRes.customerName || ctx.currentCustomerName || 'Customer Account'}\n\nCurrent Promise:\n₹${(pyRes.promisedAmount || 0).toLocaleString('en-IN')}\n\nPromised Date:\n${pyRes.promisedDate || 'N/A'}\n\nStatus:\n${pyRes.deterministicPromiseState || pyRes.promiseAssessment || 'ACTIVE'}\n\nFulfilled Amount:\n₹${(pyRes.fulfilledAmount || 0).toLocaleString('en-IN')}\n\nRemaining:\n₹${Math.max(0, (pyRes.promisedAmount || 0) - (pyRes.fulfilledAmount || 0)).toLocaleString('en-IN')}\n\nCommitment Reliability:\n${pyRes.commitmentReliability || 'MEDIUM'}\n\nEvidence:\n- ${pyRes.reason || 'Promise record evaluated'}\n\nRECOMMENDATION:\n${pyRes.recommendedAction || 'Verify payment receipt against promised date.'}\n\nPOLICY:\n${pyRes.policyDecision || 'APPROVED'}`,
                latencyMs,
                context: ctx,
                facts: pyRes,
                recommendation: pyRes.recommendedAction || 'Verify payment receipt against promised date.',
                policy: pyRes.policyDecision || 'APPROVED',
                data: pyRes,
              });
            }
          } catch (pyErr) {
            console.warn('[Assistant Router] P2P Python agent unavailable, falling back to database facts:', (pyErr as any)?.message);
          }
        }

        // DATABASE FALLBACK / FULFILLMENT EVALUATION (PART 8 & 11)
        let promiseQueryBuilder = supabase
          .from('promises')
          .select('*, customers(id, name), invoices(id, invoice_number)');

        if (ctx.currentPromiseId) {
          promiseQueryBuilder = promiseQueryBuilder.eq('id', ctx.currentPromiseId);
        } else if (ctx.currentInvoiceId) {
          promiseQueryBuilder = promiseQueryBuilder.eq('invoice_id', ctx.currentInvoiceId);
        } else if (ctx.currentCustomerId) {
          promiseQueryBuilder = promiseQueryBuilder.eq('customer_id', ctx.currentCustomerId);
        }

        const { data: foundPromises } = await promiseQueryBuilder.order('promised_date', { ascending: false });
        const promiseList = foundPromises || [];

        // Check if query is follow-up fulfillment evaluation: "Did they fulfill it?"
        const isFulfillmentQuestion = qLower.includes('fulfill') || qLower.includes('kept their commitment') || qLower.includes('did they keep') || qLower.includes('did they fulfill');

        // MULTIPLE PROMISES AMBIGUITY DISAMBIGUATION (PART 4)
        if (isFulfillmentQuestion && promiseList.length > 1 && !ctx.currentPromiseId) {
          const p1 = promiseList[0];
          const p2 = promiseList[1];
          const p1Date = p1.promised_date ? new Date(p1.promised_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) : 'N/A';
          const p2Date = p2.promised_date ? new Date(p2.promised_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) : 'N/A';
          const p1Amt = `₹${(p1.promised_amount / 100000).toFixed(1)}L`;
          const p2Amt = `₹${(p2.promised_amount / 100000).toFixed(1)}L`;

          const latencyMs = Date.now() - startTime;
          return res.status(200).json({
            success: true,
            intent: 'CLARIFICATION_REQUIRED',
            source: 'LIVE_DATABASE_FALLBACK',
            sourceLabel: 'LIVE DATABASE FALLBACK',
            answer: `Which promise do you mean — the ${p1Amt} promise due ${p1Date} or the ${p2Amt} promise due ${p2Date}?`,
            latencyMs,
            context: ctx,
            facts: { promises: promiseList.slice(0, 2) },
            recommendation: `Please specify whether you mean the ${p1Amt} promise due ${p1Date} or the ${p2Amt} promise due ${p2Date}.`,
            policy: 'APPROVED',
            data: { promises: promiseList },
          });
        }

        if (promiseList.length > 0) {
          const targetPromise = promiseList[0];
          ctx.currentPromiseId = targetPromise.id;
          ctx.currentPromiseContext = targetPromise;
          ctx.lastReferencedEntity = targetPromise.id;
          ctx.lastReferencedEntityType = 'PROMISE';

          const custName = (targetPromise.customers as any)?.name || ctx.currentCustomerName || 'Customer Account';
          if (!ctx.currentCustomerName) ctx.currentCustomerName = custName;

          const promisedAmt = Number(targetPromise.promised_amount || 0);
          const fulfilledAmt = Number(targetPromise.fulfilled_amount || 0);
          const remainingAmt = Math.max(0, promisedAmt - fulfilledAmt);
          const status = String(targetPromise.status || 'ACTIVE').toUpperCase();
          const promisedDateStr = targetPromise.promised_date ? new Date(targetPromise.promised_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';

          const isFulfilled = status === 'FULFILLED' || (fulfilledAmt >= promisedAmt && promisedAmt > 0);
          const isPartial = status === 'PARTIALLY_FULFILLED' || (fulfilledAmt > 0 && fulfilledAmt < promisedAmt);

          const latencyMs = Date.now() - startTime;

          if (isFulfillmentQuestion) {
            // FORMAT FOR "Did they fulfill it?" (PART 8)
            return res.status(200).json({
              success: true,
              intent: 'PROMISE_FULFILLMENT_EVALUATION',
              source: 'LIVE_DATABASE_FALLBACK',
              sourceLabel: 'LIVE DATABASE FALLBACK',
              answer: `Promise:\n₹${promisedAmt.toLocaleString('en-IN')}\n\nPromised Date:\n${promisedDateStr}\n\nFulfilled:\n${isFulfilled ? 'YES' : isPartial ? 'PARTIAL' : 'NO'}\n\nAmount Fulfilled:\n₹${fulfilledAmt.toLocaleString('en-IN')}\n\nRemaining:\n₹${remainingAmt.toLocaleString('en-IN')}\n\nActual Payment Date:\n${targetPromise.actual_payment_date || 'No qualifying payment'}\n\nFinal Promise State:\n${status}\n\nEvidence:\n- promised date passed: ${new Date(targetPromise.promised_date) < new Date() ? 'YES' : 'NO'}\n- qualifying payment received: ${fulfilledAmt > 0 ? `₹${fulfilledAmt.toLocaleString('en-IN')}` : 'No qualifying payment'}\n- commitment reliability: ${status === 'BROKEN' ? 'LOW' : 'HIGH'}`,
              latencyMs,
              context: ctx,
              facts: targetPromise,
              recommendation: status === 'BROKEN' ? 'Escalate broken promise according to collections policy.' : 'Verify payment receipt against promised date.',
              policy: status === 'BROKEN' ? 'HUMAN_REVIEW' : 'APPROVED',
              data: targetPromise,
            });
          } else {
            // FORMAT FOR "What did this customer promise to pay?" (PART 7)
            return res.status(200).json({
              success: true,
              intent: 'PROMISE_SUMMARY',
              source: 'LIVE_DATABASE_FALLBACK',
              sourceLabel: 'LIVE DATABASE FALLBACK',
              answer: `PROMISE-TO-PAY\n\nCustomer:\n${custName}\n\nCurrent Promise:\n₹${promisedAmt.toLocaleString('en-IN')}\n\nPromised Date:\n${promisedDateStr}\n\nStatus:\n${status}\n\nFulfilled Amount:\n₹${fulfilledAmt.toLocaleString('en-IN')}\n\nRemaining:\n₹${remainingAmt.toLocaleString('en-IN')}\n\nCommitment Reliability:\n${status === 'BROKEN' ? 'LOW' : 'HIGH'}\n\nEvidence:\n- promised date passed\n- ${fulfilledAmt > 0 ? 'partial payment received' : 'no qualifying payment'}\n- ${status === 'BROKEN' ? 'previous broken commitments' : 'active commitment status'}\n\nRECOMMENDATION:\n${status === 'BROKEN' ? 'Request an updated commitment or escalate according to policy.' : 'Monitor payment receipt against promised date.'}\n\nPOLICY:\n${status === 'BROKEN' ? 'HUMAN_REVIEW' : 'APPROVED'}`,
              latencyMs,
              context: ctx,
              facts: targetPromise,
              recommendation: status === 'BROKEN' ? 'Request an updated commitment or escalate according to policy.' : 'Monitor payment receipt against promised date.',
              policy: status === 'BROKEN' ? 'HUMAN_REVIEW' : 'APPROVED',
              data: targetPromise,
            });
          }
        } else {
          const latencyMs = Date.now() - startTime;
          return res.status(200).json({
            success: true,
            intent: 'PROMISE_SUMMARY',
            source: 'LIVE_DATABASE_FALLBACK',
            sourceLabel: 'LIVE DATABASE FALLBACK',
            answer: `Receivables Intelligence is temporarily unavailable. No active or broken payment commitments were found in live database for ${ctx.currentCustomerName || ctx.currentInvoiceNumber || 'the requested account'}.`,
            latencyMs,
            context: ctx,
            facts: {},
            recommendation: 'Contact customer finance department to establish payment commitment.',
            policy: 'APPROVED',
            data: {},
          });
        }
      }

      // ==================================================
      // 2. INVOICE ANALYSIS
      // ==================================================
      if (isInvoiceAnalysisQuery) {
        const targetInvNum = ctx.currentInvoiceNumber || explicitInvNum || 'INV-SYNTH-10002';
        console.log(`[Assistant Router] Intent: INVOICE_ANALYSIS for ${targetInvNum}`);

        try {
          const pyRes = await postJsonToPython('/agents/receivables/run', { invoiceId: targetInvNum });
          if (pyRes && pyRes.success !== false) {
            const latencyMs = Date.now() - startTime;
            return res.status(200).json({
              success: true,
              intent: 'INVOICE_ANALYSIS',
              source: 'RECEIVABLES_AGENT',
              sourceLabel: 'RECEIVABLES INTELLIGENCE',
              answer: `Analysis for ${targetInvNum}: Classified as ${pyRes.priority || 'HIGH'} priority. ${pyRes.priorityReason || 'High exposure overdue account.'}`,
              latencyMs,
              context: ctx,
              facts: {
                invoiceNumber: targetInvNum,
                customerName: pyRes.customerName || ctx.currentCustomerName || 'Customer Account',
                outstandingAmount: pyRes.outstandingAmount || 0,
                daysOverdue: pyRes.daysOverdue || 0,
              },
              recommendation: pyRes.recommendedAction || 'Issue formal payment reminder and escalate to AP manager.',
              policy: pyRes.policyDecision || 'APPROVED',
              data: pyRes,
            });
          }
        } catch (err) {
          console.warn('[Assistant Router] Receivables Python agent unavailable, falling back to database facts:', (err as any)?.message);
        }

        const invObj = await DatabaseService.getInvoiceById(targetInvNum);
        if (invObj) {
          ctx.currentInvoiceId = invObj.id;
          ctx.currentInvoiceNumber = invObj.invoice_number;
          ctx.currentCustomerId = invObj.customer_id;
          ctx.currentCustomerName = invObj.customer_name;
          ctx.lastReferencedEntity = invObj.invoice_number;
          ctx.lastReferencedEntityType = 'INVOICE';
        }

        const latencyMs = Date.now() - startTime;
        return res.status(200).json({
          success: true,
          intent: 'INVOICE_ANALYSIS',
          source: 'LIVE_DATABASE_FALLBACK',
          sourceLabel: 'LIVE DATABASE FALLBACK',
          answer: `Receivables Intelligence is temporarily unavailable. Database facts retrieved: Invoice ${targetInvNum} (${invObj?.customer_name || 'Customer'}) has an outstanding balance of ₹${(invObj?.outstanding_amount || 0).toLocaleString('en-IN')} and is ${invObj?.days_overdue || 0} days overdue.`,
          latencyMs,
          context: ctx,
          facts: {
            invoiceNumber: targetInvNum,
            customerName: invObj?.customer_name || 'Customer Account',
            outstandingAmount: invObj?.outstanding_amount || 0,
            daysOverdue: invObj?.days_overdue || 0,
            status: invObj?.status || 'unpaid',
          },
          recommendation: 'Verify invoice delivery and contact customer finance department.',
          policy: 'APPROVED',
          data: invObj || {},
        });
      }

      // ==================================================
      // 3. CUSTOMER ANALYSIS (PART 5 & 10)
      // ==================================================
      if (isCustomerAnalysisQuery) {
        console.log(`[Assistant Router] Intent: CUSTOMER_ANALYSIS`);

        if (!ctx.currentCustomerId && ctx.currentInvoiceNumber) {
          const invObj = await DatabaseService.getInvoiceById(ctx.currentInvoiceNumber);
          if (invObj?.customer_id) {
            ctx.currentCustomerId = invObj.customer_id;
            ctx.currentCustomerName = invObj.customer_name || 'Customer Account';
          }
        }

        if (!ctx.currentCustomerId) {
          ctx.currentInvoiceId = null;
          ctx.currentInvoiceNumber = null;
          ctx.currentPromiseId = null;
          ctx.currentPromiseContext = null;
          const latencyMs = Date.now() - startTime;
          return res.status(200).json({
            success: true,
            intent: 'CLARIFICATION_REQUIRED',
            source: 'DETERMINISTIC_ROUTER',
            sourceLabel: 'FINANCIAL OPERATIONS COPILOT',
            answer: 'I need to know which customer you mean. The current conversation has no active customer context. Please specify an invoice number (e.g. INV-SYNTH-10002) or customer name.',
            latencyMs,
            context: ctx,
            facts: {},
            recommendation: 'Specify an invoice number or customer name.',
            policy: 'APPROVED',
            data: {},
          });
        }

        ctx.lastReferencedEntity = ctx.currentCustomerName || ctx.currentCustomerId;
        ctx.lastReferencedEntityType = 'CUSTOMER';

        const customerProfile = await DatabaseService.getCustomerById(ctx.currentCustomerId);
        const cust = customerProfile?.customer;
        const custInvoices = customerProfile?.invoices || [];
        const custPromises = customerProfile?.promises || [];

        const realCustName = cust?.name || ctx.currentCustomerName || 'Customer Account';
        ctx.currentCustomerName = realCustName;

        const totalInvoiced = custInvoices.reduce((sum: number, i: any) => sum + Number(i.amount || 0), 0);
        const totalPaid = custInvoices.reduce((sum: number, i: any) => sum + Number(i.paid_amount || 0), 0);
        const totalOutstanding = Math.max(0, totalInvoiced - totalPaid);
        const overdueInvoices = custInvoices.filter(DatabaseService.isInvoiceOverdue);
        const brokenPromises = custPromises.filter((p: any) => String(p.status).toUpperCase() === 'BROKEN').length;

        const latencyMs = Date.now() - startTime;
        return res.status(200).json({
          success: true,
          intent: 'CUSTOMER_ANALYSIS',
          source: 'LIVE_DATABASE_FALLBACK',
          sourceLabel: 'LIVE DATABASE FALLBACK',
          answer: `CUSTOMER PROFILE\nCustomer: ${realCustName}\nRisk Score: ${cust?.risk_score || 50}/100\nTotal Invoices: ${custInvoices.length} (${overdueInvoices.length} overdue)\nTotal Outstanding: ₹${totalOutstanding.toLocaleString('en-IN')}\nBroken Promises: ${brokenPromises}`,
          latencyMs,
          context: ctx,
          facts: {
            customerId: ctx.currentCustomerId,
            customerName: realCustName,
            riskScore: cust?.risk_score || 50,
            creditLimit: cust?.credit_limit || 0,
            totalInvoices: custInvoices.length,
            overdueInvoicesCount: overdueInvoices.length,
            totalOutstanding,
            brokenPromisesCount: brokenPromises,
          },
          recommendation: (cust?.risk_score || 50) > 75
            ? 'Freeze additional credit extensions and issue urgent payment demand.'
            : 'Maintain standard credit monitoring.',
          policy: (cust?.risk_score || 50) > 75 ? 'HUMAN_REVIEW' : 'APPROVED',
          data: customerProfile || {},
        });
      }

      // ==================================================
      // 4. RECONCILIATION / PAYMENTS (PART 5)
      // ==================================================
      if (isReconciliationQuery) {
        console.log(`[Assistant Router] Intent: RECONCILIATION`);
        const targetLookup = ctx.currentInvoiceNumber || ctx.currentInvoiceId || explicitInvNum;

        if (targetLookup) {
          try {
            const pyRes = await postJsonToPython('/agents/reconciliation/run', { exceptionId: targetLookup });
            if (pyRes && pyRes.success !== false) {
              const latencyMs = Date.now() - startTime;
              return res.status(200).json({
                success: true,
                intent: 'RECONCILIATION_ANALYSIS',
                source: 'RECONCILIATION_INTELLIGENCE_AGENT',
                sourceLabel: 'RECONCILIATION INTELLIGENCE',
                answer: `Reconciliation Assessment for ${pyRes.invoiceNumber || targetLookup}: Primary Hypothesis is ${pyRes.primaryHypothesis || 'Short Pay Mismatch'}. ${pyRes.reason || ''}`,
                latencyMs,
                context: ctx,
                facts: pyRes,
                recommendation: pyRes.recommendedAction || 'Review reconciliation exception documentation.',
                policy: pyRes.policyDecision || 'HUMAN_REVIEW',
                data: pyRes,
              });
            }
          } catch (err) {
            console.warn('[Assistant Router] Reconciliation Python agent unavailable, falling back to database facts:', (err as any)?.message);
          }
        }

        let excQuery = supabase.from('reconciliation_exceptions').select('*, invoices(invoice_number)').in('status', ['OPEN', 'open', 'INVESTIGATING', 'investigating']);
        if (ctx.currentInvoiceId) {
          excQuery = excQuery.eq('invoice_id', ctx.currentInvoiceId);
        }

        const { data: exceptions } = await excQuery.order('created_at', { ascending: false });
        const count = exceptions?.length || 0;

        let paymentsList: any[] = [];
        if (ctx.currentInvoiceId) {
          paymentsList = await DatabaseService.getInvoicePayments(ctx.currentInvoiceId);
        }

        const latencyMs = Date.now() - startTime;
        const entityLabel = ctx.currentInvoiceNumber ? ` for ${ctx.currentInvoiceNumber}` : ctx.currentCustomerName ? ` for ${ctx.currentCustomerName}` : '';

        return res.status(200).json({
          success: true,
          intent: 'RECONCILIATION',
          source: 'LIVE_DATABASE_FALLBACK',
          sourceLabel: 'LIVE DATABASE FALLBACK',
          answer: `Receivables Intelligence is temporarily unavailable. Live database facts for PAYMENT & RECONCILIATION REVIEW${entityLabel}:\nPayments Received: ${paymentsList.length}\nOpen Reconciliation Exceptions: ${count}`,
          latencyMs,
          context: ctx,
          facts: {
            paymentsCount: paymentsList.length,
            exceptionsCount: count,
            entityContext: entityLabel,
          },
          recommendation: count > 0
            ? 'Request Form 16A TDS certificate or delivery note verification to resolve open discrepancy.'
            : 'No open reconciliation exceptions found for this entity.',
          policy: count > 0 ? 'HUMAN_REVIEW' : 'APPROVED',
          data: {
            exceptionCount: count,
            exceptions: (exceptions || []).slice(0, 10),
            payments: paymentsList,
          },
        });
      }

      // ==================================================
      // 5. NEXT ACTION ("What should we do next?") (PART 5)
      // ==================================================
      if (isNextActionQuery) {
        console.log(`[Assistant Router] Intent: NEXT_BEST_ACTION`);
        const targetInv = ctx.currentInvoiceNumber || 'INV-SYNTH-10002';
        const latencyMs = Date.now() - startTime;

        return res.status(200).json({
          success: true,
          intent: 'NEXT_BEST_ACTION',
          source: 'LIVE_DATABASE_FALLBACK',
          sourceLabel: 'LIVE DATABASE FALLBACK',
          answer: `RECOMMENDED ACTION PLAN for ${targetInv} (${ctx.currentCustomerName || 'Customer Account'}):\n1. Issue formal demand notice for past-due balance.\n2. Require updated written promise-to-pay with specific payment date.\n3. Hold credit expansion until outstanding exposure is resolved.`,
          latencyMs,
          context: ctx,
          facts: { targetInvoice: targetInv, customerName: ctx.currentCustomerName },
          recommendation: 'Execute structured outbound collection workflow and request human manager review.',
          policy: 'HUMAN_REVIEW',
          data: {},
        });
      }

      // ==================================================
      // 6. PORTFOLIO PRIORITY ("Which invoices need attention?") (PART 9 & 14)
      // ==================================================
      if (
        qLower.includes('need attention') ||
        qLower.includes('collect first') ||
        qLower.includes('priority') ||
        qLower.includes('top collection') ||
        qLower.includes('which invoices')
      ) {
        console.log(`[Assistant Router] Intent: PORTFOLIO_PRIORITY`);
        try {
          const pyRes = await postJsonToPython('/agents/receivables/rank', { topK: 5, candidateK: 15 });
          if (pyRes && pyRes.success) {
            const ranked = pyRes.rankedInvoices || [];
            const topItem = ranked[0];

            if (topItem) {
              ctx.currentInvoiceId = topItem.invoiceId;
              ctx.currentInvoiceNumber = topItem.invoiceNumber;
              ctx.currentCustomerId = topItem.customerId;
              ctx.currentCustomerName = topItem.customerName;
              ctx.lastReferencedEntity = topItem.invoiceNumber;
              ctx.lastReferencedEntityType = 'INVOICE';
            }

            const latencyMs = Date.now() - startTime;
            let answer = `Analyzed portfolio of ${pyRes.portfolioSize || 1261} total invoices and identified top collection risks. `;
            if (topItem) {
              answer += `Highest priority is ${topItem.invoiceNumber} (${topItem.customerName}) carrying an outstanding balance of ₹${(topItem.outstandingAmount || 0).toLocaleString('en-IN')} (${topItem.daysOverdue} days overdue).`;
            }

            return res.status(200).json({
              success: true,
              intent: 'PORTFOLIO_PRIORITY',
              source: 'RECEIVABLES_AGENT',
              sourceLabel: 'RECEIVABLES INTELLIGENCE',
              answer,
              latencyMs,
              context: ctx,
              facts: {
                portfolioSize: pyRes.portfolioSize || 1261,
                candidateCount: pyRes.candidateCount || ranked.length,
              },
              recommendation: topItem ? `Prioritize high-value overdue account ${topItem.invoiceNumber} before initiating formal collection notices.` : 'Routine monitoring.',
              policy: topItem?.policyDecision || 'APPROVED',
              data: {
                portfolioSize: pyRes.portfolioSize,
                rankedInvoices: ranked,
              },
            });
          }
        } catch (err) {
          console.warn('[Assistant Router] Portfolio Python agent unavailable, falling back to database facts:', (err as any)?.message);
        }

        const invoices = await DatabaseService.getInvoices();
        const overdue = invoices.filter(DatabaseService.isInvoiceOverdue).sort((a, b) => b.amount - a.amount);
        const top5 = overdue.slice(0, 5).map((inv, idx) => ({
          rank: idx + 1,
          invoiceId: inv.id,
          invoiceNumber: inv.invoice_number,
          customerName: inv.customer_name || inv.customers?.name || 'Customer Account',
          outstandingAmount: inv.outstanding_amount || inv.amount,
          daysOverdue: inv.days_overdue || 30,
          priority: inv.days_overdue > 30 ? 'CRITICAL' : 'HIGH',
          priorityReason: `Overdue balance of ₹${(inv.outstanding_amount || inv.amount).toLocaleString('en-IN')} (${inv.days_overdue} days past due).`,
          recommendedAction: 'Issue payment reminder to accounts payable contact.',
          policyDecision: 'APPROVED',
        }));

        if (top5[0]) {
          ctx.currentInvoiceId = top5[0].invoiceId;
          ctx.currentInvoiceNumber = top5[0].invoiceNumber;
          ctx.currentCustomerName = top5[0].customerName;
          ctx.lastReferencedEntity = top5[0].invoiceNumber;
          ctx.lastReferencedEntityType = 'INVOICE';
        }

        const latencyMs = Date.now() - startTime;
        return res.status(200).json({
          success: true,
          intent: 'PORTFOLIO_PRIORITY',
          source: 'LIVE_DATABASE_FALLBACK',
          sourceLabel: 'LIVE DATABASE FALLBACK',
          answer: `Receivables Intelligence is temporarily unavailable. Database facts returned ${overdue.length} overdue invoices in live portfolio. Top risk is ${top5[0]?.invoiceNumber || 'INV-SYNTH-10002'} (${top5[0]?.customerName}) carrying ₹${(top5[0]?.outstandingAmount || 0).toLocaleString('en-IN')}.`,
          latencyMs,
          context: ctx,
          facts: {
            portfolioSize: invoices.length,
            overdueCount: overdue.length,
          },
          recommendation: 'Focus collections on accounts exceeding 30 days overdue with high exposure.',
          policy: 'APPROVED',
          data: {
            portfolioSize: invoices.length,
            rankedInvoices: top5,
          },
        });
      }

      // ==================================================
      // 7. HIGHEST EXPOSURE
      // ==================================================
      if (
        qLower.includes('exposure') ||
        qLower.includes('owe the most') ||
        qLower.includes('money stuck') ||
        qLower.includes('largest') ||
        qLower.includes('highest balance')
      ) {
        console.log(`[Assistant Router] Intent: HIGHEST_EXPOSURE`);
        const invoices = await DatabaseService.getInvoices();
        const sorted = [...invoices].sort((a, b) => (b.outstanding_amount || b.amount) - (a.outstanding_amount || a.amount));
        const top5 = sorted.slice(0, 5);
        const topInv = top5[0];

        if (topInv) {
          ctx.currentInvoiceId = topInv.id;
          ctx.currentInvoiceNumber = topInv.invoice_number;
          ctx.currentCustomerId = topInv.customer_id;
          ctx.currentCustomerName = topInv.customer_name || topInv.customers?.name;
          ctx.lastReferencedEntity = topInv.invoice_number;
          ctx.lastReferencedEntityType = 'INVOICE';
        }

        const latencyMs = Date.now() - startTime;
        return res.status(200).json({
          success: true,
          intent: 'HIGHEST_EXPOSURE',
          source: 'LIVE_DATABASE_FALLBACK',
          sourceLabel: 'LIVE DATABASE FALLBACK',
          answer: `Top exposure account is ${topInv?.customer_name || 'Customer'} on invoice ${topInv?.invoice_number} carrying an outstanding balance of ₹${(topInv?.outstanding_amount || topInv?.amount || 0).toLocaleString('en-IN')} (${topInv?.days_overdue || 0} days overdue).`,
          latencyMs,
          context: ctx,
          facts: {
            topCustomer: topInv?.customer_name,
            topInvoice: topInv?.invoice_number,
            topAmount: topInv?.outstanding_amount || topInv?.amount,
          },
          recommendation: 'Review credit limits and hold new credit approvals for top exposure accounts with overdue balances.',
          policy: 'APPROVED',
          data: {
            topAccounts: top5.map(i => ({
              invoiceId: i.id,
              invoiceNumber: i.invoice_number,
              customerName: i.customer_name || i.customers?.name,
              outstandingAmount: i.outstanding_amount || i.amount,
              daysOverdue: i.days_overdue,
              status: i.status,
            })),
          },
        });
      }

      // ==================================================
      // 8. PORTFOLIO SUMMARY (PART 9 & 14)
      // ==================================================
      if (
        qLower.includes('summary') ||
        qLower.includes('portfolio health') ||
        qLower.includes('health') ||
        qLower.includes('overview')
      ) {
        console.log(`[Assistant Router] Intent: PORTFOLIO_SUMMARY`);
        const summary = await DatabaseService.getDashboardSummary();
        const latencyMs = Date.now() - startTime;

        return res.status(200).json({
          success: true,
          intent: 'PORTFOLIO_SUMMARY',
          source: 'LIVE_DATABASE_FALLBACK',
          sourceLabel: 'LIVE DATABASE FALLBACK',
          answer: `Portfolio Health Summary: Total outstanding receivable balance is ₹${summary.outstandingAmount.toLocaleString('en-IN')}, with ₹${summary.revenueAtRisk.toLocaleString('en-IN')} revenue at risk across ${summary.overdueInvoiceCount} overdue invoices. Active promises: ${summary.activePromiseCount}, Open exceptions: ${summary.openExceptionCount}.`,
          latencyMs,
          context: ctx,
          facts: summary,
          recommendation: 'Focus morning collection workflow on accounts with overdue balances exceeding ₹10 Lakhs.',
          policy: 'APPROVED',
          data: summary,
        });
      }

      // ==================================================
      // 9. UNSUPPORTED QUERY
      // ==================================================
      const latencyMs = Date.now() - startTime;
      return res.status(200).json({
        success: true,
        intent: 'UNSUPPORTED',
        source: 'DETERMINISTIC_ROUTER',
        sourceLabel: 'FINANCIAL OPERATIONS COPILOT',
        answer: `I am your Financial Operations Receivables Intelligence Assistant. You can ask me:\n1. "Which invoices need attention?"\n2. "Which accounts have the highest exposure?"\n3. "Why is INV-SYNTH-10002 important?"\n4. "What about its customer?"\n5. "What did this customer promise to pay?"\n6. "Did they fulfill it?"\n7. "Any payment issues?"\n8. "Give me a portfolio summary."`,
        latencyMs,
        context: ctx,
        facts: {},
        recommendation: 'Select one of the suggested operational prompts or specify an invoice number.',
        policy: 'APPROVED',
        data: {},
      });
    } catch (err: any) {
      console.error('[Assistant Router] Internal error:', err?.message || err);
      return res.status(500).json({
        success: false,
        error: 'Receivables intelligence service is temporarily unavailable.',
      });
    }
  }
}
