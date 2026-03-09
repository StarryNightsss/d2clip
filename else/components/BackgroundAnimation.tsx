import React from 'react';
import { motion } from 'framer-motion';

const BackgroundAnimation: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden bg-[#fafafa]">
      {/* Animated Gradient Overlay */}
      <motion.div 
        animate={{
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-accent-purple/5 to-accent-rose/5"
      />

      {/* Soft floating blobs - Layer 1 */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 90, 0],
          x: [0, 150, 0],
          y: [0, 100, 0],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute -top-40 -left-40 w-[800px] h-[800px] bg-primary/15 rounded-full blur-[140px]"
      />
      <motion.div
        animate={{
          scale: [1, 1.4, 1],
          rotate: [0, -120, 0],
          x: [0, -100, 0],
          y: [0, 150, 0],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute top-1/4 -right-40 w-[900px] h-[900px] bg-accent-purple/15 rounded-full blur-[160px]"
      />

      {/* Soft floating blobs - Layer 2 */}
      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          x: [-150, 150, -150],
          y: [150, -150, 150],
        }}
        transition={{
          duration: 35,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute bottom-0 left-1/3 w-[600px] h-[600px] bg-accent-rose/10 rounded-full blur-[120px]"
      />
      
      {/* Decorative Grid */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#ff6b9d 0.5px, transparent 0.5px)', backgroundSize: '40px 40px' }} />

      {/* Floating Sparkles with varied colors and sizes */}
      {[...Array(35)].map((_, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full ${
            i % 3 === 0 ? 'bg-primary/30' : i % 3 === 1 ? 'bg-accent-purple/30' : 'bg-accent-rose/30'
          }`}
          animate={{
            y: [0, -1200],
            x: [0, (Math.random() - 0.5) * 300],
            opacity: [0, 0.8, 0],
            scale: [0, Math.random() * 2 + 1, 0],
            rotate: [0, 360],
          }}
          transition={{
            duration: 20 + Math.random() * 30,
            repeat: Infinity,
            delay: Math.random() * 20,
            ease: "easeInOut"
          }}
          style={{
            width: `${Math.random() * 4 + 2}px`,
            height: `${Math.random() * 4 + 2}px`,
            left: `${Math.random() * 100}%`,
            top: '110%',
          }}
        />
      ))}

      {/* Subtle floating lines */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={`line-${i}`}
          className="absolute h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent"
          animate={{
            x: ['-100%', '100%'],
            opacity: [0, 0.3, 0],
          }}
          transition={{
            duration: 15 + Math.random() * 10,
            repeat: Infinity,
            delay: Math.random() * 10,
            ease: "linear"
          }}
          style={{
            top: `${20 + i * 15}%`,
            width: '200%',
            left: '-50%',
            transform: `rotate(${Math.random() * 10 - 5}deg)`
          }}
        />
      ))}
    </div>
  );
};

export default BackgroundAnimation;
