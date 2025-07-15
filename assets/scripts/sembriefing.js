let paginasDisponiveis = [];

const briefingGeneratorModal = document.getElementById('briefingGeneratorModal');
const aiBriefingForm = document.getElementById('aiBriefingForm');
const aiGeneratedBriefingDiv = document.getElementById('aiGeneratedBriefing');
const aiBriefingOutputTextarea = document.getElementById('aiBriefingOutput');
const aiLoadingIndicator = document.getElementById('aiLoadingIndicator');
const aiGenerateBriefingBtn = document.getElementById('aiGenerateBriefingBtn');
const aiCopyBriefingBtn = document.getElementById('aiCopyBriefingBtn');
const useGeneratedBriefingBtn = document.getElementById('useGeneratedBriefingBtn');

// Inicializa o sistema e configura eventos
async function initialize() {
  displayAdAccounts();
  setupEventListeners();
  setupModalEventListeners();
}

// Configura eventos principais
function setupEventListeners() {
  const criarNovaCampanhaBtn = document.getElementById("criarNovaCampanha");
  if (criarNovaCampanhaBtn) {
    criarNovaCampanhaBtn.addEventListener("click", () => {
      if (!userAccessToken) {
        alert("Por favor, primeiro salve um token de acesso válido.");
        return;
      }
      renderizarFormularioCriacao();
    });
  }
}

// Configura eventos do modal
function setupModalEventListeners() {
  if (closeBriefingModalBtn) {
    closeBriefingModalBtn.addEventListener('click', closeBriefingGeneratorModal);
  }
  if (briefingGeneratorModal) {
    // Close modal if clicking outside the content area
    briefingGeneratorModal.addEventListener('click', (e) => {
      if (e.target === briefingGeneratorModal) {
        closeBriefingGeneratorModal();
      }
    });
  }
  if (aiBriefingForm) {
    aiBriefingForm.addEventListener('submit', generateBriefingFromAI);
  }
  if (aiCopyBriefingBtn) {
    aiCopyBriefingBtn.addEventListener('click', copyAIBriefing);
  }
  if (useGeneratedBriefingBtn) {
    useGeneratedBriefingBtn.addEventListener('click', useGeneratedBriefing);
  }
}

initialize(); 


// ===================================================
// LISTING AD ACCOUNTS (Existing functionality)
// ===================================================
async function listarTodasContasDeAnuncios() {
  try {
    const response = await fetch('/api/meta/full-info');
    const result = await response.json();

    // Aqui está a forma correta de extrair os dados
    const businessesData = result.businesses || [];
    const userAccountsData = result.adAccounts || [];
    const pagesData = result.pages || [];

    let todasContas = [];

    businessesData.forEach(business => {
      business.owned_ad_accounts?.data?.forEach(account => {
        todasContas.push({ ...account, business_manager: business.name, business_manager_id: business.id, tipo: 'owned' });
      });
      business.client_ad_accounts?.data?.forEach(account => {
        todasContas.push({ ...account, business_manager: business.name, business_manager_id: business.id, tipo: 'owned' });
      });
    });

    userAccountsData.forEach(account => {
      todasContas.push({ ...account, business_manager: 'Vinculada diretamente', tipo: 'direct' });
    });

    const contasUnicas = Array.from(new Set(todasContas.map(a => a.id)))
      .map(id => todasContas.find(a => a.id === id));

    return {
      sucesso: true,
      mensagem: `Encontradas ${contasUnicas.length} contas de anúncios.`,
      contas: contasUnicas,
      paginas: pagesData
    };

  } catch (error) {
    return {
      sucesso: false,
      mensagem: `Erro de conexão: ${error.message}`,
      contas: [],
      paginas: []
    };
  }
}

async function displayAdAccounts() {
  const container = document.getElementById('accountsContainer');
  container.innerHTML = '<p class="message">Carregando todas as contas de anúncios...</p>';

  const result = await listarTodasContasDeAnuncios();
  container.innerHTML = ''; // Clear loading message

  if (result.sucesso && result.contas.length > 0) {
    paginasDisponiveis = result.paginas; // Update global pages variable

    result.contas.forEach(account => {
      const card = document.createElement('div');
      card.className = 'ad-account-card';
      card.innerHTML = `
                <h3>${account.name}</h3>
                <p><strong>ID:</strong> ${account.id}</p>
                <p><strong>Business Manager:</strong> ${account.business_manager}</p>
                <button class="btn-criar-campanha" data-id="${account.id}" data-nome="${account.name}">
                    Criar Campanha
                </button>
            `;

      card.querySelector(".btn-criar-campanha").addEventListener("click", () => {
        prepararCriacaoCampanha(account); // Call with account details
      });

      container.appendChild(card);
    });
    setupFiltroContas();
  } else {
    container.innerHTML = `<p class="${result.sucesso ? 'message' : 'error-message'}">${result.mensagem}</p>`;
  }
}

