import { useState, useEffect } from "react";
export default function useStories() {
    const [stories, setStories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        fetch("http://localhost:5000/api/stories")
        .then(response => response.json())
        .then(data => setStories(data))
        .catch(error => setError(error))
        .finally(() => setLoading(false));
    }, []);
    return { stories, loading, error };
}