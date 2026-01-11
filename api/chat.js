// Vercel Serverless Function for AI Chat
// Supports: OpenAI, Anthropic Claude, or Google Gemini

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { message, mode, projectContext, provider = 'openai' } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    // Mode-specific system prompts
    const modePrompts = {
        brainstormer: `You are Synth, a creative brainstorming partner. Your role is to:
- Generate creative ideas and variations
- Build on the user's thoughts
- Suggest unexpected angles
- Keep energy high and exploratory
- End with a thought-provoking question or suggestion
Keep responses concise (2-4 paragraphs). Use **bold** for key points.`,

        planner: `You are Synth, a strategic planning partner. Your role is to:
- Break down goals into actionable steps
- Identify priorities and dependencies
- Create clear milestones
- Be practical and focused
- End with a concrete next action
Keep responses structured with bullet points. Use **bold** for headers.`,

        editor: `You are Synth, a thoughtful editing partner. Your role is to:
- Provide specific, actionable feedback
- Suggest improvements to clarity and structure
- Tighten language without losing voice
- Be constructive and encouraging
- Offer before/after examples when helpful
Keep responses focused on refinement. Use **bold** for key suggestions.`,

        challenger: `You are Synth, a devil's advocate thinking partner. Your role is to:
- Ask tough but fair questions
- Identify assumptions and risks
- Pressure-test ideas constructively
- Help strengthen arguments
- End with a key question to consider
Keep responses challenging but supportive. Use **bold** for key challenges.`
    };

    const systemPrompt = modePrompts[mode] || modePrompts.brainstormer;

    // Add project context if available
    let contextPrefix = '';
    if (projectContext) {
        contextPrefix = `Project: "${projectContext.name}"
${projectContext.description ? `Goal: ${projectContext.description}` : ''}
${projectContext.memorySummary ? `Context: ${projectContext.memorySummary}` : ''}

`;
    }

    try {
        let aiResponse;

        switch (provider) {
            case 'anthropic':
                aiResponse = await callAnthropic(systemPrompt, contextPrefix + message);
                break;
            case 'gemini':
                aiResponse = await callGemini(systemPrompt, contextPrefix + message);
                break;
            case 'openai':
            default:
                aiResponse = await callOpenAI(systemPrompt, contextPrefix + message);
                break;
        }

        return res.status(200).json({
            response: aiResponse,
            provider,
            mode
        });

    } catch (error) {
        console.error('AI API Error:', error);
        return res.status(500).json({
            error: 'AI service unavailable',
            fallback: true,
            message: error.message
        });
    }
}

// OpenAI API call
async function callOpenAI(systemPrompt, userMessage) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OpenAI API key not configured');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage }
            ],
            max_tokens: 500,
            temperature: 0.8
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'OpenAI API error');
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

// Anthropic Claude API call
async function callAnthropic(systemPrompt, userMessage) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('Anthropic API key not configured');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 500,
            system: systemPrompt,
            messages: [
                { role: 'user', content: userMessage }
            ]
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Anthropic API error');
    }

    const data = await response.json();
    return data.content[0].text;
}

// Google Gemini API call
async function callGemini(systemPrompt, userMessage) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('Gemini API key not configured');

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `${systemPrompt}\n\nUser: ${userMessage}`
                    }]
                }],
                generationConfig: {
                    maxOutputTokens: 500,
                    temperature: 0.8
                }
            })
        }
    );

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Gemini API error');
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}
