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
async function setupStripeElements (publicKey, setupIntent, input) {
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

  // const $card = document.querySelector('#card-sjs')
  // const $message = document.querySelector('.input-message-js')
  const $card = input.card
  const $message = input.message

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

function displayPaymentMethods (cards, defaultMethod, customer) {
  const tpl = ({ id, billing_country, billing_postal_code, card_postal_code, brand, last4, exp_month, exp_year, isDefault }) => `
  <div class="columns payment-method ${isDefault ? 'bg-secondary' : ''}" id="${id}">

    <div class="column col-12 label">Billing Address</div>
    <div class="column col-4 form-group">
      <input class="form-input billing-country" type="text" placeholder="Country" value="${billing_country}">
    </div>
    <div class="column col-4 form-group">
      <input class="form-input billing-postal-code" type="text" placeholder="Postal Code" value="${billing_postal_code}">
    </div>

    <div class="column col-12">
      <span class="label">${id}</span>
      ${isDefault ? '<span class="label label-rounded label-primary float-right">Default</span>' : ''}
    </div>
    <div class="column col-2">
      <span class="label label-secondary">${brand}</span>
    </div>
    <div class="column col-4 form-group">
      <input class="form-input card disabled" type="text" placeholder="Card" value="************${last4}">
    </div>
    <div class="column col-2 form-group">
      <input class="form-input exp-month" type="text" placeholder="Exp month" value="${exp_month}">
    </div>
    <div class="column col-2 form-group">
      <input class="form-input exp-year" type="text" placeholder="Exp year" value="${exp_year}">
    </div>
    <div class="column col-2 form-group">
      <input class="form-input card-postal-code" type="text" placeholder="Postal Code" value="${card_postal_code}">
    </div>
    <div class="column col-6 form-group has-icon-right">
    ${!isDefault ? `<button class="btn btn-block btn-default-card">Set Default</button>` : ''}
    </div>
    <div class="column col-6 form-group has-icon-right">
      <button class="btn btn-primary btn-block btn-update-card">Update</button>
    </div>
  </div>
  ${!isDefault ? '<div class="bar bar-sm"></div>' : ''}`

  const cardsTpl = cards.map(card => tpl({
    id: card.id ?? '',
    billing_country: customer.address.country ?? '',
    billing_postal_code: customer.address.postal_code ?? '',
    card_postal_code: card.billing_details.address.postal_code ?? '',
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
  let customer = await _fetch(`/customer/${customerId}`)

  // send both existing address + new address
  const newAddress = {
    line1: customer.address.line1,
    city: customer.address.city,
    state: customer.address.state,
    country: container.querySelector('.billing-country').value,
    postal_code: container.querySelector('.billing-postal-code').value
  }
  //send only available fields
  // const newAddress = {
  //   country: container.querySelector('.billing-country').value,
  //   postal_code: container.querySelector('.billing-postal-code').value
  // }

  customer = await _fetch(`/customer/${customerId}/update-billing-address`, 'PATCH', newAddress)

  const payment = await _fetch(`/customer/${customerId}/update-payment-method/${id}`, 'PATCH', {
    postal_code: container.querySelector('.card-postal-code').value,
    exp_month: container.querySelector('.exp-month').value,
    exp_year: container.querySelector('.exp-year').value,
  })

  showLoading(this, false)
  logObj('Updated', payment)
  logObj('CustomerUpdated', customer)
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
async function createElement(input) {
  showLoading(this, true)
  const { publicKey } = await _fetch('/public-key', 'GET')

  const customerId = document.getElementById('customer-js').value
  const subscriptionId = document.getElementById('subs-js').value
  const setupIntent = await _fetch('/create-setup-intent', 'POST', { customerId, subscriptionId })
  logObj('Intent', setupIntent)

  setupStripeElements(publicKey, setupIntent, input)
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
  document.getElementById('payment-methods').classList.remove('d-none')
  document.getElementById('checkout-payment-option').classList.add('d-none')
  document.getElementById('checkout-message').classList.add('d-none')
  showLoading(this, true)
  const customerInput = document.getElementById('customer-js')
  const cards = await _fetch(`/customer/${customerInput.value}/payment-methods`)
  const customer = await _fetch(`/customer/${customerInput.value}`)

  if (!window.defaultMethod) await getCustomer.call(this)
  const paymentMethod = window.defaultMethod

  displayPaymentMethods(cards.data, paymentMethod, customer)
  showLoading(this, false)
  logObj('Cards', cards)
}

const btnDefaultPaymentMethod = document.getElementById('btn-default-payment-method')
btnDefaultPaymentMethod.addEventListener('click', getDefaultPaymentMethod)
async function getDefaultPaymentMethod () {
  document.getElementById('payment-methods').classList.remove('d-none')
  document.getElementById('checkout-payment-option').classList.add('d-none')
  document.getElementById('checkout-message').classList.add('d-none')
  showLoading(this, true)
  const customerInput = document.getElementById('customer-js')

  if (!window.defaultMethod) await getCustomer.call(this)

  const paymentMethod = window.defaultMethod

  const cards = await _fetch(`/customer/${customerInput.value}/payment-methods/${paymentMethod}`)
  const customer = await _fetch(`/customer/${customerInput.value}`)
  displayPaymentMethods([cards], paymentMethod, customer)
  showLoading(this, false)
  logObj('Cards', cards)
}

// - Checkout
async function displayCheckoutOptions (card, subscription) {
  const tpl = `
  <div class="columns">
    <div class="column col-12 label">${subscription.id} is created</div>
    <div class="column col-12 form-group">
      <label class="form-radio">
        <input type="radio" name="checkout" checked value="valid">
        <i class="form-icon"></i><span class="label label-secondary">${card.card.brand} *${card.card.last4} -- Expires in ${card.card.exp_month}/${card.card.exp_year}</span>
      </label>
    </div>

    <div class="column col-6 form-group">
      <button class="btn btn-primary btn-block btn-confirm-card">Confirm</button>
    </div>
    <div class="column col-6 form-group">
      <button class="btn btn-secondary btn-block btn-add-card">Add a card</button>
    </div>
  </div>
`

  // remove existing btns
  let btnConfirm = document.querySelector('.btn-confirm-card')
  if (btnConfirm) {
    btnConfirm.removeEventListener('click', confirmCheckout)
  }
  let btnAddCard = document.querySelector('.btn-add-card')
  if (btnAddCard) {
    btnAddCard.removeEventListener('click', addNewCard)
  }

  document.getElementById('checkout-payment-option').innerHTML = tpl

  // add new btns
  btnConfirm = document.querySelector('.btn-confirm-card')
  btnConfirm.addEventListener('click', confirmCheckout)
  btnAddCard = document.querySelector('.btn-add-card')
  btnAddCard.addEventListener('click', addNewCard)
}


// show checkout with payment options
const btnGetCheckout = document.getElementById('btn-checkout')
btnGetCheckout.addEventListener('click', getCheckout)
async function getCheckout() {
  document.getElementById('checkout-payment-option').classList.add('d-none')
  document.getElementById('checkout-message').classList.add('d-none')
  document.getElementById('payment-methods').classList.add('d-none')

  showLoading(this, true)

  const customerInput = document.getElementById('customer-js')
  const customer = await _fetch(`/customer/${customerInput.value}`)
  const paymentMethodId = customer.invoice_settings.default_payment_method
  const card = await _fetch(`/customer/${customerInput.value}/payment-methods/${paymentMethodId}`)
  const subscription = await _fetch(`/customers/${customerInput.value}/create-subscriptions`, 'POST', {
    priceId: 'price_1KlaEPEv92Ty3pFACO4AZb9K'
  })
  window.subscription = subscription
  displayCheckoutOptions(card, subscription)

  showLoading(this, false)
  document.getElementById('checkout-payment-option').classList.remove('d-none')

  logObj('Customer', customer)
  logObj('Card', card)
  logObj('Subscription', subscription)
}

// charge subscription with existing payment method
async function confirmCheckout () {
  // document.getElementById('checkout-payment-option').classList.add('d-none')
  document.getElementById('checkout-message').classList.add('d-none')
  document.getElementById('checkout-payment-option').classList.remove('d-none')
  showLoading(this, true)

  const customerInput = document.getElementById('customer-js')
  let subscription = window.subscription
  const customer = await _fetch(`/customer/${customerInput.value}`)

  const { publicKey } = await _fetch('/public-key', 'GET')
  const stripe = await Stripe(publicKey)

  let paymentIntent = await stripe.confirmCardPayment(subscription.latest_invoice.payment_intent.client_secret, {
    payment_method: customer.invoice_settings.default_payment_method
  })

  let resultMessage = `Succeed. Subscription ${subscription.id} is active!`
  if (paymentIntent.error) {
    resultMessage = paymentIntent.error.message
  }

  subscription = await _fetch(`/subscriptions/${subscription.id}`)

  showLoading(this, false)
  logObj('Payment Intent', paymentIntent)
  logObj('Subscription', subscription)

  document.getElementById('checkout-message').innerHTML = `<div>${resultMessage}</div>`

  await getCustomer.call(this)
  document.getElementById('checkout-message').classList.remove('d-none')
  document.getElementById('checkout-payment-option').classList.add('d-none')
}

async function addNewCard () {
  console.log('PlaceHolder for add card checkout experience')
}