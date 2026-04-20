/* ============================================
   BrainBank OAE - Brand Typewriter Effect
   Professional typing animation for the brand name
   ============================================ */

(function() {
    'use strict';

    const BRAND_TEXT = 'BrainBank OAE';
    const TYPE_SPEED = 100;       // ms per character for brand name
    const SUBTITLE_DELAY = 400;   // ms delay before subtitle appears
    const START_DELAY = 300;      // ms delay before typing starts

    function initBrandTypewriter() {
        const brandNameEls = document.querySelectorAll('.brand-name[data-typewriter]');

        brandNameEls.forEach(el => {
            const text = el.getAttribute('data-typewriter') || BRAND_TEXT;
            el.textContent = '';

            // Create text container
            const textSpan = document.createElement('span');
            textSpan.className = 'typewriter-text';
            el.appendChild(textSpan);

            // Create cursor
            const cursor = document.createElement('span');
            cursor.className = 'typewriter-cursor';
            el.appendChild(cursor);

            // Find the subtitle
            const brandTextContainer = el.closest('.brand-text');
            const subtitle = brandTextContainer ? brandTextContainer.querySelector('.subtitle-typewriter') : null;

            // Start typing
            let charIndex = 0;
            setTimeout(() => {
                const typeInterval = setInterval(() => {
                    if (charIndex < text.length) {
                        textSpan.textContent += text[charIndex];
                        charIndex++;
                    } else {
                        clearInterval(typeInterval);
                        // Show subtitle after typing completes
                        if (subtitle) {
                            setTimeout(() => {
                                subtitle.classList.add('visible');
                            }, SUBTITLE_DELAY);
                        }
                        // Remove cursor after a short delay
                        setTimeout(() => {
                            cursor.style.animation = 'none';
                            cursor.style.opacity = '0';
                            cursor.style.transition = 'opacity 0.5s ease';
                        }, 2500);
                    }
                }, TYPE_SPEED);
            }, START_DELAY);
        });
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBrandTypewriter);
    } else {
        initBrandTypewriter();
    }
})();
