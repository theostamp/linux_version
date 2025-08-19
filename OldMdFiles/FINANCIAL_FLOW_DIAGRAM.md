# 🔄 Οπτικό Διάγραμμα Ροής - Οικονομική Διαχείριση

## 📊 Κύριος Κύκλος Διαχείρισης

```mermaid
graph TD
    A[Διαχειριστής] --> B[Πυλώνας 1: Καταχώρηση Δαπανών]
    B --> C[Ανέκδοτες Δαπάνες]
    C --> D[Πυλώνας 2: Υπολογισμός & Έκδοση]
    D --> E[Εκδοθείσες Δαπάνες]
    E --> F[Πυλώνας 3: Διαχείριση Αποθεματικού]
    F --> G[Πληρωμές Ιδιοκτητών]
    G --> H[Ενημέρωση Υπολοίπων]
    H --> I[Κεντρική Οθόνη]
    I --> A
    
    style A fill:#e1f5fe
    style B fill:#f3e5f5
    style D fill:#e8f5e8
    style F fill:#fff3e0
    style I fill:#fce4ec
```

## 🎯 Πυλώνας 1: Καταχώρηση Δαπανών

```mermaid
flowchart TD
    A[Άνοιγμα "Νέα Δαπάνη"] --> B[Συμπλήρωση Βασικών Πεδίων]
    B --> C[Επιλογή Κατηγορίας]
    C --> D{Αυτόματη Πρόταση<br/>Τρόπου Κατανομής}
    D --> E[Επιβεβαίωση/Αλλαγή<br/>Τρόπου Κατανομής]
    E --> F{Ειδική Κατανομή?}
    F -->|Ναι| G[Επιλογή Συγκεκριμένων<br/>Διαμερισμάτων]
    F -->|Όχι| H[Προσθήκη Επισύναψης<br/>Παραστατικού]
    G --> H
    H --> I[Προσθήκη Σημειώσεων]
    I --> J[Αποθήκευση]
    J --> K[Μεταφορά σε<br/>"Ανέκδοτες Δαπάνες"]
    
    style A fill:#e3f2fd
    style K fill:#e8f5e8
```

## ⚙️ Πυλώνας 2: Υπολογισμός & Έκδοση

```mermaid
flowchart TD
    A[Άνοιγμα "Έκδοση Κοινοχρήστων"] --> B[Επιλογή Περιόδου]
    B --> C[Επισκόπηση Ανέκδοτων Δαπανών]
    C --> D{Υπάρχουν Δαπάνες<br/>Θέρμανσης?}
    D -->|Ναι| E[Εισαγωγή Μετρήσεων<br/>Ωρομετρητών]
    D -->|Όχι| F[Υπολογισμός Μεριδίων]
    E --> F
    F --> G[Προεπισκόπηση Αποτελεσμάτων]
    G --> H{Όλα Σωστά?}
    H -->|Όχι| I[Επεξεργασία Δαπανών]
    I --> F
    H -->|Ναι| J[Οριστική Έκδοση]
    J --> K[Αποστολή Ειδοποιητηρίων]
    K --> L[Ενημέρωση Οφειλών]
    L --> M[Μεταφορά σε<br/>"Εκδοθείσες Δαπάνες"]
    
    style A fill:#e8f5e8
    style M fill:#fff3e0
```

## 📊 Πυλώνας 3: Διαχείριση Αποθεματικού

```mermaid
flowchart TD
    A[Κεντρική Οθόνη] --> B[Επισκόπηση Αποθεματικού]
    A --> C[Κατάσταση Οφειλών]
    A --> D[Κινήσεις Ταμείου]
    
    B --> E[Τρέχον Αποθεματικό]
    B --> F[Συνολικές Οφειλές]
    B --> G[Γράφημα Ταμειακής Ροής]
    
    C --> H[Λίστα Διαμερισμάτων]
    C --> I[Υπόλοιπα ανά Διαμέρισμα]
    
    D --> J[Ιστορικό Κινήσεων]
    D --> K[Πρόσφατες Συναλλαγές]
    
    H --> L[Επιλογή Διαμερίσματος]
    L --> M[Καταχώρηση Πληρωμής]
    M --> N[Ενημέρωση Υπόλοιπου]
    N --> O[Προσθήκη στο Αποθεματικό]
    O --> P[Δημιουργία Εγγραφής<br/>Κίνησης]
    P --> Q[Ενημέρωση Ιστορικού<br/>Πληρωμών]
    
    style A fill:#fff3e0
    style Q fill:#e1f5fe
```

## 🔄 Ροή Δεδομένων - Λεπτομερές Διάγραμμα

```mermaid
graph LR
    subgraph "Εισροή Δεδομένων"
        A1[Διαχειριστής] --> A2[Φόρμα Δαπάνης]
        A2 --> A3[Κατηγοριοποίηση]
        A3 --> A4[Αποθήκευση]
    end
    
    subgraph "Επεξεργασία"
        B1[Ανέκδοτες Δαπάνες] --> B2[Υπολογισμός Μεριδίων]
        B2 --> B3[Αλγόριθμος Κατανομής]
        B3 --> B4[Προεπισκόπηση]
        B4 --> B5[Έκδοση]
    end
    
    subgraph "Αποθήκευση & Διαχείριση"
        C1[Εκδοθείσες Δαπάνες] --> C2[Ενημέρωση Οφειλών]
        C2 --> C3[Κεντρική Οθόνη]
        C3 --> C4[Πληρωμές]
        C4 --> C5[Ενημέρωση Αποθεματικού]
    end
    
    subgraph "Αναφορά & Επιθεώρηση"
        D1[Κινήσεις Ταμείου] --> D2[Ιστορικό Πληρωμών]
        D2 --> D3[Αναφορές]
        D3 --> D4[Εξαγωγή Δεδομένων]
    end
    
    A4 --> B1
    B5 --> C1
    C5 --> D1
    
    style A1 fill:#e3f2fd
    style B2 fill:#e8f5e8
    style C3 fill:#fff3e0
    style D1 fill:#fce4ec
```

