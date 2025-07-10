import React, { useState } from "react";
import { Link } from "react-router-dom";
import logo from "../assets/logo.png";
import light_mode from "../assets/light_mode.png";
import drop_down from "../assets/drop_down.png"
import search from "../assets/search.png"

export default function Header() {
  const [showDropdown, setShowDropdown] = useState(false);
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
        <div className="flex gap-2">
          <button className="bg-blue-500 w-32 text-white px-4 py-2 rounded-lg font-semibold">Đăng ký</button>
          <button className="bg-blue-500 w-32 text-white px-4 py-2 rounded-lg font-semibold">Đăng nhập</button>
        </div>
      </div>
      <nav>
        <div className="bg-orange-400 w-full">
          <div className="container mx-auto flex gap-x-12 px-36 py-3 text-white font-small text-base justify-start items-center overflow-x-auto">
            <Link to="/" className="hover:bg-orange-300 text-md ">Trang Chủ</Link>
            <div
              className="relative"
              onMouseEnter={() => setShowDropdown(true)}
              onMouseLeave={() => setShowDropdown(false)}
            >
              <button className="flex items-center hover:bg-orange-300 text-md focus:outline-none">
                Thể Loại
                <img src={drop_down} className="w-4 h-4 mt-1 ml-1"></img>
              </button>
              {showDropdown && (
                <div className="absolute">
                </div>
              )}
            </div>
            <Link to="/lich-su" className="hover:bg-orange-300 text-md ">Lịch Sử</Link>
            <Link to="/theo-doi" className="hover:bg-orange-300 text-md ">Theo Dõi</Link>
            <Link to="/tim-mo-ta" className="hover:bg-orange-300 text-md ">Tìm Mô Tả</Link>
          </div>
        </div>
      </nav>
    </header>
  );
}