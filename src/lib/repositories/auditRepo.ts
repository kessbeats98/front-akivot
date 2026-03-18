// ============================================
// AUDIT REPOSITORY
// ============================================
// Database access for audit logging
// No business logic - just data access
// ============================================

import { db } from '@/db'
import { auditLogs } from '@/db/schema'
import { randomUUID } from 'crypto'

// ============================================
// AUDIT LOG TYPES
// ============================================
export type EntityType = 
  | 'USER'
  | 'WALKER_PROFILE'
  | 'DOG'
  | 'DOG_OWNER'
  | 'DOG_WALKER'
  | 'WALK_BATCH'
  | 'WALK'
  | 'WALK_MEDIA'
  | 'PAYMENT_PERIOD'
  | 'PAYMENT_ENTRY'
  | 'USER_DEVICE'
  | 'INVITE'
  | 'NOTIFICATION_DELIVERY'

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'START_WALK'
  | 'END_WALK'
  | 'AUTO_CLOSE_WALK'
  | 'CANCEL_WALK'
  | 'CLOSE_PAYMENT_PERIOD'
  | 'MARK_PAYMENT_PAID'
  | 'REOPEN_PAYMENT_PERIOD'
  | 'REGISTER_DEVICE'
  | 'INVALIDATE_DEVICE'
  | 'SEND_NOTIFICATION'
  | 'UPLOAD_MEDIA'

// ============================================
// AUDIT LOG OPERATIONS
// ============================================

export async function createAuditLog(data: {
  actorUserId: string
  entityType: EntityType
  entityId: string
  action: AuditAction
  beforeJson?: Record<string, unknown>
  afterJson?: Record<string, unknown>
  metadataJson?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}) {
  const [log] = await db
    .insert(auditLogs)
    .values({
      id: randomUUID(),
      actorUserId: data.actorUserId,
      entityType: data.entityType,
      entityId: data.entityId,
      action: data.action,
      beforeJson: data.beforeJson ?? null,
      afterJson: data.afterJson ?? null,
      metadataJson: data.metadataJson ?? null,
      ipAddress: data.ipAddress ?? null,
      userAgent: data.userAgent ?? null,
    })
    .returning()
  
  return log
}

// ============================================
// BULK AUDIT LOG CREATION
// For batch operations like closing a walk batch
// ============================================

export async function createAuditLogsBatch(
  logs: Array<{
    actorUserId: string
    entityType: EntityType
    entityId: string
    action: AuditAction
    beforeJson?: Record<string, unknown>
    afterJson?: Record<string, unknown>
    metadataJson?: Record<string, unknown>
    ipAddress?: string
    userAgent?: string
  }>
) {
  if (logs.length === 0) return []
  
  const results = await db
    .insert(auditLogs)
    .values(logs.map(log => ({
      id: randomUUID(),
      actorUserId: log.actorUserId,
      entityType: log.entityType,
      entityId: log.entityId,
      action: log.action,
      beforeJson: log.beforeJson ?? null,
      afterJson: log.afterJson ?? null,
      metadataJson: log.metadataJson ?? null,
      ipAddress: log.ipAddress ?? null,
      userAgent: log.userAgent ?? null,
    })))
    .returning()
  
  return results
}

// ============================================
// AUDIT LOG QUERIES
// ============================================

export async function getAuditLogsForEntity(
  entityType: EntityType,
  entityId: string
) {
  const { desc } = await import('drizzle-orm')
  
  return db
    .select()
    .from(auditLogs)
    .where(and(
      eq(auditLogs.entityType, entityType),
      eq(auditLogs.entityId, entityId)
    ))
    .orderBy(desc(auditLogs.createdAt))
}

import { eq, and, desc } from 'drizzle-orm'
