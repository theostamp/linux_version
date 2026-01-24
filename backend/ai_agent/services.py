import google.generativeai as genai
import os
import logging

logger = logging.getLogger(__name__)

class AIService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(AIService, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        """Initialize Gemini API client"""
        # Backwards compatible env var lookup:
        # - Preferred: GOOGLE_GEMINI_API_KEY
        # - Legacy/used elsewhere in this repo: GOOGLE_API_KEY
        api_key = os.getenv('GOOGLE_GEMINI_API_KEY') or os.getenv('GOOGLE_API_KEY')
        if not api_key:
            logger.warning("Gemini API key not found (expected GOOGLE_GEMINI_API_KEY or GOOGLE_API_KEY)")
            self.model = None
            return

        genai.configure(api_key=api_key)
        model_name = os.getenv('GOOGLE_GEMINI_MODEL') or 'gemini-2.5-flash'
        self.model = genai.GenerativeModel(model_name)
        logger.info(f"Gemini AI model initialized successfully: {model_name}")

    def generate_response(self, prompt, context=None):
        """
        Generate a response using Gemini

        Args:
            prompt (str): The user's input
            context (dict): Optional context about the user/building/situation
        """
        if not self.model:
            return self._fallback_response(prompt, reason="missing_api_key")

        try:
            # Build system instruction based on context
            system_instruction = self._build_system_instruction(context)
            full_prompt = f"{system_instruction}\n\nUser: {prompt}"

            response = self.model.generate_content(full_prompt)
            return response.text
        except Exception as e:
            logger.exception("Error generating AI response")
            return self._fallback_response(prompt, reason="generation_failed")

    def analyze_maintenance_intent(self, text):
        """
        Analyze if the text describes a maintenance issue
        Returns: JSON-like dict with category, severity, title, description
        """
        if not self.model:
            return None

        prompt = f"""
        Analyze the following text and determine if it describes a building maintenance issue.
        If it does, extract the following fields in JSON format:
        - is_maintenance (bool)
        - category (plumbing, electrical, cleaning, structural, other)
        - severity (low, medium, high, emergency)
        - title (short summary)
        - description (cleaned up description)

        Text: "{text}"
        """

        try:
            response = self.model.generate_content(prompt)
            # Simple cleanup to get JSON part if model adds markdown
            text_response = response.text.replace('```json', '').replace('```', '').strip()
            import json
            return json.loads(text_response)
        except Exception as e:
            logger.error(f"Error analyzing maintenance intent: {str(e)}")
            return None

    def _build_system_instruction(self, context):
        base_instruction = """
        You are the 'Digital Concierge', an intelligent assistant for a residential building.
        Your goal is to be helpful, polite, and professional.
        You should act as an experienced building manager.
        Do not invent facts or tasks. If you don't have access to data, say so and guide the user to the correct screen.
        """

        if context:
            if 'user_role' in context:
                base_instruction += f"\nYou are talking to a {context['user_role']}."
            if 'building_name' in context:
                base_instruction += f"\nThe building is {context['building_name']}."

        return base_instruction

    def _fallback_response(self, prompt, reason: str | None = None):
        """
        Return a helpful Greek fallback response when AI is unavailable.
        """
        text = (prompt or "").lower()

        if "τι μπορει" in text or "τι μπορεί" in text or "help" in text:
            return (
                "Μπορώ να βοηθήσω με εκκρεμότητες, υπενθυμίσεις οφειλών, "
                "αιτήματα συντήρησης και βασικές ερωτήσεις για το κτίριο."
            )

        if "εκκρεμ" in text or "εργασ" in text or "todo" in text:
            return "Μπορώ να οργανώσω τις εκκρεμότητες σου. Πάτησε «Εκκρεμότητες» για να δεις το Kanban."

        if "οφειλ" in text or "πληρω" in text:
            return (
                "Μπορώ να σε βοηθήσω με υπενθυμίσεις οφειλών και παρακολούθηση πληρωμών. "
                "Πες μου ποιο κτίριο αφορά."
            )

        if "βλαβ" in text or "σταζει" in text or "στάζει" in text:
            return "Μπορώ να ανοίξω αίτημα συντήρησης. Θέλεις να το καταχωρήσω;"

        base = "Προσωρινά δεν έχω πρόσβαση στην AI απάντηση."
        if reason == "missing_api_key":
            base = "Η υπηρεσία AI δεν είναι διαθέσιμη αυτή τη στιγμή."

        return f"{base} Μπορώ όμως να βοηθήσω με εκκρεμότητες, οφειλές και αιτήματα συντήρησης."
