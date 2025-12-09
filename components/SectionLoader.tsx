'use client'

import { motion } from 'framer-motion'

export default function SectionLoader() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-4 p-4"
    >
      {[1, 2].map(i => (
        <div key={i} className="message-card animate-pulse">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-zinc-800" />
            <div className="space-y-2">
              <div className="h-4 w-24 bg-zinc-800 rounded" />
              <div className="h-3 w-16 bg-zinc-800 rounded" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-full bg-zinc-800 rounded" />
            <div className="h-4 w-3/4 bg-zinc-800 rounded" />
            <div className="h-4 w-1/2 bg-zinc-800 rounded" />
          </div>
        </div>
      ))}
    </motion.div>
  )
}
