
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
     updateDiaryCount();
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
       const countEl = document.getElementById('charFollowers');
    if (countEl) {
        countEl.textContent = diaries.length;
    }
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
    const detailScreen = document.getElementById('diaryDetailScreen');
    detailScreen.style.display = 'flex';
    
    // ▼▼▼ 新增：隐藏原有的顶部导航栏，实现全屏沉浸 ▼▼▼
    const oldHeader = detailScreen.querySelector('.chat-detail-header');
    if (oldHeader) oldHeader.style.display = 'none';
    
    // ▼▼▼ 新增：去除内容容器的默认内边距，让背景铺满 ▼▼▼
    const contentContainer = document.getElementById('diaryDetailContent');
    if (contentContainer) {
        contentContainer.style.padding = '0';
        contentContainer.style.background = 'transparent'; // 确保背景透明，显示我们新加的噪点背景
    }
    
    // 渲染详情
    renderDiaryDetail(diary);
}


// 渲染日记详情
function renderDiaryDetail(diary) {
    const container = document.getElementById('diaryDetailContent');
    
    // 1. 日期处理
    const dateObj = new Date(diary.createTime);
    const dayStr = dateObj.getDate();
    const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const monthStr = monthNames[dateObj.getMonth()];
    const timeStr = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;

    // ★ 新增：清洗文本中的 Emoji，防止图标重复
    const removeEmojis = (str) => {
        if (!str) return '';
        return str.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2300}-\u{23FF}]/gu, '').trim();
    };

    // 2. 辅助函数：顶部 Header 的图标 (天气/心情) - ICONIN 风格
    const getInsIcon = (type, text) => {
        const t = text ? text.toString() : '';
        const s = `width: 20px; height: 20px; stroke: var(--text-color); stroke-width: 1.8; fill: none; stroke-linecap: round; stroke-linejoin: round; margin-right: 6px; vertical-align: middle; opacity: 0.8;`;
        
        if (type === 'weather') {
            if (t.includes('雨') || t.includes('雪')) return `<svg style="${s}" viewBox="0 0 24 24"><path d="M16 13v5M8 13v5M12 15v5M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"></path></svg>`;
            if (t.includes('晴') || t.includes('阳')) return `<svg style="${s}" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
            return `<svg style="${s}" viewBox="0 0 24 24"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path></svg>`;
        }
        if (type === 'mood') {
            if (t.includes('开心') || t.includes('棒') || t.includes('乐')) return `<svg style="${s}" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>`;
            if (t.includes('难过') || t.includes('累') || t.includes('哭')) return `<svg style="${s}" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><path d="M16 16s-1.5-2-4-2-4 2-4 2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>`;
            if (t.includes('爱') || t.includes('心')) return `<svg style="${s}" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`;
            return `<svg style="${s}" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>`;
        }
        return '';
    };

    // 3. 正文模块标题处理
    const getSectionMeta = (rawTitle) => {
        const cleanTitle = removeEmojis(rawTitle); // 复用去 Emoji 函数
        const svgStyle = `width: 18px; height: 18px; stroke: #a89f91; stroke-width: 1.8; fill: none; stroke-linecap: round; stroke-linejoin: round; margin-right: 8px; vertical-align: -3px;`;
        let iconSvg = '';

        if (cleanTitle.includes('OOTD') || cleanTitle.includes('穿搭')) iconSvg = `<svg style="${svgStyle}" viewBox="0 0 24 24"><path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"></path></svg>`;
        else if (cleanTitle.includes('备忘') || cleanTitle.includes('Todo') || cleanTitle.includes('计划')) iconSvg = `<svg style="${svgStyle}" viewBox="0 0 24 24"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><path d="M9 12h6"></path><path d="M9 16h6"></path></svg>`;
        else if (cleanTitle.includes('开心') || cleanTitle.includes('幸福') || cleanTitle.includes('乐')) iconSvg = `<svg style="${svgStyle}" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>`;
        else if (cleanTitle.includes('烦恼') || cleanTitle.includes('吐槽') || cleanTitle.includes('气')) iconSvg = `<svg style="${svgStyle}" viewBox="0 0 24 24"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path></svg>`;
        else if (cleanTitle.includes('恋爱') || cleanTitle.includes('喜欢') || cleanTitle.includes('心')) iconSvg = `<svg style="${svgStyle}" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`;
        else if (cleanTitle.includes('吃') || cleanTitle.includes('干饭') || cleanTitle.includes('美食')) iconSvg = `<svg style="${svgStyle}" viewBox="0 0 24 24"><path d="M5 12h14"></path><path d="M5 17h14"></path><path d="M6 8a6 6 0 0 1 12 0v4H6V8z"></path><path d="M6 21a3 3 0 0 1-3-3v-1h18v1a3 3 0 0 1-3 3H6z"></path></svg>`;
        else if (cleanTitle.includes('睡') || cleanTitle.includes('梦')) iconSvg = `<svg style="${svgStyle}" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
        else if (cleanTitle.includes('反思') || cleanTitle.includes('复盘')) iconSvg = `<svg style="${svgStyle}" viewBox="0 0 24 24"><path d="M9 18h6"></path><path d="M10 22h4"></path><path d="M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2.26C17.81 13.47 19 11.38 19 9a7 7 0 0 0-7-7z"></path></svg>`;
        else if (cleanTitle.includes('钱') || cleanTitle.includes('消费') || cleanTitle.includes('买')) iconSvg = `<svg style="${svgStyle}" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>`;
        else iconSvg = `<svg style="${svgStyle}" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`;

        return { icon: iconSvg, title: cleanTitle };
    };

    // 4. 准备内容 HTML
    let contentHtml = '';
    
    if (diary.sections && diary.sections.length > 0) {
        diary.sections.forEach(section => {
            const isOOTD = section.title && section.title.toUpperCase().includes('OOTD');
            const meta = getSectionMeta(section.title);
            
            contentHtml += `
                <div class="diary-section">
                    <div class="sub-title" style="margin-bottom: 10px; display:flex; align-items:center; border:none; color: #a89f91; font-weight:600;">
                        ${meta.icon} ${meta.title}
                    </div>
                    <div class="diary-section-content">
                        <ul style="list-style: none; padding: 0;">
                            ${section.items.map(item => {
                                let text = item.text;
                                const isTodo = /\[(x|X| )\]/.test(text);
                                text = text.replace(/~~(.+?)~~/g, '<span style="text-decoration: line-through; opacity: 0.6;">$1</span>');
                                text = text.replace(/\[x\]/gi, '<span style="color: #27ae60;">☑</span>');
                                text = text.replace(/\[ \]/g, '<span style="color: #ccc;">☐</span>');
                                return `<li style="margin-bottom: 5px; position: relative; padding-left: ${isTodo || isOOTD ? '0' : '15px'};">
                                    ${(!isTodo && !isOOTD) ? '<span style="position:absolute; left:0; color:#ddd;">•</span>' : ''}
                                    ${text}
                                </li>`;
                            }).join('')}
                        </ul>
                    </div>
                </div>
            `;
        });
    }
    
    if (diary.reflection) {
        const paragraphs = diary.reflection.split('\n')
            .map(p => p.trim())
            .filter(p => p.length > 0)
            .map(p => `<p style="margin-bottom: 15px; text-indent: 2em;">${p}</p>`)
            .join('');
            
        const penIcon = `<svg style="width: 18px; height: 18px; stroke: #a89f91; stroke-width: 1.8; fill: none; stroke-linecap: round; stroke-linejoin: round; margin-right: 8px; vertical-align: -3px;" viewBox="0 0 24 24"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.586 7.586"></path><circle cx="11" cy="11" r="2"></circle></svg>`;

        contentHtml += `
            <div class="diary-section" style="margin-top: 25px;">
                <div class="sub-title" style="margin-bottom: 10px; display:flex; align-items:center; border:none; color: #a89f91; font-weight:600;">
                    ${penIcon} 今日感悟
                </div>
                <div class="diary-content">${paragraphs}</div>
            </div>
        `;
    }

    // 5. 组装最终 HTML (Header 部分已使用 removeEmojis)
    const html = `
    <div class="molly-diary-viewport">
        <!-- 氛围背景层 -->
        <div class="diary-backdrop"></div>
        <div class="floating-deco deco-1">🌿</div>
        <div class="floating-deco deco-2">📎</div>
        <div class="floating-deco deco-3">M</div>

        <!-- 悬浮导航按钮 -->
        <div class="diary-nav-btn diary-nav-back" onclick="backToDiaryList()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        </div>
        <div class="diary-nav-btn diary-nav-del" onclick="deleteDiaryWithConfirm()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
        </div>

        <!-- 滚动区域 -->
        <div class="diary-scroll-wrapper">
            <!-- 主体纸张 -->
            <div class="diary-paper slide-in-up">

                <!-- Header: 日期与心情 -->
                <div class="diary-header">
                    <div class="date-block">
                        <span class="date-day" style="font-size: 3.5rem;">${dayStr}</span>
                        <span class="date-month" style="font-size: 1.2rem;">${monthStr}</span>
                    </div>
                    <div class="meta-block">
                        <!-- ★ 关键修改：使用 removeEmojis 清洗文本 -->
                        <span>${getInsIcon('weather', diary.weather)} ${removeEmojis(diary.weather) || 'Weather'}</span>
                        <span>${getInsIcon('mood', diary.mood)} ${removeEmojis(diary.mood) || 'Mood'}</span>
                    </div>
                </div>

                <!-- Snapshot: 拍立得照片区域 -->
                <div class="snapshot-container">
                    <div class="washi-tape"></div>
                    <div class="polaroid-frame">
                        <div class="polaroid-img">
                            <div class="polaroid-placeholder">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                                <span>AI Photo</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Title: 标题 -->
                <div class="diary-title-block">
                    <h1 class="main-title">${diary.title || '无题日记'}</h1>
                    <span class="sub-title">${timeStr} · ${getWeekDay(dateObj)}</span>
                </div>

                <!-- Content -->
                <div class="diary-content-wrapper">
                    ${contentHtml}
                </div>

                <!-- Footer -->
                <div class="diary-footer">
                    <div class="tags">
                        ${diary.tags && diary.tags.length > 0 
                            ? diary.tags.map(tag => `<span class="tag-pill">#${tag}</span>`).join('') 
                            : '<span class="tag-pill">#记录</span>'}
                    </div>
                    <div class="stamp">MOLLY'S</div>
                </div>

            </div>
        </div>
    </div>
    `;
    
    container.innerHTML = html;
}



// 辅助函数：获取星期几
function getWeekDay(date) {
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    return days[date.getDay()];
}


// 返回日记列表

function backToDiaryList() {
    const detailScreen = document.getElementById('diaryDetailScreen');
    detailScreen.style.display = 'none';
    document.getElementById('diaryScreen').style.display = 'flex';
    
    // ▼▼▼ 新增：恢复原有导航栏显示（防止影响其他页面逻辑） ▼▼▼
    const oldHeader = detailScreen.querySelector('.chat-detail-header');
    if (oldHeader) oldHeader.style.display = 'flex';
    
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
        // 精确筛选当前角色的日记
        const count = allDiaries.filter(d => d.chatId === currentChatId).length;
        
        // 更新界面上的数字
        const countEl = document.getElementById('charFollowers');
        if (countEl) {
            countEl.textContent = count;
        }
    });
}


// 新增：实时更新档案（时光相册）数量
function updateArchiveCount() {
    if (!currentChatId) return;
    
    loadFromDB('memories', (data) => {
        // 1. 获取所有数据
        let allMemories = Array.isArray(data) ? data : (data && data.list ? data.list : []);
        
        // 2. 筛选当前角色的“时光记录” (type === 'moment')
        const momentCount = allMemories.filter(m => 
            m.chatId === currentChatId && m.type === 'moment'
        ).length;
        
        // 3. 更新界面上的数字 (对应“关注”或“档案”的位置)
        const countEl = document.getElementById('charFollowing');
        if (countEl) {
            countEl.textContent = momentCount;
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
        // ★★★ 新增：简单的图片压缩检查 ★★★
        // 如果 Base64 字符串太长（超过 200万字符，约 1.5MB），可能会导致 API 报错
        if (imageData.length > 2000000) {
            alert('这张图片太大了，AI 处理不过来，请发一张小一点的截图试试。');
            return;
        }
        
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
    
    // 应用主题
    const savedTheme = localStorage.getItem('callTheme') || 'light';
    applyCallTheme(savedTheme);
    
    // ▼▼▼ 加载用户头像 ▼▼▼
    loadUserAvatarForChat();
    
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
    
// 6. 构建消息上下文 (识图兼容性终极加固版)
        const contextRounds = characterInfo.contextRounds || 30;
        const recentMessages = allMessages.slice(-(contextRounds * 2)).map(msg => {
            let content;

      if (msg.type === 'image') {
    // ★★★ 修改：所有图片都转为文字描述，不发送真实图片数据 ★★★
    if (msg.isSticker) {
        content = `[ID:${msg.id}] [发送了表情: ${msg.altText || '图片'}]`;
    } else {
        content = `[ID:${msg.id}] [发送了一张图片: ${msg.altText || '图片'}]`;
    }
}

            // --- 以下部分严禁修改，保持你原有的逻辑完整性 ---
            else if (msg.type === 'transfer') {
                const data = msg.transferData;
                const statusStr = data.status === 'sent' ? '待领取' : '已领取';
                content = `[ID:${msg.id}] [系统消息：我给你转账了 ¥${data.amount}，状态：${statusStr}，备注：${data.note || '无'}]`;
            } 
            else if (msg.type === 'shopping_order') {
                const data = msg.orderData;
                const items = data.items.map(i => i.name).join('、');
                let orderDesc = "";
                if (data.orderType === 'buy_for_ta') orderDesc = `用户送了你礼物：${items} (¥${data.totalPrice})，你已收下。`;
                else if (data.orderType === 'ask_ta_pay') orderDesc = `用户请求你代付：${items} (¥${data.totalPrice})，当前状态：${data.status === 'pending'?'待确认':data.status}。`;
                else if (data.orderType === 'ai_buy_for_user') orderDesc = `你给用户买了：${items}。`;
                else if (data.orderType === 'ai_ask_user_pay') orderDesc = `你请求用户代付：${items}。`;
                content = `[ID:${msg.id}] [系统记录] ${orderDesc}`;
            }
            else if (msg.type === 'voice') {
                content = `[ID:${msg.id}] [语音消息: ${msg.content}]`;
            }
            else if (msg.type === 'system') {
                content = `[ID:${msg.id}] [系统通知] ${msg.content}`;
            }
            else {
                content = `[ID:${msg.id}] ${msg.content}`;
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

// 解析并显示通话回复 (修复版：彻底去除方括号)
function parseAndShowCallReply(aiReply) {
    const container = document.getElementById('callMessages');

    // 1. 预处理：先按 ||| 拆分成独立的片段
    let segments = aiReply.split('|||').map(s => s.trim()).filter(s => s.length > 0);

    // 2. 逐条处理
    segments.forEach((segment, index) => {
        setTimeout(() => {
            
            let isAction = false;
            let content = segment;

            // --- 判断逻辑 ---
            
            // 1. 显式标记：[动作]xxx
            if (segment.match(/^[\[【](动作|Action)[\]】]/i)) {
                isAction = true;
                // 去掉标签
                content = segment.replace(/^[\[【](动作|Action)[\]】][:：]?\s*/i, '');
            }
            // 2. 隐式标记：被 [] 包裹的纯文本
            else if (segment.startsWith('[') && segment.endsWith(']')) {
                // 排除指令（如 [搜表情:xxx]）
                if (!segment.match(/[:：]/)) {
                    isAction = true;
                }
            }
            // 3. 中文括号兜底：被 【】 包裹
            else if (segment.startsWith('【') && segment.endsWith('】')) {
                if (!segment.match(/[:：]/)) {
                    isAction = true;
                }
            }

            // --- 关键修复：如果判定为动作，强制去掉首尾括号 ---
            if (isAction) {
                // 去掉开头的 [ 或 【
                if (content.startsWith('[') || content.startsWith('【')) {
                    content = content.substring(1);
                }
                // 去掉结尾的 ] 或 】
                if (content.endsWith(']') || content.endsWith('】')) {
                    content = content.substring(0, content.length - 1);
                }
                
                const actionDiv = document.createElement('div');
                actionDiv.className = 'call-action-desc'; 
                actionDiv.textContent = content.trim(); // 去掉空格
                container.appendChild(actionDiv);
            } 
            // --- 普通消息 ---
            else {
                const msgDiv = document.createElement('div');
                msgDiv.className = 'call-message-ai'; 
                // 去掉可能存在的 [消息] 标签
                msgDiv.textContent = content.replace(/^[\[【](消息|Message)[\]】][:：]?\s*/i, '');
                container.appendChild(msgDiv);
            }

            // 3. 滚动到底部
            const scrollContainer = document.getElementById('callMessagesContainer');
            scrollContainer.scrollTop = scrollContainer.scrollHeight;

        }, index * 800); 
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

// 接收AI回复 (视频通话专用)
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

【动作描写】30-50字
【消息内容】4-8条，每条10-30字，用|||分隔`;
    
    const receiveBtn = document.getElementById('callReceiveBtn');
    const callInput = document.getElementById('callInput');
    
    try {
        if (receiveBtn) receiveBtn.disabled = true;
        if (callInput) callInput.disabled = true;
        
        // 截取视频帧
        let visionImage = null;
        if (typeof isCameraOn !== 'undefined' && isCameraOn) {
            visionImage = captureVideoFrame();
            console.log("📸 已截取摄像头画面用于识别");
        }
        
        // 获取聊天记录上下文
        const contextRounds = characterInfo.contextRounds !== undefined ? characterInfo.contextRounds : 30;
        const contextCount = contextRounds * 2;
        const recentMessages = allMessages.slice(-contextCount).map(msg => {
            let content = msg.content;

            if (msg.type === 'shopping_order') {
                const data = msg.orderData;
                const itemNames = data.items.map(i => i.name).join('、');
                const price = data.totalPrice.toFixed(2);
                if (data.orderType === 'ai_buy_for_user') {
                    content = `[系统记录] 你刚刚给用户买了：${itemNames} (¥${price})，订单已完成。`;
                } else if (data.orderType === 'ask_ta_pay') {
                    const statusText = data.status === 'pending' ? '等待你确认' : 
                                     data.status === 'paid' ? '你已同意支付' : '你已拒绝';
                    content = `[系统记录] 用户请求你代付：${itemNames} (¥${price})，当前状态：${statusText}。`;
                } else if (data.orderType === 'buy_for_ta') {
                    content = `[系统记录] 用户送了你礼物：${itemNames} (¥${price})，你已收下。`;
                }
            }
      
            if (msg.type === 'image') {
                if (msg.isSticker === true) {
                    content = `[发送了表情: ${msg.altText || '图片'}]`;
                } else {
                    content = `[发送了一张图片: ${msg.altText || '图片'}]`;
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
        
        // 构建 finalUserMessage
        let userContent = callMessages.length > 0 
            ? callMessages[callMessages.length - 1].content 
            : "（用户正在看着你）";

        let finalUserMessage;

        if (visionImage) {
            finalUserMessage = {
                role: 'user',
                content: [
                    { type: "text", text: userContent + "\n[系统提示：这是用户当前摄像头的实时画面，请根据画面内容进行互动]" },
                    { type: "image_url", image_url: { url: visionImage } }
                ]
            };
        } else {
            finalUserMessage = {
                role: 'user',
                content: userContent
            };
        }
        
        const messages = [
            { role: 'system', content: systemPrompt },
            ...recentMessages,
            finalUserMessage
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
        
        // ★★★ 修复点：先声明变量，再处理 ★★★
        let aiReply = data.choices[0].message.content.trim();
        
        // 视频通话中禁用表情包指令（防止显示乱码）
        aiReply = aiReply.replace(/[\[【](?:搜表情|表情包|表情)[:：]\s*.*?[\]】]/g, '');
        
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
        if (receiveBtn) receiveBtn.disabled = false;
        if (callInput) callInput.disabled = false;
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
            content: `📞 视频通话时长 ${duration}`,
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
    document.getElementById('callSettingsModal').style.display = 'flex';
    
    // 加载用户头像预览
    if (currentChatId) {
        loadFromDB('characterInfo', (data) => {
            const charData = data && data[currentChatId] ? data[currentChatId] : {};
            updateAvatarPreview(charData.userAvatar);
        });
    }
    
    // 初始化主题选择
    const savedTheme = localStorage.getItem('callTheme') || 'light';
    document.querySelectorAll('input[name="callTheme"]').forEach(radio => {
        radio.checked = (radio.value === savedTheme);
        radio.addEventListener('change', (e) => {
            applyCallTheme(e.target.value);
            localStorage.setItem('callTheme', e.target.value);
        });
    });
}

// 关闭通话设置
function closeCallSettings(event) {
    if (event) event.stopPropagation();
    document.getElementById('callSettingsModal').style.display = 'none';
}


// 保存通话设置
function saveCallSettings() {
    const selectedTheme = document.querySelector('input[name="callTheme"]:checked')?.value || 'light';
    applyCallTheme(selectedTheme);
    localStorage.setItem('callTheme', selectedTheme);
    
    // ★★★ 修复：添加保存到数据库的逻辑，否则刷新就没了 ★★★
    if (typeof callSettings !== 'undefined') {
        saveToDB('callSettings', callSettings);
    }
    
    closeCallSettings();
    // 提示一下用户
    alert('通话设置与壁纸已保存！✨');
}

// ★★★ 新增：修复报错 openMoreOptions is not defined ★★★
// 这是为了兼容你 HTML 里点击按钮时调用的旧名称
function openMoreOptions() {
    // 直接打开通话设置面板
    openCallSettings();
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

//时光相册按照最新排序//
function renderMemoryTimeline(moments) {
    const container = document.getElementById('memoryTimelineList');
    
    if (moments.length === 0) {
        container.innerHTML = '<div style="text-align:center; color:#ccc; margin-top:50px;">暂无时光记录</div>';
        return;
    }
    
    // ★★★ 核心修复：强制按时间倒序排列 (最新的在上面) ★★★
    moments.sort((a, b) => {
        // 1. 优先比较发生时间 (happenTime)
        const timeA = new Date(a.happenTime || 0).getTime();
        const timeB = new Date(b.happenTime || 0).getTime();
        
        if (timeB !== timeA) {
            return timeB - timeA; // B - A = 倒序
        }
        
        // 2. 如果发生时间一样，按创建时间 (createTime) 倒序
        const createA = new Date(a.createTime || 0).getTime();
        const createB = new Date(b.createTime || 0).getTime();
        return createB - createA;
    });
    
    // 渲染列表 (保持不变)
    container.innerHTML = moments.map(m => `
        <div class="timeline-item" style="cursor: pointer;" onclick="openEditMemoryModal(${m.id || Date.now()})">
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
    // ★ 修复：尝试把 ID 转为数字（以防传过来的是字符串）
    const targetId = Number(id);
    // 从数据库获取详情
    loadFromDB('memories', (data) => {
        let allMemories = Array.isArray(data) ? data : (data && data.list ? data.list : []);
        
        // ★ 修复：使用 == 进行比较，或者同时比较数字和字符串形式
        const mem = allMemories.find(m => m.id == id || m.id === targetId);
        
        if (!mem) {
            // console.log('Debug: 找不到ID', id, typeof id); // 调试用
            alert('找不到这条记忆');
            return;
        }
        
        editingMemoryId = mem.id; // 确保保存的是原始ID
        
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
    
    // 按钮样式 - 添加安全检查
    const tagBtn = document.getElementById('btn-type-tag');
    const momentBtn = document.getElementById('btn-type-moment');
    
    if (tagBtn) tagBtn.className = type === 'tag' ? 'mem-type-btn active' : 'mem-type-btn';
    if (momentBtn) momentBtn.className = type === 'moment' ? 'mem-type-btn active' : 'mem-type-btn';
    
    // 字段显示 - 添加安全检查
    const pinGroup = document.getElementById('pinOptionGroup');
    const dateGroup = document.getElementById('dateOptionGroup');
    
    if (type === 'tag') {
        if (pinGroup) pinGroup.style.display = 'block';
        if (dateGroup) dateGroup.style.display = 'none';
    } else {
        if (pinGroup) pinGroup.style.display = 'none';
        if (dateGroup) dateGroup.style.display = 'block';
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
        let allMemories = [];
        if (Array.isArray(data)) allMemories = data;
        else if (data && data.list) allMemories = data.list;
        
        const newMemory = {
            id: Date.now(),
            chatId: currentChatId,
            type: currentMemEditType,
            content: content,
            createTime: new Date().toISOString()
        };
        
        if (currentMemEditType === 'tag') {
            newMemory.isPinned = document.getElementById('memoryPinCheckbox').checked;
        } else {
            newMemory.happenTime = document.getElementById('memoryDateInput').value || new Date().toISOString().split('T')[0];
        }
        
        if (editingMemoryId) {
            // 编辑模式
            const index = allMemories.findIndex(m => m.id === editingMemoryId);
            if (index > -1) {
                allMemories[index] = { ...allMemories[index], ...newMemory, id: editingMemoryId };
            }
        } else {
            // 新增模式
            allMemories.push(newMemory);
        }
        
        saveToDB('memories', { list: allMemories });
        
        // 刷新记忆列表
        loadMemories();
         updateArchiveCount(); 
        
        // 更新角色信息页的档案数字
        const chatMemories = allMemories.filter(m => m.chatId === currentChatId);
        const momentCount = chatMemories.filter(m => m.type === 'moment').length;
        const archiveCountEl = document.getElementById('charFollowing');
        if (archiveCountEl) {
            archiveCountEl.textContent = momentCount;
        }
        
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
         updateArchiveCount(); 
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
        if (receiveBtn) {
            receiveBtn.disabled = true;
            receiveBtn.style.opacity = '0.5';
        }
        if (chatInput) chatInput.disabled = true;

        const chat = chats.find(c => c.id === currentChatId);
        
        // 2. 并行获取所有数据
        const [characterInfo, memoryContext, emojiList] = await Promise.all([
            new Promise(resolve => loadFromDB('characterInfo', data => resolve(data && data[currentChatId] ? data[currentChatId] : {}))),
            getMemoryContext(),
            new Promise(resolve => loadFromDB('emojis', (data) => resolve(data && data.list ? data.list : [])))
        ]);

        const worldbooksContent = await getLinkedWorldbooksContent(characterInfo.linkedWorldbooks);
        
        // 3. 构建时间信息
        const today = new Date();
        const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
        const timeStr = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;

        // 4. 天气信息
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

        // 5. System Prompt
        let systemPrompt = `
【核心指令：你就是本人】
你的角色是【${chat.name}】。
**绝对法则**：任何情况下严禁出戏（No OOC），严禁暴露AI身份，严禁说教。

【你的性格】
${characterInfo.personality || '一个真实自然的人'}
【对方是谁】
${characterInfo.myPersonality || '你的聊天对象'}
【重要设定】
${worldbooksContent}
【记忆片段】
${memoryContext ? memoryContext : ""}
【现在时间】
${dateStr} ${timeStr}
${getBirthdayPrompt(characterInfo.birthday)}
【天气情况】
${weatherInfoStr}

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
      **严禁**使用"开心"、"难过"、"正在聊天"这种人机词汇！要具体、要生动、要带感！
      *格式*：[状态更新]心情:xxx|心情值:0-100|心跳:60-200|穿着风格:xxx|穿着单品:a,b,c|行为:xxx|想法:xxx[/状态更新]

【核心指令：自然的微信聊天节奏】
你正在手机上和用户聊天，请模拟**最真实的回复节奏**：
1. **拒绝"长篇大论"**：严禁发送超过 3 行的"小作文"气泡。
2. **拒绝"过于细碎"**：不要把一句话切得稀巴烂。
【回复格式示例】
使用 ||| 来分隔气泡。
✅ 正确示范：早安呀~|||昨晚梦到你了，特别想你。
❌ 错误示范：早安。|||昨晚。|||梦到你了。
【开始回复】
请用 ||| 分隔，保持这种自然的聊天节奏：`;

        // 动态追加表情包提示
        if (emojiList.length > 0) {
            const emojiNames = emojiList.slice(0, 15).map(e => e.text).join('、');
            systemPrompt += `

【⚠️ 表情包提示】
你的表情包库里有：${emojiNames} 等${emojiList.length}个表情。
**你必须回复表情包**
格式：[搜表情:关键词]
不要忘记！表情包让聊天更生动！`;
        }

        const contextRounds = characterInfo.contextRounds || 30;
        
        // 截取最近的消息
        const recentMessages = allMessages.slice(-(contextRounds * 2)).map(msg => {
            let content;

            if (msg.type === 'image') {
                if (msg.isSticker) {
                    content = `[ID:${msg.id}] [发送了表情: ${msg.altText || '图片'}]`;
                } else {
                    let base64Url = msg.content.trim();
                    if (!base64Url.startsWith('data:image')) {
                        base64Url = 'data:image/jpeg;base64,' + base64Url;
                    }
                    content = [
                        { type: "text", text: `[ID:${msg.id}] (这是用户之前发送的图片，请结合上下文理解)` },
                        { type: "image_url", image_url: { url: base64Url } }
                    ];
                }
            }
            else if (msg.type === 'transfer') {
                const data = msg.transferData;
                const statusStr = data.status === 'sent' ? '待领取' : '已领取';
                content = `[ID:${msg.id}] [系统消息：我给你转账了 ¥${data.amount}，状态：${statusStr}，备注：${data.note || '无'}]`;
            } 
            else if (msg.type === 'shopping_order') {
                const data = msg.orderData;
                const items = data.items.map(i => i.name).join('、');
                let orderDesc = "";
                if (data.orderType === 'buy_for_ta') orderDesc = `用户送了你礼物：${items} (¥${data.totalPrice})，你已收下。`;
                else if (data.orderType === 'ask_ta_pay') orderDesc = `用户请求你代付：${items} (¥${data.totalPrice})，当前状态：${data.status === 'pending'?'待确认':data.status}。`;
                else if (data.orderType === 'ai_buy_for_user') orderDesc = `你给用户买了：${items}。`;
                else if (data.orderType === 'ai_ask_user_pay') orderDesc = `你请求用户代付：${items}。`;
                content = `[ID:${msg.id}] [系统记录] ${orderDesc}`;
            }
            else if (msg.type === 'voice') content = `[ID:${msg.id}] [语音消息: ${msg.content}]`;
            else if (msg.type === 'system') content = `[ID:${msg.id}] [系统通知] ${msg.content}`;
            else content = `[ID:${msg.id}] ${msg.content}`;
            
            return {
                role: msg.senderId === 'me' ? 'user' : 'assistant',
                content: content
            };
        });

        // 7. API 请求
        const messages = [{ role: 'system', content: systemPrompt }, ...recentMessages];
        const hasImageInContext = messages.some(msg => Array.isArray(msg.content));
        const requestUrl = currentApiConfig.baseUrl.endsWith('/') 
            ? currentApiConfig.baseUrl + 'chat/completions' 
            : currentApiConfig.baseUrl + '/chat/completions';

        const modelToUse = currentApiConfig.defaultModel || 'gpt-3.5-turbo';

        const response = await fetch(requestUrl, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${currentApiConfig.apiKey}`, 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({
                model: modelToUse,
                messages: messages,
                temperature: 0.9,
                stream: false
            })
        });

        if (!response.ok) throw new Error('API请求失败');
        const data = await response.json();
        let aiReply = data.choices[0].message.content.trim();

        // 解析分析数据
        let analysisData = null;
        const jsonMatch = aiReply.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
            try {
                const jsonStr = jsonMatch[1].trim();
                const parsed = JSON.parse(jsonStr);
                if (parsed.analysis) {
                    analysisData = parsed.analysis;
                }
            } catch (e) {
                console.warn('分析数据解析失败:', e);
            }
            aiReply = aiReply.replace(/```json\s*[\s\S]*?\s*```/g, '').trim();
        }

        if (analysisData && currentChatId) {
            saveUserProfileAnalysis(analysisData);
        }

        // 解析记忆标记
        let triggeredMemoryId = null;
        const memMatch = aiReply.match(/\[MEM:(\d+)\]/);
        if (memMatch) {
            triggeredMemoryId = parseInt(memMatch[1]);
            aiReply = aiReply.replace(/\[MEM:\d+\]/g, '').trim();
        }

        // 提取并更新状态
        const statusPatterns = [
            /\[状态\]\s*[:：]?\s*(.*?)\s*\|\|\|/,
            /^\[状态\]\s*[:：]?\s*(.*?)\s*\[/,
            /\[状态\]\s*[:：]?\s*([^\[【\|]+)/
        ];
        
        let statusText = null;
        for (let pattern of statusPatterns) {
            const match = aiReply.match(pattern);
            if (match && match[1]) {
                statusText = match[1].trim();
                if (statusText && statusText !== 'null' && statusText.length < 10) {
                    break;
                }
            }
        }
        
        if (statusText) {
            const invalidKeywords = ['保持', '更新', '不变', '同上', '无', '暂无'];
            if (!invalidKeywords.some(k => statusText.includes(k)) && statusText.length > 0 && statusText.length < 18) {
                loadFromDB('characterInfo', (dbData) => {
                    const allData = dbData || {};
                    if (!allData[currentChatId]) allData[currentChatId] = {};
                    allData[currentChatId].currentStatus = statusText;
                    saveToDB('characterInfo', allData);
                    updateDetailPageStatus(currentChatId);
                    updateChatStatusDisplay(currentChatId);
                });
            }
        }

        // 解析状态监控更新
        const statusUpdateMatch = aiReply.match(/\[状态更新\](.*?)\[\/状态更新\]/s);
        if (statusUpdateMatch) {
            const statusStr = statusUpdateMatch[1];
            const parseField = (field) => {
                const match = statusStr.match(new RegExp(field + '[:：]([^|]+)'));
                return match ? match[1].trim() : null;
            };
            
            const newStatus = {
                mood: parseField('心情') || '平静',
                moodLevel: parseInt(parseField('心情值')) || 75,
                heartbeat: parseInt(parseField('心跳')) || 75,
                clothesStyle: parseField('穿着风格') || '日常',
                clothesTags: (parseField('穿着单品') || '').split(/[,，、]/).filter(t=>t),
                action: parseField('行为') || '正在聊天',
                thoughts: parseField('想法') || '...',
                schedule: parseSchedule(parseField('日程'))
            };

            loadFromDB('characterInfo', (data) => {
                const charData = data && data[currentChatId] ? data[currentChatId] : {};
                if (charData.statusMonitorEnabled) {
                    const allData = data || {};
                    if (!allData[currentChatId]) allData[currentChatId] = {};
                    const oldMonitor = allData[currentChatId].statusMonitor || {};
                    allData[currentChatId].statusMonitor = { ...oldMonitor, ...newStatus };
                    saveToDB('characterInfo', allData);
                    const bpmEl = document.getElementById('heartbeatBpm');
                    if (bpmEl) bpmEl.textContent = newStatus.heartbeat;
                }
            });
            
            aiReply = aiReply.replace(/\[状态更新\].*?\[\/状态更新\]/s, '').trim();
        }


             // 11. 清理回复内容
        let messageContent = aiReply
            .replace(/\[状态\]\s*[:：]?[^\[【\|]*?\|\|\|/g, '')
            .replace(/\[状态\]\s*[:：]?[^\[【\|]*/g, '')
            .replace(/\[消息\]\s*[:：]?/g, '')
            .replace(/【消息】\s*[:：]?/g, '')
            // 确保白名单里有 "转账"
            .replace(/\[(?!EMOJI:|转账:|发送语音:|领取转账|购物:|搜表情)[^\]]*\]\s*[:：]?/g, '')
            .replace(/^\|\|\|+/g, '')
            .replace(/\|\|\|+$/g, '')
            .replace(/\|\|\|{3,}/g, '|||')
            .trim(); 


         // ★★★ 核心修复：强力转换逻辑 (搜不到就随机发) ★★★
        messageContent = messageContent.replace(/\[搜表情[:：]\s*(.+?)\]/g, (match, keyword) => {
            // 1. 先尝试按关键词搜
            let emoji = searchEmojiByKeyword(keyword.trim());
            
            // 2. ★ 如果没搜到，但库里有图，就随机拿一个！(防止显示代码)
            if (!emoji && emojiList.length > 0) {
                console.log(`关键词 [${keyword}] 没搜到，随机兜底一个`);
                emoji = emojiList[Math.floor(Math.random() * emojiList.length)];
            }
            // 3. 转换成内部ID格式
            if (emoji) {
                return `|||[EMOJI:${emoji.id}]|||`;
            }
            
            // 4. 如果库是空的，直接删除指令，别显示尴尬的文本
            return ""; 
        });

        // 12. 分割消息
        // 清理一下可能产生的多余分隔符
        let messageList = messageContent
            .replace(/^\|\|\|+/g, '')
            .replace(/\|\|\|+$/g, '')
            .split('|||')
            .map(m => m.trim())
            .filter(m => m.length > 0);

        // (注意：原来这里有一个 messageList.map 处理表情包的代码块，现在不需要了，请删除它！)


        // ★ 处理表情包指令
        messageList = messageList.map(msg => {
            const emojiMatch = msg.match(/\[搜表情[:：]\s*(.+?)\]/);
            if (emojiMatch) {
                const keyword = emojiMatch[1].trim();
                const emoji = searchEmojiByKeyword(keyword);
                if (emoji) {
                    return `[EMOJI:${emoji.id}]|||${msg.replace(/\[搜表情[:：]\s*.+?\]/, '').trim()}`;
                }
            }
            return msg;
        });

        // 兜底拆分
        if (messageList.length < 2 && messageContent.length > 40) {
            let smartContent = messageContent.replace(/([。！？!?\n\r]+)/g, "$1|||"); 
            let smartList = smartContent.split('|||').map(m => m.trim()).filter(m => m.length > 0);
            if (smartList.length > 1) {
                messageList = smartList;
            }
        }

        // 逐条发送消息
        for (let i = 0; i < messageList.length; i++) {
            await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 500));
            let msgText = messageList[i];

            // 购物逻辑
            const shoppingMatch = msgText.match(/\[购物:(送礼|代付):([^\]]+)\]/);
            if (shoppingMatch) {
                const shoppingType = shoppingMatch[1];
                const keyword = shoppingMatch[2].trim();
                msgText = msgText.replace(/\[购物:(送礼|代付):[^\]]+\]/g, '').trim();
                handleAIShopping(shoppingType, keyword);
                if (!msgText) continue;
            }

            // 领取转账逻辑
            if (msgText.includes('[领取转账]')) {
                const pendingTransfer = allMessages.slice().reverse().find(m => m.type === 'transfer' && m.senderId === 'me' && m.transferData.status === 'sent');
                if (pendingTransfer) {
                    pendingTransfer.transferData.status = 'aiReceived';
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

            // 确认代付逻辑
            if (msgText.includes('[确认代付]')) {
                const pendingOrder = allMessages.slice().reverse().find(m => 
                    m.type === 'shopping_order' && 
                    m.orderData.orderType === 'ask_ta_pay' && 
                    m.orderData.status === 'pending'
                );
                if (pendingOrder) {
                    pendingOrder.orderData.status = 'paid';
                    const sysMsgId = Date.now() + i + 800;
                    allMessages.push({
                        id: sysMsgId,
                        chatId: currentChatId,
                        type: 'system',
                        content: `${chat.name} 已同意并完成了代付`,
                        time: getCurrentTime()
                    });
                    saveMessages();
                    renderMessages();
                }
                msgText = msgText.replace(/\[确认代付\]/g, '').trim();
                if (!msgText) continue;
            }

            // 构建消息对象
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

            // 处理引用
            const quoteMatch = msgText.match(/\[引用:(\d+)\]/);
            if (quoteMatch) {
                const quotedId = parseInt(quoteMatch[1]);
                const originalMsg = allMessages.find(m => m.id === quotedId);
                if (originalMsg) {
                    newMessage.quotedMessageId = originalMsg.id;
                    newMessage.quotedAuthor = originalMsg.senderId === 'me' ? '我' : originalMsg.senderId;
                    newMessage.quotedContent = originalMsg.content;
                    newMessage.quotedTime = formatMessageTime(originalMsg.time);
                    msgText = msgText.replace(/\[引用:\d+\]/, '').trim();
                    newMessage.content = msgText;
                }
            }

            // 特殊消息类型
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
        if (receiveBtn) {
            receiveBtn.disabled = false;
            receiveBtn.style.opacity = '1';
        }
        if (chatInput) chatInput.disabled = false;
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
        <!-- ★ 修复：添加 style="cursor:pointer" 和 ID引号 -->
        <div class="mem-tag ${tag.isPinned ? 'pinned' : ''}" style="cursor: pointer;" onclick="openEditMemoryModal('${tag.id}')">
            ${tag.isPinned ? '<span class="mem-tag-pin-icon">📌</span>' : ''}
            ${tag.content}
        </div>
    `).join('');

}

// === 【功能：智能刷新分发器】开始 ===
async function analyzeProfile() {
    const btn = document.getElementById('headerAnalyzeBtn');
    if (!btn || !currentChatId) return;

    btn.disabled = true;
    btn.style.opacity = '0.3';

    try {
        // 严格根据 Tab 分类，互不打扰
        if (currentArchiveTab === 'profile') {
            await analyzeCharacterArchive();
        } else if (currentArchiveTab === 'tags') {
            await analyzeUserImpression();
        } else if (currentArchiveTab === 'timeline') {
            await analyzeTimelineEvents();
        }
    } finally {
        btn.disabled = false;
        btn.style.opacity = '1';
    }
}
// === 【功能：智能刷新分发器】结束 ===

// === 【功能：分析他的档案】开始 ===
async function analyzeCharacterArchive() {
    if (!currentChatId) return;
    const { historyText } = await getSmartAnalysisHistory(50);
    const charData = await new Promise(resolve => loadFromDB('characterInfo', d => resolve(d && d[currentChatId] ? d[currentChatId] : {})));
    
    const prompt = `分析角色【${charData.personality || '无设定'}】。根据记录：${historyText}。
    输出格式：身高|||体重|||性格核心|||爱好|||厌恶|||新发现的秘密`;

    try {
        const content = await callAI(prompt);
        let parts = content.split('|||').map(s => s.trim());
        while(parts.length < 6) parts.push("--");

        // 仅更新 extendedProfile
        loadFromDB('characterInfo', (allData) => {
            if (!allData[currentChatId]) allData[currentChatId] = {};
            const oldExt = allData[currentChatId].extendedProfile || {};
            allData[currentChatId].extendedProfile = { 
                ...oldExt, 
                height: parts[0], weight: parts[1], coreTrait: parts[2], likes: parts[3], dislikes: parts[4], 
                secretArchive: (oldExt.secretArchive || "") + (parts[5] !== "--" ? `\n【${new Date().toLocaleDateString()}】${parts[5]}` : "")
            };
            saveToDB('characterInfo', allData);
            loadArchives(); 
        });
        alert('档案更新成功！');
    } catch (e) { alert('档案分析失败'); }
}
// === 【功能：分析他的档案】结束 ===


// === 【功能：修复版分析：他眼中的你 & 强力解析纠偏】开始 ===
async function analyzeUserImpression() {
    let alertMsg = '用户印象分析完成！';
    const chat = chats.find(c => c.id === currentChatId); 
    if (!chat) return;

    // 1. 获取近期互动记录
    const { historyText } = await getSmartAnalysisHistory(30);
    
    // 2. 优化提示词：再次强调分隔符，防止 AI 自由发挥
const prompt = `你现在是【${chat.name}】。请深入阅读聊天记录，以第一人称视角记录你对用户的“拍立得”珍贵瞬间。

【输出格式要求】
必须严格用 ||| 分隔以下 5 个部分，严禁使用 Markdown 代码块（如 \`\`\`）：
心情关键词 ||| 心情贴纸 ||| 你的心里话 ||| 标签1#理由1, 标签2#理由2 ||| 拍立得列表

【关于“拍立得列表”的绝对禁令】
1. 数量：固定生成 3-5 个瞬间。
2. 格式：每个瞬间必须严格遵守：标题#内容#评语。
3. 严禁偷懒：必须为每一个瞬间撰写独立的、感性的“评语”。哪怕瞬间再多，也绝不允许省略任何一个瞬间的“评语”部分！
4. 评语要求：字数要在 **不能超过60字** 左右，包含对那时的回忆、此刻的心动和对未来的期许。
5. 分隔符：不同瞬间之间请使用“ ^ ”（脱字符）进行分隔。

【当前对话记录】
${historyText}`;

    try {
        let content = await callAI(prompt);
        
        // ✨ 新增：预处理，去除可能存在的 Markdown 代码块标签
        content = content.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim();

        // 兼容性切割
        let parts = content.split('|||').map(s => s.trim());
        if (parts.length < 2 && content.includes('||')) {
            parts = content.split('||').map(s => s.trim());
        }
        
        // 补齐数组，防止读取 [4] 时报错
        while(parts.length < 5) parts.push('');

        const moodDesc = (parts[0] || '平静').substring(0, 6);
        const sticker = parts[1] || 'sunny';
        const moodComment = parts[2] || '（他在观察你...）';
        const tagsStr = parts[3] || '';
        const momentsStr = parts[4] || ''; 

        // 3. 解析标签
        const newTags = [];
        if (tagsStr && tagsStr !== '无') {
            tagsStr.split(/[,，]/).forEach(item => {
                const tagParts = item.split(/[#＃]/);
                if (tagParts.length >= 2) {
                    newTags.push({ text: tagParts[0].trim(), reason: tagParts[1].trim(), id: Date.now() + Math.random() });
                }
            });
        }

// === 优化后的瞬间解析逻辑 ===
const newMoments = [];
if (parts[4] && parts[4] !== '无') {
    // 1. 使用我们在 Prompt 里约定的 "^" 符号切分多个瞬间
    const momentItems = parts[4].split('^').filter(s => s.trim());
    
    momentItems.forEach(item => {
        // 2. 内部使用 # 切分标题、内容、评语
        const mParts = item.split(/[#＃]/).map(s => s.trim());
        
        // 只有当三个部分（标题、内容、评语）都齐全时才记录，否则打印错误日志方便调试
        if (mParts.length >= 3) {
            newMoments.push({
                id: Date.now() + Math.random() * 1000,
                title: mParts[0],
                content: mParts[1],
                comment: mParts[2], // 这里现在能准确抓到 AI 写的评语了
                date: new Date().toISOString().split('T')[0]
            });
        } else {
            console.warn("发现一个格式不全的瞬间，已跳过:", item);
        }
    });
}




// === 【功能：闪光时刻解析加固】结束 ===
        // 5. 数据保存 (关键：即便 newMoments 是空的，也确保传的是 [] 而不是 undefined)
        loadFromDB('characterInfo', (data) => {
            const allData = data || {};
            if (!allData[currentChatId]) allData[currentChatId] = {};
            
            const existingProfile = allData[currentChatId].userProfile || { tags: [], flashbulbMemories: [] };

            allData[currentChatId].userProfile = {
        // 如果 API 失败了，我们就保留旧的心情，而不是让它变成 undefined
        currentEmotion: (sticker && moodDesc) ? { sticker, label: moodDesc, comment: moodComment, time: getCurrentTime() } : (existingProfile.currentEmotion || null),
        tags: (newTags && newTags.length > 0) ? newTags : (existingProfile.tags || []),
        // ✨ 关键点：如果新生成的瞬间是空的（比如 API 报错了），绝对不要覆盖掉旧的！
        flashbulbMemories: (newMoments && newMoments.length > 0) ? newMoments : (existingProfile.flashbulbMemories || [])
    };
            saveToDB('characterInfo', allData);
            renderUserProfile(); // 这里会调用 renderFlashbulbMemories
            alert(alertMsg + `\n📸 成功定格了 ${newMoments.length} 个瞬间！`);
        });
    } catch (e) {
        console.error('分析失败', e);
        // 如果失败了也尝试刷新页面，避免卡死
        renderUserProfile();
    }
}
// === 【功能：修复版分析：他眼中的你】结束 ===

// === 【功能：提取时光记录】开始 ===
async function analyzeTimelineEvents() {
    if (!currentChatId) return;
    const { historyText } = await getSmartAnalysisHistory(100);
    const prompt = `判断对话中是否有重大纪念时刻？如果有，写一个20字以内的标题，否则回“无”。记录：${historyText}`;

    try {
        const content = await callAI(prompt);
        if (content.trim() === '无') return alert('暂无大事发生~');

        const newMoment = {
            id: Date.now(), chatId: currentChatId, type: 'moment',
            content: content.replace(/["《》]/g, ''),
            happenTime: new Date().toISOString().split('T')[0],
            createTime: new Date().toISOString()
        };

        loadFromDB('memories', (data) => {
            let all = Array.isArray(data) ? data : (data && data.list ? data.list : []);
            all.push(newMoment);
            saveToDB('memories', { list: all });
            loadMemories(); 
        });
        alert(`记住了：${newMoment.content}`);
    } catch (e) { alert('相册更新失败'); }
}
// === 【功能：提取时光记录】结束 ===



// === 【核心请求器：callAI 修复版】开始 ===
async function callAI(prompt) {
    // 保持你原有的配置获取逻辑
    if (!currentApiConfig.baseUrl || !currentApiConfig.apiKey) {
        const baseUrlInput = document.getElementById('apiBaseUrl');
        const apiKeyInput = document.getElementById('apiKey');
        if (baseUrlInput && apiKeyInput) {
            currentApiConfig.baseUrl = baseUrlInput.value;
            currentApiConfig.apiKey = apiKeyInput.value;
        }
    }
    if (!currentApiConfig.baseUrl || !currentApiConfig.apiKey) throw new Error('API配置丢失');

    let modelToUse = currentApiConfig.defaultModel || (document.getElementById('modelSelect') ? document.getElementById('modelSelect').value : 'gpt-3.5-turbo');
    let url = currentApiConfig.baseUrl.trim();
    if (!url.includes('/chat/completions')) {
        url = url.endsWith('/') ? url + 'chat/completions' : url + '/chat/completions';
    }

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${currentApiConfig.apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: modelToUse,
                messages: [
                    { role: 'system', content: '你是一个档案整理员。请直接输出分析结果，严禁输出JSON格式，严禁废话。' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.5
            })
        });

        const data = await response.json();
        
        // ✨ 这里的逻辑是关键：手动剥开 JSON 壳子
        let resultText = "";
        if (data.choices && data.choices[0] && data.choices[0].message) {
            resultText = data.choices[0].message.content;
        } else if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            resultText = data.candidates[0].content.parts[0].text;
        } else {
            // 如果 API 抽风返回了非标准格式，这里做一个强制提取
            resultText = typeof data === 'string' ? data : (data.message || JSON.stringify(data));
        }
        return resultText.trim();
    } catch (error) {
        console.error('CallAI Error:', error);
        throw error;
    }
}
// === 【核心请求器：callAI 修复版】结束 ===


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
                const bpm = charData.statusMonitor.heartbeat;
                const bpmEl = document.getElementById('heartbeatBpm');
                if (bpmEl) {
                    bpmEl.textContent = bpm;
                    bpmEl.dataset.baseBpm = bpm; // ★ 设置初始基准值
                }
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
         const bpmEl = document.getElementById('heartbeatBpm');
        if(bpmEl) bpmEl.dataset.baseBpm = monitor.heartbeat || 72;
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

function renderFlashbulbMemories(memories) {
    const container = document.getElementById('flashbulbContainer');
    const countEl = document.getElementById('flashbulbCount');
    
    // 核心修正：获取当前角色对象，防止报错
    const chat = chats.find(c => c.id === currentChatId) || { name: '他' };
    
    const safeMemories = Array.isArray(memories) ? memories : [];
    if (countEl) countEl.textContent = `${safeMemories.length} 个瞬间`;

    if (safeMemories.length === 0) {
        container.innerHTML = '<div class="empty-flashbulb-hint">重要时刻会被记录在这里~</div>';
        return;
    }

    container.innerHTML = safeMemories.map(memory => `
        <div class="polaroid-container" onclick="this.classList.toggle('flipped')">
            <div class="polaroid-card-inner">
                <div class="polaroid-front">
                    <div class="polaroid-photo-area">
                        <div class="photo-text-inner">${memory.content || "一段难忘的回忆..."}</div>
                    </div>
                    <div class="polaroid-title">${memory.title || "记录瞬间"}</div>
                </div>
                <div class="polaroid-back">
                    <div class="handwriting-paper">
                        <div class="back-header">DATE: ${memory.date || "2026-01-13"}</div>
                        <div class="back-comment">
                            ${memory.comment || "那一刻的悸动，都藏在这些文字里..."}
                        </div>
                        <div class="back-footer">
                            — ${chat.name}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
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
    const prompt = `请以【第三人称旁白】的视角，客观概括以下聊天记录的主要内容。

【要求】
1. 字数控制在100字以内
2. **视角严格限制**：必须使用第三人称！请用"${chat.name}"和"用户"来描述互动。
3. **严禁**使用"我"、"我们"、"你"这种第一/第二人称代词。
4. 内容概括：聊了什么话题、发生了什么事、有什么重要约定。
5. 不要分点，写成一段话。

【聊天记录】
${chatHistory.substring(0, 4000)}

【输出示例】
${chat.name}和用户讨论了工作上的事情，用户最近加班比较多，${chat.name}安慰了对方。两人还讨论了周末去哪玩，最后决定一起去看电影。`;


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
// ============ ❤️ 心率模拟系统 (新增) ============
function initHeartbeatSimulation() {
    console.log('心率模拟器已启动');
    setInterval(() => {
        const bpmEl = document.getElementById('heartbeatBpm');
        // 如果元素不存在或隐藏，就不跑
        if (!bpmEl || bpmEl.offsetParent === null) return;

        // 1. 获取基准心率 (存放在 data-base-bpm 属性中)
        let base = parseInt(bpmEl.dataset.baseBpm);
        
        // 如果没有基准值，就把当前显示的数字当作基准值初始化一下
        if (!base || isNaN(base)) {
            base = parseInt(bpmEl.textContent) || 72;
            bpmEl.dataset.baseBpm = base;
        }

        // 2. 计算随机波动 (-5 到 +5)
        const noise = Math.floor(Math.random() * 11) - 5; 
        const current = base + noise;

        // 3. 更新显示
        bpmEl.textContent = current;
        
        // 4. 顺便同步更新弹窗里的数值 (如果在打开状态)
        const statusBpmEl = document.getElementById('statusBpm');
        if (statusBpmEl && statusBpmEl.offsetParent !== null) {
            statusBpmEl.textContent = current + ' BPM';
        }
        
    }, 2000); // 每2秒跳动一次
}

// 启动！
window.addEventListener('DOMContentLoaded', function() {
    initHeartbeatSimulation();
});

// ============ 🌟 新增：智能历史记录提取器 (按轮次合并，过滤图片) ============
async function getSmartAnalysisHistory(limitRounds = 20) {
    return new Promise(resolve => {
        loadFromDB('messages', data => {
            const list = data && data.list ? data.list : [];
            // 1. 拿到当前角色的所有消息
            let chatMsgs = list.filter(m => m.chatId === currentChatId);
            
            // 2. 按时间正序排列
            chatMsgs.sort((a, b) => a.id - b.id);

            // 3. 智能清洗与合并
            let rounds = [];
            let currentBlock = null;

            // 获取当前角色名
            const chat = chats.find(c => c.id === currentChatId);
            const chatName = chat ? chat.name : '角色';

            chatMsgs.forEach(msg => {
                // --- 过滤垃圾数据 ---
                if (msg.isRevoked) return; // 跳过撤回
                if (msg.type === 'system') return; // 跳过系统消息
                
                // --- 处理内容 ---
                let content = msg.content;
                
                // ★★★ 核心修复：严禁发送 Base64 图片数据给 AI ★★★
                if (msg.type === 'image') {
                    content = `[发送了一张图片: ${msg.altText || '图片'}]`;
                } 
                else if (msg.type === 'voice') {
                    content = `[发送了语音]`;
                }
                else if (msg.type === 'transfer') {
                    content = `[转账交互]`;
                }
                else if (msg.type === 'shopping_order') {
                    content = `[购物交互]`;
                }

                // 确定发送者名称
                const senderName = msg.senderId === 'me' ? '用户' : chatName;

                // --- 合并连发逻辑 ---
                if (currentBlock && currentBlock.sender === senderName) {
                    // 如果还是同一个人发的，追加内容（用空格隔开）
                    currentBlock.content += " " + content;
                } else {
                    // 如果换人了，保存上一轮，开始新一轮
                    if (currentBlock) {
                        rounds.push(currentBlock);
                    }
                    currentBlock = {
                        sender: senderName,
                        content: content
                    };
                }
            });

            // 别忘了把最后一块加进去
            if (currentBlock) {
                rounds.push(currentBlock);
            }

            // 4. 截取最近的 N 轮 (例如最近 20 次交互，无论发了多少气泡，都算 20 次)
            const recentRounds = rounds.slice(-limitRounds);

            // 5. 格式化成文本
            const historyText = recentRounds.map(r => `${r.sender}: ${r.content}`).join('\n');

            console.log(`[智能提取] 提取了 ${recentRounds.length} 轮对话，文本长度: ${historyText.length}`);
            resolve({ 
                historyText: historyText, 
                roundCount: recentRounds.length 
            });
        });
    });
}


// ============ 通话气泡主题切换 ============

function applyCallTheme(theme) {
    const callScreen = document.getElementById('callScreen');
    if (callScreen) {
        callScreen.classList.remove('light-theme', 'dark-theme');
        callScreen.classList.add(theme + '-theme');
    }
}
// ============ 小窗 (PIP) 功能与用户头像 ============

// 显示/隐藏小窗
function togglePIPWindow() {
    const pipWindow = document.getElementById('pipWindow');
    pipWindow.style.display = pipWindow.style.display === 'none' ? 'flex' : 'none';
}

// 更新小窗头像
function updatePIPAvatar(avatarData) {
    const pipAvatar = document.getElementById('pipAvatar');
    if (pipAvatar) {
        if (avatarData) {
            pipAvatar.innerHTML = `<img src="${avatarData}" alt="用户头像">`;
        } else {
            pipAvatar.textContent = '👤';
        }
    }
}

// 更新上传框预览
function updateAvatarPreview(avatarData) {
    const userAvatarArea = document.getElementById('userAvatarArea');
    if (userAvatarArea) {
        if (avatarData) {
            userAvatarArea.style.backgroundImage = `url(${avatarData})`;
            userAvatarArea.classList.add('has-preview');
        } else {
            userAvatarArea.style.backgroundImage = '';
            userAvatarArea.classList.remove('has-preview');
        }
    }
}

// 保存用户头像（保存到 characterInfo 表）
function saveUserAvatar(avatarData) {
    if (!currentChatId) return;
    
    loadFromDB('characterInfo', (data) => {
        const allData = data || {};
        if (!allData[currentChatId]) allData[currentChatId] = {};
        
        // 保存到 userAvatar 字段
        allData[currentChatId].userAvatar = avatarData;
        
        saveToDB('characterInfo', allData);
        updatePIPAvatar(avatarData);
        updateAvatarPreview(avatarData);
    });
}

// 加载用户头像
function loadUserAvatarForChat() {
    if (!currentChatId) return;
    
    loadFromDB('characterInfo', (data) => {
        const charData = data && data[currentChatId] ? data[currentChatId] : {};
        const avatar = charData.userAvatar;
        
        updatePIPAvatar(avatar);
        updateAvatarPreview(avatar);
    });
}

// 监听用户头像文件选择
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        const userAvatarFile = document.getElementById('userAvatarFile');
        if (userAvatarFile) {
            // 移除旧的监听器，防止重复
            const newFile = userAvatarFile.cloneNode(true);
            userAvatarFile.parentNode.replaceChild(newFile, userAvatarFile);
            
            newFile.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const avatarData = event.target.result;
                        saveUserAvatar(avatarData);
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
    }, 500);
});

// 通话气泡主题切换
function applyCallTheme(theme) {
    const callScreen = document.getElementById('callScreen');
    if (callScreen) {
        callScreen.classList.remove('light-theme', 'dark-theme');
        callScreen.classList.add(theme + '-theme');
    }
}




// ============ 摄像头与视觉识别 (升级版：支持切换前后置) ============
let localStream = null;
let isCameraOn = false;
let currentFacingMode = 'environment'; 
// 1. 点击摄像头按钮
function toggleCamera() {
    if (isCameraOn) {
        stopCamera();
    } else {
        document.getElementById('cameraPrivacyModal').style.display = 'flex';
    }
}
// 2. 关闭隐私弹窗
function closeCameraPrivacyModal() {
    document.getElementById('cameraPrivacyModal').style.display = 'none';
}
// 3. 确认开启摄像头
async function confirmOpenCamera() {
    closeCameraPrivacyModal();
    await startCameraStream();
}
// ★★★ 新增：启动/切换摄像头流 ★★★
async function startCameraStream() {
    // 如果已有流，先停止
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    try {
        const pipWindow = document.getElementById('pipWindow');
        pipWindow.style.display = 'flex';
        
        // 请求摄像头
        localStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: currentFacingMode }, 
            audio: false 
        });
        
        const videoEl = document.getElementById('localVideo');
        const avatarEl = document.getElementById('pipAvatar');
        
        videoEl.srcObject = localStream;
        videoEl.style.display = 'block';
        avatarEl.style.display = 'none';
        
        // ★★★ 关键：前置镜像，后置不镜像 ★★★
        if (currentFacingMode === 'user') {
            videoEl.style.transform = 'scaleX(-1)';
        } else {
            videoEl.style.transform = 'none';
        }
        
        isCameraOn = true;
        
        // ★★★ 绑定点击切换事件 ★★★
        // 防止重复绑定
        videoEl.onclick = null; 
        videoEl.onclick = switchCameraMode;
        
    } catch (err) {
        console.error("摄像头开启失败:", err);
        alert("无法开启摄像头，请检查权限。");
    }
}
// ★★★ 新增：切换前后置 ★★★
async function switchCameraMode() {
    if (!isCameraOn) return;
    
    // 切换模式
    currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
    
    // 重新启动流
    await startCameraStream();
}
// 4. 关闭摄像头
function stopCamera() {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    
    const videoEl = document.getElementById('localVideo');
    const avatarEl = document.getElementById('pipAvatar');
    
    if (videoEl) {
        videoEl.srcObject = null;
        videoEl.style.display = 'none';
    }
    if (avatarEl) {
        avatarEl.style.display = 'flex';
    }
    
    isCameraOn = false;
    // 重置为前置，方便下次开启
    currentFacingMode = 'environment';
}
// 5. 截取当前视频帧 (用于发给 AI)
function captureVideoFrame() {
    if (!isCameraOn || !localStream) return null;
    
    const video = document.getElementById('localVideo');
    const canvas = document.createElement('canvas');
    canvas.width = 512; // 压缩尺寸，减少 Token
    canvas.height = 512;
    
    const ctx = canvas.getContext('2d');
    // 镜像翻转绘制，保持所见即所得
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // 返回 Base64 (JPEG 格式，质量 0.7)
    return canvas.toDataURL('image/jpeg', 0.7);
}
// ============ 修复版：实时刷新档案数字 ============
function updateArchiveCount() {
    // 如果没有当前角色ID，就不执行
    if (!currentChatId) return;
    
    loadFromDB('memories', (data) => {
        // 1. 兼容各种数据格式，确保拿到数组
        let allMemories = [];
        if (Array.isArray(data)) {
            allMemories = data;
        } else if (data && data.list) {
            allMemories = data.list;
        }
        
        // 2. 筛选：当前角色 + 类型是'moment'(时光相册)
        const momentCount = allMemories.filter(m => 
            m.chatId === currentChatId && m.type === 'moment'
        ).length;
        
        // 3. 找到界面上的元素并更新
        // 注意：这里对应的是界面上显示的数字 ID
        const countEl = document.getElementById('charFollowing'); 
        if (countEl) {
            countEl.textContent = momentCount;
            console.log('档案数字已更新为:', momentCount); // 调试日志
        }
    });
}
