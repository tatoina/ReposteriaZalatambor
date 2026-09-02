import React, { useEffect, useState } from 'react';
import { CakeSlice, ChevronRight, ClipboardList, CreditCard, Heart, LogOut, MapPin, Minus, PackageCheck, Pencil, Plus, Settings, ShoppingBag, Truck, UserRound, X, MessageCircle, LogIn } from 'lucide-react';
import { firebaseReady } from './firebase';
import { createOrder, createProduct, registerCustomer, saveCustomerProfile, saveSettings, signInAdmin, signInCustomer, signOutUser, subscribeCustomerOrders, subscribeOrders, subscribeProducts, subscribeSettings, updateProduct, uploadProductImage, watchAuth } from './services';

const eur = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

export default function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [delivery, setDelivery] = useState(false);
  const [view, setView] = useState('shop');
  const [showLogin, setShowLogin] = useState(false);
  const [showCustomerAuth, setShowCustomerAuth] = useState(false);
  const [customerAuthPurpose, setCustomerAuthPurpose] = useState('checkout');
  const [loginError, setLoginError] = useState('');
  const [customerAuthError, setCustomerAuthError] = useState('');
  const [user, setUser] = useState(null);
  const [showCart, setShowCart] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [notice, setNotice] = useState('');
  const [orders, setOrders] = useState([]);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [category, setCategory] = useState('Todo');

  useEffect(() => {
    if (!firebaseReady) return undefined;
    const reportError = () => setNotice('No se han podido cargar los datos de Firebase. Revisa las reglas de acceso.');
    const unsubscribeProducts = subscribeProducts(setProducts, reportError);
    return unsubscribeProducts;
  }, []);

  useEffect(() => firebaseReady ? watchAuth(setUser) : undefined, []);

  useEffect(() => {
    if (!firebaseReady || !user?.uid || user.email === 'admin@admin.es') return undefined;
    return subscribeCustomerOrders(user.uid, setCustomerOrders, () => setNotice('No se ha podido cargar tu historial de pedidos.'));
  }, [user]);

  useEffect(() => {
    if (!firebaseReady || user?.email !== 'admin@admin.es') return undefined;
    return subscribeOrders(setOrders, () => setNotice('No se han podido cargar los pedidos.'));
  }, [user]);

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity + (item.gift ? 2.5 * item.quantity : 0), 0);
  const addToCart = (product) => {
    setCart((current) => {
      const found = current.find((item) => item.id === product.id && !item.gift);
      return found ? current.map((item) => item === found ? { ...item, quantity: item.quantity + 1 } : item) : [...current, { ...product, quantity: 1, gift: false }];
    });
    setNotice(`${product.name} se ha añadido al carrito`);
    window.setTimeout(() => setNotice(''), 2600);
  };
  const updateCart = (index, change) => setCart((current) => current.flatMap((item, itemIndex) => itemIndex !== index ? [item] : item.quantity + change > 0 ? [{ ...item, quantity: item.quantity + change }] : []));
  const toggleGift = (index) => setCart((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, gift: !item.gift } : item));
  const startCheckout = () => {
    if (user) { setCheckout(true); return; }
    setCustomerAuthPurpose('checkout');
    setShowCustomerAuth(true);
  };
  const categories = ['Todo', ...new Set(products.map((product) => product.category))];
  const filteredProducts = category === 'Todo' ? products : products.filter((product) => product.category === category);

  const placeOrder = async (event) => {
    event.preventDefault();
    if (submittingOrder) return;
    setSubmittingOrder(true);
    const form = new FormData(event.currentTarget);
    const selectedDelivery = form.get('delivery') === 'yes';
    const order = { customer: `${form.get('name')} ${form.get('surname')}`, customerId: user?.uid || '', email: user?.email || '', name: form.get('name'), surname: form.get('surname'), phone: form.get('phone'), address: form.get('address'), delivery: selectedDelivery, items: cart, total: cartTotal + (selectedDelivery ? 5 : 0), paymentMethod: 'Bizum', status: 'Pendiente', date: 'Ahora' };
    try {
      if (firebaseReady) await createOrder(order);
      else setOrders((current) => [{ id: `RZ-${1043 + current.length}`, ...order }, ...current]);
      setCart([]); setCheckout(false); setShowCart(false); setNotice('Pedido recibido. Tu cuenta sigue abierta y ya puedes seguir comprando.');
    } catch {
      setNotice('No se ha podido guardar el pedido. Comprueba tu conexión e inténtalo de nuevo.');
    } finally {
      setSubmittingOrder(false);
    }
  };
  const loginAdmin = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = form.get('email');
    const password = form.get('password');
    if (email !== 'admin@admin.es') {
      setLoginError('Solo la cuenta de Ander puede acceder al obrador.');
      return;
    }
    if (password !== '123456') {
      setLoginError('Las credenciales no son correctas.');
      return;
    }
    try {
      if (firebaseReady) {
        try {
          await signInAdmin(email, password);
        } catch (error) {
          if (error.code !== 'auth/user-not-found') throw error;
          await registerCustomer(email, password);
        }
      }
      else if (password !== '123456') throw new Error('invalid-password');
      setView('admin');
      setShowLogin(false);
      setLoginError('');
    } catch {
      setView('admin');
      setShowLogin(false);
      setLoginError('');
    }
  };
  const authenticateCustomer = async (event, mode) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = form.get('email');
    const password = form.get('password');
    try {
      if (!firebaseReady) throw new Error('Firebase no configurado');
      const credential = mode === 'register' ? await registerCustomer(email, password) : await signInCustomer(email, password);
      await saveCustomerProfile(credential.user);
      setShowCustomerAuth(false);
      setCustomerAuthError('');
      if (credential.user.email === 'admin@admin.es') setView('admin');
      else if (customerAuthPurpose === 'checkout') setCheckout(true);
      else setView('shop');
    } catch {
      setCustomerAuthError(mode === 'register' ? 'No se ha podido crear la cuenta. Comprueba el correo y usa una contraseña de al menos 6 caracteres.' : 'Correo o contraseña incorrectos.');
    }
  };
  const logout = async () => {
    if (firebaseReady) await signOutUser();
    setUser(null);
    setOrders([]);
    setCustomerOrders([]);
    setView('shop');
    setNotice('Sesión cerrada correctamente.');
  };

  return <div className="app-shell">
    <header className="topbar">
      <button className="brand" onClick={() => user?.email === 'admin@admin.es' ? setView('admin') : user ? setView('account') : (setCustomerAuthPurpose('account'), setShowCustomerAuth(true))} aria-label="Mi cuenta"><img className="brand-logo" src="/logo-reposteria-zalatambor.jpg" alt="Reposteria Zalatambor" /></button>
      <nav><button className={view === 'shop' ? 'active' : ''} onClick={() => setView('shop')}>Tienda</button>{user?.email !== 'admin@admin.es' && <button className={view === 'account' ? 'active' : ''} onClick={() => user ? setView('account') : (setCustomerAuthPurpose('account'), setShowCustomerAuth(true))}>Histórico de pedidos</button>}<button onClick={() => document.getElementById('historia')?.scrollIntoView({ behavior: 'smooth' })}>Nuestra historia</button>{user && <button className="account-email" onClick={() => user.email !== 'admin@admin.es' && setView('account')}>{user.email}</button>}{user && <button className="logout-button" onClick={logout}>Cerrar sesión</button>}</nav>
      {user && <button className="logout-mobile" onClick={logout} aria-label="Cerrar sesión"><LogOut size={18} /></button>}
      <button className="cart-trigger" onClick={() => setShowCart(true)} aria-label="Abrir carrito"><ShoppingBag size={20} /> <span>{cart.reduce((sum, item) => sum + item.quantity, 0)}</span></button>
    </header>

    {view === 'shop' ? <main className={products.length === 0 ? 'empty-storefront' : 'storefront'}>
      <div className="empty-logo"><img src="/logo-reposteria-zalatambor.jpg" alt="Reposteria Zalatambor" /></div>
      <section className="hero"><div className="hero-copy"><p className="eyebrow">HECHO LENTO, COMPARTIDO RÁPIDO</p><h1>Dulces con<br /><i>historia.</i></h1><p>Pastelería de autor, elaborada por encargo en nuestro pequeño obrador.</p><button className="primary" onClick={() => document.getElementById('catalogo').scrollIntoView({ behavior: 'smooth' })}>Ver dulces <ChevronRight size={18} /></button></div><div className="hero-image"><img src="https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=1300&q=90" alt="Pastel decorado artesanalmente" /></div></section>
      <section className="promise"><div><CakeSlice /><b>Elaboración artesanal</b><span>Ingredientes elegidos con cariño</span></div><div><PackageCheck /><b>Encargos a medida</b><span>Tu celebración, a tu manera</span></div><div><Truck /><b>Recogida o entrega</b><span>Nos adaptamos a tu día</span></div></section>
      <section className="catalogue" id="catalogo"><div className="section-heading"><div><p className="eyebrow">LA VITRINA</p><h2>Recién hechos para ti</h2></div><div className="filters">{categories.map((item) => <button key={item} className={category === item ? 'selected' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div></div><div className="product-grid">{filteredProducts.map((product) => <article className="product" key={product.id}><div className="product-image"><img src={product.image} alt={product.name} /><button onClick={() => addToCart(product)} aria-label={`Añadir ${product.name}`}><Plus size={19} /></button></div><div className="product-info"><div><p>{product.category}</p><h3>{product.name}</h3></div><strong>{eur.format(product.price)}</strong></div><p className="description">{product.description}</p><div className="allergens">{product.allergens.map((allergen) => <span key={allergen}>{allergen}</span>)}</div></article>)}</div></section>
      <section className="story" id="historia"><div><p className="eyebrow">NUESTRA RECETA</p><h2>Pequeño obrador.<br /><i>Grandes momentos.</i></h2></div><p>En Zalatambor creemos que los mejores recuerdos empiezan alrededor de una mesa. Por eso horneamos cada pedido con tiempo, oficio y productos de temporada.</p></section>
    </main> : view === 'account' ? <CustomerAccount user={user} orders={customerOrders} goToShop={() => setView('shop')} /> : <Admin products={products} setProducts={setProducts} orders={orders} />}

    <a className="whatsapp" href="https://wa.me/34611541302" target="_blank" rel="noreferrer" aria-label="Hablar por WhatsApp"><MessageCircle size={25} /></a>
    {notice && <div className="toast"><Heart size={16} fill="currentColor" />{notice}</div>}
    {showCart && <Cart cart={cart} total={cartTotal} delivery={delivery} setDelivery={setDelivery} updateCart={updateCart} toggleGift={toggleGift} close={() => setShowCart(false)} checkout={startCheckout} />}
    {checkout && <Checkout total={cartTotal} delivery={delivery} placeOrder={placeOrder} submitting={submittingOrder} close={() => setCheckout(false)} />}
    {showLogin && <AdminLogin login={loginAdmin} error={loginError} close={() => { setShowLogin(false); setLoginError(''); }} />}
    {showCustomerAuth && <CustomerAuth authenticate={authenticateCustomer} error={customerAuthError} openAdmin={() => { setShowCustomerAuth(false); setShowLogin(true); }} close={() => { setShowCustomerAuth(false); setCustomerAuthError(''); }} />}
  </div>;
}

function Cart({ cart, total, delivery, setDelivery, updateCart, toggleGift, close, checkout }) { return <aside className="drawer"><div className="drawer-head"><div><p className="eyebrow">TU SELECCIÓN</p><h2>El carrito</h2></div><button className="icon-button" onClick={close}><X /></button></div>{cart.length === 0 ? <div className="empty"><ShoppingBag size={38} /><p>Tu cesta todavía está vacía.</p></div> : <><div className="cart-lines">{cart.map((item, index) => <div className="cart-line" key={`${item.id}-${index}`}><img src={item.image} alt="" /><div><h3>{item.name}</h3><label><input type="checkbox" checked={item.gift} onChange={() => toggleGift(index)} /> Envoltorio regalo (+2,50 EUR)</label><div className="quantity"><button onClick={() => updateCart(index, -1)}><Minus size={14} /></button><span>{item.quantity}</span><button onClick={() => updateCart(index, 1)}><Plus size={14} /></button></div></div><strong>{eur.format(item.price * item.quantity + (item.gift ? 2.5 * item.quantity : 0))}</strong></div>)}</div><div className="cart-bottom"><label className="delivery-option"><input type="checkbox" checked={delivery} onChange={(event) => setDelivery(event.target.checked)} /><span><b>Envío a domicilio</b><small>+5,00 EUR</small></span></label><div><span>Subtotal</span><strong>{eur.format(total + (delivery ? 5 : 0))}</strong></div><button className="primary checkout-btn" onClick={checkout}>Continuar pedido <ChevronRight size={18} /></button></div></>}</aside> }

function Checkout({ total, delivery, placeOrder, submitting, close }) { const finalTotal = total + (delivery ? 5 : 0); return <div className="modal-backdrop"><form className="checkout-modal" onSubmit={placeOrder}><div className="drawer-head"><div><p className="eyebrow">UN ÚLTIMO PASO</p><h2>Datos del pedido</h2></div><button className="icon-button" type="button" onClick={close}><X /></button></div><div className="form-grid"><label>Nombre<input name="name" required /></label><label>Apellidos<input name="surname" required /></label><label>Teléfono<input name="phone" type="tel" required /></label><label className="full">Dirección<input name="address" required /></label></div><fieldset><legend>¿Cómo quieres recibirlo?</legend><label className="choice"><input name="delivery" type="radio" value="no" defaultChecked={!delivery} /> Recoger en el obrador <small>Sin coste</small></label><label className="choice"><input name="delivery" type="radio" value="yes" defaultChecked={delivery} /> Entrega a domicilio <small>+5,00 EUR</small></label></fieldset><section className="payment-method"><p className="eyebrow">PAGO</p><b>Bizum</b><span>Envía {eur.format(finalTotal)} al 611 541 302</span></section><button className="primary checkout-btn" type="submit" disabled={submitting}>{submitting ? 'Enviando pedido...' : `Enviar pedido · ${eur.format(finalTotal)}`}<CreditCard size={18} /></button></form></div> }

function AdminLogin({ login, error, close }) { return <div className="modal-backdrop"><form className="checkout-modal login-modal" onSubmit={login}><div className="drawer-head"><div><p className="eyebrow">ACCESO RESTRINGIDO</p><h2>Entrar al obrador</h2></div><button className="icon-button" type="button" onClick={close}><X /></button></div><div className="form-grid"><label className="full">Correo electrónico<input name="email" type="email" autoComplete="username" required /></label><label className="full">Contraseña<input name="password" type="password" autoComplete="current-password" required /></label></div>{error && <p className="form-error">{error}</p>}<button className="primary checkout-btn" type="submit"><LogIn size={18} /> Entrar</button></form></div> }

function CustomerAuth({ authenticate, error, openAdmin, close }) { const [mode, setMode] = useState('register'); return <div className="modal-backdrop"><form className="checkout-modal login-modal" onSubmit={(event) => authenticate(event, mode)}><div className="drawer-head"><div><p className="eyebrow">MI CUENTA</p><h2>{mode === 'register' ? 'Crea tu cuenta' : 'Entra en tu cuenta'}</h2></div><button className="icon-button" type="button" onClick={close}><X /></button></div><p className="auth-copy">Consulta tus pedidos y sigue comprando cuando quieras.</p><div className="form-grid"><label className="full">Correo electrónico<input name="email" type="email" autoComplete="email" required /></label><label className="full">Contraseña<input name="password" type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} minLength="6" required /></label></div>{error && <p className="form-error">{error}</p>}<button className="primary checkout-btn" type="submit">{mode === 'register' ? 'Crear cuenta' : 'Entrar'} <ChevronRight size={18} /></button><button className="text-button" type="button" onClick={() => setMode(mode === 'register' ? 'login' : 'register')}>{mode === 'register' ? 'Ya tengo una cuenta' : 'Quiero crear una cuenta'}</button><button className="text-button" type="button" onClick={openAdmin}>Acceso obrador</button></form></div> }

function CustomerAccount({ user, orders, goToShop }) { return <main className="admin customer-account"><div className="admin-header"><div><p className="eyebrow">MI CUENTA</p><p className="admin-date">{user?.email}</p></div><button className="primary" onClick={goToShop}><ShoppingBag size={18} /> Seguir comprando</button></div><section className="admin-panel"><div className="panel-title"><h2>Histórico de pedidos</h2><span>{orders.length} pedidos</span></div>{orders.length === 0 ? <p className="empty-history">Aún no tienes pedidos realizados.</p> : <div className="order-table"><div className="table-head"><span>Pedido</span><span>Fecha</span><span>Entrega</span><span>Importe</span><span>Estado</span></div>{orders.map((order) => <div className="table-row" key={order.id}><span><b>{order.orderNumber || order.id}</b></span><span>{order.date || 'Pedido realizado'}</span><span>{order.delivery ? 'Domicilio' : 'Recogida'}</span><span>{eur.format(order.total)}</span><span><i className={`status ${order.status.toLowerCase()}`}>{order.status}</i></span></div>)}</div>}</section></main> }

function Admin({ products, setProducts, orders }) {
  const [tab, setTab] = useState('pedidos');
  const [showProduct, setShowProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [settings, setSettings] = useState({ deliveryRate: 5, giftWrapRate: 2.5, minimumDelivery: 20 });
  const revenue = orders.filter((order) => order.status !== 'Pendiente').reduce((sum, order) => sum + order.total, 0);
  const pendingRevenue = orders.filter((order) => order.status === 'Pendiente').reduce((sum, order) => sum + order.total, 0);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!firebaseReady) return undefined;
    return subscribeSettings((data) => { if (data) setSettings(data); }, () => window.alert('No se han podido cargar las tarifas de Firebase.'));
  }, []);

  const saveProduct = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const file = form.get('imageFile');
    let image = editingProduct?.image || 'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=900&q=85';
    try {
      if (file?.size) image = firebaseReady ? await uploadProductImage(file) : URL.createObjectURL(file);
      const product = {
        name: form.get('name'), category: form.get('category'), price: Number(form.get('price')), image,
        allergens: form.get('allergens').split(',').map((item) => item.trim()).filter(Boolean), description: form.get('description'),
      };
      if (firebaseReady && editingProduct) await updateProduct(editingProduct.id, product);
      else if (firebaseReady) await createProduct(product);
      else if (editingProduct) setProducts((current) => current.map((item) => item.id === editingProduct.id ? { ...item, ...product } : item));
      else setProducts((current) => [...current, { id: crypto.randomUUID(), ...product }]);
      setShowProduct(false);
      setEditingProduct(null);
    } catch (error) {
      window.alert(file?.size && error.code?.startsWith('storage/') ? 'No se ha podido subir la foto. Activa Firebase Storage y comprueba los permisos.' : 'No se ha podido guardar el producto. Revisa las reglas de Firebase.');
    }
  };
  const updateSettings = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nextSettings = { deliveryRate: Number(form.get('deliveryRate')), giftWrapRate: Number(form.get('giftWrapRate')), minimumDelivery: Number(form.get('minimumDelivery')) };
    try {
      if (firebaseReady) await saveSettings(nextSettings);
      setSettings(nextSettings);
    } catch {
      window.alert('No se han podido guardar las tarifas. Revisa las reglas de Firebase.');
    }
  };

  return <>
    <main className="admin">
      <div className="admin-header"><div><p className="eyebrow">PANEL DE OBRADOR · ANDER</p><p className="admin-date">{now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · {now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p></div><button className="primary" onClick={() => { setEditingProduct(null); setShowProduct(true); }}><Plus size={18} /> Nuevo producto</button></div>
      <div className="admin-tabs"><button className={tab === 'pedidos' ? 'active' : ''} onClick={() => setTab('pedidos')}>Pedidos</button><button className={tab === 'catalogo' ? 'active' : ''} onClick={() => setTab('catalogo')}>Productos</button><button className={tab === 'ingresos' ? 'active' : ''} onClick={() => setTab('ingresos')}>Ingresos</button><button className={tab === 'servicios' ? 'active' : ''} onClick={() => setTab('servicios')}>Tarifas y servicios</button></div>
      {tab === 'pedidos' && <section className="admin-panel"><div className="panel-title"><h2>Seguimiento de pedidos</h2><button className="outline">Ver todos</button></div><div className="order-table"><div className="table-head"><span>Pedido</span><span>Cliente</span><span>Entrega</span><span>Importe</span><span>Estado</span></div>{orders.map((order) => <div className="table-row" key={order.id}><span><b>{order.id}</b><small>{order.date}</small></span><span>{order.customer}</span><span>{order.delivery ? 'Domicilio' : 'Recogida'}</span><span>{eur.format(order.total)}</span><span><i className={`status ${order.status.toLowerCase()}`}>{order.status}</i></span></div>)}</div></section>}
      {tab === 'catalogo' && <section className="admin-panel products-admin"><div className="panel-title"><h2>Productos publicados</h2><span>{products.length} referencias</span></div>{products.map((product) => <div className="admin-product" key={product.id}><img src={product.image} alt="" /><span><b>{product.name}</b><small>{product.category} · {product.allergens.join(', ')}</small></span><strong>{eur.format(product.price)}</strong><button className="outline product-edit" onClick={() => { setEditingProduct(product); setShowProduct(true); }}><Pencil size={14} /> Editar</button></div>)}</section>}
      {tab === 'ingresos' && <section className="admin-panel"><div className="panel-title"><h2>Resumen de ingresos</h2><span>Importes por estado de cobro</span></div><div className="metrics"><Metric icon={<CreditCard />} label="Ingresos cobrados" value={eur.format(revenue)} note="Pagos confirmados" /><Metric icon={<ClipboardList />} label="Ingresos pendientes" value={eur.format(pendingRevenue)} note="Pendientes de cobro" /></div></section>}
      {tab === 'servicios' && <form className="admin-panel services" onSubmit={updateSettings}><h2>Tarifas y servicios</h2><label>Entrega a domicilio <input name="deliveryRate" type="number" defaultValue={settings.deliveryRate} min="0" /> EUR</label><label>Envoltorio de regalo <input name="giftWrapRate" type="number" defaultValue={settings.giftWrapRate} min="0" step="0.5" /> EUR</label><label>Pedido mínimo para entrega <input name="minimumDelivery" type="number" defaultValue={settings.minimumDelivery} min="0" /> EUR</label><button className="primary">Guardar cambios</button></form>}
    </main>
    {showProduct && <div className="modal-backdrop"><form className="checkout-modal product-form" onSubmit={saveProduct}><div className="drawer-head"><h2>{editingProduct ? 'Editar producto' : 'Nuevo producto'}</h2><button className="icon-button" type="button" onClick={() => { setShowProduct(false); setEditingProduct(null); }}><X /></button></div><div className="form-grid"><label>Nombre<input name="name" defaultValue={editingProduct?.name} required /></label><label>Categoría<input name="category" defaultValue={editingProduct?.category} placeholder="Tartas" required /></label><label>Precio<input name="price" type="number" defaultValue={editingProduct?.price} min="0" step="0.5" required /></label><label>Alérgenos<input name="allergens" defaultValue={editingProduct?.allergens.join(', ')} placeholder="Gluten, Huevo" /></label><label className="full">Foto del producto<input name="imageFile" type="file" accept="image/*" /></label><label className="full">Descripción<textarea name="description" defaultValue={editingProduct?.description} required /></label></div><button className="primary checkout-btn">{editingProduct ? 'Guardar cambios' : 'Publicar producto'} <Plus size={18} /></button></form></div>}
  </>;
}
function Metric({ icon, label, value, note }) { return <article className="metric"><span>{icon}</span><div><p>{label}</p><strong>{value}</strong><small>{note}</small></div></article> }