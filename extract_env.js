const fs = require('fs');
try {
    const config = JSON.parse(fs.readFileSync('sdkconfig_full.json', 'utf8'));
    const r = config.result.sdkConfig;
    console.log(`VITE_FIREBASE_API_KEY=${r.apiKey}`);
    console.log(`VITE_FIREBASE_AUTH_DOMAIN=${r.authDomain}`);
    console.log(`VITE_FIREBASE_PROJECT_ID=${r.projectId}`);
    console.log(`VITE_FIREBASE_STORAGE_BUCKET=${r.storageBucket}`);
    console.log(`VITE_FIREBASE_MESSAGING_SENDER_ID=${r.messagingSenderId}`);
    console.log(`VITE_FIREBASE_APP_ID=${r.appId}`);
} catch (e) {
    console.error(e);
}
