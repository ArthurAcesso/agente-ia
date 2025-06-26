// ==============================================
// CONFIGURAÇÕES E CONSTANTES
// ==============================================
const SHEET_ID = '1g_uwMSpHnKaiBbJB66EMeh3vg5nY95LQENLFBMT22OA'; // planilha onde estao os briefings dos clientes
const SHEET_RANGE = 'Respostas ao formulário 1';
const ACCESS_TOKEN = 'EAATSMRltA1IBO5v3sxw7nWkzpHtHVFkig6uYtNgz1oTA5J1vqNS8kj0ivaZB9IZByZBxSiuOyTu7VuXZC830Av8wmZAqrK28uNNk1rVSkRmiMp2oxcdBZCoIkJ0AyKyAbatq9HlUgnFIlR0qOhIopJpHZAZCRtP2Li0l6GruIK8CYzZB0YZBxt0DZBZA';
const META_API_VERSION = 'v19.0';
const GOOGLE_API_KEY = 'AIzaSyB5xusUGM3Kn4yPLubbSEMURp2AC3L9SIU';

let AD_ACCOUNT_ID = null;

// ==============================================
// ELEMENTOS DO DOM
// ==============================================
const resultadoDiv = document.getElementById("resultado");
const formContainer = document.getElementById("formContainer");
const backgroundBlur = document.getElementById("backgroundBlur");
const briefingContainer = document.getElementById("briefing-container");
const generateBtn = document.getElementById("generateBtn");

// ==============================================
// ESTADO DA APLICAÇÃO
// ==============================================
let formData = null;
const briefing = JSON.parse(localStorage.getItem('briefingSelecionado'));

// ==============================================
// FUNÇÕES DE INICIALIZAÇÃO
// ==============================================
function initialize() {
    AD_ACCOUNT_ID = localStorage.getItem('metaAdAccountId');

    if (!AD_ACCOUNT_ID) {
        // Mostra o modal de configuração se não tiver o ID
        showMetaAccountSetup();
    } else {
        // Continua a inicialização normal se já tiver o ID
        continueInitialization();
    }
    renderBriefing();
    setupEventListeners();
}

function showMetaAccountSetup() {
    document.getElementById("metaAccountSetup").style.display = "block";
    document.getElementById("saveMetaAccountBtn").addEventListener("click", saveMetaAccountId);
}

function saveMetaAccountId() {
    const accountId = document.getElementById("metaAdAccountIdInput").value.trim();

    if (!accountId) {
        alert("Por favor, insira um ID válido da conta Meta Ads");
        return;
    }

    // Salva no localStorage
    localStorage.setItem('metaAdAccountId', accountId);
    AD_ACCOUNT_ID = accountId;

    // Esconde o modal e continua a inicialização
    document.getElementById("metaAccountSetup").style.display = "none";
    continueInitialization();
}

function continueInitialization() {
    console.log("Conta Meta Ads configurada com ID:", AD_ACCOUNT_ID);
    renderBriefing();
    setupEventListeners();
}

function renderBriefing() {
    if (!briefing) return;

    briefingContainer.innerHTML = Object.entries(briefing).map(([chave, valor]) => `
        <div class="briefing-item">
            <strong>${chave}</strong>
            <p>${valor.replace(/\n/g, "<br>")}</p>
        </div>
    `).join("");
}

function setupEventListeners() {
    // Formulário
    document.getElementById("formulario").addEventListener("submit", handleFormSubmit);

    // Botões
    document.getElementById("criarNovaCampanha").addEventListener("click", () => {

        document.getElementById("containerFormulario").innerHTML = `
        
        <form id="formCampanha">
    <label for="nomeCampanha">Id da conta de anúncio:</label><br>
    <input type="text" id="idConta" name="idConta" required><br><br>

    <label for="orcamento">Orçamento:</label><br>
    <input type="number" id="orcamento" name="orcamento" required><br><br>

    <label for="idPagina">Id da página:</label><br>
    <input type="text" id="idPagina" name="idPagina" required><br><br>

    <label for="paginaDestino">Link da página de destino:</label><br>
    <input type="text" id="idcriativo" name="idcriativo" required><br><br>

    <label for="arquivoCriativo">Arquivo do criativo:</label><br>
    <input type="file" id="arquivoCriativo" name="arquivoCriativo" required><br><br>

    <label for="briefingCliente">Briefing resumido do cliente:</label><br>
    <textarea id="briefingCliente" name="briefingCliente" rows="10" cols="50"></textarea><br><br>

    <button type="submit">Enviar</button>
</form>
    `;

        document.getElementById("formCampanha").addEventListener("submit", (event) => {
            event.preventDefault();

            chamarWebhook();
        });
    });

    document.getElementById("anuncio").addEventListener("click", () => {
        window.location.href = "anuncio.html";
    });

    document.getElementById("criarNovoConjunto").addEventListener("click", () => {
        chamarWebhookConjunto();
    });

    document.getElementById("cancelarBtn").addEventListener("click", () => {
        formContainer.style.display = "none";
        backgroundBlur.style.display = "none";
    });


    // Data de término
    document.getElementById('incluirTermino').addEventListener('change', function () {
        const terminoContainer = document.querySelector('.termino-container');
        if (this.checked) {
            terminoContainer.style.display = 'block';
            document.getElementById('dataTermino').value = document.getElementById('dataInicio').value;
        } else {
            terminoContainer.style.display = 'none';
        }
    });

    document.getElementById('dataInicio').addEventListener('change', function () {
        const dataTermino = document.getElementById('dataTermino');
        if (dataTermino.value < this.value) {
            dataTermino.value = this.value;
        }
        dataTermino.min = this.value;
    });

    document.getElementById("criarNovoConjunto").addEventListener("click", handleCreateNewAdSet);

}

