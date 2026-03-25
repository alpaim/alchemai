import {
    TextStreamer,
    pipeline,
    type TextGenerationPipeline,
} from "@huggingface/transformers";

import type { TransformersInferenceConfig } from "@/lib/llm/types";

const MODEL_ID = "LiquidAI/LFM2.5-1.2B-Thinking-ONNX";
const DTYPE = "q4";

let generatorPromise: Promise<TextGenerationPipeline> | null = null;
let currentDevice: "webgpu" | "wasm" | null = null;

export type ProgressCallback = (progress: {
    state: "loading" | "ready" | "error";
    progress: number;
    message: string;
}) => void;

async function createPipeline(
    device: "webgpu" | "wasm",
    onProgress?: ProgressCallback,
): Promise<TextGenerationPipeline> {
    return await pipeline("text-generation", MODEL_ID, {
        dtype: DTYPE,
        device,
        progress_callback: (progress: {
            status: string;
            progress?: number;
            file?: string;
        }) => {
            // Handle different stages of model loading
            if (progress.status === "init") {
                onProgress?.({
                    state: "loading",
                    progress: 0,
                    message: "Loading model from cache...",
                });

                return;
            }

            if (progress.status === "progress"
                && progress.file?.endsWith(".onnx_data")
                && progress.progress != null) {
                onProgress?.({
                    state: "loading",
                    progress: Math.round(progress.progress),
                    message: `Downloading model... ${Math.round(progress.progress)}%`,
                });
            }
        },
    });
}

export async function initializeTransformers(
    _modelId: string,
    onProgress?: ProgressCallback,
): Promise<TextGenerationPipeline> {
    if (generatorPromise) {
        return generatorPromise;
    }

    generatorPromise = (async () => {
        onProgress?.({
            state: "loading",
            progress: 0,
            message: "Initializing model...",
        });

        // Try WebGPU first
        try {
            const generator = await createPipeline("webgpu", onProgress);
            currentDevice = "webgpu";
            onProgress?.({
                state: "ready",
                progress: 100,
                message: "Model ready",
            });

            return generator;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : "";

            // If WebGPU is not supported, fall back to WASM
            if (errorMessage.includes("webgpu") || errorMessage.includes("Unsupported device")) {
                onProgress?.({
                    state: "loading",
                    progress: 0,
                    message: "WebGPU not available, using WASM...",
                });

                const generator = await createPipeline("wasm", onProgress);
                currentDevice = "wasm";
                onProgress?.({
                    state: "ready",
                    progress: 100,
                    message: "Model ready (WASM)",
                });

                return generator;
            }

            throw error;
        }
    })();

    try {
        return await generatorPromise;
    }
    catch (error) {
        generatorPromise = null;
        currentDevice = null;

        const errorMessage = error instanceof Error ? error.message : "Failed to load model";
        onProgress?.({
            state: "error",
            progress: 0,
            message: errorMessage,
        });
        throw error;
    }
}

export function isModelLoaded(): boolean {
    return generatorPromise !== null;
}

export function isTransformersReady(): boolean {
    return generatorPromise !== null;
}

export function getCurrentDevice(): "webgpu" | "wasm" | null {
    return currentDevice;
}

export function isUsingWASM(): boolean {
    return currentDevice === "wasm";
}

export async function getModel(): Promise<TextGenerationPipeline | null> {
    if (!generatorPromise) {
        return null;
    }

    try {
        return await generatorPromise;
    }
    catch {
        return null;
    }
}

export async function* streamCombination(
    _modelId: string,
    inferenceConfig: TransformersInferenceConfig,
    userPrompt: string,
    ensureModel: () => Promise<void>,
): AsyncGenerator<string> {
    await ensureModel();

    const generator = await getModel();

    if (!generator) {
        throw new Error("Model not initialized");
    }

    let fullOutput = "";

    const streamer = new TextStreamer(generator.tokenizer, {
        skip_prompt: true,
        skip_special_tokens: false,
        callback_function: (text: string) => {
            fullOutput += text;
        },
    });

    const messages = [
        { role: "user", content: userPrompt },
    ];

    await generator(messages, {
        max_new_tokens: inferenceConfig.maxTokens,
        temperature: inferenceConfig.temperature,
        streamer,
        do_sample: inferenceConfig.doSample,
    });

    for (const char of fullOutput) {
        yield char;
    }
}

export async function unloadModel(): Promise<void> {
    if (generatorPromise) {
        generatorPromise = null;
    }

    currentDevice = null;
}