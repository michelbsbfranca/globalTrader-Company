
export enum CommodityCategory {
  ENERGY = 'Energy',
  METAL = 'Metal',
  AGRICULTURE = 'Agriculture',
  LIVESTOCK = 'Livestock'
}

export interface GlobalEvent {
  name: string;
  description: string;
  category: CommodityCategory | 'ALL';
  multiplier: number;
  duration: number;
  remainingDays: number;
}

export interface Commodity {
  id: string;
  name: string;
  category: CommodityCategory;
  basePrice: number;
  volatility: number;
  icon: string;
  productionCost: number;
  productionYield: number;
}

export interface MarketPrice {
  id: string;
  currentPrice: number;
  history: number[];
  trend: 'up' | 'down' | 'stable';
}

export interface InventoryItem {
  commodityId: string;
  quantity: number;
}

export interface ProductionFacility {
  commodityId: string;
  level: number;
  isProducing: boolean;
  progress: number;
}

export interface DailyLedger {
  sales: number;
  purchases: number;
  productionCosts: number;
  net: number;
}

export interface LifetimeStats {
  totalSales: number;
  totalMarketPurchases: number;
  totalProductionCosts: number;
  totalConstruction: number;
  totalUpgrades: number;
  totalInterestPaid: number;
  totalTaxesPaid: number;
}

export interface GameState {
  cash: number;
  debt: number;
  day: number;
  cycleProgress: number;
  inventory: InventoryItem[];
  facilities: ProductionFacility[];
  prices: Record<string, MarketPrice>;
  lastLedger: DailyLedger;
  lifetime: LifetimeStats;
  activeEvent: GlobalEvent | null;
  taxRate: number;
  nextTaxDay: number;
}
