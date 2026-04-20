// BrainBank OAE - App Core Utilities
const App = {
    currentLang: 'ar',

    init() {
        this.initNavbar();
        this.initMobileMenu();
        this.initLanguageToggle();
        this.initScrollEffects();
        this.initTooltips();
        this.initLogoZoom();
        this.setActiveNavLink();
        const settings = StorageManager.getSettings();
        this.currentLang = settings.language || 'ar';
        document.documentElement.lang = this.currentLang;
        document.documentElement.dir = this.currentLang === 'ar' ? 'rtl' : 'ltr';
    },

    initNavbar() {
        const navbar = document.querySelector('.navbar');
        if (!navbar) return;
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
    },

    initMobileMenu() {
        const toggle = document.querySelector('.mobile-toggle');
        const nav = document.querySelector('.nav-links');
        if (!toggle || !nav) return;
        toggle.addEventListener('click', () => {
            nav.classList.toggle('active');
            toggle.classList.toggle('active');
        });
        document.addEventListener('click', (e) => {
            if (!nav.contains(e.target) && !toggle.contains(e.target)) {
                nav.classList.remove('active');
                toggle.classList.remove('active');
            }
        });
    },

    initLanguageToggle() {
        const langBtn = document.querySelector('.lang-toggle');
        if (!langBtn) return;
        langBtn.addEventListener('click', () => {
            this.currentLang = this.currentLang === 'ar' ? 'en' : 'ar';
            document.documentElement.lang = this.currentLang;
            document.documentElement.dir = this.currentLang === 'ar' ? 'rtl' : 'ltr';
            StorageManager.saveSettings({ ...StorageManager.getSettings(), language: this.currentLang });
            this.translatePage();
        });
    },

    translatePage() {
        document.querySelectorAll('[data-ar][data-en]').forEach(el => {
            el.textContent = el.getAttribute(`data-${this.currentLang}`);
        });
        document.querySelectorAll('[data-placeholder-ar][data-placeholder-en]').forEach(el => {
            el.placeholder = el.getAttribute(`data-placeholder-${this.currentLang}`);
        });
    },

    initScrollEffects() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, { threshold: 0.1 });
        document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
    },

    setActiveNavLink() {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        document.querySelectorAll('.nav-link').forEach(link => {
            const href = link.getAttribute('href');
            if (href === currentPage || (currentPage === '' && href === 'index.html')) {
                link.classList.add('active');
            }
        });
    },

    initTooltips() {
        document.querySelectorAll('[data-tooltip]').forEach(el => {
            el.addEventListener('mouseenter', (e) => {
                const tip = document.createElement('div');
                tip.className = 'tooltip-popup';
                tip.textContent = el.getAttribute('data-tooltip');
                document.body.appendChild(tip);
                const rect = el.getBoundingClientRect();
                tip.style.top = (rect.top - tip.offsetHeight - 8) + 'px';
                tip.style.left = (rect.left + rect.width / 2 - tip.offsetWidth / 2) + 'px';
                el._tooltip = tip;
            });
            el.addEventListener('mouseleave', () => {
                if (el._tooltip) { el._tooltip.remove(); el._tooltip = null; }
            });
        });
    },

    // Toast notification system
    showToast(message, type = 'success', duration = 3000) {
        const container = document.getElementById('toast-container') || this.createToastContainer();
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        const icons = { success: '✓', error: '✗', warning: '⚠', info: 'ℹ' };
        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || icons.info}</span>
            <span class="toast-msg">${message}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">×</button>
        `;
        container.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('show'));
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        }, duration);
    },

    createToastContainer() {
        const c = document.createElement('div');
        c.id = 'toast-container';
        document.body.appendChild(c);
        return c;
    },

    // Confirmation modal
    showConfirm(title, message, onConfirm, onCancel) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal-box">
                <h3 class="modal-title">${title}</h3>
                <p class="modal-message">${message}</p>
                <div class="modal-actions">
                    <button class="btn btn-outline modal-cancel" data-ar="إلغاء" data-en="Cancel">إلغاء</button>
                    <button class="btn btn-danger modal-confirm" data-ar="تأكيد" data-en="Confirm">تأكيد</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('show'));
        overlay.querySelector('.modal-confirm').addEventListener('click', () => {
            overlay.classList.remove('show');
            setTimeout(() => overlay.remove(), 300);
            if (onConfirm) onConfirm();
        });
        overlay.querySelector('.modal-cancel').addEventListener('click', () => {
            overlay.classList.remove('show');
            setTimeout(() => overlay.remove(), 300);
            if (onCancel) onCancel();
        });
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('show');
                setTimeout(() => overlay.remove(), 300);
                if (onCancel) onCancel();
            }
        });
    },

    // Loading overlay
    showLoading(message = 'جاري التحميل...') {
        const existing = document.getElementById('loading-overlay');
        if (existing) existing.remove();
        const overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-content">
                <div class="brain-loader">
                    <div class="brain-pulse"></div>
                    <svg class="brain-icon" viewBox="0 0 64 64" width="64" height="64">
                        <path d="M32 8C20 8 12 18 12 28c0 8 4 14 10 18v10h20V46c6-4 10-10 10-18C52 18 44 8 32 8z" fill="none" stroke="url(#brainGrad)" stroke-width="2.5"/>
                        <path d="M24 28c0-4 4-8 8-8M22 36h20M28 44h8" fill="none" stroke="url(#brainGrad)" stroke-width="2" stroke-linecap="round"/>
                        <defs><linearGradient id="brainGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#6C63FF"/><stop offset="100%" stop-color="#06D6A0"/></linearGradient></defs>
                    </svg>
                </div>
                <p class="loading-text">${message}</p>
                <div class="loading-dots"><span></span><span></span><span></span></div>
            </div>
        `;
        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('show'));
    },

    updateLoadingText(message) {
        const textEl = document.querySelector('#loading-overlay .loading-text');
        if (textEl) {
            textEl.textContent = message;
        }
    },

    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.remove('show');
            setTimeout(() => overlay.remove(), 300);
        }
    },

    // Counter animation
    initLogoZoom() {
        const logos = document.querySelectorAll('.nav-logo, .footer-logo');
        if (!logos.length) return;

        // Prevent creating multiple lightboxes if init is called twice
        if (document.querySelector('.logo-lightbox')) return;

        // Create lightbox element
        const lightbox = document.createElement('div');
        lightbox.className = 'logo-lightbox';
        lightbox.id = 'global-logo-lightbox'; // Unique ID
        lightbox.innerHTML = `
            <div class="logo-lightbox-close">✕</div>
            <img src="" alt="BrainBank Logo Large">
        `;
        document.body.appendChild(lightbox);

        const lightboxImg = lightbox.querySelector('img');
        const closeBtn = lightbox.querySelector('.logo-lightbox-close');

        const openLightbox = (src) => {
            lightboxImg.src = src;
            lightbox.classList.add('active');
            document.body.style.overflow = 'hidden'; // Prevent scrolling
        };

        const closeLightbox = () => {
            lightbox.classList.remove('active');
            document.body.style.overflow = '';
        };

        logos.forEach(logo => {
            logo.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                openLightbox(logo.src);
            });
        });

        lightbox.addEventListener('click', closeLightbox);
        closeBtn.addEventListener('click', closeLightbox);
        
        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && lightbox.classList.contains('active')) {
                closeLightbox();
            }
        });
    },

    animateCounter(el, target, duration = 2000) {
        let start = 0;
        const step = target / (duration / 16);
        const update = () => {
            start += step;
            if (start >= target) {
                el.textContent = target.toLocaleString();
                return;
            }
            el.textContent = Math.floor(start).toLocaleString();
            requestAnimationFrame(update);
        };
        update();
    },

    // Format date
    formatDate(dateStr) {
        const d = new Date(dateStr);
        return d.toLocaleDateString(this.currentLang === 'ar' ? 'ar-EG' : 'en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    },

    // Debounce
    debounce(fn, delay) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), delay);
        };
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
