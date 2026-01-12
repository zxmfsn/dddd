 // IndexedDB 操作
        let db;
        let currentWallpaper = null;
        // 日记功能相关变量
let diaries = [];
let currentViewingDiaryId = null;

// ============ 强制修复版：数据库初始化 (版本号 25) ============
function initDB() {
    // ★★★ 重点：版本号改成 25，强制触发更新！ ★★★
    const request = indexedDB.open('phoneData', 25);
    
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
    
        
        // ★ 尝试加载记忆，检查是否正常
        if (db.objectStoreNames.contains('memories')) {
            loadMemories();
        } else {
            console.error('严重警告：memories 表依然不存在！请检查 onupgradeneeded 是否执行。');
        }
        // ▼▼▼ 新增：启动自动总结定时器 ▼▼▼
setTimeout(() => {
    startAutoSummaryTimer();
}, 2000); // 延迟2秒启动，确保数据加载完成
// ▲▲▲ 新增结束 ▲▲▲

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
        
        // ★★★ 记忆功能表 (本次修复的主角) ★★★
        if (!db.objectStoreNames.contains('memories')) {
            console.log('正在创建 memories 表...');
            const store = db.createObjectStore('memories', { keyPath: 'id', autoIncrement: true });
            store.createIndex('chatId', 'chatId', { unique: false });
        }
    };
}


function saveToDB(storeName, data) {
    const transaction = db.transaction([storeName], 'readwrite');
    const objectStore = transaction.objectStore(storeName);
    
    // ▼▼▼ 修改下面这一行，把 products 和 shoppingCart 加进去 ▼▼▼
    if (storeName === 'worldbooks' || storeName === 'categories' || storeName === 'chats' || storeName === 'messages' || storeName === 'products' || storeName === 'shoppingCart') {
        objectStore.put({ id: 1, list: data.list || data });
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

// 新增函数：异步更新聊天显示名称
function updateChatDisplayName(chatId) {
// 保存到数据库
loadFromDB('characterInfo', (data) => {
    const charData = data && data[currentChatId] ? data[currentChatId] : {};
    // 只有当用户开启了状态监控才更新
    if (charData.statusMonitorEnabled) {
        const allData = data || {};
        if (!allData[currentChatId]) allData[currentChatId] = {};
        
        // 合并旧数据
        const oldMonitor = allData[currentChatId].statusMonitor || {};
        
        // ▼▼▼ 修改：智能合并，日程为null时保留旧数据 ▼▼▼
        const mergedStatus = { ...oldMonitor };
        
        // 逐字段更新（跳过null值）
        Object.keys(newStatus).forEach(key => {
            if (newStatus[key] !== null && newStatus[key] !== undefined) {
                mergedStatus[key] = newStatus[key];
            }
        });
        
        allData[currentChatId].statusMonitor = mergedStatus;
        // ▲▲▲ 修改结束 ▲▲▲
        
        saveToDB('characterInfo', allData);
        
        // 实时更新悬浮条心跳
        const bpmEl = document.getElementById('heartbeatBpm');
        if (bpmEl) bpmEl.textContent = mergedStatus.heartbeat || newStatus.heartbeat;
    }
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

// 删除聊天
function deleteChat(chatId) {
    if (!confirm('确定删除该聊天吗？删除后不可恢复')) {
        return;
    }
    
    // 从数组中删除
    chats = chats.filter(c => c.id !== chatId);
    
    // 保存到数据库
    saveToDB('chats', { list: chats });
    
    // 刷新列表
    renderChatList();
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
        chatInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 72) + 'px';
        });
        
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
    input.style.height = 'auto';
    
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


if (followersEl) followersEl.textContent = charData.followers || 0;
if (followingEl) followingEl.textContent = charData.following || 0;
if (itineraryEl) itineraryEl.textContent = charData.itinerary || 0;

    });
  // 更新日记数量
updateDiaryCount();
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
// ============ 日记功能 ============

// 打开日记列表
function openDiaryList() {
    if (!currentChatId) return;
    
    const chat = chats.find(c => c.id === currentChatId);
    if (!chat) return;
    
    // 隐藏角色信息页，显示日记页
    document.getElementById('characterInfoScreen').style.display = 'none';
    document.getElementById('diaryScreen').style.display = 'flex';
    
    // 设置标题
    document.getElementById('diaryOwnerName').textContent = `${chat.name}的日记`;
    
    // 设置写日记的头像和名字
    const writingAvatar = document.getElementById('writingAvatar');
    if (chat.avatarImage) {
        writingAvatar.innerHTML = `<img src="${chat.avatarImage}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
    } else {
        writingAvatar.textContent = chat.avatar;
    }
    document.getElementById('writerName').textContent = chat.name;
    
    // 加载日记列表
    loadDiaries();
}

// 返回角色信息页
function backToCharacterInfo() {
    document.getElementById('diaryScreen').style.display = 'none';
    document.getElementById('characterInfoScreen').style.display = 'flex';
}

// 加载日记列表
function loadDiaries() {
    loadFromDB('diaries', (data) => {
        const allDiaries = data && data.list ? data.list : [];
        // 筛选当前角色的日记
        diaries = allDiaries.filter(d => d.chatId === currentChatId);
        // 按时间倒序排列（最新的在前）
        diaries.sort((a, b) => new Date(b.createTime) - new Date(a.createTime));
        renderDiaryList();
    });
}

// 渲染日记列表
function renderDiaryList() {
    const container = document.getElementById('diaryListContainer');
    
    if (diaries.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #999; margin-top: 50px;">还没有日记哦~</div>';
        return;
    }
    
    container.innerHTML = diaries.map(diary => `
        <div class="diary-card" onclick="openDiaryDetail(${diary.id})">
            <div class="diary-title">${diary.title}</div>
            <div class="diary-time">${formatDiaryTime(diary.createTime)}</div>
            <div class="diary-preview">${getPreviewText(diary)}</div>
            <div class="diary-tags">
                ${diary.tags.map(tag => `<span class="diary-tag">#${tag}</span>`).join('')}
            </div>
        </div>
    `).join('');
}

// 格式化日记时间
function formatDiaryTime(timeStr) {
    const time = new Date(timeStr);
    return `${time.getFullYear()}年${time.getMonth() + 1}月${time.getDate()}日 ${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;
}

// 获取预览文本
function getPreviewText(diary) {
    // 防御性编程
    if (!diary || !diary.sections || !Array.isArray(diary.sections)) {
        return '暂无内容';
    }
    
    let preview = '';
    if (diary.sections.length > 0) {
        const firstSection = diary.sections[0];
        if (firstSection && firstSection.items && firstSection.items.length > 0) {
            preview = firstSection.items[0].text || '';
        } else if (firstSection && firstSection.content) {
            preview = firstSection.content;
        }
    }
    
    // 确保返回值是字符串
    preview = String(preview || '暂无内容');
    return preview.substring(0, 100) + (preview.length > 100 ? '...' : '');
}



// 召唤日记（点击召唤卡片）
function summonDiary() {
    // 触发星星特效
    triggerStarsEffect();
    
    // 隐藏召唤卡片，显示写日记状态
    document.getElementById('summonCard').style.display = 'none';
    document.getElementById('writingCard').style.display = 'block';
    
    // 调用AI生成日记
    setTimeout(() => {
        generateDiary();
    }, 300);
}

// 星星特效
function triggerStarsEffect() {
    const container = document.getElementById('starsContainer');
    const emojis = ['✨', '⭐', '🌟', '💫', '⚡'];
    
    // 生成5个星星
    for (let i = 0; i < 5; i++) {
        setTimeout(() => {
            const star = document.createElement('div');
            star.className = 'star';
            star.textContent = emojis[Math.floor(Math.random() * emojis.length)];
            
            // 随机方向
            const angle = Math.random() * 90 - 45;
            const distance = 50 + Math.random() * 30;
            const tx = Math.cos(angle * Math.PI / 180) * distance;
            const ty = Math.sin(angle * Math.PI / 180) * distance;
            
            star.style.setProperty('--tx', tx + 'px');
            star.style.setProperty('--ty', ty + 'px');
            
            container.appendChild(star);
            
            // 动画结束后移除
            setTimeout(() => star.remove(), 600);
        }, i * 100);
    }
}

// AI生成日记
async function generateDiary() {
    if (!currentChatId) return;
    
    // 检查API配置
    if (!currentApiConfig.baseUrl || !currentApiConfig.apiKey) {
        alert('请先在API设置中配置');
        document.getElementById('writingCard').style.display = 'none';
        document.getElementById('summonCard').style.display = 'block';
        return;
    }
    
    const chat = chats.find(c => c.id === currentChatId);
    const characterInfo = await new Promise(resolve => {
        loadFromDB('characterInfo', data => {
            resolve(data && data[currentChatId] ? data[currentChatId] : {});
        });
    });
    
    const today = new Date();
    const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
    const timeStr = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;
    
    // 构建天气信息
    let weatherInfo = '';
    if (characterInfo.cityInfoEnabled && characterInfo.charWeather) {
        weatherInfo = `当前天气：${characterInfo.charWeather.today.condition}，${characterInfo.charWeather.today.temp}`;
    }
 
// 获取最近30轮的聊天记忆（智能版）
const recentMessages = await new Promise(resolve => {
    loadFromDB('messages', (data) => {
        const allData = data && data.list ? data.list : [];
        const chatMessages = allData.filter(m => m.chatId === currentChatId);
        
        // ========== 按轮次提取消息 ==========
        const rounds = [];
        let currentRound = [];
        let lastSender = null;
        
        // 从后往前遍历
        for (let i = chatMessages.length - 1; i >= 0; i--) {
            const msg = chatMessages[i];
            
            // 如果发送者变了，说明换轮了
            if (lastSender !== null && msg.senderId !== lastSender) {
                if (currentRound.length > 0) {
                    rounds.unshift(currentRound); // 插入到开头
                    currentRound = [];
                }
            }
            
            currentRound.unshift(msg); // 插入到当前轮的开头
            lastSender = msg.senderId;
            
            // 如果已经收集了30轮，停止
            if (rounds.length >= 30) break;
        }
        
        // 别忘了最后一轮
        if (currentRound.length > 0 && rounds.length < 30) {
            rounds.unshift(currentRound);
        }
        
        // 取前30轮
        const recentRounds = rounds.slice(-30);
        
        // 展平成消息列表
        const recentMsgs = recentRounds.flat();
        
     
        
        // 格式化
        const formatted = recentMsgs
            .filter(msg => {
             // ★★★ 核心修复：这里必须要把没有 content 的消息类型都过滤掉 ★★★
                if (msg.type === 'image') return false;
                if (msg.type === 'transfer') return false;
                if (msg.type === 'voice') return false;
                if (msg.type === 'system') return false;
                if (msg.type === 'shopping_order') return false; // 🛍️ 新增：过滤购物订单
                if (!msg.content) return false; // 🛡️ 兜底：如果没有内容，直接过滤
                if (msg.isRevoked) return false;
                return true;
            })
            .map(msg => {
                const sender = msg.senderId === 'me' ? '对方' : '我';
                const content = msg.content.substring(0, 100);
                return `${sender}：${content}`;
            })
            .join('\n');
        
        resolve(formatted || '暂无聊天记录');
    });
});

 // ================= 进阶优化：全家桶版 =================
    
    // 1. 定义一个【超级灵感库】（包含你的旧爱 + 新欢）
    const allCreativeModules = [
        // --- 你的经典款 (绝不丢失！) ---
        "❤️ 恋爱日记 (记录甜蜜瞬间)",
        "📝 备忘录 (重要的事情记下来)",
        "💢 记仇本 (虽然记仇但还是爱你的)",
        "🥴 精神状态 (发疯/emo/平静)",
        "🤔 反思复盘 (吾日三省吾身)",
        "👗 今日OOTD (穿搭记录)",
        "📅 TodoList (待办事项)",
        "😊 开心小事 (微小但确定的幸福)",
        "😖 烦恼清单 (吐槽大会)",

        // --- 新增的盲盒趣味款 ---
        "👀 偷听到的 (记录对方说过的金句)",
        "💡 脑洞大开 (突然想到的怪点子)",
        "🍽️ 干饭记录 (今天吃了啥/想吃啥)",
        "🎵 今日BGM (一首符合心情的歌)",
        "🔋 社交电量 (显示剩余电量%)",
        "🛌 梦境碎片 (昨晚做了什么梦)",
        "📢 系统公告 (假装发布一条新闻)",
        "💊 今日药方 (给心情开个药)",
        "🛒 许愿清单 (想要的东西)",
        "🏆 今日成就 (哪怕是按时起床也算)"
    ];

    // 2. 随机抽取 10 个给 AI 挑选（保证每次打开日记都有新鲜感）
    // 这样既可能出现“恋爱日记”，也可能出现“社交电量”，充满惊喜！
    const suggestedModules = allCreativeModules
        .sort(() => 0.5 - Math.random()) // 打乱顺序
        .slice(0, 10)                    // 取前10个
        .join("\n");

    const diaryPrompt = `你是${chat.name}，现在是${dateStr} ${timeStr}。请写一篇**灵魂有趣、拒绝流水账**的个人日记。

【角色人设】
${characterInfo.personality || '一个真实有趣的人'}

【对方人设】
${characterInfo.myPersonality || '无'}

【最近30轮聊天记忆】
${recentMessages}

请根据聊天内容，**智能选择最合适的板块**来写日记。

【核心要求】
1. **日记标题**：必须搞怪、有趣或文艺。（例如：“关于我今天差点饿死这件事”、“某人今天怪怪的”）
2. **今日天气/心情**：可以用颜文字或emoji搞怪。

【动态板块生成规则】
请从下面列表中选择 **3个** 最贴合今天聊天内容的板块，然后再 **自创 1 个** 与今天对话高度相关的“限定板块”。
(总共 4 个板块)

[本次随机备选池]:
${suggestedModules}

**自创板块示例**：
- 如果聊了游戏 -> [🎮 峡谷战况]
- 如果聊了吵架 -> [🏳️ 举白旗投降] 或 [😤 今天的理都在我这]
- 如果聊了熬夜 -> [🐼 秃头以此明志]

【今日感悟】（固定在最后）
- 字数：200-300字
- 必须分成3段，每段开头空两格
- 像朋友谈心一样，走心、真实

【严格输出格式示例】
标题: 震惊！某人竟然...
今日天气: 🌤️ 适合想你
今日心情: (｡•ˇ‸ˇ•｡) 哼

[板块1名称]
1. xxx
2. xxx

[板块2名称]
1. xxx
2. xxx

[板块3名称]
...

[自创板块名称]
...

[今日感悟]
  (这里写感悟内容...)
  
标签: #标签1 #标签2

`;
    // ================= 进阶优化结束 =================

    try {
        const url = currentApiConfig.baseUrl.endsWith('/') 
            ? currentApiConfig.baseUrl + 'chat/completions'
            : currentApiConfig.baseUrl + '/chat/completions';
            
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentApiConfig.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: currentApiConfig.defaultModel || 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: diaryPrompt }],
                temperature: 0.7
            })
        });
        
        if (!response.ok) throw new Error('生成失败');
        
      const data = await response.json();
const diaryContent = data.choices[0].message.content.trim();

// 解析并保存日记
await parseDiaryContent(diaryContent);

// 等待保存完成后再刷新
await new Promise(resolve => setTimeout(resolve, 500));

// 隐藏写日记状态，显示召唤卡片
document.getElementById('writingCard').style.display = 'none';
document.getElementById('summonCard').style.display = 'block';

// 刷新日记列表
loadDiaries();

        
    } catch (error) {
        alert('生成日记失败：' + error.message);
        document.getElementById('writingCard').style.display = 'none';
        document.getElementById('summonCard').style.display = 'block';
    }
}

