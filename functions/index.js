const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { logger } = require('firebase-functions');

exports.notifyNewOrder = onDocumentCreated('orders/{orderId}', (event) => {
  const order = event.data.data();
  logger.info('New order notification requested', {
    orderId: event.params.orderId,
    customerEmail: order.email,
  });
});