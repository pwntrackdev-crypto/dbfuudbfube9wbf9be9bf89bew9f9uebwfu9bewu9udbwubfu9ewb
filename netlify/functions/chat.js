// Netlify Function - replaces chat.php
// This runs on Netlify's servers when you call /.netlify/functions/chat

exports.handler = async (event, context) => {
  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Get API key and system prompt from environment variables
  const API_KEY = process.env.OPENROUTER_API_KEY;
  const SYSTEM_PROMPT = process.env.SYSTEM_PROMPT || 'You are a helpful AI assistant.';
  const MODEL_NAME = 'deepseek/deepseek-chat-v3-0324:free';

  // Check if API key is configured
  if (!API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'API key not configured in Netlify environment variables' })
    };
  }

  try {
    // Parse incoming request
    const data = JSON.parse(event.body);
    
    if (!data.messages) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid request - missing messages' })
      };
    }

    // Build messages array with system prompt
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...data.messages
    ];

    // Call OpenRouter API
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'HTTP-Referer': 'https://github.com/user',
        'X-Title': 'WebChat'
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: messages,
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    const result = await response.json();

    // Handle API errors
    if (!response.ok) {
      const errorMsg = result.error?.message || `API error (HTTP ${response.status})`;
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: errorMsg })
      };
    }

    // Extract and return response
    if (result.choices && result.choices[0] && result.choices[0].message) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          response: result.choices[0].message.content
        })
      };
    } else {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Invalid API response' })
      };
    }

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server error: ' + error.message })
    };
  }
};
