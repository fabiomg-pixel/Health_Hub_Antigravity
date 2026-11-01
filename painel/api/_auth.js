// Segunda trava (a primeira é o middleware.js): cada função confere o código de acesso sozinha.
export function autorizado(req) {
  const chave = process.env.PAINEL_KEY;
  if (!chave) return true;   // barreira desligada até o ./ativar_acesso.sh
  const dado = String(req.headers['x-painel-key'] || '');
  if (dado.length !== chave.length) return false;
  let r = 0;
  for (let i = 0; i < dado.length; i++) r |= dado.charCodeAt(i) ^ chave.charCodeAt(i);
  return r === 0;
}
