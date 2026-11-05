/* app.js
 - يدير المينيو، السلة، التتبع، والتقييمات باستخدام localStorage
 - كل الصفحات تستدعي نفس الملف، فينفذ بناء على وجود عناصر DOM
*/

/* ======= بيانات وهمية للمينيو ======= */
const SAMPLE_MENU = [
  { id: 'p1', category: 'pizzas', name: 'بيتزا مارجريتا', price: 120, img: 'https://images.unsplash.com/photo-1601924582975-4bfa6c8a6b8e?q=80&w=800&auto=format&fit=crop&ixlib=rb-4.0.3&s=1' },
  { id: 'p2', category: 'pizzas', name: 'بيتزا بيبروني', price: 140, img: 'https://images.unsplash.com/photo-1548365328-8a3e4a1f6c5f?q=80&w=800&auto=format&fit=crop&ixlib=rb-4.0.3&s=1' },
  { id: 'b1', category: 'burgers', name: 'برجر لحم', price: 80, img: 'https://images.unsplash.com/photo-1606755962778-6c5b6e8e6a4b?q=80&w=800&auto=format&fit=crop&ixlib=rb-4.0.3&s=1' },
  { id: 'b2', category: 'burgers', name: 'برجر نباتي', price: 75, img: 'https://images.unsplash.com/photo-1604908177522-3c7f4a8df3b9?q=80&w=800&auto=format&fit=crop&ixlib=rb-4.0.3&s=1' },
  { id: 'd1', category: 'drinks', name: 'عصير برتقال', price: 25, img: 'https://images.unsplash.com/photo-1570560548793-0dbf4f1e7d36?q=80&w=800&auto=format&fit=crop&ixlib=rb-4.0.3&s=1' },
  { id: 'dess1', category: 'desserts', name: 'تيراميسو', price: 55, img: 'https://images.unsplash.com/photo-1589308078052-12128d4f6d8f?q=80&w=800&auto=format&fit=crop&ixlib=rb-4.0.3&s=1' }
];

/* ======= helpers for localStorage ======= */
const storage = {
  getCart() { return JSON.parse(localStorage.getItem('cart') || '[]'); },
  setCart(c) { localStorage.setItem('cart', JSON.stringify(c)); },
  getReviews() { return JSON.parse(localStorage.getItem('reviews') || '[]'); },
  setReviews(r) { localStorage.setItem('reviews', JSON.stringify(r)); },
  getOrders() { return JSON.parse(localStorage.getItem('orders') || '[]'); },
  setOrders(o) { localStorage.setItem('orders', JSON.stringify(o)); }
};

/* ======= Cart functions ======= */
function updateCartCountUI() {
  const count = storage.getCart().reduce((s, it) => s + it.qty, 0);
  document.querySelectorAll('#cart-count-top, #cart-count-menu, #cart-count-cart').forEach(el=>{
    if(el) el.textContent = count;
  });
}

function addToCart(itemId) {
  const menu = SAMPLE_MENU;
  const item = menu.find(m=>m.id===itemId);
  if(!item) return;
  const cart = storage.getCart();
  const found = cart.find(c=>c.id===itemId);
  if(found) found.qty += 1;
  else cart.push({ id:item.id, name:item.name, price:item.price, img:item.img, qty:1 });
  storage.setCart(cart);
  updateCartCountUI();
  alert('تمت الإضافة للسلة');
}

/* ======= Render menu ======= */
function renderMenuGrid() {
  const grid = document.getElementById('menu-grid');
  if(!grid) return;
  grid.innerHTML = '';
  SAMPLE_MENU.forEach(mi=>{
    const div = document.createElement('div');
    div.className = 'menu-item';
    div.innerHTML = `
      <img src="${mi.img}" alt="${mi.name}">
      <h3>${mi.name}</h3>
      <p class="desc">قيمة افتراضية</p>
      <div class="item-meta">
        <div class="price">${mi.price} EGP</div>
        <button class="btn-primary" data-add="${mi.id}">أضف للسلة</button>
      </div>
    `;
    grid.appendChild(div);
  });

  // add listeners
  grid.querySelectorAll('[data-add]').forEach(b=>{
    b.addEventListener('click', e=>{
      const id = e.currentTarget.dataset.add;
      addToCart(id);
    });
  });
}

/* filters */
function setupFilters() {
  document.querySelectorAll('.filter-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const cat = btn.dataset.cat;
      const grid = document.getElementById('menu-grid');
      grid.innerHTML = '';
      const items = cat === 'all' ? SAMPLE_MENU : SAMPLE_MENU.filter(i=>i.category===cat);
      items.forEach(mi=>{
        const div = document.createElement('div');
        div.className = 'menu-item';
        div.innerHTML = `
          <img src="${mi.img}" alt="${mi.name}">
          <h3>${mi.name}</h3>
          <p class="desc">قيمة افتراضية</p>
          <div class="item-meta">
            <div class="price">${mi.price} EGP</div>
            <button class="btn-primary" data-add="${mi.id}">أضف للسلة</button>
          </div>
        `;
        grid.appendChild(div);
      });
      grid.querySelectorAll('[data-add]').forEach(b=>{
        b.addEventListener('click', e=>{
          addToCart(e.currentTarget.dataset.add);
        });
      });
    });
  });
}

