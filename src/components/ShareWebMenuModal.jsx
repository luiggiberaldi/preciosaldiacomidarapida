import React, { useState, useEffect } from "react";
import { X, Copy, Check, QrCode, Globe } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { Modal } from "./Modal";
import { webSupabase, getTenantId } from "../utils/supabase";

export default function ShareWebMenuModal({ isOpen, onClose }) {
    const [slug, setSlug] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadSlug();
        }
    }, [isOpen]);

    const loadSlug = async () => {
        setIsLoading(true);
        try {
            const tenantId = getTenantId();
            const { data, error } = await webSupabase
                .from("web_config")
                .select("slug")
                .eq("tenant_id", tenantId)
                .single();

            if (error) throw error;
            if (data) {
                setSlug(data.slug);
            }
        } catch (err) {
            console.error("Error cargando el slug del local:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const getCatalogUrl = () => {
        if (!slug) return "";
        // Detectar si estamos en local o en producción
        const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
        const port = window.location.port; // 5174 (PWA)

        // Si la PWA está en local, apuntamos al puerto de la página web (5173 por defecto)
        if (isLocal) {
            return `http://${window.location.hostname}:5173/${slug}`;
        }

        // Si estás en producción, reemplazar por el dominio real del catálogo web.
        // Asumimos que el catálogo web está en el mismo dominio o configurar aquí
        return `https://tu-dominio.com/${slug}`;
    };

    const url = getCatalogUrl();

    const handleCopy = () => {
        if (!url) return;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Enlace de tu Catálogo">
            <div className="flex flex-col items-center p-6 space-y-6">
                {isLoading ? (
                    <div className="flex items-center justify-center p-10">
                        <div className="w-10 h-10 border-4 border-slate-200 border-t-red-500 rounded-full animate-spin"></div>
                    </div>
                ) : !slug ? (
                    <div className="text-center text-slate-500 py-6">
                        <p>No se encontró configuración para el menú web.</p>
                        <p className="text-xs mt-2">Asegúrate de haber publicado al menos una vez.</p>
                    </div>
                ) : (
                    <>
                        <div className="text-center space-y-2">
                            <div className="bg-red-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-2 text-red-500">
                                <Globe size={32} />
                            </div>
                            <h3 className="text-xl font-black text-slate-800">Menú V2.0 Listo</h3>
                            <p className="text-sm text-slate-500">Escanea este código o comparte el enlace para que tus clientes hagan pedidos.</p>
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
                            <label className="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-wider">
                                El enlace oficial de tu página web
                            </label>
                            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-red-500/30 transition-shadow">
                                <div className="flex-1 bg-transparent px-4 py-3 text-sm text-slate-700 font-medium truncate select-all">
                                    {url}
                                </div>
                                <button
                                    onClick={handleCopy}
                                    className={`flex items-center justify-center shrink-0 w-12 h-[46px] border-l border-slate-200 transition-colors ${copied ? "bg-green-50 text-green-600 hover:bg-green-100" : "bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-700"
                                        }`}
                                    title="Copiar enlace"
                                >
                                    {copied ? <Check size={20} /> : <Copy size={20} />}
                                </button>
                            </div>
                        </div>

                        {/* CTA Option */}
                        <button
                            onClick={() => window.open(url, "_blank")}
                            className="w-full py-4 bg-slate-900 hover:bg-black text-white font-bold rounded-xl shadow-lg shadow-slate-900/20 active:scale-[0.98] transition-all"
                        >
                            Abrir mi página web ahora
                        </button>
                    </>
                )}
            </div>
        </Modal>
    );
}
