 // IndexedDB 操作
        let db;
        let currentWallpaper = null;
        // 日记功能相关变量
let diaries = [];
let currentViewingDiaryId = null;

// ============ 强制修复版：数据库初始化 (版本号 25) ============
function initDB() {
    // ★★★ 重点：版本号改成 25，强制触发更新！ ★★★
    const request = indexedDB.open('phoneData', 28);
    
    request.onerror = (event) => {
        console.error('数据库打开失败', event);
        alert('数据库打开失败，请尝试清除浏览器缓存或刷新页面');
    };
    
    request.onsuccess = (event) => {
        db = event.target.result;
        console.log('数据库连接成功，版本:', db.version);
        
        // 连接成功后加载所有数据
        loadUserInfo();
        loadWallpaper();
        loadWorldbooks();
        loadApiConfig();
        loadApiSchemes();
        loadAppIcons();
        loadWalletData();
        loadWidgetSettings();
         loadFontSettings();
    
        
        // ★ 尝试加载记忆，检查是否正常
        if (db.objectStoreNames.contains('memories')) {
            loadMemories();
        } else {
            console.error('严重警告：memories 表依然不存在！请检查 onupgradeneeded 是否执行。');
        }
        // ▼▼▼ 新增：启动自动总结定时器 ▼▼▼
setTimeout(() => {
    startAutoSummaryTimer();
}, 2000); 

    };
    
    // ★★★ 这里是创建新表的核心逻辑 ★★★
    request.onupgradeneeded = (event) => {
        console.log('正在升级数据库...');
        db = event.target.result; 
        
        // 依次检查并创建所有表，缺哪个补哪个
        if (!db.objectStoreNames.contains('userInfo')) db.createObjectStore('userInfo', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('wallpaper')) db.createObjectStore('wallpaper', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('worldbooks')) db.createObjectStore('worldbooks', { keyPath: 'id', autoIncrement: true });
        if (!db.objectStoreNames.contains('categories')) db.createObjectStore('categories', { keyPath: 'id', autoIncrement: true });
        if (!db.objectStoreNames.contains('apiConfig')) db.createObjectStore('apiConfig', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('apiSchemes')) db.createObjectStore('apiSchemes', { keyPath: 'id', autoIncrement: true });
        if (!db.objectStoreNames.contains('chats')) db.createObjectStore('chats', { keyPath: 'id', autoIncrement: true });
        if (!db.objectStoreNames.contains('messages')) db.createObjectStore('messages', { keyPath: 'id', autoIncrement: true });
        if (!db.objectStoreNames.contains('characterInfo')) db.createObjectStore('characterInfo', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('appIcons')) db.createObjectStore('appIcons', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('diaries')) db.createObjectStore('diaries', { keyPath: 'id', autoIncrement: true });
        if (!db.objectStoreNames.contains('emojis')) db.createObjectStore('emojis', { keyPath: 'id', autoIncrement: true });
        if (!db.objectStoreNames.contains('emojiCategories')) db.createObjectStore('emojiCategories', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('callSettings')) db.createObjectStore('callSettings', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('products')) db.createObjectStore('products', { keyPath: 'id', autoIncrement: true });
        if (!db.objectStoreNames.contains('shoppingCart')) db.createObjectStore('shoppingCart', { keyPath: 'id', autoIncrement: true });
        if (!db.objectStoreNames.contains('shoppingCategories')) db.createObjectStore('shoppingCategories', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('wallet')) db.createObjectStore('wallet', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('gameConsole')) db.createObjectStore('gameConsole', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('widgetSettings')) db.createObjectStore('widgetSettings', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('voiceConfig')) db.createObjectStore('voiceConfig', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('fontSettings')) db.createObjectStore('fontSettings', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('notificationSound')) db.createObjectStore('notificationSound', { keyPath: 'id' });



        
        // ★★★ 记忆功能表 (本次修复的主角) ★★★
        if (!db.objectStoreNames.contains('memories')) {
            console.log('正在创建 memories 表...');
            const store = db.createObjectStore('memories', { keyPath: 'id', autoIncrement: true });
            store.createIndex('chatId', 'chatId', { unique: false });
        }
    };
    // 页面加载完成后，强制显示主屏幕
window.addEventListener('load', function() {
    // 隐藏所有页面
    document.getElementById('wallpaperScreen').style.display = 'none';
    document.getElementById('worldbookScreen').style.display = 'none';
    document.getElementById('apiScreen').style.display = 'none';
    document.getElementById('chatScreen').style.display = 'none';
    document.getElementById('chatDetailScreen').style.display = 'none';
    document.getElementById('characterInfoScreen').style.display = 'none';
    document.getElementById('memoryScreen').style.display = 'none';
    document.getElementById('diaryScreen').style.display = 'none';
    document.getElementById('diaryDetailScreen').style.display = 'none';
    document.getElementById('callScreen').style.display = 'none';
    document.getElementById('shoppingScreen').style.display = 'none';
    document.getElementById('shoppingCartScreen').style.display = 'none';
    
    const otherScreen = document.getElementById('otherSettingsScreen');
    if (otherScreen) otherScreen.style.display = 'none';
    
    const beautifyScreen = document.getElementById('beautifySettingsScreen');
    if (beautifyScreen) beautifyScreen.style.display = 'none';
    
    // 显示主屏幕
    document.getElementById('mainScreen').style.display = 'flex';
});

}


function saveToDB(storeName, data) {
    const transaction = db.transaction([storeName], 'readwrite');
    const objectStore = transaction.objectStore(storeName);
    
    if (storeName === 'worldbooks' || storeName === 'categories' || storeName === 'chats' || storeName === 'messages' || storeName === 'products' || storeName === 'shoppingCart') {
        objectStore.put({ id: 1, list: data.list || data });
    } else if (storeName === 'characterInfo') {
        // ★ 修复：characterInfo 需要特殊处理，确保保留 id 字段
        const saveData = data.id ? data : { id: 1, ...data };
        objectStore.put(saveData);
    } else {
        objectStore.put({ id: 1, ...data });
    }
}


function loadFromDB(storeName, callback) {
    const transaction = db.transaction([storeName], 'readonly');
    const objectStore = transaction.objectStore(storeName);
    const request = objectStore.get(1);
    
  request.onsuccess = () => {
    if (storeName === 'worldbooks' || storeName === 'categories' || storeName === 'products' || storeName === 'shoppingCart' || storeName === 'memories') {

            // ★ 修复：确保返回数组，多重检查
            if (request.result && Array.isArray(request.result.list)) {
                callback(request.result.list);
            } else if (request.result && Array.isArray(request.result)) {
                callback(request.result);
            } else {
                callback([]);
            }
        } else {
            callback(request.result);
        }
    };
}



        
        // 页面切换
function openApp(appName) {
    if (appName === 'wallpaper') {
        document.getElementById('mainScreen').style.display = 'none';
        document.getElementById('wallpaperScreen').style.display = 'flex';
        updateWallpaperPreview();
        updateAllIcons(); 
    } else if (appName === 'world') {
        document.getElementById('mainScreen').style.display = 'none';
        document.getElementById('worldbookScreen').style.display = 'flex';
        loadWorldbooks();
    } else if (appName === 'api') {
        document.getElementById('mainScreen').style.display = 'none';
        document.getElementById('apiScreen').style.display = 'flex';
        loadApiConfig();
        renderApiSchemes();
    } else if (appName === 'chat') {
        document.getElementById('mainScreen').style.display = 'none';
        document.getElementById('chatScreen').style.display = 'flex';
        loadChats();
    } 
    // ▼▼▼ 新增：其他设置页面的跳转逻辑 ▼▼▼
    else if (appName === 'otherSettings') {
        document.getElementById('mainScreen').style.display = 'none';
        document.getElementById('otherSettingsScreen').style.display = 'flex';
    }
    // ▲▲▲ 新增结束 ▲▲▲
    else {
        alert(`点击了${appName}应用`);
    }
}

        
function backToMain() {
    // 隐藏所有页面
    document.getElementById('wallpaperScreen').style.display = 'none';
    document.getElementById('worldbookScreen').style.display = 'none';
    document.getElementById('apiScreen').style.display = 'none';
    document.getElementById('chatScreen').style.display = 'none';
    
    // ▼▼▼ 新增：隐藏其他设置页面 ▼▼▼
    const otherScreen = document.getElementById('otherSettingsScreen');
    if (otherScreen) otherScreen.style.display = 'none';
    // ▲▲▲ 新增结束 ▲▲▲

    // 显示主屏幕
    document.getElementById('mainScreen').style.display = 'flex';
}
  
        // 壁纸功能
// 修复壁纸页面的 Tab 切换
function switchTab(tabName) {
    // ▼▼▼ 修复点：类名改为 .ins-tab-btn ▼▼▼
    document.querySelectorAll('.ins-tab-btn').forEach(btn => btn.classList.remove('active'));
    
    // 给当前点击的按钮加 active
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
    // 切换内容区域 (内容区域的类名 tab-content 没变，保持原样即可)
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(tabName + 'Tab').classList.add('active');
}

// 修复图标编辑页面的 Tab 切换
function switchIconTab(tab) {
    // ▼▼▼ 修复点：这里也是 .ins-tab-btn ▼▼▼
    document.querySelectorAll('#iconEditorModal .ins-tab-btn').forEach(btn => btn.classList.remove('active'));
    
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
    document.querySelectorAll('#iconEditorModal .tab-content').forEach(content => content.classList.remove('active'));
    if (tab === 'local') {
        document.getElementById('iconLocalTab').classList.add('active');
    } else if (tab === 'url') {
        document.getElementById('iconUrlTab').classList.add('active');
    }
}
        function updateWallpaperPreview() {
            const preview = document.getElementById('wallpaperPreview');
            if (currentWallpaper) {
                preview.innerHTML = `<img src="${currentWallpaper}" alt="壁纸预览">`;
            } else {
                preview.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            }
        }
        
        function saveWallpaper() {
            const fileInput = document.getElementById('wallpaperFile');
            const urlInput = document.getElementById('wallpaperUrl');
            
            if (fileInput.files[0]) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    currentWallpaper = e.target.result;
                    applyWallpaper(currentWallpaper);
                    saveToDB('wallpaper', { data: currentWallpaper, type: 'local' });
                    backToMain();
                };
                reader.readAsDataURL(fileInput.files[0]);
            } else if (urlInput.value) {
                currentWallpaper = urlInput.value;
                applyWallpaper(currentWallpaper);
                saveToDB('wallpaper', { data: currentWallpaper, type: 'url' });
                backToMain();
            } else {
                alert('请选择图片或输入网址');
            }
        }
        
/* 修改 applyWallpaper 函数 */
function applyWallpaper(wallpaperData) {
    // 1. 获取手机屏幕容器
    const screen = document.querySelector('.phone-screen');
    
    if (wallpaperData) {
        // 2. 把壁纸应用到 screen 而不是 body
        screen.style.background = `url(${wallpaperData}) center/cover no-repeat`;
    } else {
        // 3. 恢复默认渐变
        screen.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }
}
        function loadWallpaper() {
            loadFromDB('wallpaper', (data) => {
                if (data && data.data) {
                    currentWallpaper = data.data;
                    applyWallpaper(currentWallpaper);
                }
            });
        }
        
        // 文件预览
        document.getElementById('wallpaperFile').addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    document.getElementById('wallpaperPreview').innerHTML = `<img src="${e.target.result}" alt="预览">`;
                };
                reader.readAsDataURL(file);
            }
        });
        
        document.getElementById('wallpaperUrl').addEventListener('input', function(e) {
            const url = e.target.value;
            if (url) {
                document.getElementById('wallpaperPreview').innerHTML = `<img src="${url}" alt="预览" onerror="this.style.display='none'">`;
            }
        });
        
        // 用户信息功能
        function openEditModal() {
            document.getElementById('editModal').style.display = 'flex';
            loadCurrentInfo();
        }
        
        function closeModal(event) {
            if (event && event.target !== event.currentTarget) return;
            document.getElementById('editModal').style.display = 'none';
        }
        
   function loadCurrentInfo() {
    document.getElementById('userIdInput').value = document.getElementById('mainUserId').textContent;
    document.getElementById('signatureInput').value = document.getElementById('mainSignature').textContent;
    
    // 加载当前颜色
    loadFromDB('userInfo', (data) => {
        if (data) {
            const textColor = data.textColor || '#ffffff';
            const appTextColor = data.appTextColor || '#ffffff';
            
            document.getElementById('textColorInput').value = textColor;
            document.getElementById('appTextColorInput').value = appTextColor;
            
            // 同步预览框颜色
            document.getElementById('textColorPreview').style.background = textColor;
            document.getElementById('appTextColorPreview').style.background = appTextColor;
        }
    });
}


        
 function saveUserInfo() {
    const userId = document.getElementById('userIdInput').value || '我的小手机';
    const signature = document.getElementById('signatureInput').value || '今天也要开心呀～';
    const textColor = document.getElementById('textColorInput').value;
    const appTextColor = document.getElementById('appTextColorInput').value;
    const avatarFile = document.getElementById('avatarInput').files[0];
    
    if (avatarFile) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const avatarData = e.target.result;
            updateUI(userId, signature, avatarData, textColor, appTextColor);
            saveToDB('userInfo', { userId, signature, avatar: avatarData, textColor, appTextColor });
            // 触发全局头像更新事件
window.dispatchEvent(new StorageEvent('storage', {
    key: 'userAvatar',
    newValue: avatarData
}));

          closeModal();
        };
        reader.readAsDataURL(avatarFile);
    } else {
        // 没有新头像，保留原有头像
        loadFromDB('userInfo', (data) => {
            const existingAvatar = data ? data.avatar : null;
            updateUI(userId, signature, existingAvatar, textColor, appTextColor);
            saveToDB('userInfo', { userId, signature, avatar: existingAvatar, textColor, appTextColor });
            closeModal();
        });
    }
}

        
    function updateUI(userId, signature, avatar, textColor, appTextColor) {
    document.getElementById('mainUserId').textContent = userId;
    document.getElementById('mainSignature').textContent = signature;
    
    if (avatar) {
        document.getElementById('mainAvatar').innerHTML = `<img src="${avatar}" alt="头像">`;
    }
    
    // 应用字体颜色
    if (textColor) {
        document.getElementById('mainUserId').style.color = textColor;
        document.getElementById('mainSignature').style.color = textColor;
    }
    
    // 应用App图标字体颜色
    if (appTextColor) {
        document.querySelectorAll('.app-name').forEach(el => {
            el.style.color = appTextColor;
        });
    }
}

     function loadUserInfo() {
    loadFromDB('userInfo', (data) => {
        if (data) {
            updateUI(data.userId, data.signature, data.avatar, data.textColor, data.appTextColor);
        }
    });
}

       // 监听用户头像更新事件
