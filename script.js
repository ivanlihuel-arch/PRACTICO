// --- ELEMENTOS DEL DOM ---
const productForm = document.getElementById('productForm');
const productNameInput = document.getElementById('productName');
const productPriceInput = document.getElementById('productPrice');
const addBtn = document.getElementById('addBtn');
const cartList = document.getElementById('cartList');
const totalPriceElement = document.getElementById('totalPrice');
const checkoutBtn = document.getElementById('checkoutBtn');
const clearCartBtn = document.getElementById('clearCartBtn');
const devModeBtn = document.getElementById('devModeBtn');
const shelfGrid = document.getElementById('shelfGrid');
const saveStatus = document.getElementById('saveStatus');
const itemCountElem = document.getElementById('itemCount');

let cart = [];
let saveTimeout = null;

// Lista de productos centralizada (Fuente de verdad)
const catalog = [
    { name: "Yerba Mate 1kg", price: 4200, img: "https://acdn-us.mitiendanube.com/stores/798/865/products/119426116-570c893c102421015017613702942114-1024-1024.webp" },
    { name: "Alfajores x6", price: 5800, img: "https://acdn-us.mitiendanube.com/stores/006/675/094/products/20_alfajoreschoco6-0d260785432f8d7c9a17593479846576-640-0.webp" },
    { name: "Dulce de Leche", price: 3500, img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQjLqTck9NTISBN-6GF3WBKXUJYWt9cT5hbCg&s" },
    { name: "Coca-Cola 3L", price: 3800, img: "https://www.rimoldimayorista.com.ar/datos/uploads/mod_catalogo/31308/coca-cola-3-lts-6061faffaae30.jpg" },
    { name: "Asado 1kg", price: 9500, img: "https://jumboargentina.vtexassets.com/arquivos/ids/646291/Asado-De-Novillito-X-Kg-Bahia-Blanca-Bja-1-Kg-1-21047.jpg?v=637583736223400000" },
    { name: "Vino Malbec", price: 5500, img: "https://jumboargentina.vtexassets.com/arquivos/ids/581089-800-600?v=637225176402330000&width=800&height=600&aspect=true" },
    { name: "Empanadas x12", price: 12000, img: "https://http2.mlstatic.com/D_Q_NP_2X_947765-MLA110673916523_042026-T.webp" },
    { name: "Pan 1kg", price: 2200, img: "https://www.johaprato.com/files/styles/flexslider_full/public/mignon.jpg?itok=Vl08dMPl" },
    { name: "Fernet 1L", price: 15500, img: "https://acdn-us.mitiendanube.com/stores/001/163/250/products/fernet-branca1-5ae1b72980548aa7fc15882490670560-1024-1024.webp" },
    { name: "Aceite 1.5L", price: 3800, img: "https://jumboargentina.vtexassets.com/arquivos/ids/427751/Aceite-De-Girasol-Natura-15-L-1-247928.jpg?v=636495154762100000" }
];

// Función para renderizar la góndola dinámicamente
function renderShelf() {
    shelfGrid.innerHTML = catalog.map(p => `
        <div class="shelf-item" data-name="${p.name}" data-price="${p.price}">
            <img src="${p.img}" alt="${p.name}">
            <p>${p.name}</p>
            <span>${formatter.format(p.price)}</span>
        </div>
    `).join('');
}

// Formateador de moneda centralizado
const formatter = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2
});

// Función para cargar el carrito desde la Base de Datos
function loadCart() {
    cart = JSON.parse(localStorage.getItem('cart')) || [];
    updateUI(false);
}

// Función para guardar en la Base de Datos
function saveCart() {
    showStatus('✓ Guardado local', 'success');
    setTimeout(() => showStatus('', ''), 2000);
}

function showStatus(text, type) {
    saveStatus.textContent = text;
    saveStatus.className = 'save-status ' + type;
}

