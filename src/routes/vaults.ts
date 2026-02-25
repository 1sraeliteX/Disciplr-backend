import { Router } from 'express'
import type { Request, Response } from 'express'
import { getPgPool } from '../db/pool.js'
import { IdempotencyConflictError, getIdempotentResponse, hashRequestPayload, saveIdempotentResponse } from '../services/idempotency.js'
import { buildVaultCreationPayload } from '../services/soroban.js'
import { createVaultWithMilestones, getVaultById, listVaults } from '../services/vaultStore.js'
import { normalizeCreateVaultInput, validateCreateVaultInput } from '../services/vaultValidation.js'
import type { VaultCreateResponse } from '../types/vaults.js'

export const vaultsRouter = Router()
vaultsRouter.get('/', async (_req: Request, res: Response) => {
  const vaults = await listVaults()
  res.json({ vaults })
})

vaultsRouter.post('/', async (req: Request, res: Response) => {
  const input = normalizeCreateVaultInput(req.body)
  const validation = validateCreateVaultInput(input)
  if (!validation.valid) {
    res.status(400).json({
      error: 'Vault creation payload validation failed.',
      details: validation.errors,
    })
    return
  }

  const idempotencyKey = req.header('idempotency-key')?.trim() || null
  const requestHash = hashRequestPayload(input)

  if (idempotencyKey) {
    try {
      const cachedResponse = await getIdempotentResponse<VaultCreateResponse>(idempotencyKey, requestHash)
      if (cachedResponse) {
        res.status(200).json({
          ...cachedResponse,
          idempotency: {
            key: idempotencyKey,
            replayed: true,
          },
        })
        return
      }
    } catch (error) {
      if (error instanceof IdempotencyConflictError) {
        res.status(409).json({ error: error.message })
        return
      }
      console.error('Failed to process idempotency key', error)
      res.status(500).json({ error: 'Failed to process idempotency key.' })
      return
    }
  }

  const pool = getPgPool()
  const client = pool ? await pool.connect() : null

  try {
    if (client) {
      await client.query('BEGIN')
    }

    const { vault } = await createVaultWithMilestones(input, client ?? undefined)
    const responseBody: VaultCreateResponse = {
      vault,
      onChain: buildVaultCreationPayload(input, vault),
      idempotency: {
        key: idempotencyKey,
        replayed: false,
      },
    }

    if (idempotencyKey) {
      await saveIdempotentResponse(idempotencyKey, requestHash, vault.id, responseBody, client ?? undefined)
    }

    if (client) {
      await client.query('COMMIT')
    }

    res.status(201).json(responseBody)
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK')
    }
    console.error('Vault creation failed', error)
    res.status(500).json({ error: 'Failed to create vault.' })
  } finally {
    if (client) {
      client.release()
    }
  }
})

vaultsRouter.get('/:id', async (req: Request, res: Response) => {
  const vault = await getVaultById(req.params.id)
  if (!vault) {
    res.status(404).json({ error: 'Vault not found' })
    return
  }
  res.json(vault)
})
