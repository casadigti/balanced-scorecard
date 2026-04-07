import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, LogIn, UserPlus, Fingerprint, Activity, AlertCircle, ArrowRight } from 'lucide-react';

export const Login = ({ forceReset = false, onPasswordReset = () => {} }: { forceReset?: boolean, onPasswordReset?: () => void }) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResetMode, setIsResetMode] = useState(forceReset);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isResetMode) {
        if (password !== confirmPassword) {
          throw new Error('Las contraseñas no coinciden');
        }
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setMessage('¡Contraseña actualizada con éxito! Ya puedes entrar.');
        setTimeout(() => {
          setIsResetMode(false);
          onPasswordReset();
        }, 2000);
      } else if (isForgotPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setMessage('Se ha enviado un correo para restablecer tu contraseña.');
      } else if (isSignUp) {
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            emailRedirectTo: window.location.origin
          }
        });
        if (error) throw error;
        setMessage('¡Registro exitoso! Por favor verifica tu correo electrónico.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 sm:p-12 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-600/20 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10"
      >
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[40px] p-10 shadow-2xl overflow-hidden relative group">
          {/* Top accent line */}
          <div className="absolute top-0 left-10 right-10 h-1 bg-gradient-to-r from-transparent via-brand-500 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />

          <div className="flex flex-col items-center text-center mb-10">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-20 h-20 rounded-3xl bg-brand-600 flex items-center justify-center mb-6 shadow-xl shadow-brand-600/20"
            >
              <Activity className="w-10 h-10 text-white" />
            </motion.div>
            <h1 className="text-3xl font-black text-white tracking-tight leading-tight">
              {isResetMode ? 'Nueva Contraseña' : isForgotPassword ? 'Recuperar Cuenta' : isSignUp ? 'Crear Cuenta' : 'Acceso al Sistema'}
            </h1>
            <p className="text-slate-400 mt-2 font-medium text-sm">
              {isResetMode ? 'Define tu nueva contraseña segura' : isForgotPassword ? 'Te enviaremos un email para resetearla' : isSignUp ? 'Regístrate para gestionar tu dashboard' : 'Introduce tus credenciales autorizadas'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-6">
            <div className="space-y-4">
              {!isResetMode && (
                <div className="relative group/input">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/input:text-brand-500 transition-colors">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    type="email"
                    placeholder="Correo electrónico"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-brand-500/50 focus:bg-white/10 transition-all font-medium placeholder:text-slate-600"
                  />
                </div>
              )}

              {!isForgotPassword && (
                <>
                  <div className="relative group/input">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/input:text-brand-500 transition-colors">
                      <Lock className="w-5 h-5" />
                    </div>
                    <input
                      type="password"
                      placeholder={isResetMode ? "Contraseña nueva" : "Contraseña"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-brand-500/50 focus:bg-white/10 transition-all font-medium placeholder:text-slate-600"
                    />
                  </div>

                  {isResetMode && (
                    <div className="relative group/input">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/input:text-brand-500 transition-colors">
                        <Lock className="w-5 h-5" />
                      </div>
                      <input
                        type="password"
                        placeholder="Confirmar contraseña"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-brand-500/50 focus:bg-white/10 transition-all font-medium placeholder:text-slate-600"
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 flex items-center gap-3 text-rose-400 text-xs font-bold"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <p>{error}</p>
                </motion.div>
              )}
              {message && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3 text-emerald-400 text-xs font-bold"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <p>{message}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              disabled={loading}
              className="w-full bg-brand-600 hover:bg-brand-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-brand-600/10 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 group/btn"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {isResetMode ? 'Actualizar Contraseña' : isForgotPassword ? 'Enviar Instrucciones' : isSignUp ? 'Crear Cuenta' : 'Entrar al Panel'}
                  <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-white/5 flex flex-col gap-4 text-center">
            {!isResetMode && !isForgotPassword && (
              <button
                onClick={() => setIsForgotPassword(true)}
                className="text-slate-500 hover:text-white text-[10px] font-bold transition-colors uppercase tracking-[0.15em]"
              >
                ¿Olvidaste tu contraseña?
              </button>
            )}

            <button
              onClick={() => {
                if (isResetMode || isForgotPassword) {
                  setIsResetMode(false);
                  setIsForgotPassword(false);
                } else {
                  setIsSignUp(!isSignUp);
                }
                setError(null);
                setMessage(null);
              }}
              className="text-slate-400 hover:text-white text-xs font-bold transition-colors uppercase tracking-widest"
            >
              {isForgotPassword || isResetMode ? 'Volver al inicio de sesión' : isSignUp ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes acceso? Regístrate'}
            </button>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-6 text-slate-600 px-10">
          <div className="flex items-center gap-2">
            <Fingerprint className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Encriptación SSL</span>
          </div>
          <div className="w-1 h-1 bg-slate-800 rounded-full" />
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Medical Intelligence</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
