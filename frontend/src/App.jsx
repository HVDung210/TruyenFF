// import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
// import React from "react";
// import Header from "./components/Header";
// import Footer from "./components/Footer";
// import HomePage from "./pages/HomePage";
// import HistoryPage from "./pages/HistoryPage";
// import FollowPage from "./pages/FollowPage";
// import StoryDetailPage from "./pages/StoryDetailPage";
// import ChapterPage from "./pages/ChapterPage";
// import GenrePage from "./pages/GenrePage";
// import './index.css';
// import FindByDescriptionPage from "./pages/FindByDescriptionPage";
// import QueryProvider from './providers/QueryProvider';


// function App() {
//   return (
//     <QueryProvider>
//       <Router>
//         <div className="bg-gray-100">
//             <Header />
//             <Routes>
//               <Route path="/" element={<HomePage />} />
//               <Route path="/lich-su" element={<HistoryPage />} />
//               <Route path="/theo-doi" element={<FollowPage />} />
//               <Route path="/story/:id" element={<StoryDetailPage />} />
//               <Route path="/story/:id/chapter/:chapterNumber" element={<ChapterPage />} />
//               <Route path="/tim-mo-ta" element={<FindByDescriptionPage />} />
//               <Route path="/the-loai" element={<GenrePage />} />
//               <Route path="/the-loai/:genreName" element={<GenrePage />} />
//             </Routes>
//             <Footer />
//         </div>
//       </Router>
//     </QueryProvider>
//   );
// }

// export default App;

import React from 'react';
import NovelToComicTester from './components/NovelToComicTester';

function App() {
  return (
    <div className="App">
      <NovelToComicTester />
    </div>
  );
}

export default App;