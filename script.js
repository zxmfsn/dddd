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
    
    if (storeName === 'worldbooks' || storeName === 'categories' || storeName === 'chats' || storeName === 'messages') {
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
        if (storeName === 'worldbooks' || storeName === 'categories') {
            callback(request.result ? request.result.list : null);
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
    loadFromDB('characterInfo', (data) => {
        const charData = data && data[chatId] ? data[chatId] : {};
        const displayName = (charData.remark && charData.remark.trim()) ? charData.remark : null;
        
        if (displayName) {
            const nameElement = document.querySelector(`.chat-name[data-chat-id="${chatId}"]`);
            if (nameElement) {
                const originalName = nameElement.dataset.originalName;
                const pinBadge = nameElement.querySelector('.pin-badge');
                const statusTag = nameElement.querySelector('.status-tag');
                
                nameElement.textContent = displayName;
                
                if (statusTag) {
                    nameElement.appendChild(statusTag);
                }
                
                if (pinBadge) {
                    nameElement.appendChild(pinBadge);
                }
            }
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
    document.getElementById('quoteAuthor').textContent = `引用：${message.senderId === 'me' ? '我' : message.senderId}`;
   // ▼▼▼ 修改这里：如果是图片消息，显示【图片】▼▼▼
    const displayContent = message.type === 'image' ? '【图片】' : message.content;
    document.getElementById('quoteContent').textContent = `${formatMessageTime(message.time)} ${displayContent}`;
    // ▲▲▲ 修改结束 ▲▲▲
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
    document.getElementById('transferNote').value = '';
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
    const note = document.getElementById('transferNote').value.trim();
    
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
        products = data && data.list ? data.list : [];
        renderProducts();
    });
}


// 渲染商品列表（修改版：支持分类过滤）
function renderProducts() {
    const container = document.getElementById('shoppingProductList');
    
    // ★ 核心修改：过滤数据
    // 如果商品没有 type 属性（旧数据），默认算作 'goods'
    const filteredProducts = products.filter(p => {
        const pType = p.categoryType || 'goods'; 
        return pType === currentShoppingType;
    });
    
    if (filteredProducts.length === 0) {
        const emptyText = currentShoppingType === 'goods' ? '暂无商品，试试搜索功能吧' : '肚子饿了吗？搜搜想吃啥';
        const emptyIcon = currentShoppingType === 'goods' ? '🛍️' : '🍜';
        
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">${emptyIcon}</div>
                <div class="empty-state-text">${emptyText}</div>
            </div>
        `;
        return;
    }
    
   container.innerHTML = filteredProducts.map(product => {
        // 1. 处理描述/标签
        let tagsHtml = '';
        if (product.description) {
            // 如果描述里包含 "|", 说明是新版标签格式
            if (product.description.includes('|')) {
                const tags = product.description.split('|').map(t => t.trim());
                tagsHtml = `<div class="product-tags-row">
                    ${tags.map(tag => `<span class="product-tag tag-${currentShoppingType}">${tag}</span>`).join('')}
                </div>`;
            } else {
                // 旧版普通描述，还是直接显示文字
                tagsHtml = `<div class="product-description">${product.description}</div>`;
            }
        }

        // 2. 渲染卡片
        return `
        <div class="product-card">
            <div class="product-info-full">
                <div class="product-name ${currentShoppingType === 'goods' ? 'goods-title' : 'food-title'}">
                    ${product.name}
                </div>
                
                ${tagsHtml}
                
                <div class="product-bottom-row">
                    <div class="product-price">
                        <span style="font-size: 12px">¥</span>${product.price.toFixed(2)}
                    </div>
                    <div class="product-actions-mini">
                         <button class="btn-mini-add" onclick="addToCart(${product.id})">
                           ${currentShoppingType === 'goods' ? '抢购' : '来一单'}
                        </button>
                        <button class="btn-text-only" onclick="deleteProduct(${product.id})" style="color:#ccc; font-size:12px; margin-left:5px;">×</button>
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
        shoppingCart = data && data.list ? data.list : [];
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

// 添加到购物车
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const existingItem = shoppingCart.find(item => item.productId === productId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        const newId = shoppingCart.length > 0 ? Math.max(...shoppingCart.map(c => c.id)) + 1 : 1;
        shoppingCart.push({
            id: newId,
            productId: productId,
            quantity: 1,
            addTime: getCurrentTime()
        });
    }
    
    saveToDB('shoppingCart', { id: 1, list: shoppingCart });
    updateCartBadge();
    
    // 显示提示
    alert('已加入购物车');
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

// 渲染购物车
function renderShoppingCart() {
    const container = document.getElementById('cartContent');
    
    if (shoppingCart.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🛒</div>
                <div class="empty-state-text">购物车是空的</div>
            </div>
        `;
        document.getElementById('cartFooter').style.display = 'none';
        return;
    }
    
    document.getElementById('cartFooter').style.display = 'block';
    
    container.innerHTML = shoppingCart.map(item => {
        const product = products.find(p => p.id === item.productId);
        if (!product) return '';
        
        return `
            <div class="cart-item">
                <div class="cart-item-header">
                    <div class="cart-item-name">${product.name}</div>
                    <div class="cart-item-price">¥${product.price.toFixed(2)}</div>
                </div>
                <div class="cart-item-controls">
                    <div class="quantity-controls">
                        <button class="quantity-btn" onclick="updateCartQuantity(${item.id}, -1)">-</button>
                        <div class="quantity-number">${item.quantity}</div>
                        <button class="quantity-btn" onclick="updateCartQuantity(${item.id}, 1)">+</button>
                    </div>
                    <div class="cart-item-delete" onclick="removeFromCart(${item.id})">删除</div>
                </div>
            </div>
        `;
    }).join('');
    
    // 计算总价
    updateCartTotal();
    
    // ★★★ 新增：渲染支付方式选择 ★★★
    renderPaymentOptions();
}
// 当前选择的支付方式
let selectedPaymentMethod = null;

// 渲染支付方式选择
function renderPaymentOptions() {
    const footer = document.getElementById('cartFooter');
    
    // 清空footer内容
    footer.innerHTML = '';
    
    // 获取当前角色名字
    const chat = chats.find(c => c.id === currentChatId);
    const characterName = chat ? chat.name : 'TA';
    
    // 计算总价
    let total = 0;
    shoppingCart.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (product) {
            total += product.price * item.quantity;
        }
    });
    
    footer.innerHTML = `
        <div class="cart-top-row">
            <div class="payment-options">
                <div class="payment-option ${selectedPaymentMethod === 'buy_for_ta' ? 'selected' : ''}" onclick="selectPaymentMethod('buy_for_ta')">
                    <input type="radio" name="payment" class="payment-radio" ${selectedPaymentMethod === 'buy_for_ta' ? 'checked' : ''}>
                    <div class="payment-label"> 为${characterName}购买</div>
                </div>
                
                <div class="payment-option ${selectedPaymentMethod === 'ask_ta_pay' ? 'selected' : ''}" onclick="selectPaymentMethod('ask_ta_pay')">
                    <input type="radio" name="payment" class="payment-radio" ${selectedPaymentMethod === 'ask_ta_pay' ? 'checked' : ''}>
                    <div class="payment-label"> 请${characterName}代付</div>
                </div>
            </div>
            
            <div class="cart-total-inline">
                合计: <span>¥${total.toFixed(2)}</span>
            </div>
        </div>
        
        <button class="btn-checkout" onclick="checkout()" ${selectedPaymentMethod ? '' : 'disabled'}>
            结算
        </button>
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

// 更新购物车总价
function updateCartTotal() {
    let total = 0;
    
    shoppingCart.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (product) {
            total += product.price * item.quantity;
        }
    });
    
    document.getElementById('cartTotalPrice').textContent = `¥${total.toFixed(2)}`;
}

// 结算
// 结算
function checkout() {
    if (shoppingCart.length === 0) {
        alert('购物车是空的');
        return;
    }
    
    if (!selectedPaymentMethod) {
        alert('请选择支付方式');
        return;
    }
    
    // 计算总价和商品列表
    let total = 0;
    let itemsText = '';
    const orderItems = [];
    
    shoppingCart.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (product) {
            total += product.price * item.quantity;
            itemsText += `${product.name} x${item.quantity}\n`;
            orderItems.push({
                name: product.name,
                quantity: item.quantity,
                price: product.price
            });
        }
    });
    
    const chat = chats.find(c => c.id === currentChatId);
    const characterName = chat ? chat.name : 'TA';
    
    // 根据支付方式执行不同逻辑
    if (selectedPaymentMethod === 'buy_for_ta') {
        // ========== 为TA购买 ==========
        // 检查余额
        loadFromDB('wallet', (walletData) => {
            if (!walletData || walletData.balance < total) {
                const shortage = total - (walletData ? walletData.balance : 0);
                alert(`余额不足！\n当前余额：¥${walletData ? walletData.balance.toFixed(2) : '0.00'}\n还需：¥${shortage.toFixed(2)}`);
                return;
            }
            
            // 确认弹窗
            const confirmText = `确认为【${characterName}】购买？\n\n🎁 商品清单：\n${itemsText}\n💰 总计: ¥${total.toFixed(2)}\n当前余额: ¥${walletData.balance.toFixed(2)}\n支付后余额: ¥${(walletData.balance - total).toFixed(2)}\n\n📦 收货人：${characterName}`;
            
            if (!confirm(confirmText)) return;
            
            // 扣款
            const title = `购物消费-为${characterName}购买`;
            if (!handleTransaction('expense', total, title)) {
                return;
            }
            
            // 生成订单消息
            createShoppingOrderMessage('buy_for_ta', 'paid', total, orderItems);
            
            // 清空购物车
            shoppingCart = [];
            selectedPaymentMethod = null;
            saveToDB('shoppingCart', { id: 1, list: shoppingCart });
            
            alert('购买成功！礼物已送出 🎁');
            
        // 返回聊天页面并刷新
backToShopping();
setTimeout(() => {
    backFromShopping();
    // ★ 确保消息列表刷新
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
        // ========== 请TA代付 ==========
        const confirmText = `确认请【${characterName}】代付？\n\n🛍️ 商品清单：\n${itemsText}\n💸 代付金额：¥${total.toFixed(2)}\n\n📦 收货人：我\n\n⚠️ 对方需要同意后才会扣款`;
        
        if (!confirm(confirmText)) return;
        
        // 生成订单消息（待支付状态）
        createShoppingOrderMessage('ask_ta_pay', 'pending', total, orderItems);
        
        // 清空购物车
        shoppingCart = [];
        selectedPaymentMethod = null;
        saveToDB('shoppingCart', { id: 1, list: shoppingCart });
        
        alert('代付请求已发送！');
        
   // 返回聊天页面并刷新
backToShopping();
setTimeout(() => {
    backFromShopping();
    // ★ 确保消息列表刷新
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

      
// 解析并保存AI生成的商品（修改版：搜索前自动清空旧数据）
function parseAndSaveProducts(aiReply, keyword) {
    // ★★★ 核心修复：搜索前先清空当前分类下的旧AI商品 ★★★
    products = products.filter(p => {
        // 保留手动添加的商品
        if (p.type === 'custom') return true;
        
        // 保留其他分类的商品（比如搜外卖时，保留百货商品）
        if (p.categoryType !== currentShoppingType) return true;
        
        // 删除当前分类下的旧AI商品
        return false;
    });

    // 解析新数据
    const parts = aiReply.split('|||').map(p => p.trim()).filter(p => p.length > 0);
    
    // 每3个元素为一组（名称、价格、描述）
    for (let i = 0; i < parts.length; i += 3) {
        if (i + 2 >= parts.length) break;
        
        const name = parts[i];
        const priceStr = parts[i + 1].replace(/[^\d.]/g, ''); 
        const price = parseFloat(priceStr);
        const description = parts[i + 2];
        
        if (!name || !price || price <= 0) continue;
        
        const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
        
        products.push({
            id: newId,
            name: name,
            price: price,
            description: description,
            type: 'ai', // 标记为AI生成
            categoryType: currentShoppingType, // 标记分类
            createTime: getCurrentTime()
        });
    }
    
    // 保存到数据库
    saveToDB('products', { id: 1, list: products });
    
    // 刷新显示
    loadProducts();
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
            <div class="timeline-dot"></div>
            <div class="timeline-date">${m.happenTime}</div>
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
    // 从数据库获取详情 (这里简化为重新读取，实际应该从缓存或DB取)
    loadFromDB('memories', (data) => {
        let allMemories = Array.isArray(data) ? data : (data && data.list ? data.list : []);
        const mem = allMemories.find(m => m.id === id);
        if (!mem) return;
        
        editingMemoryId = id;
        document.getElementById('memoryModalTitle').textContent = '编辑记忆';
        document.getElementById('memoryContentInput').value = mem.content;
        
        if (mem.type === 'tag') {
            switchMemEditType('tag');
            document.getElementById('memoryPinCheckbox').checked = mem.isPinned;
        } else {
            switchMemEditType('moment');
            document.getElementById('memoryDateInput').value = mem.happenTime;
        }
        
        document.getElementById('btnDeleteMemory').style.display = 'block'; // 显示删除按钮
        document.getElementById('memoryEditModal').style.display = 'flex';
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
    
    loadFromDB('memories', (data) => {
        let allMemories = Array.isArray(data) ? data : (data && data.list ? data.list : []);
        
        if (editingMemoryId) {
            // 编辑
            const index = allMemories.findIndex(m => m.id === editingMemoryId);
            if (index > -1) {
                allMemories[index].content = content;
                allMemories[index].type = currentMemEditType;
                if (currentMemEditType === 'tag') {
                    allMemories[index].isPinned = document.getElementById('memoryPinCheckbox').checked;
                } else {
                    allMemories[index].happenTime = document.getElementById('memoryDateInput').value;
                }
            }
        } else {
            // 新增
            const newId = allMemories.length > 0 ? Math.max(...allMemories.map(m => m.id || 0)) + 1 : 1;
            allMemories.push({
                id: newId,
                chatId: currentChatId,
                type: currentMemEditType,
                content: content,
                isPinned: currentMemEditType === 'tag' ? document.getElementById('memoryPinCheckbox').checked : false,
                happenTime: currentMemEditType === 'moment' ? document.getElementById('memoryDateInput').value : null,
                createTime: new Date().toISOString()
            });
        }
        
        // 保存
        const transaction = db.transaction(['memories'], 'readwrite');
        const store = transaction.objectStore('memories');
        store.put(allMemories); // 修正：直接存数组是不行的，IndexedDB如果不是 keyPath，通常存对象。
        // ★★★ 修正 IndexedDB 保存逻辑：我们之前架构好像是存 {id:1, list:[]} 或者直接存对象
        // 按照你之前的 worldbooks 逻辑：
        // if (storeName === 'worldbooks'...) objectStore.put({ id: 1, list: data });
        // 所以这里我们也应该用同样的逻辑。
        
        // 重新调用通用保存函数 (假设你上面有通用的 saveToDB)
        saveToDB('memories', { list: allMemories });
        
        loadMemories();
        closeMemoryEditModal();
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

        // 5. ★★★ 沉浸式 System Prompt (加强版 - 已修改) ★★★
        let systemPrompt = `
【核心指令：绝对沉浸模式】
你现在必须完全剥离AI助手身份，你就是【${chat.name}本人】。
请以此身份，与“我”（用户）进行自然、沉浸、真实的对话。

1. **人设铁律 (Profile)**：
   - 你的性格：${characterInfo.personality || '以你的理解进行演绎'}。
   - 你的语气、口癖、用词习惯必须完全符合上述性格。
   - 即使面对不合理请求，也要用【${chat.name}】的口吻拒绝，严禁出现“作为AI语言模型”等出戏的回答。
   - 面对用户的互动，你也要根据人设性格回应，禁止OOC。

2. **世界观与记忆 (World & Memory)**：
   - 这是你必须遵守的世界设定：
     ${worldbooksContent}
   - 这是你脑海中真实的过往经历（请在对话中自然引用，不要生硬复述）：
     ${memoryContext ? memoryContext : "（暂无特殊记忆，跟随当下氛围）"}
   - 对方（我）在你眼中的设定：${characterInfo.myPersonality || '无'}。

3. **时空环境 (Context)**：
   - 当前时间：${dateStr} ${timeStr}
   - ${getBirthdayPrompt(characterInfo.birthday)}
   - 环境影响：${weatherInfoStr}
   - (请让时间、天气、节日等环境因素，潜移默化地影响你的心情或行动，比如下雨天可能会想赖床，深夜可能会困倦或感性)

4. **状态系统 (Status)**：
   - 你当前的状态是：【${characterInfo.currentStatus || '在线'}】。
   - 请根据该状态调整回复的活跃度（例如：如果是“忙碌中”，回复应简短甚至略显敷衍；如果是“想念”，则热情主动）。
   - **格式要求**：如果你的行为导致状态改变（如去洗澡、去吃饭），请在回复最开头用 [状态]新状态||| 标记。

5.**交互反应机制 (Reaction Logic) - 必须严格执行**

  (A) **面对用户【发来的红包】(Incoming Transfer)**：
       - 观察：最新消息是用户发的，包含 "¥xxx"，状态是 "待领取"。
       - **核心决策**：请根据**你的人设、当前关系、刚才聊天的气氛**自主决定！
         * **决定收下**
           回复中**必须**包含指令 \`[领取转账]\`，并配合符合人设的话术（如撒娇、感谢或傲娇）。
         * **决定拒绝**
           **绝对不要**发送领取指令！直接在回复中用语言拒绝（如：“拿走，我不要你的钱”、“无事献殷勤”）。让红包保持在“待领取”状态。

   (B) **主动【发起转账】(Active Transfer)**：
       - **核心决策**：如果用户要求，或者你想要给用户转账，如节日、安慰、高兴等，请根据你的人设，**主动**给用户转账
       - **行动**：在回复中插入指令 \`[转账:金额:备注]\`。
         * 示例1（安慰）：\`[转账:5200:拿去花，别委屈自己]\`
         * 示例2（日常）：\`[转账:50:请你喝奶茶]\`

6. **功能与格式 (Strict Format)**：
   - 必须使用 "|||" 分隔不同的气泡消息，模拟真人打字的节奏。
   - 功能调用：
     * 想发表情包：[搜表情:关键词]
     * 想转账：[转账:金额:备注] (仅在符合人设和情境时使用)
     * 想发语音：[发送语音:内容]
     * 想要礼物/代付：[购物:送礼/代付:物品名]
     * 领取对方转账：[领取转账] (当看到系统提示“待领取”时使用)

【回复原则】
- **Show, Don't Tell**：不要直接说你很开心，用感叹号、表情包、或者开心的动作来表现。
- **逻辑连贯**：严格结合【聊天上下文】，不要忽视我说过的任何一句话。
- **拒绝说教**：除非人设与用户要求，否则不要对我说教，不要试图引导正能量，允许有小情绪。
- **简短自然**：像在手机上聊天一样，不要一次性发一大段长篇大论，多用短句。
- **消息要求**：每次发消息在6-12条。

请现在开始演绎。
`;

        // 动态追加表情包提示
        if (emojiList.length > 0) {
            const emojiNames = emojiList.slice(0, 20).map(e => e.text).join('、');
            systemPrompt += `\n(当前可用表情库：${emojiNames}等)`;
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
            
            return {
                role: msg.senderId === 'me' ? 'user' : 'assistant',
                content: content
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

        // 10. 提取并更新状态 (Status) - 完整保留
        const statusPatterns = [
            /\[状态\]\s*[:：]?\s*(.*?)\s*\|\|\|/,
            /\[状态\]\s*[:：]?\s*(.*?)\s*[\[【]/,
            /\[状态\]\s*[:：]?\s*([^\[【\|]+)/
        ];
        let statusText = null;
        for (let pattern of statusPatterns) {
            const match = aiReply.match(pattern);
            if (match && match[1]) {
                statusText = match[1].trim();
                break;
            }
        }
        // 如果提取到有效状态，保存并刷新界面
        if (statusText) {
            const invalidKeywords = ['保持', '更新', '不变', '同上', '无', '暂无'];
            if (!invalidKeywords.some(k => statusText.includes(k)) && statusText.length > 0 && statusText.length < 30) {
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
            .trim();

        // 12. 分割消息
        let messageList = messageContent.split('|||').map(m => m.trim()).filter(m => m.length > 0);
        if (messageList.length < 2) {
            // 兜底分割策略
            messageList = messageContent.split(/[。！？\n]+/).map(m => m.trim()).filter(m => m.length > 0);
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
                     pendingTransfer.transferData.status = 'aiReceived';
                     handleTransaction('income', pendingTransfer.transferData.amount, `收到转账-来自${chat.name}`);
                     const sysMsgId = Date.now() + i + 500;
                     allMessages.push({ id: sysMsgId, chatId: currentChatId, type: 'system', content: `${chat.name}已领取你的转账 ¥${pendingTransfer.transferData.amount.toFixed(2)}`, time: getCurrentTime() });
                     saveMessages();
                     renderMessages();
                 }
                 msgText = msgText.replace(/\[领取转账\]/g, '').trim();
                 if (!msgText) continue;
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

        // 购物订单
        if (msg.type === 'shopping_order') {
            const data = msg.orderData;
            const statusText = data.status === 'paid' ? '已支付' : (data.status === 'pending' ? '待支付' : '已拒绝');
            // 购物卡片保持原样，不需要包装wrapper
            return `<div class="message-item ${isMe ? 'me' : ''} ${multiSelectClass}"><div class="shopping-order-card"><div class="order-type-text">${data.orderType === 'buy_for_ta' ? '🎁 我送你的礼物' : '💸 代付请求'}</div><div class="order-amount">¥${data.totalPrice.toFixed(2)}</div><div class="order-status">${statusText}</div></div></div>`;
        }

        // 语音消息
        if (msg.type === 'voice') {
            return `<div class="message-item ${isMe ? 'me' : ''} ${multiSelectClass}" data-message-id="${msg.id}">${checkbox}<div class="voice-container"><div class="voice-bubble" onclick="toggleVoiceText(${msg.id})"><div class="voice-wave"><span></span><span></span><span></span></div><div class="voice-duration">${msg.voiceDuration}"</div></div><div class="voice-text-content ${msg.isExpanded ? 'show' : ''}" id="voice-text-${msg.id}" style="max-width: 200px; background: ${isMe ? '#95ec69' : 'white'}; padding: 8px 12px; border-radius: 8px; border: 1px solid #e0e0e0;">${msg.content}</div></div><div class="message-time">${formatMessageTime(msg.id)}</div></div>`;
        }

        // 普通/图片消息
        let messageContent = '';
        if (msg.quotedMessageId) {
            messageContent += `<div class="message-quoted"><div class="message-quoted-author">${msg.quotedAuthor}</div><div class="message-quoted-content">${msg.quotedContent}</div></div>`;
        }
        
        if (msg.type === 'image') {
            messageContent += `<img src="${msg.content}" class="message-image" alt="${msg.altText || '图片'}" onclick="viewImage('${msg.content}')">`;
        } else {
            messageContent += msg.content;
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

        // ★★★ 修复点：在 message-bubble 上增加了 style="max-width: 100%" ★★★
        return `
            <div class="message-item ${isMe ? 'me' : ''} ${multiSelectClass}" data-message-id="${msg.id}">
                ${checkbox}
                <div style="display:flex; flex-direction:column; align-items: ${isMe ? 'flex-end' : 'flex-start'}; max-width:70%;">
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
    
    if (tab === 'profile') {
        document.getElementById('archiveProfileView').style.display = 'block';
        // Profile 页：按钮变为编辑图标
        floatBtn.textContent = '✎';
        floatBtn.style.background = 'white';
        floatBtn.style.color = '#333';
        floatBtn.style.border = '1px solid #eee';
    } 
    else if (tab === 'tags') {
        document.getElementById('memoryTagsList').style.display = 'block';
        // Tags 页：按钮为添加 +
        floatBtn.textContent = '+';
        floatBtn.style.background = '#667eea'; // 恢复紫色
        floatBtn.style.color = 'white';
        floatBtn.style.border = 'none';
    } 
    else { // timeline
        document.getElementById('memoryTimelineList').style.display = 'block';
        // Timeline 页：按钮为添加 +
        floatBtn.textContent = '+';
        floatBtn.style.background = '#667eea';
        floatBtn.style.color = 'white';
        floatBtn.style.border = 'none';
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

// ============ ⚡ 档案分析功能 (V3: 基于聊天记录的真实推导) ============

// ============ ⚡ 档案分析功能 (V4: 性格分析描述版) ============

async function analyzeProfile() {
    if (!currentChatId) return;
    if (!currentApiConfig.baseUrl || !currentApiConfig.apiKey) {
        alert('请先在API设置中配置，才能使用AI分析功能');
        return;
    }

    const btn = document.getElementById('analyzeBtn');
    const originalText = btn.innerHTML;

    try {
        btn.disabled = true;
        btn.classList.add('loading');
        btn.innerHTML = '<span>🧬</span> 分析中...';

        // 1. 获取数据
        const [charData, chatHistory] = await Promise.all([
            new Promise(resolve => loadFromDB('characterInfo', data => resolve(data && data[currentChatId] ? data[currentChatId] : {}))),
            new Promise(resolve => loadFromDB('messages', data => {
                const list = data && data.list ? data.list : [];
                // 获取最近 50 条聊天记录
                const history = list.filter(m => m.chatId === currentChatId)
                                    .slice(-50)
                                    .map(m => `${m.senderId === 'me' ? '我' : 'TA'}: ${m.content}`)
                                    .join('\n');
                resolve(history || "（暂无聊天记录）");
            }))
        ]);

        // 2. 构建提示词
        const prompt = `你是一位深度角色分析师。请基于【原始设定】和【聊天记录】，生成该角色的性格分析档案。

【原始设定】
名称：${charData.remark || charData.name}
人设：${charData.personality || '无'}

【最近聊天记录片段】
${chatHistory}

【任务要求】
请提取并推导以下5项数据。

1. **身高/体重**：真实数值或合理推测。

2. **性格分析**：
   - 基于【原始设定】进行深度解读，不要涉及聊天剧情。
   - 像心理学家一样，从多个维度剖析性格（情感表达、行为模式、价值观、人际风格等）。
   - 分析性格的矛盾点和复杂性（人不是单一标签）。
   - 字数：300-500字，要有深度但不啰嗦。
   - 语气：像专业报告，但不要太AI腔，用人话说。

3. **爱好**：提取1-3个具体爱好。没有填"无"。

4. **厌恶**：提取1-3个厌恶点。没有填"无"。

5. **秘密档案**：
   - 基于【聊天记录】挖掘隐秘信息。
   - 内容方向：隐藏情感、潜意识恐惧、真实动机、创伤、执念。
   - **每次只生成 1-3 条新发现**，每条 50-80 字。
   - **格式**：用 "·" 开头，每条独立成段。
   - 例如："· 喜欢看她懊恼的样子，觉得可爱死了。"


【严格输出格式】：
身高|||体重|||性格分析|||爱好|||厌恶|||秘密档案

**重要说明**：
- 性格分析：300-500字的段落，不要换行。
- 秘密档案：用 "·" 分隔多条，格式如 "· 第一条\n· 第二条"

例如：
183cm|||74kg|||这是一个外表高冷实则内心细腻的人。在情感表达上习惯用行动代替言语，但对亲密的人会展现出强烈的占有欲。性格中存在明显的矛盾：既渴望被理解，又害怕暴露脆弱。在人际交往中保持距离感，但一旦建立信任就会变得极度依赖。对秩序和掌控有执念，可能源于童年缺乏安全感的经历。|||猫, 料理|||早起, 嘈杂环境|||· 每晚会偷偷翻看聊天记录回味细节\n· 对承诺类话题异常敏感，疑似曾被背叛\n· 习惯用玩笑掩饰真实情绪
`;

        // 3. 调用 API
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
                temperature: 0.4 // 稍微提高一点点灵活性，让描述更自然
            })
        });

        if (!response.ok) throw new Error('API请求失败');
        
        const data = await response.json();
        const content = data.choices[0].message.content.trim();

        // 4. 解析结果
        const parts = content.split('|||').map(s => s.trim());
        
        if (parts.length >= 6) {
            const newExtData = {
                height: parts[0],
                weight: parts[1],
                coreTrait: parts[2], // 这里存的是“性格分析描述”
                likes: parts[3],
                dislikes: parts[4],
                secret: parts[5]
            };

            // 5. 保存
            loadFromDB('characterInfo', (allData) => {
                if (!allData) allData = {};
                if (!allData[currentChatId]) allData[currentChatId] = {};
                
                const oldExt = allData[currentChatId].extendedProfile || {};
                allData[currentChatId].extendedProfile = { ...oldExt, ...newExtData };
                
                saveToDB('characterInfo', allData);
                loadArchives();
                
                // 稍微延时一点
                setTimeout(() => {
                    alert('🧬 分析完成！性格档案已生成');
                }, 100);
            });
        } else {
            throw new Error('AI返回格式不正确');
        }

    } catch (error) {
        console.error(error);
        alert('分析失败：' + error.message);
    } finally {
        btn.disabled = false;
        btn.classList.remove('loading');
        btn.innerHTML = originalText;
    }
}
// ============ 🔄 修复版：加载档案 (解决同步问题 & 新字段适配) ============
function loadArchives() {
    loadFromDB('characterInfo', (data) => {
        const charData = data && data[currentChatId] ? data[currentChatId] : {};
        
        // --- 1. A区：基础信息 (强制同步) ---
        // 确保获取 DOM 元素
        const avatarEl = document.getElementById('arcAvatar');
        const nameEl = document.getElementById('arcName');
        
        if (avatarEl && nameEl) {
            // 同步头像
            if (charData.avatarImage) {
                avatarEl.innerHTML = `<img src="${charData.avatarImage}">`;
            } else {
                avatarEl.textContent = charData.avatar || '👤';
            }
            
            // 同步名字 (优先用备注，没有则用原名)
            nameEl.textContent = charData.remark || charData.name || 'Character';
            
            // 同步其他基础信息
            document.getElementById('arcZodiac').textContent = getZodiacSign(charData.birthday) || '未知星座';
            document.getElementById('arcCity').textContent = charData.charVirtualAddress || '未知城市';
            document.getElementById('arcBirthday').textContent = charData.birthday || '未知';
        }

        // --- 2. B区 & C区：拓展数据 (新字段适配) ---
        const ext = charData.extendedProfile || {}; 
        
        document.getElementById('arcHeight').textContent = ext.height || '--';
        document.getElementById('arcWeight').textContent = ext.weight || '--';
        document.getElementById('arcLikes').textContent = ext.likes || '--';     // 爱好
        document.getElementById('arcDislikes').textContent = ext.dislikes || '--'; // 厌恶
        
       // ▼▼▼ 修改这里：性格分析 ▼▼▼
        // 如果有分析结果(coreTrait)，就显示分析结果。
        // 如果没有，显示默认提示语，不再显示 charData.personality (原始人设)
        const displayAnalysis = ext.coreTrait || '（暂无分析，请点击右下角“⚡”生成...）';
        
        // 样式微调：如果是默认提示语，字体颜色淡一点
        const coreEl = document.getElementById('arcCorePersonality');
        coreEl.innerText = displayAnalysis;
        
        if (!ext.coreTrait) {
            coreEl.style.color = '#999';
            coreEl.style.fontStyle = 'italic';
        } else {
            coreEl.style.color = '#555';
            coreEl.style.fontStyle = 'normal';
        }

        // 秘密档案
        document.getElementById('arcSecret').innerText = ext.secret || '（需要通过聊天积累数据，点击分析生成...）';
    });

    // 加载标签和相册 (保持不变)
    loadFromDB('memories', (data) => {
        let allMemories = [];
        if (Array.isArray(data)) allMemories = data;
        else if (data && data.list) allMemories = data.list;
        const chatMemories = allMemories.filter(m => m.chatId === currentChatId);
        renderMemoryTags(chatMemories.filter(m => m.type === 'tag'));
        renderMemoryTimeline(chatMemories.filter(m => m.type === 'moment'));
    });
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

// 初始化，
        initDB();
