import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Edit, Trash2, Search, Filter, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { vehicleApi } from '@/services/api';
import type { Vehicle, VehicleStatus } from '@/types';

export function VehicleManage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [formData, setFormData] = useState({
    plateNumber: '',
    brand: '',
    model: '',
    color: '',
    status: 'AVAILABLE' as VehicleStatus,
  });

  useEffect(() => {
    fetchVehicles();
  }, [statusFilter]);

  const fetchVehicles = async () => {
    setIsLoading(true);
    try {
      const res = await vehicleApi.getVehicles({
        status: statusFilter === 'all' ? undefined : statusFilter,
        keyword: keyword.trim() || undefined,
      });
      setVehicles(res.data);
    } catch {
      setError(t('vehicle.fetchVehiclesFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const openEdit = (v: Vehicle) => {
    setEditing(v);
    setFormData({
      plateNumber: v.plateNumber,
      brand: v.brand || '',
      model: v.model || '',
      color: v.color || '',
      status: v.status,
    });
    setError(null);
  };

  const saveEdit = async () => {
    if (!editing) return;
    setIsSaving(true);
    try {
      await vehicleApi.updateVehicle(editing.id, {
        plateNumber: formData.plateNumber.trim(),
        brand: formData.brand.trim() || undefined,
        model: formData.model.trim() || undefined,
        color: formData.color.trim() || undefined,
        status: formData.status,
      });
      setEditing(null);
      fetchVehicles();
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message;
      setError(msg || t('vehicle.updateVehicleFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (v: Vehicle) => {
    if (!window.confirm(t('vehicle.deleteConfirm'))) return;
    try {
      await vehicleApi.deleteVehicle(v.id);
      fetchVehicles();
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message;
      setError(msg || t('vehicle.deleteVehicleFailed'));
    }
  };

  const getStatusBadge = (status: VehicleStatus) => {
    const label = t(`vehicle.entityStatus.${status}`);
    if (status === 'AVAILABLE') return <Badge variant="success">{label}</Badge>;
    if (status === 'IN_USE') return <Badge variant="warning">{label}</Badge>;
    return <Badge variant="secondary">{label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/vehicles')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{t('vehicle.manageTitle')}</h1>
            <p className="text-muted-foreground">{t('vehicle.manageSubtitle')}</p>
          </div>
        </div>
        <Button onClick={() => navigate('/vehicles/create')}>{t('vehicle.addVehicle')}</Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchVehicles()}
                placeholder={t('vehicle.manageSearchPlaceholder')}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.allStatus')}</SelectItem>
                <SelectItem value="AVAILABLE">{t('vehicle.entityStatus.AVAILABLE')}</SelectItem>
                <SelectItem value="IN_USE">{t('vehicle.entityStatus.IN_USE')}</SelectItem>
                <SelectItem value="MAINTENANCE">{t('vehicle.entityStatus.MAINTENANCE')}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchVehicles}>
              <Filter className="mr-2 h-4 w-4" />
              {t('common.filter')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('vehicle.manageList')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="text-muted-foreground">{t('common.loading')}</div>
          ) : vehicles.length === 0 ? (
            <div className="text-muted-foreground">{t('vehicle.noVehicles')}</div>
          ) : (
            vehicles.map((v) => (
              <div
                key={v.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border p-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{v.plateNumber}</span>
                    {getStatusBadge(v.status)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t('vehicle.brand')}: {v.brand || '-'} · {t('vehicle.model')}: {v.model || '-'} ·{' '}
                    {t('vehicle.color')}: {v.color || '-'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(v)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(v)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('vehicle.editVehicle')}</DialogTitle>
            <DialogDescription>{editing?.plateNumber}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{t('vehicle.plateNumber')}</Label>
              <Input
                value={formData.plateNumber}
                onChange={(e) => setFormData((p) => ({ ...p, plateNumber: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('vehicle.brand')}</Label>
                <Input value={formData.brand} onChange={(e) => setFormData((p) => ({ ...p, brand: e.target.value }))} />
              </div>
              <div>
                <Label>{t('vehicle.model')}</Label>
                <Input value={formData.model} onChange={(e) => setFormData((p) => ({ ...p, model: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>{t('vehicle.color')}</Label>
              <Input value={formData.color} onChange={(e) => setFormData((p) => ({ ...p, color: e.target.value }))} />
            </div>
            <div>
              <Label>{t('vehicle.entityStatusLabel')}</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData((p) => ({ ...p, status: value as VehicleStatus }))}
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={saveEdit} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('remittance.submitting')}
                </>
              ) : (
                t('common.save')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

