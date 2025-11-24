import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MarketItem {
  symbol: string;
  name: string;
  price: string;
  change: number;
  changePercent: string;
}

export function MarketTicker() {
  const marketData: MarketItem[] = [
    { symbol: 'BTC', name: 'Bitcoin', price: '$67,234.50', change: 2.45, changePercent: '+2.45%' },
    { symbol: 'ETH', name: 'Ethereum', price: '$3,456.78', change: 1.23, changePercent: '+1.23%' },
    { symbol: 'SOL', name: 'Solana', price: '$142.89', change: -0.87, changePercent: '-0.87%' },
    { symbol: 'BNB', name: 'Binance', price: '$589.12', change: 0.56, changePercent: '+0.56%' },
    { symbol: 'XRP', name: 'Ripple', price: '$0.6234', change: 3.12, changePercent: '+3.12%' },
    { symbol: 'ADA', name: 'Cardano', price: '$0.5678', change: -1.45, changePercent: '-1.45%' },
    { symbol: 'AVAX', name: 'Avalanche', price: '$38.92', change: 2.87, changePercent: '+2.87%' },
    { symbol: 'MATIC', name: 'Polygon', price: '$0.8765', change: 1.98, changePercent: '+1.98%' },
  ];

  // Duplicate the array for seamless loop
  const duplicatedData = [...marketData, ...marketData];

  return (
    <section className="relative bg-white border-y border-black/10 overflow-hidden py-4">
      {/* Clip content to stay within SVG line boundaries */}
      <div className="relative left-[7%] right-[7%] max-w-[86%] mx-auto overflow-hidden">
        <motion.div
          animate={{
            x: [0, -50 * marketData.length],
          }}
          transition={{
            x: {
              repeat: Infinity,
              repeatType: "loop",
              duration: 30,
              ease: "linear",
            },
          }}
          className="flex gap-8"
        >
          {duplicatedData.map((item, index) => (
            <div
              key={`${item.symbol}-${index}`}
              className="flex items-center gap-3 px-6 min-w-max"
            >
              <div className="flex items-center gap-2">
                <span className="text-black font-semibold">{item.symbol}</span>
                <span className="text-black/50 text-sm hidden sm:inline">{item.name}</span>
              </div>
              <span className="text-black font-medium">{item.price}</span>
              <div
                className={`flex items-center gap-1 ${
                  item.change >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'
                }`}
              >
                {item.change >= 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">{item.changePercent}</span>
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Creative layered gradient overlays with blue effects */}
      {/* Left side gradients */}
      <div className="absolute inset-y-0 left-0 w-[7%] bg-white pointer-events-none z-20" />
      <div className="absolute inset-y-0 left-[7%] w-32 pointer-events-none z-10">
        <div className="absolute inset-0 bg-gradient-to-r from-white via-blue-50/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-100/50 via-cyan-50/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-white/90 to-transparent" />
      </div>
      
      {/* Right side gradients */}
      <div className="absolute inset-y-0 right-0 w-[7%] bg-white pointer-events-none z-20" />
      <div className="absolute inset-y-0 right-[7%] w-32 pointer-events-none z-10">
        <div className="absolute inset-0 bg-gradient-to-l from-white via-blue-50/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-l from-blue-100/50 via-cyan-50/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-l from-white/90 to-transparent" />
      </div>
    </section>
  );
}
