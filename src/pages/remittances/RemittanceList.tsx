import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Filter, Eye, CheckCircle, XCircle } from 'lucide-react';
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
import { remittanceApi } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { formatMoneyByLanguage, getDisplayCurrencyCode } from '@/lib/currency';
import type { RemittanceRequest } from '@/types';

export function RemittanceList() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const dateLocale = i18n.language.startsWith('ja') ? 'ja-JP' : 'zh-CN';
  const [requests, setRequests] = useState<RemittanceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<RemittanceRequest | null>(null);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatAmount = (amount: number) => formatMoneyByLanguage(amount, i18n.language);
  const getCurrencyLabel = () =>
    t(`common.currencyUnit.${getDisplayCurrencyCode(i18n.language)}`);

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const response = await remittanceApi.getList({
        status: statusFilter === 'all' || !statusFilter ? undefined : statusFilter,
        keyword: searchKeyword || undefined,
      });
      setRequests(response.data.list);
    } catch {
      console.error('Failed to fetch remittance requests');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    fetchRequests();
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    setIsSubmitting(true);
    try {
      await remittanceApi.approve(selectedRequest.id, comment);
      setIsApproveDialogOpen(false);
      setComment('');
      setSelectedRequest(null);
      fetchRequests();
    } catch (error) {
      console.error('Failed to approve:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    setIsSubmitting(true);
    try {
      await remittanceApi.reject(selectedRequest.id, comment);
      setIsRejectDialogOpen(false);
      setComment('');
      setSelectedRequest(null);
      fetchRequests();
    } catch (error) {
      console.error('Failed to reject:', error);
    } finally {
      setIsSubmitting(false);
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

  const canApprove = (request: RemittanceRequest) => {
    return user?.role === 'SUPERVISOR' && request.status === 'PENDING';
  };

  const canComplete = (request: RemittanceRequest) => {
    return user?.role === 'FINANCE' && request.status === 'SUPERVISOR_APPROVED';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('remittance.title')}</h1>
          <p className="text-muted-foreground">{t('remittance.subtitle')}</p>
        </div>
        <Button onClick={() => navigate('/remittances/create')}>
          <Plus className="mr-2 h-4 w-4" />
          {t('remittance.create')}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('remittance.searchPlaceholder')}
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
                <SelectItem value="PENDING">{t('remittance.status.PENDING')}</SelectItem>
                <SelectItem value="SUPERVISOR_APPROVED">{t('remittance.status.SUPERVISOR_APPROVED')}</SelectItem>
                <SelectItem value="FINANCE_PROCESSING">{t('remittance.status.FINANCE_PROCESSING')}</SelectItem>
                <SelectItem value="COMPLETED">{t('remittance.status.COMPLETED')}</SelectItem>
                <SelectItem value="REJECTED">{t('remittance.status.REJECTED')}</SelectItem>
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
          <CardTitle>{t('remittance.list')}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">{t('remittance.noRemittances')}</div>
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
                    {(request.contractNo || (request.recipientName && request.recipientName !== 'N/A')) && (
                      <div className="text-sm text-muted-foreground">
                        {request.contractNo && (
                          <>
                            {t('remittance.contractShort')}: {request.contractNo}
                          </>
                        )}
                        {request.contractNo && request.recipientName && request.recipientName !== 'N/A' && ' · '}
                        {request.recipientName && request.recipientName !== 'N/A' && (
                          <>
                            {t('remittance.recipientShortLabel')}: {request.recipientName}
                          </>
                        )}
                      </div>
                    )}
                    <div className="text-sm">
                      {t('remittance.applicant')}: {request.applicant?.username} · {t('remittance.applicationTime')}:{' '}
                      {new Date(request.createdAt).toLocaleString(dateLocale)}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-4 sm:mt-0">
                    {request.amount > 0 && (
                      <div className="text-right">
                        <div className="text-xl font-bold">{formatAmount(request.amount)}</div>
                        <div className="text-sm text-muted-foreground">{getCurrencyLabel()}</div>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/remittances/${request.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {canApprove(request) && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-green-600"
                            onClick={() => {
                              setSelectedRequest(request);
                              setIsApproveDialogOpen(true);
                            }}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-600"
                            onClick={() => {
                              setSelectedRequest(request);
                              setIsRejectDialogOpen(true);
                            }}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {canComplete(request) && (
                        <Button size="sm" onClick={() => navigate(`/remittances/${request.id}`)}>
                          {t('remittance.actions.process')}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('remittance.approveDialogTitle')}</DialogTitle>
            <DialogDescription>{t('remittance.messages.confirmApprove')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t('remittance.opinionLabel')}（{t('common.optional')}）</label>
              <Textarea
                placeholder={t('remittance.approveOpinionPlaceholder')}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
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
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t('remittance.messages.enterRejectReason')}</label>
              <Textarea
                placeholder={t('remittance.rejectReasonPlaceholder')}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
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
    </div>
  );
}
