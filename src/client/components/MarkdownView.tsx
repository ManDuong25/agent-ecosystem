import { useEffect, useRef } from 'react';
import { marked } from 'marked';
import mermaid from 'mermaid';

mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    themeVariables: {
        primaryColor: '#6366f1',
        primaryTextColor: '#e5e7eb',
        primaryBorderColor: '#4f46e5',
        lineColor: '#6366f1',
        secondaryColor: '#1a1a26',
        tertiaryColor: '#222233',
    },
});

interface Props {
    content: string;
    className?: string;
}

export default function MarkdownView({ content, className = '' }: Props) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!ref.current || !content) return;

        // Parse markdown
        const html = marked.parse(content, { async: false }) as string;
        ref.current.innerHTML = html;

        // Render mermaid diagrams
        const mermaidBlocks = ref.current.querySelectorAll('pre code.language-mermaid');
        mermaidBlocks.forEach(async (block, idx) => {
            const code = block.textContent ?? '';
            const pre = block.parentElement;
            if (!pre || !code.trim()) return;

            try {
                const id = `mermaid-${Date.now()}-${idx}`;
                const { svg } = await mermaid.render(id, code.trim());
                const div = document.createElement('div');
                div.className = 'mermaid';
                div.innerHTML = svg;
                pre.replaceWith(div);
            } catch {
                // Leave as code block if mermaid fails
                pre.classList.add('border', 'border-warning/30', 'bg-warning/5');
            }
        });
    }, [content]);

    return <div ref={ref} className={`markdown-content ${className}`} />;
}
