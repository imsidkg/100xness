import { motion } from "framer-motion";
import { MarketTicker } from "./MarketTicker";

import { cn } from "../../lib/utils";
import ButtonHero from "./Button";
import { GridPattern } from "../ui/grid-pattern";

interface HeroProps {
  onGetStarted?: () => void;
}

export function Hero({ onGetStarted }: HeroProps) {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-white pt-15 pb-20 ">
      {/* Decorative dashed lines - vertical */}
      <div className="absolute left-[7%] top-0 bottom-0 w-[1px]">
        <svg
          className="h-full w-full"
          preserveAspectRatio="none"
          viewBox="0 0 1 100"
        >
          <line
            x1="0.5"
            y1="0"
            x2="0.5"
            y2="100"
            stroke="black"
            strokeWidth="1"
            strokeDasharray="1 8"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
      <div className="absolute right-[7%] top-0 bottom-0 w-[1px]">
        <svg
          className="h-full w-full"
          preserveAspectRatio="none"
          viewBox="0 0 1 100"
        >
          <line
            x1="0.5"
            y1="0"
            x2="0.5"
            y2="100"
            stroke="black"
            strokeWidth="1"
            strokeDasharray="1 8"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>

      {/* Decorative dashed lines - horizontal */}
      <div className="absolute left-0 right-0 top-12 h-[1px]">
        <svg
          className="w-full h-full"
          preserveAspectRatio="none"
          viewBox="0 0 100 1"
        >
          <line
            x1="0"
            y1="0.5"
            x2="100"
            y2="0.5"
            stroke="black"
            strokeWidth="1"
            strokeDasharray="1 8"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
      <div className="absolute left-0 right-0 bottom-0 h-[1px]">
        <svg
          className="w-full h-full"
          preserveAspectRatio="none"
          viewBox="0 0 100 1"
        >
          <line
            x1="0"
            y1="0.5"
            x2="100"
            y2="0.5"
            stroke="black"
            strokeWidth="1"
            strokeDasharray="1 8"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>

      
      <GridPattern
        width={40}
        height={40}
        x={-5}
        y={-5}
        className={cn(
          "[mask-image:linear-gradient(to_bottom_right,white,transparent,transparent)] ml-26 mt-16"
          
        )}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 z-10 ">
        <div className="text-center space-y-4">
          {/* Top CTA bar - without Sign In button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-9 py-1 rounded-full bg-white border border-black/20 text-xl mt-3"
          >
            <span className="text-black/70 capitalize font-koho text-base  ">
              To start trading with us
            </span>
          </motion.div>

          {/* Main headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="bg-gradient-to-tr from-gray-50 via-gray-400 to-gray-800 text capitalize text-9xl  mx-auto leading-none font-extrabold text-center -tracking-[3px] bg-clip-text text-transparent
"
          >
            trade like pro
          </motion.h1>

          {/* Sub-headline */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-black  capitalize text-5xl   max-w-[950px] font-normal mx-auto leading-none "
          >
            Boost Profits Instantly With Smart trading system
          </motion.h2>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-xl text-[rgba(54,54,54,0.81)] capitalize max-w-2xl mx-auto leading-relaxed font-koho pt-2"
          >
            Make confident trades with cutting-edge AI technology.
          </motion.p>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="pt-4"
            onClick={onGetStarted}
          >
            <ButtonHero title='Get Started' size='medium'/>
          </motion.div>
        </div>
      </div>

      {/* Market Ticker integrated into Hero */}
      <div className="absolute bottom-10 left-0 right-0">
        <MarketTicker />
      </div>
    </section>
  );
}
