import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, Settings, Wallet, Search, Clock, DollarSign, Zap, TrendingDown, Coins, ArrowRight, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Define types for our API response and request
interface SwapParams {
  fromChainId: string;
  fromTokenAddress: string;
  fromTokenAmount: string;
  toChainId: string;
  toTokenAddress: string;
  slippage?: string;
}

interface RouteDetail {
  estimateGasFee?: string;
  estimateGasFeeUsd?: string;
  estimateTime?: string;
  fromChainNetworkFee?: string;
  minimumReceived?: string;
  priceImpactPercentage?: string;
  router?: {
    bridgeId?: number;
    bridgeName?: string;
    crossChainFee?: string;
    crossChainFeeTokenAddress?: string;
    crossChainFeeUsd?: string;
  };
  toTokenAmount?: string;
}

interface ProcessedRoute {
  bridgeName: string;
  bridgeId?: number;
  outputAmountRaw: string;
  outputAmountDecimal: number;
  gasPriceRaw: string;
  estimatedGasLimitFromRoute?: string;
  gasCostFinalDecimal: number;
  gasCostFinalRaw: string;
  gasCostSource: string;
  sortKey: number;
  routeDetails: RouteDetail;
  fromChainNetworkFeeRaw?: string;
}

interface ApiResult {
  message: string;
  bestRoute: ProcessedRoute | null;
  allRoutes: ProcessedRoute[];
  paramsUsed: SwapParams & { amountInBaseUnits: string };
  error?: string;
  details?: string;
}

const chains = [
  { id: '1', name: 'Ethereum', iconColor: 'from-blue-500 to-purple-600', nativeSymbol: 'ETH' },
  { id: '42161', name: 'Arbitrum', iconColor: 'from-blue-400 to-blue-600', nativeSymbol: 'ETH' },
  { id: '137', name: 'Polygon', iconColor: 'from-purple-500 to-purple-700', nativeSymbol: 'MATIC' },
  { id: '8453', name: 'Base', iconColor: 'from-sky-500 to-sky-700', nativeSymbol: 'ETH' },
];

