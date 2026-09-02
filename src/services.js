import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';
import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

const mapSnapshot = (snapshot) => snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));

export const subscribeProducts = (onData, onError) => onSnapshot(
  query(collection(db, 'products'), orderBy('createdAt', 'desc')),
  (snapshot) => onData(mapSnapshot(snapshot)),
  onError,
);

export const subscribeOrders = (onData, onError) => onSnapshot(
  query(collection(db, 'orders'), orderBy('createdAt', 'desc')),
  (snapshot) => onData(mapSnapshot(snapshot)),
  onError,
);

export const createProduct = (product) => addDoc(collection(db, 'products'), { ...product, createdAt: serverTimestamp() });

export const createOrder = (order) => addDoc(collection(db, 'orders'), { ...order, createdAt: serverTimestamp() });

export const signInAdmin = (email, password) => signInWithEmailAndPassword(auth, email, password);

export const registerCustomer = (email, password) => createUserWithEmailAndPassword(auth, email, password);

export const signInCustomer = (email, password) => signInWithEmailAndPassword(auth, email, password);

export const watchAuth = (onUser) => onAuthStateChanged(auth, onUser);

export const subscribeSettings = (onData, onError) => onSnapshot(doc(db, 'settings', 'store'), (snapshot) => onData(snapshot.data()), onError);

export const saveSettings = (settings) => setDoc(doc(db, 'settings', 'store'), settings, { merge: true });