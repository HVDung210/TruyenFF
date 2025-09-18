const { PrismaClient } = require('../generated/prisma');

const prisma = new PrismaClient();

async function listStories() {
  const stories = await prisma.story.findMany({
    include: {
      storyGenres: {
        include: {
          genre: true
        }
      }
    },
    orderBy: {
      story_id: 'asc'
    }
  });

  // Transform to match original format
  return stories.map(story => ({
    id: story.story_id,
    title: story.title,
    author: story.author,
    status: story.status,
    genres: story.storyGenres.map(sg => sg.genre.genre_name),
    description: story.description,
    chapter_count: story.chapter_count,
    cover: story.cover,
    time: story.time,
    hot: story.hot
  }));
}

async function getStoriesByGenre(genreName) {
  const decodedGenre = decodeURIComponent(genreName);
  
  const stories = await prisma.story.findMany({
    where: {
      storyGenres: {
        some: {
          genre: {
            genre_name: {
              contains: decodedGenre,
              mode: 'insensitive'
            }
          }
        }
      }
    },
    include: {
      storyGenres: {
        include: {
          genre: true
        }
      }
    },
    orderBy: {
      story_id: 'asc'
    }
  });

  // Transform to match original format
  const transformedStories = stories.map(story => ({
    id: story.story_id,
    title: story.title,
    author: story.author,
    status: story.status,
    genres: story.storyGenres.map(sg => sg.genre.genre_name),
    description: story.description,
    chapter_count: story.chapter_count,
    cover: story.cover,
    time: story.time,
    hot: story.hot
  }));

  return { genre: decodedGenre, total: transformedStories.length, stories: transformedStories };
}

async function getStoryById(id) {
  const story = await prisma.story.findUnique({
    where: { story_id: Number(id) },
    include: {
      storyGenres: {
        include: {
          genre: true
        }
      }
    }
  });

  if (!story) return null;

  // Transform to match original format
  return {
    id: story.story_id,
    title: story.title,
    author: story.author,
    status: story.status,
    genres: story.storyGenres.map(sg => sg.genre.genre_name),
    description: story.description,
    chapter_count: story.chapter_count,
    cover: story.cover,
    time: story.time,
    hot: story.hot
  };
}

async function listChapters(storyId) {
  const chapters = await prisma.chapter.findMany({
    where: { story_id: Number(storyId) },
    include: {
      images: {
        orderBy: { image_order: 'asc' }
      }
    },
    orderBy: { chapter_number: 'asc' }
  });

  // Transform to match original format
  return chapters.map(chapter => ({
    chapter: chapter.chapter_title || `Chương ${chapter.chapter_number}`,
    images: chapter.images.map(img => img.image_url)
  }));
}

async function getChapter(storyId, chapterNumber) {
  const chapter = await prisma.chapter.findFirst({
    where: { 
      story_id: Number(storyId),
      chapter_number: Number(chapterNumber)
    },
    include: {
      images: {
        orderBy: { image_order: 'asc' }
      }
    }
  });

  if (!chapter) return null;

  // Transform to match original format
  return {
    chapter: chapter.chapter_title || `Chương ${chapter.chapter_number}`,
    images: chapter.images.map(img => img.image_url)
  };
}

async function searchStories(query) {
  const searchTerm = query.toLowerCase();
  
  const stories = await prisma.story.findMany({
    where: {
      OR: [
        {
          title: {
            contains: searchTerm,
            mode: 'insensitive'
          }
        }

      ]
    },
    include: {
      storyGenres: {
        include: {
          genre: true
        }
      }
    },
    orderBy: {
      story_id: 'asc'
    }
  });

  // Transform to match original format
  const transformedStories = stories.map(story => ({
    id: story.story_id,
    title: story.title,
    author: story.author,
    status: story.status,
    genres: story.storyGenres.map(sg => sg.genre.genre_name),
    description: story.description,
    chapter_count: story.chapter_count,
    cover: story.cover,
    time: story.time,
    hot: story.hot
  }));
  
  return {
    query: query,
    total: transformedStories.length,
    stories: transformedStories
  };
}


module.exports = {
  listStories,
  getStoriesByGenre,
  getStoryById,
  listChapters,
  getChapter,
  searchStories,
};


