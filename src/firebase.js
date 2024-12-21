import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AlzaSyAZAvntnhQdktxlBKr4KEyyh-8cOmiptH0", // Use the Web API Key from your Firebase project
  authDomain: "esp32-f1440.firebaseapp.com",        // Replace with your authDomain
  databaseURL: "https://esp32-f1440-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "esp32-f1440",
  storageBucket: "esp32-f1440.appspot.com",         // Replace if you set a storage bucket
  messagingSenderId: "940055745237",                // Replace with your Messaging Sender ID
  appId: "1:940055745237:web:someappid"             // Replace with your App ID from Firebase settings
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const rtdb = getDatabase(app)      // เน้นว่าชื่อ rtdb
export const fsdb = getFirestore(app)
