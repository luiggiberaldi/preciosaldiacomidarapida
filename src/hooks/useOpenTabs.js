import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { safeGetJSON, safeSetJSON } from "../utils/storageService";
import { getPriceUsd } from "../utils/priceHelpers";
import { supabase, getTenantId } from "../utils/supabase";

export const useOpenTabs = (initialTabs = []) => {
    const [openTabs, setOpenTabs] = useState(() => {
        return safeGetJSON("bodega_open_tabs_v1", initialTabs);
    });

    const tenantId = getTenantId();

    // Sincronizar local storage y despachar evento
    useEffect(() => {
        safeSetJSON("bodega_open_tabs_v1", openTabs);
        if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("bodega_open_tabs_updated"));
        }
    }, [openTabs]);

    // Cargar desde Supabase y suscribir en tiempo real
    useEffect(() => {
        let active = true;
        let subscription = null;

        const isUserAuthenticated = async () => {
            try {
                const { data } = await supabase.auth.getSession();
                return !!data?.session;
            } catch {
                return false;
            }
        };

        const syncWithCloud = async () => {
            try {
                const authenticated = await isUserAuthenticated();
                if (!authenticated) return;

                // 1. Obtener datos remotos
                const { data: remoteTabs, error } = await supabase
                    .from("pos_active_tabs")
                    .select("*")
                    .eq("user_id", tenantId);

                if (error) throw error;

                if (!active) return;

                // 2. Mapear de base de datos a formato cliente
                const mappedRemote = (remoteTabs || []).map(record => ({
                    id: record.id,
                    name: record.name,
                    items: record.items,
                    status: record.status,
                    customerInfo: record.customer_info,
                    createdAt: record.created_at,
                    updatedAt: record.updated_at
                }));

                // 3. Mezclar: Si hay elementos locales creados offline que no están en la DB, los subimos.
                const localTabs = safeGetJSON("bodega_open_tabs_v1", []);
                const tabsToUpload = localTabs.filter(local => 
                    !mappedRemote.some(remote => remote.id === local.id)
                );

                if (tabsToUpload.length > 0) {
                    const dbRecordsToUpload = tabsToUpload.map(tab => ({
                        id: tab.id,
                        user_id: tenantId,
                        table_id: tab.customerInfo?.tableId || tab.id,
                        name: tab.name,
                        items: tab.items,
                        status: tab.status,
                        customer_info: tab.customerInfo || {},
                        updated_at: tab.updatedAt || new Date().toISOString()
                    }));

                    const { error: upsertError } = await supabase
                        .from("pos_active_tabs")
                        .upsert(dbRecordsToUpload);

                    if (upsertError) {
                        console.error("Error al subir cuentas offline:", upsertError);
                    } else {
                        mappedRemote.push(...tabsToUpload);
                    }
                }

                setOpenTabs(mappedRemote);
            } catch (err) {
                console.error("Error sincronizando cuentas activas con Supabase:", err);
            }
        };

        syncWithCloud();

        // Suscribirse a cambios en tiempo real
        const setupSubscription = async () => {
            const authenticated = await isUserAuthenticated();
            if (!authenticated) return;

            subscription = supabase
                .channel("public:pos_active_tabs")
                .on(
                    "postgres_changes",
                    {
                        event: "*",
                        schema: "public",
                        table: "pos_active_tabs",
                        filter: `user_id=eq.${tenantId}`
                    },
                    (payload) => {
                        if (!active) return;

                        if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
                            const record = payload.new;
                            const updatedTab = {
                                id: record.id,
                                name: record.name,
                                items: record.items,
                                status: record.status,
                                customerInfo: record.customer_info,
                                createdAt: record.created_at,
                                updatedAt: record.updated_at
                            };

                            setOpenTabs((prev) => {
                                const exists = prev.some(t => t.id === updatedTab.id);
                                if (exists) {
                                    return prev.map(t => t.id === updatedTab.id ? updatedTab : t);
                                } else {
                                    return [...prev, updatedTab];
                                }
                            });
                        } else if (payload.eventType === "DELETE") {
                            const deletedId = payload.old.id;
                            setOpenTabs((prev) => prev.filter(t => t.id !== deletedId));
                        }
                    }
                )
                .subscribe();
        };

        setupSubscription();

        return () => {
            active = false;
            if (subscription) {
                supabase.removeChannel(subscription);
            }
        };
    }, [tenantId]);

    const addTab = async (name, cartItems, customerInfo = null) => {
        const newTab = {
            id: uuidv4(),
            name: name.trim() || "Mesa o Cuenta",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            items: [...cartItems],
            customerInfo: customerInfo,
            status: "ACTIVE"
        };

        // Actualizar estado local inmediatamente (Optimistic update)
        setOpenTabs((prev) => [...prev, newTab]);

        // Guardar en Supabase si está autenticado
        try {
            const { data } = await supabase.auth.getSession();
            if (data?.session) {
                const dbRecord = {
                    id: newTab.id,
                    user_id: tenantId,
                    table_id: newTab.customerInfo?.tableId || newTab.id,
                    name: newTab.name,
                    items: newTab.items,
                    status: newTab.status,
                    customer_info: newTab.customerInfo || {},
                    updated_at: newTab.updatedAt
                };

                const { error } = await supabase
                    .from("pos_active_tabs")
                    .upsert(dbRecord);

                if (error) throw error;
            }
        } catch (err) {
            console.error("Error al guardar cuenta en la nube:", err);
        }

        return newTab;
    };

    const updateTab = async (id, newItems, additionalData = {}) => {
        let updatedTab = null;

        setOpenTabs((prev) =>
            prev.map((tab) => {
                if (tab.id === id) {
                    updatedTab = {
                        ...tab,
                        items: [...newItems],
                        ...additionalData,
                        updatedAt: new Date().toISOString()
                    };
                    return updatedTab;
                }
                return tab;
            })
        );

        // Guardar en Supabase si está autenticado
        try {
            const { data } = await supabase.auth.getSession();
            if (data?.session && updatedTab) {
                const dbRecord = {
                    id: updatedTab.id,
                    user_id: tenantId,
                    table_id: updatedTab.customerInfo?.tableId || updatedTab.id,
                    name: updatedTab.name,
                    items: updatedTab.items,
                    status: updatedTab.status,
                    customer_info: updatedTab.customerInfo || {},
                    updated_at: updatedTab.updatedAt
                };

                const { error } = await supabase
                    .from("pos_active_tabs")
                    .upsert(dbRecord);

                if (error) throw error;
            }
        } catch (err) {
            console.error("Error al actualizar cuenta en la nube:", err);
        }
    };

    const removeTab = async (id) => {
        setOpenTabs((prev) => prev.filter((tab) => tab.id !== id));

        // Eliminar de Supabase si está autenticado
        try {
            const { data } = await supabase.auth.getSession();
            if (data?.session) {
                const { error } = await supabase
                    .from("pos_active_tabs")
                    .delete()
                    .eq("id", id);

                if (error) throw error;
            }
        } catch (err) {
            console.error("Error al eliminar cuenta en la nube:", err);
        }
    };

    const getTabTotal = (items) => {
        return items.reduce((sum, item) => sum + getPriceUsd(item) * item.qty, 0);
    };

    return {
        openTabs,
        addTab,
        updateTab,
        removeTab,
        getTabTotal,
    };
};
