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
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = (event) => {
                console.error('Ошибка открытия БД:', event);
                reject(event);
            };
            
            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('✅ IndexedDB готова к работе');
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                if (!db.objectStoreNames.contains('videos')) {
                    const store = db.createObjectStore('videos', { keyPath: 'id' });
                    store.createIndex('filename', 'filename', { unique: false });
                    store.createIndex('date', 'uploaded', { unique: false });
                    console.log('📁 Создано хранилище для видео');
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
            alert('Не удалось сохранить данные. Возможно, превышен лимит localStorage.');
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
            // Проверка размера (50 МБ максимум)
            if (file.size > 50 * 1024 * 1024) {
                reject(new Error('Файл слишком большой. Максимальный размер: 50 МБ'));
                return;
            }
            
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                const videoBlob = e.target.result;
                const videoId = Date.now();
                
                // Сохраняем в IndexedDB
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
                    // Создаем объект видео для основного списка
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
                    reject('Видео не найдено в хранилище');
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
        
        // Проверяем, что хоть что-то заполнено
        if ((!urlInput || !urlInput.value) && (!fileInput || !fileInput.files.length)) {
            alert('Введите ссылку на видео или выберите файл');
            return;
        }
        
        // Если выбран файл, загружаем его
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
            } catch (error) {
                alert('Ошибка при загрузке файла: ' + error.message);
            }
            return;
        }
        
        // Логика для ссылок
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
        
        const urlInput = document.getElementById('videoUrl');
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
    }
    
    async deleteVideo(videoId) {
        if (confirm('Вы уверены, что хотите удалить это видео?')) {
            const video = this.videos.find(v => v.id === videoId);
            
            // Если видео локальное, удаляем из IndexedDB
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
        }
    }
    
    deleteCategory(categoryId) {
        if (confirm('Удалить категорию? Видео в этой категории будут перемещены в "Все видео"')) {
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
                
                const source = document.createElement('source');
                source.src = localVideo.data;
                source.type = localVideo.type || 'video/mp4';
                
                videoElement.appendChild(source);
                videoElement.appendChild(document.createTextNode('Ваш браузер не поддерживает видео.'));
                
                playerContainer.appendChild(videoElement);
                
                // Добавляем информацию о файле
                if (videoFileInfo) {
                    videoFileInfo.style.display = 'inline';
                    videoFileInfo.innerHTML = `
                        <i class="fas fa-hdd"></i> ${video.filename || 'Локальное видео'} (${video.size || 'неизвестно'})
                    `;
                }
                
            } catch (error) {
                console.error('Ошибка загрузки локального видео:', error);
                playerContainer.innerHTML = `
                    <div style="text-align: center; padding: 40px; background: #ff4444; color: white; border-radius: 10px;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 15px;"></i>
                        <p style="font-size: 18px; margin-bottom: 20px;">Ошибка загрузки видео из хранилища</p>
                        <p style="font-size: 14px; opacity: 0.9;">Видео могло быть повреждено или удалено</p>
                    </div>
                `;
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
            } else {
                playerContainer.innerHTML = `
                    <div style="text-align: center; padding: 40px; background: linear-gradient(135deg, #FF0000, #CC0000); border-radius: 10px;">
                        <i class="fab fa-youtube" style="font-size: 60px; color: white; margin-bottom: 20px;"></i>
                        <p style="color: white; font-size: 18px; margin-bottom: 25px;">Не удалось загрузить видео</p>
                        <a href="${this.escapeHtml(video.url)}" target="_blank" 
                           style="display: inline-block; padding: 15px 40px; background: white; color: #FF0000; 
                                  text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 16px;
                                  transition: transform 0.3s; box-shadow: 0 4px 15px rgba(0,0,0,0.2);"
                           onmouseover="this.style.transform='scale(1.05)'"
                           onmouseout="this.style.transform='scale(1)'">
                            <i class="fab fa-youtube"></i> Открыть на YouTube
                        </a>
                    </div>
                `;
            }
        } else {
            // Для VK, TikTok и других - показываем красивую кнопку перехода
            const colors = {
                vk: { bg: 'linear-gradient(135deg, #4A76A8, #2A4F7C)', icon: 'fab fa-vk', text: 'VK' },
                tiktok: { bg: 'linear-gradient(135deg, #25F4EE, #FE2C55)', icon: 'fab fa-tiktok', text: 'TikTok' },
                other: { bg: 'linear-gradient(135deg, #666666, #333333)', icon: 'fas fa-external-link-alt', text: 'ссылку' }
            };
            
            const style = colors[video.type] || colors.other;
            
            playerContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; background: ${style.bg}; border-radius: 10px;">
                    <i class="${style.icon}" style="font-size: 60px; color: white; margin-bottom: 20px;"></i>
                    <p style="color: white; font-size: 18px; margin-bottom: 25px;">
                        Видео откроется в новой вкладке
                    </p>
                    <a href="${this.escapeHtml(video.url)}" target="_blank" rel="noopener noreferrer"
                       style="display: inline-block; padding: 15px 40px; background: white; 
                              text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 16px;
                              transition: transform 0.3s; box-shadow: 0 4px 15px rgba(0,0,0,0.2);"
                       onmouseover="this.style.transform='scale(1.05)'"
                       onmouseout="this.style.transform='scale(1)'">
                        <i class="${style.icon}"></i> Открыть ${style.text}
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