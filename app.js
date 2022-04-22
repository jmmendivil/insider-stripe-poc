require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const path = require('path')
const app = express()

const stripe = require('stripe')(process.env.STRIPE_SK_KEY)

app.use(express.static('public'))
app.use(bodyParser.json())

app.set('views', path.join(__dirname, 'src/views'))
app.set('view engine', 'hbs')

app.get('/', (req, res) => res.render('index.hbs'))
app.get('/google-apple', (req, res) => res.render('google-apple.hbs'))

// - Customer
app.get('/customer/:customerId', async (req, res) => {
  const { customerId } = req.params
  res.send(await stripe.customers.retrieve(customerId))
})

app.get('/customer/:customerId/payment-methods', async (req, res) => {
  const { customerId } = req.params
  res.send(await stripe.customers.listPaymentMethods(
    customerId,
    { type: 'card' }
  ))
})
app.get('/customer/:customerId/payment-methods/:paymentMethodId', async (req, res) => {
  res.send(await stripe.paymentMethods.retrieve(req.params.paymentMethodId))
})

app.post('/customer/:customerId/add-payment-method', async (req, res) => {
  console.dir(req.body, { depth: null })
  // Attach the payment method to the customer
  try {
    await stripe.paymentMethods.attach(req.body.paymentMethodId, {
      customer: req.body.customerId,
    })

    // Change the default invoice settings on the customer to the new payment method
    const result = await stripe.customers.update(
      req.body.customerId,
      {
        invoice_settings: {
          default_payment_method: req.body.paymentMethodId,
        },
      }
    )
    res.send(result)
  } catch (error) {
    return res.status('402').send({ error: { message: error.message } })
  }
})

app.patch('/customer/:customerId/set-default-payment-method', async (req, res) => {
  res.send(await stripe.customers.update(
    req.params.customerId,
    {
      invoice_settings: {
        default_payment_method: req.body.paymentMethodId,
      }
    }
  ))
})

app.patch('/customer/:customerId/update-billing-address', async (req, res) => {
  res.send(await stripe.customers.update( req.params.customerId, { address: req.body }))
})

app.patch('/customer/:customerId/update-payment-method/:id', async (req, res) => {
  const paymentMethod = {}

  const billing_details = {}
  // if (req.body.name) billing_details.name = req.body.name

  const address = {}
  // if (req.body.city) address.city = req.body.city
  // if (req.body.country) address.country = req.body.country // ISO-3166-1
  // if (req.body.state) address.state = req.body.state
  // if (req.body.line1) address.line1 = req.body.line1
  // if (req.body.line2) address.line2 = req.body.line2
  if (req.body.postal_code) address.postal_code = req.body.postal_code

  if (Object.keys(address).length > 0) billing_details.address = address

  const card = {}
  if (req.body.exp_month) card.exp_month = req.body.exp_month
  if (req.body.exp_year) card.exp_year = req.body.exp_year

  if (Object.keys(billing_details).length > 0) paymentMethod.billing_details = billing_details
  if (Object.keys(card).length > 0) paymentMethod.card = card

  res.send(await stripe.paymentMethods.update(req.params.id, paymentMethod))
})

// - Subscriptions
app.get('/subscriptions/:subsId', async (req, res) => {
  const { subsId } = req.params
  res.send(await stripe.subscriptions.retrieve(
    subsId,
    { expand: ['latest_invoice.payment_intent'] }
  ))
})

// - Update source with token - x
app.post('/update-customer-source', async (req, res) => {
  res.send(await stripe.customers.update(
    req.body.customerId,
    { source: req.body.token.id }
  ))
})


// - Setup Intent
app.post('/create-setup-intent', async (req, res) => {
  res.send(await stripe.setupIntents.create({
    customer: req.body.customerId,
    payment_method_types: ['card'], // default
    usage: 'off_session',
    metadata: {
      customer_id: req.body.customerId,
      subscription_id: req.body.subscriptionId,
    }
  }))
})

// - Payment Intent
app.post('/create-payment-intent', async (req, res) => {
  res.send(await stripe.paymentIntents.create({
    customer: req.body.customerId,
    amount: req.body.amount,
    currency: req.body.currency,
    confirm: true,
    payment_method: req.body.paymentMethodId
    // usage: 'off_session',
    // metadata: {
      // customer_id: req.body.customerId,
      // subscription_id: req.body.subscriptionId,
    // }
  }))
})

// - Create a subscription
app.post('/customers/:customerId/create-subscriptions', async (req, res) => {
  res.send(await stripe.subscriptions.create({
    customer: req.params.customerId,
    items: [{ price: req.body.priceId }],
    payment_behavior: 'default_incomplete',
    automatic_tax: { enabled: true },
    expand: ['latest_invoice.payment_intent']
  }))
})

// - Get public key
app.get('/public-key', (req, res) => {
  res.send({ publicKey: process.env.STRIPE_PK_KEY })
})

app.listen(process.env.HTTP_PORT, () => {
  console.log('\x1b[36m%s\x1b[0m',`>> Listening on port ${process.env.HTTP_PORT}!`)
})
