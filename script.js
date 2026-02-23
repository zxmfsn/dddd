 // IndexedDB 操作
        let db;
        let currentWallpaper = null;
        // 日记功能相关变量
let diaries = [];
let currentViewingDiaryId = null;


// ============ 强制修复版：数据库初始化 (版本号 ) ============
function initDB() {
    // ★★★ 重点：版本号改成 34，强制触发更新！ ★★★
    const request = indexedDB.open('phoneData', 35);
    
    request.onerror = (event) => {
        console.error('数据库打开失败', event);
        // 如果打开失败，尝试提示用户
        alert('数据库打开失败。请尝试：\n1. 关闭所有其他打开了本网页的标签页\n2. 清除浏览器缓存\n3. 刷新页面');
    };
    
    request.onblocked = (event) => {
        // 当有其他标签页打开了旧版本数据库时触发
        alert('请关闭其他打开了本网页的标签页，然后刷新本页以完成更新！');
    };
    
    request.onsuccess = (event) => {
        db = event.target.result;
        console.log('数据库连接成功，版本:', db.version);
        
        // 数据库连接成功后的初始化逻辑
        initializeApp();
       
    };
    
    // ★★★ 这里是创建新表的核心逻辑 ★★★
    request.onupgradeneeded = (event) => {
        console.log('正在升级数据库...');
        db = event.target.result; 
        
        // 依次检查并创建所有表，缺哪个补哪个
        const storeNames = [
            'userInfo', 'wallpaper', 'worldbooks', 'categories', 
            'apiConfig', 'apiSchemes', 'chats', 'messages', 
            'characterInfo', 'appIcons', 'diaries', 'emojis', 
            'emojiCategories', 'callSettings', 'products', 
            'shoppingCart', 'shoppingCategories', 'wallet', 
            'gameConsole', 'widgetSettings', 'voiceConfig', 
            'fontSettings', 'notificationSound', 
          'moments', 'momentsProfile', 'chatGroups', 'momentsSettings',
           'memories', 'imageApiSettings'
        ];

        storeNames.forEach(name => {
            if (!db.objectStoreNames.contains(name)) {
                if (name === 'momentsProfile') {
                    db.createObjectStore(name, { keyPath: 'userId' });
                } else {
                    // 大部分表使用 id 自增或指定 id
                    db.createObjectStore(name, { keyPath: 'id', autoIncrement: true });
                }
            }
        });
        
        // 特殊索引处理 (如果有)
        const transaction = event.target.transaction;
        const memoriesStore = transaction.objectStore('memories');
        if (!memoriesStore.indexNames.contains('chatId')) {
            memoriesStore.createIndex('chatId', 'chatId', { unique: false });
        }
    };
}

// 提取出来的初始化逻辑，方便管理
function initializeApp() {
    // ★ 立即隐藏所有页面，显示主屏幕
    const screens = [
        'wallpaperScreen', 'worldbookScreen', 'apiScreen', 'chatScreen', 
        'chatDetailScreen', 'characterInfoScreen', 'memoryScreen', 
        'diaryScreen', 'diaryDetailScreen', 'callScreen', 'shoppingScreen', 
        'shoppingCartScreen', 'otherSettingsScreen', 'beautifySettingsScreen',
        'momentsScreen' // 确保隐藏朋友圈页面
    ];
    
    screens.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    
    document.getElementById('mainScreen').style.display = 'flex';
    
    // 加载所有数据
    loadUserInfo();
    loadWallpaper();
    loadWorldbooks();
    loadApiConfig();
    loadApiSchemes();
    loadAppIcons();
    loadWalletData();
    loadWidgetSettings();
    loadFontSettings();
    loadChats(); // 加载聊天列表
    // 旧头像迁移：后台压缩超大 base64，避免切换角色卡顿
setTimeout(() => {
    runAvatarMigrationOnce();
}, 1200);
    loadMomentsSettings();
    
    if (db.objectStoreNames.contains('memories')) {
        loadMemories();
    }
    
    setTimeout(() => {
        startAutoSummaryTimer();
    }, 2000);
}


function saveToDB(storeName, data, onComplete) {
    if (!db) {
        console.warn('数据库未连接，无法保存:', storeName);
        if (typeof onComplete === 'function') onComplete(false);
        return;
    }

    try {
        const transaction = db.transaction([storeName], 'readwrite');
        const objectStore = transaction.objectStore(storeName);
        
        if (['worldbooks', 'categories', 'chats', 'messages', 'products', 'shoppingCart', 'moments', 'chatGroups'].includes(storeName)) {
            objectStore.put({ id: 1, list: data.list || data });
        } else if (storeName === 'characterInfo') {
            const saveData = data.id ? data : { id: 1, ...data };
            objectStore.put(saveData);
        } else if (storeName === 'momentsProfile') {
            let profileData = data || {};
            if (!profileData.userId) {
                profileData.userId = 'me';
                console.log('自动补全朋友圈 userId');
            }
            objectStore.put(profileData);
        } else {
            objectStore.put({ id: 1, ...data });
        }

        transaction.oncomplete = () => {
            if (typeof onComplete === 'function') onComplete(true);
        };

        transaction.onerror = (e) => {
            console.error(`保存事务失败 [${storeName}]:`, e);
            if (typeof onComplete === 'function') onComplete(false);
        };
    } catch (e) {
        console.error(`保存数据失败 [${storeName}]:`, e);
        if (typeof onComplete === 'function') onComplete(false);
    }
}

