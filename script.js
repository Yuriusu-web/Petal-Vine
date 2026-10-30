
"use strict";

/* PETAL & VINE - FLOWER SHOP MANAGEMENT SYSTEM */

const $ = (id) => document.getElementById(id);

const KEYS = {
  users: "petal_vine_users",
  products: "petal_vine_products",
  orders: "petal_vine_orders"
};

const DEFAULT_PRODUCTS = [
  { id: "p1", name: "Red Rose Bouquet", category: "Roses", emoji: "🌹", price: 850, stock: 15 },
  { id: "p2", name: "Pink Tulip Bouquet", category: "Tulips", emoji: "🌷", price: 950, stock: 12 },
  { id: "p3", name: "Sunflower Bundle", category: "Sunflowers", emoji: "🌻", price: 650, stock: 20 },
  { id: "p4", name: "Mixed Flower Bouquet", category: "Bouquet", emoji: "💐", price: 1200, stock: 10 },
  { id: "p5", name: "White Lily Arrangement", category: "Other", emoji: "百", price: 1100, stock: 8 },
  { id: "p6", name: "Potted Plant", category: "Plants", emoji: "🪴", price: 450, stock: 14 }
];

let currentUser = null;
let cart = [];
let toastTimer = null;

/* STORAGE HELPERS */

function readData(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    console.error("Storage read error:", error);
    return fallback;
  }
}

function saveData(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error("Storage save error:", error);
    showToast("Could not save data. Check your browser storage.");
    return false;
  }
}

function getUsers() {
  return readData(KEYS.users, []);
}

function getProducts() {
  return readData(KEYS.products, DEFAULT_PRODUCTS);
}

function getOrders() {
  return readData(KEYS.orders, []);
}

