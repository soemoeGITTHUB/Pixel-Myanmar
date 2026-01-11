let allItems = [];
let currentPage = 1;
const itemsPerPage = 12;

document.addEventListener("DOMContentLoaded", () => {
    const packGrid = document.querySelector('.pack-grid') || document.getElementById('movie-grid');
    const searchInput = document.getElementById('searchInput');

    fetch('data.json')
        .then(res => res.json())
        .then(data => {
            allItems = data;
            if (packGrid) displayItems(allItems);
            if (document.getElementById('download-page-marker') || document.getElementById('timer') || document.getElementById('episodes-container')) {
                initDownloadPage();
            }
        })
        .catch(err => console.error("Error loading JSON:", err));

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentPage = 1;
            const term = e.target.value.toLowerCase();
            const filtered = allItems.filter(item => {
                // Safety check: ensure category and title exist before using toLowerCase
                const title = (item.title || "").toLowerCase();
                const cat = (item.category || "").toLowerCase();
                return title.includes(term) || cat.includes(term);
            });
            displayItems(filtered);
        });
    }
});

// --- NEW: Category Filter Function ---
// This connects your HTML buttons to the filtering logic
window.filterMovies = function(categoryName) {
    currentPage = 1;
    
    // Update UI: Remove active class from all buttons and add to clicked one
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    if (event && event.target) event.target.classList.add('active');

    const filtered = (categoryName === 'All') 
        ? allItems 
        : allItems.filter(item => item.category === categoryName);
    
    displayItems(filtered);
};

function displayItems(itemsToShow) {
    const grid = document.querySelector('.pack-grid') || document.getElementById('movie-grid');
    if (!grid) return;
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = itemsToShow.slice(startIndex, endIndex);

    grid.innerHTML = paginatedItems.map(item => `
        <div class="pack-card">
            <div class="badge">${item.category || 'General'}</div>
            <div class="thumbnail"><img src="${item.thumb || item.thumbnail || 'assets/default.jpg'}" loading="lazy"></div>
            <div class="pack-info">
                <h3>${item.title}</h3>
                <a href="download-page.html?id=${item.id}" class="download-btn">▶ Watch and Download</a>
            </div>
        </div>
    `).join('');
    renderPagination(itemsToShow.length, itemsToShow);
}

function renderPagination(totalItems, currentList) {
    const container = document.getElementById('page-numbers');
    if (!container) return;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    container.innerHTML = '';
    
    if (totalPages <= 1) return; // Hide pagination if only 1 page

    for (let i = 1; i <= totalPages; i++) {
        const span = document.createElement('span');
        span.innerText = i;
        span.className = (i === currentPage) ? 'page-number active' : 'page-number';
        span.onclick = () => { 
            currentPage = i; 
            displayItems(currentList); 
            window.scrollTo({top:0, behavior:'smooth'}); 
        };
        container.appendChild(span);
    }
}

// --- DOWNLOAD PAGE LOGIC ---

function initDownloadPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const packId = urlParams.get('id');
    const pack = allItems.find(p => p.id === packId);
    if (!pack) return;

    document.querySelector('h1').textContent = pack.title;
    const desc = document.querySelector('.description p');
    if(desc) desc.textContent = pack.description || "No description available.";

    const epContainer = document.getElementById('episodes-container');
    const singleContainer = document.getElementById('single-download-area');

    // Check if it has an episodes array AND the array is not empty
    if (pack.episodes && pack.episodes.length > 0 && epContainer) {
        if(singleContainer) singleContainer.style.display = 'none';
        
        epContainer.innerHTML = pack.episodes.map((ep, index) => `
            <div class="ep-wrapper" id="wrapper-${index}">
                <button class="episode-btn" onclick="handleEpisodeClick(${index}, '${ep.url}')">
                    ${ep.name}
                </button>
            </div>
        `).join('');
    } else {
        // Hide episodes grid if it's a single movie
        if(epContainer) epContainer.style.display = 'none';
        if(singleContainer) singleContainer.style.display = 'block';
        startSingleTimer(pack.downloadUrl || "#");
    }
}

window.handleEpisodeClick = function(index, url) {
    const wrapper = document.getElementById(`wrapper-${index}`);
    let timeLeft = 10;
    
    wrapper.innerHTML = `<button class="episode-btn loading" disabled>Wait <span id="time-${index}">10</span>s</button>`;
    
    const countdown = setInterval(() => {
        timeLeft--;
        const timerSpan = document.getElementById(`time-${index}`);
        if(timerSpan) timerSpan.textContent = timeLeft;

        if (timeLeft <= 0) {
            clearInterval(countdown);
            wrapper.innerHTML = `<a href="${url}" class="episode-btn download-ready" target="_blank">Download Now</a>`;
        }
    }, 1000);
};

function startSingleTimer(url) {
    const timerElement = document.getElementById('timer');
    const downloadLink = document.getElementById('download-link');
    const waitMessage = document.getElementById('wait-message');
    if (!timerElement) return;

    let timeLeft = 10;
    const countdown = setInterval(() => {
        timeLeft--;
        timerElement.textContent = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(countdown);
            if(waitMessage) waitMessage.style.display = 'none';
            if(downloadLink) {
                downloadLink.classList.remove('hidden');
                downloadLink.href = url;
            }
        }
    }, 1000);
}