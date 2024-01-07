addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const { searchParams, url } = new URL(request.url);

  // 获取请求中的资源参数
  const resource = searchParams.get('resource');
  // 获取请求中的类型参数，默认为ipv4
  const type = searchParams.get('type') || 'ipv4';

  // 获取主机名（域名）
  const hostname = request.headers.get('host')

  // 如果没有资源参数或者访问主页，则返回示例文字
  if (!resource || request.url.pathname === '/') {
    const exampleText = `Example Cloudflare AS13335:\nhttps://${hostname}/geoip?resource=13335\nhttps://${hostname}/geoip?resource=13335&type=ipv4\nhttps://${hostname}/geoip?resource=13335&type=ipv6\n`;
    return new Response(exampleText, { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }

  try {
    const apiUrl = `https://stat.ripe.net/data/ris-prefixes/data.json?list_prefixes=true&types=o&resource=${resource}`;

    const response = await fetch(apiUrl);

    if (response.ok) {
      const result = await response.json();

      let addresses;
      if (type === 'ipv4') {
        addresses = result.data.prefixes.v4.originating;
      } else if (type === 'ipv6') {
        addresses = result.data.prefixes.v6.originating;
      } else {
        return new Response('Invalid type parameter. Use "ipv4" or "ipv6".', { status: 400 });
      }

      if (addresses && addresses.length > 0) {
        // 对IPv4和IPv6地址进行排序
        addresses.sort((a, b) => {
          const ipA = type === 'ipv4' ? a : `[${a}]`; // 将IPv6地址用方括号括起来
          const ipB = type === 'ipv4' ? b : `[${b}]`;

          return ipA.localeCompare(ipB, undefined, { numeric: true, sensitivity: 'base' });
        });

        // 构建响应
        const responseBody = `${addresses.join('\n')}`;
        return new Response(responseBody, { status: 200 });
      } else {
        return new Response(`No ${type.toUpperCase()} addresses found for AS${resource}.`, { status: 404 });
      }
    } else {
      return new Response(`Error fetching data from RIPE API. Status: ${response.status}`, { status: 500 });
    }
  } catch (error) {
    return new Response(`An error occurred: ${error.message}`, { status: 500 });
  }
}

