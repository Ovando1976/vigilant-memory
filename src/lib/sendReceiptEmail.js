import emailjs from 'emailjs-com';
import { createRideReceiptPdf } from './createRideReceiptPdf';

export async function sendReceiptEmail({ email, ride }) {
  const pdfBlob = createRideReceiptPdf(ride);
  const reader = new FileReader();

  return new Promise((resolve, reject) => {
    reader.onloadend = async () => {
      const base64pdf = reader.result.split(',')[1];

      try {
        await emailjs.send(
          process.env.REACT_APP_EMAILJS_SERVICE_ID,
          process.env.REACT_APP_EMAILJS_TEMPLATE_ID,
          {
            email,
            pickup: ride.pickup,
            dropoff: ride.dropoff,
            fare: `$${ride.fare.toFixed(2)}`,
            eta: `${ride.durationMin} min`,
            driver: ride.driverId,
            rideId: ride.rideId,
            receipt_base64: base64pdf,
          },
          process.env.REACT_APP_EMAILJS_PUBLIC_KEY
        );
        resolve();
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsDataURL(pdfBlob);
  });
}