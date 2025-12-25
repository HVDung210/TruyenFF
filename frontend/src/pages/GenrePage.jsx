import React, { useMemo, useTransition } from "react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import StoryCard from "../components/StoryCard";
import LoadingSpinner from "../components/LoadingSpinner";
import { useStories, useStoriesByGenre, usePrefetchStories } from "../hooks/useStoriesQuery";

export default function GenrePage() {
  const [searchParams] = useSearchParams();
  const { genreName } = useParams();
  const navigate = useNavigate();
  const [isPending, startTransition] = useTransition();
  
  const selectedGenre = genreName ? decodeURIComponent(genreName) : (searchParams.get('genre') || 'Tất cả');
  
  const { data: allStories = [], isLoading: isLoadingAllStories, error: allStoriesError, isFetching: isFetchingAll } = useStories();
  const { data: genreStories = [], isLoading: isLoadingGenreStories, error: genreStoriesError, isFetching: isFetchingGenre } = useStoriesByGenre(selectedGenre);
  const { prefetchStory, prefetchChapters, prefetchChapter, prefetchStoriesByGenre } = usePrefetchStories();

  // Danh sách các thể loại truyện cập nhật từ dữ liệu thực tế
  const genres = [
    "Tất cả",
    "Action",
    "Adventure", 
    "Comedy",
    "Drama",
    "Fantasy",
    "Romance",
    "Mystery",
    "Supernatural",
    "Manga",
    "Manhua",
    "Manhwa",
    "Webtoon",
    "Ngôn Tình",
    "Truyện Màu",
    "Slice Of Life",
    "School Life",
    "Psychological",
    "Historical",
    "Chuyển Sinh",
    "Xuyên Không",
    "Huyền Huyễn",
    "Tragedy",
    "Josei"
  ];

  const isShowingAll = selectedGenre === 'Tất cả';
  
  // Memoize để tránh re-calculate không cần thiết
  const currentStories = useMemo(() => {
    return isShowingAll ? allStories : genreStories;
  }, [isShowingAll, allStories, genreStories]);
  
  const currentLoading = isShowingAll ? isLoadingAllStories : isLoadingGenreStories;
  const currentError = isShowingAll ? allStoriesError : genreStoriesError;
  const currentFetching = isShowingAll ? isFetchingAll : isFetchingGenre;

  const handleGenreChange = async (genre) => {
    // Prefetch data trước khi navigate
    startTransition(async () => {
      try {
        if (genre !== 'Tất cả' && genre !== selectedGenre) {
          // Đợi prefetch xong trước khi navigate
          await prefetchStoriesByGenre(genre);
        }
        
        // Navigate sau khi prefetch xong
        if (genre === 'Tất cả') {
          navigate('/the-loai', { replace: true });
        } else {
          navigate(`/the-loai/${encodeURIComponent(genre)}`, { replace: true });
        }
      } catch (error) {
        console.error('Error prefetching genre:', error);
        // Vẫn navigate nếu có lỗi
        if (genre === 'Tất cả') {
          navigate('/the-loai', { replace: true });
        } else {
          navigate(`/the-loai/${encodeURIComponent(genre)}`, { replace: true });
        }
      }
    });
  };

  // Prefetch khi hover vào button thể loại
  const handleGenreHover = (genre) => {
    if (genre !== 'Tất cả' && genre !== selectedGenre) {
      prefetchStoriesByGenre(genre);
    }
  };

  // Prefetch khi hover - không cần await
  const handleStoryHover = (story) => {
    prefetchStory(story.id);
    prefetchChapters(story.id);
    
    if (story.chapter_count) {
      prefetchChapter(story.id, story.chapter_count);
    }
  };

  // Prefetch khi click - cần await để đợi xong mới navigate
  const handleStoryClick = async (story) => {
    await Promise.all([
      prefetchStory(story.id),
      prefetchChapters(story.id),
      story.chapter_count ? prefetchChapter(story.id, story.chapter_count) : Promise.resolve()
    ]);
  };

  if (currentError) {
    return (
      <div className="bg-gray-200 py-6 px-36">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong>Lỗi:</strong> {currentError.message}
          <button 
            onClick={() => window.location.reload()}
            className="ml-4 underline"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-200 px-36 py-6">
      {/* Hiển thị skeleton loading thay vì spinner để giảm layout shift */}
      {currentLoading ? (
        <div className="space-y-6">
          {/* Header skeleton */}
          <div className="mb-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-8 bg-gray-300 rounded w-48 animate-pulse"></div>
              <div className="h-10 bg-gray-300 rounded w-40 animate-pulse"></div>
            </div>
            <div className="h-4 bg-gray-300 rounded w-64 animate-pulse"></div>
          </div>
          
          {/* Stories grid skeleton */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 18 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <div className="aspect-[3/4] bg-gray-300 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-300 rounded animate-pulse"></div>
                <div className="h-3 bg-gray-300 rounded w-3/4 animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Loading indicator khi đang transition */}
          {(currentFetching || isPending) && (
            <div className="fixed top-20 right-4 z-40 bg-blue-100 text-blue-800 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
              <LoadingSpinner size="small" />
              Đang tải dữ liệu...
            </div>
          )}

          <div className="mb-6">
            <div className="flex items-center gap-4 mb-4">
              <h1 className="text-xl font-bold text-blue-400">
                Thể Loại Truyện
              </h1>
              <select 
                value={selectedGenre}
                onChange={(e) => handleGenreChange(e.target.value)}
                disabled={isPending}
                onMouseOver={(e) => {
                  const selectedOption = e.target.options[e.target.selectedIndex + 1];
                  if (selectedOption) {
                    handleGenreHover(selectedOption.value);
                  }
                }}
                className={`px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white transition-opacity ${
                  isPending ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {genres.map((genre, index) => (
                  <option 
                    key={index} 
                    value={genre}
                  >
                    {genre}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-gray-600">
              {selectedGenre === 'Tất cả' 
                ? `Hiển thị tất cả ${currentStories.length} truyện`
                : `Tìm thấy ${currentStories.length} truyện thể loại "${selectedGenre}"`
              }
            </p>
          </div>

          {currentStories.length === 0 && !isPending && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                Không tìm thấy truyện nào thuộc thể loại "{selectedGenre}"
              </p>
            </div>
          )}

          {/* Sử dụng CSS transition để smooth khi content thay đổi */}
          <div 
            className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 transition-opacity duration-300 ${
              isPending ? 'opacity-30 pointer-events-none' : 'opacity-100'
            }`}
          >
            {currentStories.map((story) => (
              <div
                key={story.id}
                onMouseEnter={() => handleStoryHover(story)}
                className="transform transition-transform duration-200 hover:scale-105"
              >
                <StoryCard 
                  story={story} 
                  onStoryClick={handleStoryClick}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}