
import React from 'react';
import { Commodity, ProductionFacility } from '../types';

interface Props {
  commodity: Commodity;
  facility?: ProductionFacility;
  onUnlock: (id: string) => void;
  onUpgrade: (id: string) => void;
  onToggleStatus: (id: string) => void;
  cash: number;
}

const ProductionPanel: React.FC<Props> = ({ commodity, facility, onUnlock, onUpgrade, onToggleStatus, cash }) => {
  const unlockCost = commodity.basePrice * 25;
  const upgradeCost = facility ? Math.floor(unlockCost * Math.pow(1.8, facility.level)) : 0;
  
  // Daily cost increases by 40% per level to maintain challenge
  const currentDailyCost = facility ? Math.floor(commodity.productionCost * Math.pow(1.4, facility.level - 1)) : 0;

  if (!facility) {
    return (
      <div className="bg-slate-800 p-4 rounded-xl border border-dashed border-slate-600 flex flex-col items-center justify-center gap-2 transition-all hover:bg-slate-800/80">
        <span className="text-2xl grayscale opacity-50">{commodity.icon}</span>
        <p className="text-sm text-slate-400">{commodity.name} Infrastructure</p>
        <button 
          onClick={() => onUnlock(commodity.id)}
          disabled={cash < unlockCost}
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
        <button 
          onClick={() => onToggleStatus(commodity.id)}
          className={`p-1.5 rounded-md transition-colors ${facility.isProducing ? 'bg-slate-700 hover:bg-amber-600/20 text-amber-500' : 'bg-amber-600 text-white hover:bg-amber-500'}`}
          title={facility.isProducing ? 'Pause Production' : 'Resume Production'}
        >
          {facility.isProducing ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
          ) : (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          )}
        </button>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-[10px] font-bold text-slate-400 px-1 uppercase tracking-tighter">
          <span>{facility.isProducing ? 'Production Progress' : 'Production Halted'}</span>
          <span>{Math.floor(facility.progress)}%</span>
        </div>
        <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-700 shadow-inner">
          <div 
            className={`h-full transition-all duration-300 ease-linear ${facility.isProducing ? 'bg-gradient-to-r from-blue-600 to-cyan-400' : 'bg-slate-600'}`}
            style={{ width: `${facility.progress}%` }}
          ></div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 mt-1">
        <div className="text-[10px] text-slate-500 leading-tight">
          Op. Cost: <span className={facility.isProducing ? 'text-rose-400 font-bold' : 'text-slate-400'}>
            ${facility.isProducing ? currentDailyCost.toLocaleString() : 0}/day
          </span>
        </div>
        <button 
          onClick={() => onUpgrade(commodity.id)}
          disabled={cash < upgradeCost}
          className="text-[10px] bg-slate-700 hover:bg-blue-600 disabled:bg-slate-900 disabled:text-slate-600 text-white px-2 py-1.5 rounded font-bold transition-all whitespace-nowrap shadow-sm"
        >
          Upgrade (${upgradeCost > 1000 ? (upgradeCost/1000).toFixed(1) + 'k' : upgradeCost})
        </button>
      </div>
    </div>
  );
};

export default ProductionPanel;
