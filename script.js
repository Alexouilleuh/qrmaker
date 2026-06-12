// ==========================================================
// QRafty Clone - Générateur de QR Code avec tracking
// ==========================================================

const REDIRECT_BASE = window.location.origin + window.location.pathname.replace(/index\.html$/, '') + 'r/index.html';
// CounterAPI v2 (https://counterapi.dev) - service de compteurs gratuit, actif en 2025+
const COUNTER_WORKSPACE = 'qrgen-tracker-v1';
const COUNTER_API_BASE = 'https://api.counterapi.dev/v2';

const urlInput = document.getElementById('urlInput');
const fgColor = document.getElementById('fgColor');
const fgColorText = document.getElementById('fgColorText');
const bgColor = document.getElementById('bgColor');
const bgColorText = document.getElementById('bgColorText');
const transparentBg = document.getElementById('transparentBg');
const errorLevel = document.getElementById('errorLevel');
const enableTracking = document.getElementById('enableTracking');
const generateBtn = document.getElementById('generateBtn');
const qrPreview = document.getElementById('qrPreview');
const downloadPng = document.getElementById('downloadPng');
const downloadSvg = document.getElementById('downloadSvg');
const trackingInfo = document.getElementById('trackingInfo');
const trackingLink = document.getElementById('trackingLink');
const historyBody = document.getElementById('historyBody');
const historyTable = document.getElementById('historyTable');
const historyEmpty = document.getElementById('historyEmpty');

let currentSvgString = '';
let currentEntry = null;

// --- Sync color pickers with text inputs ---
function syncColor(colorEl, textEl) {
  colorEl.addEventListener('input', () => {
    textEl.value = colorEl.value;
    updatePreviewColors();
  });
  textEl.addEventListener('input', () => {
    if (/^#[0-9A-Fa-f]{6}$/.test(textEl.value)) {
      colorEl.value = textEl.value;
      updatePreviewColors();
    }
  });
}
syncColor(fgColor, fgColorText);
syncColor(bgColor, bgColorText);

transparentBg.addEventListener('change', () => {
  bgColor.disabled = transparentBg.checked;
  bgColorText.disabled = transparentBg.checked;
  updatePreviewColors();
});

// Update only the colors of the currently displayed SVG, without
// regenerating the QR pattern or touching the tracking link/history.
function updatePreviewColors() {
  if (!currentSvgString) return;

  const fg = fgColorText.value;
  const bg = bgColorText.value;
  const isTransparent = transparentBg.checked;

  const svgEl = qrPreview.querySelector('svg');
  if (!svgEl) return;

  const path = svgEl.querySelector('path');
  if (path) path.setAttribute('fill', fg);

  let rect = svgEl.querySelector('rect');
  if (isTransparent) {
    if (rect) rect.remove();
  } else {
    if (!rect) {
      rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('width', svgEl.getAttribute('width'));
      rect.setAttribute('height', svgEl.getAttribute('height'));
      svgEl.insertBefore(rect, svgEl.firstChild);
    }
    rect.setAttribute('fill', bg);
  }

  // Keep the exportable SVG string in sync with the live preview
  currentSvgString = svgEl.outerHTML;
}

// --- localStorage history ---
const STORAGE_KEY = 'qrafty_history';

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveHistory(history) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

function genId() {
  return 'q' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// --- QR generation using qrcode-generator lib, output as SVG string ---
function buildQrSvg(text, fg, bg, transparent, ecLevel) {
  const qr = qrcode(0, ecLevel); // typeNumber 0 = auto
  qr.addData(text);
  qr.make();

  const moduleCount = qr.getModuleCount();
  const cellSize = 10; // base unit, scaled via viewBox
  const size = moduleCount * cellSize;

  let path = '';
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (qr.isDark(row, col)) {
        const x = col * cellSize;
        const y = row * cellSize;
        path += `M${x},${y}h${cellSize}v${cellSize}h-${cellSize}z`;
      }
    }
  }

  const bgRect = transparent
    ? ''
    : `<rect width="${size}" height="${size}" fill="${bg}"/>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" shape-rendering="crispEdges">${bgRect}<path d="${path}" fill="${fg}"/></svg>`;

  return svg;
}

