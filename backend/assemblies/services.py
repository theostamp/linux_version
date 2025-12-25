"""
Assembly Services
Business logic για συνελεύσεις
"""

from django.utils import timezone
from django.template import Template, Context
from django.conf import settings
from django.db.models import Q
from datetime import datetime
from typing import Optional
import io
import markdown
try:
    from weasyprint import HTML, CSS
except ImportError:
    HTML = None
    CSS = None

from .models import Assembly, AgendaItem, AssemblyMinutesTemplate


class AssemblyMinutesService:
    """
    Service για δημιουργία πρακτικών συνέλευσης
    """
    
    DEFAULT_HEADER = """
# ΠΡΑΚΤΙΚΑ ΓΕΝΙΚΗΣ ΣΥΝΕΛΕΥΣΗΣ

**Κτίριο:** {building_name}
**Διεύθυνση:** {building_address}

**Ημερομηνία:** {assembly_date}
**Ώρα Έναρξης:** {start_time}
**Ώρα Λήξης:** {end_time}
**Τοποθεσία:** {location}

---

## ΑΠΑΡΤΙΑ

- **Συνολικά χιλιοστά Κτιρίου:** {total_mills}
- **Απαιτούμενη Απαρτία:** {required_quorum_mills} ({required_quorum_percentage}%)
- **Παρόντα χιλιοστά:** {achieved_quorum_mills} ({achieved_quorum_percentage}%)
- **Απαρτία:** {quorum_status}

---

## ΠΑΡΟΝΤΕΣ

{attendees_list}

---

## ΘΕΜΑΤΑ ΗΜΕΡΗΣΙΑΣ ΔΙΑΤΑΞΗΣ

"""

    DEFAULT_AGENDA_ITEM = """
### Θέμα {order}: {title}

**Τύπος:** {item_type}
**Διάρκεια:** {duration} λεπτά
{presenter_line}

**Περιγραφή:**
{description}

{voting_results}

**Απόφαση:** {decision}

{discussion_notes}

---

"""

    DEFAULT_FOOTER = """

## ΥΠΟΓΡΑΦΕΣ

| Πρόεδρος Συνέλευσης | Γραμματέας |
|---------------------|------------|
| {chairman_name} | {secretary_name} |

---

*Τα παρόντα πρακτικά συντάχθηκαν αυτόματα από το σύστημα NewConcierge*
*Ημερομηνία δημιουργίας: {generated_at}*
"""

    def __init__(
        self,
        assembly: Assembly,
        template: Optional[AssemblyMinutesTemplate] = None,
        secretary_name: str = '',
        chairman_name: str = ''
    ):
        self.assembly = assembly
        self.template = template
        self.secretary_name = secretary_name or 'Ο Γραμματέας'
        self.chairman_name = chairman_name or 'Ο Πρόεδρος'
    
    def generate(self) -> str:
        """Δημιουργεί το πλήρες κείμενο πρακτικών"""
        minutes = []
        
        # Header
        minutes.append(self._generate_header())
        
        # Agenda items
        for item in self.assembly.agenda_items.order_by('order'):
            minutes.append(self._generate_agenda_item(item))
        
        # Footer
        minutes.append(self._generate_footer())
        
        return '\n'.join(minutes)
    
    def generate_pdf(self) -> bytes:
        """Δημιουργεί PDF από τα πρακτικά"""
        return self.render_markdown_to_pdf(self.generate())

    def generate_working_sheet(self) -> str:
        """
        Δημιουργεί το κείμενο για το Φύλλο Εργασίας (Working Sheet).
        Προορίζεται για εκτύπωση και χειρόγραφη συμπλήρωση κατά τη συνέλευση.
        """
        building = self.assembly.building
        date_str = self.assembly.scheduled_date.strftime('%d/%m/%Y')
        time_str = self.assembly.scheduled_time.strftime('%H:%M')
        
        lines = [
            f"# ΦΥΛΛΟ ΕΡΓΑΣΙΑΣ ΓΕΝΙΚΗΣ ΣΥΝΕΛΕΥΣΗΣ",
            f"**Κτίριο:** {building.name}",
            f"**Ημερομηνία:** {date_str} | **Ώρα:** {time_str}",
            f"**Τοποθεσία:** {self.assembly.location or '____________________'}",
            "\n---\n",
            "## 1. ΚΑΤΑΓΡΑΦΗ ΠΑΡΟΥΣΙΩΝ & ΑΠΑΡΤΙΑΣ",
            "\n| Διαμ. | Ιδιοκτήτης/Ένοικος | χιλιοστά | Παρών (✓) | Παρατηρήσεις |",
            "|-------|--------------------|----------|-----------|--------------|",
        ]
        
        # Προσθήκη όλων των καλεσμένων για check-in
        for attendee in self.assembly.attendees.all().order_by('apartment__number'):
            lines.append(
                f"| {attendee.apartment.number} | {attendee.display_name} | {attendee.mills} | [ ] | |"
            )
            
        lines.extend([
            "\n**Σύνολο Παρόντων χιλιοστών:** ____________________",
            f"**Απαιτούμενη Απαρτία:** {self.assembly.required_quorum_mills} χιλιοστά",
            "\n---\n",
            "## 2. ΘΕΜΑΤΑ ΗΜΕΡΗΣΙΑΣ ΔΙΑΤΑΞΗΣ & ΑΠΟΦΑΣΕΙΣ",
            "\nΣημειώστε τις αποφάσεις και τα αποτελέσματα των ψηφοφοριών.\n"
        ])
        
        # Προσθήκη θεμάτων ατζέντας
        for item in self.assembly.agenda_items.all().order_by('order'):
            lines.append(f"### Θέμα {item.order}: {item.title}")
            lines.append(f"**Τύπος:** {item.get_item_type_display()}")
            lines.append("\n**Σημειώσεις Συζήτησης:**\n\n\n\n")
            
            if item.item_type == 'voting':
                lines.append("| Ψήφοι Υπέρ | Ψήφοι Κατά | Λευκά | Σύνολο χιλιοστών |")
                lines.append("|------------|------------|-------|------------------|")
                lines.append("|            |            |       |                  |")
            
            lines.append("\n**ΤΕΛΙΚΗ ΑΠΟΦΑΣΗ:**\n[ ] Εγκρίθηκε  [ ] Απορρίφθηκε  [ ] Αναβλήθηκε")
            lines.append("\nΚείμενο Απόφασης: ______________________________________________________")
            lines.append("________________________________________________________________________\n")
            lines.append("---")
            
        lines.extend([
            "\n## 3. ΛΗΞΗ ΣΥΝΕΛΕΥΣΗΣ",
            "\n**Πραγματική Ώρα Λήξης:** ____________________",
            "\n**Υπογραφή Προέδρου:** ____________________  **Υπογραφή Γραμματέα:** ____________________",
        ])
        
        return "\n".join(lines)

    def generate_working_sheet_pdf(self) -> bytes:
        """Δημιουργεί PDF για το Φύλλο Εργασίας"""
        return self.render_markdown_to_pdf(self.generate_working_sheet())

    @staticmethod
    def render_markdown_to_pdf(md_text: str) -> bytes:
        """
        Δημιουργεί PDF από markdown κείμενο.
        Χρησιμοποιείται ώστε το PDF να ακολουθεί και χειροκίνητες επεξεργασίες (minutes_text).
        """
        if not HTML:
            raise ImportError("WeasyPrint is not installed or properly configured.")

        # Μετατροπή Markdown σε HTML
        # Χρησιμοποιούμε extensions για πίνακες και κώδικα
        html_content = markdown.markdown(md_text or "", extensions=['tables', 'fenced_code', 'toc'])

        # Προσθήκη βασικού CSS για το PDF
        full_html = f"""
        <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body {{
                        font-family: 'DejaVu Sans', sans-serif;
                        line-height: 1.6;
                        color: #333;
                        padding: 20px;
                    }}
                    h1 {{ color: #059669; text-align: center; border-bottom: 2px solid #059669; padding-bottom: 10px; }}
                    h2 {{ color: #10b981; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; margin-top: 30px; }}
                    h3 {{ color: #374151; }}
                    table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
                    th, td {{ border: 1px solid #e5e7eb; padding: 10px; text-align: left; }}
                    th {{ background-color: #f9fafb; }}
                    hr {{ border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0; }}
                    .footer {{ margin-top: 50px; font-size: 0.8em; color: #6b7280; text-align: center; }}
                    .signatures {{ margin-top: 50px; }}
                    .signatures table {{ border: 0; }}
                    .signatures td {{ border: 0; height: 100px; vertical-align: bottom; border-bottom: 1px solid #333; }}
                </style>
            </head>
            <body>
                {html_content}
            </body>
        </html>
        """

        return HTML(string=full_html).write_pdf()
    
    def _generate_header(self) -> str:
        """Δημιουργεί το header των πρακτικών"""
        template_text = self.DEFAULT_HEADER
        if self.template:
            template_text = self.template.header_template
        
        building = self.assembly.building
        
        # Format times
        start_time = self.assembly.actual_start_time or datetime.combine(
            self.assembly.scheduled_date,
            self.assembly.scheduled_time
        )
        end_time = self.assembly.actual_end_time or timezone.now()
        
        # Location
        location = self.assembly.location or ''
        if self.assembly.is_online and self.assembly.is_physical:
            location += ' (Υβριδική συνέλευση)'
        elif self.assembly.is_online:
            location = 'Διαδικτυακά'
        
        # Quorum status
        quorum_status = 'Επετεύχθη ✓' if self.assembly.quorum_achieved else 'Δεν επετεύχθη ✗'
        
        # Attendees list
        attendees_list = self._generate_attendees_list()
        
        context = {
            'building_name': building.name,
            'building_address': getattr(building, 'address', ''),
            'assembly_date': self.assembly.scheduled_date.strftime('%d/%m/%Y'),
            'start_time': start_time.strftime('%H:%M') if hasattr(start_time, 'strftime') else str(start_time),
            'end_time': end_time.strftime('%H:%M') if hasattr(end_time, 'strftime') else str(end_time),
            'location': location,
            'total_mills': self.assembly.total_building_mills,
            'required_quorum_mills': self.assembly.required_quorum_mills,
            'required_quorum_percentage': float(self.assembly.required_quorum_percentage),
            'achieved_quorum_mills': self.assembly.achieved_quorum_mills,
            'achieved_quorum_percentage': float(self.assembly.quorum_percentage),
            'quorum_status': quorum_status,
            'attendees_list': attendees_list,
        }
        
        return template_text.format(**context)
    
    def _generate_attendees_list(self) -> str:
        """Δημιουργεί τη λίστα παρόντων"""
        attendees = self.assembly.attendees.filter(is_present=True).order_by('apartment__number')
        
        if not attendees.exists():
            return "*Δεν καταγράφηκαν παρόντες*"
        
        lines = ['| Διαμέρισμα | Όνομα | χιλιοστά | Τύπος |', '|------------|-------|----------|-------|']
        
        for attendee in attendees:
            attendance_type = attendee.get_attendance_type_display()
            if attendee.is_proxy:
                attendance_type += f' (εκ μέρους {attendee.proxy_from_apartment})'
            
            lines.append(
                f'| {attendee.apartment.number} | '
                f'{attendee.display_name} | '
                f'{attendee.mills} | '
                f'{attendance_type} |'
            )
        
        return '\n'.join(lines)
    
    def _generate_agenda_item(self, item: AgendaItem) -> str:
        """Δημιουργεί την ενότητα για ένα θέμα"""
        template_text = self.DEFAULT_AGENDA_ITEM
        if self.template:
            template_text = self.template.agenda_item_template
        
        # Duration
        duration = item.actual_duration or item.estimated_duration
        
        # Presenter
        presenter_line = ''
        presenter_name = item.presenter_name
        if not presenter_name and item.presenter:
            presenter_name = item.presenter.get_full_name() or item.presenter.email
        if presenter_name:
            presenter_line = f'**Εισηγητής:** {presenter_name}'
        
        # Voting results
        voting_results = ''
        if item.is_voting_item:
            voting_results = self._generate_voting_results(item)
        
        # Decision
        decision = item.decision or '-'
        if item.decision_type:
            decision_display = dict(AgendaItem._meta.get_field('decision_type').choices).get(
                item.decision_type, item.decision_type
            )
            decision = f'**{decision_display}** - {item.decision}'
        
        # Discussion notes
        discussion_notes = ''
        if item.discussion_notes:
            discussion_notes = f'\n**Σημειώσεις Συζήτησης:**\n{item.discussion_notes}\n'
        
        context = {
            'order': item.order,
            'title': item.title,
            'item_type': item.get_item_type_display(),
            'duration': duration,
            'presenter_line': presenter_line,
            'description': item.description or '-',
            'voting_results': voting_results,
            'decision': decision,
            'discussion_notes': discussion_notes,
        }
        
        return template_text.format(**context)
    
    def _generate_voting_results(self, item: AgendaItem) -> str:
        """Δημιουργεί τα αποτελέσματα ψηφοφορίας"""
        votes = item.assembly_votes.all()
        
        if not votes.exists():
            return '*Δεν καταγράφηκαν ψήφοι*'
        
        approve_votes = votes.filter(vote='approve')
        reject_votes = votes.filter(vote='reject')
        abstain_votes = votes.filter(vote='abstain')
        
        approve_mills = sum(v.mills for v in approve_votes)
        reject_mills = sum(v.mills for v in reject_votes)
        abstain_mills = sum(v.mills for v in abstain_votes)
        total_mills = approve_mills + reject_mills + abstain_mills
        
        lines = [
            '',
            '**Αποτελέσματα Ψηφοφορίας:**',
            '',
            '| Επιλογή | Ψήφοι | χιλιοστά | Ποσοστό |',
            '|---------|-------|----------|---------|',
            f'| ✅ Υπέρ | {approve_votes.count()} | {approve_mills} | {round(approve_mills * 100 / total_mills, 1) if total_mills > 0 else 0}% |',
            f'| ❌ Κατά | {reject_votes.count()} | {reject_mills} | {round(reject_mills * 100 / total_mills, 1) if total_mills > 0 else 0}% |',
            f'| ⬜ Λευκό | {abstain_votes.count()} | {abstain_mills} | {round(abstain_mills * 100 / total_mills, 1) if total_mills > 0 else 0}% |',
            f'| **Σύνολο** | **{votes.count()}** | **{total_mills}** | **100%** |',
            ''
        ]
        
        # Add pre-vote vs live vote breakdown
        pre_votes = votes.filter(vote_source='pre_vote').count()
        live_votes = votes.filter(vote_source='live').count()
        
        if pre_votes > 0 and live_votes > 0:
            lines.append(f'*Pre-voting: {pre_votes} ψήφοι | Live: {live_votes} ψήφοι*')
            lines.append('')
        
        return '\n'.join(lines)
    
    def _generate_footer(self) -> str:
        """Δημιουργεί το footer των πρακτικών"""
        template_text = self.DEFAULT_FOOTER
        if self.template:
            template_text = self.template.footer_template
        
        context = {
            'chairman_name': self.chairman_name,
            'secretary_name': self.secretary_name,
            'generated_at': timezone.now().strftime('%d/%m/%Y %H:%M'),
        }
        
        return template_text.format(**context)


