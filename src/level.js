// 新手模式关卡（50关，每关35人，降低速度）
const generateNoviceLevels = () => {
  const levels = [];
  for (let i = 1; i <= 50; i++) {
    // 敌人数量：固定每关35人
    const enemyCount = 35;

    // 速度：基础1.2 + 每关增加0.5%（降低增幅）
    const speedMultiplier = 1 + (i * 0.005);
    const enemySpeed = parseFloat((1.2 * speedMultiplier).toFixed(3));

    // 生成间隔：基础1800ms，随关卡增加逐渐缩短
    const spawnRate = Math.max(1800 - i * 8, 800);

    levels.push({
      level: i,
      enemyCount: enemyCount,
      enemySpeed: enemySpeed,
      enemyHealth: 1,
      enemySpawnRate: spawnRate,
      bonusLife: 1000 + i * 50
    });
  }
  return levels;
};

// 进阶模式关卡（150关，每关增加1.2%速度，最多65敌人）
const generateAdvancedLevels = () => {
  const levels = [];
  for (let i = 1; i <= 150; i++) {
    // 敌人数量：基础5个 + 每关增加0.4个，最多65个
    const enemyCount = Math.min(5 + Math.floor(i * 0.4), 65);

    // 速度：基础2.0 + 每关增加1.2%
    const speedMultiplier = 1 + (i * 0.012);
    const enemySpeed = parseFloat((2.0 * speedMultiplier).toFixed(3));

    // 生命值：基础1 + 每8关增加1，最多6点
    const enemyHealth = Math.min(1 + Math.floor(i / 8), 6);

    // 生成间隔：基础1200ms，随关卡增加缩短
    const spawnRate = Math.max(1200 - i * 5, 500);

    levels.push({
      level: i,
      enemyCount: enemyCount,
      enemySpeed: enemySpeed,
      enemyHealth: enemyHealth,
      enemySpawnRate: spawnRate,
      bonusLife: 2000 + i * 80,
      isDifficultyIncrease: i % 5 === 0
    });
  }
  return levels;
};

const noviceLevels = generateNoviceLevels();
const advancedLevels = generateAdvancedLevels();

class LevelManager {
  constructor(game) {
    this.game = game;
    this.currentLevel = 0;
    this.enemiesSpawned = 0;
    this.spawnTimer = null;
  }

  get currentConfig() {
    return this.game.mode === 'novice' 
      ? noviceLevels[this.currentLevel] 
      : advancedLevels[this.currentLevel];
  }

  startLevel() {
    const config = this.currentConfig;
    document.getElementById('level').textContent = config.level;
    this.enemiesSpawned = 0;
    
    if (this.game.mode === 'advanced' && config.isDifficultyIncrease) {
      this.game.showMessage(`难度提升！敌人生命值和速度增加了！`, 3000);
    } else {
      this.game.showMessage(`关卡 ${config.level} 开始！`, 2000);
    }
    
    this.startSpawningEnemies();
  }

  startSpawningEnemies() {
    const config = this.currentConfig;
    clearInterval(this.spawnTimer);
    
    this.spawnTimer = setInterval(() => {
      if (this.enemiesSpawned < config.enemyCount && !this.game.gameOver) {
        this.spawnEnemy();
        this.enemiesSpawned++;
      } else if (this.game.gameOver) {
        clearInterval(this.spawnTimer);
      }
    }, config.enemySpawnRate);
  }

  spawnEnemy() {
    const config = this.currentConfig;
    const canvas = this.game.canvas;
    
    const x = Math.random() * (canvas.width - 50) + 25;
    const y = -50;
    
    this.game.enemies.push({
      x: x,
      y: y,
      width: 50,
      height: 50,
      speed: config.enemySpeed,
      health: config.enemyHealth,
      isElite: Math.random() < 0.2
    });
  }

  checkLevelComplete() {
    return this.enemiesSpawned >= this.currentConfig.enemyCount && 
           this.game.enemies.length === 0;
  }

  nextLevel() {
    this.currentLevel++;
    // 检查是否通关所有关卡
    if (this.game.mode === 'novice' && this.currentLevel >= noviceLevels.length) {
      this.game.gameOver = true;
      this.game.showMessage('恭喜通关新手模式所有关卡！', 3000);
      this.game.saveGameProgress();
      setTimeout(() => this.game.endGame(), 3000);
      return;
    }
    if (this.game.mode === 'advanced' && this.currentLevel >= advancedLevels.length) {
      this.game.gameOver = true;
      this.game.showMessage('恭喜通关进阶模式所有关卡！', 3000);
      this.game.saveGameProgress();
      setTimeout(() => this.game.endGame(), 3000);
      return;
    }
    this.startLevel();
  }

  // 从指定关卡加载
  loadLevel(levelIndex) {
    this.currentLevel = levelIndex;
    this.startLevel();
  }

  reset() {
    this.currentLevel = 0;
    clearInterval(this.spawnTimer);
  }
}