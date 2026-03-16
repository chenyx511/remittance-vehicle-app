import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
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
      setError(message || '获取申请详情失败');
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
      setError(message || '操作失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="secondary">待审批</Badge>;
      case 'APPROVED':
        return <Badge className="bg-blue-500">已批准</Badge>;
      case 'IN_USE':
        return <Badge variant="warning">使用中</Badge>;
      case 'COMPLETED':
        return <Badge variant="success">已完成</Badge>;
      case 'REJECTED':
        return <Badge variant="destructive">已拒绝</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
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
          返回列表
        </Button>
        <Alert variant="destructive">
          <AlertDescription>{error || '申请不存在'}</AlertDescription>
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
              申请时间: {new Date(request.createdAt).toLocaleString('zh-CN')}
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
                拒绝
              </Button>
              <Button onClick={() => setDialogType('approve')}>
                <CheckCircle className="mr-2 h-4 w-4" />
                通过
              </Button>
            </>
          )}
          {canStart() && (
            <Button onClick={() => setDialogType('start')}>
              <Play className="mr-2 h-4 w-4" />
              开始用车
            </Button>
          )}
          {canComplete() && (
            <Button onClick={() => setDialogType('complete')}>
              <Check className="mr-2 h-4 w-4" />
              完成用车
            </Button>
          )}
        </div>
      </div>

      {/* Request Info */}
      <Card>
        <CardHeader>
          <CardTitle>申请信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <Label className="text-muted-foreground">申请人</Label>
              <p className="font-medium">{request.applicant?.username}</p>
              <p className="text-sm text-muted-foreground">{request.applicant?.department}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">车辆信息</Label>
              <p className="font-medium">{request.vehicle?.plateNumber}</p>
              <p className="text-sm text-muted-foreground">
                {request.vehicle?.brand} {request.vehicle?.model} ({request.vehicle?.color})
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">用车目的</Label>
              <p className="font-medium">{request.purpose}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">目的地</Label>
              <p className="font-medium">{request.destination || '-'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">预计时间</Label>
              <p className="font-medium">{new Date(request.startTime).toLocaleString('zh-CN')} -</p>
              <p className="font-medium">{new Date(request.endTime).toLocaleString('zh-CN')}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">乘车人数</Label>
              <p className="font-medium">{request.passengers}人</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Approval Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>审批流程</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Created */}
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                <span className="text-primary-foreground text-sm">1</span>
              </div>
              <div className="flex-1">
                <p className="font-medium">提交申请</p>
                <p className="text-sm text-muted-foreground">
                  {request.applicant?.username} ·{' '}
                  {new Date(request.createdAt).toLocaleString('zh-CN')}
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
                <p className="font-medium">审批</p>
                {request.approver ? (
                  <>
                    <p className="text-sm">
                      {request.approver.username} ·{' '}
                      {new Date(request.approvedAt!).toLocaleString('zh-CN')}
                    </p>
                    {request.approverComment && (
                      <p className="text-sm text-muted-foreground mt-1">
                        意见: {request.approverComment}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">等待审批...</p>
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
                <p className="font-medium">用车</p>
                {request.actualStartTime ? (
                  <>
                    <p className="text-sm">
                      开始: {new Date(request.actualStartTime).toLocaleString('zh-CN')}
                    </p>
                    {request.mileageStart && (
                      <p className="text-sm text-muted-foreground">
                        起始里程: {request.mileageStart} km
                      </p>
                    )}
                    {request.actualEndTime && (
                      <>
                        <p className="text-sm">
                          结束: {new Date(request.actualEndTime).toLocaleString('zh-CN')}
                        </p>
                        {request.mileageEnd && (
                          <p className="text-sm text-muted-foreground">
                            结束里程: {request.mileageEnd} km
                            {request.mileageStart && (
                              <span className="ml-2">
                                (行驶: {request.mileageEnd - request.mileageStart} km)
                              </span>
                            )}
                          </p>
                        )}
                      </>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">等待开始...</p>
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
              {dialogType === 'approve' && '审批通过'}
              {dialogType === 'reject' && '审批拒绝'}
              {dialogType === 'start' && '开始用车'}
              {dialogType === 'complete' && '完成用车'}
            </DialogTitle>
            <DialogDescription>{request.requestNo}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {(dialogType === 'start' || dialogType === 'complete') && (
              <div>
                <Label>{dialogType === 'start' ? '起始里程' : '结束里程'}</Label>
                <Input
                  type="number"
                  placeholder="请输入里程数"
                  value={mileage}
                  onChange={(e) => setMileage(e.target.value)}
                />
              </div>
            )}
            {dialogType !== 'start' && (
              <div>
                <Label>{dialogType === 'reject' ? '拒绝原因' : '备注'}</Label>
                <Textarea
                  placeholder={dialogType === 'reject' ? '请输入拒绝原因...' : '请输入备注信息...'}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogType(null)}>
              取消
            </Button>
            <Button
              onClick={handleAction}
              disabled={isSubmitting}
              variant={dialogType === 'reject' ? 'destructive' : 'default'}
            >
              {isSubmitting ? '处理中...' : '确认'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
