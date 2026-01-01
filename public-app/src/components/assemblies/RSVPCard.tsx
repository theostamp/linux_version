'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Video, MapPin, Vote, CheckCircle,
  Clock, Calendar, ArrowRight, Loader2, User,
  Building2, AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAttendeeRSVP } from '@/hooks/useAssemblies';
import type { Assembly, AssemblyAttendee, RSVPStatus } from '@/lib/api';

interface RSVPCardProps {
  assembly: Assembly;
  attendee: AssemblyAttendee | null;
  onPreVoteClick: () => void;
}

type RSVPOption = {
  id: RSVPStatus;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  showPreVote?: boolean;
};

const rsvpOptions: RSVPOption[] = [
  {
    id: 'attending',
    title: 'Θα βρίσκομαι στη συνέλευση',
    subtitle: 'Φυσική παρουσία στον χώρο της συνέλευσης',
    icon: <MapPin className="w-6 h-6" />,
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200 hover:border-emerald-400',
  },
  {
    id: 'not_attending',
    title: 'Θα συμμετέχω ηλεκτρονικά',
    subtitle: 'Ψηφίζω τώρα - δεν θα παρευρεθώ',
    icon: <Video className="w-6 h-6" />,
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200 hover:border-indigo-400',
    showPreVote: true,
  },
  {
    id: 'maybe',
    title: 'Δεν είμαι σίγουρος/η',
    subtitle: 'Θα επιβεβαιώσω αργότερα',
    icon: <AlertCircle className="w-6 h-6" />,
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200 hover:border-amber-400',
  },
];

