// GET /api/registros — lê a caixa 🍽️ Diário (bruto) do Notion e devolve os
// registros (data, refeição, texto, se tem foto) pro Painel mostrar na aba do
// dia e na lista de correção. Só leitura.
//
// Pagina o Notion (antes cortava em 100 e a Campanha, as cargas e os recordes perdiam o passado):
//   ?paginas=N  até N páginas de 100 (padrão 3 = 300 registros, o que o app precisa)
//   ?tudo=1     até 30 páginas (3.000); é o que jornada.py e fatos.py usam
// Devolve `id` porque a tela de correção precisa dele pra editar/excluir (ver /api/registro).
import { autorizado } from './_auth.js';

export default async function handler(req, res) {
  if (!autorizado(req)) return res.status(401).json({ erro: 'acesso' });
  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  const DB = process.env.DIARIO_DB_ID;
  if (!NOTION_TOKEN || !DB) return res.status(500).json({ error: 'config faltando' });

  const q = req.query || {};
  const maxPag = q.tudo ? 30 : Math.max(1, Math.min(30, parseInt(q.paginas, 10) || 3));
  try {
    const results = []; let cursor; let truncado = false;
    for (let pag = 0; pag < maxPag; pag++) {
      const r = await fetch(`https://api.notion.com/v1/databases/${DB}/query`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${NOTION_TOKEN}`, 'Content-Type': 'application/json', 'Notion-Version': '2022-06-28' },
        body: JSON.stringify({ page_size: 100, start_cursor: cursor, sorts: [{ property: 'Data', direction: 'descending' }] }),
      });
      if (!r.ok) return res.status(502).json({ error: 'notion', detail: await r.text() });
      const d = await r.json();
      results.push(...(d.results || []));
      if (!d.has_more) break;
      cursor = d.next_cursor;
      if (pag === maxPag - 1) truncado = true;
    }
    const items = results.map((p) => {
      const pr = p.properties || {};
      return {
        id: p.id,
        data: (pr.Data?.date?.start || '').slice(0, 10) || null,
        hora: (pr.Data?.date?.start || '').length > 10 ? pr.Data.date.start.slice(11, 16) : null,
        tipo: pr.Tipo?.select?.name || 'Refeição',
        refeicao: pr['Refeição']?.select?.name || null,
        texto: (pr.Texto?.rich_text || []).map((t) => t.plain_text).join(''),
        foto: (pr.Foto?.files || []).length > 0,
        fotos: (pr.Foto?.files || []).length,
        processado: pr.Processado?.checkbox === true,
      };
    }).filter((x) => x.data);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ items, truncado });
  } catch (e) {
    return res.status(500).json({ error: String(e && e.message || e) });
  }
}
