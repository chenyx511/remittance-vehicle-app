import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Upload, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { remittanceApi, userApi } from '@/services/api';
import type { User } from '@/types';

export function RemittanceCreate() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [supervisors, setSupervisors] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    contractNo: '',
    amount: '',
    currency: 'CNY',
    recipientName: '',
    recipientAccount: '',
    recipientBank: '',
    settlementDetailUrl: '',
    supervisorId: '',
    remark: '',
  });

  useEffect(() => {
    fetchSupervisors();
  }, []);

  const fetchSupervisors = async () => {
    try {
      const response = await userApi.getSupervisors();
      setSupervisors(response.data);
    } catch {
      console.error('Failed to fetch supervisors');
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const response = await remittanceApi.upload(file, 'settlement');
      setUploadedImage(response.data.url);
      setFormData((prev) => ({ ...prev, settlementDetailUrl: response.data.url }));
    } catch {
      console.error('Failed to upload file');
      setError(t('remittance.uploadFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.supervisorId) {
      setError(t('remittance.selectSupervisorRequired'));
      return;
    }

    setIsSubmitting(true);
    try {
      await remittanceApi.create({
        contractNo: formData.contractNo || undefined,
        amount: parseFloat(formData.amount) || 0,
        currency: formData.currency || 'CNY',
        recipientName: formData.recipientName || 'N/A',
        recipientAccount: formData.recipientAccount || undefined,
        recipientBank: formData.recipientBank || undefined,
        settlementDetailUrl: formData.settlementDetailUrl,
        supervisorId: formData.supervisorId,
      });
      navigate('/remittances');
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const message = (error as any)?.message as string | undefined;
      setError(message || t('remittance.submitFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Settlement Detail */}
        <Card>
          <CardHeader>
            <CardTitle>{t('remittance.settlementDetail')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-muted rounded-lg p-6">
              {uploadedImage ? (
                <div className="relative">
                  <img
                    src={uploadedImage}
                    alt="Settlement"
                    className="max-h-64 mx-auto rounded-lg"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setUploadedImage(null);
                      setFormData((prev) => ({ ...prev, settlementDetailUrl: '' }));
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center cursor-pointer">
                  <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                  <span className="text-muted-foreground">{t('remittance.uploadSettlement')}</span>
                  <span className="text-sm text-muted-foreground mt-1">JPG, PNG</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={isLoading}
                  />
                </label>
              )}
              {isLoading && (
                <div className="flex justify-center mt-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Approver */}
        <Card>
          <CardHeader>
            <CardTitle>{t('remittance.approverTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="supervisor">{t('remittance.selectSupervisor')} *</Label>
              <Select
                value={formData.supervisorId}
                onValueChange={(value) => handleInputChange('supervisorId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('remittance.selectSupervisor')} />
                </SelectTrigger>
                <SelectContent>
                  {supervisors.map((supervisor) => (
                    <SelectItem key={supervisor.id} value={supervisor.id}>
                      {supervisor.username} ({supervisor.department})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="remark">{t('remittance.remarksLabel')}</Label>
              <Textarea
                id="remark"
                placeholder={t('remittance.remarkPlaceholder')}
                value={formData.remark}
                onChange={(e) => handleInputChange('remark', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate('/remittances')}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('remittance.submitting')}
              </>
            ) : (
              t('common.submit')
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
