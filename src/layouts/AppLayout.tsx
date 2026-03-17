import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Banknote,
  Car,
  Bell,
  User,
  LogOut,
  Menu,
  ChevronDown,
  Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { cn } from '@/lib/utils';

interface NavItem {
  path: string;
  labelKey: string;
  icon: React.ElementType;
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { unreadCount, fetchUnreadCount } = useNotificationStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems: NavItem[] = [
    { path: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
    { path: '/remittances', labelKey: 'nav.remittance', icon: Banknote },
    { path: '/vehicles', labelKey: 'nav.vehicle', icon: Car },
    { path: '/notifications', labelKey: 'nav.notifications', icon: Bell },
  ];

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  const NavLink = ({ item, onClick }: { item: NavItem; onClick?: () => void }) => {
    const isActive = location.pathname.startsWith(item.path);
    const Icon = item.icon;

    return (
      <Link
        to={item.path}
        onClick={onClick}
        className={cn(
          'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        )}
      >
        <Icon className="h-5 w-5" />
        <span className="font-medium">{t(item.labelKey)}</span>
        {item.path === '/notifications' && unreadCount > 0 && (
          <Badge variant="destructive" className="ml-auto">
            {unreadCount}
          </Badge>
        )}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r bg-card">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Banknote className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">{t('common.appName')}</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink key={item.path} item={item} />
          ))}
        </nav>

        {/* User Info */}
        <div className="p-4 border-t">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{user?.username?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium">{user?.username}</p>
                  <p className="text-xs text-muted-foreground">
                    {t(`roles.${user?.role}`)} · {user?.department}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {/* Language Selector */}
              <div className="px-2 py-2">
                <Select value={i18n.language} onValueChange={changeLanguage}>
                  <SelectTrigger className="w-full">
                    <Globe className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ja">{t('common.langJa')}</SelectItem>
                    <SelectItem value="zh">{t('common.langZh')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <User className="mr-2 h-4 w-4" />
                {t('nav.profile')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                {t('auth.logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b z-50 flex items-center justify-between px-4">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Banknote className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-bold">{t('common.appName')}</span>
        </Link>

        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 p-0">
            <div className="flex flex-col h-full">
              {/* Mobile User Info */}
              <div className="p-4 border-b">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{user?.username?.[0] || 'U'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{user?.username}</p>
                    <p className="text-sm text-muted-foreground">
                      {t(`roles.${user?.role}`)} · {user?.department}
                    </p>
                  </div>
                </div>
              </div>

              {/* Mobile Navigation */}
              <nav className="flex-1 p-4 space-y-1">
                {navItems.map((item) => (
                  <NavLink key={item.path} item={item} onClick={() => setIsMobileMenuOpen(false)} />
                ))}
              </nav>

              {/* Mobile Language & Logout */}
              <div className="p-4 border-t space-y-2">
                <Select value={i18n.language} onValueChange={changeLanguage}>
                  <SelectTrigger>
                    <Globe className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ja">{t('common.langJa')}</SelectItem>
                    <SelectItem value="zh">{t('common.langZh')}</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-destructive"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {t('auth.logout')}
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Main Content */}
      <main className="flex-1 lg:ml-0">
        <div className="lg:h-0 h-16" /> {/* Spacer for mobile header */}
        <div className="p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
