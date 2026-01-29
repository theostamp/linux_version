# backend/votes/models.py
from django.db import models 
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils import timezone
from buildings.models import Building
import uuid
import hashlib

class Vote(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField()
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True, help_text="Ενεργή ψηφοφορία")
    is_urgent = models.BooleanField(default=False, help_text="Επείγουσα ψηφοφορία")
    min_participation = models.IntegerField(
        default=0, 
        help_text="Ελάχιστο ποσοστό συμμετοχής για έγκυρα αποτελέσματα (%)"
    )

    building = models.ForeignKey(
        Building, 
        on_delete=models.CASCADE, 
        related_name='votes',
        null=True,
        blank=True,
        help_text="Αφήστε κενό για ψηφοφορία σε όλα τα κτίρια"
    )
    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_votes'
    )
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        related_name='votes',
        null=True,
        blank=True,
        help_text="Σύνδεση με έργο - διαγράφεται αυτόματα όταν διαγραφεί το έργο"
    )

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Ψηφοφορία"
        verbose_name_plural = "Ψηφοφορίες"

    def __str__(self):
        building_name = self.building.name if self.building else "Όλα τα κτίρια"
        return f"{self.title} ({building_name})"

    def clean(self):
        """Validation για τις ημερομηνίες"""
        if self.start_date and self.end_date and self.start_date > self.end_date:
            raise ValidationError("Η ημερομηνία έναρξης δεν μπορεί να είναι μετά την ημερομηνία λήξης")
        
        if self.min_participation < 0 or self.min_participation > 100:
            raise ValidationError("Το ελάχιστο ποσοστό συμμετοχής πρέπει να είναι μεταξύ 0-100%")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def _get_linked_agenda_item(self):
        """
        If this Vote is linked to an Assembly AgendaItem (via AgendaItem.linked_vote),
        return it. Otherwise return None.
        """
        try:
            return self.agenda_item
        except Exception:
            return None

    @property
    def is_currently_active(self):
        """Ελέγχει αν η ψηφοφορία είναι ενεργή αυτή τη στιγμή"""
        agenda_item = self._get_linked_agenda_item()
        if agenda_item:
            try:
                assembly = agenda_item.assembly
                return bool(self.is_active and (assembly.status == 'in_progress' or assembly.is_pre_voting_active))
            except Exception:
                return False

        today = timezone.now().date()
        if self.end_date:
            return self.start_date <= today <= self.end_date and self.is_active
        return self.start_date <= today and self.is_active

    @property
    def days_remaining(self):
        """Επιστρέφει τις ημέρες που απομένουν μέχρι τη λήξη"""
        if not self.end_date:
            return None
        today = timezone.now().date()
        if today > self.end_date:
            return 0
        return (self.end_date - today).days

    @property
    def total_votes(self):
        """Συνολικός αριθμός ψήφων"""
        agenda_item = self._get_linked_agenda_item()
        if agenda_item:
            try:
                from assemblies.models import AssemblyVote
                return AssemblyVote.objects.filter(agenda_item=agenda_item).count()
            except Exception:
                return 0
        return self.submissions.count()

    @property
    def total_mills_voted(self):
        """Συνολικά χιλιοστά που έχουν ψηφίσει"""
        from django.db.models import Sum
        agenda_item = self._get_linked_agenda_item()
        if agenda_item:
            try:
                from assemblies.models import AssemblyVote
                return (
                    AssemblyVote.objects.filter(agenda_item=agenda_item).aggregate(total=Sum('mills'))['total']
                    or 0
                )
            except Exception:
                return 0
        return self.submissions.aggregate(total=Sum('mills'))['total'] or 0
    
    @property
    def total_building_mills(self):
        """Συνολικά χιλιοστά κτιρίου"""
        agenda_item = self._get_linked_agenda_item()
        if agenda_item:
            try:
                return int(getattr(agenda_item.assembly, 'total_building_mills', 0) or 0) or self._get_total_building_mills()
            except Exception:
                return self._get_total_building_mills()
        return self._get_total_building_mills()
    
    @property
    def participation_percentage(self):
        """Ποσοστό συμμετοχής βάσει χιλιοστών"""
        total_mills = self._get_total_building_mills()
        
        if total_mills == 0:
            return 0
        return round((self.total_mills_voted / total_mills) * 100, 1)
    
    @property
    def eligible_voters_count(self):
        """Αριθμός δικαιούχων ψήφου (διαμερίσματα)"""
        agenda_item = self._get_linked_agenda_item()
        if agenda_item:
            try:
                return agenda_item.assembly.attendees.count()
            except Exception:
                return 0
        return self._get_eligible_voters_count()
    
    def _get_total_building_mills(self):
        """
        Υπολογίζει τα συνολικά χιλιοστά του κτιρίου.
        """
        if self.building is None:
            # For global votes, sum all mills from all apartments
            from apartments.models import Apartment
            from django.db.models import Sum
            return Apartment.objects.aggregate(total=Sum('participation_mills'))['total'] or 1000
        
        # Try to sum participation_mills from apartments
        try:
            from apartments.models import Apartment
            from django.db.models import Sum
            total = Apartment.objects.filter(
                building=self.building
            ).aggregate(total=Sum('participation_mills'))['total']
            if total and total > 0:
                return total
        except Exception:
            pass
        
        # Fallback to 1000 (standard building mills)
        return 1000
    
    def _get_eligible_voters_count(self):
        """
        Υπολογίζει τους δικαιούχους ψήφου (αριθμός διαμερισμάτων).
        """
        if self.building is None:
            from apartments.models import Apartment
            return Apartment.objects.count()
        
        try:
            apartment_count = self.building.apartments.count()
            if apartment_count > 0:
                return apartment_count
        except Exception:
            pass
        
        if hasattr(self.building, 'apartments_count') and self.building.apartments_count > 0:
            return self.building.apartments_count
        
        return 0

    @property
    def is_valid_result(self):
        """Ελέγχει αν τα αποτελέσματα είναι έγκυρα βάσει ελάχιστης συμμετοχής"""
        return self.participation_percentage >= self.min_participation

    @property
    def status_display(self):
        """Επιστρέφει την κατάσταση της ψηφοφορίας σε ανάγνωση"""
        if self.is_urgent:
            return "🚨 Επείγουσα"
        elif self.is_currently_active:
            return "✅ Ενεργή"
        elif self.is_active:
            return "📢 Ανοιχτή"
        else:
            return "🔒 Κλειστή"

    def get_results(self):
        """Επιστρέφει τα αποτελέσματα της ψηφοφορίας με breakdown ανά πηγή"""
        from django.db.models import Sum
        
        results = {}

        agenda_item = self._get_linked_agenda_item()
        if agenda_item:
            # Linked vote: compute results from AssemblyVote (one per apartment/attendee)
            from django.db.models import Count
            from assemblies.models import AssemblyVote

            mapping = {'approve': 'ΝΑΙ', 'reject': 'ΟΧΙ', 'abstain': 'ΛΕΥΚΟ'}

            vote_qs = AssemblyVote.objects.filter(agenda_item=agenda_item)
            grouped = vote_qs.values('vote').annotate(count=Count('id'), mills=Sum('mills'))
            counts_by_choice = {'ΝΑΙ': 0, 'ΟΧΙ': 0, 'ΛΕΥΚΟ': 0}
            mills_by_choice = {'ΝΑΙ': 0, 'ΟΧΙ': 0, 'ΛΕΥΚΟ': 0}

            for row in grouped:
                greek = mapping.get(row.get('vote'))
                if not greek:
                    continue
                counts_by_choice[greek] = int(row.get('count') or 0)
                mills_by_choice[greek] = int(row.get('mills') or 0)

            for choice, _ in VoteSubmission.CHOICES:
                results[choice] = counts_by_choice.get(choice, 0)

            results['mills'] = {}
            for choice, _ in VoteSubmission.CHOICES:
                results['mills'][choice] = mills_by_choice.get(choice, 0)

            results['total'] = self.total_votes
            results['total_mills_voted'] = self.total_mills_voted
            results['total_building_mills'] = self.total_building_mills
            results['eligible_voters'] = self.eligible_voters_count
            results['participation_percentage'] = self.participation_percentage
            results['is_valid'] = self.is_valid_result

            total_bld_mills = self.total_building_mills or 1
            results['percentages_by_mills'] = {}
            for choice, _ in VoteSubmission.CHOICES:
                choice_mills = results['mills'].get(choice, 0)
                results['percentages_by_mills'][choice] = round((choice_mills / total_bld_mills) * 100, 1)

            results['by_source'] = {
                'electronic': vote_qs.filter(vote_source='pre_vote').count(),
                'physical': vote_qs.filter(vote_source='live').count(),
                'proxy': vote_qs.filter(vote_source='proxy').count(),
            }
            results['mills_by_source'] = {
                'electronic': vote_qs.filter(vote_source='pre_vote').aggregate(total=Sum('mills'))['total'] or 0,
                'physical': vote_qs.filter(vote_source='live').aggregate(total=Sum('mills'))['total'] or 0,
                'proxy': vote_qs.filter(vote_source='proxy').aggregate(total=Sum('mills'))['total'] or 0,
            }
            results['source_details'] = {
                'pre_vote': vote_qs.filter(vote_source='pre_vote').count(),
                'live': vote_qs.filter(vote_source='live').count(),
                'proxy': vote_qs.filter(vote_source='proxy').count(),
            }

            return results
        
        # Vote counts
        for choice, _ in VoteSubmission.CHOICES:
            results[choice] = self.submissions.filter(choice=choice).count()
        
        # Mills per choice
        results['mills'] = {}
        for choice, _ in VoteSubmission.CHOICES:
            mills = self.submissions.filter(choice=choice).aggregate(total=Sum('mills'))['total'] or 0
            results['mills'][choice] = mills
        
        results['total'] = self.total_votes
        results['total_mills_voted'] = self.total_mills_voted
        results['total_building_mills'] = self.total_building_mills
        results['eligible_voters'] = self.eligible_voters_count
        results['participation_percentage'] = self.participation_percentage
        results['is_valid'] = self.is_valid_result
        
        # Percentages by mills (not count)
        total_bld_mills = self.total_building_mills or 1
        results['percentages_by_mills'] = {}
        for choice, _ in VoteSubmission.CHOICES:
            choice_mills = results['mills'].get(choice, 0)
            results['percentages_by_mills'][choice] = round((choice_mills / total_bld_mills) * 100, 1)
        
        # Breakdown by vote source
        results['by_source'] = {
            'electronic': self.submissions.filter(vote_source__in=['app', 'email', 'pre_vote']).count(),
            'physical': self.submissions.filter(vote_source='live').count(),
            'proxy': self.submissions.filter(vote_source='proxy').count(),
        }
        
        # Mills by source
        results['mills_by_source'] = {
            'electronic': self.submissions.filter(vote_source__in=['app', 'email', 'pre_vote']).aggregate(total=Sum('mills'))['total'] or 0,
            'physical': self.submissions.filter(vote_source='live').aggregate(total=Sum('mills'))['total'] or 0,
            'proxy': self.submissions.filter(vote_source='proxy').aggregate(total=Sum('mills'))['total'] or 0,
        }
        
        # Detailed breakdown
        results['source_details'] = {
            'app': self.submissions.filter(vote_source='app').count(),
            'email': self.submissions.filter(vote_source='email').count(),
            'pre_vote': self.submissions.filter(vote_source='pre_vote').count(),
            'live': self.submissions.filter(vote_source='live').count(),
            'proxy': self.submissions.filter(vote_source='proxy').count(),
        }
        
        return results

    def get_absolute_url(self):
        """URL για την προβολή της ψηφοφορίας"""
        from django.urls import reverse
        return reverse('vote-detail', kwargs={'pk': self.pk})


