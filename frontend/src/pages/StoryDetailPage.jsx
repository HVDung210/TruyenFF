import React from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { FaUser, FaRss, FaHeart, FaEye, FaBookOpen, FaPaperPlane } from "react-icons/fa";
import { 
  useStory, 
  useStoryChapters, 
  usePrefetchStories,
  useRefreshData 
} from "../hooks/useStoriesQuery";
import LoadingSpinner from "../components/LoadingSpinner";

export default function StoryDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { prefetchStory, prefetchChapter } = usePrefetchStories();
  const { refreshStory, refreshChapters } = useRefreshData();
  
  const { 
    data: story, 
    isLoading: storyLoading, 
    error: storyError,
    refetch: refetchStory
  } = useStory(id);
  
  const { 
    data: chapters = [], 
    isLoading: chaptersLoading, 
    error: chaptersError,
    refetch: refetchChapters
  } = useStoryChapters(id);

  // Prefetch logic khi story và chapters load xong
  React.useEffect(() => {
    if (story && chapters.length > 0) {
      // Prefetch first chapter cho "Đọc từ đầu" button 
      const firstChapter = chapters.find(c => 
        c.chapter.replace('Chương ', '').replace('Chapter ', '') === '1'
      );
      
      if (firstChapter) {
        prefetchChapter(story.id, '1');
      }

      // Prefetch latest chapter cho "Đọc tiếp" button
      const latestChapter = chapters
        .slice()
        .sort((a, b) => {
          const getNum = (c) => parseInt(c.chapter.replace('Chương ', '').replace('Chapter ', '')) || 0;
          return getNum(b) - getNum(a);
        })[0];

      if (latestChapter) {
        const latestChapterNum = latestChapter.chapter.replace('Chương ', '').replace('Chapter ', '');
        prefetchChapter(story.id, latestChapterNum);
      }
    }
  }, [story, chapters, prefetchChapter]);

  // Handle loading states
  const isLoading = storyLoading || chaptersLoading;
  const error = storyError || chaptersError;

  // Handle refresh functionality
  const handleRefresh = async () => {
    try {
      await Promise.all([
        refetchStory(),
        refetchChapters()
      ]);
    } catch (err) {
      console.error('Error refreshing data:', err);
    }
  };

  // Handle navigation back if story not found
  const handleGoBack = () => {
    navigate(-1);
  };

  if (isLoading) return <LoadingSpinner />;
  
  if (error) {
    return (
      <div className="bg-gray-200 py-10 min-h-screen">
        <div className="bg-white rounded-md shadow p-6 max-w-7xl mx-auto">
          <div className="text-center">
            <div className="text-red-500 text-lg mb-4">
              ❌ {error.message}
            </div>
            <div className="flex gap-3 justify-center">
              <button 
                onClick={handleRefresh}
                className="flex items-center gap-2 px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-500 transition-colors"
              >

              </button>
              <button 
                onClick={handleGoBack}
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

  if (!story) {
    return (
      <div className="bg-gray-200 py-10 min-h-screen">
        <div className="bg-white rounded-md shadow p-6 max-w-7xl mx-auto">
          <div className="text-center">
            <div className="text-gray-500 text-lg mb-4">
              📚 Không tìm thấy truyện.
            </div>
            <button 
              onClick={handleGoBack}
              className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500 transition-colors"
            >
              Quay lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Sort chapters by number (newest first for display)
  const sortedChapters = chapters
    .slice()
    .sort((a, b) => {
      const getNum = (c) => parseInt(c.chapter.replace('Chương ', '').replace('Chapter ', '')) || 0;
      return getNum(b) - getNum(a);
    });

  // Find latest chapter for "Đọc tiếp" button
  const latestChapter = sortedChapters[0];
  const latestChapterNumber = latestChapter 
    ? latestChapter.chapter.replace('Chương ', '').replace('Chapter ', '')
    : '1';

  // Check if first chapter exists
  const firstChapterExists = chapters.some(c => 
    c.chapter.replace('Chương ', '').replace('Chapter ', '') === '1'
  );

  // Handle follow story (placeholder - you can implement actual logic)
  const handleFollowStory = () => {
    // TODO: Implement follow functionality
    console.log('Following story:', story.id);
    // You might want to show a toast notification here
  };

  return (
    <div className="bg-gray-200 py-10 min-h-screen">
      <div className="bg-white rounded-md shadow p-6 max-w-7xl mx-auto">
        {/* Story Info Section */}
        <div className="flex flex-col md:flex-row gap-6 w-full">
          <div className="flex-shrink-0">
            <img 
              src={story.cover} 
              alt={story.title} 
              className="w-48 h-64 object-cover rounded-md shadow-lg"
              loading="lazy"
              onError={(e) => {
                e.target.src = '/placeholder-book-cover.png'; // Fallback image
              }}
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold pb-2 break-words">{story.title}</h1>
            
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2">
                <FaUser className="text-gray-600 flex-shrink-0" />
                <span className="break-all">Tác giả: {story.author}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <FaRss className="text-gray-600 flex-shrink-0" />
                <span>Tình trạng: {story.status}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <FaEye className="text-gray-600 flex-shrink-0" />
                <span>Lượt xem: {story.views?.toLocaleString() || "N/A"}</span>
              </div>
            </div>

            {/* Genres */}
            {story.genres && story.genres.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {story.genres.map((genre, idx) => (
                  <span 
                    key={`${genre}-${idx}`} 
                    className="bg-white text-orange-400 px-2 py-1 rounded-sm border border-orange-400 text-sm whitespace-nowrap"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 mb-2">
              {firstChapterExists ? (
                <Link
                  to={`/story/${story.id}/chapter/1`}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-lime-500 hover:bg-lime-600 text-white rounded transition-colors min-w-[140px]"
                >
                  <FaBookOpen />
                  Đọc từ đầu
                </Link>
              ) : (
                <button
                  disabled
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-400 text-white rounded cursor-not-allowed min-w-[140px]"
                  title="Chưa có chương đầu"
                >
                  <FaBookOpen />
                  Đọc từ đầu
                </button>
              )}
              
              <button 
                onClick={handleFollowStory}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded transition-colors min-w-[140px]"
              >
                <FaHeart />
                Theo dõi
              </button>
              
              {latestChapter ? (
                <Link
                  to={`/story/${story.id}/chapter/${latestChapterNumber}`}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded transition-colors min-w-[140px]"
                >
                  <FaPaperPlane />
                  Đọc tiếp
                </Link>
              ) : (
                <button
                  disabled
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-400 text-white rounded cursor-not-allowed min-w-[140px]"
                  title="Chưa có chương nào"
                >
                  <FaPaperPlane />
                  Đọc tiếp
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Description Section */}
        <div className="mt-6">
          <h2 className="text-lg text-orange-400 mb-2 border-l-4 border-orange-400 pl-2 font-semibold">
            Giới thiệu
          </h2>
          <div className="text-gray-700 leading-relaxed whitespace-pre-line bg-gray-50 p-4 rounded border">
            {story.description || "Chưa có mô tả cho truyện này."}
          </div>
        </div>

        {/* Chapters Section */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg text-orange-400 border-l-4 border-orange-400 pl-2 font-semibold">
              Danh sách chương ({chapters.length} chương)
            </h2>
            {chapters.length > 0 && (
              <button
                onClick={() => refreshChapters(id)}
                className="flex items-center gap-1 px-2 py-1 text-sm text-orange-400 hover:text-orange-600 transition-colors"
                title="Làm mới danh sách chương"
              >

              </button>
            )}
          </div>
          
          <div className="px-3 py-2 rounded-lg h-96 overflow-y-auto bg-gray-50 border border-orange-200">
            {chaptersLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
                <span className="ml-2 text-gray-600">Đang tải danh sách chương...</span>
              </div>
            ) : chapters.length === 0 ? (
              <div className="text-gray-400 text-center py-8">
                <div className="text-4xl mb-2">📚</div>
                <p>Chưa có chương nào.</p>
                <button
                  onClick={() => refreshChapters(id)}
                  className="mt-2 px-3 py-1 text-sm bg-orange-100 text-orange-600 rounded hover:bg-orange-200 transition-colors"
                >
                  Thử tải lại
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {sortedChapters.map((chap, idx) => {
                  const chapterNum = chap.chapter.replace('Chương ', '').replace('Chapter ', '');
                  return (
                    <Link
                      key={`${chap.chapter}-${idx}`}
                      to={`/story/${story.id}/chapter/${chapterNum}`}
                      className="block bg-white hover:bg-orange-100 border border-orange-200 rounded px-3 py-2 text-start text-sm text-orange-600 transition-colors group"
                      onMouseEnter={() => prefetchChapter(story.id, chapterNum)}
                    >
                      <div className="flex justify-between items-center">
                        <span className="group-hover:text-orange-700 truncate pr-2">
                          {chap.chapter}
                        </span>
                        {idx === 0 && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded whitespace-nowrap">
                            Mới nhất
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}