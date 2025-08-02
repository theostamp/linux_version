# 💬 Chat System - Συστημα Επικοινωνίας Πολυκατοικιών

## 📋 Επισκόπηση

Το **Chat System** είναι ένα ολοκληρωμένο σύστημα real-time επικοινωνίας για την εφαρμογή διαχείρισης πολυκατοικιών. Επιτρέπει σε κατοίκους και διαχειριστές να επικοινωνούν άμεσα μέσω ενός modern chat interface.

## 🚀 Δυνατότητες

### ✅ Υλοποιημένες
- **Real-time Chat Interface**: Modern UI με Tailwind CSS
- **Multi-tenant Support**: Κάθε κτίριο έχει το δικό του chat room
- **Message Types**: Text, files, images support
- **User Roles**: Διαχειριστές και κάτοικοι με διαφορετικά δικαιώματα
- **Message Editing**: Επεξεργασία δικών σας μηνυμάτων
- **File Upload**: Upload και προβολή αρχείων
- **Online Status**: Προβολή ποιος είναι συνδεδεμένος
- **Responsive Design**: Λειτουργικό σε όλες τις συσκευές

### 🔄 Σε Εξέλιξη
- **WebSocket Integration**: Real-time communication
- **Push Notifications**: Ειδοποιήσεις για νέα μηνύματα
- **Message Search**: Αναζήτηση σε ιστορικό
- **Voice Messages**: Φωνητικά μηνύματα
- **Video Calls**: Ομαδικές κλήσεις

## 🏗️ Αρχιτεκτονική

### Backend (Django + Django Channels)
```
backend/chat/
├── models.py          # Database models
├── views.py           # API endpoints
├── serializers.py     # Data serialization
├── consumers.py       # WebSocket handlers
├── routing.py         # WebSocket routing
├── urls.py            # URL patterns
└── admin.py           # Django admin
```

### Frontend (Next.js + React)
```
frontend/
├── components/
│   ├── ChatInterface.tsx           # Κύριο chat component
│   └── ChatNotificationBadge.tsx   # Notification badge
├── app/(dashboard)/chat/
│   └── page.tsx                    # Chat page
└── components/ui/                  # UI components
    ├── badge.tsx
    ├── avatar.tsx
    ├── scroll-area.tsx
    ├── separator.tsx
    └── toast.tsx
```

## 🔧 Εγκατάσταση

### 1. Backend Dependencies
```bash
cd backend
pip install -r requirements.txt
```

**Προστέθηκαν:**
- `channels==4.0.0` - WebSocket support
- `channels-redis==4.1.0` - Redis backend
- `daphne==4.0.0` - ASGI server
- `redis==5.0.1` - Redis client

### 2. Frontend Dependencies
```bash
cd frontend
npm install
```

**Προστέθηκαν:**
- `@radix-ui/react-avatar` - Avatar components
- `@radix-ui/react-scroll-area` - Scroll area
- `@radix-ui/react-separator` - Separator
- `@radix-ui/react-toast` - Toast notifications
- `socket.io-client` - WebSocket client

### 3. Database Setup
```bash
cd backend
python manage.py makemigrations chat
python manage.py migrate
```

### 4. Redis Setup
```bash
# Εκκινήστε το Redis
redis-server

# Ή με Docker
docker run -d -p 6379:6379 redis:7-alpine
```

## 🚀 Εκκίνηση

### Development Mode
```bash
# Terminal 1 - Backend
cd backend
python manage.py runserver

# Terminal 2 - Frontend
cd frontend
npm run dev

# Terminal 3 - Redis (αν δεν τρέχει ήδη)
redis-server
```

### Production Mode
```bash
# Με Docker Compose
docker-compose up -d
```

## 📱 Χρήση

### Για Κατοίκους
1. Συνδεθείτε στην εφαρμογή
2. Επιλέξτε το κτίριό σας
3. Πατήστε "Chat" στο sidebar
4. Ξεκινήστε να συνομιλείτε!

### Για Διαχειριστές
1. Συνδεθείτε ως διαχειριστής
2. Επιλέξτε το κτίριο που διαχειρίζεστε
3. Πλοηγηθείτε στο chat
4. Απαντήστε σε ερωτήσεις κατοίκων

## 🔌 API Endpoints

### Chat Rooms
```
GET    /api/chat/rooms/                    # Λίστα chat rooms
POST   /api/chat/rooms/                    # Δημιουργία chat room
GET    /api/chat/rooms/{id}/               # Λεπτομέρειες chat room
POST   /api/chat/rooms/{id}/join/          # Συμμετοχή σε chat room
POST   /api/chat/rooms/{id}/leave/         # Αποχώρηση από chat room
GET    /api/chat/rooms/{id}/participants/  # Συμμετέχοντες
GET    /api/chat/rooms/{id}/notifications/ # Ειδοποιήσεις
```