/* ======= Render Cart page ======= */
function renderCartPage() {
  const list = document.getElementById('cart-list');
  if(!list) return;
  const cart = storage.getCart();
  if(cart.length===0) {
    list.innerHTML = '<p>السلة فارغة</p>';
    document.getElementById('cart-summary').innerHTML = '';
    return;
  }

  list.innerHTML = '';
  cart.forEach(row=>{
    const r = document.createElement('div');
    r.className = 'cart-row';
    r.innerHTML = `
      <img src="${row.img}" alt="${row.name}">
      <div style="flex:1">
        <h3>${row.name}</h3>
        <div>السعر: ${row.price} EGP</div>
        <div style="margin-top:8px">
          <button class="qty-minus" data-id="${row.id}">−</button>
          <span style="padding:0 8px">${row.qty}</span>
          <button class="qty-plus" data-id="${row.id}">+</button>
          <button class="btn-outline remove-item" data-id="${row.id}" style="margin-left:8px">حذف</button>
        </div>
      </div>
      <div style="min-width:90px; text-align:center">${row.price * row.qty} EGP</div>
    `;
    list.appendChild(r);
  });

  // summary
  const total = cart.reduce((s,i)=>s + i.price * i.qty, 0);
  document.getElementById('cart-summary').innerHTML = `<div class="cart-summary"><h3>الإجمالي: ${total} EGP</h3></div>`;

  // events
  document.querySelectorAll('.qty-minus').forEach(b=>{
    b.addEventListener('click', ()=>{
      const id = b.dataset.id;
      changeQty(id, -1);
    });
  });
  document.querySelectorAll('.qty-plus').forEach(b=>{
    b.addEventListener('click', ()=>{
      const id = b.dataset.id;
      changeQty(id, +1);
    });
  });
  document.querySelectorAll('.remove-item').forEach(b=>{
    b.addEventListener('click', ()=>{
      const id = b.dataset.id;
      removeFromCart(id);
    });
  });
}

/* helpers: change qty, remove */
function changeQty(id, delta) {
  const cart = storage.getCart();
  const it = cart.find(c=>c.id===id);
  if(!it) return;
  it.qty += delta;
  if(it.qty <= 0) {
    const idx = cart.findIndex(c=>c.id===id);
    cart.splice(idx,1);
  }
  storage.setCart(cart);
  updateCartCountUI();
  renderCartPage();
}

function removeFromCart(id) {
  let cart = storage.getCart();
  cart = cart.filter(c=>c.id !== id);
  storage.setCart(cart);
  updateCartCountUI();
  renderCartPage();
}

/* clear cart button and checkout */
function setupCartActions() {
  const clearBtn = document.getElementById('clear-cart');
  if(clearBtn) clearBtn.addEventListener('click', ()=>{
    if(confirm('مسح كل المنتجات من السلة؟')) {
      storage.setCart([]);
      updateCartCountUI();
      renderCartPage();
    }
  });

  const checkout = document.getElementById('checkout-btn');
  if(checkout) checkout.addEventListener('click', ()=>{
    const cart = storage.getCart();
    if(cart.length===0) { alert('السلة فارغة'); return; }
    // create fake order
    const orders = storage.getOrders();
    const orderId = Math.floor(1000 + Math.random()*9000);
    const newOrder = {
      id: orderId,
      items: cart,
      total: cart.reduce((s,i)=>s + i.price * i.qty, 0),
      status: 'Preparing',
      createdAt: new Date().toISOString()
    };
    orders.push(newOrder);
    storage.setOrders(orders);
    // clear cart
    storage.setCart([]);
    updateCartCountUI();
    renderCartPage();
    alert('تم إنشاء الطلب، رقم الطلب: ' + orderId);
    // redirect to tracking
    location.href = 'tracking.html?order=' + orderId;
  });
}

/* ======= Tracking ======= */
function setupTracking() {
  const btn = document.getElementById('track-btn');
  if(btn) {
    btn.addEventListener('click', ()=>{
      const id = document.getElementById('order-id').value.trim();
      if(!id) { alert('أدخل رقم الطلب'); return; }
      showOrderStatus(id);
    });
  }

  // if url has ?order=...
  const params = new URLSearchParams(window.location.search);
  if(params.has('order')) {
    const id = params.get('order');
    document.getElementById('order-id').value = id;
    showOrderStatus(id);
  }
}

