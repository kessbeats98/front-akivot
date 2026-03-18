import { pgTable, uuid, text, boolean, timestamp, integer } from 'drizzle-orm/pg-core'
import { platformEnum, inviteStatusEnum } from './enums'

// ============================================
// USERS TABLE
// Core user entity - can be walker, owner, or both
// ============================================
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').unique().notNull(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  phone: text('phone'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
})

// ============================================
// WALKER PROFILES TABLE
// Extended profile for users who are walkers
// ============================================
export const walkerProfiles = pgTable('walker_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').references(() => users.id).unique().notNull(),
  displayName: text('display_name').notNull(),
  publicSlug: text('public_slug').unique(),
  inviteCode: text('invite_code').unique().notNull(),
  isAcceptingClients: boolean('is_accepting_clients').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
})

// ============================================
// USER DEVICES TABLE
// Device registration for push notifications (FCM)
// ============================================
export const userDevices = pgTable('user_devices', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').references(() => users.id).notNull(),
  platform: platformEnum('platform').notNull(),
  deviceLabel: text('device_label'),
  fcmToken: text('fcm_token').unique().notNull(),
  appInstalled: boolean('app_installed').notNull().default(false),
  notificationsEnabled: boolean('notifications_enabled').notNull().default(false),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
  invalidatedAt: timestamp('invalidated_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
})

// ============================================
// INVITES TABLE
// Invitation codes for onboarding new clients
// ============================================
export const invites = pgTable('invites', {
  id: uuid('id').primaryKey().defaultRandom(),
  walkerProfileId: uuid('walker_profile_id').references(() => walkerProfiles.id).notNull(),
  inviteCode: text('invite_code').unique().notNull(),
  phone: text('phone'),
  email: text('email'),
  maxUses: integer('max_uses').notNull().default(1),
  usedCount: integer('used_count').notNull().default(0),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  status: inviteStatusEnum('status').notNull().default('ACTIVE'),
  createdByUserId: text('created_by_user_id').references(() => users.id).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
