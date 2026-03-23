import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Shield, Loader2, KeyRound, UserPlus } from 'lucide-react';
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
import { authApi, userApi } from '@/services/api';
import { getErrorMessage } from '@/lib/error';
import { useAuthStore } from '@/stores/authStore';
import type { User, UserRole } from '@/types';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const ROLES: UserRole[] = ['STAFF', 'SUPERVISOR', 'FINANCE', 'ADMIN'];
const CREATE_ROLES: UserRole[] = ['STAFF', 'SUPERVISOR', 'FINANCE']; // 管理员创建账号时不可选 ADMIN

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
  const [createForm, setCreateForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    department: '',
    role: 'STAFF' as UserRole,
  });
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await userApi.getList();
      setUsers(res.data);
    } catch {
      setError(t('admin.fetchFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, role: UserRole) => {
    setIsSaving(true);
    setError(null);
    try {
      await userApi.updateUserRole(userId, role);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role } : u)),
      );
    } catch (e) {
      const msg = (e as { message?: string })?.message;
      setError(msg || t('admin.updateFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const isPresetAdmin = currentUser?.id === 'admin' && currentUser?.role === 'ADMIN';

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
                    <Label htmlFor="create-role">{t('auth.role')} *</Label>
                    <Select
                      value={createForm.role}
                      onValueChange={(v) =>
                        setCreateForm((p) => ({ ...p, role: v as UserRole }))
                      }
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
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between gap-4 p-4 rounded-lg border bg-card"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{user.username}</span>
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {t(`roles.${user.role}`)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {user.email}
                      {user.department && ` · ${user.department}`}
                    </p>
                  </div>
                  <Select
                    value={user.role}
                    onValueChange={(v) => handleRoleChange(user.id, v as UserRole)}
                    disabled={isSaving}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {t(`roles.${r}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
