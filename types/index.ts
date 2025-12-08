export type SectionKey =
  | 'welcome'
  | 'money-glitch'
  | 'how-it-works'
  | 'live-results'
  | 'reviews'
  | 'sneak-peek'
  | 'faq'

export type AppState =
  | 'onboarding'
  | 'loading'
  | 'blocked'
  | 'preview_active'
  | 'preview_ended'

export type BlockReason =
  | 'vpn_detected'
  | 'vpn_max_retries'
  | 'restricted_country'
  | 'preview_used'
  | 'error'

export interface PrecheckResponse {
  status: 'ok' | 'blocked'
  reason?: BlockReason
  previewDuration?: number
  timeConsumed?: number
}

export interface Signal {
  id: string
  script: string
  position: 'BUY' | 'SELL'
  entryPrice: string
  tp1: string
  tp2: string
  tp3: string
  tp4: string
  stopLoss: string
  createdAt: string
}

export interface OnboardingStep {
  title: string
  body: string
  emoji?: string
  highlight?: string
}

