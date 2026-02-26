export interface Milestone {
  id: string
  vaultId: string
  description: string
  verified: boolean
  verifiedAt: string | null
  createdAt: string
}

const milestonesTable: Milestone[] = []

export const createMilestone = (vaultId: string, description: string): Milestone => {
  const id = `ms-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  const milestone: Milestone = {
    id,
    vaultId,
    description,
    verified: false,
    verifiedAt: null,
    createdAt: new Date().toISOString(),
  }
  milestonesTable.push(milestone)
  return milestone
}

export const getMilestonesByVaultId = (vaultId: string): Milestone[] => {
  return milestonesTable.filter((m) => m.vaultId === vaultId)
}

export const getMilestoneById = (id: string): Milestone | undefined => {
  return milestonesTable.find((m) => m.id === id)
}

export const verifyMilestone = (id: string): Milestone | null => {
  const milestone = milestonesTable.find((m) => m.id === id)
  if (!milestone) return null

  milestone.verified = true
  milestone.verifiedAt = new Date().toISOString()
  return milestone
}

export const allMilestonesVerified = (vaultId: string): boolean => {
  const milestones = getMilestonesByVaultId(vaultId)
  if (milestones.length === 0) return false
  return milestones.every((m) => m.verified)
}

export const resetMilestonesTable = (): void => {
  milestonesTable.length = 0
}
