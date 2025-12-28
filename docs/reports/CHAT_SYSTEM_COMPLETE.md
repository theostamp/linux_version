# 💬 Σύστημα Chat Κτιρίων - Ολοκληρωμένη Υλοποίηση

## 📋 Περιγραφή

Ένα πλήρες σύστημα real-time επικοινωνίας μεταξύ ενοίκων και διαχειριστών κτιρίων.

## ✅ Υλοποιημένα Features

### Backend (Django)
- ✅ **Models**: ChatRoom, ChatMessage, ChatParticipant, ChatNotification
- ✅ **REST API**: ViewSets για CRUD operations
- ✅ **WebSocket**: Real-time messaging με Django Channels
- ✅ **Typing Indicators**: Δείκτες πληκτρολόγησης
- ✅ **Read Receipts**: Αποδείξεις ανάγνωσης
- ✅ **Online Status**: Κατάσταση σύνδεσης χρηστών
- ✅ **Auto Chat Room Creation**: Αυτόματη δημιουργία chat room για νέα κτίρια

### Frontend (Next.js)
- ✅ **ChatInterface**: Πλήρης διεπαφή chat με σύγχρονο design
- ✅ **useChat Hook**: WebSocket σύνδεση και state management
- ✅ **ChatNotificationBadge**: Badge για μη διαβασμένα μηνύματα στο Sidebar
- ✅ **Message Grouping**: Ομαδοποίηση μηνυμάτων ανά ημέρα
- ✅ **Role Badges**: Εμφάνιση ρόλου (Διαχειριστής, Κάτοικος, κλπ)
- ✅ **Responsive Design**: Mobile-friendly interface
- ✅ **Auto Reconnect**: Αυτόματη επανασύνδεση με exponential backoff

## 📁 Δομή Αρχείων

### Backend
```
backend/chat/
├── __init__.py
├── admin.py          # Django Admin configuration
├── apps.py           # App config με signals
├── consumers.py      # WebSocket consumers
├── models.py         # Database models
├── routing.py        # WebSocket URL routing
├── serializers.py    # DRF serializers
├── signals.py        # Auto chat room creation
├── urls.py           # REST API URLs
├── views.py          # ViewSets
└── management/
    └── commands/
        └── create_chat_rooms.py  # Management command
```

### Frontend
```
public-app/src/
├── types/
│   └── chat.ts                    # TypeScript types
├── hooks/
│   └── useChat.ts                 # WebSocket + REST hooks
├── components/
│   └── chat/
│       ├── index.ts               # Exports
│       ├── ChatInterface.tsx      # Main interface
│       └── ChatNotificationBadge.tsx  # Notification badge
└── app/(dashboard)/
    └── chat/
        └── page.tsx               # Chat page
```

## 🚀 Χρήση

### 1. Δημιουργία Chat Rooms για υπάρχοντα κτίρια

```bash
cd backend
python manage.py create_chat_rooms
```

Για preview χωρίς δημιουργία:
```bash
python manage.py create_chat_rooms --dry-run
```

### 2. Πρόσβαση στο Chat

Οι χρήστες μπορούν να πλοηγηθούν στο `/chat` από το Sidebar.

### 3. Ρόλοι και Δικαιώματα

| Ρόλος | Δικαιώματα |
|-------|------------|
| Manager | Πλήρης πρόσβαση σε όλα τα κτίρια που διαχειρίζεται |
| Internal Manager | Πρόσβαση στο κτίριο που είναι εσωτερικός διαχειριστής |
| Resident | Πρόσβαση στο κτίριο που κατοικεί |
| Staff | Πρόσβαση βάσει των κτιρίων που έχει πρόσβαση |
| Superuser | Πρόσβαση σε όλα τα chat rooms |

## 🔧 WebSocket Configuration

### Development
```javascript
// Σύνδεση στο ws://localhost:18000/ws/chat/{building_id}/
```

### Production
```env
# Προσθέστε στο .env
NEXT_PUBLIC_BACKEND_WS_URL=your-backend-host.com
```

## 📊 API Endpoints

### REST API

| Method | Endpoint | Περιγραφή |
|--------|----------|-----------|
| GET | `/api/chat/rooms/` | Λίστα chat rooms |
| POST | `/api/chat/rooms/get_or_create_for_building/` | Δημιουργία/ανάκτηση room για κτίριο |
| GET | `/api/chat/rooms/{id}/participants/` | Συμμετέχοντες |
| POST | `/api/chat/rooms/{id}/join/` | Είσοδος σε room |
| POST | `/api/chat/rooms/{id}/leave/` | Αποχώρηση από room |
| GET | `/api/chat/messages/` | Λίστα μηνυμάτων |
| POST | `/api/chat/messages/` | Αποστολή μηνύματος |
| GET | `/api/chat/messages/unread_count/` | Σύνολο μη διαβασμένων |
| POST | `/api/chat/messages/mark_as_read/` | Σήμανση ως διαβασμένα |

### WebSocket Messages

**Client → Server:**
```json
// Αποστολή μηνύματος
{"type": "message", "message": "Γεια σας!", "message_type": "text"}

// Typing indicator
{"type": "typing", "is_typing": true}

// Read receipt
{"type": "read", "message_id": 123}
```

**Server → Client:**
```json
// Νέο μήνυμα
{
  "type": "chat_message",
  "message_id": 1,
  "sender_id": 5,
  "sender_name": "Γιάννης Παπαδόπουλος",
  "sender_role": "manager",
  "content": "Καλημέρα σε όλους!",
  "message_type": "text",
  "timestamp": "2025-12-03T10:30:00Z"
}

// Typing indicator
{"type": "typing_indicator", "user_id": 5, "user_name": "Γιάννης", "is_typing": true}

// User join/leave
{"type": "user_join", "user_id": 5, "user_name": "Γιάννης"}
```

## 🎨 UI Features

- **Σύγχρονο Design**: Gradient backgrounds, shadows, rounded corners
- **Role Badges**: Χρωματικά διαφοροποιημένα badges ανά ρόλο
- **Message Grouping**: Αυτόματη ομαδοποίηση μηνυμάτων ανά χρήστη
- **Date Separators**: Ημερολογιακοί διαχωριστές
- **Typing Animation**: Animated dots όταν κάποιος γράφει
- **Online Status**: Green dot για online users
- **Notification Badge**: Κόκκινο badge με αριθμό μη διαβασμένων

## 🔐 Ασφάλεια

- JWT Authentication για REST API
- WebSocket authentication μέσω Django Channels AuthMiddlewareStack
- Building-level access control
- Role-based permissions

## 📝 Μελλοντικές Βελτιώσεις

- [ ] File uploads (εικόνες, έγγραφα)
- [ ] Emoji picker
- [ ] Message reactions
- [ ] Message search
- [ ] Direct messages (1-to-1)
- [ ] Push notifications
- [ ] Message deletion
- [ ] Message editing
- [ ] Quote/Reply to messages
- [ ] Pinned messages

---

*Τελευταία ενημέρωση: 3 Δεκεμβρίου 2025*

