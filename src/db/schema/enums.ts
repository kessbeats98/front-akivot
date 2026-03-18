import { pgEnum } from 'drizzle-orm/pg-core'

// Platform enum for device tracking
export const platformEnum = pgEnum('platform', ['IOS', 'ANDROID', 'WEB_DESKTOP'])

// Walk status enum - state machine states
export const walkStatusEnum = pgEnum('walk_status', ['PLANNED', 'LIVE', 'COMPLETED', 'AUTO_CLOSED', 'CANCELLED'])

// Walk batch status enum
export const walkBatchStatusEnum = pgEnum('walk_batch_status', ['LIVE', 'COMPLETED', 'AUTO_CLOSED', 'CANCELLED'])

// Closure reason enum - how a walk ended
export const closureReasonEnum = pgEnum('closure_reason', ['MANUAL', 'AUTO_TIMEOUT', 'CANCELLED', 'SYSTEM_FIX'])

// Walk media type enum
export const walkMediaTypeEnum = pgEnum('walk_media_type', ['PHOTO'])

// Media storage provider enum
export const mediaProviderEnum = pgEnum('media_provider', ['VERCEL_BLOB'])

// Media upload status enum
export const mediaUploadStatusEnum = pgEnum('media_upload_status', ['PENDING', 'UPLOADING', 'UPLOADED', 'FAILED'])

// Payment period status enum
export const paymentPeriodStatusEnum = pgEnum('payment_period_status', ['OPEN', 'PAID', 'REOPENED', 'ARCHIVED'])

// Payment entry type enum
export const paymentEntryTypeEnum = pgEnum('payment_entry_type', ['WALK', 'ADJUSTMENT'])

// Notification type enum
export const notificationTypeEnum = pgEnum('notification_type', [
  'WALK_STARTED',
  'WALK_COMPLETED',
  'AUTO_TIMEOUT_WARNING',
  'AUTO_CLOSED',
  'ONBOARDING_REMINDER'
])

// Notification delivery status enum
export const notificationDeliveryStatusEnum = pgEnum('notification_delivery_status', [
  'PENDING',
  'SENT',
  'FAILED',
  'TOKEN_INVALID'
])

// Entity type enum for audit logs
export const entityTypeEnum = pgEnum('entity_type', [
  'USER',
  'WALKER_PROFILE',
  'DOG',
  'DOG_OWNER',
  'DOG_WALKER',
  'WALK_BATCH',
  'WALK',
  'WALK_MEDIA',
  'PAYMENT_PERIOD',
  'PAYMENT_ENTRY',
  'USER_DEVICE',
  'INVITE',
  'NOTIFICATION_DELIVERY'
])

// Audit action enum
export const auditActionEnum = pgEnum('audit_action', [
  'CREATE',
  'UPDATE',
  'DELETE',
  'START_WALK',
  'END_WALK',
  'AUTO_CLOSE_WALK',
  'CANCEL_WALK',
  'CLOSE_PAYMENT_PERIOD',
  'MARK_PAYMENT_PAID',
  'REOPEN_PAYMENT_PERIOD',
  'REGISTER_DEVICE',
  'INVALIDATE_DEVICE',
  'SEND_NOTIFICATION',
  'UPLOAD_MEDIA'
])

// Invite status enum
export const inviteStatusEnum = pgEnum('invite_status', ['ACTIVE', 'EXPIRED', 'DISABLED'])

// Export type helpers
export type Platform = typeof platformEnum.enumValues[number]
export type WalkStatus = typeof walkStatusEnum.enumValues[number]
export type WalkBatchStatus = typeof walkBatchStatusEnum.enumValues[number]
export type ClosureReason = typeof closureReasonEnum.enumValues[number]
export type PaymentPeriodStatus = typeof paymentPeriodStatusEnum.enumValues[number]
export type NotificationType = typeof notificationTypeEnum.enumValues[number]