window.addEventListener('storage', function(e) {
    if (e.key === 'userAvatar' || !e.key) {
        loadUserInfo();
    }
});
 
        // 头像预览
        document.getElementById('avatarInput').addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    document.getElementById('avatarPreview').innerHTML = `<img src="${e.target.result}" alt="预览">`;
                };
                reader.readAsDataURL(file);
            }
        });
        // 世界书功能
let worldbooks = [];
let categories = ['默认分类'];
let currentCategory = 'all';
// API设置相关变量
let apiSchemes = [];
let currentApiConfig = {
    name: '',
    baseUrl: '',
    apiKey: '',
    models: [],
    defaultModel: ''
};


function loadWorldbooks() {
    loadFromDB('worldbooks', (data) => {
        worldbooks = data || [];
        renderWorldbooks();
    });
    loadFromDB('categories', (data) => {
        categories = data || ['默认分类'];
        renderCategories();
    });
}

function renderCategories() {
    const container = document.getElementById('categoryTags');
    
    // 生成“全部”标签
    let html = `<div class="ins-cat-pill ${currentCategory === 'all' ? 'active' : ''}" data-category="all">全部</div>`;
    
    // 生成其他分类标签
    categories.forEach(cat => {
        html += `<div class="ins-cat-pill ${currentCategory === cat ? 'active' : ''}" data-category="${cat}">${cat}</div>`;
    });
    
    // 生成“管理分类”标签 (用特殊样式区分，比如加个边框颜色)
    html += `<div class="ins-cat-pill" data-category="manage" style="border-style: dashed;">⚙ 管理</div>`;
    
    container.innerHTML = html;
    
    // 重新绑定点击事件
    container.querySelectorAll('.ins-cat-pill').forEach(tag => {
        tag.addEventListener('click', () => switchCategory(tag.dataset.category));
    });
}
function switchCategory(category) {
    if (category === 'manage') {
        openCategoryManager();
        return;
    }
    
    currentCategory = category;
    
    // ▼▼▼ 修复点：把原来的 .category-tag 改成 .ins-cat-pill ▼▼▼
    document.querySelectorAll('.ins-cat-pill').forEach(tag => tag.classList.remove('active'));
    
    // 找到当前点击的那个标签，加上 active 样式
    const activeTag = document.querySelector(`.ins-cat-pill[data-category="${category}"]`);
    if (activeTag) {
        activeTag.classList.add('active');
    }
    
    renderWorldbooks();
}
function renderWorldbooks() {
    const container = document.getElementById('worldbookList');
    const filtered = currentCategory === 'all' ? worldbooks : worldbooks.filter(wb => wb.category === currentCategory);
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding-top: 60px; opacity: 0.5;">
                <div style="font-size: 40px; margin-bottom: 10px;">🍃</div>
                <div style="font-size: 13px;">暂无内容</div>
            </div>`;
        return;
    }
    
    // 生成 Ins 风卡片
    container.innerHTML = filtered.map(wb => `
        <div class="ins-book-card">
            <div class="ins-book-header">
                <div class="ins-book-title">${wb.title}</div>
                <div class="ins-book-tag">${wb.category}</div>
            </div>
            
            <div class="ins-book-preview">${wb.content}</div>
            
            <div class="ins-book-actions">
                <button class="ins-action-btn ins-btn-edit" onclick="editWorldbook(${wb.id})">EDIT</button>
                <button class="ins-action-btn ins-btn-del" onclick="deleteWorldbook(${wb.id})">DELETE</button>
            </div>
        </div>
    `).join('');
}
function openAddWorldbook() {
    alert('添加世界书功能开发中...');
}

function editWorldbook(id) {
    alert(`编辑世界书 ${id}`);
}

function deleteWorldbook(id) {
    if (confirm('确定删除这个世界书吗？')) {
        worldbooks = worldbooks.filter(wb => wb.id !== id);
        saveToDB('worldbooks', worldbooks);
        renderWorldbooks();
    }
}
let editingWorldbookId = null;

function openAddWorldbook() {
    editingWorldbookId = null;
    document.getElementById('worldbookModalTitle').textContent = '添加世界书';
    document.getElementById('worldbookTitle').value = '';
    document.getElementById('worldbookContent').value = '';
    updateCategorySelect();
    document.getElementById('worldbookModal').style.display = 'flex';
}

function editWorldbook(id) {
    const worldbook = worldbooks.find(wb => wb.id === id);
    if (worldbook) {
        editingWorldbookId = id;
        document.getElementById('worldbookModalTitle').textContent = '编辑世界书';
        document.getElementById('worldbookTitle').value = worldbook.title;
        document.getElementById('worldbookContent').value = worldbook.content;
        document.getElementById('worldbookCategory').value = worldbook.category;
        updateCategorySelect();
        document.getElementById('worldbookModal').style.display = 'flex';
    }
}

function closeWorldbookModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('worldbookModal').style.display = 'none';
}

function updateCategorySelect() {
    const select = document.getElementById('worldbookCategory');
    select.innerHTML = categories.map(cat => 
        `<option value="${cat}">${cat}</option>`
    ).join('');
}

function saveWorldbook() {
    const title = document.getElementById('worldbookTitle').value.trim();
    const content = document.getElementById('worldbookContent').value.trim();
    const category = document.getElementById('worldbookCategory').value;
    
    if (!title || !content) {
        alert('请填写标题和内容');
        return;
    }
    
    // 确保 worldbooks 是数组
    if (!Array.isArray(worldbooks)) {
        worldbooks = [];
    }

    if (editingWorldbookId) {
        // 编辑现有世界书
        const index = worldbooks.findIndex(wb => wb.id === editingWorldbookId);
        if (index > -1) {
            worldbooks[index] = { ...worldbooks[index], title, content, category };
        }
    } else {
        // 添加新世界书
        // ▼▼▼ 优化：防止 id 重复或计算错误 ▼▼▼
        const newId = worldbooks.length > 0 ? Math.max(...worldbooks.map(wb => wb.id || 0)) + 1 : 1;
        worldbooks.push({ 
            id: newId, 
            title, 
            content, 
            category, 
            createTime: new Date().toISOString() 
        });
    }
    
    // 保存并刷新
    saveToDB('worldbooks', worldbooks);
    
    // ▼▼▼ 关键：如果当前不在这个分类下，自动切过去，不然你看不到新加的 ▼▼▼
    if (currentCategory !== 'all' && currentCategory !== category) {
        switchCategory(category); // 自动切到对应分类
    } else {
        renderWorldbooks(); // 就在当前分类，直接刷新
    }
    
    closeWorldbookModal();
    // alert('保存成功！'); // 不需要弹窗，直接看效果更流畅
}

// 分类管理功能
function openCategoryManager() {
    renderCategoryList();
    document.getElementById('categoryModal').style.display = 'flex';
}

function closeCategoryModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('categoryModal').style.display = 'none';
}

function renderCategoryList() {
    const container = document.getElementById('categoryList');
    
    // ▼▼▼ 优化：Ins 风格的列表布局 ▼▼▼
    container.innerHTML = categories.map(cat => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 0; border-bottom: 1px solid #f5f5f5;">
            <span style="font-size: 15px; color: #333; font-weight: 500;">${cat}</span>
            ${cat !== '默认分类' ? 
                `<button class="ins-action-btn ins-btn-del" onclick="deleteCategory('${cat}')" style="padding: 6px 14px; font-size: 12px;">删除</button>` 
                : '<span style="font-size: 12px; color: #ccc; background: #f9f9f9; padding: 4px 8px; border-radius: 6px;">系统默认</span>'}
        </div>
    `).join('');
}

function addCategory() {
    const name = document.getElementById('newCategoryName').value.trim();
    
    if (!name) {
        alert('请输入分类名称');
        return;
    }
    if (categories.includes(name)) {
        alert('这个分类已经存在啦');
        return;
    }
    
    categories.push(name);
    
    // 保存
    saveToDB('categories', categories);
    
    // 刷新所有相关界面
    renderCategories();      // 顶部条
    renderCategoryList();    // 弹窗列表
    
    // 清空输入框
    document.getElementById('newCategoryName').value = '';
}

function deleteCategory(categoryName) {
    if (confirm(`确定删除分类 "${categoryName}" 吗？\n该分类下的世界书将移动到默认分类。`)) {
        // 1. 数据处理：把该分类下的内容移到默认分类
        if (Array.isArray(worldbooks)) {
            worldbooks.forEach(wb => {
                if (wb.category === categoryName) {
                    wb.category = '默认分类';
                }
            });
        }
        
        // 2. 从列表中移除
        categories = categories.filter(cat => cat !== categoryName);
        
        // 3. ▼▼▼ 关键修复：如果删的是当前正选中的，立刻切回 'all' ▼▼▼
        if (currentCategory === categoryName) {
            currentCategory = 'all';
        }
        
        // 4. 保存数据
        saveToDB('categories', categories);
        saveToDB('worldbooks', worldbooks);
        
        // 5. 刷新界面
        renderCategories();      // 刷新顶部的胶囊条
        renderCategoryList();    // 刷新弹窗里的列表
        renderWorldbooks();      // 刷新主列表内容
    }
}
// API设置功能函数
function loadApiConfig() {
    loadFromDB('apiConfig', (data) => {
        if (data) {
            currentApiConfig = data;
            updateApiForm();
        }
    });
}

function loadApiSchemes() {
    loadFromDB('apiSchemes', (data) => {
        // 确保返回数组
        if (Array.isArray(data)) {
            apiSchemes = data;
        } else if (data && data.list) {
            apiSchemes = data.list;
        } else {
            apiSchemes = [];
        }
        renderApiSchemes();
    });
}

function renderApiSchemes() {
    const select = document.getElementById('apiSchemeSelect');
    select.innerHTML = '<option value="">选择方案</option>';
    apiSchemes.forEach(scheme => {
        select.innerHTML += `<option value="${scheme.id}">${scheme.name}</option>`;
    });
}

function updateApiForm() {
    document.getElementById('apiName').value = currentApiConfig.name || '';
    document.getElementById('apiBaseUrl').value = currentApiConfig.baseUrl || '';
    document.getElementById('apiKey').value = currentApiConfig.apiKey || '';
    
    if (currentApiConfig.models && currentApiConfig.models.length > 0) {
        const modelSelect = document.getElementById('modelSelect');
        modelSelect.innerHTML = currentApiConfig.models.map(model => 
            `<option value="${model}" ${model === currentApiConfig.defaultModel ? 'selected' : ''}>${model}</option>`
        ).join('');
        document.getElementById('modelGroup').style.display = 'block';
    }
}

function newScheme() {
    currentApiConfig = { name: '', baseUrl: '', apiKey: '', models: [], defaultModel: '' };
    updateApiForm();
    document.getElementById('apiSchemeSelect').value = '';
}

function deleteScheme() {
    const selectId = document.getElementById('apiSchemeSelect').value;
    if (!selectId) {
        alert('请先选择要删除的方案');
        return;
    }
    
    if (confirm('确定删除这个方案吗？')) {
        apiSchemes = apiSchemes.filter(s => s.id != selectId);
      const transaction = db.transaction(['apiSchemes'], 'readwrite');
const objectStore = transaction.objectStore('apiSchemes');
objectStore.put({ id: 1, list: apiSchemes });

        renderApiSchemes();
        newScheme();
    }
}
async function getModels() {
    const baseUrl = document.getElementById('apiBaseUrl').value.trim();
    const apiKey = document.getElementById('apiKey').value.trim();
    
    if (!baseUrl || !apiKey) {
        alert('请先填写反代地址和API密钥');
        return;
    }
    
    try {
        const url = baseUrl.endsWith('/') ? baseUrl + 'models' : baseUrl + '/models';
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('获取模型失败');
        }
        
        const data = await response.json();
        const models = data.data.map(model => model.id);
        
        currentApiConfig.models = models;
        const modelSelect = document.getElementById('modelSelect');
        modelSelect.innerHTML = models.map(model => 
            `<option value="${model}">${model}</option>`
        ).join('');
        document.getElementById('modelGroup').style.display = 'block';
        
        alert('成功获取 ' + models.length + ' 个模型');
    } catch (error) {
        alert('获取模型失败：' + error.message);
    }
}

