// /_worker.js (已修复 context.next 错误)

// --- 在这里修改你要查询的网站 ---
const TARGET_DOMAIN = 'sina.com.cn';
// -----------------------------------

async function handleApiRequest(request) {
  const apiUrl = `https://web.archive.org/cdx/search/cdx?url=${TARGET_DOMAIN}/*&from=2002&to=2007&output=json&fl=timestamp,original&collapse=timestamp:8&filter=statuscode:200`;

  try {
    const response = await fetch(apiUrl, {
      headers: { 'User-Agent': 'Cloudflare-Worker-Proxy/1.0' },
    });

    if (!response.ok) {
      throw new Error(`Wayback Machine API 请求失败，状态码: ${response.status}`);
    }

    const responseText = await response.text();
    
    // 验证是否为有效的 JSON
    try {
      JSON.parse(responseText);
    } catch (e) {
      console.error("从 Wayback Machine 收到了非 JSON 格式的响应:", responseText);
      throw new Error("从 Wayback Machine 收到了无效的数据格式。");
    }

    return new Response(responseText, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=86400', // 缓存一天
      },
    });
  } catch (error) {
     // 如果 fetch 或解析失败，向上抛出错误，由外层捕获
     throw new Error(`处理 API 请求时出错: ${error.message}`);
  }
}

export default {
  async fetch(request, env, context) {
    try {
      const url = new URL(request.url);

      // 路由：如果请求路径是 /api/records，则执行我们的 API 代理逻辑
      if (url.pathname === '/api/records') {
        return await handleApiRequest(request);
      }

      // *** 这是关键的修复 ***
      // 对于所有其他请求，使用 env.ASSETS.fetch 来获取静态文件
      // 这会返回 index.html, style.css, script.js 等
      return await env.ASSETS.fetch(request);

    } catch (error) {
      // 全局捕获，如果 handleApiRequest 或其他地方抛出错误，在这里处理
      console.error('Worker 发生异常:', error.stack);
      return new Response(JSON.stringify({ error: `Worker 内部错误: ${error.message}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
};