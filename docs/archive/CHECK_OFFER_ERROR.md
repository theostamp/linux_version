# Debugging 400 Bad Request στο /api/projects/offers

## Βήμα 1: Ελέγξτε Browser Console

Ανοίξτε το Browser Dev Tools (F12) → Console tab και αναζητήστε:

```
[New Offer] Payload: {
  "project": ...,
  "contractor_name": "...",
  "amount": ...,
  ...
}

[New Offer] Error: ...
[New Offer] Error response: ...
[New Offer] Error body: {...}
```

## Βήμα 2: Ελέγξτε Network Tab

1. Ανοίξτε Browser Dev Tools (F12) → Network tab
2. Φιλτράρετε για "offers"
3. Βρείτε το POST request στο `/api/projects/offers`
4. Κάντε κλικ πάνω του
5. Πηγαίνετε στο **Response** tab
6. Θα δείτε το JSON error, π.χ.:

```json
{
  "amount": ["This field is required."],
  "contractor_name": ["This field may not be blank."]
}
```

ή

```json
{
  "amount": ["Το ποσό είναι υποχρεωτικό."],
  "contractor_name": ["Το όνομά του συνεργείου είναι υποχρεωτικό."]
}
```

## Πιθανές Αιτίες

1. **Missing `amount`**: Το payload δεν περιλαμβάνει το `amount` field
2. **Empty `contractor_name`**: Το `contractor_name` είναι κενό
3. **Invalid `project` ID**: Το project ID δεν υπάρχει
4. **Missing required field**: Κάποιο άλλο required field λείπει

## Τι να μου στείλετε

Αντιγράψτε και στείλτε μου:
1. Το `[New Offer] Payload:` από το Console
2. Το `[New Offer] Error body:` από το Console
3. Το Response JSON από το Network tab

Με αυτά θα μπορέσω να διορθώσω το πρόβλημα αμέσως!
