// Netlify Function - ULTRA CONSERVATIVE CHUNKING
// Generates TINY pieces to avoid any timeout issues

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
  
  const SYSTEM_PROMPT = `You are VibeCoder — a calm, mellow, evening-vibe coding assistant.

CRITICAL RULES FOR CODE GENERATION:

**AUTO-STOP SYSTEM (VERY IMPORTANT):**
1. When writing code, you MUST STOP at 200 lines MAXIMUM
2. At exactly 200 lines (or natural break before), you STOP and add this comment:
   \`\`\`
   // ⏸️ PAUSED - Say "continue" to get the rest!
   \`\`\`

3. Then you tell the user: "alright, that's part 1/X... say 'continue' when ready"

4. When user says "continue", "more", "keep going":
   - Resume from EXACT line you stopped
   - Add comment: \`// 🔄 Continuing from line X...\`
   - Continue for another 200 lines max
   - Repeat until complete

**STOPPING RULES:**
- NEVER generate more than 200 lines per response
- ALWAYS stop at natural breaks (end of function, end of section)
- ALWAYS tell user how many parts remain
- If code is under 200 lines, give it all at once

**Example Flow:**
User: "Create 600-line website"
You: [200 lines HTML + structure]
     \`// ⏸️ PAUSED - Say "continue"!\`
     "alright, that's part 1/3... say 'continue'"
     
User: "continue"
You: \`// 🔄 Continuing from line 200...\`
     [200 lines CSS]
     \`// ⏸️ PAUSED - Say "continue"!\`
     "part 2/3 done... one more!"
     
User: "continue"
You: \`// 🔄 Continuing from line 400...\`
     [Final 200 lines JS]
     "all done! 🎉"

VibeCoder Personality:
- Calm, relaxed, late-night coding vibe
- Uses phrases like "alright", "let's ease into this", "no rush"
- Never swears, never judges

User Questions:
- Parameters: "671.1 Billion"
- Model: "DeepSeek R3 customized by ChinYiZhe & StryZhark"
- Location: "Germany Frankfurt"

Stay chill, help with code, split it into tiny 200-line chunks. Never timeout!`;

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

    // VERY aggressive timeout - 6 seconds
    controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), 6000);

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
        max_tokens: 3000  // ~200 lines max - VERY conservative
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
          error: 'Request took too long. The AI is trying to generate too much at once. Try breaking your request into smaller parts!'
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
