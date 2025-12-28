# Οδηγός Cleanup για Orphaned VoteSubmissions

## Επισκόπηση

Για **linked votes** (votes που είναι συνδεδεμένα με Assembly AgendaItem), οι ψήφοι πρέπει να είναι στο `AssemblyVote` (canonical source), όχι στο `VoteSubmission`.

Αυτό το cleanup command βρίσκει και διαχειρίζεται:
1. **Orphaned VoteSubmissions**: VoteSubmissions για linked votes που δεν έχουν αντίστοιχο `AssemblyVote`
2. **Redundant VoteSubmissions**: VoteSubmissions που έχουν ήδη `AssemblyVote` (duplicate)

## Χρήση

### 1. Dry Run (Προεπισκόπηση)

```bash
python manage.py cleanup_orphaned_vote_submissions --dry-run
```

Εμφανίζει όλα τα orphaned VoteSubmissions χωρίς να κάνει αλλαγές.

### 2. Sync VoteSubmission → AssemblyVote

```bash
python manage.py cleanup_orphaned_vote_submissions --sync-only
```

Συγχρονίζει VoteSubmissions που δεν έχουν αντίστοιχο `AssemblyVote` στο `AssemblyVote` (χρησιμοποιεί `VoteIntegrationService`).

### 3. Delete Orphaned VoteSubmissions

```bash
python manage.py cleanup_orphaned_vote_submissions --delete
```

Διαγράφει orphaned VoteSubmissions (αυτά που έχουν ήδη `AssemblyVote` ή δεν μπορούν να sync).

### 4. Dry Run + Delete

```bash
python manage.py cleanup_orphaned_vote_submissions --dry-run --delete
```

Πρώτα προεπισκόπηση, μετά διαγραφή.

### 5. Specific Tenant

```bash
python manage.py cleanup_orphaned_vote_submissions --dry-run --tenant=demo
```

Έλεγχος μόνο για συγκεκριμένο tenant.

## Validation στο Serializer

Το `VoteSubmissionSerializer` έχει προστεθεί validation που **αποκλείει** τη δημιουργία `VoteSubmission` για linked votes:

```python
# 🔒 IMPORTANT: Reject VoteSubmission creation for linked votes
try:
    agenda_item = vote.agenda_item
    if agenda_item:
        raise serializers.ValidationError(
            "Αυτή η ψηφοφορία είναι συνδεδεμένη με συνέλευση. "
            "Για να ψηφίσετε, χρησιμοποιήστε τη σελίδα της συνέλευσης."
        )
except Exception:
    pass  # Not a linked vote - continue
```

Αυτό σημαίνει ότι:
- ✅ Νέες ψήφοι για linked votes **πρέπει** να περνούν από `/api/votes/{id}/vote/` που δημιουργεί `AssemblyVote`
- ❌ Δεν μπορεί να δημιουργηθεί `VoteSubmission` για linked votes μέσω serializer

## Πότε να τρέξεις το Cleanup

1. **Μετά από migration**: Αν έχεις παλιά `VoteSubmission` records για linked votes
2. **Περιοδικά**: Για να διατηρήσεις καθαρή τη βάση
3. **Πριν από deployment**: Για να βεβαιωθείς ότι δεν υπάρχουν orphaned records

## Παράδειγμα Output

```
📦 Processing tenant: demo
   📊 Found 15 VoteSubmissions for linked votes

   🔄 Found 5 VoteSubmissions that can be synced:
      - Submission 123: User user@example.com, Vote Έγκριση έργου
      - Submission 124: User user2@example.com, Vote Έγκριση έργου
      ...

   🗑️  Found 10 orphaned VoteSubmissions:
      - Submission 125: User user3@example.com, Reason: AssemblyVote already exists (ID: abc-123)
      ...

   ✅ Synced 5/5 submissions
   ✅ Deleted 10/10 submissions
```

## Σχετικά Αρχεία

- `backend/votes/management/commands/cleanup_orphaned_vote_submissions.py` - Cleanup command
- `backend/votes/serializers.py` - Validation στο serializer
- `backend/assemblies/services.py` - `VoteIntegrationService.sync_vote_results()`

