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
        
        // Флаг для отслеживания выбранного файла
        this.selectedFile = null;
        
        // Заглушки для изображений
        this.defaultThumbnails = {
            youtube: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'320\' height=\'180\' viewBox=\'0 0 320 180\'%3E%3Crect width=\'320\' height=\'180\' fill=\'%23FF0000\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' dominant-baseline=\'middle\' text-anchor=\'middle\' fill=\'%23FFFFFF\' font-size=\'24\' font-family=\'Arial\'%3EYoutube%3C/text%3E%3C/svg%3E',
            tiktok: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'320\' height=\'180\' viewBox=\'0 0 320 180\'%3E%3Crect width=\'320\' height=\'180\' fill=\'%23000000\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' dominant-baseline=\'middle\' text-anchor=\'middle\' fill=\'%23FFFFFF\' font-size=\'24\' font-family=\'Arial\'%3ETikTok%3C/text%3E%3C/svg%3E',
            vk: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'320\' height=\'180\' viewBox=\'0 0 320 180\'%3E%3Crect width=\'320\' height=\'180\' fill=\'%234A76A8\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' dominant-baseline=\'middle\' text-anchor=\'middle\' fill=\'%23FFFFFF\' font-size=\'24\' font-family=\'Arial\'%3EVK%3C/text%3E%3C/svg%3E',
            local: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'320\' height=\'180\' viewBox=\'0 0 320 180\'%3E%3Crect width=\'320\' height=\'180\' fill=\'%234CAF50\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' dominant-baseline=\'middle\' text-anchor=\'middle\' fill=\'%23FFFFFF\' font-size=\'24\' font-family=\'Arial\'%3EЛокальное%3C/text%3E%3C/svg%3E',
            other: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'320\' height=\'180\' viewBox=\'0 0 320 180\'%3E%3Crect width=\'320\' height=\'180\' fill=\'%23666666\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' dominant-baseline=\'middle\' text-anchor=\'middle\' fill=\'%23FFFFFF\' font-size=\'24\' font-family=\'Arial\'%3EVideo%3C/text%3E%3C/svg%3E'
        };
        
        // Привязываем методы
        this.addVideo = this.addVideo.bind(this);
        this.addTikTokVideo = this.addTikTokVideo.bind(this);
        this.uploadVideoFile = this.uploadVideoFile.bind(this);
        
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
    }
    
    initDB() {
        return new Promise((resolve) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => {
                console.warn('⚠️ IndexedDB не работает');
                resolve();
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
        if (addBtn) addBtn.addEventListener('click', () => this.openModal('videoModal'));
        
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
        if (searchBtn) searchBtn.addEventListener('click', () => this.searchVideos());
        
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') this.searchVideos();
            });
        }
        
        document.querySelectorAll('.sidebar nav ul li').forEach(item => {
            item.addEventListener('click', () => {
                this.setCategory(item.dataset.category);
            });
        });
        
        const addCategoryBtn = document.getElementById('addCategoryBtn');
        if (addCategoryBtn) addCategoryBtn.addEventListener('click', () => this.addCategory());
        
        // Загрузка файла
        const fileInput = document.getElementById('videoFile');
        const uploadArea = document.getElementById('fileUploadArea');
        
        if (fileInput && uploadArea) {
            uploadArea.addEventListener('click', (e) => {
                e.preventDefault();
                fileInput.click();
            });
            
            fileInput.addEventListener('change', (e) => {
                const files = e.target.files;
                if (files && files.length > 0) {
                    this.selectedFile = files[0];
                    
                    uploadArea.innerHTML = `
                        <i class="fas fa-check-circle" style="color: #4CAF50; font-size: 40px;"></i>
                        <p style="font-weight: bold; margin: 5px 0;">${this.selectedFile.name}</p>
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
        
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeAllModals();
                this.pauseVideo();
                this.resetForm();
            }
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
    
    /**
     * Получение данных TikTok через oEmbed API
     */
    async getTikTokData(url) {
        try {
            console.log('🎬 Получение данных TikTok для:', url);
            
            const response = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);
            
            if (!response.ok) {
                throw new Error('TikTok API вернул ошибку');
            }
            
            const data = await response.json();
            
            return {
                success: true,
                embedCode: data.html,
                thumbnail: data.thumbnail_url,
                title: data.title,
                author: data.author_name
            };
        } catch (error) {
            console.error('❌ Ошибка получения данных TikTok:', error);
            return {
                success: false,
                error: error.message
            };
        }
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
                alert('❌ Файл больше 50 МБ');
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
                    size: this.formatFileSize(file.size),
                    embedCode: null
                };
                
                this.videos.unshift(newVideo);
                this.saveData();
                this.render();
                alert('✅ Видео загружено');
                resolve();
            };
            
            reader.onerror = () => {
                alert('❌ Ошибка чтения файла');
                reject();
            };
            
            reader.readAsDataURL(file);
        });
    }
    
    /**
     * Добавление TikTok видео с использованием oEmbed
     */
    async addTikTokVideo(url, formData) {
        alert('⏳ Загрузка данных TikTok...');
        
        const tiktokData = await this.getTikTokData(url);
        
        if (!tiktokData.success) {
            alert('❌ Не удалось загрузить видео TikTok');
            return null;
        }
        
        const newVideo = {
            id: Date.now(),
            url: url,
            title: formData.title || tiktokData.title || 'TikTok Video',
            category: formData.category || 'tiktok',
            thumbnail: formData.thumbnail || tiktokData.thumbnail || this.defaultThumbnails.tiktok,
            views: 0,
            date: new Date().toLocaleDateString('ru-RU'),
            type: 'tiktok',
            embedCode: tiktokData.embedCode,
            author: tiktokData.author
        };
        
        return newVideo;
    }
    
    async addVideo() {
        const urlInput = document.getElementById('videoUrl');
        const fileInput = document.getElementById('videoFile');
        const titleInput = document.getElementById('videoTitle');
        const categorySelect = document.getElementById('videoCategory');
        const thumbnailInput = document.getElementById('videoThumbnail');
        
        const url = urlInput ? urlInput.value.trim() : '';
        const title = titleInput ? titleInput.value.trim() : '';
        const category = categorySelect ? categorySelect.value : 'other';
        const thumbnail = thumbnailInput ? thumbnailInput.value.trim() : '';
        
        const hasFile = this.selectedFile !== null;
        
        if (!url && !hasFile) {
            alert('❌ Введите ссылку или выберите файл');
            return;
        }
        
        // Если есть файл - загружаем его
        if (hasFile) {
            try {
                const videoData = {
                    title: title || this.selectedFile.name.replace(/\.[^/.]+$/, ""),
                    category: category,
                    thumbnail: thumbnail
                };
                
                await this.uploadVideoFile(this.selectedFile, videoData);
                
                this.selectedFile = null;
                this.closeModal('videoModal');
                this.resetForm();
            } catch (error) {
                console.error('Ошибка загрузки:', error);
            }
            return;
        }
        
        // Если есть ссылка
        if (url) {
            const videoType = this.getVideoType(url);
            
            let newVideo = null;
            
            // Для TikTok используем специальную обработку
            if (videoType === 'tiktok') {
                const formData = { title, category, thumbnail };
                newVideo = await this.addTikTokVideo(url, formData);
            } else {
                // Для остальных видео - стандартная обработка
                newVideo = {
                    id: Date.now(),
                    url: url,
                    title: title || 'Без названия',
                    category: category,
                    thumbnail: thumbnail || this.generateThumbnail(url, title) || this.defaultThumbnails[videoType] || this.defaultThumbnails.other,
                    views: 0,
                    date: new Date().toLocaleDateString('ru-RU'),
                    type: videoType,
                    embedCode: null
                };
            }
            
            if (newVideo) {
                this.videos.unshift(newVideo);
                this.saveData();
                this.render();
                this.closeModal('videoModal');
                this.resetForm();
                alert('✅ Видео сохранено');
            }
        }
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
            urlInput.value = video.type === 'local' ? '' : video.url;
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
        alert('✅ Обновлено');
    }
    
    deleteVideo(videoId) {
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
            alert('✅ Видео удалено');
        }
    }
    
    resetForm() {
        const form = document.getElementById('videoForm');
        if (form) form.reset();
        
        this.selectedFile = null;
        
        const urlInput = document.getElementById('videoUrl');
        const fileInput = document.getElementById('videoFile');
        
        if (urlInput) urlInput.disabled = false;
        if (fileInput) fileInput.disabled = false;
        
        this.editingVideoId = null;
        
        const modalTitle = document.querySelector('#videoModal h2');
        if (modalTitle) modalTitle.textContent = 'Добавить видео';
        
        const submitBtn = document.querySelector('#videoForm .submit-btn');
        if (submitBtn) submitBtn.textContent = 'Сохранить видео';
        
        const uploadArea = document.getElementById('fileUploadArea');
        if (uploadArea) {
            uploadArea.innerHTML = `
                <i class="fas fa-cloud-upload-alt"></i>
                <p>Нажмите для выбора файла</p>
                <small>MP4, AVI, MOV до 50 МБ</small>
            `;
        }
    }
    
    addCategory() {
        const categoryName = prompt('Введите название категории:');
        if (categoryName && categoryName.trim()) {
            const newCategory = {
                id: Date.now(),
                name: categoryName.trim()
            };
            this.customCategories.push(newCategory);
            this.saveData();
            this.renderCategories();
            this.setupCategorySelect();
            alert('✅ Категория создана');
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
            alert('✅ Категория удалена');
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
                alert('😕 Ничего не найдено');
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
        
        if (!playerContainer) return;
        
        playerContainer.innerHTML = '';
        
        if (video.type === 'tiktok' && video.embedCode) {
            console.log('🎬 Используем TikTok embed');
            
            const embedContainer = document.createElement('div');
            embedContainer.className = 'tiktok-embed-container';
            embedContainer.innerHTML = video.embedCode;
            
            if (!document.querySelector('script[src="https://www.tiktok.com/embed.js"]')) {
                const script = document.createElement('script');
                script.src = 'https://www.tiktok.com/embed.js';
                script.async = true;
                document.body.appendChild(script);
            }
            
            playerContainer.appendChild(embedContainer);
            
            if (window.tiktok && window.tiktok.refresh) {
                window.tiktok.refresh();
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
                            videoEl.id = 'videoPlayer';
                            videoEl.controls = true;
                            videoEl.autoplay = true;
                            videoEl.style.width = '100%';
                            videoEl.style.maxHeight = '70vh';
                            
                            const source = document.createElement('source');
                            source.src = request.result.data;
                            source.type = request.result.type || 'video/mp4';
                            
                            videoEl.appendChild(source);
                            playerContainer.appendChild(videoEl);
                        } else {
                            playerContainer.innerHTML = '<p style="color:white; padding:20px;">❌ Видео не найдено</p>';
                        }
                    };
                } catch (err) {
                    playerContainer.innerHTML = '<p style="color:white; padding:20px;">❌ Ошибка загрузки</p>';
                }
            }
        } else if (video.type === 'youtube') {
            const videoId = this.getYouTubeId(video.url);
            if (videoId) {
                const iframe = document.createElement('iframe');
                iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
                iframe.width = '100%';
                iframe.height = '500';
                iframe.frameBorder = '0';
                iframe.allow = 'autoplay; encrypted-media; fullscreen';
                iframe.allowFullscreen = true;
                playerContainer.appendChild(iframe);
            }
        } else {
            const colors = {
                vk: { bg: 'linear-gradient(135deg, #4A76A8, #2A4F7C)', name: 'VK' },
                other: { bg: 'linear-gradient(135deg, #666666, #333333)', name: 'ссылку' }
            };
            
            const style = colors[video.type] || colors.other;
            
            playerContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; background: ${style.bg}; border-radius: 10px;">
                    <i class="fas fa-external-link-alt" style="font-size: 60px; color: white; margin-bottom: 20px;"></i>
                    <p style="color: white; font-size: 18px; margin-bottom: 25px;">
                        Видео откроется в новой вкладке
                    </p>
                    <a href="${this.escapeHtml(video.url)}" target="_blank" rel="noopener noreferrer"
                       style="display: inline-block; padding: 15px 40px; background: white; 
                              text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 16px;">
                        <i class="fas fa-external-link-alt"></i> Открыть ${style.name}
                    </a>
                </div>
            `;
        }
        
        if (playerTitle) playerTitle.textContent = video.title || 'Без названия';
        if (viewCount) viewCount.textContent = video.views;
        if (videoDate) videoDate.textContent = video.date || new Date().toLocaleDateString('ru-RU');
        
        this.openModal('playerModal');
    }
    
    pauseVideo() {
        const playerContainer = document.querySelector('.video-player-container');
        if (playerContainer) {
            playerContainer.innerHTML = '';
        }
    }
    
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.style.display = 'block';
    }
    
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.style.display = 'none';
    }
    
    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
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
        
        grid.innerHTML = videosToRender.map(video => {
            const authorHtml = video.author ? `<span>👤 ${video.author}</span>` : '';
            
            return `
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
                          video.type === 'tiktok' ? '🎵' : 
                          video.type === 'local' ? '💾' : ''}
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
                    ${authorHtml ? `<div style="font-size: 11px; color: #999; margin-top: 2px;">${authorHtml}</div>` : ''}
                </div>
            </div>
        `}).join('');
        
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