import { createClient } from "@/lib/supabase/server";
import { exportAccountData, type ExportClient } from "@/lib/privacy-export";

export const dynamic = "force-dynamic";
const headers = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

export async function GET(request: Request) {
  if (request.headers.get("sec-fetch-site") === "cross-site") {
    return Response.json({ error: "Solicitação não permitida." }, { status: 403, headers });
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return Response.json({ error: "Entre na sua conta para exportar." }, { status: 401, headers });
  try {
    const exported = await exportAccountData(supabase as unknown as ExportClient, data.user.id);
    const account = { id: data.user.id, email: data.user.email, createdAt: data.user.created_at };
    return new Response(JSON.stringify({ ...exported, account }, null, 2), {
      headers: {
        ...headers,
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="descontrollle-dados.json"',
      },
    });
  } catch {
    return Response.json({ error: "Não foi possível concluir a exportação. Tente novamente sem editar os dados; se o problema persistir, consulte o responsável pelo ambiente." }, { status: 503, headers });
  }
}