function loadFromDB(storeName, callback) {
    // ★★★ 新增：如果数据库没连接成功，直接返回 ★★★
    if (!db) {
        console.warn('数据库未连接，无法读取:', storeName);
        if (callback) callback(null); // 给个空回调防止卡死
        return;
    }

    try {
        // 检查表是否存在，防止读取不存在的表报错
        if (!db.objectStoreNames.contains(storeName)) {
            console.warn(`表 ${storeName} 不存在`);
            if (callback) callback([]);
            return;
        }

        const transaction = db.transaction([storeName], 'readonly');
        const objectStore = transaction.objectStore(storeName);
        
        // momentsProfile 使用 userId 查询，其他一般查 id:1
        const request = (storeName === 'momentsProfile') ? objectStore.get('me') : objectStore.get(1);
        
        request.onsuccess = () => {
          if (['worldbooks', 'categories', 'products', 'shoppingCart', 'memories', 'moments', 'chatGroups'].includes(storeName)) {
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
        
        request.onerror = (e) => {
            console.error('读取数据失败:', e);
            if (callback) callback(null);
        };
    } catch (e) {
        console.error('读取事务创建失败:', e);
        if (callback) callback(null);
    }
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
                    // ★★★ 核心优化：壁纸压缩 ★★★
                    // 假设 compressImageToDataUrl 在 extra.js 中定义，这里需要确保 extra.js 已加载
                    // 如果 compressImageToDataUrl 未定义，使用原图
                    if (typeof compressImageToDataUrl === 'function') {
                        compressImageToDataUrl(e.target.result, 1920, 0.8).then(compressed => {
                            currentWallpaper = compressed;
                            applyWallpaper(currentWallpaper);
                            saveToDB('wallpaper', { data: currentWallpaper, type: 'local' });
                            backToMain();
                        });
                    } else {
                        // 降级处理
                        currentWallpaper = e.target.result;
                        applyWallpaper(currentWallpaper);
                        saveToDB('wallpaper', { data: currentWallpaper, type: 'local' });
                        backToMain();
                    }
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
        



      const DEFAULT_WALLPAPER_URL = 'https://free-img.400040.xyz/4/2026/01/31/697d396f788b8.png';

function loadWallpaper() {
    loadFromDB('wallpaper', (data) => {
        if (data && data.data) {
            currentWallpaper = data.data;
            applyWallpaper(currentWallpaper);
        } else {
            // ★关键：数据库没有壁纸时，应用默认壁纸
            currentWallpaper = null;
            applyWallpaper(null);
        }
    });
}

function applyWallpaper(wallpaperData) {
    const screen = document.querySelector('.phone-screen');
    const finalWallpaper = wallpaperData || DEFAULT_WALLPAPER_URL;

    screen.style.background = `url(${finalWallpaper}) center/cover no-repeat`;
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
            const appTextSize = (data.appTextSize !== undefined) ? data.appTextSize : 12;
            
            document.getElementById('textColorInput').value = textColor;
            document.getElementById('appTextColorInput').value = appTextColor;

             // 字体大小设置滑块和显示 
            document.getElementById('appTextSizeInput').value = appTextSize;
            document.getElementById('appTextSizeDisplay').textContent = appTextSize + 'px';
            
            
            // 同步预览框颜色
            document.getElementById('textColorPreview').style.background = textColor;
            document.getElementById('appTextColorPreview').style.background = appTextColor;
        }
    });
}


        
// ============ 修复版：保存个人信息 (保留其他设置字段) ============
function saveUserInfo() {
    const userId = document.getElementById('userIdInput').value || '我的小手机';
    const signature = document.getElementById('signatureInput').value || '今天也要开心呀～';
    const textColor = document.getElementById('textColorInput').value;
    const appTextColor = document.getElementById('appTextColorInput').value;
    
    // ★★★ 1. 在这里获取滑块的值 ★★★
    let appTextSize = parseInt(document.getElementById('appTextSizeInput').value);
if (isNaN(appTextSize)) appTextSize = 12; // 只有真的是 NaN 才给默认值，0 是有效的
    
    const avatarFile = document.getElementById('avatarInput').files[0];

    // 1. 先读取现有数据，防止覆盖掉 fontPresets, themeSchemes 等其他字段
    loadFromDB('userInfo', (currentData) => {
        const oldData = currentData || {};

        // 内部函数：执行合并保存
        const performSave = (finalAvatar) => {
            const newData = {
                ...oldData, 
                userId: userId,
                signature: signature,
                avatar: finalAvatar,
                textColor: textColor,
                appTextColor: appTextColor,
                appTextSize: appTextSize // ★★★ 2. 保存到对象里 ★★★
            };

            // ★★★ 3. 传给 updateUI (这里之前可能报错了) ★★★
            updateUI(userId, signature, finalAvatar, textColor, appTextColor, appTextSize);
            saveToDB('userInfo', newData);

            // 触发全局头像更新事件
            window.dispatchEvent(new StorageEvent('storage', {
                key: 'userAvatar',
                newValue: finalAvatar
            }));

            closeModal();
        };

        // 2. 处理头像逻辑
        if (avatarFile) {
            const reader = new FileReader();
          reader.onload = (e) => {
    const raw = e.target.result;

    // ★ 头像保存前压缩（显著减少切换角色卡顿）
    if (typeof compressImageToDataUrl === 'function') {
        compressImageToDataUrl(raw, 256, 0.78)
            .then((compressed) => performSave(compressed))
            .catch(() => performSave(raw));
    } else {
        performSave(raw);
    }
};
            reader.readAsDataURL(avatarFile);
        } else {
            performSave(oldData.avatar); // 用旧头像保存
        }
    });
}

        
// 注意参数列表最后加了 appTextSize
function updateUI(userId, signature, avatar, textColor, appTextColor, appTextSize) {
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
    
  // 应用App图标字体颜色和大小
    document.querySelectorAll('.app-name').forEach(el => {
        if (appTextColor) el.style.color = appTextColor;
        
        // ★★★ 修复：只要 appTextSize 不是 undefined 或 null 就应用 ★★★
        if (appTextSize !== undefined && appTextSize !== null) {
            el.style.fontSize = appTextSize + 'px';
        }
    });
}

     function loadUserInfo() {
    loadFromDB('userInfo', (data) => {
        if (data) {
            updateUI(data.userId, data.signature, data.avatar, data.textColor, data.appTextColor, (data.appTextSize !== undefined ? data.appTextSize : 12));
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
let tempSelectedWorldbooks = [];
let categories = ['默认分类'];
let currentCategory = 'all';

// ========================
// 中文注释：固定分类规则
// - 系统内置一个固定分类：html（不可删除）
// - 用于后续“HTML卡片插件”读取模板参考
// ========================
function ensureFixedCategories() {
    if (!Array.isArray(categories)) {
        categories = [];
    }

    if (!categories.includes('默认分类')) {
        categories.unshift('默认分类');
    }

    if (!categories.includes('html')) {
        categories.push('html');
    }

    // ▼▼▼ 新增：固定分类【ai发图】▼▼▼
    if (!categories.includes('ai发图')) {
        categories.push('ai发图');
    }
    // ▲▲▲ 新增结束 ▲▲▲
}

// ====== 关联世界书弹窗相关函数 START ======
function openWorldbookSelectorModal() {
    loadFromDB('characterInfo', (data) => {
        const allCharData = data || {};
        const charData = allCharData[currentChatId] || {};
        
        // 初始化临时选中列表（现在是ID数组）
        tempSelectedWorldbooks = charData.linkedWorldbooks || [];
        currentFilterCategory = 'all';
        
        // 渲染分类筛选标签
        renderWorldbookCategoryFilter();
        
        // 渲染世界书列表
        renderWorldbookSelectorModal();
        
        // 显示弹窗
        document.getElementById('worldbookSelectorModal').style.display = 'flex';
    });
}
// 渲染分类筛选标签
function renderWorldbookCategoryFilter() {
    const container = document.getElementById('worldbookCategoryFilter');
    
    loadFromDB('categories', (data) => {
        const allCategories = Array.isArray(data) ? data : (categories || ['默认分类']);
        
        container.innerHTML = `
            <div onclick="filterWorldbooksByCategory('all')" style="
                padding: 6px 14px;
                background: ${currentFilterCategory === 'all' ? '#667eea' : '#f0f0f0'};
                color: ${currentFilterCategory === 'all' ? 'white' : '#666'};
                border-radius: 16px;
                font-size: 13px;
                cursor: pointer;
                white-space: nowrap;
                font-weight: 500;
            ">全部</div>
        ` + allCategories.map(cat => `
            <div onclick="filterWorldbooksByCategory('${cat}')" style="
                padding: 6px 14px;
                background: ${currentFilterCategory === cat ? '#667eea' : '#f0f0f0'};
                color: ${currentFilterCategory === cat ? 'white' : '#666'};
                border-radius: 16px;
                font-size: 13px;
                cursor: pointer;
                white-space: nowrap;
                font-weight: 500;
            ">${cat}</div>
        `).join('');
    });
}
// 按分类筛选世界书
function filterWorldbooksByCategory(category) {
    currentFilterCategory = category;
    renderWorldbookCategoryFilter();
    renderWorldbookSelectorModal();
}
// 渲染世界书列表
function renderWorldbookSelectorModal() {
    const container = document.getElementById('worldbookSelectorList');
    const countSpan = document.getElementById('worldbookSelectedCount');
    
    loadFromDB('worldbooks', (data) => {
        let allWorldbooks = [];
        if (Array.isArray(data)) {
            allWorldbooks = data;
        } else if (data && Array.isArray(data.list)) {
            allWorldbooks = data.list;
        }
        
        // 按分类筛选
        const filteredBooks = currentFilterCategory === 'all' 
            ? allWorldbooks 
            : allWorldbooks.filter(wb => wb.category === currentFilterCategory);
        
        if (filteredBooks.length === 0) {
            container.innerHTML = '<div style="padding: 40px 20px; text-align: center; color: #999; font-size: 14px;">该分类下暂无世界书</div>';
            countSpan.textContent = tempSelectedWorldbooks.length;
            return;
        }
        
container.innerHTML = filteredBooks.map(wb => {
    const isChecked = tempSelectedWorldbooks.includes(wb.id);
    return `
        <label style="
            display: flex;
            align-items: center;
            padding: 15px 0;
            border-bottom: 0.5px solid #f5f5f5;
            cursor: pointer;
        ">
            <div style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
                <span style="font-size: 15px; color: #333; font-weight: 500;">${wb.title || '无标题'}</span>
                <span style="font-size: 12px; color: #999;">${wb.category || '默认分类'}</span>
            </div>
            <input type="checkbox" 
                   id="wb-checkbox-${wb.id}"
                   value="${wb.id}" 
                   ${isChecked ? 'checked' : ''}
                   onchange="toggleWorldbookItem(${wb.id}, this.checked)"
                   style="margin-left: 12px; accent-color: #667eea; transform: scale(1.2); cursor: pointer;">
        </label>
    `;
}).join('');


        
        // 更新已选数量
        countSpan.textContent = tempSelectedWorldbooks.length;
    });
}
// 切换世界书选中状态
function toggleWorldbookItem(id, isChecked) {
    console.log('切换世界书:', id, '选中状态:', isChecked);
    
    if (isChecked) {
        if (!tempSelectedWorldbooks.includes(id)) {
            tempSelectedWorldbooks.push(id);
        }
    } else {
        tempSelectedWorldbooks = tempSelectedWorldbooks.filter(wbId => wbId !== id);
    }
    
    console.log('当前临时选择列表:', tempSelectedWorldbooks);
    
    // 更新已选数量
    document.getElementById('worldbookSelectedCount').textContent = tempSelectedWorldbooks.length;
}

// 保存世界书选择
// 保存世界书选择
function saveWorldbookSelection() {
    if (!currentChatId) {
        alert('未找到当前聊天ID');
        closeWorldbookSelectorModal();
        return;
    }

    loadFromDB('characterInfo', (data) => {
        const allCharData = data || {};
        
        // 确保当前角色数据存在
        if (!allCharData[currentChatId]) {
            allCharData[currentChatId] = {};
        }
        
        const charData = allCharData[currentChatId];
        
        // 更新关联世界书（保存ID数组）
        charData.linkedWorldbooks = [...tempSelectedWorldbooks];
        
        // 保存到数据库
        saveToDB('characterInfo', allCharData);
        
        console.log('💾 世界书已保存:', tempSelectedWorldbooks);
        
        // ★★★ 延迟200ms后刷新显示，确保数据库写入完成 ★★★
        setTimeout(() => {
            // 更新全局变量
            characterInfoData = charData;
            
            // 强制刷新显示
            renderWorldbookCount();
            
            // 关闭弹窗
            closeWorldbookSelectorModal();
            
            console.log('✅ 显示已刷新');
        }, 200);
    });
}



// 关闭弹窗
function closeWorldbookSelectorModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('worldbookSelectorModal').style.display = 'none';
    tempSelectedWorldbooks = [];
    currentFilterCategory = 'all';
}

// 渲染已选世界书数量（简洁版）
function renderWorldbookCount() {
    const countText = document.getElementById('worldbookCountText');
    
    if (!countText) {
        console.error('❌ 未找到 worldbookCountText 元素');
        return;
    }
    
    if (!currentChatId) {
        countText.textContent = '未选择';
        countText.style.color = '#999';
        console.log('⚠️ currentChatId 为空');
        return;
    }
    
    loadFromDB('characterInfo', (data) => {
        const allCharData = data || {};
        const charData = allCharData[currentChatId] || {};
        const linked = charData.linkedWorldbooks || [];
        
     
        
        if (linked.length === 0) {
            countText.textContent = '未选择';
            countText.style.color = '#999';
            console.log('  - 显示：未选择');
        } else {
            countText.textContent = `已选择 ${linked.length} 本`;
            countText.style.color = '#667eea';
            countText.style.fontWeight = '500';
            console.log(`  - 显示：已选择 ${linked.length} 本`);
        }
    });
}


// ▼▼▼ 兼容旧函数名 ▼▼▼
function renderWorldbookTags() {
    renderWorldbookCount();
}


// ====== 关联世界书弹窗相关函数 END ======


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
        // 中文注释：从数据库加载分类；没有就给默认
        categories = data || ['默认分类'];

        // 中文注释：强制补全固定分类 html
        const before = JSON.stringify(categories);
        ensureFixedCategories();
        const after = JSON.stringify(categories);

        // 中文注释：如果补全导致分类变化，则写回数据库，保证下次也有 html
        if (before !== after) {
            saveToDB('categories', categories);
        }

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
    
    // ★★★ 修复："全部"应该显示所有分类，不筛选 ★★★
    currentCategory = category;
    
    document.querySelectorAll('.ins-cat-pill').forEach(tag => tag.classList.remove('active'));
    
    const activeTag = document.querySelector(`.ins-cat-pill[data-category="${category}"]`);
    if (activeTag) {
        activeTag.classList.add('active');
    }
    
    // ★★★ 调试：打印切换后的分类 ★★★
    console.log('切换到分类:', category);
    
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
    
    // 先清空
    container.innerHTML = '';
    
    filtered.forEach(wb => {
        // 创建卡片容器
        const card = document.createElement('div');
        card.className = 'ins-book-card';
        
        // 创建头部
        const header = document.createElement('div');
        header.className = 'ins-book-header';
        header.innerHTML = `
            <div class="ins-book-title">${wb.title || '未命名'}</div>
            <div class="ins-book-tag">${wb.category || '默认分类'}</div>
        `;
        
        // 创建预览内容
        const preview = document.createElement('div');
        preview.className = 'ins-book-preview';
        preview.textContent = wb.content || '（无内容）';
        
        // 创建操作按钮区域
        const actions = document.createElement('div');
        actions.className = 'ins-book-actions';
        
        // 编辑按钮
        const editBtn = document.createElement('button');
        editBtn.className = 'ins-action-btn ins-btn-edit';
        editBtn.textContent = 'EDIT';
        editBtn.onclick = () => editWorldbook(wb.id);
        
        // 删除按钮
        const delBtn = document.createElement('button');
        delBtn.className = 'ins-action-btn ins-btn-del';
        delBtn.textContent = 'DELETE';
        delBtn.onclick = () => deleteWorldbook(wb.id);
        
        // 组装
        actions.appendChild(editBtn);
        actions.appendChild(delBtn);
        
        card.appendChild(header);
        card.appendChild(preview);
        card.appendChild(actions);
        
        container.appendChild(card);
    });
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
    if (!worldbook) {
        alert('找不到该世界书');
        return;
    }
    
    editingWorldbookId = id;
    document.getElementById('worldbookModalTitle').textContent = '编辑世界书';
    document.getElementById('worldbookTitle').value = worldbook.title || '';
    document.getElementById('worldbookContent').value = worldbook.content || '';
    
    // ★★★ 先刷新分类下拉框 ★★★
    updateCategorySelect();
    
    // ★★★ 再设置当前分类（必须在 updateCategorySelect 之后） ★★★
    const categorySelect = document.getElementById('worldbookCategory');
    if (categorySelect) {
        categorySelect.value = worldbook.category || '默认分类';
    }
    
    document.getElementById('worldbookModal').style.display = 'flex';
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
    
    container.innerHTML = categories.map(cat => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 0; border-bottom: 1px solid #f5f5f5;">
            <span style="font-size: 15px; color: #333; font-weight: 500;">${cat}</span>
         ${(cat !== '默认分类' && cat !== 'html' && cat !== 'ai发图') ? 
    `<button class="ins-action-btn ins-btn-del" onclick="deleteCategory('${cat}')" style="padding: 6px 14px; font-size: 12px;">删除</button>` 
    : (cat === 'html' || cat === 'ai发图'
        ? '<span style="font-size: 12px; color: #ccc; background: #f9f9f9; padding: 4px 8px; border-radius: 6px;">固定分类</span>'
        : '<span style="font-size: 12px; color: #ccc; background: #f9f9f9; padding: 4px 8px; border-radius: 6px;">系统默认</span>')}

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
    // 中文注释：固定分类 html 不允许删除
    if (categoryName === 'html') {
        alert('html 为固定分类，无法删除');
        return;
    }
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
        if (window.__htmlCardAllowedCache) window.__htmlCardAllowedCache = {};
        
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

     // ★★★ 新增：加载温度设置 ★★★
    const tempInput = document.getElementById('apiTemperature');
    const tempDisplay = document.getElementById('tempValueDisplay');
    if (tempInput && tempDisplay) {
        // 如果没有存过，默认 0.7
        const val = currentApiConfig.temperature !== undefined ? currentApiConfig.temperature : 0.7;
        tempInput.value = val;
        tempDisplay.textContent = val;
    }
    // ★★★ 新增结束 ★★★
    
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
     // ★★★ 新增：同时保存绘图配置 ★★★
    if (typeof saveImageApiConfig === 'function') {
        saveImageApiConfig();
    }
    alert('配置已保存');
}

function saveAsScheme() {
    const name = document.getElementById('apiName').value.trim();
    const baseUrl = document.getElementById('apiBaseUrl').value.trim();
    const apiKey = document.getElementById('apiKey').value.trim();
    const defaultModel = document.getElementById('modelSelect').value;
    
    // ★★★ 新增：获取温度值 ★★★
    const temperature = parseFloat(document.getElementById('apiTemperature').value) || 0.7;
    
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
            defaultModel,
            temperature: temperature // ★★★ 这里必须加这行！ ★★★
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
            defaultModel,
            temperature: temperature // ★★★ 这里也必须加这行！ ★★★
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


// ====== 头像字段兼容工具 START ======
function isImageAvatarValue(v) {
    if (typeof v !== 'string') return false;
    const s = v.trim().toLowerCase();
    return s.startsWith('data:image/') || s.startsWith('http://') || s.startsWith('https://');
}

// 统一取“最终头像图源”
// 优先：avatarImage -> avatar
function getChatAvatarSrc(chat) {
    if (!chat) return '';
    const a1 = typeof chat.avatarImage === 'string' ? chat.avatarImage.trim() : '';
    const a2 = typeof chat.avatar === 'string' ? chat.avatar.trim() : '';

    if (isImageAvatarValue(a1)) return a1;
    if (isImageAvatarValue(a2)) return a2;
    return '';
}

// 兼容迁移：把旧字段统一到新字段（以图片源为主）
// 返回 true 表示发生了变更，需要回写DB
function normalizeChatAvatarFields(chat) {
    if (!chat) return false;
    let changed = false;

    const src = getChatAvatarSrc(chat);
    if (src) {
        if (chat.avatarImage !== src) {
            chat.avatarImage = src;
            changed = true;
        }
        if (chat.avatar !== src) {
            chat.avatar = src;
            changed = true;
        }
    } else {
        // 没有图片头像时，保留emoji头像；avatarImage清空
        if (!chat.avatarImage) {
            // no-op
        } else {
            chat.avatarImage = '';
            changed = true;
        }
        if (!chat.avatar) {
            chat.avatar = '👤';
            changed = true;
        }
    }

    return changed;
}
// ====== 头像字段兼容工具 END ======

// ====== characterInfo 全量缓存（减少 IndexedDB 读取导致卡顿）START ======
let characterInfoCache = null;

function getCharacterInfoAllCached(force, callback) {
    if (!force && characterInfoCache && typeof characterInfoCache === 'object') {
        if (typeof callback === 'function') callback(characterInfoCache);
        return;
    }
    loadFromDB('characterInfo', (data) => {
        characterInfoCache = (data && typeof data === 'object') ? data : {};
        if (typeof callback === 'function') callback(characterInfoCache);
    });
}

function setCharacterInfoCache(allData) {
    characterInfoCache = (allData && typeof allData === 'object') ? allData : {};
}
// ====== characterInfo 全量缓存 END ======

let chats = [];
      // 钱包数据
let walletData = {
    balance: 2000.00,
    bills: []
};
let currentChatTab = 'single'; // single, group, peek
let isReceiving = false;
let scheduleData = {
    userPlan: '',
    charRoutine: ''
};
// 加载聊天列表（内联迁移版，避免外部函数丢失）
function loadChats(callback) {
    if (window.__chatAvatarMigrationDone) {
    renderChatList();
    if (typeof callback === 'function') callback();
    return;
}
    loadFromDB('chats', (data) => {
        if (data && data.list) {
            chats = data.list;
        } else if (Array.isArray(data)) {
            chats = data;
        } else {
            chats = [];
        }

        // 本地工具（内联，防止函数未定义）
        const isImg = (v) => typeof v === 'string' && (
            v.startsWith('data:image/') ||
            v.startsWith('http://') ||
            v.startsWith('https://')
        );

        const getSrc = (chat) => {
            if (!chat) return '';
            if (isImg(chat.avatarImage)) return chat.avatarImage;
            if (isImg(chat.avatar)) return chat.avatar;
            return '';
        };

// ★★★ 新增：头像迁移只在本次页面生命周期执行一次，避免反复遍历导致卡顿 ★★★
if (window.__chatAvatarMigrationDone === true) {
    renderChatList();
    if (typeof callback === 'function') callback();
    return;
}

        let needSaveChats = false;

        // ① chats 表内部迁移
        chats.forEach(chat => {
            if (!chat) return;
            const src = getSrc(chat);

            if (src) {
                if (chat.avatarImage !== src) {
                    chat.avatarImage = src;
                    needSaveChats = true;
                }
                if (chat.avatar !== src) {
                    chat.avatar = src;
                    needSaveChats = true;
                }
            } else {
                if (!chat.avatar) {
                    chat.avatar = '👤';
                    needSaveChats = true;
                }
                if (chat.avatarImage) {
                    chat.avatarImage = '';
                    needSaveChats = true;
                }
            }
        });

        // ② 跨表迁移：characterInfo -> chats
        loadFromDB('characterInfo', (charInfoData) => {
            const allChar = (charInfoData && typeof charInfoData === 'object') ? charInfoData : {};
            let needSaveCharInfo = false;

            chats.forEach(chat => {
                if (!chat) return;
                const cid = chat.id;
                const c = allChar[cid] || {};
                const chatSrc = getSrc(chat);
                const charSrc = isImg(c.avatarImage) ? c.avatarImage : (isImg(c.avatar) ? c.avatar : '');

                // chats没图，charInfo有图 -> 补给 chats
                if (!chatSrc && charSrc) {
                    chat.avatarImage = charSrc;
                    chat.avatar = charSrc;
                    needSaveChats = true;
                }

                // chats有图，charInfo没图 -> 回写给 charInfo
                if (chatSrc && !charSrc) {
                    if (!allChar[cid]) allChar[cid] = {};
                    allChar[cid].avatarImage = chatSrc;
                    allChar[cid].avatar = chatSrc;
                    needSaveCharInfo = true;
                }
            });

            if (needSaveChats) {
                saveToDB('chats', { list: chats });
                console.log('✅ chats 头像字段迁移完成');
            }
            if (needSaveCharInfo) {
                saveToDB('characterInfo', allChar);
                console.log('✅ characterInfo 头像字段补齐完成');
            }

window.__chatAvatarMigrationDone = true;
            renderChatList();
            if (typeof callback === 'function') {
    callback();
}
        });
    });
}
bindChatItemClickDelegation();

// 切换聊天/朋友圈/钱包 Tab
function switchChatTab(tab) {
    // 1. 更新底部按钮状态
    document.querySelectorAll('.bottom-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.bottom-tab[data-tab="${tab}"]`).classList.add('active');

    // 获取元素
    const chatList = document.getElementById('chatListContainer');
    const walletContainer = document.getElementById('walletContainer');
    const momentsContainer = document.getElementById('momentsContainer');
    const addBtn = document.querySelector('.chat-screen .add-btn');
    const headerTitle = document.querySelector('.chat-screen .header-title');

    // 新增：朋友圈顶部右侧按钮
    const momentsHeaderActions = document.getElementById('momentsHeaderActions');

    // 2. 重置状态
    chatList.style.display = 'none';
    walletContainer.style.display = 'none';
    momentsContainer.style.display = 'none';

    // 新增：默认隐藏朋友圈右侧按钮
    if (momentsHeaderActions) momentsHeaderActions.style.display = 'none';

    // 重置按钮样式（移除相机模式）
    addBtn.classList.remove('camera-mode');
    addBtn.innerHTML = '+';
    addBtn.onclick = openAddChatMenu; // 默认点击事件
    addBtn.style.display = 'block';

    // 3. 界面切换逻辑
    if (tab === 'wallet') {
        // === 钱包模式 ===
        walletContainer.style.display = 'block';
        addBtn.style.display = 'none'; // 钱包页不显示加号
        headerTitle.textContent = '我的钱包';
        renderWallet();

    } else if (tab === 'moments') {
        // === 朋友圈模式 ===
        momentsContainer.style.display = 'flex';
        headerTitle.textContent = '朋友圈';

        // 只在朋友圈显示右侧按钮
        if (momentsHeaderActions) momentsHeaderActions.style.display = 'flex';

        // 将加号按钮改为相机按钮
        addBtn.innerHTML = '📷';
        addBtn.classList.add('camera-mode');
        addBtn.onclick = openPostMomentModal;

        // 加载朋友圈数据
        loadMomentsProfile();
        loadMoments();

    } else {
        // === 聊天列表模式 ===
        chatList.style.display = 'block';
        headerTitle.textContent = '聊天';

        currentChatTab = 'all';
        renderChatList();
    }
}



// 渲染聊天列表
function renderChatList() {
    const container = document.getElementById('chatListContainer');
    
    // 修改这里：如果是 'all'，则显示所有非 peek 类型的聊天；否则按类型筛选
    let filtered;
    if (currentChatTab === 'all' || currentChatTab === 'single') {
        // 显示单聊和群聊，但不显示偷看模式
        filtered = chats.filter(chat => chat.type !== 'peek');
    } else {
        filtered = chats.filter(chat => chat.type === currentChatTab);
    }
    
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
                  ${getChatAvatarSrc(chat)
    ? `<img src="${getChatAvatarSrc(chat)}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`
    : (chat.avatar || '👤')}
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
function updateChatDisplayName(chatId, allCharInfo) {
    const apply = (data) => {
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
   
    // ★★★ 新增：同时更新头像 ★★★
        const chat = chats.find(c => c.id === chatId);
        if (chat) {
            const avatarEl = document.querySelector(`#chat-${chatId} .chat-avatar`);
            if (avatarEl) {
                const avatarUrl = chat.avatarImage || chat.avatar;
                
                if (avatarUrl && avatarUrl !== '👤' && (avatarUrl.startsWith('http') || avatarUrl.startsWith('data:image'))) {
                    avatarEl.innerHTML = `<img src="${avatarUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
                } else {
                    avatarEl.textContent = chat.avatar || '👤';
                }
            }
        }
   
        updateArchiveCount(); 
           // ★★★ 性能修复：列表渲染时不要为每个 chat 调 updateArchiveCount ★★★
        // 只有当你当前正打开的 chatId 才需要更新档案数
        if (currentChatId === chatId) {
            updateArchiveCount();
        }
    };

    if (allCharInfo) {
        apply(allCharInfo);
    } else {
        getCharacterInfoAllCached(false, (data) => apply(data));
    }
}


// ====== 新增：更新并保存角色状态（修复列表页不刷新问题）======
function setChatStatus(chatId, statusText) {
    if (!chatId) return;
    
    loadFromDB('characterInfo', (data) => {
        const allCharData = data || {};
        // 确保对象存在
        if (!allCharData[chatId]) {
            allCharData[chatId] = {};
        }
        
        // 1. 更新内存数据
        allCharData[chatId].currentStatus = statusText;
        
        // 2. 保存到数据库
        saveToDB('characterInfo', allCharData);
        
        // 3. 立即刷新 UI
        // 刷新列表页的状态标签
        const listTag = document.getElementById(`status-tag-${chatId}`);
        if (listTag) {
            const mainStatus = statusText.split('-')[0].trim();
            listTag.textContent = `「${mainStatus}」`;
        }
        
        // 刷新详情页的状态栏
        const detailStatus = document.getElementById('characterStatus');
        if (detailStatus && currentChatId === chatId) {
            detailStatus.textContent = statusText;
        }
        
        // 如果当前正在查看角色信息页，也尝试刷新那里
        if (typeof characterInfoData !== 'undefined' && currentChatId === chatId) {
            characterInfoData.currentStatus = statusText;
        }
        
        console.log(`✅ 状态已保存: ${chatId} -> ${statusText}`);
    });
}

function updateChatStatusDisplay(chatId, allCharInfo) {
   const apply = (data) => {
    const charData = data && data[chatId] ? data[chatId] : {};
        const status = charData.currentStatus || '在线-刚刚上线';  // ← 给默认值
        
        const statusTag = document.getElementById(`status-tag-${chatId}`);
        if (statusTag && status) {  // ← 删除了额外的判断
            const mainStatus = status.split('-')[0].trim();
            statusTag.textContent = `「${mainStatus}」`;
        } else if (statusTag) {
            statusTag.textContent = '';
        }
    };
if (allCharInfo) apply(allCharInfo);
else getCharacterInfoAllCached(false, (data) => apply(data));
}




// 新增：保存状态的函数
function setChatStatus(chatId, statusText) {
    loadFromDB('characterInfo', (data) => {
        const allData = data || {};
        if (!allData[chatId]) allData[chatId] = {};
        
        // 1. 保存到数据库（存档）
        allData[chatId].currentStatus = statusText;
        saveToDB('characterInfo', allData);
        
        // 2. 刷新界面（读档显示）
        updateChatStatusDisplay(chatId); // 列表页
        updateDetailPageStatus(chatId);  // 详情页
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
// 新增：更新聊天详情页的角色状态（防止 updateDetailPageStatus 未定义报错）
function updateDetailPageStatus(chatId) {
    if (!chatId) return;

    loadFromDB('characterInfo', (data) => {
        const charData = data && data[chatId] ? data[chatId] : {};
        const statusText = charData.currentStatus || '在线-刚刚上线';

        // 兼容：有些页面用 chatDetailStatus，有些用 characterStatus
        const detailEl = document.getElementById('chatDetailStatus');
        if (detailEl) {
            detailEl.textContent = statusText;
            detailEl.style.display = 'flex';
        }

        const statusEl = document.getElementById('characterStatus');
        if (statusEl) {
            statusEl.textContent = statusText;
            statusEl.style.display = 'flex';
        }

        // 顺带刷新列表页的状态标签（如果存在）
        if (typeof updateChatStatusDisplay === 'function') {
            updateChatStatusDisplay(chatId);
        }
    });
}

// 打开添加聊天菜单
function openAddChatMenu() {
    console.log('openAddChatMenu 被调用，当前Tab:', currentChatTab); // 调试用
    
    if (currentChatTab === 'single' || currentChatTab === 'all') {
        // 单聊：打开输入弹窗
        document.getElementById('singleChatName').value = '';
        
        const modal = document.getElementById('addSingleChatModal');
        if (modal) {
            modal.style.display = 'flex'; // 关键：显示弹窗
            modal.style.zIndex = '999999'; // 确保层级最高
          
        } else {
            console.error('找不到弹窗元素 #addSingleChatModal');
        }
        
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
 // 修复后的代码
const headerAvatar = document.getElementById('chatHeaderAvatar');
const avatarSrc = getChatAvatarSrc(chat);
if (avatarSrc) {
    headerAvatar.innerHTML = `<img src="${avatarSrc}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
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

// 关闭单聊弹窗
function closeAddSingleModal(event) {
    if (event && event.target.id !== 'addSingleChatModal') return;
    document.getElementById('addSingleChatModal').style.display = 'none';
    // 清空输入框
    document.getElementById('singleChatName').value = '';
    document.getElementById('singleChatMyName').value = '';  // 新增
}

// 创建单聊
function createSingleChat() {
    const name = document.getElementById('singleChatName').value.trim();
    const myName = document.getElementById('singleChatMyName').value.trim();
    
    if (!name) {
        alert('请输入角色名字');
        return;
    }
    
    if (!myName) {
        alert('请输入我的名字');
        return;
    }
    
    const newChat = {
        id: Date.now(),
        type: 'single',
        name: name,
        myName: myName,  // 新增
        avatar: '👤',
        myAvatar: '👤',  // 新增
        lastMessage: '',
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        messages: []
    };
    
 chats.push(newChat);
saveToDB('chats', { list: chats });
    closeAddSingleModal();
    renderChatList();
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
 // 修复后的代码
const avatarUrl = chat.avatarImage || chat.avatar;
const avatarHtml = (avatarUrl && avatarUrl !== '👤' && (avatarUrl.startsWith('http') || avatarUrl.startsWith('data:image')))
    ? `<img src="${avatarUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`
    : (chat.avatar || '👤');
    
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
    const modal = document.getElementById('selectMembersModal');
    const mode = modal && modal.dataset ? modal.dataset.mode : '';

    // === 新增：朋友圈分组成员选择模式 ===
    if (mode === 'momentsGroup') {
        if (typeof momentsGroupOnConfirm === 'function') {
            const selected = Array.isArray(momentsGroupSelectedChatIds) ? [...momentsGroupSelectedChatIds] : [];
            momentsGroupOnConfirm(selected);
        }

        // 清理状态并关闭
        momentsGroupSelectedChatIds = [];
        momentsGroupOnConfirm = null;
        if (modal) modal.dataset.mode = '';
        closeSelectMembersModal(); // 复用你原来的关闭函数
        return;
    }

    // === 你原来的群聊/偷看逻辑保持不变 ===
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
// ====== messages 按 chatId 缓存（切角色秒开）START ======
window.__messagesCache = window.__messagesCache || {};
// ====== messages 按 chatId 缓存 END ======

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
    // ★★★ 优先走缓存，切换角色不读大表，解决明显卡顿 ★★★
    if (window.__messagesCache && Array.isArray(window.__messagesCache[chatId])) {
        allMessages = window.__messagesCache[chatId];

        visibleMessagesCount = 30;
        if (visibleMessagesCount > allMessages.length) visibleMessagesCount = allMessages.length;

        const p = renderMessages();
        if (p && typeof p.then === 'function') {
            p.then(() => setTimeout(scrollToBottom, 0));
        } else {
            setTimeout(scrollToBottom, 0);
        }
        return;
    }

    loadFromDB('messages', (data) => {
        const allData = data && data.list ? data.list : [];
        const chatMessages = allData.filter(m => m.chatId === chatId);

        allMessages = chatMessages;

        // 写入缓存
        window.__messagesCache = window.__messagesCache || {};
        window.__messagesCache[chatId] = chatMessages;

        visibleMessagesCount = 30;
        if (visibleMessagesCount > allMessages.length) {
            visibleMessagesCount = allMessages.length;
        }

        const p = renderMessages();
        if (p && typeof p.then === 'function') {
            p.then(() => setTimeout(scrollToBottom, 0));
        } else {
            setTimeout(scrollToBottom, 0);
        }
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
       isSticker: false
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
  
    // ★★★ 核心优化：滑动窗口渲染 ★★★
    // 如果当前显示的条数超过 30 条，就不再增加显示数量
    // 这样新消息加入时，最上面的一条旧消息会被自动“挤”出去，保持DOM数量稳定
    if (visibleMessagesCount < 30) {
        visibleMessagesCount = Math.min(visibleMessagesCount + 1, allMessages.length);
    }
    // 如果已经 >= 50，保持不变，renderMessages 的 slice(-50) 会自动取最新的30条
    
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
        // ★★★ 新增：同步消息缓存，保证切换角色不读DB且数据是最新的 ★★★
window.__messagesCache = window.__messagesCache || {};
window.__messagesCache[currentChatId] = Array.isArray(allMessages) ? allMessages : [];
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

// 添加长按事件 (修复版：兼容文字图点击)
function addLongPressEvent(element, messageId) {
    let longPressTimer = null;
    let isLongPress = false;
    
    // 移动端
    element.addEventListener('touchstart', (e) => {
        isLongPress = false;
        longPressTimer = setTimeout(() => {
            isLongPress = true;
            openMessageMenu(messageId);
        }, 500);
    }, { passive: true }); // 不阻止默认行为
    
    element.addEventListener('touchend', (e) => {
        clearTimeout(longPressTimer);
        // 如果是长按触发了菜单，阻止后续 click
        if (isLongPress) {
            e.preventDefault();
        }
    });
    
    element.addEventListener('touchmove', () => {
        clearTimeout(longPressTimer);
        isLongPress = false;
    }, { passive: true });
    
    // 桌面端
    element.addEventListener('mousedown', () => {
        isLongPress = false;
        longPressTimer = setTimeout(() => {
            isLongPress = true;
            openMessageMenu(messageId);
        }, 500);
    });
    
    element.addEventListener('mouseup', () => {
        clearTimeout(longPressTimer);
    });
    
    element.addEventListener('mouseleave', () => {
        clearTimeout(longPressTimer);
        isLongPress = false;
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
    } else if (message.content && message.content.length > 5) {
        // 普通文本消息，截断过长内容
        displayContent = message.content.substring(0, 5) + '...';
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
    // 新增：更新双人档案显示
updateDualProfileDisplay();
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
    
    // ★★★ 修复：显示双人档案时，优先从 chat 读取头像 ★★★
    const dualCharAvatar = document.getElementById('dualCharAvatar');
    const dualCharName = document.getElementById('dualCharName');
    if (dualCharAvatar) {
        const avatarUrl = chat.avatarImage || chat.avatar;
        if (avatarUrl && avatarUrl !== '👤') {
            dualCharAvatar.style.backgroundImage = `url(${avatarUrl})`;
            dualCharAvatar.style.backgroundSize = 'cover';
            dualCharAvatar.style.backgroundPosition = 'center';
            dualCharAvatar.textContent = '';
        } else {
            dualCharAvatar.style.backgroundImage = '';
            dualCharAvatar.textContent = chat.avatar || '👤';
        }
    }
    if (dualCharName) {
        dualCharName.textContent = chat.name;
    }
    
    // 同时更新"我的"信息（如果有数据）
    const dualMyAvatar = document.getElementById('dualMyAvatar');
    const dualMyName = document.getElementById('dualMyName');
    if (dualMyAvatar) {
        const myAvatarUrl = chat.myAvatar;
        if (myAvatarUrl && myAvatarUrl !== '👤') {
            dualMyAvatar.style.backgroundImage = `url(${myAvatarUrl})`;
            dualMyAvatar.style.backgroundSize = 'cover';
            dualMyAvatar.style.backgroundPosition = 'center';
            dualMyAvatar.textContent = '';
        } else {
            dualMyAvatar.style.backgroundImage = '';
            dualMyAvatar.textContent = '👤';
        }
    }
    if (dualMyName) {
        dualMyName.textContent = chat.myName || '我';
    }
    
    // 尝试从数据库加载详细信息
    loadFromDB('characterInfo', (data) => {
        const charData = data && data[chatId] ? data[chatId] : {};
        characterInfoData = charData;
        
        // 如果没有状态，设置默认状态
        if (!charData.currentStatus) {
            charData.currentStatus = '在线-刚刚上线';
        }

        // 填充表单（添加空值检查）
        const remarkEl = document.getElementById('charRemark');
        const birthdayEl = document.getElementById('charBirthday');
        const personalityEl = document.getElementById('charPersonality');
        const myPersonalityEl = document.getElementById('myPersonality');

        if (remarkEl) remarkEl.value = charData.remark || '';      
        if (birthdayEl) birthdayEl.value = charData.birthday || '';
        if (personalityEl) personalityEl.value = charData.personality || '';
        if (myPersonalityEl) myPersonalityEl.value = charData.myPersonality || '';
        
        // 加载并显示状态
        const statusEl = document.getElementById('characterStatus');
        if (statusEl) {
            const status = charData.currentStatus || '在线-刚刚上线';
            statusEl.textContent = status;
            statusEl.style.display = 'flex';
        }

        // 加载上下文参考设置
        const contextRounds = charData.contextRounds !== undefined ? charData.contextRounds : 30;
        const sliderEl = document.getElementById('contextRoundsSlider');
        const inputEl = document.getElementById('contextRoundsInput');
        const countEl = document.getElementById('contextMessagesCount');

        if (sliderEl) sliderEl.value = contextRounds;
        if (inputEl) inputEl.value = contextRounds;
        if (countEl) countEl.textContent = contextRounds * 2;
        
        // 加载自动总结设置
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

        // 渲染世界书标签
        renderWorldbookTags();
        
        // 加载城市信息复选框状态
        const cityCheckbox = document.getElementById('cityInfoCheckbox');
        if (cityCheckbox) {
            cityCheckbox.checked = charData.cityInfoEnabled === true;
        }

        // 回填 HTML 插件开关（默认关闭）
        const htmlPluginCheckbox = document.getElementById('htmlPluginCheckbox');
        if (htmlPluginCheckbox) {
            htmlPluginCheckbox.checked = charData.htmlPluginEnabled === true;
        }

        // 加载角色发图模式
        const imageModeSelect = document.getElementById('charImageMode');
        if (imageModeSelect) {
            imageModeSelect.value = charData.imageMode || 'text';
        }

        // 控制查看按钮的显示
        const viewBtn = document.getElementById('viewWeatherBtn');
        if (viewBtn) {
            viewBtn.style.display = charData.cityInfoEnabled ? 'block' : 'none';
        }
    });
    
    // 更新日记数量
    updateDiaryCount();
    updateArchiveCount();
    renderWorldbookCount();
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
           linkedWorldbooks: characterInfoData?.linkedWorldbooks || [],

             htmlPluginEnabled: document.getElementById('htmlPluginCheckbox')?.checked === true,
            contextRounds: parseInt(document.getElementById('contextRoundsInput').value) || 30,
             autoSummaryEnabled: document.getElementById('autoSummaryCheckbox')?.checked || false,
    autoSummaryThreshold: parseInt(document.getElementById('autoSummaryThresholdInput')?.value) || 50,
     imageMode: document.getElementById('charImageMode')?.value || 'text',
        };
        
        // 3. 保存回数据库
        allCharData[currentChatId] = finalCharData;
        saveToDB('characterInfo', allCharData);
        if (window.__htmlCardAllowedCache) delete window.__htmlCardAllowedCache[currentChatId];
        setCharacterInfoCache(allCharData);
        
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
        
        // 显示当前头像（优先级：avatarImage > avatar > 默认）
        const avatarPreview = document.getElementById('editAvatarPreview');
        const currentAvatar = chat.avatarImage || chat.avatar;
        
        console.log('🖼️ 加载编辑弹窗头像:', {
            avatarImage: chat.avatarImage ? '有' : '无',
            avatar: chat.avatar,
            finalAvatar: currentAvatar ? currentAvatar.substring(0, 50) + '...' : '无'
        });
        
        if (currentAvatar && currentAvatar !== '👤') {
            avatarPreview.innerHTML = `<img src="${currentAvatar}" alt="头像" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
        } else {
            avatarPreview.textContent = '👤';
        }
        
        // 填充当前名字
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

// ============ 🔄 修复版：保存基本信息 

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
    const performSave = (newAvatarData) => {
        // 确定最终使用的头像（新上传 > 当前已有 > 默认）
        let finalAvatar = newAvatarData || chat.avatarImage || chat.avatar || null;
        
        console.log('💾 保存头像:', {
            newAvatarData: newAvatarData ? '有新图' : '无',
            currentAvatarImage: chat.avatarImage ? '有' : '无',
            currentAvatar: chat.avatar,
            finalAvatar: finalAvatar ? finalAvatar.substring(0, 50) + '...' : '无'
        });
        
        // 1. 更新 chats 表
        // 1. 更新 chats 表（先改内存，立即刷新界面）
        chat.name = newName;
        chat.avatarImage = finalAvatar;
        chat.avatar = finalAvatar;

        // 先即时刷新界面（立刻看到效果）
        syncChatUIImmediately(currentChatId);

        // 再保存 chats
        saveToDB('chats', { list: chats }, (okChats) => {
            if (!okChats) {
                alert('保存失败：chats 写入失败');
                return;
            }
            console.log('✅ chats 表已保存');

            // 2. 更新 characterInfo 表
            loadFromDB('characterInfo', (data) => {
                const allCharData = data || {};
                if (!allCharData[currentChatId]) allCharData[currentChatId] = {};

                const charData = allCharData[currentChatId];
                charData.name = newName;
                charData.avatarImage = finalAvatar;
                charData.avatar = finalAvatar;

                saveToDB('characterInfo', allCharData, (okChar) => {
                    if (!okChar) {
                        alert('保存失败：characterInfo 写入失败');
                        return;
                    }
                    console.log('✅ characterInfo 表已保存');

                    // 写入完成后再做一次UI同步（不要 loadChats，避免回刷旧数据）
                    syncChatUIImmediately(currentChatId);

                    closeEditBasicInfo();
                    alert('保存成功！✨');
                });
            });
        });
       
    };
    
    // 处理头像上传
    if (avatarFile) {
        const reader = new FileReader();
      reader.onload = (e) => {
    console.log('📷 读取新头像文件');
    const raw = e.target.result;

    // ★ 角色头像保存前压缩（显著减少切换角色卡顿）
    if (typeof compressImageToDataUrl === 'function') {
        compressImageToDataUrl(raw, 256, 0.78)
            .then((compressed) => performSave(compressed))
            .catch(() => performSave(raw));
    } else {
        performSave(raw);
    }
};
        reader.readAsDataURL(avatarFile);
    } else {
        console.log('📷 保留当前头像');
        performSave(null); // 传 null 会使用当前已有头像
    }
}

// ★★★ 新增：更新聊天详情页的头像显示 ★★★
function updateDetailPageAvatar(chatId) {
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;
    
    const headerAvatar = document.getElementById('chatHeaderAvatar');
    if (!headerAvatar) return;
    
    // 优先使用 avatarImage，其次 avatar
    const avatarUrl = chat.avatarImage || chat.avatar;
    
    if (avatarUrl && avatarUrl !== '👤') {
        headerAvatar.innerHTML = `<img src="${avatarUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
    } else {
        headerAvatar.textContent = chat.avatar || '👤';
    }
}

// 保存基本信息后：立即刷新列表 + 对话页 + 角色页（不等待切页）
function syncChatUIImmediately(chatId) {
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;

    // 1) 聊天列表容器
    renderChatList();

    // 2) 对话页容器（标题、头像、消息容器）
    if (currentChatId === chatId) {
        updateDetailPageTitle(chatId, chat.name || '');
        updateDetailPageAvatar(chatId);

        // ★ 新增：强制重绘消息容器，避免头部更新后消息区没重绘
        if (typeof renderMessages === 'function') {
            renderMessages();
        }
    }

    // 3) 角色信息页容器
    if (currentChatId === chatId) {
        if (typeof updateDualProfileDisplay === 'function') {
            updateDualProfileDisplay();
        }
        if (typeof loadCharacterInfo === 'function') {
            loadCharacterInfo(chatId);
        }
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
    // 直接从全局变量读取（同步）
    if (!currentChatId || !characterInfoData) return [];
    return characterInfoData.linkedWorldbooks || [];
}



// 获取关联世界书的内容（修复版）
async function getLinkedWorldbooksContent(linkedIds) {
    if (!linkedIds || !Array.isArray(linkedIds) || linkedIds.length === 0) {
        return '无';
    }
    
    return new Promise((resolve) => {
        loadFromDB('worldbooks', (data) => {
            try {
                let allWorldbooks = [];
                if (Array.isArray(data)) {
                    allWorldbooks = data;
                } else if (data && Array.isArray(data.list)) {
                    allWorldbooks = data.list;
                }
                
                // 按ID过滤世界书
                const linkedBooks = allWorldbooks.filter(wb => wb && linkedIds.includes(wb.id));
                
                if (linkedBooks.length === 0) {
                    resolve('无');
                    return;
                }
                
                const content = linkedBooks.map(wb => 
                    `【${wb.title || '无标题'}】\n${wb.content || ''}`
                ).join('\n\n');
                
                resolve(content);
                
            } catch (error) {
                console.error("读取世界书出错:", error);
                resolve('无'); 
            }
        });
    });
}



// ================================
// 中文注释：只提取“关联世界书”里 category=html 的内容
// - 用作 HTML 卡片模板/风格参考
// - 不掺杂其它分类内容，避免污染人设/剧情
// ================================
async function getLinkedHtmlWorldbooksContent(linkedIds) {
    if (!linkedIds || !Array.isArray(linkedIds) || linkedIds.length === 0) {
        return '';
    }

    return new Promise((resolve) => {
        loadFromDB('worldbooks', (data) => {
            let allWorldbooks = [];
            if (Array.isArray(data)) allWorldbooks = data;
            else if (data && Array.isArray(data.list)) allWorldbooks = data.list;

            const linkedBooks = allWorldbooks
                .filter(wb => wb && linkedIds.includes(wb.id))
                .filter(wb => wb.category === 'html' && String(wb.content || '').trim().length > 0);

            if (linkedBooks.length === 0) {
                resolve('');
                return;
            }

            // 中文注释：允许多个 html 世界书条目叠加
            const content = linkedBooks.map(wb =>
                `【HTML参考：${wb.title || '无标题'}】\n${String(wb.content || '').trim()}`
            ).join('\n\n');

            resolve(content);
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

// 清除聊天记录 (标准版：只清空对话，保留记忆)
function clearChatHistory() {
    if (!currentChatId) {
        alert('请先打开角色信息页面');
        return;
    }
    
    const chat = chats.find(c => c.id === currentChatId);
    if (!chat) return;
    
    // 简单的确认提示
    if (!confirm(`确定要清空与"${chat.name}"的聊天记录吗？`)) {
        return;
    }
    
    // 从数据库删除当前角色的消息
    loadFromDB('messages', (data) => {
        // 1. 获取并过滤消息
        const allData = data && data.list ? data.list : [];
        const remainingMessages = allData.filter(m => m.chatId !== currentChatId);
        
        // 2. 保存回数据库
        const transaction = db.transaction(['messages', 'chats'], 'readwrite');
        
        // 更新消息表
        transaction.objectStore('messages').put({ id: 1, list: remainingMessages });
        
        // 更新聊天列表状态 (清空预览和未读)
        chat.lastMessage = '';
        chat.lastMessageTime = getCurrentTime();
        chat.time = '刚刚';
        chat.unread = 0;
        transaction.objectStore('chats').put({ id: 1, list: chats });
        
          // 3. 清空内存中的消息
        allMessages = [];
        visibleMessagesCount = 30;

          // ★★★ 新增：清空缓存，防止刷新后读到旧数据 ★★★
        if (window.__messagesCache) {
            window.__messagesCache[currentChatId] = [];
        }
        
        // 4. 事务完成后刷新界面
        transaction.oncomplete = () => {
            renderMessages();
            renderChatList();
            alert('聊天记录已清空');
        };
    });
}


// ============ 朋友圈分组功能 (仅管理 + 选择成员) ============
let chatGroups = []; // 自定义分组列表（不包含系统默认“全员”）
let momentsGroupPendingName = ''; // 新建分组时临时保存名字
let momentsGroupEditingId = null; // 当前正在编辑成员的分组ID（null 表示新建流程）

// ====== 用户评论状态 START ======
let currentCommentMomentId = null;
let currentCommentReplyToName = null; // null 表示评论动态；非 null 表示回复某人
// ====== 用户评论状态 END ======


// ====== Moments Settings Data START ======
let momentsSettings = {
    subApiSchemeId: null,
    publisherMode: 'all',          // 'all' | 'specified' | 'random'
    specifiedChatIds: [],
    randomCount: 1,
    autoPublishEnabled: false,
    autoPublishIntervalValue: 30,
    autoPublishIntervalUnit: 'minutes', // 'minutes' | 'hours'
    characterImageEnabled: false,           // 主开关
    characterImageMode: 'text',             // 模式：'text' | 'worldbook' | 'ai'
    characterImageProb: 50  
};

let momentsAutoPublishing = false;
let momentsAutoPublishTimerId = null;
// ====== Moments Settings Data END ======



// ============ 朋友圈功能模块 (适配版) ============
let moments = [];
// ★★★ 新增：分页控制变量 ★★★
let visibleMomentsCount = 10; 
let momentsProfile = { userId: 'me', name: '我的名字', avatar: null, cover: null, nameColor: '#ffffff' };
let newMomentImages = [];

// ====== 评论按钮加载态 START ======
let currentCommentBtnEl = null;
// ====== 评论按钮加载态 END ======

// ====== 角色配图UI控制 START ======

// 更新配图概率显示
function updateCharacterImageProbDisplay() {
    const slider = document.getElementById('characterImageProbSlider');
    const display = document.getElementById('characterImageProbDisplay');
    if (slider && display) {
        display.textContent = slider.value + '%';
    }
}

// 检查配图模式状态（不调用API）
function checkCharacterImageStatus(mode) {
    const scheme = getSubApiScheme();
    const hasSubApi = scheme && scheme.baseUrl && scheme.apiKey && scheme.defaultModel;
    
    if (mode === 'text') {
        return {
            available: hasSubApi,
            message: hasSubApi ? '✅ 副API方案已配置' : '❌ 副API方案未配置，无法使用文字图模式'
        };
    }
    
    if (mode === 'worldbook') {
        if (!hasSubApi) {
            return { available: false, message: '❌ 副API方案未配置' };
        }
        
        // 统计角色的世界书图片
        const singles = Array.isArray(chats) ? chats.filter(c => c.type === 'single') : [];
        const stats = [];
        
        singles.forEach(chat => {
            loadFromDB('characterInfo', (data) => {
                const charData = data && data[chat.id] ? data[chat.id] : {};
                const linkedIds = charData.linkedWorldbooks || [];
                
                if (linkedIds.length === 0) return;
                
                loadFromDB('worldbooks', (wbData) => {
                    const allWorldbooks = Array.isArray(wbData) ? wbData : [];
                    const imageBooks = allWorldbooks.filter(wb => 
                        linkedIds.includes(wb.id) && 
                        wb.category === 'ai发图' &&
                        wb.content && 
                        (wb.content.includes('http://') || wb.content.includes('https://'))
                    );
                    
                    if (imageBooks.length > 0) {
                        stats.push({
                            name: chat.name,
                            count: imageBooks.length
                        });
                    }
                });
            });
        });
        
        // 简化版：同步检查（异步版本太复杂）
        if (stats.length === 0) {
            return {
                available: false,
                message: '✅ 副API方案已配置\n❌ 没有角色关联"ai发图"世界书\n   建议：在世界书页面创建分类为"ai发图"的条目'
            };
        }
        
        const details = stats.map(s => 
            `   - ${s.name}：${s.count}张${s.count < 3 ? '（⚠️ 数量较少）' : ''}`
        ).join('\n');
        
        return {
            available: true,
            message: `✅ 副API方案已配置\n✅ 当前有 ${stats.length} 个角色关联了"ai发图"世界书\n${details}`
        };
    }
    
    if (mode === 'ai') {
        if (!hasSubApi) {
            return { available: false, message: '❌ 副API方案未配置' };
        }
        
        const hasImageApi = currentImageApiConfig && currentImageApiConfig.enabled && 
                           currentImageApiConfig.baseUrl && 
                           currentImageApiConfig.apiKey && 
                           currentImageApiConfig.model;
        
        if (!hasImageApi) {
            return {
                available: false,
                message: '✅ 副API方案已配置\n❌ 绘图API未配置/未开启\n   建议：在API设置中配置绘图API'
            };
        }
        
        return {
            available: true,
            message: '✅ 副API方案已配置\n✅ 绘图API已配置且已开启'
        };
    }
    
    return { available: false, message: '未知模式' };
}

// 更新状态检查显示
function updateCharacterImageStatusDisplay() {
    const box = document.getElementById('characterImageStatusBox');
    const modeSelect = document.getElementById('characterImageModeSelect');
    
    if (!box || !modeSelect) return;
    
    const mode = modeSelect.value;
    const status = checkCharacterImageStatus(mode);
    
    box.textContent = '📊 ' + status.message;
}

// ====== 角色配图UI控制 END ======



// 滚动监听 (可选：如果你想做标题栏透明渐变效果，可以在这里加逻辑)
function handleMomentsScroll(el) {
    // 暂时不需要特殊处理，保留接口
}

function loadMomentsProfile() {
    loadFromDB('momentsProfile', (data) => {
        if (!data || !data.name) {
            const mainName = document.getElementById('mainUserId').textContent || '我的名字';
            const mainAvatar = document.querySelector('#mainAvatar img')?.src || null;

            momentsProfile = {
                userId: 'me',
                name: mainName,
                avatar: mainAvatar,
                cover: null,
                nameColor: '#ffffff'
            };

            saveToDB('momentsProfile', momentsProfile);
        } else {
            momentsProfile = data;

            if (!momentsProfile.userId) {
                momentsProfile.userId = 'me';
            }

            if (!momentsProfile.nameColor) {
                momentsProfile.nameColor = '#ffffff';
            }
        }

        renderMomentsHeader();
    });
}


function renderMomentsHeader() {
    // 名字
    const nameEl = document.getElementById('momentsUserName');
    nameEl.textContent = momentsProfile.name || 'User';
    nameEl.style.color = momentsProfile.nameColor || '#ffffff';

    // 头像
    const avatarEl = document.getElementById('momentsUserAvatar');
    if (momentsProfile.avatar) {
        avatarEl.innerHTML = `<img src="${momentsProfile.avatar}">`;
    } else {
        avatarEl.textContent = momentsProfile.name ? momentsProfile.name[0] : '👤';
    }

    // 封面
    const coverEl = document.getElementById('momentsCover');
    if (momentsProfile.cover) {
        coverEl.style.backgroundImage = `url(${momentsProfile.cover})`;
    } else {
        coverEl.style.backgroundImage = 'radial-gradient(#ffffff 20%, transparent 20%), linear-gradient(#e6e6e6, #e6e6e6)';
    }
}



// 加载动态列表 (修复版：正确处理数据格式)
// 在 loadMoments() 函数末尾添加（约第2550行）
function loadMoments() {
    loadFromDB('moments', (data) => {
        if (Array.isArray(data)) {
            moments = data;
        } else if (data && Array.isArray(data.list)) {
            moments = data.list;
        } else {
            moments = [];
        }
        
        // 按时间倒序排列
        moments.sort((a, b) => b.timestamp - a.timestamp);
        visibleMomentsCount = 10;

        // ★★★ 新增：修复破损的AI生图 ★★★
        let needSave = false;
        moments.forEach(m => {
            // ★★★ 新增：历史数据迁移，补 imageModeSnapshot ★★★
if (!m.imageModeSnapshot && m.imageType) {
    m.imageModeSnapshot = m.imageType;
    needSave = true;
}
            if (m.imageType === 'ai_generating') {
                // 生成中状态超过5分钟，标记为失败
                const elapsed = Date.now() - (m.timestamp || 0);
                if (elapsed > 5 * 60 * 1000) {
                    console.log('[修复] 清理超时的生成中状态:', m.id);
                    m.images = [];
                    m.imageType = null;
                    needSave = true;
                }
            } else if (m.imageType === 'ai' && Array.isArray(m.images) && m.images.length > 0) {
                // 检查AI生图URL是否有效
                const url = m.images[0];
                if (!url || (!url.startsWith('http') && !url.startsWith('data:image'))) {
                    console.log('[修复] 清理无效的AI生图URL:', m.id);
                    m.images = [];
                    m.imageType = null;
                    needSave = true;
                }
            }
        });

        if (needSave) {
            saveToDB('moments', { list: moments });
        }

        renderMomentsList();
    });
}

// ====== Moments Render List (With Comments) START ======
// ====== 朋友圈渲染函数 (带分页功能) ======
function renderMomentsList() {
    const container = document.getElementById('momentsList');
    if (!moments || moments.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:40px; color:#999; font-size:13px;">暂无动态，点击右上角相机发布</div>`;
        return;
    }
    
    // ★★★ 防御性检查：防止变量未定义导致显示全部 ★★★
    if (typeof visibleMomentsCount === 'undefined') {
        visibleMomentsCount = 10;
    }

    // ★★★ 核心：只截取前 N 条 ★★★
    const visibleList = moments.slice(0, visibleMomentsCount);
    
    const listHtml = visibleList.map(m => {
        // ★★★ 新增：渲染时优先使用历史快照 ★★★
const lockedType = m.imageModeSnapshot || m.imageType;

   
       // 1. 图片处理
let imagesHtml = '';



if (m.images && m.images.length > 0) {
    if (lockedType === 'text_image') {
        const textContent = m.images[0] && m.images[0].content ? m.images[0].content : (m.imageDesc || '图片');
        const placeholderUrl = 'https://i.postimg.cc/XNhBhGcF/1771083959929.png';
        imagesHtml = `<div class="fc-images"><img src="${placeholderUrl}" class="fc-img-single" onclick="showTextImageDetail('${encodeURIComponent(textContent)}')" style="cursor: pointer; width: 100%; border-radius: 8px;"></div>`;
    } else if (lockedType === 'ai_generating') {
        imagesHtml = `<div class="fc-images"><div class="text-image-card" style="background: linear-gradient(135deg, #a8a8a8 0%, #6e6e6e 100%);"><div class="text-image-content">🎨 生成中...</div></div></div>`;
    } else {
        // lockedType === 'ai' / 'worldbook' / 其他图片类型，都走真实图片渲染
        const imgClass = m.images.length === 1 ? 'fc-img-single' : 'fc-img-grid';
        imagesHtml = `<div class="fc-images">${
            m.images.map(img => {
                if (typeof img === 'object') return '';
                return `<img src="${img}" class="${imgClass}" onclick="viewImage('${img}')">`;
            }).join('')
        }</div>`;
    }
}
        
        // 2. 头像
        let avatarHtml = m.authorAvatar ? `<img src="${m.authorAvatar}">` : (m.authorName ? m.authorName[0] : '👤');

        // 3. 评论区
        let commentsHtml = '';
        if (m.commentsList && m.commentsList.length > 0) {
            const rows = m.commentsList.map(c => {
                let contentHtml = '';
                if (c.replyToName) {
                    contentHtml = `<span class="fc-comment-name" onclick="replyToComment(${m.id}, '${c.id}', '${c.senderName}')">${c.senderName}</span> <span style="color:#999;font-size:12px;">回复</span> <span class="fc-comment-name">${c.replyToName}</span>：<span class="fc-reply-text">${c.content}</span>`;
                } else {
                    contentHtml = `<span class="fc-comment-name" onclick="replyToComment(${m.id}, '${c.id}', '${c.senderName}')">${c.senderName}</span>：<span class="fc-reply-text">${c.content}</span>`;
                }
                return `<div class="fc-comment-row">${contentHtml}</div>`;
            }).join('');
            commentsHtml = `<div class="fc-comments-box">${rows}</div>`;
        }

        // 4. 卡片HTML
        return `
        <div class="feed-card" id="moment-${m.id}">
            <div class="fc-header">
                <div class="fc-avatar">${avatarHtml}</div>
                <div class="fc-user-info">
                    <div class="fc-name">${m.authorName}</div>
                    <div class="fc-time">${formatTimeAgo(m.timestamp)}</div>
                </div>
                <div class="fc-more" onclick="deleteMoment(${m.id})">${m.authorId === 'me' ? '删除' : '•••'}</div>
            </div>
            <div class="fc-content">${m.content}</div>
            ${imagesHtml}
            ${renderMomentVisibilityTag(m)}
            <div class="fc-actions">
                <div class="fc-action-item" onclick="generateAiComments(${m.id}, this)">
                    <svg class="icon" viewBox="0 0 24 24"><path d="M9 18h6"></path><path d="M10 22h4"></path><path d="M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7z"></path></svg>
                    <span style="font-size:12px; margin-left:4px;">互动</span>
                </div>
                <div class="fc-action-item" id="commentBtn-${m.id}" onclick="openCommentInput(${m.id})">
                    <svg class="icon" viewBox="0 0 24 24"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                    <span style="font-size:12px; margin-left:4px;">评论</span>
                </div>
                <div class="fc-action-item" style="margin-left:auto;" onclick="openMomentForwardModal(${m.id})">
                   <svg class="icon" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                </div>
            </div>
            ${commentsHtml}
        </div>
        `;
    }).join('');

    // ★★★ 核心：生成“查看更多”按钮 ★★★
    let loadMoreHtml = '';
    if (moments.length > visibleMomentsCount) {
        const remaining = moments.length - visibleMomentsCount;
        loadMoreHtml = `
            <div onclick="loadMoreMoments()" style="
                text-align: center; 
                padding: 15px; 
                color: #667eea; 
                font-size: 13px; 
                cursor: pointer; 
                background: rgba(255,255,255,0.5);
                margin: 10px 0 30px 0;
                border-radius: 8px;
                user-select: none;
            ">
                查看更多动态 (${remaining})
            </div>
        `;
    } else if (moments.length > 0) {
        loadMoreHtml = `
            <div style="text-align: center; padding: 20px; color: #ccc; font-size: 12px; margin-bottom: 20px;">
                - 到底啦 -
            </div>
        `;
    }

    container.innerHTML = listHtml + loadMoreHtml;
}

// ★★★ 必须添加这个函数，否则点击按钮会报错 ★★★
function loadMoreMoments() {
    visibleMomentsCount += 10;
    renderMomentsList();
}

// ====== Moments Render List (With Comments) END ======



// 辅助：时间格式化
function formatTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const min = 60 * 1000;
    const hour = 60 * min;
    const day = 24 * hour;
    if (diff < min) return '刚刚';
    if (diff < hour) return Math.floor(diff / min) + '分钟前';
    if (diff < day) return Math.floor(diff / hour) + '小时前';
    return new Date(timestamp).toLocaleDateString();
}

// 发布功能
function openPostMomentModal() {
    // ========== 新增：隐藏相机按钮 ==========
    const addBtn = document.querySelector('.chat-screen .add-btn');
    if (addBtn) {
        addBtn.style.display = 'none';
    }
    // ========== 新增结束 ==========
    
    // 清空之前的内容
    document.getElementById('momentContent').value = '';
    document.getElementById('momentImgGrid').innerHTML = `
        <div class="post-add-box" onclick="document.getElementById('momentImgInput').click()">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </div>
    `;
    momentImages = [];
    
    // 显示弹窗
    document.getElementById('postMomentModal').style.display = 'flex';
}

function closePostMomentModal(event) {
    if (event && event.target !== event.currentTarget) return;
    
    // ========== 新增：恢复显示相机按钮 ==========
    const addBtn = document.querySelector('.chat-screen .add-btn');
    if (addBtn && currentChatTab === 'moments') {
        addBtn.style.display = 'block';
    }
    // ========== 新增结束 ==========
    
    document.getElementById('postMomentModal').style.display = 'none';
    
    // 清空内容
    document.getElementById('momentContent').value = '';
    document.getElementById('momentImgGrid').innerHTML = `
        <div class="post-add-box" onclick="document.getElementById('momentImgInput').click()">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </div>
    `;
    momentImages = [];
}

function handleMomentImgSelect(input) {
    const files = Array.from(input.files);
    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            // ★★★ 核心优化：上传前压缩图片 ★★★
            // 使用现有的 compressImageToDataUrl 函数 (最大1024px, 质量0.7)
            compressImageToDataUrl(e.target.result, 1024, 0.7).then(compressedData => {
                newMomentImages.push(compressedData);
                renderUploadGrid();
            }).catch(err => {
                console.error("图片压缩失败，使用原图", err);
                newMomentImages.push(e.target.result);
                renderUploadGrid();
            });
        };
        reader.readAsDataURL(file);
    });
    input.value = '';
}

// 重新渲染图片网格 (修复版：彻底重绘，防止图标错乱)
function renderUploadGrid() {
    const grid = document.getElementById('momentImgGrid');
    if (!grid) return;

    // 1. 清空当前网格
    grid.innerHTML = '';

    // 2. 遍历图片数组，生成图片预览框
    newMomentImages.forEach((img, index) => {
        const div = document.createElement('div');
        div.className = 'uploaded-img-box';
        div.innerHTML = `
            <img src="${img}">
            <div class="remove-img-btn" onclick="removeNewMomentImg(${index})">×</div>
        `;
        grid.appendChild(div);
    });

    // 3. 最后追加“添加按钮”
    // (只有当图片少于9张时才显示添加按钮，防止溢出，可选)
    if (newMomentImages.length < 9) {
        const addBtn = document.createElement('div');
        addBtn.className = 'post-add-box';
        addBtn.onclick = function() {
            document.getElementById('momentImgInput').click();
        };
        // 保持和 HTML 里一致的 SVG 图标
        addBtn.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
        `;
        grid.appendChild(addBtn);
    }
}


function removeNewMomentImg(index) {
    newMomentImages.splice(index, 1);
    renderUploadGrid();
}

// ====== 用户发布动态（含可见性）START ======
function publishMoment() {
    const content = document.getElementById('momentContent').value.trim();
    if (!content && newMomentImages.length === 0) {
        alert('说点什么吧...');
        return;
    }

    // 中文注释：分组可见必须选分组
    if (draftMomentVisibility.mode === 'group' && !draftMomentVisibility.groupId) {
        alert('请选择一个分组');
        return;
    }

    const newMoment = {
        id: Date.now(),
        authorId: 'me',
        authorName: momentsProfile.name,
        authorAvatar: momentsProfile.avatar,
        content: content,
        images: [...newMomentImages],
        likes: 0,
        isLiked: false,
        comments: 0,
        commentsList: [], // 中文注释：初始化评论列表
        timestamp: Date.now(),
        type: 'user',

        // 中文注释：新增可见性字段（老动态没有则默认public）
        visibility: {
            mode: draftMomentVisibility.mode,
            groupId: draftMomentVisibility.groupId
        }
    };



    moments.unshift(newMoment);
    saveToDB('moments', { list: moments });
    renderMomentsList();
    closePostMomentModal();
    autoVisionBroadcastForUserMoment(newMoment);
}
// ====== 用户发布动态（含可见性）END ======

async function autoVisionBroadcastForUserMoment(moment) {
    try {
        if (!moment || moment.authorId !== 'me') return;
        if (!Array.isArray(moment.images) || moment.images.length === 0) return;

        const scheme = getSubApiScheme();
        if (!scheme || !scheme.baseUrl || !scheme.apiKey || !scheme.defaultModel) return;

        const visionImages = await compressImagesForVision(moment.images);
        if (!visionImages || visionImages.length === 0) return;

        const summaryObj = await callSubApiVisionSummarizeMoment({
            baseUrl: scheme.baseUrl,
            apiKey: scheme.apiKey,
            model: scheme.defaultModel,
            momentText: moment.content,
            visionImages
        });

        if (!summaryObj || !Array.isArray(summaryObj.images)) return;

        const lines = summaryObj.images
            .slice(0, 3)
            .map(it => `${it.idx}) ${it.desc}`)
            .join('\n');
        const overall = summaryObj.overall ? `\n总体：${summaryObj.overall}` : '';
        const visionSummaryText = (lines + overall).trim();

        broadcastVisionSummaryToAllSingleChats({
            momentId: moment.id,
            authorId: moment.authorId,
            authorName: momentsProfile && momentsProfile.name ? momentsProfile.name : '用户',
            timestamp: moment.timestamp,
            content: moment.content || '',
            visionSummaryText
        });
    } catch (e) {
        console.warn('[autoVisionBroadcastForUserMoment] failed:', e);
    }
}


function deleteMoment(id) {
    if (confirm('确定删除这条动态吗？')) {
        moments = moments.filter(m => m.id !== id);
        saveToDB('moments', { list: moments });
        renderMomentsList();
    }
}

function toggleLike(id) {
    const m = moments.find(item => item.id === id);
    if (m) {
        if (m.isLiked) { m.likes--; m.isLiked = false; }
        else { m.likes++; m.isLiked = true; }
        saveToDB('moments', { list: moments });
        renderMomentsList();
    }
}

// 资料编辑
function openEditMomentsProfile() {
    document.getElementById('momentsProfileName').value = momentsProfile.name || '';
    document.getElementById('momentsProfileNameColor').value = momentsProfile.nameColor || '#ffffff';

    const preview = document.getElementById('momentsProfileAvatarPreview');
    if (momentsProfile.avatar) {
        preview.innerHTML = `<img src="${momentsProfile.avatar}" style="width:100%;height:100%;object-fit:cover;">`;
    } else {
        preview.textContent = '👤';
    }

    document.getElementById('momentsProfileModal').style.display = 'flex';
}

function closeEditMomentsProfile(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('momentsProfileModal').style.display = 'none';
}


function handleCoverSelect(input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            // ★★★ 修复：确保 momentsProfile 对象存在且有 userId ★★★
            if (!momentsProfile) {
                momentsProfile = { userId: 'me', name: '我的名字', avatar: null };
            }
            if (!momentsProfile.userId) {
                momentsProfile.userId = 'me';
            }

            // 更新封面
            momentsProfile.cover = e.target.result;
            
            // 保存
            saveToDB('momentsProfile', momentsProfile);
            renderMomentsHeader();
        };
        reader.readAsDataURL(file);
    }
}


function handleMomentsAvatarSelect(input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('momentsProfileAvatarPreview').innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;">`;
            input.dataset.tempAvatar = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

function saveMomentsProfile() {
    const newName = document.getElementById('momentsProfileName').value.trim();
    const newColor = document.getElementById('momentsProfileNameColor').value || '#ffffff';

    const avatarInput = document.getElementById('momentsAvatarInput');
    const tempAvatar = avatarInput.dataset.tempAvatar;

    if (newName) momentsProfile.name = newName;
    momentsProfile.nameColor = newColor;

    if (tempAvatar) {
        momentsProfile.avatar = tempAvatar;
        delete avatarInput.dataset.tempAvatar;
    }

    saveToDB('momentsProfile', momentsProfile);
    renderMomentsHeader();
    closeEditMomentsProfile();
}





// ============ 文字图功能模块 ============

function openTextImageModal() {
    document.getElementById('textImageContent').value = '';
    document.getElementById('textImageModal').style.display = 'flex';
    setTimeout(() => document.getElementById('textImageContent').focus(), 100);
}

function closeTextImageModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('textImageModal').style.display = 'none';
}

function sendTextImage() {
    const content = document.getElementById('textImageContent').value.trim();
    if (!content) {
        alert('请填写内容');
        return;
    }
    
    const newId = allMessages.length > 0 ? Math.max(...allMessages.map(m => m.id || 0)) + 1 : 1;
    
    const newMessage = {
        id: newId,
        chatId: currentChatId,
        type: 'text_image',
        content: content, // ← 确认这里没有 `[图片：${content}]`
        senderId: 'me',
        time: getCurrentTime(),
        isRevoked: false
    };
    
    allMessages.push(newMessage);
    saveMessages();
    updateChatLastMessage(currentChatId, '[文字图]');
    
    visibleMessagesCount = Math.min(visibleMessagesCount + 1, allMessages.length);
    renderMessages();
    scrollToBottom();
    
    closeTextImageModal();
}



// ============ 文字图详情展示 (兼容：旧壳/新纯描述) ============
function showTextImageDetail(encodedContent) {
    try {
        console.log('🔍 收到编码内容:', encodedContent?.slice(0, 100));
        
        let content = decodeURIComponent(encodedContent || '');
        content = String(content).trim();

        console.log('📝 解码后内容:', content);

        // 兼容去壳：
        // 【图片：xxx】 / [图片：xxx] / 【图片:xxx】 / [图片:xxx]
        const m = content.match(/^[【\[]\s*图片\s*[:：]\s*([\s\S]*?)\s*[】\]]\s*$/);
        if (m && m[1] != null) {
            content = String(m[1]).trim();
            console.log('📝 去壳后内容:', content);
        }

        const displayEl = document.getElementById('textImageDetailContent');
        if (!displayEl) {
            console.error('❌ 未找到 textImageDetailContent 元素');
            alert('未找到显示元素 textImageDetailContent，请检查HTML');
            return;
        }

        displayEl.textContent = content; // ← 用 textContent 而不是 innerHTML
        
        const modal = document.getElementById('textImageDetailModal');
        if (!modal) {
            console.error('❌ 未找到 textImageDetailModal 元素');
            alert('未找到弹窗元素 textImageDetailModal，请检查HTML');
            return;
        }
        
        modal.style.display = 'flex';
        console.log('✅ 文字图弹窗已打开');
        
    } catch (e) {
        console.error('❌ showTextImageDetail 出错:', e);
        alert('显示文字图失败：' + e.message + '\n\n请查看控制台获取详细信息');
    }
}




// ============ 世界书图功能模块 ============

// 从【ai发图】分类中搜索匹配关键词的图片URL
async function searchWorldbookImage(keyword) {
    return new Promise((resolve) => {
        loadFromDB('worldbooks', (data) => {
            try {
                let allWorldbooks = [];
                if (Array.isArray(data)) {
                    allWorldbooks = data;
                } else if (data && Array.isArray(data.list)) {
                    allWorldbooks = data.list;
                }

                // 只在【ai发图】分类中搜索
                const aiImageBooks = allWorldbooks.filter(wb => wb && wb.category === 'ai发图');

                if (aiImageBooks.length === 0) {
                    resolve(null);
                    return;
                }

                // 模糊匹配：keyword 的任意一个字都能匹配标题
                const matched = aiImageBooks.filter(wb => {
                    const title = (wb.title || '').toLowerCase();
                    const key = keyword.toLowerCase();
                    // 标题包含关键词 或 关键词包含标题
                    return title.includes(key) || key.includes(title);
                });

                if (matched.length === 0) {
                    resolve(null);
                    return;
                }

                // 随机选一个
                const picked = matched[Math.floor(Math.random() * matched.length)];

                // 验证是否是完整的图床链接
                const url = (picked.content || '').trim();
                if (url.startsWith('http://') || url.startsWith('https://')) {
                    resolve(url);
                } else {
                    resolve(null);
                }

            } catch (e) {
                console.error('世界书图搜索出错:', e);
                resolve(null);
            }
        });
    });
}

// 从 AI 回复中提取【图片：xxx】的描述内容
function extractImageDescription(text) {
    const match = text.match(/【图片[：:]([^】]+)】/);
    if (match && match[1]) {
        return match[1].trim();
    }
    return null;
}

// 处理世界书图逻辑（在 AI 回复生成后调用）
// aiText: AI 原始回复文本
// 返回: { finalText, imageMessage } 
// imageMessage 为 null 表示不需要插入图片消息
/**
 * 从世界书中查找图片（仅在世界书模式或共存模式下调用）
 * @param {string} text - 消息文本
 * @returns {Promise<{finalText: string, imageMessage: object|null}>}
 */
async function processWorldbookImage(text) {
    // 1. 提取【图片：...】标记中的关键词
    const imageDescMatch = text.match(/【图片[:：]\s*([^】]+)】/);
    if (!imageDescMatch) {
        // 没有图片标记，直接返回
        return { finalText: text, imageMessage: null };
    }
    
    const keyword = imageDescMatch[1].trim();
    console.log('🔍 世界书查找关键词:', keyword);
    
    // 2. 从世界书中查找匹配的图片
    const worldbookImage = await findImageInWorldbook(keyword);
    
    if (worldbookImage) {
        // 找到了世界书图：删除【图片：】标记，返回图片URL
        const cleanText = text.replace(/【图片[:：][^】]+】/g, '').trim();
        console.log('✅ 世界书图已找到:', worldbookImage);
        
        return {
            finalText: cleanText,
            imageMessage: { content: worldbookImage }
        };
    } else {
        // 没找到：保持原文不变（包括【图片：】标记）
        console.log('❌ 世界书图未找到，保留文字图标记');
        return {
            finalText: text,
            imageMessage: null
        };
    }
}

/**
 * 在世界书中查找图片URL
 * @param {string} keyword - 搜索关键词
 * @returns {Promise<string|null>} - 图片URL或null
 */
async function findImageInWorldbook(keyword) {
    if (!currentChatId) return null;
    
    // 获取角色关联的世界书
    const charInfo = await new Promise(resolve => {
        loadFromDB('characterInfo', data => {
            resolve(data && data[currentChatId] ? data[currentChatId] : {});
        });
    });
    
    const linkedWorldbooks = charInfo.linkedWorldbooks || [];
    if (linkedWorldbooks.length === 0) return null;
    
    // 获取所有世界书内容
    const allWorldbooks = await new Promise(resolve => {
        loadFromDB('worldbooks', data => {
            resolve(Array.isArray(data) ? data : []);
        });
    });
    
 


// ✅ 修复后的代码（兼容多种分类名）
const imageWorldbooks = allWorldbooks.filter(wb => 
    linkedWorldbooks.includes(wb.id) && 
    (wb.category === 'image' || wb.category === 'ai发图' || wb.category === '图片')
);


    
    // 查找匹配的图片
    for (const wb of imageWorldbooks) {
        const content = String(wb.content || '');
        
        // 检查关键词是否在内容中
        if (content.includes(keyword)) {
            // 提取图片URL（支持 http/https 开头）
            const urlMatch = content.match(/(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/);
            if (urlMatch) {
                return urlMatch[1];
            }
        }
    }
    
    return null;
}






function closeTextImageDetailModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('textImageDetailModal').style.display = 'none';
}

function openMomentsGroupPanel() {
   openMomentsGroupModal();
}

function openMomentsSettingsPanel() {
    openMomentsSettingsModal();
}



//分组新增函数
function loadChatGroups(callback) {
    loadFromDB('chatGroups', (data) => {
        if (Array.isArray(data)) {
            chatGroups = data;
        } else if (data && Array.isArray(data.list)) {
            chatGroups = data.list;
        } else {
            chatGroups = [];
        }
        if (callback) callback(chatGroups);
    });
}

function saveChatGroups() {
    saveToDB('chatGroups', { list: chatGroups });
}




function openMomentsGroupModal() {
    document.getElementById('momentsNewGroupName').value = '';
    loadChatGroups(() => {
        renderMomentsGroupList();
        document.getElementById('momentsGroupModal').style.display = 'flex';
    });
}

function closeMomentsGroupModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('momentsGroupModal').style.display = 'none';
}

// ====== Moments Group List Render (With Toggle) START ======
function renderMomentsGroupList() {
    const container = document.getElementById('momentsGroupList');
    if (!container) return;

    // 1. 获取全员开关状态 (默认 true)
    const isGlobalEnabled = (momentsSettings.enableGlobalGroup !== false); // undefined 视为 true

    // 2. 计算全员人数
    const allSingles = Array.isArray(chats) ? chats.filter(c => c.type === 'single') : [];
    const allCount = allSingles.length;

    // 3. 构建全员行 (带开关)
    const systemRow = `
        <div style="display:flex; align-items:center; justify-content:space-between; padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
            <div style="display:flex; flex-direction:column; gap:4px;">
                <div style="font-size: 15px; font-weight: 700; color: #333;">全员 (默认分组)</div>
                <div style="font-size: 12px; color: #999;">${allCount} 人 · 开启后允许全员互动</div>
            </div>
            <div>
                <input type="checkbox" 
                       ${isGlobalEnabled ? 'checked' : ''} 
                       onchange="toggleGlobalGroup(this)" 
                       style="accent-color: #333; transform: scale(1.2); cursor: pointer;">
            </div>
        </div>
    `;

    // 4. 自定义分组列表
    let listHtml = '';
    if (!chatGroups || chatGroups.length === 0) {
        listHtml = `<div style="text-align:center; color:#999; padding: 20px 0; font-size: 13px;">暂无自定义分组</div>`;
    } else {
        listHtml = chatGroups.map(g => {
            const count = Array.isArray(g.memberChatIds) ? g.memberChatIds.length : 0;
            return `
                <div style="display:flex; align-items:center; justify-content:space-between; padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
                    <div style="display:flex; flex-direction:column; gap:4px; flex:1; min-width:0;">
                        <div style="font-size: 15px; font-weight: 700; color: #333; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                            ${escapeHtml(g.name)}
                        </div>
                        <div style="font-size: 12px; color: #999;">${count} 人</div>
                    </div>
                    <div style="display:flex; gap:8px; flex-shrink:0;">
                        <button class="ins-line-btn" onclick="editMomentsGroupMembers(${g.id})" style="padding: 6px 10px; font-size: 12px; border-radius: 14px; flex: none;">成员</button>
                        <button class="ins-line-btn" onclick="renameMomentsGroup(${g.id})" style="padding: 6px 10px; font-size: 12px; border-radius: 14px; flex: none;">改名</button>
                        <button class="ins-line-btn ins-btn-red-line" onclick="deleteMomentsGroup(${g.id})" style="padding: 6px 10px; font-size: 12px; border-radius: 14px; flex: none;">删除</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    container.innerHTML = systemRow + listHtml;
}

// 新增：切换全员开关的函数
function toggleGlobalGroup(checkbox) {
    momentsSettings.enableGlobalGroup = checkbox.checked;
    saveMomentsSettings();
}
// ====== Moments Group List Render (With Toggle) END ======

function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function createMomentsGroup() {
    const name = document.getElementById('momentsNewGroupName').value.trim();
    if (!name) {
        alert('请输入分组名称');
        return;
    }
    if (name === '全员') {
        alert('该名称为系统默认分组，不能使用');
        return;
    }
    if (chatGroups.some(g => g.name === name)) {
        alert('该分组已存在');
        return;
    }

    momentsGroupPendingName = name;
    momentsGroupEditingId = null; // null 表示新建流程

    // 立刻进入成员选择
    openMomentsGroupMemberSelector({
        selectedChatIds: [],
        onConfirm: (selectedChatIds) => {
            const newId = chatGroups.length > 0 ? Math.max(...chatGroups.map(g => g.id || 0)) + 1 : 1;
            const newGroup = {
                id: newId,
                name: momentsGroupPendingName,
                memberChatIds: selectedChatIds,
                createTime: getCurrentTime()
            };

            chatGroups.push(newGroup);
            saveChatGroups();

            momentsGroupPendingName = '';
            momentsGroupEditingId = null;

            renderMomentsGroupList();
            alert('分组已创建');
        }
    });
}

function renameMomentsGroup(groupId) {
    const group = chatGroups.find(g => g.id === groupId);
    if (!group) return;

    const newName = prompt('请输入新的分组名称', group.name);
    if (newName === null) return;

    const name = newName.trim();
    if (!name) {
        alert('分组名称不能为空');
        return;
    }
    if (name === '全员') {
        alert('该名称为系统默认分组，不能使用');
        return;
    }
    if (chatGroups.some(g => g.id !== groupId && g.name === name)) {
        alert('该分组名称已存在');
        return;
    }

    group.name = name;
    saveChatGroups();
    renderMomentsGroupList();
}

function deleteMomentsGroup(groupId) {
    const group = chatGroups.find(g => g.id === groupId);
    if (!group) return;

    if (!confirm(`确定删除分组 "${group.name}" 吗？`)) return;

    chatGroups = chatGroups.filter(g => g.id !== groupId);
    saveChatGroups();
    renderMomentsGroupList();
}

function editMomentsGroupMembers(groupId) {
    const group = chatGroups.find(g => g.id === groupId);
    if (!group) return;

    const selected = Array.isArray(group.memberChatIds) ? [...group.memberChatIds] : [];

    openMomentsGroupMemberSelector({
        selectedChatIds: selected,
        onConfirm: (selectedChatIds) => {
            group.memberChatIds = selectedChatIds;
            saveChatGroups();
            renderMomentsGroupList();
            alert('成员已更新');
        }
    });
}

let momentsGroupSelectedChatIds = [];
let momentsGroupOnConfirm = null;

function openMomentsGroupMemberSelector(opts) {
    const selectedChatIds = (opts && Array.isArray(opts.selectedChatIds)) ? opts.selectedChatIds : [];
    momentsGroupSelectedChatIds = [...selectedChatIds];
    momentsGroupOnConfirm = opts && typeof opts.onConfirm === 'function' ? opts.onConfirm : null;

    const singleChats = Array.isArray(chats) ? chats.filter(c => c.type === 'single') : [];
    if (singleChats.length === 0) {
        alert('暂无单聊联系人可选');
        return;
    }

    const membersList = document.getElementById('membersList');
    const selectedCountEl = document.getElementById('selectedCount');
    if (!membersList || !selectedCountEl) return;

    membersList.innerHTML = singleChats.map(chat => {
        const avatarHtml = chat.avatarImage
            ? `<img src="${chat.avatarImage}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`
            : (chat.avatar || '👤');

        const checked = momentsGroupSelectedChatIds.includes(chat.id);

        return `
            <div class="member-item" onclick="toggleMomentsGroupMember(${chat.id})">
                <input type="checkbox" class="member-checkbox" id="mg-member-${chat.id}" ${checked ? 'checked' : ''} onclick="event.stopPropagation(); toggleMomentsGroupMember(${chat.id})">
                <div class="member-avatar">${avatarHtml}</div>
                <div class="member-name">${escapeHtml(chat.name)}</div>
            </div>
        `;
    }).join('');

    selectedCountEl.textContent = String(momentsGroupSelectedChatIds.length);

    // 标记当前 selectMembersModal 是“分组成员选择模式”
    const modal = document.getElementById('selectMembersModal');
    if (modal) {
        modal.dataset.mode = 'momentsGroup';
        modal.style.display = 'flex';
    }
}

function toggleMomentsGroupMember(chatId) {
    const idx = momentsGroupSelectedChatIds.indexOf(chatId);
    if (idx >= 0) momentsGroupSelectedChatIds.splice(idx, 1);
    else momentsGroupSelectedChatIds.push(chatId);

    const checkbox = document.getElementById(`mg-member-${chatId}`);
    if (checkbox) checkbox.checked = momentsGroupSelectedChatIds.includes(chatId);

    const selectedCountEl = document.getElementById('selectedCount');
    if (selectedCountEl) selectedCountEl.textContent = String(momentsGroupSelectedChatIds.length);
}


// ====== Moments Settings DB START ======
function loadMomentsSettings(callback) {
    loadFromDB('momentsSettings', (data) => {
        if (data) {
            momentsSettings = {
                ...momentsSettings,
                ...data
            };
        }
        if (callback) callback(momentsSettings);
    });
}

function saveMomentsSettings() {
    saveToDB('momentsSettings', momentsSettings);
}
// ====== Moments Settings DB END ======

// ====== Moments Settings UI START ======
function openMomentsSettingsModal() {
    loadMomentsSettings(() => {
        renderMomentsSettingsModal();
        document.getElementById('momentsSettingsModal').style.display = 'flex';
    });
}

function closeMomentsSettingsModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('momentsSettingsModal').style.display = 'none';
}

function renderMomentsSettingsModal() {
    // 1) 副API方案下拉
    const schemeSelect = document.getElementById('momentsSubApiSchemeSelect');
    if (schemeSelect) {
        schemeSelect.innerHTML = '<option value="">请选择副API方案...</option>';

        // apiSchemes 已在你代码里全局存在
        const list = Array.isArray(apiSchemes) ? apiSchemes : [];
        list.forEach(s => {
            schemeSelect.innerHTML += `<option value="${s.id}">${escapeHtml(s.name || ('方案' + s.id))}</option>`;
        });

        schemeSelect.value = momentsSettings.subApiSchemeId ? String(momentsSettings.subApiSchemeId) : '';
    }

    // 2) 发布者模式 radio
    const radios = document.querySelectorAll('input[name="momentsPublisherMode"]');
    radios.forEach(r => {
        r.checked = (r.value === momentsSettings.publisherMode);
    });

    // 3) 指定/随机面板显示
    const specifiedPanel = document.getElementById('momentsSpecifiedPanel');
    const randomPanel = document.getElementById('momentsRandomPanel');
    if (specifiedPanel) specifiedPanel.style.display = (momentsSettings.publisherMode === 'specified') ? 'block' : 'none';
    if (randomPanel) randomPanel.style.display = (momentsSettings.publisherMode === 'random') ? 'flex' : 'none';

    // 指定角色预览
    renderMomentsSpecifiedPreview();

    // 随机人数
    const randomCountInput = document.getElementById('momentsRandomCountInput');
    if (randomCountInput) {
        randomCountInput.value = momentsSettings.randomCount || 1;
    }

    // 4) 自动发布开关与间隔面板
    const autoToggle = document.getElementById('momentsAutoPublishToggle');
    const autoPanel = document.getElementById('momentsAutoPublishPanel');
    if (autoToggle) autoToggle.checked = momentsSettings.autoPublishEnabled === true;
    if (autoPanel) autoPanel.style.display = momentsSettings.autoPublishEnabled ? 'block' : 'none';

    const intervalVal = document.getElementById('momentsAutoPublishIntervalValue');
    const intervalUnit = document.getElementById('momentsAutoPublishIntervalUnit');
    if (intervalVal) intervalVal.value = momentsSettings.autoPublishIntervalValue || 30;
    if (intervalUnit) intervalUnit.value = momentsSettings.autoPublishIntervalUnit || 'minutes';

  const imageToggle = document.getElementById('characterImageToggle');
const imagePanel = document.getElementById('characterImagePanel');
const modeSelect = document.getElementById('characterImageModeSelect');
const probSlider = document.getElementById('characterImageProbSlider');
if (imageToggle) imageToggle.checked = momentsSettings.characterImageEnabled === true;
if (imagePanel) imagePanel.style.display = momentsSettings.characterImageEnabled ? 'block' : 'none';
if (modeSelect) {
    modeSelect.value = momentsSettings.characterImageMode || 'text';
}
if (probSlider) {
    probSlider.value = momentsSettings.characterImageProb || 50;
    updateCharacterImageProbDisplay();
}

    // 6) 根据当前配置更新定时器（随时保存）
    restartMomentsAutoPublishTimer();
    updateCharacterImageStatusDisplay();
}

function renderMomentsSpecifiedPreview() {
    const preview = document.getElementById('momentsSpecifiedPreview');
    if (!preview) return;

    const ids = Array.isArray(momentsSettings.specifiedChatIds) ? momentsSettings.specifiedChatIds : [];
    if (ids.length === 0) {
        preview.textContent = '未选择';
        return;
    }

    const singleChats = Array.isArray(chats) ? chats.filter(c => c.type === 'single') : [];
    const names = ids
        .map(id => singleChats.find(c => c.id === id))
        .filter(Boolean)
        .map(c => c.name);

    preview.textContent = names.length > 0 ? names.join('、') : '未选择';
}

function handleMomentsPublisherModeChange() {
    const checked = document.querySelector('input[name="momentsPublisherMode"]:checked');
    if (!checked) return;

    momentsSettings.publisherMode = checked.value;
    saveMomentsSettings();
    renderMomentsSettingsModal();
}

function handleMomentsSettingsChange() {
    // 副API
    const schemeSelect = document.getElementById('momentsSubApiSchemeSelect');
    momentsSettings.subApiSchemeId = schemeSelect && schemeSelect.value ? parseInt(schemeSelect.value, 10) : null;

    // 随机人数
    const randomCountInput = document.getElementById('momentsRandomCountInput');
    if (randomCountInput) {
        const v = parseInt(randomCountInput.value, 10);
        momentsSettings.randomCount = Number.isFinite(v) && v > 0 ? v : 1;
        randomCountInput.value = momentsSettings.randomCount;
    }

    // 自动发布
    const autoToggle = document.getElementById('momentsAutoPublishToggle');
    momentsSettings.autoPublishEnabled = autoToggle ? autoToggle.checked : false;

    const intervalVal = document.getElementById('momentsAutoPublishIntervalValue');
    const intervalUnit = document.getElementById('momentsAutoPublishIntervalUnit');

    if (intervalVal) {
        const v = parseInt(intervalVal.value, 10);
        momentsSettings.autoPublishIntervalValue = Number.isFinite(v) && v > 0 ? v : 30;
        intervalVal.value = momentsSettings.autoPublishIntervalValue;
    }

    if (intervalUnit) {
        momentsSettings.autoPublishIntervalUnit = intervalUnit.value === 'hours' ? 'hours' : 'minutes';
    }

   const imageToggle = document.getElementById('characterImageToggle');
const imagePanel = document.getElementById('characterImagePanel');
const modeSelect = document.getElementById('characterImageModeSelect');
const probSlider = document.getElementById('characterImageProbSlider');
if (imageToggle) {
    momentsSettings.characterImageEnabled = imageToggle.checked;
}
if (imagePanel) {
    imagePanel.style.display = momentsSettings.characterImageEnabled ? 'block' : 'none';
}
if (modeSelect) {
    momentsSettings.characterImageMode = modeSelect.value;
    // 切换模式时更新状态检查
    updateCharacterImageStatusDisplay();
}
if (probSlider) {
    momentsSettings.characterImageProb = parseInt(probSlider.value) || 50;
}

    saveMomentsSettings();
    renderMomentsSettingsModal();
}
// ====== Moments Settings UI END ======

// ====== Moments Publisher Selector START ======
function openMomentsPublisherSelector() {
    const selected = Array.isArray(momentsSettings.specifiedChatIds) ? [...momentsSettings.specifiedChatIds] : [];

    openMomentsGroupMemberSelector({
        selectedChatIds: selected,
        onConfirm: (selectedChatIds) => {
            momentsSettings.specifiedChatIds = selectedChatIds;
            saveMomentsSettings();
            renderMomentsSpecifiedPreview();
        }
    });
}
// ====== Moments Publisher Selector END ======

// ====== Moments Auto Publish Timer START ======
function getMomentsIntervalMs() {
    const v = momentsSettings.autoPublishIntervalValue || 30;
    const unit = momentsSettings.autoPublishIntervalUnit || 'minutes';
    const minutes = unit === 'hours' ? v * 60 : v;
    return minutes * 60 * 1000;
}

function restartMomentsAutoPublishTimer() {
    if (momentsAutoPublishTimerId) {
        clearInterval(momentsAutoPublishTimerId);
        momentsAutoPublishTimerId = null;
    }

    if (!momentsSettings.autoPublishEnabled) return;

    const ms = getMomentsIntervalMs();
    if (!ms || ms < 60 * 1000) {
        // 最小限制 1 分钟
        return;
    }

    momentsAutoPublishTimerId = setInterval(() => {
        runAutoPublishOnce({ manual: false });
    }, ms);
}

function triggerMomentsPublishNow() {
    // 1. 关闭设置弹窗
    closeMomentsSettingsModal();
    // 2. 触发发布（传 manual: true）
    runAutoPublishOnce({ manual: true });
}


function resolveMomentsPublisherChatIds() {
    const singleChats = Array.isArray(chats) ? chats.filter(c => c.type === 'single') : [];
    const allIds = singleChats.map(c => c.id);

    if (momentsSettings.publisherMode === 'all') {
        return allIds;
    }

    if (momentsSettings.publisherMode === 'specified') {
        const ids = Array.isArray(momentsSettings.specifiedChatIds) ? momentsSettings.specifiedChatIds : [];
        return ids.filter(id => allIds.includes(id));
    }

    if (momentsSettings.publisherMode === 'random') {
        const count = Math.max(1, parseInt(momentsSettings.randomCount || 1, 10));
        // 打乱抽样
        const shuffled = [...allIds].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, Math.min(count, shuffled.length));
    }

    return allIds;
}

function getSubApiScheme() {
    if (!momentsSettings.subApiSchemeId) return null;
    const scheme = Array.isArray(apiSchemes) ? apiSchemes.find(s => s.id == momentsSettings.subApiSchemeId) : null;
    return scheme || null;
}

// ====== Moments Auto Publish Core (Loading + Clean) START ======
async function runAutoPublishOnce(opts) {
    if (momentsAutoPublishing) return;
    
    // 显示 Loading
    const loadingEl = document.getElementById('momentsPublishLoading');
    if (loadingEl) loadingEl.style.display = 'block';
    
    momentsAutoPublishing = true;

    try {
        const scheme = getSubApiScheme();
        if (!scheme) {
            if (opts && opts.manual) alert('请先在朋友圈设置里选择副API方案');
            return;
        }
        if (!scheme.baseUrl || !scheme.apiKey || !scheme.defaultModel) {
            if (opts && opts.manual) alert('副API方案配置不完整');
            return;
        }

        const publisherIds = resolveMomentsPublisherChatIds();
        if (!publisherIds || publisherIds.length === 0) {
            if (opts && opts.manual) alert('没有可发布的角色（请检查发布者设置）');
            return;
        }

        // 阶段B限制：每次最多生成 5 条
        const MAX_PER_RUN = 5;
        const targetChatIds = publisherIds.slice(0, MAX_PER_RUN);

        // 串行生成
        const generatedMoments = [];
        for (let i = 0; i < targetChatIds.length; i++) {
            const chatId = targetChatIds[i];
            const momentObj = await generateMomentForChatId(chatId, scheme);
            if (momentObj) {
                generatedMoments.push(momentObj);
            }
        }

        if (generatedMoments.length === 0) {
            if (opts && opts.manual) {
                alert('本次未生成成功的动态（接口返回空或解析失败）');
            }
            return;
        }

        // 写入 moments
        moments = Array.isArray(moments) ? moments : [];
        for (let j = generatedMoments.length - 1; j >= 0; j--) {
            moments.unshift(generatedMoments[j]);
        }

        saveToDB('moments', { list: moments });
        renderMomentsList();

        if (opts && opts.manual) {
            // 可选：生成完给个轻提示，或者什么都不弹（既然看到动态出来了）
            // alert(`已发布 ${generatedMoments.length} 条动态`);
        }
    } catch (err) {
        console.error('runAutoPublishOnce error:', err);
        if (opts && opts.manual) {
            alert('发布失败：' + (err && err.message ? err.message : '未知错误'));
        }
    } finally {
        momentsAutoPublishing = false;
        // 隐藏 Loading
        if (loadingEl) loadingEl.style.display = 'none';
    }
}
// ====== Moments Auto Publish Core (Loading + Clean) END ======



// ====== Moments Generate One (带配图支持) START ======
async function generateMomentForChatId(chatId, scheme) {
    console.log('[DBG moment] generating for chatId=', chatId);
 let needAsyncImageGeneration = null;
    const chat = Array.isArray(chats) ? chats.find(c => c.id === chatId) : null;
    if (!chat) return null;

    // 角色资料
    const charInfoAll = await loadCharacterInfoAllSafe();
    const charData = charInfoAll && charInfoAll[chatId] ? charInfoAll[chatId] : {};

    // 显示名：备注优先
    const displayName = (charData.remark && String(charData.remark).trim())
        ? String(charData.remark).trim()
        : (chat.name || '角色');

    // 环境碎片
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const hhmm = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

    let timeDesc = '白天';
    if (hour >= 5 && hour < 9) timeDesc = '清晨';
    else if (hour >= 9 && hour < 12) timeDesc = '上午';
    else if (hour >= 12 && hour < 14) timeDesc = '中午';
    else if (hour >= 14 && hour < 18) timeDesc = '下午';
    else if (hour >= 18 && hour < 23) timeDesc = '晚上';
    else timeDesc = '深夜';

    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekDesc = weekDays[now.getDay()];

    // 天气信息
    let cityName = '';
    let todayWeather = '';
    let tomorrowWeather = '';

    if (charData.cityInfoEnabled && charData.charWeather) {
        cityName = charData.charVirtualAddress || charData.charRealAddress || '';

        if (charData.charWeather.today) {
            const t = charData.charWeather.today;
            todayWeather = `${t.condition || ''} ${t.temp || ''}`.trim();
        }
        if (charData.charWeather.tomorrow) {
            const tm = charData.charWeather.tomorrow;
            tomorrowWeather = `${tm.condition || ''} ${tm.temp || ''}`.trim();
        }
    }

    // 节奏感
    const lastChatGapDesc = await getLastChatGapDesc(chatId);
    const birthdayHintShort = getBirthdayHintShort(charData.birthday);

    // ★★★ 新增：预处理节奏感描述，避免"你"的出现 ★★★
let processedGapDesc = lastChatGapDesc;
if (processedGapDesc && processedGapDesc !== '未知' && processedGapDesc !== '很久了') {
    // 如果描述里有时间单位，保留；否则添加"前"
    if (!processedGapDesc.includes('前') && !processedGapDesc.includes('刚刚')) {
        processedGapDesc = processedGapDesc + '前';
    }
}

    // 历史消息
    const historyText = await getChatHistoryForPrompt(chatId, 100);

    // 👇 新增：判断是否配图
    const needImage = momentsSettings.characterImageEnabled && 
                     (Math.random() * 100 < momentsSettings.characterImageProb);

    // 构建提示词
const prompt = buildMomentPrompt({
    displayName,
    personality: charData.personality || '',
    relationshipText: charData.relationshipText || '',
    userName: (momentsProfile && momentsProfile.name) ? momentsProfile.name : '用户',
    historyText,
    timeDesc,
    hhmm,
    weekDesc,
    cityName,
    todayWeather,
    tomorrowWeather,
    lastChatGapDesc: processedGapDesc,
    birthdayHintShort,
    needImage: needImage
});

// 调用API生成
const content = await callSubApiGenerateMoment({
    baseUrl: scheme.baseUrl,
    apiKey: scheme.apiKey,
    model: scheme.defaultModel,
    prompt
});

if (!content) return null;

// 👇 解析返回结果（保存到临时变量）
let parsedData = null;
let momentContent = '';
let momentImageDesc = '';  // 👈 改名，避免变量冲突

try {
    parsedData = typeof content === 'string' ? JSON.parse(content) : content;
    momentContent = parsedData.content || '';
    momentImageDesc = parsedData.imageDesc || '';  // 👈 使用新变量名
    
    console.log('[DBG] 解析成功:', { momentContent, momentImageDesc });
} catch (e) {
    console.error('[DBG] JSON解析失败:', e);
    momentContent = String(content).trim();
}

// 👇 处理配图（使用新变量名）
let momentImages = [];
let imageType = null;

console.log('[DBG] 配图判断:', { needImage, momentImageDesc, mode: momentsSettings.characterImageMode });

if (needImage && momentImageDesc) {  // 👈 使用新变量名
    const mode = momentsSettings.characterImageMode;
    
    if (mode === 'text') {
        // 文字图
        momentImages = [{ type: 'text_image', content: momentImageDesc }];  // 👈 使用新变量名
        imageType = 'text_image';
        console.log('[DBG] 文字图已生成');
    } 
    else if (mode === 'worldbook') {
        // 世界书图
        const url = await matchWorldbookImage(chatId, momentContent, momentImageDesc, scheme);  // 👈 使用新变量名
        if (url) {
            momentImages = [url];
            imageType = 'worldbook';
            console.log('[DBG] 世界书图已匹配');
        }
    } 
else if (mode === 'ai') {
    // 检查绘图API是否配置
    if (!currentImageApiConfig || !currentImageApiConfig.enabled) {
        console.warn('[AI生图] 绘图API未配置，跳过配图');
    } else {
        // AI生图（先占位）
        momentImages = [{ type: 'ai_generating', prompt: momentImageDesc }];
        imageType = 'ai_generating';
        
        // 👇 新增：标记需要异步生图
        // 这个标记会在动态保存后触发生图
        needAsyncImageGeneration = {
            momentId: null,  // 稍后会填入真实ID
            prompt: momentImageDesc
        };
    }
}
} else {
    console.log('[DBG] 跳过配图:', { needImage, hasMomentImageDesc: !!momentImageDesc });
}

console.log('[DBG] 最终配图数据:', { momentImages, imageType });

const newMoment = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    authorId: chatId,
    authorName: displayName,
    authorAvatar: chat.avatarImage || null,
    content: momentContent,
    imageDesc: momentImageDesc,
    images: momentImages,
    imageType: imageType,
    imageModeSnapshot: imageType || null, // ★ 历史锁：记录发布当下类型

    // ★★★ 新增：发布当下图片模式快照（历史锁）★★★
    imageModeSnapshot: imageType || null,

    likes: 0,
    isLiked: false,
    comments: 0,
    commentsList: [],
    timestamp: Date.now(),
    type: 'character'
};

if (needAsyncImageGeneration) {
    needAsyncImageGeneration.momentId = newMoment.id;
    
    // 异步触发生图（不阻塞返回）
    setTimeout(() => {
        triggerMomentAiImageGeneration(
            needAsyncImageGeneration.momentId,
            needAsyncImageGeneration.prompt
        );
    }, 1000);
}
console.log('[DBG moment] created moment authorId=', newMoment.authorId, 'authorName=', newMoment.authorName, 'content=', (newMoment.content || '').slice(0, 30));
return newMoment;
}
// ====== Moments Generate One (带配图支持) END ======


// ====== 朋友圈动态异步生图（修复版：永久保存）START ======
async function triggerMomentAiImageGeneration(momentId, prompt) {
    console.log('[AI生图] 开始为动态', momentId, '生成图片，提示词:', prompt);
    
    try {
        // 1. 检查绘图配置
        if (!currentImageApiConfig || !currentImageApiConfig.enabled) {
            console.error('[AI生图] 绘图API未配置');
            updateMomentImageToFailed(momentId);
            return;
        }
        
        // 2. 构建生图API URL
        let url = currentImageApiConfig.baseUrl;
        if (!url.endsWith('/images/generations')) {
            url = url.endsWith('/') ? url + 'images/generations' : url + '/images/generations';
        }
        
        // 3. 调用生图API
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentImageApiConfig.apiKey}`
            },
            body: JSON.stringify({
                model: currentImageApiConfig.model,
                prompt: prompt,
                n: 1,
                size: "1024x1024"
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            const errMsg = data.error ? data.error.message : '未知错误';
            console.error('[AI生图] 失败:', errMsg);
            updateMomentImageToFailed(momentId);
            return;
        }
        
        if (!data.data || data.data.length === 0 || !data.data[0].url) {
            console.error('[AI生图] API返回数据异常');
            updateMomentImageToFailed(momentId);
            return;
        }

        // ★★★ 核心修复：处理图片URL ★★★
        const imageUrl = data.data[0].url;
        console.log('[AI生图] 收到图片URL:', imageUrl.substring(0, 100) + '...');

        // 判断URL类型
        if (imageUrl.startsWith('data:image')) {
            // ===== 情况1：Base64格式（永久有效）=====
            console.log('[AI生图] Base64格式，直接保存');
            
            // 可选：压缩后保存（节省空间）
            try {
                const compressed = await compressImageToDataUrl(imageUrl, 1024, 0.7);
                updateMomentImageToSuccess(momentId, compressed);
            } catch (e) {
                console.warn('[AI生图] 压缩失败，保存原图:', e);
                updateMomentImageToSuccess(momentId, imageUrl);
            }
            
        } else if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
            // ===== 情况2：HTTP链接（可能是临时URL）=====
            console.log('[AI生图] HTTP链接，转换为Base64永久保存');
            
            try {
                // 下载图片
                const imgResponse = await fetch(imageUrl);
                if (!imgResponse.ok) {
                    throw new Error('图片下载失败: ' + imgResponse.status);
                }
                
                const blob = await imgResponse.blob();
                
                // 转换为Base64
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const base64 = e.target.result;
                        
                        // 压缩后保存
                        const compressed = await compressImageToDataUrl(base64, 1024, 0.7);
                        updateMomentImageToSuccess(momentId, compressed);
                        
                        console.log('[AI生图] 已转换为Base64并压缩保存');
                    } catch (compressErr) {
                        console.warn('[AI生图] 压缩失败，保存原Base64:', compressErr);
                        updateMomentImageToSuccess(momentId, e.target.result);
                    }
                };
                
                reader.onerror = () => {
                    console.error('[AI生图] Base64转换失败');
                    // 降级：直接保存URL（可能过期）
                    updateMomentImageToSuccess(momentId, imageUrl);
                };
                
                reader.readAsDataURL(blob);
                
            } catch (downloadErr) {
                console.error('[AI生图] 图片下载失败:', downloadErr);
                // 降级：直接保存URL（可能过期，但总比没有好）
                updateMomentImageToSuccess(momentId, imageUrl);
            }
            
        } else {
            // ===== 情况3：未知格式 =====
            console.error('[AI生图] 未知URL格式:', imageUrl.substring(0, 100));
            updateMomentImageToFailed(momentId);
        }
        
    } catch (error) {
        console.error('[AI生图] 网络错误:', error);
        updateMomentImageToFailed(momentId);
    }
}
// ====== 朋友圈动态异步生图（修复版：永久保存）END ======

// ====== 更新动态图片为成功状态（增强版）START ======
function updateMomentImageToSuccess(momentId, imageUrl) {
    const moment = moments.find(m => m.id === momentId);
    if (!moment) {
        console.error('[AI生图] 找不到动态', momentId);
        return;
    }

    // ★★★ 验证URL有效性 ★★★
    if (!imageUrl || (!imageUrl.startsWith('http') && !imageUrl.startsWith('data:image'))) {
        console.error('[AI生图] 无效的图片URL:', imageUrl ? imageUrl.substring(0, 50) : 'null');
        updateMomentImageToFailed(momentId);
        return;
    }

    // 更新内存
    moment.images = [imageUrl];
    moment.imageType = 'ai';
    moment.imageModeSnapshot = 'ai'; // ★ 历史锁：这条动态永远按AI图
    
    // ★★★ 立即保存到数据库 ★★★
    saveToDB('moments', { list: moments });
    
    // ★★★ 延迟验证保存是否成功 ★★★
    setTimeout(() => {
        loadFromDB('moments', (data) => {
            const savedMoments = Array.isArray(data) ? data : (data && data.list ? data.list : []);
            const savedMoment = savedMoments.find(m => m.id === momentId);
            
            if (!savedMoment || !savedMoment.images || savedMoment.images[0] !== imageUrl) {
                console.error('[AI生图] 保存验证失败，重试保存...');
                // 重试保存
                saveToDB('moments', { list: moments });
            } else {
                console.log('[AI生图] ✅ 保存验证成功，图片已永久保存');
            }
        });
    }, 300);
    
    // 刷新显示
    renderMomentsList();
    console.log('[AI生图] 成功，已更新动态', momentId);
}
// ====== 更新动态图片为成功状态（增强版）END ======
// 更新动态图片为失败状态
function updateMomentImageToFailed(momentId) {
    const moment = moments.find(m => m.id === momentId);
    if (moment) {
        moment.images = [];
        moment.imageType = null;
        saveToDB('moments', { list: moments });
        renderMomentsList();
        console.log('[AI生图] 失败，已移除占位符', momentId);
    }
}
// ====== 朋友圈动态异步生图 END ======


// ====== 世界书图智能匹配 START ======
async function matchWorldbookImage(chatId, momentContent, imageDesc, scheme) {
    try {
        // 1. 获取角色关联的世界书
        const charInfoAll = await loadCharacterInfoAllSafe();
        const charData = charInfoAll && charInfoAll[chatId] ? charInfoAll[chatId] : {};
        const linkedIds = charData.linkedWorldbooks || [];
        
        if (linkedIds.length === 0) {
            console.log('[世界书图] 角色未关联世界书');
            return null;
        }

        // 2. 加载所有世界书
        const allWorldbooks = await new Promise((resolve) => {
            loadFromDB('worldbooks', (data) => {
                const list = Array.isArray(data) ? data : [];
                resolve(list);
            });
        });

        // 3. 筛选"ai发图"分类
        const imageBooks = allWorldbooks.filter(wb => 
            linkedIds.includes(wb.id) && 
            wb.category === 'ai发图' &&
            wb.content && 
            (wb.content.includes('http://') || wb.content.includes('https://'))
        );

        if (imageBooks.length === 0) {
            console.log('[世界书图] 没有"ai发图"分类的世界书');
            return null;
        }

        // 4. 构建prompt让AI选择
        const candidateList = imageBooks.map((wb, idx) => 
            `${idx + 1} | ${wb.content}`
        ).join('\n');

        const prompt = `
角色刚发了一条朋友圈，需要配图。

【动态文字】
${momentContent}

【配图需求】
${imageDesc}

【可选世界书内容（编号 | 完整内容）】
${candidateList}

【任务】
从世界书内容中搜查，找出最符合配图需求的一个。
世界书内容可能包含：
- 图片URL（http://... 或 https://...）
- 分类标签
- 描述文字

你需要：
1. 理解配图需求的场景/氛围/物品
2. 在世界书内容中搜查匹配的描述
3. 选择最合适的一个

如果都不合适，输出 0。

只输出编号（1-${imageBooks.length} 或 0），不要解释。
`.trim();

        // 5. 调用副API
        const url = scheme.baseUrl.endsWith('/')
            ? scheme.baseUrl + 'chat/completions'
            : scheme.baseUrl + '/chat/completions';

        const resp = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${scheme.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: scheme.defaultModel,
                temperature: 0.3,
                max_tokens: 10,
                messages: [
                    { role: 'system', content: '你是一个图片匹配助手。' },
                    { role: 'user', content: prompt }
                ]
            })
        });

        if (!resp.ok) {
            console.error('[世界书图] API调用失败:', resp.status);
            return null;
        }

        const data = await resp.json();
        const raw = data && data.choices && data.choices[0] && data.choices[0].message
            ? data.choices[0].message.content
            : '';

        const index = parseInt(raw.trim()) - 1;

        // 6. 验证并提取URL
        if (index >= 0 && index < imageBooks.length) {
            const content = imageBooks[index].content;
            const urlMatch = content.match(/(https?:\/\/[^\s]+)/);
            if (urlMatch) {
                console.log('[世界书图] 匹配成功:', urlMatch[1]);
                return urlMatch[1];
            }
        }

        console.log('[世界书图] 未匹配到合适的图片');
        return null;

    } catch (e) {
        console.error('[世界书图] 匹配出错:', e);
        return null;
    }
}
// ====== 世界书图智能匹配 END ======

// ====== Moments Generate One (Env+Gap+Birthday) END ======


// ====== Moments CharacterInfo Loader START ======
function loadCharacterInfoAllSafe() {
    return new Promise((resolve) => {
        loadFromDB('characterInfo', (data) => {
            // 你 current 的 characterInfo 是对象：{ [chatId]: {...} }
            if (data && typeof data === 'object' && !Array.isArray(data)) {
                resolve(data);
                return;
            }
            resolve({});
        });
    });
}
// ====== Moments CharacterInfo Loader END ======

// ====== Moments History Prompt DEBUG START ======
async function getChatHistoryForPrompt(chatId, limit) {
    const maxCount = Number.isFinite(limit) && limit > 0 ? limit : 100;

    const allMsgs = await new Promise((resolve) => {
        loadFromDB('messages', (data) => {
            let list = [];
            if (data && Array.isArray(data.list)) list = data.list;
            else if (Array.isArray(data)) list = data;
            resolve(list);
        });
    });

    const filtered = allMsgs.filter(m => m && m.chatId === chatId && !m.isRevoked);

    filtered.sort((a, b) => {
        const ta = Date.parse(a.time || '') || 0;
        const tb = Date.parse(b.time || '') || 0;
        return ta - tb;
    });

    const last = filtered.slice(Math.max(0, filtered.length - maxCount));

const lines = [];
for (let i = 0; i < last.length; i++) {
    const msg = last[i];
    
    // ★★★ 修复：改为"用户"和"角色"，避免人称混淆 ★★★
    const who = msg.senderId === 'me' ? '用户' : '角色';

    let text = '';

    if (isSmartCleanPlaceholder(msg.content)) continue;

    if (msg.type === 'text') {
        text = String(msg.content || '').trim();
    } else if (msg.type === 'text_image') {
        text = String(msg.content || '').trim();
    } else if (msg.type === 'image') {
        text = '【图片】';
    } else if (msg.type === 'voice') {
        text = '【语音】';
    } else if (msg.type === 'transfer') {
        text = '【转账】';
    } else if (msg.type === 'shopping_order') {
        text = '【订单】';
    } else {
        text = String(msg.content || '').trim();
    }

    if (!text) continue;
    if (text.length > 200) text = text.slice(0, 200) + '...';
    
    // ★★★ 修复：格式改为"角色：xxx" / "用户：xxx" ★★★
    lines.push(`${who}：${text}`);
}

    console.log('[moments] history lines:', lines.length);

    if (lines.length === 0) return '（无有效聊天记录）';
    return lines.join('\n');
}
// ====== Moments History Prompt DEBUG END ======

// ====== Moments Last Chat Gap START ======
async function getLastChatGapDesc(chatId) {
    const allMsgs = await new Promise((resolve) => {
        loadFromDB('messages', (data) => {
            let list = [];
            if (data && Array.isArray(data.list)) list = data.list;
            else if (Array.isArray(data)) list = data;
            resolve(list);
        });
    });

    const filtered = allMsgs
        .filter(m => m && m.chatId === chatId && !m.isRevoked)
        .sort((a, b) => (Date.parse(a.time || '') || 0) - (Date.parse(b.time || '') || 0));

    if (filtered.length === 0) return '很久了';

    const last = filtered[filtered.length - 1];
    const lastTime = Date.parse(last.time || '');
    if (!lastTime) return '刚刚';

    const diffMs = Date.now() - lastTime;
    if (diffMs < 60 * 1000) return '刚刚';
    if (diffMs < 60 * 60 * 1000) return `${Math.floor(diffMs / (60 * 1000))}分钟`;
    if (diffMs < 24 * 60 * 60 * 1000) return `${Math.floor(diffMs / (60 * 60 * 1000))}小时`;
    return `${Math.floor(diffMs / (24 * 60 * 60 * 1000))}天`;
}
// ====== Moments Last Chat Gap END ======

// ====== Moments Birthday Hint Short START ======
function getBirthdayHintShort(birthdayStr) {
    if (!birthdayStr) return '';

    const days = getDaysToBirthday(birthdayStr);
    if (days === null || days === undefined) return '';

    const b = new Date(birthdayStr);
    const m = b.getMonth() + 1;
    const d = b.getDate();

    if (days === 0) return `今天生日（${m}/${d}）`;
    if (days > 0 && days <= 7) return `生日快到了（还有${days}天）`;
    // 你原来的 getDaysToBirthday 不会返回负数（它会滚到明年），所以这里不写“刚过去”
    return '';
}
// ====== Moments Birthday Hint Short END ======



function buildMomentPrompt(opts) {
    const displayName = (opts && opts.displayName) ? String(opts.displayName) : '角色';
    const personality = (opts && opts.personality) ? String(opts.personality) : '（未提供）';
    const relationshipText = (opts && opts.relationshipText) ? String(opts.relationshipText) : '（未提供）';
    const userName = (opts && opts.userName) ? String(opts.userName) : '用户';
    const historyText = (opts && opts.historyText) ? String(opts.historyText) : '（无）';

    const timeDesc = opts && opts.timeDesc ? String(opts.timeDesc) : '未知时间';
    const hhmm = opts && opts.hhmm ? String(opts.hhmm) : '';
    const weekDesc = opts && opts.weekDesc ? String(opts.weekDesc) : '';

    const cityName = opts && opts.cityName ? String(opts.cityName) : '';
    const todayWeather = opts && opts.todayWeather ? String(opts.todayWeather) : '';
    const tomorrowWeather = opts && opts.tomorrowWeather ? String(opts.tomorrowWeather) : '';

    const lastChatGapDesc = opts && opts.lastChatGapDesc ? String(opts.lastChatGapDesc) : '未知';
    const birthdayHintShort = opts && opts.birthdayHintShort ? String(opts.birthdayHintShort) : '';

    const needImage = opts && opts.needImage === true;

    let envLines = [];
    envLines.push(`- 时间段：${timeDesc}${hhmm ? `（${hhmm}）` : ''}`);
    if (weekDesc) envLines.push(`- 星期：${weekDesc}`);
    if (cityName) envLines.push(`- 你所在：${cityName}`);
    if (todayWeather) envLines.push(`- 今天天气：${todayWeather}`);
    if (tomorrowWeather) envLines.push(`- 明天天气：${tomorrowWeather}`);

    let rhythmLines = [];
    if (lastChatGapDesc && lastChatGapDesc !== '未知') {
        rhythmLines.push(`- 最近一次聊天：${lastChatGapDesc}`);
    }
    if (birthdayHintShort) {
        rhythmLines.push(`- 生日提示：${birthdayHintShort}`);
    }

    const outputFormat = needImage ? `
【输出格式（必须严格遵守）】
只输出严格 JSON（不要多余文字）：
{"content":"动态文字", "imageDesc":"配图描述"}

【配图描述要求】
1. 配图描述是动态延伸，不要把动态原句重复一遍
2. 20-50字，具体、有画面感
` : `
【输出格式（必须严格遵守）】
只输出严格 JSON（不要多余文字）：
{"content":"动态文字", "imageDesc":""}

【说明】
这是一条纯文字动态，imageDesc留空字符串即可。
请专注于生成自然、生活化的动态文字内容。
`;

    return `
你正在扮演：${displayName}。你要发一条朋友圈，像真人一样自然、随手、生活化。

【最高优先级规则】
1) 必须参考【角色人设】与【最新聊天记录】再写，不可脱离上下文硬编。
2) 可以写：聊天相关、日常碎碎念、工作吐槽、临时想到什么就发什么。
3) 可以提到用户（${userName}），但只允许依据【你与用户关系】来写，不能乱用亲密称呼。
4) 若【你与用户关系】里没有亲密关系依据，禁止输出亲密称呼。
5) 若关系里明确是亲密关系，允许自然出现炫耀式表达（例如收到礼物、被照顾等）。
6) 朋友圈是“自我表达”，不是私聊回复；禁止写成对话格式。
7) 若聊天记录为空，优先写纯日常；若聊天记录不为空，动态中至少体现一个与最近聊天相关的语义线索。

【角色人设】
${personality}

【你与用户关系（必须参考）】
${relationshipText}

【此刻环境】
${envLines.join('\n')}

【节奏参考】
${rhythmLines.length > 0 ? rhythmLines.join('\n') : '（无）'}

【最新聊天记录（重点参考）】
${historyText}

【写作要求】
- 字数：10-60字
- 口吻：像真人，不要AI腔，不要总结腔
- 允许少量颜文字，不要emoji堆砌
- 内容方向示例（仅示例，不要照抄）：
  - 日常碎碎念：今天看到一只猫，怪可爱的。
  - 工作吐槽：不想上班。
  - 与用户有关（需关系支持）：今天${userName}送了我xxx，不卖，纯炫耀。
- 禁止空泛鸡汤、禁止“作为AI”之类表达

${outputFormat}
`.trim();
}

// ====== Moments SubAPI Call DEBUG START ======
async function callSubApiGenerateMoment(params) {
    const baseUrl = (params.baseUrl || '').trim();
    const apiKey = (params.apiKey || '').trim();
    const model = (params.model || '').trim();
    const prompt = params.prompt || '';

    if (!baseUrl || !apiKey || !model) return null;

    const url = baseUrl.endsWith('/')
        ? baseUrl + 'chat/completions'
        : baseUrl + '/chat/completions';

    const body = {
        model: model,
        temperature: 0.8,
        max_tokens: 2000,
        messages: [
            { role: 'system', content: '你是一个会写朋友圈动态的角色扮演助手。' },
            { role: 'user', content: prompt }
        ]
    };

    console.log('[moments] POST', url, { model, hasKey: !!apiKey, promptLen: String(prompt || '').length });

    const resp = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    console.log('[moments] status:', resp.status);

    if (!resp.ok) {
        const t = await resp.text().catch(() => '');
        console.error('SubAPI error:', resp.status, t);
        return null;
    }

    const data = await resp.json();

        const raw = data && data.choices && data.choices[0] && data.choices[0].message
        ? data.choices[0].message.content
        : '';

    console.log('[moments] raw:', raw);

    if (!raw) return null;

    // 预检：如果AI返回的是明显的拒绝文本，直接跳过，不尝试解析
    const rawCheck = String(raw).trim();
    if (/^(I can'?t|I'm sorry|Sorry|抱歉|对不起|我无法|作为AI|As an AI)/i.test(rawCheck)) {
        console.warn('[moments] AI拒绝回复，跳过本条:', rawCheck.slice(0, 80));
        return null;
    }

    // 👇 完整的清洗逻辑
    let cleanedRaw = raw
        // 1. 去掉 Markdown 代码块标记
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/```\s*$/i, '')
        // 2. 去掉换行符
        .replace(/\n/g, '')
        .replace(/\r/g, '')
        // 3. 清洗中文符号
        .replace(/"/g, '"')
        .replace(/"/g, '"')
        .replace(/，/g, ',')
        .replace(/：/g, ':')
        // 4. 去掉首尾空格
        .trim();

    console.log('[moments] cleaned:', cleanedRaw);

    // 5. 提取 {...} 部分
    const jsonMatch = cleanedRaw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        cleanedRaw = jsonMatch[0];
        console.log('[moments] extracted:', cleanedRaw);
    }

    // 6. 尝试解析JSON
    let parsed = null;
    try {
        parsed = JSON.parse(cleanedRaw);
        console.log('[moments] parsed:', parsed);
    } catch (e) {
        console.error('[moments] JSON解析失败:', e);
        console.error('[moments] 尝试解析的内容:', cleanedRaw);
        
        // 兜底：尝试用 safeParseJsonFromText
        parsed = safeParseJsonFromText(cleanedRaw);
        if (parsed) {
            console.log('[moments] safeParseJsonFromText 成功:', parsed);
        }
    }

      // 7. 验证解析结果（兜底：解析失败时尝试把原文当纯文字动态）
    if (!parsed || !parsed.content) {
        const fallbackText = String(cleanedRaw || '').replace(/[{}\[\]"]/g, '').trim();
        if (fallbackText.length >= 4 && fallbackText.length <= 500) {
            console.warn('[moments] JSON解析失败，降级为纯文字动态:', fallbackText.slice(0, 50));
            return { content: fallbackText, imageDesc: '' };
        }
        console.error('[moments] 解析失败且无法降级');
        return null;
    }

    // 8. 返回完整的解析对象（包含 content 和 imageDesc）
    return {
        content: String(parsed.content).trim(),
        imageDesc: parsed.imageDesc ? String(parsed.imageDesc).trim() : ''
    };
}

// ====== JSON Parse Ultimate Fix START ======
function safeParseJsonFromText(text) {
    let s = String(text || '').trim();
    if (!s) return null;

    // 1. 去掉 Markdown 代码块包裹
    s = s.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();

    // 2. 尝试直接解析
    try {
        return JSON.parse(s);
    } catch (e) {
        // 3. 提取第一个 {...}
        const match = s.match(/\{[\s\S]*\}/);
        if (match) {
            try {
                return JSON.parse(match[0]);
            } catch (e2) {
                // 4. 尝试补全截断的 JSON (最常见错误)
                // 如果结尾缺了 " 或 }，尝试补上
                let fixed = match[0];
                if (!fixed.endsWith('}')) {
                    if (!fixed.endsWith('"')) fixed += '"';
                    fixed += '}';
                }
                try {
                    return JSON.parse(fixed);
                } catch (e3) {
                    console.error('JSON fix failed:', fixed);
                }
            }
        }
    }
    return null;
}
// ====== JSON Parse Ultimate Fix END ======

//朋友圈-角色同组或者朋友评论//

// ====== 氛围评论入口（用户动态 + 角色动态双模式）START ======
async function generateAiComments(momentId, btnEl) {
    const moment = moments.find(m => m.id === momentId);
    if (!moment) return;

    const originalContent = btnEl.innerHTML;
    btnEl.innerHTML = `<span class="comment-loading"></span> 生成中...`;
    btnEl.style.pointerEvents = 'none';

    try {
        // ====== 分支A：用户动态（顶层评论，每人一条，不楼中楼） ======
       if (moment.authorId === 'me') {
    const pool = getVisibleChatPoolForUserMoment(moment);
    if (!pool || pool.length === 0) {
        alert('当前可见范围内没有角色，无法生成评论');
        return;
    }

    const commentedIds = new Set(
        (moment.commentsList || [])
            .filter(c => c && typeof c.senderId === 'number' && c.senderId > 0)
            .map(c => c.senderId)
    );

    const fresh = pool.filter(id => !commentedIds.has(id));
    let candidateIds = fresh.length > 0 ? fresh : pool;

    const count = Math.min(candidateIds.length, 3 + Math.floor(Math.random() * 3)); // 3-5人
    candidateIds = candidateIds.sort(() => 0.5 - Math.random()).slice(0, count);

    const scheme = getSubApiScheme();
    if (!scheme || !scheme.baseUrl || !scheme.apiKey || !scheme.defaultModel) {
        alert('请先在朋友圈设置里选择副API方案（需支持视觉模型）');
        return;
    }

    let visionSummaryText = '';

    // 有图 -> 先视觉总结（第1次API），再用总结生成评论（第2次API）
    if (Array.isArray(moment.images) && moment.images.length > 0) {
        const visionImages = await compressImagesForVision(moment.images);

        if (visionImages.length > 0) {
            const summaryObj = await callSubApiVisionSummarizeMoment({
                baseUrl: scheme.baseUrl,
                apiKey: scheme.apiKey,
                model: scheme.defaultModel,
                momentText: moment.content,
                visionImages
            });

            if (summaryObj && Array.isArray(summaryObj.images)) {
                const lines = summaryObj.images
                    .slice(0, 3)
                    .map(it => `${it.idx}) ${it.desc}`)
                    .join('\n');
                const overall = summaryObj.overall ? `\n总体：${summaryObj.overall}` : '';
                visionSummaryText = (lines + overall).trim();

                // 广播隐藏上下文（只保留每个单聊最近3条）
                broadcastVisionSummaryToAllSingleChats({
                    momentId: moment.id,
                    authorId: moment.authorId,
                    authorName: momentsProfile && momentsProfile.name ? momentsProfile.name : '用户',
                    timestamp: moment.timestamp,
                    content: moment.content || '',
                    visionSummaryText
                });
            
                        } else {
                // 图片识别失败时给出明确提示
                alert('图片识别失败！\n\n请检查：\n1. 朋友圈设置中的“副API方案”是否正确配置。\n2. 该方案选择的模型是否为支持视觉功能的模型（如 gpt-4o, gpt-4-vision-preview 等）。');
                // 中断执行，防止生成无视图片的评论
                return; 
            }

        }
    }

    const commentsArr = await callApiToGenUserMomentComments(moment, candidateIds, scheme, visionSummaryText);
    if (!commentsArr || commentsArr.length === 0) {
        alert('生成失败，AI 未返回有效内容。');
        return;
    }

    if (!moment.commentsList) moment.commentsList = [];
    const newItems = commentsArr.map(x => ({
        id: 'c_' + Date.now() + '_' + Math.random().toString(16).slice(2),
        senderId: x.roleId,
        senderName: x.roleName,
        replyToId: null,
        replyToName: null,
        content: sanitizeCommentText(x.content),
        time: Date.now(),
        isAiGenerated: true
    })).filter(c => c.content && c.content.trim().length > 0);

    moment.commentsList.push(...newItems);
    moment.comments = moment.commentsList.length;

    saveToDB('moments', { list: moments });
    renderMomentsList();
    return;
}


const threadInfo = extractMomentThreadsForContinuation(moment, 4);
const chainInfo = getRoundChainInfo(moment);
const mode = chainInfo.canContinue ? 'continue' : 'new';

let actors = [];
let allowedNames = [];
let ownerReplyContextMap = {};

// 续写模式：只允许“上一轮里被主人回复过的人”
if (mode === 'continue') {
    allowedNames = [...chainInfo.allowedNames];
    ownerReplyContextMap = { ...chainInfo.ownerReplyContextMap };

    if (!allowedNames.length) {
        alert('这个动态作者没有好友，无法生成评论');
        return;
    }

    actors = resolveActorsByNamesFromMoment(moment, allowedNames);

    if (!actors || actors.length === 0) {
        alert('这个动态作者没有好友，无法生成评论');
        return;
    }
} else {
    // 首轮：按原逻辑选人
    actors = await selectCommentActors(moment);
}

// 强制作者参与
if (moment && moment.authorId && moment.authorId !== 'me') {
    const authorChat = Array.isArray(chats) ? chats.find(c => c.id === moment.authorId) : null;
    if (authorChat) {
        const exists = Array.isArray(actors) && actors.some(a => a && a.type === 'chat' && a.id === moment.authorId);
        if (!exists) {
            actors.unshift({ type: 'chat', id: authorChat.id, name: authorChat.name });
        }
    }
}

const commentsData = await callApiToGenComments(moment, actors, {
    mode,
    threadContext: threadInfo.contextText,
    minCount: 4,
    maxCount: 8,
    allowedNames,
    ownerReplyContextMap
});

if (!commentsData || !Array.isArray(commentsData) || commentsData.length === 0) {
    alert('生成失败，AI 未返回有效内容。');
    return;
}

if (!moment.commentsList) moment.commentsList = [];

// 先标准化
const normalized = commentsData.map(item => ({
    roleId: typeof item.roleId === 'number' ? item.roleId : -9999,
    roleName: String(item.roleName || '未知'),
    replyToName: item.replyToName ? String(item.replyToName) : null,
    content: sanitizeCommentText(item.content)
})).filter(c => c.content && c.content.trim().length > 0);

// 再做硬过滤，防止AI跑偏
const checked = applyRoundCommentRules(normalized, moment, mode, allowedNames);
if (!checked.ok) {
    alert(checked.message || '生成失败');
    return;
}

// 本轮ID
const currentRoundId = 'round_' + Date.now() + '_' + Math.random().toString(16).slice(2);

const newComments = checked.list.map(item => ({
    id: 'c_' + Date.now() + '_' + Math.random().toString(16).slice(2),
    senderId: item.roleId,
    senderName: item.roleName,
    replyToId: null,
    replyToName: item.replyToName,
    content: item.content,
    time: Date.now(),
    isAiGenerated: true,
    roundId: currentRoundId
}));

moment.commentsList.push(...newComments);
moment.comments = moment.commentsList.length;

// 记录“上一轮ID”，下一次只读这轮
moment.lastCommentRoundId = currentRoundId;

saveToDB('moments', { list: moments });
renderMomentsList();

    } catch (e) {
        console.error('generateAiComments error:', e);
        alert('生成出错：' + (e && e.message ? e.message : '未知错误'));
    } finally {
        btnEl.innerHTML = originalContent;
        btnEl.style.pointerEvents = 'auto';
    }
}
// ====== 氛围评论入口（用户动态 + 角色动态双模式）END ======


// ====== 角色动态评论选人（人设+关系网双重检查）START ======
async function selectCommentActors(moment) {
    const authorId = moment && moment.authorId;
    if (!authorId || authorId === 'me') return [];

    const charInfoAll = await loadCharacterInfoAllSafe();
    const authorInfo = (charInfoAll && charInfoAll[authorId]) ? charInfoAll[authorId] : {};
    
    // 获取人设和关系网文本
    const personalityText = String(authorInfo.personality || '').trim();
    const relationshipText = String(authorInfo.relationshipText || '').trim();

    // 如果人设或关系网任意一个有内容，就生成席位
    if (personalityText.length > 0 || relationshipText.length > 0) {
        // 随机决定生成 2-4 个互动名额
        const targetCount = 2 + Math.floor(Math.random() * 3); 
        
        const slots = [];
        for (let i = 0; i < targetCount; i++) {
            slots.push({
                type: 'virtual_slot',
                id: -1000 - i,
                name: '待定人物'
            });
        }
        return slots;
    }

    // 如果人设和关系网都为空：不生成评论
    return [];
}
// ====== 角色动态评论选人（人设+关系网双重检查）END ======


async function callApiToGenComments(moment, actors, options) {
    const scheme = getSubApiScheme();
    if (!scheme || !scheme.baseUrl || !scheme.apiKey || !scheme.defaultModel) {
        alert('请先设置副 API 方案');
        return null;
    }

    const threadContext = options && options.threadContext ? String(options.threadContext) : '';

    // 加载作者信息
    const charInfoAll = await loadCharacterInfoAllSafe();
    const authorId = moment.authorId;
    const authorInfo = charInfoAll && charInfoAll[authorId] ? charInfoAll[authorId] : {};
    const authorName = moment.authorName;
    const authorPersonality = authorInfo.personality || '';
    const relationshipText = authorInfo.relationshipText || ''; 

    // 生成席位列表字符串
    const slotIds = actors.map(a => a.id).join(', ');

    // ★★★ 新增：防止AI混淆作者的多个名字（终极版：智能提取人设开头的名字） ★★★
    const authorChat = (chats || []).find(c => c.id === authorId);
    let authorIdentityWarning = '';

    if (authorChat) {
        const realName = authorChat.name;
        const remark = authorChat.remark || '';
        
        const allAuthorNames = [authorName];
        if (realName && realName !== authorName) allAuthorNames.push(realName);
        if (remark && remark !== authorName && remark !== realName) allAuthorNames.push(remark);
        
        // ★★★ 增强版：优先从人设开头提取作者名字（支持多种格式） ★★★
        const personalityHead = authorPersonality.substring(0, 100);
        const namePatterns = [
            /我(?:是|叫|的名字是|名叫|名为)\s*([^\s，。！？、,\.!\?]{1,10})/,
            /^([^\s，。！？、,\.!\?]{1,10})[，,]/,
            /角色名[:：]\s*([^\s，。！？、,\.!\?]{1,10})/,
            /姓名[:：]\s*([^\s，。！？、,\.!\?]{1,10})/,
        ];

        for (const pattern of namePatterns) {
            const match = personalityHead.match(pattern);
            if (match && match[1]) {
                const extractedName = match[1].trim();
                if (!['男', '女', '岁', '性别', '年龄', '身高', '体重'].includes(extractedName) 
                    && !allAuthorNames.includes(extractedName)) {
                    allAuthorNames.push(extractedName);
                    break;
                }
            }
        }
        
        if (allAuthorNames.length > 1) {
            authorIdentityWarning = `
【⚠️ 作者身份识别 - 最高优先级 - 违反视为失败】
动态作者有多个名字：${allAuthorNames.join(' / ')}

**核心规则：**
1. 这些名字都是同一个人（动态发布者本人）！
2. **禁止从【人设】或【关系网】中提取这些名字作为其他人物！**
3. 如果看到这些名字，直接跳过，不要提取为评论者！
4. 严禁让这些名字在评论区互相对话！

**识别方法：**
- 人设开头通常会写"我是xxx"、"xxx，23岁" → xxx就是作者本人
- 所有上述名字（${allAuthorNames.join('、')}）都指向同一个人
`;
        } else {
            authorIdentityWarning = `
【⚠️ 作者身份识别】
动态作者是：${authorName}
如果【人设】开头提到这个名字，说明就是作者本人，不要从人设中提取为其他人物！
`;
        }
    }

    // ★★★ 新增：防止评论者自己和自己对话 ★★★
    const commentersIdentityMap = actors.map(a => {
        const chat = (chats || []).find(c => c.id === a.id);
        if (!chat) return '';
        
        const realName = chat.name;
        const remark = chat.remark || '';
        
        if (remark && remark !== realName) {
            return `- 注意：${realName} 和 ${remark} 是同一个角色`;
        }
        return '';
    }).filter(x => x).join('\n');

const mode = options && options.mode === 'continue' ? 'continue' : 'new';
const allowedNames = (options && Array.isArray(options.allowedNames)) ? options.allowedNames : [];
const ownerReplyContextMap = (options && options.ownerReplyContextMap) ? options.ownerReplyContextMap : {};

const continuationRuleBlock = mode === 'continue'
    ? `
【续写硬规则（最高优先级）】
- 这是上一轮评论区续写，不是新开话题。
- 非作者评论者只能从以下名单中选择，禁止引入新人物：
${allowedNames.length > 0 ? allowedNames.join('、') : '（空）'}
- 每位名单内人物必须基于“上一轮作者对TA说的话”来回复作者（replyToName="${authorName}"）。
- 作者（${authorName}）本轮至少回复其中1人。

【上一轮作者回复记录】
${allowedNames.map((n, i) => `${i + 1}. 作者对 ${n} 说：${ownerReplyContextMap[n] || '（无）'}`).join('\n')}
`
    : `
【新开模式】
- 首次生成可自然起楼。
- 作者至少回复1人。
`;


    const prompt = `
你是朋友圈评论生成器。从【人设】和【关系网】中提取人物，生成 ${actors.length} 条评论。

${authorIdentityWarning}

【作者】${authorName}

【★人设（核心信息，必读）★】
${authorPersonality || '未提供'}

【★关系网（补充信息）★】
${relationshipText || '无'}

${commentersIdentityMap ? `【评论者名字对照】\n${commentersIdentityMap}\n` : ''}

【动态】${moment.content}
【已有评论】${threadContext || '无'}

${continuationRuleBlock}

【核心规则】
1. 人物提取（双源头）：
   - **第一步：排除作者本人（最优先）**
     • 【人设】开头通常会写作者自己的名字（如"沈谨，23岁"、"我是沈谨"）
     • 如果看到作者的任何名字，立即跳过，不要提取为评论者
     • 作者的所有名字已在上方列出，严禁提取
   
   - 第二步：从【人设】提取其他人物（如"我的好友Ron、Hermione"）
   - 第三步：从【关系网】提取（如"好友：张三"、"邻居老王"）
   - 识别各种格式："李四，33岁，发小"、"同事小王"
   - 清洗名字：去掉冒号/括号/身份词（"邻居：老王"→"老王"）

2. 文化与语言适配：
   - 从【人设】判断文化背景（"英国巫师"→英美，"古代侠客"→古风）
   - 如果人设没写，从提取的人名推断（Ron→英美，张三→中国）
   - 语言风格匹配：
     • 英美→译制腔（"你确定吗"、"这真不可思议"）
     • 中国现代→口语（"哈哈"、"你又偷懒啦"）
     • 古代→古风（"汝"、"公子"）

3. 作者回复：
   - 作者（${authorName}）必须回复1-2条
   - roleId=${authorId}，replyToName填被回复者

4. 输出：
   - JSON数组：[{"roleId":数字,"roleName":"名字","content":"内容","replyToName":null或"名字"}]
   - 禁止暧昧/方括号表情
   - **最后检查：确保没有作者的任何名字出现在评论者列表中**

【席位】${slotIds}（从人设+关系网中挑选，严禁选中作者本人的任何名字）
`.trim();

    // 调用 API
    const raw = await callSubApiGenerateCommentsOnly({
        baseUrl: scheme.baseUrl,
        apiKey: scheme.apiKey,
        model: scheme.defaultModel,
        prompt: prompt
    });

    if (!raw) return null;

    const arr = parseJsonArrayFromText(raw);
    if (!Array.isArray(arr)) return null;

    // 结果处理
    const normalized = arr.map(x => ({
        roleId: typeof x.roleId === 'number' ? x.roleId : -9999,
        roleName: String(x.roleName || '未知'),
        content: sanitizeCommentText(String(x.content || '')),
        replyToName: x.replyToName === null || x.replyToName === undefined ? null : String(x.replyToName)
    })).filter(x => x.content && x.content.trim().length > 0);

    return normalized;
}

// ====== Moments SubAPI Call (For Comments Only) START ======
async function callSubApiGenerateCommentsOnly(params) {
    const baseUrl = (params.baseUrl || '').trim();
    const apiKey = (params.apiKey || '').trim();
    const model = (params.model || '').trim();
    const prompt = params.prompt || '';

    if (!baseUrl || !apiKey || !model) {
        console.error('[CommentsAPI] 参数缺失', { baseUrl, hasKey: !!apiKey, model });
        return null;
    }

    const url = baseUrl.endsWith('/')
        ? baseUrl + 'chat/completions'
        : baseUrl + '/chat/completions';

    const body = {
        model: model,
        temperature: 0.8,
        max_tokens: 10000,
        messages: [
            { role: 'system', content: '你是一个朋友圈评论生成器。' },
            { role: 'user', content: prompt }
        ]
    };

    console.log('[CommentsAPI] POST', url);

    try {
        const resp = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!resp.ok) {
            console.error('[CommentsAPI] Error:', resp.status, await resp.text());
            return null;
        }

        const data = await resp.json();
        const raw = data && data.choices && data.choices[0] && data.choices[0].message
            ? data.choices[0].message.content
            : '';

        console.log('[CommentsAPI] raw:', raw);

        if (!raw) return null;

        // 尝试解析，如果是数组就返回 raw 字符串（让外层去 parse），或者直接返回 raw
        // 为了保险，我们这里只负责返回 raw 文本，解析交给外层 callApiToGenComments
        return raw; 

    } catch (e) {
        console.error('[CommentsAPI] Fetch Error:', e);
        return null;
    }
}
// ====== Moments SubAPI Call (For Comments Only) END ======

// ====== Comments JSON Array Parser (Sanitize+Repair) START ======
function parseJsonArrayFromText(text) {
    let s = String(text || '').trim();
    if (!s) return null;

    // 1) 提取 ```json ... ``` 或 ``` ... ``` 内容
    const codeBlock = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (codeBlock && codeBlock[1]) {
        s = codeBlock[1].trim();
    }

    // 2) 清洗中文符号为 JSON 半角
    s = s.replace(/[“”]/g, '"');
    s = s.replace(/：/g, ':');
    s = s.replace(/，/g, ',');
    s = s.replace(/、/g, ',');
    s = s.replace(/,\s*}/g, '}');
    s = s.replace(/,\s*]/g, ']');

    // 3) 尝试提取从第一个 [ 开始的部分（允许没闭合）
    const startIdx = s.indexOf('[');
    if (startIdx >= 0) {
        s = s.slice(startIdx);
    }

    // 4) 兜底修复：补全缺失的 } 和 ]
    // 统计括号数量，缺多少补多少
    const openCurly = (s.match(/{/g) || []).length;
    const closeCurly = (s.match(/}/g) || []).length;
    if (closeCurly < openCurly) {
        s += '}'.repeat(openCurly - closeCurly);
    }

    const openSquare = (s.match(/\[/g) || []).length;
    const closeSquare = (s.match(/]/g) || []).length;
    if (closeSquare < openSquare) {
        s += ']'.repeat(openSquare - closeSquare);
    }

    // 5) 最终 parse
    try {
        const v = JSON.parse(s);
        return Array.isArray(v) ? v : null;
    } catch (e) {
        console.error('[Comments] array parse failed:', s);
        return null;
    }
}
// ====== Comments JSON Array Parser (Sanitize+Repair) END ======

// ====== Comment Text Sanitize START ======
function sanitizeCommentText(text) {
    let s = String(text || '');

    // 去掉 [坏笑] [doge] 这类方括号表情
    s = s.replace(/\[[^\]]{1,8}\]/g, '');

    // 去掉多余空格
    s = s.replace(/\s+/g, ' ').trim();

    return s;
}
// ====== Comment Text Sanitize END ======

// ====== 关系网弹窗逻辑 START ======
function openRelationshipModal() {
    if (!currentChatId) {
        alert('请先打开角色信息页');
        return;
    }

    loadFromDB('characterInfo', (data) => {
        const allCharData = data || {};
        const charData = allCharData[currentChatId] || {};
        document.getElementById('relationshipTextInput').value = charData.relationshipText || '';
        document.getElementById('relationshipModal').style.display = 'flex';
    });
}

function closeRelationshipModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('relationshipModal').style.display = 'none';
}

function saveRelationshipText() {
    if (!currentChatId) return;

    const text = document.getElementById('relationshipTextInput').value || '';

    loadFromDB('characterInfo', (data) => {
        const allCharData = data || {};
        const charData = allCharData[currentChatId] || {};

        // 中文注释：relationshipText 是纯文本关系网；@名字 只在关系网中代表虚拟人物
        charData.relationshipText = text;

        allCharData[currentChatId] = charData;
        saveToDB('characterInfo', allCharData);

        closeRelationshipModal();
        alert('关系网已保存');
    });
}
// ====== 关系网弹窗逻辑 END ======

// ====== 关系网解析工具 START ======
// 中文注释：提取 @名字（虚拟人物，仅存在关系网中）
function extractVirtualPeopleFromRelationshipText(text) {
    const s = String(text || '');
    const set = new Set();
    const re = /@([^\s：:，,。;；\n]{1,12})/g;
    let m;
    while ((m = re.exec(s)) !== null) {
        if (m[1]) set.add(m[1]);
    }
    return Array.from(set);
}

// 中文注释：提取包含某个名字的句子/片段，作为该人物的人设/关系线索
function extractSnippetsForName(text, name) {
    const s = String(text || '');
    const n = String(name || '').trim();
    if (!s || !n) return '';

    const lines = s.split(/\n+/).map(x => x.trim()).filter(Boolean);
    const hit = lines.filter(line => line.includes(n));
    // 最多取3行，避免太长
    return hit.slice(0, 3).join('；');
}
// ====== 关系网解析工具 END ======

// ====== 续聊：线程抽取工具 START ======
// 中文注释：从已有 commentsList 中抽取最近的楼中楼线程，用于“第二次生成”续写
function extractMomentThreadsForContinuation(moment, maxThreads) {
    const list = moment && Array.isArray(moment.commentsList) ? moment.commentsList : [];
    const m = Math.max(1, maxThreads || 2);

    // 只取楼中楼（replyToName 不为空）
    const replies = list.filter(c => c && c.replyToName);

    if (replies.length === 0) {
        return { hasThread: false, contextText: '' };
    }

    // 取最近的 m 条楼中楼作为“线程种子”
    const seeds = replies.slice(Math.max(0, replies.length - m));

    // 组装上下文：把种子以及它前面一条（如果存在且相关）也带上，增强连贯性
    const lines = [];
    seeds.forEach(seed => {
        const idx = list.findIndex(x => x && x.id === seed.id);
        // 带上 seed 前一条，增加话题来源（可能是 A:xxx，然后作者回复）
        if (idx > 0) {
            const prev = list[idx - 1];
            if (prev) {
                const prevLine = prev.replyToName
                    ? `${prev.senderName} 回复 ${prev.replyToName}：${prev.content}`
                    : `${prev.senderName}：${prev.content}`;
                lines.push(prevLine);
            }
        }
        const seedLine = `${seed.senderName} 回复 ${seed.replyToName}：${seed.content}`;
        lines.push(seedLine);
    });

    // 去重相邻重复行
    const compact = [];
    for (let i = 0; i < lines.length; i++) {
        if (i === 0 || lines[i] !== lines[i - 1]) compact.push(lines[i]);
    }

    return {
        hasThread: true,
        contextText: compact.join('\n')
    };
}
// ====== 续聊：线程抽取工具 END ======


// ====== 评论轮次链工具 START ======
function getStableVirtualIdByName(name) {
    const s = String(name || '');
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
        hash = ((hash << 5) - hash) + s.charCodeAt(i);
        hash |= 0;
    }
    return -200000 - Math.abs(hash);
}

function isMomentAuthorComment(comment, moment) {
    if (!comment || !moment) return false;
    const authorId = moment.authorId;
    const authorName = String(moment.authorName || '').trim();
    const senderName = String(comment.senderName || '').trim();

    if (typeof authorId === 'number' && comment.senderId === authorId) return true;
    if (authorName && senderName === authorName) return true;
    return false;
}

// 读取“上一轮”里主人回复过谁，以及主人对他们说了什么
function getRoundChainInfo(moment) {
    const list = moment && Array.isArray(moment.commentsList) ? moment.commentsList : [];
    const lastRoundId = moment ? moment.lastCommentRoundId : null;

    if (!lastRoundId) {
        return {
            canContinue: false,
            allowedNames: [],
            ownerReplyContextMap: {},
            roundComments: []
        };
    }

    const roundComments = list.filter(c => c && c.roundId === lastRoundId);
    if (roundComments.length === 0) {
        return {
            canContinue: false,
            allowedNames: [],
            ownerReplyContextMap: {},
            roundComments: []
        };
    }

    const allowedNames = [];
    const ownerReplyContextMap = {};

    roundComments.forEach(c => {
        if (!isMomentAuthorComment(c, moment)) return;
        const toName = String(c.replyToName || '').trim();
        if (!toName) return;

        if (!allowedNames.includes(toName)) {
            allowedNames.push(toName);
        }
        ownerReplyContextMap[toName] = String(c.content || '').trim();
    });

    return {
        canContinue: allowedNames.length > 0,
        allowedNames,
        ownerReplyContextMap,
        roundComments
    };
}

// 根据名字恢复 actor（优先用最近评论中的 senderId）
function resolveActorsByNamesFromMoment(moment, names) {
    const list = moment && Array.isArray(moment.commentsList) ? moment.commentsList : [];
    const out = [];

    names.forEach(name => {
        const n = String(name || '').trim();
        if (!n) return;

        let found = null;
        for (let i = list.length - 1; i >= 0; i--) {
            const c = list[i];
            if (!c) continue;
            if (String(c.senderName || '').trim() !== n) continue;
            if (c.senderId === 'me') continue;
            if (isMomentAuthorComment(c, moment)) continue;
            found = c;
            break;
        }

        if (found && typeof found.senderId === 'number' && found.senderId > 0) {
            out.push({ type: 'chat', id: found.senderId, name: n });
        } else {
            out.push({ type: 'virtual_slot', id: getStableVirtualIdByName(n), name: n });
        }
    });

    return out;
}

// 对AI返回做硬过滤：保证链式规则不跑偏
function applyRoundCommentRules(commentsData, moment, mode, allowedNames) {
    const arr = Array.isArray(commentsData) ? commentsData : [];
    const authorId = moment.authorId;
    const authorName = String(moment.authorName || '').trim();
    const allowedSet = new Set((allowedNames || []).map(x => String(x || '').trim()).filter(Boolean));

    const filtered = arr.filter(item => {
        const roleName = String(item.roleName || '').trim();
        const isAuthor = (typeof authorId === 'number' && item.roleId === authorId) || (roleName === authorName);

        if (mode === 'continue') {
            if (isAuthor) {
                const toName = String(item.replyToName || '').trim();
                return !!toName && allowedSet.has(toName);
            } else {
                // 非作者：只能是 allowedNames 里的人
                if (!allowedSet.has(roleName)) return false;
                // 强制回复作者，形成你要的“接主人话头”
                item.replyToName = authorName;
                return true;
            }
        }

        // new 模式不过滤
        return true;
    });

    // 必须有“作者回复他人”，否则下一轮无法形成链
    const authorReplyCount = filtered.filter(item => {
        const roleName = String(item.roleName || '').trim();
        const isAuthor = (typeof authorId === 'number' && item.roleId === authorId) || (roleName === authorName);
        return isAuthor && String(item.replyToName || '').trim().length > 0;
    }).length;

    if (authorReplyCount === 0) {
        return { ok: false, message: '生成失败：动态作者未回复任何人，请重试', list: [] };
    }

    return { ok: true, message: '', list: filtered };
}
// ====== 评论轮次链工具 END ======


// ====== 用户评论输入栏控制（可收起）START ======
function openCommentInput(momentId, replyToName, btnEl) {
    const bar = document.getElementById('commentInputBar');
    const input = document.getElementById('commentInput');
    if (!bar || !input) return;

    const isVisible = bar.style.display === 'flex';

    // 中文注释：如果输入栏已打开，并且再次点击的是同一条动态的“评论”，则收起输入栏
    if (isVisible && currentCommentMomentId === momentId && !replyToName) {
        closeCommentInputBar();
        return;
    }

    // 正常打开/切换到新的动态或进入回复模式
    currentCommentMomentId = momentId;
    currentCommentReplyToName = replyToName || null;

    // 记录按钮引用（可选）
    currentCommentBtnEl = btnEl || null;

    bar.style.display = 'flex';
    input.value = '';
    input.placeholder = currentCommentReplyToName ? `回复 ${currentCommentReplyToName}...` : '评论...';

    setTimeout(() => input.focus(), 50);
}
// ====== 用户评论输入栏控制（可收起）END ======



function closeCommentInputBar() {
    const bar = document.getElementById('commentInputBar');
    const input = document.getElementById('commentInput');
    if (bar) bar.style.display = 'none';
    if (input) input.blur();

    currentCommentMomentId = null;
    currentCommentReplyToName = null;
}
// ====== 用户评论输入栏控制 END ======

// ====== 评论点击回复 START ======
function replyToComment(momentId, commentId, senderName) {
    // 中文注释：点击某条评论 -> 回复该评论的发送者
     openCommentInput(momentId, senderName, null);
}
// ====== 评论点击回复 END ======

// ====== 用户发送评论 START ======
async function sendUserComment() {
    const input = document.getElementById('commentInput');
    if (!input) return;

    const text = String(input.value || '').trim();
    if (!text) return;

    if (!currentCommentMomentId) return;

    const moment = moments.find(m => m.id === currentCommentMomentId);
    if (!moment) return;

    // 中文注释：用户昵称来自朋友圈资料
    const userName = (momentsProfile && momentsProfile.name) ? momentsProfile.name : '我';

    // 1) 写入用户评论
    if (!moment.commentsList) moment.commentsList = [];

    const userComment = {
        id: 'c_' + Date.now() + '_' + Math.random().toString(16).slice(2),
        senderId: 'me',
        senderName: userName,
        replyToId: null,
        replyToName: currentCommentReplyToName, // null=评论动态；非null=回复某人
        content: sanitizeCommentText(text),
        time: Date.now(),
        isAiGenerated: false
    };

    moment.commentsList.push(userComment);
    moment.comments = moment.commentsList.length;

    saveToDB('moments', { list: moments });
    renderMomentsList();

    // 2) 关闭输入栏
    closeCommentInputBar();

    // 3) 自动触发作者回复（用副API方案）
    // ====== 评论按钮变“生成中”START ======
setCommentBtnLoadingByMomentId(moment.id, true);
let replyRoleId = null;

// 如果用户是在“回复某人”，就从评论列表里找到那个人最新的一条评论的 senderId
if (userComment.replyToName) {
    const list = Array.isArray(moment.commentsList) ? moment.commentsList : [];
    for (let i = list.length - 1; i >= 0; i--) {
        const c = list[i];
        if (c && c.senderName === userComment.replyToName && c.senderId !== 'me') {
            replyRoleId = c.senderId;
            break;
        }
    }
}

await autoReplyToUserComment(moment, userComment, replyRoleId);

setCommentBtnLoadingByMomentId(moment.id, false);

// ====== 评论按钮变“生成中”END ======

}
// ====== 用户发送评论 END ======

// ====== 角色自动回复用户评论 START ======
async function autoReplyToUserComment(moment, userComment, replyRoleId) {
    // responderId：默认动态作者；但如果动态作者是 me（用户动态），则用“被回复的评论者”
    let responderId = moment.authorId;

    // 用户动态：只有在“回复某个角色评论”时才触发自动回复
    if (responderId === 'me') {
        if (typeof replyRoleId === 'number') {
            responderId = replyRoleId;
        } else {
            return;
        }
    }

    const scheme = getSubApiScheme();
    if (!scheme || !scheme.baseUrl || !scheme.apiKey || !scheme.defaultModel) {
        console.warn('[comment-reply] 副API方案未配置，跳过自动回复');
        return;
    }

    // 回复者名字：从评论区里找 responderId 对应的 senderName；找不到再兜底
    let responderName = moment.authorName || 'TA';
    const list = Array.isArray(moment.commentsList) ? moment.commentsList : [];
    for (let i = list.length - 1; i >= 0; i--) {
        const c = list[i];
        if (c && c.senderId === responderId && c.senderName) {
            responderName = c.senderName;
            break;
        }
    }

    const charInfoAll = await loadCharacterInfoAllSafe();
    const responderInfo = charInfoAll && charInfoAll[responderId] ? charInfoAll[responderId] : {};
    const responderPersonality = responderInfo.personality || '';
    const relationshipText = responderInfo.relationshipText || '';

    // 取该动态最近12条评论作为上下文
    const threadContext = buildCommentThreadContext(moment, 12);

    const prompt = buildUserCommentReplyPrompt({
        authorName: responderName,
        authorId: responderId,
        authorPersonality: responderPersonality,
        relationshipText,
        momentContent: moment.content,
        threadContext,
        userName: userComment.senderName,
        userText: userComment.content,
        replyToName: userComment.replyToName
    });

    const raw = await callSubApiGenerateCommentsOnly({
        baseUrl: scheme.baseUrl,
        apiKey: scheme.apiKey,
        model: scheme.defaultModel,
        prompt
    });

    if (!raw) return;

    const replyText = parseJsonObjectContentFromText(raw);
    if (!replyText) return;

    const clean = sanitizeCommentText(replyText);
    if (!clean) return;

    if (!moment.commentsList) moment.commentsList = [];

    const reply = {
        id: 'c_' + Date.now() + '_' + Math.random().toString(16).slice(2),
        senderId: responderId,
        senderName: responderName,
        replyToId: userComment.id,
        replyToName: userComment.senderName,
        content: clean,
        time: Date.now(),
        isAiGenerated: true
    };

    moment.commentsList.push(reply);
    moment.comments = moment.commentsList.length;

    saveToDB('moments', { list: moments });
    renderMomentsList();
}
// ====== 角色自动回复用户评论 END ======


// ====== 评论线程上下文构建 START ======
function buildCommentThreadContext(moment, limit) {
    const list = moment && Array.isArray(moment.commentsList) ? moment.commentsList : [];
    const max = Number.isFinite(limit) && limit > 0 ? limit : 12;
    const tail = list.slice(Math.max(0, list.length - max));

    const lines = tail.map(c => {
        if (!c) return '';
        const who = c.senderName || '未知';
        const content = c.content || '';
        if (c.replyToName) {
            return `${who} 回复 ${c.replyToName}：${content}`;
        }
        return `${who}：${content}`;
    }).filter(Boolean);

    return lines.join('\n');
}
// ====== 评论线程上下文构建 END ======

// ====== 用户评论回复提示词 START ======
function buildUserCommentReplyPrompt(opts) {
    const authorName = opts.authorName || '作者';
    const authorPersonality = opts.authorPersonality || '（未提供）';
    const relationshipText = opts.relationshipText || '';
    const momentContent = opts.momentContent || '';
    const threadContext = opts.threadContext || '';
    const userName = opts.userName || '我';
    const userText = opts.userText || '';
    const replyToName = opts.replyToName || null;

    return `
你正在扮演：${authorName}。你是这条朋友圈动态的作者，现在有人在评论区和你互动。

【作者人设】
${authorPersonality}

【作者关系网文本（可用作关系线索）】
${relationshipText ? relationshipText : '（无）'}

【动态内容】
${momentContent}

【当前评论区上下文（从旧到新）】
${threadContext || '（无）'}

【用户本次发言】
${replyToName ? `用户在回复 ${replyToName}：${userText}` : `用户评论你：${userText}`}

【要求】
1) 你必须以第一人称、符合人设的口吻回复 ${userName}，语气自然真实。
2) 回复要承接上下文，别突然换话题。
3) 纯文本回复：禁止使用任何方括号表情（如[doge][坏笑][表情]）。
4) 可以少量颜文字(>_<)(._.)，不要太多。
5) 字数 8-40 个汉字。
6) 只输出严格 JSON（必须使用英文双引号 " ，禁止中文引号 “ ”）：
{"content":"你的回复"}
`.trim();
}
// ====== 用户评论回复提示词 END ======

// ====== 回复JSON解析 START ======
function parseJsonObjectContentFromText(text) {
    let s = String(text || '').trim();
    if (!s) return null;

    // 提取代码块
    const codeBlock = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (codeBlock && codeBlock[1]) {
        s = codeBlock[1].trim();
    }

    // 清洗中文符号
    s = s.replace(/[“”]/g, '"');
    s = s.replace(/：/g, ':');
    s = s.replace(/，/g, ',');
    s = s.replace(/,\s*}/g, '}');

    // 提取 {...}
    const objMatch = s.match(/\{[\s\S]*\}/);
    if (objMatch) s = objMatch[0];

    // 补全 }
    const openCurly = (s.match(/{/g) || []).length;
    const closeCurly = (s.match(/}/g) || []).length;
    if (closeCurly < openCurly) s += '}'.repeat(openCurly - closeCurly);

    try {
        const v = JSON.parse(s);
        if (!v || !v.content) return null;
        return String(v.content).trim();
    } catch (e) {
        console.error('[reply] parse failed:', s);
        return null;
    }
}
// ====== 回复JSON解析 END ======

// ====== 评论按钮加载态（按动态ID定位）START ======
function setCommentBtnLoadingByMomentId(momentId, isLoading) {
    const el = document.getElementById(`commentBtn-${momentId}`);
    if (!el) return;

    if (isLoading) {
        if (!el.dataset.originHtml) el.dataset.originHtml = el.innerHTML;
        el.innerHTML = `<span class="comment-loading"></span><span style="font-size:12px; margin-left:4px;">生成中</span>`;
        el.style.pointerEvents = 'none';
    } else {
        if (el.dataset.originHtml) el.innerHTML = el.dataset.originHtml;
        el.style.pointerEvents = 'auto';
        delete el.dataset.originHtml;
    }
}
// ====== 评论按钮加载态（按动态ID定位）END ======

// ====== 用户动态可见性状态 START ======
// 中文注释：用户发布动态时选择“公开/分组可见”
let draftMomentVisibility = { mode: 'public', groupId: null };
// ====== 用户动态可见性状态 END ======

/* ====== 可见性弹窗控制 START ====== */
function openMomentVisibilityModal() {
    // 打开前先加载分组列表
    loadChatGroups(() => {
        fillMomentVisibilityGroupSelect();
        renderMomentVisibilityUI();
        document.getElementById('momentVisibilityModal').style.display = 'flex';
    });
}

function closeMomentVisibilityModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('momentVisibilityModal').style.display = 'none';
}

function fillMomentVisibilityGroupSelect() {
    const sel = document.getElementById('momentVisibilityGroupSelect');
    if (!sel) return;

    sel.innerHTML = '<option value="">请选择分组...</option>';
    (chatGroups || []).forEach(g => {
        sel.innerHTML += `<option value="${g.id}">${escapeHtml(g.name)}</option>`;
    });

    sel.value = draftMomentVisibility.groupId ? String(draftMomentVisibility.groupId) : '';
}

function renderMomentVisibilityUI() {
    // radio 回显
    const radios = document.querySelectorAll('input[name="momentVisibilityMode"]');
    radios.forEach(r => r.checked = (r.value === draftMomentVisibility.mode));

    const panel = document.getElementById('momentVisibilityGroupPanel');
    if (panel) panel.style.display = (draftMomentVisibility.mode === 'group') ? 'block' : 'none';

    // 发布弹窗里的显示
    const label = document.getElementById('momentVisibilityValue');
    if (label) {
        if (draftMomentVisibility.mode === 'public') {
            label.textContent = '公开';
        } else {
            const g = (chatGroups || []).find(x => x.id === draftMomentVisibility.groupId);
            label.textContent = g ? `分组：${g.name}` : '分组';
        }
    }
}

function handleMomentVisibilityModeChange() {
    const checked = document.querySelector('input[name="momentVisibilityMode"]:checked');
    if (!checked) return;

    draftMomentVisibility.mode = checked.value;
    if (draftMomentVisibility.mode === 'public') {
        draftMomentVisibility.groupId = null;
    }
    renderMomentVisibilityUI();
}

function handleMomentVisibilityChange() {
    const sel = document.getElementById('momentVisibilityGroupSelect');
    draftMomentVisibility.groupId = sel && sel.value ? parseInt(sel.value, 10) : null;
    renderMomentVisibilityUI();
}
/* ====== 可见性弹窗控制 END ====== */

// ====== 用户动态可见池计算 START ======
function getVisibleChatPoolForUserMoment(moment) {
    const allSingles = Array.isArray(chats) ? chats.filter(c => c.type === 'single') : [];
    const allIds = allSingles.map(c => c.id);

    const v = moment && moment.visibility ? moment.visibility : null;
    const mode = v && v.mode ? v.mode : 'public';

    if (mode === 'public') return allIds;

    if (mode === 'group') {
        const groupId = v.groupId;
        const g = (chatGroups || []).find(x => x.id === groupId);
        if (!g || !Array.isArray(g.memberChatIds)) return [];
        // 只允许单聊角色 id
        return g.memberChatIds.filter(id => allIds.includes(id));
    }

    return allIds;
}
// ====== 用户动态可见池计算 END ======

// ====== 角色视角：用户动态可见性判断 START ======

// chatId 是否能看到某条“用户动态”（authorId==='me'）
function canChatSeeUserMoment(chatId, moment) {
    if (!moment || moment.authorId !== 'me') return false;

    const v = moment.visibility || { mode: 'public', groupId: null };
    const mode = v.mode || 'public';

    // 公开：所有单聊角色可见
    if (mode === 'public') return true;

    // 分组可见：只有分组成员可见
    if (mode === 'group') {
        const groupId = v.groupId;
        if (!groupId) return false;
        const g = (chatGroups || []).find(x => x.id === groupId);
        if (!g || !Array.isArray(g.memberChatIds)) return false;
        return g.memberChatIds.includes(chatId);
    }

    // 兜底：未知模式按公开处理或不可见；这里更安全用不可见
    return false;
}

// 获取某角色可见的“用户最近N条动态”（包含评论区）
function getVisibleUserMomentsForChat(chatId, limit) {
    const n = Number.isFinite(limit) && limit > 0 ? limit : 3;

    const list = Array.isArray(moments) ? moments : [];
    const userMoments = list
        .filter(m => m && m.authorId === 'me')
        .filter(m => canChatSeeUserMoment(chatId, m))
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        .slice(0, n);

    return userMoments;
}

// 把可见动态 + 评论区格式化成一段上下文文本，供 prompt 使用
function formatVisibleUserMomentsContext(chatId, limit) {
    const ms = getVisibleUserMomentsForChat(chatId, limit);

    if (!ms || ms.length === 0) return '（用户近期无你可见的动态）';

    return ms.map((m, idx) => {
        const v = m.visibility || { mode: 'public', groupId: null };
        const visText = v.mode === 'group' ? `分组(${v.groupId || ''})` : '公开';

        const comments = Array.isArray(m.commentsList) ? m.commentsList : [];
        const commentLines = comments.slice(0, 12).map(c => {
            if (!c) return '';
            if (c.replyToName) return `${c.senderName} 回复 ${c.replyToName}：${c.content}`;
            return `${c.senderName}：${c.content}`;
        }).filter(Boolean);

        const commentsText = commentLines.length > 0 ? commentLines.join('\n') : '（暂无评论）';

        return `【用户动态#${idx + 1}｜${visText}｜${new Date(m.timestamp || Date.now()).toLocaleString()}】
内容：${String(m.content || '').trim() || '（无文字）'}
评论区：
${commentsText}`;
    }).join('\n\n');
}

// ====== 角色视角：用户动态可见性判断 END ======



// ============ 视觉评论：抽样+压缩+总结存储（用户动态专用）===========

// 随机抽取最多 n 张图片（>n 则随机挑 n 张）
function pickRandomImages(images, n) {
    const arr = Array.isArray(images) ? images.filter(Boolean) : [];
    if (arr.length <= n) return arr.slice();
    const copy = arr.slice();
    copy.sort(() => Math.random() - 0.5);
    return copy.slice(0, n);
}

// 本地压缩一张 dataURL 图片，返回 Promise<dataURL>；失败返回 null
function compressDataUrlImage(dataUrl, maxSide = 512, quality = 0.62) {
    return new Promise(resolve => {
        try {
            if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image')) {
                resolve(null);
                return;
            }

            const img = new Image();
            img.onload = () => {
                try {
                    let w = img.width;
                    let h = img.height;
                    if (!w || !h) {
                        resolve(null);
                        return;
                    }

                    const scale = Math.min(1, maxSide / Math.max(w, h));
                    const nw = Math.max(1, Math.round(w * scale));
                    const nh = Math.max(1, Math.round(h * scale));

                    const canvas = document.createElement('canvas');
                    canvas.width = nw;
                    canvas.height = nh;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, nw, nh);

                    const out = canvas.toDataURL('image/jpeg', quality);
                    // 简单保护：太大则认为失败（避免请求炸）
                    if (out && out.length > 1600000) {
                        resolve(null);
                        return;
                    }
                    resolve(out);
                } catch (e) {
                    resolve(null);
                }
            };
            img.onerror = () => resolve(null);
            img.src = dataUrl;
        } catch (e) {
            resolve(null);
        }
    });
}

