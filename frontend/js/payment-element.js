// TODO: html
import { _fetch } from './utils'

const price = 'price_1KlaEPEv92Ty3pFACO4AZb9K'

export async function setupStripePaymentElement (stripe, setupIntent, publicKey, elementContainer, invoiceContainer) {
  return new Promise(function (resolve) {

    const elements = stripe.elements({
      clientSecret: setupIntent.client_secret,
      loader: 'always',
      appearance: {
        variables: {
          borderRadius: '0.1rem',
        },
        rules: {
          '.Input': {
            color: '#3b4351',
            border: '0.07rem solid #bcc3ce',
            padding: '0.27rem 0.6rem',
            boxShadow: 'none',
            fontSize: '1rem',
            lineHeight: '1.4rem'
          }
        }
      }
    })

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

    paymentElement.on('ready', function () {
      resolve(elements)
    })
  })
}
