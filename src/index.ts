import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { vaultsRouter } from './routes/vaults.js'
import { healthRouter } from './routes/health.js'
import { authRouter } from './routes/auth.js'
import { adminRouter } from './routes/admin.js'

const app = express()
const PORT = process.env.PORT ?? 3000

app.use(helmet())
app.use(cors({ origin: true }))
app.use(express.json())

app.use('/api/health', healthRouter)
app.use('/api/auth', authRouter)
app.use('/api/vaults', vaultsRouter)
app.use('/api/admin', adminRouter)

app.listen(PORT, () => {
  console.log(`Disciplr API listening on http://localhost:${PORT}`)
})
