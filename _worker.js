// /_worker.js (更健壮的版本)

// --- 在这里修改你要查询的网站 ---
const TARGET_DOMAIN = 'maoguxia.com';
// -----------------------------------

async function handleApiRequest() {
  const apiUrl = `https://web.archive.org/cdx/search/cdx?url=${TARGET_DOMAIN}/*&from=2002&to=2007&output=json&fl=timestamp,original&collapse=timestamp:8&filter=statuscode:200`;

  // 从外部 API 获取数据
  const response = await fetch(apiUrl, {
    headers: { 'User-Agent': 'Cloudflare-Worker-Proxy/1.0' }, // 伪装成一个正常的浏览器请求
  });

  if (!response.ok) {
    throw new Error(`Wayback Machine API 请求失败，状态码: ${response.status}`);
  }

  // 先将响应作为文本读取，这是最安全的方式
  const responseText = await response.text();

  // 尝试解析文本为 JSON，如果失败则抛出错误
  try {
    JSON.parse(responseText);
  } catch (e) {
    console.error("收到了非 JSON 格式的响应:", responseText);
    throw new Error("从 Wayback Machine 收到了无效的数据格式。");
  }
  
  // 如果 JSON 解析成功，则返回一个带有正确头信息的响应
  return new Response(responseText, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 's-maxage=86400', // 缓存一天
    },
  });
}

export default {
  async fetch(request, env, context) {
    // 使用一个全局的 try...catch 来捕获所有潜在的错误，防止 1101 发生
    try {
      const url = new URL(request.url);
      
      // 路由：如果请求 API，则处理 API
      if (url.pathname === '/api/records') {
        return await handleApiRequest();
      }
      
      // 否则，让 Cloudflare Pages 提供静态文件
      return await context.next();

    } catch (error) {
      // 如果发生任何错误，都返回一个结构化的 JSON 错误响应
      // 这会显示在我们的前端页面上，而不是导致 Worker 崩溃
      console.error('Worker 发生异常:', error);
      return new Response(JSON.stringify({ error: `Worker 内部错误: ${error.message}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
};