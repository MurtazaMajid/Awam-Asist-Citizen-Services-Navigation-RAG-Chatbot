<div align="center">

 <h1>Awam Assist</h1>
  
![Awam-Asist-Citizen-Services-Navigation-RAG-Chatbot](frontend/logo)

 

  <p><strong>An AI-powered citizen service navigator for Pakistan.<br/>Plain answers. Real sources. English and Roman Urdu.</strong></p>

  <p>
    <a href="https://awamassist.vercel.app">
      <img src="https://img.shields.io/badge/Frontend-Live-brightgreen?style=flat-square" alt="Frontend"/>
    </a>
    <a href="https://awam-assist-production.up.railway.app">
      <img src="https://img.shields.io/badge/API-Live-brightgreen?style=flat-square" alt="API"/>
    </a>
    <img src="https://img.shields.io/badge/Python-3.10-blue?style=flat-square&logo=python" alt="Python"/>
    <img src="https://img.shields.io/badge/LangChain-LCEL-3c7dbc?style=flat-square" alt="LangChain"/>
    <img src="https://img.shields.io/badge/LLM-LLaMA%203.3%2070B-orange?style=flat-square" alt="LLM"/>
    <img src="https://img.shields.io/badge/Vector%20DB-ChromaDB-red?style=flat-square" alt="ChromaDB"/>
    <img src="https://img.shields.io/badge/Deployed%20on-Railway-blueviolet?style=flat-square" alt="Railway"/>
  </p>
</div>

---


## Table of Contents

