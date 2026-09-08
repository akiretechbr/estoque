import { mkdir, writeFile } from 'node:fs/promises';

const token = process.env.OLIST_API_TOKEN;
if (!token) throw new Error('Secret OLIST_API_TOKEN não configurado.');
const base = 'https://api.tiny.com.br/api2';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let minimumInterval = 2200;
let lastCallAt = 0;

async function call(endpoint, fields) {
  const body = new URLSearchParams({ token, formato: 'JSON', ...fields });
  for (let attempt = 1; attempt <= 6; attempt++) {
    const wait = Math.max(0, minimumInterval - (Date.now() - lastCallAt));
    if (wait) await pause(wait);
    lastCallAt = Date.now();
    const response = await fetch(`${base}/${endpoint}`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body });
    const accountLimit = Number(response.headers.get('x-limit-api'));
    if (accountLimit > 0) minimumInterval = Math.max(600, Math.ceil(60000 / (accountLimit * 0.8)));
    if (response.ok) {
      const json = await response.json();
      const root = json.retorno;
      if (root?.status === 'OK') return root;
      const message = (root?.erros || []).map(x => x.erro).join('; ') || `Erro ${root?.codigo_erro || 'desconhecido'}`;
      if (root?.codigo_erro === 20) return root;
      if (/bloqueada|excedido o n.mero de acessos/i.test(message) && attempt < 6) {
        console.warn(`Limite temporário da API; nova tentativa em 65 segundos (${attempt}/6).`);
        await pause(65000);
        continue;
      }
      throw new Error(`${endpoint}: ${message}`);
    }
    if (attempt === 6) throw new Error(`${endpoint}: HTTP ${response.status}`);
    await pause(attempt * 1500);
  }
}

const products = [];
let page = 1, pages = 1;
do {
  const result = await call('produtos.pesquisa.php', { pesquisa: '', situacao: 'A', pagina: String(page) });
  pages = Number(result.numero_paginas || 1);
  for (const item of result.produtos || []) products.push(item.produto);
  page++;
} while (page <= pages);

const lowStock = [];
for (let i = 0; i < products.length; i++) {
  const source = products[i];
  const details = await call('produto.obter.php', { id: String(source.id) });
  const inventory = await call('produto.obter.estoque.php', { id: String(source.id) });
  const product = details.produto || {};
  const stock = Number(inventory.produto?.saldo || 0);
  const minimum = Number(product.estoque_minimo || 0);
  if (stock <= minimum) lowStock.push({ id: String(source.id), sku: String(product.codigo || source.codigo || ''), product: String(product.nome || source.nome || ''), stock, minimum, unit: String(product.unidade || source.unidade || '') });
}

lowStock.sort((a,b) => (a.stock-a.minimum)-(b.stock-b.minimum) || a.product.localeCompare(b.product,'pt-BR'));
const output = { updatedAt: new Date().toISOString(), summary: { monitored: products.length }, lowStock };
await mkdir('data', { recursive: true });
await writeFile('data/estoque.json', JSON.stringify(output, null, 2) + '\n');
console.log(`Atualizados ${products.length} produtos; ${lowStock.length} com estoque baixo.`);
