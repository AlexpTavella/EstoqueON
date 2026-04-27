const fileInput = document.getElementById("file-input");
const productsGrid = document.querySelector(".products-grid");
const searchInput = document.querySelector(".search-input");
const filterSelect = document.querySelector(".filter-select");

// 🔥 NOVO INPUT
const loteSearchInput = document.querySelector(".lote-search-input");

let produtosGlobais = [];

fileInput.addEventListener("change", handleFile);
searchInput.addEventListener("input", aplicarFiltros);
filterSelect.addEventListener("change", aplicarFiltros);

// 🔥 NOVO EVENTO
if (loteSearchInput) {
    loteSearchInput.addEventListener("input", aplicarFiltros);
}

initLotesButtons();

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

    const btnClose = modal.querySelector(".modal-close");
    btnClose.style.background = "none";
    btnClose.style.border = "none";
    btnClose.style.fontSize = "20px";
    btnClose.style.cursor = "pointer";

    document.body.style.overflow = "hidden";

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

function initLotesButtons() {
    document.querySelectorAll(".product-card").forEach(card => {
        const btn = card.querySelector(".btn-lotes");

        if (btn) {
            btn.onclick = () => {
                const nome = card.querySelector(".product-name").textContent;

                const lotes = Array.from(card.querySelectorAll(".lote-item")).map(l => ({
                    lote: l.querySelector("span").textContent,
                    qtd: l.querySelector("strong").textContent
                }));

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
// 🔥 FILTROS + BUSCA + LOTE
// ==============================
function aplicarFiltros() {

    const busca = searchInput.value.toLowerCase();
    const filtro = filterSelect.value;
    const qtdLote = Number(loteSearchInput?.value) || 0;

    let resultado = [];

    produtosGlobais.forEach(prod => {

        const nome = String(prod.nome).toLowerCase();
        const codigo = String(prod.codigo);

        const matchBusca = nome.includes(busca) || codigo.includes(busca);

        const saldo = Number(prod.saldo_disponivel) || 0;

        let matchFiltro = true;

        if (filtro === "com") matchFiltro = saldo > 0;
        if (filtro === "sem") matchFiltro = saldo <= 0;

        // 🔥 FILTRO DE LOTES
        const lotesValidos = (prod.lotes || []).filter(l =>
            Number(l.qtd_disponivel) >= qtdLote
        );

        if (qtdLote > 0) {

            // busca combinada
            if (matchBusca && matchFiltro && lotesValidos.length > 0) {

                lotesValidos.forEach(l => {
                    resultado.push({
                        tipo: "lote",
                        nome: prod.nome,
                        codigo: prod.codigo,
                        lote: l.lote,
                        qtd: l.qtd_disponivel
                    });
                });
            }

        } else {

            if (matchBusca && matchFiltro) {
                resultado.push({ tipo: "produto", data: prod });
            }
        }
    });

    // 🔥 SE NÃO ENCONTROU
    if (resultado.length === 0) {
        productsGrid.innerHTML = `<div style="padding:20px; font-size: 19px;">Não foi encontrado nenhum resultado.</div>`;
        return;
    }

    // 🔥 RENDER DIFERENTE
    if (qtdLote > 0) {

        productsGrid.innerHTML = "";

        resultado.forEach(item => {

            const card = document.createElement("div");
            card.className = "product-card";

            card.innerHTML = `
                <div class="product-header">
                    <div>
                        <h2 class="product-name">${item.nome}</h2>
                        <span class="product-code">#${item.codigo}</span>
                    </div>
                </div>

                <div class="product-stock">
                    <div class="stock-box highlight" style="display: inline; margin: auto;">
                        <span style="font-size: 17px; color: black; font-weight: 700; color: #464b53; margin-right: 10px;">Lote: ${item.lote}</span>
                        <strong style="font-size: 17px; font-weight: 800; margin-left: 10px;">${formatNumber(item.qtd)}</strong>
                    </div>
                </div>
            `;

            productsGrid.appendChild(card);
        });

        return;
    }

    // padrão normal
    renderProducts(resultado.map(r => r.data));
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

        const producaoFiltrada = (prod.producao || []).map(p => {

            let data;
        
            if (typeof p.mes === "string") {
        
                if (p.mes.includes("-")) {
                    const [ano, mesNum] = p.mes.split("-");
                    data = new Date(Number(ano), Number(mesNum) - 1, 1);
                } else if (p.mes.includes("/")) {
                    const [mes, ano] = p.mes.split("/");
                    data = new Date(`${ano}-${mes}-01`);
                } else {
                    data = new Date(p.mes);
                }
        
            } else {
                data = new Date(p.mes);
            }
        
            if (isNaN(data)) return null;
        
            const chave = data.getFullYear() + "-" + String(data.getMonth() + 1).padStart(2, "0");
        
            return {
                ...p,
                mesNormalizado: chave
            };
        
        }).filter(p => p && mesesValidos.includes(p.mesNormalizado));

        if (producaoFiltrada.length === 0) {

            producaoHTML = `<div><span>Indefinido</span></div>`;

        } else {

            producaoHTML = mesesValidos.map(mes => {

                const item = producaoFiltrada.find(p => p.mesNormalizado === mes);

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
                <div class="stock-box">
                <strong>Quantidade Disponível</strong>
                </div>
                <div class="stock-box highlight">
                    
                    <strong style="color:${corSaldo}">
                        ${formatNumber(prod.saldo_disponivel)} m²
                    </strong>
                </div>
            </div>

            <div class="product-production">
                <span class="section-label">Previsão de produção</span>
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

        // 🔥 NOVO: tratar mês numérico (ex: 4 ou "04")
        if (!isNaN(mes)) {

            const hoje = new Date();
            const ano = hoje.getFullYear();
            const mesNumero = Number(mes) - 1; // JS começa em 0

            data = new Date(ano, mesNumero, 1);

        } else if (typeof mes === "string") {

            if (mes.includes("-")) {
                const [ano, mesNum] = mes.split("-");
                data = new Date(Number(ano), Number(mesNum) - 1, 1);
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
