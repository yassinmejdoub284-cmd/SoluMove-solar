import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
const date = (name: string) => integer(name, { mode: 'timestamp_ms' }).notNull();
export const user = sqliteTable('auth_user', {
  id: text('id').primaryKey(), name: text('name').notNull(), email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false), image: text('image'),
  createdAt: date('created_at'), updatedAt: date('updated_at'),
});
export const session = sqliteTable('auth_session', {
  id: text('id').primaryKey(), expiresAt: date('expires_at'), token: text('token').notNull().unique(),
  createdAt: date('created_at'), updatedAt: date('updated_at'), ipAddress: text('ip_address'), userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
}, t => [index('auth_session_user').on(t.userId)]);
export const account = sqliteTable('auth_account', {
  id: text('id').primaryKey(), accountId: text('account_id').notNull(), providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'), refreshToken: text('refresh_token'), idToken: text('id_token'),
  accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp_ms' }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp_ms' }), scope: text('scope'), password: text('password'),
  createdAt: date('created_at'), updatedAt: date('updated_at'),
}, t => [index('auth_account_user').on(t.userId)]);
export const verification = sqliteTable('auth_verification', {
  id: text('id').primaryKey(), identifier: text('identifier').notNull(), value: text('value').notNull(),
  expiresAt: date('expires_at'), createdAt: date('created_at'), updatedAt: date('updated_at'),
}, t => [index('auth_verification_identifier').on(t.identifier)]);
export const rateLimit = sqliteTable('auth_rate_limit', {
  id: text('id').primaryKey(), key: text('key').notNull().unique(), count: integer('count').notNull(), lastRequest: integer('last_request').notNull(),
});
