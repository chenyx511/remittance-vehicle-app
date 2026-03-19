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
import {
  loadVehicles,
  loadVehicleRequests,
  loadRemittanceRequests,
  loadNotifications,
  saveVehicles,
  saveVehicleRequests,
  saveRemittanceRequests,
  saveNotifications,
} from './persistedStore';

// 从 localStorage 恢复持久化数据（刷新后保留）
const initVehicles = loadVehicles([...mockVehicles]);
mockVehicles.length = 0;
mockVehicles.push(...initVehicles);
const initRequests = loadVehicleRequests([...mockVehicleRequests]);
mockVehicleRequests.length = 0;
mockVehicleRequests.push(...initRequests);
const initNotifications = loadNotifications([...mockNotifications]);
mockNotifications.length = 0;
mockNotifications.push(...initNotifications);
const initRemittanceRequests = loadRemittanceRequests([...mockRemittanceRequests]);
mockRemittanceRequests.length = 0;
mockRemittanceRequests.push(...initRemittanceRequests);

// 模拟延迟
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });

// 当前登录用户（仅用于 mock 环境）
let currentUser: User | null = null;

// 提供一个显式的同步入口，方便从 Zustand 等状态管理中同步 mock 用户
export const setMockCurrentUser = (user: User | null) => {
  currentUser = user;
};

function appendNotification(input: Omit<Notification, 'id' | 'createdAt' | 'isRead'>) {
  const notification: Notification = {
    id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    isRead: false,
    createdAt: new Date().toISOString(),
    ...input,
  };
  mockNotifications.unshift(notification);
  saveNotifications(mockNotifications);
}

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

    // 添加汇款申请待审批通知（给审批人）
    const supervisorId = data.supervisorId || newRequest.supervisor?.id;
    if (supervisorId) {
      appendNotification({
        userId: supervisorId,
        type: 'REMITTANCE_PENDING',
        title: '新的汇款申请待审批',
        content: `${currentUser?.username || '用户'}提交了一笔${newRequest.amount}${newRequest.currency}的汇款申请`,
        relatedType: 'remittance',
        relatedId: newRequest.id,
      });
    }
    saveRemittanceRequests(mockRemittanceRequests);

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
    saveRemittanceRequests(mockRemittanceRequests);
    if (item.applicantId) {
      appendNotification({
        userId: item.applicantId,
        type: 'REMITTANCE_APPROVED',
        title: '汇款申请已批准',
        content: `您的汇款申请 ${item.requestNo} 已批准`,
        relatedType: 'remittance',
        relatedId: item.id,
      });
    }
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
    saveRemittanceRequests(mockRemittanceRequests);
    if (item.applicantId) {
      appendNotification({
        userId: item.applicantId,
        type: 'REMITTANCE_REJECTED',
        title: '汇款申请已拒绝',
        content: `您的汇款申请 ${item.requestNo} 已被拒绝`,
        relatedType: 'remittance',
        relatedId: item.id,
      });
    }
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
    saveRemittanceRequests(mockRemittanceRequests);
    if (item.applicantId) {
      appendNotification({
        userId: item.applicantId,
        type: 'REMITTANCE_COMPLETED',
        title: '汇款申请已完成',
        content: `您的汇款申请 ${item.requestNo} 已完成`,
        relatedType: 'remittance',
        relatedId: item.id,
      });
    }
    return {
      code: 200,
      message: '汇款完成',
      data: item,
    };
  },

  upload: async (file: File, type: 'settlement' | 'proof'): Promise<ApiResponse<{ url: string }>> => {
    await delay(1000);
    const url = await fileToDataUrl(file);
    void type;
    return {
      code: 200,
      message: '上传成功',
      data: {
        url,
      },
    };
  },
};

