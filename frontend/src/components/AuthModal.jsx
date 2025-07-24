import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function AuthModal({ onClose, initialRegister = false}) {
  const { login } = useAuth();
  const [isRegister, setIsRegister] = useState(initialRegister);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isRegister && password != confirm) {
      alert("Mật khẩu xác nhận không khớp!");
      return;
    }

    // TODO: Gọi API backend để đăng ký/đăng nhập thực tế
    login({ email, avatar: "../assets/avatar.png"})
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 w-96 relative">
        <h2 className="text-xl font-bold mb-4">{isRegister ? "Đăng ký" : "Đăng nhập"}</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input type="email" required placeholder="Email" value={email} onChange={e => setEmail(e.target.vaue)} className="border rounded px-3 py-2"/>
          <input type="password" required placeholder="Mật khẩu" value={password} onChange={e => setPassword(e.target.value)} className="border rounded px-3 py-2"/>
          {isRegister && (
            <input type="password" required placeholder="Xác nhận mật khẩu" value={confirm} onChange={e => setConfirm(e.target.value)} className="border rounded px-3 py-2"/>
          )}
          <button type="submit" className="bg-blue-500 text-white rounded py-2">{isRegister ? "Đăng ký" : "Đăng nhập"}</button>
        </form>
        <div className="mt-4 text-center">
          <button onClick={() => setIsRegister(!isRegister)} className="text-blue-500 underline cursor-pointer">
            {isRegister ? "Đã có tài khoản? Đăng nhập" : "Chưa có tài khoản? Đăng ký"}
          </button>
        </div>
        <button onClick={onClose} className="absolute top-2 right-4 text-gray-500 text-3xl">&times;</button>
      </div>
    </div>
  )
}