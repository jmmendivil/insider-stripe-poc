// helpers
import { _fetch, logObj, showLoading, showById } from './utils'
import existingUserCheckout from './existing-user-checkout'
import existingUserAddPayment from './existing-user-add-payment'
import { existingUserAllPaymentMethods, existingUserDefaultPaymentMethod } from './existing-user-payment-methods'
import newUserCheckout from './new-user-checkout'

window.webConsole = false
const checkWebConsole = document.getElementById('web-console')
checkWebConsole.addEventListener('click', function (evt) { window.webConsole = evt.target.checked })


/* ------------------------------------------------------------------------------- */
// -- Subscription
const btnGetSubs = document.getElementById('btn-subs')
btnGetSubs.addEventListener('click', getSubs)
async function getSubs() {
  try {
    const subsInput = document.getElementById('subs-input')
    showLoading(this, true)
    const subs = await _fetch(`/subscriptions/${subsInput.value}`)
    logObj('Subscription', subs)
  } finally {
    showLoading(this, false)
  }
}

/* ------------------------------------------------------------------------------- */
// -- Customer
const btnGetCustomer = document.getElementById('btn-customer')
btnGetCustomer.addEventListener('click', getCustomer)
async function getCustomer() {
  showLoading(this, true)
  const customerInput = document.getElementById('customer-input')
  const customer = await _fetch(`/customer/${customerInput.value}`)
  logObj('Customer', customer)
  showLoading(this, false)
}

const btnGetPaymentMethods = document.getElementById('btn-list-payment-methods')
btnGetPaymentMethods.addEventListener('click', existingUserAllPaymentMethods)

const btnDefaultPaymentMethod = document.getElementById('btn-default-payment-method')
btnDefaultPaymentMethod.addEventListener('click', existingUserDefaultPaymentMethod)

// --- Add new payment method
const btnAddPayment = document.getElementById('btn-add-payment')
btnAddPayment.addEventListener('click', existingUserAddPayment)

/* ------------------------------------------------------------------------------- */
// - Checkout
const btnGetCheckout = document.getElementById('btn-checkout')
btnGetCheckout.addEventListener('click', existingUserCheckout)

//---------------------------------------------------------
// new user flow
const btnNewUserCheckout = document.getElementById('btn-new-checkout')
btnNewUserCheckout.addEventListener('click', newCheckout)
async function newCheckout() {
  showById('new-user-checkout-container')
}

const btnNewUser = document.getElementById('btn-new-user')
btnNewUser.addEventListener('click', newUserCheckout)
