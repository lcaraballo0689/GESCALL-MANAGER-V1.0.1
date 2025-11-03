import { useState, useEffect } from 'react';
import { Sun, Sunset, Moon, Calendar, Clock } from 'lucide-react';

interface UserGreetingProps {
  username: string;
}

export function UserGreeting({ username }: UserGreetingProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const getGreetingData = () => {
    const hour = currentTime.getHours();
    if (hour >= 6 && hour < 12) {
      return { text: 'Buenos días', icon: Sun, color: 'text-amber-500' };
    } else if (hour >= 12 && hour < 20) {
      return { text: 'Buenas tardes', icon: Sunset, color: 'text-orange-500' };
    } else {
      return { text: 'Buenas noches', icon: Moon, color: 'text-indigo-500' };
    }
  };

  const formatDate = () => {
    return currentTime.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = () => {
    return currentTime.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const greetingData = getGreetingData();
  const GreetingIcon = greetingData.icon;

  return (
    <div className="text-right min-w-[320px]">
      {/* Greeting with shimmer effect */}
      <div className="flex items-center justify-end gap-2.5 mb-2">
        <div className={`${greetingData.color} flex-shrink-0`}>
          <GreetingIcon className="w-6 h-6" />
        </div>
        <div className="relative">
          <div className="text-xl relative leading-tight">
            <span className="text-slate-900">{greetingData.text}, </span>
            <span className="shimmer-text">{username}</span>
          </div>
        </div>
      </div>
      
      {/* Date and Time */}
      <div className="space-y-0.5 mt-1.5">
        <div className="flex items-center justify-end gap-2 text-sm text-slate-600">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span className="capitalize">{formatDate()}</span>
        </div>
        <div className="flex items-center justify-end gap-2 text-sm text-slate-600">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span className="tabular-nums">{formatTime()}</span>
        </div>
      </div>
      
      <style>{`
        @keyframes shimmer {
          0% {
            background-position: -100% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
        
        .shimmer-text {
          background: linear-gradient(
            90deg,
            #0f172a 0%,
            #0f172a 40%,
            #3b82f6 50%,
            #0f172a 60%,
            #0f172a 100%
          );
          background-size: 200% 100%;
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 3s linear infinite;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
