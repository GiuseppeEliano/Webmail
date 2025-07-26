import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Email, User } from '@shared/schema';

interface PaginatedEmailsResponse {
  emails: Email[];
  totalCount: number;
  hasMore: boolean;
  currentPage: number;
  totalPages: number;
}

export function usePaginatedEmails(userId: number, folderType: string, filters?: { filterBy?: string, sortBy?: string, tagFilter?: number | null }) {
  const queryClient = useQueryClient();
  
  // Memoize filters to prevent unnecessary re-renders
  const memoizedFilters = useMemo(() => filters, [filters?.filterBy, filters?.sortBy, filters?.tagFilter]);
  
  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [emailsPerPage, setEmailsPerPage] = useState(() => {
    // Priority order: 1) React Query cache, 2) localStorage backup, 3) default 20
    const cachedUserData = queryClient.getQueryData<User>([`/api/user/${userId}`]);
    if (cachedUserData?.emailsPerPage) {
      return cachedUserData.emailsPerPage;
    }
    
    const localStorageBackup = localStorage.getItem(`emailsPerPage_${userId}`);
    if (localStorageBackup) {
      return parseInt(localStorageBackup);
    }
    
    return 20; // Default fallback
  });
  
  // Get user data to fetch emailsPerPage setting - with longer cache time
  const { data: userData } = useQuery<User>({
    queryKey: [`/api/user/${userId}`],
    queryFn: async () => {
      const response = await fetch(`/api/user/${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }
      return response.json();
    },
    enabled: !!userId,
    staleTime: 15 * 60 * 1000, // Cache for 15 minutes (longer cache)
    gcTime: 30 * 60 * 1000, // Keep in memory for 30 minutes
  });
  
  // Update emailsPerPage when user data is available
  useEffect(() => {
    if (userData?.emailsPerPage && userData.emailsPerPage !== emailsPerPage) {
      setEmailsPerPage(userData.emailsPerPage);
      // Store as backup in localStorage for immediate access on page refresh
      localStorage.setItem(`emailsPerPage_${userId}`, userData.emailsPerPage.toString());
    }
  }, [userData?.emailsPerPage, emailsPerPage, userId]);
  
  // Reset to page 1 when filters change and clear cache
  useEffect(() => {
    setCurrentPage(1);
    // Clear all cache for this folder when filters change
    queryClient.removeQueries({
      predicate: (query) => {
        const key = query.queryKey[0]?.toString() || '';
        return key === `/api/emails/${userId}/folder/${folderType}`;
      }
    });
  }, [memoizedFilters, userId, folderType, queryClient]);

  // Calculate offset based on current page
  const offset = (currentPage - 1) * emailsPerPage;

  // Main query for current page
  const { data, isLoading, error } = useQuery<PaginatedEmailsResponse>({
    queryKey: [`/api/emails/${userId}/folder/${folderType}`, emailsPerPage, offset, memoizedFilters],
    queryFn: async ({ queryKey }) => {
      const [url, limitParam, offsetParam, filtersParam] = queryKey;
      const params = new URLSearchParams({
        limit: limitParam.toString(),
        offset: offsetParam.toString(),
      });
      
      // Add filter parameters if they exist
      if (filtersParam) {
        if (filtersParam.filterBy) params.append('filterBy', filtersParam.filterBy);
        if (filtersParam.sortBy) params.append('sortBy', filtersParam.sortBy);
        if (filtersParam.tagFilter) params.append('tagFilter', filtersParam.tagFilter.toString());
      }
      
      const response = await fetch(`${url}?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch emails');
      }
      return response.json();
    },
    enabled: !!folderType,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in memory for 10 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });

  // Smart cache management - only keep adjacent pages
  const cleanupCache = (newPage: number) => {
    // Remove all cached pages except current and adjacent ones
    const pagesToKeep = [newPage - 1, newPage, newPage + 1];
    
    queryClient.getQueryCache().getAll().forEach(query => {
      const queryKey = query.queryKey;
      if (
        queryKey[0] === `/api/emails/${userId}/folder/${folderType}` &&
        queryKey[1] === emailsPerPage
      ) {
        const pageOffset = queryKey[2] as number;
        const page = Math.floor(pageOffset / emailsPerPage) + 1;
        
        if (!pagesToKeep.includes(page)) {
          queryClient.removeQueries({ queryKey });
        }
      }
    });
  };

  // Navigation functions
  const goToPage = (page: number) => {
    if (page >= 1 && (data ? page <= data.totalPages : true)) {
      setCurrentPage(page);
      // Don't cleanup cache immediately to allow faster navigation
      setTimeout(() => cleanupCache(page), 100);
    }
  };

  const goToNextPage = () => {
    if (data && currentPage < data.totalPages) {
      goToPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  };

  // Listen for emailsPerPage changes
  useEffect(() => {
    const handleEmailsPerPageChange = (event: CustomEvent) => {
      const newEmailsPerPage = event.detail;
      setEmailsPerPage(newEmailsPerPage);
      setCurrentPage(1); // Reset to first page
      
      // Clear all cache for this folder to refetch with new limit
      queryClient.removeQueries({
        predicate: (query) => {
          const key = query.queryKey[0]?.toString() || '';
          return key === `/api/emails/${userId}/folder/${folderType}`;
        }
      });
    };

    window.addEventListener('emailsPerPageChanged', handleEmailsPerPageChange as EventListener);
    
    return () => {
      window.removeEventListener('emailsPerPageChanged', handleEmailsPerPageChange as EventListener);
    };
  }, [userId, folderType, queryClient]);

  // Reset page when folder changes
  useEffect(() => {
    setCurrentPage(1);
    cleanupCache(1);
  }, [folderType]);

  return {
    // Data
    emails: data?.emails || [],
    totalCount: data?.totalCount || 0,
    totalPages: data?.totalPages || 0,
    currentPage,
    emailsPerPage,
    
    // States
    isLoading,
    error,
    hasMore: data?.hasMore || false,
    hasPrevious: currentPage > 1,
    hasNext: data ? currentPage < data.totalPages : false,
    
    // Actions
    goToPage,
    goToNextPage,
    goToPreviousPage,
    
    // Cache info for debugging
    getCacheInfo: () => {
      const cacheEntries = queryClient.getQueryCache().getAll()
        .filter(query => 
          query.queryKey[0] === `/api/emails/${userId}/folder/${folderType}` &&
          query.queryKey[1] === emailsPerPage
        )
        .map(query => ({
          page: Math.floor((query.queryKey[2] as number) / emailsPerPage) + 1,
          key: query.queryKey
        }));
      return cacheEntries;
    }
  };
}