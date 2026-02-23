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
        const btn = document.createElement('div'); // 用 div 包裹方便布局
        btn.className = 'ins-cat-pill';
        btn.style.cssText = 'flex-shrink: 0; position: relative; padding-right: 25px; border: 1px solid #e0e0e0; background: #fff; cursor: pointer;';
        
        // 预设名
        const span = document.createElement('span');
        span.textContent = preset.name;
        span.onclick = () => applyBubblePreset(index);
        
        // 删除按钮 (小叉号)
        const delBtn = document.createElement('span');
        delBtn.innerHTML = '×';
        delBtn.style.cssText = 'position: absolute; right: 8px; top: 50%; transform: translateY(-50%); color: #ccc; font-weight: bold; font-size: 14px;';
        delBtn.onclick = (e) => {
            e.stopPropagation(); // 防止触发应用
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
            updateBubblePreview();
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
            user: userCss
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

    // 5. 重置贴纸图层 (防止左边的贴纸显示在右边的编辑器里)
    activeStickerLayers = [];
    renderLayerList();
    document.getElementById('stickerEditorControls').style.display = 'none';
}



// ===========================================
// ★★★ 可视化气泡制作器逻辑 (支持外部贴纸版) ★★★
// ===========================================

let activeStickerLayers = []; 
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
                bubbleStyle: currentData.bubbleStyle || null
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
function checkAndPlayVoice(text) {
    const voiceEnabled = document.getElementById('voiceEnabled')?.checked || false;
    
    if (!voiceEnabled) {
        // 未勾选：什么都不做，让 toggleVoiceState 自己展开文字
        return;
    }
    
    // 已勾选：调用minimax播放语音
    playVoiceMessage(text);
}



async function playVoiceMessage(text) {
    if (!voiceConfig.enabled || !voiceConfig.apiKey || !voiceConfig.groupId) {
        alert('请先启用并配置角色语音');
        return;
    }
    
    console.log('开始调用MiniMax TTS API...');
    
    const voiceId = voiceConfig.voiceCharacterId || 'female-tianmei';
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
            throw new Error(`API错误 ${response.status}`);
        }
        
        const blob = await response.blob();
        console.log('音频大小:', blob.size, 'bytes');
        
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        audio.volume = 1.0;
        
        await audio.play();
        console.log('✅ 语音播放成功');
        
        audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
        };
        
    } catch (error) {
        console.error('完整错误信息:', error);
        alert('语音播放失败：\n' + error.message);
    }
}

// 开关切换事件
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
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
            console.log('提示音未启用');
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
    model: "dall-e-3"
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

// 4. 保存绘图配置 (供外部调用)
function saveImageApiConfig() {
    const checkbox = document.getElementById('imageApiEnabled');
    // 如果页面上没有这个元素，说明可能没加载出来，不保存空值
    if (!checkbox) return;

    const enabled = checkbox.checked;
    const baseUrl = document.getElementById('imageApiBaseUrl').value.trim();
    const apiKey = document.getElementById('imageApiKey').value.trim();
    const model = document.getElementById('imageApiModel').value.trim();

    // 自动修正 URL
    let finalUrl = baseUrl;
    if (finalUrl && finalUrl.endsWith('/')) finalUrl = finalUrl.slice(0, -1);

    const newConfig = {
        enabled: enabled,
        baseUrl: finalUrl,
        apiKey: apiKey,
        model: model
    };

    currentImageApiConfig = newConfig;
    saveToDB('imageApiSettings', newConfig);
    console.log('🎨 绘图配置已保存:', newConfig);
}

// ============ 🎨 AI 生图核心逻辑 (异步处理) ============

