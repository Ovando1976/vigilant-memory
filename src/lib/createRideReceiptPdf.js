import { jsPDF } from 'jspdf';

export function createRideReceiptPdf(ride) {
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text('🧾 USVI Explorer Ride Receipt', 20, 20);

  doc.setFontSize(12);
  doc.text(`Ride ID: ${ride.rideId}`, 20, 35);
  doc.text(`Pickup: ${ride.pickup}`, 20, 45);
  doc.text(`Dropoff: ${ride.dropoff}`, 20, 55);
  doc.text(`Fare: $${ride.fare?.toFixed(2)}`, 20, 65);
  doc.text(`ETA: ${ride.durationMin} min`, 20, 75);
  doc.text(`Driver: ${ride.driverId}`, 20, 85);
  doc.text(`Status: ${ride.status}`, 20, 95);
  doc.text(`Thank you for riding with us!`, 20, 115);

  return doc.output('blob');
}