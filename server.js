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

    const { person, clothingItems } = req.body || {};
    if (!person) {
      return res.status(400).json({ error: 'Person image is required in request body.' });
    }

    if (!process.env.API_KEY) {
      // Return a mocked base64 transparent PNG data URI for local dev when no API key
      const placeholder = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII=';
      return res.json({ generatedImage: placeholder });
    }

    const generated = await generateVirtualTryOnImage(person, clothingItems || {});
    if (generated) {
      return res.json({ generatedImage: generated });
    }
    return res.status(500).json({ error: 'Could not generate image.' });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Server error' });
  }
});

app.listen(port, () => {
  console.log(`Local API server listening on http://localhost:${port}`);
});
