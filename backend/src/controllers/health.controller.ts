import { Request, Response } from 'express';
import { DatabaseService } from '../services/database.service.js';

export class HealthController {
  static async checkDatabaseHealth(req: Request, res: Response) {
    try {
      const health = await DatabaseService.checkHealth();
      return res.status(200).json(health);
    } catch (error: any) {
      console.error('Database health check failed:', error?.message || error);
      return res.status(500).json({
        connected: false,
        tablesVerified: false,
        error: 'Health check failed',
      });
    }
  }
}
