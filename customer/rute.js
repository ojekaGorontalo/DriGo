// ==================== KONFIGURASI ==================== 

console.log('🚀 JeGo - Rute Customer (Google Maps)');

const FIREBASE_CONFIG = {
    apiKey: "AIzaSyCD0pgeZio-LdKqYDtWxcdXcZwyL4ngYQI",
    authDomain: "jego-35a2b.firebaseapp.com",
    databaseURL: "https://jego-35a2b-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "jego-35a2b",
    storageBucket: "jego-35a2b.firebasestorage.app",
    messagingSenderId: "600037007040",
    appId: "1:600037007040:web:ac3243ad9b472647ffd725"
};

if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
const auth = firebase.auth();
const database = firebase.database();

// ==================== GLOBAL VARIABLES ====================
let map;
let currentUser = null;
let currentRoute = null;
let pickupCoord = null, destCoord = null;
let pickupAddress = '', destAddress = '';
let viaCoord = null;
let viaAddress = '';
let viaMarker = null;

let pickupMarker = null, destMarker = null;
let selectedTransport = null;
let transportType = null;
let transportIconUrl = '';
let deliveryData = null;
let isCourier = false;
let transportRate = { minimal_distance: 4, minimal_price: 10000, price_per_km: 2200 };
let currentPrice = 0;
let currentOrderId = null;
let orderRef = null, offersRef = null;
let orderStatusCallback = null, offersCallback = null;
let isSearching = false;
let offerTimerInterval = null;
let cleanupInterval = null;
let mapPickActive = false;
let mapPickCoords = null;
let mapPickAddress = '';
let mapPickResolveTimer = null;
let searchOverlayMode = 'pickup';
let pickFromMapActive = false;
let searchTimeout = null;
let minAllowedNego = 0;
let mapIdleTimer = null;

// Timer bidding (2 menit)
let bsTimerInterval = null;
let bsTimerSecondsLeft = 120;
const BS_TIMER_DURATION = 120;  // 2 menit = 120 detik

// ⬇️ BARU: State tombol konfirmasi — user harus mengubah tarif dulu
let tariffChanged = false;

// Data kendaraan
let transportData = {};
let tariffRates = {};
// ⬇️ HANYA 3 KENDARAAN (kurir dihilangkan)
const transportNameMapping = {
    'Motor': 'motor',
    'JeGo Ride': 'motor',
    'Bentor': 'bentor',
    'JeGo Trike': 'bentor',
    'Mobil': 'mobil',
    'JeGo Car': 'mobil'
};
const SEARCH_HISTORY_KEY = 'jego_search_history';
const MAX_HISTORY = 10;
let selectedVehicleType = null;

// Google Maps services
let geocoder;
let directionsService;
let directionsRenderer;
let autocompleteService = null;

// Cache
let searchCache = {};
let placeDetailsCache = {};
let searchAbortController = null;

// Nearby drivers via geohash
let nearbyDriversRefs = [];
let nearbyDriversListeners = [];

// ==================== GEOHASH GRID ====================
const GRID_PRECISION = 100;
const MAX_AGE_MS = 5 * 60 * 1000;

function getGridKey(lat, lng) {
    const gridLat = Math.round(lat * GRID_PRECISION);
    const gridLng = Math.round(lng * GRID_PRECISION);
    return `${gridLat}_${gridLng}`;
}

function getNeighborGrids(lat, lng) {
    const baseLat = Math.round(lat * GRID_PRECISION);
    const baseLng = Math.round(lng * GRID_PRECISION);
    const grids = [];
    for (let dLat = -1; dLat <= 1; dLat++) {
        for (let dLng = -1; dLng <= 1; dLng++) {
            grids.push(`${baseLat + dLat}_${baseLng + dLng}`);
        }
    }
    return grids;
}