async function testConnection() {
    const baseUrl = document.getElementById('apiBaseUrl').value.trim();
    const apiKey = document.getElementById('apiKey').value.trim();
    
    if (!baseUrl || !apiKey) {
        alert('请先填写反代地址和API密钥');
        return;
    }
    
    try {
        const url = baseUrl.endsWith('/') ? baseUrl + 'models' : baseUrl + '/models';
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            alert('连接成功！✅');
        } else {
            alert('连接失败：' + response.status);
        }
    } catch (error) {
        alert('连接失败：' + error.message);
    }
}

function saveConfig() {
    const name = document.getElementById('apiName').value.trim();
    const baseUrl = document.getElementById('apiBaseUrl').value.trim();
    const apiKey = document.getElementById('apiKey').value.trim();
    const defaultModel = document.getElementById('modelSelect').value;
    
    if (!baseUrl || !apiKey) {
        alert('请至少填写反代地址和API密钥');
        return;
    }
    
    currentApiConfig = {
        name: name || '临时配置',
        baseUrl,
        apiKey,
        models: currentApiConfig.models,
        defaultModel
    };
    
    saveToDB('apiConfig', currentApiConfig);
    alert('配置已保存');
}

function saveAsScheme() {
    const name = document.getElementById('apiName').value.trim();
    const baseUrl = document.getElementById('apiBaseUrl').value.trim();
    const apiKey = document.getElementById('apiKey').value.trim();
    const defaultModel = document.getElementById('modelSelect').value;
    
    if (!name) {
        alert('请输入方案名称');
        return;
    }
    
    if (!baseUrl || !apiKey) {
        alert('请填写反代地址和API密钥');
        return;
    }
    
    const selectId = document.getElementById('apiSchemeSelect').value;
    
    if (selectId) {
        // 更新现有方案
        const index = apiSchemes.findIndex(s => s.id == selectId);
        apiSchemes[index] = {
            ...apiSchemes[index],
            name,
            baseUrl,
            apiKey,
            models: currentApiConfig.models,
            defaultModel
        };
    } else {
        // 新建方案
        const newId = apiSchemes.length > 0 ? Math.max(...apiSchemes.map(s => s.id)) + 1 : 1;
        apiSchemes.push({
            id: newId,
            name,
            baseUrl,
            apiKey,
            models: currentApiConfig.models,
            defaultModel
        });
    }
    
    // 添加这行代码，确保以数组格式保存
    const transaction = db.transaction(['apiSchemes'], 'readwrite');
    const objectStore = transaction.objectStore('apiSchemes');
    objectStore.put({ id: 1, list: apiSchemes });
    
    renderApiSchemes();
    alert('方案已保存');
}

// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', function() {

    
    // 方案选择切换事件
    const schemeSelect = document.getElementById('apiSchemeSelect');
    if (schemeSelect) {
        schemeSelect.addEventListener('change', function(e) {
            const schemeId = e.target.value;
            if (!schemeId) {
                newScheme();
                return;
            }
            
            const scheme = apiSchemes.find(s => s.id == schemeId);
            if (scheme) {
                currentApiConfig = { ...scheme };
                updateApiForm();
            }
        });
    }
      // 颜色选择器实时预览
    const textColorInput = document.getElementById('textColorInput');
    const appTextColorInput = document.getElementById('appTextColorInput');
    
    if (textColorInput) {
        textColorInput.addEventListener('input', function(e) {
            document.getElementById('textColorPreview').style.background = e.target.value;
        });
    }
    
    if (appTextColorInput) {
        appTextColorInput.addEventListener('input', function(e) {
            document.getElementById('appTextColorPreview').style.background = e.target.value;
        });
    }
      // 绑定上下文参考的滑动条和输入框事件
    setTimeout(() => {
        const slider = document.getElementById('contextRoundsSlider');
        const input = document.getElementById('contextRoundsInput');
        
        if (slider) {
            slider.addEventListener('input', function() {
                syncContextRounds('slider');
            });
        }
        
        if (input) {
            input.addEventListener('input', function() {
                syncContextRounds('input');
            });
            
            // 防止输入非法值
            input.addEventListener('blur', function() {
                let value = parseInt(this.value) || 0;
                if (value < 0) value = 0;
                if (value > 300) value = 300;
                this.value = value;
                slider.value = value;
                syncContextRounds('slider');
            });
        }
    }, 600);

});
// 聊天功能相关变量
let chats = [];
      // 钱包数据
let walletData = {
    balance: 2000.00,
    bills: []
};
let currentChatTab = 'single'; // single, group, peek

// 加载聊天列表
function loadChats() {
    loadFromDB('chats', (data) => {
        // 确保数据是数组格式
        if (data && data.list) {
            chats = data.list;
        } else if (Array.isArray(data)) {
            chats = data;
        } else {
            chats = [];
        }
        renderChatList();
    });
}

// 切换聊天/钱包 Tab
function switchChatTab(tab) {
    // 1. 更新底部按钮状态
    document.querySelectorAll('.bottom-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.bottom-tab[data-tab="${tab}"]`).classList.add('active');
    
    // 获取需要控制的元素
    const chatList = document.getElementById('chatListContainer');
    const walletContainer = document.getElementById('walletContainer');
    const addBtn = document.querySelector('.chat-screen .add-btn');
    const headerTitle = document.querySelector('.chat-screen .header-title');
    const momentsCard = document.querySelector('.moments-card'); // ★ 找到朋友圈卡片
    
    // 2. 界面切换逻辑
    if (tab === 'wallet') {
        // === 进入钱包模式 ===
        chatList.style.display = 'none';
        walletContainer.style.display = 'block';
        addBtn.style.display = 'none';      // 隐藏加号
        momentsCard.style.display = 'none'; // ★ 隐藏朋友圈
        
        headerTitle.textContent = '我的钱包';
        
        // 刷新钱包数据
        renderWallet();
        
    } else {
        // === 进入聊天模式 (单聊/群聊/偷看) ===
        chatList.style.display = 'block';
        walletContainer.style.display = 'none';
        addBtn.style.display = 'block';     // 显示加号
        momentsCard.style.display = 'flex'; // ★ 显示朋友圈
        
        headerTitle.textContent = '聊天';
        
        // 恢复之前的逻辑
        currentChatTab = tab;
        renderChatList();
    }
}

// 渲染聊天列表
function renderChatList() {
    const container = document.getElementById('chatListContainer');
    
    // 根据当前分组筛选
    let filtered = chats.filter(chat => chat.type === currentChatTab);
    
    // 排序：置顶的在前，其他按时间排序
    filtered.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        if (a.isPinned && b.isPinned) {
            return new Date(b.pinnedTime) - new Date(a.pinnedTime);
        }
        const timeA = a.lastMessageTime || a.createTime;
        const timeB = b.lastMessageTime || b.createTime;
        return new Date(timeB) - new Date(timeA);
    });
    
    if (filtered.length === 0) {
        const emptyText = currentChatTab === 'single' ? '暂无单聊' : 
                         currentChatTab === 'group' ? '暂无群聊' : 
                         '暂无偷看的群聊';
        container.innerHTML = `<div style="text-align: center; color: #999; margin-top: 50px;">${emptyText}</div>`;
        return;
    }
    
    // 先渲染基础HTML（用原始角色名）
    // 1. 先生成所有列表项的 HTML 字符串
    const listHtml = filtered.map(chat => `
        <div class="chat-item-wrapper" id="wrapper-${chat.id}">
            <div class="chat-item" id="chat-${chat.id}">
                <div class="chat-avatar">
                    ${chat.avatarImage ? `<img src="${chat.avatarImage}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">` : chat.avatar}
                </div>
                <div class="chat-info">
                    <div class="chat-top">
                      <div class="chat-name" data-chat-id="${chat.id}" data-original-name="${chat.name}">
                        ${chat.name}
                        <span class="status-tag" id="status-tag-${chat.id}"></span>
                        ${chat.isPinned ? '<span class="pin-badge">📌</span>' : ''}
                      </div>
                      <div class="chat-time">${formatChatListTime(chat.lastMessageTime || chat.createTime)}</div>
                    </div>
                    <div class="chat-bottom">
                        <div class="chat-preview">${chat.lastMessage}</div>
                        ${chat.unread > 0 ? `<div class="chat-badge">${chat.unread}</div>` : ''}
                    </div>
                </div>
            </div>
            <div class="chat-actions">
                <button class="action-btn-slide action-pin" onclick="togglePin(${chat.id})">
                    ${chat.isPinned ? '取消置顶' : '置顶'}
                </button>
                <button class="action-btn-slide action-delete" onclick="deleteChat(${chat.id})">
                    删除
                </button>
            </div>
        </div>
    `).join('');
     container.innerHTML = `<div class="chat-group-card">${listHtml}</div>`;
    
    // 然后异步更新备注（不阻塞主进程）
    filtered.forEach(chat => {
        updateChatDisplayName(chat.id);
    updateChatStatusDisplay(chat.id);
    addSwipeEvent(chat.id);
    });
}

// 新增函数：异步更新聊天显示名称 (修复版)
function updateChatDisplayName(chatId) {
    loadFromDB('characterInfo', (data) => {
        const charData = data && data[chatId] ? data[chatId] : {};
        const nameEl = document.querySelector(`.chat-name[data-chat-id="${chatId}"]`);
        
        if (nameEl) {
            // 获取原始名字 (从 data 属性中)
            const originalName = nameEl.dataset.originalName;
            // 如果有备注就用备注，没有就用原名
            const displayName = charData.remark || originalName;
            
            if (displayName) {
                // 只更新文本节点，不破坏里面的状态标签和置顶图标
                // 遍历子节点找到文本节点
                for (let i = 0; i < nameEl.childNodes.length; i++) {
                    const node = nameEl.childNodes[i];
                    if (node.nodeType === Node.TEXT_NODE) {
                        // 找到第一个文本节点，更新它
                        if (node.textContent.trim() !== '') {
                            node.textContent = displayName + ' ';
                            break;
                        }
                    }
                }
            }
        }
   
    updateArchiveCount(); 
   
    });

}

function updateChatStatusDisplay(chatId) {
    loadFromDB('characterInfo', (data) => {
        const charData = data && data[chatId] ? data[chatId] : {};
        const status = charData.currentStatus || '在线-刚刚上线';  // ← 给默认值
        
        const statusTag = document.getElementById(`status-tag-${chatId}`);
        if (statusTag && status) {  // ← 删除了额外的判断
            const mainStatus = status.split('-')[0].trim();
            statusTag.textContent = `「${mainStatus}」`;
        } else if (statusTag) {
            statusTag.textContent = '';
        }
    });
}


// 更新详情页状态显示
function updateDetailPageStatus(chatId) {
    loadFromDB('characterInfo', (data) => {
        const charData = data && data[chatId] ? data[chatId] : {};
        const status = charData.currentStatus || '在线-刚刚上线';
        
        const statusElement = document.getElementById('characterStatus');
        if (statusElement) {
            statusElement.textContent = status;
            statusElement.style.display = 'flex';
            
        }
    });
}

// 新增函数：更新详情页标题
function updateDetailPageTitle(chatId, originalName) {
    loadFromDB('characterInfo', (data) => {
        const charData = data && data[chatId] ? data[chatId] : {};
        const displayName = (charData.remark && charData.remark.trim()) ? charData.remark : originalName;
        document.getElementById('chatDetailTitle').textContent = displayName;
    });
}



// 打开添加聊天菜单
function openAddChatMenu() {
    if (currentChatTab === 'single') {
        // 单聊：打开输入弹窗
        document.getElementById('singleChatName').value = '';
        document.getElementById('addSingleChatModal').style.display = 'flex';
    } else if (currentChatTab === 'group') {
        // 群聊：打开成员选择弹窗
        openMemberSelector('group');
    } else if (currentChatTab === 'peek') {
        // 偷看：打开成员选择弹窗
        openMemberSelector('peek');
    }
}

// 打开聊天详情
function openChatDetail(chatId) {
    currentChatId = chatId;
    allMessages = [];
    visibleMessagesCount = 30;
    
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;
    
    // 设置标题 - 动态获取备注
    updateDetailPageTitle(chatId, chat.name);
    
    // 设置导航栏头像
    const headerAvatar = document.getElementById('chatHeaderAvatar');
    if (chat.avatarImage) {
        headerAvatar.innerHTML = `<img src="${chat.avatarImage}">`;
    } else {
        headerAvatar.textContent = chat.avatar || '👤';
    }

    // 显示角色状态
    updateDetailPageStatus(chatId);
    // 检查并更新天气信息
    checkAndUpdateWeather(chatId);

    // 隐藏聊天列表，显示详情页
    document.getElementById('chatScreen').style.display = 'none';
    document.getElementById('chatDetailScreen').style.display = 'flex';
    
    // 检查是否为偷看模式
    const chatInput = document.getElementById('chatInput');
    
    if (chat.type === 'peek') {
        chatInput.disabled = true;
        chatInput.placeholder = '👀 偷看模式，无法发送消息';
    } else {
        chatInput.disabled = false;
        chatInput.placeholder = '输入消息...';
    }
    
    // 加载消息
    loadMessages(chatId);
}





