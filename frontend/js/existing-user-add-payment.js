import { _fetch, logObj, showLoading, showById, hideById } from './utils'
import { setupStripePaymentElement } from './payment-element'

export default async function createElement() {
  showLoading(this, true)
  hideById('payment-methods-message')
  const { publicKey } = await _fetch('/public-key', 'GET')

  const customerId = document.getElementById('customer-input').value
  const subscriptionId = document.getElementById('subs-input').value
  const setupIntent = await _fetch('/create-setup-intent', 'POST', { customerId, subscriptionId })
  logObj('Intent', setupIntent)

  setupSavedCard(publicKey, setupIntent)

  showLoading(this, false)
}

async function setupSavedCard (publicKey, setupIntent) {
  const stripe = await Stripe(publicKey)
  const elementContainer = document.getElementById('stripe-payment-element')
  const elements = await setupStripePaymentElement(stripe, setupIntent, publicKey, elementContainer)

  showById('billing-details')
  showById('add-card')

  const btnSubmit = document.getElementById('btn-add-card')
  btnSubmit.addEventListener('click', submitCard)
  async function submitCard () {
    showLoading(this, true)
    hideById('payment-methods-message')

    const customerId = document.getElementById('customer-input').value

    const newAddress = {
      country: document.getElementById('billing-country-input').value,
      postal_code: document.getElementById('billing-zipcode-input').value
    }

    const customer = await _fetch(`/customer/${customerId}/update-billing-address`, 'PATCH', newAddress)
    logObj('Customer', customer)

    // confirmCardSetup will create a new payment method behind the scenes
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
      showById('payment-methods-message', `<div class="toast toast-error">Error proccessing payment method</div>`)
      showLoading(this, false)
      return
    }

    logObj('Confirm setup', confirmIntent.setupIntent)

    const setDefaultPayment = await _fetch(`/customer/${customerId}/set-default-payment-method`,
      'PATCH',
      { paymentMethodId: confirmIntent.setupIntent.payment_method }
    )

    showById('payment-methods-message', `<div class="toast toast-success">Payment method successful added!</div>`)

    logObj('Update', setDefaultPayment)
    showLoading(this, false)
  }
}