// ==================== DARK MAP STYLE ====================
const darkMapStyle = [
    { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
    { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
    { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
    { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
    { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b9a76" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
    { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
    { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
    { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
    { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3d19c" }] },
    { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
    { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
    { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
    { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] }
];

// ==================== LOAD GOOGLE MAPS ====================
function loadGoogleMaps(apiKey) {
    return new Promise((resolve, reject) => {
        if (typeof google !== 'undefined' && google.maps) {
            console.log('✅ Google Maps sudah termuat sebelumnya');
            resolve();
            return;
        }
        window.initMap = function() {
            console.log('✅ Google Maps callback initMap dipanggil');
            initializeMap();
            resolve();
        };
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initMap`;
        script.async = true;
        script.defer = true;
        script.onerror = () => {
            console.error('❌ Gagal memuat Google Maps');
            reject(new Error('Gagal memuat Google Maps'));
        };
        document.head.appendChild(script);
    });
}

// ==================== INISIALISASI PETA ====================
function initializeMap() {
    if (window.initMapDone) {
        console.log('⚠️ Peta sudah diinisialisasi, lewati.');
        return;
    }
    console.log('🗺️ initializeMap() dipanggil');
    
    const isDark = localStorage.getItem('jego_dark_mode') === 'true';
    const mapOptions = {
        center: { lat: 0.5435, lng: 123.0580 },
        zoom: 12,
        mapTypeId: 'roadmap',
        styles: isDark ? darkMapStyle : [],
        zoomControl: true,
        zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
        fullscreenControl: false,
        mapTypeControl: false,
        streetViewControl: false,
        rotateControl: false,
        scaleControl: false,
        clickableIcons: false
    };
    map = new google.maps.Map(document.getElementById('map'), mapOptions);
    console.log('✅ Google Maps berhasil diinisialisasi');

    geocoder = new google.maps.Geocoder();
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({
        map: map,
        suppressMarkers: true,
        polylineOptions: {
            strokeColor: '#FF9800',
            strokeWeight: 5,
            strokeOpacity: 0.8
        }
    });
    window.directionsRenderer = directionsRenderer;

    map.addListener('click', async (e) => {
        if (!pickFromMapActive) return;
        pickFromMapActive = false;
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        let address = await reverseGeocode(lng, lat);
        if (!address || address.trim() === '') address = '(Titik di peta)';
        const feature = { geometry: { coordinates: [lng, lat] }, properties: { full_address: address, name: address.split(',')[0] } };
        selectAddress(feature);
        showToast('📍 Lokasi dipilih dari peta', 'success');
    });

    initAutocompleteService();
    window.initMapDone = true;
}

// ==================== UTILITY ====================
function showPopup(title, message, onClose = null) {
    document.getElementById('popupTitle').innerText = title;
    document.getElementById('popupMessage').innerHTML = message;
    const overlay = document.getElementById('popupOverlay');
    overlay.classList.add('active');
    const close = () => {
        overlay.classList.remove('active');
        if (onClose) onClose();
        document.getElementById('popupButton').removeEventListener('click', close);
    };
    document.getElementById('popupButton').addEventListener('click', close);
}

function formatRupiah(amount) {
    return 'Rp ' + amount.toLocaleString('id-ID');
}

function formatTimer(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function calculatePrice(distanceMeters) {
    const distanceKm = distanceMeters / 1000;
    let price = 0;
    if (distanceKm <= transportRate.minimal_distance) {
        price = transportRate.minimal_price;
    } else {
        const extraKm = distanceKm - transportRate.minimal_distance;
        price = transportRate.minimal_price + (extraKm * transportRate.price_per_km);
    }
    return Math.round(price / 1000) * 1000;
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}

function showToast(message, type = 'info') {
    const existingToast = document.querySelector('.custom-toast');
    if (existingToast) existingToast.remove();
    const toast = document.createElement('div');
    toast.className = 'custom-toast';
    toast.innerText = message;
    toast.style.cssText = `
        position: fixed; bottom: 380px; left: 50%; transform: translateX(-50%);
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#FF9800'};
        color: white; padding: 10px 20px; border-radius: 30px; font-size: 14px;
        font-weight: 600; z-index: 10001; box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        white-space: nowrap; max-width: 90%; text-align: center;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
}

function getVehicleEmoji(vehicleType) {
    const t = (vehicleType || '').toLowerCase();
    if (t.includes('mobil')) return '🚗';
    if (t.includes('bentor')) return '🛺';
    if (t.includes('kurir')) return '📦';
    return '🏍️';
}

function getDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLon/2)**2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// ==================== HITUNG MIN TAWARAN ====================
function hitungMinTawaran(hargaAsli) {
    const minimalPrice = transportRate.minimal_price || 10000;
    let minAllowed = hargaAsli - (hargaAsli * 0.1);
    if (minAllowed < minimalPrice) minAllowed = minimalPrice;
    return Math.round(minAllowed / 1000) * 1000;
}

// ==================== BARU: STATE TOMBOL KONFIRMASI ====================
function updateConfirmButtonState() {
    const confirmBtn = document.getElementById('confirmBtn');
    const negoInput = document.getElementById('negoInput');
    if (!confirmBtn) return;
    if (!negoInput) { confirmBtn.disabled = true; return; }
    const val = parseInt(negoInput.value) || 0;
    const isValid = val > 0 && val >= minAllowedNego;
    // Tombol hanya aktif kalau user SUDAH mengubah tarif DAN tawarannya valid
    confirmBtn.disabled = !(tariffChanged && isValid);
}

function updateAutoAcceptPriceLabels(price) {
    const fmt = formatRupiah(price || 0);
    const el1 = document.getElementById('autoAcceptPrice');
    const el2 = document.getElementById('autoAcceptPriceBidding');
    if (el1) el1.innerText = fmt;
    if (el2) el2.innerText = fmt;
}

// ==================== TAMPILKAN ADDRESS CARD ====================
function showAddressCard() {
    const card = document.getElementById('addressCard');
    if (card) card.style.display = '';
}

// ==================== TIMER BIDDING (2 MENIT) ====================
function startBiddingTimer() {
    clearBiddingTimer();
    bsTimerSecondsLeft = BS_TIMER_DURATION;

    const timerEl = document.getElementById('bsTimer');
    const progressEl = document.getElementById('bsProgressFill');
    const confirmBtn = document.getElementById('confirmBtn');
    const retryBtn = document.getElementById('retryBtn');

    // Pastikan tombol konfirmasi terlihat & retry tersembunyi
    if (confirmBtn) confirmBtn.style.display = '';
    if (retryBtn) retryBtn.style.display = 'none';

    function updateDisplay() {
        if (timerEl) timerEl.textContent = formatTimer(bsTimerSecondsLeft);
        if (progressEl) {
            const pct = (bsTimerSecondsLeft / BS_TIMER_DURATION) * 100;
            progressEl.style.width = pct + '%';
        }
    }

    updateDisplay();

    bsTimerInterval = setInterval(() => {
        bsTimerSecondsLeft--;
        if (bsTimerSecondsLeft <= 0) {
            bsTimerSecondsLeft = 0;
            updateDisplay();
            clearBiddingTimer();
            onBiddingTimeout();
            return;
        }
        updateDisplay();
    }, 1000);

    console.log('⏱️ Timer bidding dimulai: 2:00');
}

function clearBiddingTimer() {
    if (bsTimerInterval) {
        clearInterval(bsTimerInterval);
        bsTimerInterval = null;
        console.log('⏱️ Timer bidding dihentikan');
    }
}

async function onBiddingTimeout() {
    console.log('⏰ Waktu bidding habis');

    // Tandai order sebagai timeout (supaya driver berhenti mencari)
    if (currentOrderId) {
        try {
            await database.ref(`orders/${currentOrderId}`).update({
                status: 'timeout',
                timeout_at: new Date().toISOString()
            });
        } catch (e) {
            console.error('❌ Gagal update status timeout:', e);
        }
    }

    // Sembunyikan tombol konfirmasi, tampilkan tombol "Cari lagi"
    const confirmBtn = document.getElementById('confirmBtn');
    const retryBtn = document.getElementById('retryBtn');
    if (confirmBtn) confirmBtn.style.display = 'none';
    if (retryBtn) retryBtn.style.display = 'block';

    showToast('⏰ Waktu habis. Klik "Cari lagi" untuk mencari driver.', 'error');
}

function resetBiddingUI() {
    const timerEl = document.getElementById('bsTimer');
    const progressEl = document.getElementById('bsProgressFill');
    const confirmBtn = document.getElementById('confirmBtn');
    const retryBtn = document.getElementById('retryBtn');
    if (timerEl) timerEl.textContent = formatTimer(BS_TIMER_DURATION);
    if (progressEl) progressEl.style.width = '100%';
    if (confirmBtn) confirmBtn.style.display = '';
    if (retryBtn) retryBtn.style.display = 'none';
    bsTimerSecondsLeft = BS_TIMER_DURATION;

    // ⬇️ BARU: reset state tombol konfirmasi
    tariffChanged = false;
    updateConfirmButtonState();
}

// ==================== BOTTOM SHEET DRAG ====================
function initBottomSheetDrag() {
    const sheet = document.getElementById('bottomSheet');
    if (!sheet) return;

    let startY = 0;
    let currentY = 0;
    let dragging = false;
    let sheetDragMode = false;
    let activeScrollable = null;

    function getScrollable(target) {
        return target && target.closest ? target.closest('.bs-view') : null;
    }

    function onStart(y, target) {
        startY = y;
        currentY = y;
        dragging = true;
        activeScrollable = getScrollable(target);

        if (!activeScrollable || activeScrollable.scrollTop <= 0) {
            sheetDragMode = true;
        } else {
            sheetDragMode = false;
        }
    }

    function onMove(y, evt) {
        if (!dragging) return;
        currentY = y;
        const deltaY = y - startY;

        if (!sheetDragMode && activeScrollable) {
            if (activeScrollable.scrollTop <= 0 && deltaY < 0) {
                sheetDragMode = true;
                startY = y;
                currentY = y;
            }
        }

        if (sheetDragMode && evt && evt.cancelable) {
            evt.preventDefault();
        }
    }

    function onEnd() {
        if (!dragging) return;
        dragging = false;

        if (sheetDragMode) {
            const deltaY = currentY - startY;
            const isExpanded = sheet.classList.contains('expanded');

            if (isExpanded) {
                if (deltaY > 40) sheet.classList.remove('expanded');
            } else {
                if (deltaY < -40) sheet.classList.add('expanded');
            }
        }

        startY = 0;
        currentY = 0;
        sheetDragMode = false;
        activeScrollable = null;
    }

    sheet.addEventListener('touchstart', (e) => {
        onStart(e.touches[0].clientY, e.target);
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
        if (!dragging) return;
        onMove(e.touches[0].clientY, e);
    }, { passive: false });

    document.addEventListener('touchend', () => {
        if (dragging) onEnd();
    }, { passive: true });

    document.addEventListener('touchcancel', () => {
        if (dragging) onEnd();
    }, { passive: true });

    sheet.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        onStart(e.clientY, e.target);
    });
    document.addEventListener('mousemove', (e) => {
        if (!dragging) return;
        onMove(e.clientY, e);
    });
    document.addEventListener('mouseup', () => {
        if (dragging) onEnd();
    });
}

// ==================== MODE SWITCH ====================
function switchToPickerMode() {
    const sheet = document.getElementById('bottomSheet');
    if (!sheet) return;
    sheet.classList.remove('expanded');
    sheet.classList.remove('mode-bidding');
    document.body.classList.remove('mode-bidding');
    const addrCard = document.getElementById('addressCard');
    if (addrCard) addrCard.style.display = '';
    // Reset tampilan bidding
    resetBiddingUI();
}

function switchToBiddingMode() {
    const sheet = document.getElementById('bottomSheet');
    if (!sheet) return;

    // Cek apakah SEBELUMNYA sudah dalam mode bidding
    const wasBidding = sheet.classList.contains('mode-bidding');

    sheet.classList.remove('expanded');
    sheet.classList.add('mode-bidding');
    document.body.classList.add('mode-bidding');
    const addrCard = document.getElementById('addressCard');
    if (addrCard) addrCard.style.display = 'none';

    // Sync harga dari picker → negoInput HANYA saat transisi picker → bidding
    // (kalau sudah bidding, JANGAN sync, agar harga yang diubah user via +/− tidak ke-reset)
    if (!wasBidding) {
        const pickerOffer = document.getElementById('pickerOfferInput');
        const negoInput   = document.getElementById('negoInput');
        if (pickerOffer && negoInput && pickerOffer.value) {
            negoInput.value = pickerOffer.value;
            negoInput.dispatchEvent(new Event('input'));
        }
    }

    // ⬇️ BARU: pastikan tombol konfirmasi dalam state yang benar
    updateConfirmButtonState();
}

function updatePickerVehicleCard() {
    const t = transportData[transportType] || {};
    const iconEl = document.getElementById('pickerVehicleIcon');
    const nameEl = document.getElementById('pickerVehicleName');
    const capEl = document.getElementById('pickerVehicleCap');
    const descEl = document.getElementById('pickerVehicleDesc');
    if (iconEl) iconEl.src = t.icon || 'https://cdn-icons-png.flaticon.com/128/5811/5811823.png';
    if (nameEl) nameEl.textContent = t.name || 'Motor';
    if (capEl) capEl.textContent = '👤 ' + (t.capacity || '1 Penumpang');
    if (descEl) descEl.textContent = t.description || 'Tanpa macet, harga hemat';
}

// ==================== UPDATE PICKER PRICE ====================
function updatePickerPrice() {
    const card       = document.getElementById('pickerPriceCard');
    const priceVal   = document.getElementById('pickerPriceValue');
    const minVal     = document.getElementById('pickerMinPriceValue');
    const offerInput = document.getElementById('pickerOfferInput');
    const autoAcceptPrice = document.getElementById('autoAcceptPrice');
    if (!card || !priceVal || !minVal) return;

    if (currentRoute && currentRoute.price > 0) {
        card.style.display = 'block';
        priceVal.textContent = formatRupiah(currentRoute.price);

        // ⬇️ Update label harga auto-accept juga (2 tempat)
        updateAutoAcceptPriceLabels(currentRoute.price);

        const minAllowed = hitungMinTawaran(currentRoute.price);
        minAllowedNego = minAllowed;
        minVal.textContent = formatRupiah(minAllowed);

        if (offerInput) {
            if (!offerInput.value || parseInt(offerInput.value) <= 0) {
                offerInput.value = currentRoute.price;
                currentPrice = currentRoute.price;
            }
            offerInput.min = minAllowed;
        }
    } else {
        card.style.display = 'none';
    }
}

function updatePickerAddresses() {
    const pText = document.getElementById('pickerPickupText');
    const dText = document.getElementById('pickerDestText');
    const vText = document.getElementById('pickerViaText');
    const vRow  = document.getElementById('pickerViaRow');
    const durEl = document.getElementById('pickerDuration');

    if (pText) pText.textContent = pickupAddress || '-';
    if (dText) dText.textContent = destAddress || '-';

    if (vRow && vText) {
        if (viaAddress && viaCoord) {
            vText.textContent = viaAddress;
            vRow.style.display = 'flex';
        } else {
            vText.textContent = '-';
            vRow.style.display = 'none';
        }
    }

    if (durEl && currentRoute) {
        durEl.textContent = '~ ' + Math.round(currentRoute.duration / 60) + ' mnt';
    }
    updatePickerPrice();
}

// ==================== NEARBY DRIVERS ====================
function startShowingNearbyDrivers(pickupLat, pickupLng, radiusKm = 3) {
    console.log(`📡 [NearbyDrivers] Mulai memantau via geohash, radius ${radiusKm}km`);
    stopShowingNearbyDrivers();

    const grids = getNeighborGrids(pickupLat, pickupLng);
    console.log(`📡 [NearbyDrivers] Query ${grids.length} grid:`, grids);

    grids.forEach(gridKey => {
        const ref = database.ref(`driver_geohash/${gridKey}`);
        const listener = ref.on('value', (snapshot) => {
            renderNearbyDriversFromGeohash(pickupLat, pickupLng, radiusKm);
        });
        nearbyDriversRefs.push(ref);
        nearbyDriversListeners.push(listener);
    });
}

// ==================== FILTER KENDARAAN ====================
// ⬇️ BARU: Cek apakah driver cocok dengan kendaraan yang dipilih customer
function isDriverMatchesVehicle(driverType, orderType) {
    if (!driverType || !orderType) return false;
    driverType = String(driverType).toLowerCase().trim();
    orderType = String(orderType).toLowerCase().trim();
    if (driverType === orderType) return true;
    // Alias kurir (opsional, jaga-jaga)
    if (orderType === 'kurir_motor' && driverType === 'motor') return true;
    if (orderType === 'kurir_bentor' && driverType === 'bentor') return true;
    return false;
}
// ==========================================================

async function renderNearbyDriversFromGeohash(pickupLat, pickupLng, radiusKm) {
    try {
        const allUids = new Set();
        for (const gridKey of getNeighborGrids(pickupLat, pickupLng)) {
            const snap = await database.ref(`driver_geohash/${gridKey}`).once('value');
            const ids = Object.keys(snap.val() || {});
            ids.forEach(id => allUids.add(id));
        }

        console.log(`📡 [NearbyDrivers] ${allUids.size} UID di 9 grid`);

        if (allUids.size === 0) {
            renderNearbyDrivers([]);
            return;
        }

        const now = Date.now();
        const drivers = [];

        const snapshots = await Promise.all(
            Array.from(allUids).map(uid => database.ref(`driver_locations/${uid}`).once('value'))
        );

        for (const snap of snapshots) {
            const uid = snap.ref.key;
            const d = snap.val();
            if (!d) continue;
            if (d.tracking_enabled !== true) continue;
            if (!d.latitude || !d.longitude) continue;

            const dist = getDistanceKm(pickupLat, pickupLng, d.latitude, d.longitude);
            if (dist > radiusKm) continue;

            // ⬇️ BARU: Filter kendaraan sesuai yang dipilih customer
            const driverVeh = d.vehicleType || d.vehicle_type || 'motor';
            if (transportType && !isDriverMatchesVehicle(driverVeh, transportType)) continue;

            drivers.push({
                uid,
                distance: dist,
                vehicleType: driverVeh
            });
        }

        drivers.sort((a, b) => a.distance - b.distance);
        console.log(`📡 [NearbyDrivers] ${drivers.length} driver SIAP (kendaraan: ${transportType || 'semua'})`);
        renderNearbyDrivers(drivers);
    } catch (err) {
        console.error('❌ [NearbyDrivers] Error:', err.message);
    }
}

function renderNearbyDrivers(drivers) {
    const countEl = document.getElementById('nearbyDriverCount');
    const iconsRow = document.getElementById('nearbyDriverIcons');
    if (!iconsRow || !countEl) return;

    countEl.textContent = drivers.length;

    if (drivers.length === 0) {
        iconsRow.innerHTML = '<div class="nearby-empty">🚫 Belum ada pengemudi</div>';
        return;
    }

    const MAX_ICONS = 5;
    const shown = drivers.slice(0, MAX_ICONS);
    const remaining = drivers.length - shown.length;

    let html = shown.map((d, idx) => {
        const emoji = getVehicleEmoji(d.vehicleType);
        return `<div class="nearby-driver-icon" title="Pengemudi ${idx + 1}">${emoji}</div>`;
    }).join('');

    if (remaining > 0) {
        html += `<div class="nearby-driver-icon more-indicator" title="${remaining} lainnya">+${remaining}</div>`;
    }

    iconsRow.innerHTML = html;
}

function stopShowingNearbyDrivers() {
    if (nearbyDriversRefs.length && nearbyDriversListeners.length) {
        nearbyDriversRefs.forEach((ref, idx) => {
            const listener = nearbyDriversListeners[idx];
            if (ref && listener) ref.off('value', listener);
        });
        console.log('📡 [NearbyDrivers] Semua listener dihentikan');
    }
    nearbyDriversRefs = [];
    nearbyDriversListeners = [];
}

// ==================== SMOOTH ZOOM ANIMATION ====================
function smoothZoomTo(targetLat, targetLng, targetZoom, duration = 1000, callback = null) {
    if (!map) {
        if (callback) callback();
        return;
    }

    // Pindahkan pusat peta dulu (instant)
    map.setCenter({ lat: targetLat, lng: targetLng });

    const startZoom = map.getZoom();
    if (startZoom === targetZoom) {
        if (callback) callback();
        return;
    }

    const totalSteps = Math.abs(targetZoom - startZoom);
    const stepDuration = Math.max(50, duration / totalSteps);
    const direction = targetZoom > startZoom ? 1 : -1;
    let current = startZoom;

    const interval = setInterval(() => {
        current += direction;
        map.setZoom(current);
        if (current === targetZoom) {
            clearInterval(interval);
            if (callback) callback();
        }
    }, stepDuration);
}

// ==================== SEARCH HISTORY ====================
function getSearchHistory() {
    try {
        const data = localStorage.getItem(SEARCH_HISTORY_KEY);
        return data ? JSON.parse(data) : [];
    } catch(e) { return []; }
}

function addSearchHistory(address, lng, lat) {
    let history = getSearchHistory();
    history = history.filter(item => item.address !== address);
    history.unshift({ address, lng, lat, timestamp: Date.now() });
    if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
}

function renderHistoryList() {
    const container = document.getElementById('searchHistoryList');
    const title = document.getElementById('historyTitle');
    const history = getSearchHistory();
    if (history.length === 0) {
        container.innerHTML = '';
        title.style.display = 'none';
        return;
    }
    title.style.display = 'block';
    container.innerHTML = history.map((item, index) => `
        <div class="search-option-item history-item" data-index="${index}" data-address="${escapeHtml(item.address)}" data-lng="${item.lng}" data-lat="${item.lat}">
            <div class="search-option-icon history">🕐</div>
            <div class="search-option-text">${escapeHtml(item.address)}</div>
        </div>
    `).join('');
    container.querySelectorAll('.history-item').forEach(el => {
        el.addEventListener('click', () => {
            const address = el.getAttribute('data-address');
            const lng = parseFloat(el.getAttribute('data-lng'));
            const lat = parseFloat(el.getAttribute('data-lat'));
            selectAddressFromHistory(address, lng, lat);
        });
    });
}

function selectAddressFromHistory(address, lng, lat) {
    const feature = {
        geometry: { coordinates: [lng, lat] },
        properties: { full_address: address, name: address.split(',')[0] }
    };
    selectAddress(feature);
}

// ==================== NEGOSIASI ====================
function initNegosiasi(originalPriceVal) {
    const minAllowed = hitungMinTawaran(originalPriceVal);
    minAllowedNego = minAllowed;

    // ⬇️ BARU: reset dirty state saat harga baru dihitung
    tariffChanged = false;

    const input = document.getElementById('negoInput');
    const minTawarLabel = document.getElementById('minTawarLabel');
    const minErrorVal = document.getElementById('minErrorVal2');
    const labelRekomendasi = document.getElementById('labelRekomendasi');
    const autoAcceptPrice = document.getElementById('autoAcceptPrice');

    if (minTawarLabel) minTawarLabel.innerText = formatRupiah(minAllowed);
    if (minErrorVal) minErrorVal.innerText = formatRupiah(minAllowed);
    if (labelRekomendasi) labelRekomendasi.innerText = formatRupiah(originalPriceVal);

    // ⬇️ BARU: update label harga auto-accept di kedua tempat
    updateAutoAcceptPriceLabels(originalPriceVal);

    if (input) {
        if (!input.value || parseInt(input.value) <= 0) {
            input.value = originalPriceVal;
            currentPrice = originalPriceVal;
        }

        input.removeEventListener('input', handleNegoInput);
        input.addEventListener('input', handleNegoInput);
    }

    updatePickerPrice();

    // ⬇️ BARU: tombol konfirmasi disabled sampai user ubah tarif
    updateConfirmButtonState();
}

function handleNegoInput() {
    const input = document.getElementById('negoInput');
    const val = input.value.trim();
    const negoError = document.getElementById('negoError');

    if (val === '' || isNaN(parseInt(val)) || parseInt(val) <= 0) {
        currentPrice = 0;
        if (negoError) negoError.style.display = 'none';
        updateConfirmButtonState();
        return;
    }

    const numVal = parseInt(val);
    if (numVal < minAllowedNego) {
        if (negoError) negoError.style.display = 'block';
        const minErrorVal = document.getElementById('minErrorVal2');
        if (minErrorVal) minErrorVal.innerText = formatRupiah(minAllowedNego);
    } else {
        if (negoError) negoError.style.display = 'none';
    }

    currentPrice = numVal;

    // ⬇️ BARU: update label auto-accept + state tombol
    updateAutoAcceptPriceLabels(numVal);
    updateConfirmButtonState();
}

// ==================== DARK MODE ====================
function applyDarkMode() {
    const isDark = localStorage.getItem('jego_dark_mode') === 'true';
    if (isDark) {
        document.body.classList.add('dark-mode');
        if (map) map.setOptions({ styles: darkMapStyle });
    } else {
        document.body.classList.remove('dark-mode');
        if (map) map.setOptions({ styles: [] });
    }
}

// ==================== CEK ORDER AKTIF ====================
async function cekOrderAktifDanRedirect() {
    const orderId = localStorage.getItem('current_order_id');
    if (!orderId) return false;
    try {
        const snap = await database.ref(`orders/${orderId}`).once('value');
        const order = snap.val();
        if (!order) { localStorage.removeItem('current_order_id'); return false; }
        if (order.status === 'waiting') return true;
        const statusRedirect = ['accepted', 'on_the_way', 'arrived', 'on_trip'];
        if (statusRedirect.includes(order.status) && orderId && orderId !== 'null') {
            window.location.href = `tracking_customer.html?order_id=${orderId}`;
            return true;
        } else {
            localStorage.removeItem('current_order_id');
            return false;
        }
    } catch(err) { return false; }
}

async function loadWaitingOrderData() {
    const orderId = localStorage.getItem('current_order_id');
    if (!orderId) return false;
    try {
        const snap = await database.ref(`orders/${orderId}`).once('value');
        const order = snap.val();
        if (!order || order.status !== 'waiting') return false;
        pickupCoord = [order.pickup_lng, order.pickup_lat];
        destCoord = [order.dest_lng, order.dest_lat];
        pickupAddress = order.pickup_address;
        destAddress = order.destination_address;
        if (order.via_lng && order.via_lat && order.via_address) {
            viaCoord = [order.via_lng, order.via_lat];
            viaAddress = order.via_address;
            document.getElementById('viaInput').value = viaAddress;
            document.getElementById('clearViaBtn').style.display = 'block';
        } else {
            viaCoord = null;
            viaAddress = '';
            document.getElementById('viaInput').value = '';
            document.getElementById('clearViaBtn').style.display = 'none';
        }
        currentPrice = order.price;
        transportType = order.transport_type;
        transportIconUrl = getDriverIconUrl(transportType);
        initNegosiasi(currentPrice);

        // ⬇️ Restore status toggle auto-accept dari order (2 tempat)
        const autoAcceptToggle = document.getElementById('autoAcceptToggle');
        const autoAcceptToggleBidding = document.getElementById('autoAcceptToggleBidding');
        const isAutoAccept = order.auto_accept === true;
        if (autoAcceptToggle) autoAcceptToggle.checked = isAutoAccept;
        if (autoAcceptToggleBidding) autoAcceptToggleBidding.checked = isAutoAccept;

        updatePickerAddresses();
        updatePickerVehicleCard();

        showAddressCard();
        switchToBiddingMode();

        currentOrderId = orderId;
        currentRoute = { distance: order.distance_meters, duration: order.duration_seconds, price: order.price };
        updateMarkers();
        document.getElementById('pickupInput').value = pickupAddress;
        document.getElementById('destInput').value = destAddress;

        if (map) {
            if (window.directionsRenderer) {
                window.directionsRenderer.setMap(null);
                window.directionsRenderer = null;
            }
            await updateRoute();
        }
        // Mulai timer
        startBiddingTimer();
        return true;
    } catch(err) { return false; }
}

// ==================== FETCH TRANSPORT DATA ====================
async function fetchTransportData() {
    try {
        const snapshot = await database.ref('data-jego/tarif').once('value');
        const firebaseData = snapshot.val();
        if (!firebaseData) throw new Error('data kosong');
        transportData = {};
        tariffRates = {};
        snapshot.forEach((child) => {
            const data = child.val();
            const transportName = data.nama;
            const internalName = transportNameMapping[transportName];
            if (internalName && data) {
                transportData[internalName] = {
                    name: data.nama,
                    capacity: data.capacity || "Kapasitas standar",
                    description: data.deskripsi || "Layanan terbaik JeGo",
                    icon: data.icon_url || "https://cdn-icons-png.flaticon.com/128/7890/7890227.png",
                    minimalDistance: data.minimal_distance || 4,
                    minimalPrice: data.minimal_price || 10000
                };
                tariffRates[internalName] = data.price_per_km || 2000;
            }
        });
        renderVehicleCards();
    } catch(error) {
        console.error('❌ Gagal fetch transport data:', error);
        loadFallbackData();
    }
}

function loadFallbackData() {
    // ⬇️ HANYA 3 KENDARAAN
    transportData = {
        motor: { name: "Motor", capacity: "1 Penumpang", description: "Tanpa macet, harga hemat", icon: "https://cdn-icons-png.flaticon.com/128/5811/5811823.png", minimalDistance: 4, minimalPrice: 10000 },
        bentor: { name: "Bentor", capacity: "2 Penumpang", description: "Khas Gorontalo", icon: "https://cdn-icons-png.flaticon.com/128/7890/7890227.png", minimalDistance: 4, minimalPrice: 11000 },
        mobil: { name: "Mobil", capacity: "4 Penumpang + AC", description: "Nyaman untuk grup", icon: "https://cdn-icons-png.flaticon.com/128/12689/12689302.png", minimalDistance: 4, minimalPrice: 15000 }
    };
    tariffRates = { motor: 2200, bentor: 3000, mobil: 4000 };
    renderVehicleCards();
}

function renderVehicleCards() {
    const container = document.getElementById('vehicleScroll');
    if (!container) return;
    container.innerHTML = '';
    // ⬇️ HANYA 3 KENDARAAN
    const order = ['motor', 'bentor', 'mobil'];
    order.forEach(type => {
        const t = transportData[type];
        if (t) {
            const card = document.createElement('div');
            card.className = 'vehicle-card';
            card.dataset.type = type;
            card.innerHTML = `
                <img src="${t.icon}" alt="${t.name}" loading="lazy">
                <div class="name">${t.name}</div>
                <div class="sub">${t.capacity}</div>
            `;
            card.addEventListener('click', () => selectVehicle(type));
            container.appendChild(card);
        }
    });
}

function selectVehicle(type) {
    const t = transportData[type];
    if (!t) return;
    const transportObj = {
        type: type,
        name: t.name,
        capacity: t.capacity,
        icon: t.icon,
        description: t.description,
        tariff: tariffRates[type],
        minimalDistance: t.minimalDistance,
        minimalPrice: t.minimalPrice
    };
    localStorage.setItem('jego_last_transport', JSON.stringify(transportObj));
    selectedTransport = transportObj;
    transportType = type;
    transportIconUrl = t.icon;
    transportRate = {
        minimal_distance: t.minimalDistance,
        minimal_price: t.minimalPrice,
        price_per_km: tariffRates[type]
    };
    isCourier = type.toLowerCase().includes('kurir');
    document.getElementById('currentVehicleName').innerText = t.name;
    closeVehicleOverlay();

    updatePickerVehicleCard();

    if (pickupCoord && destCoord) updateRoute();
    showToast(`✅ Kendaraan ${t.name} dipilih`, 'success');

    // ⬇️ BARU: Refresh daftar pengemudi setelah ganti kendaraan
    if (pickupCoord && pickupCoord.length === 2) {
        renderNearbyDriversFromGeohash(pickupCoord[1], pickupCoord[0], 3);
    }
}

// ==================== OVERLAY KENDARAAN ====================
function openVehicleOverlay() {
    const overlay = document.getElementById('vehicleOverlay');
    if (overlay) overlay.classList.add('active');
    document.querySelectorAll('.vehicle-card').forEach(c => c.classList.remove('selected'));
    if (selectedVehicleType) {
        document.querySelector(`.vehicle-card[data-type="${selectedVehicleType}"]`)?.classList.add('selected');
    }
}

function closeVehicleOverlay() {
    const overlay = document.getElementById('vehicleOverlay');
    if (overlay) overlay.classList.remove('active');
}

// ==================== SESSION ====================
async function checkUserSession() {
    return new Promise((resolve, reject) => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            unsubscribe();
            if (!user) { showPopup('Akses Ditolak', 'Anda belum login.', () => window.location.href = 'loginUser.html'); reject(false); return; }
            try {
                const uid = user.uid;
                const snapshot = await database.ref(`users/${uid}`).once('value');
                const data = snapshot.val();
                if (!data) throw new Error();
                currentUser = { id: uid, name: data.name, phone: data.phone, email: data.email, rating: data.rating || 5, perjalanan: data.perjalanan || 0, photoURL: data.photoURL || '' };
                console.log('✅ User session valid:', currentUser.name);
                resolve(true);
            } catch(err) {
                showPopup('Sesi Tidak Valid', 'Silakan login ulang.', () => window.location.href = 'loginUser.html');
                reject(false);
            }
        });
    });
}

async function loadSelectedTransport() {
    const lastTransport = localStorage.getItem('jego_last_transport');
    if (!lastTransport) {
        openVehicleOverlay();
        return false;
    }
    try {
        selectedTransport = JSON.parse(lastTransport);
        transportType = selectedTransport.type;
        isCourier = transportType && transportType.toLowerCase().includes('kurir');
        transportRate = {
            minimal_distance: selectedTransport.minimalDistance,
            minimal_price: selectedTransport.minimalPrice,
            price_per_km: selectedTransport.tariff
        };
        transportIconUrl = selectedTransport.icon || getDriverIconUrl(transportType);
        document.getElementById('currentVehicleName').innerText = selectedTransport.name || transportType;
        
        updatePickerVehicleCard();
        
        if (isCourier && selectedTransport.deliveryData) {
            deliveryData = selectedTransport.deliveryData;
        }
        return true;
    } catch(e) {
        showPopup('Error', 'Gagal memuat data transportasi');
        return false;
    }
}

// ==================== PETA & RUTE ====================
function getFullAddress(feature) {
    const name = feature.properties?.name;
    const fullAddress = feature.properties?.full_address || feature.properties?.address || '';
    if (name && name.trim()) {
        if (fullAddress.toLowerCase().includes(name.toLowerCase())) return fullAddress;
        return `${name}, ${fullAddress}`;
    }
    return fullAddress;
}

function initAutocompleteService() {
    if (!autocompleteService && google.maps && google.maps.places) {
        try {
            autocompleteService = new google.maps.places.AutocompleteService();
            console.log('✅ AutocompleteService initialized');
        } catch (e) {
            autocompleteService = null;
        }
    }
}

function reverseGeocode(lng, lat) {
    return new Promise((resolve) => {
        if (!geocoder) geocoder = new google.maps.Geocoder();
        geocoder.geocode({
            location: { lat: lat, lng: lng },
            language: 'id'
        }, (results, status) => {
            if (status === 'OK' && results.length > 0) {
                let address = results[0].formatted_address;
                address = address.replace(', Indonesia', '');
                resolve(address);
            } else {
                resolve(null);
            }
        });
    });
}

// ==================== SEARCH ADDRESS ====================
function searchAddress(keyword) {
    if (searchAbortController) {
        searchAbortController.abort();
        searchAbortController = null;
    }

    const trimmedKeyword = keyword.trim();
    if (trimmedKeyword.length < 3) {
        document.getElementById('searchResultList').style.display = 'none';
        document.getElementById('searchDefaultOptions').style.display = 'block';
        document.getElementById('searchLoading').style.display = 'none';
        return;
    }

    document.getElementById('searchDefaultOptions').style.display = 'none';
    document.getElementById('searchResultList').style.display = 'none';
    document.getElementById('searchLoading').style.display = 'block';

    const cacheKey = trimmedKeyword.toLowerCase();
    if (searchCache[cacheKey]) {
        renderSearchResults(searchCache[cacheKey]);
        return;
    }

    searchAbortController = new AbortController();
    if (!autocompleteService) initAutocompleteService();

    if (autocompleteService && typeof autocompleteService.getPlacePredictions === 'function') {
        const request = {
            input: trimmedKeyword,
            language: 'id',
            componentRestrictions: { country: 'id' },
            locationBias: { east: 123.5, west: 122.5, north: 1.0, south: 0.0 }
        };

        const timeoutId = setTimeout(() => {
            if (searchAbortController) { searchAbortController.abort(); searchAbortController = null; }
            document.getElementById('searchLoading').style.display = 'none';
            const resultList = document.getElementById('searchResultList');
            resultList.style.display = 'block';
            resultList.innerHTML = '<div style="text-align:center;padding:20px;color:#f44336;">⏱️ Pencarian terlalu lama.</div>';
        }, 5000);

        autocompleteService.getPlacePredictions(request, (predictions, status) => {
            clearTimeout(timeoutId);
            if (searchAbortController && searchAbortController.signal.aborted) return;
            searchAbortController = null;
            document.getElementById('searchLoading').style.display = 'none';

            if (status === 'OK' && predictions && predictions.length > 0) {
                const gorontaloResults = predictions.filter(p =>
                    p.description && p.description.toLowerCase().includes('gorontalo')
                );
                if (gorontaloResults.length === 0) {
                    const resultList = document.getElementById('searchResultList');
                    resultList.style.display = 'block';
                    resultList.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">🔍 Tidak ditemukan di Gorontalo.</div>';
                    return;
                }
                searchCache[cacheKey] = gorontaloResults;
                renderSearchResults(gorontaloResults);
            } else {
                searchAddressFallback(trimmedKeyword);
            }
        });
    } else {
        searchAddressFallback(trimmedKeyword);
    }
}

function renderSearchResults(predictions) {
    const resultList = document.getElementById('searchResultList');
    resultList.innerHTML = '';
    resultList.style.display = 'block';

    const topResults = predictions.slice(0, 8);
    topResults.forEach(prediction => {
        const item = document.createElement('div');
        item.className = 'search-option-item';
        const mainText = prediction.structured_formatting?.main_text || prediction.description;
        const secondaryText = prediction.structured_formatting?.secondary_text || '';
        let display = mainText;
        if (secondaryText && !mainText.includes(secondaryText)) display = mainText + ', ' + secondaryText;
        else if (!mainText) display = prediction.description;
        const badge = ' <span style="font-size:10px;color:#FF9800;font-weight:bold;">📍 Gorontalo</span>';

        item.innerHTML = `<div class="search-option-icon result">📍</div><div class="search-option-text">${escapeHtml(display)}${badge}</div>`;
        item.addEventListener('click', () => getPlaceDetails(prediction.place_id));
        resultList.appendChild(item);
    });
}

function getPlaceDetails(placeId) {
    if (placeDetailsCache[placeId]) {
        const cached = placeDetailsCache[placeId];
        const feature = {
            geometry: { coordinates: [cached.lng, cached.lat] },
            properties: { full_address: cached.address, name: cached.name }
        };
        selectAddress(feature);
        return;
    }

    showToast('🔍 Mengambil detail lokasi...', 'info');
    const service = new google.maps.places.PlacesService(document.createElement('div'));
    service.getDetails({
        placeId: placeId,
        fields: ['geometry', 'formatted_address', 'name']
    }, (place, status) => {
        if (status === 'OK' && place && place.geometry) {
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            let address = place.formatted_address || place.name || '';
            address = address.replace(', Indonesia', '');
            placeDetailsCache[placeId] = { lat, lng, address, name: place.name || address.split(',')[0] };
            const feature = {
                geometry: { coordinates: [lng, lat] },
                properties: { full_address: address, name: place.name || address.split(',')[0] }
            };
            selectAddress(feature);
        } else {
            showToast('❌ Gagal mengambil detail lokasi', 'error');
        }
    });
}

function searchAddressFallback(keyword) {
    if (!geocoder) geocoder = new google.maps.Geocoder();
    const gorontaloBounds = { east: 123.5, west: 122.5, north: 1.0, south: 0.0 };

    const timeoutId = setTimeout(() => {
        document.getElementById('searchLoading').style.display = 'none';
        const resultList = document.getElementById('searchResultList');
        resultList.style.display = 'block';
        resultList.innerHTML = '<div style="text-align:center;padding:20px;color:#f44336;">⏱️ Pencarian terlalu lama.</div>';
    }, 5000);

    geocoder.geocode({
        address: keyword + ', Gorontalo, Indonesia',
        language: 'id',
        region: 'ID',
        bounds: gorontaloBounds
    }, (results, status) => {
        clearTimeout(timeoutId);
        document.getElementById('searchLoading').style.display = 'none';
        const resultList = document.getElementById('searchResultList');
        resultList.innerHTML = '';

        if (status === 'OK' && results && results.length > 0) {
            resultList.style.display = 'block';
            const gorontaloResults = results.filter(r => r.formatted_address.toLowerCase().includes('gorontalo'));
            const finalResults = gorontaloResults.length > 0 ? gorontaloResults : results;
            finalResults.slice(0, 8).forEach(result => {
                const item = document.createElement('div');
                item.className = 'search-option-item';
                const display = result.formatted_address.replace(', Indonesia', '');
                const badge = ' <span style="font-size:10px;color:#FF9800;font-weight:bold;">📍 Gorontalo</span>';
                item.innerHTML = `<div class="search-option-icon result">📍</div><div class="search-option-text">${escapeHtml(display)}${badge}</div>`;
                item.addEventListener('click', () => {
                    const lat = result.geometry.location.lat();
                    const lng = result.geometry.location.lng();
                    const feature = {
                        geometry: { coordinates: [lng, lat] },
                        properties: { full_address: display, name: display.split(',')[0] }
                    };
                    selectAddress(feature);
                });
                resultList.appendChild(item);
            });
        } else {
            resultList.style.display = 'block';
            resultList.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">🔍 Tidak ditemukan di Gorontalo.</div>';
        }
    });
}

// ==================== SELECT ADDRESS ====================
function selectAddress(feature) {
    const coords = feature.geometry.coordinates;
    const address = getFullAddress(feature);
    addSearchHistory(address, coords[0], coords[1]);

    if (searchOverlayMode === 'pickup') {
        pickupCoord = [coords[0], coords[1]];
        pickupAddress = address;
        document.getElementById('pickupInput').value = pickupAddress;
        updateMarkers();
        if (map) {
            map.setCenter({ lat: coords[1], lng: coords[0] });
            map.setZoom(15);
        }
    } else if (searchOverlayMode === 'via') {
        viaCoord = [coords[0], coords[1]];
        viaAddress = address;
        document.getElementById('viaInput').value = viaAddress;
        document.getElementById('clearViaBtn').style.display = 'block';
        updateMarkers();
        updatePickerAddresses();
    } else {
        destCoord = [coords[0], coords[1]];
        destAddress = address;
        document.getElementById('destInput').value = destAddress;
    }

    if (pickupCoord && destCoord) updateRoute();
    closeSearchOverlay();
    closeVehicleOverlay();
}

// ==================== AUTO FILL PICKUP ====================
async function autoFillPickupLocation() {
    const pickupInput = document.getElementById('pickupInput');
    const originalPlaceholder = pickupInput.placeholder;
    pickupInput.placeholder = '⏳ Mendeteksi lokasi Anda...';
    pickupInput.style.color = '#999';

    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            pickupInput.placeholder = originalPlaceholder;
            pickupInput.style.color = '';
            showAddressCard();
            resolve(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            pickupInput.placeholder = '⏳ Mengambil alamat...';

            let address = await reverseGeocode(longitude, latitude);
            if (!address || address.trim() === '') address = '(Jalan Tanpa Nama)';

            pickupCoord = [longitude, latitude];
            pickupAddress = address;
            pickupInput.value = pickupAddress;
            pickupInput.placeholder = originalPlaceholder;
            pickupInput.style.color = '';

            updateMarkers();
            if (map) {
                map.setCenter({ lat: latitude, lng: longitude });
                map.setZoom(14);
            }
            if (destCoord) await updateRoute();

            showToast('✅ Lokasi Anda digunakan sebagai titik penjemputan', 'success');
            showAddressCard();
            resolve(true);
        }, () => {
            pickupInput.placeholder = originalPlaceholder;
            pickupInput.style.color = '';
            showToast('⚠️ Gagal mendeteksi lokasi, silakan pilih manual', 'error');
            showAddressCard();
            resolve(false);
        }, { enableHighAccuracy: true, timeout: 10000 });
    });
}

// ==================== UPDATE MARKERS ====================
function updateMarkers() {
    if (pickupMarker) { pickupMarker.setMap(null); pickupMarker = null; }
    if (destMarker) { destMarker.setMap(null); destMarker = null; }
    if (viaMarker) { viaMarker.setMap(null); viaMarker = null; }

    if (pickupCoord) {
        const iconUrl = transportIconUrl || 'https://cdn-icons-png.flaticon.com/128/5811/5811823.png';
        pickupMarker = new google.maps.Marker({
            position: { lat: pickupCoord[1], lng: pickupCoord[0] },
            map: map,
            icon: { url: iconUrl, scaledSize: new google.maps.Size(35, 35), anchor: new google.maps.Point(17, 17) },
            title: 'Penjemputan'
        });
    }

    if (destCoord) {
        destMarker = new google.maps.Marker({
            position: { lat: destCoord[1], lng: destCoord[0] },
            map: map,
            icon: { url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png', scaledSize: new google.maps.Size(32, 32) },
            title: 'Tujuan'
        });
    }

    if (viaCoord) {
        viaMarker = new google.maps.Marker({
            position: { lat: viaCoord[1], lng: viaCoord[0] },
            map: map,
            icon: { url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png', scaledSize: new google.maps.Size(30, 30) },
            title: 'Titik Singgah'
        });
    }
}

// ==================== UPDATE ROUTE ====================
async function updateRoute() {
    if (!pickupCoord || !destCoord) return;

    if (window.directionsRenderer) {
        window.directionsRenderer.setMap(null);
        window.directionsRenderer = null;
    }

    try {
        const waypoints = [];
        if (viaCoord && viaCoord.length === 2) {
            waypoints.push({ location: { lat: viaCoord[1], lng: viaCoord[0] }, stopover: true });
        }

        if (!directionsService) directionsService = new google.maps.DirectionsService();

        const request = {
            origin: { lat: pickupCoord[1], lng: pickupCoord[0] },
            destination: { lat: destCoord[1], lng: destCoord[0] },
            waypoints: waypoints,
            travelMode: google.maps.TravelMode.DRIVING,
            language: 'id'
        };

        const result = await new Promise((resolve, reject) => {
            directionsService.route(request, (response, status) => {
                if (status === google.maps.DirectionsStatus.OK) resolve(response);
                else reject(new Error(status));
            });
        });

        const route = result.routes[0];
        let distanceMeters = 0;
        let durationSeconds = 0;
        route.legs.forEach(leg => {
            distanceMeters += leg.distance.value;
            durationSeconds += leg.duration.value;
        });

        const price = calculatePrice(distanceMeters);
        currentPrice = price;
        initNegosiasi(price);

        currentRoute = { distance: distanceMeters, duration: durationSeconds, price: price };

        updatePickerAddresses();
        updatePickerVehicleCard();

        const bsBtn = document.getElementById('bsSearchBtn');
        if (bsBtn) bsBtn.disabled = false;

        const directionsRenderer = new google.maps.DirectionsRenderer({
            map: map,
            suppressMarkers: true,
            polylineOptions: { strokeColor: '#FF9800', strokeWeight: 5 }
        });
        window.directionsRenderer = directionsRenderer;
        directionsRenderer.setDirections(result);

        updateMarkers();

        const bounds = new google.maps.LatLngBounds();
        bounds.extend(new google.maps.LatLng(pickupCoord[1], pickupCoord[0]));
        bounds.extend(new google.maps.LatLng(destCoord[1], destCoord[0]));
        if (viaCoord) bounds.extend(new google.maps.LatLng(viaCoord[1], viaCoord[0]));
        map.fitBounds(bounds, { top: 160, bottom: 420, left: 50, right: 50 });

        console.log('✅ Rute berhasil digambar');
    } catch(err) {
        console.error('❌ updateRoute error:', err);
        showPopup('Error', 'Gagal menghitung rute.');
    }
}

// ==================== OVERLAY PENCARIAN ====================
function openSearchOverlay(type) {
    closeVehicleOverlay();
    searchOverlayMode = type;
    const overlay = document.getElementById('searchOverlay');
    const input = document.getElementById('searchOverlayInput');
    const clearBtn = document.getElementById('searchOverlayClear');
    const defaultOptions = document.getElementById('searchDefaultOptions');
    const resultList = document.getElementById('searchResultList');
    const loading = document.getElementById('searchLoading');
    input.value = '';
    clearBtn.classList.remove('visible');
    defaultOptions.style.display = 'block';
    resultList.style.display = 'none';
    resultList.innerHTML = '';
    loading.style.display = 'none';
    renderHistoryList();
    if (type === 'pickup') input.placeholder = 'Cari lokasi penjemputan...';
    else if (type === 'destination') input.placeholder = 'Cari lokasi tujuan...';
    else input.placeholder = 'Cari titik singgah (opsional)...';
    overlay.classList.add('active');
    setTimeout(() => { input.focus(); }, 350);
    initAutocompleteService();
}

function closeSearchOverlay() {
    document.getElementById('searchOverlay').classList.remove('active');
    pickFromMapActive = false;
    if (searchTimeout) clearTimeout(searchTimeout);
}

function useCurrentLocation() {
    closeVehicleOverlay();
    if (!navigator.geolocation) { showToast('⚠️ Geolokasi tidak didukung', 'error'); return; }
    showToast('📍 Mendapatkan lokasi...', 'info');
    navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        let address = await reverseGeocode(longitude, latitude);
        if (!address || address.trim() === '') address = '(Lokasi Anda)';
        const feature = { geometry: { coordinates: [longitude, latitude] }, properties: { full_address: address, name: '' } };
        selectAddress(feature);
        showToast('✅ Lokasi Anda digunakan', 'success');
    }, () => { showToast('❌ Gagal mendapatkan lokasi', 'error'); }, { enableHighAccuracy: true, timeout: 10000 });
}

// ==================== PILIH DI PETA ====================
function pickFromMap() {
    closeSearchOverlay();
    closeVehicleOverlay();

    if (!map) return;

    mapPickActive = true;
    mapPickCoords = null;
    mapPickAddress = '';

    if (mapIdleTimer) { clearTimeout(mapIdleTimer); mapIdleTimer = null; }

    const pinContainer = document.getElementById('mapCenterPin');
    pinContainer.classList.add('active');

    const pinAddress = document.getElementById('pinAddress');
    pinAddress.textContent = '📍 Geser peta untuk memilih lokasi';
    pinAddress.classList.remove('loading');

    document.getElementById('pinActions').style.display = 'flex';

    const useBtn = document.getElementById('useMapPickBtn');
    useBtn.textContent = '📍 Pilih Lokasi';
    useBtn.className = 'pin-action-btn primary';

    const center = map.getCenter();
    mapPickCoords = [center.lng(), center.lat()];

    reverseGeocode(mapPickCoords[0], mapPickCoords[1]).then(address => {
        if (!mapPickActive) return;
        mapPickAddress = address || '(Alamat tidak ditemukan)';
        if (mapPickAddress && mapPickAddress !== '(Alamat tidak ditemukan)') {
            const streetName = mapPickAddress.split(',')[0] || mapPickAddress;
            pinAddress.textContent = `📍 ${streetName}`;
            useBtn.textContent = '✅ Ok';
            useBtn.className = 'pin-action-btn success';
        } else {
            pinAddress.textContent = '📍 Lokasi tidak dikenal';
        }
    });

    google.maps.event.clearListeners(map, 'dragstart');
    google.maps.event.clearListeners(map, 'dragend');
    map.addListener('dragstart', onMapMoveStart);
    map.addListener('dragend', onMapMoveEnd);

    pickFromMapActive = false;
    showToast('📍 Geser peta, lalu klik "Ok" untuk memilih', 'info');
}

function onMapMoveStart() {
    if (!mapPickActive) { document.getElementById('pinActions').style.display = 'none'; return; }
    document.getElementById('pinActions').style.display = 'none';
    const pinAddress = document.getElementById('pinAddress');
    pinAddress.textContent = '⏳ Memuat alamat...';
    pinAddress.classList.add('loading');
    if (mapIdleTimer) { clearTimeout(mapIdleTimer); mapIdleTimer = null; }
    const pinContainer = document.getElementById('mapCenterPin');
    if (pinContainer) pinContainer.classList.add('dragging');
    document.getElementById('useMapPickBtn').textContent = '📍 Memuat...';
}

function onMapMoveEnd() {
    if (!mapPickActive) { document.getElementById('pinActions').style.display = 'none'; return; }
    const pinContainer = document.getElementById('mapCenterPin');
    if (pinContainer) {
        pinContainer.classList.remove('dragging');
        void pinContainer.offsetWidth;
        pinContainer.classList.remove('active');
        void pinContainer.offsetWidth;
        pinContainer.classList.add('active');
    }
    const center = map.getCenter();
    mapPickCoords = [center.lng(), center.lat()];
    if (mapIdleTimer) { clearTimeout(mapIdleTimer); mapIdleTimer = null; }
    mapIdleTimer = setTimeout(async () => {
        if (!mapPickActive) return;
        const address = await reverseGeocode(mapPickCoords[0], mapPickCoords[1]);
        mapPickAddress = address || '(Alamat tidak ditemukan)';
        const pinAddress = document.getElementById('pinAddress');
        const useBtn = document.getElementById('useMapPickBtn');
        if (mapPickAddress && mapPickAddress !== '(Alamat tidak ditemukan)') {
            const streetName = mapPickAddress.split(',')[0] || mapPickAddress;
            pinAddress.textContent = `📍 ${streetName}`;
            pinAddress.classList.remove('loading');
            useBtn.textContent = '✅ Ok';
            useBtn.className = 'pin-action-btn success';
        } else {
            pinAddress.textContent = '📍 Lokasi tidak dikenal';
            pinAddress.classList.remove('loading');
            useBtn.textContent = '📍 Pilih Lokasi';
            useBtn.className = 'pin-action-btn primary';
        }
        document.getElementById('pinActions').style.display = 'flex';
        mapIdleTimer = null;
    }, 3000);
}

function confirmMapPick() {
    if (!mapPickActive) { showToast('❌ Mode pilih peta tidak aktif', 'error'); return; }
    if (!mapPickCoords) { showToast('❌ Pilih lokasi terlebih dahulu', 'error'); return; }

    if (!mapPickAddress || mapPickAddress === '(Alamat tidak ditemukan)') {
        showToast('⏳ Mengambil alamat...', 'info');
        reverseGeocode(mapPickCoords[0], mapPickCoords[1]).then(address => {
            if (!mapPickActive) return;
            mapPickAddress = address || '(Alamat tidak ditemukan)';
            if (mapPickAddress && mapPickAddress !== '(Alamat tidak ditemukan)') {
                const feature = {
                    geometry: { coordinates: mapPickCoords },
                    properties: { full_address: mapPickAddress, name: mapPickAddress.split(',')[0] }
                };
                selectAddress(feature);
                cancelMapPick();
            } else {
                showToast('❌ Gagal mengambil alamat', 'error');
            }
        });
        return;
    }
    const [lng, lat] = mapPickCoords;
    const feature = {
        geometry: { coordinates: [lng, lat] },
        properties: { full_address: mapPickAddress, name: mapPickAddress.split(',')[0] }
    };
    selectAddress(feature);
    cancelMapPick();
}

function cancelMapPick() {
    mapPickActive = false;
    const pinContainer = document.getElementById('mapCenterPin');
    pinContainer.classList.remove('active', 'dragging');
    document.getElementById('pinActions').style.display = 'none';
    const pinAddress = document.getElementById('pinAddress');
    pinAddress.textContent = '📍 Pilih lokasi di peta';
    pinAddress.classList.remove('loading');
    google.maps.event.clearListeners(map, 'dragstart');
    google.maps.event.clearListeners(map, 'dragend');
    if (mapPickResolveTimer) { clearTimeout(mapPickResolveTimer); mapPickResolveTimer = null; }
    if (mapIdleTimer) { clearTimeout(mapIdleTimer); mapIdleTimer = null; }
    mapPickCoords = null;
    mapPickAddress = '';
    const useBtn = document.getElementById('useMapPickBtn');
    useBtn.textContent = '📍 Pilih Lokasi';
    useBtn.className = 'pin-action-btn primary';
}

function clearViaPoint() {
    if (viaCoord) {
        viaCoord = null;
        viaAddress = '';
        document.getElementById('viaInput').value = '';
        document.getElementById('clearViaBtn').style.display = 'none';
        if (viaMarker) { viaMarker.setMap(null); viaMarker = null; }
        if (pickupCoord && destCoord) updateRoute();
        updatePickerAddresses();
        showToast('🗑️ Titik singgah dihapus', 'info');
    }
}

// ==================== RADAR ====================
function startSlowZoomOut() {}
function stopSlowZoomOut() {}

function activateRadarOnPickup() {
    if (pickupMarker) {
        // ⚡ FIX: Pakai icon sesuai kendaraan yang dipilih, bukan hardcode motor
        const iconUrl = transportIconUrl
            || getDriverIconUrl(transportType)
            || 'https://cdn-icons-png.flaticon.com/128/5811/5811823.png';
        pickupMarker.setIcon({
            url: iconUrl,
            scaledSize: new google.maps.Size(45, 45),
            anchor: new google.maps.Point(22, 22)
        });
    }
}

function deactivateRadarOnPickup() {
    if (pickupMarker) {
        const iconUrl = transportIconUrl || 'https://cdn-icons-png.flaticon.com/128/5811/5811823.png';
        pickupMarker.setIcon({
            url: iconUrl,
            scaledSize: new google.maps.Size(35, 35),
            anchor: new google.maps.Point(17, 17)
        });
    }
}

function getDriverIconUrl(vehicleType) {
    if (!vehicleType) return 'https://cdn-icons-png.flaticon.com/128/5811/5811823.png';
    const type = vehicleType.toLowerCase();
    if (type === 'motor') return 'https://cdn-icons-png.flaticon.com/128/5811/5811823.png';
    if (type === 'bentor') return 'https://cdn-icons-png.flaticon.com/128/7890/7890227.png';
    if (type === 'mobil') return 'https://cdn-icons-png.flaticon.com/128/12689/12689302.png';
    if (type === 'kurir_motor') return 'https://cdn-icons-png.flaticon.com/128/9561/9561688.png';
    if (type === 'kurir_bentor') return 'https://cdn-icons-png.flaticon.com/128/7890/7890227.png';
    return 'https://cdn-icons-png.flaticon.com/128/5811/5811823.png';
}

// ==================== ORDER & OFFERS ====================
function renderOffers(offers) {
    const container = document.getElementById('driverOfferList');
    const offersOverlay = document.getElementById('driverOffers');
    if (!container) return;
    
    const hasOffers = offers && Object.keys(offers).length > 0;
    
    if (!hasOffers) {
        if (offersOverlay) offersOverlay.classList.remove('active');
        container.innerHTML = '';
        return;
    }
    
    if (offersOverlay) offersOverlay.classList.add('active');
    container.innerHTML = '';
    Object.entries(offers).forEach(([driverId, offer]) => {
        const isProcessed = offer.status === 'accepted' || offer.status === 'rejected';
        let bidPriceText = '';
        if (offer.bid_price && offer.bid_price > 0 && offer.bid_requested === true) {
            bidPriceText = `<div class="bid-price-text">💰 Menawar: ${formatRupiah(offer.bid_price)}</div>`;
        }

        const photoUrl = (offer.driver_photo && offer.driver_photo !== 'null' && offer.driver_photo.startsWith('http'))
            ? offer.driver_photo
            : 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';

        const card = document.createElement('div');
        card.className = 'driver-offer-card';
        card.innerHTML = `
            <div class="driver-info">
                <img class="driver-photo" src="${photoUrl}">
                <div class="driver-details">
                    <div class="driver-name">${escapeHtml(offer.driver_name)}</div>
                    <div class="driver-vehicle">${offer.driver_type || transportType}</div>
                    <div style="font-size:0.7rem;">⭐ ${offer.driver_rating ? parseFloat(offer.driver_rating).toFixed(1) : 5} (${offer.driver_trips || 0} trip)</div>
                    ${bidPriceText}
                </div>
            </div>
            <div class="driver-action-buttons">
                ${!isProcessed ? `<button class="accept-btn" data-driver="${driverId}">✅ Terima</button><button class="reject-btn" data-driver="${driverId}">❌ Tolak</button>` : `<span style="font-size:0.8rem;">${offer.status === 'accepted' ? '✓ Diterima' : '✗ Ditolak'}</span>`}
            </div>
        `;
        container.appendChild(card);
    });
    document.querySelectorAll('.accept-btn').forEach(btn => btn.addEventListener('click', () => acceptOffer(btn.getAttribute('data-driver'))));
    document.querySelectorAll('.reject-btn').forEach(btn => btn.addEventListener('click', () => rejectOffer(btn.getAttribute('data-driver'))));

    // ⬇️ Auto-accept driver pertama jika toggle ON (dari kedua toggle)
    const autoAcceptToggle = document.getElementById('autoAcceptToggle');
    const autoAcceptToggleBidding = document.getElementById('autoAcceptToggleBidding');
    const isAutoAcceptOn = (autoAcceptToggle && autoAcceptToggle.checked)
                        || (autoAcceptToggleBidding && autoAcceptToggleBidding.checked);
    if (!isAutoAcceptOn) return;
    if (!offers || !currentOrderId) return;

    // Cari driver pertama yang statusnya 'offered' dan belum dalam proses auto-accept
    const candidate = Object.entries(offers).find(([driverId, offer]) => {
        return offer.status === 'offered' && offer.auto_accepting !== true;
    });

    if (!candidate) return;

    const [driverId, offer] = candidate;

    // Lock dulu supaya tidak double-accept
    database.ref(`orders/${currentOrderId}/driver_offers/${driverId}/auto_accepting`).set(true)
        .then(() => {
            console.log('🤖 Auto-accept driver:', driverId, '- harga:', currentPrice);
            showToast('🤖 Menerima driver terdekat otomatis...', 'success');
            return acceptOffer(driverId);
        })
        .catch(err => {
            console.error('❌ Auto-accept gagal:', err);
        });
}

async function cleanupExpiredOffersCustomer() {
    if (!currentOrderId) return false;
    try {
        const orderSnap = await database.ref(`orders/${currentOrderId}`).once('value');
        const order = orderSnap.val();
        if (!order || order.status !== 'waiting') return false;
        const offers = order.driver_offers || {};
        const now = Date.now();
        let removedCount = 0;
        for (const [driverId, offer] of Object.entries(offers)) {
            if (offer.status === 'offered' && offer.expired_at && offer.expired_at < now) {
                await database.ref(`orders/${currentOrderId}/driver_offers/${driverId}`).remove();
                removedCount++;
            }
        }
        if (removedCount > 0) {
            const freshSnap = await database.ref(`orders/${currentOrderId}/driver_offers`).once('value');
            renderOffers(freshSnap.val());
        }
        return removedCount > 0;
    } catch (err) {
        console.error('Gagal membersihkan offer expired:', err);
        return false;
    }
}

async function acceptOffer(driverId) {
    let orderIdToUse = currentOrderId;
    if (!orderIdToUse || orderIdToUse === 'null') {
        orderIdToUse = localStorage.getItem('current_order_id');
    }
    if (!orderIdToUse || orderIdToUse === 'null') {
        showToast('❌ ID order tidak valid', 'error');
        return;
    }

    const offerSnap = await database.ref(`orders/${orderIdToUse}/driver_offers/${driverId}`).once('value');
    const offerData = offerSnap.val();
    let updateData = { status: 'accepted', driver_id: driverId, accepted_at: new Date().toISOString() };
    if (offerData && offerData.bid_price && offerData.bid_price > 0 && offerData.bid_requested === true) {
        updateData.price = offerData.bid_price;
    }
    await database.ref(`orders/${orderIdToUse}/driver_offers/${driverId}/status`).set('accepted');
    await database.ref(`orders/${orderIdToUse}`).update(updateData);
    localStorage.setItem('current_order_id', orderIdToUse);
    clearBiddingTimer();
    showToast('✅ Driver dipilih, mengalihkan...', 'success');
    setTimeout(() => { window.location.href = `tracking_customer.html?order_id=${orderIdToUse}`; }, 1000);
}

async function rejectOffer(driverId) {
    if (!currentOrderId) return;
    await database.ref(`orders/${currentOrderId}/driver_offers/${driverId}/status`).set('rejected');
}

// ==================== CONFIRM ROUTE ====================
async function confirmRoute() {
    console.log('🚀 confirmRoute() dipanggil');

    if (!currentRoute || !currentUser) { showPopup('Perhatian', 'Lengkapi asal dan tujuan.'); return; }

    const sheet         = document.getElementById('bottomSheet');
    const isBiddingMode = sheet && sheet.classList.contains('mode-bidding');
    const pickerOffer   = document.getElementById('pickerOfferInput');
    const negoInput     = document.getElementById('negoInput');

    // FIX: Pilih sumber berdasarkan mode
    let offerPrice = 0;
    if (isBiddingMode) {
        offerPrice = parseInt(negoInput.value) || 0;
    } else {
        offerPrice = parseInt(pickerOffer.value) || 0;
    }

    // Fallback
    if (!offerPrice || isNaN(offerPrice) || offerPrice <= 0) {
        offerPrice = parseInt(negoInput.value) || parseInt(pickerOffer.value) || 0;
    }

    if (isNaN(offerPrice) || offerPrice <= 0) {
        showPopup('Tawaran Tidak Valid', 'Masukkan harga tawaran yang valid (angka positif).');
        return;
    }
    if (offerPrice < minAllowedNego) {
        showPopup('Tawaran Tidak Valid', `Minimal tawaran ${formatRupiah(minAllowedNego)}`);
        return;
    }
    currentPrice = offerPrice;
    if (negoInput) negoInput.value = offerPrice;

    // Baca status auto-accept (dari kedua toggle)
    const autoAcceptToggle = document.getElementById('autoAcceptToggle');
    const autoAcceptToggleBidding = document.getElementById('autoAcceptToggleBidding');
    const autoAcceptEnabled = (autoAcceptToggle && autoAcceptToggle.checked)
                            || (autoAcceptToggleBidding && autoAcceptToggleBidding.checked);

    // Cek apakah sudah ada order aktif
    let isUpdate = false;
    if (currentOrderId) {
        try {
            const existingSnap = await database.ref(`orders/${currentOrderId}`).once('value');
            const existing = existingSnap.val();
            if (existing && existing.status === 'waiting') {
                isUpdate = true;
                console.log('🔄 Update order existing:', currentOrderId, '→ harga baru:', currentPrice);
            }
        } catch(e) { console.warn('Gagal cek order existing:', e); }
    }

    switchToBiddingMode();

    // Animasi radar & peta hanya untuk order BARU (update tidak perlu diulang)
if (!isUpdate) {
    document.getElementById('radar').style.display = 'block';
    setTimeout(() => document.getElementById('radar').classList.add('expanding'), 100);
    activateRadarOnPickup();

    if (map && pickupCoord && destCoord) {
        // ⬇️ STEP 1: Naikkan tampilan rute agar tidak tertutup bottom sheet
        const bounds = new google.maps.LatLngBounds();
        bounds.extend(new google.maps.LatLng(pickupCoord[1], pickupCoord[0]));
        bounds.extend(new google.maps.LatLng(destCoord[1], destCoord[0]));
        if (viaCoord) bounds.extend(new google.maps.LatLng(viaCoord[1], viaCoord[0]));

        const bsEl = document.getElementById('bottomSheet');
        const bsHeight = bsEl ? bsEl.offsetHeight : 340;

        map.fitBounds(bounds, {
            top: 100,
            bottom: bsHeight + 80,  // ⬅️ Padding dinamis sesuai tinggi bottom sheet
            left: 50,
            right: 50
        });

        // ⬇️ STEP 2: Setelah jeda biar user lihat rute dulu, zoom in ke pickup
        setTimeout(() => {
            smoothZoomTo(pickupCoord[1], pickupCoord[0], 16, 900, () => {
                // ⬇️ STEP 3: Setelah sampai pickup, zoom out pelan-pelan
                setTimeout(() => {
                    smoothZoomTo(pickupCoord[1], pickupCoord[0], 13, 4500);
                }, 1500);
            });
        }, 1500);
    }
}

    // Restart timer setiap kali konfirmasi (user baru saja "re-bid")
    startBiddingTimer();

    // ===== JALUR A: UPDATE ORDER YANG SUDAH ADA =====
    if (isUpdate) {
        try {
            await database.ref(`orders/${currentOrderId}`).update({
                price: currentPrice,
                distance_meters: currentRoute.distance,
                duration_seconds: currentRoute.duration,
                auto_accept: autoAcceptEnabled,
                auto_accept_price: currentPrice,
                updated_at: new Date().toISOString(),
                status: 'waiting'
            });

            // Hapus driver_offers lama supaya driver lihat harga BARU
            await database.ref(`orders/${currentOrderId}/driver_offers`).remove();

            // ⬇️ BARU: reset dirty state setelah submit sukses
            tariffChanged = false;
            updateConfirmButtonState();

            showToast('✅ Tawaran diperbarui: ' + formatRupiah(currentPrice), 'success');
            console.log('✅ Order updated:', currentOrderId);
            return;
        } catch(err) {
            console.error('❌ Gagal update order:', err);
            showToast('❌ Gagal update tawaran', 'error');
            return;
        }
    }

    // ===== JALUR B: BUAT ORDER BARU =====
    const newOrderRef = database.ref('orders').push();
    currentOrderId = newOrderRef.key;

    let feePercent = 7, taxPercent = 11;
    try {
        const potonganSnap = await database.ref('data-jego/potongan').once('value');
        feePercent = potonganSnap.exists() ? parseFloat(potonganSnap.val()) : 7;
        const pajakSnap = await database.ref('data-jego/pajak').once('value');
        taxPercent = pajakSnap.exists() ? parseFloat(pajakSnap.val()) : 11;
    } catch(e) { console.warn('Gagal ambil fee, pakai default'); }

    const orderData = {
        user_id: currentUser.id,
        customer_name: currentUser.name,
        transport_type: transportType,
        pickup_address: pickupAddress,
        pickup_lat: pickupCoord[1],
        pickup_lng: pickupCoord[0],
        destination_address: destAddress,
        dest_lat: destCoord[1],
        dest_lng: destCoord[0],
        distance_meters: currentRoute.distance,
        duration_seconds: currentRoute.duration,
        price: currentPrice,
        fee_percent: feePercent,
        tax_percent: taxPercent,
        status: 'waiting',
        created_at: new Date().toISOString(),
        passenger_rating: currentUser.rating,
        perjalanan: currentUser.perjalanan,
        customer_phone: currentUser.phone || '',
        photoURL: currentUser.photoURL || '',
        auto_accept: autoAcceptEnabled,
        auto_accept_price: currentPrice
    };
    if (viaCoord && viaAddress) {
        orderData.via_lat = viaCoord[1];
        orderData.via_lng = viaCoord[0];
        orderData.via_address = viaAddress;
    }
    if (isCourier && deliveryData) {
        orderData.sender_phone = deliveryData.senderPhone;
        orderData.receiver_phone = deliveryData.receiverPhone;
        orderData.item_category = deliveryData.itemCategory;
        orderData.item_description = deliveryData.description;
    }
    await newOrderRef.set(orderData);
    const newOrderId = newOrderRef.key;
    currentOrderId = newOrderId;
    await database.ref(`userOrders/${currentUser.id}/${currentOrderId}`).set(true);
    localStorage.setItem('current_order_id', currentOrderId);
    isSearching = true;

    // ⬇️ BARU: reset dirty state setelah submit sukses
    tariffChanged = false;
    updateConfirmButtonState();

    if (pickupCoord && pickupCoord.length === 2) {
        startShowingNearbyDrivers(pickupCoord[1], pickupCoord[0], 3);
    }

    if (offerTimerInterval) clearInterval(offerTimerInterval);
    if (cleanupInterval) clearInterval(cleanupInterval);
    offerTimerInterval = setInterval(() => { cleanupExpiredOffersCustomer(); }, 10000);
    cleanupInterval = offerTimerInterval;
    orderRef = database.ref(`orders/${currentOrderId}/status`);
    orderStatusCallback = (snap) => {
        const status = snap.val();
        if (status === 'cancelled' || status === 'cancelled_by_user' || status === 'timeout') {
            cleanupSearch();
            showToast('⚠️ Order dibatalkan', 'error');
        }
        else if (status === 'accepted') {
            cleanupSearch();
        }
    };
    orderRef.on('value', orderStatusCallback);
    offersRef = database.ref(`orders/${currentOrderId}/driver_offers`);
    offersCallback = (snap) => renderOffers(snap.val());
    offersRef.on('value', offersCallback);
}

async function cancelSearch() {
    if (!currentOrderId) { cleanupSearch(); localStorage.removeItem('current_order_id'); return; }
    try {
        await database.ref(`orders/${currentOrderId}`).update({ status: 'cancelled_by_user', cancelled_at: new Date().toISOString() });
        cleanupSearch();
        localStorage.removeItem('current_order_id');
        showToast('✅ Perjalanan berhasil dibatalkan', 'success');
    } catch(err) { showToast('❌ Gagal membatalkan order', 'error'); }
}

function cancelSearchHandler() { cancelSearch(); }

function cleanupSearch() {
    if (orderRef && orderStatusCallback) orderRef.off('value', orderStatusCallback);
    if (offersRef && offersCallback) offersRef.off('value', offersCallback);
    isSearching = false;
    document.getElementById('radar').style.display = 'none';
    document.getElementById('radar').classList.remove('expanding');
    document.getElementById('driverOffers').classList.remove('active');
    if (offerTimerInterval) { clearInterval(offerTimerInterval); offerTimerInterval = null; }
    if (cleanupInterval) { clearInterval(cleanupInterval); cleanupInterval = null; }

    // ⬇️ Stop timer
    clearBiddingTimer();

    stopShowingNearbyDrivers();
    switchToPickerMode();

    currentOrderId = null;
    deactivateRadarOnPickup();
    stopSlowZoomOut();
}

// ==================== INISIALISASI ====================
window.onload = async () => {
    console.log('📱 JeGo Rute Customer - window.onload');
    applyDarkMode();

    const loggedIn = await checkUserSession().catch(() => false);
    if (!loggedIn) return;

    await fetchTransportData();

    try {
        const keySnap = await database.ref('data-jego/apikey-google-maps').once('value');
        const apiKey = keySnap.val();
        if (apiKey) {
            await loadGoogleMaps(apiKey);
            console.log('✅ Google Maps berhasil dimuat dengan API key dari Firebase');
        } else {
            showToast('API key Google Maps tidak ditemukan', 'warning');
        }
    } catch (error) {
        console.error('❌ Gagal mengambil API key dari Firebase:', error);
        showToast('Gagal memuat Google Maps', 'error');
    }

    const orderActive = await cekOrderAktifDanRedirect();

    if (orderActive) {
        const loaded = await loadWaitingOrderData();
        if (!loaded) {
            const transportLoaded = await loadSelectedTransport();
            if (!transportLoaded) openVehicleOverlay();
            else await autoFillPickupLocation();
        }
    } else {
        const transportLoaded = await loadSelectedTransport();
        if (!transportLoaded) openVehicleOverlay();
        else await autoFillPickupLocation();
    }

    initBottomSheetDrag();

    const bsSearchBtn = document.getElementById('bsSearchBtn');
    if (bsSearchBtn) {
        bsSearchBtn.addEventListener('click', () => {
            if (!pickupCoord || !destCoord) {
                showToast('Lengkapi alamat dulu', 'warning');
                return;
            }
            confirmRoute();
        });
    }

    const confirmBtn = document.getElementById('confirmBtn');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', confirmRoute);
    }

    // ⬇️ Tombol "Cari lagi" saat timer habis
    const retryBtn = document.getElementById('retryBtn');
    if (retryBtn) {
        retryBtn.addEventListener('click', () => {
            // Bersihkan state & kembali ke picker
            cleanupSearch();
            localStorage.removeItem('current_order_id');
            resetBiddingUI();
            showToast('🔍 Silakan atur ulang & cari driver lagi', 'info');
        });
    }

    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', cancelSearchHandler);
    }

    const closeDriverOffers = document.getElementById('closeDriverOffers');
    if (closeDriverOffers) {
        closeDriverOffers.addEventListener('click', () => {
            document.getElementById('driverOffers').classList.remove('active');
        });
    }

    const negoMinus = document.getElementById('negoMinus');
    const negoPlus = document.getElementById('negoPlus');
    const negoInput = document.getElementById('negoInput');

    if (negoMinus && negoInput) {
        negoMinus.addEventListener('click', () => {
            let val = parseInt(negoInput.value) || 0;
            val = Math.max(0, val - 1000);
            negoInput.value = val;
            tariffChanged = true;    // ⬅️ user sudah mengubah tarif
            negoInput.dispatchEvent(new Event('input'));
        });
    }
    if (negoPlus && negoInput) {
        negoPlus.addEventListener('click', () => {
            let val = parseInt(negoInput.value) || 0;
            val = val + 1000;
            negoInput.value = val;
            tariffChanged = true;    // ⬅️ user sudah mengubah tarif
            negoInput.dispatchEvent(new Event('input'));
        });
    }

    // ⬇️ BARU: deteksi user mengetik manual di input nego
    if (negoInput) {
        negoInput.addEventListener('input', (e) => {
            if (e.isTrusted) {       // hanya event asli dari user
                tariffChanged = true;
                updateConfirmButtonState();
            }
        });
    }

    const pickerCard = document.getElementById('pickerVehicleCard');
    if (pickerCard) {
        pickerCard.addEventListener('click', openVehicleOverlay);
    }

    // Event listener picker offer input
    const pickerOfferInput = document.getElementById('pickerOfferInput');
    if (pickerOfferInput) {
        pickerOfferInput.addEventListener('input', () => {
            const val = parseInt(pickerOfferInput.value);
            const minVal = minAllowedNego || 0;

            if (isNaN(val) || val <= 0) {
                currentPrice = 0;
                pickerOfferInput.classList.add('error');
                return;
            }

            if (val < minVal) {
                pickerOfferInput.classList.add('error');
            } else {
                pickerOfferInput.classList.remove('error');
            }
            currentPrice = val;

            // Update harga di label auto-accept juga (2 tempat)
            updateAutoAcceptPriceLabels(val);
        });
    }

    // ⬇️ Toggle auto-accept handler — sinkron 2 toggle
    const autoAcceptToggle = document.getElementById('autoAcceptToggle');
    const autoAcceptToggleBidding = document.getElementById('autoAcceptToggleBidding');

    function syncAutoAcceptToggles(source) {
        const checked = source.checked;
        if (autoAcceptToggle) autoAcceptToggle.checked = checked;
        if (autoAcceptToggleBidding) autoAcceptToggleBidding.checked = checked;

        if (checked) {
            showToast('✅ Terima driver otomatis: ON', 'success');
        } else {
            showToast('❌ Terima driver otomatis: OFF', 'info');
        }
    }

    if (autoAcceptToggle) {
        autoAcceptToggle.addEventListener('change', () => syncAutoAcceptToggles(autoAcceptToggle));
    }
    if (autoAcceptToggleBidding) {
        autoAcceptToggleBidding.addEventListener('change', () => syncAutoAcceptToggles(autoAcceptToggleBidding));
    }

    document.getElementById('useMapPickBtn').addEventListener('click', confirmMapPick);
    document.getElementById('cancelMapPickBtn').addEventListener('click', cancelMapPick);
    document.getElementById('pickupInput').addEventListener('click', () => { if (!isSearching) openSearchOverlay('pickup'); });
    document.getElementById('destInput').addEventListener('click', () => { if (!isSearching) openSearchOverlay('destination'); });
    document.getElementById('viaInput').addEventListener('click', () => { if (!isSearching) openSearchOverlay('via'); });
    document.getElementById('clearViaBtn').addEventListener('click', clearViaPoint);

    document.getElementById('searchOverlayBack').addEventListener('click', closeSearchOverlay);
    document.getElementById('searchOverlayClear').addEventListener('click', () => {
        document.getElementById('searchOverlayInput').value = '';
        document.getElementById('searchOverlayClear').classList.remove('visible');
        document.getElementById('searchDefaultOptions').style.display = 'block';
        document.getElementById('searchResultList').style.display = 'none';
        document.getElementById('searchLoading').style.display = 'none';
        document.getElementById('searchOverlayInput').focus();
    });
    const searchInput = document.getElementById('searchOverlayInput');
    searchInput.addEventListener('input', () => {
        const val = searchInput.value;
        const clearBtn = document.getElementById('searchOverlayClear');
        if (val.length > 0) clearBtn.classList.add('visible');
        else clearBtn.classList.remove('visible');
        if (searchTimeout) clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            if (val.length >= 3) searchAddress(val);
        }, 700);
    });
    document.getElementById('useCurrentLocationBtn').addEventListener('click', useCurrentLocation);
    document.getElementById('pickFromMapBtn').addEventListener('click', pickFromMap);
    document.getElementById('searchOverlay').addEventListener('click', function(e) { if (e.target === this) closeSearchOverlay(); });

    document.getElementById('vehicleCloseBtn').addEventListener('click', closeVehicleOverlay);
    document.getElementById('vehicleOverlay').addEventListener('click', function(e) {
        if (e.target === this) closeVehicleOverlay();
    });

    console.log('✅ Semua event listeners terpasang, siap digunakan');
};