// 打开朋友圈
function openMoments() {
    alert('朋友圈功能开发中...');
}
// 关闭单聊弹窗
function closeAddSingleModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('addSingleChatModal').style.display = 'none';
}

// 创建单聊
function createSingleChat() {
    const name = document.getElementById('singleChatName').value.trim();
    
    if (!name) {
        alert('请输入角色名字');
        return;
    }
    
    // 生成新ID
    const newId = chats.length > 0 ? Math.max(...chats.map(c => c.id)) + 1 : 1;
    
    // 创建单聊数据
  const currentTime = getCurrentTime();
const newChat = {
    id: newId,
    type: 'single',
    name: name,
    avatar: '👤',
   avatarImage: null,
    lastMessage: '',
    time: '刚刚',
    lastMessageTime: currentTime,
    unread: 0,
    isPinned: false,
    members: [],
    isPeek: false,
    createTime: currentTime,
  
};
    // 同步用户头像到新创建的单聊
    loadFromDB('userInfo', (userData) => {
        if (userData && userData.avatar) {
            newChat.avatarImage = userData.avatar;
            saveToDB('chats', { list: chats });
            renderChatList();
        }
    });

    // 添加到列表
    chats.push(newChat);
 saveToDB('chats', { list: chats });

    
    // 刷新显示
    renderChatList();
    closeAddSingleModal();
}

// 打开成员选择弹窗
let selectingForType = ''; // 'group' 或 'peek'
let selectedMembers = [];

function openMemberSelector(type) {
    selectingForType = type;
    selectedMembers = [];
    
    // 获取所有单聊列表
    const singleChats = chats.filter(c => c.type === 'single');
    
    if (singleChats.length === 0) {
        alert('请先添加单聊联系人');
        return;
    }
    
   // 渲染成员列表
const membersList = document.getElementById('membersList');
membersList.innerHTML = singleChats.map(chat => {
    // 优先使用avatarImage，如果没有则用emoji
    const avatarHtml = chat.avatarImage 
        ? `<img src="${chat.avatarImage}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`
        : chat.avatar;
    
    return `
        <div class="member-item" onclick="toggleMemberSelection('${chat.name}', ${chat.id})">
            <input type="checkbox" class="member-checkbox" id="member-${chat.id}" onclick="event.stopPropagation(); toggleMemberSelection('${chat.name}', ${chat.id})">
            <div class="member-avatar">${avatarHtml}</div>
            <div class="member-name">${chat.name}</div>
        </div>
    `;
}).join('');

    
    // 更新已选数量
    document.getElementById('selectedCount').textContent = '0';
    
    // 显示弹窗
    document.getElementById('selectMembersModal').style.display = 'flex';
}

// 切换成员选择
function toggleMemberSelection(memberName, chatId) {
    const index = selectedMembers.indexOf(memberName);
    const checkbox = document.getElementById(`member-${chatId}`);
    
    if (index > -1) {
        // 取消选择
        selectedMembers.splice(index, 1);
        if (checkbox) checkbox.checked = false;
    } else {
        // 添加选择
        selectedMembers.push(memberName);
        if (checkbox) checkbox.checked = true;
    }
    
    // 更新已选数量
    document.getElementById('selectedCount').textContent = selectedMembers.length;
}


// 关闭成员选择弹窗
function closeSelectMembersModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('selectMembersModal').style.display = 'none';
    selectedMembers = [];
}

// 确认成员选择
function confirmMemberSelection() {
    if (selectedMembers.length < 2) {
        alert('请至少选择2人');
        return;
    }
    
    if (selectingForType === 'group') {
        createGroupChat();
    } else if (selectingForType === 'peek') {
        createPeekChat();
    }
}

// 创建群聊
function createGroupChat() {
    const newId = chats.length > 0 ? Math.max(...chats.map(c => c.id)) + 1 : 1;
const currentTime = getCurrentTime();
const newChat = {
    id: newId,
    type: 'group',
    name: '未命名群聊',
    avatar: '👥',
    lastMessage: '群聊已创建',
    time: '刚刚',
    lastMessageTime: currentTime,
    unread: 0,
    isPinned: false,
    members: [...selectedMembers],
    isPeek: false,
    createTime: currentTime
};

    
    chats.push(newChat);
   saveToDB('chats', { list: chats });
    
    // 切换到群聊分组并刷新
    currentChatTab = 'group';
    document.querySelectorAll('.bottom-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.bottom-tab[data-tab="group"]').classList.add('active');
    renderChatList();
    
    closeSelectMembersModal();
}

// 创建偷看
function createPeekChat() {
    const newId = chats.length > 0 ? Math.max(...chats.map(c => c.id)) + 1 : 1;
    
   const currentTime = getCurrentTime();
const newChat = {
    id: newId,
    type: 'peek',
    name: '👀未命名群聊',
    avatar: '👥',
    lastMessage: '群聊已创建',
    time: '刚刚',
    lastMessageTime: currentTime,
    unread: 0,
    isPinned: false,
    members: [...selectedMembers],
    isPeek: false,
    createTime: currentTime
};

    
    chats.push(newChat);
   saveToDB('chats', { list: chats });
    
    // 切换到偷看分组并刷新
    currentChatTab = 'peek';
    document.querySelectorAll('.bottom-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.bottom-tab[data-tab="peek"]').classList.add('active');
    renderChatList();
    
    closeSelectMembersModal();
}
// 左滑功能相关变量
let swipeStartX = 0;
let swipeCurrentX = 0;
let isSwiping = false;
let currentSwipedId = null;

// 添加滑动事件
// 添加滑动事件
function addSwipeEvent(chatId) {
    const wrapper = document.getElementById(`wrapper-${chatId}`);
    const chatItem = document.getElementById(`chat-${chatId}`);
    const actions = wrapper.querySelector('.chat-actions');
    if (!chatItem || !actions) return;
    
    // ========== 移动端触摸事件 ==========
    let touchStartX = 0;
    let touchCurrentX = 0;
    let hasTouchMoved = false; // ★ 新增：标记是否真的移动过
    
    chatItem.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchCurrentX = touchStartX; // ★ 修复：初始化为起始位置
        hasTouchMoved = false; // ★ 重置移动标记
        isSwiping = true;
    }, { passive: true });
    
    chatItem.addEventListener('touchmove', (e) => {
        if (!isSwiping) return;
        touchCurrentX = e.touches[0].clientX;
        const diff = touchStartX - touchCurrentX;
        
        // ★ 只有移动超过10px才算真正滑动
        if (Math.abs(diff) > 10) {
            hasTouchMoved = true;
        }
        
        if (diff > 0 && diff < 160) {
            chatItem.style.transform = `translateX(-${diff}px)`;
            actions.style.transform = `translateX(${100 - (diff / 160) * 100}%)`;
        }
    }, { passive: true });
    
    chatItem.addEventListener('touchend', () => {
        if (!isSwiping) return;
        
        const diff = touchStartX - touchCurrentX;
        
        // ★ 核心修复：如果没有真正移动过，视为点击
        if (!hasTouchMoved) {
            isSwiping = false;
            openChatDetail(chatId); // 执行点击操作
            return;
        }
        
        // 真正滑动了，判断滑动距离
        if (diff > 50) {
            chatItem.style.transform = 'translateX(-160px)';
            actions.style.transform = 'translateX(0)';
            closeOtherSwipes(chatId);
            currentSwipedId = chatId;
        } else {
            chatItem.style.transform = 'translateX(0)';
            actions.style.transform = 'translateX(100%)';
        }
        
        isSwiping = false;
        hasTouchMoved = false;
    });
    
    // ========== 桌面端鼠标事件 ==========
    let mouseDownX = 0;
    let hasMoved = false;
    let actualSwipeDistance = 0;

    chatItem.addEventListener('mousedown', (e) => {
        mouseDownX = e.clientX;
        swipeStartX = e.clientX;
        hasMoved = false;
        actualSwipeDistance = 0;
        chatItem.style.cursor = 'grabbing';
    });

    chatItem.addEventListener('mousemove', (e) => {
        if (mouseDownX === 0) return;
        
        const diff = Math.abs(e.clientX - mouseDownX);
        if (diff > 5) {
            hasMoved = true;
            isSwiping = true;
        }
        
        if (!isSwiping) return;
        
        swipeCurrentX = e.clientX;
        actualSwipeDistance = swipeStartX - swipeCurrentX;
        
        if (actualSwipeDistance > 0 && actualSwipeDistance < 160) {
            chatItem.style.transform = `translateX(-${actualSwipeDistance}px)`;
            actions.style.transform = `translateX(${100 - (actualSwipeDistance / 160) * 100}%)`;
        }
    });

    chatItem.addEventListener('mouseup', (e) => {
        if (!hasMoved) {
            openChatDetail(chatId);
            chatItem.style.cursor = 'pointer';
            mouseDownX = 0;
            return;
        }
        
        if (actualSwipeDistance > 50) {
            chatItem.style.transform = 'translateX(-160px)';
            actions.style.transform = 'translateX(0)';
            closeOtherSwipes(chatId);
            currentSwipedId = chatId;
        } else {
            chatItem.style.transform = 'translateX(0)';
            actions.style.transform = 'translateX(100%)';
        }
        
        isSwiping = false;
        hasMoved = false;
        actualSwipeDistance = 0;
        mouseDownX = 0;
        chatItem.style.cursor = 'pointer';
    });

    chatItem.addEventListener('mouseleave', () => {
        if (isSwiping) {
            if (actualSwipeDistance > 50) {
                chatItem.style.transform = 'translateX(-160px)';
                actions.style.transform = 'translateX(0)';
                closeOtherSwipes(chatId);
                currentSwipedId = chatId;
            } else {
                chatItem.style.transform = 'translateX(0)';
                actions.style.transform = 'translateX(100%)';
            }
            isSwiping = false;
        }
        hasMoved = false;
        actualSwipeDistance = 0;
        mouseDownX = 0;
        chatItem.style.cursor = 'pointer';
    });
}


// 关闭其他展开的滑动项
function closeOtherSwipes(exceptId) {
    chats.forEach(chat => {
        if (chat.id !== exceptId) {
            const item = document.getElementById(`chat-${chat.id}`);
            const wrapper = document.getElementById(`wrapper-${chat.id}`);
            if (item && wrapper) {
                item.style.transform = 'translateX(0)';
                const actions = wrapper.querySelector('.chat-actions');
                if (actions) {
                    actions.style.transform = 'translateX(100%)';
                }
            }
        }
    });
}




// 置顶/取消置顶
function togglePin(chatId) {
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;
    
    chat.isPinned = !chat.isPinned;
    chat.pinnedTime = chat.isPinned ? new Date().toISOString() : null;
    
    // 保存到数据库
    saveToDB('chats', { list: chats });
    
    // 收起滑动并刷新列表
    const item = document.getElementById(`chat-${chatId}`);
    if (item) {
        item.style.transform = 'translateX(0)';
    }
    
    renderChatList();
}

// 删除联系人 (修复版：彻底清理所有关联数据)
function deleteChat(chatId) {
    if (!confirm('确定删除该联系人吗？删除后一切数据不可恢复')) {
        return;
    }
    
    // 1. 从 chats 列表删除
    chats = chats.filter(c => c.id !== chatId);
    saveToDB('chats', { list: chats });
    
    // 2. 清理消息记录 (messages)
    loadFromDB('messages', (data) => {
        let allMessages = [];
        if (data && data.list) allMessages = data.list;
        else if (Array.isArray(data)) allMessages = data;
        
        // 过滤掉该角色的消息
        const newMessages = allMessages.filter(m => m.chatId !== chatId);
        
        // 保存回数据库
        const transaction = db.transaction(['messages'], 'readwrite');
        transaction.objectStore('messages').put({ id: 1, list: newMessages });
    });

    // 3. 清理日记 (diaries)
    loadFromDB('diaries', (data) => {
        let allDiaries = [];
        if (data && data.list) allDiaries = data.list;
        
        const newDiaries = allDiaries.filter(d => d.chatId !== chatId);
        
        const transaction = db.transaction(['diaries'], 'readwrite');
        transaction.objectStore('diaries').put({ id: 1, list: newDiaries });
    });

    // 4. 清理记忆 (memories)
    loadFromDB('memories', (data) => {
        let allMemories = [];
        if (data && data.list) allMemories = data.list;
        else if (Array.isArray(data)) allMemories = data;

        const newMemories = allMemories.filter(m => m.chatId !== chatId);

        const transaction = db.transaction(['memories'], 'readwrite');
        transaction.objectStore('memories').put({ id: 1, list: newMemories });
    });

    // 5. 清理角色详细信息 (characterInfo)
    loadFromDB('characterInfo', (data) => {
        const allData = data || {};
        // 如果存在该角色的数据，就删除
        if (allData[chatId]) {
            delete allData[chatId]; 
            saveToDB('characterInfo', allData);
        }
    });
    
    // 刷新列表
    renderChatList();
    
    // 如果当前正打开着这个被删角色的详情页，强制退回列表
    if (currentChatId === chatId) {
        backToChatList();
    }
}

// 聊天详情相关变量
let currentChatId = null;
let allMessages = [];
let visibleMessagesCount = 30;

