import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock, Globe, Sun, Moon, Send, Sparkles, CheckCircle2,
  Calendar, Building, MapPin, ArrowRight, ShieldCheck, AlertCircle
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

interface TimezoneHub {
  name: string;
  code: string;
  utcOffset: number; // e.g. -5 for EST, -8 for PST
  cities: string;
  states: string[];
}

const TIMEZONE_HUBS: TimezoneHub[] = [
  { name: 'US Eastern Time', code: 'EST', utcOffset: -5, cities: 'New York, Atlanta, Boston, Miami', states: ['NY', 'GA', 'MA', 'FL', 'NC', 'PA', 'NJ'] },
  { name: 'US Central Time', code: 'CST', utcOffset: -6, cities: 'Chicago, Dallas, Houston, Minneapolis', states: ['IL', 'TX', 'TN', 'MN', 'MO', 'WI'] },
  { name: 'US Mountain Time', code: 'MST', utcOffset: -7, cities: 'Denver, Phoenix, Salt Lake City', states: ['CO', 'AZ', 'UT'] },
  { name: 'US Pacific Time', code: 'PST', utcOffset: -8, cities: 'Los Angeles, San Francisco, Seattle', states: ['CA', 'WA', 'OR', 'NV'] },
  { name: 'United Kingdom', code: 'GMT', utcOffset: 0, cities: 'London, Manchester, Birmingham', states: ['UK'] },
  { name: 'Western Europe', code: 'CET', utcOffset: 1, cities: 'Berlin, Paris, Amsterdam, Milan', states: ['DE', 'FR', 'NL', 'IT'] }
];

