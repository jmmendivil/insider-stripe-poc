export async function _fetch(url, method = 'GET', data = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } }
  if ((method === 'POST' || method === 'PATCH') && data) opts.body = JSON.stringify(data)

  // appends parcel proxy url from .proxyrc
  const _url = url.startsWith('https') ? url : `/api${url}`

  const response = await window.fetch(_url, opts)
  return response.json()
}

export function showLoading(target, show) {
  if (show) {
    target.classList.add('loading')
  } else {
    target.classList.remove('loading')
  }
}

export function logObj (label, obj) {
  if (typeof label === 'object') {
    obj = label
    label = ''
  }
  let cons = showNormalConsole
  if (window.webConsole) cons = showWebConsole
  cons(label, obj)
}

function showNormalConsole(label, obj) {
  if (label !== '') console.group(label)
  console.dir(obj)
  if (label !== '') console.groupEnd()
}

function showWebConsole (label = '', obj) {
  const status = document.getElementById('console')
  const code = document.createElement('code')
  code.dataset.label = label
  code.innerText = JSON.stringify(obj, null, 2)
  status.appendChild(code)
}

export function showById(el, content) {
  const _el = document.getElementById(el)
  _el.classList.remove('d-none')
  if (content) _el.innerHTML = content
  return _el
}
export function hideById(el) {
  document.getElementById(el).classList.add('d-none')
}
