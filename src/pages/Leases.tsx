import { useState } from 'react'
import { useStore } from '@/store'
import { LeaseStatusBadge } from '@/components/StatusBadge'
import Modal from '@/components/Modal'
import { Plus, Search, Users, Clock, FileText, User, Phone, CreditCard } from 'lucide-react'
import { LEASE_STATUS_LABELS } from '@/types'
import type { LeaseStatus, Lease } from '@/types'
import { cn } from '@/lib/utils'

const STATUS_TABS: { label: string; value: LeaseStatus | 'all' }[] = [
  { label: '全部', value: 'all' },
  { label: '生效中', value: 'active' },
  { label: '即将到期', value: 'expiring' },
  { label: '已到期', value: 'expired' },
  { label: '已退租', value: 'terminated' },
]

const PAYMENT_METHODS = ['月付', '季付', '半年付', '年付']

const initialForm = {
  tenantName: '',
  tenantIdCard: '',
  tenantPhone: '',
  roomId: '',
  startDate: '',
  endDate: '',
  deposit: '',
  monthlyRent: '',
  paymentMethod: '月付',
}

function getProgress(start: string, end: string) {
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  const now = Date.now()
  if (now <= s) return 0
  if (now >= e) return 100
  return Math.round(((now - s) / (e - s)) * 100)
}

