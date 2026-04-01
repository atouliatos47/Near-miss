// ── State ──
let allReports = [];
let resolvedOpen = false;
let paretoOpen = false;
let paretoChart = null;

// ── DOM References ──
const reportsList = document.getElementById('reportsList');
const resolvedList = document.getElementById('resolvedList');
const resolvedSection = document.getElementById('resolvedSection');
const resolvedToggle = document.getElementById('resolvedToggle');
const resolvedChevron = document.getElementById('resolvedChevron');
const emptyOpen = document.getElementById('emptyOpen');
const emptyResolved = document.getElementById('emptyResolved');
const filterType = document.getElementById('filterType');
const filterDept = document.getElementById('filterDept');
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
const lightboxClose = document.getElementById('lightboxClose');
const lightboxOverlay = document.getElementById('lightboxOverlay');
const liveBadge = document.getElementById('liveBadge');

// ── Stat Counters ──
const totalCount = document.getElementById('totalCount');
const nearMissCount = document.getElementById('nearMissCount');
const observationCount = document.getElementById('observationCount');
const openCount = document.getElementById('openCount');
const resolvedCount = document.getElementById('resolvedCount');
const resolvedCountSection = document.getElementById('resolvedCountSection');

// ── Fetch All Reports on Load ──
async function fetchReports() {
    try {
        const res = await fetch('/api/observations');
        const data = await res.json();
        if (data.success) {
            allReports = data.data;
            renderAll();
        }
    } catch (err) {
        console.error('Failed to fetch reports:', err);
        reportsList.innerHTML = '<div class="loading">Connection error.</div>';
    }
}

// ── SSE Live Connection ──
function connectSSE() {
    const evtSource = new EventSource('/api/observations/events');

    evtSource.onopen = () => {
        liveBadge.style.opacity = '1';
    };

    evtSource.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.event === 'new_report') {
            allReports.unshift(msg.data);
            renderAll();
            flashCard(msg.data.id);
        }
        if (msg.event === 'report_resolved') {
            const idx = allReports.findIndex(r => r.id === msg.data.id);
            if (idx !== -1) allReports[idx].status = 'resolved';
            renderAll();
        }
    };

    evtSource.onerror = () => {
        liveBadge.style.opacity = '0.3';
    };
}

// ── Flash new card ──
function flashCard(id) {
    setTimeout(() => {
        const card = document.querySelector(`[data-id="${id}"]`);
        if (card) {
            card.style.transition = 'background 0.5s';
            card.style.background = '#f0f9e0';
            setTimeout(() => card.style.background = '', 1500);
        }
    }, 100);
}

// ── Update Stats ──
function updateStats(reports) {
    const open = reports.filter(r => r.status !== 'resolved');
    const resolved = reports.filter(r => r.status === 'resolved');

    totalCount.textContent = reports.length;
    nearMissCount.textContent = reports.filter(r => r.type === 'Near Miss').length;
    observationCount.textContent = reports.filter(r => r.type === 'Observation').length;
    openCount.textContent = open.length;
    resolvedCount.textContent = resolved.length;
    resolvedCountSection.textContent = resolved.length;
}

