import type {
  User,
  RemittanceRequest,
  VehicleRequest,
  Vehicle,
  Notification,
  LoginCredentials,
  ApiResponse,
  PaginatedResponse,
} from '@/types';
import {
  mockUsers,
  mockRemittanceRequests,
  mockVehicleRequests,
  mockVehicles,
  mockNotifications,
} from './mockData';

// 模拟延迟
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 当前登录用户（仅用于 mock 环境）
let currentUser: User | null = null;

// 提供一个显式的同步入口，方便从 Zustand 等状态管理中同步 mock 用户
export const setMockCurrentUser = (user: User | null) => {
  currentUser = user;
};

// 认证服务
export const authApi = {
  login: async (
    credentials: LoginCredentials,
  ): Promise<ApiResponse<{ user: User; token: string }>> => {
    await delay(500);
    const user = mockUsers.find((u) => u.username === credentials.username);
    if (!user) {
      throw new Error('用户名或密码错误');
    }
    currentUser = user;
    return {
      code: 200,
      message: '登录成功',
      data: {
        user,
        token: 'mock-token-' + Date.now(),
      },
    };
  },

  register: async (data: {
    username: string;
    email: string;
    password: string;
    department?: string;
    role: 'STAFF' | 'SUPERVISOR' | 'FINANCE';
  }): Promise<ApiResponse<User>> => {
    await delay(500);

    // Check if username already exists
    if (mockUsers.find((u) => u.username === data.username)) {
      throw new Error('用户名已存在');
    }
    if (mockUsers.find((u) => u.email === data.email)) {
      throw new Error('邮箱已存在');
    }

    const newUser: User = {
      id: String(Date.now()),
      username: data.username,
      email: data.email,
      role: data.role,
      department: data.department,
      phone: '',
    };

    mockUsers.push(newUser);

    return {
      code: 200,
      message: '注册成功',
      data: newUser,
    };
  },

  logout: async (): Promise<ApiResponse<null>> => {
    await delay(300);
    currentUser = null;
    return {
      code: 200,
      message: '登出成功',
      data: null,
    };
  },

  getMe: async (): Promise<ApiResponse<User>> => {
    await delay(300);
    if (!currentUser) {
      throw new Error('未登录');
    }
    return {
      code: 200,
      message: 'success',
      data: currentUser,
    };
  },

  getCurrentUser: () => currentUser,
};

