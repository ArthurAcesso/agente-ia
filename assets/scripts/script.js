// Configurações iniciais
const SHEET_ID = '1g_uwMSpHnKaiBbJB66EMeh3vg5nY95LQENLFBMT22OA';
const SHEET_RANGE = 'Respostas ao formulário 1';

const generateBtn = document.getElementById("generateBtn");
const briefingsDiv = document.getElementById("briefings");
const resultadoDiv = document.getElementById("resultado");

let selectedBriefing = null;

// --------------------------- FUNÇÕES --------------------------- //

document.getElementById('searchInput').addEventListener('input', function () {
    const searchTerm = this.value.toLowerCase();
    const cards = document.querySelectorAll('.briefing');

    cards.forEach(card => {
        const text = card.innerText.toLowerCase();
        card.style.display = text.includes(searchTerm) ? 'block' : 'none';
    });
});


function exibirMensagemInicial() {
    resultadoDiv.innerText = "⏳ Gerando sugestão com IA...";
}

async function gerarPromptDoBriefing(briefing) {
    const campanhasAnteriores = await buscarCampanhasMetaAds(AD_ACCOUNT_ID, ACCESS_TOKEN);
    const gruposAnuncio = await buscarGruposDeAnuncio(AD_ACCOUNT_ID, ACCESS_TOKEN);

    const briefingTexto = Object.keys(briefing)
        .map(key => `${key}: ${briefing[key]}`)
        .join("\n");

    const exemplosCampanhas = campanhasAnteriores.length > 0
        ? campanhasAnteriores.map((c, i) => `Campanha ${i + 1}:\n${JSON.stringify(c, null, 2)}`).join("\n\n")
        : "Nenhuma campanha anterior disponível.";

    const exemplosGrupos = gruposAnuncio.length > 0
        ? gruposAnuncio.map((g, i) => `Grupo ${i + 1}:\n${JSON.stringify(g, null, 2)}`).join("\n\n")
        : "Nenhum grupo de anúncio disponível.";

    return `
Você é um especialista em tráfego pago.

Aqui estão exemplos de campanhas anteriores criadas para este cliente:
${exemplosCampanhas}

E aqui estão os conjuntos de anúncio disponíveis atualmente:
${exemplosGrupos}

Com base neste novo briefing:

${briefingTexto}

Seu trabalho é:
1. Identificar o grupo de anúncio mais apropriado (baseando-se na segmentação, orçamento e objetivo).
2. Gerar um JSON com os seguintes campos:

{
  "name": "Nome da campanha (baseado no briefing)",
  "objective": "Objetivo da campanha em inglês, ex: OUTCOME_LEADS",
  "status": "PAUSED",
  "special_ad_categories": ["NONE"],
  "adset_id": "ID do grupo de anúncio escolhido"
}

⚠️ IMPORTANTE:
- Apenas retorne o JSON, nada além disso.
- Não coloque dinheiro nas campanhas e nem anúncios de forma alguma.
- Use um valor real de "adset_id" escolhido entre os grupos listados.
`.trim();
}


