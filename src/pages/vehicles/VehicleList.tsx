import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Filter, Eye, CheckCircle, XCircle, Play, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { vehicleApi } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import type { VehicleRequest } from '@/types';

export function VehicleList() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const dateLocale = i18n.language.startsWith('ja') ? 'ja-JP' : 'zh-CN';
  const [requests, setRequests] = useState<VehicleRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<VehicleRequest | null>(null);
  const [dialogType, setDialogType] = useState<'approve' | 'reject' | 'start' | 'complete' | null>(
    null,
  );
  const [comment, setComment] = useState('');
  const [mileage, setMileage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const response = await vehicleApi.getList({
        status: statusFilter === 'all' || !statusFilter ? undefined : statusFilter,
      });
      setRequests(response.data.list);
    } catch {
      console.error('Failed to fetch vehicle requests');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    fetchRequests();
  };

  const handleAction = async () => {
    if (!selectedRequest || !dialogType) return;

    setIsSubmitting(true);
    try {
      switch (dialogType) {
        case 'approve':
          await vehicleApi.approve(selectedRequest.id, comment);
          break;
        case 'reject':
          await vehicleApi.reject(selectedRequest.id, comment);
          break;
        case 'start':
          await vehicleApi.start(selectedRequest.id, mileage ? parseInt(mileage) : undefined);
          break;
        case 'complete':
          await vehicleApi.complete(selectedRequest.id, mileage ? parseInt(mileage) : undefined);
          break;
      }
      setDialogType(null);
      setComment('');
      setMileage('');
      setSelectedRequest(null);
      fetchRequests();
    } catch (error) {
      console.error('Failed to execute action:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const key = `vehicle.status.${status}`;
    const label = t(key);
    if (label === key) return <Badge variant="secondary">{status}</Badge>;
    switch (status) {
      case 'PENDING':
        return <Badge variant="secondary">{label}</Badge>;
      case 'APPROVED':
        return <Badge className="bg-blue-500">{label}</Badge>;
      case 'IN_USE':
        return <Badge variant="warning">{label}</Badge>;
      case 'COMPLETED':
        return <Badge variant="success">{label}</Badge>;
      case 'REJECTED':
        return <Badge variant="destructive">{label}</Badge>;
      default:
        return <Badge variant="secondary">{label}</Badge>;
    }
  };

  const canApprove = (request: VehicleRequest) => {
    return user?.role === 'SUPERVISOR' && request.status === 'PENDING';
  };

  const canStart = (request: VehicleRequest) => {
    return request.applicantId === user?.id && request.status === 'APPROVED';
  };

  const canComplete = (request: VehicleRequest) => {
    return request.applicantId === user?.id && request.status === 'IN_USE';
  };

  const openDialog = (
    type: 'approve' | 'reject' | 'start' | 'complete',
    request: VehicleRequest,
  ) => {
    setDialogType(type);
    setSelectedRequest(request);
    setComment('');
    setMileage('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('vehicle.title')}</h1>
          <p className="text-muted-foreground">{t('vehicle.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/vehicles/schedule')}>
            {t('vehicle.schedule')}
          </Button>
          <Button onClick={() => navigate('/vehicles/apply')}>
            <Plus className="mr-2 h-4 w-4" />
            {t('vehicle.apply')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('vehicle.requestNo') + ' / ' + t('vehicle.destination')}
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
<SelectValue placeholder={t('common.allStatus')} />
                </SelectTrigger>
                <SelectContent>
                <SelectItem value="all">{t('common.allStatus')}</SelectItem>
                <SelectItem value="PENDING">{t('vehicle.status.PENDING')}</SelectItem>
                <SelectItem value="APPROVED">{t('vehicle.status.APPROVED')}</SelectItem>
                <SelectItem value="IN_USE">{t('vehicle.status.IN_USE')}</SelectItem>
                <SelectItem value="COMPLETED">{t('vehicle.status.COMPLETED')}</SelectItem>
                <SelectItem value="REJECTED">{t('vehicle.status.REJECTED')}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleSearch}>
              <Filter className="mr-2 h-4 w-4" />
              {t('remittance.filter')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle>{t('vehicle.list')}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">{t('vehicle.noVehicleRequests')}</div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{request.requestNo}</span>
                      {getStatusBadge(request.status)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {t('vehicle.vehicleInfo')}: {request.vehicle?.plateNumber} ({request.vehicle?.brand}{' '}
                      {request.vehicle?.model})
                    </div>
                    <div className="text-sm">
                      {t('vehicle.purpose')}: {request.purpose} · {t('vehicle.destination')}: {request.destination || '-'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {t('common.time')}:{' '}
                      {new Date(request.startTime).toLocaleString(dateLocale, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      -
                      {new Date(request.endTime).toLocaleString(dateLocale, {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-4 sm:mt-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate(`/vehicles/${request.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {canApprove(request) && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-green-600"
                          onClick={() => openDialog('approve', request)}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-600"
                          onClick={() => openDialog('reject', request)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {canStart(request) && (
                      <Button size="sm" onClick={() => openDialog('start', request)}>
                        <Play className="mr-1 h-3 w-3" />
                        {t('vehicle.actions.start')}
                      </Button>
                    )}
                    {canComplete(request) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openDialog('complete', request)}
                      >
                        <Check className="mr-1 h-3 w-3" />
                        {t('vehicle.actions.complete')}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={!!dialogType} onOpenChange={() => setDialogType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogType === 'approve' && t('vehicle.actions.approve')}
              {dialogType === 'reject' && t('vehicle.actions.reject')}
              {dialogType === 'start' && t('vehicle.actions.start')}
              {dialogType === 'complete' && t('vehicle.actions.complete')}
            </DialogTitle>
            <DialogDescription>{selectedRequest?.requestNo}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {(dialogType === 'start' || dialogType === 'complete') && (
              <div>
                <Label>{dialogType === 'start' ? t('vehicle.mileageStart') : t('vehicle.mileageEnd')}</Label>
                <Input
                  type="number"
                  placeholder={t('vehicle.mileagePlaceholder')}
                  value={mileage}
                  onChange={(e) => setMileage(e.target.value)}
                />
              </div>
            )}
            {dialogType !== 'start' && (
              <div>
                <Label>{dialogType === 'reject' ? t('remittance.messages.enterRejectReason') : t('remittance.remarksLabel')}</Label>
                <Textarea
                  placeholder={dialogType === 'reject' ? t('remittance.rejectReasonPlaceholder') : t('remittance.remarksPlaceholder')}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogType(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleAction}
              disabled={isSubmitting}
              variant={dialogType === 'reject' ? 'destructive' : 'default'}
            >
              {isSubmitting ? t('remittance.processing') : t('vehicle.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
