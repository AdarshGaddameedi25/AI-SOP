# AI-Powered Enterprise SOP Platform

A secure, enterprise-grade web application designed for generating, auditing, and approving Standard Operating Procedures (SOPs) using AI. The platform enforces strict Role-Based Access Control (RBAC) and maintains FDA 21 CFR Part 11 compliant audit trails.

## 🚀 Key Features

*   **AI Document Generation:** Leverages Google's Gemini AI to instantly draft comprehensive SOPs (Purpose, Scope, Procedure, etc.) based on user prompts.
*   **AI Compliance Auditor:** Automatically audits drafted SOPs against regulatory standards and provides a compliance score with actionable recommendations.
*   **Enterprise Workflow (RBAC):**
    *   **Authors:** Create, edit, and submit drafts.
    *   **Reviewers:** Run AI audits, provide feedback, and approve/reject documents at the Quality Gate.
    *   **Approvers:** Provide final electronic authorization to activate the SOP.
    *   **Administrators:** Manage user privileges and oversee the entire system.
*   **FDA 21 CFR Part 11 Audit Ledger:** An immutable, searchable log of every action taken within the system.
*   **Dynamic PDF/DOCX Export:** Instantly generate perfectly formatted PDFs and Word documents from the digital SOPs.

## 🛠️ Technology Stack

*   **Frontend:** React, TypeScript, Vite
*   **Backend:** Python, Flask, SQLAlchemy, JWT Authentication
*   **AI Integration:** Google Gemini
*   **Export Engine:** ReportLab (PDF), python-docx (DOCX)
*   **Database:** SQLite (Easily migratable to PostgreSQL for production)

## ⚙️ Local Setup Instructions

### 1. Backend Setup

```bash
cd backend
# Create a virtual environment
python -m venv .venv
# Activate the virtual environment (Windows)
.venv\Scripts\activate
# Install dependencies
pip install -r requirements.txt
# Run the application
python app.py
```

### 2. Frontend Setup

```bash
cd frontend
# Install dependencies
npm install
# Start the development server
npm run dev
```

## 🔒 Security & Architecture Notes
*   All API endpoints are protected by JWT Bearer tokens with automatic silent refresh mechanisms.
*   The frontend uses Interceptors (`axiosInstance.ts`) to manage token lifecycles and role-based routing guards to prevent unauthorized access.
*   The backend strictly enforces authorization at the route level, ensuring that even if the frontend is bypassed, an Author cannot approve their own document.
