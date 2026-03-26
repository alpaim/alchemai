# Alchemai 

**TL;DR:** [Infinite Craft](https://neal.fun/infinite-craft/) that runs directly in your browser. Powered by a fine-tuned [Liquid LFM2.5 1.2B Instruct](https://huggingface.co/LiquidAI/LFM2.5-1.2B-Instruct) model. Inference via [transformers.js](https://github.com/huggingface/transformers.js).

- **Play:** [Hugging Face Space](https://huggingface.co/spaces/alpaim/alchemai)

- **Model:** [alpaim/alchemai-LFM2.5-1.2B-Instruct](https://huggingface.co/alpaim/alchemai-LFM2.5-1.2B-Instruct)

## About

This project explores local AI and its applications in game development. The entire game logic—predicting what element results from combining two elements is handled by a compact fine-tuned 1.2B parameter language model running entirely in your browser.

The fine-tuning pipeline (dataset, data processing, training, and model export) will be released soon.

**Why this matters:** This is a proof-of-concept that small, locally-running models can handle game mechanics - a niche but practical use case for game developers. And yeah, it's also just fun to play with.

## Features

- **100% Browser-Based** - No server required, runs entirely client-side
- **WebGPU Acceleration** - Thanks to transformers.js
- **Offline Capable** - Once loaded, works without internet

## Quick Start

```bash
bun install
bun run dev
```

The first load will download the quantized (q4) model.

## Tech Stack

- **Framework:** Vite + React 19 + TypeScript
- **LLM Inference:** @huggingface/transformers v4
- **State:** Zustand with localStorage persistence

## How It Works

1. Start with four base elements: **Fire**, **Water**, **Earth**, **Air**
2. Drag elements onto each other to combine them
3. The local LLM predicts what new element results from the combination
4. Discover new elements and keep combining
