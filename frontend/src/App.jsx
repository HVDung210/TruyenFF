import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import React from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import HomePage from "./pages/HomePage";
import HistoryPage from "./pages/HistoryPage";
import FollowPage from "./pages/FollowPage";
import StoryDetailPage from "./pages/StoryDetailPage";
import './index.css';

function App() {
  return (
    <Router>
      <div className="bg-gray-100">
          <Header />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/lich-su" element={<HistoryPage />} />
            <Route path="/theo-doi" element={<FollowPage />} />
            <Route path="/story/:id" element={<StoryDetailPage />} />
          </Routes>
          <Footer />
      </div>
    </Router>
  );
}

export default App;