// Function to filter displayed accounts by typed text
function aplicarFiltroContas() {
  const filtro = document.getElementById('filtroContas').value.toLowerCase();
  const container = document.getElementById('accountsContainer');
  const cards = container.querySelectorAll('.ad-account-card');

  cards.forEach(card => {
    const textoCard = card.textContent.toLowerCase(); // Search full card text

    if (textoCard.includes(filtro)) {
      card.style.display = ''; // Show card
    } else {
      card.style.display = 'none'; // Hide card
    }
  });
}

// Setup input to filter as user types
function setupFiltroContas() {
  const filtroInput = document.getElementById('filtroContas');
  if (filtroInput) {
    filtroInput.addEventListener('input', aplicarFiltroContas);
  }
}


// ===================================================
// MAIN CAMPAIGN CREATION FORM (Existing functionality, modified)
// ===================================================
async function prepararCriacaoCampanha(account) {
  let paginasDaConta = [];

  if (account.tipo !== 'direct') {
    try {
      const res = await fetch(`/api/meta/owned-pages/${account.business_manager_id}`);
      if (!res.ok) throw new Error('Erro na requisição de páginas');
      paginasDaConta = await res.json();
    } catch (e) {
      console.warn("Erro ao buscar páginas do BM:", e);
    }
  } else {
    paginasDaConta = paginasDisponiveis;
  }

  renderizarFormularioCriacao(account.id, paginasDaConta);

  setTimeout(() => {
    const formulario = document.getElementById("formCampanha");
    if (formulario) {
      formulario.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, 200);
}

function renderizarFormularioCriacao(idContaSelecionada = "", paginas = []) {
  const containerFormulario = document.getElementById("containerFormulario");
  containerFormulario.innerHTML = `
        <form id="formCampanha">
            <label for="idConta">ID da conta de anúncio:</label><br>
            <input type="text" id="idConta" name="idConta" required value="${idContaSelecionada}"><br><br>

            <label for="idPagina">Selecione a Página:</label><br>
            <select id="idPagina" name="idPagina" required>
                <option value="">Carregando páginas...</option>
            </select><br><br>

            <label for="idcriativo">Link da página de destino:</label><br>
            <input type="text" id="idcriativo" name="idcriativo" required><br><br>

            <label for="arquivoCriativo">Arquivo do criativo:</label><br>
            <input type="file" id="arquivoCriativo" name="arquivoCriativo" required><br><br>

            <label for="briefingCliente">Briefing resumido do cliente:</label><br>
            <div class="briefing-input-group">
                <textarea id="briefingCliente" name="briefingCliente" rows="10" cols="50"></textarea>
                <button type="button" id="openBriefingGenerator" class="btn-generate-briefing">Gerar com IA</button>
            </div>
            <br><br>

            <button type="submit">Enviar</button>
        </form>
    `;

  // Populate the page dropdown after HTML insertion
  popularDropdownPaginas(paginas);

  const formCampanha = document.getElementById("formCampanha");
  if (formCampanha) {
    formCampanha.addEventListener("submit", (event) => {
      event.preventDefault();
      chamarWebhook();
    });
  }

  // Attach event listener to the new "Gerar com IA" button inside the main form
  const openBriefingGeneratorBtn = document.getElementById('openBriefingGenerator');
  if (openBriefingGeneratorBtn) {
    openBriefingGeneratorBtn.addEventListener('click', openBriefingGeneratorModal);
  }
}


function popularDropdownPaginas(paginas) {
  const select = document.getElementById("idPagina");
  if (!select) return;

  select.innerHTML = "<option value=''>Selecione uma página</option>";
  paginas.forEach(pagina => {
    const option = document.createElement("option");
    option.value = pagina.id;
    option.textContent = `${pagina.name} (${pagina.id})`;
    select.appendChild(option);
  });
}

// ===================================================
// MODAL FUNCTIONS (New functionality)
// ===================================================

/**
 * Opens the AI Briefing Generator modal.
 * Resets the form and hides previous results/loading indicators.
 */
function openBriefingGeneratorModal() {
  if (briefingGeneratorModal) {
    briefingGeneratorModal.style.display = 'flex'; // Show modal

    // Reset modal state
    if (aiBriefingForm) aiBriefingForm.reset(); // Clear modal form fields
    if (aiGeneratedBriefingDiv) aiGeneratedBriefingDiv.style.display = 'none'; // Hide generated briefing area
    if (aiBriefingOutputTextarea) aiBriefingOutputTextarea.value = ''; // Clear generated text
    if (aiLoadingIndicator) aiLoadingIndicator.style.display = 'none'; // Hide loading indicator
    if (aiGenerateBriefingBtn) aiGenerateBriefingBtn.disabled = false; // Enable generate button
  }
}


function closeBriefingGeneratorModal() {
  if (briefingGeneratorModal) {
    briefingGeneratorModal.style.display = 'none'; 
  }
}


async function generateBriefingFromAI(event) {
  event.preventDefault(); // Prevent default form submission

  // Collect values from the modal's form fields
  const clientName = document.getElementById('aiClientName').value;
  const campaignGoal = document.getElementById('aiCampaignGoal').value;
  const monthlyBudget = document.getElementById('aiMonthlyBudget').value;
  const targetAudience = document.getElementById('aiTargetAudience').value;
  const mainServices = document.getElementById('aiMainServices').value;
  const companyDifferentials = document.getElementById('aiCompanyDifferentials').value;
  const companyWebsite = document.getElementById('aiCompanyWebsite').value;
  const companyInstagram = document.getElementById('aiCompanyInstagram').value;
  const campaignGeographicArea = document.getElementById('aiCampaignGeographicArea').value;
  const otherObservations = document.getElementById('aiOtherObservations').value;

  // Show loading indicator, hide generated briefing, disable button
  if (aiGeneratedBriefingDiv) aiGeneratedBriefingDiv.style.display = 'none';
  if (aiLoadingIndicator) aiLoadingIndicator.style.display = 'flex';
  if (aiGenerateBriefingBtn) aiGenerateBriefingBtn.disabled = true;
  if (aiBriefingOutputTextarea) aiBriefingOutputTextarea.value = ''; // Clear previous output

  // Construct the prompt for ChatGPT
  const prompt = `Você é um analista sênior da Acesso Marketing, especialista em campanhas de Meta Ads com foco em geração de leads e performance.

Com base no briefing abaixo, elabore um **plano estratégico completo de campanha**, combinando boas práticas da plataforma Meta Ads com inteligência de marketing. Siga o modelo abaixo, usando linguagem clara, profissional e focada em resultados.

---

## 📄 Briefing Inicial

Cliente: ${clientName}
Objetivo da Campanha: ${campaignGoal}
Orçamento Total Mensal: R$ ${monthlyBudget}
Público-Alvo / ICP: ${targetAudience}
Serviços Principais: ${mainServices}
${companyDifferentials ? `Principais Diferenciais da Empresa: ${companyDifferentials}` : ''}
${companyWebsite ? `Site da Empresa: ${companyWebsite}` : ''}
${companyInstagram ? `Instagram da Empresa: ${companyInstagram}` : ''}
${campaignGeographicArea ? `Área Geográfica das Campanhas: ${campaignGeographicArea}` : ''}
${otherObservations ? `Outras Observações da Empresa: ${otherObservations}` : ''}

---

## ✅ Sua resposta deve conter os seguintes tópicos estruturados em Markdown:

### 1. Resumo Executivo
Descreva o cenário geral da empresa, seu objetivo com a campanha e os pontos mais relevantes da estratégia.

### 2. Background do Cliente
Inclua os serviços oferecidos, diferenciais, presença digital e maturidade da conta.

### 3. Objetivos da Campanha (modelo SMART)
Defina os objetivos de forma específica, mensurável, alcançável, relevante e com prazo definido.

### 4. Orçamento e Distribuição de Verba
Distribua a verba mensal total considerando as proporções recomendadas:
- **60-70%** para público frio
- **20-25%** para remarketing
- **10-15%** para topo de funil (crescimento de perfil)
Inclua também a necessidade de manter a verba mínima por conjunto para evitar limitação no aprendizado.

### 5. Segmentação Estratégica
Defina segmentações conforme o nível do funil:
- **Frio**: interesses diretos, amplos e sinais de vida
- **Remarketing**: CRM, visitantes do site/vídeo 95%, engajamento social

### 6. Estrutura da Campanha
Recomende os tipos de campanha ideais (ex: Conversão, Lead Ads, CTWA, Impulsionamento), com justificativas para cada um.

### 7. Criativos por Etapa do Funil
- **Topo**: reels, vídeos curtos, conteúdos emocionais ou virais
- **Meio**: dicas, bastidores, provas sociais
- **Fundo**: depoimentos, ofertas diretas, CTA urgentes

### 8. Mensagens-Chave e Proposta de Valor
Crie sugestões de mensagens impactantes para cada etapa, alinhadas aos diferenciais da empresa.

### 9. Chamada para Ação (CTA)
Recomende CTAs específicos para cada tipo de campanha e etapa do funil.

### 10. Otimização e Testes
Sugira testes A/B relevantes (ex: criativos, formulário simples vs qualificado, LP vs Lead Form) e oriente boas práticas (uso de CBO, evitar edições durante aprendizado).

### 11. Métricas de Sucesso
Apresente as principais métricas a serem acompanhadas e os benchmarks ideais:
- **CPC esperado**: R$0,50 - R$3
- **CTR**: 0,7% - 2%
- **Conversão LP**: acima de 30%
- **Conversão checkout**: entre 10% e 17%

### 12. Recomendações Finais
Inclua considerações com base em histórico de campanhas, estágio do negócio ou maturidade digital.

---

Formate tudo utilizando Markdown (**negrito**, listas com '-', subtítulos com '###'). Seja objetivo, mas completo.`;


  try {
    const response = await fetch('/api/gerar-briefing', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt })
    });


    const data = await response.json();

    if (response.ok) {
      const generatedText = data.choices[0].message.content;
      if (aiBriefingOutputTextarea) {
        aiBriefingOutputTextarea.value = generatedText;
        aiBriefingOutputTextarea.removeAttribute('readonly'); // Allow editing
      }
      if (aiGeneratedBriefingDiv) aiGeneratedBriefingDiv.style.display = 'block'; // Display the generated briefing area
    } else {
      const errorMessage = data.error?.message || "Erro desconhecido da API da OpenAI.";
      if (aiBriefingOutputTextarea) {
        aiBriefingOutputTextarea.value = `Erro ao gerar briefing: ${errorMessage}`;
        aiBriefingOutputTextarea.setAttribute('readonly', 'true'); // Keep readonly on error
      }
      console.error('Error from OpenAI API:', data.error);
      if (aiGeneratedBriefingDiv) aiGeneratedBriefingDiv.style.display = 'block'; // Still display to show error
    }

  } catch (error) {
    if (aiBriefingOutputTextarea) {
      aiBriefingOutputTextarea.value = `Erro de conexão: ${error.message}`;
      aiBriefingOutputTextarea.setAttribute('readonly', 'true'); // Keep readonly on error
    }
    console.error('Fetch error:', error);
    if (aiGeneratedBriefingDiv) aiGeneratedBriefingDiv.style.display = 'block'; // Still display to show error
  } finally {
    if (aiLoadingIndicator) aiLoadingIndicator.style.display = 'none'; // Hide loading indicator
    if (aiGenerateBriefingBtn) aiGenerateBriefingBtn.disabled = false; // Re-enable generate button
  }
}


