// TODO: html
import { _fetch, logObj, hideById, showById } from './utils'

const price = 'price_1KlaEPEv92Ty3pFACO4AZb9K'

export async function setupStripePaymentElement (stripe, setupIntent, publicKey, elementContainer, invoiceContainer) {
  return new Promise(function (resolve) {

    elementContainer.parentElement.classList.add('d-none')

    const elements = stripe.elements({
      clientSecret: setupIntent.client_secret,
      // loader: 'always',
      appearance: {
        variables: {
          borderRadius: '0.1rem',
          fontSizeBase: '16px'
        },
        theme: 'none',
        rules: {
          '.Label': {
            fontSize: '1rem',
          },
          '.Input': {
            color: '#3b4351',
            border: '0.07rem solid #bcc3ce',
            padding: '0.27rem 0.6rem',
            boxShadow: 'none',
            fontSize: '1rem',
            lineHeight: '1.4rem'
          },
          '.Tab': {
            width: '500px',
            border: '0.07rem solid #bcc3ce',
            boxShadow: 'none',
          },
        }
      }
    })
    logObj('elements', elements)

    const countryInput = document.getElementById('billing-country-input')
    const zipInput = document.getElementById('billing-zipcode-input')

    countryInput.addEventListener('blur', calculateTaxEvent)
    zipInput.addEventListener('blur', calculateTaxEvent)
    async function calculateTaxEvent(evt) {
      const country = countryInput.value
      const postal_code = zipInput.value

      // no invoice info needed
      if (!invoiceContainer) return

      // postal code validation
      if (postal_code.length !== 5) return

      const daftInvoice = await _fetch('/upcoming-invoice', 'POST', {
        customer_details: {
          address: {
            country,
            postal_code
          }
        },
        subscription_items: [{ price, quantity: 1 }],
        automatic_tax: { enabled: true }
      }, publicKey)

      invoiceContainer.innerHTML = `
      tax: ${daftInvoice.tax}
      total: ${daftInvoice.total}
      subtotal: ${daftInvoice.subtotal}
    `
    }

    const paymentElement = elements.create('payment', {
      paymentMethodOrder: ['apple_pay', 'google_pay', 'card'],
      terms: {
        card: 'never',
      },
      fields: {
        billingDetails: {
          address: {
            city: 'auto',
            country: 'never',
            line1: 'auto',
            line2: 'auto',
            postalCode: 'never',
            state: 'auto',
          }
        }
      }
    })
    paymentElement.mount(elementContainer)
    window.pe = paymentElement
    paymentElement.on('change', function (evt) {
      if (evt.collapsed) {
        hideById('billing-details')
        elementContainer.parentElement.classList.remove('d-none')
      }
      if (!evt.collapsed) showById('billing-details')
      logObj('change', evt)
    })

    paymentElement.on('ready', function (evt) {
      // :c
      setTimeout(function () {
        paymentElement.collapse()
      }, 500)
      resolve(elements)
    })
  })
}
