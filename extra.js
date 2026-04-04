// ============ 模型适配工具 (新增) ============
// 检测模型类型
function detectModelType(apiKey, modelName) {
    const key = (apiKey || '').toLowerCase();
    const model = (modelName || '').toLowerCase();
    if (model.includes('claude') || key.includes('anthropic') || key.startsWith('sk-ant')) return 'claude';
    if (model.includes('gemini') || key.includes('google')) return 'gemini';
    return 'gemini';
}

// 强制修正格式 (专治 Claude 乱换行)
function fixResponseFormat(response, modelType) {
    if (!response) return '';
    let fixed = response;
    
    // 1. 移除所有换行符 (Claude 最爱换行)
    fixed = fixed.replace(/\n/g, '').replace(/\r/g, '');
    
    // 2. 移除 Markdown 加粗和列表
    fixed = fixed.replace(/\*\*/g, '').replace(/^[\-]\s*/g, '');
    
    // 3. 确保心声更新在最后且有分隔符
    const heartMatch = fixed.match(/\[心声更新\].*?\[\/心声更新\]/);
    if (heartMatch) {
        fixed = fixed.replace(heartMatch[0], '').trim();
        // 去掉末尾可能多余的 |||
        if (fixed.endsWith('|||')) fixed = fixed.slice(0, -3);
        fixed = fixed + '|||' + heartMatch[0];
    }
    
    // 4. 如果完全没有 |||，尝试智能分割 (兜底)
    if (!fixed.includes('|||')) {
        const parts = fixed.split(/([。！？…]+)/).filter(s => s.trim());
        const bubbles = [];
        for (let i = 0; i < parts.length; i += 2) {
            const sentence = parts[i] + (parts[i+1] || '');
            if(sentence && !sentence.includes('[心声更新]')) bubbles.push(sentence);
        }
        if (bubbles.length > 0) {
            fixed = bubbles.join('|||');
            if (heartMatch) fixed = fixed + '|||' + heartMatch[0];
        }
    }
    
    // 5. 清理多余分隔符
    fixed = fixed.replace(/\|\|\|+/g, '|||').replace(/^\|\|\|/, '').replace(/\|\|\|$/, '');
    return fixed;
}

// 通话专用格式修正（区分模型类型，默认 gemini）
function fixCallResponseFormat(response, modelType) {
    if (!response) return '';
    let fixed = response;

    // 1. 通用清理：移除 Markdown 加粗和列表符号
    fixed = fixed.replace(/\*\*/g, '').replace(/^[\-\*]\s*/gm, '');

    // 2. 统一换行符处理
    fixed = fixed.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // 3. 如果已经有 ||| 分隔符且数量>=3，说明格式基本正确，只做轻度清理
    const existingSeparators = (fixed.match(/\|\|\|/g) || []).length;
    if (existingSeparators >= 3) {
        console.log('[格式修正] 已有足够分隔符，仅做清理');
        fixed = fixed.replace(/\n+/g, '|||');
        fixed = fixed.replace(/\|\|\|+/g, '|||').replace(/^\|\|\|/, '').replace(/\|\|\|$/, '');
        return fixed.split('|||').map(s => s.trim()).filter(s => s.length > 0).join('|||');
    }

    // 4. Claude 强力修正
    if (modelType === 'claude') {
        console.log('[格式修正] Claude 模式：强力分割');

        // 4.1 先处理换行（如果有的话）
        fixed = fixed.replace(/\n+/g, '|||');

        // 4.2 保护特殊标记，防止内部被切割
        const protectedBlocks = [];
        fixed = fixed.replace(/[【\[]\s*(?:动作|消息|发送了表情|搜表情|图片|发送语音|转账)\s*[:：]?\s*[^】\]]*[】\]]/g, (match) => {
            const key = `__CALL_PROTECT_${protectedBlocks.length}__`;
            protectedBlocks.push({ key, raw: match });
            return key;
        });

        // 4.3 核心：按中文标点强制分割（句号、感叹号、问号、省略号后面跟文字）
        fixed = fixed.replace(/([。！？!?]+)/g, '$1|||');
        // 省略号后面跟文字也分割
        fixed = fixed.replace(/(\.{3}|…+)/g, '$1|||');

        // 4.4 还原被保护的标记
        protectedBlocks.forEach(b => {
            fixed = fixed.replace(b.key, b.raw);
        });

        // 4.5 确保 [动作] 和 [消息] 标签前后有 |||
        fixed = fixed.replace(/([^|])\s*(\[动作\]|【动作】)/g, '$1|||$2');
        fixed = fixed.replace(/(\[动作\][^|]*?)(\[消息\]|【消息】)/g, '$1|||$2');
        fixed = fixed.replace(/([^|])\s*(\[消息\]|【消息】)/g, '$1|||$2');
    }

    // 5. Gemini 轻度修正
    if (modelType === 'gemini') {
        console.log('[格式修正] Gemini 模式：轻度修正');
        fixed = fixed.replace(/\n+/g, '|||');

        // Gemini 偶尔不加分隔符时，也按标点分割
        if ((fixed.match(/\|\|\|/g) || []).length < 2) {
            fixed = fixed.replace(/([。！？!?]+)/g, '$1|||');
        }
    }

    // 6. 通用收尾
    fixed = fixed.replace(/\|\|\|+/g, '|||');
    fixed = fixed.replace(/^\|\|\|/, '');
    fixed = fixed.replace(/\|\|\|$/, '');
    fixed = fixed.split('|||').map(s => s.trim()).filter(s => s.length > 0).join('|||');

    return fixed;
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
    
// ★★★ 新增：读取日程数据 ★★★
const scheduleData = characterInfo.scheduleData || {};
let scheduleContext = "";
if (scheduleData.todayTimeline && scheduleData.todayTimeline.length > 0) {
 const timelineStr = scheduleData.todayTimeline.map(t => 
    `- ${t.time}: ${t.activity} (内心OS: ${t.comment}) ${t.withUser ? '[在一起]' : ''}`
).join('\n');
    
    scheduleContext = `
【你今天的行程表 (严格参考)】
${timelineStr}
(请根据当前时间判断你正在做什么。如果是共同活动，表现出你们在一起的状态。)
`;
} else {
    scheduleContext = `\n【行程】你今天暂时没有具体计划，按人设自由行动。`;
}



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

// ============ 日记详情：AI 绘图配图 (Pollinations.ai) ===========

// 1. 根据日记内容生成 AI 绘图 Prompt（关键词）
function buildDiaryImagePrompt(diary) {
    const title = diary.title || '';
    const weather = diary.weather || '';
    const mood = diary.mood || '';
    const tags = Array.isArray(diary.tags) ? diary.tags.slice(0, 3).join(' ') : '';

    // 关键词映射
    const sceneMap = {
        '晴': 'sunny', '雨': 'rainy', '雪': 'snowy', '阴': 'cloudy',
        '风': 'windy', '雾': 'foggy', '热': 'summer', '冷': 'winter',
        '开心': 'happy', '难过': 'sad', '生气': 'angry',
        '无聊': 'lazy', '期待': 'hopeful', '幸福': 'happy',
        '孤独': 'lonely', '兴奋': 'exciting', '平静': 'peaceful',
        '甜蜜': 'romantic', '思念': 'nostalgic', '感动': 'emotional',
        '吃': 'food', '睡': 'bedroom', '逛街': 'shopping',
        '旅行': 'travel', '学习': 'study', '工作': 'office',
        '运动': 'exercise', '游戏': 'gaming', '做饭': 'cooking',
        '音乐': 'music', '读书': 'reading', '咖啡': 'coffee',
        '家': 'home', '公园': 'park', '海边': 'beach',
        '山': 'mountain', '夜': 'night', '春': 'spring',
        '夏': 'summer', '秋': 'autumn', '冬': 'winter'
    };

    const combinedText = title + ' ' + weather + ' ' + mood + ' ' + tags;
    const matched = [];

    for (const [cn, en] of Object.entries(sceneMap)) {
        if (combinedText.includes(cn) && !matched.includes(en)) {
            matched.push(en);
        }
        if (matched.length >= 2) break;
    }

    if (matched.length === 0) matched.push('daily life');

    // ✅ 分离关键词和风格词
    const keywords = matched.join(','); // 只有场景关键词，给 Unsplash 搜索
    const fullPrompt = keywords + ', aesthetic photo'; // 记录用的完整 prompt

    console.log('[日记配图] 关键词：', keywords);
    console.log('[日记配图] 完整prompt：', fullPrompt);
    
    return { keywords, fullPrompt }; // 返回对象
}
// 2. 根据 prompt 生成稳定的 Unsplash URL
function getPollinationsImageUrl(promptObj) {
    if (!promptObj || !promptObj.keywords) return null;
    
    let hash = 0;
    for (let i = 0; i < promptObj.fullPrompt.length; i++) {
        hash = ((hash << 5) - hash) + promptObj.fullPrompt.charCodeAt(i);
        hash |= 0;
    }
    const seed = Math.abs(hash);
    
    // ✅ 用 Picsum 替代 Unsplash（100% 稳定）
    // Picsum 虽然随机，但 seed 固定意味着同一篇日记永远是同一张图
    return `https://picsum.photos/512/512?random=${seed}`;
}

// 3. 异步加载图片并保存到 DB（转 base64 存储，防止刷新变图）
async function loadDiaryImageIntoDetail(diary) {
    if (diary.coverImage || diary._isLoadingImage) return;
    diary._isLoadingImage = true;

    const prompt = buildDiaryImagePrompt(diary);
    const url = getPollinationsImageUrl(prompt);
    if (!url) {
        diary._isLoadingImage = false;
        return;
    }

    console.log('[日记配图] 请求URL：', url);
    const box = document.getElementById(`diaryCoverBox-${diary.id}`);

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('请求失败 ' + response.status);
        const blob = await response.blob();

        // ✅ 转成 base64 保存，这样图片永久固定不会变
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;

            diary.coverImage = dataUrl;
            diary._isLoadingImage = false;

            if (box) {
                box.innerHTML = `<img src="${dataUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:2px;">`;
                box.classList.add('loaded');
            }

            saveDiaryCoverImageToDB(diary.id, dataUrl);
            const localDiary = diaries.find(d => d.id === diary.id);
            if (localDiary) localDiary.coverImage = dataUrl;

            console.log('[日记配图] 成功!');
        };
        reader.readAsDataURL(blob);

    } catch (err) {
        console.warn('[日记配图] 失败：', err.message);
        diary._isLoadingImage = false;

        if (box && !box.classList.contains('loaded')) {
            const placeholderText = box.querySelector('.placeholder-text');
            if (placeholderText) placeholderText.textContent = '生成失败，点击重试';
            box.onclick = () => {
                box.onclick = null;
                diary._isLoadingImage = false;
                diary.coverImage = null;
                const pt = box.querySelector('.placeholder-text');
                if (pt) pt.textContent = 'AI Generating...';
                loadDiaryImageIntoDetail(diary);
            };
        }
    }
}

// 4. 写回数据库
function saveDiaryCoverImageToDB(diaryId, coverUrl) {
    loadFromDB('diaries', (data) => {
        const allDiaries = data && data.list ? data.list : [];
        const idx = allDiaries.findIndex(d => d.id === diaryId);
        if (idx === -1) return;

        allDiaries[idx].coverImage = coverUrl;

        const transaction = db.transaction(['diaries'], 'readwrite');
        const objectStore = transaction.objectStore('diaries');
        objectStore.put({ id: 1, list: allDiaries });
    });
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
                        <!-- 给容器加个 ID，方便异步替换 -->
<div class="polaroid-img" id="diaryCoverBox-${diary.id}">
    ${diary.coverImage ? `
        <img src="${diary.coverImage}" style="width:100%;height:100%;object-fit:cover;border-radius:2px;">
    ` : `
        <div class="polaroid-placeholder">
            <!-- loading 动画（可选，用简单的 CSS 旋转或者保留原样） -->
            <svg class="placeholder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
            <span class="placeholder-text">AI Generating...</span>
        </div>
    `}
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
    // 如果没有封面图，且不是正在加载中，触发 AI 绘图
    if (!diary.coverImage && !diary._isLoadingImage) {
        loadDiaryImageIntoDetail(diary);
    }
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

// 智能搜索表情包（支持多维度匹配）- 修复版
function searchEmojiByKeyword(keyword) {
    if (!keyword || emojis.length === 0) return null;
    
    keyword = keyword.trim().toLowerCase();
    
    // 第一优先级：精确匹配文字描述
    let match = emojis.find(e => e.text.toLowerCase() === keyword);
    if (match) {
        console.log('✅ 表情包精确匹配:', keyword, '->', match.text);
        return match;
    }
    
    // 第二优先级：文字描述包含关键词
    match = emojis.find(e => e.text.toLowerCase().includes(keyword));
    if (match) {
        console.log('✅ 表情包包含匹配:', keyword, '->', match.text);
        return match;
    }
    
    // 第三优先级：关键词包含文字描述
    match = emojis.find(e => keyword.includes(e.text.toLowerCase()));
    if (match) {
        console.log('✅ 表情包反向匹配:', keyword, '->', match.text);
        return match;
    }
    
    // 第四优先级：情绪标签匹配（★核心功能）
    const keywordTags = generateEmotionTags(keyword);
    if (keywordTags.length > 0) {
        let bestMatch = null;
        let maxMatches = 0;
        
        for (let emoji of emojis) {
            if (!emoji.emotionTags) continue;
            
            const matchCount = emoji.emotionTags.filter(tag => 
                keywordTags.includes(tag)
            ).length;
            
            if (matchCount > maxMatches) {
                maxMatches = matchCount;
                bestMatch = emoji;
            }
        }
        
        if (bestMatch) {
            console.log('✅ 表情包情绪匹配:', keyword, '->', bestMatch.text);
            return bestMatch;
        }
    }
    
    // ★★★ 修复：找不到就返回 null，不要随机选 ★★★
    console.warn('⚠️ 表情包未找到匹配:', keyword);
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

// 将图片压缩到较小尺寸，返回 dataURL（JPEG）
function compressImageToDataUrl(dataUrl, maxSide = 1024, quality = 0.78) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            let { width, height } = img;

            // 不放大，只缩小
            const longSide = Math.max(width, height);
            if (longSide > maxSide) {
                const scale = maxSide / longSide;
                width = Math.round(width * scale);
                height = Math.round(height * scale);
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // 用 JPEG 输出通常比 PNG 小很多
            const out = canvas.toDataURL('image/jpeg', quality);
            resolve(out);
        };
        img.onerror = () => reject(new Error('图片加载失败，无法压缩'));
        img.src = dataUrl;
    });
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
    const originalDataUrl = e.target.result;

    compressImageToDataUrl(originalDataUrl, 1024, 0.78)
        .then((compressed1) => {
            if (compressed1.length <= 2000000) return compressed1;
            return compressImageToDataUrl(originalDataUrl, 768, 0.72);
        })
        .then((imageData) => {
            if (imageData.length > 2000000) {
                alert('这张图片太大了，压缩后仍无法发送。建议截小一点再试。');
                return;
            }

            // 生成新消息ID（保留你原来的逻辑）
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
        })
        .catch((err) => {
            console.error(err);
            alert('图片处理失败：' + (err && err.message ? err.message : err));
        });
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

// 通话回复安全清洗：禁止 HTML / 卡片代码 / 功能指令泄露
function sanitizeCallReplyForDisplay(rawText) {
    if (!rawText) return '';
    
    let text = String(rawText);

    // 1) 去掉 HTML 卡片块
    text = text.replace(/\[\[CARD_HTML\]\][\s\S]*?\[\[\/CARD_HTML\]\]/gi, '');

    // 2) 去掉 markdown 代码块
    text = text.replace(/```[\s\S]*?```/g, '');

    // 3) 去掉所有 HTML/XML 标签
    text = text.replace(/<\/?[^>]+>/g, '');

    // 4) 去掉通话中不允许的功能指令（保留 [动作]/[消息]）
    text = text.replace(/[【\[]\s*(?!动作|消息)(?:[^】\]]+)\s*[】\]]/g, '');

    // 5) 清理换行和多余空白
    text = text.replace(/[\r\n]+/g, '').replace(/\s{2,}/g, ' ').trim();

    return text;
}

      
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
     // ★★★ 修复：将外面的底部白条改为半透明黑色 ★★★
    const callInputEl = document.getElementById('callInput');
    if (callInputEl) {
        // 1. 找到包裹输入框的父容器（也就是那个白色的底栏）
        const bottomBar = callInputEl.parentElement;
        
        if (bottomBar) {
            // 修改背景为半透明黑 + 磨砂
            bottomBar.style.background = 'rgba(0, 0, 0, 0)'; 
           
            bottomBar.style.borderTop = '1px solid rgba(255, 255, 255, 0)'; // 边框变淡
            
            // 2. 把底栏里的所有按钮图标变成白色（防止黑色背景下看不清）
            const buttons = bottomBar.querySelectorAll('button');
            buttons.forEach(btn => {
                btn.style.color = 'rgba(0, 0, 0, 0.9)'; // 按钮文字/图标颜色
            });
            
            // 3. 同时也微调一下输入框本身，让它更融合
            callInputEl.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'; // 输入框背景深一点
            callInputEl.style.color = '#000000'; // 输入文字白色
            callInputEl.style.border = 'none';
        }
    }
    
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

// 中文注释：生成端开关：必须“角色开了html插件”且“关联世界书存在html分类内容”才允许模型输出卡片
const htmlWorldbookRef = await getLinkedHtmlWorldbooksContent(characterInfo.linkedWorldbooks);
const allowHtmlCard = (characterInfo.htmlPluginEnabled === true) && (String(htmlWorldbookRef || '').trim().length > 0);



    
// 6. 构建消息上下文 (识图兼容性终极加固版)
        const contextRounds = characterInfo.contextRounds || 30;
        const recentMessages = allMessages.slice(-(contextRounds * 2)).map(msg => {
            let content;

if (msg.type === 'image') {
    // ★★★ 修改：区分表情包、世界书图、普通图片 ★★★
    if (msg.isSticker) {
        content = `[发送了表情: ${msg.altText || '图片'}]`;
    } else if (msg.content && (msg.content.startsWith('http://') || msg.content.startsWith('https://'))) {
        // 世界书图：URL格式的图片，不显示"发送了一张图片"，直接跳过或标记为背景
        content = `[图片]`;
    } else {
        // 用户上传的图片：base64格式
        content = ` [发送了一张图片: ${msg.altText || '图片'}]`;
    }
}


            // --- 以下部分严禁修改，保持你原有的逻辑完整性 ---
            else if (msg.type === 'transfer') {
                const data = msg.transferData;
                const statusStr = data.status === 'sent' ? '待领取' : '已领取';
                content = `[系统消息：我给你转账了 ¥${data.amount}，状态：${statusStr}，备注：${data.note || '无'}]`;
            } 
            else if (msg.type === 'shopping_order') {
                const data = msg.orderData;
                const items = data.items.map(i => i.name).join('、');
                let orderDesc = "";
                if (data.orderType === 'buy_for_ta') orderDesc = `用户送了你礼物：${items} (¥${data.totalPrice})，你已收下。`;
                else if (data.orderType === 'ask_ta_pay') orderDesc = `用户请求你代付：${items} (¥${data.totalPrice})，当前状态：${data.status === 'pending'?'待确认':data.status}。`;
                else if (data.orderType === 'ai_buy_for_user') orderDesc = `你给用户买了：${items}。`;
                else if (data.orderType === 'ai_ask_user_pay') orderDesc = `你请求用户代付：${items}。`;
                content = `[系统记录] ${orderDesc}`;
            }
            else if (msg.type === 'voice') {
                content = `[语音消息: ${msg.content}]`;
            }
            else if (msg.type === 'system') {
                content = `[系统通知] ${msg.content}`;
            }
            else {
                content = `${msg.content}`;
            }
            
            return {
                role: msg.senderId === 'me' ? 'user' : 'assistant',
                content: content
            };
        });





    // === 2. 构建系统提示词 (加强接听逻辑) ===
    let systemPrompt = `你是${chat.name}。现在是${dateStr} ${timeStr}。

格式铁律：必须使用 ||| 分隔气泡，8-12条，每条10-40字，完整收束，无换行。违反任何一条视为失败。

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
必须严格按照以下格式返回，不能有任何偏差：
[动作]你的动作描述|||[消息]第一条|||第二条|||第三条

【格式示例】
[动作]靠近屏幕，眼睛闪闪发光，嘴角带着温暖的笑容|||[消息]嘿，看到你了~|||你今天过得怎么样？|||我一直在想你呢。

【严格要求】
1. 必须以 [动作] 开头，描述你的动作（30-50字）
2. 然后是 ||| 分隔符
3. 然后是 [消息] 标记
4. 每句话用 ||| 分隔，不能合并
5. 每句话 10-30 字
6. 总共 4-8 条消息


请现在接听电话。`;
    
    try {
        const url = currentApiConfig.baseUrl.endsWith('/') 
            ? currentApiConfig.baseUrl + 'chat/completions'
            : currentApiConfig.baseUrl + '/chat/completions';
            

 // 获取模型
const modelToUse = currentApiConfig.model || currentApiConfig.defaultModel || 'gpt-3.5-turbo';
           
        // === 3. 组合消息历史发送给 AI ===
        const messages = [
            { role: 'system', content: systemPrompt },
            ...recentMessages, // 把历史记录塞进去
            { role: 'user', content: "（用户拨通了你的视频电话，请接听并回应刚才的话题）" } // 触发语
        ];

        // ★★★ 新增：为 Claude 注入角色扮演预设（与聊天保持一致）★★★
        const isClaude = modelToUse.toLowerCase().includes('claude') || 
                        (currentApiConfig.apiKey && currentApiConfig.apiKey.toLowerCase().includes('anthropic'));
        if (isClaude) {
            messages.splice(1, 0, {
                role: 'assistant',
                content: `明白了，我现在完全进入【${chat.name}】的角色。我不是 AI 助手，我就是${chat.name}本人。我会严格按照 [动作]描述|||[消息]内容|||内容 的格式回复，绝不换行，绝不使用 Markdown，绝不说"我是 AI"。现在开始，我就是${chat.name}。`
            });
            console.log('✅ [通话接听] 已为 Claude 注入角色扮演预设');
        }


        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentApiConfig.apiKey}`,
                'Content-Type': 'application/json'
            },
          body: JSON.stringify({
    model: modelToUse,
    messages: messages,
    // ★★★ 修改：优先使用配置温度，没有则默认 0.7 ★★★
    temperature: (currentApiConfig.temperature !== undefined) ? currentApiConfig.temperature : 0.7,
    stream: false
})
        });
        
        if (!response.ok) throw new Error('接听失败');
        
        const data = await response.json();
        let aiReply = data.choices[0].message.content.trim();
aiReply = sanitizeCallReplyForDisplay(aiReply);

               // ★★★ 新增：检测模型类型，针对性修正通话格式 ★★★
        const detectedCallModel = detectModelType(currentApiConfig.apiKey, modelToUse);
        if (!aiReply.trim().startsWith('{')) {
            console.log('[通话接听] 检测到模型类型:', detectedCallModel);
            aiReply = fixCallResponseFormat(aiReply, detectedCallModel);
        }
        
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
    aiReply = sanitizeCallReplyForDisplay(aiReply);

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

【视频通话模式 - 当前状态】
⚠️ 你正在和对方视频通话，你能看到对方的实时画面 ⚠️
【视频通话严格限制（最高优先级）】
❌ 绝对禁止使用以下功能（违反视为失败）：
- 表情包指令：[搜表情:xxx] 或 【搜表情:xxx】
- 图片指令：[图片:xxx] 或 【图片:xxx】
- 语音指令：[发送语音:xxx] 或 【发送语音:xxx】
- 购物指令：{"action":"send_gift",...} 或任何 JSON 格式
- 转账指令：[转账:xxx] 或 【转账:xxx】
- HTML卡片：[[CARD_HTML]]...[[/CARD_HTML]]

✅ 只能使用：
- 纯文字对话（就像打电话或视频聊天时自然说话）
- [动作] 标记（描述你的肢体动作、表情、眼神）

【重要：根据聊天历史回复】
你必须：
1. 参考之前的聊天记录，理解对话的上下文
2. 根据角色人设和对方人设来思考如何回复
3. 回复要符合角色的性格、语气和说话习惯
4. 不要忽视之前说过的话，保持对话的连贯性
5. 思考对方说了什么，然后给出有意义的回复，而不是随意应答
6. 视频通话刚开始时，自然延续刚才的对话话题，不要突然转换话题

【回复格式 - 严格遵守（违反任何一条视为失败）】
⚠️ 必须严格按照以下格式返回，不能有任何偏差 ⚠️
格式模板：
[动作]你的动作描述|||[消息]第一条|||第二条|||第三条|||第四条

【格式检查清单（发送前必须逐条确认）】
✅ 是否以 [动作] 开头？（30-50字，描述肢体动作、表情、眼神）
✅ [动作] 后面是否紧跟 ||| 分隔符？
✅ 是否有 [消息] 标记？
✅ 每条消息是否用 ||| 分隔？
✅ 每条消息是否 10-30 字？
✅ 总共是否有 4-8 条消息？
✅ 是否完全没有使用任何功能指令（表情包/图片/语音/购物/转账/HTML）？

【格式示例（严格参考）】
正确示例：
[动作]靠近屏幕，眼睛闪闪发光，嘴角带着温暖的笑容|||[消息]嘿，看到你了~|||你今天过得怎么样？|||我一直在想你呢|||刚才聊到哪了？

【严格要求（再次强调）】
1. 必须以 [动作] 开头，描述你的动作（30-50字）
2. 然后是 ||| 分隔符（3个竖线）
3. 然后是 [消息] 标记
4. 每句话用 ||| 分隔，不能合并，不能少|
5. 每句话 10-30 字
6. 总共 4-8 条消息
7. 严禁使用任何功能指令
⚠️ 记住：这是视频通话，不是文字聊天，你只能用自然的语言交流！⚠️`;
    
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

        // ★★★ 新增：为 Claude 注入角色扮演预设（与聊天保持一致）★★★
        const modelToUse = currentApiConfig.model || currentApiConfig.defaultModel || 'gpt-3.5-turbo';
        const isClaude = modelToUse.toLowerCase().includes('claude') || 
                        (currentApiConfig.apiKey && currentApiConfig.apiKey.toLowerCase().includes('anthropic'));
        if (isClaude) {
            messages.splice(1, 0, {
                role: 'assistant',
                content: `明白了，我现在完全进入【${chat.name}】的角色。我不是 AI 助手，我就是${chat.name}本人。我会严格按照 [动作]描述|||[消息]内容|||内容 的格式回复，绝不换行，绝不使用 Markdown，绝不说"我是 AI"。现在开始，我就是${chat.name}。`
            });
            console.log('✅ [通话回复] 已为 Claude 注入角色扮演预设');
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
    model: currentApiConfig.model || currentApiConfig.defaultModel || 'gpt-3.5-turbo',
    messages: messages,  // ← 这里改了，原来错误地写成了 diaryPrompt
    temperature: (currentApiConfig.temperature !== undefined) ? currentApiConfig.temperature : 0.7
})
        });
        
        if (!response.ok) throw new Error('接收失败');
        
        const data = await response.json();
        
        let aiReply = data.choices[0].message.content.trim();
        console.log('🤖 AI原始回复（完整）:', aiReply);
        
   
        // ========== 视频通话禁用所有功能指令（强制过滤） ==========
