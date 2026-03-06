import { useState, useEffect } from "react";
import { supabase } from "../utils/supabase";

export function useCatalog() {
  const [catalog, setCatalog] = useState([]);
  const [config, setConfig] = useState({
    name: "Comida Rápida",
    isOpen: true,
    whatsappNumber: "",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();

    // Listen to config changes
    const configSub = supabase
      .channel("public:web_config")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "web_config" },
        (payload) => {
          if (payload.new) setConfig(payload.new);
        },
      )
      .subscribe();

    // Listen to catalog changes
    const catalogSub = supabase
      .channel("public:web_catalog")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "web_catalog" },
        (payload) => {
          fetchData(); // Refresh catalog on any change
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(configSub);
      supabase.removeChannel(catalogSub);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Config
      const { data: configData } = await supabase
        .from("web_config")
        .select("*")
        .single();
      if (configData) {
        setConfig(configData);
      }

      // Fetch active catalog
      const { data: catalogData } = await supabase
        .from("web_catalog")
        .select("*")
        .eq("is_available", true)
        .order("category", { ascending: true })
        .order("name", { ascending: true });

      if (catalogData) {
        setCatalog(catalogData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  return { catalog, config, loading, refresh: fetchData };
}
