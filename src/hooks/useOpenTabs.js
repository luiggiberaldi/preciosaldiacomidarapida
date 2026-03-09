import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { safeGetJSON, safeSetJSON } from "../utils/storageService";
import { getPriceUsd } from "../utils/priceHelpers";

export const useOpenTabs = (initialTabs = []) => {
    const [openTabs, setOpenTabs] = useState(() => {
        return safeGetJSON("bodega_open_tabs_v1", initialTabs);
    });

    useEffect(() => {
        safeSetJSON("bodega_open_tabs_v1", openTabs);
    }, [openTabs]);

    const addTab = (name, cartItems, customerInfo = null) => {
        const newTab = {
            id: uuidv4(),
            name: name.trim() || "Mesa o Cuenta",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            items: [...cartItems],
            customerInfo: customerInfo,
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
