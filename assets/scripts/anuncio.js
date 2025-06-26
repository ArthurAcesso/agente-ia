const SHEET_ID = '1g_uwMSpHnKaiBbJB66EMeh3vg5nY95LQENLFBMT22OA';
const SHEET_RANGE = 'Respostas ao formulário 1';
const GOOGLE_API_KEY = 'AIzaSyB5xusUGM3Kn4yPLubbSEMURp2AC3L9SIU';
const ACCESS_TOKEN = 'EAATSMRltA1IBO5v3sxw7nWkzpHtHVFkig6uYtNgz1oTA5J1vqNS8kj0ivaZB9IZByZBxSiuOyTu7VuXZC830Av8wmZAqrK28uNNk1rVSkRmiMp2oxcdBZCoIkJ0AyKyAbatq9HlUgnFIlR0qOhIopJpHZAZCRtP2Li0l6GruIK8CYzZB0YZBxt0DZBZA';
const META_API_VERSION = 'v19.0';

// ==============================================
// CONFIGURAÇÕES (MOVENDO PARA VARIÁVEIS DE AMBIENTE EM PRODUÇÃO)
// ==============================================
const CONFIG = {
    SHEET_ID: '1g_uwMSpHnKaiBbJB66EMeh3vg5nY95LQENLFBMT22OA',
    SHEET_RANGE: 'Respostas ao formulário 1',
    META_API_VERSION: 'v19.0',
    GOOGLE_API_KEY: 'AIzaSyB5xusUGM3Kn4yPLubbSEMURp2AC3L9SIU'
};



// ==============================================
// ELEMENTOS DO DOM
// ==============================================
const DOM = {
    loading: document.getElementById('loading'),
    results: document.getElementById('results'),
    campaignsContainer: document.getElementById('campaignsContainer'),
    adsetsContainer: document.getElementById('adsetsContainer'),
    idContaInput: document.getElementById('idConta'),
    enviarBtn: document.getElementById('enviarBtn')
};

// ==============================================
// ESTADO DA APLICAÇÃO
// ==============================================


// ==============================================
// INICIALIZAÇÃO
// ==============================================
document.addEventListener('DOMContentLoaded', () => {
    initUI();
    setupEventListeners();
});

function initUI() {
    DOM.loading.style.display = 'none';
    DOM.results.style.display = 'none';
}

function setupEventListeners() {
    DOM.enviarBtn.addEventListener('click', handleSubmit);
}

// ==============================================
// FUNÇÕES PRINCIPAIS
// ==============================================
async function handleSubmit() {
    try {
        state.AD_ACCOUNT_ID = DOM.idContaInput.value.trim();

        if (!state.AD_ACCOUNT_ID) {
            alert("Por favor, insira o ID da conta!");
            return;
        }

        showLoading(true);
        clearResults();

        const campaigns = await fetchMetaCampaigns();
        renderCampaigns(campaigns);
        showResults();

    } catch (error) {
        console.error("Erro:", error);
        renderError(`Ocorreu um erro: ${error.message}`);
    } finally {
        showLoading(false);
    }
}

// ==============================================
// FUNÇÕES DE API
// ==============================================
async function fetchMetaCampaigns() {
    const url = buildApiUrl('campaigns', 'id,name,objective,status,start_time,stop_time,daily_budget');
    const data = await fetchApiData(url);
    return data || [];
}

async function fetchMetaAdSets() {
    const url = buildApiUrl('adsets', 'id,name,targeting,daily_budget,status,campaign_id');
    const data = await fetchApiData(url);
    return data || [];
}

async function fetchCampaignAds(campaignId) {
    const url = buildApiUrl('ads', 'name,status,creative', `campaign_id=${campaignId}`);
    const data = await fetchApiData(url);
    return data || [];
}

function buildApiUrl(endpoint, fields, additionalParams = '') {
    return `https://graph.facebook.com/${CONFIG.META_API_VERSION}/act_${state.AD_ACCOUNT_ID}/${endpoint}?fields=${fields}&access_token=${state.ACCESS_TOKEN}&${additionalParams}`;
}

