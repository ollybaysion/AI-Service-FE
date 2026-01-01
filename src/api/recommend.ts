export type BudgetRange = "LOW" | "MID" | "HIGH";
export type Transportation = "WALK" | "PUBLIC" | "CAR";

export interface RecommendRequest {
    userId: string;
    area: string;
    date: string;
    startTime: string;
    budgetRange: BudgetRange;
    transportation: Transportation;
    mood: string[];
}

export type RecommendResponse = {
    jobId: string
}

export async function postRecommend(req: RecommendRequest): Promise<RecommendResponse> {
    const res = await fetch('/api/v1/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
        credentials: 'include',
    })

    if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`POST /recommendations failed: ${res.status} ${res.statusText} ${text}`)
    }
    return res.json()
}

export function openRecommendStream(
    jobId: string,
    onLog: (line: string) => void,
    onDone?: () => void,
): EventSource {
    const url = `/api/v1/recommendations/${encodeURIComponent(jobId)}/stream`
    const es = new EventSource(url)

    es.onopen = () => onLog(`[SSE] open: ${url}`)
    es.onerror = () => {
        onLog('[SSE] error (connection might be closed by server or auth failed')
    }

    es.onmessage = (ev) => {
        onLog(`[message] ${ev.data}`)
    }

    ;['ack', 'done', 'error'].forEach((evt) => {
        es.addEventListener(evt, (e) => {
            const data = (e as MessageEvent).data
            onLog(`[${evt}] ${data}`)
            if (evt === 'done') {
                es.close()
                onLog('[SSE] closed (done)')
                onDone?.()
            }
        })
    })

    return es
}