async function triggerAiImageGeneration(messageId, prompt) {
    console.log(`🎨 开始为消息 ${messageId} 生成图片，提示词: ${prompt}`);

  // 👇 新增：如果没有传入 prompt，从最新消息中提取
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

    // 1. 检查 Key
    if (!currentImageApiConfig.apiKey) {
        updateMessageToError(messageId, '❌ 绘图失败: 未配置 API Key');
        return;
    }

    try {
        // 2. AI生图提示词 Prompt 
        const enhancedPrompt = prompt;

        // 3. 构建 URL
        let url = currentImageApiConfig.baseUrl;
        if (!url.endsWith('/images/generations')) {
            url = url + '/images/generations';
        }

        // 4. 请求
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentImageApiConfig.apiKey}`
            },
            body: JSON.stringify({
                model: currentImageApiConfig.model,
                prompt: enhancedPrompt,
                n: 1,
                size: "1024x1024"
            })
        });

        const data = await response.json();

        if (!response.ok) {
            const errMsg = data.error ? data.error.message : '未知错误';
            updateMessageToError(messageId, `❌ 绘图失败: ${errMsg}`);
            return;
        }

        if (data.data && data.data.length > 0 && data.data[0].url) {
            updateMessageToImage(messageId, data.data[0].url);
        } else {
            updateMessageToError(messageId, '❌ 绘图失败: API 返回数据异常');
        }

    } catch (error) {
        updateMessageToError(messageId, `❌ 网络错误: ${error.message}`);
    }
}

// 辅助：更新为图片
function updateMessageToImage(msgId, url) {
    const msg = allMessages.find(m => m.id === msgId);
    if (msg) {
        // 👇 保存原始提示词，方便后续回溯
        const originalPrompt = msg.content; // 保存loading时的提示词
        
        msg.type = 'image';
        msg.content = url;
        msg.role = 'assistant';
        msg.aiPrompt = originalPrompt; // 👈 新增：存储提示词
        
        saveMessages();
        renderMessages();
        scrollToBottom();
    }
}

// 辅助：更新为错误 (方案 A)
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

// 打开聊天显示设置弹窗
function openAvatarDisplaySettings() {
    if (!currentChatId) {
        console.error('未找到当前聊天ID');
        return;
    }
    
    loadFromDB('characterInfo', (data) => {
        const allCharData = data || {};
        const charData = allCharData[currentChatId] || {};
        
        // 读取设置（默认值：不显示头像）
        const settings = charData.avatarDisplaySettings || {
            enabled: false,
            shape: 'circle',
            size: 40
        };
        
        // 填充表单
        document.getElementById('avatarDisplayEnabled').checked = settings.enabled;
        document.getElementById('avatarDisplayShape').value = settings.shape;
        document.getElementById('avatarDisplaySize').value = settings.size;
        document.getElementById('avatarSizeDisplay').textContent = settings.size + 'px';
        
        // 控制形状和大小选项的显示
        const shapeGroup = document.getElementById('avatarShapeGroup');
        const sizeGroup = document.getElementById('avatarSizeGroup');
        if (shapeGroup) shapeGroup.style.display = settings.enabled ? 'block' : 'none';
        if (sizeGroup) sizeGroup.style.display = settings.enabled ? 'block' : 'none';
        
        // 更新预览
        updateAvatarPreview();
        
        // 显示弹窗
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
    const frameGroup = document.getElementById('avatarFrameGroup'); // ← 新增
    
    if (shapeGroup) shapeGroup.style.display = enabled ? 'block' : 'none';
    if (sizeGroup) sizeGroup.style.display = enabled ? 'block' : 'none';
    if (frameGroup) frameGroup.style.display = enabled ? 'block' : 'none'; // ← 新增
    
    // 获取预览头像元素
    const aiAvatar = document.getElementById('previewAiAvatar');
    const userAvatar = document.getElementById('previewUserAvatar');
    
    if (!aiAvatar || !userAvatar) return;
    
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
        
        // ========== 新增：添加头像框 START ==========
        if (typeof avatarFrameData !== 'undefined' && avatarFrameData.enabled) {
            if (avatarFrameData.character) {
                aiAvatar.style.backgroundImage = `url(${avatarFrameData.character})`;
                aiAvatar.style.backgroundSize = 'cover';
                aiAvatar.style.backgroundPosition = 'center';
            } else {
                aiAvatar.style.backgroundImage = 'none';
            }
            
            if (avatarFrameData.user) {
                userAvatar.style.backgroundImage = `url(${avatarFrameData.user})`;
                userAvatar.style.backgroundSize = 'cover';
                userAvatar.style.backgroundPosition = 'center';
            } else {
                userAvatar.style.backgroundImage = 'none';
            }
        } else {
            aiAvatar.style.backgroundImage = 'none';
            userAvatar.style.backgroundImage = 'none';
        }
        // ========== 新增：添加头像框 END ==========
        
        // 加载实际头像
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

// 添加头像框
function addAvatarFrame() {
    const frameCount = avatarFrameData.frames.length;
    
    if (frameCount < 2) {
        // 前两个直接上传
        document.getElementById('avatarFrameFileInput').click();
    } else {
        // 第三个及以上打开分配弹窗
        openFrameAssignModal();
    }
}

// 处理头像框上传
function handleFrameUpload(input) {
    if (!input.files || !input.files[0]) return;
    
    const file = input.files[0];
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const frameData = e.target.result;
        avatarFrameData.frames.push(frameData);
        
        const frameCount = avatarFrameData.frames.length;
        
        if (frameCount === 1) {
            // 第一个默认给角色
            avatarFrameData.character = frameData;
            showFramePreview(1, frameData);
        } else if (frameCount === 2) {
            // 第二个默认给用户
            avatarFrameData.user = frameData;
            showFramePreview(2, frameData);
            // 隐藏添加按钮
            document.getElementById('addFrameBtn').style.display = 'none';
        }
        
        updateAvatarPreview();
        input.value = ''; // 清空input
    };
    
    reader.readAsDataURL(file);
}

// 显示头像框预览
function showFramePreview(index, dataUrl) {
    const preview = document.getElementById(`framePreview${index}`);
    const img = document.getElementById(`framePreviewImg${index}`);
    
    if (preview && img) {
        img.src = dataUrl;
        preview.style.display = 'block';
    }
}

// 移除头像框
function removeFrame(index) {
    if (index === 1) {
        avatarFrameData.character = null;
        document.getElementById('framePreview1').style.display = 'none';
        // 如果有第二个，移到第一个位置
        if (avatarFrameData.user) {
            avatarFrameData.character = avatarFrameData.user;
            avatarFrameData.user = null;
            showFramePreview(1, avatarFrameData.character);
            document.getElementById('framePreview2').style.display = 'none';
            document.getElementById('addFrameBtn').style.display = 'flex';
        }
    } else if (index === 2) {
        avatarFrameData.user = null;
        document.getElementById('framePreview2').style.display = 'none';
        document.getElementById('addFrameBtn').style.display = 'flex';
    }
    
    // 更新frames数组
    avatarFrameData.frames = [avatarFrameData.character, avatarFrameData.user].filter(f => f);
    updateAvatarPreview();
}

// 打开头像框分配弹窗
function openFrameAssignModal() {
    // 先上传新头像框
    const input = document.getElementById('avatarFrameFileInput');
    input.click();
    
    input.onchange = function() {
        if (!input.files || !input.files[0]) return;
        
        const file = input.files[0];
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const newFrame = e.target.result;
            avatarFrameData.frames.push(newFrame);
            
            // 显示分配弹窗
            document.getElementById('avatarFrameAssignModal').style.display = 'flex';
            renderFrameAssignLists();
        };
        
        reader.readAsDataURL(file);
    };
}

// 渲染分配列表
function renderFrameAssignLists() {
    const charList = document.getElementById('characterFrameList');
    const userList = document.getElementById('userFrameList');
    
    charList.innerHTML = '';
    userList.innerHTML = '';
    
    avatarFrameData.frames.forEach((frame, index) => {
        // 角色列表
        const charItem = document.createElement('label');
        charItem.style.cssText = 'display: flex; align-items: center; gap: 10px; padding: 8px; cursor: pointer; border-radius: 6px;';
        charItem.innerHTML = `
            <input type="radio" name="charFrame" value="${index}" ${avatarFrameData.character === frame ? 'checked' : ''}>
            <img src="${frame}" style="width: 40px; height: 40px; border-radius: 6px; object-fit: cover;">
        `;
        charList.appendChild(charItem);
        
        // 用户列表
        const userItem = document.createElement('label');
        userItem.style.cssText = 'display: flex; align-items: center; gap: 10px; padding: 8px; cursor: pointer; border-radius: 6px;';
        userItem.innerHTML = `
            <input type="radio" name="userFrame" value="${index}" ${avatarFrameData.user === frame ? 'checked' : ''}>
            <img src="${frame}" style="width: 40px; height: 40px; border-radius: 6px; object-fit: cover;">
        `;
        userList.appendChild(userItem);
    });
}

// 保存头像框分配
function saveFrameAssignment() {
    const charRadio = document.querySelector('input[name="charFrame"]:checked');
    const userRadio = document.querySelector('input[name="userFrame"]:checked');
    
    if (charRadio) {
        avatarFrameData.character = avatarFrameData.frames[parseInt(charRadio.value)];
        showFramePreview(1, avatarFrameData.character);
    }
    
    if (userRadio) {
        avatarFrameData.user = avatarFrameData.frames[parseInt(userRadio.value)];
        showFramePreview(2, avatarFrameData.user);
        document.getElementById('addFrameBtn').style.display = 'none';
    }
    
    closeFrameAssignModal();
    updateAvatarPreview();
}

// 关闭分配弹窗
function closeFrameAssignModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('avatarFrameAssignModal').style.display = 'none';
}



// ========== 头像框功能 END ==========