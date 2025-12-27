import cv2
import io
import json
import numpy as np
import pytesseract
import re
import os
from typing import Dict, Any, List, Tuple
import logging
from django.core.files.storage import default_storage

logger = logging.getLogger(__name__)

class FormAnalyzer:
    """
    AI service για ανάλυση φορμών κοινοχρήστων
    """
    
    def __init__(self):
        # Ρύθμιση pytesseract για ελληνικά
        pytesseract.pytesseract.tesseract_cmd = '/usr/bin/tesseract'
        self._vision_parser = None
        self._vision_parser_initialized = False
        
    def analyze_form_images(self, image_paths: List[str], use_vision: bool = True) -> Dict[str, Any]:
        """
        Αναλύει εικόνες φορμών και εξάγει δεδομένα
        """
        if use_vision:
            vision_data = self._extract_data_with_vision(image_paths)
            if vision_data and self._has_useful_data(vision_data):
                return self._finalize_extracted_data(vision_data)

        all_text = []
        
        for image_path in image_paths:
            try:
                # Ανάγνωση εικόνας
                image = self._load_image(image_path)
                if image is None:
                    logger.error(f"Unable to read image for OCR: {image_path}")
                    continue

                # Αυτόματο crop του εγγράφου για καλύτερο OCR
                cropped_image = self._auto_crop_document(image)

                # OCR ανάλυση με πολλαπλά passes
                text = self._extract_text_from_image(cropped_image)
                all_text.append(text)
                
            except Exception as e:
                logger.error(f"Error processing image {image_path}: {str(e)}")
                continue
        
        # Συνδυασμός όλου του κειμένου
        combined_text = '\n'.join(all_text)
        
        # Εξαγωγή δεδομένων
        extracted_data = self._extract_data_from_text(combined_text)
        
        return extracted_data

    def _has_useful_data(self, extracted_data: Dict[str, Any]) -> bool:
        building_info = extracted_data.get('building_info', {})
        if extracted_data.get('apartments'):
            return True
        return bool(building_info.get('address') or building_info.get('name'))

    def _get_vision_parser(self):
        if not self._vision_parser_initialized:
            self._vision_parser_initialized = True
            try:
                self._vision_parser = CommonExpensesVisionParser()
            except ValueError as error:
                logger.warning(f"Gemini vision parser unavailable: {error}")
                self._vision_parser = None
        return self._vision_parser

    def _extract_data_with_vision(self, image_paths: List[str]) -> Dict[str, Any] | None:
        parser = self._get_vision_parser()
        if not parser:
            return None
        try:
            return parser.analyze_images(image_paths)
        except Exception as error:
            logger.error(f"Gemini vision analysis failed: {error}")
            return None
    
    def _preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """
        Προεπεξεργασία εικόνας για καλύτερο OCR
        """
        # Μετατροπή σε grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # Upscale μικρά κείμενα για καλύτερο OCR
        height, width = gray.shape[:2]
        max_dim = max(height, width)
        if max_dim < 2200:
            scale = max(2.0, 2200 / max_dim)
            gray = cv2.resize(gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
        
        # Αφαίρεση θορύβου
        denoised = cv2.medianBlur(gray, 3)
        
        # Βελτίωση αντίθεσης
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
        enhanced = clahe.apply(denoised)
        
        # Διγκοποίηση
        binary = cv2.adaptiveThreshold(
            enhanced,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            31,
            2
        )
        
        return binary

    def _load_image(self, image_path: str) -> np.ndarray | None:
        """
        Φορτώνει εικόνα από local path ή storage (για σωστό OCR).
        """
        if not image_path:
            return None

        if isinstance(image_path, (bytes, bytearray)):
            data = np.frombuffer(image_path, np.uint8)
            return cv2.imdecode(data, cv2.IMREAD_COLOR)

        if isinstance(image_path, str):
            if os.path.exists(image_path):
                image = cv2.imread(image_path)
                if image is not None:
                    return image

            try:
                if default_storage.exists(image_path):
                    with default_storage.open(image_path, 'rb') as handle:
                        data = np.frombuffer(handle.read(), np.uint8)
                    return cv2.imdecode(data, cv2.IMREAD_COLOR)
            except Exception as error:
                logger.error(f"Storage read failed for {image_path}: {error}")

        return None

    def _auto_crop_document(self, image: np.ndarray) -> np.ndarray:
        """
        Προσπαθεί να κόψει το κύριο έγγραφο από τη φωτογραφία.
        """
        try:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            blurred = cv2.GaussianBlur(gray, (5, 5), 0)
            edges = cv2.Canny(blurred, 50, 150)

            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            if not contours:
                return image

            contours = sorted(contours, key=cv2.contourArea, reverse=True)
            for contour in contours[:5]:
                perimeter = cv2.arcLength(contour, True)
                approx = cv2.approxPolyDP(contour, 0.02 * perimeter, True)
                if len(approx) == 4:
                    return self._four_point_transform(image, approx.reshape(4, 2))
        except Exception as error:
            logger.error(f"Auto crop failed: {error}")

        return image

    def _four_point_transform(self, image: np.ndarray, points: np.ndarray) -> np.ndarray:
        rect = self._order_points(points)
        (tl, tr, br, bl) = rect

        width_a = np.linalg.norm(br - bl)
        width_b = np.linalg.norm(tr - tl)
        max_width = int(max(width_a, width_b))

        height_a = np.linalg.norm(tr - br)
        height_b = np.linalg.norm(tl - bl)
        max_height = int(max(height_a, height_b))

        destination = np.array([
            [0, 0],
            [max_width - 1, 0],
            [max_width - 1, max_height - 1],
            [0, max_height - 1],
        ], dtype="float32")

        transform = cv2.getPerspectiveTransform(rect, destination)
        return cv2.warpPerspective(image, transform, (max_width, max_height))

    def _order_points(self, points: np.ndarray) -> np.ndarray:
        rect = np.zeros((4, 2), dtype="float32")
        sum_points = points.sum(axis=1)
        rect[0] = points[np.argmin(sum_points)]
        rect[2] = points[np.argmax(sum_points)]

        diff_points = np.diff(points, axis=1)
        rect[1] = points[np.argmin(diff_points)]
        rect[3] = points[np.argmax(diff_points)]
        return rect

    def _extract_text_from_image(self, image: np.ndarray) -> str:
        """
        Τρέχει OCR με πολλαπλές ρυθμίσεις και επιστρέφει συνδυασμένο κείμενο.
        """
        if image is None:
            return ''

        processed = self._preprocess_image(image)
        variants = [
            processed,
            cv2.cvtColor(image, cv2.COLOR_BGR2GRAY),
            image,
        ]
        configs = [
            '--psm 6 --oem 1',
            '--psm 4 --oem 1',
        ]

        texts: List[str] = []
        for variant in variants:
            for config in configs:
                try:
                    text = pytesseract.image_to_string(
                        variant,
                        lang='ell+eng',
                        config=config
                    )
                    if text.strip():
                        texts.append(text)
                except Exception as error:
                    logger.error(f"OCR pass failed: {error}")

        return '\n'.join(texts)
    
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
        
        return self._finalize_extracted_data(extracted_data)

    def _finalize_extracted_data(self, extracted_data: Dict[str, Any]) -> Dict[str, Any]:
        building_info = extracted_data.get('building_info') or {}
        apartments = extracted_data.get('apartments') or []
        residents = extracted_data.get('residents') or []

        extracted_data['building_info'] = building_info
        extracted_data['apartments'] = apartments
        extracted_data['residents'] = residents
        extracted_data['extraction_notes'] = list(extracted_data.get('extraction_notes') or [])

        if building_info.get('address') and not building_info.get('name'):
            building_info['name'] = building_info['address']
        if building_info.get('name') and not building_info.get('address'):
            building_info['address'] = building_info['name']

        if not building_info.get('apartments_count') and apartments:
            building_info['apartments_count'] = len(apartments)

        extracted_data['confidence_score'] = self._calculate_confidence_score(extracted_data)

        if not building_info.get('name'):
            extracted_data['extraction_notes'].append('Δεν βρέθηκε όνομα κτιρίου - απαιτείται χειροκίνητη εισαγωγή')
        if not building_info.get('address'):
            extracted_data['extraction_notes'].append('Δεν βρέθηκε διεύθυνση κτιρίου - απαιτείται χειροκίνητη εισαγωγή')
        if not apartments:
            extracted_data['extraction_notes'].append('Δεν βρέθηκαν διαμερίσματα - απαιτείται χειροκίνητη εισαγωγή')

        if not building_info.get('name') and not building_info.get('address') and not apartments:
            extracted_data['extraction_notes'].append('Δεν ήταν δυνατή η εξαγωγή δεδομένων - χρησιμοποιήστε πραγματικές εικόνες λογαριασμών κοινοχρήστων')
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

        def normalize_phone(value: str) -> str:
            digits = re.sub(r'\D', '', value)
            if digits.startswith('30') and len(digits) > 10:
                digits = digits[2:]
            return digits[-10:] if len(digits) >= 10 else digits

        def looks_like_section_title(value: str) -> bool:
            value_lower = value.lower()
            return any(keyword in value_lower for keyword in [
                'φύλλο', 'κοινοχρήσ', 'ανάλυση', 'στατισ', 'εξαγωγή',
                'πληρωτέο', 'παραδοσιακή', 'ειδοποιητήριο'
            ])

        lines_clean = [line.strip() for line in lines if line.strip()]
        last_context = None

        for idx, line in enumerate(lines_clean):
            line_lower = line.lower()

            # Όνομα κτιρίου - αναζήτηση σε διάφορα σημεία του λογαριασμού
            if not building_info.get('name') and any(keyword in line_lower for keyword in ['κτίριο', 'οικοδομή', 'συγκρότημα', 'οικοδομικό', 'πολυκατοικία']):
                clean_name = line
                for keyword in ['κτίριο', 'οικοδομή', 'συγκρότημα', 'οικοδομικό', 'πολυκατοικία']:
                    clean_name = clean_name.replace(keyword, '').replace(keyword.upper(), '').strip()
                if clean_name and len(clean_name) > 2 and not looks_like_section_title(clean_name):
                    building_info['name'] = clean_name
                else:
                    # Αν το label είναι μόνο του, πάρε την επόμενη γραμμή
                    for next_idx in range(idx + 1, len(lines_clean)):
                        candidate = lines_clean[next_idx].strip()
                        if candidate and not looks_like_section_title(candidate):
                            building_info['name'] = candidate
                            break
            
            # Όνομα γραφείου διαχείρισης
            if (not building_info.get('management_office_name')
                and 'διαχείριση' in line_lower
                and 'διαχειριστ' not in line_lower):
                clean_office = line.strip()
                for keyword in ['γραφείο', 'εταιρεία']:
                    clean_office = clean_office.replace(keyword, '').replace(keyword.upper(), '').strip()
                if clean_office and len(clean_office) > 2:
                    building_info['management_office_name'] = clean_office
                    last_context = 'management_office'
            
            # Εσωτερικός διαχειριστής
            if 'διαχειριστ' in line_lower and 'διαχείριση' not in line_lower:
                clean_manager = line
                for keyword in ['διαχειριστής', 'διαχειριστησ', 'διαχειριστ', 'κτιρίου', 'κτιριου']:
                    clean_manager = clean_manager.replace(keyword, '').replace(keyword.upper(), '').strip()
                if clean_manager and len(clean_manager) > 2:
                    building_info['internal_manager_name'] = clean_manager
                last_context = 'internal_manager'

                apartment_match = re.search(r'διαμ\.?\s*(\d+)', line_lower)
                if apartment_match and not building_info.get('internal_manager_apartment'):
                    building_info['internal_manager_apartment'] = apartment_match.group(1)
            
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

            # Πιθανή πλήρης διεύθυνση με πόλη/ΤΚ (π.χ. "Οδός 6, Αθήνα 10562")
            if ',' in line and (
                not building_info.get('address')
                or not building_info.get('city')
                or not building_info.get('postal_code')
            ):
                postal_match = re.search(r'\b\d{3}\s?\d{2}\b', line)
                if postal_match:
                    parts = [part.strip() for part in line.split(',') if part.strip()]
                    if parts and not building_info.get('address'):
                        building_info['address'] = parts[0]
                    if not building_info.get('postal_code'):
                        building_info['postal_code'] = postal_match.group().replace(' ', '')
                    city_match = re.search(r'([Α-ΩΆΈΉΊΌΎΏ][^0-9,]+)\s*\d{3}\s?\d{2}', line)
                    if city_match and not building_info.get('city'):
                        building_info['city'] = city_match.group(1).strip()
            
            # Πόλη - επεκτεταμένη λίστα ελληνικών πόλεων
            city_map = {
                'αθήνα': 'Αθήνα',
                'θεσσαλονίκη': 'Θεσσαλονίκη',
                'πάτρα': 'Πάτρα',
                'ηράκλειο': 'Ηράκλειο',
                'λαρίσα': 'Λάρισα',
                'βόλος': 'Βόλος',
                'ιοάννινα': 'Ιωάννινα',
                'χαλκίδα': 'Χαλκίδα',
                'λαμία': 'Λαμία',
                'κομοτηνή': 'Κομοτηνή',
                'αλεξανδρούπολη': 'Αλεξανδρούπολη',
                'καβάλα': 'Καβάλα',
                'κέρκυρα': 'Κέρκυρα',
                'χανιά': 'Χανιά',
                'ρόδος': 'Ρόδος',
                'κως': 'Κως',
                'μύκονος': 'Μύκονος',
                'σάντορίνη': 'Σαντορίνη',
                'νίκαια': 'Νίκαια',
                'κορυδαλλός': 'Κορυδαλλός',
                'περαία': 'Περαία',
                'καλλιθέα': 'Καλλιθέα',
                'αγία βαρβάρα': 'Αγία Βαρβάρα',
                'αγίοι αναργυροι': 'Άγιοι Ανάργυροι',
            }
            if not building_info.get('city'):
                for key, value in city_map.items():
                    if key in line_lower:
                        building_info['city'] = value
                        break
            
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

            # Ωράριο είσπραξης (π.χ. "Δευ-Παρ 9:00-17:00")
            schedule_match = re.search(r'(Δευ|Τρι|Τετ|Πεμ|Παρ|Σαβ|Κυρ)[^0-9]*\d{1,2}:\d{2}', line)
            if schedule_match and not building_info.get('internal_manager_collection_schedule'):
                building_info['internal_manager_collection_schedule'] = line.strip()

            # Τηλέφωνο - γενική αναζήτηση
            phone_match = re.search(r'(\+?\d[\d\s\-]{8,}\d)', line)
            if phone_match:
                phone_value = normalize_phone(phone_match.group(1))
                if last_context == 'internal_manager' and not building_info.get('internal_manager_phone'):
                    building_info['internal_manager_phone'] = phone_value
                elif last_context == 'management_office' and not building_info.get('management_office_phone'):
                    building_info['management_office_phone'] = phone_value
                elif not building_info.get('management_office_phone'):
                    building_info['management_office_phone'] = phone_value
        
        return building_info
    
    def _extract_apartments_from_expenses_table(self, lines: List[str]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Εξάγει δεδομένα διαμερισμάτων και κατοίκων από τον πίνακα κοινοχρήστων
        Εστιάζει στα πεδία: όνομα, αριθμός διαμερίσματος, χιλιοστά, διεύθυνση
        Υποστηρίζει διαφορετικές μορφές πινάκων
        """
        def parse_numeric(value: str) -> float | None:
            clean = value.replace(' ', '')
            if ',' in clean and '.' in clean:
                clean = clean.replace('.', '').replace(',', '.')
            elif ',' in clean:
                clean = clean.replace(',', '.')
            try:
                return float(clean)
            except ValueError:
                return None

        def extract_mills(text: str) -> float | None:
            candidates = re.findall(r'\d{1,4}(?:[.,]\d{1,3})?', text)
            for candidate in candidates:
                value = parse_numeric(candidate)
                if value is not None and 0 < value <= 1000:
                    return value
            return None

        def parse_apartment_row(line_text: str) -> Tuple[str, str, float | None] | None:
            match = re.match(r'^\s*(\d{1,3})\s*[).|:\-]*\s+(.+)$', line_text)
            if not match:
                return None
            apt_number = match.group(1)
            remainder = match.group(2).strip()
            remainder_lower = remainder.lower()
            if any(keyword in remainder_lower for keyword in ['σύνολο', 'συνολα', 'αθροισμα']):
                return None
            name_match = re.match(r"^([Α-ΩΆΈΉΊΌΎΏA-Za-z\s\.'\-]+)", remainder)
            if not name_match:
                return None
            owner_name = name_match.group(1).strip()
            if len(owner_name) < 2:
                return None
            numbers_segment = remainder[name_match.end():]
            mills = extract_mills(numbers_segment)
            return apt_number, owner_name, mills

        apartments = []
        residents = []
        
        # Αναζήτηση για τον πίνακα διαμερισμάτων
        table_started = False
        current_apartment = {}
        
        for line in lines:
            line = ' '.join(line.strip().split())
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
                parsed = parse_apartment_row(line)
                if not parsed:
                    continue
                table_started = True
            else:
                parsed = parse_apartment_row(line)

            if parsed:
                apt_number, resident_name, mills_value = parsed

                if current_apartment:
                    apartments.append(current_apartment)

                current_apartment = {
                    'number': apt_number,
                    'identifier': apt_number,
                    'owner_name': resident_name,
                    'owner_phone': '',
                    'owner_email': '',
                    'is_rented': False,
                    'is_closed': False,
                    'ownership_percentage': mills_value,
                    'square_meters': 0,
                    'bedrooms': 0
                }

                residents.append({
                    'name': resident_name,
                    'email': '',
                    'phone': '',
                    'apartment': apt_number,
                    'role': 'owner'
                })

                continue
            
            # Έλεγχος για νέα γραμμή διαμερίσματος - πολλαπλές μορφές
            apt_found = False
            
            # Μορφή 1: "1 ΒΑΛΤΗΣ" (απλή αρίθμηση)
            apt_match1 = re.search(r'^(\d+)\s+([^\d€]+)', line)
            if apt_match1:
                apt_number = apt_match1.group(1)
                resident_name = apt_match1.group(2).strip()
                apt_found = True
            
            # Μορφή 2: "1-1 ΚΑΡΑΣΑΒΒΙΔΟΥ" (κωδικός διαμερίσματος)
            elif not apt_found:
                apt_match2 = re.search(r'^(\d+-\d+)\s+([^\d€]+)', line)
                if apt_match2:
                    apt_number = apt_match2.group(1)
                    resident_name = apt_match2.group(2).strip()
                    apt_found = True
            
            # Μορφή 3: "1 ΚΑΡΑΣΑΒΒΙΔΟΥ" με επιπλέον δεδομένα
            elif not apt_found:
                apt_match3 = re.search(r'^(\d+)\s+([^\d€]+?)(?:\s+\d+\.\d+|\s+\d+|\s*$)', line)
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

class CommonExpensesVisionParser:
    """
    Vision parser για φύλλα κοινοχρήστων με Gemini.
    """

    SYSTEM_INSTRUCTION = """You are an expert in reading Greek common-expense sheets ("Φύλλο Κοινοχρήστων").
Extract only the data needed for building creation. Return ONLY a raw JSON object (no markdown) with this schema:

{
  "building_info": {
    "address": string | null,
    "name": string | null,
    "city": string | null,
    "postal_code": string | null
  },
  "apartments": [
    {
      "number": string | null,
      "owner_name": string | null,
      "ownership_percentage": number | null
    }
  ]
}

Rules:
- Focus on the apartment table where the first column is A/A.
- Use the A/A value as "number".
- "ownership_percentage" is the mills/χιλιοστά (0-1000) from the relevant column; if unsure, return null.
- Do not invent data; use null when not found.
- If a building name is not explicitly shown, set "name" equal to the address.
"""

    def __init__(self):
        import google.generativeai as genai

        api_key = os.getenv('GOOGLE_API_KEY')
        if not api_key:
            raise ValueError("GOOGLE_API_KEY environment variable is not set")

        genai.configure(api_key=api_key)
        self.genai = genai
        self.api_key = api_key

        self.available_model_ids: list[str] = []
        try:
            available_models = list(genai.list_models())
            model_names = [m.name for m in available_models]
            logger.info(f"Available Gemini models: {model_names}")

            for model in available_models:
                model_name = getattr(model, "name", None)
                if not model_name:
                    continue
                supported_methods = getattr(model, "supported_generation_methods", None)
                if supported_methods and "generateContent" not in supported_methods:
                    continue
                self.available_model_ids.append(self._normalize_model_id(model_name))
        except Exception as list_error:
            logger.warning(f"Could not list Gemini models (non-critical, will use fallback): {list_error}")

        self.model = None
        logger.info("CommonExpensesVisionParser initialized (model will be created on first use)")

    @staticmethod
    def _normalize_model_id(model_id: str | None) -> str:
        model_id = (model_id or "").strip()
        if model_id.startswith("models/"):
            return model_id[len("models/"):]
        return model_id

    @staticmethod
    def _model_preference_sort_key(model_id: str) -> tuple:
        model = model_id.lower()
        penalty = 0

        if "gemini" not in model:
            penalty += 1000
        if "experimental" in model or "preview" in model or model.endswith("-exp") or "-exp-" in model:
            penalty += 500
        if "deprecated" in model:
            penalty += 500

        if model.startswith("gemini-2"):
            penalty -= 200
        elif model.startswith("gemini-1.5"):
            penalty -= 150
        elif model.startswith("gemini-1.0"):
            penalty -= 100

        if "flash" in model:
            penalty -= 120
        if "pro" in model:
            penalty -= 80
        if "vision" in model:
            penalty -= 40

        return (penalty, len(model_id), model_id)

    def _get_model_configs(self) -> list[tuple[str, str]]:
        configured_model = self._normalize_model_id(
            os.getenv("GOOGLE_GEMINI_MODEL") or os.getenv("GEMINI_MODEL")
        )

        preferred = [
            ("gemini-2.0-flash", "Gemini 2.0 Flash"),
            ("gemini-2.0-flash-lite", "Gemini 2.0 Flash Lite"),
            ("gemini-1.5-flash", "Gemini 1.5 Flash"),
            ("gemini-1.5-flash-latest", "Gemini 1.5 Flash (latest)"),
            ("gemini-1.5-flash-8b", "Gemini 1.5 Flash 8B"),
            ("gemini-1.5-pro", "Gemini 1.5 Pro"),
            ("gemini-1.5-pro-latest", "Gemini 1.5 Pro (latest)"),
            ("gemini-1.0-pro-vision-latest", "Gemini 1.0 Pro Vision (latest)"),
            ("gemini-1.0-pro-vision", "Gemini 1.0 Pro Vision"),
            ("gemini-pro-vision", "Gemini Pro Vision"),
        ]

        preferred_desc_by_id = {
            self._normalize_model_id(model_id): desc for model_id, desc in preferred
        }

        model_configs: list[tuple[str, str]] = []
        seen: set[str] = set()

        def add(model_id: str, description: str) -> None:
            normalized = self._normalize_model_id(model_id)
            if not normalized or normalized in seen:
                return
            seen.add(normalized)
            model_configs.append((normalized, description))

        if configured_model:
            add(configured_model, f"Configured Gemini model ({configured_model})")

        available_ids = list(
            dict.fromkeys(getattr(self, "available_model_ids", []) or [])
        )
        if available_ids:
            sorted_available = sorted(
                set(available_ids), key=self._model_preference_sort_key
            )
            for model_id in sorted_available[:10]:
                if model_id == configured_model:
                    continue
                add(
                    model_id,
                    preferred_desc_by_id.get(model_id)
                    or f"Available Gemini model ({model_id})",
                )
            return model_configs

        for model_id, desc in preferred:
            add(model_id, desc)

        return model_configs

    def analyze_images(self, image_paths: List[str]) -> Dict[str, Any]:
        building_info: Dict[str, Any] = {}
        apartments: List[Dict[str, Any]] = []
        apartments_by_number: Dict[str, Dict[str, Any]] = {}

        for image_path in image_paths:
            image_bytes = self._load_image_bytes(image_path)
            if not image_bytes:
                continue
            try:
                parsed_data = self._parse_image_bytes(image_bytes)
            except Exception as error:
                logger.warning(f"Gemini vision failed for {image_path}: {error}")
                continue

            normalized = self._normalize_parsed_data(parsed_data)
            normalized_building = normalized.get('building_info', {})
            for key in ['address', 'name', 'city', 'postal_code']:
                if normalized_building.get(key) and not building_info.get(key):
                    building_info[key] = normalized_building[key]

            for apartment in normalized.get('apartments', []):
                number = apartment.get('number')
                if not number:
                    continue
                existing = apartments_by_number.get(number)
                if not existing:
                    apartments_by_number[number] = apartment
                    apartments.append(apartment)
                else:
                    if not existing.get('owner_name') and apartment.get('owner_name'):
                        existing['owner_name'] = apartment['owner_name']
                    if existing.get('ownership_percentage') is None and apartment.get('ownership_percentage') is not None:
                        existing['ownership_percentage'] = apartment['ownership_percentage']

        residents = self._build_residents(apartments)
        return {
            'building_info': building_info,
            'apartments': apartments,
            'residents': residents
        }

    def _load_image_bytes(self, image_path: str) -> bytes | None:
        if not image_path:
            return None

        if isinstance(image_path, (bytes, bytearray)):
            return bytes(image_path)

        if isinstance(image_path, str):
            if os.path.exists(image_path):
                try:
                    with open(image_path, 'rb') as handle:
                        return handle.read()
                except Exception as error:
                    logger.error(f"Failed to read image {image_path}: {error}")

            try:
                if default_storage.exists(image_path):
                    with default_storage.open(image_path, 'rb') as handle:
                        return handle.read()
            except Exception as error:
                logger.error(f"Storage read failed for {image_path}: {error}")

        return None

    def _parse_image_bytes(self, image_bytes: bytes) -> Dict[str, Any]:
        import re
        from PIL import Image as PILImage

        image = PILImage.open(io.BytesIO(image_bytes))
        if image.mode not in ("RGB", "L"):
            image = image.convert("RGB")

        model_configs = self._get_model_configs()
        response = None
        errors = []

        prompt = "Extract building info and apartment rows into the required JSON object."

        for model_name, model_desc in model_configs:
            try:
                try:
                    attempt_model = self.genai.GenerativeModel(
                        model_name=model_name,
                        system_instruction=self.SYSTEM_INSTRUCTION,
                    )
                except TypeError:
                    attempt_model = self.genai.GenerativeModel(model_name=model_name)

                generation_config = {
                    "temperature": 0.1,
                    "max_output_tokens": 2000,
                    "response_mime_type": "application/json",
                }

                try:
                    response = attempt_model.generate_content(
                        [prompt, image],
                        generation_config=generation_config,
                    )
                except Exception as generate_error:
                    error_text = str(generate_error)
                    if "response_mime_type" in error_text or "responseMimeType" in error_text:
                        response = attempt_model.generate_content(
                            [prompt, image],
                            generation_config={
                                "temperature": 0.1,
                                "max_output_tokens": 2000,
                            },
                        )
                    else:
                        raise

                self.model = attempt_model
                logger.info(f"Successfully used {model_desc} ({model_name}) for common expenses parsing")
                break

            except Exception as error:
                error_str = str(error)
                errors.append(f"{model_name}: {error_str}")
                if '404' in error_str or 'not found' in error_str.lower() or 'not supported' in error_str.lower():
                    logger.warning(f"Model {model_name} not available: {error}")
                else:
                    logger.warning(f"Failed to use {model_name}: {error}")
                continue

        if response is None:
            error_details = "; ".join(errors)
            raise Exception(
                f"All Gemini models failed. Errors: {error_details}. "
                f"Set GOOGLE_GEMINI_MODEL to one of genai.list_models() results, "
                f"ensure the Generative Language API is enabled, and verify GOOGLE_API_KEY."
            )

        response_text = (getattr(response, "text", None) or "").strip()
        if not response_text:
            try:
                response_text = response.candidates[0].content.parts[0].text.strip()
            except Exception:
                response_text = str(response).strip()

        response_text = re.sub(r'```json\s*', '', response_text)
        response_text = re.sub(r'```\s*', '', response_text)
        response_text = response_text.strip()

        try:
            parsed_data = json.loads(response_text)
        except json.JSONDecodeError as error:
            logger.error(f"Failed to parse JSON response: {response_text[:200]}")
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                parsed_data = json.loads(json_match.group())
            else:
                raise ValueError(f"Invalid JSON response from Gemini: {str(error)}")

        if not isinstance(parsed_data, dict):
            raise ValueError("Gemini response is not a JSON object")

        return parsed_data

    def _normalize_parsed_data(self, parsed_data: Dict[str, Any]) -> Dict[str, Any]:
        if not isinstance(parsed_data, dict):
            return {'building_info': {}, 'apartments': []}

        building_info = parsed_data.get('building_info') or {}
        if not building_info and any(
            key in parsed_data for key in ['address', 'name', 'city', 'postal_code']
        ):
            building_info = {
                'address': parsed_data.get('address'),
                'name': parsed_data.get('name'),
                'city': parsed_data.get('city'),
                'postal_code': parsed_data.get('postal_code'),
            }

        normalized_building = {
            'address': self._clean_text(building_info.get('address')),
            'name': self._clean_text(building_info.get('name')),
            'city': self._clean_text(building_info.get('city')),
            'postal_code': self._clean_text(building_info.get('postal_code')),
        }

        apartments_raw = parsed_data.get('apartments') or []
        if isinstance(apartments_raw, dict):
            apartments_raw = apartments_raw.get('items') or []
        if not isinstance(apartments_raw, list):
            apartments_raw = []

        apartments = []
        for item in apartments_raw:
            apartment = self._normalize_apartment(item)
            if apartment:
                apartments.append(apartment)

        return {
            'building_info': normalized_building,
            'apartments': apartments
        }

    def _normalize_apartment(self, item: Any) -> Dict[str, Any] | None:
        if not isinstance(item, dict):
            return None

        number = (
            item.get('number')
            or item.get('identifier')
            or item.get('apartment')
            or item.get('apartment_number')
        )
        if not number:
            number = self._find_key_value(item, {'a/a', 'aa', 'α/α', 'α/α.'})

        number = self._clean_text(number)
        if not number:
            return None

        owner_name = (
            item.get('owner_name')
            or item.get('name')
            or item.get('resident_name')
            or item.get('owner')
        )
        owner_name = self._clean_text(owner_name) or ''

        mills_value = (
            item.get('ownership_percentage')
            or item.get('mills')
            or item.get('thousandths')
            or item.get('χιλιοστά')
            or item.get('χιλιοστα')
        )
        mills_value = self._parse_numeric(mills_value)

        return {
            'number': number,
            'identifier': number,
            'owner_name': owner_name,
            'owner_phone': '',
            'owner_email': '',
            'is_rented': False,
            'is_closed': False,
            'ownership_percentage': mills_value,
            'square_meters': 0,
            'bedrooms': 0
        }

    def _find_key_value(self, item: Dict[str, Any], targets: set[str]) -> Any:
        for key, value in item.items():
            normalized = str(key).strip().lower().replace(' ', '')
            if normalized in targets:
                return value
        return None

    def _clean_text(self, value: Any) -> str | None:
        if value is None:
            return None
        if isinstance(value, (int, float)):
            value = str(value)
        if not isinstance(value, str):
            return None
        cleaned = ' '.join(value.strip().split())
        return cleaned or None

    def _parse_numeric(self, value: Any) -> float | None:
        if value is None:
            return None
        if isinstance(value, (int, float)):
            return float(value)
        if not isinstance(value, str):
            return None
        clean = value.strip()
        if not clean:
            return None
        clean = clean.replace('€', '').replace('%', '')
        clean = clean.replace(' ', '')
        if ',' in clean and '.' in clean:
            clean = clean.replace('.', '').replace(',', '.')
        elif ',' in clean:
            clean = clean.replace(',', '.')
        try:
            return float(clean)
        except ValueError:
            return None

    def _build_residents(self, apartments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        residents = []
        for apartment in apartments:
            name = apartment.get('owner_name')
            if not name:
                continue
            residents.append({
                'name': name,
                'email': apartment.get('owner_email', ''),
                'phone': apartment.get('owner_phone', ''),
                'apartment': apartment.get('number'),
                'role': 'owner'
            })
        return residents

# Global instance
form_analyzer = FormAnalyzer() 
