import React, { useState } from "react";
import StoryCard from "../components/StoryCard";
import LoadingSpinner from "../components/LoadingSpinner";
import { useSearchStoriesMutation, usePrefetchStories } from "../hooks/useStoriesQuery";

export default function FindByDescriptionPage() {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState({ stories: [], reasoning: [] });
  
  const searchMutation = useSearchStoriesMutation();
  const { prefetchStory, prefetchChapters, prefetchChapter } = usePrefetchStories();

  // Prefetch data khi click vào story
  const handleStoryClick = async (story) => {
    await Promise.all([
      prefetchStory(story.id),
      prefetchChapters(story.id),
      story.chapter_count ? prefetchChapter(story.id, story.chapter_count) : Promise.resolve()
    ]);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    try {
      const result = await searchMutation.mutateAsync({ query });
      
      // Handle cả format mới và cũ
      if (result.stories && Array.isArray(result.stories)) {
        setSearchResults({
          stories: result.stories,
          reasoning: result.reasoning || []
        });
      } else if (Array.isArray(result)) {
        setSearchResults({
          stories: result,
          reasoning: []
        });
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults({ stories: [], reasoning: [] });
    }
  };

  const { stories, reasoning } = searchResults;
  const isLoading = searchMutation.isPending;
  const error = searchMutation.error;

  return (
    <div className="bg-gray-200 px-36 py-6 min-h-screen">
      <h1 className="text-2xl font-bold text-orange-500 mb-4">Tìm truyện theo mô tả</h1>
      
      <form onSubmit={handleSearch} className="mb-6 flex gap-2">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Nhập mô tả truyện bạn muốn tìm..."
          className="px-4 py-2 rounded border border-gray-300 w-150 focus:outline-none focus:ring-2 focus:ring-orange-400"
          disabled={isLoading}
        />
        <button
          type="submit"
          className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          disabled={isLoading || !query.trim()}
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Đang tìm...
            </div>
          ) : (
            "Tìm kiếm"
          )}
        </button>
      </form>

      {/* Error Display */}
      {error && (
        <div className="text-red-500 mb-4 p-3 bg-red-100 rounded border border-red-200">
          <strong>Lỗi:</strong> {error.message}
        </div>
      )}

      {/* Reasoning Display */}
      {reasoning.length > 0 && (
        <div className="mb-6 p-4 bg-blue-50 rounded border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">
            Lý do lựa chọn các truyện này:
          </h3>
          <ul className="space-y-2">
            {reasoning.map((reason, index) => (
              <li key={index} className="text-blue-700">
                <span className="font-medium">#{index + 1}:</span> {reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Results Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {stories.map(story => (
          <StoryCard key={story.id} story={story} onStoryClick={handleStoryClick} />
        ))}
      </div>

      {/* Empty State */}
      {stories.length === 0 && !isLoading && !error && query && (
        <div className="text-gray-500 text-center py-8">
          <p>Không tìm thấy truyện phù hợp với "{query}"</p>
          <p className="text-sm mt-2">Hãy thử với từ khóa khác hoặc mô tả chi tiết hơn.</p>
        </div>
      )}
      
      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mb-4"></div>
          <p className="text-gray-600">Đang phân tích...</p>
        </div>
      )}

      {/* Initial State */}
      {stories.length === 0 && !isLoading && !error && !query && (
        <div className="text-gray-500 text-center py-12">
          <p className="text-lg">Nhập mô tả để tìm truyện phù hợp cho bạn</p>
          <p className="text-sm mt-2">Ví dụ: "truyện về phép thuật và phiêu lưu" hoặc "romance hiện đại"</p>
        </div>
      )}
    </div>
  );
}