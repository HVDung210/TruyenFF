import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";

export default function ChapterPage() {
  const { id, chapterNumber } = useParams();
  const [chapter, setChapter] = useState(null);
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`http://localhost:5000/api/stories/${id}`)
      .then((res) => res.json())
      .then(setStory);
  }, [id]);

  useEffect(() => {
    setLoading(true);
    fetch(`http://localhost:5000/api/stories/${id}/chapters/${chapterNumber}`)
      .then((res) => {
        if (!res.ok) throw new Error("Không tìm thấy chương");
        return res.json();
      })
      .then((data) => {
        setChapter(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err);
        setLoading(false);
      });
  }, [id, chapterNumber]);

  if (loading) return <div>Đang tải chương...</div>;
  if (error) return <div>Không tìm thấy chương.</div>;
  if (!chapter) return <div>Không tìm thấy chương.</div>;

  const isLastChapter = story && story.chapter_count
    ? Number(chapterNumber) >= Number(story.chapter_count)
    : false;

  return (
    <div className="bg-gray-800 py-10 min-h-screen">
      <div className="bg-white rounded-md shadow p-6 max-w-7xl mx-auto">
        <div className="mb-4 flex flex-col items-center">
          {story && (
            <Link to={`/story/${id}`} className="text-black hover:underline text-lg font-semibold mb-1">
              {story.title}
            </Link>
          )}
          <div className="flex gap-4 mb-4 mt-4">
            <button
              className="px-4 py-2 bg-blue-400 text-white rounded disabled:opacity-50"
              disabled={Number(chapterNumber) <= 1}
              onClick={() => navigate(`/story/${id}/chapter/${Number(chapterNumber) - 1}`)}
            >
              ← Chap trước
            </button>
            <button
              className="px-4 py-2 bg-blue-400 text-white rounded disabled:opacity-50"
              disabled={isLastChapter}
              onClick={() => navigate(`/story/${id}/chapter/${Number(chapterNumber) + 1}`)}
            >
              Chap sau →
            </button>
          </div>
        </div>
        <div className="bg-gray-50 border border-orange-200 rounded p-6 flex flex-col items-center gap-4">
          {chapter.images && chapter.images.length > 0 ? (
            chapter.images.map((img, idx) => (
              <img
                key={idx}
                src={img}
                alt={`Trang ${idx + 1}`}
                className="w-full max-w-2xl rounded shadow mb-2"
                loading="lazy"
              />
            ))
          ) : (
            <div className="text-gray-400">Không có ảnh cho chương này.</div>
          )}
        </div>
      </div>
    </div>
  );
}