import React from "react";
import { Link } from "react-router-dom";

const DEFAULT_COVER = "https://via.placeholder.com/190x247?text=No+Cover";

export default function StoryCard({ story, fixed, onStoryClick }) {
  const handleMouseEnter = () => {
    if (onStoryClick) {
      onStoryClick(story);
    }
  };

  return (
    <div className={
      fixed ?
        "w-48 flex-shrink-0 mx-2 flex flex-col"
        : "w-full flex flex-col min-h-[300px]"
    }>
      <div className={fixed ? "relative h-64" : "relative aspect-[3/4]"}>
        <Link 
          to={`/story/${story.id}`}
          onMouseEnter={handleMouseEnter} 
          className="block" 
        >
          <img
            src={story.cover || DEFAULT_COVER}
            alt={story.title}
            style={{ width: 190, height: 255, objectFit: "cover" }}
            className="rounded-xl shadow cursor-pointer transition-transform hover:scale-105"
            loading="lazy" // Lazy load images
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