function money(value) {
  return Number(value || 0).toLocaleString("en-PH", {
    style: "currency",
    currency: "PHP"
  });
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

function makeId(prefix) {
  return prefix + Date.now().toString(36) +
    Math.random().toString(36).slice(2, 7);
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

/* INITIALIZE STORAGE */

function initializeStorage() {
  if (localStorage.getItem(KEYS.products) === null) {
    saveData(KEYS.products, DEFAULT_PRODUCTS);
  }

  if (localStorage.getItem(KEYS.users) === null) {
    saveData(KEYS.users, []);
  }

  if (localStorage.getItem(KEYS.orders) === null) {
    saveData(KEYS.orders, []);
  }
}

/* AUTHENTICATION */

function showAuthView(view) {
  $("authChoices").classList.toggle("hidden", view !== "choices");
  $("loginForm").classList.toggle("hidden", view !== "login");
  $("registerForm").classList.toggle("hidden", view !== "register");

  $("loginError").textContent = "";
  $("registerError").textContent = "";
}

function login(username, password) {
  const cleanUsername = username.trim().toLowerCase();

  // Demo administrator account
  if (cleanUsername === "admin" && password === "Admin123") {
    currentUser = {
      username: "admin",
      fullName: "Administrator",
      role: "admin"
    };
    startApp();
    return;
  }

  const user = getUsers().find((item) =>
    item.username.toLowerCase() === cleanUsername &&
    item.password === password
  );

  if (!user) {
    $("loginError").textContent = "Incorrect username or password.";
    return;
  }

  currentUser = {
    username: user.username,
    fullName: user.fullName,
    role: "customer"
  };

  startApp();
}

function registerCustomer() {
  const fullName = $("regFullName").value.trim();
  const username = $("regUsername").value.trim();
  const password = $("regPassword").value;
  const confirm = $("regConfirm").value;

  if (!fullName || !username || !password || !confirm) {
    $("registerError").textContent = "Please complete all fields.";
    return;
  }

  if (username.length < 3) {
    $("registerError").textContent = "Username must be at least 3 characters.";
    return;
  }

  if (password.length < 6) {
    $("registerError").textContent = "Password must be at least 6 characters.";
    return;
  }

  if (password !== confirm) {
    $("registerError").textContent = "Passwords do not match.";
    return;
  }

  const users = getUsers();

  if (users.some((user) =>
    user.username.toLowerCase() === username.toLowerCase()
  )) {
    $("registerError").textContent = "That username is already taken.";
    return;
  }

  users.push({
    id: makeId("u"),
    fullName,
    username,
    password,
    role: "customer",
    createdAt: new Date().toISOString()
  });

  if (!saveData(KEYS.users, users)) return;

  $("registerForm").reset();
  showAuthView("login");
  $("loginUsername").value = username;
  showToast("Account created! You can now log in.");
}

function startApp() {
  $("authScreen").classList.add("hidden");
  $("app").classList.remove("hidden");

  $("welcomeUser").textContent =
    `Hello, ${currentUser.fullName}`;

  $("dashboardMessage").textContent =
    currentUser.role === "admin"
      ? "Welcome to your flower shop management dashboard."
      : "Welcome! Find beautiful flowers for your special moments.";

  document.querySelectorAll(".admin-only").forEach((element) => {
    element.classList.toggle("hidden", currentUser.role !== "admin");
  });

  $("checkoutName").value =
    currentUser.role === "customer" ? currentUser.fullName : "";

  $("currentYear").textContent = new Date().getFullYear();

  cart = [];
  updateCart();
  refreshAll();
  showPage("dashboard");
}

function logout() {
  currentUser = null;
  cart = [];

  $("app").classList.add("hidden");
  $("authScreen").classList.remove("hidden");

  $("loginForm").reset();
  $("registerForm").reset();

  showAuthView("choices");
}

/* NAVIGATION */

function showPage(pageName) {
  const page = $(pageName);
  if (!page) return;

  if (
    ["inventory", "customers", "reports"].includes(pageName) &&
    currentUser.role !== "admin"
  ) {
    showToast("Administrator access required.");
    return;
  }

  document.querySelectorAll(".page").forEach((section) => {
    section.classList.add("hidden");
  });

  page.classList.remove("hidden");

  document.querySelectorAll(".nav-btn").forEach((button) => {
    button.classList.toggle(
      "active",
      button.dataset.page === pageName
    );
  });

  if (pageName === "dashboard") renderDashboard();
  if (pageName === "inventory") renderInventory();
  if (pageName === "shop") renderShop();
  if (pageName === "cart") renderCart();
  if (pageName === "orders") renderOrders();
  if (pageName === "customers") renderCustomers();
  if (pageName === "reports") renderReports();
}

/* PRODUCT DISPLAY */

function productCard(product, mode) {
  const stock = Number(product.stock);
  const outOfStock = stock <= 0;

  let actions = "";

  if (mode === "inventory") {
    actions = `
      <button class="secondary-btn" data-action="edit-product"
        data-id="${escapeHTML(product.id)}">Edit</button>
      <button class="danger-btn" data-action="delete-product"
        data-id="${escapeHTML(product.id)}">Delete</button>
    `;
  } else {
    actions = `
      <button class="primary-btn" data-action="add-cart"
        data-id="${escapeHTML(product.id)}"
        ${outOfStock ? "disabled" : ""}>
        ${outOfStock ? "Out of Stock" : "Add to Cart"}
      </button>
    `;
  }

  return `
    <article class="product-card">
      <div class="product-emoji">${escapeHTML(product.emoji || "💐")}</div>
      <div class="product-info">
        <h3>${escapeHTML(product.name)}</h3>
        <p class="product-category">${escapeHTML(product.category)}</p>
        <p class="product-price">${money(product.price)}</p>
        <p class="stock-label">
          ${outOfStock ? "Out of stock" : `${stock} available`}
        </p>
        <div class="product-actions">${actions}</div>
      </div>
    </article>
  `;
}

function renderDashboard() {
  const products = getProducts();
  const orders = getOrders();
  const users = getUsers();

  $("dashboardProducts").innerHTML = products.length
    ? products.slice(0, 4).map((product) =>
        productCard(product, "shop")
      ).join("")
    : '<p class="empty-state">No products available yet.</p>';

  if (currentUser.role === "admin") {
    $("statProducts").textContent = products.length;
    $("statOrders").textContent = orders.length;
    $("statCustomers").textContent = users.length;

    const revenue = orders
      .filter((order) => order.status === "Completed")
      .reduce((sum, order) => sum + Number(order.total), 0);

    $("statRevenue").textContent = money(revenue);
  }
}

function renderInventory() {
  if (currentUser.role !== "admin") return;

  const search = $("inventorySearch").value.toLowerCase();
  const products = getProducts().filter((product) =>
    `${product.name} ${product.category}`.toLowerCase().includes(search)
  );

  $("inventoryProducts").innerHTML = products.length
    ? products.map((product) =>
        productCard(product, "inventory")
      ).join("")
    : '<p class="empty-state">No matching products found.</p>';
}

function renderShop() {
  const search = $("shopSearch").value.toLowerCase();

  const products = getProducts().filter((product) =>
    `${product.name} ${product.category}`.toLowerCase().includes(search)
  );

  $("shopProducts").innerHTML = products.length
    ? products.map((product) => productCard(product, "shop")).join("")
    : '<p class="empty-state">No flowers found.</p>';
}

function refreshAll() {
  renderDashboard();
  renderInventory();
  renderShop();
  renderOrders();
  renderCustomers();
  renderReports();
}

/* INVENTORY MANAGEMENT */

function openProductEditor(product = null) {
  $("productEditor").classList.remove("hidden");
  $("editorTitle").textContent = product ? "Edit Product" : "Add New Product";

  $("productId").value = product ? product.id : "";
  $("productName").value = product ? product.name : "";
  $("productCategory").value = product ? product.category : "Bouquet";
  $("productEmoji").value = product ? product.emoji : "💐";
  $("productPrice").value = product ? product.price : "";
  $("productStock").value = product ? product.stock : "";

  $("productEditor").scrollIntoView({ behavior: "smooth" });
}

function closeProductEditor() {
  $("productEditor").classList.add("hidden");
  $("productForm").reset();
  $("productId").value = "";
}

function saveProduct(event) {
  event.preventDefault();

  const id = $("productId").value;
  const name = $("productName").value.trim();
  const category = $("productCategory").value;
  const emoji = $("productEmoji").value.trim() || "💐";
  const price = Number($("productPrice").value);
  const stock = Number($("productStock").value);

  if (!name || !Number.isFinite(price) || price < 0 ||
      !Number.isInteger(stock) || stock < 0) {
    showToast("Please enter valid product details.");
    return;
  }

  const products = getProducts();

  if (id) {
    const index = products.findIndex((item) => item.id === id);
    if (index === -1) {
      showToast("Product not found.");
      return;
    }

    products[index] = {
      ...products[index],
      name, category, emoji, price, stock
    };
  } else {
    products.push({
      id: makeId("p"),
      name, category, emoji, price, stock
    });
  }

  if (!saveData(KEYS.products, products)) return;

  closeProductEditor();
  refreshAll();
  showToast(id ? "Product updated!" : "Product added!");
}

function editProduct(id) {
  const product = getProducts().find((item) => item.id === id);
  if (product) openProductEditor(product);
}

function deleteProduct(id) {
  const product = getProducts().find((item) => item.id === id);
  if (!product) return;

  if (!confirm(`Delete "${product.name}"?`)) return;

  const products = getProducts().filter((item) => item.id !== id);

  if (!saveData(KEYS.products, products)) return;

  cart = cart.filter((item) => item.productId !== id);
  updateCart();
  refreshAll();
  showToast("Product deleted.");
}

/* SHOPPING CART */

function addToCart(id) {
  const product = getProducts().find((item) => item.id === id);
  if (!product) return;

  const existing = cart.find((item) => item.productId === id);
  const quantity = existing ? existing.quantity : 0;

  if (quantity >= Number(product.stock)) {
    showToast("You cannot add more than the available stock.");
    return;
  }

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      productId: id,
      quantity: 1
    });
  }

  updateCart();
  showToast("Added to cart!");
}

