import { initializeApp } from 'firebase/app';
// import { getAuth } from 'firebase/auth'; // Unavailable in Expo Go usage without extra setup usually, but JS SDK works.
// Note: For Expo Go, we use the JS SDK entirely.

const firebaseConfig = {
    apiKey: "AIzaSyBWksaDxzx87mlTs5VK9A2c86YY6PVrrrw", // Using Web Key for JS SDK
    authDomain: "saferoutex-b537a.firebaseapp.com",
    projectId: "saferoutex-b537a",
    storageBucket: "saferoutex-b537a.firebasestorage.app",
    messagingSenderId: "181152676678",
    appId: "1:181152676678:web:2c56ae4acc668f30510347",
    measurementId: "G-ZH3S606XKZ"
};

const app = initializeApp(firebaseConfig);

export { app };
