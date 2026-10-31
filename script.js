
/* =====================================================
   PETAL & VINE FLOWER BOUTIQUE
   Complete connected JavaScript
   Front-end application using localStorage
===================================================== */

"use strict";

/* ==================== STORAGE ==================== */

const STORAGE = {
  users: "pv_users",
  products: "pv_products",
  orders: "pv_orders",
  cart: "pv_cart",
  session: "pv_session"
};

const $ = id => document.getElementById(id);

function load(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

let users = load(STORAGE.users, []);
let products = load(STORAGE.products, []);
let orders = load(STORAGE.orders, []);
let carts = load(STORAGE.cart, {});
let session = load(STORAGE.session, null);

let currentUser = null;
let cart = [];
let pendingCheckout = [];
let selectedImage = "";
let toastTimer;

/* ==================== DEFAULT DATA ==================== */

const defaultProducts = [
  {
    id: "P001",
    name: "Classic Red Roses",
    category: "Roses",
    description: "A beautiful bouquet of fresh red roses.",
    price: 850,
    stock: 20,
    image: "🌹"
  },
  {
    id: "P002",
    name: "Pink Tulip Bouquet",
    category: "Tulips",
    description: "Soft pink tulips perfect for special moments.",
    price: 950,
    stock: 15,
    image: "🌷"
  },
  {
    id: "P003",
    name: "Sunflower Delight",
    category: "Sunflowers",
    description: "Bright sunflowers to bring happiness.",
    price: 750,
    stock: 18,
    image: "🌻"
  },
  {
    id: "P004",
    name: "White Lily Elegance",
    category: "Lilies",
    description: "Elegant white lilies for meaningful occasions.",
    price: 1100,
    stock: 12,
    image: "💐"
  },
  {
    id: "P005",
    name: "Purple Orchid",
    category: "Orchids",
    description: "A graceful arrangement of purple orchids.",
    price: 1250,
    stock: 10,
    image: "🪻"
  },
  {
    id: "P006",
    name: "Mixed Flower Bouquet",
    category: "Mixed",
    description: "A colorful combination of seasonal flowers.",
    price: 1500,
    stock: 14,
    image: "💐"
  }
];

function initializeData() {
  if (!Array.isArray(users)) users = [];
  if (!Array.isArray(products)) products = [];
  if (!Array.isArray(orders)) orders = [];
  if (!carts || typeof carts !== "object" || Array.isArray(carts)) {
    carts = {};
  }

  if (!users.some(user => user.role === "admin")) {
    users.push({
      id: "ADMIN001",
      name: "Administrator",
      username: "admin",
      password: "Admin123",
      role: "admin",
      active: true,
      phone: "",
      address: ""
    });
  }

  if (products.length === 0) {
    products = defaultProducts.map(product => ({ ...product }));
  }

  save(STORAGE.users, users);
  save(STORAGE.products, products);
  save(STORAGE.orders, orders);
  save(STORAGE.cart, carts);
}

initializeData();

/* ==================== HELPERS ==================== */

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function money(value) {
  return "₱" + Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function makeId(prefix = "ID") {
  return prefix + Date.now().toString(36).toUpperCase() +
    Math.random().toString(36).slice(2, 7).toUpperCase();
}

function persistAll() {
  save(STORAGE.users, users);
  save(STORAGE.products, products);
  save(STORAGE.orders, orders);
  save(STORAGE.cart, carts);
}

function showToast(message) {
  const toast = $("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2800);
}

function setMessage(id, message, success = false) {
  const element = $(id);
  if (!element) return;

  element.textContent = message;
  element.style.color = success ? "#477b5a" : "#b64b55";
}

function getProduct(id) {
  return products.find(product => product.id === id);
}

function getUser(id) {
  return users.find(user => user.id === id);
}

function getCustomerOrders() {
  return orders.filter(order => order.userId === currentUser.id);
}

function getCart() {
  if (!currentUser) return [];
  return carts[currentUser.id] || [];
}

function updateCartStorage() {
  if (!currentUser) return;
  carts[currentUser.id] = cart;
  save(STORAGE.cart, carts);
  updateCartCount();
}

function updateCartCount() {
  if (!$("cartCount")) return;

  const count = cart.reduce((sum, item) => sum + Number(item.quantity), 0);
  $("cartCount").textContent = count;
}

/* ==================== AUTHENTICATION ==================== */

function showLogin() {
  $("loginForm").classList.remove("hidden");
  $("registerForm").classList.add("hidden");

  $("authSwitch").classList.remove("hidden");
  $("loginSwitch").classList.add("hidden");

  $("authTitle").textContent = "Welcome Back";
  $("authSubtitle").textContent = "Sign in to continue to your flower shop.";

  setMessage("loginMessage", "");
  setMessage("registerMessage", "");
}

function showRegister() {
  $("loginForm").classList.add("hidden");
  $("registerForm").classList.remove("hidden");

  $("authSwitch").classList.add("hidden");
  $("loginSwitch").classList.remove("hidden");

  $("authTitle").textContent = "Create Account";
  $("authSubtitle").textContent = "Register to start shopping.";

  setMessage("loginMessage", "");
  setMessage("registerMessage", "");
}

function togglePassword(id, button) {
  const field = $(id);
  if (!field) return;

  const visible = field.type === "password";
  field.type = visible ? "text" : "password";
  button.textContent = visible ? "Hide" : "Show";
}

function register(event) {
  event.preventDefault();

  const name = $("registerName").value.trim();
  const username = $("registerUsername").value.trim();
  const password = $("registerPassword").value;
  const confirm = $("registerConfirm").value;

  if (name.length < 2) {
    return setMessage("registerMessage", "Please enter your full name.");
  }

  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return setMessage(
      "registerMessage",
      "Username must be 3–20 characters and use only letters, numbers, or underscores."
    );
  }

  if (password.length < 6) {
    return setMessage(
      "registerMessage",
      "Password must contain at least 6 characters."
    );
  }

  if (password !== confirm) {
    return setMessage("registerMessage", "Passwords do not match.");
  }

  if (users.some(user =>
    user.username.toLowerCase() === username.toLowerCase()
  )) {
    return setMessage("registerMessage", "Username is already taken.");
  }

  users.push({
    id: makeId("USER"),
    name,
    username,
    password,
    role: "customer",
    active: true,
    phone: "",
    address: "",
    createdAt: new Date().toISOString()
  });

  persistAll();

  $("registerForm").reset();
  showLogin();

  $("loginUsername").value = username;

  setMessage(
    "loginMessage",
    "Account created successfully. You can now log in.",
    true
  );
}

function login(event) {
  event.preventDefault();

  const username = $("loginUsername").value.trim();
  const password = $("loginPassword").value;

  const user = users.find(item =>
    item.username.toLowerCase() === username.toLowerCase() &&
    item.password === password
  );

  if (!user) {
    return setMessage("loginMessage", "Incorrect username or password.");
  }

  if (user.active === false) {
    return setMessage("loginMessage", "This account has been disabled.");
  }

  currentUser = user;
  session = user.id;

  save(STORAGE.session, session);

  cart = getCart();

  $("loginForm").reset();
  $("authScreen").classList.add("hidden");
  $("appScreen").classList.remove("hidden");
  $("logoutButton").classList.remove("hidden");

  $("headerUser").textContent = "Welcome, " + user.name;

  $("customerNav").classList.toggle("hidden", user.role !== "customer");
  $("adminNav").classList.toggle("hidden", user.role !== "admin");

  $("roleLabel").textContent =
    user.role === "admin" ? "ADMINISTRATOR ACCOUNT" : "CUSTOMER ACCOUNT";

  $("welcomeText").textContent = "Welcome, " + user.name + "!";

  if (user.role === "admin") {
    adminPage("dashboard");
  } else {
    customerPage("shop");
  }

  updateCartCount();
  showToast("Welcome to Petal & Vine!");
}

function logout() {
  currentUser = null;
  session = null;
  cart = [];

  localStorage.removeItem(STORAGE.session);

  $("appScreen").classList.add("hidden");
  $("authScreen").classList.remove("hidden");
  $("logoutButton").classList.add("hidden");

  $("headerUser").textContent = "";

  closeAllModals();
  showLogin();
}

function restoreSession() {
  if (!session) return;

  const user = getUser(session);

  if (user && user.active !== false) {
    currentUser = user;
    cart = getCart();

    $("authScreen").classList.add("hidden");
    $("appScreen").classList.remove("hidden");
    $("logoutButton").classList.remove("hidden");

    $("headerUser").textContent = "Welcome, " + user.name;

    $("customerNav").classList.toggle("hidden", user.role !== "customer");
    $("adminNav").classList.toggle("hidden", user.role !== "admin");

    $("roleLabel").textContent =
      user.role === "admin" ? "ADMINISTRATOR ACCOUNT" : "CUSTOMER ACCOUNT";

    $("welcomeText").textContent = "Welcome, " + user.name + "!";

    if (user.role === "admin") {
      adminPage("dashboard");
    } else {
      customerPage("shop");
    }

    updateCartCount();
  } else {
    localStorage.removeItem(STORAGE.session);
  }
}

/* ==================== NAVIGATION ==================== */

function hideAllPages() {
  document.querySelectorAll(".page").forEach(page => {
    page.classList.add("hidden");
  });

  document.querySelectorAll(".nav-link").forEach(button => {
    button.classList.remove("active");
  });
}

function activatePage(id, button) {
  hideAllPages();

  const page = $(id);
  if (page) page.classList.remove("hidden");

  if (button) button.classList.add("active");
}

function customerPage(page, button) {
  if (!currentUser || currentUser.role !== "customer") return;

  const titles = {
    shop: "Shop Flowers",
    cart: "My Cart",
    orders: "My Orders",
    receipts: "My Receipts",
    transactions: "Transactions",
    profile: "My Profile",
    about: "About Us"
  };

  activatePage("customer-" + page, button);
  $("pageTitle").textContent = titles[page] || "Petal & Vine";

  if (page === "shop") renderShop();
  if (page === "cart") renderCart();
  if (page === "orders") renderCustomerOrders();
  if (page === "receipts") renderCustomerReceipts();
  if (page === "transactions") renderTransactions();
  if (page === "profile") renderProfile();
}

function adminPage(page, button) {
  if (!currentUser || currentUser.role !== "admin") return;

  const titles = {
    dashboard: "Admin Dashboard",
    products: "Manage Products",
    inventory: "Inventory",
    orders: "Customer Orders",
    users: "Customers",
    settings: "Admin Settings"
  };

  activatePage("admin-" + page, button);
  $("pageTitle").textContent = titles[page] || "Administration";

  if (page === "dashboard") renderDashboard();
  if (page === "products") renderAdminProducts();
  if (page === "inventory") renderInventory();
  if (page === "orders") renderAdminOrders();
  if (page === "users") renderAdminUsers();
  if (page === "settings") renderSettings();
}

/* ==================== PRODUCT IMAGES ==================== */

function imageHTML(image, className = "product-image") {
  const value = String(image || "💐");

  if (/^https?:\/\//i.test(value) || value.startsWith("data:image/")) {
    return `
      <div class="${className}">
        <img src="${escapeHTML(value)}" alt="Flower product"
          onerror="this.parentElement.textContent='💐'">
      </div>
    `;
  }

  return `<div class="${className}">${escapeHTML(value)}</div>`;
}

function previewProductImage() {
  const value = $("productImage").value.trim();
  const preview = $("productImagePreview");

  selectedImage = value;

  if (/^https?:\/\//i.test(value) || value.startsWith("data:image/")) {
    preview.innerHTML = `<img src="${escapeHTML(value)}" alt="Preview"
      onerror="this.parentElement.textContent='💐'">`;
  } else {
    preview.textContent = value || "💐";
  }
}

/* ==================== CUSTOMER SHOP ==================== */

function renderShop() {
  const container = $("shopProducts");
  if (!container) return;

  const search = $("productSearch").value.trim().toLowerCase();

  const filtered = products.filter(product =>
    product.name.toLowerCase().includes(search) ||
    product.category.toLowerCase().includes(search) ||
    product.description.toLowerCase().includes(search)
  );

  if (!filtered.length) {
    container.innerHTML = `
      <div class="empty-state">
        <strong>No flowers found</strong>
        Try another search.
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(product => `
    <article class="product-card">
      ${imageHTML(product.image)}
      <div class="product-info">
        <h3>${escapeHTML(product.name)}</h3>
        <p>${escapeHTML(product.category)}</p>
        <p>${escapeHTML(product.description)}</p>

        <div class="price">${money(product.price)}</div>

        <div class="stock">
          ${product.stock > 0
            ? `${product.stock} available`
            : "Out of stock"}
        </div>

        <label class="quantity-label" for="qty-${product.id}">
          Quantity
        </label>

        <input
          class="product-quantity"
          id="qty-${product.id}"
          type="number"
          min="1"
          max="${product.stock}"
          value="1"
          ${product.stock < 1 ? "disabled" : ""}
        >

        <div class="product-actions">
          <button class="btn outline"
            onclick="addToCart('${product.id}')"
            ${product.stock < 1 ? "disabled" : ""}>
            Add to Cart
          </button>

          <button class="btn primary"
            onclick="buyNow('${product.id}')"
            ${product.stock < 1 ? "disabled" : ""}>
            Buy Now
          </button>
        </div>
      </div>
    </article>
  `).join("");
}

function getRequestedQuantity(product) {
  const input = $("qty-" + product.id);
  const quantity = Number(input?.value || 1);

  if (!Number.isInteger(quantity) || quantity < 1) {
    showToast("Please enter a valid quantity.");
    return 0;
  }

  if (quantity > product.stock) {
    showToast("Not enough stock available.");
    return 0;
  }

  return quantity;
}

function addToCart(id) {
  const product = getProduct(id);
  if (!product) return;

  const quantity = getRequestedQuantity(product);
  if (!quantity) return;

  const existing = cart.find(item => item.productId === id);
  const newQuantity = (existing?.quantity || 0) + quantity;

  if (newQuantity > product.stock) {
    showToast("Requested quantity exceeds available stock.");
    return;
  }

  if (existing) {
    existing.quantity = newQuantity;
  } else {
    cart.push({
      productId: id,
      quantity
    });
  }

  updateCartStorage();
  showToast("Added to your shopping cart.");
}

function buyNow(id) {
  const product = getProduct(id);
  if (!product) return;

  const quantity = getRequestedQuantity(product);
  if (!quantity) return;

  pendingCheckout = [{
    productId: id,
    quantity
  }];

  openCheckout();
}

/* ==================== CART ==================== */

function renderCart() {
  const container = $("cartContent");
  if (!container) return;

  cart = cart.filter(item => getProduct(item.productId));

  if (!cart.length) {
    container.innerHTML = `
      <div class="empty-state">
        <strong>Your cart is empty</strong>
        Browse our flower collection and add your favorites.
      </div>
    `;
    updateCartCount();
    return;
  }

  let total = 0;

  const rows = cart.map(item => {
    const product = getProduct(item.productId);
    const subtotal = product.price * item.quantity;
    total += subtotal;

    return `
      <div class="cart-row">
        <div>
          <strong>${escapeHTML(product.name)}</strong>
          <p class="muted">${money(product.price)} each</p>
        </div>

        <div>
          <label for="cartqty-${product.id}">Quantity</label>
          <input
            class="qty-input"
            id="cartqty-${product.id}"
            type="number"
            min="1"
            max="${product.stock}"
            value="${item.quantity}"
            onchange="changeCartQuantity('${product.id}',this.value)"
          >
        </div>

        <div>
          <strong>${money(subtotal)}</strong>
        </div>

        <div>
          <button class="btn danger small"
            onclick="removeFromCart('${product.id}')">
            Remove
          </button>
        </div>
      </div>
    `;
  }).join("");

  container.innerHTML = `
    <div class="panel">
      ${rows}

      <div class="cart-total">
        <p>Cart Total</p>
        <strong>${money(total)}</strong>
      </div>

      <div class="product-actions">
        <button class="btn outline" onclick="clearCart()">
          Clear Cart
        </button>

        <button class="btn primary" onclick="checkoutCart()">
          Proceed to Checkout
        </button>
      </div>
    </div>
  `;

  updateCartCount();
}

function changeCartQuantity(id, value) {
  const product = getProduct(id);
  const item = cart.find(entry => entry.productId === id);
  const quantity = Number(value);

  if (!product || !item) return;

  if (!Number.isInteger(quantity) || quantity < 1) {
    showToast("Quantity must be at least 1.");
    renderCart();
    return;
  }

  if (quantity > product.stock) {
    showToast("Quantity exceeds available stock.");
    renderCart();
    return;
  }

  item.quantity = quantity;
  updateCartStorage();
  renderCart();
}

function removeFromCart(id) {
  cart = cart.filter(item => item.productId !== id);
  updateCartStorage();
  renderCart();
  showToast("Product removed from cart.");
}

function clearCart() {
  if (!confirm("Are you sure you want to clear your cart?")) return;

  cart = [];
  updateCartStorage();
  renderCart();
  showToast("Your cart has been cleared.");
}

function checkoutCart() {
  if (!cart.length) {
    showToast("Your cart is empty.");
    return;
  }

  pendingCheckout = cart.map(item => ({ ...item }));
  openCheckout();
}

/* ==================== CHECKOUT ==================== */

function openCheckout() {
  if (!pendingCheckout.length) return;

  let total = 0;

  const summary = pendingCheckout.map(item => {
    const product = getProduct(item.productId);
    if (!product) return "";

    const subtotal = product.price * item.quantity;
    total += subtotal;

    return `
      <div class="receipt-line">
        <span>${escapeHTML(product.name)} × ${item.quantity}</span>
        <strong>${money(subtotal)}</strong>
      </div>
    `;
  }).join("");

  $("checkoutSummary").innerHTML = `
    ${summary}
    <div class="receipt-total">Total: ${money(total)}</div>
  `;

  $("checkoutName").value = currentUser.name || "";
  $("checkoutPhone").value = currentUser.phone || "";
  $("checkoutAddress").value = currentUser.address || "";

  $("checkoutModal").classList.remove("hidden");
}

function placeOrder(event) {
  event.preventDefault();

  if (!pendingCheckout.length) {
    showToast("No products selected.");
    return;
  }

  const name = $("checkoutName").value.trim();
  const phone = $("checkoutPhone").value.trim();
  const address = $("checkoutAddress").value.trim();

  if (!name || !phone || !address) {
    showToast("Please complete all delivery details.");
    return;
  }

  const orderItems = [];
  let total = 0;

  for (const item of pendingCheckout) {
    const product = getProduct(item.productId);

    if (!product || !Number.isInteger(Number(item.quantity)) ||
        item.quantity < 1 || product.stock < item.quantity) {
      showToast("A product is unavailable or has insufficient stock.");
      return;
    }

    const subtotal = product.price * item.quantity;

    orderItems.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: item.quantity,
      subtotal
    });

    total += subtotal;
  }

  // Deduct stock only after all products have passed validation.
  orderItems.forEach(item => {
    const product = getProduct(item.productId);
    product.stock -= item.quantity;
  });

  const order = {
    id: makeId("ORD"),
    userId: currentUser.id,
    customerName: name,
    username: currentUser.username,
    phone,
    address,
    items: orderItems,
    total,
    paymentMethod: "Cash on Delivery",
    paymentStatus: "Pending",
    status: "Pending",
    createdAt: new Date().toISOString()
  };

  orders.push(order);

  currentUser.name = name;
  currentUser.phone = phone;
  currentUser.address = address;

  if (pendingCheckout.length === cart.length &&
      pendingCheckout.every(item =>
        cart.some(entry => entry.productId === item.productId &&
          entry.quantity === item.quantity)
      )) {
    cart = [];
  } else if (pendingCheckout.length === 1) {
    // Buy Now does not remove an existing cart item.
  }

  updateCartStorage();
  persistAll();

  $("checkoutForm").reset();
  $("checkoutModal").classList.add("hidden");

  pendingCheckout = [];

  renderReceipt(order);
  $("receiptModal").classList.remove("hidden");

  showToast("Your order has been placed successfully!");
}

/* ==================== RECEIPTS ==================== */

function renderReceipt(order) {
  const lines = (order.items || []).map(item => `
    <div class="receipt-line">
      <span>
        ${escapeHTML(item.name)} × ${item.quantity}
      </span>
      <strong>${money(item.subtotal)}</strong>
    </div>
  `).join("");

  $("receiptContent").innerHTML = `
    <div class="receipt">
      <h2>✿ Petal & Vine</h2>
      <p>Flower Boutique</p>
      <hr>

      <h3>Official Order Receipt</h3>

      <div class="receipt-line">
        <span>Order Number</span>
        <strong>${escapeHTML(order.id)}</strong>
      </div>

      <div class="receipt-line">
        <span>Date</span>
        <strong>${new Date(order.createdAt).toLocaleString()}</strong>
      </div>

      <div class="receipt-line">
        <span>Customer</span>
        <strong>${escapeHTML(order.customerName)}</strong>
      </div>

      <div class="receipt-line">
        <span>Contact</span>
        <strong>${escapeHTML(order.phone)}</strong>
      </div>

      <div class="receipt-line">
        <span>Address</span>
        <strong>${escapeHTML(order.address)}</strong>
      </div>

      <h3>Order Items</h3>

      ${lines}

      <div class="receipt-total">
        Total: ${money(order.total)}
      </div>

      <div class="receipt-line">
        <span>Payment</span>
        <strong>Cash on Delivery</strong>
      </div>

      <div class="receipt-line">
        <span>Order Status</span>
        <strong>${escapeHTML(order.status)}</strong>
      </div>

      <hr>
      <p>Thank you for choosing Petal & Vine!</p>
      <p>Flowers that speak from the heart.</p>
    </div>
  `;
}

function viewReceipt(id) {
  const order = orders.find(item => item.id === id);
  if (!order) return;

  if (currentUser.role === "customer" &&
      order.userId !== currentUser.id) return;

  renderReceipt(order);
  $("receiptModal").classList.remove("hidden");
}

/* ==================== CUSTOMER ORDERS ==================== */

function renderCustomerOrders() {
  const container = $("customerOrders");
  const customerOrders = getCustomerOrders().slice().reverse();

  if (!customerOrders.length) {
    container.innerHTML = `
      <div class="empty-state">
        <strong>No orders yet</strong>
        Your orders will appear here.
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Date</th>
            <th>Total</th>
            <th>Status</th>
            <th>Payment</th>
            <th>Receipt</th>
          </tr>
        </thead>
        <tbody>
          ${customerOrders.map(order => `
            <tr>
              <td>${escapeHTML(order.id)}</td>
              <td>${new Date(order.createdAt).toLocaleDateString()}</td>
              <td>${money(order.total)}</td>
              <td>${statusBadge(order.status)}</td>
              <td>${escapeHTML(order.paymentStatus)}</td>
              <td>
                <button class="btn outline small"
                  onclick="viewReceipt('${order.id}')">
                  View
                </button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderCustomerReceipts() {
  const container = $("customerReceipts");
  const customerOrders = getCustomerOrders().slice().reverse();

  if (!customerOrders.length) {
    container.innerHTML = `
      <div class="empty-state">
        <strong>No receipts available</strong>
        Your receipts will appear after placing an order.
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Receipt / Order ID</th>
            <th>Date</th>
            <th>Amount</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${customerOrders.map(order => `
            <tr>
              <td>${escapeHTML(order.id)}</td>
              <td>${new Date(order.createdAt).toLocaleDateString()}</td>
              <td>${money(order.total)}</td>
              <td>
                <button class="btn primary small"
                  onclick="viewReceipt('${order.id}')">
                  View Receipt
                </button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderTransactions() {
  const container = $("customerTransactions");
  const customerOrders = getCustomerOrders().slice().reverse();

  if (!customerOrders.length) {
    container.innerHTML = `
      <div class="empty-state">
        <strong>No transactions yet</strong>
        Your payment records will appear here.
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Transaction</th>
            <th>Date</th>
            <th>Payment Method</th>
            <th>Amount</th>
            <th>Payment Status</th>
          </tr>
        </thead>
        <tbody>
          ${customerOrders.map(order => `
            <tr>
              <td>${escapeHTML(order.id)}</td>
              <td>${new Date(order.createdAt).toLocaleDateString()}</td>
              <td>Cash on Delivery</td>
              <td>${money(order.total)}</td>
              <td>${statusBadge(order.paymentStatus)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

/* ==================== CUSTOMER PROFILE ==================== */

function renderProfile() {
  $("profileName").value = currentUser.name || "";
  $("profileUsername").value = currentUser.username || "";
  $("profilePhone").value = currentUser.phone || "";
  $("profileAddress").value = currentUser.address || "";
  $("profilePassword").value = "";
  setMessage("profileMessage", "");
}

function saveProfile(event) {
  event.preventDefault();

  const name = $("profileName").value.trim();
  const username = $("profileUsername").value.trim();
  const phone = $("profilePhone").value.trim();
  const address = $("profileAddress").value.trim();
  const password = $("profilePassword").value;

  if (name.length < 2) {
    return setMessage("profileMessage", "Enter a valid full name.");
  }

  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return setMessage("profileMessage", "Invalid username.");
  }

  const duplicate = users.find(user =>
    user.id !== currentUser.id &&
    user.username.toLowerCase() === username.toLowerCase()
  );

  if (duplicate) {
    return setMessage("profileMessage", "Username is already taken.");
  }

  if (password && password.length < 6) {
    return setMessage(
      "profileMessage",
      "New password must contain at least 6 characters."
    );
  }

  currentUser.name = name;
  currentUser.username = username;
  currentUser.phone = phone;
  currentUser.address = address;

  if (password) currentUser.password = password;

  persistAll();

  $("headerUser").textContent = "Welcome, " + currentUser.name;
  $("welcomeText").textContent = "Welcome, " + currentUser.name + "!";

  setMessage("profileMessage", "Profile updated successfully.", true);
}

/* ==================== ADMIN DASHBOARD ==================== */

function renderDashboard() {
  const revenue = orders
    .filter(order => order.status !== "Cancelled")
    .reduce((sum, order) => sum + Number(order.total), 0);

  const pending = orders.filter(order => order.status === "Pending").length;
  const customerCount = users.filter(user => user.role === "customer").length;

  $("dashboardStats").innerHTML = `
    <div class="stat-card">
      <span>Total Products</span>
      <strong>${products.length}</strong>
    </div>

    <div class="stat-card">
      <span>Total Orders</span>
      <strong>${orders.length}</strong>
    </div>

    <div class="stat-card">
      <span>Total Customers</span>
      <strong>${customerCount}</strong>
    </div>

    <div class="stat-card">
      <span>Pending Orders</span>
      <strong>${pending}</strong>
    </div>

    <div class="stat-card">
      <span>Total Sales</span>
      <strong>${money(revenue)}</strong>
    </div>

    <div class="stat-card">
      <span>Low Stock Products</span>
      <strong>${products.filter(product => product.stock <= 5).length}</strong>
    </div>
  `;

  const recent = orders.slice().reverse().slice(0, 5);

  $("recentOrders").innerHTML = recent.length
    ? `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${recent.map(order => `
              <tr>
                <td>${escapeHTML(order.id)}</td>
                <td>${escapeHTML(order.customerName)}</td>
                <td>${money(order.total)}</td>
                <td>${statusBadge(order.status)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `
    : `<div class="empty-state">No orders received yet.</div>`;
}

/* ==================== ADMIN PRODUCTS ==================== */

function renderAdminProducts() {
  const container = $("adminProducts");
  const search = $("adminProductSearch").value.trim().toLowerCase();

  const filtered = products.filter(product =>
    product.name.toLowerCase().includes(search) ||
    product.category.toLowerCase().includes(search)
  );

  if (!filtered.length) {
    container.innerHTML = `
      <div class="empty-state">
        <strong>No products found</strong>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(product => `
    <article class="product-card">
      ${imageHTML(product.image)}

      <div class="product-info">
        <h3>${escapeHTML(product.name)}</h3>
        <p>${escapeHTML(product.category)}</p>
        <p>${escapeHTML(product.description)}</p>
        <div class="price">${money(product.price)}</div>
        <div class="stock">Stock: ${product.stock}</div>

        <div class="product-actions">
          <button class="btn outline"
            onclick="editProduct('${product.id}')">
            Edit
          </button>

          <button class="btn danger"
            onclick="deleteProduct('${product.id}')">
            Delete
          </button>
        </div>
      </div>
    </article>
  `).join("");
}

function openProductModal() {
  $("productForm").reset();
  $("productId").value = "";
  $("productModalTitle").textContent = "Add Product";
  $("productImagePreview").textContent = "💐";
  selectedImage = "";

  $("productModal").classList.remove("hidden");
}

function editProduct(id) {
  const product = getProduct(id);
  if (!product) return;

  $("productId").value = product.id;
  $("productName").value = product.name;
  $("productCategory").value = product.category;
  $("productDescription").value = product.description;
  $("productPrice").value = product.price;
  $("productStock").value = product.stock;
  $("productImage").value =
    product.image.startsWith("data:image/") ? "" : product.image;

  selectedImage = product.image;

  $("productModalTitle").textContent = "Edit Product";

  if (/^https?:\/\//i.test(product.image) ||
      product.image.startsWith("data:image/")) {
    $("productImagePreview").innerHTML =
      `<img src="${escapeHTML(product.image)}" alt="Product preview">`;
  } else {
    $("productImagePreview").textContent = product.image;
  }

  $("productModal").classList.remove("hidden");
}

function saveProduct(event) {
  event.preventDefault();

  const id = $("productId").value;
  const name = $("productName").value.trim();
  const category = $("productCategory").value.trim();
  const description = $("productDescription").value.trim();
  const price = Number($("productPrice").value);
  const stock = Number($("productStock").value);
  const image = selectedImage || $("productImage").value.trim() || "💐";

  if (!name || !category || !Number.isFinite(price) ||
      price <= 0 || !Number.isInteger(stock) || stock < 0) {
    showToast("Please enter valid product information.");
    return;
  }

  if (id) {
    const product = getProduct(id);
    if (!product) return;

    product.name = name;
    product.category = category;
    product.description = description;
    product.price = price;
    product.stock = stock;
    product.image = image;

    // Remove cart quantities that exceed the updated stock.
    Object.keys(carts).forEach(userId => {
      carts[userId] = (carts[userId] || []).filter(item => {
        if (item.productId !== id) return true;
        item.quantity = Math.min(item.quantity, stock);
        return item.quantity > 0;
      });
    });

    showToast("Product updated successfully.");
  } else {
    products.push({
      id: makeId("PROD"),
      name,
      category,
      description,
      price,
      stock,
      image
    });

    showToast("New product added successfully.");
  }

  persistAll();
  $("productModal").classList.add("hidden");
  renderAdminProducts();
}

function deleteProduct(id) {
  const product = getProduct(id);
  if (!product) return;

  if (!confirm(`Delete "${product.name}"?`)) return;

  products = products.filter(item => item.id !== id);

  Object.keys(carts).forEach(userId => {
    carts[userId] = (carts[userId] || []).filter(
      item => item.productId !== id
    );
  });

  if (currentUser) cart = getCart();

  persistAll();
  renderAdminProducts();
  showToast("Product deleted.");
}

/* ==================== IMAGE UPLOAD ==================== */

function uploadProductImage(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    showToast("Please select an image file.");
    return;
  }

  if (file.size > 1024 * 1024) {
    showToast("Image must be 1 MB or smaller.");
    event.target.value = "";
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    selectedImage = reader.result;
    $("productImage").value = "";
    $("productImagePreview").innerHTML =
      `<img src="${reader.result}" alt="Product preview">`;
  };

  reader.onerror = () => showToast("Could not read the image.");

  reader.readAsDataURL(file);
}

/* ==================== INVENTORY ==================== */

function renderInventory() {
  const container = $("inventoryList");

  if (!products.length) {
    container.innerHTML = `<div class="empty-state">No products available.</div>`;
    return;
  }

  container.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>Category</th>
            <th>Price</th>
            <th>Stock</th>
            <th>Availability</th>
          </tr>
        </thead>
        <tbody>
          ${products.map(product => `
            <tr>
              <td>${escapeHTML(product.name)}</td>
              <td>${escapeHTML(product.category)}</td>
              <td>${money(product.price)}</td>
              <td>${product.stock}</td>
              <td>
                ${product.stock <= 0
                  ? '<span class="badge red">Out of Stock</span>'
                  : product.stock <= 5
                    ? '<span class="badge">Low Stock</span>'
                    : '<span class="badge green">Available</span>'}
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

/* ==================== ADMIN ORDERS ==================== */

function statusBadge(status) {
  const value = String(status || "Pending");

  let color = "";

  if (["Completed", "Delivered", "Paid"].includes(value)) {
    color = "green";
  } else if (["Cancelled", "Rejected"].includes(value)) {
    color = "red";
  }

  return `<span class="badge ${color}">${escapeHTML(value)}</span>`;
}

function renderAdminOrders() {
  const container = $("adminOrders");

  if (!orders.length) {
    container.innerHTML = `
      <div class="empty-state">
        <strong>No customer orders</strong>
        New orders will appear here.
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Customer</th>
            <th>Contact</th>
            <th>Total</th>
            <th>Status</th>
            <th>Update Status</th>
            <th>Receipt</th>
          </tr>
        </thead>
        <tbody>
          ${orders.slice().reverse().map(order => `
            <tr>
              <td>${escapeHTML(order.id)}</td>
              <td>${escapeHTML(order.customerName)}</td>
              <td>${escapeHTML(order.phone)}</td>
              <td>${money(order.total)}</td>
              <td>${statusBadge(order.status)}</td>
              <td>
                <select onchange="updateOrderStatus('${order.id}',this.value)">
                  ${["Pending", "Processing", "Ready for Delivery",
                    "Delivered", "Cancelled"].map(status => `
                    <option value="${status}"
                      ${order.status === status ? "selected" : ""}>
                      ${status}
                    </option>
                  `).join("")}
                </select>
              </td>
              <td>
                <button class="btn outline small"
                  onclick="viewReceipt('${order.id}')">
                  View
                </button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function updateOrderStatus(id, newStatus) {
  const order = orders.find(item => item.id === id);
  if (!order) return;

  if (order.status === "Cancelled" && newStatus !== "Cancelled") {
    showToast("Cancelled orders cannot be reopened.");
    renderAdminOrders();
    return;
  }

  if (order.status !== "Cancelled" && newStatus === "Cancelled") {
    if (!confirm("Cancel this order and restore its stock?")) {
      renderAdminOrders();
      return;
    }

    (order.items || []).forEach(item => {
      const product = getProduct(item.productId);
      if (product) product.stock += item.quantity;
    });

    order.paymentStatus = "Cancelled";
  }

  if (newStatus === "Delivered") {
    order.paymentStatus = "Paid";
  }

  order.status = newStatus;
  persistAll();

  renderAdminOrders();
  showToast("Order status updated.");
}

/* ==================== ADMIN CUSTOMERS ==================== */

function renderAdminUsers() {
  const container = $("adminUsers");
  const customers = users.filter(user => user.role === "customer");

  if (!customers.length) {
    container.innerHTML = `
      <div class="empty-state">
        <strong>No registered customers</strong>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Full Name</th>
            <th>Username</th>
            <th>Phone</th>
            <th>Account</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${customers.map(user => `
            <tr>
              <td>${escapeHTML(user.name)}</td>
              <td>${escapeHTML(user.username)}</td>
              <td>${escapeHTML(user.phone || "—")}</td>
              <td>
                ${user.active === false
                  ? '<span class="badge red">Disabled</span>'
                  : '<span class="badge green">Active</span>'}
              </td>
              <td>
                <button class="btn outline small"
                  onclick="toggleCustomer('${user.id}')">
                  ${user.active === false ? "Enable" : "Disable"}
                </button>

                <button class="btn danger small"
                  onclick="deleteCustomer('${user.id}')">
                  Delete
                </button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function toggleCustomer(id) {
  const user = getUser(id);
  if (!user || user.role !== "customer") return;

  user.active = user.active === false;
  persistAll();
  renderAdminUsers();

  showToast(user.active ? "Customer account enabled." : "Customer account disabled.");
}

function deleteCustomer(id) {
  const user = getUser(id);
  if (!user || user.role !== "customer") return;

  if (!confirm(`Delete customer account "${user.username}"?`)) return;

  users = users.filter(item => item.id !== id);
  delete carts[id];

  if (session === id) {
    logout();
  }

  persistAll();
  renderAdminUsers();
  showToast("Customer account deleted.");
}

/* ==================== ADMIN SETTINGS ==================== */

function renderSettings() {
  $("settingsUsername").value = currentUser.username;
  $("settingsPassword").value = "";
  $("settingsConfirm").value = "";
  setMessage("settingsMessage", "");
}

function saveSettings(event) {
  event.preventDefault();

  const username = $("settingsUsername").value.trim();
  const password = $("settingsPassword").value;
  const confirmPassword = $("settingsConfirm").value;

  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return setMessage("settingsMessage", "Invalid username.");
  }

  const duplicate = users.find(user =>
    user.id !== currentUser.id &&
    user.username.toLowerCase() === username.toLowerCase()
  );

  if (duplicate) {
    return setMessage("settingsMessage", "Username is already taken.");
  }

  if (password || confirmPassword) {
    if (password.length < 6) {
      return setMessage(
        "settingsMessage",
        "Password must contain at least 6 characters."
      );
    }

    if (password !== confirmPassword) {
      return setMessage("settingsMessage", "Passwords do not match.");
    }

    currentUser.password = password;
  }

  currentUser.username = username;

  persistAll();

  setMessage("settingsMessage", "Admin settings updated successfully.", true);
  showToast("Admin settings saved.");
}

/* ==================== MODALS ==================== */

function closeModal(id) {
  const modal = $(id);
  if (modal) modal.classList.add("hidden");

  if (id === "checkoutModal") {
    pendingCheckout = [];
  }
}

function closeAllModals() {
  document.querySelectorAll(".modal").forEach(modal => {
    modal.classList.add("hidden");
  });

  pendingCheckout = [];
}

/* ==================== EVENT LISTENERS ==================== */

function initializeEvents() {
  $("loginForm").addEventListener("submit", login);
  $("registerForm").addEventListener("submit", register);
  $("profileForm").addEventListener("submit", saveProfile);
  $("settingsForm").addEventListener("submit", saveSettings);
  $("productForm").addEventListener("submit", saveProduct);
  $("checkoutForm").addEventListener("submit", placeOrder);

  $("productSearch").addEventListener("input", renderShop);
  $("adminProductSearch").addEventListener("input", renderAdminProducts);

  $("productImage").addEventListener("input", previewProductImage);
  $("productImageFile").addEventListener("change", uploadProductImage);

  document.querySelectorAll(".modal").forEach(modal => {
    modal.addEventListener("click", event => {
      if (event.target === modal) {
        closeModal(modal.id);
      }
    });
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeAllModals();
    }
  });
}

/* ==================== START APPLICATION ==================== */

document.addEventListener("DOMContentLoaded", () => {
  initializeEvents();
  restoreSession();
  showLogin();
});
