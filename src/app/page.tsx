'use client'

import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

// ============================================
// TYPES
// ============================================
interface User {
  id: string
  email: string
  name: string
  role: 'walker' | 'owner'
}

interface Dog {
  id: string
  name: string
  breed: string
  age: number
  image: string
  ownerId: string
  owner?: { id: string; name: string }
  medicalNotes?: string
  behaviorNotes?: string
  isActive: boolean
}

interface Walk {
  id: string
  dogId: string
  dog?: Dog
  walkerId?: string
  walker?: { id: string; name: string }
  status: 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'CANCELLED'
  scheduledAt?: string
  startedAt?: string
  endedAt?: string
  durationMinutes?: number
  notes?: string
  photos?: WalkPhoto[]
  route?: GPSPoint[]
}

interface WalkPhoto {
  id: string
  walkId: string
  url: string
  timestamp: string
  caption?: string
}

interface GPSPoint {
  lat: number
  lng: number
  timestamp: string
}

interface Message {
  id: string
  senderId: string
  senderName: string
  senderRole: 'walker' | 'owner'
  recipientId: string
  content: string
  timestamp: string
  read: boolean
}

interface Notification {
  id: string
  type: 'walk_started' | 'walk_ended' | 'photo_added' | 'message' | 'payment_due'
  title: string
  body: string
  timestamp: string
  read: boolean
  data?: Record<string, string>
}

interface PaymentPeriod {
  id: string
  ownerId: string
  walkerId: string
  owner?: { id: string; name: string }
  walker?: { id: string; name: string }
  status: 'OPEN' | 'CLOSED'
  totalAmountIls: number
  paymentEntries?: { walkId: string; amountIls: number; walk?: Walk }[]
}

