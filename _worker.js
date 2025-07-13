// /_worker.js (最终完美版 V3：已修复错误处理格式)

// --- API 代理部分的配置 ---
const API_TARGET_DOMAIN = 'maoguxia.com';
const API_YEARS = [2002, 2003, 2004, 2005, 2006, 2007];
const API_EXCLUSION_KEYWORDS = [ '/build/', '/cpzs/', '/footer/', '/magazine/', '/member/', '/007/', 'dlgt.htm', 'ciee.htm', 'gd_1.htm', 'gd_2.htm', '/kepu/' ];

/**
 * 这是一个辅助类，用于重写 HTML 中的链接属性
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
 * 处理对单个快照页面的代理请求
 */
async function handleSnapshotRequest(request) {
  const url = new URL(request.url);
  const waybackPath = url.pathname.substring('/snapshot'.length);
  const targetUrl = `https://web.archive.org${waybackPath}`;
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
 * 处理对存档列表 API 的请求 (包含排除规则)
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
 * 主入口：路由分发
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
      return await env.ASSETS.fetch(request);
    } catch (error) {
      console.error('Worker 发生异常:', error.stack);
      
      // *** 这是唯一的、关键的修复 ***
      // 即使出错，也返回一个标准的 JSON 错误对象
      return new Response(JSON.stringify({ error: `Worker 内部错误: ${error.message}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  },
};