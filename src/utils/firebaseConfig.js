// Firebase Configuration
// Buat project Firebase di https://console.firebase.google.com/
// 1. Tambah project → Web → Daftarkan app
// 2. Copy konfigurasi di bawah ini
// 3. Enable Firestore Database di Firebase Console
// 4. Atur rules: allow read, write: if true (testing) atau pakai auth

// appId sementara (Android), untuk web ganti dengan appId dari Firebase Console
// Masuk Firebase Console → Project Settings → Tambah App Web → copy config lengkap
const firebaseConfig = {
  apiKey: 'AIzaSyB6OHLQC6qaRCjcmt99_Lk5tPnSrGswNmY',
  authDomain: 'app-smpjdc.firebaseapp.com',
  projectId: 'app-smpjdc',
  storageBucket: 'app-smpjdc.firebasestorage.app',
  messagingSenderId: '101515885137',
  appId: '1:101515885137:web:xxx' // GANTI dengan appId web dari Firebase Console
};

// Jika apiKey kosong, Firebase tidak akan diaktifkan
// dan aplikasi tetap pakai localStorage seperti biasa
export const isFirebaseConfigured = () => {
  return firebaseConfig.apiKey && firebaseConfig.projectId;
};

export default firebaseConfig;
