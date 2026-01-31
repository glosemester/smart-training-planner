import { getToken, onMessage } from "firebase/messaging";
import { messaging } from "../config/firebase";

const VAPID_KEY = "BL-p_placeholder_you_need_to_generate_this_in_firebase_console";

export const requestNotificationPermission = async () => {
    if (!messaging) return null;

    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const token = await getToken(messaging, { vadidKey: VAPID_KEY });
            if (token) {
                console.log('FCM Token:', token);
                // Here you would typically save the token to DB (e.g., users collection)
                return token;
            }
        }
    } catch (error) {
        console.error('An error occurred while retrieving token:', error);
    }
    return null;
};

export const onMessageListener = () =>
    new Promise((resolve) => {
        if (!messaging) return;
        onMessage(messaging, (payload) => {
            console.log('Message received in foreground:', payload);
            resolve(payload);
        });
    });