async function carregarBriefingsDaPlanilha() {
    try {
        const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SHEET_RANGE}?key=${GOOGLE_API_KEY}`);
        const data = await response.json();
        const rows = data.values;

        if (!rows || rows.length === 0) {
            briefingsDiv.innerText = 'Nenhum dado encontrado na planilha.';
            return;
        }

        const headers = rows[0];
        const briefings = rows.slice(1).map(row => {
            return headers.reduce((obj, key, i) => {
                obj[key] = row[i] || '';
                return obj;
            }, {});
        });

        exibirBriefingsNaTela(briefings);
    } catch (err) {
        console.error('Erro ao carregar planilha:', err);
        briefingsDiv.innerText = 'Erro ao carregar dados. Verifique o console.';
    }
}

function exibirBriefingsNaTela(briefings) {
    briefings.forEach((briefing, index) => {
        const div = document.createElement("div");
        div.classList.add('briefing');
        div.innerHTML = `
    <p><strong>${briefing["Nome do Cliente:"] || 'Sem título'}</strong></p>
    <p>Perfil do cliente: ${briefing["Cite algumas informações básicas sobre seu cliente: sexo, faixa etária, etc."] || 'Não especificado'}</p>
    <p>Expectativa de retorno: ${briefing["Quanto você precisa faturar? Qual sua expectativa de retorno com esse investimento? "] || 'Não especificado'}</p>
    <button class="select-btn">Selecionar</button>
`;


        div.querySelector('.select-btn').onclick = () => {
            localStorage.setItem('briefingSelecionado', JSON.stringify(briefing));
            window.location.href = 'assets/pages/detalhes.html';
        };


        briefingsDiv.appendChild(div);
    });
}

async function gerarCampanhaComIA(briefing) {
    const prompt = await gerarPromptDoBriefing(briefing);
    console.log(prompt);

    try {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
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

        const data = await res.json();
        const resposta = data.choices[0].message.content;

        try {
            const campanhaJson = JSON.parse(resposta);
            resultadoDiv.innerText = JSON.stringify(campanhaJson, null, 2);
            console.log("Campanha gerada:", campanhaJson);

            // Criar campanha na Meta
            await criarCampanhaMeta(campanhaJson);
        } catch (err) {
            resultadoDiv.innerText = "❌ Resposta inválida (JSON mal formatado):\n" + resposta;
        }
    } catch (err) {
        resultadoDiv.innerText = "Erro ao chamar OpenAI: " + err.message;
    }
}

async function criarCampanhaMeta(campanhaJson) {
    const url = `https://graph.facebook.com/v19.0/act_${AD_ACCOUNT_ID}/campaigns`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(campanhaJson)
        });

        const data = await response.json();

        if (data.error) {
            console.error("Erro na criação da campanha:", data.error);
        } else {
            console.log("Campanha criada com sucesso:", data);
        }
    } catch (err) {
        console.error("Erro na requisição Meta:", err.message);
    }
}

// Função auxiliar: buscar valor da célula A2 (ex: token)
async function buscarToken(sheetUrl) {
    const id = sheetUrl.match(/\/d\/(.*?)\//)[1];
    const range = 'Página1!A2';
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${range}?key=${GOOGLE_API_KEY}`;

    try {
        const res = await fetch(url);
        const data = await res.json();
        return data.values?.[0]?.[0] || null;
    } catch (err) {
        console.error("Erro ao buscar token:", err.message);
        return null;
    }
}

async function buscarCampanhasMetaAds(adAccountId, accessToken) {
    const url = `https://graph.facebook.com/v19.0/act_${adAccountId}/campaigns?fields=name,objective,status,start_time,stop_time,daily_budget&access_token=${accessToken}`;

    try {
        const res = await fetch(url);
        const data = await res.json();

        if (data.error) {
            console.error("Erro ao buscar campanhas:", data.error);
            return [];
        }

        return data.data; // array de campanhas
    } catch (err) {
        console.error("Erro na requisição de campanhas:", err.message);
        return [];
    }
}

async function buscarGruposDeAnuncio(adAccountId, accessToken) {
    const url = `https://graph.facebook.com/v19.0/act_${adAccountId}/adsets?fields=id,name,targeting,daily_budget,status,campaign_id&access_token=${accessToken}`;

    try {
        const res = await fetch(url);
        const data = await res.json();

        if (data.error) {
            console.error("Erro ao buscar grupos de anúncio:", data.error);
            return [];
        }

        return data.data;
    } catch (err) {
        console.error("Erro na requisição de grupos de anúncio:", err.message);
        return [];
    }
}

// --------------------------- EVENTOS --------------------------- //

// Inicialização
carregarBriefingsDaPlanilha();
