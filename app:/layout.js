import './globals.css'

export const metadata = {
  title: 'Mill Valley Flood Monitor',
  description: 'Real-time flood monitoring for San Francisco Bay water levels',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
