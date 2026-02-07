// 1. GLOBAL VARIABLES
let allItems = [];
let currentPage = 1;
const itemsPerPage = 12;

const sheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSERPcsfkyc_jZKubDvGZW3tPjmMB6ddmyA6S1c3r9BT0j5jVT2qH-MsBKf99lUs-psP0l7J0F7T7rU/pub?output=csv';

// 2. CORE INITIALIZATION
document.addEventListener("DOMContentLoaded", () => {
    const packGrid = document.querySelector('.pack-grid') || document.getElementById('movie-grid');
    const searchInput = document.getElementById('searchInput');

    // Fetch from Google Sheets
    fetch(sheetUrl)
        .then(res => res.text())
        .then(csvText => {
            allItems = parseCSV(csvText);
            
            // Homepage logic
            if (packGrid) {
                displayItems(allItems);
            }
            
            // Marquee Carousel logic
            if (document.getElementById('carousel-track')) {
                initCarousel(allItems);
            }

            // Download Page logic
            if (document.getElementById('timer') || document.getElementById('episodes-container')) {
                initDownloadPage();
            }
        })
        .catch(err => console.error("Error loading Spreadsheet Data:", err));

    // Search logic
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

// --- HELPER: CSV PARSER ---
function parseCSV(csv) {
    const lines = csv.split('\n').filter(line => line.trim() !== "");
    const headers = lines[0].split(',').map(h => h.trim());
    
    return lines.slice(1).map(line => {
        const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        const obj = {};
        headers.forEach((header, i) => {
            let val = values[i] ? values[i].replace(/^"|"$/g, "").trim() : "";
            obj[header] = val;
        });
        return obj;
    });
}

// --- RESTORED: CATEGORY FILTER ---
window.filterMovies = function(categoryName) {
    currentPage = 1;
    
    // Update active button UI
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    if (event && event.target) event.target.classList.add('active');

    const filtered = (categoryName === 'All') 
        ? allItems 
        : allItems.filter(item => item.category === categoryName);

    displayItems(filtered);
};

// --- MARQUEE CAROUSEL LOGIC ---
function initCarousel(data) {
    const track = document.getElementById('carousel-track');
    if (!track || data.length === 0) return;

    // Pick 10 movies for the marquee
    const featured = [...data].slice(0, 10);
    // Duplicate for seamless loop
    const marqueeItems = [...featured, ...featured];

    track.innerHTML = marqueeItems.map(movie => `
        <div class="carousel-slide">
            <a href="download-page.html?id=${movie.id}">
                <img src="${movie.thumb || movie.thumbnail || 'assets/default.jpg'}" alt="${movie.title}">
            </a>
        </div>
    `).join('');
}

// --- DISPLAY & PAGINATION ---
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

// --- DOWNLOAD PAGE & EPISODES ---
// --- GLOBAL VARIABLES (Keep these at the top of your file) ---
let currentEpIndex = 0;
let currentEpisodeList = [];

// --- DOWNLOAD PAGE LOGIC ---
function initDownloadPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const packId = urlParams.get('id');
    
    // Safety check for ID comparison (string vs number)
    const pack = allItems.find(p => String(p.id) === String(packId));
    if (!pack) {
        console.error("Movie/Series not found!");
        return;
    }

    // 1. SET METADATA (Title & Description)
    document.querySelector('h1').textContent = pack.title;
    const desc = document.querySelector('.description p');
    if(desc) desc.textContent = pack.description || "No description available.";

    // Target UI elements
    const epContainer = document.getElementById('episodes-container');
    const singleArea = document.getElementById('single-download-area');
    const navContainer = document.getElementById('player-navigation');

    // 2. SERIES LOGIC (Check if 'episodes' column has content)
    if (pack.episodes && pack.episodes.includes(':')) {
        if(singleArea) singleArea.style.display = 'none';
        if(navContainer) navContainer.style.display = 'flex'; // Show Next/Prev

        // Parse the Episode String (Format: Name:Link|Name:Link)
        currentEpisodeList = pack.episodes.split('|').map(entry => {
            const firstColon = entry.indexOf(':');
            return { 
                name: entry.substring(0, firstColon).trim(), 
                url: entry.substring(firstColon + 1).trim() 
            };
        });

        // Generate Episode Grid Buttons
        epContainer.innerHTML = currentEpisodeList.map((ep, index) => `
            <div class="ep-wrapper" id="wrapper-${index}">
                <button class="episode-btn" onclick="handleEpisodeClick(${index}, '${ep.url}', '${ep.name}')">
                    ${ep.name}
                </button>
            </div>
        `).join('');

        // Automatically Load and Play the First Episode
        handleEpisodeClick(0, currentEpisodeList[0].url, currentEpisodeList[0].name);

    } else {
        // 3. SINGLE MOVIE LOGIC
        if(navContainer) navContainer.style.display = 'none'; // Hide Next/Prev
        if(epContainer) epContainer.style.display = 'none';
        if(singleArea) singleArea.style.display = 'block';

        // --- THE SMART FALLBACK ---
        // Checks streamUrl first. If empty, uses downloadurl.
        const finalLink = pack.streamUrl || pack.downloadurl || "#";
        
        updateVideoPlayer(finalLink);
        startSingleTimer(finalLink);
    }
}

// HANDLER: When an episode button or "Next/Prev" is clicked
window.handleEpisodeClick = function(index, url, name) {
    currentEpIndex = index;
    
    // Update the video player
    updateVideoPlayer(url);
    
    // Refresh the Next/Prev button states (External Nav)
    renderNavUI(); 

    // Update the specific episode button below to show the timer
    const wrapper = document.getElementById(`wrapper-${index}`);
    if (wrapper) {
        let timeLeft = 10;
        wrapper.innerHTML = `<button class="episode-btn loading" disabled>Wait ${timeLeft}s</button>`;
        
        const countdown = setInterval(() => {
            timeLeft--;
            const btn = wrapper.querySelector('button');
            if(btn) btn.textContent = `Wait ${timeLeft}s`;
            
            if (timeLeft <= 0) {
                clearInterval(countdown);
                wrapper.innerHTML = `<a href="${url}" class="episode-btn download-ready" target="_blank">Download ${name}</a>`;
            }
        }, 1000);
    }
};

// HELPER: Renders the External Next/Prev buttons
function renderNavUI() {
    const nav = document.getElementById('player-navigation');
    if (!nav) return;
    
    nav.innerHTML = `
        <button class="nav-btn" onclick="changeEp(-1)" ${currentEpIndex === 0 ? 'disabled' : ''}>❮ Previous</button>
        <span class="ep-info">Playing: ${currentEpisodeList[currentEpIndex].name}</span>
        <button class="nav-btn" onclick="changeEp(1)" ${currentEpIndex === currentEpisodeList.length - 1 ? 'disabled' : ''}>Next ❯</button>
    `;
}

// HELPER: Logical step for Next/Prev
window.changeEp = function(direction) {
    const newIndex = currentEpIndex + direction;
    if (newIndex >= 0 && newIndex < currentEpisodeList.length) {
        const ep = currentEpisodeList[newIndex];
        handleEpisodeClick(newIndex, ep.url, ep.name);
    }
};

// HELPER: Updates the player HTML
function updateVideoPlayer(url) {
    const placeholder = document.getElementById('video-placeholder');
    if (!placeholder) return;

    if (url === "#") {
        placeholder.innerHTML = `<div style="padding:50px; color:gray;">No video link available.</div>`;
        return;
    }

    // Detect Embed vs Direct Video
    if (url.includes('embed') || url.includes('drive.google.com') || url.includes('youtube.com')) {
        placeholder.innerHTML = `<iframe src="${url}" frameborder="0" allowfullscreen width="100%" height="100%" style="border-radius:12px; background:#000;"></iframe>`;
    } else {
        placeholder.innerHTML = `
            <video controls autoplay width="100%" style="max-height:450px; border-radius:12px; background:#000;">
                <source src="${url}" type="video/mp4">
                Your browser does not support the video tag.
            </video>`;
    }
}

// HANDLER: Timer for Single Movie download button
function startSingleTimer(url) {
    const timerElement = document.getElementById('timer');
    const downloadLink = document.getElementById('download-link');
    if (!timerElement) return;

    let timeLeft = 10;
    const countdown = setInterval(() => {
        timeLeft--;
        timerElement.textContent = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(countdown);
            if(downloadLink) {
                downloadLink.classList.remove('hidden');
                downloadLink.href = url;
            }
            const waitMsg = document.getElementById('wait-message');
            if(waitMsg) waitMsg.style.display = 'none';
        }
    }, 1000);
}