function changeCartQuantity(id, change) {
  const item = cart.find((entry) => entry.productId === id);
  const product = getProducts().find((entry) => entry.id === id);

  if (!item || !product) return;

  const nextQuantity = item.quantity + change;

  if (nextQuantity <= 0) {
    cart = cart.filter((entry) => entry.productId !== id);
  } else if (nextQuantity <= Number(product.stock)) {
    item.quantity = nextQuantity;
  } else {
    showToast("Not enough stock available.");
  }

  updateCart();
}

function updateCart() {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  $("cartCount").textContent = count;
  renderCart();
}

function renderCart() {
  const products = getProducts();
  let total = 0;

  const rows = cart.map((item) => {
    const product = products.find((entry) => entry.id === item.productId);
    if (!product) return "";

    const subtotal = Number(product.price) * item.quantity;
    total += subtotal;

    return `
      <div class="cart-row">
        <div class="cart-row-info">
          <strong>${escapeHTML(product.emoji)} ${escapeHTML(product.name)}</strong>
          <p>${money(product.price)} each</p>
          <p>Subtotal: ${money(subtotal)}</p>
        </div>
        <div class="quantity-controls">
          <button data-action="cart-minus"
            data-id="${escapeHTML(product.id)}">−</button>
          <strong>${item.quantity}</strong>
          <button data-action="cart-plus"
            data-id="${escapeHTML(product.id)}">+</button>
          <button class="danger-btn" data-action="remove-cart"
            data-id="${escapeHTML(product.id)}">Remove</button>
        </div>
      </div>
    `;
  }).join("");

  $("cartItems").innerHTML = rows ||
    '<p class="empty-state">Your cart is empty. Visit the Shop to choose flowers.</p>';

  $("cartTotal").textContent = money(total);
}

