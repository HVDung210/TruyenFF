import React from "react";
import StoryCard from "../components/StoryCard";
import LoadingSpinner from "../components/LoadingSpinner";
import { useFollowedStories, usePrefetchStories } from "../hooks/useStoriesQuery";

export default function FollowPage() {
    const { data: stories = [], isLoading, error, isFetching } = useFollowedStories();
    const { prefetchStory, prefetchChapters, prefetchChapter } = usePrefetchStories();

    // Prefetch data khi hover vào story card
  const handleStoryHover = (story) => {
    prefetchStory(story.id);
    prefetchChapters(story.id);
    
    // Prefetch chapter mới nhất nếu có
    if (story.chapter_count) {
      prefetchChapter(story.id, story.chapter_count);
    }
  };

  // Show error state
  if (error) {
    return (
      <div className="bg-gray-200 py-6 px-36">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong>Lỗi:</strong> {error.message}
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
            {/* Loading overlay chỉ hiện khi initial load */}
                  {isLoading && <LoadingSpinner />}
                  
                  {/* Background fetching indicator */}
                  {isFetching && !isLoading && (
                    <div className="fixed top-4 right-4 z-40 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                      Đang cập nhật...
                    </div>
                  )}
            <span className="text-xl font-bold text-blue-400">Truyện Đang Theo Dõi ({stories.length})</span>
            
            {stories.length === 0 && !isLoading ? (
              <div className="text-center py-20 text-gray-500">
                <div className="text-6xl mb-4"></div>
                <p className="text-xl mb-2">Bạn chưa theo dõi truyện nào</p>
                <p className="text-sm">Hãy khám phá và theo dõi những truyện yêu thích của bạn!</p>
                <a 
                  href="/" 
                  className="mt-4 inline-block bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 transition-colors"
                >
                  Khám phá truyện
                </a>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {stories.map((story) => (
                  <div 
                    key={story.id}
                    className="transform transition-transform duration-200 hover:scale-105"
                    onMouseEnter={() => handleStoryHover(story)}
                  >
                    <StoryCard story={story} />
                  </div>
                ))}
              </div>
            )}
        </div>
    )
}