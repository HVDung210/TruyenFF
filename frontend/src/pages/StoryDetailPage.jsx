import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { FaUser, FaRss, FaHeart, FaEye, FaBookOpen, FaPaperPlane } from "react-icons/fa";
import { Link } from "react-router-dom";

export default function StoryDetailPage() {
  const { id } = useParams();
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chapters, setChapters] = useState([]);

  useEffect(() => {
    setLoading(true);
    fetch(`http://localhost:5000/api/stories/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Không tìm thấy truyện");
        return res.json();
      })
      .then((data) => {
        setStory(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err);
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    fetch(`http://localhost:5000/api/stories/${id}/chapters`)
      .then((res) => res.json())
      .then(setChapters);
  }, [id]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!story) return <div className="p-6">Không tìm thấy truyện.</div>;

  return (
    <div className="bg-gray-200 py-10 min-h-screen">
      <div className="bg-white rounded-md shadow p-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row gap-6 w-full">
          <img src={story.cover} alt={story.title} className="w-48 h-64 object-cover rounded-md shadow-lg" />
          <div className="flex-1">
            <h1 className="text-xl font-bold pb-2">{story.title}</h1>
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
              <span>Lượt xem: {story.views || "?"}</span>
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
                {chapters
                  .slice()
                  .sort((a, b) => {
                    const getNum = (c) => parseInt(c.chapter.replace('Chương ', '').replace('Chapter ', ''));
                    return getNum(b) - getNum(a);
                  })
                  .map((chap, idx) => (
                    <Link
                      key={idx}
                      to={`/story/${story.id}/chapter/${chap.chapter.replace('Chương ', '').replace('Chapter ', '')}`}
                      className="block bg-white hover:bg-orange-100 border border-orange-200 rounded px-2 py-1 text-start text-sm text-orange-600 transition"
                    >
                      {chap.chapter}
                    </Link>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}