// GET /api/registros — lê a caixa 🍽️ Diário (bruto) do Notion e devolve os
// registros (data, refeição, texto, se tem foto) pro Painel mostrar na aba do
// dia e na lista de correção. Só leitura.
//
// Devolve `id` porque a tela de correção precisa dele pra editar/excluir
// (ver /api/registro).

export default async function handler(req, res) {
  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  const DB = process.env.DIARIO_DB_ID;
  if (!NOTION_TOKEN || !DB) return res.status(500).json({ error: 'config faltando' });

  try {
    const r = await fetch(`https://api.notion.com/v1/databases/${DB}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        page_size: 100,
        sorts: [{ property: 'Data', direction: 'descending' }],
      }),
    });
    if (!r.ok) return res.status(502).json({ error: 'notion', detail: await r.text() });
    const d = await r.json();
    const items = (d.results || []).map((p) => {
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
    return res.status(200).json({ items });
  } catch (e) {
    return res.status(500).json({ error: String(e && e.message || e) });
  }
}