async function fetchApiData(url) {
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
        throw new Error(data.error.message);
    }

    return data.data;
}

// ==============================================
// FUNÇÕES DE RENDERIZAÇÃO
// ==============================================
function renderCampaigns(campaigns) {
    DOM.campaignsContainer.innerHTML = '<h3>Campanhas</h3>';

    if (!campaigns.length) {
        DOM.campaignsContainer.innerHTML += '<p>Nenhuma campanha encontrada.</p>';
        return;
    }

    campaigns.forEach(campaign => {
        const campaignElement = document.createElement('div');
        campaignElement.className = 'campaign-card';
        campaignElement.innerHTML = `
            <div class="campaign-header">
                <h4>${campaign.name}</h4>
                <span class="status-badge ${campaign.status.toLowerCase()}">${campaign.status}</span>
            </div>
            <div class="campaign-details">
                <p><strong>ID:</strong> ${campaign.id}</p>
                <p><strong>Objetivo:</strong> ${translateObjective(campaign.objective)}</p>
                <p><strong>Orçamento:</strong> ${formatCurrency(campaign.daily_budget)}/dia</p>
                <p><strong>Período:</strong> ${formatDate(campaign.start_time)} - ${campaign.stop_time ? formatDate(campaign.stop_time) : 'Sem data final'}</p>
            </div>
            <button class="btn-view-ads" data-campaign-id="${campaign.id}">Ver Anúncios</button>
            <button class="btn-view-adsets" data-campaign-id="${campaign.id}">Ver Conjuntos de Anúncios</button>
            <div class="ads-container" id="ads-${campaign.id}"></div>
            <div class="adsets-container" id="adsets-${campaign.id}"></div>
        `;

        campaignElement.querySelector('.btn-view-ads').addEventListener('click', async (e) => {
            await handleViewAdsClick(e, campaign.id);
        });

        campaignElement.querySelector('.btn-view-adsets').addEventListener('click', async (e) => {
            await handleViewAdSetsClick(e, campaign.id);
        });

        DOM.campaignsContainer.appendChild(campaignElement);
    });
}

async function fetchAdSetsByCampaign(campaignId) {
    const url = `https://graph.facebook.com/${CONFIG.META_API_VERSION}/${campaignId}/adsets?fields=id,name,targeting,daily_budget,status,campaign_id&access_token=${CONFIG.ACCESS_TOKEN}`;
    const data = await fetchApiData(url);
    return data || [];
}

campaignElement.querySelector('.btn-view-adsets').addEventListener('click', async (e) => {
    await handleViewAdSetsClick(e, campaign.id);
});

async function handleViewAdSetsClick(e, campaignId) {
    const button = e.target;
    const container = document.getElementById(`adsets-${campaignId}`);

    if (container.innerHTML) {
        container.innerHTML = '';
        button.textContent = 'Ver Conjuntos de Anúncios';
        return;
    }

    button.textContent = 'Carregando...';

    try {
        const adSets = await fetchAdSetsByCampaign(campaignId);
        renderAdSets(adSets, container);
        button.textContent = 'Ocultar Conjuntos de Anúncios';
    } catch (error) {
        container.innerHTML = `<p class="error">Erro: ${error.message}</p>`;
        button.textContent = 'Tentar Novamente';
    }
}


async function handleViewAdsClick(e, campaignId) {
    const button = e.target;
    const adsContainer = document.getElementById(`ads-${campaignId}`);

    if (adsContainer.innerHTML) {
        adsContainer.innerHTML = '';
        button.textContent = 'Ver Anúncios';
        return;
    }

    button.textContent = 'Carregando...';

    try {
        const ads = await fetchCampaignAds(campaignId);
        renderAds(ads, adsContainer);
        button.textContent = 'Ocultar Anúncios';
    } catch (error) {
        adsContainer.innerHTML = `<p class="error">Erro: ${error.message}</p>`;
        button.textContent = 'Tentar Novamente';
    }
}

