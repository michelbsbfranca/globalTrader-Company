
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { COMMODITIES, INITIAL_CASH, TICK_RATE } from './constants';
import { GameState, MarketPrice, CommodityCategory, ProductionFacility, DailyLedger, LifetimeStats, GlobalEvent } from './types';
import CommodityCard from './components/CommodityCard';
import ProductionPanel from './components/ProductionPanel';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const DAILY_INTEREST_RATE = 0.015; // 1.5% daily
const INITIAL_TAX_RATE = 0.15; // 15%
const TAX_CYCLE = 30; // Every 30 days

const EVENTS_POOL: Omit<GlobalEvent, 'remainingDays' | 'duration'>[] = [
  { name: "OPEC Production Cut", description: "Energy prices surge as oil supply is restricted.", category: CommodityCategory.ENERGY, multiplier: 2.1 },
  { name: "Global Drought", description: "Crop failures leading to massive grain shortages.", category: CommodityCategory.AGRICULTURE, multiplier: 1.8 },
  { name: "Financial Safe Haven", description: "Investors rush to precious metals amid uncertainty.", category: CommodityCategory.METAL, multiplier: 1.6 },
  { name: "Livestock Epidemic", description: "Supply chain collapse in meat production.", category: CommodityCategory.LIVESTOCK, multiplier: 2.3 },
  { name: "Technological Breakthrough", description: "Efficiency gains lead to market surplus and price drops.", category: 'ALL', multiplier: 0.5 },
  { name: "Trade War Escalation", description: "Global tariffs crush industrial demand.", category: CommodityCategory.METAL, multiplier: 0.6 },
  { name: "Energy Discovery", description: "New shale reserves discovered, energy prices tank.", category: CommodityCategory.ENERGY, multiplier: 0.4 },
];