// 返回聊天列表
function backToChatList() {
    document.getElementById('chatDetailScreen').style.display = 'none';
    document.getElementById('chatScreen').style.display = 'flex';
    
    // 清理状态
    currentChatId = null;
    allMessages = [];
    visibleMessagesCount = 30;
}


// 加载消息
function loadMessages(chatId) {
    loadFromDB('messages', (data) => {
        const allData = data && data.list ? data.list : [];
        // 只加载当前chatId的消息
        const chatMessages = allData.filter(m => m.chatId === chatId);
        allMessages = chatMessages;
        
        // 显示最近30条
        visibleMessagesCount = Math.min(30, allMessages.length);
        renderMessages();
        
        // 滚动到底部
        setTimeout(scrollToBottom, 100);
    });
}




// 判断是否显示时间
function shouldShowTime(prevMsg, currentMsg) {
    if (!prevMsg) return true;
    const prev = new Date(prevMsg.time);
    const curr = new Date(currentMsg.time);
    return (curr - prev) > 5 * 60 * 1000; // 超过5分钟显示时间
}

// 格式化消息时间
function formatMessageTime(timeStr) {
    if (!timeStr) return '';
    const time = new Date(timeStr);
    return `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;
}

// 格式化聊天列表时间
function formatChatListTime(timeStr) {
    if (!timeStr) return '';
    
    const msgTime = new Date(timeStr);
    const now = new Date();
    
    // 计算今天0点
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // 计算消息日期0点
    const msgDate = new Date(msgTime.getFullYear(), msgTime.getMonth(), msgTime.getDate());
    
    if (msgDate.getTime() === today.getTime()) {
        // 今天：显示时间
        return `${String(msgTime.getHours()).padStart(2, '0')}:${String(msgTime.getMinutes()).padStart(2, '0')}`;
    } else if (msgDate.getTime() === yesterday.getTime()) {
        // 昨天
        return '昨天';
    } else if (now.getFullYear() === msgTime.getFullYear()) {
        // 今年：只显示月日
        return `${msgTime.getMonth() + 1}月${msgTime.getDate()}日`;
    } else {
        // 去年及更早：显示年月日
        return `${msgTime.getFullYear()}/${msgTime.getMonth() + 1}/${msgTime.getDate()}`;
    }
}

// 获取当前本地时间字符串
function getCurrentTime() {
    const now = new Date();
    return now.toLocaleString('zh-CN', { 
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).replace(/\//g, '-');
}
// 计算距离生日的天数
function getDaysToBirthday(birthdayStr) {
    if (!birthdayStr) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 重置到0点
    
    const birthday = new Date(birthdayStr);
    
    // 设置今年的生日
    const thisYearBirthday = new Date(today.getFullYear(), birthday.getMonth(), birthday.getDate());
    thisYearBirthday.setHours(0, 0, 0, 0);
    
    // 如果今年生日已过,计算明年的
    if (thisYearBirthday < today) {
        thisYearBirthday.setFullYear(today.getFullYear() + 1);
    }
    
    // 计算天数差
    const diffTime = thisYearBirthday - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
}


// 生成生日提示文本
function getBirthdayPrompt(birthdayStr) {
    const days = getDaysToBirthday(birthdayStr);
    if (days === null) return '';
    
    const birthday = new Date(birthdayStr);
    const month = birthday.getMonth() + 1;
    const date = birthday.getDate();
    
    if (days === 0) {
        return `今天是你的生日（${month}月${date}日），你可以在对话中自然地表达生日的喜悦。`;
    } else if (days > 0 && days <= 7) {
        return `你的生日是${month}月${date}日，还有${days}天就到了，你可以偶尔在对话中提及即将到来的生日。`;
    } else if (days < 0 && days >= -3) {
        const pastDays = Math.abs(days);
        return `你的生日（${month}月${date}日）刚过去${pastDays}天，你可以在对话中自然地提及刚过的生日。`;
    }
    
    return '';
}

// 滚动到底部
function scrollToBottom() {
    const container = document.getElementById('messagesContainer');
    container.scrollTop = container.scrollHeight;
}

// 加载更多消息
function loadMoreMessages() {
    visibleMessagesCount = Math.min(visibleMessagesCount + 20, allMessages.length);
    const scrollHeight = document.getElementById('messagesContainer').scrollHeight;
    renderMessages();
    
    // 保持滚动位置
    setTimeout(() => {
        const newScrollHeight = document.getElementById('messagesContainer').scrollHeight;
        document.getElementById('messagesContainer').scrollTop = newScrollHeight - scrollHeight;
    }, 0);
}

// 输入框自动调整高度
document.addEventListener('DOMContentLoaded', () => {
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
       
        
        // 回车发送
        chatInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
});

// 通话输入框自动调整高度
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const callInput = document.getElementById('callInput');
        if (callInput) {
            callInput.addEventListener('input', function() {
                this.style.height = 'auto';
                this.style.height = Math.min(this.scrollHeight, 72) + 'px';
            });
            
            // 回车发送
            callInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendCallMessage();
                }
            });
        }
    }, 500);
});
// 发送消息
function sendMessage() {
    const input = document.getElementById('chatInput');
    const content = input.value.trim();
    
    if (!content) return;
    
    // 生成新的消息ID
    const newId = allMessages.length > 0 ? Math.max(...allMessages.map(m => m.id || 0)) + 1 : 1;
    
    const newMessage = {
        id: newId,
        chatId: currentChatId,
        type: 'text',
        content: content,
        senderId: 'me',
        time: getCurrentTime(),
        isRevoked: false,
        isSticker: true
    };
    
    // 如果有引用消息
    if (quotedMessage) {
        newMessage.quotedMessageId = quotedMessage.id;
        newMessage.quotedAuthor = quotedMessage.senderId === 'me' ? '我' : quotedMessage.senderId;
        newMessage.quotedContent = quotedMessage.content;
        newMessage.quotedTime = formatMessageTime(quotedMessage.time);
        
        // 清除引用状态
        cancelQuote();
    }
    
    // 添加到消息列表
    allMessages.push(newMessage);
    
    // 保存到数据库
    saveMessages();
    
    // 更新聊天列表
    updateChatLastMessage(currentChatId, content);
    
    // 清空输入框
    input.value = '';
  
    
    // 重新渲染
    visibleMessagesCount = Math.min(visibleMessagesCount + 1, allMessages.length);
    renderMessages();
    scrollToBottom();
}


// 保存消息到数据库
function saveMessages() {
    loadFromDB('messages', (data) => {
        // 确保数据是数组格式
        let allChatsMessages = [];
        if (data && data.list) {
            allChatsMessages = Array.isArray(data.list) ? data.list : [];
        } else if (Array.isArray(data)) {
            allChatsMessages = data;
        }
        
        // 移除当前聊天的旧消息
        allChatsMessages = allChatsMessages.filter(m => m.chatId !== currentChatId);
        
        // 添加当前聊天的新消息
        allChatsMessages = [...allChatsMessages, ...allMessages];
        
        // 保存到数据库
        const transaction = db.transaction(['messages'], 'readwrite');
        const objectStore = transaction.objectStore('messages');
        objectStore.put({ id: 1, list: allChatsMessages });
    });
}


// 更新聊天列表的最后一条消息
function updateChatLastMessage(chatId, content) {
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
        chat.lastMessage = content;
      chat.lastMessageTime = getCurrentTime();
        chat.time = '刚刚';
        chat.unread = 0;
        saveToDB('chats', { list: chats });
    }
}
// 长按消息相关变量
let longPressTimer = null;
let selectedMessageId = null;

// 添加长按事件
function addLongPressEvent(element, messageId) {
    let isPressed = false;
    

    
    // 移动端长按
    element.addEventListener('touchstart', (e) => {
        e.preventDefault();
        isPressed = true;
        longPressTimer = setTimeout(() => {
            if (isPressed) {
                openMessageMenu(messageId);
            }
        }, 500);
    });
    
    element.addEventListener('touchend', () => {
        isPressed = false;
        clearTimeout(longPressTimer);
    });
    
    element.addEventListener('touchmove', () => {
        isPressed = false;
        clearTimeout(longPressTimer);
    });
    
    // 桌面端长按
    element.addEventListener('mousedown', (e) => {
   
        isPressed = true;
        longPressTimer = setTimeout(() => {
       
            if (isPressed) {
                openMessageMenu(messageId);
            }
        }, 500);
    });
    
    element.addEventListener('mouseup', () => {
  
        isPressed = false;
        clearTimeout(longPressTimer);
    });
    
    element.addEventListener('mouseleave', () => {
        isPressed = false;
        clearTimeout(longPressTimer);
    });
}



// 打开消息操作菜单
function openMessageMenu(messageId) {
    selectedMessageId = messageId;
    const message = allMessages.find(m => m.id === messageId);
    
    if (!message) return;
    
    // 判断是否为自己的消息（只有自己的消息能撤回）
    const revokeBtn = document.getElementById('revokeMessageBtn');
    if (message.senderId === 'me' && !message.isRevoked) {
        revokeBtn.style.display = 'block';
    } else {
        revokeBtn.style.display = 'none';
    }
    
    document.getElementById('messageMenuModal').style.display = 'flex';
}

// 关闭消息操作菜单
function closeMessageMenu(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('messageMenuModal').style.display = 'none';
    selectedMessageId = null;
}

// 删除选中的消息
function deleteSelectedMessage() {
    if (!selectedMessageId) return;
    
    if (!confirm('确定删除这条消息吗？')) {
        return;
    }
    
    // 从消息列表中删除
    allMessages = allMessages.filter(m => m.id !== selectedMessageId);
    
    // 保存到数据库
    saveMessages();
    
    // 更新显示数量
    if (visibleMessagesCount > allMessages.length) {
        visibleMessagesCount = allMessages.length;
    }
    
    // 重新渲染
    renderMessages();
    
    // 关闭菜单
    closeMessageMenu();
}

// 撤回选中的消息
function revokeSelectedMessage() {
    if (!selectedMessageId) return;
    
    const message = allMessages.find(m => m.id === selectedMessageId);
    if (!message || message.senderId !== 'me') {
        alert('只能撤回自己的消息');
        return;
    }
    
    if (message.isRevoked) {
        alert('该消息已撤回');
        return;
    }
    
    // 标记为已撤回
    message.isRevoked = true;
    
    // 保存到数据库
    saveMessages();
    
    // 更新聊天列表预览
    updateChatLastMessage(currentChatId, '此消息已撤回');
    
    // 重新渲染
    renderMessages();
    
    // 关闭菜单
    closeMessageMenu();
}

// 展开/收起撤回消息内容
function toggleRevokedContent(messageId) {
    const content = document.getElementById(`revoked-${messageId}`);
    if (content) {
        content.classList.toggle('show');
    }
}
// 多选删除相关变量
let isMultiSelectMode = false;
let selectedMessageIds = [];

// 引用相关变量
let quotedMessage = null;

// 开始多选模式
function startMultiSelectMode() {
    isMultiSelectMode = true;
    selectedMessageIds = [selectedMessageId]; // 把当前长按的消息加入选中
    
    // 关闭菜单
    closeMessageMenu();
    
    // 显示多选操作栏
    document.getElementById('multiSelectBar').style.display = 'flex';
    
    // 隐藏输入栏
    document.querySelector('.chat-input-bar').style.display = 'none';
    
    // 重新渲染消息（显示勾选框）
    renderMessages();
    
    // 更新已选数量
    updateSelectedCount();
}

// 取消多选模式
function cancelMultiSelect() {
    isMultiSelectMode = false;
    selectedMessageIds = [];
    
    // 隐藏操作栏
    document.getElementById('multiSelectBar').style.display = 'none';
    
    // 显示输入栏
    document.querySelector('.chat-input-bar').style.display = 'flex';
    
    // 重新渲染
    renderMessages();
}

// 切换消息选中状态
function toggleMessageSelection(messageId) {
    if (!isMultiSelectMode) return;
    
    const index = selectedMessageIds.indexOf(messageId);
    if (index > -1) {
        selectedMessageIds.splice(index, 1);
    } else {
        selectedMessageIds.push(messageId);
    }
    
    updateSelectedCount();
    
    // 更新复选框状态
    const checkbox = document.getElementById(`checkbox-${messageId}`);
    if (checkbox) {
        checkbox.checked = selectedMessageIds.includes(messageId);
    }
}

// 更新已选数量
function updateSelectedCount() {
    document.getElementById('selectedCountText').textContent = selectedMessageIds.length;
}

// 删除选中的消息
function deleteSelectedMessages() {
    if (selectedMessageIds.length === 0) {
        alert('请先选择要删除的消息');
        return;
    }
    
    if (!confirm(`确定删除选中的${selectedMessageIds.length}条消息吗？`)) {
        return;
    }
    
    // 批量删除
    allMessages = allMessages.filter(m => !selectedMessageIds.includes(m.id));
    
    // 保存到数据库
    saveMessages();
    
    // 退出多选模式
    cancelMultiSelect();
    
    // 重新渲染
    visibleMessagesCount = Math.min(visibleMessagesCount, allMessages.length);
    renderMessages();
}

// 引用选中的消息
function quoteSelectedMessage() {
    const message = allMessages.find(m => m.id === selectedMessageId);
    if (!message) return;
    
    quotedMessage = message;
    
    // 显示引用框
    const quoteBox = document.getElementById('quoteBox');
    
    // ★ 修复：正确获取作者名称
    let authorName = '我';
    if (message.senderId !== 'me') {
        // 尝试获取角色名称
        const chat = chats.find(c => c.id === currentChatId);
        authorName = chat ? chat.name : message.senderId;
    }
    document.getElementById('quoteAuthor').textContent = `引用：${authorName}`;
    
    // ★ 修复：处理不同类型的消息内容
    let displayContent = message.content;
    
    if (message.type === 'image') {
        displayContent = '【图片】';
    } else if (message.type === 'voice') {
        displayContent = `【语音】${message.content.substring(0, 20)}${message.content.length > 20 ? '...' : ''}`;
    } else if (message.type === 'transfer') {
        displayContent = `【转账】¥${message.transferData.amount.toFixed(2)}`;
    } else if (message.type === 'shopping_order') {
        displayContent = '【购物订单】';
    } else if (message.content && message.content.length > 30) {
        // 普通文本消息，截断过长内容
        displayContent = message.content.substring(0, 30) + '...';
    }
    
    document.getElementById('quoteContent').textContent = `${formatMessageTime(message.time)} ${displayContent}`;
    quoteBox.style.display = 'block';
    
    // 关闭菜单
    closeMessageMenu();
    
    // 聚焦输入框
    document.getElementById('chatInput').focus();
}


// 取消引用
function cancelQuote() {
    quotedMessage = null;
    document.getElementById('quoteBox').style.display = 'none';
}




// 角色信息相关变量
let characterInfoData = {};

// 打开角色信息页面
function openCharacterInfo() {
    if (!currentChatId) return;
    
    const chat = chats.find(c => c.id === currentChatId);
    if (!chat) return;
    
    // 隐藏聊天详情，显示角色信息页
    document.getElementById('chatDetailScreen').style.display = 'none';
    document.getElementById('characterInfoScreen').style.display = 'flex';
    
    // 加载角色信息
    loadCharacterInfo(currentChatId);
}

// 返回聊天详情
function backToDetail() {
    document.getElementById('characterInfoScreen').style.display = 'none';
    document.getElementById('chatDetailScreen').style.display = 'flex';
}

// 加载角色信息
function loadCharacterInfo(chatId) {
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;
    
    // 显示基本信息
   const charAvatarEl = document.getElementById('charAvatar');
if (chat.avatarImage) {
    charAvatarEl.innerHTML = `<img src="${chat.avatarImage}" alt="头像">`;
} else {
    charAvatarEl.textContent = chat.avatar || '👤';
}

    document.getElementById('charDisplayName').textContent = chat.name;
    
    // 尝试从数据库加载详细信息
    loadFromDB('characterInfo', (data) => {
        const charData = data && data[chatId] ? data[chatId] : {};
        characterInfoData = charData;
            // 如果没有状态，设置默认状态
    if (!charData.currentStatus) {
        charData.currentStatus = '在线-刚刚上线';
    }

        // 填充表单
      // 填充表单（添加空值检查）
const remarkEl = document.getElementById('charRemark');
const birthdayEl = document.getElementById('charBirthday');
const addressEl = document.getElementById('charAddress');
const personalityEl = document.getElementById('charPersonality');
const myPersonalityEl = document.getElementById('myPersonality');

if (remarkEl) remarkEl.value = charData.remark || '';      
if (birthdayEl) birthdayEl.value = charData.birthday || '';
if (addressEl) addressEl.value = charData.address || '';
if (personalityEl) personalityEl.value = charData.personality || '';
if (myPersonalityEl) myPersonalityEl.value = charData.myPersonality || '';

       
  // 加载上下文参考设置
const contextRounds = charData.contextRounds !== undefined ? charData.contextRounds : 30;
const sliderEl = document.getElementById('contextRoundsSlider');
const inputEl = document.getElementById('contextRoundsInput');
const countEl = document.getElementById('contextMessagesCount');

if (sliderEl) sliderEl.value = contextRounds;
if (inputEl) inputEl.value = contextRounds;
if (countEl) countEl.textContent = contextRounds * 2;
// ▼▼▼ 新增：加载自动总结设置 ▼▼▼
const autoSummaryCheckbox = document.getElementById('autoSummaryCheckbox');
const autoSummaryPanel = document.getElementById('autoSummarySettingsPanel');
const autoSummaryThreshold = document.getElementById('autoSummaryThresholdInput');

if (autoSummaryCheckbox && autoSummaryPanel && autoSummaryThreshold) {
    const isEnabled = charData.autoSummaryEnabled === true;
    const threshold = charData.autoSummaryThreshold || 50;
    
    autoSummaryCheckbox.checked = isEnabled;
    autoSummaryPanel.style.display = isEnabled ? 'block' : 'none';
    autoSummaryThreshold.value = threshold;
}
// ▲▲▲ 新增结束 ▲▲▲

      
     // 设置角色人设
document.getElementById('charPersonality').value = charData.personality || '';
document.getElementById('myPersonality').value = charData.myPersonality || '';
// 加载关联世界书选择器
renderWorldbookSelector(charData.linkedWorldbooks || []);
      
// 加载城市信息复选框状态

        const cityCheckbox = document.getElementById('cityInfoCheckbox');
        if (cityCheckbox) {
            // 强制转换为布尔值，防止 undefined 导致错误
            cityCheckbox.checked = charData.cityInfoEnabled === true;
        }
     // 控制查看按钮的显示
const viewBtn = document.getElementById('viewWeatherBtn');
if (viewBtn) {
    viewBtn.style.display = charData.cityInfoEnabled ? 'block' : 'none';
}

// 加载关联世界书选择器（延迟执行确保DOM已渲染）
setTimeout(() => {
    renderWorldbookSelector(charData.linkedWorldbooks || []);
}, 500);

        
      // 更新显示（添加空值检查）

const followersEl = document.getElementById('charFollowers');
const followingEl = document.getElementById('charFollowing');
const itineraryEl = document.getElementById('charItinerary');




if (itineraryEl) itineraryEl.textContent = charData.itinerary || 0;

    });
  // 更新日记数量
updateDiaryCount();
updateArchiveCount();

}
      // 同步上下文参考的滑动条和输入框
function syncContextRounds(source) {
    const slider = document.getElementById('contextRoundsSlider');
    const input = document.getElementById('contextRoundsInput');
    const countDisplay = document.getElementById('contextMessagesCount');
    
    if (!slider || !input || !countDisplay) return;
    
    if (source === 'slider') {
        input.value = slider.value;
    } else if (source === 'input') {
        let value = parseInt(input.value) || 0;
        // 限制范围
        if (value < 0) value = 0;
        if (value > 300) value = 300;
        input.value = value;
        slider.value = value;
    }
    
    // 更新消息数量显示
    const rounds = parseInt(slider.value);
    countDisplay.textContent = rounds * 2;
}

function saveCharacterInfo() {
    if (!currentChatId) return;
    
    // 1. 获取页面上的输入值
    const getInputValue = (id) => {
        const el = document.getElementById(id);
        return el ? el.value.trim() : '';
    };
    
    // 先从数据库读取，防止覆盖隐藏数据
    loadFromDB('characterInfo', (data) => {
        const allCharData = data || {};
        const latestDbData = allCharData[currentChatId] || {};
        
        // 2. 智能合并数据
        const finalCharData = {
            ...latestDbData, // 继承旧数据(如天气、开关等)
            
            // 更新表单里的新数据
            remark: getInputValue('charRemark'),
            birthday: getInputValue('charBirthday'),
            // address: getInputValue('charAddress'), // 如果你把地址栏删了，这行可以注释掉
            personality: getInputValue('charPersonality'),
            myPersonality: getInputValue('myPersonality'),
            linkedWorldbooks: getSelectedWorldbooks() || [],
            contextRounds: parseInt(document.getElementById('contextRoundsInput').value) || 30,
             autoSummaryEnabled: document.getElementById('autoSummaryCheckbox')?.checked || false,
    autoSummaryThreshold: parseInt(document.getElementById('autoSummaryThresholdInput')?.value) || 50,
        };
        
        // 3. 保存回数据库
        allCharData[currentChatId] = finalCharData;
        saveToDB('characterInfo', allCharData);
        
        // 4. 更新全局变量
        characterInfoData = finalCharData;
        
        // 5. 同步更新其他页面的标题（如果改了备注）
        const chat = chats.find(c => c.id === currentChatId);
        if (chat) {
            // 如果在聊天列表页
            updateChatDisplayName(currentChatId);
            // 如果在聊天详情页，更新标题
            updateDetailPageTitle(currentChatId, chat.name);
        }

        // ▼▼▼ 关键修改：保存后直接返回上一页 ▼▼▼
        backToDetail();
        
        // 可选：如果你觉得不需要弹窗提示，可以把下面这行注释掉
        // alert('保存成功'); 
    });
}

// 打开基本信息编辑弹窗
function openEditBasicInfo() {
    if (!currentChatId) return;
    
    const chat = chats.find(c => c.id === currentChatId);
    if (!chat) return;
    
    // 加载当前信息
    loadFromDB('characterInfo', (data) => {
        const charData = data && data[currentChatId] ? data[currentChatId] : {};
        
        // 显示当前头像
        const avatarPreview = document.getElementById('editAvatarPreview');
        if (chat.avatarImage) {
            avatarPreview.innerHTML = `<img src="${chat.avatarImage}" alt="头像">`;
        } else {
            avatarPreview.textContent = chat.avatar || '👤';
        }
        
        // 填充当前名字和地址
        document.getElementById('editCharName').value = chat.name || '';
     
        
        // 显示弹窗
        document.getElementById('editBasicInfoModal').style.display = 'flex';
    });
}

// 关闭基本信息编辑弹窗
function closeEditBasicInfo(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('editBasicInfoModal').style.display = 'none';
}

// 保存基本信息
// ============ 🔄 修复版：保存基本信息 (双向同步) ============
function saveBasicInfo() {
    if (!currentChatId) return;
    
    const newName = document.getElementById('editCharName').value.trim();
    const avatarFile = document.getElementById('editAvatarInput').files[0];
    
    if (!newName) {
        alert('请输入角色名字');
        return;
    }
    
    const chat = chats.find(c => c.id === currentChatId);
    if (!chat) return;
    
    // 内部处理函数
    const processAvatar = (avatarData) => {
        // 1. 更新聊天列表 (chats 表)
        chat.name = newName;
        if (avatarData) {
            chat.avatarImage = avatarData;
        } else if (!chat.avatarImage) {
            // 如果没图且原来也没图，尝试用个人信息兜底(可选)
            // chat.avatarImage = ... 
        }
        
        // 保存 chats 表
        saveToDB('chats', { list: chats });
        
        // 2. ★★★ 核心修复：同步更新角色详情 (characterInfo 表) ★★★
        loadFromDB('characterInfo', (data) => {
            const allCharData = data || {};
            // 确保对象存在
            if (!allCharData[currentChatId]) allCharData[currentChatId] = {};
            
            const charData = allCharData[currentChatId];
            
            // 强制同步名字
            charData.name = newName;
            // 强制同步头像 (如果有新头像)
            if (avatarData) {
                charData.avatarImage = avatarData;
            } else if (chat.avatarImage) {
                // 如果这次没传新图，但 chat 里有旧图，也要同步过来
                charData.avatarImage = chat.avatarImage; 
            }
            
            // 保存 characterInfo 表
            saveToDB('characterInfo', allCharData);
            
            // 3. 刷新所有受影响的 UI
            // 刷新聊天列表
            if (document.getElementById('chatScreen').style.display === 'flex') {
                renderChatList();
            }
            // 刷新聊天详情页标题
            updateDetailPageTitle(currentChatId, newName);
            // 刷新角色信息页
            loadCharacterInfo(currentChatId);
            
            // 关闭弹窗
            closeEditBasicInfo();
            
            alert('基本信息已保存并同步！✨');
        });
    };
    
    // 处理文件读取
    if (avatarFile) {
        const reader = new FileReader();
        reader.onload = (e) => {
            processAvatar(e.target.result);
        };
        reader.readAsDataURL(avatarFile);
    } else {
        // 没有新图片，传 null，复用旧图
        processAvatar(null);
    }
}
// 头像预览功能
document.addEventListener('DOMContentLoaded', () => {
    const editAvatarInput = document.getElementById('editAvatarInput');
    if (editAvatarInput) {
        editAvatarInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    document.getElementById('editAvatarPreview').innerHTML = `<img src="${e.target.result}" alt="预览">`;
                };
                reader.readAsDataURL(file);
            }
        });
    }
});
// 图标编辑相关变量
let currentEditingIcon = null;
let appIcons = {
    world: null,
    chat: null,
    wallpaper: null,
    api: null,
    placeholder1: null,
    placeholder2: null,
    placeholder3: null,
    placeholder4: null
};

const defaultIcons = {
    world: '🌍',
    chat: '💬',
    wallpaper: '🎨',
    api: '⚙️',
    placeholder1: '📱',
    placeholder2: '🎵',
    placeholder3: '📷',
    placeholder4: '🎮'
};

// 加载所有图标
function loadAppIcons() {
    loadFromDB('appIcons', (data) => {
        if (data && data.icons) {
            appIcons = { ...appIcons, ...data.icons };
        }
        updateAllIcons();
    });
}

// 修改后的图标更新逻辑
function updateAllIcons() {
    Object.keys(appIcons).forEach(key => {
        const iconData = appIcons[key];
        const mainIconContainer = document.getElementById(`icon-${key}`);
        const previewIcon = document.getElementById(`preview-${key}`);
        
        // 只有当用户真的上传了自定义图片时，才去覆盖
        if (iconData && iconData.length > 20) { // 简单判断是否为有效图片数据
            if (mainIconContainer) {
                // 如果是图片，就覆盖 HTML
                mainIconContainer.innerHTML = `<img src="${iconData}" style="width: 100%; height: 100%; object-fit: cover; display: block; border-radius: 12px;">`;
            }
            if (previewIcon) {
                previewIcon.innerHTML = `<img src="${iconData}" style="width: 100%; height: 100%; object-fit: cover; display: block; border-radius: 12px;">`;
            }
        } 
        // 否则（如果没有自定义图片），什么都不做！保持 HTML 里写好的 SVG 线条图标！
    });
}



// 打开图标编辑器
function openIconEditor(iconKey) {
    currentEditingIcon = iconKey;
    const currentIcon = appIcons[iconKey] || defaultIcons[iconKey];
    
    const preview = document.getElementById('currentIconPreview');
    if (appIcons[iconKey]) {
        preview.innerHTML = `<img src="${currentIcon}">`;
    } else {
        preview.textContent = currentIcon;
    }
    
    // 清空输入
    document.getElementById('iconFile').value = '';
    document.getElementById('iconUrl').value = '';
    
    // 显示弹窗
    document.getElementById('iconEditorModal').style.display = 'flex';
}

// 关闭图标编辑器
function closeIconEditor(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('iconEditorModal').style.display = 'none';
    currentEditingIcon = null;
}

// 切换图标标签
function switchIconTab(tab) {
    document.querySelectorAll('#iconEditorModal .tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    document.querySelectorAll('#iconEditorModal .tab-content').forEach(content => content.classList.remove('active'));
    if (tab === 'local') {
        document.getElementById('iconLocalTab').classList.add('active');
    } else if (tab === 'url') {
        document.getElementById('iconUrlTab').classList.add('active');
    }
}

// 恢复默认图标
function resetToDefaultIcon() {
    if (!currentEditingIcon) return;
    
    appIcons[currentEditingIcon] = null;
    saveToDB('appIcons', { id: 1, icons: appIcons });
    updateAllIcons();
    closeIconEditor();
}

// 保存图标
function saveAppIcon() {
    if (!currentEditingIcon) return;
    
    const fileInput = document.getElementById('iconFile');
    const urlInput = document.getElementById('iconUrl');
    
    if (fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            appIcons[currentEditingIcon] = e.target.result;
            saveToDB('appIcons', { id: 1, icons: appIcons });
              updateAllIcons(); 
            closeIconEditor();
        };
        reader.readAsDataURL(fileInput.files[0]);
    } else if (urlInput.value) {
        appIcons[currentEditingIcon] = urlInput.value;
        saveToDB('appIcons', { id: 1, icons: appIcons });
        updateAllIcons();
        closeIconEditor();
    } else {
        alert('请选择图片或输入网址');
    }
}

// 图标文件预览
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        const checkbox = document.getElementById('cityInfoCheckbox');
        if (checkbox) {
            // 先移除旧的监听器（如果有的话，防止重复），这里直接覆盖 onclick
            checkbox.onclick = function(e) {
                // 不阻止默认行为，让勾选框先变色，体验更好
                if (this.checked) {
                    openCityInfoModal(); // 开启 -> 弹窗
                } else {
                    if (confirm('确定取消城市信息功能吗？')) {
                        disableCityInfo(); // 关闭 -> 清除数据
                    } else {
                        this.checked = true; // 后悔了 -> 恢复勾选
                    }
                }
            };
        }
    }, 500);
});




// 城市信息相关变量
let weatherData = {
    char: null,
    my: null,
    updateTime: null
};

// 复选框点击处理
function handleCityInfoCheckbox() {
    const checkbox = document.getElementById('cityInfoCheckbox');
    
    if (checkbox.checked) {
        // 勾选：打开设置弹窗
        openCityInfoModal();
    } else {
        // 取消勾选：禁用功能
        if (confirm('确定取消城市信息功能吗？')) {
            disableCityInfo();
        } else {
            checkbox.checked = true;
        }
    }
}

// 打开城市信息设置弹窗
function openCityInfoModal() {
    if (!currentChatId) {
        alert('请先打开角色信息页面');
        const checkbox = document.getElementById('cityInfoCheckbox');
        if (checkbox) checkbox.checked = false;
        return;
    }
    
    loadFromDB('characterInfo', function(data) {
        const charData = data && data[currentChatId] ? data[currentChatId] : {};
        
        if (charData.charWeather && charData.myWeather) {
            weatherData = {
                char: charData.charWeather,
                my: charData.myWeather,
                updateTime: charData.weatherUpdateTime || getCurrentTime()
            };
        } else {
            weatherData = { char: null, my: null, updateTime: null };
        }
        
        document.getElementById('cityInfoModal').style.display = 'flex';
        
        const fields = {
            'charVirtualAddress': charData.charVirtualAddress || '',
            'charRealAddress': charData.charRealAddress || '',
            'myVirtualAddress': charData.myVirtualAddress || '',
            'myRealAddress': charData.myRealAddress || ''
        };
        
        for (let id in fields) {
            const el = document.getElementById(id);
            if (el) el.value = fields[id];
        }
        
        if (charData.charWeather && charData.myWeather) {
            displayWeatherPreview(charData);
        } else {
            const preview = document.getElementById('weatherPreview');
            if (preview) preview.style.display = 'none';
        }
    });
}





// 关闭弹窗
function closeCityInfoModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('cityInfoModal').style.display = 'none';
    
    // 检查是否已保存
    loadFromDB('characterInfo', (data) => {
        const charData = data && data[currentChatId] ? data[currentChatId] : {};
        const checkbox = document.getElementById('cityInfoCheckbox');
        if (checkbox && !charData.cityInfoEnabled) {
            checkbox.checked = false;
        }
    });
}

// 获取天气数据
async function fetchWeatherData() {
    const charCity = document.getElementById('charRealAddress').value.trim();
    const myCity = document.getElementById('myRealAddress').value.trim();
    
    if (!charCity || !myCity) {
        alert('请先填写参考地址');
        return;
    }
    
    const btn = event.target;
    
    try {
        btn.disabled = true;
        btn.textContent = '正在获取...';
        
        // 并发获取天气
        const [charWeather, myWeather] = await Promise.all([
            searchCityWeather(charCity),
            searchCityWeather(myCity)
        ]);
        
        weatherData = {
            char: charWeather,
            my: myWeather,
            updateTime: getCurrentTime()
        };
        
        // 显示预览
        displayWeatherPreview({
            charVirtualAddress: document.getElementById('charVirtualAddress').value || charCity,
            charRealAddress: charCity,
            charWeather: charWeather,
            myVirtualAddress: document.getElementById('myVirtualAddress').value || myCity,
            myRealAddress: myCity,
            myWeather: myWeather,
            weatherUpdateTime: weatherData.updateTime
        });
        
    } catch (error) {
        alert('获取天气失败：' + error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = '获取地址信息';
    }
}

// 搜索城市天气（使用OpenWeatherMap）
async function searchCityWeather(cityName) {
  
    // 将你的API key填在这里
    const apiKey = 'da8886b092269010824f1fcbc62e5115';
     // 城市名称映射（中文转拼音）
    const cityMap = {
        '北京': 'Beijing',
        '上海': 'Shanghai',
        '广州': 'Guangzhou',
        '深圳': 'Shenzhen',
        '杭州': 'Hangzhou',
        '成都': 'Chengdu',
        '西安': 'Xian',
        '武汉': 'Wuhan',
        '南京': 'Nanjing',
        '重庆': 'Chongqing'
    };
   // 如果是中文城市名，转换为拼音
    const searchCity = cityMap[cityName] || cityName;
    try {
        // 调用OpenWeatherMap 5天预报API（包含今天和明天）
        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(cityName)}&appid=${apiKey}&units=metric&lang=zh_cn`
        );
        
    if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`获取天气失败: ${errorData.message || response.status}`);
}

        
        const data = await response.json();
        
        // 获取当前时间
        const now = new Date();
        const todayDate = now.toISOString().split('T')[0];
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowDate = tomorrow.toISOString().split('T')[0];
        
        // 筛选今天和明天的数据
        const todayData = data.list.filter(item => 
            item.dt_txt.startsWith(todayDate)
        );
        const tomorrowData = data.list.filter(item => 
            item.dt_txt.startsWith(tomorrowDate)
        );
        
        // 计算今天的温度范围
        let todayTemps = todayData.map(item => item.main.temp);
        if (todayTemps.length === 0) {
            todayTemps = [data.list[0].main.temp];
        }
        const todayMin = Math.round(Math.min(...todayTemps));
        const todayMax = Math.round(Math.max(...todayTemps));
        
        // 计算明天的温度范围
        let tomorrowTemps = tomorrowData.map(item => item.main.temp);
        if (tomorrowTemps.length === 0) {
            tomorrowTemps = [data.list[8].main.temp];
        }
        const tomorrowMin = Math.round(Math.min(...tomorrowTemps));
        const tomorrowMax = Math.round(Math.max(...tomorrowTemps));
        
        // 获取天气描述（取第一个）
        const todayCondition = todayData.length > 0 
            ? todayData[0].weather[0].description 
            : data.list[0].weather[0].description;
        const tomorrowCondition = tomorrowData.length > 0 
            ? tomorrowData[0].weather[0].description 
            : data.list[8].weather[0].description;
        
        return {
            today: {
                condition: todayCondition,
                temp: `${todayMin}-${todayMax}°C`
            },
            tomorrow: {
                condition: tomorrowCondition,
                temp: `${tomorrowMin}-${tomorrowMax}°C`
            }
        };
        
    } catch (error) {
        console.error('获取天气失败：', error);
        throw new Error('无法获取天气信息，请检查城市名称');
    }
}

