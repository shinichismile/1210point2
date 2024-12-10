import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserProfile } from '../types';
import { storage } from '../utils/storage';
import { authManager } from '../utils/auth';

interface AuthState {
  user: User | null;
  users: Record<string, User>;
  isAuthenticated: boolean;
  customIcon?: string;
  login: (user: Omit<User, 'password'>) => void;
  logout: () => void;
  updateProfile: (updates: Partial<User & { profile: UserProfile }>) => void;
  updateIcon: (base64: string) => void;
  updateAvatar: (avatarUrl: string) => void;
  updatePoints: (points: number) => void;
  updateUserPoints: (userId: string, points: number) => void;
  getUser: (userId: string) => User | null;
  registerUser: (userData: Omit<User, 'id'> & { password: string }) => User;
  reset: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      users: authManager.getUsers(),
      isAuthenticated: false,
      customIcon: undefined,

      login: (userData) => {
        const currentUsers = get().users;
        const updatedUser = {
          ...currentUsers[userData.id],
          lastLogin: new Date().toISOString(),
        };
        
        set({
          user: updatedUser,
          users: {
            ...currentUsers,
            [userData.id]: updatedUser,
          },
          isAuthenticated: true,
        });
        
        authManager.saveUser(updatedUser);
      },

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
        });
      },

      updateProfile: (updates) => {
        if (!get().user) return;

        const updatedUser = { ...get().users[get().user!.id], ...updates };
        set({
          user: updatedUser,
          users: {
            ...get().users,
            [get().user!.id]: updatedUser,
          },
        });

        authManager.saveUser(updatedUser);
      },

      updateIcon: (base64) => {
        set({ customIcon: base64 });
      },

      updateAvatar: (avatarUrl) => {
        if (!get().user) return;

        const updatedUser = { ...get().users[get().user!.id], avatarUrl };
        set({
          user: updatedUser,
          users: {
            ...get().users,
            [get().user!.id]: updatedUser,
          },
        });

        authManager.saveUser(updatedUser);
      },

      updatePoints: (points) => {
        if (!get().user) return;

        const updatedUser = {
          ...get().users[get().user!.id],
          points,
          totalEarned: get().users[get().user!.id].totalEarned + points,
        };

        set({
          user: updatedUser,
          users: {
            ...get().users,
            [get().user!.id]: updatedUser,
          },
        });

        authManager.saveUser(updatedUser);
      },

      updateUserPoints: (userId, points) => {
        const currentUser = get().users[userId];
        if (!currentUser) return;

        const updatedUser = {
          ...currentUser,
          points: Math.max(0, points),
          totalEarned: currentUser.totalEarned + (points > currentUser.points ? points - currentUser.points : 0),
        };

        set({
          users: {
            ...get().users,
            [userId]: updatedUser,
          },
          user: get().user?.id === userId ? updatedUser : get().user,
        });

        authManager.saveUser(updatedUser);
      },

      getUser: (userId) => get().users[userId] || null,

      registerUser: (userData) => {
        const { password, ...userDataWithoutPassword } = userData;
        const newUser = {
          ...userDataWithoutPassword,
          id: userData.loginId,
          points: 0,
          status: 'active' as const,
          joinedAt: new Date().toISOString(),
          totalEarned: 0,
          role: 'worker' as const,
        };

        authManager.addCredential(userData.loginId, password);
        authManager.saveUser(newUser);

        set((state) => ({
          users: {
            ...state.users,
            [newUser.id]: newUser,
          },
        }));

        return newUser;
      },

      reset: () => {
        authManager.reset();
        set({
          user: null,
          users: authManager.getUsers(),
          isAuthenticated: false,
          customIcon: undefined,
        });
      },
    }),
    {
      name: 'auth-storage',
      storage: {
        getItem: (name) => storage.get(name),
        setItem: (name, value) => storage.set(name, value),
        removeItem: (name) => storage.remove(name),
      },
    }
  )
);