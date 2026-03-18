// ============================================
// BETTER AUTH API ROUTE HANDLER
// ============================================
// Handles all authentication requests at /api/auth/*
// ============================================

import { auth } from '@/lib/auth/better-auth'
import { toNextJsHandler } from 'better-auth/next-js'

export const { GET, POST } = toNextJsHandler(auth)
