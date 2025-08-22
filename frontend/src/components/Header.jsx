import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import light_mode from "../assets/light_mode.png";
import drop_down from "../assets/drop_down.png";
import search from "../assets/search.png";
import avatar from "../assets/avatar.png";
import notification from "../assets/notification.png";
import AuthModal from "./AuthModal";
import { useAuth } from "../context/AuthContext";

export default function Header() {
  const { user, logout } = useAuth();
  const [showAuth, setShowAuth] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const navigate = useNavigate();

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
          <img src={light_mode} alt="Light Mode" className="h-10"/>
        </div>
        <div className="flex items-center gap-4 flex-1 ml-4 relative">
          <div className="relative w-120">
            <input
              type="text"
              placeholder="Bạn muốn tìm truyện gì..."
              className="w-full px-5 py-2 border border-gray-300 rounded-3xl focus:outline-none focus:ring-2 focus:ring-blue-400 pr-12"
            />
            <img
              src={search}
              alt="Search"
              className="absolute top-1/2 right-4 transform -translate-y-1/2 h-6 w-6 cursor-pointer"
            />
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
      </nav>
    </header>
  );
}