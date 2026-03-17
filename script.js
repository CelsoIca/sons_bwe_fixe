// CONFIGURAÇÃO FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyBhZrKmbz3UKEfjdBlc9OI3lh1y9_OG5aw",
  authDomain: "sons-bwe-fixes-a543b.firebaseapp.com",
  projectId: "sons-bwe-fixes-a543b",
  storageBucket: "sons-bwe-fixes-a543b.firebasestorage.app",
  messagingSenderId: "25559012829",
  appId: "1:25559012829:web:ce469fbf416d8d8d975234",
  measurementId: "G-7Q13H5SRQS"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// CONTROLO DO MENU
const sideMenu = document.getElementById('side-menu');
function toggleMenu() {
    sideMenu.classList.toggle('hidden');
    sideMenu.classList.toggle('flex');
}

// PLAYER LOGIC
let playlist = [];
let indexMusica = 0;
const audio = document.getElementById('main-audio');

function carregarPlaylist() {
    db.collection("playlist").orderBy("ordem", "asc").onSnapshot(snap => {
        playlist = snap.docs.map(doc => doc.data());
        if (playlist.length > 0) renderizarMusica(0);
        renderLista();
    });
}

function renderizarMusica(i) {
    const m = playlist[i];
    document.getElementById('main-title').innerText = m.titulo;
    document.getElementById('main-artist').innerText = m.artista;
    audio.src = m.url;
    document.getElementById('main-cover').src = m.capa || 'assets/default.png';
}

// Inicialização
if (document.getElementById('main-audio')) carregarPlaylist();