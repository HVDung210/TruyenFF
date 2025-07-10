import React from "react";
import { useParams } from "react-router-dom";
import stories from "../utils/stories";
import {FaUser, FaRss, FaHeart, FaEye, FaBookOpen, FaPaperPlane } from "react-icons/fa";

export default function StoryDetailPage() {
  const { id } = useParams();
  const story = stories.find((s) => s.id === Number(id));

  if (!story) return <div className="p-6">Không tìm thấy truyện.</div>;

  const chapters = Array.from({ length: story.lastestChapter }, (_, i) => ({
    number: i + 1,
    title: `Chương ${i + 1}`,
  })).reverse();

  return (
    <div className="bg-gray-200 py-10 min-h-screen">
      <div className="bg-white rounded-md shadow p-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row gap-6 w-full">
          <img src={story.cover} alt={story.title} className="w-48 h-64 object-cover rounded-md shadow-lg" />
          <div className="flex-1">
            <h1 className="text-xl font-bold pb-2">Hoá Ra Ta Đã Vô Địch Từ Lâu</h1>
            <div className="flex items-center gap-2 mb-2">
              <FaUser />
              <span>Tác giả: {story.author}</span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <FaRss />
              <span>Tình trạng: {story.status}</span>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <FaEye />
              <span>Lượt xem: {story.views}</span>
            </div>
            <div className="flex gap-3 mb-3">
              {story.genres && story.genres.map((genre, idx) => (
                <span key={genre + idx} className="bg-white text-orange-400 px-2 py-1 rounded-sm border border-orange-400 text">
                  {genre}
                </span>
              ))}
            </div>
            <div className="flex gap-3 mb-2">
              <button className="flex items-center justify-center gap-2 px-3 py-2 bg-lime-500 text-white w-36">
                <FaBookOpen/>Đọc từ đầu
              </button>
              <button className="flex items-center justify-center gap-2 px-3 py-2 bg-rose-500 text-white w-36">
                <FaHeart/>Theo dõi
              </button>
              <button className="flex items-center justify-center gap-2 px-3 py-2 bg-sky-500 text-white w-36">
                <FaPaperPlane/>Đọc tiếp
              </button>
            </div>
          </div>
        </div>
        <div className="mt-6">
          <h2 className="text-lg text-orange-400 mb-2 border-l-4 border-orange-400 pl-2">Giới thiệu</h2>
          <div className="text-gray-700 leading-relaxed whitespace-pre-line">
            {story.description || "Chưa có mô tả cho truyện này."}
          </div>
        </div>
        <div className="mt-6">
          <h2 className="text-lg text-orange-400 mb-2 border-l-4 border-orange-400 pl-2">Danh sách chương</h2>
          <div className="px-3 py-2 rounded-lg h-96 overflow-y-auto bg-gray-50 border border-orange-200">
            {chapters.length === 0 ? (
              <div className="text-gray-400">Chưa có chương nào.</div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {chapters.map((chap) => (
                  <a
                    key={chap.number}
                    href={`/story/${story.id}/chap-${chap.number}`}
                    className="block bg-white hover:bg-orange-100 border border-orange-200 rounded px-2 py-1 text-start text-sm text-orange-600 transition"
                  >
                    {chap.title}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
