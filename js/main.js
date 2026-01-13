let allItems = [];
let currentPage = 1;
const itemsPerPage = 12;

// --- AUTOMATION SETUP ---
// 1. In Google Sheets: File > Share > Publish to web
// 2. Select 'Entire Document' and 'Comma-separated values (.csv)'
// 3. Copy that link and paste it below:
const sheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSERPcsfkyc_jZKubDvGZW3tPjmMB6ddmyA6S1c3r9BT0j5jVT2qH-MsBKf99lUs-psP0l7J0F7T7rU/pub?output=csv';

document.addEventListener("DOMContentLoaded", () => {
    const packGrid = document.querySelector('.pack-grid') || document.getElementById('movie-grid');
    const searchInput = document.getElementById('searchInput');

    // Fetching from Google Sheets instead of data.json
    fetch(sheetUrl)
        .then(res => res.text())
        .then(csvText => {
            allItems = parseCSV(csvText);
            
            if (packGrid) displayItems(allItems);
            if (document.getElementById('download-page-marker') || document.getElementById('timer') || document.getElementById('episodes-container')) {
                initDownloadPage();
            }
        })
        .catch(err => console.error("Error loading Spreadsheet Data:", err));

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentPage = 1;
            const term = e.target.value.toLowerCase();
            const filtered = allItems.filter(item => {
                const title = (item.title || "").toLowerCase();
                const cat = (item.category || "").toLowerCase();
                return title.includes(term) || cat.includes(term);
            });
            displayItems(filtered);
        });
    }
});

// Helper Function: Converts Google Sheets CSV into a format JavaScript understands
function parseCSV(csv) {
    const lines = csv.split('\n').filter(line => line.trim() !== "");
    const headers = lines[0].split(',').map(h => h.trim());
    
    return lines.slice(1).map(line => {
        // Regex to handle commas inside quotes (like in descriptions)
        const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        const obj = {};
        headers.forEach((header, i) => {
            let val = values[i] ? values[i].replace(/^"|"$/g, "").trim() : "";
            obj[header] = val;
        });
        return obj;
    });
}

window.filterMovies = function(categoryName) {
    currentPage = 1;
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
    
    if (totalPages <= 1) return;

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

    // CSV Episode Logic: Detects if the cell contains the ":" symbol
    if (pack.episodes && pack.episodes.includes(':') && epContainer) {
        if(singleContainer) singleContainer.style.display = 'none';
        
        // Split the CSV string "EP 1:url | EP 2:url" into an array
        const epList = pack.episodes.split('|').map(entry => {
            const [name, url] = entry.split(':');
            return { name: name.trim(), url: url.trim() };
        });

        epContainer.innerHTML = epList.map((ep, index) => `
            <div class="ep-wrapper" id="wrapper-${index}">
                <button class="episode-btn" onclick="handleEpisodeClick(${index}, '${ep.url}')">
                    ${ep.name}
                </button>
            </div>
        `).join('');
    } else {
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