// --- RENDERIZADO ---
function updateUI(shouldSave = true) {
    const emptyMsgId = 'empty-cart-msg';

    let total = 0;
    let totalItems = 0;

    // 1. Manejo del estado vacío sin destruir toda la lista
    if (cart.length === 0) {
        if (!document.getElementById(emptyMsgId)) {
            cartList.innerHTML = `<li id="${emptyMsgId}" class="empty-msg" style="text-align:center; padding:20px; opacity:0.6;">El carrito está vacío 🇦🇷</li>`;
        }
    } else {
        const emptyMsg = document.getElementById(emptyMsgId);
        if (emptyMsg) emptyMsg.remove();
    }

    // 2. Mapeo de elementos actuales (DOM Reconciliation)
    // Guardamos los nodos actuales en un Map para un acceso rápido O(1)
    const existingNodes = new Map();
    cartList.querySelectorAll('.cart-item').forEach(node => {
        const name = node.querySelector('.item-info span').textContent;
        existingNodes.set(name, node);
    });

    const cartNames = new Set(cart.map(item => item.name));

    // Eliminar del DOM solo los elementos que ya no están en el array 'cart'
    existingNodes.forEach((node, name) => {
        if (!cartNames.has(name)) node.remove();
    });

    cart.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        totalItems += item.quantity;

        let li = existingNodes.get(item.name);

        if (li) {
            // OPTIMIZACIÓN: Solo actualizamos los valores que cambiaron y los índices
            li.querySelectorAll('[data-index]').forEach(el => el.dataset.index = index);
            
            const qtyDisplay = li.querySelector('.qty-value');
            if (qtyDisplay.textContent !== String(item.quantity)) {
                qtyDisplay.textContent = item.quantity;
            }

            const priceDisplay = li.querySelector('.item-info strong');
            const formattedTotal = formatter.format(itemTotal);
            if (priceDisplay.textContent !== formattedTotal) {
                priceDisplay.textContent = formattedTotal;
            }
            cartList.appendChild(li); // Asegura que se mantenga en el DOM
        } else {
            // Crear nuevo elemento solo si no existía previamente
            li = document.createElement('li');
            li.className = 'cart-item';
            li.innerHTML = `
                <img src="${item.img}" class="cart-item-img" alt="${item.name}">
                <div class="item-info">
                    <span>${item.name}</span>
                    <strong>${formatter.format(itemTotal)}</strong>
                </div>
                <div class="quantity-controls">
                    <button class="qty-btn minus-btn" data-index="${index}">-</button>
                    <span class="qty-value">${item.quantity}</span>
                    <button class="qty-btn plus-btn" data-index="${index}">+</button>
                </div>
                <button class="delete-item-btn" data-index="${index}">&times;</button>
            `;
            cartList.appendChild(li);
        }
    });

    totalPriceElement.textContent = formatter.format(total);

    // Actualización centralizada del contador
    if (itemCountElem) itemCountElem.textContent = `${totalItems} productos`;
    
    // Guardamos en LocalStorage como respaldo rápido y en DB
    localStorage.setItem('cart', JSON.stringify(cart));
    if (shouldSave) {
        // Optimizamos el enlace con el servidor mediante un "debounce".
        // Esto evita múltiples peticiones innecesarias al hacer clics rápidos.
        showStatus('Cambios pendientes...', 'loading');
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            saveCart();
        }, 1000); // Espera 1 segundo de inactividad antes de sincronizar
    }
}

// --- LÓGICA DEL CARRITO ---
function addItemToCart(name, price, img) {
    const numericPrice = parseFloat(price);
    if (!name || isNaN(numericPrice)) {
        console.error("Datos de producto inválidos");
        return;
    }

    const existingItem = cart.find(item => item.name.toLowerCase() === name.toLowerCase());
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.unshift({ name, price: numericPrice, quantity: 1, img: img || 'default.png' });
    }
    updateUI();
}

