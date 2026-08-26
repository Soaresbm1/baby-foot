const REQUIRED_PUBLIC_ENV = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"] as const;

type PublicEnvironment = Record<(typeof REQUIRED_PUBLIC_ENV)[number], string>;

export function getPublicEnvironment(): PublicEnvironment {
  const values = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };

  for (const key of REQUIRED_PUBLIC_ENV) {
    if (!values[key]) {
      throw new Error(`Variable d’environnement manquante : ${key}`);
    }
  }

  return values as PublicEnvironment;
}

