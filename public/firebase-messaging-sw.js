importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyDwwiVT-WYDrggqs1GDjbEIoG-b5i7MYVw",
    authDomain: "smart-training-app-8bed1.firebaseapp.com",
    projectId: "smart-training-app-8bed1",
    storageBucket: "smart-training-app-8bed1.firebasestorage.app",
    messagingSenderId: "94725606659",
    appId: "1:94725606659:web:7e6120c361a594f687ad36"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/icons/icon-192x192.png'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
