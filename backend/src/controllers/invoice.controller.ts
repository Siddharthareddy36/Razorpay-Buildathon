import { Request, Response } from 'express';
import { DatabaseService } from '../services/database.service.js';

export class InvoiceController {
  static async getInvoices(req: Request, res: Response) {
    try {
      const invoices = await DatabaseService.getInvoices();
      return res.status(200).json(invoices);
    } catch (error: any) {
      console.error('Failed to get invoices:', error?.message || error);
      return res.status(500).json({ error: 'Failed to fetch invoices' });
    }
  }

  static async getInvoiceById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'Invoice ID is required' });
      }

      const invoice = await DatabaseService.getInvoiceById(id);
      if (!invoice) {
        return res.status(404).json({ error: `Invoice with ID '${id}' not found` });
      }

      return res.status(200).json(invoice);
    } catch (error: any) {
      console.error(`Failed to get invoice ${req.params.id}:`, error?.message || error);
      return res.status(500).json({ error: 'Failed to fetch invoice detail' });
    }
  }

  static async getInvoicePayments(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) return res.status(400).json({ error: 'Invoice ID is required' });

      const payments = await DatabaseService.getInvoicePayments(id);
      return res.status(200).json(payments);
    } catch (error: any) {
      console.error(`Failed to get payments for invoice ${req.params.id}:`, error?.message || error);
      return res.status(500).json({ error: 'Failed to fetch invoice payments' });
    }
  }

  static async getInvoicePromises(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) return res.status(400).json({ error: 'Invoice ID is required' });

      const promises = await DatabaseService.getInvoicePromises(id);
      return res.status(200).json(promises);
    } catch (error: any) {
      console.error(`Failed to get promises for invoice ${req.params.id}:`, error?.message || error);
      return res.status(500).json({ error: 'Failed to fetch invoice promises' });
    }
  }

  static async getInvoiceCommunications(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) return res.status(400).json({ error: 'Invoice ID is required' });

      const communications = await DatabaseService.getInvoiceCommunications(id);
      return res.status(200).json(communications);
    } catch (error: any) {
      console.error(`Failed to get communications for invoice ${req.params.id}:`, error?.message || error);
      return res.status(500).json({ error: 'Failed to fetch invoice communications' });
    }
  }

  static async getInvoiceExceptions(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) return res.status(400).json({ error: 'Invoice ID is required' });

      const exceptions = await DatabaseService.getInvoiceExceptions(id);
      return res.status(200).json(exceptions);
    } catch (error: any) {
      console.error(`Failed to get exceptions for invoice ${req.params.id}:`, error?.message || error);
      return res.status(500).json({ error: 'Failed to fetch invoice reconciliation exceptions' });
    }
  }
}