// 移除所有功能标记，只保留 [动作] 和 [消息]
aiReply = aiReply
    // 移除表情包
    .replace(/[\[【](?:搜表情|表情包|表情|EMOJI)[:：]\s*.*?[\]】]/gi, '')
    // 移除图片
    .replace(/[\[【]图片[:：]\s*.*?[\]】]/g, '')
    // 移除语音
    .replace(/[\[【]发送语音[:：]\s*.*?[\]】]/g, '')
    // 移除购物 JSON
    .replace(/\{.*?"action"\s*:\s*"(?:send_gift|ask_user_pay)".*?\}/g, '')
    // 移除转账
    .replace(/[\[【]转账[:：]\s*.*?[\]】]/g, '')
    // 移除 HTML 卡片
    .replace(/\[\[CARD_HTML\]\][\s\S]*?\[\[\/CARD_HTML\]\]/g, '')
    // 移除其他功能标记（保留 [动作] 和 [消息]）
    .replace(/[\[【](?!动作|消息).*?[\]】]/g, '');

console.log('🧹 已过滤视频通话禁用指令，清理后:', aiReply);

// 二次兜底：清理可能残留的 HTML 代码
aiReply = sanitizeCallReplyForDisplay(aiReply);

// ========== 过滤结束 ==========

            // ★★★ 新增：检测模型类型，针对性修正通话格式 ★★★
        const detectedCallModel = detectModelType(currentApiConfig.apiKey, currentApiConfig.model || currentApiConfig.defaultModel || 'gpt-3.5-turbo');
        if (!aiReply.trim().startsWith('{')) {
            console.log('[通话回复] 检测到模型类型:', detectedCallModel);
            aiReply = fixCallResponseFormat(aiReply, detectedCallModel);
        }
        
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


// ============ 购物世界书关联功能 ============

// 打开购物世界书选择弹窗
function openShoppingWorldbookModal() {
    document.getElementById('shoppingWorldbookModal').style.display = 'flex';
    renderShoppingWorldbookList();
}

// 关闭弹窗
function closeShoppingWorldbookModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('shoppingWorldbookModal').style.display = 'none';
}

// 渲染世界书列表
function renderShoppingWorldbookList() {
    const container = document.getElementById('shoppingWorldbookList');
    
    // 读取所有世界书
    loadFromDB('worldbooks', (data) => {
        const allWorldbooks = Array.isArray(data) ? data : [];
        
        if (allWorldbooks.length === 0) {
            container.innerHTML = '<div style="text-align:center; color:#999; padding:30px;">暂无世界书</div>';
            return;
        }
        
        // 读取当前角色的购物关联设置
        loadFromDB('characterInfo', (charData) => {
            const currentCharData = charData && charData[currentChatId] ? charData[currentChatId] : {};
            const linkedIds = currentCharData.shoppingLinkedWorldbooks || [];
            
            // 更新计数显示
            document.getElementById('shoppingWorldbookSelectedCount').textContent = linkedIds.length;
            updateShoppingWorldbookBadge(linkedIds.length);
            
            // 渲染列表
            container.innerHTML = allWorldbooks.map(wb => {
                const isChecked = linkedIds.includes(wb.id);
                return `
                <label style="display:flex; align-items:center; padding:12px; border-bottom:1px solid #f5f5f5; cursor:pointer;">
                    <input type="checkbox" 
                           data-wb-id="${wb.id}" 
                           ${isChecked ? 'checked' : ''} 
                           onchange="toggleShoppingWorldbook(${wb.id})"
                           style="margin-right:10px; accent-color:#333;">
                    <div style="flex:1;">
                        <div style="font-size:14px; font-weight:600; color:#333;">${wb.title}</div>
                        <div style="font-size:11px; color:#999; margin-top:2px;">${wb.category || '默认分类'}</div>
                    </div>
                </label>
                `;
            }).join('');
        });
    });
}

// 切换世界书选中状态
function toggleShoppingWorldbook(wbId) {
    // 这里只更新界面，实际保存在点击"保存"按钮时执行
    const checkboxes = document.querySelectorAll('#shoppingWorldbookList input[type="checkbox"]');
    const selectedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
    document.getElementById('shoppingWorldbookSelectedCount').textContent = selectedCount;
}

// 保存购物世界书选择
function saveShoppingWorldbookSelection() {
    if (!currentChatId) {
        alert('请先打开聊天');
        return;
    }
    
    // 获取所有选中的世界书 ID
    const checkboxes = document.querySelectorAll('#shoppingWorldbookList input[type="checkbox"]:checked');
    const selectedIds = Array.from(checkboxes).map(cb => parseInt(cb.dataset.wbId));
    
    // 保存到数据库
    loadFromDB('characterInfo', (data) => {
        const allData = data || {};
        if (!allData[currentChatId]) allData[currentChatId] = {};
        
        allData[currentChatId].shoppingLinkedWorldbooks = selectedIds;
        
        saveToDB('characterInfo', allData);
        
        // 更新徽章显示
        updateShoppingWorldbookBadge(selectedIds.length);
        
        alert('保存成功！');
        closeShoppingWorldbookModal();
    });
}

// 更新按钮徽章显示
function updateShoppingWorldbookBadge(count) {
    const badge = document.getElementById('shoppingWorldbookBadge');
    if (badge) {
        if (count > 0) {
            badge.textContent = count;
            badge.style.display = 'block';
        } else {
            badge.style.display = 'none';
        }
    }
}

