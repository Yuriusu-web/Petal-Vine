
/* =====================================================
   PETAL & VINE FLOWER BOUTIQUE
   COMPLETE CONNECTED JAVASCRIPT
   Customer + Admin + Products + Cart + Checkout
   Selected Checkout + Receipts + Printing
   Transactions + Password Toggles
   Front-end demonstration using localStorage
===================================================== */

"use strict";

/* -------------------- STORAGE -------------------- */

const STORAGE = {
  users: "pv_users",
  products: "pv_products",
  orders: "pv_orders",
  cart: "pv_cart",
  session: "pv_session"
};

const $ = id => document.getElementById(id);

const on = (id, event, callback) => {
  const element = $(id);
  if (element) element.addEventListener(event, callback);
};

let users = read(STORAGE.users, []);
let products = read(STORAGE.products, []);
let orders = read(STORAGE.orders, []);
let carts = read(STORAGE.cart, {});

let currentUser = null;
let currentPage = "shop";
let pendingPurchase = null;
let checkoutSource = null;
let selectedImage = "";
let toastTimer = null;

// Cart selection is remembered while the customer uses the cart.
let selectedCartProducts = new Set();
let cartSelectionInitializedUsers = new Set();

/* -------------------- STORAGE HELPERS -------------------- */

function read(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error("Storage error:", error);
    showToast("Unable to save. Browser storage may be full.");
    return false;
  }
}

function persistAll() {
  return (
    save(STORAGE.users, users) &&
    save(STORAGE.products, products) &&
    save(STORAGE.orders, orders) &&
    save(STORAGE.cart, carts)
  );
}

/* -------------------- GENERAL HELPERS -------------------- */

function makeId(prefix = "ID") {
  return prefix + Date.now().toString(36) +
    Math.random().toString(36).slice(2, 7);
}

