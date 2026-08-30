import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller.js';

const router = Router();

router.get('/', DashboardController.getCustomers);
router.get('/:id', DashboardController.getCustomerById);

export default router;
