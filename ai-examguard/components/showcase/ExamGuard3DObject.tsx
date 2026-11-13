import * as THREE from 'three';

/**
 * Procedural 3D Sculptural Engine for AI ExamGuard
 *
 * Implements a continuous, reversible transformation across 3 thematic states:
 * 1. DETECTION (p: 0.0 -> 0.33): Fragmented geometric sphere assembling into alignment.
 * 2. INTELLIGENCE (p: 0.33 -> 0.66): Smooth organic draped ring (torus) with teal signal channels.
 * 3. INTEGRITY (p: 0.66 -> 1.00): Structured geometric security shield with crystalline lattice.
 */
export class ExamGuard3DObject {
  public group: THREE.Group;

  // Scene 1: Fragmented Sphere
  private sphereGroup: THREE.Group;
  private fragments: Array<{
    mesh: THREE.Mesh;
    basePos: THREE.Vector3;
    baseRot: THREE.Euler;
    explodeDir: THREE.Vector3;
    rotAxis: THREE.Vector3;
  }> = [];
  private sphereCoreMesh: THREE.Mesh | null = null;

  // Scene 2: Organic Torus
  private torusGroup: THREE.Group;
  private organicTorusMesh: THREE.Mesh | null = null;
  private signalRings: THREE.Line[] = [];

  // Scene 3: Geometric Shield
  private shieldGroup: THREE.Group;
  private shieldFrameMesh: THREE.Mesh | null = null;
  private shieldLatticeMesh: THREE.LineSegments | null = null;
  private shieldVisorMesh: THREE.Mesh | null = null;

  // Materials & Geometries for disposal
  private disposables: Array<THREE.BufferGeometry | THREE.Material> = [];

  // Pearl / Ivory Studio Shaders
  private pearlMaterial: THREE.MeshStandardMaterial;
  private darkTealMaterial: THREE.MeshStandardMaterial;
  private glowTealMaterial: THREE.MeshBasicMaterial;

