import fetch from 'node-fetch';

(async () => {
  const url = process.argv[2] || 'http://localhost:5000/api/health';
  try {
    const res = await fetch(url, { timeout: 2000 });
    if (!res.ok) {
      console.error(`[health-check] Non-200 status: ${res.status}`);
      process.exit(1);
    }
    const data = await res.json().catch(() => ({}));
    if (data.status === 'ok' || data.status === 'success') {
      console.log('[health-check] healthy');
      process.exit(0);
    }
    console.error('[health-check] unexpected payload');
    process.exit(1);
  } catch (e:any) {
    console.error('[health-check] error', e.message);
    process.exit(1);
  }
})();
