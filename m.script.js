class MobileVideoSaver {
    constructor() {
        this.videos = [];
        this.customCategories = [];
        this.currentCategory = 'all';
        this.currentVideo = null;
        this.editingVideoId = null;
        this.longPressTimer = null;
        this.selectedVideoCard = null;
        
        this.storageKey = 'videoSaverData';
        this.categoriesKey = 'videoSaverCategories';
        
        this.dbName = 'VideoSaverDB';
        this.dbVersion = 1;
        this.db = null;
        
        this.defaultThumbnails = {
            youtube: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'320\' height=\'180\' viewBox=\'0 0 320 180\'%3E%3Crect width=\'320\' height=\'180\' fill=\'%23FF0000\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' fill=\'%23FFFFFF\' font-size=\'24\' text-anchor=\'middle\' dominant-baseline=\'middle\'%3EYoutube%3C/text%3E%3C/svg%3E',
            tiktok: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'320\' height=\'180\' viewBox=\'0 0 320 180\'%3E%3Crect width=\'320\' height=\'180\' fill=\'%23000000\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' fill=\'%23FFFFFF\' font-size=\'24\' text-anchor=\'middle\' dominant-baseline=\'middle\'%3ETikTok%3C/text%3E%3C/svg%3E',
            vk: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'320\' height=\'180\' viewBox=\'0 0 320 180\'%3E%3Crect width=\'320\' height=\'180\' fill=\'%234A76A8\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' fill=\'%23FFFFFF\' font-size=\'24\' text-anchor=\'middle\' dominant-baseline=\'middle\'%3EVK%3C/text%3E%3C/svg%3E',
            local: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'320\' height=\'180\' viewBox=\'0 0 320 180\'%3E%3Crect width=\'320\' height=\'180\' fill=\'%234CAF50\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' fill=\'%23FFFFFF\' font-size=\'24\' text-anchor=\'middle\' dominant-baseline=\'middle\'%3EЛокальное%3C/text%3E%3C/svg%3E',
            other: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'320\' height=\'180\' viewBox=\'0 0 320 180\'%3E%3Crect width=\'320\' height=\'180\' fill=\'%23666666\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' fill=\'%23FFFFFF\' font-size=\'24\' text-anchor=\'middle\' dominant-baseline=\'middle\'%3EVideo%3C/text%3E%3C/svg%3E'
        };
        
        this.init();
    }
    
    async init() {
        await this.initDB();
        this.loadData();
        this.bindEvents();
        this.render();
        this.setupLongPress();
    }
    
    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => reject();
            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve();
            };
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('videos')) {
                    db.createObjectStore('videos', { keyPath: 'id' });
                }
            };
        });
    }
    
    loadData() {
        try {
            this.videos = JSON.parse(localStorage.getItem(this.storageKey)) || [];
            this.customCategories = JSON.parse(localStorage.getItem(this.categoriesKey)) || [];
        } catch (e) {
            this.videos = [];
            this.customCategories = [];
        }
    }
    
    saveData() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.videos));
        localStorage.setItem(this.categoriesKey, JSON.stringify(this.customCategories));
    }
    
    bindEvents() {
        // Нижняя навигация
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                item.classList.add('active');
                this.currentCategory = item.dataset.category;
                this.render();
            });
        });
        
        // Кнопки шапки
        document.getElementById('mobileAddBtn').addEventListener('click', () => {
            this.openModal('mobileVideoModal');
        });
        
        document.getElementById('mobileSearchBtn').addEventListener('click', () => {
            document.getElementById('mobileSearchBar').classList.toggle('active');
        });
        
        document.getElementById('closeSearch').addEventListener('click', () => {
            document.getElementById('mobileSearchBar').classList.remove('active');
            document.getElementById('mobileSearchInput').value = '';
            this.render();
        });
        
        document.getElementById('mobileSearchSubmit').addEventListener('click', () => {
            this.searchVideos();
        });
        
        document.getElementById('mobileSearchInput').addEventListener('keyup', (e) => {
            if (e.key === 'Enter') this.searchVideos();
        });
        
        // Категории (горизонтальный скролл)
        document.querySelectorAll('.category-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                if (chip.classList.contains('more-categories')) {
                    document.getElementById('categoriesMenu').classList.add('active');
                    return;
                }
                document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                this.currentCategory = chip.dataset.category;
                this.render();
            });
        });
        
        // Закрытие меню категорий
        document.querySelector('.close-menu').addEventListener('click', () => {
            document.getElementById('categoriesMenu').classList.remove('active');
        });
        
        // Добавление категории
        document.getElementById('mobileAddCategoryBtn').addEventListener('click', () => {
            this.addCategory();
        });
        
        // Форма добавления видео
        document.getElementById('mobileVideoForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addVideo();
        });
        
        // Закрытие модалок
        document.querySelectorAll('.mobile-modal-close, .mobile-player-close').forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeAllModals();
            });
        });
        
        // Область загрузки файла
        const uploadArea = document.getElementById('fileUploadArea');
        const fileInput = document.getElementById('mobileVideoFile');
        
        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });
        
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length) {
                uploadArea.innerHTML = `
                    <i class="fas fa-check-circle" style="color: #4CAF50;"></i>
                    <p>${e.target.files[0].name}</p>
                    <small>${(e.target.files[0].size / 1024 / 1024).toFixed(2)} МБ</small>
                `;
            }
        });
        
        // Закрытие по свайпу вниз
        let touchStartY = 0;
        document.querySelectorAll('.mobile-modal-content').forEach(modal => {
            modal.addEventListener('touchstart', (e) => {
                touchStartY = e.touches[0].clientY;
            }, { passive: true });
            
            modal.addEventListener('touchend', (e) => {
                const touchEndY = e.changedTouches[0].clientY;
                if (touchEndY > touchStartY + 100) {
                    this.closeAllModals();
                }
            }, { passive: true });
        });
    }
    
    setupLongPress() {
        let longPressTimer;
        const contextMenu = document.getElementById('videoContextMenu');
        
        document.addEventListener('touchstart', (e) => {
            const card = e.target.closest('.mobile-video-card');
            if (!card) return;
            
            this.selectedVideoCard = card;
            longPressTimer = setTimeout(() => {
                // Вибрация (если поддерживается)
                if (navigator.vibrate) navigator.vibrate(50);
                
                const videoId = parseInt(card.dataset.id);
                const video = this.videos.find(v => v.id === videoId);
                
                if (video) {
                    // Показываем контекстное меню
                    const touch = e.touches[0];
                    contextMenu.style.left = touch.clientX + 'px';
                    contextMenu.style.top = touch.clientY + 'px';
                    contextMenu.classList.add('active');
                    
                    // Настраиваем кнопки меню
                    document.getElementById('contextEdit').onclick = () => {
                        this.editVideo(videoId);
                        contextMenu.classList.remove('active');
                    };
                    
                    document.getElementById('contextDelete').onclick = () => {
                        this.deleteVideo(videoId);
                        contextMenu.classList.remove('active');
                    };
                }
            }, 500);
        }, { passive: true });
        
        document.addEventListener('touchend', () => {
            clearTimeout(longPressTimer);
        });
        
        document.addEventListener('touchmove', () => {
            clearTimeout(longPressTimer);
        });
        
        // Закрытие контекстного меню
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
                reject('Файл слишком большой (макс. 50 МБ)');
                return;
            }
            
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const videoId = Date.now();
                const transaction = this.db.transaction(['videos'], 'readwrite');
                const store = transaction.objectStore('videos');
                
                store.add({
                    id: videoId,
                    filename: file.name,
                    data: e.target.result,
                    type: file.type,
                    size: file.size
                });
                
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
                resolve();
            };
            
            reader.readAsDataURL(file);
        });
    }
    
    async addVideo() {
        const url = document.getElementById('mobileVideoUrl').value;
        const file = document.getElementById('mobileVideoFile').files[0];
        const title = document.getElementById('mobileVideoTitle').value;
        const category = document.getElementById('mobileVideoCategory').value;
        const thumbnail = document.getElementById('mobileVideoThumbnail').value;
        
        if (!url && !file) {
            this.showToast('Введите ссылку или выберите файл');
            return;
        }
        
        if (file) {
            try {
                await this.uploadVideoFile(file, { title, category, thumbnail });
                this.closeModal('mobileVideoModal');
                this.resetForm();
                this.showToast('Видео загружено');
            } catch (error) {
                this.showToast('Ошибка: ' + error);
            }
            return;
        }
        
        const newVideo = {
            id: Date.now(),
            url: url,
            title: title || 'Без названия',
            category: category,
            thumbnail: thumbnail || this.defaultThumbnails[this.getVideoType(url)] || this.defaultThumbnails.other,
            views: 0,
            date: new Date().toLocaleDateString('ru-RU'),
            type: this.getVideoType(url)
        };
        
        this.videos.unshift(newVideo);
        this.saveData();
        this.render();
        this.closeModal('mobileVideoModal');
        this.resetForm();
        this.showToast('Ссылка сохранена');
    }
    
    editVideo(videoId) {
        const video = this.videos.find(v => v.id === videoId);
        if (!video) return;
        
        this.editingVideoId = videoId;
        
        document.getElementById('mobileVideoUrl').value = video.type === 'local' ? '' : video.url;
        document.getElementById('mobileVideoTitle').value = video.title;
        document.getElementById('mobileVideoCategory').value = video.category;
        document.getElementById('mobileVideoThumbnail').value = video.thumbnail || '';
        
        document.querySelector('#mobileVideoModal h2').textContent = 'Редактировать';
        document.querySelector('#mobileVideoForm button[type="submit"]').textContent = 'Обновить';
        
        this.openModal('mobileVideoModal');
    }
    
    updateVideo() {
        if (!this.editingVideoId) return;
        
        const index = this.videos.findIndex(v => v.id === this.editingVideoId);
        if (index === -1) return;
        
        this.videos[index] = {
            ...this.videos[index],
            title: document.getElementById('mobileVideoTitle').value,
            category: document.getElementById('mobileVideoCategory').value,
            thumbnail: document.getElementById('mobileVideoThumbnail').value || this.videos[index].thumbnail
        };
        
        this.saveData();
        this.render();
        this.closeModal('mobileVideoModal');
        this.resetForm();
        this.showToast('Обновлено');
    }
    
    deleteVideo(videoId) {
        if (confirm('Удалить видео?')) {
            this.videos = this.videos.filter(v => v.id !== videoId);
            this.saveData();
            this.render();
            this.showToast('Видео удалено');
        }
    }
    
    searchVideos() {
        const query = document.getElementById('mobileSearchInput').value.toLowerCase();
        if (!query) {
            this.render();
            return;
        }
        
        const filtered = this.videos.filter(v => 
            v.title.toLowerCase().includes(query)
        );
        this.render(filtered);
    }
    
    async playVideo(video) {
        if (!video) return;
        
        this.currentVideo = video;
        video.views++;
        this.saveData();
        
        const playerContainer = document.getElementById('mobileVideoPlayer');
        playerContainer.innerHTML = '';
        
        document.getElementById('mobilePlayerTitle').textContent = video.title;
        document.getElementById('mobileViewCount').textContent = video.views;
        document.getElementById('mobileVideoDate').textContent = video.date;
        
        if (video.type === 'local') {
            const localVideo = await this.getLocalVideo(video.id);
            if (localVideo) {
                const videoEl = document.createElement('video');
                videoEl.controls = true;
                videoEl.autoplay = true;
                videoEl.playsInline = true;
                videoEl.src = localVideo.data;
                videoEl.style.width = '100%';
                playerContainer.appendChild(videoEl);
            }
        } else if (video.type === 'youtube') {
            const videoId = this.getYouTubeId(video.url);
            if (videoId) {
                const iframe = document.createElement('iframe');
                iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
                iframe.allow = 'autoplay; encrypted-media; fullscreen';
                iframe.allowFullscreen = true;
                playerContainer.appendChild(iframe);
            }
        } else {
            playerContainer.innerHTML = `
                <div style="padding: 50px 20px; text-align: center; background: #333;">
                    <a href="${video.url}" target="_blank" style="color: white; font-size: 18px;">
                        Открыть видео →
                    </a>
                </div>
            `;
        }
        
        this.openModal('mobilePlayerModal');
    }
    
    getLocalVideo(id) {
        return new Promise((resolve) => {
            const transaction = this.db.transaction(['videos'], 'readonly');
            const store = transaction.objectStore('videos');
            const request = store.get(id);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve(null);
        });
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
            this.showToast('Категория создана');
        }
    }
    
    deleteCategory(id) {
        this.customCategories = this.customCategories.filter(c => c.id !== id);
        this.videos.forEach(v => {
            if (v.category === `custom_${id}`) v.category = 'all';
        });
        this.saveData();
        this.renderCategories();
        this.render();
    }
    
    renderCategories() {
        const menu = document.getElementById('customCategoriesMenu');
        if (!menu) return;
        
        menu.innerHTML = this.customCategories.map(cat => `
            <div class="menu-category-item" data-category="custom_${cat.id}">
                <span>${cat.name}</span>
                <span onclick="event.stopPropagation(); mobileVideoSaver.deleteCategory(${cat.id})">
                    <i class="fas fa-times" style="color: #999;"></i>
                </span>
            </div>
        `).join('');
        
        document.querySelectorAll('.menu-category-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.fa-times')) {
                    this.currentCategory = item.dataset.category;
                    document.getElementById('categoriesMenu').classList.remove('active');
                    this.render();
                }
            });
        });
    }
    
    render(filtered = null) {
        const grid = document.getElementById('mobileVideosGrid');
        const videos = filtered || this.videos.filter(v => {
            if (this.currentCategory === 'all') return true;
            if (this.currentCategory === 'local') return v.type === 'local';
            return v.category === this.currentCategory;
        });
        
        if (!videos.length) {
            grid.innerHTML = `
                <div class="mobile-empty-state">
                    <i class="fas fa-video"></i>
                    <h3>Здесь пока пусто</h3>
                    <p>Нажмите + чтобы добавить видео</p>
                </div>
            `;
            return;
        }
        
        grid.innerHTML = videos.map(v => `
            <div class="mobile-video-card" data-id="${v.id}">
                <div class="mobile-thumbnail">
                    <img src="${v.thumbnail}" loading="lazy" onerror="this.src='${this.defaultThumbnails[v.type]}'">
                    <div class="mobile-video-badge ${v.type}">
                        ${v.type === 'vk' ? 'VK' : v.type === 'youtube' ? 'YT' : v.type === 'tiktok' ? 'TT' : '📱'}
                    </div>
                    <div class="mobile-video-overlay">
                        <div class="mobile-video-title">${v.title}</div>
                        <div class="mobile-video-meta">
                            <span><i class="fas fa-eye"></i> ${v.views}</span>
                            <span>${v.date}</span>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
        
        document.querySelectorAll('.mobile-video-card').forEach(card => {
            card.addEventListener('click', () => {
                const video = this.videos.find(v => v.id === parseInt(card.dataset.id));
                if (video) this.playVideo(video);
            });
        });
    }
    
    openModal(id) {
        document.getElementById(id).style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
    
    closeModal(id) {
        document.getElementById(id).style.display = 'none';
        document.body.style.overflow = '';
    }
    
    closeAllModals() {
        document.querySelectorAll('.mobile-modal').forEach(m => m.style.display = 'none');
        document.body.style.overflow = '';
    }
    
    resetForm() {
        document.getElementById('mobileVideoForm').reset();
        this.editingVideoId = null;
        document.querySelector('#mobileVideoModal h2').textContent = 'Добавить видео';
        document.querySelector('#mobileVideoForm button[type="submit"]').textContent = 'Сохранить видео';
        
        // Сброс области загрузки
        document.getElementById('fileUploadArea').innerHTML = `
            <i class="fas fa-cloud-upload-alt"></i>
            <p>Нажмите для выбора файла</p>
            <small>MP4, 3GP, MOV до 50 МБ</small>
        `;
    }
    
    showToast(text) {
        const toast = document.createElement('div');
        toast.className = 'mobile-toast';
        toast.textContent = text;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
    }
}

// Инициализация
const mobileVideoSaver = new MobileVideoSaver();