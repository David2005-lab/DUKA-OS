/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // Initialize Gemini Client
  let ai: GoogleGenAI | null = null;
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    console.log('Gemini API initialized successfully.');
  } else {
    console.warn('GEMINI_API_KEY is not set in environment or secrets.');
  }

  // API Endpoint: Health Check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // API Endpoint: AI Business Analytics & Forecasting Engine
  app.post('/api/analytics', async (req, res) => {
    const { products, transactions, invoices, businessName, language } = req.body;

    if (!ai) {
      return res.status(503).json({
        error: language === 'SW' 
          ? 'Gemini API haijasanidiwa. Tafadhali weka ufunguo wa siri wa Gemini katika Mipangilio.' 
          : 'Gemini API is not configured. Please set the Gemini API key secret in settings.'
      });
    }

    // Construct highly context-specific instruction forcing strict zero-hallucination compliance
    const isSwahili = language === 'SW';
    const numProducts = products?.length || 0;
    const numTxns = transactions?.length || 0;
    const numInvoices = invoices?.length || 0;

    if (numProducts === 0 && numTxns === 0 && numInvoices === 0) {
      return res.json({
        recommendations: isSwahili 
          ? "### HAKUNA DATA INAYOPATIKANA\n\nTafadhali weka bidhaa na ufanye mauzo ili AI ianze kuchambua biashara yako." 
          : "### NO DATA AVAILABLE\n\nPlease add products and perform transactions before requesting AI Business advice."
      });
    }

    const systemPrompt = `You are the lead enterprise business intelligence expert inside "Smart Business ERP Pro Max".
You operate with a strict ZERO-HALLUCINATION rule.
You MUST only analyze the actual parameters in JSON provided by the user. Do not invent fake products, transactions, or fake numbers.
If there are no data trends for a topic, explicitly state that you need more transaction logs.

Response format: Must return structured Markdown.
Language of response: ${isSwahili ? 'Swahili (Kiswahili)' : 'English'}.
Choose your headings and terminology beautifully. Highlight specific products by name (include actual SKUs/Barcodes provided, do not make up SKUs).

Focus areas:
1. Sales Forecast: Trend based on transaction history (cash flows and POS receipts). Give exact calculations.
2. Low Stock & Overstock Alerts: Highlight products that are out of stock or have gone below their reorderLevel based on actual SKU logs.
3. Profit and Cash Flow Analysis: Identify which items perform best by absolute revenue.
4. Business Recommendation: Provide explainable, actionable recommendations WITH supporting numerical evidence. Reference specific actual products.`;

    const userPrompt = `Analyze this real business dataset from my business: "${businessName || 'Elite Enterprise'}"
  
Current Date: 2026-06-08

Products Database (${numProducts} records):
${JSON.stringify((products || []).map((p: any) => ({
  name: p.name,
  sku: p.sku,
  barcode: p.barcode,
  costPrice: p.costPrice,
  sellingPrice: p.sellingPrice,
  quantity: p.quantity,
  reorderLevel: p.reorderLevel,
  category: p.category
})))}

Recent Ledger Transactions (${numTxns} records):
${JSON.stringify((transactions || []).map((t: any) => ({
  type: t.type,
  amount: t.amount,
  categoryId: t.categoryId,
  date: t.date,
  branchId: t.branchId
})))}

Customer Invoices (${numInvoices} records):
${JSON.stringify((invoices || []).map((iv: any) => ({
  invoiceNumber: iv.invoiceNumber,
  status: iv.status,
  grandTotal: iv.grandTotal,
  amountPaid: iv.amountPaid,
  date: iv.invoiceDate
})))}`;

    try {
      const gResponse = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.1, // very low temperature to prevent hallucination
        }
      });

      const responseText = gResponse.text || (isSwahili ? 'Mchakato wa AI haukutoa jibu lolote.' : 'AI generation returned empty response.');
      res.json({ recommendations: responseText });
    } catch (err: any) {
      console.error('Error contacting Gemini API:', err);
      res.status(500).json({
        error: isSwahili 
          ? `Hitilafu ya AI: ${err.message || 'Haikufanikiwa kupokea jibu'}` 
          : `AI Assistant Error: ${err.message || 'Failed to query model'}`
      });
    }
  });

  // Integrate Vite for development mode, otherwise serve dist files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Dev: Mounted Vite middleware.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Production: Serving built client files from dist/.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Smart Business ERP Server running on port ${PORT}`);
  });
}

startServer();