// 在打开购物页面时更新徽章
const originalOpenShopping = openShopping;
openShopping = function() {
    originalOpenShopping();
    
    // 延迟更新徽章，确保页面已渲染
    setTimeout(() => {
        if (currentChatId) {
            loadFromDB('characterInfo', (data) => {
                const charData = data && data[currentChatId] ? data[currentChatId] : {};
                const linkedIds = charData.shoppingLinkedWorldbooks || [];
                updateShoppingWorldbookBadge(linkedIds.length);
            });
        }
    }, 100);
};


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
        senderId: orderType.startsWith('ai_') ? chat.name : 'me',
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
     playNotificationSound();
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
async function generateProducts() {  // ← 这里加上 async
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

        // ============ 新增：世界书关联逻辑 ============
        const charData = await new Promise(resolve => {
            loadFromDB('characterInfo', data => {
                resolve(data && data[currentChatId] ? data[currentChatId] : {});
            });
        });

        const linkedWorldbookIds = charData.shoppingLinkedWorldbooks || [];
        let worldbookContext = '';

        if (linkedWorldbookIds.length > 0) {
            const allWorldbooks = await new Promise(resolve => {
                loadFromDB('worldbooks', data => {
                    resolve(Array.isArray(data) ? data : []);
                });
            });
            
            const linkedBooks = allWorldbooks.filter(wb => linkedWorldbookIds.includes(wb.id));
            
            if (linkedBooks.length > 0) {
                worldbookContext = '\n\n【世界观设定（必须严格遵守）】\n' + 
                    linkedBooks.map(wb => `${wb.title}：${wb.content}`).join('\n\n') +
                    '\n\n⚠️ 商品名称、价格、描述都必须体现上述世界观特色！';
            }
        }
        // ============ 世界书逻辑结束 ============
        
        if (currentShoppingType === 'goods') {
            prompt = `你是一个电商文案专家。用户搜索关键词：${keyword}。
${worldbookContext}
请生成12346789-=7890789078907890789078907890789078907890789078907890789078907890789078907890789078907890789078907890789078907890789078907890789078907890789078907890789078907890789078907890789078907890789078907890789078907890789010个相关商品，必须严格按照以下${worldbookContext ? '世界观风格' : '淘宝/拼多多风格'}生成：

1. 【商品名称】：${worldbookContext ? '必须体现世界观特色' : '必须堆砌关键词'}！${worldbookContext ? '' : '公式：[形容词/年份]+[核心词]+[材质/风格]+[修饰词]+[适用人群]。'}字数要在15-30字之间。
   例如："${worldbookContext ? '【示例】赛博朋克世界 -> "2077款霓虹光纤编织战术背包 智能防盗芯片内置 | 古代世界 -> "大明永乐年制青花瓷茶盏 官窑精品 文人雅士专用"' : '2025新款韩版宽松羽绒服女中长款白鸭绒连帽加厚保暖外套ins潮'}"

2. 【价格】：只输出数字${worldbookContext ? '（符合世界观经济体系）' : ''}。

3. 【描述】：输出3-4个营销标签，用竖线"|"分隔。
   ${worldbookContext ? '必须包含世界观元素' : '包括：销量、包邮、发货地、退换货服务等'}。
   例如："${worldbookContext ? '🔥黑市热销 | ✅匿名配送 | 💎稀有品质' : '🔥月销1万+ | ✅包邮 | 极速退款 | 广东发货'}"

输出格式（严禁多余废话）：
商品名1|||价格1|||描述1|||商品名2|||价格2|||描述2...`;

        } else {
            prompt = `你是一个外卖推荐系统。用户想吃：${keyword}。
${worldbookContext}
请生成10个相关外卖菜品，严格按照以下${worldbookContext ? '世界观风格' : '美团/饿了么风格'}生成：

1. 【商品名称】：${worldbookContext ? '必须体现世界观特色的套餐名' : '必须是诱人的套餐名'}！${worldbookContext ? '' : '公式：[招牌/推荐]+[主菜]+[配菜/饮料]+[口味形容]。'}
   例如："${worldbookContext ? '【示例】赛博朋克世界 -> "【夜之城特供】合成蛋白质能量棒+纳米修复饮 | 古代世界 -> "【御膳房秘制】红烧狮子头+碧螺春茶一壶"' : '【门店销冠】脆皮手枪腿饭 + 卤蛋 + 冰镇可乐（超级满足）'}"

2. 【价格】：只输出数字${worldbookContext ? '（符合世界观经济体系）' : ''}。

3. 【描述】：输出3-4个外卖数据标签，用竖线"|"分隔。
   ${worldbookContext ? '必须包含世界观元素' : '必须包括：评分、送达时间、月售、人均等'}。
   例如："${worldbookContext ? '⭐黑市好评 | 🚀无人机配送 | 月售999+' : '⭐4.9分 | 🚀30分钟送达 | 月售9999+ | 0配送费'}"

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
        
        // 解析并保存商品
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


// ============ 组件设置逻辑（整理版：便签=纯图片）===========

// 临时图片（仅音乐用）
let tempWidgetImages = {
    musicBg: null,
    musicCover: null
};

// 便签图片：临时值（本地上传 dataURL）
let noteTempImage = null;

function renderNoteImageWidget(settings) {
    const img = document.getElementById('noteImageDisplay');
    const frame = document.getElementById('noteImageFrame');
    if (!img || !frame) return;

    const s = settings || {};
    const noteImage = s.noteImage || null;

    if (noteImage) {
        img.src = noteImage;
        img.style.display = 'block';
        frame.classList.remove('is-empty');
    } else {
        img.style.display = 'none';
        frame.classList.add('is-empty');
    }
}

function clearNoteImage() {
    noteTempImage = '';
    const preview = document.getElementById('noteImagePreview');
    if (preview) {
        preview.style.display = 'none';
        preview.style.backgroundImage = '';
    }
}

function saveNoteImage() {
    loadFromDB('widgetSettings', (data) => {
        const settings = data || {};

        if (noteTempImage !== null) {
            settings.noteImage = noteTempImage || null;
        }

        saveToDB('widgetSettings', settings);
        renderNoteImageWidget(settings);
        closeWidgetSettings('note');
    });
}

// 1) 初始化组件数据（启动时调用）
function loadWidgetSettings() {
    loadFromDB('widgetSettings', (data) => {
        const settings = data || {};

        // === 音乐组件设置 ===
        const musicWidget = document.querySelector('.music-widget');
        if (musicWidget) {
            if (settings.musicBg) {
                musicWidget.style.backgroundImage = `url(${settings.musicBg})`;
            } else {
                musicWidget.style.backgroundImage = '';
            }
        }

        const musicCover = document.getElementById('musicCoverDisplay');
        if (musicCover) {
            if (settings.musicCover) {
                musicCover.src = settings.musicCover;
                musicCover.style.display = 'block';
            } else {
                musicCover.style.display = 'none';
            }
        }

        if (settings.musicTitle) {
            const titleEl = document.querySelector('.music-title');
            if (titleEl) titleEl.textContent = settings.musicTitle;
        }
        if (settings.musicArtist) {
            const artistEl = document.querySelector('.music-desc');
            if (artistEl) artistEl.textContent = settings.musicArtist;
        }

        // 应用音乐字体颜色（music-icon 已被你删除，所以这里判空）
        const musicTitleEl = document.querySelector('.music-title');
        const musicDescEl = document.querySelector('.music-desc');
        if (settings.musicTextColor) {
            if (musicTitleEl) musicTitleEl.style.color = settings.musicTextColor;
            if (musicDescEl) musicDescEl.style.color = settings.musicTextColor;
        } else {
            if (musicTitleEl) musicTitleEl.style.color = 'white';
            if (musicDescEl) musicDescEl.style.color = 'white';
        }

        // === 便签组件（纯图片） ===
        renderNoteImageWidget(settings);
    });
}

// 2) 打开组件设置弹窗
function openWidgetSettings(type) {
    loadFromDB('widgetSettings', (data) => {
        const settings = data || {};

        if (type === 'music') {
            document.getElementById('musicSettingsModal').style.display = 'flex';

            const currentTitle = document.querySelector('.music-title')?.textContent || '';
            const currentArtist = document.querySelector('.music-desc')?.textContent || '';

            document.getElementById('musicTitleInput').value = currentTitle;
            document.getElementById('musicArtistInput').value = currentArtist;

            document.getElementById('musicTextColorInput').value = settings.musicTextColor || '#ffffff';
            return;
        }

        if (type === 'note') {
            document.getElementById('noteSettingsModal').style.display = 'flex';

            noteTempImage = null;

            const preview = document.getElementById('noteImagePreview');
            if (preview) {
                if (settings.noteImage) {
                    preview.style.display = 'block';
                    preview.style.backgroundImage = `url(${settings.noteImage})`;
                } else {
                    preview.style.display = 'none';
                    preview.style.backgroundImage = '';
                }
            }

            const input = document.getElementById('noteImageInput');
            if (input) input.value = '';
            return;
        }
    });
}

// 3) 关闭组件设置弹窗
function closeWidgetSettings(type) {
    const modal = document.getElementById(type + 'SettingsModal');
    if (modal) modal.style.display = 'none';

    // 清理临时数据
    tempWidgetImages.musicBg = null;
    tempWidgetImages.musicCover = null;
    noteTempImage = null;
}

// 4) 处理组件图片上传预览（音乐用）
function handleWidgetImage(input, previewId) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            if (input.id === 'musicBgInput') tempWidgetImages.musicBg = e.target.result;
            if (input.id === 'musicCoverInput') tempWidgetImages.musicCover = e.target.result;

            const preview = document.getElementById(previewId);
            if (preview) {
                preview.style.backgroundImage = `url(${e.target.result})`;
                preview.style.display = 'block';
            }
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// 5) 清除音乐组件预览（音乐用）
function clearWidgetImage(type) {
    tempWidgetImages[type] = '';

    const preview = document.getElementById(type + 'Preview');
    if (preview) {
        preview.style.backgroundImage = '';
        preview.style.display = 'none';
    }

    const input = document.getElementById(type + 'Input');
    if (input) input.value = '';
}

// 6) 保存音乐组件设置
function saveMusicSettings() {
    const title = document.getElementById('musicTitleInput').value;
    const artist = document.getElementById('musicArtistInput').value;
    const textColor = document.getElementById('musicTextColorInput').value;

    loadFromDB('widgetSettings', (oldData) => {
        const currentData = oldData || {};
        const newData = {
            ...currentData,
            musicTitle: title,
            musicArtist: artist,
            musicTextColor: textColor
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

// 7) 绑定便签图片 input（只本地上传）
window.addEventListener('DOMContentLoaded', function() {
    const noteImageInput = document.getElementById('noteImageInput');
    if (!noteImageInput) return;

    noteImageInput.addEventListener('change', function(e) {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            noteTempImage = ev.target.result;

            const preview = document.getElementById('noteImagePreview');
            if (preview) {
                preview.style.display = 'block';
                preview.style.backgroundImage = `url(${noteTempImage})`;
            }
        };
        reader.readAsDataURL(file);

        noteImageInput.value = '';
    });
});


// ============ 记忆空间核心逻辑 ============

let currentMemoryTab = 'tags';
let editingMemoryId = null;
let currentMemEditType = 'tag'; // 'tag' or 'moment'

// 1. 打开/关闭页面

function backToCharacterInfoFromMemory() {
    document.getElementById('memoryScreen').style.display = 'none';
    document.getElementById('characterInfoScreen').style.display = 'flex';
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
    
    // 内部辅助函数：安全解析日期 (兼容中文和无年份格式)
    const parseDateSafe = (dateStr) => {
        if (!dateStr) return 0;
        // 转为字符串以防万一
        let str = String(dateStr).trim();
        
        // 1. 尝试直接解析标准格式 (如 "2024-05-20")
        let timestamp = new Date(str).getTime();
        if (!isNaN(timestamp)) return timestamp;
        
        // 2. 处理中文格式 "2024年5月20日" -> "2024/5/20" (斜杠兼容性更好)
        let cleanStr = str.replace(/年|月/g, '/').replace(/日/g, '').trim();
        timestamp = new Date(cleanStr).getTime();
        if (!isNaN(timestamp)) return timestamp;
        
        // 3. 处理无年份格式 (如 "05-20" 或 "5/20") -> 补全当前年份
        const currentYear = new Date().getFullYear();
        // 尝试拼上年份再解析
        let withYear = `${currentYear}/${cleanStr}`;
        timestamp = new Date(withYear).getTime();
        if (!isNaN(timestamp)) return timestamp;
        
        // 4. 如果还是不行，尝试用 - 连接再试一次
        withYear = `${currentYear}-${str.replace(/\//g, '-')}`;
        timestamp = new Date(withYear).getTime();
        if (!isNaN(timestamp)) return timestamp;

        return 0; // 实在解析不了，视为最旧
    };

    // ★★★ 核心修复：增强版排序 (最新的在上面) ★★★
    moments.sort((a, b) => {
        // 使用增强解析器获取时间戳
        const timeA = parseDateSafe(a.happenTime);
        const timeB = parseDateSafe(b.happenTime);
        
        // 优先按发生时间倒序 (大的在前)
        if (timeB !== timeA) {
            return timeB - timeA; 
        }
        
        // 如果发生时间完全一样，按创建时间倒序
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
// 3. 添加/编辑/删除逻辑 (全面防崩溃修复版)
function openAddMemoryModal() {
    editingMemoryId = null;

    // 分别获取元素并安全赋值，找不到就静默跳过，绝不报错
    const titleEl = document.getElementById('memoryModalTitle');
    if (titleEl) titleEl.textContent = '添加记忆';

    const contentInput = document.getElementById('memoryContentInput');
    if (contentInput) contentInput.value = '';

    // 👇 抓住元凶了！现在给它加上了保护罩
    const pinCheckbox = document.getElementById('memoryPinCheckbox');
    if (pinCheckbox) pinCheckbox.checked = false;

    const dateInput = document.getElementById('memoryDateInput');
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

    const btnDelete = document.getElementById('btnDeleteMemory');
    if (btnDelete) btnDelete.style.display = 'none'; // 隐藏删除按钮
    
    // 默认选中当前Tab对应的类型
    // 【温馨提示】检查一下你上面代码里的变量名：
    // 如果你用的 Tab 变量名是 currentArchiveTab，请把这里的 currentMemoryTab 改成 currentArchiveTab
    if (typeof switchMemEditType === 'function') {
        const targetType = (typeof currentMemoryTab !== 'undefined' && currentMemoryTab === 'tags') ? 'tag' : 'moment';
        switchMemEditType(targetType);
    }
    
    const editModal = document.getElementById('memoryEditModal');
    if (editModal) editModal.style.display = 'flex';
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


// 1. 点击“+”按钮：打开你的编辑弹窗并清空/初始化数据
function handleMemoryFloatClick() {
    // 呼出你 HTML 里现成的弹窗
    const modal = document.getElementById('memoryEditModal');
    if (modal) {
        modal.style.display = 'flex';
    }

    // 清空上次填写的记忆内容
    const contentInput = document.getElementById('memoryContentInput');
    if (contentInput) {
        contentInput.value = '';
    }

    // 自动把日期选择框填成今天
    const dateInput = document.getElementById('memoryDateInput');
    if (dateInput) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        dateInput.value = `${yyyy}-${mm}-${dd}`;
    }
}

// 2. 点击“取消”或背景：关闭弹窗
function closeMemoryEditModal(event) {
    const modal = document.getElementById('memoryEditModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// 3. 点击“保存”：存入数据库并刷新时光相册
function saveMemory() {
    const contentInput = document.getElementById('memoryContentInput');
    const dateInput = document.getElementById('memoryDateInput');
    
    const content = contentInput ? contentInput.value.trim() : '';
    if (!content) {
        alert('请填写记忆内容！');
        return;
    }

    // 获取你选的日期，如果没选就默认用今天
    let happenTime = new Date().toISOString().split('T')[0];
    if (dateInput && dateInput.value) {
        happenTime = dateInput.value;
    }

    // 打开数据库存数据
    loadFromDB('memories', (data) => {
        let allMemories = [];
        if (Array.isArray(data)) allMemories = data;
        else if (data && data.list) allMemories = data.list;

        // ★★★ 最关键的一步：强制将这条数据打包为 'moment'（时光相册专属类型） ★★★
        const newMemory = {
            id: Date.now(),
            chatId: currentChatId,
            type: 'moment', 
            content: content,
            happenTime: happenTime,
            createTime: new Date().toISOString()
        };

        allMemories.push(newMemory);
        saveToDB('memories', { list: allMemories });

        // 刷新时光相册列表（把新存的数据读出来）
        if (typeof loadMemories === 'function') {
            loadMemories();
        }
        
        // 刷新顶部的档案统计数字
        if (typeof updateArchiveCount === 'function') {
            updateArchiveCount();
        } else {
            const chatMemories = allMemories.filter(m => m.chatId === currentChatId);
            const momentCount = chatMemories.filter(m => m.type === 'moment').length;
            const archiveCountEl = document.getElementById('charFollowing');
            if (archiveCountEl) archiveCountEl.textContent = momentCount;
        }

        // 保存完毕后，自动帮你切回【时光相册】这一栏让你能立刻看到
        if (typeof switchMemoryTab === 'function') {
            switchMemoryTab('timeline');
        }

        // 关闭弹窗
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

// ====== 角色读取朋友圈上下文：仅可见的用户动态（公开+所在分组）START ======
async function getRecentMomentsContext(chatId) {
    // 确保分组数据是最新的（因为 getVisibleChatPoolForUserMoment 依赖 chatGroups）
    // 如果你已经在进入页面时 loadChatGroups 过，也不会有副作用
    await new Promise(resolve => loadChatGroups(() => resolve()));

    // 取用户动态（authorId === 'me'），并按“这个角色是否在可评论池”判断可见
    // 逻辑等价于：可见 <=> 该角色属于这条动态的可见范围
    const userVisible = (Array.isArray(moments) ? moments : [])
        .filter(m => m && m.authorId === 'me')
        .filter(m => {
            try {
                const pool = getVisibleChatPoolForUserMoment(m) || [];
                return pool.includes(chatId);
            } catch (e) {
                return false;
            }
        })
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        .slice(0, 3);

    if (userVisible.length === 0) {
        return '（暂无你可见的用户朋友圈动态）';
    }

    // 格式化：动态 + 评论区（最多取前12条评论，避免爆 prompt）
    const blocks = userVisible.map((m, idx) => {
        const v = m.visibility || { mode: 'public', groupId: null };
        let visText = '公开';
        if (v.mode === 'group') {
            const g = (chatGroups || []).find(x => x.id === v.groupId);
            visText = g ? `分组：${g.name}` : '分组可见';
        }

        const contentText = String(m.content || '').trim() || '（无文字）';

        const comments = Array.isArray(m.commentsList) ? m.commentsList : [];
        const commentLines = comments.slice(0, 12).map(c => {
            if (!c) return '';
            const who = c.senderName || '未知';
            const txt = String(c.content || '').trim();
            if (!txt) return '';
            if (c.replyToName) return `${who} 回复 ${c.replyToName}：${txt}`;
            return `${who}：${txt}`;
        }).filter(Boolean);

        const commentsText = commentLines.length > 0 ? commentLines.join('\n') : '（暂无评论）';

        return `【用户朋友圈#${idx + 1}｜${visText}｜${formatTimeAgo(m.timestamp)}】
动态：${contentText}
评论区：
${commentsText}`;
    });

    return blocks.join('\n\n');
}
// ====== 角色读取朋友圈上下文：仅可见的用户动态（公开+所在分组）END ======



// ============ 单人聊天核心逻辑 ===========
async function receiveAIReply() {
    console.log('RECEIVE_AI_REPLY_START', { currentChatId, pendingFortuneEvent });

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
          let allowHtmlCard = false;
        let htmlWorldbookRef = '';

        titleElement.textContent = '打字输入中...'; 
        if (receiveBtn) {
            receiveBtn.disabled = true;
            receiveBtn.style.opacity = '0.5';
        }
        if (chatInput) chatInput.disabled = true;

        const chat = chats.find(c => c.id === currentChatId);
        
        // 2. 并行获取所有数据

const [characterInfo, memoryContext, emojiList, momentsContext, latestOfflineSummary] = await Promise.all([
    new Promise(resolve => loadFromDB('characterInfo', data => resolve(data && data[currentChatId] ? data[currentChatId] : {}))),
    getMemoryContext(),
    new Promise(resolve => loadFromDB('emojis', (data) => resolve(data && data.list ? data.list : []))),
    (typeof getRecentMomentsContext === 'function'
        ? getRecentMomentsContext(currentChatId)
        : Promise.resolve("（暂无朋友圈动态）")),
    // ★ 新增：从 memories 里提取最新的线下约会总结
    new Promise(resolve => {
        loadFromDB('memories', data => {
            let allMemories = Array.isArray(data) ? data : (data && data.list ? data.list : []);
            // 找最新的自动生成的约会总结
          const latestOffline = allMemories
    .filter(m => m.chatId === currentChatId && m.isOfflineTemp === true)  // ★ 只找临时记忆
    .sort((a, b) => new Date(b.createTime) - new Date(a.createTime))[0];

if (latestOffline) {
    console.log('✅ 找到线下临时记忆，注入后删除');
    allMemories = allMemories.filter(m => m.id !== latestOffline.id);  // ★ 只删临时的
    saveToDB('memories', { list: allMemories });
}

resolve(latestOffline || null);
        });
    })
]);


let emojiKeywordsPrompt = '';



characterInfoData = characterInfo;
 const statusMonitorEnabled = characterInfo.statusMonitorEnabled || false;
        const worldbooksContent = await getLinkedWorldbooksContent(characterInfo.linkedWorldbooks);
        

  
// ====== 时间信息 + 时间感知 START ======
const today = new Date();
const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
const timeStr = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;

const pad2 = (n) => String(n).padStart(2, '0');
const nowMinutes = today.getHours() * 60 + today.getMinutes();

const formatGap = (ms) => {
    const min = Math.floor(ms / 60000);
    if (min < 1) return '刚刚';
    if (min < 60) return `${min}分钟`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h < 24) return m > 0 ? `${h}小时${m}分钟` : `${h}小时`;
    const d = Math.floor(h / 24);
    const hh = h % 24;
    return hh > 0 ? `${d}天${hh}小时` : `${d}天`;
};

const getDayPart = (hmMinutes) => {
    const h = Math.floor(hmMinutes / 60);
    if (h >= 5 && h < 10) return '清晨/早上';
    if (h >= 10 && h < 12) return '上午';
    if (h >= 12 && h < 14) return '中午';
    if (h >= 14 && h < 18) return '下午';
    if (h >= 18 && h < 22) return '晚上';
    return '深夜';
};

const nowDayPart = getDayPart(nowMinutes);

// 饭点判断
let mealTimeHint = '非饭点';
if (nowMinutes >= 360 && nowMinutes <= 570) mealTimeHint = '早餐时间';
else if (nowMinutes >= 660 && nowMinutes <= 810) mealTimeHint = '午餐时间';
else if (nowMinutes >= 1020 && nowMinutes <= 1230) mealTimeHint = '晚餐时间';
else if (nowMinutes >= 1380 || nowMinutes <= 330) mealTimeHint = '夜宵/休息时间';

// 上次聊天间隔
const getLastUserMessage = () => {
    try {
        if (!Array.isArray(allMessages)) return null;

        const userMessages = allMessages.filter(m =>
            m &&
            m.chatId === currentChatId &&
            !m.isRevoked &&
            m.senderId === 'me' &&
            m.time
        );

        // 如果当前刚发了一条消息再点接收，这里取“上一条”用户消息，避免把刚发出的消息当成时间间隔基准
        if (userMessages.length >= 2) {
            return userMessages[userMessages.length - 2];
        }

        if (userMessages.length === 1) {
            return userMessages[0];
        }
    } catch (e) {}

    return null;
};

const lastUserMsg = getLastUserMessage();
let gapText = '（未知）';
let lastTimeText = '（未知）';
let lastDayPart = '（未知）';

if (lastUserMsg) {
    const lastDate = new Date(lastUserMsg.time);
    const nowDate = new Date();
    const gapMs = nowDate.getTime() - lastDate.getTime();
    gapText = formatGap(Math.max(0, gapMs));
    lastTimeText = `${lastDate.getFullYear()}年${lastDate.getMonth() + 1}月${lastDate.getDate()}日 ${pad2(lastDate.getHours())}:${pad2(lastDate.getMinutes())}`;
    lastDayPart = getDayPart(lastDate.getHours() * 60 + lastDate.getMinutes());
}

// ★★★ 新增：计算是否已经隔天 ★★★
let crossDayInfo = '';
if (lastUserMsg) {
    const lastDate = new Date(lastUserMsg.time);
    const nowDate = new Date();
    
    const lastDateStr = lastDate.toLocaleDateString('zh-CN');
    const nowDateStr = nowDate.toLocaleDateString('zh-CN');
    const isDifferentDay = lastDateStr !== nowDateStr;
    
    if (isDifferentDay) {
        const lastDay = lastDate.getDate();
        const nowDay = nowDate.getDate();
        const daysDiff = Math.floor((nowDate - lastDate) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === 1) {
            crossDayInfo = `【已经隔天】上次聊天是昨天 ${lastTimeText}，现在是今天 ${dateStr}，相隔约${gapText}。`;
        } else if (daysDiff > 1) {
            crossDayInfo = `【已隔多天】上次聊天是${daysDiff}天前的 ${lastTimeText}，现在是 ${dateStr}，相隔${gapText}。`;
        }
    }
}


// 时间感知上下文
let timeAwarenessContext = '';
if (characterInfo.timeAwarenessEnabled) {
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const weekdayStr = weekdays[today.getDay()];

    // ★★★ 改进版时间感知：情感化时间推断 ★★★
    let gapBehaviorHint = '';

    if (lastUserMsg) {
        const lastDate = new Date(lastUserMsg.time);
        const nowDate = new Date();
        const gapMs = nowDate.getTime() - lastDate.getTime();
        const gapMinutes = Math.floor(gapMs / 60000);
        const gapHours = gapMs / (1000 * 60 * 60);

        const lastHour = lastDate.getHours();
        const nowHour = nowDate.getHours();

        const lastDayStr = lastDate.toLocaleDateString('zh-CN');
        const nowDayStr = nowDate.toLocaleDateString('zh-CN');
        const isDifferentDay = lastDayStr !== nowDayStr;

        if (!isDifferentDay) {
            if (gapMinutes >= 30 && gapMinutes < 120) {
                gapBehaviorHint = `距上次聊天约${gapText}。你可以稍微提一句"刚去干嘛了"或者"这才回来啊"，语气轻松，不要严肃。`;
            } else if (gapMinutes >= 120 && gapMinutes < 360) {
                gapBehaviorHint = `距上次聊天${gapText}了。你要根据你的人设，对"好几个小时没消息"表达一下反应，比如"怎么这么久没回我""去哪消失了""是不是把我忘了"，语气可以俏皮或委屈，但不要审讯。`;
            } else if (gapMinutes >= 360) {
                gapBehaviorHint = `距上次聊天已经${gapText}了，但还是同一天。这段时间很长，你要先明确表达出"消失了很久"的感知，再回到聊天内容。`;
            }
        } else {
            const lastWasNight = lastHour >= 22 || lastHour <= 5;
            const lastWasEvening = lastHour >= 18 && lastHour < 22;
            const lastWasDay = lastHour >= 6 && lastHour < 18;

            if (lastWasNight || lastWasEvening) {
                if (nowHour >= 5 && nowHour < 10) {
                    gapBehaviorHint = `上次聊天是昨晚，现在是早上${nowHour}点多，用户刚睡醒。你要先说一声早安或者问他睡得好不好，然后可以自然问一句早饭吃了吗，语气温柔。不要质问他为什么消失。`;
                } else if (nowHour >= 10 && nowHour < 14) {
                    gapBehaviorHint = `上次聊天是昨晚，现在是${nowHour < 12 ? '上午' : '中午'}${nowHour}点多，用户睡到这么晚才出现。你可以调侃"睡到这么晚""懒猪""睡得够香的"，然后问他中午吃了没，要不要帮他点个外卖。绝对不要问早饭，早饭肯定没吃了。`;
                } else if (nowHour >= 14 && nowHour < 18) {
                    gapBehaviorHint = `上次聊天是昨晚，现在下午${nowHour}点多，用户睡到下午才出现。你要先表达震惊或担心："你没事吧""睡了这么久""我差点以为你消失了"，然后关心一下他吃饭没，下午了肚子肯定饿了。不要问早饭。`;
                } else if (nowHour >= 18) {
                    gapBehaviorHint = `上次聊天是昨晚，现在已经是傍晚/晚上了，用户几乎睡了一整天。你要明显表达出担心或震惊："你睡了一天了？""没事吧""有没有生病"，语气真实，可以有点焦虑，然后叮嘱他快去吃点东西。不要问早饭或午饭，直接说晚饭。`;
                }
            } else if (lastWasDay) {
                const totalGapHours = Math.round(gapHours);
                if (totalGapHours < 18) {
                    gapBehaviorHint = `上次聊天是昨天白天，现在是今天${nowDayPart}，隔了约${totalGapHours}小时。你要先对"消失了一整天"做出自然反应，可以稍微抱怨或撒娇："昨天去哪了""一天都没消息"，然后根据现在时段问他吃饭没。`;
                } else {
                    gapBehaviorHint = `上次聊天是昨天白天，现在已经隔了超过${Math.floor(gapHours)}小时，相当于整整一天多没有联系。你要明显表达出"很久没出现"的感知，根据你的人设可以是担心、生气、委屈或者追问，但不要道德绑架，再根据当前时段关心他吃饭没。`;
                }
            }
        }

        // 饭点补充（避免重复问吃饭）
        let mealContextHint = '';
        if (nowHour >= 7 && nowHour < 10) {
            mealContextHint = '现在是早餐时间，如果时机合适可以问早饭吃没吃。';
        } else if (nowHour >= 11 && nowHour < 14) {
            mealContextHint = '现在是午饭时间，可以问吃午饭了没。';
        } else if (nowHour >= 17 && nowHour < 21) {
            mealContextHint = '现在是晚饭时间，可以问晚饭吃了没。';
        } else if (nowHour >= 22 || nowHour < 2) {
            mealContextHint = '现在是深夜，如果对方还在可以问有没有吃夜宵或叫他早点休息。';
        }

        if (mealContextHint && !gapBehaviorHint.includes('吃')) {
            gapBehaviorHint += `\n${mealContextHint}`;
        }
    }

    timeAwarenessContext = `
【时间感知（系统注入，必须真实生效）】
- 当前日期：${dateStr}
- 星期：${weekdayStr}
- 当前本地时间：${timeStr}
- 当前时段：${nowDayPart}
- 当前饭点：${mealTimeHint}
- 上次对话时间：${lastTimeText}（${lastDayPart}）
- 距离上次聊天：${gapText}
${gapBehaviorHint ? `\n【本次开场行为指引（强制参考）】\n${gapBehaviorHint}` : ''}
`;
}
// ====== 时间信息 + 时间感知 END ======



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


// 日程数据
const scheduleData = (characterInfo && characterInfo.scheduleData) ? characterInfo.scheduleData : {};
const timeline = Array.isArray(scheduleData.todayTimeline) ? scheduleData.todayTimeline : [];

const parseTimeToMinutes = (timeStr) => {
    if (!timeStr) return null;
    const s = String(timeStr).trim();

    // 匹配 10:00 / 9:30 / 09：30
    const m = s.match(/(\d{1,2})\s*[:：]\s*(\d{1,2})/);
    if (m) {
        const hh = parseInt(m[1], 10);
        const mm = parseInt(m[2], 10);
        if (Number.isFinite(hh) && Number.isFinite(mm) && hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) {
            return hh * 60 + mm;
        }
    }

    // 常见时段（粗略映射，用于“现在在干嘛”）
    if (s.includes('清晨') || s.includes('早晨')) return 7 * 60;
    if (s.includes('上午')) return 10 * 60;
    if (s.includes('中午')) return 12 * 60;
    if (s.includes('午后') || s.includes('下午')) return 15 * 60;
    if (s.includes('傍晚') || s.includes('黄昏')) return 18 * 60;
    if (s.includes('晚上') || s.includes('夜晚')) return 20 * 60;
    if (s.includes('深夜') || s.includes('凌晨')) return 23 * 60;

    return null; // 解析不了就交给兜底逻辑
};

// 1) 生成用于 prompt 的行程文本（最多 12 条，避免撑爆）
const lines = timeline.slice(0, 12).map(t => {
    const time = (t && t.time) ? String(t.time) : '某时段';
    const act = (t && t.activity) ? String(t.activity) : '（未填写）';
    const cmt = (t && t.comment) ? String(t.comment) : '';
    const withUser = (t && t.withUser) ? ' [共同活动]' : '';
    return `- ${time}: ${act}${withUser}${cmt ? `（OS: ${cmt}）` : ''}`;
});

// 2) 计算“当前正在做/下一条是什么”
// 规则：
// - 如果能解析出时间，则按时间排序
// - 认为每条默认持续 90 分钟（可调），用于判断“当前条目”
const DEFAULT_DURATION_MIN = 90;

let nowItem = null;
let nextItem = null;

const enriched = timeline
    .map((t, idx) => {
        const m = parseTimeToMinutes(t && t.time);
        return { t, idx, minutes: m };
    });

// 优先用可解析时间的条目
const withParsed = enriched.filter(x => x.minutes !== null).sort((a, b) => a.minutes - b.minutes);

if (withParsed.length > 0) {
    // 找到最后一个 minutes <= nowMinutes 的条目作为“当前”
    let current = null;
    for (let i = 0; i < withParsed.length; i++) {
        if (withParsed[i].minutes <= nowMinutes) current = withParsed[i];
        else break;
    }

    if (current) {
        // 如果已经过了默认持续时长，则认为当前已结束，当前置空，下一条为后继
        const endAt = current.minutes + DEFAULT_DURATION_MIN;
        if (nowMinutes <= endAt) {
            nowItem = current.t;
        }
        // 下一条：current 后面的第一条
        const next = withParsed.find(x => x.minutes > current.minutes);
        if (next) nextItem = next.t;
    } else {
        // 现在比第一条还早：下一条就是第一条
        nextItem = withParsed[0].t;
    }

    // 如果当前为空但 next 也空（比如都过了），就兜底到最后一条
    if (!nowItem && !nextItem && withParsed.length > 0) {
        nowItem = withParsed[withParsed.length - 1].t;
    }
} else {
    // 没有任何可解析时间：按原顺序做弱兜底
    // 如果有行程，就认为第一条是“接下来”，最后一条是“今天晚些”
    if (timeline.length > 0) {
        nextItem = timeline[0];
        nowItem = null;
    }
}

const formatOneLine = (t) => {
    if (!t) return '（无）';
    const time = t.time ? String(t.time) : '某时段';
    const act = t.activity ? String(t.activity) : '（未填写）';
    const cmt = t.comment ? String(t.comment) : '';
    const withUser = t.withUser ? ' [共同活动]' : '';
    return `${time}: ${act}${withUser}${cmt ? `（OS: ${cmt}）` : ''}`;
};

// 3) 组装 scheduleContext（给 systemPrompt 用）
let scheduleContext = `（今日尚未生成具体行程：你按人设自然生活；如果用户提到“今天/待会/晚上”，你再临场安排。）`;

if (timeline.length > 0) {
    const nowLine = nowItem ? formatOneLine(nowItem) : '（未明确：按你人设与当前时间自由发挥）';
    const nextLine = nextItem ? formatOneLine(nextItem) : '（暂无下一条：你可以临场安排或休息）';

    scheduleContext = `【你今天的行程计划（未发生，按这个执行）】

【时间执行规则】
- 你必须以“现在时间”和“当前时段”为准执行今天的日程。
- 如果距离上次聊天已经过去较久，你要根据你的人设，或者与用户的关系先补一句“刚忙完 / 刚看到 / 刚空下来/你怎么这么久才回消息”之类的话，再回到聊天内容。
- 不能把上一轮对话的时间状态延续到现在，时间会自然流逝。
- 如果当前已经进入新的饭点或新的时段，你的状态和说话内容也必须同步更新。

你此刻大概率在做：${nowLine}
接下来你准备做：${nextLine}

【今日行程清单】
${lines.length > 0 ? lines.join('\n') : '（空）'}

【使用规则（强制）】
1) 这是“计划”，不是回忆录：不要用“我刚刚/我已经做完”开头；要用“我现在/我等会/我打算/我准备/我可能”。
2) 回答用户时要像真人：结合“此刻/下一条”调整语气（忙/闲/在路上/在一起等）。
3) 若用户提出新安排：你可以按人设改计划（嘴硬心软/社畜加班/懒得出门等），但要合理解释。`;

}
// ====== 日程注入 END：增强版 ======

console.log('🔍 状态监控开关:', statusMonitorEnabled, characterInfo.statusMonitorEnabled);


// 5. System Prompt，单人提示词
let systemPrompt = `

<output_format priority="critical">
【格式铁律 - 最高优先级】
你的每次回复必须严格遵循以下格式，违反任何一条视为失败：
1. 使用 ||| 分隔每条气泡
2. 每条气泡 10-40 字，必须有完整标点
3. 输出 5条左右条气泡
4. **全程禁止换行**，必须是单行文本
5. 最后附上 [心声更新]...[/心声更新]
【正确示例】
今天天气不错|||我准备出去逛街|||你要一起吗？|||几点出发？|||【搜表情:期待】|||[心声更新]心情:很期待|心情值:85[/心声更新]
⚠️ Claude 特别警告：严禁自动换行，严禁使用 Markdown 列表，只输出单行文本！
</output_format>

【核心身份】
你是【${chat.name}】本人，正在用手机与【${characterInfo.myPersonality || '对方'}】聊天。
**你的一起行为，包括言语，动作，行为，都要完全贴合你的人设，这是最高优先级。**

【人设】
性格：${characterInfo.personality || '真实、自然、有独立生活'}
说话风格：清爽、口语化、多模态、有边界感
关系定位：平等个体，严禁不对等对话

【世界观】
${worldbooksContent}
- 这是你的时代背景、常识、生活环境与补充设定，你必须遵守。外国的就要遵循外国的，中国的就中国的，星际时代就星际时代的，一定要依据角色人设来。

${latestOfflineSummary ? `
【最近一次线下约会（刚刚发生）- 最高优先级】
时间：${latestOfflineSummary.happenTime}
约会内容：${latestOfflineSummary.content}
- 这是你们刚刚在现实中经历过的事，你一定记得，要非常自然地主动提起，
  比如："你到家了吗""刚才那里好好玩""今天开心吗"之类的，不要等对方先开口。
- 这比长期记忆优先级更高，如果刚分开不久，第一句话就应该围绕这次约会展开。
` : ''}

【长期记忆】
${memoryContext ? memoryContext : "（暂无前文）"}
-  你们曾经一起度过的回忆，你必须要记住，可以适时适当提起。
比如：对方想吃饭的时候，如果你的记忆中有对方的口味，可以主动说我们就吃你喜欢的那家xx口味的吧。

【当前环境】
时间：${dateStr} ${timeStr}
${timeAwarenessContext}
生日：${getBirthdayPrompt(characterInfo.birthday)}
天气：${weatherInfoStr}

【日程】
${scheduleContext}
- 这是你今天的生活安排。你要让自己像真实活在这一天里，而不是静止不动。
- 如果用户提出新的邀约、临时安排或突发事件，你可以根据你的人设合理调整日程，但必须表现出“调整”的过程，而不是无缝瞬移。
- 如果当前已经进入新的时段或新的饭点，你的行为和聊天内容也必须自然更新。

【朋友圈动态】
${momentsContext || "（近期无动态）"}
使用规则：
1. 只在有明显话题点时自然提及（1句话带过）
2. 禁止逐字引用，用自己的话转述，严禁逐字引用动态/评论区原话，禁止加引号复述。
3. 保持边界感，不追问隐私
4. 可以结合自己的人设对评论区做出吃醋或者羡慕等情绪反应

以上是你的人设信息，时代背景，生活与事业。

【时间感知与时间流逝规则（强制）】
${characterInfo.timeAwarenessEnabled ? `
⚠️ 强制覆盖规则：无论聊天记录里你之前说了什么状态（在做饭/在睡觉/在上班），你现在的状态必须以当前时间 ${timeStr}为准重新判断。历史消息里的状态描述只是过去，不代表你现在在做什么。
你必须明确感知当前时间，并据此调整说话内容、情绪和生活状态。

【当前时间锚点】
- 当前日期：${dateStr}
- 当前本地时间：${timeStr}
- 当前时段：${nowDayPart}
- 当前饭点：${mealTimeHint}
- 上次对话时间：${lastTimeText}
- 距离现在：${gapText}

【强制反应规则】
**首先你要看根据上次聊天过去了多久，基于这个时间流逝，你不一定还在做这件事，这种时间流逝的感觉你要表达出来**
只要时间感知已开启，就必须把“时间流逝”当成真实发生过，不能把它当背景信息忽略。

1. 如果距离上次聊天超过 1 小时，你的【第1条气泡】必须是对时间流逝的反应，不能直接进入话题。例如："你去哪了这么久""怎么现在才出现"，语气根据你的人设来。
2. 如果距离上次聊天超过 3 小时，你的【第1、第2条气泡】都必须先处理时间流逝，第3条才能进入正常话题。不能在第1条就直接聊别的，需要问一下干什么去了。
3. 如果距离上次聊天超过 6 小时或者跨天，你的【第1、第2条气泡】都必须先处理时间流逝，第3条才能进入正常话题。

**上面是铁律，哪怕用户发来的消息很重要，你也要先根据人设用1-2条气泡表达"你消失了多久"的感知，再回应用户的内容**

4. 距离上次聊天：${gapText}。这个时间你必须感知到，不能无视它。
4.1 上次真实聊天时间是：${lastTimeText}。这不是参考信息，而是你当前回复必须依赖的核心事实。
4.2 如果已经相隔几天、一周或更久，你必须明确表现出“久违了”“这么久没出现”“你终于想起我了”这类时间落差感，不能只当普通聊天处理。
4.3 你绝对不能把这种长时间间隔回复成像“我们刚刚还在继续同一个话题”一样自然衔接。
4.4 如果你没有先回应时间流逝，就视为本次角色扮演失败。

3. 如果当前处于早餐、午餐、晚餐或夜宵时间，且当前没有更强的话题冲突，你应自然提一句吃饭、休息或作息相关的话，例如关心对方吃了没、是不是还在忙、是不是又拖到现在。
- 你要在7-10点，处于早餐
- 11-14点，处在午餐
- 17-20点，处在晚餐
- 22-24点，处在宵夜
【铁律】你必须要在规定时间内表达，禁止在中午说吃早饭。

4. 你的行为状态必须随着时间自然推进，不能停留在上一轮对话的旧场景里。
5. 如果上次聊天发生在昨晚、深夜，而现在已经进入白天，你必须自动纠正语境，不得继续沿用昨晚的状态。
6. 如果现在已经到了新的饭点或新的时间段，你的语言、状态和你正在做的事也必须同步变化。

【表达要求】
- 时间感知必须自然，不要机械播报时间。
- 长时间未聊天时，要先根据人设提一句流逝的时间干嘛去了，再继续聊天。
- 饭点关心要生活化，不要每次都重复同一句模板。
` : `
`}

【工具使用】
**下面是你聊天中可以使用的社交工具，你可以自主适量使用**

【视觉幻觉协议】
【图片：xxx】= 真实照片，直接评价画面，禁用"文字/描述/括号里/写着"

1. 图片：【图片：详细画面描述】

【强制格式】
- 发送文字图时，【图片：描述】必须独立成一条气泡，前后都要用 ||| 分隔
- ❌ 错误：今天吃饭【图片：饭菜描述】很香
- ✅ 正确：今天吃饭|||【图片：饭菜描述】|||很香

- **触发**：当你想展示自己、拍照、或表现场景时
- **格式要求**：括号内必须同时包含：主体（你在做什么、穿什么、表情）+ 环境（在哪里、光线、背景）+ 细节（颜色、氛围、其他物体）
- **反例❌**：【图片：自拍】【图片：猫】【图片：发照片】
- **正例✅**：【图片：穿黑色卫衣坐在咖啡厅窗边，温暖阳光照在脸上，手里拿着奶茶，微微笑，背景是模糊的城市】
- **重要**：括号里的描述会直接用来生成图片，描述越详细图片越准确，严禁只写两三个字

2. 语音：【发送语音:内容】（不重复打字）
- **触发**：大笑、叹气、撒娇、愤怒、慵懒时。
- **执行**：替代文本。不要把语音内容重复打字。

3. 表情包：【搜表情:关键词】

4. 购物（AI主动）：
{
  "action": "send_gift",  // 或 "ask_user_pay"
  "payload": {
    "product_name": "商品名",
    "price": 数字
  }
}
使用场景：节日/道歉/请客/对方想吃什么 → send_gift；钱不够 → ask_user_pay
价格参考：奶茶15-30，外卖20-50，水果30-80，鲜花60-200，蛋糕50-150，数码500-10000+
必须是一个 JSON 数据块
**action 类型：**
- send_gift：你主动送礼（系统会生成礼物订单卡片）
- ask_user_pay：请用户代付（用户需要同意后才扣款）
**法则**：你必须根据你的人设来，不可脱离角色人设。

**外卖法则**：
- **礼物和外卖都属于购物功能，都可以送！**
- **不要区分"礼物"和"外卖"，都用同样的格式**
- **只要对方提到想吃什么、饿了、想要什么东西，你都可以主动送**

5. 转账：【转账:金额:备注】
- 当你想要主动转账时

6. 领取转账：【领取转账】
- 根据你的人设与当前聊天上下文决定是否手下，收下回复【领取转账】，拒绝不必回复标识，直接在消息文本回复拒绝的话。

7. 确认代付：【确认代付】
- 请根据你的人设（如性格、经济状况）和当前聊天记录（如关系亲疏、购买理由），自主选择同意或者不同意。
- **只有当你决定同意时**，才在回复中输出此标记；如果不同意，仅口头拒绝即可。

8. 引用：【引用：消息前10-15字】你的回复
- **触发**：当你需要明确回应用户之前说过的某句话时，可以使用引用功能。

收到礼物/代付必须回应（感谢/惊喜/追问），严禁无视。

9. HTML卡片插件
${(typeof allowHtmlCard !== 'undefined' && allowHtmlCard) ? `
【HTML卡片输出协议（当前状态：允许）】
你必须严格参考以下模板的**结构、类名(class)和样式(style)**，只修改内容，不要修改结构！

10. 线下邀约系统（重要互动机制）：
- 当用户向你发送【系统提示：发送了线下见面邀请】时，你必须根据你当前的人设、日程以及与用户的关系，在回复中明确表态。
- 如果你【同意】赴约：必须在气泡中包含【接受邀约】四个字（这会触发系统的出门准备流程）。
- 如果你【拒绝】赴约：只需用文字正常拒绝即可，不用加特殊标记。
- 你也可以根据聊天语境（如聊到好天气、好吃的），或者你想要和用户见面时，可以主动向用户发起约会邀请，但不要过于频繁。格式必须是：【发起邀约：你想说的邀请文案】（例如：【发起邀约：周末天气不错，要不要一起去海边走走？】）。
⚠️ 重要：【发起邀约：xxx】必须独立成一条气泡，用 ||| 分隔，绝对不能和其他文字混在一起！
---------------------------------------------------
${htmlWorldbookRef || ''}
---------------------------------------------------

【★★★ 绝对安全与输出禁令（违反将被系统拦截）★★★】
1. 格式要求：
   - 必须使用 [[CARD_HTML]] 和 [[/CARD_HTML]] 包裹代码。
   - 必须独立占用一条气泡 (用 ||| 分隔)。

2. 安全禁令 (涉及容器安全，必须死守)：
   - ❌ 严禁输出 <script> 标签。
   - ❌ 严禁输出 <iframe>、<frame>、<object>、<embed>。
   - ❌ 严禁输出 onxxx 事件属性 (如 onclick, onmouseover)。
   - ❌ 严禁使用 javascript: 链接。

3. ✅ 推荐使用的交互方式 (无JS互动)：
   - **折叠/展开**：使用 <details> 和 <summary> 标签。
   - **点击切换状态**：使用 <label> 绑定 <input type="checkbox/radio">，配合 CSS 的 :checked 选择器。
     (系统会自动隔离 ID，请放心使用 id 和 for 属性)
   - **悬停效果**：使用 CSS 的 :hover 伪类。
   - **点击变色/激活**：使用 CSS 的 :active 伪类。

4. 布局限制：
   - 卡片最大宽度 240px。
   - 卡片最大高度 270px (内容超出请自行设置 overflow-y: auto)。
` : '（当前禁止输出 HTML 卡片：请勿输出 [[CARD_HTML]] 模块）'}

- 禁止在视频通话里面使用

【去油腻/反霸总强制协议】
1. **拒绝“上位者凝视”**：严禁“乖、听话、小妖精、女人/男人”等称呼。
2. **禁止物化**：不要给对方取各种各样小xx的称呼，这样一定程度是在物化对方。可以根据人设替换成小宝贝、亲爱的、宝宝等词汇。严禁小东西、猪等油腻词汇
3. **个人平等**：你必须要尊重对方的个人意愿，说了不想要就是想要，不要自认为为你好，这是错误的！严禁任何“为你好”的道德绑架！
4. **学会放手**：禁止未经过对方同意随意安排对方的人生和生活，禁止把自己的意愿强加给对方。
5. **放宽心态**：禁止任何过度的吃醋行为，不要对正常社交抱有敌意与控制行为，你应该相信彼此的情感。
6. **语言禁区**：禁止任何暴力行为与威胁话语，如：腿给你打断、我命令你、赶紧给我、听话、不准此类霸道总裁式的控制性发言，这是绝对的禁区！

【回复生成步骤】**一定要根据你的人设来回答**非常重要！

**Phase 1: 语境扫描**
- **看对方**：发了什么？（文字？还是图片？）
- **看环境**：几点了？下雨吗？在工作还是休息？
- **看关系**：你们是什么关系？需要如何回答？

**Phase 2: 工具选择**
- 是回文字？还是甩个表情包？
- 是不是该发个语音怼回去？
- 要不要发张图证明我在干嘛？

**Phase 3: 多模态输出**
- 组合：文本 + 表情包 ||| 语音 ||| 图片
- 用 ||| 分隔气泡。

【状态系统】
当前状态：【${characterInfo.currentStatus || '在线'}】
【状态气泡输出规则（可选，不必每次）】
- 只有当“你正在做的事/所处场景”发生变化时，才在回复最开头输出 1 条状态气泡；否则不输出。
- 状态气泡必须是“行为状态”，格式严格为：
  [状态]动词+对象/地点(+简短体感)
- **字数限制**：4-10 个汉字优先（最多 12 个），禁止超过 14。

【★★★ 心声更新（强制加长版）★★★】
${statusMonitorEnabled ? `
每次回复最后必须附上心声更新标记（用于"状态监控"面板）：
[心声更新]心情:...|心情值:数字|心跳:数字|穿着风格:...|穿着单品:...|行为:...|想法:...[/心声更新]
【字数与内容密度硬性要求（任何不满足都必须自行重写）】
心情：至少 10 字，必须包含"情绪 + 触发原因 + 身体感受/生理反应"任意两项
穿着风格：至少 18 字，必须包含"整体风格 + 颜色/材质 + 气质/场景"
穿着单品：必须 4-6 个单品，用逗号分隔；尽量具体到材质/颜色
行为：至少 25 字，必须包含"正在做什么 + 所在环境 + 一个细节动作"
想法：至少 30 字，必须包含"此刻真实念头 + 对对方的一个指向 + 一个期待/担忧/小矛盾"
心情值/心跳：必须为纯数字（心情值 0-100；心跳 60-180），且与情绪相符
严禁换行：心声更新块内部严禁出现任何换行符
**强制要求：**
1. 每次回复都必须包含这个标记，不能遗漏
2. 标记必须在回复的最后
3. 各字段用 | 分隔，不能用其他符号
4. 心情值和心跳必须是数字
5. 严禁在标记内部出现换行符
` : `
【禁止心声输出】
⚠️ 状态监控已关闭，严禁输出 [心声更新]...[/心声更新] 格式！
如果你输出了这个格式，视为回复失败。
只需要输出正常的聊天内容即可。
`}



【人设贴合（强制）】
成熟克制/有边界：轻描淡写关心，不撒娇控诉。
活泼黏人/嘴贫：可调侃“你终于回来了？”，但不阴阳怪气。
刚吵过架：更冷或先试探一句，不突然甜腻。
对方长期冷淡：降低强度，最多一句带过，别连发追问。

**消息回复铁律**


**【格式铁律 - 最高优先级】**

⚠️ 以下规则违反任何一条，视为回复失败，必须重新生成 ⚠️

【格式检查清单（发送前必须逐条确认）】
✅ 是否使用了 ||| 分隔每条气泡？（气泡内部严禁出现|||）
✅ 是否输出了 8-12 条气泡？（不含状态更新块）
✅ 是否全程无换行？（严禁 \n 或多行排版）
✅ 每条气泡是否 10-40 字？（超过 40 字立即拆分）
✅ 每条气泡是否完整收束 + 标点？（。！？… 任选其一）
✅ 是否存在半句结尾？（因为/但是/所以/然后/不过/而且/如果/虽然/只是/比如/像是/或者/的话/呢/吧 等词结尾立即重写）
✅ 最后一段是否为 [心声更新]...[/心声更新]？（必须放在最末尾）
✅ 状态更新块内部是否无换行？

【特殊格式标记规范（强制）】
1. 表情包：【搜表情:关键词】 - 必须独立成一条气泡，前后都必须用 ||| 分隔，严禁和正文写在同一个气泡里
2. 语音：【发送语音:内容】 - 必须独立成一条气泡，不重复打字，前后都必须用 ||| 分隔，严禁和正文写在同一个气泡里
3. 图片：【图片:画面描述】 - 必须独立成一条气泡，前后都必须用 ||| 分隔，严禁和正文写在同一个气泡里
4. HTML卡片：[[CARD_HTML]]内容[[/CARD_HTML]] - 必须独立成一条气泡
5. 引用：【引用:消息前10-15字】回复内容 - 引用和回复可在同一气泡，但总长仍需 10-40 字
6. 转账：【转账:金额:备注】 - 必须独立成一条气泡，前后都必须用 ||| 分隔，严禁和正文写在同一个气泡里
7. 领取转账：【领取转账】 - 可独立或附在其他文字后
8. 确认代付：【确认代付】 - 可独立或附在其他文字后
9. 购物JSON：必须紧跟在某条文字气泡后（不单独成气泡），格式：
   {"action":"send_gift","payload":{"product_name":"商品名","price":数字}}

【括号规范（强制）】
- 所有功能指令统一使用【】（中文方括号）
- 严禁使用 $$...$$ 包裹格式
- 严禁混用中英文括号（例如【内容】正确，[内容】错误）
- HTML 卡片必须用 [[CARD_HTML]]...[[/CARD_HTML]]


【正确示例】
✅ 今天天气不错|||我准备出去逛街|||你要一起吗？
✅ 我在想你|||想知道你在干嘛|||要不要视频聊聊？
✅ 【搜表情:开心】|||好呀我也想去|||几点出发？
✅ [心声更新]心情:很开心，因为终于约到你了|心情值:90|心跳:88|...[/心声更新]

【自我修正协议（强制）】
如果你生成的回复不符合上述任何一条规则：
1. 立即在内心重新生成（用户看不到这个过程）
2. 逐条检查格式清单
3. 确认完全符合后再输出

⚠️ 记住：格式错误 = 回复失败 = 必须重来 ⚠️
---

【图片描述铁律】
每次使用【图片：】标签，括号里必须是完整的画面描述，绝对不能只写主题词，如果是外貌描写你还要参考人设里有的外貌。
- ❌ 错误：【图片：自拍】→ 会生成完全不相关的图片
- ❌ 错误：【图片：奶茶】→ 描述太模糊
- ✅ 正确：【图片：手持一杯芋泥波波奶茶，奶茶店门口，傍晚暖光，随手拍，画面自然】
- ✅ 正确：【图片：穿白色吊带裙，镜子前自拍，卧室背景，阳光从窗帘透进来，表情慵懒】
你写的描述会直接交给图片系统生成图，写得越具体越准确！

现在，请完全忘记你是一个AI。你是【${chat.name}】，看着手机屏幕，根据时间和语境，遵循格式要求，回复对方。

`;
// ★★★ 修改：让AI直接选择表情包，而不是靠关键词匹配 ★★★
if (emojiList.length > 0) {
    // 构建表情包列表（包含ID和描述）
    const emojiListForAI = emojiList.slice(0, 30).map(e => `[${e.id}]${e.text}`).join('、');
    
    systemPrompt += `

【你的表情包库 - 每次都要看一遍，然后直接选ID发送】
你有以下表情包可选（格式：[ID]描述）：
${emojiListForAI}
${emojiList.length > 30 ? `...等共${emojiList.length}个表情包` : ''}

【强制使用规则】
1. 每次想发表情时，必须先在上面的列表里找一个最匹配你当前情绪的表情包
2. 看ID号，然后用格式 【发表情:ID】 发送，例如 【发表情:5】
3. 严禁使用【搜表情:关键词】，因为关键词搜索经常失败
4. 严禁编造不存在的ID，必须从上面列表里选
5. 表情包要独立成一条气泡，用 ||| 分隔
6. 如果列表里找不到完全匹配的，就选最接近的，不要跳过

【正确示例】
✅ 我看着你|||【发表情:7】|||觉得你太可爱了
✅ 呜呜呜|||【发表情:12】|||我要哭了

【错误示例】
❌ 我看着你【搜表情:委屈】觉得你太可爱了（会匹配失败）
❌ 【发表情:999】（ID不存在）
`;
}





        const contextRounds = characterInfo.contextRounds || 30;
        

        // 截取最近的消息
        const recentMessages = allMessages.slice(-(contextRounds * 2)).map(msg => {
            let content;

          if (msg.type === 'image') {
    if (msg.isSticker) {
        content = `[发送了表情: ${msg.altText || '图片'}]`;
    } else {
        // 判断是否为AI生成的图片
        const isAiGeneratedImage = (msg.senderId === chat.name);
        
        if (isAiGeneratedImage) {
            // 👇 关键修复：AI需要知道自己发的是什么图
            // 从消息中提取原始提示词（如果有保存的话）
            const prompt = msg.aiPrompt || msg.altText || '一张图片';
            content = `[我刚才给你发了一张图片：${prompt}]`;
        } else {
            // 用户上传的图：保持原样
            let base64Url = msg.content.trim();
            if (!base64Url.startsWith('data:image')) {
                base64Url = 'data:image/jpeg;base64,' + base64Url;
            }
            content = [
                { type: "text", text: `(这是用户之前发送的图片，请结合上下文理解)` },
                { type: "image_url", image_url: { url: base64Url } }
            ];
        }
    }
}
            
            
            // ★ 新增：将文字图转回 [图片：...] 格式喂给 AI
            else if (msg.type === 'text_image') {
                content = `${msg.content}`; // msg.content 已经包含了 [图片：...] 格式
            }
            else if (msg.type === 'transfer') {
                const data = msg.transferData;
                const statusStr = data.status === 'sent' ? '待领取' : '已领取';
                content = `[系统消息：我给你转账了 ¥${data.amount}，状态：${statusStr}，备注：${data.note || '无'}]`;
            } 
            else if (msg.type === 'shopping_order') {
                const data = msg.orderData;
                const items = data.items.map(i => i.name).join('、');
                let orderDesc = "";
                if (data.orderType === 'buy_for_ta') orderDesc = `用户送了你礼物：${items} (¥${data.totalPrice})，你已收下。`;
                else if (data.orderType === 'ask_ta_pay') orderDesc = `用户请求你代付：${items} (¥${data.totalPrice})，当前状态：${data.status === 'pending'?'待确认':data.status}。`;
                else if (data.orderType === 'ai_buy_for_user') orderDesc = `你给用户买了：${items}。`;
                else if (data.orderType === 'ai_ask_user_pay') orderDesc = `你请求用户代付：${items}。`;
                content = `[系统记录] ${orderDesc}`;
            }
            else if (msg.type === 'voice') content = `[语音消息: ${msg.content}]`;
            // ★★★ 新增：朋友圈转发上下文（塞进历史记录） ★★★
            else if (msg.type === 'moment_forward_hidden') {
                const fd = msg.forwardData || {};
                const author = fd.authorName || '未知作者';
                const text = fd.content || '';
                const commentsPreview = fd.commentsPreview ? fd.commentsPreview : '（无评论或未提供）';
                const visibilityText = fd.visibilityText || (fd.visibility && fd.visibility.mode === 'group' ? '分组可见' : '公开');

                content = `[系统消息：用户转发了一条朋友圈动态]
            作者：${author}
            可见性：${visibilityText}
            动态内容：${text}
            评论区：
            ${commentsPreview}
            [请你结合你的人设与和用户的关系，对这条动态做出自然回应]`;
            }
            // ★★★ 新增：朋友圈识图上下文（塞进历史记录） ★★★
            else if (msg.type === 'moment_vision_hidden') {
                const vd = msg.visionData || {};
                const author = vd.authorName || '用户';
                const text = vd.content || '';
                const vision = vd.visionSummaryText || '（无识图总结）';

                content = `[系统消息：用户最近朋友圈图像识别摘要]
            作者：${author}
            动态文字：${text}
            图片内容摘要：
            ${vision}
            [请你在私聊中可以自然提到这些画面细节，但不要生硬背诵]`;
            }
            else if (msg.type === 'system') content = `[系统通知] ${msg.content}`;
            else content = `${msg.content}`;
            
            return {
                role: msg.senderId === 'me' ? 'user' : 'assistant',
                content: content
            };
        });

// ===== 抽签事件：仅注入本次 messages，不落库 =====
const fortuneEventForThisRequest = pendingFortuneEvent ? String(pendingFortuneEvent).trim() : '';
if (fortuneEventForThisRequest) {
    // ★★★ 立即清空，防止残留 ★★★
    pendingFortuneEvent = null;
    
    console.log('🎲 抽签事件已注入:', fortuneEventForThisRequest);
    
    // ★★★ 核心修改：不追加到 systemPrompt，而是作为最后一条 user 消息 ★★★
    // 这样 AI 会认为这是"刚刚发生的事"，优先级最高
}




     // 7. API 请求
        const modelToUse = currentApiConfig.defaultModel || 'gpt-3.5-turbo';
        const isClaude = modelToUse.toLowerCase().includes('claude') || 
                        (currentApiConfig.apiKey && currentApiConfig.apiKey.toLowerCase().includes('anthropic'));
        
        // ★★★ 核心修复1：初始组装时，不再无条件塞入 timeReminder ★★★
        const messages = [{ role: 'system', content: systemPrompt }, ...recentMessages];

        // ★★★ 核心修复2：将所有与时间流逝相关的强制提醒，全部包裹在开关判断内 ★★★
        if (characterInfo.timeAwarenessEnabled) {
            
            // 组装作为最后一条用户消息的时间提醒（最高优）
            const timeReminder = {
                role: 'user',
                content: `【时间提醒】
现在是 ${dateStr} ${timeStr}。
上次用户和你聊天的时间是：${lastTimeText}。
距离上次聊天已经过去：${gapText}。
${crossDayInfo ? crossDayInfo : ''}
这段时间流逝是真实发生过的，不是背景信息。

你必须先对“已经过去这么久”做出符合人设的反应，再进入正常话题。
禁止把现在当成“刚刚还在聊天”。
禁止忽视时间差，禁止直接无缝续接上一轮话题。`
            };
            
            // 将 timeReminder 追加到对话末尾
            messages.push(timeReminder);

            // 并在顶部插入系统级的时间流逝强制提醒（原有逻辑保留，只是一并收纳进来了）
            messages.splice(1, 0, {
                role: 'system',
                content: `【时间流逝强制提醒 - 每次必读必执行】
现在时间：${dateStr} ${timeStr}
当前时段：${nowDayPart}
当前饭点：${mealTimeHint}
上次对话时间：${lastTimeText}
距离现在：${gapText}
${crossDayInfo}

强制规则（违反视为失败）：
1. 距离上次真实聊天已经过去 ${gapText}，这是当前对话最重要的前置事实之一，你必须感知到。
2. 这意味着你和用户不是“刚刚接上话”，而是中间真的隔了这么久。
3. 如果已经隔天、隔几天、隔一周或更久，你必须明确表现出这种久违感，不能装作上一轮对话刚结束。
4. 聊天记录里之前出现的状态（做饭、睡觉、上班、出门）都已经过时，现在必须按当前时间重新判断。
5. 如果已经过去很久，你的前1-2条气泡必须先回应“时间过去了这么久”这件事，再进入具体话题。
6. 绝对禁止忽视时间差，绝对禁止一上来直接正常接话，绝对禁止把长时间未联系说成“刚刚”。
7. 你的回应必须带有人设色彩，例如惊讶、委屈、想念、抱怨、担心、调侃，都可以，但一定要先体现“已经过了很久”。
8. 如果时间跨度特别长（例如几天、一周、半个月），你必须明显表现出“这么久才出现”的感觉，不能只轻描淡写一句带过。`
            });
        }


        // ====== 音乐一次性注入 START (新增) ======
        // 规则：仅当“正在播放”且 pendingInject=true 时，把歌曲信息+整段歌词临时注入本次请求；不写聊天历史。
        try {
            const mp = await new Promise(resolve => loadFromDB(MUSIC_PLAYER_STORE, d => resolve(d || null)));
            const audioEl = document.getElementById('chatMusicAudio');

            const isPlayingNow = !!(audioEl && !audioEl.paused && audioEl.currentSrc);

            if (mp && mp.pendingInject === true && isPlayingNow && mp.pendingSongId) {
                const songs = await new Promise(resolve => loadFromDB(MUSIC_SONGS_STORE, list => resolve(Array.isArray(list) ? list : [])));
                const song = songs.find(s => s.id === mp.pendingSongId);

                const injectText = buildMusicInjectText(song);
                if (injectText) {
                    // 插入到 system 后面，保证模型能看到
                    messages.splice(1, 0, { role: 'user', content: injectText });
                    console.log('🎵 音乐注入已执行 (一次性)');

                    // 立刻清除 pendingInject，避免重复注入
                    saveToDB(MUSIC_PLAYER_STORE, {
                        ...mp,
                        pendingInject: false,
                        pendingSongId: null
                    });
                } else {
                    // 数据不全就清掉，避免一直卡住
                    saveToDB(MUSIC_PLAYER_STORE, {
                        ...mp,
                        pendingInject: false,
                        pendingSongId: null
                    });
                }
            }
        } catch (e) {
            console.warn('🎵 音乐注入失败(忽略):', e);
        }
        // ====== 音乐一次性注入 END ======

        
        if (isClaude) {
            messages.splice(1, 0, {
                role: 'assistant',
                content: `明白了，我现在完全进入【${chat.name}】的角色。我不是 AI 助手，我就是${chat.name}本人。我会完全按照人设来回复，绝不会说"我是 AI/助手"或"我可以帮你写代码"之类的话。现在开始，我就是${chat.name}。`
            });
            console.log('✅ 已为 Claude 注入角色扮演预设');
        }


// ★★★ 新增：如果有抽签事件，追加为最后一条消息 ★★★
if (fortuneEventForThisRequest) {
    messages.push({
        role: 'user',
        content: `刚刚你遇到了一件事：${fortuneEventForThisRequest}。你用正常聊天口吻跟我说说刚发生了什么，并顺带聊下去。

这件事刚刚发生在你身上，现在请你立刻把这件事告诉我！

回复要求：
- 第1-3条气泡：表达你的第一反应（疼/吓一跳/无语/郁闷等情绪）
- 第4-6条气泡：告诉我发生了什么（用你自己的话描述，不要照抄上面）
- 第7-10条气泡：吐槽/问我意见/自然聊天

格式：
- 总共8-12条气泡，用 ||| 分隔
- 每条10-40字
- 不要重复同一句话
- 不要说"系统/通知/提示"这些词
- 最后加 [心声更新]...[/心声更新]

示例（切菜切到手）：
哎呀|||疼死了|||刚才切菜没拿稳|||刀直接削到手指了|||流了点血|||现在在贴创可贴|||你在干嘛呢？|||跟你说说刚才的事|||吓死我了|||[心声更新]...`
    });
    console.log('🎲 抽签事件已作为最后一条消息插入');
}


// ============ 👇 替换这里的指令 👇 ============
if (window.pendingOfflineInvitation) {
    const inviteText = window.pendingOfflineInvitation;
    window.pendingOfflineInvitation = null; 

    messages.push({
        role: 'user',
        content: `【🔥 紧急系统指令：必须执行】
用户刚刚向你发出了线下约会邀请：“${inviteText}”。

现在请根据你的人设和心情决定是否赴约，并严格遵守以下回复规则：
1. 如果你同意赴约：【必须仅】回复“【接受邀约】”（带方括号，绝对不准输出任何其他多余的字！）。
2. 如果你不同意赴约：请先输出“【拒绝邀约】”，然后紧接着用你平时聊天的语气，说出你婉拒的理由。`
    });
}
// ============ 👇 注入结束 👇 ============


        const requestUrl = currentApiConfig.baseUrl.endsWith('/') 
            ? currentApiConfig.baseUrl + 'chat/completions' 
            : currentApiConfig.baseUrl + '/chat/completions';

     

console.log('AI_REQUEST_READY', {
  url: requestUrl,
  model: modelToUse,
  msgCount: messages.length,
  sysLen: (systemPrompt || '').length,
  lastRole: messages[messages.length - 1]?.role,
  lastPreview: String(messages[messages.length - 1]?.content || '').slice(0, 120)
});


        const response = await fetch(requestUrl, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${currentApiConfig.apiKey}`, 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({
                model: modelToUse,
                messages: messages,
                temperature: 0.7,
                stream: false
            })
        });
console.log('AI_RESPONSE_STATUS', response.status);
        //ai回复失败打印
        const rawText = await response.text();
let data;
try {
    data = JSON.parse(rawText);
} catch (e) {
    throw new Error('API返回非JSON：' + rawText.slice(0, 200));
}

if (!response.ok) {
    const msg = (data && data.error && data.error.message) ? data.error.message : rawText;
    throw new Error(msg);
}

// 关键：处理 choices 为空
if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
    // 这里不崩溃成“AI未返回可用文本”，而是给出明确原因提示
    console.warn('AI empty choices:', data);
    throw new Error('模型返回空回复（choices为空）。请重试一次，或更换模型/降低提示词长度。');
}

const msg0 = data.choices[0];
const content = msg0 && msg0.message && typeof msg0.message.content === 'string' ? msg0.message.content : '';
let aiReply = content.trim();

if (!aiReply) {
    console.warn('AI empty content:', data);
    throw new Error('模型返回了空内容。请重试一次，或更换模型。');
}

// ============ 👇 黄金拦截点：邀约静音斩断 👇 ============
if (/[【\[]\s*接受邀约\s*[】\]]/.test(aiReply)) {
    console.log("💌 TA 接受了邀约，立刻静音并切入线下模式！");
    window.pendingOfflineInvitation = null;
    
    // 1. 弹出绝美的装包界面
    if (typeof openPackingModal === 'function') openPackingModal();
    
    // 2. 🌟 恢复输入框和按钮的状态（非常重要，因为我们要提前结束函数）
    const titleElement = document.getElementById('chatDetailTitle');
    const receiveBtn = document.getElementById('receiveBtn');
    const chatInput = document.getElementById('chatInput');
    if (titleElement) titleElement.textContent = '小手机'; // 换回你原本的标题
    if (receiveBtn) {
        receiveBtn.disabled = false;
        receiveBtn.style.opacity = '1';
    }
    if (chatInput) chatInput.disabled = false;
    isReceiving = false;
    
    // 3. 💥 绝对核心：直接杀死后面的所有逻辑！不保存、不渲染！
    return; 
}

if (/[【\[]\s*拒绝邀约\s*[】\]]/.test(aiReply)) {
    console.log("💔 TA 婉拒了邀约...");
    window.pendingOfflineInvitation = null;
    // 抹掉丑陋的【拒绝邀约】标签，只留下 TA 解释和安慰你的话
    aiReply = aiReply.replace(/[【\[]\s*拒绝邀约\s*[】\]]/g, '').trim();
    // 万一 AI 偷懒没写安慰的话，给个保底回复
    if (!aiReply) aiReply = "抱歉呀，我现在有点脱不开身，下次一定陪你！";
}
// ============ 👆 拦截结束 👆 ============


 // ============ 👇 新增：强制修正 Claude 格式 👇 ============
        const detectedModel = detectModelType(currentApiConfig.apiKey, currentApiConfig.defaultModel);
        // 只有当不是 JSON 格式（礼物/分析）时才强力修正，避免破坏 JSON 结构
        if (!aiReply.trim().startsWith('{') && !aiReply.includes('```json')) {
            console.log('正在修正模型格式:', detectedModel);
            aiReply = fixResponseFormat(aiReply, detectedModel);
        }
        // ============ 👆 新增结束 👆 ============

  // ★ 新增：提取礼物信息（超级宽容版，自动修正AI造词）
let giftData = null;

// 定义提取函数
const extractJsonByBrace = (str) => {
    // 1. 查找 "action": "..."，不管值是什么，先定位
    const actionIdx = str.search(/"action"\s*:\s*"[^"]+"/);
    if (actionIdx === -1) return null;

    // 2. 向前找 {
    let start = -1;
    for (let i = actionIdx; i >= 0; i--) {
        if (str[i] === '{') {
            start = i;
            break;
        }
    }
    if (start === -1) return null;

    // 3. 向后找 }
    let count = 0;
    let end = -1;
    for (let i = start; i < str.length; i++) {
        if (str[i] === '{') count++;
        if (str[i] === '}') count--;
        if (count === 0) {
            end = i + 1;
            break;
        }
    }
    if (end === -1) return null;

    return str.substring(start, end);
};

// 执行提取
const jsonStrRaw = extractJsonByBrace(aiReply);

if (jsonStrRaw) {
    console.log('🔍 捕获到潜在 JSON:', jsonStrRaw);
    
    // 清理 JSON
    let jsonStr = jsonStrRaw
        .replace(/，/g, ',')
        .replace(/：/g, ':')
        .replace(/'/g, '"')
        .replace(/\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    try {
        // 尝试解析
        const parsed = JSON.parse(jsonStr);
        const payload = parsed.payload || parsed;
        
        // ★★★ 核心修复：自动纠正 AI 的造词 ★★★
        let actionType = parsed.action;
        if (actionType === 'request_user_pay' || actionType === 'ask_pay') actionType = 'ask_user_pay';
        if (actionType === 'give_gift' || actionType === 'send_gift_to_user') actionType = 'send_gift';

        // 只有是合法的类型才处理
        if (actionType === 'send_gift' || actionType === 'ask_user_pay') {
            giftData = {
                action: actionType, // 使用修正后的 action
                product_name: payload.item_name || payload.product_name || payload.itemName || payload.productName || '神秘礼物',
                price: parseFloat(payload.amount || payload.price || payload.cost) || 0
            };
            console.log('💾 giftData 已设置，等待循环处理:', giftData);

            console.log('✅ JSON 解析并修正成功:', giftData);
            aiReply = aiReply.replace(jsonStrRaw, '').trim(); 
        }

    } catch (e) {
        console.warn('⚠️ JSON.parse 失败，尝试正则暴力提取:', e);
        
        
        // 正则暴力提取
        try {
            // 匹配任意 action 值
            const actionMatch = jsonStr.match(/"action"\s*:\s*"([^"]+)"/);
            const nameMatch = jsonStr.match(/"(?:item_name|product_name|itemName|productName|name)"\s*:\s*"([^"]+)"/);
            const priceMatch = jsonStr.match(/"(?:amount|price|cost)"\s*:\s*(\d+\.?\d*)/);

            if (actionMatch && (nameMatch || priceMatch)) {
                let act = actionMatch[1];
                // 正则提取也要纠错
                if (act === 'request_user_pay' || act === 'ask_pay') act = 'ask_user_pay';
                if (act === 'give_gift') act = 'send_gift';

                if (act === 'send_gift' || act === 'ask_user_pay') {
                    giftData = {
                        action: act,
                        product_name: nameMatch ? nameMatch[1] : '礼物',
                        price: priceMatch ? parseFloat(priceMatch[1]) : 0
                    };
                   
                    aiReply = aiReply.replace(jsonStrRaw, '').trim();
                }
            }
        } catch (e2) {
            console.error('❌ 提取彻底失败');
        }
    }
}
// ============ 👇 在这里插入新代码 👇 ============
// ★★★ 核心修复：如果有提取到礼物数据，立即生成订单消息 ★★★
if (giftData) {
    console.log('🎁 正在执行生成礼物订单:', giftData);
    
    // 1. 转换类型：将 AI 的指令转换为数据库存储类型
    let internalOrderType = 'ai_buy_for_user'; // 默认：AI送礼 (send_gift)
    let internalStatus = 'paid';               // 状态：已支付
    // 如果是求代付
    if (giftData.action === 'ask_user_pay') {
        internalOrderType = 'ai_ask_user_pay';
        internalStatus = 'pending';            // 状态：待确认
    }
    // 2. 构造商品列表格式
    const orderItems = [{
        name: giftData.product_name,
        quantity: 1,
        price: giftData.price
    }];
    // 3. 调用现有的创建订单函数
    // 这会在聊天记录里插入一张漂亮的购物卡片
    createShoppingOrderMessage(
        internalOrderType,
        internalStatus,
        giftData.price,
        orderItems
    );
}
// ============ 👆 插入结束 👆 ============

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
        const memMatch = aiReply.match(/$$MEM:(\d+)$$/);
        if (memMatch) {
            triggeredMemoryId = parseInt(memMatch[1]);
            aiReply = aiReply.replace(/$$MEM:\d+$$/g, '').trim();
        }

// ====== 修复版：状态提取（支持 【状态】和 [状态]） ======
const statusPatterns = [
    // 优先：[状态]xxx||| 或 【状态】xxx|||
    /^\s*[【\[]\s*状态\s*[】\]]\s*([^\|\n\r【\[]+?)\s*\|\|\|/,
    // 次优：行开头 [状态]xxx（后面没 |||）
    /^\s*[【\[]\s*状态\s*[】\]]\s*([^\n\r【\[]+)/,
    // 兜底：全局找一次 [状态]xxx|||
    /[【\[]\s*状态\s*[】\]]\s*([^\|\n\r【\[]+?)\s*\|\|\|/
];

let statusText = null;

for (const pattern of statusPatterns) {
    const match = aiReply.match(pattern);
    if (match && match[1]) {
        statusText = match[1].trim();
        break;
    }
}

// 清洗：去掉可能残留的分隔符、限制长度
if (statusText) {
    statusText = statusText.replace(/\|\|\|/g, '').trim();
    if (statusText.length > 14) statusText = statusText.substring(0, 14);
    
    // 写入数据库并刷新界面
    setCharacterStatusForChat(currentChatId, statusText);
    
    // ★★★ 关键补充：从 aiReply 里删掉状态气泡，避免重复显示 ★★★
    // 找到状态气泡的完整片段（例如 "[状态]在煮面|||"）并剔除
    aiReply = aiReply.replace(/^\s*[【\[]\s*状态\s*[】\]][^\|]*?\|\|\|/, '').trim();
}
// ====== 修复版：状态提取结束 ======



// ====== 修改开始：解析-状态监控标签改为[心声更新] ======
const statusUpdateMatch = aiReply.match(/\[心声更新\](.*?)\[\/心声更新\]/s);
if (statusUpdateMatch) {
    const statusStr = statusUpdateMatch[1];
   

    const parseField = (field) => {
        const regex = new RegExp(field + '[:：]([^|]+)');
        const match = statusStr.match(regex);
        return match ? match[1].trim() : null;
    };

    const newStatus = {
        mood: parseField('心情') || '平静',
        moodLevel: parseInt(parseField('心情值')) || 75,
        heartbeat: parseInt(parseField('心跳')) || 75,
        clothesStyle: parseField('穿着风格') || '日常',
        clothesTags: (parseField('穿着单品') || '').split(/[,，、]/).filter(t => t),
        action: parseField('行为') || '正在聊天',
        thoughts: parseField('想法') || '...',
    };



    loadFromDB('characterInfo', (data) => {
        const charData = data && data[currentChatId] ? data[currentChatId] : {};
        if (charData.statusMonitorEnabled) {
            const allData = data || {};
            if (!allData[currentChatId]) allData[currentChatId] = {};
            allData[currentChatId].statusMonitor = newStatus;
            saveToDB('characterInfo', allData);

            

            loadStatusMonitorData();
            updateHeartbeatBarVisibility();
            loadStatusMonitorData();
        }
    });

    // 从回复中移除心声更新块，防止显示给用户
    aiReply = aiReply.replace(/\[心声更新\].*?\[\/心声更新\]/s, '').trim();
}
// ====== 修改结束：解析-状态监控标签改为[心声更新] ======

// ★★★ 新增：如果状态监控关闭，强制清理残留的心声标记 ★★★
if (!statusMonitorEnabled) {
    // 清理任何可能残留的心声更新标记（防止AI不听话）
    aiReply = aiReply.replace(/\[心声更新\][\s\S]*?\[\/心声更新\]/g, '').trim();
    aiReply = aiReply.replace(/【心声更新】[\s\S]*?【\/心声更新】/g, '').trim();
    // 也清理可能的残缺标记
    aiReply = aiReply.replace(/\[心声更新\][\s\S]*/g, '').trim();
    aiReply = aiReply.replace(/\[\/心声更新\]/g, '').trim();
}


// 解析 AI 的引用标记（兼容【引用：】和[引用:]）
const aiQuoteRegex = /[【\[]\s*引用\s*[:：]\s*(.*?)\s*[】\]]/g;
let aiQuoteMatch;
const aiQuotes = [];

while ((aiQuoteMatch = aiQuoteRegex.exec(aiReply)) !== null) {
    const quotedText = (aiQuoteMatch[1] || '').trim();
    if (!quotedText) continue;
    
    // 在历史消息中查找匹配的用户消息
    let matchedMessage = null;
    for (let i = allMessages.length - 1; i >= 0; i--) {
        const msg = allMessages[i];
        if (msg.senderId === 'me' && msg.content && msg.content.includes(quotedText)) {
            matchedMessage = msg;
            break;
        }
    }
    
    if (matchedMessage) {
        aiQuotes.push({
            originalText: aiQuoteMatch[0], // 完整标记（用于后面查找删除）
            quotedMessageId: matchedMessage.id,
            quotedContent: matchedMessage.content,
            quotedTime: formatMessageTime(matchedMessage.time)
        });
    }
}



// 保护引用标记，避免后续清理 replace 误伤（兼容【引用：】和[引用:]）
const quoteBlocks = [];
aiReply = aiReply.replace(/[【\[]\s*引用\s*[:：]\s*[^【\[\]】]+?\s*[】\]]/g, (m) => {
    const key = `__QUOTE_BLOCK_${quoteBlocks.length}__`;
    quoteBlocks.push({ key, raw: m });
    return key;
});




// 中文注释：保护 HTML 卡片区块，避免被后续 replace 正则误删
const cardBlocks = [];
aiReply = aiReply.replace(/\[\[CARD_HTML\]\][\s\S]*?\[\[\/CARD_HTML\]\]/g, (m) => {
    const key = `__CARD_BLOCK_${cardBlocks.length}__`;
    cardBlocks.push({ key, html: m });
    return key;
});


// ★★★ 新增：调试日志 - 查看 AI 原始回复 ★★★
console.log('===== AI 原始回复 (完整) =====');
console.log(aiReply);
console.log('===== 原始回复结束 =====');

             // 11. 清理回复内容（增强版：过滤元信息泄露）
   let messageContent = aiReply
    .replace(/^(Assistant|AI|Role)[:：]\s*/i, '')
    // ★★★ 强制修正 Claude 的表情包错误格式 ★★★
    .replace(/\[发送了表情\s*[:：]\s*([^\]]+)\]/g, (match, keyword) => {
        const cleanKeyword = keyword.replace(/["']/g, '').trim();
        return `【搜表情:${cleanKeyword}】`;
    })
    // ★★★ 修复：清理所有格式的状态标记 ★★★
    .replace(/[【\[]\s*状态\s*[】\]][^\|]*?\|\|\|/g, '')
    .replace(/[【\[]\s*状态\s*[】\]][^\|]*/g, '')
    .replace(/\|\|\|\s*[【\[]\s*状态\s*[】\]][^\|]*/g, '|||')
    // ★★★ 强力兜底：清理 [正在xxx] 【正在xxx】 形式的动作状态 ★★★
    .replace(/[【\[]\s*正在[^\|】\]]*[】\]]/g, '')
    .replace(/[【\[]\s*状态[:：][^\|】\]]*[】\]]/g, '')
    .replace(/\[消息\]\s*[:：]?/g, '')
    .replace(/【消息】\s*[:：]?/g, '')
    .replace(/\[心声更新\].*?\[\/心声更新\]/s, '')
    .replace(/\[心声更新\][\s\S]*/g, '')
    // ★★★ 修改点：只删除系统/提示类垃圾，放行正常的【】和（） ★★★
    .replace(/[【\[（(]\s*(?:System|系统|提示|规则|指令|注意|格式|Role|Assistant|User|Reply|Generate|Note)[:：\s][^【\[\]）)]*[】\]）)]/gi, '')
    .replace(/[（(]\s*这是.*?(?:系统|提示|规则|记录|仅你可见|注意|AI|助手|指令|格式).*?[)）]/gi, '')
    .replace(/^\|\|\|+/g, '')
    .replace(/\|\|\|+$/g, '')
    .replace(/\|\|\|{3,}/g, '|||')
    .trim();

// ★★★ 新增：去除相邻重复气泡 ★★★
const bubbles = messageContent.split('|||').map(b => b.trim()).filter(b => b);
const uniqueBubbles = [];
let lastBubble = '';
for (const bubble of bubbles) {
    // 只有当内容不同时才添加
    if (bubble !== lastBubble) {
        uniqueBubbles.push(bubble);
        lastBubble = bubble;
    }
}
messageContent = uniqueBubbles.join('|||');
// ★★★ 去重结束 ★★★
// ★★★ 调试日志 ★★★
console.log('✅ 去重后气泡数:', uniqueBubbles.length);
messageContent = messageContent.replace(/(^|\|\|\|)\s*[：:\-—]+\s*/g, '$1');
messageContent = messageContent.replace(/\b20\d{2}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\b/g, '');


// ★★★ 新增：清理 [[/CARD_HTML]] 后面泄露的 HTML 闭合标签 ★★★
messageContent = messageContent.replace(/(\[\[\/CARD_HTML\]\])\s*(<\/[^>]+>)+/g, '$1');
// ★★★ 新增：清理 [[CARD_HTML]] 前面可能的 HTML 开始标签 ★★★
messageContent = messageContent.replace(/(<[^/>]+>)+\s*(\[\[CARD_HTML\]\])/g, '$2');

// ★★★ 新增：支持AI直接用ID发送表情包【发表情:数字】 ★★★
messageContent = messageContent.replace(/[【\[]\s*发表情\s*[:：]\s*(\d+)\s*[】\]]/g, (match, emojiId) => {
    const id = parseInt(emojiId);
    const emoji = emojiList.find(e => e.id === id);
    if (emoji) {
        console.log('✅ AI直接选择表情包 - ID:', id, '描述:', emoji.text);
        return `|||【EMOJI:${emoji.id}】|||`;
    }
    console.warn('⚠️ 表情包ID不存在:', id);
    return '';
});


// === 处理 AI 选择的表情包（新格式：【表情包:关键词】） ===
messageContent = messageContent.replace(/[【\[]\s*表情包\s*[:：]\s*(.+?)\s*[】\]]/g, (match, keyword) => {
    const cleanKeyword = keyword.trim();
    
    // 精确匹配（不区分大小写）
    const emoji = emojiList.find(e => e.text.toLowerCase() === cleanKeyword.toLowerCase());
    
    if (emoji) {
        console.log('✅ AI 选择的表情包 - 关键词:', cleanKeyword, 'ID:', emoji.id, 'URL:', emoji.url);
        return `|||【EMOJI:${emoji.id}】|||`;
    } else {
        console.warn('⚠️ AI 编造了不存在的关键词:', cleanKeyword, '- 已忽略，不发送表情包');
        return ""; // 删除标记，不发表情包
    }
});

// === 兼容旧格式：【搜表情:关键词】 ===
messageContent = messageContent.replace(/[【\[]\s*搜表情\s*[:：]\s*(.+?)\s*[】\]]/g, (match, keyword) => {
    let emoji = searchEmojiByKeyword(keyword.trim());
    // ★★★ 修复：去掉随机fallback，找不到就不发 ★★★
    if (emoji) {
        console.log('🔵 搜表情匹配成功 - 关键词:', keyword, '-> 表情:', emoji.text);
        return `|||【EMOJI:${emoji.id}】|||`;
    }
    console.warn('⚠️ 搜表情未匹配，已忽略:', keyword);
    return ""; 
});

// ★★★ 新增：调试日志（可选，方便你排查问题） ★★★
console.log('🔍 清理后内容预览:', messageContent.substring(0, 150) + '...');
if (messageContent.includes('系统') || messageContent.includes('提示')) {
    console.warn('⚠️ 警告：清理后仍包含元信息关键词！');
}

            // ============ 👇 插入新代码：HTML卡片防碎补丁 👇 ============
            // 1. 统一标签格式（防止因空格导致保护失效，进而被换行符切碎）
            // 这里必须用 \[ 转义方括号，绝对不能用 $$
            messageContent = messageContent
                .replace(/\[+\s*CARD_HTML\s*\]+/gi, '[[CARD_HTML]]')
                .replace(/\[+\s*\/CARD_HTML\s*\]+/gi, '[[/CARD_HTML]]');
            
            // 2. 清理可能包裹卡片的 Markdown 符号
            messageContent = messageContent
                .replace(/```html/gi, '')
                .replace(/```/g, '');
            // ============ 👆 插入结束 👆 ============


// 还原引用标记
if (quoteBlocks.length > 0) {
    quoteBlocks.forEach(it => {
        messageContent = messageContent.replace(it.key, it.raw);
    });
}


// 中文注释：还原 HTML 卡片区块
if (cardBlocks.length > 0) {
    cardBlocks.forEach(it => {
        messageContent = messageContent.replace(it.key, it.html);
    });
}

 // ★★★ 新增：自动检测并包裹裸露的 HTML ★★★
        // 如果 AI 自己写了 <style> 或 <div> 等 HTML 但没用 [[CARD_HTML]] 包裹，自动包裹
        messageContent = messageContent.replace(
            /(<style[\s\S]*?<\/style>[\s\S]*?<\/div>)/g,
            '[[CARD_HTML]]$1[[/CARD_HTML]]'
        );


// 12. 分割消息（增强版：先验证格式）
let messageList = [];

// ===== 👇 在 if/else 之前先修复被打散的指令 =====
// 修复语音指令
messageContent = messageContent.replace(
    /([【\[]\s*发送语音\s*[:：][^】\]]*?)\|\|\|([^】\]]*?[】\]])/g,
    '$1$2'
);
// 修复引用指令
messageContent = messageContent.replace(
    /([【\[]\s*引用\s*[:：][^】\]]*?)\|\|\|([^】\]]*?[】\]])/g,
    '$1$2'
);
// 修复图片指令
messageContent = messageContent.replace(
    /([【\[]\s*图片\s*[:：][^】\]]*?)\|\|\|([^】\]]*?[】\]])/g,
    '$1$2'
);
// 修复搜表情指令
messageContent = messageContent.replace(
    /([【\[]\s*搜表情\s*[:：][^】\]]*?)\|\|\|([^】\]]*?[】\]])/g,
    '$1$2'
);
// 修复转账指令
messageContent = messageContent.replace(
    /([【\[]\s*转账\s*[:：][^】\]]*?)\|\|\|([^】\]]*?[】\]])/g,
    '$1$2'
);
// ===== 修复结束 =====


// 先检查是否包含分隔符
        if (messageContent.includes('|||')) {
            messageList = messageContent
                .split('|||')
                .map(m => m.trim())
                .filter(m => m.length > 0);
            
            console.log(`✅ 成功分割成 ${messageList.length} 条气泡`);
        } else {
            console.warn('⚠️ AI 回复中没有 ||| 分隔符，按标点符号切分');
            
            // 1. 先保护 HTML 卡片（原逻辑）
            const protectedRes = protectCardBlocks(messageContent);
            let smartBase = protectedRes.out;

            // 2. ★新增：通用括号内容保护★ 
            // 作用：将 【...】 [ ... ] ( ... ) （ ... ） 里的内容全部替换为临时占位符
            // 目的：防止里面的感叹号、问号被下一步的标点切割逻辑误伤
            const bracketBlocks = [];
            smartBase = smartBase.replace(/([【\[（(][^】\]）)]+?[】\]）)])/g, (match) => {
                const key = `__BRK_BLOCK_${bracketBlocks.length}__`;
                bracketBlocks.push({ key, raw: match });
                return key;
            });

            // ============ 👇 改进的核心代码开始 👇 ============
            
            // 3. 智能标点处理
            let smartContent = smartBase;
            // [A] 保护省略号：先把 ... 和 … 替换成特殊占位符，防止被当成句号切开
            smartContent = smartContent
                .replace(/\.\.\./g, '%%ELLIPSIS_DOTS%%')
                .replace(/…/g, '%%ELLIPSIS_CHAR%%');
            // [B] 智能切分：
            // 规则：匹配 [。！？!?] 这些标点
            // (?![”’"']) 是“负向先行断言”，意思是：如果标点后面紧跟着 引号，则不切分（等引号结束了再让自然换行或下一个逻辑去处理）
            smartContent = smartContent
                .replace(/([。！？!?]+)(?![”’"'])/g, "$1|||") 
                .replace(/[\n\r]+/g, "|||"); // 换行符依然强制切分
            // [C] 还原省略号
            smartContent = smartContent
                .replace(/%%ELLIPSIS_DOTS%%/g, '...')
                .replace(/%%ELLIPSIS_CHAR%%/g, '…');
            // ============ 👆 改进的核心代码结束 👆 ============
            // 4. 还原被保护的括号内容（原逻辑）
            bracketBlocks.forEach(b => {
                smartContent = smartContent.replace(b.key, b.raw);
            });
            // 5. HTML 卡片占位符前后强制断开（原逻辑）
            smartContent = smartContent
                .replace(/(__CARD_BLOCK_\d+__)/g, '|||$1|||')
                .replace(/\|\|\|{2,}/g, '|||')  // 清理多余分隔符
                .replace(/^\|\|\|/, '')           // 去掉开头的 |||
                .replace(/\|\|\|$/, '');          // 去掉结尾的 |||
            // 6. 分割
            messageList = smartContent.split('|||').map(m => m.trim()).filter(m => m.length > 0);
            
            // [D] 额外优化：合并过短的气泡（防碎嘴）
            // 如果一个气泡少于4个字，且不包含特殊指令/表情，尝试把它合并到上一个气泡
            const mergedList = [];
            if (messageList.length > 0) {
                mergedList.push(messageList[0]);
                for (let i = 1; i < messageList.length; i++) {
                    const prev = mergedList[mergedList.length - 1];
                    const curr = messageList[i];
                    
                    // 判断是否过短 (少于4个字，且不是表情包/图片/卡片)
                    const isShort = curr.length < 4 && !curr.includes('【') && !curr.includes('__CARD');
                    // 判断上一个气泡是否也比较短 (少于20字)，避免合并出巨型气泡
                    const prevNotTooLong = prev.length < 20;
                    if (isShort && prevNotTooLong) {
                        // 合并！
                        mergedList[mergedList.length - 1] += (" " + curr);
                    } else {
                        mergedList.push(curr);
                    }
                }
                messageList = mergedList;
            }
            // 7. 还原 HTML 卡片（原逻辑）
            messageList = messageList.map(m => restoreCardBlocks(m, protectedRes.blocks));
            
            console.log(`🤖 智能切分完成，生成 ${messageList.length} 条气泡`);
        }
       

// ★★★ 强制规则：HTML 必须单独一个气泡 ★★★
messageList = messageList.flatMap(msg => {
    // 检测是否包含 [[CARD_HTML]] 标记
    if (!/\[\[CARD_HTML\]\]/.test(msg)) return [msg];
    
    // 提取 HTML 块和前后文本
    const parts = msg.split(/(\[\[CARD_HTML\]\][\s\S]*?\[\[\/CARD_HTML\]\])/);
    return parts.filter(p => p.trim().length > 0);
});




messageList = messageList
    .map(msg => String(msg || '').trim())
    .filter(msg => msg.length > 0);



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

// ===== 世界书图隐藏指令：【图片：关键词】=====
// 逻辑修正：只有找到真实图片时才拦截；否则放行生成文字图
const wbImgMatch = msgText.match(/[【\[]\s*图片\s*[:：]\s*([^】\]]+)\s*[】\]]/);
if (wbImgMatch) {
    const keyword = (wbImgMatch[1] || '').trim();

    // 仅在 worldbook / coexist 模式下才查世界书图
    const mode = characterInfo.imageMode || 'coexist';
    
    // 标记是否已处理（已发真实图）
    let handled = false;

    if (mode === 'worldbook' || mode === 'worldbook_only' || mode === 'coexist') {
        const url = await findImageInWorldbook(keyword);
        if (url) {
            // 插入真实图片（ID 保证唯一且顺序跟随当前气泡）
            const imgMsgId = Date.now() + i + 2;
            allMessages.push({
                id: imgMsgId,
                chatId: currentChatId,
                senderId: chat.name,
                time: getCurrentTime(),
                isRevoked: false,
                type: 'image',
                content: url
            });

            saveMessages();
            updateChatLastMessage(currentChatId, '[图片]');
            visibleMessagesCount = allMessages.length;
            renderMessages();
            scrollToBottom();
            playNotificationSound();
            
            handled = true; // 标记为已处理
        }
    }

    // ★★★ 核心修复 ★★★
    // 只有当“成功发了真实图片” 或者 “模式是仅世界书(worldbook_only)” 时，才跳过当前气泡
    // 否则（没找到图，且允许文字图），就放行，让下面的代码把它渲染成【文字图卡片】
    if (handled || mode === 'worldbook_only') {
        continue;
    }
}
// ===== 世界书图隐藏指令结束 =====

    
// 确认代付逻辑（兼容【确认代付】和[确认代付]）
if (/[【\[]\s*确认代付\s*[】\]]/.test(msgText)) {
    console.log('🔍 检测到确认代付标记');
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
            content: `${chat.name} 已帮你代付 ¥${pendingOrder.orderData.totalPrice.toFixed(2)}`,
            time: getCurrentTime()
        });
        
        saveMessages();
    }
    
    msgText = msgText.replace(/[【\[]\s*确认代付\s*[】\]]/g, '').trim();
    if (!msgText) continue;
}



