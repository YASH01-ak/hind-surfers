import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameRenderer } from './game/renderer';
import { GameEngine } from './game/engine';
import { sounds } from './game/audio';
import { CHARACTERS, DIFFICULTIES } from './game/constants';
import { Character, Difficulty, PowerupState, Upgrade } from './game/types';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // UI State
  const [gameState, setGameState] = useState<'ready' | 'play' | 'pause' | 'over'>('ready');
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [totalRupees, setTotalRupees] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);

  const [activePowerups, setActivePowerups] = useState<PowerupState>({
    magnet: 0,
    multiplier: 0,
    boots: 0,
    hoverboard: false
  });

  const [selectedCharacter, setSelectedCharacter] = useState<Character>(CHARACTERS[0]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>(DIFFICULTIES.normal);
  const [upgrades, setUpgrades] = useState<Upgrade[]>([]);

  // Modals
  const [showShop, setShowShop] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [touchControlsEnabled, setTouchControlsEnabled] = useState(false);

  // Initialize Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new GameRenderer(canvas);

    const engine = new GameEngine(
      renderer,
      (finalScore, earnedCoins, best, newBest) => {
        setScore(finalScore);
        setCoins(earnedCoins);
        setHighScore(best);
        setIsNewBest(newBest);
        setTotalRupees(engine.totalRupees);
        setGameState('over');
      },
      (curScore, curCoins) => {
        setScore(curScore);
        setCoins(curCoins);
      },
      (pUps) => {
        setActivePowerups({ ...pUps });
      }
    );

    engineRef.current = engine;
    setHighScore(engine.highScore);
    setTotalRupees(engine.totalRupees);
    setSelectedCharacter(engine.character);
    setSelectedDifficulty(engine.difficulty);
    setUpgrades([...engine.upgrades]);

    const handleResize = () => {
      renderer.resize();
    };
    window.addEventListener('resize', handleResize);

    // Game Animation Loop
    let animationFrameId: number;
    let lastTime = performance.now();

    const loop = (timestamp: number) => {
      const dt = Math.min(0.05, (timestamp - lastTime) / 1000 || 0);
      lastTime = timestamp;

      engine.t += dt;
      if (engine.shake > 0) engine.shake -= dt;
      engine.run += dt * (engine.state === 'over' ? 0 : engine.speed * 0.35);

      engine.update(dt);
      engine.draw();

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      sounds.stopBackgroundMusic();
    };
  }, []);

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const engine = engineRef.current;
      if (!engine) return;

      const k = e.key;

      if (engine.state !== 'play') {
        if (k === 'Enter' || k === ' ') {
          if (!showShop && !showSettings) {
            e.preventDefault();
            startGame();
          }
        }
        return;
      }

      if (k === 'ArrowLeft' || k === 'a' || k === 'A') {
        engine.moveLane(-1);
      } else if (k === 'ArrowRight' || k === 'd' || k === 'D') {
        engine.moveLane(1);
      } else if (k === 'ArrowUp' || k === 'w' || k === 'W' || k === ' ') {
        e.preventDefault();
        engine.jump();
      } else if (k === 'ArrowDown' || k === 's' || k === 'S') {
        e.preventDefault();
        engine.slide();
      } else if (k === 'h' || k === 'H') {
        engine.activateHoverboard();
      } else if (k === 'Escape' || k === 'p' || k === 'P') {
        togglePause();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showShop, showSettings]);

  // Touch & Swipe Controls
  const touchStartRef = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    sounds.init();
    const now = performance.now();
    const prevTime = touchStartRef.current.time;
    const interval = now - prevTime;

    touchStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: now
    };

    // Double tap triggers hoverboard
    if (interval > 40 && interval < 320) {
      if (engineRef.current && engineRef.current.state === 'play') {
        engineRef.current.activateHoverboard();
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const engine = engineRef.current;
    if (!engine || engine.state !== 'play') return;
    if (!touchStartRef.current.time) return;

    const dx = e.clientX - touchStartRef.current.x;
    const dy = e.clientY - touchStartRef.current.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (Math.max(absX, absY) > 28) {
      touchStartRef.current.time = 0; // consume gesture
      if (absX > absY) {
        engine.moveLane(dx > 0 ? 1 : -1);
      } else {
        if (dy < 0) {
          engine.jump();
        } else {
          engine.slide();
        }
      }
    }
  };

  const handlePointerUp = () => {
    touchStartRef.current.time = 0;
  };

  // Actions
  const startGame = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    setShowShop(false);
    setShowSettings(false);
    setIsNewBest(false);
    engine.start();
    setGameState('play');
    setScore(0);
    setCoins(0);
  }, []);

  const togglePause = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (engine.state === 'play') {
      engine.pause();
      setGameState('pause');
    } else if (engine.state === 'pause') {
      engine.pause();
      setGameState('play');
    }
  }, []);

  const returnToMenu = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    sounds.stopBackgroundMusic();
    engine.state = 'ready';
    setGameState('ready');
    setHighScore(engine.highScore);
    setTotalRupees(engine.totalRupees);
  }, []);

  const handleSelectCharacter = (char: Character) => {
    const engine = engineRef.current;
    if (!engine) return;
    if (!char.unlocked && engine.totalRupees < char.cost) {
      sounds.playCrash();
      return;
    }

    if (!char.unlocked) {
      engine.totalRupees -= char.cost;
      char.unlocked = true;
      setTotalRupees(engine.totalRupees);
      sounds.playPowerup();
    }

    engine.setCharacter(char.id);
    setSelectedCharacter(char);
    sounds.playLaneSwitch();
  };

  const handleSelectDifficulty = (diffKey: string) => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.setDifficulty(diffKey);
    setSelectedDifficulty(engine.difficulty);
    sounds.playLaneSwitch();
  };

  const handleBuyUpgrade = (upg: Upgrade) => {
    const engine = engineRef.current;
    if (!engine) return;

    const cost =
      upg.id === 'hoverboard_item'
        ? upg.cost || 50
        : Math.round(upg.baseCost * Math.pow(upg.costMultiplier, upg.level - 1));

    const isMax = upg.id !== 'hoverboard_item' && upg.level >= upg.maxLevel;

    if (engine.totalRupees >= cost && !isMax) {
      engine.totalRupees -= cost;
      if (upg.id === 'hoverboard_item') {
        upg.count = (upg.count || 0) + 1;
      } else {
        upg.level += 1;
      }
      engine.saveData();
      sounds.playPowerup();
      setTotalRupees(engine.totalRupees);
      setUpgrades([...engine.upgrades]);
    } else {
      sounds.playCrash();
    }
  };

  return (
    <div
      className="relative w-screen h-screen overflow-hidden select-none touch-none bg-slate-950 font-['Baloo_2'] text-white"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* 3D Perspective Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

      {/* Subway Arcade HUD (Active during play & pause) */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 sm:p-6 z-10">
        {/* Top Badges */}
        <div className="flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-3">
            {/* Score */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border-2 border-yellow-400/70 shadow-lg backdrop-blur-md">
              <span className="text-xl">⚡</span>
              <span className="font-titan text-lg sm:text-xl text-yellow-300 tracking-wider">
                {score}
              </span>
            </div>

            {/* Rupee Coins */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border-2 border-amber-500/70 shadow-lg backdrop-blur-md">
              <span className="text-lg font-black text-amber-400">₹</span>
              <span className="font-titan text-lg sm:text-xl text-amber-300 tracking-wider">
                {coins}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Multiplier Badge */}
            <div className="px-3 py-1 rounded-full bg-gradient-to-r from-red-600 to-amber-600 border border-yellow-300 font-titan text-sm text-yellow-200 shadow-md">
              {activePowerups.multiplier > 0 ? '4X' : '2X'}
            </div>

            {/* Pause Button */}
            {gameState === 'play' && (
              <button
                onClick={togglePause}
                className="w-10 h-10 rounded-full bg-slate-900/80 border-2 border-slate-600 flex items-center justify-center text-lg active:scale-95 shadow-md transition-transform"
                title="Pause (Esc / P)"
              >
                ⏸
              </button>
            )}
          </div>
        </div>

        {/* Center Notifications: Active Powerups & Hoverboard */}
        <div className="flex flex-col items-center gap-2">
          {/* Active Hoverboard Shield Alert */}
          {activePowerups.hoverboard && (
            <div className="hoverboard-active-banner px-4 py-1.5 rounded-full bg-emerald-700/90 border-2 border-emerald-300 text-emerald-100 font-titan text-xs sm:text-sm tracking-wider flex items-center gap-2 shadow-xl">
              <span>🛹</span>
              <span>TEJAS HOVERBOARD ACTIVE</span>
            </div>
          )}

          {/* Active Powerups Countdown Bar */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {activePowerups.magnet > 0 && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/90 border border-orange-500 text-xs text-orange-300 shadow">
                <span>🧲 Chumbak</span>
                <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500 rounded-full"
                    style={{ width: `${(activePowerups.magnet / 10) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {activePowerups.multiplier > 0 && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/90 border border-yellow-500 text-xs text-yellow-300 shadow">
                <span>🪙 2X Sona</span>
                <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 rounded-full"
                    style={{ width: `${(activePowerups.multiplier / 10) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {activePowerups.boots > 0 && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/90 border border-green-500 text-xs text-green-300 shadow">
                <span>👟 Super Boots</span>
                <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: `${(activePowerups.boots / 10) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile On-Screen Virtual Controls */}
        {touchControlsEnabled && gameState === 'play' && (
          <div className="pointer-events-auto flex items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => engineRef.current?.moveLane(-1)}
                className="w-14 h-14 rounded-2xl bg-slate-900/80 border-2 border-slate-600 active:bg-orange-600 flex items-center justify-center text-2xl font-bold shadow-lg"
              >
                ←
              </button>
              <button
                onClick={() => engineRef.current?.moveLane(1)}
                className="w-14 h-14 rounded-2xl bg-slate-900/80 border-2 border-slate-600 active:bg-orange-600 flex items-center justify-center text-2xl font-bold shadow-lg"
              >
                →
              </button>
            </div>

            {/* Quick Hoverboard Button */}
            <button
              onClick={() => engineRef.current?.activateHoverboard()}
              className="w-12 h-12 rounded-full bg-emerald-800/80 border-2 border-emerald-400 active:bg-emerald-600 flex items-center justify-center text-xl shadow-lg"
              title="Activate Hoverboard"
            >
              🛹
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => engineRef.current?.jump()}
                className="w-14 h-14 rounded-2xl bg-slate-900/80 border-2 border-slate-600 active:bg-blue-600 flex items-center justify-center text-2xl font-bold shadow-lg"
              >
                ↑
              </button>
              <button
                onClick={() => engineRef.current?.slide()}
                className="w-14 h-14 rounded-2xl bg-slate-900/80 border-2 border-slate-600 active:bg-blue-600 flex items-center justify-center text-2xl font-bold shadow-lg"
              >
                ↓
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Start Menu Screen */}
      {gameState === 'ready' && !showShop && !showSettings && (
        <div className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md p-6 sm:p-7 rounded-3xl text-center relative max-h-[95vh] overflow-y-auto">
            {/* Title with Tiranga Ribbon */}
            <h1 className="font-titan text-3xl sm:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-yellow-200 to-emerald-400 drop-shadow-md">
              HIND SURFER
            </h1>
            <div className="tiranga-strip">
              <span />
              <span />
              <span />
            </div>
            <p className="text-sm font-semibold text-slate-300 -mt-2 mb-4 tracking-wide">
              Indian Railways Track Runner
            </p>

            {/* Runner Selector Shelf */}
            <div className="text-left mb-3">
              <div className="text-xs font-bold text-yellow-400 uppercase tracking-wider mb-1.5">
                Chuninda Runner:
              </div>
              <div className="grid grid-cols-2 gap-2">
                {CHARACTERS.map((char) => {
                  const isSelected = selectedCharacter.id === char.id;
                  const isUnlocked = char.unlocked || totalRupees >= char.cost;
                  return (
                    <button
                      key={char.id}
                      onClick={() => handleSelectCharacter(char)}
                      className={`p-2.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                        isSelected
                          ? 'border-yellow-400 bg-yellow-500/20 shadow-md'
                          : 'border-slate-700 bg-slate-900/60 hover:border-slate-500'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-2xl">{char.emoji}</span>
                        {!char.unlocked && (
                          <span className="text-xs font-bold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-600">
                            ₹{char.cost}
                          </span>
                        )}
                      </div>
                      <div className="mt-1">
                        <div className="font-bold text-sm text-white leading-tight">{char.name}</div>
                        <div className="text-[11px] text-slate-300 truncate">{char.perk}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Difficulty Selector */}
            <div className="text-left mb-4">
              <div className="text-xs font-bold text-yellow-400 uppercase tracking-wider mb-1.5">
                Speed Mode:
              </div>
              <div className="grid grid-cols-3 gap-2">
                {Object.values(DIFFICULTIES).map((diff) => {
                  const isSelected = selectedDifficulty.id === diff.id;
                  return (
                    <button
                      key={diff.id}
                      onClick={() => handleSelectDifficulty(diff.id)}
                      className={`py-2 px-1 rounded-xl border text-center transition-all ${
                        isSelected
                          ? 'border-orange-500 bg-orange-600/30 text-white font-bold shadow-md'
                          : 'border-slate-700 bg-slate-900/50 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="text-xs font-bold leading-tight">{diff.name}</div>
                      <div className="text-[10px] opacity-75">{diff.desc.split(' ')[0]}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* High Score & Bank Grid */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/60">
                <div className="text-[11px] font-bold text-slate-400">HIGH SCORE</div>
                <div className="font-titan text-xl text-yellow-300">{highScore}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-amber-600/40">
                <div className="text-[11px] font-bold text-amber-400">TOTAL RUPEES</div>
                <div className="font-titan text-xl text-amber-300">₹ {totalRupees}</div>
              </div>
            </div>

            {/* Primary DAUDNA SHURU KARO Button */}
            <button
              onClick={startGame}
              style={{ color: '#040303' }}
              className="arcade-btn-primary w-full py-3.5 px-6 rounded-2xl font-titan text-xl tracking-wider uppercase flex items-center justify-center gap-2 mb-3"
            >
              <span>▶️</span> DAUDNA SHURU KARO
            </button>

            {/* Secondary Buttons: Dukan & Settings */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={() => {
                  sounds.init();
                  setShowShop(true);
                }}
                className="arcade-btn-secondary py-2.5 px-4 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-1.5"
              >
                <span>🛒</span> DUKAN
              </button>
              <button
                onClick={() => {
                  sounds.init();
                  setShowSettings(true);
                }}
                className="arcade-btn-secondary py-2.5 px-4 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-1.5"
              >
                <span>⚙️</span> SETTINGS
              </button>
            </div>

            {/* Desktop / Mobile Controls Hint */}
            <p className="text-xs text-slate-400 leading-relaxed">
              Keys: <span className="bg-slate-800 px-1 py-0.5 rounded text-white font-mono">←</span>{' '}
              <span className="bg-slate-800 px-1 py-0.5 rounded text-white font-mono">→</span> Lane •{' '}
              <span className="bg-slate-800 px-1 py-0.5 rounded text-white font-mono">↑</span> Jump •{' '}
              <span className="bg-slate-800 px-1 py-0.5 rounded text-white font-mono">↓</span> Slide
              <br />
              Double Tap or <span className="bg-slate-800 px-1 py-0.5 rounded text-white font-mono">H</span> for Hoverboard Shield!
            </p>
          </div>
        </div>
      )}

      {/* Game Over Screen */}
      {gameState === 'over' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-sm p-6 sm:p-7 rounded-3xl text-center relative animate-in fade-in zoom-in-95 duration-200">
            <h2 className="font-titan text-3xl sm:text-4xl text-rose-500 drop-shadow">
              💥 TAKRA GAYE!
            </h2>
            <div className="tiranga-strip">
              <span />
              <span />
              <span />
            </div>

            {isNewBest && (
              <div className="inline-block px-3 py-1 mb-4 rounded-full bg-yellow-500/20 border border-yellow-400 text-yellow-300 font-titan text-xs tracking-wider animate-bounce">
                🎉 NAYA HIGH SCORE!
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-700">
                <div className="text-xs font-bold text-slate-400">SCORE</div>
                <div className="font-titan text-2xl text-yellow-300">{score}</div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-900/80 border border-amber-600/40">
                <div className="text-xs font-bold text-amber-400">RUPEES</div>
                <div className="font-titan text-2xl text-amber-300">₹ {coins}</div>
              </div>
            </div>

            <p className="text-sm text-slate-300 mb-6 font-medium">
              All-time Best: <strong className="text-yellow-400 font-titan">{highScore}</strong>
            </p>

            <button
              onClick={startGame}
              className="arcade-btn-primary w-full py-3.5 px-6 rounded-2xl font-titan text-xl tracking-wider text-white uppercase flex items-center justify-center gap-2 mb-3"
            >
              <span>🔄</span> PHIR SE DAUDO
            </button>

            <button
              onClick={returnToMenu}
              className="arcade-btn-secondary w-full py-2.5 px-4 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-1.5"
            >
              <span>🏠</span> MAIN MENU
            </button>
          </div>
        </div>
      )}

      {/* Pause Screen */}
      {gameState === 'pause' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-sm p-6 sm:p-7 rounded-3xl text-center relative">
            <h2 className="font-titan text-3xl text-yellow-400">GAME PAUSED</h2>
            <div className="tiranga-strip">
              <span />
              <span />
              <span />
            </div>
            <p className="text-sm text-slate-300 mb-6 font-medium">
              Thoda aaram lo aur wapas daudo!
            </p>

            <button
              onClick={togglePause}
              className="arcade-btn-primary w-full py-3.5 px-6 rounded-2xl font-titan text-lg tracking-wider text-white uppercase flex items-center justify-center gap-2 mb-3"
            >
              <span>▶️</span> RESUME
            </button>

            <button
              onClick={returnToMenu}
              className="arcade-btn-secondary w-full py-2.5 px-4 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-1.5"
            >
              <span>🏠</span> MAIN MENU
            </button>
          </div>
        </div>
      )}

      {/* Station Dukan (Shop Modal) */}
      {showShop && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="glass-panel w-full max-w-md p-6 rounded-3xl relative max-h-[90vh] flex flex-col">
            <button
              onClick={() => setShowShop(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-slate-300 hover:text-white"
            >
              ✕
            </button>

            <h2 className="font-titan text-2xl sm:text-3xl text-yellow-400">STATION DUKAN</h2>
            <div className="tiranga-strip">
              <span />
              <span />
              <span />
            </div>

            <div className="text-sm font-bold text-amber-300 mb-4 bg-amber-950/60 p-2 rounded-xl border border-amber-700/50 flex items-center justify-between">
              <span>Aapka Balance:</span>
              <span className="font-titan text-base">₹ {totalRupees}</span>
            </div>

            <div className="overflow-y-auto space-y-3 flex-1 pr-1">
              {upgrades.map((upg) => {
                const cost =
                  upg.id === 'hoverboard_item'
                    ? upg.cost || 50
                    : Math.round(upg.baseCost * Math.pow(upg.costMultiplier, upg.level - 1));

                const isMax = upg.id !== 'hoverboard_item' && upg.level >= upg.maxLevel;
                const canAfford = totalRupees >= cost;

                return (
                  <div
                    key={upg.id}
                    className="p-3 rounded-2xl bg-slate-900/80 border border-slate-700/80 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-600 flex items-center justify-center text-2xl">
                        {upg.icon}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-white">
                          {upg.name}{' '}
                          {upg.id === 'hoverboard_item'
                            ? `(${upg.count || 0})`
                            : `(Lvl ${upg.level})`}
                        </div>
                        <div className="text-xs text-slate-400">{upg.desc}</div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleBuyUpgrade(upg)}
                      disabled={isMax || !canAfford}
                      className={`px-3 py-2 rounded-xl font-titan text-xs whitespace-nowrap transition-all ${
                        isMax
                          ? 'bg-slate-800 text-slate-500 border border-slate-700'
                          : canAfford
                          ? 'arcade-btn-primary text-white'
                          : 'bg-slate-800 text-slate-400 border border-slate-700 opacity-60'
                      }`}
                    >
                      {isMax ? 'MAXED' : `₹ ${cost}`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="glass-panel w-full max-w-sm p-6 rounded-3xl relative">
            <button
              onClick={() => setShowSettings(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-slate-300 hover:text-white"
            >
              ✕
            </button>

            <h2 className="font-titan text-2xl text-yellow-400">SETTINGS</h2>
            <div className="tiranga-strip">
              <span />
              <span />
              <span />
            </div>

            <div className="space-y-4 mb-6">
              {/* Sound Effects */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-700">
                <span className="font-medium text-sm">🔊 Sound Effects</span>
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => {
                    sounds.init();
                    sounds.soundEnabled = e.target.checked;
                    setSoundEnabled(e.target.checked);
                  }}
                  className="w-5 h-5 accent-orange-500 cursor-pointer"
                />
              </div>

              {/* Desi Dholak Music */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-700">
                <span className="font-medium text-sm">🪘 Desi Dholak Beats</span>
                <input
                  type="checkbox"
                  checked={musicEnabled}
                  onChange={(e) => {
                    sounds.init();
                    sounds.musicEnabled = e.target.checked;
                    setMusicEnabled(e.target.checked);
                    if (gameState === 'play') {
                      if (e.target.checked) sounds.startBackgroundMusic();
                      else sounds.stopBackgroundMusic();
                    }
                  }}
                  className="w-5 h-5 accent-orange-500 cursor-pointer"
                />
              </div>

              {/* On-Screen Touch Buttons */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-700">
                <span className="font-medium text-sm">📱 On-Screen Touch Buttons</span>
                <input
                  type="checkbox"
                  checked={touchControlsEnabled}
                  onChange={(e) => setTouchControlsEnabled(e.target.checked)}
                  className="w-5 h-5 accent-orange-500 cursor-pointer"
                />
              </div>
            </div>

            <button
              onClick={() => setShowSettings(false)}
              className="arcade-btn-primary w-full py-2.5 rounded-xl font-titan text-sm text-white"
            >
              THEEK HAI (DONE)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
