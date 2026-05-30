// ============================================================
//  SportZone — Tienda Deportiva | main.js
// ============================================================
import './style.css';

// ── State ──────────────────────────────────────────────────
let currentUser = null;
let activeCat   = 'all';
let searchTerm  = '';
let spinning    = false;
let wheelAngle  = 0;

// ── Prizes ─────────────────────────────────────────────────
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

// ── Formato moneda COP ──────────────────────────────────────
const fmt = v => '$ ' + Math.round(v).toLocaleString('es-CO');

// ── Storage ─────────────────────────────────────────────────
const K = { users:'sz_users', products:'sz_products', session:'sz_sess' };
const store = {
  get: k      => JSON.parse(localStorage.getItem(k) || 'null'),
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
  del: k      => localStorage.removeItem(k),
};
const getUsers    = ()  => store.get(K.users)    || [];
const saveUsers   = u   => store.set(K.users, u);
const getProducts = ()  => store.get(K.products) || [];
const saveProducts= p   => store.set(K.products, p);

// ── Boot ────────────────────────────────────────────────────
function init() { seedData(); bindEvents(); checkSession(); }

function seedData() {
  const users = getUsers();
  if (!users.find(u => u.email === 'admin@sport.com')) {
    users.push({ id:'admin-001', name:'Administrador', email:'admin@sport.com', password:'admin123',
      role:'admin', spins:0, coupons:[], createdAt: new Date().toISOString() });
    saveUsers(users);
  }
  if (!getProducts().length) {
    saveProducts([
      { id:'p1', name:'Zapatillas Running Pro X',   category:'running',  price:549900,  stock:15, desc:'Suela amortiguada y transpirable para corredores exigentes.',     image:null, emoji:'👟' },
      { id:'p2', name:'Camiseta Tecnica AeroFit',   category:'gym',      price:149900,  stock:30, desc:'Tejido tecnico que elimina el sudor, ideal para entrenamientos.',  image:null, emoji:'👕' },
      { id:'p3', name:'Balon de Futbol Premier',    category:'futbol',   price:199900,  stock:20, desc:'Balon oficial de competicion talla 5. Alta durabilidad.',          image:null, emoji:'⚽' },
      { id:'p4', name:'Gafas de Natacion Elite',    category:'natacion', price:99900,   stock:25, desc:'Antivaho con lentes espejo y correa ajustable.',                   image:null, emoji:'🥽' },
      { id:'p5', name:'Casco Ciclismo AeroShield',  category:'ciclismo', price:379900,  stock:10, desc:'Certificado CE EN1078. Ventilacion optima, ligero y resistente.',  image:null, emoji:'🪖' },
      { id:'p6', name:'Mancuernas Ajustables 30kg', category:'gym',      price:679900,  stock:8,  desc:'Set de 5 a 30 kg con sistema de ajuste rapido.',                   image:null, emoji:'🏋' },
      { id:'p7', name:'Short Compresion Pro',        category:'running',  price:189900,  stock:22, desc:'Bolsillos laterales y secado ultrarapido.',                       image:null, emoji:'🩳' },
      { id:'p8', name:'Raqueta Padel Carbon X',      category:'otros',    price:849900,  stock:6,  desc:'Fibra de carbono. Maximo control y potencia.',                    image:null, emoji:'🏓' },
    ]);
  }
}

// ── Session ──────────────────────────────────────────────────
function checkSession() {
  const sess = store.get(K.session);
  if (sess) { const u = getUsers().find(x => x.id === sess.id); if (u) { currentUser = u; showApp(); return; } }
  showAuth();
}

function showAuth() {
  byId('page-auth').classList.remove('sz-hidden');
  byId('page-store').classList.add('sz-hidden');
  byId('page-admin').classList.add('sz-hidden');
  byId('navbar').classList.add('sz-hidden');
  currentUser = null;
}

function showApp() {
  byId('page-auth').classList.add('sz-hidden');
  byId('navbar').classList.remove('sz-hidden');
  byId('nav-username').textContent = '👤 ' + currentUser.name;
  const al = byId('nav-admin');
  currentUser.role === 'admin' ? al.classList.remove('sz-hidden') : al.classList.add('sz-hidden');
  showStore();
}

// ── Auth ─────────────────────────────────────────────────────
function handleLogin(e) {
  e.preventDefault();
  const email = byId('login-email').value.trim().toLowerCase();
  const pass  = byId('login-password').value;
  const errEl = byId('login-error');
  const user  = getUsers().find(u => u.email === email && u.password === pass);
  if (!user) { showErr(errEl, 'Email o contrasena incorrectos.'); return; }
  errEl.classList.add('sz-hidden');
  currentUser = user;
  store.set(K.session, { id: user.id });
  showApp();
}

