import type { RoomStatus, LeaseStatus, BillStatus, WorkOrderStatus } from '@/types'
import { ROOM_STATUS_LABELS, LEASE_STATUS_LABELS, BILL_STATUS_LABELS, WORK_ORDER_STATUS_LABELS } from '@/types'

export function RoomStatusBadge({ status }: { status: RoomStatus }) {
  return <span className={`badge-${status}`}>{ROOM_STATUS_LABELS[status]}</span>
}

export function LeaseStatusBadge({ status }: { status: LeaseStatus }) {
  return <span className={`badge-${status}`}>{LEASE_STATUS_LABELS[status]}</span>
}

export function BillStatusBadge({ status }: { status: BillStatus }) {
  return <span className={`badge-${status}`}>{BILL_STATUS_LABELS[status]}</span>
}

export function WorkOrderStatusBadge({ status }: { status: WorkOrderStatus }) {
  return <span className={`badge-${status}`}>{WORK_ORDER_STATUS_LABELS[status]}</span>
}
