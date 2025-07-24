import React from "react";
import StoryCard from "../components/StoryCard";
import stories from "../utils/stories";

export default function FollowPage() {
    return (
        <div className="bg-gray-200 px-36 py-6">
            <span className="text-xl font-bold text-blue-400">Truyện Đang Theo Dõi</span>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {stories.map((story) => (
                    <StoryCard key={story.id} story={story} />
                ))}
            </div>
        </div>
    )
}