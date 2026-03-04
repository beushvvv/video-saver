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
        
        select.innerHTML = '';
        
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
    
    openVideoLink(video) {
        window.open(video.url, '_blank', 'noopener,noreferrer');
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
        
        playerContainer.innerHTML = '';
        
        if (video.type === 'youtube') {
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
                    <div style="text-align: center; padding: 30px; background: linear-gradient(135deg, #FF0000, #CC0000); border-radius: 10px;">
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
        } 
        else if (video.type === 'vk') {
            const vkMatch = video.url.match(/video(-?\d+)_(\d+)/);
            
            if (vkMatch) {
                const ownerId = vkMatch[1];
                const videoId = vkMatch[2];
                const vkDirectUrl = `https://vk.com/video${ownerId}_${videoId}`;
                
                playerContainer.innerHTML = `
                    <div style="text-align: center; padding: 30px; background: linear-gradient(135deg, #4A76A8, #2A4F7C); border-radius: 10px;">
                        <i class="fab fa-vk" style="font-size: 60px; color: white; margin-bottom: 20px;"></i>
                        <p style="color: white; font-size: 18px; margin-bottom: 25px;">Для просмотра видео откройте его в VK</p>
                        <a href="${vkDirectUrl}" target="_blank" 
                           style="display: inline-block; padding: 15px 40px; background: white; color: #4A76A8; 
                                  text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 16px;
                                  transition: transform 0.3s; box-shadow: 0 4px 15px rgba(0,0,0,0.2);"
                           onmouseover="this.style.transform='scale(1.05)'"
                           onmouseout="this.style.transform='scale(1)'">
                            <i class="fab fa-vk"></i> Открыть ВКонтакте
                        </a>
                    </div>
                `;
            } else {
                playerContainer.innerHTML = `
                    <div style="text-align: center; padding: 30px; background: linear-gradient(135deg, #4A76A8, #2A4F7C); border-radius: 10px;">
                        <i class="fab fa-vk" style="font-size: 60px; color: white; margin-bottom: 20px;"></i>
                        <p style="color: white; font-size: 18px; margin-bottom: 25px;">Некорректная ссылка VK</p>
                        <a href="${this.escapeHtml(video.url)}" target="_blank" 
                           style="display: inline-block; padding: 15px 40px; background: white; color: #4A76A8; 
                                  text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 16px;
                                  transition: transform 0.3s; box-shadow: 0 4px 15px rgba(0,0,0,0.2);"
                           onmouseover="this.style.transform='scale(1.05)'"
                           onmouseout="this.style.transform='scale(1)'">
                            <i class="fab fa-vk"></i> Открыть ссылку
                        </a>
                    </div>
                `;
            }
        } 
        else if (video.type === 'tiktok') {
            playerContainer.innerHTML = `
                <div style="text-align: center; padding: 30px; background: linear-gradient(135deg, #25F4EE, #FE2C55); border-radius: 10px;">
                    <i class="fab fa-tiktok" style="font-size: 60px; color: white; margin-bottom: 20px;"></i>
                    <p style="color: white; font-size: 18px; margin-bottom: 25px;">Видео TikTok откроется в новой вкладке</p>
                    <a href="${this.escapeHtml(video.url)}" target="_blank" rel="noopener noreferrer"
                       style="display: inline-block; padding: 15px 40px; background: white; color: #000; 
                              text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 16px;
                              transition: transform 0.3s; box-shadow: 0 4px 15px rgba(0,0,0,0.2);"
                       onmouseover="this.style.transform='scale(1.05)'"
                       onmouseout="this.style.transform='scale(1)'">
                        <i class="fab fa-tiktok"></i> Открыть TikTok
                    </a>
                </div>
            `;
        } 
        else {
            playerContainer.innerHTML = `
                <div style="text-align: center; padding: 30px; background: linear-gradient(135deg, #666666, #333333); border-radius: 10px;">
                    <i class="fas fa-video" style="font-size: 60px; color: white; margin-bottom: 20px;"></i>
                    <p style="color: white; font-size: 18px; margin-bottom: 25px;">Неподдерживаемый тип видео</p>
                    <a href="${this.escapeHtml(video.url)}" target="_blank" 
                       style="display: inline-block; padding: 15px 40px; background: white; color: #333; 
                              text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 16px;
                              transition: transform 0.3s; box-shadow: 0 4px 15px rgba(0,0,0,0.2);"
                       onmouseover="this.style.transform='scale(1.05)'"
                       onmouseout="this.style.transform='scale(1)'">
                        <i class="fas fa-external-link-alt"></i> Открыть ссылку
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
                if (video) {
                    // Для YouTube открываем в плеере, для остальных - в новой вкладке
                    if (video.type === 'youtube') {
                        this.playVideo(video);
                    } else {
                        this.openVideoLink(video);
                    }
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