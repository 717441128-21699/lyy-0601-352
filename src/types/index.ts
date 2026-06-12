export type RoomStatus = 'vacant' | 'occupied' | 'expiring' | 'arrears' | 'configuring'
export type LeaseStatus = 'active' | 'expiring' | 'expired' | 'terminated'
export type BillType = 'rent' | 'water' | 'electricity' | 'property' | 'other'
export type BillStatus = 'unpaid' | 'paid' | 'partial' | 'reduced'
export type WorkOrderUrgency = 'low' | 'medium' | 'high' | 'urgent'
export type WorkOrderStatus = 'pending' | 'assigned' | 'completed' | 'reviewed'
export type StaffRole = 'manager' | 'butler' | 'maintenance' | 'finance'

export interface Building {
  id: string
  name: string
  address: string
  totalRooms: number
}

export interface Room {
  id: string
  buildingId: string
  roomNumber: string
  floor: string
  area: number
  status: RoomStatus
  monthlyRent: number
}

export interface Lease {
  id: string
  roomId: string
  tenantName: string
  tenantIdCard: string
  tenantPhone: string
  startDate: string
  endDate: string
  deposit: number
  monthlyRent: number
  paymentMethod: string
  status: LeaseStatus
  coTenants: CoTenant[]
  renewalRecords: RenewalRecord[]
}

export interface CoTenant {
  id: string
  name: string
  idCard: string
  phone: string
  isPrimary: boolean
}

export interface RenewalRecord {
  id: string
  leaseId: string
  oldEndDate: string
  newEndDate: string
  newRent: number
  createdAt: string
}

export interface Bill {
  id: string
  roomId: string
  leaseId: string
  type: BillType
  amount: number
  paidAmount: number
  reducedAmount: number
  status: BillStatus
  periodStart: string
  periodEnd: string
  dueDate: string
  paidAt: string | null
  paymentMethod: string | null
  remark: string
}

export interface WorkOrder {
  id: string
  roomId: string
  category: string
  description: string
  urgency: WorkOrderUrgency
  status: WorkOrderStatus
  assignedStaffId: string | null
  createdAt: string
  completedAt: string | null
  estimatedMinutes: number
  actualMinutes: number | null
  photos: string[]
  materials: string
  reviewRating: number | null
  reviewNote: string
}

export interface Staff {
  id: string
  name: string
  role: StaffRole
  phone: string
}

export const ROOM_STATUS_LABELS: Record<RoomStatus, string> = {
  vacant: '空置',
  occupied: '已入住',
  expiring: '即将到期',
  arrears: '欠费',
  configuring: '配置中',
}

export const LEASE_STATUS_LABELS: Record<LeaseStatus, string> = {
  active: '生效中',
  expiring: '即将到期',
  expired: '已到期',
  terminated: '已退租',
}

export const BILL_TYPE_LABELS: Record<BillType, string> = {
  rent: '租金',
  water: '水费',
  electricity: '电费',
  property: '物业费',
  other: '其他',
}

export const BILL_STATUS_LABELS: Record<BillStatus, string> = {
  unpaid: '未缴',
  paid: '已缴',
  partial: '部分缴',
  reduced: '已减免',
}

export const WORK_ORDER_URGENCY_LABELS: Record<WorkOrderUrgency, string> = {
  low: '低',
  medium: '中',
  high: '高',
  urgent: '紧急',
}

export const WORK_ORDER_STATUS_LABELS: Record<WorkOrderStatus, string> = {
  pending: '待分派',
  assigned: '处理中',
  completed: '已完成',
  reviewed: '已回访',
}

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  manager: '店长',
  butler: '管家',
  maintenance: '维修师傅',
  finance: '财务',
}