/* CHECKOUT */

function checkout(event) {
  event.preventDefault();

  if (cart.length === 0) {
    showToast("Your cart is empty.");
    return;
  }

  const customerName = $("checkoutName").value.trim();
  const phone = $("checkoutPhone").value.trim();
  const address = $("checkoutAddress").value.trim();
  const payment = $("paymentMethod").value;

  if (!customerName || !phone || !address) {
    showToast("Please complete your checkout details.");
    return;
  }

  const products = getProducts();
  const orderItems = [];
  let total = 0;

  for (const cartItem of cart) {
    const product = products.find((item) =>
      item.id === cartItem.productId
    );

    if (!product || Number(product.stock) < cartItem.quantity) {
      showToast("A product has insufficient stock. Please review your cart.");
      refreshAll();
      return;
    }

    const subtotal = Number(product.price) * cartItem.quantity;

    orderItems.push({
      productId: product.id,
      name: product.name,
      emoji: product.emoji,
      price: Number(product.price),
      quantity: cartItem.quantity,
      subtotal
    });

    total += subtotal;
  }

  const order = {
    id: makeId("order"),
    customerUsername: currentUser.username,
    customerName,
    phone,
    address,
    payment,
    items: orderItems,
    total,
    status: "Pending",
    createdAt: new Date().toISOString()
  };

  // Update stock only after validating every cart item.
  const updatedProducts = products.map((product) => {
    const cartItem = cart.find((item) =>
      item.productId === product.id
    );

    return cartItem
      ? { ...product, stock: Number(product.stock) - cartItem.quantity }
      : product;
  });

  const orders = getOrders();
  orders.push(order);

  // Save orders first; if stock saving fails, remove the new order.
  if (!saveData(KEYS.orders, orders)) return;

  if (!saveData(KEYS.products, updatedProducts)) {
    saveData(KEYS.orders, orders.filter((item) => item.id !== order.id));
    return;
  }

  cart = [];
  $("checkoutForm").reset();

  if (currentUser.role === "customer") {
    $("checkoutName").value = currentUser.fullName;
  }

  updateCart();
  refreshAll();
  showPage("orders");
  showToast("Your order has been placed successfully!");
}

/* ORDER MANAGEMENT */

function renderOrders() {
  const orders = getOrders();

  const visibleOrders = currentUser.role === "admin"
    ? orders
    : orders.filter((order) =>
        order.customerUsername === currentUser.username
      );

  $("ordersTitle").textContent =
    currentUser.role === "admin" ? "All Customer Orders" : "My Orders";

  if (!visibleOrders.length) {
    $("ordersList").innerHTML =
      '<p class="empty-state">No orders yet.</p>';
    return;
  }

  $("ordersList").innerHTML = [...visibleOrders]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((order) => {
      const date = new Date(order.createdAt).toLocaleString();

      const items = order.items.map((item) =>
        `<li>${escapeHTML(item.emoji)} ${escapeHTML(item.name)} × ${item.quantity} — ${money(item.subtotal)}</li>`
      ).join("");

      let actions = "";

      if (currentUser.role === "admin") {
        actions = `
          <div class="order-actions">
            ${order.status === "Pending" ? `
              <button class="success-btn" data-action="complete-order"
                data-id="${escapeHTML(order.id)}">Mark Completed</button>
              <button class="danger-btn" data-action="cancel-order"
                data-id="${escapeHTML(order.id)}">Cancel Order</button>
            ` : ""}
          </div>
        `;
      } else if (order.status === "Pending") {
        actions = `
          <div class="order-actions">
            <button class="danger-btn" data-action="cancel-order"
              data-id="${escapeHTML(order.id)}">Cancel Order</button>
          </div>
        `;
      }

      return `
        <article class="order-card">
          <h3>Order #${escapeHTML(order.id)}</h3>
          <span class="status">${escapeHTML(order.status)}</span>
          <p class="order-meta">Date: ${escapeHTML(date)}</p>
          <p class="order-meta">Customer: ${escapeHTML(order.customerName)}</p>
          <p class="order-meta">Phone: ${escapeHTML(order.phone)}</p>
          <p class="order-meta">Address: ${escapeHTML(order.address)}</p>
          <p class="order-meta">Payment: ${escapeHTML(order.payment)}</p>
          <ul>${items}</ul>
          <p><strong>Total: ${money(order.total)}</strong></p>
          ${actions}
        </article>
      `;
    }).join("");
}

