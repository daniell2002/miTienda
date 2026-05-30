// ============================================================
//  SportZone — Tienda Deportiva | main.js  (MySQL API Edition)
// ============================================================
import './style.css';

// ── Config ──────────────────────────────────────────────────
const API = 'http://localhost:3000/api';

// ── State ───────────────────────────────────────────────────
let currentUser    = null;   // { id, nombre, email, rol, giros }
let activeCat      = 'all';
let searchTerm     = '';
let spinning       = false;
let wheelAngle     = 0;
let cachedProducts = [];     // cache local para filtrar sin re-fetch

// ── Premios ruleta ───────────────────────────────────────────
const PRIZES = [
  { label:'10% OFF',    icon:'🏷',  color:'#FF3D00', desc:'10% de descuento en tu proxima compra' },
  { label:'ENVIO FREE', icon:'🚚', color:'#00C853', desc:'Envio gratis en tu proxima compra'      },
  { label:'20% OFF',    icon:'🔥', color:'#FF6D00', desc:'20% de descuento en tu proxima compra' },
  { label:'BOTELLA',    icon:'💧', color:'#0091EA', desc:'Botella deportiva gratis con tu compra' },
  { label:'30% OFF',    icon:'⚡', color:'#9C27B0', desc:'30% de descuento en tu proxima compra' },
  { label:'CALCETINES', icon:'🧦', color:'#E91E63', desc:'Par de calcetines deportivos gratis'   },
  { label:'50% OFF',    icon:'💥', color:'#FFD700', desc:'50% de descuento en tu proxima compra' },
  { label:'5% OFF',     icon:'🎯', color:'#607D8B', desc:'5% de descuento en tu proxima compra'  },
];

// ── Helpers globales ─────────────────────────────────────────
const fmt       = v => '$ ' + Math.round(parseFloat(v) || 0).toLocaleString('es-CO');
const CAT_LABEL = { running:'Running', gym:'Gym & Fitness', futbol:'Futbol', natacion:'Natacion', ciclismo:'Ciclismo', otros:'Otros' };
const CAT_EMOJI = { running:'👟', gym:'💪', futbol:'⚽', natacion:'🏊', ciclismo:'🚴', otros:'🏅' };
const SEG       = (2 * Math.PI) / PRIZES.length;
const byId      = id => document.getElementById(id);
function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
                       .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}
function showErr(el, msg) { el.textContent = msg; el.classList.remove('sz-hidden'); }

// ── Sesión localStorage (solo el objeto usuario) ─────────────
const SK           = 'sz_session';
const saveSession  = u  => localStorage.setItem(SK, JSON.stringify(u));
const loadSession  = () => JSON.parse(localStorage.getItem(SK) || 'null');
const clearSession = () => localStorage.removeItem(SK);

// ── API helpers ──────────────────────────────────────────────
async function apiFetch(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  let r;
  try { r = await fetch(API + path, opts); }
  catch { throw new Error('Sin conexión con el servidor. Inicia el API con: cd api && node server.js'); }
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || `Error ${r.status}`);
  return data;
}
const apiGet  = path      => apiFetch('GET',    path);
const apiPost = (path, b) => apiFetch('POST',   path, b);
const apiDel  = path      => apiFetch('DELETE', path);

// ── Boot ─────────────────────────────────────────────────────
async function init() {
  bindEvents();
  const sess = loadSession();
  if (sess) {
    currentUser = sess;
    updateNavbar();
    if (currentUser.rol === 'admin') { await showAdmin(); }
    else { await showStore(); }
  } else {
    updateNavbar();
    await loadAndRenderProducts();
  }
}

function showAuth(tab = 'login') {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-pane').forEach(p => { p.classList.remove('active'); p.classList.add('sz-hidden'); });
  const btn  = document.querySelector(`.tab-btn[data-tab="${tab}"]`);
  const pane = byId('tab-' + tab);
  if (btn)  btn.classList.add('active');
  if (pane) { pane.classList.remove('sz-hidden'); pane.classList.add('active'); }
  byId('modal-auth').classList.remove('sz-hidden');
}

async function showApp() {
  byId('modal-auth').classList.add('sz-hidden');
  updateNavbar();
  if (currentUser.rol === 'admin') { await showAdmin(); }
  else { await showStore(); }
}