function copyAIBriefing() {
  if (aiBriefingOutputTextarea) {
    aiBriefingOutputTextarea.select();
    aiBriefingOutputTextarea.setSelectionRange(0, 99999); 

    try {
      document.execCommand('copy');
      alert('Briefing copiado para a área de transferência!');
    } catch (err) {
      console.error('Falha ao copiar o briefing: ', err);
      alert('Não foi possível copiar o briefing. Por favor, copie manualmente.');
    }
  }
}

function useGeneratedBriefing() {
  const mainBriefingClienteTextarea = document.getElementById('briefingCliente');
  if (mainBriefingClienteTextarea && aiBriefingOutputTextarea) {
    mainBriefingClienteTextarea.value = aiBriefingOutputTextarea.value; 
    closeBriefingGeneratorModal(); 
  }
}


// ===================================================
// WEBHOOK + IMGUR (Existing functionality)
// ===================================================
async function chamarWebhook() {
  const idConta = document.getElementById("idConta").value;
  const idPagina = document.getElementById("idPagina").value;
  const url_destino = document.getElementById("idcriativo").value;
  const infosCliente = document.getElementById("briefingCliente").value;

  try {
    
    const dadosParaEnviar = {
      formData: {
        idConta,
        idPagina,
        url_destino,
        infosCliente
      }

    };

    const response = await fetch("/api/enviar-webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dadosParaEnviar)
    });


    if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);

    const data = await response.json();
    console.log("Resposta do webhook:", data);
    alert("Dados enviados com sucesso para o Agente Thiaguito!");

  } catch (err) {
    console.error("Erro ao chamar webhook:", err);
    alert("Erro ao enviar dados para o Agente Thiaguito.");
  }
}
