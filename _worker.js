// /_worker.js (最终完美版：已加入精确的排除规则)

// --- 配置区 ---
const TARGET_DOMAIN = 'maoguxia.com';
const YEARS = [2002, 2003, 2004, 2005, 2006, 2007];

// --- 最终排除关键字列表 ---
// 基于您提供的链接分析得出的模式
const EXCLUSION_KEYWORDS = [
    '/build/',          // 排除建站工具残留
    '/cpzs/',           // 排除产品展示模板
    '/footer/',         // 排除通用页脚模板
    '/magazine/',       // 排除杂志模板
    '/member/',         // 排除会员登录模板
    '/007/',            // 排除最主要的污染源 "007" 目录
    'dlgt.htm',         // 排除特定的 htm 文件
    'ciee.htm',         // 排除特定的 htm 文件
    'gd_1.htm',         // 排除特定的 htm 文件
    'gd_2.htm',         // 排除特定的 htm 文件
    '/kepu/'            // 排除科普模板目录
];
// -----------------------------

async function handleApiRequest() {
  const promises = YEARS.map(year => {
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
    let allRecords = yearlyData.flatMap(data => (data.length > 1 ? data.slice(1) : []));
    
    // 执行过滤，移除所有包含排除关键词的记录
    if (EXCLUSION_KEYWORDS.length > 0) {
      allRecords = allRecords.filter(snapshot => {
        const url = snapshot[1];
        return !EXCLUSION_KEYWORDS.some(keyword => url.includes(keyword));
      });
    }
    
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