function money(amount) {
  return "₱" + Number(amount || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function showToast(message) {
  const toast = $("toast");

  if (!toast) {
    console.log(message);
    return;
  }

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

function emptyState(title, description) {
  return `
    <div class="empty-state">
      <strong>${escapeHTML(title)}</strong>
      ${escapeHTML(description)}
    </div>
  `;
}

function formatDate(date) {
  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "Date unavailable";
  }

  return parsed.toLocaleString("en-PH");
}

function findProduct(id) {
  return products.find(product =>
    String(product.id) === String(id)
  );
}

function findUser(id) {
  return users.find(user =>
    String(user.id) === String(id)
  );
}

function isAdmin() {
  return currentUser?.role === "admin";
}

function getCart() {
  if (!currentUser) return [];
  return Array.isArray(carts[currentUser.id])
    ? carts[currentUser.id]
    : [];
}

function getOrderStatusClass(status) {
  if (status === "Completed") return "green";
  if (status === "Cancelled") return "red";
  return "";
}

function getPaymentStatusClass(status) {
  if (status === "Paid") return "green";
  if (status === "Cancelled") return "red";
  return "";
}

/* -------------------- CART STORAGE -------------------- */

function setCart(items) {
  if (!currentUser) return false;

  const previous = [...getCart()];
  carts[currentUser.id] = items;

  if (!save(STORAGE.cart, carts)) {
    carts[currentUser.id] = previous;
    return false;
  }

  updateCartCount();
  return true;
}

/* -------------------- PRODUCT IMAGE -------------------- */

function getImageMarkup(product) {
  const image = product.image || "💐";

  if (/^(https?:\/\/|data:image\/)/i.test(image)) {
    return `
      <div class="product-image">
        <img
          src="${escapeHTML(image)}"
          alt="${escapeHTML(product.name)}"
          onerror="this.style.display='none';this.parentElement.textContent='💐'"
        >
      </div>
    `;
  }

  return `
    <div class="product-image">
      ${escapeHTML(image)}
    </div>
  `;
}

/* -------------------- INITIAL DATA -------------------- */

function initializeData() {
  if (!Array.isArray(users)) users = [];
  if (!Array.isArray(products)) products = [];
  if (!Array.isArray(orders)) orders = [];

  if (!carts || typeof carts !== "object" || Array.isArray(carts)) {
    carts = {};
  }

  // Remove invalid saved products before normalizing them.
  // This prevents broken products from becoming fake "Flower" entries.
  const originalProducts = products.length;
  const seenIds = new Set();

  products = products.filter(product => {
    if (!product || typeof product !== "object") return false;

    const id = String(product.id || "").trim();
    const name = String(product.name || "").trim();
    const category = String(product.category || "").trim();

    const price = Number(product.price);
    const stock = Number(product.stock);

    if (!id || !name || !category) return false;
    if (!Number.isFinite(price) || price <= 0) return false;
    if (!Number.isInteger(stock) || stock < 0) return false;
    if (seenIds.has(id)) return false;

    seenIds.add(id);
    return true;
  });

  if (products.length !== originalProducts) {
    console.log(
      `${originalProducts - products.length} invalid product(s) removed.`
    );
  }

  // Create administrator if none exists.
  if (!users.some(user => user.role === "admin")) {
    users.push({
      id: makeId("USR"),
      name: "Shop Administrator",
      username: "admin",
      password: "admin123",
      role: "admin",
      phone: "",
      address: "",
      active: true,
      createdAt: new Date().toISOString()
    });
  }

  const defaults = [
    ["Classic Red Roses", "Roses", "A timeless bouquet of beautiful red roses.", 850, 30, "🌹"],
    ["Pink Rose Bouquet", "Roses", "Soft pink roses for sweet celebrations.", 780, 25, "🌸"],
    ["White Roses", "Roses", "Elegant white roses for special moments.", 900, 20, "🤍"],
    ["Sunflower Bliss", "Sunflowers", "Bright sunflowers to make someone's day.", 650, 25, "🌻"],
    ["Tulip Garden", "Tulips", "A colorful arrangement of fresh tulips.", 950, 18, "🌷"],
    ["Purple Dreams", "Mixed Flowers", "A charming purple floral arrangement.", 880, 16, "💜"],
    ["Baby's Breath", "Mixed Flowers", "Delicate blooms for a gentle gift.", 550, 30, "🤍"],
    ["Pink Carnations", "Carnations", "Lovely carnations for someone special.", 720, 22, "🌺"],
    ["Orchid Elegance", "Orchids", "Beautiful orchids with a graceful finish.", 1200, 12, "🪻"],
    ["Daisy Delight", "Daisies", "Cheerful daisies in a lovely arrangement.", 600, 28, "🌼"],
    ["Mixed Romance", "Mixed Flowers", "A romantic mix of seasonal flowers.", 1100, 15, "💐"],
    ["White Lily Bouquet", "Lilies", "Elegant lilies with a soft fragrance.", 980, 14, "🌼"],
    ["Peach Roses", "Roses", "Warm peach roses for thoughtful gifts.", 820, 20, "🌹"],
    ["Blue Hydrangea", "Hydrangeas", "A lovely arrangement of blue blooms.", 1350, 10, "💠"],
    ["Lavender Love", "Mixed Flowers", "A calming lavender-inspired bouquet.", 890, 17, "🪻"],
    ["Garden Party", "Mixed Flowers", "A cheerful mix of garden favorites.", 1050, 13, "💐"],
    ["Mini Rose Bouquet", "Roses", "A smaller bouquet for simple surprises.", 450, 35, "🌹"],
    ["Golden Sunflowers", "Sunflowers", "A bright golden bouquet full of joy.", 750, 19, "🌻"]
  ];

  // Seed defaults only if there are no valid saved products.
  if (products.length === 0) {
    products = defaults.map(item => ({
      id: makeId("PRD"),
      name: item[0],
      category: item[1],
      description: item[2],
      price: item[3],
      stock: item[4],
      image: item[5]
    }));
  }

  products = products.map(product => ({
    ...product,
    id: String(product.id),
    name: String(product.name).trim(),
    category: String(product.category).trim(),
    description: String(product.description || ""),
    price: Number(product.price),
    stock: Number(product.stock),
    image: product.image || "💐"
  }));

  // Remove deleted or unavailable products from all carts.
  Object.keys(carts).forEach(userId => {
    carts[userId] = (Array.isArray(carts[userId]) ? carts[userId] : [])
      .filter(item => findProduct(item.productId));
  });

  persistAll();
}

initializeData();

/* -------------------- PASSWORD VISIBILITY -------------------- */

function togglePassword(inputId, button) {
  const input = $(inputId);
  if (!input || !button) return;

  const showing = input.type === "text";

  input.type = showing ? "password" : "text";
  button.textContent = showing ? "👁" : "🙈";

  button.setAttribute(
    "aria-label",
    showing ? "Show password" : "Hide password"
  );

  button.title = showing ? "Show password" : "Hide password";
}

function enhancePasswordFields() {
  const passwordIds = [
    "loginPassword",
    "registerPassword",
    "registerConfirm",
    "profilePassword",
    "settingsPassword",
    "settingsConfirm"
  ];

  passwordIds.forEach(id => {
    const input = $(id);
    if (!input || input.dataset.toggleAdded === "true") return;

    const parent = input.parentElement;

    const existingButton = parent?.querySelector(
      `button[onclick*="${id}"]`
    );

    if (existingButton) {
      existingButton.type = "button";
      existingButton.textContent = "👁";
      existingButton.classList.add("password-toggle");
      existingButton.setAttribute("aria-label", "Show password");
      existingButton.title = "Show password";
      input.dataset.toggleAdded = "true";
      return;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "password-field";

    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    const button = document.createElement("button");

    button.type = "button";
    button.className = "password-toggle";
    button.textContent = "👁";
    button.setAttribute("aria-label", "Show password");
    button.title = "Show password";

    button.addEventListener("click", () => {
      togglePassword(id, button);
    });

    wrapper.appendChild(button);
    input.dataset.toggleAdded = "true";
  });
}

/* -------------------- AUTHENTICATION -------------------- */

function showLogin() {
  $("loginForm")?.classList.remove("hidden");
  $("registerForm")?.classList.add("hidden");
  $("authSwitch")?.classList.remove("hidden");
  $("loginSwitch")?.classList.add("hidden");

  if ($("authTitle")) $("authTitle").textContent = "Welcome Back";

  if ($("authSubtitle")) {
    $("authSubtitle").textContent =
      "Sign in to continue to your flower shop.";
  }

  setMessage("loginMessage", "");
  setMessage("registerMessage", "");
}

function showRegister() {
  $("loginForm")?.classList.add("hidden");
  $("registerForm")?.classList.remove("hidden");
  $("authSwitch")?.classList.add("hidden");
  $("loginSwitch")?.classList.remove("hidden");

  if ($("authTitle")) $("authTitle").textContent = "Create Account";

  if ($("authSubtitle")) {
    $("authSubtitle").textContent = "Register your customer account.";
  }

  setMessage("loginMessage", "");
  setMessage("registerMessage", "");
}

/* -------------------- REGISTER -------------------- */

on("registerForm", "submit", event => {
  event.preventDefault();

  const name = $("registerName").value.trim();
  const username = $("registerUsername").value.trim();
  const password = $("registerPassword").value;
  const confirm = $("registerConfirm").value;

  if (name.length < 2) {
    return setMessage("registerMessage", "Please enter your full name.");
  }

  if (username.length < 3) {
    return setMessage(
      "registerMessage",
      "Username must have at least 3 characters."
    );
  }

  if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
    return setMessage(
      "registerMessage",
      "Username may contain letters, numbers, dots, _ or - only."
    );
  }

  if (password.length < 6) {
    return setMessage(
      "registerMessage",
      "Password must have at least 6 characters."
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

  const newUser = {
    id: makeId("USR"),
    name,
    username,
    password,
    role: "customer",
    phone: "",
    address: "",
    active: true,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);

  if (!save(STORAGE.users, users)) {
    users.pop();
    return;
  }

  $("registerForm").reset();
  showLogin();

  if ($("loginUsername")) {
    $("loginUsername").value = username;
  }

  setMessage(
    "loginMessage",
    "Account created successfully. Please log in.",
    true
  );
});

/* -------------------- LOGIN -------------------- */

on("loginForm", "submit", event => {
  event.preventDefault();

  const username = $("loginUsername").value.trim().toLowerCase();
  const password = $("loginPassword").value;

  const user = users.find(account =>
    account.username.toLowerCase() === username &&
    account.password === password
  );

  if (!user) {
    return setMessage("loginMessage", "Incorrect username or password.");
  }

  if (user.active === false) {
    return setMessage(
      "loginMessage",
      "This account has been disabled. Contact the administrator."
    );
  }

  currentUser = user;
  localStorage.setItem(STORAGE.session, user.id);

  $("loginForm").reset();
  setMessage("loginMessage", "");

  selectedCartProducts.clear();
  openApplication();
});

function logout() {
  currentUser = null;
  pendingPurchase = null;
  checkoutSource = null;
  selectedCartProducts.clear();

  localStorage.removeItem(STORAGE.session);

  $("appScreen")?.classList.add("hidden");
  $("authScreen")?.classList.remove("hidden");

  if ($("headerUser")) $("headerUser").textContent = "";

  closeAllModals();
  showLogin();

  if ($("loginUsername")) $("loginUsername").value = "";
  if ($("loginPassword")) $("loginPassword").value = "";

  showToast("You have logged out.");
}

function openApplication() {
  if (!currentUser) return;

  $("authScreen")?.classList.add("hidden");
  $("appScreen")?.classList.remove("hidden");

  if ($("headerUser")) {
    $("headerUser").textContent =
      `${currentUser.name} · ${currentUser.role}`;
  }

  if ($("roleLabel")) {
    $("roleLabel").textContent =
      isAdmin() ? "Administrator" : "Customer";
  }

  if ($("welcomeText")) {
    $("welcomeText").textContent = `Welcome, ${currentUser.name}!`;
  }

  $("customerNav")?.classList.toggle("hidden", isAdmin());
  $("adminNav")?.classList.toggle("hidden", !isAdmin());

  if (isAdmin()) {
    adminPage("dashboard");
  } else {
    customerPage("shop");
  }
}

function restoreSession() {
  const sessionId = localStorage.getItem(STORAGE.session);
  if (!sessionId) return;

  const user = findUser(sessionId);

  if (!user || user.active === false) {
    localStorage.removeItem(STORAGE.session);
    return;
  }

  currentUser = user;
  openApplication();
}

/* -------------------- NAVIGATION -------------------- */

function hideAllPages() {
  document.querySelectorAll(".page").forEach(page => {
    page.classList.add("hidden");
  });

  document.querySelectorAll(".nav-link").forEach(button => {
    button.classList.remove("active");
  });
}

function activatePage(pageId, button) {
  hideAllPages();
  $(pageId)?.classList.remove("hidden");

  if (button) button.classList.add("active");
}

function customerPage(page, button) {
  if (!currentUser || isAdmin()) return;

  const titles = {
    shop: "Shop Flowers",
    cart: "My Cart",
    orders: "My Orders",
    receipts: "My Receipts",
    transactions: "My Transactions",
    profile: "My Profile",
    about: "About Us"
  };

  currentPage = page;

  if ($("pageTitle")) {
    $("pageTitle").textContent = titles[page] || "Petal & Vine";
  }

  activatePage("customer-" + page, button);

  if (page === "shop") renderShop();
  if (page === "cart") renderCart();
  if (page === "orders") renderCustomerOrders();
  if (page === "receipts") renderCustomerReceipts();
  if (page === "transactions") renderCustomerTransactions();
  if (page === "profile") renderProfile();

  updateCartCount();
}

function adminPage(page, button) {
  if (!currentUser || !isAdmin()) return;

  const titles = {
    dashboard: "Admin Dashboard",
    products: "Manage Products",
    inventory: "Inventory Management",
    orders: "Customer Orders",
    users: "User Management",
    settings: "Admin Settings"
  };

  currentPage = page;

  if ($("pageTitle")) {
    $("pageTitle").textContent = titles[page] || "Administration";
  }

  activatePage("admin-" + page, button);

  if (page === "dashboard") renderDashboard();
  if (page === "products") renderAdminProducts();
  if (page === "inventory") renderInventory();
  if (page === "orders") renderAdminOrders();
  if (page === "users") renderAdminUsers();
  if (page === "settings") renderSettings();
}

/* -------------------- CUSTOMER SHOP -------------------- */

function renderShop() {
  const container = $("shopProducts");
  if (!container) return;

  const search = $("productSearch")?.value.trim().toLowerCase() || "";

  const filtered = products.filter(product =>
    product.name.toLowerCase().includes(search) ||
    product.category.toLowerCase().includes(search) ||
    (product.description || "").toLowerCase().includes(search)
  );

  if (!filtered.length) {
    container.innerHTML = emptyState(
      "No flowers found",
      "Try another search or check back later."
    );
    return;
  }

  container.innerHTML = filtered.map(product => `
    <article class="product-card">
      ${getImageMarkup(product)}

      <div class="product-info">
        <h3>${escapeHTML(product.name)}</h3>
        <p>${escapeHTML(product.category)}</p>
        <p>${escapeHTML(product.description || "")}</p>

        <div class="price">${money(product.price)}</div>

        <div class="stock">
          ${product.stock > 0
            ? `${product.stock} available`
            : "Out of stock"}
        </div>

        <label class="quantity-label" for="quantity-${escapeHTML(product.id)}">
          Quantity
        </label>

        <input
          class="product-quantity"
          id="quantity-${escapeHTML(product.id)}"
          type="number"
          min="1"
          step="1"
          max="${product.stock}"
          value="1"
          ${product.stock <= 0 ? "disabled" : ""}
        >

        <div class="product-actions">
          <button
            class="btn outline"
            onclick="addToCart('${escapeHTML(product.id)}')"
            ${product.stock <= 0 ? "disabled" : ""}
          >
            Add to Cart
          </button>

          <button
            class="btn primary"
            onclick="buyNow('${escapeHTML(product.id)}')"
            ${product.stock <= 0 ? "disabled" : ""}
          >
            Buy Now
          </button>
        </div>
      </div>
    </article>
  `).join("");
}

on("productSearch", "input", renderShop);

function getChosenQuantity(productId) {
  const input = $("quantity-" + productId);
  const quantity = Number(input?.value);
  const product = findProduct(productId);

  if (!Number.isInteger(quantity) || quantity < 1) {
    showToast("Please enter a quantity of at least 1.");
    return null;
  }

  if (!product) {
    showToast("Product not found.");
    return null;
  }

  if (quantity > product.stock) {
    showToast(`Only ${product.stock} item(s) are available.`);
    return null;
  }

  return quantity;
}

function addToCart(productId) {
  if (!currentUser || isAdmin()) return;

  const product = findProduct(productId);

  if (!product) {
    return showToast("This flower is no longer available.");
  }

  const quantity = getChosenQuantity(productId);
  if (quantity === null) return;

  const cart = [...getCart()];

  const existing = cart.find(item =>
    String(item.productId) === String(productId)
  );

  const currentQuantity = existing ? Number(existing.quantity) : 0;
  const newQuantity = currentQuantity + quantity;

  if (newQuantity > product.stock) {
    return showToast(`Only ${product.stock} flower(s) are available.`);
  }

  if (existing) {
    existing.quantity = newQuantity;
  } else {
    cart.push({ productId: String(productId), quantity });
  }

  if (!setCart(cart)) return;

  // Newly added products are selected for checkout by default.
  selectedCartProducts.add(String(productId));

  showToast(`${product.name} added to your cart!`);
}

function buyNow(productId) {
  if (!currentUser || isAdmin()) return;

  const product = findProduct(productId);
  if (!product) return showToast("Product not found.");

  const quantity = getChosenQuantity(productId);
  if (quantity === null) return;

  pendingPurchase = [{
    productId: String(productId),
    quantity
  }];

  checkoutSource = "buyNow";
  openCheckout(pendingPurchase);
}

/* -------------------- CART -------------------- */

function updateCartCount() {
  if (!currentUser) {
    if ($("cartCount")) $("cartCount").textContent = "0";
    return;
  }

  const cart = getCart().filter(item => findProduct(item.productId));

  if (cart.length !== getCart().length) {
    carts[currentUser.id] = cart;
    save(STORAGE.cart, carts);
  }

  const count = cart.reduce((total, item) =>
    total + Number(item.quantity || 0), 0
  );

  if ($("cartCount")) {
    $("cartCount").textContent = count;
  }
}

function toggleCartSelection(productId, checked) {
  productId = String(productId);

  if (checked) {
    selectedCartProducts.add(productId);
  } else {
    selectedCartProducts.delete(productId);
  }

  renderCart();
}

function toggleSelectAllCart(checked) {
  if (!currentUser) return;

  if (checked) {
    getCart().forEach(item => {
      selectedCartProducts.add(String(item.productId));
    });
  } else {
    selectedCartProducts.clear();
  }

  renderCart();
}

function renderCart() {
  const container = $("cartContent");
  if (!container || !currentUser) return;

  let cart = getCart().filter(item => findProduct(item.productId));

  if (cart.length !== getCart().length) {
    carts[currentUser.id] = cart;
    save(STORAGE.cart, carts);
  }

  // Initially select all products for a customer's first cart visit.
  if (!cartSelectionInitializedUsers.has(currentUser.id)) {
    cart.forEach(item => {
      selectedCartProducts.add(String(item.productId));
    });

    cartSelectionInitializedUsers.add(currentUser.id);
  }

  // Remove selections for products no longer in the cart.
  const cartIds = new Set(
    cart.map(item => String(item.productId))
  );

  selectedCartProducts.forEach(id => {
    if (!cartIds.has(id)) selectedCartProducts.delete(id);
  });

  updateCartCount();

  if (!cart.length) {
    container.innerHTML = emptyState(
      "Your cart is empty",
      "Browse our flowers and add your favorites."
    );
    return;
  }

  let selectedTotal = 0;
  let selectedCount = 0;

  const rows = cart.map(item => {
    const product = findProduct(item.productId);
    if (!product) return "";

    const id = String(product.id);
    const quantity = Number(item.quantity);
    const subtotal = product.price * quantity;
    const selected = selectedCartProducts.has(id);

    if (selected) {
      selectedTotal += subtotal;
      selectedCount++;
    }

    return `
      <div class="cart-row">
        <div class="cart-select">
          <input
            type="checkbox"
            aria-label="Select ${escapeHTML(product.name)}"
            ${selected ? "checked" : ""}
            onchange="toggleCartSelection('${escapeHTML(id)}',this.checked)"
          >
        </div>

        <div>
          <strong>${escapeHTML(product.name)}</strong>
          <p class="muted">${money(product.price)} each</p>
          <p class="muted">Available: ${product.stock}</p>
        </div>

        <div>
          <label for="cart-qty-${escapeHTML(id)}">Quantity</label>

          <input
            class="qty-input"
            id="cart-qty-${escapeHTML(id)}"
            type="number"
            min="1"
            step="1"
            max="${product.stock}"
            value="${quantity}"
            onchange="updateCartQuantity('${escapeHTML(id)}',this.value)"
          >
        </div>

        <div>
          <strong>${money(subtotal)}</strong>
        </div>

        <div>
          <button
            class="btn danger small"
            onclick="removeFromCart('${escapeHTML(id)}')"
          >
            Remove
          </button>
        </div>
      </div>
    `;
  }).join("");

  const allSelected = selectedCount === cart.length;

  container.innerHTML = `
    <div class="panel">

      <div class="cart-selection-header">
        <label>
          <input
            type="checkbox"
            ${allSelected ? "checked" : ""}
            onchange="toggleSelectAllCart(this.checked)"
          >
          Select All Products
        </label>

        <span>${selectedCount} of ${cart.length} selected</span>
      </div>

      ${rows}
    </div>

    <div class="cart-total">
      <p>Selected Products: <strong>${selectedCount}</strong></p>

      <p>Selected Total</p>

      <strong>${money(selectedTotal)}</strong>

      <br><br>

      <button
        class="btn primary"
        onclick="checkoutCart()"
        ${selectedCount === 0 ? "disabled" : ""}
      >
        Checkout Selected Products
      </button>
    </div>
  `;
}

function updateCartQuantity(productId, value) {
  const product = findProduct(productId);
  if (!product) return;

  const quantity = Number(value);

  if (!Number.isInteger(quantity) || quantity < 1) {
    showToast("Quantity must be at least 1.");
    renderCart();
    return;
  }

  if (quantity > product.stock) {
    showToast(`Only ${product.stock} item(s) are available.`);
    renderCart();
    return;
  }

  const cart = [...getCart()];

  const item = cart.find(row =>
    String(row.productId) === String(productId)
  );

  if (!item) return;

  item.quantity = quantity;

  if (setCart(cart)) renderCart();
}

function removeFromCart(productId) {
  const cart = getCart().filter(item =>
    String(item.productId) !== String(productId)
  );

  if (!setCart(cart)) return;

  selectedCartProducts.delete(String(productId));

  renderCart();
  showToast("Item removed from cart.");
}

function checkoutCart() {
  const cart = getCart();

  // IMPORTANT: only checked products are purchased.
  const selectedItems = cart.filter(item =>
    selectedCartProducts.has(String(item.productId))
  );

  if (!selectedItems.length) {
    return showToast("Please select at least one flower to checkout.");
  }

  for (const item of selectedItems) {
    const product = findProduct(item.productId);

    if (!product || Number(item.quantity) > product.stock) {
      return showToast("A selected flower does not have enough stock.");
    }
  }

  pendingPurchase = selectedItems.map(item => ({
    productId: String(item.productId),
    quantity: Number(item.quantity)
  }));

  checkoutSource = "cart";

  openCheckout(pendingPurchase);
}

/* -------------------- CHECKOUT -------------------- */

function openCheckout(items) {
  if (!items || !items.length || !currentUser) return;

  for (const item of items) {
    const product = findProduct(item.productId);

    if (
      !product ||
      !Number.isInteger(Number(item.quantity)) ||
      Number(item.quantity) < 1 ||
      Number(item.quantity) > product.stock
    ) {
      pendingPurchase = null;
      checkoutSource = null;

      showToast("One or more items are no longer available.");
      return;
    }
  }

  pendingPurchase = items.map(item => ({
    productId: String(item.productId),
    quantity: Number(item.quantity)
  }));

  const total = pendingPurchase.reduce((sum, item) => {
    const product = findProduct(item.productId);
    return sum + product.price * item.quantity;
  }, 0);

  if ($("checkoutSummary")) {
    $("checkoutSummary").innerHTML = `
      ${pendingPurchase.map(item => {
        const product = findProduct(item.productId);

        return `
          <div class="receipt-line">
            <span>
              ${escapeHTML(product.name)} × ${item.quantity}
            </span>
            <strong>${money(product.price * item.quantity)}</strong>
          </div>
        `;
      }).join("")}

      <div class="receipt-total">
        Total: ${money(total)}
      </div>

      <p class="muted">Payment: Cash on Delivery (COD)</p>
    `;
  }

  if ($("checkoutName")) {
    $("checkoutName").value = currentUser.name || "";
  }

  if ($("checkoutPhone")) {
    $("checkoutPhone").value = currentUser.phone || "";
  }

  if ($("checkoutAddress")) {
    $("checkoutAddress").value = currentUser.address || "";
  }

  $("checkoutModal")?.classList.remove("hidden");
}

on("checkoutForm", "submit", event => {
  event.preventDefault();

  if (!currentUser || !pendingPurchase?.length) return;

  const name = $("checkoutName")?.value.trim() || "";
  const phone = $("checkoutPhone")?.value.trim() || "";
  const address = $("checkoutAddress")?.value.trim() || "";

  if (name.length < 2) {
    return showToast("Please enter your complete name.");
  }

  if (phone.replace(/\D/g, "").length < 7) {
    return showToast("Please enter a valid contact number.");
  }

  if (address.length < 8) {
    return showToast("Please enter your complete delivery address.");
  }

  // Validate everything before changing stock.
  for (const item of pendingPurchase) {
    const product = findProduct(item.productId);

    if (
      !product ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      product.stock < item.quantity
    ) {
      return showToast(
        "An item does not have enough stock. Please review your order."
      );
    }
  }

  const orderItems = pendingPurchase.map(item => {
    const product = findProduct(item.productId);

    return {
      productId: product.id,
      name: product.name,
      price: Number(product.price),
      quantity: Number(item.quantity),
      subtotal: Number(product.price) * Number(item.quantity)
    };
  });

  const total = orderItems.reduce((sum, item) =>
    sum + item.subtotal, 0
  );

  const order = {
    id: makeId("ORD"),
    receiptNo: "PV-" + Date.now(),
    userId: currentUser.id,
    customerName: name,
    username: currentUser.username,
    phone,
    address,
    items: orderItems,
    total,
    paymentMethod: "Cash on Delivery (COD)",
    paymentStatus: "Pending",
    status: "Pending",
    createdAt: new Date().toISOString()
  };

  const oldProducts = JSON.stringify(products);
  const oldOrders = JSON.stringify(orders);
  const oldCarts = JSON.stringify(carts);
  const oldUsers = JSON.stringify(users);

  const purchasedIds = new Set(
    pendingPurchase.map(item => String(item.productId))
  );

  // Deduct only the purchased quantities.
  pendingPurchase.forEach(item => {
    findProduct(item.productId).stock -= item.quantity;
  });

  // Remove only purchased products from the cart.
  // Unselected products remain untouched.
  if (checkoutSource === "cart") {
    const remainingCart = getCart().filter(item =>
      !purchasedIds.has(String(item.productId))
    );

    carts[currentUser.id] = remainingCart;
  }

  currentUser.name = name;
  currentUser.phone = phone;
  currentUser.address = address;

  orders.unshift(order);

  const saved =
    save(STORAGE.products, products) &&
    save(STORAGE.orders, orders) &&
    save(STORAGE.users, users) &&
    save(STORAGE.cart, carts);

  if (!saved) {
    products = JSON.parse(oldProducts);
    orders = JSON.parse(oldOrders);
    carts = JSON.parse(oldCarts);
    users = JSON.parse(oldUsers);

    currentUser = findUser(currentUser.id);

    persistAll();

    return showToast("Order could not be saved. Please try again.");
  }

  // Clear purchased products from selection.
  purchasedIds.forEach(id => selectedCartProducts.delete(id));

  pendingPurchase = null;
  checkoutSource = null;

  $("checkoutForm")?.reset();
  closeModal("checkoutModal");

  updateCartCount();

  if (currentPage === "cart") renderCart();
  if (currentPage === "shop") renderShop();

  renderReceipt(order);
  showToast("Your order has been placed successfully!");
});

/* -------------------- RECEIPTS -------------------- */

function renderReceipt(order) {
  if (!order || !Array.isArray(order.items)) return;

  if ($("receiptContent")) {
    $("receiptContent").innerHTML = `
      <div class="receipt">
        <h2>✿ Petal & Vine</h2>
        <p>Flower Boutique</p>
        <p class="muted">Order Receipt</p>

        <hr>

        <div class="receipt-line">
          <span>Receipt No.</span>
          <strong>${escapeHTML(order.receiptNo)}</strong>
        </div>

        <div class="receipt-line">
          <span>Order Date</span>
          <strong>${formatDate(order.createdAt)}</strong>
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

        ${order.items.map(item => `
          <div class="receipt-line">
            <span>
              ${escapeHTML(item.name)} × ${Number(item.quantity)}
              <br>
              <small>${money(item.price)} each</small>
            </span>

            <strong>${money(item.subtotal)}</strong>
          </div>
        `).join("")}

        <div class="receipt-total">
          Total: ${money(order.total)}
        </div>

        <div class="receipt-line">
          <span>Payment Method</span>
          <strong>${escapeHTML(order.paymentMethod || "Cash on Delivery")}</strong>
        </div>

        <div class="receipt-line">
          <span>Payment Status</span>
          <strong>${escapeHTML(order.paymentStatus || "Pending")}</strong>
        </div>

        <div class="receipt-line">
          <span>Order Status</span>
          <strong>${escapeHTML(order.status || "Pending")}</strong>
        </div>

        <p>Thank you for shopping with Petal & Vine!</p>
        <p class="muted">Please keep this receipt for your records.</p>
      </div>

      <div class="receipt-actions no-print">
        <button type="button" class="btn primary" onclick="printReceipt()">
          Print Receipt
        </button>
      </div>
    `;
  }

  $("receiptModal")?.classList.remove("hidden");
}

function printReceipt() {
  const receipt = $("receiptContent")?.querySelector(".receipt");

  if (!receipt) {
    return showToast("No receipt is available to print.");
  }

  const printWindow = window.open("", "_blank", "width=800,height=700");

  if (!printWindow) {
    return showToast("Please allow pop-ups to print your receipt.");
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Petal & Vine Receipt</title>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 25px;
          color: #333;
          max-width: 700px;
          margin: auto;
        }

        h2, h3, p { text-align: center; }

        .receipt-line {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          padding: 9px 0;
          border-bottom: 1px solid #eee;
        }

        .receipt-total {
          text-align: right;
          font-size: 20px;
          font-weight: bold;
          margin-top: 20px;
        }

        .muted { color: #777; }

        hr {
          border: 0;
          border-top: 1px solid #ddd;
        }

        @media print {
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      ${receipt.innerHTML}
      <script>
        window.onload = function() {
          window.print();
        };
      <\/script>
    </body>
    </html>
  `);

  printWindow.document.close();
}

function viewReceipt(orderId) {
  if (!currentUser) return;

  const order = orders.find(item =>
    String(item.id) === String(orderId)
  );

  if (!order) return showToast("Receipt not found.");

  if (!isAdmin() && order.userId !== currentUser.id) {
    return showToast("You cannot view this receipt.");
  }

  renderReceipt(order);
}

/* -------------------- CUSTOMER ORDERS -------------------- */

function renderCustomerOrders() {
  const container = $("customerOrders");
  if (!container || !currentUser) return;

  const myOrders = orders.filter(order =>
    order.userId === currentUser.id
  );

  if (!myOrders.length) {
    container.innerHTML = emptyState(
      "No orders yet",
      "Your placed orders will appear here."
    );
    return;
  }

  container.innerHTML = myOrders.map(order => `
    <div class="panel" style="margin-bottom:15px">
      <div class="section-heading">
        <div>
          <h3>${escapeHTML(order.receiptNo)}</h3>
          <p class="muted">${formatDate(order.createdAt)}</p>
        </div>

        <span class="badge ${getOrderStatusClass(order.status)}">
          ${escapeHTML(order.status || "Pending")}
        </span>
      </div>

      ${order.items.map(item => `
        <div class="receipt-line">
          <span>
            ${escapeHTML(item.name)} × ${Number(item.quantity)}
          </span>
          <strong>${money(item.subtotal)}</strong>
        </div>
      `).join("")}

      <div class="receipt-total">
        Total: ${money(order.total)}
      </div>

      <p class="muted">
        Payment: ${escapeHTML(order.paymentMethod || "COD")}
        · ${escapeHTML(order.paymentStatus || "Pending")}
      </p>

      <button
        class="btn outline small"
        onclick="viewReceipt('${escapeHTML(order.id)}')"
      >
        View Receipt
      </button>
    </div>
  `).join("");
}

/* -------------------- CUSTOMER RECEIPTS -------------------- */

function renderCustomerReceipts() {
  const container = $("customerReceipts");
  if (!container || !currentUser) return;

  const myOrders = orders.filter(order =>
    order.userId === currentUser.id
  );

  if (!myOrders.length) {
    container.innerHTML = emptyState(
      "No receipts available",
      "Your receipts will appear after placing an order."
    );
    return;
  }

  container.innerHTML = myOrders.map(order => `
    <div class="panel" style="margin-bottom:12px">
      <div class="section-heading">
        <div>
          <h3>${escapeHTML(order.receiptNo)}</h3>
          <p class="muted">${formatDate(order.createdAt)}</p>
        </div>

        <span class="badge ${getOrderStatusClass(order.status)}">
          ${escapeHTML(order.status || "Pending")}
        </span>
      </div>

      <p>Total: <strong>${money(order.total)}</strong></p>

      <p class="muted">
        Payment: ${escapeHTML(order.paymentStatus || "Pending")}
      </p>

      <div class="product-actions">
        <button
          class="btn primary"
          onclick="viewReceipt('${escapeHTML(order.id)}')"
        >
          View / Print Receipt
        </button>
      </div>
    </div>
  `).join("");
}

/* -------------------- CUSTOMER TRANSACTIONS -------------------- */

function renderCustomerTransactions() {
  const container = $("customerTransactions");
  if (!container || !currentUser) return;

  const myOrders = orders.filter(order =>
    order.userId === currentUser.id
  );

  if (!myOrders.length) {
    container.innerHTML = emptyState(
      "No transactions yet",
      "Your transactions will appear here after placing an order."
    );
    return;
  }

  const totalTransactions = myOrders.length;

  const totalAmount = myOrders.reduce((sum, order) =>
    sum + Number(order.total || 0), 0
  );

  const paidAmount = myOrders
    .filter(order => order.paymentStatus === "Paid")
    .reduce((sum, order) => sum + Number(order.total || 0), 0);

  container.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <span>Total Transactions</span>
        <strong>${totalTransactions}</strong>
      </div>

      <div class="stat-card">
        <span>Total Order Amount</span>
        <strong>${money(totalAmount)}</strong>
      </div>

      <div class="stat-card">
        <span>Paid Amount</span>
        <strong>${money(paidAmount)}</strong>
      </div>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Receipt No.</th>
            <th>Date</th>
            <th>Amount</th>
            <th>Payment Method</th>
            <th>Payment Status</th>
            <th>Order Status</th>
            <th>Receipt</th>
          </tr>
        </thead>

        <tbody>
          ${myOrders.map(order => `
            <tr>
              <td>${escapeHTML(order.receiptNo)}</td>
              <td>${formatDate(order.createdAt)}</td>
              <td>${money(order.total)}</td>
              <td>${escapeHTML(order.paymentMethod || "COD")}</td>

              <td>
                <span class="badge ${getPaymentStatusClass(order.paymentStatus)}">
                  ${escapeHTML(order.paymentStatus || "Pending")}
                </span>
              </td>

              <td>
                <span class="badge ${getOrderStatusClass(order.status)}">
                  ${escapeHTML(order.status || "Pending")}
                </span>
              </td>

              <td>
                <button
                  class="btn outline small"
                  onclick="viewReceipt('${escapeHTML(order.id)}')"
                >
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

/* -------------------- CUSTOMER PROFILE -------------------- */

function renderProfile() {
  if (!currentUser) return;

  if ($("profileName")) $("profileName").value = currentUser.name || "";
  if ($("profileUsername")) $("profileUsername").value = currentUser.username || "";
  if ($("profilePhone")) $("profilePhone").value = currentUser.phone || "";
  if ($("profileAddress")) $("profileAddress").value = currentUser.address || "";
  if ($("profilePassword")) $("profilePassword").value = "";

  setMessage("profileMessage", "");
}

on("profileForm", "submit", event => {
  event.preventDefault();

  if (!currentUser || isAdmin()) return;

  const name = $("profileName").value.trim();
  const username = $("profileUsername").value.trim();
  const phone = $("profilePhone").value.trim();
  const address = $("profileAddress").value.trim();
  const password = $("profilePassword").value;

  if (name.length < 2 || username.length < 3) {
    return setMessage("profileMessage", "Please enter a valid name and username.");
  }

  if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
    return setMessage("profileMessage", "Username contains invalid characters.");
  }

  const duplicate = users.some(user =>
    user.id !== currentUser.id &&
    user.username.toLowerCase() === username.toLowerCase()
  );

  if (duplicate) {
    return setMessage("profileMessage", "That username is already in use.");
  }

  if (password && password.length < 6) {
    return setMessage("profileMessage", "New password must have at least 6 characters.");
  }

  const oldUser = { ...currentUser };

  currentUser.name = name;
  currentUser.username = username;
  currentUser.phone = phone;
  currentUser.address = address;

  if (password) currentUser.password = password;

  if (!save(STORAGE.users, users)) {
    Object.assign(currentUser, oldUser);
    return;
  }

  if ($("welcomeText")) {
    $("welcomeText").textContent = `Welcome, ${currentUser.name}!`;
  }

  if ($("headerUser")) {
    $("headerUser").textContent =
      `${currentUser.name} · ${currentUser.role}`;
  }

  $("profilePassword").value = "";

  setMessage("profileMessage", "Profile updated successfully.", true);
  showToast("Profile updated.");
});

/* -------------------- ADMIN DASHBOARD -------------------- */

function renderDashboard() {
  if (!isAdmin()) return;

  const revenue = orders
    .filter(order => order.status !== "Cancelled")
    .reduce((sum, order) => sum + Number(order.total || 0), 0);

  const completed = orders.filter(order =>
    order.status === "Completed"
  ).length;

  const pending = orders.filter(order =>
    order.status === "Pending"
  ).length;

  const customers = users.filter(user =>
    user.role === "customer"
  ).length;

  if ($("dashboardStats")) {
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
        <span>Customers</span>
        <strong>${customers}</strong>
      </div>

      <div class="stat-card">
        <span>Order Revenue</span>
        <strong>${money(revenue)}</strong>
      </div>

      <div class="stat-card">
        <span>Completed Orders</span>
        <strong>${completed}</strong>
      </div>

      <div class="stat-card">
        <span>Pending Orders</span>
        <strong>${pending}</strong>
      </div>
    `;
  }

  const recent = orders.slice(0, 5);

  if ($("recentOrders")) {
    $("recentOrders").innerHTML = recent.length
      ? recent.map(order => `
          <div class="receipt-line">
            <span>
              <strong>${escapeHTML(order.receiptNo)}</strong>
              <br>
              <small>${escapeHTML(order.customerName)}</small>
            </span>

            <span>
              ${money(order.total)}
              <br>
              <small>${escapeHTML(order.status)}</small>
            </span>
          </div>
        `).join("")
      : emptyState("No orders yet", "New orders will appear here.");
  }
}

/* -------------------- ADMIN PRODUCTS -------------------- */

function renderAdminProducts() {
  const container = $("adminProducts");
  if (!container) return;

  const search = $("adminProductSearch")?.value.trim().toLowerCase() || "";

  const filtered = products.filter(product =>
    product.name.toLowerCase().includes(search) ||
    product.category.toLowerCase().includes(search)
  );

  if (!filtered.length) {
    container.innerHTML = emptyState(
      "No products found",
      "Add a product or change your search."
    );
    return;
  }

  container.innerHTML = filtered.map(product => `
    <article class="product-card">
      ${getImageMarkup(product)}

      <div class="product-info">
        <h3>${escapeHTML(product.name)}</h3>
        <p>${escapeHTML(product.category)}</p>
        <p>${escapeHTML(product.description || "")}</p>

        <div class="price">${money(product.price)}</div>
        <div class="stock">Stock: ${product.stock}</div>

        <div class="product-actions">
          <button
            class="btn outline"
            type="button"
            onclick="editProduct('${escapeHTML(product.id)}')"
          >
            Edit
          </button>

          <button
            class="btn danger"
            type="button"
            onclick="deleteProduct('${escapeHTML(product.id)}')"
          >
            Delete
          </button>
        </div>
      </div>
    </article>
  `).join("");
}

on("adminProductSearch", "input", renderAdminProducts);

function openProductModal() {
  if (!isAdmin()) return;

  $("productForm")?.reset();

  if ($("productId")) $("productId").value = "";
  if ($("productModalTitle")) {
    $("productModalTitle").textContent = "Add Product";
  }

  if ($("productImage")) $("productImage").value = "💐";
  if ($("productImageFile")) $("productImageFile").value = "";

  selectedImage = "";

  if ($("productImagePreview")) {
    $("productImagePreview").textContent = "💐";
  }

  $("productModal")?.classList.remove("hidden");
}

function editProduct(productId) {
  if (!isAdmin()) return;

  const product = findProduct(productId);

  if (!product) {
    return showToast("Product not found. Refresh the product list.");
  }

  if (!$("productForm")) {
    return showToast("Product form is missing from your HTML.");
  }

  $("productId").value = product.id;
  $("productName").value = product.name;
  $("productCategory").value = product.category;
  $("productDescription").value = product.description || "";
  $("productPrice").value = product.price;
  $("productStock").value = product.stock;
  $("productImage").value = product.image || "💐";
  $("productImageFile").value = "";

  selectedImage = product.image || "💐";

  $("productModalTitle").textContent = "Edit Product";

  showProductPreview(selectedImage);

  $("productModal")?.classList.remove("hidden");
}

function showProductPreview(value) {
  const preview = $("productImagePreview");
  if (!preview) return;

  if (/^(https?:\/\/|data:image\/)/i.test(value || "")) {
    preview.innerHTML = `
      <img
        src="${escapeHTML(value)}"
        alt="Product preview"
        onerror="this.parentElement.textContent='Image unavailable'"
      >
    `;
  } else {
    preview.textContent = value || "💐";
  }
}

on("productImage", "input", () => {
  selectedImage = $("productImage").value.trim() || "💐";
  showProductPreview(selectedImage);
});

on("productImageFile", "change", event => {
  const file = event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    showToast("Please select an image file.");
    event.target.value = "";
    return;
  }

  if (file.size > 1.5 * 1024 * 1024) {
    showToast("Image must be 1.5 MB or smaller.");
    event.target.value = "";
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    selectedImage = reader.result;
    showProductPreview(selectedImage);
  };

  reader.onerror = () => {
    showToast("Could not read the selected image.");
  };

  reader.readAsDataURL(file);
});

/* -------------------- ADD / EDIT PRODUCT -------------------- */

on("productForm", "submit", event => {
  event.preventDefault();

  if (!isAdmin()) return;

  const id = $("productId").value;
  const name = $("productName").value.trim();
  const category = $("productCategory").value.trim();
  const description = $("productDescription").value.trim();
  const price = Number($("productPrice").value);
  const stock = Number($("productStock").value);

  const image =
    selectedImage ||
    $("productImage").value.trim() ||
    "💐";

  if (!name || !category) {
    return showToast("Enter the product name and category.");
  }

  if (!Number.isFinite(price) || price <= 0) {
    return showToast("Enter a valid product price.");
  }

  if (!Number.isInteger(stock) || stock < 0) {
    return showToast("Stock must be 0 or a positive whole number.");
  }

  const oldProducts = JSON.stringify(products);
  const oldCarts = JSON.stringify(carts);

  if (id) {
    const product = findProduct(id);

    if (!product) {
      return showToast("Product not found.");
    }

    product.name = name;
    product.category = category;
    product.description = description;
    product.price = price;
    product.stock = stock;
    product.image = image;

    // Remove cart quantities that exceed the new stock.
    Object.keys(carts).forEach(userId => {
      carts[userId] = (carts[userId] || []).map(item => {
        if (String(item.productId) !== String(id)) return item;

        return {
          ...item,
          quantity: Math.min(Number(item.quantity), stock)
        };
      }).filter(item => item.quantity > 0);
    });

  } else {
    products.push({
      id: makeId("PRD"),
      name,
      category,
      description,
      price,
      stock,
      image
    });
  }

  const saved =
    save(STORAGE.products, products) &&
    save(STORAGE.cart, carts);

  if (!saved) {
    products = JSON.parse(oldProducts);
    carts = JSON.parse(oldCarts);
    persistAll();
    return;
  }

  closeModal("productModal");

  refreshProductViews();

  showToast(
    id
      ? "Flower updated successfully!"
      : "New flower added successfully!"
  );
});

/* -------------------- DELETE PRODUCT -------------------- */

function deleteProduct(productId) {
  if (!isAdmin()) return;

  const product = findProduct(productId);

  if (!product) {
    return showToast("Product not found.");
  }

  if (!confirm(`Are you sure you want to delete "${product.name}"?`)) {
    return;
  }

  const oldProducts = JSON.stringify(products);
  const oldCarts = JSON.stringify(carts);

  products = products.filter(item =>
    String(item.id) !== String(productId)
  );

  // Remove the deleted flower from every customer's cart.
  Object.keys(carts).forEach(userId => {
    carts[userId] = (carts[userId] || []).filter(item =>
      String(item.productId) !== String(productId)
    );
  });

  selectedCartProducts.delete(String(productId));

  const saved =
    save(STORAGE.products, products) &&
    save(STORAGE.cart, carts);

  if (!saved) {
    products = JSON.parse(oldProducts);
    carts = JSON.parse(oldCarts);
    persistAll();
    return;
  }

  refreshProductViews();

  showToast(`${product.name} deleted successfully!`);
}

/* -------------------- REFRESH PRODUCT VIEWS -------------------- */

function refreshProductViews() {
  renderAdminProducts();
  renderInventory();
  renderDashboard();
  renderShop();
  renderCart();
  updateCartCount();
}

/* -------------------- ADMIN INVENTORY -------------------- */

function renderInventory() {
  const container = $("inventoryList");
  if (!container) return;

  if (!products.length) {
    container.innerHTML = emptyState(
      "No inventory",
      "Add products to start managing stock."
    );
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
            <th>Action</th>
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
                <span class="badge ${
                  product.stock === 0
                    ? "red"
                    : product.stock <= 5
                      ? ""
                      : "green"
                }">
                  ${
                    product.stock === 0
                      ? "Out of Stock"
                      : product.stock <= 5
                        ? "Low Stock"
                        : "Available"
                  }
                </span>
              </td>

              <td>
                <button
                  class="btn outline small"
                  onclick="editProduct('${escapeHTML(product.id)}')"
                >
                  Edit
                </button>

                <button
                  class="btn danger small"
                  onclick="deleteProduct('${escapeHTML(product.id)}')"
                >
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

/* -------------------- ADMIN ORDERS -------------------- */

function renderAdminOrders() {
  const container = $("adminOrders");
  if (!container) return;

  if (!orders.length) {
    container.innerHTML = emptyState(
      "No customer orders",
      "Orders placed by customers will appear here."
    );
    return;
  }

  container.innerHTML = orders.map(order => `
    <div class="panel" style="margin-bottom:15px">
      <div class="section-heading">
        <div>
          <h3>${escapeHTML(order.receiptNo)}</h3>
          <p class="muted">${formatDate(order.createdAt)}</p>
        </div>

        <strong>${money(order.total)}</strong>
      </div>

      <p>
        <strong>Customer:</strong>
        ${escapeHTML(order.customerName)}
      </p>

      <p>
        <strong>Contact:</strong>
        ${escapeHTML(order.phone)}
      </p>

      <p>
        <strong>Address:</strong>
        ${escapeHTML(order.address)}
      </p>

      <p>
        <strong>Payment:</strong>
        COD · ${escapeHTML(order.paymentStatus || "Pending")}
      </p>

      <h4>Items</h4>

      ${order.items.map(item => `
        <div class="receipt-line">
          <span>${escapeHTML(item.name)} × ${item.quantity}</span>
          <strong>${money(item.subtotal)}</strong>
        </div>
      `).join("")}

      <div class="receipt-total">${money(order.total)}</div>

      <label for="status-${escapeHTML(order.id)}">Order Status</label>

      <select
        id="status-${escapeHTML(order.id)}"
        onchange="updateOrderStatus('${escapeHTML(order.id)}',this.value)"
        ${order.status === "Cancelled" ? "disabled" : ""}
      >
        ${[
          "Pending",
          "Processing",
          "Ready for Delivery",
          "Completed",
          "Cancelled"
        ].map(status => `
          <option
            value="${status}"
            ${order.status === status ? "selected" : ""}
          >
            ${status}
          </option>
        `).join("")}
      </select>

      <button
        class="btn outline small"
        onclick="viewReceipt('${escapeHTML(order.id)}')"
      >
        View Receipt
      </button>
    </div>
  `).join("");
}

function updateOrderStatus(orderId, newStatus) {
  if (!isAdmin()) return;

  const allowed = [
    "Pending",
    "Processing",
    "Ready for Delivery",
    "Completed",
    "Cancelled"
  ];

  if (!allowed.includes(newStatus)) return;

  const order = orders.find(item =>
    String(item.id) === String(orderId)
  );

  if (!order) return;

  if (order.status === "Cancelled") {
    showToast("A cancelled order cannot be reopened.");
    renderAdminOrders();
    return;
  }

  if (order.status === "Completed" && newStatus === "Cancelled") {
    showToast("A completed order cannot be cancelled here.");
    renderAdminOrders();
    return;
  }

  const oldOrders = JSON.stringify(orders);
  const oldProducts = JSON.stringify(products);

  if (newStatus === "Cancelled") {
    const restore = confirm(
      "Cancel this order and return its items to inventory?"
    );

    if (!restore) {
      renderAdminOrders();
      return;
    }

    order.items.forEach(item => {
      const product = findProduct(item.productId);

      if (product) {
        product.stock += Number(item.quantity);
      }
    });

    order.paymentStatus = "Cancelled";
  }

  if (newStatus === "Completed") {
    order.paymentStatus = "Paid";
  }

  order.status = newStatus;
  order.updatedAt = new Date().toISOString();

  const saved =
    save(STORAGE.orders, orders) &&
    save(STORAGE.products, products);

  if (!saved) {
    orders = JSON.parse(oldOrders);
    products = JSON.parse(oldProducts);
    persistAll();

    renderAdminOrders();

    return showToast("Could not update the order. Please try again.");
  }

  renderAdminOrders();
  renderInventory();
  renderDashboard();

  showToast("Order status updated.");
}

/* -------------------- ADMIN CUSTOMER MANAGEMENT -------------------- */

function renderAdminUsers() {
  const container = $("adminUsers");
  if (!container) return;

  const customers = users.filter(user =>
    user.role === "customer"
  );

  if (!customers.length) {
    container.innerHTML = emptyState(
      "No customer accounts",
      "Registered customers will appear here."
    );
    return;
  }

  container.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Customer</th>
            <th>Username</th>
            <th>Contact</th>
            <th>Account</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          ${customers.map(user => `
            <tr>
              <td>${escapeHTML(user.name)}</td>
              <td>${escapeHTML(user.username)}</td>
              <td>${escapeHTML(user.phone || "Not provided")}</td>

              <td>
                <span class="badge ${
                  user.active === false ? "red" : "green"
                }">
                  ${user.active === false ? "Disabled" : "Active"}
                </span>
              </td>

              <td>
                <button
                  class="btn outline small"
                  onclick="toggleCustomer('${escapeHTML(user.id)}')"
                >
                  ${user.active === false ? "Enable" : "Disable"}
                </button>

                <button
                  class="btn danger small"
                  onclick="deleteCustomer('${escapeHTML(user.id)}')"
                >
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

function toggleCustomer(userId) {
  if (!isAdmin()) return;

  const user = findUser(userId);
  if (!user || user.role !== "customer") return;

  const oldActive = user.active;
  user.active = user.active === false;

  if (!save(STORAGE.users, users)) {
    user.active = oldActive;
    return;
  }

  renderAdminUsers();

  showToast(
    user.active
      ? "Customer account enabled."
      : "Customer account disabled."
  );
}

function deleteCustomer(userId) {
  if (!isAdmin()) return;

  const user = findUser(userId);
  if (!user || user.role !== "customer") return;

  if (!confirm(`Delete customer account "${user.username}"?`)) {
    return;
  }

  const oldUsers = JSON.stringify(users);
  const oldCarts = JSON.stringify(carts);

  users = users.filter(item => item.id !== userId);
  delete carts[userId];

  const saved =
    save(STORAGE.users, users) &&
    save(STORAGE.cart, carts);

  if (!saved) {
    users = JSON.parse(oldUsers);
    carts = JSON.parse(oldCarts);
    persistAll();
    return;
  }

  renderAdminUsers();
  renderDashboard();

  showToast("Customer account deleted.");
}

/* -------------------- ADMIN SETTINGS -------------------- */

function renderSettings() {
  if (!currentUser || !isAdmin()) return;

  if ($("settingsUsername")) {
    $("settingsUsername").value = currentUser.username;
  }

  if ($("settingsPassword")) $("settingsPassword").value = "";
  if ($("settingsConfirm")) $("settingsConfirm").value = "";

  setMessage("settingsMessage", "");
}

on("settingsForm", "submit", event => {
  event.preventDefault();

  if (!isAdmin()) return;

  const username = $("settingsUsername").value.trim();
  const password = $("settingsPassword").value;
  const confirmPassword = $("settingsConfirm").value;

  if (username.length < 3) {
    return setMessage("settingsMessage", "Username must have at least 3 characters.");
  }

  if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
    return setMessage("settingsMessage", "Username contains invalid characters.");
  }

  const duplicate = users.some(user =>
    user.id !== currentUser.id &&
    user.username.toLowerCase() === username.toLowerCase()
  );

  if (duplicate) {
    return setMessage("settingsMessage", "That username is already taken.");
  }

  if (password || confirmPassword) {
    if (password.length < 6) {
      return setMessage("settingsMessage", "Password must have at least 6 characters.");
    }

    if (password !== confirmPassword) {
      return setMessage("settingsMessage", "New passwords do not match.");
    }
  }

  const oldUser = { ...currentUser };

  if (password) currentUser.password = password;
  currentUser.username = username;

  if (!save(STORAGE.users, users)) {
    Object.assign(currentUser, oldUser);
    return;
  }

  if ($("headerUser")) {
    $("headerUser").textContent =
      `${currentUser.name} · ${currentUser.role}`;
  }

  setMessage("settingsMessage", "Admin settings updated successfully.", true);

  $("settingsPassword").value = "";
  $("settingsConfirm").value = "";

  showToast("Admin settings saved.");
});

/* -------------------- MODALS -------------------- */

function closeModal(modalId) {
  const modal = $(modalId);
  if (modal) modal.classList.add("hidden");

  if (modalId === "checkoutModal") {
    pendingPurchase = null;
    checkoutSource = null;
  }
}

function closeAllModals() {
  document.querySelectorAll(".modal").forEach(modal => {
    modal.classList.add("hidden");
  });

  pendingPurchase = null;
  checkoutSource = null;
}

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

/* -------------------- START APPLICATION -------------------- */

function startApplication() {
  enhancePasswordFields();
  showLogin();
  restoreSession();
  updateCartCount();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startApplication);
} else {
  startApplication();
}
