// ==============================
// ELEMENTOS
// ==============================
const fileInput = document.getElementById("file-input");
const productsGrid = document.querySelector(".products-grid");
const searchInput = document.querySelector(".search-input");
const filterSelect = document.querySelector(".filter-select");

// ==============================
// ESTADO
// ==============================
let produtosGlobais = [];

// ==============================
// EVENTOS INICIAIS
// ==============================
fileInput.addEventListener("change", handleFile);
searchInput.addEventListener("input", aplicarFiltros);
filterSelect.addEventListener("change", aplicarFiltros);
initLotesButtons();

// ==============================
// 🔥 MODAL LOTES
// ==============================
function criarModal() {

    let modal = document.getElementById("modal-lotes");

    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "modal-lotes";

    modal.innerHTML = `
        <div class="modal-overlay"></div>
        <div class="modal-box">
            <div class="modal-header">
                <h2 class="modal-title"></h2>
                <button class="modal-close">✕</button>
            </div>
            <div class="modal-body"></div>
        </div>
    `;

    document.body.appendChild(modal);

    // 🔥 remove fundo do botão X
    const btnClose = modal.querySelector(".modal-close");
    btnClose.style.background = "none";
    btnClose.style.border = "none";
    btnClose.style.fontSize = "20px";
    btnClose.style.cursor = "pointer";

    // 🔥 trava scroll da página
    document.body.style.overflow = "hidden";

    // fechar
    btnClose.onclick = () => {
        modal.remove();
        document.body.style.overflow = "";
    };

    modal.querySelector(".modal-overlay").onclick = () => {
        modal.remove();
        document.body.style.overflow = "";
    };

    return modal;
}

// ==============================
// BOTÃO LOTES (AGORA MODAL)
// ==============================
function initLotesButtons() {

    document.querySelectorAll(".product-card").forEach(card => {

        const btn = card.querySelector(".btn-lotes");

        if (btn) {

            btn.onclick = () => {

                const nome = card.querySelector(".product-name").textContent;

                const lotes = Array.from(card.querySelectorAll(".lote-item")).map(l => {
                    return {
                        lote: l.querySelector("span").textContent,
                        qtd: l.querySelector("strong").textContent
                    };
                });

                const modal = criarModal();

                const body = modal.querySelector(".modal-body");
                const title = modal.querySelector(".modal-title");

                title.textContent = nome;

                body.innerHTML = lotes.length > 0
                    ? lotes.map(l => `
                        <div class="modal-lote-item">
                            <span>${l.lote}</span>
                            <strong>${l.qtd}</strong>
                        </div>
                    `).join("")
                    : "<span>Sem lotes</span>";
            };
        }
    });
}

// ==============================
// LER EXCEL
// ==============================
function handleFile(e) {

    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = function (evt) {

        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array" });

        const produtos = XLSX.utils.sheet_to_json(workbook.Sheets["PRODUTOS"]);
        const lotes = XLSX.utils.sheet_to_json(workbook.Sheets["LOTES"]);
        const producao = XLSX.utils.sheet_to_json(workbook.Sheets["PRODUCAO"]);

        produtosGlobais = produtos.map(prod => ({
            ...prod,
            lotes: lotes.filter(l => l.codigo == prod.codigo),
            producao: producao.filter(p => p.codigo == prod.codigo)
        }));

        aplicarFiltros();
    };

    reader.readAsArrayBuffer(file);
}

// ==============================
// FILTROS + BUSCA
// ==============================
function aplicarFiltros() {

    const busca = searchInput.value.toLowerCase();
    const filtro = filterSelect.value;

    const filtrados = produtosGlobais.filter(prod => {

        const nome = String(prod.nome).toLowerCase();
        const codigo = String(prod.codigo);

        const matchBusca = nome.includes(busca) || codigo.includes(busca);

        let matchFiltro = true;

        const saldo = Number(prod.saldo_disponivel) || 0;

        if (filtro === "com") {
            matchFiltro = saldo > 0;
        }
        
        if (filtro === "sem") {
            matchFiltro = saldo <= 0;
        }

        return matchBusca && matchFiltro;
    });

    renderProducts(filtrados);
}

