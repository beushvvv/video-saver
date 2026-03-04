class VideoSaver {
    constructor() {
        this.videos = [];
        this.customCategories = [];
        this.currentCategory = 'all';
        this.currentVideo = null;
        this.editingVideoId = null;
        
        this.storageKey = 'videoSaverData';
        this.categoriesKey = 'videoSaverCategories';
        
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
        }
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
        if (videoForm) videoForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (this.editingVideoId) {
                this.updateVideo();
            } else {
                this.addVideo();
            }
        });
        
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
        if (url.includes('tiktok.com')) return 'tiktok';
        if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
        if (url.includes('vk.com/video')) return 'vk';
        return 'other';
    }
    
    extractVKVideoId(url) {
        // Извлекает owner_id и video_id из ссылки VK
        const match = url.match(/video(-?\d+)_(\d+)/);
        if (match) {
            return {
                ownerId: match[1],
                videoId: match[2]
            };
        }
        return null;
    }
    
    generateThumbnail(url, title = '') {
        const type = this.getVideoType(url);
        const encodedTitle = encodeURIComponent(title || 'Video');
        
        // Используем более надежные заглушки
        const placeholders = {
            youtube: 'https://img.youtube.com/vi/REPLACE_ID/mqdefault.jpg',
            tiktok: 'https://via.placeholder.com/320x180/000000/FFFFFF?text=TikTok',
            vk: 'https://via.placeholder.com/320x180/4A76A8/FFFFFF?text=VK+Video',
            other: `https://via.placeholder.com/320x180/666666/FFFFFF?text=${encodedTitle}`
        };
        
        if (type === 'youtube') {
            const videoId = this.getYouTubeId(url);
            if (videoId) {
                return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
            }
        }
        
        if (type === 'vk') {
            // Для VK используем заглушку, так как получить превью сложно
            return 'https://via.placeholder.com/320x180/4A76A8/FFFFFF?text=VK+Video';
        }
        
        return placeholders[type] || placeholders.other;
    }
    
    getYouTubeId(url) {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2] && match[2].length === 11) ? match[2] : null;
    }
    
    async addVideo() {
        const url = document.getElementById('videoUrl')?.value;
        if (!url) return;
        
        let title = document.getElementById('videoTitle')?.value;
        const category = document.getElementById('videoCategory')?.value || 'all';
        let thumbnail = document.getElementById('videoThumbnail')?.value;
        
        // Генерируем миниатюру если не указана
        if (!thumbnail) {
            thumbnail = this.generateThumbnail(url, title);
        }
        
        const newVideo = {
            id: Date.now(),
            url: url,
            title: title || 'Без названия',
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
        if (categorySelect) categorySelect.value = video.category || 'all';
        if (thumbnailInput) thumbnailInput.value = video.thumbnail || '';
        
        const modalTitle = document.querySelector('#videoModal h2');
        if (modalTitle) modalTitle.textContent = 'Редактировать видео';
        
        const submitBtn = document.querySelector('#videoForm .submit-btn');
        if (submitBtn) submitBtn.textContent = 'Обновить видео';
        
        this.openModal('videoModal');
    }
    
    updateVideo() {
        if (!this.editingVideoId) return;
        
        const url = document.getElementById('videoUrl')?.value;
        const title = document.getElementById('videoTitle')?.value;
        const category = document.getElementById('videoCategory')?.value;
        let thumbnail = document.getElementById('videoThumbnail')?.value;
        
        const videoIndex = this.videos.findIndex(v => v.id === this.editingVideoId);
        if (videoIndex === -1) return;
        
        if (!thumbnail) {
            thumbnail = this.generateThumbnail(url, title);
        }
        
        this.videos[videoIndex] = {
            ...this.videos[videoIndex],
            url: url || this.videos[videoIndex].url,
            title: title || this.videos[videoIndex].title,
            category: category || this.videos[videoIndex].category,
            thumbnail: thumbnail,
            type: this.getVideoType(url)
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
            
            const select = document.getElementById('videoCategory');
            if (select) {
                const option = document.createElement('option');
                option.value = `custom_${newCategory.id}`;
                option.textContent = newCategory.name;
                select.appendChild(option);
            }
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
            this.render();
            
            const select = document.getElementById('videoCategory');
            if (select) {
                Array.from(select.options).forEach((option, index) => {
                    if (option.value === `custom_${categoryId}`) {
                        select.remove(index);
                    }
                });
            }
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
        
        if (video.type === 'vk') {
            this.showVKPlayer(video);
        } else {
            this.showHTML5Player(video);
        }
        
        document.getElementById('playerVideoTitle').textContent = video.title || 'Без названия';
        document.getElementById('viewCount').textContent = video.views;
        document.getElementById('videoDate').textContent = video.date || new Date().toLocaleDateString('ru-RU');
        
        this.openModal('playerModal');
    }
    
    showHTML5Player(video) {
        const playerContainer = document.querySelector('.video-player-container');
        if (!playerContainer) return;
        
        playerContainer.innerHTML = `
            <video id="videoPlayer" controls autoplay>
                <source src="${this.escapeHtml(video.url)}" type="video/mp4">
                <source src="${this.escapeHtml(video.url)}" type="video/webm">
                Ваш браузер не поддерживает видео.
            </video>
        `;
    }
    
    showVKPlayer(video) {
        const playerContainer = document.querySelector('.video-player-container');
        if (!playerContainer) return;
        
        const videoIds = this.extractVKVideoId(video.url);
        
        if (videoIds) {
            // Используем официальный VK плеер
            playerContainer.innerHTML = `
                <iframe src="https://vk.com/video_ext.php?oid=${videoIds.ownerId}&id=${videoIds.videoId}&hd=1&autoplay=1" 
                        width="100%" 
                        height="500" 
                        frameborder="0"
                        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                        allowfullscreen>
                </iframe>
            `;
        } else {
            // Если не удалось распарсить, показываем ссылку
            playerContainer.innerHTML = `
                <div style="text-align: center; padding: 50px; background: #f0f0f0;">
                    <p>Не удалось загрузить VK видео</p>
                    <a href="${this.escapeHtml(video.url)}" target="_blank" style="color: #4A76A8;">
                        Открыть в VK
                    </a>
                </div>
            `;
        }
    }
    
    pauseVideo() {
        const playerContainer = document.querySelector('.video-player-container');
        if (!playerContainer) return;
        
        // Останавливаем видео если это HTML5 плеер
        const videoPlayer = document.getElementById('videoPlayer');
        if (videoPlayer) {
            videoPlayer.pause();
        }
        
        // Очищаем контейнер и возвращаем обычный плеер
        playerContainer.innerHTML = '<video id="videoPlayer" controls><source src="" type="video/mp4">Ваш браузер не поддерживает видео.</video>';
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
                         onerror="this.onerror=null; this.src='https://via.placeholder.com/320x180?text=Video'">
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