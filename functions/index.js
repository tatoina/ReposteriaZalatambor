const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { logger } = require('firebase-functions');
const { defineSecret, defineString } = require('firebase-functions/params');
const { Resend } = require('resend');

const resendApiKey = defineSecret('RESEND_API_KEY');
const resendFrom = defineString('RESEND_FROM', {
  default: 'Reposteria Zalatambor <onboarding@resend.dev>',
});

exports.notifyNewOrder = onDocumentCreated({
  document: 'orders/{orderId}',
  region: 'europe-west1',
  secrets: [resendApiKey],
}, async (event) => {
  const order = event.data.data();
  const orderNumber = order.orderNumber || `RZ-${event.params.orderId.slice(0, 8).toUpperCase()}`;
  const items = (order.items || []).map((item) => `- ${item.quantity} x ${item.name}${item.gift ? ' (envoltorio regalo)' : ''}`).join('\n');
  const text = [
    `Ha llegado el pedido ${orderNumber}.`,
    '',
    `Cliente: ${order.customer}`,
    `Email: ${order.email}`,
    `Teléfono: ${order.phone}`,
    `Entrega: ${order.delivery ? `Domicilio - ${order.address}` : 'Recogida en obrador'}`,
    `Pago: ${order.paymentMethod || 'Bizum'}`,
    '',
    'Productos:',
    items,
    '',
    `Total: ${Number(order.total || 0).toFixed(2)} EUR`,
  ].join('\n');

  await new Resend(resendApiKey.value()).emails.send({
    from: resendFrom.value(),
    to: 'andervicentegoni@gmail.com',
    subject: `Nuevo pedido ${orderNumber}`,
    text,
  });
  logger.info('Order notification sent', { orderId: event.params.orderId, orderNumber });
});