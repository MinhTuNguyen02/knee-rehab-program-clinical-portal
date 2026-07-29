importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyCT34qWD_Jdq5zmLDWpkHLNqPEm4qVhmY4",
    authDomain: "nmtu-5a916.firebaseapp.com",
    projectId: "nmtu-5a916",
    storageBucket: "nmtu-5a916.firebasestorage.app",
    messagingSenderId: "197861340282",
    appId: "1:197861340282:web:13c17b4033974419bf37c3"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification ? payload.notification.title : 'New Notification';
    const notificationOptions = {
        body: payload.notification ? payload.notification.body : '',
        icon: '/favicon.ico',
        data: payload.data,
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
