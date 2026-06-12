import { create } from 'zustand'
import type { Building, Room, Lease, Bill, WorkOrder, Staff, BillType, BillStatus, LeaseStatus, RoomStatus, WorkOrderStatus, WorkOrderUrgency } from '@/types'
import { mockBuildings, mockRooms, mockLeases, mockBills, mockWorkOrders, mockStaff } from '@/data/mock'

interface AppState {
  buildings: Building[]
  rooms: Room[]
  leases: Lease[]
  bills: Bill[]
  workOrders: WorkOrder[]
  staff: Staff[]

  addLease: (lease: Lease) => void
  updateLease: (id: string, data: Partial<Lease>) => void
  addCoTenant: (leaseId: string, coTenant: { id: string; name: string; idCard: string; phone: string; isPrimary: boolean }) => void
  removeCoTenant: (leaseId: string, coTenantId: string) => void

  addBill: (bill: Bill) => void
  updateBill: (id: string, data: Partial<Bill>) => void
  markBillPaid: (id: string, paymentMethod: string) => void
  reduceBill: (id: string, reducedAmount: number, remark: string) => void

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

  filteredRooms: (filters: { buildingId?: string; status?: RoomStatus }) => Room[]
  filteredLeases: (filters: { status?: LeaseStatus; search?: string }) => Lease[]
  filteredBills: (filters: { type?: BillType; status?: BillStatus }) => Bill[]
  filteredWorkOrders: (filters: { status?: WorkOrderStatus; search?: string }) => WorkOrder[]
}

export const useStore = create<AppState>((set, get) => ({
  buildings: mockBuildings,
  rooms: mockRooms,
  leases: mockLeases,
  bills: mockBills,
  workOrders: mockWorkOrders,
  staff: mockStaff,

  addLease: (lease) => set((s) => ({ leases: [...s.leases, lease] })),
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

  addBill: (bill) => set((s) => ({ bills: [...s.bills, bill] })),
  updateBill: (id, data) => set((s) => ({
    bills: s.bills.map((b) => (b.id === id ? { ...b, ...data } : b)),
  })),
  markBillPaid: (id, paymentMethod) => set((s) => ({
    bills: s.bills.map((b) =>
      b.id === id
        ? { ...b, status: 'paid' as BillStatus, paidAmount: b.amount - b.reducedAmount, paidAt: new Date().toISOString().slice(0, 10), paymentMethod }
        : b
    ),
  })),
  reduceBill: (id, reducedAmount, remark) => set((s) => ({
    bills: s.bills.map((b) =>
      b.id === id
        ? {
            ...b,
            reducedAmount,
            status: (b.amount - b.paidAmount - reducedAmount <= 0 ? 'reduced' : b.status) as BillStatus,
            remark: remark || b.remark,
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

  filteredRooms: (filters) => {
    const { rooms } = get()
    return rooms.filter((r) => {
      if (filters.buildingId && r.buildingId !== filters.buildingId) return false
      if (filters.status && r.status !== filters.status) return false
      return true
    })
  },
  filteredLeases: (filters) => {
    const { leases, rooms, buildings } = get()
    return leases.filter((l) => {
      if (filters.status && l.status !== filters.status) return false
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
    const { bills } = get()
    return bills.filter((b) => {
      if (filters.type && b.type !== filters.type) return false
      if (filters.status && b.status !== filters.status) return false
      return true
    })
  },
  filteredWorkOrders: (filters) => {
    const { workOrders, rooms, buildings } = get()
    return workOrders.filter((w) => {
      if (filters.status && w.status !== filters.status) return false
      if (filters.search) {
        const room = rooms.find((r) => r.id === w.roomId)
        const building = room ? buildings.find((b) => b.id === room.buildingId) : undefined
        const searchStr = `${w.description}${w.category}${room?.roomNumber || ''}${building?.name || ''}`
        if (!searchStr.includes(filters.search)) return false
      }
      return true
    })
  },
}))
