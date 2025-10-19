/**
 * WebSocket Service for Real-time Notifications
 * Handles WebSocket connections and real-time updates
 */

class WebSocketService {
  constructor() {
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 3000;
    this.listeners = new Map();
    this.isConnected = false;
  }

  /**
   * Connect to WebSocket server
   */
  connect(token) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      // WebSocket URL - adjust based on your backend configuration
      const wsUrl = `ws://localhost:18000/ws/notifications/?token=${token}`;
      
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = (event) => {
        console.log('WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.emit('connected', event);
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.socket.onclose = (event) => {
        console.log('WebSocket disconnected');
        this.isConnected = false;
        this.emit('disconnected', event);
        
        // Attempt to reconnect
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          setTimeout(() => {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            this.connect(token);
          }, this.reconnectInterval);
        }
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.emit('error', error);
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.isConnected = false;
    }
  }

  /**
   * Send message to WebSocket server
   */
  send(message) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  handleMessage(data) {
    const { type } = data;
    
    switch (type) {
      case 'connection_established':
        this.emit('connection_established', data);
        break;
        
      case 'notification':
        this.emit('notification', data);
        this.showNotification(data);
        break;
        
      case 'payment_notification':
        this.emit('payment_notification', data);
        this.showNotification(data);
        break;
        
      case 'subscription_notification':
        this.emit('subscription_notification', data);
        this.showNotification(data);
        break;
        
      case 'system_notification':
        this.emit('system_notification', data);
        this.showNotification(data);
        break;
        
      case 'dashboard_update':
        this.emit('dashboard_update', data);
        break;
        
      case 'stats_update':
        this.emit('stats_update', data);
        break;
        
      case 'chat_message':
        this.emit('chat_message', data);
        break;
        
      case 'pong':
        this.emit('pong', data);
        break;
        
      case 'error':
        this.emit('error', data);
        break;
        
      default:
        console.log('Unknown message type:', type, data);
    }
  }

  /**
   * Show browser notification
   */
  showNotification(data) {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(data.title, {
        body: data.message,
        icon: '/favicon.ico',
        tag: data.type
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);
    }
  }

  /**
   * Request notification permission
   */
  async requestNotificationPermission() {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }

  /**
   * Subscribe to specific notification types
   */
  subscribe(types) {
    this.send({
      type: 'subscribe',
      types: types
    });
  }

  /**
   * Unsubscribe from specific notification types
   */
  unsubscribe(types) {
    this.send({
      type: 'unsubscribe',
      types: types
    });
  }

  /**
   * Send ping to keep connection alive
   */
  ping() {
    this.send({
      type: 'ping',
      timestamp: Date.now()
    });
  }

  /**
   * Event listener management
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in event callback:', error);
        }
      });
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      readyState: this.socket ? this.socket.readyState : null,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

// Create singleton instance
const webSocketService = new WebSocketService();

// Auto-ping every 30 seconds to keep connection alive
setInterval(() => {
  if (webSocketService.isConnected) {
    webSocketService.ping();
  }
}, 30000);

export default webSocketService;
