import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Building, Room, Lease, Bill, WorkOrder, Staff, BillType, BillStatus, LeaseStatus, RoomStatus, WorkOrderStatus, WorkOrderUrgency, DunningRecord, CoTenant, RenewalRecord, BillActionLog, LeaseTermination } from '@/types'
import { mockBuildings, mockRooms, mockLeases, mockBills, mockWorkOrders, mockStaff } from '@/data/mock'

const mockBillsWithLogs = mockBills.map((b) => ({
  ...b,
  dunningRecords: b.status === 'unpaid' && b.type === 'rent' ? [
    {
      id: 'd' + b.id,
      billId: b.id,
      method: '微信通知',
      createdAt: '2026-06-08',
      remark: '已发送微信催缴通知',
    },
  ] : [],
  actionLogs: [
    {
      id: 'log-create-' + b.id,
      billId: b.id,
      type: 'created' as const,
      amount: b.amount,
      method: '系统生成',
      createdAt: b.periodStart,
      operator: '王建国',
      remark: '系统自动生成账单',
    },
    ...(b.status === 'paid' && b.paidAt ? [{
      id: 'log-paid-' + b.id,
      billId: b.id,
      type: 'paid' as const,
      amount: b.amount - b.reducedAmount,
      method: b.paymentMethod || '微信',
      createdAt: b.paidAt,
      operator: '陈财务',
      remark: '已全额收款',
    }] : []),
  ],
}))

const mockLeasesWithTermination = mockLeases.map((l) => ({
  ...l,
  termination: null,
}))

interface AppState {
  buildings: Building[]
  rooms: Room[]
  leases: Lease[]
  bills: Bill[]
  workOrders: WorkOrder[]
  staff: Staff[]

  addLease: (lease: Lease) => boolean
  updateLease: (id: string, data: Partial<Lease>) => void
  addCoTenant: (leaseId: string, coTenant: CoTenant) => void
  removeCoTenant: (leaseId: string, coTenantId: string) => void
  addRenewalRecord: (leaseId: string, record: RenewalRecord) => void
  terminateLease: (leaseId: string, termination: LeaseTermination) => void

  addBill: (bill: Bill) => void
  updateBill: (id: string, data: Partial<Bill>) => void
  markBillPaid: (id: string, paymentMethod: string) => void
  reduceBill: (id: string, reducedAmount: number, remark: string) => void
  addDunningRecord: (billId: string, record: DunningRecord) => void
  addBillActionLog: (billId: string, log: Omit<BillActionLog, 'id' | 'billId'>) => void

  addWorkOrder: (order: WorkOrder) => void
  updateWorkOrder: (id: string, data: Partial<WorkOrder>) => void
  assignWorkOrder: (id: string, staffId: string) => void
  completeWorkOrder: (id: string, actualMinutes: number, materials: string) => void
  reviewWorkOrder: (id: string, rating: number, note: string) => void

  updateRoomStatus: (id: string, status: RoomStatus) => void

  getRoomById: (id: string) => Room | undefined
  getBuildingById: (id: string) => Building | undefined
  getLeaseByRoomId: (roomId: string) => Lease | undefined
  getStaffById: (id: string) => Staff | undefined
  getLeasesByRoomId: (roomId: string) => Lease[]
  getBillsByRoomId: (roomId: string) => Bill[]
  getWorkOrdersByRoomId: (roomId: string) => WorkOrder[]

  filteredRooms: (filters: { buildingId?: string; status?: RoomStatus; roomId?: string }) => Room[]
  filteredLeases: (filters: { status?: LeaseStatus; search?: string; roomId?: string; buildingId?: string }) => Lease[]
  filteredBills: (filters: { type?: BillType; status?: BillStatus; month?: string; roomId?: string; buildingId?: string }) => Bill[]
  filteredWorkOrders: (filters: { status?: WorkOrderStatus; search?: string; month?: string; roomId?: string; buildingId?: string }) => WorkOrder[]

  hasActiveLease: (roomId: string) => boolean
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      buildings: mockBuildings,
      rooms: mockRooms,
      leases: mockLeasesWithTermination,
      bills: mockBillsWithLogs,
      workOrders: mockWorkOrders,
      staff: mockStaff,

      hasActiveLease: (roomId) => {
        return get().leases.some((l) => l.roomId === roomId && l.status !== 'terminated')
      },

