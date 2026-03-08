import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

export const useOpenTabs = (initialTabs = []) => {
    const [openTabs, setOpenTabs] = useState(() => {
        try {
            const saved = localStorage.getItem("bodega_open_tabs_v1");
            return saved ? JSON.parse(saved) : initialTabs;
        } catch (e) {
            console.error("Error cargando openTabs", e);
            return initialTabs;
        }
    });

    useEffect(() => {
        localStorage.setItem("bodega_open_tabs_v1", JSON.stringify(openTabs));
    }, [openTabs]);

    const addTab = (name, cartItems, customerInfo = null) => {
        const newTab = {
            id: uuidv4(),
            name: name.trim() || "Mesa o Cuenta",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            items: [...cartItems],
            customerInfo: customerInfo, // por si dejan nombre/tlf registrado
        };
        setOpenTabs((prev) => [...prev, newTab]);
        return newTab;
    };

    const updateTab = (id, newItems) => {
        setOpenTabs((prev) =>
            prev.map((tab) =>
                tab.id === id
                    ? { ...tab, items: [...newItems], updatedAt: new Date().toISOString() }
                    : tab
            )
        );
    };

    const removeTab = (id) => {
        setOpenTabs((prev) => prev.filter((tab) => tab.id !== id));
    };

    const getTabTotal = (items) => {
        return items.reduce((sum, item) => sum + item.priceUsdt * item.qty, 0);
    };

    return {
        openTabs,
        addTab,
        updateTab,
        removeTab,
        getTabTotal,
    };
};
