import React from "react";
import StoryCard from "../components/StoryCard";
import LoadingSpinner from "../components/LoadingSpinner";
import { useStories, usePrefetchStories } from "../hooks/useStoriesQuery";

export default function HistoryPage() {
    const { data: stories = [], isLoading, error, isFetching } = useStories();
    const { prefetchStory, prefetchChapters } = usePrefetchStories();

    // Prefetch data khi hover vào story card
  const handleStoryHover = (story) => {
    prefetchStory(story.id);
    prefetchChapters(story.id);
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
            <span className="text-xl font-bold text-red-500">Lịch Sử Đọc Truyện</span>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {stories.map((story) => (
                  <div 
                    key={story.id}
                    className="transform transition-transform duration-200 hover:scale-105"
                  >
                    <StoryCard story={story} />
                  </div>
                ))}
            </div>
        </div>
    )
}