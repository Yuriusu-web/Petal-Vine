"use strict";

/* PETAL & VINE FLOWER SHOP MANAGEMENT SYSTEM */

const $` = id => document.getElementById(id);

const DB = {
users: "petal_vine_users",
products: "petal_vine_products",
orders: "petal_vine_orders"
};

const ADMIN = {
username: "admin",
password: "Admin123"
};

const money = value =>
"₱" + Number(value || 0).toLocaleString("en-PH", {
minimumFractionDigits: 2,
maximumFractionDigits: 2
});

const escapeHTML = value =>
String(value ?? "").replace(/[&<>"']/g, char => ({
"&": "&",
"<": "<",
">": ">",
'"': """,
"'": "'"
})[char]);

function read(key, fallback) {
try {
const value = localStorage.getItem(key);
return value ? JSON.parse(value) : fallback;
} catch {
return fallback;
}
}

function save(key, value) {
try {
localStorage.setItem(key, JSON.stringify(value));
return true;
} catch {
alert("Unable to save data. Check your browser storage.");
return false;
}
}

let users = read(DB.users, []);
let products = read(DB.products, [
{id:1,name:"Red Rose",category:"Roses",emoji:"🌹",price:80,stock:50},
{id:2,name:"Sunflower",category:"Sunflowers",emoji:"🌻",price:120,stock:30},
{id:3,name:"Pink Tulip",category:"Tulips",emoji:"🌷",price:150,stock:25},
{id:4,name:"Mixed Flower Bouquet",category:"Bouquets",emoji:"💐",price:550,stock:15},
{id:5,name:"White Lily",category:"Lilies",emoji:"💮",price:180,stock:20},
{id:6,name:"Flower Gift Box",category:"Gifts",emoji:"🎁",price:350,stock:12},
{id:7,name:"Mini Rose Bouquet",category:"Bouquets",emoji:"🌸",price:250,stock:20},
{id:8,name:"Indoor Potted Plant",category:"Other",emoji:"🪴",price:299,stock:10}
]);

let orders = read(DB.orders, []);
let currentUser = null;
let currentRole = null;
let selectedAuth = "";
let cart = {};

let nextProductId = Math.max(0, ...products.map(p => Number(p.id) || 0)) + 1;
let nextOrderId = Math.max(1000, ...orders.map(o => Number(o.id) || 0)) + 1;

save(DB.products, products);

/* AUTHENTICATION */

function showAuth(type) {
selectedAuth = type;

$("authChoices").classList.add("hidden"); $("loginForm").classList.add("hidden");
`$("registerForm").classList.add("hidden");

if (type === "register") {
latex
("registerForm").classList.remove("hidden"); } else { 

("loginForm").classList.remove("hidden");
$`("loginTitle").textContent =
type === "admin" ? "👑 Admin Login" : "👤 Customer Login";
}
}

function backToChoices() {
$("authChoices").classList.remove("hidden"); $("loginForm").classList.add("hidden");
`$("registerForm").classList.add("hidden");

 ("registerForm").reset();

 ("registerError").textContent = "";
}

function togglePassword(id, button) {
const input = $`(id);

if (input.type === "password") {
input.type = "text";
button.textContent = "🙈";
} else {
input.type = "password";
button.textContent = "👁️";
}
}

/* CREATE ACCOUNT */

`$("registerForm").addEventListener("submit", function(e) {
e.preventDefault();

const fullName =  ("regUsername").value.trim();
const password =  ("regConfirm").value;

$`("registerError").textContent = "";

if (fullName.length < 2) {
`$("registerError").textContent = "Please enter your full name.";
return;
}

if (username.length < 3) {
$`("registerError").textContent = "Username must have at least 3 characters.";
return;
}

if (username.toLowerCase() === ADMIN.username) {
`$("registerError").textContent = "That username is reserved.";
return;
}

if (password.length < 6) {
$`("registerError").textContent = "Password must have at least 6 characters.";
return;
}

if (password !== confirm) {
`$("registerError").textContent = "Passwords do not match.";
return;
}

if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
$`("registerError").textContent = "Username already exists.";
return;
}

const newUser = {
id: Date.now(),
fullName,
username,
password,
role: "customer"
};

users.push(newUser);

if (!save(DB.users, users)) {
users.pop();
return;
}

alert("Account created successfully! You can now log in.");

`$("registerForm").reset();
backToChoices();
showAuth("customer");
});

