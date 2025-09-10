import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import logo from "../assets/logo.png";
import search from "../assets/search.png";
import avatar from "../assets/avatar.png";
import notification from "../assets/notification.png";
import AuthModal from "./AuthModal";
import { useAuth } from "../context/AuthContext";
import SearchResultCard from "./SearchResultCard";
import { storyService } from "../services/storyService";
import { usePrefetchStories } from "../hooks/useStoriesQuery";

export default function Header() {
  const { user, logout } = useAuth();
  const [showAuth, setShowAuth] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef(null);
  const { prefetchStory, prefetchChapters, prefetchChapter } = usePrefetchStories();

  // Debounced search
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await storyService.searchStories(query.trim());
        setResults(res?.stories || []);
      } catch (e) {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [query]);

  // Click outside to close dropdown
  useEffect(() => {
    function onClickOutside(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  // Close dropdown and clear query on route change to avoid flicker
  useEffect(() => {
    setShowDropdown(false);
    setQuery("");
  }, [location.pathname]);

  return (
    <header className="bg-white shadow">
      <div className="container mx-auto flex items-center justify-between py-4 px-36">
        <div className="flex items-center gap-2">
          <Link to="/">
            <img src={logo} alt="logo" className="h-10"/>
          </Link>
          <span className="font-bold text-2xl">
            <Link to="/">
              <span className="text-black">Truyen</span>
              <span className="text-orange-400">FF</span>
            </Link>
          </span>
        </div>
        <div className="flex items-center gap-4 flex-1 ml-4 relative" ref={searchRef}>
          <div className="relative w-120" >
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Bạn muốn tìm truyện gì..."
              className="w-full px-5 py-2 border border-gray-300 rounded-3xl focus:outline-none focus:ring-2 focus:ring-blue-400 pr-12"
            />
            <img
              src={search}
              alt="Search"
              className="absolute top-1/2 right-4 transform -translate-y-1/2 h-6 w-6 cursor-pointer"
              onClick={() => setShowDropdown((v) => !v)}
            />

            {showDropdown && (loading || (query.trim().length >= 2 && results.length >= 0)) && (
              <div className="absolute left-0 top-full mt-2 w-full bg-white shadow-lg rounded-md z-50 max-h-96 overflow-auto border border-gray-100">
                {loading && (
                  <div className="p-3 text-sm text-gray-500">Đang tìm...</div>
                )}
                {!loading && query.trim().length >= 2 && results.length === 0 && (
                  <div className="p-3 text-sm text-gray-500">Không tìm thấy kết quả</div>
                )}
                {!loading && results.length > 0 && results.slice(0, 8).map((story) => (
                  <SearchResultCard 
                    key={story.id} 
                    story={story}
                    onMouseEnter={() => {
                      prefetchStory(story.id);
                      prefetchChapters(story.id);
                      if (story.chapter_count) prefetchChapter(story.id, story.chapter_count);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
        {!user ? (
          <div className="flex gap-2">
            <button
              className="bg-blue-500 w-32 text-white px-4 py-2 rounded-lg font-semibold"
              onClick={() => setShowAuth("register")}
            >
              Đăng ký
            </button>
            <button
              className="bg-blue-500 w-32 text-white px-4 py-2 rounded-lg font-semibold"
              onClick={() => setShowAuth("login")}
            >
              Đăng nhập
            </button>
            {showAuth && (
              <AuthModal
                onClose={() => setShowAuth(false)}
                initialRegister={showAuth === "register"}
              />
            )}
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <button className="relative mr-2">
              <img
                src={notification}
                alt="notification"
                className="w-10 h-10 rounded-ful cursor-pointer"
                //on click hiện pop up thông báo
              />
            </button>
            <div className="relative">
              <img
                src={avatar}
                alt="avatar"
                className="w-10 h-10 rounded-full cursor-pointer"
                onClick={() => setShowMenu(!showMenu)}
              />
              {showMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded z-50">
                  <Link to="/theo-doi" className="block px-4 py-2 hover:bg-gray-100" onClick={() => setShowMenu(false)}>Danh sách theo dõi</Link>
                  <Link to="/lich-su" className="block px-4 py-2 hover:bg-gray-100" onClick={() => setShowMenu(false)}>Lịch sử đọc truyện</Link>
                  <button onClick={() => { logout(); setShowMenu(false); }} className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-red-500">Đăng xuất</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <nav>
        <div className="bg-orange-400 w-full">
          <div className="container mx-auto flex gap-x-12 px-36 py-3 text-white font-small text-base justify-start items-center overflow-x-auto">
            <Link to="/" className="hover:bg-orange-300 text-md px-3 py-1 rounded">Trang Chủ</Link>
            <Link to="/the-loai" className="hover:bg-orange-300 text-md px-3 py-1 rounded">Thể Loại</Link>
            <Link to="/lich-su" className="hover:bg-orange-300 text-md px-3 py-1 rounded">Lịch Sử</Link>
            <Link to="/theo-doi" className="hover:bg-orange-300 text-md px-3 py-1 rounded">Theo Dõi</Link>
            <Link to="/tim-mo-ta" className="hover:bg-orange-300 text-md px-3 py-1 rounded">Tìm Mô Tả</Link>
          </div>
        </div>
        {/* Dropdown is rendered near the search input above */}
      </nav>
    </header>
  );
}