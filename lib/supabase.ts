import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/**
 * Ortam değişkeni yokken (yerel önizleme) sorgular boş döner.
 * Anahtarlar tanımlıyken gerçek istemci kullanılır; davranış değişmez.
 */
function createUnconfiguredClient(): SupabaseClient {
  const settled = Promise.resolve({ data: null, error: null, count: 0, status: 200, statusText: "OK" });
  const chain: unknown = new Proxy(function noop() {
    return chain;
  }, {
    get(_target, prop) {
      if (prop === "then") return settled.then.bind(settled);
      if (prop === "catch") return settled.catch.bind(settled);
      if (prop === "finally") return settled.finally.bind(settled);
      return () => chain;
    },
    apply() {
      return chain;
    },
  });

  return {
    from: () => chain,
  } as unknown as SupabaseClient;
}

/**
 * Client-side (tarayıcı) kullanımı için Supabase istemcisi.
 * "use client" bileşenlerinde ve genel okuma işlemlerinde kullanılır.
 * Row Level Security (RLS) politikalarına tabidir.
 */
export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : createUnconfiguredClient();

/**
 * Server-side (API Route / Server Action) kullanımı için Supabase istemcisi.
 * service_role anahtarını kullanır, bu yüzden RLS'yi bypass eder.
 * SADECE sunucu tarafında (route.ts, server action içinde) import edilmelidir.
 * İstemci (browser) tarafına asla sızdırılmamalıdır.
 */
export function createServiceRoleClient(): SupabaseClient {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase URL veya Anon Key tanımlı değil. .env.local dosyanızı kontrol edin."
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY tanımlı değil. Bu anahtar sadece sunucu ortam değişkenlerinde bulunmalıdır."
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
