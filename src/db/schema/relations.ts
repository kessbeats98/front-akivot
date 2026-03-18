import { relations } from 'drizzle-orm'
import { walkerProfiles, userDevices } from './users'
import { dogs, dogOwners, dogWalkers } from './dogs'
import { walkBatches, walks, walkMedia } from './walks'
import { paymentPeriods, paymentEntries } from './billing'
import { notificationDeliveries } from './notifications'

// ============================================
// RELATIONS — safe subset (uuid-to-uuid only)
// User-referencing relations added in Commit 2b
// ============================================

// walkerProfiles (uuid PK — skip user relation until text migration)
export const walkerProfilesRelations = relations(walkerProfiles, ({ many }) => ({
  dogWalkers: many(dogWalkers),
  walkBatches: many(walkBatches),
  paymentPeriods: many(paymentPeriods),
}))

// userDevices
export const userDevicesRelations = relations(userDevices, ({ many }) => ({
  notificationDeliveries: many(notificationDeliveries),
}))

// dogs
export const dogsRelations = relations(dogs, ({ many }) => ({
  owners: many(dogOwners),
  walkers: many(dogWalkers),
  walks: many(walks),
}))

// dogOwners (skip ownerUser — references users.id)
export const dogOwnersRelations = relations(dogOwners, ({ one }) => ({
  dog: one(dogs, {
    fields: [dogOwners.dogId],
    references: [dogs.id],
  }),
}))

// dogWalkers
export const dogWalkersRelations = relations(dogWalkers, ({ one, many }) => ({
  dog: one(dogs, {
    fields: [dogWalkers.dogId],
    references: [dogs.id],
  }),
  walkerProfile: one(walkerProfiles, {
    fields: [dogWalkers.walkerProfileId],
    references: [walkerProfiles.id],
  }),
  walks: many(walks),
}))

// walkBatches (skip startedByUser/endedByUser — references users.id)
export const walkBatchesRelations = relations(walkBatches, ({ one, many }) => ({
  walkerProfile: one(walkerProfiles, {
    fields: [walkBatches.walkerProfileId],
    references: [walkerProfiles.id],
  }),
  walks: many(walks),
}))

// walks (skip createdByUser/updatedByUser — references users.id)
export const walksRelations = relations(walks, ({ one, many }) => ({
  dog: one(dogs, {
    fields: [walks.dogId],
    references: [dogs.id],
  }),
  walkerProfile: one(walkerProfiles, {
    fields: [walks.walkerProfileId],
    references: [walkerProfiles.id],
  }),
  dogWalker: one(dogWalkers, {
    fields: [walks.dogWalkerId],
    references: [dogWalkers.id],
  }),
  walkBatch: one(walkBatches, {
    fields: [walks.walkBatchId],
    references: [walkBatches.id],
  }),
  paymentPeriod: one(paymentPeriods, {
    fields: [walks.paymentPeriodId],
    references: [paymentPeriods.id],
  }),
  media: many(walkMedia),
  paymentEntries: many(paymentEntries),
}))

// walkMedia (skip uploadedByUser — references users.id)
export const walkMediaRelations = relations(walkMedia, ({ one }) => ({
  walk: one(walks, {
    fields: [walkMedia.walkId],
    references: [walks.id],
  }),
}))

// paymentPeriods (skip ownerUser/paidByUser/reopenedByUser — references users.id)
export const paymentPeriodsRelations = relations(paymentPeriods, ({ one, many }) => ({
  walkerProfile: one(walkerProfiles, {
    fields: [paymentPeriods.walkerProfileId],
    references: [walkerProfiles.id],
  }),
  entries: many(paymentEntries),
  walks: many(walks),
}))

// paymentEntries (skip ownerUser — column doesn't exist yet)
export const paymentEntriesRelations = relations(paymentEntries, ({ one }) => ({
  paymentPeriod: one(paymentPeriods, {
    fields: [paymentEntries.paymentPeriodId],
    references: [paymentPeriods.id],
  }),
  walk: one(walks, {
    fields: [paymentEntries.walkId],
    references: [walks.id],
  }),
}))

// notificationDeliveries
export const notificationDeliveriesRelations = relations(notificationDeliveries, ({ one }) => ({
  userDevice: one(userDevices, {
    fields: [notificationDeliveries.userDeviceId],
    references: [userDevices.id],
  }),
}))
