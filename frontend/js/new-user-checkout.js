import { _fetch, logObj, showLoading, showById, hideById } from './utils'
import { setupStripePaymentElement } from './payment-element'

export default async function newUserCheckout() {
  showLoading(this, true)

  const customerInput = document.getElementById('new-customer-input')
  const customer = await _fetch(`/customers`, 'POST', {
    email: customerInput.value,
    address: {
      country: 'US',
      postal_code: 77407
    }
  })

  const customerId = customer.id

  const setupIntent = await _fetch('/create-setup-intent', 'POST', { customerId })
  logObj('Intent', setupIntent)

  const { publicKey } = await _fetch('/public-key', 'GET')

  hideById('new-user-checkout-container')
  hideById('add-card')

  const stripe = await Stripe(publicKey)
  const elementContainer = document.getElementById('stripe-payment-element')
  const invoiceContainer = document.getElementById('invoice-amount')
  const elements = await setupStripePaymentElement(stripe, setupIntent, publicKey, elementContainer, invoiceContainer)

  showById('pay-new-card')
  showById('billing-details')

  // - Submit
  const btnSubmit = document.getElementById('btn-pay-new-card')
  btnSubmit.addEventListener('click', paySubscription)
  async function paySubscription () {
    showLoading(this, true)
    hideById('new-user-checkout-message')

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

    logObj('Confirm Intent', confirmIntent)

    if (confirmIntent.error) {
      console.error(confirmIntent.error)
      showById('new-user-checkout-message', `<div class="toast toast-error">${confirmIntent.error.message}</div>`)
      showLoading(this, false)
      return
    }

    const setDefaultPayment = await _fetch(`/customer/${customerId}/set-default-payment-method`, 'PATCH', {
      paymentMethodId: confirmIntent.setupIntent.payment_method
    })
    logObj('Update', setDefaultPayment)

    const subscriptionSchedule = await _fetch(`/customers/${customerId}/create-subscription-schedules`, 'POST', {
      priceId: 'price_1KlaEPEv92Ty3pFACO4AZb9K'
    })
    logObj('Subscription Schedule', subscriptionSchedule)

    const subscription = await _fetch(`/subscriptions/${subscriptionSchedule.subscription}`)
    logObj('Subscription', subscription)


    const invoice = await _fetch(`/pay-invoice`, 'POST', {
      invoiceId: subscription.latest_invoice.id
    })
    logObj('Invoice', invoice)

    showLoading(this, false)

    showById('new-user-checkout-message', `<div class="toast toast-success">Subscription <pre>${subscription.id}</pre> is active!</div>`)
  }

  showLoading(this, false)
  logObj('Customer', customer)
}
