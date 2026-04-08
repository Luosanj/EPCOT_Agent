# Genomic Foundation Model (GFM) Platform

Welcome to the GFM Platform, an advanced web application designed for AI-powered genomic research. This platform provides a suite of tools for analyzing DNA sequences, managing research, and interacting with a specialized AI assistant trained specifically for genomic foundation model predictions.

## ✨ Features

The platform includes:
-   **New Analysis Runs**: Submit DNA sequences, FASTA files, or genomic regions for AI-powered predictions.
-   **Inline Content & Visuals**: The chat interface natively parses backend responses to securely display output tracks (1D and 2D signal coverage maps) and CSV/Pickle data download buttons seamlessly inside the chat stream.
-   **Job History**: A standalone page that queries past user sessions and automatically re-hydrates historical conversation threads, predictions, and plots so you never lose an analysis.
-   **Detailed Results**: View prediction scores, confidence assessments, and evidence panels with links to external databases like UCSC and Ensembl.
-   **AI Assistant**: An integrated chat interface powered by Qwen3 (via vLLM) that helps explain results, compare analyses, and guide users through the prediction system using backend-only capabilities.
-   **LLM Request Queue**: The chat panel supports queued prompts. You can submit multiple messages while a response is running, and requests are processed in order.

## 🏛️ Architecture

This application uses a client-server architecture:

-   **Frontend**: A modern React single-page application (SPA) that provides the user interface.
-   **Backend**: A Python server built with FastAPI that exposes endpoints for genomic data uploads and interaction.
-   **AI Layer**: An AI planner module that extracts genomic coordinates and intent from user inputs, delegating to the **EPCOT** model (via PyTorch) to perform high-fidelity predictions based on chromatin accessibility (.bam files).

## 🛠️ Tech Stack

This project is built with a modern, robust technology stack:

