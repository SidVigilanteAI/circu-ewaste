# 🌿 CircuScan — AI E-Waste Reduction & Circular Decision Platform

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-16.3-black.svg?style=flat&logo=next.js&logoColor=white)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14%2B-336791.svg?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-Multimodal%20Vision-4285F4.svg?style=flat&logo=google&logoColor=white)](https://ai.google.dev/)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9-199900.svg?style=flat&logo=leaflet&logoColor=white)](https://leafletjs.com/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC.svg?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **CircuScan** is an intelligent full-stack AI platform engineered to combat the global e-waste crisis. By combining **Multimodal Computer Vision**, **RapidOCR**, **PyMuPDF**, and **DuckDuckGo Web Intelligence**, CircuScan scans end-of-life gadgets, diagnoses their operational condition, provides instant **4R Recommendations** (**Reuse**, **Repair**, **Donate**, **Recycle**), benchmarks real-time resale arbitrage, estimates spare part repair costs, and maps certified e-waste recyclers across Indian PIN codes.

---

## 📑 Table of Contents

- [Key Highlights](#-key-highlights)
- [System Architecture](#-system-architecture)
- [PostgreSQL Database Storage Design](#-postgresql-database-storage-design)
  - [Entity-Relationship (ER) Diagram](#entity-relationship-er-diagram)
  - [Complete SQL DDL Schema](#complete-sql-ddl-schema)
  - [Data Entities & Attributes](#data-entities--attributes)
  - [Indexing & Query Optimization](#indexing--query-optimization)
- [Core Features](#-core-features)
- [Technology Stack](#-technology-stack)
- [Project Directory Structure](#-project-directory-structure)
- [REST API Reference](#-rest-api-reference)
- [Installation & Setup Guide](#-installation--setup-guide)
  - [1. Prerequisites](#1-prerequisites)
  - [2. Clone Repository & Setup Environment](#2-clone-repository--setup-environment)
  - [3. PostgreSQL Database Setup](#3-postgresql-database-setup)
  - [4. Backend Service Setup (FastAPI)](#4-backend-service-setup-fastapi)
  - [5. Frontend Service Setup (Next.js)](#5-frontend-service-setup-nextjs)
- [Environment Configuration (.env)](#-environment-configuration-env)
- [Verification & Testing](#-verification--testing)
- [Roadmap & Contributing](#-roadmap--contributing)
- [License](#-license)

---

## 🚀 Key Highlights

* **Multimodal Device Ingestion**: Upload physical gadget photos, back-panel regulatory labels, PDF purchase invoices, or raw text prompts.
* **Dual-Tier OCR & Visual Recognition**: Employs **RapidOCR** for printed serials/model numbers, **PyMuPDF** for invoices, and **Google Gemini Vision** for unlabelled, worn-out, or disassembled hardware.
* **Context-Aware Dynamic Diagnostics**: Dynamically generates tailored functional checklists based on the exact gadget make, model, and category.
* **Circular 4R Evaluation Matrix**: Algorithmic decision engine balancing ecological preservation, repair feasibility, and economic recovery.
* **Secondary Market Price Arbitrage**: Fetches real-time market valuations across platforms (**Cashify**, **CeX India**, **Amazon Renewed**, **OLX**).
* **DIY Repair & Cost Estimator**: Calculates repairability scores (1–10), component replacement costs (display, battery, port), and soldering difficulty.
* **PIN-Code Geocoded Drop-Off Centers**: Interactive **Leaflet** map plotting verified e-waste collection centers, authorized brand service centers, and refurbishment NGOs across India.
* **Comprehensive PostgreSQL Storage**: Persists user accounts, device telemetry, raw OCR artifacts, diagnostic responses, market arbitrage history, and environmental impact audits.

---

## 🏗 System Architecture

The following diagram illustrates the end-to-end data flow between the user interface, backend microservices, AI inference engines, web intelligence scrapers, and the **PostgreSQL Storage Layer**:

```mermaid
flowchart TB
    subgraph ClientLayer["🖥️ Frontend Client (Next.js 16 + React 19)"]
        UI["CircuScan Web UI\n(Tailwind CSS v4 + Lucide Icons)"]
        UploadModule["Gadget Intake\n(Camera / Image / PDF / Text)"]
        QuizModule["Diagnostic Wizard\n(Dynamic Q&A Flow)"]
        DashboardModule["4R Decision Dashboard\n(Arbitrage, DIY Parts, Eco Impact)"]
        MapModule["Interactive Drop-off Map\n(Leaflet.js + OSM Tiles)"]
    end

    subgraph APILayer["⚡ Backend API Gateway (FastAPI)"]
        MainRouter["FastAPI Application\n(Port 8000)"]
        CORS["CORS Middleware"]
        IngestEndpoints["/api/ingest/{image, pdf, text}"]
        QuestionEndpoints["/api/questions"]
        EvaluateEndpoints["/api/evaluate"]
        CentersEndpoints["/api/nearby-centers"]
    end

    subgraph ServiceLayer["🧠 Intelligence & Processing Pipeline"]
        OCR["RapidOCR Engine\n(Image Serial/Text Extraction)"]
        PDFParser["PyMuPDF Parser\n(Invoice & Spec Sheet Reader)"]
        VisionAI["Google Gemini Vision / LLM\n(Visual Categorization & Diagnostics)"]
        WebIntelligence["DuckDuckGo Search Service\n(Real-time Secondary Market Scraping)"]
        GeoService["PIN Geocoding Service\n(Postal Mapping & Distance Matrix)"]
    end

    subgraph StorageLayer["🗄️ PostgreSQL Relational Database"]
        DB[(PostgreSQL 14+\nDatabase Cluster)]
        T_Users["users\n(Profiles, PIN, Settings)"]
        T_Gadgets["gadgets\n(Make, Model, Specs, Status)"]
        T_Assets["gadget_assets\n(Images, Invoices, Raw OCR)"]
        T_Diag["diagnostic_sessions & answers\n(User Q&A Logs)"]
        T_Eval["circular_evaluations\n(4R Decision, Eco Metrics)"]
        T_Arbitrage["arbitrage_quotes\n(Cashify, CeX, Amazon, OLX)"]
        T_Parts["diy_repair_parts\n(Costs, Difficulty, Part Names)"]
        T_Centers["local_dropoff_centers\n(Geo Lat/Lon, Ratings, PIN)"]
        T_History["gadget_lifecycle_history\n(Audit Trail: Reuse/Recycle)"]
    end

    %% Client to API
    UI --> UploadModule & QuizModule & DashboardModule & MapModule
    UploadModule -->|Multipart Image / PDF / JSON| IngestEndpoints
    QuizModule -->|Candidate Device Payload| QuestionEndpoints
    DashboardModule -->|Answers + Specs + PIN| EvaluateEndpoints
    MapModule -->|PIN Code Query| CentersEndpoints

    %% API to Services
    IngestEndpoints --> OCR & PDFParser & VisionAI
    QuestionEndpoints --> VisionAI
    EvaluateEndpoints --> VisionAI & WebIntelligence
    CentersEndpoints --> GeoService

    %% API / Service to PostgreSQL
    MainRouter -.->|Persist / Read| DB
    DB --- T_Users
    DB --- T_Gadgets
    DB --- T_Assets
    DB --- T_Diag
    DB --- T_Eval
    DB --- T_Arbitrage
    DB --- T_Parts
    DB --- T_Centers
    DB --- T_History
```

---

## 🗄 PostgreSQL Database Storage Design

CircuScan utilizes **PostgreSQL** to provide strong ACID guarantees, structured relational integrity, and flexible **JSONB** document storage for dynamic hardware specifications and diagnostic trees.

### Entity-Relationship (ER) Diagram

```mermaid
erDiagram
    USERS ||--o{ GADGETS : "owns"
    GADGETS ||--o{ GADGET_ASSETS : "contains"
    GADGETS ||--o{ DIAGNOSTIC_SESSIONS : "undergoes"
    GADGETS ||--o{ CIRCULAR_EVALUATIONS : "evaluated as"
    GADGETS ||--o{ GADGET_LIFECYCLE_HISTORY : "tracks"
    DIAGNOSTIC_SESSIONS ||--o{ DIAGNOSTIC_ANSWERS : "records"
    CIRCULAR_EVALUATIONS ||--o{ ARBITRAGE_QUOTES : "generates"
    CIRCULAR_EVALUATIONS ||--o{ DIY_REPAIR_PARTS : "recommends"
    LOCAL_DROPOFF_CENTERS ||--o{ CIRCULAR_EVALUATIONS : "referenced by"

    USERS {
        uuid id PK
        varchar email UK
        varchar full_name
        varchar default_pincode
        timestamptz created_at
    }

    GADGETS {
        uuid id PK
        uuid user_id FK
        varchar brand
        varchar model
        varchar category
        varchar release_year
        varchar serial_or_imei
        float detection_confidence
        varchar status
        timestamptz created_at
        timestamptz updated_at
    }

    GADGET_ASSETS {
        uuid id PK
        uuid gadget_id FK
        varchar asset_type
        varchar storage_url
        integer file_size_bytes
        varchar mime_type
        text raw_extracted_text
        float ocr_confidence
        timestamptz created_at
    }

    DIAGNOSTIC_SESSIONS {
        uuid id PK
        uuid gadget_id FK
        varchar session_status
        timestamptz started_at
        timestamptz completed_at
    }

    DIAGNOSTIC_ANSWERS {
        uuid id PK
        uuid session_id FK
        varchar question_id
        text question_text
        varchar selected_option
        timestamptz answered_at
    }

    CIRCULAR_EVALUATIONS {
        uuid id PK
        uuid gadget_id FK
        uuid session_id FK
        varchar recommendation
        varchar recommendation_title
        text recommendation_reasoning
        decimal eco_ewaste_kg
        decimal eco_co2_kg
        jsonb hazardous_materials
        varchar resale_value_inr
        varchar repair_cost_inr
        varchar scrap_value_inr
        integer repairability_score
        varchar repair_difficulty
        text product_overview
        jsonb key_specs
        jsonb data_sanitization_guide
        jsonb next_action_steps
        timestamptz created_at
    }

    ARBITRAGE_QUOTES {
        uuid id PK
        uuid evaluation_id FK
        varchar platform
        varchar quote_inr
        varchar payout_type
        varchar convenience_level
        timestamptz fetched_at
    }

    DIY_REPAIR_PARTS {
        uuid id PK
        uuid evaluation_id FK
        varchar part_name
        varchar cost_range_inr
        varchar diy_difficulty
    }

    LOCAL_DROPOFF_CENTERS {
        uuid id PK
        varchar name
        varchar center_type
        varchar category
        text address
        varchar contact_url
        varchar phone
        varchar pincode
        decimal latitude
        decimal longitude
        varchar timing
        varchar rating
    }

    GADGET_LIFECYCLE_HISTORY {
        uuid id PK
        uuid gadget_id FK
        varchar previous_status
        varchar new_status
        varchar action_taken
        text notes
        timestamptz recorded_at
    }
```

---

### Complete SQL DDL Schema

Copy and execute this script inside your PostgreSQL database (`psql -d circuscan_db`):

```sql
-- ====================================================================
-- CircuScan PostgreSQL Schema: Gadget & Circular Evaluation Storage
-- ====================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Enumerated Types for Domain Constraints
DO $$ BEGIN
    CREATE TYPE device_status_enum AS ENUM (
        'INTAKE_PENDING',
        'DIAGNOSED',
        'EVALUATED',
        'REPAIRED',
        'RESOLD',
        'DONATED',
        'RECYCLED',
        'DISPOSED'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE recommendation_enum AS ENUM (
        'REUSE',
        'REPAIR',
        'DONATE',
        'RECYCLE'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE asset_type_enum AS ENUM (
        'DEVICE_PHOTO',
        'LABEL_STICKER',
        'PURCHASE_INVOICE_PDF',
        'USER_MANUAL_PDF'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE facility_category_enum AS ENUM (
        'RECYCLE',
        'REPAIR',
        'DONATE'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(150),
    default_pincode VARCHAR(10) DEFAULT '560001',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Gadgets / Devices Table
CREATE TABLE IF NOT EXISTS gadgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    brand VARCHAR(100) NOT NULL DEFAULT 'Unknown',
    model VARCHAR(150) NOT NULL DEFAULT 'Unknown',
    category VARCHAR(100) NOT NULL DEFAULT 'Electronic Device',
    release_year VARCHAR(10),
    serial_or_imei VARCHAR(100),
    detection_confidence NUMERIC(4,3) DEFAULT 1.000,
    status device_status_enum DEFAULT 'INTAKE_PENDING',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. Ingestion Media & Raw OCR Text Artifacts
CREATE TABLE IF NOT EXISTS gadget_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gadget_id UUID NOT NULL REFERENCES gadgets(id) ON DELETE CASCADE,
    asset_type asset_type_enum NOT NULL DEFAULT 'DEVICE_PHOTO',
    storage_url TEXT NOT NULL,
    file_size_bytes INTEGER,
    mime_type VARCHAR(100) DEFAULT 'image/jpeg',
    raw_extracted_text TEXT DEFAULT '',
    ocr_confidence NUMERIC(4,3) DEFAULT 1.000,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. Diagnostic Questions Sessions
CREATE TABLE IF NOT EXISTS diagnostic_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gadget_id UUID NOT NULL REFERENCES gadgets(id) ON DELETE CASCADE,
    session_status VARCHAR(50) DEFAULT 'COMPLETED',
    started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. Diagnostic Answers Record
CREATE TABLE IF NOT EXISTS diagnostic_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES diagnostic_sessions(id) ON DELETE CASCADE,
    question_id VARCHAR(100) NOT NULL,
    question_text TEXT NOT NULL,
    selected_option VARCHAR(255) NOT NULL,
    answered_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 8. Circular 4R Evaluations Table
CREATE TABLE IF NOT EXISTS circular_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gadget_id UUID NOT NULL REFERENCES gadgets(id) ON DELETE CASCADE,
    session_id UUID REFERENCES diagnostic_sessions(id) ON DELETE SET NULL,
    recommendation recommendation_enum NOT NULL,
    recommendation_title VARCHAR(255) NOT NULL,
    recommendation_reasoning TEXT NOT NULL,
    
    -- Environmental Impact Metrics
    eco_ewaste_kg NUMERIC(6,3) DEFAULT 0.000,
    eco_co2_kg NUMERIC(8,3) DEFAULT 0.000,
    hazardous_materials JSONB DEFAULT '[]'::jsonb,
    
    -- Financial Estimates (INR)
    resale_value_inr VARCHAR(50) DEFAULT '₹0',
    repair_cost_inr VARCHAR(50) DEFAULT '₹0',
    scrap_value_inr VARCHAR(50) DEFAULT '₹0',
    
    -- Hardware Viability
    repairability_score INTEGER CHECK (repairability_score BETWEEN 1 AND 10),
    repair_difficulty VARCHAR(50) DEFAULT 'Moderate',
    product_overview TEXT,
    
    -- JSONB Structured Telemetry
    key_specs JSONB DEFAULT '[]'::jsonb,
    data_sanitization_guide JSONB DEFAULT '[]'::jsonb,
    next_action_steps JSONB DEFAULT '[]'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 9. Resale Arbitrage Marketplace Quotes
CREATE TABLE IF NOT EXISTS arbitrage_quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluation_id UUID NOT NULL REFERENCES circular_evaluations(id) ON DELETE CASCADE,
    platform VARCHAR(100) NOT NULL, -- e.g. Cashify, CeX India, Amazon Renewed, OLX
    quote_inr VARCHAR(50) NOT NULL,
    payout_type VARCHAR(100) NOT NULL, -- Instant Cash/UPI, Store Voucher, Direct Buyer
    convenience_level VARCHAR(100) NOT NULL, -- Doorstep Pickup, Walk-in Store
    fetched_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 10. DIY Spare Part Cost Breakdown
CREATE TABLE IF NOT EXISTS diy_repair_parts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluation_id UUID NOT NULL REFERENCES circular_evaluations(id) ON DELETE CASCADE,
    part_name VARCHAR(150) NOT NULL, -- Display assembly, Battery, Charging Port
    cost_range_inr VARCHAR(50) NOT NULL,
    diy_difficulty VARCHAR(50) DEFAULT 'Moderate' -- Beginner, Moderate, Advanced
);

-- 11. Local Drop-Off & E-Waste Facilities
CREATE TABLE IF NOT EXISTS local_dropoff_centers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    center_type VARCHAR(100) NOT NULL, -- Certified Recycler, Local Repair, NGO
    category facility_category_enum NOT NULL DEFAULT 'RECYCLE',
    address TEXT NOT NULL,
    contact_url TEXT,
    phone VARCHAR(50),
    pincode VARCHAR(10) NOT NULL,
    latitude NUMERIC(9,6),
    longitude NUMERIC(9,6),
    timing VARCHAR(100) DEFAULT '10:00 AM - 8:00 PM',
    rating VARCHAR(20) DEFAULT '4.5 ★',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 12. Gadget Lifecycle Audit Trail
CREATE TABLE IF NOT EXISTS gadget_lifecycle_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gadget_id UUID NOT NULL REFERENCES gadgets(id) ON DELETE CASCADE,
    previous_status device_status_enum,
    new_status device_status_enum NOT NULL,
    action_taken VARCHAR(255) NOT NULL,
    notes TEXT,
    recorded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- Performance Indexes & Constraints
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_gadgets_user_id ON gadgets(user_id);
CREATE INDEX IF NOT EXISTS idx_gadgets_category ON gadgets(category);
CREATE INDEX IF NOT EXISTS idx_gadgets_brand_model ON gadgets(brand, model);
CREATE INDEX IF NOT EXISTS idx_gadget_assets_gadget_id ON gadget_assets(gadget_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_gadget_id ON circular_evaluations(gadget_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_recommendation ON circular_evaluations(recommendation);
CREATE INDEX IF NOT EXISTS idx_arbitrage_evaluation_id ON arbitrage_quotes(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_parts_evaluation_id ON diy_repair_parts(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_dropoff_pincode ON local_dropoff_centers(pincode);
CREATE INDEX IF NOT EXISTS idx_dropoff_category ON local_dropoff_centers(category);
CREATE INDEX IF NOT EXISTS idx_history_gadget_id ON gadget_lifecycle_history(gadget_id);

-- GIN Index for rapid JSONB querying
CREATE INDEX IF NOT EXISTS idx_evaluations_specs_gin ON circular_evaluations USING gin(key_specs);
CREATE INDEX IF NOT EXISTS idx_evaluations_hazmat_gin ON circular_evaluations USING gin(hazardous_materials);
```

---

### Data Entities & Attributes

| Table Name | Description | Key Attributes |
| :--- | :--- | :--- |
| `users` | Manages registered owners, contact info, and default PIN. | `id`, `email`, `default_pincode` |
| `gadgets` | Stores physical metadata identified by AI / OCR. | `brand`, `model`, `category`, `serial_or_imei`, `status` |
| `gadget_assets` | Stores ingested binaries, receipts, photos & raw OCR text. | `asset_type`, `storage_url`, `raw_extracted_text`, `ocr_confidence` |
| `diagnostic_sessions` | Tracks an interactive diagnostic assessment. | `gadget_id`, `session_status`, `started_at` |
| `diagnostic_answers` | Answers provided by user for each diagnostic question. | `question_id`, `question_text`, `selected_option` |
| `circular_evaluations`| Core 4R decision, eco footprints, financial estimates. | `recommendation`, `eco_ewaste_kg`, `eco_co2_kg`, `resale_value_inr` |
| `arbitrage_quotes` | Live resale benchmark across secondary marketplaces. | `platform`, `quote_inr`, `payout_type`, `convenience_level` |
| `diy_repair_parts` | Recommended spare parts, cost brackets, and DIY skill. | `part_name`, `cost_range_inr`, `diy_difficulty` |
| `local_dropoff_centers`| Geocoded recycling hubs, repair shops, and NGOs. | `name`, `category`, `pincode`, `latitude`, `longitude` |
| `gadget_lifecycle_history` | Audit log tracking gadget progression through circular stages. | `previous_status`, `new_status`, `action_taken` |

---

## 💡 Core Features

### 1. Multi-Format Intelligent Ingestion
- **Camera/Photo Capture**: Upload raw photos or camera snapshots of your device.
- **Back-Panel OCR**: Automatically detects FCC IDs, model codes, serial numbers, voltage ratings.
- **Invoice & Spec Sheet PDF**: Direct upload of purchase bills to pull memory, storage, purchase date, and exact variant specs.
- **Text & Model Ingestion**: Natural language input parser for quick evaluations.

### 2. Tailored Dynamic Diagnostics
- Rather than static forms, CircuScan generates **device-specific diagnostic questions** (e.g., assessing OLED screen condition, battery health, boot status, keyboard hinge integrity).
- Provides immediate multiple-choice options with explanatory notes.

### 3. Circular 4R Decision Engine
Calculates the optimal ecological and financial trajectory:
1. **REUSE**: Functional devices with high secondary market demand.
2. **REPAIR**: High salvage value where part replacement cost is under 30–40% of refurbished value.
3. **DONATE**: Older but functioning devices suitable for schools, NGOs, and digital literacy programs.
4. **RECYCLE**: Irreparable, obsolete, or toxic gadgets routed to R2/e-Stewards/CPCB authorized recyclers.

### 4. Live Secondary Market Arbitrage
Scrapes and benchmarks current market offers from:
- **Cashify India** (Instant doorstep cash/UPI)
- **CeX / WeBuy India** (Cash & store exchange voucher)
- **Amazon Renewed / Trade-in** (Amazon Pay balance)
- **OLX / Quickr** (P2P direct buyer pricing)

### 5. Verified Drop-off & Recycling Facility Locator
- Queries over **25+ Indian Postal Regions** (Bengaluru, Chennai, Mumbai, Pune, Delhi NCR, Hyderabad, Kolkata, Ahmedabad, Kochi, Jaipur, etc.).
- Categorizes facilities into **Certified Recyclers**, **Authorized Brand Centers**, and **Refurbishment NGOs**.
- Interactive **Leaflet Map** with custom pin markers, distance estimations, and contact links.

### 6. Privacy & Data Sanitization Guide
- Custom factory reset and firmware wipe instructions (e.g., iCloud unlinking, Android FRP bypass removal, NVMe cryptographic erase, BitLocker removal).

---

## 🛠 Technology Stack

### Frontend Application
- **Framework**: [Next.js 16.3 (App Router)](https://nextjs.org/)
- **Library**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Mapping**: [Leaflet 1.9](https://leafletjs.com/) & `react-leaflet` with OpenStreetMap CartoDB Tiles
- **Typography**: Inter / Geist Sans

### Backend Services
- **API Framework**: [FastAPI 0.110+](https://fastapi.tiangolo.com/) (Asynchronous Python ASGI)
- **Server Engine**: [Uvicorn](https://www.uvicorn.org/)
- **OCR Engine**: [RapidOCR](https://github.com/RapidAI/RapidOCR) (ONNX-based lightweight text extractor)
- **Document Processing**: [PyMuPDF (fitz)](https://pymupdf.readthedocs.io/) for invoice extraction
- **AI / LLM Orchestration**: [LangChain](https://www.langchain.com/) & [LangChain Google GenAI](https://python.langchain.com/docs/integrations/chat/google_generative_ai/) (`gemini-1.5-flash` / `gemini-2.0-flash`)
- **Web Intelligence**: [DuckDuckGo Search API](https://pypi.org/project/duckduckgo-search/)
- **Data Validation**: [Pydantic v2](https://docs.pydantic.dev/)

### Database Layer
- **Relational DB**: [PostgreSQL 14+](https://www.postgresql.org/)
- **JSON Engine**: Native PostgreSQL `JSONB` with GIN indexing for flexible telemetry

---

## 📂 Project Directory Structure

```text
web search agent/
├── app/                              # FastAPI Backend Application
│   ├── __init__.py
│   ├── agent.py                      # Gemini LLM Chains, 4R Evaluation & Diagnostics
│   ├── geocoding_service.py          # Indian PIN Coordinate Map & Facility Lookup
│   ├── main.py                       # FastAPI Endpoints, CORS & File Upload Routers
│   ├── ocr_service.py                # RapidOCR & PyMuPDF Byte Extraction
│   ├── schemas.py                    # Pydantic Schemas & DTOs
│   └── search_service.py             # DuckDuckGo Web Pricing & Spec Scraping
├── frontend/                         # Next.js 16 Client Application
│   ├── package.json
│   ├── tsconfig.json
│   ├── postcss.config.mjs
│   ├── public/                       # Static Assets & Icons
│   └── src/
│       └── app/
│           ├── components/
│           │   └── NearbyMapVisualizer.tsx   # Dynamic Leaflet OSM Map Component
│           ├── globals.css           # Tailwind v4 Directives & Dark Palette
│           ├── layout.tsx            # HTML Root Layout & Metadata
│           └── page.tsx              # Interactive CircuScan 4R App Dashboard
├── requirements.txt                  # Python Dependencies
├── .env                              # Backend Environment Configuration
└── README.md                         # Project Documentation
```

---

## 📡 REST API Reference

The backend exposes an interactive OpenAPI Swagger UI at `http://localhost:8000/docs`.

### 1. Ingest Image
`POST /api/ingest/image`
- **Content-Type**: `multipart/form-data`
- **Form Param**: `file` (Image file: `.jpg`, `.png`, `.webp`)
- **Response**: `DeviceCandidate`
```json
{
  "brand": "Realme",
  "model": "Realme 8 5G",
  "category": "Smartphone",
  "release_year": "2021",
  "serial_or_specs": "Model RMX3241, 128GB Storage, 8GB RAM",
  "confidence_score": 0.94,
  "raw_extracted_text": "realme MODEL: RMX3241 MADE IN INDIA..."
}
```

### 2. Ingest PDF Invoice
`POST /api/ingest/pdf`
- **Content-Type**: `multipart/form-data`
- **Form Param**: `file` (PDF Document: `.pdf`)
- **Response**: `DeviceCandidate`

### 3. Ingest Raw Text
`POST /api/ingest/text`
- **Content-Type**: `application/json`
```json
{
  "text": "Acer Aspire 7 Gaming Laptop Core i5 10th Gen GTX 1650 512GB SSD"
}
```

### 4. Fetch Diagnostic Questions
`POST /api/questions`
- **Content-Type**: `application/json`
- **Body**: `DeviceCandidate`
- **Response**: `QuestionsResponse` containing 3–5 targeted questions.

### 5. Perform Circular 4R Evaluation
`POST /api/evaluate`
- **Content-Type**: `application/json`
```json
{
  "device": {
    "brand": "Acer",
    "model": "Aspire 7 A715-75G",
    "category": "Laptop",
    "release_year": "2020",
    "serial_or_specs": "Core i5, 8GB RAM, GTX 1650"
  },
  "answers": {
    "power_status": "Powers ON, battery holds charge",
    "screen_display": "Screen pristine, no dead pixels",
    "casing_hinge": "Minor scuffs, hinges intact"
  },
  "location_or_city": "560001"
}
```
- **Response**: `CircularEvaluationResult` (Recommendation, Eco impact, Resale arbitrage, DIY repair parts, Sanitization guide).

### 6. Locate Nearby E-Waste Facilities
`GET /api/nearby-centers?pincode=560001&brand=Acer&category=Laptop`
- **Response**:
```json
{
  "pincode": "560001",
  "total": 3,
  "centers": [
    {
      "name": "Karo Sambhav E-Waste Hub",
      "center_type": "Certified E-Waste Recycler",
      "category": "RECYCLE",
      "address": "Infantry Road, Shivajinagar, Bengaluru 560001",
      "contact_or_link": "https://www.google.com/maps/search/?api=1&query=Karo+Sambhav+560001",
      "phone": "+91 80 4123 4567",
      "pincode": "560001",
      "distance_km": "1.8 km",
      "latitude": 12.9785,
      "longitude": 77.5992,
      "timing": "09:30 AM - 06:30 PM",
      "rating": "4.8 ★"
    }
  ]
}
```

---

## 💻 Installation & Setup Guide

### 1. Prerequisites
Ensure you have the following installed on your machine:
* **Python 3.10+**: [Download Python](https://www.python.org/downloads/)
* **Node.js 18+ & npm**: [Download Node.js](https://nodejs.org/)
* **PostgreSQL 14+**: [Download PostgreSQL](https://www.postgresql.org/download/)
* **Google Gemini API Key**: [Obtain from Google AI Studio](https://aistudio.google.com/)

---

### 2. Clone Repository & Setup Environment

```bash
# Clone the repository
git clone https://github.com/your-username/circuscan-agent.git
cd circuscan-agent
```

---

### 3. PostgreSQL Database Setup

1. Start your local PostgreSQL server:
```bash
# On Windows (PowerShell / Services):
net start postgresql-x64-16

# On Linux / macOS:
sudo service postgresql start
```

2. Create the database and run the schema script:
```bash
psql -U postgres -c "CREATE DATABASE circuscan_db;"
psql -U postgres -d circuscan_db -f schema.sql
```
*(Alternatively, copy and paste the SQL DDL block provided in this README into pgAdmin or psql).*

---

### 4. Backend Service Setup (FastAPI)

1. Create and activate a Python virtual environment:
```bash
# Windows
python -m venv .venv
.\.venv\Scripts\activate

# Linux / macOS
python3 -m venv .venv
source .venv/bin/activate
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
pip install rapidocr-onnxruntime pymupdf psycopg2-binary sqlalchemy
```

3. Create the backend `.env` file in the root directory:
```env
GEMINI_API_KEY=your_gemini_api_key_here
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/circuscan_db
PORT=8000
HOST=0.0.0.0
```

4. Run the FastAPI development server:
```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
The API is now running at `http://127.0.0.1:8000` (Docs: `http://127.0.0.1:8000/docs`).

---

### 5. Frontend Service Setup (Next.js)

1. Navigate to the `frontend` folder:
```bash
cd frontend
```

2. Install npm dependencies:
```bash
npm install
```

3. Configure environment variables (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_BASE=http://127.0.0.1:8000
```

4. Launch the Next.js development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ⚙️ Environment Configuration (.env)

| Variable | Required | Default | Purpose |
| :--- | :--- | :--- | :--- |
| `GEMINI_API_KEY` | **Yes** | — | Google Gemini Pro/Flash Multimodal API Key. |
| `DATABASE_URL` | **Yes** | `postgresql://postgres:admin@localhost:5432/circuscan_db` | PostgreSQL Connection URI. |
| `NEXT_PUBLIC_API_BASE` | No | `http://127.0.0.1:8000` | Frontend endpoint pointing to FastAPI backend. |
| `PORT` | No | `8000` | Backend server port. |

---

## 🧪 Verification & Testing

### Test Backend Health
```bash
curl http://127.0.0.1:8000/health
# Expected output: {"status":"ok","service":"CircuScan API","version":"2.1.0"}
```

### Test Text Ingestion Endpoint
```bash
curl -X POST "http://127.0.0.1:8000/api/ingest/text" \
     -H "Content-Type: application/json" \
     -d "{\"text\": \"Apple iPhone 12 128GB Blue\"}"
```

### Test Nearby E-Waste Centers Endpoint
```bash
curl "http://127.0.0.1:8000/api/nearby-centers?pincode=560001&brand=Apple&category=Smartphone"
```

---

## 🗺️ Roadmap

- [x] Multimodal Vision & OCR Engine integration.
- [x] Dynamic diagnostic question generation with Google Gemini.
- [x] Real-time secondary market arbitrage (Cashify, CeX, Amazon).
- [x] Geocoded recycling & repair center map visualizer.
- [x] PostgreSQL relational storage & schema design.
- [ ] Automated image object detection bounding boxes for physical cracks.
- [ ] Direct WhatsApp bot interface for instant doorstep e-waste pickups.
- [ ] Enterprise ESG e-waste disposal compliance certificate generation.

---

## 📄 License

This project is licensed under the **MIT License**. Feel free to use, modify, and distribute for educational, personal, or commercial purposes.
