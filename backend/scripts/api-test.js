// Simple end-to-end API test: login -> list products -> create invoice -> fetch PDF
const BASE = process.env.BASE_URL || 'http://localhost:4000';

async function main() {
  const loginRes = await fetch(BASE + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@shop.com', password: 'demo1234' })
  });
  if (!loginRes.ok) throw new Error('login failed ' + loginRes.status);
  const { token } = await loginRes.json();
  console.log('Token len:', token.length);

  const headers = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };
  const productsRes = await fetch(BASE + '/products', { headers });
  if (!productsRes.ok) throw new Error('products failed ' + productsRes.status);
  const products = await productsRes.json();
  console.log('Products:', products.length);
  const prodId = products[0]?._id;
  if (!prodId) throw new Error('no product');

  const invRes = await fetch(BASE + '/invoices', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      items: [ { productId: prodId, qty: 2 } ],
      notes: 'API test invoice'
    })
  });
  if (!invRes.ok) throw new Error('create invoice failed ' + invRes.status);
  const inv = await invRes.json();
  console.log('Invoice id:', inv._id, 'No:', inv.invoiceNo);

  const pdfRes = await fetch(BASE + '/invoices/' + inv._id + '/pdf', { headers: { Authorization: 'Bearer ' + token } });
  console.log('PDF status:', pdfRes.status, 'type:', pdfRes.headers.get('content-type'));
  const buf = Buffer.from(await pdfRes.arrayBuffer());
  console.log('PDF bytes:', buf.length);
}

main().catch((e) => { console.error(e); process.exit(1); });