// 多张图压缩（最多3张），返回压缩后的 dataURL 数组
async function compressImagesForVision(images) {
    const picked = pickRandomImages(images, 3);
    const compressed = [];
    for (const img of picked) {
        const out = await compressDataUrlImage(img, 512, 0.62);
        if (out) compressed.push(out);
        if (compressed.length >= 3) break;
    }
    return compressed;
}

async function callSubApiVisionSummarizeMoment(params) {
    const baseUrl = (params.baseUrl || '').trim();
    const apiKey = (params.apiKey || '').trim();
    const model = (params.model || '').trim();
    const momentText = params.momentText || '';
    const visionImages = Array.isArray(params.visionImages) ? params.visionImages : [];

    if (!baseUrl || !apiKey || !model) {
        alert('[VisionSummary] baseUrl/apiKey/model 缺失');
        return null;
    }

    const url = baseUrl.endsWith('/')
        ? baseUrl + 'chat/completions'
        : baseUrl + '/chat/completions';

    // 用于确认代码生效&请求地址正确
    // alert('[VisionSummary] URL=' + url);

    const content = [
        {
            type: 'text',
            text:

`你是图片理解助手。请结合动态文字与图片内容，输出“严格可解析 JSON”。

【输出要求（必须严格遵守）】
1) 只输出一个 JSON 对象，禁止输出任何解释、标题、代码块标记（禁止输出 \`\`\`json）。
2) 输出必须包含最外层花括号 { }，禁止只输出片段（例如只输出 "images": [...] 这种是不允许的）。
3) JSON 必须能被 JavaScript JSON.parse 直接解析通过：必须用英文双引号 " ，禁止中文引号 “ ”。
4) 字段结构必须完全符合下面模板，字段名不能改：
{
  "images": [
    {"idx": 1, "desc": "..."},
    {"idx": 2, "desc": "..."}
  ],
  "overall": "..."
}
5) images 数组长度 = 你实际看到的图片数量（最多3张），idx 从 1 开始按输入顺序编号。
6) desc 每条 40-150 个汉字，必须包含以下信息（尽量具体）：
   - 主体是谁/是什么（人/动物/物品），视频，装饰，在做什么
   - 场景地点（室内/室外/街道/餐厅/家里等）
   - 构图与细节（颜色、光线、天气、动作、表情、穿着/物品）
   - 氛围情绪（轻松/疲惫/开心/压抑等）
   不要写“可能/也许/像是AI猜测”，要像人在看图描述。

7) overall 50-100 个汉字：用一句话总结“整条动态的画面气质 + 用户状态/意图”（如记录生活/分享美食/吐槽等）。


【动态文字】
${momentText || '（无）'}`

        },
        ...visionImages.map(u => ({ type: 'image_url', image_url: { url: u } }))
    ];

    let resp;
    try {
        resp = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model,
                temperature: 0.2,
                max_tokens: 2000,
                messages: [
                    { role: 'system', content: '你是一个严格输出JSON的视觉总结器。' },
                    { role: 'user', content }
                ]
            })
        });
    } catch (e) {
        alert('[VisionSummary] fetch 失败：' + (e && e.message ? e.message : String(e)));
        return null;
    }

    if (!resp.ok) {
        const t = await resp.text().catch(() => '');
        alert(
            '[VisionSummary] HTTP错误\n' +
            'HTTP: ' + resp.status + '\n' +
            'URL: ' + url + '\n\n' +
            (t ? ('返回(前400字):\n' + t.slice(0, 400)) : '无返回内容')
        );
        return null;
    }

    // 有些反代会返回非JSON，先读 text 再尝试 parse
    const rawText = await resp.text().catch(() => '');
    if (!rawText) {
        alert('[VisionSummary] 响应为空\nURL: ' + url);
        return null;
    }

    let data;
    try {
        data = JSON.parse(rawText);
    } catch (e) {
        alert(
            '[VisionSummary] 返回不是JSON\n' +
            'URL: ' + url + '\n\n' +
            '返回(前400字):\n' + rawText.slice(0, 400)
        );
        return null;
    }

    const raw = data && data.choices && data.choices[0] && data.choices[0].message
        ? data.choices[0].message.content
        : '';

    if (!raw) {
        alert(
            '[VisionSummary] 返回结构不含 choices[0].message.content\n' +
            'URL: ' + url + '\n\n' +
            '返回JSON(前400字):\n' + JSON.stringify(data).slice(0, 400)
        );
        return null;
    }

 // ===== Vision Summary Parse (Robust) =====
