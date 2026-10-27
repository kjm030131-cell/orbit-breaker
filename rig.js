// Rigid auto-rig for the player frames (model space: height ~1, front = +Z, model's right arm at -X).
// Each frame has its own layout: bone pivots, capsule segments that claim vertices, and a few override rules.
window.MechRig = (function () {
  const LAYOUTS = {
    // XR-07 Mk-II (shield in the left hand, rifle in the right)
    mk2: {
      bones: [
        ["hips", -1, [0, 0.5, -0.02]],
        ["torso", 0, [0, 0.62, -0.02]],
        ["head", 1, [0, 0.85, 0.02]],
        ["armR", 1, [-0.17, 0.78, -0.02]],
        ["foreR", 3, [-0.2, 0.62, -0.01]],
        ["armL", 1, [0.17, 0.78, -0.02]],
        ["foreL", 5, [0.2, 0.62, -0.01]],
        ["thighR", 0, [-0.08, 0.48, -0.02]],
        ["shinR", 7, [-0.13, 0.3, -0.02]],
        ["thighL", 0, [0.08, 0.48, -0.02]],
        ["shinL", 9, [0.12, 0.3, -0.02]],
        ["rifle", 4, [-0.25, 0.47, 0.08]],
      ],
      seg: [
        [0, [0, 0.45, -0.01], [0, 0.6, -0.01], 0.8],
        [0, [-0.15, 0.55, 0], [0.15, 0.55, 0], 0.9],
        [1, [0, 0.62, -0.03], [0, 0.84, -0.03], 0.7],
        [1, [-0.12, 0.78, -0.03], [0.12, 0.78, -0.03], 0.8],
        [2, [0, 0.87, 0.03], [0, 0.95, 0.02], 0.9],
        [3, [-0.17, 0.78, -0.02], [-0.2, 0.63, -0.01], 1],
        [3, [-0.2, 0.84, -0.02], [-0.15, 0.74, -0.02], 1],
        [4, [-0.2, 0.62, -0.01], [-0.2, 0.48, 0.01], 1],
        [11, [-0.27, 0.64, 0.12], [-0.29, 0.2, 0.15], 1.0],
        [5, [0.17, 0.78, -0.02], [0.2, 0.63, -0.01], 1],
        [5, [0.2, 0.84, -0.02], [0.15, 0.74, -0.02], 1],
        [6, [0.2, 0.62, -0.01], [0.19, 0.47, 0.01], 1],
        [6, [0.25, 0.72, 0.05], [0.27, 0.36, 0.05], 0.8],
        [7, [-0.08, 0.48, -0.02], [-0.12, 0.31, -0.02], 1],
        [8, [-0.13, 0.29, -0.02], [-0.15, 0.07, -0.02], 1],
        [8, [-0.15, 0.03, -0.1], [-0.15, 0.02, 0.09], 1],
        [9, [0.08, 0.48, -0.02], [0.12, 0.31, -0.02], 1],
        [10, [0.12, 0.29, -0.02], [0.14, 0.07, -0.02], 1],
        [10, [0.14, 0.03, -0.1], [0.14, 0.02, 0.09], 1],
      ],
      rule(x, y, z) {
        if (z < -0.07 && Math.abs(x) < 0.16 && y > 0.6) return 1; // backpack rides the torso
        if (y > 0.86 && z < -0.05 && Math.abs(x) < 0.2) return 1; // backpack fins
        if (y > 0.85 && Math.abs(x) < 0.06 && z > -0.05) return 2; // head
        return -1;
      },
      collar: 0.845,
      hand: [0, -0.15, 0.03],
    },
    // XR-09 Swift (high-mobility frame with large wing binders, empty hands)
    swift: {
      bones: [
        ["hips", -1, [0, 0.47, -0.01]],
        ["torso", 0, [0, 0.58, -0.01]],
        ["head", 1, [0, 0.77, 0.02]],
        ["armR", 1, [-0.18, 0.7, -0.01]],
        ["foreR", 3, [-0.245, 0.565, 0.0]],
        ["armL", 1, [0.18, 0.7, -0.01]],
        ["foreL", 5, [0.245, 0.565, 0.0]],
        ["thighR", 0, [-0.09, 0.45, -0.01]],
        ["shinR", 7, [-0.135, 0.275, -0.01]],
        ["thighL", 0, [0.09, 0.45, -0.01]],
        ["shinL", 9, [0.135, 0.275, -0.01]],
        ["rifle", 4, [-0.29, 0.42, 0.05]],
      ],
      seg: [
        [0, [0, 0.42, 0], [0, 0.55, 0], 0.8],
        [0, [-0.12, 0.47, 0], [0.12, 0.47, 0], 0.9],
        [1, [0, 0.56, -0.01], [0, 0.76, -0.01], 0.7],
        [1, [-0.13, 0.69, -0.02], [0.13, 0.69, -0.02], 0.85],
        // wing binders ride the torso
        [1, [-0.11, 0.72, -0.09], [-0.22, 0.97, -0.09], 0.55],
        [1, [-0.13, 0.7, -0.1], [-0.34, 0.47, -0.08], 0.55],
        [1, [0.11, 0.72, -0.09], [0.22, 0.97, -0.09], 0.55],
        [1, [0.13, 0.7, -0.1], [0.34, 0.47, -0.08], 0.55],
        [2, [0, 0.79, 0.02], [0, 0.88, 0.02], 0.9],
        [3, [-0.18, 0.7, 0], [-0.245, 0.57, 0.01], 1],
        [3, [-0.22, 0.75, 0], [-0.15, 0.67, 0], 1],
        [4, [-0.245, 0.565, 0.01], [-0.295, 0.42, 0.03], 1],
        [5, [0.18, 0.7, 0], [0.245, 0.57, 0.01], 1],
        [5, [0.22, 0.75, 0], [0.15, 0.67, 0], 1],
        [6, [0.245, 0.565, 0.01], [0.295, 0.42, 0.03], 1],
        [7, [-0.09, 0.45, 0], [-0.135, 0.28, 0], 1],
        [8, [-0.135, 0.27, 0], [-0.15, 0.05, 0], 1],
        [8, [-0.15, 0.02, -0.08], [-0.15, 0.02, 0.1], 1],
        [9, [0.09, 0.45, 0], [0.135, 0.28, 0], 1],
        [10, [0.135, 0.27, 0], [0.15, 0.05, 0], 1],
        [10, [0.15, 0.02, -0.08], [0.15, 0.02, 0.1], 1],
      ],
      rule(x, y, z) {
        if (z < -0.06 && Math.abs(x) < 0.12 && y > 0.55) return 1; // backpack core
        if (y > 0.78 && Math.abs(x) < 0.07 && z > -0.05) return 2; // head
        return -1;
      },
      collar: 0.775,
      hand: [0, -0.15, 0.03],
    },
  };

  function segDist(px, py, pz, a, b) {
    const abx = b[0] - a[0], aby = b[1] - a[1], abz = b[2] - a[2];
    const apx = px - a[0], apy = py - a[1], apz = pz - a[2];
    let t = (apx * abx + apy * aby + apz * abz) / (abx * abx + aby * aby + abz * abz);
    t = Math.max(0, Math.min(1, t));
    const dx = apx - abx * t, dy = apy - aby * t, dz = apz - abz * t;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  function boneFor(L, x, y, z) {
    const r = L.rule(x, y, z);
    if (r >= 0) return r;
    let best = 0, bd = 1e9;
    for (const s of L.seg) {
      const d = segDist(x, y, z, s[1], s[2]) * s[3];
      if (d < bd) { bd = d; best = s[0]; }
    }
    if (best === 2 && y < L.collar) return 1; // keep the collar on the chest
    return best;
  }
  function assign(geometry, L) {
    const p = geometry.attributes.position, n = p.count;
    const ids = new Uint16Array(n * 4), w = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      ids[i * 4] = boneFor(L, p.getX(i), p.getY(i), p.getZ(i));
      w[i * 4] = 1;
    }
    return { ids, w };
  }
  // Build a SkinnedMesh + named bones from the loaded glTF mesh
  function build(srcMesh, layoutName) {
    const L = LAYOUTS[layoutName] || LAYOUTS.mk2;
    const BONES = L.bones;
    const geo = srcMesh.geometry.clone();
    if (!geo.attributes.normal) geo.computeVertexNormals();
    const { ids, w } = assign(geo, L);
    geo.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(ids, 4));
    geo.setAttribute("skinWeight", new THREE.Float32BufferAttribute(w, 4));
    const bones = BONES.map(([name]) => { const b = new THREE.Bone(); b.name = name; return b; });
    BONES.forEach(([, parent, pos], i) => {
      const pp = parent < 0 ? [0, 0, 0] : BONES[parent][2];
      bones[i].position.set(pos[0] - pp[0], pos[1] - pp[1], pos[2] - pp[2]);
      if (parent >= 0) bones[parent].add(bones[i]);
    });
    const mat = srcMesh.material;
    const mesh = new THREE.SkinnedMesh(geo, mat);
    mesh.add(bones[0]);
    mesh.updateMatrixWorld(true);
    mesh.bind(new THREE.Skeleton(bones));
    const J = {};
    bones.forEach((b) => (J[b.name] = b));
    return { mesh, J, boneIds: ids, layout: L };
  }
  return { build, LAYOUTS };
})();
