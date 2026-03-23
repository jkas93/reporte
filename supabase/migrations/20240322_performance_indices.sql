-- Optimizando consultas de Dashboard multitenant
CREATE INDEX IF NOT EXISTS idx_ad_insights_tenant_date ON public.ad_insights (tenant_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_ad_insights_campaign_date ON public.ad_insights (campaign_id, date DESC);

-- Índice para el cron job (búsqueda de conexiones activas)
CREATE INDEX IF NOT EXISTS idx_meta_connections_status ON public.meta_connections (status) WHERE status = 'connected';
