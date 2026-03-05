class MobileVideoSaver {
    constructor() {
        this.videos = [];
        this.customCategories = [];
        this.currentCategory = 'all';
        this.currentVideo = null;
        this.editingVideoId = null;
        this.longPressTimer = null;
        this.selectedVideoId = null;
        
        this.storageKey = 'videoSaverData';
        this.categoriesKey = 'videoSaverCategories';
        this.dbName = 'VideoSaverDB';
        this.db = null;
        
        // Флаг для отслеживания выбранного файла
        this.selectedFile = null;
        
        this.defaultThumbnails = {
            youtube: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'320\' height=\'180\' viewBox=\'0 0 320 180\'%3E%3Crect width=\'320\' height=\'180\' fill=\'%23FF0000\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' fill=\'%23FFFFFF\' font-size=\'24\' text-anchor=\'middle\' dominant-baseline=\'middle\'%3EYoutube%3C/text%3E%3C/svg%3E',
            tiktok: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'320\' height=\'180\' viewBox=\'0 0 320 180\'%3E%3Crect width=\'320\' height=\'180\' fill=\'%23000000\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' fill=\'%23FFFFFF\' font-size=\'24\' text-anchor=\'middle\' dominant-baseline=\'middle\'%3ETikTok%3C/text%3E%3C/svg%3E',
            vk: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'320\' height=\'180\' viewBox=\'0 0 320 180\'%3E%3Crect width=\'320\' height=\'180\' fill=\'%234A76A8\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' fill=\'%23FFFFFF\' font-size=\'24\' text-anchor=\'middle\' dominant-baseline=\'middle\'%3EVK%3C/text%3E%3C/svg%3E',
            local: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'320\' height=\'180\' viewBox=\'0 0 320 180\'%3E%3Crect width=\'320\' height=\'180\' fill=\'%234CAF50\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' fill=\'%23FFFFFF\' font-size=\'24\' text-anchor=\'middle\' dominant-baseline=\'middle\'%3EЛокальное%3C/text%3E%3C/svg%3E',
            other: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'320\' height=\'180\' viewBox=\'0 0 320 180\'%3E%3Crect width=\'320\' height=\'180\' fill=\'%23666666\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' fill=\'%23FFFFFF\' font-size=\'24\' text-anchor=\'middle\' dominant-baseline=\'middle\'%3EVideo%3C/text%3E%3C/svg%3E'
        };
        
        // Привязываем методы
        this.addVideo = this.addVideo.bind(this);
        this.addTikTokVideo = this.addTikTokVideo.bind(this);
        this.enhanceTikTokVideo = this.enhanceTikTokVideo.bind(this);
        this.uploadVideoFile = this.uploadVideoFile.bind(this);
        
        this.init();
    }
    
    async init() {
        await this.initDB();
        this.loadData();
        this.bindEvents();
        this.render();
        this.setupLongPress();
    }
    
    initDB() {
        return new Promise((resolve) => {
            const request = indexedDB.open(this.dbName, 1);
            
            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('✅ IndexedDB подключена');
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('videos')) {
                    db.createObjectStore('videos', { keyPath: 'id' });
                }
            };
            
            request.onerror = () => {
                console.warn('⚠️ IndexedDB не работает');
                resolve();
            };
        });
    }
    
    loadData() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            this.videos = saved ? JSON.parse(saved) : [];
            
            const savedCats = localStorage.getItem(this.categoriesKey);
            this.customCategories = savedCats ? JSON.parse(savedCats) : [];
        } catch (e) {
            this.videos = [];
            this.customCategories = [];
        }
    }
    
    saveData() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.videos));
            localStorage.setItem(this.categoriesKey, JSON.stringify(this.customCategories));
        } catch (e) {
            this.showToast('❌ Ошибка сохранения');
        }
    }
    
    bindEvents() {
        // Нижняя навигация
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                item.classList.add('active');
                this.currentCategory = item.dataset.category;
                this.render();
            });
        });
        
        // Кнопки шапки
        const addBtn = document.getElementById('mobileAddBtn');
        if (addBtn) {
            addBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.openModal('videoModal');
            });
        }
        
        const searchBtn = document.getElementById('mobileSearchBtn');
        if (searchBtn) {
            searchBtn.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('mobileSearchBar').classList.toggle('active');
            });
        }
        
        const closeSearch = document.getElementById('closeSearchBtn');
        if (closeSearch) {
            closeSearch.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('mobileSearchBar').classList.remove('active');
                document.getElementById('mobileSearchInput').value = '';
                this.render();
            });
        }
        
        const searchInput = document.getElementById('mobileSearchInput');
        if (searchInput) {
            searchInput.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') this.searchVideos();
            });
        }
        
        // Категории
        document.querySelectorAll('.category-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                e.preventDefault();
                if (chip.classList.contains('more-categories')) {
                    document.getElementById('categoriesMenu').classList.add('active');
                    this.renderCategories();
                    return;
                }
                document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                this.currentCategory = chip.dataset.category;
                this.render();
            });
        });
        
        // Закрытие модалок
        const closeModalBtn = document.getElementById('closeModalBtn');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeModal('videoModal');
                this.resetForm();
            });
        }
        
        const cancelModalBtn = document.getElementById('cancelModalBtn');
        if (cancelModalBtn) {
            cancelModalBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeModal('videoModal');
                this.resetForm();
            });
        }
        
        const closePlayerBtn = document.getElementById('closePlayerBtn');
        if (closePlayerBtn) {
            closePlayerBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeModal('playerModal');
                this.pauseVideo();
            });
        }
        
        const closeMenuBtn = document.getElementById('closeMenuBtn');
        if (closeMenuBtn) {
            closeMenuBtn.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('categoriesMenu').classList.remove('active');
            });
        }
        
        // Форма добавления видео
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
        
        // Загрузка файла
        const fileInput = document.getElementById('videoFile');
        const uploadArea = document.getElementById('fileUploadArea');
        
        if (fileInput && uploadArea) {
            const container = uploadArea.closest('.form-group');
            if (container) {
                container.style.position = 'relative';
            }
            
            uploadArea.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                fileInput.click();
            });
            
            fileInput.addEventListener('change', (e) => {
                const files = e.target.files;
                if (files && files.length > 0) {
                    this.selectedFile = files[0];
                    
                    uploadArea.innerHTML = `
                        <i class="fas fa-check-circle" style="color: #4CAF50; font-size: 40px;"></i>
                        <p style="font-weight: bold; margin: 5px 0; word-break: break-word;">${this.selectedFile.name}</p>
                        <small>${(this.selectedFile.size / 1024 / 1024).toFixed(2)} МБ</small>
                    `;
                    
                    const titleInput = document.getElementById('videoTitle');
                    if (titleInput && !titleInput.value) {
                        const fileName = this.selectedFile.name.replace(/\.[^/.]+$/, "");
                        titleInput.value = fileName;
                    }
                }
            });
        }
        
        // Добавление категории
        const addCategoryBtn = document.getElementById('addCategoryBtn');
        if (addCategoryBtn) {
            addCategoryBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.addCategory();
            });
        }
        
        // Закрытие по клику на оверлей
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('mobile-modal')) {
                this.closeAllModals();
                this.resetForm();
            }
        });
    }
    
    setupLongPress() {
        const contextMenu = document.getElementById('contextMenu');
        
        document.addEventListener('touchstart', (e) => {
            const card = e.target.closest('.video-card');
            if (!card) return;
            
            this.selectedVideoId = parseInt(card.dataset.id);
            
            this.longPressTimer = setTimeout(() => {
                if (navigator.vibrate) navigator.vibrate(50);
                
                const touch = e.touches[0];
                contextMenu.style.left = touch.clientX + 'px';
                contextMenu.style.top = touch.clientY + 'px';
                contextMenu.classList.add('active');
            }, 500);
        }, { passive: true });
        
        document.addEventListener('touchend', () => {
            clearTimeout(this.longPressTimer);
        });
        
        document.addEventListener('touchmove', () => {
            clearTimeout(this.longPressTimer);
        });
        
        const contextEdit = document.getElementById('contextEdit');
        if (contextEdit) {
            contextEdit.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.selectedVideoId) {
                    this.editVideo(this.selectedVideoId);
                    contextMenu.classList.remove('active');
                }
            });
        }
        
        const contextDelete = document.getElementById('contextDelete');
        if (contextDelete) {
            contextDelete.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.selectedVideoId) {
                    this.deleteVideo(this.selectedVideoId);
                    contextMenu.classList.remove('active');
                }
            });
        }
        
        document.addEventListener('click', () => {
            contextMenu.classList.remove('active');
        });
    }
    
    getVideoType(url) {
        if (!url) return 'other';
        if (url.includes('tiktok.com') || url.includes('vt.tiktok.com')) return 'tiktok';
        if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
        if (url.includes('vk.com/video')) return 'vk';
        if (url.startsWith('video_')) return 'local';
        return 'other';
    }
    
    getYouTubeId(url) {
        const match = url.match(/(?:youtube\.com\/(?:shorts\/|watch\?v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        return match ? match[1] : null;
    }
    
    /**
     * Пытается получить данные TikTok (может не сработать)
     */
    async fetchTikTokData(url) {
        const apis = [
            `https://api.tikwm.com/video/info?url=${encodeURIComponent(url)}`,
            `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`
        ];
        
        for (const apiUrl of apis) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000);
                
                const response = await fetch(apiUrl, { signal: controller.signal });
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    const data = await response.json();
                    
                    if (data.data) {
                        return {
                            title: data.data.title,
                            thumbnail: data.data.origin_cover || data.data.cover,
                            author: data.data.author?.unique_id
                        };
                    }
                    
                    if (data.title) {
                        return {
                            title: data.title,
                            thumbnail: data.thumbnail_url,
                            author: data.author_name
                        };
                    }
                }
            } catch (error) {
                console.log(`⚠️ API ${apiUrl} не ответил:`, error.message);
                continue;
            }
        }
        
        return null;
    }
    
    /**
     * Добавление TikTok видео (СРАЗУ сохраняет, потом улучшает)
     */
    async addTikTokVideo(url, formData) {
        // 1. СОХРАНЯЕМ СРАЗУ с базовыми данными
        const videoId = Date.now();
        const newVideo = {
            id: videoId,
            url: url,
            title: formData.title || 'TikTok Video',
            category: formData.category || 'tiktok',
            thumbnail: formData.thumbnail || this.defaultThumbnails.tiktok,
            views: 0,
            date: new Date().toLocaleDateString('ru-RU'),
            type: 'tiktok',
            author: null,
            enhanced: false
        };
        
        this.videos.unshift(newVideo);
        this.saveData();
        this.render();
        this.showToast('✅ Видео сохранено');
        this.closeModal('videoModal');
        this.resetForm();
        
        // 2. В ФОНЕ пытаемся улучшить данные
        this.enhanceTikTokVideo(videoId, url, formData);
        
        return newVideo;
    }
    
    /**
     * Улучшение данных TikTok (фоновая задача)
     */
    async enhanceTikTokVideo(videoId, url, formData) {
        this.showToast('⏳ Загружаем данные TikTok...', 2000);
        
        const tikTokData = await this.fetchTikTokData(url);
        
        if (tikTokData) {
            const index = this.videos.findIndex(v => v.id === videoId);
            if (index !== -1) {
                this.videos[index] = {
                    ...this.videos[index],
                    title: formData.title || tikTokData.title || this.videos[index].title,
                    thumbnail: tikTokData.thumbnail || this.videos[index].thumbnail,
                    author: tikTokData.author,
                    enhanced: true
                };
                this.saveData();
                this.render();
                this.showToast('✨ Данные TikTok обновлены');
            }
        } else {
            const index = this.videos.findIndex(v => v.id === videoId);
            if (index !== -1) {
                this.videos[index].enhanced = true;
                this.saveData();
            }
            this.showToast('ℹ️ Видео сохранено, данные TikTok недоступны');
        }
    }
    
    /**
     * НОВЫЙ МЕТОД: Открытие TikTok ссылки в приложении
     */
    openTikTokApp(url) {
        // Пробуем разные схемы для открытия в приложении
        const appSchemes = [
            `tiktok://video/${this.extractTikTokVideoId(url)}`,  // Для прямых ссылок на видео
            `tiktok://` // Просто открыть приложение
        ];
        
        // Пробуем открыть через схему приложения
        const appUrl = appSchemes[0];
        
        // Создаем скрытую ссылку для открытия приложения
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = appUrl;
        document.body.appendChild(iframe);
        
        // Если приложение не открылось через 500ms, открываем в браузере
        setTimeout(() => {
            document.body.removeChild(iframe);
            window.open(url, '_blank', 'noopener,noreferrer');
        }, 500);
    }
    
    /**
     * Вспомогательный метод для извлечения ID видео из TikTok ссылки
     */
    extractTikTokVideoId(url) {
        // Пробуем извлечь ID из разных форматов ссылок
        const patterns = [
            /video\/(\d+)/,
            /\/t\/(\w+)/,
            /\/@[\w.]+\/video\/(\d+)/
        ];
        
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }
        
        return null;
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
                this.showToast('❌ Файл больше 50 МБ');
                reject('Файл слишком большой');
                return;
            }
            
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const videoId = Date.now();
                
                if (this.db) {
                    try {
                        const transaction = this.db.transaction(['videos'], 'readwrite');
                        const store = transaction.objectStore('videos');
                        store.add({
                            id: videoId,
                            filename: file.name,
                            data: e.target.result,
                            type: file.type,
                            size: file.size
                        });
                    } catch (err) {
                        console.warn('Ошибка IndexedDB:', err);
                    }
                }
                
                const newVideo = {
                    id: videoId,
                    url: `video_${videoId}`,
                    title: videoData.title || file.name.replace(/\.[^/.]+$/, ""),
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
                this.showToast('✅ Видео загружено');
                resolve();
            };
            
            reader.onerror = () => {
                this.showToast('❌ Ошибка чтения файла');
                reject();
            };
            
            reader.readAsDataURL(file);
        });
    }
    
    async addVideo() {
        const urlInput = document.getElementById('videoUrl');
        const titleInput = document.getElementById('videoTitle');
        const categorySelect = document.getElementById('videoCategory');
        const thumbnailInput = document.getElementById('videoThumbnail');
        
        const url = urlInput ? urlInput.value.trim() : '';
        const title = titleInput ? titleInput.value.trim() : '';
        const category = categorySelect ? categorySelect.value : 'other';
        const thumbnail = thumbnailInput ? thumbnailInput.value.trim() : '';
        
        const hasFile = this.selectedFile !== null;
        
        if (!url && !hasFile) {
            this.showToast('❌ Введите ссылку или выберите файл');
            return;
        }
        
        if (hasFile) {
            try {
                const videoData = {
                    title: title || this.selectedFile.name.replace(/\.[^/.]+$/, ""),
                    category: category,
                    thumbnail: thumbnail
                };
                
                await this.uploadVideoFile(this.selectedFile, videoData);
                this.selectedFile = null;
            } catch (error) {
                console.error('Ошибка загрузки:', error);
            }
            return;
        }
        
        if (url) {
            const videoType = this.getVideoType(url);
            
            if (videoType === 'tiktok') {
                const formData = { title, category, thumbnail };
                await this.addTikTokVideo(url, formData);
            } else if (videoType === 'youtube') {
                const videoId = this.getYouTubeId(url);
                const newVideo = {
                    id: Date.now(),
                    url: url,
                    title: title || 'YouTube Video',
                    category: category,
                    thumbnail: thumbnail || (videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : this.defaultThumbnails.youtube),
                    views: 0,
                    date: new Date().toLocaleDateString('ru-RU'),
                    type: 'youtube'
                };
                
                this.videos.unshift(newVideo);
                this.saveData();
                this.render();
                this.showToast('✅ YouTube видео сохранено');
                this.closeModal('videoModal');
                this.resetForm();
            } else {
                const newVideo = {
                    id: Date.now(),
                    url: url,
                    title: title || 'Видео',
                    category: category,
                    thumbnail: thumbnail || this.defaultThumbnails.other,
                    views: 0,
                    date: new Date().toLocaleDateString('ru-RU'),
                    type: videoType
                };
                
                this.videos.unshift(newVideo);
                this.saveData();
                this.render();
                this.showToast('✅ Ссылка сохранена');
                this.closeModal('videoModal');
                this.resetForm();
            }
        }
    }
    
    editVideo(videoId) {
        const video = this.videos.find(v => v.id === videoId);
        if (!video) return;
        
        this.editingVideoId = videoId;
        
        const urlInput = document.getElementById('videoUrl');
        const titleInput = document.getElementById('videoTitle');
        const categorySelect = document.getElementById('videoCategory');
        const thumbnailInput = document.getElementById('videoThumbnail');
        
        if (urlInput) {
            urlInput.value = video.type === 'local' ? '' : video.url;
            urlInput.disabled = video.type === 'local';
        }
        if (titleInput) titleInput.value = video.title;
        if (categorySelect) categorySelect.value = video.category;
        if (thumbnailInput) thumbnailInput.value = video.thumbnail || '';
        
        const modalTitle = document.getElementById('modalTitle');
        if (modalTitle) modalTitle.textContent = 'Редактировать';
        
        const saveBtn = document.getElementById('saveVideoBtn');
        if (saveBtn) saveBtn.textContent = 'Обновить';
        
        this.openModal('videoModal');
    }
    
    updateVideo() {
        if (!this.editingVideoId) return;
        
        const index = this.videos.findIndex(v => v.id === this.editingVideoId);
        if (index === -1) return;
        
        const titleInput = document.getElementById('videoTitle');
        const categorySelect = document.getElementById('videoCategory');
        const thumbnailInput = document.getElementById('videoThumbnail');
        
        this.videos[index] = {
            ...this.videos[index],
            title: titleInput ? titleInput.value : this.videos[index].title,
            category: categorySelect ? categorySelect.value : this.videos[index].category,
            thumbnail: thumbnailInput ? thumbnailInput.value || this.videos[index].thumbnail : this.videos[index].thumbnail
        };
        
        this.saveData();
        this.render();
        this.closeModal('videoModal');
        this.resetForm();
        this.showToast('✅ Обновлено');
    }
    
    deleteVideo(videoId) {
        if (confirm('Удалить видео?')) {
            this.videos = this.videos.filter(v => v.id !== videoId);
            this.saveData();
            this.render();
            this.showToast('✅ Видео удалено');
        }
    }
    
    searchVideos() {
        const input = document.getElementById('mobileSearchInput');
        if (!input) return;
        
        const query = input.value.toLowerCase().trim();
        if (!query) {
            this.render();
            return;
        }
        
        const filtered = this.videos.filter(v => 
            v.title.toLowerCase().includes(query)
        );
        this.render(filtered);
        
        if (filtered.length === 0) {
            this.showToast('😕 Ничего не найдено');
        }
    }
    
    async playVideo(video) {
        if (!video) return;
        
        this.currentVideo = video;
        video.views++;
        this.saveData();
        
        const container = document.getElementById('videoPlayerContainer');
        const titleEl = document.getElementById('playerVideoTitle');
        const viewsEl = document.getElementById('viewCount');
        const dateEl = document.getElementById('videoDate');
        
        if (container) container.innerHTML = '';
        if (titleEl) titleEl.textContent = video.title;
        if (viewsEl) viewsEl.textContent = video.views;
        if (dateEl) dateEl.textContent = video.date;
        
        if (video.type === 'tiktok') {
            // Для TikTok показываем кнопку открытия в приложении
            container.innerHTML = `
                <div style="text-align: center; padding: 30px; background: linear-gradient(135deg, #25F4EE, #FE2C55); border-radius: 10px; margin: 10px;">
                    <i class="fab fa-tiktok" style="font-size: 60px; color: white; margin-bottom: 20px;"></i>
                    <p style="color: white; font-size: 18px; margin-bottom: 25px;">
                        Открыть видео в приложении TikTok
                    </p>
                    <button onclick="mobileVideoSaver.openTikTokApp('${this.escapeHtml(video.url)}')"
                            style="display: block; width: 100%; padding: 16px; background: white; 
                                   border: none; border-radius: 30px; font-weight: bold; font-size: 16px;
                                   color: #000; margin-bottom: 10px; cursor: pointer;">
                        <i class="fab fa-tiktok"></i> Открыть в приложении
                    </button>
                    <a href="${this.escapeHtml(video.url)}" target="_blank" rel="noopener noreferrer"
                       style="display: block; width: 100%; padding: 16px; background: rgba(255,255,255,0.2); 
                              border: 1px solid white; border-radius: 30px; font-weight: bold; font-size: 16px;
                              color: white; text-decoration: none; text-align: center;">
                        <i class="fas fa-globe"></i> Открыть в браузере
                    </a>
                </div>
            `;
        } else if (video.type === 'youtube') {
            const videoId = this.getYouTubeId(video.url);
            if (videoId) {
                const iframe = document.createElement('iframe');
                iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
                iframe.allow = 'autoplay; encrypted-media; fullscreen';
                iframe.allowFullscreen = true;
                iframe.style.width = '100%';
                iframe.style.height = '250px';
                container.appendChild(iframe);
            }
        } else if (video.type === 'vk') {
            const vkMatch = video.url.match(/video(-?\d+)_(\d+)/);
            if (vkMatch) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 30px; background: linear-gradient(135deg, #4A76A8, #2A4F7C); border-radius: 10px; margin: 10px;">
                        <i class="fab fa-vk" style="font-size: 60px; color: white; margin-bottom: 20px;"></i>
                        <p style="color: white; font-size: 18px; margin-bottom: 25px;">
                            Открыть видео в VK
                        </p>
                        <a href="${this.escapeHtml(video.url)}" target="_blank"
                           style="display: block; width: 100%; padding: 16px; background: white; 
                                  border: none; border-radius: 30px; font-weight: bold; font-size: 16px;
                                  color: #4A76A8; text-decoration: none; text-align: center;">
                            <i class="fab fa-vk"></i> Открыть VK
                        </a>
                    </div>
                `;
            }
        } else if (video.type === 'local') {
            if (this.db) {
                try {
                    const transaction = this.db.transaction(['videos'], 'readonly');
                    const store = transaction.objectStore('videos');
                    const request = store.get(video.id);
                    
                    request.onsuccess = () => {
                        if (request.result) {
                            const videoEl = document.createElement('video');
                            videoEl.controls = true;
                            videoEl.autoplay = true;
                            videoEl.playsInline = true;
                            videoEl.style.width = '100%';
                            videoEl.style.maxHeight = '50vh';
                            videoEl.src = request.result.data;
                            container.appendChild(videoEl);
                        } else {
                            container.innerHTML = '<p style="color:white; padding:20px;">❌ Видео не найдено</p>';
                        }
                    };
                } catch (err) {
                    container.innerHTML = '<p style="color:white; padding:20px;">❌ Ошибка загрузки</p>';
                }
            }
        } else {
            container.innerHTML = `
                <div style="text-align: center; padding: 30px; background: linear-gradient(135deg, #666666, #333333); border-radius: 10px; margin: 10px;">
                    <i class="fas fa-external-link-alt" style="font-size: 60px; color: white; margin-bottom: 20px;"></i>
                    <p style="color: white; font-size: 18px; margin-bottom: 25px;">
                        Открыть видео
                    </p>
                    <a href="${this.escapeHtml(video.url)}" target="_blank"
                       style="display: block; width: 100%; padding: 16px; background: white; 
                              border: none; border-radius: 30px; font-weight: bold; font-size: 16px;
                              color: #333; text-decoration: none; text-align: center;">
                        <i class="fas fa-external-link-alt"></i> Открыть ссылку
                    </a>
                </div>
            `;
        }
        
        this.openModal('playerModal');
    }
    
    pauseVideo() {
        const container = document.getElementById('videoPlayerContainer');
        if (container) container.innerHTML = '';
    }
    
    addCategory() {
        const name = prompt('Название категории:');
        if (name && name.trim()) {
            this.customCategories.push({
                id: Date.now(),
                name: name.trim()
            });
            this.saveData();
            this.renderCategories();
            this.setupCategorySelect();
            this.showToast('✅ Категория создана');
        }
    }
    
    deleteCategory(id) {
        if (confirm('Удалить категорию?')) {
            this.customCategories = this.customCategories.filter(c => c.id !== id);
            this.videos.forEach(v => {
                if (v.category === `custom_${id}`) v.category = 'all';
            });
            this.saveData();
            this.renderCategories();
            this.render();
            this.showToast('✅ Категория удалена');
        }
    }
    
    renderCategories() {
        const list = document.getElementById('customCategoriesList');
        if (!list) return;
        
        list.innerHTML = this.customCategories.map(cat => `
            <div class="menu-category-item" data-category="custom_${cat.id}">
                <span>${cat.name}</span>
                <span onclick="event.stopPropagation(); mobileVideoSaver.deleteCategory(${cat.id})">
                    <i class="fas fa-times" style="color: #999; padding:10px;"></i>
                </span>
            </div>
        `).join('');
        
        document.querySelectorAll('.menu-category-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.fa-times')) {
                    this.currentCategory = item.dataset.category;
                    document.getElementById('categoriesMenu').classList.remove('active');
                    
                    document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
                    
                    this.render();
                }
            });
        });
    }
    
    setupCategorySelect() {
        const select = document.getElementById('mobileVideoCategory');
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
    
    render(filtered = null) {
        const grid = document.getElementById('mobileVideosGrid');
        if (!grid) return;
        
        const videos = filtered || this.videos.filter(v => {
            if (this.currentCategory === 'all') return true;
            if (this.currentCategory === 'local') return v.type === 'local';
            return v.category === this.currentCategory;
        });
        
        if (!videos.length) {
            grid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-video"></i>
                    <h3>Здесь пока пусто</h3>
                    <p>Нажмите + чтобы добавить видео</p>
                </div>
            `;
            return;
        }
        
        grid.innerHTML = videos.map(v => {
            const authorHtml = v.author ? `<span>👤 ${v.author}</span>` : '';
            const enhancedIcon = v.enhanced ? '' : ' ⏳';
            
            return `
            <div class="video-card" data-id="${v.id}">
                <img src="${v.thumbnail}" loading="lazy" onerror="this.src='${this.defaultThumbnails[v.type] || this.defaultThumbnails.other}'">
                <div class="video-badge ${v.type}">
                    ${v.type === 'vk' ? 'VK' : 
                      v.type === 'youtube' ? 'YT' : 
                      v.type === 'tiktok' ? '🎵' : 
                      v.type === 'local' ? '💾' : ''}
                    ${enhancedIcon}
                </div>
                <div class="video-overlay">
                    <div class="video-title">${v.title}</div>
                    <div class="video-meta">
                        <span><i class="fas fa-eye"></i> ${v.views}</span>
                        <span>${v.date}</span>
                    </div>
                    ${authorHtml ? `<div style="font-size:10px; opacity:0.8; margin-top:2px;">${authorHtml}</div>` : ''}
                </div>
            </div>
        `}).join('');
        
        document.querySelectorAll('.video-card').forEach(card => {
            card.addEventListener('click', (e) => {
                e.preventDefault();
                const video = this.videos.find(v => v.id === parseInt(card.dataset.id));
                if (video) this.playVideo(video);
            });
        });
    }
    
    openModal(id) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
    }
    
    closeModal(id) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }
    
    closeAllModals() {
        document.querySelectorAll('.mobile-modal').forEach(m => m.style.display = 'none');
        document.body.style.overflow = '';
    }
    
    resetForm() {
        const form = document.getElementById('videoForm');
        if (form) form.reset();
        
        this.selectedFile = null;
        
        const urlInput = document.getElementById('videoUrl');
        if (urlInput) urlInput.disabled = false;
        
        this.editingVideoId = null;
        
        const modalTitle = document.getElementById('modalTitle');
        if (modalTitle) modalTitle.textContent = 'Добавить видео';
        
        const saveBtn = document.getElementById('saveVideoBtn');
        if (saveBtn) saveBtn.textContent = 'Сохранить';
        
        const uploadArea = document.getElementById('fileUploadArea');
        if (uploadArea) {
            uploadArea.innerHTML = `
                <i class="fas fa-cloud-upload-alt"></i>
                <p>Нажмите для выбора файла</p>
                <small>MP4, 3GP, MOV до 50 МБ</small>
            `;
        }
    }
    
    showToast(text, duration = 2000) {
        const toast = document.createElement('div');
        toast.className = 'mobile-toast';
        toast.textContent = text;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), duration);
        return toast;
    }
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Создаем глобальный экземпляр
let mobileVideoSaver;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        mobileVideoSaver = new MobileVideoSaver();
    });
} else {
    mobileVideoSaver = new MobileVideoSaver();
}