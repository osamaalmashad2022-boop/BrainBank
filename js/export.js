// BrainBank OAE - Export Utilities
const ExportManager = {
    exportAsJSON(bank) {
        const data = JSON.stringify(bank, null, 2);
        const safeName = (bank.name || 'bank').replace(/[<>:"/\\|?*\n\r]/g, '_').trim();
        this.download(data, `${safeName}.json`, 'application/json');
        App.showToast(App.currentLang === 'ar' ? 'تم تصدير JSON بنجاح' : 'JSON exported successfully', 'success');
    },

    exportAsCSV(bank) {
        if (!bank.questions || !bank.questions.length) return;
        let csv = '\uFEFF'; // BOM for Arabic support
        const type = bank.questions[0].type || bank.questionType;

        if (type === 'mcq') {
            csv += 'رقم,السؤال,الخيار أ,الخيار ب,الخيار ج,الخيار د,الإجابة الصحيحة,الشرح\n';
            bank.questions.forEach((q, i) => {
                const opts = q.options || ['', '', '', ''];
                const correct = opts[q.correctAnswer] || '';
                csv += `${i + 1},"${(q.question || '').replace(/"/g, '""')}","${opts[0] || ''}","${opts[1] || ''}","${opts[2] || ''}","${opts[3] || ''}","${correct}","${(q.explanation || '').replace(/"/g, '""')}"\n`;
            });
        } else if (type === 'truefalse') {
            csv += 'رقم,العبارة,الإجابة,الشرح\n';
            bank.questions.forEach((q, i) => {
                csv += `${i + 1},"${(q.question || '').replace(/"/g, '""')}","${q.correctAnswer ? 'صواب' : 'خطأ'}","${(q.explanation || '').replace(/"/g, '""')}"\n`;
            });
        } else {
            csv += 'رقم,السؤال,الإجابة,الشرح\n';
            bank.questions.forEach((q, i) => {
                csv += `${i + 1},"${(q.question || q.instruction || '').replace(/"/g, '""')}","${(q.correctAnswer || q.guidelines || '').replace(/"/g, '""')}","${(q.explanation || '').replace(/"/g, '""')}"\n`;
            });
        }

        const safeName = (bank.name || 'bank').replace(/[<>:"/\\|?*\n\r]/g, '_').trim();
        this.download(csv, `${safeName}.csv`, 'text/csv;charset=utf-8');
        App.showToast(App.currentLang === 'ar' ? 'تم تصدير CSV بنجاح' : 'CSV exported successfully', 'success');
    },

    exportAsPrintHTML(bank) {
        const type = bank.questions[0]?.type || bank.questionType;
        const letters = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'];
        let questionsHTML = '';

        bank.questions.forEach((q, i) => {
            let answerHTML = '';
            if (type === 'mcq' && q.options) {
                answerHTML = '<div class="options">' + q.options.map((opt, j) =>
                    `<div class="option ${j === q.correctAnswer ? 'correct' : ''}">${letters[j]}) ${opt}</div>`
                ).join('') + '</div>';
            } else if (type === 'truefalse') {
                answerHTML = `<div class="answer">الإجابة: ${q.correctAnswer ? 'صواب ✓' : 'خطأ ✗'}</div>`;
            } else if (type === 'matching' && q.pairs) {
                answerHTML = '<table class="matching"><tr><th>العمود الأول</th><th>العمود الثاني</th></tr>' +
                    q.pairs.map(p => `<tr><td>${p.left}</td><td>${p.right}</td></tr>`).join('') + '</table>';
            } else {
                answerHTML = `<div class="answer">الإجابة: ${q.correctAnswer || q.guidelines || ''}</div>`;
            }

            questionsHTML += `
                <div class="question">
                    <div class="q-header"><span class="q-num">${i + 1}</span><span class="q-text">${q.question || q.instruction || ''}</span></div>
                    ${answerHTML}
                    ${q.explanation ? `<div class="explanation">💡 ${q.explanation}</div>` : ''}
                </div>`;
        });

        const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>${bank.name}</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
            *{margin:0;padding:0;box-sizing:border-box}
            body{font-family:'Cairo',sans-serif;padding:40px;color:#1a1a2e;line-height:1.8;background:#fff}
            .header{text-align:center;margin-bottom:40px;padding-bottom:20px;border-bottom:3px solid #6C63FF}
            .header h1{font-size:1.8rem;color:#6C63FF;margin-bottom:4px}
            .header .meta{color:#666;font-size:0.85rem}
            .question{margin-bottom:24px;padding:20px;border:1px solid #e0e0e0;border-radius:12px;page-break-inside:avoid}
            .q-header{display:flex;gap:12px;align-items:flex-start;margin-bottom:12px}
            .q-num{width:32px;height:32px;min-width:32px;border-radius:50%;background:#6C63FF;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.85rem}
            .q-text{font-weight:600;font-size:1rem}
            .options{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}
            .option{padding:8px 14px;border:1px solid #e0e0e0;border-radius:8px;font-size:0.9rem}
            .option.correct{background:#e8faf3;border-color:#06D6A0;font-weight:600}
            .answer{padding:8px 14px;background:#e8faf3;border-radius:8px;font-weight:600;color:#05B384;margin-top:8px}
            .matching{width:100%;border-collapse:collapse;margin-top:8px}
            .matching th,.matching td{border:1px solid #e0e0e0;padding:8px 14px;text-align:center}
            .matching th{background:#f5f5ff;font-weight:600}
            .explanation{margin-top:8px;padding:8px 14px;background:#eff6ff;border-radius:8px;font-size:0.85rem;color:#3B82F6}
            @media print{body{padding:20px}.question{border:1px solid #ccc}}
        </style></head><body>
        <div class="header">
            <h1>🧠 ${bank.name}</h1>
            <div class="meta">${bank.questions.length} سؤال | ${App.formatDate(bank.createdAt || new Date().toISOString())} | BrainBank OAE</div>
        </div>
        ${questionsHTML}
        </body></html>`;

        const win = window.open('', '_blank');
        win.document.write(html);
        win.document.close();
        setTimeout(() => win.print(), 500);
    },

    download(content, filename, type) {
        // Use Data URI instead of Blob to fix file:// scheme ignoring the "download" attribute
        const isBase64 = type === 'application/json' || type === 'text/csv;charset=utf-8';
        const dataUri = `data:${type},${encodeURIComponent(content)}`;
        
        const a = document.createElement('a');
        a.href = dataUri;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
};
