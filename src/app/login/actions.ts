"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function normalizeEmail(formData: FormData) {
  return String(formData.get("email") ?? "").trim().toLowerCase();
}

function password(formData: FormData) {
  return String(formData.get("password") ?? "");
}

export async function login(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: normalizeEmail(formData),
    password: password(formData),
  });

  if (error) redirect(`/login?error=${encodeURIComponent("E-mail ou senha inválidos.")}`);
  redirect("/");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const email = normalizeEmail(formData);
  const { error } = await supabase.auth.signUp({
    email,
    password: password(formData),
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback`,
    },
  });

  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect(`/login?message=${encodeURIComponent("Conta criada. Confirme seu e-mail para entrar.")}`);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
