import React, { useRef } from "react";
import StoryCard from "../components/StoryCard";
import arrow_left from "../assets/arrow_left.png";
import arrow_right from "../assets/arrow_right.png";
import stories from "../utils/stories";

export default function HomePage() {
    const scrollRef = useRef(null);

    const scroll = (direction) => {
        if (scrollRef.current) {
            scrollRef.current.scrollBy({
                left: direction === "left" ? -300 : 300,
                behavior: "smooth",
            });
        }
    }
  return (
    <div className="bg-gray-200 py-6 px-36">
      <span className="text-xl font-bold text-red-500">Truyện Hay</span>
      <div className="relative mt-4">
        <div className="relative overflow-hidden">
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 z-10 bg-gray-100 rounded p-2 hover:bg-gray-300"
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
              <StoryCard key={story.id} story={story} fixed />
            ))}
          </div>
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 z-10 bg-gray-100 rounded p-2 hover:bg-gray-300"
            style={{ transform: "translateY(-50%)" }}
          >
            <img src={arrow_right} alt="right" className="w-6 h-6" />
          </button>
        </div>
      </div>
      
      <div className="py-10">
        <span className="text-xl text-blue-400 font-bold">Truyện Mới Cập Nhật</span>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {stories.map((story) => (
            <StoryCard key={story.id} story={story} />
          ))}
        </div>
      </div>
    </div>
  );
}