let s = String(raw || '').trim();

// 去掉 ```json 代码块
s = s.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();

// 修正常见中文符号
s = s.replace(/[“”]/g, '"').replace(/：/g, ':').replace(/，/g, ',');

// 如果模型只输出了 "images": [...] 片段，包一层 {}
if (!s.startsWith('{') && s.includes('"images"')) s = '{' + s;
if (!s.endsWith('}') && s.includes('"images"')) s = s + '}';

// 尝试提取第一个 {...}
const m = s.match(/\{[\s\S]*\}/);
if (m) s = m[0];

// 先尝试严格 JSON.parse
try {
    const obj = JSON.parse(s);
    if (obj && Array.isArray(obj.images)) {
        if (typeof obj.overall !== 'string') obj.overall = '';
        return obj;
    }
} catch (e) {
    // ignore, fallback below
}

// Fallback：从文本中“抽取”idx/desc，然后重新组装（最稳）
const images = [];
const imgBlock = String(raw || '');
const re = /"idx"\s*:\s*(\d+)[\s\S]*?"desc"\s*:\s*"([^"]*)/g;
let mm;
while ((mm = re.exec(imgBlock)) !== null) {
    const idx = parseInt(mm[1], 10);
    const desc = (mm[2] || '').trim();
    if (Number.isFinite(idx) && desc) {
        images.push({ idx, desc });
    }
}