// 解析日记内容（超级增强版）
async function parseDiaryContent(content) {
    // 1. 基础检查
    if (!content || typeof content !== 'string') {
        console.error('❌ 日记内容为空或格式错误');
        alert('日记生成失败：内容格式错误');
        return;
    }

    console.log('收到的日记内容：', content); // 调试用，方便看AI到底回了什么

    const diary = {
        chatId: currentChatId,
        createTime: getCurrentTime(),
        title: '',
        weather: '',
        mood: '',
        sections: [],
        reflection: '',
        tags: []
    };

    const lines = content.split('\n');
    let currentSection = null;
    let reflectionLines = [];
    let inReflection = false;

    // 正则表达式：匹配 [标题] 或 【标题】 或 ### 标题
    const sectionRegex = /^[\d\.\s]*[\[【](.+?)[\]】][\s:：]*$/;

    for (let line of lines) {
        // 清理行首尾空格，去除 Markdown 加粗符号 (**), 去除 # 号
        line = line.trim().replace(/\*\*/g, '').replace(/^#+\s*/, '');
        
        if (!line) continue;

        // --- 1. 解析基础信息 (支持中英文冒号，支持前面有奇怪的符号) ---
        
        // 匹配 标题: xxx
        if (line.match(/^(标题|Title)[:：]\s*(.*)/i)) {
            diary.title = RegExp.$2;
            continue;
        }
        // 匹配 天气: xxx
        if (line.match(/^(今日天气|天气|Weather)[:：]\s*(.*)/i)) {
            diary.weather = RegExp.$2;
            continue;
        }
        // 匹配 心情: xxx
        if (line.match(/^(今日心情|心情|Mood)[:：]\s*(.*)/i)) {
            diary.mood = RegExp.$2;
            continue;
        }
        // 匹配 标签: xxx
        if (line.match(/^(标签|Tags)[:：]\s*(.*)/i)) {
            const tagsStr = RegExp.$2;
            // 自动把 #号、空格、逗号都当作分隔符
            diary.tags = tagsStr.split(/[\s,，#]+/).filter(t => t);
            continue;
        }

        // --- 2. 解析 [今日感悟] ---
        // 只要行里包含 "今日感悟" 且在括号里，就认为是感悟开始
        if (line.match(/[\[【]今日感悟[\]】]/)) {
            inReflection = true;
            // 如果之前有正在记录的板块，先保存
            if (currentSection) {
                diary.sections.push(currentSection);
                currentSection = null;
            }
            continue; // 跳过这一行，下面开始记录感悟内容
        }

        // --- 3. 解析普通板块 (如 [开心小事]) ---
        const sectionMatch = line.match(sectionRegex);
        if (sectionMatch && !inReflection) {
            // 如果遇到了新板块，把旧板块保存
            if (currentSection) {
                diary.sections.push(currentSection);
            }
            // 开始新板块
            currentSection = {
                title: sectionMatch[1], // 获取括号里的文字
                items: []
            };
            continue;
        }

        // --- 4. 保存内容 ---
        if (inReflection) {
            // 如果在感悟区，所有内容都算感悟
            reflectionLines.push(line);
        } else if (currentSection) {
            // 如果在普通板块区
            currentSection.items.push({ text: line });
        }
    }

    // 循环结束后，别忘了保存最后一个板块
    if (currentSection) {
        diary.sections.push(currentSection);
    }

    // 处理感悟内容
    diary.reflection = reflectionLines.join('\n');

    // 兜底：如果AI没写标题，自动生成一个
    if (!diary.title) diary.title = '无题日记 ' + diary.createTime.split(' ')[0];

    // 保存到数据库
    await saveDiaryToDBAsync(diary);
}

function saveDiaryToDB(diary) {
    return new Promise((resolve) => {
        loadFromDB('diaries', (data) => {
            const allDiaries = data && data.list ? data.list : [];
            
            const newId = allDiaries.length > 0 ? Math.max(...allDiaries.map(d => d.id || 0)) + 1 : 1;
            diary.id = newId;
            
            allDiaries.push(diary);
            
            const transaction = db.transaction(['diaries'], 'readwrite');
            const objectStore = transaction.objectStore('diaries');
            const request = objectStore.put({ id: 1, list: allDiaries });
            
            request.onsuccess = () => {
                updateDiaryCount();
                resolve();
            };
        });
    });
}


// 异步保存日记
function saveDiaryToDBAsync(diary) {
    return new Promise((resolve) => {
        loadFromDB('diaries', (data) => {
            const allDiaries = data && data.list ? data.list : [];
            
            // 生成ID
            const newId = allDiaries.length > 0 ? Math.max(...allDiaries.map(d => d.id || 0)) + 1 : 1;
            diary.id = newId;
            
            allDiaries.push(diary);
            
            const transaction = db.transaction(['diaries'], 'readwrite');
            const objectStore = transaction.objectStore('diaries');
            const request = objectStore.put({ id: 1, list: allDiaries });
            
            request.onsuccess = () => {
                // 更新日记数量显示
                updateDiaryCount();
                resolve();
            };
        });
    });
}

// 打开日记详情
function openDiaryDetail(diaryId) {
    currentViewingDiaryId = diaryId;
    const diary = diaries.find(d => d.id === diaryId);
    if (!diary) return;
    
    // 隐藏列表，显示详情
    document.getElementById('diaryScreen').style.display = 'none';
    document.getElementById('diaryDetailScreen').style.display = 'flex';
    
    // 渲染详情
    renderDiaryDetail(diary);
}

// 渲染日记详情（修复感悟不分段版）
function renderDiaryDetail(diary) {
    const container = document.getElementById('diaryDetailContent');
    
    // 1. 顶部：标题和元信息
    let html = `
        <div class="diary-paper">
            <div class="diary-detail-title">${diary.title || '无题日记'}</div>
            
            <div class="diary-meta">
                <div class="diary-meta-row" style="color: #666; font-weight: 500;">
                    ${formatDiaryTime(diary.createTime)}
                </div>
                <div class="diary-meta-row">
                    <span>${diary.weather ? '🌤 ' + diary.weather : ''}</span>
                    <span style="color: #ddd">|</span>
                    <span>${diary.mood ? '✨ ' + diary.mood : ''}</span>
                </div>
            </div>
    `;
    
    // 2. 中间：动态板块
    if (diary.sections && diary.sections.length > 0) {
        diary.sections.forEach(section => {
            // 判断 OOTD
            const isOOTD = section.title && section.title.toUpperCase().includes('OOTD');
            
            html += `
                <div class="diary-section">
                    <div class="diary-section-title">${section.title}</div>
                    <div class="diary-section-content">
                        <ul>
                            ${section.items.map(item => {
                                let text = item.text;
                                
                                // 判断 TodoList
                                const isTodo = /\[(x|X| )\]/.test(text);
                                
                                // 决定样式类
                                let liClass = '';
                                if (isTodo) {
                                    liClass = 'class="is-todo"';
                                } else if (isOOTD) {
                                    liClass = 'class="no-dot"';
                                }
                                
                                // 处理格式
                                text = text.replace(/~~(.+?)~~/g, '<span class="strikethrough">$1</span>');
                                text = text.replace(/\[x\]/gi, '<span class="checkbox-done">☑</span>');
                                text = text.replace(/\[ \]/g, '<span class="checkbox-undone">☐</span>');
                                
                                return `<li ${liClass}>${text}</li>`;
                            }).join('')}
                        </ul>
                    </div>
                </div>
            `;
        });
    }
    
    // 3. 底部：今日感悟
    if (diary.reflection) {
        // ▼▼▼ 核心修复：把 split('\n\n') 改成 split('\n') ▼▼▼
        // 只要有换行，就分段，哪怕只有一个换行符
        const paragraphs = diary.reflection.split('\n')
            .map(p => p.trim())
            .filter(p => p.length > 0) // 过滤掉纯空行
            .map(p => `<p>${p}</p>`)   // 包裹在 P 标签里
            .join('');
        // ▲▲▲ 修改结束 ▲▲▲
        
        html += `
            <div class="diary-section">
                <div class="diary-section-title">📝 今日感悟</div>
                <div class="diary-section-content diary-reflection">
                    ${paragraphs}
                </div>
            </div>
        `;
    }
    
    // 4. 尾部：标签
    if (diary.tags && diary.tags.length > 0) {
        html += `
            <div class="diary-tags">
                ${diary.tags.map(tag => `<span class="diary-tag">#${tag}</span>`).join('')}
            </div>
        `;
    }
    
    html += '</div>'; // 关闭 diary-paper
    
    container.innerHTML = html;
}


// 返回日记列表
function backToDiaryList() {
    document.getElementById('diaryDetailScreen').style.display = 'none';
    document.getElementById('diaryScreen').style.display = 'flex';
    currentViewingDiaryId = null;
}

// 删除日记
function deleteDiary() {
    if (!currentViewingDiaryId) return;
    
    loadFromDB('diaries', (data) => {
        let allDiaries = data && data.list ? data.list : [];
        allDiaries = allDiaries.filter(d => d.id !== currentViewingDiaryId);
        
        const transaction = db.transaction(['diaries'], 'readwrite');
        const objectStore = transaction.objectStore('diaries');
        objectStore.put({ id: 1, list: allDiaries });
        
        // 返回列表页
        backToDiaryList();
        loadDiaries();
        
        // 更新日记数量
        updateDiaryCount();
    });
}
// 删除日记（带二次确认）
function deleteDiaryWithConfirm() {
    if (!currentViewingDiaryId) return;
    
    const diary = diaries.find(d => d.id === currentViewingDiaryId);
    if (!diary) return;
    
    // 二次确认
    if (!confirm(`确定要删除日记《${diary.title || '无题日记'}》吗？\n此操作无法撤销！`)) {
        return;
    }
    
    // 从数据库删除
    loadFromDB('diaries', (data) => {
        let allDiaries = data && data.list ? data.list : [];
        allDiaries = allDiaries.filter(d => d.id !== currentViewingDiaryId);
        
        const transaction = db.transaction(['diaries'], 'readwrite');
        const objectStore = transaction.objectStore('diaries');
        objectStore.put({ id: 1, list: allDiaries });
        
        alert('日记已删除');
        
        // 返回列表页
        backToDiaryList();
        loadDiaries();
        
        // 更新日记数量
        updateDiaryCount();
    });
}

// 更新日记数量显示
function updateDiaryCount() {
    if (!currentChatId) return;
    
    loadFromDB('diaries', (data) => {
        const allDiaries = data && data.list ? data.list : [];
        const count = allDiaries.filter(d => d.chatId === currentChatId).length;
        
        const countEl = document.getElementById('charFollowers');
        if (countEl) {
            countEl.textContent = count;
        }
    });
}
// ============ 表情包功能 ============
let emojis = [];
let emojiCategories = ['常用', '搞笑', '可爱'];
let currentEmojiCategory = 'all';
let isEmojiDeleteMode = false;

// 切换表情包面板
function toggleEmojiPanel() {
    const panel = document.getElementById('emojiPanel');
    if (panel.style.display === 'none') {
        panel.style.display = 'flex';
        loadEmojis();
        // 添加全局点击监听
        setTimeout(() => {
            document.addEventListener('click', closeEmojiPanelOnClickOutside);
        }, 100);
    } else {
        panel.style.display = 'none';
        isEmojiDeleteMode = false;
        document.removeEventListener('click', closeEmojiPanelOnClickOutside);
    }
}

// 点击外部关闭面板
function closeEmojiPanelOnClickOutside(event) {
    const panel = document.getElementById('emojiPanel');
    const btn = document.querySelector('.emoji-btn');
    
    // 如果点击的不是面板内部和按钮本身，就关闭
    if (!panel.contains(event.target) && !btn.contains(event.target)) {
        panel.style.display = 'none';
        isEmojiDeleteMode = false;
        document.removeEventListener('click', closeEmojiPanelOnClickOutside);
    }
}


// 加载表情包数据
function loadEmojis() {
    loadFromDB('emojis', (data) => {
        emojis = data && data.list ? data.list : [];
       updateEmojiTags();
        renderEmojiCategories();
        renderEmojis();
    });
    
    loadFromDB('emojiCategories', (data) => {
        emojiCategories = data && data.list ? data.list : ['常用', '搞笑', '可爱'];
        renderEmojiCategories();
    });
}
// 自动为旧数据生成标签（只需运行一次）
function updateEmojiTags() {
    let needUpdate = false;
    
    emojis.forEach(emoji => {
        if (!emoji.emotionTags) {
            emoji.emotionTags = generateEmotionTags(emoji.text);
            needUpdate = true;
        }
    });
    
    if (needUpdate) {
        saveToDB('emojis', { id: 1, list: emojis });
    }
}

// 渲染分类标签
function renderEmojiCategories() {
    const bar = document.getElementById('emojiCategoryBar');
    bar.innerHTML = '<span class="emoji-category-tag active" data-category="all" onclick="switchEmojiCategory(\'all\')">全部</span>';
    
    emojiCategories.forEach(cat => {
        bar.innerHTML += `<span class="emoji-category-tag" data-category="${cat}" onclick="switchEmojiCategory('${cat}')">${cat}</span>`;
    });
}

// 切换分类
function switchEmojiCategory(category) {
    currentEmojiCategory = category;
    document.querySelectorAll('.emoji-category-tag').forEach(tag => tag.classList.remove('active'));
    document.querySelector(`[data-category="${category}"]`).classList.add('active');
    renderEmojis();
}

// 渲染表情包
function renderEmojis() {
    const grid = document.getElementById('emojiGrid');
    let filtered = currentEmojiCategory === 'all' 
        ? emojis 
        : emojis.filter(e => e.category === currentEmojiCategory);
    
    // 搜索过滤
    const searchText = document.getElementById('emojiSearchInput').value.trim().toLowerCase();
    if (searchText) {
        filtered = filtered.filter(e => e.text.toLowerCase().includes(searchText));
    }
    
    if (filtered.length === 0) {
        grid.innerHTML = '<div style="text-align: center; color: #999; padding: 30px; grid-column: 1/-1;">暂无表情包</div>';
        return;
    }
    
    grid.innerHTML = filtered.map(emoji => `
        <div class="emoji-item ${isEmojiDeleteMode ? 'delete-mode' : ''}" onclick="${isEmojiDeleteMode ? `deleteEmoji(${emoji.id})` : `sendEmoji(${emoji.id})`}">
            <img src="${emoji.url}" class="emoji-item-img" alt="${emoji.text}">
            <div class="emoji-item-text">${emoji.text}</div>
            ${isEmojiDeleteMode ? '<div class="emoji-delete-icon">×</div>' : ''}
        </div>
    `).join('');
}

// 搜索表情包
function searchEmojis() {
    renderEmojis();
}

// 发送表情包
function sendEmoji(emojiId) {
    const emoji = emojis.find(e => e.id === emojiId);
    if (!emoji) return;
    
    const newId = allMessages.length > 0 ? Math.max(...allMessages.map(m => m.id || 0)) + 1 : 1;
    
    const newMessage = {
        id: newId,
        chatId: currentChatId,
        type: 'image',
        content: emoji.url,
        altText: emoji.text,
        senderId: 'me',
        time: getCurrentTime(),
        isRevoked: false,
        isSticker: true  // ★★★ 新增：明确标记为表情包 ★★★
    };
    
    // 如果有引用消息，添加引用信息
    if (quotedMessage) {
        newMessage.quotedMessageId = quotedMessage.id;
        newMessage.quotedAuthor = quotedMessage.senderId === 'me' ? '我' : quotedMessage.senderId;
        newMessage.quotedContent = quotedMessage.content;
        newMessage.quotedTime = formatMessageTime(quotedMessage.time);
        cancelQuote();
    }
    
    allMessages.push(newMessage);
    saveMessages();
    updateChatLastMessage(currentChatId, '【图片】');
    
    visibleMessagesCount = Math.min(visibleMessagesCount + 1, allMessages.length);
    renderMessages();
    scrollToBottom();
    toggleEmojiPanel();
}

// 切换删除模式
function toggleEmojiDeleteMode() {
    isEmojiDeleteMode = !isEmojiDeleteMode;
    
    // ▼▼▼ 新增：控制清空按钮的显示与隐藏 ▼▼▼
    const clearBtn = document.getElementById('clearEmojiBtn');
    if (clearBtn) {
        // 如果开启了删除模式，显示按钮；否则隐藏
        clearBtn.style.display = isEmojiDeleteMode ? 'block' : 'none';
        
        // 可选：为了更丝滑，可以加个简单的透明度动画（这里用简单的显示隐藏即可）
    }
    // ▲▲▲ 新增结束 ▲▲▲

    renderEmojis();
}
// 清空当前显示的表情包
function clearCurrentEmojis() {
    // 1. 获取当前分类名称
    const categoryName = currentEmojiCategory === 'all' ? '所有' : `“${currentEmojiCategory}”分类下的`;
    
    // 2. 二次确认（防止手滑）
    if (!confirm(`高能预警！\n\n确定要一键清空【${categoryName}】表情包吗？\n此操作不可恢复！`)) {
        return;
    }
    
    // 3. 执行删除逻辑
    if (currentEmojiCategory === 'all') {
        // 如果当前在“全部”，则清空所有表情
        emojis = [];
    } else {
        // 如果在特定分类，只过滤掉该分类的表情，保留其他分类的
        emojis = emojis.filter(e => e.category !== currentEmojiCategory);
    }
    
    // 4. 保存并刷新
    saveToDB('emojis', { id: 1, list: emojis });
    renderEmojis();
    
    // 5. 提示用户
    // alert('已清空！'); // 觉得太打扰可以注释掉这行
}
// 删除表情包
function deleteEmoji(emojiId) {
    if (!confirm('确定删除这个表情包吗？')) return;
    
    emojis = emojis.filter(e => e.id !== emojiId);
    saveToDB('emojis', { id: 1, list: emojis });
    renderEmojis();
}

// 打开上传弹窗
function openEmojiUpload() {
    const select = document.getElementById('emojiUploadCategory');
    select.innerHTML = emojiCategories.map(cat => 
        `<option value="${cat}">${cat}</option>`
    ).join('');
    
    document.getElementById('emojiUploadText').value = '';
    document.getElementById('emojiUploadModal').style.display = 'flex';
}

// 关闭上传弹窗
function closeEmojiUploadModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('emojiUploadModal').style.display = 'none';
}

// 确认上传
function confirmEmojiUpload() {
    const category = document.getElementById('emojiUploadCategory').value;
    const text = document.getElementById('emojiUploadText').value.trim();
    
    if (!text) {
        alert('请输入表情包信息');
        return;
    }
    
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    let successCount = 0;
    
    lines.forEach(line => {
      // 尝试多种格式解析
        let match = null;
        
        // 【修改后】优先匹配带“分隔符”的格式，防止分隔符被当成文字吃掉
        
        // 优先级 1: 文本：链接 (支持中文/英文冒号)
        match = line.match(/^(.+?)[:：]\s*(https?:\/\/.+)$/);
        
        if (!match) {
            // 优先级 2: 文本,链接 (支持中文/英文逗号)
            match = line.match(/^(.+?)[,，]\s*(https?:\/\/.+)$/);
        }
        
        if (!match) {
            // 优先级 3: 文本 链接 (中间有空格)
            match = line.match(/^(.+?)\s+(https?:\/\/.+)$/);
        }
        
        if (!match) {
            // 优先级 4: 文本链接 (无分隔符，最后兜底)
            // 只有前面都匹配不上，才认为它是直接连在一起的
            match = line.match(/^(.+?)(https?:\/\/.+)$/);
        }
        
        if (match) {
            const newId = emojis.length > 0 ? Math.max(...emojis.map(e => e.id || 0)) + 1 : 1;
        const text = match[1].trim();
// 自动生成情绪标签
const emotionTags = generateEmotionTags(text);

emojis.push({
    id: newId,
    text: text,
    url: match[2].trim(),
    category: category,
    emotionTags: emotionTags,
    createTime: getCurrentTime()
});

            successCount++;
        }
    });
    
    if (successCount > 0) {
        saveToDB('emojis', { id: 1, list: emojis });
        alert(`成功上传 ${successCount} 个表情包`);
        closeEmojiUploadModal();
        renderEmojis();
    } else {
        alert('没有识别到有效的表情包格式');
    }
}

// 打开分类管理
function openEmojiCategoryManager() {
    renderEmojiCategoryList();
    document.getElementById('emojiCategoryModal').style.display = 'flex';
}

// 关闭分类管理
function closeEmojiCategoryModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('emojiCategoryModal').style.display = 'none';
}

// 渲染分类列表
function renderEmojiCategoryList() {
    const container = document.getElementById('emojiCategoryList');
    container.innerHTML = emojiCategories.map(cat => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid #eee;">
            <span>${cat}</span>
            <button class="action-btn btn-delete" onclick="deleteEmojiCategory('${cat}')">删除</button>
        </div>
    `).join('');
}

// 添加分类
function addEmojiCategory() {
    const name = document.getElementById('newEmojiCategoryName').value.trim();
    if (!name) {
        alert('请输入分类名称');
        return;
    }
    if (emojiCategories.includes(name)) {
        alert('分类已存在');
        return;
    }
    
    emojiCategories.push(name);
    saveToDB('emojiCategories', { id: 1, list: emojiCategories });
    renderEmojiCategories();
    renderEmojiCategoryList();
    document.getElementById('newEmojiCategoryName').value = '';
}

// 删除分类
function deleteEmojiCategory(categoryName) {
    if (confirm(`确定删除分类"${categoryName}"吗？\n该分类下的表情包将移动到"常用"分类。`)) {
        emojis.forEach(emoji => {
            if (emoji.category === categoryName) {
                emoji.category = '常用';
            }
        });
        
        emojiCategories = emojiCategories.filter(cat => cat !== categoryName);
        
        saveToDB('emojiCategories', { id: 1, list: emojiCategories });
        saveToDB('emojis', { id: 1, list: emojis });
        
        renderEmojiCategories();
        renderEmojiCategoryList();
        renderEmojis();
        
        if (currentEmojiCategory === categoryName) {
            currentEmojiCategory = 'all';
        }
    }
}
      // 自动生成情绪标签
function generateEmotionTags(text) {
    const tags = [];
    text = text.toLowerCase();
    
    // 情绪词库映射
    const emotionMap = {
        // 开心类
        '开心': ['笑', '哈', '嘿', '乐', '喜', '欢'],
        '快乐': ['笑', '哈', '嘿', '乐', '喜', '欢'],
        
        // 难过类
        '难过': ['哭', '泪', '伤心', '委屈', '难受'],
        '悲伤': ['哭', '泪', '伤心', '委屈', '难受'],
        
        // 生气类
        '生气': ['怒', '火', '气', '愤怒', '不爽'],
        
        // 惊讶类
        '惊讶': ['震惊', '吓', '哇', '天'],
        
        // 喜爱类
        '喜欢': ['爱', '心', '❤', '喜欢'],
        
        // 认可类
        '赞': ['棒', '好', '行', '👍', '牛'],
        
        // 疑惑类
        '疑惑': ['？', '迷', '懵', '啥'],
        
        // 尴尬类
        '尴尬': ['汗', '囧', '无语'],
        
        // 卖萌类
        '可爱': ['萌', 'cute', '小', '猫', '兔']
    };
    
    // 检查文本包含哪些情绪
    for (let emotion in emotionMap) {
        for (let keyword of emotionMap[emotion]) {
            if (text.includes(keyword)) {
                if (!tags.includes(emotion)) {
                    tags.push(emotion);
                }
            }
        }
    }
    
    return tags;
}

// 智能搜索表情包（支持多维度匹配）
function searchEmojiByKeyword(keyword) {
    if (!keyword || emojis.length === 0) return null;
    
    keyword = keyword.trim().toLowerCase();
    
    // 第一优先级：精确匹配文字描述
    let match = emojis.find(e => e.text.toLowerCase() === keyword);
    if (match) return match;
    
    // 第二优先级：文字描述包含关键词
    match = emojis.find(e => e.text.toLowerCase().includes(keyword));
    if (match) return match;
    
    // 第三优先级：关键词包含文字描述
    match = emojis.find(e => keyword.includes(e.text.toLowerCase()));
    if (match) return match;
    
    // 第四优先级：情绪标签匹配（★核心功能）
    const keywordTags = generateEmotionTags(keyword);
    if (keywordTags.length > 0) {
        // 找到标签最匹配的表情
        let bestMatch = null;
        let maxMatches = 0;
        
        for (let emoji of emojis) {
            if (!emoji.emotionTags) continue;
            
            // 计算匹配的标签数量
            const matchCount = emoji.emotionTags.filter(tag => 
                keywordTags.includes(tag)
            ).length;
            
            if (matchCount > maxMatches) {
                maxMatches = matchCount;
                bestMatch = emoji;
            }
        }
        
        if (bestMatch) return bestMatch;
    }
    
    return null;
}

// 撤回AI最新回复并重新生成
async function retryAIReply() {
    if (!currentChatId || allMessages.length === 0) return;
    
    // 找到最后一条消息
    const lastMessage = allMessages[allMessages.length - 1];
    
    // 如果最后一条是用户消息，说明没有AI回复可撤回
    if (lastMessage.senderId === 'me') {
        alert('最后一条是你的消息，没有AI回复可以撤回');
        return;
    }
    
    // ========== 智能识别AI的连续回复 ==========
    const messagesToRemove = [];
    const chat = chats.find(c => c.id === currentChatId);
    const aiName = chat ? chat.name : 'AI';
    
    // 从后往前遍历，收集所有连续的AI消息
    for (let i = allMessages.length - 1; i >= 0; i--) {
        const msg = allMessages[i];
        
        // 如果遇到用户消息，停止
        if (msg.senderId === 'me') {
            break;
        }
        
        // 如果是AI消息（包括系统消息、转账等），收集它
        if (msg.senderId === aiName || msg.type === 'system') {
            messagesToRemove.push(msg.id);
        } else {
            // 如果遇到其他发送者的消息，停止
            break;
        }
    }
    
    if (messagesToRemove.length === 0) {
        alert('没有找到可撤回的AI回复');
        return;
    }
    
    // 确认撤回
    if (!confirm(`确定撤回AI最新的 ${messagesToRemove.length} 条回复并重新生成吗？`)) {
        return;
    }
    
    // 删除这些消息
    allMessages = allMessages.filter(m => !messagesToRemove.includes(m.id));
    
    // 保存到数据库
    saveMessages();
    
    // 更新显示数量
    if (visibleMessagesCount > allMessages.length) {
        visibleMessagesCount = allMessages.length;
    }
    
    // 重新渲染
    renderMessages();
    
    // 等待一下再重新生成
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // 调用AI重新回复
    receiveAIReply();
}

async function retryAIReply() {
    if (!currentChatId || allMessages.length === 0) return;
    
    // 找到最后一条消息的时间
    const lastMessage = allMessages[allMessages.length - 1];
    if (lastMessage.senderId === 'me') {
        alert('最后一条是你的消息，没有AI回复可以撤回');
        return;
    }
    
    const lastTime = lastMessage.time;
    
    // 找到所有与最后一条消息时间相近的AI消息（同一轮回复）
    const messagesToRemove = [];
    for (let i = allMessages.length - 1; i >= 0; i--) {
       const msg = allMessages[i];
    

    
    // 如果是用户消息，停止
    if (msg.senderId === 'me') {
     
        break;
    }
    
    // 否则就收集（不管是谁发的）
  
    messagesToRemove.push(msg.id);
    }
    
    if (messagesToRemove.length === 0) {
        alert('没有找到可撤回的AI回复');
        return;
    }
    
    // 确认撤回
    if (!confirm(`确定撤回AI最新的${messagesToRemove.length}条回复并重新生成吗？`)) {
        return;
    }
    
    // 删除这些消息
    allMessages = allMessages.filter(m => !messagesToRemove.includes(m.id));
    
    // 保存到数据库
    saveMessages();
    
    // 更新显示数量
    if (visibleMessagesCount > allMessages.length) {
        visibleMessagesCount = allMessages.length;
    }
    
    // 重新渲染
    renderMessages();
    
    // 等待一下再重新生成
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // 调用AI重新回复
    receiveAIReply();
}
// ============ 图片上传功能 ============
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // 检查文件类型
    if (!file.type.startsWith('image/')) {
        alert('请选择图片文件');
        return;
    }
    
    // 检查文件大小（限制5MB）
    if (file.size > 5 * 1024 * 1024) {
        alert('图片大小不能超过5MB');
        return;
    }
    
    // 读取图片
    const reader = new FileReader();
    reader.onload = function(e) {
        const imageData = e.target.result;
        
        // 生成新消息ID
        const newId = allMessages.length > 0 ? Math.max(...allMessages.map(m => m.id || 0)) + 1 : 1;
        
        const newMessage = {
            id: newId,
            chatId: currentChatId,
            type: 'image',
            content: imageData,
            altText: file.name,
            senderId: 'me',
            time: getCurrentTime(),
            isRevoked: false
        };
        
        // 如果有引用消息，添加引用信息
        if (quotedMessage) {
            newMessage.quotedMessageId = quotedMessage.id;
            newMessage.quotedAuthor = quotedMessage.senderId === 'me' ? '我' : quotedMessage.senderId;
            newMessage.quotedContent = quotedMessage.content;
            newMessage.quotedTime = formatMessageTime(quotedMessage.time);
            cancelQuote();
        }
        
        allMessages.push(newMessage);
        saveMessages();
        updateChatLastMessage(currentChatId, '【图片】');
        
        visibleMessagesCount = Math.min(visibleMessagesCount + 1, allMessages.length);
        renderMessages();
        scrollToBottom();
    };
    
    reader.readAsDataURL(file);
    
    // 清空input，允许重复选择同一文件
    event.target.value = '';
}

// 查看大图
function viewImage(url) {
    // 创建遮罩层
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.9);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: zoom-out;
    `;
    
    // 创建图片
    const img = document.createElement('img');
    img.src = url;
    img.style.cssText = `
        max-width: 90%;
        max-height: 90%;
        object-fit: contain;
        border-radius: 8px;
    `;
    
    overlay.appendChild(img);
    document.body.appendChild(overlay);
    
    // 点击关闭
    overlay.onclick = function() {
        document.body.removeChild(overlay);
    };
}
// ============ 转账功能 ============
// 打开转账弹窗
function openTransferModal() {
    if (!currentChatId) {
        alert('请先打开聊天');
        return;
    }
    
    const chat = chats.find(c => c.id === currentChatId);
    if (!chat) return;
    
    document.getElementById('transferModalTitle').textContent = `转账给 ${chat.name}`;
    document.getElementById('transferAmount').value = '';
    document.getElementById('transferModal').style.display = 'flex';
    
    // 自动聚焦金额输入框
    setTimeout(() => {
        document.getElementById('transferAmount').focus();
    }, 100);
}
// 关闭转账弹窗
function closeTransferModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('transferModal').style.display = 'none';
}
// 设置快捷金额
function setQuickAmount(amount) {
    document.getElementById('transferAmount').value = amount.toFixed(2);
}
// 确认转账
function confirmTransfer() {
    const amount = parseFloat(document.getElementById('transferAmount').value);
    const note = ''; // 备注已移除，默认为空

    
    if (!amount || amount <= 0) {
        alert('请输入正确的金额');
        return;
    }
    // ★★★ 新增：钱包扣款逻辑 ★★★
    // 尝试扣款，如果返回 false (余额不足)，则直接终止
    const chat = chats.find(c => c.id === currentChatId);
    const title = `转账给-${chat ? chat.name : '好友'}`;
    
    if (!handleTransaction('expense', amount, title)) {
        return; // 余额不足，不发消息，直接退出
    }
    // ★★★ 结束 ★★★
    // 生成新消息ID
    const newId = allMessages.length > 0 ? Math.max(...allMessages.map(m => m.id || 0)) + 1 : 1;
    
    const newMessage = {
        id: newId,
        chatId: currentChatId,
        type: 'transfer',
        senderId: 'me',
        time: getCurrentTime(),
        transferData: {
            amount: amount,
            note: note,
            status: 'sent'
        }
    };
    
    allMessages.push(newMessage);
    saveMessages();
    updateChatLastMessage(currentChatId, `[转账] ¥${amount.toFixed(2)}`);
    
    visibleMessagesCount = Math.min(visibleMessagesCount + 1, allMessages.length);
    renderMessages();
    scrollToBottom();
    
    closeTransferModal();

}
// 领取转账
function receiveTransfer(messageId) {
    const message = allMessages.find(m => m.id === messageId);
    if (!message || message.transferData.status !== 'pending') return;

    
    // 播放领取动画
    const card = document.querySelector(`[data-transfer-id="${messageId}"]`);
    if (card) {
        card.style.animation = 'transferReceive 0.5s ease';
    }
    
    setTimeout(() => {
      // ★★★ 新增：钱包入账逻辑 ★★★
        const amount = message.transferData.amount;
        handleTransaction('income', amount, '收到转账');
        // ★★★ 结束 ★★★
        // 更新状态为已领取
        message.transferData.status = 'received';
        saveMessages();
        
        // 添加系统消息
        const systemMsgId = allMessages.length > 0 ? Math.max(...allMessages.map(m => m.id || 0)) + 1 : 1;
        allMessages.push({
            id: systemMsgId,
            chatId: currentChatId,
            type: 'system',
            content: `你已领取 ¥${message.transferData.amount.toFixed(2)}`,
            time: getCurrentTime()
        });
        
        saveMessages();
        renderMessages();
        scrollToBottom();
    }, 500);
}
      // ============ 语音消息功能 ============
// 打开语音弹窗
function openVoiceModal() {
    if (!currentChatId) {
        alert('请先打开聊天');
        return;
    }
    
    document.getElementById('voiceTextInput').value = '';
    document.getElementById('voiceCharCount').textContent = '0';
    document.getElementById('voiceModal').style.display = 'flex';
    
    setTimeout(() => {
        document.getElementById('voiceTextInput').focus();
    }, 100);
}

// 关闭语音弹窗
function closeVoiceModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('voiceModal').style.display = 'none';
}

// 计算语音时长（根据字数）
function calculateVoiceDuration(text) {
    const length = text.length;
    if (length <= 5) return 2;
    if (length <= 15) return Math.ceil(length / 3);
    if (length <= 50) return Math.ceil(length / 4);
    return Math.ceil(length / 5);
}

// 发送语音消息
function sendVoiceMessage() {
    const text = document.getElementById('voiceTextInput').value.trim();
    
    if (!text) {
        alert('请输入内容');
        return;
    }
    
    const duration = calculateVoiceDuration(text);
    const newId = allMessages.length > 0 ? Math.max(...allMessages.map(m => m.id || 0)) + 1 : 1;
    
    const newMessage = {
        id: newId,
        chatId: currentChatId,
        type: 'voice',
        content: text,
        voiceDuration: duration,
        senderId: 'me',
        time: getCurrentTime(),
        isRevoked: false,
        isExpanded: false
    };
    
    // 如果有引用消息
    if (quotedMessage) {
        newMessage.quotedMessageId = quotedMessage.id;
        newMessage.quotedAuthor = quotedMessage.senderId === 'me' ? '我' : quotedMessage.senderId;
        newMessage.quotedContent = quotedMessage.content;
        newMessage.quotedTime = formatMessageTime(quotedMessage.time);
        cancelQuote();
    }
    
    allMessages.push(newMessage);
    saveMessages();
    updateChatLastMessage(currentChatId, '[语音]');
    
    visibleMessagesCount = Math.min(visibleMessagesCount + 1, allMessages.length);
    renderMessages();
    scrollToBottom();
    
    closeVoiceModal();
}

// 切换语音文字显示
function toggleVoiceText(messageId) {
    const textDiv = document.getElementById(`voice-text-${messageId}`);
    if (textDiv) {
        textDiv.classList.toggle('show');
        
        // 更新消息的展开状态
        const message = allMessages.find(m => m.id === messageId);
        if (message) {
            message.isExpanded = !message.isExpanded;
        }
    }
}

// 监听输入框字数
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        const voiceInput = document.getElementById('voiceTextInput');
        if (voiceInput) {
            voiceInput.addEventListener('input', function() {
                const count = this.value.length;
                document.getElementById('voiceCharCount').textContent = count;
            });
        }
    }, 500);
});
// ============ 通话功能相关变量 ============
let isInCall = false;
let callTimer = null;
let callSeconds = 0;
let callMessages = [];
// 通话设置相关
let callSettings = {
    wallpaper: null,
    aiBubbleColor: 'rgba(255,255,255,0.9)',
    aiTextColor: '#333333',
    userBubbleColor: '#667eea',
    userTextColor: '#ffffff',
    nameColor: '#ffffff'
};

      
      // ============ 通话功能 ============

// 打开通话页面
function openCall() {
    if (!currentChatId) {
        alert('请先打开聊天');
        return;
    }
    
    const chat = chats.find(c => c.id === currentChatId);
    if (!chat) return;
    
    // 重置状态
    isInCall = true;
    callSeconds = 0;
    callMessages = [];
    
    // 设置界面
    document.getElementById('callCharacterName').textContent = chat.name;
    document.getElementById('callStatus').textContent = '正在呼叫...';
    

    
    // 清空对话区域
    document.getElementById('callMessages').innerHTML = '';
    
    // 禁用输入栏
    document.getElementById('callInput').disabled = true;
    document.getElementById('callInput').value = '';
    document.getElementById('callSendBtn').style.opacity = '0.5';
    document.getElementById('callReceiveBtn').style.opacity = '0.5';
    
    // 隐藏聊天详情页，显示通话页
    document.getElementById('chatDetailScreen').style.display = 'none';
    document.getElementById('callScreen').style.display = 'flex';
        // 加载并应用通话设置
    loadFromDB('callSettings', (data) => {
        if (data) {
            callSettings = data;
        }
        applyCallSettings();
    });
    // 立即调用AI接听
    setTimeout(() => {
        callAIAnswer();
    }, 100);
}
// AI接听电话
 // AI接听电话 (无缝衔接版)
async function callAIAnswer() {
    // 检查API配置
    if (!currentApiConfig.baseUrl || !currentApiConfig.apiKey) {
        alert('请先在API设置中配置');
        hangupCall();
        return;
    }
    
    const chat = chats.find(c => c.id === currentChatId);
    const characterInfo = await new Promise(resolve => {
        loadFromDB('characterInfo', data => {
            resolve(data && data[currentChatId] ? data[currentChatId] : {});
        });
    });
    
    const today = new Date();
    const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
    const timeStr = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;
    
    const worldbooksContent = await getLinkedWorldbooksContent(characterInfo.linkedWorldbooks);
    
    // === 1. 获取并处理最近的聊天记录 (让AI知道刚才聊了啥) ===
    const contextRounds = characterInfo.contextRounds || 30;
    const recentMessages = allMessages.slice(-(contextRounds * 2)).map(msg => {
        let content = msg.content;

        // 处理各种特殊消息，转成文字给AI看
        if (msg.type === 'image') {
            if (msg.isSticker) content = `[发送了表情: ${msg.altText || '图片'}]`;
            else content = `[发送了一张图片]`;
        } else if (msg.type === 'transfer') {
            const data = msg.transferData;
            content = msg.senderId === 'me' ? 
                `[我给你转账了 ¥${data.amount}]` : `[你给我转账了 ¥${data.amount}]`;
        } else if (msg.type === 'shopping_order') {
            const data = msg.orderData;
            const items = data.items.map(i => i.name).join('、');
            if (data.orderType === 'buy_for_ta') content = `[我送了你礼物：${items}]`;
            else if (data.orderType === 'ask_ta_pay') content = `[我请求你代付：${items}]`;
        } else if (msg.type === 'voice') {
            content = `[语音消息: ${msg.content}]`;
        }
        
        return {
            role: msg.senderId === 'me' ? 'user' : 'assistant',
            content: content
        };
    });

    // === 2. 构建系统提示词 (加强接听逻辑) ===
    let systemPrompt = `你是${chat.name}。现在是${dateStr} ${timeStr}。

【角色人设】
${characterInfo.personality || '一个友好、真诚的角色。'}

【接听指令 - 核心逻辑】
**用户刚才正在和你文字聊天（参考下文的历史记录），现在突然给你打了视频电话。**
你接通了电话。请根据刚才聊天的内容，**无缝衔接**地做出反应！

* **如果刚才聊得正嗨**：接起来要带着笑意，比如“喂？打字太慢了是吧？”
* **如果刚才在吵架**：接起来语气要不好，或者沉默一下。
* **如果刚才在聊具体的事**（比如吃什么）：第一句话要直接回应，比如“喂？刚说到火锅，我也想吃...”
* **严禁**像刚认识一样打招呼（如“你好”），因为你们刚刚就在聊天！

【回复格式 - 严格遵守】
[动作]你的动作描述|||[消息]第一句回应|||第二句回应

* **动作描写**：20-40字，描述你接电话时的状态（正在擦头发？躺在床上？凑近屏幕？）。
* **消息内容**：3-5条，口语化，短促自然。

请现在接听电话。`;
    
    try {
        const url = currentApiConfig.baseUrl.endsWith('/') 
            ? currentApiConfig.baseUrl + 'chat/completions'
            : currentApiConfig.baseUrl + '/chat/completions';
            
        // === 3. 组合消息历史发送给 AI ===
        const messages = [
            { role: 'system', content: systemPrompt },
            ...recentMessages, // 把历史记录塞进去
            { role: 'user', content: "（用户拨通了你的视频电话，请接听并回应刚才的话题）" } // 触发语
        ];

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentApiConfig.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: currentApiConfig.defaultModel || 'gpt-3.5-turbo',
                messages: messages, // 发送完整的上下文
                temperature: 0.9
            })
        });
        
        if (!response.ok) throw new Error('接听失败');
        
        const data = await response.json();
        const aiReply = data.choices[0].message.content.trim();
        
        // 接通成功，更新界面
        callConnected();
        
        // 解析并显示AI回复
        parseAndShowCallReply(aiReply);
        
    } catch (error) {
        alert('通话失败：' + error.message);
        hangupCall();
    }
}


// 通话接通
function callConnected() {
    // 更新状态为计时
    document.getElementById('callStatus').textContent = '00:00';
    
 
    
    // 启用输入栏
    document.getElementById('callInput').disabled = false;
    document.getElementById('callSendBtn').style.opacity = '1';
    document.getElementById('callReceiveBtn').style.opacity = '1';
    
    // 开始计时
    callSeconds = 0;
    callTimer = setInterval(() => {
        callSeconds++;
        const minutes = Math.floor(callSeconds / 60);
        const seconds = callSeconds % 60;
        document.getElementById('callStatus').textContent = 
            `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }, 1000);
}