/* LOGIN */

$`("loginForm").addEventListener("submit", function(e) {
e.preventDefault();

const username = $("loginUsername").value.trim(); const password = $("loginPassword").value;

`$("loginError").textContent = "";

if (selectedAuth === "admin") {
if (
username === ADMIN.username &&
password === ADMIN.password
) {
currentUser = {
fullName: "Administrator",
username: ADMIN.username
};

currentRole = "admin";
enterApp();
return;
}

$`("loginError").textContent = "Incorrect admin username or password.";
return;
}

const user = users.find(u =>
u.username.toLowerCase() === username.toLowerCase() &&
u.password === password
);

if (!user) {
`$("loginError").textContent = "Incorrect username or password.";
return;
}

currentUser = user;
currentRole = "customer";

enterApp();
});

/* ENTER APPLICATION */

function enterApp() {
 ("app").classList.remove("hidden");

$`("welcomeUser").textContent =
"👤 " + currentUser.fullName;

`$("checkoutName").value = currentUser.fullName || "";

buildNavigation();
renderAll();
goPage("dashboard");
}

function logout() {
currentUser = null;
currentRole = null;
cart = {};

 ("authScreen").classList.remove("hidden");

 ("registerForm").reset();

backToChoices();
}

/* NAVIGATION */

const adminPages = [
["dashboard", "🏠 Dashboard"],
["inventory", "🌸 Inventory"],
["orders", "📦 All Orders"],
["customers", "👥 Customers"],
["reports", "📊 Reports"],
["about", "ℹ️ About"]
];

const customerPages = [
["dashboard", "🏠 Home"],
["shop", "🌷 Shop Flowers"],
["cart", "🛒 My Cart"],
["orders", "📦 My Orders"],
["about", "ℹ️ About"]
];

function buildNavigation() {
const pages = currentRole === "admin" ? adminPages : customerPages;

 {id}">${label}&lt;/button>
).join("");

`$("navigation").querySelectorAll("[data-page]").forEach(button => {
button.addEventListener("click", () => goPage(button.dataset.page));
});

document.querySelectorAll(".admin-only").forEach(el => {
el.classList.toggle("hidden", currentRole !== "admin");
});

$`("dashboardMessage").textContent =
currentRole === "admin"
? "Manage products, customers, orders, and sales."
: "Find your favorite flowers and place an order.";

`$("ordersTitle").textContent =
currentRole === "admin" ? "All Customer Orders" : "My Orders";
}

function goPage(page) {
const allowed = currentRole === "admin"
? adminPages.map(p => p[0])
: customerPages.map(p => p[0]);

if (!allowed.includes(page)) return;

document.querySelectorAll(".page").forEach(section => {
section.classList.toggle("active", section.id === page);
});

document.querySelectorAll(".nav-btn").forEach(button => {
button.classList.toggle("active", button.dataset.page === page);
});

if (page === "dashboard") renderDashboard();
if (page === "inventory") renderInventory();
if (page === "shop") renderShop();
if (page === "cart") renderCart();
if (page === "orders") renderOrders();
if (page === "customers") renderCustomers();
if (page === "reports") renderReports();

window.scrollTo({top:0, behavior:"smooth"});
}

/* DASHBOARD */

function renderDashboard() {
 ("statOrders").textContent = orders.length;
$`("statCustomers").textContent = users.length;

const revenue = orders
.filter(o => o.status === "Completed")
.reduce((sum,o) => sum + o.total, 0);

`$("statRevenue").textContent = money(revenue);

const list = currentRole === "admin"
? products
: products.filter(p => p.stock > 0);

$("dashboardProducts").innerHTML = list.length ? list.slice(0, 6).map(p =&gt; productCard(p)).join("") :<div class="panel">No products available.</div>`;

