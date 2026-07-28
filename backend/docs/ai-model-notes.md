# AI Model Notes

## Current Defaults

| Provider | Model | Why |
|---|---|---|
| OpenRouter | `openrouter/free` | Fastest working OpenRouter option in the smoke test; automatically routes to currently available free models. |
| Gemini | `gemini-3.1-flash-lite` | Fastest successful text response in the smoke test; good fit for low-latency story turns. |
| NVIDIA | `meta/llama-3.1-70b-instruct` | Reliable successful NVIDIA response; slower than Gemini/OpenRouter but usable for quality fallback. |

## Image Model Recommendation

| Use | Model | Why |
|---|---|---|
| Primary Loreloom illustration engine | `gemini-3.1-flash-image` | Best balance for the product: supports reference-image consistency, high-resolution output, and broad aspect ratios. |
| Cheap/fast iteration | `gemini-3.1-flash-lite-image` | Fastest and cheapest Nano Banana 2 option, useful while tuning prompts. |
| Final hero/demo frames | `gemini-3-pro-image` | Premium quality option for complex visual tasks and stronger identity preservation, but likely too expensive/slow for every chapter. |
| OpenRouter fallback | `google/gemini-3.1-flash-image` | Same preferred model through OpenRouter once the OpenRouter account has credits. |
| NVIDIA fallback | `flux.1-schnell` | Official NVIDIA visual model option, but not reliable in the live smoke test. |

## Smoke Test Results

Prompt: 60-word Loreloom story beat with named protagonist, stable visual traits, and illustrator scene.

| Provider | Model | Result |
|---|---|---|
| OpenRouter | `openrouter/free` | Success, about 2.2s |
| OpenRouter | `meta-llama/llama-3.3-70b-instruct:free` | Rate-limited |
| OpenRouter | `qwen/qwen3-next-80b-a3b-instruct:free` | Rate-limited |
| OpenRouter | `openai/gpt-oss-120b:free` | Rate-limited |
| Gemini | `gemini-3.1-flash-lite` | Success, about 1.1s |
| Gemini | `gemini-2.5-flash-lite` | Success, about 2.1s |
| NVIDIA | `meta/llama-3.1-70b-instruct` | Success, about 4.5s |
| NVIDIA | `meta/llama-3.3-70b-instruct` | Timed out at 12s |
| NVIDIA | `deepseek-ai/deepseek-v4-flash` | Capacity-limited |
| NVIDIA | `google/gemma-4-31b-it` | Timed out at 12s |

## Image Smoke Test Results

Prompt: Loreloom genesis portrait of Elara with a silver-threaded cloak, amber eyes, crescent scar, painterly cinematic fantasy style.

| Provider | Model | Result |
|---|---|---|
| Gemini | `gemini-3.1-flash-lite-image` | API shape verified; generation blocked by project quota (`free_tier_requests` and input token quota reported as 0). |
| Gemini | `gemini-3.1-flash-image` | API shape verified; generation blocked by project quota (`free_tier_requests` and input token quota reported as 0). |
| OpenRouter | `google/gemini-3.1-flash-lite-image` | Generation blocked by account credits (`402 Insufficient credits`). |
| OpenRouter | `google/gemini-3.1-flash-image` | Generation blocked by account credits (`402 Insufficient credits`). |
| OpenRouter | `x-ai/grok-imagine-image-quality` | Generation blocked by account credits (`402 Insufficient credits`). |
| NVIDIA | `flux.1-dev` | Direct endpoint accepted request but returned server error after about 62s. |
| NVIDIA | `flux.1-schnell` | Direct endpoint exceeded useful demo latency and was stopped manually. |

## Source Checks

- OpenRouter lists free model options and recommends `openrouter/free` as the easiest free router.
- Gemini lists Flash-Lite models for low-latency, budget-friendly usage and shows free-tier pricing for eligible models.
- NVIDIA NIM exposes an OpenAI-compatible chat API and a model catalog.
- Gemini image docs recommend the Interactions API for Nano Banana image models. The current response format accepts `image/jpeg` for these calls.
