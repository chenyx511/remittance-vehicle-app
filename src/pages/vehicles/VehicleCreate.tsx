import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { vehicleApi } from '@/services/api';
import type { VehicleStatus } from '@/types';

export function VehicleCreate() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    plateNumber: '',
    brand: '',
    model: '',
    color: '',
    status: 'AVAILABLE' as VehicleStatus,
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.plateNumber?.trim()) {
      setError(t('vehicle.plateNumberRequired'));
      return;
    }

    setIsSubmitting(true);
    try {
      await vehicleApi.createVehicle({
        plateNumber: formData.plateNumber.trim(),
        brand: formData.brand.trim() || undefined,
        model: formData.model.trim() || undefined,
        color: formData.color.trim() || undefined,
        status: formData.status,
      });
      navigate('/vehicles');
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const message = (err as any)?.message as string | undefined;
      setError(message || t('vehicle.submitFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/vehicles')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{t('vehicle.create')}</h1>
          <p className="text-muted-foreground">{t('vehicle.createSubtitle')}</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('vehicle.vehicleInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="plateNumber">{t('vehicle.plateNumber')} *</Label>
              <Input
                id="plateNumber"
                placeholder={t('vehicle.plateNumberPlaceholder')}
                value={formData.plateNumber}
                onChange={(e) => handleInputChange('plateNumber', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="brand">{t('vehicle.brand')}</Label>
                <Input
                  id="brand"
                  placeholder={t('vehicle.brandPlaceholder')}
                  value={formData.brand}
                  onChange={(e) => handleInputChange('brand', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="model">{t('vehicle.model')}</Label>
                <Input
                  id="model"
                  placeholder={t('vehicle.modelPlaceholder')}
                  value={formData.model}
                  onChange={(e) => handleInputChange('model', e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="color">{t('vehicle.color')}</Label>
              <Input
                id="color"
                placeholder={t('vehicle.colorPlaceholder')}
                value={formData.color}
                onChange={(e) => handleInputChange('color', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="status">{t('vehicle.entityStatusLabel')}</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleInputChange('status', value as VehicleStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AVAILABLE">{t('vehicle.entityStatus.AVAILABLE')}</SelectItem>
                  <SelectItem value="IN_USE">{t('vehicle.entityStatus.IN_USE')}</SelectItem>
                  <SelectItem value="MAINTENANCE">{t('vehicle.entityStatus.MAINTENANCE')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate('/vehicles')}>
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
