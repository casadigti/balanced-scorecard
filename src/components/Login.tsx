import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, LogIn, Fingerprint, Activity, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';

export const Login = ({ forceReset = false, onPasswordReset = () => {} }: { forceReset?: boolean, onPasswordReset?: () => void }) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
    <div className="min-h-screen bg-[#070b14] flex flex-col items-center justify-center p-6 sm:p-12 relative overflow-hidden">
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10"
      >
        <div className="bg-[#111827] border border-white/5 rounded-3xl p-8 sm:p-10 shadow-2xl overflow-hidden relative border-b-0 rounded-b-none">
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-emerald-500 to-yellow-500" />

          <div className="flex flex-col items-center text-center mt-2 mb-8">
            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="w-full max-w-[260px] rounded-2xl bg-[#1f2937] border border-white/5 p-4 flex items-center justify-center mb-8 shadow-inner overflow-hidden"
            >
              <img 
                src="/logo.png" 
                alt="CASADIG Logo" 
                className="w-full h-auto object-contain max-h-[80px]"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </motion.div>

            <h1 className="text-2xl font-black text-white tracking-tight leading-tight">
              {isResetMode ? 'Nueva Contraseña' : isForgotPassword ? 'Recuperar Cuenta' : 'Dashboard BSC'}
            </h1>
            <p className="text-slate-400 mt-2 font-medium text-sm flex items-center gap-1.5 justify-center">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              {isResetMode ? 'Define tu nueva contraseña segura' : isForgotPassword ? 'Te enviaremos un email para resetearla' : 'Acceso restringido — Personal autorizado'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            <div className="space-y-5">
              {!isResetMode && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 block">
                    Correo Electrónico
                  </label>
                  <div className="relative group/input">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/input:text-emerald-500 transition-colors">
                      <Mail className="w-5 h-5" />
                    </div>
                    <input
                      type="email"
                      placeholder="usuario@casadigrd.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#1f2937] border border-white/5 rounded-xl py-3.5 pl-12 pr-4 text-white focus:outline-none focus:border-emerald-500/50 focus:bg-[#374151] transition-all font-medium placeholder:text-slate-600 text-sm"
                    />
                  </div>
                </div>
              )}

              {!isForgotPassword && (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 flex justify-between w-full">
                      <span>Contraseña</span>
                    </label>
                    <div className="relative group/input">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/input:text-emerald-500 transition-colors">
                        <Lock className="w-5 h-5" />
                      </div>
                      <input
                        type="password"
                        placeholder="••••••••••"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-[#1f2937] border border-white/5 rounded-xl py-3.5 pl-12 pr-4 text-white focus:outline-none focus:border-emerald-500/50 focus:bg-[#374151] transition-all font-medium placeholder:text-slate-600 text-sm"
                      />
                    </div>
                  </div>

                  {isResetMode && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 block">
                        Confirmar Contraseña
                      </label>
                      <div className="relative group/input">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/input:text-emerald-500 transition-colors">
                          <Lock className="w-5 h-5" />
                        </div>
                        <input
                          type="password"
                          placeholder="Confirmar contraseña"
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full bg-[#1f2937] border border-white/5 rounded-xl py-3.5 pl-12 pr-4 text-white focus:outline-none focus:border-emerald-500/50 focus:bg-[#374151] transition-all font-medium placeholder:text-slate-600 text-sm"
                        />
                      </div>
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
              className="mt-6 w-full bg-[#1fae51] hover:bg-[#1a9a46] text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-600/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group/btn"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  {isResetMode ? 'Actualizar Contraseña' : isForgotPassword ? 'Enviar Instrucciones' : 'INICIAR SESIÓN'}
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 flex flex-col gap-4 text-center">
            {!isResetMode && !isForgotPassword && (
              <button
                onClick={() => setIsForgotPassword(true)}
                className="text-slate-500 hover:text-white text-[10px] font-bold transition-colors uppercase tracking-widest"
              >
                ¿Olvidaste tu contraseña?
              </button>
            )}

            {(isForgotPassword || isResetMode) && (
              <button
                onClick={() => {
                  setIsResetMode(false);
                  setIsForgotPassword(false);
                  setError(null);
                  setMessage(null);
                }}
                className="text-slate-400 hover:text-white text-xs font-bold transition-colors uppercase tracking-widest"
              >
                Volver al inicio de sesión
              </button>
            )}
          </div>
        </div>
        
        {/* Footer Area attached to card */}
        <div className="bg-[#0f1522] border border-white/5 border-t-0 rounded-b-3xl py-4 flex items-center justify-center">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">© 2026 CASADIG • SISTEMA DE GESTIÓN INTERNO</span>
        </div>
      </motion.div>
    </div>
  );
};