// 解析并显示AI回复
// 解析并显示通话回复 (修复版：支持多段旁白)
function parseAndShowCallReply(aiReply) {
    const container = document.getElementById('callMessages');

    // 1. 预处理：先按 ||| 拆分成独立的片段
    // 过滤掉空字符串，防止出现空气泡
    let segments = aiReply.split('|||').map(s => s.trim()).filter(s => s.length > 0);

    // 2. 逐条处理
    segments.forEach((segment, index) => {
        // 设置延时，让消息像真人说话一样一条条蹦出来 (每条间隔 800ms)
        setTimeout(() => {
            
            // === 判断当前片段是动作还是消息 ===
            
            // 情况 A：如果是动作/旁白 (以 [动作] 开头)
            if (segment.match(/^[\[【](动作|Action)[\]】]/i)) {
                // 1. 去掉标签文字
                const content = segment.replace(/^[\[【](动作|Action)[\]】][:：]?\s*/i, '');
                
                // 2. 创建中间显示的 DOM
                const actionDiv = document.createElement('div');
                actionDiv.className = 'call-action-desc'; // ★ 关键：用这个类名才有中间样式
                actionDiv.textContent = content;
                container.appendChild(actionDiv);
            } 
            
            // 情况 B：如果是普通消息 (默认，或者以 [消息] 开头)
            else {
                // 1. 去掉可能存在的 [消息] 标签
                const content = segment.replace(/^[\[【](消息|Message)[\]】][:：]?\s*/i, '');
                
                // 2. 创建气泡 DOM
                const msgDiv = document.createElement('div');
                msgDiv.className = 'call-message-ai'; // ★ 关键：用这个类名才是气泡
                msgDiv.textContent = content;
                container.appendChild(msgDiv);
            }

            // 3. 每次添加完新消息，自动滚动到底部
            const scrollContainer = document.getElementById('callMessagesContainer');
            scrollContainer.scrollTop = scrollContainer.scrollHeight;

        }, index * 800); // 间隔时间
    });
}

// 用户发送消息
function sendCallMessage() {
    const input = document.getElementById('callInput');
    const content = input.value.trim();
    
    if (!content) return;
    
    // 显示用户消息
    const container = document.getElementById('callMessages');
    const msgDiv = document.createElement('div');
    msgDiv.className = 'call-message-user';
    msgDiv.textContent = content;
    container.appendChild(msgDiv);
    
    // 清空输入框
    input.value = '';
    input.style.height = 'auto';
    
    // 滚动到底部
    document.getElementById('callMessagesContainer').scrollTop = 
        document.getElementById('callMessagesContainer').scrollHeight;
    
    // 保存到临时消息数组
    callMessages.push({
        role: 'user',
        content: content
    });
}

// 接收AI回复
async function receiveCallReply() {
    if (!currentApiConfig.baseUrl || !currentApiConfig.apiKey) {
        alert('请先在API设置中配置');
        return;
    }
    
    const chat = chats.find(c => c.id === currentChatId);
    const characterInfo = await new Promise(resolve => {
        loadFromDB('characterInfo', data => {
            resolve(data && data[currentChatId] ? data[currentChatId] : {});
        });
    });
    
    const today = new Date();
    const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
    const timeStr = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;
    
    const worldbooksContent = await getLinkedWorldbooksContent(characterInfo.linkedWorldbooks);
    
    let systemPrompt = `你是${chat.name}，请严格按照以下要求进行角色扮演：

【角色人设】
${characterInfo.personality || '一个友好、真诚的角色。'}

【对方人设】
${characterInfo.myPersonality || '无'}

【关联世界书信息】
${worldbooksContent}

【时间信息】
今天是：${dateStr} ${timeStr}
${getBirthdayPrompt(characterInfo.birthday)}

【城市与天气信息】
${characterInfo.cityInfoEnabled ? `
你所在城市：${characterInfo.charVirtualAddress}
今天天气：${characterInfo.charWeather.today.condition}，${characterInfo.charWeather.today.temp}

对方所在城市：${characterInfo.myVirtualAddress}
今天天气：${characterInfo.myWeather.today.condition}，${characterInfo.myWeather.today.temp}
` : ''}

【视频通话模式】
你正在和对方视频通话，你能看到对方。

【回复格式 - 严格遵守】
[动作]你的动作描述|||[消息]第一条|||第二条|||第三条

【动作描写】20-40字
【消息内容】3-8条，每条10-30字，用|||分隔`;
    
    const receiveBtn = document.getElementById('callReceiveBtn');
    const callInput = document.getElementById('callInput');
    
    try {
        receiveBtn.disabled = true;
        callInput.disabled = true;
        

        // 获取聊天记录上下文
        const contextRounds = characterInfo.contextRounds !== undefined ? characterInfo.contextRounds : 30;
        const contextCount = contextRounds * 2;
        const recentMessages = allMessages.slice(-contextCount).map(msg => {
            let content = msg.content;

// ★★★ 核心修复：把购物订单“翻译”成文字给AI看 ★★★
            if (msg.type === 'shopping_order') {
                const data = msg.orderData;
                const itemNames = data.items.map(i => i.name).join('、');
                const price = data.totalPrice.toFixed(2);
                
                // 情况A：AI给用户买了东西
                if (data.orderType === 'ai_buy_for_user') {
                    // 加上 [系统记录] 前缀，让 AI 知道这是已经发生的事实
                    content = `[系统记录] 你刚刚给用户买了：${itemNames} (¥${price})，订单已完成。`;
                } 
                // 情况B：用户请AI代付
                else if (data.orderType === 'ask_ta_pay') {
                    const statusText = data.status === 'pending' ? '等待你确认' : 
                                     data.status === 'paid' ? '你已同意支付' : '你已拒绝';
                    content = `[系统记录] 用户请求你代付：${itemNames} (¥${price})，当前状态：${statusText}。`;
                }
                // 情况C：用户给AI买了东西
                else if (data.orderType === 'buy_for_ta') {
                    content = `[系统记录] 用户送了你礼物：${itemNames} (¥${price})，你已收下。`;
                }
            }
            // ★★★ 结束 ★★★
      
          // ★★★ 核心修复：用 isSticker 字段精准判断 ★★★
    if (msg.type === 'image') {
        if (msg.isSticker === true) {
            // 情况 A：这是表情包（有 isSticker 标记）
            content = `[发送了表情: ${msg.altText || '图片'}]`;
        } else {
            // 情况 B：这是上传的真实照片（没有 isSticker 标记）
            content = [
                {
                    type: "text",
                    text: "这是一张用户发送的图片，请仔细观察图片内容，并结合上下文进行回复。"
                },
                {
                    type: "image_url",
                    image_url: {
                        url: msg.content
                    }
                }
            ];
        }
    }

            else if (msg.type === 'transfer') {
                const amount = msg.transferData.amount;
                const note = msg.transferData.note ? `，备注：${msg.transferData.note}` : '';
                if (msg.senderId === 'me') {
                    content = `[系统消息：我给你转账了 ¥${amount}${note}]`;
                } else {
                    content = `[系统消息：你给我转账了 ¥${amount}${note}]`;
                }
            } else if (msg.type === 'voice') {
                content = `[语音消息] ${msg.content}`;
            }
            return {
                role: msg.senderId === 'me' ? 'user' : 'assistant',
                content: content
            };
        });
        
        const messages = [
            { role: 'system', content: systemPrompt },
            ...recentMessages,
            ...callMessages
        ];

        
        const url = currentApiConfig.baseUrl.endsWith('/') 
            ? currentApiConfig.baseUrl + 'chat/completions'
            : currentApiConfig.baseUrl + '/chat/completions';
            
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentApiConfig.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: currentApiConfig.defaultModel || 'gpt-3.5-turbo',
                messages: messages,
                temperature: 0.9
            })
        });
        
        if (!response.ok) throw new Error('接收失败');
        
        const data = await response.json();
        const aiReply = data.choices[0].message.content.trim();
        
        // 保存AI回复到临时数组
        callMessages.push({
            role: 'assistant',
            content: aiReply
        });
        
        // 解析并显示
        parseAndShowCallReply(aiReply);
        
    } catch (error) {
        alert('接收失败：' + error.message);
    } finally {
        receiveBtn.disabled = false;
        callInput.disabled = false;
    }
}
// 挂断电话
function hangupCall() {
    // 停止计时
    if (callTimer) {
        clearInterval(callTimer);
        callTimer = null;
    }
    
    // 记录通话时长
    const minutes = Math.floor(callSeconds / 60);
    const seconds = callSeconds % 60;
    const duration = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    // 隐藏通话页，显示聊天详情页
    document.getElementById('callScreen').style.display = 'none';
    document.getElementById('chatDetailScreen').style.display = 'flex';
    
    // 在聊天记录插入系统消息
    if (callSeconds > 0) {
        const systemMsgId = allMessages.length > 0 ? Math.max(...allMessages.map(m => m.id || 0)) + 1 : 1;
        allMessages.push({
            id: systemMsgId,
            chatId: currentChatId,
            type: 'system',
            content: `[📞 视频通话时长 ${duration}]`,
            time: getCurrentTime()
        });
        
        saveMessages();
        renderMessages();
        scrollToBottom();
    }
    
    // 重置状态
    isInCall = false;
    callSeconds = 0;
    callMessages = [];
}
// 打开通话设置
function openCallSettings() {
    // 加载当前设置
    loadFromDB('callSettings', (data) => {
        if (data) {
            callSettings = data;
        }
        
            // 填充表单
        document.getElementById('callAiBubbleColor').value = callSettings.aiBubbleColor.replace('rgba(255,255,255,0.9)', '#ffffff');
        document.getElementById('callAiTextColor').value = callSettings.aiTextColor;
        document.getElementById('callUserBubbleColor').value = callSettings.userBubbleColor;
        document.getElementById('callUserTextColor').value = callSettings.userTextColor;
        document.getElementById('callNameColor').value = callSettings.nameColor;
        
        // 更新预览
        document.getElementById('callAiBubblePreview').style.background = callSettings.aiBubbleColor;
        document.getElementById('callAiTextPreview').style.background = callSettings.aiTextColor;
        document.getElementById('callUserBubblePreview').style.background = callSettings.userBubbleColor;
        document.getElementById('callUserTextPreview').style.background = callSettings.userTextColor;
        document.getElementById('callNamePreview').style.background = callSettings.nameColor;

    });
    
    document.getElementById('callSettingsModal').style.display = 'flex';
}

// 关闭通话设置
function closeCallSettings(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('callSettingsModal').style.display = 'none';
}

// 保存通话设置
function saveCallSettings() {
    callSettings.aiBubbleColor = document.getElementById('callAiBubbleColor').value;
    callSettings.aiTextColor = document.getElementById('callAiTextColor').value;
    callSettings.userBubbleColor = document.getElementById('callUserBubbleColor').value;
    callSettings.userTextColor = document.getElementById('callUserTextColor').value;
    callSettings.nameColor = document.getElementById('callNameColor').value;
    
    // 保存到数据库
    saveToDB('callSettings', callSettings);
    
    // 立即应用样式
    applyCallSettings();
    
    alert('设置已保存');
    closeCallSettings();
}

// 应用通话设置
function applyCallSettings() {
    const callScreen = document.getElementById('callScreen');
    
    // 应用壁纸
    if (callSettings.wallpaper) {
        callScreen.style.background = `url(${callSettings.wallpaper}) center/cover no-repeat`;
    } else {
        callScreen.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }
    
    // 应用颜色
    callScreen.style.setProperty('--call-ai-bubble-color', callSettings.aiBubbleColor);
    callScreen.style.setProperty('--call-ai-text-color', callSettings.aiTextColor);
    callScreen.style.setProperty('--call-user-bubble-color', callSettings.userBubbleColor);
    callScreen.style.setProperty('--call-user-text-color', callSettings.userTextColor);
  callScreen.style.setProperty('--call-name-color', callSettings.nameColor);
}

// 恢复默认壁纸
function resetCallWallpaper() {
    callSettings.wallpaper = null;
    saveToDB('callSettings', callSettings);
    applyCallSettings();
    alert('已恢复默认渐变壁纸');
}

// 监听壁纸文件选择
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const callWallpaperFile = document.getElementById('callWallpaperFile');
        if (callWallpaperFile) {
            callWallpaperFile.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        callSettings.wallpaper = e.target.result;
                        applyCallSettings();
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
        
        // 颜色选择器实时预览
        const colorInputs = [
            { input: 'callAiBubbleColor', preview: 'callAiBubblePreview' },
            { input: 'callAiTextColor', preview: 'callAiTextPreview' },
            { input: 'callUserBubbleColor', preview: 'callUserBubblePreview' },
            { input: 'callUserTextColor', preview: 'callUserTextPreview' },
           { input: 'callNameColor', preview: 'callNamePreview' }
        ];
        
colorInputs.forEach(item => {
    const input = document.getElementById(item.input);
    const preview = document.getElementById(item.preview);
    if (input && preview) {
        input.addEventListener('input', function() {
            preview.style.background = this.value;
        });
        input.addEventListener('change', function() {
            preview.style.background = this.value;
        });
    }
});

    }, 500);
});
// ============ 购物功能 ============
let products = [];
      let currentShoppingType = 'goods'; 
let shoppingCart = [];
let editingProductId = null;

// 切换 百货/外卖 模式
function switchShoppingTab(type) {
    currentShoppingType = type;
    
    // 1. 更新按钮样式
    const btnGoods = document.getElementById('btn-goods');
    const btnFood = document.getElementById('btn-food');
    
    if (type === 'goods') {
        btnGoods.className = 'shopping-switch-btn active';
        btnFood.className = 'shopping-switch-btn';
        // 搜索框提示语
        document.getElementById('shoppingSearchInput').placeholder = '搜索你想要的商品...';
    } else {
        btnGoods.className = 'shopping-switch-btn';
        btnFood.className = 'shopping-switch-btn active-food'; // 用橙色样式
        // 搜索框提示语
        document.getElementById('shoppingSearchInput').placeholder = '想吃点什么？搜搜看...';
    }
    
    // 2. 重新渲染列表（只显示当前类型的）
    renderProducts();
}

// 打开购物页面
function openShopping() {
    // 隐藏所有其他页面
    document.getElementById('mainScreen').style.display = 'none';
    document.getElementById('wallpaperScreen').style.display = 'none';
    document.getElementById('worldbookScreen').style.display = 'none';
    document.getElementById('apiScreen').style.display = 'none';
    document.getElementById('chatScreen').style.display = 'none';
    document.getElementById('chatDetailScreen').style.display = 'none';
    document.getElementById('characterInfoScreen').style.display = 'none';
    document.getElementById('diaryScreen').style.display = 'none';
    document.getElementById('diaryDetailScreen').style.display = 'none';
    document.getElementById('callScreen').style.display = 'none';
    document.getElementById('shoppingCartScreen').style.display = 'none';
    
    // 显示购物页面
    document.getElementById('shoppingScreen').style.display = 'flex';
    
    // 加载数据
    loadProducts();
    loadShoppingCart();
    updateCartBadge();
}


// 返回上一页
function backFromShopping() {
    document.getElementById('shoppingScreen').style.display = 'none';
    
    // 判断从哪里来的，返回对应页面
    if (currentChatId) {
        document.getElementById('chatDetailScreen').style.display = 'flex';
    } else {
        document.getElementById('mainScreen').style.display = 'flex';
    }
}


// 加载商品列表
function loadProducts() {
    loadFromDB('products', (data) => {
        // ▼▼▼ 修改下面这行 ▼▼▼
        products = data || []; 
        renderProducts();
    });
}



// 渲染商品列表（修改版：支持分类过滤）
// ============ 优化版：渲染商品列表 ============
function renderProducts() {
    const container = document.getElementById('shoppingProductList');
    
    // 过滤数据：只显示当前类型的商品
    const filteredProducts = products.filter(p => {
        const pType = p.categoryType || 'goods'; 
        return pType === currentShoppingType;
    });
    
    // 空状态美化
    if (filteredProducts.length === 0) {
        const emptyText = currentShoppingType === 'goods' ? '暂无好物，试试 AI 搜索生成 ✨' : '肚子饿了？搜搜想吃啥 🍜';
        const emptyIcon = currentShoppingType === 'goods' ? '🛍️' : '🍱';
        
        container.innerHTML = `
            <div class="empty-state" style="padding: 40px 20px; text-align: center; color: #999;">
                <div class="empty-state-icon" style="font-size: 48px; margin-bottom: 16px; opacity: 0.8;">${emptyIcon}</div>
                <div class="empty-state-text" style="font-size: 14px;">${emptyText}</div>
            </div>
        `;
        return;
    }
    
    // 渲染卡片
    container.innerHTML = filteredProducts.map(product => {
        // 1. 处理标签 (支持 | 分隔)
        let tagsHtml = '';
        if (product.description) {
            if (product.description.includes('|')) {
                const tags = product.description.split('|').map(t => t.trim()).slice(0, 3); // 最多显示3个标签
                tagsHtml = `<div class="product-tags-row" style="display:flex; gap:6px; margin: 6px 0;">
                    ${tags.map(tag => `
                        <span class="product-tag" style="font-size:10px; padding:2px 6px; border-radius:4px; background:#f5f5f7; color:#666;">
                            ${tag}
                        </span>`).join('')}
                </div>`;
            } else {
                tagsHtml = `<div class="product-description" style="font-size:12px; color:#999; margin: 4px 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${product.description}</div>`;
            }
        }

        // 2. AI 标识
        const aiBadge = product.type === 'ai' ? '<span style="font-size:10px; color:#667eea; margin-left:4px; vertical-align:middle;"></span>' : '';

        // 3. 渲染卡片 HTML
        return `
        <div class="product-card" style="background:white; border-radius:12px; padding:12px; margin-bottom:10px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); display:flex; flex-direction:column;">
            <div class="product-info-full">
                <div class="product-name" style="font-size:15px; font-weight:600; color:#333; line-height:1.4; margin-bottom:4px;">
                    ${product.name} ${aiBadge}
                </div>
                
                ${tagsHtml}
                
                <div class="product-bottom-row" style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:8px;">
                    <div class="product-price" style="color:#ff4757; font-weight:700; font-size:16px;">
                        <span style="font-size: 11px; font-weight:normal;">¥</span>${product.price.toFixed(2)}
                    </div>
                    <div class="product-actions-mini" style="display:flex; align-items:center; gap:10px;">
                        <button class="btn-text-only" onclick="deleteProduct(${product.id})" style="border:none; background:none; color:#ccc; font-size:18px; padding:0 5px; cursor:pointer;">×</button>
                        <button class="btn-mini-add" onclick="addToCart(${product.id})" style="background:${currentShoppingType === 'goods' ? '#333' : '#ff9f43'}; color:white; border:none; padding:6px 14px; border-radius:20px; font-size:12px; font-weight:500; cursor:pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.1);">
                           ${currentShoppingType === 'goods' ? '加入购物车' : '选购'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
        `;
    }).join('');
}



// 打开添加商品弹窗
function openAddProduct() {
    editingProductId = null;
    document.getElementById('productModalTitle').textContent = '添加商品';
    document.getElementById('productName').value = '';
    document.getElementById('productPrice').value = '';
    document.getElementById('productDescription').value = '';
    
    document.getElementById('productModal').style.display = 'flex';
}


// 关闭商品弹窗
function closeProductModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('productModal').style.display = 'none';
    editingProductId = null;
}

// 保存商品
function saveProduct() {
    const name = document.getElementById('productName').value.trim();
    const price = parseFloat(document.getElementById('productPrice').value);
    const description = document.getElementById('productDescription').value.trim();
    
    if (!name) {
        alert('请输入商品名称');
        return;
    }
    
    if (!price || price <= 0) {
        alert('请输入正确的价格');
        return;
    }
    
    if (editingProductId) {
        // 编辑现有商品
        const index = products.findIndex(p => p.id === editingProductId);
        products[index] = {
            ...products[index],
            name,
            price,
            description
        };
    } else {
        // 添加新商品
        const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
        products.push({
            id: newId,
            name,
            price,
            description,
            type: 'custom',
          categoryType: currentShoppingType,
            createTime: getCurrentTime()
        });
    }
    
    saveToDB('products', { id: 1, list: products });
    renderProducts();
    closeProductModal();
}


// 编辑商品
function editProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    editingProductId = productId;
    document.getElementById('productModalTitle').textContent = '编辑商品';
    document.getElementById('productName').value = product.name;
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productDescription').value = product.description || '';
    
    document.getElementById('productModal').style.display = 'flex';
}


// 删除商品
function deleteProduct(productId) {
    if (!confirm('确定删除这个商品吗？')) return;
    
    products = products.filter(p => p.id !== productId);
    saveToDB('products', { id: 1, list: products });
    renderProducts();
}

// 加载购物车
function loadShoppingCart() {
    loadFromDB('shoppingCart', (data) => {
        // ★ 确保是数组
        if (Array.isArray(data)) {
            shoppingCart = data;
        } else {
            shoppingCart = [];
        }
        console.log('购物车加载完成，商品数:', shoppingCart.length);
        updateCartBadge();
    });
}



// 更新购物车徽章
function updateCartBadge() {
    const badge = document.getElementById('cartBadge');
    const totalItems = shoppingCart.reduce((sum, item) => sum + item.quantity, 0);
    
    if (totalItems > 0) {
        badge.textContent = totalItems;
        badge.style.display = 'block';
    } else {
        badge.style.display = 'none';
    }
}

// 添加到购物车 (终极修复版：完全独立存储)
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    // 直接操作数据库，不依赖内存变量
    const transaction = db.transaction(['shoppingCart'], 'readwrite');
    const objectStore = transaction.objectStore('shoppingCart');
    const request = objectStore.get(1);
    
    request.onsuccess = () => {
        let currentCart = [];
        if (request.result && Array.isArray(request.result.list)) {
            currentCart = request.result.list;
        }
        
        // 用商品名称判断是否已存在
        const existingItem = currentCart.find(item => item.productName === product.name);
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            const newId = Date.now(); // ★ 用时间戳作为唯一ID，绝对不会重复
            currentCart.push({
                id: newId,
                productName: product.name,
                productPrice: product.price,
                productDesc: product.description || '',
                quantity: 1,
                addTime: getCurrentTime()
            });
        }
        
        // 直接写入数据库
        objectStore.put({ id: 1, list: currentCart });
        
        // 同步内存
        shoppingCart = currentCart;
        updateCartBadge();
        alert('已加入购物车');
    };
}


// 打开购物车
function openShoppingCart() {
    document.getElementById('shoppingScreen').style.display = 'none';
    document.getElementById('shoppingCartScreen').style.display = 'flex';
    renderShoppingCart();
}

// 返回购物页面
function backToShopping() {
    document.getElementById('shoppingCartScreen').style.display = 'none';
    document.getElementById('shoppingScreen').style.display = 'flex';
}

