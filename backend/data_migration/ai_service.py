import cv2
import numpy as np
import pytesseract
import re
from typing import Dict, Any, List, Tuple
import logging

logger = logging.getLogger(__name__)

class FormAnalyzer:
    """
    AI service για ανάλυση φορμών κοινοχρήστων
    """
    
    def __init__(self):
        # Ρύθμιση pytesseract για ελληνικά
        pytesseract.pytesseract.tesseract_cmd = '/usr/bin/tesseract'
        
    def analyze_form_images(self, image_paths: List[str]) -> Dict[str, Any]:
        """
        Αναλύει εικόνες φορμών και εξάγει δεδομένα
        """
        all_text = []
        
        for image_path in image_paths:
            try:
                # Ανάγνωση εικόνας
                image = cv2.imread(image_path)
                if image is None:
                    continue
                
                # Προεπεξεργασία εικόνας
                processed_image = self._preprocess_image(image)
                
                # OCR ανάλυση
                text = pytesseract.image_to_string(processed_image, lang='ell')
                all_text.append(text)
                
            except Exception as e:
                logger.error(f"Error processing image {image_path}: {str(e)}")
                continue
        
        # Συνδυασμός όλου του κειμένου
        combined_text = '\n'.join(all_text)
        
        # Εξαγωγή δεδομένων
        extracted_data = self._extract_data_from_text(combined_text)
        
        return extracted_data
    
    def _preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """
        Προεπεξεργασία εικόνας για καλύτερο OCR
        """
        # Μετατροπή σε grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Αφαίρεση θορύβου
        denoised = cv2.medianBlur(gray, 3)
        
        # Βελτίωση αντίθεσης
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
        enhanced = clahe.apply(denoised)
        
        # Διγκοποίηση
        _, binary = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        return binary
    
    def _extract_data_from_text(self, text: str) -> Dict[str, Any]:
        """
        Εξάγει δεδομένα από λογαριασμούς κοινοχρήστων
        """
        extracted_data = {
            'building_info': {},
            'apartments': [],
            'residents': [],
            'confidence_score': 0.0,
            'extraction_notes': []
        }
        
        lines = text.split('\n')
        
        # Εξαγωγή πληροφοριών κτιρίου από λογαριασμό κοινοχρήστων
        building_info = self._extract_building_info_from_expenses(lines)
        extracted_data['building_info'] = building_info
        
        # Εξαγωγή διαμερισμάτων και κατοίκων από τον πίνακα
        apartments, residents = self._extract_apartments_from_expenses_table(lines)
        extracted_data['apartments'] = apartments
        extracted_data['residents'] = residents
        
        # Υπολογισμός confidence score
        confidence = self._calculate_confidence_score(extracted_data)
        extracted_data['confidence_score'] = confidence
        
        # Προσθήκη σημειώσεων ανάλογα με την ποιότητα της εξαγωγής
        if not building_info.get('name'):
            extracted_data['extraction_notes'].append('Δεν βρέθηκε όνομα κτιρίου - απαιτείται χειροκίνητη εισαγωγή')
        if not building_info.get('address'):
            extracted_data['extraction_notes'].append('Δεν βρέθηκε διεύθυνση κτιρίου - απαιτείται χειροκίνητη εισαγωγή')
        if not apartments:
            extracted_data['extraction_notes'].append('Δεν βρέθηκαν διαμερίσματα - απαιτείται χειροκίνητη εισαγωγή')
        
        # Αν δεν βρέθηκε τίποτα, προσθήκη προεπιλεγμένων τιμών για testing
        if not building_info.get('name') and not building_info.get('address') and not apartments:
            extracted_data['extraction_notes'].append('Δεν ήταν δυνατή η εξαγωγή δεδομένων - χρησιμοποιήστε πραγματικές εικόνες λογαριασμών κοινοχρήστων')
            # Προσθήκη προεπιλεγμένων τιμών για testing
            extracted_data['building_info'] = {
                'name': 'Κτίριο (απαιτείται εισαγωγή)',
                'address': 'Διεύθυνση (απαιτείται εισαγωγή)',
                'city': 'Αθήνα',
                'postal_code': '10000',
                'apartments_count': 0
            }
        
        return extracted_data
    
    def _extract_building_info(self, lines: List[str]) -> Dict[str, Any]:
        """
        Εξάγει πληροφορίες κτιρίου (παλιά μέθοδος - διατηρείται για συμβατότητα)
        """
        return self._extract_building_info_from_expenses(lines)
    
    def _extract_apartments(self, lines: List[str]) -> List[Dict[str, Any]]:
        """
        Εξάγει δεδομένα διαμερισμάτων (παλιά μέθοδος - διατηρείται για συμβατότητα)
        """
        apartments, _ = self._extract_apartments_from_expenses_table(lines)
        return apartments
    
    def _extract_residents(self, apartments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Εξάγει λίστα κατοίκων από τα διαμερίσματα (παλιά μέθοδος - διατηρείται για συμβατότητα)
        """
        residents = []
        
        for apt in apartments:
            # Ιδιοκτήτης
            if apt.get('owner_name'):
                residents.append({
                    'name': apt['owner_name'],
                    'email': apt.get('owner_email', ''),
                    'phone': apt.get('owner_phone', ''),
                    'apartment': apt['number'],
                    'role': 'owner'
                })
            
            # Ένοικος
            if apt.get('is_rented') and apt.get('tenant_name'):
                residents.append({
                    'name': apt['tenant_name'],
                    'email': apt.get('tenant_email', ''),
                    'phone': apt.get('tenant_phone', ''),
                    'apartment': apt['number'],
                    'role': 'tenant'
                })
        
        return residents
    
    def _calculate_confidence_score(self, data: Dict[str, Any]) -> float:
        """
        Υπολογίζει το confidence score της εξαγωγής
        """
        score = 0.0
        total_checks = 0
        
        # Έλεγχος πληροφοριών κτιρίου
        building_info = data.get('building_info', {})
        if building_info.get('name'):
            score += 0.2
        if building_info.get('address'):
            score += 0.2
        total_checks += 2
        
        # Έλεγχος διαμερισμάτων
        apartments = data.get('apartments', [])
        if apartments:
            score += 0.3
            total_checks += 1
            
            # Έλεγχος ποιότητας δεδομένων διαμερισμάτων
            valid_apartments = 0
            for apt in apartments:
                if apt.get('number') and apt.get('owner_name'):
                    valid_apartments += 1
            
            if valid_apartments > 0:
                score += 0.3 * (valid_apartments / len(apartments))
                total_checks += 1
        
        # Έλεγχος κατοίκων
        residents = data.get('residents', [])
        if residents:
            score += 0.2
            total_checks += 1
        
        return score / total_checks if total_checks > 0 else 0.0

    def _extract_building_info_from_expenses(self, lines: List[str]) -> Dict[str, Any]:
        """
        Εξάγει πληροφορίες κτιρίου από λογαριασμό κοινοχρήστων
        """
        building_info = {}
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            line_lower = line.lower()
            
            # Όνομα κτιρίου - αναζήτηση σε διάφορα σημεία του λογαριασμού
            if any(keyword in line_lower for keyword in ['κτίριο', 'οικοδομή', 'συγκρότημα', 'οικοδομικό', 'πολυκατοικία', 'διαχείριση']):
                # Αφαίρεση των keywords για να πάρουμε μόνο το όνομα
                clean_name = line
                for keyword in ['κτίριο', 'οικοδομή', 'συγκρότημα', 'οικοδομικό', 'πολυκατοικία', 'διαχείριση']:
                    clean_name = clean_name.replace(keyword, '').replace(keyword.upper(), '').strip()
                if clean_name and len(clean_name) > 2:
                    building_info['name'] = clean_name
            
            # Διεύθυνση - αναζήτηση σε διάφορα σημεία
            # Προτεραιότητα 1: Διεύθυνση διαχείρισης
            if 'διεύθυνση' in line_lower and 'διαχείριση' in line_lower:
                clean_address = line
                for keyword in ['διεύθυνση:', 'διαχείριση:', 'διεύθυνση', 'διαχείριση']:
                    clean_address = clean_address.replace(keyword, '').replace(keyword.upper(), '').strip()
                if clean_address and len(clean_address) > 5:
                    building_info['address'] = clean_address
            
            # Προτεραιότητα 2: Γενική διεύθυνση
            elif any(keyword in line_lower for keyword in ['διεύθυνση', 'οδός', 'λεωφόρος', 'δρόμος', 'οδό', 'λεωφ.', 'περιοχή']):
                # Αφαίρεση των keywords για να πάρουμε μόνο τη διεύθυνση
                clean_address = line
                for keyword in ['διεύθυνση:', 'οδός:', 'λεωφόρος:', 'δρόμος:', 'οδό:', 'λεωφ.:', 'περιοχή:']:
                    clean_address = clean_address.replace(keyword, '').replace(keyword.upper(), '').strip()
                if clean_address and len(clean_address) > 5 and not building_info.get('address'):
                    building_info['address'] = clean_address
            
            # Προτεραιότητα 3: Μορφή "ΟΔΟΣ ΑΡΙΘΜΟΣ" (π.χ. "ΦΙΛΙΠΠΟΥ 5")
            elif not building_info.get('address'):
                # Αναζήτηση για μορφή "ΟΔΟΣ ΑΡΙΘΜΟΣ"
                address_match = re.search(r'([Α-Ωα-ω\s]+)\s+(\d+)', line)
                if address_match:
                    street = address_match.group(1).strip()
                    number = address_match.group(2).strip()
                    if len(street) > 2 and street.lower() not in ['α/α', 'κωδ', 'μέτρα', 'θερμάνση']:
                        building_info['address'] = f"{street} {number}"
            
            # Πόλη - επεκτεταμένη λίστα ελληνικών πόλεων
            if any(city in line_lower for city in ['αθήνα', 'θεσσαλονίκη', 'πάτρα', 'ηράκλειο', 'λαρίσα', 'βόλος', 'ιοάννινα', 'χαλκίδα', 'λαμία', 'κομοτηνή', 'αλεξανδρούπολη', 'καβάλα', 'κέρκυρα', 'χανιά', 'ρόδος', 'κως', 'μύκονος', 'σάντορίνη', 'νίκαια', 'κορυδαλλός', 'περαία', 'καλλιθέα', 'αγία βαρβάρα', 'αγίοι αναργυροι']):
                building_info['city'] = line.strip()
            
            # ΤΚ - αναζήτηση για ελληνικούς ταχυδρομικούς κώδικες
            tk_match = re.search(r'\b\d{3}\s?\d{2}\b', line)  # Ελληνικός ΤΚ format: 12345
            if tk_match:
                building_info['postal_code'] = tk_match.group().replace(' ', '')
            
            # Αριθμός διαμερισμάτων - από τον πίνακα ή από άλλες πληροφορίες
            apt_patterns = [
                r'(\d+)\s*(διαμερίσματα?|διαμερισμάτων|διαμερισμα)',
                r'(\d+)\s*(διαμέρισμα|διαμερίσματα)',
                r'συνολικά\s*(\d+)\s*διαμερίσματα?',
                r'αριθμός\s*διαμερισμάτων:\s*(\d+)',
                r'συνολα\s*=>\s*(\d+)',  # Από τον πίνακα κοινοχρήστων
                r'α/α\s*(\d+)'  # Από την αρίθμηση του πίνακα
            ]
            
            for pattern in apt_patterns:
                apt_match = re.search(pattern, line_lower)
                if apt_match:
                    building_info['apartments_count'] = int(apt_match.group(1))
                    break
            
            # Πληροφορίες διαχείρισης
            if 'διαχειριστής' in line_lower or 'διαχείριση' in line_lower:
                # Αφαίρεση των keywords
                clean_manager = line
                for keyword in ['διαχειριστής:', 'διαχείριση:', 'διαχειριστής', 'διαχείριση']:
                    clean_manager = clean_manager.replace(keyword, '').replace(keyword.upper(), '').strip()
                if clean_manager and len(clean_manager) > 2:
                    building_info['management_office_name'] = clean_manager
            
            # Τηλέφωνο διαχείρισης
            phone_match = re.search(r'τηλ[.:]\s*(\d+)', line_lower)
            if phone_match:
                building_info['management_office_phone'] = phone_match.group(1)
        
        return building_info
    
    def _extract_apartments_from_expenses_table(self, lines: List[str]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Εξάγει δεδομένα διαμερισμάτων και κατοίκων από τον πίνακα κοινοχρήστων
        Εστιάζει στα πεδία: όνομα, αριθμός διαμερίσματος, χιλιοστά, διεύθυνση
        Υποστηρίζει διαφορετικές μορφές πινάκων
        """
        apartments = []
        residents = []
        
        # Αναζήτηση για τον πίνακα διαμερισμάτων
        table_started = False
        current_apartment = {}
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            line_lower = line.lower()
            
            # Έλεγχος για αρχή πίνακα - επεκτεταμένη αναζήτηση
            if any(keyword in line_lower for keyword in [
                'α/α', 'ονοματεπώνυμο', 'διαμέρισμα', 'αριθμός', 'κατοικος', 'ιδιοκτήτης', 
                'χιλιοστά', 'κωδ', 'μέτρα', 'θερμάνση', 'συμμετοχή', 'ανάλογα'
            ]):
                table_started = True
                continue
            
            # Έλεγχος για τέλος πίνακα
            if 'συνολα' in line_lower or 'σύνολο' in line_lower or 'συνολα =>' in line_lower:
                if current_apartment:
                    apartments.append(current_apartment)
                break
            
            if not table_started:
                continue
            
            # Έλεγχος για νέα γραμμή διαμερίσματος - πολλαπλές μορφές
            apt_found = False
            
            # Μορφή 1: "1 ΒΑΛΤΗΣ" (απλή αρίθμηση)
            apt_match1 = re.search(r'^(\d+)\s+([Α-Ωα-ω\s]+)', line)
            if apt_match1:
                apt_number = apt_match1.group(1)
                resident_name = apt_match1.group(2).strip()
                apt_found = True
            
            # Μορφή 2: "1-1 ΚΑΡΑΣΑΒΒΙΔΟΥ" (κωδικός διαμερίσματος)
            elif not apt_found:
                apt_match2 = re.search(r'^(\d+-\d+)\s+([Α-Ωα-ω\s]+)', line)
                if apt_match2:
                    apt_number = apt_match2.group(1)
                    resident_name = apt_match2.group(2).strip()
                    apt_found = True
            
            # Μορφή 3: "1 ΚΑΡΑΣΑΒΒΙΔΟΥ" με επιπλέον δεδομένα
            elif not apt_found:
                apt_match3 = re.search(r'^(\d+)\s+([Α-Ωα-ω\s]+?)(?:\s+\d+\.\d+|\s+\d+|\s*$)', line)
                if apt_match3:
                    apt_number = apt_match3.group(1)
                    resident_name = apt_match3.group(2).strip()
                    apt_found = True
            
            if apt_found:
                # Αποθήκευση προηγούμενου διαμερίσματος
                if current_apartment:
                    apartments.append(current_apartment)
                
                # Ξεκίνημα νέου διαμερίσματος
                current_apartment = {
                    'number': apt_number,
                    'identifier': apt_number,
                    'owner_name': resident_name,  # Όνομα από τον πίνακα
                    'owner_phone': '',
                    'owner_email': '',
                    'is_rented': False,
                    'is_closed': False,
                    'ownership_percentage': 100.0,  # Θα ενημερωθεί με τα χιλιοστά
                    'square_meters': 0,
                    'bedrooms': 0
                }
                
                # Προσθήκη στον κάτοικο
                residents.append({
                    'name': resident_name,
                    'email': '',
                    'phone': '',
                    'apartment': apt_number,
                    'role': 'owner'
                })
                
                continue
            
            # Εξαγωγή χιλιοστών και άλλων δεδομένων από την ίδια γραμμή ή επόμενες
            if current_apartment:
                # Εξαγωγή χιλιοστών κοινόχρηστα - πολλαπλές μορφές
                thousandths_found = False
                
                # Μορφή 1: "33.33 κοινόχρηστα"
                thousandths_match1 = re.search(r'(\d+(?:\.\d+)?)\s*κοιν[οό]στ[αά]', line_lower)
                if thousandths_match1:
                    thousandths = float(thousandths_match1.group(1))
                    current_apartment['ownership_percentage'] = thousandths
                    thousandths_found = True
                
                # Μορφή 2: Αριθμοί που μπορεί να είναι χιλιοστά (πρώτος αριθμός στη γραμμή)
                elif not thousandths_found:
                    numbers = re.findall(r'\b(\d+(?:\.\d+)?)\b', line)
                    if numbers:
                        # Πρώτος αριθμός είναι συνήθως τα χιλιοστά
                        num_val = float(numbers[0])
                        if 0 < num_val <= 1000:  # Χιλιοστά είναι συνήθως μεταξύ 0-1000
                            current_apartment['ownership_percentage'] = num_val
                            thousandths_found = True
                
                # Εξαγωγή τετραγωνικών μέτρων
                square_meters_match = re.search(r'(\d+(?:\.\d+)?)\s*μέτρα?', line_lower)
                if square_meters_match:
                    current_apartment['square_meters'] = float(square_meters_match.group(1))
                
                # Εναλλακτική αναζήτηση για τετραγωνικά μέτρα (αριθμός μετά το όνομα)
                elif not current_apartment.get('square_meters') or current_apartment['square_meters'] == 0:
                    numbers = re.findall(r'\b(\d+(?:\.\d+)?)\b', line)
                    if len(numbers) > 1:
                        # Δεύτερος αριθμός μπορεί να είναι τα τετραγωνικά μέτρα
                        num_val = float(numbers[1])
                        if 20 < num_val < 500:  # Λογικό εύρος για διαμέρισμα
                            current_apartment['square_meters'] = num_val
                
                # Εξαγωγή επιπλέον πληροφοριών για το τρέχον διαμέρισμα
                # Τηλέφωνο
                phone_match = re.search(r'(\d{10})', line)
                if phone_match and not current_apartment.get('owner_phone'):
                    current_apartment['owner_phone'] = phone_match.group(1)
                    # Ενημέρωση και του resident
                    for resident in residents:
                        if resident['apartment'] == current_apartment['number']:
                            resident['phone'] = phone_match.group(1)
                            break
                
                # Email
                email_match = re.search(r'([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})', line)
                if email_match and not current_apartment.get('owner_email'):
                    current_apartment['owner_email'] = email_match.group(1)
                    # Ενημέρωση και του resident
                    for resident in residents:
                        if resident['apartment'] == current_apartment['number']:
                            resident['email'] = email_match.group(1)
                            break
        
        # Προσθήκη τελευταίου διαμερίσματος
        if current_apartment:
            apartments.append(current_apartment)
        
        return apartments, residents

# Global instance
form_analyzer = FormAnalyzer() 