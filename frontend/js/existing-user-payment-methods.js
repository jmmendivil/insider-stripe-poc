import { _fetch, logObj, showLoading, showById } from './utils'

export async function existingUserAllPaymentMethods() {
  showLoading(this, true)
  const customerInput = document.getElementById('customer-input')
  const customer = await _fetch(`/customer/${customerInput.value}`)

  const cards = await _fetch(`/customer/${customerInput.value}/payment-methods`)

  displayPaymentMethods(cards.data, customer)
  showLoading(this, false)
  logObj('Cards', cards)
}
export async function existingUserDefaultPaymentMethod () {
  showLoading(this, true)
  const customerInput = document.getElementById('customer-input')
  const customer = await _fetch(`/customer/${customerInput.value}`)

  const defaultPaymentMethod = customer.invoice_settings.default_payment_method
  const cards = await _fetch(`/customer/${customerInput.value}/payment-methods/${defaultPaymentMethod}`)

  displayPaymentMethods([cards], customer)
  showLoading(this, false)
  logObj('Cards', cards)
}

const imgApple = require('../imgs/apple-pay.svg')
const imgGoogle = require('../imgs/google-pay.svg')

function displayPaymentMethods (cards, customer) {
  const tpl = ({ id, billing_country, postal_code, brand, last4, exp_month, exp_year, isDefault, wallet }) => `
  <div class="columns payment-method ${isDefault ? 'bg-secondary' : ''}" id="${id}">
    <div class="column col-12">
      <pre class="label text-small">${id}</pre>
      ${isDefault ? '<span class="label label-rounded label-primary float-right">Default</span>' : ''}
      ${wallet.isApple ? `<img class="float-right mr-2" src="${imgApple}" width="25px" />` : ''}
      ${wallet.isGoogle ? `<img class="float-right mr-2" src="${imgGoogle}" width="25px" />` : ''}
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

    <div class="column col-6 form-group">
      <input class="form-input billing-country" type="text" placeholder="Country" value="${billing_country}">
    </div>
    <div class="column col-6 form-group">
      <input class="form-input postal-code" type="text" placeholder="Postal Code" value="${postal_code}">
    </div>

    <div class="column col-6 form-group has-icon-right">
    ${!isDefault ? `<button class="btn btn-link btn-block btn-default-card">Set Default</button>` : ''}
    </div>
    <div class="column col-6 form-group has-icon-right">
      <button class="btn btn-primary btn-block btn-update-card">Update</button>
    </div>
  </div>
  ${!isDefault ? '<div class="bar bar-sm"></div>' : ''}`

  const cardsTpl = cards.map(card => tpl({
    id: card.id ?? '',
    billing_country: card.billing_details.address?.country ?? '',
    postal_code: card.billing_details.address.postal_code ?? '',
    brand: card.card.brand ?? '',
    last4: card.card.last4 ?? '',
    exp_month: card.card.exp_month ?? '',
    exp_year: card.card.exp_year ?? '',
    isDefault: customer.invoice_settings.default_payment_method === card.id,
    wallet: {
      isApple: card.card.wallet?.type === 'apple_pay',
      isGoogle: card.card.wallet?.type === 'google_pay'
    }
  }))

  showById('payment-methods')

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
  const customerId = document.getElementById('customer-input').value
  let customer = await _fetch(`/customer/${customerId}`)

  const newAddress = {
    country: container.querySelector('.billing-country').value,
    postal_code: container.querySelector('.postal-code').value
  }

  customer = await _fetch(`/customer/${customerId}/update-billing-address`, 'PATCH', newAddress)

  const payment = await _fetch(`/customer/${customerId}/update-payment-method/${id}`, 'PATCH', {
    postal_code: container.querySelector('.postal-code').value,
    exp_month: container.querySelector('.exp-month').value,
    exp_year: container.querySelector('.exp-year').value,
  })

  showLoading(this, false)
  logObj('Updated', payment)
  logObj('CustomerUpdated', customer)
  await existingUserAllPaymentMethods.call(this)
}

async function setDefaultCard (evt) {
  showLoading(this, true)
  const container = evt.target.parentElement.parentElement
  const paymentMethodId = container.id
  const customerId = document.getElementById('customer-input').value
  const response = await _fetch(`/customer/${customerId}/set-default-payment-method`, 'PATCH', { paymentMethodId })
  showLoading(this, false)
  logObj('Default', response)
  await existingUserAllPaymentMethods.call(this)
}