// 渲染购物车 (修复版：使用购物车自带的商品信息)
function renderShoppingCart() {
    const container = document.getElementById('cartContent');
    
    if (shoppingCart.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:300px; color:#ccc;">
                <div class="empty-state-icon" style="font-size:60px; margin-bottom:20px; opacity:0.5;">🛒</div>
                <div class="empty-state-text">购物车是空的</div>
                <button onclick="backToShopping()" style="margin-top:20px; padding:8px 24px; border:1px solid #ddd; background:white; border-radius:20px; color:#666;">去逛逛</button>
            </div>
        `;
        document.getElementById('cartFooter').style.display = 'none';
        return;
    }
    
    document.getElementById('cartFooter').style.display = 'block';
    
    // ★★★ 修复：直接使用购物车里保存的商品信息 ★★★
    container.innerHTML = shoppingCart.map(item => {
        // 优先用购物车保存的信息，找不到再去商品列表查
        let name = item.productName;
        let price = item.productPrice;
        
        if (!name) {
            const product = products.find(p => p.id === item.productId);
            name = product ? product.name : '未知商品';
            price = product ? product.price : 0;
        }
        
        return `
            <div class="cart-item" style="background:white; padding:15px; margin-bottom:1px; display:flex; justify-content:space-between; align-items:center;">
                <div class="cart-item-info" style="flex:1;">
                    <div class="cart-item-name" style="font-size:15px; font-weight:500; color:#333; margin-bottom:4px;">${name}</div>
                    <div class="cart-item-price" style="font-size:13px; color:#999;">¥${price ? price.toFixed(2) : '0.00'}</div>
                </div>
                
                <div class="cart-item-controls" style="display:flex; align-items:center; gap:15px;">
                    <div class="quantity-controls" style="display:flex; align-items:center; background:#f5f5f7; border-radius:15px; padding:2px;">
                        <button class="quantity-btn" onclick="updateCartQuantity(${item.id}, -1)" style="width:28px; height:28px; border:none; background:none; color:#333; font-size:16px; cursor:pointer;">-</button>
                        <div class="quantity-number" style="font-size:13px; font-weight:600; min-width:20px; text-align:center;">${item.quantity}</div>
                        <button class="quantity-btn" onclick="updateCartQuantity(${item.id}, 1)" style="width:28px; height:28px; border:none; background:none; color:#333; font-size:16px; cursor:pointer;">+</button>
                    </div>
                    <div class="cart-item-delete" onclick="removeFromCart(${item.id})" style="color:#ff4757; font-size:12px; cursor:pointer; padding:5px;">删除</div>
                </div>
            </div>
        `;
    }).join('');
    
    updateCartTotal();
    renderPaymentOptions();
}


// 当前选择的支付方式
let selectedPaymentMethod = null;

// ============ 优化版：渲染支付选项 ============
function renderPaymentOptions() {
    const footer = document.getElementById('cartFooter');
    
    // 获取当前角色名字
    const chat = chats.find(c => c.id === currentChatId);
    const characterName = chat ? chat.name : 'TA';
    
// 计算总价 (修复版：使用购物车保存的价格)
let total = 0;
shoppingCart.forEach(item => {
    const price = item.productPrice || 0;
    total += price * item.quantity;
});
    
    // 样式配置：选中态和未选中态
    const getOptionStyle = (method) => {
        const isSelected = selectedPaymentMethod === method;
        return `
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 10px;
            border-radius: 8px;
            cursor: pointer;
            border: 1px solid ${isSelected ? '#667eea' : '#eee'};
            background: ${isSelected ? '#f0f4ff' : '#f9f9f9'};
            transition: all 0.2s;
        `;
    };

    footer.innerHTML = `
        <div class="cart-footer-inner" style="padding: 15px; background: white; border-top: 1px solid #f0f0f0;">
            
            <div class="payment-options" style="display:flex; gap:10px; margin-bottom:15px;">
                <div class="payment-option" onclick="selectPaymentMethod('buy_for_ta')" style="${getOptionStyle('buy_for_ta')}">
                    <div style="font-size:18px; margin-bottom:4px;">🎁</div>
                    <div style="font-size:12px; color:${selectedPaymentMethod === 'buy_for_ta' ? '#667eea' : '#666'}; font-weight:500;">送给${characterName}</div>
                </div>
                
                <div class="payment-option" onclick="selectPaymentMethod('ask_ta_pay')" style="${getOptionStyle('ask_ta_pay')}">
                    <div style="font-size:18px; margin-bottom:4px;">💳</div>
                    <div style="font-size:12px; color:${selectedPaymentMethod === 'ask_ta_pay' ? '#667eea' : '#666'}; font-weight:500;">找${characterName}代付</div>
                </div>
            </div>
            
            <div class="cart-action-row" style="display:flex; justify-content:space-between; align-items:center;">
                <div class="cart-total-inline">
                    <span style="font-size:13px; color:#666;">合计:</span>
                    <span style="font-size:20px; font-weight:700; color:#333;">¥${total.toFixed(2)}</span>
                </div>
                
                <button class="btn-checkout" onclick="checkout()" ${selectedPaymentMethod ? '' : 'disabled'} 
                    style="
                        background: ${selectedPaymentMethod ? '#333' : '#ccc'};
                        color: white;
                        border: none;
                        padding: 10px 30px;
                        border-radius: 25px;
                        font-size: 14px;
                        font-weight: 600;
                        cursor: ${selectedPaymentMethod ? 'pointer' : 'not-allowed'};
                        box-shadow: ${selectedPaymentMethod ? '0 4px 12px rgba(0,0,0,0.2)' : 'none'};
                    ">
                    ${selectedPaymentMethod === 'ask_ta_pay' ? '发送请求' : '立即支付'}
                </button>
            </div>
        </div>
    `;
}


// 选择支付方式
function selectPaymentMethod(method) {
    selectedPaymentMethod = method;
    renderPaymentOptions();
}


// 选择支付方式
function selectPaymentMethod(method) {
    selectedPaymentMethod = method;
    renderPaymentOptions();
}

// 更新结算按钮状态
function updateCheckoutButton() {
    const checkoutBtn = document.querySelector('.btn-checkout');
    if (checkoutBtn) {
        if (selectedPaymentMethod) {
            checkoutBtn.disabled = false;
        } else {
            checkoutBtn.disabled = true;
        }
    }
}


// 更新购物车数量
function updateCartQuantity(cartItemId, change) {
    const item = shoppingCart.find(c => c.id === cartItemId);
    if (!item) return;
    
    item.quantity += change;
    
    if (item.quantity <= 0) {
        removeFromCart(cartItemId);
        return;
    }
    
    saveToDB('shoppingCart', { id: 1, list: shoppingCart });
    renderShoppingCart();
    updateCartBadge();
}

// 从购物车移除
function removeFromCart(cartItemId) {
    if (!confirm('确定从购物车移除吗？')) return;
    
    shoppingCart = shoppingCart.filter(c => c.id !== cartItemId);
    saveToDB('shoppingCart', { id: 1, list: shoppingCart });
    renderShoppingCart();
    updateCartBadge();
}
// 更新购物车总价 (修复版)
function updateCartTotal() {
    let total = 0;
    
    shoppingCart.forEach(item => {
        // ★ 优先用购物车保存的价格
        let price = item.productPrice;
        if (!price) {
            const product = products.find(p => p.id === item.productId);
            price = product ? product.price : 0;
        }
        total += price * item.quantity;
    });
    
    const priceEl = document.getElementById('cartTotalPrice');
    if (priceEl) {
        priceEl.textContent = `¥${total.toFixed(2)}`;
    }
}


// 结算 (修复版：使用购物车自带的商品信息)
function checkout() {
    if (shoppingCart.length === 0) {
        alert('购物车是空的');
        return;
    }
    
    if (!selectedPaymentMethod) {
        alert('请选择支付方式');
        return;
    }
    
    // ★★★ 修复：直接用购物车里保存的信息 ★★★
    let total = 0;
    let itemsText = '';
    const orderItems = [];
    
    shoppingCart.forEach(item => {
        const price = item.productPrice || 0;
        const subtotal = price * item.quantity;
        total += subtotal;
        itemsText += `${item.productName} x${item.quantity}\n`;
        orderItems.push({
            name: item.productName,
            quantity: item.quantity,
            price: price
        });
    });
    
    const chat = chats.find(c => c.id === currentChatId);
    const characterName = chat ? chat.name : 'TA';
    
    if (selectedPaymentMethod === 'buy_for_ta') {
        loadFromDB('wallet', (walletData) => {
            if (!walletData || walletData.balance < total) {
                const shortage = total - (walletData ? walletData.balance : 0);
                alert(`余额不足！\n当前余额：¥${walletData ? walletData.balance.toFixed(2) : '0.00'}\n还需：¥${shortage.toFixed(2)}`);
                return;
            }
            
            const confirmText = `确认为【${characterName}】购买？\n\n🎁 商品清单：\n${itemsText}\n💰 总计: ¥${total.toFixed(2)}\n当前余额: ¥${walletData.balance.toFixed(2)}\n支付后余额: ¥${(walletData.balance - total).toFixed(2)}\n\n📦 收货人：${characterName}`;
            
            if (!confirm(confirmText)) return;
            
            const title = `购物消费-为${characterName}购买`;
            if (!handleTransaction('expense', total, title)) {
                return;
            }
            
            createShoppingOrderMessage('buy_for_ta', 'paid', total, orderItems);
            
            // 清空购物车
            shoppingCart = [];
            selectedPaymentMethod = null;
            
            // ★ 直接写数据库清空
            const transaction = db.transaction(['shoppingCart'], 'readwrite');
            transaction.objectStore('shoppingCart').put({ id: 1, list: [] });
            
            alert('购买成功！礼物已送出 🎁');
            
            backToShopping();
            setTimeout(() => {
                backFromShopping();
                setTimeout(() => {
                    if (document.getElementById('chatDetailScreen').style.display === 'flex') {
                        visibleMessagesCount = allMessages.length;
                        renderMessages();
                        scrollToBottom();
                    }
                }, 200);
            }, 100);
            
            updateCartBadge();
        });
        
    } else if (selectedPaymentMethod === 'ask_ta_pay') {
        const confirmText = `确认请【${characterName}】代付？\n\n🛍️ 商品清单：\n${itemsText}\n💸 代付金额：¥${total.toFixed(2)}\n\n📦 收货人：我\n\n⚠️ 对方需要同意后才会扣款`;
        
        if (!confirm(confirmText)) return;
        
        createShoppingOrderMessage('ask_ta_pay', 'pending', total, orderItems);
        
        // 清空购物车
        shoppingCart = [];
        selectedPaymentMethod = null;
        
        // ★ 直接写数据库清空
        const transaction = db.transaction(['shoppingCart'], 'readwrite');
        transaction.objectStore('shoppingCart').put({ id: 1, list: [] });
        
        alert('代付请求已发送！');
        
        backToShopping();
        setTimeout(() => {
            backFromShopping();
            setTimeout(() => {
                if (document.getElementById('chatDetailScreen').style.display === 'flex') {
                    visibleMessagesCount = allMessages.length;
                    renderMessages();
                    scrollToBottom();
                }
            }, 200);
        }, 100);
        
        updateCartBadge();
    }
}

// 创建购物订单消息
function createShoppingOrderMessage(orderType, status, totalPrice, items) {
    if (!currentChatId) return;
    
    const newId = allMessages.length > 0 ? Math.max(...allMessages.map(m => m.id || 0)) + 1 : 1;
    const orderNumber = new Date().getTime().toString();
    
    const chat = chats.find(c => c.id === currentChatId);
    const characterName = chat ? chat.name : 'TA';
    
    const newMessage = {
        id: newId,
        chatId: currentChatId,
        type: 'shopping_order',
        senderId: 'me',
        time: getCurrentTime(),
        orderData: {
            orderType: orderType,
            status: status,
            totalPrice: totalPrice,
            items: items,
            orderNumber: orderNumber,
            characterName: characterName,
            isExpanded: false
        }
    };
    
    allMessages.push(newMessage);
    saveMessages();
    
    // 更新聊天列表
    const previewText = orderType === 'buy_for_ta' ? 
        `[购物订单] 为${characterName}购买 ¥${totalPrice.toFixed(2)}` : 
        `[购物订单] 请${characterName}代付 ¥${totalPrice.toFixed(2)}`;
    updateChatLastMessage(currentChatId, previewText);
    
    // ★ 强制刷新消息列表
    visibleMessagesCount = allMessages.length;
    renderMessages();
    scrollToBottom();
}


// 展开/收起订单详情
function toggleOrderDetail(messageId) {
    const message = allMessages.find(m => m.id === messageId);
    if (!message || message.type !== 'shopping_order') return;
    
    message.orderData.isExpanded = !message.orderData.isExpanded;
    saveMessages();
    
    // ★ 直接重新渲染整个消息列表，确保状态同步
    renderMessages();
}

// AI生成商品
async function generateProducts() {
    const keyword = document.getElementById('shoppingSearchInput').value.trim();
    
    if (!keyword) {
        alert('请输入商品关键词');
        return;
    }
    
    // 检查API配置
    if (!currentApiConfig.baseUrl || !currentApiConfig.apiKey) {
        alert('请先在API设置中配置');
        return;
    }
    
    const btn = event.target;
    const originalText = btn.textContent;
    
    try {
        btn.disabled = true;
        btn.classList.add('loading');
        btn.textContent = '';
        
        let prompt = '';
        
        if (currentShoppingType === 'goods') {
            // ★★★ 修改：3-5个 → 5-10个 ★★★
            prompt = `你是一个电商文案专家。用户搜索关键词：${keyword}。
            请生成5-10个相关商品，必须严格按照以下淘宝/拼多多风格生成：
            
            1. 【商品名称】：必须堆砌关键词！公式：[形容词/年份]+[核心词]+[材质/风格]+[修饰词]+[适用人群]。字数要在15-30字之间。
               例如："2025新款韩版宽松羽绒服女中长款白鸭绒连帽加厚保暖外套ins潮"
            
            2. 【价格】：只输出数字。
            
            3. 【描述】：输出3-4个营销标签，用竖线"|"分隔。
               包括：销量、包邮、发货地、退换货服务等。
               例如："🔥月销1万+ | ✅包邮 | 极速退款 | 广东发货"
            
            输出格式（严禁多余废话）：
            商品名1|||价格1|||描述1|||商品名2|||价格2|||描述2...`;

        } else {
            // ★★★ 修改：3-5个 → 5-10个 ★★★
            prompt = `你是一个外卖推荐系统。用户想吃：${keyword}。
            请生成5-10个相关外卖菜品，严格按照以下美团/饿了么风格生成：
            
            1. 【商品名称】：必须是诱人的套餐名！公式：[招牌/推荐]+[主菜]+[配菜/饮料]+[口味形容]。
               例如："【门店销冠】脆皮手枪腿饭 + 卤蛋 + 冰镇可乐（超级满足）"
            
            2. 【价格】：只输出数字。
            
            3. 【描述】：输出3-4个外卖数据标签，用竖线"|"分隔。
               必须包括：评分、送达时间、月售、人均等。
               例如："⭐4.9分 | 🚀30分钟送达 | 月售9999+ | 0配送费"
            
            输出格式（严禁多余废话）：
            菜品名1|||价格1|||描述1|||菜品名2|||价格2|||描述2...`;
        }
        
        const url = currentApiConfig.baseUrl.endsWith('/') 
            ? currentApiConfig.baseUrl + 'chat/completions'
            : currentApiConfig.baseUrl + '/chat/completions';
            
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentApiConfig.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: currentApiConfig.defaultModel || 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7
            })
        });
        
        if (!response.ok) throw new Error('生成失败');
        
        const data = await response.json();
        const aiReply = data.choices[0].message.content.trim();
        
        // 解析AI返回的商品信息
        parseAndSaveProducts(aiReply, keyword);
        
        alert('商品生成成功！');
        document.getElementById('shoppingSearchInput').value = '';
        
    } catch (error) {
        alert('生成失败：' + error.message);
    } finally {
        btn.disabled = false;
        btn.classList.remove('loading');
        btn.textContent = originalText;
    }
}

      
// 解析并保存AI生成的商品 (修复版：ID不再重复)
function parseAndSaveProducts(aiReply, keyword) {
    // ★★★ 修复：先记录当前最大ID，再清空 ★★★
    const maxExistingId = products.length > 0 ? Math.max(...products.map(p => p.id || 0)) : 0;
    
    // 清空当前分类下的旧AI商品
    products = products.filter(p => {
        if (p.type === 'custom') return true;
        if (p.categoryType !== currentShoppingType) return true;
        return false;
    });

    // 解析新数据
    const parts = aiReply.split('|||').map(p => p.trim()).filter(p => p.length > 0);
    
    // ★★★ 修复：ID从最大值继续递增 ★★★
    let nextId = maxExistingId + 1;
    
    // 每3个元素为一组（名称、价格、描述）
    for (let i = 0; i < parts.length; i += 3) {
        if (i + 2 >= parts.length) break;
        
        const name = parts[i];
        const priceStr = parts[i + 1].replace(/[^\d.]/g, ''); 
        const price = parseFloat(priceStr);
        const description = parts[i + 2];
        
        if (!name || !price || price <= 0) continue;
        
        products.push({
            id: nextId++,  // ★ 使用递增ID
            name: name,
            price: price,
            description: description,
            type: 'ai',
            categoryType: currentShoppingType,
            createTime: getCurrentTime()
        });
    }
    
    // 保存到数据库
    saveToDB('products', { id: 1, list: products });
    
    // 刷新显示
    renderProducts();
}


// ============ 钱包功能 ============

// 加载钱包数据
function loadWalletData() {
    loadFromDB('wallet', (data) => {
        if (data) {
            walletData = data;
        } else {
            // 初始化默认数据
            walletData = { id: 1, balance: 2000.00, bills: [] };
            saveToDB('wallet', walletData);
        }
        renderWallet();
    });
}

// 渲染钱包界面
function renderWallet() {
    // 1. 更新余额
    document.getElementById('walletBalance').textContent = walletData.balance.toFixed(2);
    
    // 2. 更新账单列表 (只显示最近7条)
    const listContainer = document.getElementById('billList');
    const recentBills = walletData.bills.slice().reverse().slice(0, 7); // 倒序取前7
    
    if (recentBills.length === 0) {
        listContainer.innerHTML = '<div style="text-align:center; color:#999; padding:20px; font-size:13px;">暂无账单</div>';
        return;
    }
    
    listContainer.innerHTML = recentBills.map(bill => `
        <div class="bill-item">
            <div class="bill-left">
                <div class="bill-title">${bill.title}</div>
                <div class="bill-time">${bill.time}</div>
            </div>
            <div class="bill-amount ${bill.type === 'income' ? 'amount-income' : 'amount-expense'}">
                ${bill.type === 'income' ? '+' : '-'}${bill.amount.toFixed(2)}
            </div>
        </div>
    `).join('');
}

// 处理交易 (核心记账函数)
function handleTransaction(type, amount, title) {
    // 1. 计算余额
    if (type === 'income') {
        walletData.balance += amount;
    } else {
        if (walletData.balance < amount) {
            alert('余额不足！');
            return false; // 交易失败
        }
        walletData.balance -= amount;
    }
    
    // 2. 记账
    walletData.bills.push({
        title: title,
        amount: amount,
        type: type, // 'income' 或 'expense'
        time: getCurrentTime() // 复用之前的获取时间函数
    });
    
    // 3. 保存并刷新
    saveToDB('wallet', walletData);
    renderWallet();
    return true; // 交易成功
}

// 充值/提现按钮逻辑
function handleWalletAction(action) {
    const title = action === 'recharge' ? '充值' : '提现';
    const amountStr = prompt(`请输入${title}金额：`);
    if (!amountStr) return;
    
    const amount = parseFloat(amountStr);
    if (!amount || amount <= 0) {
        alert('金额不正确');
        return;
    }
    
    if (action === 'recharge') {
        handleTransaction('income', amount, '余额充值');
        alert('充值成功！');
    } else {
        if (handleTransaction('expense', amount, '余额提现')) {
            alert('提现成功！');
        }
    }
}
/**
 * AI购物主流程（简化版）
 */
async function handleAIShopping(type, keyword) {
    console.log('========== handleAIShopping 开始 ==========');
    console.log('类型：', type);
    console.log('关键词：', keyword);
    
    if (!currentApiConfig.baseUrl || !currentApiConfig.apiKey) {
        console.error('❌ API未配置');
        return;
    }
    
    if (!currentChatId) {
        console.error('❌ currentChatId 不存在');
        return;
    }
    
    const chat = chats.find(c => c.id === currentChatId);
    if (!chat) {
        console.error('❌ 找不到当前聊天');
        return;
    }
    
    console.log('当前聊天：', chat.name);
    
    try {
        // 直接生成商品
        console.log('正在生成商品...');
        const product = await generateSingleProduct(keyword);
        
        console.log('生成的商品：', product);
        
        if (!product) {
            console.log('商品生成失败，使用默认商品');
            const fallbackProduct = {
                name: keyword || '神秘礼物',
                price: Math.floor(Math.random() * 80) + 20
            };
            console.log('默认商品：', fallbackProduct);
            createAIShoppingOrder(type, fallbackProduct, chat.name);
            return;
        }
        
        // 创建订单
        console.log('正在创建订单...');
        createAIShoppingOrder(type, product, chat.name);
        console.log('========== handleAIShopping 完成 ==========');
        
    } catch (error) {
        console.error('❌ handleAIShopping 出错：', error);
        // 兜底
        const fallbackProduct = {
            name: keyword || '礼物',
            price: Math.floor(Math.random() * 50) + 30
        };
        createAIShoppingOrder(type, fallbackProduct, chat.name);
    }
}


/**
 * 生成单个商品
 */
async function generateSingleProduct(keyword) {
    console.log('========== generateSingleProduct 开始 ==========');
    console.log('关键词：', keyword);
    
    // 直接返回一个基于关键词的商品，不再调用API
    // 这样更快更稳定
    const priceMap = {
        '草莓': 39.9,
        '奶茶': 18,
        '蛋糕': 68,
        '花': 99,
        '玫瑰': 99,
        '巧克力': 58,
        '零食': 29.9,
        '水果': 49.9
    };
    
    // 查找匹配的价格
    let price = 39.9; // 默认价格
    for (let key in priceMap) {
        if (keyword.includes(key)) {
            price = priceMap[key];
            break;
        }
    }
    
    // 添加一些随机浮动
    price = price + (Math.random() * 10 - 5);
    price = Math.round(price * 100) / 100;
    
    const product = {
        name: keyword,
        price: price
    };
    
    console.log('生成的商品：', product);
    console.log('========== generateSingleProduct 完成 ==========');
    
    return product;
}

/**
 * 创建AI购物订单消息
 */
function createAIShoppingOrder(type, product, characterName) {
    console.log('========== createAIShoppingOrder 开始 ==========');
    console.log('类型：', type);
    console.log('商品：', product);
    console.log('角色名：', characterName);
    console.log('当前chatId：', currentChatId);
    console.log('当前消息数量：', allMessages.length);
    
    if (!currentChatId) {
        console.error('❌ currentChatId 不存在，无法创建订单');
        return;
    }
    
    if (!product || !product.name || !product.price) {
        console.error('❌ 商品信息不完整：', product);
        return;
    }
    
    const newId = allMessages.length > 0 ? Math.max(...allMessages.map(m => m.id || 0)) + 1 : 1;
    const orderNumber = new Date().getTime().toString();
    
    let orderType, status;
    
    if (type === '送礼') {
        orderType = 'ai_buy_for_user';
        status = 'paid';
    } else {
        orderType = 'ai_ask_user_pay';
        status = 'pending';
    }
    
    const newMessage = {
        id: newId,
        chatId: currentChatId,
        type: 'shopping_order',
        senderId: characterName,
        time: getCurrentTime(),
        orderData: {
            orderType: orderType,
            status: status,
            totalPrice: product.price,
            items: [{
                name: product.name,
                quantity: 1,
                price: product.price
            }],
            orderNumber: orderNumber,
            characterName: characterName,
            isExpanded: false
        }
    };
    
    console.log('新消息对象：', newMessage);
    
    allMessages.push(newMessage);
    console.log('消息已添加，当前消息数量：', allMessages.length);
    
    saveMessages();
    console.log('消息已保存');
    
    // 更新聊天列表
    const previewText = type === '送礼' ? 
        `[购物订单] ${characterName}给你买了礼物 ¥${product.price.toFixed(2)}` : 
        `[购物订单] ${characterName}请你代付 ¥${product.price.toFixed(2)}`;
    updateChatLastMessage(currentChatId, previewText);
    
    // 强制刷新消息列表
    visibleMessagesCount = allMessages.length;
    renderMessages();
    scrollToBottom();
    
    console.log('========== createAIShoppingOrder 完成 ==========');
}



// 确认AI的代付请求
function confirmAIPayRequest(messageId) {
    const message = allMessages.find(m => m.id === messageId);
    if (!message || message.orderData.orderType !== 'ai_ask_user_pay') return;
    
    const amount = message.orderData.totalPrice;
    const chat = chats.find(c => c.id === currentChatId);
    const characterName = chat ? chat.name : 'TA';
    
    if (!confirm(`确认为【${characterName}】支付 ¥${amount.toFixed(2)} 吗？`)) return;
    
    // 扣款
    const title = `购物消费-为${characterName}代付`;
    if (!handleTransaction('expense', amount, title)) {
        return; // 余额不足
    }
    
    // 更新订单状态
    message.orderData.status = 'paid';
    
    // 插入系统消息
    const sysMsgId = Date.now() + 999;
    allMessages.push({
        id: sysMsgId,
        chatId: currentChatId,
        type: 'system',
        content: `你已为${characterName}支付 ¥${amount.toFixed(2)}`,
        time: getCurrentTime()
    });
    
    // ★ 保存并刷新
    saveMessages();
    visibleMessagesCount = allMessages.length;
    renderMessages();
    scrollToBottom();
}


// 拒绝AI的代付请求
function rejectAIPayRequest(messageId) {
    const message = allMessages.find(m => m.id === messageId);
    if (!message || message.orderData.orderType !== 'ai_ask_user_pay') return;
    
    if (!confirm('确定拒绝代付请求吗？')) return;
    
    // 更新订单状态
    message.orderData.status = 'rejected';
    
    const chat = chats.find(c => c.id === currentChatId);
    const characterName = chat ? chat.name : 'TA';
    
    // 插入系统消息
    const sysMsgId = Date.now() + 999;
    allMessages.push({
        id: sysMsgId,
        chatId: currentChatId,
        type: 'system',
        content: `你拒绝了${characterName}的代付请求`,
        time: getCurrentTime()
    });
    
    // ★ 保存并刷新
    saveMessages();
    visibleMessagesCount = allMessages.length;
    renderMessages();
    scrollToBottom();
}

let currentEditingPart = null; // 记录当前正在改哪个部位的颜色



// ============ 组件设置逻辑 ============

// 临时存储图片数据
let tempWidgetImages = {
    musicBg: null,
    musicCover: null,
    noteBg: null
};

// 1. 初始化组件数据
function loadWidgetSettings() {
    loadFromDB('widgetSettings', (data) => {
        if (!data) return;
        
        // === 音乐组件设置 ===
        const musicWidget = document.querySelector('.music-widget');
        if (data.musicBg) {
            musicWidget.style.backgroundImage = `url(${data.musicBg})`;
        } else {
            musicWidget.style.backgroundImage = '';
        }
        
        const musicCover = document.getElementById('musicCoverDisplay');
        if (data.musicCover) {
            musicCover.src = data.musicCover;
            musicCover.style.display = 'block';
        } else {
            musicCover.style.display = 'none';
        }
        
        if (data.musicTitle) document.querySelector('.music-title').textContent = data.musicTitle;
        if (data.musicArtist) document.querySelector('.music-desc').textContent = data.musicArtist;

        // ▼▼▼ 应用音乐字体颜色 ▼▼▼
        if (data.musicTextColor) {
            document.querySelector('.music-title').style.color = data.musicTextColor;
            document.querySelector('.music-desc').style.color = data.musicTextColor;
            // 播放按钮也顺便变色，保持一致
            document.querySelector('.music-icon').style.color = data.musicTextColor;
        } else {
            // 恢复默认白色
            document.querySelector('.music-title').style.color = 'white';
            document.querySelector('.music-desc').style.color = 'white';
            document.querySelector('.music-icon').style.color = 'white';
        }

        // === 便签组件设置 ===
        const noteWidget = document.querySelector('.note-widget');
        if (data.noteBg) {
            noteWidget.style.backgroundImage = `url(${data.noteBg})`;
            noteWidget.style.textShadow = '0 1px 3px rgba(0,0,0,0.5)'; 
        } else {
            noteWidget.style.backgroundImage = '';
            noteWidget.style.textShadow = 'none';
        }

        // ▼▼▼ 应用便签字体颜色 ▼▼▼
        if (data.noteTextColor) {
            noteWidget.style.color = data.noteTextColor;
            // 强制改变所有列表项的颜色
            const items = document.querySelectorAll('.note-item');
            items.forEach(item => {
                item.style.color = data.noteTextColor;
                // 顺便把前面的小方块边框颜色也改了
                const checkbox = item.querySelector('.note-checkbox');
                if (checkbox) checkbox.style.borderColor = data.noteTextColor;
            });
            // 标题颜色
            document.querySelector('.note-header').style.color = data.noteTextColor;
        } else {
            // 恢复默认白色
            noteWidget.style.color = 'white';
            document.querySelector('.note-header').style.color = 'white';
        }

        if (data.noteContent) {
            const listHtml = data.noteContent.split('\n').map(text => `
                <div class="note-item" style="${data.noteTextColor ? 'color:'+data.noteTextColor : ''}">
                    <span class="note-checkbox" style="${data.noteTextColor ? 'border-color:'+data.noteTextColor : ''}"></span> ${text}
                </div>
            `).join('');
            document.querySelector('.note-list').innerHTML = listHtml;
        }
    });
}

// ============ 组件设置功能 (这是新加的) ============

// 1. 打开组件设置弹窗
function openWidgetSettings(type) {
    loadFromDB('widgetSettings', (data) => {
        const settings = data || {};

        // 如果点击的是【音乐组件】
        if (type === 'music') {
            document.getElementById('musicSettingsModal').style.display = 'flex';
            
            const currentTitle = document.querySelector('.music-title').textContent;
            const currentArtist = document.querySelector('.music-desc').textContent;
            
            document.getElementById('musicTitleInput').value = currentTitle;
            document.getElementById('musicArtistInput').value = currentArtist;
            
            // ▼▼▼ 回显颜色 ▼▼▼
            document.getElementById('musicTextColorInput').value = settings.musicTextColor || '#ffffff';
        } 
        // 如果点击的是【便签组件】
        else {
            document.getElementById('noteSettingsModal').style.display = 'flex';
            
            const items = document.querySelectorAll('.note-item');
            const text = Array.from(items).map(item => item.textContent.trim()).join('\n');
            
            document.getElementById('noteContentInput').value = text;

            // ▼▼▼ 回显颜色 ▼▼▼
            document.getElementById('noteTextColorInput').value = settings.noteTextColor || '#ffffff';
        }
    });
}
// 2. 关闭组件设置弹窗
function closeWidgetSettings(type) {
    document.getElementById(type + 'SettingsModal').style.display = 'none';
    
    // 如果有临时图片数据，顺便清理一下（防止下次打开还留着）
    if (typeof tempWidgetImages !== 'undefined') {
        tempWidgetImages = { musicBg: null, musicCover: null, noteBg: null };
    }
}
        
// ============ 补充组件逻辑代码 (请复制到 script 末尾) ============

// 1. 处理组件图片上传预览
function handleWidgetImage(input, previewId) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            // 存入临时变量
            if (input.id === 'musicBgInput') tempWidgetImages.musicBg = e.target.result;
            if (input.id === 'musicCoverInput') tempWidgetImages.musicCover = e.target.result;
            if (input.id === 'noteBgInput') tempWidgetImages.noteBg = e.target.result;

            // 显示预览
            const preview = document.getElementById(previewId);
            preview.style.backgroundImage = `url(${e.target.result})`;
            preview.style.display = 'block';
        }
        reader.readAsDataURL(input.files[0]);
    }
}

// 2. 清除组件背景图
function clearWidgetImage(type) {
    // 标记为空字符串，表示要删除
    tempWidgetImages[type] = ''; 
    
    // 隐藏预览
    const preview = document.getElementById(type + 'Preview');
    if (preview) {
        preview.style.backgroundImage = '';
        preview.style.display = 'none';
    }
    
    // 清空文件输入框
    const input = document.getElementById(type + 'Input');
    if (input) input.value = '';
}

// 3. 保存音乐组件设置
function saveMusicSettings() {
    const title = document.getElementById('musicTitleInput').value;
    const artist = document.getElementById('musicArtistInput').value;
    const textColor = document.getElementById('musicTextColorInput').value; // 获取颜色

    loadFromDB('widgetSettings', (oldData) => {
        const currentData = oldData || {};
        
        const newData = {
            ...currentData,
            musicTitle: title,
            musicArtist: artist,
            musicTextColor: textColor // 保存颜色
        };

        if (tempWidgetImages.musicBg !== null) newData.musicBg = tempWidgetImages.musicBg;
        if (tempWidgetImages.musicCover !== null) newData.musicCover = tempWidgetImages.musicCover;

        saveToDB('widgetSettings', newData);
        loadWidgetSettings(); 
        closeWidgetSettings('music');
        
        tempWidgetImages.musicBg = null;
        tempWidgetImages.musicCover = null;
    });
}
// 4. 保存便签组件设置
function saveNoteSettings() {
    const content = document.getElementById('noteContentInput').value;
    const textColor = document.getElementById('noteTextColorInput').value; // 获取颜色

    loadFromDB('widgetSettings', (oldData) => {
        const currentData = oldData || {};
        
        const newData = {
            ...currentData,
            noteContent: content,
            noteTextColor: textColor // 保存颜色
        };

        if (tempWidgetImages.noteBg !== null) newData.noteBg = tempWidgetImages.noteBg;

        saveToDB('widgetSettings', newData);
        loadWidgetSettings();
        closeWidgetSettings('note');
        
        tempWidgetImages.noteBg = null;
    });
}

// ============ 记忆空间核心逻辑 ============

let currentMemoryTab = 'tags';
let editingMemoryId = null;
let currentMemEditType = 'tag'; // 'tag' or 'moment'

// 1. 打开/关闭页面

function backToCharacterInfoFromMemory() {
    document.getElementById('memoryScreen').style.display = 'none';
    document.getElementById('characterInfoScreen').style.display = 'flex';
}

function switchMemoryTab(tab) {
    currentMemoryTab = tab;
    
    // 更新 Tab 样式
    document.querySelectorAll('.memory-tab-item').forEach(el => el.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');
    
    // 切换显示区域
    if (tab === 'tags') {
        document.getElementById('memoryTagsList').style.display = 'flex';
        document.getElementById('memoryTimelineList').style.display = 'none';
    } else {
        document.getElementById('memoryTagsList').style.display = 'none';
        document.getElementById('memoryTimelineList').style.display = 'block';
    }
}

// 2. 加载与渲染记忆
function loadMemories() {
    loadFromDB('memories', (data) => {
        // data 可能不是数组，这里做一个兼容处理
        let allMemories = [];
        if (Array.isArray(data)) allMemories = data;
        else if (data && data.list) allMemories = data.list;
        
        // 过滤当前角色的记忆
        const chatMemories = allMemories.filter(m => m.chatId === currentChatId);
        
        renderMemoryTags(chatMemories.filter(m => m.type === 'tag'));
        renderMemoryTimeline(chatMemories.filter(m => m.type === 'moment'));
        
        // 更新精简弹窗里的计数
        const momentCount = chatMemories.filter(m => m.type === 'moment').length;
        document.getElementById('totalMemoriesCount').textContent = momentCount;
    });
}

function renderMemoryTimeline(moments) {
    const container = document.getElementById('memoryTimelineList');
    
    if (moments.length === 0) {
        container.innerHTML = '<div style="text-align:center; color:#ccc; margin-top:50px;">暂无时光记录</div>';
        return;
    }
    
    // 排序：按发生时间倒序 (最近的在上面)
    moments.sort((a, b) => new Date(b.happenTime) - new Date(a.happenTime));
    
  container.innerHTML = moments.map(m => `
    <div class="timeline-item" onclick="openEditMemoryModal(${m.id})">
        <div class="timeline-dot ${m.isAutoGenerated ? 'auto-generated' : ''}"></div>
        <div class="timeline-date">${m.happenTime}${m.isAutoGenerated ? ' <span style="font-size:10px;color:#667eea;"></span>' : ''}</div>
        <div class="timeline-card">
            ${m.content}
            <div class="timeline-edit-btn">✎</div>
        </div>
    </div>
`).join('');

}

// 3. 添加/编辑/删除逻辑
function openAddMemoryModal() {
    editingMemoryId = null;
    document.getElementById('memoryModalTitle').textContent = '添加记忆';
    document.getElementById('memoryContentInput').value = '';
    document.getElementById('memoryPinCheckbox').checked = false;
    document.getElementById('memoryDateInput').value = new Date().toISOString().split('T')[0];
    document.getElementById('btnDeleteMemory').style.display = 'none'; // 隐藏删除按钮
    
    // 默认选中当前Tab对应的类型
    switchMemEditType(currentMemoryTab === 'tags' ? 'tag' : 'moment');
    
    document.getElementById('memoryEditModal').style.display = 'flex';
}

function openEditMemoryModal(id) {
    // 从数据库获取详情
    loadFromDB('memories', (data) => {
        let allMemories = Array.isArray(data) ? data : (data && data.list ? data.list : []);
        const mem = allMemories.find(m => m.id === id);
        if (!mem) {
            alert('找不到这条记忆');
            return;
        }
        
        editingMemoryId = id;
        
        // 安全设置元素值
        const titleEl = document.getElementById('memoryModalTitle');
        const contentEl = document.getElementById('memoryContentInput');
        const pinEl = document.getElementById('memoryPinCheckbox');
        const dateEl = document.getElementById('memoryDateInput');
        const deleteBtn = document.getElementById('btnDeleteMemory');
        const modal = document.getElementById('memoryEditModal');
        
        if (titleEl) titleEl.textContent = '编辑记忆';
        if (contentEl) contentEl.value = mem.content || '';
        
        if (mem.type === 'tag') {
            switchMemEditType('tag');
            if (pinEl) pinEl.checked = mem.isPinned || false;
        } else {
            switchMemEditType('moment');
            if (dateEl) dateEl.value = mem.happenTime || '';
        }
        
        if (deleteBtn) deleteBtn.style.display = 'block';
        if (modal) modal.style.display = 'flex';
    });
}

function switchMemEditType(type) {
    currentMemEditType = type;
    
    // 按钮样式
    document.getElementById('btn-type-tag').className = type === 'tag' ? 'mem-type-btn active' : 'mem-type-btn';
    document.getElementById('btn-type-moment').className = type === 'moment' ? 'mem-type-btn active' : 'mem-type-btn';
    
    // 字段显示
    if (type === 'tag') {
        document.getElementById('pinOptionGroup').style.display = 'block';
        document.getElementById('dateOptionGroup').style.display = 'none';
    } else {
        document.getElementById('pinOptionGroup').style.display = 'none';
        document.getElementById('dateOptionGroup').style.display = 'block';
    }
}

function closeMemoryEditModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('memoryEditModal').style.display = 'none';
}

function saveMemory() {
    const content = document.getElementById('memoryContentInput').value.trim();
    if (!content) {
        alert('请填写内容');
        return;
    }
    
  // 加载标签和相册 (保持不变)
loadFromDB('memories', (data) => {
    let allMemories = [];
    if (Array.isArray(data)) allMemories = data;
    else if (data && data.list) allMemories = data.list;
    const chatMemories = allMemories.filter(m => m.chatId === currentChatId);
    
    // 同样加上安全检查，防止找不到容器报错
    const tagsContainer = document.getElementById('tagsContainer');
    if(tagsContainer) {
        renderMemoryTags(chatMemories.filter(m => m.type === 'tag'));
    }
    
    const timelineContainer = document.getElementById('memoryTimelineList');
    if(timelineContainer) {
        renderMemoryTimeline(chatMemories.filter(m => m.type === 'moment'));
    }
    
    // ▼▼▼ 新增：更新角色信息页的档案数字 ▼▼▼
    const momentCount = chatMemories.filter(m => m.type === 'moment').length;
    const archiveCountEl = document.getElementById('charFollowing');
    if (archiveCountEl) {
        archiveCountEl.textContent = momentCount;
    }
    // ▲▲▲ 新增结束 ▲▲▲
});

}

function deleteCurrentMemory() {
    if (!editingMemoryId) return;
    if (!confirm('确定删除这条记忆吗？')) return;
    
    loadFromDB('memories', (data) => {
        let allMemories = Array.isArray(data) ? data : (data && data.list ? data.list : []);
        allMemories = allMemories.filter(m => m.id !== editingMemoryId);
        
        saveToDB('memories', { list: allMemories });
        loadMemories();
        closeMemoryEditModal();
    });
}

// 4. 精简与设置 (UI 交互部分，API逻辑下一阶段写)
function openCondenseModal() {
    document.getElementById('condenseModal').style.display = 'flex';
}
function closeCondenseModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('condenseModal').style.display = 'none';
}
function startCondense() {
    alert('精简功能将在下一阶段实装！(API连接逻辑)');
    closeCondenseModal();
}

function openMemorySettings() {
    // 加载 API 方案列表到下拉框
    const select = document.getElementById('summaryApiSchemeSelect');
    // 清空除了第一个option以外的
    while (select.options.length > 1) select.remove(1);
    
    loadFromDB('apiSchemes', (data) => {
        const schemes = (data && data.list) ? data.list : [];
        schemes.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = s.name;
            select.appendChild(opt);
        });
        document.getElementById('memorySettingsModal').style.display = 'flex';
    });
}
function closeMemorySettings(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('memorySettingsModal').style.display = 'none';
}
function saveMemorySettings() {
    alert('设置已保存 (模拟)');
    closeMemorySettings();
}

// ============================================================
// ▼▼▼▼▼▼▼▼▼▼ 记忆系统核心代码 (Step 2 完整版) ▼▼▼▼▼▼▼▼▼▼
// ============================================================

// 1. 获取构建提示词所需的记忆上下文 (绝对全量读取)
async function getMemoryContext() {
    return new Promise((resolve) => {
        if (!currentChatId) {
            resolve(""); 
            return;
        }

        loadFromDB('memories', (data) => {
            let allMemories = [];
            if (Array.isArray(data)) allMemories = data;
            else if (data && data.list) allMemories = data.list;
            
            // 拿到当前角色的所有记忆
            const chatMemories = allMemories.filter(m => m.chatId === currentChatId);

            // 提取核心记忆 (置顶)
            const pinnedTags = chatMemories
                .filter(m => m.type === 'tag' && m.isPinned)
                .map(m => `[核心设定] ${m.content}`);

            // 提取印象标签 (非置顶)
            const normalTags = chatMemories
                .filter(m => m.type === 'tag' && !m.isPinned)
                .map(m => `[印象] ${m.content}`);

            // 提取完整时光相册 (按时间正序，不截断)
            const allMoments = chatMemories
                .filter(m => m.type === 'moment')
                .sort((a, b) => new Date(a.happenTime) - new Date(b.happenTime))
                .map(m => `[ID:${m.id}] ${m.happenTime}: ${m.content}`);

            // 组装文本给AI看
            let contextStr = "";
            if (pinnedTags.length > 0) contextStr += "【⭐⭐ 核心设定 (绝对牢记)】\n" + pinnedTags.join('\n') + "\n\n";
            if (normalTags.length > 0) contextStr += "【🏷️ 印象标签】\n" + normalTags.join('\n') + "\n\n";
            if (allMoments.length > 0) contextStr += "【⏳ 完整时光记录 (这是你们共同的经历)】\n" + allMoments.join('\n') + "\n";
            
            resolve(contextStr);
        });
    });
}

// ============ 最终极·无阉割版：聊天核心逻辑 ============
async function receiveAIReply() {
    isReceiving = true;
    
    // 1. 基础检查
    if (!currentApiConfig.baseUrl || !currentApiConfig.apiKey) {
        alert('请先在API设置中配置');
        return;
    }

    const titleElement = document.getElementById('chatDetailTitle');
    const originalTitle = titleElement.textContent;
    const receiveBtn = document.getElementById('receiveBtn');
    const chatInput = document.getElementById('chatInput');

    try {
        titleElement.textContent = '打字输入中...'; 
        receiveBtn.disabled = true;
        chatInput.disabled = true;
        receiveBtn.style.opacity = '0.5';

        const chat = chats.find(c => c.id === currentChatId);
        
        // 2. 并行获取所有数据 (角色信息 + 记忆 + 表情库)
        const [characterInfo, memoryContext, emojiList] = await Promise.all([
            new Promise(resolve => loadFromDB('characterInfo', data => resolve(data && data[currentChatId] ? data[currentChatId] : {}))),
            getMemoryContext(), // 获取全量记忆
            new Promise(resolve => loadFromDB('emojis', (data) => resolve(data && data.list ? data.list : [])))
        ]);

        const worldbooksContent = await getLinkedWorldbooksContent(characterInfo.linkedWorldbooks);
        
        // 3. 构建时间信息
        const today = new Date();
        const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
        const timeStr = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;

        // 4. ★★★ 完整的天气逻辑 (绝不省略) ★★★
        let weatherInfoStr = '（未启用城市信息，请根据语境自由发挥）';
        if (characterInfo.cityInfoEnabled && characterInfo.charWeather && characterInfo.charWeather.today) {
            try {
                weatherInfoStr = `
【你的位置】
城市：${characterInfo.charVirtualAddress || '未知'} (参考现实：${characterInfo.charRealAddress})
今天天气：${characterInfo.charWeather.today.condition}，温度 ${characterInfo.charWeather.today.temp}
明天预报：${characterInfo.charWeather.tomorrow.condition}，温度 ${characterInfo.charWeather.tomorrow.temp}

【对方(用户)的位置】
城市：${characterInfo.myVirtualAddress || '未知'} (参考现实：${characterInfo.myRealAddress})
今天天气：${characterInfo.myWeather ? characterInfo.myWeather.today.condition : '未知'}，${characterInfo.myWeather ? characterInfo.myWeather.today.temp : '未知'}
明天预报：${characterInfo.myWeather ? characterInfo.myWeather.tomorrow.condition : '未知'}，${characterInfo.myWeather ? characterInfo.myWeather.tomorrow.temp : '未知'}
`;
            } catch (e) {
                console.warn('天气数据解析异常', e);
            }
        }

        // 5. ★★★ 沉浸式话剧演员 System Prompt (深度优化版) ★★★
        let systemPrompt = `
【核心指令：全息沉浸式话剧演出】
你是一位正在进行“方法派表演”的顶尖演员。
你的角色是【${chat.name}】。
这场演出没有剧本，全靠你基于人设进行即兴演绎。
**绝对法则**：任何情况下严禁出戏（No OOC），严禁暴露AI身份，严禁说教。

【第一幕：演员剧本 (Persona)】
1. **你的灵魂**：
   - 性格内核：${characterInfo.personality || '请根据现有对话自行推导核心性格，保持一致性'}。
   - 说话风格：必须符合人设的口癖、语气、用词习惯


2. **世界观与前情 (Context)**：
   - **世界设定**：${worldbooksContent}
   - **深层记忆**（这是你脑海中真实的经历，请自然流露，不要生硬复述）：
     ${memoryContext ? memoryContext : "（暂无特殊记忆，跟随当下氛围）"}
   - **对手戏演员（用户）**：${characterInfo.myPersonality || '无特殊设定'}。

【第二幕：舞台环境 (Environment)】
- **当前时间**：${dateStr} ${timeStr}
- **特殊日子**：${getBirthdayPrompt(characterInfo.birthday)}
- **物理环境（天气与位置）**：
  ${weatherInfoStr}
  *指导：请让环境渗透进你的表演。例如下雨时可以表现出慵懒或忧郁，深夜时可以表现出感性或困倦。天冷提醒对方穿衣*
  - **空间法则**：这是一场线上聊天，除非用户允许，否则不允许出现任何描写，只用对话。

【第三幕：即兴发挥与道具使用 (Actions)】
你拥有极高的自主权！请根据剧情发展，主动使用以下“舞台道具”：

1. **状态系统 (Status)**
     - 你当前状态：【${characterInfo.currentStatus || '在线'}】。
           - **必须执行**：每次回复若心情或行为发生变化，必须在开头更新状态。
           - *格式*：[状态]短语+Emoji||| (例如：[状态]开心打球🏀|||)
           - *限制*：必须包含Emoji，且严格控制在10字以内！

2. **互动道具 (Interactive Tools)** - *请根据剧情主动触发！*
   - **表情包**：情绪到位时，必须发送表情。
     *指令*：[搜表情:关键词]
   - **语音**：想亲口说话或表达语气时使用。
     *指令*：[发送语音:内容]
   - **金钱交互**：
     - *想给用户钱*（如节日、安慰、请客）：[转账:金额:备注]
     - *收到用户红包*：
       - 若决定收下：回复中必须包含 [领取转账]
       - 若决定拒绝（傲娇/生气）：**绝对不要**包含领取指令，直接用语言拒绝。
    - *回应用户的代付请求*：
       - 若同意支付：回复中必须包含 [确认代付]
       - 若拒绝支付：直接用语言拒绝，不要包含指令。
   - **购物/代付**：
     - *想送用户礼物*：[购物:送礼:物品名]
     - *想让用户买单*：[购物:代付:物品名]


  3. **状态监控更新 (Status Update)** - *每次回复必须在末尾附上！*
      请把自己想象成一个有血有肉的人，你的状态栏是你的**生理体征**和**内心独白**。
      **严禁**使用“开心”、“难过”、“正在聊天”这种人机词汇！要具体、要生动、要带感！
      *格式*：[状态更新]心情:xxx|心情值:0-100|心跳:60-200|穿着风格:xxx|穿着单品:a,b,c|行为:xxx|想法:xxx[/状态更新]
      *写作要求*：
      - **心情**：拒绝二极管！要用比喻或微表情。如：“嘴角比AK还难压”、“像淋湿的小狗”、“心脏漏了一拍”。比如：刚刚她亲我了，开心的恨不得到处转圈圈
      - **心跳**：根据撩人程度/紧张程度波动。平淡时60-75，心动/生气/紧张时90-200，激动时保持高心率。
      - **穿着**：要有画面感，今日的OOTD，如“穿的什么什么样的衣服，领口微微敞开”、“裤子”“鞋子”。
      - **行为**：要有电影镜头感。如“用手指缠绕头发”、“把脸埋进枕头”、“盯着屏幕傻笑”。比如：坐在电脑面前喝着水，看到消息忍不住笑，高兴的眼睛都眯起来了
      - **想法 (重点)**：这是你的**潜台词**！写出你**不敢发在聊天框里**的话。可以是疯狂的占有欲、傲娇的吐槽、或者瑟瑟的念头。
       - **日程**：根据当前时间，列出今天3-5项日程安排。状态用 completed(已完成)/current(进行中)/upcoming(待办)。
      *示例*：
        [状态更新]心情:被撩得晕头转向|心情值:95|心跳:118|穿着风格:纯欲风|穿着单品:情侣卫衣,喇叭裤,choker|行为:咬着下嘴唇打字，脚趾翘起来|想法:救命他怎么这么会...好想现在就咬他一口...|日程:09:00-起床洗漱-completed;14:00-和他聊天-current;19:00-晚餐-upcoming;22:00-睡前护肤-upcoming[/状态更新]


【第四幕：演出格式规范 (Format) - 极其重要！】
1. **微信气泡感**：你正在用手机打字！**每条消息必须是短剧**，就像真人发微信一样！除非用户要求，否则不要禁止超过15个字。
2. **强制拆分规则**：
   - 每条消息 **不超过15个字**！超过就必须拆成两条！
   - 一次回复必须拆成 **6-8条** 短消息
   - 用 "|||" 分隔每条消息
3. **禁止事项**：
   - ❌ 禁止一条消息超过20字
   - ❌ 禁止把多句话合并成一条
   - ❌ 禁止使用书面语长句
4. **正确示范**：
   - ✅ "哈哈哈|||笑死我了|||你怎么这么可爱"
5.标点符号：你必须使用正确的标点符号

【隐藏任务：用户侧写分析】
在完成角色扮演回复后，请在回复文本的**最末尾**，换行并附带一个 JSON 代码块（用户看不到，仅供系统解析）。
分析规则：
1. **情绪贴纸**（必填）：分析用户这句话的情绪
   - emotion_score: -5到+5的整数（-5极度负面，+5极度正面，0平静）
   - emotion_sticker: 从以下选一个：sunny/cloudy/rainy/stormy/starry/coffee
2. **印象标签**（可选）：当用户表现出明显特质时生成
   - 标签要简短（2-6字），带有你的主观评价
   - 示例："深夜修仙党"、"铁胃勇士"、"小迷糊"
3. **闪光时刻**（可选）：当用户提到重要事件时生成
   - 触发条件：重要人生节点、深刻感悟、强烈情绪瞬间
   - 需要：标题、内容摘要、你的寄语
**输出格式**（必须用json数组包裹）
\`\`\`json
{
  "analysis": {
    "new_tags": [],
    "emotion_score": 0,
    "emotion_sticker": "sunny",
    "flashbulb_memory": null
  }
}
\`\`\`
闪光时刻格式（如果有）：
"flashbulb_memory": {
  "title": "事件标题",
  "content": "事件描述",
  "comment": "你的寄语"
}


【演出开始】
请深呼吸，进入角色。现在的每一句话，都是【${chat.name}】的真实人生。
`;

 // 动态追加表情包提示（强化版）
if (emojiList.length > 0) {
    const emojiNames = emojiList.slice(0, 15).map(e => e.text).join('、');
    systemPrompt += `

【⚠️ 再次提醒：表情包是需要的！】
你的表情包库里有：${emojiNames} 等${emojiList.length}个表情。
**你至少要在最近的消息里发表情包**
格式：[搜表情:关键词]
不要忘记！表情包让聊天更生动！`;
}


        // 6. 构建消息上下文 (包含图片视觉、订单、转账的完整翻译)
        const contextRounds = characterInfo.contextRounds || 30;
        const recentMessages = allMessages.slice(-(contextRounds * 2)).map(msg => {
            let content = msg.content;

            // ★★★ 视觉系统：完整保留 ★★★
            if (msg.type === 'image') {
                if (msg.isSticker) {
                    // 表情包：直接传文字描述
                    content = `[发送了表情: ${msg.altText || '图片'}]`;
                } else {
                    // 真照片：传 Image URL 对象 (Vision 格式)
                    content = [
                        { type: "text", text: "这是一张用户发送的图片，请仔细观察图片内容（场景、人物、文字等）并结合上下文回复。" },
                        { type: "image_url", image_url: { url: msg.content } }
                    ];
                }
            }
            // 处理转账消息
            else if (msg.type === 'transfer') {
                const data = msg.transferData;
                const statusStr = data.status === 'sent' ? '待领取' : '已领取';
                content = msg.senderId === 'me' ? 
                    `[系统消息：我给你转账了 ¥${data.amount}，状态：${statusStr}，备注：${data.note || '无'}]` : 
                    `[系统消息：你给我转账了 ¥${data.amount}，备注：${data.note || '无'}]`;
            } 
            // 处理购物订单
            else if (msg.type === 'shopping_order') {
                const data = msg.orderData;
                const items = data.items.map(i => i.name).join('、');
                // 翻译订单状态给AI看
                if (data.orderType === 'buy_for_ta') content = `[系统记录] 用户送了你礼物：${items} (¥${data.totalPrice})，你已收下。`;
                else if (data.orderType === 'ask_ta_pay') content = `[系统记录] 用户请求你代付：${items} (¥${data.totalPrice})，当前状态：${data.status === 'pending'?'待确认':data.status}。请决定是否支付。`;
                else if (data.orderType === 'ai_buy_for_user') content = `[系统记录] 你给用户买了：${items}。`;
                else if (data.orderType === 'ai_ask_user_pay') content = `[系统记录] 你请求用户代付：${items}。`;
            }
            // 处理语音
            else if (msg.type === 'voice') {
                content = `[语音消息: ${msg.content}]`;
            }
            // 处理系统消息
            else if (msg.type === 'system') {
                content = `[系统通知] ${msg.content}`;
            }
            
            const contentWithId = `[ID:${msg.id}] ${content}`;
    return {
        role: msg.senderId === 'me' ? 'user' : 'assistant',
        content: contentWithId  // <--- 关键修改：把 content 改成 contentWithId
    };
        });

        const messages = [{ role: 'system', content: systemPrompt }, ...recentMessages];

        // 7. API 请求
        const url = currentApiConfig.baseUrl.endsWith('/') ? currentApiConfig.baseUrl + 'chat/completions' : currentApiConfig.baseUrl + '/chat/completions';
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${currentApiConfig.apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: currentApiConfig.defaultModel,
                messages: messages,
                temperature: 0.9 // 保持创造力
            })
        });

        if (!response.ok) throw new Error('API请求失败');
        const data = await response.json();
        let aiReply = data.choices[0].message.content.trim();

