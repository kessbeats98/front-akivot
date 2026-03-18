'use client'

import { useState, useEffect } from 'react'
import LogoutButton from '@/components/LogoutButton'
import { Dog, CheckCircle2, Play, Square, Loader2 } from 'lucide-react'

interface DogData {
  id: string
  name: string
  breed?: string | null
  imageUrl?: string | null
  owner: { id: string; name: string } | null
  currentPrice?: number | null
  currency?: string | null
}

interface Walk {
  id: string
  dogId: string
  dog: { id: string; name: string; image?: string | null }
  status: string
  startedAt?: string | null
  endedAt?: string | null
  durationMinutes?: number | null
  walkBatchId?: string | null
}

interface SummaryItem {
  id: string
  dogId: string
  dogName?: string
  durationMinutes?: number | null
  finalPrice?: string | null
}

type Phase = 'loading' | 'no_dogs' | 'idle' | 'starting' | 'live' | 'ending' | 'summary'

function formatTimer(s: number) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const p = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${p(h)}:${p(m)}:${p(sec)}` : `${p(m)}:${p(sec)}`
}

function formatDate(iso?: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' })
}

export default function WalkerDashboardClient({ name }: { name: string }) {
  const [phase, setPhase] = useState<Phase>('loading')
  const [dogs, setDogs] = useState<DogData[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [liveWalks, setLiveWalks] = useState<Walk[]>([])
  const [liveBatchId, setLiveBatchId] = useState<string | null>(null)
  const [liveStartedAt, setLiveStartedAt] = useState<string | null>(null)
  const [history, setHistory] = useState<Walk[]>([])
  const [summary, setSummary] = useState<SummaryItem[]>([])
  const [timerSecs, setTimerSecs] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/dogs').then(r => r.json()),
      fetch('/api/walks?status=LIVE').then(r => r.json()),
      fetch('/api/walks?status=COMPLETED').then(r => r.json()),
    ]).then(([dogsData, liveData, completedData]) => {
      setDogs(Array.isArray(dogsData) ? dogsData : [])
      setHistory(Array.isArray(completedData) ? completedData.slice(0, 10) : [])
      if (Array.isArray(liveData) && liveData.length > 0) {
        setLiveWalks(liveData)
        setLiveBatchId(liveData[0].walkBatchId ?? null)
        setLiveStartedAt(liveData[0].startedAt ?? null)
        setPhase('live')
      } else if (!Array.isArray(dogsData) || dogsData.length === 0) {
        setPhase('no_dogs')
      } else {
        setPhase('idle')
      }
    }).catch(() => {
      setError('שגיאה בטעינת הנתונים')
      setPhase('idle')
    })
  }, [])

  useEffect(() => {
    if (phase !== 'live' || !liveStartedAt) return
    const tick = () => setTimerSecs(Math.floor((Date.now() - new Date(liveStartedAt).getTime()) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [phase, liveStartedAt])

  function toggleDog(id: string) {
    if (phase !== 'idle') return
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function startWalk() {
    setPhase('starting')
    setError(null)
    try {
      const res = await fetch('/api/walks/batch/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dogIds: [...selected] }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'שגיאה בהתחלת הליכה')
        setPhase('idle')
        return
      }
      setLiveBatchId(data.walkBatchId)
      setLiveStartedAt(data.startedAt)
      setLiveWalks(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (data.walks ?? []).map((w: any) => ({
          id: w.id,
          dogId: w.dogId,
          dog: { id: w.dogId, name: w.dogName ?? w.dogId },
          status: 'LIVE',
          startedAt: data.startedAt,
          walkBatchId: data.walkBatchId,
        }))
      )
      setSelected(new Set())
      setPhase('live')
    } catch {
      setError('שגיאה בהתחלת הליכה')
      setPhase('idle')
    }
  }

  async function endWalk() {
    if (!liveBatchId) return
    setPhase('ending')
    setError(null)
    try {
      const res = await fetch(`/api/walks/batch/${liveBatchId}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'שגיאה בסיום הליכה')
        setPhase('live')
        return
      }
      setSummary(data.walks ?? [])
      setLiveWalks([])
      setLiveBatchId(null)
      setLiveStartedAt(null)
      setPhase('summary')
    } catch {
      setError('שגיאה בסיום הליכה')
      setPhase('live')
    }
  }

  async function backFromSummary() {
    setPhase('loading')
    setError(null)
    try {
      const [dogsData, completedData] = await Promise.all([
        fetch('/api/dogs').then(r => r.json()),
        fetch('/api/walks?status=COMPLETED').then(r => r.json()),
      ])
      setDogs(Array.isArray(dogsData) ? dogsData : [])
      setHistory(Array.isArray(completedData) ? completedData.slice(0, 10) : [])
      setSelected(new Set())
      setPhase(!Array.isArray(dogsData) || dogsData.length === 0 ? 'no_dogs' : 'idle')
    } catch {
      setError('שגיאה בטעינת הנתונים')
      setPhase('idle')
    }
  }

  const isLiveOrEnding = phase === 'live' || phase === 'ending'

  return (
    <div dir="rtl" className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-4 bg-white border-b border-gray-200">
        <h1 className="text-lg font-bold text-stone-800">שלום {name}!</h1>
        <LogoutButton />
      </header>

      {/* Error banner */}
      {error && (
        <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-2 text-red-400 hover:text-red-600">×</button>
        </div>
      )}

      <div className="p-4 space-y-4">

        {/* Loading skeleton */}
        {phase === 'loading' && (
          <div className="space-y-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded-2xl animate-pulse" />
            ))}
          </div>
        )}

        {/* No dogs state */}
        {phase === 'no_dogs' && (
          <div className="p-8 bg-white rounded-2xl border border-gray-200 text-center text-stone-500">
            <Dog className="mx-auto mb-3 text-gray-300" size={40} />
            <p>לא הוקצו לך כלבים עדיין</p>
          </div>
        )}

        {/* Walk summary */}
        {phase === 'summary' && (
          <div className="p-6 bg-white rounded-2xl border border-gray-200 space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="text-[#16a34a]" size={28} />
              <span className="text-xl font-black">הליכה הסתיימה!</span>
            </div>
            {summary.map(s => (
              <div key={s.id} className="flex justify-between text-sm border-b border-gray-100 pb-2 last:border-0">
                <span>{s.dogName ?? s.dogId}</span>
                <span className="text-stone-500">
                  {s.durationMinutes != null ? `${s.durationMinutes} דק׳` : ''}
                  {s.finalPrice != null ? ` · ₪${s.finalPrice}` : ''}
                </span>
              </div>
            ))}
            <button
              onClick={backFromSummary}
              className="w-full py-3 rounded-2xl border border-gray-300 font-semibold text-stone-700"
            >
              חזור לרשימה
            </button>
          </div>
        )}

        {/* Dog list (all phases except loading/summary) */}
        {phase !== 'loading' && phase !== 'summary' && (
          <div className="space-y-3">
            {phase === 'no_dogs' ? null : dogs.map(dog => (
              <div
                key={dog.id}
                onClick={() => toggleDog(dog.id)}
                className={`p-4 bg-white rounded-2xl border-2 shadow-sm flex items-center gap-3 transition-colors
                  ${isLiveOrEnding ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  ${selected.has(dog.id) ? 'border-[#16a34a] bg-[#f0fdf4]' : 'border-gray-200'}`}
              >
                {/* Avatar */}
                {dog.imageUrl ? (
                  <img src={dog.imageUrl} alt={dog.name} className="w-12 h-12 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                    <span className="text-lg font-bold text-gray-400">{dog.name.charAt(0)}</span>
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-stone-800 truncate">{dog.name}</p>
                  {dog.breed && <p className="text-xs text-stone-400 truncate">{dog.breed}</p>}
                  {dog.owner && <p className="text-xs text-stone-400 truncate">בעלים: {dog.owner.name}</p>}
                  {dog.currentPrice != null && (
                    <p className="text-xs text-[#16a34a] font-medium">₪{dog.currentPrice} / הליכה</p>
                  )}
                </div>

                {selected.has(dog.id) && <CheckCircle2 className="text-[#16a34a] shrink-0" size={20} />}
              </div>
            ))}

            {/* Start walk button */}
            {(phase === 'idle' || phase === 'starting') && (
              <button
                disabled={selected.size === 0 || phase === 'starting'}
                onClick={startWalk}
                className="w-full py-4 rounded-2xl font-bold text-white bg-[#16a34a] disabled:opacity-40 flex items-center justify-center gap-2 transition-opacity"
              >
                {phase === 'starting' ? (
                  <><Loader2 className="animate-spin" size={18} />מתחיל...</>
                ) : (
                  <><Play size={18} />התחל הליכה</>
                )}
              </button>
            )}

            {/* Active walk card */}
            {isLiveOrEnding && (
              <div className="p-5 bg-[#f0fdf4] border-2 border-[#16a34a] rounded-2xl space-y-4">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#16a34a] animate-ping" />
                  <span className="font-bold text-[#15803d]">הליכה פעילה</span>
                </div>
                <div className="text-5xl font-mono font-black text-stone-800 text-center tabular-nums">
                  {formatTimer(timerSecs)}
                </div>
                <div className="text-sm text-stone-500 text-center">
                  {liveWalks.map(w => w.dog.name).join(', ')}
                </div>
                <button
                  disabled={phase === 'ending'}
                  onClick={endWalk}
                  className="w-full py-4 rounded-2xl font-bold text-white bg-[#d97706] disabled:opacity-40 flex items-center justify-center gap-2 transition-opacity"
                >
                  {phase === 'ending' ? (
                    <><Loader2 className="animate-spin" size={18} />מסיים...</>
                  ) : (
                    <><Square size={18} />סיים הליכה</>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Walk history */}
        {phase !== 'loading' && phase !== 'summary' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-stone-500 mb-3">היסטוריית הליכות</h2>
            {history.length === 0 ? (
              <p className="text-sm text-stone-400 py-4 text-center">עדיין לא הסתיימו הליכות</p>
            ) : (
              <div>
                {history.map(w => (
                  <div key={w.id} className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
                    <span className="text-xs text-stone-400 w-16 shrink-0">{formatDate(w.startedAt)}</span>
                    <span className="text-sm font-medium flex-1 truncate">{w.dog.name}</span>
                    {w.durationMinutes != null && (
                      <span className="text-xs text-stone-400">{w.durationMinutes} דק׳</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
