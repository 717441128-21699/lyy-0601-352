import { useState } from 'react'
import { useStore } from '@/store'
import { WorkOrderStatusBadge } from '@/components/StatusBadge'
import Modal from '@/components/Modal'
import { Plus, Search, Wrench, Clock, CheckCircle, MessageSquare, Star, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WorkOrder, WorkOrderStatus, WorkOrderUrgency } from '@/types'
import { WORK_ORDER_STATUS_LABELS, WORK_ORDER_URGENCY_LABELS, STAFF_ROLE_LABELS } from '@/types'

const STATUS_TABS: WorkOrderStatus[] = ['pending', 'assigned', 'completed', 'reviewed']
const ALL_TAB = 'all' as const
type FilterTab = typeof ALL_TAB | WorkOrderStatus

const URGENCY_OPTIONS: WorkOrderUrgency[] = ['low', 'medium', 'high', 'urgent']
const CATEGORY_OPTIONS = ['水电', '门窗', '电器', '墙面', '锁具', '其他'] as const

const STATUS_ICONS: Record<WorkOrderStatus, React.ReactNode> = {
  pending: <Clock className="w-4 h-4" />,
  assigned: <Wrench className="w-4 h-4" />,
  completed: <CheckCircle className="w-4 h-4" />,
  reviewed: <MessageSquare className="w-4 h-4" />,
}

const URGENCY_BADGE: Record<WorkOrderUrgency, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
}

