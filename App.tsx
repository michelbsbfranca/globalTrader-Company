
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { COMMODITIES, INITIAL_CASH, TICK_RATE } from './constants';
import { GameState, MarketPrice, CommodityCategory, ProductionFacility, DailyLedger, LifetimeStats, GlobalEvent } from './types';
import CommodityCard from './components/CommodityCard';
import ProductionPanel from './components/ProductionPanel';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const DAILY_INTEREST_RATE = 0.015; // 1.5% daily
const INITIAL_TAX_RATE = 0.20; // 20%
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
  const [repayAmount, setRepayAmount] = useState(0);
  const [showTaxAlert, setShowTaxAlert] = useState(false);

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

  const netEquity = gameState.cash + inventoryValue - gameState.debt;

  useEffect(() => {
    if (netEquity < 0 && !isGameOver) {
      setIsGameOver(true);
    }
  }, [netEquity, isGameOver]);

  useEffect(() => {
    if (isGameOver) return;

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

        // --- TAX LOGIC ---
        if (nextDay >= nextTaxDay) {
          const taxBill = nextCash * currentTaxRate;
          nextCash -= taxBill;
          totalTaxesPaid += taxBill;
          
          // Randomize next tax rate (10% to 35%)
          currentTaxRate = 0.10 + (Math.random() * 0.25);
          nextTaxDay += TAX_CYCLE;
          
          setShowTaxAlert(true);
          setTimeout(() => setShowTaxAlert(false), 3000);
        }

        // --- EVENT LOGIC ---
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

        // --- MARKET LOGIC ---
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
          nextPrices[c.id] = {
            ...price,
            currentPrice: newPrice,
            history: newHistory,
            trend: newPrice > price.currentPrice ? 'up' : 'down'
          };
        });

        const dailyInterest = prev.debt * DAILY_INTEREST_RATE;
        const nextDebt = prev.debt + dailyInterest;
        const hasNoCash = nextCash <= 0;

        // --- PRODUCTION LOGIC ---
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
          cash: Math.max(0, nextCash - currentDayProductionCost),
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
  }, [isGameOver]);

  const handleTrade = useCallback((id: string, quantity: number) => {
    if (isGameOver) return;
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
  }, [isGameOver]);

  const handleUnlockFacility = (id: string) => {
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

  const handleToggleProduction = (id: string) => {
    setGameState(prev => ({
      ...prev,
      facilities: prev.facilities.map(f => f.commodityId === id ? { ...f, isProducing: !f.isProducing } : f)
    }));
  };

  const takeLoan = (amount: number) => {
    setGameState(prev => ({ ...prev, cash: prev.cash + amount, debt: prev.debt + amount }));
  };

  const handleRepay = () => {
    setGameState(prev => ({ ...prev, cash: prev.cash - repayAmount, debt: prev.debt - repayAmount }));
    setRepayAmount(0);
  };

  const activeCommodity = useMemo(() => COMMODITIES.find(c => c.id === activeChartId)!, [activeChartId]);
  const chartData = useMemo(() => gameState.prices[activeChartId].history.map((val, idx) => ({ day: idx, price: val })), [gameState.prices, activeChartId]);
  const maxRepayable = Math.min(gameState.cash, gameState.debt);
  
  const totalLifetimeCosts = gameState.lifetime.totalMarketPurchases + 
                             gameState.lifetime.totalProductionCosts + 
                             gameState.lifetime.totalConstruction + 
                             gameState.lifetime.totalUpgrades + 
                             gameState.lifetime.totalInterestPaid +
                             gameState.lifetime.totalTaxesPaid;
  const lifetimeNet = gameState.lifetime.totalSales - totalLifetimeCosts;

  return (
    <div className={`max-w-7xl mx-auto p-4 lg:p-8 space-y-6 relative ${isGameOver ? 'overflow-hidden max-h-screen' : ''}`}>
      {isGameOver && (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-slate-900 border-2 border-rose-500/50 p-12 rounded-3xl shadow-[0_0_50px_rgba(244,63,94,0.3)] space-y-8">
            <span className="text-6xl">💀</span>
            <h2 className="text-4xl font-black text-rose-500 italic uppercase">Bankruptcy</h2>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Equity dropped below zero.</p>
            <button onClick={() => window.location.reload()} className="w-full bg-rose-600 hover:bg-rose-500 text-white font-black py-4 rounded-xl uppercase tracking-widest transition-all">Restart Enterprise</button>
          </div>
        </div>
      )}

      {/* Tax Alert */}
      {showTaxAlert && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] bg-rose-600 text-white px-8 py-4 rounded-2xl shadow-2xl animate-bounce border-2 border-white flex items-center gap-4">
          <span className="text-2xl">💸</span>
          <div>
            <p className="font-black uppercase tracking-tighter">Tax Cycle Complete</p>
            <p className="text-xs font-bold opacity-80">Liquid cash debited by the Revenue Service.</p>
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
          <div className="bg-blue-600 p-2 rounded-lg"><svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg></div>
          <div>
            <h1 className="text-xl font-black italic text-blue-400">GLOBAL TRADER</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Asset Management</p>
          </div>
        </div>
        <div className="flex gap-8">
          <div className="text-right">
            <p className="text-[10px] text-slate-500 font-black uppercase">Liquid Cash</p>
            <p className={`text-2xl font-mono font-bold ${gameState.cash <= 0 ? 'text-rose-500' : 'text-emerald-400'}`}>${gameState.cash.toLocaleString()}</p>
          </div>
          <div className="text-right border-l border-slate-700 pl-8">
            <p className="text-[10px] text-slate-500 font-black uppercase">Portfolio Value</p>
            <p className={`text-2xl font-mono font-bold ${netEquity >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>${netEquity.toLocaleString()}</p>
          </div>
        </div>
      </header>

      <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 shadow-inner">
          <div className="flex justify-between items-center text-[10px] font-black uppercase mb-1 px-1">
            <span className="text-slate-500">Corporate Health Buffer</span>
            <span className="text-blue-400">Trading Day {gameState.day}</span>
          </div>
          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-700">
             <div className={`h-full transition-all duration-700 ${netEquity < (gameState.debt * 0.2) ? 'bg-rose-600' : 'bg-blue-600'}`} style={{ width: `${Math.max(2, Math.min(100, (netEquity / (gameState.cash + inventoryValue || 1)) * 100))}%` }}></div>
          </div>
      </div>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl relative overflow-hidden">
            <div className="flex justify-between items-center mb-6 overflow-x-auto no-scrollbar gap-2 pb-2">
              <h2 className="text-lg font-bold">Market Analysis: {activeCommodity.name}</h2>
              <div className="flex gap-1">
                {COMMODITIES.map(c => (
                  <button key={c.id} onClick={() => setActiveChartId(c.id)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeChartId === c.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>
                    {c.icon} <span className="hidden sm:inline">{c.name}</span>
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
              <div key={c.id} className="relative">
                {gameState.activeEvent && (gameState.activeEvent.category === c.category || gameState.activeEvent.category === 'ALL') && (
                  <div className="absolute -top-2 -right-2 z-10 bg-blue-600 text-white text-[9px] font-black px-2 py-1 rounded shadow-lg border border-white animate-bounce">VOLATILITY EVENT</div>
                )}
                <CommodityCard 
                  commodity={c}
                  marketData={gameState.prices[c.id]}
                  owned={gameState.inventory.find(i => i.commodityId === c.id)?.quantity || 0}
                  cash={gameState.cash}
                  onTrade={handleTrade}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          {/* Fiscal Department (New Section) */}
          <section className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl border-t-4 border-t-amber-500">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-amber-400 uppercase italic">Fiscal Department</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Current Tax Rate</p>
                <span className="text-amber-500 font-black text-xl">{(gameState.taxRate * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-700 relative">
                <div 
                  className="h-full bg-amber-500 transition-all duration-1000" 
                  style={{ width: `${((TAX_CYCLE - (gameState.nextTaxDay - gameState.day)) / TAX_CYCLE) * 100}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase">
                <span>Next Billing Day</span>
                <span className="text-slate-300">Day {gameState.nextTaxDay} ({gameState.nextTaxDay - gameState.day} days left)</span>
              </div>
              <p className="text-[10px] text-slate-500 italic leading-tight">
                *Taxes are debited automatically from your liquid cash. Rates adjust every 30 days based on fiscal volatility.
              </p>
            </div>
          </section>

          <section className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl border-t-4 border-t-rose-500">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-rose-400 uppercase italic">Credit Facility</h2>
            <div className="space-y-6">
                <div className="grid grid-cols-3 gap-2">
                    {[5000, 10000, 20000].map(amt => <button key={amt} onClick={() => takeLoan(amt)} className="bg-slate-700 hover:bg-rose-600/30 text-xs py-2 rounded-lg font-bold transition-all border border-slate-600">+${amt/1000}k</button>)}
                </div>
                <div className="space-y-3">
                    <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase px-1"><span>Payment Amount</span><span className="text-emerald-400 font-mono">-${repayAmount.toLocaleString()}</span></div>
                    <input type="range" min="0" max={maxRepayable} value={repayAmount} onChange={(e) => setRepayAmount(parseInt(e.target.value))} className="w-full h-2 bg-slate-900 rounded-lg appearance-none accent-emerald-500 cursor-pointer" />
                    <button onClick={handleRepay} disabled={repayAmount <= 0} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg transition-all active:scale-95">Authorize Partial Payment</button>
                </div>
                <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-700 flex justify-between items-center">
                   <span className="text-slate-400 text-xs font-bold uppercase">Active Debt</span>
                   <span className="text-rose-500 font-mono font-bold text-lg">${gameState.debt.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                </div>
            </div>
          </section>

          <section className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl bg-gradient-to-br from-slate-900 to-slate-800 border-l-4 border-l-emerald-500">
            <h2 className="text-lg font-black text-emerald-400 uppercase italic mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
              Global Audit
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2">Revenue Streams</p>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Total Sales</span>
                  <span className="text-emerald-400 font-mono font-bold">+${gameState.lifetime.totalSales.toLocaleString()}</span>
                </div>
              </div>

              <div className="h-px bg-slate-700/50"></div>

              <div>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2">Expenditure Breakdown</p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Inventory Sourcing</span>
                    <span className="text-rose-400 font-mono">-${gameState.lifetime.totalMarketPurchases.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Industrial Operations</span>
                    <span className="text-rose-400 font-mono">-${gameState.lifetime.totalProductionCosts.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Financial Interests</span>
                    <span className="text-rose-500 font-mono">-${gameState.lifetime.totalInterestPaid.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Corporate Taxes</span>
                    <span className="text-rose-600 font-mono">-${gameState.lifetime.totalTaxesPaid.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Capital Expansion</span>
                    <span className="text-amber-500 font-mono">-${(gameState.lifetime.totalConstruction + gameState.lifetime.totalUpgrades).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="h-px bg-slate-700"></div>

              <div className="pt-1">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1 text-center">Lifetime Net Profit / Loss</p>
                <p className={`text-2xl text-center font-black font-mono ${lifetimeNet >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                  ${lifetimeNet.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          </section>

          <section className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-blue-400">Production Infrastructure</h2>
            <div className="grid grid-cols-1 gap-4">
              {COMMODITIES.map(c => (
                <ProductionPanel 
                  key={c.id} commodity={c} 
                  facility={gameState.facilities.find(f => f.commodityId === c.id)}
                  onUnlock={handleUnlockFacility} onUpgrade={handleUpgradeFacility}
                  onToggleStatus={handleToggleProduction} cash={gameState.cash}
                />
              ))}
            </div>
          </section>
        </div>
      </main>
      
      <footer className="py-12 text-center">
        <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.4em]">End of Transmission — Global Trader Simulation</p>
      </footer>
    </div>
  );
};

export default App;