function updateNavbar() {
  if (currentUser) {
    byId('nav-username').textContent = '👤 ' + currentUser.nombre;
    byId('nav-logged-in').classList.remove('sz-hidden');
    byId('nav-logged-out').classList.add('sz-hidden');
    currentUser.rol === 'admin'
      ? byId('nav-admin').classList.remove('sz-hidden')
      : byId('nav-admin').classList.add('sz-hidden');
    byId('store-hero-guest').classList.add('sz-hidden');
  } else {
    byId('nav-logged-in').classList.add('sz-hidden');
    byId('nav-logged-out').classList.remove('sz-hidden');
    byId('nav-admin').classList.add('sz-hidden');
    byId('store-hero-guest').classList.remove('sz-hidden');
  }
}

// ── Auth ─────────────────────────────────────────────────────
async function handleLogin(e) {
  e.preventDefault();
  const email = byId('login-email').value.trim().toLowerCase();
  const pass  = byId('login-password').value;
  const errEl = byId('login-error');
  try {
    const user = await apiPost('/login', { email, password: pass });
    errEl.classList.add('sz-hidden');
    currentUser = user;
    saveSession(user);
    await showApp();
  } catch(err) { showErr(errEl, err.message); }
}

async function handleRegister(e) {
  e.preventDefault();
  const name  = byId('reg-name').value.trim();
  const email = byId('reg-email').value.trim().toLowerCase();
  const pass  = byId('reg-password').value;
  const conf  = byId('reg-confirm').value;
  const errEl = byId('register-error');
  if (pass !== conf)   { showErr(errEl, 'Las contraseñas no coinciden.'); return; }
  if (pass.length < 6) { showErr(errEl, 'La contraseña debe tener al menos 6 caracteres.'); return; }
  try {
    const user = await apiPost('/registro', { nombre: name, email, password: pass });
    errEl.classList.add('sz-hidden');
    currentUser = user;
    saveSession(user);
    await showApp();
    showWelcome(name);
  } catch(err) { showErr(errEl, err.message); }
}

function handleLogout() {
  clearSession(); currentUser = null;
  byId('form-login').reset(); byId('form-register').reset();
  byId('login-error').classList.add('sz-hidden');
  byId('register-error').classList.add('sz-hidden');
  byId('page-admin').classList.add('sz-hidden');
  byId('page-store').classList.remove('sz-hidden');
  byId('nav-store').classList.add('active');
  byId('nav-admin').classList.remove('active');
  updateNavbar();
}

// ── Nav ───────────────────────────────────────────────────────
async function showStore() {
  byId('page-store').classList.remove('sz-hidden'); byId('page-admin').classList.add('sz-hidden');
  byId('nav-store').classList.add('active');        byId('nav-admin').classList.remove('active');
  await loadAndRenderProducts();
}
async function showAdmin() {
  if (currentUser?.rol !== 'admin') return;
  byId('page-store').classList.add('sz-hidden'); byId('page-admin').classList.remove('sz-hidden');
  byId('nav-store').classList.remove('active');  byId('nav-admin').classList.add('active');
  await Promise.all([renderAdminProducts(), renderAdminUsers()]);
}

// ── Store ────────────────────────────────────────────────────
async function loadAndRenderProducts() {
  const grid = byId('products-grid');
  grid.innerHTML = '<div class="empty-state"><span>⏳</span><h3>Cargando productos...</h3></div>';
  try {
    cachedProducts = await apiGet('/productos');
    renderProducts();
  } catch(err) {
    grid.innerHTML = `<div class="empty-state">
      <span>⚠️</span><h3>Sin conexión con el servidor</h3>
      <p>${err.message}</p>
      <p style="font-size:.78rem;margin-top:8px;color:var(--muted)">
        Ejecuta en otra terminal:<br><code style="color:var(--acc)">cd api &amp;&amp; npm install &amp;&amp; node server.js</code>
      </p></div>`;
  }
}

