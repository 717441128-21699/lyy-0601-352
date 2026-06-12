import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, FileText, Wallet, Wrench, BarChart3, Building2 } from 'lucide-react'

const navItems = [
  { path: '/dashboard', label: '房源看板', icon: LayoutDashboard },
  { path: '/leases', label: '租约管理', icon: FileText },
  { path: '/finance', label: '费用中心', icon: Wallet },
  { path: '/maintenance', label: '维修工单', icon: Wrench },
  { path: '/reports', label: '报表中心', icon: BarChart3 },
]

export default function Sidebar() {
  const location = useLocation()

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-60 bg-slate-900 flex flex-col z-50">
      <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-700/50">
        <div className="w-9 h-9 rounded-lg bg-brand-500 flex items-center justify-center">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-white font-bold text-sm leading-tight">寓管通</h1>
          <p className="text-slate-400 text-[10px]">长租公寓运营平台</p>
        </div>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/')
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-brand-500/15 text-brand-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <item.icon className={`w-[18px] h-[18px] ${isActive ? 'text-brand-400' : ''}`} />
              {item.label}
            </NavLink>
          )
        })}
      </nav>

      <div className="p-3 border-t border-slate-700/50">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold">
            王
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white font-medium truncate">王建国</p>
            <p className="text-[10px] text-slate-400">店长</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
