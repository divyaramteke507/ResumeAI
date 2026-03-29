import * as THREE from 'three';

export class DottedSurface {
  constructor(container) {
    this.container = container;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.geometry = null;
    this.material = null;
    this.points = null;
    this.animationId = null;
    this.count = 0;
    
    this.mouseX = 0;
    this.mouseY = 0;
    this.targetMouseX = 0;
    this.targetMouseY = 0;
    
    this.SEPARATION = 120; // Reduced separation for higher density
    this.AMOUNTX = 50;     // Increased count
    this.AMOUNTY = 70;
    
    this.onMouseMove = this.onMouseMove.bind(this);
    this.handleResize = this.handleResize.bind(this);
    
    this.init();
  }

  init() {
    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x000000, 2000, 10000);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      1,
      10000
    );
    this.camera.position.set(0, 455, 1420); // Adjusted camera

    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);

    // Ensure container exists and append
    if (this.container) {
      this.container.appendChild(this.renderer.domElement);
    }

    // Create particles
    const positions = [];
    const colors = [];

    // Correctly define constants BEFORE the loop
    const AMOUNTX_HALF = this.AMOUNTX / 2;
    const AMOUNTY_HALF = this.AMOUNTY / 2;

    this.geometry = new THREE.BufferGeometry();

    for (let ix = 0; ix < this.AMOUNTX; ix++) {
      for (let iy = 0; iy < this.AMOUNTY; iy++) {
        const x = ix * this.SEPARATION - (AMOUNTX_HALF * this.SEPARATION);
        const y = 0; 
        const z = iy * this.SEPARATION - (AMOUNTY_HALF * this.SEPARATION);

        positions.push(x, y, z);
        
        // Pure White dots
        colors.push(1.0, 1.0, 1.0); 
      }
    }

    this.geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3)
    );
    this.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    // Create material
    this.material = new THREE.PointsMaterial({
      size: 12, // Larger dots
      vertexColors: true,
      transparent: true,
      opacity: 0.8, // More opaque
      sizeAttenuation: true,
    });

    // Create points object
    this.points = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.points);

    this.animate();
    
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('mousemove', this.onMouseMove);
  }

  onMouseMove(event) {
    this.targetMouseX = (event.clientX - window.innerWidth / 2) / 100;
    this.targetMouseY = (event.clientY - window.innerHeight / 2) / 100;
  }

  animate() {
    this.animationId = requestAnimationFrame(this.animate.bind(this));

    // Smooth lerp for mouse movement
    this.mouseX += (this.targetMouseX - this.mouseX) * 0.05;
    this.mouseY += (this.targetMouseY - this.mouseY) * 0.05;

    // Influence camera position based on mouse
    this.camera.position.x += (this.mouseX * 80 - this.camera.position.x) * 0.05;
    this.camera.position.y += (-this.mouseY * 80 + 455 - this.camera.position.y) * 0.05;
    this.camera.lookAt(this.scene.position);

    const positionAttribute = this.geometry.attributes.position;
    const positions = positionAttribute.array;

    let i = 0;
    for (let ix = 0; ix < this.AMOUNTX; ix++) {
      for (let iy = 0; iy < this.AMOUNTY; iy++) {
        const index = i * 3;

        // Base wave animation
        const waveX = Math.sin((ix + this.count) * 0.3) * 60;
        const waveY = Math.sin((iy + this.count) * 0.5) * 60;
        
        // Mouse influence: dots move away/towards mouse slightly
        const distToMouse = Math.sqrt(Math.pow(ix - (this.AMOUNTX/2 + this.mouseX*2), 2) + Math.pow(iy - (this.AMOUNTY/2 + this.mouseY*2), 2));
        const mouseInfluence = Math.max(0, (25 - distToMouse) * 8);

        positions[index + 1] = waveX + waveY + mouseInfluence;

        i++;
      }
    }

    positionAttribute.needsUpdate = true;
    this.renderer.render(this.scene, this.camera);
    this.count += 0.1;
  }

  handleResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  destroy() {
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('mousemove', this.onMouseMove);
    if (this.animationId) cancelAnimationFrame(this.animationId);
    
    if (this.points) {
      this.points.geometry.dispose();
      this.points.material.dispose();
    }
    
    if (this.renderer) {
      this.renderer.dispose();
      if (this.container && this.container.contains(this.renderer.domElement)) {
        this.container.removeChild(this.renderer.domElement);
      }
    }
  }
}
