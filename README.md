---

<div align="center">

<img src="frontend/logo" width="200"/>

<h1>Awam Assist</h1>

<p><strong>An AI-powered citizen service navigator for Pakistan.<br/>Plain answers. Real sources. English and Roman Urdu. Voice input supported.</strong></p>

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
  <img src="https://img.shields.io/badge/STT-Groq%20Whisper-purple?style=flat-square" alt="Whisper"/>
  <img src="https://img.shields.io/badge/Deployed%20on-Railway-blueviolet?style=flat-square" alt="Railway"/>
</p>

</div>

---

## Table of Contents

- [The Problem](#the-problem)
- [The Solution](#the-solution)
- [Live Demo](#live-demo)
- [App Preview](#app-preview)
- [How It Works](#how-it-works)
- [Voice Input Pipeline](#voice-input-pipeline)
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

Awam Assist is a RAG-based chatbot that acts as a single entry point for Pakistani government service information. A citizen types or speaks a question in English or Roman Urdu and receives a direct, accurate, plain-language answer sourced from official government documents.

It does not generate answers from the LLM's training data. It retrieves the most relevant chunks from a curated knowledge base of official Pakistani government sources, passes them to the LLM as context, and instructs the model to answer only from that context. This means the answers are grounded, verifiable, and traceable back to a real source.

The chatbot covers 15 categories of government services, supports bilingual text and voice input, and is deployed as a live REST API that any frontend or mobile application can connect to.

---

## Live Demo

| Resource | URL |
|----------|-----|
| Frontend | [awamassist.vercel.app](https://awamassist.vercel.app) |
| API Base URL | [awam-assist-production.up.railway.app](https://awam-assist-production.up.railway.app) |
| API Health Check | [awam-assist-production.up.railway.app/](https://awam-assist-production.up.railway.app/) |

---

## App Preview

![Awam Assist UI](frontend/Screenshot%202026-05-04%20020447.png)

---

## How It Works

When a user submits a question (typed or via voice), the following sequence runs in under two seconds:

**Step 1 - Query Encoding**
The user's question is converted into a 384-dimensional embedding vector using the `all-MiniLM-L6-v2` sentence transformer model running locally on the server.

**Step 2 - Semantic Retrieval**
The query vector is compared against all stored document chunk vectors in ChromaDB using cosine similarity. The top 5 most semantically relevant chunks are retrieved. These chunks come from actual government documents, not from the LLM's weights.

**Step 3 - Prompt Assembly**
The 5 retrieved chunks are injected into a structured prompt alongside the original question. The prompt instructs the model to answer only from the provided context, to use plain language, and to respond in the same language the user wrote in.

**Step 4 - Answer Generation**
The assembled prompt is sent to Groq's inference API, which runs LLaMA 3.3 70B at extremely low latency. The model generates an answer grounded in the retrieved context.

**Step 5 - Response**
The answer is returned as a JSON response to the frontend. If the retrieved chunks do not contain enough information to answer the question, the model is instructed to say so rather than hallucinate.

---

## Voice Input Pipeline

Awam Assist supports voice input in Urdu and Roman Urdu via Groq Whisper. This makes the app accessible to users who find typing difficult or prefer to speak naturally.

```
User taps mic button in browser
          |
          v
  MediaRecorder API captures audio
  Browser records as audio/webm
          |
          v
  Audio blob sent via FormData
  POST /transcribe endpoint
          |
          v
  Groq Whisper (whisper-large-v3-turbo)
  language = "ur"
  prompt = domain keywords (sehat card, NADRA, CNIC, zakat...)
          |
          v
  Transcript returned to frontend
  Injected into input field
  User reviews and sends
          |
          v
  Normal RAG pipeline processes the transcript
```

**Why Groq Whisper?**

The browser's built-in Web Speech API was tested first but proved unreliable for Pakistani accents and Roman Urdu vocabulary. It consistently misheard domain-specific terms like "sehat card" and "NADRA". Groq Whisper runs `whisper-large-v3-turbo` and handles multilingual speech including Pakistani-accented Urdu and Roman Urdu with high accuracy. It uses the same Groq API key already in use for the LLM, so there is no additional cost or separate account required.

**Why the domain keyword prompt?**

Whisper accepts an optional prompt parameter that biases transcription toward specific vocabulary. Providing government service terms like `sehat card, NADRA, CNIC, zakat, IESCO, passport, BISP, NTN` as the prompt significantly improves recognition accuracy for the exact terms citizens are most likely to use.

**Three-state mic button:**

| State | Appearance | Action |
|-------|-----------|--------|
| Idle | Gray mic icon | Tap to start recording |
| Listening | Red mic icon | Tap to stop and transcribe |
| Processing | Spinner | Whisper is transcribing, button disabled |

The transcript is inserted into the input field without auto-sending, giving the user a chance to review and edit before submitting to the RAG chain.

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
  os.walk loads all subfolders recursively
          |
          v
  Text Splitting
  RecursiveCharacterTextSplitter
  chunk_size  = 1000 characters
  chunk_overlap = 100 characters
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
  Saved to /content/chroma_db on disk
          |
          v
  Deployment
  ChromaDB files bundled with FastAPI backend
  Deployed to Railway
          |
          v
  Query Time
  User question -> embedding -> cosine similarity search
  Top 5 chunks retrieved -> injected into prompt
  Groq LLaMA 3.3 70B generates grounded answer
```

**Why chunk_size = 1000?**

The initial implementation used chunk_size = 500. During evaluation, 3 out of 15 categories failed because structured government documents use section headers followed by detailed content. At 500 characters, the headers and their associated lists were ending up in different chunks, and retrieval would fetch the header chunk without the answer. Increasing to 1000 characters resolved all retrieval failures and brought batch evaluation to 15/15.

**Why chunk_overlap = 100?**

The 100-character overlap prevents information from being cut off at chunk boundaries. For government documents where a sentence may span a chunk boundary, this overlap ensures continuity.

**Why all-MiniLM-L6-v2?**

It is an 80MB model that runs fast on CPU, produces high-quality 384-dimensional embeddings for English text, and requires no API key or internet connection at inference time. For a project of this scope it is the right tradeoff between quality and operational cost.

**Why k=5?**

Government documents use structured section headers that consume part of the chunk without directly answering a question. At k=3, the most relevant answer chunk was often ranked 4th or 5th and not included in the context. Increasing k to 5 ensures the LLM receives enough context to find the answer even when it is not in the top 3 retrieved results.

---

## Knowledge Base

All documents in the knowledge base were sourced from official Pakistani government websites. No AI-generated content was used as a knowledge base source. Each document was manually reviewed and structured into clean plain-text files before ingestion.

| Category | Source | Coverage |
|----------|--------|----------|
| Zakat Punjab | zakat.punjab.gov.pk | Guzara Allowance, Guzara for Blind, Leprosy patients, Education Stipends, Health Care, Marriage Assistance, Taleef-e-Qalb, Release of Prisoners |
| IESCO Utilities | iesco.com.pk | New connection process, AMI meter costs, lump sum charges, eligibility, billing disputes, complaint process, disconnection and reconnection |
| Punjab Transport | ptc.punjab.gov.pk | T-Cash Card registration and usage, Metro Bus Lahore, Orange Line, Speedo Bus, routes, fares, helpline numbers |
| ICT Civil Registration | ictadministration.gov.pk | Marriage Registration, Birth Certificate, B-Form, Death Certificate, required documents, fees, processing times |
| NADRA Services | nadra.gov.pk | CNIC new and renewal, NICOP, B-Form, Family Registration Certificate, POC card, fees, processing times, office locations |
| BISP / Ehsaas | bisp.gov.pk | Benazir Kafaalat eligibility, PMT score explanation, Taleemi Wazaif stipends, payment amounts, SMS check via 8171, fraud warnings |
| Rescue and Emergency | rescue.gov.pk | Rescue 1122, Police 15, Edhi Foundation, Chippa, FIA Cybercrime, Women Helpline, emergency procedures by type |
| Police and FIR | punjabpolice.gov.pk | What an FIR is, who can file one, step-by-step process, what to do if police refuse, Section 22-A CrPC, online FIR, bail rights |
| Education and Scholarships | hec.gov.pk | HEC undergraduate scholarships, eligibility criteria, application process, deadlines, provincial quota |
| FBR Tax and NTN | fbr.gov.pk | NTN registration, tax filing, filer vs non-filer status, penalties, income tax brackets, IRIS portal guide |
| Pakistan Citizens Portal | citizensportal.gov.pk | How to file a complaint, track status, escalate, what complaints are accepted, response timelines |
| Passport | dgip.gov.pk | New passport application, renewal, documents required, fees, urgent passport, collection process, DGIP office locations |
| Property and Land Records | punjablandsystem.gov.pk | How to check Fard (ownership record), mutation process, online Arazi portal, property transfer documents |
| Sehat Sahulat Health | sehat.gov.pk | Eligibility criteria, enrolled hospitals, coverage limit, how to use the card, diseases covered, complaint process |
| WASA and Gas SNGPL | sngpl.com.pk / wasa.punjab.gov.pk | New gas connection application, SNGPL meter installation, WASA water connection, bill dispute process, helpline numbers |

**Total documents:** 15 structured text files
**Total chunks after splitting:** 139
**Total vectors in ChromaDB:** 139
**Retrieval accuracy (batch evaluation):** 15/15 categories

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| LLM | Groq, LLaMA 3.3 70B Versatile | Fast inference, free tier, high quality open model |
| Speech to Text | Groq Whisper (whisper-large-v3-turbo) | Accurate for Pakistani accents and Roman Urdu, same API key as LLM |
| Embeddings | HuggingFace all-MiniLM-L6-v2 | Lightweight, no API cost, strong English performance |
| Vector Store | ChromaDB | Simple, persistent, no external service required |
| RAG Orchestration | LangChain LCEL | Clean pipeline composition, well-maintained |
| Backend API | FastAPI, Uvicorn | High performance Python API framework |
| Backend Deployment | Railway | Simple Python deployment, auto-deploy on push |
| Frontend | React, Vite, Tailwind CSS | Component-based, fast, deployed on Vercel |
| Frontend Deployment | Vercel | Free, always-on static hosting |
| Development Environment | Google Colab | Free CPU for ingestion pipeline |

---

## System Architecture

```
                        +------------------+
                        |     End User     |
                        +--------+---------+
                                 |
                  Types OR speaks question
                  English / Roman Urdu / Urdu
                                 |
                    +------------+------------+
                    |                         |
               Text input                Voice input
                    |                         |
                    |              MediaRecorder captures audio
                    |              POST /transcribe
                    |              Groq Whisper transcribes
                    |              Transcript injected to input
                    |                         |
                    +------------+------------+
                                 |
                                 v
                  +--------------+--------------+
                  |         Frontend            |
                  |   awamassist.vercel.app     |
                  |   React + Vite + Tailwind   |
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
          |   3. Retrieve top 5 chunks                  |
          |   4. Build prompt with context              |
          |   5. Send to Groq API                       |
          |   6. Return answer as JSON                  |
          +-------+------------------+------------------+
                  |                  |
                  v                  v
          +-------+------+   +-------+------+
          |   ChromaDB   |   |  Groq API    |
          |  (local on   |   |  LLaMA 3.3   |
          |   Railway)   |   |  70B+Whisper |
          +--------------+   +--------------+
```

---

## Repository Structure

```
Awam-Asist-Citizen-Services-Navigation-RAG-Chatbot/
|
|-- backend/
|   |-- main.py                          FastAPI app, RAG chain, Whisper endpoint
|   |-- requirements.txt                 Python dependencies
|   |-- railway.json                     Railway deployment configuration
|   |-- chroma.sqlite3                   ChromaDB SQLite metadata store
|   |-- data_level0.bin                  ChromaDB HNSW vector index
|   |-- header.bin                       ChromaDB index header
|   |-- length.bin                       ChromaDB index lengths
|   +-- link_lists.bin                   ChromaDB HNSW link lists
|
|-- frontend/
|   |-- src/
|   |   |-- components/
|   |   |   |-- Header.tsx
|   |   |   |-- CategoryTabs.tsx
|   |   |   |-- Sidebar.tsx
|   |   |   |-- ChatArea.tsx
|   |   |   |-- MessageBubble.tsx
|   |   |   |-- WelcomeCard.tsx
|   |   |   |-- SuggestionChips.tsx
|   |   |   +-- InputBar.tsx
|   |   |-- constants/
|   |   |   +-- services.js
|   |   +-- hooks/
|   |       |-- useChat.ts
|   |       +-- useSpeechRecognition.ts
|   |-- public/
|   |   +-- awam-assist-logo.png
|   +-- index.html
|
|-- data/
|   |-- Zakat punjab complete.txt
|   |-- Iesco citizen guide.txt
|   |-- Punjab transport complete.txt
|   |-- ICT Civil Registration Services.txt
|   |-- Nadra complete.txt
|   |-- BISP_Ehsaas_Complete_Guide.txt
|   |-- Emergency serice.txt
|   |-- Police_FIR_Complete_Guide.txt
|   |-- Education_Scholarships_Complete_Guide.txt
|   |-- FBR_Tax_NTN_Complete_Guide.txt
|   |-- Pakistan_Citizens_Portal_Complete_Guide.txt
|   |-- Passport_Complete_Guide.txt
|   |-- Property_Land_Records_Complete_Guide.txt
|   |-- Sehat_Sahulat_Complete_Guide.txt
|   +-- WASA_Gas_SNGPL_Complete_Guide.txt
|
|-- notebook/
|   +-- RAG_Pipeline_Awam_Assist.ipynb   Full pipeline: ingestion, embedding, testing
|
+-- README.md
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

### Transcribe Voice Input

```
POST /transcribe
Content-Type: multipart/form-data
```

Request: `FormData` with field `audio` containing a `.webm` or `.wav` audio blob.

Response body:
```json
{
  "transcript": "string"
}
```

Pass the returned transcript directly to `/ask` to complete the voice-to-answer pipeline.

**Example - English query:**

Request:
```json
{ "question": "What documents do I need to register my marriage in Islamabad?" }
```

Response:
```json
{ "answer": "To register your marriage at the Citizen Facilitation Center in G-11/4 Islamabad, you need: Original Nikkah Nama, an attested copy of the Nikkah Nama, copies of CNIC for both bride and groom, copies of CNIC for both fathers, a copy of passport if either party is a foreign national, and a B-Form copy if either party is under 18. The processing fee is Rs. 200 and processing takes 7 working days." }
```

**Example - Roman Urdu query:**

Request:
```json
{ "question": "BISP k liye eligible hoon ya nahi kaise pata karein?" }
```

Response:
```json
{ "answer": "BISP eligibility check karne k liye apna 13-digit CNIC number SMS karein 8171 pe. Jawab aayega ke aap eligible hain ya nahi." }
```

---

## Running Locally

### Prerequisites

- Python 3.10 or higher
- A free Groq API key from [console.groq.com](https://console.groq.com)

### Setup

```bash
git clone https://github.com/MurtazaMajid/Awam-Asist-Citizen-Services-Navigation-RAG-Chatbot.git
cd Awam-Asist-Citizen-Services-Navigation-RAG-Chatbot/backend

python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

pip install -r requirements.txt

export GROQ_API_KEY=your_groq_api_key_here   # Windows: set GROQ_API_KEY=...

uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Test the text endpoint:

```bash
curl -X POST http://localhost:8000/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "How do I get a new electricity connection from IESCO?"}'
```

Test the voice endpoint:

```bash
curl -X POST http://localhost:8000/transcribe \
  -F "audio=@your_audio_file.wav;type=audio/wav"
```

Run the frontend:

```bash
cd ../frontend
npm install
npm run dev
```

---

## Rebuilding the Knowledge Base

Open `notebook/RAG_Pipeline_Awam_Assist.ipynb` in Google Colab and run the steps in order:

| Step | What It Does |
|------|-------------|
| Step 1 | Install dependencies |
| Step 2 | Import all libraries |
| Step 3 | Upload knowledge base zip directly to Colab via file picker |
| Step 4 | Extract zip and load all .txt and .pdf files recursively |
| Step 5 | Split documents into 1000-character chunks with 100-character overlap |
| Step 6 | Delete old ChromaDB (prevents read-only database errors) |
| Step 7 | Generate embeddings and save to ChromaDB |
| Step 8 | Initialize the Groq LLM |
| Step 9 | Build the RAG chain |
| Step 10 | Run a single test query to verify the pipeline |
| Step 11 | Run batch evaluation across all 15 categories |
| Step 12 | Debug retrieval for any failing category |
| Step 13 | Verify all files are indexed in ChromaDB |
| Step 14 | Interactive chat widget for manual testing |
| Step 15 | Export ChromaDB as a zip file and download it |

After downloading, replace the five ChromaDB files in `backend/` and push to GitHub. Railway auto-redeploys.

**Important:** Always run Step 6 before Step 7. Skipping it causes a read-only database error from the previous session's locked ChromaDB.

---

## Deployment Guide

### Backend on Railway

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

**Environment variable:**

| Variable | Value |
|----------|-------|
| `GROQ_API_KEY` | Your Groq API key (used for both LLM and Whisper) |

### Frontend on Vercel

1. Import your GitHub repository at [vercel.com](https://vercel.com)
2. Set root directory to `frontend/`
3. Set framework preset to Vite
4. Deploy

---

## Design Decisions

**Why RAG instead of fine-tuning?**

Fine-tuning an LLM on government documents would be expensive, slow to update, and prone to hallucination. RAG allows the knowledge base to be updated by simply adding a text file and re-running the ingestion pipeline. The LLM is only used for reasoning and language generation, not as a knowledge store.

**Why chunk_size = 1000 instead of a smaller value?**

The initial implementation used chunk_size = 500. During evaluation, 3 out of 15 categories failed because section headers and their associated content split into separate chunks at that size. Increasing to 1000 resolved all retrieval failures and brought batch evaluation to 15/15.

**Why Groq Whisper for voice instead of the Web Speech API?**

The Web Speech API was tested first. It failed consistently for Pakistani accents and Roman Urdu, misreading "sehat card" as "shakti card" and similar errors. Groq Whisper handles multilingual speech and Pakistani-accented Urdu accurately, and uses the same API key already in use for the LLM with no additional cost.

**Why ChromaDB instead of Pinecone or Weaviate?**

ChromaDB runs locally with no external service dependency and no cost. For 139 chunks, a fully managed vector database would be over-engineering. ChromaDB files bundle directly with the backend.

**Why Groq instead of OpenAI?**

Groq's free tier provides fast inference on both LLaMA 3.3 70B and Whisper. For a civic application, avoiding paid API dependencies on the critical path makes the project more sustainable.

**Why not fine-tune an Urdu model?**

The target users type and speak in Roman Urdu, not Urdu script. No production-ready embedding model exists specifically for Roman Urdu. The multilingual model `paraphrase-multilingual-MiniLM-L12-v2` is a planned upgrade. For now, the English embedding model handles retrieval while the LLM and Whisper handle Roman Urdu input and response generation.

---

## Limitations and Known Issues

**Roman Urdu retrieval gap**

The embedding model (`all-MiniLM-L6-v2`) is trained primarily on English text. Retrieval precision is lower for Roman Urdu inputs than for English ones, though the LLM still generates accurate Roman Urdu responses.

**Voice input requires HTTPS**

The `MediaRecorder` API requires a secure context. It works on the live Vercel deployment but not on plain `localhost`. Use `127.0.0.1` locally if you need to test voice input during development.

**Knowledge base freshness**

Government policies change. The current knowledge base reflects information as of early 2026. There is no automated mechanism to detect when source documents change.

**Geographic coverage**

The knowledge base is primarily focused on Punjab and ICT (Islamabad). Citizens from Sindh, KP, and Balochistan will find less relevant information for province-specific services.

**No conversation memory**

Each query is processed independently. The chatbot does not remember previous turns in a conversation.

**Groq free tier limits**

The free tier allows 100,000 tokens per day on LLaMA 3.3 70B. For development, switching to `llama-3.1-8b-instant` (1M tokens/day free) preserves the daily budget.

**Railway free tier cold starts**

The Railway free tier may spin down the backend after inactivity. The first request after a cold start may take 10 to 15 seconds.

---

## Roadmap

**Near term**

- Driving license and motor vehicle registration
- Multilingual embeddings for improved Roman Urdu retrieval
- Conversation memory for multi-turn queries

**Medium term**

- WhatsApp bot integration via Twilio for mobile accessibility
- Province-specific coverage for Sindh, KP, and Balochistan
- Automated knowledge base refresh pipeline

**Long term**

- User feedback loop to improve retrieval quality over time
- BISP eligibility pre-screening form in the frontend
- Real-time bill and status lookup via official government APIs

---

## Contributing

To add a new knowledge base document:

1. Create a well-structured plain-text file in the `data/` folder
2. Source content only from official government websites
3. Follow the existing document format (section headers, plain language)
4. Re-run the ingestion pipeline in the notebook (Steps 6 through 7)
5. Export the new ChromaDB and replace the files in `backend/`
6. Open a pull request with the new data file and updated ChromaDB files

---

## Author

**Murtaza Majid**

Data Science undergraduate, graduating June 2026. Interested in applied NLP, retrieval systems, and building AI tools that solve real problems for real people.

[LinkedIn](https://www.linkedin.com/in/murtaza-majid) · [GitHub](https://github.com/MurtazaMajid) · murtazamajid.123@gmail.com

---

*Awam Assist — because access to information is a right, not a privilege.*
