import { getFollowedStories, unfollowStory } from "../../../backend/src/services/followService";

const API_BASE_URL = 'http://localhost:5000/api';

const getAuthHeader = () => {
    const token = localStorage.getItem('accessToken');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
    };
};

export const followService = {
    followStory: async (storyId) => {
        const response = await fetch(`${API_BASE_URL}/follow/${storyId}`, {
            method: 'POST',
            headers: getAuthHeader(),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to follow story');
        }

        return response.json();
    },

    unfollowStory: async (storyId) => {
        const response = await fetch(`${API_BASE_URL}/unfollow/${storyId}`, {
            method: 'POST',
            headers: getAuthHeader(),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to unfollow story');
        }

        return response.json();
    },

    // Lấy danh sách truyện đã follow (đầy đủ thông tin)
    getFollowedStories: async () => {
        const response = await fetch(`${API_BASE_URL}/followed-stories`, {
            method: 'GET',
            headers: getAuthHeader(),
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch followed stories: ${response.statusText}`);
        }
        
        return response.json();
    },

    // Lấy danh sách ID truyện đã follow (lightweight)
    getFollowedStoryIds: async () => {
        const response = await fetch(`${API_BASE_URL}/followed-story-ids`, {
            method: 'GET',
            headers: getAuthHeader(),
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch followed story IDs: ${response.statusText}`);
        }
        
        return response.json();
    },

    // Kiểm tra trạng thái follow
    checkFollowing: async (storyId) => {
        const response = await fetch(`${API_BASE_URL}/follow/${storyId}/check`, {
            method: 'GET',
            headers: getAuthHeader(),
        });
        
        if (!response.ok) {
            throw new Error(`Failed to check follow status: ${response.statusText}`);
        }
        
        const data = await response.json();
        return data.checkFollowing;
    },
}