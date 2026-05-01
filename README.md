# Home Grocery Ops (HGO)

Aplicação mobile-first para gestão de inventário doméstico com OCR e IA.

## Stack

- **Frontend**: Angular 19+, Signals, PrimeNG v19, Tailwind CSS, Lucide Icons
- **Backend (BFF)**: NestJS (TypeScript)
- **IA**: Groq Cloud API (Llama 3.2 Vision)
- **Database**: Firebase Firestore

## Estrutura

```
organograma/
├── backend/          # NestJS BFF
│   └── src/
│       └── modules/
│           ├── ocr/               # OCR via Groq
│           ├── inventory/         # Gestão de produtos/compras
│           └── image-discovery/   # Busca de imagens
└── frontend/         # Angular 19 SPA
    └── src/
        └── app/
            ├── core/services/     # FirebaseService, ApiService
            ├── layout/            # LayoutComponent + Bottom Nav
            └── features/
                ├── dashboard/     # Gráficos e resumo mensal
                ├── scanner/       # OCR + Stepper de revisão
                └── inventory/     # Lista e abatimento de estoque
```

## Configuração

### Backend

```bash
cd backend
cp .env.example .env
# Edite .env com suas chaves
npm install
npm run start:dev
```

Variáveis de ambiente:
- `GROQ_API_KEY` – Chave da API Groq Cloud
- `UNSPLASH_ACCESS_KEY` – Chave da API Unsplash (opcional)
- `GOOGLE_APPLICATION_CREDENTIALS` – Caminho para serviceAccountKey.json do Firebase

### Frontend

```bash
cd frontend
npm install
npm start
```

Configure `src/environments/environment.ts` com as credenciais do Firebase.

## Funcionalidades

- **RF01 – Scanner**: Upload de nota fiscal → Processamento Groq → Revisão manual → Salvar
- **RF02 – Estoque**: Atualização automática via `increment` Firestore ao salvar compra
- **RF03 – Abatimento**: Botão `-` na lista de inventário
- **RF04 – Imagens**: BFF busca foto do produto no Unsplash com fallback por categoria
- **RF05 – Dashboard**: Gráficos de gastos mensais por categoria