import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Proxy Search
app.get('/api/search', async (req, res) => {
  try {
    const query = req.query.q as string;
    if (!query) {
       res.status(400).json({ error: 'Query parameter "q" is required' });
       return;
    }
    
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      throw new Error('YOUTUBE_API_KEY is not configured in the environment.');
    }

    const isId = /^[A-Za-z0-9_-]{24}$/.test(query);

    let searchUrl = '';
    if (isId) {
      searchUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${query}&key=${apiKey}`;
      const searchRes = await fetch(searchUrl);
      const searchData = await searchRes.json();
      
      const items = (searchData.items || []).map((item: any) => ({
        id: { kind: 'youtube#channel', channelId: item.id },
        snippet: item.snippet
      }));
      res.json({ items });
      return;
    } else {
      searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(query)}&key=${apiKey}&maxResults=5`;
    }

    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) {
      const errorData = await searchRes.json();
      throw new Error(`YouTube API Error: ${errorData.error?.message || searchRes.statusText}`);
    }
    const searchData = await searchRes.json();
    res.json(searchData);
  } catch (error: any) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// Proxy Channels
app.get('/api/channels', async (req, res) => {
  try {
    const ids = req.query.ids as string;
    if (!ids) {
       res.json({ items: [] });
       return;
    }
    
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      throw new Error('YOUTUBE_API_KEY is not configured');
    }

    const statsUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${ids}&key=${apiKey}`;
    const statsRes = await fetch(statsUrl);
    if (!statsRes.ok) throw new Error('Failed to fetch stats');
    const statsData = await statsRes.json();
    
    res.json(statsData);
  } catch (error: any) {
    console.error('Fetch channels error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
} else {
  import('vite').then(async (vite) => {
    const viteServer = await vite.createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(viteServer.middlewares);
  }).catch((err) => {
    console.error('Vite initialization error:', err);
  });
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
