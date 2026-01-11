
import React, { useState } from 'react';
import { Commodity, MarketPrice, GlobalEvent } from '../types';

interface Props {
  commodity: Commodity;
  marketData: MarketPrice;
  owned: number;
  cash: number;
  onTrade: (id: string, quantity: number) => void;
  activeEvent: GlobalEvent | null;
}

const CommodityCard: React.FC<Props> = ({ commodity, marketData, owned, cash, onTrade, activeEvent }) => {
  const [tradeAmount, setTradeAmount] = useState(0);

  // Check if this specific commodity is being affected by the current global event
  const isImpactedByEvent = activeEvent && (activeEvent.category === commodity.category || activeEvent.category === 'ALL');

  const priceChange = marketData.history.length > 1 
    ? ((marketData.currentPrice - marketData.history[marketData.history.length - 2]) / marketData.history[marketData.history.length - 2] * 100).toFixed(2)
    : "0.00";

  const maxBuyable = Math.floor(cash / marketData.currentPrice);
  const minAmount = -owned;
  const maxAmount = maxBuyable;

  const handleTrade = () => {
    if (tradeAmount === 0) return;
    onTrade(commodity.id, tradeAmount);
    setTradeAmount(0);
  };

  return (
    <div className={`bg-slate-800 rounded-2xl p-6 border transition-all shadow-xl flex flex-col gap-5 relative overflow-hidden group ${isImpactedByEvent ? 'border-blue-500 ring-2 ring-blue-500/30 bg-blue-900/5' : 'border-slate-700 hover:border-slate-500'}`}>
      
      {/* Dynamic Event Notification Badge */}
      {isImpactedByEvent && (
        <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-black px-3 py-1.5 uppercase italic tracking-tighter flex items-center gap-2 animate-pulse rounded-bl-xl shadow-lg z-10">
          <span className="w-2 h-2 bg-white rounded-full"></span>
          MARKET ALERT: {activeEvent.name}
        </div>
      )}

      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <span className={`text-5xl transition-all duration-500 ${isImpactedByEvent ? 'scale-110 drop-shadow-[0_0_12px_rgba(59,130,246,0.6)]' : ''}`}>{commodity.icon}</span>
          <div>
            <h3 className="font-black text-xl leading-none uppercase tracking-tight">{commodity.name}</h3>
            <span className="text-xs text-slate-500 uppercase font-black tracking-widest">{commodity.category} Segment</span>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-mono font-bold ${isImpactedByEvent ? 'text-blue-400' : 'text-emerald-400'}`}>
            ${marketData.currentPrice.toFixed(2)}
          </div>
          <div className={`text-sm font-black flex items-center justify-end gap-1 ${Number(priceChange) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {Number(priceChange) >= 0 ? '▲' : '▼'} {Math.abs(Number(priceChange))}%
          </div>
        </div>
      </div>

      <div className={`bg-slate-900/80 p-5 rounded-xl border transition-all ${isImpactedByEvent ? 'border-blue-500/40' : 'border-slate-700/50'}`}>
        <div className="flex justify-between items-center text-xs mb-3">
          <span className="text-slate-400 uppercase font-black tracking-widest">Active Inventory</span>
          <span className="font-mono text-blue-400 font-black text-sm">{owned.toLocaleString()} units</span>
        </div>
        
        <div className="mt-6 space-y-4">
          <div className="flex justify-between items-center text-xs font-black uppercase text-slate-500">
            <span>Liquidate ({minAmount})</span>
            <span className={`text-lg font-mono ${tradeAmount > 0 ? 'text-emerald-400' : tradeAmount < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
              {tradeAmount > 0 ? `+${tradeAmount}` : tradeAmount}
            </span>
            <span>Acquire (+{maxAmount})</span>
          </div>
          
          <input 
            type="range" 
            min={minAmount} 
            max={maxAmount} 
            value={tradeAmount}
            onChange={(e) => setTradeAmount(parseInt(e.target.value))}
            className="w-full h-3 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all"
          />
          
          <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono font-bold pt-2">
            <span>Cost: ${Math.abs(tradeAmount * marketData.currentPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            <button 
              onClick={() => setTradeAmount(0)}
              className="text-slate-500 hover:text-white transition-colors uppercase font-black underline tracking-tighter"
            >
              Reset Slider
            </button>
          </div>
        </div>
      </div>

      <button 
        onClick={handleTrade}
        disabled={tradeAmount === 0}
        className={`w-full py-4 rounded-xl font-black uppercase tracking-[0.2em] text-sm transition-all shadow-xl active:scale-95 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed ${
          tradeAmount > 0 ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20' : 
          tradeAmount < 0 ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-500/20' : 
          'bg-slate-700 text-slate-400'
        }`}
      >
        {tradeAmount > 0 ? `Execute Purchase` : tradeAmount < 0 ? `Execute Sale` : 'Awaiting Orders'}
      </button>
    </div>
  );
};

export default CommodityCard;