// ==============================================
// HANDLERS DE EVENTOS
// ==============================================
function handleFormSubmit(e) {
    e.preventDefault();

    formData = {
        nomeCampanha: document.getElementById("nomeCampanha").value,
        localConversao: document.getElementById("localConversao").value,
        orcamento: document.getElementById("orcamento").value,
        valor: document.getElementById("valor").value,
        dataInicio: document.getElementById("dataInicio").value,
        horaInicio: document.getElementById("horaInicio").value,
        incluirTermino: document.getElementById("incluirTermino").checked,
        dataTermino: document.getElementById("incluirTermino").checked ? document.getElementById("dataTermino").value : null,
        horaTermino: document.getElementById("incluirTermino").checked ? document.getElementById("horaTermino").value : null,
        localizacao: document.getElementById("localizacao").value,
        idioma: document.getElementById("idioma").value,
        idadeMin: document.getElementById("idadeMin").value,
        idadeMax: document.getElementById("idadeMax").value,
        genero: document.getElementById("genero").value
    };

    console.log("Dados do formulário:", formData);

    formContainer.style.display = "none";
    backgroundBlur.style.display = "none";
}

async function handleCreateNewAdSet() {
    const container = document.getElementById("pergunta-upload");

    // Mostrar loading enquanto busca os dados
    container.innerHTML = `
        <div class="upload-pergunta">
            <p>Buscando campanhas disponíveis...</p>
            <div class="loading-spinner"></div>
        </div>
    `;

    try {
        // 1. Obter as campanhas via API Meta
        const campaigns = await fetchMetaCampaigns();

        // 2. Exibir as campanhas encontradas
        container.innerHTML = `
            <div class="upload-pergunta">
                <h3>Selecione uma Campanha Existente</h3>
                <p>Escolha a campanha para vincular o novo conjunto de anúncios:</p>
                <div id="campaignsList" class="campaigns-grid"></div>
            </div>
        `;

        // 3. Preencher a lista de campanhas
        const campaignsList = document.getElementById("campaignsList");
        campaigns.forEach(campaign => {
            const card = document.createElement('div');
            card.className = 'campaign-card';
            card.dataset.id = campaign.id;
            card.innerHTML = `
                <h4>${campaign.name}</h4>
                <p><strong>Objetivo:</strong> ${campaign.objective}</p>
                <p><strong>Status:</strong> ${campaign.status}</p>
                <p><strong>Orçamento:</strong> ${campaign.daily_budget || 'Não definido'}</p>
                <button class="select-campaign-btn" data-id="${campaign.id}">Selecionar</button>
            `;
            campaignsList.appendChild(card);
        });

        // 4. Adicionar eventos aos botões de seleção
        document.querySelectorAll('.select-campaign-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const campaignId = e.target.getAttribute('data-id');
                await createNewAdSetForCampaign(campaignId);
            });
        });

    } catch (error) {
        container.innerHTML = `
            <div class="upload-pergunta error">
                <p>Erro ao buscar campanhas:</p>
                <p class="error-message">${error.message}</p>
                <button class="option-btn" onclick="handleCreateNewAdSet()">Tentar novamente</button>
            </div>
        `;
    }
}



initialize();

async function chamarWebhook() {
    // Obter os valores do formulário
    const idConta = document.getElementById("idConta").value;
    const orcamento = document.getElementById("orcamento").value;
    const idPagina = document.getElementById("idPagina").value;
    const url_destino = document.getElementById("idcriativo").value;
    const arquivoCriativoFile = document.getElementById("arquivoCriativo").files[0];
    const infosCliente = document.getElementById("briefingCliente").value;

    const urlImagem = await enviarImagemParaImgur(arquivoCriativoFile);


    const dadosParaEnviar = {
        briefing: briefing,  
        formData: {         
            idConta: idConta,
            orcamento: orcamento,
            idPagina: idPagina,
            criativo:  urlImagem,
            url_destino: url_destino,
            infosCliente: infosCliente
        }
    };


    // Chamar o webhook
    fetch("https://hook.us2.make.com/to846ysrx3ggnpydzaroxwu3l7692eev", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(dadosParaEnviar)
    })
        .then(res => {
            if (!res.ok) {
                throw new Error(`Erro HTTP! status: ${res.status}`);
            }
            return res.json();
        })
        .then(data => {
            console.log("Resposta do webhook:", data);
            alert("Dados enviados com sucesso para o webhook!");
        })
        .catch(err => {
            console.error("Erro ao chamar webhook:", err);
        });
}


function enviarImagemParaImgur(arquivo) {
  return new Promise((resolve, reject) => {
    if (!arquivo) {
      reject("Nenhum arquivo selecionado");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(",")[1]; 
      
      fetch("https://api.imgur.com/3/image", {
        method: "POST",
        headers: {
          Authorization: "Client-ID 51c112e0a44c372",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          image: base64,
          type: "base64"
        }),
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          resolve(data.data.link); 
        } else {
          reject(data.data.error || "Erro ao enviar para Imgur");
        }
      })
      .catch(err => reject(err));
    };
    reader.onerror = () => reject("Erro ao ler arquivo");
    reader.readAsDataURL(arquivo);
  });
}
