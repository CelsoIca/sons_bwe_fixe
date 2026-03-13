// Seleção de Elementos
const audio = document.getElementById('main-audio');
const playBtn = document.getElementById('play-btn');
const playIcon = playBtn.querySelector('i');
const progressBar = document.getElementById('progress-bar');
const mainTitle = document.getElementById('main-title');
const mainArtist = document.getElementById('main-artist');
const mainCover = document.getElementById('main-cover');
const visualizer = document.getElementById('visualizer');
const bars = document.querySelectorAll('.bar');
const viewCounter = document.getElementById('view-counter');
const viewIcon = document.getElementById('view-icon');

let isPlaying = false;
let views = 12420;

// 1. Lógica de Play/Pause
playBtn.addEventListener('click', togglePlay);

function togglePlay() {
    if (!audio.src || audio.src === window.location.href) {
        const firstTrack = document.querySelector('.track-item');
        if (firstTrack) loadTrack(firstTrack);
    }

    if (audio.paused) {
        audio.play();
        isPlaying = true;
        updateUI(true);
    } else {
        audio.pause();
        isPlaying = false;
        updateUI(false);
    }
}

// 2. Carregar Música da Playlist
document.querySelectorAll('.track-item').forEach(item => {
    item.addEventListener('click', () => loadTrack(item));
});

function loadTrack(item) {
    const src = item.getAttribute('data-src');
    const title = item.querySelector('h4').innerText;
    const artist = item.querySelector('p').innerText;
    const cover = item.querySelector('img').src;

    mainTitle.style.opacity = '0';
    mainCover.style.opacity = '0';

    setTimeout(() => {
        audio.src = src;
        mainTitle.innerText = title;
        mainArtist.innerText = artist;
        mainCover.src = cover;
        mainTitle.style.opacity = '1';
        mainCover.style.opacity = '1';
        audio.play();
        isPlaying = true;
        updateUI(true);
    }, 300);
}

// 3. Atualizar Interface
function updateUI(playing) {
    if (playing) {
        playIcon.classList.replace('fa-play', 'fa-pause');
        playBtn.classList.add('shadow-purple-500/50');
        visualizer.classList.replace('opacity-0', 'opacity-100');
        bars.forEach(bar => bar.classList.add('bar-animate'));
    } else {
        playIcon.classList.replace('fa-pause', 'fa-play');
        playBtn.classList.remove('shadow-purple-500/50');
        visualizer.classList.replace('opacity-100', 'opacity-0');
        bars.forEach(bar => bar.classList.remove('bar-animate'));
    }
}

// 4. Barra de Progresso e Tempo Real
audio.addEventListener('timeupdate', () => {
    const percent = (audio.currentTime / audio.duration) * 100;
    progressBar.style.width = `${percent}%`;

    const m = Math.floor(audio.currentTime / 60);
    const s = Math.floor(audio.currentTime % 60);
    document.getElementById('time-current').innerText = `${m}:${s < 10 ? '0'+s : s}`;
});

audio.addEventListener('loadedmetadata', () => {
    const m = Math.floor(audio.duration / 60);
    const s = Math.floor(audio.duration % 60);
    document.getElementById('time-total').innerText = `${m}:${s < 10 ? '0'+s : s}`;
});

// 5. Contador de Visualizações Cronológicas
setInterval(() => {
    if (isPlaying) {
        views += Math.floor(Math.random() * 3) + 1;
        viewCounter.innerText = `${views.toLocaleString('pt-BR')} views`;
        viewIcon.classList.add('scale-150', 'text-white');
        setTimeout(() => viewIcon.classList.remove('scale-150', 'text-white'), 300);
    }
}, 5000);

// 6. Download
document.getElementById('download-btn').addEventListener('click', () => {
    if (audio.src) {
        const a = document.createElement('a');
        a.href = audio.src;
        a.download = `${mainTitle.innerText}.mp3`;
        a.click();
    }
});

// 7. Share
document.getElementById('share-btn').addEventListener('click', () => {
    if (navigator.share) {
        navigator.share({ title: mainTitle.innerText, url: window.location.href });
    } else {
        alert('Link copiado!');
    }
});