// --- Generate ---
generateBtn.addEventListener('click', () => {
  const rawUrl = urlInput.value.trim();

  if (!rawUrl) {
    alert('Veuillez saisir une URL.');
    return;
  }

  let validUrl;
  try {
    validUrl = new URL(rawUrl);
  } catch {
    alert('URL invalide. Assurez-vous d\'inclure http:// ou https://');
    return;
  }

  const fg = fgColorText.value;
  const bg = bgColorText.value;
  const isTransparent = transparentBg.checked;
  const ec = errorLevel.value;
  const tracking = enableTracking.checked;

  let encodedTarget = validUrl.toString();
  let entry = null;

  if (tracking) {
    const id = genId();
    const trackUrl = REDIRECT_BASE + '?id=' + encodeURIComponent(id) + '&to=' + encodeURIComponent(validUrl.toString());
    encodedTarget = trackUrl;

    entry = {
      id,
      url: validUrl.toString(),
      trackUrl,
      createdAt: new Date().toISOString(),
      scans: 0
    };

    const history = loadHistory();
    history.unshift(entry);
    saveHistory(history);
    renderHistory();

    trackingLink.textContent = trackUrl;
    trackingInfo.classList.remove('hidden');

    // Touch the counter so it exists (CounterAPI creates it on first read,
    // without incrementing, when using the GET endpoint).
    fetch(`${COUNTER_API_BASE}/${COUNTER_WORKSPACE}/${encodeURIComponent(id)}`)
      .catch(() => { /* non-blocking */ });
  } else {
    trackingInfo.classList.add('hidden');
  }

  currentEntry = entry;

  const svgString = buildQrSvg(encodedTarget, fg, bg, isTransparent, ec);
  currentSvgString = svgString;

  qrPreview.innerHTML = svgString;

  downloadPng.disabled = false;
  downloadSvg.disabled = false;
});

// --- Download SVG ---
downloadSvg.addEventListener('click', () => {
  if (!currentSvgString) return;
  const blob = new Blob([currentSvgString], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'qrcode.svg';
  a.click();
  URL.revokeObjectURL(url);
});

// --- Download PNG (min 2000x2000) ---
downloadPng.addEventListener('click', () => {
  if (!currentSvgString) return;

  const size = 2000;
  const img = new Image();
  const svgBlob = new Blob([currentSvgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  img.onload = () => {
    const canvas = document.getElementById('renderCanvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(img, 0, 0, size, size);
    URL.revokeObjectURL(url);

    canvas.toBlob((blob) => {
      const pngUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = 'qrcode.png';
      a.click();
      URL.revokeObjectURL(pngUrl);
    }, 'image/png');
  };

  img.onerror = () => {
    alert('Erreur lors de la génération du PNG.');
    URL.revokeObjectURL(url);
  };

  img.src = url;
});

// --- History rendering ---
async function fetchScanCounts() {
  const history = loadHistory();
  if (history.length === 0) return;

  let changed = false;

  await Promise.all(history.map(async (h) => {
    try {
      const res = await fetch(`${COUNTER_API_BASE}/${COUNTER_WORKSPACE}/${encodeURIComponent(h.id)}`);
      if (!res.ok) return;
      const data = await res.json();
      // CounterAPI v2 returns { data: { up_count, down_count, count, ... } }
      const value = data?.data?.up_count ?? data?.data?.count;
      if (typeof value === 'number' && value !== h.scans) {
        h.scans = value;
        changed = true;
      }
    } catch {
      // ignore network errors, keep last known value
    }
  }));

  if (changed) {
    saveHistory(history);
    renderHistory();
  }
}

function renderHistory() {
  const history = loadHistory();

  if (history.length === 0) {
    historyEmpty.classList.remove('hidden');
    historyTable.classList.add('hidden');
    return;
  }

  historyEmpty.classList.add('hidden');
  historyTable.classList.remove('hidden');

  historyBody.innerHTML = history.map(h => {
    const date = new Date(h.createdAt).toLocaleString('fr-FR');
    return `<tr>
      <td><a href="${h.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(h.url)}</a></td>
      <td>${date}</td>
      <td><a href="${h.trackUrl}" target="_blank" rel="noopener noreferrer">${escapeHtml(h.trackUrl)}</a></td>
      <td class="scans">${h.scans}</td>
      <td><button class="delete-btn" data-id="${h.id}">Supprimer</button></td>
    </tr>`;
  }).join('');

  historyBody.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const updated = loadHistory().filter(h => h.id !== id);
      saveHistory(updated);
      renderHistory();
    });
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// --- Init ---
renderHistory();
fetchScanCounts();
setInterval(fetchScanCounts, 15000); // refresh scan counts every 15s
