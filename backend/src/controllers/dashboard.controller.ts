import { Request, Response } from 'express';
import { DatabaseService } from '../services/database.service.js';

export class DashboardController {
  static async getSummary(req: Request, res: Response) {
    try {
      const summary = await DatabaseService.getDashboardSummary();
      return res.status(200).json(summary);
    } catch (error: any) {
      console.error('Failed to get dashboard summary:', error?.message || error);
      return res.status(500).json({ error: 'Failed to fetch dashboard summary metrics' });
    }
  }

  static async getPromises(req: Request, res: Response) {
    try {
      const promises = await DatabaseService.getAllPromises();
      return res.status(200).json(promises);
    } catch (error: any) {
      console.error('Failed to get promises:', error?.message || error);
      return res.status(500).json({ error: 'Failed to fetch promises' });
    }
  }

  static async getExceptions(req: Request, res: Response) {
    try {
      const exceptions = await DatabaseService.getAllExceptions();
      return res.status(200).json(exceptions);
    } catch (error: any) {
      console.error('Failed to get exceptions:', error?.message || error);
      return res.status(500).json({ error: 'Failed to fetch reconciliation exceptions' });
    }
  }

  static async getBusinesses(req: Request, res: Response) {
    try {
      const businesses = await DatabaseService.getBusinesses();
      return res.status(200).json(businesses);
    } catch (error: any) {
      console.error('Failed to get businesses:', error?.message || error);
      return res.status(500).json({ error: 'Failed to fetch businesses' });
    }
  }

  static async getCustomers(req: Request, res: Response) {
    try {
      const customers = await DatabaseService.getCustomers();
      return res.status(200).json(customers);
    } catch (error: any) {
      console.error('Failed to get customers:', error?.message || error);
      return res.status(500).json({ error: 'Failed to fetch customers' });
    }
  }

  static async getCustomerById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = await DatabaseService.getCustomerById(id);
      if (!data) return res.status(404).json({ error: `Customer '${id}' not found` });
      return res.status(200).json(data);
    } catch (error: any) {
      console.error(`Failed to get customer ${req.params.id}:`, error?.message || error);
      return res.status(500).json({ error: 'Failed to fetch customer 360 profile' });
    }
  }
}
