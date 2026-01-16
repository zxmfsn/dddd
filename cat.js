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


function openBeautifySettings() {
    document.getElementById('otherSettingsScreen').style.display = 'none';
    document.getElementById('beautifyScreen').style.display = 'flex';
    document.getElementById('beautifyMenuPanel').style.display = 'flex';
    document.getElementById('beautifyEditorPanel').style.display = 'none'; // 确保编辑器隐藏
    
    // 加载当前设置到菜单控件
    loadFromDB('userInfo', (data) => {
        const theme = (data && data.theme) ? data.theme : {};
        
        // 透明度开关
        const transCheckbox = document.getElementById('headerTransCheckboxMenu');
        if (transCheckbox) transCheckbox.checked = theme.isHeaderTransparent || false;
        
 // 导航栏字体颜色回显
        const headerTextColorInput = document.getElementById('headerTextColorInput');
        if (headerTextColorInput) headerTextColorInput.value = theme.headerTextColor || '#000000';

 // 底部透明度开关回显
        const bottomTransCheckbox = document.getElementById('bottomTransCheckboxMenu');
        if (bottomTransCheckbox) bottomTransCheckbox.checked = theme.isBottomTransparent || false;

         // 底部图标大小回显
        const bottomIconSizeSlider = document.getElementById('bottomIconSizeSlider');
        const bottomIconSizeDisplay = document.getElementById('bottomIconSizeDisplay');
        const currentIconSize = theme.bottomIconSize || 24; // 默认24px
        if (bottomIconSizeSlider) bottomIconSizeSlider.value = currentIconSize;
        if (bottomIconSizeDisplay) bottomIconSizeDisplay.textContent = currentIconSize + 'px';

        // 气泡颜色
        const leftColor = document.getElementById('bubbleLeftColorMenu');
        const rightColor = document.getElementById('bubbleRightColorMenu');
        if (leftColor) leftColor.value = theme.bubbleLeft || '#ffffff';
        if (rightColor) rightColor.value = theme.bubbleRight || '#95ec69';
        
        // 加载预设列表
        renderThemePresets(data.themePresets || []);
    });
}


function closeBeautifySettings() {
    document.getElementById('beautifyScreen').style.display = 'none';
    document.getElementById('otherSettingsScreen').style.display = 'flex';
}


// 5. 角色语音
function openVoiceRoleSettings() {
    alert('角色语音设置\n在此处管理 TTS 语音模型和发音人。');
}