// ── Pareto Chart ──
function buildPareto(reports) {
    if (!paretoOpen) return;

    const deptMap = {};
    reports.forEach(r => {
        deptMap[r.department] = (deptMap[r.department] || 0) + 1;
    });

    const sorted = Object.entries(deptMap).sort((a, b) => b[1] - a[1]);
    const labels = sorted.map(([dept]) => dept);
    const counts = sorted.map(([, count]) => count);
    const total = counts.reduce((a, b) => a + b, 0);

    let cumulative = 0;
    const cumulativePct = counts.map(c => {
        cumulative += c;
        return total > 0 ? Math.round((cumulative / total) * 100) : 0;
    });

    const ctx = document.getElementById('paretoChart').getContext('2d');
    if (paretoChart) paretoChart.destroy();

    paretoChart = new Chart(ctx, {
        data: {
            labels,
            datasets: [
                {
                    type: 'bar',
                    label: 'Reports',
                    data: counts,
                    backgroundColor: 'rgba(36,53,71,0.85)',
                    borderRadius: 6,
                    borderSkipped: false,
                    yAxisID: 'y'
                },
                {
                    type: 'line',
                    label: 'Cumulative %',
                    data: cumulativePct,
                    borderColor: '#95C11F',
                    backgroundColor: 'rgba(149,193,31,0.1)',
                    borderWidth: 2.5,
                    pointBackgroundColor: '#95C11F',
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    tension: 0.3,
                    fill: true,
                    yAxisID: 'y2'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#243547',
                    titleColor: '#95C11F',
                    bodyColor: '#ffffff',
                    padding: 10,
                    cornerRadius: 8,
                    callbacks: {
                        label: ctx => ctx.dataset.type === 'line'
                            ? ` Cumulative: ${ctx.raw}%`
                            : ` Reports: ${ctx.raw}`
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#6b7c93', font: { size: 11, weight: '600' } }
                },
                y: {
                    position: 'left',
                    beginAtZero: true,
                    ticks: { stepSize: 1, color: '#6b7c93', font: { size: 11 } },
                    grid: { color: 'rgba(0,0,0,0.05)' }
                },
                y2: {
                    position: 'right',
                    beginAtZero: true,
                    max: 100,
                    ticks: { color: '#95C11F', font: { size: 11 }, callback: val => `${val}%` },
                    grid: { display: false }
                }
            }
        }
    });
}

// ── Format Date ──
function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

// ── Badge Class ──
function badgeClass(type) {
    return type === 'Near Miss' ? 'near-miss' : 'observation';
}

// ── Build Card HTML ──
function buildCard(report) {
    const cls = badgeClass(report.type);
    const resolved = report.status === 'resolved';

    return `
    <div class="report-card type-${cls} ${resolved ? 'resolved' : ''}" data-id="${report.id}">
      <div class="report-header">
        <span class="badge badge-${cls}">${report.type}</span>
        <span class="report-dept">📍 ${report.department}</span>
        <span class="report-date">🕐 ${formatDate(report.created_at)}</span>
      </div>
      <p class="report-description">${report.description}</p>
      ${report.immediate_action ? `
        <div class="report-action">
          <strong>Immediate Action:</strong> ${report.immediate_action}
        </div>` : ''}
      <div class="report-footer">
        <span class="report-reporter">
          Reported by: <span>${report.reported_by || 'Anonymous'}</span>
        </span>
        <div class="report-actions">
          ${report.photo_path ? `
            <button class="btn-photo" data-photo="${report.photo_path}">
              📷 View Photo
            </button>` : ''}
          ${resolved
            ? `<span class="resolved-tag">✅ Resolved</span>`
            : `<button class="btn-done" data-id="${report.id}">✔ Mark Done</button>`
        }
        </div>
      </div>
    </div>
  `;
}

// ── Render All ──
function renderAll() {
    const type = filterType.value;
    const dept = filterDept.value;

    const filtered = allReports.filter(r => {
        const matchType = type ? r.type === type : true;
        const matchDept = dept ? r.department === dept : true;
        return matchType && matchDept;
    });

    updateStats(filtered);
    buildPareto(filtered);

    const open = filtered.filter(r => r.status !== 'resolved');
    const resolved = filtered.filter(r => r.status === 'resolved');

    reportsList.innerHTML = open.map(buildCard).join('');
    emptyOpen.classList.toggle('hidden', open.length > 0);

    resolvedList.innerHTML = resolved.map(buildCard).join('');
    emptyResolved.classList.toggle('hidden', resolved.length > 0);

    attachListeners();
}

// ── Toggle Resolved Section ──
resolvedToggle.addEventListener('click', () => {
    resolvedOpen = !resolvedOpen;
    resolvedSection.classList.toggle('hidden', !resolvedOpen);
    resolvedToggle.classList.toggle('open', resolvedOpen);
    if (resolvedOpen) {
        setTimeout(() => {
            resolvedSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }
});

// ── Toggle Pareto ──
document.getElementById('paretoToggle').addEventListener('click', () => {
    paretoOpen = !paretoOpen;
    document.getElementById('paretoWrap').classList.toggle('hidden', !paretoOpen);
    document.getElementById('paretoChevron').style.transform = paretoOpen ? 'rotate(180deg)' : '';
    if (paretoOpen) buildPareto(allReports);
});

// ── Attach Button Listeners ──
function attachListeners() {
    document.querySelectorAll('.btn-photo').forEach(btn => {
        btn.addEventListener('click', () => openLightbox(btn.dataset.photo));
    });
    document.querySelectorAll('.btn-done').forEach(btn => {
        btn.addEventListener('click', () => markDone(btn.dataset.id));
    });
}

// ── Mark Done ──
async function markDone(id) {
    try {
        const res = await fetch(`/api/observations/${id}/resolve`, { method: 'PATCH' });
        const data = await res.json();
        if (!data.success) alert('Failed to resolve report.');
    } catch (err) {
        console.error(err);
        alert('Connection error.');
    }
}

// ── Lightbox ──
function openLightbox(photoPath) {
    lightboxImg.src = photoPath;
    lightbox.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    lightbox.classList.add('hidden');
    lightboxImg.src = '';
    document.body.style.overflow = '';
}

// ── Event Listeners ──
filterType.addEventListener('change', renderAll);
filterDept.addEventListener('change', renderAll);
lightboxClose.addEventListener('click', closeLightbox);
lightboxOverlay.addEventListener('click', closeLightbox);
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeLightbox();
});

// ── Init ──
fetchReports();
connectSSE();