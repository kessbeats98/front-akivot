'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Role = 'walker' | 'owner'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('owner')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function validate(): string | null {
    if (phone && !/^05\d[-\s]?\d{7}$/.test(phone)) {
      return 'מספר טלפון לא תקין (לדוגמה: 050-1234567)'
    }
    if (password.length < 8) {
      return 'הסיסמה חייבת להכיל לפחות 8 תווים'
    }
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    try {
      // Step 1: Register via Better Auth native endpoint
      const signUpRes = await fetch('/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })

      if (!signUpRes.ok) {
        const data = await signUpRes.json().catch(() => ({}))
        const msg = data?.message ?? data?.error ?? 'שגיאה בהרשמה'
        // Better Auth returns "User already exists" on duplicate
        if (msg.toLowerCase().includes('exist') || msg.toLowerCase().includes('already')) {
          setError('כתובת האימייל כבר בשימוש')
        } else {
          setError(msg)
        }
        return
      }

      // Step 2: Create walker profile if role is walker (session cookie is now set)
      if (role === 'walker') {
        await fetch('/api/setup-role', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'walker' }),
        })
      }

      // Redirect to login
      router.push('/login')
    } catch {
      setError('שגיאה בהרשמה. נסה שנית.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">הרשמה</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role toggle */}
            <div className="space-y-1">
              <Label>תפקיד</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={role === 'owner' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setRole('owner')}
                >
                  בעל כלב
                </Button>
                <Button
                  type="button"
                  variant={role === 'walker' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setRole('walker')}
                >
                  הולך כלבים
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="name">שם מלא</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="ישראל ישראלי"
                required
                autoComplete="name"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="email">דוא״ל</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="phone">
                טלפון <span className="text-gray-400 text-xs">(אופציונלי)</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="050-1234567"
                autoComplete="tel"
                dir="ltr"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="password">סיסמה</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="לפחות 8 תווים"
                required
                autoComplete="new-password"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'נרשם...' : 'הרשם'}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-600">
            כבר יש לך חשבון?{' '}
            <Link href="/login" className="text-blue-600 hover:underline">
              התחבר
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
