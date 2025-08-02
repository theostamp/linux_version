import { NextResponse } from 'next/server';

const quotes = [
  "Καλώς ήρθατε στην πολυκατοικία μας! 🏠",
  "Μια καλύτερη κοινότητα ξεκινάει από εμάς! ✨",
  "Συνεργαζόμαστε για ένα καλύτερο μέλλον! 🤝",
  "Η ασφάλεια και η ευημερία όλων είναι προτεραιότητα! 🛡️",
  "Καθαρότητα και τάξη για όλους! 🧹",
  "Ενημερωθείτε για τα τελευταία νέα της πολυκατοικίας! 📢",
  "Η φωνή σας έχει σημασία! 🗣️",
  "Μαζί δημιουργούμε μια υπέροχη κοινότητα! 🌟",
  "Καλή συνέχεια και ευχές για όλους! 🙏",
  "Η πολυκατοικία μας είναι το σπίτι μας! 🏘️",
];

export async function GET() {
  // Select a random quote
  const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
  
  return NextResponse.json({
    content: randomQuote,
    timestamp: new Date().toISOString(),
  });
}