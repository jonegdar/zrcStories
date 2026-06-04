import http.client

for method, path, headers in [
    ('GET', '/health', {}),
    ('OPTIONS', '/import', {
        'Origin': 'http://localhost:5175',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type',
    }),
]:
    conn = http.client.HTTPConnection('127.0.0.1', 8000, timeout=5)
    conn.request(method, path, headers=headers)
    resp = conn.getresponse()
    print('===', method, path, 'status', resp.status)
    print('headers:')
    for k, v in resp.getheaders():
        print(f'{k}: {v}')
    body = resp.read(1000).decode('utf-8', errors='ignore')
    if body:
        print('body:', body)
    print()
    conn.close()
