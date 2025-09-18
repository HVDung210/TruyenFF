import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { authService } from "../services/authService";

export default function AuthModal({ onClose, initialRegister = false}) {
  const { login } = useAuth();
  const [isRegister, setIsRegister] = useState(initialRegister);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegister) {
        if (password !== confirm) {
          setError("Mật khẩu xác nhận không khớp!");
          return;
        }
        if (!username.trim()) {
          setError("Vui lòng nhập tên người dùng!");
          return;
        }

        const response = await authService.register({
          username: username.trim(),
          email: email.trim(),
          password
        });

        login(response.user, response.token);
        onClose();
      } else {
        const response = await authService.login({
          email: email.trim(),
          password
        });

        login(response.user, response.token);
        onClose();
      }
    } catch (error) {
      setError(error.message || "Có lỗi xảy ra. Vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 opacity-95">
        <div className="absolute inset-0 bg-black opacity-40"></div>
        {/* Floating particles effect */}
        <div className="absolute inset-0 overflow-hidden">
          
        </div>
      </div>

      {/* Main modal */}
      <div className="relative w-full max-w-md mx-auto">
        <div className="relative bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 via-purple-400/20 to-pink-400/20 blur-xl"></div>
          
          <div className="relative p-8">
            {/* Close button */}
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all duration-300 group backdrop-blur-sm"
            >
              <svg className="w-5 h-5 group-hover:rotate-180 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>

            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-20 h-20 mx-auto mb-6 relative">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full opacity-20 blur-lg"></div>
                <div className="relative w-full h-full bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full flex items-center justify-center">
                  {isRegister ? (
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
                    </svg>
                  ) : (
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path>
                    </svg>
                  )}
                </div>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">
                {isRegister ? "Tạo tài khoản" : "Đăng nhập"}
              </h1>
              <p className="text-white/70 text-sm">
                {isRegister ? "Tham gia cộng đồng của chúng tôi" : "Chào mừng bạn quay trở lại"}
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-6 p-4 rounded-2xl bg-red-500/10 backdrop-blur-sm border border-red-500/20 text-red-300 text-sm flex items-start space-x-3 animate-in slide-in-from-top duration-300">
                <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <div className="space-y-5">
              {isRegister && (
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-purple-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative">
                    <input 
                      type="text" 
                      required 
                      value={username} 
                      onChange={e => setUsername(e.target.value)} 
                      className="w-full px-6 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:border-cyan-400/50 focus:bg-white/15 transition-all duration-300 pl-14"
                      placeholder="Tên người dùng"
                    />
                    <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                      </svg>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-purple-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative">
                  <input 
                    type="email" 
                    required 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    className="w-full px-6 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:border-cyan-400/50 focus:bg-white/15 transition-all duration-300 pl-14"
                    placeholder="Email"
                  />
                  <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                    </svg>
                  </div>
                </div>
              </div>
              
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-purple-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"}
                    required 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    className="w-full px-6 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:border-cyan-400/50 focus:bg-white/15 transition-all duration-300 pl-14 pr-14"
                    placeholder="Mật khẩu"
                    minLength={6}
                  />
                  <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                    </svg>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-6 flex items-center text-white/40 hover:text-white/60 transition-colors"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"></path>
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              
              {isRegister && (
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-purple-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative">
                    <input 
                      type={showConfirm ? "text" : "password"}
                      required 
                      value={confirm} 
                      onChange={e => setConfirm(e.target.value)} 
                      className="w-full px-6 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:border-cyan-400/50 focus:bg-white/15 transition-all duration-300 pl-14 pr-14"
                      placeholder="Xác nhận mật khẩu"
                    />
                    <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute inset-y-0 right-0 pr-6 flex items-center text-white/40 hover:text-white/60 transition-colors"
                    >
                      {showConfirm ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"></path>
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              )}
              
              {/* Submit button */}
              <div className="pt-4">
                <button 
                  onClick={handleSubmit} 
                  disabled={loading}
                  className="w-full relative group overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 p-0.5 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:scale-100"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl"></div>
                  <div className="relative bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-2xl py-4 px-6 font-bold text-white transition-all duration-300 group-hover:from-cyan-400 group-hover:via-purple-400 group-hover:to-pink-400 disabled:from-gray-600 disabled:via-gray-500 disabled:to-gray-600">
                    {loading ? (
                      <div className="flex items-center justify-center space-x-3">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Đang xử lý...</span>
                      </div>
                    ) : (
                      <span className="flex items-center justify-center space-x-2">
                        <span>{isRegister ? "Tạo tài khoản" : "Đăng nhập"}</span>
                        <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
                        </svg>
                      </span>
                    )}
                  </div>
                </button>
              </div>
            </div>

            {/* Switch mode */}
            <div className="mt-8 text-center">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-transparent text-white/50">hoặc</span>
                </div>
              </div>
              
              <button 
                onClick={() => {
                  setIsRegister(!isRegister);
                  setError("");
                }} 
                className="mt-4 text-cyan-300 hover:text-cyan-200 transition-colors duration-300 font-medium"
              >
                {isRegister ? "Đã có tài khoản? Đăng nhập" : "Chưa có tài khoản? Đăng ký ngay"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}