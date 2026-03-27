import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Shield, Loader2, KeyRound, UserPlus, Save, UserX, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { authApi, userApi } from '@/services/api';
import { getErrorMessage } from '@/lib/error';
import { ALL_PERMISSIONS, getDefaultPermissionsByRole } from '@/lib/permissions';
import { useAuthStore } from '@/stores/authStore';
import type { OperationPermission, User, UserRole } from '@/types';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const CREATE_ROLES: UserRole[] = ['STAFF', 'SUPERVISOR', 'FINANCE']; // 管理员创建账号时不可选 ADMIN
const ROLE_POSITION_MAP: Record<UserRole, string> = {
  STAFF: '担当',
  SUPERVISOR: '上司',
  FINANCE: '财务',
  ADMIN: '管理员',
};

const PERMISSION_OPTIONS: OperationPermission[] = ALL_PERMISSIONS;

export function Admin() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user: currentUser, setUser } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credForm, setCredForm] = useState({
    currentPassword: '',
    newUsername: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isUpdatingCreds, setIsUpdatingCreds] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [permissionDrafts, setPermissionDrafts] = useState<Record<string, OperationPermission[]>>({});
  const [createForm, setCreateForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    department: '',
    position: '',
    permissions: getDefaultPermissionsByRole('STAFF') as OperationPermission[],
    role: 'STAFF' as UserRole,
  });
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [profileDrafts, setProfileDrafts] = useState<Record<string, { department: string; position: string }>>({});
  const [positionOptions, setPositionOptions] = useState<string[]>([]);
  const [deleteTargetUser, setDeleteTargetUser] = useState<User | null>(null);
  const [deleteTargetPosition, setDeleteTargetPosition] = useState<string | null>(null);
  const [newRoleName, setNewRoleName] = useState('');
  const [editingRoleName, setEditingRoleName] = useState<string | null>(null);
  const [editingRoleValue, setEditingRoleValue] = useState('');

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [usersRes, optionsRes] = await Promise.all([
        userApi.getList(),
        userApi.getPositionOptions(),
      ]);
      setUsers(usersRes.data);
      setProfileDrafts(
        Object.fromEntries(
          usersRes.data.map((u) => [u.id, { department: u.department || '', position: u.position || '' }]),
        ),
      );
      setPositionOptions(optionsRes.data);
      setPermissionDrafts(
        Object.fromEntries(
          usersRes.data.map((u) => [u.id, u.permissions && u.permissions.length > 0 ? u.permissions : getDefaultPermissionsByRole(u.role)]),
        ),
      );
    } catch (e) {
      setError(getErrorMessage(e) || t('admin.fetchFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleProfileChange = (userId: string, key: 'department' | 'position', value: string) => {
    setProfileDrafts((prev) => ({
      ...prev,
      [userId]: {
        department: prev[userId]?.department ?? '',
        position: prev[userId]?.position ?? '',
        [key]: value,
      },
    }));
  };

  const handleDeactivate = async (userId: string) => {
    setIsSaving(true);
    setError(null);
    try {
      await userApi.deactivateUser(userId);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, employmentStatus: 'INACTIVE' } : u)),
      );
      toast.success(t('admin.userDeactivated'));
    } catch (e) {
      setError(getErrorMessage(e) || t('admin.updateFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleReactivate = async (userId: string) => {
    setIsSaving(true);
    setError(null);
    try {
      await userApi.reactivateUser(userId);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, employmentStatus: 'ACTIVE' } : u)),
      );
      toast.success(t('admin.userReactivated'));
    } catch (e) {
      setError(getErrorMessage(e) || t('admin.updateFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;
    if (target.role === 'ADMIN' || target.id === currentUser?.id) {
      setError(t('admin.deleteProtectedUser'));
      return;
    }
    setDeleteTargetUser(target);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetUser) return;
    setIsSaving(true);
    setError(null);
    try {
      await userApi.deleteUser(deleteTargetUser.id);
      setUsers((prev) => prev.filter((u) => u.id !== deleteTargetUser.id));
      setProfileDrafts((prev) => {
        const next = { ...prev };
        delete next[deleteTargetUser.id];
        return next;
      });
      toast.success(t('admin.userDeleted'));
      setDeleteTargetUser(null);
    } catch (e) {
      setError(getErrorMessage(e) || t('admin.updateFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handlePermissionToggle = (userId: string, permission: OperationPermission, checked: boolean) => {
    setPermissionDrafts((prev) => {
      const current = prev[userId] ?? [];
      const next = checked
        ? Array.from(new Set([...current, permission]))
        : current.filter((p) => p !== permission);
      return { ...prev, [userId]: next };
    });
  };

  const handleSaveAll = async (userId: string) => {
    setIsSaving(true);
    setError(null);
    try {
      const draft = profileDrafts[userId] || { department: '', position: '' };
      const permissions = permissionDrafts[userId] ?? [];
      const finalPosition = draft.position.trim();
      await userApi.updateUserProfile(userId, {
        department: draft.department.trim() || undefined,
        position: finalPosition || undefined,
      });
      await userApi.updateUserPermissions(userId, permissions);
      if (finalPosition) {
        const optionsRes = await userApi.addPositionOption(finalPosition);
        setPositionOptions(optionsRes.data);
      }
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                department: draft.department.trim() || undefined,
                position: finalPosition || undefined,
                permissions,
              }
            : u,
        ),
      );
      toast.success(t('admin.profileAndPermissionsUpdated'));
    } catch (e) {
      setError(getErrorMessage(e) || t('admin.updateFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePositionOption = async (option: string): Promise<boolean> => {
    const targetOption = option.trim();
    if (!targetOption) return false;
    setIsSaving(true);
    setError(null);
    try {
      const optionsRes = await userApi.deletePositionOption(targetOption);
      setUsers((prev) =>
        prev.map((u) =>
          (u.position || '').trim() === targetOption
            ? { ...u, position: undefined }
            : u,
        ),
      );
      setProfileDrafts((prev) =>
        Object.fromEntries(
          Object.entries(prev).map(([uid, draft]) => [
            uid,
            draft.position.trim() === targetOption ? { ...draft, position: '' } : draft,
          ]),
        ),
      );
      setPositionOptions(optionsRes.data);
      toast.success(t('admin.positionOptionDeleted'));
      return true;
    } catch (e) {
      setError(getErrorMessage(e) || t('admin.updateFailed'));
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDeletePositionOption = async () => {
    if (!deleteTargetPosition) return;
    const deleted = await handleDeletePositionOption(deleteTargetPosition);
    if (deleted) setDeleteTargetPosition(null);
  };

  const handleAddRoleOption = async () => {
    const next = newRoleName.trim();
    if (!next) return;
    setError(null);
    if (positionOptions.includes(next)) {
      setError(t('admin.roleExists'));
      return;
    }
    setIsSaving(true);
    try {
      const res = await userApi.addPositionOption(next);
      setPositionOptions(res.data);
      setNewRoleName('');
      toast.success(t('admin.roleAdded'));
    } catch (e) {
      setError(getErrorMessage(e) || t('admin.updateFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartEditRoleOption = (role: string) => {
    setEditingRoleName(role);
    setEditingRoleValue(role);
  };

  const handleSaveEditRoleOption = async () => {
    if (!editingRoleName) return;
    const from = editingRoleName.trim();
    const to = editingRoleValue.trim();
    if (!to) return;
    setError(null);
    if (from === to) {
      setEditingRoleName(null);
      setEditingRoleValue('');
      return;
    }
    if (positionOptions.includes(to)) {
      setError(t('admin.roleExists'));
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const optionsRes = await userApi.renamePositionOption(from, to);

      setUsers((prev) =>
        prev.map((u) => ((u.position || '').trim() === from ? { ...u, position: to } : u)),
      );
      setProfileDrafts((prev) =>
        Object.fromEntries(
          Object.entries(prev).map(([uid, draft]) => [
            uid,
            draft.position.trim() === from ? { ...draft, position: to } : draft,
          ]),
        ),
      );
      setPositionOptions(optionsRes.data);
      setEditingRoleName(null);
      setEditingRoleValue('');
      toast.success(t('admin.roleUpdated'));
    } catch (e) {
      setError(getErrorMessage(e) || t('admin.updateFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const isPresetAdmin = currentUser?.id === 'admin' && currentUser?.role === 'ADMIN';
  const canDeleteUser = (user: User) => user.role !== 'ADMIN' && user.id !== currentUser?.id;

  const handleUpdateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (credForm.newPassword && credForm.newPassword !== credForm.confirmPassword) {
      setError(t('auth.passwordMismatch'));
      return;
    }
    if (!credForm.currentPassword) {
      setError(t('admin.currentPasswordRequired'));
      return;
    }
    if (!credForm.newUsername?.trim() && !credForm.newPassword) {
      setError(t('admin.enterNewValue'));
      return;
    }
    setIsUpdatingCreds(true);
    try {
      const res = await authApi.updateCredentials({
        currentPassword: credForm.currentPassword,
        newUsername: credForm.newUsername?.trim() || undefined,
        newPassword: credForm.newPassword || undefined,
      });
      setUser(res.data);
      setCredForm({
        currentPassword: '',
        newUsername: '',
        newPassword: '',
        confirmPassword: '',
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === 'admin' ? { ...u, username: res.data.username } : u)),
      );
      toast.success(t('admin.credentialsUpdated'));
    } catch (e) {
      const msg = (e as { message?: string })?.message;
      setError(msg || t('admin.updateFailed'));
    } finally {
      setIsUpdatingCreds(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    if (!createForm.username.trim()) {
      setCreateError(t('validation.required', { field: t('auth.username') }));
      return;
    }
    if (!createForm.email.trim()) {
      setCreateError(t('validation.required', { field: t('auth.email') }));
      return;
    }
    if (!createForm.password) {
      setCreateError(t('validation.required', { field: t('auth.password') }));
      return;
    }
    if (createForm.password !== createForm.confirmPassword) {
      setCreateError(t('auth.passwordMismatch'));
      return;
    }
    setIsCreating(true);
    try {
      await authApi.register({
        username: createForm.username.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        department: createForm.department.trim() || undefined,
        position: createForm.position.trim() || undefined,
        permissions: createForm.permissions,
        role: createForm.role as 'STAFF' | 'SUPERVISOR' | 'FINANCE',
      });
      toast.success(t('admin.createUserSuccess'));
      setCreateDialogOpen(false);
      setCreateForm({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        department: '',
        position: '',
        permissions: getDefaultPermissionsByRole('STAFF'),
        role: 'STAFF',
      });
      fetchUsers();
    } catch (e) {
      setCreateError(getErrorMessage(e) || t('admin.createUserFailed'));
    } finally {
      setIsCreating(false);
    }
  };

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return 'destructive';
      case 'SUPERVISOR':
        return 'default';
      case 'FINANCE':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            {t('admin.title')}
          </h1>
          <p className="text-muted-foreground">{t('admin.subtitle')}</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isPresetAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              {t('admin.accountSettings')}
            </CardTitle>
            <CardDescription>{t('admin.accountSettingsDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateCredentials} className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label>{t('admin.currentPassword')}</Label>
                <Input
                  type="password"
                  value={credForm.currentPassword}
                  onChange={(e) =>
                    setCredForm((p) => ({ ...p, currentPassword: e.target.value }))
                  }
                  placeholder={t('admin.currentPasswordPlaceholder')}
                  autoComplete="current-password"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('admin.newUsername')}</Label>
                <Input
                  type="text"
                  value={credForm.newUsername}
                  onChange={(e) => setCredForm((p) => ({ ...p, newUsername: e.target.value }))}
                  placeholder={currentUser?.username || 'admin'}
                  autoComplete="username"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('admin.newPassword')}</Label>
                <Input
                  type="password"
                  value={credForm.newPassword}
                  onChange={(e) => setCredForm((p) => ({ ...p, newPassword: e.target.value }))}
                  placeholder={t('admin.newPasswordPlaceholder')}
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('auth.confirmPassword')}</Label>
                <Input
                  type="password"
                  value={credForm.confirmPassword}
                  onChange={(e) =>
                    setCredForm((p) => ({ ...p, confirmPassword: e.target.value }))
                  }
                  placeholder={t('admin.confirmPasswordPlaceholder')}
                  autoComplete="new-password"
                />
              </div>
              <Button type="submit" disabled={isUpdatingCreds}>
                {isUpdatingCreds && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('admin.updateCredentials')}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('admin.userManagement')}</CardTitle>
              <CardDescription>{t('admin.userManagementDesc')}</CardDescription>
            </div>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                  {t('admin.createUser')}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{t('admin.createUser')}</DialogTitle>
                  <DialogDescription>{t('admin.createUserDesc')}</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateUser} className="space-y-4">
                  {createError && (
                    <Alert variant="destructive">
                      <AlertDescription>{createError}</AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="create-username">{t('auth.username')} *</Label>
                    <Input
                      id="create-username"
                      value={createForm.username}
                      onChange={(e) =>
                        setCreateForm((p) => ({ ...p, username: e.target.value }))
                      }
                      placeholder={t('auth.username')}
                      disabled={isCreating}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create-email">{t('auth.email')} *</Label>
                    <Input
                      id="create-email"
                      type="email"
                      value={createForm.email}
                      onChange={(e) =>
                        setCreateForm((p) => ({ ...p, email: e.target.value }))
                      }
                      placeholder={t('auth.email')}
                      disabled={isCreating}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="create-password">{t('auth.password')} *</Label>
                      <Input
                        id="create-password"
                        type="password"
                        value={createForm.password}
                        onChange={(e) =>
                          setCreateForm((p) => ({ ...p, password: e.target.value }))
                        }
                        placeholder={t('auth.password')}
                        disabled={isCreating}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="create-confirm">{t('auth.confirmPassword')} *</Label>
                      <Input
                        id="create-confirm"
                        type="password"
                        value={createForm.confirmPassword}
                        onChange={(e) =>
                          setCreateForm((p) => ({ ...p, confirmPassword: e.target.value }))
                        }
                        placeholder={t('auth.confirmPassword')}
                        disabled={isCreating}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create-department">{t('auth.department')}</Label>
                    <Input
                      id="create-department"
                      value={createForm.department}
                      onChange={(e) =>
                        setCreateForm((p) => ({ ...p, department: e.target.value }))
                      }
                      placeholder={t('auth.department')}
                      disabled={isCreating}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create-position">{t('admin.position')}</Label>
                    <Input
                      id="create-position"
                      value={createForm.position}
                      onChange={(e) =>
                        setCreateForm((p) => ({ ...p, position: e.target.value }))
                      }
                      placeholder={t('admin.positionPlaceholder')}
                      disabled={isCreating}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create-role">{t('auth.role')} *</Label>
                    <Select
                      value={createForm.role}
                      onValueChange={(v) => {
                        const role = v as UserRole;
                        setCreateForm((p) => ({
                          ...p,
                          role,
                          position: p.position || ROLE_POSITION_MAP[role],
                          permissions: getDefaultPermissionsByRole(role),
                        }));
                      }}
                      disabled={isCreating}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CREATE_ROLES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {t(`roles.${r}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('admin.permissions')}</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-md border p-3">
                      {PERMISSION_OPTIONS.map((perm) => (
                        <label key={perm} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={createForm.permissions.includes(perm)}
                            onCheckedChange={(checked) => {
                              const isChecked = checked === true;
                              setCreateForm((prev) => ({
                                ...prev,
                                permissions: isChecked
                                  ? Array.from(new Set([...prev.permissions, perm]))
                                  : prev.permissions.filter((p) => p !== perm),
                              }));
                            }}
                          />
                          {t(`admin.permissionsMap.${perm}`)}
                        </label>
                      ))}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCreateDialogOpen(false)}
                      disabled={isCreating}
                    >
                      {t('common.cancel')}
                    </Button>
                    <Button type="submit" disabled={isCreating}>
                      {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {t('admin.createUser')}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((user) => {
                const currentDraftPosition = (profileDrafts[user.id]?.position ?? '').trim();
                const selectedPosition = positionOptions.includes(currentDraftPosition)
                  ? currentDraftPosition
                  : undefined;
                return (
                  <div
                    key={user.id}
                    className="p-4 rounded-lg border bg-card space-y-3"
                  >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{user.username}</span>
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {t(`roles.${user.role}`)}
                        </Badge>
                        {user.employmentStatus === 'INACTIVE' && (
                          <Badge variant="secondary">{t('admin.inactive')}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-1 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor={`dept-${user.id}`}>{t('auth.department')}</Label>
                      <Input
                        id={`dept-${user.id}`}
                        value={profileDrafts[user.id]?.department ?? ''}
                        onChange={(e) => handleProfileChange(user.id, 'department', e.target.value)}
                        disabled={isSaving}
                        placeholder={t('admin.departmentPlaceholder')}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label>{t('admin.position')}</Label>
                    <Select
                      value={selectedPosition}
                      onValueChange={(value) => handleProfileChange(user.id, 'position', value)}
                      disabled={isSaving || positionOptions.length === 0}
                    >
                      <SelectTrigger className="w-full md:w-48">
                        <SelectValue placeholder={t('admin.selectPositionOption')} />
                      </SelectTrigger>
                      <SelectContent>
                        {positionOptions.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label>{t('admin.permissions')}</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 rounded-md border p-3">
                      {PERMISSION_OPTIONS.map((perm) => (
                        <label key={perm} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={(permissionDrafts[user.id] ?? []).includes(perm)}
                            onCheckedChange={(checked) =>
                              handlePermissionToggle(user.id, perm, checked === true)
                            }
                            disabled={isSaving || user.id === 'admin'}
                          />
                          {t(`admin.permissionsMap.${perm}`)}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSaveAll(user.id)}
                      disabled={isSaving}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {t('common.save')}
                    </Button>
                    {user.id !== 'admin' && user.employmentStatus !== 'INACTIVE' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeactivate(user.id)}
                        disabled={isSaving}
                      >
                        <UserX className="h-4 w-4 mr-2" />
                        {t('admin.deactivateUser')}
                      </Button>
                    )}
                    {user.id !== 'admin' && user.employmentStatus === 'INACTIVE' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReactivate(user.id)}
                        disabled={isSaving}
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        {t('admin.reactivateUser')}
                      </Button>
                    )}
                    {canDeleteUser(user) && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteClick(user.id)}
                        disabled={isSaving}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t('admin.deleteUser')}
                      </Button>
                    )}
                  </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('admin.roleManagement')}</CardTitle>
          <CardDescription>{t('admin.roleManagementDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              placeholder={t('admin.newRolePlaceholder')}
              className="w-full md:w-80"
              disabled={isSaving}
            />
            <Button type="button" onClick={handleAddRoleOption} disabled={isSaving}>
              {t('admin.addRole')}
            </Button>
          </div>

          <div className="space-y-2">
            {positionOptions.map((role) => (
              <div key={role} className="flex items-center justify-between rounded-md border p-2">
                {editingRoleName === role ? (
                  <Input
                    value={editingRoleValue}
                    onChange={(e) => setEditingRoleValue(e.target.value)}
                    className="mr-2"
                    disabled={isSaving}
                  />
                ) : (
                  <span className="text-sm">{role}</span>
                )}
                <div className="flex items-center gap-2">
                  {editingRoleName === role ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleSaveEditRoleOption}
                        disabled={isSaving}
                      >
                        {t('common.save')}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingRoleName(null);
                          setEditingRoleValue('');
                        }}
                        disabled={isSaving}
                      >
                        {t('common.cancel')}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleStartEditRoleOption(role)}
                        disabled={isSaving}
                      >
                        {t('common.edit')}
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteTargetPosition(role)}
                        disabled={isSaving}
                      >
                        {t('common.delete')}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!deleteTargetUser} onOpenChange={(open) => !open && setDeleteTargetUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('admin.deleteUser')}</DialogTitle>
            <DialogDescription>
              {deleteTargetUser
                ? t('admin.confirmDeleteUser', { username: deleteTargetUser.username })
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTargetUser(null)}
              disabled={isSaving}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isSaving}
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteTargetPosition}
        onOpenChange={(open) => !open && setDeleteTargetPosition(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('admin.deletePositionOption')}</DialogTitle>
            <DialogDescription>
              {deleteTargetPosition
                ? t('admin.confirmDeletePositionOption', { position: deleteTargetPosition })
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTargetPosition(null)}
              disabled={isSaving}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDeletePositionOption}
              disabled={isSaving}
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
