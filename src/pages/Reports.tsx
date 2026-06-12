import { useState, useMemo } from 'react'
import { useStore } from '@/store'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Clock, AlertCircle, CheckCircle, Home, Wrench,
  Wallet, FileWarning, Download,
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

export default function Reports() {
  const months = useMemo(() => getMonthLabels(), [])
  const [buildingId, setBuildingId] = useState('')
  const [roomId, setRoomId] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(months[months.length - 1].value)

  const {
    rooms, buildings,
    getRoomById, getBuildingById,
    filteredRooms, filteredBills, filteredWorkOrders, filteredLeases,
  } = useStore()

  const roomsForSelector = useMemo(() => {
    return rooms.map((r) => {
      const building = getBuildingById(r.buildingId)
      return {
        ...r,
        label: `${building?.name || '未知楼栋'} - ${r.roomNumber}`,
      }
    }).sort((a, b) => a.label.localeCompare(b.label))
  }, [rooms, getBuildingById])

  const currentFilteredRooms = useMemo(() => {
    let result = filteredRooms({ roomId: roomId || undefined })
    if (buildingId && !roomId) {
      result = result.filter((r) => r.buildingId === buildingId)
    }
    return result
  }, [filteredRooms, roomId, buildingId])

  const occupancyRate = useMemo(() => {
    const total = currentFilteredRooms.length
    if (total === 0) return 0
    const occupied = currentFilteredRooms.filter(
      (r) => r.status === 'occupied' || r.status === 'expiring' || r.status === 'arrears',
    ).length
    return Math.round((occupied / total) * 100)
  }, [currentFilteredRooms])

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

  const expiringLeases = useMemo(() => {
    const leases = filteredLeases({
      roomId: roomId || undefined,
      buildingId: buildingId || undefined,
      status: 'expiring',
    })
    return leases.filter((lease) => {
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

  const occupancyTrend = useMemo(() => {
    return months.map((m) => {
      let monthRooms = filteredRooms({ roomId: roomId || undefined })
      if (buildingId && !roomId) {
        monthRooms = monthRooms.filter((r) => r.buildingId === buildingId)
      }

      const monthBills = filteredBills({
        month: m.value,
        roomId: roomId || undefined,
        buildingId: buildingId || undefined,
      })
      const monthWorkOrders = filteredWorkOrders({
        month: m.value,
        roomId: roomId || undefined,
        buildingId: buildingId || undefined,
      })

      const total = monthRooms.length
      if (total === 0) {
        return {
          month: m.label.slice(5),
          rate: 0,
        }
      }

      let occupiedCount = 0

      monthRooms.forEach((room) => {
        const roomBills = monthBills.filter((b) => b.roomId === room.id)
        const roomWorkOrders = monthWorkOrders.filter((w) => w.roomId === room.id)

        if (room.status === 'occupied' || room.status === 'expiring' || room.status === 'arrears') {
          occupiedCount++
        } else if (roomBills.length > 0 || roomWorkOrders.length > 0) {
          occupiedCount++
        }
      })

      const rate = Math.round((occupiedCount / total) * 100)
      return {
        month: m.label.slice(5),
        rate: Math.min(100, Math.max(0, rate)),
      }
    })
  }, [months, filteredRooms, filteredBills, filteredWorkOrders, roomId, buildingId])

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
