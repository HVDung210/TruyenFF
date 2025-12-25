import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storyService } from '../services/storyService';

export const QUERY_KEYS = {
  STORIES: 'stories',
  STORY: 'story',
  CHAPTERS: 'chapters',
  CHAPTER: 'chapter',
  SEARCH: 'search',
  STORIES_BY_GENRE: 'stories-by-genre',
  FOLLOWED_STORIES: 'followedStories',
  FOLLOWED_IDS: 'followedStoryIds',
  FOLLOW_STATUS: 'followStatus',
};

// Hook để lấy tất cả truyện
export function useStories() {
  return useQuery({
    queryKey: [QUERY_KEYS.STORIES],
    queryFn: storyService.getAllStories,
    staleTime: 10 * 60 * 1000, // 10 phút
    cacheTime: 30 * 60 * 1000, // 30 phút
    keepPreviousData: true,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    // FIX: Không refetch liên tục
    refetchOnMount: false, 
    refetchOnWindowFocus: false,
    // Chỉ refetch khi thực sự cần
    refetchInterval: false,
  });
}

// Hook để lấy truyện theo thể loại
export function useStoriesByGenre(genre) {
  return useQuery({
    queryKey: [QUERY_KEYS.STORIES_BY_GENRE, genre],
    queryFn: () => storyService.getStoriesByGenre(genre),
    enabled: !!genre && genre !== 'Tất cả',
    staleTime: 10 * 60 * 1000,
    cacheTime: 30 * 60 * 1000,
    keepPreviousData: true,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

// Hook để lấy chi tiết truyện
export function useStory(id) {
  return useQuery({
    queryKey: [QUERY_KEYS.STORY, id],
    queryFn: () => storyService.getStoryById(id),
    enabled: !!id,
    staleTime: 15 * 60 * 1000,
    cacheTime: 60 * 60 * 1000,
    keepPreviousData: true,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    
  });
}

// Hook để lấy chapters
export function useStoryChapters(storyId) {
  return useQuery({
    queryKey: [QUERY_KEYS.CHAPTERS, storyId],
    queryFn: () => storyService.getStoryChapters(storyId),
    enabled: !!storyId,
    staleTime: 10 * 60 * 1000,
    cacheTime: 30 * 60 * 1000,
    keepPreviousData: true,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

// Hook để lấy chi tiết chapter
export function useChapter(storyId, chapterNumber) {
  return useQuery({
    queryKey: [QUERY_KEYS.CHAPTER, storyId, chapterNumber],
    queryFn: () => storyService.getChapter(storyId, chapterNumber),
    enabled: !!(storyId && chapterNumber),
    staleTime: 30 * 60 * 1000,
    cacheTime: 2 * 60 * 60 * 1000,
    keepPreviousData: true,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

// Hook cho search với debounce
export function useSearchStories(query) {
  return useQuery({
    queryKey: [QUERY_KEYS.SEARCH, query],
    queryFn: () => storyService.searchStoriesByDescription(query),
    enabled: !!query && query.trim().length > 2, // Tăng min length
    staleTime: 5 * 60 * 1000, // 5 phút
    cacheTime: 15 * 60 * 1000, // 15 phút
    keepPreviousData: true,
    // Debounce search
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

// Mutation hook cho search (nếu muốn control manual)
export function useSearchStoriesMutation() {
  return useMutation({
    mutationFn: storyService.searchStoriesByDescription,
  });
}

// Hook để prefetch data (tối ưu UX)
export function usePrefetchStories() {
  const queryClient = useQueryClient();

  const prefetchStory = (id) => {
    // Kiểm tra xem data đã có trong cache chưa
    const existingData = queryClient.getQueryData([QUERY_KEYS.STORY, id]);
    if (existingData) return; // Không prefetch nếu đã có data

    queryClient.prefetchQuery({
      queryKey: [QUERY_KEYS.STORY, id],
      queryFn: () => storyService.getStoryById(id),
      staleTime: 15 * 60 * 1000,
    });
  };

  const prefetchChapter = (storyId, chapterNumber) => {
    const existingData = queryClient.getQueryData([QUERY_KEYS.CHAPTER, storyId, chapterNumber]);
    if (existingData) return;

    queryClient.prefetchQuery({
      queryKey: [QUERY_KEYS.CHAPTER, storyId, chapterNumber],
      queryFn: () => storyService.getChapter(storyId, chapterNumber),
      staleTime: 30 * 60 * 1000,
    });
  };

  const prefetchChapters = (storyId) => {
    const existingData = queryClient.getQueryData([QUERY_KEYS.CHAPTERS, storyId]);
    if (existingData) return;

    queryClient.prefetchQuery({
      queryKey: [QUERY_KEYS.CHAPTERS, storyId],
      queryFn: () => storyService.getStoryChapters(storyId),
      staleTime: 10 * 60 * 1000,
    });
  };

  const prefetchStoriesByGenre = (genre) => {
    const existingData = queryClient.getQueryData([QUERY_KEYS.STORIES_BY_GENRE, genre]);
    if (existingData) return;

    queryClient.prefetchQuery({
      queryKey: [QUERY_KEYS.STORIES_BY_GENRE, genre],
      queryFn: () => storyService.getStoriesByGenre(genre),
      staleTime: 10 * 60 * 1000,
    });
  };

  // Prefetch multiple genres cùng lúc - với throttling
  const prefetchPopularGenres = () => {
    const popularGenres = ['Action', 'Romance', 'Fantasy', 'Comedy', 'Drama'];
    popularGenres.forEach((genre, index) => {
      // Delay mỗi request để tránh quá tải
      setTimeout(() => {
        prefetchStoriesByGenre(genre);
      }, index * 100);
    });
  };

  return { 
    prefetchStory, 
    prefetchChapter, 
    prefetchChapters, 
    prefetchStoriesByGenre,
    prefetchPopularGenres 
  };
}


// Hook để invalidate và refetch data
export function useRefreshData() {
  const queryClient = useQueryClient();

  const refreshStories = () => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.STORIES] });
  };

  const refreshStory = (id) => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.STORY, id] });
  };

  const refreshChapters = (storyId) => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CHAPTERS, storyId] });
  };

  const refreshStoriesByGenre = (genre) => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.STORIES_BY_GENRE, genre] });
  };

  // Soft refresh - chỉ invalidate mà không force refetch ngay
  const softRefresh = () => {
    queryClient.invalidateQueries({ 
      queryKey: [QUERY_KEYS.STORIES],
      refetchType: 'none' // Chỉ mark stale, không refetch ngay
    });
  };

  return { 
    refreshStories, 
    refreshStory, 
    refreshChapters, 
    refreshStoriesByGenre,
    softRefresh 
  };
}