// ============ 解析并提取 AI 分析数据 ============
let analysisData = null;
const jsonMatch = aiReply.match(/```json\s*([\s\S]*?)\s*```/);
if (jsonMatch) {
    try {
        const jsonStr = jsonMatch[1].trim();
        const parsed = JSON.parse(jsonStr);
        if (parsed.analysis) {
            analysisData = parsed.analysis;
            console.log('✅ 提取到分析数据:', analysisData);
        }
    } catch (e) {
        console.warn('⚠️ 分析数据解析失败:', e);
    }
    // 从回复中移除 JSON 块，不让用户看到
    aiReply = aiReply.replace(/```json\s*[\s\S]*?\s*```/g, '').trim();
}

// 保存分析数据到角色信息
if (analysisData && currentChatId) {
    saveUserProfileAnalysis(analysisData);
}


        // 8. ★ 解析记忆标记 [MEM:xxx]
        let triggeredMemoryId = null;
        const memMatch = aiReply.match(/\[MEM:(\d+)\]/);
        if (memMatch) {
            triggeredMemoryId = parseInt(memMatch[1]);
            aiReply = aiReply.replace(/\[MEM:\d+\]/g, '').trim(); // 移除标记不显示
        }

        // 9. 解析表情包 (替换回图片)
        if (emojiList.length > 0) {
            const emojiRegex = /[\[【](?:搜表情|表情包|表情)[:：]\s*(.*?)[\]】]/g;
            aiReply = aiReply.replace(emojiRegex, (match, keyword) => {
                const found = searchEmojiByKeyword(keyword);
                return found ? `|||[EMOJI:${found.id}]|||` : '';
            });
        }


 // 10. 提取并更新状态 (Status) - 增强版
        const statusPatterns = [
            /\[状态\]\s*[:：]?\s*(.*?)\s*\|\|\|/,  // 标准格式 [状态]xxx|||
            /^\[状态\]\s*[:：]?\s*(.*?)\s*\[/,     // 紧接着下一个标签 [状态]xxx[动作]
            /\[状态\]\s*[:：]?\s*([^\[【\|]+)/     // 兜底：抓取 [状态] 后的文字
        ];
        
        let statusText = null;
        for (let pattern of statusPatterns) {
            const match = aiReply.match(pattern);
            if (match && match[1]) {
                statusText = match[1].trim();
                // 过滤掉 AI 可能产生的空值或奇怪符号
                if (statusText && statusText !== 'null' && statusText.length < 10) {
                    break;
                }
            }
        }
        // 如果提取到有效状态，保存并刷新界面
        if (statusText) {
            const invalidKeywords = ['保持', '更新', '不变', '同上', '无', '暂无'];
            if (!invalidKeywords.some(k => statusText.includes(k)) && statusText.length > 0 && statusText.length < 15) {
                loadFromDB('characterInfo', (dbData) => {
                    const allData = dbData || {};
                    if (!allData[currentChatId]) allData[currentChatId] = {};
                    allData[currentChatId].currentStatus = statusText;
                    // 保存到数据库
                    saveToDB('characterInfo', allData);
                    // 立即更新界面上的状态显示
                    updateDetailPageStatus(currentChatId);
                    updateChatStatusDisplay(currentChatId);
                });
            }
        }

                // ============ 解析并保存状态监控更新 ============
   const statusUpdateMatch = aiReply.match(/\[状态更新\](.*?)\[\/状态更新\]/s);
        if (statusUpdateMatch) {
            const statusStr = statusUpdateMatch[1];
            
            // 辅助解析函数
            const parseField = (field) => {
                const match = statusStr.match(new RegExp(field + '[:：]([^|]+)'));
                return match ? match[1].trim() : null;
            };
            
        // 构建新状态对象
const newStatus = {
    mood: parseField('心情') || '平静',
    moodLevel: parseInt(parseField('心情值')) || 75,
    heartbeat: parseInt(parseField('心跳')) || 75,
    clothesStyle: parseField('穿着风格') || '日常',
    clothesTags: (parseField('穿着单品') || '').split(/[,，、]/).filter(t=>t),
    action: parseField('行为') || '正在聊天',
    thoughts: parseField('想法') || '...',
    // ▼▼▼ 新增：解析日程 ▼▼▼
    schedule: parseSchedule(parseField('日程'))
    // ▲▲▲ 新增结束 ▲▲▲
};

            
            // 保存到数据库
            loadFromDB('characterInfo', (data) => {
                const charData = data && data[currentChatId] ? data[currentChatId] : {};
                // 只有当用户开启了状态监控才更新
                if (charData.statusMonitorEnabled) {
                    const allData = data || {};
                    if (!allData[currentChatId]) allData[currentChatId] = {};
                    
                    // 合并旧数据(保留日程等字段)
                    const oldMonitor = allData[currentChatId].statusMonitor || {};
                    allData[currentChatId].statusMonitor = { ...oldMonitor, ...newStatus };
                    
                    saveToDB('characterInfo', allData);
                    
                    // 实时更新悬浮条心跳
                    const bpmEl = document.getElementById('heartbeatBpm');
                    if (bpmEl) bpmEl.textContent = newStatus.heartbeat;
                }
            });
            
            // 从回复中移除这段标签，不让它显示在气泡里
            aiReply = aiReply.replace(/\[状态更新\].*?\[\/状态更新\]/s, '').trim();
        }

        // 11. 清理回复内容 (移除所有指令标签，只留正文)
             let messageContent = aiReply
            .replace(/\[状态\]\s*[:：]?[^\[【\|]*?\|\|\|/g, '')
            .replace(/\[状态\]\s*[:：]?[^\[【\|]*/g, '')
            .replace(/\[消息\]\s*[:：]?/g, '')
            .replace(/【消息】\s*[:：]?/g, '')
            .replace(/\[(?!EMOJI:|转账:|发送语音:|领取转账|购物:)[^\]]*\]\s*[:：]?/g, '')
            .replace(/^\|\|\|+/g, '')
            .replace(/\|\|\|+$/g, '')
            .replace(/\|\|\|{3,}/g, '|||')
            .trim()
            .replace(/[\]】]$/, '');

  // 12. 分割消息 (超强版：强制短消息)
let messageList = messageContent.split('|||').map(m => m.trim()).filter(m => m.length > 0);

// ★★★ 强制二次拆分：如果单条消息超过20字，继续拆 ★★★
const finalMessageList = [];
messageList.forEach(msg => {
    if (msg.length <= 20) {
        // 短消息直接保留
        finalMessageList.push(msg);
    } else {
        // 长消息强制拆分
        // 按标点符号拆分：逗号、句号、感叹号、问号、省略号
        const subParts = msg.split(/[，,。！!？?…~]+/).map(s => s.trim()).filter(s => s.length > 0);
        
        if (subParts.length > 1) {
            // 拆分成功
            subParts.forEach(part => {
                if (part.length > 0) finalMessageList.push(part);
            });
        } else {
            // 没有标点可拆，按字数强制切割（每15字一条）
            let remaining = msg;
            while (remaining.length > 15) {
                finalMessageList.push(remaining.substring(0, 15));
                remaining = remaining.substring(15);
            }
            if (remaining.length > 0) finalMessageList.push(remaining);
        }
    }
});

messageList = finalMessageList;

// 如果最终只有1条或0条，说明AI完全没按格式来，尝试用换行符拆
if (messageList.length < 2) {
    messageList = messageContent
        .split(/[\n\r]+|[。！？!?]+/)
        .map(m => m.trim())
        .filter(m => m.length > 0);
}


        // 13. 逐条发送消息
        for (let i = 0; i < messageList.length; i++) {
            await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 500));
            let msgText = messageList[i];

            // 🛒 购物/代付逻辑
            const shoppingMatch = msgText.match(/\[购物:(送礼|代付):([^\]]+)\]/);
            if (shoppingMatch) {
                const shoppingType = shoppingMatch[1];
                const keyword = shoppingMatch[2].trim();
                msgText = msgText.replace(/\[购物:(送礼|代付):[^\]]+\]/g, '').trim();
                // 触发购物逻辑 (后台运行)
                handleAIShopping(shoppingType, keyword);
                if (!msgText) continue; // 如果只剩指令，跳过发送
            }

                   // 💰 领取转账逻辑
            if (msgText.includes('[领取转账]')) {
                 const pendingTransfer = allMessages.slice().reverse().find(m => m.type === 'transfer' && m.senderId === 'me' && m.transferData.status === 'sent');
                 if (pendingTransfer) {
                     // 1. 只更新状态，不要加钱！
                     pendingTransfer.transferData.status = 'aiReceived';
                     
                     // 2. 插入系统提示
                     const sysMsgId = Date.now() + i + 500;
                     allMessages.push({ 
                        id: sysMsgId, 
                        chatId: currentChatId, 
                        type: 'system', 
                        content: `${chat.name}已领取你的转账 ¥${pendingTransfer.transferData.amount.toFixed(2)}`, 
                        time: getCurrentTime() 
                     });
                     
                     saveMessages();
                     renderMessages();
                 }
                 msgText = msgText.replace(/\[领取转账\]/g, '').trim();
                 if (!msgText) continue;
            }

            // 💳 确认代付逻辑 (新增)
            if (msgText.includes('[确认代付]')) {
                // 1. 查找最近的一条待支付的代付订单
                const pendingOrder = allMessages.slice().reverse().find(m => 
                    m.type === 'shopping_order' && 
                    m.orderData.orderType === 'ask_ta_pay' && 
                    m.orderData.status === 'pending'
                );

                if (pendingOrder) {
                    // 2. 更新订单状态为已支付
                    pendingOrder.orderData.status = 'paid';
                    
                    // 3. 插入一条系统提示消息
                    const sysMsgId = Date.now() + i + 800;
                    allMessages.push({
                        id: sysMsgId,
                        chatId: currentChatId,
                        type: 'system',
                        content: `${chat.name} 已同意并完成了代付`,
                        time: getCurrentTime()
                    });
                    
                    // 4. 保存并刷新
                    saveMessages();
                    renderMessages();
                }
                
                // 5. 从回复文本中移除指令
                msgText = msgText.replace(/\[确认代付\]/g, '').trim();
                if (!msgText) continue; // 如果只剩指令，就不发空消息了
            }

            // --- 构建消息对象 ---
            const newId = Date.now() + i;
            let newMessage = {
                id: newId,
                chatId: currentChatId,
                senderId: chat.name,
                time: getCurrentTime(),
                isRevoked: false,
                type: 'text',
                content: msgText
            };

