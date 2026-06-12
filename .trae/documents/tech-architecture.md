## 1. 架构设计

```mermaid
graph TB
    subgraph "前端层"
        A["React 18 SPA"] --> B["React Router"]
        B --> C["房源看板"]
        B --> D["租约管理"]
        B --> E["费用中心"]
        B --> F["维修工单"]
        B --> G["报表页"]
    end
    subgraph "数据层"
        H["Local Storage 持久化"] --> I["Mock 数据服务"]
        I --> C
        I --> D
        I --> E
        I --> F
        I --> G
    end
    subgraph "状态管理"
        J["Zustand Store"] --> K["房源状态"]
        J --> L["租约状态"]
        J --> M["费用状态"]
        J --> N["工单状态"]
        J --> O["报表状态"]
    end
```

## 2. 技术说明
- 前端框架：React 18 + TypeScript
- 样式方案：Tailwind CSS 3 + CSS Modules（局部样式覆盖）
- 构建工具：Vite
- 路由：React Router v6
- 状态管理：Zustand
- 图表库：Recharts
- 图标库：Lucide React
- 日期处理：date-fns
- 数据持久化：LocalStorage（Mock 数据，无后端依赖）
- 初始化工具：Vite init

## 3. 路由定义
| 路由 | 用途 |
|------|------|
| / | 重定向至 /dashboard |
| /dashboard | 房源看板主页 |
| /leases | 租约列表页 |
| /leases/new | 新建租约页 |
| /leases/:id | 租约详情页 |
| /finance | 费用中心列表页 |
| /maintenance | 维修工单列表页 |
| /reports | 报表页 |

## 4. 数据模型

### 4.1 数据模型定义

```mermaid
erDiagram
    "Building" ||--o{ "Room" : "contains"
    "Room" ||--o| "Lease" : "has_active"
    "Lease" ||--o{ "CoTenant" : "includes"
    "Lease" ||--o{ "RenewalRecord" : "has"
    "Room" ||--o{ "Bill" : "generates"
    "Lease" ||--o{ "Bill" : "generates"
    "Room" ||--o{ "WorkOrder" : "has"
    "Staff" ||--o{ "WorkOrder" : "assigned_to"

    "Building" {
        string id PK
        string name
        string address
        int totalRooms
    }
    "Room" {
        string id PK
        string buildingId FK
        string roomNumber
        string floor
        float area
        string status
        float monthlyRent
    }
    "Lease" {
        string id PK
        string roomId FK
        string tenantName
        string tenantIdCard
        string tenantPhone
        date startDate
        date endDate
        float deposit
        float monthlyRent
        string paymentMethod
        string status
    }
    "CoTenant" {
        string id PK
        string leaseId FK
        string name
        string idCard
        string phone
        boolean isPrimary
    }
    "RenewalRecord" {
        string id PK
        string leaseId FK
        date oldEndDate
        date newEndDate
        float newRent
        date createdAt
    }
    "Bill" {
        string id PK
        string roomId FK
        string leaseId FK
        string type
        float amount
        float paidAmount
        float reducedAmount
        string status
        date periodStart
        date periodEnd
        date dueDate
        date paidAt
        string paymentMethod
    }
    "WorkOrder" {
        string id PK
        string roomId FK
        string category
        string description
        string urgency
        string status
        string assignedStaffId FK
        date createdAt
        date completedAt
        int estimatedMinutes
        int actualMinutes
    }
    "Staff" {
        string id PK
        string name
        string role
        string phone
    }
```

### 4.2 数据定义

**Room.status 枚举值**：`vacant`（空置）、`occupied`（已入住）、`expiring`（即将到期）、`arrears`（欠费）、`configuring`（配置中）

**Lease.status 枚举值**：`active`（生效中）、`expiring`（即将到期）、`expired`（已到期）、`terminated`（已退租）

**Bill.type 枚举值**：`rent`（租金）、`water`（水费）、`electricity`（电费）、`property`（物业费）、`other`（其他）

**Bill.status 枚举值**：`unpaid`（未缴）、`paid`（已缴）、`partial`（部分缴）、`reduced`（已减免）

**WorkOrder.urgency 枚举值**：`low`（低）、`medium`（中）、`high`（高）、`urgent`（紧急）

**WorkOrder.status 枚举值**：`pending`（待分派）、`assigned`（已分派/处理中）、`completed`（已完成）、`reviewed`（已回访）

**Staff.role 枚举值**：`manager`（店长）、`butler`（管家）、`maintenance`（维修师傅）、`finance`（财务）
