import React from "react";
import { Link } from "react-router-dom";

export default function StoryCard({ story, fixed }) {
  return (
    <Link to={`/story/${story.id}`} className="block">
      <div className={
          fixed ? 
              "w-48 flex-shrink-0 mx-2 flex flex-col" 
              : "w-full flex flex-col min-h-[300px]"}>
          <div className={fixed ? "relative h-64" : "relative aspect-[3/4]"}>
              <img
                  src={story.cover}
                  alt={story.title}
                  className="w-full h-full object-cover rounded-xl shadow"
              />
              <div className="absolute top-1 gap-1">
                  <span className="bg-blue-400 text-white text-xs px-2 py-0.5 mx-1 rounded">{story.time}</span>
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded">Hot</span>
              </div>
          </div>
          <div className="mt-2 flex-1 flex flex-col justify-between">
              <div className="font-semibold truncate text-center">{story.title}</div>
              <div className="font-semibold text-sm text-center">Chương {story.lastestChapter}</div>
          </div>
      </div>
    </Link>
  );
}