attachProductActions(`$("dashboardProducts"));
}

/* PRODUCT CARDS */

function productCard(p) {
const admin = currentRole === "admin";

return &lt;article class="product-card"&gt; &lt;div class="flower-emoji"&gt;${escapeHTML(p.emoji)}</div>
<div class="product-name">${escapeHTML(p.name)}&lt;/div&gt; &lt;p&gt;${escapeHTML(p.category)}</p>
<div class="price">${money(p.price)}&lt;/div&gt; &lt;div class="stock ${p.stock <= 0 ? "out" : ""}">
`${p.stock > 0 ? "In Stock: " + p.stock : "Out of Stock"}
</div>

latex
{admin ? ` &lt;button class="btn outline" data-edit="

{p.id}">✏️ Edit</button>
<button class="btn danger" data-delete=" {p.id}"
 {p.id}"
${p.stock &lt;= 0 ? "disabled" : ""}&gt; Buy Now &lt;/button&gt;}
</article>
`;
}

function attachProductActions(container) {
container.querySelectorAll("[data-edit]").forEach(button => {
button.addEventListener("click", () => editProduct(Number(button.dataset.edit)));
});

container.querySelectorAll("[data-delete]").forEach(button => {
button.addEventListener("click", () => deleteProduct(Number(button.dataset.delete)));
});

container.querySelectorAll("[data-buy]").forEach(button => {
button.addEventListener("click", () => {
addToCart(Number(button.dataset.buy));
});
});

container.querySelectorAll("[data-now]").forEach(button => {
button.addEventListener("click", () => {
if (addToCart(Number(button.dataset.now))) goPage("cart");
});
});
}

/* ADMIN CRUD OPERATIONS */

function openProductForm() {
if (currentRole !== "admin") return;

$("productEditor").classList.remove("hidden"); $("productForm").reset();
$("productId").value = ""; $("editorTitle").textContent = "Add New Product";
}

function closeProductForm() {
$("productEditor").classList.add("hidden"); $("productForm").reset();
}

function editProduct(id) {
if (currentRole !== "admin") return;

const p = products.find(x => x.id === id);
if (!p) return;

$("productEditor").classList.remove("hidden"); $("productId").value = p.id;
$("productName").value = p.name; $("productCategory").value = p.category;
$("productEmoji").value = p.emoji; $("productPrice").value = p.price;
`$("productStock").value = p.stock;

$`("editorTitle").textContent = "Edit Product";

window.scrollTo({top:0, behavior:"smooth"});
}

`$("productForm").addEventListener("submit", function(e) {
e.preventDefault();

if (currentRole !== "admin") return;

const id = Number( ("productName").value.trim();
const category =  ("productEmoji").value;
const price = Number( ("productStock").value);

if (!name || !Number.isFinite(price) || price <= 0 ||
!Number.isInteger(stock) || stock < 0) {
alert("Please enter valid product details.");
return;
}

const duplicate = products.some(p =>
p.id !== id && p.name.toLowerCase() === name.toLowerCase()
);

if (duplicate) {
alert("A product with this name already exists.");
return;
}

const oldProducts = [...products];

if (id) {
const p = products.find(x => x.id === id);
if (!p) return;

Object.assign(p, {name, category, emoji, price, stock});
} else {
products.push({
id: nextProductId++,
name,
category,
emoji,
price,
stock
});
}

if (!save(DB.products, products)) {
products = oldProducts;
return;
}

closeProductForm();
renderAll();
goPage("inventory");
notify(id ? "Product updated!" : "Product added!");
});

function deleteProduct(id) {
if (currentRole !== "admin") return;

const p = products.find(x => x.id === id);
if (!p) return;

if (orders.some(o =>
o.status !== "Cancelled" &&
o.items.some(i => i.productId === id)
)) {
alert("This product is connected to an active order and cannot be deleted.");
return;
}

if (!confirm("Delete " + p.name + "?")) return;

const oldProducts = products;
products = products.filter(x => x.id !== id);

if (!save(DB.products, products)) {
products = oldProducts;
return;
}

renderAll();
notify("Product deleted.");
}

/* INVENTORY */

function renderInventory() {
if (currentRole !== "admin") return;

const query = $`("inventorySearch").value.toLowerCase();

const list = products.filter(p =>
p.name.toLowerCase().includes(query) ||
p.category.toLowerCase().includes(query)
);

$("inventoryProducts").innerHTML = list.length ? list.map(p =&gt; productCard(p)).join("") :<div class="panel">No matching products.</div>`;

attachProductActions($`("inventoryProducts"));
}

