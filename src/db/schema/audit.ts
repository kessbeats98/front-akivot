import { pgTable, uuid, text, timestamp, jsonb } from 'drizzle-orm/pg-core'
import { entityTypeEnum, auditActionEnum } from './enums'

// ============================================
// AUDIT LOGS TABLE
// Comprehensive audit trail for all state changes
// ============================================
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorUserId: uuid('actor_user_id').notNull(),
  entityType: entityTypeEnum('entity_type').notNull(),
  entityId: uuid('entity_id').notNull(),
  action: auditActionEnum('action').notNull(),
  beforeJson: jsonb('before_json'),
  afterJson: jsonb('after_json'),
  metadataJson: jsonb('metadata_json'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
