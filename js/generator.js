// BrainBank OAE - Generator Logic
const Generator = {
    currentTab: 'text',
    generatedQuestions: null,
    fileContent: null,
    imageBase64: null,

    init() {
        this.setupTabs();
        this.setupTextInput();
        this.setupFileInput();
        this.setupImageInput();
        this.setupTopicChips();
        this.setupSettings();
        this.setupGenerate();
        this.setupSave();
        this.checkURLParams();
    },

    checkURLParams() {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab');
        if (tab) {
            const tabEl = document.querySelector(`.tab[data-tab="${tab}"]`);
            if (tabEl) tabEl.click();
        }
    },

    chunkText(text, maxWords = 1000) {
        if (!text) return [];
        const words = text.split(/\s+/);
        const chunks = [];
        for (let i = 0; i < words.length; i += maxWords) {
            chunks.push(words.slice(i, i + maxWords).join(' '));
        }
        return chunks.filter(c => c.trim().length > 0);
    },

    setupTabs() {
        document.querySelectorAll('#inputTabs .tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('#inputTabs .tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.input-panel').forEach(p => p.classList.remove('active'));
                tab.classList.add('active');
                this.currentTab = tab.dataset.tab;
                document.getElementById(`panel-${this.currentTab}`).classList.add('active');
            });
        });
    },

    setupTextInput() {
        const textInput = document.getElementById('textInput');
        const charCount = document.getElementById('charCount');
        const clearBtn = document.getElementById('clearTextBtn');

        textInput.addEventListener('input', () => {
            charCount.innerHTML = `${textInput.value.length} <span data-ar="حرف" data-en="chars">${App.currentLang === 'ar' ? 'حرف' : 'chars'}</span>`;
        });
        clearBtn.addEventListener('click', () => {
            textInput.value = '';
            charCount.innerHTML = `0 <span>${App.currentLang === 'ar' ? 'حرف' : 'chars'}</span>`;
        });
    },

    setupFileInput() {
        const dropZone = document.getElementById('fileDropZone');
        const fileInput = document.getElementById('fileInput');
        const fileInfo = document.getElementById('fileInfo');
        const fileName = document.getElementById('fileName');
        const fileSize = document.getElementById('fileSize');
        const fileRemove = document.getElementById('fileRemove');

        ['dragenter', 'dragover'].forEach(evt => {
            dropZone.addEventListener(evt, (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
        });
        ['dragleave', 'drop'].forEach(evt => {
            dropZone.addEventListener(evt, (e) => { e.preventDefault(); dropZone.classList.remove('dragover'); });
        });

        dropZone.addEventListener('drop', (e) => {
            const file = e.dataTransfer.files[0];
            if (file) this.handleFile(file);
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files[0]) this.handleFile(e.target.files[0]);
        });

        fileRemove.addEventListener('click', () => {
            this.fileContent = null;
            fileInfo.classList.remove('show');
            fileInput.value = '';
        });
    },

    async handleFile(file) {
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            App.showToast(App.currentLang === 'ar' ? 'الملف كبير جداً (الحد الأقصى 5MB)' : 'File too large (max 5MB)', 'error');
            return;
        }

        document.getElementById('fileName').textContent = file.name;
        document.getElementById('fileSize').textContent = (file.size / 1024).toFixed(1) + ' KB';
        document.getElementById('fileInfo').classList.add('show');

        try {
            if (file.name.endsWith('.txt')) {
                this.fileContent = await file.text();
                App.showToast(App.currentLang === 'ar' ? 'تم استخراج النص بنجاح' : 'Text extracted successfully', 'success');
            } else if (file.name.endsWith('.pdf')) {
                App.showLoading(App.currentLang === 'ar' ? 'جاري استخراج النص من PDF...' : 'Extracting text from PDF...');
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
                let fullText = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const txtContent = await page.getTextContent();
                    fullText += txtContent.items.map(item => item.str).join(' ') + '\n';
                }
                this.fileContent = fullText;
                App.hideLoading();
                App.showToast(App.currentLang === 'ar' ? 'تم استخراج النص من PDF' : 'Extracted from PDF', 'success');
            } else if (file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
                App.showLoading(App.currentLang === 'ar' ? 'جاري استخراج النص من الوورد...' : 'Extracting text from Word...');
                const arrayBuffer = await file.arrayBuffer();
                const result = await mammoth.extractRawText({arrayBuffer: arrayBuffer});
                this.fileContent = result.value;
                App.hideLoading();
                App.showToast(App.currentLang === 'ar' ? 'تم استخراج النص من ملف Word' : 'Extracted from Word', 'success');
            } else {
                throw new Error("Unsupported file type");
            }
        } catch (err) {
            App.hideLoading();
            App.showToast(App.currentLang === 'ar' ? 'خطأ في قراءة الملف. يرجى المحاولة بصيغة أخرى.' : 'Error reading file', 'error');
            console.error(err);
        }
    },

    setupImageInput() {
        const dropZone = document.getElementById('imageDropZone');
        const imageInput = document.getElementById('imageInput');
        const preview = document.getElementById('imagePreview');
        const previewImg = document.getElementById('imagePreviewImg');

        ['dragenter', 'dragover'].forEach(evt => {
            dropZone.addEventListener(evt, (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
        });
        ['dragleave', 'drop'].forEach(evt => {
            dropZone.addEventListener(evt, (e) => { e.preventDefault(); dropZone.classList.remove('dragover'); });
        });

        dropZone.addEventListener('drop', (e) => {
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) this.handleImage(file);
        });

        imageInput.addEventListener('change', (e) => {
            if (e.target.files[0]) this.handleImage(e.target.files[0]);
        });
    },

    handleImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64 = e.target.result.split(',')[1];
            this.imageBase64 = base64;
            document.getElementById('imagePreviewImg').src = e.target.result;
            document.getElementById('imagePreview').classList.add('show');
            App.showToast(App.currentLang === 'ar' ? 'تم تحميل الصورة' : 'Image loaded', 'success');
        };
        reader.readAsDataURL(file);
    },

    setupTopicChips() {
        document.querySelectorAll('.topic-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                document.getElementById('topicInput').value = chip.dataset.topic;
            });
        });
    },

    setupSettings() {
        // Difficulty selector
        document.querySelectorAll('.diff-option').forEach(opt => {
            opt.addEventListener('click', () => {
                document.querySelectorAll('.diff-option').forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
            });
        });

        // Question count slider
        const slider = document.getElementById('questionCount');
        const display = document.getElementById('countDisplay');
        slider.addEventListener('input', () => {
            display.textContent = slider.value;
        });
    },

    setupGenerate() {
        document.getElementById('generateBtn').addEventListener('click', () => this.generate());
        document.getElementById('regenerateBtn').addEventListener('click', () => this.generate());
    },

    async generate() {
        let content = '';
        const tab = this.currentTab;

        switch (tab) {
            case 'text':
                content = document.getElementById('textInput').value.trim();
                if (!content) {
                    App.showToast(App.currentLang === 'ar' ? 'يرجى إدخال نص أولاً' : 'Please enter text first', 'warning');
                    return;
                }
                break;
            case 'file':
                content = this.fileContent;
                if (!content) {
                    App.showToast(App.currentLang === 'ar' ? 'يرجى رفع ملف أولاً' : 'Please upload a file first', 'warning');
                    return;
                }
                break;
            case 'url':
                const url = document.getElementById('urlInput').value.trim();
                if (!url) {
                    App.showToast(App.currentLang === 'ar' ? 'يرجى إدخال رابط' : 'Please enter a URL', 'warning');
                    return;
                }
                content = url;
                break;
            case 'topic':
                content = document.getElementById('topicInput').value.trim();
                if (!content) {
                    App.showToast(App.currentLang === 'ar' ? 'يرجى كتابة موضوع' : 'Please enter a topic', 'warning');
                    return;
                }
                break;
            case 'image':
                if (!this.imageBase64) {
                    App.showToast(App.currentLang === 'ar' ? 'يرجى رفع صورة أولاً' : 'Please upload an image first', 'warning');
                    return;
                }
                break;
        }

        const options = {
            type: document.getElementById('questionType').value,
            difficulty: document.querySelector('.diff-option.active').dataset.diff,
            count: parseInt(document.getElementById('questionCount').value),
            language: document.getElementById('questionLang').value,
            bloomLevel: document.getElementById('bloomLevel').value,
            source: tab
        };

        const loadingMsg = App.currentLang === 'ar' ? 'جاري توليد الأسئلة بالذكاء الاصطناعي...' : 'Generating questions with AI...';
        App.showLoading(loadingMsg);
        document.getElementById('generateBtn').disabled = true;

        try {
            let result;
            if (tab === 'topic') {
                result = await AIService.generateFromTopic(content, options);
            } else if (tab === 'url') {
                result = await AIService.extractAndGenerate(content, options);
            } else if (tab === 'image') {
                result = await AIService.generateFromImage(this.imageBase64, options);
            } else {
                // Text or Extracted File Text
                const chunks = this.chunkText(content, 1000); // 1000 words per chunk
                
                if (chunks.length <= 1) {
                    result = await AIService.generateQuestions(content, options);
                } else {
                    const allQuestions = [];
                    const countPerChunk = Math.max(1, Math.ceil(options.count / chunks.length));
                    const chunkOptions = { ...options, count: countPerChunk };
                    
                    for (let i = 0; i < chunks.length; i++) {
                        const loadingMsg = App.currentLang === 'ar' 
                            ? `جاري معالجة و توليد الجزء ${i + 1} من ${chunks.length}...` 
                            : `Processing & Generating part ${i + 1} of ${chunks.length}...`;
                        App.updateLoadingText(loadingMsg);
                        
                        try {
                            const chunkResult = await AIService.generateQuestions(chunks[i], chunkOptions);
                            if (chunkResult && chunkResult.questions) {
                                allQuestions.push(...chunkResult.questions);
                            }
                        } catch (chunkErr) {
                            console.error(`Error processing chunk ${i}:`, chunkErr);
                            // Ensure the process continues even if one chunk fails
                        }

                        if (allQuestions.length >= options.count) break;

                        if (i < chunks.length - 1) {
                             App.updateLoadingText(App.currentLang === 'ar' ? 'فترة انتظار التقاط أنفاس السيرفر (3 ثوان)...' : 'Cooldown period (3s)...');
                             await new Promise(r => setTimeout(r, 3000));
                        }
                    }
                    
                    // Remap IDs sequentially because chunks reset IDs
                    const finalQuestions = allQuestions.slice(0, options.count).map((q, idx) => ({...q, id: idx + 1}));
                    result = { questions: finalQuestions };
                }
            }

            this.generatedQuestions = result.questions;
            this.currentOptions = options;
            this.currentSource = tab;
            this.currentContent = content;
            this.renderResults(result.questions, options);
            App.showToast(
                App.currentLang === 'ar' ? `تم توليد ${result.questions.length} سؤال بنجاح! 🎉` : `Successfully generated ${result.questions.length} questions! 🎉`,
                'success'
            );
        } catch (error) {
            console.error(error);
            App.showToast(
                App.currentLang === 'ar' ? 'حدث خطأ في التوليد. يرجى المحاولة مرة أخرى.' : 'Generation error. Please try again.',
                'error'
            );
        } finally {
            App.hideLoading();
            document.getElementById('generateBtn').disabled = false;
        }
    },

    renderResults(questions, options) {
        const container = document.getElementById('questionsContainer');
        const section = document.getElementById('resultsSection');
        const meta = document.getElementById('resultsMeta');

        const diffLabels = { easy: { ar: 'سهل', en: 'Easy' }, medium: { ar: 'متوسط', en: 'Medium' }, hard: { ar: 'صعب', en: 'Hard' } };
        const typeLabels = { mcq: { ar: 'اختيار متعدد', en: 'MCQ' }, truefalse: { ar: 'صواب/خطأ', en: 'True/False' }, fillblank: { ar: 'أكمل الفراغ', en: 'Fill Blank' }, matching: { ar: 'مطابقة', en: 'Matching' }, shortanswer: { ar: 'إجابة قصيرة', en: 'Short Answer' }, essay: { ar: 'مقالي', en: 'Essay' } };
        const lang = App.currentLang;

        meta.innerHTML = `
            <span class="badge badge-primary">${questions.length} ${lang === 'ar' ? 'سؤال' : 'questions'}</span>
            <span class="badge badge-${options.difficulty === 'easy' ? 'success' : options.difficulty === 'hard' ? 'danger' : 'warning'}">${diffLabels[options.difficulty][lang]}</span>
            <span class="badge badge-info">${typeLabels[options.type][lang]}</span>
        `;

        let html = '';
        questions.forEach((q, i) => {
            html += this.renderQuestionCard(q, i, options.type);
        });

        container.innerHTML = html;
        section.classList.add('show');
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    renderQuestionCard(q, index, type) {
        const letters = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'];
        let body = '';

        if (type === 'mcq' && q.options) {
            body = '<div class="options-list">';
            q.options.forEach((opt, j) => {
                const isCorrect = j === q.correctAnswer;
                body += `
                    <div class="option-item ${isCorrect ? 'correct' : ''}">
                        <span class="option-letter">${letters[j]}</span>
                        <span class="option-text">${opt}</span>
                        ${isCorrect ? '<span style="color:var(--color-secondary)">✓</span>' : ''}
                    </div>`;
            });
            body += '</div>';
        } else if (type === 'truefalse') {
            body = `<div class="tf-answer">
                <div class="tf-option ${q.correctAnswer === true ? 'correct' : ''}">✓ ${App.currentLang === 'ar' ? 'صواب' : 'True'}</div>
                <div class="tf-option ${q.correctAnswer === false ? 'correct' : ''}">✗ ${App.currentLang === 'ar' ? 'خطأ' : 'False'}</div>
            </div>`;
        } else if (type === 'fillblank') {
            body = `<div class="fill-answer">📝 ${App.currentLang === 'ar' ? 'الإجابة' : 'Answer'}: ${q.correctAnswer}</div>`;
        } else if (type === 'matching' && q.pairs) {
            body = '<div class="matching-pairs">';
            q.pairs.forEach(p => {
                body += `<div class="matching-pair">
                    <div class="match-item">${p.left}</div>
                    <span class="match-arrow">⟷</span>
                    <div class="match-item">${p.right}</div>
                </div>`;
            });
            body += '</div>';
        } else if (type === 'shortanswer') {
            body = `<div class="fill-answer">📝 ${App.currentLang === 'ar' ? 'الإجابة' : 'Answer'}: ${q.correctAnswer}</div>`;
        } else if (type === 'essay') {
            body = `<div class="question-explanation"><span class="explanation-icon">📋</span><span>${q.guidelines || q.rubric || ''}</span></div>`;
        }

        const explanation = q.explanation ? `
            <div class="question-explanation">
                <span class="explanation-icon">💡</span>
                <span>${q.explanation}</span>
            </div>` : '';

        return `
            <div class="question-card" id="qcard-${index}" style="animation-delay: ${index * 0.05}s">
                <div class="question-header">
                    <span class="question-num">${index + 1}</span>
                    <div class="question-text">${q.question || (q.instruction || '')}</div>
                    <div class="question-actions">
                        <button class="btn btn-icon btn-ghost" onclick="Generator.editQuestion(${index})" title="${App.currentLang === 'ar' ? 'تعديل' : 'Edit'}">✏️</button>
                        <button class="btn btn-icon btn-ghost" onclick="Generator.deleteQuestion(${index})" title="${App.currentLang === 'ar' ? 'حذف' : 'Delete'}">🗑️</button>
                    </div>
                </div>
                ${body}
                ${explanation}
            </div>`;
    },

    deleteQuestion(index) {
        if (this.generatedQuestions) {
            this.generatedQuestions.splice(index, 1);
            this.renderResults(this.generatedQuestions, this.currentOptions);
            App.showToast(App.currentLang === 'ar' ? 'تم حذف السؤال' : 'Question deleted', 'info');
        }
    },

    editQuestion(index) {
        const q = this.generatedQuestions[index];
        if (!q) return;
        const type = this.currentOptions.type;
        const card = document.getElementById(`qcard-${index}`);
        if (!card) return;
        card.classList.add('editing');
        card.innerHTML = this.renderEditCard(q, index, type);
    },

    renderEditCard(q, index, type) {
        const isAr = App.currentLang === 'ar';
        const letters = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'];
        let body = '';

        // Question text / instruction field
        const questionText = q.question || q.instruction || '';
        const fieldLabel = type === 'matching' ? (isAr ? 'التعليمات' : 'Instructions') : (isAr ? 'نص السؤال' : 'Question Text');

        let html = `
            <div class="question-header">
                <span class="question-num">${index + 1}</span>
                <div style="flex:1">
                    <label class="edit-field-label" style="margin-top:0">${fieldLabel}</label>
                    <textarea class="edit-field" id="editQ-${index}" rows="2">${questionText}</textarea>
                </div>
            </div>`;

        // Type-specific edit fields
        if (type === 'mcq' && q.options) {
            html += `<label class="edit-field-label">${isAr ? 'الخيارات (اختر الإجابة الصحيحة)' : 'Options (select correct answer)'}</label>`;
            html += '<div class="edit-options-list">';
            q.options.forEach((opt, j) => {
                html += `
                    <div class="edit-option-row">
                        <input type="radio" name="editCorrect-${index}" value="${j}" ${j === q.correctAnswer ? 'checked' : ''}>
                        <span class="edit-option-letter">${letters[j]}</span>
                        <input type="text" class="edit-field" id="editOpt-${index}-${j}" value="${this._escapeAttr(opt)}">
                    </div>`;
            });
            html += '</div>';
        } else if (type === 'truefalse') {
            html += `<label class="edit-field-label">${isAr ? 'الإجابة الصحيحة' : 'Correct Answer'}</label>`;
            html += `<div class="edit-tf-selector">
                <div class="edit-tf-option ${q.correctAnswer === true ? 'selected' : ''}" onclick="Generator._selectTF(${index}, true)">✓ ${isAr ? 'صواب' : 'True'}</div>
                <div class="edit-tf-option ${q.correctAnswer === false ? 'selected' : ''}" onclick="Generator._selectTF(${index}, false)">✗ ${isAr ? 'خطأ' : 'False'}</div>
            </div>`;
            html += `<input type="hidden" id="editTF-${index}" value="${q.correctAnswer}">`;
        } else if (type === 'fillblank' || type === 'shortanswer') {
            html += `<label class="edit-field-label">${isAr ? 'الإجابة الصحيحة' : 'Correct Answer'}</label>`;
            html += `<input type="text" class="edit-field" id="editAnswer-${index}" value="${this._escapeAttr(q.correctAnswer || '')}">`;
        } else if (type === 'essay') {
            html += `<label class="edit-field-label">${isAr ? 'إرشادات / معايير التقييم' : 'Guidelines / Rubric'}</label>`;
            html += `<textarea class="edit-field" id="editGuidelines-${index}" rows="3">${q.guidelines || q.rubric || ''}</textarea>`;
        } else if (type === 'matching' && q.pairs) {
            html += `<label class="edit-field-label">${isAr ? 'أزواج المطابقة' : 'Matching Pairs'}</label>`;
            html += '<div class="edit-matching-pairs">';
            q.pairs.forEach((p, j) => {
                html += `
                    <div class="edit-matching-row">
                        <input type="text" class="edit-field" id="editPairL-${index}-${j}" value="${this._escapeAttr(p.left)}">
                        <span class="match-arrow">⟷</span>
                        <input type="text" class="edit-field" id="editPairR-${index}-${j}" value="${this._escapeAttr(p.right)}">
                    </div>`;
            });
            html += '</div>';
        }

        // Explanation field (for non-essay types)
        if (type !== 'essay') {
            html += `<label class="edit-field-label">💡 ${isAr ? 'التفسير (اختياري)' : 'Explanation (optional)'}</label>`;
            html += `<textarea class="edit-field" id="editExpl-${index}" rows="2">${q.explanation || ''}</textarea>`;
        }

        // Action buttons
        html += `
            <div class="edit-actions">
                <button class="btn btn-primary btn-sm" onclick="Generator.saveQuestionEdit(${index})">
                    <span>✓</span> <span>${isAr ? 'حفظ التعديل' : 'Save Edit'}</span>
                </button>
                <button class="btn btn-outline btn-sm" onclick="Generator.cancelQuestionEdit(${index})">
                    <span>${isAr ? 'إلغاء' : 'Cancel'}</span>
                </button>
            </div>`;

        return html;
    },

    _escapeAttr(str) {
        return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    },

    _selectTF(index, value) {
        const hidden = document.getElementById(`editTF-${index}`);
        if (hidden) hidden.value = value;
        const container = hidden?.parentElement;
        if (container) {
            container.querySelectorAll('.edit-tf-option').forEach(opt => opt.classList.remove('selected'));
            const opts = container.querySelectorAll('.edit-tf-option');
            if (value === true && opts[0]) opts[0].classList.add('selected');
            if (value === false && opts[1]) opts[1].classList.add('selected');
        }
    },

    saveQuestionEdit(index) {
        const q = this.generatedQuestions[index];
        if (!q) return;
        const type = this.currentOptions.type;

        // Save question text
        const qField = document.getElementById(`editQ-${index}`);
        if (qField) {
            if (type === 'matching') {
                q.instruction = qField.value.trim();
            } else {
                q.question = qField.value.trim();
            }
        }

        // Save type-specific data
        if (type === 'mcq' && q.options) {
            q.options.forEach((_, j) => {
                const optField = document.getElementById(`editOpt-${index}-${j}`);
                if (optField) q.options[j] = optField.value.trim();
            });
            const checkedRadio = document.querySelector(`input[name="editCorrect-${index}"]:checked`);
            if (checkedRadio) q.correctAnswer = parseInt(checkedRadio.value);
        } else if (type === 'truefalse') {
            const tfField = document.getElementById(`editTF-${index}`);
            if (tfField) q.correctAnswer = tfField.value === 'true';
        } else if (type === 'fillblank' || type === 'shortanswer') {
            const ansField = document.getElementById(`editAnswer-${index}`);
            if (ansField) q.correctAnswer = ansField.value.trim();
        } else if (type === 'essay') {
            const guideField = document.getElementById(`editGuidelines-${index}`);
            if (guideField) {
                q.guidelines = guideField.value.trim();
                q.rubric = guideField.value.trim();
            }
        } else if (type === 'matching' && q.pairs) {
            q.pairs.forEach((_, j) => {
                const lField = document.getElementById(`editPairL-${index}-${j}`);
                const rField = document.getElementById(`editPairR-${index}-${j}`);
                if (lField) q.pairs[j].left = lField.value.trim();
                if (rField) q.pairs[j].right = rField.value.trim();
            });
        }

        // Save explanation
        if (type !== 'essay') {
            const explField = document.getElementById(`editExpl-${index}`);
            if (explField) q.explanation = explField.value.trim();
        }

        // Re-render the single card
        const card = document.getElementById(`qcard-${index}`);
        if (card) {
            card.classList.remove('editing');
            card.outerHTML = this.renderQuestionCard(q, index, type);
        }

        App.showToast(App.currentLang === 'ar' ? 'تم حفظ التعديل ✓' : 'Edit saved ✓', 'success');
    },

    cancelQuestionEdit(index) {
        const q = this.generatedQuestions[index];
        if (!q) return;
        const type = this.currentOptions.type;
        const card = document.getElementById(`qcard-${index}`);
        if (card) {
            card.classList.remove('editing');
            card.outerHTML = this.renderQuestionCard(q, index, type);
        }
    },

    setupSave() {
        const saveBtn = document.getElementById('saveResultsBtn');
        const form = document.getElementById('saveBankForm');
        const confirmBtn = document.getElementById('confirmSaveBtn');
        const cancelBtn = document.getElementById('cancelSaveBtn');

        saveBtn.addEventListener('click', () => {
            form.classList.toggle('show');
            if (form.classList.contains('show')) {
                const suggestedName = this.currentTab === 'topic'
                    ? document.getElementById('topicInput').value
                    : (App.currentLang === 'ar' ? 'بنك أسئلة جديد' : 'New Question Bank');
                document.getElementById('bankNameInput').value = suggestedName;
                document.getElementById('bankNameInput').focus();
            }
        });

        cancelBtn.addEventListener('click', () => form.classList.remove('show'));

        confirmBtn.addEventListener('click', () => {
            const name = document.getElementById('bankNameInput').value.trim();
            if (!name) {
                App.showToast(App.currentLang === 'ar' ? 'يرجى إدخال اسم للبنك' : 'Please enter a bank name', 'warning');
                return;
            }

            const tags = document.getElementById('bankTagsInput').value.split(',').map(t => t.trim()).filter(Boolean);
            const bank = {
                name: name,
                questions: this.generatedQuestions,
                source: this.currentTab,
                sourceDetail: this.currentContent ? this.currentContent.substring(0, 100) : '',
                questionType: this.currentOptions.type,
                difficulty: this.currentOptions.difficulty,
                bloomLevel: this.currentOptions.bloomLevel,
                language: this.currentOptions.language,
                tags: tags
            };

            StorageManager.saveBank(bank);
            StorageManager.updateStats('bankCreated', {
                source: this.currentTab,
                questionsCount: this.generatedQuestions.length,
                topic: this.currentTab === 'topic' ? this.currentContent : '',
                name: name
            });

            form.classList.remove('show');
            App.showToast(App.currentLang === 'ar' ? `تم حفظ "${name}" بنجاح! 🎉` : `"${name}" saved successfully! 🎉`, 'success');
        });
    }
};

document.addEventListener('DOMContentLoaded', () => Generator.init());

