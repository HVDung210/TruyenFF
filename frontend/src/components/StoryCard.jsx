import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import LoadingSpinner from "./LoadingSpinner";

const DEFAULT_COVER = "https://via.placeholder.com/190x247?text=No+Cover";

export default function StoryCard({ story, fixed, onStoryClick }) {
  const [isNavigating, setIsNavigating] = useState(false);
  const navigate = useNavigate();

  const handleClick = async (e) => {
    e.preventDefault();
    setIsNavigating(true);

    try {
      if (onStoryClick) {
        await onStoryClick(story);
      }

      navigate(`/story/${story.id}`);
    } catch (error) {
      console.error("Error during prefetching:", error);
      navigate(`/story/${story.id}`);
    } finally {
      setIsNavigating(false);
    }
  };

  const handleMouseEnter = () => {
    // Prefetch khi hover
    if (onStoryClick) {
      onStoryClick(story);
    }
  };

  return (
    <div className={
      fixed ?
        "w-48 flex-shrink-0 mx-2 flex flex-col relative"
        : "w-full flex flex-col min-h-[300px] relative"
      }>
      {/* Loading Overlay */}
      <div className={fixed ? "relative h-64" : "relative aspect-[3/4]"}>
        <Link 
          to={`/story/${story.id}`}
          onClick={handleClick}
          onMouseEnter={handleMouseEnter} 
          className="block" 
        >
          <img
            src={story.cover || DEFAULT_COVER}
            alt={story.title}
            style={{ width: 190, height: 255, objectFit: "cover" }}
            className="rounded-xl shadow cursor-pointer transition-transform hover:scale-105"
            loading="lazy"
          />
        </Link>
        <div className="absolute top-1 gap-1">
          {story.time && <span className="bg-blue-400 text-white text-xs px-2 py-0.5 mx-1 rounded">{story.time}</span>}
          {story.hot && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded">Hot</span>}
        </div>
      </div>
      <div className="mt-2 flex-1 flex flex-col justify-between">
        <Link 
          to={`/story/${story.id}`}
          onClick={handleClick} 
          className="font-semibold truncate text-center hover:text-orange-400 block transition-colors"
          onMouseEnter={handleMouseEnter} 
        >
          {story.title}
        </Link>
        {story.chapter_count && (
          <Link 
            to={`/story/${story.id}/chapter/${story.chapter_count}`}     
            className="font-semibold text-sm text-center hover:text-orange-400 block transition-colors mt-1"
            onMouseEnter={handleMouseEnter} 
          >
            Chương {story.chapter_count}
          </Link>
        )}
      </div>
    </div>
  );
}