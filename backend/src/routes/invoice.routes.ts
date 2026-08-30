import { Router } from 'express';
import { InvoiceController } from '../controllers/invoice.controller.js';

const router = Router();

router.get('/', InvoiceController.getInvoices);
router.get('/:id', InvoiceController.getInvoiceById);
router.get('/:id/payments', InvoiceController.getInvoicePayments);
router.get('/:id/promises', InvoiceController.getInvoicePromises);
router.get('/:id/communications', InvoiceController.getInvoiceCommunications);
router.get('/:id/exceptions', InvoiceController.getInvoiceExceptions);

export default router;
