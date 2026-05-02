import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

const NebulaBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false })!; 
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    let mouse = { x: width / 2, y: height / 2 };
    let oppositeMouse = { x: width / 2, y: height / 2 };

    const hexToRgb = (hex: string) => {
      const intValue = Number.parseInt(hex.replace('#', ''), 16);
      return { r: (intValue >> 16) & 255, g: (intValue >> 8) & 255, b: intValue & 255 };
    };

    const baseParticleColors = ['#0A2463', '#3E92CC', '#8B2682', '#D8315B', '#FFFAFF'];
    const colorPalette = baseParticleColors.map(hex => ({ rgb: hexToRgb(hex) }));

    let bgInner = { r: 10, g: 15, b: 35, a: 1 };
    let bgOuter = { r: 2, g: 5, b: 15, a: 1 };

    class Particle {
      x: number; y: number; vx: number; vy: number; baseRadius: number; colorRGB: any; baseAlpha: number;

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.baseRadius = Math.random() * 1.2 + 0.3; 
        
        // Nascem mais lentas
        this.vx = (Math.random() - 0.5) * 0.4;   
        this.vy = (Math.random() - 0.5) * 0.4;   
        
        this.colorRGB = colorPalette[Math.floor(Math.random() * colorPalette.length)].rgb;
        this.baseAlpha = Math.random() * 0.6 + 0.4;
      }

      update() {
        const dxMouse = this.x - mouse.x;
        const dyMouse = this.y - mouse.y;
        const distSqToMouse = dxMouse * dxMouse + dyMouse * dyMouse;
        
        if (distSqToMouse < 19600) { 
          const dist = Math.sqrt(distSqToMouse);
          // Empurrão do mouse reduzido pela metade (de 0.03 para 0.015)
          const push = (1 - dist / 140) * 0.015; 
          this.vx += (dxMouse / dist) * push;
          this.vy += (dyMouse / dist) * push;
        }

        // Movimento orgânico (drift) mais suave
        this.vx += (Math.random() - 0.5) * 0.008;
        this.vy += (Math.random() - 0.5) * 0.008;
        this.vx *= 0.99; 
        this.vy *= 0.99;

        const speedSq = this.vx * this.vx + this.vy * this.vy;
        
        // VELOCIDADES REDUZIDAS (Relaxamento)
        // Mínimo de 0.08 (antes era 0.15) e Máximo de 0.5 (antes era 1.2)
        if (speedSq < 0.0064) { // 0.08^2
          const speed = Math.sqrt(speedSq);
          this.vx = (this.vx / speed) * 0.08;
          this.vy = (this.vy / speed) * 0.08;
        } else if (speedSq > 0.25) { // 0.5^2
          const speed = Math.sqrt(speedSq);
          this.vx = (this.vx / speed) * 0.5;
          this.vy = (this.vy / speed) * 0.5;
        }

        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;
      }

      draw() {
        const dx = this.x - mouse.x;
        const dy = this.y - mouse.y;
        const distToMouse = Math.sqrt(dx * dx + dy * dy);
        
        let focusFactor = Math.max(0, 1 - distToMouse / 350);
        focusFactor = focusFactor * focusFactor; 

        const currentAlpha = this.baseAlpha * 0.30 + (this.baseAlpha * 0.70 * focusFactor);
        const currentRadius = this.baseRadius + (1 - focusFactor) * 1.2;

        ctx.beginPath();
        ctx.arc(this.x, this.y, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.colorRGB.r}, ${this.colorRGB.g}, ${this.colorRGB.b}, ${currentAlpha})`;
        ctx.fill();
      }
    }

    let particles: Particle[] = [];
    
    // SISTEMA DE LOD BASEADO EM QUANTIDADE MÁXIMA
    const init = () => {
      particles = [];
      const requestedCount = Math.floor((width * height) / 7000); 
      
      // Condição de Segurança: Limite Máximo de 250
      let finalCount = requestedCount;
      if (requestedCount >= 250) {
        finalCount = 250;
      }

      for (let i = 0; i < finalCount; i++) {
        particles.push(new Particle());
      }
    };

    const animate = () => {
      const mainGrad = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, width * 0.6);
      mainGrad.addColorStop(0, `rgb(${bgInner.r}, ${bgInner.g}, ${bgInner.b})`);
      mainGrad.addColorStop(1, `rgb(${bgOuter.r}, ${bgOuter.g}, ${bgOuter.b})`);
      ctx.fillStyle = mainGrad;
      ctx.fillRect(0, 0, width, height);

      oppositeMouse.x = width - mouse.x;
      oppositeMouse.y = height - mouse.y;
      const oppGrad = ctx.createRadialGradient(oppositeMouse.x, oppositeMouse.y, 0, oppositeMouse.x, oppositeMouse.y, width * 0.5);
      oppGrad.addColorStop(0, `rgba(120, 40, 180, 0.08)`); 
      oppGrad.addColorStop(0.5, `rgba(60, 20, 100, 0.03)`); 
      oppGrad.addColorStop(1, `rgba(0, 0, 0, 0)`);
      
      ctx.globalCompositeOperation = 'screen'; 
      ctx.fillStyle = oppGrad;
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'source-over'; 

      particles.forEach(p => { p.update(); p.draw(); });
      connect();
      
      requestAnimationFrame(animate);
    };

    const connect = () => {
      const maxDistanceSq = 140 * 140; 
      
      for (let a = 0; a < particles.length; a++) {
        for (let b = a + 1; b < particles.length; b++) {
          const dx = particles[a].x - particles[b].x;
          const dy = particles[a].y - particles[b].y;
          const distSq = dx * dx + dy * dy;
          
          if (distSq < maxDistanceSq) {
            const midX = (particles[a].x + particles[b].x) / 2;
            const midY = (particles[a].y + particles[b].y) / 2;
            const distToMouse = Math.sqrt((midX - mouse.x)**2 + (midY - mouse.y)**2);
            
            let focusFactor = Math.max(0, 1 - distToMouse / 350);
            focusFactor = focusFactor * focusFactor;

            const distanceRatio = 1 - Math.sqrt(distSq) / 140;
            
            const finalOpacity = (distanceRatio * 0.10) + (distanceRatio * 0.6 * focusFactor);
            
            if (finalOpacity > 0.01) {
              const hue = 190 + ((particles[a].x + particles[b].y) % 30);
              
              ctx.strokeStyle = `hsla(${hue}, 80%, 65%, ${finalOpacity})`;
              ctx.lineWidth = 0.6 + (focusFactor * 0.4); 
              ctx.beginPath();
              ctx.moveTo(particles[a].x, particles[a].y);
              ctx.lineTo(particles[b].x, particles[b].y);
              ctx.stroke();
            }
          }
        }
      }
    };

    window.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
    window.addEventListener('resize', () => { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight; init(); });

    init();
    animate();
  }, []);

  return (
    <div className="fixed inset-0 -z-10 bg-[#020617]">
      <motion.canvas 
        ref={canvasRef} 
        className="w-full h-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      />
    </div>
  );
};

export default NebulaBackground;