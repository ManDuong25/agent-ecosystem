/**
 * AIClient – communicates with Gemini 3.1 Pro via ProxyPal (OpenAI-compatible proxy).
 */

import type { AIMessage, AIConfig, AIStreamChunk } from '../../shared/types.js';

const DEFAULT_CONFIG: AIConfig = {
    proxyUrl: 'http://localhost:8317',
    proxyApiKey: 'proxypal-local',
    managementApiKey: 'proxypal-mgmt-key',
    model: 'gemini-3.1-pro-high',
};

let config: AIConfig = { ...DEFAULT_CONFIG };

export function setAIConfig(newConfig: Partial<AIConfig>): void {
    config = { ...config, ...newConfig };
}

export function getAIConfig(): AIConfig {
    return { ...config };
}

/** Send a non-streaming chat completion. */
export async function chat(messages: AIMessage[]): Promise<string> {
    const response = await fetch(`${config.proxyUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.proxyApiKey}`,
        },
        body: JSON.stringify({
            model: config.model,
            messages,
            temperature: 0.3,
            max_tokens: 8192,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI API error (${response.status}): ${errorText}`);
    }

    const data = await response.json() as any;
    return data.choices?.[0]?.message?.content ?? '';
}

/** Send a streaming chat completion. Yields chunks. */
export async function* chatStream(messages: AIMessage[]): AsyncGenerator<AIStreamChunk> {
    const response = await fetch(`${config.proxyUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.proxyApiKey}`,
        },
        body: JSON.stringify({
            model: config.model,
            messages,
            temperature: 0.3,
            max_tokens: 8192,
            stream: true,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI API error (${response.status}): ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;
            const data = trimmed.slice(6);
            if (data === '[DONE]') {
                yield { content: '', done: true };
                return;
            }
            try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content ?? '';
                if (content) {
                    yield { content, done: false };
                }
            } catch { /* skip malformed chunks */ }
        }
    }
    yield { content: '', done: true };
}

// ── Pre-built prompt builders ────────────────────────────────

export function buildRepoAnalysisPrompt(repoContext: string): AIMessage[] {
    return [
        {
            role: 'system',
            content: `You are an expert software architect analyzing a repository. Provide a comprehensive analysis including:
1. Architecture overview
2. Key patterns and conventions used
3. Strengths and potential improvements
4. Recommended development workflow
5. Technology stack assessment
Format your response in Markdown.`,
        },
        {
            role: 'user',
            content: `Analyze this repository:\n\n${repoContext}`,
        },
    ];
}

export function buildRequirementsPrompt(featureName: string, featureDesc: string, repoContext: string): AIMessage[] {
    return [
        {
            role: 'system',
            content: `You are a requirements engineer. Generate detailed user stories and acceptance criteria using the EARS notation format.

Use these patterns:
- WHEN <trigger> THE <system> SHALL <response>
- IF <condition> THEN THE <system> SHALL <response>  
- WHILE <state> THE <system> SHALL <behavior>

Structure the output as:
# Requirements: <feature>
## User Stories
### US-1: <title>
**As a** <role> **I want** <capability> **so that** <benefit>
#### Acceptance Criteria
- WHEN ... THE system SHALL ...
- IF ... THEN THE system SHALL ...

Include edge cases and error scenarios. Format in Markdown.`,
        },
        {
            role: 'user',
            content: `Generate requirements for this feature:
Feature: ${featureName}
Description: ${featureDesc}

Repository context:
${repoContext}`,
        },
    ];
}

export function buildDesignPrompt(requirements: string, repoContext: string): AIMessage[] {
    return [
        {
            role: 'system',
            content: `You are a software architect. Create a technical design document based on the requirements.

Include:
1. **Architecture Overview** with a Mermaid diagram (use \`\`\`mermaid code blocks)
2. **Component Design** with interfaces and data flow
3. **API Design** (endpoints, request/response schemas)
4. **Data Model** with an ER diagram in Mermaid
5. **Sequence Diagrams** for key flows in Mermaid
6. **Error Handling** strategy
7. **Testing Strategy**

Use Mermaid diagrams extensively for visualization. Format in Markdown.`,
        },
        {
            role: 'user',
            content: `Create a design for these requirements:\n\n${requirements}\n\nRepository context:\n${repoContext}`,
        },
    ];
}

export function buildTasksPrompt(design: string, repoContext: string): AIMessage[] {
    return [
        {
            role: 'system',
            content: `You are a senior developer creating implementation tasks. Break down the design into atomic, test-driven development tasks.

For each task:
1. **Title**: Clear action-oriented title
2. **Description**: What needs to be done
3. **Test First**: Write the test description before implementation
4. **Files**: Which files will be created/modified
5. **Dependencies**: Which tasks must be completed first

Order tasks from foundation to feature. Each task should be completable in 1-2 hours.
Format as a numbered list with sub-sections. Output in Markdown.`,
        },
        {
            role: 'user',
            content: `Create implementation tasks for this design:\n\n${design}\n\nRepository context:\n${repoContext}`,
        },
    ];
}

export function buildBugAnalysisPrompt(bugDescription: string, repoContext: string): AIMessage[] {
    return [
        {
            role: 'system',
            content: `You are a debugging expert. Analyze the bug report and provide:
1. **Root Cause Analysis**: Most likely causes
2. **Investigation Steps**: How to confirm the cause  
3. **Fix Recommendation**: Concrete code changes
4. **Prevention**: How to prevent similar bugs
Format in Markdown.`,
        },
        {
            role: 'user',
            content: `Analyze this bug:\n\n${bugDescription}\n\nRepository context:\n${repoContext}`,
        },
    ];
}