class AssemblyQuorumService:
    """
    Service για υπολογισμό και tracking απαρτίας
    """
    
    def __init__(self, assembly: Assembly):
        self.assembly = assembly
    
    def calculate_quorum(self) -> dict:
        """Υπολογίζει την τρέχουσα κατάσταση απαρτίας"""
        attendees = self.assembly.attendees.filter(
            Q(is_present=True) | Q(has_pre_voted=True) | Q(votes__isnull=False)
        ).distinct()
        
        present_mills = sum(a.mills for a in attendees)
        required_mills = self.assembly.required_quorum_mills
        
        return {
            'present_mills': present_mills,
            'required_mills': required_mills,
            'percentage': round(present_mills * 100 / self.assembly.total_building_mills, 2),
            'achieved': present_mills >= required_mills,
            'missing_mills': max(0, required_mills - present_mills),
            'present_count': attendees.count()
        }
    
    def get_missing_for_quorum(self) -> list:
        """Επιστρέφει τα διαμερίσματα που λείπουν για απαρτία"""
        if self.assembly.quorum_achieved:
            return []
        
        # Get apartments not contributing to quorum yet (not present and no pre-vote/vote recorded)
        present_apartment_ids = self.assembly.attendees.filter(
            Q(is_present=True) | Q(has_pre_voted=True) | Q(votes__isnull=False)
        ).values_list('apartment_id', flat=True).distinct()
        
        from apartments.models import Apartment
        missing = Apartment.objects.filter(
            building=self.assembly.building
        ).exclude(id__in=present_apartment_ids).order_by('-mills')
        
        return list(missing[:10])  # Top 10 by mills


