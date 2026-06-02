import { useState, useEffect } from "react";
import { supabase } from "../utils/supabase";

export function useCatalog(slug) {
  const [catalog, setCatalog] = useState([]);
  const [config, setConfig] = useState({
    business_name: "Cargando...",
    is_open: true,
    whatsapp_number: "",
    tenant_id: null,
    exchange_rate: 1,
  });
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    let catalogSub;
    let configSub;

    const fetchCatalog = async (tenantId) => {
      try {
        const { data: catalogData } = await supabase
          .from("web_catalog")
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("is_available", true)
          .order("category", { ascending: true })
          .order("name", { ascending: true });

        if (catalogData) {
          setCatalog(catalogData);
        }
      } catch (err) {
        console.error("Error refrescando catalogo:", err);
      }
    };

    const init = async () => {
      setLoading(true);
      try {
        // 1. Look up tenant by slug
        const { data: configData, error: configError } = await supabase
          .from("web_config")
          .select("*")
          .eq("slug", slug)
          .maybeSingle();

        if (configError || !configData) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        // Ensure exchange_rate always has a safe default
        setConfig({
          ...configData,
          exchange_rate: configData.exchange_rate || 1,
        });
        const tenantId = configData.tenant_id;

        // 2. Fetch catalog filtered by tenant
        await fetchCatalog(tenantId);

        // 3. Subscribe to realtime catalog changes filtered by tenant
        catalogSub = supabase
          .channel(`catalog-${tenantId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "web_catalog",
              filter: `tenant_id=eq.${tenantId}`,
            },
            () => {
              fetchCatalog(tenantId);
            },
          )
          .subscribe();

        // 4. Subscribe to realtime config changes (rate, name, delivery)
        configSub = supabase
          .channel(`config-${tenantId}`)
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "web_config",
              filter: `tenant_id=eq.${tenantId}`,
            },
            (payload) => {
              if (payload.new) {
                setConfig(prev => ({
                  ...prev,
                  ...payload.new,
                  exchange_rate: payload.new.exchange_rate || prev.exchange_rate,
                }));
              }
            },
          )
          .subscribe();
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    init();

    return () => {
      if (catalogSub) supabase.removeChannel(catalogSub);
      if (configSub) supabase.removeChannel(configSub);
    };
  }, [slug]);

  return { catalog, config, loading, notFound };
}
