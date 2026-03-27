// 用户角色
export type UserRole = 'STAFF' | 'SUPERVISOR' | 'FINANCE' | 'ADMIN';

// 用户
export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  department?: string;
  position?: string;
  employmentStatus?: 'ACTIVE' | 'INACTIVE';
  phone?: string;
  avatarUrl?: string;
}

// 汇款申请状态
export type RemittanceStatus =
  | 'PENDING'
  | 'SUPERVISOR_APPROVED'
  | 'FINANCE_PROCESSING'
  | 'COMPLETED'
  | 'REJECTED';

// 汇款申请
export interface RemittanceRequest {
  id: string;
  requestNo: string;
  applicantId: string;
  applicant?: User;
  contractNo?: string;
  amount: number;
  currency: string;
  recipientName: string;
  recipientAccount?: string;
  recipientBank?: string;
  settlementDetailUrl?: string;
  status: RemittanceStatus;
  supervisorId?: string;
  supervisor?: User;
  supervisorComment?: string;
  supervisorApprovedAt?: string;
  financeId?: string;
  finance?: User;
  financeComment?: string;
  remittanceProofUrl?: string;
  remittanceDate?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// 用车申请状态
export type VehicleRequestStatus = 'PENDING' | 'APPROVED' | 'IN_USE' | 'COMPLETED' | 'REJECTED';

// 车辆状态
export type VehicleStatus = 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE';

// 车辆
export interface Vehicle {
  id: string;
  plateNumber: string;
  brand?: string;
  model?: string;
  color?: string;
  status: VehicleStatus;
}

// 用车申请
export interface VehicleRequest {
  id: string;
  requestNo: string;
  applicantId: string;
  applicant?: User;
  vehicleId: string;
  vehicle?: Vehicle;
  purpose: string;
  destination?: string;
  startTime: string;
  endTime: string;
  passengers: number;
  status: VehicleRequestStatus;
  approverId?: string;
  approver?: User;
  approverComment?: string;
  approvedAt?: string;
  actualStartTime?: string;
  actualEndTime?: string;
  mileageStart?: number;
  mileageEnd?: number;
  createdAt: string;
  updatedAt: string;
}

// 通知
export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  content?: string;
  relatedType?: 'remittance' | 'vehicle';
  relatedId?: string;
  isRead: boolean;
  createdAt: string;
}

// 审批日志
export interface ApprovalLog {
  id: string;
  requestType: 'remittance' | 'vehicle';
  requestId: string;
  approverId: string;
  approver?: User;
  action: 'approve' | 'reject' | 'transfer';
  comment?: string;
  createdAt: string;
}

// 登录凭证
export interface LoginCredentials {
  username: string;
  password: string;
}

// API响应
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

// 分页响应
export interface PaginatedResponse<T> {
  list: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
