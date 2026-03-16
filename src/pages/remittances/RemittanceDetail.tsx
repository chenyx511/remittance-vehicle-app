import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
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
import { remittanceApi } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import type { RemittanceRequest } from '@/types';

export function RemittanceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [request, setRequest] = useState<RemittanceRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);

  // Form states
  const [comment, setComment] = useState('');
  const [remittanceDate, setRemittanceDate] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchRequest();
    }
  }, [id]);

  const fetchRequest = async () => {
    setIsLoading(true);
    try {
      const response = await remittanceApi.getById(id!);
      setRequest(response.data);
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const message = (error as any)?.message as string | undefined;
      setError(message || '获取申请详情失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!request) return;
    setIsSubmitting(true);
    try {
      await remittanceApi.approve(request.id, comment);
      setIsApproveDialogOpen(false);
      setComment('');
      fetchRequest();
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const message = (error as any)?.message as string | undefined;
      setError(message || '审批失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!request) return;
    setIsSubmitting(true);
    try {
      await remittanceApi.reject(request.id, comment);
      setIsRejectDialogOpen(false);
      setComment('');
      fetchRequest();
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const message = (error as any)?.message as string | undefined;
      setError(message || '审批失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = async () => {
    if (!request) return;
    setIsSubmitting(true);
    try {
      await remittanceApi.complete(request.id, {
        remittanceProofUrl: proofUrl,
        remittanceDate,
        comment,
      });
      setIsCompleteDialogOpen(false);
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
      case 'SUPERVISOR_APPROVED':
        return <Badge className="bg-blue-500">上级已批准</Badge>;
      case 'FINANCE_PROCESSING':
        return <Badge variant="warning">财务处理中</Badge>;
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

  const canComplete = () => {
    return user?.role === 'FINANCE' && request?.status === 'SUPERVISOR_APPROVED';
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
        <Button variant="ghost" onClick={() => navigate('/remittances')}>
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
          <Button variant="ghost" size="icon" onClick={() => navigate('/remittances')}>
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
                onClick={() => setIsRejectDialogOpen(true)}
              >
                <XCircle className="mr-2 h-4 w-4" />
                拒绝
              </Button>
              <Button onClick={() => setIsApproveDialogOpen(true)}>
                <CheckCircle className="mr-2 h-4 w-4" />
                通过
              </Button>
            </>
          )}
          {canComplete() && (
            <Button onClick={() => setIsCompleteDialogOpen(true)}>
              <CheckCircle className="mr-2 h-4 w-4" />
              确认汇款
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
              <Label className="text-muted-foreground">契约编号</Label>
              <p className="font-medium">{request.contractNo || '-'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">汇款金额</Label>
              <p className="text-2xl font-bold text-primary">¥{request.amount.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">{request.currency}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">收款方</Label>
              <p className="font-medium">{request.recipientName}</p>
            </div>
            {request.recipientAccount && (
              <div>
                <Label className="text-muted-foreground">收款账号</Label>
                <p className="font-medium">{request.recipientAccount}</p>
              </div>
            )}
            {request.recipientBank && (
              <div>
                <Label className="text-muted-foreground">收款银行</Label>
                <p className="font-medium">{request.recipientBank}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Settlement Detail */}
      {request.settlementDetailUrl && (
        <Card>
          <CardHeader>
            <CardTitle>决算明细</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden max-w-md">
              <img
                src={request.settlementDetailUrl}
                alt="Settlement Detail"
                className="w-full h-auto"
              />
            </div>
          </CardContent>
        </Card>
      )}

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

            {/* Supervisor Approval */}
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
                <p className="font-medium">上级审批</p>
                {request.supervisor ? (
                  <>
                    <p className="text-sm">
                      {request.supervisor.username} ·{' '}
                      {new Date(request.supervisorApprovedAt!).toLocaleString('zh-CN')}
                    </p>
                    {request.supervisorComment && (
                      <p className="text-sm text-muted-foreground mt-1">
                        意见: {request.supervisorComment}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">等待审批...</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Finance Processing */}
            <div className="flex gap-4">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  request.status === 'COMPLETED' ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <span
                  className={`text-sm ${
                    request.status === 'COMPLETED'
                      ? 'text-primary-foreground'
                      : 'text-muted-foreground'
                  }`}
                >
                  3
                </span>
              </div>
              <div className="flex-1">
                <p className="font-medium">财务汇款</p>
                {request.finance ? (
                  <>
                    <p className="text-sm">
                      {request.finance.username} ·{' '}
                      {new Date(request.completedAt!).toLocaleString('zh-CN')}
                    </p>
                    {request.financeComment && (
                      <p className="text-sm text-muted-foreground mt-1">
                        备注: {request.financeComment}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">等待处理...</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Remittance Proof */}
      {request.remittanceProofUrl && (
        <Card>
          <CardHeader>
            <CardTitle>汇款凭证</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden max-w-md">
              <img
                src={request.remittanceProofUrl}
                alt="Remittance Proof"
                className="w-full h-auto"
              />
            </div>
            {request.remittanceDate && (
              <p className="text-sm text-muted-foreground mt-2">
                汇款日期: {request.remittanceDate}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Approve Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>审批通过</DialogTitle>
            <DialogDescription>确认通过此汇款申请？</DialogDescription>
          </DialogHeader>
          <div>
            <Label>审批意见（可选）</Label>
            <Textarea
              placeholder="请输入审批意见..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleApprove} disabled={isSubmitting}>
              {isSubmitting ? '处理中...' : '确认通过'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>审批拒绝</DialogTitle>
            <DialogDescription>确认拒绝此汇款申请？</DialogDescription>
          </DialogHeader>
          <div>
            <Label>拒绝原因</Label>
            <Textarea
              placeholder="请输入拒绝原因..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={isSubmitting}>
              {isSubmitting ? '处理中...' : '确认拒绝'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Dialog */}
      <Dialog open={isCompleteDialogOpen} onOpenChange={setIsCompleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认汇款完成</DialogTitle>
            <DialogDescription>请填写汇款信息</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>汇款日期 *</Label>
              <Input
                type="date"
                value={remittanceDate}
                onChange={(e) => setRemittanceDate(e.target.value)}
              />
            </div>
            <div>
              <Label>汇款凭证截图 URL</Label>
              <Input
                placeholder="请输入凭证图片URL"
                value={proofUrl}
                onChange={(e) => setProofUrl(e.target.value)}
              />
            </div>
            <div>
              <Label>备注</Label>
              <Textarea
                placeholder="请输入备注..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCompleteDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleComplete} disabled={isSubmitting || !remittanceDate}>
              {isSubmitting ? '处理中...' : '确认完成'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
