// BrainBank OAE - Configuration
// IMPORTANT: Never put API keys in this frontend configuration file! 
// Keys will be read from Vercel Environment variables securely via the /api routes.
const CONFIG = {
    // API endpoints changed to internal Vercel Serverless Functions
    GROQ_API_URL: '/api/groq',
    GEMINI_API_URL: '/api/gemini',
    GROQ_MODEL: 'llama-3.3-70b-versatile',
    APP_NAME: 'BrainBank OAE',
    APP_VERSION: '1.0.0',
    MAX_QUESTIONS: 50,
    MIN_QUESTIONS: 5,
    DEFAULT_QUESTIONS: 10,
    STORAGE_PREFIX: 'brainbank_'
};
