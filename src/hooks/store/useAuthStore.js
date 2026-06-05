import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { logEvent } from '../../services/auditService';
import { v4 as uuidv4 } from 'uuid';

// ─── PIN Hashing (SHA-256 via Web Crypto) ───────────────────────────────────
async function hashPin(pin) {
    const encoder = new TextEncoder();
    const data = encoder.encode(String(pin));
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

const DEFAULT_USERS = [
    { id: 1, nombre: 'Administrador', rol: 'ADMIN', pin: '000000', pinHashed: false },
    { id: 2, nombre: 'Cajero', rol: 'CAJERO', pin: '0000', pinHashed: false },
    { id: 3, nombre: 'Mesero', rol: 'MESERO', pin: '0000', pinHashed: false },
    { id: 4, nombre: 'Cocinero', rol: 'COCINERO', pin: '0000', pinHashed: false }
];

export const useAuthStore = create(
    persist(
        (set, get) => ({
            usuarioActivo: (() => {
                try {
                    const saved = localStorage.getItem('abasto-device-session');
                    return saved ? JSON.parse(saved) : null;
                } catch { return null; }
            })(),
            usuarios: DEFAULT_USERS,
            deletedUserIds: [],
            requireLogin: true, // Por defecto activado según lo solicitado
            adminEmail: '',
            adminPassword: '',

            // ACCIONES
            login: async (pinInput, userId) => {
                // Simular un pequeño retardo para feedback visual (UX)
                await new Promise(r => setTimeout(r, 400));

                const { usuarios } = get();
                const hashedInput = await hashPin(pinInput);

                let userEncontrado = null;
                let needsMigration = false;

                const candidates = userId
                    ? usuarios.filter(u => u.id === userId)
                    : usuarios;

                for (const u of candidates) {
                    const matches = u.pinHashed
                        ? u.pin === hashedInput
                        : u.pin === String(pinInput);

                    if (matches) {
                        userEncontrado = u;
                        // Si el PIN es texto plano, migrarlo a hash
                        if (!u.pinHashed) needsMigration = true;
                        break;
                    }
                }

                if (userEncontrado) {
                    // Migrar PIN a hash silenciosamente
                    if (needsMigration) {
                        set(state => ({
                            usuarios: state.usuarios.map(u =>
                                u.id === userEncontrado.id
                                    ? { ...u, pin: hashedInput, pinHashed: true }
                                    : u
                            )
                        }));
                    }
                    const sessionUser = { ...userEncontrado, pin: undefined, pinHashed: undefined };
                    set({ usuarioActivo: sessionUser });
                    localStorage.setItem('abasto-device-session', JSON.stringify(sessionUser));
                    logEvent('AUTH', 'LOGIN', `${userEncontrado.nombre} inicio sesion`, sessionUser);
                    return true;
                }

                return false;
            },

            logout: () => {
                const { usuarioActivo } = get();
                if (usuarioActivo) logEvent('AUTH', 'LOGOUT', `${usuarioActivo.nombre} cerro sesion`, usuarioActivo);
                set({ usuarioActivo: null });
                localStorage.removeItem('abasto-device-session');
            },

            cambiarPin: async (userId, nuevoPin) => {
                const hashed = await hashPin(nuevoPin);
                const now = new Date().toISOString();
                set((state) => ({
                    usuarios: state.usuarios.map(u =>
                        u.id === userId ? { ...u, pin: hashed, pinHashed: true, updatedAt: now } : u
                    )
                }));

                const target = get().usuarios.find(u => u.id === userId);
                logEvent('AUTH', 'PIN_CAMBIADO', `PIN cambiado para ${target?.nombre || 'usuario'}`, get().usuarioActivo);
            },

            agregarUsuario: async (nombre, rol, pin) => {
                const hashed = await hashPin(pin);
                const now = new Date().toISOString();
                const newId = uuidv4();
                set((state) => ({
                    usuarios: [...state.usuarios, { id: newId, nombre, rol, pin: hashed, pinHashed: true, updatedAt: now, createdAt: now }]
                }));
                logEvent('USUARIO', 'USUARIO_CREADO', `Usuario "${nombre}" (${rol}) creado`, get().usuarioActivo);
            },

            eliminarUsuario: (userId) => {
                const { usuarios, usuarioActivo, deletedUserIds } = get();
                const admins = usuarios.filter(u => u.rol === 'ADMIN');
                const target = usuarios.find(u => u.id === userId);
                if (target?.rol === 'ADMIN' && admins.length <= 1) return false;
                if (usuarioActivo?.id === userId) return false;
                
                set({ 
                    usuarios: usuarios.filter(u => u.id !== userId),
                    deletedUserIds: [...(deletedUserIds || []), userId]
                });
                logEvent('USUARIO', 'USUARIO_ELIMINADO', `Usuario "${target.nombre}" (${target.rol}) eliminado`, usuarioActivo);
                return true;
            },

            editarUsuario: (userId, datos) => {
                const now = new Date().toISOString();
                set((state) => ({
                    usuarios: state.usuarios.map(u => 
                        u.id === userId ? { ...u, ...datos, updatedAt: now } : u
                    )
                }));
                const { usuarioActivo } = get();
                if (usuarioActivo && usuarioActivo.id === userId) {
                    const nuevoActivo = { ...usuarioActivo, ...datos, updatedAt: now };
                    set({ usuarioActivo: nuevoActivo });
                    localStorage.setItem('abasto-device-session', JSON.stringify(nuevoActivo));
                }
            },

            setRequireLogin: (val) => {
                set({ requireLogin: val });
                logEvent('CONFIG', 'LOGIN_REQUERIDO_MODIFICADO', `Login requerido establecido a ${val ? 'SI' : 'NO'}`);
            },

            setAdminCredentials: (email, password) => {
                set({ adminEmail: email, adminPassword: password });
                logEvent('CONFIG', 'CREDENCIALES_REMOTAS_ESTABLECIDAS', `Se ha registrado el acceso remoto para la cuenta administradora.`);
            },

            setUsuariosFromSync: (newUsuarios, clearDeleted = false) => {
                set((state) => ({
                    usuarios: newUsuarios,
                    ...(clearDeleted ? { deletedUserIds: [] } : {})
                }));
            },

            verifyAdminPin: async (pinInput) => {
                const { usuarios } = get();
                const admins = usuarios.filter(u => u.rol === 'ADMIN');
                if (!admins.length) return false;
                const hashedInput = await hashPin(pinInput);
                return admins.some(u => u.pinHashed ? u.pin === hashedInput : u.pin === String(pinInput));
            }
        }),
        {
            name: 'abasto-auth-storage', // Nombre para localStorage
            version: 2,
            migrate: (persistedState, fromVersion) => {
                if (fromVersion < 1 && persistedState?.usuarios) {
                    persistedState.usuarios = persistedState.usuarios.map(u =>
                        u.rol === 'ADMIN' && u.pin === '1234'
                            ? { ...u, pin: '123456' }
                            : u
                    );
                }
                if (fromVersion < 2 && persistedState?.usuarios) {
                    persistedState.usuarios = persistedState.usuarios.map(u =>
                        u.pinHashed === undefined ? { ...u, pinHashed: false } : u
                    );
                }
                return persistedState;
            },
            partialize: (state) => ({
                usuarios: state.usuarios,
                requireLogin: state.requireLogin,
                adminEmail: state.adminEmail,
                adminPassword: state.adminPassword,
                deletedUserIds: state.deletedUserIds || []
            }),
            storage: {
                getItem: (name) => {
                    const str = localStorage.getItem(name);
                    if (!str) return null;
                    try { return JSON.parse(str); } catch (e) { return null; }
                },
                setItem: (name, value) => {
                    localStorage.setItem(name, JSON.stringify(value));
                },
                removeItem: (name) => localStorage.removeItem(name)
            }
        }
    )
);
