# Loreloom 🌌

Loreloom is an advanced autonomous storytelling sandbox. Create entire worlds, meet dynamic protagonists, weave interactive narratives, and mint your lore as unique on-chain digital relics.

## 🚀 Features

- **Genesis Engine:** Auto-generate characters, sheets, and reference images.
- **Narrative Engine:** Continuously generate story chapters with smart memory auto-synchronization (detects character changes like names and saves them to the database).
- **Awaiting Canvas & 3D Loader:** View real-time simulated visual rendering with an advanced 3D AntiGravity wireframe synthesizer.
- **On-chain Lore Minting:** Mint your completed story chapters as digital relics.
- **Resilient Worker:** Self-healing background worker loop that automatically handles network fluctuations or API connection drops without crashing.

## 🛠️ Tech Stack

- **Frontend:** Next.js (Turbopack), TailwindCSS, Framer Motion
- **Backend:** Node.js, Express, TSX, Supabase Database
- **Background Worker:** Robust Job Queue system with automatic failure tolerance
- **Blockchain:** Thirdweb SDK

## ⚙️ Quick Start

### 1. Configure Environments
Copy the example environment file:
```bash
cp .env.example .env
```
Fill in the variables in `.env` (Supabase keys, AI Provider API keys, etc.).

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Servers
Start frontend, backend, and background worker concurrently:
```bash
npm run dev
```

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