function showOrderStatus(id) {
  const orders = storage.getOrders();
  const order = orders.find(o => String(o.id) === String(id));
  const box = document.getElementById('track-result');
  if(!box) return;
  if(!order) {
    box.innerHTML = `<p>لم يتم العثور على الطلب رقم ${id}</p>`;
    return;
  }

  const steps = ['Preparing','On the Way','Delivered'];
  const current = steps.indexOf(order.status);
  const html = steps.map((s,idx)=>{
    const cls = idx <= current ? 'status-step active' : 'status-step';
    return `<div class="${cls}">${translateStatus(s)}</div>`;
  }).join('');
  box.innerHTML = `<div><h3>رقم الطلب: ${order.id}</h3><div class="status-bar">${html}</div></div>`;
}

/* small helper translate */
function translateStatus(s) {
  if(s==='Preparing') return 'جار التحضير';
  if(s==='On the Way') return 'في الطريق';
  if(s==='Delivered') return 'تم التوصيل';
  return s;
}

/* Simulate orders progression (for demo) */
function advanceOrdersSimulation() {
  const orders = storage.getOrders();
  let updated = false;
  orders.forEach(o=>{
    if(o.status === 'Preparing') { o.status = 'On the Way'; updated = true; }
    else if(o.status === 'On the Way') { o.status = 'Delivered'; updated = true; }
  });
  if(updated) storage.setOrders(orders);
}

/* ======= Reviews system (frontend) ======= */
function renderReviews() {
  const box = document.getElementById('reviews-list');
  const homeBox = document.getElementById('home-reviews');
  const reviews = storage.getReviews();
  if(box) {
    box.innerHTML = '';
    reviews.slice().reverse().forEach(r=>{
      const div = document.createElement('div');
      div.className = 'review-card';
      div.innerHTML = `<h4>${r.name} — ${'★'.repeat(r.rate)}</h4><p>${r.text}</p>`;
      box.appendChild(div);
    });
  }
  if(homeBox) {
    homeBox.innerHTML = '';
    reviews.slice(-3).reverse().forEach(r=>{
      const div = document.createElement('div');
      div.className = 'review-card';
      div.innerHTML = `<h4>${r.name} — ${'★'.repeat(r.rate)}</h4><p>${r.text}</p>`;
      homeBox.appendChild(div);
    });
  }
}

function setupReviewForm() {
  const form = document.getElementById('review-form');
  if(!form) return;
  form.addEventListener('submit', e=>{
    e.preventDefault();
    const name = document.getElementById('rev-name').value.trim();
    const text = document.getElementById('rev-text').value.trim();
    const rate = parseInt(document.getElementById('rev-rate').value, 10);
    if(!name || !text) { alert('املأ الحقول'); return; }
    const reviews = storage.getReviews();
    reviews.push({ name, text, rate, createdAt: new Date().toISOString() });
    storage.setReviews(reviews);
    renderReviews();
    form.reset();
    alert('شكراً على التقييم!');
  });
}

/* ======= Login form (fake) ======= */
function setupLogin() {
  const form = document.getElementById('login-form');
  if(!form) return;
  form.addEventListener('submit', e=>{
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    if(!email || password.length < 6) {
      alert('ادخل بيانات صحيحة (كلمة مرور 6 حروف على الأقل)');
      return;
    }
    // store fake "user"
    localStorage.setItem('user', JSON.stringify({ email }));
    alert('تم تسجيل الدخول (وهمي) — سيتم توجيهك للوحة التحكم');
    location.href = 'dashboard.html';
  });
}

/* ======= Dashboard render (reads orders) ======= */
function renderDashboard() {
  const container = document.getElementById('orders-table');
  if(!container) return;
  const orders = storage.getOrders().slice().reverse();
  if(orders.length===0) { container.innerHTML = '<p>لا توجد طلبات حتى الآن.</p>'; return; }
  let html = '<table style="width:100%;border-collapse:collapse"><thead><tr><th>رقم</th><th>الوقت</th><th>الحالة</th><th>الإجمالي</th></tr></thead><tbody>';
  orders.forEach(o=>{
    html += `<tr style="border-top:1px solid #eee"><td>${o.id}</td><td>${new Date(o.createdAt).toLocaleString()}</td><td>${translateStatus(o.status)}</td><td>${o.total} EGP</td></tr>`;
  });
  html += '</tbody></table>';
  container.innerHTML = html;
}

/* ======= Contact form (just prevents reload) ======= */
function setupContactForm() {
  const f = document.getElementById('contact-form');
  if(!f) return;
  f.addEventListener('submit', e=>{
    e.preventDefault();
    alert('تم إرسال الرسالة (وهمي). شكراً!');
    f.reset();
  });
}

/* ======= Init on DOM load ======= */
document.addEventListener('DOMContentLoaded', ()=>{
  // global
  updateCartCountUI();

  // menu page
  renderMenuGrid();
  setupFilters();

  // cart page
  renderCartPage();
  setupCartActions();

  // reviews
  renderReviews();
  setupReviewForm();

  // tracking
  setupTracking();

  // login
  setupLogin();

  // dashboard
  renderDashboard();

  // contact
  setupContactForm();

  // simulate orders progression every 45s (demo)
  setInterval(()=>{ advanceOrdersSimulation(); renderDashboard(); }, 45000);
});
