class VideoSaver {
    constructor() {
        this.videos = [];
        this.customCategories = [];
        this.currentCategory = 'all';
        this.currentVideo = null;
        this.editingVideoId = null;
        
        this.storageKey = 'videoSaverData';
        this.categoriesKey = 'videoSaverCategories';
        
        // Более надежные заглушки для изображений (используем data:image)
        this.defaultThumbnails = {
            youtube: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'320\' height=\'180\' viewBox=\'0 0 320 180\'%3E%3Crect width=\'320\' height=\'180\' fill=\'%23FF0000\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' dominant-baseline=\'middle\' text-anchor=\'middle\' fill=\'%23FFFFFF\' font-size=\'24\' font-family=\'Arial\'%3EYoutube%3C/text%3E%3C/svg%3E',
            tiktok: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'320\' height=\'180\' viewBox=\'0 0 320 180\'%3E%3Crect width=\'320\' height=\'180\' fill=\'%23000000\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' dominant-baseline=\'middle\' text-anchor=\'middle\' fill=\'%23FFFFFF\' font-size=\'24\' font-family=\'Arial\'%3ETikTok%3C/text%3E%3C/svg%3E',
            vk: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'320\' height=\'180\' viewBox=\'0 0 320 180\'%3E%3Crect width=\'320\' height=\'180\' fill=\'%234A76A8\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' dominant-baseline=\'middle\' text-anchor=\'middle\' fill=\'%23FFFFFF\' font-size=\'24\' font-family=\'Arial\'%3EVK%3C/text%3E%3C/svg%3E',
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
    
    setup() {
        this.loadData();
        this.bindEvents();
        this.render();
        this.setupCategorySelect();
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
        
        // Очищаем существующие опции
        select.innerHTML = '';
        
        // Добавляем стандартные категории
        const standardCategories = [
            { value: 'tiktok', text: 'TikTok' },
            { value: 'youtube', text: 'YouTube Shorts' },
            { value: 'vk', text: 'VK Видео' },
            { value: 'edits', text: 'Edit\'ы' }
        ];
        
        standardCategories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.value;
            option.textContent = cat.text;
            select.appendChild(option);
        });
        
        // Добавляем пользовательские категории
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
        
        // Категории в сайдбаре
        document.querySelectorAll('.sidebar nav ul li').forEach(item => {
            item.addEventListener('click', () => {
                this.setCategory(item.dataset.category);
            });
        });
        
        const addCategoryBtn = document.getElementById('addCategoryBtn');
        if (addCategoryBtn) addCategoryBtn.addEventListener('click', () => this.addCategory());
        
        // Закрытие по клику вне модального окна
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
        if (url.includes('tiktok.com')) return 'tiktok';
        if (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('youtube shorts')) return 'youtube';
        if (url.includes('vk.com/video')) return 'vk';
        return 'other';
    }
    
    extractVKVideoId(url) {
        const match = url.match(/video(-?\d+)_(\d+)/);
        if (match) {
            return {
                ownerId: match[1],
                videoId: match[2]
            };
        }
        return null;
    }
    
