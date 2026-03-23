import { createClient } from "@/lib/supabase/server";
import { getAdAccounts, getBusinesses, getUserProfile } from "@/lib/meta-api/oauth";
import { decrypt } from "@/lib/meta-api/encryption";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Facebook, CheckCircle2, AlertCircle, Building2, UserCircle, ChevronRight, ArrowLeft, Briefcase } from "lucide-react";
import { selectMetaAccount } from "./actions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default async function SelectAccountPage(props: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ business_id?: string }>;
}) {
  const { tenant: slug } = await props.params;
  const { business_id } = await props.searchParams;
  const supabase = await createClient();

  // Get Tenant ID
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, name")
    .eq("slug", slug)
    .single();

  if (!tenant) return <div>Empresa no encontrada</div>;

  // Get current connection
  const { data: connection } = await supabase
    .from("meta_connections")
    .select("*")
    .eq("tenant_id", tenant.id)
    .single();

  if (!connection) {
    redirect(`/${slug}/connect-meta`);
  }

  const token = decrypt(connection.access_token_encrypted);
  let businesses: any[] = [];
  let adAccounts: any[] = [];
  let userProfile: any = null;
  let error = null;
  let currentBusinessName = "";

  try {
    if (!business_id) {
      // Paso 1: Listar Portafolios con fotos
      const [resBiz, resUser] = await Promise.all([
        getBusinesses(token),
        getUserProfile(token)
      ]);
      businesses = resBiz.data || [];
      userProfile = resUser;
    } else {
      // Paso 2: Obtener cuentas del portafolio seleccionado (Dueñas o Compartidas)
      const res = await getAdAccounts(token, business_id);
      adAccounts = res.data || [];
      
      if (business_id === "personal") {
        // Filtrar solo las que no tienen negocio (personales)
        adAccounts = adAccounts.filter((acc: { business?: any }) => !acc.business);
        currentBusinessName = "Cuenta Personal";
      } else {
        // Intentar obtener el nombre del negocio seleccionado
        const bizRes = await getBusinesses(token);
        const currentBiz = bizRes.data?.find((b: { id: string }) => b.id === business_id);
        currentBusinessName = currentBiz?.name || "Cuenta Comercial";
      }
    }
  } catch (err: any) {
    error = err.message || "Error al obtener datos de Meta";
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pt-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center justify-between">
          <div className="flex items-center gap-3">
             <Facebook className="text-primary" />
             {business_id ? "Selecciona tu Cuenta Publicitaria" : "Selecciona un Portafolio"}
          </div>
          <div className="flex gap-2">
            {business_id && (
              <Link href={`/${slug}/connect-meta/select-account`}>
                <Button variant="ghost" size="sm" className="flex items-center gap-1">
                  <ArrowLeft size={16} /> Volver
                </Button>
              </Link>
            )}
            <Link href={`/${slug}/connect-meta`}>
              <Button variant="ghost" size="sm">
                Cancelar
              </Button>
            </Link>
          </div>
        </h1>
        <p className="text-muted-foreground text-sm">
          {!business_id 
            ? "Selecciona el portafolio comercial o tu cuenta personal para ver las cuentas publicitarias."
            : `Mostrando cuentas para: ${currentBusinessName}. Selecciona la que deseas sincronizar.`
          }
        </p>
      </div>

      {error ? (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-xl flex items-start gap-3">
          <AlertCircle className="shrink-0 mt-0.5" size={18} />
          <div>
            <h3 className="font-medium">Error</h3>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {!business_id ? (
            <>
              {/* Opción Personal con Foto de Perfil */}
              <Link href={`/${slug}/connect-meta/select-account?business_id=personal`}>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer group shadow-sm">
                  <CardContent className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {userProfile?.picture?.data?.url ? (
                        <img 
                          src={userProfile.picture.data.url} 
                          alt="Personal Profile" 
                          className="h-12 w-12 rounded-full border object-cover" 
                        />
                      ) : (
                        <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center shrink-0 border">
                          <UserCircle className="text-muted-foreground" size={24} />
                        </div>
                      )}
                      <div>
                        <h3 className="text-foreground font-medium group-hover:text-primary transition-colors">Cuenta Personal</h3>
                        <p className="text-muted-foreground text-sm">Cuentas no vinculadas a negocios de {userProfile?.name || "tu perfil"}</p>
                      </div>
                    </div>
                    <ChevronRight className="text-muted-foreground group-hover:text-primary transition-colors" />
                  </CardContent>
                </Card>
              </Link>

              {/* Portafolios Comerciales */}
              {businesses.length > 0 && (
                 <div className="mt-4 space-y-4">
                   <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">Cuentas Comerciales</h2>
                   {businesses.map((biz: any) => (
                     <Link key={biz.id} href={`/${slug}/connect-meta/select-account?business_id=${biz.id}`}>
                       <Card className="hover:border-primary/50 transition-colors cursor-pointer group shadow-sm">
                         <CardContent className="p-6 flex items-center justify-between">
                           <div className="flex items-center gap-4">
                             {biz.profile_picture_uri ? (
                               <img 
                                 src={biz.profile_picture_uri} 
                                 alt={biz.name} 
                                 className="h-12 w-12 rounded-lg border object-cover" 
                               />
                             ) : (
                               <div className="h-12 w-12 bg-muted rounded-lg flex items-center justify-center shrink-0 border">
                                 <Briefcase className="text-muted-foreground" size={24} />
                               </div>
                             )}
                             <div>
                               <h3 className="text-foreground font-medium group-hover:text-primary transition-colors">{biz.name}</h3>
                               <p className="text-muted-foreground text-sm">ID: {biz.id}</p>
                             </div>
                           </div>
                           <ChevronRight className="text-muted-foreground group-hover:text-primary transition-colors" />
                         </CardContent>
                       </Card>
                     </Link>
                   ))}
                 </div>
              )}
            </>
          ) : (
            <>
              {adAccounts.length === 0 ? (
                <div className="text-center py-10 bg-muted/20 border border-dashed rounded-2xl">
                  <p className="text-muted-foreground mb-4">No se encontraron cuentas publicitarias en este portafolio.</p>
                  <Link href={`/${slug}/connect-meta/select-account`}>
                    <Button variant="outline" size="sm">Volver a portafolios</Button>
                  </Link>
                </div>
              ) : (
                adAccounts.map((acc: any) => (
                  <Card key={acc.account_id} className="hover:border-primary/20 transition-colors shadow-sm">
                    <CardContent className="p-0">
                      <form action={selectMetaAccount} className="flex flex-col sm:flex-row items-center justify-between p-6 gap-4">
                        <input type="hidden" name="tenant_id" value={tenant.id} />
                        <input type="hidden" name="slug" value={slug} />
                        <input type="hidden" name="account_id" value={acc.account_id} />
                        <input type="hidden" name="account_name" value={acc.name} />
                        
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center shrink-0 border">
                            <Building2 className="text-muted-foreground" size={24} />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-foreground font-medium truncate">{acc.name}</h3>
                            <p className="text-muted-foreground text-sm">ID: {acc.account_id}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0">
                           {connection.ad_account_id === acc.account_id && (
                             <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5">
                               <CheckCircle2 size={12} className="mr-1" /> Actual
                             </Badge>
                           )}
                           <Button type="submit" variant={connection.ad_account_id === acc.account_id ? "outline" : "default"}>
                             {connection.ad_account_id === acc.account_id ? "Confirmar" : "Seleccionar"}
                           </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                ))
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
