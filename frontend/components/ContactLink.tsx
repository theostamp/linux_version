import { Phone, Mail } from 'lucide-react';

interface ContactLinkProps {
  type: 'phone' | 'email';
  value: string;
  className?: string;
  showIcon?: boolean;
}

export default function ContactLink({ type, value, className = '', showIcon = true }: ContactLinkProps) {
  if (!value) return null;

  const formatPhone = (phone: string) => {
    // Καθαρίζουμε το τηλέφωνο από spaces και άλλους χαρακτήρες
    const cleanPhone = phone.replace(/\s+/g, '').replace(/[^\d+]/g, '');
    return cleanPhone;
  };

  const getHref = () => {
    if (type === 'phone') {
      return `tel:${formatPhone(value)}`;
    } else {
      return `mailto:${value}`;
    }
  };

  const getIcon = () => {
    if (!showIcon) return null;
    
    if (type === 'phone') {
      return <Phone className="w-3 h-3 mr-1 text-gray-500" />;
    } else {
      return <Mail className="w-3 h-3 mr-1 text-gray-500" />;
    }
  };

  return (
    <a
      href={getHref()}
      className={`flex items-center text-blue-600 hover:text-blue-800 hover:underline transition-colors ${className}`}
      title={type === 'phone' ? `Κλήση στο ${value}` : `Αποστολή email στο ${value}`}
    >
      {getIcon()}
      {value}
    </a>
  );
} 