// 显示天气预览 (Ins 宽敞清晰版)
function displayWeatherPreview(data) {
    const preview = document.getElementById('weatherPreview');
    if (!preview) return;
    
    // 生成漂亮的卡片 HTML
    preview.innerHTML = `
        <div class="weather-preview-card">
            
            <div class="weather-section border-bottom">
                <div class="weather-city-title">
                    <span>📍</span> ${data.charVirtualAddress}
                </div>
                
                <div class="weather-data-row is-today">
                    <span>今天 ${data.charWeather.today.condition}</span>
                    <span>${data.charWeather.today.temp}</span>
                </div>
                
                <div class="weather-data-row is-tomorrow">
                    <span>明天 ${data.charWeather.tomorrow.condition}</span>
                    <span>${data.charWeather.tomorrow.temp}</span>
                </div>
            </div>
            
            <div class="weather-section">
                <div class="weather-city-title">
                    <span>🏠</span> ${data.myVirtualAddress}
                </div>
                
                <div class="weather-data-row is-today">
                    <span>今天 ${data.myWeather.today.condition}</span>
                    <span>${data.myWeather.today.temp}</span>
                </div>
                
                <div class="weather-data-row is-tomorrow">
                    <span>明天 ${data.myWeather.tomorrow.condition}</span>
                    <span>${data.myWeather.tomorrow.temp}</span>
                </div>
            </div>
            
            <div class="weather-update-time">
                Last update: ${data.weatherUpdateTime}
            </div>
        </div>
    `;
    
    // 显示容器
    preview.style.display = 'block';
    
    // 自动滚动到底部，确保用户看到结果
    const modalBody = document.querySelector('.ins-modal-body');
    if (modalBody) {
        //稍微延时一点点，确保渲染完再滚动
        setTimeout(() => {
            modalBody.scrollTop = modalBody.scrollHeight;
        }, 50);
    }
}

