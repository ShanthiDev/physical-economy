export type FlowLocation = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  region: string;
};

export type FlowRecord = {
  id: string;
  origin: string;
  dest: string;
  count: number;
  visualMagnitude: number;
  lineWidth: number;
  commodityMax: number;
  commodityId: string;
  commodityGroup: string;
  color: [number, number, number, number];
  tooltip: string;
  sourceId: string;
};

export type CommodityOption = {
  id: string;
  name: string;
  group: string;
  color: [number, number, number, number];
  maxQuantity: number;
};

export type FlowmapPayload = {
  meta: {
    title: string;
    targetYear: number;
    flowMode: string;
    unit: string;
    rawRows: number;
    tradeFlows: number;
    netTradeFlows: number;
    renderFlows: number;
    generatedBy: string;
    seedDataWarning: string;
  };
  locations: FlowLocation[];
  flows: FlowRecord[];
  commodities: CommodityOption[];
};