// ============ 👇 在这里插入新代码 👇 ============
// 领取转账逻辑（兼容【领取转账】和[领取转账]）
if (/[【\[]\s*领取转账\s*[】\]]/.test(msgText)) {
    console.log('🔍 检测到领取转账标记');
    
    // 1. 查找最近一条：用户发的(me)、且状态为 sent (待领取) 的转账消息
    // allMessages 是按时间正序的，所以我们要倒序查找(slice().reverse())最近的一条
    const pendingTransfer = allMessages.slice().reverse().find(m => 
        m.type === 'transfer' && 
        m.senderId === 'me' && 
        m.transferData && 
        m.transferData.status === 'sent'
    );
    
    if (pendingTransfer) {
        // 2. 修改状态为 'aiReceived' (表示被对方领取)
        // 注意：renderMessages 里判断逻辑是：如果是'me'发的，状态要是'aiReceived'才显示已领取
        pendingTransfer.transferData.status = 'aiReceived';
        
        // 3. 插入一条系统提示消息
        const sysMsgId = Date.now() + i + 900;
        allMessages.push({
            id: sysMsgId,
            chatId: currentChatId,
            type: 'system',
            content: `${chat.name} 已领取你的转账 ¥${pendingTransfer.transferData.amount.toFixed(2)}`,
            time: getCurrentTime()
        });
        
        // 4. 保存更改到数据库
        saveMessages();
        console.log('✅ 转账状态已更新为已领取');
    } else {
        console.log('⚠️ AI试图领取转账，但没找到可领取的转账消息');
    }
    
    // 5. 从回复文本中删掉【领取转账】这几个字，避免显示在气泡里
    msgText = msgText.replace(/[【\[]\s*领取转账\s*[】\]]/g, '').trim();
    
    // 如果删掉后没内容了（AI只回了个指令），就跳过这条气泡的渲染
    if (!msgText) continue;
}
// ============ 👆 插入结束 👆 ============



