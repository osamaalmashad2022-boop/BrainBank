// BrainBank OAE - Dashboard Logic
const Dashboard = {
    init() {
        this.renderStatCards();
        this.renderSourcesChart();
        this.renderQuizDonut();
        this.renderActivity();
    },

    renderStatCards() {
        const stats = StorageManager.getStats();
        const banks = StorageManager.getAllBanks();
        const totalQ = banks.reduce((s, b) => s + (b.questions ? b.questions.length : 0), 0);
        const isAr = App.currentLang === 'ar';

        const cards = [
            { icon: '📚', value: banks.length, label: isAr ? 'بنوك محفوظة' : 'Saved Banks' },
            { icon: '❓', value: totalQ, label: isAr ? 'إجمالي الأسئلة' : 'Total Questions' },
            { icon: '🎮', value: stats.totalQuizzesTaken || 0, label: isAr ? 'اختبارات مُنجزة' : 'Quizzes Taken' },
            { icon: '✅', value: stats.totalCorrectAnswers || 0, label: isAr ? 'إجابات صحيحة' : 'Correct Answers' }
        ];

        document.getElementById('statsGrid').innerHTML = cards.map(c => `
            <div class="stat-card">
                <span class="stat-card-icon">${c.icon}</span>
                <div class="stat-card-value" data-target="${c.value}">0</div>
                <div class="stat-card-label">${c.label}</div>
            </div>
        `).join('');

        // Animate counters
        setTimeout(() => {
            document.querySelectorAll('.stat-card-value').forEach(el => {
                const target = parseInt(el.dataset.target);
                App.animateCounter(el, target, 1500);
            });
        }, 300);
    },

    renderSourcesChart() {
        const stats = StorageManager.getStats();
        const sources = stats.sourcesUsed || {};
        const isAr = App.currentLang === 'ar';

        const data = [
            { key: 'text', label: isAr ? 'نص' : 'Text', icon: '📝', color: '#6C63FF', value: sources.text || 0 },
            { key: 'file', label: isAr ? 'ملف' : 'File', icon: '📁', color: '#06D6A0', value: sources.file || 0 },
            { key: 'url', label: isAr ? 'رابط' : 'URL', icon: '🔗', color: '#3B82F6', value: sources.url || 0 },
            { key: 'topic', label: isAr ? 'موضوع' : 'Topic', icon: '💡', color: '#F59E0B', value: sources.topic || 0 },
            { key: 'image', label: isAr ? 'صورة' : 'Image', icon: '🖼️', color: '#EC4899', value: sources.image || 0 }
        ];

        const max = Math.max(...data.map(d => d.value), 1);

        document.getElementById('sourcesChart').innerHTML = data.map(d => {
            const height = Math.max((d.value / max) * 100, 5);
            return `
                <div class="bar-item">
                    <div class="bar-fill" style="height:${height}%;background:${d.color}" data-value="${d.value}"></div>
                    <div class="bar-label">${d.icon}<br>${d.label}</div>
                </div>`;
        }).join('');
    },

    renderQuizDonut() {
        const stats = StorageManager.getStats();
        const correct = stats.totalCorrectAnswers || 0;
        const wrong = stats.totalWrongAnswers || 0;
        const total = correct + wrong;
        const isAr = App.currentLang === 'ar';

        if (total === 0) {
            document.getElementById('quizDonut').innerHTML = `
                <div style="text-align:center;color:var(--text-muted);padding:40px">
                    <div style="font-size:2.5rem;margin-bottom:12px">🎮</div>
                    <div>${isAr ? 'لم تأخذ أي اختبار بعد' : 'No quizzes taken yet'}</div>
                </div>`;
            return;
        }

        const correctPct = Math.round((correct / total) * 100);
        const wrongPct = 100 - correctPct;
        const correctStroke = (correct / total) * 283;
        const wrongStroke = (wrong / total) * 283;

        document.getElementById('quizDonut').innerHTML = `
            <div class="donut-chart">
                <svg viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="var(--bg-tertiary)" stroke-width="10"/>
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#06D6A0" stroke-width="10" 
                        stroke-dasharray="${correctStroke} ${283 - correctStroke}" stroke-linecap="round"/>
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#FF6B6B" stroke-width="10" 
                        stroke-dasharray="${wrongStroke} ${283 - wrongStroke}" stroke-dashoffset="-${correctStroke}" stroke-linecap="round"/>
                </svg>
                <div class="donut-center">
                    <div class="donut-center-value">${correctPct}%</div>
                    <div class="donut-center-label">${isAr ? 'نجاح' : 'Success'}</div>
                </div>
            </div>
            <div class="donut-legend">
                <div class="legend-item">
                    <span class="legend-dot" style="background:#06D6A0"></span>
                    <span>${isAr ? 'صحيح' : 'Correct'}: ${correct}</span>
                </div>
                <div class="legend-item">
                    <span class="legend-dot" style="background:#FF6B6B"></span>
                    <span>${isAr ? 'خطأ' : 'Wrong'}: ${wrong}</span>
                </div>
                <div class="legend-item">
                    <span class="legend-dot" style="background:var(--text-muted)"></span>
                    <span>${isAr ? 'الإجمالي' : 'Total'}: ${total}</span>
                </div>
            </div>`;
    },

    renderActivity() {
        const stats = StorageManager.getStats();
        const activities = stats.activityLog || [];
        const list = document.getElementById('activityList');
        const empty = document.getElementById('activityEmpty');
        const isAr = App.currentLang === 'ar';

        if (activities.length === 0) {
            list.innerHTML = '';
            empty.classList.remove('hidden');
            return;
        }

        empty.classList.add('hidden');
        list.innerHTML = activities.slice(0, 15).map(a => {
            const isCreate = a.type === 'create';
            const icon = isCreate ? '📚' : '🎮';
            const iconClass = isCreate ? 'create' : 'quiz';
            const title = isCreate
                ? (isAr ? `إنشاء بنك "${a.name}"` : `Created bank "${a.name}"`)
                : (isAr ? `اختبار "${a.name}" - ${a.score}%` : `Quiz "${a.name}" - ${a.score}%`);

            const badge = !isCreate ? `<span class="badge ${a.score >= 70 ? 'badge-success' : a.score >= 50 ? 'badge-warning' : 'badge-danger'}">${a.score}%</span>` : '';

            return `
                <div class="activity-item">
                    <div class="activity-icon ${iconClass}">${icon}</div>
                    <div class="activity-details">
                        <div class="activity-title">${title}</div>
                        <div class="activity-time">${App.formatDate(a.date)}</div>
                    </div>
                    <div class="activity-badge">${badge}</div>
                </div>`;
        }).join('');
    }
};

document.addEventListener('DOMContentLoaded', () => Dashboard.init());