      addLease: (lease) => {
        if (get().hasActiveLease(lease.roomId)) {
          return false
        }
        set((s) => ({
          leases: [...s.leases, lease],
          rooms: s.rooms.map((r) =>
            r.id === lease.roomId ? { ...r, status: 'occupied' as RoomStatus } : r
          ),
        }))
        return true
      },
      updateLease: (id, data) => set((s) => ({
        leases: s.leases.map((l) => (l.id === id ? { ...l, ...data } : l)),
      })),
      addCoTenant: (leaseId, coTenant) => set((s) => ({
        leases: s.leases.map((l) =>
          l.id === leaseId ? { ...l, coTenants: [...l.coTenants, coTenant] } : l
        ),
      })),
      removeCoTenant: (leaseId, coTenantId) => set((s) => ({
        leases: s.leases.map((l) =>
          l.id === leaseId ? { ...l, coTenants: l.coTenants.filter((c) => c.id !== coTenantId) } : l
        ),
      })),
      addRenewalRecord: (leaseId, record) => set((s) => ({
        leases: s.leases.map((l) =>
          l.id === leaseId
            ? { ...l, endDate: record.newEndDate, monthlyRent: record.newRent, renewalRecords: [...l.renewalRecords, record] }
            : l
        ),
      })),
      terminateLease: (leaseId, termination) => set((s) => {
        const lease = s.leases.find((l) => l.id === leaseId)
        return {
          leases: s.leases.map((l) =>
            l.id === leaseId
              ? { ...l, status: 'terminated' as LeaseStatus, termination }
              : l
          ),
          rooms: lease
            ? s.rooms.map((r) =>
                r.id === lease.roomId ? { ...r, status: 'vacant' as RoomStatus } : r
              )
            : s.rooms,
        }
      }),

      addBill: (bill) => {
        set((s) => ({ bills: [...s.bills, bill] }))
      },
      updateBill: (id, data) => set((s) => ({
        bills: s.bills.map((b) => (b.id === id ? { ...b, ...data } : b)),
      })),
      markBillPaid: (id, paymentMethod) => {
        const today = new Date().toISOString().slice(0, 10)
        set((s) => ({
          bills: s.bills.map((b) =>
            b.id === id
              ? {
                  ...b,
                  status: 'paid' as BillStatus,
                  paidAmount: b.amount - b.reducedAmount,
                  paidAt: today,
                  paymentMethod,
                  actionLogs: [
                    ...b.actionLogs,
                    {
                      id: 'log-paid-' + Date.now(),
                      billId: b.id,
                      type: 'paid',
                      amount: b.amount - b.reducedAmount,
                      method: paymentMethod,
                      createdAt: today,
                      operator: '王建国',
                      remark: '已收款',
                    },
                  ],
                }
              : b
          ),
        }))
      },
      reduceBill: (id, reducedAmount, remark) => {
        const today = new Date().toISOString().slice(0, 10)
        set((s) => ({
          bills: s.bills.map((b) =>
            b.id === id
              ? {
                  ...b,
                  reducedAmount: b.reducedAmount + reducedAmount,
                  status: (b.amount - b.paidAmount - b.reducedAmount - reducedAmount <= 0 ? 'reduced' : b.status) as BillStatus,
                  remark: remark || b.remark,
                  actionLogs: [
                    ...b.actionLogs,
                    {
                      id: 'log-reduced-' + Date.now(),
                      billId: b.id,
                      type: 'reduced',
                      amount: reducedAmount,
                      method: '手工减免',
                      createdAt: today,
                      operator: '王建国',
                      remark,
                    },
                  ],
                }
              : b
          ),
        }))
      },
      addDunningRecord: (billId, record) => {
        const today = new Date().toISOString().slice(0, 10)
        set((s) => ({
          bills: s.bills.map((b) =>
            b.id === billId
              ? {
                  ...b,
                  dunningRecords: [...b.dunningRecords, record],
                  actionLogs: [
                    ...b.actionLogs,
                    {
                      id: 'log-dunning-' + Date.now(),
                      billId: b.id,
                      type: 'dunning',
                      amount: b.amount - b.paidAmount - b.reducedAmount,
                      method: record.method,
                      createdAt: today,
                      operator: '王建国',
                      remark: record.remark,
                    },
                  ],
                }
              : b
          ),
        }))
      },
      addBillActionLog: (billId, log) => set((s) => ({
        bills: s.bills.map((b) =>
          b.id === billId
            ? {
                ...b,
                actionLogs: [
                  ...b.actionLogs,
                  { ...log, id: 'log-' + Date.now(), billId },
                ],
              }
            : b
        ),
      })),

