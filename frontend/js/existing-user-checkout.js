import { _fetch, showLoading, logObj, showById, hideById } from './utils'
import { setupStripePaymentElement } from './payment-element'

const imgApple = require('../imgs/apple-pay.svg')
const imgGoogle = require('../imgs/google-pay.svg')

// charge subscription with existing payment method
export default async function getCheckout() {
  hideById('checkout-payment-option')
  hideById('checkout-message')
  hideById('payment-methods')

  showLoading(this, true)

  const customerInput = document.getElementById('customer-input')
  const customer = await _fetch(`/customer/${customerInput.value}`)
  logObj('Customer', customer)

  const paymentMethodId = customer.invoice_settings.default_payment_method
  const card = paymentMethodId
    ? await _fetch(`/customer/${customerInput.value}/payment-methods/${paymentMethodId}`)
    : null

  logObj('Card', card)

  displayCheckoutOptions(card)

  showLoading(this, false)
  showById('checkout-payment-option')
}

// show checkout with payment options
function displayCheckoutOptions (card) {
  const tpl = card ? `
  <div class="columns">
    <div class="column col-12 form-group">
      <label class="form-radio">
        <input type="radio" name="checkout" checked value="valid">
        <i class="form-icon"></i><span class="label label-secondary">${card.card.brand} *${card.card.last4} -- Expires in ${card.card.exp_month}/${card.card.exp_year}</span>
        ${card.card.wallet?.type ===  'apple_pay' ? `<span class="float-right"><img src="${imgApple}" width="25px" /></span>` : ''}
        ${card.card.wallet?.type ===  'google_pay' ? `<span class="float-right"><img src="${imgGoogle}" width="25px" /></span>` : ''}
      </label>
    </div>

    <div class="form-group column col-sm-6">
      <button id="btn-createnpay-new-card" class="btn btn-secondary btn-block btn-add-card">Pay with new card</button>
    </div>
    <div class="form-group column col-sm-6">
      <button id="btn-pay-confirm" class="btn btn-primary btn-block btn-confirm-card">Confirm</button>
    </div>
  </div>
` : `
  <div class="columns">
    <div class="column col-12 form-group">- No payment method found -</div>
  </div>
`

  showById('checkout-payment-option', tpl)

  // add click to new btns
  const btnConfirm = document.getElementById('btn-pay-confirm')
  btnConfirm.addEventListener('click', confirmCheckout)
  const btnPayNewCard = document.getElementById('btn-createnpay-new-card')
  btnPayNewCard.addEventListener('click', addNewCard)
}

async function confirmCheckout () {
  showLoading(this, true)
  hideById('checkout-message')

  const customerInput = document.getElementById('customer-input')
  const customer = await _fetch(`/customer/${customerInput.value}`)

  // let subscription = await _fetch(`/customers/${customer.id}/create-subscriptions`, 'POST', {
  //   priceId: 'price_1KlaEPEv92Ty3pFACO4AZb9K'
  // })
  const subscriptionSchedule = await _fetch(`/customers/${customer.id}/create-subscription-schedules`, 'POST', {
    priceId: 'price_1KlaEPEv92Ty3pFACO4AZb9K'
  })

  let paymentIntent = await _fetch(`/customers/${customer.id}/payment-intent/${subscriptionSchedule.subscription.latest_invoice.payment_intent}`)

  const { publicKey } = await _fetch('/public-key')
  const stripe = await Stripe(publicKey)

  paymentIntent = await stripe.confirmCardPayment(paymentIntent.client_secret, {
    payment_method: customer.invoice_settings.default_payment_method
  })

  if (paymentIntent.error) {
    // delete subscription in backend
  } else {
    // activate subscription in backend
  }

  if (paymentIntent.error) {
    showById('checkout-message', `<div class="toast toast-error">${paymentIntent.error.message}</div>`)
  } else {
    showById('checkout-message', `<div class="toast toast-success">Subscription <pre>${subscriptionSchedule.subscription.id}</pre> is active!</div>`)
  }

  const subscription = await _fetch(`/subscriptions/${subscriptionSchedule.subscription.id}`)

  showLoading(this, false)
  logObj('Payment Intent', paymentIntent)
  logObj('Subscription', subscription)
}

// when user add a new card on checkout instead of using existing payment method
async function addNewCard () {
  showLoading(this, true)
  const customerId = document.getElementById('customer-input').value
  const setupIntent = await _fetch('/create-setup-intent', 'POST', { customerId })
  const { publicKey } = await _fetch('/public-key', 'GET')
  setupNewStripeElements(setupIntent, publicKey)
  showLoading(this, false)
}

async function setupNewStripeElements (setupIntent, publicKey) {
  const stripe = await Stripe(publicKey)
  const elementContainer = document.getElementById('stripe-payment-element')
  const invoiceContainer = document.getElementById('invoice-amount')
  const elements = await setupStripePaymentElement(stripe, setupIntent, publicKey, elementContainer, invoiceContainer)

  hideById('add-card')
  showById('billing-details')
  showById('pay-new-card')

  // - Submit
  const btnSubmit = document.getElementById('btn-pay-new-card')
  btnSubmit.addEventListener('click', paySubscription)
  async function paySubscription () {
    showLoading(this, true)
    hideById('checkout-message')

    const customerId = document.getElementById('customer-input').value

    const newAddress = {
      country: document.getElementById('billing-country-input').value,
      postal_code: document.getElementById('billing-zipcode-input').value
    }
    logObj(newAddress)

    const customer = await _fetch(`/customer/${customerId}/update-billing-address`, 'PATCH', newAddress)
    logObj('Customer', customer)

    const confirmIntent = await stripe.confirmSetup({
      elements,
      redirect: 'if_required',
      confirmParams: {
        payment_method_data: {
          billing_details: {
            address: newAddress
          }
        }
      }
    })

    if (confirmIntent.error) {
      console.error(confirmIntent.error)
      showById('checkout-message', `<div class="toast toast-error">Error proccessing payment method</div>`)
      showLoading(this, false)
      return
    }

    logObj('Confirm setup', confirmIntent.setupIntent)

    const setDefaultPayment = await _fetch(`/customer/${customerId}/set-default-payment-method`, 'PATCH', { paymentMethodId: confirmIntent.setupIntent.payment_method })

    logObj('Update', setDefaultPayment)

    const subscriptionSchedule = await _fetch(`/customers/${customerId}/create-subscription-schedules`, 'POST', {
      priceId: 'price_1KlaEPEv92Ty3pFACO4AZb9K'
    })
    logObj('Subscription Schedule', subscriptionSchedule)

    const subscription = await _fetch(`/subscriptions/${subscriptionSchedule.subscription.id}`)

    const invoice = await _fetch(`/pay-invoice`, 'POST', {
      invoiceId: subscription.latest_invoice.id
    })
    logObj('Invoice', invoice)


    showLoading(this, false)
    logObj('Subscription', subscription)

    showById('checkout-message', `<div class="toast toast-success">Subscription <pre>${subscription.id}</pre> is active!</div>`)
  }
}
