# backend/user_requests/utils.py

from django.conf import settings
from django.template.loader import render_to_string

from core.emailing import extract_legacy_body_html, send_templated_email


def send_urgent_request_email(user_request):
    subject = f"🚨 Επείγον Αίτημα: {user_request.title}"
    # Prefer configured recipients; fallback to DEFAULT_FROM_EMAIL if nothing else is available.
    to = getattr(settings, "URGENT_REQUEST_EMAIL_RECIPIENTS", None) or [
        getattr(settings, "DEFAULT_FROM_EMAIL", "")
    ]
    to = [email for email in to if email]

    context = {
        "request_title": user_request.title,
        "supporter_count": user_request.supporters.count(),
        "request_description": user_request.description,
        "request_url": f"{getattr(settings, 'FRONTEND_URL', '').rstrip('/')}/requests/{user_request.id}",
    }

    legacy_html = render_to_string("user_requests/urgent_email.html", context)
    send_templated_email(
        to=to,
        subject=subject,
        template_html="emails/wrapper.html",
        context={"body_html": extract_legacy_body_html(html=legacy_html), "wrapper_title": subject},
        template_text="user_requests/urgent_email.txt",
    )
