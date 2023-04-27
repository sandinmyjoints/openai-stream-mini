import { throttle } from "./throttle.js";
/**
 * Stream a completion from OpenAI.
 */
export const streamCompletion = async ({ apiKey, args, host = "https://api.openai.com", path = "/v1/completions", onText, throttleMs, }) => {
    // throttle callback?
    const handler = throttleMs ? throttle(throttleMs, onText, {}) : onText;
    // stream the completion
    return await _streamCompletion(apiKey, host, path, args, handler);
};
const _streamCompletion = async (token, host, path, args, onText) => {
    const url = new URL(path, host);
    const response = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            ...args,
            stream: true,
        }),
    });
    if (!response.ok || !response.body) {
        console.error("OpenAI stream failed", response);
        console.error(await response.text());
        throw new Error("OpenAI stream failed");
    }
    const decoder = new TextDecoder("utf8");
    const reader = response.body.getReader();
    let fullText = "";
    let bufferedData = null;
    async function readMore() {
        const { value, done } = await reader.read();
        if (done) {
            await onText(fullText);
        }
        else {
            const str = decoder.decode(value);
            // split on newlines
            const lines = str.split(/(\r\n|\r|\n)/g);
            const beforeText = fullText;
            for (const line of lines) {
                if (!line.trim()) {
                    continue;
                }
                let prefix = "";
                if (line.startsWith("data:")) {
                    prefix = "data:";
                }
                else if (line.startsWith("delta:")) {
                    prefix = "delta:";
                }
                else if (!bufferedData) {
                    console.error("Unexpected response from OpenAI stream, line=", line);
                    throw new Error("Unexpected response from OpenAI stream, line=" + line);
                }
                const data = line.slice(prefix.length);
                if (data.trim().startsWith("[DONE]")) {
                    return;
                }
                let json;
                try {
                    const fullData = bufferedData ? bufferedData + data : data;
                    json = JSON.parse(fullData);
                    bufferedData = null;
                }
                catch (error) {
                    console.error(
                    // @ts-ignore
                    `Unexpected response from OpenAI stream, len=${data.length}, msg=${error.message}, data=`, data);
                    bufferedData = data;
                    // throw error;
                }
                if (json) {
                    if (json.content) {
                        fullText += json.content;
                    }
                    else if (json.choices) {
                        fullText += json.choices[0].text;
                    }
                    else {
                        console.warn("Unexpected response from OpenAI stream, json=", json);
                    }
                    if (beforeText !== fullText) {
                        await onText(fullText);
                    }
                }
            }
            await readMore();
        }
    }
    await readMore();
    return fullText;
};
