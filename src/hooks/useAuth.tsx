import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Timestamp } from 'firebase/firestore';
import { auth } from '../firebase';
import { profilesService, UserProfile } from '../services/profiles';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  profile: null, 
  loading: true,
  refreshProfile: async () => {}
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    if (user) {
      const p = await profilesService.getProfile(user.uid, user.email || '');
      setProfile(p);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          const isSuperAdmin = firebaseUser.email === 'paulovictorsilva2301@gmail.com';

          // Garante que o token de auth está resolvido no SDK antes de chamar o Firestore.
          // Previne race condition do React Strict Mode (double-invocation de effects).
          await firebaseUser.getIdToken(false);

          let userProfile = await profilesService.ensureProfile(
            firebaseUser.uid,
            firebaseUser.email || '',
            firebaseUser.displayName || 'Usuário'
          );

          // Force admin role for the owner email as a fail-safe
          if (isSuperAdmin) {
            userProfile = { 
              ...userProfile, 
              role: 'ADMIN', 
              status: 'APPROVED',
              displayName: userProfile.displayName === 'Usuário' ? 'Paulo Victor' : userProfile.displayName
            };
          }

          setProfile(userProfile);
        } catch (error) {
          console.error("Profile initialization error:", error);
          
          // Fallback for SuperAdmin even on error
          if (firebaseUser.email === 'paulovictorsilva2301@gmail.com') {
            setProfile({
              uid: firebaseUser.uid,
              email: firebaseUser.email!,
              displayName: 'Paulo Victor',
              role: 'ADMIN',
              status: 'APPROVED',
              createdAt: Timestamp.now(),
              lastLogin: Timestamp.now()
            });
          }
        } finally {
          setLoading(false);
        }
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
