// /_worker.js (最终、完整、正确版)

// --- 配置区 ---
const API_TARGET_DOMAIN = 'maoguxia.com';
const API_YEARS = [2002, 2003, 2004, 2005, 2006, 2007];
const API_EXCLUSION_KEYWORDS = [ '/build/', '/cpzs/', '/footer/', '/magazine/', '/member/', '/007/', 'dlgt.htm', 'ciee.htm', 'gd_1.htm', 'gd_2.htm', '/kepu/' ];

/**
 * 辅助类，用于重写 HTML 中的链接，使其指向我们的代理
 */
class AttributeRewriter {
  constructor(attributeName) { this.attributeName = attributeName; }
  element(element) {
    const attribute = element.getAttribute(this.attributeName);
    if (attribute && attribute.startsWith('/web/')) {
      element.setAttribute(this.attributeName, `/snapshot${attribute}`);
    }
  }
}

/**
 * 处理对单个快照页面的代理请求 (已修复重定向bug)
 */
async function handleSnapshotRequest(request) {
  const url = new URL(request.url);
  const waybackPath = url.pathname.substring('/snapshot'.length);
  // 正确地构造最终 URL，包含 /web/
  const targetUrl = `https://web.archive.org/web${waybackPath}`;

  const response = await fetch(targetUrl, request);
  const contentType = response.headers.get('Content-Type') || '';

  if (contentType.includes('text/html')) {
    const rewriter = new HTMLRewriter()
      .on('a', new AttributeRewriter('href'))
      .on('link', new AttributeRewriter('href'))
      .on('img', new AttributeRewriter('src'))
      .on('iframe', new AttributeRewriter('src'))
      .on('script', new AttributeRewriter('src'));
    return rewriter.transform(response);
  }
  return response;
}

/**
 * 处理对存档列表 API 的请求 (包含关键词排除)
 */
async function handleApiRequest() {
  const promises = API_YEARS.map(year => {
    const apiUrl = `https://web.archive.org/cdx/search/cdx?url=${API_TARGET_DOMAIN}/*&from=${year}&to=${year}&output=json&fl=timestamp,original&filter=statuscode:200`;
    return fetch(apiUrl, { headers: { 'User-Agent': 'Cloudflare-Worker-Proxy/1.0' } });
  });
  try {
    const responses = await Promise.all(promises);
    for (const response of responses) { if (!response.ok) throw new Error(`API 请求失败`); }
    const yearlyData = await Promise.all(responses.map(res => res.json()));
    const header = yearlyData.find(data => data.length > 0)?.[0] || ["timestamp", "original"];
    let allRecords = yearlyData.flatMap(data => (data.length > 1 ? data.slice(1) : []));
    if (API_EXCLUSION_KEYWORDS.length > 0) {
      allRecords = allRecords.filter(snapshot => !API_EXCLUSION_KEYWORDS.some(keyword => snapshot[1].includes(keyword)));
    }
    allRecords.sort((a, b) => a[0].localeCompare(b[0]));
    const finalJson = [header, ...allRecords];
    return new Response(JSON.stringify(finalJson), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 's-maxage=86400' } });
  } catch (error) { throw new Error(`处理 API 请求时出错: ${error.message}`); }
}

/**
 * 主入口：路由分发 (已修复错误处理)
 */
export default {
  async fetch(request, env, context) {
    const url = new URL(request.url);
    try {
      if (url.pathname === '/api/records') {
        return await handleApiRequest();
      }
      if (url.pathname.startsWith('/snapshot/')) {
        return await handleSnapshotRequest(request);
      }
      // 提供静态文件
      return await env.ASSETS.fetch(request);
    } catch (error) {
      console.error('Worker 发生异常:', error.stack);
      // 总是返回 JSON 格式的错误
      return new Response(JSON.stringify({ error: `Worker 内部错误: ${error.message}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  },
};