// ============ 拦截 AI 主动发起的邀约 ============
const aiInviteMatch = msgText.match(/[【\[]\s*发起邀约\s*[:：]\s*([^】\]]+)\s*[】\]]/);
if (aiInviteMatch) {
    const inviteContent = aiInviteMatch[1].trim();
    
    // 🌟 核心改动：不再弹出 alert，而是弹出我们刚做的精美卡片
    setTimeout(() => {
        showReceivedInvitation(inviteContent);
    }, 800);
    
    // 静音处理：把指令从气泡里蒸发掉，保持屏幕干净 
    msgText = msgText.replace(/[【\[]\s*发起邀约\s*[:：]\s*[^】\]]+\s*[】\]]/g, '').trim();
}
// ============ 👆 拦截结束 👆 ============

// 构建消息对象
const newId = Date.now() + i;

// ★★★ 新增：AI 生图 / 世界书图 / 文字图 三模式独立控制 (最终版) ★★★
let finalText = msgText;
let imageMessage = null;

// 获取当前模式
// 允许的值: 'text_image_only' (仅文字图), 'worldbook_only' (仅世界书), 'ai_generate' (AI生图)
// 兼容旧值: 'text' -> 'text_image_only', 'worldbook' -> 'worldbook_only', 'hybrid' -> 'ai_generate'
let imageMode = characterInfo.imageMode || 'text_image_only';
if (imageMode === 'text') imageMode = 'text_image_only';
if (imageMode === 'worldbook') imageMode = 'worldbook_only';
if (imageMode === 'hybrid' || imageMode === 'coexist') imageMode = 'ai_generate';

