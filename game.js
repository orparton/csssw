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

  function addPart(group, geometry,