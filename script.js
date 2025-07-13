// /script.js (最终版：链接指向代理)

document.addEventListener('DOMContentLoaded', () => {
    // ... 其他变量声明保持不变 ...
    const loadingDiv = document.getElementById('loading');
    const archiveList = document.getElementById('archive-list');
    const paginationControls = document.getElementById('pagination-controls');
    const RECORDS_PER_PAGE = 20;
    let currentPage = 1;
    let allRecords = [];

    async function fetchAllArchives() {
        // ... fetchAllArchives 函数保持不变 ...
        const apiUrl = '/api/records';
        try {
            const response = await fetch(apiUrl);
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || `服务器代理出错: ${response.statusText}`);
            }
            const data = await response.json();
            loadingDiv.style.display = 'none';
            if (data.length <= 1) {
                archiveList.innerHTML = '<li>在这个时间段内没有找到任何历史快照。</li>';
                return;
            }
            allRecords = data.slice(1);
            renderPage(currentPage);
            setupPagination();
        } catch (error) {
            loadingDiv.textContent = `挖掘失败: ${error.message}`;
            console.error("抓取存档失败:", error);
        }
    }

    function renderPage(page) {
        currentPage = page;
        archiveList.innerHTML = '';
        archiveList.classList.remove('loaded');
        const startIndex = (page - 1) * RECORDS_PER_PAGE;
        const endIndex = startIndex + RECORDS_PER_PAGE;
        const pageRecords = allRecords.slice(startIndex, endIndex);

        pageRecords.forEach(snapshot => {
            const [timestamp, originalUrl] = snapshot;
            const formattedDate = `${timestamp.substring(0, 4)}-${timestamp.substring(4, 6)}-${timestamp.substring(6, 8)} ${timestamp.substring(8, 10)}:${timestamp.substring(10, 12)}:${timestamp.substring(12, 14)}`;

            // *** 这是最关键的改动 ***
            // 构建指向我们自己代理的 URL，而不是直接指向 web.archive.org
            const proxiedUrl = `/snapshot/${timestamp}id_/${originalUrl}`;

            const listItem = document.createElement('li');
            const link = document.createElement('a');
            link.href = proxiedUrl; // 使用代理 URL
            link.textContent = `${originalUrl} (快照于 ${formattedDate})`;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            listItem.appendChild(link);
            archiveList.appendChild(listItem);
        });

        setTimeout(() => archiveList.classList.add('loaded'), 50);
        updatePaginationButtons();
    }
    
    // setupPagination 和 updatePaginationButtons 函数保持不变...
    function setupPagination() {
        paginationControls.innerHTML = '';
        const pageCount = Math.ceil(allRecords.length / RECORDS_PER_PAGE);
        if (pageCount <= 1) return;
        const prevButton = document.createElement('button');
        prevButton.textContent = '上一页';
        prevButton.classList.add('page-btn');
        const nextButton = document.createElement('button');
        nextButton.textContent = '下一页';
        nextButton.classList.add('page-btn');
        const pageInfoSpan = document.createElement('span');
        pageInfoSpan.classList.add('page-btn', 'page-info');
        const pageInput = document.createElement('input');
        pageInput.type = 'number';
        pageInput.classList.add('page-input', 'hidden');
        pageInput.min = 1;
        pageInput.max = pageCount;
        paginationControls.appendChild(prevButton);
        paginationControls.appendChild(pageInfoSpan);
        paginationControls.appendChild(pageInput);
        paginationControls.appendChild(nextButton);
        prevButton.addEventListener('click', () => { if (currentPage > 1) renderPage(currentPage - 1); });
        nextButton.addEventListener('click', () => { if (currentPage < pageCount) renderPage(currentPage + 1); });
        pageInfoSpan.addEventListener('click', () => {
            pageInfoSpan.classList.add('hidden');
            pageInput.classList.remove('hidden');
            pageInput.value = currentPage;
            pageInput.focus();
            pageInput.select();
        });
        const handlePageInput = () => {
            const newPage = parseInt(pageInput.value, 10);
            pageInput.classList.add('hidden');
            pageInfoSpan.classList.remove('hidden');
            if (!isNaN(newPage) && newPage >= 1 && newPage <= pageCount && newPage !== currentPage) {
                renderPage(newPage);
            }
        };
        pageInput.addEventListener('blur', handlePageInput);
        pageInput.addEventListener('keyup', (event) => { if (event.key === 'Enter') handlePageInput(); });
        updatePaginationButtons();
    }
    function updatePaginationButtons() {
        const pageCount = Math.ceil(allRecords.length / RECORDS_PER_PAGE);
        if (pageCount <= 1) return;
        const prevButton = paginationControls.querySelector('button:first-child');
        const nextButton = paginationControls.querySelector('button:last-child');
        const pageInfoSpan = paginationControls.querySelector('.page-info');
        if (prevButton) prevButton.disabled = currentPage === 1;
        if (nextButton) nextButton.disabled = currentPage === pageCount;
        if (pageInfoSpan) pageInfoSpan.textContent = `第 ${currentPage} / ${pageCount} 页`;
    }

    fetchAllArchives();
});

// --- 以下是新增的代码，请添加到文件末尾 ---

/**
 * 向父窗口（主站）发送当前页面的高度
 */
function postHeight() {
    // 使用 document.documentElement.scrollHeight 获取最准确的页面总高度
    const height = document.documentElement.scrollHeight;
    
    // 使用 postMessage 与父窗口通信，第二个参数指定了只允许哪个源的父窗口接收
    // 这是最安全的做法
    parent.postMessage({ type: 'resize-iframe', height: height }, 'https://maoguxia.com.cn');
}

// 覆盖 renderPage 和 setupPagination，在它们执行完后汇报高度
const originalRenderPage = renderPage;
renderPage = function(page) {
    originalRenderPage(page);
    setTimeout(postHeight, 150); // 渲染后稍作延迟再汇报，确保万无一失
};

const originalSetupPagination = setupPagination;
setupPagination = function() {
    originalSetupPagination();
    setTimeout(postHeight, 150);
};

// 当窗口大小改变时，也重新发送高度
window.addEventListener('resize', postHeight);