  constructor() {
    this.group = new THREE.Group();

    // Studio Physical Materials
    this.pearlMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0xf6f6f2), // Soft pearl ivory
      roughness: 0.28,
      metalness: 0.08,
    });
    this.disposables.push(this.pearlMaterial);

    this.darkTealMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x176b5b), // AI ExamGuard primary deep teal
      roughness: 0.22,
      metalness: 0.25,
    });
    this.disposables.push(this.darkTealMaterial);

    this.glowTealMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0x27845d), // Bright success/signal teal
      wireframe: true,
    });
    this.disposables.push(this.glowTealMaterial);

    // Build the 3 sub-scene groups
    this.sphereGroup = this.createFragmentedSphere();
    this.torusGroup = this.createOrganicTorus();
    this.shieldGroup = this.createGeometricShield();

    this.group.add(this.sphereGroup);
    this.group.add(this.torusGroup);
    this.group.add(this.shieldGroup);

    // Initial state: Scene 1 visible
    this.torusGroup.visible = false;
    this.shieldGroup.visible = false;
  }

  /**
   * Scene 1: Fragmented Geometric Sphere
   * Composed of 12 curved sculptural wedge fragments surrounding a central core.
   */
  private createFragmentedSphere(): THREE.Group {
    const group = new THREE.Group();

    // 12 directional anchors roughly covering an icosahedral sphere
    const phi = (1 + Math.sqrt(5)) / 2;
    const directions: THREE.Vector3[] = [
      new THREE.Vector3(-1, phi, 0),
      new THREE.Vector3(1, phi, 0),
      new THREE.Vector3(-1, -phi, 0),
      new THREE.Vector3(1, -phi, 0),
      new THREE.Vector3(0, -1, phi),
      new THREE.Vector3(0, 1, phi),
      new THREE.Vector3(0, -1, -phi),
      new THREE.Vector3(0, 1, -phi),
      new THREE.Vector3(phi, 0, -1),
      new THREE.Vector3(phi, 0, 1),
      new THREE.Vector3(-phi, 0, -1),
      new THREE.Vector3(-phi, 0, 1),
    ].map((v) => v.normalize());

    directions.forEach((dir, i) => {
      // Create a curved sculptural shell piece
      const geom = new THREE.SphereGeometry(
        1.55,
        18,
        18,
        0,
        Math.PI * 0.42,
        0,
        Math.PI * 0.42
      );
      this.disposables.push(geom);

      const mesh = new THREE.Mesh(geom, this.pearlMaterial);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // Orient the fragment to point outwards along its direction
      const basePos = dir.clone().multiplyScalar(0.25);
      mesh.position.copy(basePos);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);

      const explodeDir = dir.clone();
      const rotAxis = new THREE.Vector3(
        (i % 3) - 1,
        ((i + 1) % 3) - 1,
        ((i + 2) % 3) - 1
      ).normalize();

      group.add(mesh);
      this.fragments.push({
        mesh,
        basePos,
        baseRot: mesh.rotation.clone(),
        explodeDir,
        rotAxis: rotAxis.lengthSq() > 0 ? rotAxis : new THREE.Vector3(0, 1, 0),
      });
    });

    // Central pulsing core (Telemetry signal node)
    const coreGeom = new THREE.IcosahedronGeometry(0.72, 3);
    this.disposables.push(coreGeom);
    const coreMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x176b5b),
      roughness: 0.15,
      metalness: 0.5,
      emissive: new THREE.Color(0x0e473c),
      emissiveIntensity: 0.4,
    });
    this.disposables.push(coreMat);
    this.sphereCoreMesh = new THREE.Mesh(coreGeom, coreMat);
    group.add(this.sphereCoreMesh);

    return group;
  }

  /**
   * Scene 2: Organic Sculptural Torus
   * Parametric organic ring with mathematical fluid folds (Image 2).
   */
  private createOrganicTorus(): THREE.Group {
    const group = new THREE.Group();

    // Create a custom folded torus with harmonic modulation
    const R = 1.35; // Major radius
    const r = 0.52; // Minor radius
    const uSegments = 64;
    const vSegments = 32;

    const geom = new THREE.BufferGeometry();
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i <= uSegments; i++) {
      const u = (i / uSegments) * Math.PI * 2;
      for (let j = 0; j <= vSegments; j++) {
        const v = (j / vSegments) * Math.PI * 2;

        // Organic harmonic ripple (flowing silk effect from reference image 2)
        const organicMod = 1 + 0.18 * Math.sin(3 * u) + 0.12 * Math.cos(2 * v);
        const rEff = r * organicMod;

        const x = (R + rEff * Math.cos(v)) * Math.cos(u);
        const y = (R + rEff * Math.cos(v)) * Math.sin(u);
        const z = rEff * Math.sin(v) * (1 + 0.25 * Math.sin(u * 2));

        positions.push(x, y, z);

        // Approximate normal
        const nx = Math.cos(v) * Math.cos(u);
        const ny = Math.cos(v) * Math.sin(u);
        const nz = Math.sin(v);
        normals.push(nx, ny, nz);

        uvs.push(i / uSegments, j / vSegments);
      }
    }

    for (let i = 0; i < uSegments; i++) {
      for (let j = 0; j < vSegments; j++) {
        const a = i * (vSegments + 1) + j;
        const b = (i + 1) * (vSegments + 1) + j;
        const c = (i + 1) * (vSegments + 1) + (j + 1);
        const d = i * (vSegments + 1) + (j + 1);

        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    geom.setIndex(indices);
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geom.computeVertexNormals();
    this.disposables.push(geom);

    this.organicTorusMesh = new THREE.Mesh(geom, this.pearlMaterial);
    this.organicTorusMesh.castShadow = true;
    this.organicTorusMesh.receiveShadow = true;
    group.add(this.organicTorusMesh);

    // 3 Signal Conduit Filaments (Face, Audio, Activity)
    const conduitRadii = [R * 1.05, R * 0.96, R * 1.08];
    const conduitColors = [0x176b5b, 0x27845d, 0x356b9a];

    conduitRadii.forEach((cRadius, k) => {
      const ringPoints: THREE.Vector3[] = [];
      const numPts = 60;
      for (let step = 0; step <= numPts; step++) {
        const angle = (step / numPts) * Math.PI * 2;
        const wave = 0.12 * Math.sin(angle * 3 + k * 1.2);
        ringPoints.push(
          new THREE.Vector3(
            cRadius * Math.cos(angle),
            cRadius * Math.sin(angle),
            wave
          )
        );
      }
      const ringGeom = new THREE.BufferGeometry().setFromPoints(ringPoints);
      this.disposables.push(ringGeom);
      const ringMat = new THREE.LineBasicMaterial({
        color: conduitColors[k],
        linewidth: 2,
        transparent: true,
        opacity: 0.85,
      });
      this.disposables.push(ringMat);
      const ringLine = new THREE.Line(ringGeom, ringMat);
      this.signalRings.push(ringLine);
      group.add(ringLine);
    });

    // Tilt the torus elegantly at 35 degrees like the reference artwork
    group.rotation.x = Math.PI * 0.22;
    group.rotation.y = Math.PI * 0.15;

    return group;
  }

  /**
   * Scene 3: Geometric Security Shield & Lattice (Image 3)
   * High-tech layered shield consisting of an outer pearl border, an interconnected
   * crystalline geodesic lattice, and an inner deep-teal translucent visor.
   */
  private createGeometricShield(): THREE.Group {
    const group = new THREE.Group();

    // 1. Create Shield Outer Contour
    const shieldShape = new THREE.Shape();
    shieldShape.moveTo(0, 1.6);
    shieldShape.quadraticCurveTo(1.3, 1.4, 1.25, 0.3);
    shieldShape.quadraticCurveTo(1.15, -0.9, 0, -1.75); // Bottom tip
    shieldShape.quadraticCurveTo(-1.15, -0.9, -1.25, 0.3);
    shieldShape.quadraticCurveTo(-1.3, 1.4, 0, 1.6); // Top center

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: 0.28,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.08,
      bevelThickness: 0.08,
    };

    const shieldGeom = new THREE.ExtrudeGeometry(shieldShape, extrudeSettings);
    shieldGeom.center();
    this.disposables.push(shieldGeom);

    this.shieldFrameMesh = new THREE.Mesh(shieldGeom, this.pearlMaterial);
    this.shieldFrameMesh.castShadow = true;
    this.shieldFrameMesh.receiveShadow = true;
    group.add(this.shieldFrameMesh);

    // 2. Interconnected Geodesic Security Lattice (Wireframe facet overlay)
    const latticeGeom = new THREE.IcosahedronGeometry(1.22, 2);
    this.disposables.push(latticeGeom);
    const wireframeGeom = new THREE.WireframeGeometry(latticeGeom);
    this.disposables.push(wireframeGeom);

    const latticeMat = new THREE.LineBasicMaterial({
      color: 0x176b5b,
      transparent: true,
      opacity: 0.9,
      linewidth: 2,
    });
    this.disposables.push(latticeMat);

    this.shieldLatticeMesh = new THREE.LineSegments(wireframeGeom, latticeMat);
    this.shieldLatticeMesh.scale.set(0.9, 1.15, 0.35);
    this.shieldLatticeMesh.position.z = 0.16;
    group.add(this.shieldLatticeMesh);

    // 3. Translucent Visor Core (Inner Protective Shield)
    const visorShape = new THREE.Shape();
    visorShape.moveTo(0, 1.4);
    visorShape.quadraticCurveTo(1.1, 1.2, 1.05, 0.25);
    visorShape.quadraticCurveTo(0.95, -0.75, 0, -1.5);
    visorShape.quadraticCurveTo(-0.95, -0.75, -1.05, 0.25);
    visorShape.quadraticCurveTo(-1.1, 1.2, 0, 1.4);

    const visorGeom = new THREE.ShapeGeometry(visorShape);
    visorGeom.center();
    this.disposables.push(visorGeom);

    const visorMat = new THREE.MeshPhysicalMaterial({
      color: 0x176b5b,
      roughness: 0.12,
      transmission: 0.65,
      thickness: 0.4,
      transparent: true,
      opacity: 0.75,
    });
    this.disposables.push(visorMat);

    this.shieldVisorMesh = new THREE.Mesh(visorGeom, visorMat);
    this.shieldVisorMesh.position.z = 0.22;
    group.add(this.shieldVisorMesh);

    return group;
  }

  /**
   * Update the 3D sculpture's continuous transformation based on normalized scroll progress (0..1).
   * Reversible and smooth with zero sudden popping.
   */
  public update(progress: number, timeSeconds: number): void {
    const p = Math.max(0, Math.min(1, progress));

    // Global gentle continuous rotation
    const ambientRot = timeSeconds * 0.15;

    if (p <= 0.33) {
      // ================= SCENE 1: DETECTION =================
      this.sphereGroup.visible = true;
      this.torusGroup.visible = false;
      this.shieldGroup.visible = false;

      const t1 = p / 0.33; // 0 -> 1
      const explodeFactor = Math.pow(1 - t1, 1.4); // High at start, converges to 0

      // Animate 12 fragments converging into cohesive sphere
      this.fragments.forEach((frag) => {
        // Position: outward along explodeDir, converges to basePos
        const offset = frag.explodeDir.clone().multiplyScalar(explodeFactor * 1.35);
        frag.mesh.position.copy(frag.basePos).add(offset);

        // Rotation: rotates into perfect alignment
        frag.mesh.rotation.x =
          frag.baseRot.x + (1 - t1) * frag.rotAxis.x * Math.PI * 0.8;
        frag.mesh.rotation.y =
          frag.baseRot.y + (1 - t1) * frag.rotAxis.y * Math.PI * 0.8;
        frag.mesh.rotation.z =
          frag.baseRot.z + (1 - t1) * frag.rotAxis.z * Math.PI * 0.8;
      });

      // Sphere group overall rotation
      this.sphereGroup.rotation.y = ambientRot + t1 * Math.PI * 0.6;
      this.sphereGroup.rotation.x = Math.sin(ambientRot * 0.5) * 0.15;
      this.sphereGroup.scale.setScalar(1.0);

      if (this.sphereCoreMesh) {
        const pulse = 1.0 + 0.08 * Math.sin(timeSeconds * 4);
        this.sphereCoreMesh.scale.setScalar(pulse);
      }
    } else if (p <= 0.66) {
      // ================= SCENE 2: INTELLIGENCE =================
      const t2 = (p - 0.33) / 0.33; // 0 -> 1

      // Blend between Sphere and Torus seamlessly
      this.sphereGroup.visible = t2 < 0.85;
      this.torusGroup.visible = t2 > 0.12;
      this.shieldGroup.visible = false;

      // Sphere scales down and dissolves
      const sphereScale = Math.max(0.001, 1 - t2 * 1.1);
      this.sphereGroup.scale.setScalar(sphereScale);
      this.sphereGroup.rotation.y = ambientRot + (0.33 + t2 * 0.5) * Math.PI * 2;

      // Torus scales up, unfolds and reveals signal conduits
      const torusScale = Math.min(1.0, t2 * 1.25);
      this.torusGroup.scale.setScalar(torusScale);
      this.torusGroup.rotation.y =
        Math.PI * 0.15 + t2 * Math.PI * 0.85 + Math.sin(ambientRot * 0.4) * 0.2;
      this.torusGroup.rotation.z = Math.sin(timeSeconds * 0.8) * 0.08;

      // Animate signal conduit pulses
      this.signalRings.forEach((ring, idx) => {
        ring.rotation.z = timeSeconds * (0.6 + idx * 0.3);
      });
    } else {
      // ================= SCENE 3: INTEGRITY =================
      const t3 = (p - 0.66) / 0.34; // 0 -> 1

      this.sphereGroup.visible = false;
      this.torusGroup.visible = t3 < 0.6;
      this.shieldGroup.visible = true;

      // Torus flattens and transitions into shield
      if (this.torusGroup.visible) {
        const torusFade = Math.max(0.001, 1 - t3 * 1.8);
        this.torusGroup.scale.set(torusFade, torusFade, torusFade * 0.2);
      }

      // Shield crystallizes into position
      const shieldScale = 0.6 + 0.4 * Math.sin(t3 * (Math.PI / 2));
      this.shieldGroup.scale.setScalar(shieldScale);

      // Rotate upright facing camera
      const targetRotY = (1 - t3) * 0.6 + Math.sin(ambientRot * 0.2) * 0.06;
      this.shieldGroup.rotation.y = targetRotY;
      this.shieldGroup.rotation.x = (1 - t3) * 0.3;

      // Lattice subtle shimmer
      if (this.shieldLatticeMesh) {
        this.shieldLatticeMesh.rotation.z = Math.sin(timeSeconds * 0.5) * 0.04;
      }
    }
  }

  /**
   * Free all WebGL geometries, buffers, and materials on component unmount
   */
  public dispose(): void {
    this.disposables.forEach((item) => {
      item.dispose();
    });
    this.disposables = [];
    this.fragments = [];
    this.signalRings = [];
  }
}

