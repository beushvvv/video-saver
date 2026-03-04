class VideoSaver {
    constructor() {
        this.videos = [];
        this.customCategories = [];
        this.currentCategory = 'all';
        this.currentVideo = null;
        this.editingVideoId = null;
        
        this.storageKey = 'videoSaverData';
        this.categoriesKey = 'videoSaverCategories';
        
        // Настройки IndexedDB
        this.dbName = 'VideoSaverDB';
        this.dbVersion = 1;
        this.db = null;
        
        // Заглушки для изображений
        this.defaultThumbnails = {
            youtube: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'320\' height=\'180\' viewBox=\'0 0 320 180\'%3E%3Crect width=\'320\' height=\'180\' fill=\'%23FF0000\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' dominant-baseline=\'middle\' text-anchor=\'middle\' fill=\'%23FFFFFF\' font-size=\'24\' font-family=\'Arial\'%3EYoutube%3C/text%3E%3C/svg%3E',
            tiktok: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'320\' height=\'180\' viewBox=\'0 0 320 180\'%3E%3Crect width=\'320\' height=\'180\' fill=\'%23000000\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' dominant-baseline=\'middle\' text-anchor=\'middle\' fill=\'%23FFFFFF\' font-size=\'24\' font-family=\'Arial\'%3ETikTok%3C/text%3E%3C/svg%3E',
            vk: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'320\' height=\'180\' viewBox=\'0 0 320 180\'%3E%3Crect width=\'320\' height=\'180\' fill=\'%234A76A8\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' dominant-baseline=\'middle\' text-anchor=\'middle\' fill=\'%23FFFFFF\' font-size=\'24\' font-family=\'Arial\'%3EVK%3C/text%3E%3C/svg%3E',
            local: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'320\' height=\'180\' viewBox=\'0 0 320 180\'%3E%3Crect width=\'320\' height=\'180\' fill=\'%234CAF50\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' dominant-baseline=\'middle\' text-anchor=\'middle\' fill=\'%23FFFFFF\' font-size=\'24\' font-family=\'Arial\'%3EЛокальное%3C/text%3E%3C/svg%3E',
            other: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'320\' height=\'180\' viewBox=\'0 0 320 180\'%3E%3Crect width=\'320\' height=\'180\' fill=\'%23666666\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' dominant-baseline=\'middle\' text-anchor=\'middle\' fill=\'%23FFFFFF\' font-size=\'24\' font-family=\'Arial\'%3EVideo%3C/text%3E%3C/svg%3E'
        };
        
        // Флаг для мобильного меню
        this.isMobileMenuOpen = false;
        
        this.init();
    }
    
    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }
    
    async setup() {
        await this.initDB();
        this.loadData();
        this.bindEvents();
        this.render();
        this.setupCategorySelect();
        this.setupMobileMenu();
        this.handleOrientationChange();
        this.setupPullToRefresh();
    }
    
    setupPullToRefresh() {
        let touchStartY = 0;
        const container = document.querySelector('.videos-grid');
        
        if (container) {
            container.addEventListener('touchstart', (e) => {
                touchStartY = e.touches[0].clientY;
            }, { passive: true });
            
            container.addEventListener('touchend', (e) => {
                const touchEndY = e.changedTouches[0].clientY;
                const scrollTop = container.scrollTop;
                
                // Pull-to-refresh если вверху страницы
                if (scrollTop === 0 && touchEndY > touchStartY + 50) {
                    this.refreshData();
                }
            }, { passive: true });
        }
    }
    
    refreshData() {
        // Визуальная индикация обновления
        const grid = document.getElementById('videosGrid');
        grid.style.opacity = '0.5';
        grid.style.transition = 'opacity 0.3s';
        
        this.loadData();
        this.render();
        
        setTimeout(() => {
            grid.style.opacity = '1';
        }, 300);
    }
    
    setupMobileMenu() {
        const toggleBtn = document.getElementById('mobileMenuToggle');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        const closeBtn = document.getElementById('closeSidebar');
        
        if (toggleBtn && sidebar && overlay) {
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleMobileMenu();
            });
            
            overlay.addEventListener('click', () => {
                this.closeMobileMenu();
            });
            
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    this.closeMobileMenu();
                });
            }
            
            // Закрытие свайпом влево
            let touchStartX = 0;
            sidebar.addEventListener('touchstart', (e) => {
                touchStartX = e.touches[0].clientX;
            }, { passive: true });
            
            sidebar.addEventListener('touchend', (e) => {
                const touchEndX = e.changedTouches[0].clientX;
                if (touchEndX < touchStartX - 50) {
                    this.closeMobileMenu();
                }
            }, { passive: true });
        }
    }
    
    toggleMobileMenu() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        
        if (window.innerWidth <= 768) {
            this.isMobileMenuOpen = !this.isMobileMenuOpen;
            
            if (this.isMobileMenuOpen) {
                sidebar.classList.add('active');
                overlay.classList.add('active');
                document.body.style.overflow = 'hidden';
            } else {
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
                document.body.style.overflow = '';
            }
        }
    }
    
    closeMobileMenu() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        
        if (window.innerWidth <= 768) {
            this.isMobileMenuOpen = false;
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    }
    
    handleOrientationChange() {
        window.addEventListener('resize', () => {
            // Закрываем мобильное меню при повороте
            if (window.innerWidth > 768 && this.isMobileMenuOpen) {
                this.closeMobileMenu();
            }
            
            // Перерисовываем для адаптации сетки
            this.render();
        });
    }
    
    initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = (event) => {
                console.error('Ошибка открытия БД:', event);
                reject(event);
            };
            
            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('✅ IndexedDB готова');
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                if (!db.objectStoreNames.contains('videos')) {
                    const store = db.createObjectStore('videos', { keyPath: 'id' });
                    store.createIndex('filename', 'filename', { unique: false });
                    store.createIndex('date', 'uploaded', { unique: false });
                }
            };
        });
    }
    
    loadData() {
        try {
            const savedVideos = localStorage.getItem(this.storageKey);
            this.videos = savedVideos ? JSON.parse(savedVideos) : [];
            
            const savedCategories = localStorage.getItem(this.categoriesKey);
            this.customCategories = savedCategories ? JSON.parse(savedCategories) : [];
            
            if (!Array.isArray(this.videos)) this.videos = [];
            if (!Array.isArray(this.customCategories)) this.customCategories = [];
        } catch (e) {
            console.error('Ошибка загрузки данных:', e);
            this.videos = [];
            this.customCategories = [];
        }
    }
    
    saveData() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.videos));
            localStorage.setItem(this.categoriesKey, JSON.stringify(this.customCategories));
        } catch (e) {
            console.error('Ошибка сохранения данных:', e);
            alert('Не удалось сохранить данные. Освободите место в localStorage.');
        }
    }
    
    setupCategorySelect() {
        const select = document.getElementById('videoCategory');
        if (!select) return;
        
        select.innerHTML = '';
        
        const standardCategories = [
            { value: 'tiktok', text: 'TikTok' },
            { value: 'youtube', text: 'YouTube Shorts' },
            { value: 'vk', text: 'VK Видео' },
            { value: 'edits', text: 'Edit\'ы' },
            { value: 'local', text: 'Мои видео' }
        ];
        
        standardCategories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.value;
            option.textContent = cat.text;
            select.appendChild(option);
        });
        
        this.customCategories.forEach(cat => {
            const option = document.createElement('option');
            option.value = `custom_${cat.id}`;
            option.textContent = cat.name;
            select.appendChild(option);
        });
    }
    
    bindEvents() {
        const addBtn = document.getElementById('addVideoBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.openModal('videoModal'));
            addBtn.addEventListener('touchstart', (e) => {
                e.preventDefault(); // Предотвращаем двойной срабатывание на мобильных
            });
        }
        
        const closeBtn = document.querySelector('.close');
        if (closeBtn) closeBtn.addEventListener('click', () => {
            this.closeModal('videoModal');
            this.resetForm();
        });
        
        const closePlayer = document.querySelector('.close-player');
        if (closePlayer) closePlayer.addEventListener('click', () => {
            this.closeModal('playerModal');
            this.pauseVideo();
        });
        
        const videoForm = document.getElementById('videoForm');
        if (videoForm) {
            videoForm.addEventListener('submit', (e) => {
                e.preventDefault();
                if (this.editingVideoId) {
                    this.updateVideo();
                } else {
                    this.addVideo();
                }
            });
        }
        
        const searchBtn = document.getElementById('searchBtn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.searchVideos());
            searchBtn.addEventListener('touchstart', (e) => e.preventDefault());
        }
        
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') this.searchVideos();
            });
            searchInput.addEventListener('search', () => this.searchVideos()); // Для мобильной клавиатуры
        }
        
        document.querySelectorAll('.sidebar nav ul li').forEach(item => {
            item.addEventListener('click', () => {
                this.setCategory(item.dataset.category);
                if (window.innerWidth <= 768) {
                    this.closeMobileMenu();
                }
            });
            item.addEventListener('touchstart', (e) => e.preventDefault());
        });
        
        const addCategoryBtn = document.getElementById('addCategoryBtn');
        if (addCategoryBtn) addCategoryBtn.addEventListener('click', () => this.addCategory());
        
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeAllModals();
                this.pauseVideo();
                this.resetForm();
            }
        });
        
        // Обработка back button на Android
        window.addEventListener('popstate', () => {
            this.closeAllModals();
            this.closeMobileMenu();
        });
    }
    
    getVideoType(url) {
        if (!url) return 'other';
        if (url.includes('tiktok.com') || url.includes('vt.tiktok.com')) return 'tiktok';
        if (url.includes('youtube.com/shorts/') || url.includes('youtu.be/shorts/') || 
            url.includes('youtube.com/watch') || url.includes('youtu.be')) return 'youtube';
        if (url.includes('vk.com/video')) return 'vk';
        if (url.startsWith('video_')) return 'local';
        return 'other';
    }
    
    extractVKVideoId(url) {
        const patterns = [
            /video(-?\d+)_(\d+)/,
            /clip(-?\d+)_(\d+)/,
            /oid=(-?\d+)&id=(\d+)/
        ];
        for (let pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                return { ownerId: match[1], videoId: match[2] };
            }
        }
        return null;
    }
    
    getYouTubeId(url) {
        const patterns = [
            /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
            /youtu\.be\/([a-zA-Z0-9_-]{11})/,
            /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/
        ];
        for (let pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }
        return null;
    }
    
    generateThumbnail(url, title = '') {
        const type = this.getVideoType(url);
        
        if (type === 'youtube') {
            const videoId = this.getYouTubeId(url);
            if (videoId) {
                return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
            }
        }
        
        return this.defaultThumbnails[type] || this.defaultThumbnails.other;
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Б';
        const k = 1024;
        const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    async uploadVideoFile(file, videoData) {
        return new Promise((resolve, reject) => {
            if (file.size > 50 * 1024 * 1024) {
                reject(new Error('Файл слишком большой. Максимальный размер: 50 МБ'));
                return;
            }
            
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                const videoBlob = e.target.result;
                const videoId = Date.now();
                
                const transaction = this.db.transaction(['videos'], 'readwrite');
                const store = transaction.objectStore('videos');
                
                const videoEntry = {
                    id: videoId,
                    filename: file.name,
                    data: videoBlob,
                    type: file.type || 'video/mp4',
                    size: file.size,
                    uploaded: new Date().toISOString()
                };
                
                const request = store.add(videoEntry);
                
                request.onsuccess = () => {
                    const newVideo = {
                        id: videoId,
                        url: `video_${videoId}`,
                        title: videoData.title || file.name,
                        category: videoData.category || 'local',
                        thumbnail: videoData.thumbnail || this.defaultThumbnails.local,
                        views: 0,
                        date: new Date().toLocaleDateString('ru-RU'),
                        type: 'local',
                        filename: file.name,
                        size: this.formatFileSize(file.size)
                    };
                    
                    this.videos.unshift(newVideo);
                    this.saveData();
                    this.render();
                    
                    resolve(newVideo);
                };
                
                request.onerror = (err) => reject(err);
            };
            
            reader.onerror = (err) => reject(err);
            reader.readAsDataURL(file);
        });
    }
    
    getLocalVideo(videoId) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject('База данных не инициализирована');
                return;
            }
            
            const transaction = this.db.transaction(['videos'], 'readonly');
            const store = transaction.objectStore('videos');
            const request = store.get(videoId);
            
            request.onsuccess = () => {
                if (request.result) {
                    resolve(request.result);
                } else {
                    reject('Видео не найдено');
                }
            };
            
            request.onerror = (err) => reject(err);
        });
    }
    
    async addVideo() {
        const urlInput = document.getElementById('videoUrl');
        const fileInput = document.getElementById('videoFile');
        const titleInput = document.getElementById('videoTitle');
        const categorySelect = document.getElementById('videoCategory');
        const thumbnailInput = document.getElementById('videoThumbnail');
        
        if ((!urlInput || !urlInput.value) && (!fileInput || !fileInput.files.length)) {
            alert('Введите ссылку на видео или выберите файл');
            return;
        }
        
        if (fileInput && fileInput.files.length > 0) {
            const file = fileInput.files[0];
            
            try {
                const videoData = {
                    title: titleInput?.value || file.name,
                    category: categorySelect?.value || 'local',
                    thumbnail: thumbnailInput?.value
                };
                
                await this.uploadVideoFile(file, videoData);
                this.closeModal('videoModal');
                this.resetForm();
                
                // Показываем сообщение об успехе
                this.showToast('Видео успешно загружено!');
            } catch (error) {
                alert('Ошибка при загрузке: ' + error.message);
            }
            return;
        }
        
        const url = urlInput.value;
        const title = titleInput?.value || 'Без названия';
        const category = categorySelect?.value || 'other';
        let thumbnail = thumbnailInput?.value;
        
        if (!thumbnail) {
            thumbnail = this.generateThumbnail(url, title);
        }
        
        const newVideo = {
            id: Date.now(),
            url: url,
            title: title,
            category: category,
            thumbnail: thumbnail,
            views: 0,
            date: new Date().toLocaleDateString('ru-RU'),
            type: this.getVideoType(url)
        };
        
        this.videos.unshift(newVideo);
        this.saveData();
        this.render();
        this.closeModal('videoModal');
        this.resetForm();
        
        this.showToast('Ссылка сохранена!');
    }
    
    showToast(message) {
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background-color: rgba(0,0,0,0.8);
            color: white;
            padding: 12px 24px;
            border-radius: 30px;
            font-size: 14px;
            z-index: 2000;
            animation: fadeInOut 2s ease;
            pointer-events: none;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 2000);
    }
    
    editVideo(videoId) {
        const video = this.videos.find(v => v.id === videoId);
        if (!video) return;
        
        this.editingVideoId = videoId;
        
        const urlInput = document.getElementById('videoUrl');
        const fileInput = document.getElementById('videoFile');
        const titleInput = document.getElementById('videoTitle');
        const categorySelect = document.getElementById('videoCategory');
        const thumbnailInput = document.getElementById('videoThumbnail');
        
        if (urlInput) {
            urlInput.value = video.type === 'local' ? '' : (video.url || '');
            urlInput.disabled = video.type === 'local';
        }
        
        if (fileInput) {
            fileInput.disabled = video.type !== 'local';
        }
        
        if (titleInput) titleInput.value = video.title || '';
        if (categorySelect) categorySelect.value = video.category || 'other';
        if (thumbnailInput) thumbnailInput.value = video.thumbnail || '';
        
        const modalTitle = document.querySelector('#videoModal h2');
        if (modalTitle) modalTitle.textContent = 'Редактировать видео';
        
        const submitBtn = document.querySelector('#videoForm .submit-btn');
        if (submitBtn) submitBtn.textContent = 'Обновить видео';
        
        this.openModal('videoModal');
    }
    
    updateVideo() {
        if (!this.editingVideoId) return;
        
        const titleInput = document.getElementById('videoTitle');
        const categorySelect = document.getElementById('videoCategory');
        const thumbnailInput = document.getElementById('videoThumbnail');
        
        const videoIndex = this.videos.findIndex(v => v.id === this.editingVideoId);
        if (videoIndex === -1) return;
        
        this.videos[videoIndex] = {
            ...this.videos[videoIndex],
            title: titleInput?.value || this.videos[videoIndex].title,
            category: categorySelect?.value || this.videos[videoIndex].category,
            thumbnail: thumbnailInput?.value || this.videos[videoIndex].thumbnail,
        };
        
        this.saveData();
        this.render();
        this.closeModal('videoModal');
        this.resetForm();
        
        this.showToast('Видео обновлено!');
    }
    
    async deleteVideo(videoId) {
        if (confirm('Удалить видео?')) {
            const video = this.videos.find(v => v.id === videoId);
            
            if (video && video.type === 'local' && this.db) {
                try {
                    const transaction = this.db.transaction(['videos'], 'readwrite');
                    const store = transaction.objectStore('videos');
                    store.delete(videoId);
                } catch (error) {
                    console.error('Ошибка при удалении из БД:', error);
                }
            }
            
            this.videos = this.videos.filter(v => v.id !== videoId);
            this.saveData();
            this.render();
            
            this.showToast('Видео удалено');
        }
    }
    
    resetForm() {
        const form = document.getElementById('videoForm');
        if (form) form.reset();
        
        const urlInput = document.getElementById('videoUrl');
        const fileInput = document.getElementById('videoFile');
        
        if (urlInput) urlInput.disabled = false;
        if (fileInput) fileInput.disabled = false;
        
        this.editingVideoId = null;
        
        const modalTitle = document.querySelector('#videoModal h2');
        if (modalTitle) modalTitle.textContent = 'Добавить видео';
        
        const submitBtn = document.querySelector('#videoForm .submit-btn');
        if (submitBtn) submitBtn.textContent = 'Сохранить видео';
    }
    
    addCategory() {
        const categoryName = prompt('Название категории:');
        if (categoryName && categoryName.trim()) {
            const newCategory = {
                id: Date.now(),
                name: categoryName.trim()
            };
            this.customCategories.push(newCategory);
            this.saveData();
            this.renderCategories();
            this.setupCategorySelect();
            
            this.showToast('Категория создана');
        }
    }
    
    deleteCategory(categoryId) {
        if (confirm('Удалить категорию?')) {
            this.customCategories = this.customCategories.filter(c => c.id !== categoryId);
            
            this.videos.forEach(video => {
                if (video.category === `custom_${categoryId}`) {
                    video.category = 'all';
                }
            });
            
            this.saveData();
            this.renderCategories();
            this.setupCategorySelect();
            this.render();
            
            this.showToast('Категория удалена');
        }
    }
    
    setCategory(category) {
        this.currentCategory = category;
        
        document.querySelectorAll('.sidebar nav ul li').forEach(item => {
            item.classList.toggle('active', item.dataset.category === category);
        });
        
        document.querySelectorAll('.custom-category').forEach(cat => {
            cat.classList.remove('active');
        });
        
        this.render();
    }
    
    searchVideos() {
        const searchInput = document.getElementById('searchInput');
        if (!searchInput) return;
        
        const query = searchInput.value.toLowerCase().trim();
        
        if (query) {
            const filtered = this.videos.filter(video => 
                video.title && video.title.toLowerCase().includes(query)
            );
            this.render(filtered);
            
            if (filtered.length === 0) {
                this.showToast('Ничего не найдено');
            }
        } else {
            this.render();
        }
    }
    
    openVideoLink(video) {
        window.open(video.url, '_blank', 'noopener,noreferrer');
    }
    
    async playVideo(video) {
        if (!video) return;
        
        this.currentVideo = video;
        video.views = (video.views || 0) + 1;
        this.saveData();
        
        const playerContainer = document.querySelector('.video-player-container');
        const playerTitle = document.getElementById('playerVideoTitle');
        const viewCount = document.getElementById('viewCount');
        const videoDate = document.getElementById('videoDate');
        const videoFileInfo = document.getElementById('videoFileInfo');
        
        if (!playerContainer) return;
        
        playerContainer.innerHTML = '';
        if (videoFileInfo) videoFileInfo.style.display = 'none';
        
        if (video.type === 'local') {
            try {
                const localVideo = await this.getLocalVideo(video.id);
                
                const videoElement = document.createElement('video');
                videoElement.id = 'videoPlayer';
                videoElement.controls = true;
                videoElement.autoplay = true;
                videoElement.style.width = '100%';
                videoElement.style.maxHeight = '70vh';
                videoElement.setAttribute('playsinline', ''); // Для iOS
                videoElement.setAttribute('webkit-playsinline', '');
                
                const source = document.createElement('source');
                source.src = localVideo.data;
                source.type = localVideo.type || 'video/mp4';
                
                videoElement.appendChild(source);
                videoElement.appendChild(document.createTextNode('Ваш браузер не поддерживает видео.'));
                
                playerContainer.appendChild(videoElement);
                
                if (videoFileInfo) {
                    videoFileInfo.style.display = 'inline';
                    videoFileInfo.innerHTML = `📁 ${video.filename || 'Локальное видео'} (${video.size || 'неизвестно'})`;
                }
                
            } catch (error) {
                console.error('Ошибка загрузки локального видео:', error);
                playerContainer.innerHTML = this.createErrorMessage('Ошибка загрузки видео');
            }
        } else if (video.type === 'youtube') {
            const videoId = this.getYouTubeId(video.url);
            if (videoId) {
                const iframe = document.createElement('iframe');
                iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
                iframe.width = '100%';
                iframe.height = window.innerWidth <= 768 ? '250' : '500';
                iframe.frameBorder = '0';
                iframe.allow = 'autoplay; encrypted-media; fullscreen';
                iframe.allowFullscreen = true;
                playerContainer.appendChild(iframe);
            } else {
                playerContainer.innerHTML = this.createExternalLink(video, 'YouTube', '#FF0000');
            }
        } else {
            const colors = {
                vk: { bg: 'linear-gradient(135deg, #4A76A8, #2A4F7C)', name: 'VK' },
                tiktok: { bg: 'linear-gradient(135deg, #25F4EE, #FE2C55)', name: 'TikTok' },
                other: { bg: 'linear-gradient(135deg, #666666, #333333)', name: 'ссылку' }
            };
            
            const style = colors[video.type] || colors.other;
            playerContainer.innerHTML = this.createExternalLink(video, style.name, style.bg);
        }
        
        if (playerTitle) playerTitle.textContent = video.title || 'Без названия';
        if (viewCount) viewCount.textContent = video.views;
        if (videoDate) videoDate.textContent = video.date || new Date().toLocaleDateString('ru-RU');
        
        this.openModal('playerModal');
    }
    
    createErrorMessage(text) {
        return `
            <div style="text-align: center; padding: 40px 20px; background: #ff4444; color: white; border-radius: 10px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 15px;"></i>
                <p style="font-size: 16px;">${text}</p>
            </div>
        `;
    }
    
    createExternalLink(video, platform, bgColor) {
        return `
            <div style="text-align: center; padding: 30px 15px; background: ${bgColor}; border-radius: 10px;">
                <i class="fab fa-${platform.toLowerCase() === 'vk' ? 'vk' : platform.toLowerCase() === 'tiktok' ? 'tiktok' : 'youtube'}" 
                   style="font-size: 60px; color: white; margin-bottom: 20px;"></i>
                <p style="color: white; font-size: 18px; margin-bottom: 25px;">
                    Открыть в ${platform}
                </p>
                <a href="${this.escapeHtml(video.url)}" target="_blank" rel="noopener noreferrer"
                   style="display: inline-block; padding: 15px 30px; background: white; 
                          text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 16px;
                          box-shadow: 0 4px 15px rgba(0,0,0,0.2); color: #333;">
                    <i class="fas fa-external-link-alt"></i> Открыть
                </a>
            </div>
        `;
    }
    
    pauseVideo() {
        const playerContainer = document.querySelector('.video-player-container');
        if (playerContainer) {
            playerContainer.innerHTML = '';
        }
    }
    
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
    }
    
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }
    
    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
        document.body.style.overflow = '';
    }
    
    renderCategories() {
        const container = document.getElementById('customCategories');
        if (!container) return;
        
        container.innerHTML = '';
        
        this.customCategories.forEach(category => {
            const div = document.createElement('div');
            div.className = `custom-category ${this.currentCategory === `custom_${category.id}` ? 'active' : ''}`;
            div.innerHTML = `
                <span>${this.escapeHtml(category.name)}</span>
                <span class="delete-category" onclick="event.stopPropagation(); videoSaver.deleteCategory(${category.id})">
                    <i class="fas fa-times"></i>
                </span>
            `;
            div.addEventListener('click', (e) => {
                if (!e.target.closest('.delete-category')) {
                    this.setCategory(`custom_${category.id}`);
                    if (window.innerWidth <= 768) {
                        this.closeMobileMenu();
                    }
                }
            });
            container.appendChild(div);
        });
    }
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    render(filteredVideos = null) {
        const grid = document.getElementById('videosGrid');
        if (!grid) return;
        
        const videosToRender = filteredVideos || this.videos.filter(video => {
            if (this.currentCategory === 'all') return true;
            if (this.currentCategory === 'local' && video.type === 'local') return true;
            return video.category === this.currentCategory;
        });
        
        if (videosToRender.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-video"></i>
                    <h3>Здесь пока нет видео</h3>
                    <p>Нажмите "Добавить видео", чтобы сохранить первый прикол!</p>
                </div>
            `;
            return;
        }
        
        grid.innerHTML = videosToRender.map(video => `
            <div class="video-card" data-id="${video.id}">
                <div class="thumbnail">
                    <img src="${this.escapeHtml(video.thumbnail)}" 
                         alt="${this.escapeHtml(video.title)}"
                         loading="lazy"
                         onerror="this.onerror=null; this.src='${this.defaultThumbnails[video.type] || this.defaultThumbnails.other}'">
                    <span class="duration">${video.duration || '00:00'}</span>
                    <div class="video-type-badge ${video.type || 'other'}">
                        ${video.type === 'vk' ? 'VK' : 
                          video.type === 'youtube' ? 'YT' : 
                          video.type === 'tiktok' ? 'TT' : 
                          video.type === 'local' ? '📱' : ''}
                    </div>
                    <div class="video-actions">
                        <button class="edit-video-btn" onclick="event.stopPropagation(); videoSaver.editVideo(${video.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="delete-video-btn" onclick="event.stopPropagation(); videoSaver.deleteVideo(${video.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="video-info">
                    <h3 class="video-title">${this.escapeHtml(video.title)}</h3>
                    <div class="video-meta">
                        <span><i class="fas fa-eye"></i> ${video.views || 0}</span>
                        <span class="video-category">${this.escapeHtml(this.getCategoryName(video.category))}</span>
                    </div>
                    ${video.size ? `<div style="font-size: 11px; color: #999; margin-top: 5px;">
                        <i class="fas fa-hdd"></i> ${video.size}
                    </div>` : ''}
                </div>
            </div>
        `).join('');
        
        grid.querySelectorAll('.video-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.edit-video-btn') || e.target.closest('.delete-video-btn')) {
                    return;
                }
                const video = this.videos.find(v => v.id === parseInt(card.dataset.id));
                if (video) {
                    this.playVideo(video);
                }
            });
            
            // Для мобильных добавляем touch-событие
            card.addEventListener('touchstart', (e) => {
                if (!e.target.closest('.edit-video-btn') && !e.target.closest('.delete-video-btn')) {
                    card.style.transform = 'scale(0.98)';
                }
            }, { passive: true });
            
            card.addEventListener('touchend', (e) => {
                card.style.transform = '';
            }, { passive: true });
        });
    }
    
    getCategoryName(categoryId) {
        if (!categoryId) return 'Все видео';
        if (categoryId === 'tiktok') return 'TikTok';
        if (categoryId === 'youtube') return 'YouTube Shorts';
        if (categoryId === 'edits') return 'Edit\'ы';
        if (categoryId === 'vk') return 'VK Видео';
        if (categoryId === 'local') return 'Мои видео';
        if (categoryId.startsWith('custom_')) {
            const id = parseInt(categoryId.replace('custom_', ''));
            const category = this.customCategories.find(c => c.id === id);
            return category ? category.name : 'Другое';
        }
        return 'Все видео';
    }
}

// Создаем глобальный экземпляр
let videoSaver;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        videoSaver = new VideoSaver();
    });
} else {
    videoSaver = new VideoSaver();
}