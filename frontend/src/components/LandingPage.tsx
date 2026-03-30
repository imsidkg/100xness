import { useState } from 'react';
import { Navigation } from './landing/Navigation';
import { Hero } from './landing/Hero';
import { Features } from './landing/Features';
import { HowItWorks } from './landing/HowItWorks';
import { FinalCTA } from './landing/FinalCTA';
import { Footer } from './landing/Footer';
import { AuthCard } from './AuthCard';
import { motion, AnimatePresence } from 'framer-motion';

interface LandingPageProps {
  onAuthSuccess: () => void;
}

const LANDING_ZOOM = 1.22;

export function LandingPage({ onAuthSuccess }: LandingPageProps) {
  const [showAuthCard, setShowAuthCard] = useState(false);

  const handleGetStarted = () => {
    setShowAuthCard(true);
  };

  const handleCloseAuth = () => {
    setShowAuthCard(false);
  };

  return (
    <div className="relative min-h-screen bg-white antialiased overflow-x-hidden">
      {/* Decorative dashed lines spanning entire page - vertical */}
      <div className="fixed left-[7%] top-0 bottom-0 w-[1px] z-10 pointer-events-none">
        <svg className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 1 100">
          <line x1="0.5" y1="0" x2="0.5" y2="100" stroke="black" strokeWidth="1" strokeDasharray="1 8" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      <div className="fixed right-[7%] top-0 bottom-0 w-[1px] z-10 pointer-events-none">
        <svg className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 1 100">
          <line x1="0.5" y1="0" x2="0.5" y2="100" stroke="black" strokeWidth="1" strokeDasharray="1 8" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>

      <Navigation onGetStarted={handleGetStarted} />
      <main
        className="origin-top max-w-[100vw] will-change-transform"
        style={{ transform: `scale(${LANDING_ZOOM})` }}
      >
        <Hero onGetStarted={handleGetStarted} />
        <Features />
        <HowItWorks onGetStarted={handleGetStarted} />
        <FinalCTA onGetStarted={handleGetStarted} />
      </main>
      <Footer />

      {/* Auth Modal Overlay */}
      <AnimatePresence>
        {showAuthCard && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseAuth}
              className="fixed inset-0 bg-black/60 z-50"
            />
            
            {/* Auth Card */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                transition={{ type: "spring", duration: 0.45, bounce: 0.25 }}
                className="pointer-events-auto"
              >
                <AuthCard onAuthSuccess={onAuthSuccess} onClose={handleCloseAuth} />
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
