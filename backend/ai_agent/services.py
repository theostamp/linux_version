from django.conf import settings
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
        api_key = os.getenv('GOOGLE_GEMINI_API_KEY')
        if not api_key:
            logger.warning("GOOGLE_GEMINI_API_KEY not found in environment variables")
            self.model = None
            return

        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-pro')
        logger.info("Gemini AI model initialized successfully")

    def generate_response(self, prompt, context=None):
        """
        Generate a response using Gemini

        Args:
            prompt (str): The user's input
            context (dict): Optional context about the user/building/situation
        """
        if not self.model:
            return "AI service is not configured properly."

        try:
            # Build system instruction based on context
            system_instruction = self._build_system_instruction(context)
            full_prompt = f"{system_instruction}\n\nUser: {prompt}"

            response = self.model.generate_content(full_prompt)
            return response.text
        except Exception as e:
            logger.error(f"Error generating AI response: {str(e)}")
            return "I apologize, but I'm having trouble processing your request right now."

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
        """

        if context:
            if 'user_role' in context:
                base_instruction += f"\nYou are talking to a {context['user_role']}."
            if 'building_name' in context:
                base_instruction += f"\nThe building is {context['building_name']}."

        return base_instruction