export default function RSVPCard({ assembly, attendee, onPreVoteClick }: RSVPCardProps) {
  const [selectedOption, setSelectedOption] = useState<RSVPStatus | null>(
    attendee?.rsvp_status !== 'pending' ? attendee?.rsvp_status || null : null
  );
  const [notes, setNotes] = useState(attendee?.rsvp_notes || '');
  const [showNotes, setShowNotes] = useState(false);
  const [step, setStep] = useState<'select' | 'confirm' | 'done'>(
    attendee?.rsvp_status && attendee.rsvp_status !== 'pending' ? 'done' : 'select'
  );

  const rsvpMutation = useAttendeeRSVP();

  const handleOptionSelect = (optionId: RSVPStatus) => {
    setSelectedOption(optionId);
    setStep('confirm');
  };

  const handleConfirm = async () => {
    if (!attendee || !selectedOption) return;

    await rsvpMutation.mutateAsync({
      id: attendee.id,
      status: selectedOption,
      notes
    });

    setStep('done');

    // If they chose electronic participation, prompt for pre-voting
    if (selectedOption === 'not_attending' && assembly.pre_voting_enabled) {
      setTimeout(() => {
        onPreVoteClick();
      }, 500);
    }
  };

  const handleChangeResponse = () => {
    setStep('select');
    setSelectedOption(null);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('el-GR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (timeStr: string) => timeStr.slice(0, 5);

  // If pre-voting is not active yet, show a message
  const isPreVotingPeriod = assembly.is_pre_voting_active;
  const assemblyDate = new Date(assembly.scheduled_date);
  const today = new Date();
  const daysUntilAssembly = Math.ceil((assemblyDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Δήλωση Συμμετοχής</h3>
            <p className="text-sm text-white/80">
              {formatDate(assembly.scheduled_date)} στις {formatTime(assembly.scheduled_time)}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Days until assembly */}
        {daysUntilAssembly > 0 && (
          <div className={cn(
            'mb-6 p-4 rounded-xl flex items-center gap-3',
            daysUntilAssembly <= 3 ? 'bg-amber-50 text-amber-800' : 'bg-blue-50 text-blue-800'
          )}>
            <Clock className="w-5 h-5" />
            <span className="font-medium">
              {daysUntilAssembly === 1
                ? 'Η συνέλευση είναι αύριο!'
                : `${daysUntilAssembly} ημέρες μέχρι τη συνέλευση`}
            </span>
          </div>
        )}

        <AnimatePresence mode="wait">
          {step === 'select' && (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <p className="text-gray-600 mb-4">
                Πώς θα συμμετέχετε στη συνέλευση;
              </p>

              {rsvpOptions.map((option) => (
                <motion.button
                  key={option.id}
                  onClick={() => handleOptionSelect(option.id)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className={cn(
                    'w-full p-4 rounded-xl border-2 text-left transition-all duration-200',
                    option.borderColor,
                    'bg-white hover:shadow-md'
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center',
                      option.bgColor, option.color
                    )}>
                      {option.icon}
                    </div>
                    <div className="flex-1">
                      <h4 className={cn('font-semibold text-base', option.color)}>
                        {option.title}
                      </h4>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {option.subtitle}
                      </p>
                      {option.showPreVote && isPreVotingPeriod && (
                        <div className="mt-2 flex items-center gap-2 text-indigo-600">
                          <Vote className="w-4 h-4" />
                          <span className="text-sm font-medium">Ψηφοφορία διαθέσιμη τώρα</span>
                        </div>
                      )}
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                  </div>
                </motion.button>
              ))}
            </motion.div>
          )}

          {step === 'confirm' && selectedOption && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {(() => {
                const option = rsvpOptions.find(o => o.id === selectedOption)!;
                return (
                  <div className={cn(
                    'p-4 rounded-xl border-2',
                    option.borderColor, option.bgColor
                  )}>
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center',
                        'bg-white', option.color
                      )}>
                        {option.icon}
                      </div>
                      <div>
                        <h4 className={cn('font-semibold', option.color)}>
                          {option.title}
                        </h4>
                        <p className="text-sm text-gray-500">{option.subtitle}</p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Optional notes */}
              <div>
                <button
                  onClick={() => setShowNotes(!showNotes)}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  {showNotes ? 'Απόκρυψη σημείωσης' : '+ Προσθήκη σημείωσης (προαιρετικό)'}
                </button>

                {showNotes && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-2"
                  >
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="π.χ. Θα αργήσω λίγο..."
                      rows={2}
                      className="resize-none"
                    />
                  </motion.div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setStep('select')}
                  className="flex-1"
                >
                  Πίσω
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={rsvpMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                >
                  {rsvpMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Αποθήκευση...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Επιβεβαίωση
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'done' && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4"
            >
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>

              <h4 className="text-lg font-semibold text-gray-900 mb-1">
                Η απάντησή σας καταχωρήθηκε!
              </h4>

              <p className="text-gray-500 text-sm mb-4">
                {selectedOption === 'attending' && 'Θα σας περιμένουμε στη συνέλευση.'}
                {selectedOption === 'not_attending' && 'Ευχαριστούμε! Μπορείτε να ψηφίσετε ηλεκτρονικά.'}
                {selectedOption === 'maybe' && 'Θα σας στείλουμε υπενθύμιση.'}
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleChangeResponse}
                >
                  Αλλαγή απάντησης
                </Button>

                {selectedOption === 'not_attending' && assembly.pre_voting_enabled && isPreVotingPeriod && (
                  <Button
                    size="sm"
                    onClick={onPreVoteClick}
                    className="bg-gradient-to-r from-indigo-500 to-purple-600"
                  >
                    <Vote className="w-4 h-4 mr-2" />
                    Ψηφίστε τώρα
                  </Button>
                )}
              </div>

              {/* Show current response */}
              {attendee && attendee.rsvp_status !== 'pending' && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                  <span className="font-medium">Τρέχουσα απάντηση:</span>{' '}
                  {attendee.rsvp_status_display}
                  {attendee.rsvp_notes && (
                    <span className="block mt-1 text-gray-500">"{attendee.rsvp_notes}"</span>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
