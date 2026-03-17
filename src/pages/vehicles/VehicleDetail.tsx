import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, CheckCircle, XCircle, Play, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { vehicleApi } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import type { VehicleRequest } from '@/types';

export function VehicleDetail() {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const dateLocale = i18n.language.startsWith('ja') ? 'ja-JP' : 'zh-CN';
  const [request, setRequest] = useState<VehicleRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [dialogType, setDialogType] = useState<'approve' | 'reject' | 'start' | 'complete' | null>(
    null,
  );

  // Form states
  const [comment, setComment] = useState('');
  const [mileage, setMileage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchRequest();
    }
  }, [id]);

  const fetchRequest = async () => {
    setIsLoading(true);
    try {
      const response = await vehicleApi.getById(id!);
      setRequest(response.data);
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const message = (error as any)?.message as string | undefined;
      setError(message || t('vehicle.fetchDetailFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async () => {
    if (!request || !dialogType) return;

    setIsSubmitting(true);
    try {
      switch (dialogType) {
        case 'approve':
          await vehicleApi.approve(request.id, comment);
          break;
        case 'reject':
          await vehicleApi.reject(request.id, comment);
          break;
        case 'start':
          await vehicleApi.start(request.id, mileage ? parseInt(mileage) : undefined);
          break;
        case 'complete':
          await vehicleApi.complete(request.id, mileage ? parseInt(mileage) : undefined);
          break;
      }
      setDialogType(null);
      setComment('');
      setMileage('');
      fetchRequest();
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const message = (error as any)?.message as string | undefined;
      setError(message || t('errors.generic'));
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

  const canApprove = () => {
    return user?.role === 'SUPERVISOR' && request?.status === 'PENDING';
  };

  const canStart = () => {
    return request?.applicantId === user?.id && request?.status === 'APPROVED';
  };

  const canComplete = () => {
    return request?.applicantId === user?.id && request?.status === 'IN_USE';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/vehicles')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('vehicle.backToList')}
        </Button>
        <Alert variant="destructive">
          <AlertDescription>{error || t('vehicle.notFound')}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/vehicles')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{request.requestNo}</h1>
              {getStatusBadge(request.status)}
            </div>
            <p className="text-muted-foreground">
              {t('vehicle.applicationTime')}: {new Date(request.createdAt).toLocaleString(dateLocale)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {canApprove() && (
            <>
              <Button
                variant="outline"
                className="text-red-600"
                onClick={() => setDialogType('reject')}
              >
                <XCircle className="mr-2 h-4 w-4" />
                {t('vehicle.actions.reject')}
              </Button>
              <Button onClick={() => setDialogType('approve')}>
                <CheckCircle className="mr-2 h-4 w-4" />
                {t('vehicle.actions.approve')}
              </Button>
            </>
          )}
          {canStart() && (
            <Button onClick={() => setDialogType('start')}>
              <Play className="mr-2 h-4 w-4" />
              {t('vehicle.actions.start')}
            </Button>
          )}
          {canComplete() && (
            <Button onClick={() => setDialogType('complete')}>
              <Check className="mr-2 h-4 w-4" />
              {t('vehicle.actions.complete')}
            </Button>
          )}
        </div>
      </div>

      {/* Request Info */}
      <Card>
        <CardHeader>
          <CardTitle>{t('vehicle.applicationInfo')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <Label className="text-muted-foreground">{t('vehicle.applicant')}</Label>
              <p className="font-medium">{request.applicant?.username}</p>
              <p className="text-sm text-muted-foreground">{request.applicant?.department}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">{t('vehicle.vehicleInfo')}</Label>
              <p className="font-medium">{request.vehicle?.plateNumber}</p>
              <p className="text-sm text-muted-foreground">
                {request.vehicle?.brand} {request.vehicle?.model} ({request.vehicle?.color})
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">{t('vehicle.purpose')}</Label>
              <p className="font-medium">{request.purpose}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">{t('vehicle.destination')}</Label>
              <p className="font-medium">{request.destination || '-'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">{t('vehicle.expectedTime')}</Label>
              <p className="font-medium">{new Date(request.startTime).toLocaleString(dateLocale)} -</p>
              <p className="font-medium">{new Date(request.endTime).toLocaleString(dateLocale)}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">{t('vehicle.passengersCount')}</Label>
              <p className="font-medium">{request.passengers}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Approval Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>{t('remittance.approvalFlow')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Created */}
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                <span className="text-primary-foreground text-sm">1</span>
              </div>
              <div className="flex-1">
                <p className="font-medium">{t('vehicle.submitApplication')}</p>
                <p className="text-sm text-muted-foreground">
                  {request.applicant?.username} ·{' '}
                  {new Date(request.createdAt).toLocaleString(dateLocale)}
                </p>
              </div>
            </div>

            <Separator />

            {/* Approval */}
            <div className="flex gap-4">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  request.status === 'PENDING' ? 'bg-muted' : 'bg-primary'
                }`}
              >
                <span
                  className={`text-sm ${
                    request.status === 'PENDING'
                      ? 'text-muted-foreground'
                      : 'text-primary-foreground'
                  }`}
                >
                  2
                </span>
              </div>
              <div className="flex-1">
                <p className="font-medium">{t('vehicle.approval')}</p>
                {request.approver ? (
                  <>
                    <p className="text-sm">
                      {request.approver.username} ·{' '}
                      {new Date(request.approvedAt!).toLocaleString(dateLocale)}
                    </p>
                    {request.approverComment && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {t('remittance.opinionLabel')}: {request.approverComment}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">{t('remittance.waitingApproval')}</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Usage */}
            <div className="flex gap-4">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  request.status === 'COMPLETED' || request.status === 'IN_USE'
                    ? 'bg-primary'
                    : 'bg-muted'
                }`}
              >
                <span
                  className={`text-sm ${
                    request.status === 'COMPLETED' || request.status === 'IN_USE'
                      ? 'text-primary-foreground'
                      : 'text-muted-foreground'
                  }`}
                >
                  3
                </span>
              </div>
              <div className="flex-1">
                <p className="font-medium">{t('vehicle.useLabel')}</p>
                {request.actualStartTime ? (
                  <>
                    <p className="text-sm">
                      {t('vehicle.startLabel')}: {new Date(request.actualStartTime).toLocaleString(dateLocale)}
                    </p>
                    {request.mileageStart != null && (
                      <p className="text-sm text-muted-foreground">
                        {t('vehicle.mileageStart')}: {request.mileageStart} km
                      </p>
                    )}
                    {request.actualEndTime && (
                      <>
                        <p className="text-sm">
                          {t('vehicle.endLabel')}: {new Date(request.actualEndTime).toLocaleString(dateLocale)}
                        </p>
                        {request.mileageEnd != null && (
                          <p className="text-sm text-muted-foreground">
                            {t('vehicle.mileageEnd')}: {request.mileageEnd} km
                            {request.mileageStart != null && (
                              <span className="ml-2">
                                ({t('vehicle.mileageDriven')}: {request.mileageEnd - request.mileageStart} km)
                              </span>
                            )}
                          </p>
                        )}
                      </>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">{t('vehicle.waitingStart')}</p>
                )}
              </div>
            </div>
          </div>
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
            <DialogDescription>{request.requestNo}</DialogDescription>
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