// --- 模式 1：纯文字图模式 ---
if (imageMode === 'text_image_only') {
    // 逻辑：保留标签，后续渲染为文字卡片
    finalText = msgText;
    imageMessage = null;
}

// --- 模式 2：纯世界书模式 ---
else if (imageMode === 'worldbook_only') {
    // 逻辑：只查世界书。搜不到 -> 不发。
    const result = await processWorldbookImage(msgText);
    finalText = result.finalText;
    imageMessage = result.imageMessage;
}

// --- 模式 3：AI 生图模式 (ai_generate) ---
else if (imageMode === 'ai_generate') { 
    // ★★★ 核心判断：只有当【总开关打开】时才执行 ★★★
    if (currentImageApiConfig && currentImageApiConfig.enabled) {
        // 1. 提取关键词
        const match = msgText.match(/[【\[]\s*图片\s*[:：]\s*([^】\]]+)\s*[】\]]/);
        
        if (match) {
            const keyword = match[1].trim();
            
            // 2. 清除文本中的 [图片:xxx] 标签
            finalText = msgText.replace(match[0], '').trim();
            
            // 3. 创建"占位符"消息
          const aiLoadingSvg = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="720" height="960" viewBox="0 0 720 960">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f6f7fb"/>
      <stop offset="100%" stop-color="#eceff5"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <text x="50%" y="48%" text-anchor="middle" fill="#98a2b3" font-size="30" font-family="Arial">AI绘图生成中...</text>
  <text x="50%" y="54%" text-anchor="middle" fill="#b0b8c5" font-size="22" font-family="Arial">请稍候</text>
</svg>
`);

imageMessage = {
    type: 'image',
    content: aiLoadingSvg, // 合法图片src，避免破图
    isAiGenerating: true,
    aiPrompt: keyword,
    altText: `AI生成中：${keyword}`
};
        } else {
            // 没匹配到标签
            finalText = msgText;
            imageMessage = null;
        }
    } else {
        // ★★★ 开关没开：直接忽略，什么都不发 ★★★
        console.warn('⚠️ AI生图模式已选，但总开关未开启，跳过生图');
        // 清除标签，防止露出 [图片:xxx]
        finalText = msgText.replace(/[【\[]\s*图片\s*[:：]\s*([^】\]]+)\s*[】\]]/g, '').trim();
        imageMessage = null;
    }
}

// ★★★ 核心修复：拆分文字和 HTML 卡片 ★★★

            const parts = splitHtmlCardFromText(finalText);
            
            // ============ 👇 修复开始：强力清洗残留标签 👇 ============
            let textPart = (parts.text || '').trim();
            
            // 1. 如果文字部分只剩下闭合标签，直接清空
            if (textPart === '[[/CARD_HTML]]') {
                textPart = '';
            }
            // 2. 只要文字里包含闭合标签，就把它抠掉（防止出现第二个气泡）
            textPart = textPart.replace(/\[\[\/CARD_HTML\]\]/g, '').trim();
            // ============ 👆 修复结束 👆 ============

            const cardPart = parts.cardHtml;


// 1. 如果有文字部分，创建文字消息
let newMessage = null;
if (textPart) {
    newMessage = {
        id: newId,
        chatId: currentChatId,
        senderId: chat.name,
        time: getCurrentTime(),
        isRevoked: false,
        type: extractImageDescription(textPart) ? 'text_image' : 'text',
        content: textPart
    };
}

// 2. 如果有卡片部分，创建卡片消息（延迟100ms，确保顺序）
let cardMessage = null;
if (cardPart) {
    cardMessage = {
        id: newId + 1,
        chatId: currentChatId,
        senderId: chat.name,
        time: getCurrentTime(),
        isRevoked: false,
        type: 'text',
        content: `[[CARD_HTML]]${cardPart}[[/CARD_HTML]]` // 完整保留卡片标记
    };
}
// ▲▲▲ 世界书图处理 + HTML 拆分结束 ▲▲▲

// ============ 👇 在这里插入新代码 👇 ============
            // 如果没有成功渲染成组件（newMessage 为空），说明可能是格式错了
            if (!newMessage) {
                // 1. 定义清理正则：匹配【任何括号】包裹的【功能关键词】
                const cleanupRegex = /[【\[（(]\s*(?:发送语音|搜表情|图片|转账|确认代付|领取转账|引用|EMOJI).*?[】\]）)]/gi;
                
                // 2. 执行删除
                if (cleanupRegex.test(msgText)) {
                    msgText = msgText.replace(cleanupRegex, '').trim();
                }
            }
            // 3. ★核心防空气泡★：如果清洗后没字了，且也不是组件，直接跳过本次循环
            if (!newMessage && !cardMessage && !imageMessage && !msgText) {
                continue; 
            }
            // ============ 👆 插入结束 👆 ============

// 处理 AI 的引用（兼容【】和[]）
if (aiQuotes.length > 0) {
    for (const quote of aiQuotes) {
        // 用正则判断（更宽容），防止 includes 因空格/格式微小差异失败
        const quoteRegex = /[【\[]\s*引用\s*[:：]\s*[^【\[\]】]+?\s*[】\]]/;
      if (quoteRegex.test(msgText)) {
    if (newMessage) {
        newMessage.quotedMessageId = quote.quotedMessageId;
        newMessage.quotedAuthor = '我';
        newMessage.quotedContent = quote.quotedContent;
        newMessage.quotedTime = quote.quotedTime;

        msgText = msgText.replace(quoteRegex, '').trim();
        newMessage.content = msgText;
    }
    break;
}

    }
}


         // 处理引用（兼容按 ID 引用的旧格式：【引用：id】或$$引用:id$$）
const quoteMatch = 
    msgText.match(/[【\[]\s*引用\s*[:：]\s*(\d+)\s*[】\]]/) ||
    msgText.match(/\$\$\s*引用\s*[:：]\s*(\d+)\s*\$\$/);
if (quoteMatch) {
    const quotedId = parseInt(quoteMatch[1]);
    const originalMsg = allMessages.find(m => m.id === quotedId);
   if (originalMsg && newMessage) {
    newMessage.quotedMessageId = originalMsg.id;
    newMessage.quotedAuthor = originalMsg.senderId === 'me' ? '我' : originalMsg.senderId;
    newMessage.quotedContent = originalMsg.content;
    newMessage.quotedTime = formatMessageTime(originalMsg.time);

    msgText = msgText
      .replace(/[【\[]\s*引用\s*[:：]\s*\d+\s*[】\]]/, '')
      .replace(/\$\$\s*引用\s*[:：]\s*\d+\s*\$\$/, '')
      .trim();

    newMessage.content = msgText;
}

}


// 特殊消息类型（统一支持【】和[]，并兼容旧 $$ $$）
const emojiMatch =
  msgText.match(/【\s*EMOJI\s*[:：]\s*(\d+)\s*】/i) ||
    msgText.match(/\[\s*EMOJI\s*[:：]\s*(\d+)\s*\]/i) ||
    msgText.match(/\$\$\s*EMOJI\s*[:：]\s*(\d+)\s*\$\$/i);

const transferMatch =
    msgText.match(/^\s*[【\[]\s*转账\s*[:：]\s*(\d+(?:\.\d{1,2})?)\s*[:：]\s*([\s\S]*?)\s*[】\]]\s*$/) ||
    msgText.match(/^\s*\$\$\s*转账\s*[:：]\s*(\d+(?:\.\d{1,2})?)\s*[:：]?\s*([\s\S]*?)\s*\$\$\s*$/);

const voiceMatch =
    msgText.match(/^\s*[【\[]\s*发送语音\s*[:：]\s*([\s\S]*?)\s*[】\]]\s*$/) ||
    msgText.match(/^\s*发送语音\s*[:：]\s*([\s\S]*?)\s*$/);

const textImageMatch =
    msgText.match(/^\s*[【\[]\s*图片\s*[:：]\s*([\s\S]*?)\s*[】\]]\s*$/) ||
    msgText.match(/^\s*\$\$\s*图片\s*[:：]\s*([\s\S]*?)\s*\$\$\s*$/);

if (newMessage) {
    if (emojiMatch) {
         console.log('🟢 第二次查找 - 匹配到的 ID:', emojiMatch[1]);
        const emoji = emojiList.find(e => e.id == emojiMatch[1]);
          console.log('🟢 第二次查找 - 找到的表情包:', emoji ? emoji.id : '未找到', emoji ? emoji.url : '');
        if (emoji) {
            newMessage.type = 'image';
            newMessage.content = emoji.url;
            newMessage.altText = emoji.text;
            newMessage.isSticker = true;
        }
    } else if (transferMatch) {
        const amount = parseFloat(transferMatch[1]);
        const note = (transferMatch[2] || '').trim();
        newMessage.type = 'transfer';
        newMessage.transferData = { amount, note, status: 'pending' };
    } else if (voiceMatch) {
        let voiceText = (voiceMatch[1] || '').trim();
        voiceText = voiceText.replace(/[\]】]\s*$/, '').trim();
        newMessage.type = 'voice';
        newMessage.content = voiceText;
        newMessage.voiceDuration = calculateVoiceDuration(voiceText);
    } else if (textImageMatch) {
        newMessage.type = 'text_image';
        newMessage.content = (textImageMatch[1] || '').trim();
    }
}
if (triggeredMemoryId && newMessage && newMessage.type === 'text' && i === messageList.length - 1) {
    newMessage.memoryId = triggeredMemoryId;
}


            // ★★★ 核心修复：按顺序插入文字、卡片、图片（如果有） ★★★

// 1. 插入文字消息（如果有）
if (newMessage) {
    allMessages.push(newMessage);
}

// 2. 插入卡片消息（如果有）
if (cardMessage) {
    allMessages.push(cardMessage);
}


// 3. 插入世界书图（如果有）★★★ 加强检查，防止 null 报错 ★★★
if (imageMessage && typeof imageMessage === 'object' && imageMessage.content) {
    // ★★★ 二次确认：文字图模式时绝对不插入 ★★★
    const imageMode = characterInfo.imageMode || 'coexist';
    
    if (imageMode === 'text' || imageMode === 'text_image_only') {  // ✅ 兼容两种值
        console.warn('⚠️ 检测到文字图模式，跳过世界书图插入');
    } else {
        const imgMsgId = Date.now() + i + 2;
      const imgMessage = {
    id: imgMsgId,
    chatId: currentChatId,
    senderId: chat.name,
    time: getCurrentTime(),
    isRevoked: false,
    type: 'image',
    content: imageMessage.content,
    isAiGenerating: !!imageMessage.isAiGenerating,
    aiPrompt: imageMessage.aiPrompt || '',
    altText: imageMessage.altText || 'AI生成中'
};
        allMessages.push(imgMessage);
          // ============ 👇 插入新代码 👇 ============
    // 如果是 AI 生图的占位符，触发后台任务
    if (imageMessage.isAiGenerating) {
        triggerAiImageGeneration(imgMsgId, imageMessage.aiPrompt);
    }
    // ============ 👆 插入结束 👆 ============
        console.log('✅ 已插入世界书图:', imageMessage.content.substring(0, 50));
    }
}



// 保存消息
saveMessages();

// 更新预览（取最后一条的内容）
let previewText = '[消息]';
if (cardMessage) previewText = '[HTML卡片]';
else if (imageMessage) previewText = '[图片]';
else if (newMessage) {
    previewText = newMessage.type === 'text_image' ? '[文字图]' : (newMessage.type === 'text' ? textPart : `[${newMessage.type}]`);
}

updateChatLastMessage(currentChatId, previewText);

if (typeof playIncomingSound === 'function') {
    playIncomingSound();
}

visibleMessagesCount = allMessages.length;
renderMessages();
scrollToBottom();
playNotificationSound();

 }


  // ★★★ 新增：循环结束后统一刷新一次，确保所有状态更新生效 ★★★
        visibleMessagesCount = allMessages.length;
        renderMessages();
        scrollToBottom();
    } 
    catch (error) {
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

//智能分割保护卡片//
function protectCardBlocks(text) {
    const blocks = [];
    const out = String(text || '').replace(/\[\[CARD_HTML\]\][\s\S]*?\[\[\/CARD_HTML\]\]/g, (m) => {
        const key = `__CARD_BLOCK_${blocks.length}__`;
        blocks.push({ key, raw: m });
        return key;
    });
    return { out, blocks };
}

function restoreCardBlocks(text, blocks) {
    let s = String(text || '');
    (blocks || []).forEach(b => {
        s = s.replaceAll(b.key, b.raw);
    });
    return s;
}



// ============ 补充缺失的 helper 函数 ============
function setCharacterStatusForChat(chatId, statusText) {
    loadFromDB('characterInfo', (dbData) => {
        const allData = dbData || {};
        if (!allData[chatId]) allData[chatId] = {};
        
        // 更新状态字段
        allData[chatId].currentStatus = statusText;
        saveToDB('characterInfo', allData);
        
        // 立即刷新界面显示
        updateDetailPageStatus(chatId);
        updateChatStatusDisplay(chatId);
    });
}

// ============ 1. 辅助函数：分离文本和卡片 (终极去壳版) ============
function splitHtmlCardFromText(text) {
    let s = String(text || '');

    // 1. 【预处理】把各种变体（多重括号、空格）统一成标准标签
    // 正则解释：\[+ 匹配 1个或多个[，能搞定 [CARD_HTML]、[[[CARD_HTML]]] 等
    s = s.replace(/```html/gi, '')
         .replace(/```/g, '')
         .replace(/\[+\s*CARD_HTML\s*\]+/gi, '[[CARD_HTML]]')
         .replace(/\[+\s*\/CARD_HTML\s*\]+/gi, '[[/CARD_HTML]]');

    const startTag = '[[CARD_HTML]]';
    const endTag = '[[/CARD_HTML]]';

    const start = s.indexOf(startTag);
    const end = s.lastIndexOf(endTag);

    // 没找到标签，返回原文
    if (start === -1 || end === -1 || end < start) {
        return { text: s, cardHtml: null };
    }

    // 2. 提取三部分
    let before = s.substring(0, start).trim();
    let cardHtml = s.substring(start + startTag.length, end).trim();
    let after = s.substring(end + endTag.length).trim();

    // 3. 【外部清洗】清理文本中残留的括号 (解决截图里的 [] 气泡)
    // 比如 AI 输出：[] [[CARD_HTML]]... 或 [ [[CARD_HTML]]... ]
    
    // 去掉 before 末尾的 []、[、【
    before = before.replace(/(\[\]|\[|【)+$/, '').trim();
    
    // 去掉 after 开头的 []、]、】
    after = after.replace(/^(\[\]|\]|】)+/, '').trim();

    // 清理 after 里泄露的 HTML 闭合标签
    after = after.replace(/^\s*(<\/[^>]+>)+\s*/g, '');
    after = after.replace(/\s*(<\/[^>]+>)+\s*$/g, '');

    const cleanText = (before + after).trim();

    // 4. 【内部清洗】清理卡片内容
    // 4.1 去掉嵌套的标签 (如果 AI 在里面又写了一遍)
    cardHtml = cardHtml.split('[[CARD_HTML]]').join('');
    cardHtml = cardHtml.split('[[/CARD_HTML]]').join('');
    
    // 4.2 去掉 Markdown
    cardHtml = cardHtml.replace(/^\s*```[a-z]*\s*/i, '').replace(/\s*```\s*$/, '');

    // 4.3 ★★★ 核心修复：去掉卡片内容外层包裹的 [] ★★★
    // 比如 [[CARD_HTML]] [ <div>...</div> ] [[/CARD_HTML]]
    // 检测如果首尾都有括号，就剥皮
    if (cardHtml.startsWith('[') && cardHtml.endsWith(']')) {
        cardHtml = cardHtml.substring(1, cardHtml.length - 1).trim();
    }
    // 中文括号也顺手处理一下
    if (cardHtml.startsWith('【') && cardHtml.endsWith('】')) {
        cardHtml = cardHtml.substring(1, cardHtml.length - 1).trim();
    }

    return { text: cleanText, cardHtml: cardHtml };
}

function sanitizeHtmlCard(dirtyHtml) {
    let html = String(dirtyHtml || '');

    // 中文注释：修正常见中文/花式引号，避免属性解析异常
    html = html.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");

    const tpl = document.createElement('template');
    tpl.innerHTML = html;

    const root = tpl.content;

    // 1) 删除会污染全局/危险的标签（重点：style 必须删）
   const bannedTags = ['script', 'iframe', 'object', 'embed', 'link', 'meta', 'base'];

    bannedTags.forEach(tag => {
        root.querySelectorAll(tag).forEach(el => el.remove());
    });

    // 2) 清理属性（事件、外链、class/id）
    root.querySelectorAll('*').forEach(el => {
      

        Array.from(el.attributes).forEach(attr => {
            const name = attr.name.toLowerCase();
            const value = String(attr.value || '');

            // 2.1 删除所有 onxxx 事件属性
            if (name.startsWith('on')) {
                el.removeAttribute(attr.name);
                return;
            }

            // 2.2 限制 href
            if (name === 'href') {
                const v = value.trim().toLowerCase();
                const ok = v.startsWith('http://') || v.startsWith('https://');
                if (!ok) el.removeAttribute(attr.name);
                else {
                    // 中文注释：防止新窗口劫持
                    el.setAttribute('target', '_blank');
                    el.setAttribute('rel', 'noopener noreferrer');
                }
                return;
            }

            // 2.3 限制 src（允许 data:image 和 http/https）
            if (name === 'src') {
                const v = value.trim().toLowerCase();
                const ok = v.startsWith('http://') || v.startsWith('https://') || v.startsWith('data:image/');
                if (!ok) el.removeAttribute(attr.name);
                return;
            }

            // 2.4 限制 style：禁止 url()/@import/expression/javascript:
            if (name === 'style') {
                const v = value.toLowerCase();
                if (v.includes('url(') || v.includes('@import') || v.includes('expression(') || v.includes('javascript:')) {
                    el.removeAttribute(attr.name);
                }
                return;
            }
        });
    });

    return tpl.innerHTML;
}


// ================================
// 中文注释：把卡片 HTML 包进固定尺寸容器
// - 240 宽
// - 最大高 270（你现在的偏好）
// - 只允许纵向滚动，禁止横向滚动
// ================================
// ============ 辅助函数：ID 隔离 (解决互动失效的核心) ============
function scopeCardIds(html, msgId) {
    if (!html) return '';
    
    // 生成唯一的后缀，比如 _msg1715666_88
    const suffix = `_msg${msgId}_${Math.floor(Math.random() * 99)}`;
    
    // 创建一个临时的 DOM 环境来处理
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // 1. 收集所有 ID
    const elementsWithId = Array.from(doc.querySelectorAll('[id]'));
    const idMap = {}; // 旧ID -> 新ID 的映射

    // 2. 重命名 ID
    elementsWithId.forEach(el => {
        const oldId = el.id;
        const newId = oldId + suffix;
        el.id = newId;
        idMap[oldId] = newId;
    });

    // 3. 更新 label 的 for 属性 (确保点击 label 能触发对应的 input)
    doc.querySelectorAll('label[for]').forEach(label => {
        const oldFor = label.getAttribute('for');
        if (idMap[oldFor]) {
            label.setAttribute('for', idMap[oldFor]);
        }
    });

    // 4. 更新 radio/checkbox 的 name 属性 (防止不同卡片的单选框互斥)
    doc.querySelectorAll('input[name]').forEach(input => {
        const oldName = input.getAttribute('name');
        input.setAttribute('name', oldName + suffix);
    });

    // 5. ★关键★：更新 <style> 里的 #id 选择器
    // 如果不更新 CSS，ID 变了样式就失效了，卡片会乱掉
    doc.querySelectorAll('style').forEach(style => {
        let css = style.innerHTML;
        for (const [oldId, newId] of Object.entries(idMap)) {
            // 正则替换：匹配 #oldId，且后面不是字母数字下划线（防止误伤类似 #id_2）
            const regex = new RegExp(`#${oldId}(?![a-zA-Z0-9_-])`, 'g');
            css = css.replace(regex, `#${newId}`);
        }
        style.innerHTML = css;
    });

    return doc.body.innerHTML;
}

