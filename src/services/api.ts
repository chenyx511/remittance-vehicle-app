/**
 * 统一 API 入口：根据环境变量选择后端
 * - 配置 VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY → 使用 Supabase（多端共享数据）
 * - 未配置 → 使用 localStorage mock（仅当前浏览器可见）
 */
import { isSupabaseConfigured } from '@/lib/supabase';
import { performUpload } from './uploadUtils';

const useSupabase = isSupabaseConfigured();
const sb = useSupabase ? await import('./supabaseApi') : null;
const mock = await import('./apiMock');

export const authApi = sb ? sb.authApi : mock.authApi;
export const setMockCurrentUser = sb ? sb.setMockCurrentUser : mock.setMockCurrentUser;
export const remittanceApi = sb
  ? { ...sb.remittanceApi, upload: performUpload }
  : mock.remittanceApi;
export const vehicleApi = sb ? sb.vehicleApi : mock.vehicleApi;
export const notificationApi = sb ? sb.notificationApi : mock.notificationApi;
export const userApi = sb ? sb.userApi : mock.userApi;
