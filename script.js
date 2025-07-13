// /script.js (最终版：显示链接和详细时间)

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
            
            const year = timestamp.substring(0, 4);
            const month = timestamp.substring(4, 6);
            const day = timestamp.substring(6, 8);
            const hour = timestamp.substring(8, 10);
            const minute = timestamp.substring(10, 12);
            const second = timestamp.substring(12, 14);
            const formattedDate = `${year}-${month}-${day} ${hour}:${minute}:${second}`;

            const cleanUrl = `https://web.archive.org/web/${timestamp}id_/${originalUrl}`;

            const listItem = document.createElement('li');
            const link = document.createElement('a');
            link.href = cleanUrl;
            
            // *** 这是唯一的、关键的改动 ***
            // 组合 URL 和格式化的日期作为链接文本
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
        prevButton.addEventListener('click', () => {
            if (currentPage > 1) renderPage(currentPage - 1);
        });
        paginationControls.appendChild(prevButton);

        const pageInfo = document.createElement('span');
        pageInfo.classList.add('page-btn');
        pageInfo.style.cursor = 'default';
        pageInfo.textContent = `第 ${currentPage} / ${pageCount} 页`;
        paginationControls.appendChild(pageInfo);


        const nextButton = document.createElement('button');
        nextButton.textContent = '下一页';
        nextButton.classList.add('page-btn');
        nextButton.addEventListener('click', () => {
            if (currentPage < pageCount) renderPage(currentPage + 1);
        });
        paginationControls.appendChild(nextButton);
        
        updatePaginationButtons();
    }
    
    function updatePaginationButtons() {
        const pageCount = Math.ceil(allRecords.length / RECORDS_PER_PAGE);
        
        const prevButton = paginationControls.querySelector('button:first-child');
        if (prevButton) prevButton.disabled = currentPage === 1;

        const nextButton = paginationControls.querySelector('button:last-child');
        if (nextButton) nextButton.disabled = currentPage === pageCount;
        
        const pageInfo = paginationControls.querySelector('span');
        if (pageInfo) pageInfo.textContent = `第 ${currentPage} / ${pageCount} 页`;
    }

    fetchAllArchives();
});