// 6. 消息提示音
function openNotificationSoundSettings() {
    alert('提示音设置\n在此处更改收到消息时的“叮”声。');
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

// 保存所有设置
function saveFontSettings() {
    const url = document.getElementById('fontUrlInput').value.trim();
    const size = document.getElementById('fontSizeInput').value;
    
    loadFromDB('userInfo', (data) => {
        const newData = data || {};
        
        // 更新数据
        newData.customFontUrl = url;
        newData.customFontSize = size;
        
        // 保存到数据库
        saveToDB('userInfo', newData);
        
        // 应用效果
        applyFontLogic(url, size);
        
        closeFontSettingsModal();
        // alert('字体设置已保存'); // 保持静默流畅
    });
}

// 开机加载字体
function loadFontSettings() {
    loadFromDB('userInfo', (data) => {
        if (data) {
            applyFontLogic(data.customFontUrl, data.customFontSize || 14);
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
// ★★★ 全局美化设置功能 ★★★
// ===========================================

let currentEditingThemePart = null;

// 处理编辑点击
function editTheme(part) {
    currentEditingThemePart = part;
    
    // 触发文件选择
    const fileInput = document.getElementById('themeFileInput');
    fileInput.value = ''; // 清空上次选择
    fileInput.click();
}

// 监听文件选择
document.getElementById('themeFileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        const imageData = event.target.result;
        applyAndSaveTheme(currentEditingThemePart, imageData);
    };
    reader.readAsDataURL(file);
});

// 应用并保存主题
function applyAndSaveTheme(part, value) {
    loadFromDB('userInfo', (data) => {
        const newData = data || {};
        if (!newData.theme) newData.theme = {};
        
        // 1. 更新数据
        newData.theme[part] = value;
        
        // 2. 保存数据库
        saveToDB('userInfo', newData);
        
        // 3. 立即应用视觉效果
        applyThemeStyles(newData.theme);
    });
}

// 切换导航栏透明度 (修复版)
function toggleHeaderTransparency() {
    // ★ 修复：获取新的 ID 'headerTransCheckboxMenu'
    const checkbox = document.getElementById('headerTransCheckboxMenu');
    
    // 安全检查：如果找不到元素，直接返回，防止报错
    if (!checkbox) return;
    
    const isTransparent = checkbox.checked;
    
    loadFromDB('userInfo', (data) => {
        const newData = data || {};
        if (!newData.theme) newData.theme = {};
        
        newData.theme.isHeaderTransparent = isTransparent;
        
        saveToDB('userInfo', newData);
        applyThemeStyles(newData.theme);
    });
}

// 更新导航栏字体颜色 (仅文字)
function updateHeaderTextColor(color) {
    loadFromDB('userInfo', (data) => {
        const newData = data || {};
        if (!newData.theme) newData.theme = {};
        
        newData.theme.headerTextColor = color;
        
        saveToDB('userInfo', newData);
        applyThemeStyles(newData.theme);
    });
}

//切换底部导航栏透明度
function toggleBottomBarTransparency() {
    const checkbox = document.getElementById('bottomTransCheckboxMenu');
    if (!checkbox) return;
    
    const isTransparent = checkbox.checked;
    
    loadFromDB('userInfo', (data) => {
        const newData = data || {};
        if (!newData.theme) newData.theme = {};
        
        newData.theme.isBottomTransparent = isTransparent;
        
        saveToDB('userInfo', newData);
        applyThemeStyles(newData.theme);
    });
}


// 更新底部图标大小 (修复版：实时生效)
function updateBottomIconSize(val) {
    // 1. 实时更新显示的数值
    const display = document.getElementById('bottomIconSizeDisplay');
    if (display) display.textContent = val + 'px';
    
    // 2. 【关键修正】直接修改页面上的图标样式，不等待数据库
    // 选中底部导航栏里的所有 SVG 图标和自定义图片
    const icons = document.querySelectorAll('.chat-bottom-tabs .bottom-tab svg, .chat-bottom-tabs .bottom-tab img');
    
    icons.forEach(el => {
        // 使用 important 确保覆盖原有的 CSS 样式
        el.style.setProperty('width', val + 'px', 'important');
        el.style.setProperty('height', val + 'px', 'important');
    });
    
    // 3. 后台静默保存设置 (防止刷新后恢复原样)
    // 这里的回调不用管，因为上面已经修改了视觉效果
    loadFromDB('userInfo', (data) => {
        const newData = data || {};
        if (!newData.theme) newData.theme = {};
        newData.theme.bottomIconSize = val;
        saveToDB('userInfo', newData);
    });
}


// 核心：将配置应用到 CSS 变量
function applyThemeStyles(theme) {
    if (!theme) return;
    
    const root = document.documentElement;
    
    // 1. 全局背景
    if (theme.background) {
        // ★ 修复：确保这里也是 100% 100%
        // 注意：CSS变量里只存 url(...)，具体的 size 在 CSS 类里控制
        root.style.setProperty('--chat-bg', `url(${theme.background})`);
    }
    
    // 2. 顶部导航栏 (逻辑修复)
    if (theme.isHeaderTransparent) {
        // === 开启透明模式 ===
        root.style.setProperty('--header-bg', 'transparent');
        root.style.setProperty('--header-border', 'none');
    } else {
        // === 关闭透明模式 (正常模式) ===
        // 关键逻辑：如果有自定义图片，用图片；如果没有，强制白色！
        if (theme.header && theme.header.length > 20) {
             root.style.setProperty('--header-bg', `url(${theme.header})`);
        } else {
             // ★ 强制纯白，防止透出背景
             root.style.setProperty('--header-bg', '#ffffff');
        }
        root.style.setProperty('--header-border', '1px solid #f0f0f0');
    }
    
  // ▼▼▼ 添加下方代码 ▼▼▼
    // 导航栏字体颜色 (仅修改标题文字)
    if (theme.headerTextColor) {
        // 针对标题类名应用颜色
        document.querySelectorAll('.header-title, .chat-detail-title').forEach(el => {
            el.style.color = theme.headerTextColor;
        });
    } else {
        // 恢复默认 (移除内联样式)
        document.querySelectorAll('.header-title, .chat-detail-title').forEach(el => {
            el.style.color = '';
        });
    }
    // ▲▲▲ 添加结束 ▲▲▲

    // 3. 底部导航栏
    if (theme.isBottomTransparent) {
        // 开启透明：背景设为透明
        root.style.setProperty('--bottom-bg', 'transparent');
        // 如果有底部边框变量也可以在这里去除，目前主要处理背景
    } else {
        // 关闭透明 (保留原有逻辑)：有图显示图，没图显示白
        if (theme.bottomBar) {
            root.style.setProperty('--bottom-bg', `url(${theme.bottomBar})`);
        } else {
            root.style.setProperty('--bottom-bg', '#ffffff');
        }
    }
    

    // 底部图标大小
    const iconSize = theme.bottomIconSize || 24; // 默认24px
    // 强制设置所有底部图标的宽高 (包括原生SVG和自定义图片)
    document.querySelectorAll('.bottom-tab svg, .bottom-tab img.custom-icon').forEach(el => {
        el.style.width = iconSize + 'px';
        el.style.height = iconSize + 'px';
    });



    // 4. 更换图标
    updateIconDisplay('demoBackIcon', theme.backIcon, '.back-btn svg');
    updateIconDisplay('demoIconSingle', theme.iconSingle, '.bottom-tab[data-tab="single"] svg');
    updateIconDisplay('demoIconGroup', theme.iconGroup, '.bottom-tab[data-tab="group"] svg');
    updateIconDisplay('demoIconWallet', theme.iconWallet, '.bottom-tab[data-tab="wallet"] svg');
    
    // 5. 聊天详情页背景
    if (theme.chatBackground) {
        root.style.setProperty('--detail-bg', `url(${theme.chatBackground})`);
    }
    
    // 6. 聊天详情页头部
    if (theme.chatHeader) {
        root.style.setProperty('--detail-header-bg', `url(${theme.chatHeader})`);
    } else {
        root.style.setProperty('--detail-header-bg', '#f5f5f5'); // 详情页默认头部颜色
    }
    
    // 7. 输入栏背景
    if (theme.inputBar) {
        root.style.setProperty('--input-bar-bg', `url(${theme.inputBar})`);
    }
    
    // 8. 气泡颜色
    if (theme.bubbleLeft) root.style.setProperty('--bubble-left-bg', theme.bubbleLeft);
    if (theme.bubbleRight) root.style.setProperty('--bubble-right-bg', theme.bubbleRight);
    
    // 更新真实页面图标
    updateRealPageIcons(theme);
}


// ★★★ 修复版：更新预览图标 ★★★
function updateIconDisplay(previewId, imageUrl, realSelector) {
    // 1. 更新编辑页面的预览 (直接 innerHTML 覆盖，绝不重复)
    const previewEl = document.getElementById(previewId);
    if (previewEl) {
        if (imageUrl && imageUrl.length > 10) {
            // 有图：直接覆盖 HTML 为图片
            previewEl.innerHTML = `<img src="${imageUrl}" class="custom-icon" style="width: 100%; height: 100%; object-fit: contain; display: block;">`;
        } else {
            // 没图：这里比较麻烦，因为原始SVG被覆盖了。
            // 简单处理：如果用户清空了图片，刷新页面后才会恢复SVG。
            // 或者：保持当前状态，不操作 innerHTML (如果原本是SVG的话)
        }
    }
    
    // 2. 同步更新真实页面
    if (realSelector) {
        updateIconInRealPage(realSelector, imageUrl);
    }
}


// 专门处理真实页面的图标更新 (开机加载时用)
function updateRealPageIcons(theme) {
    if (theme.backIcon) updateIconInRealPage('.back-btn', theme.backIcon);
    if (theme.iconSingle) updateIconInRealPage('.bottom-tab[data-tab="single"]', theme.iconSingle);
    if (theme.iconGroup) updateIconInRealPage('.bottom-tab[data-tab="group"]', theme.iconGroup);
    if (theme.iconWallet) updateIconInRealPage('.bottom-tab[data-tab="wallet"]', theme.iconWallet);
}
// ★★★ 修复版：更新真实页面图标 (防重复逻辑) ★★★
function updateIconInRealPage(selector, imageUrl) {
    document.querySelectorAll(selector).forEach(container => {
        // 1. 先找到原生的 SVG
        const svg = container.querySelector('svg');
        
        // 2. 【关键】暴力删除所有已存在的自定义图片，防止重复堆叠
        const oldImages = container.querySelectorAll('img.custom-icon');
        oldImages.forEach(img => img.remove());
        
        if (imageUrl && imageUrl.length > 10) {
            // === 情况A：有新图片 ===
            // 隐藏 SVG
            if (svg) svg.style.display = 'none';
            
            // 创建新图片
            const img = document.createElement('img');
            img.className = 'custom-icon'; // 这个类名在CSS里有样式锁死大小
            img.src = imageUrl;
            container.appendChild(img);
        } else {
            // === 情况B：没有图片 (恢复默认) ===
            // 显示 SVG
            if (svg) svg.style.display = 'block';
        }
    });
}



// 开机加载
function loadThemeSettings() {
    loadFromDB('userInfo', (data) => {
        if (data && data.theme) {
            applyThemeStyles(data.theme);
        }
    });
}
// 手风琴切换
function toggleAccordion(id) {
    const content = document.getElementById(id);
    const arrow = document.getElementById('arrow-' + id);
    
    if (content.style.display === 'none') {
        content.style.display = 'block';
        arrow.textContent = '▼';
    } else {
        content.style.display = 'none';
        arrow.textContent = '▶';
    }
}
function editThemeColor(part, value) {
    applyAndSaveTheme(part, value);
}

// 切换美化设置的 Tab
function switchThemeTab(tab, btn) {
    // 1. 切换按钮样式
    document.querySelectorAll('.theme-tab-btn').forEach(b => b.classList.remove('active'));
    if(btn) btn.classList.add('active');
    
    // 2. 切换显示面板
    const listPanel = document.getElementById('themeListPanel');
    const chatPanel = document.getElementById('themeChatPanel');
    
    if (tab === 'list') {
        listPanel.style.display = 'flex';
        chatPanel.style.display = 'none';
        // 列表页使用全局背景变量，不需要额外处理，CSS变量会自动生效
    } else {
        listPanel.style.display = 'none';
        chatPanel.style.display = 'flex';
    }
}

// 恢复默认主题
function resetThemeToDefault() {
    if (!confirm('⚠️ 确定要恢复默认主题吗？\n\n这将清除所有自定义壁纸、图标和颜色设置。\n(聊天记录不会丢失)')) {
        return;
    }

    loadFromDB('userInfo', (data) => {
        const newData = data || {};
        
        // 删除 theme 字段
        delete newData.theme;
        
        // 保存并刷新
        saveToDB('userInfo', newData);
        
        alert('✨ 主题已恢复默认！');
        window.location.reload(); // 刷新页面以重置所有样式
    });
}
// 进入编辑模式
function openThemeEditor(mode) {
    document.getElementById('beautifyMenuPanel').style.display = 'none';
    document.getElementById('beautifyEditorPanel').style.display = 'block';
    
    const listPanel = document.getElementById('themeListPanel');
    const chatPanel = document.getElementById('themeChatPanel');
    const title = document.getElementById('editorTitle');
    
    if (mode === 'list') {
        listPanel.style.display = 'flex';
        chatPanel.style.display = 'none';
        title.textContent = '正在编辑：列表页';
    } else {
        listPanel.style.display = 'none';
        chatPanel.style.display = 'flex';
        title.textContent = '正在编辑：聊天页';
    }
}

// 退出编辑模式 (返回菜单)
function closeThemeEditor() {
    document.getElementById('beautifyEditorPanel').style.display = 'none';
    document.getElementById('beautifyMenuPanel').style.display = 'flex';
}
// ============ 主题预设管理 ============

// 渲染预设列表
function renderThemePresets(presets) {
    const select = document.getElementById('themePresetSelect');
    select.innerHTML = '<option value="">选择预设...</option>';
    
    presets.forEach((preset, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = preset.name;
        select.appendChild(option);
    });
}

// 保存当前主题为预设
function saveCurrentThemeAsPreset() {
    const name = prompt('给当前主题起个名字：');
    if (!name) return;
    
    loadFromDB('userInfo', (data) => {
        const newData = data || {};
        if (!newData.themePresets) newData.themePresets = [];
        
        // 保存当前的 theme 对象
        newData.themePresets.push({
            name: name,
            data: newData.theme || {} // 深度复制当前的 theme 配置
        });
        
        saveToDB('userInfo', newData);
        renderThemePresets(newData.themePresets);
        alert('预设保存成功！');
    });
}

// 应用预设
function applyThemePreset() {
    const select = document.getElementById('themePresetSelect');
    const index = select.value;
    if (index === "") return;
    
    loadFromDB('userInfo', (data) => {
        if (!data || !data.themePresets || !data.themePresets[index]) return;
        
        const preset = data.themePresets[index];
        
        if (confirm(`确定应用主题 "${preset.name}" 吗？`)) {
            // 覆盖当前 theme
            data.theme = preset.data;
            saveToDB('userInfo', data);
            
            // 立即应用效果
            applyThemeStyles(data.theme);
            
            // 刷新菜单上的控件状态
            document.getElementById('headerTransCheckboxMenu').checked = data.theme.isHeaderTransparent || false;
            document.getElementById('bubbleLeftColorMenu').value = data.theme.bubbleLeft || '#ffffff';
            document.getElementById('bubbleRightColorMenu').value = data.theme.bubbleRight || '#95ec69';
        }
    });
}

// 删除预设
function deleteThemePreset() {
    const select = document.getElementById('themePresetSelect');
    const index = select.value;
    if (index === "") {
        alert('请先选择要删除的预设');
        return;
    }
    
    if (!confirm('确定删除这个预设吗？')) return;
    
    loadFromDB('userInfo', (data) => {
        if (!data.themePresets) return;
        
        data.themePresets.splice(index, 1);
        saveToDB('userInfo', data);
        
        renderThemePresets(data.themePresets);
        select.value = "";
    });
}

// 打开气泡美化页面
function openBubbleEditor() {
    alert('气泡美化新页面准备中...');
    // 后续在这里写跳转逻辑
}

// 打开清除数据弹窗
function openClearDataModal() {
    document.getElementById('clearDataModal').style.display = 'flex';
}

// 关闭清除数据弹窗
function closeClearDataModal(event) {
    if (event && event.target.id !== 'clearDataModal') return;
    document.getElementById('clearDataModal').style.display = 'none';
}

// 确认清除所有数据
function confirmClearAllData() {
    localStorage.clear();
    sessionStorage.clear();
    location.reload();
}
