import { NextResponse } from 'next/server';

// Community messages for the sidebar
const COMMUNITY_MESSAGES = [
  "Ενημερωθείτε για τα τελευταία νέα της πολυκατοικίας! 📢",
  "Μια καλύτερη κοινότητα ξεκινάει από εμάς! ✨",
  "Η ασφάλεια και η ευημερία όλων είναι προτεραιότητα! 🛡️",
  "Καθαρότητα και τάξη για όλους! 🧹",
  "Η φωνή σας έχει σημασία! 🗣️",
  "Μαζί δημιουργούμε μια υπέροχη κοινότητα! 🌟",
  "Καλή συνέχεια και ευχές για όλους! 🙏",
  "Η πολυκατοικία μας είναι το σπίτι μας! 🏘️",
  "Συνεργαζόμαστε για ένα καλύτερο μέλλον! 🤝",
  "Ευχαριστούμε για την συνεργασία σας! 🙏",
  "Η πολυκατοικία μας είναι ασφαλής και φιλική! 🏢",
  "Μαζί δημιουργούμε ένα καλύτερο περιβάλλον! 🌱"
];

// Weather and general messages
const GENERAL_MESSAGES = [
  "Καλώς ήρθατε στην πολυκατοικία μας! 🏠",
  "Καλή ημέρα σε όλους τους κατοίκους! ☀️",
  "Παρακολουθήστε τον καιρό για σήμερα! 🌤️",
  "Καλή εβδομάδα σε όλους! 📅",
  "Μείνετε ενημερωμένοι για τα τοπικά νέα! 📰",
  "Καλή διασκέδαση το Σαββατοκύριακο! 🎉",
  "Μην ξεχάσετε να ελέγξετε τα ταχυδρομεία σας! 📮",
  "Καλή εργασία σήμερα! 💼",
  "Απολαύστε την ημέρα σας! 😊"
];

// Function to get weather-based messages
function getWeatherMessage(): string {
  const hour = new Date().getHours();
  const weatherMessages = [
    "Καλή πρωία! Ξεκινήστε την ημέρα σας με ενέργεια! 🌅",
    "Καλό μεσημέρι! Μην ξεχάσετε το μεσημεριανό σας! 🍽️",
    "Καλό απόγευμα! Απολαύστε το υπόλοιπο της ημέρας! 🌆",
    "Καλό βράδυ! Καλή ανάπαυση! 🌙"
  ];
  
  if (hour < 12) return weatherMessages[0];
  if (hour < 17) return weatherMessages[1];
  if (hour < 21) return weatherMessages[2];
  return weatherMessages[3];
}

// Function to get all community messages
function getAllCommunityMessages(): string[] {
  const allMessages = [
    ...COMMUNITY_MESSAGES,
    ...GENERAL_MESSAGES,
    getWeatherMessage()
  ];
  
  return allMessages.sort(() => Math.random() - 0.5);
}

export async function GET() {
  try {
    const messages = getAllCommunityMessages();
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    
    return NextResponse.json({
      content: randomMessage,
      timestamp: new Date().toISOString(),
      source: 'community-messages',
      allMessages: messages
    });
  } catch (error) {
    console.error('Error in community messages API:', error);
    
    const fallbackMessage = "Καλώς ήρθατε στην πολυκατοικία μας! 🏠";
    
    return NextResponse.json({
      content: fallbackMessage,
      timestamp: new Date().toISOString(),
      source: 'fallback',
      allMessages: [fallbackMessage]
    });
  }
} 