import { useState, useMemo } from 'react'
import { useStore } from '@/store'
import { RoomStatusBadge } from '@/components/StatusBadge'
import { Building2, DoorOpen, AlertTriangle, Settings, Home, Search } from 'lucide-react'
import { ROOM_STATUS_LABELS } from '@/types'
import type { RoomStatus } from '@/types'
import { cn } from '@/lib/utils'

const STAT_CARDS = [
  { key: 'vacant' as RoomStatus, label: '空置', icon: DoorOpen, color: 'bg-blue-100 text-blue-600' },
  { key: 'expiring' as RoomStatus, label: '即将到期', icon: AlertTriangle, color: 'bg-amber-100 text-amber-600' },
  { key: 'arrears' as RoomStatus, label: '欠费', icon: Building2, color: 'bg-red-100 text-red-600' },
  { key: 'configuring' as RoomStatus, label: '配置中', icon: Settings, color: 'bg-purple-100 text-purple-600' },
] as const

export default function Dashboard() {
  const { rooms, buildings, filteredRooms, getLeaseByRoomId } = useStore()
  const [buildingId, setBuildingId] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<RoomStatus | ''>('')
  const [search, setSearch] = useState('')

  const activeFilter = statusFilter || undefined
  const displayRooms = useMemo(
    () => filteredRooms({ buildingId: buildingId || undefined, status: activeFilter }).filter((r) => {
      if (!search) return true
      return r.roomNumber.includes(search)
    }),
    [filteredRooms, buildingId, activeFilter, search]
  )

  const stats = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const card of STAT_CARDS) {
      counts[card.key] = rooms.filter((r) => r.status === card.key).length
    }
    return counts
  }, [rooms])

  const handleStatClick = (status: RoomStatus) => {
    setStatusFilter((prev) => (prev === status ? '' : status))
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map((card) => {
          const Icon = card.icon
          const isActive = statusFilter === card.key
          return (
            <button
              key={card.key}
              onClick={() => handleStatClick(card.key)}
              className={cn(
                'stat-card flex items-center gap-4 p-5 rounded-xl border transition-all w-full text-left',
                isActive ? 'ring-2 ring-primary/50 border-primary/30' : 'border-border'
              )}
            >
              <div className={cn('flex items-center justify-center w-11 h-11 rounded-full', card.color)}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-2xl font-bold">{stats[card.key]}</p>
                <p className="text-sm text-muted-foreground">{card.label}</p>
              </div>
              <svg
                className={cn('w-4 h-4', stats[card.key] > 0 ? 'text-muted-foreground/50' : 'text-transparent')}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
              </svg>
            </button>
          )
        })}
      </div>

      <div className="page-card rounded-xl border p-4">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="搜索房间号..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9"
            />
          </div>
          <select
            value={buildingId}
            onChange={(e) => setBuildingId(e.target.value)}
            className="select-field"
          >
            <option value="">全部楼栋</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter((e.target.value as RoomStatus) || '')}
            className="select-field"
          >
            <option value="">全部状态</option>
            {Object.entries(ROOM_STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="table-header text-left py-3 px-4">房间号</th>
                <th className="table-header text-left py-3 px-4">楼栋</th>
                <th className="table-header text-left py-3 px-4">楼层</th>
                <th className="table-header text-left py-3 px-4">面积(m²)</th>
                <th className="table-header text-left py-3 px-4">月租(元)</th>
                <th className="table-header text-left py-3 px-4">状态</th>
                <th className="table-header text-left py-3 px-4">租户</th>
                <th className="table-header text-left py-3 px-4">租约到期</th>
              </tr>
            </thead>
            <tbody>
              {displayRooms.length === 0 ? (
                <tr>
                  <td colSpan={8} className="table-cell text-center py-12 text-muted-foreground">
                    <Home className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    暂无匹配房源
                  </td>
                </tr>
              ) : (
                displayRooms.map((room) => {
                  const lease = getLeaseByRoomId(room.id)
                  const building = buildings.find((b) => b.id === room.buildingId)
                  return (
                    <tr key={room.id} className="table-row border-b last:border-0">
                      <td className="table-cell py-3 px-4 font-medium">{room.roomNumber}</td>
                      <td className="table-cell py-3 px-4">{building?.name ?? '-'}</td>
                      <td className="table-cell py-3 px-4">{room.floor}</td>
                      <td className="table-cell py-3 px-4">{room.area}</td>
                      <td className="table-cell py-3 px-4">{room.monthlyRent.toLocaleString()}</td>
                      <td className="table-cell py-3 px-4"><RoomStatusBadge status={room.status} /></td>
                      <td className="table-cell py-3 px-4">{lease?.tenantName ?? '-'}</td>
                      <td className="table-cell py-3 px-4">{lease?.endDate ?? '-'}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
