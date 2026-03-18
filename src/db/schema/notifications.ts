import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'
import { notificationTypeEnum, notificationDeliveryStatusEnum } from './enums'
import { userDevices } from './users'

// ============================================
// NOTIFICATION DELIVERIES TABLE
// Records of push notification attempts
// Tracks FCM message delivery status
// ============================================
export const notificationDeliveries = pgTable('notification_deliveries', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  userDeviceId: uuid('user_device_id').references(() => userDevices.id),
  type: notificationTypeEnum('type').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  status: notificationDeliveryStatusEnum('status').notNull().default('PENDING'),
  fcmMessageId: text('fcm_message_id'),
  walkId: uuid('walk_id'),
  walkBatchId: uuid('walk_batch_id'),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  failedAt: timestamp('failed_at', { withTimezone: true }),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