// 再兜底：有的模型可能输出 desc 没有引号，用另一条规则抽取到换行/括号前
if (images.length === 0) {
    const re2 = /"idx"\s*:\s*(\d+)[\s\S]*?"desc"\s*:\s*([^,\]\}\n\r]+)/g;
    while ((mm = re2.exec(imgBlock)) !== null) {
        const idx = parseInt(mm[1], 10);
        let desc = (mm[2] || '').trim();
        desc = desc.replace(/^[":\s]+/, '').replace(/[",\]\}\s]+$/, '').trim();
        if (Number.isFinite(idx) && desc) {
            images.push({ idx, desc });
        }
    }
}

if (images.length === 0) {
    alert(
        '[VisionSummary] 无法从模型输出中提取图片描述\n' +
        '模型原文(前400字):\n' + String(raw).slice(0, 400)
    );
    return null;
}

return { images: images.slice(0, 3), overall: '' };
// ===== Vision Summary Parse END =====


}
function safeParseVisionSummary(text) {
    let s = String(text || '').trim();
    if (!s) return null;

    // 去掉 ```json 代码块
    s = s.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();

    // 把中文引号之类修一下
    s = s.replace(/[“”]/g, '"').replace(/：/g, ':').replace(/，/g, ',');

    // 如果模型只输出了字段片段（没有最外层 {}），自动包裹
    if (!s.startsWith('{') && s.includes('"images"')) {
        s = '{' + s;
    }
    if (!s.endsWith('}') && s.includes('"images"')) {
        s = s + '}';
    }

    // 尝试提取 {...}（如果里面混了别的文字）
    const m = s.match(/\{[\s\S]*\}/);
    if (m) s = m[0];

    // 补全缺失括号
    const openCurly = (s.match(/{/g) || []).length;
    const closeCurly = (s.match(/}/g) || []).length;
    if (closeCurly < openCurly) s += '}'.repeat(openCurly - closeCurly);

    const openSquare = (s.match(/\[/g) || []).length;
    const closeSquare = (s.match(/]/g) || []).length;
    if (closeSquare < openSquare) s += ']'.repeat(openSquare - closeSquare);

    try {
        const obj = JSON.parse(s);
        if (!obj || !Array.isArray(obj.images)) return null;
        return obj;
    } catch (e) {
        return null;
    }
}


