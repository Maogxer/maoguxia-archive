// /script.js (最终版：链接指向代理)

document.addEventListener('DOMContentLoaded', () => {
    const loadingDiv = document.getElementById('loading');
    const archiveList = document.getElementById('archive-list');
    const paginationControls = document.getElementById('pagination-controls');
    const RECORDS_PER_PAGE = 20;
    let currentPage = 1;
    let allRecords = [];
    async function fetchAllArchives() {
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
                postHeight();
                return;
            }
            allRecords = data.slice(1);
            renderPage(currentPage);
            setupPagination();
        } catch (error) {
            loadingDiv.textContent = `挖掘失败: ${error.message}`;
            postHeight();
        }
    }
    function renderPage(page) {
        currentPage = page;
        archiveList.innerHTML = '';
        const startIndex = (page - 1) * RECORDS_PER_PAGE;
        const endIndex = startIndex + RECORDS_PER_PAGE;
        const pageRecords = allRecords.slice(startIndex, endIndex);
        pageRecords.forEach(snapshot => {
            const [timestamp, originalUrl] = snapshot;
            const formattedDate = `${timestamp.substring(0, 4)}-${timestamp.substring(4, 6)}-${timestamp.substring(6, 8)} ${timestamp.substring(8, 10)}:${timestamp.substring(10, 12)}:${timestamp.substring(12, 14)}`;
            const proxiedUrl = `/snapshot/${timestamp}id_/${originalUrl}`;
            const listItem = document.createElement('li');
            const link = document.createElement('a');
            link.href = proxiedUrl;
            link.textContent = `${originalUrl} (快照于 ${formattedDate})`;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            listItem.appendChild(link);
            archiveList.appendChild(listItem);
        });
        updatePaginationButtons();
    }
    function setupPagination() {
        paginationControls.innerHTML = '';
        const pageCount = Math.ceil(allRecords.length / RECORDS_PER_PAGE);
        if (pageCount <= 1) return;
        const prevButton = document.createElement('button'); prevButton.textContent = '上一页'; prevButton.classList.add('page-btn');
        const nextButton = document.createElement('button'); nextButton.textContent = '下一页'; nextButton.classList.add('page-btn');
        const pageInfoSpan = document.createElement('span'); pageInfoSpan.classList.add('page-btn', 'page-info');
        const pageInput = document.createElement('input'); pageInput.type = 'number'; pageInput.classList.add('page-input', 'hidden'); pageInput.min = 1; pageInput.max = pageCount;
        paginationControls.appendChild(prevButton); paginationControls.appendChild(pageInfoSpan); paginationControls.appendChild(pageInput); paginationControls.appendChild(nextButton);
        prevButton.addEventListener('click', () => { if (currentPage > 1) renderPage(currentPage - 1); });
        nextButton.addEventListener('click', () => { if (currentPage < pageCount) renderPage(currentPage + 1); });
        pageInfoSpan.addEventListener('click', () => { pageInfoSpan.classList.add('hidden'); pageInput.classList.remove('hidden'); pageInput.value = currentPage; pageInput.focus(); pageInput.select(); });
        const handlePageInput = () => {
            const newPage = parseInt(pageInput.value, 10);
            pageInput.classList.add('hidden'); pageInfoSpan.classList.remove('hidden');
            if (!isNaN(newPage) && newPage >= 1 && newPage <= pageCount && newPage !== currentPage) renderPage(newPage);
        };
        pageInput.addEventListener('blur', handlePageInput);
        pageInput.addEventListener('keyup', (event) => { if (event.key === 'Enter') handlePageInput(); });
        updatePaginationButtons();
    }
    function updatePaginationButtons() {
        const pageCount = Math.ceil(allRecords.length / RECORDS_PER_PAGE);
        if (pageCount <= 1) { paginationControls.innerHTML = ''; return; }
        const prevButton = paginationControls.querySelector('button:first-child');
        const nextButton = paginationControls.querySelector('button:last-child');
        const pageInfoSpan = paginationControls.querySelector('.page-info');
        if (prevButton) prevButton.disabled = currentPage === 1;
        if (nextButton) nextButton.disabled = currentPage === pageCount;
        if (pageInfoSpan) pageInfoSpan.textContent = `第 ${currentPage} / ${pageCount} 页`;
    }
    function postHeight() {
        const height = document.documentElement.scrollHeight;
        parent.postMessage({ type: 'resize-iframe', height: height }, 'https://maoguxia.com.cn');
    }
    const originalRenderPage = renderPage;
    renderPage = function(page) {
        originalRenderPage(page);
        setTimeout(postHeight, 200);
    };
    window.addEventListener('load', () => setInterval(postHeight, 500));
    window.addEventListener('resize', postHeight);
    fetchAllArchives();
});