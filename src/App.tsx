/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import Dashboard from './components/Dashboard';
import { Lock, ShieldCheck } from 'lucide-react';

export interface UserSession {
  uid: string;
  displayName: string | null;
  email: string | null;
}

export default function App() {
  const [loading, setLoading] = useState(true);

  // --- INVITATION GATE CONFIGURATION & STATES ---
  const REQUIRE_INVITATION = true;
  
  // Hashes SHA-256 de los códigos oficiales
  const MASTER_HASH = '094870ffabbd68da5a43d21d84dfb72fbb4c5e4ce5af90e0eb1236d3abce48ed';
  const INVITED_HASHES = [
    '0678566d9a2553d7bd7f510e92f351c271d39eda909858cd379e7c46fc3deeac', // CICLICA-8F2K
    '68d091e116f6743672ebe50ea710f1c09dfc7f147c3c938e43e83c3aa087c6c2', // CICLICA-9X7P
    '179029ca0787a175cdcfa7248a82ced954116902c97dbcd471e37ee92e52f087'  // CICLICA-3B5D
  ];

  const [isAuthorized, setIsAuthorized] = useState<boolean>(() => {
    if (!REQUIRE_INVITATION) return true;
    return localStorage.getItem('ciclica_authorized') === 'true';
  });
  const [invitationInput, setInvitationInput] = useState('');
  const [invitationError, setInvitationError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const [localUser, setLocalUser] = useState<UserSession | null>(() => {
    const saved = localStorage.getItem('ciclica_use_local');
    if (saved === 'true') {
      return { uid: 'local_user', displayName: 'Usuaria Local', email: null };
    }
    return null;
  });

  const hashStringToSHA256 = async (str: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleVerifyInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = invitationInput.trim();
    setIsVerifying(true);
    setInvitationError('');
    
    try {
      const hashedInput = await hashStringToSHA256(input);
      const isValid = hashedInput === MASTER_HASH || INVITED_HASHES.includes(hashedInput);
      
      if (isValid) {
        localStorage.setItem('ciclica_authorized', 'true');
        localStorage.setItem('ciclica_use_local', 'true');
        setIsAuthorized(true);
        setLocalUser({ uid: 'local_user', displayName: 'Usuaria Local', email: null });
        setInvitationError('');
      } else {
        setInvitationError('Código de invitación incorrecto o expirado.');
      }
    } catch (err) {
      setInvitationError('Error al verificar el código de invitación.');
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    // No Firebase Auth. Just load local session.
    if (isAuthorized && !localUser) {
      localStorage.setItem('ciclica_use_local', 'true');
      setLocalUser({ uid: 'local_user', displayName: 'Usuaria Local', email: null });
    }
    setLoading(false);
  }, [isAuthorized, localUser]);

  const handleSignOut = () => {
    localStorage.removeItem('ciclica_authorized');
    localStorage.removeItem('ciclica_use_local');
    setLocalUser(null);
    setIsAuthorized(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fbf9f4]">
        <div className="animate-spin text-[#2d2d2d] w-8 h-8 rounded-full border-4 border-[#e4e2dd] border-t-[#2d2d2d]" />
      </div>
    );
  }

  if (REQUIRE_INVITATION && !isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fbf9f4] p-4">
        <div className="bg-[#efede8]/40 p-8 md:p-10 rounded-3xl border border-[#e4e2dd] text-center max-w-sm w-full shadow-sm relative transition-all duration-300">
          <h1 className="text-2xl font-light tracking-tight text-[#2d2d2d] mb-1 font-sans">CÍCLICA</h1>
          <p className="text-[#5d5d5d] mb-8 text-[10px] font-mono uppercase tracking-widest">Bóveda Privada • Acceso Restringido</p>
          
          <form onSubmit={handleVerifyInvitation} className="flex flex-col gap-4 text-left">
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] uppercase tracking-wider font-mono text-[#5d5d5d] pl-1 flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" /> Código de Invitación
              </label>
              <input 
                type="password" 
                placeholder="Ingresa tu código"
                value={invitationInput}
                onChange={e => setInvitationInput(e.target.value)}
                className="px-4 py-2.5 bg-white border border-[#e4e2dd] rounded-xl text-xs outline-none focus:border-[#a2b29f] transition-all text-[#2d2d2d]"
                required
                disabled={isVerifying}
              />
            </div>

            {invitationError && (
              <span className="text-[10px] text-red-500 font-mono mt-1 leading-snug pl-1">{invitationError}</span>
            )}

            <button
              type="submit"
              disabled={isVerifying}
              className="w-full bg-[#2d2d2d] text-white py-3 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#5d5d5d] transition-colors mt-2 cursor-pointer text-center disabled:opacity-50"
            >
              {isVerifying ? 'Verificando...' : 'Verificar y Entrar'}
            </button>
          </form>
          
          <p className="text-[9px] text-[#a2b29f] mt-6 font-mono leading-relaxed max-w-[280px] mx-auto uppercase tracking-wider">
            Desarrollado en local-first por su creadora.
          </p>
        </div>
      </div>
    );
  }

  // Dashboard is loaded with active local user
  return <Dashboard user={localUser!} onSignOut={handleSignOut} />;
}
