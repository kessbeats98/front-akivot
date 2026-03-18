// ============================================
// SEND WALK NOTIFICATIONS SERVICE
// ============================================
// Sends push notifications for walk lifecycle events
// Records delivery attempts and never throws
// ============================================

import { db } from '@/db'
import { dogOwners, walks } from '@/db/schema'
import {
  createNotificationDelivery,
  getActiveDevicesForUsers,
  markDeviceInvalid,
  updateNotificationDelivery,
} from '@/lib/repositories/notificationsRepo'
import { inArray } from 'drizzle-orm'
import admin from 'firebase-admin'

interface SendWalkNotificationsInput {
  walkIds: string[]
  type: 'WALK_STARTED' | 'WALK_COMPLETED' | 'AUTO_CLOSED' | 'AUTO_TIMEOUT_WARNING'
  walkerUserId?: string
}

let messagingSingleton: admin.messaging.Messaging | null = null

function getFirebaseAdmin() {
  if (messagingSingleton) return messagingSingleton

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY

  if (!projectId || !clientEmail || !privateKeyRaw) {
    return null
  }

  const privateKey = privateKeyRaw.replace(/\\n/g, '\n')

  try {
    const existing = admin.apps.find((a) => a?.name === 'akivot')
    const app =
      existing ??
      admin.initializeApp(
        {
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        },
        'akivot'
      )

    messagingSingleton = app.messaging()
    return messagingSingleton
  } catch (err) {
    console.error('Failed to init firebase-admin:', err)
    return null
  }
}

function getNotificationContent(type: SendWalkNotificationsInput['type']) {
  switch (type) {
    case 'WALK_STARTED':
      return { title: 'הטיול התחיל 🐕', body: 'הכלב שלך יצא לטיול' }
    case 'WALK_COMPLETED':
      return { title: 'הטיול הסתיים ✅', body: 'הכלב שלך חזר הביתה' }
    case 'AUTO_CLOSED':
      return { title: 'טיול נסגר אוטומטית', body: 'הטיול נסגר אחרי 120 דקות' }
    case 'AUTO_TIMEOUT_WARNING':
      return { title: 'טיול פעיל מעל 90 דקות', body: 'האם הטיול הסתיים?' }
  }
}

function isTokenNotRegisteredError(err: unknown): boolean {
  const code = (err as any)?.code ?? (err as any)?.errorInfo?.code
  return (
    code === 'messaging/registration-token-not-registered' ||
    code === 'messaging/invalid-registration-token'
  )
}

export async function sendWalkNotifications(input: SendWalkNotificationsInput): Promise<void> {
  try {
    const { walkIds, type, walkerUserId } = input

    if (!walkIds || walkIds.length === 0) return

    const walkRows = await db
      .select({
        id: walks.id,
        dogId: walks.dogId,
        walkBatchId: walks.walkBatchId,
      })
      .from(walks)
      .where(inArray(walks.id, walkIds))

    if (walkRows.length === 0) return

    const walkById = new Map<string, (typeof walkRows)[number]>(walkRows.map((w) => [w.id, w]))

    let targetUserIds: string[] = []

    if (type === 'AUTO_TIMEOUT_WARNING') {
      if (!walkerUserId) return
      targetUserIds = [walkerUserId]
    } else {
      const uniqueDogIds: string[] = Array.from(new Set(walkRows.map((w) => w.dogId)))
      if (uniqueDogIds.length === 0) return

      const ownerRows = await db
        .select({ ownerUserId: dogOwners.ownerUserId })
        .from(dogOwners)
        .where(inArray(dogOwners.dogId, uniqueDogIds))

      targetUserIds = Array.from(new Set(ownerRows.map((r) => r.ownerUserId)))
      if (targetUserIds.length === 0) return
    }

    const devices = await getActiveDevicesForUsers(targetUserIds)
    if (devices.length === 0) return

    const messaging = getFirebaseAdmin()
    const { title, body } = getNotificationContent(type)

    await Promise.all(
      devices.map(async (device) => {
        const relatedWalkId = walkRows[0]?.id ?? null
        const walk = walkById.get(relatedWalkId ?? '')
        const relatedWalkBatchId = walk?.walkBatchId ?? null

        try {
          const delivery = await createNotificationDelivery({
            userId: device.userId,
            userDeviceId: device.id,
            type,
            title,
            body,
            walkId: relatedWalkId ?? undefined,
            walkBatchId: relatedWalkBatchId ?? undefined,
          })

          if (!messaging) {
            await updateNotificationDelivery(delivery.id, {
              status: 'FAILED',
              failedAt: new Date(),
              errorMessage: 'firebase-admin not configured',
            })
            return
          }

          try {
            const messageId = await messaging.send({
              token: device.fcmToken,
              notification: { title, body },
              data: {
                type,
                walkId: relatedWalkId ?? '',
                walkBatchId: relatedWalkBatchId ?? '',
              },
            })

            await updateNotificationDelivery(delivery.id, {
              status: 'SENT',
              sentAt: new Date(),
              fcmMessageId: messageId,
            })
          } catch (err) {
            if (isTokenNotRegisteredError(err)) {
              await markDeviceInvalid(device.fcmToken)
              await updateNotificationDelivery(delivery.id, {
                status: 'TOKEN_INVALID',
                failedAt: new Date(),
                errorMessage: String((err as any)?.message ?? err),
              })
              return
            }

            await updateNotificationDelivery(delivery.id, {
              status: 'FAILED',
              failedAt: new Date(),
              errorMessage: String((err as any)?.message ?? err),
            })
          }
        } catch (err) {
          console.error('sendWalkNotifications delivery error:', err)
        }
      })
    )
  } catch (err) {
    console.error('sendWalkNotifications error:', err)
  }
}
