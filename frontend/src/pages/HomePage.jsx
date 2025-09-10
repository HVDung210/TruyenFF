import React, { useRef } from "react";
import StoryCard from "../components/StoryCard";
import arrow_left from "../assets/arrow_left.png";
import arrow_right from "../assets/arrow_right.png";
import LoadingSpinner from "../components/LoadingSpinner";
import { useStories, usePrefetchStories } from "../hooks/useStoriesQuery";

export default function HomePage() {
  const scrollRef = useRef(null);
  const { data: stories = [], isLoading, error, isFetching } = useStories();
  const { prefetchStory, prefetchChapters, prefetchChapter } = usePrefetchStories();

  const scroll = (direction) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: direction === "left" ? -300 : 300,
        behavior: "smooth",
      });
    }
  };

  // Prefetch data khi click vào story title hoặc chapter
  const handleStoryClick = (story) => {
    // Prefetch tất cả dữ liệu cần thiết
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
    <div className="bg-gray-200 py-6 px-36">
      {/* Loading overlay chỉ hiện khi initial load */}
      {isLoading && <LoadingSpinner />}
      
      {/* Background fetching indicator */}
      {isFetching && !isLoading && (
        <div className="fixed top-4 right-4 z-40 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
          Đang cập nhật...
        </div>
      )}
      
      <span className="text-xl font-bold text-red-500">Truyện Hay</span>
      <div className="relative mt-4">
        <div className="relative overflow-hidden">
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 z-10 bg-gray-100 rounded p-2 hover:bg-gray-300 transition-colors"
            style={{ transform: "translateY(-50%)" }}
          >
            <img src={arrow_left} alt="left" className="w-6 h-6" />
          </button>
          <div
            ref={scrollRef}
            className="flex gap-2 overflow-x-auto scroll-smooth hide-scrollbar"
            style={{ scrollBehavior: "smooth" }}
          >
            {stories.filter(story => story.hot).map((story) => (
              <StoryCard 
                key={story.id}
                story={story} 
                fixed 
                onStoryClick={handleStoryClick}
              />
            ))}
          </div>
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 z-10 bg-gray-100 rounded p-2 hover:bg-gray-300 transition-colors"
            style={{ transform: "translateY(-50%)" }}
          >
            <img src={arrow_right} alt="right" className="w-6 h-6" />
          </button>
        </div>
      </div>
      
      <div className="py-10">
        <span className="text-xl text-blue-400 font-bold">Tất Cả Truyện</span>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {stories.map((story) => (
            <div 
              key={story.id}
              className="transform transition-transform duration-200 hover:scale-105"
            >
              <StoryCard 
                story={story} 
                onStoryClick={handleStoryClick}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}