function renderAdSets(adSets, container) {
    if (!adSets.length) {
        container.innerHTML = '<p>Nenhum conjunto encontrado.</p>';
        return;
    }

    container.innerHTML = '<h4>Conjuntos de Anúncios:</h4>';
    adSets.forEach(adSet => {
        const adSetElement = document.createElement('div');
        adSetElement.className = 'adset-card';
        adSetElement.innerHTML = `
                <h4>${adSet.name}</h4>
                <div class="adset-details">
                    <p><strong>ID:</strong> ${adSet.id}</p>
                    <p><strong>Status:</strong> ${adSet.status}</p>
                    <p><strong>Orçamento:</strong> ${formatCurrency(adSet.daily_budget)}/dia</p>
                    <p><strong>Campanha:</strong> ${adSet.campaign_id}</p>
                    <button class="btn-create-ad" data-adset-id="${adSet.id}">Criar anúncio</button>
                </div>
            `;
        container.appendChild(adSetElement);

        // Adiciona o listener após inserir no DOM
        adSetElement.querySelector('.btn-create-ad').addEventListener('click', async (e) => {
            const adSetId = e.target.dataset.adsetId;
            await handleCreateAdClick(adSetId);
        });
    });
}

async function handleCreateAdClick(adSetId) {
    try {
        // Verificar se o modal já existe
        if (document.getElementById('adFormModal')) {
            document.body.removeChild(document.getElementById('adFormModal'));
        }

        // Criar formulário dinâmico com classes CSS
        const formHtml = `
            <div id="adFormModal" class="modal-overlay" style="display: none;">
                <div class="modal-container">
                    <div class="modal-header">
                        <h2>Configuração do Anúncio</h2>
                        <button id="closeModalBtn" class="icon-button">
                            ✕
                        </button>
                    </div>
                    <form id="adForm" class="ad-form">
                        <div class="form-section">
                            <h3>Informações Básicas</h3>
                            
                            <div class="form-field">
                                <label for="pageId">ID da Página:</label>
                                <input type="text" id="pageId" required>
                            </div>
                            
                            <div class="form-field">
                                <label for="adName">Nome do Anúncio:</label>
                                <input type="text" id="adName" required>
                            </div>
                        </div>
                        
                        <div class="form-section">
                            <h3>Conteúdo do Anúncio</h3>
                            
                            <div class="form-field">
                                <label for="adMessage">Mensagem:</label>
                                <textarea id="adMessage" required></textarea>
                            </div>
                            
                            <div class="form-field">
                                <label for="adCaption">Legenda:</label>
                                <input type="text" id="adCaption">
                            </div>
                            
                            <div class="form-field">
                                <label for="adImageUrl">URL da Imagem:</label>
                                <input type="url" id="adImageUrl" required>
                                <div id="imagePreview" class="image-preview"></div>
                            </div>
                            
                            <div class="form-field">
                                <label for="adLink">URL de Destino:</label>
                                <input type="url" id="adLink" required>
                            </div>
                            
                            <div class="form-field">
                                <label for="callToAction">Call to Action:</label>
                                <select id="callToAction" required>
                                    <option value="SHOP_NOW">Comprar Agora</option>
                                    <option value="LEARN_MORE">Saiba Mais</option>
                                    <option value="SIGN_UP">Inscreva-se</option>
                                    <option value="BOOK_TRAVEL">Reservar Viagem</option>
                                    <option value="DOWNLOAD">Download</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-actions">
                            <button type="button" id="cancelBtn" class="secondary-button">Cancelar</button>
                            <button type="submit" class="primary-button">
                                <span class="button-loader"></span>
                                Criar Anúncio
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        // Inserir o formulário no DOM
        document.body.insertAdjacentHTML('beforeend', formHtml);

        // Configurar eventos
        const modal = document.getElementById('adFormModal');
        const form = document.getElementById('adForm');
        const cancelBtn = document.getElementById('cancelBtn');
        const closeModalBtn = document.getElementById('closeModalBtn');
        const imageUrlInput = document.getElementById('adImageUrl');
        const imagePreview = document.getElementById('imagePreview');

        // Mostrar modal com animação
        modal.style.display = 'flex';
        setTimeout(() => {
            modal.style.opacity = '1';
        }, 10);

        // Fechar modal com animação
        const closeModal = () => {
            modal.style.opacity = '0';
            setTimeout(() => {
                modal.style.display = 'none';
                document.body.removeChild(modal);
            }, 300);
        };

        cancelBtn.addEventListener('click', closeModal);
        closeModalBtn.addEventListener('click', closeModal);

        // Preview de imagem
        imageUrlInput.addEventListener('input', () => {
            const url = imageUrlInput.value.trim();
            if (url) {
                imagePreview.innerHTML = `<img src="${url}" alt="Preview" onerror="this.style.display='none'">`;
                imagePreview.classList.add('has-image');
            } else {
                imagePreview.innerHTML = '';
                imagePreview.classList.remove('has-image');
            }
        });

        // Processar envio do formulário
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Validação dos campos
            let isValid = true;
            const requiredFields = form.querySelectorAll('[required]');

            requiredFields.forEach(field => {
                if (!field.value.trim()) {
                    field.style.borderColor = 'red';
                    isValid = false;
                } else {
                    field.style.borderColor = '';
                }
            });

            if (!isValid) {
                alert('Por favor, preencha todos os campos obrigatórios!');
                return;
            }

            const formData = {
                adAccountId: state.AD_ACCOUNT_ID,
                accessToken: state.ACCESS_TOKEN,
                adSetId: adSetId, // Adicionando o adSetId que veio do clique
                name: document.getElementById('adName').value,
                object_story_spec: {
                    page_id: document.getElementById('pageId').value,
                    link_data: {
                        message: document.getElementById('adMessage').value,
                        link: document.getElementById('adLink').value,
                        caption: document.getElementById('adCaption').value,
                        picture: document.getElementById('adImageUrl').value,
                        call_to_action: {
                            type: document.getElementById('callToAction').value
                        }
                    }
                }
            };

            console.log(formData);


            try {
                // Mostrar loading
                const submitBtn = form.querySelector('.primary-button');
                submitBtn.disabled = true;
                submitBtn.querySelector('.button-loader').style.display = 'inline-block';

                // 1. Primeiro criar o criativo
                // 1. Criar o criativo
                const creativeResponse = await criarCriativo({
                    adAccountId: formData.adAccountId,
                    name: formData.name,
                    page_id: formData.page_id,
                    message: formData.message,
                    link: formData.link,
                    caption: formData.caption,
                    picture: formData.picture,
                    call_to_action_type: formData.call_to_action_type,
                    access_token: formData.accessToken
                });

                console.log("Criativo criado:", creativeResponse);

                // 2. Depois criar o anúncio associando ao adset
                const adData = {
                    adAccountId: formData.adAccountId,
                    accessToken: formData.accessToken,
                    adset_id: formData.adSetId,
                    creative_id: creativeResponse.id,
                    name: formData.name,
                    status: "PAUSED"
                };

                alert('Anúncio criado com sucesso! ID: ' + response.id);
                closeModal();
            } catch (error) {
                console.error('Erro ao criar anúncio:', error);
                alert('Erro ao criar anúncio: ' + (error.message || 'Verifique os dados e tente novamente'));
            } finally {
                const submitBtn = form.querySelector('.primary-button');
                submitBtn.disabled = false;
                submitBtn.querySelector('.button-loader').style.display = 'none';
            }
        });

        // Fechar modal ao clicar fora
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });

    } catch (error) {
        console.error(error);
        alert('Erro ao abrir formulário de criação de anúncio.');
    }
}

// Função para criar o criativo (adcreative)
async function criarCriativo(creativeData) {
    try {
        // Construir o object_story_spec corretamente
        const objectStorySpec = {
            "page_id": creativeData.page_id,
            "link_data": {
                "message": creativeData.message,
                "link": creativeData.link,
                "caption": creativeData.caption || "", // Opcional
                "picture": creativeData.picture,
                "call_to_action": {
                    "type": creativeData.call_to_action_type
                }
            }
        };

        // Corpo da requisição no formato JSON
        const requestBody = {
            name: creativeData.name,
            object_story_spec: objectStorySpec,
            access_token: creativeData.access_token,
            status: 'PAUSED'
        };

        const url = `https://graph.facebook.com/v19.0/act_${creativeData.adAccountId}/adcreatives`;

        // Enviar a requisição usando fetch com headers de JSON
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json' // Indicando que o corpo da requisição é JSON
            },
            body: JSON.stringify(requestBody) // Convertendo o corpo para JSON
        });

        const responseData = await response.json();

        if (!response.ok) {
            console.error("Erro da API:", responseData);
            throw new Error(responseData.error?.error_user_msg || responseData.error?.message || "Erro ao criar criativo");
        }

        return responseData;
    } catch (error) {
        console.error('Erro na requisição:', error);
        throw new Error(`Falha ao criar criativo: ${error.message}`);
    }
}

