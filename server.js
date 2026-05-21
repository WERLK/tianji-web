#!/usr/bin/env node
// ============================================================
// 天机阁 - 本地服务器
// 提供静态文件服务 + AI 面相分析 API
// 用法: node server.js [端口]
// 默认端口: 3000
// ============================================================

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.argv[2] || '3000', 10);
const WEB_DIR = path.join(__dirname);

// MIME 类型映射
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

// ===== VLM 面相分析 =====
async function analyzeFace(base64DataUrl) {
  const ZAI = require('z-ai-web-dev-sdk').default;
  const zai = await ZAI.create();

  const prompt = `你是一位精通中国传统面相手相学的相术大师。请仔细观察这张面部照片，从传统相学角度进行专业分析。

请严格按照以下 JSON 格式输出（不要输出其他内容）：
{
  "tags": ["特征标签1", "特征标签2", ...],
  "scores": {
    "career": 75,
    "wealth": 70,
    "love": 80,
    "health": 72
  },
  "details": [
    {"title": "👤 整体面相", "text": "..."},
    {"title": "🧠 额头天庭", "text": "..."},
    {"title": "👁 眼相", "text": "..."},
    {"title": "👃 鼻相", "text": "..."},
    {"title": "👄 口相", "text": "..."},
    {"title": "🤨 眉相", "text": "..."},
    {"title": "👂 耳相", "text": "..."},
    {"title": "💡 综合建议", "text": "..."}
  ]
}

分析要求：
1. tags: 提取 5-8 个面部特征关键词（如"天庭饱满"、"凤眼"、"悬胆鼻"等）
2. scores: 事业/财运/感情/健康各打分 40-95 之间
3. details: 每个部位从相学角度分析 2-3 句话，综合建议 3-4 句话
4. 语言风格：专业但不晦涩，结合现代生活
5. 只输出 JSON，不要 markdown 代码块`;

  const result = await zai.chat.completions.createVision({
    model: 'glm-4v-flash',
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: base64DataUrl } }
      ]
    }]
  });

  const content = result.choices && result.choices[0] && result.choices[0].message && result.choices[0].message.content;
  if (!content) throw new Error('AI 未返回分析结果');

  // 解析 JSON（可能被 markdown 代码块包裹）
  let jsonStr = content.trim();
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) jsonStr = codeBlockMatch[1].trim();

  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    throw new Error('AI 返回格式异常，请重试');
  }
}

// ===== HTTP 服务器 =====
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // API: 面相分析
  if (url.pathname === '/api/analyze-face' && req.method === 'POST') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        if (!data.image || typeof data.image !== 'string') {
          res.writeHead(400);
          res.end(JSON.stringify({ error: '缺少图片数据' }));
          return;
        }
        // 限制 base64 大小（约 10MB）
        if (data.image.length > 15 * 1024 * 1024) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: '图片过大' }));
          return;
        }
        console.log('[AI] 开始面相分析...');
        const result = await analyzeFace(data.image);
        console.log('[AI] 分析完成');
        res.writeHead(200);
        res.end(JSON.stringify(result));
      } catch (e) {
        console.error('[AI] 分析失败:', e.message);
        res.writeHead(500);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // 静态文件服务
  let filePath = url.pathname;
  if (filePath === '/' || filePath === '/tianji-web/' || filePath === '/tianji-web') {
    filePath = '/index.html';
  }
  // 去掉 /tianji-web 前缀（兼容 GitHub Pages 路径）
  if (filePath.startsWith('/tianji-web/')) {
    filePath = filePath.substring('/tianji-web'.length);
  }

  const fullPath = path.join(WEB_DIR, filePath);
  const ext = path.extname(fullPath).toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';

  fs.readFile(fullPath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log('');
  console.log('  🔮 天机阁 本地服务器已启动');
  console.log(`  📡 访问地址: http://localhost:${PORT}`);
  console.log(`  📂 静态目录: ${WEB_DIR}`);
  console.log(`  🤖 AI 面相分析: http://localhost:${PORT}/api/analyze-face`);
  console.log('');
  console.log('  按 Ctrl+C 停止服务器');
  console.log('');
});
