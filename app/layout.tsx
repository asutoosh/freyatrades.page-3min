import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'The Preview Hub | Freya Trades - Premium Signals Preview',
  description: 'Experience live premium trading signals. 3-minute preview of real signals from Freya Quinn.',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}

