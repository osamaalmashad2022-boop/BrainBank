// BrainBank OAE - Storage Manager
const StorageManager = {
    prefix: 'brainbank_',

    // Save a question bank
    saveBank(bank) {
        const banks = this.getAllBanks();
        bank.id = bank.id || this.generateId();
        bank.createdAt = bank.createdAt || new Date().toISOString();
        bank.updatedAt = new Date().toISOString();
        const existingIndex = banks.findIndex(b => b.id === bank.id);
        if (existingIndex >= 0) {
            banks[existingIndex] = bank;
        } else {
            banks.unshift(bank);
        }
        localStorage.setItem(this.prefix + 'banks', JSON.stringify(banks));
        this.updateStats('bankCreated');
        return bank;
    },

    // Get all banks
    getAllBanks() {
        try {
            return JSON.parse(localStorage.getItem(this.prefix + 'banks')) || [];
        } catch { return []; }
    },

    // Get bank by ID
    getBank(id) {
        return this.getAllBanks().find(b => b.id === id) || null;
    },

    // Delete bank
    deleteBank(id) {
        const banks = this.getAllBanks().filter(b => b.id !== id);
        localStorage.setItem(this.prefix + 'banks', JSON.stringify(banks));
    },

    // Merge banks
    mergeBanks(bankIds, newName) {
        const banks = this.getAllBanks();
        const toMerge = banks.filter(b => bankIds.includes(b.id));
        if (toMerge.length < 2) return null;
        const merged = {
            id: this.generateId(),
            name: newName || 'بنك مدمج',
            questions: toMerge.flatMap(b => b.questions),
            source: 'merged',
            sourceDetail: toMerge.map(b => b.name).join(' + '),
            difficulty: 'mixed',
            language: toMerge[0].language || 'ar',
            tags: [...new Set(toMerge.flatMap(b => b.tags || []))],
        };
        return this.saveBank(merged);
    },

    // Stats
    getStats() {
        try {
            return JSON.parse(localStorage.getItem(this.prefix + 'stats')) || {
                totalBanksCreated: 0,
                totalQuestionsGenerated: 0,
                totalQuizzesTaken: 0,
                totalCorrectAnswers: 0,
                totalWrongAnswers: 0,
                sourcesUsed: { text: 0, file: 0, url: 0, topic: 0, image: 0 },
                activityLog: [],
                topicsUsed: {}
            };
        } catch {
            return {
                totalBanksCreated: 0, totalQuestionsGenerated: 0,
                totalQuizzesTaken: 0, totalCorrectAnswers: 0, totalWrongAnswers: 0,
                sourcesUsed: { text: 0, file: 0, url: 0, topic: 0, image: 0 },
                activityLog: [], topicsUsed: {}
            };
        }
    },

    updateStats(action, data = {}) {
        const stats = this.getStats();
        const now = new Date().toISOString();
        switch (action) {
            case 'bankCreated':
                stats.totalBanksCreated++;
                if (data.source) stats.sourcesUsed[data.source] = (stats.sourcesUsed[data.source] || 0) + 1;
                if (data.questionsCount) stats.totalQuestionsGenerated += data.questionsCount;
                if (data.topic) stats.topicsUsed[data.topic] = (stats.topicsUsed[data.topic] || 0) + 1;
                stats.activityLog.unshift({ type: 'create', date: now, name: data.name || '' });
                break;
            case 'quizTaken':
                stats.totalQuizzesTaken++;
                stats.totalCorrectAnswers += data.correct || 0;
                stats.totalWrongAnswers += data.wrong || 0;
                stats.activityLog.unshift({ type: 'quiz', date: now, score: data.score || 0, name: data.name || '' });
                break;
        }
        if (stats.activityLog.length > 100) stats.activityLog = stats.activityLog.slice(0, 100);
        localStorage.setItem(this.prefix + 'stats', JSON.stringify(stats));
    },

    // AI Bank progress
    getAIProgress() {
        try {
            return JSON.parse(localStorage.getItem(this.prefix + 'ai_progress')) || {};
        } catch { return {}; }
    },

    saveAIProgress(category, data) {
        const progress = this.getAIProgress();
        progress[category] = { ...progress[category], ...data, updatedAt: new Date().toISOString() };
        localStorage.setItem(this.prefix + 'ai_progress', JSON.stringify(progress));
    },

    // Settings
    getSettings() {
        try {
            return JSON.parse(localStorage.getItem(this.prefix + 'settings')) || { language: 'ar', theme: 'dark' };
        } catch { return { language: 'ar', theme: 'dark' }; }
    },

    saveSettings(settings) {
        localStorage.setItem(this.prefix + 'settings', JSON.stringify(settings));
    },

    // Helpers
    generateId() {
        return 'bank_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },

    // Export data
    exportAllData() {
        return {
            banks: this.getAllBanks(),
            stats: this.getStats(),
            aiProgress: this.getAIProgress(),
            settings: this.getSettings(),
            exportDate: new Date().toISOString()
        };
    },

    // Import data
    importData(data) {
        if (data.banks) localStorage.setItem(this.prefix + 'banks', JSON.stringify(data.banks));
        if (data.stats) localStorage.setItem(this.prefix + 'stats', JSON.stringify(data.stats));
        if (data.aiProgress) localStorage.setItem(this.prefix + 'ai_progress', JSON.stringify(data.aiProgress));
    }
};
