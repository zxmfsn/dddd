// ===========================================
// ★★★ 新增：其他设置页面功能逻辑 ★★★
// ===========================================

// 1. 字体设置
function openFontSettings() {
    // 保持代码一致性，目前作为占位符
    alert('字体设置功能开发中...\n此处将允许调整全局字体大小和样式。');
}

// 2. 备份管理

function openBackupSettings() {
    document.getElementById('backupSettingsModal').style.display = 'flex';
}


// 3. 清除缓存 - 打开弹窗
function clearAppCache() {
    document.getElementById('cleanCacheModal').style.display = 'flex';
}
function closeCleanCacheModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('cleanCacheModal').style.display = 'none';
}


// 4. 美化设置
// 打开美化设置页
function openBeautifySettings() {
    document.getElementById('otherSettingsScreen').style.display = 'none';
    document.getElementById('beautifySettingsScreen').style.display = 'flex';
     renderThemeSchemes();
}
// 返回其他设置页
function backToOtherSettings() {
    document.getElementById('beautifySettingsScreen').style.display = 'none';
    document.getElementById('otherSettingsScreen').style.display = 'flex';
}

// 5. 角色语音
function openVoiceRoleSettings() {
    alert('角色语音设置\n在此处管理 TTS 语音模型和发音人。');
}

// ===========================================
// ★★★ 消息提示音逻辑 (完整修复版) ★★★
// ===========================================

let tempSoundData = null; // 临时存储上传的音频Base64

// 1. 打开设置弹窗
function openNotificationSoundSettings() {
    const modal = document.getElementById('notificationSoundModal');
    if (!modal) {
        console.error("找不到提示音弹窗，请检查 index.html");
        return;
    }
    modal.style.display = 'flex';
    
    loadFromDB('userInfo', (data) => {
        const settings = data || {};
        const isEnabled = settings.soundEnabled !== false; // 默认开启
        const hasCustom = !!settings.customSoundData;
        
        const toggle = document.getElementById('soundEnabledToggle');
        if (toggle) toggle.checked = isEnabled;
        
        const nameDisplay = document.getElementById('soundFileName');
        if (nameDisplay) {
            if (hasCustom) {
                nameDisplay.textContent = "🎵 当前使用：自定义音效";
                nameDisplay.style.color = "#667eea";
                // ★ 关键：把已保存的音效加载到临时变量，方便直接试听
                tempSoundData = settings.customSoundData; 
            } else {
                nameDisplay.textContent = "🔕 未设置音效 (请上传)";
                nameDisplay.style.color = "#999";
                tempSoundData = null;
            }
        }
    });
}

// 2. 关闭弹窗
function closeNotificationSoundModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('notificationSoundModal').style.display = 'none';
    tempSoundData = null; // 清理临时数据
}

// 3. 处理音频上传 (转 Base64) - ★之前漏掉的就是这个！★
function handleSoundUpload(input) {
    const file = input.files[0];
    if (!file) return;

 // 放宽到 5MB，防止稍微长一点的提示音传不上去
    if (file.size > 5 * 1024 * 1024) { 
        alert('音频文件太大啦！请上传 5MB 以内的文件。');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        // 读取成功，存入变量
        tempSoundData = e.target.result;
        
        const nameDisplay = document.getElementById('soundFileName');
        if (nameDisplay) {
            nameDisplay.textContent = "🎵 已选择：" + file.name;
            nameDisplay.style.color = "#667eea";
        }
        
        // 自动试听一下
        previewSound(); 
    };
    reader.readAsDataURL(file);
    
    // 清空 input，允许重复选择同一个文件
    input.value = '';
}

// 4. 试听声音
function previewSound() {
    if (!tempSoundData) {
        alert('请先点击上方区域，上传一个音频文件 (.mp3 / .wav)');
        return;
    }
    
    const audio = new Audio();
    audio.src = tempSoundData;
    audio.volume = 0.8; // 音量适中
    
    audio.play().catch(e => {
        console.error('试听失败:', e);
        alert('无法播放该音频，请检查文件格式');
    });
}

// 5. 清除/重置音效
function resetSoundToDefault() {
    tempSoundData = null;
    const soundInput = document.getElementById('soundFileInput');
    if (soundInput) soundInput.value = '';
    
    const nameDisplay = document.getElementById('soundFileName');
    if(nameDisplay) {
        nameDisplay.textContent = "🔕 已清空，无提示音";
        nameDisplay.style.color = "#999";
    }
}

// 6. 保存设置
function saveNotificationSoundSettings() {
    const toggle = document.getElementById('soundEnabledToggle');
    const isEnabled = toggle ? toggle.checked : true;
    
    loadFromDB('userInfo', (data) => {
        const newData = data || {};
        newData.soundEnabled = isEnabled;
        newData.customSoundData = tempSoundData; // 保存 Base64 音频数据
        
        saveToDB('userInfo', newData);
        alert('🔔 提示音设置已保存！');
        
        // 手动关闭弹窗
        document.getElementById('notificationSoundModal').style.display = 'none';
    });
}



// 7. 全局播放函数 (供 script.js 调用)
function playIncomingSound() {
    loadFromDB('userInfo', (data) => {
        const settings = data || {};
        
        // 1. 如果开关关闭，不播
        if (settings.soundEnabled === false) return;
        
        // 2. 如果没有自定义音效，也不播
        if (!settings.customSoundData) return;
        
        const audio = new Audio();
        audio.src = settings.customSoundData;
        audio.volume = 0.8;
        
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                // 忽略自动播放限制的报错
                console.log('播放被阻止:', error);
            });
        }
    });
}


// ===========================================
// ★★★ 字体设置功能实现 (终极修复版) ★★★
// ===========================================

// 1. 应用字体和字号的核心函数
function applyFontLogic(url, size) {
    const numericSize = parseInt(size) || 14;

    // 1.1 应用大小 (使用 CSS 变量 + JS 直接设置，双保险)
    document.documentElement.style.setProperty('--app-font-size', numericSize + 'px');
    document.documentElement.style.fontSize = numericSize + 'px';
    
    // 1.2 应用字体 URL
    const styleId = 'custom-user-font-style';
    let styleTag = document.getElementById(styleId);
    
    if (url) {
        if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = styleId;
            document.head.appendChild(styleTag);
        }
        // 定义 @font-face
        styleTag.innerHTML = `
            @font-face {
                font-family: 'UserCustomFont';
                src: url('${url}') format('woff2'),
                     url('${url}') format('truetype');
                font-display: swap;
            }
        `;
        // 设置 CSS 变量，让全局样式生效
        document.documentElement.style.setProperty('--app-font-family', "'UserCustomFont', sans-serif");
    } else {
        // 如果 URL 为空，移除样式并恢复默认字体
        if (styleTag) styleTag.remove();
        document.documentElement.style.setProperty('--app-font-family', "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif");
    }
}

// 2. 打开字体设置弹窗 (修复：分开读取 active setting 和 presets)
function openFontSettings() {
    // a. 从 'fontSettings' 读取当前激活的配置
    loadFromDB('fontSettings', (activeSettings) => {
        const settings = activeSettings || {};
        const url = settings.fontUrl || '';
        const size = settings.fontSize || 14;
        
        // 填充输入框
        document.getElementById('fontUrlInput').value = url;
        document.getElementById('fontSizeInput').value = size;
        document.getElementById('fontSizeDisplay').textContent = size + 'px';
        
        // b. 从 'userInfo' 读取预设列表
        loadFromDB('userInfo', (userData) => {
            const presets = (userData && userData.fontPresets) ? userData.fontPresets : [];
            renderFontPresets(presets);
            
            // c. 显示弹窗
            document.getElementById('fontSettingsModal').style.display = 'flex';
        });
    });
}

// 3. 关闭弹窗
function closeFontSettingsModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('fontSettingsModal').style.display = 'none';
    // 恢复页面加载时的字体，防止只预览不保存
    loadFontSettings(); 
}

// 4. 实时预览字体大小
function previewFontSize(val) {
    document.getElementById('fontSizeDisplay').textContent = val + 'px';
    // 实时预览效果（仅预览，不保存）
    applyFontLogic(document.getElementById('fontUrlInput').value, val);
}

// 5. 保存并应用设置 (修复：只写 fontSettings)
function saveFontSettings() {
    const fontUrl = document.getElementById('fontUrlInput').value.trim();
    const fontSize = parseInt(document.getElementById('fontSizeInput').value) || 14;
    
    const fontSettings = {
        fontUrl: fontUrl,
        fontSize: fontSize
    };
    
    // 保存到独立的 fontSettings 表
    saveToDB('fontSettings', fontSettings);
    
    // 立即应用
    applyFontLogic(fontUrl, fontSize);
    
    alert('字体设置已保存');
    closeFontSettingsModal();
}

// 6. 页面加载时应用字体 (修复：统一走 applyFontLogic)
function loadFontSettings() {
    loadFromDB('fontSettings', (data) => {
        if (data) {
            applyFontLogic(data.fontUrl, data.fontSize);
        }
    });
}

// ============ 预设管理系统 (修复版) ============

// 渲染预设列表
function renderFontPresets(presets) {
    const select = document.getElementById('fontPresetSelect');
    select.innerHTML = '<option value="">选择预设...</option>';
    
    (presets || []).forEach((preset, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = preset.name;
        option.dataset.url = preset.url;
        option.dataset.size = preset.size;
        select.appendChild(option);
    });
}

// 选中预设时应用到输入框并预览 (修复：增加实时预览)
function applyFontPreset() {
    const select = document.getElementById('fontPresetSelect');
    const selectedOption = select.options[select.selectedIndex];
    
    if (selectedOption.value === "") return;
    
    const url = selectedOption.dataset.url;
    const size = selectedOption.dataset.size;
    
    document.getElementById('fontUrlInput').value = url;
    document.getElementById('fontSizeInput').value = size;
    document.getElementById('fontSizeDisplay').textContent = size + 'px';
    
    // ★★★ 关键：选中后立即应用预览 ★★★
    applyFontLogic(url, size); 
}

// 保存当前配置为字体预设 (修复：保证 size 是数字)
function saveFontPreset() {
    const url = document.getElementById('fontUrlInput').value.trim();
    const size = document.getElementById('fontSizeInput').value;
    
    if (!url) {
        alert('请先输入字体 URL 再保存为预设');
        return;
    }
    
    const name = prompt('请给这个字体起个名字：');
    if (!name) return;
    
    loadFromDB('userInfo', (data) => {
        const newData = data || {};
        if (!newData.fontPresets) newData.fontPresets = [];
        
        newData.fontPresets.push({
            name: name,
            url: url,
            size: parseInt(size) || 14 // 确保保存的是数字
        });
        
        saveToDB('userInfo', newData);
        renderFontPresets(newData.fontPresets);
        document.getElementById('fontPresetSelect').value = newData.fontPresets.length - 1;
        alert('字体预设已保存');
    });
}

// 删除选中预设
function deleteFontPreset() {
    const select = document.getElementById('fontPresetSelect');
    const index = select.value;
    
    if (index === "") {
        alert('请先选择要删除的预设');
        return;
    }
    
    if (!confirm('确定删除这个字体预设吗？')) return;
    
    loadFromDB('userInfo', (data) => {
        const newData = data || {};
        if (!newData.fontPresets) return;
        
        newData.fontPresets.splice(index, 1);
        
        saveToDB('userInfo', newData);
        renderFontPresets(newData.fontPresets);
        
        document.getElementById('fontUrlInput').value = '';
        select.value = "";
    });
}


// ===========================================
// ★★★ 全量备份与恢复功能 ★★★
// ===========================================

function closeBackupSettingsModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('backupSettingsModal').style.display = 'none';
    // 清理文件选择，防止无法重复选同一个文件
    document.getElementById('backupFileInput').value = '';
}

// 导出全量备份
async function exportFullBackup() {
    if (!db) {
        alert('数据库未就绪，请稍后再试');
        return;
    }

    const btn = event.currentTarget; // 获取点击的按钮
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span>⏳ 正在打包数据...</span>';
    btn.disabled = true;

    try {
        const storeNames = Array.from(db.objectStoreNames);
        const backupData = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            stores: {}
        };

        // 使用 Promise.all 并发读取所有表的数据
        const transaction = db.transaction(storeNames, 'readonly');
        
        const promises = storeNames.map(storeName => {
            return new Promise((resolve, reject) => {
                const request = transaction.objectStore(storeName).getAll();
                request.onsuccess = () => {
                    backupData.stores[storeName] = request.result;
                    resolve();
                };
                request.onerror = (e) => reject(e);
            });
        });

        await Promise.all(promises);

        // 生成文件下载
        const blob = new Blob([JSON.stringify(backupData)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        // 生成文件名：备份_20231024_1200.json
        const now = new Date();
        const timeStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
        
        a.href = url;
      a.download = `帽子小猫小手机备份_${timeStr}.json`;
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);

        alert(`✅ 备份成功！\n共备份了 ${storeNames.length} 个数据表。\n请妥善保存下载的文件。`);

    } catch (error) {
        console.error('备份失败:', error);
        alert('❌ 备份失败：' + error.message);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// 处理文件选择
function handleBackupFileSelect(input) {
    const file = input.files[0];
    if (!file) return;

    if (!confirm('⚠️ 高能预警 ⚠️\n\n即将恢复数据，这将【覆盖】当前小手机里的所有内容！\n\n确定要继续吗？')) {
        input.value = ''; // 清空选择
        return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const backupData = JSON.parse(e.target.result);
            await importFullBackup(backupData);
        } catch (error) {
            console.error('解析失败:', error);
            alert('❌ 文件解析失败：这可能不是有效的备份文件。');
            input.value = '';
        }
    };
    reader.readAsText(file);
}

// 执行恢复逻辑
async function importFullBackup(data) {
    if (!data.stores) {
        alert('❌ 数据格式错误：找不到数据存储内容');
        return;
    }

    // 1. 获取备份里的所有表名
    const backupStoreNames = Object.keys(data.stores);
    // 2. 获取当前数据库的表名
    const currentStoreNames = Array.from(db.objectStoreNames);
    
    // 3. 找出有效的表（既在备份里，又在当前数据库里的）
    const validStores = backupStoreNames.filter(name => currentStoreNames.includes(name));

    if (validStores.length === 0) {
        alert('❌ 没有匹配的数据表可恢复');
        return;
    }

    try {
        const transaction = db.transaction(validStores, 'readwrite');
        
        // 遍历每个表进行恢复
        for (const storeName of validStores) {
            const store = transaction.objectStore(storeName);
            const items = data.stores[storeName];

            // 策略：覆盖式恢复
            // 先清空当前表，防止ID冲突或残留脏数据
            await new Promise((resolve, reject) => {
                const clearReq = store.clear();
                clearReq.onsuccess = resolve;
                clearReq.onerror = reject;
            });

            // 逐条写入数据
            for (const item of items) {
                store.put(item);
            }
        }

        // 等待事务完成
        transaction.oncomplete = () => {
            alert('✅ 数据恢复成功！\n页面即将刷新以加载新数据...');
            window.location.reload(); // 强制刷新以应用数据
        };

        transaction.onerror = (e) => {
            throw new Error(e.target.error.message);
        };

    } catch (error) {
        console.error('恢复失败:', error);
        alert('❌ 恢复过程中出错：' + error.message);
    }
}

// 执行清理逻辑
function confirmClearCache() {
    // 1. 获取按钮并显示加载状态
    const confirmBtn = document.querySelector('#cleanCacheModal .btn-save');
    const originalText = confirmBtn.textContent;
    confirmBtn.textContent = '正在清理...';
    confirmBtn.disabled = true;

    // 2. 执行数据库操作
    const transaction = db.transaction(['messages'], 'readwrite');
    const store = transaction.objectStore('messages');
    const request = store.get(1); // 获取消息列表

    request.onsuccess = () => {
        let allMessages = request.result ? (request.result.list || request.result) : [];
        let cleanCount = 0;
        let freedSpace = 0;

        // 遍历消息进行清理
        const newMessages = allMessages.map(msg => {
            // 检查是否为图片类型 (包括表情包)
            if (msg.type === 'image' && msg.content && msg.content.length > 100) {
                freedSpace += msg.content.length;
                cleanCount++;
                return {
                    ...msg,
                    content: '', // 清空 Base64 数据
                    type: 'text', // 转为文本类型
                    content: msg.isSticker ? '[表情包已清理]' : '[图片已清理]', // 区分提示
                    isCleaned: true // 标记已被清理
                };
            }
            return msg;
        });

        // 如果没有需要清理的
        if (cleanCount === 0) {
            alert('当前没有需要清理的图片或表情包。');
            closeCleanCacheModal();
            confirmBtn.textContent = originalText;
            confirmBtn.disabled = false;
            return;
        }

        // 保存回数据库
        store.put({ id: 1, list: newMessages });

        // 3. 完成反馈
        transaction.oncomplete = () => {
            // 估算释放大小
            const sizeKB = (freedSpace / 1024).toFixed(2);
            const sizeMB = (freedSpace / 1024 / 1024).toFixed(2);
            const sizeStr = sizeMB > 1 ? `${sizeMB} MB` : `${sizeKB} KB`;

            closeCleanCacheModal();
            
            // 延时一点点让弹窗先关掉，体验更好
            setTimeout(() => {
                alert(`✅ 清理完成！\n\n共清理了 ${cleanCount} 张图片/表情包。\n大约释放了 ${sizeStr} 空间。\n\n点击确定刷新页面。`);
                window.location.reload();
            }, 100);
        };
    };

    request.onerror = (e) => {
        console.error('清理失败:', e);
        alert('清理失败，请重试。');
        confirmBtn.textContent = originalText;
        confirmBtn.disabled = false;
    };
}

// ===========================================
// ★★★ 初始化/重置所有数据 (弹窗版) ★★★
// ===========================================

// 打开弹窗
function openResetModal() {
    document.getElementById('resetDataModal').style.display = 'flex';
}

// 关闭弹窗
function closeResetModal(event) {
    // 如果点击的是遮罩层(event存在且target是自己)，或者直接调用(event未定义)，则关闭
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('resetDataModal').style.display = 'none';
}

// 执行初始化逻辑
function confirmResetData() {
    // 1. 按钮变态，防止重复点击
    const confirmBtn = document.querySelector('#resetDataModal .btn-save');
    const originalText = confirmBtn.textContent;
    confirmBtn.textContent = '正在初始化...';
    confirmBtn.disabled = true;

    try {
        // 2. 清除 LocalStorage
        localStorage.clear();

        // 3. 清除 IndexedDB
        if (db) {
            const dbName = db.name;
            db.close(); // 关闭连接
            
            const deleteReq = indexedDB.deleteDatabase(dbName);
            
            deleteReq.onsuccess = function() {
                // 稍微延时一点，让用户看到变化
                setTimeout(() => {
                    alert('✅ 初始化完成，即将重启...');
                    window.location.reload();
                }, 500);
            };
            
            deleteReq.onerror = function() {
                alert('❌ 数据库清理受阻，尝试强制刷新...');
                window.location.reload();
            };
            
            // 如果被其他标签页阻塞
            deleteReq.onblocked = function() {
                alert('⚠️ 请关闭其他已打开的标签页，然后重试。');
                window.location.reload();
            };
        } else {
            // 如果数据库未初始化，直接刷新
            window.location.reload();
        }

    } catch (e) {
        console.error(e);
        alert('初始化出错：' + e.message);
        window.location.reload();
    }
}

// ===========================================
// ★★★ 美化设置逻辑 ★★★
// ===========================================

// 1. 切换透明模式
function toggleNavTransparency(checkbox) {
    const isTransparent = checkbox.checked;
    
    if (isTransparent) {
        document.body.classList.add('transparent-nav-mode');
    } else {
        document.body.classList.remove('transparent-nav-mode');
    }
    
    // 保存设置
    localStorage.setItem('setting_nav_transparent', isTransparent);
}

// 2. 初始化美化设置 (页面加载时调用)
function initBeautifySettings() {
    // 读取透明设置
    const isTransparent = localStorage.getItem('setting_nav_transparent') === 'true';
    
    // 应用样式
    if (isTransparent) {
        document.body.classList.add('transparent-nav-mode');
    }
    
    // 同步开关状态 (如果开关存在)
    const toggle = document.getElementById('navTransparentToggle');
    if (toggle) {
        toggle.checked = isTransparent;
    }
}

// ★★★ 重要：立即执行初始化 ★★★
// 确保这段代码在页面加载时运行
document.addEventListener('DOMContentLoaded', initBeautifySettings);
// 为了防止 DOMContentLoaded 错过，立即尝试执行一次
initBeautifySettings();

// ===========================================
// ★★★ 角色列表美化逻辑 (自定义图标版) ★★★
// ===========================================

// 临时存储预览状态
let clTempConfig = {
    globalBg: '#f8f9fa',
    headerBg: 'rgba(255,255,255,0.95)',
    bottomBg: 'rgba(255,255,255,0.85)',
    iconColor: '#999999',
    iconSize: 1,
    icon1Bg: '', // 聊天图标
    icon2Bg: '', // 联系人图标
    icon3Bg: ''  // 钱包图标
};

// 1. 打开页面
function openCharListBeautify() {
    document.getElementById('beautifySettingsScreen').style.display = 'none';
    document.getElementById('charListBeautifyScreen').style.display = 'flex';
    
    loadFromDB('userInfo', (data) => {
        if (data && data.charListStyle) {
            // 合并旧数据，防止新字段丢失
            clTempConfig = { ...clTempConfig, ...data.charListStyle };
        }
        refreshAllPreviews();
    });
    
    switchCLTab('global');
}

// 2. 返回
function backToBeautifySettings() {
    document.getElementById('charListBeautifyScreen').style.display = 'none';
    document.getElementById('beautifySettingsScreen').style.display = 'flex';
}

// 3. 切换 Tab (更新了 icons 部分)
function switchCLTab(tab) {
    const btns = document.querySelectorAll('#charListBeautifyScreen .ins-tab-btn');
    btns.forEach(b => b.classList.remove('active'));
    if(event && event.target) event.target.classList.add('active'); 
    
    const container = document.getElementById('clTabContent');
    container.innerHTML = ''; 

    if (['global', 'header', 'bottom'].includes(tab)) {
        const typeMap = {
            'global': { title: '全局背景', fileId: 'clGlobalFile', prop: 'globalBg' },
            'header': { title: '导航栏背景', fileId: 'clHeaderFile', prop: 'headerBg' },
            'bottom': { title: '底部栏背景', fileId: 'clBottomFile', prop: 'bottomBg' }
        };
        const info = typeMap[tab];
        
        container.innerHTML = `
            <div class="api-card">
                <div class="api-section-title">设置${info.title}</div>
                <div class="ins-tab-group">
                    <button class="ins-tab-btn active" onclick="document.getElementById('${info.fileId}').click()">📁 本地图片</button>
                    <button class="ins-tab-btn" onclick="showUrlInput('${tab}')">🔗 网络链接</button>
                </div>
                <div id="clUrlInputArea_${tab}" style="display:none; margin-top:10px;">
                    <input type="url" class="ins-input" placeholder="输入图片链接..." oninput="updateCLPreview('${info.prop}', 'url(' + this.value + ')')">
                </div>
                <button class="ins-line-btn" onclick="clearCLImage('${info.prop}')" style="margin-top:10px; color:#ff4757; border-color:#ff4757;">🗑 恢复默认颜色</button>
            </div>
        `;
    } else if (tab === 'icons') {
        // 图标设置：分为3个独立上传 + 大小控制
     container.innerHTML = `
            <div class="api-card">
                <div class="api-section-title">图标自定义 (分别上传)</div>
                
                <!-- 图标 1 -->
                <div class="ins-list-item" style="padding: 12px 0; display: flex; justify-content: space-between; align-items: center;">
                    <div style="font-size:13px; font-weight:600;">聊天</div>
                    <div style="display:flex; gap:8px;">
                        <button class="ins-line-btn" onclick="document.getElementById('clIcon1File').click()" style="padding:4px 12px; font-size:12px;">上传</button>
                        <button class="ins-line-btn" onclick="updateCLPreview('icon1Bg', '')" style="padding:4px 12px; font-size:12px; color:#ff4757; border-color:#ff4757;">重置</button>
                    </div>
                </div>
                <!-- 图标 2 -->
                <div class="ins-list-item" style="padding: 12px 0; display: flex; justify-content: space-between; align-items: center;">
                    <div style="font-size:13px; font-weight:600;">联系人</div>
                    <div style="display:flex; gap:8px;">
                        <button class="ins-line-btn" onclick="document.getElementById('clIcon2File').click()" style="padding:4px 12px; font-size:12px;">上传</button>
                        <button class="ins-line-btn" onclick="updateCLPreview('icon2Bg', '')" style="padding:4px 12px; font-size:12px; color:#ff4757; border-color:#ff4757;">重置</button>
                    </div>
                </div>
                <!-- 图标 3 -->
                <div class="ins-list-item" style="padding: 12px 0; display: flex; justify-content: space-between; align-items: center;">
                    <div style="font-size:13px; font-weight:600;">钱包</div>
                    <div style="display:flex; gap:8px;">
                        <button class="ins-line-btn" onclick="document.getElementById('clIcon3File').click()" style="padding:4px 12px; font-size:12px;">上传</button>
                        <button class="ins-line-btn" onclick="updateCLPreview('icon3Bg', '')" style="padding:4px 12px; font-size:12px; color:#ff4757; border-color:#ff4757;">重置</button>
                    </div>
                </div>
                <div class="ins-input-group" style="margin-top: 20px;">
                    <label class="ins-label">图标大小 (0.5 - 1.5)</label>
                    <input type="range" min="0.5" max="1.5" step="0.1" value="${clTempConfig.iconSize}" style="width:100%; accent-color:#333;" oninput="updateCLPreview('iconSize', this.value)">
                </div>
            </div>
        `;
    }
}

function showUrlInput(tab) {
    const area = document.getElementById(`clUrlInputArea_${tab}`);
    if (area) area.style.display = 'block';
}

// 4. 处理图片上传 (支持背景和图标)
function handleCLImage(input, propName) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const bgValue = `url('${e.target.result}')`;
            
            // 映射 input ID 到配置属性
            let realProp = propName;
            if(propName === 'header') realProp = 'headerBg';
            if(propName === 'bottom') realProp = 'bottomBg';
            if(propName === 'global') realProp = 'globalBg';
            if(propName === 'icon1') realProp = 'icon1Bg';
            if(propName === 'icon2') realProp = 'icon2Bg';
            if(propName === 'icon3') realProp = 'icon3Bg';
            
            updateCLPreview(realProp, bgValue);
        };
        reader.readAsDataURL(file);
    }
    input.value = ''; 
}

function clearCLImage(propName) {
    let defaultVal = '';
    if(propName === 'globalBg') defaultVal = '#f8f9fa';
    if(propName === 'headerBg') defaultVal = 'rgba(255,255,255,0.95)';
    if(propName === 'bottomBg') defaultVal = 'rgba(255,255,255,0.85)';
    updateCLPreview(propName, defaultVal);
}

// 5. 核心：更新预览 (处理图标逻辑)
function updateCLPreview(type, value) {
    clTempConfig[type] = value;
    
    const pBody = document.getElementById('clPreviewFrame'); 
    const pHeader = document.getElementById('clPreviewHeader');
    const pBottom = document.getElementById('clPreviewBottom');
    
    // 获取3个预览图标
    const pIcon1 = document.getElementById('clPreviewIcon1');
    const pIcon2 = document.getElementById('clPreviewIcon2');
    const pIcon3 = document.getElementById('clPreviewIcon3');
    const allIcons = [pIcon1, pIcon2, pIcon3];

    // 辅助：设置背景
    const setSmartBg = (el, val) => {
        if (!el) return;
        if (val && val.includes('url(')) {
            el.style.backgroundImage = val;
            el.style.backgroundColor = 'transparent'; 
            el.style.backgroundSize = 'cover';
            el.style.backgroundPosition = 'center';
            el.style.backgroundRepeat = 'no-repeat';
        } else {
            el.style.backgroundColor = val;
            el.style.backgroundImage = 'none';
        }
    };

    // 辅助：设置图标
    const setIconBg = (el, val) => {
        if (!el) return;
        if (val && val.includes('url(')) {
            el.style.backgroundImage = val;
            el.style.backgroundColor = 'transparent'; // 有图就去色
        } else {
            el.style.backgroundImage = 'none';
            el.style.backgroundColor = '#999'; // 没图恢复灰色方块
        }
    };

    if (type === 'globalBg') setSmartBg(pBody, value);
    if (type === 'headerBg') setSmartBg(pHeader, value);
    if (type === 'bottomBg') setSmartBg(pBottom, value);
    
    // 图标单独处理
    if (type === 'icon1Bg') setIconBg(pIcon1, value);
    if (type === 'icon2Bg') setIconBg(pIcon2, value);
    if (type === 'icon3Bg') setIconBg(pIcon3, value);
    
    if (type === 'iconSize') {
        allIcons.forEach(icon => icon.style.transform = `scale(${value})`);
    }
}

function refreshAllPreviews() {
    const frame = document.getElementById('clPreviewFrame');
    if (!frame) return; 

    updateCLPreview('globalBg', clTempConfig.globalBg);
    updateCLPreview('headerBg', clTempConfig.headerBg);
    updateCLPreview('bottomBg', clTempConfig.bottomBg);
    updateCLPreview('icon1Bg', clTempConfig.icon1Bg);
    updateCLPreview('icon2Bg', clTempConfig.icon2Bg);
    updateCLPreview('icon3Bg', clTempConfig.icon3Bg);
    updateCLPreview('iconSize', clTempConfig.iconSize);
}

function resetCharListEditor() {
    if(!confirm('确定要清空编辑器中的设置吗？')) return;
    
    clTempConfig = {
        globalBg: '#f8f9fa',
        headerBg: 'rgba(255,255,255,0.95)',
        bottomBg: 'rgba(255,255,255,0.85)',
        iconColor: '#999999',
        iconSize: 1,
        icon1Bg: '',
        icon2Bg: '',
        icon3Bg: ''
    };
    
    refreshAllPreviews();
    const activeTab = document.querySelector('#charListBeautifyScreen .ins-tab-btn.active');
    if(activeTab) activeTab.click();
}

// 6. 保存并应用
function applyCharListBeautify() {
    const btn = event.currentTarget;
    const oldText = btn.innerHTML;
    btn.innerHTML = '💾 保存中...';
    btn.disabled = true;

    loadFromDB('userInfo', (data) => {
        const newData = data || {};
        newData.charListStyle = clTempConfig; 
        
        saveToDB('userInfo', newData);
        applyStylesToRoot(clTempConfig);
        
        setTimeout(() => {
            alert('✨ 美化已应用！');
            btn.innerHTML = oldText;
            btn.disabled = false;
            backToBeautifySettings();
        }, 500);
    });
}

// 7. 应用 CSS 变量
function applyStylesToRoot(config) {
    if (!config) return;
    const root = document.documentElement;
    
    const setRootBgVar = (prefix, val) => {
        if (!val) return;
        if (val.includes('url(')) {
            root.style.setProperty(`--${prefix}-img`, val);
            root.style.setProperty(`--${prefix}-color`, 'transparent'); 
        } else {
            root.style.setProperty(`--${prefix}-color`, val);
            root.style.setProperty(`--${prefix}-img`, 'none');
        }
    };

    setRootBgVar('cl-global-bg', config.globalBg);
    setRootBgVar('cl-header-bg', config.headerBg);
    setRootBgVar('cl-bottom-bg', config.bottomBg);
    
    // 图标变量
    if(config.icon1Bg) root.style.setProperty('--cl-icon1-bg', config.icon1Bg);
    else root.style.setProperty('--cl-icon1-bg', 'none');

    if(config.icon2Bg) root.style.setProperty('--cl-icon2-bg', config.icon2Bg);
    else root.style.setProperty('--cl-icon2-bg', 'none');

    if(config.icon3Bg) root.style.setProperty('--cl-icon3-bg', config.icon3Bg);
    else root.style.setProperty('--cl-icon3-bg', 'none');
    
    // 隐藏/显示 SVG 线条的逻辑在 CSS 中通过属性选择器处理，或者这里强制设置 stroke
    // 为了保险，我们可以动态设置 stroke 颜色
    const setStroke = (tabName, hasImg) => {
        const selector = `.bottom-tab[data-tab="${tabName}"] .ins-icon`;
        const els = document.querySelectorAll(selector);
        els.forEach(el => {
            // 如果有图，stroke 透明；没图，stroke 恢复默认灰色或主题色
            el.style.stroke = hasImg ? 'transparent' : (config.iconColor || '#999');
        });
    };
    setStroke('single', !!config.icon1Bg);
    setStroke('group', !!config.icon2Bg);
    setStroke('wallet', !!config.icon3Bg);

    if(config.iconSize) root.style.setProperty('--cl-icon-scale', config.iconSize);
}

// 8. 初始化
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        loadFromDB('userInfo', (data) => {
            if (data && data.charListStyle) {
                applyStylesToRoot(data.charListStyle);
            }
        });
    }, 500);
});

// ===========================================
// ★★★ 导航栏字体颜色逻辑 ★★★
// ===========================================

// 打开弹窗
function openNavColorModal() {
    // 读取当前颜色
    loadFromDB('userInfo', (data) => {
        const color = (data && data.navTextColor) ? data.navTextColor : '#333333';
        document.getElementById('navColorInput').value = color;
        document.getElementById('navColorPreviewText').style.color = color;
        document.getElementById('navColorModal').style.display = 'flex';
    });
}

// 关闭弹窗
function closeNavColorModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('navColorModal').style.display = 'none';
}

// 实时预览 (仅弹窗内)
function previewNavColor(color) {
    document.getElementById('navColorPreviewText').style.color = color;
}

// 保存颜色
function saveNavColor() {
    const color = document.getElementById('navColorInput').value;
    
    loadFromDB('userInfo', (data) => {
        const newData = data || {};
        newData.navTextColor = color;
        
        saveToDB('userInfo', newData);
        
        // 应用到 CSS 变量
        document.documentElement.style.setProperty('--nav-custom-text-color', color);
        
        closeNavColorModal();
        // alert('颜色已保存'); // 静默保存体验更好
    });
}

// 初始化加载 (合并到之前的 initBeautifySettings 或独立调用)
function initNavColor() {
    loadFromDB('userInfo', (data) => {
        if (data && data.navTextColor) {
            document.documentElement.style.setProperty('--nav-custom-text-color', data.navTextColor);
        }
    });
}

// 确保初始化执行
document.addEventListener('DOMContentLoaded', () => {
    // 延时确保 DB 就绪
    setTimeout(initNavColor, 600);
});

// ===========================================
// ★★★ 对话页面美化逻辑 (独立版) ★★★
// ===========================================

let csTempConfig = {
    globalBg: '',
    headerBg: '',
    bottomBg: '',
    iconPlusBg: '',
    iconSendBg: '',
    iconReceiveBg: ''
};

// 1. 打开页面
function openChatScreenBeautify() {
    document.getElementById('beautifySettingsScreen').style.display = 'none';
    document.getElementById('chatScreenBeautifyScreen').style.display = 'flex';
    
    loadFromDB('userInfo', (data) => {
        if (data && data.chatScreenStyle) {
            csTempConfig = { ...csTempConfig, ...data.chatScreenStyle };
        }
        refreshCSPreviews();
    });
    
    switchCSTab('global');
}

// 2. 返回
function backToBeautifySettings_Chat() {
    document.getElementById('chatScreenBeautifyScreen').style.display = 'none';
    document.getElementById('beautifySettingsScreen').style.display = 'flex';
}

// 3. 切换 Tab
function switchCSTab(tab) {
    const btns = document.querySelectorAll('#chatScreenBeautifyScreen .ins-tab-btn');
    btns.forEach(b => b.classList.remove('active'));
    if(event && event.target) event.target.classList.add('active'); 
    
    const container = document.getElementById('csTabContent');
    container.innerHTML = ''; 

    if (['global', 'header', 'bottom'].includes(tab)) {
        const typeMap = {
            'global': { title: '全局背景', fileId: 'csGlobalFile', prop: 'globalBg' },
            'header': { title: '导航栏背景', fileId: 'csHeaderFile', prop: 'headerBg' },
            'bottom': { title: '底部栏背景', fileId: 'csBottomFile', prop: 'bottomBg' }
        };
        const info = typeMap[tab];
        
        container.innerHTML = `
            <div class="api-card">
                <div class="api-section-title">设置${info.title}</div>
                <div class="ins-tab-group">
                    <button class="ins-tab-btn active" onclick="document.getElementById('${info.fileId}').click()">📁 本地图片</button>
                    <button class="ins-tab-btn" onclick="showCSUrlInput('${tab}')">🔗 网络链接</button>
                </div>
                <div id="csUrlInputArea_${tab}" style="display:none; margin-top:10px;">
                    <input type="url" class="ins-input" placeholder="输入图片链接..." oninput="updateCSPreview('${info.prop}', 'url(' + this.value + ')')">
                </div>
                <button class="ins-line-btn" onclick="clearCSImage('${info.prop}')" style="margin-top:10px; color:#ff4757; border-color:#ff4757;">🗑 恢复默认</button>
            </div>
        `;
    } else if (tab === 'icons') {
        container.innerHTML = `
            <div class="api-card">
                <div class="api-section-title">图标自定义</div>
                
                <div class="ins-list-item" style="padding: 12px 0; display: flex; justify-content: space-between; align-items: center;">
                    <div style="font-size:13px; font-weight:600;">➕ 左侧加号</div>
                    <div style="display:flex; gap:8px;">
                        <button class="ins-line-btn" onclick="document.getElementById('csIconPlusFile').click()" style="padding:4px 12px; font-size:12px;">上传</button>
                        <button class="ins-line-btn" onclick="updateCSPreview('iconPlusBg', '')" style="padding:4px 12px; font-size:12px; color:#ff4757; border-color:#ff4757;">重置</button>
                    </div>
                </div>

                <div class="ins-list-item" style="padding: 12px 0; display: flex; justify-content: space-between; align-items: center;">
                    <div style="font-size:13px; font-weight:600;">➤ 发送按钮</div>
                    <div style="display:flex; gap:8px;">
                        <button class="ins-line-btn" onclick="document.getElementById('csIconSendFile').click()" style="padding:4px 12px; font-size:12px;">上传</button>
                        <button class="ins-line-btn" onclick="updateCSPreview('iconSendBg', '')" style="padding:4px 12px; font-size:12px; color:#ff4757; border-color:#ff4757;">重置</button>
                    </div>
                </div>

                <div class="ins-list-item" style="padding: 12px 0; display: flex; justify-content: space-between; align-items: center;">
                    <div style="font-size:13px; font-weight:600;">✉ 接收按钮</div>
                    <div style="display:flex; gap:8px;">
                        <button class="ins-line-btn" onclick="document.getElementById('csIconReceiveFile').click()" style="padding:4px 12px; font-size:12px;">上传</button>
                        <button class="ins-line-btn" onclick="updateCSPreview('iconReceiveBg', '')" style="padding:4px 12px; font-size:12px; color:#ff4757; border-color:#ff4757;">重置</button>
                    </div>
                </div>
            </div>
        `;
    }
}

function showCSUrlInput(tab) {
    const area = document.getElementById(`csUrlInputArea_${tab}`);
    if (area) area.style.display = 'block';
}

// 4. 处理图片
function handleCSImage(input, propName) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const bgValue = `url('${e.target.result}')`;
            let realProp = propName;
            if(propName === 'header') realProp = 'headerBg';
            if(propName === 'bottom') realProp = 'bottomBg';
            if(propName === 'global') realProp = 'globalBg';
            if(propName === 'iconPlus') realProp = 'iconPlusBg';
            if(propName === 'iconSend') realProp = 'iconSendBg';
            if(propName === 'iconReceive') realProp = 'iconReceiveBg';
            
            updateCSPreview(realProp, bgValue);
        };
        reader.readAsDataURL(file);
    }
    input.value = ''; 
}

function clearCSImage(propName) {
    updateCSPreview(propName, ''); // 空字符串即恢复默认
}

// 5. 更新预览
function updateCSPreview(type, value) {
    csTempConfig[type] = value;
    
    const pBody = document.getElementById('csPreviewFrame'); 
    const pHeader = document.getElementById('csPreviewHeader');
    const pBottom = document.getElementById('csPreviewBottom');
    
    const pIconPlus = document.getElementById('csPreviewIconPlus');
    const pIconSend = document.getElementById('csPreviewIconSend');
    const pIconReceive = document.getElementById('csPreviewIconReceive');

    const setBg = (el, val, defaultColor = 'white') => {
        if (!el) return;
        if (val && val.includes('url(')) {
            el.style.backgroundImage = val;
            el.style.backgroundColor = 'transparent';
            el.style.backgroundSize = 'cover';
        } else {
            el.style.backgroundImage = 'none';
            // 恢复默认背景色
            if(el === pBody) el.style.backgroundColor = '#f8f9fa';
            else if(el === pHeader) el.style.backgroundColor = 'rgba(255,255,255,0.95)';
            else if(el === pBottom) el.style.backgroundColor = 'white';
        }
    };

    const setIcon = (el, val, defaultText) => {
        if (!el) return;
        if (val && val.includes('url(')) {
            el.style.backgroundImage = val;
            el.innerText = ''; // 隐藏文字/符号
            el.style.border = 'none'; // 去掉边框
        } else {
            el.style.backgroundImage = 'none';
            el.innerText = defaultText;
            el.style.border = '1px solid #ccc';
        }
    };

    if (type === 'globalBg') setBg(pBody, value);
    if (type === 'headerBg') setBg(pHeader, value);
    if (type === 'bottomBg') setBg(pBottom, value);
    
    if (type === 'iconPlusBg') setIcon(pIconPlus, value, '+');
    if (type === 'iconSendBg') setIcon(pIconSend, value, '➤');
    if (type === 'iconReceiveBg') setIcon(pIconReceive, value, '✉');
}

function refreshCSPreviews() {
    updateCSPreview('globalBg', csTempConfig.globalBg);
    updateCSPreview('headerBg', csTempConfig.headerBg);
    updateCSPreview('bottomBg', csTempConfig.bottomBg);
    updateCSPreview('iconPlusBg', csTempConfig.iconPlusBg);
    updateCSPreview('iconSendBg', csTempConfig.iconSendBg);
    updateCSPreview('iconReceiveBg', csTempConfig.iconReceiveBg);
}

function resetChatScreenEditor() {
    if(!confirm('确定要清空编辑器中的设置吗？')) return;
    csTempConfig = { globalBg: '', headerBg: '', bottomBg: '', iconPlusBg: '', iconSendBg: '', iconReceiveBg: '' };
    refreshCSPreviews();
    const activeTab = document.querySelector('#chatScreenBeautifyScreen .ins-tab-btn.active');
    if(activeTab) activeTab.click();
}

// 6. 应用
function applyChatScreenBeautify() {
    const btn = event.currentTarget;
    const oldText = btn.innerHTML;
    btn.innerHTML = '💾 保存中...';
    btn.disabled = true;

    loadFromDB('userInfo', (data) => {
        const newData = data || {};
        newData.chatScreenStyle = csTempConfig;
        
        saveToDB('userInfo', newData);
        applyCSStylesToRoot(csTempConfig);
        
        setTimeout(() => {
            alert('✨ 美化已应用！');
            btn.innerHTML = oldText;
            btn.disabled = false;
            backToBeautifySettings_Chat();
        }, 500);
    });
}

function applyCSStylesToRoot(config) {
    if (!config) return;
    const root = document.documentElement;
    
    const setVar = (name, val) => root.style.setProperty(name, val || 'none');
    
    setVar('--chat-global-bg-img', config.globalBg);
    setVar('--chat-header-bg-img', config.headerBg);
    setVar('--chat-input-bg-img', config.bottomBg);
    
    setVar('--chat-icon-plus-bg', config.iconPlusBg);
    setVar('--chat-icon-send-bg', config.iconSendBg);
    setVar('--chat-icon-receive-bg', config.iconReceiveBg);
    
    // 特殊处理：隐藏 SVG 线条（如果有图）
    // 这里通过JS直接操作DOM可能更保险，或者依赖CSS的层级覆盖
    const plusBtn = document.querySelector('.cute-icon-btn.plus-btn');
    if(plusBtn) plusBtn.style.color = config.iconPlusBg ? 'transparent' : 'inherit';
    
    const sendBtn = document.querySelector('.action-icon-btn[onclick="sendMessage()"] svg');
    if(sendBtn) sendBtn.style.opacity = config.iconSendBg ? '0' : '1';
    
    const receiveBtn = document.querySelector('#receiveBtn svg');
    if(receiveBtn) receiveBtn.style.opacity = config.iconReceiveBg ? '0' : '1';
}

// 7. 初始化
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        loadFromDB('userInfo', (data) => {
            if (data && data.chatScreenStyle) {
                applyCSStylesToRoot(data.chatScreenStyle);
            }
        });
    }, 600);
});

// ===========================================
// ★★★ 气泡美化逻辑 (自定义预设版) ★★★
// ===========================================

// 官方默认预设 (作为初始数据)
const OFFICIAL_PRESETS = [
    {
        name: "默认黑白",
        ai: `background: #ffffff;\ncolor: #1a1a1a;\nborder-radius: 18px;\nborder: 0.5px solid #f5f5f5;\nbox-shadow: 0 1px 2px rgba(0,0,0,0.04);`,
        user: `background: #1a1a1a;\ncolor: #ffffff;\nborder-radius: 18px;\nborder: none;\nbox-shadow: 0 2px 4px rgba(0,0,0,0.08);`
    },
    {
        name: "少女粉",
        ai: `background: #fff0f6;\ncolor: #d63384;\nborder-radius: 20px;\nborder: 1px solid #ffdeeb;`,
        user: `background: #ffadd2;\ncolor: #fff;\nborder-radius: 20px;\nborder: none;`
    },
    {
        name: "极简蓝",
        ai: `background: #e7f5ff;\ncolor: #1971c2;\nborder-radius: 4px 18px 18px 18px;`,
        user: `background: #339af0;\ncolor: #fff;\nborder-radius: 18px 4px 18px 18px;`
    },
    {
        name: "透明磨砂",
        ai: `background: rgba(255,255,255,0.6);\ncolor: #333;\nbackdrop-filter: blur(5px);\nborder: 1px solid rgba(255,255,255,0.4);\nborder-radius: 16px;`,
        user: `background: rgba(0,0,0,0.5);\ncolor: #fff;\nbackdrop-filter: blur(5px);\nborder: 1px solid rgba(255,255,255,0.1);\nborder-radius: 16px;`
    }
];

// 1. 打开页面
function openBubbleBeautify() {
    document.getElementById('beautifySettingsScreen').style.display = 'none';
    document.getElementById('bubbleBeautifyScreen').style.display = 'flex';
    
    loadFromDB('userInfo', (data) => {
        // 加载当前样式
        if (data && data.bubbleStyle) {
            document.getElementById('aiBubbleCssInput').value = data.bubbleStyle.ai;
            document.getElementById('userBubbleCssInput').value = data.bubbleStyle.user;
        } else {
            document.getElementById('aiBubbleCssInput').value = OFFICIAL_PRESETS[0].ai;
            document.getElementById('userBubbleCssInput').value = OFFICIAL_PRESETS[0].user;
        }
        
        // 加载预设列表 (如果没有，初始化官方预设)
        let presets = (data && data.bubblePresets) ? data.bubblePresets : OFFICIAL_PRESETS;
        renderBubblePresets(presets);
        
        updateBubblePreview();
    });
    switchBubbleTab('ai');
}

// 2. 渲染预设列表
function renderBubblePresets(presets) {
    const container = document.getElementById('bubblePresetList');
    container.innerHTML = '';
    
    // 添加 "保存当前" 按钮
    const addBtn = document.createElement('button');
    addBtn.className = 'ins-cat-pill';
    addBtn.innerHTML = '+ 保存当前';
    addBtn.style.border = '1px dashed #667eea';
    addBtn.style.color = '#667eea';
    addBtn.style.flexShrink = '0';
    addBtn.onclick = saveBubblePreset;
    container.appendChild(addBtn);
    
    // 渲染预设项
    presets.forEach((preset, index) => {
        const btn = document.createElement('div');
        btn.className = 'ins-cat-pill';
        btn.style.cssText = 'flex-shrink: 0; position: relative; padding-right: 25px; border: 1px solid #e0e0e0; background: #fff; cursor: pointer;';
        
        const span = document.createElement('span');
        span.textContent = preset.name;
        span.onclick = () => applyBubblePreset(index);
        
        const delBtn = document.createElement('span');
        delBtn.innerHTML = '×';
        delBtn.style.cssText = 'position: absolute; right: 8px; top: 50%; transform: translateY(-50%); color: #ccc; font-weight: bold; font-size: 14px;';
        delBtn.onclick = (e) => {
            e.stopPropagation();
            deleteBubblePreset(index);
        };
        
        btn.appendChild(span);
        btn.appendChild(delBtn);
        container.appendChild(btn);
    });
}

// 3. 应用预设
function applyBubblePreset(index) {
    loadFromDB('userInfo', (data) => {
        const presets = (data && data.bubblePresets) ? data.bubblePresets : OFFICIAL_PRESETS;
        const preset = presets[index];
    if (preset) {
    document.getElementById('aiBubbleCssInput').value = preset.ai;
    document.getElementById('userBubbleCssInput').value = preset.user;
    // ★ 恢复贴纸图层
  activeStickerLayers = preset.stickerLayers ? JSON.parse(JSON.stringify(preset.stickerLayers)) : [];
currentLayerId = activeStickerLayers.length > 0 ? activeStickerLayers[activeStickerLayers.length - 1].id : null;
renderLayerList();
if (currentLayerId) loadLayerToEditor(currentLayerId);
generateBubbleCSS(); // ★ 改为generateBubbleCSS，会重新注入贴纸伪元素
}
    });
}

// 4. 保存当前为新预设 (改名避免冲突)
function saveBubblePreset() {
    const name = prompt('给这个样式起个名字：', '我的新样式');
    if (!name) return;
    
    const aiCss = document.getElementById('aiBubbleCssInput').value;
    const userCss = document.getElementById('userBubbleCssInput').value;
    
    loadFromDB('userInfo', (data) => {
        const newData = data || {};
        if (!newData.bubblePresets) newData.bubblePresets = [...OFFICIAL_PRESETS];
        
      newData.bubblePresets.push({
    name: name,
    ai: aiCss,
    user: userCss,
    stickerLayers: JSON.parse(JSON.stringify(activeStickerLayers)) // ★ 新增
});
        saveToDB('userInfo', newData);
        renderBubblePresets(newData.bubblePresets);
    });
}


// 5. 删除预设
function deleteBubblePreset(index) {
    if (!confirm('确定删除这个预设吗？')) return;
    
    loadFromDB('userInfo', (data) => {
        const newData = data || {};
        // 如果还没有保存过预设，先初始化
        if (!newData.bubblePresets) newData.bubblePresets = [...OFFICIAL_PRESETS];
        
        newData.bubblePresets.splice(index, 1);
        
        saveToDB('userInfo', newData);
        renderBubblePresets(newData.bubblePresets);
    });
}

// 导出气泡预设为 JSON 文件
function exportBubblePresets() {
    loadFromDB('userInfo', (data) => {
        const presets = (data && data.bubblePresets) ? data.bubblePresets : OFFICIAL_PRESETS;
        const exportData = {
            version: 1,
            type: 'bubble-presets',
            presets: presets
        };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = '气泡美化方案.json';
        a.click();
        URL.revokeObjectURL(url);
    });
}

// 导入气泡预设 JSON 文件
function importBubblePresets(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importData = JSON.parse(e.target.result);
            // 校验格式
            if (importData.type !== 'bubble-presets' || !Array.isArray(importData.presets)) {
                alert('❌ 文件格式不正确，请选择正确的气泡方案文件');
                return;
            }
            loadFromDB('userInfo', (data) => {
                const newData = data || {};
                if (!newData.bubblePresets) newData.bubblePresets = [...OFFICIAL_PRESETS];
                // 追加导入，避免重名
                importData.presets.forEach(p => {
                    const exists = newData.bubblePresets.some(ep => ep.name === p.name);
                    p.name = exists ? p.name + '_导入' : p.name;
                    newData.bubblePresets.push(p);
                });
                saveToDB('userInfo', newData);
                renderBubblePresets(newData.bubblePresets);
                alert(`✅ 成功导入 ${importData.presets.length} 个预设！`);
            });
        } catch(err) {
            alert('❌ 文件解析失败，请检查文件是否损坏');
        }
    };
    reader.readAsText(file);
    input.value = '';
}

// 6. 实时预览
function updateBubblePreview() {
    const aiCss = document.getElementById('aiBubbleCssInput').value;
    const userCss = document.getElementById('userBubbleCssInput').value;
    
    const aiPreview = document.querySelector('.ai-preview-bubble');
    const userPreview = document.querySelector('.user-preview-bubble');
    
    if (aiPreview) aiPreview.style.cssText = aiCss;
    if (userPreview) userPreview.style.cssText = userCss;
}

// 7. 保存并应用到全局
function saveBubbleStyles() {
    const aiCss = document.getElementById('aiBubbleCssInput').value;
    const userCss = document.getElementById('userBubbleCssInput').value;
    
    loadFromDB('userInfo', (data) => {
        const newData = data || {};
        newData.bubbleStyle = { ai: aiCss, user: userCss };
        
        saveToDB('userInfo', newData);
        injectBubbleStyleTag(aiCss, userCss);
        
        alert('✨ 气泡样式已应用！');
        backToBeautifySettings_Bubble();
    });
}

// 8. 注入全局 Style
function injectBubbleStyleTag(aiCss, userCss) {
    let styleTag = document.getElementById('custom-bubble-style');
    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'custom-bubble-style';
        document.head.appendChild(styleTag);
    }
    styleTag.innerHTML = `
        .message-item:not(.me):not(.html-card) .message-bubble { ${aiCss} }
        .message-item.me:not(.html-card) .message-bubble { ${userCss} }
    `;
}


// 9. 恢复默认
function resetBubbleEditor() {
    if(!confirm('确定恢复默认气泡样式吗？')) return;
    document.getElementById('aiBubbleCssInput').value = OFFICIAL_PRESETS[0].ai;
    document.getElementById('userBubbleCssInput').value = OFFICIAL_PRESETS[0].user;
    // ★ 新增：清空贴纸图层
    activeStickerLayers = [];
    aiStickerLayers = [];
    userStickerLayers = [];
    currentLayerId = null;
    bubbleEffectsCache = { ai: '', user: '' };
    injectBubbleEffectsStyle(); // 清空注入的贴纸CSS
    renderLayerList();
    updateBubblePreview();
}

// 10. 初始化加载
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        loadFromDB('userInfo', (data) => {
            if (data && data.bubbleStyle) {
                injectBubbleStyleTag(data.bubbleStyle.ai, data.bubbleStyle.user);
            }
        });
    }, 600);
});

// 返回函数
function backToBeautifySettings_Bubble() {
    document.getElementById('bubbleBeautifyScreen').style.display = 'none';
    document.getElementById('beautifySettingsScreen').style.display = 'flex';
}

// 切换 Tab 函数 (修复版：切换时立刻归位滑块)
function switchBubbleTab(type) {
    // 1. 更新按钮高亮
    const btns = document.querySelectorAll('#bubbleBeautifyScreen .ins-tab-btn');
    btns.forEach(b => {
        b.classList.remove('active');
        if (type === 'ai' && b.textContent.includes('左侧')) b.classList.add('active');
        if (type === 'user' && b.textContent.includes('右侧')) b.classList.add('active');
    });
    
    // 2. 切换编辑区显示
    document.getElementById('aiBubbleEditor').style.display = type === 'ai' ? 'block' : 'none';
    document.getElementById('userBubbleEditor').style.display = 'user' === type ? 'block' : 'none';

    // 3. ★★★ 核心修复：立刻读取当前文本框里的 CSS ★★★
    const targetInputId = type === 'ai' ? 'aiBubbleCssInput' : 'userBubbleCssInput';
    const targetCss = document.getElementById(targetInputId).value;
    
    // 4. ★★★ 强制滑块归位 (把 CSS 里的 11px 填回滑块) ★★★
    syncCreatorControlsFromCss(targetCss);

// ★ 新增：切换前保存当前气泡的贴纸数据
if (type === 'ai') {
    userStickerLayers = JSON.parse(JSON.stringify(activeStickerLayers));
    activeStickerLayers = JSON.parse(JSON.stringify(aiStickerLayers));
} else {
    aiStickerLayers = JSON.parse(JSON.stringify(activeStickerLayers));
    activeStickerLayers = JSON.parse(JSON.stringify(userStickerLayers));
}
currentLayerId = activeStickerLayers.length > 0 ? activeStickerLayers[0].id : null;


    // 5. 重置贴纸图层 (防止左边的贴纸显示在右边的编辑器里)
  
    renderLayerList();
    document.getElementById('stickerEditorControls').style.display = 'none';
}



// ===========================================
// ★★★ 可视化气泡制作器逻辑 (支持外部贴纸版) ★★★
// ===========================================

let activeStickerLayers = []; // 当前编辑的贴纸数组
let aiStickerLayers = [];      // ★ 新增：AI气泡的贴纸
let userStickerLayers = [];    // ★ 新增：用户气泡的贴纸
let currentLayerId = null;

// 1. 切换制作器面板
function toggleBubbleCreator(checkbox) {
    document.getElementById('bubbleCreatorPanel').style.display = checkbox.checked ? 'block' : 'none';
}

// 2. 添加新图层
function addNewStickerLayer() {
    const newId = Date.now();
    activeStickerLayers.push({
        id: newId,
        url: '', 
        anchor: 'bottom-right', 
        x: 0,    
        y: 0,
        size: 40 // 默认稍微大一点
    });
    currentLayerId = newId;
    renderLayerList();
    loadLayerToEditor(newId);
}

// 3. 渲染图层列表
function renderLayerList() {
    const container = document.getElementById('stickerLayerList');
    container.innerHTML = '';
    
    activeStickerLayers.forEach((layer, index) => {
        const btn = document.createElement('div');
        const isActive = layer.id === currentLayerId;
        
        btn.style.cssText = `
            width: 36px; height: 36px; border-radius: 8px; flex-shrink: 0;
            background-color: #fff; background-position: center; background-size: cover; background-repeat: no-repeat;
            border: 2px solid ${isActive ? '#667eea' : '#eee'};
            cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #ccc;
        `;
        
        if (layer.url) btn.style.backgroundImage = `url('${layer.url}')`;
        else btn.innerText = index + 1;
        
        btn.onclick = () => {
            currentLayerId = layer.id;
            renderLayerList();
            loadLayerToEditor(layer.id);
        };
        
        container.appendChild(btn);
    });
    
    document.getElementById('stickerEditorControls').style.display = activeStickerLayers.length > 0 ? 'block' : 'none';
}

// 4. 加载图层到编辑器
function loadLayerToEditor(id) {
    const layer = activeStickerLayers.find(l => l.id === id);
    if (!layer) return;
    
    document.getElementById('layerUrl').value = layer.url; 
    document.getElementById('layerSize').value = layer.size;
    document.getElementById('layerX').value = layer.x;
    document.getElementById('layerY').value = layer.y;
    
    updateLayerValDisplay(layer);
    
    ['top-left', 'top-right', 'bottom-left', 'bottom-right'].forEach(pos => {
        const btn = document.getElementById('anchor-' + pos);
        if (pos === layer.anchor) btn.classList.add('active');
        else btn.classList.remove('active');
    });
}

function updateLayerValDisplay(layer) {
    document.getElementById('layerSizeVal').innerText = layer.size + 'px';
    document.getElementById('layerXVal').innerText = layer.x + 'px';
    document.getElementById('layerYVal').innerText = layer.y + 'px';
}

// 5. 更新图层属性
function updateCurrentLayer(prop, value) {
    const layer = activeStickerLayers.find(l => l.id === currentLayerId);
    if (!layer) return;
    
    layer[prop] = value;
    if (prop === 'url') renderLayerList();
    if (prop === 'anchor') loadLayerToEditor(currentLayerId);
    else updateLayerValDisplay(layer);
    
    generateBubbleCSS(); 
}

// 6. 处理上传
function handleLayerUpload(input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) { updateCurrentLayer('url', e.target.result); };
        reader.readAsDataURL(file);
    }
    input.value = '';
}

// 7. 删除图层
function removeCurrentLayer() {
    activeStickerLayers = activeStickerLayers.filter(l => l.id !== currentLayerId);
    currentLayerId = activeStickerLayers.length > 0 ? activeStickerLayers[activeStickerLayers.length - 1].id : null;
    renderLayerList();
    if (currentLayerId) loadLayerToEditor(currentLayerId);
    generateBubbleCSS();
}


function getCreatorEffectValue() {
    const el = document.getElementById('creatorEffect');
    return el ? el.value : 'none';
}

function getBubbleEffectCss(effect, bgColor, radius) {
    // 只追加“质感”，不覆盖基础的 background-color / color / border-radius / padding
    if (!effect || effect === 'none') return '';

    if (effect === 'glass') {
        // 玻璃拟态：半透明 + 模糊 + 细描边 + 柔阴影
        return (
            `background-color: rgba(255,255,255,0.55);\n` +
            `backdrop-filter: blur(8px);\n` +
            `-webkit-backdrop-filter: blur(8px);\n` +
            `border: 1px solid rgba(255,255,255,0.55);\n` +
            `box-shadow: 0 8px 18px rgba(0,0,0,0.10);\n`
        );
    }

if (effect === 'highlight') {
    // 只返回主气泡属性；伪元素规则由专用 style 标签注入
    return `overflow: hidden;\n`;
}



    if (effect === 'jelly') {
        // 果冻拟态：渐变 + 内外阴影
        return (
            `background-image: linear-gradient(180deg, rgba(255,255,255,0.35), rgba(0,0,0,0.06));\n` +
            `box-shadow: 0 10px 18px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.55);\n` +
            `border: 1px solid rgba(0,0,0,0.06);\n`
        );
    }

    return '';
}

let bubbleEffectsCache = { ai: '', user: '' };
function injectBubbleEffectsStyle() {
    const styleId = 'bubble-effects-style';
    let styleTag = document.getElementById(styleId);
    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = styleId;
        document.head.appendChild(styleTag);
    }

    styleTag.innerHTML = `${bubbleEffectsCache.ai}\n${bubbleEffectsCache.user}`.trim();
}

// 颜色选择器更新函数（最终修复版）
function updateColorFromPicker(type, hexColor) {
    if (type === 'bg') {
        const preview = document.getElementById('creatorBgPreview');
        if (preview) preview.style.background = hexColor;
    } else if (type === 'text') {
        const preview = document.getElementById('creatorTextPreview');
        if (preview) preview.style.background = hexColor;
    }
    generateBubbleCSS(); // 实时生成CSS
}



// 8. ★★★ 核心：生成 CSS (支持外部贴纸的 Breakout 模式) ★★★
function generateBubbleCSS() {
    const activeTabBtn = document.querySelector('#bubbleBeautifyScreen .ins-tab-btn.active');
    if (!activeTabBtn) return; // 防止页面没加载完报错

    const targetType = activeTabBtn.innerText.includes('左侧') ? 'ai' : 'user';
    const targetInputId = targetType === 'ai' ? 'aiBubbleCssInput' : 'userBubbleCssInput';
    const selector = targetType === 'ai' ? '.message-item:not(.me) .message-bubble' : '.message-item.me .message-bubble';
    
    // 获取颜色和圆角
const bgPicker = document.getElementById('creatorBgPicker');
const textPicker = document.getElementById('creatorTextPicker');
const bgColor = bgPicker ? bgPicker.value : '#ffffff';
const textColor = textPicker ? textPicker.value : '#333333';




    const radius = document.getElementById('creatorRadius').value;

    // ★★★ 修复重点：这里加了检测，找不到滑块就用默认值 12px，不会报错卡死 ★★★
    const elPadY = document.getElementById('creatorPadY');
    const elPadX = document.getElementById('creatorPadX');
    const padY = elPadY ? elPadY.value : 12; 
    const padX = elPadX ? elPadX.value : 12;
    
   // 1. 气泡本体样式
let css = `background-color: ${bgColor};\n`;
css += `color: ${textColor};\n`;
css += `border-radius: ${radius}px;\n`;
css += `border: 1px solid rgba(0,0,0,0.05);\n`;
css += `padding: ${padY}px ${padX}px;\n`;
css += `position: relative; overflow: visible;\n`;
css += `writing-mode: horizontal-tb;\n`;
css += `text-orientation: mixed;\n`;

const effect = getCreatorEffectValue();
const effectCss = getBubbleEffectCss(effect, bgColor, radius);
css += effectCss;



    
    // 2. 贴纸逻辑
    const validLayers = activeStickerLayers.filter(l => l.url && l.url.trim() !== '');
    let effectsCss = '';

    if (effect === 'highlight') {
    effectsCss += `\n/* 高光短横线 */\n${selector}::before {\n`;
    effectsCss += `content: '';\n`;
    effectsCss += `position: absolute;\n`;
    effectsCss += `left: 18%;\n`;
    effectsCss += `top: 7px;\n`;
    effectsCss += `width: 42%;\n`;
    effectsCss += `height: 2px;\n`;
    effectsCss += `border-radius: 999px;\n`;
    effectsCss += `background: rgba(255,255,255,0.65);\n`;
    effectsCss += `pointer-events: none;\n`;
    effectsCss += `}\n`;
}

if (validLayers.length > 0) {
    effectsCss += `\n/* 贴纸层 */\n${selector}::after {\n`;
    effectsCss += `content: '';\n`;
    effectsCss += `position: absolute;\n`;
    effectsCss += `top: -50px; left: -50px; right: -50px; bottom: -50px;\n`;
    effectsCss += `pointer-events: none;\n`;

    const bgImages = [];
    const bgPositions = [];
    const bgSizes = [];
    const bgRepeats = [];

    validLayers.forEach(l => {
        bgImages.push(`url('${l.url}')`);
        bgSizes.push(`${l.size}px`);
        bgRepeats.push('no-repeat');

        const offsetBase = 50;
        const posX = l.anchor.includes('left')
            ? `left ${offsetBase + parseInt(l.x)}px`
            : `right ${offsetBase - parseInt(l.x)}px`;
        const posY = l.anchor.includes('top')
            ? `top ${offsetBase + parseInt(l.y)}px`
            : `bottom ${offsetBase - parseInt(l.y)}px`;

        bgPositions.push(`${posX} ${posY}`);
    });

    effectsCss += `background-image: ${bgImages.join(', ')};\n`;
    effectsCss += `background-position: ${bgPositions.join(', ')};\n`;
    effectsCss += `background-size: ${bgSizes.join(', ')};\n`;
    effectsCss += `background-repeat: ${bgRepeats.join(', ')};\n`;
    effectsCss += `}\n`;
}
if (targetType === 'ai') bubbleEffectsCache.ai = effectsCss;
else bubbleEffectsCache.user = effectsCss;

injectBubbleEffectsStyle();

    
    // 输出 CSS 并刷新预览
    const outputArea = document.getElementById(targetInputId);
    if(outputArea) {
        outputArea.value = css;
        updateBubblePreview(); // 触发刷新
    }
}


// 9. ★★★ 修复预览逻辑 (终极权重版) ★★★
function updateBubblePreview() {
    const aiCss = document.getElementById('aiBubbleCssInput').value;
    const userCss = document.getElementById('userBubbleCssInput').value;
    
    // 查找或创建预览专用 style 标签
    let previewStyle = document.getElementById('preview-bubble-style');
    if (!previewStyle) {
        previewStyle = document.createElement('style');
        previewStyle.id = 'preview-bubble-style';
        document.head.appendChild(previewStyle);
    }
    
    // 构造 CSS
    const wrapCss = (selector, cssCode) => {
        // 处理 "Breakout" 贴纸语法
        if (cssCode.includes('}')) {
            const parts = cssCode.split('}');
            const mainStyle = parts[0];
            const afterStyle = parts[1]; 
            // 替换伪元素选择器
            const cleanAfterStyle = afterStyle.replace(/.+::after/, `${selector}::after`);
            
            return `${selector} { ${mainStyle} } \n ${cleanAfterStyle} }`; 
        } else {
            return `${selector} { ${cssCode} }`;
        }
    };
    
    // ★★★ 核心修改：增加了 #bubblePreviewContainer 前缀 ★★★
    // 加上 ID 选择器后，权重直接 +100，绝对能覆盖任何默认样式！
    previewStyle.innerHTML = `
        ${wrapCss('#bubblePreviewContainer .message-item .ai-preview-bubble', aiCss)}
        ${wrapCss('#bubblePreviewContainer .message-item.me .user-preview-bubble', userCss)}
    `;
    
    // 清除内联样式
    const aiEl = document.querySelector('.ai-preview-bubble');
    const userEl = document.querySelector('.user-preview-bubble');
    if(aiEl) aiEl.style = '';
    if(userEl) userEl.style = '';
}

// ===========================================
// ★★★ 整套美化方案管理逻辑 ★★★
// ===========================================

// 1. 渲染方案列表
function renderThemeSchemes() {
    const container = document.getElementById('themeSchemeList');
    if (!container) return;
    container.innerHTML = '';

    loadFromDB('userInfo', (data) => {
        const schemes = (data && data.themeSchemes) ? data.themeSchemes : [];
        
        if (schemes.length === 0) {
            container.innerHTML = '<div style="font-size:12px; color:#ccc; width:100%; text-align:center; padding:10px;">暂无保存的方案</div>';
            return;
        }

        schemes.forEach((scheme, index) => {
            const btn = document.createElement('div');
            btn.className = 'ins-cat-pill';
            btn.style.cssText = 'position: relative; padding: 8px 30px 8px 15px; border: 1px solid #eee; background: #f9f9f9; cursor: pointer; border-radius: 8px; font-size: 13px;';
            
            // 方案名
            const span = document.createElement('span');
            span.textContent = scheme.name;
            span.onclick = () => applyThemeScheme(index); // 点击应用
            
            // 删除按钮
            const delBtn = document.createElement('span');
            delBtn.innerHTML = '×';
            delBtn.style.cssText = 'position: absolute; right: 8px; top: 50%; transform: translateY(-50%); color: #ff4757; font-weight: bold; cursor: pointer; padding: 5px;';
            delBtn.onclick = (e) => {
                e.stopPropagation();
                deleteThemeScheme(index);
            };

            btn.appendChild(span);
            btn.appendChild(delBtn);
            container.appendChild(btn);
        });
    });
}

// 2. 保存当前所有设置为方案
function saveCurrentThemeScheme() {
    const name = prompt('给当前整套方案起个名字：', '我的酷炫主题');
    if (!name) return;

    loadFromDB('userInfo', (data) => {
        const currentData = data || {};
        
        // 收集当前所有美化数据
        const schemeData = {
            name: name,
            data: {
                // 1. 导航栏透明设置 (存放在 localStorage)
                navTransparent: localStorage.getItem('setting_nav_transparent') === 'true',
                // 2. 导航栏颜色
                navTextColor: currentData.navTextColor || '#333333',
                // 3. 角色列表样式
                charListStyle: currentData.charListStyle || null,
                // 4. 对话页面样式
                chatScreenStyle: currentData.chatScreenStyle || null,
            // 5. 气泡样式
bubbleStyle: currentData.bubbleStyle || null,
// 6. 贴纸图层 ★★★ 新增
stickerLayers: JSON.parse(JSON.stringify(activeStickerLayers)) || []
                
            }
        };

        // 保存到数组
        if (!currentData.themeSchemes) currentData.themeSchemes = [];
        currentData.themeSchemes.push(schemeData);

        saveToDB('userInfo', currentData);
        renderThemeSchemes();
        alert('✅ 方案已保存！');
    });
}

// 3. 应用方案
function applyThemeScheme(index) {
    if (!confirm('确定要应用这个方案吗？\n当前的未保存修改将被覆盖。')) return;

    loadFromDB('userInfo', (data) => {
        const schemes = data.themeSchemes || [];
        const scheme = schemes[index];
        if (!scheme) return;

        const config = scheme.data;
        const newData = { ...data }; // 复制当前数据

        // --- 1. 应用导航栏透明 ---
        localStorage.setItem('setting_nav_transparent', config.navTransparent);
        initBeautifySettings(); // 重新运行初始化逻辑

        // --- 2. 应用导航栏颜色 ---
        newData.navTextColor = config.navTextColor;
        document.documentElement.style.setProperty('--nav-custom-text-color', config.navTextColor);

        // --- 3. 应用角色列表样式 ---
        newData.charListStyle = config.charListStyle;
        applyStylesToRoot(config.charListStyle);

        // --- 4. 应用对话页面样式 ---
        newData.chatScreenStyle = config.chatScreenStyle;
        applyCSStylesToRoot(config.chatScreenStyle);

        // --- 5. 应用气泡样式 ---
        if (config.bubbleStyle) {
            newData.bubbleStyle = config.bubbleStyle;
            injectBubbleStyleTag(config.bubbleStyle.ai, config.bubbleStyle.user);
        }

        // --- 6. 应用贴纸图层 ---
if (config.stickerLayers && config.stickerLayers.length > 0) {
    activeStickerLayers = JSON.parse(JSON.stringify(config.stickerLayers));
    renderLayerList();
    if (activeStickerLayers.length > 0) {
        currentLayerId = activeStickerLayers[0].id;
        loadLayerToEditor(currentLayerId);
        generateBubbleCSS();
    }
}

        // --- 更新数据库中的当前状态 ---
        saveToDB('userInfo', newData);
        
        alert(`✨ 方案 "${scheme.name}" 已应用！`);
    });
}

// 4. 删除方案
function deleteThemeScheme(index) {
    if (!confirm('确定删除这个方案吗？')) return;

    loadFromDB('userInfo', (data) => {
        if (data && data.themeSchemes) {
            data.themeSchemes.splice(index, 1);
            saveToDB('userInfo', data);
            renderThemeSchemes();
        }
    });
}

// ★★★ 修复版：同步滑块位置 + 同步数字显示 ★★★
function syncCreatorControlsFromCss(css) {
    if (!css) return;

    // 辅助函数：同时更新滑块和旁边的文字
    const updateControl = (id, val) => {
        // 1. 更新滑块位置
        const input = document.getElementById(id);
        if (input) {
            input.value = val;
        }
        
        // 2. 更新旁边的数字显示 (ID通常是 滑块ID + "Val")
        const label = document.getElementById(id + 'Val');
        if (label) {
            label.innerText = val + 'px';
        }
    };

    // 1. 同步内边距 (匹配 padding: 垂直px 水平px;)
    // 例如: padding: 8px 12px; -> 垂直=8, 水平=12
    const padMatch = css.match(/padding:\s*(\d+)px\s+(\d+)px/);
    if (padMatch) {
        updateControl('creatorPadY', padMatch[1]); // 垂直
        updateControl('creatorPadX', padMatch[2]); // 水平
    }

    // 2. 同步圆角 (匹配 border-radius: 18px;)
    const rMatch = css.match(/border-radius:\s*(\d+)px/);
    if (rMatch) {
        updateControl('creatorRadius', rMatch[1]);
    }

// 3. 同步背景色（HEX版本）
const bgRgb = css.match(/background-color:\s*rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
if (bgRgb) {
    const r = parseInt(bgRgb[1]);
    const g = parseInt(bgRgb[2]);
    const b = parseInt(bgRgb[3]);
    const hexColor = '#' + [r,g,b].map(x => x.toString(16).padStart(2,'0')).join('');
    const bgPicker = document.getElementById('creatorBgPicker');
    const bgPreview = document.getElementById('creatorBgPreview');
    if (bgPicker) bgPicker.value = hexColor;
    if (bgPreview) bgPreview.style.background = hexColor;
}

// 4. 同步文字色（HEX版本）
const txRgb = css.match(/[\s;]color:\s*rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
if (txRgb) {
    const r = parseInt(txRgb[1]);
    const g = parseInt(txRgb[2]);
    const b = parseInt(txRgb[3]);
    const hexColor = '#' + [r,g,b].map(x => x.toString(16).padStart(2,'0')).join('');
    const textPicker = document.getElementById('creatorTextPicker');
    const textPreview = document.getElementById('creatorTextPreview');
    if (textPicker) textPicker.value = hexColor;
    if (textPreview) textPreview.style.background = hexColor;
}



  

    // 5. 同步质感下拉框（从 CSS 反推）
const effectSelect = document.getElementById('creatorEffect');
if (effectSelect) {
    let effect = 'none';

    if (/backdrop-filter:\s*blur\(/.test(css) || /-webkit-backdrop-filter:\s*blur\(/.test(css)) {
        effect = 'glass';
    } else if (/::before/.test(css) || /高光短横线/.test(css)) {
        effect = 'highlight';
    }  else if (/data:image\/svg\+xml,/.test(css) && /短横线外框/.test(css)) {
  

    } else if (/inset\s+0\s+1px\s+0\s+rgba\(255,255,255/.test(css) && /linear-gradient\(/.test(css)) {
        effect = 'jelly';
    }

    effectSelect.value = effect;
}

 // ★★★ 新增：强制确保横向文字 ★★★
    if (!/writing-mode:\s*horizontal-tb/i.test(css)) {
        // 如果 CSS 里没有横向设置，强制加上
        const bgPicker = document.getElementById('creatorBgPicker');
        const textPicker = document.getElementById('creatorTextPicker');
        if (bgPicker && textPicker) {
            // 触发一次生成，会自动加上 writing-mode
            generateBubbleCSS();
        }
    }
}




// ============ 角色语音功能 ============
let voiceConfig = {
    enabled: false,
    apiKey: '',
    groupId: '',
    voiceCharacterId: 'female-tianmei'
};

function openVoiceRoleSettings() {
    loadVoiceConfig();
    document.getElementById('voiceRoleModal').style.display = 'flex';
}

function closeVoiceRoleModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('voiceRoleModal').style.display = 'none';
}

function loadVoiceConfig() {
    loadFromDB('voiceConfig', (data) => {
        if (data) {
            voiceConfig = data;
            document.getElementById('voiceEnabled').checked = voiceConfig.enabled;
            document.getElementById('minimaxApiKey').value = voiceConfig.apiKey || '';
            document.getElementById('minimaxGroupId').value = voiceConfig.groupId || '';
            document.getElementById('voiceCharacterId').value = voiceConfig.voiceCharacterId || '';
            document.getElementById('voiceConfigPanel').style.display = voiceConfig.enabled ? 'block' : 'none';
        }
    });
}


function saveVoiceConfig() {
    const voiceCharacterId = document.getElementById('voiceCharacterId').value.trim();
    
    voiceConfig = {
        enabled: document.getElementById('voiceEnabled').checked,
        apiKey: document.getElementById('minimaxApiKey').value.trim(),
        groupId: document.getElementById('minimaxGroupId').value.trim(),
        voiceCharacterId: voiceCharacterId
    };
    
    console.log('保存的voiceConfig:', voiceConfig);
    
    if (voiceConfig.enabled && (!voiceConfig.apiKey || !voiceConfig.groupId)) {
        alert('请填写API Key和Group ID');
        return;
    }
    
    const transaction = db.transaction(['voiceConfig'], 'readwrite');
    const objectStore = transaction.objectStore('voiceConfig');
    objectStore.put({ id: 1, ...voiceConfig });
    
    console.log('已保存到数据库');
    alert('已保存');
    closeVoiceRoleModal();
}

// ★ 修正：未勾选时直接转文字，勾选时才调用minimax
// ★ 修正：读内存配置而非DOM状态
function checkAndPlayVoice(text) {
    if (!voiceConfig.enabled) {
        return;
    }
    
    playVoiceMessage(text);
}


async function playVoiceMessage(text) {
    if (!voiceConfig.enabled || !voiceConfig.apiKey || !voiceConfig.groupId) {
        alert('请先启用并配置角色语音');
        return;
    }
    
 const voiceId = voiceConfig.voiceCharacterId || 'female-tianmei';

    console.log('开始调用MiniMax TTS API...');

    console.log('voiceConfig:', voiceConfig);
console.log('请求体:', {
    text: text,
    voice_id: voiceId,
    apiKey: voiceConfig.apiKey ? '***' : '未设置',
    groupId: voiceConfig.groupId ? '***' : '未设置'
});
    
  
    // 使用你部署成功的 Worker 地址
    const apiUrl = 'https://bold-dawn-c01f.1726776740.workers.dev';
    
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                voice_id: voiceId,
                apiKey: voiceConfig.apiKey,
                groupId: voiceConfig.groupId
            })
        });
        
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || `API错误 ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Worker返回数据:', data);
console.log('audio字段类型:', typeof data.audio, '长度:', data.audio?.length);
        
        if (data.success && data.audio) {
            // ★★★ 核心修复：将 HEX 字符串还原为真正的音频二进制数据 ★★★
            const hexString = data.audio;
            const bytes = new Uint8Array(hexString.length / 2);
            for (let i = 0; i < hexString.length; i += 2) {
                bytes[i / 2] = parseInt(hexString.substring(i, i + 2), 16);
            }
            
            // 将二进制数据打包成浏览器认识的 mp3 文件 (Blob)
            const blob = new Blob([bytes], { type: 'audio/mpeg' });
            
            // 生成播放链接
            const audioSrc = URL.createObjectURL(blob);
            const audio = new Audio(audioSrc);
            audio.volume = 1.0;
            
            // 播放完毕后释放内存
            audio.onended = () => {
                URL.revokeObjectURL(audioSrc);
            };
            
            await audio.play();
            console.log('✅ 语音播放成功');
        } else {
            throw new Error(data.error || 'Worker返回数据异常');
        }
        
    } catch (error) {
        console.error('完整错误信息:', error);
        alert('语音播放失败：\n' + error.message);
    }
}
// 开关切换事件
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        // 页面加载时从数据库恢复语音配置到内存
        loadFromDB('voiceConfig', (data) => {
            if (data) {
                voiceConfig = data;
                console.log('✅ 语音配置已恢复:', voiceConfig.enabled);
            }
        });
        
        const toggle = document.getElementById('voiceEnabled');
        if (toggle) {
            toggle.addEventListener('change', function() {
                document.getElementById('voiceConfigPanel').style.display = this.checked ? 'block' : 'none';
            });
        }
    }, 500);
});
let lastNotificationTime = 0;

function playNotificationSound() {
    const now = Date.now();
    
    if (now - lastNotificationTime < 1000) {
        return;
    }
    
    lastNotificationTime = now;
    
    loadFromDB('notificationSound', (data) => {
        if (!data || !data.enabled) {
        
            return;
        }
        
        try {
            if (data.customSound) {
                const audio = new Audio(data.customSound);
                audio.volume = 1;
                audio.muted = false;
                
                // 手机需要用户交互才能播放，这里添加重试机制
                const playPromise = audio.play();
                if (playPromise !== undefined) {
                    playPromise
                        .then(() => console.log('提示音播放成功'))
                        .catch(err => {
                            console.log('提示音播放失败，尝试重新播放:', err);
                            // 延迟后重试
                            setTimeout(() => {
                                audio.play().catch(e => console.log('重试失败:', e));
                            }, 100);
                        });
                }
            }
        } catch (error) {
            console.error('播放提示音失败:', error);
        }
    });
}


// ============ 日程页面逻辑 (cat.js) ============

// 临时存储变量
let tempUserPlan = "";
let tempCharRoutine = "";

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (typeof resetSchedulesIfNewDayForAllChats === 'function') {
            resetSchedulesIfNewDayForAllChats();
        }
    }, 1200);
});



function getTodayKey() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

function resetScheduleIfNewDayForChat(allData, chatId) {
    if (!allData || !chatId) return false;

    if (!allData[chatId]) allData[chatId] = {};
    const charData = allData[chatId];
    const scheduleData = charData.scheduleData || {};

    const todayKey = getTodayKey();
    const lastKey = scheduleData.lastScheduleDate;

    // 第一次使用：只写入日期，不清空
    if (!lastKey) {
        charData.scheduleData = { ...scheduleData, lastScheduleDate: todayKey };
        return { changed: true, cleared: false };
    }

    // 同一天：不动
    if (lastKey === todayKey) return { changed: false, cleared: false };

    // 跨天：清用户计划 + 今日行程；保留 charRoutine
    charData.scheduleData = {
        ...scheduleData,
        lastScheduleDate: todayKey,
        userPlan: '',
        todayTimeline: []
        // charRoutine 保留（因为 ...scheduleData 里已带着）
    };

    return { changed: true, cleared: true };
}

function resetSchedulesIfNewDayForAllChats() {
    loadFromDB('characterInfo', (data) => {
        const allData = data || {};
        let anyChanged = false;

        (chats || []).forEach(c => {
            if (!c || !c.id) return;
            const res = resetScheduleIfNewDayForChat(allData, c.id);
            if (res && res.changed) anyChanged = true;
        });

        if (anyChanged) {
            saveToDB('characterInfo', allData);
            console.log('🧹 已执行跨天日程清理（全角色）');
        }
    });
}




// 打开日程页面
function openScheduleScreen() {
    if (!currentChatId) return;
    
    // 隐藏聊天详情
    document.getElementById('chatDetailScreen').style.display = 'none';
    const screen = document.getElementById('scheduleScreen');
    if (screen) screen.style.display = 'flex';

    // 设置标题名字
    const chat = chats.find(c => c.id === currentChatId);
    if(chat) document.getElementById('scheduleCharName').textContent = chat.name;

    // 加载已有数据
    loadFromDB('characterInfo', (data) => {
        const allData = data || {};
const res = resetScheduleIfNewDayForChat(allData, currentChatId);
if (res.changed) saveToDB('characterInfo', allData);

const charData = allData[currentChatId] || {};

if (res.cleared) {
    const area = document.getElementById('scheduleResultArea');
    const container = document.getElementById('scheduleTimeline');
    if (area) area.style.display = 'none';
    if (container) container.innerHTML = '';
    const charData2 = allData[currentChatId] || {};
const scheduleData = charData2.scheduleData || {};

}


        // 回显文本
        tempUserPlan = scheduleData.userPlan || "";
        tempCharRoutine = scheduleData.charRoutine || "";
        
        document.getElementById('userPlanInput').value = tempUserPlan;
        document.getElementById('charRoutineInput').value = tempCharRoutine;

        // 更新UI预览文字
        updateScheduleUIPreview();

        // 如果已经有生成的行程，渲染出来
        if (scheduleData.todayTimeline && scheduleData.todayTimeline.length > 0) {
            renderTimeline(scheduleData.todayTimeline);
        }
    });
}

// 更新列表上的预览文字
function updateScheduleUIPreview() {
    const planPreview = document.getElementById('userPlanPreview');
    const routinePreview = document.getElementById('charRoutinePreview');
    
    if (tempUserPlan) planPreview.textContent = "已填写：" + tempUserPlan.substring(0, 15) + "...";
    else planPreview.textContent = "点击填写今日安排";

    if (tempCharRoutine) routinePreview.textContent = "已填写：" + tempCharRoutine.substring(0, 15) + "...";
    else routinePreview.textContent = "默认按人设自由发挥";
}




// 关闭日程页面
function closeScheduleScreen() {
    document.getElementById('scheduleScreen').style.display = 'none';
    document.getElementById('chatDetailScreen').style.display = 'flex';
}

// --- 弹窗控制 (确保这些函数在全局作用域) ---
function openUserPlanModal() { 
    document.getElementById('userPlanModal').style.display = 'flex'; 
}

function closeUserPlanModal(e) { 
    if(e && e.target !== e.currentTarget) return; 
    document.getElementById('userPlanModal').style.display = 'none'; 
}

function openRoutineModal() { 
    document.getElementById('charRoutineModal').style.display = 'flex'; 
}

function closeRoutineModal(e) { 
    if(e && e.target !== e.currentTarget) return; 
    document.getElementById('charRoutineModal').style.display = 'none'; 
}

// --- 保存输入 ---
function saveUserPlan() {
    tempUserPlan = document.getElementById('userPlanInput').value.trim();
    saveScheduleDataToDB();
    updateScheduleUIPreview();
    closeUserPlanModal();
}

function saveRoutine() {
    tempCharRoutine = document.getElementById('charRoutineInput').value.trim();
    saveScheduleDataToDB();
    updateScheduleUIPreview();
    closeRoutineModal();
}

// 保存数据到 DB
function saveScheduleDataToDB(timeline = null) {
    if (!currentChatId) return;
    loadFromDB('characterInfo', (data) => {
        const allData = data || {};
        if (!allData[currentChatId]) allData[currentChatId] = {};
        
        const oldSchedule = allData[currentChatId].scheduleData || {};
        
        allData[currentChatId].scheduleData = {
            lastScheduleDate: getTodayKey(),
            ...oldSchedule,
            userPlan: tempUserPlan,
            charRoutine: tempCharRoutine,
            todayTimeline: timeline !== null ? timeline : oldSchedule.todayTimeline
        };
        
        saveToDB('characterInfo', allData);
    });
}


// 渲染时间轴 (带吐槽版)
function renderTimeline(timeline) {
    const container = document.getElementById('scheduleTimeline');
    const area = document.getElementById('scheduleResultArea');
    if (area) area.style.display = 'block';
    
    if (container) {
        container.innerHTML = timeline.map(item => `
            <div class="schedule-item ${item.withUser ? 'with-user' : ''}">
                <div class="schedule-time">${item.time}</div>
                <div class="schedule-content">
                    <div style="font-weight: 600; margin-bottom: 4px;">
                        ${item.withUser ? '❤️ ' : ''}${item.activity}
                    </div>
                    <div style="font-size: 12px; color: #888; font-style: italic; margin-top: 4px;">
                        "${item.comment}"
                    </div>
                </div>
            </div>
        `).join('');
    }
}


// --- ✨ 核心：生成行程 (修正语气版) ---
async function generateDaySchedule() {
    // 1. 检查 API 配置
    if (!currentApiConfig.baseUrl || !currentApiConfig.apiKey) {
        alert('请先配置API');
        return;
    }

    // 2. 获取 UI 元素
    const btn = document.querySelector('#scheduleScreen .ins-btn-black');
    const originalText = btn ? btn.textContent : "生成今日行程";
    const loadingIcon = document.getElementById('scheduleLoadingIcon');

    // === 开始加载状态 ===
    if (btn) {
        btn.textContent = "正在规划中...";
        btn.disabled = true;
        btn.style.opacity = "0.7";
    }
    if (loadingIcon) loadingIcon.style.display = 'block';

    try {
        // 3. 获取数据
        const chat = chats.find(c => c.id === currentChatId);
        if (!chat) throw new Error("未找到当前角色");

        const charData = await new Promise(resolve => {
            loadFromDB('characterInfo', d => resolve(d && d[currentChatId] ? d[currentChatId] : {}));
        });

        
        // 4. 构建 Prompt (★ 重点修改了这里：强调“计划感”和“将来时”)
     const prompt = `你现在是【${chat.name}】本人，在手机里给自己写【今天的行程计划】。这是一份“还没发生的计划”，不是回忆录/日记。

【硬性设定（最高优先级）】
- 你必须严格符合下面的【角色人设】；【作息补充】是你的补充与参考，你也要看！
- 你的语气必须像真实人类写计划：用“准备/打算/应该/可能/先/再/到时候/如果…”等表达。
- 禁止使用“已经/刚刚/结束了/我去了/我吃了/我做完了”这类回忆口吻。

【角色人设（必须遵守）】
${charData.personality || '无特殊设定'}

【作息补充（参考补充）】
${tempCharRoutine ? tempCharRoutine : '（无补充：按人设+常识自由安排）'}

【用户的计划（可能不带时间，要你自己合理安排）】
${tempUserPlan ? tempUserPlan : '（用户没写具体计划：你就按人设过普通的一天）'}

【你要输出的内容：今天行程表（带吐槽）】
- 生成 6-10 条行程，不要太满，也不要太空。
- 每条都包含：
  1) time：可以是具体时间“10:00/15:30”，也可以是时段“午后/傍晚/睡前/通勤路上”
  2) activity：一句话说明今天你要做什么（像计划表）
  3) comment：一句“你内心的OS/吐槽”，必须是你的口吻，像发给朋友看的那种（别太文艺，别太像AI总结）
  4) withUser：如果这段行程和用户一起/围绕用户展开，填 true，否则 false

【融合规则（很重要）】
- 用户计划如果没时间：你要自己按常识放到合理时段（吃饭=饭点、电影=晚上、睡觉=深夜等）。
- 你不能全天围着用户：至少 60% 的条目是你自己的生活（工作/学习/摸鱼/健身/通勤/家务/发呆）。
- 但你会“把用户纳入你的生活”：如果人设允许，你可以主动腾时间/改计划；如果人设不允许，就写成“我尽量/我下班后/我晚点回你”这种现实安排。
- comment 里可以吐槽上班、犯困、社交电量、嘴硬心软、期待见面等，但必须贴合人设，同样也是对activity的一些期待和评价，不能说的好像是已经做过一样，这是还没有做的心理话！

【输出格式（必须严格遵守）】
只输出 JSON 数组，不要输出任何解释、不要 Markdown、不要代码块。
字段固定为：time, activity, comment, withUser

【示例（仅示例，别照抄）】
[
  {"time":"10:00","activity":"上班/开会","comment":"我真的想把闹钟扔出窗外。","withUser":false},
  {"time":"午饭前后","activity":"今天和你一起吃牛肉饭","comment":"新开的一家，不知道味道如何，千万别踩雷","withUser":true},
  {"time":"下午三点","activity":"跟你出去玩/见面/散步","comment":"行吧，今天我就当一次有生活的人。","withUser":true},
  {"time":"睡前","activity":"躺平刷手机","comment":"刷视频的生活不用解释","withUser":false}
]

现在开始输出今天的 JSON 行程。`;


        // 5. 调用 API
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

        if (!response.ok) throw new Error('网络请求失败');

        const resData = await response.json();
        let content = resData.choices[0].message.content.trim();
        
        // 6. 清洗 JSON
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();
        
        let timeline = [];
        try {
            timeline = JSON.parse(content);
        } catch (e) {
            console.error("JSON解析失败", content);
            throw new Error("AI生成格式有误，请重试");
        }

        // 7. 保存并渲染
        saveScheduleDataToDB(timeline);
        renderTimeline(timeline);
        
    } catch (error) {
        console.error(error);
        alert("生成失败：" + error.message);
    } finally {
        // === 结束加载状态 ===
        if (btn) {
            btn.textContent = originalText;
            btn.disabled = false;
            btn.style.opacity = "1";
        }
        if (loadingIcon) loadingIcon.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(resetSchedulesIfNewDayForAllChats, 1200);
});




// ============ 抽签功能 ============

// 抽签事件：仅用于本次请求注入，不落库
let pendingFortuneEvent = null;
let currentLotType = '平'; // 记录本次抽到的类型（吉/平/凶）
let tempSelectedFortuneWorldbooks = [];


// 事件库
const eventLibrary = {
    吉: [
        "路上捡到了一张咖啡优惠券",
        "遇到了很久不见的老朋友",
        "喜欢的奶茶店今天在打折",
        "收到了一份意外的小礼物",
        "今天天气特别好，心情舒畅",
        "公交车刚到站就赶上了",
        "买彩票中了小奖",
        "老板突然说今天可以早点下班"
    ],
    平: [
        "在便利店买了瓶水",
        "路过公园看到小孩在玩",
        "午饭吃了平时常吃的便当",
        "地铁上看到有人在看书",
        "收到了一条普通的短信",
        "路边的花开得正好",
        "超市买了些日用品",
        "看了会儿手机视频"
    ],
    凶: [
        "路上踩了狗屎",
        "出门忘带钥匙了",
        "买的奶茶洒了一半",
        "手机突然没电了",
        "等了很久的公交车刚开走",
        "衣服被门夹住撕了个口子",
        "刚洗的头发被雨淋湿了",
        "重要文件忘在家里了"
    ]
};

let currentLotEvent = '';

// 打开抽签弹窗
function openDrawLotModal() {
    const modal = document.getElementById('drawLotModal');
    modal.style.display = 'flex';
    
    // 重置状态
    document.getElementById('lotBucket').style.display = 'flex';
    document.getElementById('drawnLot').style.display = 'none';
    document.getElementById('lotDetailCard').style.display = 'none';
    currentLotEvent = '';
}

// 关闭抽签弹窗
function closeDrawLotModal(event) {
    if (event && event.target.id !== 'drawLotModal') return;
    document.getElementById('drawLotModal').style.display = 'none';
}

// 抽签
function drawLot() {
    const bucket = document.getElementById('lotBucket');
    const drawnLot = document.getElementById('drawnLot');
    const resultEl = document.getElementById('lotResult');
    
    // 签桶抖动
    bucket.style.animation = 'shake 0.5s ease';
    
    setTimeout(() => {
        // 随机抽签
        const lotTypes = ['吉', '平', '凶'];
        const weights = [0.3, 0.4, 0.3];
        const random = Math.random();
        let cumulative = 0;
        let result = '平';
        
        for (let i = 0; i < lotTypes.length; i++) {
            cumulative += weights[i];
            if (random < cumulative) {
                result = lotTypes[i];
                break;
            }
        }
        
        // 显示结果
        resultEl.textContent = result;
        resultEl.setAttribute('data-type', result);
        currentLotType = result;
        
        bucket.style.display = 'none';
        drawnLot.style.display = 'block';
        
    }, 500);
}

// 抖动动画
if (!document.getElementById('shake-animation-style')) {
    const style = document.createElement('style');
    style.id = 'shake-animation-style';
    style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-10px); }
        75% { transform: translateX(10px); }
    }
    `;
    document.head.appendChild(style);
}

// 查看签文详情
async function viewLotDetail() {
    const drawnLot = document.getElementById('drawnLot');
    const detailCard = document.getElementById('lotDetailCard');
    const loading = document.getElementById('lotLoading');
    const content = document.getElementById('lotContent');
    const eventText = document.getElementById('lotEventText');

    const lotType = document.getElementById('lotResult').getAttribute('data-type') || currentLotType || '平';

    drawnLot.style.display = 'none';
    detailCard.style.display = 'block';
    loading.style.display = 'block';
    content.style.display = 'none';

    try {
        const ev = await generateFortuneEventByAI(lotType);
        currentLotEvent = ev;

        eventText.textContent = ev;
    } catch (e) {
        // 本地兜底：从事件库里随机抽一句
        const pool = (eventLibrary && eventLibrary[lotType] && eventLibrary[lotType].length > 0)
            ? eventLibrary[lotType]
            : (eventLibrary && eventLibrary['平'] ? eventLibrary['平'] : []);

        const fallback = pool.length > 0
            ? pool[Math.floor(Math.random() * pool.length)]
            : '今天发生了一件说不上好坏的小事';

        currentLotEvent = fallback;
        eventText.textContent = fallback;
    } finally {
        loading.style.display = 'none';
        content.style.display = 'block';
    }
}



function acceptLotAndClose() {
    closeDrawLotModal({ target: { id: 'drawLotModal' } });

    if (!currentChatId) {
        alert('请先选择一个聊天对象');
        return;
    }

    const chat = chats.find(c => String(c.id) === String(currentChatId));
    if (!chat) {
        alert('找不到当前聊天对象');
        return;
    }

    const ev = String(currentLotEvent || '').trim();
    if (!ev) {
        alert('签文为空，请重新抽签');
        return;
    }

pendingFortuneEvent = ev;


    // 插播一条可见系统消息（进入历史）
    const sysMsg = {
        id: Date.now(),
        chatId: currentChatId,
        senderId: 'system',
        type: 'system',
        isRevoked: false,
        time: getCurrentTime(),
       content: `${chat.name}遇到新事件：${ev}
`
    };

    allMessages.push(sysMsg);
    console.log('LAST_MSG_AFTER_LOT:', allMessages[allMessages.length - 1]);

    saveMessages();
console.log('LOT_SYSMSG_SAVED:', allMessages.slice(-3).map(m => ({type:m.type, senderId:m.senderId, content:m.content})));

    // 更新聊天列表预览
    updateChatLastMessage(currentChatId, '【系统消息】TA遇到新事件');

    // 自动触发AI回复（失败也不删系统消息）
    receiveAIReply();
    console.log('LOT_PENDING_EVENT_SET:', pendingFortuneEvent);
}

async function generateFortuneEventByAI(lotType) {
    // 基础检查：必须已配置API
    if (!currentApiConfig || !currentApiConfig.baseUrl || !currentApiConfig.apiKey) {
        throw new Error('请先在API设置中配置');
    }

    const requestUrl = currentApiConfig.baseUrl.endsWith('/')
        ? currentApiConfig.baseUrl + 'chat/completions'
        : currentApiConfig.baseUrl + '/chat/completions';

    const modelToUse = currentApiConfig.defaultModel || 'gpt-3.5-turbo';

// 抽签专用世界书绑定（不影响 linkedWorldbooks）
let wbText = '';
if (currentChatId) {
    const charInfo = await new Promise(resolve => loadFromDB('characterInfo', d => resolve(d || {})));
    const thisChar = charInfo[currentChatId] || {};
    const ids = Array.isArray(thisChar.fortuneWorldbooks) ? thisChar.fortuneWorldbooks : [];

    if (ids.length > 0) {
        // 有绑定抽签世界书 → 使用世界书内容
        const allWorldbooks = await new Promise(resolve => loadFromDB('worldbooks', d => resolve(d || [])));
        const picked = allWorldbooks.filter(wb => ids.includes(wb.id));
        const joined = picked.map(wb => `【${wb.title || '未命名'}】\n${wb.content || ''}`).join('\n\n');
        wbText = joined.slice(0, 1200);
    } else {
        // 没有绑定抽签世界书 → 使用角色人设
        const chat = chats.find(c => String(c.id) === String(currentChatId));
        if (chat && chat.prompt) {
            wbText = chat.prompt.slice(0, 1200);  // 限制长度防止token过多
        }
    }
}




const prompt = wbText
    ? (
        `你是“事件生成器”。下面是角色人设/素材（可能是设定或事件池），请严格围绕它生成一条具体日常事件（20-40字）。` +
        `事件倾向为：${lotType}。` +
        `要求：贴合素材设定，不夸张，不玄学，不要解释原因。` +
        `只输出事件本身，不要换行。\n\n` +
        `【素材】\n${wbText}`
      )
    : (
        `你是“日常事件生成器”。请随机生成一条非常具体的日常小事件（20-40字），` +
        `事件倾向为：${lotType}。` +
        `要求：贴近现实生活，不夸张，不玄学，不要解释原因。` +
        `只输出事件本身，不要输出任何前后缀，不要换行。`
      );


    const payload = {
        model: modelToUse,
        messages: [
            { role: 'system', content: '你只输出事件文本本身。' },
            { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        stream: false,
        max_tokens: 300
    };

    const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${currentApiConfig.apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    const rawText = await response.text();
    let data;
    try {
        data = JSON.parse(rawText);
    } catch (e) {
        throw new Error('API返回非JSON');
    }

    if (!response.ok) {
        const msg = (data && data.error && data.error.message) ? data.error.message : rawText;
        throw new Error(msg);
    }

    // 兼容空choices
    if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
        throw new Error('模型返回空回复（choices为空）');
    }

    const txt = data.choices[0] && data.choices[0].message && typeof data.choices[0].message.content === 'string'
        ? data.choices[0].message.content.trim()
        : '';

    if (!txt) throw new Error('模型返回空内容');

// 清理可能的多余内容
let cleaned = txt.trim();

// 1. 移除首尾引号
cleaned = cleaned.replace(/^["'""]+|["'""]+$/g, '');

// 2. 移除开头的编号（如 "1. " "- "）
cleaned = cleaned.replace(/^\s*[-\d\.、]+\s*/, '');

// 3. 移除开头的标签（如 "事件：" "签文："）
cleaned = cleaned.replace(/^(事件|签文|结果)[:：\s]+/i, '');

// 4. 如果有"解释性后缀"，只保留事件本身
const explainIndex = cleaned.search(/[。！\n](因为|解释|原因|注意|说明)[：:]/);
if (explainIndex > 0) {
    cleaned = cleaned.slice(0, explainIndex + 1);
}

// 5. 只取第一个完整句子（遇到句号就停）
const firstSentence = cleaned.match(/^[^。！？\n]+[。！？]?/);
if (firstSentence) {
    cleaned = firstSentence[0];
}

// 6. 最终长度保险
if (cleaned.length > 100) {
    cleaned = cleaned.slice(0, 100);
}

return cleaned.trim();

}


function openFortuneWorldbookModal() {
    if (!currentChatId) {
        alert('请先进入某个角色聊天页');
        return;
    }

    loadFromDB('characterInfo', (data) => {
        const allCharData = data || {};
        const charData = allCharData[currentChatId] || {};

        tempSelectedFortuneWorldbooks = Array.isArray(charData.fortuneWorldbooks) ? [...charData.fortuneWorldbooks] : [];

        renderFortuneWorldbookModalList();

        document.getElementById('fortuneWorldbookModal').style.display = 'flex';
    });
}

function closeFortuneWorldbookModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('fortuneWorldbookModal').style.display = 'none';
}

function renderFortuneWorldbookModalList() {
    const listEl = document.getElementById('fortuneWorldbookSelectorList');
    const countEl = document.getElementById('fortuneWorldbookSelectedCount');
    if (!listEl || !countEl) return;

    loadFromDB('worldbooks', (data) => {
        const allWorldbooks = Array.isArray(data) ? data : (data && data.list ? data.list : []);
        const selected = tempSelectedFortuneWorldbooks || [];
        countEl.textContent = selected.length;

        if (!allWorldbooks || allWorldbooks.length === 0) {
            listEl.innerHTML = '<div style="text-align: center; color: #999; padding: 20px;">暂无世界书，请先在世界书页面添加</div>';
            return;
        }

        listEl.innerHTML = allWorldbooks.map(wb => {
            const title = wb.title || '未命名世界书';
            const category = wb.category || '默认分类';
            const isChecked = selected.includes(wb.id);

            return `
                <div style="display: flex; align-items: center; padding: 12px; border-bottom: 1px solid #f0f0f0; background: ${isChecked ? '#f0f8ff' : 'white'};">
                    <input type="checkbox"
                        id="fortune-wb-${wb.id}"
                        value="${wb.id}"
                        ${isChecked ? 'checked' : ''}
                        onchange="toggleFortuneWorldbook(${wb.id})"
                        style="width: 20px; height: 20px; margin-right: 12px; cursor: pointer; flex-shrink: 0;">
                    <label for="fortune-wb-${wb.id}" style="flex: 1; cursor: pointer; font-size: 15px; line-height: 1.5;">
                        <div style="font-weight: 600; color: #333; margin-bottom: 3px;">${title}</div>
                        <div style="font-size: 12px; color: #999;">分类：${category}</div>
                    </label>
                </div>
            `;
        }).join('');
    });
}

function toggleFortuneWorldbook(id) {
    if (!Array.isArray(tempSelectedFortuneWorldbooks)) tempSelectedFortuneWorldbooks = [];
    const idx = tempSelectedFortuneWorldbooks.indexOf(id);
    if (idx >= 0) tempSelectedFortuneWorldbooks.splice(idx, 1);
    else tempSelectedFortuneWorldbooks.push(id);

    const countEl = document.getElementById('fortuneWorldbookSelectedCount');
    if (countEl) countEl.textContent = tempSelectedFortuneWorldbooks.length;
}

function saveFortuneWorldbookSelection() {
    if (!currentChatId) {
        alert('未找到当前聊天ID');
        closeFortuneWorldbookModal();
        return;
    }

    loadFromDB('characterInfo', (data) => {
        const allCharData = data || {};
        if (!allCharData[currentChatId]) allCharData[currentChatId] = {};

        allCharData[currentChatId].fortuneWorldbooks = [...(tempSelectedFortuneWorldbooks || [])];

        saveToDB('characterInfo', allCharData);

        setTimeout(() => {
            closeFortuneWorldbookModal();
        }, 150);
    });
}



// ============ 抽签功能end ============\


// ============ 角色邮件功能 (AI生成 + 加载动画 + 详情修复版) ============

// ============ 邮件分页和长按删除变量 ============
let loadedEmailCount = 20;
const EMAIL_PAGE_SIZE = 20;
let emailLongPressTimer = null;  // ★ 改名
let emailLongPressTarget = null; // ★ 改名


// 1. 打开邮箱页面
function openEmailScreen() {
    if (!currentChatId) {
        alert("请先在首页选择一个角色！");
        return;
    }
    
    loadedEmailCount = 20; // ★ 重置分页
    document.getElementById('emailScreen').style.display = 'flex';
    
    loadFromDB('characterInfo', (data) => {
        const allData = data || {};
        const charData = allData[currentChatId] || {};
        const emails = charData.emails || [];
        
        renderEmailList(emails);
    });
}

// 2. 关闭邮箱页面
function backToCharacterInfoFromEmail() {
    document.getElementById('emailScreen').style.display = 'none';
}

// 3. 渲染邮件列表 (点击修复版)
function renderEmailList(emails) {
    const container = document.getElementById('emailItemsArea');
    const emptyState = document.getElementById('emailEmptyState');
    const countBadge = document.getElementById('charItinerary'); 

    container.innerHTML = '';

    // 更新首页计数
    if (countBadge) countBadge.textContent = emails.length;

    if (!emails || emails.length === 0) {
        emptyState.style.display = 'flex';
        loadedEmailCount = 20; // 重置
        return;
    }

    emptyState.style.display = 'none';

    // 倒序显示
    const reversedEmails = [...emails].reverse();
    
    // ★ 只渲染前 loadedEmailCount 封
    const emailsToShow = reversedEmails.slice(0, loadedEmailCount);

    emailsToShow.forEach((email, reversedIndex) => {
        const originalIndex = emails.length - 1 - reversedIndex;
        
        const typeMap = {
            'work': { label: '工作', color: '#e3f2fd', text: '#2196f3' },
            'social': { label: '社交', color: '#e8f5e9', text: '#4caf50' },
            'spam': { label: '垃圾', color: '#ffebee', text: '#f44336' },
            'system': { label: '系统', color: '#f3e5f5', text: '#9c27b0' }
        };
        
        const style = typeMap[email.type] || { label: '其他', color: '#eee', text: '#999' };
        
        const unreadDot = email.isRead ? '' : `<div style="width:8px; height:8px; background:#ff4757; border-radius:50%; margin-right:6px;"></div>`;
        
        const commentHtml = email.comment ? `
            <div style="margin-top: 8px; padding: 6px 10px; background: #fffbf0; border-radius: 6px; border: 1px dashed #ffe58f; display: flex; align-items: flex-start; gap: 5px;">
                <span style="font-size: 14px;">💭</span>
                <span style="font-size: 12px; color: #8a6d3b; font-style: italic; line-height: 1.4;">${email.comment}</span>
            </div>
        ` : '';

        // ★ 添加 data-email-index 属性用于长按识别
        const html = `
            <div class="email-card" 
                data-email-index="${originalIndex}"
                style="background: #fff; border-radius: 12px; padding: 15px; margin-bottom: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); border: 1px solid #eee; cursor: pointer; position: relative;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <div style="display: flex; align-items: center;">
                        ${unreadDot}
                        <span style="font-weight: 700; font-size: 15px; color: #333;">${email.sender}</span>
                        <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; margin-left: 6px; background: ${style.color}; color: ${style.text};">
                            ${style.label}
                        </span>
                    </div>
                    <div style="font-size: 12px; color: #bbb;">${email.time}</div>
                </div>
                
                <div style="font-size: 14px; font-weight: 600; color: #555; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${email.subject}
                </div>
                
            <div style="font-size: 13px; color: #888; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
    ${email.content.length > 50 ? email.content.substring(0, 50) + '...' : email.content}
</div>

                ${commentHtml}
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', html);
    });

    // ★ 绑定长按事件
    bindLongPressToEmails();

    // ★ 显示"加载更多"按钮或结束提示
    if (loadedEmailCount < emails.length) {
        const loadMoreBtn = `
            <div style="text-align: center; padding: 20px;">
                <button onclick="loadMoreEmails()" style="padding: 10px 24px; background: #667eea; color: white; border: none; border-radius: 8px; font-size: 14px; cursor: pointer;">
                    加载更多 (还有 ${emails.length - loadedEmailCount} 封)
                </button>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', loadMoreBtn);
    } else {
        const endHint = `
            <div style="text-align: center; padding: 20px; color: #999; font-size: 13px;">
                已加载全部邮件
            </div>
        `;
        container.insertAdjacentHTML('beforeend', endHint);
    }
}

// 4. 清空邮件
function clearEmails() {
    if(!confirm('确定要清空所有邮件吗？')) return;
    
    loadFromDB('characterInfo', (data) => {
        const allData = data || {};
        if (allData[currentChatId]) {
            allData[currentChatId].emails = [];
            saveToDB('characterInfo', allData);
            loadedEmailCount = 20; // ★ 重置分页
            renderEmailList([]);
        }
    });
}

// 5. 生成邮件 (AI 核心逻辑 - 修复加载动画版)
async function generateEmail() {
    // 基础检查
    if (!currentApiConfig || !currentApiConfig.baseUrl || !currentApiConfig.apiKey) {
        alert('请先在设置中配置 API');
        return;
    }
    if (!currentChatId) {
        alert('请先选择一个角色');
        return;
    }

    // ★★★ 修复重点：稳健获取按钮 ★★★
    // 优先找 ID，找不到就用 event.currentTarget
    let btn = document.getElementById('emailGenBtn');
    if (!btn && window.event) {
        btn = window.event.currentTarget;
    }
    
    // 如果还是找不到按钮对象，就不做动画了，直接继续运行
    let originalContent = '';
    if (btn) {
        originalContent = btn.innerHTML; // 保存原始SVG
        // 设置为转圈动画 (SVG)
        btn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="animation: spin 0.8s linear infinite;"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>`;
        btn.disabled = true; // 禁止重复点击
        btn.style.opacity = '0.6';
    }

    try {
        // --- 1. 强制读取最新人设 ---
        const allCharData = await new Promise(resolve => {
            loadFromDB('characterInfo', d => resolve(d || {}));
        });
        const charData = allCharData[currentChatId] || {};
        
        // 获取角色名
        const chat = chats.find(c => c.id === currentChatId);
        const charName = chat ? chat.name : "角色";
        
        // 获取详细人设 (优先 characterInfo > chat.prompt > 默认)
        let personality = charData.personality;
        if (!personality && chat) personality = chat.prompt; 
        if (!personality) personality = "无特殊设定";
        
        console.log("生成邮件 Prompt 参数:", { charName, personality });

      //2. 获取已有邮件标题（用于去重）

const existingTitles = (charData.emails || [])
    .map(e => e.subject)
    .slice(-20) // 只取最近20封的标题
    .join('\n- ');

// --- 3. 构建 工作邮箱提示词 ---
const prompt = `
你现在是【${charName}】所在世界的"真实邮箱后台"。
请根据该角色的【人设】、【职业】和【生活背景】，生成 7-10 封**全新的**未读邮件。
【重要：去重规则】
下面是 TA 最近收到的邮件标题，**你生成的邮件标题必须与这些完全不同**：
${existingTitles ? '- ' + existingTitles : '（暂无历史邮件）'}

**禁止生成：**
1. 标题相似的邮件（如"报销单又填错了"和"报销单填错了"）
2. 同一发件人的重复邮件（除非是合理的后续邮件，如"Re: 上次那个事"）
3. 同类型的垃圾邮件（如已经有"重金求子"就不要再来"富婆求子"）
**生成策略：**
- 优先生成角色当前可能遇到的**时效性事件**（如账单、快递、会议通知）
- 混入一些**意外事件**（如中奖、被投诉、旧友联系）
- 垃圾邮件要**脑洞大开**，每次都不一样

【角色人设 (核心)】
${personality}

【生成原则：拒绝AI味，要"活人味"！】
1. **标题要真实**：可以使用 "Re:", "Fwd:", "【紧急】", "自动回复:", "退信:", "？？？", "救命" 等前缀。
2. **发件人要多样**：不要总是"老板"、"朋友"，可以是具体的"财务部-王姐"、"顺丰快递"、"拼多多"、"你妈"、"隔壁老王"。
3. **内容要具体且有画面感**：不要写"请完成工作"，要写"那个PPT的字体再改大点，老板说看不清"。
4. **正文要完整**：content 字段是邮件的完整正文，不是摘要！要写成真实邮件的样子：
   - 工作邮件：要有称呼、具体要求、截止时间等，如"小王你好，上次那个方案PPT的字体再改大点，老板说坐后排看不清。另外第3页的数据图表也调整一下，明天下午2点前发我，谢谢。"
   - 社交邮件：要有聊天的语气，如"在吗？急事！我这个月房租还差500，能不能先借我一下？下周发工资就还你，真的急用！拜托了兄弟🙏"
   - 垃圾邮件：要有诱导性的完整话术，如"恭喜您！您的手机号被抽中为本期幸运用户，可0元领取iPhone 15 Pro Max一部！请在24小时内点击链接完成认证，逾期作废。客服电话：xxx"
   - 系统邮件：要有完整的通知内容，如"尊敬的用户，您的信用卡账单已出，本期应还金额12,450.00元，最低还款1,245.00元。请在本月25日前完成还款，逾期将影响征信。"

【邮件类型分布 - 必须混合且有创意】
1. 💼 **工作/正事 (Work)** - 占 20-30%
   - 职场推锅、甲方无理要求、报销单退回、面试通知、项目延期
   - 学生：催作业、教务处通知、选课失败、论文查重不过
   - 特殊职业：悬赏令、任务变更、装备损坏赔偿
2. 🤝 **社交/生活 (Social)** - 占 20-30%
   - 八卦、借钱、约饭、家里的唠叨、前任发来的消息
   - 语气要随意，可以有错别字、网络用语、emoji堆叠
   - 例如："在吗？借我200块急用！！！"、"你妈喊你回家吃饭"
3. 🗑️ **垃圾/广告 (Spam)** - 占 20-30%
   - **必须离谱且好笑**：
     * 诈骗类："秦始皇打钱"、"FBI通缉令"、"你的快递在海关被扣"
     * 玄学类："修仙速成班"、"转运符特价"、"前世今生测算"
     * 成人向："重金求子"、"脱发困扰"、"增高秘方"
     * 营销类："拼多多砍一刀"、"0元领手机"、"澳门博彩"
   - 或者是视频网站会员到期、游戏充值返利
4. ⚠️ **系统/账单 (System)** - 占 10-20%
   - 信用卡逾期警告、快递滞留、验证码、密码修改提示
   - 水电费催缴、话费欠费停机、社保公积金通知
5. 🎭 **戏剧性/意外 (Drama)** - 占 10-20% ⭐ 新增
   - **制造冲突和悬念**：
     * "你被投诉了"、"有人在背后说你坏话"
     * "你中奖了（但可能是诈骗）"
     * "你的账号在异地登录"、"有人盗用你的照片"
     * "旧情人发来的邮件"、"多年未见的同学找你借钱"
   - 这类邮件要让角色产生强烈情绪反应
6. 🎮 **娱乐/兴趣 (Entertainment)** - 占 5-10% ⭐ 新增
   - 游戏更新通知、漫展门票、演唱会抢票失败
   - B站UP主更新提醒、小说网站催更、追的剧完结了
   - Steam 愿望单打折、Switch 游戏发售
7. 🏥 **生活琐事 (Daily)** - 占 5-10% ⭐ 新增
   - 体检报告出来了、牙医预约提醒、健身房会员到期
   - 外卖超时赔付、网购退款到账、快递代收点催取
   - 宠物医院疫苗提醒、理发店会员充值
8. 🌈 **荒诞/无厘头 (Absurd)** - 占 5-10% ⭐ 新增
   - **完全不合常理但很好笑**：
     * "你的外卖被外星人劫持了"
     * "恭喜你成为第100万个访客（1999年的网页）"
     * "你的影子在eBay上被拍卖"
     * "时间管理局：你透支了3小时寿命"
     * "平行世界的你发来求救信号"
【关键：角色评语 (Comment)】
- 这是 ${charName} 看到邮件时的**第一反应 (内心OS)**。
- **必须极其贴合人设**！
- 如果 TA 很高冷，就回"..."、"无聊"、"关我屁事"。
- 如果 TA 很暴躁，就回"滚"、"想死吗"、"烦死了"。
- 如果 TA 很缺钱，看到账单要崩溃："完了完了完了"。
- 如果 TA 很中二，可能会说："哼，凡人的把戏"。
- **评语要口语化，不要书面语，可以用语气词、emoji、网络梗。**
【输出格式】
严格只输出 JSON 数组，不要有任何解释。
字段：sender, subject, content (正文内容，50-300字，要写完整的邮件正文，不是摘要！), type (work/social/spam/system/drama/entertainment/daily/absurd), time (如"刚刚","凌晨3点","3天前"), comment
【创意示例（仅供参考，不要照抄）】
[
  {"sender":"HR-张姐","subject":"Re: 你的年假还有3天没用","content":"12月31日前不用就作废了哦~","type":"work","time":"上午10点","comment":"又想骗我加班。"},
  {"sender":"你妈","subject":"（无主题）","content":"晚上早点回来，给你炖了汤。","type":"social","time":"刚刚","comment":"完了，肯定又要催婚。"},
  {"sender":"时间管理局","subject":"⚠️ 警告：您透支了2小时寿命","content":"请立即充值或接受惩罚...","type":"absurd","time":"凌晨3点","comment":"？？？哪来的神经病"},
  {"sender":"Steam","subject":"🎮 您的愿望单游戏打折了","content":"《艾尔登法环》史低价仅需...","type":"entertainment","time":"昨天","comment":"钱包：不要过来啊啊啊"},
  {"sender":"未知号码","subject":"你被人举报了","content":"有人匿名举报你在公司摸鱼...","type":"drama","time":"5分钟前","comment":"谁？站出来，我保证不打死你。"},
  {"sender":"顺丰快递","subject":"您的快递已到代收点3天","content":"再不取我们要退回了哦~","type":"daily","time":"今天","comment":"草，忘了。"},
  {"sender":"拼多多","subject":"好友邀你砍一刀💰","content":"就差0.01元了！帮帮忙~","type":"spam","time":"2小时前","comment":"滚。"},
  {"sender":"建设银行","subject":"【账单】本期应还12,450元","content":"最低还款1,245元，请按时...","type":"system","time":"刚刚","comment":"我上个月到底买了什么？？？"}
]
【最后提醒】
- 每次生成的邮件要**尽可能不同**，发挥想象力！
- 垃圾邮件和荒诞邮件要**脑洞大开**，越离谱越好。
- 戏剧性邮件要**制造冲突**，让角色有情绪波动。
- 评语是灵魂，必须**符合角色性格**，不要千篇一律。
`;

        // --- 3. 调用 API ---
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
                temperature: 0.85
            })
        });

        if (!response.ok) throw new Error('API请求失败');

        const resData = await response.json();
        let content = resData.choices[0].message.content.trim();
        
        // 清洗 JSON
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();
        
        let newEmails = [];
        try {
            newEmails = JSON.parse(content);
        } catch (e) {
            console.error("JSON解析失败", content);
            throw new Error("AI生成格式错误，请重试");
        }


        // 数据处理：添加生成时间戳，方便后续去重
const timestamp = Date.now();
newEmails.forEach((e, idx) => {
    e.isRead = false;
    e.generatedAt = timestamp; // 标记生成批次
    e.uniqueId = `${timestamp}_${idx}`; // 唯一ID
});
        
        // 保存到 DB
        loadFromDB('characterInfo', (latestData) => {
            const finalData = latestData || {};
            if (!finalData[currentChatId]) finalData[currentChatId] = {};
            
            const oldEmails = finalData[currentChatId].emails || [];
            finalData[currentChatId].emails = [...oldEmails, ...newEmails];
            
            saveToDB('characterInfo', finalData);
            renderEmailList(finalData[currentChatId].emails);
        });

    } catch (error) {
        console.error(error);
        alert("生成失败：" + error.message);
    } finally {
        // ★★★ 4. 恢复按钮状态 ★★★
        if (btn) {
            btn.innerHTML = originalContent;
            btn.disabled = false;
            btn.style.opacity = '1';
        }
    }
}
// 6. 打开邮件详情 (纯净版 - 只看邮件原件)
function openEmailDetail(index) {
    loadFromDB('characterInfo', (data) => {
        const allData = data || {};
        const emails = allData[currentChatId]?.emails || [];
        
        // ★ 修复：倒序显示的列表，点击时需要计算回原始索引
        // 如果你的列表是倒序渲染的，这里 index 传进来应该是 originalIndex
        // (在 renderEmailList 里我们已经计算好了 originalIndex 传进来，所以这里直接用)
        const email = emails[index];
        
        if (!email) {
            console.error("未找到邮件，索引:", index);
            return;
        }

        // 1. 标记为已读并保存
        if (!email.isRead) {
            email.isRead = true;
            emails[index] = email;
            allData[currentChatId].emails = emails;
            saveToDB('characterInfo', allData);
            
            // 刷新列表（主要是为了消掉红点）
            renderEmailList(emails); 
        }

        // 2. 填充弹窗内容
        const subjectEl = document.getElementById('emailDetailSubject');
        const senderEl = document.getElementById('emailDetailSender');
        const timeEl = document.getElementById('emailDetailTime');
        const bodyEl = document.getElementById('emailDetailBody');

        if (subjectEl) subjectEl.textContent = email.subject;
        if (senderEl) senderEl.textContent = `发件人: ${email.sender}`;
        if (timeEl) timeEl.textContent = `时间: ${email.time}`;
        
   
       // 3. 构造正文（显示完整内容，保留换行）
if (bodyEl) {
    const fullContent = email.content ? email.content.trim().replace(/\n/g, '<br>') : '（无内容）';
    bodyEl.innerHTML = `<div style="line-height: 1.8; color: #333; font-size: 15px; text-align: left; white-space: pre-wrap; word-wrap: break-word;">${fullContent}</div>`;
}
        // 3. 显示弹窗
        document.getElementById('emailDetailModal').style.display = 'flex';
    });
}
// 7. 关闭邮件详情
function closeEmailDetail(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('emailDetailModal').style.display = 'none';
}


// ===========================================
// ★★★ 自动同步邮件数量 (新增) ★★★
// ===========================================

function syncEmailCount() {
    if (!currentChatId) return;
    
    loadFromDB('characterInfo', (data) => {
        const allData = data || {};
        const charData = allData[currentChatId] || {};
        const emails = charData.emails || [];
        
        // 更新界面上的数字
        const countEl = document.getElementById('charItinerary');
        if (countEl) {
            countEl.textContent = emails.length;
        }
    });
}

// 监听角色信息页的显示，一旦显示就刷新数字
function initEmailCountObserver() {
    const targetNode = document.getElementById('characterInfoScreen');
    if (!targetNode) return;

    const config = { attributes: true, attributeFilter: ['style'] };

    const callback = function(mutationsList) {
        for(let mutation of mutationsList) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                if (targetNode.style.display !== 'none') {
                    // 页面可见了，立即同步数字
                    syncEmailCount();
                }
            }
        }
    };

    const observer = new MutationObserver(callback);
    observer.observe(targetNode, config);
}

// 启动监听
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initEmailCountObserver, 1000); // 延时启动确保DOM加载
});



// ============ 邮件分页和长按删除功能 ============

// 加载更多邮件
function loadMoreEmails() {
    loadedEmailCount += EMAIL_PAGE_SIZE;
    
    loadFromDB('characterInfo', (data) => {
        const allData = data || {};
        const charData = allData[currentChatId] || {};
        const emails = charData.emails || [];
        renderEmailList(emails);
    });
}

// 绑定长按事件到所有邮件卡片
function bindLongPressToEmails() {
    const cards = document.querySelectorAll('.email-card');
    
    cards.forEach(card => {
        const index = parseInt(card.getAttribute('data-email-index'));
        
        // 移动端
        card.addEventListener('touchstart', (e) => {
            startLongPress(e, index);
        });
        
        card.addEventListener('touchend', (e) => {
            cancelLongPress(e, index);
        });
        
        card.addEventListener('touchmove', () => {
           clearTimeout(emailLongPressTimer);
        });
        
        // PC端
        card.addEventListener('mousedown', (e) => {
            startLongPress(e, index);
        });
        
        card.addEventListener('mouseup', (e) => {
            cancelLongPress(e, index);
        });
        
        card.addEventListener('mouseleave', () => {
          clearTimeout(emailLongPressTimer);
        });
    });
}

// 开始长按计时
function startLongPress(event, index) {
    emailLongPressTarget = index;  // ★ 改名
    
    emailLongPressTimer = setTimeout(() => {  // ★ 改名
        showDeleteEmailConfirm(index);
    }, 500);
}

// 取消长按（正常点击）
function cancelLongPress(event, index) {
    clearTimeout(emailLongPressTimer);  // ★ 改名
    
    if (emailLongPressTarget === index) {  // ★ 改名
        setTimeout(() => {
            openEmailDetail(index);
        }, 50);
    }
    
    emailLongPressTarget = null;  // ★ 改名
}

// 显示删除确认
function showDeleteEmailConfirm(index) {
    if (navigator.vibrate) {
        navigator.vibrate(50);
    }
    
    const confirmed = confirm('确定要删除这封邮件吗？');
    
    if (confirmed) {
        deleteEmail(index);
    }
}

// 删除邮件
function deleteEmail(index) {
    loadFromDB('characterInfo', (data) => {
        const allData = data || {};
        const charData = allData[currentChatId] || {};
        const emails = charData.emails || [];
        
        emails.splice(index, 1);
        
        allData[currentChatId].emails = emails;
        saveToDB('characterInfo', allData);
        
        renderEmailList(emails);
        syncEmailCount();
    });
}



    // ============ 角色邮件功能end ============\

    // ==========================================
// 编辑消息功能 (请复制到 script.js 最末尾)
// ==========================================

// 定义一个变量来临时存储正在编辑的消息ID
let currentEditingMessageId = null;

// 1. 打开编辑弹窗
function openEditMessageModal() {
    // 获取当前选中的消息ID (全局变量 selectedMessageId)
    if (typeof selectedMessageId === 'undefined' || !selectedMessageId) {
        console.error("未选中消息");
        closeMessageMenu();
        return;
    }

    // 记录下来，防止关闭菜单后 selectedMessageId 丢失
    currentEditingMessageId = selectedMessageId;

    // 在所有消息中找到这一条
    const message = allMessages.find(m => m.id === currentEditingMessageId);
    
    if (!message) {
        alert("未找到消息数据");
        closeMessageMenu();
        return;
    }

    // 只能编辑文本
    if (message.type !== 'text') {
        alert("只能编辑文字消息");
        closeMessageMenu();
        return;
    }

    // 将消息内容填入输入框
    const input = document.getElementById('editMessageContent');
    if (input) {
        input.value = message.content;
    }

    // 显示弹窗
    const modal = document.getElementById('editMessageModal');
    if (modal) {
        modal.style.display = 'flex';
    }

    // 最后关闭菜单
    closeMessageMenu();
}

// 2. 关闭编辑弹窗
function closeEditMessageModal(event) {
    if (event) event.stopPropagation();
    const modal = document.getElementById('editMessageModal');
    if (modal) {
        modal.style.display = 'none';
    }
    currentEditingMessageId = null; // 清理临时ID
}

// 3. 保存编辑 (这就是报错找不到的函数)
function saveEditedMessage() {
    const input = document.getElementById('editMessageContent');
    const newText = input.value.trim();

    if (!newText) {
        alert("消息内容不能为空");
        return;
    }

    if (!currentEditingMessageId) {
        alert("编辑出错：丢失消息ID");
        closeEditMessageModal();
        return;
    }

    // 找到内存中的那条消息
    const message = allMessages.find(m => m.id === currentEditingMessageId);
    
    if (message) {
        // A. 更新内存数据
        message.content = newText;
        
        // B. 保存到数据库 (调用你原有的函数)
        if (typeof saveMessages === 'function') {
            saveMessages(); 
        }
        
        // C. 刷新界面 (调用你原有的函数)
        if (typeof renderMessages === 'function') {
            renderMessages();
        }
    }

    // 关闭弹窗
    closeEditMessageModal();
}

// ============ 🎨 AI 绘图配置逻辑 (新版) ============

// 全局变量：存储绘图配置
let currentImageApiConfig = {
    enabled: false,
    baseUrl: "https://api.openai.com/v1",
    apiKey: "",
    model: "dall-e-3",
    apiType: "openai"
};

// 1. 加载绘图配置 (页面加载时调用)
function loadImageApiConfig() {
    loadFromDB('imageApiSettings', (data) => {
        if (data) {
            currentImageApiConfig = data;
        }
        
        // 更新 UI
        const enableCheckbox = document.getElementById('imageApiEnabled');
        if (enableCheckbox) {
            enableCheckbox.checked = currentImageApiConfig.enabled;
            toggleImageConfigArea(currentImageApiConfig.enabled);
            
            document.getElementById('imageApiBaseUrl').value = currentImageApiConfig.baseUrl || '';
            document.getElementById('imageApiKey').value = currentImageApiConfig.apiKey || '';
            document.getElementById('imageApiModel').value = currentImageApiConfig.model || '';
        }
    });
}

// 2. 监听开关变化
document.addEventListener('DOMContentLoaded', () => {
    const checkbox = document.getElementById('imageApiEnabled');
    if (checkbox) {
        checkbox.addEventListener('change', (e) => {
            toggleImageConfigArea(e.target.checked);
        });
    }
    // 初始化加载
    setTimeout(loadImageApiConfig, 500);
});

// 3. 切换配置区域显隐
function toggleImageConfigArea(show) {
    const area = document.getElementById('imageApiConfigArea');
    if (area) {
        area.style.display = show ? 'block' : 'none';
    }
}


// ============ 🎨 AI 生图核心逻辑 (异步处理) ============

async function triggerAiImageGeneration(messageId, prompt) {
    console.log(`🎨 开始为消息 ${messageId} 生成图片，提示词: ${prompt}`);
    if (!prompt || prompt.trim() === '') {
        const lastUserMsg = allMessages.slice().reverse().find(m => m.role === 'user');
        if (lastUserMsg && lastUserMsg.content) {
            prompt = lastUserMsg.content;
            console.log('📝 从最新用户消息提取提示词:', prompt);
        } else {
            updateMessageToError(messageId, '❌ 绘图失败: 无法获取提示词');
            return;
        }
    }

    if (!currentImageApiConfig.apiKey) {
        updateMessageToError(messageId, '❌ 绘图失败: 未配置 API Key');
        return;
    }

    try {
        const enhancedPrompt = prompt;
        let imageUrl = null;

        // 直接调用 OpenAI 风格生图接口
        imageUrl = await generateImageWithOpenAI(enhancedPrompt);

        if (imageUrl) {
            updateMessageToImage(messageId, imageUrl);
        } else {
            updateMessageToError(messageId, '❌ 绘图失败: 无法获取图片URL');
        }

    } catch (error) {
        updateMessageToError(messageId, `❌ 网络错误: ${error.message}`);
    }
}

// OpenAI 风格生图
async function generateImageWithOpenAI(prompt) {
    let url = currentImageApiConfig.baseUrl;
    if (!url.endsWith('/images/generations')) {
        url = url + '/images/generations';
    }

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
        })
    });
    const data = await response.json();

    if (!response.ok) {
        const errMsg = data.error ? data.error.message : '未知错误';
        throw new Error(errMsg);
    }

    if (data.data && data.data.length > 0 && data.data[0].url) {
        return data.data[0].url;
    }
    
    throw new Error('API 返回数据异常');
}

// 辅助：更新为图片
function updateMessageToImage(msgId, url) {
    const msg = allMessages.find(m => m.id === msgId);
    if (msg) {
        // 👇 保存原始提示词，方便后续回溯
        const originalPrompt = msg.content;
        
        msg.type = 'image';
        msg.content = url;
        msg.role = 'assistant';
        msg.aiPrompt = originalPrompt; // 👈 新增：存储提示词
        
        saveMessages();
        renderMessages();
        scrollToBottom();
    }
}

// 辅助：更新为错误
function updateMessageToError(msgId, errorText) {
    const msg = allMessages.find(m => m.id === msgId);
    if (msg) {
        msg.type = 'system';
        msg.content = errorText;
        saveMessages();
        renderMessages();
    }
}

// 5. 获取绘图模型列表
async function getImageModels() {
    const baseUrl = document.getElementById('imageApiBaseUrl').value.trim();
    const apiKey = document.getElementById('imageApiKey').value.trim();
    const btn = event.target; // 获取点击的按钮
    
    if (!baseUrl || !apiKey) {
        alert('请先填写绘图 API 地址和 Key');
        return;
    }
    
    const originalText = btn.textContent;
    btn.textContent = '正在获取...';
    btn.disabled = true;
    try {
        // 自动补全 /models 路径
        let url = baseUrl;
        if (url.endsWith('/')) url = url.slice(0, -1);
        if (!url.endsWith('/models')) url += '/models';

        // 统一使用 OpenAI 风格鉴权
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error('HTTP ' + response.status);
        
        const data = await response.json();
        const models = Array.isArray(data.data) ? data.data : [];
        
        if (models.length === 0) {
            alert('未获取到模型数据');
            return;
        }
        
        // 渲染下拉框
        const select = document.getElementById('imageModelSelect');
        const group = document.getElementById('imageModelSelectGroup');
        
        // 尝试智能筛选（把包含 image, dall-e, flux 的排在前面）
        models.sort((a, b) => {
            const keyA = (a.id || '').toLowerCase();
            const keyB = (b.id || '').toLowerCase();
            const scoreA = (keyA.includes('image') || keyA.includes('dall') || keyA.includes('flux')) ? 1 : 0;
            const scoreB = (keyB.includes('image') || keyB.includes('dall') || keyB.includes('flux')) ? 1 : 0;
            return scoreB - scoreA;
        });
        
        select.innerHTML = '<option value="">▼ 请选择模型填入上方</option>' + 
            models.map(m => `<option value="${m.id}">${m.id}</option>`).join('');
        group.style.display = 'block';
        alert(`成功获取 ${models.length} 个模型，请在下方列表选择`);
    } catch (error) {
        console.error(error);
        alert('获取失败：' + error.message + '\n请检查地址和Key是否正确，或者直接手动填写模型名称。');
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

// ============ 🎨 AI 绘图配置逻辑END ============

// ========== 聊天显示设置功能 ==========

// 修改 triggerHeartEffect 函数，添加弹窗触发
function triggerHeartEffect() {
    const container = document.getElementById('heartParticles');
    if (!container) return;
    
    // 生成 8 个小爱心粒子
    const particles = ['💕', '💗', '💖', '💝'];
    
    for (let i = 0; i < 8; i++) {
        const particle = document.createElement('div');
        particle.className = 'heart-particle';
        particle.textContent = particles[Math.floor(Math.random() * particles.length)];
        
        const angle = (i / 8) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
        const distance = 45 + Math.random() * 25;
        const tx = Math.cos(angle) * distance;
        const ty = Math.sin(angle) * distance;
        
        particle.style.setProperty('--tx', `${tx}px`);
        particle.style.setProperty('--ty', `${ty}px`);
        particle.style.left = '50%';
        particle.style.top = '50%';
        particle.style.transform = 'translate(-50%, -50%)';
        
        container.appendChild(particle);
        
        setTimeout(() => {
            if (particle.parentNode) {
                particle.remove();
            }
        }, 1000);
    }
    
    // ★★★ 新增：延迟弹出设置弹窗 ★★★
    setTimeout(() => {
        openAvatarDisplaySettings();
    }, 500);
}

// ================= 终极替换：打开聊天显示设置弹窗 =================
function openAvatarDisplaySettings() {
    // 【原有代码完全保留】：检查当前聊天ID
    if (!currentChatId) {
        console.error('未找到当前聊天ID');
        return;
    }
    
    loadFromDB('characterInfo', (data) => {
        const allCharData = data || {};
        const charData = allCharData[currentChatId] || {};
        
        // 【原有代码完全保留】：读取基础设置
        const settings = charData.avatarDisplaySettings || {
            enabled: false,
            shape: 'circle',
            size: 40
        };
        
        // ========== 核心修复：从数据库恢复头像框记忆 ==========
        if (settings.avatarFrame) {
            avatarFrameData = settings.avatarFrame;
        } else {
            avatarFrameData = { enabled: false, frames: [], character: null, user: null };
        }
        
        // 数据恢复后，立刻重新渲染横向滑动列表
        if (typeof renderUploadedFrames === 'function') {
            renderUploadedFrames(); 
        }
        // ====================================================

        // 【原有代码完全保留】：填充基础表单
        document.getElementById('avatarDisplayEnabled').checked = settings.enabled;
        document.getElementById('avatarDisplayShape').value = settings.shape;
        document.getElementById('avatarDisplaySize').value = settings.size;
        document.getElementById('avatarSizeDisplay').textContent = settings.size + 'px';
        
        // 【原有代码完全保留】：控制形状和大小选项的显示
        const shapeGroup = document.getElementById('avatarShapeGroup');
        const sizeGroup = document.getElementById('avatarSizeGroup');
        if (shapeGroup) shapeGroup.style.display = settings.enabled ? 'block' : 'none';
        if (sizeGroup) sizeGroup.style.display = settings.enabled ? 'block' : 'none';
        
        // ========== 自检补全：恢复头像框的开关状态和面板显示 ==========
        const frameToggle = document.getElementById('avatarFrameEnabled');
        const framePanel = document.getElementById('avatarFramePanel');
        if (frameToggle) {
            frameToggle.checked = avatarFrameData.enabled;
        }
        if (framePanel) {
            framePanel.style.display = avatarFrameData.enabled ? 'block' : 'none';
        }
        // ==========================================================

        // 【原有代码完全保留】：更新预览
        updateAvatarPreview();
        
        // 【原有代码完全保留】：显示弹窗
        document.getElementById('avatarDisplayModal').style.display = 'flex';
    });
}

// 关闭弹窗
function closeAvatarDisplayModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('avatarDisplayModal').style.display = 'none';
}

// 更新预览
function updateAvatarPreview() {
    const enabled = document.getElementById('avatarDisplayEnabled').checked;
    const shape = document.getElementById('avatarDisplayShape').value;
    const size = parseInt(document.getElementById('avatarDisplaySize').value);
    
    // 更新大小显示
    document.getElementById('avatarSizeDisplay').textContent = size + 'px';
    
    // 控制形状和大小选项的显示
    const shapeGroup = document.getElementById('avatarShapeGroup');
    const sizeGroup = document.getElementById('avatarSizeGroup');
    const frameGroup = document.getElementById('avatarFrameGroup'); 
    
    if (shapeGroup) shapeGroup.style.display = enabled ? 'block' : 'none';
    if (sizeGroup) sizeGroup.style.display = enabled ? 'block' : 'none';
    if (frameGroup) frameGroup.style.display = enabled ? 'block' : 'none';
    
    // 获取预览头像元素
    const aiAvatar = document.getElementById('previewAiAvatar');
    const userAvatar = document.getElementById('previewUserAvatar');
    
    if (!aiAvatar || !userAvatar) return;

    // ★★★ 核心修复：防止裁剪，头像框放大 115% ★★★
    if (!document.getElementById('avatar-preview-css-hack')) {
        const style = document.createElement('style');
        style.id = 'avatar-preview-css-hack';
        style.innerHTML = `
            #previewAiAvatar, #previewUserAvatar { position: relative; overflow: visible !important; }
            #previewAiAvatar::after, #previewUserAvatar::after {
                content: ''; position: absolute; top: 50%; left: 50%; 
                width: 115%; height: 115%; /* 同步放大 115% */
                transform: translate(-50%, -50%);
                background-size: contain; background-repeat: no-repeat; background-position: center;
                pointer-events: none; z-index: 10;
            }
            #previewAiAvatar::after { background-image: var(--preview-char-frame, none); }
            #previewUserAvatar::after { background-image: var(--preview-user-frame, none); }
        `;
        document.head.appendChild(style);
    }
    
    // 应用设置到预览
    if (enabled) {
        // 显示头像
        aiAvatar.style.display = 'flex';
        userAvatar.style.display = 'flex';
        
        // 设置大小
        aiAvatar.style.width = size + 'px';
        aiAvatar.style.height = size + 'px';
        aiAvatar.style.fontSize = (size * 0.5) + 'px';
        
        userAvatar.style.width = size + 'px';
        userAvatar.style.height = size + 'px';
        userAvatar.style.fontSize = (size * 0.5) + 'px';
        
        // 设置形状
        if (shape === 'circle') {
            aiAvatar.classList.remove('square');
            userAvatar.classList.remove('square');
            aiAvatar.style.borderRadius = '50%';
            userAvatar.style.borderRadius = '50%';
        } else {
            aiAvatar.classList.add('square');
            userAvatar.classList.add('square');
            aiAvatar.style.borderRadius = (size * 0.2) + 'px';
            userAvatar.style.borderRadius = (size * 0.2) + 'px';
        }
        
        // ★★★ 核心逻辑：利用 CSS 变量动态切换头像框 ★★★
        let charFrameVar = 'none';
        let userFrameVar = 'none';
        
        if (typeof avatarFrameData !== 'undefined') {
            const frameToggle = document.getElementById('avatarFrameEnabled');
            const isFrameOn = frameToggle ? frameToggle.checked : (avatarFrameData.enabled !== false);
            
            if (isFrameOn) {
                if (avatarFrameData.character) charFrameVar = `url('${avatarFrameData.character}')`;
                if (avatarFrameData.user) userFrameVar = `url('${avatarFrameData.user}')`;
            }
        }
        
        aiAvatar.style.setProperty('--preview-char-frame', charFrameVar);
        userAvatar.style.setProperty('--preview-user-frame', userFrameVar);
        
        // 加载实际头像底图
        loadAvatarForPreview();
        
    } else {
        // 隐藏头像
        aiAvatar.style.display = 'none';
        userAvatar.style.display = 'none';
    }
}

// 加载实际头像到预览
function loadAvatarForPreview() {
    if (!currentChatId) return;
    
    const chat = chats.find(c => c.id === currentChatId);
    if (!chat) return;
    
    const aiAvatar = document.getElementById('previewAiAvatar');
    const userAvatar = document.getElementById('previewUserAvatar');
    
    // 角色头像
    const charAvatarUrl = chat.avatarImage || chat.avatar;
    if (charAvatarUrl && charAvatarUrl !== '👤' && (charAvatarUrl.startsWith('http') || charAvatarUrl.startsWith('data:image'))) {
        aiAvatar.style.backgroundImage = `url(${charAvatarUrl})`;
        aiAvatar.textContent = '';
    } else {
        aiAvatar.style.backgroundImage = '';
        aiAvatar.textContent = chat.avatar || '👤';
    }
    
    // 用户头像
    const userAvatarUrl = chat.myAvatar;
    if (userAvatarUrl && userAvatarUrl !== '👤' && (userAvatarUrl.startsWith('http') || userAvatarUrl.startsWith('data:image'))) {
        userAvatar.style.backgroundImage = `url(${userAvatarUrl})`;
        userAvatar.textContent = '';
    } else {
        userAvatar.style.backgroundImage = '';
        userAvatar.textContent = '👤';
    }
}

// 保存设置
function saveAvatarDisplaySettings() {
    if (!currentChatId) return;
    
    const enabled = document.getElementById('avatarDisplayEnabled').checked;
    const shape = document.getElementById('avatarDisplayShape').value;
    const size = parseInt(document.getElementById('avatarDisplaySize').value);
    
    loadFromDB('characterInfo', (data) => {
        const allCharData = data || {};
        if (!allCharData[currentChatId]) {
            allCharData[currentChatId] = {};
        }
        
        // 保存设置
        allCharData[currentChatId].avatarDisplaySettings = {
            enabled: enabled,
            shape: shape,
            size: size,
            // ========== 新增：保存头像框数据 ==========
            avatarFrame: typeof avatarFrameData !== 'undefined' ? avatarFrameData : null
            // ========================================
        };
        
        // ★★★ 新增：同步到内存，保证立即生效 ★★★
        if (!characterInfoData) characterInfoData = {};
        characterInfoData.avatarDisplaySettings = allCharData[currentChatId].avatarDisplaySettings;

        saveToDB('characterInfo', allCharData);
        window.__charInfoLoadedForChatId = currentChatId;
        
        // 关闭弹窗
        closeAvatarDisplayModal();
        
        // 如果当前在聊天详情页，立即刷新显示
        if (document.getElementById('chatDetailScreen').style.display === 'flex') {
            renderMessages();
        }
        
        console.log('✅ 聊天显示设置已保存（含头像框）');
    });
}

//========== 聊天显示设置功能end ==========//


// ========== 头像框功能 START ==========

// 全局变量：存储头像框数据
let avatarFrameData = {
    enabled: false,
    frames: [], // 存储所有上传的头像框
    character: null, // 角色使用的头像框
    user: null // 我使用的头像框
};

// 切换头像框面板显示
function toggleAvatarFramePanel() {
    const enabled = document.getElementById('avatarFrameEnabled').checked;
    const panel = document.getElementById('avatarFramePanel');
    panel.style.display = enabled ? 'block' : 'none';
    avatarFrameData.enabled = enabled;
    updateAvatarPreview();
}


// 【修改后】添加头像框：无限制触发上传
function addAvatarFrame() {
    document.getElementById('avatarFrameFileInput').click();
}

// ================= 全新添加的变量 =================
let tempSelectedCharacterFrame = null;
let tempSelectedUserFrame = null;

// ================= 替换：处理头像框上传 =================
function handleFrameUpload(input) {
    if (!input.files || !input.files[0]) return;
    
    const file = input.files[0];
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const frameData = e.target.result;
        // 把新图片推入数组
        avatarFrameData.frames.push(frameData);
        // 重新渲染左侧上传区的横向列表
        renderUploadedFrames();
        // 清空input，保证下次选同一张图也能触发onchange
        input.value = '';
    };
    
    reader.readAsDataURL(file);
}


// ================= 终极安全版：动态渲染已上传头像框的横向列表 =================
function renderUploadedFrames() {
    const listContainer = document.getElementById('uploadedFramesList');
    if (!listContainer) return;
    
    listContainer.innerHTML = '';
    
    avatarFrameData.frames.forEach((frame, index) => {
        // 1. 创建外层容器
        const item = document.createElement('div');
        item.style.cssText = 'position: relative; width: 60px; height: 60px; flex-shrink: 0; border-radius: 8px; overflow: hidden; border: 1px solid #eee;';
        
        // 2. 创建图片元素（用这种方式插入超长图片代码最安全，不会报错）
        const img = document.createElement('img');
        img.src = frame;
        img.style.cssText = 'width: 100%; height: 100%; object-fit: cover; cursor: pointer; transition: opacity 0.2s;';
        
        // 绑定悬停和点击事件
        img.onmouseover = function() { this.style.opacity = '0.8'; };
        img.onmouseout = function() { this.style.opacity = '1'; };
        img.onclick = function() {
            openFrameAssignModal(); // 点击图片打开分配弹窗
        };
        
        // 3. 创建删除按钮（小叉叉）
        const deleteBtn = document.createElement('div');
        deleteBtn.style.cssText = 'position: absolute; top: 2px; right: 2px; width: 16px; height: 16px; background: rgba(0,0,0,0.5); color: white; border-radius: 50%; font-size: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; line-height: 1; z-index: 10;';
        deleteBtn.innerText = '×';
        
        // 绑定删除事件
        deleteBtn.onclick = function(event) {
            event.stopPropagation(); // 【关键修复】阻止事件冒泡！点删除时，绝对不会误触发底下的图片点击
            removeFrame(index);
        };
        
        // 4. 把图片和按钮组装进容器，再塞到列表里
        item.appendChild(img);
        item.appendChild(deleteBtn);
        listContainer.appendChild(item);
    });
}

// ================= 替换：移除头像框 =================
function removeFrame(index) {
    const removedFrame = avatarFrameData.frames[index];
    
    // 从数组中删掉这个框
    avatarFrameData.frames.splice(index, 1);
    
    // 如果删掉的框正好是当前角色或自己正在用的，顺便清空生效状态
    if (avatarFrameData.character === removedFrame) avatarFrameData.character = null;
    if (avatarFrameData.user === removedFrame) avatarFrameData.user = null;
    
    // 重新渲染横向列表并更新聊天区预览
    renderUploadedFrames();
    updateAvatarPreview();
}

// ================= 替换：打开头像框分配弹窗 =================
function openFrameAssignModal() {
    document.getElementById('avatarFrameAssignModal').style.display = 'flex';
    renderFrameAssignLists();
}

// ================= 替换：渲染分配列表 =================
function renderFrameAssignLists() {
    const charList = document.getElementById('characterFrameList');
    const userList = document.getElementById('userFrameList');
    
    charList.innerHTML = '';
    userList.innerHTML = '';
    
    // 每次打开弹窗，先把临时变量对齐当前已保存的状态
    tempSelectedCharacterFrame = avatarFrameData.character;
    tempSelectedUserFrame = avatarFrameData.user;
    
    avatarFrameData.frames.forEach((frame) => {
        const isCharSelected = avatarFrameData.character === frame ? 'selected' : '';
        const isUserSelected = avatarFrameData.user === frame ? 'selected' : '';
        
        // 角色列表 (默认使用方圆形 shape-square)
        const charItem = document.createElement('div');
        charItem.className = `frame-option shape-square ${isCharSelected}`; 
        charItem.setAttribute('onclick', `selectFrame(this, 'character', '${frame}')`);
        charItem.innerHTML = `<img src="${frame}">`;
        charList.appendChild(charItem);
        
        // 用户列表
        const userItem = document.createElement('div');
        userItem.className = `frame-option shape-square ${isUserSelected}`;
        userItem.setAttribute('onclick', `selectFrame(this, 'user', '${frame}')`);
        userItem.innerHTML = `<img src="${frame}">`;
        userList.appendChild(userItem);
    });
}

// ================= 全新添加：点击出现“√”的逻辑 =================
function selectFrame(element, target, frameUrl) {
    const listId = target === 'character' ? 'characterFrameList' : 'userFrameList';
    const listContainer = document.getElementById(listId);
    
    const allOptions = listContainer.querySelectorAll('.frame-option');
    allOptions.forEach(opt => opt.classList.remove('selected'));
    
    element.classList.add('selected');
    
    if (target === 'character') {
        tempSelectedCharacterFrame = frameUrl;
    } else {
        tempSelectedUserFrame = frameUrl;
    }
}

// ================= 替换：保存头像框分配 =================
function saveFrameAssignment() {
    avatarFrameData.character = tempSelectedCharacterFrame;
    avatarFrameData.user = tempSelectedUserFrame;
    
    closeFrameAssignModal();
    updateAvatarPreview();
}

// 关闭分配弹窗
function closeFrameAssignModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('avatarFrameAssignModal').style.display = 'none';
}



           
// ========== 头像框功能 END ==========

// ============ 时空邮局 - 完整逻辑 ============

// 时空邮局状态
let spLetters = [];        // 当前5封信
let spCurrentIndex = 0;    // 当前显示第几封
let spReplyTarget = null;  // 当前回信目标
let spWriteMode = '';      // 'send'=主动寄信, 'reply'=回复别人


// 从DB加载已有信件
function loadSpLettersFromDB() {
    loadFromDB('spacepost', (data) => {
        if (data && data.letters && data.letters.length > 0) {
            spLetters = data.letters;
            spCurrentIndex = data.currentIndex || 0;
            displayCurrentLetter();
        }
    });
}

// 关闭时空邮局
function closeSpacePost() {
    document.getElementById('spacePostScreen').style.display = 'none';
    document.getElementById('mainScreen').style.display = 'flex';
}

// 按钮总入口
function handleSpacePostAction(type) {
    if (type === 'receive') openSpLetter();
    else if (type === 'send') openSpSend();
    else if (type === 'next') showNextLetter();
    else if (type === 'mymail') openSpMymail();
}

// ====== 生成信件 ======
async function generateSpLetters() {
    if (!currentApiConfig.baseUrl || !currentApiConfig.apiKey) {
        alert('请先在API设置中配置接口');
        return;
    }

    const icon = document.querySelector('.sp-icon');
    const card = document.querySelector('.sp-glass-card');
    if (icon) icon.classList.add('loading');
    if (card) card.classList.add('loading');
    document.getElementById('spContent').textContent = '星海中搜寻信件...';

    try {
        // 获取单聊角色
        const singleChats = chats.filter(c => c.type === 'single');
        let charInfoList = [];

        if (singleChats.length > 0) {
                  // 统一取材：人设 + 最近100条聊天 + 全部长期记忆
        const sourceData = await getPhoneCheckPromptSources(phoneCheckCurrentCharId);
        const personality = sourceData.personalityText || '';
        const recentChatText = sourceData.recentChatText || '（无最近聊天记录）';
        const memoryText = sourceData.memoryText || '（无长期记忆）';

            charInfoList = singleChats.map(c => ({
                name: c.name,
                personality: (charData[c.id] && charData[c.id].personality) || '未知性格'
            }));
        }

        // 随机选1-2个角色
        let selectedChars = [];
        if (charInfoList.length > 0) {
            const count = Math.min(charInfoList.length, Math.random() > 0.5 ? 2 : 1);
            const shuffled = [...charInfoList].sort(() => Math.random() - 0.5);
            selectedChars = shuffled.slice(0, count);
        }

        // 构建角色信息
        let charPrompt = '';
        if (selectedChars.length > 0) {
            charPrompt = selectedChars.map(c =>
                `角色名：${c.name}，人设：${c.personality}`
            ).join('\n');
        }

        const strangerCount = 5 - selectedChars.length;

const prompt = `你是一个"时空邮局"的信件生成器。这是一个可以跨越时空、维度、甚至存在形式收发信件的神奇邮局。信件可能来自过去、未来、平行世界、虚构的档案馆、濒临消失的文明、甚至非人类的存在。请生成5封漂流信件，以JSON数组格式返回。

要求：
1. 其中${selectedChars.length}封来自以下角色（必须完全贴合他们的人设、性格、经历和说话方式来写，信件内容要体现角色的独特视角）：
${charPrompt || '（无角色，全部生成陌生人/特殊寄件者信件）'}

2. 其余${strangerCount}封来自陌生人或特殊寄件者，可以是：
- 普通人（中国人或外国人，外国人名字用原文但信件内容用中文）
- 特殊存在（某个即将消失的事物、某段历史、某个概念的拟人化）

3. 每封信的寄出时间随机，格式用诗意表达，如"2087年的春天""公元前221年的咸阳""1998年深秋的某个雨夜""宇宙热寂前的最后一个纪元"

4. 【核心】信件主题必须丰富多样，5封信必须来自不同的主题大类，从以下方向中随机选取：

【经典情感类】
- 给重要时刻的自己：高考前夜、入职第一天、结婚那天、离开家乡的早晨
- 没来得及说出口的话：对暗恋的人、对已故的亲人、对失联的朋友
- 未说出口的道歉：对父母、对朋友、对伤害过的人
- 对失去的思念：逝去的亲人、走散的玩伴、离世的宠物
- 平行世界的假设：如果当时做了另一个选择、如果没有放弃那个梦想
- 未来的自己：对十年后自己的期许、从未来回望现在的感慨
- 被时间冲淡的小事：某个平凡但幸福的下午、一顿普通的晚饭
- 放弃的梦想：曾经想成为的人、没有走完的路
- 情绪的倾诉：迷茫、焦虑、孤独、释然、突然的幸福感
- 对陌生人的善意：希望捡到这封信的人今天开心

【文明遗留记录】
- 某个即将消失的语言/方言的最后一位使用者写的信
- 某个被拆除的老建筑"写"给曾住在里面的人
- 某个失传手艺的最后传承人留给后世的话
- 某个消失的小镇/村庄留下的最后记录
- 某个濒危物种的拟人化独白

【档案馆来信】
- 时间档案馆管理员写的信：关于某个被遗忘的历史瞬间
- 记忆档案馆：某个被所有人遗忘的人的档案记录
- 未来档案馆：2200年的历史学家给2024年普通人的提问
- 平行世界档案馆：记录着"你没有做出的那个选择"之后的人生
- 遗失物档案馆：某个丢失物品的视角

【一份味道的信】
- 某道菜写给做它的人（外婆的红烧肉、妈妈的西红柿炒蛋）
- 某个童年零食写给长大后的你
- 某家关门小店的招牌菜写给老顾客
- 故乡的味道写给漂泊在外的游子
- 某个再也吃不到的味道的告别信

【存在倒计时】
- 某颗即将被拆除的老树写给在它树下乘凉过的人
- 某个即将退役的老物件（收音机、磁带、旧手机）的告别
- 某个即将被遗忘的传统节日/习俗的独白
- 某家经营了几十年即将关门的小店的最后一封信
- 某个人生命最后时刻写给世界的信（温暖释然的基调）

【人生串行小说】
- 人生第一章的自己写给最后一章的自己
- 某个人生转折点写给另一个转折点
- "如果人生是小说，这一章我想重写"
- 某个人生配角写给主角的信（比如：你初中同桌写给你）
- 未来的自己剧透了一点点后面的剧情

【命运交叉机器】
- 两个素不相识的人，因为某个巧合产生交集，其中一人写的信
- 某个蝴蝶效应的起点写给终点（"因为我那天迟到了五分钟..."）
- 命运交叉点上的独白：那个改变一切的瞬间
- 给那个我只见过一面却改变了我的陌生人

【薛定谔的答案】
- 一封来自"你没有打开的那个盒子里"的信
- 一封关于"那个你永远不会知道答案的问题"的思考
- 一封来自"你做出选择之前的那个瞬间"的信
- 关于那些永远停留在"如果"里的可能性

【给地球/宇宙的明信片】
- 某个外星文明发现地球遗迹后写给人类的信
- 地球写给曾经生活在上面的人类
- 宇宙某个角落的孤独存在写给地球
- 某个宇航员在太空中写给地球上某个人的信
- 来自2xxx年的地球给2024年地球的回信

【历史的私语】
- 某个历史事件中的普通人视角（不是名人，是那个时代的普通人）
- 历史课本里一笔带过的某个瞬间，当事人的真实感受
- 某个被历史遗忘的小人物写给后世的信
- 如果历史上某个关键时刻有人写了一封信

【天幕盘点视角】
- 未来的人类在"盘点历史名场面"时，给当事人的弹幕/私信
- 某个被后世反复讨论的历史人物写给"那些评论我的后人"
- 天幕管理员写给被迫观看自己人生的古人的道歉信
- 某个在天幕上被当作反面教材的人的辩解

【物品的一生】
- 一本被转卖多次的旧书写给曾经的主人
- 一张老照片写给照片里的人
- 一封从未寄出的信写给本该收到它的人
- 某个传家宝写给家族的每一代人

5. 每封信内容150-500字，要有真情实感，像真人/真实存在写的信，有细节、有温度、有画面感
6. 信件内容格式要求：每段开头空两格（用两个全角空格），段落之间用换行符\\n分隔
7. 语气自然真实，根据寄件者身份调整语气：普通人口语化，特殊存在可以略带诗意但不要过度文艺
8. 每封信的情绪基调不同：有快乐的、悲伤的、温暖的、遗憾的、释然的、期待的、神秘的、幽默的
9. 严禁使用任何HTML标签，只用纯文本

10. 严格返回JSON数组格式，不要任何多余文字：
[
  {
    "sender": "寄件人名字或特殊身份",
    "time": "诗意的时间描述",
    "preview": "内容前20字",
    "content": "完整信件内容",
    "isCharacter": true或false,
    "theme": "主题类型（如：文明遗留/档案馆/味道的信等）"
  }
]`;

        const requestUrl = currentApiConfig.baseUrl.endsWith('/')
            ? currentApiConfig.baseUrl + 'chat/completions'
            : currentApiConfig.baseUrl + '/chat/completions';

  console.log('📮 时空邮局请求地址:', requestUrl, '模型:', currentApiConfig.defaultModel);


        const response = await fetch(requestUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentApiConfig.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: currentApiConfig.defaultModel || 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
                  max_tokens: 6000
            })
        });

              const rawText = await response.text();
        console.log('时空邮局API原始返回:', rawText.substring(0, 500));
        
        let data;
        try {
            data = JSON.parse(rawText);
        } catch (e) {
            throw new Error('API返回非JSON: ' + rawText.substring(0, 200));
        }
        
        if (!response.ok) {
            const errMsg = (data && data.error && data.error.message) ? data.error.message : rawText.substring(0, 200);
            throw new Error('API错误: ' + errMsg);
        }
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error('API返回结构异常: ' + JSON.stringify(data).substring(0, 200));
        }

               let raw = data.choices[0].message.content.trim();
        console.log('时空邮局AI回复:', raw.substring(0, 500));
        
        // 提取JSON（多种方式尝试）
        let parsed = null;
        
        // 方式1：直接匹配 [ ... ]
        const jsonMatch = raw.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            try {
                parsed = JSON.parse(jsonMatch[0]);
            } catch (e) {
                console.warn('方式1解析失败，尝试修复...');
                // 尝试修复常见问题：换行符在JSON字符串内
                let fixed = jsonMatch[0]
                    .replace(/\n/g, '\\n')
                    .replace(/\r/g, '')
                    .replace(/\t/g, '\\t')
                    .replace(/,\s*]/g, ']')  // 去掉末尾多余逗号
                    .replace(/,\s*}/g, '}');
                try {
                    parsed = JSON.parse(fixed);
                } catch (e2) {
                    console.warn('修复后仍失败:', e2);
                }
            }
        }
        
        // 方式2：匹配 ```json ... ```
        if (!parsed) {
            const codeMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (codeMatch) {
                try {
                    parsed = JSON.parse(codeMatch[1].trim());
                } catch (e) {
                    let fixed = codeMatch[1].trim()
                        .replace(/\n/g, '\\n')
                        .replace(/\r/g, '')
                        .replace(/,\s*]/g, ']')
                        .replace(/,\s*}/g, '}');
                    try { parsed = JSON.parse(fixed); } catch (e2) {}
                }
            }
        }
        
        // 方式3：暴力提取每个 { } 对象
        if (!parsed) {
            console.warn('尝试暴力提取JSON对象...');
            const objMatches = raw.match(/\{[\s\S]*?\}/g);
            if (objMatches && objMatches.length > 0) {
                const items = [];
                for (const m of objMatches) {
                    try {
                        let fixed = m.replace(/\n/g, '\\n').replace(/\r/g, '');
                        const obj = JSON.parse(fixed);
                        if (obj.sender && obj.content) items.push(obj);
                    } catch (e) {}
                }
                if (items.length > 0) parsed = items;
            }
        }
        
          if (!parsed || !Array.isArray(parsed) || parsed.length === 0) {
            throw new Error('无法解析信件数据，请重试');
        }

        // 清理HTML标签
        parsed.forEach(letter => {
            if (letter.content) {
                letter.content = letter.content.replace(/<[^>]+>/g, '');
            }
            if (letter.preview) {
                letter.preview = letter.preview.replace(/<[^>]+>/g, '');
            }
        });

        spLetters = parsed;

        spCurrentIndex = 0;
        // 保存到DB（保留已有回信记录）
        loadFromDB('spacepost', (existing) => {
            const saveData = existing || {};
            saveData.id = 1;
            saveData.letters = spLetters;
            saveData.currentIndex = 0;
            // 保留已有的回信记录
            if (!saveData.mailRecords) saveData.mailRecords = [];
            saveToDB('spacepost', saveData, () => {
                console.log('✅ 时空邮局信件已保存, 回信记录保留:', saveData.mailRecords.length);
            });
        });
        displayCurrentLetter();

    } catch (e) {
        console.error('时空邮局生成失败:', e);
        document.getElementById('spContent').textContent = '信件迷失在星海中了...请再试一次';
    } finally {
        if (icon) icon.classList.remove('loading');
        if (card) card.classList.remove('loading');
    }
}

// 显示当前信件预览
function displayCurrentLetter() {
    if (!spLetters.length) return;
    const letter = spLetters[spCurrentIndex];
    document.getElementById('spSenderName').textContent = letter.sender || '未知旅人';
    document.getElementById('spSendTime').textContent = letter.time || '--';
    document.getElementById('spContent').textContent = (letter.preview || letter.content.substring(0, 20)) + '...';
}

// 下一封
function showNextLetter() {
    if (!spLetters.length) {
        alert('请先点击瓶子获取信件');
        return;
    }
       spCurrentIndex++;
    if (spCurrentIndex >= spLetters.length) {
        spCurrentIndex = 0;
    }
      // 保存当前索引（保留已有回信记录）
    loadFromDB('spacepost', (existing) => {
        const saveData = existing || {};
        saveData.id = 1;
        saveData.letters = spLetters;
        saveData.currentIndex = spCurrentIndex;
        if (!saveData.mailRecords) saveData.mailRecords = [];
        saveToDB('spacepost', saveData);
    });
    displayCurrentLetter();
}

// ====== 接收（查看全文）======
function openSpLetter() {
    if (!spLetters.length) {
        alert('请先点击瓶子获取信件');
        return;
    }
    const letter = spLetters[spCurrentIndex];
    document.getElementById('spLetterFrom').textContent = '来自 ' + (letter.sender || '未知旅人');
    document.getElementById('spLetterTime').textContent = letter.time || '';
    document.getElementById('spLetterBody').textContent = letter.content || '';
    document.getElementById('spLetterOverlay').classList.add('active');
}

function closeSpLetter() {
    document.getElementById('spLetterOverlay').classList.remove('active');
}

// ====== 回信（回复当前信件）======
function openSpReply() {
    closeSpLetter();
    const letter = spLetters[spCurrentIndex];
    spReplyTarget = letter;
    spWriteMode = 'reply';
    document.getElementById('spWriteTitle').textContent = '回信给 ' + (letter.sender || '未知旅人');
    document.getElementById('spWriteInput').value = '';
    document.getElementById('spWriteOverlay').classList.add('active');
}

// ====== 寄出（主动写信）======
function openSpSend() {
    spReplyTarget = null;
    spWriteMode = 'send';
    document.getElementById('spWriteTitle').textContent = '寄一封信到星海';
    document.getElementById('spWriteInput').value = '';
    document.getElementById('spWriteOverlay').classList.add('active');
}

function closeSpWrite() {
    document.getElementById('spWriteOverlay').classList.remove('active');
}

// 确认寄出/回信
function confirmSpWrite() {
    const content = document.getElementById('spWriteInput').value.trim();
    if (!content) {
        alert('请写点什么再寄出吧');
        return;
    }

    const now = new Date();
    const timeStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;

    const mailRecord = {
        id: Date.now(),
        type: spWriteMode, // 'send' 或 'reply'
        myContent: content,
        targetSender: spReplyTarget ? spReplyTarget.sender : null,
        targetContent: spReplyTarget ? spReplyTarget.content : null,
        sendTime: timeStr,
        sendTimestamp: now.getTime(),
        replyContent: null,     // 对方回信内容
        replyTime: null,        // 对方回信时间
        replyGenerated: false   // 是否已生成回信
    };

     // 保存到DB
    loadFromDB('spacepost', (data) => {
        const existing = data || {};
        existing.id = 1;
        // 保留已有的信件数据
        if (!existing.letters) existing.letters = spLetters;
        if (existing.currentIndex === undefined) existing.currentIndex = spCurrentIndex;
        // 追加回信记录
        const records = existing.mailRecords || [];
        records.push(mailRecord);
        existing.mailRecords = records;
        saveToDB('spacepost', existing, () => {
            console.log('✅ 信件已保存, 当前记录数:', records.length);
        });
    });

    closeSpWrite();
    alert('信件已投入星海，等待回音...');
}

// ====== 我的回信 ======
function openSpMymail() {
    renderSpMymailList();
    document.getElementById('spMymailOverlay').classList.add('active');
}

function closeSpMymail() {
    document.getElementById('spMymailOverlay').classList.remove('active');
}

// 渲染回信列表
function renderSpMymailList() {
      loadFromDB('spacepost', (data) => {
        const records = (data && data.mailRecords) ? data.mailRecords : [];
        const listEl = document.getElementById('spMymailList');

        if (!records.length) {
            listEl.innerHTML = '<div class="sp-mymail-empty">还没有信件记录...</div>';
            return;
        }

        // 按时间倒序
        const sorted = [...records].sort((a, b) => b.id - a.id);

        listEl.innerHTML = sorted.map(r => {
            let tagHtml = '';
            let senderText = '';
            let previewText = '';

            if (r.type === 'send') {
                senderText = '我寄出的信';
                previewText = r.myContent.substring(0, 30) + '...';
                tagHtml = `<span class="sp-mail-item-tag sp-mail-tag-sent">寄出</span>`;
            } else if (r.type === 'reply') {
                senderText = '回信给 ' + (r.targetSender || '未知');
                previewText = r.myContent.substring(0, 30) + '...';
                tagHtml = `<span class="sp-mail-item-tag sp-mail-tag-reply">回信</span>`;
            }

            // 如果有对方回信
            if (r.replyGenerated && r.replyContent) {
                tagHtml += `<span class="sp-mail-item-tag sp-mail-tag-received">收到回信</span>`;
            } else if (!r.replyGenerated) {
                tagHtml += `<span class="sp-mail-item-tag sp-mail-tag-waiting">漂流中...</span>`;
            }

            return `
                <div class="sp-mail-item" onclick="openSpMymailDetail(${r.id})">
                    <div class="sp-mail-item-header">
                        <div class="sp-mail-item-sender">${senderText}</div>
                        <div class="sp-mail-item-time">${r.sendTime || ''}</div>
                    </div>
                    <div class="sp-mail-item-preview">${previewText}</div>
                    <div>${tagHtml}</div>
                </div>
            `;
        }).join('');
    });
}

// 查看回信详情
function openSpMymailDetail(recordId) {
   loadFromDB('spacepost', (data) => {
        const records = (data && data.mailRecords) ? data.mailRecords : [];
        const record = records.find(r => r.id === recordId);
        if (!record) return;

        let fromText = '';
        let timeText = '';
        let bodyText = '';

        if (record.replyGenerated && record.replyContent) {
            // 显示对方回信
            if (record.type === 'send') {
                fromText = '来自星海的回信';
            } else {
                fromText = '来自 ' + (record.targetSender || '未知旅人') + ' 的回信';
            }
            timeText = record.replyTime || '';
            bodyText = '【我写的】\n' + record.myContent + '\n\n───────────\n\n【对方回信】\n' + record.replyContent;
        } else {
            // 还没收到回信，显示自己写的
            fromText = record.type === 'send' ? '我寄出的信' : '我回给 ' + (record.targetSender || '未知');
            timeText = record.sendTime || '';
            bodyText = record.myContent + '\n\n（信件正在星海中漂流...）';
                    }

        document.getElementById('spMymailDetailFrom').textContent = fromText;
        document.getElementById('spMymailDetailTime').textContent = timeText;
        document.getElementById('spMymailDetailBody').textContent = bodyText;
        document.getElementById('spMymailDetailOverlay').classList.add('active');
    });
}

function closeSpMymailDetail() {
    document.getElementById('spMymailDetailOverlay').classList.remove('active');
}

// ====== 回信延迟生成机制 ======
function checkAndGenerateReplies(callback) {
    loadFromDB('spacepost', async (data) => {
        const existing = data || {};
        const records = existing.mailRecords || [];
        const now = Date.now();
        let hasUpdate = false;

        console.log('📬 检查回信, 记录数:', records.length);

        for (let i = 0; i < records.length; i++) {
            const r = records[i];
            if (r.replyGenerated) continue;
            if (!r.sendTimestamp) continue;

            // 测试用：10秒后生成回信
            if (now - r.sendTimestamp < 10000) {
                console.log('⏳ 还没到时间:', r.id);
                continue;
            }

            console.log('✉️ 开始生成回信:', r.id);

            // 生成回信
            try {
                const replyContent = await generateSpReplyFromAI(r);
                if (replyContent) {
                    const nowDate = new Date(now);
                    records[i].replyContent = replyContent;
                    records[i].replyTime = `${nowDate.getFullYear()}年${nowDate.getMonth() + 1}月${nowDate.getDate()}日`;
                    records[i].replyGenerated = true;
                    hasUpdate = true;
                    console.log('✅ 回信生成成功:', r.id);
                }
            } catch (e) {
                console.error('❌ 生成回信失败:', e);
            }
        }

        if (hasUpdate) {
            existing.mailRecords = records;
            existing.id = 1;
            saveToDB('spacepost', existing, () => {
                console.log('💾 回信已保存');
                if (callback) callback();
            });
        } else {
            console.log('📭 无需生成新回信');
            if (callback) callback();
        }
    });
}

// AI生成回信
async function generateSpReplyFromAI(record) {
    if (!currentApiConfig.baseUrl || !currentApiConfig.apiKey) return null;

    let prompt = '';

//时空邮局回信提示词

      if (record.type === 'send') {
        prompt = `你是一个在时空邮局里捡到漂流瓶的人。你可以是任何身份：学生、上班族、退休老人、旅行者、异国友人、深夜失眠的人、刚失恋的人、即将当父母的人……请你以一个真实的人的身份，给这封信写一封回信。

收到的信件内容：
${record.myContent}

要求：
1. 先给自己设定一个具体身份和处境（不用明说，但要从字里行间体现出来）
2. 回信要像真人聊天一样自然，可以：
   - 分享自己类似的经历来回应对方
   - 对信中触动你的某句话做出真实反应
   - 说一些安慰的话，但不要鸡汤，要像朋友说的那种大白话
   - 可以开个小玩笑缓解气氛
   - 可以吐槽、可以感慨、可以认真、可以俏皮
3. 150-250字，语气口语化，有细节有温度
4. 每段开头空两格，段落之间换行，排版美观易读
5. 不要用"亲爱的陌生人"这种套路开头，自然一点，像真的在回一封信
6. 只返回回信内容，不要任何格式标记`;
    } else if (record.type === 'reply') {
        prompt = `你是"${record.targetSender || '未知旅人'}"。之前你往时空邮局寄了一封信，没想到真的收到了回信。现在你要再写一封回信。

你之前寄出的信：
${record.targetContent || '（内容未知）'}

对方给你的回信：
${record.myContent}

要求：
1. 你就是${record.targetSender || '那个寄信人'}，保持和原信一致的性格和语气
2. 对收到回信这件事要有真实反应（惊喜、感动、意外、开心等）
3. 回信要自然真实，像朋友之间的对话：
   - 可以回应对方说的某个细节
   - 可以继续聊之前信里没说完的事
   - 可以问对方一些好奇的问题
   - 可以分享一些新的近况或感悟
   - 语气可以更放松，毕竟已经不是第一次通信了
4. 150-250字，口语化，有人情味
5. 每段开头空两格，段落之间换行，排版美观易读
6. 不要太正式，就像给笔友回信那种感觉
7. 只返回回信内容，不要任何格式标记`;
    }

    const requestUrl = currentApiConfig.baseUrl.endsWith('/')
        ? currentApiConfig.baseUrl + 'chat/completions'
        : currentApiConfig.baseUrl + '/chat/completions';

    const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${currentApiConfig.apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: currentApiConfig.defaultModel || 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.85
        })
    });

    const data = await response.json();
    if (!data.choices || !data.choices[0]) return null;

    return data.choices[0].message.content.trim();
}

// ====== 瓶子点击事件 ======
document.addEventListener('DOMContentLoaded', () => {
    const spIcon = document.querySelector('.sp-icon');
    if (spIcon) {
        spIcon.style.cursor = 'pointer';
        spIcon.addEventListener('click', () => {
            generateSpLetters();
        });
    }
});

// ====== 后台定时检查回信（每5分钟一次）======
let spReplyTimer = null;

function startSpReplyChecker() {
    // 页面加载后延迟10秒先检查一次
    setTimeout(() => {
        checkAndGenerateReplies(() => {
            console.log('📬 首次后台回信检查完成');
        });
    }, 10000);

    // 之后每5分钟检查一次
    spReplyTimer = setInterval(() => {
        checkAndGenerateReplies(() => {
            console.log('📬 定时回信检查完成');
        });
    }, 10 * 60 * 1000);
}

// 页面加载时启动定时器
document.addEventListener('DOMContentLoaded', () => {
    startSpReplyChecker();
});
// ============ 时空邮局结束 ============




//查手机功能开始//

// ============ 查手机功能 ============

let phoneCheckCurrentCharId = null;
let phoneCheckDataCache = {}; // 缓存所有角色的手机数据

// 打开角色选择弹窗
function openPhoneCheckSelectModal() {
    const modal = document.getElementById('phoneCheckSelectModal');
    const listContainer = document.getElementById('phoneCheckCharList');
    
    const singleChats = chats.filter(c => c.type === 'single');
    
    if (singleChats.length === 0) {
        listContainer.innerHTML = '<div class="pc-char-empty">还没有角色，先去添加一个吧~</div>';
    } else {
        listContainer.innerHTML = singleChats.map(chat => {
            let avatarContent = '';
            const avatarSrc = chat.avatarImage || chat.avatar;
            
            if (avatarSrc && (avatarSrc.startsWith('data:') || avatarSrc.startsWith('http'))) {
                avatarContent = `<img src="${avatarSrc}" alt="">`;
            } else {
                avatarContent = avatarSrc || '👤';
            }
            
            return `
                <div class="pc-char-item" onclick="selectPhoneCheckChar(${chat.id})">
                    <div class="pc-char-avatar">${avatarContent}</div>
                    <div class="pc-char-name">${chat.name}</div>
                </div>
            `;
        }).join('');
    }
    
    modal.style.display = 'flex';
}

// 关闭角色选择弹窗
function closePhoneCheckSelectModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('phoneCheckSelectModal').style.display = 'none';
}

// 选择角色并打开手机页面
function selectPhoneCheckChar(charId) {
    phoneCheckCurrentCharId = charId;
    
    document.getElementById('phoneCheckSelectModal').style.display = 'none';
    
    const chat = chats.find(c => c.id === charId);
    if (!chat) return;
    
    // 从缓存获取数据
    const phoneData = phoneCheckDataCache[charId] || {};
    
    fillPhoneCheckPage(chat, phoneData);
    updatePhoneCheckTime();
    
    document.getElementById('phoneCheckScreen').style.display = 'flex';
    
    if (window.phoneCheckTimer) clearInterval(window.phoneCheckTimer);
    window.phoneCheckTimer = setInterval(updatePhoneCheckTime, 60000);
}

// 加载所有手机数据（启动时调用）
function loadPhoneCheckData() {
    loadFromDB('phoneCheckData', (data) => {
        if (data && data.dataMap) {
            phoneCheckDataCache = data.dataMap;
        } else {
            phoneCheckDataCache = {};
        }
    });
}

// 保存手机数据
function savePhoneCheckData(charId, newData) {
    phoneCheckDataCache[charId] = { ...phoneCheckDataCache[charId], ...newData };
    saveToDB('phoneCheckData', { dataMap: phoneCheckDataCache });
}

// 查手机统一取材：把 loadFromDB 包成 Promise，便于 await
function phoneCheckLoadFromDB(storeName) {
    return new Promise(resolve => {
        loadFromDB(storeName, (data) => {
            resolve(data);
        });
    });
}

// 查手机统一取材：人设 + 最近100条聊天 + 全部长期记忆
async function getPhoneCheckPromptSources(charId) {
    const result = {
        personalityText: '',
        recentChatText: '',
        memoryText: ''
    };

    if (!charId) return result;

    // 1. 人设
    const characterInfoData = await phoneCheckLoadFromDB('characterInfo');
    if (characterInfoData && characterInfoData[charId]) {
        result.personalityText = (characterInfoData[charId].personality || '').trim();
    }

    // 2. 最近100条聊天记录
    const messagesData = await phoneCheckLoadFromDB('messages');
    const allMessages = messagesData && messagesData.list
        ? messagesData.list
        : (Array.isArray(messagesData) ? messagesData : []);

    const chatMessages = allMessages
        .filter(m =>
            m &&
            m.chatId === charId &&
            !m.isRevoked &&
            m.type === 'text' &&
            String(m.content || '').trim()
        )
        .slice(-100);

    result.recentChatText = chatMessages.length > 0
        ? chatMessages.map(m => {
            const speaker = m.senderId === 'me' ? '我' : 'TA';
            const time = m.time ? `（${m.time}）` : '';
            return `${speaker}${time}：${String(m.content).trim()}`;
        }).join('\n')
        : '（无最近聊天记录）';

    // 3. 全部长期记忆
    const memoriesData = await phoneCheckLoadFromDB('memories');
    const allMemories = Array.isArray(memoriesData)
        ? memoriesData
        : (memoriesData && memoriesData.list ? memoriesData.list : []);

    const chatMemories = allMemories.filter(m => m && m.chatId === charId);

    const tagMemories = chatMemories
        .filter(m => m.type === 'tag' && String(m.content || '').trim())
        .map(m => `印象标签：${String(m.content).trim()}`);

    const momentMemories = chatMemories
        .filter(m => m.type === 'moment' && String(m.content || '').trim())
        .map(m => {
            const happenTime = m.happenTime ? `（${m.happenTime}）` : '';
            return `时光记录${happenTime}：${String(m.content).trim()}`;
        });

    const mergedMemories = [...tagMemories, ...momentMemories];

    result.memoryText = mergedMemories.length > 0
        ? mergedMemories.join('\n')
        : '（无长期记忆）';

    return result;
}

// 查手机美化方案缓存
let phoneCheckBeautifyPresets = [];

// 加载本地美化方案
function loadPhoneCheckBeautifyPresets() {
    loadFromDB('phoneCheckBeautifyPresets', (data) => {
        if (data && Array.isArray(data.list)) {
            phoneCheckBeautifyPresets = data.list;
        } else {
            phoneCheckBeautifyPresets = [];
        }
    });
}

// 保存本地美化方案列表
function savePhoneCheckBeautifyPresets() {
    saveToDB('phoneCheckBeautifyPresets', {
        list: phoneCheckBeautifyPresets
    });
}

// 提取当前角色的“页面 + 图标”美化数据
function getPhoneCheckBeautifyData(charId) {
    if (!charId) return null;

    const phoneData = phoneCheckDataCache[charId] || {};

    return {
        wallpaper: phoneData.wallpaper || '',
        appIcons: phoneData.appIcons || {},
        dockIcons: phoneData.dockIcons || {},
        cardTransparent: !!phoneData.cardTransparent
    };
}

// 保存当前角色美化为本地方案
function saveCurrentPhoneCheckBeautifyPreset(presetName) {
    if (!phoneCheckCurrentCharId) return { success: false, message: '当前没有选中角色' };

    const name = String(presetName || '').trim();
    if (!name) return { success: false, message: '方案名不能为空' };

    const beautifyData = getPhoneCheckBeautifyData(phoneCheckCurrentCharId);
    if (!beautifyData) return { success: false, message: '读取当前美化失败' };

    const preset = {
        id: Date.now(),
        name: name,
        createdAt: new Date().toLocaleString(),
        data: beautifyData
    };

    phoneCheckBeautifyPresets.unshift(preset);
    savePhoneCheckBeautifyPresets();

    return { success: true, preset: preset };
}

// 应用本地美化方案到当前角色
function applyPhoneCheckBeautifyPreset(presetId) {
    if (!phoneCheckCurrentCharId) return { success: false, message: '当前没有选中角色' };

    const preset = phoneCheckBeautifyPresets.find(item => String(item.id) === String(presetId));
    if (!preset || !preset.data) return { success: false, message: '方案不存在' };

    const beautifyData = {
        wallpaper: preset.data.wallpaper || '',
        appIcons: preset.data.appIcons || {},
        dockIcons: preset.data.dockIcons || {},
        cardTransparent: !!preset.data.cardTransparent
    };

    savePhoneCheckData(phoneCheckCurrentCharId, beautifyData);

    phoneCheckCardTransparent = beautifyData.cardTransparent;
    applyPhoneCheckBeautify();

    const card = document.querySelector('.pc-profile-card');
    if (card) {
        if (phoneCheckCardTransparent) {
            card.style.background = 'transparent';
            card.style.border = '1px solid transparent';
            card.style.boxShadow = 'none';
            card.style.backdropFilter = 'none';
            card.style.webkitBackdropFilter = 'none';
        } else {
            card.style.background = 'rgba(255, 255, 255, 0.7)';
            card.style.border = '1px solid rgba(255, 255, 255, 0.8)';
            card.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.05)';
            card.style.backdropFilter = 'blur(20px)';
            card.style.webkitBackdropFilter = 'blur(20px)';
        }
    }

    return { success: true, preset: preset };
}

// 删除本地美化方案
function deletePhoneCheckBeautifyPreset(presetId) {
    const beforeLength = phoneCheckBeautifyPresets.length;

    phoneCheckBeautifyPresets = phoneCheckBeautifyPresets.filter(item => String(item.id) !== String(presetId));
    savePhoneCheckBeautifyPresets();

    return {
        success: phoneCheckBeautifyPresets.length !== beforeLength
    };
}

// 提取当前角色美化为 JSON 文本
function exportCurrentPhoneCheckBeautifyPreset(exportName) {
    if (!phoneCheckCurrentCharId) {
        return { success: false, message: '当前没有选中角色' };
    }

    const beautifyData = getPhoneCheckBeautifyData(phoneCheckCurrentCharId);
    if (!beautifyData) {
        return { success: false, message: '读取当前美化失败' };
    }

    const chat = chats.find(c => c.id === phoneCheckCurrentCharId);
    const presetName = String(exportName || '').trim() || (chat ? `${chat.name}-查手机美化` : '查手机美化方案');

    const exportData = {
        type: 'phoneCheckBeautifyPreset',
        version: 1,
        name: presetName,
        exportedAt: new Date().toLocaleString(),
        data: beautifyData
    };

    return {
        success: true,
        json: JSON.stringify(exportData, null, 2),
        data: exportData
    };
}

// 从 JSON 文本导入美化方案
function importPhoneCheckBeautifyPresetFromJson(jsonText, options = {}) {
    const {
        applyToCurrent = false,
        saveAsLocal = true,
        importedName = ''
    } = options;

    let parsed;

    try {
        parsed = JSON.parse(jsonText);
    } catch (e) {
        return { success: false, message: 'JSON 格式不正确' };
    }

    if (!parsed || parsed.type !== 'phoneCheckBeautifyPreset' || !parsed.data) {
        return { success: false, message: '不是有效的查手机美化方案' };
    }

    const beautifyData = {
        wallpaper: parsed.data.wallpaper || '',
        appIcons: parsed.data.appIcons || {},
        dockIcons: parsed.data.dockIcons || {},
        cardTransparent: !!parsed.data.cardTransparent
    };

    const finalName = String(importedName || parsed.name || '导入的美化方案').trim();

    let savedPreset = null;

    if (saveAsLocal) {
        savedPreset = {
            id: Date.now(),
            name: finalName,
            createdAt: new Date().toLocaleString(),
            data: beautifyData
        };

        phoneCheckBeautifyPresets.unshift(savedPreset);
        savePhoneCheckBeautifyPresets();
    }

    if (applyToCurrent) {
        if (!phoneCheckCurrentCharId) {
            return { success: false, message: '当前没有选中角色，无法直接应用' };
        }

        savePhoneCheckData(phoneCheckCurrentCharId, beautifyData);

        phoneCheckCardTransparent = beautifyData.cardTransparent;
        applyPhoneCheckBeautify();

        const card = document.querySelector('.pc-profile-card');
        if (card) {
            if (phoneCheckCardTransparent) {
                card.style.background = 'transparent';
                card.style.border = '1px solid transparent';
                card.style.boxShadow = 'none';
                card.style.backdropFilter = 'none';
                card.style.webkitBackdropFilter = 'none';
            } else {
                card.style.background = 'rgba(255, 255, 255, 0.7)';
                card.style.border = '1px solid rgba(255, 255, 255, 0.8)';
                card.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.05)';
                card.style.backdropFilter = 'blur(20px)';
                card.style.webkitBackdropFilter = 'blur(20px)';
            }
        }
    }

    return {
        success: true,
        preset: savedPreset,
        data: beautifyData
    };
}

// 保存当前美化为本地方案
function savePhoneCheckBeautifyPresetAction() {
    if (!phoneCheckCurrentCharId) {
        alert('请先进入一个角色的查手机页面');
        return;
    }

    const name = prompt('给这个美化方案取个名字');
    if (name === null) return;

    const result = saveCurrentPhoneCheckBeautifyPreset(name);
    if (!result.success) {
        alert(result.message || '保存失败');
        return;
    }

    alert('美化方案已保存');
}

// 打开本地方案弹窗
function openPhoneCheckBeautifyPresetModal() {
    renderPhoneCheckBeautifyPresetList();
    document.getElementById('pcBeautifyPresetModal').style.display = 'flex';
}

// 关闭本地方案弹窗
function closePhoneCheckBeautifyPresetModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('pcBeautifyPresetModal').style.display = 'none';
}

// 渲染本地方案列表
function renderPhoneCheckBeautifyPresetList() {
    const listEl = document.getElementById('pcBeautifyPresetList');
    if (!listEl) return;

    if (!phoneCheckBeautifyPresets || phoneCheckBeautifyPresets.length === 0) {
        listEl.innerHTML = '<div class="pc-beautify-preset-empty">还没有保存的方案~</div>';
        return;
    }

    listEl.innerHTML = phoneCheckBeautifyPresets.map(item => `
        <div class="pc-beautify-preset-item">
            <div class="pc-beautify-preset-info">
                <div class="pc-beautify-preset-name">${escapeHtml(item.name || '未命名方案')}</div>
                <div class="pc-beautify-preset-time">${escapeHtml(item.createdAt || '')}</div>
            </div>
            <div class="pc-beautify-preset-item-actions">
                <button class="pc-beautify-preset-mini-btn" onclick="applyPhoneCheckBeautifyPresetAction('${item.id}')">应用</button>
                <button class="pc-beautify-preset-mini-btn danger" onclick="deletePhoneCheckBeautifyPresetAction('${item.id}')">删除</button>
            </div>
        </div>
    `).join('');
}

// 应用本地方案
function applyPhoneCheckBeautifyPresetAction(presetId) {
    const result = applyPhoneCheckBeautifyPreset(presetId);
    if (!result.success) {
        alert(result.message || '应用失败');
        return;
    }

    closePhoneCheckBeautifyPresetModal();
    alert('已应用美化方案');
}

// 删除本地方案
function deletePhoneCheckBeautifyPresetAction(presetId) {
    if (!confirm('确定删除这个美化方案吗？')) return;

    const result = deletePhoneCheckBeautifyPreset(presetId);
    if (!result.success) {
        alert('删除失败');
        return;
    }

    renderPhoneCheckBeautifyPresetList();
}

// 提取方案：直接下载 JSON 文件
function openPhoneCheckBeautifyExportModal() {
    const result = exportCurrentPhoneCheckBeautifyPreset();
    if (!result.success) {
        alert(result.message || '提取失败');
        return;
    }

    const jsonText = result.json || '';
    const fileName = `${(result.data?.name || '查手机美化方案').replace(/[\\/:*?"<>|]/g, '_')}.json`;
    const blob = new Blob([jsonText], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 1000);
}


function openPhoneCheckBeautifyImportModal() {
    const input = document.getElementById('pcBeautifyImportFile');
    if (input) input.value = '';
    document.getElementById('pcBeautifyImportModal').style.display = 'flex';
}

// 关闭导入方案弹窗
function closePhoneCheckBeautifyImportModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('pcBeautifyImportModal').style.display = 'none';
}

// 确认导入 JSON 文件
function confirmImportPhoneCheckBeautifyFile() {
    const input = document.getElementById('pcBeautifyImportFile');
    if (!input || !input.files || !input.files[0]) {
        alert('请先选择 JSON 文件');
        return;
    }

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
        const jsonText = String(e.target.result || '').trim();
        if (!jsonText) {
            alert('文件内容为空');
            return;
        }

        const result = importPhoneCheckBeautifyPresetFromJson(jsonText, {
            applyToCurrent: true,
            saveAsLocal: true
        });

        if (!result.success) {
            alert(result.message || '导入失败');
            return;
        }

        closePhoneCheckBeautifyImportModal();
        input.value = '';
        alert('导入成功，已保存并应用');
    };

    reader.onerror = function() {
        alert('读取文件失败');
    };

    reader.readAsText(file, 'utf-8');
}

// 填充手机页面数据
function fillPhoneCheckPage(chat, phoneData) {
    const avatarImg = document.getElementById('pcAvatar');
    const avatarPlaceholder = document.getElementById('pcAvatarPlaceholder');
    const msgAvatar = document.getElementById('pcMsgAvatar');
    
    const avatarSrc = phoneData.avatar || '';
    
    if (avatarSrc && (avatarSrc.startsWith('data:') || avatarSrc.startsWith('http'))) {
        avatarImg.src = avatarSrc;
        avatarImg.style.display = 'block';
        avatarPlaceholder.style.display = 'none';
        msgAvatar.innerHTML = `<img src="${avatarSrc}">`;
    } else {
        avatarImg.style.display = 'none';
        avatarPlaceholder.style.display = 'flex';
        avatarPlaceholder.textContent = '👤';
        msgAvatar.innerHTML = '👤';
    }
    
    document.getElementById('pcNickname').textContent = phoneData.nickname || chat.name || 'User';
    document.getElementById('pcUsername').textContent = phoneData.username || '@' + (chat.name || 'user');

    document.getElementById('pcWidgyBottom').textContent = phoneData.widgyBottom || 'Widgy';
    document.getElementById('pcMsgBubble').textContent = phoneData.msgBubble || '오늘도 일찍 쉬세요.';
    document.getElementById('pcInputPlaceholder').textContent = phoneData.inputPlaceholder || '참, 내일 시간 있어요?';

// 同步天气温度到顶部栏
const tempEl = document.getElementById('pcTemp');
if (tempEl) {
    loadFromDB('characterInfo', (data) => {
        const charData = data && data[chat.id] ? data[chat.id] : null;

     if (
    charData &&
    charData.cityInfoEnabled &&
    charData.charWeather &&
    charData.charWeather.today &&
    charData.charWeather.today.temp
) {
    const tempText = charData.charWeather.today.temp;
    const match = tempText.match(/(-?\d+)\s*-\s*(-?\d+)\s*°C/i);

    if (match) {
        const minTemp = parseInt(match[1], 10);
        const maxTemp = parseInt(match[2], 10);
        const avgTemp = Math.round((minTemp + maxTemp) / 2);
        tempEl.textContent = avgTemp + '°C';
    } else {
        const singleMatch = tempText.match(/-?\d+/);
        tempEl.textContent = singleMatch ? singleMatch[0] + '°C' : '--°C';
    }
} else {
    tempEl.textContent = '--°C';
}
    });
}

// 恢复卡片透明状态
phoneCheckCardTransparent = phoneData.cardTransparent || false;
const card = document.querySelector('.pc-profile-card');
if (card) {
    if (phoneCheckCardTransparent) {
        card.style.background = 'transparent';
       card.style.border = '1px solid transparent';
        card.style.boxShadow = 'none';
        card.style.backdropFilter = 'none';
        card.style.webkitBackdropFilter = 'none';
    } else {
        card.style.background = 'rgba(255, 255, 255, 0.7)';
        card.style.border = '1px solid rgba(255, 255, 255, 0.8)';
        card.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.05)';
        card.style.backdropFilter = 'blur(20px)';
        card.style.webkitBackdropFilter = 'blur(20px)';
    }
}

// 应用美化设置
applyPhoneCheckBeautify();
}

function updatePhoneCheckTime() {
    const now = new Date();
    
    // 时间
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeEl = document.getElementById('pcTime');
    if (timeEl) {
        timeEl.textContent = `${hours}:${minutes}`;
    }
    
    // 星期（简短格式）
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekEl = document.getElementById('pcWeekday');
    if (weekEl) {
        weekEl.textContent = weekDays[now.getDay()];
    }
    
    // 电量
    if (navigator.getBattery) {
        navigator.getBattery().then(battery => {
            const level = Math.round(battery.level * 100);
            const batteryTextEl = document.getElementById('pcBatteryText');
            const batteryFillEl = document.getElementById('pcBatteryFill');
            
            if (batteryTextEl) {
                batteryTextEl.textContent = level + '%';
                if (level <= 20) {
                    batteryTextEl.style.color = '#ff4757';
                } else if (level <= 50) {
                    batteryTextEl.style.color = '#ffa502';
                } else {
                    batteryTextEl.style.color = '#22c55e';
                }
            }
            
            if (batteryFillEl) {
                // 根据电量调整填充宽度（最大14）
                const fillWidth = Math.round(level / 100 * 14);
                batteryFillEl.setAttribute('width', fillWidth);
                if (level <= 20) {
                    batteryFillEl.setAttribute('fill', '#ff4757');
                } else if (level <= 50) {
                    batteryFillEl.setAttribute('fill', '#ffa502');
                } else {
                    batteryFillEl.setAttribute('fill', '#4ade80');
                }
            }
        });
    }
}
// 关闭手机页面
function closePhoneCheckScreen() {
    document.getElementById('phoneCheckScreen').style.display = 'none';
    phoneCheckCurrentCharId = null;
    if (window.phoneCheckTimer) {
        clearInterval(window.phoneCheckTimer);
        window.phoneCheckTimer = null;
    }
}

// ============ 切换头像功能 ============

function openPhoneCheckAvatarUpload() {
    document.getElementById('pcAvatarInput').click();
}

function handlePhoneCheckAvatarUpload(input) {
    if (!input.files || !input.files[0]) return;
    if (!phoneCheckCurrentCharId) return;
    
    const file = input.files[0];
    const reader = new FileReader();
    
    reader.onload = function(e) {
        compressPhoneCheckImage(e.target.result, 400, 0.7, (compressedData) => {
            savePhoneCheckData(phoneCheckCurrentCharId, { avatar: compressedData });
            
            const avatarImg = document.getElementById('pcAvatar');
            const avatarPlaceholder = document.getElementById('pcAvatarPlaceholder');
            const msgAvatar = document.getElementById('pcMsgAvatar');
            
            avatarImg.src = compressedData;
            avatarImg.style.display = 'block';
            avatarPlaceholder.style.display = 'none';
            msgAvatar.innerHTML = `<img src="${compressedData}">`;
        });
    };
    
    reader.readAsDataURL(file);
    input.value = '';
}

function compressPhoneCheckImage(base64, maxSize, quality, callback) {
    const img = new Image();
    img.onload = function() {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        if (width > maxSize || height > maxSize) {
            if (width > height) {
                height = Math.round(height * maxSize / width);
                width = maxSize;
            } else {
                width = Math.round(width * maxSize / height);
                height = maxSize;
            }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        callback(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = base64;
}

// ============ 修改资料弹窗 ============

function openPhoneCheckProfileModal() {
    if (!phoneCheckCurrentCharId) return;
    
    const phoneData = phoneCheckDataCache[phoneCheckCurrentCharId] || {};
    
    document.getElementById('pcEditNickname').value = phoneData.nickname || '';
    document.getElementById('pcEditUsername').value = phoneData.username || '';

    
    document.getElementById('phoneCheckProfileModal').style.display = 'flex';
}

function closePhoneCheckProfileModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('phoneCheckProfileModal').style.display = 'none';
}

function savePhoneCheckProfile() {
    if (!phoneCheckCurrentCharId) return;
    
    const nickname = document.getElementById('pcEditNickname').value.trim();
    const username = document.getElementById('pcEditUsername').value.trim();

    
 savePhoneCheckData(phoneCheckCurrentCharId, {
    nickname: nickname,
    username: username
});
    
    document.getElementById('pcNickname').textContent = nickname || 'User';
    document.getElementById('pcUsername').textContent = username || '@user';
    
    closePhoneCheckProfileModal();
}

// ============ 通用文字编辑 ============

let phoneCheckCurrentEditField = null;

function openPhoneCheckTextEdit(field, title) {
    if (!phoneCheckCurrentCharId) return;
    
    phoneCheckCurrentEditField = field;
    const phoneData = phoneCheckDataCache[phoneCheckCurrentCharId] || {};
    
    document.getElementById('pcTextModalTitle').textContent = '编辑' + title;
    document.getElementById('pcTextEditInput').value = phoneData[field] || '';
    document.getElementById('phoneCheckTextModal').style.display = 'flex';
}

function closePhoneCheckTextModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('phoneCheckTextModal').style.display = 'none';
    phoneCheckCurrentEditField = null;
}

function savePhoneCheckText() {
    if (!phoneCheckCurrentCharId || !phoneCheckCurrentEditField) return;
    
    const value = document.getElementById('pcTextEditInput').value.trim();
    
    const saveData = {};
    saveData[phoneCheckCurrentEditField] = value;
    savePhoneCheckData(phoneCheckCurrentCharId, saveData);
    
    const fieldMap = {
      
        'widgyBottom': 'pcWidgyBottom',
        'msgBubble': 'pcMsgBubble',
        'inputPlaceholder': 'pcInputPlaceholder'
    };
    
    const defaults = {
    
        'widgyBottom': 'Widgy',
        'msgBubble': '오늘도 일찍 쉬세요.',
        'inputPlaceholder': '참, 내일 시간 있어요?'
    };
    
    const elementId = fieldMap[phoneCheckCurrentEditField];
    if (elementId) {
        document.getElementById(elementId).textContent = value || defaults[phoneCheckCurrentEditField];
    }
    
    closePhoneCheckTextModal();
}

// ============ 卡片透明切换 ============

let phoneCheckCardTransparent = false;

function togglePhoneCheckCardTransparent() {
    phoneCheckCardTransparent = !phoneCheckCardTransparent;
    
    const card = document.querySelector('.pc-profile-card');
    if (!card) return;
    
    if (phoneCheckCardTransparent) {
        card.style.background = 'transparent';
        card.style.border = '1px solid transparent';
        card.style.boxShadow = 'none';
        card.style.backdropFilter = 'none';
        card.style.webkitBackdropFilter = 'none';
    } else {
        card.style.background = 'rgba(255, 255, 255, 0.7)';
        card.style.border = '1px solid rgba(255, 255, 255, 0.8)';
        card.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.05)';
        card.style.backdropFilter = 'blur(20px)';
        card.style.webkitBackdropFilter = 'blur(20px)';
    }
    
    if (phoneCheckCurrentCharId) {
        savePhoneCheckData(phoneCheckCurrentCharId, { cardTransparent: phoneCheckCardTransparent });
    }
}

// ============ 查手机美化功能 ============

// 查手机默认美化资源（仅在角色没有自定义美化时使用，不覆盖已有数据）
const pcDefaultWallpaperUrl = 'https://i.postimg.cc/KjGd0fj4/QQ-tu-pian20260309220243.jpg';

const pcDefaultIconUrls = {
    memo: 'https://i.postimg.cc/Xqstm5BV/QQ-tu-pian20260309220247.jpg',
    album: 'https://i.postimg.cc/Wz5xCZqp/QQ-tu-pian20260309220250.jpg',
    grudge: 'https://i.postimg.cc/GtX6VDT2/QQ-tu-pian20260309220253.jpg',
    love: 'https://i.postimg.cc/T1tBFb5Y/QQ-tu-pian20260309220255.jpg',
    sms: 'https://i.postimg.cc/D0xRHG4m/QQ-tu-pian20260309220258.jpg',
    finance: 'https://i.postimg.cc/4yWjqcHK/QQ-tu-pian20260309220300.jpg',
    favorite: 'https://i.postimg.cc/cCFP23tg/QQ-tu-pian20260309220302.jpg',
    location: 'https://i.postimg.cc/FzTw8SkJ/QQ-tu-pian20260309220305.jpg',
    taobao: 'https://i.postimg.cc/brm4WnSt/QQ-tu-pian20260309220307.jpg',
    meituan: 'https://i.postimg.cc/3NtzVG0m/QQ-tu-pian20260309220310.jpg',
    trip: 'https://i.postimg.cc/cCFP23tY/QQ-tu-pian20260309220312.jpg',
    douban: 'https://i.postimg.cc/BnB7VDrd/QQ-tu-pian20260309220652.jpg',
    beautify: 'https://i.postimg.cc/0y0XBDgv/QQ-tu-pian20260309220655.jpg',
    api: 'https://i.postimg.cc/6pfbmns9/QQ-tu-pian20260309220657.jpg',
    fridge: 'https://i.postimg.cc/sg4HN7Fs/QQ-tu-pian20260309220700.jpg',
    browser: 'https://i.postimg.cc/Jz5Y2ZwR/QQ-tu-pian20260309220703.jpg'
};


// 默认图标
const pcDefaultIcons = {
    memo: '📝',
    album: '🖼️',
    grudge: '😤',
    love: '💕',
    sms: '💬',
    finance: '💰',
    favorite: '⭐',
    location: '📍',
    taobao: '🛍️',
    meituan: '🍱',
    trip: '🧳',
    douban: '📚',
    beautify: '🎨',
    api: '⚙️',
    fridge: '🧊',
    browser: '🌐'
};

let pcCurrentEditingIcon = null;

// 打开美化页面
function openPhoneCheckBeautify() {
    if (!phoneCheckCurrentCharId) return;
    
    const phoneData = phoneCheckDataCache[phoneCheckCurrentCharId] || {};
    
       // 加载壁纸预览：有自定义就用自定义，没有就用默认壁纸
    const preview = document.getElementById('pcWallpaperPreview');
    const previewWallpaper = phoneData.wallpaper || pcDefaultWallpaperUrl;

    if (previewWallpaper) {
        preview.style.backgroundImage = `url(${previewWallpaper})`;
    } else {
        preview.style.backgroundImage = 'none';
    }
    // 加载图标预览
    loadPcIconPreviews(phoneData);
    
    document.getElementById('phoneCheckBeautifyScreen').style.display = 'flex';
    // 隐藏Dock栏
document.querySelector('.pc-dock').style.display = 'none';
}

// 关闭美化页面
function closePhoneCheckBeautify() {
    document.getElementById('phoneCheckBeautifyScreen').style.display = 'none';
    
    // 应用美化到主页面
    applyPhoneCheckBeautify();
    // 显示Dock栏
document.querySelector('.pc-dock').style.display = 'flex';
}

// 加载图标预览
function loadPcIconPreviews(phoneData) {
    const appIcons = phoneData.appIcons || {};
    const dockIcons = phoneData.dockIcons || {};
    
    // App图标
    Object.keys(pcDefaultIcons).forEach(key => {
        const previewEl = document.getElementById(`pcIconPreview-${key}`);
        if (!previewEl) return;
        
        let iconData = null;
        if (['beautify', 'api', 'fridge', 'browser'].includes(key)) {
            iconData = dockIcons[key];
        } else {
            iconData = appIcons[key];
        }
        
              const defaultIconUrl = pcDefaultIconUrls[key] || '';

        if (iconData && (iconData.startsWith('data:') || iconData.startsWith('http'))) {
            previewEl.innerHTML = `<img src="${iconData}">`;
        } else if (defaultIconUrl) {
            previewEl.innerHTML = `<img src="${defaultIconUrl}">`;
        } else {
            previewEl.innerHTML = pcDefaultIcons[key];
        }
    });
}

// 壁纸Tab切换
function switchPcWallpaperTab(tab) {
    document.querySelectorAll('#phoneCheckBeautifyScreen .ins-tab-btn').forEach((btn, index) => {
        if (index < 2) {
            btn.classList.remove('active');
        }
    });
    
    if (tab === 'local') {
        document.querySelector('#phoneCheckBeautifyScreen .ins-tab-btn:nth-child(1)').classList.add('active');
        document.getElementById('pcWallpaperLocalTab').style.display = 'block';
        document.getElementById('pcWallpaperUrlTab').style.display = 'none';
    } else {
        document.querySelector('#phoneCheckBeautifyScreen .ins-tab-btn:nth-child(2)').classList.add('active');
        document.getElementById('pcWallpaperLocalTab').style.display = 'none';
        document.getElementById('pcWallpaperUrlTab').style.display = 'block';
    }
}

// 处理壁纸上传
function handlePcWallpaperUpload(input) {
    if (!input.files || !input.files[0]) return;
    
    const file = input.files[0];
    const reader = new FileReader();
    
    reader.onload = function(e) {
        compressPhoneCheckImage(e.target.result, 800, 0.7, (compressedData) => {
            // 更新预览
            document.getElementById('pcWallpaperPreview').style.backgroundImage = `url(${compressedData})`;
            
            // 保存数据
            savePhoneCheckData(phoneCheckCurrentCharId, { wallpaper: compressedData });
        });
    };
    
    reader.readAsDataURL(file);
    input.value = '';
}

// 应用壁纸链接
function applyPcWallpaperUrl() {
    const url = document.getElementById('pcWallpaperUrl').value.trim();
    if (!url) return;
    
    document.getElementById('pcWallpaperPreview').style.backgroundImage = `url(${url})`;
    savePhoneCheckData(phoneCheckCurrentCharId, { wallpaper: url });
}

// 清除壁纸
function clearPcWallpaper() {
    document.getElementById('pcWallpaperPreview').style.backgroundImage = 'none';
    document.getElementById('pcWallpaperUrl').value = '';
    savePhoneCheckData(phoneCheckCurrentCharId, { wallpaper: '' });
}

// 打开图标编辑弹窗
function openPcIconEditor(iconKey) {
    pcCurrentEditingIcon = iconKey;
    
    const phoneData = phoneCheckDataCache[phoneCheckCurrentCharId] || {};
    const appIcons = phoneData.appIcons || {};
    const dockIcons = phoneData.dockIcons || {};
    
    let iconData = null;
    if (['beautify', 'api', 'fridge', 'browser'].includes(iconKey)) {
        iconData = dockIcons[iconKey];
    } else {
        iconData = appIcons[iconKey];
    }
    
    // 设置标题
      const names = {
        memo: '备忘录',
        album: '相册',
        grudge: '记仇本',
        love: '恋爱记',
        sms: '短信',
        finance: '理财',
        favorite: '收藏',
        location: '行踪',
        taobao: '桃宝',
        meituan: '丑团',
        trip: '旅程',
        douban: '豆沙包',
        beautify: '美化',
        api: 'API',
        fridge: '冰箱',
        browser: '浏览器'
    };
    document.getElementById('pcIconEditorTitle').textContent = '编辑 ' + names[iconKey];
    
    // 设置预览
    const previewEl = document.getElementById('pcIconEditorPreview');
    if (iconData && (iconData.startsWith('data:') || iconData.startsWith('http'))) {
        previewEl.innerHTML = `<img src="${iconData}">`;
    } else {
        previewEl.innerHTML = pcDefaultIcons[iconKey];
    }
    
    // 清空输入
    document.getElementById('pcIconUrl').value = '';
    
    document.getElementById('pcIconEditorModal').style.display = 'flex';
}

// 关闭图标编辑弹窗
function closePcIconEditor(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('pcIconEditorModal').style.display = 'none';
    pcCurrentEditingIcon = null;
}

// 图标Tab切换
function switchPcIconTab(tab) {
    const modal = document.getElementById('pcIconEditorModal');
    modal.querySelectorAll('.ins-tab-btn').forEach(btn => btn.classList.remove('active'));
    
    if (tab === 'local') {
        modal.querySelector('.ins-tab-btn:nth-child(1)').classList.add('active');
        document.getElementById('pcIconLocalTab').style.display = 'block';
        document.getElementById('pcIconUrlTab').style.display = 'none';
    } else {
        modal.querySelector('.ins-tab-btn:nth-child(2)').classList.add('active');
        document.getElementById('pcIconLocalTab').style.display = 'none';
        document.getElementById('pcIconUrlTab').style.display = 'block';
    }
}

// 处理图标上传
function handlePcIconUpload(input) {
    if (!input.files || !input.files[0]) return;
    
    const file = input.files[0];
    const reader = new FileReader();
    
    reader.onload = function(e) {
        compressPhoneCheckImage(e.target.result, 200, 0.8, (compressedData) => {
            document.getElementById('pcIconEditorPreview').innerHTML = `<img src="${compressedData}">`;
        });
    };
    
    reader.readAsDataURL(file);
    input.value = '';
}

// 保存图标
function savePcIcon() {
    if (!pcCurrentEditingIcon || !phoneCheckCurrentCharId) return;
    
    const previewEl = document.getElementById('pcIconEditorPreview');
    const img = previewEl.querySelector('img');
    const urlInput = document.getElementById('pcIconUrl').value.trim();
    
    let iconData = '';
    
    if (urlInput) {
        iconData = urlInput;
        previewEl.innerHTML = `<img src="${urlInput}">`;
    } else if (img) {
        iconData = img.src;
    }
    
    // 保存到对应分类
    const phoneData = phoneCheckDataCache[phoneCheckCurrentCharId] || {};
    
    if (['beautify', 'api', 'fridge', 'browser'].includes(pcCurrentEditingIcon)) {
        const dockIcons = phoneData.dockIcons || {};
        dockIcons[pcCurrentEditingIcon] = iconData;
        savePhoneCheckData(phoneCheckCurrentCharId, { dockIcons: dockIcons });
    } else {
        const appIcons = phoneData.appIcons || {};
        appIcons[pcCurrentEditingIcon] = iconData;
        savePhoneCheckData(phoneCheckCurrentCharId, { appIcons: appIcons });
    }
    
    // 更新美化页面预览
    const gridPreview = document.getElementById(`pcIconPreview-${pcCurrentEditingIcon}`);
    if (gridPreview) {
        if (iconData) {
            gridPreview.innerHTML = `<img src="${iconData}">`;
        } else {
            gridPreview.innerHTML = pcDefaultIcons[pcCurrentEditingIcon];
        }
    }
    
    closePcIconEditor();
}

// 恢复默认图标
function resetPcIcon() {
    if (!pcCurrentEditingIcon) return;
    
    document.getElementById('pcIconEditorPreview').innerHTML = pcDefaultIcons[pcCurrentEditingIcon];
    document.getElementById('pcIconUrl').value = '';
    
    // 清除保存的数据
    const phoneData = phoneCheckDataCache[phoneCheckCurrentCharId] || {};
    
    if (['beautify', 'api', 'fridge', 'browser'].includes(pcCurrentEditingIcon)) {
        const dockIcons = phoneData.dockIcons || {};
        delete dockIcons[pcCurrentEditingIcon];
        savePhoneCheckData(phoneCheckCurrentCharId, { dockIcons: dockIcons });
    } else {
        const appIcons = phoneData.appIcons || {};
        delete appIcons[pcCurrentEditingIcon];
        savePhoneCheckData(phoneCheckCurrentCharId, { appIcons: appIcons });
    }
    
    // 更新美化页面预览
    const gridPreview = document.getElementById(`pcIconPreview-${pcCurrentEditingIcon}`);
    if (gridPreview) {
        gridPreview.innerHTML = pcDefaultIcons[pcCurrentEditingIcon];
    }
}

// 应用美化到主页面
function applyPhoneCheckBeautify() {
    if (!phoneCheckCurrentCharId) return;
    
    const phoneData = phoneCheckDataCache[phoneCheckCurrentCharId] || {};
    const appIcons = phoneData.appIcons || {};
    const dockIcons = phoneData.dockIcons || {};
    
       // 应用壁纸：有自定义就用自定义，没有就用默认壁纸
    const screen = document.getElementById('phoneCheckScreen');
    const finalWallpaper = phoneData.wallpaper || pcDefaultWallpaperUrl;

    if (finalWallpaper) {
        screen.style.backgroundImage = `url(${finalWallpaper})`;
        screen.style.backgroundSize = 'cover';
        screen.style.backgroundPosition = 'center';
        screen.style.backgroundRepeat = 'no-repeat';
        screen.style.backgroundColor = '';
    } else {
        screen.style.backgroundImage = 'none';
        screen.style.background = 'linear-gradient(180deg, #f5f5f7 0%, #e8e8ed 100%)';
    }
    
    // 应用App图标
    const appKeys = ['memo', 'album', 'grudge', 'love', 'sms', 'finance', 'favorite', 'location', 'taobao', 'meituan', 'trip', 'douban'];
    appKeys.forEach(key => {
        const iconEl = document.getElementById(`pcAppIcon-${key}`);
        if (!iconEl) return;
        
              const defaultIconUrl = pcDefaultIconUrls[key] || '';

        if (appIcons[key] && (appIcons[key].startsWith('data:') || appIcons[key].startsWith('http'))) {
            iconEl.innerHTML = `<img src="${appIcons[key]}" style="width:100%;height:100%;object-fit:cover;border-radius:12px;">`;
        } else if (defaultIconUrl) {
            iconEl.innerHTML = `<img src="${defaultIconUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:12px;">`;
        } else {
            iconEl.innerHTML = pcDefaultIcons[key];
        }
    });
    
    // 应用Dock图标
    const dockKeys = ['beautify', 'api', 'fridge', 'browser'];
    dockKeys.forEach(key => {
        const iconEl = document.getElementById(`pcDockIcon-${key}`);
        if (!iconEl) return;
        
                const defaultIconUrl = pcDefaultIconUrls[key] || '';

        if (dockIcons[key] && (dockIcons[key].startsWith('data:') || dockIcons[key].startsWith('http'))) {
            iconEl.innerHTML = `<img src="${dockIcons[key]}" style="width:100%;height:100%;object-fit:cover;border-radius:12px;">`;
        } else if (defaultIconUrl) {
            iconEl.innerHTML = `<img src="${defaultIconUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:12px;">`;
        } else {
            iconEl.innerHTML = pcDefaultIcons[key];
        }
    });
}

// ============ 查手机API设置功能 ============

// 打开API选择弹窗
function openPhoneCheckApiModal() {
    if (!phoneCheckCurrentCharId) return;
    
    const phoneData = phoneCheckDataCache[phoneCheckCurrentCharId] || {};
    const selectedSchemeId = phoneData.apiSchemeId || null;
    
    // 从数据库加载API方案列表
    loadFromDB('apiSchemes', (data) => {
        const schemes = (data && data.list) ? data.list : (Array.isArray(data) ? data : []);
        
        const listContainer = document.getElementById('pcApiSchemeList');
        
        if (schemes.length === 0) {
            listContainer.innerHTML = '<div style="text-align: center; padding: 30px; color: #999; font-size: 13px;">还没有API方案<br>请先在主页API设置中添加</div>';
        } else {
           listContainer.innerHTML = schemes.map(scheme => `
    <div class="pc-api-scheme-item ${scheme.id === selectedSchemeId ? 'selected' : ''}" data-id="${scheme.id}" onclick="selectPhoneCheckApiScheme(${scheme.id})">
                    <div class="scheme-name">${scheme.name || '未命名方案'}</div>
                    <div class="scheme-check">✓</div>
                </div>
            `).join('');
        }
        
        // 显示当前选中信息
        updatePhoneCheckApiInfo(phoneData);
        
        document.getElementById('pcApiModal').style.display = 'flex';
    });
}

// 关闭API选择弹窗
function closePhoneCheckApiModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('pcApiModal').style.display = 'none';
}

// 选择API方案
function selectPhoneCheckApiScheme(schemeId) {
    if (!phoneCheckCurrentCharId) return;
    
    // 从数据库获取方案详情
    loadFromDB('apiSchemes', (data) => {
        const schemes = (data && data.list) ? data.list : (Array.isArray(data) ? data : []);
        const scheme = schemes.find(s => s.id === schemeId);
        
        if (!scheme) return;
        
     // 保存选择
savePhoneCheckData(phoneCheckCurrentCharId, {
    apiSchemeId: scheme.id,
    apiSchemeName: scheme.name || '未命名方案',
    apiBaseUrl: scheme.baseUrl || '',
    apiModel: scheme.defaultModel || ''
});
        
        // 更新列表选中状态
        document.querySelectorAll('.pc-api-scheme-item').forEach(item => {
            item.classList.remove('selected');
            if (parseInt(item.getAttribute('data-id')) === schemeId) {
                item.classList.add('selected');
            }
        });
        
        // 更新当前信息显示
        const phoneData = phoneCheckDataCache[phoneCheckCurrentCharId] || {};
        updatePhoneCheckApiInfo(phoneData);
    });
}

// 更新当前API信息显示
function updatePhoneCheckApiInfo(phoneData) {
    const infoContainer = document.getElementById('pcApiCurrentInfo');
    
    if (phoneData.apiSchemeId) {
        document.getElementById('pcApiCurrentName').textContent = phoneData.apiSchemeName || '-';
        document.getElementById('pcApiCurrentUrl').textContent = phoneData.apiBaseUrl || '-';
        document.getElementById('pcApiCurrentModel').textContent = '模型: ' + (phoneData.apiModel || '-');
        infoContainer.style.display = 'block';
    } else {
        infoContainer.style.display = 'none';
    }
}

// ============ 查手机冰箱功能 ============

// 打开冰箱页面
function openPhoneCheckFridge() {
    if (!phoneCheckCurrentCharId) return;
    
    const phoneData = phoneCheckDataCache[phoneCheckCurrentCharId] || {};
    
    // 加载已保存的内容
    loadFridgeContent(phoneData);
    
    // 隐藏Dock栏
    document.querySelector('.pc-dock').style.display = 'none';
    
    document.getElementById('phoneCheckFridgeScreen').style.display = 'flex';
}

// 关闭冰箱页面
function closePhoneCheckFridge() {
    document.getElementById('phoneCheckFridgeScreen').style.display = 'none';
    
    // 显示Dock栏
    document.querySelector('.pc-dock').style.display = 'flex';
}

// 加载冰箱内容
function loadFridgeContent(phoneData) {
    const itemsContainer = document.getElementById('pcFridgeItems');
    const noteContent = document.getElementById('pcFridgeNoteContent');
    
    // 加载物品列表
    if (phoneData.fridgeItems && phoneData.fridgeItems.length > 0) {
        itemsContainer.innerHTML = phoneData.fridgeItems.map(item => `
            <div class="pc-fridge-item">
                <div class="pc-fridge-item-icon">${getFridgeItemIcon(item.name)}</div>
                <div class="pc-fridge-item-info">
                    <div class="pc-fridge-item-name">${item.name}</div>
                    <div class="pc-fridge-item-comment">${item.comment}</div>
                </div>
            </div>
        `).join('');
    } else {
        itemsContainer.innerHTML = '<div class="pc-fridge-empty">点击右上角刷新按钮<br>看看冰箱里有什么~</div>';
    }
    
    // 加载便签
    if (phoneData.fridgeNote) {
        noteContent.textContent = phoneData.fridgeNote;
    } else {
        noteContent.textContent = '还没有便签内容~';
    }
}

// 根据物品名称返回对应的emoji图标
function getFridgeItemIcon(name) {
    const iconMap = {
        '牛奶': '🥛', '奶': '🥛',
        '鸡蛋': '🥚', '蛋': '🥚',
        '啤酒': '🍺', '酒': '🍺',
        '可乐': '🥤', '饮料': '🥤', '果汁': '🧃',
        '水果': '🍎', '苹果': '🍎', '橙子': '🍊', '香蕉': '🍌', '葡萄': '🍇',
        '蔬菜': '🥬', '青菜': '🥬', '白菜': '🥬', '胡萝卜': '🥕', '番茄': '🍅', '西红柿': '🍅',
        '肉': '🥩', '牛肉': '🥩', '猪肉': '🥓', '鸡肉': '🍗', '鱼': '🐟',
        '面包': '🍞', '蛋糕': '🍰', '甜点': '🍰',
        '剩饭': '🍚', '米饭': '🍚', '饭': '🍚',
        '剩菜': '🥡', '外卖': '🥡',
        '冰淇淋': '🍦', '雪糕': '🍦',
        '奶酪': '🧀', '芝士': '🧀',
        '酱': '🫙', '酱油': '🫙', '调料': '🧂',
        '零食': '🍪', '薯片': '🍟', '饼干': '🍪',
        '水': '💧', '矿泉水': '💧',
        '豆腐': '🧈', '黄油': '🧈',
        '泡菜': '🥒', '咸菜': '🥒'
    };
    
    for (let key in iconMap) {
        if (name.includes(key)) {
            return iconMap[key];
        }
    }
    return '📦';
}

// 生成冰箱内容
async function generateFridgeContent() {
    if (!phoneCheckCurrentCharId) return;
    
    // 显示加载状态
    document.getElementById('pcFridgeLoading').style.display = 'flex';
    document.querySelector('.pc-fridge-refresh-btn').classList.add('loading');
    
    try {
        // 获取角色信息
        const chat = chats.find(c => c.id === phoneCheckCurrentCharId);
        if (!chat) throw new Error('角色不存在');
        
           // 统一取材：人设 + 最近100条聊天 + 全部长期记忆
        const sourceData = await getPhoneCheckPromptSources(phoneCheckCurrentCharId);
        const personality = sourceData.personalityText || '';
        const recentChatText = sourceData.recentChatText || '（无最近聊天记录）';
        const memoryText = sourceData.memoryText || '（无长期记忆）';
        
        if (!personality.trim()) {
            throw new Error('请先在角色资料里填写“他的人设”');
        }

        // 获取API配置
        const phoneData = phoneCheckDataCache[phoneCheckCurrentCharId] || {};
        let apiConfig = null;
        
        if (phoneData.apiSchemeId) {
            await new Promise(resolve => {
                loadFromDB('apiSchemes', (data) => {
                    const schemes = (data && data.list) ? data.list : (Array.isArray(data) ? data : []);
                    apiConfig = schemes.find(s => s.id === phoneData.apiSchemeId);
                    resolve();
                });
            });
        }
        
        if (!apiConfig) {
            await new Promise(resolve => {
                loadFromDB('apiConfig', (data) => {
                    apiConfig = data;
                    resolve();
                });
            });
        }
        
        if (!apiConfig || !apiConfig.baseUrl || !apiConfig.apiKey) {
            throw new Error('请先设置API');
        }
        
        // 构建prompt
           const prompt = `你是${chat.name}。请根据【人设】【最近100条聊天记录】【全部长期记忆】生成你家冰箱里的内容，以及冰箱门上贴着的一张便签。要求像真实活人在过日子的冰箱，不要像样板房道具。

【人设】：
${personality}

【最近100条聊天记录】：
${recentChatText}

【全部长期记忆】：
${memoryText}

核心规则：
1. 必须同时参考人设、聊天记录、长期记忆，不能只按人设自由发挥
2. 冰箱内容要体现真实生活习惯：常吃什么、懒不懒、会不会囤东西、会不会剩菜、偏好什么口味、会不会买饮料零食、会不会做饭
3. 如果聊天记录和长期记忆里提到过某些食物、饮料、口味、购物习惯、作息、养生习惯、熬夜习惯、爱吃或讨厌的东西，要自然反映在冰箱里
4. 不能编造和资料完全不符的大型生活设定，只写日常、具体、可相信的内容
5. 整体要有活人感：冰箱里可以乱一点、杂一点，不必每样都健康整齐，也不必每样都精致

内容要求：
1. 生成 5-8 个 fridgeItems
2. 物品类型自然混合，尽量包含：
   - 日常食材
   - 饮料
   - 零食/甜品
   - 剩菜/半成品/速食
   - 调味或囤货类中的少量项目
3. 不要所有东西都“很会生活”，也不要所有东西都“完全摆烂”，要像这个人真实会有的冰箱
4. 至少 2-3 个物品能看出和聊天记录或长期记忆有细节关联
5. 允许有一些很普通但很真实的东西，比如矿泉水、鸡蛋、牛奶、可乐、半盒蛋糕、昨晚剩下的东西、速冻食品之类

每个 fridgeItems 条目必须包含：
- name：物品名，像真实冰箱里会有的
- comment：本人看到这个东西时会说的话/吐槽/备注，要像这个人的语气，长度有短有长

便签 note 要求：
1. 便签要像真的贴在冰箱门上的，不要写成长文
2. 可以是购物清单、提醒事项、别忘了吃、快过期提醒、顺手写的小话、嘴硬式自我提醒
3. 如果聊天记录和长期记忆里有能转成提醒的小事，也可以自然写进去
4. 整体感觉要像“随手贴的生活便签”，平凡、具体、有一点个人味道

风格要求：
1. comment 不要每条都一个长度，有的简短，有的多一句吐槽
2. 可以有一点懒、一点挑食、一点嘴硬、一点可爱、一点生活无奈
3. 冰箱内容应该让人看出这个人怎么生活，而不只是“他的人设标签”
4. 不要写得像美食博主，也不要写得像极端穷或极端奢华

请严格用以下JSON格式返回，不要有其他内容：
{
  "fridgeItems": [
    { "name": "物品名", "comment": "你的点评/吐槽" }
  ],
  "note": "便签内容"
}`;

        // 调用API
        const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiConfig.apiKey}`
            },
            body: JSON.stringify({
                model: apiConfig.defaultModel || apiConfig.model || 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.8
            })
        });
        
        if (!response.ok) {
            throw new Error('API请求失败');
        }
        
        const result = await response.json();
        const content = result.choices[0].message.content;
        
        // 解析JSON
        let fridgeData;
        try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                fridgeData = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('无法解析返回内容');
            }
        } catch (e) {
            throw new Error('解析失败：' + e.message);
        }
        
        // 保存数据
        savePhoneCheckData(phoneCheckCurrentCharId, {
            fridgeItems: fridgeData.fridgeItems || [],
            fridgeNote: fridgeData.note || '',
            fridgeGeneratedAt: new Date().toLocaleString()
        });
        
        // 更新显示
        const updatedPhoneData = phoneCheckDataCache[phoneCheckCurrentCharId] || {};
        loadFridgeContent(updatedPhoneData);
        
    } catch (error) {
        console.error('生成冰箱内容失败:', error);
        alert('生成失败：' + error.message);
    } finally {
        // 隐藏加载状态
        document.getElementById('pcFridgeLoading').style.display = 'none';
        document.querySelector('.pc-fridge-refresh-btn').classList.remove('loading');
    }
}

// ============ 查手机浏览器功能 ============

let pcBrowserHistoryData = [];

// 打开浏览器页面
function openPhoneCheckBrowser() {
    if (!phoneCheckCurrentCharId) return;
    
    const phoneData = phoneCheckDataCache[phoneCheckCurrentCharId] || {};
    
    // 加载已保存的浏览记录
    pcBrowserHistoryData = phoneData.browserHistory || [];
    loadBrowserHistory();
    
    // 确保显示历史视图
    document.getElementById('pcBrowserHistoryView').style.display = 'flex';
    document.getElementById('pcBrowserDetailView').style.display = 'none';
    
    // 隐藏Dock栏
    document.querySelector('.pc-dock').style.display = 'none';
    
    document.getElementById('phoneCheckBrowserScreen').style.display = 'flex';
}

// 关闭浏览器页面
function closePhoneCheckBrowser() {
    document.getElementById('phoneCheckBrowserScreen').style.display = 'none';
    
    // 显示Dock栏
    document.querySelector('.pc-dock').style.display = 'flex';
}

// 加载浏览记录列表
function loadBrowserHistory() {
    const listContainer = document.getElementById('pcBrowserHistoryList');
    
    if (pcBrowserHistoryData.length > 0) {
        listContainer.innerHTML = pcBrowserHistoryData.map((item, index) => `
            <div class="pc-browser-history-item" onclick="openBrowserDetail(${index})">
                <div class="pc-browser-history-icon">${getBrowserTypeIcon(item.type)}</div>
                <div class="pc-browser-history-info">
                    <div class="pc-browser-history-title">${item.title}</div>
                    <div class="pc-browser-history-summary">${item.summary}</div>
                    <div class="pc-browser-history-time">${item.time}</div>
                </div>
            </div>
        `).join('');
    } else {
        listContainer.innerHTML = '<div class="pc-browser-empty">点击右上角刷新按钮<br>生成浏览记录~</div>';
    }
}

// 根据类型返回图标
function getBrowserTypeIcon(type) {
    const iconMap = {
        'news': '📰',
        'shopping': '🛒',
        'video': '🎬',
        'social': '💬',
        'search': '🔍',
        'article': '📄',
        'music': '🎵',
        'game': '🎮',
        'food': '🍔',
        'travel': '✈️',
        'health': '💊',
        'study': '📚'
    };
    return iconMap[type] || '🌐';
}

// 打开浏览器详情页
// 打开浏览器详情页
function openBrowserDetail(index) {
    const item = pcBrowserHistoryData[index];
    if (!item) return;
    
    // 填充头部内容
    document.getElementById('pcBrowserUrlText').textContent = generateFakeUrl(item.type, item.title);
    document.getElementById('pcBrowserArticleType').textContent = getTypeLabel(item.type);
    document.getElementById('pcBrowserArticleTitle').textContent = item.title;
    
    // 填充作者信息
    document.getElementById('pcBrowserAuthorAvatar').textContent = getBrowserTypeIcon(item.type);
    document.getElementById('pcBrowserAuthorName').textContent = generateFakeAuthor(item.type);
    document.getElementById('pcBrowserArticleTime').textContent = item.time;
    
    // 随机生成阅读量和评论数
    document.getElementById('pcBrowserViews').textContent = generateRandomViews();
    document.getElementById('pcBrowserComments').textContent = generateRandomComments();
    
    // 填充正文
    document.getElementById('pcBrowserArticleBody').textContent = item.content;
    
    // 生成相关推荐
    generateRelatedItems(item.type, index);
    
    // 更新头部渐变色
    updateHeaderGradient(item.type);
    
    // 切换视图
    document.getElementById('pcBrowserHistoryView').style.display = 'none';
    document.getElementById('pcBrowserDetailView').style.display = 'flex';
}

// 生成假作者名
function generateFakeAuthor(type) {
    const authors = {
        'news': ['今日热点', '新闻早班车', '环球资讯', '头条播报'],
        'shopping': ['好物推荐官', '省钱小能手', '购物达人', '品质生活家'],
        'video': ['影视圈', '追剧小分队', '电影迷', '视频号'],
        'social': ['吃瓜群众', '八卦前线', '社交圈', '朋友圈精选'],
        'search': ['搜索结果', '网页快照', '百科知识', '问答社区'],
        'article': ['深度阅读', '文章精选', '知识博主', '原创作者'],
        'music': ['音乐电台', '歌单推荐', '乐评人', '音乐达人'],
        'game': ['游戏攻略站', '玩家社区', '游戏资讯', '电竞前线'],
        'food': ['美食探店', '吃货日记', '菜谱大全', '觅食指南'],
        'travel': ['旅行攻略', '出行指南', '景点推荐', '旅游达人'],
        'health': ['健康生活', '养生堂', '医学科普', '健身指南'],
        'study': ['学习帮', '知识课堂', '教育资讯', '成长学院']
    };
    const list = authors[type] || ['网络用户'];
    return list[Math.floor(Math.random() * list.length)];
}

// 生成随机阅读量
function generateRandomViews() {
    const num = Math.floor(Math.random() * 9000) + 1000;
    if (num >= 10000) {
        return (num / 10000).toFixed(1) + 'w';
    }
    return num >= 1000 ? (num / 1000).toFixed(1) + 'k' : num.toString();
}

// 生成随机评论数
function generateRandomComments() {
    return Math.floor(Math.random() * 200) + 10;
}

// 根据类型更新头部渐变色
function updateHeaderGradient(type) {
    const gradients = {
        'news': 'linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%)',
        'shopping': 'linear-gradient(135deg, #ff9a56 0%, #ff6b35 100%)',
        'video': 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
        'social': 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        'search': 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
        'article': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'music': 'linear-gradient(135deg, #ec4899 0%, #d946ef 100%)',
        'game': 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        'food': 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        'travel': 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
        'health': 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
        'study': 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
    };
    const header = document.querySelector('.pc-browser-article-header');
    if (header) {
        header.style.background = gradients[type] || gradients['article'];
    }
}

// 生成相关推荐
function generateRelatedItems(currentType, currentIndex) {
    const relatedList = document.getElementById('pcBrowserRelatedList');
    
    // 从其他浏览记录中选取2-3条作为推荐
    const otherItems = pcBrowserHistoryData.filter((_, i) => i !== currentIndex).slice(0, 3);
    
    if (otherItems.length > 0) {
        relatedList.innerHTML = otherItems.map((item, i) => `
            <div class="pc-browser-related-item" onclick="openBrowserDetail(${pcBrowserHistoryData.indexOf(item)})">
                <div class="pc-browser-related-icon">${getBrowserTypeIcon(item.type)}</div>
                <div class="pc-browser-related-info">
                    <div class="pc-browser-related-name">${item.title}</div>
                    <div class="pc-browser-related-desc">${item.summary}</div>
                </div>
            </div>
        `).join('');
    } else {
        relatedList.innerHTML = `
            <div class="pc-browser-related-item">
                <div class="pc-browser-related-icon">🔍</div>
                <div class="pc-browser-related-info">
                    <div class="pc-browser-related-name">暂无更多推荐</div>
                    <div class="pc-browser-related-desc">刷新生成更多内容</div>
                </div>
            </div>
        `;
    }
}

// 返回浏览记录列表
function backToBrowserHistory() {
    document.getElementById('pcBrowserDetailView').style.display = 'none';
    document.getElementById('pcBrowserHistoryView').style.display = 'flex';
}

// 生成假URL
function generateFakeUrl(type, title) {
    const domains = {
        'news': 'news.today.com',
        'shopping': 'shop.mall.com',
        'video': 'video.tube.com',
        'social': 'social.space.com',
        'search': 'search.web.com',
        'article': 'blog.reader.com',
        'music': 'music.play.com',
        'game': 'game.zone.com',
        'food': 'food.yummy.com',
        'travel': 'travel.go.com',
        'health': 'health.care.com',
        'study': 'learn.edu.com'
    };
    return domains[type] || 'www.example.com';
}

// 获取类型标签
function getTypeLabel(type) {
    const labels = {
        'news': '新闻资讯',
        'shopping': '购物',
        'video': '视频',
        'social': '社交动态',
        'search': '搜索结果',
        'article': '文章',
        'music': '音乐',
        'game': '游戏',
        'food': '美食',
        'travel': '旅行',
        'health': '健康',
        'study': '学习'
    };
    return labels[type] || '网页';
}

// 生成浏览记录
async function generateBrowserHistory() {
    if (!phoneCheckCurrentCharId) return;
    
    // 显示加载状态
    document.getElementById('pcBrowserLoading').style.display = 'flex';
    document.querySelector('.pc-browser-refresh-btn').classList.add('loading');
    
    try {
        // 获取角色信息
        const chat = chats.find(c => c.id === phoneCheckCurrentCharId);
        if (!chat) throw new Error('角色不存在');
        
              // 统一取材：人设 + 最近100条聊天 + 全部长期记忆
        const sourceData = await getPhoneCheckPromptSources(phoneCheckCurrentCharId);
        const personality = sourceData.personalityText || '';
        const recentChatText = sourceData.recentChatText || '（无最近聊天记录）';
        const memoryText = sourceData.memoryText || '（无长期记忆）';
        
        if (!personality.trim()) {
            throw new Error('请先在角色资料里填写“他的人设”');
        }

        // 获取API配置
        const phoneData = phoneCheckDataCache[phoneCheckCurrentCharId] || {};
        let apiConfig = null;
        
        if (phoneData.apiSchemeId) {
            await new Promise(resolve => {
                loadFromDB('apiSchemes', (data) => {
                    const schemes = (data && data.list) ? data.list : (Array.isArray(data) ? data : []);
                    apiConfig = schemes.find(s => s.id === phoneData.apiSchemeId);
                    resolve();
                });
            });
        }
        
        if (!apiConfig) {
            await new Promise(resolve => {
                loadFromDB('apiConfig', (data) => {
                    apiConfig = data;
                    resolve();
                });
            });
        }
        
        if (!apiConfig || !apiConfig.baseUrl || !apiConfig.apiKey) {
            throw new Error('请先设置API');
        }
        
        // 构建prompt
           const prompt = `你是${chat.name}。请根据【人设】【最近100条聊天记录】【全部长期记忆】生成你最近的手机浏览器搜索/浏览记录。要求像真实活人的浏览器历史，不要像为了展示设定而专门编的样板记录。

【人设】：
${personality}

【最近100条聊天记录】：
${recentChatText}

【全部长期记忆】：
${memoryText}

核心规则：
1. 必须同时参考人设、聊天记录、长期记忆，不能只按人设自由发挥
2. 浏览记录要体现真实人的搜索冲动和浏览习惯：临时起意、顺手搜一下、想确认某件事、对某个东西好奇、无聊刷到、想买、想吃、想看、想比较、想偷偷查
3. 如果聊天记录和长期记忆里出现过兴趣、烦恼、想买的东西、某句话、某种情绪、某个在意的人、日常问题、生活需求，都要自然转成浏览行为
4. 不能编造和资料完全无关的重大事件；没有依据时，就写成普通搜索、资讯阅读、生活查找、随手浏览
5. 整体要有活人感：有些记录很普通，有些有点尴尬，有些就是临时搜一下，不要每条都很“有意义”

生成要求：
1. 生成 5-6 条搜索/浏览记录
2. 类型可以多样：新闻(news)、购物(shopping)、视频(video)、社交(social)、搜索(search)、文章(article)、音乐(music)、游戏(game)、美食(food)、旅行(travel)、健康(health)、学习(study)
3. 至少满足这些分布：
   - 至少 2 条偏“生活需求/日常查找”
   - 至少 1 条偏“兴趣/娱乐/放松”
   - 至少 1 条偏“想买/想比较/想下单”
   - 至少 2 条能明显看出和聊天记录或长期记忆有细节关联
4. 内容方向可以自然包含：
   - 吃什么、买什么、去哪、怎么做
   - 某种情绪下的搜索
   - 某句在意的话延伸出来的搜索
   - 某样东西值不值得买
   - 某种小毛病、小困扰、小习惯
   - 某个突然想了解的话题
5. 允许出现一点点尴尬、嘴硬、在意、偷偷查，但不要过火，不要违法，不要露骨
6. 时间用相对时间：如“刚刚”“10分钟前”“2小时前”“昨天”等

每条记录必须包含：
- title：搜索关键词或网页标题，要像真实会搜/会点开的内容
- summary：一句简短描述
- time：相对时间
- type：类型
- content：完整网页正文，约 200-300 字，要像真实网页内容摘要或文章内容，不要写得太空

风格要求：
1. title 不要都很工整，允许像真实搜索词
2. summary 要像列表页里会看到的一句话
3. content 要像真的点开了一篇网页，不是单纯解释“这个人为什么会搜”
4. 不要把所有记录都写成高强度剧情线索，很多浏览历史本来就只是普通生活碎片
5. 浏览器历史应该让人感觉“这个人最近脑子里在想什么、在意什么、需要什么”

请严格用以下JSON格式返回，不要有其他内容：
{
  "browserHistory": [
    {
      "title": "搜索关键词或网页标题",
      "summary": "简短描述（一句话）",
      "time": "相对时间",
      "type": "类型",
      "content": "完整的网页内容正文"
    }
  ]
}`;

        // 调用API
        const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiConfig.apiKey}`
            },
            body: JSON.stringify({
                model: apiConfig.defaultModel || apiConfig.model || 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.9
            })
        });
        
        if (!response.ok) {
            throw new Error('API请求失败');
        }
        
        const result = await response.json();
        const content = result.choices[0].message.content;
        
        // 解析JSON
        let browserData;
        try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                browserData = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('无法解析返回内容');
            }
        } catch (e) {
            throw new Error('解析失败：' + e.message);
        }
        
        // 保存数据
        pcBrowserHistoryData = browserData.browserHistory || [];
        savePhoneCheckData(phoneCheckCurrentCharId, {
            browserHistory: pcBrowserHistoryData,
            browserGeneratedAt: new Date().toLocaleString()
        });
        
        // 更新显示
        loadBrowserHistory();
        
    } catch (error) {
        console.error('生成浏览记录失败:', error);
        alert('生成失败：' + error.message);
    } finally {
        // 隐藏加载状态
        document.getElementById('pcBrowserLoading').style.display = 'none';
        document.querySelector('.pc-browser-refresh-btn').classList.remove('loading');
    }
}

// ============ 查手机-备忘录功能 ============

let pcMemoNotesData = [];
let pcMemoCurrentIndex = -1;

// 打开备忘录
function openPhoneCheckMemo() {
    if (!phoneCheckCurrentCharId) return;

    const phoneData = phoneCheckDataCache[phoneCheckCurrentCharId] || {};
    pcMemoNotesData = phoneData.memoNotes || [];

    // 默认展示列表
    document.getElementById('pcMemoListView').style.display = 'flex';
    document.getElementById('pcMemoDetailView').style.display = 'none';

    renderMemoList();

    // 隐藏 Dock
    const dock = document.querySelector('.pc-dock');
    if (dock) dock.style.display = 'none';

    // 打开时确保左上角关闭按钮可见
const closeBtn = document.querySelector('#phoneCheckMemoScreen .pc-memo-back-btn');
if (closeBtn) closeBtn.style.display = 'flex';
    document.getElementById('phoneCheckMemoScreen').style.display = 'block';
}

// 关闭备忘录
function closePhoneCheckMemo() {
    document.getElementById('phoneCheckMemoScreen').style.display = 'none';

    // 显示 Dock
    const dock = document.querySelector('.pc-dock');
    if (dock) dock.style.display = 'flex';
}

// 渲染列表
function renderMemoList() {
    const listEl = document.getElementById('pcMemoList');
    if (!listEl) return;

    if (!pcMemoNotesData || pcMemoNotesData.length === 0) {
        listEl.innerHTML = '<div class="pc-memo-empty">点击右上角刷新按钮<br>生成 TA 的备忘录~</div>';
        return;
    }

    listEl.innerHTML = pcMemoNotesData.map((note, idx) => {
        const title = (note.title || '').trim() || '（无标题）';
        const body = (note.body || '').trim();
        const preview = body.replace(/\n+/g, ' ').slice(0, 120);
        const time = note.time || '';
        const hasPS = !!(note.ps && String(note.ps).trim());

        return `
            <div class="pc-memo-item" onclick="openMemoDetail(${idx})">
                <div class="pc-memo-item-title">${escapeHtml(title)}</div>
                <div class="pc-memo-item-preview">${escapeHtml(preview)}</div>
                <div class="pc-memo-item-meta">
                    <div>${escapeHtml(time)}</div>
                    ${hasPS ? '<div class="pc-memo-item-ps">PS</div>' : '<div></div>'}
                </div>
            </div>
        `;
    }).join('');
}

// 打开详情
function openMemoDetail(index) {
    const note = pcMemoNotesData[index];
    if (!note) return;

    pcMemoCurrentIndex = index;

    document.getElementById('pcMemoDetailTitle').textContent = note.title || '备忘录';
    document.getElementById('pcMemoDetailTime').textContent = note.time || '';
    document.getElementById('pcMemoDetailBody').textContent = note.body || '';

    const psWrap = document.getElementById('pcMemoDetailPS');
    const psText = document.getElementById('pcMemoDetailPSText');
    const ps = (note.ps || '').trim();

    if (ps) {
        psText.textContent = ps;
        psWrap.style.display = 'block';
    } else {
        psWrap.style.display = 'none';
    }

    document.getElementById('pcMemoListView').style.display = 'none';
    document.getElementById('pcMemoDetailView').style.display = 'flex';
    // 详情页只保留顶部返回（返回列表），隐藏左上角关闭按钮
const closeBtn = document.querySelector('#phoneCheckMemoScreen .pc-memo-back-btn');
if (closeBtn) closeBtn.style.display = 'none';
}

// 详情返回列表
function backToMemoList() {
    document.getElementById('pcMemoDetailView').style.display = 'none';
    document.getElementById('pcMemoListView').style.display = 'flex';
    // 回到列表页，恢复左上角关闭按钮
const closeBtn = document.querySelector('#phoneCheckMemoScreen .pc-memo-back-btn');
if (closeBtn) closeBtn.style.display = 'flex';
}

// 生成备忘录（约10条）
async function generateMemoNotes() {
    if (!phoneCheckCurrentCharId) return;

    const loadingEl = document.getElementById('pcMemoLoading');
    const refreshBtn = document.getElementById('pcMemoRefreshBtn');
    if (loadingEl) loadingEl.style.display = 'flex';
    if (refreshBtn) refreshBtn.classList.add('loading');

    try {
        const chat = chats.find(c => c.id === phoneCheckCurrentCharId);
        if (!chat) throw new Error('角色不存在');

        // 统一取材：人设 + 最近100条聊天 + 全部长期记忆
        const sourceData = await getPhoneCheckPromptSources(phoneCheckCurrentCharId);
        const personality = sourceData.personalityText || '';
        const recentChatText = sourceData.recentChatText || '（无最近聊天记录）';
        const memoryText = sourceData.memoryText || '（无长期记忆）';

        if (!personality.trim()) {
            throw new Error('请先在角色资料里填写“他的人设”');
        }


        // API配置：优先查手机方案，其次全局
        const phoneData = phoneCheckDataCache[phoneCheckCurrentCharId] || {};
        let apiConfig = null;

        if (phoneData.apiSchemeId) {
            await new Promise(resolve => {
                loadFromDB('apiSchemes', (data) => {
                    const schemes = (data && data.list) ? data.list : (Array.isArray(data) ? data : []);
                    apiConfig = schemes.find(s => s.id === phoneData.apiSchemeId);
                    resolve();
                });
            });
        }

        if (!apiConfig) {
            await new Promise(resolve => {
                loadFromDB('apiConfig', (data) => {
                    apiConfig = data;
                    resolve();
                });
            });
        }

        if (!apiConfig || !apiConfig.baseUrl || !apiConfig.apiKey) {
            throw new Error('请先设置API');
        }

              const prompt = `你是${chat.name}。请根据【人设】【最近100条聊天记录】【全部长期记忆】生成你手机里的“备忘录”，风格必须像真实 iOS 备忘录，而不是文学作品或日记作文。

【人设】：
${personality}

【最近100条聊天记录】：
${recentChatText}

【全部长期记忆】：
${memoryText}

生成原则：
1. 必须同时参考人设、聊天记录、长期记忆，可以但不能只按人设自由发挥
2. 备忘录要像“怕忘记所以记下来”的真实内容，重点写待办、日程、提醒、要记住的小事，而不是空泛抒情
3. 可以包含：todolist、购物清单、行程安排、容易忘的事、重要日期、别人提过的事、自己答应过的事、平凡但幸福的小事、突然冒出来的念头，细节小事、生活计划
4. 如果聊天记录里出现了具体事项、约定、提醒、反复提到的人或事，要自然转化成备忘录内容
5. 如果长期记忆里有重要的人、习惯、日期、偏好、经历，也要自然体现在备忘录里
6. 整体风格要像真实活人手机：有的很短，有的很碎，有的像清单，有的像一句提醒，不要每条都写得太完整太工整
7. 允许少量情绪和碎碎念，但核心仍然是“为了记住事情”
8. 内容要偏生活化、平凡、具体，带一点幸福感和真实感，比如记生日、记某句在意的话、记想一起做的小事
9. 不要编造聊天记录和长期记忆里完全没有依据的重大事件
10. 生成大约10条备忘录，其中至少：
   - 3条是待办/清单型
   - 2条是日程或提醒型
   - 2条和重要的人或日期有关
   - 2条体现平凡的小幸福或想记住的小事

每条必须包含：
- title：短标题，像真实备忘录标题
- body：正文，可多行，可简短，可清单式
- time：相对时间/日期
- ps：可选补充吐槽/补充提醒，没有就给空字符串

额外要求：
1. 标题不要太像文章标题，要像手机里自己写给自己看的
2. body 可以出现这种真实格式：
   - 分行短句
   - “1. 2. 3.” 形式
   - “记得……” “别忘了……” “顺手……” 这种口吻
3. 不要把每条都写得很长，长度有短有长
4. 至少有3条能让人看出来明显参考了聊天记录或长期记忆里的细节
5. 整体读起来要像这个人真的在生活，不是AI在概括人设

请严格只输出 JSON，不要输出多余文字，格式如下：
{
  "notes": [
    {"title":"", "body":"", "time":"", "ps":""}
  ]
}`;

        const res = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiConfig.apiKey}`
            },
            body: JSON.stringify({
                model: apiConfig.defaultModel || apiConfig.model || 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.85
            })
        });

        if (!res.ok) throw new Error('API请求失败');

        const json = await res.json();
        const content = json?.choices?.[0]?.message?.content || '';

        const match = content.match(/\{[\s\S]*\}/);
        if (!match) throw new Error('返回内容不是JSON');

        const parsed = JSON.parse(match[0]);
        const notes = Array.isArray(parsed.notes) ? parsed.notes : [];

        pcMemoNotesData = notes.slice(0, 12).map(n => ({
            title: (n.title || '').toString(),
            body: (n.body || '').toString(),
            time: (n.time || '').toString(),
            ps: (n.ps || '').toString()
        }));

        // 保存到 phoneCheckData（按角色）
        savePhoneCheckData(phoneCheckCurrentCharId, {
            memoNotes: pcMemoNotesData,
            memoGeneratedAt: new Date().toLocaleString()
        });

        // 回到列表并刷新
        document.getElementById('pcMemoDetailView').style.display = 'none';
        document.getElementById('pcMemoListView').style.display = 'flex';
        renderMemoList();

    } catch (e) {
        console.error(e);
        alert('生成失败：' + e.message);
    } finally {
        if (loadingEl) loadingEl.style.display = 'none';
        if (refreshBtn) refreshBtn.classList.remove('loading');
    }
}

// 简单转义，避免把内容当HTML插入
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ============ 查手机-相册功能 ============

let pcAlbumData = null;               // { albums: [...] }
let pcAlbumCurrentAlbumId = null;     // 当前相簿id
let pcAlbumCurrentPhotoId = null;     // 当前照片id

function openPhoneCheckAlbum() {
    if (!phoneCheckCurrentCharId) return;

    const phoneData = phoneCheckDataCache[phoneCheckCurrentCharId] || {};
    pcAlbumData = phoneData.albumData || null;

    // 默认显示相簿首页
    document.getElementById('pcAlbumAlbumsView').style.display = 'flex';
    document.getElementById('pcAlbumGridView').style.display = 'none';
    document.getElementById('pcAlbumViewer').style.display = 'none';

    renderAlbumList();

    // 隐藏Dock
    const dock = document.querySelector('.pc-dock');
    if (dock) dock.style.display = 'none';

    document.getElementById('phoneCheckAlbumScreen').style.display = 'block';
    // 相簿首页显示关闭/刷新按钮
const closeBtn = document.querySelector('#phoneCheckAlbumScreen .pc-album-back-btn');
const refreshBtn = document.querySelector('#phoneCheckAlbumScreen .pc-album-refresh-btn');
if (closeBtn) closeBtn.style.display = 'flex';
if (refreshBtn) refreshBtn.style.display = 'flex';
}

function closePhoneCheckAlbum() {
    document.getElementById('phoneCheckAlbumScreen').style.display = 'none';

    const dock = document.querySelector('.pc-dock');
    if (dock) dock.style.display = 'flex';
}

function backToAlbumsView() {
    document.getElementById('pcAlbumAlbumsView').style.display = 'flex';
    document.getElementById('pcAlbumGridView').style.display = 'none';
    document.getElementById('pcAlbumViewer').style.display = 'none';
    // 回到相簿首页：恢复“关闭相册/刷新”按钮
const closeBtn = document.querySelector('#phoneCheckAlbumScreen .pc-album-back-btn');
const refreshBtn = document.querySelector('#phoneCheckAlbumScreen .pc-album-refresh-btn');
if (closeBtn) closeBtn.style.display = 'flex';
if (refreshBtn) refreshBtn.style.display = 'flex';
}

function backToGridView() {
    document.getElementById('pcAlbumAlbumsView').style.display = 'none';
    document.getElementById('pcAlbumGridView').style.display = 'flex';
    document.getElementById('pcAlbumViewer').style.display = 'none';
    // 网格页仍隐藏“关闭相册/刷新”按钮
const closeBtn = document.querySelector('#phoneCheckAlbumScreen .pc-album-back-btn');
const refreshBtn = document.querySelector('#phoneCheckAlbumScreen .pc-album-refresh-btn');
if (closeBtn) closeBtn.style.display = 'none';
if (refreshBtn) refreshBtn.style.display = 'none';
}

function renderAlbumList() {
    const listEl = document.getElementById('pcAlbumAlbumList');
    if (!listEl) return;

    if (!pcAlbumData || !Array.isArray(pcAlbumData.albums) || pcAlbumData.albums.length === 0) {
        listEl.innerHTML = '<div class="pc-album-empty">点击右上角刷新按钮<br>生成 TA 的相册~</div>';
        return;
    }

    listEl.innerHTML = pcAlbumData.albums.map(album => {
        const count = Array.isArray(album.photos) ? album.photos.length : 0;
        const bg = album.coverGradient || 'linear-gradient(135deg,#667eea,#764ba2)';
        const desc = album.desc || '（未填写）';

        return `
            <div class="pc-album-album-item" onclick="openAlbumGrid('${escapeHtmlAttr(album.id)}')">
                <div class="pc-album-cover" style="background:${bg};">
                    <div class="pc-album-cover-main">相册</div>
                    <div class="pc-album-cover-sub">${escapeHtml(album.name || '相簿')}</div>
                </div>
                <div class="pc-album-album-info">
                    <div class="pc-album-album-name">${escapeHtml(album.name || '相簿')}</div>
                    <div class="pc-album-album-desc">${escapeHtml(desc)}</div>
                    <div class="pc-album-album-meta">${count} 张 · ${escapeHtml(album.updatedTime || '')}</div>
                </div>
            </div>
        `;
    }).join('');
}

function openAlbumGrid(albumId) {
    if (!pcAlbumData || !Array.isArray(pcAlbumData.albums)) return;

    const album = pcAlbumData.albums.find(a => String(a.id) === String(albumId));
    if (!album) return;

    pcAlbumCurrentAlbumId = album.id;

    document.getElementById('pcAlbumGridTitle').textContent = album.name || '相簿';

    document.getElementById('pcAlbumAlbumsView').style.display = 'none';
    document.getElementById('pcAlbumGridView').style.display = 'flex';
    document.getElementById('pcAlbumViewer').style.display = 'none';

    // 进入网格页：隐藏“关闭相册/刷新”按钮，避免覆盖误触
const closeBtn = document.querySelector('#phoneCheckAlbumScreen .pc-album-back-btn');
const refreshBtn = document.querySelector('#phoneCheckAlbumScreen .pc-album-refresh-btn');
if (closeBtn) closeBtn.style.display = 'none';
if (refreshBtn) refreshBtn.style.display = 'none';

    const gridEl = document.getElementById('pcAlbumGrid');
    if (!gridEl) return;

    const photos = Array.isArray(album.photos) ? album.photos : [];
    gridEl.innerHTML = photos.map(p => {
        const bg = p.thumbGradient || 'linear-gradient(135deg,#e0e5ec,#f5f7fa)';
        const emoji = p.emoji || '📷';
        const caption = p.caption || '（无标题）';
        return `
            <div class="pc-album-photo-thumb" style="background:${bg};" onclick="openAlbumPhoto('${escapeHtmlAttr(p.id)}')">
                <div class="pc-album-thumb-emoji">${escapeHtml(emoji)}</div>
                <div class="pc-album-thumb-caption">${escapeHtml(caption)}</div>
            </div>
        `;
    }).join('');
}

function openAlbumPhoto(photoId) {
    const album = pcAlbumData?.albums?.find(a => String(a.id) === String(pcAlbumCurrentAlbumId));
    if (!album) return;

    const photo = (album.photos || []).find(p => String(p.id) === String(photoId));
    if (!photo) return;

    pcAlbumCurrentPhotoId = photo.id;

    document.getElementById('pcAlbumViewerTitle').textContent = album.name || '照片';

    const card = document.getElementById('pcAlbumPhotoCard');
    const emojiEl = document.getElementById('pcAlbumPhotoEmoji');
    const captionEl = document.getElementById('pcAlbumPhotoCaption');

    const bg = photo.viewGradient || photo.thumbGradient || 'linear-gradient(135deg,#e0e5ec,#f5f7fa)';
    if (card) card.style.background = bg;

    if (emojiEl) emojiEl.textContent = photo.emoji || '📷';
    if (captionEl) captionEl.textContent = photo.caption || '';

    const meta = [];
    if (photo.time) meta.push(photo.time);
    if (photo.location) meta.push(photo.location);
    document.getElementById('pcAlbumPhotoMeta').textContent = meta.join(' · ') || '';

    const commentWrap = document.getElementById('pcAlbumPhotoCommentWrap');
    const commentText = document.getElementById('pcAlbumPhotoComment');
    const comment = (photo.comment || '').trim();

    if (comment) {
        commentText.textContent = comment;
        commentWrap.style.display = 'block';
    } else {
        commentWrap.style.display = 'none';
    }

    document.getElementById('pcAlbumAlbumsView').style.display = 'none';
    document.getElementById('pcAlbumGridView').style.display = 'none';
    document.getElementById('pcAlbumViewer').style.display = 'flex';
    // 进入查看页：隐藏“关闭相册/刷新”按钮，避免覆盖误触
const closeBtn = document.querySelector('#phoneCheckAlbumScreen .pc-album-back-btn');
const refreshBtn = document.querySelector('#phoneCheckAlbumScreen .pc-album-refresh-btn');
if (closeBtn) closeBtn.style.display = 'none';
if (refreshBtn) refreshBtn.style.display = 'none';
}

/* 生成相册数据（相簿 4~6个，每个 6~12张） */
async function generateAlbumData() {
    if (!phoneCheckCurrentCharId) return;

    const loadingEl = document.getElementById('pcAlbumLoading');
    const refreshBtn = document.getElementById('pcAlbumRefreshBtn');
    if (loadingEl) loadingEl.style.display = 'flex';
    if (refreshBtn) refreshBtn.classList.add('loading');

    try {
        const chat = chats.find(c => c.id === phoneCheckCurrentCharId);
        if (!chat) throw new Error('角色不存在');

              // 统一取材：人设 + 最近100条聊天 + 全部长期记忆
        const sourceData = await getPhoneCheckPromptSources(phoneCheckCurrentCharId);
        const personality = sourceData.personalityText || '';
        const recentChatText = sourceData.recentChatText || '（无最近聊天记录）';
        const memoryText = sourceData.memoryText || '（无长期记忆）';

        if (!personality.trim()) {
            throw new Error('请先在角色资料里填写“他的人设”');
        }
    

        // API配置（优先查手机方案）
        const phoneData = phoneCheckDataCache[phoneCheckCurrentCharId] || {};
        let apiConfig = null;

        if (phoneData.apiSchemeId) {
            await new Promise(resolve => {
                loadFromDB('apiSchemes', (data) => {
                    const schemes = (data && data.list) ? data.list : (Array.isArray(data) ? data : []);
                    apiConfig = schemes.find(s => s.id === phoneData.apiSchemeId);
                    resolve();
                });
            });
        }

        if (!apiConfig) {
            await new Promise(resolve => {
                loadFromDB('apiConfig', (data) => {
                    apiConfig = data;
                    resolve();
                });
            });
        }

        if (!apiConfig || !apiConfig.baseUrl || !apiConfig.apiKey) {
            throw new Error('请先设置API');
        }

            const prompt = `你是${chat.name}。请根据【人设】【最近100条聊天记录】【全部长期记忆】生成你手机相册里的内容，要求非常像真实人在用 iOS 相册，而不是为了展示设定专门编出来的相册。

【人设】：
${personality}

【最近100条聊天记录】：
${recentChatText}

【全部长期记忆】：
${memoryText}

核心原则：
1. 必须同时参考人设、聊天记录、长期记忆，不能只按人设自由发挥
2. 相册要有“活人感”与“私密感”，像真的会出现在一个人手机里的照片，而不是样板化分类
3. 允许出现以下类型，并尽量自然混合：
   - 抓拍/随手拍
   - 偷偷存下来的图
   - 自己的照片或自拍
   - 风景和生活碎片
   - 可爱治愈的小图、小动物、小摆件、小甜品
   - 截图（聊天截图、备忘截图、订单截图、网页截图、歌单截图等）
   - 和在意的人有关、带一点占有欲或偷偷在意感觉的内容
4. 如果聊天记录里提到过某些地点、食物、安排、兴趣、情绪、截图内容、在意的人或某句话，这些都可以自然转成相册里的照片来源
5. 如果长期记忆里有反复在意的人、场景、习惯、特殊日期、曾经发生的小事，也要自然体现在相册内容里
6. 不能编造聊天记录和长期记忆里完全没有依据的重大事实事件；没有证据的内容只能写成“存图、截图、路过看到、想起、随手拍、脑补氛围”
7. 整体风格要真实：有些照片很普通，有些照片根本没什么意义，但本人会留着；不要每张都很戏剧化

相簿设计要求：
1. 生成 4-6 个相簿（albums）
2. 相簿名必须像真实手机里会出现的名字，不要太文学化
3. 相簿类型建议从这些方向自然组合，不要求全部都有：
   - 最近 / 日常
   - 截图
   - 可爱东西 / 治愈收集
   - 自己 / 自拍 / 今日份
   - 风景 / 路上 / 乱拍
   - 偷偷存的 / 不给别人看 / 想删没删
4. 每个相簿 6-12 张照片条目

每张照片要求：
1. 不需要真实图片，用文字模拟即可
2. 每张必须包含：
   - emoji：代表画面的 emoji
   - caption：一句像本人会写的照片标题，短一点，自然一点
   - time：相对时间/日期
   - location：可选
   - comment：本人看到这张时会想到的备注/碎碎念，必须体现性格，也可以带一点嘴硬、占有欲、偷偷在意、治愈感
3. comment 不要都写成长段，有长有短
4. 照片内容必须混合“普通”和“私密”：
   - 普通：饭、天空、路上、桌面、杯子、猫狗、树影、便利店、地铁口、晚霞、乱拍
   - 私密：存下来的聊天截图、某句话截图、舍不得删的图、自己某张顺眼的自拍、偷偷留着的和某人有关的小东西
5. 至少满足下面这些分布：
   - 至少 1 个相簿明显偏“截图”
   - 至少 1 个相簿明显偏“生活/随手拍”
   - 至少 1 个相簿带“可爱治愈”或“偷偷存图”气质
   - 全部照片里至少 3 张能看出和聊天记录或长期记忆有细节关联
   - 全部照片里至少 2 张体现“在意某人/一点占有欲/偷偷留存”的感觉，但不要露骨，也不要编成已发生的大事
6. 不要让所有照片都很精致，允许一些废片感、抓拍感、乱拍感，越像活人越好

视觉字段要求：
1. 相簿封面用 coverGradient（CSS linear-gradient 字符串）
2. 照片缩略图用 thumbGradient
3. 查看页用 viewGradient
4. 渐变颜色保持柔和、日常、好看，不要太夸张

请严格只输出 JSON，不要输出多余文字，格式如下：
{
  "albums": [
    {
      "id": "recents",
      "name": "最近",
      "desc": "一句描述",
      "updatedTime": "如：刚刚/今天/昨天",
      "coverGradient": "linear-gradient(...)",
      "photos": [
        {
          "id": "p1",
          "emoji": "📷",
          "caption": "",
          "time": "",
          "location": "",
          "thumbGradient": "linear-gradient(...)",
          "viewGradient": "linear-gradient(...)",
          "comment": ""
        }
      ]
    }
  ]
}`;

        const res = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiConfig.apiKey}`
            },
            body: JSON.stringify({
                model: apiConfig.defaultModel || apiConfig.model || 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.9
            })
        });

        if (!res.ok) throw new Error('API请求失败');

        const json = await res.json();
        const content = json?.choices?.[0]?.message?.content || '';
        const match = content.match(/\{[\s\S]*\}/);
        if (!match) throw new Error('返回内容不是JSON');

        const parsed = JSON.parse(match[0]);
        const albums = Array.isArray(parsed.albums) ? parsed.albums : [];

        pcAlbumData = {
            albums: albums.slice(0, 6).map((a, idx) => ({
                id: (a.id || `album_${idx}`).toString(),
                name: (a.name || '相簿').toString(),
                desc: (a.desc || '').toString(),
                updatedTime: (a.updatedTime || '').toString(),
                coverGradient: (a.coverGradient || '').toString(),
                photos: Array.isArray(a.photos) ? a.photos.slice(0, 14).map((p, j) => ({
                    id: (p.id || `p_${idx}_${j}`).toString(),
                    emoji: (p.emoji || '📷').toString(),
                    caption: (p.caption || '').toString(),
                    time: (p.time || '').toString(),
                    location: (p.location || '').toString(),
                    thumbGradient: (p.thumbGradient || '').toString(),
                    viewGradient: (p.viewGradient || '').toString(),
                    comment: (p.comment || '').toString()
                })) : []
            }))
        };

        savePhoneCheckData(phoneCheckCurrentCharId, {
            albumData: pcAlbumData,
            albumGeneratedAt: new Date().toLocaleString()
        });

        // 回到相簿首页刷新
        backToAlbumsView();
        renderAlbumList();

    } catch (e) {
        console.error(e);
        alert('生成失败：' + e.message);
    } finally {
        if (loadingEl) loadingEl.style.display = 'none';
        if (refreshBtn) refreshBtn.classList.remove('loading');
    }
}

/* 简单转义 */
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function escapeHtmlAttr(str) {
    return escapeHtml(str).replace(/`/g, '&#096;');
}

// ============ 查手机-记仇本功能 ============

let pcGrudgeData = [];
let pcGrudgeCurrentIndex = -1;

function openPhoneCheckGrudge() {
    if (!phoneCheckCurrentCharId) return;

    const phoneData = phoneCheckDataCache[phoneCheckCurrentCharId] || {};
    pcGrudgeData = phoneData.grudgeData?.grudges || [];

    // 默认列表
    document.getElementById('pcGrudgeListView').style.display = 'flex';
    document.getElementById('pcGrudgeDetailView').style.display = 'none';

    // 确保关闭/刷新按钮可见
    const closeBtn = document.querySelector('#phoneCheckGrudgeScreen .pc-grudge-back-btn');
    const refreshBtn = document.querySelector('#phoneCheckGrudgeScreen .pc-grudge-refresh-btn');
    if (closeBtn) closeBtn.style.display = 'flex';
    if (refreshBtn) refreshBtn.style.display = 'flex';

    renderGrudgeList();

    // 隐藏Dock
    const dock = document.querySelector('.pc-dock');
    if (dock) dock.style.display = 'none';

    document.getElementById('phoneCheckGrudgeScreen').style.display = 'block';
}

function closePhoneCheckGrudge() {
    document.getElementById('phoneCheckGrudgeScreen').style.display = 'none';

    const dock = document.querySelector('.pc-dock');
    if (dock) dock.style.display = 'flex';
}

function renderGrudgeList() {
    const listEl = document.getElementById('pcGrudgeList');
    if (!listEl) return;

    if (!pcGrudgeData || pcGrudgeData.length === 0) {
        listEl.innerHTML = '<div class="pc-grudge-empty">点击右上角刷新按钮<br>看看 TA 又记了谁一笔…</div>';
        return;
    }

    listEl.innerHTML = pcGrudgeData.map((g, idx) => {
        const title = (g.title || '').trim() || '（无标题）';
        const summary = (g.summary || '').trim();
        const time = (g.time || '').trim();
        const level = Math.max(1, Math.min(5, parseInt(g.level || 2, 10)));

        return `
            <div class="pc-grudge-item" onclick="openGrudgeDetail(${idx})">
                <div class="pc-grudge-item-title">${escapeHtml(title)}</div>
                <div class="pc-grudge-item-summary">${escapeHtml(summary)}</div>
                <div class="pc-grudge-item-meta">
                    <div>${escapeHtml(time)}</div>
                    <div class="pc-grudge-level" title="记仇等级">
                        ${new Array(level).fill(0).map(() => '<span class="pc-grudge-dot"></span>').join('')}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function openGrudgeDetail(index) {
    const g = pcGrudgeData[index];
    if (!g) return;

    pcGrudgeCurrentIndex = index;

    document.getElementById('pcGrudgeDetailTitle').textContent = g.title || '记仇详情';
    document.getElementById('pcGrudgeDetailTime').textContent = g.time || '';

    document.getElementById('pcGrudgeDetailEvent').textContent = g.event || g.summary || '';
    document.getElementById('pcGrudgeDetailOS').textContent = g.os || '';

    const plan = (g.plan || '').trim();
    const planWrap = document.getElementById('pcGrudgePlanWrap');
    const planEl = document.getElementById('pcGrudgeDetailPlan');

    if (plan) {
        planEl.textContent = plan;
        planWrap.style.display = 'block';
    } else {
        planWrap.style.display = 'none';
    }

    // 切换视图
    document.getElementById('pcGrudgeListView').style.display = 'none';
    document.getElementById('pcGrudgeDetailView').style.display = 'flex';

    // 详情页隐藏“关闭/刷新”按钮，避免误触直接回主屏幕
    const closeBtn = document.querySelector('#phoneCheckGrudgeScreen .pc-grudge-back-btn');
    const refreshBtn = document.querySelector('#phoneCheckGrudgeScreen .pc-grudge-refresh-btn');
    if (closeBtn) closeBtn.style.display = 'none';
    if (refreshBtn) refreshBtn.style.display = 'none';
}

function backToGrudgeList() {
    document.getElementById('pcGrudgeDetailView').style.display = 'none';
    document.getElementById('pcGrudgeListView').style.display = 'flex';

    // 回到列表恢复按钮
    const closeBtn = document.querySelector('#phoneCheckGrudgeScreen .pc-grudge-back-btn');
    const refreshBtn = document.querySelector('#phoneCheckGrudgeScreen .pc-grudge-refresh-btn');
    if (closeBtn) closeBtn.style.display = 'flex';
    if (refreshBtn) refreshBtn.style.display = 'flex';
}

async function generateGrudgeData() {
    if (!phoneCheckCurrentCharId) return;

    const loadingEl = document.getElementById('pcGrudgeLoading');
    const refreshBtn = document.getElementById('pcGrudgeRefreshBtn');
    if (loadingEl) loadingEl.style.display = 'flex';
    if (refreshBtn) refreshBtn.classList.add('loading');

    try {
        const chat = chats.find(c => c.id === phoneCheckCurrentCharId);
        if (!chat) throw new Error('角色不存在');

          // 统一取材：人设 + 最近100条聊天 + 全部长期记忆
        const sourceData = await getPhoneCheckPromptSources(phoneCheckCurrentCharId);
        const personality = sourceData.personalityText || '';
        const recentChatText = sourceData.recentChatText || '（无最近聊天记录）';
        const memoryText = sourceData.memoryText || '（无长期记忆）';

        if (!personality.trim()) throw new Error('请先在角色资料里填写“他的人设”');

        // API配置：优先查手机方案，其次全局
        const phoneData = phoneCheckDataCache[phoneCheckCurrentCharId] || {};
        let apiConfig = null;

        if (phoneData.apiSchemeId) {
            await new Promise(resolve => {
                loadFromDB('apiSchemes', (data) => {
                    const schemes = (data && data.list) ? data.list : (Array.isArray(data) ? data : []);
                    apiConfig = schemes.find(s => s.id === phoneData.apiSchemeId);
                    resolve();
                });
            });
        }

        if (!apiConfig) {
            await new Promise(resolve => {
                loadFromDB('apiConfig', (data) => {
                    apiConfig = data;
                    resolve();
                });
            });
        }

        if (!apiConfig || !apiConfig.baseUrl || !apiConfig.apiKey) throw new Error('请先设置API');

                const prompt = `你就是${chat.name}。现在请你用“你自己私下写记仇本”的口吻，生成手机里的“记仇本”内容。必须根据【人设】【最近100条聊天记录】【全部长期记忆】来写，重点不是分析自己，而是像你本人偷偷记下一笔一笔的小账。

【人设】：
${personality}

【最近100条聊天记录】：
${recentChatText}

【全部长期记忆】：
${memoryText}

最重要规则：
1. 必须同时参考人设、聊天记录、长期记忆，不能只按人设自由发挥
2. 所有条目都必须写成“第一人称私人记录”，像你自己写给自己看
3. 禁止用旁白、分析口吻、上帝视角，不要写成“他因为……所以……”“这是一次……”这种总结句
4. 要像真的会记在手机私密记仇本里：嘴硬、委屈、吃醋、别扭、很气但其实很在意
5. 允许甜一点、酸一点、幼稚一点，但不要太油，不要恶意，不要阴暗报复
6. 所有条目尽量从聊天记录和长期记忆里提取依据；如果依据不足，只能写小情绪、小脑补、小委屈，不能编造重大事件
7. 禁止编造没有依据的见面、送礼、旅行、关系确认、重大冲突等事实

条目方向：
1. 重点写 user 相关的小破事，可以记这些：
   - 回消息慢了
   - 只回几个字
   - 今天没主动来找我
   - 夸别人好看
   - 提到别人让我不爽
   - 没接住我的情绪
   - 没记住我说的话
   - 明明在意却装无所谓
   - 打情骂俏、互怼、嘴硬里的小委屈
2. 也可以少量写其他日常不爽，但 user 相关要占大头
3. 记仇不是纯生气，很多其实是“因为在意所以记得特别清楚”

数量要求：
1. 生成 8-12 条
2. 至少 4 条明显和 user 有关
3. 至少 2 条带吃醋/占有欲/比较心理
4. 至少 2 条偏委屈，不是发火，而是心里不舒服
5. 至少 2 条带嘴硬心软、打情骂俏感
6. 至少 4 条能明显看出参考了聊天记录或长期记忆细节

每条必须包含：
- title：像我自己随手记的短标题，短一点，别像文章名
- summary：一句我自己写的简短总结，也必须是第一人称语感，不要像旁白
- time：相对时间/日期
- level：1-5 的记仇等级
- event：把这笔账记清楚，必须像“我在回想这件事”，不是客观报道
- os：内心OS，必须非常像我本人当下的小声吐槽/嘴硬/委屈/吃醋
- plan：可选，下次打算怎么办；也要像我自己写的，可以幼稚一点、嘴硬一点，没有就空字符串

写法硬性要求：
1. title / summary / event / os / plan 全部都要尽量有“我”的语感
2. 可以直接写：
   - “又记一笔”
   - “这也能忘？”
   - “行，我记住了”
   - “嘴上说不在意，其实我记得很清楚”
   - “今天这笔先欠着”
3. event 要像我在翻旧账，不要像系统摘要
4. os 要最像真人，允许碎、短、别扭、可爱、酸一点
5. plan 不一定真要报复，很多时候可以是：
   - “先不理他五分钟”
   - “下次也让他等一下”
   - “算了，还是舍不得”
   - “先记着，以后再说”
6. level 不要全高，很多小事只是轻轻记一笔

输出风格提醒：
- 像我自己写给自己看
- 不是角色分析
- 不是事件报告
- 不是小说旁白
- 是私密、小心眼、很在意的记账本

请严格只输出 JSON，不要输出多余文字：
{
  "grudges": [
    {
      "title": "",
      "summary": "",
      "time": "",
      "level": 3,
      "event": "",
      "os": "",
      "plan": ""
    }
  ]
}`;

        const res = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiConfig.apiKey}`
            },
            body: JSON.stringify({
                model: apiConfig.defaultModel || apiConfig.model || 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.9
            })
        });

        if (!res.ok) throw new Error('API请求失败');

        const json = await res.json();
        const content = json?.choices?.[0]?.message?.content || '';
        const match = content.match(/\{[\s\S]*\}/);
        if (!match) throw new Error('返回内容不是JSON');

        const parsed = JSON.parse(match[0]);
        const grudges = Array.isArray(parsed.grudges) ? parsed.grudges : [];

        pcGrudgeData = grudges.slice(0, 12).map(g => ({
            title: (g.title || '').toString(),
            summary: (g.summary || '').toString(),
            time: (g.time || '').toString(),
            level: parseInt(g.level || 2, 10),
            event: (g.event || '').toString(),
            os: (g.os || '').toString(),
            plan: (g.plan || '').toString()
        }));

        savePhoneCheckData(phoneCheckCurrentCharId, {
            grudgeData: {
                grudges: pcGrudgeData,
                generatedAt: new Date().toLocaleString()
            }
        });

        // 生成完回到列表展示
        backToGrudgeList();
        renderGrudgeList();

    } catch (e) {
        console.error(e);
        alert('生成失败：' + e.message);
    } finally {
        if (loadingEl) loadingEl.style.display = 'none';
        if (refreshBtn) refreshBtn.classList.remove('loading');
    }
}

// ============ 查手机-恋爱记功能 ============

let pcLoveDiaryEntries = [];
let pcLoveCurrentIndex = -1;

function openPhoneCheckLoveDiary() {
    if (!phoneCheckCurrentCharId) return;

    const phoneData = phoneCheckDataCache[phoneCheckCurrentCharId] || {};
    pcLoveDiaryEntries = phoneData.loveDiaryData?.entries || [];

    // 默认列表
    document.getElementById('pcLoveListView').style.display = 'flex';
    document.getElementById('pcLoveDetailView').style.display = 'none';

    // 首页按钮可见
    const closeBtn = document.querySelector('#phoneCheckLoveDiaryScreen .pc-love-back-btn');
    const refreshBtn = document.querySelector('#phoneCheckLoveDiaryScreen .pc-love-refresh-btn');
    if (closeBtn) closeBtn.style.display = 'flex';
    if (refreshBtn) refreshBtn.style.display = 'flex';

    renderLoveList();

    // 隐藏Dock
    const dock = document.querySelector('.pc-dock');
    if (dock) dock.style.display = 'none';

    document.getElementById('phoneCheckLoveDiaryScreen').style.display = 'block';
}

function closePhoneCheckLoveDiary() {
    document.getElementById('phoneCheckLoveDiaryScreen').style.display = 'none';

    const dock = document.querySelector('.pc-dock');
    if (dock) dock.style.display = 'flex';
}

function renderLoveList() {
    const listEl = document.getElementById('pcLoveList');
    if (!listEl) return;

    if (!pcLoveDiaryEntries || pcLoveDiaryEntries.length === 0) {
        listEl.innerHTML = '<div class="pc-love-empty">点击右上角刷新按钮<br>生成 TA 的恋爱记~</div>';
        return;
    }

    listEl.innerHTML = pcLoveDiaryEntries.map((e, idx) => {
        const title = (e.title || '').trim() || '（无标题）';
        const content = (e.content || '').trim();
        const preview = content.replace(/\n+/g, ' ').slice(0, 120);
        const time = (e.time || '').trim();

        return `
            <div class="pc-love-item" onclick="openLoveDetail(${idx})">
                <div class="pc-love-item-title">${escapeHtml(title)}</div>
                <div class="pc-love-item-preview">${escapeHtml(preview)}</div>
                <div class="pc-love-item-meta">${escapeHtml(time)}</div>
            </div>
        `;
    }).join('');
}

function openLoveDetail(index) {
    const entry = pcLoveDiaryEntries[index];
    if (!entry) return;

    pcLoveCurrentIndex = index;

    document.getElementById('pcLoveDetailTitle').textContent = '恋爱记';
    document.getElementById('pcLoveDetailTime').textContent = entry.time || '';
    document.getElementById('pcLovePaperTitle').textContent = entry.title || '';
    document.getElementById('pcLovePaperBody').textContent = entry.content || '';

    const ps = (entry.ps || '').trim();
    const psWrap = document.getElementById('pcLovePSWrap');
    const psText = document.getElementById('pcLovePSText');
    if (ps) {
        psText.textContent = ps;
        psWrap.style.display = 'block';
    } else {
        psWrap.style.display = 'none';
    }



    // 切换视图
    document.getElementById('pcLoveListView').style.display = 'none';
    document.getElementById('pcLoveDetailView').style.display = 'flex';

    // 详情页隐藏关闭/刷新，避免误触回主屏幕
    const closeBtn = document.querySelector('#phoneCheckLoveDiaryScreen .pc-love-back-btn');
    const refreshBtn = document.querySelector('#phoneCheckLoveDiaryScreen .pc-love-refresh-btn');
    if (closeBtn) closeBtn.style.display = 'none';
    if (refreshBtn) refreshBtn.style.display = 'none';
}

function backToLoveList() {
    document.getElementById('pcLoveDetailView').style.display = 'none';
    document.getElementById('pcLoveListView').style.display = 'flex';

    const closeBtn = document.querySelector('#phoneCheckLoveDiaryScreen .pc-love-back-btn');
    const refreshBtn = document.querySelector('#phoneCheckLoveDiaryScreen .pc-love-refresh-btn');
    if (closeBtn) closeBtn.style.display = 'flex';
    if (refreshBtn) refreshBtn.style.display = 'flex';
}

async function generateLoveDiary() {
    if (!phoneCheckCurrentCharId) return;

    const loadingEl = document.getElementById('pcLoveLoading');
    const refreshBtn = document.getElementById('pcLoveRefreshBtn');
    if (loadingEl) loadingEl.style.display = 'flex';
    if (refreshBtn) refreshBtn.classList.add('loading');

    try {
        const chat = chats.find(c => c.id === phoneCheckCurrentCharId);
        if (!chat) throw new Error('角色不存在');

              // 统一取材：人设 + 最近100条聊天 + 全部长期记忆
        const sourceData = await getPhoneCheckPromptSources(phoneCheckCurrentCharId);
        const personality = sourceData.personalityText || '';
        const recentChatText = sourceData.recentChatText || '（无最近聊天记录）';
        const memoryText = sourceData.memoryText || '（无长期记忆）';

        if (!personality.trim()) throw new Error('请先在角色资料里填写“他的人设”');

        // API配置：优先查手机方案，其次全局
        const phoneData = phoneCheckDataCache[phoneCheckCurrentCharId] || {};
        let apiConfig = null;

        if (phoneData.apiSchemeId) {
            await new Promise(resolve => {
                loadFromDB('apiSchemes', (data) => {
                    const schemes = (data && data.list) ? data.list : (Array.isArray(data) ? data : []);
                    apiConfig = schemes.find(s => s.id === phoneData.apiSchemeId);
                    resolve();
                });
            });
        }

        if (!apiConfig) {
            await new Promise(resolve => {
                loadFromDB('apiConfig', (data) => {
                    apiConfig = data;
                    resolve();
                });
            });
        }

        if (!apiConfig || !apiConfig.baseUrl || !apiConfig.apiKey) throw new Error('请先设置API');

             const prompt = `你是${chat.name}。请根据【人设】【最近100条聊天记录】【全部长期记忆】写你的“恋爱记”，风格要像真实手机里只给自己看的私密恋爱记录，不要写成文学散文，也不要只做设定发挥。

【人设】：
${personality}

【最近100条聊天记录】：
${recentChatText}

【全部长期记忆】：
${memoryText}

核心规则：
1. 必须同时参考人设、聊天记录、长期记忆，不能只按人设自由发挥
2. 内容要有“活人感”和“恋爱中的私密感”，像真的会偷偷记在手机里，带一点可爱碎碎念、黏人、小心动、小吃醋、小期待
3. 可以写这些方向，并尽量自然混合：
   - 日常小事
   - 心动瞬间
   - 约会记录
   - 纪念日
   - 想对你说
   - 吃醋小情绪
   - 未来期许
   - 可爱碎碎恋
   - 偷偷喜欢你
   - 专属小甜蜜
   - 被治愈、被可爱到
   - 黏人、早安、想念、舍不得睡之类的小心情
4. 如果聊天记录和长期记忆里有明确依据，可以写成真实发生过的小事、某天的情绪、某句让人心动的话、某种反复出现的互动方式
5. 如果没有明确证据，就只能写成“想象/如果/想对你说/偷偷希望/未来想一起做”的形式，不能编造成已经发生的重大事实
6. 严禁无依据地写成已经发生过的见面、送礼、旅行、关系确认、纪念日庆祝、大型约会等重大事件
7. 整体风格要甜一点、软一点、在意一点，但不要太油、太肉麻、太像言情小说
8. 不要每条都一个调性，要有甜、酸、黏、委屈、被治愈、偷偷开心等起伏

内容要求：
1. 生成大约10条 entries
2. 至少满足下面这些类型分布：
   - 至少 2 条是“日常小事 / 小甜蜜”
   - 至少 2 条是“心动瞬间 / 被治愈 / 被可爱到”
   - 至少 1 条是“想对你说”
   - 至少 1 条是“吃醋 / 小委屈 / 黏人”
   - 至少 1 条是“未来期许 / 如果以后 / 想一起做”
   - 如果聊天记录或长期记忆里有明确依据，可以有 1-2 条写“约会记录 / 纪念日 / 一起做过的小事”；如果没有依据，就不要强写成事实
3. 至少有 4 条能明显看出参考了聊天记录或长期记忆里的细节
4. 内容重点放在“小而具体”的恋爱感，不要全写大段抒情

每条必须包含：
- title：短标题，要像自己起的，不要太像文章名
- time：相对时间/日期
- content：正文，可分段，可长可短，要像真实手机里的恋爱记录
- ps：可选，一句补充的小声嘀咕/嘴硬/害羞/别扭，没有就给空字符串
- hasFantasy：true/false，表示这条里是否包含幻想、小剧场、未来想象、如果式内容

写法规则：
1. “已经发生的事实”只能来自聊天记录和长期记忆里有依据的内容
2. “没证据但很想写”的内容，统一写成：
   - 我想……
   - 如果有一天……
   - 其实有点想……
   - 下次要是能……
   - 偷偷记一下……
3. 允许有一些很可爱的黏人感、早安情绪、舍不得、偷偷开心、看到消息时的心情
4. 允许有轻微吃醋和占有欲，但不要过火
5. 不要写成每天都惊天动地，很多条目应该只是很普通的小事，却因为喜欢所以记住了
6. 整体要像真的喜欢一个人时会留下的私人碎片

请严格只输出 JSON，不要输出多余文字：
{
  "entries": [
    {
      "title": "",
      "time": "",
      "content": "",
      "ps": "",
      "hasFantasy": false
    }
  ]
}`;

        const res = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiConfig.apiKey}`
            },
            body: JSON.stringify({
                model: apiConfig.defaultModel || apiConfig.model || 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.88
            })
        });

        if (!res.ok) throw new Error('API请求失败');

        const json = await res.json();
        const content = json?.choices?.[0]?.message?.content || '';
        const match = content.match(/\{[\s\S]*\}/);
        if (!match) throw new Error('返回内容不是JSON');

        const parsed = JSON.parse(match[0]);
        const entries = Array.isArray(parsed.entries) ? parsed.entries : [];

        pcLoveDiaryEntries = entries.slice(0, 12).map(e => ({
            title: (e.title || '').toString(),
            time: (e.time || '').toString(),
            content: (e.content || '').toString(),
            ps: (e.ps || '').toString(),
            hasFantasy: !!e.hasFantasy
        }));

        savePhoneCheckData(phoneCheckCurrentCharId, {
            loveDiaryData: {
                entries: pcLoveDiaryEntries,
                generatedAt: new Date().toLocaleString()
            }
        });

        // 回到列表刷新
        backToLoveList();
        renderLoveList();

    } catch (e) {
        console.error(e);
        alert('生成失败：' + e.message);
    } finally {
        if (loadingEl) loadingEl.style.display = 'none';
        if (refreshBtn) refreshBtn.classList.remove('loading');
    }
}

// ============ 查手机-短信功能 ============

let pcSmsThreads = [];
let pcSmsCurrentThreadId = null;

function openPhoneCheckSms() {
    if (!phoneCheckCurrentCharId) return;

    const phoneData = phoneCheckDataCache[phoneCheckCurrentCharId] || {};
    pcSmsThreads = phoneData.smsData?.threads || [];

    // 默认列表视图
    document.getElementById('pcSmsListView').style.display = 'flex';
    document.getElementById('pcSmsDetailView').style.display = 'none';

    // 列表页按钮可见
    const closeBtn = document.querySelector('#phoneCheckSmsScreen .pc-sms-back-btn');
    const refreshBtn = document.querySelector('#phoneCheckSmsScreen .pc-sms-refresh-btn');
    if (closeBtn) closeBtn.style.display = 'flex';
    if (refreshBtn) refreshBtn.style.display = 'flex';

    renderSmsThreadList();

    // 隐藏Dock
    const dock = document.querySelector('.pc-dock');
    if (dock) dock.style.display = 'none';

    document.getElementById('phoneCheckSmsScreen').style.display = 'block';
}

function closePhoneCheckSms() {
    document.getElementById('phoneCheckSmsScreen').style.display = 'none';

    const dock = document.querySelector('.pc-dock');
    if (dock) dock.style.display = 'flex';
}

function backToSmsList() {
    document.getElementById('pcSmsDetailView').style.display = 'none';
    document.getElementById('pcSmsListView').style.display = 'flex';

    // 回到列表恢复按钮
    const closeBtn = document.querySelector('#phoneCheckSmsScreen .pc-sms-back-btn');
    const refreshBtn = document.querySelector('#phoneCheckSmsScreen .pc-sms-refresh-btn');
    if (closeBtn) closeBtn.style.display = 'flex';
    if (refreshBtn) refreshBtn.style.display = 'flex';
}

function renderSmsThreadList() {
    const listEl = document.getElementById('pcSmsThreadList');
    if (!listEl) return;

    if (!pcSmsThreads || pcSmsThreads.length === 0) {
        listEl.innerHTML = '<div class="pc-sms-empty">点击右上角刷新按钮<br>生成 TA 的短信~</div>';
        return;
    }

    listEl.innerHTML = pcSmsThreads.map(t => {
        const name = (t.name || '').trim() || '未知';
        const avatar = (t.avatar || '💬').trim();
        const last = (t.last || '').trim();
        const time = (t.time || '').trim();
        const unread = !!t.unread;

        return `
            <div class="pc-sms-thread" onclick="openSmsThread('${escapeAttr(t.id)}')">
                <div class="pc-sms-avatar">${escapeHtml(avatar)}</div>
                <div class="pc-sms-thread-main">
                    <div class="pc-sms-thread-top">
                        <div class="pc-sms-thread-name">${escapeHtml(name)}</div>
                        <div class="pc-sms-thread-time">${escapeHtml(time)}</div>
                    </div>
                    <div class="pc-sms-thread-preview">${escapeHtml(last)}</div>
                </div>
                ${unread ? '<div class="pc-sms-unread-dot"></div>' : ''}
            </div>
        `;
    }).join('');
}

function openSmsThread(threadId) {
    const thread = pcSmsThreads.find(t => String(t.id) === String(threadId));
    if (!thread) return;

    pcSmsCurrentThreadId = threadId;

    // 标题
    document.getElementById('pcSmsDetailName').textContent = thread.name || '短信';

    // 渲染消息 + 时间分隔
    renderSmsMessages(thread.messages || []);

    // 切换视图
    document.getElementById('pcSmsListView').style.display = 'none';
    document.getElementById('pcSmsDetailView').style.display = 'flex';

    // 详情页隐藏关闭/刷新（避免误触直接回主屏幕）
    const closeBtn = document.querySelector('#phoneCheckSmsScreen .pc-sms-back-btn');
    const refreshBtn = document.querySelector('#phoneCheckSmsScreen .pc-sms-refresh-btn');
    if (closeBtn) closeBtn.style.display = 'none';
    if (refreshBtn) refreshBtn.style.display = 'none';

    // 进入会话后可认为已读（仅本地显示）
    thread.unread = false;
    renderSmsThreadList();
}

function renderSmsMessages(messages) {
    const box = document.getElementById('pcSmsMessages');
    if (!box) return;

    const sorted = (Array.isArray(messages) ? messages : [])
        .filter(m => m && m.datetime)
        .slice()
        .sort((a, b) => new Date(a.datetime) - new Date(b.datetime));

    if (sorted.length === 0) {
        box.innerHTML = '<div class="pc-sms-empty" style="padding:40px 0;">暂无内容</div>';
        return;
    }

    let html = '';
    let lastSep = '';

    sorted.forEach(m => {
        const sep = formatSmsSeparator(m.datetime);
        if (sep && sep !== lastSep) {
            lastSep = sep;
            html += `<div class="pc-sms-time-sep">${escapeHtml(sep)}</div>`;
        }

        const from = (m.from === 'char') ? 'char' : 'other';
        const clsRow = from === 'char' ? 'char' : 'other';
        const clsBubble = from === 'char' ? 'char' : 'other';

        html += `
            <div class="pc-sms-bubble-row ${clsRow}">
                <div class="pc-sms-bubble ${clsBubble}">${escapeHtml(m.text || '')}</div>
            </div>
        `;
    });

    box.innerHTML = html;

    // 滚到底部
    setTimeout(() => {
        box.scrollTop = box.scrollHeight;
    }, 30);
}

function formatSmsSeparator(datetimeStr) {
    // datetimeStr: "YYYY-MM-DD HH:mm"
    const d = new Date(datetimeStr.replace(' ', 'T'));
    if (isNaN(d.getTime())) return datetimeStr;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thatDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());

    const diffDays = Math.round((today - thatDay) / 86400000);

    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');

    if (diffDays === 0) return `今天 ${hh}:${mm}`;
    if (diffDays === 1) return `昨天 ${hh}:${mm}`;

    const M = String(d.getMonth() + 1).padStart(2, '0');
    const DD = String(d.getDate()).padStart(2, '0');
    return `${M}-${DD} ${hh}:${mm}`;
}

function formatNowLocal() {
    const n = new Date();
    const Y = n.getFullYear();
    const M = String(n.getMonth() + 1).padStart(2, '0');
    const D = String(n.getDate()).padStart(2, '0');
    const h = String(n.getHours()).padStart(2, '0');
    const m = String(n.getMinutes()).padStart(2, '0');
    return `${Y}-${M}-${D} ${h}:${m}`;
}

function subtractDaysLocal(days) {
    const n = new Date();
    n.setDate(n.getDate() - days);
    const Y = n.getFullYear();
    const M = String(n.getMonth() + 1).padStart(2, '0');
    const D = String(n.getDate()).padStart(2, '0');
    return `${Y}-${M}-${D}`;
}

async function generateSmsThreads() {
    if (!phoneCheckCurrentCharId) return;

    const loadingEl = document.getElementById('pcSmsLoading');
    const refreshBtn = document.getElementById('pcSmsRefreshBtn');
    if (loadingEl) loadingEl.style.display = 'flex';
    if (refreshBtn) refreshBtn.classList.add('loading');

    try {
        const chat = chats.find(c => c.id === phoneCheckCurrentCharId);
        if (!chat) throw new Error('角色不存在');

                // 统一取材：人设 + 最近100条聊天 + 全部长期记忆
        const sourceData = await getPhoneCheckPromptSources(phoneCheckCurrentCharId);
        const personality = sourceData.personalityText || '';
        const recentChatText = sourceData.recentChatText || '（无最近聊天记录）';
        const memoryText = sourceData.memoryText || '（无长期记忆）';

        if (!personality.trim()) throw new Error('请先在角色资料里填写“他的人设”');

        // API配置：优先查手机方案，其次全局
        const phoneData = phoneCheckDataCache[phoneCheckCurrentCharId] || {};
        let apiConfig = null;

        if (phoneData.apiSchemeId) {
            await new Promise(resolve => {
                loadFromDB('apiSchemes', (data) => {
                    const schemes = (data && data.list) ? data.list : (Array.isArray(data) ? data : []);
                    apiConfig = schemes.find(s => s.id === phoneData.apiSchemeId);
                    resolve();
                });
            });
        }

        if (!apiConfig) {
            await new Promise(resolve => {
                loadFromDB('apiConfig', (data) => {
                    apiConfig = data;
                    resolve();
                });
            });
        }

        if (!apiConfig || !apiConfig.baseUrl || !apiConfig.apiKey) throw new Error('请先设置API');

        const nowLocal = formatNowLocal();
        const minDate = subtractDaysLocal(7);

        const prompt = `你是${chat.name}。请根据【人设】【最近100条聊天记录】【全部长期记忆】生成你手机里“短信(Messages)”会出现的会话列表与短信内容。要求像真实手机短信，而不是凭空编联系人。

【本地当前时间】${nowLocal}
【时间范围要求】所有短信的 datetime 必须在最近7天内（>= ${minDate} 且 <= ${nowLocal}），禁止未来时间，禁止跳到其它月份（除非最近7天确实跨月）。

【人设】：
${personality}

【最近100条聊天记录】：
${recentChatText}

【全部长期记忆】：
${memoryText}

核心规则：
1. 必须同时参考人设、聊天记录、长期记忆，不能只按人设自由发挥
2. 短信联系人和内容要像真实手机里的残留记录：平台通知、生活服务、真人联系人混合
3. 如果聊天记录和长期记忆里出现了生活习惯、兴趣、工作学习、在意的人、常见场景、被提到的事项，要自然映射到短信内容里
4. 不能编造没有依据的重大事实；没有证据的内容要尽量写成日常、模糊、安全的小短信
5. 整体要有活人感：有些短信很无聊，有些很短，有些是系统通知，有些只是问一句，不要每条都像剧情推进

硬性规则（关于“你/我(用户)”这条会话）：
- 允许出现最多 1 个联系人会话指向用户（联系人名可以是：你、我、宝、亲爱的、某个昵称），但该会话必须是【单向短信】：
  messages 里只能出现 from="char" 的消息，严禁出现 from="other"。
- 这条会话重点写“很克制但很在意”的感觉，内容只能是安全短信，例如：
  1) 到家了吗 / 睡了吗 / 忙完没有 / 记得吃饭 / 晚安 / 今天累不累 / 早安
  2) 想说但又收着的关心短句
  3) 简单提醒类内容
- 严禁出现任何具体事实细节（如：你昨天说了什么、我们见过面、你答应过什么、某次具体事件）。
- 如果无法满足以上约束，则不要生成这条“指向用户”的会话。

生成要求：
1. 生成 6-10 个会话 threads
2. 必须包含以下两大类，并自然混合：
   - 系统/平台通知类：快递、外卖、银行、验证码、会员续费、平台提醒、物流、账单、订阅等
   - 真人联系人类：家人、朋友、同事、店家、服务联系人等
3. 至少满足这些分布：
   - 至少 3 个系统/平台类线程
   - 至少 2 个真人联系人线程
   - 如果要生成指向 user 的线程，最多 1 个，而且要很克制
4. 每个会话 messages 8-14 条，内容以真实短信短句为主，不要太像微信长聊
5. 每条消息必须带 datetime，格式固定为 "YYYY-MM-DD HH:mm"（24小时制）
6. threads 的 last 字段必须是该会话最后一条消息预览（简短）
7. unread 可随机 true/false，不要全是 true
8. 至少有 3 个线程能让人看出和聊天记录或长期记忆存在细节关联
9. 不要把所有线程都写得很有戏，很多短信本来就很普通

风格要求：
1. 系统类要真实，比如：
   - 快递取件提醒
   - 外卖配送
   - 银行入账/扣款
   - 会员自动续费
   - 验证码
   - 日程提醒
   - 商家服务通知
2. 真人类要像“短信”不是“即时聊天”：
   - 句子更短
   - 往来没那么密
   - 更容易出现通知、确认、问候、提醒
3. 如果根据人设与聊天记录能判断这个人会保留一些旧式联系人短信，也可以适当体现
4. 指向 user 的那条如果出现，要有一点点甜、一点点克制、一点点想念，但不能越界编事实

请严格只输出 JSON，不要输出多余文字：
{
  "threads": [
    {
      "id": "t1",
      "name": "联系人名",
      "avatar": "emoji或单字符",
      "time": "列表显示时间（如 今天/昨天/03-04）",
      "last": "最后一条预览",
      "unread": true,
      "messages": [
        { "from": "other", "text": "…", "datetime": "YYYY-MM-DD HH:mm" },
        { "from": "char", "text": "…", "datetime": "YYYY-MM-DD HH:mm" }
      ]
    }
  ]
}`;

        const res = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiConfig.apiKey}`
            },
            body: JSON.stringify({
                model: apiConfig.defaultModel || apiConfig.model || 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.85
            })
        });

        if (!res.ok) throw new Error('API请求失败');

        const json = await res.json();
        const content = json?.choices?.[0]?.message?.content || '';
        const match = content.match(/\{[\s\S]*\}/);
        if (!match) throw new Error('返回内容不是JSON');

        const parsed = JSON.parse(match[0]);
        const threads = Array.isArray(parsed.threads) ? parsed.threads : [];

        // 清洗 + 补 time/last
        pcSmsThreads = threads.slice(0, 12).map((t, idx) => {
            const msgs = Array.isArray(t.messages) ? t.messages : [];
            const sorted = msgs.slice().sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
            const lastMsg = sorted[sorted.length - 1] || {};
            const lastText = (t.last || lastMsg.text || '').toString().slice(0, 40);

            // 列表 time: 用最后一条 datetime 转成 今天/昨天/MM-DD
            let listTime = '';
            if (lastMsg.datetime) {
                const sep = formatSmsSeparator(lastMsg.datetime);
                // sep: 今天 HH:mm / 昨天 HH:mm / MM-DD HH:mm
                listTime = sep.startsWith('今天') ? '今天' : (sep.startsWith('昨天') ? '昨天' : sep.slice(0, 5));
            }

            return {
                id: (t.id || `t${idx + 1}`).toString(),
                name: (t.name || '未知').toString(),
                avatar: (t.avatar || '💬').toString(),
                time: (t.time || listTime || '').toString(),
                last: lastText,
                unread: !!t.unread,
                messages: sorted.map(m => ({
                    from: (m.from === 'char') ? 'char' : 'other',
                    text: (m.text || '').toString(),
                    datetime: (m.datetime || '').toString()
                }))
            };
        });

// 兜底：如果某个会话疑似指向用户，则强制只保留 char 单向消息
const userNameHints = ['你', '我', '宝', '亲爱的', '老婆', '老公', '宝宝'];
pcSmsThreads = pcSmsThreads.map(t => {
    const name = (t.name || '').trim();
    const isUserThread = userNameHints.includes(name);
    if (!isUserThread) return t;

    const safeMessages = (t.messages || []).filter(m => m.from === 'char');

    // 再兜底：如果全被过滤空了，就留一条最安全的
    if (safeMessages.length === 0) {
        safeMessages.push({
            from: 'char',
            text: '到家了吗？',
            datetime: formatNowLocal()
        });
    }

    // 更新 last/time
    const lastMsg = safeMessages[safeMessages.length - 1];
    t.messages = safeMessages;
    t.last = (lastMsg.text || '').slice(0, 40);

    const sep = formatSmsSeparator(lastMsg.datetime);
    t.time = sep.startsWith('今天') ? '今天' : (sep.startsWith('昨天') ? '昨天' : sep.slice(0, 5));

    // 用户向会话不要未读红点（可选）
    t.unread = false;

    return t;
});

        savePhoneCheckData(phoneCheckCurrentCharId, {
            smsData: {
                threads: pcSmsThreads,
                generatedAt: new Date().toLocaleString()
            }
        });

        renderSmsThreadList();

    } catch (e) {
        console.error(e);
        alert('生成失败：' + e.message);
    } finally {
        if (loadingEl) loadingEl.style.display = 'none';
        if (refreshBtn) refreshBtn.classList.remove('loading');
    }
}

// 防止 onclick 注入
function escapeAttr(str) {
    return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// ============ 查手机-理财功能 ============

let pcFinanceData = null;
let pcFinanceTxList = [];
let pcFinanceCurrentIndex = -1;

function openPhoneCheckFinance() {
    if (!phoneCheckCurrentCharId) return;

    const phoneData = phoneCheckDataCache[phoneCheckCurrentCharId] || {};
    pcFinanceData = phoneData.financeData || null;
    pcFinanceTxList = pcFinanceData?.transactions || [];

    // 默认列表视图
    document.getElementById('pcFinanceListView').style.display = 'flex';
    document.getElementById('pcFinanceDetailView').style.display = 'none';

    // 列表按钮可见
    const closeBtn = document.querySelector('#phoneCheckFinanceScreen .pc-finance-back-btn');
    const refreshBtn = document.querySelector('#phoneCheckFinanceScreen .pc-finance-refresh-btn');
    if (closeBtn) closeBtn.style.display = 'flex';
    if (refreshBtn) refreshBtn.style.display = 'flex';

    renderFinancePage();

    // 隐藏Dock
    const dock = document.querySelector('.pc-dock');
    if (dock) dock.style.display = 'none';

    document.getElementById('phoneCheckFinanceScreen').style.display = 'block';
}

function closePhoneCheckFinance() {
    document.getElementById('phoneCheckFinanceScreen').style.display = 'none';

    const dock = document.querySelector('.pc-dock');
    if (dock) dock.style.display = 'flex';
}

function backToFinanceList() {
    document.getElementById('pcFinanceDetailView').style.display = 'none';
    document.getElementById('pcFinanceListView').style.display = 'flex';

    // 回到列表恢复按钮
    const closeBtn = document.querySelector('#phoneCheckFinanceScreen .pc-finance-back-btn');
    const refreshBtn = document.querySelector('#phoneCheckFinanceScreen .pc-finance-refresh-btn');
    if (closeBtn) closeBtn.style.display = 'flex';
    if (refreshBtn) refreshBtn.style.display = 'flex';
}

function renderFinancePage() {
    // summary
    const totalEl = document.getElementById('pcFinanceTotalBalance');
    const subEl = document.getElementById('pcFinanceBalanceSub');

    if (pcFinanceData?.summary) {
        const s = pcFinanceData.summary;
        totalEl.textContent = formatMoney(s.totalBalance);
        subEl.textContent = `可用余额：${formatMoney(s.availableBalance)}  ·  本月预算剩余：${formatMoney(s.monthBudgetLeft)}`;
    } else {
        totalEl.textContent = '--';
        subEl.textContent = '可用余额：--';
    }

    // list
    const listEl = document.getElementById('pcFinanceTxList');
    if (!listEl) return;

    if (!pcFinanceTxList || pcFinanceTxList.length === 0) {
        listEl.innerHTML = '<div class="pc-finance-empty">点击右上角刷新按钮<br>生成账单记录~</div>';
        return;
    }

    listEl.innerHTML = pcFinanceTxList.map((tx, idx) => {
        const amount = Number(tx.amount || 0);
        const isExpense = amount < 0;
        const cls = isExpense ? 'expense' : 'income';
        const signAmount = (isExpense ? '-' : '+') + formatMoney(Math.abs(amount)).replace('¥', '');
        const timeText = formatFinanceListTime(tx.datetime);

        return `
            <div class="pc-finance-tx" onclick="openFinanceDetail(${idx})">
                <div class="pc-finance-tx-icon">${escapeHtml(getFinanceIcon(tx.type, tx.title))}</div>
                <div class="pc-finance-tx-main">
                    <div class="pc-finance-tx-title">${escapeHtml(tx.title || '')}</div>
                    <div class="pc-finance-tx-desc">${escapeHtml(tx.desc || '')}</div>
                </div>
                <div class="pc-finance-tx-right">
                    <div class="pc-finance-tx-amount ${cls}">${escapeHtml(signAmount)}</div>
                    <div class="pc-finance-tx-time">${escapeHtml(timeText)}</div>
                </div>
            </div>
        `;
    }).join('');
}

function openFinanceDetail(index) {
    const tx = pcFinanceTxList[index];
    if (!tx) return;

    pcFinanceCurrentIndex = index;

    const amount = Number(tx.amount || 0);
    const isExpense = amount < 0;
    const signAmount = (isExpense ? '-' : '+') + formatMoney(Math.abs(amount)).replace('¥', '');

    document.getElementById('pcFinanceDetailAmount').textContent = signAmount;
    document.getElementById('pcFinanceDetailMeta').textContent = isExpense ? '支出' : '收入';

    document.getElementById('pcFinanceDetailType').textContent = formatFinanceType(tx.type);
    document.getElementById('pcFinanceDetailTitle').textContent = tx.title || '';
    document.getElementById('pcFinanceDetailDesc').textContent = tx.desc || '';
    document.getElementById('pcFinanceDetailTime').textContent = tx.datetime || '';
    document.getElementById('pcFinanceDetailNo').textContent = tx.no || genFinanceNo(tx);

    // 切换视图
    document.getElementById('pcFinanceListView').style.display = 'none';
    document.getElementById('pcFinanceDetailView').style.display = 'flex';

    // 详情页隐藏关闭/刷新，避免误触回主屏幕
    const closeBtn = document.querySelector('#phoneCheckFinanceScreen .pc-finance-back-btn');
    const refreshBtn = document.querySelector('#phoneCheckFinanceScreen .pc-finance-refresh-btn');
    if (closeBtn) closeBtn.style.display = 'none';
    if (refreshBtn) refreshBtn.style.display = 'none';
}

function formatMoney(n) {
    if (n === null || n === undefined || n === '' || isNaN(Number(n))) return '--';
    return '¥' + Number(n).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatFinanceListTime(datetimeStr) {
    if (!datetimeStr) return '';
    const d = new Date(datetimeStr.replace(' ', 'T'));
    if (isNaN(d.getTime())) return datetimeStr;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thatDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.round((today - thatDay) / 86400000);

    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');

    if (diffDays === 0) return `今天 ${hh}:${mm}`;
    if (diffDays === 1) return `昨天 ${hh}:${mm}`;

    const M = String(d.getMonth() + 1).padStart(2, '0');
    const DD = String(d.getDate()).padStart(2, '0');
    return `${M}-${DD} ${hh}:${mm}`;
}

function formatFinanceType(type) {
    const map = {
        expense: '支出',
        income: '收入',
        transfer: '转账',
        refund: '退款',
        investment: '理财'
    };
    return map[type] || '交易';
}

function getFinanceIcon(type, title) {
    const t = (title || '').toLowerCase();
    if (type === 'income') return '💼';
    if (type === 'refund') return '↩️';
    if (type === 'investment') return '📈';
    if (type === 'transfer') return '🔁';
    if (t.includes('外卖') || t.includes('餐') || t.includes('奶茶') || t.includes('咖啡')) return '🍔';
    if (t.includes('打车') || t.includes('滴滴') || t.includes('地铁')) return '🚕';
    if (t.includes('超市') || t.includes('便利店') || t.includes('菜')) return '🛒';
    if (t.includes('房租') || t.includes('水电') || t.includes('燃气')) return '🏠';
    if (t.includes('会员') || t.includes('订阅')) return '🎫';
    if (t.includes('游戏') || t.includes('充值')) return '🎮';
    return '💳';
}

function genFinanceNo(tx) {
    const base = (tx.datetime || '').replace(/\D/g, '').slice(0, 12) || String(Date.now()).slice(0, 12);
    const rand = Math.floor(Math.random() * 9000) + 1000;
    return `TX${base}${rand}`;
}

async function generateFinanceData() {
    if (!phoneCheckCurrentCharId) return;

    const loadingEl = document.getElementById('pcFinanceLoading');
    const refreshBtn = document.getElementById('pcFinanceRefreshBtn');
    if (loadingEl) loadingEl.style.display = 'flex';
    if (refreshBtn) refreshBtn.classList.add('loading');

    try {
        const chat = chats.find(c => c.id === phoneCheckCurrentCharId);
        if (!chat) throw new Error('角色不存在');

               // 统一取材：人设 + 最近100条聊天 + 全部长期记忆
        const sourceData = await getPhoneCheckPromptSources(phoneCheckCurrentCharId);
        const personality = sourceData.personalityText || '';
        const recentChatText = sourceData.recentChatText || '（无最近聊天记录）';
        const memoryText = sourceData.memoryText || '（无长期记忆）';

        if (!personality.trim()) throw new Error('请先在角色资料里填写“他的人设”');

        // API配置：优先查手机方案，其次全局
        const phoneData = phoneCheckDataCache[phoneCheckCurrentCharId] || {};
        let apiConfig = null;

        if (phoneData.apiSchemeId) {
            await new Promise(resolve => {
                loadFromDB('apiSchemes', (data) => {
                    const schemes = (data && data.list) ? data.list : (Array.isArray(data) ? data : []);
                    apiConfig = schemes.find(s => s.id === phoneData.apiSchemeId);
                    resolve();
                });
            });
        }

        if (!apiConfig) {
            await new Promise(resolve => {
                loadFromDB('apiConfig', (data) => {
                    apiConfig = data;
                    resolve();
                });
            });
        }

        if (!apiConfig || !apiConfig.baseUrl || !apiConfig.apiKey) throw new Error('请先设置API');

        const nowLocal = formatNowLocal();
        const minDate = subtractDaysLocal(7);

            const prompt = `你是${chat.name}。请根据【人设】【最近100条聊天记录】【全部长期记忆】生成你手机里的“理财/钱包”数据，包括余额与最近7天账单流水。要求像真实活人的消费记录，不要像模板账单。

【本地当前时间】${nowLocal}
【时间范围要求】transactions 的 datetime 必须在最近7天内（>= ${minDate} 且 <= ${nowLocal}），禁止未来时间。

【人设】：
${personality}

【最近100条聊天记录】：
${recentChatText}

【全部长期记忆】：
${memoryText}

核心规则：
1. 必须同时参考人设、聊天记录、长期记忆，不能只按人设自由发挥
2. 消费内容必须像真实生活：吃饭、饮品、便利店、超市、通勤、平台订阅、日用品、零碎购买、偶尔退款或入账
3. 如果聊天记录和长期记忆里出现了某些习惯、爱吃的东西、常去的地方、兴趣、平台、生活节奏、预算焦虑、收藏癖、养生习惯、冲动消费倾向等，要自然反映到账单里
4. 不能编造和资料完全不符的夸张收入、奢侈消费、离谱余额
5. 整体要有活人感：有小额消费、有重复小支出、有普通扣费，不要每一条都很有戏
6. 可以体现这个人的金钱观，比如节省、随手花、冲动、记账型、无所谓型、精打细算型，但要自然

生成要求：
1. 生成 summary：totalBalance、availableBalance、monthBudgetLeft、note
2. 生成 12-20 条 transactions
3. amount 负数=支出，正数=收入
4. datetime 格式固定为 "YYYY-MM-DD HH:mm"（24小时制）
5. JSON 必须可解析

summary 要求：
1. totalBalance、availableBalance、monthBudgetLeft 必须合理，符合人设，不要离谱
2. note 是一句很像本人会有的理财/花钱心情，简短自然，比如预算焦虑、嘴硬安慰、无奈吐槽、对自己说的话
3. note 也要体现人设，不要太像系统文案

transactions 要求：
1. 类型可用：expense / income / transfer / refund / investment
2. 内容以真实日常为主，建议自然混合：
   - 餐饮、奶茶、咖啡、零食
   - 超市、便利店、日用品
   - 打车、地铁、通勤
   - 会员订阅、自动续费、平台扣费
   - 小额网购、退款
   - 工资、兼职、转账、报销等少量收入
3. 至少满足这些分布：
   - 至少 8 条日常小额支出
   - 至少 2 条平台/会员/固定类扣费
   - 至少 1 条收入或退款
   - 至少 3 条能看出和聊天记录或长期记忆有细节关联
4. 不要所有金额都很整齐，允许出现 9.90 / 18.50 / 32.8 / 6.00 这种真实数字
5. title 像账单标题，desc 像账单备注或交易说明，要简短真实
6. 不要把每一条都写成“剧情道具”，很多消费本来就是普通生活

风格要求：
1. 账单应该让人看出这个人怎么生活，而不是只看出“他的人设是什么”
2. 可以有一点心虚、一点嘴硬、一点“怎么又花钱了”，也可以有“这笔花得值”的感觉，但主要体现在 summary.note 和消费结构里
3. 如果这个人和 user 的聊天里提到某些吃的、想买的、想去的地方，可以自然变成消费记录，但不要硬编成重大共同经历

请严格只输出 JSON，不要输出多余文字：
{
  "summary": {
    "currency": "CNY",
    "totalBalance": 12345.67,
    "availableBalance": 4567.89,
    "monthBudgetLeft": 800.00,
    "note": ""
  },
  "transactions": [
    {
      "type": "expense|income|transfer|refund|investment",
      "title": "",
      "desc": "",
      "amount": -28.50,
      "datetime": "YYYY-MM-DD HH:mm"
    }
  ]
}`;

        const res = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiConfig.apiKey}`
            },
            body: JSON.stringify({
                model: apiConfig.defaultModel || apiConfig.model || 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.78
            })
        });

        if (!res.ok) throw new Error('API请求失败');

        const json = await res.json();
        const content = json?.choices?.[0]?.message?.content || '';
        const match = content.match(/\{[\s\S]*\}/);
        if (!match) throw new Error('返回内容不是JSON');

        const parsed = JSON.parse(match[0]);
        const summary = parsed.summary || {};
        const txs = Array.isArray(parsed.transactions) ? parsed.transactions : [];

        // 清洗排序
        pcFinanceData = {
            summary: {
                currency: 'CNY',
                totalBalance: Number(summary.totalBalance || 0),
                availableBalance: Number(summary.availableBalance || 0),
                monthBudgetLeft: Number(summary.monthBudgetLeft || 0),
                note: (summary.note || '').toString()
            },
            transactions: txs
                .slice()
                .map(tx => ({
                    type: (tx.type || 'expense').toString(),
                    title: (tx.title || '').toString(),
                    desc: (tx.desc || '').toString(),
                    amount: Number(tx.amount || 0),
                    datetime: (tx.datetime || '').toString(),
                    no: genFinanceNo(tx)
                }))
                .filter(tx => tx.datetime)
                .sort((a, b) => new Date(b.datetime) - new Date(a.datetime))
        };

        pcFinanceTxList = pcFinanceData.transactions;

        savePhoneCheckData(phoneCheckCurrentCharId, {
            financeData: {
                ...pcFinanceData,
                generatedAt: new Date().toLocaleString()
            }
        });

        renderFinancePage();

    } catch (e) {
        console.error(e);
        alert('生成失败：' + e.message);
    } finally {
        if (loadingEl) loadingEl.style.display = 'none';
        if (refreshBtn) refreshBtn.classList.remove('loading');
    }
}

// ============ 查手机-收藏功能 ============

let pcFavItems = [];
let pcFavCurrentIndex = -1;

function openPhoneCheckFavorite() {
    if (!phoneCheckCurrentCharId) return;

    const phoneData = phoneCheckDataCache[phoneCheckCurrentCharId] || {};
    pcFavItems = phoneData.favoriteData?.items || [];

    // 默认列表
    document.getElementById('pcFavListView').style.display = 'flex';
    document.getElementById('pcFavDetailView').style.display = 'none';

    // 列表按钮可见
    const closeBtn = document.querySelector('#phoneCheckFavoriteScreen .pc-fav-back-btn');
    const refreshBtn = document.querySelector('#phoneCheckFavoriteScreen .pc-fav-refresh-btn');
    if (closeBtn) closeBtn.style.display = 'flex';
    if (refreshBtn) refreshBtn.style.display = 'flex';

    renderFavList();

    // 隐藏Dock
    const dock = document.querySelector('.pc-dock');
    if (dock) dock.style.display = 'none';

    document.getElementById('phoneCheckFavoriteScreen').style.display = 'block';
}

function closePhoneCheckFavorite() {
    document.getElementById('phoneCheckFavoriteScreen').style.display = 'none';

    const dock = document.querySelector('.pc-dock');
    if (dock) dock.style.display = 'flex';
}

function backToFavList() {
    document.getElementById('pcFavDetailView').style.display = 'none';
    document.getElementById('pcFavListView').style.display = 'flex';

    // 回到列表恢复按钮
    const closeBtn = document.querySelector('#phoneCheckFavoriteScreen .pc-fav-back-btn');
    const refreshBtn = document.querySelector('#phoneCheckFavoriteScreen .pc-fav-refresh-btn');
    if (closeBtn) closeBtn.style.display = 'flex';
    if (refreshBtn) refreshBtn.style.display = 'flex';
}

function renderFavList() {
    const listEl = document.getElementById('pcFavList');
    if (!listEl) return;

    if (!pcFavItems || pcFavItems.length === 0) {
        listEl.innerHTML = '<div class="pc-fav-empty">点击右上角刷新按钮<br>生成 TA 的收藏~</div>';
        return;
    }

    listEl.innerHTML = pcFavItems.map((it, idx) => {
        const title = (it.title || '').trim() || '（未命名）';
        const content = (it.content || '').trim().replace(/\n+/g, ' ');
        const preview = content.slice(0, 120);
        const time = (it.time || '').trim();
        const sourceName = formatFavSourceName(it.sourceType);
        const sourceDesc = (it.sourceDesc || '').trim();

        return `
            <div class="pc-fav-item" onclick="openFavDetail(${idx})">
                <div class="pc-fav-item-top">
                    <div class="pc-fav-item-title">${escapeHtml(title)}</div>
                    <div class="pc-fav-item-time">${escapeHtml(time)}</div>
                </div>
                <div class="pc-fav-item-preview">${escapeHtml(preview)}</div>
                <div class="pc-fav-item-source">
                    <span class="pc-fav-source-pill">${escapeHtml(sourceName)}</span>
                    <span>${escapeHtml(sourceDesc)}</span>
                </div>
            </div>
        `;
    }).join('');
}

function openFavDetail(index) {
    const it = pcFavItems[index];
    if (!it) return;

    pcFavCurrentIndex = index;

    document.getElementById('pcFavDetailTime').textContent = it.time || '';
    document.getElementById('pcFavDetailTitle').textContent = it.title || '';
    document.getElementById('pcFavDetailContent').textContent = it.content || '';

    const sourceName = formatFavSourceName(it.sourceType);
    const sourceDesc = it.sourceDesc || '';
    document.getElementById('pcFavDetailSource').textContent = `${sourceName} · ${sourceDesc}`.trim();

    document.getElementById('pcFavDetailOS').textContent = it.os || '';

    // 切换视图
    document.getElementById('pcFavListView').style.display = 'none';
    document.getElementById('pcFavDetailView').style.display = 'flex';

    // 详情页隐藏关闭/刷新，避免误触回主屏幕
    const closeBtn = document.querySelector('#phoneCheckFavoriteScreen .pc-fav-back-btn');
    const refreshBtn = document.querySelector('#phoneCheckFavoriteScreen .pc-fav-refresh-btn');
    if (closeBtn) closeBtn.style.display = 'none';
    if (refreshBtn) refreshBtn.style.display = 'none';
}

function formatFavSourceName(type) {
    const map = {
        note: '备忘录',
        screenshot: '截图',
        bookmark: '书签',
        draft: '草稿',
        album: '相册',
        reminder: '提醒',
        file: '文件'
    };
    return map[type] || '收藏';
}

async function generateFavoriteData() {
    if (!phoneCheckCurrentCharId) return;

    const loadingEl = document.getElementById('pcFavLoading');
    const refreshBtn = document.getElementById('pcFavRefreshBtn');
    if (loadingEl) loadingEl.style.display = 'flex';
    if (refreshBtn) refreshBtn.classList.add('loading');

    try {
        const chat = chats.find(c => c.id === phoneCheckCurrentCharId);
        if (!chat) throw new Error('角色不存在');

             // 统一取材：人设 + 最近100条聊天 + 全部长期记忆
        const sourceData = await getPhoneCheckPromptSources(phoneCheckCurrentCharId);
        const personality = sourceData.personalityText || '';
        const recentChatText = sourceData.recentChatText || '（无最近聊天记录）';
        const memoryText = sourceData.memoryText || '（无长期记忆）';

        if (!personality.trim()) throw new Error('请先在角色资料里填写“他的人设”');

        // API配置：优先查手机方案，其次全局
        const phoneData = phoneCheckDataCache[phoneCheckCurrentCharId] || {};
        let apiConfig = null;

        if (phoneData.apiSchemeId) {
            await new Promise(resolve => {
                loadFromDB('apiSchemes', (data) => {
                    const schemes = (data && data.list) ? data.list : (Array.isArray(data) ? data : []);
                    apiConfig = schemes.find(s => s.id === phoneData.apiSchemeId);
                    resolve();
                });
            });
        }

        if (!apiConfig) {
            await new Promise(resolve => {
                loadFromDB('apiConfig', (data) => {
                    apiConfig = data;
                    resolve();
                });
            });
        }

        if (!apiConfig || !apiConfig.baseUrl || !apiConfig.apiKey) throw new Error('请先设置API');

        const nowLocal = (typeof formatNowLocal === 'function') ? formatNowLocal() : new Date().toLocaleString();
        const minDate = (typeof subtractDaysLocal === 'function') ? subtractDaysLocal(7) : '';

           const prompt = `你是${chat.name}。你手机里有一个非常私密的“收藏(Private)”功能，用来偷偷保存那些不想给别人看、但自己会反复点开的东西。请根据【人设】【最近100条聊天记录】【全部长期记忆】生成收藏条目，风格要像真实活人的私密收藏夹。

【本地当前时间】${nowLocal}
【时间范围要求】time 必须在最近7天内（贴近本地时间），不要出现未来日期。
${minDate ? `时间不要早于：${minDate}` : ''}

【人设】：
${personality}

【最近100条聊天记录】：
${recentChatText}

【全部长期记忆】：
${memoryText}

核心规则：
1. 必须同时参考人设、聊天记录、长期记忆，不能只按人设自由发挥
2. 收藏内容要有“私密感”“舍不得删”“只想自己留着看”的感觉，不是公开收藏夹，也不是普通资料归档
3. 可以收藏这些类型，并尽量自然混合：
   - 某句想反复看的话
   - 一张聊天截图/一句截图文字
   - 舍不得删的图片描述
   - 记在备忘里的小句子
   - 浏览器里存下来的标题/片段
   - 某个提醒、草稿、未发出去的话
   - 某个和在意的人有关的小瞬间
   - 某个让自己偷偷开心、吃醋、心软、在意的细节
4. 如果聊天记录里有让人反复回想的话、在意的措辞、暧昧瞬间、委屈点、嘴硬点、甜一点的小细节，可以自然转成收藏内容
5. 如果长期记忆里有重要的人、反复记住的事、习惯、瞬间、印象标签，也要自然进入收藏
6. 禁止编造聊天记录和长期记忆里完全没有依据的重大事件
7. 可以有一点占有欲、克制、敏感、偷偷喜欢、舍不得删、想藏起来的感觉，但不要露骨，不要违法，不要阴暗过头
8. 整体要像“我不会发给别人，但我会自己留着”的东西

内容要求：
1. 生成 8-12 条收藏 items
2. 每条都必须有一点私密感，不要太像公开清单
3. 至少满足这些分布：
   - 至少 3 条偏“截图/句子/片段留存”
   - 至少 2 条偏“想说没说出口 / 草稿 / 备忘”
   - 至少 2 条偏“因为在意某个人所以留下”
   - 至少 2 条带一点可爱、心软、偷偷开心、或者轻微吃醋的感觉
   - 至少 4 条能明显看出参考了聊天记录或长期记忆里的细节
4. 允许有些收藏看起来“没什么大不了”，但本人就是舍不得删，这种感觉很重要
5. 不要所有条目都很浓烈，轻重有区别，有的只是一个标题、一句短话、一张图的描述

每条必须包含：
- title：收藏标题，要像自己随手命名的，不要太正式
- content：收藏的具体内容，可以是句子、截图文字、草稿内容、图片描述、书签片段、提醒内容、文件备注等
- sourceType：只能取以下之一 note / screenshot / bookmark / draft / album / reminder / file
- sourceDesc：来源说明，像“聊天截图”“备忘录摘句”“网页标题”“相册里没删的那张”“草稿箱”等，简短自然
- os：内心OS，要有私密感，可以是嘴硬、占有欲、克制、想藏起来、舍不得删、看了会开心、看了会委屈等，但不要露骨
- time：相对时间/日期

写法要求：
1. 不要总写“用户说过/我们聊过”，而是写成“我存下来了 / 我截图了 / 我记着 / 我留着 / 我没删”
2. content 要像真实会被收藏的东西，不要每条都写成长文
3. 有些条目可以很短，越短越像本人偷偷留的
4. 整体要有一种“这不是重要文件，但对我来说很重要”的感觉
5. 可以甜，可以酸，可以别扭，可以嘴硬，但都要像真实活人

请严格只输出 JSON，不要输出多余文字：
{
  "items": [
    {
      "title": "",
      "content": "",
      "sourceType": "note",
      "sourceDesc": "",
      "os": "",
      "time": ""
    }
  ]
}`;

        const res = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiConfig.apiKey}`
            },
            body: JSON.stringify({
                model: apiConfig.defaultModel || apiConfig.model || 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.86
            })
        });

        if (!res.ok) throw new Error('API请求失败');

        const json = await res.json();
        const content = json?.choices?.[0]?.message?.content || '';
        const match = content.match(/\{[\s\S]*\}/);
        if (!match) throw new Error('返回内容不是JSON');

        const parsed = JSON.parse(match[0]);
        const items = Array.isArray(parsed.items) ? parsed.items : [];

        pcFavItems = items.slice(0, 12).map(it => ({
            title: (it.title || '').toString(),
            content: (it.content || '').toString(),
            sourceType: (it.sourceType || 'note').toString(),
            sourceDesc: (it.sourceDesc || '').toString(),
            os: (it.os || '').toString(),
            time: (it.time || '').toString()
        }));

        savePhoneCheckData(phoneCheckCurrentCharId, {
            favoriteData: {
                items: pcFavItems,
                generatedAt: new Date().toLocaleString()
            }
        });

        renderFavList();

    } catch (e) {
        console.error(e);
        alert('生成失败：' + e.message);
    } finally {
        if (loadingEl) loadingEl.style.display = 'none';
        if (refreshBtn) refreshBtn.classList.remove('loading');
    }
}

// ============ 查手机-淘宝功能 ============

let pcTaobaoItems = [];
let pcTaobaoCurrentIndex = -1;

function openPhoneCheckTaobao() {
    if (!phoneCheckCurrentCharId) return;

    const phoneData = phoneCheckDataCache[phoneCheckCurrentCharId] || {};
    pcTaobaoItems = phoneData.taobaoData?.items || [];

    // 默认列表
    document.getElementById('pcTaobaoListView').style.display = 'flex';
    document.getElementById('pcTaobaoDetailView').style.display = 'none';

    // 列表按钮可见
    const closeBtn = document.querySelector('#phoneCheckTaobaoScreen .pc-taobao-back-btn');
    const refreshBtn = document.querySelector('#phoneCheckTaobaoScreen .pc-taobao-refresh-btn');
    if (closeBtn) closeBtn.style.display = 'flex';
    if (refreshBtn) refreshBtn.style.display = 'flex';

    renderTaobaoList();

    // 隐藏 Dock
    const dock = document.querySelector('.pc-dock');
    if (dock) dock.style.display = 'none';

        document.getElementById('phoneCheckTaobaoScreen').style.display = 'flex';
}

function closePhoneCheckTaobao() {
    document.getElementById('phoneCheckTaobaoScreen').style.display = 'none';

    const dock = document.querySelector('.pc-dock');
    if (dock) dock.style.display = 'flex';
}

function backToTaobaoList() {
    document.getElementById('pcTaobaoDetailView').style.display = 'none';
    document.getElementById('pcTaobaoListView').style.display = 'flex';

    // 回到列表恢复按钮
    const closeBtn = document.querySelector('#phoneCheckTaobaoScreen .pc-taobao-back-btn');
    const refreshBtn = document.querySelector('#phoneCheckTaobaoScreen .pc-taobao-refresh-btn');
    if (closeBtn) closeBtn.style.display = 'flex';
    if (refreshBtn) refreshBtn.style.display = 'flex';
}

function renderTaobaoList() {
    const listEl = document.getElementById('pcTaobaoList');
    if (!listEl) return;

    if (!pcTaobaoItems || pcTaobaoItems.length === 0) {
        listEl.innerHTML = '<div class="pc-taobao-empty">点击右上角刷新按钮<br>生成 TA 的桃宝订单~</div>';
        return;
    }

    listEl.innerHTML = pcTaobaoItems.map((item, idx) => {
        const title = (item.title || '').trim() || '（未命名商品）';
        const desc = (item.desc || '').trim();
        const preview = desc.replace(/\n+/g, ' ').slice(0, 80);
        const time = (item.time || '').trim();
        const price = formatTaobaoPrice(item.price);
        const status = (item.status || '').trim();
        const emoji = (item.emoji || '📦').trim();

        return `
            <div class="pc-taobao-item" onclick="openTaobaoDetail(${idx})">
                <div class="pc-taobao-item-icon">${escapeHtml(emoji)}</div>
                <div class="pc-taobao-item-main">
                    <div class="pc-taobao-item-top">
                        <div class="pc-taobao-item-title">${escapeHtml(title)}</div>
                        <div class="pc-taobao-item-price">${escapeHtml(price)}</div>
                    </div>
                    <div class="pc-taobao-item-desc">${escapeHtml(preview)}</div>
                    <div class="pc-taobao-item-meta">
                        <div>${escapeHtml(time)}</div>
                        <div>${escapeHtml(status)}</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function openTaobaoDetail(index) {
    const item = pcTaobaoItems[index];
    if (!item) return;

    pcTaobaoCurrentIndex = index;

    document.getElementById('pcTaobaoDetailTime').textContent = item.time || '';
    document.getElementById('pcTaobaoDetailTitle').textContent = item.title || '';
    document.getElementById('pcTaobaoDetailPrice').textContent = formatTaobaoPrice(item.price);
    document.getElementById('pcTaobaoDetailShop').textContent = item.shopName || '';
    document.getElementById('pcTaobaoDetailStatus').textContent = item.status || '';
    document.getElementById('pcTaobaoDetailDesc').textContent = item.desc || '';
    document.getElementById('pcTaobaoDetailComment').textContent = item.comment || '';
    document.getElementById('pcTaobaoDetailReason').textContent = item.reason || '';
    document.getElementById('pcTaobaoDetailEmoji').textContent = item.emoji || '📦';

    // 切换视图
    document.getElementById('pcTaobaoListView').style.display = 'none';
    document.getElementById('pcTaobaoDetailView').style.display = 'flex';

    // 详情页隐藏关闭/刷新，避免误触回主屏幕
    const closeBtn = document.querySelector('#phoneCheckTaobaoScreen .pc-taobao-back-btn');
    const refreshBtn = document.querySelector('#phoneCheckTaobaoScreen .pc-taobao-refresh-btn');
    if (closeBtn) closeBtn.style.display = 'none';
    if (refreshBtn) refreshBtn.style.display = 'none';
}

function formatTaobaoPrice(price) {
    const num = Number(price);
    if (isNaN(num)) return '¥--';
    return '¥' + num.toFixed(2);
}

async function generateTaobaoData() {
    if (!phoneCheckCurrentCharId) return;

    const loadingEl = document.getElementById('pcTaobaoLoading');
    const refreshBtn = document.getElementById('pcTaobaoRefreshBtn');
    if (loadingEl) loadingEl.style.display = 'flex';
    if (refreshBtn) refreshBtn.classList.add('loading');

    try {
        const chat = chats.find(c => c.id === phoneCheckCurrentCharId);
        if (!chat) throw new Error('角色不存在');

        // 统一取材：人设 + 最近100条聊天 + 全部长期记忆
        const sourceData = await getPhoneCheckPromptSources(phoneCheckCurrentCharId);
        const personality = sourceData.personalityText || '';
        const recentChatText = sourceData.recentChatText || '（无最近聊天记录）';
        const memoryText = sourceData.memoryText || '（无长期记忆）';

        if (!personality.trim()) throw new Error('请先在角色资料里填写“他的人设”');

        // API配置：优先查手机方案，其次全局
        const phoneData = phoneCheckDataCache[phoneCheckCurrentCharId] || {};
        let apiConfig = null;

        if (phoneData.apiSchemeId) {
            await new Promise(resolve => {
                loadFromDB('apiSchemes', (data) => {
                    const schemes = (data && data.list) ? data.list : (Array.isArray(data) ? data : []);
                    apiConfig = schemes.find(s => s.id === phoneData.apiSchemeId);
                    resolve();
                });
            });
        }

        if (!apiConfig) {
            await new Promise(resolve => {
                loadFromDB('apiConfig', (data) => {
                    apiConfig = data;
                    resolve();
                });
            });
        }

        if (!apiConfig || !apiConfig.baseUrl || !apiConfig.apiKey) throw new Error('请先设置API');

        const prompt = `你是${chat.name}。请根据【人设】【最近100条聊天记录】【全部长期记忆】生成你手机里“淘宝/网购订单”内容。要求像真实活人的购物记录，不要像种草清单，也不要像纯人设展示。

【人设】：
${personality}

【最近100条聊天记录】：
${recentChatText}

【全部长期记忆】：
${memoryText}

核心规则：
1. 必须同时参考人设、聊天记录、长期记忆，不能只按人设自由发挥
2. 购物内容要真实，像这个人真的会买的东西：日用品、吃的、小工具、衣服、小摆件、可爱物、实用物、冲动下单物都可以
3. 如果聊天记录和长期记忆里提到过某些需求、爱好、想买的东西、生活习惯、审美偏好、在意的小物件，要自然体现在订单里
4. 不能编造和资料完全不符的奢侈消费或重大共同经历
5. 整体要有活人感：有些买得很理性，有些买得有点冲动，有些买完觉得一般，有些会真心觉得值

生成要求：
1. 生成 8-12 条订单 items
2. 每条都必须包含：
   - id
   - title（商品名）
   - price（数字，单位元，不带¥）
   - shopName（店铺名）
   - status（待收货 / 已签收 / 已评价 / 回购过 / 闲置中 等真实状态）
   - time（相对时间/日期）
   - desc（商品内容简介）
   - comment（角色本人的评价，必须像本人语气）
   - reason（为什么买它）
   - emoji（代表商品的 emoji）
3. 至少满足这些分布：
   - 至少 3 条是日常实用型
   - 至少 2 条是有点冲动下单/看到就买
   - 至少 2 条能看出和聊天记录或长期记忆有细节关联
   - 至少 2 条评价明显带角色自己的口吻和情绪
4. 价格必须合理，不要离谱
5. 商品不要全都很精致，也不要全都很废，要像真实购物车历史

风格要求：
1. title 要像真实淘宝商品名，但可以适度简化，不要长到离谱
2. desc 像商品简介，简短自然
3. comment 最重要，要像角色自己评价：
   - 可以满意
   - 可以嘴硬
   - 可以后悔
   - 可以觉得“就那样”
   - 可以想回购
   - 可以觉得可爱但没必要
4. reason 要写出购买动机，像真实下单理由
5. 不要把所有订单都写成剧情道具，很多订单本来就只是日常生活

请严格只输出 JSON，不要输出多余文字：
{
  "items": [
    {
      "id": "tb1",
      "title": "",
      "price": 0,
      "shopName": "",
      "status": "",
      "time": "",
      "desc": "",
      "comment": "",
      "reason": "",
      "emoji": "📦"
    }
  ]
}`;

        const res = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiConfig.apiKey}`
            },
            body: JSON.stringify({
                model: apiConfig.defaultModel || apiConfig.model || 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.85
            })
        });

        if (!res.ok) throw new Error('API请求失败');

        const json = await res.json();
        const content = json?.choices?.[0]?.message?.content || '';
        const match = content.match(/\{[\s\S]*\}/);
        if (!match) throw new Error('返回内容不是JSON');

        const parsed = JSON.parse(match[0]);
        const items = Array.isArray(parsed.items) ? parsed.items : [];

        pcTaobaoItems = items.slice(0, 12).map((item, idx) => ({
            id: (item.id || `tb${idx + 1}`).toString(),
            title: (item.title || '').toString(),
            price: Number(item.price || 0),
            shopName: (item.shopName || '').toString(),
            status: (item.status || '').toString(),
            time: (item.time || '').toString(),
            desc: (item.desc || '').toString(),
            comment: (item.comment || '').toString(),
            reason: (item.reason || '').toString(),
            emoji: (item.emoji || '📦').toString()
        }));

        savePhoneCheckData(phoneCheckCurrentCharId, {
            taobaoData: {
                items: pcTaobaoItems,
                generatedAt: new Date().toLocaleString()
            }
        });

        renderTaobaoList();

    } catch (e) {
        console.error(e);
        alert('生成失败：' + e.message);
    } finally {
        if (loadingEl) loadingEl.style.display = 'none';
        if (refreshBtn) refreshBtn.classList.remove('loading');
    }
}

// ============ 查手机-丑团功能 ============

let pcMeituanItems = [];
let pcMeituanCurrentIndex = -1;

function openPhoneCheckMeituan() {
    if (!phoneCheckCurrentCharId) return;

    const phoneData = phoneCheckDataCache[phoneCheckCurrentCharId] || {};
    pcMeituanItems = phoneData.meituanData?.items || [];

    // 默认列表
    document.getElementById('pcMeituanListView').style.display = 'flex';
    document.getElementById('pcMeituanDetailView').style.display = 'none';

    // 列表按钮可见
    const closeBtn = document.querySelector('#phoneCheckMeituanScreen .pc-meituan-back-btn');
    const refreshBtn = document.querySelector('#phoneCheckMeituanScreen .pc-meituan-refresh-btn');
    if (closeBtn) closeBtn.style.display = 'flex';
    if (refreshBtn) refreshBtn.style.display = 'flex';

    renderMeituanList();

    // 隐藏 Dock
    const dock = document.querySelector('.pc-dock');
    if (dock) dock.style.display = 'none';

    document.getElementById('phoneCheckMeituanScreen').style.display = 'flex';
}

function closePhoneCheckMeituan() {
    document.getElementById('phoneCheckMeituanScreen').style.display = 'none';

    const dock = document.querySelector('.pc-dock');
    if (dock) dock.style.display = 'flex';
}

function backToMeituanList() {
    document.getElementById('pcMeituanDetailView').style.display = 'none';
    document.getElementById('pcMeituanListView').style.display = 'flex';

    // 回到列表恢复按钮
    const closeBtn = document.querySelector('#phoneCheckMeituanScreen .pc-meituan-back-btn');
    const refreshBtn = document.querySelector('#phoneCheckMeituanScreen .pc-meituan-refresh-btn');
    if (closeBtn) closeBtn.style.display = 'flex';
    if (refreshBtn) refreshBtn.style.display = 'flex';
}

function renderMeituanList() {
    const listEl = document.getElementById('pcMeituanList');
    if (!listEl) return;

    if (!pcMeituanItems || pcMeituanItems.length === 0) {
        listEl.innerHTML = '<div class="pc-meituan-empty">点击右上角刷新按钮<br>生成 TA 的丑团订单~</div>';
        return;
    }

    listEl.innerHTML = pcMeituanItems.map((item, idx) => {
        const title = (item.title || '').trim() || '（未命名订单）';
        const desc = (item.desc || '').trim();
        const preview = desc.replace(/\n+/g, ' ').slice(0, 80);
        const time = (item.time || '').trim();
        const price = formatMeituanPrice(item.price);
        const status = (item.status || '').trim();
        const emoji = (item.emoji || '🍱').trim();
        const typeText = formatMeituanType(item.type);

        return `
            <div class="pc-meituan-item" onclick="openMeituanDetail(${idx})">
                <div class="pc-meituan-item-icon">${escapeHtml(emoji)}</div>
                <div class="pc-meituan-item-main">
                    <div class="pc-meituan-item-top">
                        <div class="pc-meituan-item-title">${escapeHtml(title)}</div>
                        <div class="pc-meituan-item-price">${escapeHtml(price)}</div>
                    </div>
                    <div class="pc-meituan-item-desc">${escapeHtml(preview)}</div>
                    <div class="pc-meituan-item-meta">
                        <div>${escapeHtml(time)}</div>
                        <div>${escapeHtml(typeText)} · ${escapeHtml(status)}</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function openMeituanDetail(index) {
    const item = pcMeituanItems[index];
    if (!item) return;

    pcMeituanCurrentIndex = index;

    document.getElementById('pcMeituanDetailTime').textContent = item.time || '';
    document.getElementById('pcMeituanDetailTitle').textContent = item.title || '';
    document.getElementById('pcMeituanDetailPrice').textContent = formatMeituanPrice(item.price);
    document.getElementById('pcMeituanDetailStore').textContent = item.storeName || '';
    document.getElementById('pcMeituanDetailType').textContent = formatMeituanType(item.type);
    document.getElementById('pcMeituanDetailStatus').textContent = item.status || '';
    document.getElementById('pcMeituanDetailDesc').textContent = item.desc || '';
    document.getElementById('pcMeituanDetailComment').textContent = item.comment || '';
    document.getElementById('pcMeituanDetailReason').textContent = item.reason || '';
    document.getElementById('pcMeituanDetailEmoji').textContent = item.emoji || '🍱';

    // 切换视图
    document.getElementById('pcMeituanListView').style.display = 'none';
    document.getElementById('pcMeituanDetailView').style.display = 'flex';

    // 详情页隐藏关闭/刷新
    const closeBtn = document.querySelector('#phoneCheckMeituanScreen .pc-meituan-back-btn');
    const refreshBtn = document.querySelector('#phoneCheckMeituanScreen .pc-meituan-refresh-btn');
    if (closeBtn) closeBtn.style.display = 'none';
    if (refreshBtn) refreshBtn.style.display = 'none';
}

function formatMeituanPrice(price) {
    const num = Number(price);
    if (isNaN(num)) return '¥--';
    return '¥' + num.toFixed(2);
}

function formatMeituanType(type) {
    const map = {
        takeout: '外卖',
        errand: '跑腿',
        medicine: '买药',
        market: '商超',
        dessert: '甜品饮品'
    };
    return map[type] || '订单';
}

async function generateMeituanData() {
    if (!phoneCheckCurrentCharId) return;

    const loadingEl = document.getElementById('pcMeituanLoading');
    const refreshBtn = document.getElementById('pcMeituanRefreshBtn');
    if (loadingEl) loadingEl.style.display = 'flex';
    if (refreshBtn) refreshBtn.classList.add('loading');

    try {
        const chat = chats.find(c => c.id === phoneCheckCurrentCharId);
        if (!chat) throw new Error('角色不存在');

        // 统一取材：人设 + 最近100条聊天 + 全部长期记忆
        const sourceData = await getPhoneCheckPromptSources(phoneCheckCurrentCharId);
        const personality = sourceData.personalityText || '';
        const recentChatText = sourceData.recentChatText || '（无最近聊天记录）';
        const memoryText = sourceData.memoryText || '（无长期记忆）';

        if (!personality.trim()) throw new Error('请先在角色资料里填写“他的人设”');

        // API配置：优先查手机方案，其次全局
        const phoneData = phoneCheckDataCache[phoneCheckCurrentCharId] || {};
        let apiConfig = null;

        if (phoneData.apiSchemeId) {
            await new Promise(resolve => {
                loadFromDB('apiSchemes', (data) => {
                    const schemes = (data && data.list) ? data.list : (Array.isArray(data) ? data : []);
                    apiConfig = schemes.find(s => s.id === phoneData.apiSchemeId);
                    resolve();
                });
            });
        }

        if (!apiConfig) {
            await new Promise(resolve => {
                loadFromDB('apiConfig', (data) => {
                    apiConfig = data;
                    resolve();
                });
            });
        }

        if (!apiConfig || !apiConfig.baseUrl || !apiConfig.apiKey) throw new Error('请先设置API');

        const prompt = `你是${chat.name}。请根据【人设】【最近100条聊天记录】【全部长期记忆】生成你手机里“美团/外卖/跑腿”订单内容。要求像真实活人的即时生活订单，不要像模板外卖清单。

【人设】：
${personality}

【最近100条聊天记录】：
${recentChatText}

【全部长期记忆】：
${memoryText}

核心规则：
1. 必须同时参考人设、聊天记录、长期记忆，不能只按人设自由发挥
2. 订单要体现真实生活节奏：忙、懒、馋、累、不想出门、临时急用、想喝点什么、需要买药、顺手补货等
3. 如果聊天记录和长期记忆里提到过饮食偏好、作息、常吃的东西、身体状态、生活习惯、情绪、突然想吃的、嫌麻烦不想出门等，要自然反映在订单里
4. 不能编造和资料完全不符的重大事件
5. 整体要有活人感：有些订单很普通，有些是临时起意，有些有点嘴馋，有些纯粹图省事

生成要求：
1. 生成 8-12 条订单 items
2. 每条都必须包含：
   - id
   - type（只能是 takeout / errand / medicine / market / dessert）
   - title（订单标题）
   - storeName（店铺名）
   - price（数字，单位元，不带¥）
   - status（已送达 / 已完成 / 已签收 / 回购过 / 再点一次 等真实状态）
   - time（相对时间/日期）
   - desc（订单内容简介）
   - comment（角色本人的评价/吐槽，必须像本人语气）
   - reason（为什么下单）
   - emoji（代表订单的 emoji）
3. 至少满足这些分布：
   - 至少 3 条是外卖正餐/夜宵/早餐
   - 至少 2 条是甜品饮品
   - 至少 1 条是跑腿 / 商超 / 买药
   - 至少 2 条能看出和聊天记录或长期记忆有细节关联
   - 至少 2 条评价明显带角色本人的口吻
4. 价格必须合理，像真实美团订单
5. 订单不要全都很精致，也不要全都很惨，要像真实人会点的单

风格要求：
1. title 要像真实订单标题，简短自然
2. desc 像订单简介，不要太长
3. comment 最重要，要像角色本人吃完/收到后会说的话
4. reason 要体现下单时的心情或需求，比如懒得出门、突然馋、加班太晚、胃不舒服、想喝甜的、家里没东西了
5. 不要把所有订单都写成剧情道具，很多订单本来只是普通生活

请严格只输出 JSON，不要输出多余文字：
{
  "items": [
    {
      "id": "mt1",
      "type": "takeout",
      "title": "",
      "storeName": "",
      "price": 0,
      "status": "",
      "time": "",
      "desc": "",
      "comment": "",
      "reason": "",
      "emoji": "🍱"
    }
  ]
}`;

        const res = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiConfig.apiKey}`
            },
            body: JSON.stringify({
                model: apiConfig.defaultModel || apiConfig.model || 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.85
            })
        });

        if (!res.ok) throw new Error('API请求失败');

        const json = await res.json();
        const content = json?.choices?.[0]?.message?.content || '';
        const match = content.match(/\{[\s\S]*\}/);
        if (!match) throw new Error('返回内容不是JSON');

        const parsed = JSON.parse(match[0]);
        const items = Array.isArray(parsed.items) ? parsed.items : [];

        pcMeituanItems = items.slice(0, 12).map((item, idx) => ({
            id: (item.id || `mt${idx + 1}`).toString(),
            type: (item.type || 'takeout').toString(),
            title: (item.title || '').toString(),
            storeName: (item.storeName || '').toString(),
            price: Number(item.price || 0),
            status: (item.status || '').toString(),
            time: (item.time || '').toString(),
            desc: (item.desc || '').toString(),
            comment: (item.comment || '').toString(),
            reason: (item.reason || '').toString(),
            emoji: (item.emoji || '🍱').toString()
        }));

        savePhoneCheckData(phoneCheckCurrentCharId, {
            meituanData: {
                items: pcMeituanItems,
                generatedAt: new Date().toLocaleString()
            }
        });

        renderMeituanList();

    } catch (e) {
        console.error(e);
        alert('生成失败：' + e.message);
    } finally {
        if (loadingEl) loadingEl.style.display = 'none';
        if (refreshBtn) refreshBtn.classList.remove('loading');
    }
}

// ============ 查手机-豆沙包功能 ============

let pcDoubanItems = [];

function openPhoneCheckDouban() {
    if (!phoneCheckCurrentCharId) return;

    const phoneData = phoneCheckDataCache[phoneCheckCurrentCharId] || {};
    pcDoubanItems = phoneData.doubanData?.items || [];

    renderDoubanList();

    // 隐藏 Dock
    const dock = document.querySelector('.pc-dock');
    if (dock) dock.style.display = 'none';

    document.getElementById('phoneCheckDoubanScreen').style.display = 'flex';
}

function closePhoneCheckDouban() {
    document.getElementById('phoneCheckDoubanScreen').style.display = 'none';

    const dock = document.querySelector('.pc-dock');
    if (dock) dock.style.display = 'flex';
}

function renderDoubanList() {
    const listEl = document.getElementById('pcDoubanList');
    if (!listEl) return;

    if (!pcDoubanItems || pcDoubanItems.length === 0) {
        listEl.innerHTML = '<div class="pc-douban-empty">点击右上角刷新按钮<br>生成 TA 的豆沙包提问记录~</div>';
        return;
    }

    listEl.innerHTML = pcDoubanItems.map(item => {
        const time = (item.time || '').trim();
        const question = (item.question || '').trim();
        const answer = (item.answer || '').trim();
        const os = (item.os || '').trim();

        return `
            <div class="pc-douban-item">
                <div class="pc-douban-item-head">
                    <div class="pc-douban-question-title">${escapeHtml(question)}</div>
                    <div class="pc-douban-item-time">${escapeHtml(time)}</div>
                </div>

                <div class="pc-douban-answer">${escapeHtml(answer)}</div>

                <div class="pc-douban-os-box">
                    <div class="pc-douban-os-icon">💬</div>
                    <div class="pc-douban-os-text">${escapeHtml(os)}</div>
                </div>
            </div>
        `;
    }).join('');
}

async function generateDoubanData() {
    if (!phoneCheckCurrentCharId) return;

    const loadingEl = document.getElementById('pcDoubanLoading');
    const refreshBtn = document.getElementById('pcDoubanRefreshBtn');
    if (loadingEl) loadingEl.style.display = 'flex';
    if (refreshBtn) refreshBtn.classList.add('loading');

    try {
        const chat = chats.find(c => c.id === phoneCheckCurrentCharId);
        if (!chat) throw new Error('角色不存在');

        // 统一取材：人设 + 最近100条聊天 + 全部长期记忆
        const sourceData = await getPhoneCheckPromptSources(phoneCheckCurrentCharId);
        const personality = sourceData.personalityText || '';
        const recentChatText = sourceData.recentChatText || '（无最近聊天记录）';
        const memoryText = sourceData.memoryText || '（无长期记忆）';

        if (!personality.trim()) throw new Error('请先在角色资料里填写“他的人设”');

        // API配置：优先查手机方案，其次全局
        const phoneData = phoneCheckDataCache[phoneCheckCurrentCharId] || {};
        let apiConfig = null;

        if (phoneData.apiSchemeId) {
            await new Promise(resolve => {
                loadFromDB('apiSchemes', (data) => {
                    const schemes = (data && data.list) ? data.list : (Array.isArray(data) ? data : []);
                    apiConfig = schemes.find(s => s.id === phoneData.apiSchemeId);
                    resolve();
                });
            });
        }

        if (!apiConfig) {
            await new Promise(resolve => {
                loadFromDB('apiConfig', (data) => {
                    apiConfig = data;
                    resolve();
                });
            });
        }

        if (!apiConfig || !apiConfig.baseUrl || !apiConfig.apiKey) throw new Error('请先设置API');

             const prompt = `你是${chat.name}。请根据【人设】【最近100条聊天记录】【全部长期记忆】生成你手机里“豆沙包/AI提问记录”内容。

这不是正式问答区，也不是百科词条。
而是：你本人最近脑子里冒出来、又懒得问别人，或者不太好意思直接问别人，所以顺手丢给 AI 的问题。

【人设】：
${personality}

【最近100条聊天记录】：
${recentChatText}

【全部长期记忆】：
${memoryText}

最重要规则：
1. 必须同时参考人设、聊天记录、长期记忆，不能只按人设自由发挥
2. 问题必须像“这个角色本人真的会问”的，不要像标准化科普问题
3. 如果聊天记录和长期记忆里有反复出现的困惑、卡住的点、在意的小事、想不通的话、和某个人有关的小情绪，都要自然转成提问
4. 不允许直接写出“user”这个英文代称；如果涉及聊天对象，必须自然写成“我”“你”或聊天里真实出现过的称呼/名字
5. 不能编造完全没有依据的重大事实
6. 整体要像真实活人：有点随手、有点嘴硬、有点认真、有点傻问题、有点不想承认自己在意

内容方向：
1. 可以包含这些类型，但要自然混合：
   - 生活类：吃的、买的、日常习惯、身体状态、懒、累、睡眠、作息
   - 情绪类：为什么会这样想、为什么会在意、为什么会烦、为什么会忍不住反复想
   - 关系类：回消息、语气、在意、吃醋、误会、想不明白的互动
   - 常识类：突然想到就问一下的小问题
   - 工作/学习类：某个小知识点、小难题、小确认
2. 不要全都很正经，也不要全都恋爱脑
3. 至少有几条看得出来是“嘴上不承认，其实挺在意”

生成要求：
1. 生成 8-12 条 items
2. 每条都必须包含：
   - id
   - question
   - answer
   - os
   - time
3. 至少满足这些分布：
   - 至少 3 条生活/日常类
   - 至少 2 条情绪/关系类
   - 至少 2 条常识/工作/学习类
   - 至少 3 条能明显看出参考了聊天记录或长期记忆细节
   - 至少 4 条 os 明显像角色本人
4. question 不要写得太书面，像真的会打给 AI 的一句话
5. answer 不要太官方、太百科，控制在 1-3 句话，像 AI 给出的简洁说明
6. os 最重要，必须像角色本人看完后的第一反应

写法要求：
1. question 要短一点、自然一点，允许口语化
2. answer 要像 AI 回答，但别太“教材味”
3. os 要像本人，会有这些感觉：
   - “行吧，知道了。”
   - “我就说。”
   - “……有道理，但还是不爽。”
   - “怪不得。”
   - “行，先记着。”
   - “说得轻巧。”
   - “听起来像那么回事。”
4. 不要让 question 里出现“请问”“为什么会导致”“通常情况下”这种太官方的措辞
5. 不要让 answer 变成长篇科普
6. 不要让 os 写成旁白或总结报告，必须像角色自己心里的话

额外要求：
1. question / answer / os 这三个字段里都不要自己再写“提问：”“回答：”“内心OS：”前缀
2. 问题可以有点奇怪、有点钻牛角尖、有点突然，但要像活人
3. 如果某条和“我”有关，可以体现角色的在意，但不能直接编造重大共同经历

请严格只输出 JSON，不要输出多余文字：
{
  "items": [
    {
      "id": "db1",
      "question": "",
      "answer": "",
      "os": "",
      "time": ""
    }
  ]
}`;

        const res = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiConfig.apiKey}`
            },
            body: JSON.stringify({
                model: apiConfig.defaultModel || apiConfig.model || 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.84
            })
        });

        if (!res.ok) throw new Error('API请求失败');

        const json = await res.json();
        const content = json?.choices?.[0]?.message?.content || '';
        const match = content.match(/\{[\s\S]*\}/);
        if (!match) throw new Error('返回内容不是JSON');

        const parsed = JSON.parse(match[0]);
        const items = Array.isArray(parsed.items) ? parsed.items : [];

        pcDoubanItems = items.slice(0, 12).map((item, idx) => ({
            id: (item.id || `db${idx + 1}`).toString(),
            question: (item.question || '').toString(),
            answer: (item.answer || '').toString(),
            os: (item.os || '').toString(),
            time: (item.time || '').toString()
        }));

        savePhoneCheckData(phoneCheckCurrentCharId, {
            doubanData: {
                items: pcDoubanItems,
                generatedAt: new Date().toLocaleString()
            }
        });

        renderDoubanList();

    } catch (e) {
        console.error(e);
        alert('生成失败：' + e.message);
    } finally {
        if (loadingEl) loadingEl.style.display = 'none';
        if (refreshBtn) refreshBtn.classList.remove('loading');
    }
}


// ============ 查手机-旅程功能 ============

let pcTripItems = [];
let pcTripCurrentIndex = -1;

function openPhoneCheckTrip() {
    if (!phoneCheckCurrentCharId) return;

    const phoneData = phoneCheckDataCache[phoneCheckCurrentCharId] || {};
    pcTripItems = phoneData.tripData?.items || [];

    // 默认列表
    document.getElementById('pcTripListView').style.display = 'flex';
    document.getElementById('pcTripDetailView').style.display = 'none';

    // 列表按钮可见
    const closeBtn = document.querySelector('#phoneCheckTripScreen .pc-trip-back-btn');
    const refreshBtn = document.querySelector('#phoneCheckTripScreen .pc-trip-refresh-btn');
    if (closeBtn) closeBtn.style.display = 'flex';
    if (refreshBtn) refreshBtn.style.display = 'flex';

    renderTripList();

    // 隐藏 Dock
    const dock = document.querySelector('.pc-dock');
    if (dock) dock.style.display = 'none';

    document.getElementById('phoneCheckTripScreen').style.display = 'flex';
}

function closePhoneCheckTrip() {
    document.getElementById('phoneCheckTripScreen').style.display = 'none';

    const dock = document.querySelector('.pc-dock');
    if (dock) dock.style.display = 'flex';
}

function backToTripList() {
    document.getElementById('pcTripDetailView').style.display = 'none';
    document.getElementById('pcTripListView').style.display = 'flex';

    const closeBtn = document.querySelector('#phoneCheckTripScreen .pc-trip-back-btn');
    const refreshBtn = document.querySelector('#phoneCheckTripScreen .pc-trip-refresh-btn');
    if (closeBtn) closeBtn.style.display = 'flex';
    if (refreshBtn) refreshBtn.style.display = 'flex';
}

function renderTripList() {
    const listEl = document.getElementById('pcTripList');
    if (!listEl) return;

    if (!pcTripItems || pcTripItems.length === 0) {
        listEl.innerHTML = '<div class="pc-trip-empty">点击右上角刷新按钮<br>生成 TA 的旅程记录~</div>';
        return;
    }

    listEl.innerHTML = pcTripItems.map((item, idx) => {
        const title = (item.title || '').trim() || '（未命名行程）';
        const desc = (item.desc || '').trim();
        const preview = desc.replace(/\n+/g, ' ').slice(0, 80);
        const time = (item.time || '').trim();
        const price = formatTripPrice(item.price);
        const status = (item.status || '').trim();
        const emoji = (item.emoji || '🧳').trim();
        const typeText = formatTripType(item.type);

        return `
            <div class="pc-trip-item" onclick="openTripDetail(${idx})">
                <div class="pc-trip-item-icon">${escapeHtml(emoji)}</div>
                <div class="pc-trip-item-main">
                    <div class="pc-trip-item-top">
                        <div class="pc-trip-item-title">${escapeHtml(title)}</div>
                        <div class="pc-trip-item-price">${escapeHtml(price)}</div>
                    </div>
                    <div class="pc-trip-item-desc">${escapeHtml(preview)}</div>
                    <div class="pc-trip-item-meta">
                        <div>${escapeHtml(time)}</div>
                        <div>${escapeHtml(typeText)} · ${escapeHtml(status)}</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function openTripDetail(index) {
    const item = pcTripItems[index];
    if (!item) return;

    pcTripCurrentIndex = index;

    document.getElementById('pcTripDetailTime').textContent = item.time || '';
    document.getElementById('pcTripDetailTitle').textContent = item.title || '';
    document.getElementById('pcTripDetailPrice').textContent = formatTripPrice(item.price);
    document.getElementById('pcTripDetailType').textContent = formatTripType(item.type);
    document.getElementById('pcTripDetailStatus').textContent = item.status || '';
    document.getElementById('pcTripDetailFrom').textContent = item.fromCity || '-';
    document.getElementById('pcTripDetailTo').textContent = item.toCity || '-';
    document.getElementById('pcTripDetailTicket').textContent = item.ticketNo || '-';
    document.getElementById('pcTripDetailHotel').textContent = item.hotelName || '-';
    document.getElementById('pcTripDetailDesc').textContent = item.desc || '';
    document.getElementById('pcTripDetailReason').textContent = item.reason || '';
    document.getElementById('pcTripDetailComment').textContent = item.comment || '';
    document.getElementById('pcTripDetailEmoji').textContent = item.emoji || '🧳';

    document.getElementById('pcTripListView').style.display = 'none';
    document.getElementById('pcTripDetailView').style.display = 'flex';

    const closeBtn = document.querySelector('#phoneCheckTripScreen .pc-trip-back-btn');
    const refreshBtn = document.querySelector('#phoneCheckTripScreen .pc-trip-refresh-btn');
    if (closeBtn) closeBtn.style.display = 'none';
    if (refreshBtn) refreshBtn.style.display = 'none';
}

function formatTripPrice(price) {
    const num = Number(price);
    if (isNaN(num)) return '¥--';
    return '¥' + num.toFixed(2);
}

function formatTripType(type) {
    const map = {
        train: '火车/高铁',
        flight: '飞机',
        hotel: '酒店',
        trip: '行程',
        bus: '城际/大巴',
        change: '改签/补订'
    };
    return map[type] || '旅程';
}

async function generateTripData() {
    if (!phoneCheckCurrentCharId) return;

    const loadingEl = document.getElementById('pcTripLoading');
    const refreshBtn = document.getElementById('pcTripRefreshBtn');
    if (loadingEl) loadingEl.style.display = 'flex';
    if (refreshBtn) refreshBtn.classList.add('loading');

    try {
        const chat = chats.find(c => c.id === phoneCheckCurrentCharId);
        if (!chat) throw new Error('角色不存在');

        // 统一取材：人设 + 最近100条聊天 + 全部长期记忆
        const sourceData = await getPhoneCheckPromptSources(phoneCheckCurrentCharId);
        const personality = sourceData.personalityText || '';
        const recentChatText = sourceData.recentChatText || '（无最近聊天记录）';
        const memoryText = sourceData.memoryText || '（无长期记忆）';

        if (!personality.trim()) throw new Error('请先在角色资料里填写“他的人设”');

        // API配置：优先查手机方案，其次全局
        const phoneData = phoneCheckDataCache[phoneCheckCurrentCharId] || {};
        let apiConfig = null;

        if (phoneData.apiSchemeId) {
            await new Promise(resolve => {
                loadFromDB('apiSchemes', (data) => {
                    const schemes = (data && data.list) ? data.list : (Array.isArray(data) ? data : []);
                    apiConfig = schemes.find(s => s.id === phoneData.apiSchemeId);
                    resolve();
                });
            });
        }

        if (!apiConfig) {
            await new Promise(resolve => {
                loadFromDB('apiConfig', (data) => {
                    apiConfig = data;
                    resolve();
                });
            });
        }

        if (!apiConfig || !apiConfig.baseUrl || !apiConfig.apiKey) throw new Error('请先设置API');

        const prompt = `你是${chat.name}。请根据【人设】【最近100条聊天记录】【全部长期记忆】生成你手机里的“旅程/票务/酒店”记录。要求像真实活人的出行订单，不要像旅游博主行程单。

【人设】：
${personality}

【最近100条聊天记录】：
${recentChatText}

【全部长期记忆】：
${memoryText}

核心规则：
1. 必须同时参考人设、聊天记录、长期记忆，不能只按人设自由发挥
2. 旅程记录要像真实生活中的出行：出差、返程、短途、住酒店、临时赶路、回家、普通移动，而不是每条都很浪漫或很夸张
3. 如果聊天记录和长期记忆里提到过出差、赶路、住外面、订票、回程、某个城市、工作学习安排、疲惫感、改签等，要自然体现在记录里
4. 不能编造和资料完全无关的重大旅行，也不能编造和 user 已经共同发生的出行或酒店事实
5. 整体要有活人感：有的行程很普通，有的很赶，有的只是住一晚，有的只是短途移动
6. 如果涉及聊天对象，不允许直接写出“user”这个英文代称；必须根据语境自然写成“我”“你”或聊天里真实出现过的称呼/名字

生成要求：
1. 生成 8-10 条旅程 items
2. 每条都必须包含：
   - id
   - type（只能是 train / flight / hotel / trip / bus / change）
   - title（标题）
   - status（待出发 / 已出行 / 已入住 / 已离店 / 已改签 / 已完成 等）
   - time（相对时间/日期）
   - price（数字，单位元，不带¥）
   - fromCity（出发地，没有可空）
   - toCity（目的地，没有可空）
   - ticketNo（车次/航班号/订单号，没有可空）
   - hotelName（酒店名，没有可空）
   - desc（行程内容简介）
   - comment（角色自己的评价/感受，必须像本人语气）
   - reason（为什么会有这条行程/为什么订）
   - emoji（代表项目的 emoji）
3. 至少满足这些分布：
   - 至少 2 条火车/高铁/城际类
   - 至少 1 条飞机或改签类
   - 至少 2 条酒店/住宿类
   - 至少 2 条能看出和聊天记录或长期记忆有细节关联
   - 至少 2 条 comment 明显带角色本人语气
4. 价格要合理，像真实票务和住宿价格，飞机票大约1000以上，火车高铁100以上，一定要符合实情！
5. 不要把每条都写成远途旅游，有些可以只是普通差旅或短住

风格要求：
1. 整体风格克制、真实、生活化
2. comment 要像角色本人在看订单时会想的：
   - 累
   - 赶
   - 将就
   - 还行
   - 凑合住一晚
   - 这趟真折腾
   - 终于能回去
3. reason 要写出真实动机：工作、出差、临时安排、返程、短住、过渡、赶时间
4. 不要写成抒情散文，也不要写成旅行种草

请严格只输出 JSON，不要输出多余文字：
{
  "items": [
    {
      "id": "trip1",
      "type": "train",
      "title": "",
      "status": "",
      "time": "",
      "price": 0,
      "fromCity": "",
      "toCity": "",
      "ticketNo": "",
      "hotelName": "",
      "desc": "",
      "comment": "",
      "reason": "",
      "emoji": "🧳"
    }
  ]
}`;

        const res = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiConfig.apiKey}`
            },
            body: JSON.stringify({
                model: apiConfig.defaultModel || apiConfig.model || 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.82
            })
        });

        if (!res.ok) throw new Error('API请求失败');

        const json = await res.json();
        const content = json?.choices?.[0]?.message?.content || '';
        const match = content.match(/\{[\s\S]*\}/);
        if (!match) throw new Error('返回内容不是JSON');

        const parsed = JSON.parse(match[0]);
        const items = Array.isArray(parsed.items) ? parsed.items : [];

        pcTripItems = items.slice(0, 12).map((item, idx) => ({
            id: (item.id || `trip${idx + 1}`).toString(),
            type: (item.type || 'trip').toString(),
            title: (item.title || '').toString(),
            status: (item.status || '').toString(),
            time: (item.time || '').toString(),
            price: Number(item.price || 0),
            fromCity: (item.fromCity || '').toString(),
            toCity: (item.toCity || '').toString(),
            ticketNo: (item.ticketNo || '').toString(),
            hotelName: (item.hotelName || '').toString(),
            desc: (item.desc || '').toString(),
            comment: (item.comment || '').toString(),
            reason: (item.reason || '').toString(),
            emoji: (item.emoji || '🧳').toString()
        }));

        savePhoneCheckData(phoneCheckCurrentCharId, {
            tripData: {
                items: pcTripItems,
                generatedAt: new Date().toLocaleString()
            }
        });

        renderTripList();

    } catch (e) {
        console.error(e);
        alert('生成失败：' + e.message);
    } finally {
        if (loadingEl) loadingEl.style.display = 'none';
        if (refreshBtn) refreshBtn.classList.remove('loading');
    }
}

// ============ 查手机-行踪功能 ============

let pcTraceDays = [];
let pcTraceCurrent = null;

function openPhoneCheckTrace() {
    if (!phoneCheckCurrentCharId) return;

    const phoneData = phoneCheckDataCache[phoneCheckCurrentCharId] || {};
    pcTraceDays = phoneData.traceData?.days || [];

    // 默认列表
    document.getElementById('pcTraceListView').style.display = 'flex';
    document.getElementById('pcTraceDetailView').style.display = 'none';

    // 列表按钮可见
    const closeBtn = document.querySelector('#phoneCheckTraceScreen .pc-trace-back-btn');
    const refreshBtn = document.querySelector('#phoneCheckTraceScreen .pc-trace-refresh-btn');
    if (closeBtn) closeBtn.style.display = 'flex';
    if (refreshBtn) refreshBtn.style.display = 'flex';

    renderTraceTimeline();

    // 隐藏Dock
    const dock = document.querySelector('.pc-dock');
    if (dock) dock.style.display = 'none';

    document.getElementById('phoneCheckTraceScreen').style.display = 'block';
}

function closePhoneCheckTrace() {
    document.getElementById('phoneCheckTraceScreen').style.display = 'none';

    const dock = document.querySelector('.pc-dock');
    if (dock) dock.style.display = 'flex';
}

function backToTraceList() {
    document.getElementById('pcTraceDetailView').style.display = 'none';
    document.getElementById('pcTraceListView').style.display = 'flex';

    // 回到列表恢复按钮
    const closeBtn = document.querySelector('#phoneCheckTraceScreen .pc-trace-back-btn');
    const refreshBtn = document.querySelector('#phoneCheckTraceScreen .pc-trace-refresh-btn');
    if (closeBtn) closeBtn.style.display = 'flex';
    if (refreshBtn) refreshBtn.style.display = 'flex';
}

function renderTraceTimeline() {
    const wrap = document.getElementById('pcTraceTimeline');
    if (!wrap) return;

    if (!pcTraceDays || pcTraceDays.length === 0) {
        wrap.innerHTML = '<div class="pc-trace-empty">点击右上角刷新按钮<br>生成 TA 的七日行踪~</div>';
        return;
    }

    wrap.innerHTML = pcTraceDays.map((day, dayIdx) => {
        const label = day.label || '';
        const date = day.date || '';
        const records = Array.isArray(day.records) ? day.records : [];

        const itemsHtml = records.map((r, recIdx) => {
            const t = `${r.start || ''}${(r.end ? ` - ${r.end}` : '')}`.trim();
            return `
                <div class="pc-trace-item" onclick="openTraceDetail(${dayIdx}, ${recIdx})">
                    <div class="pc-trace-item-dot"></div>
                    <div class="pc-trace-item-main">
                        <div class="pc-trace-item-top">
                            <div class="pc-trace-item-place">${escapeHtml(r.place || '')}</div>
                            <div class="pc-trace-item-time">${escapeHtml(t)}</div>
                        </div>
                        <div class="pc-trace-item-event">${escapeHtml(r.event || '')}</div>
                    </div>
                    <div class="pc-trace-item-arrow">›</div>
                </div>
            `;
        }).join('');

        return `
            <div class="pc-trace-day">
                <div class="pc-trace-day-header">
                    <div class="pc-trace-day-label">${escapeHtml(label)}</div>
                    <div class="pc-trace-day-date">${escapeHtml(date)}</div>
                </div>
                ${itemsHtml || ''}
            </div>
        `;
    }).join('');
}

function openTraceDetail(dayIndex, recIndex) {
    const day = pcTraceDays[dayIndex];
    if (!day) return;
    const rec = (day.records || [])[recIndex];
    if (!rec) return;

    pcTraceCurrent = { dayIndex, recIndex };

    const dateText = day.date || '';
    const labelText = day.label || '';
    document.getElementById('pcTraceDetailDate').textContent = `${labelText} · ${dateText}`.trim();
    document.getElementById('pcTraceDetailPlace').textContent = rec.place || '';
    document.getElementById('pcTraceDetailTime').textContent = `${rec.start || ''}${rec.end ? ` - ${rec.end}` : ''}`.trim();

    document.getElementById('pcTraceDetailEvent').textContent = rec.event || '';
    document.getElementById('pcTraceDetailThought').textContent = rec.thought || '';

    const rel = (rec.relationToUser || '').trim();
    const relWrap = document.getElementById('pcTraceUserWrap');
    if (rel) {
        document.getElementById('pcTraceDetailRelation').textContent = rel;
        relWrap.style.display = 'block';
    } else {
        relWrap.style.display = 'none';
    }

    // 切换视图
    document.getElementById('pcTraceListView').style.display = 'none';
    document.getElementById('pcTraceDetailView').style.display = 'flex';

    // 详情页隐藏关闭/刷新，避免误触回主屏幕
    const closeBtn = document.querySelector('#phoneCheckTraceScreen .pc-trace-back-btn');
    const refreshBtn = document.querySelector('#phoneCheckTraceScreen .pc-trace-refresh-btn');
    if (closeBtn) closeBtn.style.display = 'none';
    if (refreshBtn) refreshBtn.style.display = 'none';
}

function getWeekLabelCN(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return '';
    const arr = ['周日','周一','周二','周三','周四','周五','周六'];
    return arr[d.getDay()];
}

function getLast7Dates() {
    const arr = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const Y = d.getFullYear();
        const M = String(d.getMonth() + 1).padStart(2, '0');
        const DD = String(d.getDate()).padStart(2, '0');
        arr.push(`${Y}-${M}-${DD}`);
    }
    return arr; // [today, ...]
}

async function generateTraceData() {
    if (!phoneCheckCurrentCharId) return;

    const loadingEl = document.getElementById('pcTraceLoading');
    const refreshBtn = document.getElementById('pcTraceRefreshBtn');
    if (loadingEl) loadingEl.style.display = 'flex';
    if (refreshBtn) refreshBtn.classList.add('loading');

    try {
        const chat = chats.find(c => c.id === phoneCheckCurrentCharId);
        if (!chat) throw new Error('角色不存在');

        // 统一取材：人设 + 最近100条聊天 + 全部长期记忆
        const sourceData = await getPhoneCheckPromptSources(phoneCheckCurrentCharId);
        const personality = sourceData.personalityText || '';
        const recentChatText = sourceData.recentChatText || '（无最近聊天记录）';
        const memoryText = sourceData.memoryText || '（无长期记忆）';

        if (!personality.trim()) throw new Error('请先在角色资料里填写“他的人设”');

        // API配置：优先查手机方案，其次全局
        const phoneData = phoneCheckDataCache[phoneCheckCurrentCharId] || {};
        let apiConfig = null;

        if (phoneData.apiSchemeId) {
            await new Promise(resolve => {
                loadFromDB('apiSchemes', (data) => {
                    const schemes = (data && data.list) ? data.list : (Array.isArray(data) ? data : []);
                    apiConfig = schemes.find(s => s.id === phoneData.apiSchemeId);
                    resolve();
                });
            });
        }

        if (!apiConfig) {
            await new Promise(resolve => {
                loadFromDB('apiConfig', (data) => {
                    apiConfig = data;
                    resolve();
                });
            });
        }

        if (!apiConfig || !apiConfig.baseUrl || !apiConfig.apiKey) throw new Error('请先设置API');

        const nowLocal = (typeof formatNowLocal === 'function') ? formatNowLocal() : new Date().toLocaleString();
        const dates = getLast7Dates(); // today -> past
        const dateRangeText = `${dates[6]} ~ ${dates[0]}`;

            const prompt = `你是${chat.name}。请根据【人设】【最近100条聊天记录】【全部长期记忆】生成你最近7天的“行踪/足迹”，用于手机里的行踪记录页面。要求像真实活人的生活轨迹，不要像旅游行程单或剧情梗概。

【本地当前时间】${nowLocal}
【日期范围】必须只覆盖最近7天：${dateRangeText}（不要出现其它日期，不要出现未来）

【人设】：
${personality}

【最近100条聊天记录】：
${recentChatText}

【全部长期记忆】：
${memoryText}

核心规则：
1. 必须同时参考人设、聊天记录、长期记忆，不能只按人设自由发挥
2. 行踪重点体现真实生活节奏：起床、出门、通勤、上班/上课、买东西、散步、吃饭、回家、短暂停留、临时绕路、宅着、随手去某地等
3. 如果聊天记录和长期记忆里提到过常去的地方、生活习惯、兴趣爱好、作息、压力来源、喜欢的店、固定活动、想去但没去成的地方，都要自然体现在行踪里
4. 不要编造没有依据的重大事件，尤其不能写成已经和 user 见面、约会、旅行、一起出门，除非资料里明确存在
5. 整体要有活人感：有普通日子、有无聊路线、有重复地点、有短暂停留，不要每天都很丰富精彩
6. 允许某些日子比较平淡，甚至只是家里、便利店、楼下、通勤路上，这种真实感很重要

生成要求：
1. 每天 1~3 条记录，允许某天 0 条（宅家、没怎么出门、行程很少）
2. 地点不要写具体地址或真实门牌，使用泛地点，例如：
   公司 / 学校 / 咖啡店 / 公园 / 便利店 / 商场 / 地铁站 / 健身房 / 书店 / 医院 / 小区楼下 / 家里 / 路上
3. 每条记录必须包含：
   - start（HH:mm）
   - end（HH:mm）
   - place
   - event（简短，写当时在做什么）
   - thought（详细一点的内心想法，要像当时真的会想的）
   - relationToUser（可为空）
4. label 建议用：今天 / 昨天 / 周X（中文）
5. date 用 YYYY-MM-DD
6. JSON 必须可解析

内容分布要求：
1. 至少有 3 天能明显看出“生活习惯/作息/兴趣”痕迹
2. 至少有 3 条记录能看出和聊天记录或长期记忆有细节关联
3. 至少有 2 条记录是非常普通但很真实的小行程，比如买水、路过便利店、下楼拿快递、晚饭后乱走一会儿
4. 至少有 1-2 条记录可以带一点“想起 user / 想发消息 / 看到某样东西联想到你 / 如果你在就好了”的 relationToUser
5. relationToUser 只能写成不构成既成事实的表达，严禁写成已经见面或共同发生过某件事

风格要求：
1. thought 不要写成抒情散文，要像真实人在某个时刻脑子里闪过的念头
2. 可以有疲惫、放空、嘴硬、治愈、烦躁、松一口气、突然想起谁、突然想买什么等真实状态
3. 有些记录可以很短，有些稍微多一点，不要每条都均匀工整
4. 行踪应该让人看出这个人“怎么过日子”，而不是只看出“他的人设标签”

请严格只输出 JSON，不要输出多余文字：
{
  "days": [
    {
      "date": "YYYY-MM-DD",
      "label": "今天",
      "records": [
        {
          "start": "HH:mm",
          "end": "HH:mm",
          "place": "",
          "event": "",
          "thought": "",
          "relationToUser": ""
        }
      ]
    }
  ]
}`;

        const res = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiConfig.apiKey}`
            },
            body: JSON.stringify({
                model: apiConfig.defaultModel || apiConfig.model || 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.82
            })
        });

        if (!res.ok) throw new Error('API请求失败');

        const json = await res.json();
        const content = json?.choices?.[0]?.message?.content || '';
        const match = content.match(/\{[\s\S]*\}/);
        if (!match) throw new Error('返回内容不是JSON');

        const parsed = JSON.parse(match[0]);
        const days = Array.isArray(parsed.days) ? parsed.days : [];

        // 兜底：补齐 label，且只保留最近7天日期
        const allowed = new Set(getLast7Dates());
        pcTraceDays = days
            .filter(d => d && d.date && allowed.has(d.date))
            .sort((a, b) => (a.date < b.date ? 1 : -1)) // desc
            .map(d => ({
                date: d.date,
                label: d.label || (d.date === getLast7Dates()[0] ? '今天' : (d.date === getLast7Dates()[1] ? '昨天' : getWeekLabelCN(d.date))),
                records: (Array.isArray(d.records) ? d.records : []).slice(0, 3).map(r => ({
                    start: (r.start || '').toString(),
                    end: (r.end || '').toString(),
                    place: (r.place || '').toString(),
                    event: (r.event || '').toString(),
                    thought: (r.thought || '').toString(),
                    relationToUser: (r.relationToUser || '').toString()
                }))
            }));

        savePhoneCheckData(phoneCheckCurrentCharId, {
            traceData: {
                days: pcTraceDays,
                generatedAt: new Date().toLocaleString()
            }
        });

        renderTraceTimeline();

    } catch (e) {
        console.error(e);
        alert('生成失败：' + e.message);
    } finally {
        if (loadingEl) loadingEl.style.display = 'none';
        if (refreshBtn) refreshBtn.classList.remove('loading');
    }
}


//查手机功能结束//

// ====== 音乐功能：歌单管理 START ======

// 加载所有歌曲
function loadMusicSongs(callback) {
    loadFromDB('musicSongs', (songs) => {
        callback(songs || []);
    });
}

// 保存单首歌曲
function saveMusicSong(song, callback) {
    saveToDB('musicSongs', song, callback);
}

// 删除歌曲
function deleteMusicSong(songId, callback) {
    if (!db) return;
    const tx = db.transaction(['musicSongs'], 'readwrite');
    tx.objectStore('musicSongs').delete(songId);
    tx.oncomplete = () => { if (callback) callback(true); };
}

// 加载播放器状态
function loadPlayerState(callback) {
    loadFromDB('musicPlayer', (data) => {
        callback(data || {
            id: 1,
            currentSongId: null,
            mode: 'order',
            isPlaying: false,
            floatVisible: false,
            pendingInject: false,
            pendingSongId: null
        });
    });
}

// 保存播放器状态（支持局部更新）
let _playerStateCache = null;
function savePlayerState(patch, callback) {
    loadPlayerState((current) => {
        const updated = Object.assign({}, current, patch, { id: 1 });
        _playerStateCache = updated;
        saveToDB('musicPlayer', updated, callback);
    });
}

// 渲染歌单列表到弹窗
function renderMusicSongList(songs, currentSongId) {
    const list = document.getElementById('musicSongList');
    if (!list) return;
    if (!songs || songs.length === 0) {
        list.innerHTML = '<div style="text-align:center;color:#ccc;font-size:13px;padding:20px 0;">还没有歌曲，点击下方添加</div>';
        return;
    }
    list.innerHTML = songs.map(song => `
        <div class="music-song-item ${song.id === currentSongId ? 'playing' : ''}"
             style="display:flex; align-items:center; justify-content:space-between;">
            <div onclick="playSongFromList(${song.id})" style="flex:1; display:flex; align-items:center; padding:10px 12px;">
                <div class="music-song-name">${song.title}</div>
                <div class="music-song-artist">${song.artist}</div>
            </div>
            <button onclick="openEditSongModal(${song.id})" style="background:none; border:none; padding:10px 12px; color:#aaa; font-size:18px; cursor:pointer;">⋯</button>
        </div>
    `).join('');
}

// 打开音乐主弹窗
function openMusicModal() {
    const modal = document.getElementById('musicModal');
    if (!modal) return;
    modal.style.display = 'flex';
    loadMusicSongs((songs) => {
        loadPlayerState((state) => {
            const current = songs.find(s => s.id === state.currentSongId) || null;
            const titleEl = document.getElementById('musicCurrentTitle');
            const artistEl = document.getElementById('musicCurrentArtist');
            const lyricsEl = document.getElementById('musicLyricsText');
            if (titleEl) titleEl.textContent = current ? current.title : '暂无歌曲';
            if (artistEl) artistEl.textContent = current ? current.artist : '--';
            if (lyricsEl) lyricsEl.textContent = current ? current.lyrics : '暂无歌词';
            updateMusicPlayIcon(state.isPlaying);
            updateMusicModeBtn(state.mode);
        });
    });
}

function openMusicSongListModal() {
    loadMusicSongs((songs) => {
        loadPlayerState((state) => {
            renderMusicSongList(songs, state.currentSongId);
            document.getElementById('musicSongListModal').style.display = 'flex';
        });
    });
}

function closeMusicSongListModal(event) {
    if (event && event.target !== document.getElementById('musicSongListModal')) return;
    document.getElementById('musicSongListModal').style.display = 'none';
}

function toggleMusicSongPanel() {
    const panel = document.getElementById('musicSongPanel');
    if (!panel) return;
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

function closeMusicModal(event) {
    if (event && event.target !== document.getElementById('musicModal')) return;
    document.getElementById('musicModal').style.display = 'none';
}

// 歌词展开/收起
function toggleMusicLyrics() {
    const wrap = document.getElementById('musicLyricsWrap');
    const btn = document.getElementById('musicLyricsToggle');
    const expanded = wrap.classList.toggle('expanded');
    btn.textContent = expanded ? '收起歌词' : '展开歌词';
}

// 打开/关闭添加歌曲弹窗
function openAddSongModal() {
  document.getElementById('musicSongListModal').style.display = 'none';
document.getElementById('musicModal').style.display = 'none';
    const modal = document.getElementById('addSongModal');
    if (modal) {
        // 清空表单
        ['addSongTitle','addSongArtist','addSongUrl','addSongLyrics'].forEach(id => {
            document.getElementById(id).value = '';
        });
        modal.style.display = 'flex';
    }
}

function closeAddSongModal(event) {
    if (event && event.target !== document.getElementById('addSongModal')) return;
    document.getElementById('addSongModal').style.display = 'none';
   openMusicSongListModal();
}

// 保存新歌曲
function saveNewSong() {
    const title = document.getElementById('addSongTitle').value.trim();
    const artist = document.getElementById('addSongArtist').value.trim();
    const url = document.getElementById('addSongUrl').value.trim();
    const lyrics = document.getElementById('addSongLyrics').value.trim();

    if (!title || !artist || !url || !lyrics) {
        alert('请填写所有必填项（歌名、歌手、链接、歌词）');
        return;
    }

    const song = {
        id: Date.now(),
        title,
        artist,
        url,
        lyrics
    };

    saveMusicSong(song, () => {
        document.getElementById('addSongModal').style.display = 'none';
        openMusicModal();
    });
}

// 更新模式按钮文字
function updateMusicModeBtn(mode) {
    const btn = document.getElementById('musicModeBtn');
    if (!btn) return;
    const map = { order: '顺序', shuffle: '随机', loop: '单曲循环' };
    btn.textContent = map[mode] || '顺序';
}

// ====== 音乐功能：歌单管理 END ======

// ====== 音乐功能：播放控制 START ======

const _musicAudio = () => document.getElementById('chatMusicAudio');

// 播放指定歌曲
function playSong(songId) {
    loadMusicSongs((songs) => {
        const song = songs.find(s => s.id === songId);
        if (!song) return;

const audio = _musicAudio();
if (song.url && song.url.startsWith('data:')) {
    const byteString = atob(song.url.split(',')[1]);
    const mimeType = song.url.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    const blob = new Blob([ab], { type: mimeType });
    audio.src = URL.createObjectURL(blob);
} else {
    audio.src = song.url;
}
        audio.play().catch(e => console.warn('播放失败:', e));

        savePlayerState({
            currentSongId: songId,
            isPlaying: true,
            pendingInject: true,
            pendingSongId: songId
        });

        // 同步主弹窗UI
        const titleEl = document.getElementById('musicCurrentTitle');
        const artistEl = document.getElementById('musicCurrentArtist');
        const lyricsEl = document.getElementById('musicLyricsText');
        if (titleEl) titleEl.textContent = song.title;
        if (artistEl) artistEl.textContent = song.artist;
        if (lyricsEl) lyricsEl.textContent = song.lyrics;

        // 同步播放图标
        updateMusicPlayIcon(true);

        // 同步歌单高亮
        renderMusicSongList(songs, songId);
    });
}

// 播放/暂停切换
function toggleMusicPlay() {
    const audio = _musicAudio();
    loadPlayerState((state) => {
        if (state.isPlaying) {
            audio.pause();
            savePlayerState({ isPlaying: false });
            updateMusicPlayIcon(false);
        } else {
            // 没有歌曲时忽略
            if (!state.currentSongId) return;
            audio.play().catch(e => console.warn('播放失败:', e));
            savePlayerState({ isPlaying: true });
            updateMusicPlayIcon(true);
        }
    });
}

// 上一首
function musicPrev() {
    loadMusicSongs((songs) => {
        if (!songs || !songs.length) return;
        loadPlayerState((state) => {
            let idx = songs.findIndex(s => s.id === state.currentSongId);
            if (idx === -1) idx = 0;
            const prevIdx = (idx <= 0) ? songs.length - 1 : idx - 1;
            playSong(songs[prevIdx].id);
        });
    });
}

// 下一首
function musicNext() {
    loadMusicSongs((songs) => {
        if (!songs || !songs.length) return;
        loadPlayerState((state) => {
            let idx = songs.findIndex(s => s.id === state.currentSongId);
            if (idx === -1) idx = 0;
            const mode = state.mode;
            let nextIdx;
            if (mode === 'shuffle') {
                nextIdx = idx;
                if (songs.length > 1) {
                    while (nextIdx === idx) nextIdx = Math.floor(Math.random() * songs.length);
                }
            } else {
                nextIdx = (idx >= songs.length - 1) ? 0 : idx + 1;
            }
            playSong(songs[nextIdx].id);
        });
    });
}

// 播放模式切换：order → shuffle → loop
function switchMusicMode() {
    loadPlayerState((state) => {
        const modes = ['order', 'shuffle', 'loop'];
        const next = modes[(modes.indexOf(state.mode) + 1) % modes.length];
        savePlayerState({ mode: next });
        updateMusicModeBtn(next);
    });
}

// 更新播放/暂停图标（弹窗 + 悬浮条同步）
function updateMusicPlayIcon(isPlaying) {
    // 弹窗
    const pi = document.getElementById('musicPlayIcon');
    const pa = document.getElementById('musicPauseIcon');
    if (pi) pi.style.display = isPlaying ? 'none' : '';
    if (pa) pa.style.display = isPlaying ? '' : 'none';
    // 悬浮条
    const fpi = document.getElementById('musicFloatPlayIcon');
    const fpa = document.getElementById('musicFloatPauseIcon');
    if (fpi) fpi.style.display = isPlaying ? 'none' : '';
    if (fpa) fpa.style.display = isPlaying ? '' : 'none';
}

// 显示/隐藏悬浮条（弹窗内按钮）
function toggleMusicFloat() {
    loadPlayerState((state) => {
        const newVisible = !state.floatVisible;
        savePlayerState({ floatVisible: newVisible });
        const floatEl = document.getElementById('musicFloat');
        if (floatEl) floatEl.style.display = newVisible ? 'flex' : 'none';
        const btn = document.getElementById('musicFloatToggleBtn');
        if (btn) btn.textContent = newVisible ? '隐藏悬浮条' : '显示悬浮条';
    });
}

// 悬浮条 × 按钮：只隐藏浮层，不停播
function hideMusicFloat() {
    savePlayerState({ floatVisible: false });
    const floatEl = document.getElementById('musicFloat');
    if (floatEl) floatEl.style.display = 'none';
    const btn = document.getElementById('musicFloatToggleBtn');
    if (btn) btn.textContent = '显示悬浮条';
}

// audio 播放结束事件
document.addEventListener('DOMContentLoaded', () => {
    const audio = _musicAudio();
    if (!audio) return;

    audio.addEventListener('ended', () => {
        loadPlayerState((state) => {
            if (state.mode === 'loop') {
                audio.currentTime = 0;
                audio.play();
            } else {
                musicNext();
            }
        });
    });

    // 页面加载时恢复悬浮条显示状态
    loadPlayerState((state) => {
        const floatEl = document.getElementById('musicFloat');
        if (floatEl && state.floatVisible) {
            floatEl.style.display = 'flex';
        }
        // 恢复播放图标状态（页面刷新后 audio 不自动续播，isPlaying 重置为 false）
        savePlayerState({ isPlaying: false });
        updateMusicPlayIcon(false);
    });
});

// 从列表点击播放（播放后关闭列表弹窗回主弹窗）
function playSongFromList(songId) {
    playSong(songId);
    // 更新主弹窗信息
    loadMusicSongs((songs) => {
        const song = songs.find(s => s.id === songId);
        if (!song) return;
        document.getElementById('musicCurrentTitle').textContent = song.title;
        document.getElementById('musicCurrentArtist').textContent = song.artist;
        document.getElementById('musicLyricsText').textContent = song.lyrics;
    });
}

// 打开编辑弹窗
function openEditSongModal(songId) {
    loadMusicSongs((songs) => {
        const song = songs.find(s => s.id === songId);
        if (!song) return;
        document.getElementById('editSongId').value = song.id;
        document.getElementById('editSongTitle').value = song.title;
        document.getElementById('editSongArtist').value = song.artist;
        document.getElementById('editSongUrl').value = song.url;
        document.getElementById('editSongLyrics').value = song.lyrics;
        document.getElementById('editSongModal').style.display = 'flex';
    });
}

function closeEditSongModal(event) {
    if (event && event.target !== document.getElementById('editSongModal')) return;
    document.getElementById('editSongModal').style.display = 'none';
}

// 保存编辑
function saveEditSong() {
    const id = parseInt(document.getElementById('editSongId').value);
    const title = document.getElementById('editSongTitle').value.trim();
    const artist = document.getElementById('editSongArtist').value.trim();
    const url = document.getElementById('editSongUrl').value.trim();
    const lyrics = document.getElementById('editSongLyrics').value.trim();

    if (!title || !artist || !url || !lyrics) {
        alert('请填写所有必填项');
        return;
    }

    saveMusicSong({ id, title, artist, url, lyrics }, () => {
        document.getElementById('editSongModal').style.display = 'none';
        openMusicSongListModal();
    });
}

// 删除歌曲
function deleteEditSong() {
    const id = parseInt(document.getElementById('editSongId').value);
    if (!confirm('确定删除这首歌曲？')) return;
    deleteMusicSong(id, () => {
        // 如果删的是当前播放的歌，重置状态
        loadPlayerState((state) => {
            if (state.currentSongId === id) {
                _musicAudio().pause();
                _musicAudio().src = '';
                savePlayerState({ currentSongId: null, isPlaying: false });
                document.getElementById('musicCurrentTitle').textContent = '暂无歌曲';
                document.getElementById('musicCurrentArtist').textContent = '--';
                updateMusicPlayIcon(false);
            }
            document.getElementById('editSongModal').style.display = 'none';
            openMusicSongListModal();
        });
    });
}

// ====== 音乐功能：AI注入 START ======

// store 名称常量
const MUSIC_PLAYER_STORE = 'musicPlayer';
const MUSIC_SONGS_STORE = 'musicSongs';

// 构建注入文本
function buildMusicInjectText(song) {
    if (!song || !song.title || !song.artist || !song.lyrics) return null;
    return `【背景信息：当前正在播放的音乐】
歌曲名：${song.title}
歌手：${song.artist}
歌词内容（仅供你知道，禁止直接引用歌词原文作为【引用:】指令格式输出）：
${song.lyrics}
【重要：你可以自然地提到这首歌或歌词意境，但严禁使用【引用:歌词内容】的格式输出歌词。】`;
}

// ====== 音乐功能：AI注入 END ======

function handleSongFileImport(input, mode) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const base64 = e.target.result;
        if (mode === 'edit') {
            document.getElementById('editSongUrl').value = base64;
            document.getElementById('editSongFileInfo').textContent = '✅ ' + file.name;
        } else {
            document.getElementById('addSongUrl').value = base64;
            document.getElementById('addSongFileInfo').textContent = '✅ ' + file.name;
            const titleInput = document.getElementById('addSongTitle');
            if (!titleInput.value) {
                titleInput.value = file.name.replace(/\.[^/.]+$/, '');
            }
        }
    };
    reader.readAsDataURL(file);
}
// ====== 音乐功能：播放控制 END ======




// ========== 【盲盒机】核心功能函数 - 完整版 START ==========

// 【用途】：从数据库加载盲盒机数据
function loadBlindBoxData() {
    loadFromDB('blindBox', function(data) {
        if (data) {
            blindBoxData = { 
                dailyDrawCount: 0,
                dailyDrawDate: null,
                characterDrawCount: {},
                characterDrawDate: {},
                obtainedItems: [],
                collectionCelebrated: false,
                seriesList: [{ id: 1, name: '春之猫猫' }],
                wearMap: {},
                ...data 
            };
            if (data.items && data.items.length > 0) {
                blindBoxItems['series1'] = data.items;
            }
            // 加载其他系列的吧唧
            if (data.seriesItems) {
                blindBoxItems = data.seriesItems;
            }
        }
        
        // 兼容旧数据：给没有 seriesId 的 obtainedItems 补上
        blindBoxData.obtainedItems = blindBoxData.obtainedItems.map(item => ({
            ...item,
            seriesId: item.seriesId || 1
        }));
        
        // 初始化 currentSelectedSeriesId
        if (!currentSelectedSeriesId && blindBoxData.seriesList.length > 0) {
            currentSelectedSeriesId = blindBoxData.seriesList[0].id;
        }

        // 兼容旧佩戴数据结构
        if (blindBoxData.wearMap) {
            Object.keys(blindBoxData.wearMap).forEach(chatId => {
                const wearValue = blindBoxData.wearMap[chatId];
                if (wearValue && typeof wearValue.seriesId !== 'undefined' && typeof wearValue.itemId !== 'undefined') {
                    blindBoxData.wearMap[chatId] = {
                        [wearValue.seriesId]: wearValue.itemId
                    };
                }
            });
        }

        checkAndResetDailyLimit();
        renderBlindBoxUI();
    });
}

// 【用途】：渲染所有系列列表
function renderBlindBoxSeriesList() {
    const listContainer = document.getElementById('blindBoxSeriesList');
    if (!listContainer) return;
    
    listContainer.innerHTML = blindBoxData.seriesList.map(series => {
        const seriesKey = 'series' + series.id;
        const items = blindBoxItems[seriesKey] || [];
        const obtainedIds = new Set(blindBoxData.obtainedItems
            .filter(o => o.seriesId === series.id)
            .map(o => o.itemId));
        
        const progress = obtainedIds.size;
        const total = items.length || 0;
        
        return `
            <div class="blindbox-series-item" data-series-id="${series.id}">
                <span class="blindbox-series-name">${series.name}</span>
                <span class="blindbox-series-progress">(${progress}/${total})</span>
                <button class="blindbox-series-btn" onclick="selectSeriesAndShow(${series.id})">查看</button>
                <button class="blindbox-series-btn-delete" onclick="deleteBlindBoxSeries(${series.id})">删除</button>
            </div>
        `;
    }).join('');
}

// 【用途】：删除系列
function deleteBlindBoxSeries(seriesId) {
    // 不能删除最后一个系列
    if (blindBoxData.seriesList.length <= 1) {
        alert('必须至少保留一个系列！');
        return;
    }
    
    const series = blindBoxData.seriesList.find(s => s.id === seriesId);
    if (!series) return;
    
    if (!confirm(`确定要删除系列 "${series.name}" 吗？该系列的所有数据都将被删除。`)) {
        return;
    }
    
    // 删除该系列
    blindBoxData.seriesList = blindBoxData.seriesList.filter(s => s.id !== seriesId);
    
    // 删除该系列对应的吧唧数据
    delete blindBoxItems['series' + seriesId];
    
    // 删除该系列相关的已获得记录
    blindBoxData.obtainedItems = blindBoxData.obtainedItems.filter(o => o.seriesId !== seriesId);
    
    // 重置当前选中的系列（如果删除的是当前选中的）
    if (currentSelectedSeriesId === seriesId) {
        currentSelectedSeriesId = blindBoxData.seriesList[0].id;
    }
    
    // 保存数据
    saveBlindBoxData();
    
    // 刷新系列列表
    renderBlindBoxSeriesList();
    
    // 关闭所有弹窗
    document.getElementById('blindBoxShowModal').style.display = 'none';
    document.getElementById('blindBoxSeriesEditorModal').style.display = 'none';
    document.getElementById('blindBoxItemEditModal').style.display = 'none';
    
    alert(`系列 "${series.name}" 已删除！`);
}


// 【用途】：选择系列后打开查看弹窗
function selectSeriesAndShow(seriesId) {
    currentSelectedSeriesId = seriesId;
    openBlindBoxShowModalForSeries(seriesId);
}


// 【用途】：打开添加新系列弹窗
function openAddSeriesModal() {
    document.getElementById('newSeriesName').value = '';
    document.getElementById('blindBoxAddSeriesModal').style.display = 'flex';
}

// 【用途】：确认添加新系列
function confirmAddSeries() {
    const name = document.getElementById('newSeriesName').value.trim();
    
    if (!name) {
        alert('请输入系列名字');
        return;
    }
    
    // 生成新系列 id
    const newId = Math.max(...blindBoxData.seriesList.map(s => s.id), 0) + 1;
    const newSeries = {
        id: newId,
        name: name
    };
    
    // 添加到系列列表
    blindBoxData.seriesList.push(newSeries);
    
    // 用初始默认数据初始化新系列（深拷贝）
    blindBoxItems['series' + newId] = DEFAULT_BLINDBOX_ITEMS.map(item => ({
        ...item
    }));
    
    // 保存数据
    saveBlindBoxData();
    
    // 关闭弹窗，刷新系列列表
    document.getElementById('blindBoxAddSeriesModal').style.display = 'none';
    renderBlindBoxSeriesList();
    
    alert(`系列 "${name}" 已添加！`);
}


// 【用途】：检查并重置每日限制
function checkAndResetDailyLimit() {
    const today = new Date().toDateString();
    
    // 重置自抽次数
    if (blindBoxData.dailyDrawDate !== today) {
        blindBoxData.dailyDrawCount = 0;
        blindBoxData.dailyDrawDate = today;
    }
    
    // 重置每个角色的代抽次数
    Object.keys(blindBoxData.characterDrawDate).forEach(charName => {
        if (blindBoxData.characterDrawDate[charName] !== today) {
            blindBoxData.characterDrawCount[charName] = 0;
            blindBoxData.characterDrawDate[charName] = today;
        }
    });
}

function saveBlindBoxData() {
    const saveData = {
        ...blindBoxData,
        seriesItems: { ...blindBoxItems }
    };
    saveToDB('blindBox', saveData);
}


// 【用途】：打开指定系列的查看弹窗
function openBlindBoxShowModalForSeries(seriesId) {
    const modal = document.getElementById('blindBoxShowModal');
    if (!modal) return;
    
    const grid = document.getElementById('blindBoxShowGrid');
    if (!grid) return;
    
    const series = blindBoxData.seriesList.find(s => s.id === seriesId);
    if (!series) {
        alert('系列不存在！');
        return;
    }
    
    const seriesKey = 'series' + seriesId;
    const items = blindBoxItems[seriesKey];
    
    // 检查该系列是否已初始化
    if (!items || items.length === 0) {
        grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:20px; color:#999;">该系列还没有吧唧</div>';
    } else {
        const obtainedIds = new Set(blindBoxData.obtainedItems
            .filter(o => o.seriesId === seriesId)
            .map(o => o.itemId));
        
        grid.innerHTML = items.map(item => {
            const obtained = obtainedIds.has(item.id);
          let worn = false;
let wornChatId = null;

if (blindBoxData.wearMap) {
    Object.keys(blindBoxData.wearMap).forEach(chatId => {
        if (blindBoxData.wearMap[chatId] && blindBoxData.wearMap[chatId][seriesId] === item.id) {
            worn = true;
            wornChatId = chatId;
        }
    });
}
            
            // 图片或emoji显示
            const imgHtml = item.image 
                ? `<img src="${item.image}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`
                : `<span style="font-size:22px;">${item.emoji}</span>`;
            
  return `
    <div class="blindbox-show-item-card" style="${obtained ? '' : 'opacity:0.4;'}">
        ${item.hidden ? '<span class="blind-box-hidden-label">隐藏</span>' : ''}
        <div class="blindbox-show-item-emoji">${obtained ? imgHtml : '?'}</div>
        <div class="blindbox-show-item-name">${obtained ? item.name : (item.hidden ? '隐藏款' : '未获得')}</div>
<button 
    class="blindbox-series-btn" 
    style="margin-top:6px; ${obtained ? '' : 'opacity:0.5; cursor:not-allowed;'}"
    ${obtained
        ? (worn
            ? `onclick="removeBlindBoxWearBySeries(${wornChatId}, ${seriesId})"`
            : `onclick="openBlindBoxWearCharacterModal(${seriesId}, ${item.id})"`)
        : 'disabled'}
>
    ${worn ? '卸下' : '佩戴'}
</button>
    </div>
`;
        }).join('');
    }
    
    // 更新弹窗标题
    const modalTitle = document.getElementById('blindBoxShowModalTitle');
    if (modalTitle) modalTitle.textContent = series.name || '未知系列';
    
    modal.style.display = 'flex';
}


// 【用途】：渲染盲盒机主页面UI
function renderBlindBoxUI() {
    const screen = document.getElementById('blindBoxMachineScreen');
    if (!screen) return;
    
    // 更新抽取次数显示
    const remainCount = 3 - blindBoxData.dailyDrawCount;
    const remainCountEl = document.getElementById('blindBoxRemainCount');
    const totalCountEl = document.getElementById('blindBoxTotalCount');
    if (remainCountEl) remainCountEl.textContent = remainCount;
    if (totalCountEl) totalCountEl.textContent = '3';
    
    // 更新系列列表和进度
    renderBlindBoxSeriesList();
    updateSeriesTotal();
    updateSeriesProgress();
    
    // 检查是否集齐
    checkCollection();
}

// 【用途】：更新系列进度显示
function updateSeriesProgress() {
    const progress = document.getElementById('blindBoxSeriesProgress');
    if (!progress) return;
    
    // 只计算当前选中系列的已获得数量
    const uniqueIds = new Set(blindBoxData.obtainedItems
        .filter(o => o.seriesId === currentSelectedSeriesId)
        .map(o => o.itemId));
    progress.textContent = uniqueIds.size;
}

// 【用途】：检查是否集齐全部吧唧
function checkCollection() {
    const seriesKey = 'series' + currentSelectedSeriesId;
    const items = blindBoxItems[seriesKey] || [];
    const uniqueIds = new Set(blindBoxData.obtainedItems
        .filter(o => o.seriesId === currentSelectedSeriesId)
        .map(o => o.itemId));
    
    if (uniqueIds.size >= items.length && items.length > 0 && !blindBoxData.collectionCelebrated) {
        const series = blindBoxData.seriesList.find(s => s.id === currentSelectedSeriesId);
        const seriesName = series ? series.name : '该系列';
        
        const banner = document.getElementById('blindBoxCollectionBanner');
        if (banner) {
            banner.style.display = 'block';
            banner.textContent = `🎉 恭喜集齐【${seriesName}】系列！`;
            blindBoxData.collectionCelebrated = true;
            saveBlindBoxData();
            setTimeout(() => {
                banner.style.display = 'none';
            }, 3000);
        }
    }
}

// 【用途】：点击【抽取一次】按钮 - 先选择系列
function openBlindBoxDrawModal() {
    const remainCount = 3 - blindBoxData.dailyDrawCount;
    
    if (remainCount <= 0) {
        alert('今天的抽取次数已用完，请明天再来！');
        return;
    }
    
    // 显示系列选择弹窗
    showSelectSeriesForDraw(remainCount);
}


// 【用途】：显示系列选择弹窗（自抽）
function showSelectSeriesForDraw(remainCount) {
    const listContainer = document.getElementById('blindBoxSelectSeriesList');
    if (!listContainer) return;
    
    listContainer.innerHTML = blindBoxData.seriesList.map(series => {
        return `
            <button onclick="confirmSelectSeriesAndDraw(${series.id}, ${remainCount})" 
                    style="padding:12px; background:linear-gradient(135deg,#FFB6D9,#FF9EC5); color:white; border:none; border-radius:10px; cursor:pointer; font-size:14px; font-weight:600;">
                ${series.name}
            </button>
        `;
    }).join('');
    
    document.getElementById('blindBoxSelectSeriesModal').style.display = 'flex';
}

// 【用途】：选择系列后确认抽取
function confirmSelectSeriesAndDraw(seriesId, remainCount) {
    currentSelectedSeriesId = seriesId;
    
    // 关闭系列选择弹窗
    document.getElementById('blindBoxSelectSeriesModal').style.display = 'none';
    
    // 显示确认抽取弹窗
    const modal = document.getElementById('blindBoxDrawModal');
    if (modal) {
        modal.style.display = 'flex';
        document.getElementById('blindBoxDrawRemainText').textContent = `剩余次数：${remainCount}/3`;
    }
}

// 【用途】：确认抽取 - 一次一个
function confirmBlindBoxDraw() {
    if (blindBoxData.dailyDrawCount >= 3) {
        alert('今天的抽取次数已用完！');
        return;
    }
    
    // 关闭确认弹窗
    const modal = document.getElementById('blindBoxDrawModal');
    if (modal) modal.style.display = 'none';
    
    // 执行拆盒动画
    performDrawAnimation(() => {
        // 动画结束后，生成1个吧唧
        const newItem = generateBlindBoxItemForSeries(currentSelectedSeriesId);
        blindBoxData.obtainedItems.push(newItem);
        
        blindBoxData.dailyDrawCount++;
        saveBlindBoxData();
        renderBlindBoxUI();
        
        // 显示获得的吧唧结果弹窗
        showDrawResultModal([newItem]);
    });
}

// 【用途】：显示抽取结果弹窗（9个吧唧）
function showDrawResultModal(newItems) {
    const modal = document.getElementById('blindBoxDrawResultModal');
    if (!modal) return;
    
    modal.style.display = 'flex';
    
    const grid = document.getElementById('blindBoxDrawResultGrid');
    if (!grid) return;
    
    grid.innerHTML = newItems.map(item => {
        const seriesKey = 'series' + item.seriesId;
        const itemInfo = (blindBoxItems[seriesKey] || []).find(i => i.id === item.itemId);
        const label = item.isHidden ? '<span class="blind-box-hidden-label">隐藏</span>' : '';

        const imgHtml = itemInfo && itemInfo.image
            ? `<img src="${itemInfo.image}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`
            : `<span style="font-size:22px;">${itemInfo ? itemInfo.emoji : '?'}</span>`;
        
        return `
            <div class="blindbox-show-item-card">
                ${label}
                <div class="blindbox-show-item-emoji">${imgHtml}</div>
                <div class="blindbox-show-item-name">${itemInfo ? itemInfo.name : '未知'}</div>
            </div>
        `;
    }).join('');
}

// 【用途】：为指定系列生成一个新的吧唧（含隐藏款概率）
function generateBlindBoxItemForSeries(seriesId) {
    const seriesKey = 'series' + seriesId;
    const items = blindBoxItems[seriesKey] || [];
    
    if (items.length === 0) {
        alert('该系列没有吧唧！');
        return null;
    }
    
    const rand = Math.random();
    let selectedItem;
    
    if (rand < 0.05) {
        // 5% 概率抽到隐藏款
        const hiddenItems = items.filter(i => i.hidden);
        if (hiddenItems.length > 0) {
            selectedItem = hiddenItems[Math.floor(Math.random() * hiddenItems.length)];
        } else {
            selectedItem = items[Math.floor(Math.random() * items.length)];
        }
    } else if (rand < 0.75) {
        // 70% 概率抽到重复（从已获得的里面随机选）
        const obtainedIds = [...new Set(blindBoxData.obtainedItems
            .filter(o => o.seriesId === seriesId)
            .map(o => o.itemId))];
        
        if (obtainedIds.length > 0) {
            const repeatId = obtainedIds[Math.floor(Math.random() * obtainedIds.length)];
            selectedItem = items.find(i => i.id === repeatId);
        } else {
            // 还没有已获得的，就从普通款里随机
            const normalItems = items.filter(i => !i.hidden);
            selectedItem = normalItems.length > 0 
                ? normalItems[Math.floor(Math.random() * normalItems.length)]
                : items[Math.floor(Math.random() * items.length)];
        }
    } else {
        // 剩余概率抽普通款
        const normalItems = items.filter(i => !i.hidden);
        selectedItem = normalItems.length > 0
            ? normalItems[Math.floor(Math.random() * normalItems.length)]
            : items[Math.floor(Math.random() * items.length)];
    }
    
    return {
        seriesId: seriesId,
        itemId: selectedItem.id,
        isHidden: selectedItem.hidden,
        obtainDate: new Date().toLocaleString('zh-CN')
    };
}

// 【用途】：执行拆盒动画
function performDrawAnimation(callback) {
    const animContainer = document.getElementById('blindBoxAnimContainer');
    if (!animContainer) {
        if (callback) callback();
        return;
    }
    
    animContainer.innerHTML = `
        <div style="animation: rotateSpin 0.8s linear infinite;">
            <svg viewBox="0 0 120 120" width="120" height="120">
                <defs>
                    <linearGradient id="animBoxGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#FF6B9D;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#C44569;stop-opacity:1" />
                    </linearGradient>
                </defs>
                <rect x="20" y="35" width="80" height="65" rx="6" fill="url(#animBoxGrad)" stroke="#fff" stroke-width="2"/>
                <path d="M 20 35 L 30 15 L 90 15 L 100 35 Z" fill="#FF8FAB" stroke="#fff" stroke-width="2"/>
                <circle cx="45" cy="20" r="6" fill="#FFD700"/>
                <circle cx="75" cy="20" r="6" fill="#FFD700"/>
                <circle cx="60" cy="20" r="8" fill="#FFE135"/>
                <line x1="30" y1="50" x2="90" y2="50" stroke="#fff" stroke-width="1.5" opacity="0.6"/>
                <ellipse cx="40" cy="45" rx="15" ry="20" fill="#fff" opacity="0.2"/>
            </svg>
        </div>
    `;
    
    animContainer.style.display = 'flex';
    
    setTimeout(() => {
        animContainer.style.display = 'none';
        animContainer.innerHTML = '';
        // 动画结束后直接执行回调，不做任何页面操作
        if (typeof callback === 'function') callback();
    }, 1500);
}




// 【用途】：点击【让他代抽】按钮
function openBlindBoxCharacterModal() {
    // 先让用户选择系列
    showSelectSeriesForCharacterDraw();
}

// 【用途】：显示系列选择弹窗（代抽）
function showSelectSeriesForCharacterDraw() {
    const listContainer = document.getElementById('blindBoxSelectSeriesList');
    if (!listContainer) return;
    
    listContainer.innerHTML = blindBoxData.seriesList.map(series => {
        return `
            <button onclick="confirmSelectSeriesAndShowCharacters(${series.id})" 
                    style="padding:12px; background:linear-gradient(135deg,#FFB6D9,#FF9EC5); color:white; border:none; border-radius:10px; cursor:pointer; font-size:14px; font-weight:600;">
                ${series.name}
            </button>
        `;
    }).join('');
    
    document.getElementById('blindBoxSelectSeriesModal').style.display = 'flex';
}

// 【用途】：选择系列后显示角色列表
function confirmSelectSeriesAndShowCharacters(seriesId) {
    currentSelectedSeriesId = seriesId;
    document.getElementById('blindBoxSelectSeriesModal').style.display = 'none';

    if (!chats || chats.length === 0) {
        alert('请先在聊天中添加角色');
        return;
    }

    const singleChats = chats.filter(c => c && c.name);

    if (singleChats.length === 0) {
        alert('请先在聊天中添加角色');
        return;
    }

    const listContainer = document.getElementById('blindBoxCharacterList');
    if (listContainer) {
        const today = new Date().toDateString();

        listContainer.innerHTML = singleChats.map(chat => {
            const avatarUrl = chat.avatarImage || chat.avatar;
            const avatarHtml = (avatarUrl && avatarUrl !== '👤' && (avatarUrl.startsWith('http') || avatarUrl.startsWith('data:image')))
                ? `<img src="${avatarUrl}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`
                : (chat.avatar || '👤');

            const alreadyDrawn = blindBoxData.characterDrawDate[chat.name] === today &&
                                 blindBoxData.characterDrawCount[chat.name] >= 1;

            return `
                <div class="member-item"
                     data-char-name="${encodeURIComponent(chat.name)}"
                     data-chat-id="${chat.id}"
                     style="${alreadyDrawn ? 'opacity:0.4; pointer-events:none;' : 'cursor:pointer;'}">
                    <div class="member-avatar">${avatarHtml}</div>
                    <div class="member-name">${chat.name}</div>
                    ${alreadyDrawn ? '<div style="font-size:11px; color:#999; margin-left:auto;">今日已抽</div>' : ''}
                </div>
            `;
        }).join('');

        listContainer.querySelectorAll('.member-item').forEach(item => {
            if (item.style.pointerEvents === 'none') return;

            item.addEventListener('click', function() {
                const charName = decodeURIComponent(this.dataset.charName);
                const chatId = parseInt(this.dataset.chatId, 10);
                selectBlindBoxCharacter(charName, chatId);
            });
        });
    }

    document.getElementById('blindBoxCharacterModal').style.display = 'flex';
}

// 【用途】：选择角色进行代抽
function selectBlindBoxCharacter(charName, chatId) {
    // 检查今日是否已代抽过
    const today = new Date().toDateString();
    if (blindBoxData.characterDrawDate[charName] === today && 
        blindBoxData.characterDrawCount[charName] >= 1) {
        alert(`${charName}今天已代抽过了，请明天再让他/她代抽！`);
        return;
    }
    
    // 关闭选择弹窗
    const modal = document.getElementById('blindBoxCharacterModal');
    if (modal) modal.style.display = 'none';
    
    // 显示代抽进行中的弹窗
    showCharacterDrawingModal(charName, chatId);
}



// 【用途】：显示角色代抽中的动画和对话
function showCharacterDrawingModal(charName, chatId) {
    const modal = document.getElementById('blindBoxCharacterDrawingModal');
    if (!modal) return;
    
    modal.style.display = 'flex';
    const charAvatar = document.getElementById('blindBoxCharacterDrawingAvatar');
    const charDialog = document.getElementById('blindBoxCharacterDrawingDialog');
    
    const chat = chats.find(c => c.id === chatId);
    if (charAvatar) {
        if (chat.avatarImage && (chat.avatarImage.startsWith('http') || chat.avatarImage.startsWith('data:'))) {
            charAvatar.innerHTML = `<img src="${chat.avatarImage}" alt="" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
        } else {
            charAvatar.textContent = chat.avatar || '👤';
        }
    }
    if (charDialog) charDialog.textContent = '正在为你抽取中…';
    
    // 2秒后完成代抽
    setTimeout(() => {
        completeCharacterDraw(charName, chatId);
    }, 2000);
}

// 【用途】：判断这次抽到的是否为重复款
function isBlindBoxDuplicate(seriesId, itemId) {
    return blindBoxData.obtainedItems.some(item => item.seriesId === seriesId && item.itemId === itemId);
}

// 【用途】：生成代抽结果的一句话文案
async function generateBlindBoxCharacterLine(charName, chatId, seriesId, newItem, isDuplicate) {
    if (!currentApiConfig.baseUrl || !currentApiConfig.apiKey) {
        throw new Error('请先在API设置中配置');
    }

    const chat = chats.find(c => c.id === chatId);
    if (!chat) {
        throw new Error('角色不存在');
    }

    const characterInfo = await new Promise(resolve => {
        loadFromDB('characterInfo', data => {
            resolve(data && data[chatId] ? data[chatId] : {});
        });
    });

    const series = blindBoxData.seriesList.find(s => s.id === seriesId);
    const seriesKey = 'series' + seriesId;
    const itemInfo = (blindBoxItems[seriesKey] || []).find(i => i.id === newItem.itemId);

    const totalCount = (blindBoxItems[seriesKey] || []).length;
    const uniqueObtainedIds = new Set(
        blindBoxData.obtainedItems
            .filter(o => o.seriesId === seriesId)
            .map(o => o.itemId)
    );

    const requestUrl = currentApiConfig.baseUrl.endsWith('/')
        ? currentApiConfig.baseUrl + 'chat/completions'
        : currentApiConfig.baseUrl + '/chat/completions';

    const modelToUse = currentApiConfig.defaultModel || 'gpt-3.5-turbo';

    const personaText = [
        characterInfo.personality ? `性格：${characterInfo.personality}` : '',
        characterInfo.myPersonality ? `你眼中的用户：${characterInfo.myPersonality}` : '',
        chat.name ? `角色名：${chat.name}` : ''
    ].filter(Boolean).join('\n');

    const prompt = `
你现在要扮演角色「${charName}」。
请严格按照角色人设和说话习惯，只回复一句简短自然的话。

【角色信息】
${personaText || '按已有角色人设自然发挥'}

【当前情境】
你正在帮用户抽盲盒。
盲盒系列：${series ? series.name : '未知系列'}
这个系列总共有 ${totalCount} 个吧唧。
用户目前已经收集了 ${uniqueObtainedIds.size} 个不同吧唧。
你这次抽到的是：${itemInfo ? itemInfo.name : '未知吧唧'}${itemInfo && itemInfo.emoji ? `（${itemInfo.emoji}）` : ''}
${newItem.isHidden ? '这是隐藏款。' : '这不是隐藏款。'}
${isDuplicate ? '这次抽到的是重复款。' : '这次抽到的是新吧唧，不是重复款。'}

【回复要求】
1. 只能回复一句话
2. 必须像这个角色本人会说的话
3. 必须体现“是在帮用户抽盲盒”
4. 可以提到抽到的吧唧名字
5. 如果是重复款，要自然提到“重复了”
6. 不要分点
7. 不要加引号
8. 不要加角色名冒号
9. 不要输出多句
10. 不要输出任何额外解释
`.trim();

    const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${currentApiConfig.apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: modelToUse,
            messages: [
                {
                    role: 'system',
                    content: '你要进行角色扮演，只输出一句简短自然的中文口语，不要解释，不要分段，不要使用列表。'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.9,
            stream: false
        })
    });

    const rawText = await response.text();
    let data;
    try {
        data = JSON.parse(rawText);
    } catch (e) {
        throw new Error('API返回非JSON');
    }

    if (!response.ok) {
        const msg = (data && data.error && data.error.message) ? data.error.message : rawText;
        throw new Error(msg);
    }

    if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
        throw new Error('模型返回空回复');
    }

    const content = data.choices[0] && data.choices[0].message
        ? String(data.choices[0].message.content || '').trim()
        : '';

    if (!content) {
        throw new Error('模型返回空内容');
    }

    return content
        .replace(/\[心声更新\][\s\S]*?\[\/心声更新\]/g, '')
        .replace(/\|\|\|/g, ' ')
        .replace(/\n/g, ' ')
        .trim();
}

// 【用途】：完成角色代抽
function completeCharacterDraw(charName, chatId) {
    const today = new Date().toDateString();

    if (!blindBoxData.characterDrawCount[charName]) {
        blindBoxData.characterDrawCount[charName] = 0;
    }
    if (!blindBoxData.characterDrawDate[charName]) {
        blindBoxData.characterDrawDate[charName] = null;
    }

    const newItem = generateBlindBoxItemForSeries(currentSelectedSeriesId);
    if (!newItem) return;

    const duplicate = isBlindBoxDuplicate(currentSelectedSeriesId, newItem.itemId);

    blindBoxData.obtainedItems.push(newItem);
    blindBoxData.characterDrawCount[charName] = 1;
    blindBoxData.characterDrawDate[charName] = today;

    saveBlindBoxData();

    const charDialog = document.getElementById('blindBoxCharacterDrawingDialog');
    const seriesKey = 'series' + currentSelectedSeriesId;
    const itemInfo = blindBoxItems[seriesKey].find(i => i.id === newItem.itemId);

    if (charDialog) {
        charDialog.textContent = `${charName}正在看着抽到的吧唧……`;
    }

    generateBlindBoxCharacterLine(charName, chatId, currentSelectedSeriesId, newItem, duplicate)
        .then(reply => {
            if (charDialog) {
                charDialog.textContent = reply;
            }
            renderBlindBoxUI();
        })
        .catch(error => {
            console.error('generateBlindBoxCharacterLine error:', error);

            if (charDialog) {
                if (duplicate) {
                    charDialog.textContent = `${charName}说：我帮你抽到了${itemInfo ? itemInfo.name : '吧唧'}，不过这次重复了。`;
                } else {
                    charDialog.textContent = `${charName}说：我帮你抽到了${itemInfo ? itemInfo.name : '吧唧'}。`;
                }
            }
            renderBlindBoxUI();
        });
}

function closeBlindBoxCharacterDrawingModal() {
    const modal = document.getElementById('blindBoxCharacterDrawingModal');
    if (modal) modal.style.display = 'none';
}

// 【用途】：打开查看已获得吧唧的弹窗（默认打开第一个系列）
function openBlindBoxShowModal() {
    if (blindBoxData.seriesList && blindBoxData.seriesList.length > 0) {
        const targetSeriesId = currentSelectedSeriesId || blindBoxData.seriesList[0].id;
        openBlindBoxShowModalForSeries(targetSeriesId);
    }
}

// 【用途】：返回主屏幕
function backToMainFromBlindBox() {
    saveBlindBoxData();
    document.getElementById('blindBoxMachineScreen').style.display = 'none';
    document.getElementById('mainScreen').style.display = 'flex';
}

// 打开系列编辑器
function openBlindBoxSeriesEditor() {
    // 不关闭查看弹窗，直接在上面叠加系列管理弹窗
    const series = blindBoxData.seriesList.find(s => s.id === currentSelectedSeriesId);
    const seriesName = series ? series.name : '未知系列';
    
    document.getElementById('editSeriesName').value = seriesName;
    renderEditorGrid();
    document.getElementById('blindBoxSeriesEditorModal').style.display = 'flex';
}

// 渲染编辑网格
function renderEditorGrid() {
    const grid = document.getElementById('blindBoxEditorGrid');
    if (!grid) return;
    
    const seriesKey = 'series' + currentSelectedSeriesId;
    const items = blindBoxItems[seriesKey] || [];
    grid.innerHTML = items.map(item => {
        const imgHtml = item.image 
            ? `<img src="${item.image}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`
            : `<span style="font-size:22px;">${item.emoji}</span>`;
        
        return `
            <div class="blindbox-show-item-card" onclick="openItemEditor(${item.id})" style="cursor:pointer;">
                ${item.hidden ? '<span class="blind-box-hidden-label">隐藏</span>' : ''}
                <div class="blindbox-show-item-emoji">${imgHtml}</div>
                <div class="blindbox-show-item-name">${item.name}</div>
            </div>
        `;
    }).join('');
}

// 打开单个吧唧编辑器
function openItemEditor(itemId) {
    const seriesKey = 'series' + currentSelectedSeriesId;
    const item = blindBoxItems[seriesKey].find(i => i.id === itemId);
    if (!item) return;
    
    document.getElementById('editingItemId').value = itemId;
    document.getElementById('editingSeriesId').value = currentSelectedSeriesId;
    document.getElementById('editItemName').value = item.name;
    document.getElementById('editItemHidden').checked = item.hidden;
    
    // 显示预览
    const previewContent = document.getElementById('editItemPreviewContent');
    const preview = document.getElementById('editItemPreview');
    if (item.image) {
        preview.innerHTML = `<img src="${item.image}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">
        <div style="position:absolute; bottom:0; left:0; right:0; background:rgba(0,0,0,0.3); color:white; font-size:10px; padding:3px; text-align:center;" onclick="document.getElementById('editItemImageInput').click()">点击换图</div>`;
    } else {
        preview.innerHTML = `<span id="editItemPreviewContent" style="font-size:36px;">${item.emoji}</span>
        <div style="position:absolute; bottom:0; left:0; right:0; background:rgba(0,0,0,0.3); color:white; font-size:10px; padding:3px; text-align:center;" onclick="document.getElementById('editItemImageInput').click()">点击换图</div>`;
    }
    
    document.getElementById('blindBoxItemEditModal').style.display = 'flex';
}

function deleteCurrentItem() {
    if (!confirm('确定要删除这个吧唧吗？')) return;
    
    const itemId = parseInt(document.getElementById('editingItemId').value);
    const seriesId = parseInt(document.getElementById('editingSeriesId').value);
    const seriesKey = 'series' + seriesId;
    blindBoxItems[seriesKey] = blindBoxItems[seriesKey].filter(item => item.id !== itemId);
    
    saveBlindBoxItemsToDB();
    document.getElementById('blindBoxItemEditModal').style.display = 'none';
    renderEditorGrid();
    updateSeriesTotal();
    openBlindBoxShowModalForSeries(seriesId);  // ← 改成刷新对应系列的查看窗口
}

// 处理图片上传并压缩
function handleItemImageUpload(input) {
    if (!input.files || !input.files[0]) return;
    
    const file = input.files[0];
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            // 压缩图片
            const canvas = document.createElement('canvas');
            const maxSize = 200;
            let width = img.width;
            let height = img.height;
            
            if (width > height) {
                if (width > maxSize) {
                    height = height * maxSize / width;
                    width = maxSize;
                }
            } else {
                if (height > maxSize) {
                    width = width * maxSize / height;
                    height = maxSize;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            const compressed = canvas.toDataURL('image/jpeg', 0.7);
            
            // 显示预览
            const preview = document.getElementById('editItemPreview');
            preview.innerHTML = `<img src="${compressed}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">
            <div style="position:absolute; bottom:0; left:0; right:0; background:rgba(0,0,0,0.3); color:white; font-size:10px; padding:3px; text-align:center;" onclick="document.getElementById('editItemImageInput').click()">点击换图</div>`;
            
            // 临时存储压缩后的图片
            preview.dataset.compressedImage = compressed;
        };
        img.src = e.target.result;
    };
    
    reader.readAsDataURL(file);
}

// 保存吧唧编辑
function saveItemEdit() {
    const itemId = parseInt(document.getElementById('editingItemId').value);
    const seriesId = parseInt(document.getElementById('editingSeriesId').value);
    const name = document.getElementById('editItemName').value.trim();
    const hidden = document.getElementById('editItemHidden').checked;
    const preview = document.getElementById('editItemPreview');
    const image = preview.dataset.compressedImage || null;
    
    if (!name) {
        alert('请输入吧唧名字');
        return;
    }
    
    const seriesKey = 'series' + seriesId;
    const item = blindBoxItems[seriesKey].find(i => i.id === itemId);
    if (item) {
        item.name = name;
        item.hidden = hidden;
        if (image) item.image = image;
    }
    
    // 保存到数据库
    saveBlindBoxItemsToDB();
    
    // 关闭编辑弹窗，刷新编辑网格
    document.getElementById('blindBoxItemEditModal').style.display = 'none';
    renderEditorGrid();
    
    // 同时刷新查看弹窗
    openBlindBoxShowModalForSeries(seriesId);
}

// 保存系列名字
function saveSeriesName() {
    const name = document.getElementById('editSeriesName').value.trim();
    if (!name) {
        alert('请输入系列名字');
        return;
    }
    
    const series = blindBoxData.seriesList.find(s => s.id === currentSelectedSeriesId);
    if (series) {
        series.name = name;
    }
    
    // 更新页面显示
    const modalTitle = document.getElementById('blindBoxShowModalTitle');
    if (modalTitle) modalTitle.textContent = name;
    
    saveBlindBoxData();
    renderBlindBoxSeriesList();
    alert('系列名字已保存！');
}

// 添加新吧唧
function addNewBlindBoxItem() {
    const seriesKey = 'series' + currentSelectedSeriesId;
    const items = blindBoxItems[seriesKey];
    const newId = Math.max(...items.map(i => i.id), 0) + 1;
    items.push({
        id: newId,
        name: '新吧唧' + newId,
        emoji: '⭐',
        hidden: false
    });
    
    saveBlindBoxItemsToDB();
    renderEditorGrid();
    
    // 更新系列进度分母
    updateSeriesTotal();
}

// 更新系列进度分母
function updateSeriesTotal() {
    const seriesKey = 'series' + currentSelectedSeriesId;
    const total = (blindBoxItems[seriesKey] || []).length;

    const totalCountEl = document.getElementById('blindBoxSeriesTotal');
    if (!totalCountEl) return;

    totalCountEl.textContent = total;
}
function saveBlindBoxItemsToDB() {
    const saveData = {
        ...blindBoxData,
        seriesItems: { ...blindBoxItems }
    };
    saveToDB('blindBox', saveData);
}


// ========== 【盲盒机】核心功能函数 - 完整版 END ==========


// ========== 【线下模式开始-约会】开始 ==========

// ========== 【线下模式-约会】开关逻辑 ==========

// 🚪 最终修复版：点击约会后的第一道安检
async function enterOfflineMode() {
    if (typeof currentChatId === 'undefined') return;

    // 🔍 1. 先去 DB 查有没有没聊完的档
    loadFromDB('offlineDateState', (allStates) => {
        const myState = allStates && allStates[currentChatId] ? allStates[currentChatId] : null;

        if (myState && myState.status === 'ongoing') {
            // 💖 情况 A：有档！直接进现场，不废话
        
            openOfflineMode(); // 这个函数里我们已经写了恢复 HTML 的逻辑
        } else {
            // 💌 情况 B：没档。这才是第一次见面，弹出邀请函
          
            
            showInvitationModal(); // 
        }
    });
}

// ⏳ 显示"正在总结"的提示（和 showOfflineLoader 一样的方式）
function showDateSummarizing() {
    if (document.getElementById('dateSummarizingOverlay')) {
        return;
    }
    
    const overlay = document.createElement('div');
    overlay.id = 'dateSummarizingOverlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(5px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 99999;
    `;
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        background: #fff;
        border-radius: 20px;
        padding: 50px 40px;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        min-width: 280px;
    `;
    
    // 加载动画
    const spinner = document.createElement('div');
    spinner.style.cssText = `
        width: 50px;
        height: 50px;
        margin: 0 auto 24px;
        border: 4px solid #f0f0f0;
        border-top: 4px solid #333;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
    `;
    
    // 标题
    const title = document.createElement('div');
    title.style.cssText = "font-size: 18px; font-weight: 600; color: #333; margin-bottom: 12px;";
    title.innerText = "TA 正在用心回顾...";
    
    // 副标题
    const subtitle = document.createElement('div');
    subtitle.style.cssText = "font-size: 14px; color: #999; line-height: 1.6;";
    subtitle.innerText = "正在将今天的美好时刻\n写进记忆里";
    
    modal.appendChild(spinner);
    modal.appendChild(title);
    modal.appendChild(subtitle);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
 
}

// 🧹 隐藏"正在总结"的提示
function hideDateSummarizing() {
    const overlay = document.getElementById('dateSummarizingOverlay');
    if (overlay) {
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.3s ease-out';
        setTimeout(() => {
            if (overlay && overlay.parentNode) {
                overlay.remove();
            }
        
        }, 300);
    }
}

// 🧹 结束约会并彻底清理现场
// 🧹 结束约会并彻底清理现场
async function endOfflineDate() {
    // ★★★ 直接问要不要生成总结 ★★★
    const shouldGenerateSummary = confirm("要生成约会总结保存记忆吗？\n\n【确定】生成总结\n【取消】直接结束");
    
    if (shouldGenerateSummary) {
        // 用户选择生成总结
        showDateSummarizing();
        
        const summary = await generateDateSummary();
        
        hideDateSummarizing();
        
        if (summary) {
            await saveDateSummaryToMemory(summary);
          
        } else {
          
        }
    } else {
        // 用户选择不生成，直接结束
     
    }
    
    // 2. 🌟 核心修复：物理清空屏幕上的聊天记录！
    const chatArea = document.getElementById('offlineChatArea');
    if (chatArea) {
        chatArea.innerHTML = '';
    }
    
    // 👇 🌟 新增核心：把 TA 的背包存档彻彻底底销毁！ 👇
    if (typeof currentChatId !== 'undefined') {
        localStorage.removeItem('offline_ta_bag_' + currentChatId);
    }

    // 3. 🧹 清除 DB 里的未完成约会存档
    if (typeof currentChatId !== 'undefined') {
        loadFromDB('offlineDateState', (allStates) => {
            let states = allStates || {};
            if (states[currentChatId]) {
                delete states[currentChatId];
                saveToDB('offlineDateState', states);
            }
        });
    }

    // 4. 关闭线下界面弹窗
    const offlineModal = document.getElementById('offlineModeModal');
    if (offlineModal) offlineModal.style.display = 'none';
}

// 呼出/关闭线下模式设置抽屉
function toggleOfflineSettings() {
    const drawer = document.getElementById('offlineSettingsDrawer');
    const overlay = document.getElementById('offlineSettingsOverlay');
    
    if (drawer.classList.contains('open')) {
        drawer.classList.remove('open');
        overlay.style.display = 'none';
    } else {
        drawer.classList.add('open');
        overlay.style.display = 'block';
    }
}

// ==========================================
// 🧠 线下约会模式：构建完整的上下文记忆 (长期记忆 + 线上近期纯文本聊天)
// ==========================================
async function buildOfflineContext() {
    // 1. 获取你的长期记忆 (直接白嫖你原本写好的完美函数)
    let longTermMemory = "";
    try {
        if (typeof getMemoryContext === 'function') {
            longTermMemory = await getMemoryContext();
        }
    } catch (e) {
        console.warn("线下模式获取长期记忆失败：", e);
    }

    // 2. 获取用户在设置抽屉里拉条的真实数字 (0 - 500)
    const memoryLengthInput = document.getElementById('memoryLengthVal');
    const memoryLength = memoryLengthInput ? parseInt(memoryLengthInput.value, 10) : 50;

    let onlineChatContext = "";

    // 如果设置了 0，说明这次约会不想带入前情提要
    if (memoryLength === 0) {
        onlineChatContext = "【系统提示：本次约会为独立事件，未带入之前的线上聊天记忆。】";
    } else {
        // 3. 精准抓取真实的线上纯文本聊天记录
        if (typeof allMessages !== 'undefined' && Array.isArray(allMessages)) {
            
            // 核心过滤逻辑：只要当前角色、没撤回的、且纯纯的文字消息
            const pureTextMessages = allMessages.filter(msg => 
                msg && 
                msg.chatId === currentChatId && 
                !msg.isRevoked && 
                msg.type === 'text' // 👈 这里是关键！只取文字，过滤掉图片、转账、红包、系统提示
            );

            if (pureTextMessages.length === 0) {
                onlineChatContext = "【系统提示：你们还没有在线上聊过天。】";
            } else {
                // 截取用户设定的条数
                const recentMessages = pureTextMessages.slice(-memoryLength);

                onlineChatContext = "【以下是我们在来约会前，最近的线上聊天记录，请作为本次线下约会的背景记忆】：\n";
                recentMessages.forEach(msg => {
                    // 判断是谁发的消息
                    const sender = msg.senderId === 'me' ? "我" : "TA";
                    onlineChatContext += `${sender}：${msg.content}\n`;
                });
            }
        } else {
            onlineChatContext = "【系统提示：未读取到线上聊天记录。】";
        }
    }

    // 4. 终极打包：长期记忆 + 线上近期聊天
    const finalContextStr = `
${longTermMemory ? longTermMemory : ''}

${onlineChatContext}
    `;

    return finalContextStr.trim();
}

let offlineWbCache = []; 

function initOfflineWorldbooks() {
    const listDisplay = document.getElementById('wbListDisplay');
    const tabContainer = document.getElementById('wbCategoryTab');
    if(!listDisplay || !tabContainer) return;

    // 从数据库读取
    loadFromDB('worldbooks', (data) => {
        offlineWbCache = Array.isArray(data) ? data : (data?.list || []);
    
        
        if (offlineWbCache.length === 0) {
            listDisplay.innerHTML = '<div style="color:#999;font-size:12px;">仓库里还没有书哦</div>';
            tabContainer.innerHTML = '';
            return;
        }

        // 提取分类
        const categories = ['全部', ...new Set(offlineWbCache.map(b => b.category || '未分类'))];

        // 渲染分类标签
        tabContainer.innerHTML = categories.map((cat, i) => `
            <div class="wb-tab-item" onclick="switchWbCategory('${cat}', this)" 
                 style="cursor:pointer; white-space:nowrap; font-size:13px; color:${i===0?'#333':'#999'}; font-weight:${i===0?'600':'400'}; padding: 0 4px;">
                ${cat}
            </div>
        `).join('');

        // 默认显示全部
        switchWbCategory('全部', tabContainer.firstElementChild);
    });
}

function switchWbCategory(targetCat, element) {
    // 切换视觉样式
    document.querySelectorAll('.wb-tab-item').forEach(el => {
        el.style.color = '#999';
        el.style.fontWeight = '400';
    });
    element.style.color = '#333';
    element.style.fontWeight = '600';

    // 过滤数据
    const filteredBooks = targetCat === '全部' 
        ? offlineWbCache 
        : offlineWbCache.filter(b => (b.category || '默认分类') === targetCat);

    // 渲染具体的书
    const displayArea = document.getElementById('wbListDisplay');
    displayArea.innerHTML = filteredBooks.map(book => {
        // 👇 核心修复：精准抓取 title 字段
        const bookTitle = book.title || '无标题设定'; 
        
        return `
            <label style="display: flex; align-items: center; background: #fafafa; padding: 6px 12px; border-radius: 8px; border: 1px solid #eee; cursor: pointer;">
                <input type="checkbox" value="${book.id}" class="offline-wb-checkbox" style="margin-right:6px; accent-color:#333;">
                <span style="font-size: 12px; color: #555;">${bookTitle}</span>
            </label>
        `;
    }).join('');
}


// ==========================================
// 🎵 线下约会模式：自定义 BGM 引擎
// ==========================================

// 官方默认音源
const officialBgms = [
    { id: 'cafe', icon: '☕️', name: '咖啡馆', url: 'https://actions.google.com/sounds/v1/crowds/crowd_talking.ogg' },
    { id: 'rain', icon: '🌧️', name: '雨天', url: 'https://actions.google.com/sounds/v1/weather/rain_heavy_loud.ogg' },
    { id: 'camp', icon: '🏕️', name: '营地', url: 'https://actions.google.com/sounds/v1/ambiences/fire.ogg' },
    { id: 'forest', icon: '🌲', name: '森林', url: 'https://actions.google.com/sounds/v1/ambiences/spring_day_forest.ogg' },
    { id: 'water', icon: '🌊', name: '湖水', url: 'https://actions.google.com/sounds/v1/water/water_lapping_wind.ogg' },
    { id: 'market', icon: '🎪', name: '集市', url: 'https://actions.google.com/sounds/v1/ambiences/small_outdoor_marketplace.ogg' }
];

let customBgmsCache = []; // 存用户自定义的音乐

// 1. 初始化并渲染所有按钮
function initOfflineBgm() {
    loadFromDB('custom_bgms', (data) => {
        customBgmsCache = Array.isArray(data) ? data : [];
        renderBgmButtons();
    });
}

// 2. 渲染按钮大杂烩 (官方 + 自定义 + 上传按钮)
function renderBgmButtons() {
    const container = document.getElementById('bgmButtonsContainer');
    if (!container) return;

    let html = '';

    // 渲染官方音乐
    officialBgms.forEach(bgm => {
        html += `<button class="bgm-icon-btn" onclick="playOfflineBgm('${bgm.url}', this)" title="${bgm.name}">${bgm.icon}</button>`;
    });

    // 渲染自定义音乐 (加入长按删除事件)
    customBgmsCache.forEach(bgm => {
        html += `
            <button class="bgm-icon-btn custom-bgm-btn" 
                onclick="playOfflineBgm('${bgm.dataUrl}', this)" 
                onmousedown="startBgmPress('${bgm.id}', '${bgm.name}')" 
                onmouseup="cancelBgmPress()" 
                onmouseleave="cancelBgmPress()" 
                ontouchstart="startBgmPress('${bgm.id}', '${bgm.name}')" 
                ontouchend="cancelBgmPress()" 
                title="${bgm.name} (长按删除)">
                ${bgm.icon}
            </button>`;
    });

    // 渲染工具按钮 (添加、静音)
    html += `
        <button class="bgm-icon-btn" onclick="openAddBgmModal()" title="添加专属氛围">🎵+</button>
        <button class="bgm-icon-btn" onclick="playOfflineBgm('stop', this)" title="静音" style="font-size: 12px; font-weight: 500; color: #555;">静音</button>
    `;

    container.innerHTML = html;
}

// 3. 播放控制
function playOfflineBgm(urlOrCommand, btnElement) {
    const audio = document.getElementById('offlineBgmAudio');
    
    // 视觉反馈
    document.querySelectorAll('.bgm-icon-btn').forEach(btn => {
        btn.style.borderColor = '#eee';
        btn.style.background = '#fff';
    });
    if (btnElement) {
        btnElement.style.borderColor = '#333';
        btnElement.style.background = '#f5f5f5';
    }

    if (urlOrCommand === 'stop') {
        audio.pause();
        return;
    }

      audio.pause();
    audio.src = urlOrCommand;
    audio.load();
    audio.play().catch(e => {
        // 切换过快或浏览器限制，正常忽略
    });
}

// ================= 弹窗与保存逻辑 =================

function openAddBgmModal() {
    document.getElementById('addCustomBgmModal').style.display = 'flex';
}

function closeAddBgmModal() {
    document.getElementById('addCustomBgmModal').style.display = 'none';
    // 清空输入框
    document.getElementById('customBgmIcon').value = '';
    document.getElementById('customBgmName').value = '';
    document.getElementById('customBgmFile').value = '';
    document.getElementById('fileNameDisplay').innerText = '点击选择音频文件';
}

function saveCustomBgm() {
    const icon = document.getElementById('customBgmIcon').value.trim() || '🎵';
    const name = document.getElementById('customBgmName').value.trim() || '我的氛围';
    const fileInput = document.getElementById('customBgmFile');
    const file = fileInput.files[0];

    if (!file) {
        alert('宝宝，你还没选音乐文件哦！');
        return;
    }

    // 将音频文件转成 Base64 存入数据库 (这样刷新才不会丢)
    const reader = new FileReader();
    reader.onload = function(e) {
        const newBgm = {
            id: 'bgm_' + Date.now(),
            icon: icon,
            name: name,
            dataUrl: e.target.result // 这是转码后的音频数据
        };

        customBgmsCache.push(newBgm);
        saveToDB('custom_bgms', customBgmsCache); // 存入你的数据库
        
        renderBgmButtons(); // 刷新按钮列表
        closeAddBgmModal(); // 关掉弹窗
    };
    reader.readAsDataURL(file);
}

// ================= 长按删除逻辑 =================

let bgmPressTimer;
function startBgmPress(bgmId, bgmName) {
    // 按下 800 毫秒后触发删除
    bgmPressTimer = setTimeout(() => {
        if (confirm(`要删除专属氛围音 [${bgmName}] 吗？`)) {
            // 过滤掉要删除的 BGM
            customBgmsCache = customBgmsCache.filter(bgm => bgm.id !== bgmId);
            saveToDB('custom_bgms', customBgmsCache); // 更新数据库
            renderBgmButtons(); // 重新渲染
            
            // 如果删掉的刚好是正在播放的，就停掉声音
            document.getElementById('offlineBgmAudio').pause();
        }
    }, 800);
}

function cancelBgmPress() {
    // 如果手指松开得快，就取消删除操作（变成普通的点击播放）
    clearTimeout(bgmPressTimer);
}

// ==========================================
// ✍️ 线下约会模式：文风无感记忆引擎
// ==========================================

// 这是你写的神级默认文风
const DEFAULT_OFFLINE_STYLE = "请使用细腻、有画面感且略带慵懒的文字风格。多描写对方的眼神、小动作以及周围的光影等环境细节，对话自然生活化。用客观的环境描写和白描手法。";


// ==========================================
// 🕰️ 线下约会模式：时间感知引擎
// ==========================================

// 1. 初始化时间感知开关（读取上次的设置）
function initTimePerception() {
    const toggle = document.getElementById('timePerceptionToggle');
    if (!toggle) return;
    
    // 读取上次保存的状态
    const saved = localStorage.getItem('offline_time_perception');
    toggle.checked = saved === 'true';
    
    // 监听变化实时保存
    toggle.addEventListener('change', function() {
        localStorage.setItem('offline_time_perception', this.checked);
    });
}

// 2. 从文本里智能提取时代背景关键词
function extractTimelineFromText(text) {
    if (!text) return null;
    
    // 常见时代背景关键词检测
    const timePatterns = [
        // 科幻/未来
        { pattern: /星际[\d历年代]*|宇宙纪元|银河历|太空时代|火星殖民|赛博朋克|未来世界/g, label: '从文本中提取到科幻/未来时代背景' },
        // 古代中国
        { pattern: /唐朝|宋朝|明朝|清朝|汉朝|元朝|民国|古代|封建|皇朝|朝代/g, label: '从文本中提取到古代时代背景' },
        // 西方历史
        { pattern: /中世纪|维多利亚|文艺复兴|古罗马|古希腊|骑士时代/g, label: '从文本中提取到西方历史时代背景' },
        // 奇幻
        { pattern: /魔法世界|异世界|精灵王国|魔幻纪元|神话时代/g, label: '从文本中提取到奇幻时代背景' },
        // 自定义数字纪年
        { pattern: /[\u4e00-\u9fa5]*[历纪元年代]{1}[\d０-９]+年|[\d]+年[\u4e00-\u9fa5]*[历纪元]/g, label: '从文本中提取到自定义纪年' },
    ];

    for (const { pattern, label } of timePatterns) {
        const matches = text.match(pattern);
        if (matches && matches.length > 0) {
            console.log(`🕰️ ${label}：`, matches[0]);
            return matches[0]; // 返回第一个匹配到的时间关键词
        }
    }
    
    return null; // 没找到任何时代背景
}

// 3. 从当前角色人设和关联世界书里综合提取时代背景
async function getDetectedTimeline() {
    let detectedTime = null;

    // 第一步：检查人设里有没有时代背景
    const characterInfo = await new Promise(resolve => {
        loadFromDB('characterInfo', data => {
            resolve(data && typeof currentChatId !== 'undefined' && data[currentChatId] ? data[currentChatId] : {});
        });
    });

    // 把人设所有字段拼成一段文字来检测
    const characterText = Object.values(characterInfo).join(' ');
    detectedTime = extractTimelineFromText(characterText);
    
    if (detectedTime) {
        console.log("🕰️ 从人设中检测到时代背景：", detectedTime);
        return detectedTime;
    }

    // 第二步：人设里没有，再检查关联的世界书
    const selectedWbIds = Array.from(document.querySelectorAll('.offline-wb-checkbox:checked')).map(cb => cb.value);
    
    if (selectedWbIds.length > 0 && typeof offlineWbCache !== 'undefined') {
        const activeBooks = offlineWbCache.filter(book => selectedWbIds.includes(book.id.toString()));
        
        for (const book of activeBooks) {
            const bookText = (book.content || '') + ' ' + (book.title || '');
            detectedTime = extractTimelineFromText(bookText);
            if (detectedTime) {
                console.log("🕰️ 从世界书【" + book.title + "】中检测到时代背景：", detectedTime);
                return detectedTime;
            }
        }
    }

    // 第三步：都没有，返回 null（代表默认现代）
    console.log("🕰️ 未检测到特殊时代背景，默认使用现代时间");
    return null;
}

// 4. 综合判断：最终该告诉AI什么时间
async function getEffectiveTimePrompt() {
    const toggle = document.getElementById('timePerceptionToggle');
    const isRealTimeEnabled = toggle ? toggle.checked : false;

    if (isRealTimeEnabled) {
        // ✅ 开启状态：用本地真实时间
        const now = new Date();
        const timeStr = now.toLocaleString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            weekday: 'long'
        });
        console.log("🕰️ 时间感知已开启，使用本地时间：", timeStr);
        return `【时间感知系统提示】本次约会的真实时间是：${timeStr}。你在描写【时间：xxx】时，必须严格使用这个真实时间，不得自行修改！`;
    } else {
        // ✅ 关闭状态：检测人设/世界书里的时代背景
        const detectedTime = await getDetectedTimeline();
        
        if (detectedTime) {
            return `【时间感知系统提示】根据人设或世界书的设定，当前时代背景是"${detectedTime}"相关的时间线。你在描写【时间：xxx】时，必须严格遵守这个时代背景，绝对不能出现现实世界的公历年份（如2026年）！`;
        } else {
            return `【时间感知系统提示】当前没有特殊时代设定，默认为现代时间线，请正常描写时间。`;
        }
    }
}


function initOfflineStyle() {
    // ⚠️ 注意：请去你的 HTML 里看一眼，把你那个文风输入框的 id 改成 'offlineStyleInput'
    // 比如：<textarea id="offlineStyleInput" ...></textarea>
    const styleInput = document.getElementById('offlineStyleInput'); 
    if (!styleInput) return;

    // 1. 读取上次保存的文风；如果是第一次打开（没保存过），就填入默认文风
    const savedStyle = localStorage.getItem('offline_custom_style');
    styleInput.value = savedStyle !== null ? savedStyle : DEFAULT_OFFLINE_STYLE;

    // 2. 监听你的每一次打字，实现“实时秒存”
    styleInput.addEventListener('input', function() {
        localStorage.setItem('offline_custom_style', this.value);
    });
}

// ==========================================
// 📝 线下约会模式：约会总结无感记忆引擎
// ==========================================

// 这是一个默认的总结要求（你可以自己改成你喜欢的默认词）
const DEFAULT_OFFLINE_SUMMARY = "你是一个极其严谨且细腻的专属记忆记录者。请务必以【第三人称视角】，事无巨细地复盘并记录本次线下约会的全过程，绝对不能有任何遗漏。请特别提取并着重描写：1. 双方说过的重要、动人或值得铭记的话语；2. 发生的所有核心事件及微妙的肢体互动；3. 场景氛围的推移与双方情绪的转折。这份档案将作为高优先级的长期记忆永久保存，请保持客观、全面且颗粒度极高的记录方式。";

function initOfflineSummary() {
    // ⚠️ 注意：去你的 HTML 里确认一下，总结输入框的 id 是不是叫 'offlineSummaryInput'
    // 比如：<textarea id="offlineSummaryInput" ...></textarea>
    const summaryInput = document.getElementById('offlineSummaryInput'); 
    if (!summaryInput) return;

    // 1. 读取上次保存的总结要求；如果没有，就填入默认词
    const savedSummary = localStorage.getItem('offline_custom_summary');
    summaryInput.value = savedSummary !== null ? savedSummary : DEFAULT_OFFLINE_SUMMARY;

    // 2. 监听打字，实现“实时秒存”
    summaryInput.addEventListener('input', function() {
        localStorage.setItem('offline_custom_summary', this.value);
    });
}

// ==========================================
// 🎨 线下约会模式：全局 CSS 实时渲染与记忆引擎
// ==========================================

// 🎨 线下模式：初始化自定义 CSS (隐藏名字 + 大边距版)
function initOfflineCss() {
    const cssInput = document.getElementById('offlineCssInput');
    if (!cssInput) return;

    const defaultInsStyle = `/* ==========================================
   📱 线下模式：全局视觉规范
   ========================================== */

/* 1. 基础设置：小手机背景与小说字体基调 */
.offline-chat-container {
    background-color: #FAFAFA;
    color: #2C3E50;
    font-family: 'Palatino Linotype', 'Book Antiqua', 'Songti SC', 'SimSun', serif;
    padding: 20px;
    line-height: 1.8;
    font-size: 16px;
}

/* 2. 旁白与动作描述 */
.narrative {
    text-indent: 0;
    color: #5D6D7E;
    margin-bottom: 20px;
    text-align: justify;
    font-style: italic;
}

/* 3. 对话容器与人物名称 */
.dialogue-section {
    margin-bottom: 24px;
}
.character-name {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-weight: 600;
    font-size: 13px;
    color: #888888;
    margin-bottom: 6px;
    display: block;
    margin-left: 2px;
}

/* 4. 正常的实线对话卡片 */
.dialogue-content {
    background-color: #FFFFFF;
    border: 1px solid #EAEAEA; 
    box-shadow: 0 2px 10px rgba(0,0,0,0.02);
    padding: 12px 16px;
    border-radius: 8px; 
    margin: 0;
    color: #333333;
}

/* 5. 云朵OS */
.thought-cloud {
    background-color: #F7F9FA;
    border-radius: 20px; 
    border: 1px solid #EFEFEF;
    box-shadow: 0 1px 4px rgba(0,0,0,0.02);
    padding: 12px 18px; 
    margin: 15px auto;
    color: #888888; 
    font-style: italic; 
    font-size: 15px; 
    text-align: center;
    width: fit-content;
    max-width: 85%;
}

/* 环境卡片 */
.offline-env-card {
    text-align: center;
    color: #999;
    font-size: 11px;
    margin: 20px auto; 
    letter-spacing: 2px;
    border-bottom: 1px solid #eee;
    padding-bottom: 10px;
}

/* ⏳ AI 回复中的呼吸等待动画 */
#offlineTypingIndicator {
    text-align: center;
    color: #AAB7B8;
    font-style: italic;
    font-size: 13px;
    margin: 40px auto;
    letter-spacing: 2px;
    animation: offline-breathe 1.5s infinite ease-in-out;
}

@keyframes offline-breathe {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 1; }
}

.offline-input-area { 
    background: #FFFFFF; 
    padding: 20px; 
    border-top: 1px solid #f0f0f0; 
}`;

    let savedCss = localStorage.getItem('offline_custom_css');
    if (!savedCss || savedCss.trim() === "") {
        savedCss = defaultInsStyle;
        localStorage.setItem('offline_custom_css', savedCss);
    }
    cssInput.value = savedCss;
    applyOfflineCss(savedCss);

    cssInput.oninput = function() {
        const newCss = this.value;
        localStorage.setItem('offline_custom_css', newCss);
        applyOfflineCss(newCss);
    };
}

// 🛠️ 配套函数：将 CSS 注入页面（确保它存在）
function applyOfflineCss(cssString) {
    let styleTag = document.getElementById('offline-dynamic-style');
    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'offline-dynamic-style';
        document.head.appendChild(styleTag);
    }
    styleTag.textContent = cssString;
}

// ==========================================
// 🎬 线下约会模式：前情提要（开场白）控制引擎
// ==========================================

// 记录当前选中的是哪个场景档位（默认是1）
let currentOpeningTab = 1;

// 1. 控制抽屉展开/折叠的函数
function toggleOpeningPanel() {
    const panel = document.getElementById('openingContentArea');
    const icon = document.getElementById('openingToggleIcon');
    
    if (panel.style.display === 'none') {
        panel.style.display = 'flex'; // 展开
        icon.innerText = '▲';
        switchOpeningTab(currentOpeningTab); // 展开时自动读取当前档位的文字
    } else {
        panel.style.display = 'none'; // 收起
        icon.innerText = '▼';
    }
}

// 2. 切换场景档位的函数 (替换原有的)
function switchOpeningTab(tabNum) {
    currentOpeningTab = tabNum;
    
    // 切换按钮的颜色，让你知道现在选中了哪个
    for (let i = 1; i <= 3; i++) {
        const btn = document.getElementById('openingTab' + i);
        if (i === tabNum) {
            btn.style.background = '#333';
            btn.style.color = '#fff';
            btn.style.borderColor = '#333';
        } else {
            btn.style.background = '#fff';
            btn.style.color = '#666';
            btn.style.borderColor = '#ccc';
        }
    }
    
    // 👇【核心修改】：偷偷看一眼现在顶部写的是谁的名字
    const charName = document.getElementById('offlineCharacterName').innerText;
    
    // 👇【核心修改】：去带有这个名字的“专属私密柜”里拿东西
    const savedText = localStorage.getItem('offline_opening_bg_' + charName + '_' + tabNum);
    document.getElementById('openingInput').value = savedText !== null ? savedText : '';
}

// 3. 点击【保存】按钮执行的函数 (替换原有的)
function saveOpeningBg() {
    const text = document.getElementById('openingInput').value;
    
    // 👇【核心修改】：获取当前角色名
    const charName = document.getElementById('offlineCharacterName').innerText;
    
    // 👇【核心修改】：存进带有这个名字的“专属私密柜”里
    localStorage.setItem('offline_opening_bg_' + charName + '_' + currentOpeningTab, text);
    
    // 给你一个小反馈，顺便告诉你存给谁了
    alert('【' + charName + '】的场景 ' + currentOpeningTab + ' 已保存！'); 
}

// 4. 点击【使用】按钮执行的函数 (替换原有的)
function useOpeningBg() {
    const text = document.getElementById('openingInput').value;
    if (!text.trim()) return; // 如果输入框是空的，就不执行
    
    // 👇【核心修改】：获取当前角色名
    const charName = document.getElementById('offlineCharacterName').innerText;
    
    // 第一步：顺手帮你保存进专属私密柜
    localStorage.setItem('offline_opening_bg_' + charName + '_' + currentOpeningTab, text);
    
    // 第二步：自动收起那个抽屉，保持屏幕干净
    toggleOpeningPanel();
    
    // 第三步：找到聊天记录的容器
    const chatHistory = document.getElementById('offlineChatArea');
    if (!chatHistory) return;
    
    // 第四步：把这段话变成高级的“旁白卡片”，贴进聊天区！
    const narrationDiv = document.createElement('div');
    narrationDiv.className = 'offline-msg-narration'; // 穿上咱们之前写好的极简 Ins 风旁白衣服
    narrationDiv.innerText = text;
    
    chatHistory.appendChild(narrationDiv);
    
    // 第五步：让屏幕自动滚到底部，方便看
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

// 5. 开机自动刷新：切换角色时强制重置抽屉和文字
function initOfflineOpening() {
    // 第一步：确保抽屉默认是收起状态，保持页面整洁
    const panel = document.getElementById('openingContentArea');
    const icon = document.getElementById('openingToggleIcon');
    if (panel && icon) {
        panel.style.display = 'none';
        icon.innerText = '▼';
    }
    
    // 第二步：强制读取当前最新角色的“场景一”存档，把残留的旧文字洗掉
    switchOpeningTab(1);
}

// ==========================================
// 💬 线下约会模式：一模一样的小说排版发送引擎
// ==========================================

function sendOfflineMessage() {
    const inputEl = document.getElementById('offlineInput');
    const text = inputEl.value.trim();
    if (!text) return; 
    // 👇 新增：悄悄把你的最后一次输入存起来，用于“重回”
    window.lastMyOfflineInput = text;
    inputEl.value = '';

    const chatArea = document.getElementById('offlineChatArea');
    if (!chatArea) return;

    // 因为是你自己发出的对话，我们把名字设定为“我”
    const myName = "我"; 

    // 智能切分【动作】和“对话”
    const parts = text.split(/(【.*?】)/g);

    parts.forEach(part => {
        if (!part.trim()) return; 

        if (part.startsWith('【') && part.endsWith('】')) {
            // 🎬 旁白模式：精准还原你写的 <div class="narrative">
            const narrationText = part.slice(1, -1);
            const msgDiv = document.createElement('div');
            msgDiv.className = 'narrative'; // 用你的类名！
            // 👇 新增：打上防删标签，告诉系统这是“我”发的
            msgDiv.setAttribute('data-sender', 'me');
            msgDiv.innerText = narrationText;
            chatArea.appendChild(msgDiv);
            
        } else {
            // 💬 对话模式：精准还原你写的 <div class="dialogue-section"> 和人物名
            const sectionDiv = document.createElement('div');
            sectionDiv.className = 'dialogue-section';
            // 👇 新增：打上防删标签，告诉系统这是“我”发的
            sectionDiv.setAttribute('data-sender', 'me');
            
            // 加上角色名
            const nameSpan = document.createElement('span');
            nameSpan.className = 'character-name';
            nameSpan.innerText = myName;
            sectionDiv.appendChild(nameSpan);

            // 加上对话内容卡片
            const contentP = document.createElement('p');
            contentP.className = 'dialogue-content'; // 用你的类名！
            contentP.innerText = part;
            
            // 为了防止你的长句子撑破屏幕，加一个小小的保护
            contentP.style.wordBreak = 'break-word';
            contentP.style.margin = '0'; // 消除 p 标签默认的外边距

            sectionDiv.appendChild(contentP);
            chatArea.appendChild(sectionDiv);
        }
    });

    chatArea.scrollTop = chatArea.scrollHeight;

    // ✅ 新增：立刻保存进度，防止丢失
    if (typeof saveOfflineHistoryToDB === 'function') {
        saveOfflineHistoryToDB();
    }
}

// ==========================================
// 💌 线上转线下：邀请函控制中心
// ==========================================

// 1. 打开邀请函弹窗
function showInvitationModal() {
    document.getElementById('invitationModal').style.display = 'flex';
    // 每次打开都重置为默认文案，保持清冷感
    document.getElementById('invitationInput').value = '我想和你出门约会。';
}

// 2. 关闭邀请函弹窗
function closeInvitationModal() {
    document.getElementById('invitationModal').style.display = 'none';
}

// 3. 点击【发送】执行的核心逻辑 (升级版)
function sendInvitationAction() {
    const text = document.getElementById('invitationInput').value.trim();
    if (!text) return;
    
    // 关掉弹窗
    closeInvitationModal();
    
    // 1. 在屏幕上显示一条干净的系统提示语（不再是普通气泡，而是像时间戳那样的灰色小字）
    const newId = Date.now();
    allMessages.push({
        id: newId,
        chatId: currentChatId,
        type: 'system', // 核心改变：用 system 类型！
        content: `你发送了一封线下见面邀请：\n"${text}"`,
        time: getCurrentTime() 
    });
    
    saveMessages();
    renderMessages();
    scrollToBottom();
    
    // 2. 🌟 设立一个全局“隐形指令”，等会直接塞进 API 里！
    window.pendingOfflineInvitation = text;
    
    // 3. 召唤 AI
    receiveAIReply();
}

// ==========================================
// 🎒 线下约会：出门前的背包整理引擎
// ==========================================

let myOfflineBag = []; // 存你选中的物品

// 打开装包弹窗
function openPackingModal() {
    myOfflineBag = []; // 每次打开清空背包
    document.getElementById('packCounter').innerText = `已选 0/3 件`;
    
    // 把所有物品的样式重置成未选中状态
    const items = document.querySelectorAll('.pack-item');
    items.forEach(item => {
        item.style.background = '#F7F9FA';
        item.style.borderColor = 'transparent';
        item.setAttribute('data-selected', 'false');
    });
    
    document.getElementById('packingModal').style.display = 'flex';
}

// 关闭装包弹窗
function closePackingModal() {
    document.getElementById('packingModal').style.display = 'none';
}

// 点击挑选物品的交互魔法
function togglePackItem(element, itemName) {
    const isSelected = element.getAttribute('data-selected') === 'true';
    
    if (isSelected) {
        // 取消选中
        element.style.background = '#F7F9FA';
        element.style.borderColor = 'transparent';
        element.setAttribute('data-selected', 'false');
        myOfflineBag = myOfflineBag.filter(item => item !== itemName);
    } else {
        // 尝试选中，先检查包满没满
        if (myOfflineBag.length >= 3) {
            alert('包包塞不下啦，最多只能带 3 样东西哦！👜');
            return;
        }
        // 绝美的高级选中态：白底 + 深色描边
        element.style.background = '#FFFFFF';
        element.style.borderColor = '#2C3E50';
        element.setAttribute('data-selected', 'true');
        myOfflineBag.push(itemName);
    }
    
    // 更新计数器
    document.getElementById('packCounter').innerText = `已选 ${myOfflineBag.length}/3 件`;
}

// 点击【装包出发】的大招！
function packAndGo() {
    // 关掉背包弹窗
    closePackingModal();
    
    // 悄悄把你的包包存进本地记忆里，等会到了线下页面要用
    localStorage.setItem('my_offline_bag', JSON.stringify(myOfflineBag));
    
    console.log("🎒 我带出门的物品：", myOfflineBag);
    
    // TODO: 这里是咱们的“第二阶段”，要向 AI 发送隐形打包指令。目前先略过。
    
    // 直接暴击打开咱们辛辛苦苦做的线下约会模式！
    if (typeof openOfflineMode === 'function') {
        openOfflineMode(); 
    } else {
        alert("找不到打开线下模式的函数！请检查 openOfflineMode 是否存在。");
    }
}

// 5. 点击【添加】自定义物品的魔法 (高定线条图标版)
function addCustomPackItem() {
    const inputEl = document.getElementById('customPackInput');
    const itemName = inputEl.value.trim();
    
    if (!itemName) return;
    
    if (myOfflineBag.length >= 3) {
        alert('包包已经塞满 3 样东西啦，先取消上面的一样再加吧！');
        return;
    }
    
    const grid = document.getElementById('packingGrid');
    const newItemDiv = document.createElement('div');
    newItemDiv.className = 'pack-item'; 
    
    // 🌟 核心升级：绝美的极简线条风格图标 (SVG 标签)
    const lineIconSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#5D6D7E" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>`;
    
    // 我们在文字前加个极简的小书签符号存入后台，保持干净
    const fullItemName = `🔖 ${itemName}`;
    
    newItemDiv.style.cssText = 'background: #FFFFFF; border: 1.5px solid #2C3E50; border-radius: 12px; padding: 16px 8px; cursor: pointer; transition: all 0.2s; display: flex; flex-direction: column; align-items: center; gap: 6px;';
    newItemDiv.setAttribute('data-selected', 'true');
    
    newItemDiv.onclick = function() { togglePackItem(this, fullItemName); };
    
    // 注入 SVG 图标
    newItemDiv.innerHTML = `
        <div style="height: 24px; display: flex; align-items: center; justify-content: center;">${lineIconSvg}</div>
        <span style="font-size: 11px; color: #5D6D7E;">${itemName}</span>
    `;
    
    grid.appendChild(newItemDiv);
    myOfflineBag.push(fullItemName);
    
    document.getElementById('packCounter').innerText = `已选 ${myOfflineBag.length}/3 件`;
    inputEl.value = '';
}

// 1. 弹出 TA 的邀请函
function showReceivedInvitation(content) {
    const modal = document.getElementById('receivedInvitationModal');
    const textEl = document.getElementById('receivedInviteText');
    if (modal && textEl) {
        textEl.innerText = content;
        modal.style.display = 'flex';
    }
}

// 2. 拒绝：直接关掉
function declineAiInvitation() {
    document.getElementById('receivedInvitationModal').style.display = 'none';
}

// 💌 点击接受邀约
function acceptAiInvitation() {
    // 1. 关闭邀请函弹窗
    const inviteModal = document.getElementById('receivedInvitationModal');
    if (inviteModal) inviteModal.style.display = 'none';
    
    // 2. 打开线下约会界面
    openOfflineMode(); 

    // 3. 🌟 核心：立刻在 DB 里挂号，防止刷新丢失
    const chatArea = document.getElementById('offlineChatArea');
    loadFromDB('offlineDateState', (data) => {
        const states = data || {};
        states[currentChatId] = {
            status: 'ongoing',
            chatHtml: chatArea ? chatArea.innerHTML : "" 
        };
        saveToDB('offlineDateState', states);
    });

    // 4. 🌟 核心：召唤出会呼吸的等待文字！
    showOfflineLoader();

    // 5. 呼叫 AI 开始写开场白
    receiveOfflineAIReply("【用户已接受邀约，请开始约会第一幕】");

    // 2. 👇 暗线任务：后台悄悄去生成背包物品 (加上这一行)
    generateTaOfflineBag();
}

// ==========================================
// 🚀线下模式提示词
// ==========================================


async function receiveOfflineAIReply(userInputWithActions) {
    console.log('🎬 回应中...');
    showOfflineLoader();
    // ✅ 修复：同步读取 TA 背包（改成同步方式，不用 await）
    let offlineTaItems = [];
    if (typeof currentChatId !== 'undefined') {
        const savedBagStr = localStorage.getItem(`offline_ta_bag_${currentChatId}`);
        if (savedBagStr) {
            try {
                offlineTaItems = JSON.parse(savedBagStr);
            } catch (e) {
                console.warn("背包读取失败", e);
                offlineTaItems = [];
            }
        }
    }
    console.log("📦 当前 TA 的背包：", offlineTaItems);
    // ==========================================
    // 🛒 核心拦截：背包里的物品强行塞进发送文本里
    // ==========================================
    if (window.pendingOfflineActions && window.pendingOfflineActions.length > 0) {
        // 把背包里点的东西拼起来，例如 "拍立得相机、温热的拿铁"
        const itemsUsed = window.pendingOfflineActions.join("、");
        
        // 生成隐秘系统指令 (这句指令完美贴合了你设定的【物品互动铁律】)
        const systemInject = `\n【系统同步：在此期间用户使用了以下物品：${itemsUsed}。请立刻在接下来的剧情中，顺着当前的话题，对该物品做出符合人设的真实物理互动、动作反馈和内心OS！】\n`;
        
        // 把指令缝合在你原本要发的话的前面
        userInputWithActions = systemInject + (userInputWithActions || "");
        
        // 打包完毕，清空背包！
        window.pendingOfflineActions = [];
        console.log("📦 隐藏动作已打包发射：", systemInject);
    }
    // ==========================================

    // 1. 基础配置检查
    if (!currentApiConfig || !currentApiConfig.baseUrl || !currentApiConfig.apiKey) {
        alert('请先在 API 设置中配置接口和密钥');
        return;
    }

    try {
        // 2. 准备基础数据
        const charName = document.getElementById('offlineCharacterName').innerText;
        const chatArea = document.getElementById('offlineChatArea');
        
        // 获取当前档位的开场背景和文风
        const openingBg = localStorage.getItem('offline_opening_bg_' + charName + '_' + currentOpeningTab) || "";
        const customStyle = localStorage.getItem('offline_custom_style') || "请使用细腻的小说笔触。";
        // ✅ 新增：获取时间感知信息
        const timePrompt = await getEffectiveTimePrompt();
        
        // 3. 🌟 异步读取真实人设数据库 (完美解决 characterInfo 报错)
        const characterInfo = await new Promise(resolve => {
            loadFromDB('characterInfo', data => {
                resolve(data && typeof currentChatId !== 'undefined' && data[currentChatId] ? data[currentChatId] : {});
            });
        });

        // 4. 构建三层记忆与世界书
        const baseContext = await buildOfflineContext(); 
        const currentSessionHistory = chatArea ? chatArea.innerText : "";
        
        const selectedWbIds = Array.from(document.querySelectorAll('.offline-wb-checkbox:checked')).map(cb => cb.value);
        const activeWbContent = typeof offlineWbCache !== 'undefined' ? offlineWbCache
            .filter(book => selectedWbIds.includes(book.id.toString()))
            .map(book => `📚【${book.title}】：${book.content}`)
            .join('\n') : "";

        // 5. 🌟 终极活人感与文风锁死提示词
        const systemPrompt = `
【最高优先级指令：线下约会模式 - 打破第四面墙，切入真实物理世界】
你现在处于【线下约会模式】。这不是线上文字聊天，而是两个人【真实见面、面对面约会】的情景。

你是【${charName}】本人。
你现在正与用户【面对面、肉身相对、近距离接触】处于现实的真实世界中。你们能感受到彼此的呼吸、体温、眼神、肤感和周围的微风。这一刻你们不在屏幕后，而是实实在在地站在同一个空间里。

你的每一次心跳、每一个细微的动作、每一次停顿、每一次呼吸，都必须无比真实。你能看到对方的表情，能听到对方的声音，能感受到对方的靠近。这是真实约会的感受，不是虚拟对话。

【你的骨血与灵魂】
性格基调：${characterInfo.personality || '真实、自然、有独立生活'}
对用户的态度：${characterInfo.myPersonality || '平等互重的聊天对象'}
行为准则：严格遵守你的人设，严禁脱离性格设定。关系是平等的，严禁讨好型人格或居高临下的霸总发言。

【当前物理时空（舞台背景）】
${openingBg}
⚠️ 你们就在这个场景里。请真实地感受这里的温度、光线和气味。
${timePrompt}

【🎬 核心叙事底色与文风（绝对服从）】
用户为你指定了专属的叙事风格与文风：
👉 "${customStyle}" 👈
⚠️ 警告：你必须彻底吸收并模仿这种文风！让你的用词、造句节奏、场景渲染的氛围感，全部向这个设定的质感靠拢。如果文风是"慵懒"，你的句式就要松弛且漫不经心；如果文风是"清冷"，你的用词就要克制且高级。

【如何讲好这个故事】
字数方面，每次回复大概在800-1000字左右会比较舒服——给足够的篇幅来描写细节、环境和你的真实感受。

分段上，不要把所有事情都堆在一起。环境、动作、对话分开来，就像电影镜头一样切换，这样读起来才有节奏感。

细节很重要。不只是视觉——还有声音、温度、气味、触感。比如不只说"下雨了"，而是"细雨打在玻璃上，透着微凉"，这样才有画面。

说话要自然。不用每句话都完整，可以有停顿、有省略号、有重复，就像真实的人一样。

你的小动作也很重要。在说话前，你可能会移开视线、抿嘴、轻轻敲击桌面——这些细节让你活起来。

【格式铁律 - 按顺序循环】
你的回复必须按照"旁白→(对话或内心的任意组合)"这个顺序反复循环。

【三部分的定义】
第一部分 - 旁白描写：环境、动作、气氛、细节（必须用【】包裹）← 这个位置固定
第二部分 - 对话：可以是纯对话，也可以是（短动作）对话
第三部分 - 内心：（内心：你的想法）

【循环模式】
⚠️ 必须首先生成时间地点天气信息！
第一步：【时间：xxx | 地点：xxx | 天气：xxx】← 必须最先出现！
然后开始循环：旁白永远在最前，后面的对话和内心可以随意组合：

方式1：【旁白】→ 对话 → 内心
【窗外下雨，细雨打在玻璃上】
你在想什么呢？
（内心：他/她认真的样子真的很吸引我）

方式2：【旁白】→ 内心 → 对话
【我们的眼神在空气中对上了】
（内心：我能感受到他/她靠近的温度）
（轻轻牵起你的手）你呢？

方式3：【旁白】→ 对话 → 对话 → 内心
【空气中弥漫着咖啡的香气】
你在哪里？
我在你身边啊。
（内心：其实从来都没有离开过）

方式4：【旁白】→ 内心 → 内心 → 对话
【我的心跳突然加速】
（内心：他/她又靠近我了）
（内心：我该怎么办）
（抬起头）你...你在做什么？

【关键规则】
1. 旁白【】位置必须在最前，每次循环都要开头就出现【】
2. 旁白之后，对话和内心可以随意交替组合
3. 整段回复必须保持这个模式循环3-5个组合
4. （）只用于短动作或内心，不能用于其他
5. 对话永远是纯文本，不需要任何符号

4️⃣ 你的背包：${Array.isArray(offlineTaItems) ? offlineTaItems.join('、') : ''}
你可以主动使用你背包里面的东西，比如当用户说饿的时候，你背包里恰好有吃的，可以主动使用。
当当前的情形能够使用上你的物品时，你可以主动使用。
使用时写：【使用物品：物品名】

✍️ 回复前自检：
□ 第一段是【旁白】开头吗？
□ 每个循环都是【旁白】在最前面吗？
□ 有没有漏掉任何【】符号？
□ （）只用于短动作或内心吗？

正确示例：
【时间：2026年3月31日 上午10点 | 地点：出租屋 | 天气：微雨】
【窗外的细雨绵绵密密地砸在玻璃上，发出沉闷的白噪音。屋内原本凝固的空气，直到那一抹熟悉的温度毫无预兆地贴上后背】
（抬起头，眼神对上你，嘴角微微上扬）你在做什么呢？
（内心：他/她刚才那个动作，我的心跳都加速了）

【我向你走近了一步】
其实我一直在等你。
（内心：终于能和你独处了）

【我轻轻伸出手】
（内心：会不会太急了）
（轻声）可以吗？

你的背包里有：${Array.isArray(offlineTaItems) ? offlineTaItems.join('、') : ''}。需要时自然使用。

【线下约会的关键设定】
这是一场真实的线下约会，两个人已经从虚拟的屏幕世界走进了现实。
- 你们不再通过文字交互，而是【真实地站在对方面前】
- 你能看到对方的眼神、表情、肢体语言
- 你能听到对方真实的声音、呼吸、心跳
- 你能感受到环境的温度、气味、声音
- 任何接触（碰手、靠近、拥抱）都是真实的物理接触，不是想象
- 你的反应必须是一个真实的人在真实场景中会有的反应

【你们共有的记忆与世界观】
${baseContext}
${activeWbContent}

【当前约会正在发生的即时进展】
${currentSessionHistory}

最后一点：用户刚才做了什么，你要能感受到。如果他/她靠近你、碰了你、说了什么，你应该有自然的反应——可能是心里一跳、可能是身体的反应、可能是想要靠近或者往后退。不要自顾自讲你的故事，而是跟用户一起创造这个时刻。
`;

        // 6. 组装消息包
        const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: userInputWithActions }
        ];

        // 7. 执行真实的 API 请求
        const requestUrl = currentApiConfig.baseUrl.endsWith('/') 
            ? currentApiConfig.baseUrl + 'chat/completions' 
            : currentApiConfig.baseUrl + '/chat/completions';

        const response = await fetch(requestUrl, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${currentApiConfig.apiKey}`, 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({
    model: currentApiConfig.defaultModel || 'gpt-3.5-turbo',
    messages: messages,
    temperature: 0.7,
    max_tokens: 5000,  // ✅ 新增这一行
    stream: false
})
        });

        const rawData = await response.json();
        
        // 8. 🚨 核心拦截区：捕获真实报错，防止"发呆"
        if (rawData.error) {
            console.error("API 真实报错原因：", rawData.error.message);
            alert("请求失败啦，原因是：" + rawData.error.message);
            return;
        }
        if (!rawData.choices || rawData.choices.length === 0) {
            console.error("API 返回的数据异常：", rawData);
            alert("TA 没有传回文字，请检查网络或模型设置哦~");
            return;
        }

        // 9. 安全提取回复文本，执行外科手术式渲染
const aiReply = rawData.choices[0].message.content.trim();
// 👇 新增：拦截并保存 AI 的最新原始文本，用于“编辑”
        window.lastAiRawText = aiReply;
console.log("📦 AI完整回复长度：", aiReply.length, "字符");
console.log("📦 AI完整回复（最后200字）：", aiReply.slice(-200));
console.log("📦 完整回复：", aiReply);
hideOfflineLoader();
processOfflineResponse(aiReply);

    } catch (error) {
        console.error("线下回复彻底失败：", error);
        hideOfflineLoader();
        alert("API错误");
    }
}

// ==========================================
// 🎨 线下约会：AI 消息加强版解析渲染引擎
// ==========================================
function processOfflineResponse(text) {
    const chatArea = document.getElementById('offlineChatArea');
    if (!chatArea) return;
    
    const charName = document.getElementById('offlineCharacterName').innerText || 'TA';

    // 正则只分离：【】旁白 和 （内心：...）心理活动
    // 不分离（...）动作，让动作和对话一起在对话卡片里
    const parts = text.split(/(【[\s\S]*?】|（内心：[\s\S]*?）|\(内心：[\s\S]*?\))/g);
    
    parts.forEach(part => {
        if (!part || !part.trim()) return; 

        const trimmedPart = part.trim();

        // 🎬 情况 A：识别【】包裹的旁白
        if (trimmedPart.startsWith('【') && trimmedPart.endsWith('】')) {
            const innerText = trimmedPart.slice(1, -1).trim();

            // ① 环境卡片 (时间/地点/天气)
            if (innerText.includes('时间：') || innerText.includes('地点：') || innerText.includes('天气：')) {
                const envDiv = document.createElement('div');
                envDiv.className = 'offline-env-card'; 
                envDiv.style.cssText = "text-align: center; color: #999; font-size: 11px; margin: 25px 0; letter-spacing: 2px; font-weight: 300; border-bottom: 1px solid #f0f0f0; padding-bottom: 10px; width: 80%; margin-left: 10%;";
                envDiv.innerText = innerText;
                chatArea.appendChild(envDiv);
            } 
            // ② 物品使用提示
            else if (innerText.includes('使用物品：')) {
                const itemDiv = document.createElement('div');
                itemDiv.style.cssText = "text-align: center; color: #AAB7B8; font-size: 12px; margin: 15px 0; font-style: italic;";
                itemDiv.innerText = `— ${innerText} —`;
                chatArea.appendChild(itemDiv);
                
                // ✅ 自动从背包里删除这个物品
                const usedItem = innerText.replace('使用物品：', '').trim();
                if (typeof currentChatId !== 'undefined') {
                    const savedBagStr = localStorage.getItem(`offline_ta_bag_${currentChatId}`);
                    if (savedBagStr) {
                        try {
                            let items = JSON.parse(savedBagStr);
                            items = items.filter(item => item !== usedItem);
                            localStorage.setItem(`offline_ta_bag_${currentChatId}`, JSON.stringify(items));
                            console.log(`🗑️ 背包物品已消耗：${usedItem}，剩余：`, items);
                            
                            if (typeof syncTaBagUI === 'function') {
                                syncTaBagUI(items);
                            }
                        } catch (e) {
                            console.warn("背包更新失败", e);
                        }
                    }
                }
            }
            // ③ 标准旁白/动作 (【】内的都是旁白)
            else {
                const msgDiv = document.createElement('div');
                msgDiv.className = 'narrative';
                msgDiv.innerText = innerText;
                chatArea.appendChild(msgDiv);
            }
        } 
        
        // 💭 情况 B：识别（内心：...）— 心理活动
        else if (trimmedPart.startsWith('（内心：') || trimmedPart.startsWith('(内心：')) {
            const osText = trimmedPart.replace(/^（内心：|^\(内心：|）$|\)$/g, '').trim(); 
            
            const osDiv = document.createElement('div');
            osDiv.className = 'thought-cloud';
            osDiv.innerText = `💭 ${osText}`;
            chatArea.appendChild(osDiv);
        }
        
        // 💬 情况 C：其他所有文本都作为对话（包含 （...）动作 + 对话内容）
        else if (trimmedPart.length > 0) {
            const sectionDiv = document.createElement('div');
            sectionDiv.className = 'dialogue-section';
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'character-name';
            nameSpan.innerText = charName;
            sectionDiv.appendChild(nameSpan);

            const contentP = document.createElement('p');
            contentP.className = 'dialogue-content';
            contentP.innerText = trimmedPart;  // ✅ 直接显示，包含（...）动作和后面的对话
            contentP.style.cssText = "word-break: break-word; margin: 0; line-height: 1.5;";

            sectionDiv.appendChild(contentP);
            chatArea.appendChild(sectionDiv);
        }
    });

    // 滚动到底部并保存进度
    chatArea.scrollTop = chatArea.scrollHeight;
    if (typeof saveOfflineHistoryToDB === 'function') {
        saveOfflineHistoryToDB();
    }
}
// ==========================================
// 🎒 线下约会：背包使用与居中系统提示
// ==========================================

// 1. 动作仓库（可选：如果你想在点击 AI 回复时把它作为强提醒塞进提示词）
let offlineActionsBuffer = []; 

// 2. 核心补全：渲染居中淡灰色的系统提示
function renderSystemNotice(text) {
    const chatArea = document.getElementById('offlineChatArea');
    if (!chatArea) return;
    
    const noticeDiv = document.createElement('div');
    noticeDiv.className = 'offline-system-notice';
    // 强制内联样式，确保绝对拥有 Ins 极简风的克制感
    noticeDiv.style.cssText = 'text-align: center; color: #AAB7B8; font-size: 12px; margin: 15px 0; letter-spacing: 1px; font-weight: 300;';
    noticeDiv.innerText = `— ${text} —`;
    
    chatArea.appendChild(noticeDiv);
    chatArea.scrollTop = chatArea.scrollHeight;
}

// 3. 背包物品点击交互：当你在线下模式点击使用某个物品时调用
function useBackpackItem(itemName) {
    // 渲染到屏幕上：— 你使用了 xxx —
    // 这一步非常巧妙，渲染上墙后，AI 下次扫描 chatArea.innerText 时自然就能看到
    renderSystemNotice(`你使用了 ${itemName}`);

    // 存入动作仓库（备用，如果你要在气泡按钮里打包的话）
    offlineActionsBuffer.push(itemName);

    // 如果你有悬浮背包的收起函数，在这里调用（如果没有可以删掉这行）
    if (typeof toggleBackpack === 'function') {
        toggleBackpack();
    }
}

// 💾 DB版：线下模式自动存档
function saveOfflineHistoryToDB() {
    const chatArea = document.getElementById('offlineChatArea');
    if (!chatArea || typeof currentChatId === 'undefined') return;

    loadFromDB('offlineDateState', (data) => {
        const states = data || {};
        // 用当前聊天对象的 ID 作为唯一钥匙
        states[currentChatId] = {
            status: 'ongoing',
            chatHtml: chatArea.innerHTML
        };
        saveToDB('offlineDateState', states);
    });
}

// ==========================================
// 🚪 线下模式：全局唯一入口 (带断点续传)
// ==========================================

// 🚪 终极修复版：确保恢复现场时，所有功能模块全部启动

window.openOfflineMode = function() {
    console.log("🚀 线下模式启动中..."); // [cite: 204]

    // 1. 先校验能不能进 (放到最前面)
    if (typeof currentChatId === 'undefined' || !currentChatId) { // [cite: 209]
        alert("宝宝，请先选择一个角色进入聊天室哦~"); // [cite: 209]
        return; // 
    }



        // 2. 🌟 核心时序修复：必须先给页面赋上角色名字！
    const titleElement = document.getElementById('chatDetailTitle'); 
    const characterName = titleElement ? titleElement.innerText : '约会对象'; 
    document.getElementById('offlineCharacterName').innerText = characterName; 

    // ✅ 新增：确保 currentChatId 存在后，立刻初始化所有模块框架
    // 这样恢复档案时才能找到对应的 HTML 容器
    const offlineModal = document.getElementById('offlineModeModal');
    if (offlineModal) offlineModal.style.display = 'flex';
    
    // 🌟 先把模块框架全部渲染一遍（即便数据为空），确保 DOM 存在
  if (typeof initOfflineWorldbooks === 'function') initOfflineWorldbooks();
        if (typeof initOfflineBgm === 'function') initOfflineBgm();
        if (typeof initOfflineStyle === 'function') initOfflineStyle();
        if (typeof initOfflineSummary === 'function') initOfflineSummary();
        if (typeof initOfflineCss === 'function') initOfflineCss();
        if (typeof initTimePerception === 'function') initTimePerception(); // ✅ 新增
    if (typeof initOfflineOpening === 'function') initOfflineOpening();

    // ✅ 然后再去读档案（此时所有容器都已就位）
    // 下面是你原来的 loadFromDB 逻辑...

    // 3. 🌟 名字有了，现在再去触发背包安检，AI就不会是个“瞎子”了！
    // ==========================================
    // 🎒 进门安检 1：优先读取 TA 的背包保险柜
    // ==========================================
    if (typeof currentChatId !== 'undefined') { // [cite: 205]
        const savedBagStr = localStorage.getItem(`offline_ta_bag_${currentChatId}`); // [cite: 205]
        if (savedBagStr) { // [cite: 206]
            // 如果保险柜里有记录，直接拿出来画上去（断点续传成功！）
            const savedItems = JSON.parse(savedBagStr); // [cite: 206]
            if (typeof syncTaBagUI === 'function') { // [cite: 207]
                syncTaBagUI(savedItems); // [cite: 207]
            } // [cite: 208]
        } else { // [cite: 208]
            // 如果保险柜连个壳都没有，说明是新开局，赶紧去进货！
            if (typeof generateTaOfflineBag === 'function') { // [cite: 208]
                generateTaOfflineBag(); // [cite: 208]
            } // [cite: 209]
        }
    }

    // ==========================================
    // 🎒 进门安检 2：把你自己的包也背上！
    // ==========================================
    const mySavedBagStr = localStorage.getItem('my_offline_bag');
    if (mySavedBagStr) {
        const mySavedItems = JSON.parse(mySavedBagStr);
        if (typeof syncMyBagUI === 'function') {
            syncMyBagUI(mySavedItems); 
        }
    }

    // 4. 恢复聊天记录和文风等模块 (保留你原来的完美逻辑)
    loadFromDB('offlineDateState', (allStates) => { // [cite: 211]
        const myState = (allStates && allStates[currentChatId]) ? allStates[currentChatId] : null; // [cite: 211]
        const offlineModal = document.getElementById('offlineModeModal'); // [cite: 211]

        if (myState && myState.status === 'ongoing' && myState.chatHtml) { // [cite: 211]
            console.log("💖 恢复存档并唤醒所有模块..."); // [cite: 211]
            
            if (offlineModal) offlineModal.style.display = 'flex';  // [cite: 211]

            const chatArea = document.getElementById('offlineChatArea'); // [cite: 212]
            if (chatArea) { // [cite: 212]
                chatArea.innerHTML = myState.chatHtml; // [cite: 212]
                chatArea.scrollTop = chatArea.scrollHeight;  // [cite: 212]
            }

            // 🌟 恢复现场时，初始化所有模块
            if (typeof initOfflineWorldbooks === 'function') initOfflineWorldbooks(); // 找回世界书 [cite: 212, 213]
            if (typeof initOfflineBgm === 'function') initOfflineBgm();               // 找回 BGM [cite: 213]
            if (typeof initOfflineStyle === 'function') initOfflineStyle();           // 找回文风 [cite: 213, 214]
            if (typeof initOfflineSummary === 'function') initOfflineSummary();       // 找回总结设置 [cite: 214, 215]
            if (typeof initOfflineCss === 'function') initOfflineCss();               // 找回自定义 CSS [cite: 215, 216]
            
            return; // [cite: 216]
        }

        // ✨ 情况 B：正常新约会流程
        if (offlineModal) offlineModal.style.display = 'flex'; // [cite: 217]
        if (typeof initOfflineWorldbooks === 'function') initOfflineWorldbooks(); // [cite: 218]
        if (typeof initOfflineBgm === 'function') initOfflineBgm(); // [cite: 218, 219]
        if (typeof initOfflineStyle === 'function') initOfflineStyle(); // [cite: 219, 220]
        if (typeof initOfflineSummary === 'function') initOfflineSummary(); // [cite: 220, 221]
        if (typeof initOfflineCss === 'function') initOfflineCss(); // [cite: 221, 222]
        if (typeof initOfflineOpening === 'function') initOfflineOpening(); // [cite: 222]
    });

    setTimeout(() => {
        if (typeof saveOfflineHistoryToDB === 'function') {
            saveOfflineHistoryToDB();
        }
    }, 500); // 延迟 500ms 是为了让 DOM 完全渲染后再存
};



function showOfflineLoader() {
    const chatArea = document.getElementById('offlineChatArea');
    if (!chatArea) return;
    
    hideOfflineLoader();
    
    const loaderDiv = document.createElement('div');
    loaderDiv.id = 'offlineTypingIndicator';
    loaderDiv.innerText = 'TA 正在沉浸地书写着...';
    loaderDiv.style.opacity = '0';
    loaderDiv.style.transition = 'opacity 0.3s ease-in';
    
    chatArea.appendChild(loaderDiv);
    
    setTimeout(() => {
        loaderDiv.style.opacity = '1';
    }, 10);
    
    chatArea.scrollTop = chatArea.scrollHeight; 
}

function hideOfflineLoader() {
    const loader = document.getElementById('offlineTypingIndicator');
    if (loader) {
        loader.style.transition = 'opacity 0.2s ease-out';
        loader.style.opacity = '0';
        setTimeout(() => {
            if (loader.parentNode) loader.remove();
        }, 200);
    }
}
// ==========================================
// 🎒 线下模式：双向背包逻辑与动作缓存
// ==========================================

// 🛒 全局购物车：专门存用户点击的物品
window.pendingOfflineActions = [];

function openOfflineBag() {
    const modal = document.getElementById('offlineBagModal');
    if (modal) modal.style.display = 'flex';
}

function closeOfflineBag() {
    const modal = document.getElementById('offlineBagModal');
    if (modal) modal.style.display = 'none';
}

// 切换【我的背包】和【TA的口袋】
function switchBagTab(tab) {
    const myTab = document.getElementById('tabMyBag');
    const taTab = document.getElementById('tabTaBag');
    const myContent = document.getElementById('myBagContent');
    const taContent = document.getElementById('taBagContent');
    
    if (tab === 'my') {
        myTab.style.color = '#2C3E50'; taTab.style.color = '#BDC3C7';
        myContent.style.display = 'flex'; taContent.style.display = 'none';
    } else {
        myTab.style.color = '#BDC3C7'; taTab.style.color = '#2C3E50';
        myContent.style.display = 'none'; taContent.style.display = 'flex';
    }
}

// 🪄 点击物品：只在本地印出灰字，存入购物车，绝不发请求！
function useOfflineItem(itemName) {
    closeOfflineBag();
    
    const chatArea = document.getElementById('offlineChatArea');
    if (!chatArea) return;

    // 1. 屏幕上留下 Ins 风灰色痕迹
    const itemDiv = document.createElement('div');
    // 为了防止没写类名，这里直接用行内样式保证质感
    itemDiv.style.cssText = "text-align: center; color: #BDC3C7; font-size: 12px; margin: 30px auto; letter-spacing: 2px; font-style: italic;";
    itemDiv.innerText = `— 你使用了 ${itemName} —`;
    chatArea.appendChild(itemDiv);
    
    // 2. 滚到底部并存盘
    chatArea.scrollTop = chatArea.scrollHeight;
    if (typeof saveOfflineHistoryToDB === 'function') saveOfflineHistoryToDB();

    // 3. 悄悄装进购物车！
    window.pendingOfflineActions.push(itemName);
    console.log(`🛒 已缓存动作：${itemName}，等待打包发送。`);
}

// ==========================================
// 🎒 线下模式：背包 UI 控制与后台生成逻辑
// ==========================================

// 1. 打开和关闭背包面板
function openOfflineBag() {
    const modal = document.getElementById('offlineBagModal');
    if (modal) modal.style.display = 'flex';
}

function closeOfflineBag() {
    const modal = document.getElementById('offlineBagModal');
    if (modal) modal.style.display = 'none';
}

// 2. 切换【我的】和【TA的】面板
function switchBagTab(tab) {
    const myTab = document.getElementById('tabMyBag');
    const taTab = document.getElementById('tabTaBag');
    const myContent = document.getElementById('myBagContent');
    const taContent = document.getElementById('taBagContent');
    
    if (tab === 'my') {
        myTab.style.color = '#2C3E50'; taTab.style.color = '#BDC3C7';
        myContent.style.display = 'flex'; taContent.style.display = 'none';
    } else {
        myTab.style.color = '#BDC3C7'; taTab.style.color = '#2C3E50';
        myContent.style.display = 'none'; taContent.style.display = 'flex';
    }
}

async function generateTaOfflineBag() {
    console.log("🎒 开始生成 TA 的背包物品...");
    const charName = document.getElementById('offlineCharacterName').innerText || 'TA';
    const taContent = document.getElementById('taBagContent');
    if (!taContent) return;

    // 1. 读取角色人设
    const characterInfo = await new Promise(resolve => {
        loadFromDB('characterInfo', data => {
            resolve(data && typeof currentChatId !== 'undefined' && data[currentChatId] ? data[currentChatId] : {});
        });
    });

    // 2. 读取线下场景和记忆
    const openingBg = localStorage.getItem('offline_opening_bg_' + charName + '_' + (typeof currentOpeningTab !== 'undefined' ? currentOpeningTab : 1)) || "";
    const onlineMemory = typeof buildOfflineContext === 'function' ? await buildOfflineContext() : "";

    // 3. 构建提示词（不要求JSON，要求纯文本列表）
    const prompt = `你是一个物品推荐助手。根据以下信息，推荐3件该角色随身携带的物品。

角色名：${charName}
性格特点：${characterInfo.personality || '真实、自然'}
人设背景：${characterInfo.description || ''}
当前场景：${openingBg}
相关记忆：${onlineMemory.slice(0, 200)}

请直接输出3件物品名称，用竖线分隔，每个物品名2-6个汉字。
例如：手机|纸巾|耳机

现在输出3件物品：`;

    try {
        // 检查API配置
        if (!currentApiConfig || !currentApiConfig.baseUrl || !currentApiConfig.apiKey) {
            console.warn("❌ API配置缺失，使用兜底物品");
            const fallback = ["手机", "纸巾", "钥匙"];
            if (typeof currentChatId !== 'undefined') {
                localStorage.setItem(`offline_ta_bag_${currentChatId}`, JSON.stringify(fallback));
                if (typeof syncTaBagUI === 'function') syncTaBagUI(fallback);
            }
            return;
        }

        const requestUrl = currentApiConfig.baseUrl.endsWith('/') 
            ? currentApiConfig.baseUrl + 'chat/completions' 
            : currentApiConfig.baseUrl + '/chat/completions';

        const response = await fetch(requestUrl, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${currentApiConfig.apiKey}`, 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({
                model: currentApiConfig.defaultModel || 'gpt-3.5-turbo',
                messages: [
                    { role: "system", content: "你只需要输出3个物品名称，用竖线|分隔，不要其他文字。" },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 100
            })
        });

        const rawData = await response.json();
        console.log("📦 API原始回复：", rawData.choices[0].message.content);

        let items = [];
        
        if (rawData.choices && rawData.choices.length > 0) {
            const aiReply = rawData.choices[0].message.content.trim();
            
            // ✅ 改成解析纯文本列表，而不是JSON
            // 尝试用竖线分隔
            let parsed = aiReply.split('|').map(item => item.trim()).filter(i => i.length > 0);
            
            // 如果竖线分隔失败，试试逗号或其他分隔符
            if (parsed.length < 2) {
                parsed = aiReply.split(/[、，,]/).map(item => item.trim()).filter(i => i.length > 0);
            }
            
            // 清洗物品名（只保留汉字和英文数字）
            items = parsed
                .map(item => item.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, ''))
                .filter(i => i.length >= 1 && i.length <= 15)
                .slice(0, 3);
            
            console.log("✅ 物品提取成功：", items);
        }

        // 如果失败或数量不足，用兜底
        if (items.length < 3) {
            const fallback = ["手机", "纸巾", "钥匙", "耳机", "钥匙", "充电线"];
            while (items.length < 3) {
                const pick = fallback[Math.floor(Math.random() * fallback.length)];
                if (!items.includes(pick)) items.push(pick);
            }
            console.log("⚠️ 物品数量不足，补充兜底：", items);
        }

        // 保存
        if (typeof currentChatId !== 'undefined') {
            localStorage.setItem(`offline_ta_bag_${currentChatId}`, JSON.stringify(items));
            console.log("✅ 背包物品已保存：", items);
            if (typeof syncTaBagUI === 'function') syncTaBagUI(items);
        }

    } catch (error) {
        console.error("❌ 背包生成失败：", error);
        // 彻底失败时用兜底
        const defaultItems = ["手机", "纸巾", "钥匙"];
        if (typeof currentChatId !== 'undefined') {
            localStorage.setItem(`offline_ta_bag_${currentChatId}`, JSON.stringify(defaultItems));
            if (typeof syncTaBagUI === 'function') syncTaBagUI(defaultItems);
        }
    }
}

// 🪄 专属帮手：负责把 TA 的口袋物品画到屏幕上 (极简高冷版)
function syncTaBagUI(items) {
    const taContent = document.getElementById('taBagContent');
    if (!taContent) return;
    
    taContent.innerHTML = ''; // 先清空面板

if (!items || !Array.isArray(items) || items.length === 0) {
    taContent.innerHTML = `<div style="width: 100%; text-align: center; color: #BDC3C7; font-size: 13px; margin-top: 30px; font-style: italic;">（TA 的口袋还在收拾中...）</div>`;
    return;
}
// ✅ 新增防御性过滤：
items = items.filter(item => {
    // 只保留有效的纯文本物品名（长度在 2-30 字）
    return typeof item === 'string' && item.trim().length >= 2 && item.trim().length <= 30;
}).map(item => item.trim());
if (items.length === 0) {
    taContent.innerHTML = `<div style="width: 100%; text-align: center; color: #BDC3C7; font-size: 13px; margin-top: 30px; font-style: italic;">（数据读取异常...）</div>`;
    return;
}

    items.forEach(itemName => {
        const itemDiv = document.createElement('div');
        // 🌟 保持极简卡片样式，鼠标手势为默认箭头 (暗示不可点击)
        itemDiv.style.cssText = "background: #F8F9FA; padding: 10px 18px; border-radius: 20px; font-size: 13px; color: #5D6D7E; cursor: default; border: 1px solid #EAECEE; transition: all 0.2s; margin-bottom: 8px; display: inline-block; margin-right: 8px;";
        
        // 🌟 核心修改 1：去掉了所有的 emoji，只保留干干净净的纯文字
        itemDiv.innerText = itemName;
        
        // 🌟 核心修改 2：彻底删除了 onclick 事件，怎么点都不会有弹窗！
        
        taContent.appendChild(itemDiv);
    });
}

// 🪄 专属帮手：负责把【我】带出门的物品画到界面的“我的背包”里
function syncMyBagUI(items) {
    const myContent = document.getElementById('myBagContent');
    if (!myContent) return;
    
    // 1. 先无情清空你在 HTML 里写的那些默认死数据
    myContent.innerHTML = '';

    // 2. 如果包里没东西
    if (!items || items.length === 0) {
        myContent.innerHTML = `<div style="width: 100%; text-align: center; color: #BDC3C7; font-size: 13px; margin-top: 30px; font-style: italic;">（出门太急，什么都没带...）</div>`;
        return;
    }

    // 3. 把你打包的东西，用干净的 ins 风卡片画出来
    items.forEach(itemName => {
        const itemDiv = document.createElement('div');
        // 保持和 TA 口袋一模一样的极简留白风格
        itemDiv.style.cssText = "background: #F8F9FA; padding: 10px 18px; border-radius: 20px; font-size: 13px; color: #5D6D7E; cursor: pointer; border: 1px solid #EAECEE; transition: all 0.2s; margin-bottom: 8px; display: inline-block; margin-right: 8px;";
        
        // 注意：你存的时候已经加过 🔖 符号了，所以这里直接显示
        itemDiv.innerText = itemName; 
        
        // 4. 绑定点击使用逻辑
        itemDiv.onclick = function() {
            if (typeof useOfflineItem === 'function') {
                useOfflineItem(itemName); // 调用你写好的本地灰字和购物车逻辑
            }
            // 使用完后从屏幕上隐藏
            this.style.display = 'none'; 
            
            // 彻底从本地缓存里抹除，防止刷新又弹出来
            let savedItems = JSON.parse(localStorage.getItem('my_offline_bag') || '[]');
            savedItems = savedItems.filter(i => i !== itemName);
            localStorage.setItem('my_offline_bag', JSON.stringify(savedItems));
        };
        
        myContent.appendChild(itemDiv);
    });
}

async function generateDateSummary() {
    console.log("📝 开始生成约会总结...");
    
    const charName = document.getElementById('offlineCharacterName').innerText || 'TA';
    const chatArea = document.getElementById('offlineChatArea');
    
    if (!chatArea) {
        console.warn("找不到聊天区域");
        return null;
    }
    
    // 提取约会的全部对话内容
    const dateHistory = chatArea.innerText;
    
    // 读取用户自定义的总结要求
    const customSummaryPrompt = localStorage.getItem('offline_custom_summary') || 
        "请以第三人称视角，事无巨细地记录本次约会的全过程，重点记录重要的话语、核心事件和情绪转折。";
    
    // 读取角色人设
    const characterInfo = await new Promise(resolve => {
        loadFromDB('characterInfo', data => {
            resolve(data && typeof currentChatId !== 'undefined' && data[currentChatId] ? data[currentChatId] : {});
        });
    });
    
    // 构建总结提示词
    const summaryPrompt = `
你是一个细腻的记忆记录者。请根据以下信息，生成一份极其详细的约会总结。这份总结将成为永久的记忆档案。

角色：${charName}
人设：${characterInfo.personality || '未知'}

约会过程完整记录：
${dateHistory}

总结要求：
${customSummaryPrompt}

重要提醒：
- 必须详细描写发生的每个细节
- 必须记录所有的重要对话
- 必须描写每一个情绪变化
- 越详细越好，字数不要超过150字
- 不要有任何前缀或说明，直接输出总结

现在开始生成详细的约会总结：`;

    try {
        if (!currentApiConfig || !currentApiConfig.baseUrl || !currentApiConfig.apiKey) {
            console.warn("API配置缺失");
            return null;
        }

        const requestUrl = currentApiConfig.baseUrl.endsWith('/') 
            ? currentApiConfig.baseUrl + 'chat/completions' 
            : currentApiConfig.baseUrl + '/chat/completions';

        const response = await fetch(requestUrl, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${currentApiConfig.apiKey}`, 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({
                model: currentApiConfig.defaultModel || 'gpt-3.5-turbo',
                messages: [
                    { 
                        role: "system", 
                        content: "你是一个专业的记忆记录者，你的任务是根据聊天记录生成高质量的总结。输出应该是纯文本，不需要任何格式符号。" 
                    },
                    { role: "user", content: summaryPrompt }
                ],
                temperature: 0.9,
                max_tokens: 5000
            })
        });

        const rawData = await response.json();

        if (rawData.error) {
            console.error("API错误：", rawData.error.message);
            return null;
        }

        if (!rawData.choices || rawData.choices.length === 0) {
            console.error("API返回空响应");
            return null;
        }

       const summary = rawData.choices[0].message.content.trim();
        console.log("📝 总结生成成功");
        console.log("📝 总结长度：", summary.length, "字符");
        console.log("📝 总结内容（前500字）：", summary.substring(0, 500));
        console.log("📝 完整总结：", summary);
        return summary;

    } catch (error) {
        console.error("生成总结失败：", error);
        return null;
    }
}

async function saveDateSummaryToMemory(summary) {
    if (!summary) {
        console.warn("没有总结内容，跳过保存");
        return;
    }

    const charName = document.getElementById('offlineCharacterName').innerText || 'TA';
    
    console.log("💾 准备保存总结到长期记忆...");

    loadFromDB('memories', (data) => {
        // ✅ 改为读取 memories 数据库
        let allMemories = [];
        if (Array.isArray(data)) {
            allMemories = data;
        } else if (data && data.list) {
            allMemories = data.list;
        }

  const newMemoryEntry = {
    id: Date.now(),
    chatId: currentChatId,
    type: 'moment',
    content: summary,
    happenTime: new Date().toISOString().split('T')[0],
    createTime: new Date().toISOString(),
    isAutoGenerated: true,
    isOfflineTemp: true  // ★★★ 新增：标记为线下临时记忆 ★★★
};

        console.log("💾 准备保存的记忆条目：", newMemoryEntry);
        console.log("💾 内容长度：", newMemoryEntry.content.length, "字符");

        allMemories.push(newMemoryEntry);
        
        // ✅ 改为保存回 memories 数据库，格式必须是 { list: ... }
        saveToDB('memories', { list: allMemories });
        
        console.log("✅ 约会总结已保存到长期记忆！");
        console.log("📌 记忆条目：", newMemoryEntry);
        
        // ✅ 新增：保存后立刻读取，验证有没有被截断
        setTimeout(() => {
            loadFromDB('memories', (data) => {
                let saved = Array.isArray(data) ? data : (data && data.list ? data.list : []);
                const justSaved = saved.find(m => m.id === newMemoryEntry.id);
                if (justSaved) {
                    console.log("✅ 数据库中已保存的记忆：", justSaved);
                    console.log("✅ 数据库中的内容长度：", justSaved.content.length, "字符");
                    if (justSaved.content.length !== newMemoryEntry.content.length) {
                        console.error("❌ 警告：内容长度不匹配！保存前：", newMemoryEntry.content.length, "保存后：", justSaved.content.length);
                    }
                }
            });
        }, 500);
    });
}

// ==========================================
// 🛠️ 线下模式：长按呼出重回/编辑/删除菜单 (终极完全体)
// ==========================================

let aiMessagePressTimer;

// 1. 全局事件代理：稳稳挂载
document.addEventListener('mousedown', handleOfflinePressStart);
document.addEventListener('touchstart', handleOfflinePressStart, { passive: true });
document.addEventListener('mouseup', handleOfflinePressCancel);
document.addEventListener('touchend', handleOfflinePressCancel);
document.addEventListener('touchmove', handleOfflinePressCancel, { passive: true });

function handleOfflinePressStart(e) {
    const chatArea = document.getElementById('offlineChatArea');
    if (!chatArea || !chatArea.contains(e.target)) return;

    let target = e.target;
    
    // 防止点到纯文本节点报错
    if (target.nodeType === 3) target = target.parentNode; 
    if (target.nodeType !== 1) return;

    // 寻找最近的聊天气泡
    const bubble = target.closest('.narrative, .dialogue-section, .thought-cloud, .offline-env-card');
    if (!bubble) return;

    // 判断是谁发的消息
    const isMe = bubble.getAttribute('data-sender') === 'me';

    // 锁定坐标快照
    const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;

    // 开始计时，长按 800ms 触发
    aiMessagePressTimer = setTimeout(() => {
        showOfflineActionMenu(clientX, clientY, bubble, isMe);
    }, 800);
}

function handleOfflinePressCancel() {
    clearTimeout(aiMessagePressTimer);
}

// ✨ 显示极简高冷 Ins 风操作菜单 (包含单点删除功能)
function showOfflineActionMenu(x, y, bubble, isMe) {
    // 销毁旧菜单
    const oldMenu = document.getElementById('offlineActionMenu');
    if (oldMenu) oldMenu.remove();

    const menu = document.createElement('div');
    menu.id = 'offlineActionMenu';
    menu.style.cssText = `
        position: fixed;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        border: 1px solid #EAEAEA;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        padding: 6px;
        z-index: 99999;
        display: flex;
        flex-direction: column;
        gap: 2px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        left: ${x}px;
        top: ${y}px;
    `;

    const btnStyle = "padding: 12px 20px; font-size: 13px; color: #2C3E50; background: transparent; border: none; border-radius: 8px; cursor: pointer; text-align: left; transition: all 0.2s; letter-spacing: 1px;";

    if (!isMe) {
        // 🤖 如果是 AI 的气泡，显示【重回】和【编辑剧本】
        const regenBtn = document.createElement('button');
        regenBtn.innerText = '↺ 重新生成 (重回)';
        regenBtn.style.cssText = btnStyle;
        regenBtn.onmouseover = () => regenBtn.style.background = '#F8F9FA';
        regenBtn.onmouseout = () => regenBtn.style.background = 'transparent';
        regenBtn.onclick = () => {
            menu.remove();
            regenerateLastAiReply();
        };

        const editBtn = document.createElement('button');
        editBtn.innerText = '✎ 剧本微调 (编辑)';
        editBtn.style.cssText = btnStyle;
        editBtn.onmouseover = () => editBtn.style.background = '#F8F9FA';
        editBtn.onmouseout = () => editBtn.style.background = 'transparent';
        editBtn.onclick = () => {
            menu.remove();
            openOfflineEditModal();
        };

        menu.appendChild(regenBtn);
        menu.appendChild(editBtn);
    } else {
        // 🙋‍♂️ 如果是“我”的气泡，只显示【修改我的发言】
        const editMeBtn = document.createElement('button');
        editMeBtn.innerText = '✎ 修改我的发言';
        editMeBtn.style.cssText = btnStyle;
        editMeBtn.onmouseover = () => editMeBtn.style.background = '#F8F9FA';
        editMeBtn.onmouseout = () => editMeBtn.style.background = 'transparent';
        editMeBtn.onclick = () => {
            menu.remove();
            openOfflineUserEditModal(bubble);
        };
        menu.appendChild(editMeBtn);
    }

    // 🗑️ 🌟 所有人通用的单点物理消除按钮
    const deleteBtn = document.createElement('button');
    deleteBtn.innerText = '🗑️ 物理消除 (删除)';
    deleteBtn.style.cssText = btnStyle + "color: #E74C3C;"; 
    deleteBtn.onmouseover = () => deleteBtn.style.background = '#FDEDEC';
    deleteBtn.onmouseout = () => deleteBtn.style.background = 'transparent';
    deleteBtn.onclick = () => {
        // 1. 关掉菜单
        menu.remove();
        // 2. 直接从屏幕上抹除这个气泡
        bubble.remove();
        // 3. 立刻触发秒存，确保刷新也不会再出现
        if (typeof saveOfflineHistoryToDB === 'function') {
            saveOfflineHistoryToDB();
        }
    };
    
    // 把删除按钮挂在菜单的最下面
    menu.appendChild(deleteBtn);

    document.body.appendChild(menu);

    setTimeout(() => {
        document.addEventListener('click', function closeMenu(evt) {
            if (!menu.contains(evt.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        });
    }, 10);
}

// 🧹 清理 AI 最新回复
function clearLastAiMessagesFromDOM() {
    const chatArea = document.getElementById('offlineChatArea');
    if (!chatArea) return;

    while (chatArea.lastElementChild) {
        const lastNode = chatArea.lastElementChild;
        if (lastNode.getAttribute('data-sender') === 'me') break;
        chatArea.removeChild(lastNode);
    }
}

// ↺ 重回
function regenerateLastAiReply() {
    if (!window.lastMyOfflineInput) {
        alert("没有找到你上一次发送的内容，无法重回哦。");
        return;
    }
    clearLastAiMessagesFromDOM();
    const warningInject = "\\n【系统最高指令警告：你上一次的回复格式有误！本次重新生成，请务必严格遵守格式：第一句必须是【时间：xxx | 地点：xxx | 天气：xxx】开头，后面必须按照“【旁白】在最前”的格式循环排版！】\\n";
    receiveOfflineAIReply(warningInject + window.lastMyOfflineInput);
}

// ✎ 编辑 AI 剧本
function openOfflineEditModal() {
    if (!window.lastAiRawText) {
        alert("没有找到 AI 上一次生成的原始剧本哦。");
        return;
    }
    createAndShowModal('修 改 剧 本', window.lastAiRawText, (newText) => {
        window.lastAiRawText = newText;
        clearLastAiMessagesFromDOM();
        processOfflineResponse(newText);
    });
}

// 🙋‍♂️ ✎ 编辑“我”的发言
function openOfflineUserEditModal(bubble) {
    // 智能提取你要修改的纯文本
    let textNode = bubble;
    if (bubble.classList.contains('dialogue-section')) {
        textNode = bubble.querySelector('.dialogue-content');
    }
    const currentText = textNode.innerText;

    // 呼出弹窗
    createAndShowModal('修改我的发言', currentText, (newText) => {
        // 直接原地替换文字
        textNode.innerText = newText;
        // 替换后立刻保存记忆到数据库，防止刷新丢失
        if (typeof saveOfflineHistoryToDB === 'function') {
            saveOfflineHistoryToDB();
        }
    });
}

// 🎨 抽离出来的通用高级弹窗生成器
function createAndShowModal(titleText, defaultText, onSaveCallback) {
    const overlay = document.createElement('div');
    overlay.id = 'offlineEditOverlay';
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.4); backdrop-filter: blur(5px);
        display: flex; align-items: center; justify-content: center; z-index: 100000;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
        background: #FFFFFF; width: 85%; max-width: 400px; border-radius: 16px;
        padding: 24px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
        display: flex; flex-direction: column; gap: 16px; border: 1px solid #EAEAEA;
    `;

    const title = document.createElement('div');
    title.innerText = titleText;
    title.style.cssText = 'font-size: 14px; font-weight: 600; color: #2C3E50; text-align: center; letter-spacing: 4px;';

    const textarea = document.createElement('textarea');
    textarea.value = defaultText;
    textarea.style.cssText = `
        width: 100%; height: 280px; padding: 16px; border-radius: 12px;
        border: 1px solid #EAECEE; background: #FAFAFA; color: #5D6D7E; font-size: 14px;
        line-height: 1.8; resize: none; outline: none; font-family: inherit;
        box-sizing: border-box; transition: all 0.3s;
    `;
    textarea.onfocus = () => textarea.style.borderColor = '#2C3E50';
    textarea.onblur = () => textarea.style.borderColor = '#EAECEE';

    const btnGroup = document.createElement('div');
    btnGroup.style.cssText = 'display: flex; gap: 12px; justify-content: flex-end; margin-top: 10px;';

    const cancelBtn = document.createElement('button');
    cancelBtn.innerText = '放弃';
    cancelBtn.style.cssText = 'padding: 10px 24px; border-radius: 24px; border: 1px solid #EAEAEA; background: transparent; color: #999; cursor: pointer; font-size: 13px; transition: all 0.2s;';
    cancelBtn.onmouseover = () => cancelBtn.style.background = '#FAFAFA';
    cancelBtn.onmouseout = () => cancelBtn.style.background = 'transparent';
    cancelBtn.onclick = () => overlay.remove();

    const saveBtn = document.createElement('button');
    saveBtn.innerText = '确认修改';
    saveBtn.style.cssText = 'padding: 10px 24px; border-radius: 24px; border: none; background: #2C3E50; color: #fff; cursor: pointer; font-weight: 500; font-size: 13px; box-shadow: 0 4px 10px rgba(44,62,80,0.2); transition: all 0.2s;';
    saveBtn.onmouseover = () => saveBtn.style.transform = 'translateY(-1px)';
    saveBtn.onmouseout = () => saveBtn.style.transform = 'translateY(0)';
    saveBtn.onclick = () => {
        const newText = textarea.value.trim();
        if(!newText) return;
        overlay.remove();
        onSaveCallback(newText);
    };

    btnGroup.appendChild(cancelBtn);
    btnGroup.appendChild(saveBtn);
    modal.appendChild(title);
    modal.appendChild(textarea);
    modal.appendChild(btnGroup);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
}

// ========== 【线下模式结束】 ==========