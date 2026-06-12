import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': '房源看板',
  '/leases': '租约管理',
  '/finance': '费用中心',
  '/maintenance': '维修工单',
  '/reports': '报表中心',
}

export default function Layout() {
  const location = useLocation()
  const basePath = '/' + location.pathname.split('/')[1]
  const pageTitle = PAGE_TITLES[basePath] || '寓管通'

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <div className="ml-60 min-h-screen">
        <header className="sticky top-0 z-40 h-14 bg-white/80 backdrop-blur-sm border-b border-slate-100 flex items-center px-6">
          <h2 className="text-sm font-semibold text-slate-800">{pageTitle}</h2>
          <div className="ml-auto flex items-center gap-2 text-xs text-slate-400">
            <span>2026年6月12日</span>
          </div>
        </header>
        <main className="p-6 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
