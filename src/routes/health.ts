import { Router, type Request, type Response } from 'express'

export const healthRouter = Router()

healthRouter.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'disciplr-backend',
    timestamp: new Date().toISOString(),
  })
})
