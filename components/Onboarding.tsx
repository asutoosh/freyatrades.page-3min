'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { ONBOARDING_STEPS } from '@/lib/constants'

interface OnboardingProps {
  step: number
  onNext: () => void
  onComplete: () => void
}

export default function Onboarding({ step, onNext, onComplete }: OnboardingProps) {
  const currentStep = ONBOARDING_STEPS[step]
  const isLastStep = step === ONBOARDING_STEPS.length - 1

  return (
    <motion.div
      key="onboarding"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm px-4"
    >
        {/* Background pattern */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl" />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
          key={step}
          initial={{ scale: 0.9, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: -20, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative max-w-lg w-full"
        >
          {/* Card */}
          <div className="bg-gradient-to-b from-[#141418] to-[#0f0f12] rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
            {/* Top glow line */}
            <div className="h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent" />
            
            <div className="p-8">
              {/* Step indicator */}
              <div className="flex items-center justify-center gap-2 mb-6">
                {ONBOARDING_STEPS.map((_, idx) => (
                  <motion.div
                    key={idx}
                    initial={false}
                    animate={{
                      width: idx === step ? 32 : 8,
                      backgroundColor: idx <= step ? '#fcd535' : '#2a2a30',
                    }}
                    className="h-2 rounded-full"
                    transition={{ duration: 0.3 }}
                  />
                ))}
              </div>

              {/* Emoji */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="text-6xl text-center mb-6"
              >
                {currentStep.emoji}
              </motion.div>

              {/* Title */}
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-2xl font-bold text-center mb-4 text-white"
              >
                {currentStep.title}
              </motion.h2>

              {/* Body */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-zinc-300 text-center whitespace-pre-line leading-relaxed mb-8"
              >
                {currentStep.highlight ? (
                  <>
                    {currentStep.body.split(currentStep.highlight)[0]}
                    <span className="text-yellow-400 font-semibold">{currentStep.highlight}</span>
                    {currentStep.body.split(currentStep.highlight)[1]}
                  </>
                ) : (
                  currentStep.body
                )}
              </motion.div>

              {/* Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={isLastStep ? onComplete : onNext}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-bold text-lg shadow-lg shadow-yellow-500/20 hover:shadow-yellow-500/40 transition-shadow"
              >
                {isLastStep ? '🚀 Start My Preview' : 'Next →'}
              </motion.button>
            </div>
          </div>

          {/* Step count */}
          <div className="text-center mt-4 text-zinc-500 text-sm">
            Step {step + 1} of {ONBOARDING_STEPS.length}
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}

