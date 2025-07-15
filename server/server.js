const express = require('express');
const cors = require('cors');
const path = require('path');
const { google } = require('googleapis');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001; 

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Gera briefing com base no prompt fornecido
app.post('/api/gerar-briefing', async (req, res) => {
    const { prompt } = req.body;

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4',
                messages: [{ role: 'user', content: prompt }]
            })
        });

        const data = await response.json();
        res.json(data);

    } catch (error) {
        console.error("Erro ao chamar a API da OpenAI:", error);
        res.status(500).json({ error: 'Erro ao gerar briefing.' });
    }
});

// Busca token da planilha do Google Sheets
function buscarTokenMeta() {
    app.get('/api/token_meta', async (req, res) => {
        const SpreadSheetId = '14Dgu9XFEn92qSc_tPzaFT9fn8prNOO-fKWmQoP_JPek';
        const sheetName = 'Página1';
        const range = 'A1';

        try {
            const credentials = getGoogleCredentials();

            const auth = new google.auth.GoogleAuth({
                credentials: credentials,
                scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
            });

            const client = await auth.getClient();
            const sheets = google.sheets({ version: 'v4', auth: client });

            const response = await sheets.spreadsheets.values.get({
                spreadsheetId: SpreadSheetId,
                range: `${sheetName}!${range}`,
            });

            const values = response.data.values;
            const token = values && values[0] && values[0][0];

            if (!token) throw new Error('Token não encontrado na planilha');

            console.log('Token Meta:', token);
            return token;

        } catch (error) {
            console.error('Error fetching token:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
}

// Retorna informações completas da Meta
app.get('/api/meta/full-info', async (req, res) => {
    const SpreadSheetId = '14Dgu9XFEn92qSc_tPzaFT9fn8prNOO-fKWmQoP_JPek';
    const sheetName = 'Página1';
    const range = 'A1';

    try {
        const credentials = getGoogleCredentials();

        const auth = new google.auth.GoogleAuth({
            credentials: credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });

        const client = await auth.getClient();
        const sheets = google.sheets({ version: 'v4', auth: client });

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SpreadSheetId,
            range: `${sheetName}!${range}`,
        });

        const values = response.data.values;
        const token = values && values[0] && values[0][0];

        if (!token) {
            return res.status(404).json({ error: 'Token not found' });
        }

        const GRAPH_API_VERSION = 'v19.0';
        const BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

        const [businessesRes, adAccountsRes, pagesRes] = await Promise.all([
            fetch(`${BASE_URL}/me/businesses?fields=id,name,owned_ad_accounts{id,name,account_status},client_ad_accounts{id,name,account_status}&access_token=${token}&limit=100`),
            fetch(`${BASE_URL}/me/adaccounts?fields=id,name,account_status,currency,owner&access_token=${token}&limit=100`),
            fetch(`${BASE_URL}/me/accounts?fields=id,name&access_token=${token}`)
        ]);

        const businessesData = await businessesRes.json();
        const userAccountsData = await adAccountsRes.json();
        const pagesData = await pagesRes.json();

        if (businessesData.error || userAccountsData.error || pagesData.error) {
            const error = businessesData.error || userAccountsData.error || pagesData.error;
            return res.status(400).json({ error: error.message });
        }

        res.json({
            businesses: businessesData.data || [],
            adAccounts: userAccountsData.data || [],
            pages: pagesData.data || [],
        });

    } catch (error) {
        console.error('Erro no backend Meta:', error);
        res.status(500).json({ error: 'Erro interno ao buscar dados da Meta' });
    }
});

// Envia dados para o webhook do Make
app.post('/api/enviar-webhook', async (req, res) => {
    const { formData } = req.body;

    if (!formData || !formData.idConta || !formData.idPagina) {
        return res.status(400).json({ error: 'Dados incompletos' });
    }

    try {
        const response = await fetch('https://hook.us2.make.com/s2n36lmwoph5ne4crn52d6do783hh2j4', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ formData })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Erro detalhado do Make:', errorText);
            throw new Error(`Erro HTTP do Make: ${response.status} - ${errorText}`);
        }

        res.json({ sucesso: true, mensagem: 'Dados enviados com sucesso para o Make.' });

    } catch (err) {
        console.error('Erro ao enviar dados para o Make:', err);
        res.status(500).json({ error: `Erro ao enviar dados para o Make: ${err.message || err}` });
    }
});

// Retorna páginas gerenciadas por um Business Manager
app.get('/api/meta/owned-pages/:businessManagerId', async (req, res) => {
    const { businessManagerId } = req.params;

    const SpreadSheetId = '14Dgu9XFEn92qSc_tPzaFT9fn8prNOO-fKWmQoP_JPek';
    const sheetName = 'Página1';
    const range = 'A1';

    let token;

    try {
        const credentials = getGoogleCredentials();

        const auth = new google.auth.GoogleAuth({
            credentials: credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });

        const client = await auth.getClient();
        const sheets = google.sheets({ version: 'v4', auth: client });

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SpreadSheetId,
            range: `${sheetName}!${range}`,
        });

        const values = response.data.values;
        token = values && values[0] && values[0][0]?.trim();

        if (!token) throw new Error('Token não encontrado na planilha');

    } catch (error) {
        console.error('Erro ao buscar token da planilha:', error);
        return res.status(500).json({ error: 'Erro interno ao buscar token da planilha' });
    }

    try {
        const response = await fetch(`https://graph.facebook.com/v19.0/${businessManagerId}/owned_pages?fields=id,name&access_token=${token}`);

        const data = await response.json();

        if (data.error) {
            return res.status(400).json({ error: data.error.message });
        }

        res.json(data.data || []);

    } catch (error) {
        console.error("Erro ao buscar páginas do BM:", error);
        res.status(500).json({ error: 'Erro interno ao buscar páginas do Business Manager' });
    }
});

function getGoogleCredentials() {
    // 1. Nome da variável de ambiente que você configurou no Render
    const encodedCredentials = process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS;

    if (!encodedCredentials) {
        throw new Error("Variável de ambiente GOOGLE_SERVICE_ACCOUNT_CREDENTIALS não configurada.");
    }

    try {
        // 2. Decodifica a string Base64 para uma string JSON
        const decodedJsonString = Buffer.from(encodedCredentials, 'base64').toString('utf8');

        // 3. Analisa a string JSON para um objeto JavaScript
        return JSON.parse(decodedJsonString);
    } catch (error) {
        // Captura erros de decodificação ou de parsing JSON
        console.error("Erro ao decodificar ou analisar as credenciais do Google:", error);
        throw new Error("Credenciais do Google Service Account inválidas. Verifique o formato Base64 ou JSON.");
    }
}

// Início do servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
    console.log('OpenAI token:', process.env.OPENAI_API_KEY ? 'OK' : 'Missing');
    console.log('Google Sheets token:', process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS ? 'OK' : 'Missing');
});
