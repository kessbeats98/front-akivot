// ============================================
// NOTIFICATIONS REPOSITORY
// ============================================
// Database access for notifications and device management
// No business logic - just data access
// ============================================

import { db } from '@/db'
import { userDevices, notificationDeliveries } from '@/db/schema'
import { eq, and, inArray, isNull, not } from 'drizzle-orm'
import { randomUUID } from 'crypto'

// ============================================
// USER DEVICE OPERATIONS
// ============================================

export async function getUserDeviceById(id: string) {
  const [device] = await db
    .select()
    .from(userDevices)
    .where(eq(userDevices.id, id))
    .limit(1)
  
  return device ?? null
}

export async function getUserDeviceByFcmToken(fcmToken: string) {
  const [device] = await db
    .select()
    .from(userDevices)
    .where(eq(userDevices.fcmToken, fcmToken))
    .limit(1)
  
  return device ?? null
}

export async function getActiveDevicesForUser(userId: string) {
  return db
    .select()
    .from(userDevices)
    .where(and(
      eq(userDevices.userId, userId),
      eq(userDevices.notificationsEnabled, true),
      isNull(userDevices.invalidatedAt)
    ))
}

export async function getActiveDevicesForUsers(userIds: string[]) {
  if (userIds.length === 0) return []
  
  return db
    .select()
    .from(userDevices)
    .where(and(
      inArray(userDevices.userId, userIds),
      eq(userDevices.notificationsEnabled, true),
      isNull(userDevices.invalidatedAt)
    ))
}

export async function upsertUserDevice(data: {
  userId: string
  platform: 'IOS' | 'ANDROID' | 'WEB_DESKTOP'
  fcmToken: string
  deviceLabel?: string
}) {
  // Check if device with this FCM token exists
  const existing = await getUserDeviceByFcmToken(data.fcmToken)
  
  if (existing) {
    // Update existing device
    const [device] = await db
      .update(userDevices)
      .set({
        userId: data.userId,
        platform: data.platform,
        deviceLabel: data.deviceLabel ?? existing.deviceLabel,
        appInstalled: true,
        lastSeenAt: new Date(),
        invalidatedAt: null, // Re-activate if was invalidated
        updatedAt: new Date(),
      })
      .where(eq(userDevices.id, existing.id))
      .returning()
    
    return device
  }
  
  // Create new device
  const [device] = await db
    .insert(userDevices)
    .values({
      id: randomUUID(),
      userId: data.userId,
      platform: data.platform,
      deviceLabel: data.deviceLabel ?? null,
      fcmToken: data.fcmToken,
      appInstalled: true,
      notificationsEnabled: true,
      lastSeenAt: new Date(),
    })
    .returning()
  
  return device
}

export async function markDeviceInvalid(fcmToken: string) {
  const [device] = await db
    .update(userDevices)
    .set({
      invalidatedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(userDevices.fcmToken, fcmToken))
    .returning()
  
  return device ?? null
}

export async function updateDeviceNotificationSettings(
  deviceId: string,
  notificationsEnabled: boolean
) {
  const [device] = await db
    .update(userDevices)
    .set({
      notificationsEnabled,
      updatedAt: new Date(),
    })
    .where(eq(userDevices.id, deviceId))
    .returning()
  
  return device ?? null
}

// ============================================
// NOTIFICATION DELIVERY OPERATIONS
// ============================================

export async function createNotificationDelivery(data: {
  userId: string
  userDeviceId?: string
  type: 'WALK_STARTED' | 'WALK_COMPLETED' | 'AUTO_TIMEOUT_WARNING' | 'AUTO_CLOSED' | 'ONBOARDING_REMINDER'
  title: string
  body: string
  walkId?: string
  walkBatchId?: string
}) {
  const [delivery] = await db
    .insert(notificationDeliveries)
    .values({
      id: randomUUID(),
      userId: data.userId,
      userDeviceId: data.userDeviceId ?? null,
      type: data.type,
      title: data.title,
      body: data.body,
      status: 'PENDING',
      walkId: data.walkId ?? null,
      walkBatchId: data.walkBatchId ?? null,
    })
    .returning()
  
  return delivery
}

export async function updateNotificationDelivery(id: string, data: Partial<{
  status: 'PENDING' | 'SENT' | 'FAILED' | 'TOKEN_INVALID'
  fcmMessageId: string
  sentAt: Date
  failedAt: Date
  errorMessage: string
}>) {
  const [delivery] = await db
    .update(notificationDeliveries)
    .set(data)
    .where(eq(notificationDeliveries.id, id))
    .returning()
  
  return delivery ?? null
}

export async function getRecentNotificationForWalk(
  walkId: string,
  type: 'WALK_STARTED' | 'WALK_COMPLETED' | 'AUTO_TIMEOUT_WARNING' | 'AUTO_CLOSED'
) {
  // Check if notification was already sent for this walk and type
  const recentCutoff = new Date(Date.now() - 10 * 60 * 1000) // 10 minutes
  
  const [delivery] = await db
    .select()
    .from(notificationDeliveries)
    .where(and(
      eq(notificationDeliveries.walkId, walkId),
      eq(notificationDeliveries.type, type),
      not(isNull(notificationDeliveries.sentAt))
    ))
    .limit(1)
  
  return delivery ?? null
}

export async function getPendingNotifications() {
  return db
    .select()
    .from(notificationDeliveries)
    .where(eq(notificationDeliveries.status, 'PENDING'))
    .limit(100)
}
