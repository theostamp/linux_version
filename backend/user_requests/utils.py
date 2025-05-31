# backend/user_requests/utils.py

from django.core.mail import EmailMultiAlternatives  # type: ignore  # type: ignore
from django.template.loader import render_to_string  # type: ignore  # type: ignore
from django.conf import settings  # type: ignore  # type: ignore

def send_urgent_request_email(user_request):
    subject = f"🚨 Επείγον Αίτημα: {user_request.title}"
    from_email = settings.DEFAULT_FROM_EMAIL
    to = ["admin@yourdomain.gr"]  # ή λίστα παραληπτών

    context = {
        'request_title': user_request.title,
        'supporter_count': user_request.supporters.count(),
        'request_description': user_request.description,
        'request_url': f"https://yourfrontenddomain.gr/requests/{user_request.id}"
    }

    text_content = render_to_string('user_requests/urgent_email.txt', context)
    html_content = render_to_string('user_requests/urgent_email.html', context)

    msg = EmailMultiAlternatives(subject, text_content, from_email, to)
    msg.attach_alternative(html_content, "text/html")
    msg.send()
