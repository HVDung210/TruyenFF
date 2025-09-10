import React from "react";
import { Link } from "react-router-dom";

const DEFAULT_COVER = "https://via.placeholder.com/60x80?text=No+Cover";

export default function SearchResultCard({ story, onClick, onMouseEnter }) {
  return (
    <Link 
      to={`/story/${story.id}`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
    >
      <div className="flex-shrink-0">
        <img 
          src={story.cover || DEFAULT_COVER}
          alt={story.title}
          className="w-12 h-16 object-cover rounded"
          loading="lazy"
        />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-gray-900 truncate text-sm">
          {story.title}
        </h3>
        {story.author && (
          <p className="text-xs text-gray-500 truncate mt-1">
            Tác giả: {story.author}
          </p>
        )}
        {story.genres && (
          <div className="flex flex-wrap gap-1 mt-1">
            {Array.isArray(story.genres) 
              ? story.genres.slice(0, 2).map((genre, index) => (
                  <span key={index} className="text-xs bg-blue-100 text-blue-600 px-1 py-0.5 rounded">
                    {genre}
                  </span>
                ))
              : <span className="text-xs bg-blue-100 text-blue-600 px-1 py-0.5 rounded">
                  {story.genres}
                </span>
            }
          </div>
        )}
      </div>
    </Link>
  );
}