(function () {
  'use strict';

  var PALETTE = {
    background: 0x20262b,
    squareLight: 0xA8E6A8,
    squareDark: 0xFF88FF,
    squareActive: 0xffd400,
    squareFlag: 0xe8322a,
    laser: 0xffd400,
    squareRevealed: 0xefefe6,
    squareMine: 0x000000,
    whitePiece: 0x90EE90,
    blackPiece: 0xFF00FF,
    edgeOnWhite: 0x75C275,
    edgeOnBlack: 0xD100D1,
    squareEdge: 0x000000
  };

  var SPACING = 1.1;
  var SQUARE_SIZE = 0.9;
  var SQUARE_HEIGHT = 0.5;
  var TOP_Y = SQUARE_HEIGHT / 2;
  var FILES = 'abcdefgh';
  var BACK_RANK = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];

  var AudioFX = (function () {
    var ctx = null;
    var master = null;
    var unlocked = false;
    var noiseBuffer = null;

    function ensure() {
      if (ctx) return ctx;
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { ctx = new AC(); } catch (e) { ctx = null; return null; }
      master = ctx.createGain();
      master.gain.value = 0.55;
      master.connect(ctx.destination);
      return ctx;
    }
    function resume() {
      if (!ctx) return;
      if (ctx.state === 'suspended' && ctx.resume) { ctx.resume(); }
    }
    function unlock() {
      if (unlocked) return;
      ensure();
      if (!ctx) return;
      unlocked = true;
      resume();
      if (noiseBuffer) return;
      var seconds = 2.0;
      var length = Math.floor(ctx.sampleRate * seconds);
      noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
      var ch = noiseBuffer.getChannelData(0);
      for (var i = 0; i < length; i++) { ch[i] = Math.random() * 2 - 1; }
    }

    function hitMarker(weaponType) {
      ensure(); resume();
      if (!ctx) return;
      var t = ctx.currentTime;
      var cfg = { freq: 2400, dur: 0.05, gain: 0.22 };
      if (weaponType === 'pawn') { cfg.freq = 1800; cfg.dur = 0.06; cfg.gain = 0.18; }
      else if (weaponType === 'rook') { cfg.freq = 1400; cfg.dur = 0.09; cfg.gain = 0.28; }
      else if (weaponType === 'knight') { cfg.freq = 2600; cfg.dur = 0.035; cfg.gain = 0.14; }
      else if (weaponType === 'bishop') { cfg.freq = 3200; cfg.dur = 0.045; cfg.gain = 0.20; }
      else if (weaponType === 'queen') { cfg.freq = 900; cfg.dur = 0.10; cfg.gain = 0.30; }
      else if (weaponType === 'king') { cfg.freq = 2000; cfg.dur = 0.07; cfg.gain = 0.24; }

      var osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(cfg.freq, t);
      osc.frequency.exponentialRampToValueAtTime(Math.max(200, cfg.freq * 0.5), t + cfg.dur);
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(cfg.gain, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + cfg.dur);
      osc.connect(g); g.connect(master);
      osc.start(t); osc.stop(t + cfg.dur + 0.02);
    }

    function mineExplosion() {
      ensure(); resume();
      if (!ctx) return;
      if (!noiseBuffer) { unlock(); if (!noiseBuffer) return; }
      var t = ctx.currentTime;
      var src = ctx.createBufferSource();
      src.buffer = noiseBuffer;
      var filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(900, t);
      filter.frequency.exponentialRampToValueAtTime(120, t + 1.2);
      filter.Q.value = 0.9;
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.9, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
      src.connect(filter); filter.connect(g); g.connect(master);
      src.start(t); src.stop(t + 1.25);
      var sub = ctx.createOscillator();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(95, t);
      sub.frequency.exponentialRampToValueAtTime(38, t + 0.5);
      var sg = ctx.createGain();
      sg.gain.setValueAtTime(0.0001, t);
      sg.gain.linearRampToValueAtTime(0.5, t + 0.03);
      sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
      sub.connect(sg); sg.connect(master);
      sub.start(t); sub.stop(t + 0.75);
    }

    function flagPlacement() {
      ensure(); resume();
      if (!ctx) return;
      var t = ctx.currentTime;
      var osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, t);
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.35, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.30);
      osc.connect(g); g.connect(master);
      osc.start(t); osc.stop(t + 0.32);
      var osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1320, t);
      var g2 = ctx.createGain();
      g2.gain.setValueAtTime(0.0001, t);
      g2.gain.linearRampToValueAtTime(0.15, t + 0.02);
      g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
      osc2.connect(g2); g2.connect(master);
      osc2.start(t); osc2.stop(t + 0.26);
    }

    function confirmChime() {
      ensure(); resume();
      if (!ctx) return;
      var t = ctx.currentTime;
      var osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(620, t);
      osc.frequency.linearRampToValueAtTime(880, t + 0.10);
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.22, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      osc.connect(g); g.connect(master);
      osc.start(t); osc.stop(t + 0.24);
    }

    function moveStep() {
      ensure(); resume();
      if (!ctx) return;
      var t = ctx.currentTime;
      var osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(330, t);
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.14, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      osc.connect(g); g.connect(master);
      osc.start(t); osc.stop(t + 0.20);
    }

    function tacticalVictory() {
      ensure(); resume();
      if (!ctx) return;
      var t = ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.50].forEach(function (f, i) {
        var osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, t + i * 0.10);
        var g = ctx.createGain();
        var start = t + i * 0.10;
        g.gain.setValueAtTime(0.0001, start);
        g.gain.linearRampToValueAtTime(0.30, start + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
        osc.connect(g); g.connect(master);
        osc.start(start); osc.stop(start + 0.4);
      });
    }

    return {
      unlock: unlock,
      resume: resume,
      hitMarker: hitMarker,
      mineExplosion: mineExplosion,
      flagPlacement: flagPlacement,
      confirmChime: confirmChime,
      moveStep: moveStep,
      tacticalVictory: tacticalVictory
    };
  })();

  var canvas = document.getElementById('stage');
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.background);

  var camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.05, 200);
  var cameraP1 = new THREE.PerspectiveCamera(50, Math.max(1, window.innerWidth / 2) / window.innerHeight, 0.05, 200);
  var cameraP2 = new THREE.PerspectiveCamera(50, Math.max(1, window.innerWidth / 2) / window.innerHeight, 0.05, 200);

  var sceneAmbient = new THREE.AmbientLight(0xffffff, 0.65);
  scene.add(sceneAmbient);
  var sun = new THREE.DirectionalLight(0xffffff, 0.75);
  sun.position.set(6, 14, 8);
  scene.add(sun);
  var fill = new THREE.DirectionalLight(0xffffff, 0.25);
  fill.position.set(-8, 6, -6);
  scene.add(fill);

  var controls = new THREE.OrbitControls(camera, canvas);
  controls.enableDamping = false;

  var squares = [];
  var squareGeometry = new THREE.BoxGeometry(SQUARE_SIZE, SQUARE_HEIGHT, SQUARE_SIZE);
  var squareEdgeGeometry = new THREE.EdgesGeometry(squareGeometry);
  var squareEdgeMaterial = new THREE.LineBasicMaterial({ color: PALETTE.squareEdge });

  function worldX(fileIndex) { return (fileIndex - 3.5) * SPACING; }
  function worldZ(rowIndex) { return (rowIndex - 3.5) * SPACING; }
  function squareName(fileIndex, rowIndex) { return FILES.charAt(fileIndex) + (8 - rowIndex); }

  for (var row = 0; row < 8; row++) {
    squares[row] = [];
    for (var file = 0; file < 8; file++) {
      var isEvenTile = (row + file) % 2 === 0;
      var baseColor = isEvenTile ? PALETTE.squareLight : PALETTE.squareDark;
      var material = new THREE.MeshPhongMaterial({ color: baseColor, specular: 0x111111, shininess: 0 });
      var cube = new THREE.Mesh(squareGeometry, material);
      cube.position.set(worldX(file), 0, worldZ(row));
      cube.add(new THREE.LineSegments(squareEdgeGeometry, squareEdgeMaterial));
      cube.userData.baseColor = baseColor;
      cube.userData.isSquare = true;
      cube.userData.file = file;
      cube.userData.row = row;
      scene.add(cube);
      squares[row][file] = cube;
    }
  }

  var pieces = [];

  function latheMesh(group, profile, material, segments) {
    if (!group || !Array.isArray(profile) || profile.length < 2) {
      throw new Error('latheMesh requires a target group and at least two profile points.');
    }
    var points = profile.map(function (pair) {
      if (pair.length !== 2 || !Number.isFinite(pair[0]) || !Number.isFinite(pair[1])) {
        throw new Error('Invalid lathe profile point.');
      }
      return new THREE.Vector2(pair[0], pair[1]);
    });
    var geometry = new THREE.LatheGeometry(points, Math.max(8, Math.floor(segments || 32)));
    geometry.computeVertexNormals();
    return addPart(group, geometry, material, 0, 0, 0);
  }

  function makePieceMaterials(isWhite) {
    var main = new THREE.MeshPhongMaterial({
      color: isWhite ? PALETTE.whitePiece : PALETTE.blackPiece,
      specular: 0x111111, shininess: 0
    });
    var trim = new THREE.MeshPhongMaterial({
      color: isWhite ? PALETTE.edgeOnWhite : PALETTE.edgeOnBlack,
      specular: 0x111111, shininess: 0
    });
    return { main: main, trim: trim };
  }

  function addPart(group, geometry, material, x, y, z, rx, ry, rz) {
    var mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x || 0, y || 0, z || 0);
    if (rx) mesh.rotation.x = rx;
    if (ry) mesh.rotation.y = ry;
    if (rz) mesh.rotation.z = rz;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }

  function buildPrimitiveFallback(group, type, materials) {
    var main = materials.main;
    var trim = materials.trim;
    function part(geometry, material, y, x, z) {
      return addPart(group, geometry, material || main, x || 0, y || 0, z || 0);
    }
    part(new THREE.CylinderGeometry(0.43, 0.47, 0.16, 24), main, 0.08);
    part(new THREE.CylinderGeometry(0.30, 0.38, 0.18, 24), trim, 0.25);
    if (type === 'pawn') {
      part(new THREE.CylinderGeometry(0.14, 0.29, 0.72, 20), main, 0.70);
      part(new THREE.SphereGeometry(0.27, 20, 14), main, 1.20);
    } else if (type === 'rook') {
      part(new THREE.CylinderGeometry(0.22, 0.31, 1.00, 24), main, 0.85);
      part(new THREE.CylinderGeometry(0.43, 0.43, 0.25, 24), trim, 1.50);
      part(new THREE.CylinderGeometry(0.40, 0.40, 0.25, 24), main, 1.70);
      for (var ri = 0; ri < 8; ri++) {
        var angle = ri * Math.PI / 4;
        part(new THREE.BoxGeometry(0.17, 0.22, 0.17), trim, 1.92,
          Math.cos(angle) * 0.32, Math.sin(angle) * 0.32);
      }
    } else if (type === 'knight') {
      part(new THREE.CylinderGeometry(0.25, 0.34, 0.35, 20), main, 0.43);
      part(new THREE.BoxGeometry(0.42, 0.82, 0.25), main, 0.98);
      part(new THREE.SphereGeometry(0.24, 18, 14), main, 1.48, 0.08);
      part(new THREE.ConeGeometry(0.12, 0.34, 12), trim, 1.82, -0.12);
    } else if (type === 'bishop') {
      part(new THREE.ConeGeometry(0.20, 1.25, 24), main, 0.95);
      part(new THREE.SphereGeometry(0.12, 18, 14), trim, 1.58);
      part(new THREE.ConeGeometry(0.11, 0.34, 16), main, 1.86);
      part(new THREE.SphereGeometry(0.07, 16, 12), trim, 2.05);
    } else if (type === 'queen') {
      part(new THREE.ConeGeometry(0.24, 1.20, 24), main, 0.90);
      part(new THREE.CylinderGeometry(0.36, 0.22, 0.20, 24), trim, 1.55);
      part(new THREE.SphereGeometry(0.18, 18, 14), main, 1.72);
      for (var qi = 0; qi < 8; qi++) {
        var qa = qi * Math.PI / 4;
        part(new THREE.ConeGeometry(0.065, 0.25, 8), trim, 1.91,
          Math.cos(qa) * 0.32, Math.sin(qa) * 0.32);
      }
    } else if (type === 'king') {
      part(new THREE.CylinderGeometry(0.28, 0.38, 1.35, 24), main, 0.92);
      part(new THREE.CylinderGeometry(0.36, 0.36, 0.13, 24), trim, 1.66);
      part(new THREE.BoxGeometry(0.12, 0.48, 0.12), main, 2.00);
      part(new THREE.BoxGeometry(0.38, 0.12, 0.12), main, 2.10);
    }
  }

  function buildProceduralPiece(type, isWhite) {
    var mats = makePieceMaterials(isWhite);
    var g = new THREE.Group();
    var height = 1.5;
    var base = function (r1, r2, h, y, seg) {
      return addPart(g, new THREE.CylinderGeometry(r1, r2, h, seg || 40), mats.main, 0, y, 0);
    };
    var trimRing = function (radius, tube, y) {
      return addPart(g, new THREE.TorusGeometry(radius, tube, 10, 40), mats.trim, 0, y, 0, Math.PI / 2);
    };
    try {
      if (type === 'pawn') {
        height = 1.55;
        base(0.43, 0.46, 0.16, 0.08, 40);
        addPart(g, new THREE.CylinderGeometry(0.15, 0.30, 0.78, 40), mats.main, 0, 0.53, 0);
        trimRing(0.22, 0.045, 0.98);
        addPart(g, new THREE.SphereGeometry(0.285, 32, 24), mats.main, 0, 1.28, 0);
      } else if (type === 'rook') {
        height = 2.05;
        base(0.46, 0.48, 0.18, 0.09, 40);
        trimRing(0.37, 0.045, 0.22);
        latheMesh(g, [[0.25,0.18],[0.29,0.28],[0.22,0.42],[0.19,0.95],[0.25,1.10],[0.37,1.18],[0.39,1.30],[0.42,1.34]], mats.main, 40);
        base(0.43, 0.38, 0.24, 1.38, 40);
        trimRing(0.40, 0.045, 1.52);
        addPart(g, new THREE.CylinderGeometry(0.43, 0.43, 0.28, 40), mats.main, 0, 1.66, 0);
        for (var ri = 0; ri < 8; ri++) {
          var ra = ri * Math.PI / 4;
          var merlon = addPart(g, new THREE.BoxGeometry(0.19, 0.25, 0.19), mats.trim, Math.cos(ra) * 0.34, 1.91, Math.sin(ra) * 0.34);
          merlon.rotation.y = -ra;
        }
      } else if (type === 'knight') {
        height = 0.86;
        g.rotation.y = isWhite ? Math.PI : 0;
        addPart(g, new THREE.CylinderGeometry(0.35, 0.4, 0.15, 16), mats.main, 0, 0.075, 0);
        addPart(g, new THREE.CylinderGeometry(0.2, 0.28, 0.4, 16), mats.main, 0, 0.35, 0);
        var knightNeck = addPart(g, new THREE.BoxGeometry(0.22, 0.25, 0.45), mats.main, 0, 0.65, 0.08);
        knightNeck.rotation.x = 0.15;
        addPart(g, new THREE.BoxGeometry(0.18, 0.16, 0.2), mats.main, 0, 0.6, 0.3);
        addPart(g, new THREE.ConeGeometry(0.04, 0.12, 4), mats.trim, 0.07, 0.8, -0.05);
        addPart(g, new THREE.ConeGeometry(0.04, 0.12, 4), mats.trim, -0.07, 0.8, -0.05);
      } else if (type === 'bishop') {
        height = 1.24;
        addPart(g, new THREE.CylinderGeometry(0.35, 0.4, 0.15, 16), mats.main, 0, 0.075, 0);
        addPart(g, new THREE.CylinderGeometry(0.15, 0.25, 0.5, 16), mats.main, 0, 0.4, 0);
        addPart(g, new THREE.CylinderGeometry(0.22, 0.22, 0.05, 16), mats.trim, 0, 0.65, 0);
        var headGeom = new THREE.SphereGeometry(0.22, 16, 16);
        headGeom.scale(1, 1.4, 1);
        addPart(g, headGeom, mats.main, 0, 0.85, 0);
        addPart(g, new THREE.SphereGeometry(0.06, 8, 8), mats.trim, 0, 1.18, 0);
      } else if (type === 'queen') {
        height = 2.12;
        base(0.47, 0.49, 0.18, 0.09, 44);
        trimRing(0.38, 0.045, 0.22);
        latheMesh(g, [[0.25,0.18],[0.31,0.30],[0.22,0.52],[0.17,0.95],[0.24,1.22],[0.36,1.34],[0.40,1.42]], mats.main, 44);
        trimRing(0.37, 0.045, 1.43);
        latheMesh(g, [[0.20,1.40],[0.25,1.50],[0.39,1.68],[0.43,1.82],[0.34,1.86],[0.18,1.78]], mats.trim, 44);
        addPart(g, new THREE.SphereGeometry(0.19, 28, 20), mats.main, 0, 1.78, 0);
        for (var qi = 0; qi < 8; qi++) {
          var qa = qi * Math.PI / 4;
          addPart(g, new THREE.ConeGeometry(0.075, 0.30, 12), mats.main, Math.cos(qa) * 0.34, 1.94, Math.sin(qa) * 0.34, 0, 0, -Math.cos(qa) * 0.28);
        }
      } else if (type === 'king') {
        height = 2.4;
        base(0.48, 0.50, 0.18, 0.09, 44);
        trimRing(0.39, 0.045, 0.22);
        latheMesh(g, [[0.27,0.18],[0.34,0.34],[0.29,0.56],[0.24,1.30],[0.30,1.55],[0.40,1.66]], mats.main, 44);
        trimRing(0.39, 0.05, 1.67);
        addPart(g, new THREE.CylinderGeometry(0.36, 0.39, 0.13, 44), mats.trim, 0, 1.75, 0);
        addPart(g, new THREE.BoxGeometry(0.13, 0.48, 0.13), mats.main, 0, 2.02, 0);
        addPart(g, new THREE.BoxGeometry(0.39, 0.13, 0.13), mats.main, 0, 2.10, 0);
        addPart(g, new THREE.SphereGeometry(0.085, 20, 16), mats.trim, 0, 2.27, 0);
      }
    } catch (modelError) {
      while (g.children.length) {
        var failedChild = g.children[g.children.length - 1];
        g.remove(failedChild);
        if (failedChild.geometry && failedChild.geometry.dispose) failedChild.geometry.dispose();
      }
      height = type === 'pawn' ? 1.55 : (type === 'rook' || type === 'bishop' ? 2.05 : (type === 'queen' ? 2.12 : (type === 'king' ? 2.4 : 1.95)));
      buildPrimitiveFallback(g, type, mats);
      if (window.console && console.warn) console.warn('Procedural ' + type + ' model used primitive fallback:', modelError);
    }
    g.traverse(function (obj) { if (obj.isMesh) { obj.castShadow = true; obj.receiveShadow = true; } });
    return { group: g, height: height };
  }

  function addPiece(type, isWhite, fileIndex, rowIndex) {
    var spec = buildProceduralPiece(type, isWhite);
    var mesh = new THREE.Group();
    mesh.position.set(worldX(fileIndex), TOP_Y + spec.height / 2, worldZ(rowIndex));
    spec.group.position.y = -spec.height / 2;
    mesh.add(spec.group);
    mesh.userData.visualHeight = spec.height;
    scene.add(mesh);
    var piece = {
      mesh: mesh,
      visualHeight: spec.height,
      type: type,
      isWhite: isWhite,
      file: fileIndex,
      row: rowIndex
    };
    mesh.userData.piece = piece;
    spec.group.traverse(function (obj) { if (obj.isMesh) obj.userData.piece = piece; });
    pieces.push(piece);
  }

  function setupPieces() {
    for (var f = 0; f < 8; f++) {
      addPiece(BACK_RANK[f], false, f, 0);
      addPiece('pawn', false, f, 1);
      addPiece('pawn', true, f, 6);
      addPiece(BACK_RANK[f], true, f, 7);
    }
  }
  setupPieces();

  var BIRD_POS = new THREE.Vector3(0, 17, 0.001);
  var ORIGIN = new THREE.Vector3(0, 0, 0);
  var UP_Y = new THREE.Vector3(0, 1, 0);
  var POV_EYE_Y = 1.45;
  var POV_LOOK_DISTANCE = 0.02;
  var ENTER_MS = 1100;
  var RETURN_MS = 900;

  function lookQuat(position, target, up) {
    var m = new THREE.Matrix4();
    m.lookAt(position, target, up);
    return new THREE.Quaternion().setFromRotationMatrix(m);
  }
  var BIRD_QUAT = lookQuat(BIRD_POS, ORIGIN, new THREE.Vector3(0, 0, -1));

  var tween = null;
  function startTween(toPos, toQuat, duration, onDone) {
    tween = {
      fromPos: camera.position.clone(), fromQuat: camera.quaternion.clone(),
      toPos: toPos, toQuat: toQuat, start: performance.now(), duration: duration, onDone: onDone
    };
  }
  function easeInOutCubic(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function stepTween(now) {
    if (!tween) { return; }
    var raw = Math.min(1, Math.max(0, (now - tween.start) / tween.duration));
    var t = easeInOutCubic(raw);
    camera.position.lerpVectors(tween.fromPos, tween.toPos, t);
    camera.quaternion.copy(tween.fromQuat).slerp(tween.toQuat, t);
    if (raw >= 1) {
      var done = tween.onDone;
      tween = null;
      if (done) { done(); }
    }
  }

  var pieceLerp = null;
  var PIECE_LERP_MS = 400;

  function startPieceLerp(piece, toX, toY, toZ, duration, onDone) {
    pieceLerp = {
      piece: piece,
      fromX: piece.mesh.position.x, fromY: piece.mesh.position.y, fromZ: piece.mesh.position.z,
      toX: toX, toY: toY, toZ: toZ,
      start: performance.now(), duration: duration || PIECE_LERP_MS,
      onDone: onDone || null
    };
  }

  function stepPieceLerp(now) {
    if (!pieceLerp) return false;
    var raw = Math.min(1, Math.max(0, (now - pieceLerp.start) / pieceLerp.duration));
    var t = easeInOutCubic(raw);
    var p = pieceLerp.piece;
    p.mesh.position.x = pieceLerp.fromX + (pieceLerp.toX - pieceLerp.fromX) * t;
    p.mesh.position.y = pieceLerp.fromY + (pieceLerp.toY - pieceLerp.fromY) * t;
    p.mesh.position.z = pieceLerp.fromZ + (pieceLerp.toZ - pieceLerp.fromZ) * t;
    if (raw >= 1) {
      p.mesh.position.set(pieceLerp.toX, pieceLerp.toY, pieceLerp.toZ);
      var done = pieceLerp.onDone;
      pieceLerp = null;
      if (done) done();
      return false;
    }
    return true;
  }

  var state = 'strategic';
  var turn = 'white';
  var round = 1;
  var selected = null;
  var gameOver = null;

  var FLAG_POOL = 5;
  var LASER_MS = 350;
  var tiles = [];
  for (var tr = 0; tr < 8; tr++) {
    tiles[tr] = [];
    for (var tc = 0; tc < 8; tc++) { tiles[tr][tc] = { flaggedBy: null, revealed: false }; }
  }
  function flagsLeft(side) {
    var used = 0;
    for (var r = 0; r < 8; r++) {
      for (var c = 0; c < 8; c++) { if (tiles[r][c].flaggedBy === side) { used += 1; } }
    }
    return FLAG_POOL - used;
  }
  var RECESS_SCALE = 0.7;
  function tileSurfaceY(rowIndex, fileIndex) {
    return TOP_Y - (tiles[rowIndex][fileIndex].revealed ? SQUARE_HEIGHT * (1 - RECESS_SCALE) : 0);
  }
  function settlePiece(piece) {
    if (piece.offset === undefined) { piece.offset = piece.mesh.position.y - TOP_Y; }
    piece.mesh.position.y = tileSurfaceY(piece.row, piece.file) + piece.offset;
  }
  function refreshTile(rowIndex, fileIndex) {
    var sq = squares[rowIndex][fileIndex];
    var tile = tiles[rowIndex][fileIndex];
    var color = sq.userData.baseColor;
    if (tile.revealed) { color = tile.crater ? PALETTE.squareMine : PALETTE.squareRevealed; }
    else if (tile.flaggedBy) { color = PALETTE.squareFlag; }
    sq.material.color.setHex(color);
    sq.scale.y = tile.revealed ? RECESS_SCALE : 1;
    sq.position.y = tile.revealed ? (-SQUARE_HEIGHT / 2 + (SQUARE_HEIGHT * RECESS_SCALE) / 2) : 0;
    var occupant = findPieceAt(fileIndex, rowIndex);
    if (occupant) { settlePiece(occupant); }
  }
  var flagLabel = document.getElementById('flagLabel');
  var poolLabel = document.getElementById('poolLabel');
  var mineLabel = document.getElementById('mineLabel');
  var crosshair = document.getElementById('crosshair');
  var modeBar = document.getElementById('modeBar');
  var modeLine = document.getElementById('modeLine');
  var fpvMode = 'MOVE';

  var turnBlock = document.getElementById('turnBlock');
  var turnLabel = document.getElementById('turnLabel');
  var roundLabel = document.getElementById('roundLabel');
  var viewLabel = document.getElementById('viewLabel');
  var statusLabel = document.getElementById('statusLabel');
  var btnBack = document.getElementById('btnBack');
  var btnEnd = document.getElementById('btnEnd');
  var btnUndo = document.getElementById('btnUndo');

  var turnTimeRemaining = 60.0;
  var TURN_TIME_MAX = 60.0;
  var turnClockEl = document.getElementById('turnClock');
  var turnClockOwner = document.getElementById('turnClockOwner');
  var turnClockReadout = document.getElementById('turnClockReadout');
  var turnClockFill = document.getElementById('turnClockFill');

  function resetTurnClock() { turnTimeRemaining = TURN_TIME_MAX; }
  function renderTurnClock() {
    if (!turnClockEl) return;
    var showClock = matchActive && (state === 'strategic' || state === 'entering' || state === 'pov' || state === 'confirming');
    turnClockEl.style.display = showClock ? 'block' : 'none';
    if (!showClock) return;
    turnClockEl.setAttribute('data-side', turn);
    turnClockOwner.textContent = cap(turn).toUpperCase() + ' TURN · ' + round;
    var seconds = Math.max(0, turnTimeRemaining);
    turnClockReadout.textContent = seconds.toFixed(1) + 's';
    var pct = Math.max(0, Math.min(1, seconds / TURN_TIME_MAX)) * 100;
    turnClockFill.style.width = pct.toFixed(2) + '%';
    var warn = seconds <= 20 && seconds > 10;
    var crit = seconds <= 10;
    turnClockFill.setAttribute('data-warn', warn ? 'true' : 'false');
    turnClockFill.setAttribute('data-critical', crit ? 'true' : 'false');
  }

  function sideWord(side) { return side === 'white' ? 'green' : (side === 'black' ? 'magenta' : side); }
  function cap(word) {
    var shown = sideWord(word);
    return shown.charAt(0).toUpperCase() + shown.slice(1);
  }
  function sideOf(piece) { return piece.isWhite ? 'white' : 'black'; }
  function setStatus(text) { statusLabel.textContent = text; }
  function pieceLabel(piece) {
    return cap(sideOf(piece)) + ' ' + piece.type + ' ' + squareName(piece.file, piece.row);
  }

  function updateHud() {
    var label = selected ? pieceLabel(selected) : '';
    turnBlock.setAttribute('data-side', turn);
    turnLabel.textContent = cap(turn) + ' turn';
    roundLabel.textContent = 'Round ' + round;
    if (state === 'pov') { viewLabel.textContent = 'Piece view: ' + label; }
    else if (state === 'entering') { viewLabel.textContent = 'Zooming into ' + label; }
    else if (state === 'returning') { viewLabel.textContent = 'Returning to strategic view'; }
    else if (state === 'duel') { viewLabel.textContent = 'Combat arena: ' + (selected ? pieceLabel(selected) : 'duel'); }
    else if (state === 'over') { viewLabel.textContent = 'Game over'; }
    else if (state === 'confirming') { viewLabel.textContent = 'Awaiting confirmation'; }
    else { viewLabel.textContent = 'Strategic view: choose a ' + sideWord(turn) + ' piece'; }
    btnBack.disabled = !(state === 'entering' || state === 'pov');
    btnEnd.disabled = state === 'over' || state === 'confirming';
    btnUndo.disabled = !canUndo();
    flagLabel.textContent = 'Flags Remaining: ' + flagsLeft(turn);
    poolLabel.textContent = 'Green ' + flagsLeft('white') + ', Magenta ' + flagsLeft('black');
    mineLabel.textContent = minesPlaced
      ? 'Mines: ' + MINE_COUNT + ', safe tiles left: ' + safeTilesLeft()
      : 'Mines: placed after both first moves (' + firstMoveCount + ' of ' + FIRST_MOVES_REQUIRED + ' done)';
    crosshair.style.display = state === 'pov' ? 'block' : 'none';
    crosshair.setAttribute('data-mode', fpvMode);
    modeBar.style.display = state === 'pov' ? 'block' : 'none';
    modeBar.setAttribute('data-mode', fpvMode);
    modeLine.textContent = fpvMode === 'MOVE' ? 'ACTIVE MODE: [MOVEMENT]' : 'ACTIVE MODE: [FLAGGING]';
    renderTurnClock();
  }

  function configureBirdControls() {
    controls.enablePan = true;
    controls.enableZoom = true;
    controls.rotateSpeed = 1;
    controls.minPolarAngle = 0;
    controls.maxPolarAngle = Math.PI;
    controls.minDistance = 6;
    controls.maxDistance = 40;
  }
  function configurePovControls() {
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.rotateSpeed = -0.45;
    controls.minPolarAngle = 0.15;
    controls.maxPolarAngle = Math.PI - 0.15;
    controls.minDistance = POV_LOOK_DISTANCE;
    controls.maxDistance = POV_LOOK_DISTANCE;
  }

  function clearSelection() {
    if (!selected) { return; }
    selected.mesh.visible = true;
    var sqRow = selected.row;
    var sqFile = selected.file;
    selected = null;
    refreshTile(sqRow, sqFile);
  }

  function selectPiece(piece) {
    clearSelection();
    selected = piece;
    squares[piece.row][piece.file].material.color.setHex(PALETTE.squareActive);
    var forwardZ = piece.isWhite ? -1 : 1;
    var eye = new THREE.Vector3(piece.mesh.position.x, POV_EYE_Y, piece.mesh.position.z);
    var lookAtPoint = new THREE.Vector3(eye.x, eye.y, eye.z + forwardZ);
    state = 'entering';
    fpvMode = 'MOVE';
    requestLock();
    setStatus('Selected ' + pieceLabel(piece) + '.');
    startTween(eye, lookQuat(eye, lookAtPoint, UP_Y), ENTER_MS, function () {
      if (state !== 'entering' || selected !== piece) { return; }
      piece.mesh.visible = false;
      configurePovControls();
      camera.position.copy(eye);
      controls.target.set(eye.x, eye.y, eye.z + forwardZ * POV_LOOK_DISTANCE);
      controls.update();
      lookYaw = forwardZ < 0 ? 0 : Math.PI;
      lookPitch = 0;
      state = 'pov';
      setStatus(isLocked() ? 'Aim the crosshair at a tile and click to move there. Press Q or scroll to switch to flagging.' : 'Pointer lock unavailable. Drag to look around, click to shoot.');
      updateHud();
    });
    updateHud();
  }

  function beginReturn(message) {
    releaseLock();
    clearSelection();
    state = 'returning';
    setStatus(message || (cap(turn) + ' to move. Click a ' + sideWord(turn) + ' piece.'));
    startTween(BIRD_POS.clone(), BIRD_QUAT.clone(), RETURN_MS, function () {
      configureBirdControls();
      camera.position.copy(BIRD_POS);
      controls.target.copy(ORIGIN);
      controls.update();
      controls.enabled = !isLocked();
      state = gameOver ? 'over' : 'strategic';
      updateHud();
    });
    updateHud();
  }

  function endTurn(note) {
    if (gameOver) { return; }
    turn = turn === 'white' ? 'black' : 'white';
    if (turn === 'white') { round += 1; }
    var message = (note ? note + ' ' : '') + cap(turn) + ' to move. Click a ' + sideWord(turn) + ' piece.';
    if (state === 'entering' || state === 'pov') { beginReturn(message); }
    else { clearSelection(); setStatus(message); }
    resetTurnClock();
    turnSnapshot = null;
    updateHud();
  }

  var turnSnapshot = null;

  function canUndo() {
    return turnSnapshot !== null && !gameOver && state === 'strategic';
  }

  function deepCopyTiles() {
    var out = [];
    for (var r = 0; r < 8; r++) {
      out[r] = [];
      for (var c = 0; c < 8; c++) {
        var t = tiles[r][c];
        out[r][c] = {
          flaggedBy: t.flaggedBy,
          revealed: t.revealed,
          crater: t.crater ? true : false,
          count: typeof t.count === 'number' ? t.count : undefined
        };
      }
    }
    return out;
  }

  function deepCopyMines() {
    var out = [];
    for (var r = 0; r < 8; r++) {
      out[r] = [];
      for (var c = 0; c < 8; c++) { out[r][c] = mineArray[r][c]; }
    }
    return out;
  }

  function deepCopyPieces() {
    return pieces.map(function (p) {
      return { ref: p, file: p.file, row: p.row };
    });
  }

  function captureTurnSnapshot() {
    if (turnSnapshot) return;
    turnSnapshot = {
      side: turn,
      tiles: deepCopyTiles(),
      mines: deepCopyMines(),
      pieces: deepCopyPieces(),
      firstMoveCount: firstMoveCount,
      firstMoves: {
        white: firstMoves.white ? { row: firstMoves.white.row, file: firstMoves.white.file } : null,
        black: firstMoves.black ? { row: firstMoves.black.row, file: firstMoves.black.file } : null
      },
      minesPlaced: minesPlaced,
      clock: turnTimeRemaining
    };
  }

  function clearAllNumberLabels() {
    for (var i = numberGroups.length - 1; i >= 0; i--) {
      var g = numberGroups[i];
      scene.remove(g);
      g.traverse(function (obj) {
        if (obj.geometry && obj.geometry.dispose) obj.geometry.dispose();
        if (obj.material) {
          if (obj.material.map && obj.material.map.dispose) obj.material.map.dispose();
          if (obj.material.dispose) obj.material.dispose();
        }
      });
    }
    numberGroups.length = 0;
  }

  function restoreSnapshot() {
    if (!turnSnapshot || gameOver) return;
    var snap = turnSnapshot;
    for (var r = 0; r < 8; r++) {
      for (var c = 0; c < 8; c++) {
        var src = snap.tiles[r][c];
        tiles[r][c] = {
          flaggedBy: src.flaggedBy,
          revealed: src.revealed,
          crater: src.crater ? true : false,
          count: src.count
        };
        mineArray[r][c] = snap.mines[r][c];
      }
    }
    firstMoveCount = snap.firstMoveCount;
    firstMoves = {
      white: snap.firstMoves.white ? { row: snap.firstMoves.white.row, file: snap.firstMoves.white.file } : null,
      black: snap.firstMoves.black ? { row: snap.firstMoves.black.row, file: snap.firstMoves.black.file } : null
    };
    minesPlaced = snap.minesPlaced;
    invalidateSafeTileCache();

    clearAllNumberLabels();
    for (var pr = 0; pr < 8; pr++) {
      for (var pc = 0; pc < 8; pc++) {
        var tileNow = tiles[pr][pc];
        if (tileNow.revealed && typeof tileNow.count === 'number' && tileNow.count > 0) {
          placeLabel(pr, pc, String(tileNow.count), NUMBER_COLORS[tileNow.count]);
        }
        refreshTile(pr, pc);
      }
    }
    clearCraterGroups();
    for (var cr = 0; cr < 8; cr++) {
      for (var cc = 0; cc < 8; cc++) {
        if (tiles[cr][cc].revealed && tiles[cr][cc].crater) {
          placeCrater(cr, cc);
        }
      }
    }

    for (var pIndex = 0; pIndex < snap.pieces.length; pIndex++) {
      var entry = snap.pieces[pIndex];
      var piece = entry.ref;
      if (pieces.indexOf(piece) === -1) {
        pieces.push(piece);
        scene.add(piece.mesh);
        piece.mesh.visible = true;
      }
      piece.file = entry.file;
      piece.row = entry.row;
      piece.mesh.position.x = worldX(entry.file);
      piece.mesh.position.z = worldZ(entry.row);
      piece.mesh.position.y = TOP_Y + (piece.visualHeight || 1.6) / 2;
      settlePiece(piece);
    }

    selected = null;
    turnTimeRemaining = snap.clock;
    turnSnapshot = null;
    setStatus(cap(turn) + ' turn restored. Click a ' + sideWord(turn) + ' piece.');
    updateHud();
  }

  function clearCraterGroups() {
    for (var ci = craterGroups.length - 1; ci >= 0; ci--) {
      scene.remove(craterGroups[ci]);
      craterGroups[ci].traverse(function (obj) {
        if (obj.geometry && obj.geometry.dispose) obj.geometry.dispose();
        if (obj.material && obj.material.dispose) obj.material.dispose();
      });
    }
    craterGroups.length = 0;
  }

  function undoMove() {
    if (!canUndo()) return;
    AudioFX.confirmChime();
    restoreSnapshot();
  }

  var raycaster = new THREE.Raycaster();
  var ndc = new THREE.Vector2();

  function findPieceAt(fileIndex, rowIndex) {
    for (var n = 0; n < pieces.length; n++) {
      if (pieces[n].file === fileIndex && pieces[n].row === rowIndex) { return pieces[n]; }
    }
    return null;
  }

  function intersectPickTargets(activeRaycaster) {
    var squareTargets = [];
    for (var r = 0; r < 8; r++)
      for (var c = 0; c < 8; c++)
        if (squares[r][c].visible) squareTargets.push(squares[r][c]);
    var pieceTargets = [];
    for (var i = 0; i < pieces.length; i++)
      if (pieces[i].mesh.visible) pieceTargets.push(pieces[i].mesh);
    var hits = activeRaycaster.intersectObjects(squareTargets, false)
      .concat(activeRaycaster.intersectObjects(pieceTargets, true));
    hits.sort(function (a, b) { return a.distance - b.distance; });
    return hits;
  }

  function pickAt(clientX, clientY) {
    var rect = canvas.getBoundingClientRect();
    if (!(rect.width > 0) || !(rect.height > 0) || !isFinite(clientX) || !isFinite(clientY)) { return { kind: 'none' }; }
    var x = clientX - rect.left;
    var y = clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) { return { kind: 'none' }; }
    ndc.set((x / rect.width) * 2 - 1, -(y / rect.height) * 2 + 1);
    camera.updateMatrixWorld(true);
    raycaster.setFromCamera(ndc, camera);
    var hits = intersectPickTargets(raycaster);
    if (hits.length === 0) { return { kind: 'none' }; }
    var data = hits[0].object.userData || {};
    if (data.piece) { return { kind: 'piece', piece: data.piece }; }
    if (data.isSquare) {
      var occupant = findPieceAt(data.file, data.row);
      if (occupant) { return { kind: 'piece', piece: occupant }; }
      return { kind: 'empty', name: squareName(data.file, data.row), file: data.file, row: data.row };
    }
    return { kind: 'none' };
  }

  function handleBoardClick(clientX, clientY) {
    if (state === 'pov') { shoot(); return; }
    if (state !== 'strategic') { return; }
    var pick = pickAt(clientX, clientY);
    if (pick.kind === 'none') { setStatus('Nothing there. Click one of your ' + sideWord(turn) + ' pieces.'); return; }
    if (pick.kind === 'empty') { setStatus('Square ' + pick.name + ' is empty. Click one of your ' + sideWord(turn) + ' pieces.'); return; }
    if (!pick.piece || !pick.piece.mesh) { return; }
    if (sideOf(pick.piece) !== turn) {
      setStatus('That is a ' + sideWord(sideOf(pick.piece)) + ' piece, and it is ' + sideWord(turn) + '’s turn.');
      return;
    }
    selectPiece(pick.piece);
  }

  var downInfo = null;
  canvas.addEventListener('pointerdown', function (event) {
    AudioFX.unlock();
    if (event.button !== 0) { downInfo = null; return; }
    var now = performance.now();
    if (downInfo && downInfo.id !== event.pointerId && now - downInfo.t < 800) { downInfo = null; return; }
    downInfo = { id: event.pointerId, x: event.clientX, y: event.clientY, t: now };
  });
  window.addEventListener('pointerup', function (event) {
    var info = downInfo;
    downInfo = null;
    if (!info || info.id !== event.pointerId || event.button !== 0) { return; }
    var moved = Math.hypot(event.clientX - info.x, event.clientY - info.y);
    if (moved > 6 || performance.now() - info.t > 600) { return; }
    handleBoardClick(event.clientX, event.clientY);
  });
  window.addEventListener('pointercancel', function () { downInfo = null; });

  canvas.addEventListener('pointermove', function (event) {
    if (state === 'pov') { canvas.style.cursor = 'crosshair'; return; }
    if (state !== 'strategic' || event.buttons !== 0) { canvas.style.cursor = 'default'; return; }
    var pick = pickAt(event.clientX, event.clientY);
    canvas.style.cursor = (pick.kind === 'piece' && sideOf(pick.piece) === turn) ? 'pointer' : 'default';
  });

  ['pointerdown', 'mousedown', 'touchstart', 'wheel', 'contextmenu'].forEach(function (name) {
    canvas.addEventListener(name, function (event) {
      if (state === 'entering' || state === 'returning') {
        event.stopImmediatePropagation();
        event.preventDefault();
      }
    }, { capture: true, passive: false });
  });

  var MINE_COUNT = 10;
  var FIRST_MOVES_REQUIRED = 2;
  var MINE_ROW_MIN = 2;
  var MINE_ROW_MAX = 5;
  var mineArray = [];
  for (var mr = 0; mr < 8; mr++) {
    mineArray[mr] = [];
    for (var mc = 0; mc < 8; mc++) { mineArray[mr][mc] = false; }
  }
  var firstMoveCount = 0;
  var firstMoves = { white: null, black: null };
  var minesPlaced = false;
  var numberGroups = [];
  var tmpDir = new THREE.Vector3();
  var tmpUp = new THREE.Vector3();

  var _safeTilesCache = null;
  function invalidateSafeTileCache() { _safeTilesCache = null; }

  function inBounds(rowIndex, fileIndex) { return rowIndex >= 0 && rowIndex < 8 && fileIndex >= 0 && fileIndex < 8; }

  function generateMines() {
    var blocked = [];
    for (var br = 0; br < 8; br++) {
      blocked[br] = [];
      for (var bc = 0; bc < 8; bc++) { blocked[br][bc] = false; }
    }
    ['white', 'black'].forEach(function (side) {
      var move = firstMoves[side];
      for (var dr = -1; dr <= 1; dr++) {
        for (var df = -1; df <= 1; df++) {
          var r = move.row + dr;
          var c = move.file + df;
          if (r < 0 || r > 7 || c < 0 || c > 7) { continue; }
          blocked[r][c] = true;
        }
      }
    });
    var candidates = [];
    for (var row = MINE_ROW_MIN; row <= MINE_ROW_MAX; row++) {
      for (var col = 0; col < 8; col++) {
        if (!blocked[row][col]) { candidates.push({ row: row, col: col }); }
      }
    }
    if (candidates.length < MINE_COUNT) { throw new Error('Not enough free central tiles for ' + MINE_COUNT + ' mines.'); }
    for (var i = candidates.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var swap = candidates[i];
      candidates[i] = candidates[j];
      candidates[j] = swap;
    }
    for (var m = 0; m < MINE_COUNT; m++) {
      mineArray[candidates[m].row][candidates[m].col] = true;
    }
    var placed = 0;
    for (var vr = 0; vr < 8; vr++) {
      for (var vc = 0; vc < 8; vc++) {
        if (!mineArray[vr][vc]) { continue; }
        placed += 1;
        if (vr < MINE_ROW_MIN || vr > MINE_ROW_MAX || blocked[vr][vc]) { throw new Error('Mine placed in a protected tile.'); }
      }
    }
    if (placed !== MINE_COUNT) { throw new Error('Expected ' + MINE_COUNT + ' mines, placed ' + placed + '.'); }
    minesPlaced = true;
    invalidateSafeTileCache();
  }

  function recordFirstMove(side, rowIndex, fileIndex) {
    if (firstMoves[side] !== null) { return; }
    firstMoves[side] = { row: rowIndex, file: fileIndex };
    firstMoveCount += 1;
    if (firstMoveCount === FIRST_MOVES_REQUIRED && !minesPlaced) {
      generateMines();
      ['white', 'black'].forEach(function (moveSide) {
        var move = firstMoves[moveSide];
        if (tiles[move.row][move.file].revealed) { revealTileCascade(move.file, move.row, false); }
      });
    }
  }

  function getAdjacentMineCount(row, col) {
    var count = 0;
    for (var i = -1; i <= 1; i++) {
      for (var j = -1; j <= 1; j++) {
        if (i === 0 && j === 0) continue;
        var r = row + i;
        var c = col + j;
        if (r >= 0 && r < 8 && c >= 0 && c < 8) {
          if (mineArray[r][c] === true) count++;
        }
      }
    }
    return count;
  }

  function tileFromPoint(point) {
    var fileIndex = Math.round(point.x / SPACING + 3.5);
    var rowIndex = Math.round(point.z / SPACING + 3.5);
    if (!inBounds(rowIndex, fileIndex)) { return null; }
    var half = SQUARE_SIZE / 2 + 0.000001;
    if (Math.abs(point.x - worldX(fileIndex)) > half || Math.abs(point.z - worldZ(rowIndex)) > half) { return null; }
    return { file: fileIndex, row: rowIndex };
  }

  var NUMBER_COLORS = ['#2b2b2b', '#0a5cd6', '#1b8a3a', '#d32020', '#13306e', '#8a2b0a', '#007a7a', '#000000', '#555555'];

  function placeLabel(rowIndex, fileIndex, text, color) {
    var surface = document.createElement('canvas');
    surface.width = 128;
    surface.height = 128;
    var ctx = surface.getContext('2d');
    ctx.fillStyle = color;
    ctx.font = 'bold 104px Helvetica, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 64, 70);
    var plane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.8, 0.8),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(surface), transparent: true, depthWrite: false })
    );
    plane.rotation.x = -Math.PI / 2;
    var group = new THREE.Group();
    group.position.set(worldX(fileIndex), tileSurfaceY(rowIndex, fileIndex) + 0.03, worldZ(rowIndex));
    group.add(plane);
    scene.add(group);
    numberGroups.push(group);
  }

  function updateNumberFacing() {
    if (numberGroups.length === 0) { return; }
    camera.getWorldDirection(tmpDir);
    tmpUp.set(0, 1, 0).applyQuaternion(camera.quaternion);
    var source = Math.abs(tmpDir.y) > 0.7 ? tmpUp : tmpDir;
    var length = Math.hypot(source.x, source.z);
    if (length < 0.05) { return; }
    var yaw = Math.atan2(-source.x / length, -source.z / length);
    for (var n = 0; n < numberGroups.length; n++) { numberGroups[n].rotation.y = yaw; }
  }

  function revealOwnTile() {
    if (state !== 'pov' || !selected) { return; }
    var rowIndex = selected.row;
    var fileIndex = selected.file;
    var tile = tiles[rowIndex][fileIndex];
    var name = squareName(fileIndex, rowIndex);
    if (tile.revealed) { setStatus('Tile ' + name + ' is already revealed.'); return; }
    if (tile.flaggedBy) { setStatus('Tile ' + name + ' is flagged. Unflag it before revealing.'); return; }
    if (!minesPlaced) {
      setStatus('Mines are placed after both players make their first move. Reveal is unavailable until then.');
      return;
    }
    var piece = selected;
    var result = resolveLanding(piece, rowIndex, fileIndex);
    if (result === 'exploded') {
      finishAction(cap(sideOf(piece)) + ' ' + piece.type + ' on ' + name + ' was standing on a mine and was destroyed.');
      return;
    }
    var message = 'Revealed ' + name + ': ' + tile.count + ' adjacent ' + (tile.count === 1 ? 'mine' : 'mines') + '.';
    if (gameOver) { finishAction(message); return; }
    setStatus(message);
    updateHud();
  }

  function attemptChord(rowIndex, fileIndex) {
    if (state !== 'pov' || !selected) return;
    var tile = tiles[rowIndex][fileIndex];
    if (!tile.revealed || typeof tile.count !== 'number' || tile.count <= 0) {
      return false;
    }
    var flaggedNeighbors = 0;
    var toReveal = [];
    for (var dr = -1; dr <= 1; dr++) {
      for (var df = -1; df <= 1; df++) {
        if (dr === 0 && df === 0) continue;
        var nr = rowIndex + dr;
        var nf = fileIndex + df;
        if (!inBounds(nr, nf)) continue;
        var nTile = tiles[nr][nf];
        if (nTile.flaggedBy) { flaggedNeighbors += 1; }
        else if (!nTile.revealed) { toReveal.push({ row: nr, file: nf }); }
      }
    }
    if (flaggedNeighbors !== tile.count) return false;
    if (toReveal.length === 0) return false;

    var piece = selected;
    var detonated = false;
    var detonation = null;

    for (var i = 0; i < toReveal.length; i++) {
      var target = toReveal[i];
      var tTile = tiles[target.row][target.file];
      if (tTile.revealed) continue;
      if (mineArray[target.row][target.file] && !tTile.flaggedBy) {
        detonated = true;
        detonation = target;
        break;
      }
    }

    if (detonated) {
      AudioFX.mineExplosion();
      tile.revealed = true;
      tile.flaggedBy = null;
      tile.count = getAdjacentMineCount(rowIndex, fileIndex);
      refreshTile(rowIndex, fileIndex);
      explode(piece, detonation.row, detonation.file);
      var msg = 'Chord detonated a hidden mine at ' + squareName(detonation.file, detonation.row) + '!';
      if (gameOver) { finishAction(msg); } else { finishAction(msg); }
      return true;
    }

    for (var k = 0; k < toReveal.length; k++) {
      var entry = toReveal[k];
      if (!tiles[entry.row][entry.file].revealed) {
        revealTileCascade(entry.file, entry.row, false);
      }
    }
    AudioFX.moveStep();
    if (minesPlaced && safeTilesLeft() === 0) {
      declareWinner(turn, cap(turn) + ' revealed the last safe tile.');
      finishAction('Chord cleared the final safe tiles.');
      return true;
    }
    setStatus('Chord revealed ' + toReveal.length + ' ' + (toReveal.length === 1 ? 'tile' : 'tiles') + '.');
    updateHud();
    return true;
  }

  var lookEuler = new THREE.Euler(0, 0, 0, 'YXZ');
  var lookYaw = 0;
  var lookPitch = 0;
  var LOOK_SPEED = 0.0022;
  var PITCH_LIMIT = Math.PI / 2 - 0.05;
  var lockHeld = false;

  function isLocked() { return document.pointerLockElement === canvas; }
  function requestLock() {
    if (state === 'duel' || !canvas.requestPointerLock) { return; }
    try {
      var result = canvas.requestPointerLock();
      if (result && typeof result.catch === 'function') { result.catch(function () {}); }
    } catch (err) { }
  }
  function releaseLock() {
    if (isLocked() && document.exitPointerLock) { document.exitPointerLock(); }
  }

  document.addEventListener('pointerlockchange', function () {
    if (state === 'duel') {
      controls.enabled = false;
      lockHeld = false;
      return;
    }
    var locked = isLocked();
    controls.enabled = !locked;
    if (locked && state !== 'entering' && state !== 'pov') { releaseLock(); return; }
    if (!locked && lockHeld && (state === 'entering' || state === 'pov')) {
      beginReturn('Pointer released. Back to the strategic view.');
    }
    lockHeld = locked;
  });
  document.addEventListener('pointerlockerror', function () {
    if (state === 'entering' || state === 'pov') {
      setStatus('Pointer lock was refused. Drag to look around, click to shoot.');
    }
  });
  function handlePovMouseMove(event) {
    if (state !== 'pov' || !isLocked()) { return; }
    lookYaw -= (event.movementX || 0) * LOOK_SPEED;
    lookPitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, lookPitch - (event.movementY || 0) * LOOK_SPEED));
    lookEuler.set(lookPitch, lookYaw, 0, 'YXZ');
    camera.quaternion.setFromEuler(lookEuler);
  }
  document.addEventListener('mousemove', handlePovMouseMove);

  var laser = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.018, 1, 8),
    new THREE.MeshBasicMaterial({ color: PALETTE.laser })
  );
  laser.visible = false;
  scene.add(laser);
  var laserUntil = 0;
  var CENTER = new THREE.Vector2(0, 0);

  function fireLaser(from, to) {
    var dir = new THREE.Vector3().subVectors(to, from);
    var length = dir.length();
    if (!(length > 0.0001)) { return; }
    dir.normalize();
    laser.position.copy(from).addScaledVector(dir, length / 2);
    laser.quaternion.setFromUnitVectors(UP_Y, dir);
    laser.scale.set(1, length, 1);
    laser.visible = true;
    laserUntil = performance.now() + LASER_MS;
  }
  function updateLaser(now) {
    if (laser.visible && now > laserUntil) { laser.visible = false; }
  }

  function revealSingleTile(x, z, isEntry) {
    var tile = tiles[z][x];
    tile.flaggedBy = null;
    tile.revealed = true;
    tile.count = getAdjacentMineCount(z, x);
    refreshTile(z, x);
    invalidateSafeTileCache();
    if (tile.count > 0) { placeLabel(z, x, String(tile.count), NUMBER_COLORS[tile.count]); }
  }

  function revealTileCascade(x, z, isEntry) {
    if (x < 0 || x > 7 || z < 0 || z > 7) { return; }
    var tile = tiles[z][x];
    if (mineArray[z][x] && !tile.flaggedBy) { return; }
    if (!tile.revealed) { revealSingleTile(x, z, isEntry); }
    if (tile.count !== 0) { return; }
    for (var dz = -1; dz <= 1; dz++) {
      for (var dx = -1; dx <= 1; dx++) {
        if (dz === 0 && dx === 0) { continue; }
        var nz = z + dz;
        var nx = x + dx;
        if (nz < 0 || nz > 7 || nx < 0 || nx > 7) { continue; }
        var neighbor = tiles[nz][nx];
        if (neighbor.revealed || neighbor.flaggedBy || mineArray[nz][nx]) { continue; }
        revealTileCascade(nx, nz, false);
      }
    }
  }

  var particles = [];
  var lastFrameTime = performance.now();
  var PARTICLE_MATERIALS = [0xff9a00, 0xffd400, 0xe8322a, 0x333333].map(function (c) { return new THREE.MeshBasicMaterial({ color: c }); });
  var particleGeometry = new THREE.BoxGeometry(0.09, 0.09, 0.09);
  var goTitle = document.getElementById('goTitle');
  var goText = document.getElementById('goText');
  document.getElementById('goRestart').addEventListener('click', function () { resetMatch(); showMainMenu(); });

  function birdHeight() {
    var halfFov = THREE.MathUtils.degToRad(camera.fov / 2);
    var neededForWidth = 11 / (2 * Math.tan(halfFov) * camera.aspect);
    return Math.min(38, Math.max(17, neededForWidth));
  }

  function safeTilesLeft() {
    if (_safeTilesCache !== null) return _safeTilesCache;
    var left = 0;
    for (var r = 0; r < 8; r++)
      for (var f = 0; f < 8; f++)
        if (!mineArray[r][f] && !tiles[r][f].revealed) left += 1;
    _safeTilesCache = left;
    return left;
  }

  function declareWinner(side, reason) {
    if (gameOver) { return; }
    gameOver = { winner: side, reason: reason };
    goTitle.textContent = 'Game over: ' + cap(side) + ' wins';
    goText.textContent = reason;
    document.getElementById('gameOver').style.display = 'block';
  }

  function declareTacticalVictory(side) {
    if (gameOver) { return; }
    gameOver = { winner: side, reason: 'All 5 flags matched true mines.' };
    goTitle.textContent = 'GARNULAR VICTORY!';
    goText.textContent = cap(side) + ' defused the minefield with perfect flag placement. ALL MINES DEFUSED!';
    document.getElementById('gameOver').style.display = 'block';
    AudioFX.tacticalVictory();
  }

  function finishAction(note) {
    if (gameOver) { beginReturn(note); updateHud(); return; }
    endTurn(note);
  }

  function removePiece(piece) {
    scene.remove(piece.mesh);
    var pieceIndex = pieces.indexOf(piece);
    if (pieceIndex >= 0) { pieces.splice(pieceIndex, 1); }
  }

  function placeCrater(rowIndex, fileIndex) {
    var group = new THREE.Group();
    var bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.18, 0.14, 24), new THREE.MeshLambertMaterial({ color: 0x050505 }));
    var rim = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.05, 8, 24), new THREE.MeshLambertMaterial({ color: 0x2a2a2a }));
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.04;
    group.add(bowl);
    group.add(rim);
    group.position.set(worldX(fileIndex), tileSurfaceY(rowIndex, fileIndex) + 0.02, worldZ(rowIndex));
    scene.add(group);
    craterGroups.push(group);
  }

  function spawnExplosion(x, z) {
    for (var n = 0; n < 56; n++) {
      var angle = Math.random() * Math.PI * 2;
      var speed = 1.5 + Math.random() * 3;
      var mesh = new THREE.Mesh(particleGeometry, PARTICLE_MATERIALS[n % PARTICLE_MATERIALS.length]);
      mesh.position.set(x, TOP_Y + 0.1, z);
      scene.add(mesh);
      particles.push({
        mesh: mesh, age: 0, life: 0.9 + Math.random() * 0.6,
        vx: Math.cos(angle) * speed, vy: 2 + Math.random() * 4, vz: Math.sin(angle) * speed
      });
    }
  }

  function updateParticles(dt) {
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.age += dt;
      if (p.age >= p.life) { scene.remove(p.mesh); particles.splice(i, 1); continue; }
      p.vy -= 9.8 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      if (p.mesh.position.y < TOP_Y + 0.05) {
        p.mesh.position.y = TOP_Y + 0.05;
        p.vy = Math.abs(p.vy) * 0.3;
        p.vx *= 0.7;
        p.vz *= 0.7;
      }
      p.mesh.rotation.x += 6 * dt;
      p.mesh.rotation.z += 4 * dt;
      p.mesh.scale.setScalar(Math.max(0.05, 1 - p.age / p.life));
    }
  }

  function explode(piece, rowIndex, fileIndex) {
    var tile = tiles[rowIndex][fileIndex];
    tile.revealed = true;
    tile.crater = true;
    tile.flaggedBy = null;
    refreshTile(rowIndex, fileIndex);
    invalidateSafeTileCache();
    placeCrater(rowIndex, fileIndex);
    spawnExplosion(worldX(fileIndex), worldZ(rowIndex));
    AudioFX.mineExplosion();
    removePiece(piece);
    if (piece.type === 'king') {
      declareWinner(sideOf(piece) === 'white' ? 'black' : 'white', cap(sideOf(piece)) + '’s king was destroyed by a mine on ' + squareName(fileIndex, rowIndex) + '.');
    }
  }

  function revealAndCheckSafety(fileIndex, rowIndex, isEntry) {
    if (minesPlaced) revealTileCascade(fileIndex, rowIndex, isEntry);
    else revealSingleTile(fileIndex, rowIndex, isEntry);
    if (minesPlaced && safeTilesLeft() === 0) {
      declareWinner(turn, cap(turn) + ' revealed the last safe tile.');
      return true;
    }
    return false;
  }

  function resolveLanding(piece, rowIndex, fileIndex) {
    var tile = tiles[rowIndex][fileIndex];
    if (tile.revealed) { return 'known'; }
    if (mineArray[rowIndex][fileIndex] && !tile.flaggedBy) {
      explode(piece, rowIndex, fileIndex);
      return 'exploded';
    }
    revealAndCheckSafety(fileIndex, rowIndex, true);
    return 'safe';
  }

  function checkFlagSymmetryVictory(side) {
    if (!minesPlaced) return false;
    var flags = [];
    for (var r = 0; r < 8; r++) {
      for (var c = 0; c < 8; c++) {
        if (tiles[r][c].flaggedBy === side) { flags.push({ row: r, file: c }); }
      }
    }
    if (flags.length !== FLAG_POOL) return false;
    for (var i = 0; i < flags.length; i++) {
      var f = flags[i];
      if (!mineArray[f.row][f.file]) return false;
    }
    return true;
  }

  function pathClear(piece, toRow, toFile) {
    var stepRow = Math.sign(toRow - piece.row);
    var stepFile = Math.sign(toFile - piece.file);
    var r = piece.row + stepRow;
    var f = piece.file + stepFile;
    while (r !== toRow || f !== toFile) {
      if (findPieceAt(f, r)) { return false; }
      r += stepRow;
      f += stepFile;
    }
    return true;
  }

  function isLegalMove(piece, toRow, toFile) {
    if (!inBounds(toRow, toFile)) { return false; }
    var dr = toRow - piece.row;
    var df = toFile - piece.file;
    if (dr === 0 && df === 0) { return false; }
    var occupant = findPieceAt(toFile, toRow);
    if (occupant && sideOf(occupant) === sideOf(piece)) { return false; }
    var adr = Math.abs(dr);
    var adf = Math.abs(df);
    var straight = dr === 0 || df === 0;
    var diagonal = adr === adf;
    switch (piece.type) {
      case 'knight': return (adr === 1 && adf === 2) || (adr === 2 && adf === 1);
      case 'king': return adr <= 1 && adf <= 1;
      case 'rook': return straight && pathClear(piece, toRow, toFile);
      case 'bishop': return diagonal && pathClear(piece, toRow, toFile);
      case 'queen': return (straight || diagonal) && pathClear(piece, toRow, toFile);
      case 'pawn':
        var dir = piece.isWhite ? -1 : 1;
        var startRow = piece.isWhite ? 6 : 1;
        if (df === 0 && dr === dir) { return !occupant; }
        if (df === 0 && dr === 2 * dir && piece.row === startRow) { return !occupant && !findPieceAt(piece.file, piece.row + dir); }
        if (adf === 1 && dr === dir) { return !!occupant; }
        return false;
      default: return false;
    }
  }

  var confirmMoveEl = document.getElementById('confirmMove');
  var confirmDesc = document.getElementById('confirmMoveDesc');
  var confirmYes = document.getElementById('confirmYes');
  var confirmNo = document.getElementById('confirmNo');
  var pendingMove = null;

  function openConfirmMove(piece, toRow, toFile) {
    if (state !== 'strategic' && state !== 'pov') return;
    var originState = state;
    pendingMove = { piece: piece, toRow: toRow, toFile: toFile, fromRow: piece.row, fromFile: piece.file, originState: originState };
    state = 'confirming';
    releaseLock();
    confirmDesc.textContent = 'Move ' + pieceLabel(piece) + ' from ' + squareName(piece.file, piece.row) + ' to ' + squareName(toFile, toRow) + '?';
    confirmMoveEl.style.display = 'block';
    AudioFX.confirmChime();
    updateHud();
  }

  function closeConfirmMove() {
    confirmMoveEl.style.display = 'none';
    pendingMove = null;
  }

  function cancelConfirmMove() {
    var originState = pendingMove ? pendingMove.originState : 'strategic';
    closeConfirmMove();
    state = originState;
    if (originState === 'pov') { requestLock(); }
    setStatus('Move cancelled. Choose a destination for ' + (selected ? pieceLabel(selected) : sideWord(turn)) + '.');
    updateHud();
  }

  confirmYes.addEventListener('click', function () {
    if (!pendingMove) return;
    var move = pendingMove;
    closeConfirmMove();
    state = move.originState;
    AudioFX.confirmChime();
    if (move.originState === 'pov' && !findPieceAt(move.toFile, move.toRow)) { move.piece.mesh.visible = true; }
    executeMove(move.piece, move.toRow, move.toFile);
  });

  confirmNo.addEventListener('click', function () { cancelConfirmMove(); });

  var duel = null;
  var duelArena = new THREE.Group();
  var arenaObstacles = [];
  var duelEffects = [];
  var duelFireHeldP1 = false;
  var duelFireHeldP2 = false;
  var activeKeys = Object.create(null);
  var abilityLatch = { attacker: false, defender: false };
  var duelScoped = false;
  var duelBaseFov = 50;
  var duelRaycaster = new THREE.Raycaster();
  var _projectileRaycaster = new THREE.Raycaster();
  var _blastRaycaster = new THREE.Raycaster();
  var _scratchQuat = new THREE.Quaternion();
  var duelP1Panel = document.getElementById('duelP1Panel');
  var duelP2Panel = document.getElementById('duelP2Panel');
  var duelP1Name = document.getElementById('duelP1Name');
  var duelP2Name = document.getElementById('duelP2Name');
  var duelP1Hp = document.getElementById('duelP1Hp');
  var duelP2Hp = document.getElementById('duelP2Hp');
  var duelP1Fill = document.getElementById('duelP1Fill');
  var duelP2Fill = document.getElementById('duelP2Fill');
  var duelP1Weapon = document.getElementById('duelP1Weapon');
  var duelP2Weapon = document.getElementById('duelP2Weapon');
  var duelP1Ability = document.getElementById('duelP1Ability');
  var duelP2Ability = document.getElementById('duelP2Ability');
  var duelP1Active = document.getElementById('duelP1Active');
  var duelP2Active = document.getElementById('duelP2Active');
  var duelHud = document.getElementById('duelHud');
  var duelHint = document.getElementById('duelHint');
  var duelDivider = document.getElementById('duelDivider');
  var duelCrosshairP1 = document.getElementById('duelCrosshairP1');
  var duelCrosshairP2 = document.getElementById('duelCrosshairP2');
  var duelSmokeP1 = document.getElementById('duelSmokeP1');
  var duelSmokeP2 = document.getElementById('duelSmokeP2');
  var DUEL_CENTER = new THREE.Vector3(0, 10, 0);
  var DUEL_HALF = 5.2;
  var DUEL_FLOOR_Y = DUEL_CENTER.y - 0.15;

  var DUEL_YELLOW_WALL_MATERIAL = new THREE.MeshStandardMaterial({ color: 0xFFD54F, roughness: 0.5, metalness: 0 });
  var DUEL_ORANGE_WALL_MATERIAL = new THREE.MeshStandardMaterial({ color: 0xFF7043, roughness: 0.5, metalness: 0 });
  var DUEL_PARTITION_MATERIAL = new THREE.MeshStandardMaterial({ color: 0x26C6DA, roughness: 0.5, metalness: 0 });
  var DUEL_BARRICADE_MATERIAL = new THREE.MeshStandardMaterial({ color: 0x42A5F5, roughness: 0.5, metalness: 0 });
  var DUEL_FLOOR_WHITE_MATERIAL = new THREE.MeshLambertMaterial({ color: 0xF5F5F5 });
  var DUEL_FLOOR_BLUE_MATERIAL = new THREE.MeshLambertMaterial({ color: 0xB3E5FC });
  var DUEL_CEILING_MATERIAL = new THREE.MeshLambertMaterial({ color: 0xF5F5F5 });
  var SCENE_AMBIENT_DEFAULT = 0.65;
  var SCENE_SUN_DEFAULT = 0.75;
  var SCENE_FILL_DEFAULT = 0.25;

  var DUEL_BLOCK_SPECS = [
    { x: 0,    z: 0,    xHalf: 0.10, zHalf: 2.00 },
    { x: 2.5,  z: 2.5,  xHalf: 0.90, zHalf: 0.10 },
    { x: -2.5, z: -2.5, xHalf: 0.90, zHalf: 0.10 },
    { x: 3.5,  z: 0,    xHalf: 0.40, zHalf: 0.40 },
    { x: -3.5, z: 0,    xHalf: 0.40, zHalf: 0.40 },
    { x: 0,    z: 3.5,  xHalf: 0.40, zHalf: 0.40 },
    { x: 0,    z: -3.5, xHalf: 0.40, zHalf: 0.40 },
    { x: 0,    z: -5.2, xHalf: 5.2,  zHalf: 0.2  },
    { x: 0,    z:  5.2, xHalf: 5.2,  zHalf: 0.2  },
    { x: -5.2, z: 0,    xHalf: 0.2,  zHalf: 5.2  },
    { x:  5.2, z: 0,    xHalf: 0.2,  zHalf: 5.2  }
  ];
  var DUEL_PLAYER_RADIUS = 0.48;
  var DUEL_WALL_HEIGHT = 4.8;
  var DUEL_WALL_THICKNESS = 0.4;
  var DUEL_CEILING_THICKNESS = 0.3;
  var DUEL_PARTITION_HEIGHT = 2.5;
  var DUEL_BARRICADE_HEIGHT = 1.2;

  function addArenaBox(x, y, z, sx, sy, sz, material, opts) {
    opts = opts || {};
    var mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = opts.castShadow !== false;
    mesh.receiveShadow = opts.receiveShadow !== false;
    duelArena.add(mesh);
    if (opts.isCover) { arenaObstacles.push(mesh); }
    return mesh;
  }

  function duelWeaponLabel(piece) {
    var labels = {
      pawn: 'SHOTGUN · 450 MS CYCLE',
      rook: 'MUSKET · 3.0 S RELOAD',
      knight: 'ASSAULT RIFLE · 150 MS CYCLE',
      bishop: 'SNIPER · 900 MS RELOAD',
      queen: 'RPG · 1.4 S RELOAD',
      king: 'EXCALIBUR · 650 MS SWING'
    };
    return labels[piece.type] || 'WEAPON';
  }

  function updateDuelTimer() {
    if (!duel) return;
    var secs = Math.max(0, Math.ceil((duel.duelEndsAt - performance.now()) / 1000));
    var p1 = Math.ceil(duel.attackerHp) + ' / 100 · ' + secs + 's';
    var p2 = Math.ceil(duel.defenderHp) + ' / 100 · ' + secs + 's';
    if (duelP1Hp.textContent !== p1) duelP1Hp.textContent = p1;
    if (duelP2Hp.textContent !== p2) duelP2Hp.textContent = p2;
  }

  function updateDuelHud() {
    if (!duel) return;
    duelP1Name.textContent = pieceLabel(duel.attacker).toUpperCase();
    duelP2Name.textContent = pieceLabel(duel.defender).toUpperCase();
    duelP1Fill.style.width = Math.max(0, duel.attackerHp) + '%';
    duelP2Fill.style.width = Math.max(0, duel.defenderHp) + '%';
    duelP1Weapon.textContent = 'AMMO: ∞ · ' + duelWeaponLabel(duel.attacker);
    duelP2Weapon.textContent = 'AMMO: ∞ · ' + duelWeaponLabel(duel.defender);
    duelP1Ability.textContent = 'UTILITY: ' + (duel.abilityCooldowns.attacker <= 0 ? 'READY' : (duel.abilityCooldowns.attacker / 1000).toFixed(1) + 's') + ' · SHIFT';
    duelP2Ability.textContent = 'UTILITY: ' + (duel.abilityCooldowns.defender <= 0 ? 'READY' : (duel.abilityCooldowns.defender / 1000).toFixed(1) + 's') + ' · RIGHT CTRL';
    duelP1Active.textContent = 'WASD · Q/E TURN · SPACE';
    duelP2Active.textContent = 'ARROWS · ,/. TURN · ENTER';
    updateDuelTimer();
  }

  function duelCameraForSide(side) {
    return side === 'attacker' ? cameraP1 : cameraP2;
  }

  function detachDuelCameras() {
    if (cameraP1.parent) cameraP1.parent.remove(cameraP1);
    if (cameraP2.parent) cameraP2.parent.remove(cameraP2);
    cameraP1.fov = duelBaseFov;
    cameraP2.fov = duelBaseFov;
    cameraP1.updateProjectionMatrix();
    cameraP2.updateProjectionMatrix();
  }

  function buildDuelArena() {
    arenaObstacles.length = 0;
    while (duelArena.children.length) {
      var child = duelArena.children[duelArena.children.length - 1];
      duelArena.remove(child);
      if (child.geometry && child.geometry.dispose) { child.geometry.dispose(); }
      if (child.shadow && child.shadow.map) { child.shadow.map.dispose(); }
    }

    var roomW = DUEL_HALF * 2;
    var wallH = DUEL_WALL_HEIGHT;
    var wallT = DUEL_WALL_THICKNESS;
    var wallY = DUEL_FLOOR_Y + wallH / 2;
    var ceilY = DUEL_FLOOR_Y + wallH + DUEL_CEILING_THICKNESS / 2;

    var tileCount = 8;
    var tileSize = roomW / tileCount;
    for (var tileRow = 0; tileRow < tileCount; tileRow++) {
      for (var tileCol = 0; tileCol < tileCount; tileCol++) {
        var tileMaterial = (tileRow + tileCol) % 2 === 0 ? DUEL_FLOOR_WHITE_MATERIAL : DUEL_FLOOR_BLUE_MATERIAL;
        addArenaBox(
          DUEL_CENTER.x - DUEL_HALF + (tileCol + 0.5) * tileSize, DUEL_FLOOR_Y, DUEL_CENTER.z - DUEL_HALF + (tileRow + 0.5) * tileSize,
          tileSize, 0.3, tileSize, tileMaterial,
          { isCover: false, castShadow: false, receiveShadow: true });
      }
    }

    addArenaBox(DUEL_CENTER.x, ceilY, DUEL_CENTER.z,
      roomW, DUEL_CEILING_THICKNESS, roomW, DUEL_CEILING_MATERIAL,
      { isCover: false, castShadow: false, receiveShadow: false });

    addArenaBox(DUEL_CENTER.x, wallY, DUEL_CENTER.z - DUEL_HALF,
      roomW, wallH, wallT, DUEL_YELLOW_WALL_MATERIAL,
      { isCover: true, castShadow: true, receiveShadow: true });
    addArenaBox(DUEL_CENTER.x, wallY, DUEL_CENTER.z + DUEL_HALF,
      roomW, wallH, wallT, DUEL_YELLOW_WALL_MATERIAL,
      { isCover: true, castShadow: true, receiveShadow: true });
    addArenaBox(DUEL_CENTER.x - DUEL_HALF, wallY, DUEL_CENTER.z,
      wallT, wallH, roomW, DUEL_ORANGE_WALL_MATERIAL,
      { isCover: true, castShadow: true, receiveShadow: true });
    addArenaBox(DUEL_CENTER.x + DUEL_HALF, wallY, DUEL_CENTER.z,
      wallT, wallH, roomW, DUEL_ORANGE_WALL_MATERIAL,
      { isCover: true, castShadow: true, receiveShadow: true });

    addArenaBox(0, DUEL_FLOOR_Y + DUEL_PARTITION_HEIGHT / 2, 0,
      0.2, DUEL_PARTITION_HEIGHT, 4.0, DUEL_PARTITION_MATERIAL,
      { isCover: true, castShadow: true, receiveShadow: true });
    addArenaBox(2.5, DUEL_FLOOR_Y + DUEL_PARTITION_HEIGHT / 2, 2.5,
      1.8, DUEL_PARTITION_HEIGHT, 0.2, DUEL_PARTITION_MATERIAL,
      { isCover: true, castShadow: true, receiveShadow: true });
    addArenaBox(-2.5, DUEL_FLOOR_Y + DUEL_PARTITION_HEIGHT / 2, -2.5,
      1.8, DUEL_PARTITION_HEIGHT, 0.2, DUEL_PARTITION_MATERIAL,
      { isCover: true, castShadow: true, receiveShadow: true });

    var barricadePositions = [
      { x:  3.5, z:  0.0 },
      { x: -3.5, z:  0.0 },
      { x:  0.0, z:  3.5 },
      { x:  0.0, z: -3.5 }
    ];
    for (var bi = 0; bi < barricadePositions.length; bi++) {
      var bp = barricadePositions[bi];
      addArenaBox(bp.x, DUEL_FLOOR_Y + DUEL_BARRICADE_HEIGHT / 2, bp.z,
        0.8, DUEL_BARRICADE_HEIGHT, 0.8, DUEL_BARRICADE_MATERIAL,
        { isCover: true, castShadow: true, receiveShadow: true });
    }

    sceneAmbient.intensity = 0;
    sun.intensity = 0;
    fill.intensity = 0;
    var arenaAmbient = new THREE.AmbientLight(0xffffff, 0.7);
    duelArena.add(arenaAmbient);
    var arenaSun = new THREE.DirectionalLight(0xffffff, 0.8);
    arenaSun.position.set(DUEL_CENTER.x + 1.5, DUEL_FLOOR_Y + wallH + 5, DUEL_CENTER.z + 2.5);
    arenaSun.target.position.set(DUEL_CENTER.x, DUEL_FLOOR_Y, DUEL_CENTER.z);
    arenaSun.castShadow = true;
    arenaSun.shadow.mapSize.set(1024, 1024);
    arenaSun.shadow.camera.left = -(DUEL_HALF + 1.5);
    arenaSun.shadow.camera.right = DUEL_HALF + 1.5;
    arenaSun.shadow.camera.top = DUEL_HALF + 1.5;
    arenaSun.shadow.camera.bottom = -(DUEL_HALF + 1.5);
    arenaSun.shadow.camera.near = 1;
    arenaSun.shadow.camera.far = 30;
    arenaSun.shadow.bias = -0.0004;
    arenaSun.shadow.normalBias = 0.02;
    duelArena.add(arenaSun);
    duelArena.add(arenaSun.target);

    scene.add(duelArena);
  }

  function createPlayerHitboxCylinder(piece) {
    var cylinder = {
      radius: 0.48,
      height: 2.4,
      centerX: piece.mesh.position.x,
      centerZ: piece.mesh.position.z,
      bottomY: DUEL_CENTER.y
    };
    piece.playerHitboxCylinder = cylinder;
    return cylinder;
  }

  function syncPlayerHitboxCylinder(piece) {
    if (!piece.playerHitboxCylinder) createPlayerHitboxCylinder(piece);
    var cylinder = piece.playerHitboxCylinder;
    cylinder.centerX = piece.mesh.position.x;
    cylinder.centerZ = piece.mesh.position.z;
    cylinder.bottomY = piece.mesh.position.y - (piece.visualHeight || 1.6) / 2;
    return cylinder;
  }

  function rayPlayerHitboxCylinder(origin, direction, cylinder, maxDistance) {
    if (!cylinder) return null;
    var ox = origin.x - cylinder.centerX;
    var oz = origin.z - cylinder.centerZ;
    var bottom = cylinder.bottomY;
    var top = bottom + cylinder.height;
    var radiusSq = cylinder.radius * cylinder.radius;
    var radialOriginSq = ox * ox + oz * oz;
    if (radialOriginSq <= radiusSq && origin.y >= bottom && origin.y <= top) return 0;
    var nearest = Infinity;
    var a = direction.x * direction.x + direction.z * direction.z;
    var b = 2 * (ox * direction.x + oz * direction.z);
    var c = radialOriginSq - radiusSq;
    if (a > 1e-12) {
      var disc = b * b - 4 * a * c;
      if (disc >= 0) {
        var root = Math.sqrt(disc);
        var inv2a = 1 / (2 * a);
        var t0 = (-b - root) * inv2a;
        if (t0 >= 0 && t0 <= maxDistance) {
          var y0 = origin.y + direction.y * t0;
          if (y0 >= bottom && y0 <= top) nearest = t0;
        }
        var t1 = (-b + root) * inv2a;
        if (t1 >= 0 && t1 <= maxDistance && t1 < nearest) {
          var y1 = origin.y + direction.y * t1;
          if (y1 >= bottom && y1 <= top) nearest = t1;
        }
      }
    }
    if (Math.abs(direction.y) > 1e-12) {
      var capT = (bottom - origin.y) / direction.y;
      if (capT >= 0 && capT <= maxDistance && capT < nearest) {
        var cx = ox + direction.x * capT, cz = oz + direction.z * capT;
        if (cx * cx + cz * cz <= radiusSq) nearest = capT;
      }
      capT = (top - origin.y) / direction.y;
      if (capT >= 0 && capT <= maxDistance && capT < nearest) {
        var cx2 = ox + direction.x * capT, cz2 = oz + direction.z * capT;
        if (cx2 * cx2 + cz2 * cz2 <= radiusSq) nearest = capT;
      }
    }
    return nearest === Infinity ? null : nearest;
  }

  function playerHitboxBounds(cylinder) {
    return new THREE.Box3(
      new THREE.Vector3(cylinder.centerX - cylinder.radius, cylinder.bottomY, cylinder.centerZ - cylinder.radius),
      new THREE.Vector3(cylinder.centerX + cylinder.radius, cylinder.bottomY + cylinder.height, cylinder.centerZ + cylinder.radius)
    );
  }

  function distanceToPlayerHitbox(point, cylinder) {
    var radialDistance = Math.hypot(point.x - cylinder.centerX, point.z - cylinder.centerZ);
    var radialGap = Math.max(0, radialDistance - cylinder.radius);
    var verticalGap = Math.max(cylinder.bottomY - point.y, 0, point.y - (cylinder.bottomY + cylinder.height));
    return Math.hypot(radialGap, verticalGap);
  }

  function setDuelView(side) {
    if (!duel) return;
    if (duelScoped) {
      cameraP1.fov = duelBaseFov;
      cameraP2.fov = duelBaseFov;
      cameraP1.updateProjectionMatrix();
      cameraP2.updateProjectionMatrix();
      duelScoped = false;
    }
    duel.activeSide = side;
    var look = duel.look[side];
    var cam = duelCameraForSide(side);
    cam.rotation.order = 'YXZ';
    cam.rotation.set(look.pitch, look.yaw, 0, 'YXZ');
    updateDuelHud();
  }

  function beginDuel(attacker, defender, toRow, toFile, fromRow, fromFile) {
    releaseLock();
    duel = {
      attacker: attacker, defender: defender, toRow: toRow, toFile: toFile,
      fromRow: fromRow, fromFile: fromFile, attackerHp: 100, defenderHp: 100,
      attackerStart: attacker.mesh.position.clone(), defenderStart: defender.mesh.position.clone(),
      attackerRotation: attacker.mesh.rotation.clone(), defenderRotation: defender.mesh.rotation.clone(),
      projectiles: [], finished: false, activeSide: 'attacker',
      look: { attacker: { yaw: 0, pitch: 0 }, defender: { yaw: 0, pitch: 0 } },
      cooldowns: { attacker: -Infinity, defender: -Infinity },
      abilityCooldowns: { attacker: 0, defender: 0 },
      mines: [], shields: [], smoke: [],
      verticalVelocity: { attacker: 0, defender: 0 },
      invulnerableUntil: { attacker: 0, defender: 0 },
      lungeUntil: { attacker: 0, defender: 0 },
      duelEndsAt: performance.now() + 25000
    };
    state = 'duel';
    document.removeEventListener('mousemove', handlePovMouseMove);
    lockHeld = false;
    duelFireHeldP1 = false;
    duelFireHeldP2 = false;
    abilityLatch.attacker = false;
    abilityLatch.defender = false;
    activeKeys = Object.create(null);
    buildDuelArena();
    var left = attacker.isWhite ? -2.6 : 2.6;
    var right = -left;
    attacker.mesh.visible = true;
    defender.mesh.visible = true;
    var attackerHeight = attacker.visualHeight || 1.6;
    var defenderHeight = defender.visualHeight || 1.6;
    attacker.mesh.position.set(DUEL_CENTER.x + left, DUEL_FLOOR_Y + attackerHeight / 2, DUEL_CENTER.z + 1.6);
    defender.mesh.position.set(DUEL_CENTER.x + right, DUEL_FLOOR_Y + defenderHeight / 2, DUEL_CENTER.z - 1.6);
    attacker.mesh.rotation.y = 0;
    defender.mesh.rotation.y = Math.PI;
    createPlayerHitboxCylinder(attacker);
    createPlayerHitboxCylinder(defender);

    attacker.mesh.add(cameraP1);
    defender.mesh.add(cameraP2);
    cameraP1.position.set(0, 0.35, 0.72);
    cameraP2.position.set(0, 0.35, 0.72);
    cameraP1.rotation.set(0, 0, 0, 'YXZ');
    cameraP2.rotation.set(0, 0, 0, 'YXZ');
    cameraP1.fov = duelBaseFov;
    cameraP2.fov = duelBaseFov;
    var halfAspect = Math.max(1, Math.floor(window.innerWidth / 2)) / Math.max(1, window.innerHeight);
    cameraP1.aspect = halfAspect;
    cameraP2.aspect = halfAspect;
    cameraP1.updateProjectionMatrix();
    cameraP2.updateProjectionMatrix();
    attacker.mesh.updateMatrixWorld(true);
    defender.mesh.updateMatrixWorld(true);

    var p1Eye = cameraP1.getWorldPosition(new THREE.Vector3());
    var p2Eye = cameraP2.getWorldPosition(new THREE.Vector3());
    var p1Target = defender.mesh.position.clone(); p1Target.y += 0.35;
    var p2Target = attacker.mesh.position.clone(); p2Target.y += 0.35;
    var p1Dx = p1Target.x - p1Eye.x, p1Dy = p1Target.y - p1Eye.y, p1Dz = p1Target.z - p1Eye.z;
    var p2Dx = p2Target.x - p2Eye.x, p2Dy = p2Target.y - p2Eye.y, p2Dz = p2Target.z - p2Eye.z;
    var p1WorldYaw = Math.atan2(-p1Dx, -p1Dz);
    var p2WorldYaw = Math.atan2(-p2Dx, -p2Dz);
    duel.look.attacker.yaw = p1WorldYaw - attacker.mesh.rotation.y;
    duel.look.defender.yaw = p2WorldYaw - defender.mesh.rotation.y;
    duel.look.attacker.pitch = Math.atan2(p1Dy, Math.sqrt(p1Dx * p1Dx + p1Dz * p1Dz));
    duel.look.defender.pitch = Math.atan2(p2Dy, Math.sqrt(p2Dx * p2Dx + p2Dz * p2Dz));
    cameraP1.rotation.set(duel.look.attacker.pitch, duel.look.attacker.yaw, 0, 'YXZ');
    cameraP2.rotation.set(duel.look.defender.pitch, duel.look.defender.yaw, 0, 'YXZ');

    setDuelView('attacker');
    configurePovControls();
    controls.enabled = false;
    duelHud.style.display = 'block';
    duelHint.style.display = 'grid';
    duelDivider.style.display = 'block';
    duelCrosshairP1.style.display = 'block';
    duelCrosshairP2.style.display = 'block';
    updateDuelHud();
    setStatus(pieceLabel(attacker) + ' versus ' + pieceLabel(defender) + '. P1: WASD move, Q/E turn, Space attack. P2: arrows move, comma/period turn, Enter attack. Mouse look and pointer lock are disabled in duels.');
    updateHud();
  }

  function applyDuelDamage(amount, targetPiece) {
    if (!duel || duel.finished || amount <= 0 || !targetPiece) return;
    if (targetPiece.isInvulnerable) return;
    var targetSide = targetPiece === duel.defender ? 'defender' : 'attacker';
    if (performance.now() < duel.invulnerableUntil[targetSide]) return;
    if (targetSide === 'defender') duel.defenderHp = Math.max(0, duel.defenderHp - amount);
    else duel.attackerHp = Math.max(0, duel.attackerHp - amount);
    AudioFX.hitMarker(targetPiece.type);
    updateDuelHud();
    if (duel.defenderHp <= 0) resolveDuel(true);
    else if (duel.attackerHp <= 0) resolveDuel(false);
  }

  var _impactGeometry = new THREE.SphereGeometry(0.075, 8, 6);
  var _impactMaterial = new THREE.MeshBasicMaterial({ color: 0xffd21a });
  function spawnDuelImpact(point) {
    var mesh = new THREE.Mesh(_impactGeometry, _impactMaterial);
    mesh.position.copy(point);
    scene.add(mesh);
    duelEffects.push({ mesh: mesh, life: 0.22, maxLife: 0.22 });
  }
  function updateDuelEffects(dt) {
    for (var i = duelEffects.length - 1; i >= 0; i--) {
      var e = duelEffects[i];
      e.life -= dt;
      e.mesh.scale.multiplyScalar(1.08);
      if (e.life <= 0) { scene.remove(e.mesh); duelEffects.splice(i, 1); }
    }
  }

  function abilityForward(side) {
    var piece = side === 'attacker' ? duel.attacker : duel.defender;
    var look = duel.look[side];
    var yaw = piece.mesh.rotation.y + look.yaw;
    var pitch = look.pitch;
    return new THREE.Vector3(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)).normalize();
  }

  function safeTeleport(piece, targetX, targetZ) {
    var startX = piece.mesh.position.x;
    var startZ = piece.mesh.position.z;
    var dx = targetX - startX;
    var dz = targetZ - startZ;
    var dist = Math.hypot(dx, dz);
    if (dist < 1e-6) return;

    var STEP = 0.12;
    var STEPS = Math.max(1, Math.ceil(dist / STEP));
    var stepX = dx / STEPS;
    var stepZ = dz / STEPS;

    var minX = DUEL_CENTER.x - DUEL_HALF + 0.65;
    var maxX = DUEL_CENTER.x + DUEL_HALF - 0.65;
    var minZ = DUEL_CENTER.z - DUEL_HALF + 0.65;
    var maxZ = DUEL_CENTER.z + DUEL_HALF - 0.65;

    var curX = startX;
    var curZ = startZ;

    for (var i = 0; i < STEPS; i++) {
      var nx = Math.max(minX, Math.min(maxX, curX + stepX));
      var nz = Math.max(minZ, Math.min(maxZ, curZ + stepZ));
      if (!duelPositionBlocked(nx, curZ)) { curX = nx; }
      if (!duelPositionBlocked(curX, nz)) { curZ = nz; }
    }

    piece.mesh.position.x = curX;
    piece.mesh.position.z = curZ;
    piece.mesh.updateMatrixWorld(true);
    syncPlayerHitboxCylinder(piece);
  }

  function triggerDuelAbility(side, now) {
    if (!duel || duel.finished || duel.abilityCooldowns[side] > now) return;
    var piece = side === 'attacker' ? duel.attacker : duel.defender;
    var enemy = side === 'attacker' ? duel.defender : duel.attacker;
    var forward = abilityForward(side);
    var position = piece.mesh.position;
    if (piece.type === 'pawn') {
      var mine = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.10, 12), new THREE.MeshStandardMaterial({ color: 0x292929, metalness: 0.35, roughness: 0.65 }));
      mine.position.set(position.x, DUEL_FLOOR_Y + 0.06, position.z); scene.add(mine);
      duel.mines.push({ mesh: mine, owner: side });
    } else if (piece.type === 'knight') {
      var dash = forward.clone(); dash.y = 0; dash.normalize();
      safeTeleport(piece, piece.mesh.position.x + dash.x * 3, piece.mesh.position.z + dash.z * 3);
    } else if (piece.type === 'rook') {
      var wall = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.5, 0.1), new THREE.MeshStandardMaterial({ color: 0x747b80, metalness: 0.55, roughness: 0.45 }));
      wall.position.copy(position).add(new THREE.Vector3(forward.x, 0, forward.z).multiplyScalar(1)); wall.position.y = DUEL_FLOOR_Y + 0.75;
      wall.rotation.y = Math.atan2(forward.x, forward.z); scene.add(wall);
      duel.shields.push({ mesh: wall, owner: side, hp: 50, life: 8 });
    } else if (piece.type === 'bishop') {
      var smoke = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.2, 3.2), new THREE.MeshBasicMaterial({ color: 0x090b0d, transparent: true, opacity: 0.92, depthWrite: false }));
      smoke.position.copy(position).add(new THREE.Vector3(forward.x, 0.9, forward.z).multiplyScalar(2.2)); scene.add(smoke);
      duel.smoke.push({ mesh: smoke, owner: side, life: 3 });
    } else if (piece.type === 'queen') {
      duel.verticalVelocity[side] = 9.5;
      for (var ri = -1; ri <= 1; ri++) {
        var rainRocket = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), new THREE.MeshBasicMaterial({ color: 0xff9a00 }));
        rainRocket.position.set(enemy.mesh.position.x + ri * 0.65, DUEL_FLOOR_Y + 6.5, enemy.mesh.position.z - 0.35);
        scene.add(rainRocket);
        var rainTarget = new THREE.Vector3(enemy.mesh.position.x, enemy.mesh.position.y + 0.45, enemy.mesh.position.z);
        var rainVelocity = rainTarget.sub(rainRocket.position).normalize().multiplyScalar(16);
        duel.projectiles.push({ mesh: rainRocket, velocity: rainVelocity, age: 0, maxAge: 2.5, damage: 100, target: enemy });
      }
    } else if (piece.type === 'king') {
      duel.invulnerableUntil[side] = now + 1000;
      duel.lungeUntil[side] = now + 1000;
      piece.isInvulnerable = true;
      safeTeleport(piece,
        piece.mesh.position.x + forward.x * 2.8,
        piece.mesh.position.z + forward.z * 2.8);
      var away = new THREE.Vector3(
        enemy.mesh.position.x - piece.mesh.position.x, 0,
        enemy.mesh.position.z - piece.mesh.position.z);
      if (away.length() < 1.45) {
        away.normalize();
        safeTeleport(enemy,
          enemy.mesh.position.x - away.x * 2.6,
          enemy.mesh.position.z - away.z * 2.6);
      }
    }
    duel.abilityCooldowns[side] = now + 1500;
    updateDuelHud();
  }

  function updateDuelUtilities(dt, now) {
    if (!duel) return;
    ['attacker', 'defender'].forEach(function (side) {
      var piece = side === 'attacker' ? duel.attacker : duel.defender;
      if (piece.isInvulnerable && now >= duel.invulnerableUntil[side]) piece.isInvulnerable = false;
      var floorY = DUEL_FLOOR_Y + (piece.visualHeight || 1.6) / 2;
      if (duel.verticalVelocity[side] !== 0 || piece.mesh.position.y > floorY + 0.001) {
        duel.verticalVelocity[side] -= 18 * dt;
        piece.mesh.position.y += duel.verticalVelocity[side] * dt;
        if (piece.mesh.position.y <= floorY) {
          piece.mesh.position.y = floorY;
          duel.verticalVelocity[side] = 0;
        }
        syncPlayerHitboxCylinder(piece);
      }
    });
    for (var i = duel.mines.length - 1; i >= 0; i--) {
      var mine = duel.mines[i], enemy = mine.owner === 'attacker' ? duel.defender : duel.attacker;
      if (Math.hypot(enemy.mesh.position.x - mine.mesh.position.x, enemy.mesh.position.z - mine.mesh.position.z) < 0.8) {
        applyDuelDamage(35, enemy);
        scene.remove(mine.mesh);
        mine.mesh.geometry.dispose();
        mine.mesh.material.dispose();
        duel.mines.splice(i, 1);
      }
    }
    for (var j = duel.shields.length - 1; j >= 0; j--) {
      var sh = duel.shields[j]; sh.life -= dt;
      if (sh.life <= 0 || sh.hp <= 0) {
        scene.remove(sh.mesh);
        sh.mesh.geometry.dispose();
        sh.mesh.material.dispose();
        duel.shields.splice(j, 1);
      }
    }
    var p1Smoke = false, p2Smoke = false;
    for (var k = duel.smoke.length - 1; k >= 0; k--) {
      var sm = duel.smoke[k]; sm.life -= dt;
      var other = sm.owner === 'attacker' ? duel.defender : duel.attacker;
      var cam = sm.owner === 'attacker' ? cameraP2 : cameraP1;
      var eye = cam.getWorldPosition(new THREE.Vector3());
      var inside = other.mesh.position.distanceTo(sm.mesh.position) < 2.1;
      var smokeRay = new THREE.Raycaster(eye, cameraShotDirection(cam, 0, 0), 0, 5);
      var through = smokeRay.intersectObject(sm.mesh, false).length > 0;
      if (inside || through) { if (sm.owner === 'attacker') p2Smoke = true; else p1Smoke = true; }
      if (sm.life <= 0) {
        scene.remove(sm.mesh);
        sm.mesh.geometry.dispose();
        sm.mesh.material.dispose();
        duel.smoke.splice(k, 1);
      }
    }
    duelSmokeP1.style.display = p1Smoke ? 'block' : 'none';
    duelSmokeP2.style.display = p2Smoke ? 'block' : 'none';
    if (duel.abilityCooldowns.attacker > now || duel.abilityCooldowns.defender > now) updateDuelHud();
  }

  function cameraShotDirection(cam, offsetX, offsetY) {
    cam.updateMatrixWorld(true);
    cam.getWorldQuaternion(_scratchQuat);
    return new THREE.Vector3(offsetX || 0, offsetY || 0, -1)
      .applyQuaternion(_scratchQuat)
      .normalize();
  }

  function rayHitsEnemy(origin, direction, maxDistance, shooterSide) {
    if (!duel) return false;
    var targetPiece = shooterSide === 'attacker' ? duel.defender : duel.attacker;
    var targetCylinder = syncPlayerHitboxCylinder(targetPiece);
    var targetDistance = rayPlayerHitboxCylinder(origin, direction, targetCylinder, maxDistance);
    if (targetDistance === null) return false;
    duelRaycaster.set(origin, direction);
    duelRaycaster.near = 0;
    duelRaycaster.far = maxDistance;
    var pillarHits = duelRaycaster.intersectObjects(arenaObstacles, false);
    if (pillarHits.length && pillarHits[0].distance < targetDistance - 0.015) {
      spawnDuelImpact(pillarHits[0].point);
      return false;
    }
    if (duel.shields.length) {
      var shieldHits = duelRaycaster.intersectObjects(duel.shields.map(function (sh) { return sh.mesh; }), false);
      if (shieldHits.length && shieldHits[0].distance < targetDistance - 0.015) {
        var struckShield = duel.shields.find(function (sh) { return sh.mesh === shieldHits[0].object; });
        if (struckShield) struckShield.hp = Math.max(0, struckShield.hp - 50);
        spawnDuelImpact(shieldHits[0].point);
        return false;
      }
    }
    return true;
  }

  function fireDuelWeapon(now, shooterSide) {
    if (!duel || duel.finished) return;
    shooterSide = shooterSide || 'attacker';
    var shooter = shooterSide === 'attacker' ? duel.attacker : duel.defender;
    var targetPiece = shooterSide === 'attacker' ? duel.defender : duel.attacker;
    var cam = shooterSide === 'attacker' ? cameraP1 : cameraP2;
    var type = shooter.type;
    cam.updateMatrixWorld(true);
    var origin = cam.getWorldPosition(new THREE.Vector3());
    var forward = cameraShotDirection(cam, 0, 0);
    var lastShot = duel.cooldowns[shooterSide];
    var cooldown = type === 'pawn' ? 450 : type === 'rook' ? 3000 : type === 'knight' ? 150 : type === 'bishop' ? 900 : type === 'queen' ? 1400 : 650;
    if (now - lastShot < cooldown) return;
    duel.cooldowns[shooterSide] = now;
    AudioFX.hitMarker(type);

    if (type === 'pawn') {
      var pelletHits = 0;
      for (var pellet = 0; pellet < 6; pellet++) {
        var radius = Math.tan(0.055) * Math.sqrt(Math.random());
        var angle = Math.random() * Math.PI * 2;
        var dx = radius * Math.cos(angle), dy = radius * Math.sin(angle);
        var dir = cameraShotDirection(cam, dx, dy);
        if (rayHitsEnemy(origin, dir, 18, shooterSide)) pelletHits += 1;
      }
      if (pelletHits > 0) applyDuelDamage(pelletHits * 12, targetPiece);
    } else if (type === 'rook') {
      if (rayHitsEnemy(origin, forward, 45, shooterSide)) applyDuelDamage(100, targetPiece);
    } else if (type === 'knight') {
      if (rayHitsEnemy(origin, forward, 32, shooterSide)) applyDuelDamage(9, targetPiece);
    } else if (type === 'bishop') {
      if (rayHitsEnemy(origin, forward, 70, shooterSide)) applyDuelDamage(100, targetPiece);
    } else if (type === 'queen') {
      var projectile = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), new THREE.MeshBasicMaterial({ color: 0xff9a00 }));
      projectile.position.copy(origin).addScaledVector(forward, 0.55);
      scene.add(projectile);
      duel.projectiles.push({ mesh: projectile, velocity: forward.multiplyScalar(18), age: 0, maxAge: 2.5, damage: 100, target: targetPiece });
    } else if (type === 'king') {
      var center = origin.clone().addScaledVector(forward, 1.45);
      var swingBox = new THREE.Box3(new THREE.Vector3(center.x - 0.85, center.y - 0.8, center.z - 0.85), new THREE.Vector3(center.x + 0.85, center.y + 0.8, center.z + 0.85));
      var enemyBox = playerHitboxBounds(syncPlayerHitboxCylinder(targetPiece));
      if (swingBox.intersectsBox(enemyBox) && rayHitsEnemy(origin, forward, 2.6, shooterSide)) applyDuelDamage(45, targetPiece);
    }
    if (duel && !duel.finished) updateDuelHud();
  }

  function duelPositionBlocked(x, z) {
    for (var i = 0; i < DUEL_BLOCK_SPECS.length; i++) {
      var b = DUEL_BLOCK_SPECS[i];
      if (Math.abs(x - b.x) < b.xHalf + DUEL_PLAYER_RADIUS &&
          Math.abs(z - b.z) < b.zHalf + DUEL_PLAYER_RADIUS) return true;
    }
    return false;
  }

  function moveDuelPiece(piece, dx, dz, dt) {
  var speed = 4.0;
  var length = Math.hypot(dx, dz);

  if (length < 0.0001) return;

  dx = dx / length * speed * dt;
  dz = dz / length * speed * dt;

  var minX = DUEL_CENTER.x - DUEL_HALF + 0.65;
  var maxX = DUEL_CENTER.x + DUEL_HALF - 0.65;
  var minZ = DUEL_CENTER.z - DUEL_HALF + 0.65;
  var maxZ = DUEL_CENTER.z + DUEL_HALF - 0.65;


  var steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.08));
  var stepX = dx / steps;
  var stepZ = dz / steps;

  for (var i = 0; i < steps; i++) {
    var nextX = Math.max(
      minX,
      Math.min(maxX, piece.mesh.position.x + stepX)
    );

    var nextZ = Math.max(
      minZ,
      Math.min(maxZ, piece.mesh.position.z + stepZ)
    );

    if (!duelPositionBlocked(nextX, piece.mesh.position.z)) {
      piece.mesh.position.x = nextX;
    }

    if (!duelPositionBlocked(piece.mesh.position.x, nextZ)) {
      piece.mesh.position.z = nextZ;
    }
  }

  piece.mesh.updateMatrixWorld(true);
  syncPlayerHitboxCylinder(piece);
}

  function updateDuelMovement(dt) {
    if (!duel || duel.finished) return;
    var rotationSpeed = 2.4;
    if ((activeKeys.ShiftLeft || activeKeys.ShiftRight) && !abilityLatch.attacker) {
      abilityLatch.attacker = true;
      triggerDuelAbility('attacker', performance.now());
    }
    if ((activeKeys.ControlRight || activeKeys.KeyM || activeKeys.Numpad0) && !abilityLatch.defender) {
      abilityLatch.defender = true;
      triggerDuelAbility('defender', performance.now());
    }
    if (activeKeys.KeyQ) duel.look.attacker.yaw += rotationSpeed * dt;
    if (activeKeys.KeyE) duel.look.attacker.yaw -= rotationSpeed * dt;
    if (activeKeys.Comma) duel.look.defender.yaw += rotationSpeed * dt;
    if (activeKeys.Period) duel.look.defender.yaw -= rotationSpeed * dt;

    cameraP1.rotation.order = 'YXZ';
    cameraP1.rotation.set(duel.look.attacker.pitch, duel.look.attacker.yaw, 0, 'YXZ');
    cameraP2.rotation.order = 'YXZ';
    cameraP2.rotation.set(duel.look.defender.pitch, duel.look.defender.yaw, 0, 'YXZ');

    var p1WorldYaw = duel.attacker.mesh.rotation.y + duel.look.attacker.yaw;
    var p1ForwardX = -Math.sin(p1WorldYaw);
    var p1ForwardZ = -Math.cos(p1WorldYaw);
    var p1RightX = Math.cos(p1WorldYaw);
    var p1RightZ = -Math.sin(p1WorldYaw);
    var p1x = 0, p1z = 0;
    if (activeKeys.KeyW) { p1x += p1ForwardX; p1z += p1ForwardZ; }
    if (activeKeys.KeyS) { p1x -= p1ForwardX; p1z -= p1ForwardZ; }
    if (activeKeys.KeyD) { p1x += p1RightX; p1z += p1RightZ; }
    if (activeKeys.KeyA) { p1x -= p1RightX; p1z -= p1RightZ; }
    moveDuelPiece(duel.attacker, p1x, p1z, dt);

    var p2WorldYaw = duel.defender.mesh.rotation.y + duel.look.defender.yaw;
    var p2ForwardX = -Math.sin(p2WorldYaw);
    var p2ForwardZ = -Math.cos(p2WorldYaw);
    var p2RightX = Math.cos(p2WorldYaw);
    var p2RightZ = -Math.sin(p2WorldYaw);
    var p2x = 0, p2z = 0;
    if (activeKeys.ArrowUp) { p2x += p2ForwardX; p2z += p2ForwardZ; }
    if (activeKeys.ArrowDown) { p2x -= p2ForwardX; p2z -= p2ForwardZ; }
    if (activeKeys.ArrowRight) { p2x += p2RightX; p2z += p2RightZ; }
    if (activeKeys.ArrowLeft) { p2x -= p2RightX; p2z -= p2RightZ; }
    moveDuelPiece(duel.defender, p2x, p2z, dt);

    duel.attacker.mesh.updateMatrixWorld(true);
    duel.defender.mesh.updateMatrixWorld(true);
    cameraP1.updateMatrixWorld(true);
    cameraP2.updateMatrixWorld(true);
  }

  function updateDuelProjectiles(dt) {
    if (!duel) return;
    var activeDuel = duel;
    for (var i = activeDuel.projectiles.length - 1; i >= 0; i--) {
      var p = activeDuel.projectiles[i];
      var step = p.velocity.clone().multiplyScalar(dt);
      var next = p.mesh.position.clone().add(step);
      var projectileOrigin = p.mesh.position.clone();
      var projectileDirection = p.velocity.clone().normalize();
      var segmentLength = step.length();
      var targetCylinder = syncPlayerHitboxCylinder(p.target);
      var enemyDistance = rayPlayerHitboxCylinder(projectileOrigin, projectileDirection, targetCylinder, segmentLength);
      _projectileRaycaster.set(projectileOrigin, projectileDirection);
      _projectileRaycaster.near = 0;
      _projectileRaycaster.far = segmentLength;
      var wallHit = _projectileRaycaster.intersectObjects(arenaObstacles, false);
      var shieldHit = [];
      if (duel.shields.length) {
        _projectileRaycaster.set(projectileOrigin, projectileDirection);
        _projectileRaycaster.near = 0;
        _projectileRaycaster.far = segmentLength;
        shieldHit = _projectileRaycaster.intersectObjects(duel.shields.map(function (sh) { return sh.mesh; }), false);
      }
      var obstacleHitDistance = wallHit.length ? wallHit[0].distance : Infinity;
      var shieldHitDistance = shieldHit.length ? shieldHit[0].distance : Infinity;
      var wallBlocks = Math.min(obstacleHitDistance, shieldHitDistance) < (enemyDistance === null ? Infinity : enemyDistance) - 0.015;
      p.mesh.position.copy(next);
      p.age += dt;
      if (enemyDistance !== null && !wallBlocks) {
        applyDuelDamage(100, p.target);
        scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); activeDuel.projectiles.splice(i, 1);
      } else if (wallBlocks || p.age >= p.maxAge) {
        var impactDistance = Math.min(obstacleHitDistance, shieldHitDistance);
        var impact = wallBlocks ? projectileOrigin.clone().addScaledVector(projectileDirection, impactDistance) : p.mesh.position.clone();
        if (shieldHitDistance <= obstacleHitDistance) {
          var hitShield = duel.shields.find(function (sh) { return sh.mesh === shieldHit[0].object; });
          if (hitShield) hitShield.hp = Math.max(0, hitShield.hp - p.damage);
        } else if (wallBlocks) {
          spawnDuelImpact(impact);
        }
        var gapToCylinder = distanceToPlayerHitbox(impact, targetCylinder);
        var blastDirection = targetCylinder
          ? new THREE.Vector3(targetCylinder.centerX - impact.x, 0, targetCylinder.centerZ - impact.z)
          : new THREE.Vector3();
        var blastLen = blastDirection.length();
        var blastBlocked = false;
        if (blastLen > 1e-4) {
          _blastRaycaster.set(impact, blastDirection.multiplyScalar(1 / blastLen));
          _blastRaycaster.near = 0;
          _blastRaycaster.far = blastLen;
          var blastWalls = _blastRaycaster.intersectObjects(arenaObstacles, false);
          blastBlocked = blastWalls.length > 0 && blastWalls[0].distance < blastLen - 0.02;
        }
        if (gapToCylinder <= 2.4 && !blastBlocked) applyDuelDamage(100 * (1 - gapToCylinder / 2.4), p.target);
        scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); activeDuel.projectiles.splice(i, 1);
      }
    }
  }

  function clearDuelArena() {
    duelHud.style.display = 'none'; duelHint.style.display = 'none';
    duelSmokeP1.style.display = 'none'; duelSmokeP2.style.display = 'none';
    duelDivider.style.display = 'none';
    duelCrosshairP1.style.display = 'none';
    duelCrosshairP2.style.display = 'none';
    detachDuelCameras();
    if (duel) {
      ['mines','shields','smoke'].forEach(function (key) {
        duel[key].forEach(function (o) {
          scene.remove(o.mesh);
          if (o.mesh.geometry) o.mesh.geometry.dispose();
          if (o.mesh.material) o.mesh.material.dispose();
        });
        duel[key].length = 0;
      });
    }
    for (var ei = duelEffects.length - 1; ei >= 0; ei--) { scene.remove(duelEffects[ei].mesh); }
    duelEffects.length = 0;
    if (duel) {
      duel.projectiles.forEach(function (p) { scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); });
      duel.projectiles.length = 0;
    }
    sceneAmbient.intensity = SCENE_AMBIENT_DEFAULT;
    sun.intensity = SCENE_SUN_DEFAULT;
    fill.intensity = SCENE_FILL_DEFAULT;
    scene.remove(duelArena);
    while (duelArena.children.length) {
      var c = duelArena.children[duelArena.children.length - 1];
      duelArena.remove(c);
      if (c.geometry && c.geometry.dispose) { c.geometry.dispose(); }
      if (c.shadow && c.shadow.map) { c.shadow.map.dispose(); }
    }
    arenaObstacles.length = 0;
  }

  function resolveDuel(attackerWon) {
    if (!duel || duel.finished) return;
    duel.finished = true;
    var result = duel;
    duelFireHeldP1 = false;
    duelFireHeldP2 = false;
    abilityLatch.attacker = false;
    abilityLatch.defender = false;
    activeKeys = Object.create(null);
    duelScoped = false;
    releaseLock();
    clearDuelArena();
    var loser = attackerWon ? result.defender : result.attacker;
    var winner = attackerWon ? result.attacker : result.defender;
    var loserIndex = pieces.indexOf(loser);
    if (loserIndex !== -1) pieces.splice(loserIndex, 1);
    scene.remove(loser.mesh);
    if (selected === loser) selected = null;
    if (loser.type === 'king') declareWinner(sideOf(winner), cap(sideOf(loser)) + ' king was defeated in the combat arena.');
    if (attackerWon) {
      winner.row = result.toRow; winner.file = result.toFile;
      winner.mesh.position.set(worldX(result.toFile), TOP_Y + (winner.visualHeight || 1.6) / 2, worldZ(result.toRow));
      recordFirstMove(sideOf(winner), result.toRow, result.toFile);
      refreshTile(result.fromRow, result.fromFile);
      var landing = resolveLanding(winner, result.toRow, result.toFile);
      if (landing === 'exploded') { setStatus('The victor landed on a mine after winning the duel.'); }
    } else {
      winner.mesh.position.copy(result.defenderStart);
      winner.mesh.rotation.copy(result.defenderRotation);
    }
    duel = null;
    state = 'returning';
    document.addEventListener('mousemove', handlePovMouseMove);
    controls.enabled = false;
    var note = attackerWon ? pieceLabel(winner) + ' won the duel and captured the target.' : pieceLabel(loser) + ' lost the duel; the capture was repelled.';
    startTween(BIRD_POS.clone(), BIRD_QUAT.clone(), RETURN_MS, function () {
      configureBirdControls();
      camera.position.copy(BIRD_POS);
      controls.target.copy(ORIGIN);
      controls.update();
      controls.enabled = true;
      state = gameOver ? 'over' : 'strategic';
      if (gameOver) updateHud(); else endTurn(note);
    });
    updateHud();
  }

  canvas.addEventListener('contextmenu', function (event) { if (state === 'duel') event.preventDefault(); });
  canvas.addEventListener('pointerdown', function (event) {
    if (state !== 'duel' || !duel) return;
    if (event.button === 2 && duel.attacker.type === 'bishop') {
      duelScoped = true;
      cameraP1.fov = 24;
      cameraP1.updateProjectionMatrix();
    }
  });
  window.addEventListener('pointerup', function (event) {
    if (event.button === 2 && duelScoped) {
      duelScoped = false;
      cameraP1.fov = duelBaseFov;
      cameraP1.updateProjectionMatrix();
    }
  });

  function executeMove(piece, toRow, toFile) {
    var fromRow = piece.row;
    var fromFile = piece.file;
    var captured = findPieceAt(toFile, toRow);
    if (captured) {
      beginDuel(piece, captured, toRow, toFile, fromRow, fromFile);
      return;
    }
    var fromName = squareName(fromFile, fromRow);
    var toName = squareName(toFile, toRow);

    captureTurnSnapshot();
    var destinationY = tileSurfaceY(toRow, toFile) + (piece.offset === undefined ? (TOP_Y + (piece.visualHeight || 1.6) / 2 - TOP_Y) : piece.offset);
    if (piece.offset === undefined) {
      piece.offset = piece.mesh.position.y - TOP_Y;
      destinationY = tileSurfaceY(toRow, toFile) + piece.offset;
    }
    setStatus('Moving ' + piece.type + ' ' + fromName + ' to ' + toName + '…');
    startPieceLerp(piece, worldX(toFile), destinationY, worldZ(toRow), PIECE_LERP_MS, function () {
      piece.row = toRow;
      piece.file = toFile;
      settlePiece(piece);
      recordFirstMove(turn, toRow, toFile);
      var result = resolveLanding(piece, toRow, toFile);
      var landed = tiles[toRow][toFile];
      var note = cap(sideOf(piece)) + ' moved ' + piece.type + ' ' + fromName + ' to ' + toName + '.';
      if (result === 'exploded') note += ' It landed on a mine and was destroyed.';
      else if (result === 'safe') note += ' Tile is safe, ' + landed.count + ' adjacent ' + (landed.count === 1 ? 'mine' : 'mines') + '.';
      AudioFX.moveStep();
      if (!gameOver) { captureTurnSnapshot(); }
      finishAction(note);
    });
  }

  function attemptMove(hit, data) {
    if (!hit) { setStatus('No tile there. Aim at a tile to move.'); return; }
    var toFile;
    var toRow;
    if (data.piece) { toFile = data.piece.file; toRow = data.piece.row; }
    else if (data.isSquare) { toFile = data.file; toRow = data.row; }
    else { setStatus('No tile there. Aim at a tile to move.'); return; }
    if (!isLegalMove(selected, toRow, toFile)) {
      showAlert('Illegal move');
      setStatus('That is not a legal move for the ' + selected.type + '.');
      return;
    }
    openConfirmMove(selected, toRow, toFile);
  }

  function toggleFpvMode() {
    if (state !== 'pov') { return; }
    fpvMode = fpvMode === 'MOVE' ? 'FLAG' : 'MOVE';
    setStatus(fpvMode === 'MOVE' ? 'Movement mode. Click a legal tile to move.' : 'Flagging mode. Click a tile to flag or unflag it.');
    updateHud();
  }

  var lastWheelTime = 0;
  window.addEventListener('wheel', function (event) {
    if (state !== 'pov') { return; }
    event.preventDefault();
    var now = performance.now();
    var newGesture = now - lastWheelTime > 200;
    lastWheelTime = now;
    if (newGesture && event.deltaY !== 0) { toggleFpvMode(); }
  }, { passive: false });

  var alertEl = document.getElementById('alert');
  alertEl.style.display = 'none';
  var alertUntil = 0;
  function showAlert(text) {
    alertEl.textContent = text;
    alertEl.style.display = 'block';
    alertUntil = performance.now() + 1400;
  }
  function updateAlert(now) {
    if (alertEl.style.display !== 'none' && (now > alertUntil || state !== 'pov')) { alertEl.style.display = 'none'; }
  }

  function shoot() {
    if (state !== 'pov' || !selected || pieceLerp) { return; }
    camera.updateMatrixWorld(true);
    raycaster.setFromCamera(CENTER, camera);
    var muzzle = camera.localToWorld(new THREE.Vector3(0.14, -0.14, -0.35));
    var hits = intersectPickTargets(raycaster);
    var hit = hits.length > 0 ? hits[0] : null;
    var data = hit ? (hit.object.userData || {}) : {};

    var lookingDown = false;
    if (hit && data.isSquare && hit.point.y > tileSurfaceY(data.row, data.file) - 0.02 && raycaster.ray.direction.y < 0) {
      var pointTile = tileFromPoint(hit.point);
      lookingDown = !!pointTile && pointTile.file === selected.file && pointTile.row === selected.row;
    }
    if (lookingDown) {
      if (fpvMode === 'FLAG') { fireLaser(muzzle, hit.point); }
      revealOwnTile();
      return;
    }

    if (hit && data.isSquare && tiles[data.row][data.file].revealed) {
      if (attemptChord(data.row, data.file)) { return; }
    }

    if (fpvMode === 'MOVE') {
      attemptMove(hit, data);
      return;
    }

    if (firstMoveCount < FIRST_MOVES_REQUIRED) {
      showAlert('Flagging unavailable');
      return;
    }

    if (!hit) {
      fireLaser(muzzle, raycaster.ray.at(14, new THREE.Vector3()));
      setStatus('Missed. Aim at a tile on the board.');
      return;
    }
    fireLaser(muzzle, hit.point);
    var fileIndex;
    var rowIndex;
    if (data.piece) { fileIndex = data.piece.file; rowIndex = data.piece.row; }
    else if (data.isSquare) { fileIndex = data.file; rowIndex = data.row; }
    else { setStatus('Nothing to flag there. Aim at a tile.'); return; }
    if (!tiles[rowIndex] || !tiles[rowIndex][fileIndex]) { setStatus('That tile is not on the board.'); return; }

    var tile = tiles[rowIndex][fileIndex];
    var name = squareName(fileIndex, rowIndex);
    if (tile.revealed) {
      setStatus('Tile ' + name + ' is already revealed. Flags go on hidden tiles.');
      return;
    }
    var note;
    if (tile.flaggedBy) {
      var owner = tile.flaggedBy;
      tile.flaggedBy = null;
      note = 'Unflagged ' + name + '. The flag returns to ' + sideWord(owner) + '.';
    } else {
      if (flagsLeft(turn) <= 0) {
        setStatus('No flags left. Shoot a flagged tile to get one back.');
        return;
      }
      tile.flaggedBy = turn;
      AudioFX.flagPlacement();
      note = cap(turn) + ' flagged ' + name + ' as a mine.';
    }
    refreshTile(rowIndex, fileIndex);
    captureTurnSnapshot();
    if (checkFlagSymmetryVictory(turn)) {
      declareTacticalVictory(turn);
      updateHud();
      return;
    }
    endTurn(note);
  }

  btnBack.addEventListener('click', function () {
    if (state === 'entering' || state === 'pov') { beginReturn(); }
    btnBack.blur();
  });
  btnEnd.addEventListener('click', function () { endTurn(); btnEnd.blur(); });
  btnUndo.addEventListener('click', function () { undoMove(); btnUndo.blur(); });

  window.addEventListener('keydown', function (event) {
    if (!matchActive) { return; }
    if (state === 'duel' && duel) {
      if (event.code === 'Tab') { event.preventDefault(); return; }
      if (event.code === 'Escape') { event.preventDefault(); resolveDuel(false); return; }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Enter',
           'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'Comma', 'Period', 'ShiftLeft', 'ShiftRight', 'ControlRight', 'KeyM', 'Numpad0'].includes(event.code)) {
        event.preventDefault();
      }
      activeKeys[event.code] = true;
      switch (event.code) {
        case 'Space':
          event.preventDefault();
          if (!event.repeat) {
            duelFireHeldP1 = true;
            fireDuelWeapon(performance.now(), 'attacker');
          }
          return;
        case 'Enter':
          event.preventDefault();
          if (!event.repeat) {
            duelFireHeldP2 = true;
            fireDuelWeapon(performance.now(), 'defender');
          }
          return;
        default:
          return;
      }
    }
    if (event.key === 'Escape') {
      if (state === 'confirming') {
        event.preventDefault();
        cancelConfirmMove();
        return;
      }
      if (state === 'entering' || state === 'pov') { event.preventDefault(); beginReturn(); }
    } else if ((event.key === 'u' || event.key === 'U') && !event.repeat && !event.ctrlKey && !event.metaKey) {
      if (canUndo()) { event.preventDefault(); undoMove(); }
    } else if ((event.key === 't' || event.key === 'T') && !event.repeat && !event.ctrlKey && !event.metaKey) {
      endTurn();
    } else if ((event.key === 'q' || event.key === 'Q') && !event.repeat && !event.ctrlKey && !event.metaKey) {
      toggleFpvMode();
    }
  });
  window.addEventListener('keyup', function (event) {
    if (activeKeys[event.code]) activeKeys[event.code] = false;
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') abilityLatch.attacker = false;
    if (event.code === 'ControlRight' || event.code === 'KeyM' || event.code === 'Numpad0') abilityLatch.defender = false;
    if (event.code === 'Space') { duelFireHeldP1 = false; }
    if (event.code === 'Enter') { duelFireHeldP2 = false; }
  });
  window.addEventListener('blur', function () {
    activeKeys = Object.create(null);
    abilityLatch.attacker = false;
    abilityLatch.defender = false;
    duelFireHeldP1 = false;
    duelFireHeldP2 = false;
  });

  function onResize() {
    var width = Math.max(1, window.innerWidth);
    var height = Math.max(1, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    var splitLeftWidth = Math.floor(width / 2);
    var splitRightWidth = width - splitLeftWidth;
    cameraP1.aspect = Math.max(1, splitLeftWidth) / height;
    cameraP2.aspect = Math.max(1, splitRightWidth) / height;
    cameraP1.updateProjectionMatrix();
    cameraP2.updateProjectionMatrix();
    BIRD_POS.y = birdHeight();
    if (!tween && (state === 'strategic' || state === 'over')) {
      camera.position.copy(BIRD_POS);
      controls.target.copy(ORIGIN);
      controls.update();
    }
  }
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
  if (window.ResizeObserver) { new ResizeObserver(onResize).observe(document.documentElement); }

  var ATTRACT_STATE = 'MENU_ATTRACT';
  var ATTRACT_BG = 0x181818;
  var ATTRACT_RADIUS = 15;
  var ATTRACT_HEIGHT = 10.5;
  var ATTRACT_SPEED = 0.00011;
  var ATTRACT_LOOK = new THREE.Vector3(0, 0.4, 0);
  var attractAngle = 0;
  var attractLastTime = 0;

  function enterAttract() {
    state = ATTRACT_STATE;
    controls.enabled = false;
    scene.background.setHex(ATTRACT_BG);
    attractAngle = 0;
    attractLastTime = performance.now();
    document.body.setAttribute('data-screen', 'menu');
  }

  function leaveAttract() {
    scene.background.setHex(PALETTE.background);
    document.body.setAttribute('data-screen', 'match');
    tween = null;
    controls.enabled = true;
    configureBirdControls();
    camera.position.copy(BIRD_POS);
    camera.quaternion.copy(BIRD_QUAT);
    controls.target.copy(ORIGIN);
    controls.update();
  }

  function renderAttract(frameNow) {
    var dtMs = Math.min(100, Math.max(0, frameNow - attractLastTime));
    attractLastTime = frameNow;
    attractAngle += dtMs * ATTRACT_SPEED;
    var fit = Math.min(2.2, Math.max(1, 0.8 / camera.aspect));
    camera.position.set(
      Math.sin(attractAngle) * ATTRACT_RADIUS * fit,
      ATTRACT_HEIGHT * fit,
      Math.cos(attractAngle) * ATTRACT_RADIUS * fit
    );
    camera.lookAt(ATTRACT_LOOK);
    renderer.setScissorTest(false);
    renderer.autoClear = true;
    renderer.setViewport(0, 0, Math.max(1, window.innerWidth), Math.max(1, window.innerHeight));
    renderer.render(scene, camera);
  }

  function animate(now) {
    requestAnimationFrame(animate);
    if (!matchActive) {
      if (state === ATTRACT_STATE) { renderAttract(now || performance.now()); }
      return;
    }
    var frameNow = now || performance.now();
    stepTween(frameNow);
    stepPieceLerp(frameNow);

    if (!tween && (state === 'strategic' || state === 'over' || (state === 'pov' && !isLocked()))) { controls.update(); }
    updateLaser(frameNow);

    if (state === 'strategic' || state === 'entering' || state === 'pov') {
      var dtClock = Math.min(0.1, Math.max(0, (frameNow - lastFrameTime) / 1000));
      turnTimeRemaining = Math.max(0, turnTimeRemaining - dtClock);
      renderTurnClock();
      if (turnTimeRemaining <= 0) {
        if (state === 'pov' || state === 'entering') { beginReturn(cap(turn) + ' timed out. Turn forfeited.'); }
        else { setStatus(cap(turn) + ' timed out. Turn forfeited.'); }
        resetTurnClock();
        turnSnapshot = null;
        turn = turn === 'white' ? 'black' : 'white';
        if (turn === 'white') { round += 1; }
        updateHud();
      }
    }

    if (state === 'duel' && duel) {
      var duelDt = Math.min(0.05, Math.max(0, (frameNow - lastFrameTime) / 1000));
      updateDuelMovement(duelDt);
      updateDuelUtilities(duelDt, frameNow);
      updateDuelTimer();
      updateDuelEffects(duelDt);
      if (duel && frameNow >= duel.duelEndsAt) resolveDuel(duel.attackerHp >= duel.defenderHp);
      if (!duel) { lastFrameTime = frameNow; return; }
      if (duelFireHeldP1 && duel.attacker.type === 'knight' && frameNow - duel.cooldowns.attacker >= 150) fireDuelWeapon(frameNow, 'attacker');
      if (duelFireHeldP2 && duel.defender.type === 'knight' && frameNow - duel.cooldowns.defender >= 150) fireDuelWeapon(frameNow, 'defender');
      updateDuelProjectiles(duelDt);
    }
    updateNumberFacing();
    updateAlert(frameNow);
    updateParticles(Math.min(0.05, (frameNow - lastFrameTime) / 1000));
    lastFrameTime = frameNow;

    if (state === 'duel' && duel) {
      var renderWidth = Math.max(1, window.innerWidth);
      var renderHeight = Math.max(1, window.innerHeight);
      var leftWidth = Math.floor(renderWidth / 2);
      var rightWidth = renderWidth - leftWidth;
      renderer.setScissorTest(true);
      renderer.autoClear = false;
      renderer.setViewport(0, 0, renderWidth, renderHeight);
      renderer.setScissor(0, 0, renderWidth, renderHeight);
      renderer.clear(true, true, true);
      renderer.setViewport(0, 0, leftWidth, renderHeight);
      renderer.setScissor(0, 0, leftWidth, renderHeight);
      renderer.render(scene, cameraP1);
      renderer.setViewport(leftWidth, 0, rightWidth, renderHeight);
      renderer.setScissor(leftWidth, 0, rightWidth, renderHeight);
      renderer.render(scene, cameraP2);
      renderer.setScissorTest(false);
      renderer.autoClear = true;
      renderer.setViewport(0, 0, renderWidth, renderHeight);
    } else {
      renderer.setScissorTest(false);
      renderer.autoClear = true;
      renderer.setViewport(0, 0, Math.max(1, window.innerWidth), Math.max(1, window.innerHeight));
      renderer.render(scene, camera);
    }
  }

  configureBirdControls();
  camera.position.copy(BIRD_POS);
  controls.target.copy(ORIGIN);
  controls.update();

  var matchActive = false;
  var selectedMode = 'MIDLINE';
  var MODE_CONFIG = {
    MIDLINE:  { mineRowMin: 2, mineRowMax: 5 },
    HARDCORE: { mineRowMin: 0, mineRowMax: 7 }
  };
  var craterGroups = [];
  var mainMenu = document.getElementById('mainMenu');
  var modeMidlineBtn = document.getElementById('modeMidline');
  var modeHardcoreBtn = document.getElementById('modeHardcore');
  var btnStart = document.getElementById('btnStart');
  var menuHideTimer = 0;

  function disposeObject(root) {
    root.traverse(function (obj) {
      if (obj.geometry && obj.geometry.dispose) { obj.geometry.dispose(); }
      if (obj.material) {
        var materialList = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (var mi = 0; mi < materialList.length; mi++) {
          if (materialList[mi].map && materialList[mi].map.dispose) { materialList[mi].map.dispose(); }
          if (materialList[mi].dispose) { materialList[mi].dispose(); }
        }
      }
    });
  }

  function setMode(mode) {
    selectedMode = mode;
    modeMidlineBtn.setAttribute('aria-pressed', mode === 'MIDLINE' ? 'true' : 'false');
    modeHardcoreBtn.setAttribute('aria-pressed', mode === 'HARDCORE' ? 'true' : 'false');
  }
  modeMidlineBtn.addEventListener('click', function () { setMode('MIDLINE'); });
  modeHardcoreBtn.addEventListener('click', function () { setMode('HARDCORE'); });

  function showMainMenu() {
    clearTimeout(menuHideTimer);
    matchActive = false;
    enterAttract();
    setMode('MIDLINE');
    mainMenu.style.display = 'flex';
    void mainMenu.offsetWidth;
    mainMenu.classList.remove('hidden');
    updateHud();
  }

  function startMatch() {
    leaveAttract();
    var cfg = MODE_CONFIG[selectedMode];
    MINE_ROW_MIN = cfg.mineRowMin;
    MINE_ROW_MAX = cfg.mineRowMax;
    for (var r = 0; r < 8; r++) {
      for (var c = 0; c < 8; c++) { mineArray[r][c] = false; }
    }
    firstMoveCount = 0;
    firstMoves = { white: null, black: null };
    minesPlaced = false;
    invalidateSafeTileCache();
    turn = 'white';
    round = 1;
    state = 'strategic';
    turnSnapshot = null;
    resetTurnClock();
    setStatus('Green to move. Click a green piece.');
    mainMenu.classList.add('hidden');
    clearTimeout(menuHideTimer);
    menuHideTimer = setTimeout(function () { mainMenu.style.display = 'none'; }, 480);
    matchActive = true;
    lastFrameTime = performance.now();
    updateHud();
    onResize();
  }
  btnStart.addEventListener('click', startMatch);

  function resetMatch() {
    releaseLock();
    tween = null;
    pieceLerp = null;
    if (duel) { duel.finished = true; duel = null; }
    clearDuelArena();
    duelFireHeldP1 = false;
    duelFireHeldP2 = false;
    duelScoped = false;
    abilityLatch.attacker = false;
    abilityLatch.defender = false;
    activeKeys = Object.create(null);

    for (var pi = pieces.length - 1; pi >= 0; pi--) {
      scene.remove(pieces[pi].mesh);
      disposeObject(pieces[pi].mesh);
    }
    pieces.length = 0;
    for (var ni = 0; ni < numberGroups.length; ni++) {
      scene.remove(numberGroups[ni]);
      disposeObject(numberGroups[ni]);
    }
    numberGroups.length = 0;
    clearCraterGroups();
    for (var qi = 0; qi < particles.length; qi++) { scene.remove(particles[qi].mesh); }
    particles.length = 0;
    laser.visible = false;
    alertEl.style.display = 'none';
    closeConfirmMove();
    document.getElementById('gameOver').style.display = 'none';
    gameOver = null;
    turnSnapshot = null;

    for (var r = 0; r < 8; r++) {
      for (var c = 0; c < 8; c++) {
        tiles[r][c] = { flaggedBy: null, revealed: false };
        mineArray[r][c] = false;
        squares[r][c].material.color.setHex(squares[r][c].userData.baseColor);
        squares[r][c].scale.y = 1;
        squares[r][c].position.y = 0;
      }
    }
    firstMoveCount = 0;
    firstMoves = { white: null, black: null };
    minesPlaced = false;
    invalidateSafeTileCache();
    turn = 'white';
    round = 1;
    selected = null;
    fpvMode = 'MOVE';
    lockHeld = false;
    downInfo = null;

    setupPieces();

    state = 'strategic';
    controls.enabled = true;
    configureBirdControls();
    camera.position.copy(BIRD_POS);
    camera.quaternion.copy(BIRD_QUAT);
    controls.target.copy(ORIGIN);
    controls.update();
    canvas.style.cursor = 'default';
    setStatus('Green to move. Click a green piece.');
    resetTurnClock();
    updateHud();
    onResize();
  }

  showMainMenu();
  updateHud();
  onResize();
  requestAnimationFrame(animate);
})();