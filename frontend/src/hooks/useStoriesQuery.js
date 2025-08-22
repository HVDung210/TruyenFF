import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storyService } from '../services/storyService';

export const QUERY_KEYS = {
  STORIES: 'stories',
  STORY: 'story',
  CHAPTERS: 'chapters',
  CHAPTER: 'chapter',
  SEARCH: 'search',
  STORIES_BY_GENRE: 'stories-by-genre',
};

// Hook để lấy tất cả truyện
export function useStories() {
  return useQuery({
    queryKey: [QUERY_KEYS.STORIES],
    queryFn: storyService.getAllStories,
    // Tăng thời gian cache để giảm refetch
    staleTime: 10 * 60 * 1000, // 10 phút
    cacheTime: 30 * 60 * 1000, // 30 phút
    // Giữ data cũ khi refetch để tránh loading state
    keepPreviousData: true,
    // Retry configuration
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

// Hook để lấy truyện theo thể loại
export function useStoriesByGenre(genre) {
  return useQuery({
    queryKey: [QUERY_KEYS.STORIES_BY_GENRE, genre],
    queryFn: () => storyService.getStoriesByGenre(genre),
    enabled: !!genre && genre !== 'Tất cả',
    staleTime: 10 * 60 * 1000, // 10 phút
    cacheTime: 30 * 60 * 1000, // 30 phút
    // Giữ data cũ khi switch genre
    keepPreviousData: true,
    // Background refetch để update data mà không show loading
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
    staleTime: 15 * 60 * 1000, // 15 phút cho story details
    cacheTime: 60 * 60 * 1000, // 1 giờ
    keepPreviousData: true,
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
  });
}

// Hook để lấy chi tiết chapter
export function useChapter(storyId, chapterNumber) {
  return useQuery({
    queryKey: [QUERY_KEYS.CHAPTER, storyId, chapterNumber],
    queryFn: () => storyService.getChapter(storyId, chapterNumber),
    enabled: !!(storyId && chapterNumber),
    staleTime: 30 * 60 * 1000, // 30 phút cho chapter content
    cacheTime: 2 * 60 * 60 * 1000, // 2 giờ
    keepPreviousData: true,
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
    queryClient.prefetchQuery({
      queryKey: [QUERY_KEYS.STORY, id],
      queryFn: () => storyService.getStoryById(id),
      staleTime: 15 * 60 * 1000,
    });
  };

  const prefetchChapter = (storyId, chapterNumber) => {
    queryClient.prefetchQuery({
      queryKey: [QUERY_KEYS.CHAPTER, storyId, chapterNumber],
      queryFn: () => storyService.getChapter(storyId, chapterNumber),
      staleTime: 30 * 60 * 1000,
    });
  };

  const prefetchChapters = (storyId) => {
    queryClient.prefetchQuery({
      queryKey: [QUERY_KEYS.CHAPTERS, storyId],
      queryFn: () => storyService.getStoryChapters(storyId),
      staleTime: 10 * 60 * 1000,
    });
  };

  const prefetchStoriesByGenre = (genre) => {
    // Tránh prefetch nếu đã có trong cache
    const existingData = queryClient.getQueryData([QUERY_KEYS.STORIES_BY_GENRE, genre]);
    if (existingData) return;

    queryClient.prefetchQuery({
      queryKey: [QUERY_KEYS.STORIES_BY_GENRE, genre],
      queryFn: () => storyService.getStoriesByGenre(genre),
      staleTime: 10 * 60 * 1000,
    });
  };

  // Prefetch multiple genres cùng lúc (cho popular genres)
  const prefetchPopularGenres = () => {
    const popularGenres = ['Action', 'Romance', 'Fantasy', 'Comedy', 'Drama'];
    popularGenres.forEach(genre => {
      prefetchStoriesByGenre(genre);
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