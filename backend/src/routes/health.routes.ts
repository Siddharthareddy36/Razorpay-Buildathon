import { Router } from 'express';
import { HealthController } from '../controllers/health.controller.js';

const router = Router();

router.get('/database', HealthController.checkDatabaseHealth);

export default router;
