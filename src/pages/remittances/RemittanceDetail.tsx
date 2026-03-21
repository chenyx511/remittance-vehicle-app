import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, CheckCircle, XCircle, Upload, Eye, Download } from 'lucide-react';
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
import { formatMoneyByLanguage, getDisplayCurrencyCode } from '@/lib/currency';
import type { RemittanceRequest } from '@/types';

export function RemittanceDetail() {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const dateLocale = i18n.language.startsWith('ja') ? 'ja-JP' : 'zh-CN';
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
  const [isProofUploading, setIsProofUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatAmount = (amount: number) => formatMoneyByLanguage(amount, i18n.language);
  const getCurrencyLabel = () =>
    t(`common.currencyUnit.${getDisplayCurrencyCode(i18n.language)}`);

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
      setError(message || t('remittance.fetchDetailFailed'));
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
      setError(message || t('errors.generic'));
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
      setError(message || t('errors.generic'));
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
      setError(message || t('errors.generic'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProofUploading(true);
    try {
      const response = await remittanceApi.upload(file, 'proof');
      setProofUrl(response.data.url);
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const message = (error as any)?.message as string | undefined;
      setError(message || t('remittance.uploadFailed'));
    } finally {
      setIsProofUploading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const key = `remittance.status.${status}`;
    const label = t(key);
    if (label === key) return <Badge variant="secondary">{status}</Badge>;
    switch (status) {
      case 'PENDING':
        return <Badge variant="secondary">{label}</Badge>;
      case 'SUPERVISOR_APPROVED':
        return <Badge className="bg-blue-500">{label}</Badge>;
      case 'FINANCE_PROCESSING':
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
          {t('remittance.backToList')}
        </Button>
        <Alert variant="destructive">
          <AlertDescription>{error || t('remittance.notFound')}</AlertDescription>
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
              {t('remittance.applicationTime')}: {new Date(request.createdAt).toLocaleString(dateLocale)}
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
                {t('remittance.actions.reject')}
              </Button>
              <Button onClick={() => setIsApproveDialogOpen(true)}>
                <CheckCircle className="mr-2 h-4 w-4" />
                {t('remittance.actions.approve')}
              </Button>
            </>
          )}
          {canComplete() && (
            <Button onClick={() => setIsCompleteDialogOpen(true)}>
              <CheckCircle className="mr-2 h-4 w-4" />
              {t('remittance.confirmRemittance')}
            </Button>
          )}
        </div>
      </div>

      {/* Request Info */}
      <Card>
        <CardHeader>
          <CardTitle>{t('remittance.applicationInfo')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <Label className="text-muted-foreground">{t('remittance.applicant')}</Label>
              <p className="font-medium">{request.applicant?.username}</p>
              <p className="text-sm text-muted-foreground">{request.applicant?.department}</p>
            </div>
              {request.contractNo && (
                <div>
                  <Label className="text-muted-foreground">{t('remittance.contractNo')}</Label>
                  <p className="font-medium">{request.contractNo}</p>
                </div>
              )}
              {request.amount > 0 && (
                <div>
                  <Label className="text-muted-foreground">{t('common.amount')}</Label>
                  <p className="text-2xl font-bold text-primary">{formatAmount(request.amount)}</p>
                  <p className="text-sm text-muted-foreground">{getCurrencyLabel()}</p>
                </div>
              )}
              {request.recipientName && request.recipientName !== 'N/A' && (
                <div>
                  <Label className="text-muted-foreground">{t('remittance.recipientShort')}</Label>
                  <p className="font-medium">{request.recipientName}</p>
                </div>
              )}
            {request.recipientAccount && (
              <div>
                <Label className="text-muted-foreground">{t('remittance.recipientAccount')}</Label>
                <p className="font-medium">{request.recipientAccount}</p>
              </div>
            )}
            {request.recipientBank && (
              <div>
                <Label className="text-muted-foreground">{t('remittance.recipientBank')}</Label>
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
            <CardTitle>{t('remittance.settlementDetail')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden max-w-md">
              <img
                src={request.settlementDetailUrl}
                alt="Settlement Detail"
                className="w-full h-auto"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const el = e.currentTarget;
                  el.style.display = 'none';
                  const wrap = el.parentElement;
                  if (wrap && !wrap.querySelector('.image-load-failed')) {
                    const hint = document.createElement('div');
                    hint.className = 'image-load-failed p-4 bg-muted rounded-lg text-sm text-muted-foreground';
                    hint.innerHTML = `${t('remittance.imageLoadFailed')}。${t('remittance.imageLoadFailedHint')}<br/><a href="${request.settlementDetailUrl}" target="_blank" rel="noreferrer" class="text-primary underline break-all">${request.settlementDetailUrl}</a>`;
                    wrap.appendChild(hint);
                  }
                }}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <a href={request.settlementDetailUrl} target="_blank" rel="noreferrer">
                  <Eye className="mr-2 h-4 w-4" />
                  {t('common.view')}
                </a>
              </Button>
              <Button asChild variant="outline" size="sm">
                <a href={request.settlementDetailUrl} download>
                  <Download className="mr-2 h-4 w-4" />
                  {t('common.download')}
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
                <p className="font-medium">{t('remittance.submitApplication')}</p>
                <p className="text-sm text-muted-foreground">
                  {request.applicant?.username} ·{' '}
                  {new Date(request.createdAt).toLocaleString(dateLocale)}
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
                <p className="font-medium">{t('remittance.supervisorApproval')}</p>
                {request.supervisor ? (
                  <>
                    <p className="text-sm">
                      {request.supervisor.username} ·{' '}
                      {new Date(request.supervisorApprovedAt!).toLocaleString(dateLocale)}
                    </p>
                    {request.supervisorComment && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {t('remittance.opinionLabel')}: {request.supervisorComment}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">{t('remittance.waitingApproval')}</p>
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
                <p className="font-medium">{t('remittance.financeRemittance')}</p>
                {request.finance ? (
                  <>
                    <p className="text-sm">
                      {request.finance.username} ·{' '}
                      {new Date(request.completedAt!).toLocaleString(dateLocale)}
                    </p>
                    {request.financeComment && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {t('remittance.remarksLabel')}: {request.financeComment}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">{t('remittance.waitingProcess')}</p>
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
            <CardTitle>{t('remittance.remittanceProof')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden max-w-md">
              <img
                src={request.remittanceProofUrl}
                alt="Remittance Proof"
                className="w-full h-auto"
              />
            </div>
            <div className="flex items-center gap-2 mt-3">
              <Button asChild variant="outline" size="sm">
                <a href={request.remittanceProofUrl} target="_blank" rel="noreferrer">
                  <Eye className="mr-2 h-4 w-4" />
                  {t('common.view')}
                </a>
              </Button>
              <Button asChild variant="outline" size="sm">
                <a href={request.remittanceProofUrl} download>
                  <Download className="mr-2 h-4 w-4" />
                  {t('common.download')}
                </a>
              </Button>
            </div>
            {request.remittanceDate && (
              <p className="text-sm text-muted-foreground mt-2">
                {t('remittance.remittanceDate')}: {request.remittanceDate}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Approve Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('remittance.approveDialogTitle')}</DialogTitle>
            <DialogDescription>{t('remittance.messages.confirmApprove')}</DialogDescription>
          </DialogHeader>
          <div>
            <Label>{t('remittance.opinionLabel')}（{t('common.optional')}）</Label>
            <Textarea
              placeholder={t('remittance.approveOpinionPlaceholder')}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleApprove} disabled={isSubmitting}>
              {isSubmitting ? t('remittance.processing') : t('remittance.confirmApproveButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('remittance.rejectDialogTitle')}</DialogTitle>
            <DialogDescription>{t('remittance.messages.confirmReject')}</DialogDescription>
          </DialogHeader>
          <div>
            <Label>{t('remittance.messages.enterRejectReason')}</Label>
            <Textarea
              placeholder={t('remittance.rejectReasonPlaceholder')}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={isSubmitting}>
              {isSubmitting ? t('remittance.processing') : t('remittance.confirmRejectButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Dialog */}
      <Dialog open={isCompleteDialogOpen} onOpenChange={setIsCompleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('remittance.completeDialogTitle')}</DialogTitle>
            <DialogDescription>{t('remittance.completeDialogDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('remittance.remittanceDateRequired')}</Label>
              <Input
                type="date"
                value={remittanceDate}
                onChange={(e) => setRemittanceDate(e.target.value)}
              />
            </div>
            <div>
              <Label>{t('remittance.uploadProof')}</Label>
              <div className="mt-2 border-2 border-dashed border-muted rounded-lg p-4">
                {proofUrl ? (
                  <div className="space-y-3">
                    <img src={proofUrl} alt="proof" className="max-h-48 rounded-lg mx-auto" />
                    <div className="flex justify-center gap-2">
                      <Button asChild variant="outline" size="sm">
                        <a href={proofUrl} target="_blank" rel="noreferrer">
                          <Eye className="mr-2 h-4 w-4" />
                          {t('common.view')}
                        </a>
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <a href={proofUrl} download>
                          <Download className="mr-2 h-4 w-4" />
                          {t('common.download')}
                        </a>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center cursor-pointer">
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">{t('remittance.uploadProof')}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleProofUpload}
                      disabled={isProofUploading}
                    />
                  </label>
                )}
                {isProofUploading && (
                  <div className="flex justify-center mt-3">
                    <span className="text-sm text-muted-foreground">{t('common.loading')}</span>
                  </div>
                )}
              </div>
            </div>
            <div>
              <Label>{t('remittance.remarksLabel')}</Label>
              <Textarea
                placeholder={t('remittance.remarksPlaceholder')}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCompleteDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleComplete} disabled={isSubmitting || !remittanceDate || !proofUrl}>
              {isSubmitting ? t('remittance.processing') : t('remittance.confirmCompleteButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