// 保存城市信息
function saveCityInfo() {
    const charVirtual = document.getElementById('charVirtualAddress').value.trim();
    const charReal = document.getElementById('charRealAddress').value.trim();
    const myVirtual = document.getElementById('myVirtualAddress').value.trim();
    const myReal = document.getElementById('myRealAddress').value.trim();
    
    if (!charReal || !myReal) {
        alert('请填写参考地址');
        return;
    }
    
    function performSave() {
        loadFromDB('characterInfo', function(data) {
            const allCharData = data || {};
            const charData = allCharData[currentChatId] || {};
            
            charData.cityInfoEnabled = true;
            charData.lastWeatherDate = new Date().toISOString().split('T')[0];
            charData.weatherUpdateTime = weatherData.updateTime;
            
            charData.charVirtualAddress = charVirtual || charReal;
            charData.charRealAddress = charReal;
            charData.charWeather = weatherData.char;
            
            charData.myVirtualAddress = myVirtual || myReal;
            charData.myRealAddress = myReal;
            charData.myWeather = weatherData.my;
            
            allCharData[currentChatId] = charData;
            saveToDB('characterInfo', allCharData);
            
            alert('城市信息已保存');
            closeCityInfoModal();
            // 保存后显示查看按钮
const viewBtn = document.getElementById('viewWeatherBtn');
if (viewBtn) viewBtn.style.display = 'block';

            const checkbox = document.getElementById('cityInfoCheckbox');
            if (checkbox) checkbox.checked = true;
        });
    }
    
    if (!weatherData.char || !weatherData.my) {
        loadFromDB('characterInfo', function(data) {
            const charData = data && data[currentChatId] ? data[currentChatId] : {};
            
            if (charData.charWeather && charData.myWeather) {
                weatherData = {
                    char: charData.charWeather,
                    my: charData.myWeather,
                    updateTime: charData.weatherUpdateTime || getCurrentTime()
                };
                performSave();
            } else {
                alert('请先获取天气信息');
            }
        });
        return;
    }
    
    performSave();
}



