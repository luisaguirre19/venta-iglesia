let inventario = JSON.parse(localStorage.getItem('inventario')) || [];
let ventas = JSON.parse(localStorage.getItem('ventas')) || [];
let carrito = [];

document.addEventListener('DOMContentLoaded', () => actualizarTodo());

function openTab(evt, tabName) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-link').forEach(b => b.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    evt.currentTarget.classList.add('active');
    if(tabName === 'reportes') calcularReportes();
}

// --- INVENTARIO ---
document.getElementById('form-producto').addEventListener('submit', (e) => {
    e.preventDefault();
    inventario.push({
        nombre: document.getElementById('prod-nombre').value,
        precio: parseFloat(document.getElementById('prod-precio').value),
        cantidad: parseInt(document.getElementById('prod-cantidad').value)
    });
    guardar();
    e.target.reset();
});

// --- VENTA Y CARRITO ---
function agregarAlCarrito() {
    const idx = document.getElementById('venta-producto').value;
    const cant = parseInt(document.getElementById('venta-cantidad').value);
    if (idx === "" || cant < 1) return;

    const p = inventario[idx];
    if (cant > p.cantidad) return alert("Stock insuficiente");

    carrito.push({ idInv: idx, nombre: p.nombre, precio: p.precio, cantidad: cant, subtotal: p.precio * cant });
    renderCarrito();
}

function renderCarrito() {
    const tbody = document.querySelector('#tabla-carrito tbody');
    tbody.innerHTML = '';
    let total = 0;
    carrito.forEach((item, index) => {
        total += item.subtotal;
        tbody.innerHTML += `<tr><td>${item.nombre}</td><td>${item.cantidad}</td><td>Q${item.subtotal.toFixed(2)}</td><td><button onclick="carrito.splice(${index},1);renderCarrito()">x</button></td></tr>`;
    });
    document.getElementById('total-orden').innerText = `Total: Q${total.toFixed(2)}`;
}

document.getElementById('form-finalizar-venta').addEventListener('submit', (e) => {
    e.preventDefault();
    if (carrito.length === 0) return alert("El carrito está vacío");

    const nuevaVenta = {
        id: ventas.length + 101,
        cliente: document.getElementById('venta-cliente').value,
        items: [...carrito],
        total: carrito.reduce((s, i) => s + i.subtotal, 0),
        pagoMetodo: document.getElementById('venta-pago').value,
        servicio: document.getElementById('venta-servicio').value,
        tipo: document.getElementById('venta-tipo-orden').value,
        observacion: document.getElementById('venta-observacion').value,
        entregado: (document.getElementById('venta-tipo-orden').value === "Despacho"),
        pagado: document.getElementById('venta-pagado-check').checked,
        fecha: new Date().toLocaleString()
    };

    carrito.forEach(item => inventario[item.idInv].cantidad -= item.cantidad);
    ventas.push(nuevaVenta);
    carrito = [];
    guardar();
    renderCarrito();
    e.target.reset();
    alert("Venta registrada exitosamente");
});

// --- GESTIÓN Y EDICIÓN ---
function actualizarGestion() {
    const tbody = document.querySelector('#tabla-pedidos tbody');
    tbody.innerHTML = '';

    ventas.slice().reverse().forEach((v, idxRev) => {
        const i = ventas.length - 1 - idxRev;
        const itemsStr = v.items.map(it => `• ${it.cantidad} ${it.nombre}`).join('<br>');

        tbody.innerHTML += `
            <tr>
                <td><strong>#${v.id}</strong><br><small>${v.fecha}</small></td>
                <td>
                    <strong>${v.cliente}</strong><br>
                    <span class="badge">${v.servicio}</span> <span class="badge">${v.tipo}</span>
                    ${v.observacion ? `<br><small><em>Nota: ${v.observacion}</em></small>` : ''}
                </td>
                <td style="font-size:0.85em">${itemsStr}</td>
                <td>Q${v.total.toFixed(2)}</td>
                <td><button class="btn-toggle ${v.pagado ? 'btn-on' : 'btn-off'}" onclick="togglePago(${i})">${v.pagado ? 'SÍ' : 'NO'}</button></td>
                <td><button class="btn-toggle ${v.entregado ? 'btn-on' : 'btn-off'}" onclick="toggleEntrega(${i})">${v.entregado ? 'SÍ' : 'NO'}</button></td>
                <td><button onclick="abrirEditar(${i})" class="btn-secundario">Editar</button></td>
            </tr>
        `;
    });
}

function abrirEditar(index) {
    const v = ventas[index];
    document.getElementById('edit-index').value = index;
    document.getElementById('edit-cliente').value = v.cliente;
    document.getElementById('edit-observacion').value = v.observacion || '';
    document.getElementById('modal-editar').style.display = 'block';
}

function cerrarModal() { document.getElementById('modal-editar').style.display = 'none'; }

function guardarEdicion() {
    const index = document.getElementById('edit-index').value;
    ventas[index].cliente = document.getElementById('edit-cliente').value;
    ventas[index].observacion = document.getElementById('edit-observacion').value;
    cerrarModal();
    guardar();
}

function togglePago(i) { ventas[i].pagado = !ventas[i].pagado; guardar(); }
function toggleEntrega(i) { ventas[i].entregado = !ventas[i].entregado; guardar(); }

// --- REPORTES ---
function calcularReportes() {
    let total = 0, efectivo = 0, tarjeta = 0;
    let resumenComida = {};

    ventas.forEach(v => {
        if(v.pagado) {
            total += v.total;
            if(v.pagoMetodo === "Efectivo") efectivo += v.total;
            else tarjeta += v.total;
        }
        // Sumar detalle de comida por unidades
        v.items.forEach(it => {
            if (!resumenComida[it.nombre]) resumenComida[it.nombre] = 0;
            resumenComida[it.nombre] += it.cantidad;
        });
    });

    document.getElementById('rep-total').innerText = `Q${total.toFixed(2)}`;
    document.getElementById('rep-efectivo').innerText = `Q${efectivo.toFixed(2)}`;
    document.getElementById('rep-tarjeta').innerText = `Q${tarjeta.toFixed(2)}`;

    const tbodyRep = document.querySelector('#tabla-reporte-comida tbody');
    tbodyRep.innerHTML = '';
    for (let comida in resumenComida) {
        tbodyRep.innerHTML += `<tr><td>${comida}</td><td>${resumenComida[comida]} unidades</td></tr>`;
    }
}

function guardar() {
    localStorage.setItem('inventario', JSON.stringify(inventario));
    localStorage.setItem('ventas', JSON.stringify(ventas));
    actualizarTodo();
}

function actualizarTodo() {
    const tbodyInv = document.querySelector('#tabla-inventario tbody');
    const select = document.getElementById('venta-producto');
    tbodyInv.innerHTML = '';
    select.innerHTML = '<option value="">-- Seleccionar Alimento --</option>';

    inventario.forEach((p, i) => {
        tbodyInv.innerHTML += `<tr><td>${p.nombre}</td><td>Q${p.precio}</td><td>${p.cantidad}</td><td><button onclick="inventario.splice(${i},1);guardar()" class="btn-off" style="padding:4px 8px">Eliminar</button></td></tr>`;
        if(p.cantidad > 0) select.innerHTML += `<option value="${i}">${p.nombre} (Q${p.precio})</option>`;
    });

    actualizarGestion();
}
