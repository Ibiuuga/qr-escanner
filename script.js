const scriptURL = "https://script.google.com/macros/s/AKfycbwkU1LW7ac243VFPpZAyDlWC7fQihMxyEknVIGvb5Oq33jgvAKAAz_3xCSZaY78yocP/exec";

let html5QrCode;
let cameraId = null;

async function loadCameras() {
  try {
    // solicita permiso de cámara explícitamente antes de listar dispositivos
    await navigator.mediaDevices.getUserMedia({ video: true });
    const devices = await Html5Qrcode.getCameras();
    const select = document.getElementById('cams');
    select.innerHTML = '';
    devices.forEach((d) => {
      const option = document.createElement('option');
      option.value = d.id;
      option.text = d.label || `Cámara ${select.length + 1}`;
      select.appendChild(option);
    });
    if (devices.length > 0) {
      cameraId = devices[0].id;
      updateStatus('Cámaras detectadas: ' + devices.length, 'green');
    } else {
      updateStatus('No se detectaron cámaras.', 'red');
    }
  } catch (err) {
    updateStatus('Error al acceder a la cámara: ' + err.message, 'red');
  }
}

document.getElementById('cams').addEventListener('change', (e) => {
  cameraId = e.target.value;
});

document.getElementById('btnStart').addEventListener('click', async () => {
  try {
    if (!cameraId) await loadCameras();
    if (!cameraId) return updateStatus('No se detectó cámara.', 'red');

    const reader = document.getElementById('reader');
    html5QrCode = new Html5Qrcode(reader.id);

    await html5QrCode.start(
      cameraId,
      { fps: 10, qrbox: 250 },
      (decodedText) => onScanSuccess(decodedText)
    );
    updateStatus('Escaneando...', 'yellow');
  } catch (err) {
    updateStatus('Error al iniciar cámara: ' + err.message, 'red');
  }
});

document.getElementById('btnStop').addEventListener('click', async () => {
  if (html5QrCode) {
    await html5QrCode.stop();
    await html5QrCode.clear();
    updateStatus('Escaneo detenido.', 'gray');
  }
});

async function onScanSuccess(data) {
  updateStatus('Código leído. Enviando...', 'yellow');
  try {
    const response = await fetch(scriptURL + '?id=' + encodeURIComponent(data));
    const result = await response.json();
    if (result.status === 'success') {
      navigator.vibrate?.(100);
      updateStatus('Registrado ✅', 'green');
    } else {
      updateStatus('Error: ' + result.message, 'red');
    }
  } catch (e) {
    updateStatus('Error de conexión.', 'red');
  }
}

function updateStatus(text, color) {
  const el = document.getElementById('status');
  el.textContent = text;
  el.style.color = color;
}

window.addEventListener('load', loadCameras);