const tokensByChain: Record<string, Array<{ address: string; symbol: string; iconColor: string; decimals: number }>> = {
  '1': [
    { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', iconColor: 'from-blue-400 to-blue-600', decimals: 6 },
    { address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', symbol: 'ETH', iconColor: 'from-gray-400 to-gray-600', decimals: 18 },
    { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', symbol: 'WBTC', iconColor: 'from-orange-400 to-orange-600', decimals: 8 },
  ],
  '42161': [
    { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', symbol: 'USDC', iconColor: 'from-blue-400 to-blue-600', decimals: 6 },
    { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', symbol: 'WETH', iconColor: 'from-gray-400 to-gray-600', decimals: 18 },
  ],
  '137': [
    { address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', symbol: 'USDC', iconColor: 'from-blue-400 to-blue-600', decimals: 6 },
    { address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', symbol: 'WETH', iconColor: 'from-gray-400 to-gray-600', decimals: 18 },
    { address: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6', symbol: 'WBTC', iconColor: 'from-orange-400 to-orange-600', decimals: 8 },
  ],
  '8453': [
    { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', symbol: 'USDC', iconColor: 'from-blue-400 to-blue-600', decimals: 6 },
  ],
};

const Index = () => {
  const [fromChainId, setFromChainId] = useState<string | undefined>("1");
  const [fromTokenAddress, setFromTokenAddress] = useState<string | undefined>("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
  const [fromAmount, setFromAmount] = useState("10");
  const [toChainId, setToChainId] = useState<string | undefined>("42161");
  const [toTokenAddress, setToTokenAddress] = useState<string | undefined>("0xaf88d065e77c8cC2239327C5EDb3A432268e5831");
  const [slippage, setSlippage] = useState("0.5");

  const [showResults, setShowResults] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [apiResult, setApiResult] = useState<ApiResult | null>(null);

  const fromTokens = fromChainId ? tokensByChain[fromChainId] || [] : [];
  const toTokens = toChainId ? tokensByChain[toChainId] || [] : [];

  useEffect(() => {
    if (fromChainId && fromTokens.length > 0 && !fromTokens.find(t => t.address === fromTokenAddress)) {
      setFromTokenAddress(fromTokens[0]?.address);
    }
  }, [fromChainId, fromTokens, fromTokenAddress]);

  useEffect(() => {
    if (toChainId && toTokens.length > 0 && !toTokens.find(t => t.address === toTokenAddress)) {
      setToTokenAddress(toTokens[0]?.address);
    }
  }, [toChainId, toTokens, toTokenAddress]);

  const handleFindRoute = async () => {
    if (!fromChainId || !fromTokenAddress || !fromAmount || !toChainId || !toTokenAddress) {
      setApiError("Please fill in all fields.");
      setShowResults(false);
      setApiResult(null);
      return;
    }
    setIsLoading(true);
    setApiError(null);
    setShowResults(false);
    setApiResult(null);
    const payload: SwapParams = { fromChainId, fromTokenAddress, fromTokenAmount: fromAmount, toChainId, toTokenAddress, slippage };
    try {
      const response = await fetch('/api/v1/gasguard/find-best-route', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const data: ApiResult = await response.json();
      if (!response.ok) {
        setApiError(data.message || data.error || `Error: ${response.status}`);
        setApiResult(null);
      } else {
        setApiResult(data);
        setShowResults(true);
      }
    } catch (error: any) {
      setApiError(`Network error or failed to fetch: ${error.message}`);
      setApiResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMaxClick = () => { setFromAmount("1250.00"); };
  const getSelectedTokenSymbol = (tokenList: typeof fromTokens, address?: string) => tokenList.find(t => t.address === address)?.symbol || "Token";
  const getSelectedChain = (chainId?: string) => chains.find(c => c.id === chainId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative">
      <div className="absolute inset-0 opacity-50" style={{
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23e2e8f0' fill-opacity='0.3'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")"
      }}></div>
      <header className="relative border-b border-slate-200/60 bg-white/95 backdrop-blur-md shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">GasGuard</h1>
                <p className="text-sm text-slate-600 font-medium">Smart Cross-Chain Swaps</p>
              </div>
            </div>
            <Button className="bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700 text-white shadow-lg border-0">
              <Wallet className="w-4 h-4 mr-2" /> Connect Wallet
            </Button>
          </div>
        </div>
      </header>
      <main className="relative max-w-2xl mx-auto px-4 py-8">
        <Card className="bg-white/95 backdrop-blur-md border-slate-200/60 shadow-2xl shadow-slate-200/50">
          <CardHeader className="pb-6">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-slate-900 text-2xl font-bold">Cross-Chain Swap</CardTitle>
                <p className="text-slate-600 text-sm mt-1">Find the most cost-effective route</p>
              </div>
              <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-700 hover:bg-slate-100">
                <Settings className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* From Section */}
            <div className="space-y-4">
              <label className="text-sm font-semibold text-slate-700 flex items-center"> <Coins className="w-4 h-4 mr-2" /> From </label>
              <div className="grid grid-cols-2 gap-4">
                <Select value={fromChainId} onValueChange={setFromChainId}>
                  <SelectTrigger className="bg-slate-50/80 border-slate-300 hover:bg-slate-100/80 transition-colors">
                    <div className="flex items-center"> {fromChainId && <div className={`w-5 h-5 bg-gradient-to-br ${getSelectedChain(fromChainId)?.iconColor} rounded-full mr-2`}></div>} <SelectValue placeholder="Source Chain" /> </div>
                  </SelectTrigger>
                  <SelectContent>{chains.map(chain => (<SelectItem key={chain.id} value={chain.id}><div className="flex items-center"><div className={`w-5 h-5 bg-gradient-to-br ${chain.iconColor} rounded-full mr-2`}></div>{chain.name}</div></SelectItem>))}</SelectContent>
                </Select>
                <Select value={fromTokenAddress} onValueChange={setFromTokenAddress} disabled={!fromChainId}>
                  <SelectTrigger className="bg-slate-50/80 border-slate-300 hover:bg-slate-100/80 transition-colors">
                    <div className="flex items-center">{fromTokenAddress && fromTokens.find(t=>t.address === fromTokenAddress) && <div className={`w-5 h-5 bg-gradient-to-br ${fromTokens.find(t=>t.address === fromTokenAddress)?.iconColor} rounded-full mr-2`}></div>}<SelectValue placeholder="Token" /></div>
                  </SelectTrigger>
                  <SelectContent>{fromTokens.map(token => (<SelectItem key={token.address} value={token.address}><div className="flex items-center"><div className={`w-5 h-5 bg-gradient-to-br ${token.iconColor} rounded-full mr-2`}></div>{token.symbol}</div></SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <div className="relative">
                  <Input type="number" placeholder="0.00" value={fromAmount} onChange={(e) => setFromAmount(e.target.value)} className="text-2xl font-bold bg-slate-50/80 border-slate-300 h-16 pr-20 text-slate-900" />
                  <Button onClick={handleMaxClick} variant="outline" size="sm" className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 border-emerald-200 hover:bg-emerald-50">MAX</Button>
                </div>
                <div className="flex justify-between items-center text-sm"> <p className="text-slate-600">Balance: 1,250.00 {getSelectedTokenSymbol(fromTokens, fromTokenAddress)}</p> </div>
              </div>
            </div>
            <div className="flex justify-center"> <Button variant="outline" size="icon" className="bg-white border-2 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300 transition-all duration-200 shadow-lg h-12 w-12"> <ArrowUpDown className="w-5 h-5 text-emerald-600" /> </Button> </div>
            {/* To Section */}
            <div className="space-y-4">
              <label className="text-sm font-semibold text-slate-700 flex items-center"> <ArrowRight className="w-4 h-4 mr-2" /> To </label>
              <div className="grid grid-cols-2 gap-4">
                <Select value={toChainId} onValueChange={setToChainId}>
                  <SelectTrigger className="bg-slate-50/80 border-slate-300 hover:bg-slate-100/80 transition-colors">
                    <div className="flex items-center">{toChainId && <div className={`w-5 h-5 bg-gradient-to-br ${getSelectedChain(toChainId)?.iconColor} rounded-full mr-2`}></div>}<SelectValue placeholder="Destination Chain" /></div>
                  </SelectTrigger>
                  <SelectContent>{chains.map(chain => (<SelectItem key={chain.id} value={chain.id}><div className="flex items-center"><div className={`w-5 h-5 bg-gradient-to-br ${chain.iconColor} rounded-full mr-2`}></div>{chain.name}</div></SelectItem>))}</SelectContent>
                </Select>
                <Select value={toTokenAddress} onValueChange={setToTokenAddress} disabled={!toChainId}>
                  <SelectTrigger className="bg-slate-50/80 border-slate-300 hover:bg-slate-100/80 transition-colors">
                    <div className="flex items-center">{toTokenAddress && toTokens.find(t=>t.address === toTokenAddress) && <div className={`w-5 h-5 bg-gradient-to-br ${toTokens.find(t=>t.address === toTokenAddress)?.iconColor} rounded-full mr-2`}></div>}<SelectValue placeholder="Token" /></div>
                  </SelectTrigger>
                  <SelectContent>{toTokens.map(token => (<SelectItem key={token.address} value={token.address}><div className="flex items-center"><div className={`w-5 h-5 bg-gradient-to-br ${token.iconColor} rounded-full mr-2`}></div>{token.symbol}</div></SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="bg-gradient-to-r from-slate-50 to-blue-50/50 border border-slate-200 rounded-xl p-4">
                <p className="text-3xl font-bold text-slate-900 mb-1">{apiResult?.bestRoute ? apiResult.bestRoute.outputAmountDecimal.toFixed(4) : "0.00"}</p>
                <p className="text-sm text-slate-600">Estimated receive amount ({getSelectedTokenSymbol(toTokens, toTokenAddress)})</p>
              </div>
            </div>
            <Button onClick={handleFindRoute} className="w-full bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700 text-white h-14 text-lg font-bold shadow-lg shadow-emerald-200/50 transition-all duration-200" disabled={isLoading || !fromChainId || !fromTokenAddress || !fromAmount || !toChainId || !toTokenAddress}>
              {isLoading ? (<><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Analyzing Routes...</>) : (<><Search className="w-5 h-5 mr-2" /> Find Best Route</>)}
            </Button>
          </CardContent>
        </Card>

        {apiError && !isLoading && (<Alert variant="destructive" className="mt-8 animate-fade-in"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{apiError}</AlertDescription></Alert>)}

        {showResults && !isLoading && apiResult && apiResult.bestRoute && (
          <div className="mt-8 space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">Route Analysis</h2>
              {apiResult.allRoutes && (<Badge className="bg-emerald-100 text-emerald-800 border-emerald-200"><CheckCircle className="w-3 h-3 mr-1" />{apiResult.allRoutes.length} Route{apiResult.allRoutes.length === 1 ? '' : 's'} Found</Badge>)}
            </div>
            <Card className="bg-gradient-to-br from-emerald-50 to-blue-50 border-2 border-emerald-200 shadow-xl shadow-emerald-100/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-gradient-to-l from-emerald-500 to-emerald-400 text-white px-4 py-1 text-sm font-bold">BEST VALUE</div>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-emerald-800 flex items-center text-xl">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg mr-3 flex items-center justify-center"><Zap className="w-5 h-5 text-white" /></div> Recommended Route
                  </CardTitle>
                </div>
                <p className="text-emerald-700 font-medium">via {apiResult.bestRoute.bridgeName}</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-white/80 rounded-xl p-6 border border-emerald-200">
                  <div className="text-center space-y-2">
                    <p className="text-sm text-slate-600 font-medium">You Receive</p>
                    <p className="text-4xl font-bold text-emerald-600">{apiResult.bestRoute.outputAmountDecimal.toFixed(4)} {getSelectedTokenSymbol(toTokens, toTokenAddress)}</p>
                    {/* Simplified USD value display for "You Receive" as direct conversion isn't available yet */}
                    <p className="text-lg text-slate-700">~${apiResult.bestRoute.outputAmountDecimal.toFixed(2)} USD (Approx.)</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/60 rounded-lg p-4 space-y-2">
                    <div className="flex items-center text-sm text-slate-600"><Clock className="w-4 h-4 mr-2" /> Est. Time</div>
                    <p className="text-lg font-bold text-slate-900">{apiResult.bestRoute.routeDetails?.estimateTime || 'N/A'} sec</p>
                  </div>
                  <div className="bg-white/60 rounded-lg p-4 space-y-2">
                    <div className="flex items-center text-sm text-slate-600"><TrendingDown className="w-4 h-4 mr-2" /> Price Impact</div>
                    <p className="text-lg font-bold text-green-600">{apiResult.bestRoute.routeDetails?.priceImpactPercentage || '0'}%</p>
                  </div>
                </div>
                <div className="bg-white/80 rounded-xl p-4 space-y-3 border border-slate-200">
                  <h4 className="font-semibold text-slate-800 flex items-center"><DollarSign className="w-4 h-4 mr-2" /> Cost Breakdown</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Network Fee (Gas)</span>
                      <div className="text-right">
                        <span className="text-slate-900 font-medium">{apiResult.bestRoute.gasCostFinalDecimal.toFixed(6)} {getSelectedChain(fromChainId)?.nativeSymbol}</span>
                        {apiResult.bestRoute.routeDetails?.estimateGasFeeUsd && (<p className="text-xs text-slate-500">~${parseFloat(apiResult.bestRoute.routeDetails.estimateGasFeeUsd).toFixed(2)}</p>)}
                      </div>
                    </div>
                    {apiResult.bestRoute.routeDetails?.router?.crossChainFeeUsd && parseFloat(apiResult.bestRoute.routeDetails.router.crossChainFeeUsd) > 0 && (
                        <div className="flex justify-between">
                        <span className="text-slate-600">Bridge Fee</span>
                        <span className="text-slate-900 font-medium">${parseFloat(apiResult.bestRoute.routeDetails.router.crossChainFeeUsd).toFixed(2)}</span>
                        </div>
                    )}
                    <div className="border-t pt-2 flex justify-between font-medium">
                      <span className="text-slate-700">Total Est. Cost</span>
                      <span className="text-slate-900">${((apiResult.bestRoute.routeDetails?.estimateGasFeeUsd ? parseFloat(apiResult.bestRoute.routeDetails.estimateGasFeeUsd) : 0) + (apiResult.bestRoute.routeDetails?.router?.crossChainFeeUsd ? parseFloat(apiResult.bestRoute.routeDetails.router.crossChainFeeUsd) : 0)).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {apiResult.allRoutes && apiResult.allRoutes.length > 1 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900">Other Route Options</h3>
                {apiResult.allRoutes.map((route, index) => {
                  if (JSON.stringify(route) === JSON.stringify(apiResult.bestRoute)) return null;
                  
                  const currentRouteTotalCostUSD = ((route.routeDetails?.estimateGasFeeUsd ? parseFloat(route.routeDetails.estimateGasFeeUsd) : 0) + (route.routeDetails?.router?.crossChainFeeUsd ? parseFloat(route.routeDetails.router.crossChainFeeUsd) : 0));
                  
                  let bestRouteTotalCostUSD = 0;
                  if (apiResult.bestRoute?.routeDetails) {
                      bestRouteTotalCostUSD = 
                          (apiResult.bestRoute.routeDetails.estimateGasFeeUsd ? parseFloat(apiResult.bestRoute.routeDetails.estimateGasFeeUsd) : 0) +
                          (apiResult.bestRoute.routeDetails.router?.crossChainFeeUsd ? parseFloat(apiResult.bestRoute.routeDetails.router.crossChainFeeUsd) : 0);
                  }
                  const costDifference = currentRouteTotalCostUSD - bestRouteTotalCostUSD;
                  const prefix = costDifference > 0 ? '+' : '';
                  const differenceText = `${prefix}$${costDifference.toFixed(2)}`;
                  const differenceColor = costDifference > 0 ? 'text-red-600' : (costDifference < 0 ? 'text-green-600' : 'text-slate-700');

                  return (
                    <Card key={index} className="bg-white/95 backdrop-blur-md border-slate-200 hover:shadow-lg transition-shadow">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center">
                            <div className={`w-6 h-6 bg-gradient-to-br ${['from-gray-400 to-gray-500', 'from-teal-400 to-cyan-500'][index % 2]} rounded-lg mr-3`}></div>
                            <div><h4 className="font-semibold text-slate-900">{route.bridgeName}</h4><p className="text-sm text-slate-600">{route.routeDetails?.estimateTime || 'N/A'} seconds</p></div>
                          </div>
                          <Button variant="outline" size="sm" className="text-slate-600 border-slate-300">Select Route</Button>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div><p className="text-slate-600">You Receive</p><p className="font-bold text-slate-900">{route.outputAmountDecimal.toFixed(4)} {getSelectedTokenSymbol(toTokens, toTokenAddress)}</p></div>
                          <div><p className="text-slate-600">Total Est. Cost</p><p className="font-bold text-slate-900">${currentRouteTotalCostUSD.toFixed(2)}</p></div>
                          <div><p className="text-slate-600">vs Best</p><p className={`font-bold ${differenceColor}`}>{apiResult.bestRoute ? differenceText : 'N/A'}</p></div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
            {showResults && !isLoading && apiResult && !apiResult.bestRoute && (<Alert className="mt-8 animate-fade-in"><AlertCircle className="h-4 w-4" /><AlertTitle>No Routes Found</AlertTitle><AlertDescription>{apiResult.message || "Could not find any suitable routes for this swap."}</AlertDescription></Alert>)}
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;