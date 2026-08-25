import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCAex1Vc1-wvHgCi5jeb-DdK5WZ0oEMyaU",
  authDomain: "palastore-turismo.firebaseapp.com",
  projectId: "palastore-turismo",
  storageBucket: "palastore-turismo.firebasestorage.app",
  messagingSenderId: "11613605003",
  appId: "1:11613605003:web:89412f68d6d9c92c57d88e",
  measurementId: "G-2LCFT76XWZ"
};

// Exportando o 'app' para que o seu buscador de hotéis consiga usá-lo!
export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);