export default function Leases() {
  const { filteredLeases, addLease, rooms, buildings, getRoomById, getBuildingById } = useStore()

  const [statusFilter, setStatusFilter] = useState<LeaseStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [showNewModal, setShowNewModal] = useState(false)
  const [detailLease, setDetailLease] = useState<Lease | null>(null)
  const [form, setForm] = useState(initialForm)

  const leases = filteredLeases({
    status: statusFilter === 'all' ? undefined : statusFilter,
    search: search || undefined,
  })

  const availableRooms = rooms.filter((r) => r.status === 'vacant')

  function handleFormChange(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const lease: Lease = {
      id: Date.now().toString(),
      roomId: form.roomId,
      tenantName: form.tenantName,
      tenantIdCard: form.tenantIdCard,
      tenantPhone: form.tenantPhone,
      startDate: form.startDate,
      endDate: form.endDate,
      deposit: Number(form.deposit),
      monthlyRent: Number(form.monthlyRent),
      paymentMethod: form.paymentMethod,
      status: 'active',
      coTenants: [],
      renewalRecords: [],
    }
    addLease(lease)
    setForm(initialForm)
    setShowNewModal(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">租约管理</h1>
        <button className="btn-primary flex items-center gap-1.5" onClick={() => setShowNewModal(true)}>
          <Plus className="w-4 h-4" />
          新建租约
        </button>
      </div>

      <div className="page-card">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex gap-1 flex-wrap">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  statusFilter === tab.value
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                )}
                onClick={() => setStatusFilter(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="relative sm:ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="input-field pl-9"
              placeholder="搜索租户姓名、手机号、房号..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {leases.map((lease) => {
          const room = getRoomById(lease.roomId)
          const building = room ? getBuildingById(room.buildingId) : undefined
          const progress = getProgress(lease.startDate, lease.endDate)

          return (
            <div
              key={lease.id}
              className="page-card cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setDetailLease(lease)}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold text-sm shrink-0">
                  {lease.tenantName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-800 truncate">{lease.tenantName}</span>
                    <LeaseStatusBadge status={lease.status} />
                  </div>
                  <div className="text-sm text-slate-500 mt-0.5">
                    {building?.name} · {room?.roomNumber}
                  </div>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-500">{lease.startDate} ~ {lease.endDate}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      progress >= 90 ? 'bg-amber-500' : 'bg-blue-500'
                    )}
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                    押金 ¥{lease.deposit.toLocaleString()}
                  </div>
                  <span className="text-slate-400">{lease.paymentMethod}</span>
                </div>

                {lease.coTenants.length > 0 && (
                  <div className="flex items-center gap-1.5 text-sm text-slate-500">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    {lease.coTenants.length}位同住人
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {leases.length === 0 && (
        <div className="page-card text-center py-12 text-slate-400">
          暂无匹配的租约记录
        </div>
      )}

      <Modal open={showNewModal} onClose={() => setShowNewModal(false)} title="新建租约" width="max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">租户姓名</label>
              <input className="input-field" required value={form.tenantName} onChange={(e) => handleFormChange('tenantName', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">身份证号</label>
              <input className="input-field" required value={form.tenantIdCard} onChange={(e) => handleFormChange('tenantIdCard', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">手机号</label>
              <input className="input-field" required value={form.tenantPhone} onChange={(e) => handleFormChange('tenantPhone', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">房间</label>
              <select className="select-field" required value={form.roomId} onChange={(e) => handleFormChange('roomId', e.target.value)}>
                <option value="">请选择房间</option>
                {availableRooms.map((r) => {
                  const b = getBuildingById(r.buildingId)
                  return <option key={r.id} value={r.id}>{b?.name} - {r.roomNumber}</option>
                })}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">开始日期</label>
              <input type="date" className="input-field" required value={form.startDate} onChange={(e) => handleFormChange('startDate', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">结束日期</label>
              <input type="date" className="input-field" required value={form.endDate} onChange={(e) => handleFormChange('endDate', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">押金 (元)</label>
              <input type="number" className="input-field" required value={form.deposit} onChange={(e) => handleFormChange('deposit', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">月租 (元)</label>
              <input type="number" className="input-field" required value={form.monthlyRent} onChange={(e) => handleFormChange('monthlyRent', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">付款方式</label>
              <select className="select-field" value={form.paymentMethod} onChange={(e) => handleFormChange('paymentMethod', e.target.value)}>
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setShowNewModal(false)}>取消</button>
            <button type="submit" className="btn-primary">确认创建</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!detailLease} onClose={() => setDetailLease(null)} title="租约详情" width="max-w-xl">
        {detailLease && (() => {
          const room = getRoomById(detailLease.roomId)
          const building = room ? getBuildingById(room.buildingId) : undefined
          const progress = getProgress(detailLease.startDate, detailLease.endDate)

          return (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold text-lg">
                  {detailLease.tenantName.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">{detailLease.tenantName}</span>
                    <LeaseStatusBadge status={detailLease.status} />
                  </div>
                  <div className="text-sm text-slate-500">{building?.name} · {room?.roomNumber}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <User className="w-4 h-4 text-slate-400" />
                  {detailLease.tenantIdCard}
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="w-4 h-4 text-slate-400" />
                  {detailLease.tenantPhone}
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Clock className="w-4 h-4 text-slate-400" />
                  {detailLease.startDate} ~ {detailLease.endDate}
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <CreditCard className="w-4 h-4 text-slate-400" />
                  押金 ¥{detailLease.deposit.toLocaleString()}
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  月租 ¥{detailLease.monthlyRent.toLocaleString()}
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  {detailLease.paymentMethod}
                </div>
              </div>

              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full', progress >= 90 ? 'bg-amber-500' : 'bg-blue-500')}
                  style={{ width: `${progress}%` }}
                />
              </div>

              {detailLease.coTenants.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-1.5">
                    <Users className="w-4 h-4" />同住人
                  </h4>
                  <div className="space-y-2">
                    {detailLease.coTenants.map((ct) => (
                      <div key={ct.id} className="flex items-center gap-3 text-sm bg-slate-50 rounded-lg px-3 py-2">
                        <span className="font-medium text-slate-700">{ct.name}</span>
                        <span className="text-slate-500">{ct.phone}</span>
                        {ct.isPrimary && <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">主租户</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detailLease.renewalRecords.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-1.5">
                    <FileText className="w-4 h-4" />续租记录
                  </h4>
                  <div className="space-y-2">
                    {detailLease.renewalRecords.map((rr) => (
                      <div key={rr.id} className="text-sm bg-slate-50 rounded-lg px-3 py-2">
                        <div className="text-slate-600">{rr.oldEndDate} → {rr.newEndDate}</div>
                        <div className="text-slate-500">新租金 ¥{rr.newRent.toLocaleString()} · {rr.createdAt}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })()}
      </Modal>
    </div>
  )
}
