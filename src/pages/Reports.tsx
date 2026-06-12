import { useState, useMemo } from 'react'
import { useStore } from '@/store'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Clock, AlertCircle, CheckCircle, Home, Wrench,
  Wallet, FileWarning, Download, ChevronDown, ChevronRight,
} from 'lucide-react'
import { BILL_TYPE_LABELS, WORK_ORDER_URGENCY_LABELS } from '@/types'
import { cn } from '@/lib/utils'

function getMonthLabels() {
  const months = []
  const now = new Date(2026, 5, 12)
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: `${d.getFullYear()}年${d.getMonth() + 1}月`,
    })
  }
  return months
}

function getMonthRange(monthStr: string) {
  const [year, month] = monthStr.split('-').map(Number)
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0)
  return { start, end }
}

function isOccupiedInMonth(lease: { startDate: string; endDate: string; status: string }, monthStr: string) {
  const { start: monthStart, end: monthEnd } = getMonthRange(monthStr)
  const leaseStart = new Date(lease.startDate)
  const leaseEnd = new Date(lease.endDate)
  if (leaseStart > monthEnd) return false
  if (lease.status !== 'terminated' && leaseEnd >= monthStart) return true
  if (lease.status === 'terminated') return false
  return leaseEnd >= monthStart
}

export default function Reports() {
  const months = useMemo(() => getMonthLabels(), [])
  const [buildingId, setBuildingId] = useState('')
  const [roomId, setRoomId] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(months[months.length - 1].value)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  const {
    rooms, buildings, leases,
    getRoomById, getBuildingById,
    filteredRooms, filteredBills, filteredWorkOrders, filteredLeases,
  } = useStore()

  const roomsForSelector = useMemo(() => {
    const filtered = buildingId ? rooms.filter((r) => r.buildingId === buildingId) : rooms
    return filtered.map((r) => {
      const building = getBuildingById(r.buildingId)
      return {
        ...r,
        label: `${building?.name || '未知楼栋'} - ${r.roomNumber}`,
      }
    }).sort((a, b) => a.label.localeCompare(b.label))
  }, [rooms, buildingId, getBuildingById])

  const currentFilteredRooms = useMemo(() => {
    let result = filteredRooms({ roomId: roomId || undefined })
    if (buildingId && !roomId) {
      result = result.filter((r) => r.buildingId === buildingId)
    }
    return result
  }, [filteredRooms, roomId, buildingId])

  const currentFilteredLeases = useMemo(() => {
    return leases.filter((lease) => {
      if (roomId && lease.roomId !== roomId) return false
      if (buildingId) {
        const room = getRoomById(lease.roomId)
        if (room?.buildingId !== buildingId) return false
      }
      return true
    })
  }, [leases, roomId, buildingId, getRoomById])

  const occupancyRate = useMemo(() => {
    const total = currentFilteredRooms.length
    if (total === 0) return 0
    const occupiedRoomIds = new Set(
      currentFilteredLeases
        .filter((lease) => isOccupiedInMonth(lease, selectedMonth))
        .map((lease) => lease.roomId)
    )
    const occupied = currentFilteredRooms.filter((r) => occupiedRoomIds.has(r.id)).length
    return Math.round((occupied / total) * 100)
  }, [currentFilteredRooms, currentFilteredLeases, selectedMonth])

  const vacantCount = useMemo(() => {
    const total = currentFilteredRooms.length
    const occupiedRoomIds = new Set(
      currentFilteredLeases
        .filter((lease) => isOccupiedInMonth(lease, selectedMonth))
        .map((lease) => lease.roomId)
    )
    return total - currentFilteredRooms.filter((r) => occupiedRoomIds.has(r.id)).length
  }, [currentFilteredRooms, currentFilteredLeases, selectedMonth])

  const collectionRate = useMemo(() => {
    const bills = filteredBills({
      month: selectedMonth,
      roomId: roomId || undefined,
      buildingId: buildingId || undefined,
    })
    const total = bills.reduce((s, b) => s + b.amount, 0)
    if (total === 0) return 0
    const paid = bills.reduce((s, b) => s + b.paidAmount, 0)
    return Math.round((paid / total) * 100)
  }, [filteredBills, selectedMonth, roomId, buildingId])

  const collectionStats = useMemo(() => {
    const bills = filteredBills({
      month: selectedMonth,
      roomId: roomId || undefined,
      buildingId: buildingId || undefined,
    })
    const totalReceivable = bills.reduce((s, b) => s + b.amount, 0)
    const received = bills.reduce((s, b) => s + b.paidAmount, 0)
    const unpaid = totalReceivable - received
    return { totalReceivable, received, unpaid }
  }, [filteredBills, selectedMonth, roomId, buildingId])

  const avgMaintenanceHours = useMemo(() => {
    const workOrders = filteredWorkOrders({
      month: selectedMonth,
      roomId: roomId || undefined,
      buildingId: buildingId || undefined,
    })
    const completed = workOrders.filter(
      (w) => w.status === 'completed' || w.status === 'reviewed',
    )
    if (completed.length === 0) return 0
    const totalMinutes = completed.reduce((s, w) => s + (w.actualMinutes || 0), 0)
    return Math.round((totalMinutes / completed.length / 60) * 10) / 10
  }, [filteredWorkOrders, selectedMonth, roomId, buildingId])

  const maintenanceStats = useMemo(() => {
    const workOrders = filteredWorkOrders({
      month: selectedMonth,
      roomId: roomId || undefined,
      buildingId: buildingId || undefined,
    })
    const total = workOrders.length
    const pending = workOrders.filter((w) => w.status === 'pending').length
    const completed = workOrders.filter(
      (w) => w.status === 'completed' || w.status === 'reviewed',
    ).length
    let hours = 0
    if (completed > 0) {
      const totalMinutes = workOrders
        .filter((w) => w.status === 'completed' || w.status === 'reviewed')
        .reduce((s, w) => s + (w.actualMinutes || 0), 0)
      hours = Math.round((totalMinutes / completed / 60) * 10) / 10
    }
    return { total, pending, completed, hours }
  }, [filteredWorkOrders, selectedMonth, roomId, buildingId])

  const expiringLeases = useMemo(() => {
    const leasesList = filteredLeases({
      roomId: roomId || undefined,
      buildingId: buildingId || undefined,
      status: 'expiring',
    })
    return leasesList.filter((lease) => {
      if (selectedMonth && !lease.endDate.startsWith(selectedMonth)) return false
      return true
    })
  }, [filteredLeases, roomId, buildingId, selectedMonth])

  const unpaidBills = useMemo(() => {
    const bills = filteredBills({
      month: selectedMonth,
      roomId: roomId || undefined,
      buildingId: buildingId || undefined,
    })
    return bills.filter((b) => b.status === 'unpaid' || b.status === 'partial')
  }, [filteredBills, selectedMonth, roomId, buildingId])

  const unpaidBillsTotal = useMemo(() => {
    return unpaidBills.reduce((s, b) => s + (b.amount - b.paidAmount), 0)
  }, [unpaidBills])

  const pendingWorkOrders = useMemo(() => {
    const workOrders = filteredWorkOrders({
      month: selectedMonth,
      roomId: roomId || undefined,
      buildingId: buildingId || undefined,
    })
    return workOrders.filter((w) => w.status === 'pending')
  }, [filteredWorkOrders, selectedMonth, roomId, buildingId])

  const pendingTodoCount = expiringLeases.length + unpaidBills.length + pendingWorkOrders.length

  function escapeCSV(value: string | number): string {
    const str = String(value)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const occupancyTrend = useMemo(() => {
    return months.map((m) => {
      let monthRooms = filteredRooms({ roomId: roomId || undefined })
      if (buildingId && !roomId) {
        monthRooms = monthRooms.filter((r) => r.buildingId === buildingId)
      }
      const monthLeases = leases.filter((lease) => {
        if (roomId && lease.roomId !== roomId) return false
        if (buildingId) {
          const room = getRoomById(lease.roomId)
          if (room?.buildingId !== buildingId) return false
        }
        return true
      })
      const total = monthRooms.length
      if (total === 0) {
        return { month: m.label.slice(5), rate: 0 }
      }
      const occupiedRoomIds = new Set(
        monthLeases
          .filter((lease) => isOccupiedInMonth(lease, m.value))
          .map((lease) => lease.roomId)
      )
      const occupiedCount = monthRooms.filter((r) => occupiedRoomIds.has(r.id)).length
      const rate = Math.round((occupiedCount / total) * 100)
      return {
        month: m.label.slice(5),
        rate: Math.min(100, Math.max(0, rate)),
      }
    })
  }, [months, filteredRooms, leases, roomId, buildingId, getRoomById])

  const collectionByType = useMemo(() => {
    const bills = filteredBills({
      month: selectedMonth,
      roomId: roomId || undefined,
      buildingId: buildingId || undefined,
    })
    const types = ['rent', 'water', 'electricity', 'property', 'other'] as const
    return types.map((type) => {
      const typeBills = bills.filter((b) => b.type === type)
      const total = typeBills.reduce((s, b) => s + b.amount, 0)
      const paid = typeBills.reduce((s, b) => s + b.paidAmount, 0)
      return {
        type: BILL_TYPE_LABELS[type],
        rate: total > 0 ? Math.round((paid / total) * 100) : 0,
      }
    })
  }, [filteredBills, selectedMonth, roomId, buildingId])

  const maintenanceByMonth = useMemo(() => {
    return months.map((m) => {
      const workOrders = filteredWorkOrders({
        month: m.value,
        roomId: roomId || undefined,
        buildingId: buildingId || undefined,
      })
      const completed = workOrders.filter(
        (w) => w.status === 'completed' || w.status === 'reviewed',
      )
      let hours = 0
      if (completed.length > 0) {
        const totalMinutes = completed.reduce((s, w) => s + (w.actualMinutes || 0), 0)
        hours = Math.round((totalMinutes / completed.length / 60) * 10) / 10
      }
      return {
        month: m.label.slice(5),
        hours,
      }
    })
  }, [months, filteredWorkOrders, roomId, buildingId])

  function handleExportCSV() {
    const rows: string[] = []
    const BOM = '\uFEFF'

    rows.push('当前筛选条件')
    const buildingName = buildingId ? getBuildingById(buildingId)?.name || '未知' : '全部'
    const roomName = roomId ? (() => {
      const room = getRoomById(roomId)
      const b = room ? getBuildingById(room.buildingId) : undefined
      return `${b?.name || '未知'} ${room?.roomNumber || '未知'}`
    })() : '全部'
    const monthLabel = months.find(m => m.value === selectedMonth)?.label || selectedMonth
    rows.push(`楼栋,${escapeCSV(buildingName)}`)
    rows.push(`房间,${escapeCSV(roomName)}`)
    rows.push(`月份,${escapeCSV(monthLabel)}`)
    rows.push('')

    rows.push('核心指标')
    rows.push(`入住率,${occupancyRate}%`)
    rows.push(`收缴率,${collectionRate}%`)
    rows.push(`平均维修耗时,${avgMaintenanceHours}h`)
    rows.push(`待办事项数,${pendingTodoCount}`)
    rows.push('')

    rows.push('入住率趋势')
    rows.push('月份,入住率%')
    occupancyTrend.forEach((item) => {
      rows.push([
        escapeCSV(item.month),
        escapeCSV(`${item.rate}%`),
      ].join(','))
    })
    rows.push('')

    rows.push('收缴率（按费种）')
    rows.push('费种,收缴率%')
    collectionByType.forEach((item) => {
      rows.push([
        escapeCSV(item.type),
        escapeCSV(`${item.rate}%`),
      ].join(','))
    })
    rows.push('')

    rows.push('维修绩效（月均耗时）')
    rows.push('月份,平均耗时h')
    maintenanceByMonth.forEach((item) => {
      rows.push([
        escapeCSV(item.month),
        escapeCSV(`${item.hours}h`),
      ].join(','))
    })
    rows.push('')

    rows.push('即将到期租约')
    rows.push('房间,楼栋,租户,到期日期,月租')
    expiringLeases.forEach((lease) => {
      const room = getRoomById(lease.roomId)
      const building = room ? getBuildingById(room.buildingId) : undefined
      rows.push([
        escapeCSV(room?.roomNumber || ''),
        escapeCSV(building?.name || ''),
        escapeCSV(lease.tenantName),
        escapeCSV(lease.endDate),
        escapeCSV(lease.monthlyRent),
      ].join(','))
    })
    rows.push('')

    rows.push('欠费账单')
    rows.push('房间,楼栋,类型,金额,待缴,到期日')
    unpaidBills.forEach((bill) => {
      const room = getRoomById(bill.roomId)
      const building = room ? getBuildingById(room.buildingId) : undefined
      rows.push([
        escapeCSV(room?.roomNumber || ''),
        escapeCSV(building?.name || ''),
        escapeCSV(BILL_TYPE_LABELS[bill.type]),
        escapeCSV(bill.amount),
        escapeCSV(bill.amount - bill.paidAmount),
        escapeCSV(bill.dueDate),
      ].join(','))
    })
    rows.push('')

    rows.push('待分派工单')
    rows.push('房间,楼栋,分类,描述,紧急程度,创建日期')
    pendingWorkOrders.forEach((wo) => {
      const room = getRoomById(wo.roomId)
      const building = room ? getBuildingById(room.buildingId) : undefined
      rows.push([
        escapeCSV(room?.roomNumber || ''),
        escapeCSV(building?.name || ''),
        escapeCSV(wo.category),
        escapeCSV(wo.description),
        escapeCSV(WORK_ORDER_URGENCY_LABELS[wo.urgency]),
        escapeCSV(wo.createdAt),
      ].join(','))
    })

    const csvContent = BOM + rows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `报表导出_${selectedMonth}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  function toggleSection(section: string) {
    setExpandedSection(expandedSection === section ? null : section)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">报表中心</h1>
        <div className="flex items-center gap-3">
          <select
            className="select-field w-44"
            value={buildingId}
            onChange={(e) => {
              setBuildingId(e.target.value)
              setRoomId('')
            }}
          >
            <option value="">全部楼栋</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <select
            className="select-field w-36"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <select
            className="select-field w-48"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          >
            <option value="">全部房间</option>
            {roomsForSelector.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
          <button className="btn-secondary" onClick={handleExportCSV}>
            <Download className="w-4 h-4" />
            导出CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-500">入住率</span>
            <Home className="w-5 h-5 text-brand-500" />
          </div>
          <div className="text-3xl font-bold text-slate-800">{occupancyRate}%</div>
          <div className={cn('flex items-center gap-1 mt-2 text-xs', occupancyRate >= 80 ? 'text-green-600' : 'text-red-500')}>
            {occupancyRate >= 80 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {occupancyRate >= 80 ? '良好' : '需关注'}
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-500">收缴率</span>
            <Wallet className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-3xl font-bold text-slate-800">{collectionRate}%</div>
          <div className={cn('flex items-center gap-1 mt-2 text-xs', collectionRate >= 80 ? 'text-green-600' : 'text-red-500')}>
            {collectionRate >= 80 ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            {collectionRate >= 80 ? '正常' : '偏低'}
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-500">平均维修耗时</span>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-3xl font-bold text-slate-800">{avgMaintenanceHours}<span className="text-base font-normal text-slate-400 ml-1">h</span></div>
          <div className="flex items-center gap-1 mt-2 text-xs text-slate-500">
            <Wrench className="w-3.5 h-3.5" />
            工单平均处理时长
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-500">待办事项数</span>
            <FileWarning className="w-5 h-5 text-red-500" />
          </div>
          <div className="text-3xl font-bold text-slate-800">{pendingTodoCount}</div>
          <div className="flex items-center gap-1 mt-2 text-xs text-slate-500">
            <AlertCircle className="w-3.5 h-3.5" />
            需及时处理
          </div>
        </div>
      </div>

      <div className="page-card">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-700">运营简报</h2>
        </div>
        <div className="divide-y divide-slate-50">
          <div>
            <button
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
              onClick={() => toggleSection('occupancy')}
            >
              <div className="flex items-center gap-3">
                <Home className="w-5 h-5 text-brand-500" />
                <span className="font-medium text-slate-700">入住概览</span>
                <span className="text-sm text-slate-500">
                  空房 {vacantCount} 间 / 入住率 {occupancyRate}%
                </span>
                <span className={cn(
                  'badge',
                  occupancyRate >= 80 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700',
                )}>
                  {occupancyRate >= 80 ? '正常' : '告警'}
                </span>
              </div>
              {expandedSection === 'occupancy'
                ? <ChevronDown className="w-4 h-4 text-slate-400" />
                : <ChevronRight className="w-4 h-4 text-slate-400" />}
            </button>
            {expandedSection === 'occupancy' && (
              <div className="px-5 pb-4 pt-0">
                <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600">
                  当月入住房间由租约生效情况判定：租约 startDate &le; 月末 且 (endDate &ge; 月初 或 租约未终止)
                </div>
              </div>
            )}
          </div>

          <div>
            <button
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
              onClick={() => toggleSection('collection')}
            >
              <div className="flex items-center gap-3">
                <Wallet className="w-5 h-5 text-emerald-500" />
                <span className="font-medium text-slate-700">收缴概览</span>
                <span className="text-sm text-slate-500">
                  应收 ¥{collectionStats.totalReceivable}，已收 ¥{collectionStats.received}，未收 ¥{collectionStats.unpaid}
                </span>
                <span className={cn(
                  'badge',
                  collectionRate >= 80 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700',
                )}>
                  收缴率 {collectionRate}%
                </span>
              </div>
              {expandedSection === 'collection'
                ? <ChevronDown className="w-4 h-4 text-slate-400" />
                : <ChevronRight className="w-4 h-4 text-slate-400" />}
            </button>
            {expandedSection === 'collection' && (
              <div className="px-5 pb-4 pt-0">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="text-xs text-slate-500 mb-1">应收总额</div>
                    <div className="text-lg font-semibold text-slate-800">¥{collectionStats.totalReceivable}</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="text-xs text-green-600 mb-1">已收金额</div>
                    <div className="text-lg font-semibold text-green-700">¥{collectionStats.received}</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3">
                    <div className="text-xs text-red-500 mb-1">未收金额</div>
                    <div className="text-lg font-semibold text-red-600">¥{collectionStats.unpaid}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <button
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
              onClick={() => toggleSection('maintenance')}
            >
              <div className="flex items-center gap-3">
                <Wrench className="w-5 h-5 text-amber-500" />
                <span className="font-medium text-slate-700">维修概览</span>
                <span className="text-sm text-slate-500">
                  本月工单共 {maintenanceStats.total}，待分派 {maintenanceStats.pending}，已完成 {maintenanceStats.completed}
                </span>
                <span className={cn(
                  'badge',
                  maintenanceStats.hours <= 8 && maintenanceStats.hours > 0
                    ? 'bg-green-50 text-green-700'
                    : maintenanceStats.hours > 8
                      ? 'bg-red-50 text-red-700'
                      : 'bg-slate-100 text-slate-600',
                )}>
                  平均耗时 {maintenanceStats.hours}h
                </span>
              </div>
              {expandedSection === 'maintenance'
                ? <ChevronDown className="w-4 h-4 text-slate-400" />
                : <ChevronRight className="w-4 h-4 text-slate-400" />}
            </button>
            {expandedSection === 'maintenance' && (
              <div className="px-5 pb-4 pt-0">
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="text-xs text-slate-500 mb-1">总工单</div>
                    <div className="text-lg font-semibold text-slate-800">{maintenanceStats.total}</div>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3">
                    <div className="text-xs text-amber-600 mb-1">待分派</div>
                    <div className="text-lg font-semibold text-amber-700">{maintenanceStats.pending}</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="text-xs text-green-600 mb-1">已完成</div>
                    <div className="text-lg font-semibold text-green-700">{maintenanceStats.completed}</div>
                  </div>
                  <div className={cn(
                    'rounded-lg p-3',
                    maintenanceStats.hours > 8 ? 'bg-red-50' : 'bg-brand-50',
                  )}>
                    <div className={cn('text-xs mb-1', maintenanceStats.hours > 8 ? 'text-red-500' : 'text-brand-600')}>
                      平均耗时
                    </div>
                    <div className={cn('text-lg font-semibold', maintenanceStats.hours > 8 ? 'text-red-600' : 'text-brand-700')}>
                      {maintenanceStats.hours}h
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <button
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
              onClick={() => toggleSection('expiring')}
            >
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-amber-500" />
                <span className="font-medium text-slate-700">到期租约</span>
                <span className={cn(
                  'badge',
                  expiringLeases.length > 0 ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700',
                )}>
                  本月 {expiringLeases.length} 份到期
                </span>
              </div>
              {expandedSection === 'expiring'
                ? <ChevronDown className="w-4 h-4 text-slate-400" />
                : <ChevronRight className="w-4 h-4 text-slate-400" />}
            </button>
            {expandedSection === 'expiring' && (
              <div className="px-5 pb-4 pt-0 space-y-2">
                {expiringLeases.length === 0 ? (
                  <div className="text-sm text-slate-400 py-3 text-center">暂无本月到期租约</div>
                ) : (
                  expiringLeases.map((lease) => {
                    const room = getRoomById(lease.roomId)
                    const building = room ? getBuildingById(room.buildingId) : undefined
                    return (
                      <div key={lease.id} className="flex items-center justify-between bg-amber-50/50 rounded-lg px-4 py-3">
                        <div className="flex items-center gap-4">
                          <span className="font-medium text-slate-700">{building?.name} {room?.roomNumber}</span>
                          <span className="text-sm text-slate-500">{lease.tenantName}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-amber-600">到期 {lease.endDate}</span>
                          <span className="text-sm text-slate-500">月租 ¥{lease.monthlyRent}</span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>

          <div>
            <button
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
              onClick={() => toggleSection('arrears')}
            >
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <span className="font-medium text-slate-700">欠费风险</span>
                <span className={cn(
                  'badge',
                  unpaidBills.length > 0 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700',
                )}>
                  欠费 {unpaidBills.length} 条，合计 ¥{unpaidBillsTotal}
                </span>
              </div>
              {expandedSection === 'arrears'
                ? <ChevronDown className="w-4 h-4 text-slate-400" />
                : <ChevronRight className="w-4 h-4 text-slate-400" />}
            </button>
            {expandedSection === 'arrears' && (
              <div className="px-5 pb-4 pt-0 space-y-2">
                {unpaidBills.length === 0 ? (
                  <div className="text-sm text-slate-400 py-3 text-center">暂无欠费账单</div>
                ) : (
                  unpaidBills.map((bill) => {
                    const room = getRoomById(bill.roomId)
                    const building = room ? getBuildingById(room.buildingId) : undefined
                    return (
                      <div key={bill.id} className="flex items-center justify-between bg-red-50/50 rounded-lg px-4 py-3">
                        <div className="flex items-center gap-4">
                          <span className="font-medium text-slate-700">{building?.name} {room?.roomNumber}</span>
                          <span className="text-sm text-slate-500">{BILL_TYPE_LABELS[bill.type]}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-red-600">待缴 ¥{bill.amount - bill.paidAmount}</span>
                          <span className="text-xs text-slate-400">截止 {bill.dueDate}</span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="page-card p-5">
          <h2 className="text-base font-semibold text-slate-700 mb-4">入住率趋势</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={occupancyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="#94a3b8" unit="%" />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Line
                type="monotone" dataKey="rate" stroke="#6366f1" strokeWidth={2}
                dot={{ r: 4, fill: '#6366f1' }} activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="page-card p-5">
          <h2 className="text-base font-semibold text-slate-700 mb-4">收缴率（按费种）</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={collectionByType}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="type" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="#94a3b8" unit="%" />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Bar dataKey="rate" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="page-card p-5">
        <h2 className="text-base font-semibold text-slate-700 mb-4">维修绩效（月均耗时）</h2>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={maintenanceByMonth}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
            <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" unit="h" />
            <Tooltip formatter={(v: number) => `${v}h`} />
            <Legend />
            <Bar dataKey="hours" name="平均耗时" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="page-card">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-700">待办事项</h2>
        </div>
        <div className="divide-y divide-slate-50">
          <div>
            <div className="px-5 py-3 bg-amber-50/50">
              <span className="badge-expiring">即将到期租约</span>
              <span className="ml-2 text-xs text-slate-500">{expiringLeases.length} 条</span>
            </div>
            {expiringLeases.map((lease) => {
              const room = getRoomById(lease.roomId)
              const building = room ? getBuildingById(room.buildingId) : undefined
              return (
                <div key={lease.id} className="table-row flex items-center">
                  <div className="table-cell w-28 font-medium">{building?.name} {room?.roomNumber}</div>
                  <div className="table-cell flex-1">{lease.tenantName}，到期 {lease.endDate}</div>
                  <div className="table-cell w-20 text-right">
                    <a className="text-brand-600 hover:text-brand-700 text-xs font-medium" href={`/leases?id=${lease.id}`}>续签</a>
                  </div>
                </div>
              )
            })}
            {expiringLeases.length === 0 && (
              <div className="px-5 py-4 text-sm text-slate-400 text-center">暂无即将到期租约</div>
            )}
          </div>

          <div>
            <div className="px-5 py-3 bg-red-50/50">
              <span className="badge-unpaid">欠费账单</span>
              <span className="ml-2 text-xs text-slate-500">{unpaidBills.length} 条</span>
            </div>
            {unpaidBills.map((bill) => {
              const room = getRoomById(bill.roomId)
              const building = room ? getBuildingById(room.buildingId) : undefined
              return (
                <div key={bill.id} className="table-row flex items-center">
                  <div className="table-cell w-28 font-medium">{building?.name} {room?.roomNumber}</div>
                  <div className="table-cell flex-1">
                    {BILL_TYPE_LABELS[bill.type]} ¥{bill.amount - bill.paidAmount} 待缴，截止 {bill.dueDate}
                  </div>
                  <div className="table-cell w-20 text-right">
                    <a className="text-brand-600 hover:text-brand-700 text-xs font-medium" href={`/finance?id=${bill.id}`}>催缴</a>
                  </div>
                </div>
              )
            })}
            {unpaidBills.length === 0 && (
              <div className="px-5 py-4 text-sm text-slate-400 text-center">暂无欠费账单</div>
            )}
          </div>

          <div>
            <div className="px-5 py-3 bg-amber-50/50">
              <span className="badge-pending">待分派工单</span>
              <span className="ml-2 text-xs text-slate-500">{pendingWorkOrders.length} 条</span>
            </div>
            {pendingWorkOrders.map((wo) => {
              const room = getRoomById(wo.roomId)
              const building = room ? getBuildingById(room.buildingId) : undefined
              return (
                <div key={wo.id} className="table-row flex items-center">
                  <div className="table-cell w-28 font-medium">{building?.name} {room?.roomNumber}</div>
                  <div className="table-cell flex-1">{wo.description}（{wo.category}）</div>
                  <div className="table-cell w-20 text-right">
                    <a className="text-brand-600 hover:text-brand-700 text-xs font-medium" href={`/maintenance?id=${wo.id}`}>分派</a>
                  </div>
                </div>
              )
            })}
            {pendingWorkOrders.length === 0 && (
              <div className="px-5 py-4 text-sm text-slate-400 text-center">暂无待分派工单</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
