import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, ResidentJoinRequest } from '../types';
import { db, formatAuthEmail } from '../services/db';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { OFFLINE_DEMO_CREDENTIALS } from '../services/seedData';

interface AuthContextType {
  currentUser: User | null;
  role: UserRole | null;
  isLoading: boolean;
  login: (loginKey: string, password: string) => Promise<boolean>;
  logout: () => void;
  registerResident: (name: string, flatNumber: string, phone: string, password: string) => Promise<User>;
  requestResidentAccess: (name: string, phone: string, block: string, flatNumber: string, apartmentId: string) => Promise<ResidentJoinRequest>;
  registerVendor: (name: string, phone: string, apartmentName: string, password: string) => Promise<User>;
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

  const login = async (loginKey: string, password: string): Promise<boolean> => {
    const user = await db.authenticateUser(loginKey, password);
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
    password: string
  ): Promise<User> => {
    const newUser = await db.registerResident(name, flatNumber, phone, password);
    setCurrentUser(newUser);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser));
    return newUser;
  };

  const requestResidentAccess = async (
    name: string,
    phone: string,
    block: string,
    flatNumber: string,
    apartmentId: string
  ): Promise<ResidentJoinRequest> => {
    return await db.createResidentJoinRequest(name, phone, block, flatNumber, apartmentId);
  };

  const registerVendor = async (
    name: string,
    phone: string,
    apartmentName: string,
    password: string
  ): Promise<User> => {
    return await db.registerVendor(name, phone, apartmentName, password);
  };

  const switchDemoUser = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    if (isSupabaseConfigured && supabase) {
      const client = supabase;
      const demoPassword = OFFLINE_DEMO_CREDENTIALS[user.flat_number.toUpperCase()] || 'Demo@1234';
      const email = formatAuthEmail(user.flat_number, user.role);
      client.auth.signInWithPassword({ email, password: demoPassword }).catch(() => {
        // If demo user not yet in auth, sign up once
        client.auth.signUp({
          email,
          password: demoPassword,
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
        requestResidentAccess,
        registerVendor,
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