function handleRegister(e) {
  e.preventDefault();
  const name  = byId('reg-name').value.trim();
  const email = byId('reg-email').value.trim().toLowerCase();
  const pass  = byId('reg-password').value;
  const conf  = byId('reg-confirm').value;
  const errEl = byId('register-error');
  if (pass !== conf)   { showErr(errEl, 'Las contrasenas no coinciden.'); return; }
  if (pass.length < 6) { showErr(errEl, 'La contrasena debe tener al menos 6 caracteres.'); return; }
  const users = getUsers();
  if (users.find(u => u.email === email)) { showErr(errEl, 'Ya existe una cuenta con ese email.'); return; }
  const newUser = { id:'user-'+Date.now(), name, email, password:pass, role:'user', spins:3, coupons:[], createdAt:new Date().toISOString() };
  users.push(newUser); saveUsers(users);
  currentUser = newUser;
  store.set(K.session, { id: newUser.id });
  errEl.classList.add('sz-hidden');
  showApp();
  showWelcome(name);
}

function handleLogout() {
  store.del(K.session); currentUser = null;
  byId('form-login').reset(); byId('form-register').reset();
  byId('login-error').classList.add('sz-hidden');
  byId('register-error').classList.add('sz-hidden');
  showAuth();
}

// ── Nav ───────────────────────────────────────────────────────
function showStore() {
  byId('page-store').classList.remove('sz-hidden'); byId('page-admin').classList.add('sz-hidden');
  byId('nav-store').classList.add('active');        byId('nav-admin').classList.remove('active');
  renderProducts();
}
function showAdmin() {
  if (currentUser?.role !== 'admin') return;
  byId('page-store').classList.add('sz-hidden'); byId('page-admin').classList.remove('sz-hidden');
  byId('nav-store').classList.remove('active');  byId('nav-admin').classList.add('active');
  renderAdminProducts(); renderAdminUsers();
}

// ── Store ────────────────────────────────────────────────────
const CAT_LABEL = { running:'Running', gym:'Gym & Fitness', futbol:'Futbol', natacion:'Natacion', ciclismo:'Ciclismo', otros:'Otros' };
const CAT_EMOJI = { running:'👟', gym:'💪', futbol:'⚽', natacion:'🏊', ciclismo:'🚴', otros:'🏅' };

