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

function consObj (obj) {
  const console = document.getElementById('console')
  const codeElement = document.createElement('code')
  codeElement.textContent = JSON.stringify(obj, null, 2)
  console.appendChild(codeElement)
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
  if (canUsePaymentRequest) {
    prButton.mount($paymentRequest)
  } else {
    console.error('Can not load payment request', canUsePaymentRequest)
    $paymentRequest.innerHTML = 'No wallet with supported networks detected :c'
  }

  paymentRequest.on('paymentmethod', async (evt) => {
    console.dir(evt)
    const customerId = document.getElementById('customer-js').value
    const intent = await _fetch('/create-payment-intent', 'POST', { customerId }) // send customer
    console.dir(intent)

    const confirmIntent = await stripe.confirmCardPayment(
      intent.client_secret,
      { payment_method: evt.paymentMethod.id },
      { handleActions: false }
    )

    console.dir(confirmIntent)

    if (confirmIntent.error) {
      console.error(confirmIntent.error)
      evt.complete('fail')
    } else {
      evt.complete('success')
      // update default payment method
      const updatedPayment = await _fetch(`/customer/${customerId}/set-default-payment-method`, 'PATCH', {
        customerId,
        paymentMethodId: evt.paymentMethod.id
      })
      consObj(updatedPayment)
      logObj('Updated', updatedPayment)
    }
    consObj(confirmIntent)
  })
}


// -- UI
// -- Element
const btnCreateElement = document.getElementById('btn-element')
btnCreateElement.addEventListener('click', createElement)
async function createElement() {
  showLoading(this, true)
  const { publicKey } = await _fetch('/public-key', 'GET')
  setupStripeElements(publicKey)
  showLoading(this, false)
}
