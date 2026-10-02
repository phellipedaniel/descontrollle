import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { Panel } from "@/components/ui/panel";

export const dynamic = "force-dynamic";

export default async function PrivacyPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  const signedIn = !error && Boolean(data.user);
  return <main className="ds-privacy">
    <Link href={signedIn ? "/" : "/login"} className="ds-button ghost">Voltar</Link>
    <PageHeader title="Privacidade e dados" description="Informações sobre este ambiente de uso pessoal." />
    <div className="ds-privacy-sections">
      <Panel><h2>Uso atual</h2><p>O descontrollle é utilizado pelo próprio responsável pelo ambiente para organizar suas finanças. A aplicação não oferece cadastro a outras pessoas. Uma futura oferta a terceiros exigirá a definição do responsável, do contato de privacidade e a atualização destas informações.</p><p className="muted">Atualizado em 2 de outubro de 2026.</p></Panel>
      <Panel><h2>Quais dados são utilizados</h2><p>A conta utiliza e-mail e autenticação. Os registros financeiros incluem movimentações, categorias, contas, planejamento, objetivos, dívidas, patrimônio, recorrências e reflexões que você preencher. Importações podem preservar documentos e versões originais para conferência.</p><p>Evite incluir senhas bancárias, números completos de cartão, documentos de identidade ou informações sensíveis de outras pessoas nas descrições e reflexões.</p></Panel>
      <Panel><h2>Armazenamento e navegação</h2><p>A aplicação é hospedada na Vercel e utiliza Supabase para autenticação e banco de dados. Esses fornecedores podem manter registros operacionais e backups conforme as configurações e os contratos aplicáveis.</p><p>Cookies mantêm sua autenticação. O navegador também salva a preferência de navegação expandida ou recolhida. Não há ferramentas de publicidade ou analytics adicionadas pela aplicação. Roboto e Poppins são servidas pela própria aplicação.</p></Panel>
      <Panel><h2>Acessar seus registros</h2><p>Você pode baixar os dados da conta presentes nas tabelas da aplicação. A exportação não contém senhas ou tokens. Fontes privadas da importação, arquivos locais, logs e backups exigem conferência separada pelo responsável pelo ambiente.</p>{signedIn ? <a className="ds-button primary" href="/privacy/export">Baixar dados da conta</a> : <Link className="ds-button primary" href="/login">Entrar para baixar dados</Link>}<p className="muted">O arquivo contém informações financeiras. Guarde-o em um local privado.</p></Panel>
      <Panel><h2>Correção, retenção e exclusão</h2><p>As edições usuais continuam seguindo as regras financeiras, incluindo períodos fechados. Correções do histórico e encerramento da conta devem ser tratados pelo responsável pelo ambiente, incluindo fontes importadas e cópias fora da aplicação.</p><p>A exclusão não acontece ao sair da conta. Há um procedimento administrativo separado para encerrar o cadastro e eliminar os dados no banco. Arquivos locais e backups precisam ser tratados conforme o procedimento de retenção do ambiente.</p><p>Este ambiente é pessoal e ainda não oferece atendimento público a titulares. Antes de aceitar outros usuários, será necessário publicar um canal de privacidade e concluir as verificações jurídicas e operacionais.</p></Panel>
    </div>
  </main>;
}