function renderProducts() {
  const grid = byId('products-grid');
  let list = getProducts();
  if (activeCat !== 'all') list = list.filter(p => p.category === activeCat);
  if (searchTerm) { const q = searchTerm.toLowerCase(); list = list.filter(p => p.name.toLowerCase().includes(q) || (p.desc||'').toLowerCase().includes(q) || p.category.toLowerCase().includes(q)); }
  if (!list.length) { grid.innerHTML = '<div class="empty-state"><span>🔍</span><h3>Sin resultados</h3><p>Prueba otra busqueda o categoria</p></div>'; return; }
  grid.innerHTML = list.map((p,i) => `
    <div class="product-card" style="animation-delay:${i*0.05}s">
      <div class="prod-thumb">${p.image?`<img src="${p.image}" alt="${esc(p.name)}" loading="lazy">`:`<span>${p.emoji||CAT_EMOJI[p.category]||'🏆'}</span>`}</div>
      <div class="prod-body">
        <div class="prod-cat">${CAT_LABEL[p.category]||p.category}</div>
        <h3 class="prod-name">${esc(p.name)}</h3>
        ${p.desc?`<p class="prod-desc">${esc(p.desc)}</p>`:''}
        <div class="prod-foot">
          <div>
            <div class="prod-price">${fmt(p.price)}</div>
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
  const prod = getProducts().find(p => p.id === btn.dataset.id);
  if (prod) toast('🛒 ' + esc(prod.name) + ' agregado al carrito');
}

// ── Admin products ───────────────────────────────────────────
function handleProductSubmit(e) {
  e.preventDefault();
  const name  = byId('prod-name').value.trim();
  const cat   = byId('prod-category').value;
  const price = parseFloat(byId('prod-price').value);
  const stock = parseInt(byId('prod-stock').value, 10);
  const desc  = byId('prod-desc').value.trim();
  const prev  = byId('img-preview');
  const image = prev.classList.contains('sz-hidden') ? null : prev.src;
  const product = { id:'p'+Date.now(), name, category:cat, price, stock, desc, image, emoji:CAT_EMOJI[cat]||'🏅', createdAt:new Date().toISOString() };
  const products = getProducts(); products.unshift(product); saveProducts(products);
  e.target.reset(); prev.classList.add('sz-hidden'); byId('upload-ph').classList.remove('sz-hidden');
  const ok = byId('prod-ok'); ok.classList.remove('sz-hidden'); setTimeout(()=>ok.classList.add('sz-hidden'),3000);
  renderAdminProducts(); toast('✅ Producto publicado correctamente');
}

function renderAdminProducts() {
  const products = getProducts();
  byId('prod-count').textContent = products.length;
  const list = byId('admin-prod-list');
  if (!products.length) { list.innerHTML = '<p style="color:var(--muted);text-align:center;padding:20px">Aun no hay productos</p>'; return; }
  list.innerHTML = products.map(p => `
    <div class="ap-row">
      <div class="ap-thumb">${p.image?`<img src="${p.image}" alt="">`:(p.emoji||'🏆')}</div>
      <div class="ap-info"><h4>${esc(p.name)}</h4><p>${CAT_LABEL[p.category]||p.category} · ${fmt(p.price)} · Stock: ${p.stock}</p></div>
      <button class="btn-del" data-id="${p.id}">🗑 Eliminar</button>
    </div>
  `).join('');
}

function handleAdminProdClick(e) {
  const btn = e.target.closest('.btn-del');
  if (!btn) return;
  if (!confirm('¿Eliminar este producto permanentemente?')) return;
  saveProducts(getProducts().filter(p => p.id !== btn.dataset.id));
  renderAdminProducts(); toast('🗑 Producto eliminado');
}

function renderAdminUsers() {
  const users = getUsers();
  byId('user-count').textContent = users.length;
  byId('admin-user-list').innerHTML = users.map(u => `
    <div class="au-row">
      <div class="au-avatar">${u.name.charAt(0).toUpperCase()}</div>
      <div class="au-info"><h4>${esc(u.name)}</h4><p>${esc(u.email)} · Giros: ${u.spins||0} · Cupones: ${(u.coupons||[]).length}</p></div>
      <span class="badge ${u.role==='admin'?'badge-admin':'badge-user'}">${u.role==='admin'?'⭐ Admin':'👤 Usuario'}</span>
    </div>
  `).join('');
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
const SEG = (2 * Math.PI) / PRIZES.length;

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
  const spins = currentUser?.spins||0;
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

function awardPrize(idx) {
  const prize = PRIZES[idx];
  const code  = prize.label.replace(/\s+/g,'')+'-'+Date.now().toString(36).toUpperCase();
  const users = getUsers(); const ui = users.findIndex(u=>u.id===currentUser.id);
  if (ui!==-1) {
    users[ui].spins=Math.max(0,(users[ui].spins||1)-1);
    users[ui].coupons=users[ui].coupons||[];
    users[ui].coupons.push({ id:code, icon:prize.icon, prize:prize.label, desc:prize.desc, code, used:false, earnedAt:new Date().toISOString() });
    saveUsers(users); currentUser=users[ui]; store.set(K.session,{id:currentUser.id});
  }
  byId('prize-icon').textContent=prize.icon; byId('prize-title').textContent='¡Ganaste: '+prize.label+'!'; byId('prize-code').textContent=code;
  byId('prize-result').classList.remove('sz-hidden'); updateSpinsLabel(); toast(prize.icon+' ¡Ganaste '+prize.label+'!');
}

function updateSpinsLabel() { byId('spins-left').innerHTML='Giros disponibles: <strong>'+(currentUser?.spins||0)+'</strong>'; }

// ── Coupons ───────────────────────────────────────────────────
function openCoupons() {
  const coupons=currentUser?.coupons||[];
  const list=byId('coupons-list');
  if(!coupons.length) { list.innerHTML='<div class="no-coupons"><span>🎫</span><p>No tienes cupones todavia</p><p>¡Gira la ruleta para ganar premios!</p></div>'; }
  else { list.innerHTML=[...coupons].reverse().map(c=>`
    <div class="coupon-card ${c.used?'used':''}">
      <span class="coupon-ico">${c.icon}</span>
      <div class="coupon-body"><h4>${c.prize}</h4><p>${c.desc}</p>${c.used?'<div class="coupon-used-tag">✗ Cupon usado</div>':''}</div>
      <div class="coupon-code">${c.code}</div>
    </div>
  `).join(''); }
  byId('modal-coupons').classList.remove('sz-hidden');
}

// ── Welcome ───────────────────────────────────────────────────
function showWelcome(name) { byId('welcome-name').textContent='¡Bienvenido, '+name+'!'; byId('modal-welcome').classList.remove('sz-hidden'); }

// ── Toast ─────────────────────────────────────────────────────
let toastTimer;
function toast(msg,type='success') {
  const el=byId('toast'); el.textContent=msg; el.className='toast'+(type==='error'?' error':''); el.classList.remove('sz-hidden');
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.add('sz-hidden'),3200);
}

// ── Helpers ───────────────────────────────────────────────────
const byId=id=>document.getElementById(id);
function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }
function showErr(el,msg){ el.textContent=msg; el.classList.remove('sz-hidden'); }

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
  document.querySelectorAll('.modal').forEach(m=>{ m.addEventListener('click',e=>{if(e.target===m)m.classList.add('sz-hidden');}); });
}

// ── Start ─────────────────────────────────────────────────────
init();