async function criarAnuncioMetaAds(json) {
    try {

        const url = `https://graph.facebook.com/${CONFIG.META_API_VERSION}/act_${state.AD_ACCOUNT_ID}/ads`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: json
        });

        const result = await response.json();

        if (result.error) {
            throw new Error(result.error.message);
        }

        return result.id;
    } catch (error) {
        console.error("Ad Creation Failed:", error);
        throw error;
    }
}

// Função fictícia - você precisa implementar a integração real com a API do ChatGPT
async function callChatGPT(prompt) {
    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENAI_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "gpt-4",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.5
            })
        });

        const data = await response.json();
        console.log(data.choices[0].message.content);
        return data.choices[0].message.content;
    } catch (error) {
        console.error("Erro ao chamar OpenAI:", error);
        throw error;
    }
}


function renderTargeting(targeting) {
    if (!targeting) return '';

    return `
        <div class="targeting-info">
            <p><strong>Público:</strong></p>
            <ul>
                <li>Idade: ${targeting.age_min}-${targeting.age_max} anos</li>
                <li>Gênero: ${formatGender(targeting.genders)}</li>
                <li>Localização: ${targeting.geo_locations?.countries?.join(', ') || 'Não definido'}</li>
            </ul>
        </div>
    `;
}

// ==============================================
// FUNÇÕES AUXILIARES
// ==============================================
function formatDate(dateString) {
    return dateString ? new Date(dateString).toLocaleDateString() : 'Não definido';
}

