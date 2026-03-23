-- Enums
CREATE TYPE user_role AS ENUM ('superadmin', 'user');
CREATE TYPE tenant_status AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE connection_status AS ENUM ('connected', 'disconnected', 'expired');

-- Tabla de tenants (empresas)
CREATE TABLE tenants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  status tenant_status DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Perfiles (extiende auth.users de Supabase)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  role user_role DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Relación Tenant-Usuario (N:N)
CREATE TABLE tenant_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

-- Conexiones a Meta
CREATE TABLE meta_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  access_token_encrypted TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  ad_account_id TEXT NOT NULL,
  ad_account_name TEXT,
  status connection_status DEFAULT 'connected',
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Caché de campañas
CREATE TABLE campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meta_connection_id UUID REFERENCES meta_connections(id) ON DELETE CASCADE NOT NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  campaign_id TEXT NOT NULL,
  campaign_name TEXT NOT NULL,
  status TEXT,
  objective TEXT,
  daily_budget NUMERIC,
  lifetime_budget NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(meta_connection_id, campaign_id)
);

-- Métricas de anuncios (insights agregados)
CREATE TABLE ad_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  impressions BIGINT DEFAULT 0,
  reach BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  spend NUMERIC(12,2) DEFAULT 0,
  cpc NUMERIC(10,4) DEFAULT 0,
  ctr NUMERIC(6,4) DEFAULT 0,
  roas NUMERIC(10,4) DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(campaign_id, date)
);

-- Logs de sincronización
CREATE TABLE sync_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  meta_connection_id UUID REFERENCES meta_connections(id) ON DELETE SET NULL,
  status TEXT NOT NULL, -- 'success', 'error', 'partial'
  message TEXT,
  records_synced INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- ============ ROW LEVEL SECURITY ============

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- Función helper: obtener rol del usuario actual
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Función helper: obtener IDs de tenants del usuario actual
CREATE OR REPLACE FUNCTION get_user_tenant_ids()
RETURNS SETOF UUID AS $$
  SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND is_active = true;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- PROFILES: usuarios ven su propio perfil, superadmin ve todos
CREATE POLICY "Usuarios ven su perfil" ON profiles
  FOR SELECT USING (id = auth.uid() OR get_user_role() = 'superadmin');
CREATE POLICY "Usuarios actualizan su perfil" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- TENANTS: superadmin acceso total, usuarios ven solo los suyos
CREATE POLICY "Superadmin acceso total a tenants" ON tenants
  FOR ALL USING (get_user_role() = 'superadmin');
CREATE POLICY "Usuarios ven sus tenants" ON tenants
  FOR SELECT USING (id IN (SELECT get_user_tenant_ids()));

-- TENANT_USERS: superadmin acceso total, usuarios ven sus membresías
CREATE POLICY "Superadmin acceso total a tenant_users" ON tenant_users
  FOR ALL USING (get_user_role() = 'superadmin');
CREATE POLICY "Usuarios ven sus membresías" ON tenant_users
  FOR SELECT USING (user_id = auth.uid());

-- META_CONNECTIONS: aislado por tenant
CREATE POLICY "Superadmin acceso total a meta_connections" ON meta_connections
  FOR ALL USING (get_user_role() = 'superadmin');
CREATE POLICY "Usuarios del tenant gestionan sus conexiones" ON meta_connections
  FOR ALL USING (tenant_id IN (SELECT get_user_tenant_ids()));

-- CAMPAIGNS: aislado por tenant
CREATE POLICY "Superadmin acceso total a campaigns" ON campaigns
  FOR ALL USING (get_user_role() = 'superadmin');
CREATE POLICY "Usuarios del tenant ven sus campañas" ON campaigns
  FOR SELECT USING (tenant_id IN (SELECT get_user_tenant_ids()));

-- AD_INSIGHTS: aislado por tenant
CREATE POLICY "Superadmin acceso total a ad_insights" ON ad_insights
  FOR ALL USING (get_user_role() = 'superadmin');
CREATE POLICY "Usuarios del tenant ven sus insights" ON ad_insights
  FOR SELECT USING (tenant_id IN (SELECT get_user_tenant_ids()));

-- SYNC_LOGS: solo superadmin
CREATE POLICY "Superadmin acceso total a sync_logs" ON sync_logs
  FOR ALL USING (get_user_role() = 'superadmin');

-- Triggers for profiles
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'full_name', ''), 'user');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();