class VoteSubmission(models.Model):
    CHOICES = [
        ("ΝΑΙ", "ΝΑΙ"),
        ("ΟΧΙ", "ΟΧΙ"),
        ("ΛΕΥΚΟ", "ΛΕΥΚΟ"),
    ]
    
    SOURCE_CHOICES = [
        ('app', 'Εφαρμογή'),
        ('email', 'Email Link'),
        ('pre_vote', 'Ηλεκτρονικά (Pre-voting)'),
        ('live', 'Φυσική Παρουσία'),
        ('proxy', 'Εξουσιοδότηση'),
    ]

    vote = models.ForeignKey(Vote, on_delete=models.CASCADE, related_name='submissions')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    choice = models.CharField(max_length=50, choices=CHOICES)
    mills = models.PositiveIntegerField(
        default=0,
        verbose_name="Χιλιοστά",
        help_text="Χιλιοστά συμμετοχής του διαμερίσματος"
    )
    vote_source = models.CharField(
        max_length=20, 
        choices=SOURCE_CHOICES, 
        default='app',
        verbose_name="Τρόπος Ψηφοφορίας"
    )
    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_submitted_at = models.DateTimeField(null=True, blank=True)
    last_event = models.ForeignKey(
        'VoteSubmissionEvent',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='+'
    )

    class Meta:
        unique_together = ('vote', 'user')
        ordering = ['-submitted_at']
        verbose_name = "Ψήφος"
        verbose_name_plural = "Ψήφοι"

    def __str__(self):
        return f'{self.user} ➜ {self.choice}'

    def clean(self):
        """Validation για την ψήφο"""
        if not self.vote.is_currently_active:
            raise ValidationError("Η ψηφοφορία δεν είναι ενεργή αυτή τη στιγμή")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)


