import { Outlet } from 'react-router-dom'
import Header from './Header'
import Navigation from './Navigation'

export default function Layout() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <Header />

      {/* Main content */}
      <main className="flex-1 pb-20 px-4 pt-4">
        <div className="max-w-lg mx-auto">
          <Outlet />
        </div>
      </main>

      {/* Bottom navigation */}
      <Navigation />
    </div>
  )
}