    getYouTubeId(url) {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2] && match[2].length === 11) ? match[2] : null;
    }
    
    getYouTubeThumbnail(videoId) {
        // Используем data:image заглушку вместо внешнего URL
        return this.defaultThumbnails.youtube;
    }
    
    generateThumbnail(url, title = '') {
        const type = this.getVideoType(url);
        
        if (type === 'youtube') {
            const videoId = this.getYouTubeId(url);
            if (videoId) {
                // Пробуем загрузить с YouTube, но с обработкой ошибок
                return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
            }
        }
        
        return this.defaultThumbnails[type] || this.defaultThumbnails.other;
    }
    
    addVideo() {
        const urlInput = document.getElementById('videoUrl');
        const titleInput = document.getElementById('videoTitle');
        const categorySelect = document.getElementById('videoCategory');
        const thumbnailInput = document.getElementById('videoThumbnail');
        
        if (!urlInput || !urlInput.value) {
            alert('Введите ссылку на видео');
            return;
        }
        
        const url = urlInput.value;
        const title = titleInput?.value || 'Без названия';
        const category = categorySelect?.value || 'other';
        let thumbnail = thumbnailInput?.value;
        
        // Если миниатюра не указана, генерируем
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
        const titleInput = document.getElementById('videoTitle');
        const categorySelect = document.getElementById('videoCategory');
        const thumbnailInput = document.getElementById('videoThumbnail');
        
        if (urlInput) urlInput.value = video.url || '';
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
            url: urlInput?.value || this.videos[videoIndex].url,
            title: titleInput?.value || this.videos[videoIndex].title,
            category: categorySelect?.value || this.videos[videoIndex].category,
            thumbnail: thumbnailInput?.value || this.videos[videoIndex].thumbnail,
            type: this.getVideoType(urlInput?.value)
        };
        
        this.saveData();
        this.render();
        this.closeModal('videoModal');
        this.resetForm();
    }
    
    deleteVideo(videoId) {
        if (confirm('Вы уверены, что хотите удалить это видео?')) {
            this.videos = this.videos.filter(v => v.id !== videoId);
            this.saveData();
            this.render();
        }
    }
    
    resetForm() {
        const form = document.getElementById('videoForm');
        if (form) form.reset();
        
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
    
    playVideo(video) {
        if (!video) return;
        
        this.currentVideo = video;
        video.views = (video.views || 0) + 1;
        this.saveData();
        
        const playerContainer = document.querySelector('.video-player-container');
        const playerTitle = document.getElementById('playerVideoTitle');
        const viewCount = document.getElementById('viewCount');
        const videoDate = document.getElementById('videoDate');
        
        if (!playerContainer) return;
        
        // Очищаем контейнер
        playerContainer.innerHTML = '';
        
        // Создаем соответствующий плеер
        if (video.type === 'vk') {
            const videoIds = this.extractVKVideoId(video.url);
            if (videoIds) {
                const iframe = document.createElement('iframe');
                iframe.src = `https://vk.com/video_ext.php?oid=${videoIds.ownerId}&id=${videoIds.videoId}&hd=1&autoplay=1`;
                iframe.width = '100%';
                iframe.height = '500';
                iframe.frameBorder = '0';
                iframe.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture';
                iframe.allowFullscreen = true;
                playerContainer.appendChild(iframe);
            } else {
                playerContainer.innerHTML = `<p style="color: white; padding: 20px;">Не удалось загрузить видео. <a href="${this.escapeHtml(video.url)}" target="_blank" style="color: #4A76A8;">Открыть в VK</a></p>`;
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
                playerContainer.innerHTML = `<p style="color: white; padding: 20px;">Не удалось загрузить видео. <a href="${this.escapeHtml(video.url)}" target="_blank" style="color: #FF0000;">Открыть на YouTube</a></p>`;
            }
        } else {
            // Для других видео используем HTML5 плеер
            const videoElement = document.createElement('video');
            videoElement.id = 'videoPlayer';
            videoElement.controls = true;
            videoElement.autoplay = true;
            videoElement.style.width = '100%';
            videoElement.style.maxHeight = '70vh';
            
            const source = document.createElement('source');
            source.src = video.url;
            source.type = 'video/mp4';
            
            videoElement.appendChild(source);
            videoElement.appendChild(document.createTextNode('Ваш браузер не поддерживает видео.'));
            
            playerContainer.appendChild(videoElement);
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
            if (this.currentCategory === video.category) return true;
            return false;
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
                        ${video.type === 'vk' ? 'VK' : video.type === 'youtube' ? 'YT' : video.type === 'tiktok' ? 'TT' : ''}
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
                </div>
            </div>
        `).join('');
        
        // Добавляем обработчики для карточек
        grid.querySelectorAll('.video-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.edit-video-btn') || e.target.closest('.delete-video-btn')) {
                    return;
                }
                const video = this.videos.find(v => v.id === parseInt(card.dataset.id));
                if (video) this.playVideo(video);
            });
        });
    }
    
    getCategoryName(categoryId) {
        if (!categoryId) return 'Все видео';
        if (categoryId === 'tiktok') return 'TikTok';
        if (categoryId === 'youtube') return 'YouTube Shorts';
        if (categoryId === 'edits') return 'Edit\'ы';
        if (categoryId === 'vk') return 'VK Видео';
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