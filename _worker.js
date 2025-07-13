// /_worker.js (最终版：获取所有详细记录，无 collapse)

// --- 配置区 ---
const TARGET_DOMAIN = 'maoguxia.com';
const YEARS = [2002, 2003, 2004, 2005, 2006, 2007];
// ----------------

async function handleApiRequest() {
  const promises = YEARS.map(year => {
    // *** 关键改动：确认 URL 中没有 &collapse=... 参数 ***
    const apiUrl = `https://web.archive.org/cdx/search/cdx?url=${TARGET_DOMAIN}/*&from=${year}&to=${year}&output=json&fl=timestamp,original&filter=statuscode:200`;
    return fetch(apiUrl, { headers: { 'User-Agent': 'Cloudflare-Worker-Proxy/1.0' } });
  });

  try {
    const responses = await Promise.all(promises);
    for (const response of responses) {
      if (!response.ok) {
        throw new Error(`其中一个年份的 API 请求失败，状态码: ${response.status}`);
      }
    }
    const yearlyData = await Promise.all(responses.map(res => res.json()));
    const header = yearlyData.find(data => data.length > 0)?.[0] || ["timestamp", "original"];
    const allRecords = yearlyData.flatMap(data => (data.length > 1 ? data.slice(1) : []));
    
    // 按时间戳升序排序所有记录
    allRecords.sort((a, b) => a[0].localeCompare(b[0]));
    
    const finalJson = [header, ...allRecords];
    return new Response(JSON.stringify(finalJson), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=86400',
      },
    });
  } catch (error) {
    throw new Error(`处理并行 API 请求时出错: ${error.message}`);
  }
}

export default {
  async fetch(request, env, context) {
    try {
      const url = new URL(request.url);
      if (url.pathname === '/api/records') {
        return await handleApiRequest(request);
      }
      return await env.ASSETS.fetch(request);
    } catch (error) {
      console.error('Worker 发生异常:', error.stack);
      return new Response(JSON.stringify({ error: `Worker 内部错误: ${error.message}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
};