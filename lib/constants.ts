import { OnboardingStep, SectionKey } from '@/types'

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    title: '🎰 Premium Signals Preview',
    body: "You're about to experience our REAL premium signals — the exact same feed our paying members see. This isn't a demo. This is live.",
    emoji: '💎',
    highlight: 'REAL premium signals',
  },
  {
    title: '⏱️ 3-Minute Access',
    body: "As a trial visitor, you'll get 3 minutes inside The Preview Hub. After that, you can:\n\n• Join our 3-Day Trial on Telegram\n• Or join via Whop if you don't use Telegram\n• Ready for more? Go straight to Inner Circle",
    emoji: '🔥',
  },
  {
    title: '📍 How to Navigate',
    body: "Here's the menu — you can explore:\n\n👋 Welcome — Meet Freya\n💰 Money-Glitch — LIVE signals\n⚙️ How It Works — The system\n📊 Live Results — Track record\n⭐ Reviews — Member feedback\n👀 Sneak Peek — Real trades\n❓ FAQ — Common questions",
    emoji: '🗺️',
  },
  {
    title: '💎 Make Every Second Count',
    body: "For the next 3 minutes, you're seeing what clients pay $3k+ for. Every signal. Every update. Every second could change your trading game forever.\n\nAre you ready?",
    emoji: '🚀',
    highlight: 'pay $3k+ for',
  },
]

export const SECTIONS: { id: SectionKey; label: string; icon: string; subtitle: string }[] = [
  { id: 'welcome', label: 'Welcome', icon: '👋', subtitle: 'Start here' },
  { id: 'money-glitch', label: 'Money-Glitch', icon: '💰', subtitle: 'Live signals' },
  { id: 'how-it-works', label: 'How It Works', icon: '⚙️', subtitle: 'System explained' },
  { id: 'live-results', label: 'Live Results', icon: '📊', subtitle: '80% win rate' },
  { id: 'reviews', label: 'Reviews', icon: '⭐', subtitle: 'Member feedback' },
  { id: 'sneak-peek', label: 'Sneak Peek', icon: '👀', subtitle: 'Real trades' },
  { id: 'faq', label: 'FAQ', icon: '❓', subtitle: 'Common questions' },
]

export const EXTERNAL_LINKS = {
  telegram: process.env.NEXT_PUBLIC_TRIAL_TELEGRAM_URL || 'https://t.me/your_preview_hub',
  whop: process.env.NEXT_PUBLIC_TRIAL_WHOP_URL || 'https://whop.com/your-whop-product',
  innerCircle: process.env.NEXT_PUBLIC_INNER_CIRCLE_URL || 'https://your-inner-circle-link',
}

