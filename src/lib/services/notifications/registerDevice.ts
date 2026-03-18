// ============================================
// REGISTER DEVICE SERVICE
// ============================================
// Registers or updates a device for push notifications
// ============================================

import { 
  upsertUserDevice, 
  getUserDeviceByFcmToken 
} from '@/lib/repositories/notificationsRepo'
import { createAuditLog } from '@/lib/repositories/auditRepo'
import { assertAuthenticated } from '@/lib/auth/session'

// ============================================
// INPUT TYPES
// ============================================
interface RegisterDeviceInput {
  platform: 'IOS' | 'ANDROID' | 'WEB_DESKTOP'
  fcmToken: string
  deviceLabel?: string
}

// ============================================
// OUTPUT TYPES
// ============================================
interface RegisterDeviceOutput {
  userDeviceId: string
  isNew: boolean
}

// ============================================
// SERVICE IMPLEMENTATION
// ============================================

export async function registerDeviceService(
  input: RegisterDeviceInput
): Promise<RegisterDeviceOutput> {
  const { platform, fcmToken, deviceLabel } = input
  
  // ==========================================
  // AUTH: Must be logged in
  // ==========================================
  const user = await assertAuthenticated()
  
  // ==========================================
  // Check if device already exists
  // ==========================================
  const existingDevice = await getUserDeviceByFcmToken(fcmToken)
  const isNew = !existingDevice
  
  // ==========================================
  // Upsert device
  // ==========================================
  const device = await upsertUserDevice({
    userId: user.id,
    platform,
    fcmToken,
    deviceLabel,
  })
  
  // ==========================================
  // AUDIT LOG (only for new devices)
  // ==========================================
  if (isNew) {
    await createAuditLog({
      actorUserId: user.id,
      entityType: 'USER_DEVICE',
      entityId: device.id,
      action: 'REGISTER_DEVICE',
      afterJson: {
        platform,
        deviceLabel: deviceLabel ?? null,
      },
    })
  }
  
  return {
    userDeviceId: device.id,
    isNew,
  }
}