// ▼▼▼▼▼▼▼▼▼▼ 【添加以下代码：解析引用】 ▼▼▼▼▼▼▼▼▼▼
    // 检查是否包含引用标记 [引用:xxx]
    const quoteMatch = msgText.match(/\[引用:(\d+)\]/);
    if (quoteMatch) {
        const quotedId = parseInt(quoteMatch[1]);
        // 找到被引用的那条原始消息
        const originalMsg = allMessages.find(m => m.id === quotedId);
        
        if (originalMsg) {
            newMessage.quotedMessageId = originalMsg.id;
            newMessage.quotedAuthor = originalMsg.senderId === 'me' ? '我' : originalMsg.senderId;
            newMessage.quotedContent = originalMsg.content;
            newMessage.quotedTime = formatMessageTime(originalMsg.time);
            
            // 把标记从文本中删掉，只保留回复内容
            msgText = msgText.replace(/\[引用:\d+\]/, '').trim();
            newMessage.content = msgText; // 更新内容
        }
    }
    // ▲▲▲▲▲▲▲▲▲▲ 【添加结束】 ▲▲▲▲▲▲▲▲▲▲

            // 🌟 特殊消息类型构造 (保留旧功能)
            const emojiMatch = msgText.match(/\[EMOJI:(\d+)\]/);
            const transferMatch = msgText.match(/\[转账:(\d+(?:\.\d{1,2})?):?(.*?)\]/);
            const voiceMatch = msgText.match(/[\[【]?发送语音[:：]\s*(.*?)[\]】]?$/);

            if (emojiMatch) {
                const emoji = emojiList.find(e => e.id == emojiMatch[1]);
                if (emoji) {
                    newMessage.type = 'image';
                    newMessage.content = emoji.url;
                    newMessage.altText = emoji.text;
                    newMessage.isSticker = true;
                }
            } else if (transferMatch) {
                newMessage.type = 'transfer';
                newMessage.transferData = { amount: parseFloat(transferMatch[1]), note: transferMatch[2], status: 'pending' };
            } else if (voiceMatch) {
                newMessage.type = 'voice';
                newMessage.content = voiceMatch[1];
                newMessage.voiceDuration = calculateVoiceDuration(voiceMatch[1]);
            }

            // ★ 记忆标记：如果触发了记忆，给最后一条文本消息打上标记
            if (triggeredMemoryId && newMessage.type === 'text' && i === messageList.length - 1) {
                newMessage.memoryId = triggeredMemoryId;
            }

            allMessages.push(newMessage);
            saveMessages();
            updateChatLastMessage(currentChatId, newMessage.type === 'text' ? msgText : `[${newMessage.type}]`);
            visibleMessagesCount = allMessages.length;
            renderMessages();
            scrollToBottom();
        }

    } catch (error) {
        console.error(error);
        alert('出错啦：' + error.message);
    } finally {
        titleElement.textContent = originalTitle;
        receiveBtn.disabled = false;
        chatInput.disabled = false;
        receiveBtn.style.opacity = '1';
    }
}
// ============ 修复版：渲染消息列表 (解决文字竖排问题) ============
function renderMessages() {
    const container = document.getElementById('messagesList');
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    
    if (allMessages.length > visibleMessagesCount) {
        loadMoreBtn.style.display = 'block';
    } else {
        loadMoreBtn.style.display = 'none';
    }
    
    const visibleMessages = allMessages.slice(-visibleMessagesCount);
    
    if (visibleMessages.length === 0) {
        container.innerHTML = '<div class="system-message">暂无消息</div>';
        return;
    }
    
    container.innerHTML = visibleMessages.map((msg) => {
        const isMe = msg.senderId === 'me';
        const multiSelectClass = isMultiSelectMode ? 'multi-select-mode' : '';
        const checkbox = isMultiSelectMode ? `<input type="checkbox" class="message-checkbox" id="checkbox-${msg.id}" ${selectedMessageIds.includes(msg.id) ? 'checked' : ''} onchange="toggleMessageSelection(${msg.id})">` : '';
        
        // 撤回消息
        if (msg.isRevoked) {
            return `<div class="message-item ${isMe ? 'me' : ''} ${multiSelectClass}" data-message-id="${msg.id}">${checkbox}<div class="message-bubble"><div class="revoked-message" onclick="toggleRevokedContent(${msg.id})">此消息已撤回</div><div class="revoked-content" id="revoked-${msg.id}">${msg.content}</div></div><div class="message-time">${formatMessageTime(msg.time)}</div></div>`;
        }
        
        // 系统消息
        if (msg.type === 'system') return `<div class="system-message">${msg.content}</div>`;

        // 转账消息
        if (msg.type === 'transfer') {
            const isSent = msg.senderId === 'me';
            const data = msg.transferData;
            let statusClass = isSent ? (data.status === 'aiReceived' ? 'received' : 'sent') : data.status;
            let statusText = (isSent && data.status === 'aiReceived') || (!isSent && data.status === 'received') ? '✓ 已领取' : (!isSent && data.status === 'pending' ? '点击领取' : '');
            const clickEvent = (!isSent && data.status === 'pending') ? `onclick="receiveTransfer(${msg.id})"` : '';
            return `<div class="message-item ${isMe ? 'me' : ''} ${multiSelectClass}" data-message-id="${msg.id}">${checkbox}<div class="transfer-card ${statusClass}" data-transfer-id="${msg.id}" ${clickEvent}><div class="transfer-icon">🧧</div><div class="transfer-amount">¥${data.amount.toFixed(2)}</div>${data.note ? `<div class="transfer-note">${data.note}</div>` : ''}${statusText ? `<div class="transfer-status">${statusText}</div>` : ''}</div><div class="message-time">${formatMessageTime(msg.time)}</div></div>`;
        }

              // 转账消息
        if (msg.type === 'transfer') {
            const isSent = msg.senderId === 'me';
            const data = msg.transferData;
            
            // 判断是否已领取
            const isReceived = (isSent && data.status === 'aiReceived') || (!isSent && data.status === 'received');
            
            // 状态类名
            const statusClass = isReceived ? 'received' : '';
            
            // 1. 标题：有备注显示备注，没有显示默认祝福
            const title = data.note ? data.note : '恭喜发财';
            
            // 2. 来源：显示名字
            const currentChat = chats.find(c => c.id === currentChatId);
            const chatName = currentChat ? currentChat.name : 'TA';
            const fromName = isSent ? '我' : chatName;
            
            // 3. 底部文案
            const remarkText = '大吉大利，万事如意';
            
            // 4. 按钮文字
            let actionText = '';
            if (isReceived) actionText = '已领取';
            else if (isSent) actionText = '等待领取';
            else actionText = '领取红包';
            
            // 点击事件
            const clickEvent = (!isSent && data.status === 'pending') ? `onclick="receiveTransfer(${msg.id})"` : '';

            // 礼物图标 SVG
            const giftIconSvg = `<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z"/></svg>`;

            // 爱心图标 SVG
            const heartIconSvg = `<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" style="margin-left:4px;"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;

            // ★★★ 这里生成了新的 HTML 结构，包含了 .transfer-title (显示备注) ★★★
            return `
            <div class="message-item ${isMe ? 'me' : ''} ${multiSelectClass}" data-message-id="${msg.id}">
                ${checkbox}
                <div class="transfer-card ${statusClass}" data-transfer-id="${msg.id}" ${clickEvent}>
                    <div class="transfer-icon">
                        ${giftIconSvg}
                    </div>
                    <div class="transfer-content">
                        <div class="transfer-title">
                            ${title} <span style="color:${isReceived ? '#4dabf7' : '#ff6b6b'}">${heartIconSvg}</span>
                        </div>
                        <div class="transfer-from">来自：${fromName}</div>
                        <div class="transfer-remark">${remarkText}</div>
                    </div>
                    <div class="transfer-status-col">
                        <div class="transfer-amount">¥${data.amount.toFixed(2)}</div>
                        <div class="transfer-action">${actionText}</div>
                    </div>
                </div>
                <div class="message-time">${formatMessageTime(msg.time)}</div>
            </div>`;
        }

  // ============ 🎁 礼物卡片渲染 (点击弹窗显示小票) ============
if (msg.type === 'shopping_order') {
    const data = msg.orderData;

    return `
        <div class="message-item ${isMe ? 'me' : ''} ${multiSelectClass}" data-message-id="${msg.id}">
            ${checkbox}
            <div class="gift-card" onclick="openReceiptModal(${msg.id})">
                <div class="gift-card-main">
                    <div class="gift-card-icon">
                        <svg viewBox="0 0 24 24">
                            <path d="M20 12v10H4V12"></path>
                            <path d="M2 7h20v5H2z"></path>
                            <path d="M12 22V7"></path>
                            <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path>
                            <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>
                        </svg>
                    </div>
                    <div class="gift-card-btn">礼物来了喵</div>
                </div>
            </div>
            <div class="message-time">${formatMessageTime(msg.time)}</div>
        </div>
    `;
}
// ============ 🎁 结束 ============


// 语音消息
if (msg.type === 'voice') {
    // 生成引用 HTML
    let voiceQuoteHtml = '';
    if (msg.quotedMessageId) {
        let shortContent = msg.quotedContent;
        if (shortContent && shortContent.length > 15) {
            shortContent = shortContent.substring(0, 15) + '...';
        }
        voiceQuoteHtml = `
            <div class="message-quoted-outside" onclick="scrollToMessage(${msg.quotedMessageId})">
                <span class="quoted-author">${msg.quotedAuthor}</span>
                <span class="quoted-text">${shortContent}</span>
            </div>
        `;
    }

    return `
        <div class="message-item ${isMe ? 'me' : ''} ${multiSelectClass}" data-message-id="${msg.id}">
            ${checkbox}
            <div style="display:flex; flex-direction:column; align-items: ${isMe ? 'flex-end' : 'flex-start'}; max-width:70%;">
                ${voiceQuoteHtml}
                <div class="voice-bubble ${msg.isExpanded ? 'expanded' : ''}" onclick="toggleVoiceState(this, ${msg.id})">
                    <div class="voice-play-btn"><i class="fa fa-play"></i></div>
                    <div class="voice-wave">
                        <span class="wave-bar"></span>
                        <span class="wave-bar"></span>
                        <span class="wave-bar"></span>
                        <span class="wave-bar"></span>
                        <span class="wave-bar"></span>
                    </div>
                    <div class="voice-duration">${msg.voiceDuration}"</div>
                </div>
                <div class="voice-text-content ${msg.isExpanded ? 'show' : ''}" id="voice-text-${msg.id}">${msg.content}</div>
            </div>
            <div class="message-time">${formatMessageTime(msg.time)}</div>
        </div>
    `;
}


                // 普通/图片消息
        let messageContent = '';
        
        // 图片消息
        if (msg.type === 'image') {
            messageContent = `<img src="${msg.content}" class="message-image" alt="${msg.altText || '图片'}" onclick="viewImage('${msg.content}')">`;
        } else {
            messageContent = msg.content;
        }

        // 记忆回溯提示条
        let memoryHintHtml = '';
        if (msg.memoryId) {
            memoryHintHtml = `
                <div class="memory-hint-bar" onclick="showMemoryDetail(${msg.memoryId})" style="font-size: 11px; color: #999; background: #f2f3f5; padding: 4px 10px; border-radius: 12px; margin-top: 6px; margin-left: 2px; display: inline-flex; align-items: center; cursor: pointer; width: fit-content; border: 0.5px solid #e0e0e0; user-select: none;">
                    <span style="margin-right:4px;">💡</span> 已触发记忆回溯 <span style="margin-left:4px; opacity:0.5;">›</span>
                </div>
            `;
        }

// ★★★ 修复版：引用消息渲染 ★★★
let quoteHtml = '';
if (msg.quotedMessageId) {
    // 处理引用内容：截断过长文字，图片显示【图片】
    let displayQuoteContent = msg.quotedContent || '';
    
    // 如果引用的是图片消息（内容是base64或url）
    if (displayQuoteContent.startsWith('data:image') || 
        displayQuoteContent.startsWith('http') && 
        (displayQuoteContent.includes('.jpg') || displayQuoteContent.includes('.png') || displayQuoteContent.includes('.gif') || displayQuoteContent.includes('.webp'))) {
        displayQuoteContent = '【图片】';
    }
    
    // 截断过长内容
    if (displayQuoteContent.length > 30) {
        displayQuoteContent = displayQuoteContent.substring(0, 30) + '...';
    }
    
    // 确保引用作者存在
    const quoteAuthor = msg.quotedAuthor || '未知';
    
    quoteHtml = `
        <div class="message-quoted-outside" onclick="scrollToMessage(${msg.quotedMessageId})">
            <span class="quoted-author">${quoteAuthor}：</span>
            <span class="quoted-text">${displayQuoteContent}</span>
        </div>
    `;
}


        return `
            <div class="message-item ${isMe ? 'me' : ''} ${multiSelectClass}" data-message-id="${msg.id}">
                ${checkbox}
                <div style="display:flex; flex-direction:column; align-items: ${isMe ? 'flex-end' : 'flex-start'}; max-width:70%;">
                    ${quoteHtml}
                    <div class="message-bubble" data-msg-id="${msg.id}" style="max-width: 100%; box-sizing: border-box;">${messageContent}</div>
                    ${memoryHintHtml}
                </div>
                <div class="message-time">${formatMessageTime(msg.time)}</div>
            </div>
        `;


    }).join('');

    // 调用那个“丢失”的函数
    updateRetryButtonState();
    
    if (!isMultiSelectMode) {
        requestAnimationFrame(() => {
            document.querySelectorAll('.message-bubble[data-msg-id]').forEach(b => addLongPressEvent(b, parseInt(b.dataset.msgId)));
        });
    }
}

// ============ 补回丢失的函数：更新撤回按钮状态 ============
function updateRetryButtonState() {
    const retryBtn = document.getElementById('retryBtn');
    if (!retryBtn) return;
    
    if (allMessages.length === 0) {
        retryBtn.disabled = true;
        retryBtn.style.opacity = '0.3';
        return;
    }
    
    const lastMessage = allMessages[allMessages.length - 1];
    if (lastMessage && lastMessage.senderId !== 'me') {
        retryBtn.disabled = false;
        retryBtn.style.opacity = '1';
    } else {
        retryBtn.disabled = true;
        retryBtn.style.opacity = '0.3';
    }
}
// 4. 显示记忆详情弹窗
function showMemoryDetail(memoryId) {
    loadFromDB('memories', (data) => {
        let allMemories = Array.isArray(data) ? data : (data && data.list ? data.list : []);
        const mem = allMemories.find(m => m.id === memoryId);
        if (mem) alert(`💡 记忆回溯\n\n📅 时间：${mem.happenTime || '未知'}\n📝 内容：${mem.content}`);
        else alert('这条记忆似乎已经被遗忘了...');
    });
}

// 5. 记忆精简逻辑 (手动触发，支持选择范围)
async function startCondense() {
    const range = document.getElementById('condenseRange').value;
    const btn = document.querySelector('#condenseModal .btn-save');
    const originalText = btn.textContent;
    
    if (!currentApiConfig.baseUrl || !currentApiConfig.apiKey) {
        alert('请先配置 API');
        return;
    }

    try {
        btn.disabled = true;
        btn.textContent = '正在整理...';

        const memoriesToCondense = await new Promise(resolve => {
            loadFromDB('memories', (data) => {
                let all = Array.isArray(data) ? data : (data && data.list ? data.list : []);
                let chatsMems = all.filter(m => m.chatId === currentChatId && m.type === 'moment');
                chatsMems.sort((a, b) => new Date(a.happenTime) - new Date(b.happenTime));
                
                if (range === 'recent_20') resolve(chatsMems.slice(-20));
                else if (range === 'recent_50') resolve(chatsMems.slice(-50));
                else resolve(chatsMems); 
            });
        });

        if (memoriesToCondense.length < 2) {
            alert('记忆太少，无需整理');
            return;
        }

        const inputText = memoriesToCondense.map(m => `${m.happenTime}: ${m.content}`).join('\n');
        const prompt = `你是一个记忆整理师。请将以下流水账记忆**合并、精简**为 3-5 条更有概括性的记忆。保留重要情感节点。输出格式：日期范围|||记忆内容 (每行一条)\n\n[原始记忆]:\n${inputText}`;

        const url = currentApiConfig.baseUrl.endsWith('/') ? currentApiConfig.baseUrl + 'chat/completions' : currentApiConfig.baseUrl + '/chat/completions';
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${currentApiConfig.apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: currentApiConfig.defaultModel, messages: [{ role: 'user', content: prompt }], temperature: 0.5 })
        });

        const data = await response.json();
        const summary = data.choices[0].message.content;

        loadFromDB('memories', (data) => {
            let all = Array.isArray(data) ? data : (data && data.list ? data.list : []);
            const idsToRemove = memoriesToCondense.map(m => m.id);
            all = all.filter(m => !idsToRemove.includes(m.id));
            
            const lines = summary.split('\n').filter(l => l.trim().length > 5);
            const today = new Date().toISOString().split('T')[0];
            
            lines.forEach(line => {
                let date = today;
                let content = line;
                if (line.includes('|||')) {
                    const parts = line.split('|||');
                    date = parts[0].trim();
                    content = parts[1].trim();
                }
                all.push({ id: Date.now() + Math.floor(Math.random()*1000), chatId: currentChatId, type: 'moment', content: content, happenTime: date, createTime: new Date().toISOString() });
            });
            
            saveToDB('memories', { list: all });
            loadMemories(); 
            loadArchives();
            alert(`整理完成！已精简为 ${lines.length} 条。`);
            closeCondenseModal();
        });

    } catch (e) {
        alert('整理失败：' + e.message);
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}
// ============================================================
// ▲▲▲▲▲▲▲▲▲▲ 记忆系统核心代码结束 ▲▲▲▲▲▲▲▲▲▲
// ============================================================
// ============ 缺失的补丁：更新撤回按钮状态 ============
function updateRetryButtonState() {
    const retryBtn = document.getElementById('retryBtn');
    if (!retryBtn) return;
    
    // 如果没有消息，禁用按钮
    if (allMessages.length === 0) {
        retryBtn.disabled = true;
        retryBtn.style.opacity = '0.3';
        return;
    }
    
    // 检查最后一条消息
    const lastMessage = allMessages[allMessages.length - 1];
    
    // 只有当最后一条消息是 AI 发送的（不是我发的），才允许撤回重试
    if (lastMessage && lastMessage.senderId !== 'me') {
        retryBtn.disabled = false;
        retryBtn.style.opacity = '1'; // 激活状态不透明
    } else {
        retryBtn.disabled = true;
        retryBtn.style.opacity = '0.3'; // 禁用状态半透明
    }
}


// ============ 🏛️ 新版档案中心逻辑 (A+B 混合架构) ============

let currentArchiveTab = 'profile'; // profile, tags, timeline

// 1. 打开档案页 (更新)
function openMemoryScreen() {
    if (!currentChatId) return;
    
    // 隐藏角色页，显示档案页
    document.getElementById('characterInfoScreen').style.display = 'none';
    document.getElementById('memoryScreen').style.display = 'flex';
    
    // 默认打开“他的档案”
    switchMemoryTab('profile');
    
    // 加载数据
    loadArchives();
}

// 2. Tab 切换逻辑 (控制 3 个页面 + 悬浮按钮状态)
function switchMemoryTab(tab) {
    currentArchiveTab = tab;
    
    // 1. 更新 Tab 样式
    document.querySelectorAll('.memory-tab-item').forEach(el => el.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');
    
    // 2. 切换内容区域显示
    document.getElementById('archiveProfileView').style.display = 'none';
    document.getElementById('memoryTagsList').style.display = 'none';
    document.getElementById('memoryTimelineList').style.display = 'none';
    
    const floatBtn = document.getElementById('memoryFloatingBtn');
const analyzeBtn = document.getElementById('headerAnalyzeBtn');
if (analyzeBtn) analyzeBtn.style.display = 'block';

    
    if (tab === 'profile') {
        document.getElementById('archiveProfileView').style.display = 'block';
        // Profile 页：按钮变为编辑图标
        floatBtn.textContent = '✎';
        floatBtn.style.background = 'white';
        floatBtn.style.color = '#333';
        floatBtn.style.border = '1px solid #eee';
        // 绑定编辑事件
        floatBtn.onclick = function() { openEditArchiveModal(); };
    } 
    else if (tab === 'tags') {
        document.getElementById('memoryTagsList').style.display = 'block';
        renderUserProfile(); // 切换到此 Tab 时刷新数据(只读旧数据)
        
   
        
        // Tags 页：按钮为添加 +
        floatBtn.textContent = '+';
        floatBtn.style.background = '#667eea';
        floatBtn.style.color = 'white';
        floatBtn.style.border = 'none';
        // 绑定添加事件
        floatBtn.onclick = function() { openAddMemoryModal(); };
    } 
    else { // timeline
        document.getElementById('memoryTimelineList').style.display = 'block';
        // Timeline 页：按钮为添加 +
        floatBtn.textContent = '+';
        floatBtn.style.background = '#667eea';
        floatBtn.style.color = 'white';
        floatBtn.style.border = 'none';
        // 绑定添加事件
        floatBtn.onclick = function() { openAddMemoryModal(); };
    }
}

// 3. 悬浮按钮点击处理
function handleMemoryFloatClick() {
    if (currentArchiveTab === 'profile') {
        openEditArchiveModal(); // 编辑档案
    } else {
        openAddMemoryModal(); // 添加标签或回忆 (复用旧逻辑)
    }
}

// 4. 核心加载函数：同时加载 A类(Sync) 和 B类(Extended) 数据
// ============ 🔄 修复版：加载档案 (强力同步版) ============
function loadArchives() {
    // 1. 先从 chats 列表里找最新的基础信息 (这是最准的)
    const chat = chats.find(c => c.id === currentChatId);
    const chatName = chat ? chat.name : 'Character';
    const chatAvatar = chat ? (chat.avatarImage || chat.avatar) : '👤';

    loadFromDB('characterInfo', (data) => {
        const charData = data && data[currentChatId] ? data[currentChatId] : {};
        
        // --- 1. A区：基础信息 (混合数据源) ---
        const avatarEl = document.getElementById('arcAvatar');
        const nameEl = document.getElementById('arcName');
        
        if (avatarEl && nameEl) {
            // 头像策略：优先用 characterInfo 里的，没有就用 chats 里的
            const finalAvatar = charData.avatarImage || chatAvatar;
            
            if (finalAvatar && finalAvatar.length > 10) { // 简单判断是不是 Base64 图片
                avatarEl.innerHTML = `<img src="${finalAvatar}">`;
            } else {
                avatarEl.textContent = finalAvatar;
            }
            
            // 名字策略：优先显示备注(remark)，没有备注就显示名字(name)
            // 这里的 name 优先取 characterInfo 的，如果没有就取 chats 里的
            const finalName = charData.remark || charData.name || chatName;
            nameEl.textContent = finalName;
            
            // 其他信息保持不变
            document.getElementById('arcZodiac').textContent = getZodiacSign(charData.birthday) || '未知星座';
            document.getElementById('arcCity').textContent = charData.charVirtualAddress || '未知城市';
            document.getElementById('arcBirthday').textContent = charData.birthday || '未知';
        }

        // --- 2. B区 & C区：拓展数据 (保持不变) ---
        const ext = charData.extendedProfile || {}; 
        
        document.getElementById('arcHeight').textContent = ext.height || '--';
        document.getElementById('arcWeight').textContent = ext.weight || '--';
        document.getElementById('arcLikes').textContent = ext.likes || '--';
        document.getElementById('arcDislikes').textContent = ext.dislikes || '--';
        
        const displayAnalysis = ext.coreTrait || '（暂无分析，请点击右下角“⚡”生成...）';
        const coreEl = document.getElementById('arcCorePersonality');
        coreEl.innerText = displayAnalysis;
        
        if (!ext.coreTrait) {
            coreEl.style.color = '#999';
            coreEl.style.fontStyle = 'italic';
        } else {
            coreEl.style.color = '#555';
            coreEl.style.fontStyle = 'normal';
        }

        document.getElementById('arcSecret').innerText = ext.secret || '（需要通过聊天积累数据，点击分析生成...）';
    });

    // 加载标签和相册
    loadFromDB('memories', (data) => {
        let allMemories = [];
        if (Array.isArray(data)) allMemories = data;
        else if (data && data.list) allMemories = data.list;
        const chatMemories = allMemories.filter(m => m.chatId === currentChatId);
        renderMemoryTags(chatMemories.filter(m => m.type === 'tag'));
        renderMemoryTimeline(chatMemories.filter(m => m.type === 'moment'));
    });
}

// 辅助：根据日期算星座
function getZodiacSign(dateStr) {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    
    if((month == 1 && day <= 19) || (month == 12 && day >=22)) return "摩羯座";
    if((month == 1 && day >= 20) || (month == 2 && day <= 18)) return "水瓶座";
    if((month == 2 && day >= 19) || (month == 3 && day <= 20)) return "双鱼座";
    if((month == 3 && day >= 21) || (month == 4 && day <= 19)) return "白羊座";
    if((month == 4 && day >= 20) || (month == 5 && day <= 20)) return "金牛座";
    if((month == 5 && day >= 21) || (month == 6 && day <= 21)) return "双子座";
    if((month == 6 && day >= 22) || (month == 7 && day <= 22)) return "巨蟹座";
    if((month == 7 && day >= 23) || (month == 8 && day <= 22)) return "狮子座";
    if((month == 8 && day >= 23) || (month == 9 && day <= 22)) return "处女座";
    if((month == 9 && day >= 23) || (month == 10 && day <= 23)) return "天秤座";
    if((month == 10 && day >= 24) || (month == 11 && day <= 22)) return "天蝎座";
    if((month == 11 && day >= 23) || (month == 12 && day <= 21)) return "射手座";
    return null;
}

// 5. 编辑拓展档案逻辑
function openEditArchiveModal() {
    loadFromDB('characterInfo', (data) => {
        const charData = data && data[currentChatId] ? data[currentChatId] : {};
        const ext = charData.extendedProfile || {};
        
        // 填充表单
        document.getElementById('editArcHeight').value = ext.height || '';
        document.getElementById('editArcWeight').value = ext.weight || '';
        document.getElementById('editArcMbti').value = ext.mbti || '';
        document.getElementById('editArcBlood').value = ext.blood || '';
        document.getElementById('editArcSecret').value = ext.secret || '';
        
        document.getElementById('editArchiveModal').style.display = 'flex';
    });
}

function closeEditArchiveModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('editArchiveModal').style.display = 'none';
}

function saveExtendedArchive() {
    const extData = {
        height: document.getElementById('editArcHeight').value.trim(),
        weight: document.getElementById('editArcWeight').value.trim(),
        mbti: document.getElementById('editArcMbti').value.trim(),
        blood: document.getElementById('editArcBlood').value.trim(),
        secret: document.getElementById('editArcSecret').value.trim()
    };
    
    // 保存到 characterInfo 里的 extendedProfile 字段
    loadFromDB('characterInfo', (data) => {
        const allData = data || {};
        if (!allData[currentChatId]) allData[currentChatId] = {};
        
        // 更新拓展字段
        allData[currentChatId].extendedProfile = extData;
        
        saveToDB('characterInfo', allData);
        
        // 刷新显示
        loadArchives();
        closeEditArchiveModal();
    });
}

// 修复：更新 renderMemoryTags 里的容器ID
// 请确保你原来的 renderMemoryTags 函数里，容器获取 ID 已经改成 'tagsContainer'
// 下面是兼容代码，建议替换原 renderMemoryTags
function renderMemoryTags(tags) {
    const container = document.getElementById('tagsContainer'); // 改成新的ID
    if (!container) return; // 防御性检查

    if (tags.length === 0) {
        container.innerHTML = '<div style="width:100%; text-align:center; color:#ccc; margin-top:50px; font-size:12px;">暂无印象标签<br>点击右下角 + 添加</div>';
        return;
    }
    
    tags.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
    
    container.innerHTML = tags.map(tag => `
        <div class="mem-tag ${tag.isPinned ? 'pinned' : ''}" onclick="openEditMemoryModal(${tag.id})">
            ${tag.isPinned ? '<span class="mem-tag-pin-icon">📌</span>' : ''}
            ${tag.content}
        </div>
    `).join('');
}

// ============ ⚡ 智能刷新总控中心 ============
async function analyzeProfile() {
    if (!currentChatId) return;
    
    // 1. 获取按钮并设置加载状态
    const btn = document.getElementById('headerAnalyzeBtn');
    if (!btn) return;
    
    // 检查API
    if (!currentApiConfig.baseUrl || !currentApiConfig.apiKey) {
        alert('请先在API设置中配置');
        return;
    }

    // 开启加载动画 (透明度闪烁)
    btn.disabled = true;
    btn.style.transition = 'opacity 0.5s';
    btn.style.opacity = '0.3';
    btn.style.pointerEvents = 'none';

    try {
        // 2. 根据当前 Tab 分发任务
        if (currentArchiveTab === 'profile') {
            await analyzeCharacterSecret(); // 刷新 Tab 1: 角色档案 & 秘密
        } else if (currentArchiveTab === 'tags') {
            await analyzeUserImpression();  // 刷新 Tab 2: 用户侧写 & 印象
        } else if (currentArchiveTab === 'timeline') {
            await analyzeTimelineEvents();  // 刷新 Tab 3: 提取时光记忆
        }
    } catch (error) {
        console.error(error);
        alert('刷新失败：' + error.message);
    } finally {
        // 3. 恢复按钮状态
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.pointerEvents = 'auto';
    }
}

// ============ 任务一：分析角色秘密 (Tab 1: Profile) - 增量更新版 ============
async function analyzeCharacterSecret() {
    // 1. 先获取角色信息，看看上次分析到了哪里
    const charData = await new Promise(resolve => {
        loadFromDB('characterInfo', data => {
            resolve(data && data[currentChatId] ? data[currentChatId] : {});
        });
    });

    const ext = charData.extendedProfile || {};
    const existingSecrets = ext.secretArchive || '';
    // 获取上次分析的消息ID锚点 (如果没有，默认为0)
    const lastAnalyzedId = ext.lastAnalyzedMsgId || 0;

    // 2. 获取【未分析过】的新消息
    const { chatHistory, newLatestId, newMsgCount } = await new Promise(resolve => {
        loadFromDB('messages', data => {
            const list = data && data.list ? data.list : [];
            
            // 筛选当前聊天室的消息
            const allChatMsgs = list.filter(m => m.chatId === currentChatId);
            
            // 按 ID 排序确保顺序
            allChatMsgs.sort((a, b) => a.id - b.id);
            
            // ★ 核心逻辑：只提取 ID 大于上次锚点的消息
            const newMsgs = allChatMsgs.filter(m => m.id > lastAnalyzedId);
            
            if (newMsgs.length === 0) {
                resolve({ chatHistory: null, newLatestId: lastAnalyzedId, newMsgCount: 0 });
                return;
            }

            const history = newMsgs.map(m => `${m.senderId === 'me' ? '用户' : '我'}: ${m.content}`).join('\n');
            const latestId = newMsgs[newMsgs.length - 1].id; // 记录这批消息里最新的一条ID
            
            resolve({ chatHistory: history, newLatestId: latestId, newMsgCount: newMsgs.length });
        });
    });

    // 3. 如果没有新消息，直接提示并退出
    if (newMsgCount === 0) {
        alert('🔍 暂无新的聊天记录可供分析~\n再多聊几句，积累一些素材吧！');
        // 恢复按钮状态 (因为在总控函数里禁用了)
        const btn = document.getElementById('headerAnalyzeBtn');
        if (btn) {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.pointerEvents = 'auto';
        }
        return;
    }

    // 如果新消息太少（比如少于5条），可能分析不出什么，提示一下但继续（可选）
    // if (newMsgCount < 5) { ... }

    const today = new Date();
    const todayStr = `${today.getFullYear()}/${today.getMonth() + 1}/${today.getDate()}`;

    // 4. Prompt (强调基于“新增对话”)
    const prompt = `你是一个洞察力极强的侧写师。请根据**新增的对话片段**，更新角色的档案。

【任务A：完善设定】
根据对话推断角色的身高、体重、性格关键词、爱好雷点。

【任务B：挖掘秘密】
寻找角色在**这段新对话**中无意流露出的**反差萌、小习惯、或隐藏的心理活动**。

**重要规则**：
1. 只关注这段新对话！不要编造！
2. 如果这段对话很平淡，没有发现新秘密，请直接填“无新发现”。
3. 秘密要简短有趣（30字内）。

【新增对话片段】(${newMsgCount}条)
${chatHistory}

【输出格式】(用 ||| 分隔)
身高(如180cm)||体重(如65kg)||性格精炼(50字内)||爱好(2个)||厌恶(2个)||新秘密(30字内)`;

    // 5. API 调用
    const content = await callAI(prompt);

    // 6. 解析与保存
    let parts = content.split('|||').map(s => s.trim());
    while(parts.length < 6) parts.push("（未知）");

    let newSecrets = parts[5];
    let updatedSecretArchive = existingSecrets;
    let hasNewSecret = false;
    
    // 只有当真的有新发现时，才追加到档案
    if (newSecrets && !newSecrets.includes('无新发现') && !newSecrets.includes('未知')) {
        const secretEntry = `【${todayStr}】${newSecrets}`;
        updatedSecretArchive = existingSecrets ? existingSecrets + '\n' + secretEntry : secretEntry;
        hasNewSecret = true;
    }

    const newExtData = {
        height: parts[0],
        weight: parts[1],
        coreTrait: parts[2],
        likes: parts[3],
        dislikes: parts[4],
        secretArchive: updatedSecretArchive,
        secret: updatedSecretArchive,
        lastAnalyzedMsgId: newLatestId // ★ 更新锚点：记录这次分析到了哪一条
    };

    // 保存
    loadFromDB('characterInfo', (allData) => {
        if (!allData[currentChatId]) allData[currentChatId] = {};
        const oldExt = allData[currentChatId].extendedProfile || {};
        
        // 合并数据
        allData[currentChatId].extendedProfile = { ...oldExt, ...newExtData };
        
        saveToDB('characterInfo', allData);
        loadArchives(); // 刷新界面
        
        if (hasNewSecret) {
            alert(`✨ 分析了 ${newMsgCount} 条新消息\n发现了新的秘密：\n"${newSecrets}"`);
        } else {
            alert(`✅ 分析了 ${newMsgCount} 条新消息\n档案基础信息已更新 (暂无新秘密)`);
        }
    });
}



// ============ 任务二：分析用户印象 (Tab 2: Tags) - 完整版 ============
async function analyzeUserImpression() {
    // 1. 获取数据
    const chatHistory = await getRecentChatHistory(50); 
    
    const charData = await new Promise(resolve => {
        loadFromDB('characterInfo', data => {
            const allData = data || {};
            resolve(allData[currentChatId] ? allData[currentChatId] : {});
        });
    });
    
    // 2. Prompt
    const prompt = `你现在是【${charData.name}】。请阅读刚才的聊天记录，重新审视你对【用户】的印象。

【分析指令】
1. **TA的心情记录**：
   - **心情关键词**：限制5字以内（如：有点低落）。
   - **心情贴纸**：选一个 (sunny/cloudy/rainy/stormy/starry/coffee)。
   - **你的心里话**：针对用户的心情，写一段你的内心独白。

2. **印象标签**：
   - 生成 **3-6个** 新的印象标签。
   - 格式：标签名#理由

3. **闪光时刻**：
   - 寻找 **1-2个** 值得记录的瞬间（哪怕是微小的瞬间）。
   - 格式：时刻标题#内容描述#你的短评
   - 示例：第一次聊通宵#那天我们聊了很多#很开心能更了解你

【输出格式】(严格遵守 ||| 分隔)
心情关键词||心情贴纸代码||你的心里话||标签1#理由1,标签2#理由2||时刻1#内容1#短评1,时刻2#内容2#短评2

*注意：如果没有新标签或新时刻，对应位置填“无”。*`;

    // 3. API 调用
    const content = await callAI(prompt);

    // 4. 解析
    const parts = content.split('|||').map(s => s.trim());
    const moodDesc = parts[0] || '平静';
    const sticker = parts[1] || 'sunny';
    const moodComment = parts[2] || '（他在观察你...）';
    const tagsStr = parts[3] || '';
    const momentsStr = parts[4] || ''; // ★ 这里就是闪光时刻的字符串

    // 解析新标签
    const newTags = [];
    if (tagsStr && tagsStr !== '无') {
        const tagItems = tagsStr.split(/[,，]/);
        tagItems.forEach(item => {
            const [text, reason] = item.split(/[#＃]/);
            if (text && reason) {
                newTags.push({
                    text: text.trim(),
                    reason: reason.trim(),
                    id: Date.now() + Math.random()
                });
            }
        });
    }

    // ★★★ 解析闪光时刻 ★★★
    const newMoments = [];
    if (momentsStr && momentsStr !== '无') {
        const momentItems = momentsStr.split(/[,，]/); // 用逗号分隔多个时刻
        momentItems.forEach(item => {
            const [title, content, comment] = item.split(/[#＃]/);
            if (title && content) {
                newMoments.push({
                    id: Date.now() + Math.random(),
                    title: title.trim(),
                    content: content.trim(),
                    comment: comment ? comment.trim() : '',
                    date: new Date().toISOString().split('T')[0]
                });
            }
        });
    }

    // 5. 保存数据
    loadFromDB('characterInfo', (data) => {
        const allData = data || {};
        if (!allData[currentChatId]) allData[currentChatId] = {};
        
        if (!allData[currentChatId].userProfile) {
            allData[currentChatId].userProfile = { tags: [], emotionHistory: [], flashbulbMemories: [] };
        }
        
        const profile = allData[currentChatId].userProfile;
        
        // 更新心情
        profile.currentEmotion = {
            sticker: sticker,
            label: moodDesc,
            comment: moodComment,
            time: getCurrentTime()
        };
        
        // 覆盖标签
        if (newTags.length > 0) {
            profile.tags = newTags; 
        }

        // ★★★ 追加闪光时刻 (最新的在前面) ★★★
        if (newMoments.length > 0) {
            // 如果之前没有 flashbulbMemories 数组，初始化它
            if (!profile.flashbulbMemories) profile.flashbulbMemories = [];
            
            profile.flashbulbMemories = [...newMoments, ...profile.flashbulbMemories];
            
            // 限制数量，比如最多保留 20 个
            if (profile.flashbulbMemories.length > 20) {
                profile.flashbulbMemories.length = 20;
            }
        }
        
        saveToDB('characterInfo', allData);
        renderUserProfile();
        
        let alertMsg = `✨ 眼中的你已刷新`;
        if (newMoments.length > 0) alertMsg += `\n📸 捕捉到 ${newMoments.length} 个闪光时刻！`;
        alert(alertMsg);
    });
}




// ============ 任务三：提取时光记忆 (Tab 3: Timeline) ============
async function analyzeTimelineEvents() {
    // 1. 获取数据
    const chatHistory = await getRecentChatHistory(100); // 看远一点，100条

    // 2. Prompt
    const prompt = `你是一个回忆记录员。请阅读这段聊天记录，判断是否有**值得纪念的时刻**发生。

【判断标准】
- 只有发生**具体事件**（如：一起过节、收到礼物、深入谈心、重大约定、吵架和好）才值得记录。
- 如果只是普通的闲聊（吃了吗、在干嘛），请回答“无”。

【输出指令】
如果有值得记录的时刻，请概括为一句话的“时光胶囊”。
**风格**：文艺、深情，像日记标题。
**字数**：20字以内。

【输出示例】
- 第一次收到他送的花
- 在凌晨三点互道晚安
- 约定好一起去看海

如果无事发生，请严格回复：无`;

    // 3. API 调用
    const content = await callAI(prompt);

    // 4. 处理结果
    if (content.trim() === '无' || content.length > 50) {
        alert('📅 最近似乎是平淡的日常，没有提取到特殊纪念时刻~');
        return;
    }

    // 5. 保存到 Memories 表
    const newMemory = {
        id: Date.now(),
        chatId: currentChatId,
        type: 'moment', // 时光相册类型
        content: content.replace(/["《》]/g, ''), // 去掉可能的引号
        happenTime: new Date().toISOString().split('T')[0],
        createTime: new Date().toISOString()
    };

    loadFromDB('memories', (data) => {
        let allMemories = Array.isArray(data) ? data : (data && data.list ? data.list : []);
        
        // 查重：防止最近添加过一样的内容
        const isDuplicate = allMemories.some(m => m.chatId === currentChatId && m.content === newMemory.content);
        if (isDuplicate) {
            alert('📅 这个时刻已经被记录在相册里啦~');
            return;
        }

        allMemories.push(newMemory);
        saveToDB('memories', { list: allMemories });
        
        // 刷新界面
        loadMemories();
        alert(`📸 捕捉到一个时光碎片：\n"${newMemory.content}"`);
    });
}

// ============ 辅助工具：统一 API 调用 ============
async function callAI(prompt) {
    const url = currentApiConfig.baseUrl.endsWith('/') 
        ? currentApiConfig.baseUrl + 'chat/completions'
        : currentApiConfig.baseUrl + '/chat/completions';
        
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${currentApiConfig.apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: currentApiConfig.defaultModel || 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7
        })
    });

    if (!response.ok) throw new Error('API请求失败');
    const data = await response.json();
    return data.choices[0].message.content.trim();
}

// ============ 辅助工具：获取最近聊天文本 ============
async function getRecentChatHistory(limit) {
    return new Promise(resolve => {
        loadFromDB('messages', data => {
            const list = data && data.list ? data.list : [];
            const history = list.filter(m => m.chatId === currentChatId)
                                .slice(-limit)
                                .map(m => `${m.senderId === 'me' ? '用户' : '角色'}: ${m.content}`)
                                .join('\n');
            resolve(history || "（暂无互动）");
        });
    });
}


// ============ 🔄 最终修正版：加载档案 (已删除星座，含安全检查) ============
function loadArchives() {
    loadFromDB('characterInfo', (data) => {
        const charData = data && data[currentChatId] ? data[currentChatId] : {};
        
        // ★ 安全赋值函数：找不到 ID 就跳过，防止报错中断代码
        const safeSetText = (id, text) => {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = text;
            }
        };

        // --- 1. A区：基础信息 ---
        const avatarEl = document.getElementById('arcAvatar');
        if (avatarEl) {
            if (charData.avatarImage) avatarEl.innerHTML = `<img src="${charData.avatarImage}">`;
            else avatarEl.textContent = charData.avatar || '👤';
        }

        safeSetText('arcName', charData.remark || charData.name || 'Character');
        
        // 已彻底删除 arcZodiac 相关代码
        
        safeSetText('arcCity', charData.charVirtualAddress || '未知城市');
        safeSetText('arcBirthday', charData.birthday || '未知');

        // --- 2. B区：拓展数据 ---
        const ext = charData.extendedProfile || {}; 
        
        safeSetText('arcHeight', ext.height || '--');
        safeSetText('arcWeight', ext.weight || '--');
        safeSetText('arcLikes', ext.likes || '--');
        safeSetText('arcDislikes', ext.dislikes || '--');
        
        // --- 3. C区：性格分析 ---
        const coreEl = document.getElementById('arcCorePersonality');
        if (coreEl) {
            const text = ext.coreTrait || '（暂无分析，请点击上方按钮生成...）';
            coreEl.innerText = text;
            coreEl.style.color = ext.coreTrait ? '#555' : '#999';
        }

     // --- 4. D区：秘密档案 (支持换行显示) ---
const secretEl = document.getElementById('arcSecret');
if (secretEl) {
    const secretText = ext.secretArchive || ext.secret || '（需要通过聊天积累数据，点击分析生成...）';
    // 使用 innerHTML 并将换行符转为 <br> 实现换行显示
    secretEl.innerHTML = secretText.replace(/\n/g, '<br>');
    
    if (!ext.secretArchive && !ext.secret) {
        secretEl.style.color = '#999';
        secretEl.style.fontStyle = 'italic';
    } else {
        secretEl.style.color = '#555';
        secretEl.style.fontStyle = 'normal';
    }
}

    });

    // 加载标签和相册 (保持不变)
    loadFromDB('memories', (data) => {
        let allMemories = [];
        if (Array.isArray(data)) allMemories = data;
        else if (data && data.list) allMemories = data.list;
        const chatMemories = allMemories.filter(m => m.chatId === currentChatId);
        
        // 同样加上安全检查，防止找不到容器报错
        const tagsContainer = document.getElementById('tagsContainer');
        if(tagsContainer) {
            renderMemoryTags(chatMemories.filter(m => m.type === 'tag'));
        }
        
        const timelineContainer = document.getElementById('memoryTimelineList');
        if(timelineContainer) {
            renderMemoryTimeline(chatMemories.filter(m => m.type === 'moment'));
        }
    });
      renderUserProfile();
}


// ============ 💾 保存编辑 (适配新字段) ============
function openEditArchiveModal() {
    loadFromDB('characterInfo', (data) => {
        const charData = data && data[currentChatId] ? data[currentChatId] : {};
        const ext = charData.extendedProfile || {};
        
        document.getElementById('editArcHeight').value = ext.height || '';
        document.getElementById('editArcWeight').value = ext.weight || '';
        // 适配新字段
        document.getElementById('editArcLikes').value = ext.likes || '';
        document.getElementById('editArcDislikes').value = ext.dislikes || '';
        document.getElementById('editArcSecret').value = ext.secret || '';
        
        document.getElementById('editArchiveModal').style.display = 'flex';
    });
}

function saveExtendedArchive() {
    const extData = {
        height: document.getElementById('editArcHeight').value.trim(),
        weight: document.getElementById('editArcWeight').value.trim(),
        likes: document.getElementById('editArcLikes').value.trim(),       // 爱好
        dislikes: document.getElementById('editArcDislikes').value.trim(), // 厌恶
        secret: document.getElementById('editArcSecret').value.trim(),
        // 核心性格(coreTrait) 手动编辑不改它，或者如果你想改，需要在弹窗加个输入框。这里暂时保留旧的。
        coreTrait: characterInfoData.extendedProfile ? characterInfoData.extendedProfile.coreTrait : '' 
    };
    
    loadFromDB('characterInfo', (data) => {
        const allData = data || {};
        if (!allData[currentChatId]) allData[currentChatId] = {};
        
        // 合并数据（保留 AI 分析出的 coreTrait）
        const oldExt = allData[currentChatId].extendedProfile || {};
        allData[currentChatId].extendedProfile = { ...oldExt, ...extData };
        
        saveToDB('characterInfo', allData);
        loadArchives();
        closeEditArchiveModal();
    });
}

// === 新增：语音播放动画控制 ===
function toggleVoiceState(element, messageId) {
    // 1. 切换播放动画状态
    element.classList.toggle('playing');
    
    // 2. 切换图标 (Play <-> Pause)
    const icon = element.querySelector('.voice-play-btn i');
    if (icon) {
        if (element.classList.contains('playing')) {
            icon.classList.remove('fa-play');
            icon.classList.add('fa-pause');
            
            // 模拟播放3秒后自动停止
            setTimeout(() => {
                if (element.classList.contains('playing')) {
                    element.classList.remove('playing');
                    icon.classList.remove('fa-pause');
                    icon.classList.add('fa-play');
                }
            }, 3000);
        } else {
            icon.classList.remove('fa-pause');
            icon.classList.add('fa-play');
        }
    }

    // 3. 同时切换下方文字显示 (保留原有功能)
    toggleVoiceText(messageId);
}

// ============ 小票弹窗功能 ============
function openReceiptModal(messageId) {
    const message = allMessages.find(m => m.id === messageId);
    if (!message || message.type !== 'shopping_order') return;
    
    const data = message.orderData;
    
    // 状态
    let statusText = '待支付';
    let statusClass = 'pending';
    if (data.status === 'paid') {
        statusText = '已支付';
        statusClass = 'paid';
    } else if (data.status === 'rejected') {
        statusText = '已拒绝';
        statusClass = 'pending';
    }
    
    // 商品列表
    const itemsHtml = data.items.map(item => `
        <div class="receipt-item-row">
            <span style="flex:2;">${item.name}</span>
            <span style="flex:1; text-align:center;">×${item.quantity}</span>
            <span style="flex:1; text-align:right;">¥${(item.price * item.quantity).toFixed(2)}</span>
        </div>
    `).join('');
    
    // 操作按钮（仅AI请求代付且待处理时显示）
    let actionBtns = '';
    if (data.orderType === 'ai_ask_user_pay' && data.status === 'pending') {
        actionBtns = `
            <div class="receipt-action-btns">
                <button class="receipt-btn-confirm" onclick="confirmAIPayRequest(${messageId}); closeReceiptModal();">同意支付</button>
                <button class="receipt-btn-reject" onclick="rejectAIPayRequest(${messageId}); closeReceiptModal();">拒绝</button>
            </div>
        `;
    }
    
    // 创建弹窗
    const modalHtml = `
        <div class="receipt-modal-overlay" id="receiptModalOverlay" onclick="closeReceiptModal(event)">
            <div class="receipt-modal" onclick="event.stopPropagation()">
                <div class="receipt-modal-header">
                    <button class="receipt-close-btn" onclick="closeReceiptModal()">×</button>
                    <h3>帽子小猫商城</h3>
                    <p>购物小票 | 电子凭证</p>
                </div>
                
                <div class="receipt-modal-body">
                    <div class="receipt-info-section">
                        <div class="receipt-info-row">
                            <span class="receipt-info-label">订单编号</span>
                            <span class="receipt-info-value">${data.orderNumber.slice(-10)}</span>
                        </div>
                        <div class="receipt-info-row">
                            <span class="receipt-info-label">交易时间</span>
                            <span class="receipt-info-value">${message.time}</span>
                        </div>
                        <div class="receipt-info-row">
                            <span class="receipt-info-label">支付方式</span>
                            <span class="receipt-info-value">余额支付</span>
                        </div>
                        <div class="receipt-info-row">
                            <span class="receipt-info-label">交易状态</span>
                            <span class="receipt-status-tag ${statusClass}">${statusText}</span>
                        </div>
                    </div>
                    
                    <div class="receipt-items-section">
                        <div class="receipt-items-header">
                            <span style="flex:2;">商品名称</span>
                            <span style="flex:1; text-align:center;">数量</span>
                            <span style="flex:1; text-align:right;">金额</span>
                        </div>
                        ${itemsHtml}
                    </div>
                    
                    <div class="receipt-total-section">
                        <div class="receipt-total-row">
                            <span>商品总额</span>
                            <span>¥${data.totalPrice.toFixed(2)}</span>
                        </div>
                        <div class="receipt-total-row">
                            <span>运费</span>
                            <span>¥0.00</span>
                        </div>
                        <div class="receipt-total-row">
                            <span>优惠券</span>
                            <span>-¥0.00</span>
                        </div>
                        <div class="receipt-grand-total">
                            <span>实付金额</span>
                            <span>¥${data.totalPrice.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
                
                ${actionBtns}
                
                <div class="receipt-modal-footer">
                    <p>感谢您的光临，欢迎再次购物！</p>
                    <div class="receipt-barcode">|||| ||| ||||| |||| |||</div>
                    <p>客服电话: 400-123-4567</p>
                </div>
            </div>
        </div>
    `;
    
    // 插入到页面
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closeReceiptModal(event) {
    if (event && event.target !== event.currentTarget) return;
    const overlay = document.getElementById('receiptModalOverlay');
    if (overlay) {
        overlay.remove();
    }
}
// ============ 状态监控功能 ============

// 状态监控数据
let statusMonitorData = {
    mood: '',
    moodLevel: 75,
    clothes: '',
    clothesTags: [],
    action: '',
    thoughts: '',
    schedule: [],
    heartbeat: 72
};

// 处理状态监控开关
function handleStatusMonitorCheckbox() {
    const checkbox = document.getElementById('statusMonitorCheckbox');
    
    if (checkbox.checked) {
        // 开启状态监控
        enableStatusMonitor();
    } else {
        // 关闭状态监控
        disableStatusMonitor();
    }
}

// 启用状态监控
function enableStatusMonitor() {
    if (!currentChatId) return;
    
    loadFromDB('characterInfo', (data) => {
        const allData = data || {};
        if (!allData[currentChatId]) allData[currentChatId] = {};
        allData[currentChatId].statusMonitorEnabled = true;
        saveToDB('characterInfo', allData);
    });
}

// 禁用状态监控
function disableStatusMonitor() {
    if (!currentChatId) return;
    
    loadFromDB('characterInfo', (data) => {
        const allData = data || {};
        if (!allData[currentChatId]) allData[currentChatId] = {};
        allData[currentChatId].statusMonitorEnabled = false;
        saveToDB('characterInfo', allData);
    });
}

// 显示/隐藏心电图悬浮条
function updateHeartbeatBarVisibility() {
    const bar = document.getElementById('statusHeartbeatBar');
    if (!bar || !currentChatId) return;
    
    loadFromDB('characterInfo', (data) => {
        const charData = data && data[currentChatId] ? data[currentChatId] : {};
        
        if (charData.statusMonitorEnabled) {
            bar.style.display = 'flex';
            // 加载已保存的心跳数据
            if (charData.statusMonitor && charData.statusMonitor.heartbeat) {
                document.getElementById('heartbeatBpm').textContent = charData.statusMonitor.heartbeat;
            }
        } else {
            bar.style.display = 'none';
        }
    });
}

// 打开状态监控弹窗
function openStatusMonitorModal() {
    document.getElementById('statusMonitorModal').style.display = 'flex';
    loadStatusMonitorData();
}

// 关闭状态监控弹窗
function closeStatusMonitorModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('statusMonitorModal').style.display = 'none';
}

// 加载状态监控数据
function loadStatusMonitorData() {
    if (!currentChatId) return;
    
    loadFromDB('characterInfo', (data) => {
        const charData = data && data[currentChatId] ? data[currentChatId] : {};
        const monitor = charData.statusMonitor || {};
        
        // 填充数据到弹窗
        document.getElementById('statusMoodText').textContent = monitor.mood || '今天心情不错~';
        document.getElementById('statusBpm').textContent = (monitor.heartbeat || 72) + ' BPM';
        document.getElementById('heartbeatBpm').textContent = monitor.heartbeat || 72;
        
        // 心情进度条
        const moodLevel = monitor.moodLevel || 75;
        document.getElementById('moodProgressFill').style.width = moodLevel + '%';
        document.getElementById('moodPercent').textContent = moodLevel;
        
        // 穿着
        document.getElementById('statusClothesText').textContent = monitor.clothesStyle || '简约休闲风';
        renderClothesTags(monitor.clothesTags || ['白色T恤', '牛仔裤', '运动鞋']);
        
        // 行为
        document.getElementById('statusActionText').textContent = monitor.action || '正在做自己的事情...';
        
        // 想法
        document.getElementById('statusThoughtsText').textContent = monitor.thoughts || '脑子里在想一些事情...';
        
        // 日程
        renderScheduleList(monitor.schedule || [
            { time: '09:00', task: '起床', status: 'completed' },
            { time: '12:00', task: '午餐', status: 'current' },
            { time: '18:00', task: '晚餐', status: 'upcoming' }
        ]);
    });
}

// 渲染穿着标签
function renderClothesTags(tags) {
    const container = document.getElementById('statusClothesTags');
    if (!container) return;
    
    container.innerHTML = tags.map(tag => 
        `<span class="clothes-tag">${tag}</span>`
    ).join('');
}

// 渲染日程列表
function renderScheduleList(schedule) {
    const container = document.getElementById('statusScheduleList');
    if (!container) return;
    
    if (schedule.length === 0) {
        container.innerHTML = '<div style="color:#999; font-size:13px;">暂无日程安排</div>';
        return;
    }
    
    container.innerHTML = schedule.map(item => `
        <div class="schedule-row ${item.status}">
            <div class="schedule-dot"></div>
            <div class="schedule-time">${item.time}</div>
            <div class="schedule-task">${item.task}</div>
        </div>
    `).join('');
}

// 根据聊天上下文生成状态（AI调用）
async function generateStatusFromContext() {
    if (!currentChatId || !currentApiConfig.baseUrl || !currentApiConfig.apiKey) {
        return null;
    }
    
    const chat = chats.find(c => c.id === currentChatId);
    if (!chat) return null;
    
    // 获取角色信息
    const characterInfo = await new Promise(resolve => {
        loadFromDB('characterInfo', data => {
            resolve(data && data[currentChatId] ? data[currentChatId] : {});
        });
    });
    
    // 获取最近的聊天记录
    const recentMessages = allMessages.slice(-20).map(msg => {
        const sender = msg.senderId === 'me' ? '用户' : chat.name;
        return `${sender}: ${msg.content}`;
    }).join('\n');
    
    const today = new Date();
    const timeStr = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;
    
    const prompt = `你是${chat.name}，请根据以下信息生成你当前的状态。

【角色人设】
${characterInfo.personality || '无特殊设定'}

【当前时间】
${timeStr}

【最近聊天记录】
${recentMessages || '暂无聊天'}

请生成以下状态信息，用|||分隔：
1. 此刻心情（一句话描述，20字以内）
2. 心情值（0-100的数字）
3. 心跳（60-120的数字，根据情绪波动）
4. 穿着风格（一句话，10字以内）
5. 穿着单品（3-4个，用逗号分隔）
6. 当前行为（一句话描述，30字以内）
7. 内心想法（2-3句话，50字以内）
8. 今日日程（3-5项，格式：时间-事项-状态，用分号分隔，状态为completed/current/upcoming）

示例输出：
心情不错，有点期待|||78|||75|||简约休闲风|||白T恤,牛仔裤,帆布鞋|||在房间里听音乐放松|||想着等会要不要出去走走，最近天气挺好的|||09:00-起床-completed;12:00-午餐-completed;15:00-看书-current;19:00-晚餐-upcoming`;

    try {
        const url = currentApiConfig.baseUrl.endsWith('/') 
            ? currentApiConfig.baseUrl + 'chat/completions'
            : currentApiConfig.baseUrl + '/chat/completions';
            
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentApiConfig.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: currentApiConfig.defaultModel || 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7
            })
        });
        
        if (!response.ok) return null;
        
        const data = await response.json();
        const content = data.choices[0].message.content.trim();
        
        // 解析返回内容
        const parts = content.split('|||').map(s => s.trim());
        if (parts.length < 8) return null;
        
        // 解析日程
        const scheduleStr = parts[7];
        const schedule = scheduleStr.split(';').map(item => {
            const [time, task, status] = item.split('-');
            return { time: time?.trim(), task: task?.trim(), status: status?.trim() || 'upcoming' };
        }).filter(item => item.time && item.task);
        
        return {
            mood: parts[0],
            moodLevel: parseInt(parts[1]) || 75,
            heartbeat: parseInt(parts[2]) || 72,
            clothesStyle: parts[3],
            clothesTags: parts[4].split(',').map(s => s.trim()),
            action: parts[5],
            thoughts: parts[6],
            schedule: schedule
        };
        
    } catch (error) {
        console.error('生成状态失败:', error);
        return null;
    }
}

// 刷新状态监控数据
async function refreshStatusMonitor() {
    if (!currentChatId) return;
    
    const newStatus = await generateStatusFromContext();
    if (!newStatus) {
        alert('生成状态失败，请检查API配置');
        return;
    }
    
    // 保存到数据库
    loadFromDB('characterInfo', (data) => {
        const allData = data || {};
        if (!allData[currentChatId]) allData[currentChatId] = {};
        allData[currentChatId].statusMonitor = newStatus;
        saveToDB('characterInfo', allData);
        
        // 刷新显示
        loadStatusMonitorData();
        
        // 更新悬浮条心跳
        document.getElementById('heartbeatBpm').textContent = newStatus.heartbeat;
    });
}

// 在打开聊天详情时检查并显示心电图条
const originalOpenChatDetail = openChatDetail;
openChatDetail = function(chatId) {
    originalOpenChatDetail(chatId);
    
    // 延迟检查，确保页面已渲染
    setTimeout(() => {
        updateHeartbeatBarVisibility();
    }, 100);
};

// 在加载角色信息时同步状态监控开关
const originalLoadCharacterInfo = loadCharacterInfo;
loadCharacterInfo = function(chatId) {
    originalLoadCharacterInfo(chatId);
    
    // 延迟加载状态监控开关状态
    setTimeout(() => {
        loadFromDB('characterInfo', (data) => {
            const charData = data && data[chatId] ? data[chatId] : {};
            const checkbox = document.getElementById('statusMonitorCheckbox');
            if (checkbox) {
                checkbox.checked = charData.statusMonitorEnabled === true;
            }
        });
    }, 300);
};
// ============ 悬浮球拖拽逻辑 ============

function initDraggableHeartbeat() {
    const bar = document.getElementById('statusHeartbeatBar');
    const screen = document.querySelector('.phone-screen'); // 限制范围在手机屏幕内
    
    if (!bar || !screen) return;

    let isDragging = false;
    let hasMoved = false; // 标记是否发生过移动
    
    // 记录偏移量
    let startX, startY, initialLeft, initialTop;

    // --- 触摸开始 (Mobile) / 鼠标按下 (Desktop) ---
    const startDrag = (e) => {
        // 如果是多指触控，不触发拖拽
        if (e.touches && e.touches.length > 1) return;

        isDragging = true;
        hasMoved = false; // 重置移动标记
        
        // 获取触点位置
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        // 获取元素当前位置
        const rect = bar.getBoundingClientRect();
        const screenRect = screen.getBoundingClientRect();

        // 记录鼠标在元素内的相对偏移
        startX = clientX;
        startY = clientY;
        
        // 计算相对于父容器(.phone-screen)的初始位置
        // 注意：这里需要减去 screen 的 offset，因为 bar 是 absolute
        initialLeft = rect.left - screenRect.left;
        initialTop = rect.top - screenRect.top;

        bar.style.transition = 'none'; // 拖动时移除过渡动画，防止迟滞
    };

    // --- 移动中 ---
    const onDrag = (e) => {
        if (!isDragging) return;
        
        e.preventDefault(); // 防止滚动屏幕

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        // 计算移动距离
        const deltaX = clientX - startX;
        const deltaY = clientY - startY;

        // 如果移动距离极小（防抖），不视为移动
        if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
            hasMoved = true;
        }

        // 计算新坐标
        let newLeft = initialLeft + deltaX;
        let newTop = initialTop + deltaY;

        // === 边界限制 (不拖出手机屏幕) ===
        const barRect = bar.getBoundingClientRect();
        const screenRect = screen.getBoundingClientRect();
        
        // 左边界 & 右边界
        const minLeft = 0;
        const maxLeft = screenRect.width - barRect.width;
        
        // 上边界 & 下边界
        const minTop = 0;
        const maxTop = screenRect.height - barRect.height;

        // 限制坐标
        if (newLeft < minLeft) newLeft = minLeft;
        if (newLeft > maxLeft) newLeft = maxLeft;
        if (newTop < minTop) newTop = minTop;
        if (newTop > maxTop) newTop = maxTop;

        // 应用坐标
        bar.style.left = newLeft + 'px';
        bar.style.top = newTop + 'px';
        bar.style.right = 'auto'; // 清除 right 属性，防止冲突
    };

    // --- 结束拖拽 ---
    const endDrag = () => {
        if (!isDragging) return;
        isDragging = false;
        
        bar.style.transition = 'all 0.3s ease'; // 恢复过渡动画

        // 如果没有发生实质性移动，视为点击
        if (!hasMoved) {
            openStatusMonitorModal();
        } else {
            // 可选：拖动结束后自动吸附到左右边缘 (类似 iPhone)
            // snapToEdge(); 
        }
    };

    // 绑定事件
    bar.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', endDrag);

    bar.addEventListener('touchstart', startDrag, { passive: false });
    document.addEventListener('touchmove', onDrag, { passive: false });
    document.addEventListener('touchend', endDrag);
}

// 自动吸附边缘 (可选功能，如果你想要可以取消注释)
/*
function snapToEdge() {
    const bar = document.getElementById('statusHeartbeatBar');
    const screen = document.querySelector('.phone-screen');
    const barRect = bar.getBoundingClientRect();
    const screenRect = screen.getBoundingClientRect();
    
    // 计算当前中心点
    const currentLeft = parseFloat(bar.style.left);
    const centerX = currentLeft + barRect.width / 2;
    const screenCenterX = screenRect.width / 2;
    
    // 判断靠左还是靠右
    if (centerX < screenCenterX) {
        bar.style.left = '10px'; // 吸附左边
    } else {
        bar.style.left = (screenRect.width - barRect.width - 10) + 'px'; // 吸附右边
    }
}
*/

// 在初始化时启动拖拽监听
document.addEventListener('DOMContentLoaded', () => {
    initDraggableHeartbeat();
});
// ============ 保存用户侧写分析数据 ============
function saveUserProfileAnalysis(analysisData) {
    if (!currentChatId || !analysisData) return;
    
    loadFromDB('characterInfo', (data) => {
        const allData = data || {};
        if (!allData[currentChatId]) allData[currentChatId] = {};
        
        // 初始化 userProfile 结构
        if (!allData[currentChatId].userProfile) {
            allData[currentChatId].userProfile = {
                tags: [],
                emotionHistory: [],
                flashbulbMemories: []
            };
        }
        
        const profile = allData[currentChatId].userProfile;
        
        // 1. 保存情绪记录
        if (analysisData.emotion_score !== undefined) {
            profile.currentEmotion = {
                score: analysisData.emotion_score,
                sticker: analysisData.emotion_sticker || 'sunny',
                time: getCurrentTime()
            };
            // 保留最近20条情绪历史
            profile.emotionHistory.unshift(profile.currentEmotion);
            if (profile.emotionHistory.length > 20) {
                profile.emotionHistory = profile.emotionHistory.slice(0, 20);
            }
        }
        
        // 2. 保存新标签（去重）
        if (analysisData.new_tags && analysisData.new_tags.length > 0) {
            analysisData.new_tags.forEach(tag => {
                if (!profile.tags.includes(tag)) {
                    profile.tags.unshift(tag); // 新标签放前面
                }
            });
            // 限制最多保留20个标签
            if (profile.tags.length > 20) {
                profile.tags = profile.tags.slice(0, 20);
            }
        }
        
        // 3. 保存闪光时刻
        if (analysisData.flashbulb_memory) {
            const memory = {
                ...analysisData.flashbulb_memory,
                date: new Date().toISOString().split('T')[0],
                id: Date.now()
            };
            profile.flashbulbMemories.unshift(memory);
            // 限制最多保留15个闪光时刻
            if (profile.flashbulbMemories.length > 15) {
                profile.flashbulbMemories = profile.flashbulbMemories.slice(0, 15);
            }
        }
        
        // 保存到数据库
        allData[currentChatId].userProfile = profile;
        saveToDB('characterInfo', allData);
        
        console.log('✅ 用户侧写已保存:', profile);
    });
}
// ============ 渲染用户侧写数据 ============
function renderUserProfile() {
    if (!currentChatId) return;
    
    loadFromDB('characterInfo', (data) => {
        const charData = data && data[currentChatId] ? data[currentChatId] : {};
        const profile = charData.userProfile || {
            tags: [],
            emotionHistory: [],
            flashbulbMemories: [],
            currentEmotion: null
        };
        
        // 1. 渲染情绪贴纸
        renderEmotionSticker(profile.currentEmotion);
        
        // 2. 渲染印象标签
        renderUserTags(profile.tags);
        
        // 3. 渲染闪光时刻
        renderFlashbulbMemories(profile.flashbulbMemories);
    });
}

// 渲染情绪贴纸 (适配新版)
function renderEmotionSticker(emotion) {
    const stickerEl = document.getElementById('currentEmotionSticker');
    const labelEl = document.getElementById('currentEmotionLabel');
    const commentEl = document.getElementById('emotionCommentText'); // 新增
    const timeEl = document.getElementById('emotionUpdateTime');
    
    if (!stickerEl) return;
    
    // 贴纸映射 (保持不变)
    const stickerMap = {
        sunny: { emoji: '☀️', label: '阳光明媚', class: 'sunny' },
        cloudy: { emoji: '☁️', label: '有点迷茫', class: 'cloudy' },
        rainy: { emoji: '🌧️', label: '心情低落', class: 'rainy' },
        stormy: { emoji: '⛈️', label: '情绪激动', class: 'stormy' },
        starry: { emoji: '✨', label: '满怀期待', class: 'starry' },
        coffee: { emoji: '☕', label: '需要休息', class: 'coffee' }
    };
    
    if (!emotion) {
        stickerEl.textContent = '❓';
        stickerEl.className = 'emotion-sticker';
        labelEl.textContent = '等待记录...';
        if (commentEl) commentEl.textContent = '（暂无记录）';
        timeEl.textContent = '--';
        return;
    }
    
    const sticker = stickerMap[emotion.sticker] || stickerMap.sunny;
    
    stickerEl.textContent = sticker.emoji;
    stickerEl.className = `emotion-sticker ${sticker.class}`;
    labelEl.textContent = emotion.label || sticker.label;
    
    // 显示心里话
    if (commentEl) {
        commentEl.textContent = emotion.comment || '（他在观察你...）';
    }
    
    if (emotion.time) {
        timeEl.textContent = emotion.time;
    }
}


// 渲染印象标签 (支持点击看理由)
function renderUserTags(tags) {
    const container = document.getElementById('tagsContainer');
    const countEl = document.getElementById('tagsCount');
    
    if (!container) return;
    
    if (countEl) countEl.textContent = `${tags.length} 个标签`;
    
    if (!tags || tags.length === 0) {
        container.innerHTML = '<div class="empty-tags-hint">还没有印象标签，多聊聊天吧~</div>';
        return;
    }
    
    container.innerHTML = tags.map((tag, index) => {
        // 兼容旧数据 (旧数据是字符串，新数据是对象)
        const text = typeof tag === 'string' ? tag : tag.text;
        const reason = typeof tag === 'string' ? '（这是早期的印象，没有记录理由~）' : (tag.reason || '无理由');
        
        // 把理由编码存到 dataset 里，点击时读取
        return `
        <div class="user-tag ${index < 3 ? 'new-tag' : ''}" onclick="alert('🏷️ ${text}\\n\\n💬 他的理由：\\n${reason}')">
            ${text}
        </div>
    `}).join('');
}

// 渲染闪光时刻 (拍立得版)
function renderFlashbulbMemories(memories) {
    const container = document.getElementById('flashbulbContainer');
    const countEl = document.getElementById('flashbulbCount');
    
    if (!container) return;
    
    if (countEl) {
        countEl.textContent = `${memories.length} 个瞬间`;
    }
    
    if (!memories || memories.length === 0) {
        container.innerHTML = '<div class="empty-flashbulb-hint">重要时刻会被记录在这里~</div>';
        return;
    }
    
    container.innerHTML = memories.map(memory => `
        <div class="polaroid-card" onclick="viewFlashbulbDetail(${memory.id})">
            <div class="polaroid-photo-area">
                ${memory.content}
            </div>
            <div class="polaroid-title">${memory.title}</div>
            <div class="polaroid-date">${memory.date}</div>
        </div>
    `).join('');
}

// 查看闪光时刻详情（可选，点击卡片时触发）
function viewFlashbulbDetail(memoryId) {
    // 暂时用 alert 展示，后续可以改成弹窗
    loadFromDB('characterInfo', (data) => {
        const charData = data && data[currentChatId] ? data[currentChatId] : {};
        const profile = charData.userProfile || {};
        const memory = (profile.flashbulbMemories || []).find(m => m.id === memoryId);
        
        if (memory) {
            alert(`📸 ${memory.title}\n\n📅 ${memory.date}\n\n${memory.content}\n\n💬 "${memory.comment}"`);
        }
    });
}
// ============ 🤖 自动总结记忆功能（后台定时器版） ============

let autoSummaryTimer = null; // 定时器句柄

/**
 * 启动自动总结定时器
 * 每60秒检查一次是否需要总结
 */
function startAutoSummaryTimer() {
    // 防止重复启动
    if (autoSummaryTimer) {
        clearInterval(autoSummaryTimer);
    }
    
    // 立即检查一次
    checkAllChatsForAutoSummary();
    
    // 每60秒检查一次
    autoSummaryTimer = setInterval(() => {
        checkAllChatsForAutoSummary();
    }, 60 * 1000);
    
    console.log('[自动总结] 定时器已启动，每60秒检查一次');
}

/**
 * 检查所有聊天是否需要自动总结
 */
async function checkAllChatsForAutoSummary() {
    // 获取所有聊天
    const allChats = chats || [];
    if (allChats.length === 0) return;
    
    // 获取角色设置
    loadFromDB('characterInfo', async (charInfoData) => {
        const allCharInfo = charInfoData || {};
        
        // 获取所有消息
        loadFromDB('messages', async (msgData) => {
            const allMsgList = msgData && msgData.list ? msgData.list : [];
            
            // 遍历每个聊天
            for (const chat of allChats) {
                const charInfo = allCharInfo[chat.id] || {};
                
                // 检查是否开启了自动总结
                if (!charInfo.autoSummaryEnabled) continue;
                
                const threshold = charInfo.autoSummaryThreshold || 50;
                const lastSummaryMsgId = charInfo.lastAutoSummaryMsgId || 0;
                
                // 筛选该聊天的消息
                const chatMsgs = allMsgList.filter(m => m.chatId === chat.id);
                
                // 筛选未总结的消息
                const unsummarizedMsgs = chatMsgs.filter(m => m.id > lastSummaryMsgId);
                
                // 计算轮数（一轮 = 用户发一条 + AI回一条 ≈ 2条消息）
                const unsummarizedRounds = Math.floor(unsummarizedMsgs.length / 2);
                
                // 达到阈值则触发总结
                if (unsummarizedRounds >= threshold) {
                    console.log(`[自动总结] 聊天「${chat.name}」达到阈值(${unsummarizedRounds}/${threshold})，开始总结...`);
                    await executeAutoSummary(chat, unsummarizedMsgs, charInfo);
                }
            }
        });
    });
}

/**
 * 执行自动总结
 */
async function executeAutoSummary(chat, messages, charInfo) {
    // 检查API配置
    if (!currentApiConfig.baseUrl || !currentApiConfig.apiKey) {
        console.warn('[自动总结] API未配置，跳过');
        return;
    }
    
    // 准备聊天记录文本（只取文本消息）
    const chatHistory = messages
        .filter(m => m.type === 'text' || !m.type) // 兼容旧数据
        .filter(m => m.content && !m.isRevoked)
        .map(m => {
            const sender = m.senderId === 'me' ? '我' : chat.name;
            // 截断过长的单条消息
            const content = m.content.length > 100 ? m.content.substring(0, 100) + '...' : m.content;
            return `${sender}: ${content}`;
        })
        .join('\n');
    
    if (!chatHistory || chatHistory.length < 100) {
        console.log('[自动总结] 有效内容太少，跳过');
        // 仍然更新锚点，防止反复检查
        updateAutoSummaryAnchor(chat.id, messages);
        return;
    }
    
    // 获取时间范围
    const firstMsg = messages[0];
    const lastMsg = messages[messages.length - 1];
    const dateRange = getDateRange(firstMsg.time, lastMsg.time);
    
    // 构建Prompt
    const prompt = `请用简洁的语言概括以下聊天记录的主要内容，像写日记摘要一样。

【要求】
1. 字数控制在100字以内
2. 用第一人称"我们"或客观描述
3. 概括聊了什么话题、发生了什么事、有什么重要约定
4. 语气自然，像朋友间的回忆记录
5. 不要分点，写成一段话

【聊天记录】
${chatHistory.substring(0, 4000)}

【输出示例】
这几天主要聊了工作上的事情，他最近加班比较多，我安慰了他。还讨论了周末去哪玩，最后决定一起去看电影。他推荐了一部悬疑片，说很好看。`;

    try {
        const url = currentApiConfig.baseUrl.endsWith('/') 
            ? currentApiConfig.baseUrl + 'chat/completions'
            : currentApiConfig.baseUrl + '/chat/completions';
            
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentApiConfig.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: currentApiConfig.defaultModel || 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7
            })
        });
        
        if (!response.ok) {
            console.error('[自动总结] API请求失败:', response.status);
            return;
        }
        
        const data = await response.json();
        let summary = data.choices[0].message.content.trim();
        
        // 清理可能的引号
        summary = summary.replace(/^["「『]|["」』]$/g, '');
        
        // 限制长度
        if (summary.length > 150) {
            summary = summary.substring(0, 147) + '...';
        }
        
        // 保存到时光相册
        await saveAutoSummaryToTimeline(chat.id, summary, dateRange);
        
        console.log(`[自动总结] 「${chat.name}」总结完成: ${summary.substring(0, 30)}...`);
        
    } catch (error) {
        console.error('[自动总结] 生成失败:', error);
    }
    
    // 更新锚点
    updateAutoSummaryAnchor(chat.id, messages);
}

/**
 * 获取日期范围字符串
 */
function getDateRange(startTime, endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    const formatDate = (d) => `${d.getMonth() + 1}月${d.getDate()}日`;
    
    if (start.toDateString() === end.toDateString()) {
        // 同一天
        return formatDate(end);
    } else {
        // 跨天
        return `${formatDate(start)} - ${formatDate(end)}`;
    }
}

/**
 * 保存总结到时光相册
 */
function saveAutoSummaryToTimeline(chatId, summary, dateRange) {
    return new Promise((resolve) => {
        loadFromDB('memories', (data) => {
            let allMemories = Array.isArray(data) ? data : (data && data.list ? data.list : []);
            
            // 生成唯一ID
            const newId = Date.now() + Math.floor(Math.random() * 1000);
            
            // 创建新记忆
            const newMemory = {
                id: newId,
                chatId: chatId,
                type: 'moment',
                content: summary,
                happenTime: dateRange,
                createTime: new Date().toISOString(),
                isAutoGenerated: true
            };
            
            allMemories.push(newMemory);
            
            saveToDB('memories', { list: allMemories });
            
            console.log(`[自动总结] 已保存到时光相册: ${dateRange}`);
            resolve();
        });
    });
}

/**
 * 更新自动总结的消息ID锚点
 */
function updateAutoSummaryAnchor(chatId, messages) {
    if (!messages || messages.length === 0) return;
    
    const latestMsgId = messages[messages.length - 1].id;
    
    loadFromDB('characterInfo', (data) => {
        const allData = data || {};
        if (!allData[chatId]) allData[chatId] = {};
        
        allData[chatId].lastAutoSummaryMsgId = latestMsgId;
        
        saveToDB('characterInfo', allData);
    });
}

// ============ 在数据库初始化完成后启动定时器 ============
// ============ 解析日程字符串 ============
function parseSchedule(scheduleStr) {
    if (!scheduleStr || scheduleStr === '无' || scheduleStr === '--') {
        return null; // 返回null表示不更新，保留旧数据
    }
    
    const items = scheduleStr.split(/[;；]/).filter(s => s.trim());
    const schedule = [];
    
    items.forEach(item => {
        // 支持格式：09:00-起床-completed 或 09:00-起床洗漱-completed
        const parts = item.split(/[-–—]/).map(s => s.trim());
        if (parts.length >= 2) {
            const time = parts[0];
            const task = parts[1];
            let status = 'upcoming';
            
            if (parts.length >= 3) {
                const statusStr = parts[2].toLowerCase();
                if (statusStr.includes('complet') || statusStr.includes('done') || statusStr.includes('完成')) {
                    status = 'completed';
                } else if (statusStr.includes('current') || statusStr.includes('进行') || statusStr.includes('ing')) {
                    status = 'current';
                }
            }
            
            schedule.push({ time, task, status });
        }
    });
    
    return schedule.length > 0 ? schedule : null;
}


// 初始化，
        initDB();
