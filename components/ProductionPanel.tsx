
import React from 'react';
import { Commodity, ProductionFacility } from '../types';

interface Props {
  commodity: Commodity;
  facility?: ProductionFacility;
  onUnlock: (id: string) => void;
  onUpgrade: (id: string) => void;
  onSell: (id: string) => void;
  onToggleStatus: (id: string) => void;
  cash: number;
  isPaused: boolean;
}

const ProductionPanel: React.FC<Props> = ({ commodity, facility, onUnlock, onUpgrade, onSell, onToggleStatus, cash, isPaused }) => {
  const unlockCost = commodity.basePrice * 25;
  const upgradeCost = facility ? Math.floor(unlockCost * Math.pow(1.8, facility.level)) : 0;
  
  // Daily cost increases by 40% per level
  const currentDailyCost = facility ? Math.floor(commodity.productionCost * Math.pow(1.4, facility.level - 1)) : 0;

  // Calculate total investment for resale value (70% return)
  let totalInvested = unlockCost;
  if (facility && facility.level > 1) {
    for (let i = 1; i < facility.level; i++) {
      totalInvested += Math.floor(unlockCost * Math.pow(1.8, i));
    }
  }
  const sellValue = Math.floor(totalInvested * 0.7);

  if (!facility) {
    return (
      <div className="bg-slate-800 p-4 rounded-xl border border-dashed border-slate-600 flex flex-col items-center justify-center gap-2 transition-all hover:bg-slate-800/80">
        <span className="text-2xl grayscale opacity-50">{commodity.icon}</span>
        <p className="text-sm text-slate-400">{commodity.name} Infrastructure</p>
        <button 
          onClick={() => onUnlock(commodity.id)}
          disabled={cash < unlockCost || isPaused}
          className="mt-2 text-xs bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 px-4 py-2 rounded-lg font-bold transition-all shadow-lg active:scale-95"
        >
          Build for ${unlockCost.toLocaleString()}
        </button>
      </div>
    );
  }

  return (
    <div className={`bg-slate-800 p-4 rounded-xl border transition-all flex flex-col gap-3 relative overflow-hidden group ${facility.isProducing ? 'border-blue-500/30' : 'border-amber-500/30 bg-slate-800/50'}`}>
      <div className={`absolute top-0 right-0 px-2 py-0.5 text-[10px] font-black uppercase rounded-bl shadow-md ${facility.isProducing ? 'bg-blue-600' : 'bg-amber-600'}`}>
        {facility.isProducing ? `LVL ${facility.level}` : 'PAUSED'}
      </div>
      
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          <span className={`text-xl transition-transform ${facility.isProducing ? 'animate-pulse' : 'grayscale opacity-50'}`}>{commodity.icon}</span>
          <div>
            <span className="font-bold text-sm block leading-none">{commodity.name} Complex</span>
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Yield: +{commodity.productionYield} units</span>
          </div>
        </div>
        <div className="flex gap-1">
          <button 
            onClick={() => onToggleStatus(commodity.id)}
            disabled={isPaused}
            className={`p-1.5 rounded-md transition-colors ${facility.isProducing ? 'bg-slate-700 hover:bg-amber-600/20 text-amber-500' : 'bg-amber-600 text-white hover:bg-amber-500'}`}
          >
            {facility.isProducing ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            )}
          </button>
          <button 
            onClick={() => onSell(commodity.id)}
            disabled={isPaused}
            title="Sell Facility (70% value)"
            className="p-1.5 bg-slate-700 hover:bg-rose-600/40 text-rose-400 rounded-md transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-[10px] font-bold text-slate-400 px-1 uppercase tracking-tighter">
          <span>Progress</span>
          <span>{Math.floor(facility.progress)}%</span>
        </div>
        <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-700 shadow-inner">
          <div 
            className={`h-full transition-all duration-300 ease-linear ${facility.isProducing ? 'bg-gradient-to-r from-blue-600 to-cyan-400' : 'bg-slate-600'}`}
            style={{ width: `${facility.progress}%` }}
          ></div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 mt-1">
        <div className="text-[9px] text-slate-500 leading-tight">
          Value: <span className="text-emerald-400 font-mono">${sellValue.toLocaleString()}</span>
        </div>
        <button 
          onClick={() => onUpgrade(commodity.id)}
          disabled={cash < upgradeCost || isPaused}
          className="text-[9px] bg-slate-700 hover:bg-blue-600 disabled:bg-slate-900 disabled:text-slate-600 text-white px-2 py-1 rounded font-bold transition-all whitespace-nowrap shadow-sm"
        >
          Upgrade (${upgradeCost > 1000 ? (upgradeCost/1000).toFixed(1) + 'k' : upgradeCost})
        </button>
      </div>
    </div>
  );
};

export default ProductionPanel;
