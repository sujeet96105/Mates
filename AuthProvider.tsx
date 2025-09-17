import React, { createContext, useContext, useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { User } from 'firebase/auth';
import { registerUser, loginUser, signOut, resetPassword, subscribeToAuthChanges, updateUserProfile } from './firebase';

// Define the shape of our authentication context
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User | null>;
  register: (email: string, password: string, displayName: string) => Promise<User | null>;
  logout: () => Promise<boolean>;
  resetUserPassword: (email: string) => Promise<boolean>;
  updateProfile: (displayName?: string, photoURL?: string) => Promise<User | null>;
  error: string | null;
  setError: (error: string | null) => void;
}

// Create the context with a default undefined value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component that wraps the app and makes auth object available to any child component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to auth state changes when the component mounts
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((currentUser) => {
      setUser(currentUser);
      setIsLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // Login function
  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const user = await loginUser(email, password);
      return user;
    } catch (error: any) {
      // Map Firebase auth errors to friendly copy
      const code: string | undefined = error?.code;
      let message = error?.message || 'Failed to login';
      if (
        code === 'auth/invalid-credential' ||
        code === 'auth/wrong-password' ||
        code === 'auth/user-not-found' ||
        code === 'auth/invalid-email'
      ) {
        message = 'Incorrect email or password';
      }
      setError(message);
      if (message.toLowerCase().includes('verify your email')) {
        Alert.alert(
          'Verify Your Email',
          'We sent a verification link to your email. Please verify your address before signing in. Also check your Spam/Junk folder.'
        );
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Register function
  const register = async (email: string, password: string, displayName: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const user = await registerUser(email, password, displayName);
      // Regardless of immediate auth state, inform the user about verification email
      Alert.alert(
        'Verification Email Sent',
        'Please check your inbox for a verification link to activate your account. If you do not see it, check your Spam/Junk folder.'
      );
      return user;
    } catch (error: any) {
      const code: string | undefined = error?.code;
      let message = error?.message || 'Failed to register';
      if (code === 'auth/email-already-in-use') {
        message = 'This email is already in use';
      } else if (code === 'auth/invalid-email') {
        message = 'Please enter a valid email address';
      } else if (code === 'auth/weak-password') {
        message = 'Password is too weak';
      }
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await signOut();
      return true;
    } catch (error: any) {
      setError(error.message || 'Failed to logout');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Reset password function
  const resetUserPassword = async (email: string) => {
    try {
      setIsLoading(true);
      setError(null);
      await resetPassword(email);
      Alert.alert('Password Reset', 'Check your email for password reset instructions');
      return true;
    } catch (error: any) {
      const code: string | undefined = error?.code;
      let message = error?.message || 'Failed to reset password';
      if (code === 'auth/user-not-found') {
        message = 'No account found with this email';
      } else if (code === 'auth/invalid-email') {
        message = 'Please enter a valid email address';
      }
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Update profile function
  const updateProfile = async (displayName?: string, photoURL?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const updatedUser = await updateUserProfile(displayName, photoURL);
      Alert.alert('Profile Updated', 'Your profile has been updated successfully');
      return updatedUser;
    } catch (error: any) {
      setError(error.message || 'Failed to update profile');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // The value that will be supplied to any descendants of this provider
  const value = {
    user,
    isLoading,
    login,
    register,
    logout,
    resetUserPassword,
    updateProfile,
    error,
    setError
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook that shorthands the context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};