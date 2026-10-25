'use client'

import { Icon } from '@iconify/react'

const HERRAMIENTAS = [
    { icon: 'mdi:chair-rolling', className: 'sewing-loader-chair' },
    { icon: 'mdi:sewing-machine', className: 'sewing-loader-machine' },
    { icon: 'mdi:spool', className: 'sewing-loader-thread' },
    { icon: 'mdi:needle', className: 'sewing-loader-needle' },
    { icon: 'mdi:curtains', className: 'sewing-loader-fabric' },
]

export default function SewingLoader({
    message = 'Preparando tu espacio de trabajo',
    compact = false,
}: {
    message?: string
    compact?: boolean
}) {
    return (
        <div
            className={`sewing-loader ${compact ? 'sewing-loader-compact' : ''}`}
            role="status"
            aria-live="polite"
        >
            <div className="sewing-loader-art" aria-hidden="true">
                {HERRAMIENTAS.map(({ icon, className }) => (
                    <span key={icon} className={`sewing-loader-icon ${className}`}>
                        <Icon icon={icon} />
                    </span>
                ))}
                <svg className="sewing-loader-stitch" viewBox="0 0 160 24" fill="none">
                    <path d="M4 12c18-15 26 15 44 0s26 15 44 0 26 15 44 0 16 1 20 0" />
                </svg>
            </div>
            <p className="sewing-loader-message">{message}</p>
            <span className="sewing-loader-caption">Un momento, por favor</span>
        </div>
    )
}
