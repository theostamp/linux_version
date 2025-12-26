import os
from contextlib import contextmanager

from django.test import SimpleTestCase

from financial.services import InvoiceParser


@contextmanager
def _set_env(**updates):
    previous = {}
    for key, value in updates.items():
        previous[key] = os.environ.get(key)
        if value is None:
            os.environ.pop(key, None)
        else:
            os.environ[key] = value
    try:
        yield
    finally:
        for key, value in previous.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value


class TestInvoiceParserModelSelection(SimpleTestCase):
    def test_default_model_order_without_availability(self):
        parser = InvoiceParser.__new__(InvoiceParser)
        parser.available_model_ids = []

        with _set_env(GOOGLE_GEMINI_MODEL=None, GEMINI_MODEL=None):
            configs = parser._get_model_configs()

        model_ids = [model_id for model_id, _ in configs]
        self.assertGreater(len(model_ids), 0)
        self.assertEqual(model_ids[0], "gemini-2.0-flash")
        self.assertIn("gemini-1.0-pro-vision-latest", model_ids)

    def test_configured_model_is_first_and_normalized(self):
        parser = InvoiceParser.__new__(InvoiceParser)
        parser.available_model_ids = []

        with _set_env(GOOGLE_GEMINI_MODEL="models/gemini-pro-vision", GEMINI_MODEL=None):
            configs = parser._get_model_configs()

        self.assertGreater(len(configs), 0)
        self.assertEqual(configs[0][0], "gemini-pro-vision")

    def test_available_models_are_sorted_by_preference(self):
        parser = InvoiceParser.__new__(InvoiceParser)
        parser.available_model_ids = [
            "gemini-pro-vision",
            "gemini-2.0-flash-001",
            "chat-bison-001",
        ]

        with _set_env(GOOGLE_GEMINI_MODEL=None, GEMINI_MODEL=None):
            configs = parser._get_model_configs()

        model_ids = [model_id for model_id, _ in configs]
        self.assertEqual(model_ids[0], "gemini-2.0-flash-001")
        self.assertEqual(model_ids[1], "gemini-pro-vision")
