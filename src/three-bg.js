import * as THREE from 'three';

export function initThreeBackground() {
  const container = document.createElement('div');
  container.className = 'three-container';
  document.body.prepend(container);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  
  // Use a single renderer with optimized settings
  const renderer = new THREE.WebGLRenderer({ 
    alpha: true, 
    antialias: false, // Turn off antialias for performance, use high pixel ratio instead
    powerPreference: "high-performance" 
  });
  
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap pixel ratio at 2 for performance
  container.appendChild(renderer.domElement);

  // Neon Cyberpunk Colors
  const colors = [0x7000ff, 0xff00ff, 0x00f2ff, 0xffffff];
  
  // SHARED GEOMETRIES AND MATERIALS for better performance
  const geometries = [
    new THREE.IcosahedronGeometry(1, 0),
    new THREE.TorusGeometry(0.7, 0.2, 8, 32), // Reduced segments
    new THREE.OctahedronGeometry(1, 0)
  ];

  const materials = colors.map(color => new THREE.MeshPhongMaterial({
    color: color,
    wireframe: true,
    transparent: true,
    opacity: 0.3,
    emissive: color,
    emissiveIntensity: 0.3,
    shininess: 100
  }));

  const shapes = [];
  const shapesGroup = new THREE.Group();
  scene.add(shapesGroup);

  for (let i = 0; i < 30; i++) {
    const geo = geometries[i % geometries.length];
    const mat = materials[i % materials.length];

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(
      (Math.random() - 0.5) * 40,
      (Math.random() - 0.5) * 40,
      (Math.random() - 0.5) * 20
    );
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    const scale = Math.random() * 0.8 + 0.2;
    mesh.scale.set(scale, scale, scale);
    
    shapesGroup.add(mesh);
    shapes.push({
      mesh,
      speed: Math.random() * 0.005 + 0.002,
      rotationSpeed: Math.random() * 0.008 + 0.002,
      originalY: mesh.position.y,
      offset: Math.random() * Math.PI * 2
    });
  }

  // Optimized Grid
  const gridHelper = new THREE.GridHelper(200, 40, 0x7000ff, 0xff00ff);
  gridHelper.position.y = -15;
  gridHelper.rotation.x = Math.PI * 0.02;
  gridHelper.material.transparent = true;
  gridHelper.material.opacity = 0.15;
  scene.add(gridHelper);

  // Lighting
  const light1 = new THREE.PointLight(0x7000ff, 1.5, 60);
  light1.position.set(20, 20, 20);
  scene.add(light1);

  const light2 = new THREE.PointLight(0xff00ff, 1.5, 60);
  light2.position.set(-20, -20, 20);
  scene.add(light2);

  scene.add(new THREE.AmbientLight(0x050505));

  camera.position.z = 12;

  // Mouse Parallax Effect
  let mouseX = 0;
  let mouseY = 0;
  let targetX = 0;
  let targetY = 0;

  const onMouseMove = (e) => {
    mouseX = (e.clientX - window.innerWidth / 2) / 100;
    mouseY = (e.clientY - window.innerHeight / 2) / 100;
  };
  window.addEventListener('mousemove', onMouseMove);

  let animationId;
  function animate() {
    animationId = requestAnimationFrame(animate);
    
    const time = performance.now() * 0.001;
    
    // Smooth lerp for mouse parallax
    targetX += (mouseX - targetX) * 0.05;
    targetY += (mouseY - targetY) * 0.05;
    
    shapesGroup.rotation.y = targetX * 0.1;
    shapesGroup.rotation.x = -targetY * 0.1;

    shapes.forEach((s, i) => {
      s.mesh.rotation.x += s.rotationSpeed;
      s.mesh.rotation.z += s.rotationSpeed * 0.5;
      s.mesh.position.y = s.originalY + Math.sin(time * s.speed + s.offset) * 2;
      
      // Pulse effect with performance consideration
      if (i % 2 === 0) {
        const pulse = 0.2 + Math.sin(time * 1.5 + i) * 0.1;
        s.mesh.material.opacity = pulse;
      }
    });

    gridHelper.position.z = (time * 8) % 5;

    renderer.render(scene, camera);
  }

  const onResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener('resize', onResize);

  animate();

  return {
    destroy: () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      geometries.forEach(g => g.dispose());
      materials.forEach(m => m.dispose());
      if (container.parentNode) container.parentNode.removeChild(container);
    }
  };
}
