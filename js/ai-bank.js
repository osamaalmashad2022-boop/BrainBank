// BrainBank OAE - AI Bank Page Logic
const AIBankPage = {
    init() {
        this.renderStats();
        this.renderCategories();
    },

    renderStats() {
        const totalQ = AI_BANK_DATA.categories.reduce((sum, cat) => sum + cat.questions.length, 0);
        const totalCat = AI_BANK_DATA.categories.length;
        const progress = StorageManager.getAIProgress();
        const isAr = App.currentLang === 'ar';

        let completed = 0;
        Object.values(progress).forEach(p => { completed += (p.completed || 0); });

        document.getElementById('aiStatsRow').innerHTML = `
            <div class="ai-stat-item"><div class="ai-stat-val">${totalQ}</div><div class="ai-stat-label">${isAr ? 'سؤال' : 'Questions'}</div></div>
            <div class="ai-stat-item"><div class="ai-stat-val">${totalCat}</div><div class="ai-stat-label">${isAr ? 'أقسام' : 'Categories'}</div></div>
            <div class="ai-stat-item"><div class="ai-stat-val">${completed}</div><div class="ai-stat-label">${isAr ? 'مكتمل' : 'Completed'}</div></div>
        `;
    },

    renderCategories() {
        const grid = document.getElementById('categoriesGrid');
        const progress = StorageManager.getAIProgress();
        const isAr = App.currentLang === 'ar';
        const lang = isAr ? 'ar' : 'en';

        grid.innerHTML = AI_BANK_DATA.categories.map(cat => {
            const catProgress = progress[cat.id] || {};
            const completed = catProgress.completed || 0;
            const total = cat.questions.length;
            const pct = Math.round((completed / total) * 100);

            return `
            <div class="category-card" style="--cat-color: ${cat.color}">
                <div style="position:absolute;top:0;left:0;right:0;height:3px;background:${cat.color};opacity:0.6"></div>
                <div class="category-header">
                    <div class="category-icon" style="background:${cat.color}15">${cat.icon}</div>
                    <div class="category-info">
                        <div class="category-name">${cat.name[lang]}</div>
                        <div class="category-count">${total} ${isAr ? 'سؤال' : 'questions'}</div>
                    </div>
                </div>
                <div class="category-progress">
                    <div class="category-progress-label">
                        <span>${isAr ? 'التقدم' : 'Progress'}</span>
                        <span>${pct}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width:${pct}%;background:${cat.color}"></div>
                    </div>
                </div>
                <div class="category-actions">
                    <button class="btn btn-primary btn-sm" onclick="AIBankPage.openStudy('${cat.id}')">
                        📖 ${isAr ? 'دراسة' : 'Study'}
                    </button>
                    <button class="btn btn-outline btn-sm" onclick="AIBankPage.startQuiz('${cat.id}')">
                        🎮 ${isAr ? 'اختبار' : 'Quiz'}
                    </button>
                    <button class="btn btn-ghost btn-sm" onclick="AIBankPage.exportCategory('${cat.id}')">
                        📤 ${isAr ? 'تصدير' : 'Export'}
                    </button>
                </div>
            </div>`;
        }).join('');
    },

    openStudy(catId) {
        const cat = AI_BANK_DATA.categories.find(c => c.id === catId);
        if (!cat) return;
        const isAr = App.currentLang === 'ar';
        const lang = isAr ? 'ar' : 'en';
        const letters = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'];

        const questionsHTML = cat.questions.map((q, i) => {
            let studyContent = '';
            
            if (q.type === 'mcq' && q.options) {
                studyContent = `<div style="color:var(--text-primary);font-weight:600;">🎯 ${q.options[q.correctAnswer]}</div>`;
            } else if (q.type === 'truefalse') {
                studyContent = `<div style="color:var(--text-primary);font-weight:600;">🎯 ${q.correctAnswer ? (isAr ? 'العبارة صحيحة' : 'True Statement') : (isAr ? 'العبارة خاطئة' : 'False Statement')}</div>`;
            } else if (q.type === 'shortanswer' || q.type === 'essay') {
                studyContent = `<div style="color:var(--text-primary);line-height:1.6;">🎯 ${q.correctAnswer}</div>`;
            }

            return `
            <div class="study-card">
                <div class="study-card-header" style="margin-bottom:12px">
                    <span class="study-q-num" style="background:var(--bg-tertiary);color:var(--color-primary);border:1px solid var(--border-glass)">${i + 1}</span>
                </div>
                <div class="study-q-text" style="color:var(--color-primary-light);font-size:1.15rem;">${q.question}</div>
                <div class="study-content" style="margin-top:16px;padding:16px;background:rgba(108,99,255,0.05);border-inline-start:3px solid var(--color-primary);border-radius:var(--radius-sm);">
                    ${studyContent}
                    ${q.explanation ? `<div class="study-explanation" style="margin-top:12px;color:var(--text-secondary);font-size:0.9rem;border-top:1px dashed rgba(255,255,255,0.1);padding-top:12px;background:transparent;border:none;">💡 <strong>${isAr ? 'شرح إضافي' : 'Explanation'}:</strong> ${q.explanation}</div>` : ''}
                </div>
            </div>`;
        }).join('');

        document.getElementById('studyContainer').innerHTML = `
            <div class="study-header">
                <h2 class="study-title">${cat.icon} ${cat.name[lang]}</h2>
                <div class="study-modes">
                    <span class="badge badge-primary">${cat.questions.length} ${isAr ? 'سؤال' : 'Q'}</span>
                    <button class="btn btn-outline btn-sm" onclick="AIBankPage.startQuiz('${catId}')">🎮 ${isAr ? 'وضع الاختبار' : 'Quiz Mode'}</button>
                    <button class="btn btn-outline btn-sm" onclick="AIBankPage.closeStudy()">✕</button>
                </div>
            </div>
            ${questionsHTML}
        `;

        document.getElementById('studyOverlay').classList.add('show');
        document.body.style.overflow = 'hidden';

        // Update progress
        StorageManager.saveAIProgress(catId, { completed: cat.questions.length, lastStudied: new Date().toISOString() });
        this.renderCategories();
    },

    closeStudy() {
        document.getElementById('studyOverlay').classList.remove('show');
        document.body.style.overflow = '';
    },

    startQuiz(catId) {
        this.closeStudy();
        const cat = AI_BANK_DATA.categories.find(c => c.id === catId);
        if (!cat) return;
        const isAr = App.currentLang === 'ar';
        const lang = isAr ? 'ar' : 'en';

        const bank = {
            name: cat.name[lang],
            questionType: 'mcq',
            questions: cat.questions.filter(q => q.type === 'mcq' || q.type === 'truefalse')
        };

        if (bank.questions.length === 0) {
            App.showToast(isAr ? 'لا توجد أسئلة مناسبة' : 'No suitable questions', 'warning');
            return;
        }

        QuizMode.start(bank);
    },

    exportCategory(catId) {
        const cat = AI_BANK_DATA.categories.find(c => c.id === catId);
        if (!cat) return;
        const isAr = App.currentLang === 'ar';
        const lang = isAr ? 'ar' : 'en';

        const bank = {
            name: cat.name[lang],
            questions: cat.questions,
            questionType: 'mcq',
            createdAt: new Date().toISOString()
        };

        ExportManager.exportAsPrintHTML(bank);
    }
};

document.addEventListener('DOMContentLoaded', () => AIBankPage.init());
