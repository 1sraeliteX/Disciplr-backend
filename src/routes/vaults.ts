import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware.js'
import { VaultService } from '../services/vault.service.js'
import { VaultStatus } from '@prisma/client'

export const vaultsRouter = Router()

// List vaults with filtering and pagination
vaultsRouter.get('/', authenticate, async (req, res) => {
  const { status, minAmount, maxAmount, startDate, endDate, page, limit } = req.query

  try {
    const result = await VaultService.listVaults(
      {
        status: status as VaultStatus,
        minAmount: minAmount as string,
        maxAmount: maxAmount as string,
        startDate: startDate as string,
        endDate: endDate as string,
      },
      {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      },
      req.user!.userId,
      req.user!.role
    )
    res.json(result)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Get vault detail
vaultsRouter.get('/:id', authenticate, async (req, res) => {
  const { id } = req.params

  try {
    const vault = await VaultService.getVaultDetails(id, req.user!.userId, req.user!.role)
    res.json(vault)
  } catch (error: any) {
    const status = error.message.includes('Forbidden') ? 403 : 404
    res.status(status).json({ error: error.message })
  }
})
