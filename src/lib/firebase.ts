import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  onSnapshot, 
  setDoc, 
  getDoc 
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDKIRdn8PUrB-ncxRfaJBofupmlgfygZ6I",
  authDomain: "phintl.firebaseapp.com",
  projectId: "phintl",
  storageBucket: "phintl.firebasestorage.app",
  messagingSenderId: "606365527212",
  appId: "1:606365527212:web:bf3a7371aa3245d08ac309",
  measurementId: "G-P2S8YJ7SYQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

/**
 * Subscribes to a document in Firestore. 
 * If it doesn't exist, seeds it with the initial value from the callback.
 */
export function subscribeToDoc<T>(
  docName: string,
  key: string,
  onUpdate: (data: T, updatedAt?: number) => void,
  getInitialState: () => T
) {
  const docRef = doc(db, 'pharmintl_state', docName);
  
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      const updatedAt = typeof data?.updatedAt === 'number' ? data.updatedAt : undefined;
      if (data && data[key] !== undefined) {
        onUpdate(data[key], updatedAt);
      } else {
        // Document exists but the specific key is missing.
        // Seed it with the default/initial state so other clients can also sync.
        const initial = getInitialState();
        onUpdate(initial);
        setDoc(docRef, { [key]: initial, updatedAt: Date.now() }, { merge: true }).catch(err => {
          console.warn(`Failed to seed missing key ${key} for ${docName}:`, err);
        });
      }
    } else {
      // Document does not exist on the Firestore server yet.
      // Seed it with the current default/initial state so other clients can also sync.
      const initial = getInitialState();
      onUpdate(initial);
      setDoc(docRef, { [key]: initial, updatedAt: Date.now() }).catch(err => {
        console.warn(`Failed to seed default state for ${docName}:`, err);
      });
    }
  }, (err) => {
    console.error(`Error listening to ${docName} changes:`, err);
  });
}

/**
 * Saves or updates a specific state value in a Firestore document.
 */
export async function saveToDoc<T>(docName: string, key: string, value: T, updatedAt?: number) {
  const ts = updatedAt || Date.now();
  try {
    const docRef = doc(db, 'pharmintl_state', docName);
    await setDoc(docRef, { [key]: value, updatedAt: ts }, { merge: true });
  } catch (err) {
    console.error(`Error saving ${docName} to cloud database:`, err);
  }

  // Dual-sync with local Express server to guarantee cross-tab/cross-user consistency
  try {
    let apiPath = '';
    let body = {};
    if (docName === 'chat') {
      apiPath = '/api/chat-messages';
      body = { chatMessages: value, updatedAt: ts };
    } else if (docName === 'tasks') {
      apiPath = '/api/tasks';
      body = { tasks: value, updatedAt: ts };
    } else if (docName === 'notifications') {
      apiPath = '/api/notifications';
      body = { notifications: value, updatedAt: ts };
    } else if (docName === 'calendar_markings') {
      apiPath = '/api/calendar-markings';
      body = { calendarMarkings: value, updatedAt: ts };
    } else if (docName === 'employees') {
      apiPath = '/api/employees';
      body = { employees: value, updatedAt: ts };
    } else if (docName === 'journal') {
      apiPath = '/api/journal';
      body = { journalArticles: value, updatedAt: ts };
    } else if (docName === 'featured_text') {
      apiPath = '/api/featured';
      body = { featuredText: value, updatedAt: ts };
    } else if (docName === 'featured_image') {
      apiPath = '/api/featured';
      body = { featuredImage: value, updatedAt: ts };
    }

    if (apiPath) {
      await fetch(apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    }
  } catch (err) {
    console.error(`Error dual-saving ${docName} to local Express server:`, err);
  }
}
