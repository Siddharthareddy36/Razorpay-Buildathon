import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller.js';

const router = Router();

router.get('/', DashboardController.getBusinesses);

export default router;