function formatCurrency(value) {
    return value ? `R$ ${(value / 100).toFixed(2)}` : 'Não definido';
}

function translateObjective(objective) {
    const objectives = {
        'OUTCOME_LEADS': 'Geração de Leads',
        'OUTCOME_SALES': 'Vendas',
        'LINK_CLICKS': 'Cliques no Link',
        'REACH': 'Alcance',
        'BRAND_AWARENESS': 'Conscientização da Marca'
    };
    return objectives[objective] || objective;
}

function formatGender(genders) {
    if (!genders) return 'Todos';
    if (genders.includes(1) && genders.includes(2)) return 'Ambos';
    if (genders.includes(1)) return 'Homens';
    if (genders.includes(2)) return 'Mulheres';
    return 'Todos';
}

function showLoading(show) {
    DOM.loading.style.display = show ? 'block' : 'none';
}

function showResults() {
    DOM.results.style.display = 'block';
}

function clearResults() {
    DOM.results.style.display = 'none';
    DOM.campaignsContainer.innerHTML = '';
    DOM.adsetsContainer.innerHTML = '';
}

function renderError(message) {
    DOM.results.innerHTML = `
        <div class="error-message">
            <h3>Erro</h3>
            <p>${message}</p>
            <button onclick="location.reload()">Tentar Novamente</button>
        </div>
    `;
    showResults();
}