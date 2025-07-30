import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { useLanguage } from '@/hooks/use-language';

export function useConnectionMonitor() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isServerConnected, setIsServerConnected] = useState(true);
  const { toast } = useToast();
  const { t } = useLanguage();
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastToastRef = useRef<string | null>(null);
  const disconnectedToastRef = useRef<any>(null);
  const offlineToastRef = useRef<any>(null);

  const checkServerConnection = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch('/api/health', {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        if (!isServerConnected) {
          setIsServerConnected(true);
          if (lastToastRef.current === 'disconnected') {
            // Dismiss the disconnected toast explicitly
            if (disconnectedToastRef.current) {
              disconnectedToastRef.current.dismiss();
              disconnectedToastRef.current = null;
            }
            
            toast({
              title: t('connectionRestored'),
              description: t('connectionRestoredDescription'),
              variant: "default",
              duration: 3000, // Show for 3 seconds
            });
            lastToastRef.current = 'connected';
          }
          // Refresh data when connection is restored
          queryClient.invalidateQueries();
        }
        return true;
      } else {
        throw new Error(`Server responded with status: ${response.status}`);
      }
    } catch (error) {
      // Handle all types of network errors including ERR_INTERNET_DISCONNECTED
      if (isServerConnected) {
        setIsServerConnected(false);
        if (lastToastRef.current !== 'disconnected') {
          const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
          console.log('Connection error:', errorMessage);
          
          disconnectedToastRef.current = toast({
            title: t('connectionLost'),
            description: t('connectionLostDescription'),
            variant: "destructive",
            duration: 0, // Keep toast visible
          });
          lastToastRef.current = 'disconnected';
        }
      }
      return false;
    }
  };

  const startReconnectAttempts = () => {
    if (reconnectIntervalRef.current) return;
    
    reconnectIntervalRef.current = setInterval(async () => {
      const connected = await checkServerConnection();
      if (connected && reconnectIntervalRef.current) {
        clearInterval(reconnectIntervalRef.current);
        reconnectIntervalRef.current = null;
      }
    }, 5000); // Try every 5 seconds
  };

  const stopReconnectAttempts = () => {
    if (reconnectIntervalRef.current) {
      clearInterval(reconnectIntervalRef.current);
      reconnectIntervalRef.current = null;
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Dismiss offline toast when internet comes back
      if (offlineToastRef.current && lastToastRef.current === 'offline') {
        offlineToastRef.current.dismiss();
        offlineToastRef.current = null;
      }
      checkServerConnection();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsServerConnected(false);
      if (lastToastRef.current !== 'offline') {
        offlineToastRef.current = toast({
          title: "Sem conexão com a internet",
          description: "Verifique sua conexão com a internet",
          variant: "destructive",
          duration: 0,
        });
        lastToastRef.current = 'offline';
      }
    };

    // Initial connection check
    checkServerConnection();

    // Set up periodic checks (more frequent for better responsiveness)
    checkIntervalRef.current = setInterval(checkServerConnection, 10000); // Check every 10 seconds

    // Listen for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
      stopReconnectAttempts();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isServerConnected, toast]);

  // Start reconnection attempts when server becomes disconnected
  useEffect(() => {
    if (!isServerConnected && isOnline) {
      startReconnectAttempts();
    } else {
      stopReconnectAttempts();
    }
  }, [isServerConnected, isOnline]);

  return { isOnline, isServerConnected };
}