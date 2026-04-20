// BrainBank OAE - Interactive Quiz Mode
const QuizMode = {
    bank: null,
    questions: [],
    currentIndex: 0,
    answers: [],
    timer: null,
    seconds: 0,
    isFinished: false,

    start(bank) {
        this.bank = bank;
        // Only use MCQ and True/False for quiz mode
        this.questions = (bank.questions || []).filter(q => {
            const t = q.type || bank.questionType;
            return t === 'mcq' || t === 'truefalse';
        });

        if (this.questions.length === 0) {
            App.showToast(App.currentLang === 'ar' ? 'لا توجد أسئلة مناسبة للاختبار التفاعلي' : 'No suitable questions for interactive quiz', 'warning');
            return;
        }

        this.currentIndex = 0;
        this.answers = new Array(this.questions.length).fill(null);
        this.seconds = 0;
        this.isFinished = false;

        const overlay = document.getElementById('quizOverlay');
        overlay.classList.add('show');
        document.body.style.overflow = 'hidden';

        this.startTimer();
        this.renderQuestion();
    },

    startTimer() {
        this.timer = setInterval(() => {
            this.seconds++;
            this.updateTimerDisplay();
        }, 1000);
    },

    updateTimerDisplay() {
        const timerEl = document.getElementById('quizTimer');
        if (timerEl) {
            const m = Math.floor(this.seconds / 60).toString().padStart(2, '0');
            const s = (this.seconds % 60).toString().padStart(2, '0');
            timerEl.textContent = `${m}:${s}`;
        }
    },

    renderQuestion() {
        const q = this.questions[this.currentIndex];
        const type = q.type || this.bank.questionType;
        const total = this.questions.length;
        const current = this.currentIndex + 1;
        const progress = (current / total) * 100;
        const letters = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'];
        const isAr = App.currentLang === 'ar';

        let optionsHTML = '';
        if (type === 'mcq' && q.options) {
            optionsHTML = '<div class="quiz-options">';
            q.options.forEach((opt, j) => {
                const selected = this.answers[this.currentIndex] === j ? 'selected' : '';
                optionsHTML += `
                    <div class="quiz-option ${selected}" data-index="${j}" onclick="QuizMode.selectAnswer(${j})">
                        <span class="quiz-option-letter">${letters[j]}</span>
                        <span>${opt}</span>
                    </div>`;
            });
            optionsHTML += '</div>';
        } else if (type === 'truefalse') {
            const selT = this.answers[this.currentIndex] === true ? 'selected' : '';
            const selF = this.answers[this.currentIndex] === false ? 'selected' : '';
            optionsHTML = `<div class="quiz-options">
                <div class="quiz-option ${selT}" onclick="QuizMode.selectAnswer(true)">
                    <span class="quiz-option-letter">✓</span><span>${isAr ? 'صواب' : 'True'}</span>
                </div>
                <div class="quiz-option ${selF}" onclick="QuizMode.selectAnswer(false)">
                    <span class="quiz-option-letter">✗</span><span>${isAr ? 'خطأ' : 'False'}</span>
                </div>
            </div>`;
        }

        document.getElementById('quizContainer').innerHTML = `
            <div class="quiz-header">
                <h2 class="quiz-title">📝 ${this.bank.name}</h2>
                <div class="quiz-timer">⏱️ <span id="quizTimer">00:00</span></div>
                <button class="btn btn-outline btn-sm" onclick="QuizMode.close()">✕ ${isAr ? 'إغلاق' : 'Close'}</button>
            </div>
            <div class="quiz-progress">
                <div class="quiz-progress-text">
                    <span>${isAr ? 'السؤال' : 'Question'} ${current} ${isAr ? 'من' : 'of'} ${total}</span>
                    <span>${Math.round(progress)}%</span>
                </div>
                <div class="progress-bar"><div class="progress-fill" style="width:${progress}%"></div></div>
            </div>
            <div class="quiz-question">
                <div class="quiz-q-text">${current}. ${q.question}</div>
                ${optionsHTML}
                <div class="quiz-explanation-box" id="quizExplanation"></div>
            </div>
            <div class="quiz-nav">
                <button class="btn btn-outline" ${this.currentIndex === 0 ? 'disabled' : ''} onclick="QuizMode.prev()">
                    → ${isAr ? 'السابق' : 'Previous'}
                </button>
                ${this.currentIndex === total - 1
                    ? `<button class="btn btn-primary" onclick="QuizMode.finish()">${isAr ? 'إنهاء الاختبار' : 'Finish Quiz'} 🏁</button>`
                    : `<button class="btn btn-primary" onclick="QuizMode.next()">${isAr ? 'التالي' : 'Next'} ←</button>`
                }
            </div>`;

        this.updateTimerDisplay();
    },

    selectAnswer(value) {
        this.answers[this.currentIndex] = value;
        // Show feedback immediately
        const q = this.questions[this.currentIndex];
        const type = q.type || this.bank.questionType;
        const options = document.querySelectorAll('.quiz-option');

        options.forEach(opt => {
            opt.classList.remove('selected', 'correct', 'wrong');
            opt.classList.add('disabled');
        });

        if (type === 'mcq') {
            options.forEach((opt, j) => {
                if (j === q.correctAnswer) opt.classList.add('correct');
                else if (j === value) opt.classList.add('wrong');
            });
        } else if (type === 'truefalse') {
            options.forEach(opt => {
                const optVal = opt.textContent.includes('صواب') || opt.textContent.includes('True');
                if (optVal === q.correctAnswer) opt.classList.add('correct');
                else if (optVal === value) opt.classList.add('wrong');
            });
        }

        // Show explanation
        if (q.explanation) {
            const expBox = document.getElementById('quizExplanation');
            expBox.innerHTML = `💡 ${q.explanation}`;
            expBox.classList.add('show');
        }
    },

    next() {
        if (this.currentIndex < this.questions.length - 1) {
            this.currentIndex++;
            this.renderQuestion();
        }
    },

    prev() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.renderQuestion();
        }
    },

    finish() {
        clearInterval(this.timer);
        this.isFinished = true;

        let correct = 0;
        let wrong = 0;
        let unanswered = 0;

        this.questions.forEach((q, i) => {
            const answer = this.answers[i];
            const type = q.type || this.bank.questionType;
            if (answer === null || answer === undefined) {
                unanswered++;
            } else if (type === 'mcq' && answer === q.correctAnswer) {
                correct++;
            } else if (type === 'truefalse' && answer === q.correctAnswer) {
                correct++;
            } else {
                wrong++;
            }
        });

        const total = this.questions.length;
        const score = Math.round((correct / total) * 100);
        const isAr = App.currentLang === 'ar';

        let emoji = '🎉';
        let message = isAr ? 'ممتاز! أداء رائع!' : 'Excellent! Great performance!';
        if (score < 50) { emoji = '💪'; message = isAr ? 'استمر بالتعلم!' : 'Keep learning!'; }
        else if (score < 70) { emoji = '👍'; message = isAr ? 'جيد! يمكنك التحسن!' : 'Good! You can improve!'; }
        else if (score < 90) { emoji = '🌟'; message = isAr ? 'رائع! استمر!' : 'Wonderful! Keep going!'; }

        const m = Math.floor(this.seconds / 60);
        const s = this.seconds % 60;

        document.getElementById('quizContainer').innerHTML = `
            <div class="quiz-results">
                <div class="quiz-score-circle">
                    <div class="quiz-score-value">${score}%</div>
                    <div class="quiz-score-label">${message}</div>
                </div>
                <h2 style="font-size:2rem;margin-bottom:8px">${emoji}</h2>
                <p style="color:var(--text-secondary);margin-bottom:32px;font-size:1.1rem">${message}</p>
                <div class="quiz-results-stats">
                    <div class="quiz-result-stat">
                        <div class="quiz-result-stat-val correct-val">${correct}</div>
                        <div class="quiz-result-stat-label">${isAr ? 'صحيح' : 'Correct'}</div>
                    </div>
                    <div class="quiz-result-stat">
                        <div class="quiz-result-stat-val wrong-val">${wrong}</div>
                        <div class="quiz-result-stat-label">${isAr ? 'خطأ' : 'Wrong'}</div>
                    </div>
                    <div class="quiz-result-stat">
                        <div class="quiz-result-stat-val" style="color:var(--text-muted)">${unanswered}</div>
                        <div class="quiz-result-stat-label">${isAr ? 'بدون إجابة' : 'Unanswered'}</div>
                    </div>
                    <div class="quiz-result-stat">
                        <div class="quiz-result-stat-val" style="color:var(--color-primary)">${m}:${s.toString().padStart(2, '0')}</div>
                        <div class="quiz-result-stat-label">${isAr ? 'الوقت' : 'Time'}</div>
                    </div>
                </div>
                <div class="flex justify-center gap-2">
                    <button class="btn btn-primary" onclick="QuizMode.start(QuizMode.bank)">🔄 ${isAr ? 'إعادة الاختبار' : 'Retry'}</button>
                    <button class="btn btn-outline" onclick="QuizMode.close()">✕ ${isAr ? 'إغلاق' : 'Close'}</button>
                </div>
            </div>`;

        // Save stats
        StorageManager.updateStats('quizTaken', {
            correct, wrong, score, name: this.bank.name
        });
    },

    close() {
        clearInterval(this.timer);
        document.getElementById('quizOverlay').classList.remove('show');
        document.body.style.overflow = '';
    }
};