export default function TimezoneEnginePage() {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [selectedHub, setSelectedHub] = useState<TimezoneHub>(TIMEZONE_HUBS[3]); // Default PST (California)

  // Live timer tick every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch buyers from user database
  const { data: buyersData } = useQuery({
    queryKey: ['buyers-timezone'],
    queryFn: async () => {
      const res = await api.get('/api/buyers?limit=100');
      return res.data;
    }
  });

  // Calculate local time string for a given UTC offset
  const getHubTime = (utcOffset: number) => {
    const utc = currentTime.getTime() + (currentTime.getTimezoneOffset() * 60000);
    const targetDate = new Date(utc + (3600000 * utcOffset));
    return targetDate;
  };

  // Determine office activity status
  const getOfficeStatus = (hour: number) => {
    if (hour >= 9 && hour < 12) {
      return { label: 'Optimal Morning Window', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: Sun, score: '88% Open Rate' };
    } else if (hour >= 12 && hour < 13) {
      return { label: 'Lunch Break', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', icon: Sun, score: '42% Open Rate' };
    } else if (hour >= 13 && hour < 17) {
      return { label: 'Active Afternoon Office Hours', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: Sun, score: '76% Open Rate' };
    } else {
      return { label: 'Off Hours / Night', color: 'text-dark-400 bg-dark-800 border-dark-700', icon: Moon, score: 'Delay Until Morning' };
    }
  };

  // Map buyers to their probable time zone
  const mappedBuyers = useMemo(() => {
    const buyers = buyersData?.buyers || [];
    return buyers.map((b: any) => {
      let hub = TIMEZONE_HUBS[3]; // default PST
      const text = `${b.company_name} ${b.country} ${b.company_description || ''}`.toUpperCase();

      if (text.includes('UK') || text.includes('LONDON') || text.includes('BRITAIN')) hub = TIMEZONE_HUBS[4];
      else if (text.includes('GERMANY') || text.includes('FRANCE') || text.includes('NETHERLANDS') || text.includes('ITALY')) hub = TIMEZONE_HUBS[5];
      else if (text.includes('NEW YORK') || text.includes('GEORGIA') || text.includes('ATLANTA') || text.includes('MIAMI') || text.includes('FLORIDA') || text.includes('BOSTON')) hub = TIMEZONE_HUBS[0];
      else if (text.includes('TEXAS') || text.includes('DALLAS') || text.includes('CHICAGO') || text.includes('ILLINOIS')) hub = TIMEZONE_HUBS[1];
      else if (text.includes('DENVER') || text.includes('COLORADO') || text.includes('ARIZONA')) hub = TIMEZONE_HUBS[2];
      else if (text.includes('CALIFORNIA') || text.includes('LOS ANGELES') || text.includes('SAN FRANCISCO') || text.includes('SEATTLE')) hub = TIMEZONE_HUBS[3];

      const hubDate = getHubTime(hub.utcOffset);
      const hours = hubDate.getHours();
      const status = getOfficeStatus(hours);

      return {
        ...b,
        hub,
        localTimeStr: hubDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        status
      };
    });
  }, [buyersData, currentTime]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-dark-900 border border-dark-800 p-5 rounded-2xl">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary-600/20 border border-primary-500/30 flex items-center justify-center text-primary-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-dark-50">Global Buyer Timezone Matrix & Smart Send Engine</h1>
            <p className="text-xs text-dark-400">Real-time US & European office hours monitoring, optimal email dispatch windows & open rate maximization</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-dark-400 bg-dark-800/80 px-3 py-1.5 rounded-lg border border-dark-700">
          <span>Your Local Time (IST):</span>
          <strong className="text-emerald-400 font-bold">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </strong>
        </div>
      </div>

      {/* Live World Clock Hubs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TIMEZONE_HUBS.map((hub) => {
          const hubDate = getHubTime(hub.utcOffset);
          const hour = hubDate.getHours();
          const status = getOfficeStatus(hour);
          const isSelected = selectedHub.code === hub.code;

          return (
            <div
              key={hub.code}
              onClick={() => setSelectedHub(hub)}
              className={`p-4 rounded-xl border text-xs cursor-pointer transition-all ${
                isSelected
                  ? 'bg-primary-950/40 border-primary-500 shadow-md ring-1 ring-primary-500/30'
                  : 'bg-dark-900 border-dark-800 hover:border-dark-700 hover:bg-dark-800/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-dark-200 text-sm">{hub.name}</span>
                <span className="text-[10px] font-mono text-dark-400 uppercase bg-dark-800 px-1.5 py-0.5 rounded">
                  {hub.code} (UTC{hub.utcOffset >= 0 ? `+${hub.utcOffset}` : hub.utcOffset})
                </span>
              </div>

              {/* Digital Clock */}
              <div className="text-2xl font-black font-mono text-dark-50 mt-2 tracking-tight">
                {hubDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>

              {/* Status Badge */}
              <div className="mt-3 flex items-center justify-between">
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border flex items-center gap-1 ${status.color}`}>
                  <status.icon className="w-3 h-3" />
                  {status.label}
                </span>
                <span className="text-[10px] text-dark-500 font-mono">
                  {status.score}
                </span>
              </div>

              <div className="mt-2 text-[11px] text-dark-400 truncate">
                {hub.cities}
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Grid: Left is Optimal Dispatch Rule, Right is Real-time Buyer Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Strategic Smart Send Rules (lg:col-span-4) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="card p-5 space-y-4">
            <h3 className="text-xs font-bold text-dark-200 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" /> B2B Export Smart Send Rules
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                <span className="font-bold text-emerald-300 block">Peak Open Window (Tuesday - Thursday):</span>
                <p className="text-emerald-200/80 leading-relaxed text-[11px]">
                  US retail buyers review new international vendor proposals between <strong>9:15 AM - 10:45 AM local time</strong>. Schedule outbound sequences to hit this exact window for up to 3.2x higher response rates.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-dark-800 border border-dark-700 space-y-1">
                <span className="font-bold text-dark-200 block">Avoid Monday Mornings & Friday Afternoons:</span>
                <p className="text-dark-400 leading-relaxed text-[11px]">
                  Monday mornings are consumed with internal sales meetings and weekend retail store performance reviews. Cold emails sent on Mondays have the highest archive/unopened rate.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-dark-800 border border-dark-700 space-y-1">
                <span className="font-bold text-dark-200 block">Convert IST to US PST (Los Angeles):</span>
                <p className="text-dark-400 leading-relaxed text-[11px]">
                  When it is <strong>10:00 PM IST (Night)</strong> in India, it is <strong>9:30 AM PST (Morning)</strong> in California. Set your campaign queue to launch at 10:00 PM IST for California buyers.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Live Buyer Timezone Status Table (lg:col-span-8) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-dark-200 uppercase tracking-wider flex items-center gap-1.5">
                <Building className="w-4 h-4 text-primary-400" /> Buyer Real-Time Availability Feed
              </h3>
              <span className="text-[11px] font-mono text-dark-400">
                {mappedBuyers.length} Verified Buyers Tracked
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-dark-800/80 text-dark-400 uppercase text-[10px] tracking-wider font-semibold">
                    <th className="py-2.5 px-3">Company & Buyer</th>
                    <th className="py-2.5 px-3">Market Region</th>
                    <th className="py-2.5 px-3">Current Local Time</th>
                    <th className="py-2.5 px-3 text-right">Status / Outreach Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-800">
                  {mappedBuyers.slice(0, 8).map((buyer: any) => (
                    <tr key={buyer.id} className="hover:bg-dark-800/40 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-bold text-dark-100">{buyer.company_name}</div>
                        <div className="text-[11px] text-dark-400 mt-0.5">{buyer.buyer_name || 'Procurement Team'}</div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-mono text-dark-300 font-semibold">{buyer.hub.code}</span>
                        <div className="text-[10px] text-dark-500">{buyer.country || 'USA'}</div>
                      </td>

                      <td className="py-3 px-3 font-mono font-bold text-dark-50 text-sm">
                        {buyer.localTimeStr}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${buyer.status.color}`}>
                          {buyer.status.label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