class AssemblyNotificationService:
    """
    Service για ειδοποιήσεις συνέλευσης
    """
    
    def __init__(self, assembly: Assembly):
        self.assembly = assembly
    
    def send_invitation(self):
        """Στέλνει πρόσκληση στους ενοίκους"""
        # TODO: Integrate with announcements module
        pass
    
    def send_reminder(self, days_before: int = 1):
        """Στέλνει υπενθύμιση"""
        # TODO: Implement reminder logic
        pass
    
    def send_pre_voting_notification(self):
        """Ειδοποίηση για pre-voting"""
        # TODO: Implement pre-voting notification
        pass
    
    def send_minutes_ready(self):
        """Ειδοποίηση ότι τα πρακτικά είναι έτοιμα"""
        # TODO: Implement minutes notification
        pass


class VoteIntegrationService:
    """
    Service για σύνδεση με το υπάρχον Votes module
    """
    
    def __init__(self, agenda_item: AgendaItem):
        self.agenda_item = agenda_item
    
    def create_linked_vote(self):
        """Δημιουργεί Vote object για το agenda item"""
        if not self.agenda_item.is_voting_item:
            return None
        
        if self.agenda_item.linked_vote:
            return self.agenda_item.linked_vote
        
        try:
            from votes.models import Vote
            from datetime import timedelta
            
            assembly = self.agenda_item.assembly
            linked_project = self.agenda_item.linked_project
            
            # Calculate dates
            # Η ψηφοφορία ξεκινά από pre_voting_start_date ή την ημέρα της συνέλευσης
            start_date = assembly.pre_voting_start_date or assembly.scheduled_date
            
            # Η ψηφοφορία λήγει 3 μέρες ΜΕΤΑ τη συνέλευση (για να καλύπτει live voting)
            # Ή χρησιμοποιεί το pre_voting_end_date αν έχει οριστεί
            end_date = assembly.pre_voting_end_date or (assembly.scheduled_date + timedelta(days=3))

            # If this agenda item is linked to a Project, reuse the existing project vote (if any)
            # instead of creating a second, duplicate vote.
            if linked_project:
                existing_vote = (
                    Vote.objects.filter(project=linked_project, building=assembly.building, agenda_item__isnull=True)
                    .order_by('-created_at')
                    .first()
                )
                if existing_vote:
                    update_fields = []
                    # Ensure the vote covers the assembly voting window (extend only; never shrink).
                    if start_date and existing_vote.start_date and existing_vote.start_date > start_date:
                        existing_vote.start_date = start_date
                        update_fields.append('start_date')
                    if end_date and (existing_vote.end_date is None or existing_vote.end_date < end_date):
                        existing_vote.end_date = end_date
                        update_fields.append('end_date')

                    quorum_percent = int(getattr(assembly, 'required_quorum_percentage', 0) or 0)
                    if quorum_percent and existing_vote.min_participation < quorum_percent:
                        existing_vote.min_participation = quorum_percent
                        update_fields.append('min_participation')

                    if existing_vote.building_id != assembly.building_id:
                        existing_vote.building = assembly.building
                        update_fields.append('building')

                    if not existing_vote.is_active:
                        existing_vote.is_active = True
                        update_fields.append('is_active')

                    if update_fields:
                        existing_vote.save(update_fields=update_fields)

                    self.agenda_item.linked_vote = existing_vote
                    self.agenda_item.save(update_fields=['linked_vote'])
                    return existing_vote
            
            vote = Vote.objects.create(
                title=f"[Συνέλευση] {self.agenda_item.title}",
                description=self.agenda_item.description or '',
                building=assembly.building,
                project=linked_project,
                start_date=start_date,
                end_date=end_date,
                creator=assembly.created_by,
                is_active=True,
                min_participation=int(assembly.required_quorum_percentage)
            )
            
            self.agenda_item.linked_vote = vote
            self.agenda_item.save(update_fields=['linked_vote'])
            
            return vote
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Failed to create linked vote: {e}")
            return None
    
    def sync_vote_results(self):
        """Συγχρονίζει τα αποτελέσματα από το Vote module στο AssemblyVote"""
        if not self.agenda_item.linked_vote:
            return
        
        from votes.models import VoteSubmission
        
        # Get submissions from the linked Vote
        submissions = VoteSubmission.objects.filter(vote=self.agenda_item.linked_vote)
        
        # Map Vote choices to Assembly choices
        choice_map = {
            'ΝΑΙ': 'approve',
            'ΟΧΙ': 'reject',
            'ΛΕΥΚΟ': 'abstain'
        }
        
        # This could sync votes from the regular Vote system to AssemblyVotes
        # Implementation depends on specific requirements
        pass
