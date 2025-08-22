const API_BASE_URL = 'http://localhost:5000/api';

export const storyService = {
  // Lấy tất cả truyện
  getAllStories: async () => {
    const response = await fetch(`${API_BASE_URL}/stories`);
    if (!response.ok) {
      throw new Error(`Failed to fetch stories: ${response.statusText}`);
    }
    return response.json();
  },

  async getStoriesByGenre(genre) {
    try {
      // URL đúng theo backend route: /api/stories/genre/:genreName
      const response = await fetch(`${API_BASE_URL}/stories/genre/${encodeURIComponent(genre)}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.stories || [];
    } catch (error) {
      console.error('Error fetching stories by genre:', error);
      throw new Error(`Không thể tải truyện thể loại "${genre}": ${error.message}`);
    }
  },

  // Lấy chi tiết một truyện
  getStoryById: async (id) => {
    const response = await fetch(`${API_BASE_URL}/stories/${id}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch story ${id}: ${response.statusText}`);
    }
    return response.json();
  },

  // Lấy chapters của truyện
  getStoryChapters: async (id) => {
    const response = await fetch(`${API_BASE_URL}/stories/${id}/chapters`);
    if (!response.ok) {
      throw new Error(`Failed to fetch chapters for story ${id}: ${response.statusText}`);
    }
    return response.json();
  },

  // Lấy chi tiết chapter
  getChapter: async (storyId, chapterNumber) => {
    const response = await fetch(`${API_BASE_URL}/stories/${storyId}/chapters/${chapterNumber}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch chapter ${chapterNumber} of story ${storyId}: ${response.statusText}`);
    }
    return response.json();
  },

  // LLM Search
  searchStoriesByDescription: async (query) => {
    const response = await fetch(`${API_BASE_URL}/llm-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }
    return response.json();
  },
};