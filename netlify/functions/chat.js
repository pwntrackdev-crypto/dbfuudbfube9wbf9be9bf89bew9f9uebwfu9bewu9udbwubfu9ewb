const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // Set longer timeout
  context.callbackWaitsForEmptyEventLoop = false;

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // Parse request body
    const { message, conversationHistory = [] } = JSON.parse(event.body);

    if (!message) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Message is required' })
      };
    }

    // Check for API key in environment variable
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'API key not configured' })
      };
    }

    // Build messages array
    const messages = [
      ...conversationHistory,
      { role: 'user', content: message }
    ];

    console.log('Sending request to Claude API...');

    // Call Claude API with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, 25000); // 25 second timeout (Netlify allows 26s max)

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          messages: messages,
          temperature: 1.0
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      // Check if response is OK
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        
        // Try to parse as JSON, otherwise return raw text
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }

        return {
          statusCode: response.status,
          headers,
          body: JSON.stringify({
            error: errorData.error?.message || errorData.error || 'API request failed',
            details: errorData
          })
        };
      }

      // Parse response
      const data = await response.json();
      
      console.log('Response received successfully');

      // Extract text content from Claude's response
      const assistantMessage = data.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('\n');

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          response: assistantMessage,
          conversationHistory: [
            ...messages,
            { role: 'assistant', content: assistantMessage }
          ]
        })
      };

    } catch (fetchError) {
      clearTimeout(timeout);
      
      if (fetchError.name === 'AbortError') {
        console.error('Request timeout');
        return {
          statusCode: 504,
          headers,
          body: JSON.stringify({ 
            error: 'Request timed out. Try asking for a simpler version or break it into smaller parts.' 
          })
        };
      }
      
      throw fetchError;
    }

  } catch (error) {
    console.error('Error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message || 'Internal server error',
        type: error.name || 'UnknownError'
      })
    };
  }
};
