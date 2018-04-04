//If you need a mental break, feel free to play with this odd version for a bit.

var game = new Phaser.Game(800, 600, Phaser.CANVAS, 'phaser-example', { preload: preload, create: create, update: update});

function preload(){
    //preload sprites
    game.load.image('player', 'assets/player.png');
    game.load.image('bg', 'assets/bg.png');
    game.load.image('floor', 'assets/floor.png');
    game.load.image('platform', 'assets/platform.png');
    game.load.image('switch', 'assets/switch.png');
    game.load.image('gear', 'assets/gear.png');
    game.load.image('gear2', 'assets/gear2.png');
    game.load.image('platformBody', 'assets/platformPhysics.png');
}

function Player(sprite, startx, starty){
    //player object
    this.startx = startx;
    this.starty = starty;
    this.sprite = game.add.sprite(this.startx, this.starty, sprite);
    game.physics.enable(this.sprite, Phaser.Physics.P2JS);
    this.sprite.body.static = false;
    this.sprite.body.setCollisionGroup(playerCollisionGroup);
    this.sprite.body.collides(platformCollisionGroup);
    this.sprite.body.collides(floorCollisionGroup);
}

Player.prototype.moveRight = function () {
    this.sprite.body.velocity.x = 100
};

Player.prototype.moveLeft = function () {
    this.sprite.body.velocity.x = -100
};

Player.prototype.jump = function() {
    this.sprite.body.velocity.y = -100;
};

function Platform(sprite, startx, starty){
    this.startx = startx;
    this.starty = starty;
    this.sprite = game.add.sprite(this.startx, this.starty, sprite);
    game.physics.p2.enable(this.sprite, true);
    this.sprite.body.clearCollision(true, true);
    this.sprite.body.data.gravityScale = 0;
    this.sprite.body.static = true;
    /*//this.sprite.body.clearShapes();
    //this.sprite.body.addPolygon({}, 0, 0, 0, 50, 200, 50, 200, 0);
    this.sprite.body.setCollisionGroup(platformCollisionGroup);
    this.sprite.body.collides(playerCollisionGroup);**/
}

Platform.prototype.zeroVelocity = function(){
    //stop body from moving
    this.sprite.body.static = true;
    this.sprite.body.velocity.x = 0;
    this.sprite.body.velocity.y = 0;
    this.sprite.body.angularVelocity = 0;
}

function PlatformBody(sprite, startx, starty){
    this.startx = startx;
    this.starty = starty;
    this.sprite = game.add.sprite(this.startx, this.starty, sprite);
    game.physics.p2.enable(this.sprite, true);
    this.sprite.body.data.gravityScale = 0;
    this.sprite.body.static = true;
    this.sprite.body.setCollisionGroup(platformCollisionGroup);
    this.sprite.body.collides(playerCollisionGroup);
}

PlatformBody.prototype.zeroVelocity = function(){
    //stop body from moving
    this.sprite.body.static = true;
    this.sprite.body.velocity.x = 0;
    this.sprite.body.velocity.y = 0;
    this.sprite.body.angularVelocity = 0;
}


function Gear(sprite, startx, starty, angleVel){
    this.startx = startx;
    this.starty = starty;
    this.currentx = this.startx;
    this.currenty = this.starty;
    this.sprite = game.add.sprite(this.startx, this.starty, sprite);
    game.physics.enable(this.sprite, Phaser.Physics.P2JS);
    this.sprite.body.static = true;
    this.sprite.body.data.gravityScale = 0;
    this.sprite.body.clearCollision(true, true);
    this.isUp = false;
    this.isRotating = false;
    this.angleVel = angleVel;
}

Gear.prototype.zeroVelocity = function(){
    //stop body from moving
    this.sprite.body.static = true;
    this.sprite.body.velocity.x = 0;
    this.sprite.body.velocity.y = 0;
    this.sprite.body.angularVelocity = 0;
}

Gear.prototype.rotate = function(platform, platformBody){
    //Rotating platform by rotating gear, to which platform has a gear constraint
    var self = this;
    this.isRotating = true;
    platform.sprite.body.static = false;
    platformBody.sprite.body.static = false;
    this.sprite.body.static = false;
    if(this.isUp){
        this.sprite.body.rotateLeft(this.angleVel);
    }
    else{
        this.sprite.body.rotateRight(this.angleVel);
    } 
    setTimeout(function() {
        console.log("timer over");
        platform.zeroVelocity();
        platformBody.zeroVelocity();
        self.zeroVelocity();
        self.sprite.body.angularVelocity = 0;
        if(self.isUp){
            self.isUp = false;
        }
        else{
            self.isUp = true;
        }
        self.sprite.body.static = true;
        platform.sprite.body.static = true;
        platformBody.sprite.body.static = true;
    self.isRotating = false;
    },3000);
}

function create(){
    //start physics system
    game.physics.startSystem(Phaser.Physics.P2JS);
    game.physics.p2.setImpactEvents(true);
    game.physics.p2.restitution = 0;
    
    playerCollisionGroup = game.physics.p2.createCollisionGroup();
    platformCollisionGroup = game.physics.p2.createCollisionGroup();
    floorCollisionGroup = game.physics.p2.createCollisionGroup();
    
    game.physics.p2.updateBoundsCollisionGroup();
    

    
    //create objects
    var bg = game.add.sprite(0, 0, 'bg');
    var floor = game.add.sprite(0, 562.5, 'floor');
    var floor2 = game.add.sprite(1000, 562.5, 'floor');
    
    game.physics.p2.enable(floor);
    game.physics.p2.enable(floor2);
    floor.body.static = true;
    floor2.body.static = true;
    floor.body.setCollisionGroup(floorCollisionGroup);
    floor2.body.setCollisionGroup(floorCollisionGroup);
    floor.body.collides(playerCollisionGroup);
    floor2.body.collides(playerCollisionGroup);
    
    gear = new Gear('gear2', 601, 522.5, 140000);    

    player = new Player('player', 100, 400);
    platform = new Platform('platform', 500, 525);
    platformBody = new PlatformBody('platformBody', platform.sprite.body.x, platform.sprite.body.y+12.5);

    //gravity
    game.physics.p2.gravity.y = 200;
    
    //create keyboard inputs
    cursors = game.input.keyboard.createCursorKeys();
    action = game.input.keyboard.addKey(Phaser.Keyboard.E);
    
    //revolute constraint
    constraint = game.physics.p2.createLockConstraint(gear.sprite.body, platform.sprite.body, [100, 0], 0);
    constraint2 = game.physics.p2.createLockConstraint(gear.sprite.body, platformBody.sprite.body, [100, -12.5], 0);
}

function update(){
    if(gear.isRotating == false){
        if(cursors.left.isDown){
            player.moveLeft();
        }
        else if(cursors.right.isDown){
            player.moveRight();
        }
        if(cursors.up.isDown){
            player.jump();
        }
        if(action.isDown){
            gear.rotate(platform, platformBody);
        }
    }
    else{
    }
}