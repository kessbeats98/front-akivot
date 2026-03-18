// ============================================
// DEVICES VALIDATION SCHEMAS
// ============================================
// Validation for device registration API inputs
// ============================================

import { z } from 'zod'
import { platformSchema } from './common'

// FCM token validation (required, non-empty string)
export const fcmTokenSchema = z.string()
  .min(1, 'FCM token is required')
  .max(4096, 'FCM token is too long')

// Device label validation (optional, max 255 chars)
export const deviceLabelSchema = z.string()
  .max(255, 'Device label is too long')
  .optional()

// Register device input validation
export const registerDeviceSchema = z.object({
  platform: platformSchema,
  fcmToken: fcmTokenSchema,
  deviceLabel: deviceLabelSchema,
})
