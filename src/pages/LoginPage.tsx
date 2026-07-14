import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { AlertCircle, CheckCircle, Mail, Lock } from 'lucide-react';
import { Navigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { motion } from 'motion/react';
import { CosmicBackground } from '../components/CosmicBackground';

export const LoginPage: React.FC = () => {
  const { user, isLoading } = useAuthStore();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const [isResetPassword, setIsResetPassword] = useState(false);
  const [isUpdatePassword, setIsUpdatePassword] = useState(false);

  React.useEffect(() => {
    if (window.location.hash.includes('type=recovery') || window.location.search.includes('type=recovery')) {
      setIsUpdatePassword(true);
      // Clean up the URL to prevent the token from lingering
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  if (isLoading) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white/50 font-sans text-sm">Loading...</div>;
  }

  if (user && !isUpdatePassword) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.toLowerCase().endsWith('@gmail.com')) {
      setErrorMsg("Only @gmail.com addresses are currently supported.");
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoggingIn(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login?type=recovery`,
      });
      if (error) throw error;
      setSuccessMsg("Password reset link sent! Please check your email.");
    } catch (err: any) {
      setErrorMsg("Password reset failed. If an account exists, a link will be sent.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.toLowerCase().endsWith('@gmail.com')) {
      setErrorMsg("Only @gmail.com addresses are currently supported.");
      return;
    }

    if (lockoutUntil && Date.now() < lockoutUntil) {
      setErrorMsg(`Too many failed attempts. Try again in ${Math.ceil((lockoutUntil - Date.now()) / 60000)} minutes.`);
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoggingIn(true);

    try {
      if (isSignUp) {
        // Client-side password strength validation
        if (password.length < 8) {
          setErrorMsg('Password must be at least 8 characters long.');
          setIsLoggingIn(false);
          return;
        }
        if (!/\d/.test(password)) {
          setErrorMsg('Password must contain at least one number.');
          setIsLoggingIn(false);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`
          }
        });
        if (error) throw error;
        setSuccessMsg("Account created! Please check your email to verify your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setFailedAttempts(0); // Reset on success
      }
    } catch (err: any) {
      console.error('Error logging in:', err.message);
      setErrorMsg("Authentication failed. Please check your credentials and try again.");
      
      const newFails = failedAttempts + 1;
      setFailedAttempts(newFails);
      if (newFails >= 5) {
         setLockoutUntil(Date.now() + 15 * 60 * 1000); // 15 mins
         setErrorMsg("Too many failed attempts. You have been locked out for 15 minutes.");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }
    if (!/\d/.test(password)) {
      setErrorMsg('Password must contain at least one number.');
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoggingIn(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccessMsg("Password updated successfully! Redirecting to dashboard...");
      setTimeout(() => {
        setIsUpdatePassword(false);
      }, 2000);
    } catch (err: any) {
      setErrorMsg("Failed to update password. Your link may have expired.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoggingIn(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`
      }
    });

    if (error) {
      console.error('Error logging in:', error.message);
      setErrorMsg("Authentication failed. Please check your credentials and try again.");
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col font-sans text-white relative overflow-hidden">
      <CosmicBackground />
      
      {/* Navigation matching LandingPage */}
      <header className="absolute inset-x-0 top-0 z-50">
        <nav className="flex items-center justify-between px-6 lg:px-12 max-w-7xl mx-auto h-16" aria-label="Global">
          <Link to="/" className="flex items-center gap-2 outline-none group relative">
            <span className="font-semibold text-lg tracking-tight text-white group-hover:text-white/80 transition-colors">exmb</span>
          </Link>
        </nav>
      </header>

      {/* Main Login Content */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-24 relative z-10 w-full max-w-sm mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          className="w-full"
        >
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-semibold text-white mb-2">
              {isUpdatePassword 
                ? 'Update Password'
                : isResetPassword 
                ? 'Reset password' 
                : isSignUp 
                ? 'Create an account' 
                : 'Welcome back'}
            </h2>
            <p className="text-white/50 text-sm">
              {isUpdatePassword
                ? 'Enter your new password below'
                : isResetPassword 
                ? 'Enter your email to receive a reset link'
                : isSignUp 
                ? 'Enter your details to get started' 
                : 'Enter your credentials to access your account'}
            </p>
          </div>
          
          {errorMsg && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <div className="text-xs text-red-400">
                <span className="font-medium block mb-0.5">Authentication Failed</span>
                {errorMsg === "Unsupported provider: provider is not enabled" 
                  ? "Google Auth is not enabled in your platform settings." 
                  : errorMsg}
              </div>
            </motion.div>
          )}

          {successMsg && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
              <div className="text-xs text-green-400">
                <span className="font-medium block mb-0.5">Check Your Inbox</span>
                {successMsg}
              </div>
            </motion.div>
          )}

          <div className="space-y-5">
            <form onSubmit={isResetPassword ? handleResetPassword : handleEmailAuth} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/70 flex items-center gap-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-9 pr-3 py-2 bg-black/20 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-white/30 focus:bg-white/5 transition-all disabled:opacity-50"
                    disabled={isLoggingIn}
                  />
                </div>
              </div>
              
              {!isResetPassword && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-white/70 flex justify-between items-center">
                    <span>Password</span>
                    {!isSignUp && (
                      <button type="button" onClick={() => { setIsResetPassword(true); setIsSignUp(false); }} className="text-[10px] text-white/40 hover:text-white transition-colors">
                        Forgot password?
                      </button>
                    )}
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2 bg-black/20 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-white/30 focus:bg-white/5 transition-all disabled:opacity-50"
                      disabled={isLoggingIn}
                    />
                  </div>
                  {isSignUp && password.length > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            password.length >= 8 && /\d/.test(password) && /[A-Z]/.test(password)
                              ? 'w-full bg-white'
                              : password.length >= 8 && /\d/.test(password)
                              ? 'w-2/3 bg-white/70'
                              : password.length >= 6
                              ? 'w-1/3 bg-white/40'
                              : 'w-[10%] bg-white/20'
                          }`}
                        />
                      </div>
                      <span className="text-[10px] text-white/40 whitespace-nowrap">
                        {password.length < 8 ? 'Min 8 chars' : !/\d/.test(password) ? 'Add a number' : 'Strong'}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoggingIn || (!isUpdatePassword && !email) || (!isResetPassword && !password) || (lockoutUntil !== null && Date.now() < lockoutUntil)}
                className="w-full flex justify-center py-2 px-4 rounded-lg bg-white text-sm font-medium text-black hover:bg-white/90 transition-all gap-2 items-center mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoggingIn && !successMsg ? (
                  <div className="w-3.5 h-3.5 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                ) : null}
                {isUpdatePassword ? 'Update password' : isResetPassword ? 'Send reset link' : isSignUp ? 'Create account' : 'Sign in'}
              </button>
            </form>

            {!isUpdatePassword && (
              <>
                <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-[#050505] px-2 text-white/40 font-medium tracking-wider rounded-md">
                  Or
                </span>
              </div>
            </div>

            <button
              onClick={handleGoogleLogin}
              type="button"
              disabled={isLoggingIn}
              className="w-full flex justify-center py-2 px-4 rounded-lg bg-white/5 text-sm font-medium text-white hover:bg-white/10 transition-colors gap-2 items-center disabled:opacity-50 disabled:cursor-not-allowed border border-white/10"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </button>
            
            <div className="text-center mt-6">
              <button
                type="button"
                onClick={() => {
                  if (isResetPassword) {
                    setIsResetPassword(false);
                  } else {
                    setIsSignUp(!isSignUp);
                  }
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="text-xs text-white/50 hover:text-white font-medium transition-colors"
              >
                {isResetPassword ? 'Back to sign in' : isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>
            </div>

            <p className="mt-8 text-center text-[10px] text-white/40 max-w-[250px] mx-auto">
               By continuing, you agree to our <Link to="/terms" className="underline hover:text-white transition-colors">Terms of Service</Link> and <Link to="/privacy" className="underline hover:text-white transition-colors">Privacy Policy</Link>.
            </p>
            </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
