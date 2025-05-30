"use client"

import { initializeApp } from "firebase/app"
import { getDatabase } from "firebase/database"

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDEypic6uDWzXYkFaG5nK9YE3_FbBRpb-Y",
  authDomain: "fc-mollan.firebaseapp.com",
  projectId: "fc-mollan",
  storageBucket: "fc-mollan.firebasestorage.app",
  messagingSenderId: "999790503958",
  appId: "1:999790503958:web:76f5d293bb7be586b4ad37",
  databaseURL: "https://fc-mollan-default-rtdb.europe-west1.firebasedatabase.app", // Add this line for Realtime Database
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const database = getDatabase(app)

export { app, database }