- [The Problem](#the-problem)
- [The Solution](#the-solution)
- [Live Demo](#live-demo)
- [How It Works](#how-it-works)
- [RAG Pipeline](#rag-pipeline)
- [Knowledge Base](#knowledge-base)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Repository Structure](#repository-structure)
- [API Reference](#api-reference)
- [Running Locally](#running-locally)
- [Rebuilding the Knowledge Base](#rebuilding-the-knowledge-base)
- [Deployment Guide](#deployment-guide)
- [Design Decisions](#design-decisions)
- [Limitations and Known Issues](#limitations-and-known-issues)
- [Roadmap](#roadmap)
- [Author](#author)

---

## The Problem

Pakistan has over 220 million citizens. A significant portion of them are entitled to government services including financial support, utility connections, civil documentation, and emergency assistance. Yet the vast majority either do not know these services exist, do not know how to access them, or are turned away because they showed up with the wrong documents.

The information exists. It is published on government websites. But those websites are:

- Spread across dozens of separate portals with no unified entry point
- Written in formal legal or bureaucratic English that the average citizen cannot parse
- Not available in Roman Urdu, which is how most Pakistanis communicate digitally
- Frequently outdated, inconsistent across sources, or missing critical details like fees and processing times

The result is that citizens waste days traveling to the wrong offices, standing in the wrong queues, and submitting incomplete applications. The most vulnerable citizens, those who need these services the most, are the ones least equipped to navigate the system.

This is an information access problem. And information access problems are exactly what retrieval-augmented generation is built for.

---

## The Solution

Awam Assist is a RAG-based chatbot that acts as a single entry point for Pakistani government service information. A citizen types a question in plain English or Roman Urdu and receives a direct, accurate, plain-language answer sourced from official government documents.

It does not generate answers from the LLM's training data. It retrieves the most relevant chunks from a curated knowledge base of official Pakistani government sources, passes them to the LLM as context, and instructs the model to answer only from that context. This means the answers are grounded, verifiable, and traceable back to a real source.

The chatbot currently covers eight categories of government services and is deployed as a live REST API that any frontend or mobile application can connect to.

---

## Live Demo

| Resource | URL |
|----------|-----|
| Frontend | [awamassist.vercel.app](https://awamassist.vercel.app) |
| API Base URL | [awam-assist-production.up.railway.app](https://awam-assist-production.up.railway.app) |
| API Health Check | [awam-assist-production.up.railway.app/](https://awam-assist-production.up.railway.app/) |

---

## How It Works

When a user submits a question, the following sequence runs in under two seconds:

**Step 1 — Query Encoding**
The user's question is converted into a 384-dimensional embedding vector using the `all-MiniLM-L6-v2` sentence transformer model running locally on the server.

**Step 2 — Semantic Retrieval**
The query vector is compared against all stored document chunk vectors in ChromaDB using cosine similarity. The top three most semantically relevant chunks are retrieved. These chunks come from actual government documents, not from the LLM's weights.

**Step 3 — Prompt Assembly**
The three retrieved chunks are injected into a structured prompt alongside the original question. The prompt instructs the model to answer only from the provided context, to use plain language, and to respond in the same language the user wrote in.

**Step 4 — Answer Generation**
The assembled prompt is sent to Groq's inference API, which runs LLaMA 3.3 70B at extremely low latency. The model generates an answer grounded in the retrieved context.

**Step 5 — Response**
The answer is returned as a JSON response to the frontend. If the retrieved chunks do not contain enough information to answer the question, the model is instructed to say so rather than hallucinate.

---

## RAG Pipeline

The ingestion pipeline runs once (or whenever the knowledge base is updated) in a Google Colab notebook and produces a persistent ChromaDB vector store that is bundled with the backend.

```
Raw Source Documents
(.txt files from official government websites)
          |
          v
  Document Loading
  TextLoader for .txt files
  PyPDFLoader for .pdf files
          |
          v
  Text Splitting
  RecursiveCharacterTextSplitter
  chunk_size = 500 characters
  chunk_overlap = 50 characters
          |
          v
  Embedding Generation
  HuggingFace all-MiniLM-L6-v2
  384-dimensional dense vectors
  Runs locally, no API cost
          |
          v
  Vector Storage
  ChromaDB persistent store
  Saved to /chroma_db on disk
          |
          v
  Deployment
  ChromaDB files bundled with FastAPI backend
  Deployed to Railway
          |
          v
  Query Time
  User question -> embedding -> cosine similarity search
  Top 3 chunks retrieved -> injected into prompt
  Groq LLaMA 3.3 70B generates grounded answer
```

**Why chunk_size = 500?**

Smaller chunks improve retrieval precision because each chunk covers a narrower topic. Larger chunks give the LLM more context per retrieved piece. 500 characters is roughly one paragraph, which is a natural unit of information for government FAQs and policy documents. The 50-character overlap prevents information from being cut off at chunk boundaries.

**Why all-MiniLM-L6-v2?**

It is an 80MB model that runs fast on CPU, produces high-quality 384-dimensional embeddings for English text, and requires no API key or internet connection at inference time. For a project of this scope it is the right tradeoff between quality and operational cost.

**Why k=3?**

Three chunks provide enough context for the LLM to construct a complete answer without exceeding the prompt budget or introducing irrelevant noise from lower-ranked results.

---

## Knowledge Base

All documents in the knowledge base were sourced from official Pakistani government websites. No AI-generated content was used as a knowledge base source. Each document was manually reviewed and structured into clean plain-text files before ingestion.

| Category | Source | Coverage |
|----------|--------|----------|
| Zakat Punjab | zakat.punjab.gov.pk | Guzara Allowance, Guzara for Blind, Leprosy patients, Education Stipends (General, Technical, Deeni Madaris), Health Care, Marriage Assistance, Taleef-e-Qalb, Release of Prisoners |
| IESCO Utilities | iesco.com.pk | New connection process, AMI meter costs, lump sum charges for tariff A1 and A2, eligibility criteria, billing disputes, complaint process, disconnection and reconnection |
| Punjab Transport | ptc.punjab.gov.pk | T-Cash Card registration and usage, Metro Bus Lahore, Orange Line Metro Train, Speedo Bus, routes, fares, helpline numbers |
| ICT Civil Registration | ictadministration.gov.pk | Marriage Registration Certificate, Birth Certificate, B-Form for children, Death Certificate, required documents, fees, processing times, office locations |
| NADRA Services | nadra.gov.pk | CNIC new and renewal, NICOP for overseas Pakistanis, B-Form, Family Registration Certificate, Passport, Person of Pakistani Origin card, fees, processing times, office locations |
| BISP / Ehsaas | bisp.gov.pk | Benazir Kafaalat eligibility and registration, PMT score explanation, Taleemi Wazaif education stipends, payment amounts, how to check status via 8171 SMS, fraud warnings |
| Rescue and Emergency | rescue.gov.pk | Rescue 1122 Punjab, Police 15, Edhi Foundation, Chippa, FIA Cybercrime, Women Helpline, what to do in different emergency types, province-wise coverage |
| Police and FIR | punjabpolice.gov.pk | What an FIR is, who can file one, step-by-step process, what to do if police refuse, legal remedies under Section 22-A CrPC, online FIR systems, bail rights, common scenarios |

**Total documents:** 8 structured text files
**Total chunks after splitting:** 142
**Total vectors in ChromaDB:** 142

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| LLM | Groq, LLaMA 3.3 70B Versatile | Fast inference, free tier, high quality open model |
| Embeddings | HuggingFace all-MiniLM-L6-v2 | Lightweight, no API cost, strong English performance |
| Vector Store | ChromaDB | Simple to use, persistent, no external service required |
| RAG Orchestration | LangChain LCEL | Clean pipeline composition, well-maintained |
| Backend API | FastAPI, Uvicorn | High performance Python API framework |
| Backend Deployment | Railway | Simple Python deployment, $5/month free credit |
| Frontend | HTML, CSS, JavaScript | Lightweight, fast, no framework overhead |
| Frontend Deployment | Vercel | Free, always-on static hosting |
| Development Environment | Google Colab | Free GPU/CPU for ingestion pipeline |

---

## System Architecture

```
                        +------------------+
                        |     End User     |
                        +--------+---------+
                                 |
                    Types question in English
                       or Roman Urdu
                                 |
                                 v
                  +--------------+--------------+
                  |         Frontend            |
                  |   awamassist.vercel.app     |
                  |   HTML + CSS + JavaScript   |
                  +--------------+--------------+
                                 |
                    HTTP POST /ask
                    { "question": "..." }
                                 |
                                 v
          +----------------------+----------------------+
          |            FastAPI Backend                  |
          |   awam-assist-production.up.railway.app     |
          |                                             |
          |   1. Embed question (all-MiniLM-L6-v2)     |
          |   2. Search ChromaDB (cosine similarity)    |
          |   3. Retrieve top 3 chunks                  |
          |   4. Build prompt with context              |
          |   5. Send to Groq API                       |
          |   6. Return answer as JSON                  |
          +-------+------------------+------------------+
                  |                  |
                  v                  v
          +-------+------+   +-------+------+
          |   ChromaDB   |   |  Groq API    |
          |  (local on   |   |  LLaMA 3.3   |
          |   Railway)   |   |    70B       |
          +--------------+   +--------------+
```

---

## Repository Structure

```
Awam-Asist-Citizen-Services-Navigation-RAG-Chatbot/
|
|-- backend/
|   |
|   |-- main.py                        FastAPI application and RAG chain definition
|   |-- requirements.txt               Python dependencies
|   |-- railway.json                   Railway deployment configuration
|   |
|   |-- chroma.sqlite3                 ChromaDB SQLite metadata store
|   |-- data_level0.bin                ChromaDB HNSW index (vector data)
|   |-- header.bin                     ChromaDB index header
|   |-- length.bin                     ChromaDB index lengths
|   └-- link_lists.bin                 ChromaDB HNSW link lists
|
|-- frontend/
|   |
|   |-- index.html                     Main chat interface
|   |-- style.css                      Styling
|   |-- script.js                      API call logic and UI interaction
|   └-- logo.png                       Awam Assist logo
|
|-- data/                              Knowledge base source documents
|   |
|   |-- Zakat_Punjab_Complete_Guide.txt
|   |-- IESCO_Citizen_Guide.txt
|   |-- Punjab_Transport_Complete.txt
|   |-- ICT_Civil_Registration_Services.txt
|   |-- Nadra_Complete.txt
|   |-- BISP_Ehsaas_Complete_Guide.txt
|   |-- Emergency_Service.txt
|   └-- Police_FIR_Complete_Guide.txt
|
|-- notebook/
|   └-- RAG_Pipeline_Awam_Assist.ipynb  Full pipeline: ingestion, embedding, testing
|
└-- README.md
```

---

## API Reference

### Health Check

```
GET /
```

Response:
```json
{
  "status": "Citizen Service Navigator API is running"
}
```

### Ask a Question

```
POST /ask
Content-Type: application/json
```

Request body:
```json
{
  "question": "string"
}
```

Response body:
```json
{
  "answer": "string"
}
```

**Example — English query:**

Request:
```json
{
  "question": "What documents do I need to register my marriage in Islamabad?"
}
```

Response:
```json
{
  "answer": "To register your marriage at the Citizen Facilitation Center in G-11/4 Islamabad, you need: Original Nikkah Nama, an attested copy of the Nikkah Nama, copies of CNIC for both bride and groom, copies of CNIC for both fathers, a copy of passport if either party is a foreign national, and a B-Form copy if either party is under 18. The processing fee is Rs. 200 and processing takes 7 working days."
}
```

**Example — Roman Urdu query:**

Request:
```json
{
  "question": "BISP k liye eligible hoon ya nahi kaise pata karein?"
}
```

Response:
```json
{
  "answer": "BISP eligibility check karne k liye apna 13-digit CNIC number SMS karein 8171 pe. Jawab aayega ke aap eligible hain ya nahi. Ya phir 8171.bisp.gov.pk pe jaein aur CNIC enter karein. Eligibility k liye zaroori hai ke aapki household income poverty line se kam ho aur aap NSER survey mein registered hon."
}
```

**Example — Legal query:**

Request:
```json
{
  "question": "Police refused to file my FIR. What are my legal options?"
}
```

Response:
```json
{
  "answer": "Police refusal to register an FIR for a cognizable offence is illegal under Section 154 CrPC. You have three options. First, submit a written complaint to the District Police Officer of your area. Second, file an application before the Sessions Court under Section 22-A and 22-B of the CrPC — the court can legally direct police to register your FIR. Third, call the Punjab Police complaint helpline on 1787. Do not delay as evidence weakens over time."
}
```

---

## Running Locally

### Prerequisites

- Python 3.10 or higher
- A free Groq API key from [console.groq.com](https://console.groq.com)

### Setup

**1. Clone the repository**

```bash
git clone https://github.com/MurtazaMajid/Awam-Asist-Citizen-Services-Navigation-RAG-Chatbot.git
cd Awam-Asist-Citizen-Services-Navigation-RAG-Chatbot/backend
```

**2. Create a virtual environment**

```bash
python -m venv venv
source venv/bin/activate        # On Windows: venv\Scripts\activate
```

**3. Install dependencies**

```bash
pip install -r requirements.txt
```

**4. Set your Groq API key**

```bash
export GROQ_API_KEY=your_groq_api_key_here
```

On Windows:
```bash
set GROQ_API_KEY=your_groq_api_key_here
```

**5. Start the API server**

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**6. Open the frontend**

Open `frontend/index.html` in your browser and update the API base URL in `script.js` to `http://localhost:8000`.

**7. Test the API directly**

```bash
curl -X POST http://localhost:8000/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "How do I get a new electricity connection from IESCO?"}'
```

---

## Rebuilding the Knowledge Base

If you add new documents to the `data/` folder or update existing ones, you need to re-run the ingestion pipeline to regenerate the ChromaDB vector store.

Open `notebook/RAG_Pipeline_Awam_Assist.ipynb` in Google Colab and run the following steps in order:

| Step | What It Does |
|------|-------------|
| Step 3 | Mount Google Drive and locate your data folder |
| Step 4 | Load all .txt and .pdf files from the knowledge base |
| Step 5 | Split documents into 500-character chunks with 50-character overlap |
| Step 6 | Generate embeddings and save to ChromaDB at /content/chroma_db |
| Step 9 | Run a test query to verify the pipeline works |
| Step 10 | Run batch evaluation across all 8 categories |
| Step 12 | Export ChromaDB as a zip file and download it |

After downloading, extract the zip and replace the five ChromaDB files in the `backend/` folder:

```
chroma.sqlite3
data_level0.bin
header.bin
length.bin
link_lists.bin
```

Push the updated files to GitHub. Railway will detect the push and automatically redeploy the backend with the new knowledge base.

---

## Deployment Guide

### Backend on Railway

The backend is a standard Python FastAPI application. Railway detects it automatically.

**Required files in the backend folder:**

```
main.py
requirements.txt
railway.json
chroma.sqlite3
data_level0.bin
header.bin
length.bin
link_lists.bin
```

**railway.json:**

```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "uvicorn main:app --host 0.0.0.0 --port $PORT"
  }
}
```

**Environment variable to set on Railway:**

| Variable | Value |
|----------|-------|
| `GROQ_API_KEY` | Your Groq API key |

**Steps:**

1. Push your code to GitHub
2. Go to [railway.app](https://railway.app) and create a new project
3. Select Deploy from GitHub repo and choose your repository
4. Set the root directory to `backend/`
5. Add the `GROQ_API_KEY` environment variable under the Variables tab
6. Railway will build and deploy automatically

Your API will be live at a URL like `https://your-app-name.up.railway.app`.

### Frontend on Vercel

The frontend is a static site (HTML + CSS + JS) with no build step required.

**Steps:**

1. Go to [vercel.com](https://vercel.com) and import your GitHub repository
2. Set the root directory to `frontend/`
3. Set framework preset to Other
4. Deploy

Make sure the API base URL in `script.js` points to your Railway backend URL.

---

## Design Decisions

**Why RAG instead of fine-tuning?**

Fine-tuning an LLM on government documents would be expensive, slow to update, and would still be prone to hallucination. RAG allows the knowledge base to be updated by simply adding a new text file and re-running the ingestion pipeline. The LLM is only used for reasoning and language generation, not as a knowledge store.

**Why ChromaDB instead of Pinecone or Weaviate?**

ChromaDB runs locally with no external service dependency and no cost. For a knowledge base of 142 chunks, a fully managed vector database would be significant over-engineering. ChromaDB files are bundled directly with the backend and deployed to Railway as static files.

**Why Groq instead of OpenAI?**

Groq's free tier provides fast inference on LLaMA 3.3 70B, which is a high-quality open model comparable to GPT-3.5 on most tasks. For a civic application where operational cost matters, avoiding a paid API dependency on the critical path makes the project more sustainable.

**Why not fine-tune an Urdu model?**

The target users type in Roman Urdu, not Urdu script. No production-ready embedding model exists specifically for Roman Urdu. The multilingual model `paraphrase-multilingual-MiniLM-L12-v2` is a planned upgrade that would improve retrieval for Roman Urdu queries. For now, the English embedding model handles retrieval while the LLM handles Roman Urdu response generation.

**Why bundle ChromaDB with the backend instead of using a hosted vector DB?**

Simplicity and cost. The knowledge base is small and read-only at inference time. Bundling the DB eliminates a network dependency, reduces latency, and keeps the project fully self-contained.

---

## Limitations and Known Issues

**Roman Urdu retrieval gap**

The embedding model (`all-MiniLM-L6-v2`) is trained primarily on English text. When a user asks a question in Roman Urdu, the query embedding may not match the English document chunks as accurately as an English query would. The LLM can still generate a Roman Urdu response, but retrieval precision is lower for Roman Urdu inputs than for English ones.

**Knowledge base freshness**

Government policies change. Fees, eligibility thresholds, and processes are updated periodically. The current knowledge base reflects information as of early 2026. There is no automated mechanism to detect when source documents change.

**Geographic coverage**

The current knowledge base is primarily focused on Punjab and ICT (Islamabad). Citizens from Sindh, KP, and Balochistan will find less relevant information for province-specific services.

**No conversation memory**

Each query is processed independently. The chatbot does not remember previous turns in a conversation. If a user asks a follow-up question that depends on a previous answer, it will not be handled correctly.

**Railway free tier cold starts**

The Railway free tier may spin down the backend after a period of inactivity. The first request after a cold start may take 10 to 15 seconds while the server loads the embedding model and ChromaDB into memory. Subsequent requests are fast.

---

## Roadmap

**Near term**

- Driving license and motor vehicle registration services
- Passport application process (DGIP)
- Multilingual embeddings for improved Roman Urdu retrieval
- Conversation memory for multi-turn queries

**Medium term**

- WhatsApp bot integration via Twilio for accessibility on mobile
- Province-specific coverage for Sindh, KP, and Balochistan
- Automated knowledge base refresh pipeline

**Long term**

- User feedback loop to improve retrieval quality over time
- BISP eligibility pre-screening form integrated into the frontend
- Voice input support for users with low literacy

---

## Contributing

Contributions are welcome, especially for expanding the knowledge base to cover more services or additional provinces.

To add a new knowledge base document:

1. Create a well-structured plain-text file in the `data/` folder
2. Source content only from official government websites
3. Follow the existing document format (section headers, plain language, no jargon)
4. Re-run the ingestion pipeline in the notebook (Steps 4 through 6)
5. Export the new ChromaDB and replace the files in `backend/`
6. Open a pull request with the new data file and updated ChromaDB files

---

## Author

**Murtaza Majid**

Data Science undergraduate, graduating June 2026. Interested in applied NLP, retrieval systems, and building AI tools that solve real problems for real people.

[LinkedIn](https://www.linkedin.com/in/murtaza-majid) · [GitHub](https://github.com/MurtazaMajid) · murtazamajid.123@gmail.com

---

*Awam Assist — because access to information is a right, not a privilege.*
