// email-verification-example.ts - Example usage of email verification
import { 
  sendVerificationEmail, 
  checkEmailVerification, 
  refreshUserVerificationStatus,
  registerUser,
  loginUser,
  getCurrentUser 
} from './firebase';
import type { User } from 'firebase/auth';

// Example: Register a new user (automatically sends verification email)
export const registerNewUser = async (email: string, password: string, displayName: string) => {
  try {
    const user: User | null = await registerUser(email, password, displayName);
    console.log('User registered successfully:', user?.email);
    console.log('Verification email has been sent automatically');
    return user;
  } catch (error: any) {
    console.error('Registration failed:', error.message);
    throw error;
  }
};

// Example: Send verification email manually
export const sendVerificationEmailManually = async () => {
  try {
    await sendVerificationEmail();
    console.log('Verification email sent successfully');
    return true;
  } catch (error: any) {
    console.error('Failed to send verification email:', error.message);
    throw error;
  }
};

// Example: Check if current user's email is verified
export const checkUserEmailVerification = () => {
  const isVerified = checkEmailVerification();
  
  if (isVerified) {
    console.log('✅ User email is verified');
  } else {
    console.log('❌ User email is not verified');
  }
  
  return isVerified;
};

// Example: Refresh verification status (useful after user clicks verification link)
export const refreshVerificationStatus = async () => {
  try {
    const isVerified = await refreshUserVerificationStatus();
    
    if (isVerified) {
      console.log('🎉 Email verification confirmed!');
    } else {
      console.log('⏳ Email still not verified');
    }
    
    return isVerified;
  } catch (error: any) {
    console.error('Failed to refresh verification status:', error.message);
    throw error;
  }
};

// Example: Complete verification flow
export const handleEmailVerificationFlow = async () => {
  const user = getCurrentUser();
  
  if (!user) {
    console.log('No user is signed in');
    return;
  }

  console.log('Current user:', user.email);
  
  // Check current verification status
  let isVerified = checkEmailVerification();
  
  if (isVerified) {
    console.log('✅ User is already verified');
    return true;
  }

  // If not verified, send verification email
  console.log('📧 Sending verification email...');
  try {
    await sendVerificationEmail();
    console.log('Verification email sent! Please check your inbox.');
  } catch (error: any) {
    console.error('Failed to send verification email:', error.message);
    return false;
  }

  // Note: In a real app, you might want to show a UI that prompts the user
  // to check their email and then call refreshVerificationStatus() when they return
  console.log('Please check your email and click the verification link');
  
  return false; // Will be true once user verifies
};

// Example: Login with verification check
export const loginWithVerificationCheck = async (email: string, password: string) => {
  try {
    const user: User | null = await loginUser(email, password);
    
    if (user) {
      console.log('Login successful');
      
      // Check if email is verified
      const isVerified = checkEmailVerification();
      
      if (!isVerified) {
        console.log('⚠️ Email not verified. Consider sending verification email.');
        // You might want to show a UI prompt here
      }
      
      return { user, isVerified };
    }
    
    return null;
  } catch (error: any) {
    console.error('Login failed:', error.message);
    throw error;
  }
};
