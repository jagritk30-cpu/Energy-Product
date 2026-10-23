import React from 'react';
import { 
  Wind, 
  Calendar, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Activity, 
  BarChart3, 
  ShieldCheck, 
  Compass 
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  deliveryDate: string;
  setDeliveryDate: (date: string) => void;
  cutoffTime: string;
  setCutoffTime: (time: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  deliveryDate,
  setDeliveryDate,
  cutoffTime,
  setCutoffTime,
}) => {
  const handlePrevDay = () => {
    const d = new Date(deliveryDate);
    d.setDate(d.getDate() - 1);
    if (d >= new Date('2026-01-01')) {
      setDeliveryDate(d.toISOString().split('T')[0]);
    }
  };

  const handleNextDay = () => {
    const d = new Date(deliveryDate);
    d.setDate(d.getDate() + 1);
    if (d <= new Date('2026-01-31')) {
      setDeliveryDate(d.toISOString().split('T')[0]);
    }
  };

  return (
    <header className="border-b border-slate-800/80 bg-[#0B1120]/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Wind className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-cyan-300 bg-clip-text text-transparent">
                  AERO-WIND <span className="text-cyan-400 font-light">GB</span>
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-full tracking-wider uppercase">
                  BMRS Elexon
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Day-Ahead Wholesale Procurement & Wind Forecast Intelligence • Jan 2026
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('desk')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'desk'
                  ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Decision Desk
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'analytics'
                  ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Accuracy Analytics
            </button>
            <button
              onClick={() => setActiveTab('procurement')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'procurement'
                  ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Thermal Procurement Gap
            </button>
            <button
              onClick={() => setActiveTab('events')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'events'
                  ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              Event Explorer
            </button>
          </nav>

          {/* Quick Date & Cutoff Time Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Delivery Date Picker */}
            <div className="flex items-center bg-slate-900 border border-slate-750 border-slate-800 rounded-lg p-1 text-xs">
              <button
                onClick={handlePrevDay}
                disabled={deliveryDate === '2026-01-01'}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
                title="Previous Day"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              
              <div className="flex items-center gap-1.5 px-2">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                <input
                  type="date"
                  min="2026-01-01"
                  max="2026-01-31"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="bg-transparent text-white font-mono text-xs focus:outline-none cursor-pointer"
                />
              </div>

              <button
                onClick={handleNextDay}
                disabled={deliveryDate === '2026-01-31'}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
                title="Next Day"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Cutoff Time Selector */}
            <div className="hidden lg:flex items-center bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs">
              <Clock className="w-3.5 h-3.5 text-amber-400 mr-2" />
              <span className="text-slate-400 mr-1.5 font-medium">D-1 Cutoff:</span>
              <select
                value={cutoffTime}
                onChange={(e) => setCutoffTime(e.target.value)}
                className="bg-slate-900 text-white font-mono font-medium focus:outline-none cursor-pointer"
              >
                <option value="11:00">11:00 (EPEX Spot DA)</option>
                <option value="12:00">12:00 (Nord Pool DA)</option>
                <option value="09:00">09:00 (Early Morning)</option>
                <option value="14:00">14:00 (Post-Auction)</option>
                <option value="17:00">17:00 (Evening Close)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Mobile Tab Bar */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('desk')}
            className={`px-2 py-1 rounded ${activeTab === 'desk' ? 'text-cyan-400 font-bold' : 'text-slate-400'}`}
          >
            Decision Desk
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-2 py-1 rounded ${activeTab === 'analytics' ? 'text-cyan-400 font-bold' : 'text-slate-400'}`}
          >
            Accuracy
          </button>
          <button
            onClick={() => setActiveTab('procurement')}
            className={`px-2 py-1 rounded ${activeTab === 'procurement' ? 'text-cyan-400 font-bold' : 'text-slate-400'}`}
          >
            Procurement
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`px-2 py-1 rounded ${activeTab === 'events' ? 'text-cyan-400 font-bold' : 'text-slate-400'}`}
          >
            Events
          </button>
        </div>
      </div>
    </header>
  );
};
