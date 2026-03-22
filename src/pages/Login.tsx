import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Banknote, Loader2, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuthStore } from '@/stores/authStore';

export function Login() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    try {
      await login(credentials);
      navigate('/dashboard');
    } catch {
      // Error is handled in store
    }
  };

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  // 演示账号（管理员 admin / 123456 需正确输入密码）
  const demoAccounts = [
    { name: t('roles.STAFF'), username: '张三', password: 'any' },
    { name: t('roles.SUPERVISOR'), username: '李四', password: 'any' },
    { name: t('roles.FINANCE'), username: '王五', password: 'any' },
    { name: t('roles.ADMIN'), username: 'admin', password: '123456' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      <div className="w-full max-w-md">
        {/* Language Selector */}
        <div className="flex justify-end mb-4">
          <Select value={i18n.language} onValueChange={changeLanguage}>
            <SelectTrigger className="w-32">
              <Globe className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ja">{t('common.langJa')}</SelectItem>
              <SelectItem value="zh">{t('common.langZh')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4 shadow-lg">
            <Banknote className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">{t('common.appName')}</h1>
          <p className="text-muted-foreground mt-1">{t('auth.loginSubtitle')}</p>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>{t('auth.loginTitle')}</CardTitle>
            <CardDescription>{t('auth.loginSubtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="username">{t('auth.username')}</Label>
                <Input
                  id="username"
                  placeholder={t('auth.username')}
                  value={credentials.username}
                  onChange={(e) =>
                    setCredentials((prev) => ({ ...prev, username: e.target.value }))
                  }
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t('auth.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={t('auth.password')}
                  value={credentials.password}
                  onChange={(e) =>
                    setCredentials((prev) => ({ ...prev, password: e.target.value }))
                  }
                  disabled={isLoading}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('common.loading')}
                  </>
                ) : (
                  t('auth.login')
                )}
              </Button>
            </form>

            {/* Demo Accounts */}
            <div className="mt-6 pt-6 border-t">
              <p className="text-sm text-muted-foreground mb-3">{t('auth.demoAccounts')}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {demoAccounts.map((account) => (
                  <Button
                    key={account.username}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCredentials({ username: account.username, password: account.password });
                    }}
                    disabled={isLoading}
                  >
                    {account.name}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">{t('auth.demoNote')}</p>
      </div>
    </div>
  );
}