export default function Maintenance() {
  const {
    workOrders, rooms, buildings, staff,
    filteredWorkOrders, addWorkOrder, assignWorkOrder,
    completeWorkOrder, reviewWorkOrder,
    getRoomById, getBuildingById, getStaffById,
  } = useStore()

  const [activeTab, setActiveTab] = useState<FilterTab>(ALL_TAB)
  const [search, setSearch] = useState('')
  const [registerOpen, setRegisterOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState<WorkOrder | null>(null)
  const [completeOpen, setCompleteOpen] = useState<WorkOrder | null>(null)
  const [reviewOpen, setReviewOpen] = useState<WorkOrder | null>(null)

  const [formRoom, setFormRoom] = useState('')
  const [formCategory, setFormCategory] = useState<string>(CATEGORY_OPTIONS[0])
  const [formDesc, setFormDesc] = useState('')
  const [formUrgency, setFormUrgency] = useState<WorkOrderUrgency>('medium')

  const [assignStaffId, setAssignStaffId] = useState('')
  const [actualMinutes, setActualMinutes] = useState('')
  const [materials, setMaterials] = useState('')
  const [rating, setRating] = useState(0)
  const [reviewNote, setReviewNote] = useState('')

  const filterParams: { status?: WorkOrderStatus; search?: string } = {}
  if (activeTab !== ALL_TAB) filterParams.status = activeTab as WorkOrderStatus
  if (search) filterParams.search = search

  const orders = filteredWorkOrders(filterParams)

  const maintenanceStaff = staff.filter(s => s.role === 'maintenance')

  const columnOrders = (status: WorkOrderStatus) =>
    orders.filter(o => o.status === status)

  const roomLabel = (roomId: string) => {
    const room = getRoomById(roomId)
    if (!room) return roomId
    const building = getBuildingById(room.buildingId)
    return `${building?.name || ''} ${room.roomNumber}`
  }

  const resetRegister = () => {
    setFormRoom(''); setFormCategory(CATEGORY_OPTIONS[0])
    setFormDesc(''); setFormUrgency('medium')
  }

  const handleRegister = () => {
    addWorkOrder({
      id: Date.now().toString(),
      roomId: formRoom,
      category: formCategory,
      description: formDesc,
      urgency: formUrgency,
      status: 'pending',
      assignedStaffId: null,
      createdAt: new Date().toISOString().slice(0, 10),
      completedAt: null,
      estimatedMinutes: 60,
      actualMinutes: null,
      photos: [],
      materials: '',
      reviewRating: null,
      reviewNote: '',
    })
    resetRegister(); setRegisterOpen(false)
  }

  const handleAssign = () => {
    if (!assignOpen || !assignStaffId) return
    assignWorkOrder(assignOpen.id, assignStaffId)
    setAssignOpen(null); setAssignStaffId('')
  }

  const handleComplete = () => {
    if (!completeOpen) return
    completeWorkOrder(completeOpen.id, Number(actualMinutes), materials)
    setCompleteOpen(null); setActualMinutes(''); setMaterials('')
  }

  const handleReview = () => {
    if (!reviewOpen) return
    reviewWorkOrder(reviewOpen.id, rating, reviewNote)
    setReviewOpen(null); setRating(0); setReviewNote('')
  }

  const tabCount = (status: FilterTab) => {
    if (status === ALL_TAB) return workOrders.length
    return workOrders.filter(o => o.status === status).length
  }

  return (
    <div className="space-y-4">
      <div className="page-card flex items-center justify-between">
        <div className="flex items-center gap-1">
          {[ALL_TAB, ...STATUS_TABS].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                activeTab === tab ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              )}>
              {tab === ALL_TAB ? '全部' : WORK_ORDER_STATUS_LABELS[tab]} ({tabCount(tab)})
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="搜索工单..." className="input-field pl-8 w-56" />
          </div>
          <button onClick={() => { resetRegister(); setRegisterOpen(true) }}
            className="btn-primary flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> 报修登记
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {STATUS_TABS.map(status => (
          <div key={status} className="space-y-3">
            <div className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm',
              status === 'pending' && 'badge-pending',
              status === 'assigned' && 'badge-assigned',
              status === 'completed' && 'badge-completed',
              status === 'reviewed' && 'badge-reviewed',
            )}>
              {STATUS_ICONS[status]}
              {WORK_ORDER_STATUS_LABELS[status]}
              <span className="ml-auto bg-white/60 px-1.5 py-0.5 rounded text-xs">
                {columnOrders(status).length}
              </span>
            </div>
            <div className="space-y-2 min-h-[200px]">
              {columnOrders(status).map(order => (
                <div key={order.id} className="page-card p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-800">
                      {roomLabel(order.roomId)}
                    </span>
                    <span className={cn('text-xs px-1.5 py-0.5 rounded', URGENCY_BADGE[order.urgency])}>
                      {WORK_ORDER_URGENCY_LABELS[order.urgency]}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">{order.category}</div>
                  <div className="text-xs text-gray-600 line-clamp-2">{order.description}</div>
                  {order.assignedStaffId && (
                    <div className="text-xs text-gray-500">
                      师傅: {getStaffById(order.assignedStaffId)?.name || '-'}
                    </div>
                  )}
                  <div className="text-xs text-gray-400">{order.createdAt?.slice(0, 10)}</div>
                  <div className="flex gap-1.5 pt-1">
                    {order.status === 'pending' && (
                      <button onClick={() => { setAssignStaffId(''); setAssignOpen(order) }}
                        className="btn-secondary text-xs py-1 px-2 flex items-center gap-1">
                        <Wrench className="w-3 h-3" /> 分派
                      </button>
                    )}
                    {order.status === 'assigned' && (
                      <button onClick={() => { setActualMinutes(''); setMaterials(''); setCompleteOpen(order) }}
                        className="btn-secondary text-xs py-1 px-2 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> 完成
                      </button>
                    )}
                    {order.status === 'completed' && (
                      <button onClick={() => { setRating(0); setReviewNote(''); setReviewOpen(order) }}
                        className="btn-secondary text-xs py-1 px-2 flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> 回访
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Modal open={registerOpen} onClose={() => setRegisterOpen(false)} title="报修登记">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">房间</label>
            <select value={formRoom} onChange={e => setFormRoom(e.target.value)} className="select-field w-full">
              <option value="">请选择房间</option>
              {rooms.map(r => (
                <option key={r.id} value={r.id}>{roomLabel(r.id)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">类别</label>
            <select value={formCategory} onChange={e => setFormCategory(e.target.value)} className="select-field w-full">
              {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
            <textarea value={formDesc} onChange={e => setFormDesc(e.target.value)}
              className="input-field w-full" rows={3} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">紧急程度</label>
            <div className="flex gap-2">
              {URGENCY_OPTIONS.map(u => (
                <button key={u} onClick={() => setFormUrgency(u)}
                  className={cn('px-3 py-1.5 rounded text-sm border transition-colors',
                    formUrgency === u ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600'
                  )}>
                  {WORK_ORDER_URGENCY_LABELS[u]}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setRegisterOpen(false)} className="btn-secondary">取消</button>
            <button onClick={handleRegister} className="btn-primary" disabled={!formRoom || !formDesc}>
              提交
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={!!assignOpen} onClose={() => setAssignOpen(null)} title="分派师傅">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">选择维修师傅</label>
            <select value={assignStaffId} onChange={e => setAssignStaffId(e.target.value)} className="select-field w-full">
              <option value="">请选择师傅</option>
              {maintenanceStaff.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setAssignOpen(null)} className="btn-secondary">取消</button>
            <button onClick={handleAssign} className="btn-primary" disabled={!assignStaffId}>确认分派</button>
          </div>
        </div>
      </Modal>

      <Modal open={!!completeOpen} onClose={() => setCompleteOpen(null)} title="完成维修">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">实际用时 (分钟)</label>
            <input type="number" value={actualMinutes} onChange={e => setActualMinutes(e.target.value)}
              className="input-field w-full" placeholder="请输入实际用时" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">使用材料</label>
            <input value={materials} onChange={e => setMaterials(e.target.value)}
              className="input-field w-full" placeholder="请输入使用材料" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setCompleteOpen(null)} className="btn-secondary">取消</button>
            <button onClick={handleComplete} className="btn-primary" disabled={!actualMinutes}>确认完成</button>
          </div>
        </div>
      </Modal>

      <Modal open={!!reviewOpen} onClose={() => setReviewOpen(null)} title="回访">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">满意度评分</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(i => (
                <button key={i} onClick={() => setRating(i)}>
                  <Star className={cn('w-7 h-7 transition-colors',
                    i <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300')} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
            <textarea value={reviewNote} onChange={e => setReviewNote(e.target.value)}
              className="input-field w-full" rows={3} placeholder="请输入回访备注" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setReviewOpen(null)} className="btn-secondary">取消</button>
            <button onClick={handleReview} className="btn-primary" disabled={rating === 0}>提交回访</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
