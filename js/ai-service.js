// BrainBank OAE - Gemini AI Service
const AIService = {
    MAX_RETRIES: 3,
    BASE_DELAY: 2000, // 2 seconds

    async _callGeminiAPI(body, retryCount = 0) {
        try {
            const response = await fetch(CONFIG.GEMINI_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (response.status === 429) {
                if (retryCount < this.MAX_RETRIES) {
                    const delay = this.BASE_DELAY * Math.pow(2, retryCount); // Exponential backoff
                    const isAr = (typeof App !== 'undefined' && App.currentLang === 'ar');
                    const waitSec = Math.round(delay / 1000);
                    App.showToast(
                        isAr ? `⏳ تم تجاوز حد الاستخدام. إعادة المحاولة بعد ${waitSec} ثانية... (${retryCount + 1}/${this.MAX_RETRIES})`
                              : `⏳ Rate limited. Retrying in ${waitSec}s... (${retryCount + 1}/${this.MAX_RETRIES})`,
                        'warning'
                    );
                    await new Promise(resolve => setTimeout(resolve, delay));
                    return this._callGeminiAPI(body, retryCount + 1);
                } else {
                    const isAr = (typeof App !== 'undefined' && App.currentLang === 'ar');
                    throw new Error(
                        isAr ? 'تم تجاوز حد الاستخدام المجاني لـ Gemini API. يرجى الانتظار دقيقة ثم المحاولة مرة أخرى.'
                             : 'Gemini API free tier rate limit exceeded. Please wait a minute and try again.'
                    );
                }
            }

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            if (error.message.includes('rate limit') || error.message.includes('تجاوز حد')) {
                throw error; // Re-throw rate limit errors as-is
            }
            if (error.name === 'TypeError' && retryCount < 1) {
                // Network error, retry once
                await new Promise(resolve => setTimeout(resolve, 1000));
                return this._callGeminiAPI(body, retryCount + 1);
            }
            throw error;
        }
    },

    async _callGroqAPI(prompt, retryCount = 0) {
        try {
            const response = await fetch(CONFIG.GROQ_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: CONFIG.GROQ_MODEL,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.7,
                    max_tokens: 8192
                })
            });

            if (response.status === 429) {
                if (retryCount < this.MAX_RETRIES) {
                    const delay = this.BASE_DELAY * Math.pow(2, retryCount);
                    const isAr = (typeof App !== 'undefined' && App.currentLang === 'ar');
                    const waitSec = Math.round(delay / 1000);
                    App.showToast(
                        isAr ? `⏳ تم تجاوز حد الاستخدام. إعادة المحاولة بعد ${waitSec} ثانية... (${retryCount + 1}/${this.MAX_RETRIES})`
                              : `⏳ Rate limited. Retrying in ${waitSec}s... (${retryCount + 1}/${this.MAX_RETRIES})`,
                        'warning'
                    );
                    await new Promise(resolve => setTimeout(resolve, delay));
                    return this._callGroqAPI(prompt, retryCount + 1);
                } else {
                    const isAr = (typeof App !== 'undefined' && App.currentLang === 'ar');
                    throw new Error(
                        isAr ? 'تم تجاوز حد الاستخدام لـ Groq API. يرجى الانتظار قليلاً.'
                             : 'Groq API rate limit exceeded. Please wait a bit.'
                    );
                }
            }

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            if (error.message.includes('rate limit') || error.message.includes('تجاوز حد')) {
                throw error;
            }
            if (error.name === 'TypeError' && retryCount < 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                return this._callGroqAPI(prompt, retryCount + 1);
            }
            throw error;
        }
    },

    async generateQuestions(content, options = {}) {
        const {
            type = 'mcq',
            difficulty = 'medium',
            count = 10,
            language = 'ar',
            bloomLevel = 'understanding',
            source = 'text'
        } = options;

        const typeMap = {
            mcq: language === 'ar' ? 'اختيار من متعدد (4 خيارات مع إجابة صحيحة واحدة)' : 'Multiple Choice (4 options with one correct answer)',
            truefalse: language === 'ar' ? 'صواب أو خطأ' : 'True or False',
            fillblank: language === 'ar' ? 'أكمل الفراغ' : 'Fill in the blank',
            matching: language === 'ar' ? 'مطابقة (5 أزواج)' : 'Matching (5 pairs)',
            shortanswer: language === 'ar' ? 'إجابة قصيرة' : 'Short Answer',
            essay: language === 'ar' ? 'مقالي' : 'Essay'
        };

        const diffMap = {
            easy: language === 'ar' ? 'سهل' : 'Easy',
            medium: language === 'ar' ? 'متوسط' : 'Medium',
            hard: language === 'ar' ? 'صعب' : 'Hard'
        };

        const bloomMap = {
            remembering: language === 'ar' ? 'تذكّر' : 'Remembering',
            understanding: language === 'ar' ? 'فهم' : 'Understanding',
            applying: language === 'ar' ? 'تطبيق' : 'Applying',
            analyzing: language === 'ar' ? 'تحليل' : 'Analyzing',
            evaluating: language === 'ar' ? 'تقييم' : 'Evaluating',
            creating: language === 'ar' ? 'إبداع' : 'Creating'
        };

        const questionType = typeMap[type] || typeMap.mcq;
        const diffLevel = diffMap[difficulty] || diffMap.medium;
        const bloom = bloomMap[bloomLevel] || bloomMap.understanding;

        let prompt;
        if (language === 'ar') {
            prompt = `أنت خبير في إنشاء الأسئلة التعليمية. قم بإنشاء ${count} سؤال من نوع "${questionType}" بمستوى صعوبة "${diffLevel}" ومستوى بلوم "${bloom}" بناءً على المحتوى التالي:

---
${content}
---

أرجع النتيجة بصيغة JSON فقط بدون أي نص إضافي، بالتنسيق التالي:`;
        } else {
            prompt = `You are an expert in creating educational questions. Create ${count} questions of type "${questionType}" with difficulty level "${diffLevel}" and Bloom's level "${bloom}" based on the following content:

---
${content}
---

Return ONLY a JSON response with no additional text, in the following format:`;
        }

        if (type === 'mcq') {
            prompt += `
{
  "questions": [
    {
      "id": 1,
      "question": "نص السؤال",
      "options": ["الخيار أ", "الخيار ب", "الخيار ج", "الخيار د"],
      "correctAnswer": 0,
      "explanation": "شرح مختصر للإجابة الصحيحة",
      "difficulty": "${difficulty}",
      "bloom": "${bloomLevel}"
    }
  ]
}`;
        } else if (type === 'truefalse') {
            prompt += `
{
  "questions": [
    {
      "id": 1,
      "question": "نص العبارة",
      "correctAnswer": true,
      "explanation": "شرح مختصر",
      "difficulty": "${difficulty}",
      "bloom": "${bloomLevel}"
    }
  ]
}`;
        } else if (type === 'fillblank') {
            prompt += `
{
  "questions": [
    {
      "id": 1,
      "question": "الجملة مع _____ للفراغ",
      "correctAnswer": "الإجابة الصحيحة",
      "explanation": "شرح مختصر",
      "difficulty": "${difficulty}",
      "bloom": "${bloomLevel}"
    }
  ]
}`;
        } else if (type === 'matching') {
            prompt += `
{
  "questions": [
    {
      "id": 1,
      "pairs": [
        {"left": "العنصر الأيسر", "right": "العنصر الأيمن المطابق"}
      ],
      "instruction": "طابق بين العناصر التالية",
      "difficulty": "${difficulty}",
      "bloom": "${bloomLevel}"
    }
  ]
}`;
        } else if (type === 'shortanswer') {
            prompt += `
{
  "questions": [
    {
      "id": 1,
      "question": "نص السؤال",
      "correctAnswer": "الإجابة المتوقعة",
      "explanation": "شرح مختصر",
      "difficulty": "${difficulty}",
      "bloom": "${bloomLevel}"
    }
  ]
}`;
        } else if (type === 'essay') {
            prompt += `
{
  "questions": [
    {
      "id": 1,
      "question": "نص السؤال المقالي",
      "guidelines": "إرشادات الإجابة والنقاط الرئيسية المتوقعة",
      "rubric": "معايير التقييم",
      "difficulty": "${difficulty}",
      "bloom": "${bloomLevel}"
    }
  ]
}`;
        }

        try {
            const text = await this._callGroqAPI(prompt);

            // Extract JSON from response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('Invalid response format');
            const result = JSON.parse(jsonMatch[0]);
            // Add type to each question
            result.questions = result.questions.map((q, i) => ({
                ...q,
                id: i + 1,
                type: type
            }));
            return result;
        } catch (error) {
            console.error('AI Service Error:', error);
            throw error;
        }
    },

    async generateFromTopic(topic, options = {}) {
        const lang = options.language || 'ar';
        const content = lang === 'ar'
            ? `الموضوع: ${topic}\n\nقم بإنشاء أسئلة شاملة ومتنوعة حول هذا الموضوع تغطي الجوانب الرئيسية والمفاهيم الأساسية والتطبيقات العملية.`
            : `Topic: ${topic}\n\nCreate comprehensive and diverse questions about this topic covering main aspects, core concepts, and practical applications.`;
        return this.generateQuestions(content, options);
    },

    async extractAndGenerate(url, options = {}) {
        const lang = options.language || 'ar';
        const prompt = lang === 'ar'
            ? `قم بزيارة الرابط التالي واستخرج المحتوى الرئيسي منه ثم أنشئ أسئلة بناءً عليه: ${url}`
            : `Visit the following URL, extract the main content, and create questions based on it: ${url}`;
        return this.generateQuestions(prompt, options);
    },

    async generateFromFileBase64(fileBase64, options = {}) {
        const lang = options.language || 'ar';
        const type = options.type || 'mcq';
        const count = options.count || 10;
        const difficulty = options.difficulty || 'medium';
        const bloomLevel = options.bloomLevel || 'understanding';

        // Extract mime type and base64 string
        const [meta, data] = fileBase64.split(',');
        const mime_type = meta.split(':')[1].split(';')[0]; 

        const typeMap = { mcq: lang === 'ar' ? 'اختيار من متعدد' : 'Multiple Choice', truefalse: lang === 'ar' ? 'صواب أو خطأ' : 'True or False', fillblank: lang === 'ar' ? 'أكمل الفراغ' : 'Fill in the blank', matching: lang === 'ar' ? 'مطابقة' : 'Matching', shortanswer: lang === 'ar' ? 'إجابة قصيرة' : 'Short Answer', essay: lang === 'ar' ? 'مقالي' : 'Essay' };
        const diffMap = { easy: lang === 'ar' ? 'سهل' : 'Easy', medium: lang === 'ar' ? 'متوسط' : 'Medium', hard: lang === 'ar' ? 'صعب' : 'Hard' };
        const bloomMap = { remembering: lang === 'ar' ? 'تذكّر' : 'Remembering', understanding: lang === 'ar' ? 'فهم' : 'Understanding', applying: lang === 'ar' ? 'تطبيق' : 'Applying', analyzing: lang === 'ar' ? 'تحليل' : 'Analyzing', evaluating: lang === 'ar' ? 'تقييم' : 'Evaluating', creating: lang === 'ar' ? 'إبداع' : 'Creating' };
        
        const questionType = typeMap[type] || typeMap.mcq;
        const diffLevel = diffMap[difficulty] || diffMap.medium;
        const bloom = bloomMap[bloomLevel] || bloomMap.understanding;

        const prompt = lang === 'ar'
            ? `استخرج النص من هذا الملف المرفق ثم أنشئ ${count} سؤال من نوع "${questionType}" بمستوى صعوبة "${diffLevel}" ومستوى بلوم "${bloom}" بناءً عليه.\n\nيجب أن ترجع النتيجة بصيغة JSON فقط بالتنسيق المعمول به في النظام، محاطة بـ { "questions": [...] } بدون أي نص إضافي.`
            : `Extract the text from this attached file and create ${count} questions of type "${questionType}", difficulty "${diffLevel}", and Bloom "${bloom}".\n\nReturn EXACTLY a JSON format inside { "questions": [...] }. No other text!`;

        try {
            const resultData = await this._callGeminiAPI({
                contents: [{
                    parts: [
                        { text: prompt },
                        { inline_data: { mime_type: mime_type, data: data } }
                    ]
                }],
                generationConfig: { temperature: 0.7, maxOutputTokens: 8192 }
            });

            const text = resultData.candidates[0].content.parts[0].text;
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('Invalid response format');
            const result = JSON.parse(jsonMatch[0]);
            result.questions = result.questions.map((q, i) => ({ ...q, id: i + 1, type }));
            return result;
        } catch (error) {
            console.error('AI File Service Error:', error);
            throw error;
        }
    },

    async generateFromImage(imageBase64, options = {}) {
        const lang = options.language || 'ar';
        const count = options.count || 10;
        const type = options.type || 'mcq';

        const prompt = lang === 'ar'
            ? `استخرج النص من هذه الصورة ثم أنشئ ${count} سؤال بناءً عليه. اتبع نفس تنسيق JSON المحدد.`
            : `Extract the text from this image and create ${count} questions based on it. Follow the same specified JSON format.`;

        try {
            const data = await this._callGeminiAPI({
                contents: [{
                    parts: [
                        { text: prompt },
                        { inline_data: { mime_type: 'image/png', data: imageBase64 } }
                    ]
                }],
                generationConfig: { temperature: 0.7, maxOutputTokens: 8192 }
            });

            const text = data.candidates[0].content.parts[0].text;
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('Invalid response format');
            const result = JSON.parse(jsonMatch[0]);
            result.questions = result.questions.map((q, i) => ({ ...q, id: i + 1, type }));
            return result;
        } catch (error) {
            console.error('AI Image Service Error:', error);
            throw error;
        }
    }
};
