const audio = document.getElementById('main-audio');
const playBtn = document.getElementById('play-btn');
const progressBar = document.getElementById('progress-bar');
const volumeSlider = document.getElementById('volume-slider');
const trackItems = document.querySelectorAll('.track-item');
let isPlaying = false;
let showRemaining = false;

// CONTROLO PLAY/PAUSE
function togglePlay() {
    const cover = document.getElementById('main-cover');
    if (audio.paused) {
        audio.play();
        isPlaying = true;
        playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
        cover.classList.add('disk');
        cover.classList.remove('paused');
    } else {
        audio.pause();
        isPlaying = false;
        playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
        cover.classList.add('paused');
    }
}

playBtn.addEventListener('click', togglePlay);

// CARREGAR MÚSICA
function loadTrack(item) {
    const src = item.getAttribute('data-src');
    const cover = item.getAttribute('data-cover');
    const title = item.querySelector('h4').innerText;
    const artist = item.querySelector('p').innerText;

    audio.src = src;
    document.getElementById('main-cover').src = cover;
    document.getElementById('main-title').innerText = title;
    document.getElementById('main-artist').innerText = artist;
    document.getElementById('browser-title').innerText = `🎵 ${title}`;

    trackItems.forEach(i => i.classList.remove('active', 'bg-white/10'));
    item.classList.add('active', 'bg-white/10');

    audio.play();
    isPlaying = true;
    playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
    document.getElementById('main-cover').classList.add('disk');
}

trackItems.forEach(item => item.addEventListener('click', () => loadTrack(item)));

// NAVEGAÇÃO
function changeTrack(direction) {
    const tracks = Array.from(trackItems);
    let index = tracks.findIndex(t => t.classList.contains('active'));
    if (direction === 'next') index = (index + 1) % tracks.length;
    else index = (index - 1 + tracks.length) % tracks.length;
    loadTrack(tracks[index]);
}

document.getElementById('next-btn').addEventListener('click', () => changeTrack('next'));
document.getElementById('prev-btn').addEventListener('click', () => changeTrack('prev'));

// BARRA DE PROGRESSO E TEMPO
audio.addEventListener('timeupdate', () => {
    const percent = (audio.currentTime / audio.duration) * 100;
    progressBar.value = percent || 0;
    document.getElementById('time-current').innerText = formatTime(audio.currentTime);
    
    const totalDisplay = document.getElementById('time-total');
    if (showRemaining) {
        totalDisplay.innerText = "-" + formatTime(audio.duration - audio.currentTime);
    } else {
        totalDisplay.innerText = formatTime(audio.duration || 0);
    }
});

progressBar.addEventListener('input', (e) => {
    audio.currentTime = (e.target.value / 100) * audio.duration;
});

document.getElementById('time-total').addEventListener('click', () => { showRemaining = !showRemaining; });

function formatTime(s) {
    if (isNaN(s)) return "00:00";
    const min = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${min < 10 ? '0' + min : min}:${sec < 10 ? '0' + sec : sec}`;
}

// VOLUME E ATALHOS
volumeSlider.addEventListener('input', (e) => {
    audio.volume = e.target.value;
    const icon = document.getElementById('volume-icon');
    if (audio.volume == 0) icon.className = "fa-solid fa-volume-xmark text-red-500";
    else if (audio.volume < 0.5) icon.className = "fa-solid fa-volume-low";
    else icon.className = "fa-solid fa-volume-high";
});

window.addEventListener('keydown', (e) => {
    if (e.code === "Space") { e.preventDefault(); togglePlay(); }
    if (e.code === "ArrowRight") changeTrack('next');
    if (e.code === "ArrowLeft") changeTrack('prev');
});

// BUSCA NA PLAYLIST
document.getElementById('search-input').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    trackItems.forEach(item => {
        const text = item.innerText.toLowerCase();
        item.style.display = text.includes(term) ? "flex" : "none";
    });
});

// UI: TEMAS, ALERTA E MODAL
function setTheme(theme) {
    const colors = { blue: '#3b82f6', purple: '#a855f7', emerald: '#10b981', rose: '#f43f5e' };
    document.documentElement.style.setProperty('--primary-color', colors[theme]);
    document.documentElement.style.setProperty('--shadow-color', colors[theme] + '80');
    localStorage.setItem('savedTheme', theme);
}

function toggleDonateModal() { document.getElementById('donate-modal').classList.toggle('hidden'); document.getElementById('donate-modal').classList.toggle('flex'); }
function closeAlert() { document.getElementById('top-alert-bar').style.display = 'none'; }
function copyPix() {
    navigator.clipboard.writeText(document.getElementById('pix-key').innerText);
    const toast = document.getElementById('copy-toast');
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
}

// CONTACT FORM SIMULATION
document.getElementById('contact-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const btn = document.getElementById('submit-btn');
    btn.innerHTML = 'Enviando... <i class="fa-solid fa-spinner animate-spin"></i>';
    setTimeout(() => {
        alert("Mensagem enviada com sucesso para Sons Bwé Fixe!");
        btn.innerHTML = 'Enviar Mensagem <i class="fa-solid fa-paper-plane text-xs"></i>';
        this.reset();
    }, 2000);
});

// AO CARREGAR
window.onload = () => {
    const saved = localStorage.getItem('savedTheme');
    if (saved) setTheme(saved);
};