function renderProducts() {
  const grid = byId('products-grid');
  let list = cachedProducts;
  if (activeCat !== 'all') list = list.filter(p => p.categoria === activeCat);
  if (searchTerm) { const q = searchTerm.toLowerCase(); list = list.filter(p => p.nombre.toLowerCase().includes(q) || (p.descripcion||'').toLowerCase().includes(q) || p.categoria.toLowerCase().includes(q)); }
  if (!list.length) { grid.innerHTML = '<div class="empty-state"><span>🔍</span><h3>Sin resultados</h3><p>Prueba otra busqueda o categoria</p></div>'; return; }
  grid.innerHTML = list.map((p,i) => `
    <div class="product-card" style="animation-delay:${i*0.05}s">
      <div class="prod-thumb">${p.imagen?`<img src="${p.imagen}" alt="${esc(p.nombre)}" loading="lazy">`:`<span>${p.emoji||CAT_EMOJI[p.categoria]||'🏆'}</span>`}</div>
      <div class="prod-body">
        <div class="prod-cat">${CAT_LABEL[p.categoria]||p.categoria}</div>
        <h3 class="prod-name">${esc(p.nombre)}</h3>
        ${p.descripcion?`<p class="prod-desc">${esc(p.descripcion)}</p>`:''}
        <div class="prod-foot">
          <div>
            <div class="prod-price">${fmt(p.precio)}</div>
            <div class="prod-stock ${p.stock===0?'stock-out':p.stock<=5?'stock-low':''}">${p.stock===0?'✗ Agotado':p.stock<=5?`⚠ Solo ${p.stock}`:'✓ En stock'}</div>
          </div>
          <button class="btn-cart" ${p.stock===0?'disabled':''} data-id="${p.id}">${p.stock===0?'Agotado':'+ Carrito'}</button>
        </div>
      </div>
    </div>
  `).join('');
}

function handleCartClick(e) {
  const btn = e.target.closest('.btn-cart');
  if (!btn || btn.disabled) return;
  const prod = cachedProducts.find(p => String(p.id) === btn.dataset.id);
  if (prod) toast('🛒 ' + esc(prod.nombre) + ' agregado al carrito');
}

// ── Admin products ───────────────────────────────────────────
async function handleProductSubmit(e) {
  e.preventDefault();
  const nombre      = byId('prod-name').value.trim();
  const categoria   = byId('prod-category').value;
  const precio      = parseFloat(byId('prod-price').value);
  const stock       = parseInt(byId('prod-stock').value, 10);
  const descripcion = byId('prod-desc').value.trim();
  const prev        = byId('img-preview');
  const imagen      = prev.classList.contains('sz-hidden') ? null : prev.src;
  const emoji       = CAT_EMOJI[categoria] || '🏅';
  try {
    await apiPost('/productos', { nombre, categoria, precio, stock, descripcion, emoji, imagen });
    e.target.reset(); prev.classList.add('sz-hidden'); byId('upload-ph').classList.remove('sz-hidden');
    const ok = byId('prod-ok'); ok.classList.remove('sz-hidden'); setTimeout(()=>ok.classList.add('sz-hidden'),3000);
    await renderAdminProducts(); toast('✅ Producto publicado correctamente');
  } catch(err) { toast('❌ ' + err.message, 'error'); }
}

async function renderAdminProducts() {
  try {
    const products = await apiGet('/productos');
    byId('prod-count').textContent = products.length;
    const list = byId('admin-prod-list');
    if (!products.length) { list.innerHTML = '<p style="color:var(--muted);text-align:center;padding:20px">Aun no hay productos</p>'; return; }
    list.innerHTML = products.map(p => `
      <div class="ap-row">
        <div class="ap-thumb">${p.imagen?`<img src="${p.imagen}" alt="">`:(p.emoji||'🏆')}</div>
        <div class="ap-info"><h4>${esc(p.nombre)}</h4><p>${CAT_LABEL[p.categoria]||p.categoria} · ${fmt(p.precio)} · Stock: ${p.stock}</p></div>
        <button class="btn-del" data-id="${p.id}">🗑 Eliminar</button>
      </div>
    `).join('');
  } catch(err) { toast('❌ ' + err.message, 'error'); }
}

async function handleAdminProdClick(e) {
  const btn = e.target.closest('.btn-del');
  if (!btn) return;
  if (!confirm('¿Eliminar este producto permanentemente?')) return;
  try {
    await apiDel('/productos/' + btn.dataset.id);
    await renderAdminProducts(); toast('🗑 Producto eliminado');
  } catch(err) { toast('❌ ' + err.message, 'error'); }
}

async function renderAdminUsers() {
  try {
    const users = await apiGet('/usuarios');
    byId('user-count').textContent = users.length;
    byId('admin-user-list').innerHTML = users.map(u => `
      <div class="au-row">
        <div class="au-avatar">${u.nombre.charAt(0).toUpperCase()}</div>
        <div class="au-info"><h4>${esc(u.nombre)}</h4><p>${esc(u.email)} · Giros restantes: ${u.giros||0}</p></div>
        <span class="badge ${u.rol==='admin'?'badge-admin':'badge-user'}">${u.rol==='admin'?'⭐ Admin':'👤 Usuario'}</span>
      </div>
    `).join('');
  } catch(err) { toast('❌ ' + err.message, 'error'); }
}

