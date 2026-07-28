"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Provider = "openrouter" | "gemini" | "nvidia";

type ProviderStatus = {
  provider: Provider;
  configured: boolean;
  model: string;
};

type GenerateResponse = {
  provider: Provider;
  model: string;
  text: string;
};

const defaultSystemPrompt =
  "You are Loreloom, a persistent AI Art Director. Return concise, vivid story direction that preserves character continuity.";

export default function Home() {
  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000", []);
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [provider, setProvider] = useState<Provider>("openrouter");
  const [systemPrompt, setSystemPrompt] = useState(defaultSystemPrompt);
  const [prompt, setPrompt] = useState(
    "Create the opening beat for a moonlit fantasy world with one memorable protagonist."
  );
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetch(`${apiUrl}/ai/providers`)
      .then((response) => response.json())
      .then((data: { providers: ProviderStatus[] }) => setProviders(data.providers))
      .catch(() => setError("Could not reach the Loreloom API. Start it with npm run dev:api."));
  }, [apiUrl]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`${apiUrl}/ai/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          provider,
          systemPrompt,
          prompt
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Generation failed.");
      }

      setResult(data as GenerateResponse);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Generation failed.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="shell">
      <section className="intro">
        <div>
          <p className="eyebrow">Loreloom setup</p>
          <h1>AI provider test bench</h1>
        </div>
        <p>
          Try OpenRouter, Gemini, and NVIDIA behind one backend route before the story engine,
          image engine, and minting flow land.
        </p>
      </section>

      <section className="workspace">
        <form className="panel composer" onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="provider">Provider</label>
            <select
              id="provider"
              value={provider}
              onChange={(event) => setProvider(event.target.value as Provider)}
            >
              <option value="openrouter">OpenRouter</option>
              <option value="gemini">Gemini</option>
              <option value="nvidia">NVIDIA</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="systemPrompt">System prompt</label>
            <textarea
              id="systemPrompt"
              value={systemPrompt}
              onChange={(event) => setSystemPrompt(event.target.value)}
              rows={4}
            />
          </div>

          <div className="field">
            <label htmlFor="prompt">Prompt</label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={7}
            />
          </div>

          <button type="submit" disabled={isLoading}>
            {isLoading ? "Generating..." : "Generate"}
          </button>
        </form>

        <aside className="panel status">
          <h2>Provider status</h2>
          <div className="providerList">
            {providers.map((item) => (
              <div className="providerRow" key={item.provider}>
                <div>
                  <strong>{item.provider}</strong>
                  <span>{item.model}</span>
                </div>
                <span className={item.configured ? "badge ready" : "badge missing"}>
                  {item.configured ? "Ready" : "Needs key"}
                </span>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="panel output">
        <div className="outputHeader">
          <h2>Response</h2>
          {result ? (
            <span>
              {result.provider} / {result.model}
            </span>
          ) : null}
        </div>
        {error ? <p className="error">{error}</p> : null}
        {result ? <pre>{result.text}</pre> : <p className="empty">No generation yet.</p>}
      </section>
    </main>
  );
}