function addProduct(event) {
    if (event) event.preventDefault(); // Previene la recarga de la página
    const name = productNameInput.value.trim();
    const price = parseFloat(productPriceInput.value);

    if (name && !isNaN(price) && price >= 100 && price <= 70000) {
        // Feedback visual al botón
        addBtn.classList.add('pulse');
        setTimeout(() => addBtn.classList.remove('pulse'), 400);

        // Imagen por defecto para productos manuales
        const defaultImg = 'https://cdn-icons-png.flaticon.com/512/679/679821.png';
        addItemToCart(name, price, defaultImg);
        productNameInput.value = '';
        productPriceInput.value = '';
        productNameInput.focus();
    } else {
        alert("Por favor, ingresa un nombre y un precio entre 100 y 70,000.");
    }
}

function quickAdd(name, price, img, element) {
    addItemToCart(name, price, img);

    // Verificamos que el elemento exista antes de intentar animarlo
    if (element && element instanceof HTMLElement) {
        // Crear el efecto +1
        const plusOne = document.createElement('span');
        plusOne.textContent = '+1';
        plusOne.classList.add('floating-plus-one');
        element.appendChild(plusOne);
        setTimeout(() => plusOne.remove(), 800);

        // Agrega el marco verde temporalmente
        element.classList.add('selected');
        setTimeout(() => {
            element.classList.remove('selected');
        }, 600);
    }
}

function removeProduct(index) {
    cart.splice(index, 1);
    updateUI();
}

function changeQuantity(index, delta) {
    cart[index].quantity += delta;
    if (cart[index].quantity <= 0) {
        removeProduct(index);
    } else {
        updateUI();
    }
}

function checkout() {
    if (cart.length === 0) {
        alert("El carrito está vacío. ¡Agrega productos antes de finalizar!");
        return;
    }
    const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    // Disparamos el efecto de confetti con colores temáticos
    confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#28a745', '#ffffff', '#0035ad', '#e81123'],
        disableForReducedMotion: true // Respeto por la accesibilidad
    });

    alert(`¡Compra finalizada con éxito!\nTotal a pagar: ${formatter.format(total)}\n¡Gracias por tu compra!`);
    cart = [];
    updateUI();
}

function clearCart() {
    if (cart.length === 0) return;
    if (confirm("¿Estás seguro de que deseas vaciar todo el carrito?")) {
        cart = [];
        updateUI();
    }
}

function fillTestData() {
    // Usamos los primeros 4 productos del catálogo como test
    cart = catalog.slice(0, 4).map(p => ({ ...p, quantity: 1 }));
    updateUI();
}

window.addEventListener('keydown', (e) => {
    // Combinación secreta: Ctrl + Shift + D
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
        devModeBtn.style.display = devModeBtn.style.display === 'block' ? 'none' : 'block';
    }
});

// Manejo de clics en la góndola (Delegación de eventos)
shelfGrid.addEventListener('click', (e) => {
    const item = e.target.closest('.shelf-item');
    if (item) {
        const name = item.dataset.name;
        const price = parseFloat(item.dataset.price);
        const img = item.querySelector('img').src;
        quickAdd(name, price, img, item);
    }
});

cartList.addEventListener('click', (e) => {
    const index = parseInt(e.target.dataset.index);
    if (isNaN(index)) return;

    if (e.target.classList.contains('delete-item-btn')) {
        removeProduct(index);
    } else if (e.target.classList.contains('plus-btn')) {
        changeQuantity(index, 1);
    } else if (e.target.classList.contains('minus-btn')) {
        changeQuantity(index, -1);
    }
});

productForm.addEventListener('submit', addProduct);
checkoutBtn.addEventListener('click', checkout);
clearCartBtn.addEventListener('click', clearCart);
devModeBtn.addEventListener('click', fillTestData);

// Al iniciar, cargamos los datos y renderizamos la góndola
renderShelf();
loadCart();