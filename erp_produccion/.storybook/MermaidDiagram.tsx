'use client'

import { useEffect, useId, useState } from 'react'

interface MermaidDiagramProps {
    chart: string
    title: string
}

export default function MermaidDiagram({ chart, title }: MermaidDiagramProps) {
    const reactId = useId()
    const diagramId = `storybook-mermaid-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`
    const [svg, setSvg] = useState('')
    const [error, setError] = useState(false)

    useEffect(() => {
        let mounted = true
        setSvg('')
        setError(false)

        const renderDiagram = async () => {
            try {
                const { default: mermaid } = await import('mermaid')
                mermaid.initialize({
                    startOnLoad: false,
                    securityLevel: 'strict',
                    theme: 'neutral',
                    flowchart: { htmlLabels: false },
                })
                const result = await mermaid.render(diagramId, chart)
                if (mounted) setSvg(result.svg)
            } catch (renderError) {
                console.error(`No se pudo renderizar el diagrama "${title}":`, renderError)
                if (mounted) setError(true)
            }
        }

        void renderDiagram()
        return () => { mounted = false }
    }, [chart, diagramId, title])

    return (
        <figure className="my-6 overflow-x-auto rounded-xl border border-slate-200 bg-white p-4">
            <figcaption className="mb-3 text-sm font-semibold text-slate-700">{title}</figcaption>
            {error ? (
                <p role="status" className="text-sm text-rose-700">No se pudo renderizar el diagrama. Revisa su sintaxis Mermaid.</p>
            ) : svg ? (
                <div
                    role="img"
                    aria-label={title}
                    className="flex w-full min-w-0 justify-center [&_svg]:block [&_svg]:h-auto [&_svg]:max-w-full"
                    dangerouslySetInnerHTML={{ __html: svg }}
                />
            ) : (
                <p role="status" className="text-sm text-slate-500">Renderizando diagrama…</p>
            )}
        </figure>
    )
}
