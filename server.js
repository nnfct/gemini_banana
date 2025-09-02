/* Simple Express server to host /api/generate locally.
   - Reads GEMINI_API_KEY from env as API_KEY for compatibility with the template.
   - Exposes POST /api/generate which calls the existing generateVirtualTryOnImage if API key is set,
     otherwise returns a mock image for easy local dev.
*/

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { generateVirtualTryOnImage } from './api/generate.js';
import { recommendSimilarItems, recommendFromVirtualTryOn } from './api/recommend.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

app.post('/api/generate', async (req, res) => {
  try {
    // Support both GEMINI_API_KEY and API_KEY env names
    if (!process.env.API_KEY && process.env.GEMINI_API_KEY) {
      process.env.API_KEY = process.env.GEMINI_API_KEY;
    }

    console.log('API_KEY available:', !!process.env.API_KEY);
    console.log('GEMINI_API_KEY available:', !!process.env.GEMINI_API_KEY);

    const { person, clothingItems } = req.body || {};
    if (!person) {
      return res.status(400).json({ error: 'Person image is required in request body.' });
    }

    if (!process.env.API_KEY) {
      console.log('No API_KEY, returning mock response');
      // Return a mocked base64 transparent PNG data URI for local dev when no API key
      const placeholder = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII=';
      return res.json({ generatedImage: placeholder });
    }

    // For testing, always return mock
    console.log('Returning mock response for testing');
    const placeholder = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII=';
    return res.json({ generatedImage: placeholder });

  } catch (err) {
    console.error('Error in /api/generate:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Server error' });
  }
});

app.post('/api/recommend', async (req, res) => {
  try {
    const { person, clothingItems } = req.body || {};
    if (!person && !clothingItems) {
      return res.status(400).json({ error: 'Person image or clothing items are required in request body.' });
    }

    // Check if Azure OpenAI is configured
    if (!process.env.AZURE_OPENAI_ENDPOINT || !process.env.AZURE_OPENAI_KEY || !process.env.AZURE_OPENAI_DEPLOYMENT_ID) {
      // Return mock recommendations from catalog for local dev when Azure OpenAI is not configured
      const catalog = [
        { "id": "p001", "title": "블랙 오버사이즈 후드티", "price": 42000, "score": 3 },
        { "id": "p002", "title": "라이트 블루 스트레이트 진", "price": 59000, "score": 2 }
      ];
      return res.json({ recommendations: catalog });
    }

    const result = await recommendSimilarItems(person, clothingItems || {});
    return res.json(result);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Server error' });
  }
});

// 가상 피팅 결과 이미지 기반 추천 엔드포인트
app.post('/api/recommend-from-fitting', async (req, res) => {
  try {
    const { generatedImage, mimeType, originalClothingItems } = req.body || {};

    if (!generatedImage) {
      return res.status(400).json({ error: 'Generated image is required in request body.' });
    }

    console.log('Received recommendation request for virtual fitting image');
    console.log('Azure OpenAI configured:', !!process.env.AZURE_OPENAI_ENDPOINT && !!process.env.AZURE_OPENAI_KEY);

    // base64 데이터에서 prefix 제거 (data:image/jpeg;base64, 부분)
    const base64Data = generatedImage.replace(/^data:image\/[a-z]+;base64,/, '');

    const result = await recommendFromVirtualTryOn(
      base64Data,
      mimeType || 'image/jpeg',
      originalClothingItems || {}
    );

    console.log('Recommendation result:', result);
    return res.json(result);

  } catch (err) {
    console.error('Error in recommend-from-fitting endpoint:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Server error' });
  }
});

app.listen(port, () => {
  console.log(`Local API server listening on http://localhost:${port}`);
});
