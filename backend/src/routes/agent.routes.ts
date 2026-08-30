import { Router } from 'express';
import { AgentController } from '../controllers/agent.controller.js';

const router = Router();

router.post('/query', AgentController.handleAgentQuery);
router.post('/receivables/run', AgentController.runReceivablesAgent);
router.post('/receivables/rank', AgentController.rankReceivables);
router.post('/promises/run', AgentController.runPromiseAgent);
router.post('/reconciliation/run', AgentController.runReconciliationAgent);
router.post('/supervisor/run', AgentController.runSupervisorAgent);
router.post('/actions/plan', AgentController.planAction);
router.post('/actions/execute', AgentController.executeAction);
router.post('/actions/outcome', AgentController.trackOutcome);
router.post('/plan', AgentController.planAction);
router.post('/execute', AgentController.executeAction);
router.post('/outcome', AgentController.trackOutcome);

export default router;




