import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';
import { auth, isFirebaseConfigured } from '../lib/firebase';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isDemoMode: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  logOut: () => Promise<void>;
}

const DEMO_EMAIL = 'admin@peepo.local';
const DEMO_PASSWORD = 'peepo123';
const DEMO_STORAGE_KEY = 'peepo-orders-demo-user';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      const demoUser = localStorage.getItem(DEMO_STORAGE_KEY);
      if (demoUser) {
        setUser(JSON.parse(demoUser) as User);
      }
      setLoading(false);
      return undefined;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    isDemoMode: !isFirebaseConfigured,
    async signIn(email, password) {
      if (!isFirebaseConfigured || !auth) {
        if (email !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
          throw new Error('Credenciales demo invalidas.');
        }

        const demoUser = {
          uid: 'demo-admin',
          email: DEMO_EMAIL,
          displayName: 'Demo Admin',
        } as User;

        localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(demoUser));
        setUser(demoUser);
        return;
      }

      await signInWithEmailAndPassword(auth, email, password);
    },
    async logOut() {
      if (!isFirebaseConfigured || !auth) {
        localStorage.removeItem(DEMO_STORAGE_KEY);
        setUser(null);
        return;
      }

      await signOut(auth);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }

  return context;
}
