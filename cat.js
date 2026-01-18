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
// ★★★ 字体设置功能实现 ★★★
// ===========================================

// 打开字体设置弹窗
function openFontSettings() {
    loadFromDB('userInfo', (data) => {
        const settings = data || {};
        
        // 1. 填充 URL
        document.getElementById('fontUrlInput').value = settings.customFontUrl || '';
        
        // 2. 填充大小
        const size = settings.customFontSize || 14;
        document.getElementById('fontSizeInput').value = size;
        document.getElementById('fontSizeDisplay').textContent = size + 'px';
        
        // 3. 加载预设列表
        renderFontPresets(settings.fontPresets || []);
        
        document.getElementById('fontSettingsModal').style.display = 'flex';
    });
}

// 关闭弹窗
function closeFontSettingsModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('fontSettingsModal').style.display = 'none';
}

// 实时预览字体大小
function previewFontSize(val) {
    document.getElementById('fontSizeDisplay').textContent = val + 'px';
    // 实时预览效果（暂不保存）
    document.documentElement.style.setProperty('--app-font-size', val + 'px');
}

// 应用字体逻辑（核心）
function applyFontLogic(url, size) {
    // 1. 应用大小
    if (size) {
        document.documentElement.style.setProperty('--app-font-size', size + 'px');
    }
    
    // 2. 应用字体 URL
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
        // 设置变量
        document.documentElement.style.setProperty('--app-font-family', "'UserCustomFont', sans-serif");
    } else {
        // 如果 URL 为空，移除样式并恢复默认
        if (styleTag) styleTag.remove();
        document.documentElement.style.setProperty('--app-font-family', "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif");
    }
}

