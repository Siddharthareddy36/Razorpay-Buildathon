import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller.js';

const router = Router();

router.get('/summary', DashboardController.getSummary);
router.get('/promises', DashboardController.getPromises);
router.get('/exceptions', DashboardController.getExceptions);
router.get('/businesses', DashboardController.getBusinesses);
router.get('/customers', DashboardController.getCustomers);
router.get('/customers/:id', DashboardController.getCustomerById);

export default router;
