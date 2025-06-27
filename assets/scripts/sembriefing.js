// ==============================================
// ELEMENTOS DO DOM
// ==============================================

const backgroundBlur = document.getElementById("backgroundBlur");

// ==============================================
// FUNÇÕES DE INICIALIZAÇÃO
// ==============================================
function initialize() {
    setupEventListeners();
}

function setupEventListeners() {
    
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
