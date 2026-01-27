import { Outlet } from 'react-router-dom'
import Header from './Header'
import Navigation from './Navigation'
import Sidebar from './Sidebar'

export default function Layout() {
  return (
    <div className="min-h-screen bg-background-light dark:bg-background flex">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:ml-64 min-w-0">
        {/* Mobile Header */}
        <div className="lg:hidden">
          <Header />
        </div>

        <main className="flex-1 px-4 py-6 md:px-8 max-w-5xl mx-auto w-full pb-24 lg:pb-8">
          <Outlet />
        </main>

        {/* Mobile Navigation */}
        <Navigation />
      </div>
    </div>
  )
}