`$("inventorySearch").addEventListener("input", renderInventory);

/* CUSTOMER SHOP */

function renderShop() {
if (currentRole !== "customer") return;

const query = $`("shopSearch").value.toLowerCase();

const list = products.filter(p =>
p.stock > 0 &&
(p.name.toLowerCase().includes(query) ||
p.category.toLowerCase().includes(query))
);

$("shopProducts").innerHTML = list.length ? list.map(p =&gt; productCard(p)).join("") :<div class="panel">No available flowers found.</div>`;

attachProductActions($`("shopProducts"));
}

`$("shopSearch").addEventListener("input", renderShop);

/* SHOPPING CART */

function addToCart(id) {
if (currentRole !== "customer") return false;

const p = products.find(x => x.id === id);
if (!p || p.stock <= 0) return false;

const quantity = cart[id] || 0;

if (quantity >= p.stock) {
notify("You have reached the available stock.");
return false;
}

cart[id] = quantity + 1;
notify("Added to cart!");
renderCart();

return true;
}

function changeCart(id, amount) {
const p = products.find(x => x.id === id);
const newQuantity = (cart[id] || 0) + amount;

if (!p || newQuantity > p.stock) {
notify("Not enough stock.");
return;
}

if (newQuantity <= 0) {
delete cart[id];
} else {
cart[id] = newQuantity;
}

renderCart();
}

function renderCart() {
if (currentRole !== "customer") return;

const entries = Object.entries(cart)
.filter(([id, qty]) => products.some(p => p.id === Number(id)) && qty > 0);

let total = 0;

$`("cartItems").innerHTML = entries.length
? entries.map(([id, qty]) => {
const p = products.find(x => x.id === Number(id));
const subtotal = p.price * qty;
total += subtotal;

return &lt;div class="cart-line"&gt; &lt;div&gt; &lt;strong&gt;${escapeHTML(p.emoji)}  {money(p.price)} each</p>
</div>
<div>
<button class="btn light" data-minus=" {qty}</strong>
<button class="btn light" data-plus=" {money(subtotal)}</strong>
</div>
; }).join("") :<p>Your cart is empty. Visit the shop to choose flowers.</p>`;

$`("cartTotal").textContent = "Total: " + money(total);

`$("cartItems").querySelectorAll("[data-minus]").forEach(button => {
button.addEventListener("click", () =>
changeCart(Number(button.dataset.minus), -1)
);
});

$`("cartItems").querySelectorAll("[data-plus]").forEach(button => {
button.addEventListener("click", () =>
changeCart(Number(button.dataset.plus), 1)
);
});
}

/* CUSTOMER CHECKOUT */

`$("checkoutForm").addEventListener("submit", function(e) {
e.preventDefault();

if (currentRole !== "customer") return;

const entries = Object.entries(cart).filter(([,q]) => q > 0);

if (!entries.length) {
alert("Your cart is empty.");
return;
}

for (const [id, qty] of entries) {
const p = products.find(x => x.id === Number(id));

if (!p || qty > p.stock) {
alert("Some products no longer have enough stock. Please check your cart.");
renderCart();
return;
}
}

const items = entries.map(([id, qty]) => {
const p = products.find(x => x.id === Number(id));

return {
productId: p.id,
name: p.name,
emoji: p.emoji,
price: p.price,
quantity: qty,
subtotal: p.price * qty
};
});

const total = items.reduce((sum, item) => sum + item.subtotal, 0);

const newOrder = {
id: nextOrderId,
customerId: currentUser.id,
customer:  ("checkoutPhone").value.trim(),
address:  ("paymentMethod").value,
items,
total,
status: "Pending",
date: new Date().toISOString()
};

const oldProducts = JSON.parse(JSON.stringify(products));
const oldOrders = [...orders];

entries.forEach(([id, qty]) => {
const p = products.find(x => x.id === Number(id));
p.stock -= qty;
});

orders.unshift(newOrder);
nextOrderId++;

if (!save(DB.products, products) || !save(DB.orders, orders)) {
products = oldProducts;
orders = oldOrders;
save(DB.products, products);
save(DB.orders, orders);
return;
}

cart = {};
 ("checkoutName").value = currentUser.fullName;

renderAll();
goPage("orders");

alert("Purchase successful! Your order number is PV-" + newOrder.id);
});

/* ORDERS */

function renderOrders() {
const list = currentRole === "admin"
? orders
: orders.filter(o => o.customerId === currentUser.id);

 {currentRole === "admin" ? "<th>Update Status</th>" : ""}
</tr>
</thead>
<tbody>
latex
{list.map(o =&gt; ` &lt;tr&gt; &lt;td&gt;PV-