## 🗄️ Δομή Βάσης Δεδομένων

```mermaid
erDiagram
    BUILDINGS {
        int id PK
        string name
        text address
        decimal current_reserve
        timestamp created_at
    }
    
    APARTMENTS {
        int id PK
        int building_id FK
        string number
        string owner_name
        int participation_mills
        decimal current_balance
        timestamp created_at
    }
    
    EXPENSES {
        int id PK
        int building_id FK
        string title
        decimal amount
        date date
        string category
        string distribution_type
        string attachment_url
        text notes
        boolean is_issued
        timestamp created_at
    }
    
    EXPENSE_APARTMENTS {
        int id PK
        int expense_id FK
        int apartment_id FK
    }
    
    METER_READINGS {
        int id PK
        int apartment_id FK
        date reading_date
        decimal value
        string meter_type
    }
    
    TRANSACTIONS {
        int id PK
        int building_id FK
        timestamp date
        string type
        text description
        string apartment_number
        decimal amount
        decimal balance_after
        string receipt_url
        timestamp created_at
    }
    
    PAYMENTS {
        int id PK
        int apartment_id FK
        decimal amount
        date date
        string method
        text notes
        timestamp created_at
    }
    
    BUILDINGS ||--o{ APARTMENTS : "έχει"
    BUILDINGS ||--o{ EXPENSES : "έχει"
    BUILDINGS ||--o{ TRANSACTIONS : "έχει"
    APARTMENTS ||--o{ EXPENSE_APARTMENTS : "σχετίζεται"
    EXPENSES ||--o{ EXPENSE_APARTMENTS : "σχετίζεται"
    APARTMENTS ||--o{ METER_READINGS : "έχει"
    APARTMENTS ||--o{ PAYMENTS : "έχει"
```

## 🎨 Αρχιτεκτονική Frontend Components

```mermaid
graph TD
    subgraph "Financial Components"
        A[FinancialDashboard] --> B[ExpenseForm]
        A --> C[CommonExpenseCalculator]
        A --> D[PaymentForm]
        A --> E[TransactionHistory]
        A --> F[ApartmentBalances]
    end
    
    subgraph "UI Components"
        G[CategorySelector] --> B
        H[DistributionSelector] --> B
        I[FileUpload] --> B
        J[FileUpload] --> D
    end
    
    subgraph "Hooks"
        K[useExpenses] --> B
        L[useCommonExpenses] --> C
        M[usePayments] --> D
    end
    
    subgraph "Types"
        N[financial.ts] --> K
        N --> L
        N --> M
    end
    
    style A fill:#e3f2fd
    style B fill:#f3e5f5
    style C fill:#e8f5e8
    style D fill:#fff3e0
```

## 🔒 Ασφάλεια & Audit Trail

```mermaid
flowchart TD
    A[Χρήστης Ενέργεια] --> B[Authentication Check]
    B --> C{Εξουσιοδοτημένος?}
    C -->|Όχι| D[Απόρριψη]
    C -->|Ναι| E[Εκτέλεση Ενέργειας]
    E --> F[Audit Log Entry]
    F --> G[Ενημέρωση Δεδομένων]
    G --> H[Response to User]
    
    subgraph "Audit Log"
        I[User ID]
        J[Action]
        K[Entity Type]
        L[Entity ID]
        M[Old Values]
        N[New Values]
        O[Timestamp]
        P[IP Address]
    end
    
    F --> I
    F --> J
    F --> K
    F --> L
    F --> M
    F --> N
    F --> O
    F --> P
    
    style A fill:#e3f2fd
    style H fill:#e8f5e8
    style F fill:#fff3e0
```

---

## 📋 Περίληψη Βασικών Αρχών

### 🎯 Βασικές Αρχές Σχεδιασμού
1. **Απλότητα**: Ελάχιστη πολυπλοκότητα για τον διαχειριστή
2. **Διαφάνεια**: Όλες οι κινήσεις είναι ορατές και καταγραμμένες
3. **Αυτοματοποίηση**: Ελάχιστη χειροκίνητη παρέμβαση
4. **Ασφάλεια**: Πλήρες audit trail και έλεγχος πρόσβασης
5. **Ευελιξία**: Υποστήριξη διαφορετικών τρόπων κατανομής

### 🔄 Κύριος Κύκλος Εργασίας
1. **Εισροή**: Καταχώρηση δαπανών με κατηγοριοποίηση
2. **Επεξεργασία**: Αυτόματος υπολογισμός και έκδοση
3. **Εικόνα**: Διαφανής διαχείριση αποθεματικού και πληρωμών
4. **Επιστροφή**: Ενημέρωση και αναφορά για νέο κύκλο

### 🎨 Βασικά Χαρακτηριστικά UI/UX
- **Intuitive Interface**: Εύκολη πλοήγηση και λειτουργία
- **Real-time Updates**: Άμεση ενημέρωση όλων των οθονών
- **Responsive Design**: Λειτουργία σε όλες τις συσκευές
- **Accessibility**: Προσβασιμότητα για όλους τους χρήστες 