const App: React.FC = () => {
  const cyclePurchasesRef = useRef(0);
  const cycleSalesRef = useRef(0);
  const cycleProductionRef = useRef(0);

  const [isGameOver, setIsGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [repayAmount, setRepayAmount] = useState(0);
  const [lastTaxPaid, setLastTaxPaid] = useState<number | null>(null);

  const [gameState, setGameState] = useState<GameState>(() => {
    const initialPrices: Record<string, MarketPrice> = {};
    COMMODITIES.forEach(c => {
      initialPrices[c.id] = {
        id: c.id,
        currentPrice: c.basePrice,
        history: [c.basePrice],
        trend: 'stable'
      };
    });

    return {
      cash: INITIAL_CASH,
      debt: 0,
      day: 1,
      cycleProgress: 0,
      inventory: COMMODITIES.map(c => ({ commodityId: c.id, quantity: 0 })),
      facilities: [],
      prices: initialPrices,
      lastLedger: { sales: 0, purchases: 0, productionCosts: 0, net: 0 },
      lifetime: {
        totalSales: 0,
        totalMarketPurchases: 0,
        totalProductionCosts: 0,
        totalConstruction: 0,
        totalUpgrades: 0,
        totalInterestPaid: 0,
        totalTaxesPaid: 0
      },
      activeEvent: null,
      taxRate: INITIAL_TAX_RATE,
      nextTaxDay: TAX_CYCLE
    };
  });

  const [activeChartId, setActiveChartId] = useState<string>(COMMODITIES[0].id);

  const inventoryValue = useMemo(() => {
    return gameState.inventory.reduce((acc, item) => {
      const price = gameState.prices[item.commodityId].currentPrice;
      return acc + (item.quantity * price);
    }, 0);
  }, [gameState.inventory, gameState.prices]);

  const infrastructureValue = useMemo(() => {
    return gameState.facilities.reduce((acc, facility) => {
      const commodity = COMMODITIES.find(c => c.id === facility.commodityId)!;
      const baseCost = commodity.basePrice * 25;
      let totalCost = baseCost;
      for (let i = 1; i < facility.level; i++) {
        totalCost += Math.floor(baseCost * Math.pow(1.8, i));
      }
      return acc + totalCost;
    }, 0);
  }, [gameState.facilities]);

  const netEquity = gameState.cash + inventoryValue + infrastructureValue - gameState.debt;

  useEffect(() => {
    if (netEquity < -1000 && !isGameOver) { // Small buffer for calculation swings
      setIsGameOver(true);
    }
  }, [netEquity, isGameOver]);

  useEffect(() => {
    if (isGameOver || isPaused) return;

    const interval = setInterval(() => {
      setGameState(prev => {
        const nextDay = prev.day + 1;
        const nextPrices = { ...prev.prices };
        let currentDayProductionCost = 0;
        const nextInventory = [...prev.inventory];
        const nextFacilities: ProductionFacility[] = [];
        let nextEvent = prev.activeEvent;
        let nextCash = prev.cash;
        let totalTaxesPaid = prev.lifetime.totalTaxesPaid;
        let currentTaxRate = prev.taxRate;
        let nextTaxDay = prev.nextTaxDay;

        COMMODITIES.forEach(c => {
          const price = nextPrices[c.id];
          const volatility = c.volatility;
          let targetPrice = c.basePrice;
          if (nextEvent && (nextEvent.category === c.category || nextEvent.category === 'ALL')) {
            targetPrice *= nextEvent.multiplier;
          }
          const changePercent = (Math.random() - 0.5) * 2 * volatility;
          const gravity = (targetPrice - price.currentPrice) * 0.1;
          const newPrice = Math.max(c.basePrice * 0.1, (price.currentPrice + gravity) * (1 + changePercent));
          const newHistory = [...price.history, newPrice].slice(-20);
          nextPrices[c.id] = { ...price, currentPrice: newPrice, history: newHistory, trend: newPrice > price.currentPrice ? 'up' : 'down' };
        });

        if (nextDay >= nextTaxDay) {
          const currentInvVal = prev.inventory.reduce((acc, item) => acc + (item.quantity * nextPrices[item.commodityId].currentPrice), 0);
          const currentInfraVal = prev.facilities.reduce((acc, f) => {
             const c = COMMODITIES.find(com => com.id === f.commodityId)!;
             let val = c.basePrice * 25;
             for(let i=1; i<f.level; i++) val += Math.floor(c.basePrice * 25 * Math.pow(1.8, i));
             return acc + val;
          }, 0);
          
          const currentNetWorth = nextCash + currentInvVal + currentInfraVal - prev.debt;
          const taxBill = Math.max(0, currentNetWorth * currentTaxRate);
          
          nextCash -= taxBill;
          totalTaxesPaid += taxBill;
          setLastTaxPaid(taxBill);
          
          currentTaxRate = 0.10 + (Math.random() * 0.10);
          nextTaxDay += TAX_CYCLE;
          setTimeout(() => setLastTaxPaid(null), 5000);
        }

        if (nextEvent) {
          nextEvent = { ...nextEvent, remainingDays: nextEvent.remainingDays - 1 };
          if (nextEvent.remainingDays <= 0) nextEvent = null;
        }

        const nextCycleProgress = prev.cycleProgress + 1;
        if (nextCycleProgress >= 10 && !nextEvent && Math.random() > 0.3) {
          const randomEvent = EVENTS_POOL[Math.floor(Math.random() * EVENTS_POOL.length)];
          const duration = Math.floor(Math.random() * 5) + 3;
          nextEvent = { ...randomEvent, duration, remainingDays: duration };
        }

        const dailyInterest = prev.debt * DAILY_INTEREST_RATE;
        const nextDebt = prev.debt + dailyInterest;
        const hasNoCash = nextCash <= 0;

        prev.facilities.forEach(facility => {
          const commodity = COMMODITIES.find(c => c.id === facility.commodityId)!;
          const isForcePaused = facility.isProducing && hasNoCash;
          const actualProducing = facility.isProducing && !hasNoCash;

          if (actualProducing) {
            const currentLevelCost = Math.floor(commodity.productionCost * Math.pow(1.4, facility.level - 1));
            currentDayProductionCost += currentLevelCost;
            const speedFactor = 5 + (facility.level * 10); 
            let newProgress = facility.progress + speedFactor;
            
            if (newProgress >= 100) {
              const invIdx = nextInventory.findIndex(i => i.commodityId === facility.commodityId);
              if (invIdx !== -1) {
                nextInventory[invIdx] = {
                  ...nextInventory[invIdx],
                  quantity: nextInventory[invIdx].quantity + commodity.productionYield
                };
              }
              newProgress = newProgress % 100;
            }
            nextFacilities.push({ ...facility, progress: newProgress });
          } else {
            nextFacilities.push({ ...facility, isProducing: isForcePaused ? false : facility.isProducing });
          }
        });

        cycleProductionRef.current += currentDayProductionCost;
        let finalLedger = prev.lastLedger;

        if (nextCycleProgress >= 10) {
          finalLedger = {
            sales: cycleSalesRef.current,
            purchases: cyclePurchasesRef.current,
            productionCosts: cycleProductionRef.current,
            net: cycleSalesRef.current - cyclePurchasesRef.current - cycleProductionRef.current
          };
          cycleSalesRef.current = 0;
          cyclePurchasesRef.current = 0;
          cycleProductionRef.current = 0;
        }

        return {
          ...prev,
          day: nextDay,
          cycleProgress: nextCycleProgress >= 10 ? 0 : nextCycleProgress,
          prices: nextPrices,
          inventory: nextInventory,
          facilities: nextFacilities,
          cash: nextCash - currentDayProductionCost,
          debt: nextDebt,
          lastLedger: finalLedger,
          activeEvent: nextEvent,
          taxRate: currentTaxRate,
          nextTaxDay,
          lifetime: {
            ...prev.lifetime,
            totalProductionCosts: prev.lifetime.totalProductionCosts + currentDayProductionCost,
            totalInterestPaid: prev.lifetime.totalInterestPaid + dailyInterest,
            totalTaxesPaid
          }
        };
      });
    }, TICK_RATE);

    return () => clearInterval(interval);
  }, [isGameOver, isPaused]);

  const handleTrade = useCallback((id: string, quantity: number) => {
    if (isGameOver || isPaused) return;
    setGameState(prev => {
      const price = prev.prices[id].currentPrice;
      const totalCost = quantity * price;
      if (quantity > 0 && prev.cash < totalCost) return prev;
      const currentItem = prev.inventory.find(i => i.commodityId === id);
      if (quantity < 0 && (!currentItem || currentItem.quantity < Math.abs(quantity))) return prev;
      if (quantity > 0) cyclePurchasesRef.current += totalCost;
      else cycleSalesRef.current += Math.abs(totalCost);
      return {
        ...prev,
        cash: prev.cash - totalCost,
        inventory: prev.inventory.map(item => item.commodityId === id ? { ...item, quantity: item.quantity + quantity } : item),
        lifetime: {
          ...prev.lifetime,
          totalSales: quantity < 0 ? prev.lifetime.totalSales + Math.abs(totalCost) : prev.lifetime.totalSales,
          totalMarketPurchases: quantity > 0 ? prev.lifetime.totalMarketPurchases + totalCost : prev.lifetime.totalMarketPurchases
        }
      };
    });
  }, [isGameOver, isPaused]);

  const handleUnlockFacility = (id: string) => {
    if (isPaused) return;
    const commodity = COMMODITIES.find(c => c.id === id)!;
    const cost = commodity.basePrice * 25;
    setGameState(prev => {
      if (prev.cash < cost || prev.facilities.some(f => f.commodityId === id)) return prev;
      return {
        ...prev,
        cash: prev.cash - cost,
        facilities: [...prev.facilities, { commodityId: id, level: 1, isProducing: true, progress: 0 }],
        lifetime: { ...prev.lifetime, totalConstruction: prev.lifetime.totalConstruction + cost }
      };
    });
  };

  const handleUpgradeFacility = (id: string) => {
    if (isPaused) return;
    setGameState(prev => {
      const facility = prev.facilities.find(f => f.commodityId === id);
      if (!facility) return prev;
      const commodity = COMMODITIES.find(c => c.id === id)!;
      const upgradeCost = Math.floor(commodity.basePrice * 25 * Math.pow(1.8, facility.level));
      if (prev.cash < upgradeCost) return prev;
      return {
        ...prev,
        cash: prev.cash - upgradeCost,
        facilities: prev.facilities.map(f => f.commodityId === id ? { ...f, level: f.level + 1 } : f),
        lifetime: { ...prev.lifetime, totalUpgrades: prev.lifetime.totalUpgrades + upgradeCost }
      };
    });
  };

  const handleSellFacility = (id: string) => {
    if (isPaused) return;
    setGameState(prev => {
      const facility = prev.facilities.find(f => f.commodityId === id);
      if (!facility) return prev;
      const commodity = COMMODITIES.find(c => c.id === id)!;
      const unlockCost = commodity.basePrice * 25;
      let totalInvested = unlockCost;
      for (let i = 1; i < facility.level; i++) {
        totalInvested += Math.floor(unlockCost * Math.pow(1.8, i));
      }
      const refund = Math.floor(totalInvested * 0.7);
      return {
        ...prev,
        cash: prev.cash + refund,
        facilities: prev.facilities.filter(f => f.commodityId !== id)
      };
    });
  };

  const handleToggleProduction = (id: string) => {
    if (isPaused) return;
    setGameState(prev => ({
      ...prev,
      facilities: prev.facilities.map(f => f.commodityId === id ? { ...f, isProducing: !f.isProducing } : f)
    }));
  };

  const takeLoan = (amount: number) => {
    if (gameState.debt > 0 || isPaused) return;
    setGameState(prev => ({ ...prev, cash: prev.cash + amount, debt: prev.debt + amount }));
  };

  const handleRepay = () => {
    if (isPaused) return;
    setGameState(prev => ({ ...prev, cash: prev.cash - repayAmount, debt: prev.debt - repayAmount }));
    setRepayAmount(0);
  };

  const activeCommodity = useMemo(() => COMMODITIES.find(c => c.id === activeChartId)!, [activeChartId]);
  const chartData = useMemo(() => gameState.prices[activeChartId].history.map((val, idx) => ({ day: idx, price: val })), [gameState.prices, activeChartId]);
  const maxRepayable = Math.min(gameState.cash, gameState.debt);
  
  const estimatedTax = netEquity * gameState.taxRate;
  const lifetimeCosts = gameState.lifetime.totalMarketPurchases + 
                       gameState.lifetime.totalProductionCosts + 
                       gameState.lifetime.totalConstruction + 
                       gameState.lifetime.totalUpgrades + 
                       gameState.lifetime.totalInterestPaid +
                       gameState.lifetime.totalTaxesPaid;
  const lifetimeNet = gameState.lifetime.totalSales - lifetimeCosts;

  return (
    <div className={`max-w-7xl mx-auto p-4 lg:p-8 space-y-6 relative ${isGameOver ? 'overflow-hidden max-h-screen' : ''}`}>
      {isGameOver && (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-slate-900 border-2 border-rose-500/50 p-12 rounded-3xl shadow-[0_0_50px_rgba(244,63,94,0.3)] space-y-8 animate-in zoom-in duration-300">
            <span className="text-6xl">💀</span>
            <h2 className="text-4xl font-black text-rose-500 italic uppercase">Bankruptcy</h2>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Negative Equity Liquidation.</p>
            <button onClick={() => window.location.reload()} className="w-full bg-rose-600 hover:bg-rose-500 text-white font-black py-4 rounded-xl uppercase tracking-widest transition-all">Restart System</button>
          </div>
        </div>
      )}

      {isPaused && !isGameOver && (
        <div className="fixed inset-0 z-[40] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div className="bg-blue-600 text-white px-10 py-4 rounded-full font-black text-4xl uppercase italic tracking-tighter shadow-[0_0_40px_rgba(37,99,235,0.5)] animate-pulse">
            Game Paused
          </div>
        </div>
      )}

      {lastTaxPaid !== null && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] bg-amber-600 text-white px-8 py-4 rounded-2xl shadow-2xl animate-bounce border-2 border-white flex items-center gap-4">
          <span className="text-2xl">🏛️</span>
          <div>
            <p className="font-black uppercase tracking-tighter text-sm">Wealth Tax Collected</p>
            <p className="text-[10px] font-bold opacity-80">Amount Paid: <span className="text-white font-mono font-black">${lastTaxPaid.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></p>
          </div>
        </div>
      )}

      {gameState.activeEvent && (
        <div className="bg-blue-600 text-white py-3 px-6 rounded-xl flex flex-col md:flex-row items-center gap-4 border-l-8 border-white shadow-xl animate-in slide-in-from-top duration-500">
          <div className="flex items-center gap-2">
            <span className="bg-white text-blue-600 px-2 py-0.5 rounded text-[10px] font-black uppercase">Breaking News</span>
            <h3 className="font-black italic uppercase tracking-wider">{gameState.activeEvent.name}</h3>
          </div>
          <p className="text-sm font-medium flex-1 opacity-90">{gameState.activeEvent.description}</p>
          <div className="text-xs font-mono font-bold bg-blue-700 px-3 py-1 rounded-full whitespace-nowrap">
            ENDS IN: {gameState.activeEvent.remainingDays} DAYS
          </div>
        </div>
      )}

      <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl border border-slate-700 flex flex-wrap items-center justify-between gap-4 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-500/20">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
          </div>
          <div>
            <h1 className="text-xl font-black italic text-blue-400 leading-tight">PATRIMÔNIO CORPORATIVO</h1>
            <p className={`text-2xl font-mono font-bold ${netEquity >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>${netEquity.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <button 
            onClick={() => setIsPaused(!isPaused)} 
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${isPaused ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20' : 'bg-slate-700 hover:bg-slate-600 shadow-slate-900/50'} shadow-lg`}
          >
            {isPaused ? 'RESUME' : 'PAUSE'}
          </button>

          <div className="flex gap-8 border-l border-slate-700 pl-6">
            <div className="text-right">
              <p className="text-[10px] text-slate-500 font-black uppercase">Liquid Cash</p>
              <p className={`text-xl font-mono font-bold ${gameState.cash <= 0 ? 'text-rose-500' : 'text-emerald-400'}`}>${gameState.cash.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-500 font-black uppercase">Asset Value</p>
              <p className="text-xl font-mono font-bold text-blue-300">${(inventoryValue + infrastructureValue).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 shadow-inner">
          <div className="flex justify-between items-center text-[10px] font-black uppercase mb-1 px-1">
            <span className="text-slate-500">Corporate Health Level</span>
            <span className="text-blue-400">{isPaused ? 'PAUSED' : `Day ${gameState.day}`}</span>
          </div>
          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-700">
             <div className={`h-full transition-all duration-700 ${netEquity < (gameState.debt * 0.2) ? 'bg-rose-600' : 'bg-emerald-500'}`} style={{ width: `${Math.max(2, Math.min(100, (netEquity / (gameState.cash + inventoryValue + infrastructureValue || 1)) * 100))}%` }}></div>
          </div>
      </div>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold uppercase italic tracking-tighter">Market: {activeCommodity.name}</h2>
              <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
                {COMMODITIES.map(c => (
                  <button key={c.id} onClick={() => setActiveChartId(c.id)} className={`p-2 rounded-lg transition-all ${activeChartId === c.id ? 'bg-blue-600 scale-110 shadow-lg' : 'bg-slate-700 grayscale opacity-50'}`}>
                    {c.icon}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="day" hide />
                  <YAxis domain={['auto', 'auto']} stroke="#94a3b8" fontSize={10} tickFormatter={(v) => `$${v.toFixed(0)}`} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px', color: '#fff' }} />
                  <Line type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={3} dot={false} animationDuration={300} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {COMMODITIES.map(c => (
              <CommodityCard 
                key={c.id}
                commodity={c}
                marketData={gameState.prices[c.id]}
                owned={gameState.inventory.find(i => i.commodityId === c.id)?.quantity || 0}
                cash={gameState.cash}
                onTrade={handleTrade}
              />
            ))}
          </div>
        </div>

        <div className="space-y-6">
          {/* Fiscal Department */}
          <section className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl border-t-4 border-t-amber-500">
            <h2 className="text-lg font-bold mb-4 text-amber-400 uppercase italic">Fiscal Department</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Wealth Tax Rate</p>
                <span className="text-amber-500 font-black text-xl">{(gameState.taxRate * 100).toFixed(1)}%</span>
              </div>
              <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                <p className="text-[10px] text-slate-500 uppercase font-black mb-1">Projected Bill</p>
                <p className="text-rose-400 font-mono font-bold text-lg">-${estimatedTax.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
              <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-700">
                <div className="h-full bg-amber-500" style={{ width: `${((TAX_CYCLE - (gameState.nextTaxDay - gameState.day)) / TAX_CYCLE) * 100}%` }}></div>
              </div>
              <p className="text-[9px] text-slate-500 italic">Tax collected every 30 days based on total Patrimônio. Sell assets if cash is low.</p>
            </div>
          </section>

          {/* Credit Facility - FIXED VALUES */}
          <section className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl border-t-4 border-t-rose-500">
            <h2 className="text-lg font-bold mb-4 text-rose-400 uppercase italic">Credit Facility</h2>
            <div className="space-y-6">
                <div className="grid grid-cols-3 gap-2">
                    {[5000, 10000, 25000].map(amt => (
                      <button 
                        key={amt} 
                        onClick={() => takeLoan(amt)} 
                        disabled={gameState.debt > 0 || isPaused}
                        className={`text-xs py-2 rounded-lg font-bold transition-all border ${gameState.debt > 0 ? 'bg-slate-900 text-slate-600 border-slate-800' : 'bg-slate-700 hover:bg-rose-600/30 border-slate-600'}`}
                      >
                        +${amt/1000}k
                      </button>
                    ))}
                </div>
                <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-700 flex justify-between items-center">
                   <span className="text-slate-400 text-xs font-bold uppercase">Debt Pool</span>
                   <span className="text-rose-500 font-mono font-bold text-lg">${gameState.debt.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                </div>
                <div className="space-y-3">
                   <div className="flex justify-between items-center px-1">
                      <span className="text-[10px] text-slate-500 uppercase font-black">Authorized Payment</span>
                      <span className="text-emerald-400 font-mono font-bold">${repayAmount.toLocaleString()}</span>
                   </div>
                   <input 
                      type="range" 
                      min="0" 
                      max={maxRepayable} 
                      value={repayAmount} 
                      onChange={(e) => setRepayAmount(parseInt(e.target.value))} 
                      className="w-full h-2 bg-slate-900 rounded-lg appearance-none accent-emerald-500 cursor-pointer" 
                   />
                   <button 
                      onClick={handleRepay} 
                      disabled={repayAmount <= 0 || isPaused} 
                      className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white py-3 rounded-xl font-black text-xs uppercase shadow-lg active:scale-95 transition-all"
                   >
                      Confirm Payment
                   </button>
                </div>
            </div>
          </section>

          {/* GLOBAL AUDIT - RESTORED PANEL */}
          <section className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl border-l-4 border-l-blue-500">
            <h2 className="text-lg font-black text-blue-400 uppercase italic mb-4">Global Audit</h2>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Total Revenue</span>
                <span className="text-emerald-400 font-mono font-bold">+${gameState.lifetime.totalSales.toLocaleString()}</span>
              </div>
              <div className="h-px bg-slate-700/50"></div>
              <div className="space-y-2 text-[10px] font-bold uppercase">
                <div className="flex justify-between text-slate-500"><span>Operating Costs</span><span className="text-rose-400">-${(gameState.lifetime.totalMarketPurchases + gameState.lifetime.totalProductionCosts).toLocaleString()}</span></div>
                <div className="flex justify-between text-slate-500"><span>Fiscal Expenses</span><span className="text-rose-500">-${gameState.lifetime.totalTaxesPaid.toLocaleString()}</span></div>
                <div className="flex justify-between text-slate-500"><span>Capital Expenses</span><span className="text-amber-500">-${(gameState.lifetime.totalConstruction + gameState.lifetime.totalUpgrades).toLocaleString()}</span></div>
              </div>
              <div className="h-px bg-slate-700"></div>
              <div className="text-center pt-2">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-1">Lifetime Net Income</p>
                <p className={`text-2xl font-black font-mono ${lifetimeNet >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                  ${lifetimeNet.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          </section>

          <section className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl">
            <h2 className="text-xl font-bold mb-4 text-blue-400 uppercase italic tracking-tighter">Infrastructure</h2>
            <div className="grid grid-cols-1 gap-4">
              {COMMODITIES.map(c => (
                <ProductionPanel 
                  key={c.id} commodity={c} 
                  facility={gameState.facilities.find(f => f.commodityId === c.id)}
                  onUnlock={handleUnlockFacility} onUpgrade={handleUpgradeFacility}
                  onSell={handleSellFacility}
                  onToggleStatus={handleToggleProduction} cash={gameState.cash}
                  isPaused={isPaused}
                />
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default App;