### Messages
```
GET    /api/chat/messages/                 # Λίστα μηνυμάτων
POST   /api/chat/messages/                 # Αποστολή μηνύματος
POST   /api/chat/messages/{id}/edit/       # Επεξεργασία μηνύματος
POST   /api/chat/messages/mark_as_read/    # Σήμανση ως διαβασμένα
GET    /api/chat/messages/unread_count/    # Αριθμός μη διαβασμένων
```

### WebSocket
```
ws://localhost:8000/ws/chat/chat_{buildingId}/
```

## 🗄️ Database Schema

### ChatRoom
- `building` - Σύνδεση με κτίριο
- `name` - Όνομα chat room
- `is_active` - Αν είναι ενεργό

### ChatMessage
- `chat_room` - Σύνδεση με chat room
- `sender` - Αποστολέας μηνύματος
- `content` - Περιεχόμενο μηνύματος
- `message_type` - Τύπος μηνύματος (text, image, file)
- `is_edited` - Αν έχει επεξεργαστεί
- `file_url`, `file_name`, `file_size` - Για αρχεία

### ChatParticipant
- `chat_room` - Σύνδεση με chat room
- `user` - Χρήστης
- `is_online` - Αν είναι συνδεδεμένος
- `last_seen` - Τελευταία εμφάνιση

### ChatNotification
- `user` - Χρήστης
- `chat_room` - Chat room
- `unread_count` - Αριθμός μη διαβασμένων
- `last_read_at` - Τελευταία ανάγνωση

## 🎨 UI Components

### ChatInterface
- **Real-time Messages**: Άμεση εμφάνιση μηνυμάτων
- **Message Bubbles**: Modern chat bubbles με χρώματα ανά ρόλο
- **File Preview**: Προβολή αρχείων και εικόνων
- **Typing Indicators**: Δείκτες πληκτρολόγησης
- **Online Status**: Προβολή ποιος είναι συνδεδεμένος

### ChatNotificationBadge
- **Unread Counter**: Αριθμός μη διαβασμένων μηνυμάτων
- **Click to Mark Read**: Σήμανση ως διαβασμένα με κλικ
- **Real-time Updates**: Αυτόματη ενημέρωση

## 🔒 Ασφάλεια

### Multi-tenant Isolation
- Κάθε κτίριο έχει ξεχωριστό chat room
- Χρήστες βλέπουν μόνο τα chat rooms των κτιρίων τους

### Role-based Access
- **Διαχειριστές**: Πρόσβαση σε όλα τα chat rooms των κτιρίων που διαχειρίζονται
- **Κάτοικοι**: Πρόσβαση μόνο στο chat room του κτιρίου τους

### Message Security
- Μόνο ο αποστολέας μπορεί να επεξεργαστεί το μήνυμά του
- Validation για όλα τα inputs
- XSS protection

## 🐛 Troubleshooting

### Common Issues

#### 1. WebSocket δεν συνδέεται
```bash
# Ελέγξτε αν τρέχει το Redis
redis-cli ping

# Ελέγξτε τα CORS settings
# Ελέγξτε αν το backend τρέχει με ASGI
```

#### 2. Chat δεν εμφανίζεται
```bash
# Ελέγξτε αν έγινε migrate
python manage.py migrate

# Ελέγξτε αν το chat app είναι στο INSTALLED_APPS
# Ελέγξτε τα browser console errors
```

#### 3. Messages δεν αποθηκεύονται
```bash
# Ελέγξτε τα database permissions
# Ελέγξτε τα API endpoints
# Ελέγξτε τα authentication tokens
```

### Debug Mode
```bash
# Backend debug
python manage.py runserver --verbosity=2

# Frontend debug
npm run dev -- --debug
```

## 🔮 Μελλοντικές Βελτιώσεις

### Phase 2 - Real-time Features
- [ ] WebSocket integration
- [ ] Push notifications
- [ ] Typing indicators
- [ ] Read receipts

### Phase 3 - Advanced Features
- [ ] Message search
- [ ] File upload with preview
- [ ] Voice messages
- [ ] Video calls

### Phase 4 - AI Integration
- [ ] Chatbot for common questions
- [ ] Message translation
- [ ] Smart notifications
- [ ] Sentiment analysis

## 📞 Υποστήριξη

Για ερωτήσεις ή προβλήματα:
1. Ελέγξτε τα logs στο browser console
2. Ελέγξτε τα Django logs
3. Ελέγξτε το troubleshooting section
4. Δημιουργήστε issue στο repository

---

**🎉 Το Chat System είναι έτοιμο για χρήση!** 

Μετά από το rebuild, μπορείτε να βρείτε το chat στο:
- **URL**: `http://localhost:8080/chat`
- **Sidebar**: Πατήστε το εικονίδιο "Chat" στο sidebar
- **Navigation**: Πλοηγηθείτε στο `/chat` από οποιοδήποτε κτίριο 