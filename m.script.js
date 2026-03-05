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
                this.addVideo();
            });
        }
        
        // Загрузка файла - ОБНОВЛЕННАЯ ЛОГИКА
        const uploadArea = document.getElementById('fileUploadArea');
        const fileInput = document.getElementById('videoFile');
        
        if (uploadArea && fileInput) {
            // Убираем старый обработчик и вешаем новый
            uploadArea.onclick = (e) => {
                e.preventDefault();
                fileInput.click();
            };
            
            fileInput.onchange = (e) => {
                const files = e.target.files;
                if (files && files.length > 0) {
                    this.selectedFile = files[0]; // Сохраняем файл в свойство класса
                    
                    // Обновляем отображение
                    uploadArea.innerHTML = `
                        <i class="fas fa-check-circle" style="color: #4CAF50; font-size: 40px;"></i>
                        <p style="font-weight: bold; margin: 5px 0;">${this.selectedFile.name}</p>
                        <small>${(this.selectedFile.size / 1024 / 1024).toFixed(2)} МБ</small>
                    `;
                    
                    // Автоматически заполняем название из имени файла (если поле пустое)
                    const titleInput = document.getElementById('videoTitle');
                    if (titleInput && !titleInput.value) {
                        // Убираем расширение файла
                        const fileName = this.selectedFile.name.replace(/\.[^/.]+$/, "");
                        titleInput.value = fileName;
                    }
                    
                    console.log('📁 Выбран файл:', this.selectedFile.name);
                }
            };
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
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Б';
        const k = 1024;
        const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    async uploadVideoFile(file, videoData) {
        console.log('📤 Загрузка файла:', file.name);
        
        return new Promise((resolve, reject) => {
            if (file.size > 50 * 1024 * 1024) {
                this.showToast('❌ Файл больше 50 МБ');
                reject('Файл слишком большой');
                return;
            }
            
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const videoId = Date.now();
                
                // Сохраняем в IndexedDB если доступна
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
        console.log('📝 Добавление видео...');
        
        const urlInput = document.getElementById('videoUrl');
        const titleInput = document.getElementById('videoTitle');
        const categorySelect = document.getElementById('videoCategory');
        const thumbnailInput = document.getElementById('videoThumbnail');
        
        const url = urlInput ? urlInput.value.trim() : '';
        const title = titleInput ? titleInput.value.trim() : '';
        const category = categorySelect ? categorySelect.value : 'other';
        const thumbnail = thumbnailInput ? thumbnailInput.value.trim() : '';
        
        // Проверяем, есть ли выбранный файл
        const hasFile = this.selectedFile !== null;
        
        console.log('URL:', url, 'Длина:', url.length);
        console.log('Файл:', hasFile ? this.selectedFile.name : 'нет');
        
        // Если нет ни ссылки, ни файла - показываем ошибку
        if (!url && !hasFile) {
            this.showToast('❌ Введите ссылку или выберите файл');
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
                
                // Очищаем выбранный файл после загрузки
                this.selectedFile = null;
                
                this.closeModal('videoModal');
                this.resetForm();
            } catch (error) {
                console.error('Ошибка загрузки:', error);
            }
            return;
        }
        
        // Если есть ссылка - добавляем по ссылке
        if (url) {
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
            this.closeModal('videoModal');
            this.resetForm();
            this.showToast('✅ Ссылка сохранена');
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
        
        if (video.type === 'local') {
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
                    
                    request.onerror = () => {
                        container.innerHTML = '<p style="color:white; padding:20px;">❌ Ошибка загрузки</p>';
                    };
                } catch (err) {
                    container.innerHTML = '<p style="color:white; padding:20px;">❌ Ошибка плеера</p>';
                }
            }
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
        } else {
            container.innerHTML = `
                <div style="text-align:center; color:white; padding:40px;">
                    <p style="margin-bottom:20px;">🎬 Видео из ${video.type.toUpperCase()}</p>
                    <a href="${video.url}" target="_blank" style="color:#ff0000; font-size:18px; text-decoration:none;">
                        Открыть в приложении →
                    </a>
                </div>
            `;
        }
        
        this.openModal('playerModal');
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
                    
                    // Обновляем активный чип
                    document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
                    
                    this.render();
                }
            });
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
        
        grid.innerHTML = videos.map(v => `
            <div class="video-card" data-id="${v.id}">
                <img src="${v.thumbnail}" loading="lazy" onerror="this.src='${this.defaultThumbnails[v.type] || this.defaultThumbnails.other}'">
                <div class="video-badge ${v.type}">
                    ${v.type === 'vk' ? 'VK' : v.type === 'youtube' ? 'YT' : v.type === 'tiktok' ? 'TT' : '📱'}
                </div>
                <div class="video-overlay">
                    <div class="video-title">${v.title}</div>
                    <div class="video-meta">
                        <span><i class="fas fa-eye"></i> ${v.views}</span>
                        <span>${v.date}</span>
                    </div>
                </div>
            </div>
        `).join('');
        
        document.querySelectorAll('.video-card').forEach(card => {
            card.addEventListener('click', (e) => {
                e.preventDefault();
                const video = this.videos.find(v => v.id === parseInt(card.dataset.id));
                if (video) this.playVideo(video);
            });
        });
    }
    
    pauseVideo() {
        const container = document.getElementById('videoPlayerContainer');
        if (container) container.innerHTML = '';
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
        
        // Сбрасываем выбранный файл
        this.selectedFile = null;
        
        // Разблокируем поле URL если было заблокировано
        const urlInput = document.getElementById('videoUrl');
        if (urlInput) urlInput.disabled = false;
        
        this.editingVideoId = null;
        
        const modalTitle = document.getElementById('modalTitle');
        if (modalTitle) modalTitle.textContent = 'Добавить видео';
        
        const saveBtn = document.getElementById('saveVideoBtn');
        if (saveBtn) saveBtn.textContent = 'Сохранить';
        
        // Сброс области загрузки
        const uploadArea = document.getElementById('fileUploadArea');
        if (uploadArea) {
            uploadArea.innerHTML = `
                <i class="fas fa-cloud-upload-alt"></i>
                <p>Нажмите для выбора файла</p>
                <small>MP4, 3GP, MOV до 50 МБ</small>
            `;
        }
    }
    
    showToast(text) {
        const toast = document.createElement('div');
        toast.className = 'mobile-toast';
        toast.textContent = text;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
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