      addWorkOrder: (order) => set((s) => ({ workOrders: [...s.workOrders, order] })),
      updateWorkOrder: (id, data) => set((s) => ({
        workOrders: s.workOrders.map((w) => (w.id === id ? { ...w, ...data } : w)),
      })),
      assignWorkOrder: (id, staffId) => set((s) => ({
        workOrders: s.workOrders.map((w) =>
          w.id === id ? { ...w, assignedStaffId: staffId, status: 'assigned' as WorkOrderStatus } : w
        ),
      })),
      completeWorkOrder: (id, actualMinutes, materials) => set((s) => ({
        workOrders: s.workOrders.map((w) =>
          w.id === id
            ? {
                ...w,
                status: 'completed' as WorkOrderStatus,
                completedAt: new Date().toISOString().slice(0, 10),
                actualMinutes,
                materials,
              }
            : w
        ),
      })),
      reviewWorkOrder: (id, rating, note) => set((s) => ({
        workOrders: s.workOrders.map((w) =>
          w.id === id ? { ...w, status: 'reviewed' as WorkOrderStatus, reviewRating: rating, reviewNote: note } : w
        ),
      })),

      updateRoomStatus: (id, status) => set((s) => ({
        rooms: s.rooms.map((r) => (r.id === id ? { ...r, status } : r)),
      })),

      getRoomById: (id) => get().rooms.find((r) => r.id === id),
      getBuildingById: (id) => get().buildings.find((b) => b.id === id),
      getLeaseByRoomId: (roomId) => get().leases.find((l) => l.roomId === roomId && l.status !== 'terminated'),
      getStaffById: (id) => get().staff.find((s) => s.id === id),
      getLeasesByRoomId: (roomId) => get().leases.filter((l) => l.roomId === roomId),
      getBillsByRoomId: (roomId) => get().bills.filter((b) => b.roomId === roomId).sort((a, b) => b.periodStart.localeCompare(a.periodStart)),
      getWorkOrdersByRoomId: (roomId) => get().workOrders.filter((w) => w.roomId === roomId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),

      filteredRooms: (filters) => {
        const { rooms } = get()
        return rooms.filter((r) => {
          if (filters.buildingId && r.buildingId !== filters.buildingId) return false
          if (filters.status && r.status !== filters.status) return false
          if (filters.roomId && r.id !== filters.roomId) return false
          return true
        })
      },
      filteredLeases: (filters) => {
        const { leases, rooms, buildings } = get()
        return leases.filter((l) => {
          if (filters.status && l.status !== filters.status) return false
          if (filters.roomId && l.roomId !== filters.roomId) return false
          if (filters.buildingId) {
            const room = rooms.find((r) => r.id === l.roomId)
            if (room?.buildingId !== filters.buildingId) return false
          }
          if (filters.search) {
            const room = rooms.find((r) => r.id === l.roomId)
            const building = room ? buildings.find((b) => b.id === room.buildingId) : undefined
            const searchStr = `${l.tenantName}${l.tenantPhone}${room?.roomNumber || ''}${building?.name || ''}`
            if (!searchStr.includes(filters.search)) return false
          }
          return true
        })
      },
      filteredBills: (filters) => {
        const { bills, rooms } = get()
        return bills.filter((b) => {
          if (filters.type && b.type !== filters.type) return false
          if (filters.status && b.status !== filters.status) return false
          if (filters.roomId && b.roomId !== filters.roomId) return false
          if (filters.buildingId) {
            const room = rooms.find((r) => r.id === b.roomId)
            if (room?.buildingId !== filters.buildingId) return false
          }
          if (filters.month) {
            const periodStart = b.periodStart
            if (!periodStart.startsWith(filters.month)) return false
          }
          return true
        })
      },
      filteredWorkOrders: (filters) => {
        const { workOrders, rooms, buildings } = get()
        return workOrders.filter((w) => {
          if (filters.status && w.status !== filters.status) return false
          if (filters.roomId && w.roomId !== filters.roomId) return false
          if (filters.buildingId) {
            const room = rooms.find((r) => r.id === w.roomId)
            if (room?.buildingId !== filters.buildingId) return false
          }
          if (filters.month) {
            const createdAt = w.createdAt
            if (!createdAt.startsWith(filters.month)) return false
          }
          if (filters.search) {
            const room = rooms.find((r) => r.id === w.roomId)
            const building = room ? buildings.find((b) => b.id === room.buildingId) : undefined
            const searchStr = `${w.description}${w.category}${room?.roomNumber || ''}${building?.name || ''}`
            if (!searchStr.includes(filters.search)) return false
          }
          return true
        })
      },
    }),
    {
      name: 'apartment-manager-storage',
      partialize: (state) => ({
        rooms: state.rooms,
        leases: state.leases,
        bills: state.bills,
        workOrders: state.workOrders,
      }),
    }
  )
)
