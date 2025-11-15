class PixelShooter {
  constructor() {
    // DOM元素
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.scoreElement = document.getElementById('score');
    this.livesElement = document.getElementById('lives');
    this.finalScoreElement = document.getElementById('finalScore');
    this.finalLevelElement = document.getElementById('finalLevel');
    this.startMenu = document.getElementById('startMenu');
    this.endMenu = document.getElementById('endMenu');
    this.backToMenuBtn = document.getElementById('backToMenuBtn');
    this.inGameBackBtn = document.getElementById('inGameBackBtn');
    this.confirmDialog = document.getElementById('confirmDialog');
    this.confirmYes = document.getElementById('confirmYes');
    this.confirmNo = document.getElementById('confirmNo');
    this.bulletTrails = document.getElementById('bulletTrails');
    this.aboutBtn = document.getElementById('aboutBtn'); // 关于按钮
    this.aboutDialog = document.getElementById('aboutDialog'); // 关于弹窗
    this.closeAbout = document.getElementById('closeAbout'); // 关闭关于弹窗
    
    // 画布尺寸
    this.canvas.width = 800;
    this.canvas.height = 600;
    
    // 游戏状态
    this.gameStarted = false;
    this.gameOver = false;
    this.mode = 'novice';
    this.score = 0;
    this.lives = 10;
    this.message = '';
    this.messageTimer = null;
    this.assetsLoaded = false;
    this.assetsLoadErrors = [];
    this.loadedProgress = null;
    
    // 音乐处理
    this.bgm = new Audio();
    this.bgmVolume = 0.5;
    this.bgmLoaded = false;
    this.musicPaths = [
      'assets/audio/bgm.mp3',
      'audio/bgm.mp3',
      'bgm.mp3'
    ];
    
    // 图片资源
    this.images = {
      player: new Image(),
      enemy: new Image(),
      menuBg: new Image(),
      gameBg: new Image()
    };
    this.loadAssets();
    
    // 玩家属性（仅新手模式）
    this.player = {
      x: this.canvas.width / 2 - 25,
      y: this.canvas.height - 70,
      width: 50,
      height: 50,
      speed: 8,
      invulnerable: false,
      invulnerableTimer: 0
    };
    
    // 游戏对象
    this.bullets = [];
    this.enemies = [];
    this.explosions = [];
    this.particles = [];
    this.advancedBullets = []; // 进阶模式子弹
    
    // 鼠标状态（进阶模式）
    this.mouse = {
      x: this.canvas.width / 2,
      y: this.canvas.height / 2,
      down: false
    };
    
    // 按键状态
    this.keys = {
      left: false,
      right: false,
      space: false
    };
    
    // 关卡管理器
    this.levelManager = new LevelManager(this);
    
    // 绑定事件
    this.bindEvents();
  }

  loadAssets() {
    const imagePaths = {
      player: 'assets/player.png',
      enemy: 'assets/enemy.png',
      menuBg: 'assets/menu-bg.jpg',
      gameBg: 'assets/game-bg.jpg'
    };
    
    let loadedImages = 0;
    const totalImages = Object.keys(imagePaths).length;
    
    for (const [key, path] of Object.entries(imagePaths)) {
      this.images[key].src = path;
      
      this.images[key].onload = () => {
        loadedImages++;
        if (loadedImages === totalImages) {
          this.assetsLoaded = true;
        }
      };
      
      this.images[key].onerror = () => {
        this.assetsLoadErrors.push(`${key}图片: ${path}`);
        loadedImages++;
        if (loadedImages === totalImages) {
          this.assetsLoaded = true;
          console.error('资源加载失败:', this.assetsLoadErrors);
          this.showMessage(`资源缺失: ${this.assetsLoadErrors.length}项`);
        }
      };
    }
    
    this.tryLoadMusic(0);
  }

  tryLoadMusic(pathIndex) {
    if (pathIndex >= this.musicPaths.length) {
      this.bgmLoaded = false;
      this.assetsLoadErrors.push(`音乐文件: 所有路径均失败`);
      console.error('音乐加载失败:', this.musicPaths);
      return;
    }
    
    this.bgm.src = this.musicPaths[pathIndex];
    this.bgm.loop = true;
    this.bgm.volume = this.bgmVolume;
    
    this.bgm.oncanplaythrough = () => {
      this.bgmLoaded = true;
      console.log(`音乐加载成功: ${this.musicPaths[pathIndex]}`);
    };
    
    this.bgm.onerror = () => {
      this.tryLoadMusic(pathIndex + 1);
    };
  }

  bindEvents() {
    // 键盘控制
    window.addEventListener('keydown', (e) => {
      // Esc键返回菜单
      if (e.key === 'Escape' && this.gameStarted && !this.gameOver) {
        this.showConfirmDialog();
        return;
      }
      
      if (this.mode === 'novice') {
        if (e.key === 'ArrowLeft') this.keys.left = true;
        if (e.key === 'ArrowRight') this.keys.right = true;
        if (e.key === ' ' && this.gameStarted && !this.gameOver) {
          this.keys.space = true;
          this.shoot();
        }
      }
      if (e.key.toLowerCase() === 'm') {
        this.toggleMusic();
      }
    });
    
    window.addEventListener('keyup', (e) => {
      if (this.mode === 'novice') {
        if (e.key === 'ArrowLeft') this.keys.left = false;
        if (e.key === 'ArrowRight') this.keys.right = false;
        if (e.key === ' ') this.keys.space = false;
      }
    });
    
    // 鼠标移动跟踪（进阶模式）
    window.addEventListener('mousemove', (e) => {
      if (this.mode === 'advanced' && this.gameStarted && !this.gameOver) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = e.clientX - rect.left;
        this.mouse.y = e.clientY - rect.top;
      }
    });
    
    // 进阶模式：鼠标点击射击
    window.addEventListener('mousedown', (e) => {
      if (this.mode === 'advanced' && e.button === 0 && this.gameStarted && !this.gameOver) {
        this.shootAdvanced(e);
      }
    });
    
    // 模式选择按钮
    document.getElementById('noviceBtn').addEventListener('click', () => {
      this.mode = 'novice';
      this.startMenu.style.display = 'none';
      this.loadedProgress = this.loadGameProgress();
      this.startGame(!!this.loadedProgress);
    });
    
    document.getElementById('advancedBtn').addEventListener('click', () => {
      this.mode = 'advanced';
      this.startMenu.style.display = 'none';
      this.loadedProgress = this.loadGameProgress();
      this.startGame(!!this.loadedProgress);
    });
    
    // 再来一局按钮
    document.getElementById('restartBtn').addEventListener('click', () => {
      this.clearGameProgress();
      this.endMenu.style.display = 'none';
      this.startGame();
    });
    
    // 返回主菜单按钮
    this.backToMenuBtn.addEventListener('click', () => {
      this.endMenu.style.display = 'none';
      this.startMenu.style.display = 'flex';
      this.gameStarted = false;
      this.gameOver = false;
      this.pauseMusic();
    });
    
    // 游戏中返回菜单按钮
    this.inGameBackBtn.addEventListener('click', () => {
      if (this.gameStarted && !this.gameOver) {
        this.showConfirmDialog();
      }
    });
    
    // 确认退出-是
    this.confirmYes.addEventListener('click', () => {
      this.confirmDialog.style.display = 'none';
      this.saveGameProgress();
      this.startMenu.style.display = 'flex';
      this.gameStarted = false;
      this.pauseMusic();
    });
    
    // 确认退出-否
    this.confirmNo.addEventListener('click', () => {
      this.confirmDialog.style.display = 'none';
    });

    // 关于按钮事件
    this.aboutBtn.addEventListener('click', () => {
      this.aboutDialog.style.display = 'block';
    });

    // 关闭关于弹窗
    this.closeAbout.addEventListener('click', () => {
      this.aboutDialog.style.display = 'none';
    });
    
    // 点击画布触发音乐播放
    this.canvas.addEventListener('click', () => {
      if (this.bgmLoaded && this.bgm.paused && this.gameStarted) {
        this.playMusic();
      }
    });
  }

  // 显示退出确认弹窗
  showConfirmDialog() {
    this.confirmDialog.style.display = 'block';
  }

  // 保存游戏进度为CSV格式到本地存储
  saveGameProgress() {
    if (!this.gameOver && this.gameStarted) {
      const progressCSV = [
        this.mode,
        this.levelManager.currentLevel,
        this.levelManager.currentConfig.level,
        this.score,
        this.lives,
        new Date().getTime()
      ].join(',');
      
      localStorage.setItem(`pixelShooter_${this.mode}_progress`, progressCSV);
      console.log(`游戏进度已保存 (${this.mode}):`, progressCSV);
      this.showMessage('游戏进度已保存', 1500);
    }
  }

  // 从本地存储加载CSV格式的存档
  loadGameProgress() {
    const progressCSV = localStorage.getItem(`pixelShooter_${this.mode}_progress`);
    if (progressCSV) {
      try {
        const [mode, levelIndex, level, score, lives, timestamp] = progressCSV.split(',');
        if (mode === this.mode) {
          return {
            mode,
            levelIndex: parseInt(levelIndex),
            level: parseInt(level),
            score: parseInt(score),
            lives: parseInt(lives),
            timestamp: parseInt(timestamp)
          };
        }
      } catch (e) {
        console.error('加载存档失败:', e);
        localStorage.removeItem(`pixelShooter_${this.mode}_progress`);
      }
    }
    return null;
  }

  // 清除当前模式的存档
  clearGameProgress() {
    localStorage.removeItem(`pixelShooter_${this.mode}_progress`);
    this.loadedProgress = null;
  }

  switchMode(mode) {
    this.mode = mode;
  }

  playMusic() {
    if (!this.bgmLoaded) {
      this.showMessage('音乐文件未找到');
      return;
    }

    this.bgm.play().then(() => {
      this.showMessage('音乐开启');
    }).catch(() => {
      this.showMessage('点击游戏区域后重试');
    });
  }

  pauseMusic() {
    if (this.bgmLoaded) {
      this.bgm.pause();
      this.showMessage('音乐关闭');
    }
  }

  toggleMusic() {
    if (!this.bgmLoaded) {
      this.showMessage('音乐文件缺失');
      return;
    }
    this.bgm.paused ? this.playMusic() : this.pauseMusic();
  }

  // 开始游戏（支持从存档继续）
  startGame(continueFromSave = false) {
    this.gameStarted = true;
    this.gameOver = false;
    this.bullets = [];
    this.advancedBullets = [];
    this.enemies = [];
    this.explosions = [];
    this.particles = [];
    
    // 清空子弹轨迹
    this.bulletTrails.innerHTML = '';
    
    if (continueFromSave && this.loadedProgress) {
      this.score = this.loadedProgress.score;
      this.lives = this.loadedProgress.lives;
      this.levelManager.loadLevel(this.loadedProgress.levelIndex);
      this.showMessage(`已加载存档：关卡 ${this.loadedProgress.level}`, 2000);
    } else {
      this.score = 0;
      this.lives = 10;
      this.levelManager.reset();
      this.levelManager.startLevel();
    }
    
    this.updateScore();
    this.updateLives();
    
    this.playMusic();
    this.gameLoop();
  }

  // 新手模式射击
  shoot() {
    if (this.mode === 'novice') {
      if (this.bullets.length < 5) {
        this.bullets.push({
          x: this.player.x + this.player.width / 2 - 2,
          y: this.player.y,
          width: 4,
          height: 15,
          speed: 12,
          color: '#fff'
        });
      }
    }
  }

  // 进阶模式：鼠标点击射击
  shootAdvanced(e) {
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // 创建子弹
    this.advancedBullets.push({
      x: mouseX,
      y: mouseY,
      speed: 25,
      distance: 0,
      maxDistance: 1000
    });
    
    // 创建子弹轨迹视觉效果
    this.createBulletTrail(e.clientX, e.clientY);
  }

  // 创建子弹轨迹视觉效果
  createBulletTrail(x, y) {
    const trail = document.createElement('div');
    trail.className = 'bullet-trail';
    
    // 从屏幕底部中心到鼠标位置的轨迹
    const centerY = window.innerHeight / 2;
    const centerX = window.innerWidth / 2;
    const angle = Math.atan2(y - centerY, x - centerX) * 180 / Math.PI;
    const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
    
    trail.style.height = `${distance}px`;
    trail.style.left = `${centerX}px`;
    trail.style.top = `${centerY}px`;
    trail.style.transform = `rotate(${angle}deg)`;
    
    this.bulletTrails.appendChild(trail);
    
    // 轨迹淡出动画
    setTimeout(() => {
      trail.style.transition = 'opacity 0.3s';
      trail.style.opacity = '0';
      setTimeout(() => trail.remove(), 300);
    }, 50);
  }

  updateScore() {
    this.scoreElement.textContent = this.score;
    this.finalScoreElement.textContent = this.score;
    
    const currentLevel = this.levelManager.currentConfig;
    if (this.score > 0 && this.score % currentLevel.bonusLife === 0) {
      this.lives++;
      this.updateLives();
      this.showMessage('获得额外生命！');
    }
  }

  updateLives() {
    this.livesElement.textContent = this.lives;
  }

  showMessage(text, duration = 2000) {
    this.message = text;
    clearTimeout(this.messageTimer);
    this.messageTimer = setTimeout(() => this.message = '', duration);
  }

  checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
  }

  endGame() {
    this.gameOver = true;
    this.gameStarted = false;
    this.finalLevelElement.textContent = this.levelManager.currentConfig.level;
    this.endMenu.style.display = 'flex';
    this.pauseMusic();
    this.saveGameProgress();
  }

  update() {
    if (this.gameOver) return;

    // 新手模式玩家移动
    if (this.mode === 'novice') {
      if (this.keys.left && this.player.x > 0) {
        this.player.x -= this.player.speed;
      }
      if (this.keys.right && this.player.x + this.player.width < this.canvas.width) {
        this.player.x += this.player.speed;
      }

      if (this.player.invulnerable) {
        this.player.invulnerableTimer--;
        if (this.player.invulnerableTimer <= 0) {
          this.player.invulnerable = false;
        }
      }
    }

    // 新手模式子弹更新
    if (this.mode === 'novice') {
      this.bullets.forEach(bullet => {
        bullet.y -= bullet.speed;
      });
      this.bullets = this.bullets.filter(bullet => bullet.y > 0);
    }

    // 进阶模式子弹更新与碰撞检测
    if (this.mode === 'advanced') {
      this.advancedBullets.forEach(bullet => {
        // 子弹向上移动
        bullet.y -= bullet.speed;
        bullet.distance += bullet.speed;
        
        // 检测子弹是否击中敌人
        this.enemies.forEach(enemy => {
          if (this.checkCollision({
            x: bullet.x - 5, 
            y: bullet.y - 5, 
            width: 10, 
            height: 10
          }, enemy)) {
            enemy.health--;
            
            // 移除子弹
            this.advancedBullets = this.advancedBullets.filter(b => b !== bullet);
            
            // 敌人生命值耗尽
            if (enemy.health <= 0) {
              this.enemies = this.enemies.filter(e => e !== enemy);
              this.score += enemy.isElite ? 300 : 100;
              this.updateScore();
              this.explosions.push({
                x: enemy.x,
                y: enemy.y,
                size: enemy.isElite ? 70 : 50,
                alpha: 1
              });
            }
          }
        });
      });
      
      // 移除超出范围的子弹
      this.advancedBullets = this.advancedBullets.filter(
        bullet => bullet.distance < bullet.maxDistance && bullet.y > -100
      );
    }

    // 更新敌人
    this.enemies.forEach(enemy => {
      enemy.y += enemy.speed;
      
      // 敌人逃脱
      if (enemy.y > this.canvas.height) {
        this.enemies = this.enemies.filter(e => e !== enemy);
        this.lives--;
        this.updateLives();
        this.showMessage('敌人逃脱了！');
        
        if (this.lives <= 0) {
          this.gameOver = true;
          setTimeout(() => this.endGame(), 1000);
        }
      }
    });

    // 新手模式子弹击中检测
    if (this.mode === 'novice') {
      this.bullets.forEach(bullet => {
        this.enemies.forEach(enemy => {
          if (this.checkCollision(bullet, enemy)) {
            enemy.health--;
            this.bullets = this.bullets.filter(b => b !== bullet);
            
            if (enemy.health <= 0) {
              this.enemies = this.enemies.filter(e => e !== enemy);
              this.score += enemy.isElite ? 300 : 100;
              this.updateScore();
              this.explosions.push({
                x: enemy.x,
                y: enemy.y,
                size: enemy.isElite ? 70 : 50,
                alpha: 1
              });
            }
          }
        });
      });

      // 新手模式：敌人碰撞玩家
      this.enemies.forEach(enemy => {
        if (!this.player.invulnerable && this.checkCollision(this.player, enemy)) {
          this.enemies = this.enemies.filter(e => e !== enemy);
          this.lives--;
          this.updateLives();
          this.player.invulnerable = true;
          this.player.invulnerableTimer = 60;
          this.showMessage('被击中了！');
          
          if (this.lives <= 0) {
            this.gameOver = true;
            setTimeout(() => this.endGame(), 1000);
          }
        }
      });
    }

    // 更新爆炸效果
    this.explosions = this.explosions.filter(explosion => {
      explosion.alpha -= 0.05;
      return explosion.alpha > 0;
    });

    // 检查关卡完成
    if (this.levelManager.checkLevelComplete()) {
      this.saveGameProgress();
      this.levelManager.nextLevel();
    }
  }

  render() {
    // 绘制游戏背景
    if (this.images.gameBg && this.assetsLoaded) {
      this.ctx.drawImage(this.images.gameBg, 0, 0, this.canvas.width, this.canvas.height);
    } else {
      this.ctx.fillStyle = '#0f3460';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // 绘制玩家（仅新手模式）
    if (this.mode === 'novice') {
      this.ctx.save();
      if (this.player.invulnerable) {
        this.ctx.globalAlpha = Math.sin(Date.now() / 50) > 0 ? 0.5 : 1;
      }
      
      if (this.images.player && this.assetsLoaded) {
        this.ctx.drawImage(this.images.player, this.player.x, this.player.y, this.player.width, this.player.height);
      } else {
        this.ctx.fillStyle = '#4CAF50';
        this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
      }
      this.ctx.restore();
    }

    // 绘制新手模式子弹
    if (this.mode === 'novice') {
      this.bullets.forEach(bullet => {
        this.ctx.fillStyle = bullet.color;
        this.ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
      });
    }

    // 绘制进阶模式子弹
    if (this.mode === 'advanced') {
      this.advancedBullets.forEach(bullet => {
        this.ctx.fillStyle = '#ffcc00';
        this.ctx.beginPath();
        this.ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
        this.ctx.fill();
      });
    }

    // 绘制敌人
    this.enemies.forEach(enemy => {
      this.ctx.save();
      if (this.images.enemy && this.assetsLoaded) {
        if (enemy.isElite) {
          this.ctx.strokeStyle = '#ff3333';
          this.ctx.lineWidth = 2;
          this.ctx.strokeRect(enemy.x - 2, enemy.y - 2, enemy.width + 4, enemy.height + 4);
        }
        this.ctx.drawImage(this.images.enemy, enemy.x, enemy.y, enemy.width, enemy.height);
      } else {
        this.ctx.fillStyle = enemy.isElite ? '#ff3333' : '#ff9800';
        this.ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
      }
      
      // 进阶模式显示敌人生命值
      if (this.mode === 'advanced' && enemy.health > 1) {
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '12px Arial';
        this.ctx.fillText(`HP: ${enemy.health}`, enemy.x, enemy.y - 5);
      }
      this.ctx.restore();
    });

    // 绘制爆炸效果
    this.explosions.forEach(explosion => {
      this.ctx.save();
      this.ctx.globalAlpha = explosion.alpha;
      const gradient = this.ctx.createRadialGradient(
        explosion.x + 25, explosion.y + 25, 0,
        explosion.x + 25, explosion.y + 25, explosion.size
      );
      gradient.addColorStop(0, 'rgba(255, 200, 0, 0.8)');
      gradient.addColorStop(0.5, 'rgba(255, 100, 0, 0.6)');
      gradient.addColorStop(1, 'rgba(150, 0, 0, 0)');
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(explosion.x + 25, explosion.y + 25, explosion.size * (1 - explosion.alpha), 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });

    // 绘制消息
    if (this.message) {
      this.ctx.fillStyle = '#4CAF50';
      this.ctx.font = '24px Microsoft YaHei';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(this.message, this.canvas.width / 2, this.canvas.height / 2);
    }
  }

  gameLoop() {
    this.update();
    this.render();
    if (this.gameStarted && !this.gameOver) {
      requestAnimationFrame(() => this.gameLoop());
    }
  }
}

window.onload = () => {
  new PixelShooter();
};