// 汇款服务
export const remittanceApi = {
  getList: async (params?: {
    status?: string;
    page?: number;
    pageSize?: number;
    keyword?: string;
  }): Promise<ApiResponse<PaginatedResponse<RemittanceRequest>>> => {
    await delay(500);
    let list = [...mockRemittanceRequests];

    if (params?.status) {
      list = list.filter((item) => item.status === params.status);
    }

    if (params?.keyword) {
      const keyword = params.keyword.toLowerCase();
      list = list.filter(
        (item) =>
          item.requestNo.toLowerCase().includes(keyword) ||
          item.recipientName.toLowerCase().includes(keyword) ||
          item.contractNo?.toLowerCase().includes(keyword),
      );
    }

    // 按时间倒序
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const page = params?.page || 1;
    const pageSize = params?.pageSize || 10;
    const total = list.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const paginatedList = list.slice(start, start + pageSize);

    return {
      code: 200,
      message: 'success',
      data: {
        list: paginatedList,
        pagination: {
          page,
          pageSize,
          total,
          totalPages,
        },
      },
    };
  },

  getById: async (id: string): Promise<ApiResponse<RemittanceRequest>> => {
    await delay(300);
    const item = mockRemittanceRequests.find((r) => r.id === id);
    if (!item) {
      throw new Error('申请不存在');
    }
    return {
      code: 200,
      message: 'success',
      data: item,
    };
  },

  create: async (data: Partial<RemittanceRequest>): Promise<ApiResponse<RemittanceRequest>> => {
    await delay(500);
    const newRequest: RemittanceRequest = {
      id: String(Date.now()),
      requestNo: `RM-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(mockRemittanceRequests.length + 1).padStart(3, '0')}`,
      applicantId: currentUser?.id || '1',
      applicant: currentUser || mockUsers[0],
      amount: data.amount || 0,
      currency: data.currency || 'CNY',
      recipientName: data.recipientName || '',
      recipientAccount: data.recipientAccount,
      recipientBank: data.recipientBank,
      settlementDetailUrl: data.settlementDetailUrl,
      contractNo: data.contractNo,
      status: 'PENDING',
      supervisorId: data.supervisorId,
      supervisor: mockUsers.find((u) => u.id === data.supervisorId),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockRemittanceRequests.unshift(newRequest);
    return {
      code: 200,
      message: '创建成功',
      data: newRequest,
    };
  },

  approve: async (id: string, comment?: string): Promise<ApiResponse<RemittanceRequest>> => {
    await delay(300);
    const item = mockRemittanceRequests.find((r) => r.id === id);
    if (!item) {
      throw new Error('申请不存在');
    }
    item.status = 'SUPERVISOR_APPROVED';
    item.supervisorComment = comment;
    item.supervisorApprovedAt = new Date().toISOString();
    item.supervisorId = currentUser?.id;
    item.supervisor = currentUser || mockUsers[1];
    item.updatedAt = new Date().toISOString();
    return {
      code: 200,
      message: '审批成功',
      data: item,
    };
  },

  reject: async (id: string, comment?: string): Promise<ApiResponse<RemittanceRequest>> => {
    await delay(300);
    const item = mockRemittanceRequests.find((r) => r.id === id);
    if (!item) {
      throw new Error('申请不存在');
    }
    item.status = 'REJECTED';
    item.supervisorComment = comment;
    item.supervisorApprovedAt = new Date().toISOString();
    item.supervisorId = currentUser?.id;
    item.supervisor = currentUser || mockUsers[1];
    item.updatedAt = new Date().toISOString();
    return {
      code: 200,
      message: '已拒绝',
      data: item,
    };
  },

  complete: async (
    id: string,
    data: { remittanceProofUrl?: string; remittanceDate?: string; comment?: string },
  ): Promise<ApiResponse<RemittanceRequest>> => {
    await delay(300);
    const item = mockRemittanceRequests.find((r) => r.id === id);
    if (!item) {
      throw new Error('申请不存在');
    }
    item.status = 'COMPLETED';
    item.remittanceProofUrl = data.remittanceProofUrl;
    item.remittanceDate = data.remittanceDate;
    item.financeComment = data.comment;
    item.financeId = currentUser?.id;
    item.finance = currentUser || mockUsers[2];
    item.completedAt = new Date().toISOString();
    item.updatedAt = new Date().toISOString();
    return {
      code: 200,
      message: '汇款完成',
      data: item,
    };
  },

  upload: async (file: File, type: 'settlement' | 'proof'): Promise<ApiResponse<{ url: string }>> => {
    await delay(1000);
    // 参数目前仅用于占位，方便未来接入真实上传接口
    void file;
    void type;
    // 模拟上传，返回一个随机图片URL
    const urls = [
      'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800',
      'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800',
      'https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=800',
    ];
    return {
      code: 200,
      message: '上传成功',
      data: {
        url: urls[Math.floor(Math.random() * urls.length)],
      },
    };
  },
};

// 用车服务
export const vehicleApi = {
  getList: async (params?: {
    status?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<PaginatedResponse<VehicleRequest>>> => {
    await delay(500);
    let list = [...mockVehicleRequests];

    if (params?.status) {
      list = list.filter((item) => item.status === params.status);
    }

    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const page = params?.page || 1;
    const pageSize = params?.pageSize || 10;
    const total = list.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const paginatedList = list.slice(start, start + pageSize);

    return {
      code: 200,
      message: 'success',
      data: {
        list: paginatedList,
        pagination: {
          page,
          pageSize,
          total,
          totalPages,
        },
      },
    };
  },

  getById: async (id: string): Promise<ApiResponse<VehicleRequest>> => {
    await delay(300);
    const item = mockVehicleRequests.find((r) => r.id === id);
    if (!item) {
      throw new Error('申请不存在');
    }
    return {
      code: 200,
      message: 'success',
      data: item,
    };
  },

  create: async (data: Partial<VehicleRequest>): Promise<ApiResponse<VehicleRequest>> => {
    await delay(500);
    const vehicle = mockVehicles.find((v) => v.id === data.vehicleId);
    const newRequest: VehicleRequest = {
      id: String(Date.now()),
      requestNo: `VH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(mockVehicleRequests.length + 1).padStart(3, '0')}`,
      applicantId: currentUser?.id || '1',
      applicant: currentUser || mockUsers[0],
      vehicleId: data.vehicleId || '',
      vehicle,
      purpose: data.purpose || '',
      destination: data.destination,
      startTime: data.startTime || new Date().toISOString(),
      endTime: data.endTime || new Date().toISOString(),
      passengers: data.passengers || 1,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockVehicleRequests.unshift(newRequest);
    return {
      code: 200,
      message: '创建成功',
      data: newRequest,
    };
  },

  approve: async (id: string, comment?: string): Promise<ApiResponse<VehicleRequest>> => {
    await delay(300);
    const item = mockVehicleRequests.find((r) => r.id === id);
    if (!item) {
      throw new Error('申请不存在');
    }
    item.status = 'APPROVED';
    item.approverComment = comment;
    item.approvedAt = new Date().toISOString();
    item.approverId = currentUser?.id;
    item.approver = currentUser || mockUsers[1];
    item.updatedAt = new Date().toISOString();
    return {
      code: 200,
      message: '审批成功',
      data: item,
    };
  },

  reject: async (id: string, comment?: string): Promise<ApiResponse<VehicleRequest>> => {
    await delay(300);
    const item = mockVehicleRequests.find((r) => r.id === id);
    if (!item) {
      throw new Error('申请不存在');
    }
    item.status = 'REJECTED';
    item.approverComment = comment;
    item.approvedAt = new Date().toISOString();
    item.approverId = currentUser?.id;
    item.approver = currentUser || mockUsers[1];
    item.updatedAt = new Date().toISOString();
    return {
      code: 200,
      message: '已拒绝',
      data: item,
    };
  },

  start: async (id: string, mileageStart?: number): Promise<ApiResponse<VehicleRequest>> => {
    await delay(300);
    const item = mockVehicleRequests.find((r) => r.id === id);
    if (!item) {
      throw new Error('申请不存在');
    }
    item.status = 'IN_USE';
    item.actualStartTime = new Date().toISOString();
    item.mileageStart = mileageStart;
    item.updatedAt = new Date().toISOString();
    if (item.vehicle) {
      item.vehicle.status = 'IN_USE';
    }
    return {
      code: 200,
      message: '已开始用车',
      data: item,
    };
  },

  complete: async (id: string, mileageEnd?: number): Promise<ApiResponse<VehicleRequest>> => {
    await delay(300);
    const item = mockVehicleRequests.find((r) => r.id === id);
    if (!item) {
      throw new Error('申请不存在');
    }
    item.status = 'COMPLETED';
    item.actualEndTime = new Date().toISOString();
    item.mileageEnd = mileageEnd;
    item.updatedAt = new Date().toISOString();
    if (item.vehicle) {
      item.vehicle.status = 'AVAILABLE';
    }
    return {
      code: 200,
      message: '用车完成',
      data: item,
    };
  },

  getVehicles: async (): Promise<ApiResponse<Vehicle[]>> => {
    await delay(300);
    return {
      code: 200,
      message: 'success',
      data: mockVehicles,
    };
  },

  getSchedule: async (
    vehicleId: string,
    startDate: string,
    endDate: string,
  ): Promise<ApiResponse<VehicleRequest[]>> => {
    await delay(300);
    const schedules = mockVehicleRequests.filter(
      (r) =>
        r.vehicleId === vehicleId &&
        r.status !== 'REJECTED' &&
        new Date(r.startTime) <= new Date(endDate) &&
        new Date(r.endTime) >= new Date(startDate),
    );
    return {
      code: 200,
      message: 'success',
      data: schedules,
    };
  },
};

// 通知服务
export const notificationApi = {
  getList: async (params?: { isRead?: boolean }): Promise<ApiResponse<Notification[]>> => {
    await delay(300);
    let list = [...mockNotifications];
    if (params?.isRead !== undefined) {
      list = list.filter((n) => n.isRead === params.isRead);
    }
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return {
      code: 200,
      message: 'success',
      data: list,
    };
  },

  getUnreadCount: async (): Promise<ApiResponse<{ count: number }>> => {
    await delay(200);
    const count = mockNotifications.filter((n) => !n.isRead).length;
    return {
      code: 200,
      message: 'success',
      data: { count },
    };
  },

  markAsRead: async (id: string): Promise<ApiResponse<null>> => {
    await delay(200);
    const notification = mockNotifications.find((n) => n.id === id);
    if (notification) {
      notification.isRead = true;
    }
    return {
      code: 200,
      message: 'success',
      data: null,
    };
  },

  markAllAsRead: async (): Promise<ApiResponse<null>> => {
    await delay(300);
    mockNotifications.forEach((n) => (n.isRead = true));
    return {
      code: 200,
      message: 'success',
      data: null,
    };
  },
};

// 用户服务
export const userApi = {
  getList: async (): Promise<ApiResponse<User[]>> => {
    await delay(300);
    return {
      code: 200,
      message: 'success',
      data: mockUsers,
    };
  },

  getSupervisors: async (): Promise<ApiResponse<User[]>> => {
    await delay(300);
    const supervisors = mockUsers.filter((u) => u.role === 'SUPERVISOR');
    return {
      code: 200,
      message: 'success',
      data: supervisors,
    };
  },
};
