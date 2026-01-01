export async function getMe() {
    const res = await fetch('/api/me', {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'application/json' },
    });

    console.log("[ME]", res.status, res.ok);

    if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`GET /api/me failed ${text}`)
    }

    return res.json().catch(() => ({}))
}