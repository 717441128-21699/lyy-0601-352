import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store'
import { RoomStatusBadge, LeaseStatusBadge, BillStatusBadge, WorkOrderStatusBadge } from '@/components/StatusBadge'
import { Building2, DoorOpen, AlertTriangle, Settings, Home, Search, Wallet, FileText, Wrench, AlertCircle, CheckCircle2, Clock, ArrowUpRight, XCircle } from 'lucide-react'
import { ROOM_STATUS_LABELS, BILL_TYPE_LABELS, WORK_ORDER_URGENCY_LABELS } from '@/types'
import type { RoomStatus, Lease } from '@/types'
import { cn } from '@/lib/utils'
import Modal from '@/components/Modal'

const STAT_CARDS = [
  { key: 'vacant' as RoomStatus, label: '空置', icon: DoorOpen, color: 'bg-blue-100 text-blue-600' },
  { key: 'expiring' as RoomStatus, label: '即将到期', icon: AlertTriangle, color: 'bg-amber-100 text-amber-600' },
  { key: 'arrears' as RoomStatus, label: '欠费', icon: Building2, color: 'bg-red-100 text-red-600' },
  { key: 'configuring' as RoomStatus, label: '配置中', icon: Settings, color: 'bg-purple-100 text-purple-600' },
] as const

