import { useState } from 'react'
import { useStore } from '@/store'
import { BillStatusBadge } from '@/components/StatusBadge'
import Modal from '@/components/Modal'
import { Plus, Search, Wallet, TrendingDown, CheckCircle, AlertCircle } from 'lucide-react'
import { BILL_TYPE_LABELS, BILL_STATUS_LABELS, BILL_ACTION_TYPE_LABELS } from '@/types'
import type { Bill, BillType, BillStatus, DunningRecord } from '@/types'
import { cn } from '@/lib/utils'

type BillTypeFilter = BillType | 'all'
type BillStatusFilter = BillStatus | 'all'

const DUNNING_METHODS = ['微信通知', '短信', '电话', '上门拜访', '律师函']
const PAYMENT_METHOD_LABELS: Record<string, string> = {
  wechat: '微信',
  alipay: '支付宝',
  bank: '银行转账',
  cash: '现金',
}
const ACTION_CIRCLE_COLORS: Record<string, string> = {
  created: 'bg-blue-500',
  paid: 'bg-green-500',
  reduced: 'bg-purple-500',
  dunning: 'bg-amber-500',
}

export default function Finance() {
  const { bills, rooms, buildings, filteredBills, addBill, markBillPaid, reduceBill, getRoomById, getBuildingById, addDunningRecord } = useStore()

  const [typeFilter, setTypeFilter] = useState<BillTypeFilter>('all')
  const [statusFilter, setStatusFilter] = useState<BillStatusFilter>('all')

  const [showAddModal, setShowAddModal] = useState(false)
  const [showPayModal, setShowPayModal] = useState(false)
  const [showReduceModal, setShowReduceModal] = useState(false)
  const [showDunningModal, setShowDunningModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null)

  const [form, setForm] = useState({ roomId: '', type: 'rent' as BillType, amount: '', periodStart: '', periodEnd: '', dueDate: '' })
  const [payMethod, setPayMethod] = useState('wechat')
  const [reduceAmount, setReduceAmount] = useState('')
  const [reduceRemark, setReduceRemark] = useState('')
  const [dunningMethod, setDunningMethod] = useState(DUNNING_METHODS[0])
  const [dunningRemark, setDunningRemark] = useState('')

  const filtered = filteredBills({ type: typeFilter === 'all' ? undefined : typeFilter, status: statusFilter === 'all' ? undefined : statusFilter })

  const totalBilled = filtered.reduce((s, b) => s + b.amount, 0)
  const totalPaid = filtered.reduce((s, b) => s + b.paidAmount, 0)
  const totalUnpaid = filtered.reduce((s, b) => s + (b.amount - b.paidAmount - b.reducedAmount), 0)
  const totalReduced = filtered.reduce((s, b) => s + b.reducedAmount, 0)

  const selectedBill = selectedBillId ? bills.find(b => b.id === selectedBillId) || null : null

  const handleAddBill = () => {
    const billId = Date.now().toString()
    addBill({
      id: billId,
      roomId: form.roomId,
      leaseId: '',
      type: form.type,
      amount: Number(form.amount),
      paidAmount: 0,
      reducedAmount: 0,
      periodStart: form.periodStart,
      periodEnd: form.periodEnd,
      dueDate: form.dueDate,
      status: 'unpaid',
      paidAt: null,
      paymentMethod: null,
      remark: '',
      dunningRecords: [],
      actionLogs: [{
        id: 'log-create-' + Date.now(),
        billId,
        type: 'created',
        amount: Number(form.amount),
        method: '手工录入',
        createdAt: new Date().toISOString().slice(0, 10),
        operator: '王建国',
        remark: '手工生成账单',
      }],
    })
    setShowAddModal(false)
    setForm({ roomId: '', type: 'rent', amount: '', periodStart: '', periodEnd: '', dueDate: '' })
  }

  const handleMarkPaid = () => {
    if (!selectedBill) return
    markBillPaid(selectedBill.id, payMethod)
    setShowPayModal(false)
    setSelectedBillId(null)
    setPayMethod('wechat')
  }

  const handleReduce = () => {
    if (!selectedBill) return
    reduceBill(selectedBill.id, Number(reduceAmount), reduceRemark)
    setShowReduceModal(false)
    setSelectedBillId(null)
    setReduceAmount('')
    setReduceRemark('')
  }

  const handleDunningSubmit = () => {
    if (!selectedBill) return
    const record: DunningRecord = {
      id: Date.now().toString(),
      billId: selectedBill.id,
      method: dunningMethod,
      createdAt: new Date().toISOString().slice(0, 10),
      remark: dunningRemark,
    }
    addDunningRecord(selectedBill.id, record)
    setShowDunningModal(false)
    setDunningMethod(DUNNING_METHODS[0])
    setDunningRemark('')
  }

  const openPayModal = (bill: Bill) => { setSelectedBillId(bill.id); setShowPayModal(true); setPayMethod('wechat') }
  const openReduceModal = (bill: Bill) => { setSelectedBillId(bill.id); setShowReduceModal(true); setReduceAmount(''); setReduceRemark('') }
  const openDunningModal = (bill: Bill) => { setSelectedBillId(bill.id); setShowDunningModal(true); setDunningMethod(DUNNING_METHODS[0]); setDunningRemark('') }
  const openDetailModal = (bill: Bill) => { setSelectedBillId(bill.id); setShowDetailModal(true) }

  const getRoomLabel = (roomId: string) => {
    const room = getRoomById(roomId)
    if (!room) return roomId
    const building = getBuildingById(room.buildingId)
    return building ? `${building.name} ${room.roomNumber}` : room.roomNumber
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">费用中心</h1>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4" /> 生成账单
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-gray-400" />
          <select className="select-field" value={typeFilter} onChange={e => setTypeFilter(e.target.value as BillTypeFilter)}>
            <option value="all">全部类型</option>
            {Object.entries(BILL_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <select className="select-field" value={statusFilter} onChange={e => setStatusFilter(e.target.value as BillStatusFilter)}>
          <option value="all">全部状态</option>
          {Object.entries(BILL_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-2 text-gray-500 text-sm"><Wallet className="h-4 w-4" /> 应收总额</div>
          <div className="text-2xl font-semibold mt-1">¥{totalBilled.toFixed(2)}</div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 text-gray-500 text-sm"><CheckCircle className="h-4 w-4" /> 已收总额</div>
          <div className="text-2xl font-semibold mt-1 text-green-600">¥{totalPaid.toFixed(2)}</div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 text-gray-500 text-sm"><AlertCircle className="h-4 w-4" /> 未收总额</div>
          <div className="text-2xl font-semibold mt-1 text-red-600">¥{totalUnpaid.toFixed(2)}</div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 text-gray-500 text-sm"><TrendingDown className="h-4 w-4" /> 减免总额</div>
          <div className="text-2xl font-semibold mt-1 text-blue-600">¥{totalReduced.toFixed(2)}</div>
        </div>
      </div>

      <div className="page-card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="table-header">房间</th>
              <th className="table-header">类型</th>
              <th className="table-header">账单周期</th>
              <th className="table-header">金额</th>
              <th className="table-header">已缴</th>
              <th className="table-header">减免</th>
              <th className="table-header">状态</th>
              <th className="table-header">到期日</th>
              <th className="table-header">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(bill => (
              <tr key={bill.id} className="table-row">
                <td className="table-cell">{getRoomLabel(bill.roomId)}</td>
                <td className="table-cell">{BILL_TYPE_LABELS[bill.type]}</td>
                <td className="table-cell">{bill.periodStart} ~ {bill.periodEnd}</td>
                <td className="table-cell">¥{bill.amount.toFixed(2)}</td>
                <td className="table-cell">¥{bill.paidAmount.toFixed(2)}</td>
                <td className="table-cell">¥{bill.reducedAmount.toFixed(2)}</td>
                <td className="table-cell"><BillStatusBadge status={bill.status} /></td>
                <td className="table-cell">{bill.dueDate}</td>
                <td className="table-cell">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button className="btn-secondary text-xs" onClick={() => openDetailModal(bill)}>详情</button>
                    {bill.status !== 'paid' && bill.status !== 'reduced' && (
                      <button className="btn-secondary text-xs" onClick={() => openPayModal(bill)}>收款</button>
                    )}
                    {bill.status !== 'paid' && bill.status !== 'reduced' && (
                      <button className="btn-secondary text-xs" onClick={() => openDunningModal(bill)}>催缴</button>
                    )}
                    {bill.status === 'unpaid' && (
                      <button className="btn-danger text-xs" onClick={() => openReduceModal(bill)}>减免</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="生成账单">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">房间</label>
            <select className="select-field w-full" value={form.roomId} onChange={e => setForm(f => ({ ...f, roomId: e.target.value }))}>
              <option value="">请选择房间</option>
              {rooms.map(r => {
                const b = getBuildingById(r.buildingId)
                return <option key={r.id} value={r.id}>{b ? `${b.name} - ` : ''}{r.roomNumber}</option>
              })}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
            <select className="select-field w-full" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as BillType }))}>
              {Object.entries(BILL_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">金额</label>
            <input className="input-field w-full" type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">周期开始</label>
              <input className="input-field w-full" type="date" value={form.periodStart} onChange={e => setForm(f => ({ ...f, periodStart: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">周期结束</label>
              <input className="input-field w-full" type="date" value={form.periodEnd} onChange={e => setForm(f => ({ ...f, periodEnd: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">到期日</label>
            <input className="input-field w-full" type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
          </div>
          <button className="btn-primary w-full" onClick={handleAddBill} disabled={!form.roomId || !form.amount}>确认生成</button>
        </div>
      </Modal>

      <Modal open={showPayModal} onClose={() => setShowPayModal(false)} title="标记收款">
        {selectedBill && (
          <div className="space-y-4">
            <div className="page-card">
              <div className="text-sm text-gray-500">房间: {getRoomLabel(selectedBill.roomId)}</div>
              <div className="text-sm text-gray-500">金额: ¥{selectedBill.amount.toFixed(2)}</div>
              <div className="text-sm text-gray-500">待缴: ¥{(selectedBill.amount - selectedBill.paidAmount - selectedBill.reducedAmount).toFixed(2)}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">收款方式</label>
              <select className="select-field w-full" value={payMethod} onChange={e => setPayMethod(e.target.value)}>
                <option value="wechat">微信</option>
                <option value="alipay">支付宝</option>
                <option value="bank">银行转账</option>
                <option value="cash">现金</option>
              </select>
            </div>
            <button className="btn-primary w-full" onClick={handleMarkPaid}>确认收款</button>
          </div>
        )}
      </Modal>

      <Modal open={showReduceModal} onClose={() => setShowReduceModal(false)} title="减免">
        {selectedBill && (
          <div className="space-y-4">
            <div className="page-card">
              <div className="text-sm text-gray-500">房间: {getRoomLabel(selectedBill.roomId)}</div>
              <div className="text-sm text-gray-500">金额: ¥{selectedBill.amount.toFixed(2)}</div>
              <div className="text-sm text-gray-500">待缴: ¥{(selectedBill.amount - selectedBill.paidAmount - selectedBill.reducedAmount).toFixed(2)}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">减免金额</label>
              <input className="input-field w-full" type="number" value={reduceAmount} onChange={e => setReduceAmount(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
              <input className="input-field w-full" value={reduceRemark} onChange={e => setReduceRemark(e.target.value)} />
            </div>
            <button className="btn-danger w-full" onClick={handleReduce}>确认减免</button>
          </div>
        )}
      </Modal>

      <Modal open={showDunningModal} onClose={() => setShowDunningModal(false)} title="添加催缴记录">
        {selectedBill && (
          <div className="space-y-4">
            <div className="page-card">
              <div className="text-sm text-gray-500">房间: {getRoomLabel(selectedBill.roomId)}</div>
              <div className="text-sm text-gray-500">金额: ¥{selectedBill.amount.toFixed(2)}</div>
              <div className="text-sm text-gray-500">待缴: ¥{(selectedBill.amount - selectedBill.paidAmount - selectedBill.reducedAmount).toFixed(2)}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">催缴方式</label>
              <select className="select-field w-full" value={dunningMethod} onChange={e => setDunningMethod(e.target.value)}>
                {DUNNING_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
              <textarea className="input-field w-full min-h-[100px] resize-none" value={dunningRemark} onChange={e => setDunningRemark(e.target.value)} placeholder="请输入催缴备注..." />
            </div>
            <button className="btn-primary w-full" onClick={handleDunningSubmit}>确认提交</button>
          </div>
        )}
      </Modal>

      <Modal open={showDetailModal} onClose={() => setShowDetailModal(false)} title="账单详情" width="max-w-xl">
        {selectedBill && (
          <div className="space-y-5">
            <div className="page-card space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">房间</span>
                <span className="text-sm font-medium">{getRoomLabel(selectedBill.roomId)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">类型</span>
                <span className="text-sm font-medium">{BILL_TYPE_LABELS[selectedBill.type]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">账单周期</span>
                <span className="text-sm font-medium">{selectedBill.periodStart} ~ {selectedBill.periodEnd}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">到期日</span>
                <span className="text-sm font-medium">{selectedBill.dueDate}</span>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">账单金额</span>
                  <span className="text-sm font-medium">¥{selectedBill.amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-sm text-gray-500">已缴金额</span>
                  <span className="text-sm font-medium text-green-600">¥{selectedBill.paidAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-sm text-gray-500">减免金额</span>
                  <span className="text-sm font-medium text-blue-600">¥{selectedBill.reducedAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-sm text-gray-500">待缴金额</span>
                  <span className="text-sm font-medium text-red-600">¥{(selectedBill.amount - selectedBill.paidAmount - selectedBill.reducedAmount).toFixed(2)}</span>
                </div>
              </div>
              <div className="flex justify-between pt-2 border-t mt-2">
                <span className="text-sm text-gray-500">状态</span>
                <BillStatusBadge status={selectedBill.status} />
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">催缴历史</h4>
              {selectedBill.dunningRecords.length > 0 ? (
                <div className="page-card overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="table-header text-left">日期</th>
                        <th className="table-header text-left">方式</th>
                        <th className="table-header text-left">备注</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedBill.dunningRecords.map(record => (
                        <tr key={record.id} className="table-row">
                          <td className="table-cell text-sm">{record.createdAt}</td>
                          <td className="table-cell text-sm">{record.method}</td>
                          <td className="table-cell text-sm">{record.remark || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="page-card text-center py-6 text-gray-400 text-sm">
                  暂无催缴记录
                </div>
              )}
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">操作记录时间线</h4>
              {selectedBill.actionLogs && selectedBill.actionLogs.length > 0 ? (
                <div className="page-card">
                  {[...selectedBill.actionLogs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((log, index, arr) => (
                    <div key={log.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={cn("w-3 h-3 rounded-full flex-shrink-0", ACTION_CIRCLE_COLORS[log.type])} />
                        {index < arr.length - 1 && <div className="w-px flex-1 border-l border-gray-200 my-1" />}
                      </div>
                      <div className="flex-1 pb-5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm text-gray-500">{log.createdAt}</span>
                          <span className="text-sm font-medium text-gray-900">{BILL_ACTION_TYPE_LABELS[log.type]}</span>
                          <span className="text-sm text-gray-500">操作人: {log.operator}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap mt-1">
                          <span className="text-sm text-gray-600">{PAYMENT_METHOD_LABELS[log.method] || log.method}</span>
                          {log.amount > 0 && <span className="text-sm font-medium text-gray-900">¥{log.amount.toFixed(2)}</span>}
                        </div>
                        {log.remark && (
                          <div className="text-sm text-gray-500 mt-1">{log.remark}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="page-card text-center py-6 text-gray-400 text-sm">
                  暂无操作记录
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
