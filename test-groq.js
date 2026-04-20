const CONFIG = {
    GROQ_API_KEY: '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',
    GROQ_API_URL: 'https://api.groq.com/openai/v1/chat/completions',
    GROQ_MODEL: 'llama-3.3-70b-versatile'
};

async function testGroq() {
    try {
        const response = await fetch(CONFIG.GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: CONFIG.GROQ_MODEL,
                messages: [{ role: 'user', content: "Hello" }],
                temperature: 0.7,
                max_tokens: 8192
            })
        });

        console.log("Status:", response.status);
        const data = await response.json();
        console.log("Data:", JSON.stringify(data, null, 2));
    } catch(e) {
        console.error(e);
    }
}

testGroq();
