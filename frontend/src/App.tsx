import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DayAheadDesk } from './components/DayAheadDesk';
import { AnalyticsView } from './components/AnalyticsView';
import { ProcurementSimulator } from './components/ProcurementSimulator';
import { EventExplorer } from './components/EventExplorer';
import { 
  DayAheadResponse, 
  AnalyticsResponse, 
  HorizonMetric, 
  SettlementPeriodProfile, 
  DistributionResponse 
} from './types';
import { 
  fetchDayAhead, 
  fetchAnalyticsMetrics, 
  fetchHorizonAnalysis, 
  fetchSettlementPeriodProfile, 
  fetchErrorDistribution 
} from './api';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('desk');
  const [deliveryDate, setDeliveryDate] = useState<string>('2026-01-15');
  const [cutoffTime, setCutoffTime] = useState<string>('11:00');

  const [dayAheadData, setDayAheadData] = useState<DayAheadResponse | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsResponse | null>(null);
  const [horizons, setHorizons] = useState<HorizonMetric[]>([]);
  const [profiles, setProfiles] = useState<SettlementPeriodProfile[]>([]);
  const [distribution, setDistribution] = useState<DistributionResponse | null>(null);

  const [loadingDesk, setLoadingDesk] = useState<boolean>(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch Day-Ahead data on date or cutoff change
  useEffect(() => {
    let isCurrent = true;
    const loadDesk = async () => {
      setLoadingDesk(true);
      setErrorMsg(null);
      try {
        const res = await fetchDayAhead(deliveryDate, cutoffTime);
        if (isCurrent) setDayAheadData(res);
      } catch (err: any) {
        if (isCurrent) setErrorMsg(err.message);
      } finally {
        if (isCurrent) setLoadingDesk(false);
      }
    };
    loadDesk();
    return () => { isCurrent = false; };
  }, [deliveryDate, cutoffTime]);

  // Fetch January 2026 overall analytics once or on cutoff change
  useEffect(() => {
    let isCurrent = true;
    const loadAnalytics = async () => {
      setLoadingAnalytics(true);
      try {
        const [aRes, hRes, pRes, dRes] = await Promise.all([
          fetchAnalyticsMetrics('2026-01-01', '2026-01-31', cutoffTime),
          fetchHorizonAnalysis('2026-01-01', '2026-01-31'),
          fetchSettlementPeriodProfile('2026-01-01', '2026-01-31', cutoffTime),
          fetchErrorDistribution('2026-01-01', '2026-01-31', cutoffTime),
        ]);
        if (isCurrent) {
          setAnalyticsData(aRes);
          setHorizons(hRes);
          setProfiles(pRes);
          setDistribution(dRes);
        }
      } catch (err: any) {
        console.error('Error fetching analytics:', err);
      } finally {
        if (isCurrent) setLoadingAnalytics(false);
      }
    };
    loadAnalytics();
    return () => { isCurrent = false; };
  }, [cutoffTime]);

  // Quick event / calendar date selection
  const handleSelectDate = (date: string) => {
    setDeliveryDate(date);
    setActiveTab('desk');
  };

  return (
    <div className="min-h-screen bg-[#080D1A] flex flex-col selection:bg-cyan-500 selection:text-white">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        deliveryDate={deliveryDate}
        setDeliveryDate={setDeliveryDate}
        cutoffTime={cutoffTime}
        setCutoffTime={setCutoffTime}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {errorMsg && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
            <strong>Error connecting to trading server:</strong> {errorMsg}
          </div>
        )}

        {activeTab === 'desk' && (
          <DayAheadDesk
            data={dayAheadData}
            loading={loadingDesk}
            deliveryDate={deliveryDate}
            cutoffTime={cutoffTime}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView
            analytics={analyticsData}
            horizons={horizons}
            profiles={profiles}
            distribution={distribution}
            loading={loadingAnalytics}
            onSelectDate={handleSelectDate}
            cutoffTime={cutoffTime}
          />
        )}

        {activeTab === 'procurement' && (
          <ProcurementSimulator
            deliveryDate={deliveryDate}
            cutoffTime={cutoffTime}
          />
        )}

        {activeTab === 'events' && (
          <EventExplorer onSelectEvent={handleSelectDate} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-[#060A14] py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-400">AERO-WIND GB</span>
            <span>•</span>
            <span>UK Day-Ahead Wholesale Power Market Decision Support Platform</span>
          </div>
          <div className="flex items-center gap-4 text-slate-500">
            <span>Data: Elexon BMRS FUELHH & WINDFOR</span>
            <span>•</span>
            <span>Delivery: January 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
