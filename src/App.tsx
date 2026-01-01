import { useEffect, useMemo, useRef, useState } from 'react'
import {openRecommendStream, postRecommend} from "./api/recommend.ts";
import type { RecommendRequest } from "./api/recommend.ts";
import { getMe } from './api/auth'

function now() {
    const d = new Date()
    return d.toISOString()
}

export default function App() {
    const [query, setQuery] = useState('강남 데이트 코스 추천해줘')
    const [log, setLog] = useState<string[]>([])
    const [jobId, setJobId] = useState<string>('')
    const [loading, setLoading] = useState(false)

    const esRef = useRef<EventSource | null>(null)

    const append = (line: string) => {
        setLog((prev) => [...prev, `${now()} ${line}`])
    }

    const clearLog = () => setLog([])

    const loginUrl = useMemo(() => {
        return '/oauth2/authorization/google'
    }, [])

    useEffect(() => {
        const isCallback = window.location.pathname.startsWith('/auth/callback')
        if (!isCallback) return

        append('[AUTH] callback arrived')

        ;(async () => {
            try {
                const me = await getMe()
                append(`[AUTH] /api/me OK: ${JSON.stringify(me)}`)

                window.history.replaceState({}, '', '/')
                append('[AUTH] redirect to /')
            } catch (e) {
                append(`[AUTH] /api/me FAILED: ${String(e)}`)
            }
        })()
    }, [])

    const onLogin = () => {
        append(`[AUTH] redirect to ${loginUrl}`)
        window.location.href = loginUrl
    }

    const onRecommend = async () => {
        if (esRef.current) {
            esRef.current.close()
            esRef.current = null
        }

        setLoading(true)
        try {
            append('[REQ] POST /api/v1/recommendations')
            const me = await getMe()

            const req: RecommendRequest = {
                userId: me.userId,
                area: "강남",
                date: "2026-01-10",
                startTime: "18:30",
                budgetRange: "MID",
                transportation: "PUBLIC",
                mood: ["로맨틱"]
            }
            const res = await postRecommend(req)
            append(`[RES] jobId=${res.jobId}`)
            setJobId(res.jobId)

            append('[SSE] connecting...')
            esRef.current = openRecommendStream(res.jobId, append, () => {
                append('[SSE] done callback')
            })
        } catch (e) {
            append(`[ERR] ${String(e)}`)
        } finally {
            setLoading(false)
        }
    }

    const onCloseSse = () => {
        if (esRef.current) {
            esRef.current.close()
            esRef.current = null
            append('[SSE] manually closed')
        }
    }

    return (
        <div style={{ padding: 16}}>
            <h3> E2E Test </h3>

            <div style={{ display: 'flex', gap: 8, marginBottom: 8}}>
                <button onClick={onLogin}>Login (Google OAuth)</button>
                <button onClick={onRecommend} disabled={loading}>
                    {loading ? 'Requesting...' : 'Recommend'}
                </button>
                <button onClick={onCloseSse}>Close SSE</button>
                <button onClick={clearLog}>Clear Log</button>
            </div>

            <div style={{ marginBottom: 8}}>
                <div>Query</div>
                <textarea
                    rows={3}
                    style={{ width: '100%' }}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
            </div>

            <div style={{ marginBottom: 8}}>jobId: {jobId || '-'}</div>

            <pre style={{ whiteSpace: 'pre-wrap', border: '1px solid #ccc', padding: 12, height: 360, overflow: 'auto'}}>
                {log.join('\n')}
            </pre>
        </div>
    )
}