// 用车服务
export const vehicleApi = {
  getList: async (params?: {
    status?: string;
    keyword?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<PaginatedResponse<VehicleRequest>>> => {
    await delay(500);
    let list = [...mockVehicleRequests];

    if (params?.status) {
      list = list.filter((item) => item.status === params.status);
    }

    if (params?.keyword) {
      const kw = params.keyword.toLowerCase().trim();
      list = list.filter(
        (item) =>
          item.requestNo.toLowerCase().includes(kw) ||
          (item.destination?.toLowerCase().includes(kw)) ||
          (item.purpose?.toLowerCase().includes(kw)) ||
          (item.vehicle?.plateNumber?.toLowerCase().includes(kw)),
      );
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

    // 添加用车申请待审批通知（给审批人）
    const approverId = mockUsers.find((u) => u.role === 'SUPERVISOR')?.id || '2';
    const vehiclePlate = vehicle?.plateNumber || '';
    appendNotification({
      userId: approverId,
      type: 'VEHICLE_PENDING',
      title: '新的用车申请待审批',
      content: `${currentUser?.username || '用户'}申请使用${vehiclePlate}车辆`,
      relatedType: 'vehicle',
      relatedId: newRequest.id,
    });
    saveVehicleRequests(mockVehicleRequests);

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
    saveVehicleRequests(mockVehicleRequests);
    if (item.applicantId) {
      appendNotification({
        userId: item.applicantId,
        type: 'VEHICLE_APPROVED',
        title: '用车申请已批准',
        content: `您的用车申请 ${item.requestNo} 已批准`,
        relatedType: 'vehicle',
        relatedId: item.id,
      });
    }
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
    saveVehicleRequests(mockVehicleRequests);
    if (item.applicantId) {
      appendNotification({
        userId: item.applicantId,
        type: 'VEHICLE_REJECTED',
        title: '用车申请已拒绝',
        content: `您的用车申请 ${item.requestNo} 已被拒绝`,
        relatedType: 'vehicle',
        relatedId: item.id,
      });
    }
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
    saveVehicleRequests(mockVehicleRequests);
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
    saveVehicleRequests(mockVehicleRequests);
    if (item.applicantId) {
      appendNotification({
        userId: item.applicantId,
        type: 'VEHICLE_COMPLETED',
        title: '用车申请已完成',
        content: `您的用车申请 ${item.requestNo} 已完成`,
        relatedType: 'vehicle',
        relatedId: item.id,
      });
    }
    return {
      code: 200,
      message: '用车完成',
      data: item,
    };
  },

  getVehicles: async (params?: {
    status?: string;
    keyword?: string;
  }): Promise<ApiResponse<Vehicle[]>> => {
    await delay(300);
    let list = [...mockVehicles];
    if (params?.status) {
      list = list.filter((v) => v.status === params.status);
    }
    if (params?.keyword) {
      const kw = params.keyword.toLowerCase().trim();
      list = list.filter(
        (v) =>
          v.plateNumber.toLowerCase().includes(kw) ||
          (v.brand || '').toLowerCase().includes(kw) ||
          (v.model || '').toLowerCase().includes(kw) ||
          (v.color || '').toLowerCase().includes(kw),
      );
    }
    return {
      code: 200,
      message: 'success',
      data: list,
    };
  },

  createVehicle: async (data: Partial<Vehicle>): Promise<ApiResponse<Vehicle>> => {
    await delay(500);
    const plateNumber = (data.plateNumber || '').trim();
    if (!plateNumber) {
      throw new Error('请输入车牌号');
    }
    if (mockVehicles.some((v) => v.plateNumber === plateNumber)) {
      throw new Error('该车牌号已存在');
    }
    const newVehicle: Vehicle = {
      id: String(Date.now()),
      plateNumber,
      brand: data.brand,
      model: data.model,
      color: data.color,
      status: data.status || 'AVAILABLE',
    };
    mockVehicles.push(newVehicle);
    saveVehicles(mockVehicles);
    return {
      code: 200,
      message: '创建成功',
      data: newVehicle,
    };
  },

  updateVehicle: async (id: string, data: Partial<Vehicle>): Promise<ApiResponse<Vehicle>> => {
    await delay(300);
    const vehicle = mockVehicles.find((v) => v.id === id);
    if (!vehicle) {
      throw new Error('车辆不存在');
    }

    const nextPlate = (data.plateNumber ?? vehicle.plateNumber).trim();
    if (!nextPlate) {
      throw new Error('请输入车牌号');
    }
    if (mockVehicles.some((v) => v.id !== id && v.plateNumber === nextPlate)) {
      throw new Error('该车牌号已存在');
    }

    vehicle.plateNumber = nextPlate;
    vehicle.brand = data.brand ?? vehicle.brand;
    vehicle.model = data.model ?? vehicle.model;
    vehicle.color = data.color ?? vehicle.color;
    vehicle.status = data.status ?? vehicle.status;

    // 同步更新申请中的车辆快照
    mockVehicleRequests.forEach((req) => {
      if (req.vehicleId === id && req.vehicle) {
        req.vehicle.plateNumber = vehicle.plateNumber;
        req.vehicle.brand = vehicle.brand;
        req.vehicle.model = vehicle.model;
        req.vehicle.color = vehicle.color;
        req.vehicle.status = vehicle.status;
      }
    });

    saveVehicles(mockVehicles);
    saveVehicleRequests(mockVehicleRequests);
    return {
      code: 200,
      message: '更新成功',
      data: vehicle,
    };
  },

  deleteVehicle: async (id: string): Promise<ApiResponse<null>> => {
    await delay(300);
    const idx = mockVehicles.findIndex((v) => v.id === id);
    if (idx < 0) {
      throw new Error('车辆不存在');
    }
    const hasActiveRequest = mockVehicleRequests.some(
      (r) => r.vehicleId === id && ['PENDING', 'APPROVED', 'IN_USE'].includes(r.status),
    );
    if (hasActiveRequest) {
      throw new Error('该车辆存在进行中的用车申请，无法删除');
    }
    mockVehicles.splice(idx, 1);
    saveVehicles(mockVehicles);
    return {
      code: 200,
      message: '删除成功',
      data: null,
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
    const uid = currentUser?.id;
    if (uid) {
      list = list.filter((n) => n.userId === uid);
    }
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
    let list = mockNotifications;
    const uid = currentUser?.id;
    if (uid) {
      list = list.filter((n) => n.userId === uid);
    }
    const count = list.filter((n) => !n.isRead).length;
    return {
      code: 200,
      message: 'success',
      data: { count },
    };
  },

  markAsRead: async (id: string): Promise<ApiResponse<null>> => {
    await delay(200);
    const uid = currentUser?.id;
    const notification = mockNotifications.find((n) => n.id === id);
    if (notification && (!uid || notification.userId === uid)) {
      notification.isRead = true;
      saveNotifications(mockNotifications);
    }
    return {
      code: 200,
      message: 'success',
      data: null,
    };
  },

  markAllAsRead: async (): Promise<ApiResponse<null>> => {
    await delay(300);
    const uid = currentUser?.id;
    if (uid) {
      mockNotifications.forEach((n) => {
        if (n.userId === uid) n.isRead = true;
      });
    } else {
      mockNotifications.forEach((n) => (n.isRead = true));
    }
    saveNotifications(mockNotifications);
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
