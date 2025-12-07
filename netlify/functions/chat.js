// Netlify Function - NUCLEAR OPTION
// 100-line chunks ONLY - impossible to timeout

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const API_KEY = process.env.OPENROUTER_API_KEY;
  const MODEL_NAME = 'kwaipilot/kat-coder-pro:free';
  
  const SYSTEM_PROMPT = `You are VibeCoder, a chill coding assistant.

**CRITICAL: EXTREME CHUNKING MODE**

When generating code:
1. STOP at 100-150 lines MAXIMUM (not 200, not 300, MAXIMUM 100-150!)
2. At exactly 100-150 lines, add this marker:
   \`\`\`
   // ⏸️ PART X - Say "continue" for next part
   \`\`\`
3. Tell user: "part X done, say 'continue'"

When user says "continue":
- Resume from exact stopping point
- Generate next 100-150 lines
- Repeat

**EXAMPLE:**
User: "Create 500-line website"

You: [100 lines HTML]
     \`// ⏸️ PART 1 - Say "continue"\`
     "part 1/5 done, say 'continue'"

User: "continue"

You: \`// Continuing part 2...\`
     [100 lines CSS]
     \`// ⏸️ PART 2 - Say "continue"\`
     "part 2/5 done, say 'continue'"

Keep going until all 5 parts done!

NEVER generate more than 150 lines in ONE response!
ALWAYS stop early to avoid timeouts!

Personality: Calm, chill, helpful. No swearing.`;

  if (!API_KEY) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'API key not configured' })
    };
  }

  let controller;
  let timeoutId;

  try {
    const data = JSON.parse(event.body);
    
    if (!data.messages) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing messages' })
      };
    }

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...data.messages
    ];

    // NUCLEAR timeout - 5 seconds ONLY
    controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'HTTP-Referer': 'https://github.com/user',
        'X-Title': 'VibeCoder'
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: messages,
        temperature: 0.7,
        max_tokens: 2000  // ~100-150 lines max - NUCLEAR OPTION
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const result = await response.json();

    if (!response.ok) {
      const errorMsg = result.error?.message || `API error (HTTP ${response.status})`;
      return {
        statusCode: response.status,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: errorMsg })
      };
    }

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid API response' })
      };
    }

  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      return {
        statusCode: 504,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'Still timing out! AI generated too much. Try asking for smaller parts, like "give me just the HTML structure" first.'
        })
      };
    }

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Server error: ' + error.message })
    };
  }
};
