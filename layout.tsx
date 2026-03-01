import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Deal Pipeline',
  description: 'Real Estate Investment Deal Pipeline',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#0d0f14' }}>
        {children}
      </body>
    </html>
  )
}