export default function Dashboard() {
  const navigate = useNavigate()
  const { rooms, buildings, filteredRooms, getLeaseByRoomId, getLeasesByRoomId, getBillsByRoomId, getWorkOrdersByRoomId, getBuildingById, getRoomById } = useStore()
  const [buildingId, setBuildingId] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<RoomStatus | ''>('')
  const [search, setSearch] = useState('')
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'leases' | 'bills' | 'workorders'>('leases')

  useEffect(() => {
    if (selectedRoomId) {
      setActiveTab('leases')
    }
  }, [selectedRoomId])

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

  const room = selectedRoomId ? getRoomById(selectedRoomId) : null
  const leases = selectedRoomId ? getLeasesByRoomId(selectedRoomId) : []
  const bills = selectedRoomId ? getBillsByRoomId(selectedRoomId) : []
  const workOrders = selectedRoomId ? getWorkOrdersByRoomId(selectedRoomId) : []
  const building = room ? getBuildingById(room.buildingId) : null

  const sortedBills = [...bills].sort((a, b) => b.periodStart.localeCompare(a.periodStart))
  const sortedWorkOrders = [...workOrders].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const operationProfile = useMemo(() => {
    if (!selectedRoomId) return null

    const unpaidBills = bills.filter((b) => b.status === 'unpaid' || b.status === 'partial')
    const pendingWorkOrders = workOrders.filter((w) => w.status === 'pending' || w.status === 'assigned')
    const activeLease = leases.find((l) => l.status !== 'terminated')
    const terminatedLeases = leases.filter((l) => l.status === 'terminated' && l.termination)
    const latestTermination = terminatedLeases.sort((a, b) =>
      (b.termination!.date).localeCompare(a.termination!.date)
    )[0] as (Lease & { termination: NonNullable<Lease['termination']> }) | undefined

    const riskTags: { label: string; color: string }[] = []

    if (unpaidBills.length > 0) {
      riskTags.push({ label: '欠费风险', color: 'bg-red-50 text-red-700 border border-red-200' })
    }
    if (pendingWorkOrders.length > 0) {
      riskTags.push({ label: '维修中', color: 'bg-amber-50 text-amber-700 border border-amber-200' })
    }
    if (activeLease?.status === 'expiring') {
      riskTags.push({ label: '即将到期', color: 'bg-amber-50 text-amber-700 border border-amber-200' })
    }
    if (activeLease?.status === 'terminated') {
      riskTags.push({ label: '已退租', color: 'bg-gray-50 text-gray-700 border border-gray-200' })
    }
    if (riskTags.length === 0) {
      riskTags.push({ label: '状态正常', color: 'bg-green-50 text-green-700 border border-green-200' })
    }

    const todos: { label: string; icon: typeof Wallet; path: string }[] = []

    if (unpaidBills.length > 0) {
      todos.push({
        label: `${unpaidBills.length} 条待缴账单`,
        icon: Wallet,
        path: '/finance',
      })
    }
    const pendingOnly = workOrders.filter((w) => w.status === 'pending')
    if (pendingOnly.length > 0) {
      todos.push({
        label: `${pendingOnly.length} 条待分派工单`,
        icon: Wrench,
        path: '/maintenance',
      })
    }
    if (activeLease?.status === 'expiring') {
      todos.push({
        label: '1 份租约即将到期',
        icon: FileText,
        path: '/leases',
      })
    }

    return {
      riskTags,
      todos,
      latestTermination,
    }
  }, [selectedRoomId, bills, workOrders, leases])

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
                    <tr
                      key={room.id}
                      className="table-row border-b last:border-0 cursor-pointer hover:bg-slate-50"
                      onClick={() => setSelectedRoomId(room.id)}
                    >
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

      <Modal
        open={selectedRoomId !== null}
        onClose={() => setSelectedRoomId(null)}
        title="房间详情"
        width="max-w-3xl"
      >
        {room && operationProfile && (
          <div className="space-y-6">
            <div className="page-card rounded-xl border p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">房间号</p>
                  <p className="font-semibold text-slate-800">{room.roomNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">楼栋</p>
                  <p className="font-medium text-slate-800">{building?.name ?? '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">楼层</p>
                  <p className="font-medium text-slate-800">{room.floor}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">面积(m²)</p>
                  <p className="font-medium text-slate-800">{room.area}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">月租(元)</p>
                  <p className="font-medium text-slate-800">{room.monthlyRent.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">状态</p>
                  <RoomStatusBadge status={room.status} />
                </div>
              </div>
            </div>

            <div className="page-card rounded-xl border p-4 space-y-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-slate-600" />
                <h3 className="font-semibold text-slate-800 text-sm">运营档案</h3>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-2">风险标签</p>
                  <div className="flex flex-wrap gap-2">
                    {operationProfile.riskTags.map((tag, i) => (
                      <span
                        key={i}
                        className={cn(
                          'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium',
                          tag.color
                        )}
                      >
                        {tag.label === '状态正常' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                        {tag.label === '欠费风险' && <XCircle className="w-3 h-3 mr-1" />}
                        {(tag.label === '维修中' || tag.label === '即将到期') && <Clock className="w-3 h-3 mr-1" />}
                        {tag.label}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-2">当前待办</p>
                  {operationProfile.todos.length === 0 ? (
                    <p className="text-sm text-slate-500">暂无待办事项</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {operationProfile.todos.map((todo, i) => {
                        const Icon = todo.icon
                        return (
                          <button
                            key={i}
                            onClick={() => navigate(todo.path)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                          >
                            <Icon className="w-3.5 h-3.5" />
                            {todo.label}
                            <ArrowUpRight className="w-3 h-3 text-slate-400" />
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-2">最近一次退租结算</p>
                  {operationProfile.latestTermination ? (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">退租日期</p>
                          <p className="font-medium text-slate-700">{operationProfile.latestTermination.termination.date}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">租户</p>
                          <p className="font-medium text-slate-700">{operationProfile.latestTermination.tenantName}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">退还押金</p>
                          <p className="font-medium text-green-600">{operationProfile.latestTermination.termination.refundAmount.toLocaleString()} 元</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">扣款</p>
                          <p className="font-medium text-red-600">{operationProfile.latestTermination.termination.deductions.toLocaleString()} 元</p>
                        </div>
                      </div>
                      {operationProfile.latestTermination.termination.remark && (
                        <div className="pt-1 border-t border-slate-200">
                          <p className="text-xs text-muted-foreground">结算备注</p>
                          <p className="text-sm text-slate-700">{operationProfile.latestTermination.termination.remark}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">暂无退租记录</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 border-b border-slate-200">
              <button
                onClick={() => setActiveTab('leases')}
                className={cn(
                  'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
                  activeTab === 'leases'
                    ? 'text-primary border-primary'
                    : 'text-muted-foreground border-transparent hover:text-slate-700'
                )}
              >
                租约记录
              </button>
              <button
                onClick={() => setActiveTab('bills')}
                className={cn(
                  'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
                  activeTab === 'bills'
                    ? 'text-primary border-primary'
                    : 'text-muted-foreground border-transparent hover:text-slate-700'
                )}
              >
                账单记录
              </button>
              <button
                onClick={() => setActiveTab('workorders')}
                className={cn(
                  'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
                  activeTab === 'workorders'
                    ? 'text-primary border-primary'
                    : 'text-muted-foreground border-transparent hover:text-slate-700'
                )}
              >
                维修记录
              </button>
            </div>

            {activeTab === 'leases' && (
              <div className="overflow-x-auto">
                {leases.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    暂无租约记录
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="table-header text-left py-3 px-4">租户</th>
                        <th className="table-header text-left py-3 px-4">开始日期</th>
                        <th className="table-header text-left py-3 px-4">结束日期</th>
                        <th className="table-header text-left py-3 px-4">月租</th>
                        <th className="table-header text-left py-3 px-4">押金</th>
                        <th className="table-header text-left py-3 px-4">状态</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leases.map((lease) => (
                        <tr key={lease.id} className="table-row border-b last:border-0">
                          <td className="table-cell py-3 px-4">{lease.tenantName}</td>
                          <td className="table-cell py-3 px-4">{lease.startDate}</td>
                          <td className="table-cell py-3 px-4">{lease.endDate}</td>
                          <td className="table-cell py-3 px-4">{lease.monthlyRent.toLocaleString()}</td>
                          <td className="table-cell py-3 px-4">{lease.deposit.toLocaleString()}</td>
                          <td className="table-cell py-3 px-4"><LeaseStatusBadge status={lease.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {activeTab === 'bills' && (
              <div className="overflow-x-auto">
                {sortedBills.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    暂无账单记录
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="table-header text-left py-3 px-4">类型</th>
                        <th className="table-header text-left py-3 px-4">周期</th>
                        <th className="table-header text-left py-3 px-4">金额</th>
                        <th className="table-header text-left py-3 px-4">已缴</th>
                        <th className="table-header text-left py-3 px-4">减免</th>
                        <th className="table-header text-left py-3 px-4">状态</th>
                        <th className="table-header text-left py-3 px-4">到期日</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedBills.map((bill) => (
                        <tr key={bill.id} className="table-row border-b last:border-0">
                          <td className="table-cell py-3 px-4">{BILL_TYPE_LABELS[bill.type]}</td>
                          <td className="table-cell py-3 px-4">{bill.periodStart} ~ {bill.periodEnd}</td>
                          <td className="table-cell py-3 px-4">{bill.amount.toLocaleString()}</td>
                          <td className="table-cell py-3 px-4">{bill.paidAmount.toLocaleString()}</td>
                          <td className="table-cell py-3 px-4">{bill.reducedAmount.toLocaleString()}</td>
                          <td className="table-cell py-3 px-4"><BillStatusBadge status={bill.status} /></td>
                          <td className="table-cell py-3 px-4">{bill.dueDate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {activeTab === 'workorders' && (
              <div className="overflow-x-auto">
                {sortedWorkOrders.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    暂无维修记录
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="table-header text-left py-3 px-4">分类</th>
                        <th className="table-header text-left py-3 px-4">描述</th>
                        <th className="table-header text-left py-3 px-4">紧急程度</th>
                        <th className="table-header text-left py-3 px-4">状态</th>
                        <th className="table-header text-left py-3 px-4">创建日期</th>
                        <th className="table-header text-left py-3 px-4">完成日期</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedWorkOrders.map((order) => (
                        <tr key={order.id} className="table-row border-b last:border-0">
                          <td className="table-cell py-3 px-4">{order.category}</td>
                          <td className="table-cell py-3 px-4 max-w-[200px] truncate" title={order.description}>{order.description}</td>
                          <td className="table-cell py-3 px-4">{WORK_ORDER_URGENCY_LABELS[order.urgency]}</td>
                          <td className="table-cell py-3 px-4"><WorkOrderStatusBadge status={order.status} /></td>
                          <td className="table-cell py-3 px-4">{order.createdAt}</td>
                          <td className="table-cell py-3 px-4">{order.completedAt ?? '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
