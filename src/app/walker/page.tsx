import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import WalkerDashboardClient from './WalkerDashboardClient'

export default async function WalkerPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  return <WalkerDashboardClient name={user.name ?? ''} />
}
