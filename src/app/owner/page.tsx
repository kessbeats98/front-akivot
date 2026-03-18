import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import LogoutButton from '@/components/LogoutButton'

export default async function OwnerPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  return (
    <div dir="rtl" className="min-h-screen flex flex-col items-center justify-center gap-6 bg-gray-50 p-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">שלום {user.name}!</h1>
        <p className="text-gray-500 text-lg">Dashboard בבנייה</p>
      </div>
      <LogoutButton />
    </div>
  )
}