// 把视觉总结广播写入所有单聊，并且每个单聊只保留最近3条 moment_vision_hidden
function broadcastVisionSummaryToAllSingleChats(summaryPayload) {
    if (!summaryPayload) return;

    loadFromDB('messages', (data) => {
        let all = [];
        if (data && Array.isArray(data.list)) all = data.list;
        else if (Array.isArray(data)) all = data;

        const singles = Array.isArray(chats) ? chats.filter(c => c.type === 'single') : [];
        const now = getCurrentTime();

        singles.forEach(chat => {
            // 先清理该 chatId 旧的 hidden（只保留最近3条）
            const hidden = all
                .filter(m => m && m.chatId === chat.id && m.type === 'moment_vision_hidden')
                .sort((a, b) => (Date.parse(b.time || '') || 0) - (Date.parse(a.time || '') || 0));

            const keepIds = new Set(hidden.slice(0, 3).map(m => m.id));
            all = all.filter(m => !(m && m.chatId === chat.id && m.type === 'moment_vision_hidden' && !keepIds.has(m.id)));

            // 写入新的一条 hidden
            all.push({
                id: Date.now() + Math.floor(Math.random() * 1000),
                chatId: chat.id,
                type: 'moment_vision_hidden',
                senderId: 'me',
                time: now,
                isRevoked: false,
                visionData: summaryPayload
            });
        });

        const tx = db.transaction(['messages'], 'readwrite');
        tx.objectStore('messages').put({ id: 1, list: all });
    });
}



