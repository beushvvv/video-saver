class VideoSaver {
    constructor() {
        this.videos = [];
        this.customCategories = [];
        this.currentCategory = 'all';
        this.currentVideo = null;
        this.editingVideoId = null;
        
        // Используем более надежный ключ для localStorage
        this.storageKey = 'videoSaverData';
        this.categoriesKey = 'videoSaverCategories';
        
        this.init();
    }
    
    init() {
        // Проверяем, что DOM полностью загружен
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
        this.setupImageFallback();
    }
    
    setupImageFallback() {
        // Глобальный обработчик для ошибок загрузки изображений
        window.addEventListener('error', (e) => {
            if (e.target.tagName === 'IMG') {
                e.target.src = 'https://via.placeholder.com/320x180?text=Video';
                e.target.onerror = null; // Предотвращаем бесконечный цикл
            }
        }, true);
    }
    
    loadData() {
        try {
            // Загружаем видео из localStorage с проверкой
            const savedVideos = localStorage.getItem(this.storageKey);
            this.videos = savedVideos ? JSON.parse(savedVideos) : [];
            
            // Загружаем категории
            const savedCategories = localStorage.getItem(this.categoriesKey);
            this.customCategories = savedCategories ? JSON.parse(savedCategories) : [];
            
            // Валидация данных
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
    
    bindEvents() {
        // Проверяем существование элементов перед добавлением событий
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
        
        // Категории
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
    
    getYouTubeId(url) {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2] && match[2].length === 11) ? match[2] : null;
    }
    
    async getVKVideoInfo(vkUrl) {
        // Для GitHub Pages используем JSONP или прокси
        // Этот метод может не работать из-за CORS, поэтому делаем fallback
        return new Promise((resolve) => {
            // Пробуем получить через oembed, но с обработкой ошибок
            fetch(`https://vk.com/oembed?url=${encodeURIComponent(vkUrl)}&format=json`)
                .then(response => response.json())
                .then(data => resolve({
                    title: data.title || 'VK Video',
                    thumbnail: data.thumbnail_url || null
                }))
                .catch(() => resolve({
                    title: 'VK Video',
                    thumbnail: null
                }));
        });
    }
    
    generateThumbnail(url, title = '') {
        const type = this.getVideoType(url);
        const encodedTitle = encodeURIComponent(title || 'Video');
        
        // Используем надежные заглушки с via.placeholder.com
        const placeholders = {
            youtube: `https://via.placeholder.com/320x180/FF0000/FFFFFF?text=YouTube`,
            tiktok: `https://via.placeholder.com/320x180/000000/FFFFFF?text=TikTok`,
            vk: `https://via.placeholder.com/320x180/4A76A8/FFFFFF?text=VK`,
            other: `https://via.placeholder.com/320x180/666666/FFFFFF?text=${encodedTitle}`
        };
        
        if (type === 'youtube') {
            const videoId = this.getYouTubeId(url);
            if (videoId) {
                return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`; // Используем mqdefault вместо maxresdefault для надежности
            }
        }
        
        return placeholders[type] || placeholders.other;
    }
    
    async addVideo() {
        const url = document.getElementById('videoUrl')?.value;
        if (!url) return;
        
        let title = document.getElementById('videoTitle')?.value;
        const category = document.getElementById('videoCategory')?.value || 'all';
        let thumbnail = document.getElementById('videoThumbnail')?.value;
        
        // Если это VK видео, пробуем получить информацию
        if (url.includes('vk.com/video')) {
            const vkInfo = await this.getVKVideoInfo(url);
            if (vkInfo) {
                title = title || vkInfo.title || 'VK Video';
                thumbnail = thumbnail || vkInfo.thumbnail;
            }
        }
        
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
            duration: '00:00'
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
    
    async updateVideo() {
        if (!this.editingVideoId) return;
        
        const url = document.getElementById('videoUrl')?.value;
        const title = document.getElementById('videoTitle')?.value;
        const category = document.getElementById('videoCategory')?.value;
        let thumbnail = document.getElementById('videoThumbnail')?.value;
        
        const videoIndex = this.videos.findIndex(v => v.id === this.editingVideoId);
        if (videoIndex === -1) return;
        
        // Обновляем видео
        this.videos[videoIndex] = {
            ...this.videos[videoIndex],
            url: url || this.videos[videoIndex].url,
            title: title || this.videos[videoIndex].title,
            category: category || this.videos[videoIndex].category,
            thumbnail: thumbnail || this.videos[videoIndex].thumbnail,
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
            
            // Добавляем в выпадающий список
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
            
            // Обновляем категории видео
            this.videos.forEach(video => {
                if (video.category === `custom_${categoryId}`) {
                    video.category = 'all';
                }
            });
            
            this.saveData();
            this.renderCategories();
            this.render();
            
            // Удаляем из выпадающего списка
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
        
        const player = document.getElementById('videoPlayer');
        const playerTitle = document.getElementById('playerVideoTitle');
        const viewCount = document.getElementById('viewCount');
        const videoDate = document.getElementById('videoDate');
        
        if (player) {
            // Для VK видео используем iframe, для остальных - обычный плеер
            if (video.url.includes('vk.com')) {
                this.showVKPlayer(video);
            } else {
                player.src = video.url;
                if (playerTitle) playerTitle.textContent = video.title || 'Без названия';
                if (viewCount) viewCount.textContent = video.views;
                if (videoDate) videoDate.textContent = video.date || new Date().toLocaleDateString('ru-RU');
                
                this.openModal('playerModal');
                player.play().catch(e => console.log('Автовоспроизведение не удалось:', e));
            }
        }
    }
    
    showVKPlayer(video) {
        const playerContainer = document.querySelector('.video-player-container');
        if (!playerContainer) return;
        
        // Извлекаем ID видео из ссылки VK
        const matches = video.url.match(/video(-?\d+)_(\d+)/);
        if (matches) {
            const ownerId = matches[1];
            const videoId = matches[2];
            
            playerContainer.innerHTML = `
                <iframe src="https://vk.com/video_ext.php?oid=${ownerId}&id=${videoId}&hd=1" 
                        width="100%" 
                        height="500" 
                        frameborder="0"
                        allowfullscreen>
                </iframe>
            `;
        } else {
            playerContainer.innerHTML = `<video controls src="${video.url}"></video>`;
        }
        
        document.getElementById('playerVideoTitle').textContent = video.title || 'Без названия';
        document.getElementById('viewCount').textContent = video.views;
        document.getElementById('videoDate').textContent = video.date || new Date().toLocaleDateString('ru-RU');
        
        this.openModal('playerModal');
    }
    
    pauseVideo() {
        const player = document.getElementById('videoPlayer');
        if (player) {
            player.pause();
            player.src = '';
        }
        
        // Очищаем iframe VK
        const playerContainer = document.querySelector('.video-player-container');
        if (playerContainer) {
            playerContainer.innerHTML = '<video id="videoPlayer" controls><source src="" type="video/mp4">Ваш браузер не поддерживает видео.</video>';
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
                    <img src="${this.escapeHtml(video.thumbnail || this.generateThumbnail(video.url, video.title))}" 
                         alt="${this.escapeHtml(video.title)}"
                         loading="lazy"
                         onerror="this.onerror=null; this.src='https://via.placeholder.com/320x180?text=Video'">
                    <span class="duration">${video.duration || '00:00'}</span>
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

// Создаем глобальный экземпляр после загрузки страницы
let videoSaver;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        videoSaver = new VideoSaver();
    });
} else {
    videoSaver = new VideoSaver();
}