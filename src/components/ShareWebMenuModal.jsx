import React, { useState, useEffect } from "react";
import { Copy, Check, Globe, Pencil, Save } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { Modal } from "./Modal";
import { webSupabase, getTenantId } from "../utils/supabase";
import { showToast } from "./Toast";

const WEB_BASE_URL = import.meta.env.VITE_WEB_BASE_URL || "https://paginacomidarapida.vercel.app";

export default function ShareWebMenuModal({ isOpen, onClose }) {
    const [slug, setSlug] = useState("");
    const [businessName, setBusinessName] = useState("");
    const [editSlug, setEditSlug] = useState("");
    const [editName, setEditName] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (isOpen) loadConfig();
    }, [isOpen]);

    const loadConfig = async () => {
        setIsLoading(true);
        try {
            const tenantId = getTenantId();
            const { data, error } = await webSupabase
                .from("web_config")
                .select("slug, business_name")
                .eq("tenant_id", tenantId)
                .single();

            if (data) {
                setSlug(data.slug || "");
                setBusinessName(data.business_name || "");
                setEditSlug(data.slug || "");
                setEditName(data.business_name || "");
            } else {
                // No config found - let user create one
                setIsEditing(true);
            }
        } catch (err) {
            console.error("Error cargando la configuración:", err);
            setIsEditing(true);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveConfig = async () => {
        const rawSlug = editSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
        if (!rawSlug) return showToast("El nombre de la URL no puede estar vacío", "warning");
        if (!editName.trim()) return showToast("El nombre del negocio no puede estar vacío", "warning");

        setIsSaving(true);
        try {
            const tenantId = getTenantId();

            // Check if slug is already taken by another tenant
            const { data: existing } = await webSupabase
                .from("web_config")
                .select("tenant_id")
                .eq("slug", rawSlug)
                .neq("tenant_id", tenantId)
                .maybeSingle();

            if (existing) {
                showToast("Ese nombre de URL ya está en uso. Elige otro.", "error");
                setIsSaving(false);
                return;
            }

            const { error } = await webSupabase
                .from("web_config")
                .upsert({
                    tenant_id: tenantId,
                    slug: rawSlug,
                    business_name: editName.trim(),
                }, { onConflict: "tenant_id" });

            if (error) throw error;

            setSlug(rawSlug);
            setBusinessName(editName.trim());
            setIsEditing(false);
            showToast("✅ Configuración guardada", "success");
        } catch (err) {
            console.error("Error guardando configuración:", err);
            showToast("Error al guardar. Inténtalo de nuevo.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const url = slug ? `${WEB_BASE_URL}/${slug}` : "";

    const handleCopy = () => {
        if (!url) return;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Tu Menú Online">
            <div className="flex flex-col items-center p-6 space-y-5">
                {isLoading ? (
                    <div className="flex items-center justify-center p-10">
                        <div className="w-10 h-10 border-4 border-slate-200 border-t-red-500 rounded-full animate-spin" />
                    </div>
                ) : isEditing ? (
                    /* ─── FORMULARIO DE CONFIGURACIÓN ─── */
                    <div className="w-full space-y-4">
                        <div className="text-center space-y-1">
                            <div className="bg-emerald-50 rounded-full w-14 h-14 flex items-center justify-center mx-auto text-emerald-500">
                                <Globe size={28} />
                            </div>
                            <h3 className="text-lg font-black text-slate-800">Configura tu página</h3>
                            <p className="text-xs text-slate-500">Elige el enlace único de tu negocio. Solo se usa una vez.</p>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1 block uppercase tracking-wider">
                                    Nombre del negocio
                                </label>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    placeholder="Ej: Hamburguesas El Rey"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1 block uppercase tracking-wider">
                                    Nombre en la URL (sin espacios)
                                </label>
                                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500/30 focus-within:border-emerald-500 transition-all">
                                    <span className="pl-3 pr-1 text-xs text-slate-400 font-mono shrink-0 hidden sm:block">{WEB_BASE_URL.replace("https://", "")}/</span>
                                    <input
                                        type="text"
                                        value={editSlug}
                                        onChange={(e) => setEditSlug(e.target.value.toLowerCase().replace(/\s/g, "-"))}
                                        placeholder="mi-local"
                                        className="flex-1 px-3 py-3 bg-transparent text-sm font-bold text-emerald-700 outline-none"
                                    />
                                </div>
                                {editSlug && (
                                    <p className="text-[10px] text-slate-400 mt-1 ml-1">
                                        Tu enlace quedará: <span className="font-bold text-emerald-600">{WEB_BASE_URL}/{editSlug.toLowerCase().replace(/[^a-z0-9-]/g, "-")}</span>
                                    </p>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={handleSaveConfig}
                            disabled={isSaving}
                            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                        >
                            {isSaving ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <><Save size={18} /> Guardar y Generar QR</>
                            )}
                        </button>
                    </div>
                ) : (
                    /* ─── VISTA QR Y ENLACE ─── */
                    <>
                        <div className="text-center space-y-1">
                            <div className="bg-red-50 rounded-full w-14 h-14 flex items-center justify-center mx-auto text-red-500">
                                <Globe size={28} />
                            </div>
                            <h3 className="text-xl font-black text-slate-800">{businessName}</h3>
                            <p className="text-xs text-slate-500">Escanea o comparte este enlace con tus clientes.</p>
                        </div>

                        {/* Código QR */}
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 inline-block">
                            <QRCodeCanvas
                                value={url}
                                size={200}
                                bgColor={"#ffffff"}
                                fgColor={"#0f172a"}
                                level={"H"}
                                includeMargin={false}
                            />
                        </div>

                        {/* Link Box */}
                        <div className="w-full">
                            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                                <div className="flex-1 px-4 py-3 text-sm text-emerald-700 font-bold truncate select-all">
                                    {url}
                                </div>
                                <button
                                    onClick={handleCopy}
                                    className={`flex items-center justify-center shrink-0 w-12 h-[46px] border-l border-slate-200 transition-colors ${copied ? "bg-green-50 text-green-600" : "bg-white hover:bg-slate-100 text-slate-500"
                                        }`}
                                    title="Copiar enlace"
                                >
                                    {copied ? <Check size={20} /> : <Copy size={20} />}
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-2 w-full">
                            <button
                                onClick={() => window.open(url, "_blank")}
                                className="flex-1 py-3.5 bg-slate-900 hover:bg-black text-white font-bold rounded-xl shadow-lg active:scale-[0.98] transition-all text-sm"
                            >
                                Abrir página web
                            </button>
                            <button
                                onClick={() => { setEditSlug(slug); setEditName(businessName); setIsEditing(true); }}
                                className="p-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl active:scale-[0.98] transition-all"
                                title="Cambiar nombre"
                            >
                                <Pencil size={18} />
                            </button>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
}
