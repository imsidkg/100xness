import { Twitter, Linkedin, Github, Youtube } from 'lucide-react';

export function Footer() {
  const footerSections = [
    {
      title: 'Product',
      links: [
        { name: 'Trading Platform', href: '#' },
        { name: 'Chart ', href: '#' },
        { name: 'API Documentation', href: '#' },
        
      ],
    },
    {
      title: 'Company',
      links: [
        { name: 'About Us', href: '#' },
        
        { name: 'Contact', href: '#' },
      ],
    },
    {
      title: 'Resources',
      links: [
        { name: 'Help Center', href: '#' },
        { name: 'Trading Guide', href: '#' },
       
        { name: 'Market News', href: '#' },
      ],
    },
    {
      title: 'Legal',
      links: [
       
        { name: 'Privacy Policy', href: '#' },
        { name: 'Cookie Policy', href: '#' },
        
      ],
    },
  ];

  const socialLinks = [
    { icon: Twitter, href: '#', label: 'Twitter' },
    { icon: Linkedin, href: '#', label: 'LinkedIn' },
    { icon: Github, href: '#', label: 'GitHub' },
    { icon: Youtube, href: '#', label: 'YouTube' },
  ];

  return (
    <footer className="relative bg-[#fafafa] border-t border-black/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        {/* Main footer content */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-12">
          {/* Brand column */}
          <div className="col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xl text-gray-800  uppercase tracking-tight">
                EXNESS-100
              </span>
            </div>
            <p className="text-black/60 text-base max-w-xs leading-relaxed">
              The most trusted platform for trading cryptocurrency, stocks, and forex. 
              Built for traders, by traders.
            </p>
            {/* Social links */}
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    aria-label={social.label}
                    className="w-9 h-9 rounded-lg bg-white hover:bg-gray-50 border border-black/10 hover:border-black/20 flex items-center justify-center text-black/60 hover:text-black transition-all duration-200"
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Links columns */}
          {footerSections.map((section) => (
            <div key={section.title} className="space-y-4">
              <h3 className="text-black/80 text-base font-semibold uppercase tracking-wider">
                {section.title}
              </h3>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-black/60 hover:text-black text-base transition-colors duration-200"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-black/10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-black/40 text-base">
              © {new Date().getFullYear()} TradePro. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-base">
              <a href="#" className="text-black/40 hover:text-black/60 transition-colors duration-200">
                Terms
              </a>
              <a href="#" className="text-black/40 hover:text-black/60 transition-colors duration-200">
                Privacy
              </a>
              <a href="#" className="text-black/40 hover:text-black/60 transition-colors duration-200">
                Cookies
              </a>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-8 pt-8 border-t border-black/5">
          <p className="text-black/40 text-sm leading-relaxed max-w-4xl">
            <strong className="text-black/50">Risk Disclaimer:</strong> Trading and investing in cryptocurrencies, 
            stocks, and forex involves substantial risk of loss and is not suitable for every investor. The valuation 
            of cryptocurrencies and stocks may fluctuate, and, as a result, clients may lose more than their original 
            investment. Past performance is not indicative of future results. TradePro is a technology platform and 
            is not a registered broker-dealer or investment adviser.
          </p>
        </div>
      </div>
    </footer>
  );
}
