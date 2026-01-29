from rest_framework import viewsets, permissions, status  
from rest_framework.decorators import action  
from rest_framework.response import Response  
from django.utils import timezone
from django.db.models import Q, Sum
from django.http import Http404, HttpResponse
from django.conf import settings
import logging

from .models import Vote, VoteSubmission, VoteSubmissionEvent
from .serializers import VoteSerializer, VoteSubmissionSerializer, VoteListSerializer
from core.permissions import IsManagerOrSuperuser, IsBuildingAdmin, IsOfficeManagerOrInternalManager
from core.utils import filter_queryset_by_user_and_building
from core.evidence import stable_json_bytes, sha256_hex_bytes, build_audit_root_hash, build_zip_bytes
from assemblies.services import AssemblyMinutesService

logger = logging.getLogger(__name__)


class VoteViewSet(viewsets.ModelViewSet):
    """
    CRUD για Vote + custom actions:
      - POST   /api/votes/{pk}/vote/           -> υποβολή ψήφου
      - GET    /api/votes/{pk}/my-submission/  -> η ψήφος του τρέχοντα χρήστη
      - GET    /api/votes/{pk}/results/        -> αποτελέσματα
    """
    permission_classes = [permissions.IsAuthenticated, IsBuildingAdmin]
    queryset = Vote.objects.all().order_by('-created_at')
    serializer_class = VoteSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'my_submission', 'results', 'vote', 'submit', 'verify']:
            return [permissions.IsAuthenticated()]
        # create, update, destroy: επιτρέπεται σε office managers και internal managers
        return [permissions.IsAuthenticated(), IsOfficeManagerOrInternalManager()]

    def get_queryset(self):
        """
        Φέρνει μόνο τα votes που δικαιούται να δει ο χρήστης (με βάση το κτήριο και τον ρόλο).
        """
        qs = Vote.objects.select_related('creator', 'building').order_by('-created_at')

        # IMPORTANT: Avoid evaluating the queryset here (e.g. qs.count()).
        # Any DB issue/migration mismatch would surface as a 500 *before* filtering,
        # and it also adds unnecessary load on every request.
        try:
            building_param = self.request.query_params.get('building')
            logger.info(f"[VoteViewSet.get_queryset] Building param: {building_param}")
            logger.info(
                "[VoteViewSet.get_queryset] User: %s, is_superuser: %s, is_staff: %s",
                getattr(self.request, "user", None),
                getattr(getattr(self.request, "user", None), "is_superuser", None),
                getattr(getattr(self.request, "user", None), "is_staff", None),
            )

            return filter_queryset_by_user_and_building(self.request, qs)
        except Exception:
            logger.exception("Error in VoteViewSet.get_queryset")
            # Επιστρέφουμε empty queryset για να μην εμφανίζεται 500 στο frontend
            return Vote.objects.none()

    def _get_linked_agenda_item(self, vote: Vote):
        """
        If this Vote is linked to an Assembly AgendaItem (via AgendaItem.linked_vote),
        return it. Otherwise return None.
        """
        try:
            return vote.agenda_item
        except Exception:
            return None


    def get_serializer_class(self):
        if self.action == 'list':
            return VoteListSerializer
        elif self.action in ['retrieve', 'results']:
            return VoteSerializer
        elif self.action in ['vote', 'my_submission', 'submit']:
            return VoteSubmissionSerializer
        return super().get_serializer_class()

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def perform_update(self, serializer):
        building = serializer.validated_data.get('building')
        serializer.save(building=building) if building else serializer.save()

    def perform_create(self, serializer):
        serializer.save(creator=self.request.user)

    def destroy(self, request, *args, **kwargs):
        """Override destroy to return custom confirmation message"""
        instance = self.get_object()
        title = instance.title
        is_global = instance.building is None
        
        # Store building info before deletion
        building_name = instance.building.name if instance.building else None
        
        # Perform the actual deletion
        instance.delete()
        logger.info(f"Vote deleted: {title} by {request.user}")
        
        # Return appropriate confirmation message
        if is_global:
            message = f"Η καθολική ψηφοφορία '{title}' διαγράφηκε επιτυχώς από όλα τα κτίρια."
        else:
            message = f"Η ψηφοφορία '{title}' διαγράφηκε επιτυχώς από το κτίριο '{building_name}'."
        
        return Response({"message": message}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='vote')
    def vote(self, request, pk=None):
        try:
            vote = self.get_object()
        except Http404:
            logger.warning(f"Vote {pk} not found in filtered queryset for user {request.user}")
            return Response(
                {"error": "Η ψηφοφορία δεν βρέθηκε ή δεν έχετε πρόσβαση σε αυτήν."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # 🔒 IMPORTANT: Check if user is eligible to vote.
        # A user can vote only if they own/rent at least one apartment:
        # - For building-specific votes: in that building
        # - For global votes (building=None): in any building
        from apartments.models import Apartment
        try:
            apartments_qs = Apartment.objects.filter(
                Q(owner_user=request.user) | Q(tenant_user=request.user),
            )
            if vote.building_id is not None:
                apartments_qs = apartments_qs.filter(building_id=vote.building_id)

            if not apartments_qs.exists():
                logger.warning(
                    "User %s (%s) tried to vote without apartment in building %s",
                    request.user.id,
                    request.user.email,
                    vote.building_id,
                )
                return Response(
                    {"error": "Δεν έχετε δικαίωμα ψήφου σε αυτή την ψηφοφορία. Μόνο ιδιοκτήτες ή ένοικοι διαμερισμάτων μπορούν να ψηφίσουν."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            mills = apartments_qs.aggregate(total=Sum('participation_mills')).get('total') or 0
        except Exception as e:
            logger.warning(f"Could not check apartment eligibility for user {request.user.id}: {e}")
            return Response(
                {"error": "Αδυναμία ελέγχου δικαιώματος ψήφου. Παρακαλώ δοκιμάστε ξανά."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        
        agenda_item = self._get_linked_agenda_item(vote)
        if agenda_item:
            # Linked vote: treat AssemblyVote as source of truth (per apartment).
            from assemblies.models import AssemblyAttendee, AssemblyVote, AssemblyVoteEvent
            from apartments.models import Apartment

            apartment_id = request.data.get('apartment_id')
            apartments_qs = Apartment.objects.filter(
                Q(owner_user=request.user) | Q(tenant_user=request.user),
            )
            if vote.building_id is not None:
                apartments_qs = apartments_qs.filter(building_id=vote.building_id)

            eligible_apartments = list(apartments_qs.values('id', 'number', 'participation_mills'))
            if not eligible_apartments:
                return Response(
                    {"error": "Δεν έχετε δικαίωμα ψήφου σε αυτή την ψηφοφορία. Μόνο ιδιοκτήτες ή ένοικοι διαμερισμάτων μπορούν να ψηφίσουν."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            if apartment_id is None:
                if len(eligible_apartments) == 1:
                    apartment_id = eligible_apartments[0]['id']
                else:
                    return Response(
                        {
                            "error": "Επιλέξτε διαμέρισμα για να ψηφίσετε.",
                            "eligible_apartments": eligible_apartments,
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            try:
                apartment_id_int = int(apartment_id)
            except (TypeError, ValueError):
                return Response({"error": "Μη έγκυρο apartment_id"}, status=status.HTTP_400_BAD_REQUEST)

            try:
                apartment = apartments_qs.get(id=apartment_id_int)
            except Apartment.DoesNotExist:
                return Response(
                    {"error": "Το διαμέρισμα δεν είναι επιλέξιμο για αυτή την ψηφοφορία."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            # Map VoteSubmission.choice (Greek) -> AssemblyVote.vote
            choice = request.data.get('choice')
            mapping = {'ΝΑΙ': 'approve', 'ΟΧΙ': 'reject', 'ΛΕΥΚΟ': 'abstain'}
            mapped_vote = mapping.get(choice)
            if not mapped_vote:
                return Response(
                    {"error": "Μη έγκυρη επιλογή ψήφου."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            assembly = agenda_item.assembly
            is_manager = request.user.is_superuser or (
                hasattr(request.user, 'role')
                and request.user.role in ['admin', 'manager', 'office_staff', 'internal_manager']
            )

            if assembly.status == 'in_progress':
                vote_source = 'live'
            elif assembly.is_pre_voting_active:
                vote_source = 'pre_vote'
            else:
                return Response(
                    {"error": "Η ψηφοφορία δεν είναι ενεργή αυτή τη στιγμή"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            attendee, _ = AssemblyAttendee.objects.get_or_create(
                assembly=assembly,
                apartment=apartment,
                defaults={
                    'user': request.user,
                    'mills': getattr(apartment, 'participation_mills', 0) or 0,
                },
            )
            if attendee.user_id is None:
                attendee.user = request.user
                attendee.save(update_fields=['user'])

            mills_value = getattr(apartment, 'participation_mills', 0) or attendee.mills or 0
            existing_vote = AssemblyVote.objects.filter(
                agenda_item=agenda_item, attendee=attendee
            ).first()

            if existing_vote:
                allow_update = False
                if vote_source == 'pre_vote':
                    allow_update = True
                elif assembly.status == 'in_progress' and (is_manager or attendee.user_id == request.user.id):
                    allow_update = True

                if not allow_update:
                    return Response(
                        {"error": "Έχει ήδη καταχωρηθεί ψήφος για αυτό το διαμέρισμα."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                old_vote = existing_vote.vote
                existing_vote.vote = mapped_vote
                existing_vote.vote_source = vote_source
                existing_vote.mills = mills_value
                existing_vote.voted_by = request.user if is_manager and attendee.user_id != request.user.id else None
                existing_vote.notes = f"Αλλαγή από {old_vote} μέσω Ψηφοφοριών"
                existing_vote.voted_at = timezone.now()
                existing_vote.save(update_fields=['vote', 'vote_source', 'mills', 'voted_by', 'notes', 'voted_at'])

                prev_event = existing_vote.last_event
                event = AssemblyVoteEvent.objects.create(
                    assembly_vote=existing_vote,
                    agenda_item=agenda_item,
                    attendee=attendee,
                    vote=existing_vote.vote,
                    mills=existing_vote.mills,
                    vote_source=existing_vote.vote_source,
                    previous_event=prev_event,
                    actor_user=request.user,
                    notes=existing_vote.notes or '',
                )
                existing_vote.last_event = event
                existing_vote.save(update_fields=['last_event'])

                return Response(
                    {
                        "ok": True,
                        "vote": vote.id,
                        "choice": choice,
                        "apartment_id": apartment.id,
                        "apartment_number": apartment.number,
                        "mills": mills_value,
                        "vote_source": vote_source,
                        "submitted_at": existing_vote.voted_at,
                        "updated": True,
                        "previous_vote": old_vote,
                        "receipt_id": str(event.receipt_id),
                    },
                    status=status.HTTP_200_OK,
                )

            av = AssemblyVote.objects.create(
                agenda_item=agenda_item,
                attendee=attendee,
                vote=mapped_vote,
                mills=mills_value,
                vote_source=vote_source,
                voted_by=request.user if is_manager and attendee.user_id != request.user.id else None,
                notes='Ψήφος μέσω Ψηφοφοριών',
            )

            event = AssemblyVoteEvent.objects.create(
                assembly_vote=av,
                agenda_item=agenda_item,
                attendee=attendee,
                vote=av.vote,
                mills=av.mills,
                vote_source=av.vote_source,
                actor_user=request.user,
                notes=av.notes or '',
            )
            av.last_event = event
            av.save(update_fields=['last_event'])

            if vote_source == 'pre_vote':
                attendee.has_pre_voted = True
                attendee.pre_voted_at = timezone.now()
                attendee.save(update_fields=['has_pre_voted', 'pre_voted_at'])

            # Response compatible with the existing frontend expectations
            return Response(
                {
                    "ok": True,
                    "vote": vote.id,
                    "choice": choice,
                    "apartment_id": apartment.id,
                    "apartment_number": apartment.number,
                    "mills": mills_value,
                    "vote_source": vote_source,
                    "submitted_at": av.voted_at,
                    "receipt_id": str(event.receipt_id),
                },
                status=status.HTTP_201_CREATED,
            )

        # Standalone vote: last-vote-wins (update allowed within window)
        serializer = VoteSubmissionSerializer(
            data=request.data,
            context={'request': request, 'vote': vote}
        )
        serializer.is_valid(raise_exception=True)

        logger.info(f"User {request.user.id} voting with {mills} total mills")

        submission = VoteSubmission.objects.filter(vote=vote, user=request.user).first()
        created = False
        now = timezone.now()
        requested_source = serializer.validated_data.get('vote_source')
        if submission:
            submission.choice = serializer.validated_data['choice']
            submission.mills = mills
            if requested_source:
                submission.vote_source = requested_source
            submission.last_submitted_at = now
            submission.save(update_fields=['choice', 'mills', 'vote_source', 'last_submitted_at', 'updated_at'])
        else:
            submission = VoteSubmission.objects.create(
                vote=vote,
                user=request.user,
                choice=serializer.validated_data['choice'],
                vote_source=requested_source or 'app',
                mills=mills,
                last_submitted_at=now,
            )
            created = True

        prev_event = submission.last_event
        event = VoteSubmissionEvent.objects.create(
            vote_submission=submission,
            vote=vote,
            user=request.user,
            actor_user=request.user,
            choice=submission.choice,
            mills=submission.mills,
            vote_source=submission.vote_source,
            previous_event=prev_event,
        )
        submission.last_event = event
        submission.save(update_fields=['last_event'])

        response_payload = VoteSubmissionSerializer(submission).data
        response_payload['updated'] = not created
        response_payload['receipt_id'] = str(event.receipt_id)
        return Response(
            response_payload,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )

    @action(detail=True, methods=['post'], url_path='submit')
    def submit(self, request, pk=None):
        """Alias for vote action - used by frontend"""
        return self.vote(request, pk)

    @action(detail=True, methods=['get'], url_path='my-submission')
    def my_submission(self, request, pk=None):
        try:
            vote = self.get_object()
        except Http404:
            logger.warning(f"Vote {pk} not found in filtered queryset for user {request.user}")
            return Response(
                {"error": "Η ψηφοφορία δεν βρέθηκε ή δεν έχετε πρόσβαση σε αυτήν."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        agenda_item = self._get_linked_agenda_item(vote)
        if agenda_item:
            from apartments.models import Apartment
            from assemblies.models import AssemblyAttendee, AssemblyVote

            apartments_qs = Apartment.objects.filter(
                Q(owner_user=request.user) | Q(tenant_user=request.user),
            )
            if vote.building_id is not None:
                apartments_qs = apartments_qs.filter(building_id=vote.building_id)

            apartments = list(apartments_qs.values('id', 'number', 'participation_mills'))
            if not apartments:
                return Response({"linked": True, "submissions": []}, status=status.HTTP_200_OK)

            # Build per-apartment vote status from AssemblyVote
            attendee_by_apartment = {
                a['apartment_id']: a['id']
                for a in AssemblyAttendee.objects.filter(
                    assembly=agenda_item.assembly,
                    apartment_id__in=[ap['id'] for ap in apartments],
                ).values('id', 'apartment_id')
            }
            votes = AssemblyVote.objects.filter(
                agenda_item=agenda_item,
                attendee_id__in=list(attendee_by_apartment.values()),
            ).select_related('attendee', 'attendee__apartment', 'last_event')

            vote_map = {v.attendee.apartment_id: v for v in votes}
            reverse_mapping = {'approve': 'ΝΑΙ', 'reject': 'ΟΧΙ', 'abstain': 'ΛΕΥΚΟ'}

            submissions = []
            for ap in apartments:
                v = vote_map.get(ap['id'])
                submissions.append(
                    {
                        "apartment_id": ap['id'],
                        "apartment_number": ap['number'],
                        "mills": ap.get('participation_mills') or 0,
                        "choice": reverse_mapping.get(getattr(v, 'vote', None)) if v else None,
                        "vote_source": getattr(v, 'vote_source', None) if v else None,
                        "submitted_at": getattr(v, 'voted_at', None) if v else None,
                        "receipt_id": str(getattr(getattr(v, 'last_event', None), 'receipt_id', None)) if v and getattr(v, 'last_event', None) else None,
                    }
                )

            return Response(
                {
                    "linked": True,
                    "submissions": submissions,
                },
                status=status.HTTP_200_OK,
            )

        # Standalone vote (legacy): keep existing behavior
        try:
            sub = VoteSubmission.objects.get(vote=vote, user=request.user)
            ser = VoteSubmissionSerializer(sub)
            return Response(ser.data)
        except VoteSubmission.DoesNotExist:
            return Response({"id": None, "choice": None}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='context')
    def context(self, request, pk=None):
        """Returns Assembly/AgendaItem context for linked votes."""
        try:
            vote = self.get_object()
        except Http404:
            return Response({"error": "Η ψηφοφορία δεν βρέθηκε."}, status=status.HTTP_404_NOT_FOUND)

        agenda_item = self._get_linked_agenda_item(vote)
        if not agenda_item:
            return Response({"linked": False, "vote_id": vote.id}, status=status.HTTP_200_OK)

        assembly = agenda_item.assembly
        return Response(
            {
                "linked": True,
                "vote_id": vote.id,
                "agenda_item": {
                    "id": str(agenda_item.id),
                    "title": agenda_item.title,
                    "order": agenda_item.order,
                    "item_type": agenda_item.item_type,
                    "status": agenda_item.status,
                    "estimated_duration": agenda_item.estimated_duration,
                },
                "assembly": {
                    "id": str(assembly.id),
                    "title": assembly.title,
                    "building": assembly.building_id,
                    "building_name": getattr(assembly.building, 'name', '') if getattr(assembly, 'building', None) else '',
                    "scheduled_date": assembly.scheduled_date,
                    "scheduled_time": assembly.scheduled_time,
                    "status": assembly.status,
                    "is_pre_voting_active": assembly.is_pre_voting_active,
                },
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=['get'], url_path='results')
    def results(self, request, pk=None):
        """Αποτελέσματα ψηφοφορίας με επιπλέον πληροφορίες"""
        try:
            vote = self.get_object()
            results = vote.get_results()
            results['min_participation'] = vote.min_participation
            return Response(results)
        except Http404:
            # Το vote δεν βρέθηκε στο filtered queryset (πιθανώς δεν έχει πρόσβαση ο χρήστης)
            logger.warning(f"Vote {pk} not found in filtered queryset for user {request.user}")
            return Response(
                {"error": "Η ψηφοφορία δεν βρέθηκε ή δεν έχετε πρόσβαση σε αυτήν."},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception:
            logger.exception("Error fetching vote results")
            return Response(
                {"error": "Αποτυχία φόρτωσης αποτελεσμάτων"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'], url_path='evidence-package')
    def evidence_package(self, request, pk=None):
        """Evidence package (zip) για standalone ψηφοφορία"""
        try:
            vote = self.get_object()
        except Http404:
            return Response(
                {"error": "Η ψηφοφορία δεν βρέθηκε ή δεν έχετε πρόσβαση."},
                status=status.HTTP_404_NOT_FOUND,
            )

        results = vote.get_results()
        generated_at = timezone.now().isoformat()

        results_payload = {
            "generated_at": generated_at,
            "vote": {
                "id": vote.id,
                "title": vote.title,
                "description": vote.description,
                "building_id": vote.building_id,
                "building_name": vote.building.name if vote.building else None,
                "start_date": str(vote.start_date) if vote.start_date else None,
                "end_date": str(vote.end_date) if vote.end_date else None,
                "is_active": vote.is_active,
                "is_urgent": vote.is_urgent,
                "min_participation": vote.min_participation,
            },
            "results": results,
        }

        results_bytes = stable_json_bytes(results_payload)
        results_hash = sha256_hex_bytes(results_bytes)

        events_qs = (
            VoteSubmissionEvent.objects.filter(vote=vote)
            .select_related('previous_event')
            .order_by('submitted_at', 'id')
        )
        events = []
        computed_hashes = {}
        for ev in events_qs:
            prev_hash = ev.prev_hash or ''
            if not prev_hash and ev.previous_event_id:
                prev_hash = (
                    computed_hashes.get(ev.previous_event_id)
                    or (ev.previous_event.event_hash if ev.previous_event else '')
                    or ''
                )
            event_hash = ev.event_hash or ev._compute_hash(prev_hash)
            computed_hashes[ev.id] = event_hash
            events.append({
                "id": str(ev.id),
                "vote_id": ev.vote_id,
                "vote_submission_id": ev.vote_submission_id,
                "user_id": ev.user_id,
                "actor_user_id": ev.actor_user_id,
                "choice": ev.choice,
                "mills": ev.mills,
                "vote_source": ev.vote_source,
                "submitted_at": ev.submitted_at.isoformat() if ev.submitted_at else None,
                "receipt_id": str(ev.receipt_id),
                "previous_event_id": str(ev.previous_event_id) if ev.previous_event_id else None,
                "prev_hash": ev.prev_hash or prev_hash,
                "event_hash": ev.event_hash or event_hash,
            })

        audit_root_hash = build_audit_root_hash([e["event_hash"] for e in events])
        audit_lines = [stable_json_bytes(e).decode("utf-8") for e in events]
        audit_bytes = ("\n".join(audit_lines)).encode("utf-8")

        base_url = (getattr(settings, 'FRONTEND_URL', '') or '').rstrip('/')
        verify_url = ''
        if base_url:
            verify_url = (
                f"{base_url}/verify-evidence?type=vote&id={vote.id}"
                f"&results_hash={results_hash}&audit_root_hash={audit_root_hash}"
            )

        summary_lines = [
            "# Vote Summary",
            f"Title: {vote.title}",
            f"Building: {vote.building.name if vote.building else 'All buildings'}",
            f"Start Date: {vote.start_date}",
            f"End Date: {vote.end_date}",
            f"Generated At: {generated_at}",
        ]
        if verify_url:
            summary_lines.extend([
                "",
                "## Verify",
                f"Verify URL: {verify_url}",
            ])
        summary_lines.extend([
            "",
            "## Results",
            f"Total Votes: {results.get('total')}",
            f"Total Mills Voted: {results.get('total_mills_voted')}",
            f"Participation %: {results.get('participation_percentage')}",
            "",
            "### By Choice",
            f"- YES: {results.get('ΝΑΙ')} (mills: {results.get('mills', {}).get('ΝΑΙ', 0)})",
            f"- NO: {results.get('ΟΧΙ')} (mills: {results.get('mills', {}).get('ΟΧΙ', 0)})",
            f"- ABSTAIN: {results.get('ΛΕΥΚΟ')} (mills: {results.get('mills', {}).get('ΛΕΥΚΟ', 0)})",
        ])
        summary_md = "\n".join(str(line) for line in summary_lines)
        summary_bytes = summary_md.encode("utf-8")

        files = [
            ("results.json", results_bytes),
            ("audit.jsonl", audit_bytes),
            ("results_hash.txt", results_hash.encode("utf-8")),
            ("audit_root_hash.txt", audit_root_hash.encode("utf-8")),
            ("praktiko.md", summary_bytes),
            ("verify_url.txt", verify_url.encode("utf-8")) if verify_url else None,
            ("manifest.json", stable_json_bytes({
                "generated_at": generated_at,
                "results_hash": results_hash,
                "audit_root_hash": audit_root_hash,
                "events_count": len(events),
                "verify_url": verify_url or None,
            })),
        ]
        files = [f for f in files if f is not None]

        try:
            pdf_bytes = AssemblyMinutesService.render_markdown_to_pdf(summary_md)
            files.append(("praktiko.pdf", pdf_bytes))
        except Exception:
            # If PDF generation fails, keep the markdown only.
            pass

        zip_bytes = build_zip_bytes(files)
        response = HttpResponse(zip_bytes, content_type="application/zip")
        filename = f"vote_evidence_{vote.id}.zip"
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response

    @action(detail=True, methods=['get'], url_path='verify')
    def verify(self, request, pk=None):
        """Υπολογίζει hashes για επαλήθευση πρακτικού"""
        try:
            vote = self.get_object()
        except Http404:
            return Response(
                {"error": "Η ψηφοφορία δεν βρέθηκε ή δεν έχετε πρόσβαση."},
                status=status.HTTP_404_NOT_FOUND,
            )

        results = vote.get_results()
        generated_at = timezone.now().isoformat()
        results_payload = {
            "generated_at": generated_at,
            "vote": {
                "id": vote.id,
                "title": vote.title,
                "description": vote.description,
                "building_id": vote.building_id,
                "building_name": vote.building.name if vote.building else None,
                "start_date": str(vote.start_date) if vote.start_date else None,
                "end_date": str(vote.end_date) if vote.end_date else None,
                "is_active": vote.is_active,
                "is_urgent": vote.is_urgent,
                "min_participation": vote.min_participation,
            },
            "results": results,
        }

        results_bytes = stable_json_bytes(results_payload)
        results_hash = sha256_hex_bytes(results_bytes)

        events_qs = (
            VoteSubmissionEvent.objects.filter(vote=vote)
            .select_related('previous_event')
            .order_by('submitted_at', 'id')
        )
        computed_hashes = {}
        event_hashes = []
        for ev in events_qs:
            prev_hash = ev.prev_hash or ''
            if not prev_hash and ev.previous_event_id:
                prev_hash = (
                    computed_hashes.get(ev.previous_event_id)
                    or (ev.previous_event.event_hash if ev.previous_event else '')
                    or ''
                )
            event_hash = ev.event_hash or ev._compute_hash(prev_hash)
            computed_hashes[ev.id] = event_hash
            event_hashes.append(event_hash)

        audit_root_hash = build_audit_root_hash(event_hashes)
        base_url = (getattr(settings, 'FRONTEND_URL', '') or '').rstrip('/')
        verify_url = ''
        if base_url:
            verify_url = (
                f"{base_url}/verify-evidence?type=vote&id={vote.id}"
                f"&results_hash={results_hash}&audit_root_hash={audit_root_hash}"
            )

        return Response({
            "generated_at": generated_at,
            "vote_id": vote.id,
            "results_hash": results_hash,
            "audit_root_hash": audit_root_hash,
            "events_count": len(event_hashes),
            "verify_url": verify_url or None,
        })

    @action(detail=False, methods=['get'], url_path='active')
    def active(self, request):
        """Ενεργές ψηφοφορίες"""
        try:
            today = timezone.now().date()
            qs = self.get_queryset().filter(
                is_active=True
            ).filter(
                Q(start_date__lte=today) | Q(start_date__isnull=True)
            ).filter(
                Q(end_date__gte=today) | Q(end_date__isnull=True)
            )
            serializer = self.get_serializer(qs, many=True)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Error fetching active votes: {e}")
            return Response(
                {"error": "Αποτυχία φόρτωσης ενεργών ψηφοφοριών"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], url_path='urgent')
    def urgent(self, request):
        """Επείγουσες ψηφοφορίες"""
        try:
            qs = self.get_queryset().filter(
                is_urgent=True,
                is_active=True
            )
            serializer = self.get_serializer(qs, many=True)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Error fetching urgent votes: {e}")
            return Response(
                {"error": "Αποτυχία φόρτωσης επείγουσων ψηφοφοριών"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], url_path='activate')
    def activate(self, request, pk=None):
        """Ενεργοποίηση ψηφοφορίας"""
        try:
            vote = self.get_object()
        except Http404:
            logger.warning(f"Vote {pk} not found in filtered queryset for user {request.user}")
            return Response(
                {"error": "Η ψηφοφορία δεν βρέθηκε ή δεν έχετε πρόσβαση σε αυτήν."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        vote.is_active = True
        vote.save()
        logger.info(f"Vote activated: {vote.title} by {request.user}")
        return Response({"message": "Η ψηφοφορία ενεργοποιήθηκε επιτυχώς"})

    @action(detail=True, methods=['post'], url_path='deactivate')
    def deactivate(self, request, pk=None):
        """Απενεργοποίηση ψηφοφορίας"""
        try:
            vote = self.get_object()
        except Http404:
            logger.warning(f"Vote {pk} not found in filtered queryset for user {request.user}")
            return Response(
                {"error": "Η ψηφοφορία δεν βρέθηκε ή δεν έχετε πρόσβαση σε αυτήν."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        vote.is_active = False
        vote.save()
        logger.info(f"Vote deactivated: {vote.title} by {request.user}")
        return Response({"message": "Η ψηφοφορία απενεργοποιήθηκε επιτυχώς"})
