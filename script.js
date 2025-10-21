const scriptURL = "https://script.google.com/macros/s/AKfycbwF8ojwwGwpUlkJGrXJ9xG2C0oSo1h8ybppSRTJ4wJ_7vY_pc1mhtRVLzgpo1uvmpav/exec";

const statusEl = document.getElementById("status");
const btnStart = document.getElementById("btnStart");
const btnStop = document.getElementById("btnStop");

let html5QrCode = null;
let currentId = null;

function ping(type="ok"){
  try { navigator.vibrate && navigator.vibrate(type==="ok" ? 40 : 120); } catch {}
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const o = ctx.createOscillator(); const g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  o.type = "triangle"; o.frequency.value = (type==="ok"? 880 : 220);
  g.gain.setValueAtTime(0.0001, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.20);
  o.start(); setTimeout(()=>{ o.stop(); ctx.close(); }, 210);
}

function setStatus(html, mode){
  statusEl.className = '';
  let cls = 'badge ';
  if     (mode==='ok')   cls += 'ok';
  else if (mode==='warn') cls += 'warn';
  else if (mode==='err')  cls += 'err';
  else                    { statusEl.textContent = html; return; }
  statusEl.innerHTML = `<span class="${cls}">${html}</span>`;
}

async function start(){
  try {
    if (html5QrCode) await stop();
    html5QrCode = new Html5Qrcode("reader");

    const camConstraint = { facingMode: "environment" };

    await html5QrCode.start(camConstraint, { fps: 12, qrbox: 280 }, onScanSuccess);
    document.querySelector('.stage').classList.add('ring');
    setStatus('Cámara iniciada. Escanea un QR.');
  } catch (e) {
    setStatus('Error al iniciar cámara: ' + e + '. Intentando cámara por defecto...', 'warn');
    try{
      await html5QrCode.start({},{ fps: 12, qrbox: 280 }, onScanSuccess);
      document.querySelector('.stage').classList.add('ring');
      setStatus('Cámara iniciada. Escanea un QR.');
    } catch(e2){
      setStatus('Fallo al iniciar cualquier cámara. Asegúrate de tener permisos: ' + e2, 'err');
    }
  }
}

async function stop(){
  try {
    if (html5QrCode && html5QrCode.isScanning){
      await html5QrCode.stop(); await html5QrCode.clear();
    }
    html5QrCode = null;
    document.querySelector('.stage').classList.remove('ring');
    setStatus('Cámara detenida.');
  } catch (e) {
    setStatus('Error al detener cámara: ' + e, 'err');
  }
}

function onScanSuccess(decodedText){
  if (!decodedText || decodedText === currentId) return;
  currentId = decodedText;
  setStatus('Enviando ID: ' + decodedText + ' …');

  fetch(`${scriptURL}?doc=${encodeURIComponent(decodedText)}`, { cache:'no-store' })

    .then(async res => {
      const txt = await res.text();
      try{
        const data = JSON.parse(txt);
        if (data.ok){
          if (data.dup){
            ping('warn');
            setStatus(`⚠️ Ya registrado hoy: ${data.nombre} (${data.curso})`, 'warn');
          }else{
            ping('ok');
            setStatus(`✅ Asistencia de ${data.nombre} (${data.curso}) registrada.`, 'ok');
          }
        }else{
          ping('err');
          setStatus('❌ ' + (data.error || 'Desconocido'), 'err');
        }
      }catch{
        ping('err');
        setStatus('❌ Respuesta no-JSON: ' + txt.slice(0,120) + ' …', 'err');
      }
      setTimeout(()=> currentId = null, 1400);
    })
    .catch(err => {
      ping('err');
      setStatus('❌ Failed to fetch: ' + err.message, 'err');
      setTimeout(()=> currentId = null, 1400);
    });
}

btnStart.addEventListener('click', start);
btnStop .addEventListener('click', stop);

start();