// ============================================
// API FUNCTIONS
// ============================================
const api = {
  async getSession(): Promise<{ user: User | null }> {
    const res = await fetch('/api/session')
    return res.json()
  },
  
  async login(email: string, password: string): Promise<User> {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name: email.split('@')[0], role: 'walker' })
    })
    if (!res.ok) throw new Error('Login failed')
    return res.json()
  },
  
  async getDogs(): Promise<Dog[]> {
    const res = await fetch('/api/dogs')
    if (!res.ok) return []
    return res.json()
  },
  
  async getWalks(params?: { status?: string; month?: string; year?: string }): Promise<Walk[]> {
    const url = new URL('/api/walks', window.location.origin)
    if (params?.status) url.searchParams.set('status', params.status)
    if (params?.month) url.searchParams.set('month', params.month)
    if (params?.year) url.searchParams.set('year', params.year)
    const res = await fetch(url.toString())
    if (!res.ok) return []
    return res.json()
  },
  
  async createWalk(dogId: string): Promise<Walk> {
    const res = await fetch('/api/walks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dogId })
    })
    if (!res.ok) throw new Error('Failed to create walk')
    return res.json()
  },
  
  async startWalk(walkId: string): Promise<Walk> {
    const res = await fetch(`/api/walks/${walkId}/start`, { method: 'POST' })
    if (!res.ok) throw new Error('Failed to start walk')
    return res.json()
  },
  
  async endWalk(walkId: string, notes?: string): Promise<Walk> {
    const res = await fetch(`/api/walks/${walkId}/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes })
    })
    if (!res.ok) throw new Error('Failed to end walk')
    return res.json()
  },
  
  async getPayments(): Promise<PaymentPeriod[]> {
    const res = await fetch('/api/payments')
    if (!res.ok) return []
    return res.json()
  },
  
  async closePaymentPeriod(periodId: string): Promise<PaymentPeriod> {
    const res = await fetch(`/api/payments/${periodId}/close`, { method: 'POST' })
    if (!res.ok) throw new Error('Failed to close payment period')
    return res.json()
  }
}

// ============================================
// ICONS
// ============================================
const Icons = {
  Paw: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={cn("w-6 h-6", className)}>
      <path d="M12 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6-4c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM6 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm3.5 4c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm5 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-2.5 6c-2.8 0-5 2.2-5 5h10c0-2.8-2.2-5-5-5z"/>
    </svg>
  ),
  Walk: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={cn("w-6 h-6", className)}>
      <path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm4 5.5c0-.6-.4-1-1-1h-3.2l-1.9-3.2c-.3-.5-.9-.8-1.5-.8H7c-.6 0-1 .4-1 1s.4 1 1 1h2.5l1.3 2.2-2.3 2.3c-.4.4-.4 1 0 1.4.2.2.5.3.7.3s.5-.1.7-.3l1.8-1.8 2.3 3.5v4c0 .6.4 1 1 1s1-.4 1-1v-4c0-.2-.1-.4-.2-.6l-1.8-2.7h2c.6 0 1-.4 1-1z"/>
    </svg>
  ),
  Calendar: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cn("w-6 h-6", className)}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  Wallet: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cn("w-6 h-6", className)}>
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
      <path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z"/>
    </svg>
  ),
  Home: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={cn("w-6 h-6", className)}>
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
    </svg>
  ),
  Settings: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cn("w-6 h-6", className)}>
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  Camera: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cn("w-6 h-6", className)}>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  ),
  Note: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cn("w-6 h-6", className)}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14,2 14,8 20,8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  Stop: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={cn("w-6 h-6", className)}>
      <rect x="6" y="6" width="12" height="12" rx="2"/>
    </svg>
  ),
  Play: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={cn("w-6 h-6", className)}>
      <polygon points="5,3 19,12 5,21"/>
    </svg>
  ),
  Close: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cn("w-6 h-6", className)}>
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  Add: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cn("w-6 h-6", className)}>
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  Call: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cn("w-5 h-5", className)}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  ),
  User: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cn("w-5 h-5", className)}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  Check: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={cn("w-5 h-5", className)}>
      <polyline points="20,6 9,17 4,12"/>
    </svg>
  ),
  Clock: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cn("w-5 h-5", className)}>
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12,6 12,12 16,14"/>
    </svg>
  ),
  ArrowLeft: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cn("w-6 h-6", className)}>
      <line x1="19" y1="12" x2="5" y2="12"/>
      <polyline points="12,19 5,12 12,5"/>
    </svg>
  ),
  Search: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cn("w-5 h-5", className)}>
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  Logout: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cn("w-5 h-5", className)}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16,17 21,12 16,7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  Image: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cn("w-5 h-5", className)}>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21,15 16,10 5,21"/>
    </svg>
  ),
  AlertTriangle: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cn("w-5 h-5", className)}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  Heart: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={cn("w-5 h-5", className)}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  ),
  Edit: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cn("w-5 h-5", className)}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  ),
  ChevronDown: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cn("w-5 h-5", className)}>
      <polyline points="6,9 12,15 18,9"/>
    </svg>
  ),
  List: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cn("w-5 h-5", className)}>
      <line x1="8" y1="6" x2="21" y2="6"/>
      <line x1="8" y1="12" x2="21" y2="12"/>
      <line x1="8" y1="18" x2="21" y2="18"/>
      <line x1="3" y1="6" x2="3.01" y2="6"/>
      <line x1="3" y1="12" x2="3.01" y2="12"/>
      <line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  ),
  Grid: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cn("w-5 h-5", className)}>
      <rect x="3" y="3" width="7" height="7"/>
      <rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/>
    </svg>
  ),
  Send: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cn("w-5 h-5", className)}>
      <line x1="22" y1="2" x2="11" y2="13"/>
      <polygon points="22,2 15,22 11,13 2,9"/>
    </svg>
  ),
  Bell: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cn("w-5 h-5", className)}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  MapPin: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cn("w-5 h-5", className)}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  MessageCircle: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cn("w-5 h-5", className)}>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
    </svg>
  ),
  Photo: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cn("w-5 h-5", className)}>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21,15 16,10 5,21"/>
    </svg>
  ),
  Route: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cn("w-5 h-5", className)}>
      <circle cx="6" cy="19" r="3"/>
      <path d="M9 19h3a4 4 0 0 0 0-8H9"/>
      <circle cx="18" cy="5" r="3"/>
      <path d="M15 5h-3a4 4 0 0 0 0 8h3"/>
    </svg>
  )
}

// ============================================
// MODAL COMPONENT
// ============================================
interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

const Modal = ({ isOpen, onClose, title, children }: ModalProps) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[85vh] overflow-y-auto"
        >
          <div className="sticky top-0 bg-white z-10 px-6 pt-6 pb-4 flex items-center justify-between border-b border-stone-100">
            {title && <h2 className="text-xl font-bold text-stone-900">{title}</h2>}
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:bg-stone-200 transition-colors mr-auto"
            >
              <Icons.Close />
            </button>
          </div>
          <div className="p-6">{children}</div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
)

// ============================================
// DEMO DATA
// ============================================
const demoDogs: Dog[] = [
  {
    id: '1',
    name: 'בונו',
    breed: 'גולדן רטריבר',
    age: 3,
    image: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=300&q=80',
    ownerId: 'owner1',
    owner: { id: 'owner1', name: 'משפחת כהן' },
    medicalNotes: 'אלרגי לעוף ולחיטה',
    behaviorNotes: 'מושך חזק ליד פחים',
    isActive: true
  },
  {
    id: '2',
    name: 'לוסי',
    breed: 'לברדור',
    age: 5,
    image: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=300&q=80',
    ownerId: 'owner2',
    owner: { id: 'owner2', name: 'יעל לוי' },
    isActive: true
  },
  {
    id: '3',
    name: 'רקס',
    breed: 'רועה גרמני',
    age: 4,
    image: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=300&q=80',
    ownerId: 'owner3',
    owner: { id: 'owner3', name: 'משפחת אהרוני' },
    isActive: true
  }
]

const demoWalks: Walk[] = [
  {
    id: '1',
    dogId: '3',
    dog: demoDogs[2],
    walkerId: 'walker1',
    status: 'COMPLETED',
    startedAt: new Date(Date.now() - 7200000).toISOString(),
    endedAt: new Date(Date.now() - 5400000).toISOString(),
    durationMinutes: 45,
    notes: 'רקס היה מאוד אנרגטי היום! שיחק הרבה בפארק 🐕',
    photos: [
      {
        id: 'p1',
        walkId: '1',
        url: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&w=400&q=80',
        timestamp: new Date(Date.now() - 7000000).toISOString(),
        caption: 'משחק בפארק 🎾'
      },
      {
        id: 'p2',
        walkId: '1',
        url: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=400&q=80',
        timestamp: new Date(Date.now() - 6500000).toISOString(),
        caption: 'זמן מנוחה ☀️'
      }
    ],
    route: [
      { lat: 32.0853, lng: 34.7818, timestamp: new Date(Date.now() - 7200000).toISOString() },
      { lat: 32.0860, lng: 34.7825, timestamp: new Date(Date.now() - 7100000).toISOString() },
      { lat: 32.0870, lng: 34.7830, timestamp: new Date(Date.now() - 7000000).toISOString() },
      { lat: 32.0865, lng: 34.7840, timestamp: new Date(Date.now() - 6800000).toISOString() },
      { lat: 32.0855, lng: 34.7820, timestamp: new Date(Date.now() - 5500000).toISOString() }
    ]
  },
  {
    id: '2',
    dogId: '1',
    dog: demoDogs[0],
    walkerId: 'walker1',
    status: 'COMPLETED',
    startedAt: new Date(Date.now() - 86400000).toISOString(),
    endedAt: new Date(Date.now() - 82800000).toISOString(),
    durationMinutes: 30,
    photos: [
      {
        id: 'p3',
        walkId: '2',
        url: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=400&q=80',
        timestamp: new Date(Date.now() - 84000000).toISOString()
      }
    ]
  }
]

const demoMessages: Message[] = [
  {
    id: 'm1',
    senderId: 'walker1',
    senderName: 'דני הדוגווקר',
    senderRole: 'walker',
    recipientId: 'owner1',
    content: 'היי! בונו היה נהדר היום בטיול 🐕',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    read: true
  },
  {
    id: 'm2',
    senderId: 'owner1',
    senderName: 'משפחת כהן',
    senderRole: 'owner',
    recipientId: 'walker1',
    content: 'תודה רבה! שמחתי לשמוע. תוכל להביא אותו מוקדם מחר?',
    timestamp: new Date(Date.now() - 3000000).toISOString(),
    read: true
  },
  {
    id: 'm3',
    senderId: 'walker1',
    senderName: 'דני הדוגווקר',
    senderRole: 'walker',
    recipientId: 'owner1',
    content: 'בטח! אגיע ב-13:00 במקום 14:00 👍',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    read: false
  }
]

const demoNotifications: Notification[] = [
  {
    id: 'n1',
    type: 'walk_ended',
    title: 'טיול הסתיים',
    body: 'הטיול של רקס הסתיים בהצלחה - 45 דקות',
    timestamp: new Date(Date.now() - 5400000).toISOString(),
    read: false,
    data: { walkId: '1' }
  },
  {
    id: 'n2',
    type: 'photo_added',
    title: 'תמונה חדשה',
    body: 'נוספו 2 תמונות חדשות מהטיול של רקס',
    timestamp: new Date(Date.now() - 5300000).toISOString(),
    read: false,
    data: { walkId: '1' }
  },
  {
    id: 'n3',
    type: 'message',
    title: 'הודעה חדשה מדני',
    body: 'בטח! אגיע ב-13:00 במקום 14:00 👍',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    read: false
  }
]

const demoPayments: PaymentPeriod[] = [
  {
    id: '1',
    ownerId: 'owner1',
    walkerId: 'walker1',
    owner: { id: 'owner1', name: 'משפחת כהן' },
    walker: { id: 'walker1', name: 'דני' },
    status: 'OPEN',
    totalAmountIls: 400,
    paymentEntries: [
      { walkId: 'w1', amountIls: 50 },
      { walkId: 'w2', amountIls: 50 }
    ]
  }
]

// ============================================
// APP STATE
// ============================================
type Page = 'login' | 'walker-dash' | 'walker-calendar' | 'walker-dogs' | 'walker-live' | 'walker-finance' | 'owner-dash' | 'owner-calendar' | 'owner-payment' | 'dog-profile' | 'settings' | 'chat' | 'notifications' | 'walk-details' | 'photo-gallery'

interface AppState {
  currentPage: Page
  userType: 'walker' | 'owner' | null
  dogs: Dog[]
  walks: Walk[]
  payments: PaymentPeriod[]
  activeWalk: Walk | null
  selectedDog: Dog | null
  messages: Message[]
  notifications: Notification[]
  selectedWalk: Walk | null
}

const useAppStore = create<AppState & {
  setCurrentPage: (page: Page) => void
  setUserType: (type: 'walker' | 'owner') => void
  setActiveWalk: (walk: Walk | null) => void
  setSelectedDog: (dog: Dog | null) => void
  addMessage: (message: Message) => void
  markMessagesRead: () => void
  addNotification: (notification: Notification) => void
  markNotificationsRead: () => void
  addPhotoToActiveWalk: (photo: WalkPhoto) => void
  setSelectedWalk: (walk: Walk | null) => void
}>((set) => ({
  currentPage: 'login',
  userType: null,
  dogs: demoDogs,
  walks: demoWalks,
  payments: demoPayments,
  activeWalk: null,
  selectedDog: null,
  messages: demoMessages,
  notifications: demoNotifications,
  selectedWalk: null,
  setCurrentPage: (page) => set({ currentPage: page }),
  setUserType: (type) => set({ userType: type }),
  setActiveWalk: (walk) => set({ activeWalk: walk }),
  setSelectedDog: (dog) => set({ selectedDog: dog }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  markMessagesRead: () => set((state) => ({ 
    messages: state.messages.map(m => ({ ...m, read: true })) 
  })),
  addNotification: (notification) => set((state) => ({ 
    notifications: [notification, ...state.notifications] 
  })),
  markNotificationsRead: () => set((state) => ({ 
    notifications: state.notifications.map(n => ({ ...n, read: true })) 
  })),
  addPhotoToActiveWalk: (photo) => set((state) => {
    if (!state.activeWalk) return state
    return {
      activeWalk: {
        ...state.activeWalk,
        photos: [...(state.activeWalk.photos || []), photo]
      }
    }
  }),
  setSelectedWalk: (walk) => set({ selectedWalk: walk })
}))

// Need to import create from zustand
import { create } from 'zustand'

// ============================================
// LOGIN PAGE
// ============================================
const LoginPage = () => {
  const { setCurrentPage, setUserType } = useAppStore()
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-forest-600 via-forest-500 to-forest-400 flex flex-col relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
          className="absolute -top-40 -right-40 w-96 h-96 bg-white/5 rounded-full"
        />
        <motion.div
          animate={{ y: [0, -20, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/3 -left-20 w-64 h-64 bg-sunset-400/10 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-1/4 right-10 w-48 h-48 bg-forest-300/20 rounded-full blur-2xl"
        />
      </div>
      
      {/* Paw prints decoration */}
      <div className="absolute inset-0 opacity-10">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.2, duration: 0.5 }}
            className="absolute"
            style={{
              left: `${10 + (i * 12)}%`,
              top: `${15 + (i % 3) * 30}%`,
              transform: `rotate(${i * 15 - 30}deg)`
            }}
          >
            <Icons.Paw className="w-8 h-8 text-white" />
          </motion.div>
        ))}
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center relative z-10 pt-12 pb-8">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 15, stiffness: 200 }}
          className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center shadow-2xl mb-8 rotate-3"
        >
          <Icons.Paw className="w-12 h-12 text-forest-600" />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="inline-block bg-white/10 backdrop-blur-md border border-white/20 text-white text-sm font-semibold px-5 py-2.5 rounded-full mb-6"
        >
          ✨ הזמנה אישית מדני הדוגווקר
        </motion.div>
        
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-5xl font-black text-white tracking-tight mb-4"
        >
          עקבות
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-white/80 text-lg font-medium max-w-xs leading-relaxed"
        >
          האפליקציה שתלווה את הכלב שלך בכל טיול. תמונות, מסלולים, ועדכונים חיים.
        </motion.p>
      </div>
      
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ delay: 0.6, type: 'spring', damping: 25, stiffness: 200 }}
        className="bg-stone-50 w-full rounded-t-[3rem] px-8 pt-10 pb-12 relative z-20 shadow-2xl"
      >
        <div className="w-12 h-1.5 bg-stone-200 rounded-full mx-auto mb-8" />
        <h2 className="text-xl font-bold text-stone-900 text-center mb-8">איך תרצו להיכנס?</h2>
        
        <div className="flex flex-col gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { setUserType('owner'); setCurrentPage('owner-dash') }}
            className="w-full bg-white border-2 border-stone-200 hover:border-forest-300 text-stone-900 rounded-2xl py-4 px-6 flex items-center justify-center gap-3 transition-all shadow-sm hover:shadow-md"
          >
            <div className="w-8 h-8 bg-forest-100 rounded-lg flex items-center justify-center">
              <Icons.User className="w-5 h-5 text-forest-600" />
            </div>
            <span className="font-bold">כניסה כבעלי כלב</span>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { setUserType('walker'); setCurrentPage('walker-dash') }}
            className="w-full bg-gradient-to-br from-forest-600 to-forest-500 text-white rounded-2xl py-4 px-6 font-bold shadow-lg shadow-forest-500/30 flex justify-center items-center gap-2"
          >
            <Icons.Walk className="w-5 h-5" />
            <span>כניסה כדוגווקר</span>
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}

// ============================================
// WALKER DASHBOARD
// ============================================
// Hierarchy: LIVE state → Daily Summary → Timeline (center) → Dogs quick info → Open Balances → Secondary Actions
const WalkerDashboard = () => {
  const { dogs, walks, setCurrentPage, setActiveWalk, notifications, messages, userType, activeWalk, payments } = useAppStore()
  const [showStartModal, setShowStartModal] = useState(false)
  const [selectedDogs, setSelectedDogs] = useState<string[]>([])
  const [elapsed, setElapsed] = useState(0)
  
  const todaysDogs = dogs.slice(0, 3)
  const completedToday = walks.filter(w => w.status === 'COMPLETED')
  
  // Calculate today's stats
  const totalMinutesToday = completedToday.reduce((sum, w) => sum + (w.durationMinutes || 0), 0)
  const earningsToday = completedToday.length * 50 // Assume 50₪ per walk
  
  // Open balances (payment periods that are OPEN)
  const openBalances = payments.filter(p => p.status === 'OPEN')
  const totalOpenBalance = openBalances.reduce((sum, p) => sum + p.totalAmountIls, 0)
  
  // Timer effect for LIVE walk
  useEffect(() => {
    if (activeWalk?.startedAt) {
      const startTime = new Date(activeWalk.startedAt).getTime()
      const interval = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [activeWalk])
  
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  
  const toggleDogSelection = (dogId: string) => {
    setSelectedDogs(prev => 
      prev.includes(dogId) ? prev.filter(id => id !== dogId) : [...prev, dogId]
    )
  }
  
  const handleStartWalk = () => {
    if (selectedDogs.length > 0) {
      const newWalk: Walk = {
        id: Date.now().toString(),
        dogId: selectedDogs[0],
        dog: dogs.find(d => d.id === selectedDogs[0]),
        status: 'LIVE',
        startedAt: new Date().toISOString(),
        walkerId: 'walker1'
      }
      setActiveWalk(newWalk)
      setCurrentPage('walker-live')
      setShowStartModal(false)
      setSelectedDogs([])
    }
  }
  
  return (
    <div className="min-h-screen bg-stone-50 pb-32">
      {/* ============================================ */}
      {/* 1. WALKER DASHBOARD HEADER (with badges) */}
      {/* ============================================ */}
      <header className="px-6 pt-6 pb-4 flex justify-between items-start">
        <div>
          <p className="text-forest-600 font-semibold text-sm mb-1">בוקר טוב, דני 👋</p>
          <h1 className="text-3xl font-black text-stone-900 tracking-tight">המסלול שלך</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Notifications badge */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setCurrentPage('notifications')}
            className="w-11 h-11 bg-white rounded-2xl shadow-sm border border-stone-200 flex items-center justify-center text-stone-700 relative"
          >
            <Icons.Bell className="w-5 h-5" />
            {notifications.filter(n => !n.read).length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {notifications.filter(n => !n.read).length}
              </span>
            )}
          </motion.button>
          
          {/* Chat badge (secondary - just badge, not prominent) */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setCurrentPage('chat')}
            className="w-11 h-11 bg-white rounded-2xl shadow-sm border border-stone-200 flex items-center justify-center text-stone-700 relative"
          >
            <Icons.MessageCircle className="w-5 h-5" />
            {messages.filter(m => !m.read && m.senderRole !== userType).length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-forest-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {messages.filter(m => !m.read && m.senderRole !== userType).length}
              </span>
            )}
          </motion.button>
          
          {/* Profile */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="w-14 h-14 rounded-2xl p-0.5 bg-gradient-to-br from-sunset-400 to-sunset-500 shadow-lg shadow-sunset-400/30 cursor-pointer"
          >
            <img
              src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80"
              alt="Profile"
              className="w-full h-full rounded-[13px] object-cover"
            />
          </motion.div>
        </div>
      </header>
      
      {/* ============================================ */}
      {/* 2. ACTIVE BATCH CARD - MOST PROMINENT (if LIVE) */}
      {/* ============================================ */}
      {activeWalk && (
        <section className="px-6 mb-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative overflow-hidden"
          >
            {/* Large prominent LIVE card */}
            <div className="bg-gradient-to-br from-forest-600 via-forest-500 to-forest-400 rounded-3xl p-5 shadow-xl shadow-forest-500/40 relative">
              {/* Animated background elements */}
              <div className="absolute inset-0 overflow-hidden">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="absolute -right-12 -top-12 w-48 h-48 bg-white/10 rounded-full blur-3xl"
                />
                <motion.div
                  animate={{ scale: [1.2, 1, 1.2] }}
                  transition={{ duration: 3, repeat: Infinity, delay: 1 }}
                  className="absolute -left-8 -bottom-8 w-32 h-32 bg-forest-300/20 rounded-full blur-2xl"
                />
              </div>
              
              <div className="relative z-10">
                {/* LIVE indicator */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full">
                    <span className="w-2.5 h-2.5 bg-red-400 rounded-full animate-pulse" />
                    <span className="text-white text-sm font-bold">טיול פעיל</span>
                  </div>
                  
                  {/* Timer - MOST PROMINENT */}
                  <div className="text-left">
                    <motion.p
                      animate={{ scale: [1, 1.02, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="text-4xl font-black text-white timer-display"
                    >
                      {formatTimer(elapsed)}
                    </motion.p>
                  </div>
                </div>
                
                {/* Dog info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {activeWalk.dog && (
                      <img
                        src={activeWalk.dog.image}
                        className="w-14 h-14 rounded-2xl border-2 border-white/30 object-cover shadow-lg"
                        alt={activeWalk.dog.name}
                      />
                    )}
                    <div>
                      <h3 className="text-xl font-black text-white">{activeWalk.dog?.name}</h3>
                      <p className="text-white/70 text-sm">עכשיו בטיול</p>
                    </div>
                  </div>
                  
                  {/* Quick actions */}
                  <div className="flex gap-2">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setCurrentPage('walker-live')}
                      className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-white"
                    >
                      <Icons.Walk className="w-6 h-6" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setCurrentPage('walker-live')}
                      className="w-12 h-12 bg-sunset-400 rounded-xl flex items-center justify-center text-white shadow-lg"
                    >
                      <Icons.Stop className="w-6 h-6" />
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>
      )}
      
      {/* ============================================ */}
      {/* 3. DAILY SUMMARY STRIP - Compact */}
      {/* ============================================ */}
      <section className="px-6 mb-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-3.5 shadow-sm border border-stone-100 flex items-center justify-around"
        >
          <div className="text-center px-3">
            <p className="text-2xl font-black text-forest-600">{completedToday.length}</p>
            <p className="text-xs text-stone-500">טיולים</p>
          </div>
          <div className="w-px h-8 bg-stone-200" />
          <div className="text-center px-3">
            <p className="text-2xl font-black text-forest-600">{totalMinutesToday}</p>
            <p className="text-xs text-stone-500">דקות</p>
          </div>
          <div className="w-px h-8 bg-stone-200" />
          <div className="text-center px-3">
            <p className="text-2xl font-black text-sunset-500">₪{earningsToday}</p>
            <p className="text-xs text-stone-500">היום</p>
          </div>
        </motion.div>
      </section>
      
      {/* ============================================ */}
      {/* 4. TODAY'S TIMELINE - MAIN CENTER OF GRAVITY */}
      {/* ============================================ */}
      <section className="px-6 mb-5">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-bold text-stone-900">לו״ז היום</h3>
          <button
            onClick={() => setCurrentPage('walker-calendar')}
            className="text-sm font-bold text-forest-600 hover:text-forest-700 flex items-center gap-1"
          >
            יומן מלא
            <Icons.ArrowLeft className="w-4 h-4" />
          </button>
        </div>
        
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 divide-y divide-stone-100 overflow-hidden">
          {/* Completed walks */}
          {completedToday.map((walk, index) => (
            <motion.div
              key={walk.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-4 flex items-center gap-4"
            >
              <div className="w-11 h-11 rounded-xl bg-forest-100 text-forest-600 flex items-center justify-center shrink-0">
                <Icons.Check className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-stone-900">{walk.dog?.name}</h4>
                <p className="text-sm text-stone-500">{walk.durationMinutes || 30} דק׳ • הושלם</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-forest-600">✓</span>
              </div>
            </motion.div>
          ))}
          
          {/* Active walk in timeline (if exists) */}
          {activeWalk && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={() => setCurrentPage('walker-live')}
              className="p-4 flex items-center gap-4 bg-forest-50 cursor-pointer"
            >
              <div className="w-11 h-11 rounded-xl bg-forest-500 text-white flex items-center justify-center shrink-0">
                <Icons.Walk className="w-5 h-5 animate-pulse" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-forest-700">{activeWalk.dog?.name}</h4>
                <p className="text-sm text-forest-600">עכשיו בטיול • {formatTimer(elapsed)}</p>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 bg-forest-100 rounded-lg">
                <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                <span className="text-xs font-bold text-forest-600">LIVE</span>
              </div>
            </motion.div>
          )}
          
          {/* Upcoming walks - START naturally from here */}
          {todaysDogs.filter(d => !completedToday.find(w => w.dogId === d.id) && d.id !== activeWalk?.dogId).map((dog, index) => {
            const hasAlert = dog.medicalNotes || dog.behaviorNotes
            
            return (
              <motion.div
                key={dog.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: (completedToday.length + index) * 0.05 }}
                onClick={() => {
                  setSelectedDogs([dog.id])
                  setShowStartModal(true)
                }}
                className="p-4 flex items-center gap-4 cursor-pointer hover:bg-stone-50 transition-colors"
              >
                <div className="w-11 h-11 rounded-xl bg-stone-100 text-stone-500 flex items-center justify-center shrink-0 relative">
                  <Icons.Clock className="w-5 h-5" />
                  {hasAlert && (
                    <span className="absolute -top-1 -left-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center">
                      <Icons.AlertTriangle className="w-2.5 h-2.5 text-white" />
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-stone-900">{dog.name}</h4>
                  <p className="text-sm text-stone-500">14:00 • מתוכנן</p>
                </div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 px-3 py-2 bg-forest-50 rounded-xl"
                >
                  <Icons.Play className="w-4 h-4 text-forest-600" />
                  <span className="text-sm font-bold text-forest-600">התחל</span>
                </motion.div>
              </motion.div>
            )
          })}
          
          {/* Empty state */}
          {completedToday.length === 0 && !activeWalk && todaysDogs.length === 0 && (
            <div className="p-8 text-center">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowStartModal(true)}
                className="cursor-pointer"
              >
                <div className="w-16 h-16 bg-forest-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Icons.Walk className="w-8 h-8 text-forest-600" />
                </div>
                <p className="text-stone-600 font-medium">אין טיולים מתוכננים</p>
                <p className="text-sm text-forest-600 font-bold mt-1">+ התחל טיול חדש</p>
              </motion.div>
            </div>
          )}
        </div>
      </section>
      
      {/* ============================================ */}
      {/* 5. DOGS QUICK INFO - Lightweight, glanceable */}
      {/* ============================================ */}
      <section className="px-6 mb-5">
        <h3 className="text-base font-bold text-stone-900 mb-2">הלקוחות שלך</h3>
        
        <div className="flex gap-2 overflow-x-auto pb-1 pt-1 scrollbar-hide">
          {todaysDogs.map((dog) => {
            const hasAlert = dog.medicalNotes || dog.behaviorNotes
            const isCompleted = completedToday.find(w => w.dogId === dog.id)
            const isActive = activeWalk?.dogId === dog.id
            
            return (
              <motion.div
                key={dog.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => {
                  if (!isCompleted && !isActive) {
                    setSelectedDogs([dog.id])
                    setShowStartModal(true)
                  }
                }}
                className={cn(
                  "min-w-[100px] rounded-2xl p-3 flex flex-col items-center relative transition-all cursor-pointer",
                  isActive
                    ? "bg-forest-100 border border-forest-200"
                    : isCompleted
                      ? "bg-stone-50 border border-stone-100 opacity-50"
                      : "bg-white border border-stone-100 shadow-sm hover:shadow"
                )}
              >
                {/* Alert badge - compact */}
                {hasAlert && !isCompleted && !isActive && (
                  <div className="absolute top-2 left-2 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center">
                    <Icons.AlertTriangle className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
                
                {/* Status dot */}
                {isActive && (
                  <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-forest-500 rounded-full animate-pulse" />
                )}
                {isCompleted && !isActive && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-forest-500 rounded-full flex items-center justify-center">
                    <Icons.Check className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
                
                <img
                  src={dog.image}
                  className={cn(
                    "w-12 h-12 rounded-xl object-cover",
                    isCompleted && !isActive && "grayscale"
                  )}
                  alt={dog.name}
                />
                <p className="text-xs font-bold text-stone-900 mt-2">{dog.name}</p>
                <p className="text-xs text-stone-500">{isCompleted ? 'הושלם' : isActive ? 'בטיול' : '14:00'}</p>
              </motion.div>
            )
          })}
        </div>
      </section>
      
      {/* ============================================ */}
      {/* 6. OPEN BALANCES SECTION - Workflow critical */}
      {/* ============================================ */}
      {openBalances.length > 0 && (
        <section className="px-6 mb-5">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setCurrentPage('walker-finance')}
            className="bg-gradient-to-r from-sunset-50 to-amber-50 rounded-2xl p-4 border border-sunset-200 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-sunset-400 text-white flex items-center justify-center shrink-0">
                  <Icons.Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-stone-900">יתרות פתוחות</h4>
                  <p className="text-sm text-stone-500">{openBalances.length} בעלים ממתינים לסגירה</p>
                </div>
              </div>
              
              <div className="text-left">
                <p className="text-xl font-black text-sunset-600">₪{totalOpenBalance}</p>
                <p className="text-xs text-stone-500">סה״כ לגבייה</p>
              </div>
            </div>
            
            {/* Quick preview of owners */}
            <div className="mt-3 pt-3 border-t border-sunset-200">
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                {openBalances.slice(0, 3).map(period => (
                  <div key={period.id} className="flex items-center gap-2 bg-white/70 px-2.5 py-1.5 rounded-lg shrink-0">
                    <Icons.User className="w-3.5 h-3.5 text-stone-400" />
                    <span className="text-xs font-medium text-stone-700">{period.owner?.name}</span>
                    <span className="text-xs font-bold text-sunset-600">₪{period.totalAmountIls}</span>
                  </div>
                ))}
                {openBalances.length > 3 && (
                  <span className="text-xs text-stone-500">+{openBalances.length - 3}</span>
                )}
              </div>
            </div>
          </motion.div>
        </section>
      )}
      
      {/* ============================================ */}
      {/* 7. SECONDARY ACTIONS - Last, minimal */}
      {/* ============================================ */}
      <section className="px-6 mb-6">
        <div className="flex gap-3">
          {/* Gallery - secondary */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setCurrentPage('photo-gallery')}
            className="flex-1 bg-white rounded-xl py-3 px-4 shadow-sm border border-stone-100 flex items-center justify-center gap-2"
          >
            <Icons.Photo className="w-4 h-4 text-stone-500" />
            <span className="text-sm font-medium text-stone-600">גלריה</span>
          </motion.button>
          
          {/* Messages - secondary */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setCurrentPage('chat')}
            className="flex-1 bg-white rounded-xl py-3 px-4 shadow-sm border border-stone-100 flex items-center justify-center gap-2 relative"
          >
            <Icons.MessageCircle className="w-4 h-4 text-stone-500" />
            <span className="text-sm font-medium text-stone-600">הודעות</span>
            {messages.filter(m => !m.read && m.senderRole !== userType).length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-forest-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {messages.filter(m => !m.read && m.senderRole !== userType).length}
              </span>
            )}
          </motion.button>
        </div>
      </section>
      
      {/* Bottom Navigation */}
      <nav className="bottom-nav flex justify-around">
        <button className="nav-item-active">
          <Icons.Home className="w-5 h-5" />
          <span className="text-sm">בית</span>
        </button>
        <button onClick={() => setCurrentPage('walker-calendar')} className="nav-item">
          <Icons.Calendar className="w-5 h-5" />
        </button>
        <button onClick={() => setCurrentPage('walker-dogs')} className="nav-item">
          <Icons.Paw className="w-5 h-5" />
        </button>
        <button onClick={() => setCurrentPage('walker-finance')} className="nav-item relative">
          <Icons.Wallet className="w-5 h-5" />
          {openBalances.length > 0 && (
            <span className="absolute top-2 right-2 w-2 h-2 bg-sunset-400 rounded-full" />
          )}
        </button>
      </nav>
      
      {/* Start Walk Modal */}
      <Modal isOpen={showStartModal} onClose={() => setShowStartModal(false)} title="בחר כלבים לטיול">
        <div className="space-y-3">
          {dogs.map(dog => (
            <motion.div
              key={dog.id}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => toggleDogSelection(dog.id)}
              className={cn(
                "p-4 rounded-2xl border-2 cursor-pointer transition-all",
                selectedDogs.includes(dog.id)
                  ? "border-forest-500 bg-forest-50"
                  : "border-stone-200 bg-white hover:border-stone-300"
              )}
            >
              <div className="flex items-center gap-4">
                <img
                  src={dog.image}
                  className="w-14 h-14 rounded-xl object-cover"
                  alt={dog.name}
                />
                <div className="flex-1">
                  <h4 className="font-bold text-stone-900">{dog.name}</h4>
                  <p className="text-sm text-stone-500">{dog.breed}</p>
                  {(dog.medicalNotes || dog.behaviorNotes) && (
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <Icons.AlertTriangle className="w-3 h-3" />
                      יש הערות מיוחדות
                    </p>
                  )}
                </div>
                <div className={cn(
                  "w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all",
                  selectedDogs.includes(dog.id)
                    ? "bg-forest-500 border-forest-500"
                    : "border-stone-300"
                )}>
                  {selectedDogs.includes(dog.id) && (
                    <Icons.Check className="w-4 h-4 text-white" />
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleStartWalk}
          disabled={selectedDogs.length === 0}
          className={cn(
            "w-full mt-6 py-4 rounded-2xl font-bold text-white transition-all",
            selectedDogs.length > 0
              ? "bg-gradient-to-r from-forest-600 to-forest-500 shadow-lg shadow-forest-500/30"
              : "bg-stone-300 cursor-not-allowed"
          )}
        >
          התחל טיול {selectedDogs.length > 0 && `(${selectedDogs.length} כלבים)`}
        </motion.button>
      </Modal>
    </div>
  )
}

// ============================================
// LIVE WALK PAGE
// ============================================
const LiveWalkPage = () => {
  const { activeWalk, setActiveWalk, dogs, setCurrentPage, addPhotoToActiveWalk } = useAppStore()
  const [elapsed, setElapsed] = useState(0)
  const [showEndModal, setShowEndModal] = useState(false)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [showRouteModal, setShowRouteModal] = useState(false)
  const [note, setNote] = useState('')
  const [photoCaption, setPhotoCaption] = useState('')
  const [currentPosition, setCurrentPosition] = useState<{lat: number; lng: number} | null>(null)
  const [routePoints, setRoutePoints] = useState<GPSPoint[]>([])
  
  const walkedDog = activeWalk ? dogs.find(d => d.id === activeWalk.dogId) : null
  
  // Timer effect
  useEffect(() => {
    if (activeWalk?.startedAt) {
      const startTime = new Date(activeWalk.startedAt).getTime()
      const interval = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [activeWalk])
  
  // GPS Tracking effect
  useEffect(() => {
    if (activeWalk && 'geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const point: GPSPoint = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            timestamp: new Date().toISOString()
          }
          setCurrentPosition({ lat: point.lat, lng: point.lng })
          setRoutePoints(prev => [...prev, point])
        },
        (error) => console.log('GPS error:', error),
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      )
      return () => navigator.geolocation.clearWatch(watchId)
    }
  }, [activeWalk])
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  
  const handleEndWalk = () => {
    setActiveWalk(null)
    setCurrentPage('walker-dash')
    setShowEndModal(false)
    setRoutePoints([])
  }
  
  const handleTakePhoto = () => {
    // Simulate taking a photo - in real app would use camera API
    const newPhoto: WalkPhoto = {
      id: `photo-${Date.now()}`,
      walkId: activeWalk?.id || '',
      url: walkedDog?.image || '', // Use dog image as placeholder
      timestamp: new Date().toISOString(),
      caption: photoCaption
    }
    addPhotoToActiveWalk(newPhoto)
    setPhotoCaption('')
    setShowPhotoModal(false)
  }
  
  const photosCount = activeWalk?.photos?.length || 0
  
  return (
    <div className="min-h-screen bg-stone-900 flex flex-col relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 border-2 border-forest-500/20 rounded-full"
        />
        <motion.div
          animate={{ scale: [1.2, 1, 1.2] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 border border-forest-500/10 rounded-full"
        />
      </div>
      
      <header className="px-6 pt-12 pb-4 flex justify-between items-center z-10">
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="flex items-center gap-2 bg-forest-500/20 backdrop-blur-md px-4 py-2.5 rounded-full border border-forest-500/30"
        >
          <span className="w-2.5 h-2.5 bg-forest-400 rounded-full animate-pulse" />
          <span className="text-forest-400 text-sm font-bold tracking-wide">מקליט מסלול...</span>
        </motion.div>
        
        <div className="flex items-center gap-2">
          {/* Photo count badge */}
          {photosCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="bg-forest-500/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-forest-500/30"
            >
              <span className="text-forest-400 text-sm font-bold">{photosCount} 📷</span>
            </motion.div>
          )}
          
          {/* Route button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowRouteModal(true)}
            className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/70 hover:bg-white/10 transition-colors"
          >
            <Icons.MapPin />
          </motion.button>
        </div>
      </header>
      
      <main className="flex-1 flex flex-col items-center justify-center px-6 relative z-10 -mt-10">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 15, stiffness: 200 }}
          className="text-center"
        >
          <p className="text-forest-500 font-bold mb-3 text-lg">זמן פעילות</p>
          
          <motion.div
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="text-8xl font-black text-white timer-display drop-shadow-2xl"
          >
            {formatTime(elapsed)}
          </motion.div>
          
          {/* GPS Status */}
          {currentPosition && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 flex items-center justify-center gap-2 text-white/50 text-sm"
            >
              <Icons.MapPin className="w-4 h-4" />
              <span>GPS פעיל • {routePoints.length} נקודות</span>
            </motion.div>
          )}
        </motion.div>
        
        {walkedDog && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-12 flex flex-col items-center"
          >
            <div className="flex -space-x-3">
              <motion.img
                animate={{ rotate: [0, -5, 5, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }}
                src={walkedDog.image}
                className="w-16 h-16 rounded-2xl border-4 border-stone-800 object-cover shadow-xl"
                alt={walkedDog.name}
              />
            </div>
            <p className="mt-3 text-white/70 font-medium">{walkedDog.name} בטיול 🐕</p>
          </motion.div>
        )}
      </main>
      
      <footer className="px-6 pb-10 pt-6 relative z-20">
        {/* Action buttons row */}
        <div className="flex justify-center gap-4 mb-6">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowNoteModal(true)}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-14 h-14 rounded-2xl bg-stone-800 border border-stone-700 flex items-center justify-center text-white hover:bg-stone-700 transition-colors">
              <Icons.Note />
            </div>
            <span className="text-xs font-semibold text-white/50">הערה</span>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowPhotoModal(true)}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-14 h-14 rounded-2xl bg-forest-500/20 border border-forest-500/30 flex items-center justify-center text-forest-400 hover:bg-forest-500/30 transition-colors">
              <Icons.Camera />
            </div>
            <span className="text-xs font-semibold text-white/50">תמונה</span>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowRouteModal(true)}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-14 h-14 rounded-2xl bg-sunset-500/20 border border-sunset-500/30 flex items-center justify-center text-sunset-400 hover:bg-sunset-500/30 transition-colors">
              <Icons.Route />
            </div>
            <span className="text-xs font-semibold text-white/50">מסלול</span>
          </motion.button>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowEndModal(true)}
          className="w-full bg-gradient-to-r from-sunset-500 to-sunset-400 text-white rounded-2xl py-5 px-6 shadow-xl shadow-sunset-500/30 flex justify-between items-center"
        >
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Icons.Stop />
          </div>
          <span className="text-xl font-black">סיימנו, חזרנו הביתה</span>
          <div className="w-10" />
        </motion.button>
      </footer>
      
      {/* End Walk Modal */}
      <Modal isOpen={showEndModal} onClose={() => setShowEndModal(false)} title="סיום טיול">
        <div className="text-center py-4">
          <div className="w-20 h-20 bg-forest-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Icons.Check className="w-10 h-10 text-forest-600" />
          </div>
          
          <p className="text-stone-600 mb-4">האם אתה בטוח שברצונך לסיים את הטיול?</p>
          
          <div className="text-5xl font-black text-forest-600 timer-display mb-2">
            {formatTime(elapsed)}
          </div>
          <p className="text-sm text-stone-500 mb-4">זמן טיול כולל</p>
          
          {/* Summary stats */}
          <div className="flex justify-center gap-6 text-sm">
            <div className="text-center">
              <p className="font-bold text-stone-900">{routePoints.length}</p>
              <p className="text-stone-500">נקודות GPS</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-stone-900">{photosCount}</p>
              <p className="text-stone-500">תמונות</p>
            </div>
          </div>
        </div>
        
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => setShowEndModal(false)}
            className="flex-1 py-4 bg-stone-100 text-stone-900 rounded-2xl font-bold"
          >
            המשך טיול
          </button>
          <button
            onClick={handleEndWalk}
            className="flex-1 py-4 bg-forest-600 text-white rounded-2xl font-bold shadow-lg shadow-forest-600/30"
          >
            סיום
          </button>
        </div>
      </Modal>
      
      {/* Note Modal */}
      <Modal isOpen={showNoteModal} onClose={() => setShowNoteModal(false)} title="הוסף הערה">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="הערה על הטיול..."
          className="w-full h-32 p-4 border border-stone-200 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-forest-500/20 focus:border-forest-500"
        />
        <button
          onClick={() => setShowNoteModal(false)}
          className="w-full mt-4 py-4 bg-forest-600 text-white rounded-2xl font-bold"
        >
          שמור הערה
        </button>
      </Modal>
      
      {/* Photo Modal */}
      <Modal isOpen={showPhotoModal} onClose={() => setShowPhotoModal(false)} title="צלם תמונה">
        <div className="space-y-4">
          {/* Simulated camera view */}
          <div className="aspect-square bg-stone-900 rounded-2xl flex items-center justify-center relative overflow-hidden">
            {walkedDog && (
              <img 
                src={walkedDog.image} 
                alt="Camera preview" 
                className="w-full h-full object-cover opacity-80"
              />
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 border-4 border-white/50 rounded-full" />
            </div>
          </div>
          
          <input
            type="text"
            value={photoCaption}
            onChange={(e) => setPhotoCaption(e.target.value)}
            placeholder="הוסף כיתוב לתמונה..."
            className="w-full p-4 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-forest-500/20 focus:border-forest-500"
          />
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleTakePhoto}
            className="w-full py-4 bg-forest-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2"
          >
            <Icons.Camera className="w-5 h-5" />
            צלם תמונה
          </motion.button>
        </div>
      </Modal>
      
      {/* Route Modal */}
      <Modal isOpen={showRouteModal} onClose={() => setShowRouteModal(false)} title="מסלול הטיול">
        <div className="space-y-4">
          {/* Simulated map view */}
          <div className="aspect-video bg-stone-100 rounded-2xl relative overflow-hidden">
            {/* Grid pattern for map */}
            <div className="absolute inset-0 opacity-20">
              {[...Array(10)].map((_, i) => (
                <div key={`h-${i}`} className="absolute w-full h-px bg-stone-400" style={{ top: `${i * 10}%` }} />
              ))}
              {[...Array(10)].map((_, i) => (
                <div key={`v-${i}`} className="absolute h-full w-px bg-stone-400" style={{ left: `${i * 10}%` }} />
              ))}
            </div>
            
            {/* Route line */}
            {routePoints.length > 1 && (
              <svg className="absolute inset-0 w-full h-full">
                <polyline
                  points={routePoints.map((p, i) => 
                    `${10 + i * 8}% ${50 + Math.sin(i) * 20}%`
                  ).join(' ')}
                  fill="none"
                  stroke="#16a34a"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Start point */}
                <circle cx="10%" cy="50%" r="8" fill="#f59e0b" />
                {/* Current position */}
                <circle 
                  cx={`${10 + (routePoints.length - 1) * 8}%`} 
                  cy={`${50 + Math.sin(routePoints.length - 1) * 20}%`} 
                  r="10" 
                  fill="#16a34a" 
                  className="animate-pulse"
                />
              </svg>
            )}
            
            {/* Center pin */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <Icons.MapPin className="w-8 h-8 text-forest-600" />
            </div>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-stone-50 rounded-xl p-3">
              <p className="text-2xl font-black text-forest-600">{routePoints.length}</p>
              <p className="text-xs text-stone-500">נקודות</p>
            </div>
            <div className="bg-stone-50 rounded-xl p-3">
              <p className="text-2xl font-black text-forest-600">{Math.floor(routePoints.length * 0.05 * 10) / 10}</p>
              <p className="text-xs text-stone-500">ק״מ</p>
            </div>
            <div className="bg-stone-50 rounded-xl p-3">
              <p className="text-2xl font-black text-forest-600">{formatTime(elapsed)}</p>
              <p className="text-xs text-stone-500">זמן</p>
            </div>
          </div>
          
          <p className="text-sm text-stone-500 text-center">
            המסלול נשמר אוטומטית ויהיה זמין לבעלים לאחר סיום הטיול
          </p>
        </div>
      </Modal>
    </div>
  )
}

// ============================================
// WALKER DOGS PAGE
// ============================================
const WalkerDogsPage = () => {
  const { dogs, setCurrentPage, setSelectedDog } = useAppStore()
  const [searchQuery, setSearchQuery] = useState('')
  
  const filteredDogs = dogs.filter(dog =>
    dog.name.includes(searchQuery) || dog.owner?.name.includes(searchQuery)
  )
  
  return (
    <div className="min-h-screen bg-stone-50 pb-32">
      <header className="px-6 pt-6 pb-4 flex justify-between items-end">
        <div>
          <p className="text-forest-600 font-semibold text-sm mb-1">הלקוחות שלך</p>
          <h1 className="text-3xl font-black text-stone-900 tracking-tight">הלהקה שלי</h1>
        </div>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="w-12 h-12 bg-white rounded-2xl shadow-md border border-stone-200 flex items-center justify-center text-forest-600"
        >
          <Icons.Add />
        </motion.button>
      </header>
      
      <section className="px-6 mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="חיפוש כלב או בעלים..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pr-12"
          />
          <Icons.Search className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400" />
        </div>
      </section>
      
      <section className="px-6 space-y-3">
        {filteredDogs.map((dog, index) => (
          <motion.div
            key={dog.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => { setSelectedDog(dog); setCurrentPage('dog-profile') }}
            className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100 flex justify-between items-center cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-4">
              <img
                src={dog.image}
                className="w-14 h-14 rounded-2xl object-cover"
                alt={dog.name}
              />
              <div>
                <h4 className="font-bold text-stone-900 text-lg">{dog.name}</h4>
                <p className="text-sm text-stone-500 flex items-center gap-1">
                  <Icons.User className="w-4 h-4" />
                  {dog.owner?.name}
                </p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="w-11 h-11 rounded-xl bg-forest-100 text-forest-600 flex items-center justify-center"
            >
              <Icons.Call />
            </motion.button>
          </motion.div>
        ))}
      </section>
      
      {/* Bottom Navigation */}
      <nav className="bottom-nav flex justify-around">
        <button onClick={() => setCurrentPage('walker-dash')} className="nav-item">
          <Icons.Home className="w-5 h-5" />
        </button>
        <button onClick={() => setCurrentPage('walker-calendar')} className="nav-item">
          <Icons.Calendar className="w-5 h-5" />
        </button>
        <button className="nav-item-active">
          <Icons.Paw className="w-5 h-5" />
          <span className="text-sm">כלבים</span>
        </button>
        <button onClick={() => setCurrentPage('walker-finance')} className="nav-item relative">
          <Icons.Wallet className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-sunset-400 rounded-full" />
        </button>
      </nav>
    </div>
  )
}

// ============================================
// WALKER FINANCE PAGE
// ============================================
const WalkerFinancePage = () => {
  const { payments, dogs, setCurrentPage } = useAppStore()
  
  const pendingPayments = payments.filter(p => p.status === 'OPEN')
  const totalPending = pendingPayments.reduce((sum, p) => sum + p.totalAmountIls, 0)
  
  return (
    <div className="min-h-screen bg-stone-50 pb-32">
      <header className="px-6 pt-6 pb-4 flex justify-between items-end">
        <div>
          <p className="text-forest-600 font-semibold text-sm mb-1">הכנסות ולקוחות</p>
          <h1 className="text-3xl font-black text-stone-900 tracking-tight">כספים</h1>
        </div>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="w-12 h-12 bg-white rounded-2xl shadow-md border border-stone-200 flex items-center justify-center text-stone-700"
        >
          <Icons.Search />
        </motion.button>
      </header>
      
      {/* Summary Card */}
      <section className="px-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-forest-600 via-forest-500 to-forest-400 rounded-3xl p-8 shadow-xl shadow-forest-500/30 text-white"
        >
          <div className="flex flex-col items-center text-center">
            <p className="text-white/70 font-medium mb-2">סה״כ פתוח לגבייה</p>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-6xl font-black timer-display">{totalPending.toLocaleString()}</span>
              <span className="text-2xl font-bold text-white/80">₪</span>
            </div>
            
            <div className="flex gap-4 w-full">
              <div className="flex-1 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                <p className="text-xs text-white/60 mb-1">לקוחות פעילים</p>
                <p className="font-bold text-2xl">{dogs.length}</p>
              </div>
              <div className="flex-1 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                <p className="text-xs text-white/60 mb-1">הכנסה החודש</p>
                <p className="font-bold text-2xl">{totalPending.toLocaleString()} ₪</p>
              </div>
            </div>
          </div>
        </motion.div>
      </section>
      
      {/* Pending Payments */}
      <section className="px-6">
        <div className="flex justify-between items-end mb-4">
          <h3 className="text-lg font-bold text-stone-900">מחכים לתשלום</h3>
          <span className="badge-sunset">{pendingPayments.length} לקוחות</span>
        </div>
        
        <div className="space-y-4">
          {pendingPayments.map((payment, index) => {
            const dog = dogs.find(d => d.ownerId === payment.ownerId)
            return (
              <motion.div
                key={payment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100"
              >
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={dog?.image || 'https://via.placeholder.com/48'}
                      className="w-12 h-12 rounded-xl object-cover border-2 border-stone-100"
                      alt={dog?.name}
                    />
                    <div>
                      <h4 className="font-bold text-stone-900">{payment.owner?.name}</h4>
                      <p className="text-xs text-stone-500">
                        {dog?.name} • {payment.paymentEntries?.length || 0} טיולים
                      </p>
                    </div>
                  </div>
                  <p className="text-2xl font-black text-forest-600">{payment.totalAmountIls}₪</p>
                </div>
                
                <div className="flex gap-2">
                  <button className="flex-1 bg-forest-600 text-white text-sm font-bold py-3 rounded-xl hover:bg-forest-700 transition-colors">
                    סמן כשולם
                  </button>
                  <button
                    onClick={() => setCurrentPage('owner-payment')}
                    className="w-12 bg-stone-100 text-stone-600 flex items-center justify-center rounded-xl hover:bg-stone-200 transition-colors"
                  >
                    <Icons.Note className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>
      </section>
      
      {/* Bottom Navigation */}
      <nav className="bottom-nav flex justify-around">
        <button onClick={() => setCurrentPage('walker-dash')} className="nav-item">
          <Icons.Home className="w-5 h-5" />
        </button>
        <button onClick={() => setCurrentPage('walker-calendar')} className="nav-item">
          <Icons.Calendar className="w-5 h-5" />
        </button>
        <button onClick={() => setCurrentPage('walker-dogs')} className="nav-item">
          <Icons.Paw className="w-5 h-5" />
        </button>
        <button className="nav-item-active">
          <Icons.Wallet className="w-5 h-5" />
          <span className="text-sm">כספים</span>
        </button>
      </nav>
    </div>
  )
}

// ============================================
// OWNER DASHBOARD
// ============================================
type HistoryMode = 'calendar' | 'list'

const OwnerDashboard = () => {
  const { dogs, walks, setCurrentPage, setSelectedDog, notifications, messages, userType } = useAppStore()
  const [historyMode, setHistoryMode] = useState<HistoryMode>('calendar')
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [selectedDogFilter, setSelectedDogFilter] = useState<string | null>(null)
  
  // Get all owned dogs (in demo, all dogs belong to owner)
  const myDogs = dogs
  
  // Get live walk if any
  const liveWalk = walks.find(w => w.status === 'LIVE')
  
  // Get latest completed walk
  const latestCompletedWalk = walks
    .filter(w => w.status === 'COMPLETED')
    .sort((a, b) => new Date(b.endedAt || 0).getTime() - new Date(a.endedAt || 0).getTime())[0]
  
  // Filter walks by selected dog
  const filteredWalks = selectedDogFilter 
    ? walks.filter(w => w.dogId === selectedDogFilter)
    : walks
  
  // Get walks for selected day (demo: walks from the past week)
  const getWalksForDay = (day: number) => {
    return filteredWalks.filter(w => {
      const walkDate = new Date(w.startedAt || w.scheduledAt || new Date())
      return walkDate.getDate() === day
    })
  }
  
  const selectedDayWalks = selectedDay ? getWalksForDay(selectedDay) : []
  
  // Format time helper
  const formatTime = (isoString?: string) => {
    if (!isoString) return '--:--'
    const date = new Date(isoString)
    return date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
  }
  
  // Get current month days
  const today = new Date()
  const currentMonth = today.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  
  return (
    <div className="min-h-screen bg-stone-50 pb-32">
      {/* ============================================ */}
      {/* OWNER DASHBOARD HEADER */}
      {/* ============================================ */}
      <header className="px-6 pt-6 pb-4 flex justify-between items-start">
        <div>
          <p className="text-forest-600 font-semibold text-sm mb-1">ברוכים הבאים הביתה 🏠</p>
          <h1 className="text-3xl font-black text-stone-900 tracking-tight">הלוח שלי</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setCurrentPage('notifications')}
            className="w-11 h-11 bg-white rounded-2xl shadow-sm border border-stone-200 flex items-center justify-center text-stone-700 relative"
          >
            <Icons.Bell className="w-5 h-5" />
            {notifications.filter(n => !n.read).length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {notifications.filter(n => !n.read).length}
              </span>
            )}
          </motion.button>
          
          {/* Chat */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setCurrentPage('chat')}
            className="w-11 h-11 bg-white rounded-2xl shadow-sm border border-stone-200 flex items-center justify-center text-stone-700 relative"
          >
            <Icons.MessageCircle className="w-5 h-5" />
            {messages.filter(m => !m.read && m.senderRole !== userType).length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-forest-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {messages.filter(m => !m.read && m.senderRole !== userType).length}
              </span>
            )}
          </motion.button>
        </div>
      </header>
      
      {/* ============================================ */}
      {/* OWNER STATUS SUMMARY */}
      {/* ============================================ */}
      <section className="px-6 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "rounded-3xl p-5 shadow-lg relative overflow-hidden",
            liveWalk 
              ? "bg-gradient-to-br from-forest-600 to-forest-500" 
              : "bg-stone-900"
          )}
        >
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
          
          <div className="relative z-10 flex justify-between items-center">
            <div className="flex-1">
              {liveWalk ? (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2.5 h-2.5 bg-forest-300 rounded-full animate-pulse" />
                    <span className="text-forest-200 text-xs font-bold tracking-wider uppercase">טיול פעיל עכשיו</span>
                  </div>
                  <h2 className="text-white text-xl font-bold mb-1">
                    {liveWalk.dog?.name} בטיול עם דני
                  </h2>
                  <p className="text-white/60 text-sm">התחיל ב-{formatTime(liveWalk.startedAt)}</p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 bg-sunset-400 rounded-full" />
                    <span className="text-sunset-400 text-xs font-bold tracking-wider uppercase">אין טיול פעיל</span>
                  </div>
                  <h2 className="text-white text-lg font-bold mb-1">הכל שקט עכשיו</h2>
                  {latestCompletedWalk && (
                    <p className="text-white/60 text-sm">
                      טיול אחרון: {formatTime(latestCompletedWalk.endedAt)} עם {latestCompletedWalk.dog?.name}
                    </p>
                  )}
                </>
              )}
            </div>
            <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-white">
              {liveWalk ? <Icons.Walk className="w-7 h-7" /> : <Icons.Heart className="w-7 h-7" />}
            </div>
          </div>
        </motion.div>
      </section>
      
      {/* ============================================ */}
      {/* OWNER DOGS SECTION */}
      {/* ============================================ */}
      <section className="mb-6">
        <div className="px-6 flex justify-between items-end mb-3">
          <h3 className="text-lg font-bold text-stone-900">הכלבים שלי</h3>
          <span className="text-sm text-stone-500 font-medium">{myDogs.length} כלבים</span>
        </div>
        
        <div className="flex gap-3 overflow-x-auto px-6 pb-2 pt-1 scrollbar-hide">
          {myDogs.map((dog, index) => (
            <motion.div
              key={dog.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => {
                setSelectedDog(dog)
                setSelectedDogFilter(selectedDogFilter === dog.id ? null : dog.id)
              }}
              className={cn(
                "min-w-[110px] rounded-3xl p-4 flex flex-col items-center gap-3 cursor-pointer transition-all border-2",
                selectedDogFilter === dog.id
                  ? "bg-forest-50 border-forest-400 shadow-md"
                  : "bg-white border-transparent shadow-sm"
              )}
            >
              <div className="relative">
                <img
                  src={dog.image}
                  className="w-14 h-14 rounded-2xl object-cover shadow-sm"
                  alt={dog.name}
                />
                {selectedDogFilter === dog.id && (
                  <div className="absolute -bottom-1 -left-1 w-5 h-5 bg-forest-500 rounded-full flex items-center justify-center">
                    <Icons.Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
              <div className="text-center">
                <h4 className="font-bold text-stone-900 text-sm">{dog.name}</h4>
                <p className="text-xs text-stone-500">{dog.breed}</p>
              </div>
            </motion.div>
          ))}
        </div>
        
        {selectedDogFilter && (
          <div className="px-6 mt-2">
            <button
              onClick={() => setSelectedDogFilter(null)}
              className="text-sm text-forest-600 font-medium flex items-center gap-1"
            >
              <Icons.Close className="w-4 h-4" />
              הצג את כל הכלבים
            </button>
          </div>
        )}
      </section>
      
      {/* ============================================ */}
      {/* OWNER CURRENT OR LATEST WALK */}
      {/* ============================================ */}
      <section className="px-6 mb-6">
        <h3 className="text-lg font-bold text-stone-900 mb-3">טיול אחרון</h3>
        
        {latestCompletedWalk ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-5 shadow-sm border border-stone-100"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-forest-100 text-forest-600 flex items-center justify-center shrink-0">
                <Icons.Check className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-stone-900">{latestCompletedWalk.dog?.name} חזר מטיול</h4>
                <p className="text-sm text-stone-500">
                  {latestCompletedWalk.durationMinutes || 30} דקות • עם דני
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-stone-500">
              <div className="flex items-center gap-1.5">
                <Icons.Calendar className="w-4 h-4" />
                <span>היום</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Icons.Clock className="w-4 h-4" />
                <span>{formatTime(latestCompletedWalk.endedAt)}</span>
              </div>
            </div>
            
            {latestCompletedWalk.notes && (
              <div className="mt-4 bg-stone-50 rounded-2xl p-4 border border-stone-100">
                <p className="text-sm text-stone-600 italic">"{latestCompletedWalk.notes}"</p>
              </div>
            )}
          </motion.div>
        ) : (
          <div className="bg-white rounded-3xl p-8 text-center border border-stone-100">
            <Icons.Paw className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-500">אין טיולים קודמים להצגה</p>
          </div>
        )}
      </section>
      
      {/* ============================================ */}
      {/* OWNER HISTORY SECTION */}
      {/* ============================================ */}
      <section className="px-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-stone-900">היסטוריית טיולים</h3>
          
          {/* History Mode Toggle */}
          <div className="flex bg-stone-100 rounded-xl p-1">
            <button
              onClick={() => setHistoryMode('calendar')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                historyMode === 'calendar'
                  ? "bg-white text-forest-600 shadow-sm"
                  : "text-stone-500"
              )}
            >
              <Icons.Grid className="w-4 h-4" />
              <span className="hidden sm:inline">יומן</span>
            </button>
            <button
              onClick={() => setHistoryMode('list')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                historyMode === 'list'
                  ? "bg-white text-forest-600 shadow-sm"
                  : "text-stone-500"
              )}
            >
              <Icons.List className="w-4 h-4" />
              <span className="hidden sm:inline">רשימה</span>
            </button>
          </div>
        </div>
        
        {/* Calendar View */}
        {historyMode === 'calendar' && (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100">
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-base font-bold text-stone-900">{currentMonth}</h4>
            </div>
            
            {/* Day headers */}
            <div className="grid grid-cols-7 text-center text-xs font-bold text-stone-400 mb-3">
              {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map(day => (
                <span key={day}>{day}</span>
              ))}
            </div>
            
            {/* Calendar grid - show 2 weeks around today */}
            <div className="grid grid-cols-7 gap-y-2 gap-x-1">
              {Array.from({ length: 14 }, (_, i) => {
                const day = today.getDate() - 7 + i
                const adjustedDay = day <= 0 ? day + daysInMonth : day > daysInMonth ? day - daysInMonth : day
                const isToday = day === today.getDate()
                const dayWalks = getWalksForDay(adjustedDay)
                const hasWalk = dayWalks.length > 0
                const isSelected = selectedDay === adjustedDay
                
                return (
                  <motion.button
                    key={i}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setSelectedDay(isSelected ? null : adjustedDay)}
                    className={cn(
                      "w-10 h-10 mx-auto rounded-xl flex flex-col items-center justify-center font-bold text-sm transition-all",
                      isSelected
                        ? "bg-forest-600 text-white shadow-lg"
                        : isToday
                          ? "bg-forest-100 text-forest-700"
                          : hasWalk
                            ? "bg-stone-50 text-stone-700"
                            : "text-stone-400"
                    )}
                  >
                    <span>{adjustedDay}</span>
                    {hasWalk && !isSelected && (
                      <div className="w-1.5 h-1.5 bg-forest-400 rounded-full mt-0.5" />
                    )}
                  </motion.button>
                )
              })}
            </div>
            
            {/* Selected Day Details */}
            <AnimatePresence>
              {selectedDay && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-6 pt-6 border-t border-stone-100"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h5 className="font-bold text-stone-900">טיולים ב-{selectedDay}/{today.getMonth() + 1}</h5>
                    <button
                      onClick={() => setSelectedDay(null)}
                      className="text-stone-400 hover:text-stone-600"
                    >
                      <Icons.Close className="w-5 h-5" />
                    </button>
                  </div>
                  
                  {selectedDayWalks.length > 0 ? (
                    <div className="space-y-3">
                      {selectedDayWalks.map((walk, index) => (
                        <div
                          key={walk.id || index}
                          className="bg-stone-50 rounded-2xl p-4 flex items-center gap-3"
                        >
                          <div className="w-10 h-10 rounded-xl bg-forest-100 text-forest-600 flex items-center justify-center">
                            <Icons.Paw className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <h6 className="font-bold text-stone-900 text-sm">{walk.dog?.name}</h6>
                            <p className="text-xs text-stone-500">
                              {formatTime(walk.startedAt)} • {walk.durationMinutes || 30} דק׳
                            </p>
                          </div>
                          <span className={cn(
                            "text-xs font-bold px-2 py-1 rounded-lg",
                            walk.status === 'COMPLETED'
                              ? "bg-forest-100 text-forest-700"
                              : walk.status === 'CANCELLED'
                                ? "bg-red-100 text-red-700"
                                : "bg-stone-100 text-stone-600"
                          )}>
                            {walk.status === 'COMPLETED' ? 'הושלם' : walk.status === 'CANCELLED' ? 'בוטל' : walk.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-stone-500 text-center py-4">אין טיולים ביום זה</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
        
        {/* List View */}
        {historyMode === 'list' && (
          <div className="space-y-3">
            {filteredWalks.filter(w => w.status !== 'LIVE').length > 0 ? (
              filteredWalks
                .filter(w => w.status !== 'LIVE')
                .sort((a, b) => new Date(b.endedAt || b.startedAt || 0).getTime() - new Date(a.endedAt || a.startedAt || 0).getTime())
                .slice(0, 10)
                .map((walk, index) => (
                  <motion.div
                    key={walk.id || index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        walk.status === 'COMPLETED'
                          ? "bg-forest-100 text-forest-600"
                          : "bg-red-100 text-red-500"
                      )}>
                        {walk.status === 'COMPLETED' ? <Icons.Check className="w-5 h-5" /> : <Icons.Close className="w-5 h-5" />}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-stone-900 text-sm">{walk.dog?.name} • טיול</h4>
                        <p className="text-xs text-stone-500">
                          {walk.durationMinutes || 30} דק׳ • עם דני
                        </p>
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-medium text-stone-900">{formatTime(walk.endedAt || walk.startedAt)}</p>
                        <p className="text-xs text-stone-400">היום</p>
                      </div>
                    </div>
                    
                    {walk.notes && (
                      <div className="mt-3 bg-stone-50 rounded-xl p-3 border border-stone-100">
                        <p className="text-xs text-stone-600 italic">"{walk.notes}"</p>
                      </div>
                    )}
                  </motion.div>
                ))
            ) : (
              <div className="bg-white rounded-3xl p-8 text-center border border-stone-100">
                <Icons.Calendar className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                <p className="text-stone-500">אין טיולים קודמים להצגה</p>
              </div>
            )}
          </div>
        )}
      </section>
      
      {/* ============================================ */}
      {/* BOTTOM NAVIGATION */}
      {/* ============================================ */}
      <nav className="bg-white/90 backdrop-blur-xl rounded-3xl p-2 flex items-center justify-around shadow-lg border border-stone-200 fixed bottom-4 left-4 right-4 z-50">
        <button className="nav-item bg-forest-600 text-white px-4 py-2 rounded-2xl font-semibold">
          <Icons.Home className="w-5 h-5" />
          <span className="text-sm">בית</span>
        </button>
        <button onClick={() => setCurrentPage('owner-calendar')} className="nav-item text-stone-400">
          <Icons.Calendar className="w-5 h-5" />
        </button>
        <button onClick={() => setCurrentPage('owner-payment')} className="nav-item text-stone-400">
          <Icons.Wallet className="w-5 h-5" />
        </button>
        <button onClick={() => setCurrentPage('settings')} className="nav-item text-stone-400">
          <Icons.Settings className="w-5 h-5" />
        </button>
      </nav>
    </div>
  )
}

// ============================================
// OWNER CALENDAR PAGE
// ============================================
const OwnerCalendarPage = () => {
  const { dogs, walks, setCurrentPage } = useAppStore()
  const myDog = dogs[0]
  const dogWalks = walks.filter(w => w.dogId === myDog.id)
  
  return (
    <div className="min-h-screen bg-stone-50 pb-32">
      <header className="px-6 pt-6 pb-4">
        <p className="text-forest-600 font-semibold text-sm mb-1">היסטוריה וזכרונות</p>
        <h1 className="text-3xl font-black text-stone-900 tracking-tight">היומן של {myDog.name}</h1>
      </header>
      
      {/* Calendar Card */}
      <section className="px-6 mb-8">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-stone-900">מרץ 2026</h2>
          </div>
          
          <div className="grid grid-cols-7 text-center text-xs font-bold text-stone-400 mb-4">
            {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map(day => (
              <span key={day}>{day}</span>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-y-3">
            {[1, 2, 3, 4].map(d => (
              <div key={d} className="flex flex-col items-center">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center font-bold",
                  d === 3
                    ? "bg-forest-600 text-white shadow-lg"
                    : "text-stone-400"
                )}>
                  {d}
                </div>
                {d < 4 && <Icons.Paw className="w-3 h-3 text-forest-400 mt-1" />}
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Walk History */}
      <section className="px-6 space-y-4">
        {dogWalks.length > 0 ? (
          dogWalks.map((walk, index) => (
            <motion.div
              key={walk.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-3xl p-5 shadow-sm border border-stone-100"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-forest-100 text-forest-600 flex items-center justify-center">
                  <Icons.Paw />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900">טיול עם דני</h3>
                  <p className="text-xs text-stone-500">{walk.durationMinutes} דקות</p>
                </div>
              </div>
              
              {walk.notes && (
                <div className="bg-stone-50 rounded-2xl p-4 border border-stone-100">
                  <p className="text-sm text-stone-600">"{walk.notes}"</p>
                </div>
              )}
            </motion.div>
          ))
        ) : (
          <div className="bg-white rounded-3xl p-8 text-center border border-stone-100">
            <Icons.Calendar className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-500">אין טיולים קודמים להצגה</p>
          </div>
        )}
      </section>
      
      {/* Bottom Navigation */}
      <nav className="bg-white/90 backdrop-blur-xl rounded-3xl p-2 flex items-center justify-around shadow-lg border border-stone-200 fixed bottom-4 left-4 right-4 z-50">
        <button onClick={() => setCurrentPage('owner-dash')} className="nav-item text-stone-400">
          <Icons.Paw className="w-5 h-5" />
        </button>
        <button className="nav-item bg-forest-600 text-white px-4 py-2 rounded-2xl font-semibold">
          <Icons.Calendar className="w-5 h-5" />
          <span className="text-sm">יומן</span>
        </button>
        <button onClick={() => setCurrentPage('owner-payment')} className="nav-item text-stone-400">
          <Icons.Wallet className="w-5 h-5" />
        </button>
        <button onClick={() => setCurrentPage('settings')} className="nav-item text-stone-400">
          <Icons.Settings className="w-5 h-5" />
        </button>
      </nav>
    </div>
  )
}

// ============================================
// OWNER PAYMENT PAGE
// ============================================
const OwnerPaymentPage = () => {
  const { payments, setCurrentPage } = useAppStore()
  const payment = payments[0]
  
  return (
    <div className="min-h-screen bg-stone-50 pb-40">
      <header className="px-6 pt-6 pb-4 flex justify-between items-center">
        <button
          onClick={() => setCurrentPage('owner-dash')}
          className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-stone-200 flex items-center justify-center text-stone-700"
        >
          <Icons.Close />
        </button>
        <h1 className="text-xl font-bold text-stone-900">סיכום חשבון</h1>
        <div className="w-12" />
      </header>
      
      {/* Summary Card */}
      <section className="px-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-forest-600 to-forest-500 rounded-3xl p-8 shadow-xl shadow-forest-500/30 text-white text-center"
        >
          <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Icons.Wallet className="w-8 h-8" />
          </div>
          
          <p className="text-white/70 font-medium mb-2">סה״כ לתשלום לדני הדוגווקר</p>
          
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-6xl font-black timer-display">{payment?.totalAmountIls || 150}</span>
            <span className="text-3xl font-bold text-white/80">₪</span>
          </div>
        </motion.div>
      </section>
      
      {/* Walk Details */}
      <section className="px-6 mb-6">
        <h3 className="text-lg font-bold text-stone-900 mb-4">פירוט טיולים (מרץ 2026)</h3>
        
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 divide-y divide-stone-100">
          {[
            { date: '12', day: 'יום ג\'', duration: '45 דק\'', price: 50 },
            { date: '14', day: 'יום ה\'', duration: '45 דק\'', price: 50 }
          ].map((walk, index) => (
            <div key={index} className="flex justify-between items-center p-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-forest-600 font-bold">
                  {walk.date}
                </div>
                <div>
                  <h4 className="font-bold text-stone-900 text-sm">טיול צהריים</h4>
                  <p className="text-xs text-stone-500">{walk.day} • {walk.duration}</p>
                </div>
              </div>
              <span className="font-black text-stone-900">{walk.price} ₪</span>
            </div>
          ))}
        </div>
      </section>
      
      {/* Payment Buttons */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-50 px-6 pb-8 pt-4 bg-gradient-to-t from-stone-50 via-stone-50/90 to-transparent">
        <div className="space-y-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-gradient-to-r from-sky-500 to-sky-400 text-white rounded-2xl py-4 px-6 font-bold shadow-lg flex justify-center items-center gap-3"
          >
            <span className="text-lg">שלם באפליקציית Bit</span>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setCurrentPage('owner-dash')}
            className="w-full bg-white border-2 border-forest-200 text-forest-600 rounded-2xl py-4 px-6 font-bold flex justify-center items-center gap-2"
          >
            <Icons.Check />
            <span>העברתי את התשלום</span>
          </motion.button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// DOG PROFILE PAGE
// ============================================
const DogProfilePage = () => {
  const { selectedDog, dogs, setCurrentPage } = useAppStore()
  const myDog = selectedDog || dogs[0]
  
  return (
    <div className="min-h-screen bg-stone-50 relative">
      {/* Hero Image */}
      <div className="fixed top-0 left-0 w-full h-80 z-0">
        <img
          src={myDog.image}
          alt={myDog.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/30" />
      </div>
      
      <header className="px-6 pt-12 pb-4 flex justify-between items-center relative z-10">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setCurrentPage('owner-dash')}
          className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 flex items-center justify-center text-white"
        >
          <Icons.ArrowLeft />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 flex items-center justify-center text-white"
        >
          <Icons.Edit className="w-5 h-5" />
        </motion.button>
      </header>
      
      {/* Content */}
      <main className="bg-stone-50 w-full rounded-t-[3rem] mt-28 px-6 pt-8 pb-12 relative z-10 min-h-[60vh] shadow-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-black text-stone-900 tracking-tight mb-1">{myDog.name}</h1>
          <p className="text-stone-500 font-medium text-lg">{myDog.breed} • בן {myDog.age}</p>
        </motion.div>
        
        {/* Notes */}
        <h3 className="text-lg font-bold text-stone-900 mb-4">דגשים לדוגווקר</h3>
        
        <div className="space-y-3 mb-8">
          {myDog.medicalNotes && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-red-50 rounded-2xl p-5 border border-red-100 flex gap-4 items-start relative overflow-hidden"
            >
              <div className="absolute left-0 top-0 w-2 h-full bg-red-400" />
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-red-500 shrink-0 shadow-sm">
                <Icons.AlertTriangle />
              </div>
              <div>
                <h4 className="font-bold text-red-600 text-sm mb-1">רגישות רפואית</h4>
                <p className="text-sm text-stone-700">{myDog.medicalNotes}</p>
              </div>
            </motion.div>
          )}
          
          {myDog.behaviorNotes && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-amber-50 rounded-2xl p-5 border border-amber-100 flex gap-4 items-start relative overflow-hidden"
            >
              <div className="absolute left-0 top-0 w-2 h-full bg-amber-400" />
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-amber-500 shrink-0 shadow-sm">
                <Icons.AlertTriangle />
              </div>
              <div>
                <h4 className="font-bold text-amber-600 text-sm mb-1">התנהגות בטיול</h4>
                <p className="text-sm text-stone-700">{myDog.behaviorNotes}</p>
              </div>
            </motion.div>
          )}
        </div>
        
        {/* Emergency Contact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-stone-900 rounded-3xl p-6 flex items-center justify-between"
        >
          <div>
            <h4 className="font-bold text-white mb-1">וטרינר חירום</h4>
            <p className="text-sm text-stone-400">מרפאת חיות העיר - ד״ר כהן</p>
          </div>
          <motion.a
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            href="tel:0501234567"
            className="w-12 h-12 bg-white text-stone-900 rounded-2xl flex items-center justify-center"
          >
            <Icons.Call />
          </motion.a>
        </motion.div>
      </main>
    </div>
  )
}

// ============================================
// SETTINGS PAGE
// ============================================
const SettingsPage = () => {
  const { setCurrentPage, setUserType } = useAppStore()
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  
  const handleLogout = () => {
    setUserType(null)
    setCurrentPage('login')
    setShowLogoutModal(false)
  }
  
  return (
    <div className="min-h-screen bg-stone-50 pb-32">
      <header className="px-6 pt-6 pb-6 flex justify-between items-center">
        <h1 className="text-3xl font-black text-stone-900 tracking-tight">הגדרות</h1>
        <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-stone-200 flex items-center justify-center text-stone-700">
          <Icons.Settings />
        </div>
      </header>
      
      {/* Install Card */}
      <section className="px-6 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-stone-900 to-stone-800 rounded-2xl p-6 shadow-lg"
        >
          <h3 className="font-bold text-white mb-1">התקן את עקבות</h3>
          <p className="text-xs text-stone-400 font-medium mb-3 leading-relaxed">
            לחוויה מושלמת וקבלת התראות באייפון, בחר <strong className="text-white">"הוסף למסך הבית"</strong>.
          </p>
        </motion.div>
      </section>
      
      {/* Notifications */}
      <section className="px-6 mb-6">
        <h3 className="text-lg font-bold text-stone-900 mb-4">התראות ועדכונים</h3>
        
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 divide-y divide-stone-100">
          <div className="flex items-center justify-between p-4">
            <div>
              <h4 className="font-bold text-stone-900">טיולים בשידור חי</h4>
            </div>
            <div className="w-12 h-7 bg-forest-600 rounded-full p-0.5 cursor-pointer">
              <div className="w-6 h-6 bg-white rounded-full shadow-md -translate-x-5" />
            </div>
          </div>
          
          <div className="flex items-center justify-between p-4">
            <div>
              <h4 className="font-bold text-stone-900">תזכורות טיולים</h4>
            </div>
            <div className="w-12 h-7 bg-forest-600 rounded-full p-0.5 cursor-pointer">
              <div className="w-6 h-6 bg-white rounded-full shadow-md -translate-x-5" />
            </div>
          </div>
        </div>
      </section>
      
      {/* Account */}
      <section className="px-6">
        <h3 className="text-lg font-bold text-stone-900 mb-4">חשבון</h3>
        
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100">
          <button
            onClick={() => setShowLogoutModal(true)}
            className="flex items-center gap-3 p-4 text-red-500 font-bold w-full rounded-2xl hover:bg-red-50 transition-colors"
          >
            <Icons.Logout />
            התנתקות מהחשבון
          </button>
        </div>
      </section>
      
      {/* Bottom Navigation */}
      <nav className="bg-white/90 backdrop-blur-xl rounded-3xl p-2 flex items-center justify-around shadow-lg border border-stone-200 fixed bottom-4 left-4 right-4 z-50">
        <button onClick={() => setCurrentPage('owner-dash')} className="nav-item text-stone-400">
          <Icons.Paw className="w-5 h-5" />
        </button>
        <button onClick={() => setCurrentPage('owner-calendar')} className="nav-item text-stone-400">
          <Icons.Calendar className="w-5 h-5" />
        </button>
        <button onClick={() => setCurrentPage('owner-payment')} className="nav-item text-stone-400">
          <Icons.Wallet className="w-5 h-5" />
        </button>
        <button className="nav-item bg-forest-600 text-white px-4 py-2 rounded-2xl font-semibold">
          <Icons.Settings className="w-5 h-5" />
          <span className="text-sm">הגדרות</span>
        </button>
      </nav>
      
      {/* Logout Modal */}
      <Modal isOpen={showLogoutModal} onClose={() => setShowLogoutModal(false)} title="התנתקות">
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icons.Logout className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-stone-600">האם אתה בטוח שברצונך להתנתק?</p>
        </div>
        
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => setShowLogoutModal(false)}
            className="flex-1 py-4 bg-stone-100 text-stone-900 rounded-2xl font-bold"
          >
            ביטול
          </button>
          <button
            onClick={handleLogout}
            className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-bold"
          >
            התנתק
          </button>
        </div>
      </Modal>
    </div>
  )
}

// ============================================
// WALKER CALENDAR PAGE
// ============================================
const WalkerCalendarPage = () => {
  const { setCurrentPage, dogs } = useAppStore()
  
  return (
    <div className="min-h-screen bg-stone-50 pb-32">
      <header className="px-6 pt-6 pb-4 flex justify-between items-end">
        <div>
          <p className="text-forest-600 font-semibold text-sm mb-1">תכנון שבועי</p>
          <h1 className="text-3xl font-black text-stone-900 tracking-tight">היומן שלי</h1>
        </div>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-stone-200 flex items-center justify-center text-forest-600"
        >
          <Icons.Add />
        </motion.button>
      </header>
      
      {/* Calendar */}
      <section className="px-6 mb-6">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-stone-900">מרץ 2026</h2>
            <div className="flex gap-1">
              <button className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-500 hover:bg-stone-200">
                <Icons.ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="flex justify-between items-center text-center">
            {[
              { day: 'א', date: 1, hasWalk: true },
              { day: 'ב', date: 2, hasWalk: true },
              { day: 'ג', date: 3, hasWalk: true, isToday: true },
              { day: 'ד', date: 4, hasWalk: false },
              { day: 'ה', date: 5, hasWalk: false }
            ].map(d => (
              <div key={d.date} className="flex flex-col items-center gap-1">
                <span className={cn(
                  "text-xs font-medium",
                  d.isToday ? "text-stone-900" : "text-stone-400"
                )}>
                  {d.day}
                </span>
                <div className={cn(
                  "w-11 h-11 rounded-2xl flex items-center justify-center font-bold",
                  d.isToday
                    ? "bg-forest-600 text-white shadow-lg"
                    : "text-stone-400"
                )}>
                  {d.date}
                </div>
                {d.hasWalk && <div className="w-1.5 h-1.5 bg-forest-400 rounded-full" />}
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Today's Schedule */}
      <section className="px-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-stone-900">הלו"ז להיום</h3>
          <span className="badge-forest">2 טיולים</span>
        </div>
        
        <div className="border-r-2 border-forest-200 pr-4 space-y-4">
          {[
            { time: '08:00', name: 'טיול בוקר', status: 'completed', dogs: [dogs[0]] },
            { time: '14:00', name: 'טיול צהריים', status: 'next', dogs: [dogs[0], dogs[1]] }
          ].map((walk, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative"
            >
              <div className={cn(
                "absolute -right-[22px] top-2 w-3 h-3 rounded-full shadow-[0_0_0_4px_#fafaf9]",
                walk.status === 'completed' ? "bg-forest-500" : "bg-sunset-400 animate-pulse"
              )} />
              
              <div className={cn(
                "rounded-2xl p-4",
                walk.status === 'next'
                  ? "bg-forest-600 text-white"
                  : "bg-white border border-stone-100"
              )}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-bold">{walk.name}</h4>
                    <p className={cn(
                      "text-xs font-medium mt-0.5",
                      walk.status === 'next' ? "text-white/70" : "text-forest-600"
                    )}>
                      {walk.time}
                    </p>
                  </div>
                  <span className={cn(
                    "text-xs font-bold px-2 py-1 rounded-lg",
                    walk.status === 'completed'
                      ? "bg-forest-100 text-forest-700"
                      : "bg-white/20 text-white"
                  )}>
                    {walk.status === 'completed' ? 'הושלם' : 'הבא'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {walk.dogs.map((dog, i) => (
                      <img
                        key={i}
                        src={dog.image}
                        className={cn(
                          "w-8 h-8 rounded-full border-2 object-cover",
                          walk.status === 'next' ? "border-forest-600" : "border-white"
                        )}
                        alt={dog.name}
                      />
                    ))}
                  </div>
                  
                  {walk.status === 'next' && (
                    <button
                      onClick={() => setCurrentPage('walker-live')}
                      className="text-xs bg-white text-forest-600 px-3 py-1.5 rounded-lg font-bold"
                    >
                      התחל טיול
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
      
      {/* Bottom Navigation */}
      <nav className="bottom-nav flex justify-around">
        <button onClick={() => setCurrentPage('walker-dash')} className="nav-item">
          <Icons.Home className="w-5 h-5" />
        </button>
        <button className="nav-item-active">
          <Icons.Calendar className="w-5 h-5" />
          <span className="text-sm">יומן</span>
        </button>
        <button onClick={() => setCurrentPage('walker-dogs')} className="nav-item">
          <Icons.Paw className="w-5 h-5" />
        </button>
        <button onClick={() => setCurrentPage('walker-finance')} className="nav-item relative">
          <Icons.Wallet className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-sunset-400 rounded-full" />
        </button>
      </nav>
    </div>
  )
}

// ============================================
// CHAT PAGE
// ============================================
const ChatPage = () => {
  const { messages, userType, addMessage, markMessagesRead, setCurrentPage } = useAppStore()
  const [newMessage, setNewMessage] = useState('')
  const messagesEndRef = useState<HTMLDivElement>(null)
  
  const myMessages = messages.filter(
    m => m.senderRole !== userType
  )
  
  useEffect(() => {
    markMessagesRead()
  }, [markMessagesRead])
  
  const handleSend = () => {
    if (!newMessage.trim()) return
    
    const message: Message = {
      id: `m-${Date.now()}`,
      senderId: userType === 'walker' ? 'walker1' : 'owner1',
      senderName: userType === 'walker' ? 'דני הדוגווקר' : 'משפחת כהן',
      senderRole: userType as 'walker' | 'owner',
      recipientId: userType === 'walker' ? 'owner1' : 'walker1',
      content: newMessage,
      timestamp: new Date().toISOString(),
      read: false
    }
    
    addMessage(message)
    setNewMessage('')
  }
  
  const formatTime = (iso: string) => {
    const date = new Date(iso)
    return date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
  }
  
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col pb-4">
      {/* Header */}
      <header className="px-6 pt-6 pb-4 flex justify-between items-center bg-white border-b border-stone-100">
        <button
          onClick={() => setCurrentPage(userType === 'walker' ? 'walker-dash' : 'owner-dash')}
          className="w-12 h-12 bg-stone-100 rounded-2xl flex items-center justify-center text-stone-700"
        >
          <Icons.ArrowLeft />
        </button>
        <div className="text-center">
          <h1 className="text-xl font-bold text-stone-900">הודעות</h1>
          <p className="text-xs text-stone-500">{userType === 'walker' ? 'משפחת כהן' : 'דני הדוגווקר'}</p>
        </div>
        <div className="w-12 h-12 bg-forest-100 rounded-2xl flex items-center justify-center">
          <Icons.MessageCircle className="w-6 h-6 text-forest-600" />
        </div>
      </header>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg) => {
          const isMine = msg.senderRole === userType
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn("flex", isMine ? "justify-start" : "justify-end")}
            >
              <div className={cn(
                "max-w-[80%] rounded-2xl px-4 py-3",
                isMine 
                  ? "bg-forest-600 text-white rounded-tr-none" 
                  : "bg-white text-stone-900 rounded-tl-none shadow-sm border border-stone-100"
              )}>
                <p className="text-sm leading-relaxed">{msg.content}</p>
                <p className={cn(
                  "text-xs mt-1",
                  isMine ? "text-white/60" : "text-stone-400"
                )}>
                  {formatTime(msg.timestamp)}
                </p>
              </div>
            </motion.div>
          )
        })}
      </div>
      
      {/* Input */}
      <div className="px-4 pt-2 bg-white border-t border-stone-100">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="הקלד הודעה..."
            className="flex-1 bg-stone-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500/20"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSend}
            disabled={!newMessage.trim()}
            className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
              newMessage.trim()
                ? "bg-forest-600 text-white"
                : "bg-stone-100 text-stone-400"
            )}
          >
            <Icons.Send />
          </motion.button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// NOTIFICATIONS PAGE
// ============================================
const NotificationsPage = () => {
  const { notifications, markNotificationsRead, setCurrentPage, userType } = useAppStore()
  
  useEffect(() => {
    markNotificationsRead()
  }, [markNotificationsRead])
  
  const formatTime = (iso: string) => {
    const date = new Date(iso)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / 3600000)
    
    if (hours < 1) return 'עכשיו'
    if (hours < 24) return `לפני ${hours} שעות`
    return date.toLocaleDateString('he-IL')
  }
  
  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'walk_started': return <Icons.Walk className="w-5 h-5" />
      case 'walk_ended': return <Icons.Check className="w-5 h-5" />
      case 'photo_added': return <Icons.Photo className="w-5 h-5" />
      case 'message': return <Icons.MessageCircle className="w-5 h-5" />
      case 'payment_due': return <Icons.Wallet className="w-5 h-5" />
      default: return <Icons.Bell className="w-5 h-5" />
    }
  }
  
  const getColor = (type: Notification['type']) => {
    switch (type) {
      case 'walk_started': return 'bg-forest-100 text-forest-600'
      case 'walk_ended': return 'bg-forest-100 text-forest-600'
      case 'photo_added': return 'bg-sunset-100 text-sunset-600'
      case 'message': return 'bg-sky-100 text-sky-600'
      case 'payment_due': return 'bg-amber-100 text-amber-600'
      default: return 'bg-stone-100 text-stone-600'
    }
  }
  
  return (
    <div className="min-h-screen bg-stone-50 pb-32">
      <header className="px-6 pt-6 pb-4 flex justify-between items-center bg-white border-b border-stone-100">
        <button
          onClick={() => setCurrentPage(userType === 'walker' ? 'walker-dash' : 'owner-dash')}
          className="w-12 h-12 bg-stone-100 rounded-2xl flex items-center justify-center text-stone-700"
        >
          <Icons.ArrowLeft />
        </button>
        <h1 className="text-xl font-bold text-stone-900">התראות</h1>
        <div className="w-12 h-12 bg-forest-100 rounded-2xl flex items-center justify-center">
          <Icons.Bell className="w-6 h-6 text-forest-600" />
        </div>
      </header>
      
      <div className="px-6 py-4 space-y-3">
        {notifications.length > 0 ? (
          notifications.map((notif, index) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "bg-white rounded-2xl p-4 shadow-sm border flex items-start gap-4",
                notif.read ? "border-stone-100" : "border-forest-200 bg-forest-50/50"
              )}
            >
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", getColor(notif.type))}>
                {getIcon(notif.type)}
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-stone-900 text-sm">{notif.title}</h4>
                <p className="text-xs text-stone-500 mt-0.5">{notif.body}</p>
                <p className="text-xs text-stone-400 mt-1">{formatTime(notif.timestamp)}</p>
              </div>
              {!notif.read && (
                <div className="w-2 h-2 bg-forest-500 rounded-full mt-1.5" />
              )}
            </motion.div>
          ))
        ) : (
          <div className="bg-white rounded-3xl p-8 text-center border border-stone-100 mt-8">
            <Icons.Bell className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-500">אין התראות חדשות</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// WALK DETAILS PAGE
// ============================================
const WalkDetailsPage = () => {
  const { selectedWalk, setCurrentPage, userType } = useAppStore()
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<WalkPhoto | null>(null)
  
  if (!selectedWalk) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <p className="text-stone-500">לא נבחר טיול</p>
      </div>
    )
  }
  
  const formatTime = (iso?: string) => {
    if (!iso) return '--:--'
    return new Date(iso).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
  }
  
  const formatDate = (iso?: string) => {
    if (!iso) return '--/--/----'
    return new Date(iso).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })
  }
  
  return (
    <div className="min-h-screen bg-stone-50 pb-32">
      {/* Header */}
      <header className="px-6 pt-6 pb-4 flex justify-between items-center bg-white border-b border-stone-100">
        <button
          onClick={() => setCurrentPage(userType === 'walker' ? 'walker-calendar' : 'owner-dash')}
          className="w-12 h-12 bg-stone-100 rounded-2xl flex items-center justify-center text-stone-700"
        >
          <Icons.ArrowLeft />
        </button>
        <h1 className="text-xl font-bold text-stone-900">פרטי טיול</h1>
        <div className="w-12" />
      </header>
      
      {/* Hero Card */}
      <section className="px-6 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-forest-600 to-forest-500 rounded-3xl p-6 shadow-xl text-white"
        >
          <div className="flex items-center gap-4 mb-4">
            {selectedWalk.dog && (
              <img
                src={selectedWalk.dog.image}
                alt={selectedWalk.dog.name}
                className="w-14 h-14 rounded-2xl border-2 border-white/30 object-cover"
              />
            )}
            <div>
              <h2 className="text-xl font-bold">{selectedWalk.dog?.name}</h2>
              <p className="text-white/70 text-sm">עם {selectedWalk.walker?.name || 'דני'}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-black">{selectedWalk.durationMinutes || 30}</p>
              <p className="text-xs text-white/70">דקות</p>
            </div>
            <div>
              <p className="text-2xl font-black">{formatTime(selectedWalk.startedAt)}</p>
              <p className="text-xs text-white/70">התחלה</p>
            </div>
            <div>
              <p className="text-2xl font-black">{formatTime(selectedWalk.endedAt)}</p>
              <p className="text-xs text-white/70">סיום</p>
            </div>
          </div>
        </motion.div>
      </section>
      
      {/* Date */}
      <section className="px-6 mb-6">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center">
            <Icons.Calendar className="w-5 h-5 text-stone-600" />
          </div>
          <div>
            <h4 className="font-bold text-stone-900">{formatDate(selectedWalk.startedAt)}</h4>
            <p className="text-xs text-stone-500">{selectedWalk.status === 'COMPLETED' ? 'טיול הושלם' : selectedWalk.status}</p>
          </div>
        </div>
      </section>
      
      {/* Notes */}
      {selectedWalk.notes && (
        <section className="px-6 mb-6">
          <h3 className="text-lg font-bold text-stone-900 mb-3">הערות</h3>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100">
            <p className="text-stone-700 leading-relaxed">{selectedWalk.notes}</p>
          </div>
        </section>
      )}
      
      {/* Photos */}
      {selectedWalk.photos && selectedWalk.photos.length > 0 && (
        <section className="px-6 mb-6">
          <h3 className="text-lg font-bold text-stone-900 mb-3">תמונות ({selectedWalk.photos.length})</h3>
          <div className="grid grid-cols-2 gap-3">
            {selectedWalk.photos.map((photo, index) => (
              <motion.button
                key={photo.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => {
                  setSelectedPhoto(photo)
                  setShowPhotoModal(true)
                }}
                className="aspect-square rounded-2xl overflow-hidden relative group"
              >
                <img
                  src={photo.url}
                  alt={photo.caption || 'Walk photo'}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
              </motion.button>
            ))}
          </div>
        </section>
      )}
      
      {/* Route */}
      {selectedWalk.route && selectedWalk.route.length > 0 && (
        <section className="px-6 mb-6">
          <h3 className="text-lg font-bold text-stone-900 mb-3">מסלול הטיול</h3>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100">
            <div className="aspect-video bg-stone-100 rounded-xl relative overflow-hidden">
              {/* Grid */}
              <div className="absolute inset-0 opacity-20">
                {[...Array(10)].map((_, i) => (
                  <div key={`h-${i}`} className="absolute w-full h-px bg-stone-400" style={{ top: `${i * 10}%` }} />
                ))}
              </div>
              
              {/* Route line */}
              <svg className="absolute inset-0 w-full h-full">
                <polyline
                  points={selectedWalk.route.map((p, i) => 
                    `${10 + i * 8}% ${50 + Math.sin(i) * 20}%`
                  ).join(' ')}
                  fill="none"
                  stroke="#16a34a"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="10%" cy="50%" r="6" fill="#f59e0b" />
                <circle 
                  cx={`${10 + (selectedWalk.route.length - 1) * 8}%`} 
                  cy={`${50 + Math.sin(selectedWalk.route.length - 1) * 20}%`} 
                  r="6" 
                  fill="#16a34a" 
                />
              </svg>
            </div>
            
            <div className="flex justify-between mt-4 text-center">
              <div>
                <p className="font-bold text-stone-900">{selectedWalk.route.length}</p>
                <p className="text-xs text-stone-500">נקודות</p>
              </div>
              <div>
                <p className="font-bold text-stone-900">{Math.floor(selectedWalk.route.length * 0.05 * 10) / 10} ק״מ</p>
                <p className="text-xs text-stone-500">מרחק</p>
              </div>
              <div>
                <p className="font-bold text-stone-900">{selectedWalk.durationMinutes || 30} דק׳</p>
                <p className="text-xs text-stone-500">זמן</p>
              </div>
            </div>
          </div>
        </section>
      )}
      
      {/* Photo Modal */}
      <Modal isOpen={showPhotoModal} onClose={() => setShowPhotoModal(false)} title="תמונה">
        {selectedPhoto && (
          <div className="space-y-4">
            <img
              src={selectedPhoto.url}
              alt={selectedPhoto.caption || 'Walk photo'}
              className="w-full rounded-2xl"
            />
            {selectedPhoto.caption && (
              <p className="text-stone-600 text-center italic">"{selectedPhoto.caption}"</p>
            )}
            <p className="text-xs text-stone-400 text-center">
              {formatTime(selectedPhoto.timestamp)}
            </p>
          </div>
        )}
      </Modal>
    </div>
  )
}

// ============================================
// PHOTO GALLERY PAGE
// ============================================
const PhotoGalleryPage = () => {
  const { walks, setCurrentPage, userType, setSelectedWalk } = useAppStore()
  
  // Get all photos from all walks
  const allPhotos = walks
    .filter(w => w.photos && w.photos.length > 0)
    .flatMap(w => w.photos!.map(p => ({ ...p, walk: w })))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  
  return (
    <div className="min-h-screen bg-stone-50 pb-32">
      <header className="px-6 pt-6 pb-4 flex justify-between items-center bg-white border-b border-stone-100">
        <button
          onClick={() => setCurrentPage(userType === 'walker' ? 'walker-dash' : 'owner-dash')}
          className="w-12 h-12 bg-stone-100 rounded-2xl flex items-center justify-center text-stone-700"
        >
          <Icons.ArrowLeft />
        </button>
        <h1 className="text-xl font-bold text-stone-900">גלריית תמונות</h1>
        <div className="w-12 h-12 bg-sunset-100 rounded-2xl flex items-center justify-center">
          <Icons.Photo className="w-6 h-6 text-sunset-600" />
        </div>
      </header>
      
      {/* Stats */}
      <section className="px-6 py-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100 flex justify-around text-center">
          <div>
            <p className="text-2xl font-black text-forest-600">{allPhotos.length}</p>
            <p className="text-xs text-stone-500">תמונות</p>
          </div>
          <div className="w-px bg-stone-200" />
          <div>
            <p className="text-2xl font-black text-forest-600">{walks.filter(w => w.photos?.length).length}</p>
            <p className="text-xs text-stone-500">טיולים</p>
          </div>
        </div>
      </section>
      
      {/* Photos Grid */}
      <section className="px-6">
        {allPhotos.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {allPhotos.map((photo, index) => (
              <motion.button
                key={photo.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => {
                  setSelectedWalk(photo.walk)
                  setCurrentPage('walk-details')
                }}
                className="aspect-square rounded-2xl overflow-hidden relative group"
              >
                <img
                  src={photo.url}
                  alt={photo.caption || 'Walk photo'}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-2 right-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-white text-xs font-medium truncate">{photo.walk.dog?.name}</p>
                </div>
              </motion.button>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-8 text-center border border-stone-100 mt-8">
            <Icons.Photo className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-500">אין תמונות להצגה</p>
            <p className="text-xs text-stone-400 mt-1">תמונות מטיולים יופיעו כאן</p>
          </div>
        )}
      </section>
    </div>
  )
}

// ============================================
// MAIN APP
// ============================================
export default function Home() {
  const { currentPage } = useAppStore()
  
  const renderPage = () => {
    switch (currentPage) {
      case 'login': return <LoginPage />
      case 'walker-dash': return <WalkerDashboard />
      case 'walker-calendar': return <WalkerCalendarPage />
      case 'walker-dogs': return <WalkerDogsPage />
      case 'walker-live': return <LiveWalkPage />
      case 'walker-finance': return <WalkerFinancePage />
      case 'owner-dash': return <OwnerDashboard />
      case 'owner-calendar': return <OwnerCalendarPage />
      case 'owner-payment': return <OwnerPaymentPage />
      case 'dog-profile': return <DogProfilePage />
      case 'settings': return <SettingsPage />
      case 'chat': return <ChatPage />
      case 'notifications': return <NotificationsPage />
      case 'walk-details': return <WalkDetailsPage />
      case 'photo-gallery': return <PhotoGalleryPage />
      default: return <LoginPage />
    }
  }
  
  return (
    <div className="min-h-screen" dir="rtl" lang="he">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPage}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {renderPage()}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
