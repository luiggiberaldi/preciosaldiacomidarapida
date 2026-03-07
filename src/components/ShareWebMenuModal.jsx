import React, { useState, useEffect, useRef } from "react";
import { Copy, Check, Globe, Pencil, Save, ExternalLink, Share2, Download, QrCode, Sparkles } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { Modal } from "./Modal";
import { webSupabase, getTenantId } from "../utils/supabase";
import { showToast } from "./Toast";

const WEB_BASE_URL = import.meta.env.VITE_WEB_BASE_URL || "https://paginacomidarapida.vercel.app";

export default function ShareWebMenuModal({ isOpen, onClose, effectiveRate }) {
    const [slug, setSlug] = useState("");
    const [businessName, setBusinessName] = useState("");
    const [editSlug, setEditSlug] = useState("");
    const [editName, setEditName] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const qrRef = useRef(null);

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

            // Helper to capitalize first letters
            const formatName = (str) => str.replace(/(^\w{1})|(\s+\w{1})/g, letter => letter.toUpperCase());
            const formattedName = formatName(editName.trim());

            const { error } = await webSupabase
                .from("web_config")
                .upsert({
                    tenant_id: tenantId,
                    slug: rawSlug,
                    business_name: formattedName,
                    exchange_rate: effectiveRate || 1,
                }, { onConflict: "tenant_id" });

            if (error) throw error;

            setSlug(rawSlug);
            setBusinessName(formattedName);
            setIsEditing(false);
            showToast("Pagina configurada con exito", "success");
        } catch (err) {
            console.error("Error guardando configuración:", err);
            showToast("Error al guardar. Inténtalo de nuevo.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const url = slug ? `${WEB_BASE_URL}/${slug}` : "";
    const shortUrl = url.replace("https://", "");

    const handleCopy = () => {
        if (!url) return;
        navigator.clipboard.writeText(url);
        setCopied(true);
        showToast("Enlace copiado", "success");
        setTimeout(() => setCopied(false), 2500);
    };

    const handleShareWhatsApp = () => {
        const text = `Hola, te comparto el menu de ${businessName}. Puedes ver los productos y hacer tu pedido directamente desde aqui:\n\n${url}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    };

    const handleShareNative = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: businessName,
                    text: `Mira el menú de ${businessName}`,
                    url: url,
                });
            } catch (e) { /* user cancelled */ }
        } else {
            handleCopy();
        }
    };

    const handleDownloadQR = () => {
        const canvas = qrRef.current?.querySelector("canvas");
        if (!canvas) return;
        const link = document.createElement("a");
        link.download = `QR-${slug}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        showToast("QR descargado", "success");
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Tu Página Web">
            <div className="flex flex-col items-center space-y-0">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <div className="w-12 h-12 border-4 border-slate-200 border-t-red-500 rounded-full animate-spin" />
                        <span className="text-xs font-medium text-slate-400">Cargando configuración...</span>
                    </div>
                ) : isEditing ? (
                    /* ─── FORMULARIO DE CONFIGURACIÓN ─── */
                    <div className="w-full space-y-5 p-6">
                        {/* Header */}
                        <div className="text-center space-y-2">
                            <div className="relative mx-auto w-16 h-16">
                                <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/25 rotate-3">
                                    <Globe size={30} className="text-white -rotate-3" />
                                </div>
                                <div className="absolute -top-1 -right-1 w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center shadow-md">
                                    <Sparkles size={12} className="text-amber-800" />
                                </div>
                            </div>
                            <h3 className="text-lg font-black text-slate-800">Configura tu página</h3>
                            <p className="text-xs text-slate-500 max-w-[240px] mx-auto leading-relaxed">
                                Escribe el nombre de tu negocio y crearemos tu página web automáticamente.
                            </p>
                        </div>

                        {/* Single Field — Name auto-generates slug */}
                        <div>
                            <label className="text-[11px] font-bold text-slate-400 mb-1.5 block uppercase tracking-widest">
                                Nombre de tu emprendimiento
                            </label>
                            <input
                                type="text"
                                value={editName}
                                onChange={(e) => {
                                    const name = e.target.value;
                                    setEditName(name);
                                    // Auto-generate slug from name
                                    const autoSlug = name
                                        .toLowerCase()
                                        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
                                        .replace(/[^a-z0-9\s-]/g, "")
                                        .replace(/\s+/g, "-")
                                        .replace(/-+/g, "-")
                                        .replace(/^-|-$/g, "");
                                    setEditSlug(autoSlug);
                                }}
                                placeholder="Ej: Hamburguesas El Rey"
                                className="w-full px-4 py-3.5 bg-white border-2 border-slate-200 rounded-2xl text-[15px] font-semibold text-slate-800 focus:ring-0 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-300"
                            />
                            {editName.trim() && (
                                <div className="mt-2.5 px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-100">
                                    <p className="text-[11px] text-slate-500 font-medium mb-0.5">Tu página será:</p>
                                    <p className="text-[12px] font-bold text-emerald-600 flex items-center gap-1">
                                        <Globe size={12} className="shrink-0 opacity-60" />
                                        <span className="opacity-50">paginacomidarapida.vercel.app/</span>
                                        <span>{editName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")}</span>
                                    </p>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handleSaveConfig}
                            disabled={isSaving || !editName.trim()}
                            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/25 active:scale-[0.97] transition-all flex items-center justify-center gap-2.5 disabled:opacity-40 text-[15px]"
                        >
                            {isSaving ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <><QrCode size={20} /> Crear mi página</>
                            )}
                        </button>
                    </div>
                ) : (
                    /* ─── VISTA QR Y ENLACE (Premium) ─── */
                    <>
                        {/* Header con gradiente */}
                        <div className="w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 pt-7 pb-8 text-center relative overflow-hidden rounded-t-none">
                            {/* Decorative elements */}
                            <div className="absolute top-0 left-0 w-full h-full opacity-10">
                                <div className="absolute top-4 left-8 w-20 h-20 bg-red-500 rounded-full blur-3xl" />
                                <div className="absolute bottom-2 right-6 w-24 h-24 bg-amber-400 rounded-full blur-3xl" />
                            </div>

                            <div className="relative z-10">
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 border border-emerald-400/30 rounded-full mb-3">
                                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                                    <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">En línea</span>
                                </div>
                                <h3 className="text-xl font-black text-white mb-1">{businessName}</h3>
                                <p className="text-slate-400 text-xs font-medium">Tu menú digital está activo y visible</p>
                            </div>
                        </div>

                        {/* QR Code Section */}
                        <div className="px-6 -mt-4 relative z-10 w-full flex flex-col items-center">
                            <div ref={qrRef} className="bg-white p-4 rounded-2xl shadow-xl shadow-slate-900/10 border border-slate-100 ring-1 ring-slate-900/5">
                                <QRCodeCanvas
                                    value={url}
                                    size={180}
                                    bgColor={"#ffffff"}
                                    fgColor={"#0f172a"}
                                    level={"H"}
                                    includeMargin={false}
                                    imageSettings={{
                                        src: "/icons/icono.png",
                                        x: undefined,
                                        y: undefined,
                                        height: 36,
                                        width: 36,
                                        excavate: true,
                                    }}
                                />
                            </div>

                            {/* Link Display */}
                            <div className="w-full mt-4">
                                <button
                                    onClick={handleCopy}
                                    className={`w-full flex items-center gap-2 px-4 py-3 rounded-2xl border-2 transition-all duration-300 active:scale-[0.98] ${copied
                                        ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                                        : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-white"
                                        }`}
                                >
                                    <Globe size={16} className="shrink-0 opacity-40" />
                                    <span className="flex-1 text-[13px] font-bold truncate text-left">
                                        {shortUrl}
                                    </span>
                                    {copied ? (
                                        <Check size={18} className="shrink-0 text-emerald-500" />
                                    ) : (
                                        <Copy size={16} className="shrink-0 opacity-40" />
                                    )}
                                </button>
                            </div>

                            {/* Action Buttons */}
                            <div className="grid grid-cols-3 gap-2 w-full mt-3">
                                <button
                                    onClick={() => window.open(url, "_blank")}
                                    className="flex flex-col items-center gap-1.5 py-3.5 bg-slate-900 hover:bg-black text-white rounded-2xl active:scale-[0.95] transition-all shadow-md"
                                >
                                    <ExternalLink size={20} />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">Abrir</span>
                                </button>
                                <button
                                    onClick={handleShareWhatsApp}
                                    className="flex flex-col items-center gap-1.5 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl active:scale-[0.95] transition-all shadow-md shadow-emerald-500/20"
                                >
                                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                                    <span className="text-[10px] font-bold uppercase tracking-wider">Enviar</span>
                                </button>
                                <button
                                    onClick={handleDownloadQR}
                                    className="flex flex-col items-center gap-1.5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl active:scale-[0.95] transition-all"
                                >
                                    <Download size={20} />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">QR</span>
                                </button>
                            </div>

                            {/* Native Share + Edit */}
                            <div className="flex gap-2 w-full mt-2 mb-1">
                                <button
                                    onClick={handleShareNative}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-white hover:bg-slate-50 text-slate-600 font-bold rounded-2xl active:scale-[0.98] transition-all text-xs border-2 border-slate-200"
                                >
                                    <Share2 size={15} />
                                    Compartir
                                </button>
                                <button
                                    onClick={() => { setEditSlug(slug); setEditName(businessName); setIsEditing(true); }}
                                    className="flex items-center justify-center gap-2 px-5 py-3 bg-white hover:bg-slate-50 text-slate-500 font-bold rounded-2xl active:scale-[0.98] transition-all text-xs border-2 border-slate-200"
                                    title="Editar configuración"
                                >
                                    <Pencil size={15} />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
}
