import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { 
  useStory, 
  useChapter, 
  useStoryChapters, 
  usePrefetchStories,
  useRefreshData 
} from "../hooks/useStoriesQuery";
import LoadingSpinner from "../components/LoadingSpinner";

export default function ChapterPage() {
  const { id, chapterNumber } = useParams();
  const navigate = useNavigate();
  const { prefetchStory, prefetchChapter } = usePrefetchStories();
  const { refreshStory } = useRefreshData();
  
  // Sử dụng useRef để lưu trữ state của images across chapter changes
  const imageStatesRef = useRef({});
  
  // State management - không reset khi chuyển chapter
  const [imageLoadErrors, setImageLoadErrors] = useState(new Set());
  const [imagesLoaded, setImagesLoaded] = useState(new Set());
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Queries
  const { 
    data: story, 
    isLoading: storyLoading,
    error: storyError 
  } = useStory(id);
  
  const { 
    data: chapter, 
    isLoading: chapterLoading, 
    error: chapterError,
    refetch: refetchChapter
  } = useChapter(id, chapterNumber);

  const { 
    data: chapters = [],
    isLoading: chaptersLoading 
  } = useStoryChapters(id);

  // Derived values
  const currentNum = Number(chapterNumber);
  const maxChapter = story?.chapter_count ? Number(story.chapter_count) : chapters.length;
  const isFirstChapter = currentNum <= 1;
  const isLastChapter = currentNum >= maxChapter;
  const isLoading = storyLoading || chapterLoading;
  const error = storyError || chapterError;

  // Tạo key unique cho mỗi chapter để lưu trữ state
  const chapterKey = `${id}-${chapterNumber}`;

  // Load saved image states khi chapter thay đổi
  useEffect(() => {
    if (imageStatesRef.current[chapterKey]) {
      const savedState = imageStatesRef.current[chapterKey];
      setImageLoadErrors(new Set(savedState.errors || []));
      setImagesLoaded(new Set(savedState.loaded || []));
    } else {
      // Chỉ reset khi là chapter mới chưa từng load
      setImageLoadErrors(new Set());
      setImagesLoaded(new Set());
    }
  }, [chapterKey]);

  // Lưu state khi có thay đổi
  useEffect(() => {
    imageStatesRef.current[chapterKey] = {
      errors: Array.from(imageLoadErrors),
      loaded: Array.from(imagesLoaded)
    };
  }, [imageLoadErrors, imagesLoaded, chapterKey]);

  // Prefetch adjacent chapters for smooth navigation
  useEffect(() => {
    if (chapters.length > 0 && id) {
      // Prefetch next chapter
      if (!isLastChapter) {
        const nextChapter = currentNum + 1;
        prefetchChapter(id, nextChapter.toString());
      }
      
      // Prefetch previous chapter
      if (!isFirstChapter) {
        const prevChapter = currentNum - 1;
        prefetchChapter(id, prevChapter.toString());
      }

      // Prefetch story details if not loaded
      if (!story) {
        prefetchStory(id);
      }
    }
  }, [chapters, chapterNumber, id, isFirstChapter, isLastChapter, currentNum, prefetchChapter, prefetchStory, story]);

  // Scroll tracking for scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Don't handle if user is typing in input/textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      if (e.key === 'ArrowLeft' && !isFirstChapter) {
        e.preventDefault();
        navigate(`/story/${id}/chapter/${currentNum - 1}`);
        scrollToTop();
      } else if (e.key === 'ArrowRight' && !isLastChapter) {
        e.preventDefault();
        navigate(`/story/${id}/chapter/${currentNum + 1}`);
        scrollToTop();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        navigate(`/story/${id}`);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [id, chapterNumber, isFirstChapter, isLastChapter, currentNum, navigate]);

  // Handle image loading errors
  const handleImageError = useCallback((imageIndex) => {
    setImageLoadErrors(prev => new Set([...prev, imageIndex]));
  }, []);

  // Handle successful image load - cải thiện logic
  const handleImageLoad = useCallback((imageIndex, event) => {
    // Kiểm tra xem ảnh đã được load chưa để tránh duplicate
    setImagesLoaded(prev => {
      if (!prev.has(imageIndex)) {
        event.target.style.opacity = '1';
        return new Set([...prev, imageIndex]);
      }
      return prev;
    });
  }, []);

  // Retry loading failed image
  const retryImageLoad = useCallback((imageIndex) => {
    setImageLoadErrors(prev => {
      const newSet = new Set(prev);
      newSet.delete(imageIndex);
      return newSet;
    });
    // Also remove from loaded state to trigger reload
    setImagesLoaded(prev => {
      const newSet = new Set(prev);
      newSet.delete(imageIndex);
      return newSet;
    });
  }, []);

  // Smooth scroll to top
  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Navigation handlers
  const goToPrevChapter = useCallback(() => {
    if (!isFirstChapter) {
      navigate(`/story/${id}/chapter/${currentNum - 1}`);
      scrollToTop();
    }
  }, [isFirstChapter, navigate, id, currentNum]);

  const goToNextChapter = useCallback(() => {
    if (!isLastChapter) {
      navigate(`/story/${id}/chapter/${currentNum + 1}`);
      scrollToTop();
    }
  }, [isLastChapter, navigate, id, currentNum]);

  const goToStoryDetail = useCallback(() => {
    navigate(`/story/${id}`);
  }, [navigate, id]);

  // Handle refresh - reset image states for current chapter
  const handleRefresh = useCallback(async () => {
    try {
      // Reset image states for current chapter
      setImageLoadErrors(new Set());
      setImagesLoaded(new Set());
      delete imageStatesRef.current[chapterKey];
      
      await refetchChapter();
      if (id) {
        refreshStory(id);
      }
    } catch (err) {
      console.error('Error refreshing chapter:', err);
    }
  }, [refetchChapter, refreshStory, id, chapterKey]);

  // Loading state
  if (isLoading) return <LoadingSpinner />;
  
  // Error state
  if (error) {
    return (
      <div className="bg-gray-800 py-10 min-h-screen">
        <div className="bg-white rounded-md shadow p-6 max-w-7xl mx-auto">
          <div className="text-center">
            <div className="text-red-500 text-lg mb-4">
              ❌ {error.message}
            </div>
            <div className="flex gap-4 justify-center flex-wrap">
              <button 
                onClick={goToStoryDetail}
                className="px-4 py-2 bg-blue-400 text-white rounded hover:bg-blue-500 transition-colors"
              >
                Về trang truyện
              </button>
              <button 
                onClick={handleRefresh}
                className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-500 transition-colors"
              >
                Thử lại
              </button>
              <button 
                onClick={() => navigate(-1)}
                className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500 transition-colors"
              >
                Quay lại
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Chapter not found
  if (!chapter) {
    return (
      <div className="bg-gray-800 py-10 min-h-screen">
        <div className="bg-white rounded-md shadow p-6 max-w-7xl mx-auto">
          <div className="text-center">
            <div className="text-gray-500 text-lg mb-4">
              📖 Không tìm thấy chương {chapterNumber}.
            </div>
            <div className="flex gap-4 justify-center flex-wrap">
              <button 
                onClick={goToStoryDetail}
                className="px-4 py-2 bg-blue-400 text-white rounded hover:bg-blue-500 transition-colors"
              >
                Về trang truyện
              </button>
              <button 
                onClick={handleRefresh}
                className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-500 transition-colors"
              >
                Thử tải lại
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 py-10 min-h-screen">
      <div className="bg-white rounded-md shadow p-6 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-4 flex flex-col items-center">
          {story && (
            <div className="flex items-center gap-3 mb-1 flex-wrap justify-center text-center">
              <Link 
                to={`/story/${id}`} 
                className="text-black hover:text-orange-500 hover:underline text-lg font-semibold transition-colors break-words"
              >
                {story.title}
              </Link>
              <span className="text-gray-400">/</span>
              <span className="text-black text-lg font-semibold">
                Chương {chapterNumber}
              </span>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-4 mb-4 mt-4 flex-wrap justify-center">
            <button
              className="px-4 py-2 bg-blue-400 hover:bg-blue-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              disabled={isFirstChapter}
              onClick={goToPrevChapter}
              title="Phím mũi tên trái hoặc A để chuyển chương"
            >
              ← Chương trước
            </button>
            
            <Link
              to={`/story/${id}`}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded transition-colors flex items-center gap-2"
            >
              📚 Danh sách
            </Link>
            
            <button
              className="px-4 py-2 bg-blue-400 hover:bg-blue-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              disabled={isLastChapter}
              onClick={goToNextChapter}
              title="Phím mũi tên phải hoặc D để chuyển chương"
            >
              Chương sau →
            </button>
          </div>

          {/* Progress Indicator */}
          <div className="text-sm text-gray-600 mb-2">
            Chương {chapterNumber} / {maxChapter}
            {chaptersLoading && " (Đang tải...)"}
          </div>
          
          <div className="w-full max-w-md bg-gray-200 rounded-full h-2">
            <div 
              className="bg-orange-400 h-2 rounded-full transition-all duration-300"
              style={{ width: `${maxChapter > 0 ? (currentNum / maxChapter) * 100 : 0}%` }}
            ></div>
          </div>
        </div>

        {/* Chapter Content */}
        <div className="bg-gray-50 border border-orange-200 rounded p-6 flex flex-col items-center gap-4">
          {chapter.images && chapter.images.length > 0 ? (
            chapter.images.map((img, idx) => {
              const imageKey = `${chapterKey}-${idx}`;
              const isLoaded = imagesLoaded.has(idx);
              const hasError = imageLoadErrors.has(idx);
              
              return (
                <div key={imageKey} className="w-full max-w-2xl">
                  {!hasError ? (
                    <div className="relative">
                      <img
                        src={img}
                        alt={`Trang ${idx + 1} - Chương ${chapterNumber}`}
                        className="w-full rounded shadow mb-2 transition-opacity duration-300"
                        loading={idx < 3 ? "eager" : "lazy"}
                        onError={() => handleImageError(idx)}
                        onLoad={(e) => handleImageLoad(idx, e)}
                        style={{ 
                          opacity: isLoaded ? '1' : '0.3',
                          transition: 'opacity 0.3s ease-in-out'
                        }}
                      />
                      {!isLoaded && (
                        <div className="absolute inset-0 bg-gray-200 rounded shadow mb-2 flex items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full bg-gray-200 rounded shadow mb-2 flex items-center justify-center py-20">
                      <div className="text-center text-gray-500">
                        <div className="text-2xl mb-2">🖼️</div>
                        <div>Không thể tải ảnh trang {idx + 1}</div>
                        <button 
                          onClick={() => retryImageLoad(idx)}
                          className="mt-2 text-sm text-blue-500 hover:underline hover:text-blue-700 transition-colors"
                        >
                          Thử lại
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-gray-400 py-20 text-center">
              <div className="text-4xl mb-4">📖</div>
              <div className="mb-4">Không có ảnh cho chương này.</div>
              <button 
                onClick={handleRefresh}
                className="px-4 py-2 bg-orange-100 text-orange-600 rounded hover:bg-orange-200 transition-colors"
              >
                Thử tải lại
              </button>
            </div>
          )}
        </div>

        {/* Bottom Navigation */}
        <div className="flex justify-center gap-4 mt-6 flex-wrap">
          <button
            className="px-4 py-2 bg-blue-400 hover:bg-blue-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            disabled={isFirstChapter}
            onClick={goToPrevChapter}
          >
            ← Chương trước
          </button>
          
          <button
            onClick={scrollToTop}
            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded transition-colors"
          >
            ↑ Lên đầu
          </button>
          
          <button
            className="px-4 py-2 bg-blue-400 hover:bg-blue-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            disabled={isLastChapter}
            onClick={goToNextChapter}
          >
            Chương sau →
          </button>
        </div>
      </div>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-4 right-4 bg-white hover:bg-gray-200 p-3 rounded-full shadow-lg cursor-pointer transition-all duration-300 w-12 h-12 flex items-center justify-center z-50 hover:scale-110 border border-gray-300"
          aria-label="Cuộn lên đầu trang"
        >
          <span className="text-xl">▲</span>
        </button>
      )}

      {/* Loading indicator for adjacent chapters */}
      {(isFirstChapter || isLastChapter) && (
        <div className="fixed bottom-16 right-4 bg-black bg-opacity-70 text-white text-xs px-3 py-2 rounded z-40">
          {isFirstChapter && isLastChapter ? "Chương duy nhất" : 
           isFirstChapter ? "Chương đầu tiên" : "Chương cuối cùng"}
        </div>
      )}

      {/* Keyboard Navigation Hint */}
      <div className="fixed bottom-4 left-4 bg-black bg-opacity-70 text-white text-xs px-3 py-2 rounded z-40">
        💡 Phím ← → để chuyển chương, ESC về danh sách
      </div>
    </div>
  );
}