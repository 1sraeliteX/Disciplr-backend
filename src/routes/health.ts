import { Router } from 'express'
import { utcNow } from '../utils/timestamps.js'

export const healthRouter = Router()

healthRouter.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'disciplr-backend',
    timestamp: utcNow(),
  })
})
