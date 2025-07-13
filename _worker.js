// /_worker.js

// --- 在这里修改你要查询的网站 ---
const TARGET_DOMAIN = 'maoguxia.com';
// -----------------------------------

async function handleApiRequest() {
  const apiUrl = `https://web.archive.org/cdx/search/cdx?url=${TARGET_DOMAIN}/*&from=2002&to=2007&output=json&fl=timestamp,original&collapse=timestamp:8&filter=statuscode:200`;

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`Wayback Machine API error: ${response.statusText}`);
    }
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=86400', // 缓存一天
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export default {
  async fetch(request, env, context) {
    const url = new URL(request.url);
    
    // 如果请求路径是 /api/records，则执行我们的 API 代理逻辑
    if (url.pathname === '/api/records') {
      return handleApiRequest();
    }
    
    // 对于所有其他请求 (如 index.html, style.css 等)，
    // 让 Cloudflare Pages 正常提供静态文件
    return context.next();
  },
};