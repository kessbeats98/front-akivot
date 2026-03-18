import { pgTable, uuid, varchar, text, boolean, timestamp, numeric } from 'drizzle-orm/pg-core'

// ============================================
// DOGS TABLE
// Core dog entity
// ============================================
export const dogs = pgTable('dogs', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  breed: varchar('breed', { length: 255 }),
  birthDate: timestamp('birth_date', { withTimezone: true }),
  imageUrl: text('image_url'),
  notes: text('notes'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ============================================
// DOG OWNERS TABLE
// Junction table: dog <-> owner user
// A dog can have multiple owners (family members)
// ============================================
export const dogOwners = pgTable('dog_owners', {
  id: uuid('id').primaryKey().defaultRandom(),
  dogId: uuid('dog_id').notNull(),
  ownerUserId: uuid('owner_user_id').notNull(),
  isPrimary: boolean('is_primary').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ============================================
// DOG WALKERS TABLE
// Junction table: dog <-> walker profile
// Stores the current price per walk for this dog-walker pair
// ============================================
export const dogWalkers = pgTable('dog_walkers', {
  id: uuid('id').primaryKey().defaultRandom(),
  dogId: uuid('dog_id').notNull(),
  walkerProfileId: uuid('walker_profile_id').notNull(),
  currentPrice: numeric('current_price', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('ILS'),
  isActive: boolean('is_active').notNull().default(true),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
