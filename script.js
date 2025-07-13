// /script.js (最终版：可输入跳转的页码)

document.addEventListener('DOMContentLoaded', () => {
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
        // ... renderPage 函数保持不变 ...
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
            link.textContent = `${originalUrl} (快照于 ${formattedDate})`;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            listItem.appendChild(link);
            archiveList.appendChild(listItem);
        });
        setTimeout(() => archiveList.classList.add('loaded'), 50);
        updatePaginationButtons();
    }
    
    // *** 核心改动从这里开始 ***

    function setupPagination() {
        paginationControls.innerHTML = '';
        const pageCount = Math.ceil(allRecords.length / RECORDS_PER_PAGE);
        if (pageCount <= 1) return;

        // --- 创建并配置所有分页元素 ---
        const prevButton = document.createElement('button');
        prevButton.textContent = '上一页';
        prevButton.classList.add('page-btn');

        const nextButton = document.createElement('button');
        nextButton.textContent = '下一页';
        nextButton.classList.add('page-btn');
        
        // 可点击的页码文本
        const pageInfoSpan = document.createElement('span');
        pageInfoSpan.classList.add('page-btn', 'page-info');
        
        // 隐藏的输入框
        const pageInput = document.createElement('input');
        pageInput.type = 'number';
        pageInput.classList.add('page-input', 'hidden');
        pageInput.min = 1;
        pageInput.max = pageCount;
        
        // --- 组装分页控件 ---
        paginationControls.appendChild(prevButton);
        paginationControls.appendChild(pageInfoSpan);
        paginationControls.appendChild(pageInput);
        paginationControls.appendChild(nextButton);

        // --- 绑定事件 ---
        prevButton.addEventListener('click', () => {
            if (currentPage > 1) renderPage(currentPage - 1);
        });
        
        nextButton.addEventListener('click', () => {
            if (currentPage < pageCount) renderPage(currentPage + 1);
        });
        
        // 点击页码文本，切换到输入框
        pageInfoSpan.addEventListener('click', () => {
            pageInfoSpan.classList.add('hidden');
            pageInput.classList.remove('hidden');
            pageInput.value = currentPage;
            pageInput.focus();
            pageInput.select();
        });

        // 处理输入完成的逻辑（回车或失去焦点）
        const handlePageInput = () => {
            const newPage = parseInt(pageInput.value, 10);
            pageInput.classList.add('hidden');
            pageInfoSpan.classList.remove('hidden');
            
            if (!isNaN(newPage) && newPage >= 1 && newPage <= pageCount && newPage !== currentPage) {
                renderPage(newPage);
            }
        };

        pageInput.addEventListener('blur', handlePageInput);
        pageInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                handlePageInput();
            }
        });
        
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