// ── Image upload ─────────────────────────────────────────────
function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 5*1024*1024) { toast('⚠ Imagen demasiado grande (max 5 MB)', 'error'); return; }
  const reader = new FileReader();
  reader.onload = ev => { const prev=byId('img-preview'); prev.src=ev.target.result; prev.classList.remove('sz-hidden'); byId('upload-ph').classList.add('sz-hidden'); };
  reader.readAsDataURL(file);
}

// ── Roulette ─────────────────────────────────────────────────
function openRoulette() {
  byId('modal-roulette').classList.remove('sz-hidden');
  byId('prize-result').classList.add('sz-hidden');
  byId('no-spins-msg').classList.add('sz-hidden');
  updateSpinsLabel(); drawWheel(wheelAngle);
}

function drawWheel(rot) {
  const canvas = byId('roulette-canvas');
  const ctx = canvas.getContext('2d');
  const cx = canvas.width/2, cy = canvas.height/2, R = cx - 12;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  PRIZES.forEach((prize,i) => {
    const a0 = rot+i*SEG, a1=a0+SEG;
    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,R,a0,a1); ctx.closePath();
    ctx.fillStyle=prize.color; ctx.fill();
    ctx.strokeStyle='rgba(0,0,0,.25)'; ctx.lineWidth=1.5; ctx.stroke();
    ctx.save(); ctx.translate(cx,cy); ctx.rotate(a0+SEG/2);
    ctx.textAlign='right'; ctx.fillStyle='#fff'; ctx.shadowColor='rgba(0,0,0,.7)'; ctx.shadowBlur=4;
    ctx.font='bold 13px Segoe UI,sans-serif'; ctx.fillText(prize.label,R-10,4);
    ctx.font='15px sans-serif'; ctx.fillText(prize.icon,R*0.52,5);
    ctx.restore();
  });
  ctx.beginPath(); ctx.arc(cx,cy,26,0,2*Math.PI); ctx.fillStyle='#1A1A2E'; ctx.shadowColor='transparent'; ctx.shadowBlur=0; ctx.fill();
  ctx.strokeStyle='#FFD700'; ctx.lineWidth=3; ctx.stroke();
  ctx.font='bold 18px sans-serif'; ctx.fillStyle='#FFD700'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('⚡',cx,cy);
}

function spinWheel() {
  if (spinning) return;
  const spins = currentUser?.giros || 0;
  if (spins<=0) { byId('prize-result').classList.add('sz-hidden'); byId('no-spins-msg').classList.remove('sz-hidden'); return; }
  spinning=true; byId('btn-spin').disabled=true;
  byId('prize-result').classList.add('sz-hidden'); byId('no-spins-msg').classList.add('sz-hidden');
  const prizeIdx  = Math.floor(Math.random()*PRIZES.length);
  const numTurns  = 6+Math.random()*4;
  const targetNorm= ((-Math.PI/2-(prizeIdx+0.5)*SEG)%(2*Math.PI)+2*Math.PI)%(2*Math.PI);
  const curNorm   = ((wheelAngle%(2*Math.PI))+2*Math.PI)%(2*Math.PI);
  let   delta     = targetNorm-curNorm; if(delta<0) delta+=2*Math.PI;
  const endAngle  = wheelAngle+numTurns*2*Math.PI+delta;
  const startAng  = wheelAngle;
  const duration  = 4000+Math.random()*1800;
  const t0        = performance.now();
  (function animate(now) {
    const prog=Math.min((now-t0)/duration,1), eased=1-Math.pow(1-prog,3);
    wheelAngle=startAng+(endAngle-startAng)*eased; drawWheel(wheelAngle);
    if(prog<1) { requestAnimationFrame(animate); }
    else { wheelAngle=((endAngle%(2*Math.PI))+2*Math.PI)%(2*Math.PI); drawWheel(wheelAngle); spinning=false; byId('btn-spin').disabled=false; awardPrize(prizeIdx); }
  })(t0);
}

async function awardPrize(idx) {
  const prize = PRIZES[idx];
  const code  = prize.label.replace(/\s+/g,'')+'-'+Date.now().toString(36).toUpperCase();
  try {
    const result = await apiPost('/giro', {
      usuario_id:  currentUser.id,
      codigo:      code,
      premio:      prize.label,
      icono:       prize.icon,
      descripcion: prize.desc,
    });
    currentUser.giros = result.giros;
    saveSession(currentUser);
    byId('prize-icon').textContent=prize.icon; byId('prize-title').textContent='¡Ganaste: '+prize.label+'!'; byId('prize-code').textContent=code;
    byId('prize-result').classList.remove('sz-hidden'); updateSpinsLabel(); toast(prize.icon+' ¡Ganaste '+prize.label+'!');
  } catch(err) { toast('❌ ' + err.message, 'error'); spinning=false; byId('btn-spin').disabled=false; }
}

