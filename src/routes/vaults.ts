import { Router, Request, Response } from 'express'
import { queryParser } from '../middleware/queryParser.js'
import { applyFilters, applySort, paginateArray } from '../utils/pagination.js'
import { isValidISO8601, parseAndNormalizeToUTC, utcNow } from '../utils/timestamps.js'

export const vaultsRouter = Router()

// In-memory placeholder; replace with DB (e.g. PostgreSQL) later
export interface Vault {
  id: string
  creator: string
  amount: string
  startTimestamp: string
  endTimestamp: string
  successDestination: string
  failureDestination: string
  status: 'active' | 'completed' | 'failed' | 'cancelled'
  createdAt: string
}

// In-memory placeholder; replace with DB (e.g. PostgreSQL) later
export let vaults: Array<Vault> = []

export const setVaults = (newVaults: Array<Vault>) => {
  vaults = newVaults
}

vaultsRouter.get(
  '/',
  queryParser({
    allowedSortFields: ['createdAt', 'amount', 'endTimestamp', 'status'],
    allowedFilterFields: ['status', 'creator'],
  }),
  (req: Request, res: Response) => {
    let result = [...vaults]

    // Apply filters
    if (req.filters) {
      result = applyFilters(result, req.filters)
    }

    // Apply sorting
    if (req.sort) {
      result = applySort(result, req.sort)
    }

    // Apply pagination
    const paginatedResult = paginateArray(result, req.pagination!)

    res.json(paginatedResult)
  }
)

vaultsRouter.post('/', (req: Request, res: Response) => {
  const {
    creator,
    amount,
    endTimestamp,
    successDestination,
    failureDestination,
  } = req.body as Record<string, string>

  if (!creator || !amount || !endTimestamp || !successDestination || !failureDestination) {
    res.status(400).json({
      error: 'Missing required fields: creator, amount, endTimestamp, successDestination, failureDestination',
    })
    return
  }

  if (!isValidISO8601(endTimestamp)) {
    res.status(400).json({
      error: 'endTimestamp must be a valid ISO 8601 datetime with timezone (e.g. 2025-12-31T23:59:59Z)',
    })
    return
  }

  const normalizedEnd = parseAndNormalizeToUTC(endTimestamp)

  if (new Date(normalizedEnd).getTime() <= Date.now()) {
    res.status(400).json({
      error: 'endTimestamp must be a future date',
    })
    return
  }

  const id = `vault-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  const startTimestamp = utcNow()
  const vault = {
    id,
    creator,
    amount,
    startTimestamp,
    endTimestamp: normalizedEnd,
    successDestination,
    failureDestination,
    status: 'active' as const,
    createdAt: startTimestamp,
  }
  vaults.push(vault)
  res.status(201).json(vault)
})

vaultsRouter.get('/:id', (req: Request, res: Response) => {
  const vault = vaults.find((v) => v.id === req.params.id)
  if (!vault) {
    res.status(404).json({ error: 'Vault not found' })
    return
  }
  res.json(vault)
})
