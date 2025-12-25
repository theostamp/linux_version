# Ανάλυση Αναπαράστασης Ψήφων - Linked Votes

## ✅ Τι λειτουργεί σωστά

1. **`/api/votes/{id}/vote/` endpoint (views.py:113)**
   - ✅ Για linked votes: Δημιουργεί `AssemblyVote` ανά διαμέρισμα
   - ✅ Για standalone votes: Δημιουργεί `VoteSubmission` (legacy)
   - ✅ Ελέγχει eligibility και apartment selection

2. **`/api/votes/{id}/my-submission/` endpoint (views.py:302)**
   - ✅ Για linked votes: Επιστρέφει per-apartment submissions από `AssemblyVote`
   - ✅ Για standalone votes: Επιστρέφει `VoteSubmission`

3. **`Vote.get_results()` method (models.py:224)**
   - ✅ Για linked votes: Υπολογίζει από `AssemblyVote`
   - ✅ Για standalone votes: Υπολογίζει από `VoteSubmission`
   - ✅ Συνεπής format με `AgendaItem.get_voting_results()`

4. **`AgendaItem.get_voting_results()` method (models.py:535)**
   - ✅ Χρησιμοποιεί `AssemblyVote` (canonical source)
   - ✅ Συνεπές format με `Vote.get_results()`

5. **Public kiosk feed (public_info/views.py:437)**
   - ✅ Χρησιμοποιεί `item.get_voting_results()` (AssemblyVote)
   - ✅ Vote roster από `AssemblyVote` με apartment_number (χωρίς ονόματα)

## ⚠️ Πιθανά Προβλήματα / Edge Cases

### 1. Legacy VoteSubmission Sync (public_info/views.py:456-479)

**Πρόβλημα:**
```python
# Legacy sync μόνο όταν submissions_count > assembly_votes_count
if submissions_count > assembly_votes_count:
    VoteIntegrationService(sync_item).sync_vote_results()
```

**Πιθανά Issues:**
- Αν υπάρχουν παλιά `VoteSubmission` που δεν έχουν sync, δεν θα συγχρονιστούν αν `assembly_votes_count >= submissions_count`
- Αν υπάρχουν `VoteSubmission` που δεν αντιστοιχούν σε valid `AssemblyAttendee`, δεν θα sync
- Το sync γίνεται μόνο στο public_info endpoint, όχι παντού

**Σύσταση:**
- Προσθήκη explicit check για orphaned `VoteSubmission` records
- Προσθήκη migration script για cleanup παλιών `VoteSubmission` για linked votes

### 2. VoteSubmission Signal Sync (votes/signals.py:54-83)

**Τρέχουσα Λογική:**
- Όταν δημιουργείται `VoteSubmission`, sync → `AssemblyVote` αν είναι linked vote

**Πιθανό Issue:**
- Αν κάποιος δημιουργήσει `VoteSubmission` για linked vote (π.χ. μέσω admin ή άλλου endpoint), θα sync
- Αλλά το `/api/votes/{id}/vote/` για linked votes δημιουργεί `AssemblyVote` απευθείας (όχι `VoteSubmission`)
- Αυτό σημαίνει ότι το signal μπορεί να μην trigger ποτέ για νέες ψήφους linked votes

**Σύσταση:**
- Το signal είναι OK για backward compatibility (παλιά `VoteSubmission`)
- Νέες ψήφοι για linked votes πάνε απευθείας σε `AssemblyVote` (σωστά)

### 3. Per-Apartment Vote Logic

**Τρέχουσα Λογική:**
- `/api/votes/{id}/vote/` για linked votes: `apartment_id` required αν user έχει πολλά διαμερίσματα
- `AssemblyVote` είναι per `attendee` (που είναι per `apartment`)

**Πιθανό Issue:**
- Αν user έχει πολλά διαμερίσματα και ψηφίσει για ένα, μετά προσπαθήσει να ψηφίσει για άλλο μέσω legacy path, μπορεί να δημιουργηθεί `VoteSubmission` (αν το endpoint δεν check linked vote πρώτα)
- ✅ **ΕΛΕΓΧΟΣ:** Το endpoint check linked vote πρώτα (line 155), οπότε OK

### 4. Vote Roster Consistency

