/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import Dashboard from './components/Dashboard';
import { Mail, Wallet, ArrowLeft, Lock, ShieldCheck, Check, Sparkles, Upload } from 'lucide-react';

export interface UserSession {
  uid: string;
  displayName: string | null;
  email: string | null;
}

export default function App() {
  const [loading, setLoading] = useState(true);

  // Auth modes: 'options' | 'email'
  const [authMethod, setAuthMethod] = useState<'options' | 'email'>('options');
  
  // Email credentials state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState('');

  // Web3 state
  const [walletStep, setWalletStep] = useState<'select' | 'sign' | 'connecting'>('select');
  const [selectedWallet, setSelectedWallet] = useState('');
  
  const [localUser, setLocalUser] = useState<UserSession | null>(() => {
    const saved = localStorage.getItem('ciclica_use_local');
    if (saved === 'true') return { uid: 'local_user', displayName: 'Usuaria Local', email: null };
    
    // Check if there is an email session
    const savedEmail = localStorage.getItem('ciclica_use_email_user');
    if (savedEmail) {
      try {
        return JSON.parse(savedEmail);
      } catch {
        return null;
      }
    }
    
    // Check if there is a Web3 session
    const savedWeb3 = localStorage.getItem('ciclica_use_web3_user');
    if (savedWeb3) {
      try {
        return JSON.parse(savedWeb3);
      } catch {
        return null;
      }
    }
    return null;
  });

  // --- INVITATION GATE CONFIGURATION & STATES ---
  const REQUIRE_INVITATION = true;
  
  // Tu código personal exclusivo de acceso
  const MASTER_CODE = 'TRTBL-9K2F-5X8B-CICLICA';
  
  // Lista de códigos individuales y aleatorios para invitados (añade o borra según desees)
  const INVITED_CODES = [
    'CICLICA-8F2K', // Invitado 1 (ej: amiga)
    'CICLICA-9X7P', // Invitado 2 (ej: colaborador)
    'CICLICA-3B5D'  // Invitado 3 (ej: tester)
  ];

  const [isAuthorized, setIsAuthorized] = useState<boolean>(() => {
    if (!REQUIRE_INVITATION) return true;
    return localStorage.getItem('ciclica_authorized') === 'true';
  });
  const [invitationInput, setInvitationInput] = useState('');
  const [invitationError, setInvitationError] = useState('');

  const handleVerifyInvitation = (e: React.FormEvent) => {
    e.preventDefault();
    const input = invitationInput.trim();
    
    // Verificamos si el código ingresado coincide con tu código maestro o la lista de invitados
    const isValid = input === MASTER_CODE || INVITED_CODES.includes(input);
    
    if (isValid) {
      localStorage.setItem('ciclica_authorized', 'true');
      setIsAuthorized(true);
      setInvitationError('');
    } else {
      setInvitationError('Código de invitación incorrecto o expirado.');
    }
  };

  useEffect(() => {
    setLoading(false);
  }, []);

  const handleLocalOnly = () => {
    localStorage.setItem('ciclica_use_local', 'true');
    setLocalUser({ uid: 'local_user', displayName: 'Usuaria Local', email: null });
  };

  const handleImportVaultFromLogin = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (imported.tasks || imported.history || imported.config) {
          localStorage.setItem('ciclica_local_tasks_local_user', JSON.stringify(imported.tasks || []));
          localStorage.setItem('ciclica_local_history_local_user', JSON.stringify(imported.history || []));
          localStorage.setItem('ciclica_local_config_local_user', JSON.stringify(imported.config || {}));
          localStorage.setItem('ciclica_use_local', 'true');
          localStorage.setItem('ciclica_authorized', 'true');
          localStorage.setItem('ciclica_onboarding_done', 'true');
          setLocalUser({ uid: 'local_user', displayName: 'Usuaria Local', email: null });
          setIsAuthorized(true);
          alert("¡Bóveda importada con éxito!");
          window.location.reload();
        } else {
          alert("El archivo no tiene el formato correcto de Cíclica.");
        }
      } catch (err) {
        alert("Error al leer el archivo JSON.");
      }
    };
    reader.readAsText(file);
  };

  const handleEmailAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!email.trim() || !password.trim()) {
      setAuthError('Por favor completa todos los campos.');
      return;
    }
    if (password.length < 6) {
      setAuthError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    // Simulate safe local email authentication (Obsidian style)
    const simulatedUser = {
      uid: `email_${email.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
      displayName: email.split('@')[0],
      email: email.toLowerCase()
    };
    
    localStorage.setItem('ciclica_use_email_user', JSON.stringify(simulatedUser));
    setLocalUser(simulatedUser);
  };

  const handleConnectWallet = (wallet: string) => {
    setSelectedWallet(wallet);
    setWalletStep('connecting');
    setTimeout(() => {
      setWalletStep('sign');
    }, 1200);
  };

  const handleSignMessage = () => {
    setWalletStep('connecting');
    setTimeout(() => {
      // Create Web3 mock session
      const randAddress = `0x71C35a${Math.random().toString(16).substring(2, 8)}...${Math.random().toString(16).substring(2, 6)}`;
      const simulatedUser = {
        uid: `web3_${randAddress.replace(/\.\.\./, '')}`,
        displayName: randAddress,
        email: null
      };
      
      localStorage.setItem('ciclica_use_web3_user', JSON.stringify(simulatedUser));
      setLocalUser(simulatedUser);
    }, 1500);
  };

  const handleSignOut = () => {
    localStorage.removeItem('ciclica_use_local');
    localStorage.removeItem('ciclica_use_email_user');
    localStorage.removeItem('ciclica_use_web3_user');
    setLocalUser(null);
  };

  const activeUser = localUser;

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
              />
            </div>

            {invitationError && (
              <span className="text-[10px] text-red-500 font-mono mt-1 leading-snug pl-1">{invitationError}</span>
            )}

            <button
              type="submit"
              className="w-full bg-[#2d2d2d] text-white py-3 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#5d5d5d] transition-colors mt-2 cursor-pointer text-center"
            >
              Verificar y Entrar
            </button>
          </form>
          
          <p className="text-[9px] text-[#a2b29f] mt-6 font-mono leading-relaxed max-w-[280px] mx-auto uppercase tracking-wider">
            Desarrollado en local-first por TRTBL.
          </p>
        </div>
      </div>
    );
  }

  if (!activeUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fbf9f4] p-4">
        <div className="bg-[#efede8]/40 p-8 md:p-10 rounded-3xl border border-[#e4e2dd] text-center max-w-sm w-full shadow-sm relative transition-all duration-300">
          <h1 className="text-2xl font-light tracking-tight text-[#2d2d2d] mb-1 font-sans">CÍCLICA</h1>
          <p className="text-[#5d5d5d] mb-6 text-[10px] font-mono uppercase tracking-widest">Bóveda Soberana de Vida y Energía</p>
          
          <div className="bg-[#efede8]/50 border border-[#e4e2dd] rounded-2xl p-4 mb-6 text-left">
            <p className="text-[11px] text-[#5d5d5d] leading-relaxed italic">
              "Diseñar un ecosistema local-first y de código abierto para la gestión de la vida no es un simple capricho técnico: es una necesidad política y de seguridad. La descentralización protege tu intimidad."
            </p>
            <span className="block text-[9px] text-[#a2b29f] mt-2 font-mono uppercase tracking-wider">— Tesis de Privacidad Crítica</span>
          </div>

          <div className="flex flex-col gap-3 animate-in fade-in duration-200">
            <button
              onClick={handleLocalOnly}
              className="w-full bg-[#2d2d2d] text-[#fbf9f4] py-3.5 rounded-xl font-bold hover:bg-[#5d5d5d] transition-all text-xs tracking-wider uppercase shadow-sm cursor-pointer"
            >
              Crear o Abrir Bóveda Local
            </button>
            
            <label className="w-full border border-[#e4e2dd] bg-white text-[#5d5d5d] py-3 rounded-xl font-medium hover:bg-[#e4e2dd]/40 transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer">
              <Upload className="w-3.5 h-3.5" /> Importar Bóveda (.json)
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImportVaultFromLogin}
              />
            </label>
            
            <p className="text-[9px] text-[#a2b29f] mt-4 font-mono leading-relaxed max-w-[280px] mx-auto uppercase tracking-wider">
              Tus datos residen 100% físicos y privados en este dispositivo.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <Dashboard user={activeUser} onSignOut={handleSignOut} />;
}


