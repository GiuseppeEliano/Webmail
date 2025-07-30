import { useQuery } from "@tanstack/react-query";

export interface StorageInfo {
  used: number;
  quota: number;
}

export function useStorage(userId: number) {
  return useQuery<StorageInfo>({
    queryKey: [`/api/storage/${userId}`],
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useStorageCheck(userId: number) {
  return useQuery<{ canReceive: boolean }>({
    queryKey: ["storage-check", userId],
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

// Utility functions for storage display
export function formatStorageSize(bytes: number): string {
  if (bytes === 0) return '0.0 MB';
  
  const k = 1024;
  const mbBytes = k * k; // 1MB = 1048576 bytes
  
  // Always show in MB for storage display consistency
  if (bytes >= mbBytes) {
    const mb = bytes / mbBytes;
    return mb.toFixed(1) + ' MB';
  } else {
    const mb = bytes / mbBytes;
    return mb.toFixed(1) + ' MB';
  }
}

export function getStoragePercentage(used: number, quota: number): number {
  if (quota === 0) return 0;
  return Math.round((used / quota) * 100);
}

export function getStorageStatus(used: number, quota: number): 'ok' | 'warning' | 'full' {
  const percentage = getStoragePercentage(used, quota);
  if (percentage >= 100) return 'full';
  if (percentage >= 80) return 'warning';
  return 'ok';
}