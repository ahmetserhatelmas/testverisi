'use client'
import Image from 'next/image'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-[#0a0a0a] px-6">
      <div className="text-center mb-10">
        <Image src="/logo.png" alt="Modus" width={90} height={90} className="mx-auto mb-4 drop-shadow-2xl" />
        <h1 className="text-white font-black text-3xl tracking-tight">MODUS</h1>
        <p className="text-white/30 text-sm mt-1">Hangi modülü kullanmak istiyorsunuz?</p>
      </div>

      <div className="w-full max-w-sm space-y-4">
        <Link href="/dkt" className="block no-underline">
          <div className="btn-tactile rounded-2xl p-5 text-left cursor-pointer" style={{ background: 'rgba(34,197,94,0.08)', border: '2px solid rgba(34,197,94,0.3)' }}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0" style={{ background: 'rgba(34,197,94,0.15)' }}>🧠</div>
              <div>
                <div className="text-white font-bold text-base">Modus DKT</div>
                <div className="text-white/40 text-xs mt-0.5">Seans Operasyonu · HRE / CAB Yönetimi</div>
              </div>
              <span className="text-green-400/50 text-xl ml-auto">›</span>
            </div>
            <div className="flex gap-2 mt-3 flex-wrap">
              {['HRE Takibi', 'CAB 1-4', 'Zamanlayıcılar', 'Kriz Modu'].map(tag => (
                <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full text-green-400/70 bg-green-500/10">{tag}</span>
              ))}
            </div>
          </div>
        </Link>

        <Link href="/abc" className="block no-underline">
          <div className="btn-tactile rounded-2xl p-5 text-left cursor-pointer" style={{ background: 'rgba(168,85,247,0.08)', border: '2px solid rgba(168,85,247,0.3)' }}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0" style={{ background: 'rgba(168,85,247,0.15)' }}>📊</div>
              <div>
                <div className="text-white font-bold text-base">ABC Tracker</div>
                <div className="text-white/40 text-xs mt-0.5">Karar Destek · Davranış Analizi</div>
              </div>
              <span className="text-purple-400/50 text-xl ml-auto">›</span>
            </div>
            <div className="flex gap-2 mt-3 flex-wrap">
              {['3-Tık Kayıt', 'SBT/FCT Rotası', 'Örüntü Analizi', 'Müdahale Verimliliği'].map(tag => (
                <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full text-purple-400/70 bg-purple-500/10">{tag}</span>
              ))}
            </div>
          </div>
        </Link>

        <Link href="/admin" className="block no-underline">
          <div className="btn-tactile rounded-2xl p-4 flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <span className="text-lg">🗂️</span>
            <span className="text-white/50 text-sm font-medium">Admin Paneli</span>
            <span className="text-white/20 ml-auto">›</span>
          </div>
        </Link>
      </div>
    </div>
  )
}
