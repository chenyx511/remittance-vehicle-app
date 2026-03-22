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
import { supabase } from '@/lib/supabase';
import { verifyPassword, hashPassword } from '@/lib/password';

/** 仅在被动态导入时使用，此时 supabase 已配置 */
if (!supabase) throw new Error('Supabase is not configured');

let currentUser: User | null = null;

export const setMockCurrentUser = (user: User | null) => {
  currentUser = user;
};

function toUser(row: Record<string, unknown> | null): User | undefined {
  if (!row) return undefined;
  return {
    id: String(row.id),
    username: String(row.username),
    email: String(row.email),
    role: row.role as User['role'],
    department: row.department as string | undefined,
    phone: row.phone as string | undefined,
    avatarUrl: row.avatar_url as string | undefined,
  };
}

function toVehicle(row: Record<string, unknown> | null): Vehicle | undefined {
  if (!row) return undefined;
  return {
    id: String(row.id),
    plateNumber: String(row.plate_number),
    brand: row.brand as string | undefined,
    model: row.model as string | undefined,
    color: row.color as string | undefined,
    status: (row.status as Vehicle['status']) || 'AVAILABLE',
  };
}

function toRemittanceRequest(
  row: Record<string, unknown>,
  users: Map<string, User>
): RemittanceRequest {
  const applicant = row.applicant_id ? users.get(String(row.applicant_id)) : undefined;
  const supervisor = row.supervisor_id ? users.get(String(row.supervisor_id)) : undefined;
  const finance = row.finance_id ? users.get(String(row.finance_id)) : undefined;
  return {
    id: String(row.id),
    requestNo: String(row.request_no),
    applicantId: String(row.applicant_id),
    applicant,
    amount: Number(row.amount) || 0,
    currency: String(row.currency || 'CNY'),
    recipientName: String(row.recipient_name || ''),
    recipientAccount: row.recipient_account as string | undefined,
    recipientBank: row.recipient_bank as string | undefined,
    settlementDetailUrl: row.settlement_detail_url as string | undefined,
    contractNo: row.contract_no as string | undefined,
    status: row.status as RemittanceRequest['status'],
    supervisorId: row.supervisor_id as string | undefined,
    supervisor,
    supervisorComment: row.supervisor_comment as string | undefined,
    supervisorApprovedAt: row.supervisor_approved_at as string | undefined,
    financeId: row.finance_id as string | undefined,
    finance,
    financeComment: row.finance_comment as string | undefined,
    remittanceProofUrl: row.remittance_proof_url as string | undefined,
    remittanceDate: row.remittance_date as string | undefined,
    completedAt: row.completed_at as string | undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function toVehicleRequest(
  row: Record<string, unknown>,
  users: Map<string, User>,
  vehicles: Map<string, Vehicle>
): VehicleRequest {
  const applicant = row.applicant_id ? users.get(String(row.applicant_id)) : undefined;
  const approver = row.approver_id ? users.get(String(row.approver_id)) : undefined;
  const vehicle = row.vehicle_id ? vehicles.get(String(row.vehicle_id)) : undefined;
  return {
    id: String(row.id),
    requestNo: String(row.request_no),
    applicantId: String(row.applicant_id),
    applicant,
    vehicleId: String(row.vehicle_id),
    vehicle,
    purpose: String(row.purpose || ''),
    destination: row.destination as string | undefined,
    startTime: String(row.start_time),
    endTime: String(row.end_time),
    passengers: Number(row.passengers) || 1,
    status: row.status as VehicleRequest['status'],
    approverId: row.approver_id as string | undefined,
    approver: approver,
    approverComment: row.approver_comment as string | undefined,
    approvedAt: row.approved_at as string | undefined,
    actualStartTime: row.actual_start_time as string | undefined,
    actualEndTime: row.actual_end_time as string | undefined,
    mileageStart: row.mileage_start != null ? Number(row.mileage_start) : undefined,
    mileageEnd: row.mileage_end != null ? Number(row.mileage_end) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

async function fetchUsersMap(): Promise<Map<string, User>> {
  const { data } = await supabase!.from('users').select('*');
  const map = new Map<string, User>();
  for (const row of data || []) {
    const u = toUser(row);
    if (u) map.set(u.id, u);
  }
  return map;
}

async function fetchVehiclesMap(): Promise<Map<string, Vehicle>> {
  const { data } = await supabase!.from('vehicles').select('*');
  const map = new Map<string, Vehicle>();
  for (const row of data || []) {
    const v = toVehicle(row);
    if (v) map.set(v.id, v);
  }
  return map;
}

export const authApi = {
  login: async (
    credentials: LoginCredentials
  ): Promise<ApiResponse<{ user: User; token: string }>> => {
    const { data, error } = await supabase!
      .from('users')
      .select('*')
      .eq('username', credentials.username)
      .single();
    if (error || !data) {
      throw new Error('用户名或密码错误');
    }
    const passwordHash = data.password_hash as string | null;
    if (passwordHash) {
      const ok = await verifyPassword(credentials.password, passwordHash);
      if (!ok) throw new Error('用户名或密码错误');
    }
    const user = toUser(data);
    if (!user) throw new Error('用户名或密码错误');
    currentUser = user;
    return {
      code: 200,
      message: '登录成功',
      data: { user, token: 'supabase-' + Date.now() },
    };
  },

  register: async (data: {
    username: string;
    email: string;
    password: string;
    department?: string;
    role: 'STAFF' | 'SUPERVISOR' | 'FINANCE';
  }): Promise<ApiResponse<User>> => {
    const { data: byUsername } = await supabase!
      .from('users')
      .select('id')
      .eq('username', data.username)
      .maybeSingle();
    if (byUsername) throw new Error('用户名已存在');
    const { data: byEmail } = await supabase!
      .from('users')
      .select('id')
      .eq('email', data.email)
      .maybeSingle();
    if (byEmail) throw new Error('邮箱已存在');
    const passwordHash = await hashPassword(data.password);
    const newUser: User = {
      id: String(Date.now()),
      username: data.username,
      email: data.email,
      role: data.role,
      department: data.department,
      phone: '',
    };
    const { error } = await supabase!.from('users').insert({
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      password_hash: passwordHash,
      role: newUser.role,
      department: newUser.department,
    });
    if (error) throw new Error(error.message);
    return { code: 200, message: '注册成功', data: newUser };
  },

  logout: async (): Promise<ApiResponse<null>> => {
    currentUser = null;
    return { code: 200, message: '登出成功', data: null };
  },

  getMe: async (): Promise<ApiResponse<User>> => {
    if (!currentUser) throw new Error('未登录');
    return { code: 200, message: 'success', data: currentUser };
  },

  getCurrentUser: () => currentUser,

  updateCredentials: async (data: {
    currentPassword: string;
    newUsername?: string;
    newPassword?: string;
  }): Promise<ApiResponse<User>> => {
    if (!currentUser || currentUser.role !== 'ADMIN' || currentUser.id !== 'admin') {
      throw new Error('仅预设管理员可修改账号');
    }
    const { data: row, error: fetchErr } = await supabase!
      .from('users')
      .select('password_hash')
      .eq('id', 'admin')
      .single();
    if (fetchErr || !row?.password_hash) throw new Error('密码校验失败');
    const ok = await verifyPassword(data.currentPassword, row.password_hash);
    if (!ok) throw new Error('当前密码错误');
    const updates: { username?: string; password_hash?: string } = {};
    if (data.newUsername?.trim()) {
      const { data: existing } = await supabase!
        .from('users')
        .select('id')
        .eq('username', data.newUsername.trim())
        .neq('id', 'admin')
        .maybeSingle();
      if (existing) throw new Error('用户名已存在');
      updates.username = data.newUsername.trim();
    }
    if (data.newPassword) {
      updates.password_hash = await hashPassword(data.newPassword);
    }
    if (Object.keys(updates).length === 0) {
      return { code: 200, message: 'success', data: currentUser };
    }
    const { data: updated, error } = await supabase!
      .from('users')
      .update(updates)
      .eq('id', 'admin')
      .select()
      .single();
    if (error) throw new Error(error.message);
    const user = toUser(updated);
    if (!user) throw new Error('更新失败');
    currentUser = user;
    return { code: 200, message: '更新成功', data: user };
  },
};

export const remittanceApi = {
  getList: async (params?: {
    status?: string;
    page?: number;
    pageSize?: number;
    keyword?: string;
  }): Promise<ApiResponse<PaginatedResponse<RemittanceRequest>>> => {
    let q = supabase!.from('remittance_requests').select('*').order('created_at', { ascending: false });
    if (params?.status) q = q.eq('status', params.status);
    if (params?.keyword) {
      const kw = params.keyword.toLowerCase();
      q = q.or(`request_no.ilike.%${kw}%,recipient_name.ilike.%${kw}%,contract_no.ilike.%${kw}%`);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const users = await fetchUsersMap();
    const list = (rows || []).map((r) => toRemittanceRequest(r, users));
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 10;
    const total = list.length;
    const start = (page - 1) * pageSize;
    const paginatedList = list.slice(start, start + pageSize);
    return {
      code: 200,
      message: 'success',
      data: {
        list: paginatedList,
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      },
    };
  },

  getById: async (id: string): Promise<ApiResponse<RemittanceRequest>> => {
    const { data, error } = await supabase!
      .from('remittance_requests')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) throw new Error('申请不存在');
    const users = await fetchUsersMap();
    return { code: 200, message: 'success', data: toRemittanceRequest(data, users) };
  },

  create: async (data: Partial<RemittanceRequest>): Promise<ApiResponse<RemittanceRequest>> => {
    const users = await fetchUsersMap();
    const { count } = await supabase!
      .from('remittance_requests')
      .select('*', { count: 'exact', head: true });
    const requestNo = `RM-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String((count || 0) + 1).padStart(3, '0')}`;
    const id = String(Date.now());
    const now = new Date().toISOString();
    const supervisorId =
      data.supervisorId ||
      Array.from(users.values()).find((u) => u.role === 'SUPERVISOR')?.id;
    const row = {
      id,
      request_no: requestNo,
      applicant_id: currentUser?.id || '1',
      amount: data.amount ?? 0,
      currency: data.currency || 'CNY',
      recipient_name: data.recipientName || '',
      recipient_account: data.recipientAccount,
      recipient_bank: data.recipientBank,
      settlement_detail_url: data.settlementDetailUrl,
      contract_no: data.contractNo,
      status: 'PENDING',
      supervisor_id: supervisorId,
      created_at: now,
      updated_at: now,
    };
    const { error } = await supabase!.from('remittance_requests').insert(row);
    if (error) throw new Error(error.message);
    if (supervisorId) {
      await supabase!.from('notifications').insert({
        id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        user_id: supervisorId,
        type: 'REMITTANCE_PENDING',
        title: '新的汇款申请待审批',
        content: `${currentUser?.username || '用户'}提交了一笔${row.amount}${row.currency}的汇款申请`,
        related_type: 'remittance',
        related_id: id,
        is_read: false,
      });
    }
    const item = toRemittanceRequest({ ...row, created_at: now, updated_at: now }, users);
    item.applicant = currentUser || users.get(row.applicant_id);
    item.supervisor = data.supervisorId ? users.get(data.supervisorId) : undefined;
    return { code: 200, message: '创建成功', data: item };
  },

  approve: async (id: string, comment?: string): Promise<ApiResponse<RemittanceRequest>> => {
    const now = new Date().toISOString();
    const { data: existing, error: fetchErr } = await supabase!
      .from('remittance_requests')
      .select('*')
      .eq('id', id)
      .single();
    if (fetchErr || !existing) throw new Error('申请不存在');
    const { error } = await supabase!
      .from('remittance_requests')
      .update({
        status: 'SUPERVISOR_APPROVED',
        supervisor_comment: comment,
        supervisor_approved_at: now,
        supervisor_id: currentUser?.id,
        updated_at: now,
      })
      .eq('id', id);
    if (error) throw new Error(error.message);
    await supabase!.from('notifications').insert({
      id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      user_id: existing.applicant_id,
      type: 'REMITTANCE_APPROVED',
      title: '汇款申请已批准',
      content: `您的汇款申请 ${existing.request_no} 已批准`,
      related_type: 'remittance',
      related_id: id,
      is_read: false,
    });
    return remittanceApi.getById(id);
  },

  reject: async (id: string, comment?: string): Promise<ApiResponse<RemittanceRequest>> => {
    const now = new Date().toISOString();
    const { data: existing, error: fetchErr } = await supabase!
      .from('remittance_requests')
      .select('*')
      .eq('id', id)
      .single();
    if (fetchErr || !existing) throw new Error('申请不存在');
    const { error } = await supabase!
      .from('remittance_requests')
      .update({
        status: 'REJECTED',
        supervisor_comment: comment,
        supervisor_approved_at: now,
        supervisor_id: currentUser?.id,
        updated_at: now,
      })
      .eq('id', id);
    if (error) throw new Error(error.message);
    await supabase!.from('notifications').insert({
      id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      user_id: existing.applicant_id,
      type: 'REMITTANCE_REJECTED',
      title: '汇款申请已拒绝',
      content: `您的汇款申请 ${existing.request_no} 已被拒绝`,
      related_type: 'remittance',
      related_id: id,
      is_read: false,
    });
    return remittanceApi.getById(id);
  },

  complete: async (
    id: string,
    data: { remittanceProofUrl?: string; remittanceDate?: string; comment?: string }
  ): Promise<ApiResponse<RemittanceRequest>> => {
    const now = new Date().toISOString();
    const { data: existing, error: fetchErr } = await supabase!
      .from('remittance_requests')
      .select('*')
      .eq('id', id)
      .single();
    if (fetchErr || !existing) throw new Error('申请不存在');
    const { error } = await supabase!
      .from('remittance_requests')
      .update({
        status: 'COMPLETED',
        remittance_proof_url: data.remittanceProofUrl,
        remittance_date: data.remittanceDate,
        finance_comment: data.comment,
        finance_id: currentUser?.id,
        completed_at: now,
        updated_at: now,
      })
      .eq('id', id);
    if (error) throw new Error(error.message);
    await supabase!.from('notifications').insert({
      id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      user_id: existing.applicant_id,
      type: 'REMITTANCE_COMPLETED',
      title: '汇款申请已完成',
      content: `您的汇款申请 ${existing.request_no} 已完成`,
      related_type: 'remittance',
      related_id: id,
      is_read: false,
    });
    return remittanceApi.getById(id);
  },

  upload: async (): Promise<ApiResponse<{ url: string }>> => {
    throw new Error('上传请使用 Vercel API，supabaseApi 不实现 upload');
  },
};

export const vehicleApi = {
  getList: async (params?: {
    status?: string;
    keyword?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<PaginatedResponse<VehicleRequest>>> => {
    let q = supabase!.from('vehicle_requests').select('*').order('created_at', { ascending: false });
    if (params?.status) q = q.eq('status', params.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const users = await fetchUsersMap();
    const vehicles = await fetchVehiclesMap();
    let list = (rows || []).map((r) => toVehicleRequest(r, users, vehicles));
    if (params?.keyword) {
      const kw = params.keyword.toLowerCase();
      list = list.filter(
        (r) =>
          r.requestNo.toLowerCase().includes(kw) ||
          r.destination?.toLowerCase().includes(kw) ||
          r.purpose?.toLowerCase().includes(kw) ||
          r.vehicle?.plateNumber?.toLowerCase().includes(kw)
      );
    }
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 10;
    const total = list.length;
    const start = (page - 1) * pageSize;
    const paginatedList = list.slice(start, start + pageSize);
    return {
      code: 200,
      message: 'success',
      data: {
        list: paginatedList,
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      },
    };
  },

  getById: async (id: string): Promise<ApiResponse<VehicleRequest>> => {
    const { data, error } = await supabase!
      .from('vehicle_requests')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) throw new Error('申请不存在');
    const users = await fetchUsersMap();
    const vehicles = await fetchVehiclesMap();
    return {
      code: 200,
      message: 'success',
      data: toVehicleRequest(data, users, vehicles),
    };
  },

  create: async (data: Partial<VehicleRequest>): Promise<ApiResponse<VehicleRequest>> => {
    const users = await fetchUsersMap();
    const vehicles = await fetchVehiclesMap();
    const vehicle = data.vehicleId ? vehicles.get(data.vehicleId) : undefined;
    const { count } = await supabase!
      .from('vehicle_requests')
      .select('*', { count: 'exact', head: true });
    const requestNo = `VH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String((count || 0) + 1).padStart(3, '0')}`;
    const id = String(Date.now());
    const now = new Date().toISOString();
    const row = {
      id,
      request_no: requestNo,
      applicant_id: currentUser?.id || '1',
      vehicle_id: data.vehicleId || '',
      purpose: data.purpose || '',
      destination: data.destination,
      start_time: data.startTime || now,
      end_time: data.endTime || now,
      passengers: data.passengers ?? 1,
      status: 'PENDING',
      created_at: now,
      updated_at: now,
    };
    const { error } = await supabase!.from('vehicle_requests').insert(row);
    if (error) throw new Error(error.message);
    const approverId = Array.from(users.values()).find((u) => u.role === 'SUPERVISOR')?.id || '2';
    await supabase!.from('notifications').insert({
      id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      user_id: approverId,
      type: 'VEHICLE_PENDING',
      title: '新的用车申请待审批',
      content: `${currentUser?.username || '用户'}申请使用${vehicle?.plateNumber || ''}车辆`,
      related_type: 'vehicle',
      related_id: id,
      is_read: false,
    });
    const item = toVehicleRequest(
      { ...row, created_at: now, updated_at: now },
      users,
      vehicles
    );
    item.applicant = currentUser ?? undefined;
    item.vehicle = vehicle;
    return { code: 200, message: '创建成功', data: item };
  },

  approve: async (id: string, comment?: string): Promise<ApiResponse<VehicleRequest>> => {
    const now = new Date().toISOString();
    const { data: existing, error: fetchErr } = await supabase!
      .from('vehicle_requests')
      .select('*')
      .eq('id', id)
      .single();
    if (fetchErr || !existing) throw new Error('申请不存在');
    const { error } = await supabase!
      .from('vehicle_requests')
      .update({
        status: 'APPROVED',
        approver_comment: comment,
        approved_at: now,
        approver_id: currentUser?.id,
        updated_at: now,
      })
      .eq('id', id);
    if (error) throw new Error(error.message);
    await supabase!.from('notifications').insert({
      id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      user_id: existing.applicant_id,
      type: 'VEHICLE_APPROVED',
      title: '用车申请已批准',
      content: `您的用车申请 ${existing.request_no} 已批准`,
      related_type: 'vehicle',
      related_id: id,
      is_read: false,
    });
    return vehicleApi.getById(id);
  },

  reject: async (id: string, comment?: string): Promise<ApiResponse<VehicleRequest>> => {
    const now = new Date().toISOString();
    const { data: existing, error: fetchErr } = await supabase!
      .from('vehicle_requests')
      .select('*')
      .eq('id', id)
      .single();
    if (fetchErr || !existing) throw new Error('申请不存在');
    const { error } = await supabase!
      .from('vehicle_requests')
      .update({
        status: 'REJECTED',
        approver_comment: comment,
        approved_at: now,
        approver_id: currentUser?.id,
        updated_at: now,
      })
      .eq('id', id);
    if (error) throw new Error(error.message);
    await supabase!.from('notifications').insert({
      id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      user_id: existing.applicant_id,
      type: 'VEHICLE_REJECTED',
      title: '用车申请已拒绝',
      content: `您的用车申请 ${existing.request_no} 已被拒绝`,
      related_type: 'vehicle',
      related_id: id,
      is_read: false,
    });
    return vehicleApi.getById(id);
  },

  start: async (id: string, mileageStart?: number): Promise<ApiResponse<VehicleRequest>> => {
    const now = new Date().toISOString();
    const { data: existing, error: fetchErr } = await supabase!
      .from('vehicle_requests')
      .select('*')
      .eq('id', id)
      .single();
    if (fetchErr || !existing) throw new Error('申请不存在');
    const { error } = await supabase!
      .from('vehicle_requests')
      .update({
        status: 'IN_USE',
        actual_start_time: now,
        mileage_start: mileageStart,
        updated_at: now,
      })
      .eq('id', id);
    if (error) throw new Error(error.message);
    await supabase!
      .from('vehicles')
      .update({ status: 'IN_USE' })
      .eq('id', existing.vehicle_id);
    return vehicleApi.getById(id);
  },

  complete: async (id: string, mileageEnd?: number): Promise<ApiResponse<VehicleRequest>> => {
    const now = new Date().toISOString();
    const { data: existing, error: fetchErr } = await supabase!
      .from('vehicle_requests')
      .select('*')
      .eq('id', id)
      .single();
    if (fetchErr || !existing) throw new Error('申请不存在');
    const { error } = await supabase!
      .from('vehicle_requests')
      .update({
        status: 'COMPLETED',
        actual_end_time: now,
        mileage_end: mileageEnd,
        updated_at: now,
      })
      .eq('id', id);
    if (error) throw new Error(error.message);
    await supabase!
      .from('vehicles')
      .update({ status: 'AVAILABLE' })
      .eq('id', existing.vehicle_id);
    await supabase!.from('notifications').insert({
      id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      user_id: existing.applicant_id,
      type: 'VEHICLE_COMPLETED',
      title: '用车申请已完成',
      content: `您的用车申请 ${existing.request_no} 已完成`,
      related_type: 'vehicle',
      related_id: id,
      is_read: false,
    });
    return vehicleApi.getById(id);
  },

  getVehicles: async (params?: {
    status?: string;
    keyword?: string;
  }): Promise<ApiResponse<Vehicle[]>> => {
    let q = supabase!.from('vehicles').select('*');
    if (params?.status) q = q.eq('status', params.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    let list = (rows || []).map((r) => toVehicle(r)!).filter(Boolean);
    if (params?.keyword) {
      const kw = params.keyword.toLowerCase();
      list = list.filter(
        (v) =>
          v.plateNumber.toLowerCase().includes(kw) ||
          (v.brand || '').toLowerCase().includes(kw) ||
          (v.model || '').toLowerCase().includes(kw) ||
          (v.color || '').toLowerCase().includes(kw)
      );
    }
    return { code: 200, message: 'success', data: list };
  },

  createVehicle: async (data: Partial<Vehicle>): Promise<ApiResponse<Vehicle>> => {
    const plateNumber = (data.plateNumber || '').trim();
    if (!plateNumber) throw new Error('请输入车牌号');
    const { data: existing } = await supabase!
      .from('vehicles')
      .select('id')
      .eq('plate_number', plateNumber)
      .maybeSingle();
    if (existing) throw new Error('该车牌号已存在');
    const id = String(Date.now());
    const row = {
      id,
      plate_number: plateNumber,
      brand: data.brand,
      model: data.model,
      color: data.color,
      status: data.status || 'AVAILABLE',
    };
    const { error } = await supabase!.from('vehicles').insert(row);
    if (error) throw new Error(error.message);
    return { code: 200, message: '创建成功', data: toVehicle(row)! };
  },

  updateVehicle: async (id: string, data: Partial<Vehicle>): Promise<ApiResponse<Vehicle>> => {
    const { data: existing, error: fetchErr } = await supabase!
      .from('vehicles')
      .select('*')
      .eq('id', id)
      .single();
    if (fetchErr || !existing) throw new Error('车辆不存在');
    const nextPlate = (data.plateNumber ?? existing.plate_number).trim();
    if (!nextPlate) throw new Error('请输入车牌号');
    const { data: dup } = await supabase!
      .from('vehicles')
      .select('id')
      .eq('plate_number', nextPlate)
      .neq('id', id)
      .maybeSingle();
    if (dup) throw new Error('该车牌号已存在');
    const { data: updated, error } = await supabase!
      .from('vehicles')
      .update({
        plate_number: nextPlate,
        brand: data.brand ?? existing.brand,
        model: data.model ?? existing.model,
        color: data.color ?? existing.color,
        status: data.status ?? existing.status,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    const v = toVehicle(updated);
    if (!v) throw new Error('更新失败');
    return { code: 200, message: '更新成功', data: v };
  },

  deleteVehicle: async (id: string): Promise<ApiResponse<null>> => {
    const { data: activeList } = await supabase!
      .from('vehicle_requests')
      .select('id')
      .eq('vehicle_id', id)
      .in('status', ['PENDING', 'APPROVED', 'IN_USE'])
      .limit(1);
    if (activeList && activeList.length > 0) throw new Error('该车辆存在进行中的用车申请，无法删除');
    const { error } = await supabase!.from('vehicles').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return { code: 200, message: '删除成功', data: null };
  },

  getSchedule: async (
    vehicleId: string,
    startDate: string,
    endDate: string
  ): Promise<ApiResponse<VehicleRequest[]>> => {
    const { data: rows, error } = await supabase!
      .from('vehicle_requests')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .neq('status', 'REJECTED')
      .lte('start_time', endDate)
      .gte('end_time', startDate)
      .order('start_time', { ascending: true });
    if (error) throw new Error(error.message);
    const users = await fetchUsersMap();
    const vehicles = await fetchVehiclesMap();
    const list = (rows || []).map((r) => toVehicleRequest(r, users, vehicles));
    return { code: 200, message: 'success', data: list };
  },
};

export const notificationApi = {
  getList: async (params?: { isRead?: boolean }): Promise<ApiResponse<Notification[]>> => {
    if (!currentUser?.id) return { code: 200, message: 'success', data: [] };
    let q = supabase!
      .from('notifications')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });
    if (params?.isRead !== undefined) q = q.eq('is_read', params.isRead);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const list = (rows || []).map((r) => ({
      id: String(r.id),
      userId: String(r.user_id),
      type: String(r.type),
      title: String(r.title),
      content: r.content as string | undefined,
      relatedType: r.related_type as 'remittance' | 'vehicle' | undefined,
      relatedId: r.related_id as string | undefined,
      isRead: Boolean(r.is_read),
      createdAt: String(r.created_at),
    }));
    return { code: 200, message: 'success', data: list };
  },

  getUnreadCount: async (): Promise<ApiResponse<{ count: number }>> => {
    if (!currentUser?.id) return { code: 200, message: 'success', data: { count: 0 } };
    const { count, error } = await supabase!
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', currentUser.id)
      .eq('is_read', false);
    if (error) throw new Error(error.message);
    return { code: 200, message: 'success', data: { count: count ?? 0 } };
  },

  markAsRead: async (id: string): Promise<ApiResponse<null>> => {
    if (!currentUser?.id) return { code: 200, message: 'success', data: null };
    const { error } = await supabase!
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', currentUser.id);
    if (error) throw new Error(error.message);
    return { code: 200, message: 'success', data: null };
  },

  markAllAsRead: async (): Promise<ApiResponse<null>> => {
    if (!currentUser?.id) return { code: 200, message: 'success', data: null };
    const { error } = await supabase!
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', currentUser.id);
    if (error) throw new Error(error.message);
    return { code: 200, message: 'success', data: null };
  },
};

export const userApi = {
  getList: async (): Promise<ApiResponse<User[]>> => {
    const users = await fetchUsersMap();
    return { code: 200, message: 'success', data: Array.from(users.values()) };
  },
  getSupervisors: async (): Promise<ApiResponse<User[]>> => {
    const { data, error } = await supabase!
      .from('users')
      .select('*')
      .eq('role', 'SUPERVISOR');
    if (error) throw new Error(error.message);
    return {
      code: 200,
      message: 'success',
      data: (data || []).map((r) => toUser(r)!).filter(Boolean),
    };
  },

  updateUserRole: async (
    userId: string,
    role: User['role'],
  ): Promise<ApiResponse<User>> => {
    const { data, error } = await supabase!
      .from('users')
      .update({ role })
      .eq('id', userId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    const user = toUser(data);
    if (!user) throw new Error('更新失败');
    return { code: 200, message: '更新成功', data: user };
  },
};