function updateSpinsLabel() { byId('spins-left').innerHTML='Giros disponibles: <strong>'+(currentUser?.giros||0)+'</strong>'; }

// ── Coupons ───────────────────────────────────────────────────
async function openCoupons() {
  const list=byId('coupons-list');
  list.innerHTML='<p style="color:var(--muted);text-align:center;padding:20px">Cargando cupones...</p>';
  byId('modal-coupons').classList.remove('sz-hidden');
  try {
    const coupons = await apiGet('/cupones/' + currentUser.id);
    if(!coupons.length) { list.innerHTML='<div class="no-coupons"><span>🎫</span><p>No tienes cupones todavia</p><p>¡Gira la ruleta para ganar premios!</p></div>'; }
    else { list.innerHTML=coupons.map(c=>`
      <div class="coupon-card ${c.usado?'used':''}">
        <span class="coupon-ico">${c.icono}</span>
        <div class="coupon-body"><h4>${c.premio}</h4><p>${c.descripcion}</p>${c.usado?'<div class="coupon-used-tag">✗ Cupon usado</div>':''}</div>
        <div class="coupon-code">${c.codigo}</div>
      </div>
    `).join(''); }
  } catch(err) { list.innerHTML='<p style="color:var(--err);text-align:center;padding:20px">Error al cargar cupones</p>'; }
}

// ── Welcome ───────────────────────────────────────────────────
function showWelcome(name) { byId('welcome-name').textContent='¡Bienvenido, '+name+'!'; byId('modal-welcome').classList.remove('sz-hidden'); }

// ── Toast ─────────────────────────────────────────────────────
let toastTimer;
function toast(msg,type='success') {
  const el=byId('toast'); el.textContent=msg; el.className='toast'+(type==='error'?' error':''); el.classList.remove('sz-hidden');
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.add('sz-hidden'),3200);
}

// ── Events ────────────────────────────────────────────────────
function bindEvents() {
  document.querySelectorAll('.tab-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p=>{p.classList.remove('active');p.classList.add('sz-hidden');});
      btn.classList.add('active'); const pane=byId('tab-'+btn.dataset.tab); pane.classList.remove('sz-hidden'); pane.classList.add('active');
    });
  });
  byId('form-login').addEventListener('submit',handleLogin);
  byId('form-register').addEventListener('submit',handleRegister);
  byId('nav-store').addEventListener('click',e=>{e.preventDefault();showStore();});
  byId('nav-admin').addEventListener('click',e=>{e.preventDefault();showAdmin();});
  byId('btn-logout').addEventListener('click',handleLogout);
  document.querySelectorAll('.flt').forEach(btn=>{
    btn.addEventListener('click',()=>{ document.querySelectorAll('.flt').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); activeCat=btn.dataset.cat; renderProducts(); });
  });
  byId('search-input').addEventListener('input',e=>{searchTerm=e.target.value.trim();renderProducts();});
  byId('products-grid').addEventListener('click',handleCartClick);
  byId('form-product').addEventListener('submit',handleProductSubmit);
  byId('prod-image').addEventListener('change',handleImageUpload);
  byId('admin-prod-list').addEventListener('click',handleAdminProdClick);
  byId('btn-roulette').addEventListener('click',openRoulette);
  byId('btn-spin').addEventListener('click',spinWheel);
  byId('close-roulette').addEventListener('click',()=>byId('modal-roulette').classList.add('sz-hidden'));
  byId('btn-coupons').addEventListener('click',openCoupons);
  byId('close-coupons').addEventListener('click',()=>byId('modal-coupons').classList.add('sz-hidden'));
  byId('btn-go-roulette').addEventListener('click',()=>{byId('modal-welcome').classList.add('sz-hidden');openRoulette();});
  byId('btn-skip').addEventListener('click',()=>byId('modal-welcome').classList.add('sz-hidden'));
  byId('btn-open-login').addEventListener('click', () => showAuth('login'));
  byId('btn-open-register').addEventListener('click', () => showAuth('register'));
  byId('btn-hero-register').addEventListener('click', () => showAuth('register'));
  byId('close-auth').addEventListener('click', () => byId('modal-auth').classList.add('sz-hidden'));
  document.querySelectorAll('.modal').forEach(m=>{ m.addEventListener('click',e=>{if(e.target===m)m.classList.add('sz-hidden');}); });
}

// ── Start ─────────────────────────────────────────────────────
init();
