
import React, { useState } from 'react';
import { Commodity, MarketPrice } from '../types';

interface Props {
  commodity: Commodity;
  marketData: MarketPrice;
  owned: number;
  cash: number;
  onTrade: (id: string, quantity: number) => void; // Positive for buy, negative for sell
}

const CommodityCard: React.FC<Props> = ({ commodity, marketData, owned, cash, onTrade }) => {
  const [tradeAmount, setTradeAmount] = useState(0);

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
    <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 hover:border-blue-500 transition-all shadow-lg flex flex-col gap-4">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{commodity.icon}</span>
          <div>
            <h3 className="font-bold text-lg leading-none">{commodity.name}</h3>
            <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{commodity.category}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-mono font-bold text-emerald-400">
            ${marketData.currentPrice.toFixed(2)}
          </div>
          <div className={`text-xs font-bold ${Number(priceChange) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {Number(priceChange) >= 0 ? '▲' : '▼'} {Math.abs(Number(priceChange))}%
          </div>
        </div>
      </div>

      <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-slate-400 uppercase font-bold tracking-tighter">Inventory</span>
          <span className="font-mono text-blue-400 font-bold">{owned} units</span>
        </div>
        
        <div className="mt-4 space-y-3">
          <div className="flex justify-between items-center text-[10px] font-bold uppercase text-slate-500">
            <span>Sell ({minAmount})</span>
            <span className={`text-sm font-mono ${tradeAmount > 0 ? 'text-emerald-400' : tradeAmount < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
              {tradeAmount > 0 ? `+${tradeAmount}` : tradeAmount}
            </span>
            <span>Buy (+{maxAmount})</span>
          </div>
          
          <input 
            type="range" 
            min={minAmount} 
            max={maxAmount} 
            value={tradeAmount}
            onChange={(e) => setTradeAmount(parseInt(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>Total: ${Math.abs(tradeAmount * marketData.currentPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            <button 
              onClick={() => setTradeAmount(0)}
              className="hover:text-white transition-colors underline"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      <button 
        onClick={handleTrade}
        disabled={tradeAmount === 0}
        className={`w-full py-3 rounded-xl font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:bg-slate-700 disabled:cursor-not-allowed ${
          tradeAmount > 0 ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 
          tradeAmount < 0 ? 'bg-rose-600 hover:bg-rose-500 text-white' : 
          'bg-slate-700 text-slate-400'
        }`}
      >
        {tradeAmount > 0 ? `Confirm Purchase` : tradeAmount < 0 ? `Confirm Sale` : 'Select Quantity'}
      </button>
    </div>
  );
};

export default CommodityCard;