{o.id}<br><small> {escapeHTML(o.customer)}<br> {o.items.map(i =>
escapeHTML(i.name) + " × " + i.quantity
).join("<br>")}</td>
<td> {escapeHTML(o.payment)}</td>
<td><span class="badge  {escapeHTML(o.status)}</span></td>
latex
{currentRole === "admin" ? ` &lt;td&gt; &lt;select data-order="

{o.id}">
latex
{["Pending","Processing","Completed","Cancelled"].map(s =&gt; `<option 

{o.status === s ? "selected" : ""}>${s}&lt;/option>
).join("")}
</select>
</td>
: ""} &lt;/tr&gt;).join("")}
</tbody>
</table></div>:<div class="panel">No orders found.</div>`;

`$("ordersList").querySelectorAll("[data-order]").forEach(select => {
select.addEventListener("change", () => {
updateOrder(Number(select.dataset.order), select.value);
});
});
}

function updateOrder(id, status) {
if (currentRole !== "admin") return;

const o = orders.find(x => x.id === id);
if (!o) return;

const oldStatus = o.status;

if (oldStatus === "Cancelled" && status !== "Cancelled") {
const available = o.items.every(item => {
const p = products.find(x => x.id === item.productId);
return p && p.stock >= item.quantity;
});

if (!available) {
alert("Insufficient stock to reactivate this order.");
renderOrders();
return;
}

o.items.forEach(item => {
products.find(x => x.id === item.productId).stock -= item.quantity;
});
}

if (status === "Cancelled" && oldStatus !== "Cancelled") {
o.items.forEach(item => {
const p = products.find(x => x.id === item.productId);
if (p) p.stock += item.quantity;
});
}

o.status = status;

if (!save(DB.products, products) || !save(DB.orders, orders)) {
o.status = oldStatus;
renderAll();
return;
}

renderAll();
notify("Order status updated.");
}

/* CUSTOMERS - ADMIN ONLY */

function renderCustomers() {
if (currentRole !== "admin") return;

 {users.map(u => &lt;tr&gt; &lt;td&gt;${escapeHTML(u.fullName)}</td>
<td>${escapeHTML(u.username)}&lt;/td&gt; &lt;td&gt;Customer&lt;/td&gt; &lt;/tr&gt;).join("")}
</tbody>
</table></div>:<div class="panel">No registered customers yet.</div>`;
}

/* REPORTS - ADMIN ONLY */

function renderReports() {
if (currentRole !== "admin") return;

const completed = orders.filter(o => o.status === "Completed");
const revenue = completed.reduce((sum,o) => sum + o.total, 0);

 ("reportCompleted").textContent = completed.length;
$`("reportPending").textContent =
orders.filter(o => o.status === "Pending" || o.status === "Processing").length;
}

/* REFRESH */

function renderAll() {
renderDashboard();

if (currentRole === "admin") {
renderInventory();
renderOrders();
renderCustomers();
renderReports();
} else {
renderShop();
renderCart();
renderOrders();
}
}

/* NOTIFICATIONS */

let toastTimer;

function notify(message) {
const toast = `$("toast");

toast.textContent = message;
toast.classList.remove("hidden");

clearTimeout(toastTimer);

toastTimer = setTimeout(() => {
toast.classList.add("hidden");
}, 2500);
}

/* INITIALIZATION */

backToChoices();
