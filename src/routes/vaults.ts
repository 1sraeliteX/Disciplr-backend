import { Router, type Request, type Response } from 'express'

export const vaultsRouter = Router()

type VaultStatus = 'active' | 'completed' | 'failed' | 'cancelled'
type VaultRole = 'creator' | 'admin' | 'member'
type VaultHistoryType = 'created' | 'cancel_requested' | 'cancelled' | 'cancel_rejected'
type ValidationStatus = 'approved' | 'rejected'
type ChainTxStatus = 'submitted' | 'confirmed'

type VaultHistoryEntry = {
  id: string
  type: VaultHistoryType
  timestamp: string
  actor: string
  role: VaultRole
  note?: string
}

type VaultValidationRecord = {
  id: string
  type: 'cancellation'
  status: ValidationStatus
  reason?: string
  actor: string
  role: VaultRole
  timestamp: string
}

type VaultChainTx = {
  id: string
  network: 'testnet'
  status: ChainTxStatus
  txHash: string
  submittedAt: string
  confirmedAt?: string
}

type VaultCancellation = {
  requestedAt: string
  cancelledAt: string
  actor: string
  role: VaultRole
  reason?: string
  chainTx: VaultChainTx
}

// In-memory placeholder; replace with DB (e.g. PostgreSQL) later
const vaults: Array<{
  id: string
  creator: string
  amount: string
  startTimestamp: string
  endTimestamp: string
  successDestination: string
  failureDestination: string
  status: VaultStatus
  createdAt: string
  fundedAt?: string
  milestoneValidatedAt?: string
  cancelledAt?: string
  cancellation?: VaultCancellation
  history: VaultHistoryEntry[]
  validationRecords: VaultValidationRecord[]
}> = []

const nowIso = () => new Date().toISOString()
const makeId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

const canCancelVault = (vault: (typeof vaults)[number], role: VaultRole) => {
  if (vault.status !== 'active') {
    return { allowed: false, reason: 'Vault is not active' }
  }
  if (vault.fundedAt) {
    return { allowed: false, reason: 'Vault is already funded' }
  }
  if (vault.milestoneValidatedAt) {
    return { allowed: false, reason: 'Milestone has already been validated' }
  }
  if (role !== 'creator' && role !== 'admin') {
    return { allowed: false, reason: 'Only creator or admin can cancel a vault' }
  }
  return { allowed: true }
}

const simulateCancellationOnChain = (): VaultChainTx => {
  const submittedAt = nowIso()
  const confirmedAt = nowIso()
  return {
    id: makeId('tx'),
    network: 'testnet',
    status: 'confirmed',
    txHash: `0x${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`,
    submittedAt,
    confirmedAt,
  }
}

const isVaultRole = (role: string): role is VaultRole =>
  role === 'creator' || role === 'admin' || role === 'member'

vaultsRouter.get('/', (_req: Request, res: Response) => {
  res.json({ vaults })
})

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

  const id = makeId('vault')
  const startTimestamp = nowIso()
  const vault = {
    id,
    creator,
    amount,
    startTimestamp,
    endTimestamp,
    successDestination,
    failureDestination,
    status: 'active' as const,
    createdAt: startTimestamp,
    fundedAt: undefined,
    milestoneValidatedAt: undefined,
    cancelledAt: undefined,
    cancellation: undefined,
    history: [
      {
        id: makeId('history'),
        type: 'created' as const,
        timestamp: startTimestamp,
        actor: creator,
        role: 'creator' as const,
      },
    ],
    validationRecords: [],
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

vaultsRouter.post('/:id/cancel', (req: Request, res: Response) => {
  const vault = vaults.find((v) => v.id === req.params.id)
  if (!vault) {
    res.status(404).json({ error: 'Vault not found' })
    return
  }

  const { actor, role, reason } = req.body as {
    actor?: string
    role?: VaultRole
    reason?: string
  }

  if (!actor || !role) {
    res.status(400).json({ error: 'Missing required fields: actor, role' })
    return
  }
  if (!isVaultRole(role)) {
    res.status(400).json({ error: 'Invalid role. Must be creator, admin, or member' })
    return
  }

  const validationId = makeId('validation')
  const validationTimestamp = nowIso()
  const eligibility = canCancelVault(vault, role)

  if (!eligibility.allowed) {
    const rejection: VaultValidationRecord = {
      id: validationId,
      type: 'cancellation',
      status: 'rejected',
      reason: eligibility.reason,
      actor,
      role,
      timestamp: validationTimestamp,
    }
    vault.validationRecords.push(rejection)
    vault.history.push({
      id: makeId('history'),
      type: 'cancel_rejected',
      timestamp: validationTimestamp,
      actor,
      role,
      note: eligibility.reason,
    })
    res.status(422).json({ error: eligibility.reason, validation: rejection, vault })
    return
  }

  const requestedAt = validationTimestamp
  vault.history.push({
    id: makeId('history'),
    type: 'cancel_requested',
    timestamp: requestedAt,
    actor,
    role,
    note: reason,
  })

  const chainTx = simulateCancellationOnChain()
  const cancelledAt = chainTx.confirmedAt ?? requestedAt
  const cancellation: VaultCancellation = {
    requestedAt,
    cancelledAt,
    actor,
    role,
    reason,
    chainTx,
  }

  vault.status = 'cancelled'
  vault.cancelledAt = cancelledAt
  vault.cancellation = cancellation

  const approval: VaultValidationRecord = {
    id: validationId,
    type: 'cancellation',
    status: 'approved',
    reason,
    actor,
    role,
    timestamp: cancelledAt,
  }
  vault.validationRecords.push(approval)
  vault.history.push({
    id: makeId('history'),
    type: 'cancelled',
    timestamp: cancelledAt,
    actor,
    role,
    note: reason,
  })

  res.json({ vault, cancellation })
})
