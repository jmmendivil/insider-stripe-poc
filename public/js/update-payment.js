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
async function setupStripeElements (publicKey, setupIntent) {
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

  const stripe = await Stripe(publicKey)
  const elements = stripe.elements({ clientSecret: setupIntent.client_secret })

  const $card = document.querySelector('#card-sjs')
  const $message = document.querySelector('.input-message-js')

  const cardElement = elements.create('card', styles)
  cardElement.mount($card)
  registerElementEvents(cardElement, $card, $message)

  // - Submit
  document.getElementById('add-card-js').classList.remove('d-none') // show update btn
  const btnSubmit = document.getElementById('btn-add-js')
  btnSubmit.addEventListener('click', submitCard)
  async function submitCard () {
    /*
    // - Using source with Token
    const { token } = await stripe.createToken(cardElement)
        console.dir(result.token.id)
      }
    })
    const customerId = document.getElementById('customer-js').value
    const result = await _fetch('/update-customer-source', 'POST', { customerId, token })
    */
    // TODO: test confirmSetup()
    showLoading(this, true)
    // confirmCardSetup will create a new payment method behind the scenes
    const confirmIntent = await stripe.confirmCardSetup(setupIntent.client_secret, {
      payment_method: {
        card: cardElement,
        billing_details: {
          name: 'Jon Doe',
          address: {
            postal_code: 90210
          }
        }
      }
    })

    if (confirmIntent.error) {
      console.error(confirmIntent.error)
      $card.classList.add('is-error')
      $message.innerText = confirmIntent.error.message
      showLoading(this, false)
      return 
    }

    logObj('Confirm setup', confirmIntent.setupIntent)
    /*
    const { paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement,
      billing_details: {
        name: 'Jon Doe'
      }
    })
    logObj('PaymentMethod', paymentMethod)
    */

    const customerId = document.getElementById('customer-js').value
    const addPayment = await _fetch(`/customer/${customerId}/add-payment-method`, 'POST', {
      customerId,
      paymentMethodId: confirmIntent.setupIntent.payment_method
    })
    logObj('Update', addPayment)
    showLoading(this, false)
  }
}

function displayPaymentMethods (cards, defaultMethod) {
  const tpl = ({ id, city, country, state, line1, line2, postal_code, brand, last4, exp_month, exp_year, name, isDefault }) => `
  <div class="columns payment-method ${isDefault ? 'bg-secondary' : ''}" id="${id}">
    <div class="column col-12">
      <span class="label">${id}</span>
      ${isDefault ? '<span class="label label-rounded label-primary float-right">Default</span>' : ''}
    </div>
    <div class="column col-4 form-group">
      <input class="form-input city" type="text" placeholder="City" value="${city}">
    </div>
    <div class="column col-4 form-group">
      <input class="form-input country" type="text" placeholder="Country" value="${country}">
    </div>
    <div class="column col-4 form-group">
      <input class="form-input state" type="text" placeholder="State" value="${state}">
    </div>
    <div class="column col-4 form-group">
      <input class="form-input line1" type="text" placeholder="Line 1" value="${line1}">
    </div>
    <div class="column col-4 form-group">
      <input class="form-input line2" type="text" placeholder="Line 2" value="${line2}">
    </div>
    <div class="column col-4 form-group">
      <input class="form-input postal-code" type="text" placeholder="Postal Code" value="${postal_code}">
    </div>
    <div class="column col-2 form-group">
      <input class="form-input brand" type="text" placeholder="Brand" value="${brand}">
    </div>
    <div class="column col-6 form-group">
      <input class="form-input card disabled" type="text" placeholder="Card" value="************${last4}">
    </div>
    <div class="column col-2 form-group">
      <input class="form-input exp-month" type="text" placeholder="Exp month" value="${exp_month}">
    </div>
    <div class="column col-2 form-group">
      <input class="form-input exp-year" type="text" placeholder="Exp year" value="${exp_year}">
    </div>
    <div class="column col-12 form-group">
      <input class="form-input name" type="text" placeholder="Name" value="${name}">
    </div>
    <div class="column col-6 form-group has-icon-right">
    ${!isDefault ? `<button class="btn btn-block btn-default-card btn-link">Set Default</button>` : ''}
    </div>
    <div class="column col-6 form-group has-icon-right">
      <button class="btn btn-block btn-update-card">Update</button>
    </div>
  </div>
  ${!isDefault ? '<div class="bar bar-sm"></div>' : ''}`
  const cardsTpl = cards.map(card => tpl({
    id: card.id ?? '',
    city: card.billing_details.address.city ?? '',
    country: card.billing_details.address.country ?? '',
    state: card.billing_details.address.state ?? '',
    line1: card.billing_details.address.line1 ?? '',
    line2: card.billing_details.address.line2 ?? '',
    postal_code: card.billing_details.address.postal_code ?? '',
    name: card.billing_details.name ?? '',
    brand: card.card.brand ?? '',
    last4: card.card.last4 ?? '',
    exp_month: card.card.exp_month ?? '',
    exp_year: card.card.exp_year ?? '',
    isDefault: defaultMethod === card.id
  }))
  // remove existing btns
  let btnsUpdateCard = document.querySelectorAll('.btn-update-card')
  if (btnsUpdateCard.length > 0) btnsUpdateCard.forEach(btn => {
    btn.removeEventListener('click', updateCard)
  })
  let btnsDefaultCard = document.querySelectorAll('.btn-default-card')
  if (btnsDefaultCard.length > 0) btnsDefaultCard.forEach(btn => {
    btn.removeEventListener('click', setDefaultCard)
  })

  document.getElementById('payment-methods').innerHTML = cardsTpl.join('')

  // add new btns
  btnsUpdateCard = document.querySelectorAll('.btn-update-card')
  btnsUpdateCard.forEach(btn => {
    btn.addEventListener('click', updateCard)
  })
  // add new btns
  btnsDefaultCard = document.querySelectorAll('.btn-default-card')
  btnsDefaultCard.forEach(btn => {
    btn.addEventListener('click', setDefaultCard)
  })
}

