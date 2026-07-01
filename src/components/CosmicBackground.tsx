import React, { useEffect, useRef } from 'react';

export const CosmicBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    
    window.addEventListener('resize', resize);
    resize();

    // Generate normal stars
    const stars = Array.from({ length: 150 }, () => ({
      x: Math.random() * width,
      y: (Math.random() * height),
      size: Math.random() * 1.5 + 0.5,
      twinkleSpeed: Math.random() * 0.01 + 0.002,
      twinklePhase: Math.random() * Math.PI * 2,
    }));

    // Generate flare stars (the cross ones)
    const flareStars = Array.from({ length: 8 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.8 + 0.8,
      twinklePhase: Math.random() * Math.PI * 2,
      rotation: Math.random() * Math.PI,
    }));

    // Generate shooting stars
    const shootingStars: any[] = [];
    const createShootingStar = () => {
      shootingStars.push({
        x: Math.random() * width * 1.5,
        y: -50,
        length: Math.random() * 80 + 20,
        speed: Math.random() * 4 + 2,
        angle: Math.PI / 4 + (Math.random() * 0.2 - 0.1),
        opacity: 1,
        active: true
      });
    };

    // Precalculate Globe points using the uploaded world map
    let globePoints: {x: number, y: number, z: number, isLand: boolean}[] = [];
    
    const img = new Image();
    img.src = '/world_map.png'; // Will load from public directory
    img.onload = () => {
      const imgCanvas = document.createElement('canvas');
      imgCanvas.width = img.width;
      imgCanvas.height = img.height;
      const imgCtx = imgCanvas.getContext('2d');
      if (!imgCtx) return;
      imgCtx.drawImage(img, 0, 0);
      const imgData = imgCtx.getImageData(0, 0, img.width, img.height);
      const data = imgData.data;

      const newGlobePoints: typeof globePoints = [];
      const numGlobePoints = 25000;
      const phi = Math.PI * (3 - Math.sqrt(5)); // Golden angle
      
      for (let i = 0; i < numGlobePoints; i++) {
        const y = 1 - (i / (numGlobePoints - 1)) * 2; // y goes from 1 to -1
        const radius = Math.sqrt(1 - y * y);
        const theta = phi * i;
        
        const x = Math.cos(theta) * radius;
        const z = Math.sin(theta) * radius;
        
        const lat = Math.asin(y); // -PI/2 to PI/2
        const lon = Math.atan2(z, x); // -PI to PI
        
        // Equirectangular mapping
        // u = 0 to 1 based on longitude
        let u = (lon + Math.PI) / (2 * Math.PI);
        // v = 0 to 1 based on latitude (top to bottom)
        let v = 1 - (lat + Math.PI / 2) / Math.PI;
        
        let px = Math.floor(u * img.width);
        let py = Math.floor(v * img.height);
        
        px = Math.max(0, Math.min(px, img.width - 1));
        py = Math.max(0, Math.min(py, img.height - 1));
        
        const index = (py * img.width + px) * 4;
        const alpha = data[index + 3];
        
        // Only keep land points for better performance and map clarity
        if (alpha > 50) {
          newGlobePoints.push({
            x, y, z,
            isLand: true
          });
        }
      }
      
      globePoints = newGlobePoints;
    };

    const render = () => {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      // Draw normal stars
      ctx.fillStyle = '#ffffff';
      stars.forEach(star => {
        star.twinklePhase += star.twinkleSpeed;
        const opacity = (Math.sin(star.twinklePhase) + 1) / 2 * 0.4 + 0.1;
        
        ctx.globalAlpha = opacity;
        ctx.fillRect(star.x - star.size / 2, star.y - star.size / 2, star.size, star.size);
      });
      ctx.globalAlpha = 1.0;

      // Draw flare stars
      flareStars.forEach(star => {
        star.twinklePhase += 0.001;
        const opacity = (Math.sin(star.twinklePhase) + 1) / 2 * 0.5 + 0.2;
        
        ctx.save();
        ctx.translate(star.x, star.y);
        star.rotation += 0.0005;
        ctx.rotate(star.rotation);
        
        // Draw cross
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = opacity;
        ctx.beginPath();
        ctx.rect(-star.size * 4, -star.size / 4, star.size * 8, star.size / 2);
        ctx.rect(-star.size / 4, -star.size * 4, star.size / 2, star.size * 8);
        ctx.fill();
        
        // Center glow
        ctx.beginPath();
        ctx.arc(0, 0, star.size * 1.5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
      });
      ctx.globalAlpha = 1.0;

      // Handle shooting stars
      if (Math.random() < 0.005) {
        createShootingStar();
      }

      shootingStars.forEach((star, index) => {
        if (!star.active) return;
        
        star.x -= star.speed * Math.cos(star.angle);
        star.y += star.speed * Math.sin(star.angle);
        star.opacity -= 0.005;

        if (star.opacity <= 0 || star.y > height || star.x < 0) {
          star.active = false;
        } else {
          ctx.save();
          ctx.translate(star.x, star.y);
          ctx.rotate(-star.angle);
          
          const gradient = ctx.createLinearGradient(0, 0, star.length, 0);
          gradient.addColorStop(0, `rgba(255, 255, 255, ${star.opacity})`);
          gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
          
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.rect(0, 0, star.length, 1);
          ctx.fill();
          ctx.restore();
        }
      });
      
      // Remove inactive shooting stars
      for (let i = shootingStars.length - 1; i >= 0; i--) {
        if (!shootingStars[i].active) {
          shootingStars.splice(i, 1);
        }
      }

      // Draw custom 3D globe (GitHub style)
      const cx = width / 2;
      const cy = height; // Globe positioned at bottom center
      const radius = Math.min(width, height) * 0.7; // Size of globe
      const t = Date.now() * 0.00015; // Rotation speed
      
      // Globe background glow (Darker)
      const globeGradient = ctx.createRadialGradient(cx, cy, radius * 0.8, cx, cy, radius);
      globeGradient.addColorStop(0, '#000000');
      globeGradient.addColorStop(0.95, '#020308');
      globeGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      ctx.fillStyle = globeGradient;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      // Clip to prevent any points from spilling out of the sphere
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius - 1, 0, Math.PI * 2);
      ctx.clip();

      // Render globe points
      const cosT = Math.cos(t);
      const sinT = Math.sin(t);
      const tilt = 0.2; // roughly 11 degrees
      const cosTilt = Math.cos(tilt);
      const sinTilt = Math.sin(tilt);

      ctx.fillStyle = '#ffffff';
      globePoints.forEach((p) => {
        // Rotate point around Y axis
        const rotX = p.x * cosT - p.z * sinT;
        const rotZ = p.x * sinT + p.z * cosT;
        const rotY = p.y;
        
        // Tilt globe slightly (rotate around X axis)
        const finalY = rotY * cosTilt - rotZ * sinTilt;
        const finalZ = rotY * sinTilt + rotZ * cosTilt;
        const finalX = rotX;
        
        // Only draw points on the front hemisphere
        if (finalZ > 0) {
          const screenX = cx + finalX * radius;
          const screenY = cy - finalY * radius;
          
          // Size and opacity based on depth (z)
          const zDepth = finalZ;
          const size = 1.3 * zDepth;
          const baseOpacity = 0.85;
          
          // Fast edge fade for 3D sphere illusion
          const edgeFade = Math.sqrt(1 - finalZ * finalZ); 
          ctx.globalAlpha = baseOpacity * edgeFade * zDepth;
          
          // Optimization: fillRect is much faster than arc
          ctx.fillRect(screenX - size / 2, screenY - size / 2, size, size);
        }
      });
      ctx.globalAlpha = 1.0;
      
      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 z-0 w-full h-full pointer-events-none" />;
};
