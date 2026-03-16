import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import type { Vehicle } from '@/types';

export function VehicleApply() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    vehicleId: '',
    purpose: '',
    destination: '',
    startTime: '',
    endTime: '',
    passengers: '1',
  });

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const response = await vehicleApi.getVehicles();
      setVehicles(response.data.filter((v) => v.status === 'AVAILABLE'));
    } catch {
      console.error('Failed to fetch vehicles');
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.vehicleId) {
      setError('请选择车辆');
      return;
    }
    if (!formData.purpose) {
      setError('请输入用车目的');
      return;
    }
    if (!formData.startTime) {
      setError('请选择开始时间');
      return;
    }
    if (!formData.endTime) {
      setError('请选择结束时间');
      return;
    }
    if (new Date(formData.startTime) >= new Date(formData.endTime)) {
      setError('结束时间必须晚于开始时间');
      return;
    }

    setIsSubmitting(true);
    try {
      await vehicleApi.create({
        vehicleId: formData.vehicleId,
        purpose: formData.purpose,
        destination: formData.destination,
        startTime: formData.startTime,
        endTime: formData.endTime,
        passengers: parseInt(formData.passengers),
      });
      navigate('/vehicles');
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const message = (error as any)?.message as string | undefined;
      setError(message || '提交失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedVehicle = vehicles.find((v) => v.id === formData.vehicleId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/vehicles')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">申请用车</h1>
          <p className="text-muted-foreground">填写用车申请信息</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Vehicle Selection */}
        <Card>
          <CardHeader>
            <CardTitle>选择车辆</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="vehicle">可用车辆 *</Label>
              <Select
                value={formData.vehicleId}
                onValueChange={(value) => handleInputChange('vehicleId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="请选择车辆" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.length === 0 ? (
                    <SelectItem value="" disabled>
                      暂无可用车
                    </SelectItem>
                  ) : (
                    vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.plateNumber} - {vehicle.brand} {vehicle.model} ({vehicle.color})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            {selectedVehicle && (
              <div className="p-4 bg-muted rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">车牌号:</span>
                    <span className="ml-2 font-medium">{selectedVehicle.plateNumber}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">品牌:</span>
                    <span className="ml-2 font-medium">{selectedVehicle.brand}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">型号:</span>
                    <span className="ml-2 font-medium">{selectedVehicle.model}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">颜色:</span>
                    <span className="ml-2 font-medium">{selectedVehicle.color}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trip Info */}
        <Card>
          <CardHeader>
            <CardTitle>行程信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="purpose">用车目的 *</Label>
              <Input
                id="purpose"
                placeholder="请输入用车目的，如：带客户看房"
                value={formData.purpose}
                onChange={(e) => handleInputChange('purpose', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="destination">目的地</Label>
              <Input
                id="destination"
                placeholder="请输入目的地"
                value={formData.destination}
                onChange={(e) => handleInputChange('destination', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startTime">开始时间 *</Label>
                <Input
                  id="startTime"
                  type="datetime-local"
                  value={formData.startTime}
                  onChange={(e) => handleInputChange('startTime', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="endTime">结束时间 *</Label>
                <Input
                  id="endTime"
                  type="datetime-local"
                  value={formData.endTime}
                  onChange={(e) => handleInputChange('endTime', e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="passengers">乘车人数</Label>
              <Select
                value={formData.passengers}
                onValueChange={(value) => handleInputChange('passengers', value)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                    <SelectItem key={num} value={String(num)}>
                      {num}人
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate('/vehicles')}>
            取消
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                提交中...
              </>
            ) : (
              '提交申请'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
