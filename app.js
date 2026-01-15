// ==========================================
// KONFIGURASI API
// ==========================================
const API_URL = 'https://script.google.com/macros/s/AKfycbzBM2CHOLIJ4yqiy2OvpqUoenBFSwHjnXdAIcQ5wsSykm4Se7sBM-JiED2Rmye0pvWz/exec';

// ==========================================
// STATE MANAGEMENT
// ==========================================
let currentUser = null;
let photoBase64 = null;
let stream = null;
let deferredPrompt = null;

// ==========================================
// INITIALIZATION
// ==========================================
window.onload = function() {
  const savedUser = localStorage.getItem('currentUser');
  if(savedUser) {
    currentUser = JSON.parse(savedUser);
    showMainApp();
  }
  
  // Set default date to today
  document.getElementById('tanggal').valueAsDate = new Date();
};

// ==========================================
// PWA INSTALL
// ==========================================
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  document.getElementById('installBtn').style.display = 'block';
});

function installPWA() {
  if(deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        showNotification('Aplikasi berhasil diinstall!', 'success');
      }
      deferredPrompt = null;
      document.getElementById('installBtn').style.display = 'none';
    });
  }
}

// ==========================================
// AUTHENTICATION
// ==========================================
async function login() {
  const username = document.getElementById('loginUsername').value;
  const password = document.getElementById('loginPassword').value;

  if(!username || !password) {
    showNotification('Username dan password harus diisi!', 'error');
    return;
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'login',
        username: username,
        password: password
      })
    });

    const result = await response.json();

    if(result.success) {
      currentUser = result.data;
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      showNotification('Login berhasil!', 'success');
      showMainApp();
    } else {
      showNotification(result.message, 'error');
    }
  } catch(error) {
    showNotification('Gagal connect ke server: ' + error.message, 'error');
  }
}

function logout() {
  if(confirm('Yakin ingin logout?')) {
    localStorage.removeItem('currentUser');
    currentUser = null;
    document.getElementById('mainApp').classList.add('hidden');
    document.getElementById('loginScreen').classList.remove('hidden');
    showNotification('Logout berhasil!', 'success');
  }
}

function showMainApp() {
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('mainApp').classList.remove('hidden');
  document.getElementById('userDisplay').textContent = `👤 ${currentUser.nama}`;
  loadHistory();
}

// ==========================================
// CAMERA FUNCTIONS
// ==========================================
async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: 'environment' } 
    });
    const video = document.getElementById('video');
    video.srcObject = stream;
    video.style.display = 'block';
    document.getElementById('canvas').style.display = 'none';
    document.getElementById('preview').classList.add('hidden');
    document.getElementById('captureBtn').disabled = false;
    photoBase64 = null;
  } catch(error) {
    showNotification('Tidak bisa akses kamera: ' + error.message, 'error');
  }
}

function capturePhoto() {
  const video = document.getElementById('video');
  const canvas = document.getElementById('canvas');
  const preview = document.getElementById('preview');
  
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
  
  photoBase64 = canvas.toDataURL('image/jpeg', 0.8);
  preview.src = photoBase64;
  preview.classList.remove('hidden');
  
  stopCamera();
  showNotification('Foto berhasil diambil!', 'success');
}

function resetCamera() {
  stopCamera();
  document.getElementById('preview').classList.add('hidden');
  photoBase64 = null;
  showNotification('Foto direset', 'success');
}

function stopCamera() {
  if(stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
  document.getElementById('video').style.display = 'none';
  document.getElementById('captureBtn').disabled = true;
}

// ==========================================
// SAVE DATA
// ==========================================
async function saveData() {
  const idPelanggan = document.getElementById('idPelanggan').value;
  const tanggal = document.getElementById('tanggal').value;
  const nama = document.getElementById('nama').value;
  const alamat = document.getElementById('alamat').value;
  const status = document.getElementById('status').value;
  const catatan = document.getElementById('catatan').value;

  if(!idPelanggan || !tanggal || !nama || !alamat || !status) {
    showNotification('Semua field wajib (*) harus diisi!', 'error');
    return;
  }

  const saveBtn = document.getElementById('saveBtn');
  saveBtn.disabled = true;
  saveBtn.textContent = '⏳ Menyimpan...';

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'saveData',
        userId: currentUser.userId,
        idPelanggan: idPelanggan,
        tanggal: tanggal,
        nama: nama,
        alamat: alamat,
        status: status,
        photoBase64: photoBase64,
        catatan: catatan
      })
    });

    const result = await response.json();

    if(result.success) {
      showNotification('✓ Data berhasil disimpan!', 'success');
      clearForm();
      loadHistory();
    } else {
      showNotification('Gagal simpan: ' + result.message, 'error');
    }
  } catch(error) {
    showNotification('Error: ' + error.message, 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = '💾 Simpan Data';
  }
}

function clearForm() {
  document.getElementById('idPelanggan').value = '';
  document.getElementById('tanggal').valueAsDate = new Date();
  document.getElementById('nama').value = '';
  document.getElementById('alamat').value = '';
  document.getElementById('status').value = '';
  document.getElementById('catatan').value = '';
  resetCamera();
}

// ==========================================
// LOAD HISTORY
// ==========================================
async function loadHistory() {
  const historyList = document.getElementById('historyList');
  historyList.innerHTML = '<div class="loading"><div class="spinner"></div>Memuat data...</div>';

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'getHistory',
        userId: currentUser.userId,
        role: currentUser.role,
        limit: 50
      })
    });

    const result = await response.json();

    if(result.success) {
      const records = result.data.records;
      
      if(records.length === 0) {
        historyList.innerHTML = '<div style="text-align:center; padding:40px; color:#999;">Belum ada data</div>';
        return;
      }

      let html = '';
      records.forEach(record => {
        const statusClass = record.status.toLowerCase().replace('-', '');
        const date = new Date(record.createdAt).toLocaleString('id-ID');
        
        html += `
          <div class="history-item" onclick="viewDetail('${record.recordId}')">
            <div class="history-date">${date}</div>
            <div class="history-name">${record.nama}</div>
            <div class="history-id">ID: ${record.idPelanggan}</div>
            <div class="history-id">${record.alamat}</div>
            <span class="status-badge status-${statusClass}">${record.status}</span>
          </div>
        `;
      });

      historyList.innerHTML = html;
    } else {
      historyList.innerHTML = '<div style="text-align:center; padding:40px; color:#f44336;">Gagal memuat data</div>';
    }
  } catch(error) {
    historyList.innerHTML = '<div style="text-align:center; padding:40px; color:#f44336;">Error: ' + error.message + '</div>';
  }
}

function viewDetail(recordId) {
  showNotification('Detail untuk ' + recordId, 'success');
  // Implement detail view later
}

// ==========================================
// NAVIGATION
// ==========================================
function switchScreen(screen) {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => item.classList.remove('active'));

  if(screen === 'form') {
    document.getElementById('formScreen').classList.remove('hidden');
    document.getElementById('historyScreen').classList.add('hidden');
    navItems[0].classList.add('active');
  } else if(screen === 'history') {
    document.getElementById('formScreen').classList.add('hidden');
    document.getElementById('historyScreen').classList.remove('hidden');
    navItems[1].classList.add('active');
    loadHistory();
  }
}

// ==========================================
// NOTIFICATION
// ==========================================
function showNotification(message, type = 'success') {
  const notification = document.getElementById('notification');
  notification.textContent = message;
  notification.className = `notification ${type} show`;
  
  setTimeout(() => {
    notification.classList.remove('show');
  }, 3000);
}

// Request notification permission
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}