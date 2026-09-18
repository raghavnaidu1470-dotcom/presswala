import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { db, toSyntheticAuthCredentials } from '../services/db';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { OFFLINE_DEMO_CREDENTIALS } from '../services/seedData';

interface AuthContextType {
  currentUser: User | null;
  role: UserRole | null;
  isLoading: boolean;
  login: (loginKey: string, pin: string) => Promise<boolean>;
  logout: () => void;
  registerResident: (name: string, flatNumber: string, phone: string, pin: string) => Promise<User>;
  switchDemoUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'presswala_active_session_v2';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Restore session from localStorage
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) {
        setCurrentUser(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Failed to restore session:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (loginKey: string, pin: string): Promise<boolean> => {
    const user = await db.authenticateUser(loginKey, pin);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    if (isSupabaseConfigured && supabase) {
      supabase.auth.signOut().catch(err => console.warn('[PressWala] SignOut note:', err));
    }
  };

  const registerResident = async (
    name: string, 
    flatNumber: string, 
    phone: string, 
    pin: string
  ): Promise<User> => {
    const newUser = await db.registerResident(name, flatNumber, phone, pin);
    setCurrentUser(newUser);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser));
    return newUser;
  };

  const switchDemoUser = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    if (isSupabaseConfigured && supabase) {
      const client = supabase;
      const demoPin = OFFLINE_DEMO_CREDENTIALS[user.flat_number.toUpperCase()] || 'Demo@1234';
      const { email, password } = toSyntheticAuthCredentials(user.flat_number, demoPin, user.role);
      client.auth.signInWithPassword({ email, password }).catch(() => {
        // If demo user not yet in auth, sign up once
        client.auth.signUp({
          email,
          password,
          options: {
            data: {
              flat_number: user.flat_number,
              role: user.role,
              name: user.name,
              phone: user.phone
            }
          }
        }).then();
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        role: currentUser?.role || null,
        isLoading,
        login,
        logout,
        registerResident,
        switchDemoUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