// 禁用城市信息
function disableCityInfo() {
    loadFromDB('characterInfo', (data) => {
        const allCharData = data || {};
        const charData = allCharData[currentChatId] || {};
        
        charData.cityInfoEnabled = false;
        
        allCharData[currentChatId] = charData;
        saveToDB('characterInfo', allCharData);
    });
}
      // 查看当前天气
function viewCurrentWeather(event) {
    event.preventDefault();
    event.stopPropagation();
    
    if (!currentChatId) return;
    
    loadFromDB('characterInfo', (data) => {
        const charData = data && data[currentChatId] ? data[currentChatId] : {};
        
        if (!charData.cityInfoEnabled || !charData.charWeather || !charData.myWeather) {
            alert('暂无天气数据，请先设置城市信息');
            return;
        }
        
        const weatherInfo = `
【${charData.charVirtualAddress}（${charData.charRealAddress}）】
今天：${charData.charWeather.today.condition} ${charData.charWeather.today.temp}
明天：${charData.charWeather.tomorrow.condition} ${charData.charWeather.tomorrow.temp}

【${charData.myVirtualAddress}（${charData.myRealAddress}）】
今天：${charData.myWeather.today.condition} ${charData.myWeather.today.temp}
明天：${charData.myWeather.tomorrow.condition} ${charData.myWeather.tomorrow.temp}

最后更新：${charData.weatherUpdateTime || '未知'}
        `.trim();
        
        alert(weatherInfo);
    });
}

// 检查并自动更新天气
async function checkAndUpdateWeather(chatId) {
    loadFromDB('characterInfo', async (data) => {
        const charData = data && data[chatId] ? data[chatId] : {};
        
        // 如果未启用城市信息，直接返回
        if (!charData.cityInfoEnabled) return;
        
        // 获取今天日期
        const today = new Date().toISOString().split('T')[0];
        
        // 如果日期不同，自动更新天气
        if (charData.lastWeatherDate !== today) {
            try {
                // 并发获取天气
                const [charWeather, myWeather] = await Promise.all([
                    searchCityWeather(charData.charRealAddress),
                    searchCityWeather(charData.myRealAddress)
                ]);
                
                // 更新数据
                charData.lastWeatherDate = today;
                charData.weatherUpdateTime = getCurrentTime();
                charData.charWeather = charWeather;
                charData.myWeather = myWeather;
                
                // 保存到数据库
                const allCharData = data || {};
                allCharData[chatId] = charData;
                saveToDB('characterInfo', allCharData);
                
                // 显示同步提示
                showWeatherSyncTip();
                
            } catch (error) {
                console.error('自动更新天气失败：', error);
            }
        }
    });
}

// 显示天气同步提示
function showWeatherSyncTip() {
    // 创建提示元素
    const tip = document.createElement('div');
    tip.className = 'weather-sync-tip';
    tip.textContent = '✅ 今天天气信息已同步';
    tip.style.cssText = `
        position: fixed;
        top: 70px;
        left: 50%;
        transform: translateX(-50%);
        background: #1dd1a1;
        color: white;
        padding: 10px 20px;
        border-radius: 20px;
        font-size: 14px;
        z-index: 1001;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        animation: fadeInOut 3s ease-in-out;
    `;
    
    // 添加动画
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeInOut {
            0% { opacity: 0; transform: translate(-50%, -10px); }
            10% { opacity: 1; transform: translate(-50%, 0); }
            90% { opacity: 1; transform: translate(-50%, 0); }
            100% { opacity: 0; transform: translate(-50%, -10px); }
        }
    `;
    document.head.appendChild(style);
    
    // 添加到页面
    document.body.appendChild(tip);
    
    // 3秒后移除
    setTimeout(() => {
        tip.remove();
        style.remove();
    }, 3000);
}
// 渲染世界书选择器
function renderWorldbookSelector(selectedIds) {
    const container = document.getElementById('worldbookSelector');
    if (!container) return;
    
    // 加载所有世界书
    loadFromDB('worldbooks', (data) => {
        const allWorldbooks = data || [];
        
        if (allWorldbooks.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: #999; padding: 20px;">暂无世界书，请先在世界书页面添加</div>';
            return;
        }
        
        // 渲染复选框列表
      // 渲染复选框列表
container.innerHTML = allWorldbooks.map(wb => {
    const title = wb.title || '未命名世界书';
    const category = wb.category || '默认分类';
    const isChecked = selectedIds.includes(wb.id);
    
    return `
        <div style="display: flex; align-items: center; padding: 10px; border-bottom: 1px solid #f0f0f0; background: ${isChecked ? '#f0f8ff' : 'white'};">
            <input type="checkbox" 
                   id="wb-${wb.id}" 
                   value="${wb.id}" 
                   ${isChecked ? 'checked' : ''}
                   style="width: 20px; height: 20px; margin-right: 12px; cursor: pointer; flex-shrink: 0;">
            <label for="wb-${wb.id}" style="flex: 1; cursor: pointer; font-size: 15px; line-height: 1.5;">
                <div style="font-weight: 600; color: #333; margin-bottom: 3px;">${title}</div>
                <div style="font-size: 12px; color: #999;">分类：${category}</div>
            </label>
        </div>
    `;
}).join('');

    
    });
}

// 获取选中的世界书ID列表
function getSelectedWorldbooks() {
    const container = document.getElementById('worldbookSelector');
    if (!container) {
   
        return [];
    }
    
    const checkboxes = container.querySelectorAll('input[type="checkbox"]:checked');
    if (!checkboxes || checkboxes.length === 0) {
    
        return [];
    }
    
    const ids = Array.from(checkboxes).map(cb => parseInt(cb.value));
 
    return ids;
}

// 获取关联世界书的内容（修复版）
async function getLinkedWorldbooksContent(linkedIds) {
    // 1. 基础检查
    if (!linkedIds || !Array.isArray(linkedIds) || linkedIds.length === 0) {
        return '无';
    }
    
    return new Promise((resolve) => {
        loadFromDB('worldbooks', (data) => {
            try {
                // 2. 强制数据安全检查
                // 无论数据库返回什么，我们都确保 allWorldbooks 是一个数组
                let allWorldbooks = [];
                if (Array.isArray(data)) {
                    allWorldbooks = data;
                } else if (data && Array.isArray(data.list)) {
                    allWorldbooks = data.list;
                }
                
                // 3. 安全过滤
                // 增加 wb && wb.id 的判断，防止空数据导致报错
                const linkedBooks = allWorldbooks.filter(wb => wb && linkedIds.includes(wb.id));
                
                if (linkedBooks.length === 0) {
                    resolve('无');
                    return;
                }
                
                // 4. 生成内容
                const content = linkedBooks.map(wb => 
                    `【${wb.title || '无标题'}】\n${wb.content || ''}`
                ).join('\n\n');
                
                resolve(content);
                
            } catch (error) {
                // 5. 错误兜底：如果发生任何错误，打印日志并返回"无"，防止卡死
                console.error("读取世界书出错:", error);
                resolve('无'); 
            }
        });
    });
}
// 导出聊天记录
function exportChatHistory() {
    if (!currentChatId) {
        alert('请先打开角色信息页面');
        return;
    }
    
    const chat = chats.find(c => c.id === currentChatId);
    if (!chat) return;
    
    // 获取当前角色的所有消息
    loadFromDB('messages', (data) => {
        const allData = data && data.list ? data.list : [];
        const chatMessages = allData.filter(m => m.chatId === currentChatId);
        
        if (chatMessages.length === 0) {
            alert('暂无聊天记录');
            return;
        }
        
        // 按时间正序排序
        chatMessages.sort((a, b) => new Date(a.time) - new Date(b.time));
        
        // 构建导出内容
        const now = new Date();
        const exportTime = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        let content = `=== 与${chat.name}的聊天记录 ===\n`;
        content += `导出时间：${exportTime}\n\n`;
        
        // 遍历消息
        chatMessages.forEach(msg => {
            const timeStr = msg.time || '';
            const sender = msg.senderId === 'me' ? '我' : chat.name;
            
            // 如果是撤回消息
            if (msg.isRevoked) {
                content += `[${timeStr}] ${sender}: ${msg.content} [已撤回]\n`;
            } else {
                content += `[${timeStr}] ${sender}: ${msg.content}\n`;
            }
        });
        
        // 创建并下载文件
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `聊天记录_${chat.name}_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}.txt`;
        a.click();
        
        // 释放URL对象
        URL.revokeObjectURL(url);
        
        alert('聊天记录已导出');
    });
}
      // 导入聊天记录
function importChatHistory(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!currentChatId) {
        alert('请先打开角色信息页面');
        event.target.value = '';
        return;
    }
    
    const chat = chats.find(c => c.id === currentChatId);
    if (!chat) {
        event.target.value = '';
        return;
    }
    
    // 确认导入
    if (!confirm(`确定要导入聊天记录吗？\n\n注意：\n1. 导入的消息会追加到现有记录后面\n2. 不会覆盖现有记录\n3. 导入后无法撤销`)) {
        event.target.value = '';
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        
        try {
            // 解析TXT文件
            const lines = content.split('\n');
            let importedCount = 0;
            let currentTime = new Date();
            
            // 跳过前3行（标题、导出时间、空行）
            for (let i = 3; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                
                // 匹配格式：[时间] 发送者: 内容
                const match = line.match(/^\[(.+?)\]\s+(.+?):\s+(.+)$/);
                if (!match) continue;
                
                const timeStr = match[1];
                const sender = match[2];
                const messageContent = match[3];
                
                // 跳过已撤回的消息
                if (messageContent.includes('[已撤回]')) continue;
                
                // 生成新消息ID
                const newId = allMessages.length > 0 ? Math.max(...allMessages.map(m => m.id || 0)) + 1 : 1;
                
                // 判断发送者
                const senderId = sender === '我' ? 'me' : chat.name;
                
                // 创建消息对象
                const newMessage = {
                    id: newId,
                    chatId: currentChatId,
                    type: 'text',
                    content: messageContent,
                    senderId: senderId,
                    time: timeStr || getCurrentTime(),
                    isRevoked: false
                };
                
                allMessages.push(newMessage);
                importedCount++;
                
                // 每隔100ms增加一点时间，避免时间戳完全相同
                currentTime = new Date(currentTime.getTime() + 100);
            }
            
            if (importedCount === 0) {
                alert('未能识别到有效的聊天记录格式');
                event.target.value = '';
                return;
            }
            
            // 保存到数据库
            saveMessages();
            
            // 更新聊天列表
            if (importedCount > 0) {
                const lastMessage = allMessages[allMessages.length - 1];
                updateChatLastMessage(currentChatId, lastMessage.content);
            }
            
            alert(`成功导入 ${importedCount} 条聊天记录`);
            
            // 如果当前在聊天详情页，刷新显示
            if (document.getElementById('chatDetailScreen').style.display === 'flex') {
                visibleMessagesCount = Math.min(visibleMessagesCount + importedCount, allMessages.length);
                renderMessages();
                scrollToBottom();
            }
            
        } catch (error) {
            console.error('导入失败：', error);
            alert('导入失败：文件格式错误或内容无法解析');
        }
        
        // 清空input，允许重复导入
        event.target.value = '';
    };
    
    reader.onerror = function() {
        alert('文件读取失败，请重试');
        event.target.value = '';
    };
    
    reader.readAsText(file, 'UTF-8');
}

// 清除聊天记录
function clearChatHistory() {
    if (!currentChatId) {
        alert('请先打开角色信息页面');
        return;
    }
    
    const chat = chats.find(c => c.id === currentChatId);
    if (!chat) return;
    
    // 二次确认
    if (!confirm(`确定要清除与"${chat.name}"的所有聊天记录吗？\n此操作无法撤销！`)) {
        return;
    }
    
    // 再次确认（双重保险）
    if (!confirm('最后确认：真的要删除吗？删除后无法恢复！')) {
        return;
    }
    
    // 从数据库删除当前角色的所有消息
    loadFromDB('messages', (data) => {
        const allData = data && data.list ? data.list : [];
        
        // 过滤掉当前角色的消息
        const remainingMessages = allData.filter(m => m.chatId !== currentChatId);
        
        // 保存到数据库
        const transaction = db.transaction(['messages'], 'readwrite');
        const objectStore = transaction.objectStore('messages');
        objectStore.put({ id: 1, list: remainingMessages });
        
        // 清空内存中的消息
        allMessages = [];
        visibleMessagesCount = 30;
        
        // 更新聊天列表的最后一条消息
        chat.lastMessage = '';
        chat.lastMessageTime = getCurrentTime();
        chat.time = '刚刚';
        saveToDB('chats', { list: chats });
        
        alert('聊天记录已清除');
        
        // 如果当前在聊天详情页，刷新显示
        if (document.getElementById('chatDetailScreen').style.display === 'flex') {
            renderMessages();
        }
    });
}


// 初始化，
        initDB();