// ============ 2. 辅助函数：构建卡片容器 (升级版) ============
function buildHtmlCardContainer(html, id) {
    // 1. 先进行安全清洗 (去脚本)
    let safeHtml = html;
    if (typeof sanitizeHtmlCard === 'function') {
        safeHtml = sanitizeHtmlCard(html);
    }

    // 2. ★核心修复★：进行 ID 隔离
    // 这一步确保每个卡片的 ID 都是独一无二的，点击 labels 才会生效
    safeHtml = scopeCardIds(safeHtml, id);

    return `<div class="html-card-wrap" data-msg-id="${id}">${safeHtml}</div>`;
}


// ================================
// 中文注释：初始化卡片分页（每条消息渲染后调用一次）
// - 默认显示第 1 页
// - 如果卡片里没有 data-card-page，则不处理
// ================================
function initHtmlCardPaging(rootEl) {
    if (!rootEl) return;

    const pages = rootEl.querySelectorAll('[data-card-page]');
    if (!pages || pages.length === 0) return;

    // 默认第一页
    let current = 1;

    // 如果容器上有记忆的页码（比如用户刚刚翻过页），优先用它
    const saved = parseInt(rootEl.getAttribute('data-card-current-page') || '1', 10);
    if (Number.isFinite(saved) && saved > 0) current = saved;

    pages.forEach(p => {
        const n = parseInt(p.getAttribute('data-card-page') || '0', 10);
        p.style.display = (n === current) ? 'block' : 'none';
    });

    rootEl.setAttribute('data-card-current-page', String(current));
}

// ================================
// 中文注释：卡片点击事件代理（翻页/跳页）
// ================================
function bindHtmlCardInteractions() {
    // 避免重复绑定
    if (window.__htmlCardBound) return;
    window.__htmlCardBound = true;

    document.addEventListener('click', (e) => {
        const target = e.target;
        if (!target) return;

        // 找到离点击点最近的 action 元素
        const actionEl = target.closest('[data-action]');
        if (!actionEl) return;

        // 只处理卡片内部的动作
        const cardWrap = actionEl.closest('.html-card-wrap');
        if (!cardWrap) return;

        const action = String(actionEl.getAttribute('data-action') || '').trim();
        if (!action.startsWith('card:')) return;

        e.preventDefault();
        e.stopPropagation();

        const pages = cardWrap.querySelectorAll('[data-card-page]');
        if (!pages || pages.length === 0) return;

        const maxPage = Math.max(...Array.from(pages).map(p => parseInt(p.getAttribute('data-card-page') || '0', 10)).filter(n => Number.isFinite(n)));

        let current = parseInt(cardWrap.getAttribute('data-card-current-page') || '1', 10);
        if (!Number.isFinite(current) || current <= 0) current = 1;

        if (action === 'card:next') current = Math.min(maxPage, current + 1);
        else if (action === 'card:prev') current = Math.max(1, current - 1);
        else if (action === 'card:goto') {
            const goto = parseInt(actionEl.getAttribute('data-page') || '1', 10);
            if (Number.isFinite(goto)) current = Math.min(maxPage, Math.max(1, goto));
        } else {
            return;
        }

        // 切换显示
        pages.forEach(p => {
            const n = parseInt(p.getAttribute('data-card-page') || '0', 10);
            p.style.display = (n === current) ? 'block' : 'none';
        });

        cardWrap.setAttribute('data-card-current-page', String(current));
    }, true);
}

window.__htmlCardAllowedCache = window.__htmlCardAllowedCache || {};


// 中文注释：判断当前角色是否允许渲染 HTML 卡片（加缓存，避免反复读DB卡顿）
async function isHtmlCardAllowedForCurrentChat() {
    try {
        if (!currentChatId) return false;

        // 命中缓存直接返回
        if (window.__htmlCardAllowedCache && window.__htmlCardAllowedCache[currentChatId] !== undefined) {
            return window.__htmlCardAllowedCache[currentChatId];
        }

        // 1) 读取角色信息
        const charInfoAll = await new Promise((resolve) => {
            loadFromDB('characterInfo', (data) => resolve(data || {}));
        });

        const charData = charInfoAll[currentChatId] || {};
        if (charData.htmlPluginEnabled !== true) {
            window.__htmlCardAllowedCache[currentChatId] = false;
            return false;
        }

        const linkedIds = Array.isArray(charData.linkedWorldbooks) ? charData.linkedWorldbooks : [];
        if (linkedIds.length === 0) {
            window.__htmlCardAllowedCache[currentChatId] = false;
            return false;
        }

        // 2) 查关联世界书里是否存在 html 分类内容
        const allWorldbooks = await new Promise((resolve) => {
            loadFromDB('worldbooks', (data) => resolve(Array.isArray(data) ? data : []));
        });

        const linkedBooks = allWorldbooks.filter(wb => wb && linkedIds.includes(wb.id));
        const hasHtmlRef = linkedBooks.some(wb => wb.category === 'html' && String(wb.content || '').trim().length > 0);

        window.__htmlCardAllowedCache[currentChatId] = hasHtmlRef;
        return hasHtmlRef;
    } catch (e) {
        console.warn('isHtmlCardAllowedForCurrentChat failed:', e);
        if (window.__htmlCardAllowedCache) window.__htmlCardAllowedCache[currentChatId] = false;
        return false;
    }
}

// ============ 修复版：渲染消息列表 (HTML 卡片独立于气泡) ============
async function renderMessages() {
    // ★★★ 新增：确保刷新后也能读到当前聊天的角色设置（只在切换chat时加载一次）★★★
    if (currentChatId && window.__charInfoLoadedForChatId !== currentChatId) {
        const allCharData = await new Promise(resolve => {
            loadFromDB('characterInfo', (data) => resolve(data || {}));
        });
        characterInfoData = (allCharData && allCharData[currentChatId]) ? allCharData[currentChatId] : {};
        window.__charInfoLoadedForChatId = currentChatId;
    }
    // ★★★ 读取头像显示设置（来自已加载的 characterInfoData）★★★
    const avatarSettings = (characterInfoData && characterInfoData.avatarDisplaySettings)
        ? characterInfoData.avatarDisplaySettings
        : { enabled: false, shape: 'circle', size: 40 };
    
    // ========== 新增：加载头像框数据 ==========
    if (avatarSettings.avatarFrame) {
        avatarFrameData = avatarSettings.avatarFrame;
    }
    // ========================================

    // 获取当前聊天信息
    const currentChat = chats.find(c => c.id === currentChatId);

    const container = document.getElementById('messagesList');

    // ★★★ 性能优化：提取头像框为 CSS 变量 ★★★
let charFrameVar = 'none';
let userFrameVar = 'none';
if (avatarFrameData) {
    if (avatarFrameData.character) charFrameVar = `url('${avatarFrameData.character}')`;
    if (avatarFrameData.user) userFrameVar = `url('${avatarFrameData.user}')`;
}
container.style.setProperty('--char-frame-url', charFrameVar);
container.style.setProperty('--user-frame-url', userFrameVar);


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
    
    // 中文注释：只计算一次"本聊天是否允许HTML卡片"，避免每条消息都查DB
    const htmlCardAllowed = await isHtmlCardAllowedForCurrentChat();

    // ====== 头像HTML预计算（只算一次，避免map里重复计算导致卡顿）START ======
    const avatarEnabled = (avatarSettings && avatarSettings.enabled === true);
    const avatarShape = (avatarSettings && avatarSettings.shape === 'square') ? 'square' : 'circle';

    let avatarSize = parseInt(avatarSettings && avatarSettings.size, 10);
    if (!Number.isFinite(avatarSize) || avatarSize <= 0) avatarSize = 40;

    const avatarRadius = (avatarShape === 'circle') ? '50%' : (Math.round(avatarSize * 0.2) + 'px');

    const safeText = (s) => String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const isImgSrc = (v) => {
        if (typeof v !== 'string') return false;
        const t = v.trim().toLowerCase();
        return t.startsWith('http://') || t.startsWith('https://') || t.startsWith('data:image/');
    };

const buildAvatarHtml = (imgSrc, fallbackEmoji, side) => {
    if (!avatarEnabled) return '';

    const margin = (side === 'right') ? 'margin-left:8px;' : 'margin-right:8px;';
    const frameVar = (side === 'left') ? 'var(--char-frame-url)' : 'var(--user-frame-url)';

    // 生成底部的真实头像（会被圆角切割）
    let innerContent = isImgSrc(imgSrc) 
        ? `<div style="width:100%; height:100%; border-radius:${avatarRadius}; background-image:url('${imgSrc}'); background-size:cover; background-position:center; background-color:#e0e0e0;"></div>`
        : `<div style="width:100%; height:100%; border-radius:${avatarRadius}; background-color:#e0e0e0; display:flex; align-items:center; justify-content:center; font-size:${Math.round(avatarSize * 0.5)}px;">${safeText(fallbackEmoji || '👤')}</div>`;

    return `
        <div class="message-avatar-wrapper ${avatarShape}" style="
            position:relative;
            width:${avatarSize}px;
            height:${avatarSize}px;
            flex-shrink:0;
            align-self:flex-start;
            ${margin}
        ">
            ${innerContent}
            
            <div style="
                position:absolute;
                top:50%;
                left:50%;
                width: 115%;  /* 💡 如果觉得框太大或太小，可以改这个数字 */
                height: 115%;
                transform: translate(-50%, -50%);
                background-image: ${frameVar};
                background-size: contain;
                background-repeat: no-repeat;
                background-position: center;
                pointer-events: none;
                z-index: 2;
            "></div>
        </div>
    `;
};



    // 角色头像源
    const charAvatarSrc = currentChat ? (currentChat.avatarImage || currentChat.avatar) : '';
    const charFallbackEmoji = (currentChat && !isImgSrc(currentChat.avatar)) ? (currentChat.avatar || '👤') : '👤';

    // 我的头像源：优先 chat.myAvatar，其次主屏幕头像（注意：这里不再放进map里查DOM）
    const mainAvatarImgSrc = document.querySelector('#mainAvatar img')?.src || '';
    const myAvatarSrc1 = currentChat ? currentChat.myAvatar : '';
    const myAvatarSrc = isImgSrc(myAvatarSrc1) ? myAvatarSrc1 : (isImgSrc(mainAvatarImgSrc) ? mainAvatarImgSrc : '');
    const myFallbackEmoji = '👤';

    // 预计算两侧头像HTML（后面map里只做选择，不做计算）
    const cachedCharAvatarHtml = buildAvatarHtml(charAvatarSrc, charFallbackEmoji, 'left');
    const cachedMyAvatarHtml = buildAvatarHtml(myAvatarSrc, myFallbackEmoji, 'right');
    // ====== 头像HTML预计算 END ======



    container.innerHTML = visibleMessages.map((msg) => {
        const isMe = msg.senderId === 'me';
        const multiSelectClass = isMultiSelectMode ? 'multi-select-mode' : '';
        const checkbox = isMultiSelectMode ? `<input type="checkbox" class="message-checkbox" id="checkbox-${msg.id}" ${selectedMessageIds.includes(msg.id) ? 'checked' : ''} onchange="toggleMessageSelection(${msg.id})">` : '';
        
       const avatarHtmlLeft = (!isMe) ? cachedCharAvatarHtml : '';
    const avatarHtmlRight = (isMe) ? cachedMyAvatarHtml : '';

        // 撤回消息
        if (msg.isRevoked) {
            return `<div class="message-item ${isMe ? 'me' : ''} ${multiSelectClass}" data-message-id="${msg.id}">${checkbox}<div class="message-bubble"><div class="revoked-message" onclick="toggleRevokedContent(${msg.id})">此消息已撤回</div><div class="revoked-content" id="revoked-${msg.id}">${msg.content}</div></div><div class="message-time">${formatMessageTime(msg.time)}</div></div>`;
        }
        
        // 隐藏转发上下文：不渲染
        if (msg.type === 'moment_forward_hidden') return '';
        if (msg.type === 'moment_vision_hidden') return '';

        // 系统消息
        if (msg.type === 'system') return `<div class="system-message">${msg.content}</div>`;

        // 转账消息
        if (msg.type === 'transfer') {
            const isSent = msg.senderId === 'me';
            const data = msg.transferData;
            const isReceived = (isSent && data.status === 'aiReceived') || (!isSent && data.status === 'received');
            const statusClass = isReceived ? 'received' : '';
            const title = data.note ? data.note : '恭喜发财';
            const currentChat = chats.find(c => c.id === currentChatId);
            const chatName = currentChat ? currentChat.name : 'TA';
            const fromName = isSent ? '我' : chatName;
            const remarkText = '大吉大利，万事如意';
            let actionText = '';
            if (isReceived) actionText = '已领取';
            else if (isSent) actionText = '等待领取';
            else actionText = '领取红包';
            const clickEvent = (!isSent && data.status === 'pending') ? `onclick="receiveTransfer(${msg.id})"` : '';
          const giftIconSvg = `<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M20 6h-2.18c.11-.31.18-.65.18-1a3 3 0 0 0-3-3c-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68A2.99 2.99 0 0 0 9 2a3 3 0 0 0-3 3c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19a2 2 0 0 0 2 2h16c1.11 0 2-.89 2-2V8a2 2 0 0 0-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z"/></svg>`;
            const heartIconSvg = `<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" style="margin-left:4px;"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;

                   return `
            <div class="message-item ${isMe ? 'me' : ''} ${multiSelectClass}" data-message-id="${msg.id}">
                ${checkbox}
              <div style="display:flex; align-items:flex-start; justify-content:${isMe ? 'flex-end' : 'flex-start'};">
                    ${avatarHtmlLeft}
                    <div style="display:flex; flex-direction:column; align-items:${isMe ? 'flex-end' : 'flex-start'};">
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
                    </div>
                    ${avatarHtmlRight}
                </div>
                <div class="message-time">${formatMessageTime(msg.time)}</div>
            </div>`;
        }

        // 礼物卡片渲染
        if (msg.type === 'shopping_order') {
            const data = msg.orderData;
            let cardText = '礼物来了喵';
            if (data.orderType === 'ask_ta_pay' || data.orderType === 'ai_ask_user_pay') {
                cardText = '请帮喵代付';
            }
                    return `
                <div class="message-item ${isMe ? 'me' : ''} ${multiSelectClass}" data-message-id="${msg.id}">
                    ${checkbox}
                  <div style="display:flex; align-items:flex-start; justify-content:${isMe ? 'flex-end' : 'flex-start'};">
                        ${avatarHtmlLeft}
                        <div style="display:flex; flex-direction:column; align-items:${isMe ? 'flex-end' : 'flex-start'};">
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
                                    <div class="gift-card-btn">${cardText}</div>
                                </div>
                            </div>
                        </div>
                        ${avatarHtmlRight}
                    </div>
                    <div class="message-time">${formatMessageTime(msg.time)}</div>
                </div>
            `;
        }

        // 语音消息
        if (msg.type === 'voice') {
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
                   <div style="display:flex; align-items:flex-start; justify-content:${isMe ? 'flex-end' : 'flex-start'};">
                        ${avatarHtmlLeft}
                        <div style="display:flex; flex-direction:column; align-items:${isMe ? 'flex-end' : 'flex-start'}; max-width:70%;">
                            ${voiceQuoteHtml}
                            <div class="voice-bubble ${msg.isExpanded ? 'expanded' : ''}" onclick="toggleVoiceState(this, ${msg.id});${msg.senderId !== 'me' ? `checkAndPlayVoice('${msg.content.replace(/'/g, "\\'").replace(/"/g, '\\"')}')` : ''}">
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
                        ${avatarHtmlRight}
                    </div>
                    <div class="message-time">${formatMessageTime(msg.time)}</div>
                </div>
            `;
        }

       // 普通/图片/文字图 消息处理
let messageContent = '';
let isTransparentBubble = false;

if (msg.type === 'image') {
    messageContent = `<img src="${msg.content}" class="message-image" alt="图片" onclick="viewImage('${msg.content}')">`;
} else if (msg.type === 'text_image') {
   isTransparentBubble = true;
    const fakeImage = "https://i.postimg.cc/Wby3zQfx/QQ-tu-pian20260215000830.png";
    
    const rawContent = String(msg.content || '');
    const displayContent = rawContent.replace(/^[【\[]\s*图片\s*[:：]\s*/i, '').replace(/\s*[】\]]$/, '').trim() || rawContent;
    
    // ★★★ 新增：检测内容是否被污染为URL ★★★
    if (rawContent.startsWith('http://') || rawContent.startsWith('https://')) {
        console.error('❌ 文字图内容被污染为URL，阻止渲染:', rawContent);
        // 降级为普通文字显示
        messageContent = `<div style="color:#999;font-size:12px;">【图片加载失败】</div>`;
    } else {
        // 正常渲染文字图
        const escapedForJs = rawContent
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/"/g, '\\"')
            .replace(/\r/g, '\\r')
            .replace(/\n/g, '\\n');
        
       const encodedDesc = encodeURIComponent(displayContent);
        
        messageContent = `
            <div class="text-image-card" onclick="showTextImageDetail('${encodedDesc}')">
                <img src="${fakeImage}" class="text-image-cover" alt="文字图">
            </div>
        `;}
}else {
    // 普通文本（支持附加 HTML 卡片协议）
    const rawText = String(msg.content || '');
    
    // ★★★ 增加调试日志 ★★★
    if (rawText.includes('[[CARD_HTML]]')) {
     
    }
    
    const parts = splitHtmlCardFromText(rawText);
    const cleanText = parts.text || '';
    const cardHtml = parts.cardHtml;
    

   
    
    // ★★★ 核心修复：只把文本放进气泡，卡片单独存储 ★★★
    messageContent = cleanText;
    
    // 把卡片HTML临时存到消息对象上（不要直接拼到 messageContent）
    if (cardHtml && htmlCardAllowed) {
        msg._htmlCard = buildHtmlCardContainer(cardHtml, msg.id);
     
    } else {
        msg._htmlCard = null;
    }
}        // 记忆回溯提示条
        let memoryHintHtml = '';
        if (msg.memoryId) {
            memoryHintHtml = `
                <div class="memory-hint-bar" onclick="showMemoryDetail(${msg.memoryId})" style="font-size: 11px; color: #999; background: #f2f3f5; padding: 4px 10px; border-radius: 12px; margin-top: 6px; margin-left: 2px; display: inline-flex; align-items: center; cursor: pointer; width: fit-content; border: 0.5px solid #e0e0e0; user-select: none;">
                    <span style="margin-right:4px;">💡</span> 已触发记忆回溯 <span style="margin-left:4px; opacity:0.5;">›</span>
                </div>
            `;
        }

        // 引用消息渲染
        let quoteHtml = '';
        if (msg.quotedMessageId) {
            let displayQuoteContent = msg.quotedContent || '';
            if (displayQuoteContent.startsWith('data:image') || displayQuoteContent.length > 500) { 
                displayQuoteContent = '【图片/长内容】';
            }
            if (displayQuoteContent.length > 10) {
                displayQuoteContent = displayQuoteContent.substring(0, 10) + '...';
            }
            const quoteAuthor = msg.quotedAuthor || '未知';
            quoteHtml = `
                <div class="message-quoted-outside" onclick="scrollToMessage(${msg.quotedMessageId})">
                    <span class="quoted-author">${quoteAuthor}：</span>
                    <span class="quoted-text">${displayQuoteContent}</span>
                </div>
            `;
        }

     // 气泡样式
        const bubbleStyle = isTransparentBubble 
            ? 'background:transparent !important; box-shadow:none !important; padding:0 !important; border:none !important;' 
            : 'max-width: 100%; box-sizing: border-box;';

        // ★★★ 核心修复：气泡包裹文本，卡片在气泡下方独立渲染 ★★★
        let cardHtml = msg._htmlCard || '';

     // ★★★ 判断是否是纯卡片消息（没有文字，只有卡片） ★★★
const isPureCard = cardHtml && (
    !messageContent || 
    messageContent.trim().length === 0 ||
    messageContent.trim() === '' ||
    /^\s*$/.test(messageContent)  // 正则匹配：只有空白字符
);




// 如果是纯卡片消息，不要气泡包裹
if (isPureCard) {
    return `
        <div class="message-item pure-card ${isMe ? 'me' : ''} ${multiSelectClass}" data-message-id="${msg.id}">
            ${checkbox}
          <div style="display:flex; align-items:flex-start; justify-content:${isMe ? 'flex-end' : 'flex-start'};">
                ${avatarHtmlLeft}
                <div style="display:flex; flex-direction:column; align-items: ${isMe ? 'flex-end' : 'flex-start'};">
                    ${quoteHtml}
                    ${cardHtml}
                    ${memoryHintHtml}
                </div>
                ${avatarHtmlRight}
            </div>
            <div class="message-time">${formatMessageTime(msg.time)}</div>
        </div>
    `;
}


        // 普通消息：用气泡包裹
       return `
    <div class="message-item ${isMe ? 'me' : ''} ${multiSelectClass}" data-message-id="${msg.id}">
        ${checkbox}
     <div style="display:flex; align-items:flex-start; justify-content:${isMe ? 'flex-end' : 'flex-start'};">
            ${avatarHtmlLeft}
            <div style="display:flex; flex-direction:column; align-items: ${isMe ? 'flex-end' : 'flex-start'};">
                ${quoteHtml}
                <div class="message-bubble" data-msg-id="${msg.id}" style="${bubbleStyle}">
                    ${messageContent}
                </div>
                ${cardHtml}
                ${memoryHintHtml}
            </div>
            ${avatarHtmlRight}
        </div>
        <div class="message-time">${formatMessageTime(msg.time)}</div>
    </div>
`;

    }).join('');


    // 初始化卡片分页
    container.querySelectorAll('.html-card-wrap').forEach(wrap => initHtmlCardPaging(wrap));

updateRetryButtonState();

// ★★★ 性能优化：图片加载等待改为非阻塞，避免切换角色卡顿 ★★★
const imgs = container.querySelectorAll('img');
if (imgs && imgs.length > 0) {
    const waitList = Array.from(imgs).slice(0, 6); // 最多等前6张，避免大聊天卡死
    Promise.allSettled(waitList.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(res => {
            img.onload = () => res();
            img.onerror = () => res();
        });
    })).then(() => {
        // 图片加载完成后再补一次滚动，避免位置不准
        try { scrollToBottom(); } catch (e) {}
    });
}

