// Simple Timer for Download Button
document.addEventListener("DOMContentLoaded", function() {
    let timeLeft = 10;
    const timerElement = document.getElementById('timer');
    const downloadLink = document.getElementById('download-link');
    const waitMessage = document.getElementById('wait-message');

    // Only run if the elements exist on the page
    if (timerElement) {
        const countdown = setInterval(() => {
            timeLeft--;
            timerElement.textContent = timeLeft;

            if (timeLeft <= 0) {
                clearInterval(countdown);
                waitMessage.style.display = 'none';
                downloadLink.classList.remove('hidden');
            }
        }, 1000);
    }
}); 

document.addEventListener("DOMContentLoaded", () => {
    const packGrid = document.querySelector('.pack-grid');

    // 1. Load the Packs from JSON
    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            displayPacks(data);
        });

    function displayPacks(packs) {
        packGrid.innerHTML = packs.map(pack => `
            <div class="pack-card">
                <div class="badge">${pack.category}</div>
                <div class="thumbnail">
                    <img src="${pack.thumb}" alt="${pack.title}" style="width:100%; height:100%; object-fit:cover;">
                </div>
                <div class="pack-info">
                    <h3>${pack.title}</h3>
                    <p>${pack.description}</p>
                    <a href="download-page.html?id=${pack.id}" class="download-btn">Free Download</a>
                </div>
            </div>
        `).join('');
    }
});


// Logic for the Download Page
const urlParams = new URLSearchParams(window.location.search);
const packId = urlParams.get('id');

if (packId) {
    fetch('data.json')
        .then(res => res.json())
        .then(data => {
            const pack = data.find(p => p.id === packId);
            if (pack) {
                document.querySelector('h1').textContent = pack.title;
                document.querySelector('.description p').textContent = pack.description;
                document.getElementById('download-link').href = pack.downloadUrl;
            }
        });
}



document.addEventListener("DOMContentLoaded", () => {
    const packGrid = document.querySelector('.pack-grid');
    const searchInput = document.getElementById('searchInput');
    let allPacks = []; // We will store the data here to filter it later

    // 1. Fetch the data from your JSON file
    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            allPacks = data; // Store the original list
            displayPacks(allPacks); // Show everything at first
        });

    // 2. The Search Logic
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase(); // What the user typed
            
            // Filter the packs based on Title or Category
            const filteredPacks = allPacks.filter(pack => {
                return pack.title.toLowerCase().includes(term) || 
                       pack.category.toLowerCase().includes(term);
            });

            displayPacks(filteredPacks); // Refresh the grid with matches
        });
    }

    function displayPacks(packs) {
        if (packs.length === 0) {
            packGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #94a3b8;">No packs found. Try searching for "CapCut" or "LUTs".</p>`;
            return;
        }

        packGrid.innerHTML = packs.map(pack => `
            <div class="pack-card">
                <div class="badge">${pack.category}</div>
                <div class="thumbnail">
                    <img src="${pack.thumb}" alt="${pack.title}" style="width:100%; height:100%; object-fit:cover;">
                </div>
                <div class="pack-info">
                    <h3>${pack.title}</h3>
                    <p>${pack.description}</p>
                    <a href="download-page.html?id=${pack.id}" class="download-btn">Free Download</a>
                </div>
            </div>
        `).join('');
    }
});