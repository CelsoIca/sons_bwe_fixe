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

// Substitui pelo teu código real do ImgBB
const IMGBB_API_KEY = 'b0f9a034a766f6b052c4b537e0b1d2e6'; 

async function uploadParaImgBB(file) {
    // 1. Criar o formulário de envio
    const formData = new FormData();
    formData.append('image', file);

    try {
        // 2. Enviar para o servidor do ImgBB
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            console.log("Upload feito com sucesso: ", data.data.url);
            return data.data.url; // Este é o link direto da imagem (.jpg ou .png)
        } else {
            throw new Error("Erro no ImgBB: " + data.error.message);
        }
    } catch (error) {
        console.error("Erro ao carregar imagem:", error);
        return null;
    }
}

// 3. LOGICA DO MENU LATERAL (Funciona em todas as páginas)
document.addEventListener('DOMContentLoaded', () => {
    const sideMenu = document.getElementById('side-menu');
    const openBtn = document.getElementById('open-menu');
    const closeBtn = document.getElementById('close-menu');
    const menuX = document.getElementById('menu-x');

    if (openBtn) openBtn.onclick = () => sideMenu.classList.remove('hidden');
    if (closeBtn) closeBtn.onclick = () => sideMenu.classList.add('hidden');
    if (menuX) menuX.onclick = () => sideMenu.classList.add('hidden');
});

// 4. FUNÇÃO UPLOAD IMGBB
async function uploadParaImgBB(file) {
    const formData = new FormData();
    formData.append('image', file);
    try {
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        return data.success ? data.data.url : null;
    } catch (e) { return null; }
}

// 5. PLAYER GLOBAL (Só roda se os elementos existirem na página)
let playlist = [];
let indexMusica = 0;
const audio = document.getElementById('main-audio');

if (audio) {
    db.collection("playlist").orderBy("ordem", "asc").onSnapshot(snap => {
        playlist = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (playlist.length > 0) renderizarMusica(0);
    });
}

function renderizarMusica(i) {
    const m = playlist[i];
    document.getElementById('main-title').innerText = m.titulo;
    document.getElementById('main-artist').innerText = m.artista;
    audio.src = m.url;
    document.getElementById('main-cover').src = m.capa || '../assets/default.png';
}

// 6. LOGOUT
function logout() {
    auth.signOut().then(() => window.location.href = "../index.html");
}
