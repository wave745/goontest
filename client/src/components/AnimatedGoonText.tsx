import { useEffect, useState } from 'react';

export default function AnimatedGoonText() {
  const [visible, setVisible] = useState(true);

  const goonTexts = [
    '狂 GOON 狂',
    '癡 GOON 癡',
    '迷 GOON 迷',
    '瘋 GOON 瘋',
    '狂 GOON 狂',
    '癡 GOON 癡',
    '迷 GOON 迷',
    '瘋 GOON 瘋',
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(v => !v);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Top scrolling banner */}
      <div className="fixed top-0 left-0 right-0 z-50 overflow-hidden pointer-events-none">
        <div className="animate-scroll-left flex whitespace-nowrap py-2 bg-gradient-to-r from-accent/20 via-accent/10 to-accent/20">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="flex items-center space-x-8 px-8">
              {goonTexts.map((text, j) => (
                <span
                  key={`${i}-${j}`}
                  className="text-2xl md:text-3xl font-bold text-accent animate-goon-glow"
                  style={{
                    animationDelay: `${(i + j) * 0.2}s`,
                    textShadow: '0 0 20px rgba(249, 161, 27, 0.8), 0 0 40px rgba(249, 161, 27, 0.4)',
                  }}
                >
                  {text}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom scrolling banner */}
      <div className="fixed bottom-0 left-0 right-0 z-50 overflow-hidden pointer-events-none mb-16 md:mb-0">
        <div className="animate-scroll-right flex whitespace-nowrap py-2 bg-gradient-to-r from-accent/20 via-accent/10 to-accent/20">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="flex items-center space-x-8 px-8">
              {goonTexts.map((text, j) => (
                <span
                  key={`${i}-${j}`}
                  className="text-2xl md:text-3xl font-bold text-accent animate-goon-glow"
                  style={{
                    animationDelay: `${(i + j) * 0.2}s`,
                    textShadow: '0 0 20px rgba(249, 161, 27, 0.8), 0 0 40px rgba(249, 161, 27, 0.4)',
                  }}
                >
                  {text}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Pulsing corner text */}
      <div 
        className={`fixed top-20 right-4 z-40 transition-opacity duration-500 pointer-events-none ${
          visible ? 'opacity-100' : 'opacity-30'
        }`}
      >
        <div className="text-6xl md:text-8xl font-black text-accent/20 rotate-12 select-none">
          狂
        </div>
      </div>

      <div 
        className={`fixed bottom-20 left-4 z-40 transition-opacity duration-500 pointer-events-none ${
          visible ? 'opacity-30' : 'opacity-100'
        }`}
      >
        <div className="text-6xl md:text-8xl font-black text-accent/20 -rotate-12 select-none">
          癡
        </div>
      </div>

      {/* Floating goon text */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
        <div className="animate-float opacity-10">
          <span className="text-9xl md:text-[12rem] font-black text-accent select-none">
            GOON
          </span>
        </div>
      </div>
    </>
  );
}
