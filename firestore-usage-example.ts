// firestore-usage-example.ts - Example of how to use Firestore with the new configuration
import { db, firestoreNetworkManager } from './firebase';
import { collection, addDoc, getDocs, onSnapshot, doc, setDoc } from 'firebase/firestore';

// Example: Add a document to Firestore
export const addExpense = async (expenseData: any) => {
  try {
    const docRef = await addDoc(collection(db, 'expenses'), {
      ...expenseData,
      createdAt: new Date(),
      networkStatus: firestoreNetworkManager.getNetworkStatus()
    });
    console.log('Expense added with ID: ', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error adding expense: ', error);
    throw error;
  }
};

// Example: Get all expenses
export const getExpenses = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'expenses'));
    const expenses = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return expenses;
  } catch (error) {
    console.error('Error getting expenses: ', error);
    throw error;
  }
};

// Example: Real-time listener for expenses
export const subscribeToExpenses = (callback: (expenses: any[]) => void) => {
  const unsubscribe = onSnapshot(collection(db, 'expenses'), (querySnapshot) => {
    const expenses = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(expenses);
  }, (error) => {
    // The error handling is now managed by our configuration
    console.warn('Firestore listener error (handled by configuration):', error);
  });

  return unsubscribe;
};

// Example: Check network status
export const checkNetworkStatus = () => {
  const isOnline = firestoreNetworkManager.getNetworkStatus();
  console.log('Firestore network status:', isOnline ? 'Online' : 'Offline');
  return isOnline;
};
