import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, HardDrive } from "lucide-react";
import { useStorage, formatStorageSize, getStoragePercentage, getStorageStatus } from "@/hooks/use-storage";
import { t } from "@/lib/i18n";

interface StorageIndicatorProps {
  userId: number;
  className?: string;
}

export function StorageIndicator({ userId, className }: StorageIndicatorProps) {
  const { data: storageInfo, isLoading, error } = useStorage(userId);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <HardDrive className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="text-sm font-medium text-muted-foreground">
                {t("storage.loading")}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !storageInfo) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <div className="flex-1">
              <div className="text-sm font-medium text-red-600">
                {t("storage.error")}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const percentage = getStoragePercentage(storageInfo.used, storageInfo.quota);
  const status = getStorageStatus(storageInfo.used, storageInfo.quota);
  const usedFormatted = formatStorageSize(storageInfo.used);
  const quotaFormatted = formatStorageSize(storageInfo.quota);

  const getProgressColor = () => {
    switch (status) {
      case 'full': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  const getTextColor = () => {
    switch (status) {
      case 'full': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <HardDrive className={`h-4 w-4 ${getTextColor()}`} />
              <span className="text-sm font-medium">
                {t("storage.title")}
              </span>
            </div>
            {status === 'full' && (
              <AlertTriangle className="h-4 w-4 text-red-500" />
            )}
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className={getTextColor()}>
                {usedFormatted} de {quotaFormatted}
              </span>
              <span className={getTextColor()}>
                {percentage}%
              </span>
            </div>
            
            <div className="relative">
              <Progress 
                value={percentage} 
                className="h-2"
              />
              <div 
                className={`absolute top-0 left-0 h-2 rounded-full transition-all ${getProgressColor()}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
            
            {status === 'full' && (
              <div className="text-xs text-red-600 mt-2">
                {t("storage.fullMessage")}
              </div>
            )}
            
            {status === 'warning' && (
              <div className="text-xs text-yellow-600 mt-2">
                {t("storage.warningMessage")}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}