import { useState, useEffect } from "react";
import { supabase } from "../utils/supabase";

// Detectar si hay una sesión guardada en localStorage
const hasSavedSession = () => {
  try {
    const keys = Object.keys(localStorage);
    const authKey = keys.find(key => key.startsWith("sb-") && key.endsWith("-auth-token"));
    if (!authKey) return false;
    const data = localStorage.getItem(authKey);
    if (!data) return false;
    const parsed = JSON.parse(data);
    return !!parsed?.currentSession || !!parsed?.access_token;
  } catch {
    return false;
  }
};

export function useCloudAuth() {
  const [cloudUser, setCloudUser] = useState(null);
  const [role, setRole] = useState(() => {
    return localStorage.getItem("pda_cloud_role") || null;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUserRole = async (userId) => {
    try {
      const rolePromise = supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout obteniendo rol")), 6000)
      );

      const { data, error: roleError } = await Promise.race([rolePromise, timeoutPromise]);

      if (roleError) throw roleError;

      if (data && data.role) {
        setRole(data.role);
        localStorage.setItem("pda_cloud_role", data.role);
        return data.role;
      } else {
        setRole("employee");
        localStorage.setItem("pda_cloud_role", "employee");
        return "employee";
      }
    } catch (err) {
      console.error("[useCloudAuth] Error obteniendo rol de usuario (usando fallback):", err);
      const fallbackRole = localStorage.getItem("pda_cloud_role") || "employee";
      setRole(fallbackRole);
      return fallbackRole;
    }
  };

  // Escuchar cambios de sesión y verificar sesión inicial de manera óptima
  useEffect(() => {
    let active = true;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!active) return;
        if (session?.user) {
          setCloudUser(session.user);
        } else {
          setCloudUser(null);
          setRole(null);
          localStorage.removeItem("pda_cloud_role");
          setLoading(false);
        }
      } catch (err) {
        console.error("[useCloudAuth] Error inicializando auth:", err);
        if (active) setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      
      // Ignorar el evento inicial INITIAL_SESSION porque ya es resuelto por initAuth()
      if (event === "INITIAL_SESSION") return;
      
      const user = session?.user || null;
      setCloudUser(user);
      
      if (!user) {
        setRole(null);
        localStorage.removeItem("pda_cloud_role");
        setLoading(false);
      }
    });

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  // Cargar rol de usuario de forma asíncrona fuera de onAuthStateChange
  useEffect(() => {
    let active = true;
    if (!cloudUser) {
      setLoading(false);
      return;
    }

    const loadRole = async () => {
      if (active) {
        setLoading(true);
        setError(null);
      }
      try {
        await fetchUserRole(cloudUser.id);
      } catch (err) {
        console.error("[useCloudAuth] Error al obtener el rol del usuario:", err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadRole();

    // Timeout local de seguridad para evitar que la carga se quede colgada
    const roleTimeout = setTimeout(() => {
      if (active) {
        console.warn("[useCloudAuth] Timeout local esperando rol.");
        setLoading(false);
      }
    }, 8000);

    return () => {
      active = false;
      clearTimeout(roleTimeout);
    };
  }, [cloudUser]);

  const signIn = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;
      return data;
    } catch (err) {
      console.error("[useCloudAuth] Error al iniciar sesión:", err);
      setError(err.message || "Credenciales incorrectas");
      setLoading(false);
      throw err;
    }
  };

  const signUp = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (signUpError) throw signUpError;
      
      // Auto-asignación de rol 'admin' por defecto para el usuario recién registrado
      if (data?.user) {
        try {
          await supabase.from("user_roles").upsert({
            user_id: data.user.id,
            role: "admin"
          });
        } catch (roleErr) {
          console.warn("[useCloudAuth] Error al asignar rol automático al registrar:", roleErr);
        }
      }
      
      return data;
    } catch (err) {
      console.error("[useCloudAuth] Error al registrar usuario:", err);
      setError(err.message || "Error al registrar cuenta");
      setLoading(false);
      throw err;
    }
  };

  const signOut = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      setCloudUser(null);
      setRole(null);
      localStorage.removeItem("pda_cloud_role");
    } catch (err) {
      console.error("[useCloudAuth] Error al cerrar sesión:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    cloudUser,
    role,
    isAdmin: role === "admin",
    isEmployee: role === "employee",
    isKitchen: role === "kitchen",
    loading,
    error,
    signIn,
    signUp,
    signOut,
  };
}
