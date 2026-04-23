'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { DEFAULT_TENANT_ID, Tenant } from '@/lib/tenantConfig';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/context/AuthContext';
import { setActiveTenantId } from '@/services/db';

interface TenantContextType {
    tenantId: string;
    tenant: Tenant | null;
    loading: boolean;
    setTenantId: (id: string) => void;
}

const TenantContext = createContext<TenantContextType>({
    tenantId: DEFAULT_TENANT_ID,
    tenant: null,
    loading: true,
    setTenantId: () => {},
});

export function TenantProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [tenantId, setTenantIdState] = useState<string>(DEFAULT_TENANT_ID);
    const [tenant, setTenant] = useState<Tenant | null>(null);
    const [loading, setLoading] = useState(true);

    // Wrapper that also syncs to db.ts
    const setTenantId = (id: string) => {
        setTenantIdState(id);
        setActiveTenantId(id); // Sync to db.ts _activeTenantId
    };

    // ★ 핵심: 로그인한 사용자의 tenantId와 동기화
    useEffect(() => {
        if (!user) {
            setTenantId(DEFAULT_TENANT_ID);
            setLoading(false);
            return;
        }

        const userTenantId = (user as any)?.tenantId;
        if (userTenantId) {
            setTenantId(userTenantId);
        } else {
            // fallback: URL에서 테넌트 감지 (서브도메인 방식)
            if (typeof window !== 'undefined') {
                const hostname = window.location.hostname;
                const parts = hostname.split('.');
                if (parts.length >= 3 && parts[0] !== 'www') {
                    setTenantId(parts[0]);
                } else {
                    setTenantId(DEFAULT_TENANT_ID);
                }
            }
        }
    }, [user]);

    // 테넌트 정보 로드
    useEffect(() => {
        const loadTenant = async () => {
            try {
                const tenantDoc = await getDoc(doc(db, 'tenants', tenantId));
                if (tenantDoc.exists()) {
                    setTenant({ id: tenantDoc.id, ...tenantDoc.data() } as Tenant);
                } else {
                    setTenant(null);
                }
            } catch (e) {
                console.error('Tenant load error:', e);
                setTenant(null);
            } finally {
                setLoading(false);
            }
        };

        loadTenant();
    }, [tenantId]);

    return (
        <TenantContext.Provider value={{ tenantId, tenant, loading, setTenantId }}>
            {children}
        </TenantContext.Provider>
    );
}

export const useTenant = () => useContext(TenantContext);