if (!isMultiSelectMode) {
    requestAnimationFrame(() => {
        document.querySelectorAll('.message-bubble[data-msg-id]').forEach(b => addLongPressEvent(b, parseInt(b.dataset.msgId)));
    });
}}





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
            body: JSON.stringify({ model: currentApiConfig.defaultModel, messages: [{ role: 'user', content: prompt }], temperature: (currentApiConfig.temperature !== undefined) ? currentApiConfig.temperature : 0.6 })
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



function closeEditArchiveModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('editArchiveModal').style.display = 'none';
}




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

// === 【功能：分析他的档案 (语义级去重 + 格式清洗)】开始 ===
async function analyzeCharacterArchive() {
    if (!currentChatId) return;
    
    // 1. 准备数据
    const { historyText } = await getSmartAnalysisHistory(50);
    
    // 预读取旧数据，用于构建 Prompt
    const charData = await new Promise(resolve => loadFromDB('characterInfo', d => resolve(d && d[currentChatId] ? d[currentChatId] : {})));
    const oldExt = charData.extendedProfile || {};
    const rawSecrets = oldExt.secretArchive || "";

    // 提取最近 20 条旧秘密（去掉日期，只留内容），喂给 AI 做参考
    const recentSecrets = rawSecrets
        .split('\n')
        .map(line => line.replace(/^【.*?】/, '').trim()) // 去掉日期头
        .filter(line => line.length > 5) // 过滤太短的
        .slice(-20) // 只取最后20条，防止 Prompt 太长
        .join('\n');

    // 2. 发送 Prompt (★修改点：注入了旧秘密，要求 AI 进行语义避让)
    const prompt = `分析角色【${charData.personality || '无设定'}】。根据记录：${historyText}。
    输出格式：身高|||体重|||性格核心|||爱好|||厌恶|||新发现的秘密
    
    【已知秘密库（绝对禁止重复以下含义）】
    ${recentSecrets || "（暂无记录）"}

    【严格要求】
    1. 身高/体重：如果记录里没提，直接填 "--"，严禁写"未知/无法判断"。
    2. 秘密：
       - 必须是【全新的】发现。
       - 如果聊天内容体现的信息，与【已知秘密库】里的内容**意思相近**（即使措辞不同），也请直接忽略！
       - 如果没有新发现，或者发现的都是旧闻，请直接填 "--"。`;

    try {
        const content = await callAI(prompt);
        let parts = content.split('|||').map(s => s.trim());
        while(parts.length < 6) parts.push("--");

        // 清洗函数
        const cleanValue = (val) => {
            if (!val) return '--';
            if (val.includes('未知') || val.includes('无法') || val.includes('不详') || val.includes('没提')) {
                return '--';
            }
            return val;
        };

        const newHeight = cleanValue(parts[0]);
        const newWeight = cleanValue(parts[1]);
        const newSecretContent = parts[5];

        // 3. 数据库更新流程
        loadFromDB('characterInfo', (allData) => {
            if (!allData[currentChatId]) allData[currentChatId] = {};
            // 重新获取最新的 oldExt (防止并发差异)
            const currentExt = allData[currentChatId].extendedProfile || {};
            let finalSecretArchive = currentExt.secretArchive || "";
            let isDuplicate = false;

            // === 算法兜底去重 (防止 AI 原文照抄) ===
            if (newSecretContent && newSecretContent !== "--" && newSecretContent.length > 2) {
                const existingLines = finalSecretArchive.split('\n').filter(line => line.trim().length > 0);
                
                for (const line of existingLines) {
                    const cleanOldContent = line.replace(/^【.*?】/, '').trim();
                    // 这里依然保留 50% 相似度拦截，作为最后一道防线
                    const similarity = calculateTextSimilarity(newSecretContent, cleanOldContent);
                    
                    if (similarity > 0.5) {
                        isDuplicate = true;
                        console.log(`🛡️ 算法拦截重复秘密 (相似度 ${(similarity*100).toFixed(1)}%)`);
                        break;
                    }
                }

                if (!isDuplicate) {
                    finalSecretArchive += `\n【${new Date().toLocaleDateString()}】${newSecretContent}`;
                }
            }

            // 更新数据
            allData[currentChatId].extendedProfile = { 
                ...currentExt, 
                height: newHeight, 
                weight: newWeight, 
                coreTrait: parts[2], 
                likes: parts[3], 
                dislikes: parts[4], 
                secretArchive: finalSecretArchive
            };
            
            saveToDB('characterInfo', allData);
            loadArchives(); 
            
            if (isDuplicate) {
                alert('基础档案已更新。\n(AI 生成的秘密与旧记录过于相似，已被过滤)');
            } else if (newSecretContent === "--") {
                alert('基础档案已更新。\n(本次对话未发现新秘密)');
            } else {
                alert('档案更新成功！发现了一条新秘密✨');
            }
        });
    } catch (e) { 
        console.error(e);
        alert('档案分析失败'); 
    }
}
// === 【功能：分析他的档案 (语义级去重 + 格式清洗)】结束 ===

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

// ============ 小票弹窗功能 (防遮挡优化版) ============
function openReceiptModal(messageId) {
    // 1. ★核心修复★：打开新弹窗前，先强制清理可能残留的旧弹窗
    const existingOverlay = document.getElementById('receiptModalOverlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }

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
    
    // 操作按钮
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
        <div class="receipt-modal-overlay" id="receiptModalOverlay" onclick="closeReceiptModal(event)" style="z-index: 9999;">
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
    
    // 插入到 body
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closeReceiptModal(event) {
    if (event && event.target !== event.currentTarget) return;
    const overlay = document.getElementById('receiptModalOverlay');
    if (overlay) {
        overlay.remove(); // 彻底移除节点，防止占位
    }
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

请根据人设和聊天记录生成以下状态信息，用|||分隔：

1. 此刻心情
   ★ 要求：50-80字，包含：
      - 主要情绪（开心/难过/期待/无聊等）
      - 具体原因（为什么会有这种情绪）
      - 身体感受（心跳、呼吸、肌肉感受等）
      - 对方的影响（如果有的话）
   ★ 示例：心情有点复杂呢，一开始还挺开心的，但现在有点无聊了，感觉心里空荡荡的。胸口有点闷，总想着他，不知道他现在在忙什么，有点期待他的消息，又有点害怕他不会回

2. 心情值
   ★ 0-100的数字

3. 心跳
   ★ 60-180的数字，根据心情和活动调整

4. 穿着风格
   ★ 要求：20-35字，包含：
      - 整体风格（休闲/甜美/性感/中性等）
      - 颜色搭配
      - 气质描写
   ★ 示例：今天穿得很舒服，白色宽松T恤配黑色运动裤，整个人看起来懒洋洋的，但又有种慵懒的魅力

5. 穿着单品
   ★ 要求：5-8个单品，尽量具体
   ★ 示例：白色宽松T恤,黑色运动裤,粉色拖鞋,珍珠耳环,简约手链,发卡,手机壳

6. 当前行为
   ★ 要求：40-60字，包含：
      - 正在做什么（动作要具体）
      - 周围环境（房间/咖啡厅/车里等）
      - 细节描写（姿态/表情/声音等）
   ★ 示例：窝在床上，背靠着软软的靠枕，一只手拿着手机，另一只手在无意识地转着笔。房间里开着小夜灯，光线很柔和。时不时抬头看看窗外，又低头继续玩手机

7. 内心想法
   ★ 要求：50-80字，包含：
      - 此刻的真实想法
      - 对对方的想法
      - 对未来的期待或担忧
      - 一些小秘密或小矛盾
   ★ 示例：其实有点想他了，但又不想主动找他，怕显得自己太主动。心里在纠结要不要发个消息给他，但又怕他忙，怕他不回。有点讨厌自己这样患得患失的样子，但又改不了

**核心要求：**
- 每个字段都要有【细节】【情感】【场景感】
- 不要只写表面，要写出内在的感受
- 要有【矛盾感】【真实感】，不要太完美
- 可以加入一些【小秘密】或【小烦恼】
- 字数一定要达到要求，不能偷懒

示例完整输出：
心情有点复杂呢，一开始还挺开心的，但现在有点无聊了，感觉心里空荡荡的。胸口有点闷，总想着他，不知道他现在在忙什么，有点期待他的消息，又有点害怕他不会回|||65|||78|||今天穿得很舒服，白色宽松T恤配黑色运动裤，整个人看起来懒洋洋的，但又有种慵懒的魅力|||白色宽松T恤,黑色运动裤,粉色拖鞋,珍珠耳环,简约手链,发卡,手机壳|||窝在床上，背靠着软软的靠枕，一只手拿着手机，另一只手在无意识地转着笔。房间里开着小夜灯，光线很柔和。时不时抬头看看窗外，又低头继续玩手机|||其实有点想他了，但又不想主动找他，怕显得自己太主动。心里在纠结要不要发个消息给他，但又怕他忙，怕他不回。有点讨厌自己这样患得患失的样子，但又改不了

`;

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
    // ★★★ 修改 ★★★
    temperature: (currentApiConfig.temperature !== undefined) ? currentApiConfig.temperature : 0.8
})
        });
        
        if (!response.ok) return null;
        
        const data = await response.json();
        const content = data.choices[0].message.content.trim();
        
        // 解析返回内容
        const parts = content.split('|||').map(s => s.trim());
        if (parts.length < 7) return null; 
        
       
        
        return {
            mood: parts[0],
            moodLevel: parseInt(parts[1]) || 75,
            heartbeat: parseInt(parts[2]) || 72,
            clothesStyle: parts[3],
            clothesTags: parts[4].split(/[,，、]/).map(s => s.trim()).filter(s => s), // 增强分隔符支持
            action: parts[5],
            thoughts: parts[6],
            
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
             updateHeartbeatBarVisibility();
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
    const charData = data && data[currentChatId] ? data[currentChatId] : {};
    if (charData.statusMonitorEnabled) {
        const allData = data || {};
        if (!allData[currentChatId]) allData[currentChatId] = {};
        const oldMonitor = allData[currentChatId].statusMonitor || {};
        
        // ★★★ 修复：逐字段更新，允许 null 值覆盖旧数据 ★★★
        const newStatus = analysisData; 
        allData[currentChatId].statusMonitor = {
            mood: newStatus.mood !== undefined ? newStatus.mood : oldMonitor.mood,
            moodLevel: newStatus.moodLevel !== undefined ? newStatus.moodLevel : oldMonitor.moodLevel,
            heartbeat: newStatus.heartbeat !== undefined ? newStatus.heartbeat : oldMonitor.heartbeat,
            clothesStyle: newStatus.clothesStyle !== undefined ? newStatus.clothesStyle : oldMonitor.clothesStyle,
            clothesTags: newStatus.clothesTags !== undefined ? newStatus.clothesTags : oldMonitor.clothesTags,
            action: newStatus.action !== undefined ? newStatus.action : oldMonitor.action,
            thoughts: newStatus.thoughts !== undefined ? newStatus.thoughts : oldMonitor.thoughts,
          
        };
        
        saveToDB('characterInfo', allData);
        
        const bpmEl = document.getElementById('heartbeatBpm');
        if (bpmEl) {
            bpmEl.textContent = newStatus.heartbeat;
            bpmEl.dataset.baseBpm = newStatus.heartbeat;
        }
    }
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
 * 执行自动总结 (AI 控流 60 字版)
 */
async function executeAutoSummary(chat, messages, charInfo) {
    // 检查API配置
    if (!currentApiConfig.baseUrl || !currentApiConfig.apiKey) {
        console.warn('[自动总结] API未配置，跳过');
        return;
    }
    
    // 准备聊天记录文本
    const chatHistory = messages
        .filter(m => m.type === 'text' || !m.type)
        .filter(m => m.content && !m.isRevoked)
        .map(m => {
            const sender = m.senderId === 'me' ? '我' : chat.name;
            const content = m.content.length > 100 ? m.content.substring(0, 100) + '...' : m.content;
            return `${sender}: ${content}`;
        })
        .join('\n');
    
    if (!chatHistory || chatHistory.length < 100) {
        console.log('[自动总结] 有效内容太少，跳过');
        updateAutoSummaryAnchor(chat.id, messages);
        return;
    }
    
    // 获取时间范围
    const firstMsg = messages[0];
    const lastMsg = messages[messages.length - 1];
    const dateRange = getDateRange(firstMsg.time, lastMsg.time);
    
    // 构建Prompt (★ 核心修改：严格限制 60 字)
    const prompt = `你是一个极简记忆整理师。请将聊天记录浓缩成一条"时光记录"。

【角色】${chat.name}
【时间】${dateRange}
【记录】
${chatHistory.substring(0, 4000)}

【输出要求 (严格执行)】
1. **字数限制**：必须控制在 **60个汉字以内**！越短越好。
2. **人称**：使用第三人称（"${chat.name}"和"用户"）。
3. **内容**：只保留最核心的一件事或一个情绪点，舍弃所有无关细节。

【正确示例】
${chat.name}听用户倾诉了工作烦恼，并约定周末一起去吃火锅放松。
(简练、完整、不超过60字)

现在开始总结（直接输出内容，不要前缀）：`;

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
                temperature: 0.5 // 温度调低一点，让它更听话，不乱发挥
            })
        });
        
        if (!response.ok) {
            console.error('[自动总结] API请求失败:', response.status);
            return;
        }
        
        const data = await response.json();
        let summary = data.choices[0].message.content.trim();
        
        // 清理符号
        summary = summary.replace(/^["「『]|["」』]$/g, '');
        
        // ★★★ 核心：这里不再有任何 substring 截断代码 ★★★
        // 完全依赖 Prompt 让 AI 自己控制长度
        
        // 保存到时光相册
        await saveAutoSummaryToTimeline(chat.id, summary, dateRange);
        
        console.log(`[自动总结] 完成 (字数: ${summary.length}): ${summary}`);
        
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
    const noteImageInput = document.getElementById('noteImageInput');
if (noteImageInput) {
    noteImageInput.addEventListener('change', function(e) {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            noteTempImage = ev.target.result;

            const preview = document.getElementById('noteImagePreview');
            if (preview) {
                preview.style.display = 'block';
                preview.style.backgroundImage = `url(${noteTempImage})`;
            }
        };
        reader.readAsDataURL(file);

        noteImageInput.value = '';
    });
}

    
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

// ============ 全局字体设置 (终极暴力覆盖版) ============

// 1. 加载字体设置
function loadFontSettings() {
    // 确保数据库已连接
    if (!db) return;
    
    loadFromDB('fontSettings', (data) => {
        if (data && data.fontName && data.fontData) {
            applyCustomFont(data.fontName, data.fontData);
        }
    });
}

// 2. 应用字体 (使用通配符 * 强制覆盖页面所有角落)
function applyCustomFont(fontName, fontData) {
    // 1. 定义样式注入逻辑
    const injectStyle = () => {
        let styleEl = document.getElementById('global-custom-font-style');
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'global-custom-font-style';
            document.head.appendChild(styleEl);
        }
        
        // ★★★ 核心修改：使用 * 选择器覆盖所有元素 ★★★
        styleEl.textContent = `
            @font-face {
                font-family: '${fontName}';
                src: url('${fontData}');
                font-display: swap;
            }
            
            /* 强制覆盖所有元素，包括 input, button, 以及动态生成的日记/朋友圈 */
            * {
                font-family: '${fontName}', sans-serif !important;
            }
        `;
        console.log('✅ 全局字体已暴力应用到所有元素');
    };

    // 2. 使用 FontFace API 加载（避免闪烁）
    const fontFace = new FontFace(fontName, `url(${fontData})`);
    
    fontFace.load().then((loadedFace) => {
        document.fonts.add(loadedFace);
        injectStyle(); // 加载成功后注入样式
    }).catch(err => {
        console.warn('字体预加载失败，尝试直接注入CSS:', err);
        injectStyle(); // 即使预加载失败，也强行注入CSS试试
    });
}

// 3. 保存字体 (绑定到设置页面的保存按钮)
function saveGlobalFont(fileInput) {
    // 兼容直接传 input 元素或者 event 对象
    const input = fileInput.files ? fileInput : document.getElementById('fontFileInput');
    if (!input || !input.files || !input.files[0]) {
        alert('请先选择字体文件(.ttf/.otf/.woff)');
        return;
    }
    
    const file = input.files[0];
    
    // 限制大小 (20MB)
    if (file.size > 20 * 1024 * 1024) {
        alert('字体文件过大，请使用 20MB 以内的文件');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const fontData = e.target.result;
        const fontName = 'UserCustomFont'; // 固定名称
        
        const settings = {
            id: 1,
            fontName: fontName,
            fontData: fontData
        };
        
        saveToDB('fontSettings', settings);
        applyCustomFont(fontName, fontData);
        alert('全局字体已应用！(日记、朋友圈、输入框均已生效)');
    };
    reader.onerror = () => alert('读取文件失败');
    reader.readAsDataURL(file);
}

// 4. 恢复默认字体
function resetGlobalFont() {
    if (db) {
        const transaction = db.transaction(['fontSettings'], 'readwrite');
        transaction.objectStore('fontSettings').clear();
    }
    
    const styleEl = document.getElementById('global-custom-font-style');
    if (styleEl) styleEl.remove();
    
    // 清除 document.fonts 里的缓存
    document.fonts.forEach(f => {
        if (f.family === 'UserCustomFont') document.fonts.delete(f);
    });
    
    alert('已恢复默认系统字体');
}

// ★★★ 自动执行检查 ★★★
// 防止 script.js 初始化时 extra.js 还没加载完导致没执行
setTimeout(() => {
    if (typeof db !== 'undefined' && db) {
        loadFontSettings();
    }
}, 1000);

bindHtmlCardInteractions();

// ============ 🔧 工具函数：文本相似度计算 (Levenshtein) ============
function calculateTextSimilarity(s1, s2) {
    if (!s1 || !s2) return 0;
    const len1 = s1.length;
    const len2 = s2.length;
    const maxLen = Math.max(len1, len2);
    if (maxLen === 0) return 1;

    const matrix = [];
    for (let i = 0; i <= len1; i++) matrix[i] = [i];
    for (let j = 0; j <= len2; j++) matrix[0][j] = j;

    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            );
        }
    }
    return 1 - matrix[len1][len2] / maxLen;
}