// ==============================
// FORMATAR NÚMEROS (PT-BR)
// ==============================
function formatNumber(valor) {
    const numero = Number(valor) || 0;
    return numero.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// ==============================
// MESES DINÂMICOS
// ==============================
function getMesesValidos() {

    const hoje = new Date();
    const meses = [];

    for (let i = 0; i < 3; i++) {

        const data = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);

        const chave = data.getFullYear() + "-" + String(data.getMonth() + 1).padStart(2, "0");

        meses.push(chave);
    }

    return meses;
}

// ==============================
// RENDER
// ==============================
function renderProducts(produtos) {

    productsGrid.innerHTML = "";

    produtos.forEach(prod => {

        const card = document.createElement("div");
        card.className = "product-card";

        let producaoHTML = "";

        const mesesValidos = getMesesValidos();

        const producaoFiltrada = (prod.producao || []).filter(p =>
            mesesValidos.includes(String(p.mes))
        );

        if (producaoFiltrada.length === 0) {

            producaoHTML = `<div><span>Indefinido</span></div>`;

        } else {

            producaoHTML = mesesValidos.map(mes => {

                const item = producaoFiltrada.find(p => String(p.mes) === mes);

                if (!item) {
                    return `<div>${formatMonth(mes)} <strong>Indefinido</strong></div>`;
                }

                const qtd = (item.quantidade !== undefined && item.quantidade !== "")
                    ? formatNumber(item.quantidade)
                    : "Indefinido";

                return `<div>${formatMonth(mes)} <strong>${qtd}</strong></div>`;

            }).join("");
        }

        const lotesHTML = (prod.lotes && prod.lotes.length > 0)
            ? prod.lotes.map(l => `
                <div class="lote-item">
                    <span>${l.lote}</span>
                    <strong>${formatNumber(l.qtd_disponivel)}</strong>
                </div>
            `).join("")
            : "<span>Sem lotes</span>";

        const saldoDisponivel = Number(prod.saldo_disponivel) || 0;
        const corSaldo = saldoDisponivel < 0 ? "red" : "green";

        card.innerHTML = `
            <div class="product-header">
                <div>
                    <h2 class="product-name">${prod.nome}</h2>
                    <span class="product-code">#${prod.codigo}</span>
                </div>
                <button class="btn-lotes">Ver Lotes</button>
            </div>

            <div class="product-stock">
                <div class="stock-box"><span>Atual</span><strong>${formatNumber(prod.saldo_atual)}</strong></div>
                <div class="stock-box"><span>Alocado</span><strong>${formatNumber(prod.saldo_alocado)}</strong></div>
                <div class="stock-box highlight">
                    <span>Disponível</span>
                    <strong style="color:${corSaldo}">
                        ${formatNumber(prod.saldo_disponivel)}
                    </strong>
                </div>
            </div>

            <div class="product-production">
                <span class="section-label">Previsão</span>
                <div class="production-grid">${producaoHTML}</div>
            </div>

            <div class="product-lotes hidden">
                ${lotesHTML}
            </div>
        `;

        productsGrid.appendChild(card);
    });

    initLotesButtons();
}

// ==============================
// BUSCA
// ==============================
searchInput.addEventListener("input", function () {

    const value = this.value.toLowerCase();
    const cards = document.querySelectorAll(".product-card");

    cards.forEach(card => {

        const name = card.querySelector(".product-name").textContent.toLowerCase();
        const code = card.querySelector(".product-code").textContent.toLowerCase();

        card.style.display = (name.includes(value) || code.includes(value))
            ? "block"
            : "none";
    });
});

// ==============================
// FORMATAR MÊS
// ==============================
function formatMonth(mes) {

    if (!mes) return "--";

    try {

        let data;

        if (typeof mes === "string") {
            if (mes.includes("-")) {
                data = new Date(mes + "-01");
            } else {
                data = new Date(mes);
            }
        } else {
            data = new Date(mes);
        }

        if (isNaN(data)) return mes;

        return data.toLocaleString("pt-BR", { month: "short" });

    } catch {
        return mes;
    }
}