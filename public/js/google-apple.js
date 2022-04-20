// helpers
async function _fetch(url, method = 'GET', data = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } }
  if ((method === 'POST' || method === 'PATCH') && data) opts.body = JSON.stringify(data)
  const response = await window.fetch(url, opts)
  return response.json()
}

function showLoading(target, show) {
  if (show) {
    target.classList.add('loading')
  } else {
    target.classList.remove('loading')
  }
}

function logObj (title, obj) {
  console.group(title)
  console.dir(obj)
  console.groupEnd()
}
// <<

// -- Stripe
function registerElementEvents (stripeElement, container, message) {
  stripeElement.on('change', function (event) {
    if (event.error) {
      container.classList.add('is-error')
      message.innerText = event.error.message
    } else {
      container.classList.contains('is-error') &&
        container.classList.remove('is-error')
      message.innerText = null
    }
  })
}
async function setupStripeElements (publicKey) {
  const styles = {
    classes: { base: 'form-input' },
    style: {
      base: {
        color: '#4d4d4d',
        fontWeight: '500',
        fontSize: '16px',
        fontSmoothing: 'antialiased',
        ':-webkit-autofill': {
          color: '#fce883'
        }
      },
      invalid: {
        iconColor: '#EA0201',
        color: '#EA0201'
      }
    }
  }

  const $paymentRequest = document.querySelector('#payment-request-js')
  const $message = document.querySelector('.input-message-js')

  const stripe = await Stripe(publicKey)
  const elements = stripe.elements()

  const paymentRequest = stripe.paymentRequest({
    country: 'US',
    currency: 'usd',
    total: {
      label: 'Demo total',
      amount: 1099,
    },
    requestPayerName: true,
    requestPayerEmail: true,
  })

  const prButton = elements.create('paymentRequestButton', { paymentRequest })
  const canUsePaymentRequest = await paymentRequest.canMakePayment()
  debugger
  if (canUsePaymentRequest) {
    prButton.mount($paymentRequest)
  } else {
    console.error('Can not load payment request', canUsePaymentRequest)
    $paymentRequest.innerHTML = 'No wallet with supported networks detected :c'
  }

  paymentRequest.on('paymentmethod', async (evt) => {
    console.log(evt)
  })
}


// -- UI
// -- Element
const btnCreateElement = document.getElementById('btn-element')
btnCreateElement.addEventListener('click', createElement)
async function createElement() {
  showLoading(this, true)
  const { publicKey } = await _fetch('/public-key', 'GET')
  // const customerId = document.getElementById('customer-js').value
  setupStripeElements(publicKey)
  showLoading(this, false)
}