export function useFollowedStories() {
  return useQuery({
    queryKey: ['followedStories'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/followed-stories', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to fetch followed stories');
      
      const data = await response.json();
      return data.stories || [];
    },
    enabled: !!localStorage.getItem('token'),
    staleTime: 1 * 60 * 1000, // 1 phút - để data refresh nhanh hơn
    cacheTime: 15 * 60 * 1000,
    refetchOnMount: true, // ✅ Luôn refetch khi mount lại
    refetchOnWindowFocus: true, // ✅ Refetch khi user quay lại tab
  });
}

// Hook để check trạng thái follow
export function useFollowStatus(storyId) {
  return useQuery({
    queryKey: ['followStatus', storyId],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/follow/${storyId}/check`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to check follow status');
      
      const data = await response.json();
      return data.checkFollowing;
    },
    enabled: !!(storyId && localStorage.getItem('token')),
    staleTime: 3 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

// Hook để follow/unfollow
export function useFollowMutation(storyId) {
  const queryClient = useQueryClient();

  const followMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/follow/${storyId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to follow');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['followStatus', storyId]);
      queryClient.invalidateQueries(['followedStories']);
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/unfollow/${storyId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to unfollow');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['followStatus', storyId]);
      queryClient.invalidateQueries(['followedStories']);
    },
  });

  return { followMutation, unfollowMutation };
}