-   **Frontend**:
    -   **Framework**: [React](https://reactjs.org/)
    -   **Language**: [TypeScript](https://www.typescriptlang.org/)
    -   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
    -   **Routing**: [React Router](https://reactrouter.com/)
-   **Backend**:
    -   **Framework**: [FastAPI](https://fastapi.tiangolo.com/)
    -   **Language**: [Python](https://www.python.org/)
    -   **Machine Learning**: [PyTorch](https://pytorch.org/) (CUDA-enabled)
    -   **Prediction Engine**: EPCOT Model (FP16 optimized)

## 🚀 Getting Started

Follow these instructions to get a local copy up and running for development and testing purposes.

### Prerequisites

Make sure you have the following installed on your machine:

-   [Node.js](https://nodejs.org/) (v18 or newer recommended)
-   [npm](https://www.npmjs.com/), [yarn](https://yarnpkg.com/), or [pnpm](https://pnpm.io/)
-   [Python](https://www.python.org/downloads/) (v3.8 or newer recommended) & `pip`

### Installation & Setup

1.  **Clone the repository:**
    ```sh
    git clone <your-repository-url>
    cd genomic_model_ai
    ```

2.  **Set up the Backend:**
    Navigate to the backend directory, create a Conda or Python virtual environment, and install dependencies from the provided `environment.yml` or `requirements.txt`.
    ```sh
    cd A.Zheng_backend
    # Using conda
    conda env create -f environment.yml
    conda activate epcot_env
    ```
    Ensure you have access to the required PyTorch/CUDA libraries and the pre-trained `human_model.pt` weights.

3.  **Set up the Frontend:**
    From the root directory, install the Node.js dependencies.
    ```sh
    # In the root 'genomic_model_ai' directory
    npm install
    # or
    yarn install
    ```

4.  **Configure Environment Variables:**
    
    **Frontend** (create `.env` in project root):
    ```env
    VITE_API_BASE_URL=http://localhost:8000
    ```
    
    **Backend** (set environment variables or create `.env` in project root):
    ```env
    VLLM_SERVER_URL=http://your-vllm-server:8000/v1
    VLLM_API_KEY=not-needed 
    SUPABASE_URL=https://your_project.supabase.co
    SUPABASE_KEY=your_anon_key
    ```
    
    See `.env.example` for more details.

5.  **Install Supabase Addons:**
    If your backend Conda environment requires the newly mapped Supabase packages, run the interactive installer from the root directory:
    ```sh
    ./A.Zheng_backend/install_supabase.sh
    ```


### Running the Application

1.  **Start the Backend Server:**
    From the `A.Zheng_backend` directory (with the environment activated):
    ```sh
    uvicorn server:app --reload
    ```
    The backend API will be running at `http://localhost:8000`.

3.  **Start the Frontend Server:**
    From the root project directory:
    ```sh
    npm run dev
    ```
    The frontend will be running at `http://localhost:3000` (configured in Vite to align with backend CORS).

4.  **Access the Application:**
    Open `http://localhost:3000` in your browser. You can access the main dashboard, or navigate to `http://localhost:3000/analysis` to upload a `.bam` file and interact with the AI assistant.

### Using the AI Chat Queue

In the chat panel (`src/components/layout/AIChatPanel.tsx`):

- Submit a message with Enter or the send button.
- While the model is still responding, submit more messages and they will be queued.
- Requests are processed sequentially and each AI reply is inserted after the matching user message.
- Use the built-in training prompt shortcut buttons for common tasks.
- Queue status is shown inline (`Idle`, `Processing`, `Queued N`).

## 📁 Project Structure

```
genomic_model_ai/
├── V.Nguyen_GFM_frontend/        # Frontend React application
│   ├── src/
│   │   ├── pages/
│   │   │   ├── new_analysis.tsx  # Analysis submission overlay
│   │   │   └── job_history.tsx   # Past session reconstruction
│   │   └── components/
│   │       └── Chatbox.tsx       # AI interactive interface
│   └── ...
├── V.Nguyen_GFM_backend/         # Isolated Backend Services
│   └── backend/
│       ├── database.py           # Supabase Postgres integration for chat sessions
│       └── history_router.py     # FastAPI endpoints for historical jobs
├── A.Zheng_backend/              # Core Backend FastAPI application
│   ├── server.py                 # FastAPI endpoints (/upload_bam, /chat)
│   ├── planner.py                # State-tracking chat assistant
│   ├── install_supabase.sh       # Bash wrapper installer for python-dotenv and supabase-py
│   ├── EPCOT_runner.py           # PyTorch inference wrapper mapped to chromosomes
│   └── environment.yml           # Conda dependencies
└── README.md                     # This file
```

## 🔧 API Endpoints

### Core Features

- **`POST /upload_bam`**: Endpoint handling multipart `.bam` file uploads. Persists file internally, generates a `session_id`, and returns a prompt requesting genomic regions.
  
- **`POST /chat`**: Follow-up chat interactions to configure genomic parameters.
  - Validates genomic regions (e.g. `chr1, 1000000, 2000000`).
  - Records message exchanges securely to the Supabase Postgres database.
  - Prompts PyTorch/CUDA execution upon confirmation and serves back high-fidelity plot image paths alongside the chat.

- **`GET /sessions`**: Administrative index route tracking all previously executed genomic analysis jobs to populate user dashboards.

- **`GET /sessions/{session_id}`**: Retrieves an exact mapping of historical inputs, outputs, messages, and associated plot images to seamlessly jumpstart past chat conversations.

## 🎯 EPCOT Functionality

The AI assistant wrapper manages multiple modalities for prediction:
- Supports 14 major signal modalities including `epi` (Epigenomes), `rna` (RNA-seq), `bru` (Bru-seq), `hic` (Hi-C), `proseq`, `netcage`, and `starr`.
- Uses FP16-precision PyTorch evaluation mapping user regions seamlessly into 600kbp window segments out-of-the-box.
- Safely validates genomic input boundaries mapping to exact chromosome lengths.

## 🤝 Contributing

Contributions are welcome! If you have suggestions for improving the platform, please feel free to open an issue or submit a pull request.

## 📄 License

This project is proprietary. All rights reserved. (Or specify an open-source license like MIT if applicable).
