import { Outlet } from 'react-router-dom'
import Header from './Header'
import Navigation from './Navigation'
import QuickActions from '../common/QuickActions'

export default function Layout() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <Header />

      {/* Main content */}
      <main className="flex-1 pb-28 px-4 pt-4">
        <div className="max-w-lg mx-auto">
          <Outlet />
        </div>
      </main>

      {/* Quick Actions FAB */}
      <QuickActions />

      {/* Bottom navigation */}
      <Navigation />
    </div>
  )
}
