self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    // ignore JSON errors
  }

  const { title = 'Notification', body = '', icon } =
    data.notification || data;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: icon || '/logo192.png',
    })
  );
});