async function updateCard (evt) {
  showLoading(this, true)
  const container = evt.target.parentElement.parentElement
  const id = container.id
  const customerId = document.getElementById('customer-js').value
  const payment = await _fetch(`/customer/${customerId}/update-payment-method/${id}`, 'PATCH', {
    city: container.querySelector('.city').value,
    country: container.querySelector('.country').value,
    state: container.querySelector('.state').value,
    line1: container.querySelector('.line1').value,
    line2: container.querySelector('.line2').value,
    postal_code: container.querySelector('.postal-code').value,
    exp_month: container.querySelector('.exp-month').value,
    exp_year: container.querySelector('.exp-year').value,
    name: container.querySelector('.name').value
  })
  showLoading(this, false)
  logObj('Updated', payment)
  await getCustomer.call(this)
  await getCustomerPaymentMethods.call(this)
}

async function setDefaultCard (evt) {
  showLoading(this, true)
  const container = evt.target.parentElement.parentElement
  const paymentMethodId = container.id
  const customerId = document.getElementById('customer-js').value
  const response = await _fetch(`/customer/${customerId}/set-default-payment-method`, 'PATCH', { paymentMethodId })
  showLoading(this, false)
  logObj('Default', response)
  await getCustomer.call(this)
  await getCustomerPaymentMethods.call(this)
}

// -- UI
// -- Subscription
const btnGetSubs = document.getElementById('btn-subs')
btnGetSubs.addEventListener('click', getSubs)
async function getSubs() {
  showLoading(this, true)
  const subsInput = document.getElementById('subs-js')
  const subs = await _fetch(`/subscriptions/${subsInput.value}`)
  showLoading(this, false)
  logObj('Subscription', subs)
}

// -- Element
const btnCreateElement = document.getElementById('btn-element')
btnCreateElement.addEventListener('click', createElement)
async function createElement() {
  showLoading(this, true)
  const { publicKey } = await _fetch('/public-key', 'GET')

  const customerId = document.getElementById('customer-js').value
  const subscriptionId = document.getElementById('subs-js').value
  const setupIntent = await _fetch('/create-setup-intent', 'POST', { customerId, subscriptionId })
  logObj('Intent', setupIntent)

  setupStripeElements(publicKey, setupIntent)
  showLoading(this, false)
}

// -- Customer
const btnGetCustomer = document.getElementById('btn-customer')
btnGetCustomer.addEventListener('click', getCustomer)
async function getCustomer() {
  showLoading(this, true)
  const customerInput = document.getElementById('customer-js')
  const customer = await _fetch(`/customer/${customerInput.value}`)

  window.defaultMethod = customer.invoice_settings.default_payment_method

  showLoading(this, false)
  logObj('Customer', customer)
}
const btnGetPaymentMethods = document.getElementById('btn-paymentMethods')
btnGetPaymentMethods.addEventListener('click', getCustomerPaymentMethods)
async function getCustomerPaymentMethods() {
  showLoading(this, true)
  const customerInput = document.getElementById('customer-js')
  const cards = await _fetch(`/customer/${customerInput.value}/payment-methods`)
  displayPaymentMethods(cards.data, window.defaultMethod)
  showLoading(this, false)
  logObj('Cards', cards)
}

const btnDefaultPaymentMethod = document.getElementById('btn-default-payment-method')
btnDefaultPaymentMethod.addEventListener('click', getDefaultPaymentMethod)
async function getDefaultPaymentMethod () {
  showLoading(this, true)
  const customerInput = document.getElementById('customer-js')

  if (!window.defaultMethod) await getCustomer.call(this)

  const paymentMethod = window.defaultMethod

  const cards = await _fetch(`/customer/${customerInput.value}/payment-methods/${paymentMethod}`)
  displayPaymentMethods([cards], paymentMethod)
  showLoading(this, false)
  logObj('Cards', cards)
}
