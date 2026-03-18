import { pgTable, uuid, varchar, text, boolean, timestamp, integer } from 'drizzle-orm/pg-core'
import { platformEnum, inviteStatusEnum } from './enums'

// ============================================
// USERS TABLE
// Core user entity - can be walker, owner, or both
// ============================================
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  imageUrl: text('image_url'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ============================================
// WALKER PROFILES TABLE
// Extended profile for users who are walkers
// ============================================
export const walkerProfiles = pgTable('walker_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  publicSlug: varchar('public_slug', { length: 255 }).unique(),
  inviteCode: varchar('invite_code', { length: 64 }).notNull().unique(),
  isAcceptingClients: boolean('is_accepting_clients').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ============================================
// USER DEVICES TABLE
// Device registration for push notifications (FCM)
// ============================================
export const userDevices = pgTable('user_devices', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  platform: platformEnum('platform').notNull(),
  deviceLabel: varchar('device_label', { length: 255 }),
  fcmToken: text('fcm_token').notNull().unique(),
  appInstalled: boolean('app_installed').notNull().default(false),
  notificationsEnabled: boolean('notifications_enabled').notNull().default(false),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
  invalidatedAt: timestamp('invalidated_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ============================================
// INVITES TABLE
// Invitation codes for onboarding new clients
// ============================================
export const invites = pgTable('invites', {
  id: uuid('id').primaryKey().defaultRandom(),
  walkerProfileId: uuid('walker_profile_id').notNull(),
  inviteCode: varchar('invite_code', { length: 64 }).notNull().unique(),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  maxUses: integer('max_uses').notNull().default(1),
  usedCount: integer('used_count').notNull().default(0),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  status: inviteStatusEnum('status').notNull().default('ACTIVE'),
  createdByUserId: uuid('created_by_user_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