**Public Kiosk Feed (public_info/views.py:510-522):**
```python
for attendee in upcoming_assembly.attendees.select_related('apartment').order_by('apartment__number'):
    v = vote_by_attendee.get(attendee.id)
    roster.append({
        'attendee': str(attendee.id),
        'apartment_number': getattr(attendee.apartment, 'number', '') or '',
        'mills': attendee.mills,
        'vote': getattr(v, 'vote', None) if v else None,
        'vote_source': getattr(v, 'vote_source', None) if v else None,
    })
```

**Πιθανό Issue:**
- Αν `attendee.apartment` είναι None, το `apartment_number` θα είναι empty string
- Αν υπάρχουν attendees χωρίς apartment, θα εμφανίζονται στο roster με empty apartment_number

**Σύσταση:**
- Filter out attendees χωρίς apartment: `.filter(apartment__isnull=False)`

### 5. Results Calculation Consistency

**`Vote.get_results()` vs `AgendaItem.get_voting_results()`:**

- `Vote.get_results()`: Returns `{'ΝΑΙ': count, 'ΟΧΙ': count, 'ΛΕΥΚΟ': count, 'mills': {...}, ...}`
- `AgendaItem.get_voting_results()`: Returns `{'approve': {count, mills}, 'reject': {count, mills}, ...}`

**Format Difference:**
- `Vote.get_results()`: Greek choices (ΝΑΙ/ΟΧΙ/ΛΕΥΚΟ) + nested mills dict
- `AgendaItem.get_voting_results()`: English keys (approve/reject/abstain) + nested dicts

**Σύσταση:**
- ✅ OK - Διαφορετικά endpoints, διαφορετικά formats είναι αποδεκτό
- Frontend handles both formats correctly

## 🔍 Recommended Checks

### 1. Database Query για Orphaned VoteSubmissions

```sql
-- Find VoteSubmissions for linked votes that don't have corresponding AssemblyVote
SELECT vs.* 
FROM votes_votesubmission vs
INNER JOIN assemblies_agendaitem ai ON ai.linked_vote_id = vs.vote_id
LEFT JOIN assemblies_assemblyattendee aa ON aa.user_id = vs.user_id 
    AND aa.assembly_id = ai.assembly_id
LEFT JOIN assemblies_assemblyvote av ON av.agenda_item_id = ai.id 
    AND av.attendee_id = aa.id
WHERE av.id IS NULL
  AND ai.item_type = 'voting';
```

### 2. Database Query για Duplicate Votes

```sql
-- Find cases where same attendee has multiple votes for same agenda item
SELECT agenda_item_id, attendee_id, COUNT(*) as vote_count
FROM assemblies_assemblyvote
GROUP BY agenda_item_id, attendee_id
HAVING COUNT(*) > 1;
```

### 3. Database Query για Missing Votes

```sql
-- Find attendees who should have votes but don't
SELECT aa.id as attendee_id, ai.id as agenda_item_id
FROM assemblies_assemblyattendee aa
INNER JOIN assemblies_agendaitem ai ON ai.assembly_id = aa.assembly_id
WHERE ai.item_type = 'voting'
  AND ai.status = 'completed'
  AND NOT EXISTS (
    SELECT 1 FROM assemblies_assemblyvote av 
    WHERE av.agenda_item_id = ai.id 
    AND av.attendee_id = aa.id
  );
```

## ✅ Συμπεράσματα

1. **Κύρια λογική είναι σωστή:** Linked votes χρησιμοποιούν `AssemblyVote` ως canonical source
2. **Backward compatibility:** Legacy sync για παλιά `VoteSubmission` records
3. **Per-apartment voting:** Σωστά implemented για linked votes
4. **Results calculation:** Συνεπές μεταξύ `Vote.get_results()` και `AgendaItem.get_voting_results()`

## 🛠️ Προτεινόμενες Βελτιώσεις

1. **Cleanup Script:** Δημιουργία script για cleanup orphaned `VoteSubmission` για linked votes
2. **Validation:** Προσθήκη validation στο `VoteSubmission` serializer για να reject linked votes
3. **Roster Filter:** Filter out attendees χωρίς apartment στο public kiosk feed
4. **Monitoring:** Προσθήκη logging για sync operations και potential duplicates