function updateOrderStatus(id, newStatus) {
  const orders = getOrders();
  const order = orders.find((item) => item.id === id);

  if (!order || order.status !== "Pending") return;

  if (newStatus === "Cancelled") {
    if (!confirm("Cancel this order and return its items to inventory?")) {
      return;
    }

    const products = getProducts();

    const updatedProducts = products.map((product) => {
      const orderedItem = order.items.find((item) =>
        item.productId === product.id
      );

      return orderedItem
        ? { ...product, stock: Number(product.stock) + orderedItem.quantity }
        : product;
    });

    if (!saveData(KEYS.products, updatedProducts)) return;
  }

  order.status = newStatus;

  if (!saveData(KEYS.orders, orders)) {
    showToast("Could not update order status.");
    return;
  }

  refreshAll();
  showToast(`Order ${newStatus.toLowerCase()}.`);
}

/* CUSTOMERS AND REPORTS */

function renderCustomers() {
  if (currentUser.role !== "admin") return;

  const users = getUsers();

  $("customersList").innerHTML = users.length
    ? users.map((user) => `
        <div class="customer-row">
          <strong>${escapeHTML(user.fullName)}</strong>
          <p class="order-meta">Username: ${escapeHTML(user.username)}</p>
          <p class="order-meta">Registered: ${
            escapeHTML(new Date(user.createdAt).toLocaleDateString())
          }</p>
        </div>
      `).join("")
    : '<p class="empty-state">No registered customers yet.</p>';
}

function renderReports() {
  if (currentUser.role !== "admin") return;

  const orders = getOrders();
  const completed = orders.filter((order) =>
    order.status === "Completed"
  );
  const pending = orders.filter((order) =>
    order.status === "Pending"
  );

  const revenue = completed.reduce((sum, order) =>
    sum + Number(order.total), 0
  );

  $("reportRevenue").textContent = money(revenue);
  $("reportCompleted").textContent = completed.length;
  $("reportPending").textContent = pending.length;
}

/* EVENT LISTENERS */

function setupEvents() {
  $("showLogin").addEventListener("click", () => showAuthView("login"));
  $("showRegister").addEventListener("click", () => showAuthView("register"));
  $("backFromLogin").addEventListener("click", () => showAuthView("choices"));
  $("backFromRegister").addEventListener("click", () => showAuthView("choices"));

  $("loginForm").addEventListener("submit", (event) => {
    event.preventDefault();
    login($("loginUsername").value, $("loginPassword").value);
  });

  $("registerForm").addEventListener("submit", (event) => {
    event.preventDefault();
    registerCustomer();
  });

  $("logoutBtn").addEventListener("click", logout);

  $("navigation").addEventListener("click", (event) => {
    const button = event.target.closest("[data-page]");
    if (button) showPage(button.dataset.page);
  });

  $("addProductBtn").addEventListener("click", () => openProductEditor());
  $("cancelProductBtn").addEventListener("click", closeProductEditor);
  $("productForm").addEventListener("submit", saveProduct);

  $("inventorySearch").addEventListener("input", renderInventory);
  $("shopSearch").addEventListener("input", renderShop);

  $("checkoutForm").addEventListener("submit", checkout);

  // All product, cart, and order actions are handled here.
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    const action = button.dataset.action;
    const id = button.dataset.id;

    switch (action) {
      case "edit-product":
        editProduct(id);
        break;

      case "delete-product":
        deleteProduct(id);
        break;

      case "add-cart":
        addToCart(id);
        break;

      case "cart-minus":
        changeCartQuantity(id, -1);
        break;

      case "cart-plus":
        changeCartQuantity(id, 1);
        break;

      case "remove-cart":
        cart = cart.filter((item) => item.productId !== id);
        updateCart();
        break;

      case "complete-order":
        updateOrderStatus(id, "Completed");
        break;

      case "cancel-order":
        updateOrderStatus(id, "Cancelled");
        break;
    }
  });
}

/* START THE SYSTEM */

document.addEventListener("DOMContentLoaded", () => {
  initializeStorage();
  setupEvents();
  $("currentYear").textContent = new Date().getFullYear();
  showAuthView("choices");
});
