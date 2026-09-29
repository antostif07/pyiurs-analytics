// app/ceo-report/layout.tsx
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import type { Metadata } from 'next'
import { getServerAuth } from '@/lib/supabase/server'
import { isExecutiveRole, isGroupWideRole } from '@/lib/auth/roles'
import { buildUserScope } from '@/lib/auth/scope'
import CeoReportShell from './ceo-report-shell'

export const metadata: Metadata = {
    title: {
        default: 'Rapport DG | Direction Générale',
        template: '%s | Rapport DG',
    },
    description:
        'Tableau de bord stratégique consolidé : stock, ventes, finance, opérations et RH.',
    robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

async function resolveCurrentPath(): Promise<string> {
    const h = await headers()
    return h.get('x-pathname') ?? '/ceo-report'
}

export default async function CeoReportLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const auth = await getServerAuth()

    if (!auth.user) {
        const next = await resolveCurrentPath()
        redirect(`/login?next=${encodeURIComponent(next)}`)
    }

    if (!auth.profile) {
        redirect('/unauthorized?reason=missing_profile')
    }

    const {
        role,
        full_name,
        avatar_url,
        assigned_shops,
        assigned_companies,
        shop_access_type,
    } = auth.profile

    if (!isExecutiveRole(role)) {
        redirect('/unauthorized?reason=insufficient_permissions')
    }

    const scope = buildUserScope(
        assigned_shops,
        assigned_companies,
        shop_access_type,
        isGroupWideRole(role),
    )

    return (
        <CeoReportShell
            role={role} scope={scope}
        >
            {children}
        </CeoReportShell>
    )
}