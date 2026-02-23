# Math Study Buddy (FYP Prototype)

A Next.js chatbot for mathematics study support with:

- **RAG-like retrieval** over uploaded Notes / PSQ / Reference text files
- **Structured reasoning output** (Final Answer + Reasoning Outline + Practice Next)
- **SFT-style behavior** via a strong domain system prompt
- **Upload flow** for study materials users can query against

## Run locally

```bash
npm install
npm run dev
```

Set environment variable:

```bash
OPENAI_API_KEY=your_key_here
```

Then open `http://localhost:3000`.
