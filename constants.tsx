
import { Commodity, CommodityCategory } from './types';

export const COMMODITIES: Commodity[] = [
  { id: 'oil', name: 'Crude Oil', category: CommodityCategory.ENERGY, basePrice: 80, volatility: 0.15, icon: '🛢️', productionCost: 50, productionYield: 10 },
  { id: 'gas', name: 'Natural Gas', category: CommodityCategory.ENERGY, basePrice: 4, volatility: 0.25, icon: '🔥', productionCost: 2, productionYield: 50 },
  { id: 'gold', name: 'Gold', category: CommodityCategory.METAL, basePrice: 2000, volatility: 0.05, icon: '✨', productionCost: 1500, productionYield: 1 },
  { id: 'steel', name: 'Steel', category: CommodityCategory.METAL, basePrice: 600, volatility: 0.10, icon: '🏗️', productionCost: 400, productionYield: 5 },
  { id: 'wheat', name: 'Wheat', category: CommodityCategory.AGRICULTURE, basePrice: 250, volatility: 0.12, icon: '🌾', productionCost: 150, productionYield: 20 },
  { id: 'corn', name: 'Corn', category: CommodityCategory.AGRICULTURE, basePrice: 180, volatility: 0.10, icon: '🌽', productionCost: 100, productionYield: 25 },
  { id: 'beef', name: 'Beef', category: CommodityCategory.LIVESTOCK, basePrice: 450, volatility: 0.08, icon: '🥩', productionCost: 300, productionYield: 8 },
  { id: 'pork', name: 'Pork', category: CommodityCategory.LIVESTOCK, basePrice: 320, volatility: 0.09, icon: '🥓', productionCost: 200, productionYield: 12 },
];

export const INITIAL_CASH = 5000;
export const TICK_RATE = 3000; // ms per day
