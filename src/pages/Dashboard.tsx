import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Banknote, Car, Clock, AlertCircle, TrendingUp, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/stores/authStore';
import { remittanceApi, vehicleApi } from '@/services/api';
import i18n from '@/i18n';
import { formatMoneyByLanguage } from '@/lib/currency';

interface DashboardStats {
  pendingRemittances: number;
  pendingVehicles: number;
  processingRemittances: number;
  totalToday: number;
}

interface RecentActivity {
  id: string;
  type: 'remittance' | 'vehicle';
  title: string;
  description: string;
  time: string;
  createdAt: string;
  status: string;
}

export function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats>({
    pendingRemittances: 0,
    pendingVehicles: 0,
    processingRemittances: 0,
    totalToday: 0,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // Fetch remittance data
      const remittanceRes = await remittanceApi.getList({ pageSize: 100 });
      const remittances = remittanceRes.data.list;

      // Fetch vehicle data
      const vehicleRes = await vehicleApi.getList({ pageSize: 100 });
      const vehicles = vehicleRes.data.list;

      // Calculate stats
      const pendingRemittances = remittances.filter((r) => r.status === 'PENDING').length;
      const pendingVehicles = vehicles.filter((v) => v.status === 'PENDING').length;
      const processingRemittances = remittances.filter(
        (r) => r.status === 'SUPERVISOR_APPROVED',
      ).length;
      const isToday = (dateString: string) =>
        new Date(dateString).toDateString() === new Date().toDateString();
      const totalToday =
        remittances.filter((r) => isToday(r.createdAt)).length +
        vehicles.filter((v) => isToday(v.createdAt)).length;

      setStats({
        pendingRemittances,
        pendingVehicles,
        processingRemittances,
        totalToday,
      });

      // Generate recent activities
      const activities: RecentActivity[] = [
        ...remittances.slice(0, 3).map((r) => ({
          id: r.id,
          type: 'remittance' as const,
          title: `${t('remittance.title')} ${r.requestNo}`,
          description: `${r.applicant?.username} ${t('dashboard.submitted')} ${formatMoneyByLanguage(
            r.amount,
            i18n.language,
          )} ${t('remittance.title')}`,
          time: formatTimeAgo(r.createdAt),
          createdAt: r.createdAt,
          status: r.status,
        })),
        ...vehicles.slice(0, 2).map((v) => ({
          id: v.id,
          type: 'vehicle' as const,
          title: `${t('vehicle.title')} ${v.requestNo}`,
          description: `${v.applicant?.username} ${t('dashboard.requested')} ${v.vehicle?.plateNumber}`,
          time: formatTimeAgo(v.createdAt),
          createdAt: v.createdAt,
          status: v.status,
        })),
      ];

      activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setRecentActivities(activities.slice(0, 5));
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return t('common.minutesAgo', { count: minutes });
    if (hours < 24) return t('common.hoursAgo', { count: hours });
    return t('common.daysAgo', { count: days });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="secondary">{t('remittance.status.PENDING')}</Badge>;
      case 'SUPERVISOR_APPROVED':
        return <Badge variant="default">{t('remittance.status.SUPERVISOR_APPROVED')}</Badge>;
      case 'FINANCE_PROCESSING':
        return <Badge variant="warning">{t('remittance.status.FINANCE_PROCESSING')}</Badge>;
      case 'COMPLETED':
        return <Badge variant="success">{t('remittance.status.COMPLETED')}</Badge>;
      case 'REJECTED':
        return <Badge variant="destructive">{t('remittance.status.REJECTED')}</Badge>;
      case 'APPROVED':
        return <Badge variant="default">{t('vehicle.status.APPROVED')}</Badge>;
      case 'IN_USE':
        return <Badge variant="warning">{t('vehicle.status.IN_USE')}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const today = new Date().toLocaleDateString(i18n.language === 'ja' ? 'ja-JP' : 'zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">
          {t('dashboard.greeting')}、{user?.username} ({t(`roles.${user?.role}`)})
        </h1>
        <p className="text-muted-foreground">
          {t('dashboard.today')} {today}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('dashboard.pendingRemittances')}
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats.pendingRemittances}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('dashboard.pendingVehicles')}
            </CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats.pendingVehicles}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('dashboard.processingRemittances')}
            </CardTitle>
            <Banknote className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats.processingRemittances}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('dashboard.totalToday')}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats.totalToday}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('dashboard.quickActions')}
                </p>
                <h3 className="text-lg font-semibold mt-1">{t('dashboard.createRemittance')}</h3>
              </div>
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Banknote className="h-5 w-5 text-primary" />
              </div>
            </div>
            <Button className="w-full mt-4" onClick={() => navigate('/remittances/create')}>
              {t('common.create')}
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('dashboard.quickActions')}
                </p>
                <h3 className="text-lg font-semibold mt-1">{t('dashboard.applyVehicle')}</h3>
              </div>
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Car className="h-5 w-5 text-blue-500" />
              </div>
            </div>
            <Button
              className="w-full mt-4"
              variant="outline"
              onClick={() => navigate('/vehicles/apply')}
            >
              {t('common.create')}
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/5 to-green-500/10 border-green-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('dashboard.quickActions')}
                </p>
                <h3 className="text-lg font-semibold mt-1">{t('dashboard.viewSchedule')}</h3>
              </div>
              <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                <Clock className="h-5 w-5 text-green-500" />
              </div>
            </div>
            <Button
              className="w-full mt-4"
              variant="outline"
              onClick={() => navigate('/vehicles/schedule')}
            >
              {t('common.view')}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.recentActivities')}</CardTitle>
          <CardDescription>{t('dashboard.recentActivities')}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : recentActivities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('dashboard.noActivities')}
            </div>
          ) : (
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start justify-between p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                  onClick={() => navigate(`/${activity.type}s/${activity.id}`)}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        activity.type === 'remittance' ? 'bg-primary/10' : 'bg-blue-500/10'
                      }`}
                    >
                      {activity.type === 'remittance' ? (
                        <Banknote className="h-4 w-4 text-primary" />
                      ) : (
                        <Car className="h-4 w-4 text-blue-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{activity.title}</p>
                      <p className="text-sm text-muted-foreground">{activity.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(activity.status)}
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