function saveFontSettings() {
    const fontUrl = document.getElementById('fontUrlInput').value.trim();
    const fontSize = document.getElementById('fontSizeInput').value;
    
    const fontSettings = {
        fontUrl: fontUrl,
        fontSize: parseInt(fontSize) || 14
    };
    
    // 保存到数据库
    saveToDB('fontSettings', fontSettings);
    
    // 立即应用字体
    if (fontUrl) {
        const style = document.createElement('style');
        style.textContent = `
            @font-face {
                font-family: 'CustomFont';
                src: url('${fontUrl}') format('woff2');
            }
            body, * {
                font-family: 'CustomFont', sans-serif !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    if (fontSize) {
        document.documentElement.style.fontSize = fontSize + 'px';
    }
    
    alert('字体设置已保存');
    closeFontSettingsModal();
}


function loadFontSettings() {
    loadFromDB('fontSettings', (data) => {
        if (data) {
            // 应用字体
            if (data.fontUrl) {
                const style = document.createElement('style');
                style.textContent = `
                    @font-face {
                        font-family: 'CustomFont';
                        src: url('${data.fontUrl}') format('woff2');
                    }
                    body, * {
                        font-family: 'CustomFont', sans-serif !important;
                    }
                `;
                document.head.appendChild(style);
            }
            
            // 应用字体大小
            if (data.fontSize) {
                document.documentElement.style.fontSize = data.fontSize + 'px';
            }
        }
    });
}


// ============ 预设管理系统 ============

// 渲染预设列表
function renderFontPresets(presets) {
    const select = document.getElementById('fontPresetSelect');
    // 保留第一个默认选项
    select.innerHTML = '<option value="">选择预设...</option>';
    
    presets.forEach((preset, index) => {
        const option = document.createElement('option');
        option.value = index; // 使用索引作为值
        option.textContent = preset.name;
        // 把数据存到 dataset 里方便读取
        option.dataset.url = preset.url;
        option.dataset.size = preset.size;
        select.appendChild(option);
    });
}

// 选中预设时应用到输入框
function applyFontPreset() {
    const select = document.getElementById('fontPresetSelect');
    const selectedOption = select.options[select.selectedIndex];
    
    if (selectedOption.value === "") return;
    
    const url = selectedOption.dataset.url;
    const size = selectedOption.dataset.size;
    
    document.getElementById('fontUrlInput').value = url;
    document.getElementById('fontSizeInput').value = size;
    document.getElementById('fontSizeDisplay').textContent = size + 'px';
    
    // 可选：立即预览
    // previewFontSize(size); 
}

// 保存当前配置为预设
function saveCurrentAsPreset() {
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
        
        // 添加新预设
        newData.fontPresets.push({
            name: name,
            url: url,
            size: size
        });
        
        saveToDB('userInfo', newData);
        renderFontPresets(newData.fontPresets);
        // 自动选中刚添加的
        document.getElementById('fontPresetSelect').value = newData.fontPresets.length - 1;
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
        
        // 删除指定索引
        newData.fontPresets.splice(index, 1);
        
        saveToDB('userInfo', newData);
        renderFontPresets(newData.fontPresets);
        
        // 清空输入框
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
    addBtn.onclick = saveCurrentAsPreset;
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

// 4. 保存当前为新预设
function saveCurrentAsPreset() {
    const name = prompt('给这个样式起个名字：', '我的新样式');
    if (!name) return;
    
    const aiCss = document.getElementById('aiBubbleCssInput').value;
    const userCss = document.getElementById('userBubbleCssInput').value;
    
    loadFromDB('userInfo', (data) => {
        const newData = data || {};
        if (!newData.bubblePresets) newData.bubblePresets = [...OFFICIAL_PRESETS]; // 确保有初始数据
        
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
        .message-item:not(.me) .message-bubble { ${aiCss} }
        .message-item.me .message-bubble { ${userCss} }
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

// 8. ★★★ 核心：生成 CSS (支持外部贴纸的 Breakout 模式) ★★★
function generateBubbleCSS() {
    const activeTabBtn = document.querySelector('#bubbleBeautifyScreen .ins-tab-btn.active');
    if (!activeTabBtn) return; // 防止页面没加载完报错

    const targetType = activeTabBtn.innerText.includes('左侧') ? 'ai' : 'user';
    const targetInputId = targetType === 'ai' ? 'aiBubbleCssInput' : 'userBubbleCssInput';
    const selector = targetType === 'ai' ? '.message-item:not(.me) .message-bubble' : '.message-item.me .message-bubble';
    
    // 获取颜色和圆角
    const bgColor = document.getElementById('creatorBgColor').value;
    const textColor = document.getElementById('creatorTextColor').value;
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
    
    // 2. 贴纸逻辑
    const validLayers = activeStickerLayers.filter(l => l.url && l.url.trim() !== '');
    
    if (validLayers.length > 0) {
        css += `}\n\n/* 贴纸层 */\n${selector}::after {\n`;
        css += `content: '';\n`;
        css += `position: absolute;\n`;
        css += `top: -50px; left: -50px; right: -50px; bottom: -50px;\n`; 
        css += `pointer-events: none;\n`; 
        
        let bgImages = [];
        let bgPositions = [];
        let bgSizes = [];
        let bgRepeats = [];
        
        validLayers.forEach(l => {
            bgImages.push(`url('${l.url}')`);
            bgSizes.push(`${l.size}px`);
            bgRepeats.push('no-repeat');
            
            const offsetBase = 50; 
            let posX = l.anchor.includes('left') ? `left ${offsetBase + parseInt(l.x)}px` : `right ${offsetBase - parseInt(l.x)}px`;
            let posY = l.anchor.includes('top') ? `top ${offsetBase + parseInt(l.y)}px` : `bottom ${offsetBase - parseInt(l.y)}px`;
            
            bgPositions.push(`${posX} ${posY}`);
        });
        
        css += `background-image: ${bgImages.join(', ')};\n`;
        css += `background-position: ${bgPositions.join(', ')};\n`;
        css += `background-size: ${bgSizes.join(', ')};\n`;
        css += `background-repeat: ${bgRepeats.join(', ')};\n`;
    }
    
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

    // 3. 同步背景色
    const bgMatch = css.match(/background(?:-color)?:\s*(#[0-9a-fA-F]{6})/);
    if (bgMatch) {
        const el = document.getElementById('creatorBgColor');
        if (el) el.value = bgMatch[1];
    }

    // 4. 同步文字色
    const textMatch = css.match(/[\s;]color:\s*(#[0-9a-fA-F]{6})/);
    if (textMatch) {
        const el = document.getElementById('creatorTextColor');
        if (el) el.value = textMatch[1];
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

async function playVoiceMessage(text) {
    if (!voiceConfig.enabled || !voiceConfig.apiKey || !voiceConfig.groupId) {
        alert('请先启用并配置角色语音');
        return;
    }
    
    console.log('开始调用MiniMax TTS API...');
    
    try {
        const voiceId = voiceConfig.voiceCharacterId || 'female-tianmei';
        
        const response = await fetch('https://api.minimaxi.com/v1/t2a_v2', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${voiceConfig.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'speech-2.6-hd',
                text: text,
                stream: false,
                output_format: 'url',
                voice_setting: {
                    voice_id: voiceId,
                    speed: 1,
                    vol: 1,
                    pitch: 0,
                    emotion: 'calm'
                },
                audio_setting: {
                    sample_rate: 32000,
                    bitrate: 128000,
                    format: 'mp3',
                    channel: 1
                }
            })
        });
        
        console.log('API响应状态:', response.status);
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('API错误:', errorData);
            throw new Error(`API错误 ${response.status}`);
        }
        
        const data = await response.json();
        console.log('API返回成功');
        
        if (data.data && data.data.audio) {
            const audio = new Audio(data.data.audio);
            audio.play();
            console.log('语音播放成功');
        } else {
            throw new Error('未获取到音频数据');
        }
        
    } catch (error) {
        console.error('完整错误信息:', error);
        alert('语音播放失败：' + error.message);
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


