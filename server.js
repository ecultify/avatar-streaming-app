import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = 3001;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;

// Middleware
app.use(cors());
app.use(express.json());

// Web Search Endpoint using OpenAI Responses API with web_search tool
app.post('/api/web-search', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    console.log('[Backend] 🔍 OpenAI Responses API web search:', query);

    // Use OpenAI Responses API with web_search tool
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
        body: JSON.stringify({
          model: 'gpt-4o',
          tools: [{ type: 'web_search' }],
          input: query,
          instructions: 'You are a helpful assistant. Provide direct, brief answers in 2-3 sentences for voice output. Do not mention that you searched the web, dont mention or spell out links, just give the answer.'
        })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[Backend] OpenAI Responses API error:', errorData);
      throw new Error(errorData.error?.message || 'Responses API failed');
    }

    const data = await response.json();
    console.log('[Backend] ✅ Responses API success');

    // Extract the text output from the response
    let outputText = '';
    if (data.output) {
      for (const item of data.output) {
        if (item.type === 'message' && item.content) {
          for (const content of item.content) {
            if (content.type === 'output_text') {
              outputText = content.text;
              break;
            }
          }
        }
      }
    }

    if (!outputText && data.output_text) {
      outputText = data.output_text;
    }

    console.log('[Backend] Response:', outputText.substring(0, 100) + '...');

    return res.json({
      success: true,
      query,
      summary: outputText || 'No information found.',
      hasSearchResults: true,
      model: 'gpt-4o-responses-api'
    });

  } catch (error) {
    console.error('[Backend] Error:', error.message);
    
    // Fallback to Chat Completions if Responses API fails
    console.log('[Backend] Trying fallback with Chat Completions...');
    try {
      const fallbackResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-search-preview',
          web_search_options: {
            search_context_size: 'medium'
          },
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant with web search capabilities. Provide direct, brief answers in 2-3 sentences for voice output.'
            },
            {
              role: 'user',
              content: req.body.query
            }
          ]
        })
      });

      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json();
        const summary = fallbackData.choices?.[0]?.message?.content || 'No information found.';
        console.log('[Backend] ✅ Fallback success with gpt-4o-search-preview');
        
        return res.json({
          success: true,
          query: req.body.query,
          summary,
          hasSearchResults: true,
          model: 'gpt-4o-search-preview'
        });
      }
    } catch (fallbackError) {
      console.error('[Backend] Fallback also failed:', fallbackError.message);
    }

    res.status(500).json({ 
      success: false,
      error: error.message,
      summary: 'Search service temporarily unavailable.'
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Web search backend is running' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Web Search Backend running on http://localhost:${PORT}`);
  console.log(`   - Health check: http://localhost:${PORT}/health`);
  console.log(`   - Search endpoint: POST http://localhost:${PORT}/api/web-search`);
  console.log(`   - Using: OpenAI Responses API with web_search tool\n`);
  
  if (OPENAI_API_KEY) {
    console.log('✅ OpenAI API key detected');
    console.log(`   (Found as: ${process.env.OPENAI_API_KEY ? 'OPENAI_API_KEY' : 'VITE_OPENAI_API_KEY'})\n`);
  } else {
    console.log('❌ ERROR: No OpenAI API key found');
    console.log('   Add OPENAI_API_KEY or VITE_OPENAI_API_KEY to your .env file\n');
    process.exit(1);
  }
});
