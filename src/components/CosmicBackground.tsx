import React from 'react';

export const CosmicBackground = () => {
  return (
    <div className="fixed inset-0 z-0 w-full h-full pointer-events-none bg-[#030303]">
      <div 
        className="absolute inset-0 opacity-[0.03]" 
        style={{
          backgroundImage: 'radial-gradient(circle at center, #ffffff 1px, transparent 1px)',
          backgroundSize: '32px 32px'
        }}
      />
    </div>
  );
};
