class VideoSaver {
    constructor() {
        this.videos = [];
        this.customCategories = [];
        this.currentCategory = 'all';
        this.currentVideo = null;
        
        this.init();
    }
    
    init() {
        this.loadData();
        this.bindEvents();
        this.render();
    }
    
    loadData() {
        // Загружаем видео из localStorage
        const savedVideos = localStorage.getItem('videos');
        this.videos = savedVideos ? JSON.parse(savedVideos) : [];
        
        // Загружаем категории
        const savedCategories = localStorage.getItem('categories');
        this.customCategories = savedCategories ? JSON.parse(savedCategories) : [];
    }
    
    saveData() {
        localStorage.setItem('videos', JSON.stringify(this.videos));
        localStorage.setItem('categories', JSON.stringify(this.customCategories));
    }
    
    bindEvents() {
        // Кнопка добавления видео
        document.getElementById('addVideoBtn').addEventListener('click', () => {
            this.openModal('videoModal');
        });
        
        // Закрытие модальных окон
        document.querySelector('.close').addEventListener('click', () => {
            this.closeModal('videoModal');
        });
        
        document.querySelector('.close-player').addEventListener('click', () => {
            this.closeModal('playerModal');
            this.pauseVideo();
        });
        
        // Форма добавления видео
        document.getElementById('videoForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addVideo();
        });
        
        // Поиск
        document.getElementById('searchBtn').addEventListener('click', () => {
            this.searchVideos();
        });
        
        document.getElementById('searchInput').addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                this.searchVideos();
            }
        });
        
        // Категории
        document.querySelectorAll('.sidebar nav ul li').forEach(item => {
            item.addEventListener('click', () => {
                this.setCategory(item.dataset.category);
            });
        });
        
        // Добавление категории
        document.getElementById('addCategoryBtn').addEventListener('click', () => {
            this.addCategory();
        });
        
        // Закрытие по клику вне модального окна
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeAllModals();
                this.pauseVideo();
            }
        });
    }
    
    addVideo() {
        const url = document.getElementById('videoUrl').value;
        const title = document.getElementById('videoTitle').value;
        const category = document.getElementById('videoCategory').value;
        const thumbnail = document.getElementById('videoThumbnail').value || this.generateThumbnail(url);
        
        const newVideo = {
            id: Date.now(),
            url: url,
            title: title,
            category: category,
            thumbnail: thumbnail,
            views: 0,
            date: new Date().toLocaleDateString('ru-RU'),
            duration: '00:00' // В реальном проекте нужно получать длительность видео
        };
        
        this.videos.unshift(newVideo);
        this.saveData();
        this.render();
        this.closeModal('videoModal');
        document.getElementById('videoForm').reset();
    }
    
    generateThumbnail(url) {
        // Заглушка для миниатюры
        return 'https://via.placeholder.com/320x180?text=Video+Thumbnail';
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
            const option = document.createElement('option');
            option.value = `custom_${newCategory.id}`;
            option.textContent = newCategory.name;
            select.appendChild(option);
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
        }
    }
    
    setCategory(category) {
        this.currentCategory = category;
        document.querySelectorAll('.sidebar nav ul li').forEach(item => {
            item.classList.toggle('active', item.dataset.category === category);
        });
        this.render();
    }
    
    searchVideos() {
        const query = document.getElementById('searchInput').value.toLowerCase();
        if (query) {
            const filtered = this.videos.filter(video => 
                video.title.toLowerCase().includes(query)
            );
            this.render(filtered);
        } else {
            this.render();
        }
    }
    
    playVideo(video) {
        this.currentVideo = video;
        video.views += 1;
        this.saveData();
        
        const player = document.getElementById('videoPlayer');
        player.src = video.url;
        document.getElementById('playerVideoTitle').textContent = video.title;
        document.getElementById('viewCount').textContent = video.views;
        document.getElementById('videoDate').textContent = video.date;
        
        this.openModal('playerModal');
        player.play();
    }
    
    pauseVideo() {
        const player = document.getElementById('videoPlayer');
        player.pause();
        player.src = '';
    }
    
    openModal(modalId) {
        document.getElementById(modalId).style.display = 'block';
    }
    
    closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }
    
    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }
    
    renderCategories() {
        const container = document.getElementById('customCategories');
        container.innerHTML = '';
        
        this.customCategories.forEach(category => {
            const div = document.createElement('div');
            div.className = 'custom-category';
            div.innerHTML = `
                <span>${category.name}</span>
                <span class="delete-category" onclick="videoSaver.deleteCategory(${category.id})">
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
    
    render(filteredVideos = null) {
        const grid = document.getElementById('videosGrid');
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
                    <img src="${video.thumbnail}" alt="${video.title}">
                    <span class="duration">${video.duration}</span>
                </div>
                <div class="video-info">
                    <h3 class="video-title">${video.title}</h3>
                    <div class="video-meta">
                        <span><i class="fas fa-eye"></i> ${video.views}</span>
                        <span class="video-category">${this.getCategoryName(video.category)}</span>
                    </div>
                </div>
            </div>
        `).join('');
        
        // Добавляем обработчики для карточек
        grid.querySelectorAll('.video-card').forEach(card => {
            card.addEventListener('click', () => {
                const video = this.videos.find(v => v.id === parseInt(card.dataset.id));
                if (video) this.playVideo(video);
            });
        });
    }
    
    getCategoryName(categoryId) {
        if (categoryId === 'tiktok') return 'TikTok';
        if (categoryId === 'youtube') return 'YouTube Shorts';
        if (categoryId === 'edits') return 'Edit\'ы';
        if (categoryId.startsWith('custom_')) {
            const id = parseInt(categoryId.replace('custom_', ''));
            const category = this.customCategories.find(c => c.id === id);
            return category ? category.name : 'Другое';
        }
        return 'Все видео';
    }
}

// Инициализация
const videoSaver = new VideoSaver();