import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  serverTimestamp,
  Timestamp,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase';

export type UserRole = 'ADMIN' | 'EDITOR' | 'VIEWER';
export type UserStatus = 'PENDING' | 'APPROVED' | 'BLOCKED';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Timestamp;
  lastLogin: Timestamp;
}

export const profilesService = {
  async getProfile(uid: string, email?: string): Promise<UserProfile | null> {
    const docRef = doc(db, 'profiles', uid);
    const docSnap = await getDoc(docRef);
    
    // If profile exists, ensure SuperAdmin status is up to date
    if (docSnap.exists()) {
      const currentData = docSnap.data() as UserProfile;
      const isSuperAdmin = email === 'paulovictorsilva2301@gmail.com';
      
      if (isSuperAdmin && (currentData.role !== 'ADMIN' || currentData.status !== 'APPROVED')) {
        await updateDoc(docRef, {
          role: 'ADMIN',
          status: 'APPROVED',
          lastLogin: serverTimestamp()
        });
        return { ...currentData, role: 'ADMIN', status: 'APPROVED' } as UserProfile;
      }

      // Update last login in background
      updateDoc(docRef, { lastLogin: serverTimestamp() }).catch(err => console.warn("Last login update failed:", err));
      return { ...currentData, uid } as UserProfile;
    }

    // If not found by UID, try finding by email (for pre-approvals)
    if (email) {
      const preId = `pre_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
      try {
        const preSnap = await getDoc(doc(db, 'profiles', preId));
        if (preSnap.exists()) {
          const data = preSnap.data() as UserProfile;
          return { ...data, uid: preId };
        }
      } catch (err) {
        // Silently fail if pre-approval doesn't exist or isn't accessible
        console.warn("Pre-approval check skipped:", err);
      }
    }

    return null;
  },

  async ensureProfile(uid: string, email: string, displayName: string): Promise<UserProfile> {
    try {
      const existing = await this.getProfile(uid, email);
      if (existing) {
        // If the existing profile was a pre-approval (different UID), we need to migrate it
        if (existing.uid !== uid) {
          const newProfile: UserProfile = {
            ...existing,
            uid,
            displayName: displayName || existing.displayName,
            lastLogin: serverTimestamp() as any
          };
          await setDoc(doc(db, 'profiles', uid), newProfile);
          // Delete old pre-approval doc to keep it clean
          await deleteDoc(doc(db, 'profiles', existing.uid));
          return newProfile;
        }

        // Normal update
        try {
          await updateDoc(doc(db, 'profiles', uid), {
            lastLogin: serverTimestamp()
          });
        } catch (e) {
          console.warn("Could not update last login, continuing...");
        }
        return existing;
      }

      // Check if this is the first user (only if not super admin to avoid permission errors)
      let isFirstUser = false;
      const isSuperAdmin = email === 'paulovictorsilva2301@gmail.com';
      
      if (!isSuperAdmin) {
        try {
          // Note: This query requires 'list' permission on 'profiles'. 
          // If it fails, we assume there are other users already.
          const q = query(collection(db, 'profiles'), where('role', '==', 'ADMIN'));
          const adminSnap = await getDocs(q);
          isFirstUser = adminSnap.empty;
        } catch (err) {
          // If we can't check, we default to USER role for safety.
          isFirstUser = false;
        }
      }

      // Create new profile
      const newProfile: UserProfile = {
        uid,
        email,
        displayName,
        role: (isFirstUser || isSuperAdmin) ? 'ADMIN' : 'EDITOR',
        status: (isFirstUser || isSuperAdmin) ? 'APPROVED' : 'PENDING',
        createdAt: serverTimestamp() as any,
        lastLogin: serverTimestamp() as any
      };

      await setDoc(doc(db, 'profiles', uid), newProfile);
      return newProfile;
    } catch (error) {
      console.error("Error ensuring user profile:", error);
      throw error;
    }
  },

  async getPendingRequests(): Promise<UserProfile[]> {
    const q = query(collection(db, 'profiles'), where('status', '==', 'PENDING'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as UserProfile);
  },

  async getAllProfiles(): Promise<UserProfile[]> {
    const querySnapshot = await getDocs(collection(db, 'profiles'));
    return querySnapshot.docs.map(doc => doc.data() as UserProfile);
  },

  async updateStatus(uid: string, status: UserStatus): Promise<void> {
    const docRef = doc(db, 'profiles', uid);
    await updateDoc(docRef, { status });
  },

  async updateRole(uid: string, role: UserRole): Promise<void> {
    const docRef = doc(db, 'profiles', uid);
    await updateDoc(docRef, { role });
  },

  async preApproveEmail(email: string, role: UserRole): Promise<void> {
    const id = `pre_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const newProfile: UserProfile = {
      uid: id,
      email,
      displayName: 'Usuário Convidado',
      role,
      status: 'APPROVED',
      createdAt: serverTimestamp() as any,
      lastLogin: serverTimestamp() as any
    };
    await setDoc(doc(db, 'profiles', id), newProfile);
  }
};
