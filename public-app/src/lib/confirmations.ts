export const confirmBuildingDeletion = (buildingName: string): boolean => {
  const name = (buildingName || '').trim();
  if (!name) return false;

  const warning = [
    'ΙΣΧΥΡΗ ΠΡΟΕΙΔΟΠΟΙΗΣΗ: Η διαγραφή είναι ΜΟΝΙΜΗ.',
    'Θα διαγραφούν ΟΛΑ τα δεδομένα του κτιρίου:',
    '• Διαμερίσματα, ιδιοκτήτες/ένοικοι',
    '• Οικονομικά, κοινόχρηστα, πληρωμές, κινήσεις',
    '• Ανακοινώσεις, αιτήματα, ψηφοφορίες',
    '• Έργα/συντηρήσεις, αρχεία, ειδοποιήσεις',
    '',
    'Δεν υπάρχει δυνατότητα επαναφοράς.',
  ].join('\n');

  const confirmed = window.confirm(
    `${warning}\n\nΚτίριο: "${name}"\n\nΘέλετε να συνεχίσετε;`
  );
  if (!confirmed) return false;

  const typed = window.prompt(
    `Για επιβεβαίωση πληκτρολογήστε ΑΚΡΙΒΩΣ το όνομα του κτιρίου:\n${name}`
  );
  if (!typed || typed.trim() !== name) {
    window.alert('Το όνομα δεν ταιριάζει. Η διαγραφή ακυρώθηκε.');
    return false;
  }

  return true;
};
