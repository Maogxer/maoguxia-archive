document.addEventListener('DOMContentLoaded', () => {
    const loadingDiv = document.getElementById('loading');
    const archiveList = document.getElementById('archive-list');
    const paginationControls = document.getElementById('pagination-controls');

    // --- 分页设置 ---
    const RECORDS_PER_PAGE = 15; // 每页显示15条记录
    let currentPage = 1;
    let allRecords = []; // 用于存储所有从后端获取的记录

    async function fetchAllArchives() {
        // 请求我们自己的后端代理，而不是直接请求 Wayback Machine
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
            
            // 跳过标题行，存储所有有效记录
            allRecords = data.slice(1);
            
            // 数据加载成功后，渲染第一页并设置分页控件
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
        archiveList.classList.remove('loaded'); // 重置动画

        const startIndex = (page - 1) * RECORDS_PER_PAGE;
        const endIndex = startIndex + RECORDS_PER_PAGE;
        const pageRecords = allRecords.slice(startIndex, endIndex);

        pageRecords.forEach(snapshot => {
            const [timestamp, originalUrl] = snapshot;
            const year = timestamp.substring(0, 4);
            const month = timestamp.substring(4, 6);
            const day = timestamp.substring(6, 8);
            const formattedDate = `${year} - ${month} - ${day}`;
            const cleanUrl = `https://web.archive.org/web/${timestamp}id_/${originalUrl}`;

            const listItem = document.createElement('li');
            const link = document.createElement('a');
            link.href = cleanUrl;
            link.textContent = `存档于 ${formattedDate}`;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            listItem.appendChild(link);
            archiveList.appendChild(listItem);
        });
        
        // 使用一个小的延迟来触发CSS动画
        setTimeout(() => archiveList.classList.add('loaded'), 50);

        // 更新分页按钮的激活状态
        updatePaginationButtons();
    }

    function setupPagination() {
        paginationControls.innerHTML = '';
        const pageCount = Math.ceil(allRecords.length / RECORDS_PER_PAGE);

        if (pageCount <= 1) return; // 如果只有一页或没有，则不显示分页

        // 上一页按钮
        const prevButton = document.createElement('button');
        prevButton.textContent = '上一页';
        prevButton.classList.add('page-btn');
        prevButton.addEventListener('click', () => {
            if (currentPage > 1) {
                renderPage(currentPage - 1);
            }
        });
        paginationControls.appendChild(prevButton);

        // 页码按钮 (这里我们只做简单的数字显示，可以优化为更复杂的 "..." 模式)
        for (let i = 1; i <= pageCount; i++) {
            const pageButton = document.createElement('button');
            pageButton.textContent = i;
            pageButton.classList.add('page-btn');
            pageButton.dataset.page = i;
            pageButton.addEventListener('click', () => renderPage(i));
            paginationControls.appendChild(pageButton);
        }

        // 下一页按钮
        const nextButton = document.createElement('button');
        nextButton.textContent = '下一页';
        nextButton.classList.add('page-btn');
        nextButton.addEventListener('click', () => {
            if (currentPage < pageCount) {
                renderPage(currentPage + 1);
            }
        });
        paginationControls.appendChild(nextButton);
        
        updatePaginationButtons();
    }
    
    function updatePaginationButtons() {
        const pageCount = Math.ceil(allRecords.length / RECORDS_PER_PAGE);
        // 更新按钮禁用状态
        paginationControls.querySelector('button:first-child').disabled = currentPage === 1;
        paginationControls.querySelector('button:last-child').disabled = currentPage === pageCount;

        // 更新页码激活状态
        document.querySelectorAll('.page-btn[data-page]').forEach(btn => {
            btn.classList.remove('active');
            if (parseInt(btn.dataset.page) === currentPage) {
                btn.classList.add('active');
            }
        });
    }

    // 页面加载后自动执行
    fetchAllArchives();
});