// ====== 用户动态评论生成 Prompt+API START ======
async function callApiToGenUserMomentComments(moment, chatIdList, scheme, visionSummaryText) {
    const charInfoAll = await loadCharacterInfoAllSafe();

    // 参与者人设卡片（只是真实角色）
    const cards = chatIdList.map(id => {
        const chat = (chats || []).find(c => c.id === id);
        const name = chat ? chat.name : `角色${id}`;
        const info = charInfoAll && charInfoAll[id] ? charInfoAll[id] : {};
        const p = info.personality || '性格信息不详，说话简短自然。';
        return `- ${name} (roleId=${id})：${p}`;
    }).join('\n');

    const userName = momentsProfile && momentsProfile.name ? momentsProfile.name : '我';

    const prompt = `
你是“朋友圈评论生成器”。现在用户发布了一条动态，请让以下角色各自评论一句。
【动态作者（用户）】
${userName}
【动态内容】
${moment.content}
【图片内容摘要（由视觉识别得出）】
${visionSummaryText ? visionSummaryText : '（无图片或未识别）'}
【可评论的角色（每人必须严格按自己人设说话）】
${cards}
【任务要求】
0) 【禁止暧昧互动（最高优先级）】
- 禁止任何“角色 ↔ 角色”之间的暧昧/恋爱向互动与称呼：不许互撩、调情、示爱、吃醋、争宠。
- 禁止使用暧昧/恋爱称呼或措辞（对其他角色不允许）：如“宝贝/亲爱的/老婆/老公/对象/想你/心动/约会/抱抱/亲亲”等。
- 评论可以热闹，但不得把重点写成角色之间的暧昧互动。
1) 只生成顶层评论：每条 replyToName 必须为 null。
2) 每个角色最多输出 1 条评论（不要重复角色）。
3) 评论要口语化、短句为主，像真实朋友圈，允许少量颜文字(>_<)(._.)。
4) 禁止使用任何方括号表情，例如：[坏笑][doge][表情]。
5) 输出条数必须等于角色数量（roleIdList 有几个就输出几条）。

【输出格式】
只输出严格 JSON 数组（必须使用英文双引号 " ，禁止中文引号 “ ”），数组必须完整闭合，以 ] 结束。
每个元素格式：
{"roleId": 1, "roleName": "名字", "content": "评论内容", "replyToName": null}
【可用 roleId/name 对照】
${chatIdList.map(id => {
        const chat = (chats || []).find(c => c.id === id);
        return `${chat ? chat.name : ('角色' + id)}=${id}`;
    }).join(', ')}
`.trim();
    const raw = await callSubApiGenerateCommentsOnly({
        baseUrl: scheme.baseUrl,
        apiKey: scheme.apiKey,
        model: scheme.defaultModel,
        prompt
    });
    if (!raw) return null;

    const arr = parseJsonArrayFromText(raw);
    if (!Array.isArray(arr)) return null;

    // 规范化并做一次“每人一条”去重（双保险）
    const seen = new Set();
    const normalized = arr.map(x => ({
        roleId: typeof x.roleId === 'number' ? x.roleId : -9999,
        roleName: String(x.roleName || '未知'),
        content: sanitizeCommentText(String(x.content || '')),
        replyToName: null
    })).filter(x => x.roleId > 0 && !seen.has(x.roleId) && x.content);

    normalized.forEach(x => seen.add(x.roleId));

    return normalized;
}
// ====== 用户动态评论生成 Prompt+API END ======

// ====== 用户动态可见性标签渲染 START ======
function renderMomentVisibilityTag(m) {
    // 中文注释：只展示用户动态的可见范围；老动态没有 visibility 默认公开
    if (!m || m.authorId !== 'me') return '';

    const v = m.visibility || { mode: 'public', groupId: null };
    if (!v || v.mode === 'public') {
        return `<div style="margin-top: 6px; font-size: 12px; color: #999;">公开 · 全员可见</div>`;
    }

    if (v.mode === 'group') {
        const g = (chatGroups || []).find(x => x.id === v.groupId);
        const name = g ? g.name : '未命名分组';
        return `<div style="margin-top: 6px; font-size: 12px; color: #999;">分组可见 · ${escapeHtml(name)}</div>`;
    }

    return '';
}
// ====== 用户动态可见性标签渲染 END ======

// ====== 动态转发模块 START ======
let currentForwardMomentId = null;
let forwardSelectedChatIds = [];

// 打开转发弹窗
function openMomentForwardModal(momentId) {
    currentForwardMomentId = momentId;
    forwardSelectedChatIds = [];

    renderMomentForwardList();
    updateForwardSelectedCount();

    document.getElementById('momentForwardModal').style.display = 'flex';
}

// 关闭转发弹窗
function closeMomentForwardModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('momentForwardModal').style.display = 'none';
    currentForwardMomentId = null;
    forwardSelectedChatIds = [];
}

