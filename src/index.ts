import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { vaultsRouter } from './routes/vaults.js'
import { healthRouter } from './routes/health.js'
import { healthRateLimiter, vaultsRateLimiter } from './middleware/rateLimiter.js'

const app = express()
const PORT = process.env.PORT ?? 3000

app.use(helmet())
app.use(cors({ origin: true }))
app.use(express.json())

app.use('/api/health', healthRateLimiter, healthRouter)
app.use('/api/vaults', vaultsRateLimiter, vaultsRouter)

app.listen(PORT, () => {
  console.log(`Disciplr API listening on http://localhost:${PORT}`)
})
