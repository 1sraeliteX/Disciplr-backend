import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { healthRouter } from './routes/health.js'
import { vaultsRouter } from './routes/vaults.js'

export const app = express()

app.use(helmet())
app.use(cors({ origin: true }))
app.use(express.json())

app.use('/api/health', healthRouter)
app.use('/api/vaults', vaultsRouter)