// 渲染可选角色列表（只显示单聊）
function renderMomentForwardList() {
    const container = document.getElementById('momentForwardList');
    if (!container) return;

    const singles = Array.isArray(chats) ? chats.filter(c => c.type === 'single') : [];
    if (singles.length === 0) {
        container.innerHTML = `<div style="text-align:center; color:#999; padding: 20px 0;">暂无单聊角色可转发</div>`;
        return;
    }

    container.innerHTML = singles.map(chat => {
        const checked = forwardSelectedChatIds.includes(chat.id);

        const avatarHtml = chat.avatarImage
            ? `<img src="${chat.avatarImage}" alt="">`
            : (chat.avatar || '👤');

        // 中文注释：这里的点击既支持点整行，也支持点复选框
        return `
            <div class="forward-item" onclick="toggleForwardTarget(${chat.id})">
                <input class="forward-check" type="checkbox" ${checked ? 'checked' : ''} onclick="event.stopPropagation(); toggleForwardTarget(${chat.id})">
                <div class="forward-avatar">${avatarHtml}</div>
                <div class="forward-name">${escapeHtml(chat.name)}</div>
            </div>
        `;
    }).join('');
}

function toggleForwardTarget(chatId) {
    const idx = forwardSelectedChatIds.indexOf(chatId);
    if (idx >= 0) {
        forwardSelectedChatIds.splice(idx, 1);
    } else {
        forwardSelectedChatIds.push(chatId);
    }
    updateForwardSelectedCount();
    renderMomentForwardList();
}

function updateForwardSelectedCount() {
    const el = document.getElementById('forwardSelectedCount');
    if (el) el.textContent = String(forwardSelectedChatIds.length);
}

// 组装转发内容（用于写入聊天消息 & 用于AI读取）
function buildMomentForwardPayload(moment) {
    // 中文注释：评论区预览最多取前8条，避免太长
    const comments = Array.isArray(moment.commentsList) ? moment.commentsList : [];
    const preview = comments.slice(0, 8).map(c => {
        if (!c) return '';
        const who = c.senderName || '未知';
        if (c.replyToName) {
            return `${who} 回复 ${c.replyToName}：${c.content}`;
        }
        return `${who}：${c.content}`;
    }).filter(Boolean).join('\n');

    const v = moment.visibility || { mode: 'public', groupId: null };
    const visibilityText = v.mode === 'group'
        ? `分组可见(${v.groupId || ''})`
        : '公开';

    return {
        momentId: moment.id,
        authorName: moment.authorName,
        authorId: moment.authorId,
        content: moment.content || '',
        images: Array.isArray(moment.images) ? moment.images.slice(0, 3) : [],
        timestamp: moment.timestamp || Date.now(),
        visibility: v,
        visibilityText,
        commentsPreview: preview
    };
}

// ====== 确认转发（仅系统提示 + 隐藏上下文）START ======
function confirmMomentForward() {
    if (!currentForwardMomentId) return;

    if (!forwardSelectedChatIds || forwardSelectedChatIds.length === 0) {
        alert('请选择要转发的角色');
        return;
    }

    const moment = moments.find(m => m.id === currentForwardMomentId);
    if (!moment) {
        alert('找不到该动态');
        return;
    }

    const payload = buildMomentForwardPayload(moment);

    loadFromDB('messages', (data) => {
        let all = [];
        if (data && Array.isArray(data.list)) all = data.list;
        else if (Array.isArray(data)) all = data;

        // 中文注释：对每个选中的单聊，写入两条消息：
        // 1) system：用户可见
        // 2) moment_forward_hidden：用户不可见，但AI上下文可读
        forwardSelectedChatIds.forEach((chatId) => {
            const now = getCurrentTime();

            // 系统提示（可见）
            all.push({
                id: Date.now() + Math.floor(Math.random() * 1000),
                chatId: chatId,
                type: 'system',
                content: '你已转发一条朋友圈动态',
                senderId: 'system',
                time: now,
                isRevoked: false
            });

            // 隐藏上下文（不可见）
            all.push({
                id: Date.now() + Math.floor(Math.random() * 1000) + 1,
                chatId: chatId,
                type: 'moment_forward_hidden',
                content: '[隐藏转发上下文]',
                senderId: 'me',
                time: now,
                isRevoked: false,
                forwardData: payload
            });

            // 更新聊天列表预览
            updateChatLastMessage(chatId, '你已转发一条朋友圈动态');
        });

        // 保存回库
        const tx = db.transaction(['messages'], 'readwrite');
        tx.objectStore('messages').put({ id: 1, list: all });

        tx.oncomplete = () => {
            closeMomentForwardModal();
            alert('已转发');
        };
    });
}
// ====== 确认转发（仅系统提示 + 隐藏上下文）END ======

function bindChatItemClickDelegation() {
    const container = document.getElementById('chatListContainer');
    if (!container) return;

    if (container.dataset.clickBound === '1') return;
    container.dataset.clickBound = '1';

    container.addEventListener('click', (e) => {
        const item = e.target.closest('.chat-item');
        if (!item) return;

        const m = String(item.id || '').match(/^chat-(\d+)$/);
        if (!m) return;

        const chatId = parseInt(m[1], 10);
        if (!Number.isFinite(chatId)) return;

        if (typeof openChatDetail === 'function') {
            openChatDetail(chatId);
        }
    });
}
// ============ 智能空间管理 (Smart Cleaner) ============
const SMART_CLEAN_PROTECT_COUNT = 100; // 每个聊天保留最近100条
let cleanerStats = {
    imageSize: 0,
    stickerSize: 0,
    cardSize: 0,
    voiceSize: 0,
    totalSize: 0
};
// ★★★ 新增：计算字符串的实际字节大小 ★★★
function getByteSize(str) {
    if (!str) return 0;
    return new Blob([String(str)]).size;
}
function openSmartCleanerModal() {
    const modal = document.getElementById('smartCleanerModal');
    if (!modal) return;
    modal.style.display = 'flex';
    calculateCacheStats();
}
function closeSmartCleanerModal(event) {
    if (event && event.target !== event.currentTarget) return;
    const modal = document.getElementById('smartCleanerModal');
    if (modal) modal.style.display = 'none';
}
function smartCleanerFormatBytes(bytes, decimals = 2) {
    if (!bytes || bytes <= 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
function isSmartCleanPlaceholder(text) {
    const t = String(text || '').trim();
    return t === '[图片已过期/清理]' ||
           t === '[表情包已清理]' ||
           t === '[卡片已清理]' ||
           t === '[语音已过期]';
}
// ★★★ 修改：排除表情包 ★★★
function isImageMessage(msg) {
    if (!msg) return false;
    // 如果是表情包，不算图片
    if (msg.isSticker === true) return false;
    
    const c = String(msg.content || '');
    return msg.type === 'image' || c.startsWith('data:image/');
}
function isStickerMessage(msg) {
    if (!msg) return false;
    return msg.type === 'sticker' || (msg.isSticker === true && msg.type !== 'text');
}
function isCardMessage(msg) {
    if (!msg) return false;
    const c = String(msg.content || '');
    
    // 1. 明确的卡片类型
    if (msg.type === 'card') return true;
    
    // 2. 包含 HTML 卡片标记
    if (c.includes('[[CARD_HTML]]') || c.includes('[[/CARD_HTML]]')) return true;
    
    // 3. 包含完整的 HTML 结构
    if (c.includes('<html') && c.includes('</html>')) return true;
    if (c.includes('<div') && c.includes('</div>')) return true;
    if (c.includes('<style') && c.includes('</style>')) return true;
    
    return false;
}
function isVoiceMessage(msg) {
    return !!msg && msg.type === 'voice';
}
function calculateCacheStats() {
    cleanerStats = { imageSize: 0, stickerSize: 0, cardSize: 0, voiceSize: 0, totalSize: 0 };

    const setText = (id, txt) => {
        const el = document.getElementById(id);
        if (el) el.textContent = txt;
    };

    setText('cleanerTotalSize', '计算中...');
    setText('cleanerImageSize', '计算中...');
    setText('cleanerStickerCheckSize', '计算中...');
    setText('cleanerCardSize', '计算中...');
    setText('cleanerVoiceSize', '计算中...');

    loadFromDB('messages', (data) => {
        let allMessages = [];
        if (data && Array.isArray(data.list)) allMessages = data.list;
        else if (Array.isArray(data)) allMessages = data;

        const chatMap = {};
        allMessages.forEach(msg => {
            if (!msg || !msg.chatId) return;
            if (!chatMap[msg.chatId]) chatMap[msg.chatId] = [];
            chatMap[msg.chatId].push(msg);
        });

        Object.values(chatMap).forEach(chatMsgs => {
            chatMsgs.sort((a, b) => (a.id || 0) - (b.id || 0));

            // ★★★ 遍历所有消息 ★★★
            for (let i = 0; i < chatMsgs.length; i++) {
                const msg = chatMsgs[i];
                const byteSize = getByteSize(msg.content);

                if (isStickerMessage(msg)) {
                    cleanerStats.stickerSize += byteSize;
                } else if (isImageMessage(msg)) {
                    cleanerStats.imageSize += byteSize;
                } else if (isCardMessage(msg)) {
                    cleanerStats.cardSize += byteSize;
                } else if (isVoiceMessage(msg)) {
                    cleanerStats.voiceSize += byteSize;
                }
            }
        });

        cleanerStats.totalSize = cleanerStats.imageSize + cleanerStats.stickerSize + cleanerStats.cardSize + cleanerStats.voiceSize;

        setText('cleanerTotalSize', smartCleanerFormatBytes(cleanerStats.totalSize));
        setText('cleanerImageSize', smartCleanerFormatBytes(cleanerStats.imageSize));
        setText('cleanerStickerCheckSize', smartCleanerFormatBytes(cleanerStats.stickerSize));
        setText('cleanerCardSize', smartCleanerFormatBytes(cleanerStats.cardSize));
        setText('cleanerVoiceSize', smartCleanerFormatBytes(cleanerStats.voiceSize));
    });
}
function executeSmartClean() {
    const doImage = document.getElementById('cleanImageCheck')?.checked === true;
    const doSticker = document.getElementById('cleanStickerCheck')?.checked === true;
    const doCard = document.getElementById('cleanCardCheck')?.checked === true;
    const doVoice = document.getElementById('cleanVoiceCheck')?.checked === true;
    if (!doImage && !doSticker && !doCard && !doVoice) {
        alert('请至少选择一项进行清理');
        return;
    }
    if (!confirm(`确定清理选中缓存吗？\n\n保护规则：每个聊天最近 ${SMART_CLEAN_PROTECT_COUNT} 条消息不会被清理。`)) {
        return;
    }
    loadFromDB('messages', (data) => {
        let allMessages = [];
        if (data && Array.isArray(data.list)) allMessages = data.list;
        else if (Array.isArray(data)) allMessages = data;
        const chatMap = {};
        allMessages.forEach(msg => {
            if (!msg || !msg.chatId) return;
            if (!chatMap[msg.chatId]) chatMap[msg.chatId] = [];
            chatMap[msg.chatId].push(msg);
        });
        let cleanedCount = 0;
        let freedBytes = 0;
        Object.values(chatMap).forEach(chatMsgs => {
            chatMsgs.sort((a, b) => (a.id || 0) - (b.id || 0));
            const limit = Math.max(0, chatMsgs.length - SMART_CLEAN_PROTECT_COUNT);
            for (let i = 0; i < limit; i++) {
                const msg = chatMsgs[i];
                const oldLen = String(msg.content || '').length;
                let changed = false;
                if (doImage && isImageMessage(msg)) {
                    msg.content = '[图片已过期/清理]';
                    msg.type = 'text';
                    msg.isSticker = false;
                    changed = true;
                } else if (doSticker && isStickerMessage(msg)) {
                    msg.content = '[表情包已清理]';
                    msg.type = 'text';
                    msg.isSticker = false;
                    changed = true;
                } else if (doCard && isCardMessage(msg)) {
                    msg.content = '[卡片已清理]';
                    msg.type = 'text';
                    changed = true;
                } else if (doVoice && isVoiceMessage(msg)) {
                    msg.content = '[语音已过期]';
                    msg.type = 'text';
                    changed = true;
                }
                if (changed) {
                    cleanedCount++;
                    const newLen = String(msg.content || '').length;
                    if (oldLen > newLen) freedBytes += (oldLen - newLen);
                }
            }
        });
        const tx = db.transaction(['messages'], 'readwrite');
        tx.objectStore('messages').put({ id: 1, list: allMessages });
        tx.oncomplete = () => {
            alert(`✅ 清理完成\n处理消息：${cleanedCount} 条\n预计释放：${smartCleanerFormatBytes(freedBytes)}`);
            closeSmartCleanerModal();
            const detail = document.getElementById('chatDetailScreen');
            if (currentChatId && detail && detail.style.display === 'flex') {
                loadMessages(currentChatId);
            }
        };
        tx.onerror = (e) => {
            console.error('Smart clean save error:', e);
            alert('清理失败，请重试');
        };
    });
}

// ============ 快捷删除最新一次回复功能 ============

// 找到“最近一次 TA 连续回复块”的 allMessages 索引列表
function getLastAiReplyBatchIndexes() {
    if (!currentChatId) return [];

    const cid = String(currentChatId);

    // 取当前会话消息（保留全局索引）
    const chatItems = allMessages
        .map((m, idx) => ({ m, idx }))
        .filter(x => String(x.m.chatId) === cid);

    if (chatItems.length === 0) return [];

    // 从后往前找：先跳过我发的消息和系统消息
    let i = chatItems.length - 1;
    while (
        i >= 0 &&
        (chatItems[i].m.senderId === 'me' || chatItems[i].m.type === 'system')
    ) {
        i--;
    }

    // 没找到 TA 消息
    if (i < 0) return [];

    // 现在 i 指向“最近一条 TA 消息”
    const batch = [];
    while (i >= 0) {
        const msg = chatItems[i].m;

        // 系统消息不算在回复块中，直接跳过继续向前
        if (msg.type === 'system') {
            i--;
            continue;
        }

        // 遇到我发的消息，说明 TA 这一轮结束
        if (msg.senderId === 'me') break;

        // 收集 TA 消息
        batch.push(chatItems[i].idx);
        i--;
    }

    return batch; // 全局索引
}

// 1. 打开删除确认弹窗
function openDeleteLastMsgModal() {
    if (!currentChatId) return;

    const batchIndexes = getLastAiReplyBatchIndexes();

    if (batchIndexes.length === 0) {
        alert("当前没有可删除的最新一次回复");
        return;
    }

    const countEl = document.getElementById('deleteLastMsgCount');
    if (countEl) countEl.textContent = batchIndexes.length;

    document.getElementById('deleteLastMsgModal').style.display = 'flex';
}

// 2. 关闭弹窗
function closeDeleteLastMsgModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('deleteLastMsgModal').style.display = 'none';
}

// 3. 执行删除（删除整轮）
function confirmDeleteLastMsg() {
    if (!currentChatId) return;

    const batchIndexes = getLastAiReplyBatchIndexes();

    if (batchIndexes.length === 0) {
        closeDeleteLastMsgModal();
        return;
    }

    // 从大到小删，避免索引位移
    batchIndexes.sort((a, b) => b - a).forEach(index => {
        allMessages.splice(index, 1);
    });

    saveMessages();

    visibleMessagesCount = Math.min(visibleMessagesCount, allMessages.length);
    if (visibleMessagesCount < 10) visibleMessagesCount = Math.min(20, allMessages.length);

    renderMessages();
    scrollToBottom();

    // 更新列表预览
    const cid = String(currentChatId);
    const lastMsg = allMessages.filter(m => String(m.chatId) === cid).pop();
    let preview = '';
    if (lastMsg) {
        if (lastMsg.type === 'image') preview = '[图片]';
        else if (lastMsg.type === 'voice') preview = '[语音]';
        else if (lastMsg.type === 'shopping_order') preview = '[购物订单]';
        else if (lastMsg.type === 'system') preview = '[系统消息]';
        else preview = lastMsg.content || '';
    }
    updateChatLastMessage(currentChatId, preview);

    closeDeleteLastMsgModal();
}

// ========== 双人档案编辑功能 ==========


// 打开编辑双人信息弹窗
function openEditDualProfile() {
    const currentChat = chats.find(c => c.id === currentChatId);
    if (!currentChat) {
        console.error('openEditDualProfile: 找不到当前聊天');
        return;
    }
    
    console.log('当前聊天数据:', currentChat); // 调试用
    
    // 填充当前数据
    document.getElementById('editDualCharName').value = currentChat.name || '';
    document.getElementById('editDualMyName').value = currentChat.myName || '我';
    
    // 显示角色头像
    const charAvatarPreview = document.getElementById('editDualCharAvatar');
    if (charAvatarPreview) {
        // 清空之前的样式
        charAvatarPreview.style.backgroundImage = '';
        charAvatarPreview.textContent = '';
        
        if (currentChat.avatarImage) {
            // 如果有 avatarImage（图片URL）
            charAvatarPreview.style.backgroundImage = `url(${currentChat.avatarImage})`;
            charAvatarPreview.style.backgroundSize = 'cover';
            charAvatarPreview.style.backgroundPosition = 'center';
        
        } else if (currentChat.avatar && currentChat.avatar !== '👤') {
            // 如果有 avatar（可能是图片URL或emoji）
            if (currentChat.avatar.startsWith('http') || currentChat.avatar.startsWith('data:image')) {
                charAvatarPreview.style.backgroundImage = `url(${currentChat.avatar})`;
                charAvatarPreview.style.backgroundSize = 'cover';
                charAvatarPreview.style.backgroundPosition = 'center';
                console.log('角色头像（avatar图片）:', currentChat.avatar);
            } else {
                charAvatarPreview.textContent = currentChat.avatar;
                console.log('角色头像（emoji）:', currentChat.avatar);
            }
        } else {
            // 默认显示
            charAvatarPreview.textContent = '👤';
            console.log('角色头像：使用默认');
        }
    } else {
        console.error('找不到 editDualCharAvatar 元素');
    }
    
    // 显示我的头像
    const myAvatarPreview = document.getElementById('editDualMyAvatar');
    if (myAvatarPreview) {
        // 清空之前的样式
        myAvatarPreview.style.backgroundImage = '';
        myAvatarPreview.textContent = '';
        
        if (currentChat.myAvatar && currentChat.myAvatar !== '👤') {
            // 如果有自定义头像
            if (currentChat.myAvatar.startsWith('http') || currentChat.myAvatar.startsWith('data:image')) {
                myAvatarPreview.style.backgroundImage = `url(${currentChat.myAvatar})`;
                myAvatarPreview.style.backgroundSize = 'cover';
                myAvatarPreview.style.backgroundPosition = 'center';
              
            } else {
                myAvatarPreview.textContent = currentChat.myAvatar;
                
            }
        } else {
            // 默认显示
            myAvatarPreview.textContent = '👤';
            console.log('我的头像：使用默认');
        }
    } else {
        console.error('找不到 editDualMyAvatar 元素');
    }
    
    // 绑定头像上传事件
    const charInput = document.getElementById('editDualCharAvatarInput');
    const myInput = document.getElementById('editDualMyAvatarInput');
    
    if (charInput) {
        charInput.onchange = function(e) {
            handleDualAvatarUpload(e, 'char');
        };
    }
    
    if (myInput) {
        myInput.onchange = function(e) {
            handleDualAvatarUpload(e, 'my');
        };
    }
    
    // 显示弹窗
    document.getElementById('editDualProfileModal').style.display = 'flex';
}

// 关闭编辑弹窗
function closeEditDualProfile(event) {
    if (event && event.target.id !== 'editDualProfileModal') return;
    document.getElementById('editDualProfileModal').style.display = 'none';
}

// 处理头像上传
function handleDualAvatarUpload(event, type) {
    const file = event.target.files[0];
    if (!file) return;
    
    console.log('上传头像:', type, file.name);
    
    const reader = new FileReader();
reader.onload = function(e) {
    const previewId = type === 'char' ? 'editDualCharAvatar' : 'editDualMyAvatar';
    const preview = document.getElementById(previewId);
    const raw = e.target.result;

    const applyPreview = (dataUrl) => {
        if (!preview) {
            console.error('找不到预览元素:', previewId);
            return;
        }
        preview.style.backgroundImage = `url(${dataUrl})`;
        preview.style.backgroundSize = 'cover';
        preview.style.backgroundPosition = 'center';
        preview.textContent = '';
        console.log('头像预览更新成功:', type);
    };

    // ★ 双人档案头像上传前压缩
    if (typeof compressImageToDataUrl === 'function') {
        compressImageToDataUrl(raw, 256, 0.78)
            .then((compressed) => applyPreview(compressed))
            .catch(() => applyPreview(raw));
    } else {
        applyPreview(raw);
    }
};
    reader.readAsDataURL(file);
}

// 保存双人信息
function saveDualProfile() {
    const currentChat = chats.find(c => c.id === currentChatId);  // ✅ 改成 chats
    if (!currentChat) return;
    
    const charName = document.getElementById('editDualCharName').value.trim();
    const myName = document.getElementById('editDualMyName').value.trim();
    
    if (!charName) {
        alert('请输入角色名字');
        return;
    }
    
    if (!myName) {
        alert('请输入我的名字');
        return;
    }
    
    // 保存名字
    currentChat.name = charName;
    currentChat.myName = myName;
    
    // 保存角色头像
    const charAvatarPreview = document.getElementById('editDualCharAvatar');
    if (charAvatarPreview.style.backgroundImage) {
        const url = charAvatarPreview.style.backgroundImage.slice(5, -2);
        
        currentChat.avatar = url;
currentChat.avatarImage = url; 
    }
    
    // 保存我的头像
    const myAvatarPreview = document.getElementById('editDualMyAvatar');
    if (myAvatarPreview.style.backgroundImage) {
        const url = myAvatarPreview.style.backgroundImage.slice(5, -2);
        currentChat.myAvatar = url;
    }
    
    // ✅ 改成你代码里的保存方式
    saveToDB('chats', { list: chats });
    
    closeEditDualProfile();
    
    // 刷新显示
    updateDualProfileDisplay();
    
    alert('保存成功！');
}
// 更新双人档案显示

function updateDualProfileDisplay() {
    const currentChat = chats.find(c => c.id === currentChatId);
    if (!currentChat) return;
    
    // 更新角色信息（双人档案区域）
    const dualCharAvatar = document.getElementById('dualCharAvatar');
    const dualCharName = document.getElementById('dualCharName');
    
    if (dualCharAvatar) {
        if (currentChat.avatar && currentChat.avatar !== '👤') {
            dualCharAvatar.style.backgroundImage = `url(${currentChat.avatar})`;
            dualCharAvatar.style.backgroundSize = 'cover';
            dualCharAvatar.style.backgroundPosition = 'center';
            dualCharAvatar.textContent = '';
        } else {
            dualCharAvatar.style.backgroundImage = '';
            dualCharAvatar.textContent = '👤';
        }
    }
    
    if (dualCharName) {
        dualCharName.textContent = currentChat.name;
    }
    
    // 更新我的信息（双人档案区域）
    const dualMyAvatar = document.getElementById('dualMyAvatar');
    const dualMyName = document.getElementById('dualMyName');
    
    if (dualMyAvatar) {
        if (currentChat.myAvatar && currentChat.myAvatar !== '👤') {
            dualMyAvatar.style.backgroundImage = `url(${currentChat.myAvatar})`;
            dualMyAvatar.style.backgroundSize = 'cover';
            dualMyAvatar.style.backgroundPosition = 'center';
            dualMyAvatar.textContent = '';
        } else {
            dualMyAvatar.style.backgroundImage = '';
            dualMyAvatar.textContent = '👤';
        }
    }
    
    if (dualMyName) {
        dualMyName.textContent = currentChat.myName || '我';
    }
}

// ========== 爱心点击特效 ==========
function triggerHeartEffect() {
    const container = document.getElementById('heartParticles');
    if (!container) return;
    
    // 生成 8 个小爱心粒子
    const particles = ['💕', '💗', '💖', '💝']; // 多种爱心样式
    
    for (let i = 0; i < 8; i++) {
        const particle = document.createElement('div');
        particle.className = 'heart-particle';
        particle.textContent = particles[Math.floor(Math.random() * particles.length)];
        
        // 计算随机方向（360度均匀分布）
        const angle = (i / 8) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
        const distance = 45 + Math.random() * 25; // 随机距离
        const tx = Math.cos(angle) * distance;
        const ty = Math.sin(angle) * distance;
        
        particle.style.setProperty('--tx', `${tx}px`);
        particle.style.setProperty('--ty', `${ty}px`);
        particle.style.left = '50%';
        particle.style.top = '50%';
        particle.style.transform = 'translate(-50%, -50%)';
        
        container.appendChild(particle);
        
        // 1秒后移除粒子
        setTimeout(() => {
            if (particle.parentNode) {
                particle.remove();
            }
        }, 1000);
    }
    
    // 添加点击反馈音效（可选）
    // playClickSound();
}

// ============ 旧数据迁移：压缩过大的 base64 头像（只跑一次）===========
function runAvatarMigrationOnce() {
    try {
        const FLAG_KEY = '__avatar_migrated_v1';
        if (localStorage.getItem(FLAG_KEY) === '1') return;

        // compressImageToDataUrl 在 extra.js 里，如果没加载到就下次再试
        if (typeof compressImageToDataUrl !== 'function') {
            setTimeout(runAvatarMigrationOnce, 800);
            return;
        }

        // 只处理“明显过大”的历史头像，避免伤到你现在 1.3w 这种小头像
        const TOO_LARGE_LEN = 120000; // 超过 12 万字符才压缩
        const TARGET_SIDE = 256;
        const TARGET_QUALITY = 0.78;

        const idle = (fn) => {
            if (typeof requestIdleCallback === 'function') requestIdleCallback(fn, { timeout: 1500 });
            else setTimeout(fn, 0);
        };

        // 迁移 chats 表
        idle(() => {
            loadFromDB('chats', async (data) => {
                const list = Array.isArray(data) ? data : (data && Array.isArray(data.list) ? data.list : []);
                if (!list.length) return;

                let changed = false;

                for (let i = 0; i < list.length; i++) {
                    const chat = list[i];
                    if (!chat) continue;

                    const fields = ['avatarImage', 'avatar', 'myAvatar'];
                    for (const f of fields) {
                        const v = chat[f];
                        if (typeof v === 'string' && v.startsWith('data:image') && v.length > TOO_LARGE_LEN) {
                            await new Promise(r => setTimeout(r, 0)); // 让出主线程
                            try {
                                chat[f] = await compressImageToDataUrl(v, TARGET_SIDE, TARGET_QUALITY);
                                changed = true;
                            } catch (e) {}
                        }
                    }
                }

                if (changed) {
                    saveToDB('chats', { list: list });
                    console.log('✅ 头像迁移：chats 压缩完成');
                }
            });
        });

        // 迁移 characterInfo 表（你的 characterInfo 是对象映射，带 id:1）
        idle(() => {
            loadFromDB('characterInfo', async (allData) => {
                const data = (allData && typeof allData === 'object') ? allData : {};
                let changed = false;

                for (const key in data) {
                    if (!Object.prototype.hasOwnProperty.call(data, key)) continue;
                    if (key === 'id') continue; // 跳过元字段

                    const char = data[key];
                    if (!char || typeof char !== 'object') continue;

                    const fields = ['avatarImage', 'avatar', 'userAvatar'];
                    for (const f of fields) {
                        const v = char[f];
                        if (typeof v === 'string' && v.startsWith('data:image') && v.length > TOO_LARGE_LEN) {
                            await new Promise(r => setTimeout(r, 0));
                            try {
                                char[f] = await compressImageToDataUrl(v, TARGET_SIDE, TARGET_QUALITY);
                                changed = true;
                            } catch (e) {}
                        }
                    }
                }

                if (changed) {
                    saveToDB('characterInfo', data);
                    console.log('✅ 头像迁移：characterInfo 压缩完成');
                }
            });
        });

        // 标记已迁移（不反复跑）
        localStorage.setItem(FLAG_KEY, '1');
        console.log('✅ 头像迁移：已标记完成（只跑一次）');
    } catch (e) {
        console.warn('runAvatarMigrationOnce failed:', e);
    }
}

// 初始化，
        initDB();
