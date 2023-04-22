import type { CreateCompletionRequest } from "openai";
export type OnTextCallback = (text: string) => Promise<void> | undefined;
interface StreamCompletionArgs {
    apiKey: string;
    args: CreateCompletionRequest;
    host: string;
    path: string;
    onText: OnTextCallback;
    throttleMs?: number;
}
/**
 * Stream a completion from OpenAI.
 */
export declare const streamCompletion: ({ apiKey, args, host, path, onText, throttleMs, }: StreamCompletionArgs) => Promise<string>;
export {};
