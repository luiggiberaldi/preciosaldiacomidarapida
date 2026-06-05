import React, { useState } from "react";
import { User, Plus, Trash2, Edit3, Key, Check, X, ShieldAlert, ChevronDown } from "lucide-react";
import { useAuthStore } from "../../hooks/store/useAuthStore";
import { showToast } from "../Toast";
import ConfirmModal from "../ConfirmModal";

const roleOptions = [
  { value: "ADMIN", label: "Administrador (Acceso Completo)" },
  { value: "CAJERO", label: "Cajero (Solo Ventas y Caja)" },
  { value: "MESERO", label: "Mesero (Solo Apertura y Comandas)" },
  { value: "COCINERO", label: "Cocinero (Solo Panel de Cocina)" },
];

function CustomSelect({ value, onChange, options, placeholder = "Seleccionar..." }) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((o) => o.value === value) || options[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-xs bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-3 py-2.5 font-medium text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/30 text-left transition-all"
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform shrink-0 ml-1 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl shadow-lg z-50 overflow-hidden py-1 animate-in fade-in slide-in-from-top-1.5 duration-100">
            {options.map((opt) => {
              const isSelected = value === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-medium text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors ${
                    isSelected
                      ? "text-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/20 dark:text-indigo-400 font-bold"
                      : "text-slate-650 dark:text-slate-350"
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <Check size={14} className="text-indigo-500 shrink-0" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default function UsersSettings() {
  const {
    usuarios,
    usuarioActivo,
    agregarUsuario,
    eliminarUsuario,
    editarUsuario,
    cambiarPin
  } = useAuthStore();

  const [isAdding, setIsAdding] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [changingPinUser, setChangingPinUser] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null); // holds user object to delete

  // Form states
  const [nombre, setNombre] = useState("");
  const [rol, setRol] = useState("CAJERO");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) {
      showToast("El nombre es requerido", "error");
      return;
    }
    const requiredPinLength = rol === "ADMIN" ? 6 : 4;
    if (pin.length !== requiredPinLength || !/^\d+$/.test(pin)) {
      showToast(`El PIN debe ser de exactamente ${requiredPinLength} números`, "error");
      return;
    }
    if (pin !== confirmPin) {
      showToast("Los PINs no coinciden", "error");
      return;
    }

    try {
      await agregarUsuario(nombre.trim(), rol, pin);
      showToast("Usuario creado con éxito", "success");
      // Reset form
      setNombre("");
      setRol("CAJERO");
      setPin("");
      setConfirmPin("");
      setIsAdding(false);
    } catch (err) {
      showToast("Error al crear usuario", "error");
    }
  };

  const handleEditUser = (e) => {
    e.preventDefault();
    if (!nombre.trim()) {
      showToast("El nombre es requerido", "error");
      return;
    }

    // Check if we are changing role of the last admin
    if (editingUser.rol === "ADMIN" && rol !== "ADMIN") {
      const admins = usuarios.filter((u) => u.rol === "ADMIN");
      if (admins.length <= 1) {
        showToast("No puedes degradar al único administrador", "error");
        return;
      }
    }

    editarUsuario(editingUser.id, { nombre: nombre.trim(), rol });
    showToast("Usuario modificado con éxito", "success");
    setNombre("");
    setEditingUser(null);
  };

  const handleChangePin = async (e) => {
    e.preventDefault();
    const requiredPinLength = changingPinUser.rol === "ADMIN" ? 6 : 4;
    if (pin.length !== requiredPinLength || !/^\d+$/.test(pin)) {
      showToast(`El PIN debe ser de exactamente ${requiredPinLength} números`, "error");
      return;
    }
    if (pin !== confirmPin) {
      showToast("Los PINs no coinciden", "error");
      return;
    }

    try {
      await cambiarPin(changingPinUser.id, pin);
      showToast("PIN actualizado con éxito", "success");
      setPin("");
      setConfirmPin("");
      setChangingPinUser(null);
    } catch (err) {
      showToast("Error al cambiar PIN", "error");
    }
  };

  const handleDeleteUserClick = (user) => {
    if (usuarioActivo && usuarioActivo.id === user.id) {
      showToast("No puedes eliminar al usuario activo", "error");
      return;
    }

    if (user.rol === "ADMIN") {
      const admins = usuarios.filter((u) => u.rol === "ADMIN");
      if (admins.length <= 1) {
        showToast("No puedes eliminar al único administrador del sistema", "error");
        return;
      }
    }

    setDeleteTarget(user);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    const deleted = eliminarUsuario(deleteTarget.id);
    if (deleted) {
      showToast("Usuario eliminado correctamente", "success");
    } else {
      showToast("Error al eliminar usuario", "error");
    }
    setDeleteTarget(null);
  };

  return (
    <div className="p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-sm space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <User size={16} className="text-indigo-500" />
          Operadores del POS (Usuarios)
        </h3>

        {!isAdding && !editingUser && !changingPinUser && (
          <button
            onClick={() => {
              setIsAdding(true);
              setNombre("");
              setRol("CAJERO");
              setPin("");
              setConfirmPin("");
            }}
            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 transition-colors text-xs font-bold active:scale-95"
          >
            <Plus size={14} />
            Nuevo Usuario
          </button>
        )}
      </div>

      {/* Form: Agregar Usuario */}
      {isAdding && (
        <form onSubmit={handleAddUser} className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/50 rounded-2xl space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Agregar Nuevo Operador
            </h4>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="p-1 bg-white dark:bg-slate-800 hover:text-red-500 rounded-lg border border-slate-100 dark:border-slate-700"
            >
              <X size={14} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nombre del Operador</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Juan Pérez"
                className="w-full p-2.5 text-xs bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rol de Acceso</label>
              <CustomSelect
                value={rol}
                onChange={setRol}
                options={roleOptions}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                PIN de Acceso ({rol === "ADMIN" ? "6" : "4"} dígitos)
              </label>
              <input
                type="password"
                maxLength={rol === "ADMIN" ? 6 : 4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder={rol === "ADMIN" ? "••••••" : "••••"}
                className="w-full p-2.5 text-xs bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30 tracking-widest text-center"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Confirmar PIN</label>
              <input
                type="password"
                maxLength={rol === "ADMIN" ? 6 : 4}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                placeholder={rol === "ADMIN" ? "••••••" : "••••"}
                className="w-full p-2.5 text-xs bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30 tracking-widest text-center"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl active:scale-95"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl active:scale-95 shadow-md shadow-indigo-600/10"
            >
              Guardar Usuario
            </button>
          </div>
        </form>
      )}

      {/* Form: Editar Usuario */}
      {editingUser && (
        <form onSubmit={handleEditUser} className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/50 rounded-2xl space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Editar Datos del Operador
            </h4>
            <button
              type="button"
              onClick={() => setEditingUser(null)}
              className="p-1 bg-white dark:bg-slate-800 hover:text-red-500 rounded-lg border border-slate-100 dark:border-slate-700"
            >
              <X size={14} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nombre del Operador</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre"
                className="w-full p-2.5 text-xs bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rol de Acceso</label>
              <CustomSelect
                value={rol}
                onChange={setRol}
                options={roleOptions}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditingUser(null)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl active:scale-95"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl active:scale-95 shadow-md shadow-indigo-600/10"
            >
              Actualizar Usuario
            </button>
          </div>
        </form>
      )}

      {/* Form: Cambiar PIN */}
      {changingPinUser && (
        <form onSubmit={handleChangePin} className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/50 rounded-2xl space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Cambiar PIN de Acceso
              </h4>
              <p className="text-[9px] text-slate-400 mt-0.5">Cambiando PIN para {changingPinUser.nombre}</p>
            </div>
            <button
              type="button"
              onClick={() => setChangingPinUser(null)}
              className="p-1 bg-white dark:bg-slate-800 hover:text-red-500 rounded-lg border border-slate-100 dark:border-slate-700"
            >
              <X size={14} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Nuevo PIN ({changingPinUser.rol === "ADMIN" ? "6" : "4"} dígitos)
              </label>
              <input
                type="password"
                maxLength={changingPinUser.rol === "ADMIN" ? 6 : 4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder={changingPinUser.rol === "ADMIN" ? "••••••" : "••••"}
                className="w-full p-2.5 text-xs bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30 tracking-widest text-center"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Confirmar PIN</label>
              <input
                type="password"
                maxLength={changingPinUser.rol === "ADMIN" ? 6 : 4}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                placeholder={changingPinUser.rol === "ADMIN" ? "••••••" : "••••"}
                className="w-full p-2.5 text-xs bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30 tracking-widest text-center"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setChangingPinUser(null)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl active:scale-95"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl active:scale-95 shadow-md shadow-indigo-600/10"
            >
              Actualizar PIN
            </button>
          </div>
        </form>
      )}

      {/* Users List */}
      <div className="space-y-3">
        {usuarios.map((user) => {
          const isActiveUser = usuarioActivo && usuarioActivo.id === user.id;
          const isOnlyAdmin = user.rol === "ADMIN" && usuarios.filter((u) => u.rol === "ADMIN").length <= 1;

          return (
            <div
              key={user.id}
              className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                isActiveUser
                  ? "bg-indigo-50/50 border-indigo-100 dark:bg-indigo-950/10 dark:border-indigo-900/30"
                  : "bg-slate-50/40 border-slate-100 dark:bg-slate-800/10 dark:border-slate-800/50"
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Initial Avatar */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-sm ${
                  user.rol === "ADMIN"
                    ? "bg-indigo-500 text-white"
                    : user.rol === "MESERO"
                    ? "bg-amber-500 text-white"
                    : user.rol === "COCINERO"
                    ? "bg-red-500 text-white"
                    : "bg-emerald-500 text-white"
                }`}>
                  {user.nombre.charAt(0).toUpperCase()}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-black text-slate-700 dark:text-slate-200">
                      {user.nombre}
                    </p>
                    {isActiveUser && (
                      <span className="px-1.5 py-0.5 bg-indigo-500 text-white font-bold text-[8px] rounded uppercase tracking-wider leading-none">
                        Tú
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border ${
                      user.rol === "ADMIN"
                        ? "bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500 border-indigo-100 dark:border-indigo-900/30"
                        : user.rol === "MESERO"
                        ? "bg-amber-50 dark:bg-amber-950/20 text-amber-500 border-amber-100 dark:border-amber-900/30"
                        : user.rol === "COCINERO"
                        ? "bg-red-50 dark:bg-red-950/20 text-red-500 border-red-100 dark:border-red-900/30"
                        : "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 border-emerald-100 dark:border-emerald-900/30"
                    }`}>
                      {user.rol}
                    </span>
                    {user.pinHashed && (
                      <span className="text-[9px] text-slate-400 font-medium">PIN Protegido</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  title="Editar nombre/rol"
                  onClick={() => {
                    setEditingUser(user);
                    setNombre(user.nombre);
                    setRol(user.rol);
                    setChangingPinUser(null);
                    setIsAdding(false);
                  }}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-xl transition-all"
                >
                  <Edit3 size={15} />
                </button>

                <button
                  type="button"
                  title="Cambiar PIN"
                  onClick={() => {
                    setChangingPinUser(user);
                    setPin("");
                    setConfirmPin("");
                    setEditingUser(null);
                    setIsAdding(false);
                  }}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 rounded-xl transition-all"
                >
                  <Key size={15} />
                </button>

                {!isActiveUser && !isOnlyAdmin && (
                  <button
                    type="button"
                    title="Eliminar usuario"
                    onClick={() => handleDeleteUserClick(user)}
                    className="p-2 hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-xl transition-all"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ConfirmModal para Eliminar Operador */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="¿Eliminar Operador Local?"
        message={deleteTarget ? `¿Estás seguro de que deseas eliminar al operador "${deleteTarget.nombre}"?\n\nEsta acción no se puede deshacer.` : ""}
        confirmText="Sí, eliminar"
        variant="danger"
      />
    </div>
  );
}
