// BrainBank OAE - Banks Page Logic
const BanksPage = {
    mergeMode: false,
    selectedBanks: [],
    editingBank: null,

    init() {
        this.renderBanks();
        this.setupSearch();
        this.setupFilters();
        this.setupMerge();
        this.setupEditOverlayClose();
    },

    renderBanks() {
        const banks = this.getFilteredBanks();
        const grid = document.getElementById('banksGrid');
        const empty = document.getElementById('emptyState');

        if (banks.length === 0) {
            grid.innerHTML = '';
            empty.classList.remove('hidden');
            return;
        }

        empty.classList.add('hidden');
        const isAr = App.currentLang === 'ar';
        const sourceIcons = { text: '📝', file: '📁', url: '🔗', topic: '💡', image: '🖼️', merged: '🔗' };
        const sourceLabels = { text: { ar: 'نص', en: 'Text' }, file: { ar: 'ملف', en: 'File' }, url: { ar: 'رابط', en: 'URL' }, topic: { ar: 'موضوع', en: 'Topic' }, image: { ar: 'صورة', en: 'Image' }, merged: { ar: 'مدمج', en: 'Merged' } };
        const diffLabels = { easy: { ar: 'سهل', en: 'Easy', cls: 'success' }, medium: { ar: 'متوسط', en: 'Medium', cls: 'warning' }, hard: { ar: 'صعب', en: 'Hard', cls: 'danger' }, mixed: { ar: 'متنوع', en: 'Mixed', cls: 'info' } };
        const lang = isAr ? 'ar' : 'en';

        grid.innerHTML = banks.map(bank => {
            const qCount = bank.questions ? bank.questions.length : 0;
            const src = bank.source || 'text';
            const diff = diffLabels[bank.difficulty] || diffLabels.medium;
            const selectedClass = this.selectedBanks.includes(bank.id) ? 'selected' : '';
            const selectableClass = this.mergeMode ? 'selectable' : '';
            const mergeClick = this.mergeMode ? `onclick="BanksPage.toggleSelect('${bank.id}')"` : '';

            return `
            <div class="bank-card ${selectableClass} ${selectedClass}" ${mergeClick} data-id="${bank.id}">
                <div class="bank-card-header">
                    <div class="bank-icon">${sourceIcons[src] || '📝'}</div>
                    ${!this.mergeMode ? `
                    <div class="bank-menu-btn" onclick="event.stopPropagation(); BanksPage.toggleMenu('${bank.id}')">⋮
                        <div class="bank-dropdown" id="menu-${bank.id}">
                            <button class="bank-dropdown-item" onclick="BanksPage.startQuiz('${bank.id}')">🎮 ${isAr ? 'اختبار تفاعلي' : 'Interactive Quiz'}</button>
                            <button class="bank-dropdown-item" onclick="BanksPage.editBank('${bank.id}')">✏️ ${isAr ? 'تعديل الأسئلة' : 'Edit Questions'}</button>
                            <button class="bank-dropdown-item" onclick="BanksPage.viewBank('${bank.id}')">👁️ ${isAr ? 'عرض الأسئلة' : 'View Questions'}</button>
                            <button class="bank-dropdown-item" onclick="BanksPage.exportBank('${bank.id}', 'json')">📥 ${isAr ? 'تصدير JSON' : 'Export JSON'}</button>
                            <button class="bank-dropdown-item" onclick="BanksPage.exportBank('${bank.id}', 'csv')">📊 ${isAr ? 'تصدير CSV' : 'Export CSV'}</button>
                            <button class="bank-dropdown-item" onclick="BanksPage.exportBank('${bank.id}', 'print')">🖨️ ${isAr ? 'طباعة' : 'Print'}</button>
                            <button class="bank-dropdown-item danger" onclick="BanksPage.deleteBank('${bank.id}', '${bank.name}')">🗑️ ${isAr ? 'حذف' : 'Delete'}</button>
                        </div>
                    </div>` : ''}
                </div>
                <h3 class="bank-name">${bank.name}</h3>
                <div class="bank-meta">
                    <span class="badge badge-primary">${qCount} ${isAr ? 'سؤال' : 'Q'}</span>
                    <span class="badge badge-${diff.cls}">${diff[lang]}</span>
                    <span class="badge badge-info">${sourceLabels[src] ? sourceLabels[src][lang] : src}</span>
                </div>
                ${bank.tags && bank.tags.length > 0 ? `
                <div class="bank-tags">
                    ${bank.tags.map(t => `<span class="bank-tag">${t}</span>`).join('')}
                </div>` : ''}
                <div class="bank-date">
                    <span>📅 ${App.formatDate(bank.createdAt)}</span>
                    ${!this.mergeMode ? `<button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); BanksPage.startQuiz('${bank.id}')">${isAr ? '🎮 اختبار' : '🎮 Quiz'}</button>` : ''}
                </div>
            </div>`;
        }).join('');
    },

    getFilteredBanks() {
        let banks = StorageManager.getAllBanks();
        const search = (document.getElementById('searchInput')?.value || '').trim().toLowerCase();
        const source = document.getElementById('filterSource')?.value || 'all';
        const difficulty = document.getElementById('filterDifficulty')?.value || 'all';

        if (search) {
            banks = banks.filter(b => (b.name || '').toLowerCase().includes(search) ||
                (b.tags || []).some(t => t.toLowerCase().includes(search)));
        }
        if (source !== 'all') banks = banks.filter(b => b.source === source);
        if (difficulty !== 'all') banks = banks.filter(b => b.difficulty === difficulty);

        return banks;
    },

    setupSearch() {
        const input = document.getElementById('searchInput');
        if (input) {
            input.addEventListener('input', App.debounce(() => this.renderBanks(), 300));
        }
    },

    setupFilters() {
        ['filterSource', 'filterDifficulty'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('change', () => this.renderBanks());
        });
    },

    toggleMenu(id) {
        document.querySelectorAll('.bank-dropdown').forEach(d => {
            if (d.id !== `menu-${id}`) d.classList.remove('show');
        });
        
        // Reset z-index for all cards
        document.querySelectorAll('.bank-card').forEach(c => c.style.zIndex = '1');
        
        const menu = document.getElementById(`menu-${id}`);
        menu.classList.toggle('show');
        
        const card = document.querySelector(`.bank-card[data-id="${id}"]`);
        if (menu.classList.contains('show') && card) {
            // Elevate this card so the dropdown overlaps adjacent cards
            card.style.zIndex = '50';
        }

        const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
                menu.classList.remove('show');
                if (card) card.style.zIndex = '1';
                document.removeEventListener('click', closeMenu);
            }
        };
        setTimeout(() => document.addEventListener('click', closeMenu), 10);
    },

    startQuiz(id) {
        const bank = StorageManager.getBank(id);
        if (bank) QuizMode.start(bank);
    },

    viewBank(id) {
        const bank = StorageManager.getBank(id);
        if (!bank) return;
        // Open print view to see all questions
        ExportManager.exportAsPrintHTML(bank);
    },

    exportBank(id, format) {
        const bank = StorageManager.getBank(id);
        if (!bank) return;
        if (format === 'json') ExportManager.exportAsJSON(bank);
        else if (format === 'csv') ExportManager.exportAsCSV(bank);
        else if (format === 'print') ExportManager.exportAsPrintHTML(bank);
    },

    deleteBank(id, name) {
        const isAr = App.currentLang === 'ar';
        App.showConfirm(
            isAr ? 'حذف البنك' : 'Delete Bank',
            isAr ? `هل أنت متأكد من حذف "${name}"؟ لا يمكن التراجع عن هذا الإجراء.` : `Are you sure you want to delete "${name}"? This cannot be undone.`,
            () => {
                StorageManager.deleteBank(id);
                this.renderBanks();
                App.showToast(isAr ? 'تم حذف البنك بنجاح' : 'Bank deleted successfully', 'success');
            }
        );
    },

    // ==========================================
    // Edit Bank Functionality
    // ==========================================

    editBank(id) {
        const bank = StorageManager.getBank(id);
        if (!bank) return;

        // Deep copy so we can cancel edits
        this.editingBank = JSON.parse(JSON.stringify(bank));
        this.renderEditOverlay();

        const overlay = document.getElementById('editOverlay');
        overlay.classList.add('show');
        document.body.style.overflow = 'hidden';
    },

    renderEditOverlay() {
        const bank = this.editingBank;
        if (!bank) return;
        const isAr = App.currentLang === 'ar';
        const container = document.getElementById('editContainer');
        const type = bank.questionType || 'mcq';

        let html = `
            <div class="edit-header">
                <div class="edit-header-title">
                    <span>✏️</span>
                    <span>${isAr ? 'تعديل بنك الأسئلة' : 'Edit Question Bank'}</span>
                </div>
                <div class="edit-header-actions">
                    <button class="btn btn-primary btn-sm" onclick="BanksPage.saveBankEdits()">
                        <span>💾</span> <span>${isAr ? 'حفظ التعديلات' : 'Save Changes'}</span>
                    </button>
                    <button class="btn btn-outline btn-sm" onclick="BanksPage.closeBankEdit()">
                        <span>✕</span> <span>${isAr ? 'إغلاق' : 'Close'}</span>
                    </button>
                </div>
            </div>

            <div class="edit-bank-name-section">
                <label class="edit-field-label" style="margin-top:0">${isAr ? 'اسم البنك' : 'Bank Name'}</label>
                <input type="text" class="edit-field" id="editBankName" value="${this._escapeAttr(bank.name)}">
            </div>

            <div class="edit-bank-questions-list" id="editBankQuestionsList">
                ${bank.questions.map((q, i) => this.renderBankEditCard(q, i, type)).join('')}
            </div>

            <div class="edit-bank-footer">
                <div class="questions-count">
                    ${isAr ? 'إجمالي الأسئلة:' : 'Total questions:'} <strong id="editQuestionsCount">${bank.questions.length}</strong>
                </div>
                <div style="display:flex;gap:10px">
                    <button class="btn btn-primary btn-sm" onclick="BanksPage.saveBankEdits()">
                        <span>💾</span> <span>${isAr ? 'حفظ التعديلات' : 'Save Changes'}</span>
                    </button>
                    <button class="btn btn-outline btn-sm" onclick="BanksPage.closeBankEdit()">
                        <span>✕</span> <span>${isAr ? 'إغلاق' : 'Close'}</span>
                    </button>
                </div>
            </div>`;

        container.innerHTML = html;
    },

    renderBankEditCard(q, index, type) {
        const isAr = App.currentLang === 'ar';
        const letters = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'];
        const questionText = q.question || q.instruction || '';
        const fieldLabel = type === 'matching'
            ? (isAr ? 'التعليمات' : 'Instructions')
            : (isAr ? 'نص السؤال' : 'Question Text');

        let html = `<div class="edit-bank-question-card" id="bankQCard-${index}">
            <div class="edit-bank-question-header">
                <span class="question-num">${index + 1}</span>
                <textarea class="edit-field" id="bankEditQ-${index}" rows="2">${questionText}</textarea>
                <button class="btn btn-icon btn-ghost" onclick="BanksPage.deleteBankQuestion(${index})" title="${isAr ? 'حذف' : 'Delete'}">🗑️</button>
            </div>`;

        // Type-specific fields
        if (type === 'mcq' && q.options) {
            html += `<label class="edit-field-label">${isAr ? 'الخيارات (اختر الإجابة الصحيحة)' : 'Options (select correct answer)'}</label>`;
            html += '<div class="edit-options-list">';
            q.options.forEach((opt, j) => {
                html += `
                    <div class="edit-option-row">
                        <input type="radio" name="bankEditCorrect-${index}" value="${j}" ${j === q.correctAnswer ? 'checked' : ''}>
                        <span class="edit-option-letter">${letters[j]}</span>
                        <input type="text" class="edit-field" id="bankEditOpt-${index}-${j}" value="${this._escapeAttr(opt)}">
                    </div>`;
            });
            html += '</div>';
        } else if (type === 'truefalse') {
            html += `<label class="edit-field-label">${isAr ? 'الإجابة الصحيحة' : 'Correct Answer'}</label>`;
            html += `<div class="edit-tf-selector">
                <div class="edit-tf-option ${q.correctAnswer === true ? 'selected' : ''}" onclick="BanksPage._selectBankTF(${index}, true)">✓ ${isAr ? 'صواب' : 'True'}</div>
                <div class="edit-tf-option ${q.correctAnswer === false ? 'selected' : ''}" onclick="BanksPage._selectBankTF(${index}, false)">✗ ${isAr ? 'خطأ' : 'False'}</div>
            </div>`;
            html += `<input type="hidden" id="bankEditTF-${index}" value="${q.correctAnswer}">`;
        } else if (type === 'fillblank' || type === 'shortanswer') {
            html += `<label class="edit-field-label">${isAr ? 'الإجابة الصحيحة' : 'Correct Answer'}</label>`;
            html += `<input type="text" class="edit-field" id="bankEditAnswer-${index}" value="${this._escapeAttr(q.correctAnswer || '')}">`;
        } else if (type === 'essay') {
            html += `<label class="edit-field-label">${isAr ? 'إرشادات / معايير التقييم' : 'Guidelines / Rubric'}</label>`;
            html += `<textarea class="edit-field" id="bankEditGuidelines-${index}" rows="3">${q.guidelines || q.rubric || ''}</textarea>`;
        } else if (type === 'matching' && q.pairs) {
            html += `<label class="edit-field-label">${isAr ? 'أزواج المطابقة' : 'Matching Pairs'}</label>`;
            html += '<div class="edit-matching-pairs">';
            q.pairs.forEach((p, j) => {
                html += `
                    <div class="edit-matching-row">
                        <input type="text" class="edit-field" id="bankEditPairL-${index}-${j}" value="${this._escapeAttr(p.left)}">
                        <span class="match-arrow">⟷</span>
                        <input type="text" class="edit-field" id="bankEditPairR-${index}-${j}" value="${this._escapeAttr(p.right)}">
                    </div>`;
            });
            html += '</div>';
        }

        // Explanation
        if (type !== 'essay') {
            html += `<label class="edit-field-label">💡 ${isAr ? 'التفسير (اختياري)' : 'Explanation (optional)'}</label>`;
            html += `<textarea class="edit-field" id="bankEditExpl-${index}" rows="2">${q.explanation || ''}</textarea>`;
        }

        html += '</div>';
        return html;
    },

    _escapeAttr(str) {
        return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    },

    _selectBankTF(index, value) {
        const hidden = document.getElementById(`bankEditTF-${index}`);
        if (hidden) hidden.value = value;
        const card = document.getElementById(`bankQCard-${index}`);
        if (card) {
            card.querySelectorAll('.edit-tf-option').forEach(opt => opt.classList.remove('selected'));
            const opts = card.querySelectorAll('.edit-tf-option');
            if (value === true && opts[0]) opts[0].classList.add('selected');
            if (value === false && opts[1]) opts[1].classList.add('selected');
        }
    },

    deleteBankQuestion(index) {
        const isAr = App.currentLang === 'ar';
        if (!this.editingBank) return;

        // First collect current edits before removing
        this._collectBankEdits();

        this.editingBank.questions.splice(index, 1);
        // Re-render the question list
        const type = this.editingBank.questionType || 'mcq';
        const list = document.getElementById('editBankQuestionsList');
        if (list) {
            list.innerHTML = this.editingBank.questions.map((q, i) => this.renderBankEditCard(q, i, type)).join('');
        }
        const countEl = document.getElementById('editQuestionsCount');
        if (countEl) countEl.textContent = this.editingBank.questions.length;

        App.showToast(isAr ? 'تم حذف السؤال' : 'Question deleted', 'info');
    },

    _collectBankEdits() {
        const bank = this.editingBank;
        if (!bank) return;
        const type = bank.questionType || 'mcq';

        // Bank name
        const nameField = document.getElementById('editBankName');
        if (nameField) bank.name = nameField.value.trim();

        // Questions
        bank.questions.forEach((q, i) => {
            const qField = document.getElementById(`bankEditQ-${i}`);
            if (qField) {
                if (type === 'matching') {
                    q.instruction = qField.value.trim();
                } else {
                    q.question = qField.value.trim();
                }
            }

            if (type === 'mcq' && q.options) {
                q.options.forEach((_, j) => {
                    const optField = document.getElementById(`bankEditOpt-${i}-${j}`);
                    if (optField) q.options[j] = optField.value.trim();
                });
                const checkedRadio = document.querySelector(`input[name="bankEditCorrect-${i}"]:checked`);
                if (checkedRadio) q.correctAnswer = parseInt(checkedRadio.value);
            } else if (type === 'truefalse') {
                const tfField = document.getElementById(`bankEditTF-${i}`);
                if (tfField) q.correctAnswer = tfField.value === 'true';
            } else if (type === 'fillblank' || type === 'shortanswer') {
                const ansField = document.getElementById(`bankEditAnswer-${i}`);
                if (ansField) q.correctAnswer = ansField.value.trim();
            } else if (type === 'essay') {
                const guideField = document.getElementById(`bankEditGuidelines-${i}`);
                if (guideField) {
                    q.guidelines = guideField.value.trim();
                    q.rubric = guideField.value.trim();
                }
            } else if (type === 'matching' && q.pairs) {
                q.pairs.forEach((_, j) => {
                    const lField = document.getElementById(`bankEditPairL-${i}-${j}`);
                    const rField = document.getElementById(`bankEditPairR-${i}-${j}`);
                    if (lField) q.pairs[j].left = lField.value.trim();
                    if (rField) q.pairs[j].right = rField.value.trim();
                });
            }

            // Explanation
            if (type !== 'essay') {
                const explField = document.getElementById(`bankEditExpl-${i}`);
                if (explField) q.explanation = explField.value.trim();
            }
        });
    },

    saveBankEdits() {
        if (!this.editingBank) return;
        const isAr = App.currentLang === 'ar';

        // Collect all current edits from the form
        this._collectBankEdits();

        if (!this.editingBank.name) {
            App.showToast(isAr ? 'يرجى إدخال اسم للبنك' : 'Please enter a bank name', 'warning');
            return;
        }

        if (this.editingBank.questions.length === 0) {
            App.showToast(isAr ? 'لا يمكن حفظ بنك فارغ' : 'Cannot save an empty bank', 'warning');
            return;
        }

        // Save to storage
        StorageManager.saveBank(this.editingBank);
        this.closeBankEdit();
        this.renderBanks();
        App.showToast(isAr ? `تم حفظ التعديلات بنجاح! ✓` : `Changes saved successfully! ✓`, 'success');
    },

    closeBankEdit() {
        const overlay = document.getElementById('editOverlay');
        overlay.classList.remove('show');
        document.body.style.overflow = '';
        this.editingBank = null;
    },

    setupEditOverlayClose() {
        // Escape key to close edit overlay
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const overlay = document.getElementById('editOverlay');
                if (overlay && overlay.classList.contains('show')) {
                    this.closeBankEdit();
                }
            }
        });
    },

    // Merge functionality
    setupMerge() {
        const toggleBtn = document.getElementById('mergeToggleBtn');
        const cancelBtn = document.getElementById('cancelMergeBtn');
        const confirmBtn = document.getElementById('confirmMergeBtn');

        toggleBtn?.addEventListener('click', () => {
            this.mergeMode = !this.mergeMode;
            this.selectedBanks = [];
            document.getElementById('mergeBar').classList.toggle('show', this.mergeMode);
            this.renderBanks();
        });

        cancelBtn?.addEventListener('click', () => {
            this.mergeMode = false;
            this.selectedBanks = [];
            document.getElementById('mergeBar').classList.remove('show');
            this.renderBanks();
        });

        confirmBtn?.addEventListener('click', () => {
            if (this.selectedBanks.length < 2) {
                App.showToast(App.currentLang === 'ar' ? 'اختر بنكين على الأقل' : 'Select at least 2 banks', 'warning');
                return;
            }
            const isAr = App.currentLang === 'ar';
            const name = prompt(isAr ? 'أدخل اسم البنك المدمج:' : 'Enter merged bank name:', isAr ? 'بنك مدمج' : 'Merged Bank');
            if (name) {
                StorageManager.mergeBanks(this.selectedBanks, name);
                this.mergeMode = false;
                this.selectedBanks = [];
                document.getElementById('mergeBar').classList.remove('show');
                this.renderBanks();
                App.showToast(isAr ? 'تم دمج البنوك بنجاح! 🎉' : 'Banks merged successfully! 🎉', 'success');
            }
        });
    },

    toggleSelect(id) {
        const idx = this.selectedBanks.indexOf(id);
        if (idx >= 0) this.selectedBanks.splice(idx, 1);
        else this.selectedBanks.push(id);

        document.getElementById('mergeCount').textContent = this.selectedBanks.length;
        document.getElementById('confirmMergeBtn').disabled = this.selectedBanks.length < 2;

        const card = document.querySelector(`.bank-card[data-id="${id}"]`);
        if (card) card.classList.toggle('selected');
    }
};

document.addEventListener('DOMContentLoaded', () => BanksPage.init());
