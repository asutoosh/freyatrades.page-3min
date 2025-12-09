'use client'

import { motion } from 'framer-motion'
import { SectionKey } from '@/types'
import { SECTIONS, EXTERNAL_LINKS } from '@/lib/constants'

interface SidebarProps {
  active: SectionKey
  onChange: (section: SectionKey) => void
  memberCount?: number
}

export default function Sidebar({ active, onChange, memberCount = 158 }: SidebarProps) {
  return (
    <aside className="hidden md:flex w-72 flex-col bg-[#0a0a0b] border-r border-white/5">
      {/* Header */}
      <div className="p-5 border-b border-white/5">
        <h1 className="text-lg font-bold text-white">The Preview Hub</h1>
        <p className="text-sm text-zinc-500">{memberCount} members</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => {
              console.log('[Sidebar] Clicked:', section.id)
              onChange(section.id)
            }}
            className={`
              w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all cursor-pointer select-none
              ${active === section.id 
                ? 'bg-zinc-800/80 text-white' 
                : 'text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200 hover:translate-x-1'
              }
            `}
          >
            <span className="text-xl">{section.icon}</span>
            <div className="flex-1 min-w-0">
              <div className={`font-medium ${active === section.id ? 'text-white' : ''}`}>
                {section.label}
              </div>
              <div className="text-xs text-zinc-500 truncate">{section.subtitle}</div>
            </div>
            {section.id === 'money-glitch' && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* CTA Button */}
      <div className="p-4 border-t border-white/5">
        <motion.a
          href={EXTERNAL_LINKS.telegram}
          target="_blank"
          rel="noopener noreferrer"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-bold shadow-lg shadow-yellow-500/20 hover:shadow-yellow-500/40 transition-shadow"
        >
          <span>📅</span>
          Join 3-Day Trial
        </motion.a>
        <p className="text-center text-xs text-zinc-600 mt-2">
          Free access • No credit card
        </p>
      </div>
    </aside>
  )
}

