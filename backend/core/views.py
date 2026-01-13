from django.views.decorators.csrf import ensure_csrf_cookie
from django.http import JsonResponse
import random
from datetime import datetime
   # type: ignore



@ensure_csrf_cookie
def get_csrf_token(request):
    """Απλό view που ενεργοποιεί το CSRF cookie"""
    return JsonResponse({"message": "CSRF cookie set"})

def api_root(request):
    """Προαιρετικό root endpoint της API"""
    return JsonResponse({"message": "Welcome to the API root."})

def community_messages(request):
    """Community messages endpoint for the sidebar"""
    # Community messages for the sidebar
    COMMUNITY_MESSAGES = [
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
    ]

    # Weather and general messages
    GENERAL_MESSAGES = [
        "Καλώς ήρθατε στην πολυκατοικία μας! 🏠",
        "Καλή ημέρα σε όλους τους κατοίκους! ☀️",
        "Παρακολουθήστε τον καιρό για σήμερα! 🌤️",
        "Καλή εβδομάδα σε όλους! 📅",
        "Μείνετε ενημερωμένοι για τα τοπικά νέα! 📰",
        "Καλή διασκέδαση το Σαββατοκύριακο! 🎉",
        "Μην ξεχάσετε να ελέγξετε τα ταχυδρομεία σας! 📮",
        "Καλή εργασία σήμερα! 💼",
        "Απολαύστε την ημέρα σας! 😊"
    ]

    # Function to get weather-based messages
    def get_weather_message():
        hour = datetime.now().hour
        weather_messages = [
            "Καλημέρα! Ένα όμορφο πρωινό στην πολυκατοικία μας! 🌅",
            "Καλησπέρα! Μια υπέροχη ημέρα στην κοινότητα μας! 🌆",
            "Καλησπέρα! Απολαύστε το απόγευμα! 🌇",
            "Καληνύχτα! Καλό βράδυ σε όλους! 🌙"
        ]

        if hour < 12:
            return weather_messages[0]
        if hour < 18:
            return weather_messages[1]
        if hour < 21:
            return weather_messages[2]
        return weather_messages[3]

    try:
        # Get all messages and randomize
        all_messages = (
            COMMUNITY_MESSAGES +
            GENERAL_MESSAGES +
            [get_weather_message()]
        )

        # Shuffle and pick random message
        random.shuffle(all_messages)
        random_message = all_messages[0]

        return JsonResponse({
            "content": random_message,
            "timestamp": datetime.now().isoformat(),
            "source": "community-messages",
            "allMessages": all_messages
        })
    except Exception as error:
        # Fallback message
        fallback_message = "Καλώς ήρθατε στην πολυκατοικία μας! 🏠"

        return JsonResponse({
            "content": fallback_message,
            "timestamp": datetime.now().isoformat(),
            "source": "fallback",
            "allMessages": [fallback_message]
        })