class VoteSubmissionEvent(models.Model):
    """
    Append-only ιστορικό υποβολών για last-vote-wins.
    Κρατάει receipt και chain για audit.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vote_submission = models.ForeignKey(
        VoteSubmission,
        on_delete=models.CASCADE,
        related_name='events'
    )
    vote = models.ForeignKey(
        Vote,
        on_delete=models.CASCADE,
        related_name='submission_events'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='vote_submission_events'
    )
    actor_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='vote_submission_actor_events'
    )
    choice = models.CharField(max_length=50, choices=VoteSubmission.CHOICES)
    mills = models.PositiveIntegerField(default=0)
    vote_source = models.CharField(max_length=20, choices=VoteSubmission.SOURCE_CHOICES, default='app')
    submitted_at = models.DateTimeField(auto_now_add=True)
    receipt_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    previous_event = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='next_events'
    )
    prev_hash = models.CharField(max_length=64, blank=True)
    event_hash = models.CharField(max_length=64, blank=True, db_index=True)

    class Meta:
        ordering = ['-submitted_at']
        verbose_name = "Ιστορικό Υποβολής Ψήφου"
        verbose_name_plural = "Ιστορικό Υποβολών Ψήφων"

    def _compute_hash(self, prev_hash: str) -> str:
        parts = [
            str(self.id),
            str(self.vote_id or ''),
            str(self.vote_submission_id or ''),
            str(self.user_id or ''),
            str(self.actor_user_id or ''),
            str(self.choice),
            str(self.mills),
            str(self.vote_source),
            self.submitted_at.isoformat() if self.submitted_at else '',
            str(self.receipt_id),
            prev_hash or '',
        ]
        payload = '|'.join(parts)
        return hashlib.sha256(payload.encode('utf-8')).hexdigest()

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if not self.event_hash:
            prev_hash = self.previous_event.event_hash if self.previous_event else ''
            digest = self._compute_hash(prev_hash)
            updates = []
            if self.prev_hash != prev_hash:
                self.prev_hash = prev_hash
                updates.append('prev_hash')
            if self.event_hash != digest:
                self.event_hash = digest
                updates.append('event_hash')
            if updates:
                super().save(update_fields=updates)
