var game = new Phaser.Game(800, 600, Phaser.CANVAS, 'phaser-example', {preload: preload , create: create , update: update});
    /*Variable Glossary (for json file):
    key: The name of the sprite being used. This string is also used to determine the gear and body sprites.
    startx: Starting x position of the bridge.  
    starty: Starting y position of the bridge.    -IMPORTANT: Applying physics to the sprite offsets it from the x value by half the sprite width, and from the y value by half the sprite height, so calculate these values accordingly
    upAtStart: Used to determine whether the bridge should be up (highest position) or down (lowest position) at the start of the level.
    maxBound: The largest angle that the bridge can rotate to.
    minBound: The smalles angle that the bridge can rotate to.
    direction: Boolean variable that determines the direction of the rotation; When rotating up, will go clockwise (true) or counterclockwise (false).
    NOTE - Imagine the hands of a clock. If direction is false, consider angle 0 to be pointing to 3 on the face. If direction is true, consider angle 0 to pointing to 9.
    Switch:
        key: The name of the sprite being used.
        startx: Starting x position of the bridge.
        starty: starting y position of the bridge.
    **/

    /* ALGORITHM
    Every bridge is made up of 3 sprites: The art sprite (with the default name), the body sprite (default name + "_body"), and the gear sprite (default name + "_gear")
    -The art sprite should have the top of the floor at the vertical center of the sprite.
    -The body sprite should be the same width as the art sprite. The height can be any value, but for the sake of consistency, it is recommended to make the height the same as the bridge floor. This sprite should be completely transparent.
    -The gear sprite should be twice the width of the art sprite, and the same height. This sprite should be completely transparent.
    
    
    When a platform is spawned, the function will take the name and starting position of the art sprite. The art will be spawned in, and then the function will place the appropriate body and gear sprites at the appropriate positions based on the art sprite used.
    -The player will only collide with the body sprite. The body sprite will be positioned at the floor (which should be vertically centered) of the art sprite.
    -The gear sprite will be placed next to the art sprite. The placement (to the left or right of the art sprite) is determined by the direction of rotation.
    
    Two lock constraints are created: one between the gear and the art, and one between the gear and the body.
    
    A wire fastener is placed by the bridge.
    -This fastener is purely cosmetic, and merely exists to give the appearance of a wire pulling the bridge up.
    -The fastener position currently in the code is just a placeholder. The fastener should be placed in a convincing spot that will not be overlapped by the bridge.
   
    When the rotate function is called, the sprite bodies are made non-static, and the gear rotates.
    -The lock constraints will cause all the sprites to rotate with the gear.
    -IMPORTANT: The gravity scale of each of the bodies is 0, so they don't fall when made non-static. However, the bridges will still be pushed around if the player is in contact with the body, so players should never be able to touch the bridge while it is moving.
    -The placement of the gear and constraints will rotate the bridges at the vertical center, and on the farthest side of the sprite, in order to create a convincing bridge rotation. Ideally, anchors could be used instead of this complicated algorithm, but setting the anchor of the physics body in p2 frustratingly offsets the art from the physics of a sprite.
    
    A timer within the rotate function stops the movement of the sprites after 1 second.
    -The rotation time can be changed
    
    During the update function, the function rotationBounds keeps the rotating platform within the max and min bounds.
    -This rotation algorithm has a tendency to be inconsistent, so this keeps the rotation from overshooting.
    -However, this doesn't prevent undershooting. This merely keeps the bridge rotation from exceeding past the point of no return, where it will never line up with the floor again.
    
    In the update function, the drawWires function is called using the platform array to draw a line between a fastener and its parent platform.
    -This is called throughout the entire update function to make the appearance of the wires more consistent.
    **/

function preload() {
    //preload sprites
    game.load.image('player', 'assets/player.png');
    game.load.image('bg', 'assets/bg.png');
    game.load.image('floor', 'assets/floor.png');
    game.load.image('platform', 'assets/platform.png');
    game.load.image('switch', 'assets/switch.png');
    game.load.image('gear', 'assets/gear.png');
    game.load.image('platform_gear', 'assets/platform_gear.png');
    game.load.image('platform_body', 'assets/platformPhysics.png');
    game.load.image('fastener', 'assets/fastener.png');
    
    //preload platform assets
    game.load.image('bridge_to_town', 'assets/bridge_to_town.png');
    game.load.image('bridge_to_town_body', 'assets/bridge_to_town_body.png');
    game.load.image('bridge_to_town_gear', 'assets/bridge_to_town_gear.png');
    game.load.image('cave_bridge', 'assets/cave_bridge.png');
    game.load.image('cave_bridge_body', 'assets/cave_bridge_body.png');
    game.load.image('cave_bridge_gear', 'assets/cave_bridge_gear.png');
    game.load.image('main_entrance', 'assets/main_entrance.png');
    game.load.image('main_entrance_body', 'assets/main_entrance_body.png');
    game.load.image('main_entrance_gear', 'assets/main_entrance_gear.png');
    
    //preload json files
    game.load.json('platformJson', 'json/bridge.json');
}

function Player(sprite, startx, starty) {
    //player object
    this.startx = startx;
    this.starty = starty;
    this.sprite = game.add.sprite(this.startx, this.starty, sprite);
    game.physics.enable(this.sprite, Phaser.Physics.P2JS);
    this.sprite.body.static = false;
    //set collision group
    this.sprite.body.setCollisionGroup(playerCollisionGroup);
    //set groups that the player collides with
    this.sprite.body.collides(platformCollisionGroup);
    this.sprite.body.collides(floorCollisionGroup);
}
Player.prototype.moveRight = function () {
    this.sprite.body.velocity.x = 100
};
Player.prototype.moveLeft = function () {
    this.sprite.body.velocity.x = -100
};
Player.prototype.jump = function () {
    this.sprite.body.velocity.y = -100;
};

function Platform(sprite, startx, starty, upAtStart, maxBound, minBound, direction) {
    //Spawns in a platform sprite, and creates a gear, body, and constraints based on the sprite's location
    //if upAtStart is true, the bridge should be up when the level starts
    //maxBound and minBound determine the range of rotation by degrees
    //direction determines whether the bridge rotates clockwise (true) or counterclockwise (false)
    this.startx = startx;
    this.starty = starty;
    this.yOffset = 2.5;     //used to position the body at the floor of the sprite
    this.upAtStart = upAtStart;
    this.maxBound = maxBound;
    this.minBound = minBound;
    this.direction = direction;
    this.sprite = game.add.sprite(this.startx, this.starty, sprite);
    //determines the direction of the sprite rotation
    this.isUp = false;
    //if the platform is rotating (used to stop player movement)
    this.isRotating = false;
    //enable physics
    game.physics.p2.enable(this.sprite, false);
    //prevent the sprite from colliding
    this.sprite.body.clearCollision(true, true);
    //keeps the sprite from falling when it's not static
    this.sprite.body.data.gravityScale = 0;
    this.sprite.body.static = true;
    //this if statement determines where the gear is placed relative to the body, considering p2's default offsets. It also determines the angular velocity value
    if(this.direction){
        this.xOffset = this.sprite.width * 1.5;
        this.angleVel = Math.pow(Math.PI, 2); //pi^2: about 90 degrees over 1 second
    }
    else{
        this.xOffset = -(this.sprite.width * 1.5);
        this.angleVel = -Math.pow(Math.PI, 2);
    }
    //spawn in the gear and body, and create constraints to the gear
    this.gear = new Gear(sprite + '_gear', this.startx + this.xOffset, this.starty);
    this.platformBody = new PlatformBody(sprite + '_body', this.startx, this.starty + this.yOffset);
    this.constraint1 = game.physics.p2.createLockConstraint(this.gear.sprite.body, this.sprite.body, [this.xOffset, 0], 0);
    this.constraint2 = game.physics.p2.createLockConstraint(this.gear.sprite.body, this.platformBody.sprite.body, [this.xOffset, - this.yOffset], 0);
    //spawn wire fastener
    if(this.direction){
        this.fastener = new Fastener('fastener', this.startx + (this.sprite.width / 2), this.starty - 150, 1);
    }
    else{
        this.fastener = new Fastener('fastener', this.startx - (this.sprite.width / 2), this.starty - 150, -1);
    }
}
Platform.prototype.zeroVelocity = function () {
    //stop all bridge-related sprites from moving (if this function is not called, the sprites will continue to move, which is amusing, but not desirable)
    //art sprite
    this.sprite.body.static = true;
    this.sprite.body.velocity.x = 0;
    this.sprite.body.velocity.y = 0;
    this.sprite.body.angularVelocity = 0;
    
    //gear sprite
    this.gear.sprite.body.static = true;
    this.gear.sprite.body.velocity.x = 0;
    this.gear.sprite.body.velocity.y = 0;
    this.gear.sprite.body.angularVelocity = 0;
    
    //body sprite
    this.platformBody.sprite.body.static = true;
    this.platformBody.sprite.body.velocity.x = 0;
    this.platformBody.sprite.body.velocity.y = 0;
    this.platformBody.sprite.body.angularVelocity = 0;
}
Platform.prototype.rotate = function () {
    //Rotating platform by rotating gear, to which platform has a gear constraint
    var self = this;
    //the platform is now rotating
    this.isRotating = true;
    //make the bodies non-static, so they can move
    this.sprite.body.static = false;
    this.platformBody.sprite.body.static = false;
    this.gear.sprite.body.static = false;
    //determines which direction the sprite rotates
    if (this.isUp) {
        this.gear.sprite.body.angularVelocity = -this.angleVel;
    }
    else {
        this.gear.sprite.body.angularVelocity = this.angleVel;
    }
    //this timer stops the rotation when it's over
    setTimeout(function () {
        //stop the movement of all the platform parts (otherwise they'll just fly away)
        self.zeroVelocity();
        //set the isUp property for the next rotation
        if (self.isUp) {
            self.isUp = false;
        }
        else {
            self.isUp = true;
        }
        //make the bodies static
        self.sprite.body.static = true;
        self.platformBody.sprite.body.static = true;
        self.gear.sprite.body.static = true;
        //the platform is no longer rotating
        self.isRotating = false;
    }, 1100);
}
Platform.prototype.createSwitch = function(sprite, startx, starty){
    //create a switch that activates the bridge
    this.switch = new Switch(sprite, startx, starty);
}
Platform.prototype.rotationBounds = function(){
    //run when platform is rotating to keep platform within certain boundaries
    //needs to be run in the update function in order to continously check the angle of the bridges
    if(this.gear.sprite.body.angle > this.maxBound){
        this.gear.sprite.body.angle = this.maxBound;
        this.zeroVelocity();
    }
    if(this.gear.sprite.body.angle < this.minBound){
        this.gear.sprite.body.angle = this.minBound;
        this.zeroVelocity();
    }
}

function PlatformBody(sprite, startx, starty) {
    //creates a body on the bridge for the player to walk on 
    this.startx = startx;
    this.starty = starty;
    this.sprite = game.add.sprite(this.startx, this.starty, sprite);
    game.physics.p2.enable(this.sprite, false);
    this.sprite.body.data.gravityScale = 0;
    this.sprite.body.static = true;
    //set collision groups
    this.sprite.body.setCollisionGroup(platformCollisionGroup);
    //set groups that the body collides with
    this.sprite.body.collides(playerCollisionGroup);
}

function Gear(sprite, startx, starty) {
    //creates a gear that will rotate, thus rotating the bridge
    this.startx = startx;
    this.starty = starty;
    this.sprite = game.add.sprite(this.startx, this.starty, sprite);
    game.physics.p2.enable(this.sprite, false);
    this.sprite.body.static = true;
    this.sprite.body.data.gravityScale = 0;
    //gear should not collide with anything
    this.sprite.body.clearCollision(true, true);
}

function Fastener(sprite, startx, starty, scale) {
    //creates a wire fastener
    this.startx = startx;
    this.starty = starty;
    this.sprite = game.add.sprite(this.startx, this.starty, sprite);
    this.sprite.scale.x = scale;
}

function Switch(sprite, startx, starty) {
    this.startx = startx;
    this.starty = starty;
    this.sprite = game.add.sprite(this.startx, this.starty, sprite);
}

function create() {
    //start physics system
    game.physics.startSystem(Phaser.Physics.P2JS);
    game.physics.p2.setImpactEvents(true);
    game.physics.p2.restitution = 0;
    
    //create collision groups
    playerCollisionGroup = game.physics.p2.createCollisionGroup();
    platformCollisionGroup = game.physics.p2.createCollisionGroup();
    floorCollisionGroup = game.physics.p2.createCollisionGroup();
    
    //create game objects
    var bg = game.add.sprite(0, 0, 'bg');
    var floor = game.add.sprite(0, 562.5, 'floor');
    var floor2 = game.add.sprite(1000, 562.5, 'floor');
    var floor3 = game.add.sprite(900, 200, 'floor');
    game.physics.p2.enable(floor);
    game.physics.p2.enable(floor2);
    game.physics.p2.enable(floor3);
    floor.body.static = true;
    floor2.body.static = true;
    floor3.body.static = true;
    floor.body.setCollisionGroup(floorCollisionGroup);
    floor2.body.setCollisionGroup(floorCollisionGroup);
    floor3.body.setCollisionGroup(floorCollisionGroup);
    floor.body.collides(playerCollisionGroup);
    floor2.body.collides(playerCollisionGroup);
    floor3.body.collides(playerCollisionGroup);
    player = new Player('player', 0, 400);
    
    //create arrays for platforms and switches
    platforms = [];
    switches = [];
    
    //get json data
    var platformData = game.cache.getJSON('platformJson');
    
    //use json data to create platforms & switches
    importPlatforms(platformData, platforms, switches);

    //if any platforms should be up at the start of the level, this function will rotate them to that position
    this.activeSwitch = -1;     //define active switches so the platforms[activeSwitch] reference in the update function is defined
    checkIsUp(platforms);
    
    //gravity
    game.physics.p2.gravity.y = 200;
    
    //create keyboard inputs
    cursors = game.input.keyboard.createCursorKeys();
    action = game.input.keyboard.addKey(Phaser.Keyboard.E);
    action1 = game.input.keyboard.addKey(Phaser.Keyboard.ONE);
    action2 = game.input.keyboard.addKey(Phaser.Keyboard.TWO);
    action3 = game.input.keyboard.addKey(Phaser.Keyboard.THREE);
    
    //draw wires
    var graphics = game.add.graphics(100, 100);
    drawWires(platforms, graphics);
}

function update() {
    drawWires(platforms, graphics);
    if (!checkRotating(platforms)) {
        if (cursors.left.isDown) {
            player.moveLeft();
        }
        else if (cursors.right.isDown) {
            player.moveRight();
        }
        if (cursors.up.isDown) {
            player.jump();
        }
        if (action.isDown) {
            this.activeSwitch = checkOverlap(switches);
            if (this.activeSwitch != -1) {
                
                platforms[this.activeSwitch].rotate();
            }
        }
    }
    else {
        //disable player movement when bridges are rotating
        if(this.activeSwitch != -1){
            //keep the rotating bridge within its boundaries
            platforms[this.activeSwitch].rotationBounds();
        }
        else{   //platforms rotate to their starting positions at the beginning of the level, but no switch has been pressed at that point
            for(var x = 0; x < platforms.length; x++){
                platforms[x].rotationBounds();
            }
        }
        
    }
}
checkRotating = function (platformArray) {
    //check if any platform is rotating
    for (var x = 0; x < platformArray.length; x++) {
        if (platformArray[x].isRotating == true) {
            return true;
        }
    }
    return false;
}
checkRotation = function (platformArray) {
    //return which platform is rotating
    for (var x = 0; x < platformArray.length; x++) {
        if (platformArray[x].isRotating == true) {
            return platformArray[x];
        }
    }
}
checkOverlap = function (switchArray) {
    //return which switch the player is overlapping
    for (var x = 0; x < switchArray.length; x++) {
        if (Phaser.Rectangle.intersects(player.sprite.getBounds(), switches[x].sprite.getBounds())) {
            return x;
        }
    }
    return -1;
}
checkIsUp = function (platformArray) {
    //run this at the beginning of the level
    //rotates bridges to their starting positions
    console.log(platformArray);
    for (var x = 0; x < platformArray.length; x++) {
        //If the bridge should be up at the start of the level, we want this code to run unconditionally (since all bridges start at angle 0). However, if the bridge is not supposed to be up at the start, and is not at either its highest or lowest position, then it should be rotated.
        if(platformArray[x].upAtStart || (platformArray[x].gear.sprite.body.angle != platformArray[x].minBound && platformArray[x].gear.sprite.body.angle != platformArray[x].maxBound)){
            if(!platformArray[x].upAtStart){
                platformArray[x].isUp = true;   //If the bridge doesn't start at its highest position, then it must start at its lowest position; this will make it rotate to its lowest angle at the start
            }
            platformArray[x].rotate();
        }
    }
}
importPlatforms = function (platform, platformArray, switchArray) {
    //import platform data from json file
    for (var x = 0; x < platform.bridges.length; x++) {
        platformArray.push(new Platform(platform.bridges[x].key,
                                        platform.bridges[x].startx,
                                        platform.bridges[x].starty,
                                        platform.bridges[x].upAtStart,
                                        platform.bridges[x].maxBound, 
                                        platform.bridges[x].minBound, 
                                        platform.bridges[x].direction
                            ));
        
        //create a switch as a child of the platform
        platformArray[x].createSwitch(platform.bridges[x].switch.key,
                                      platform.bridges[x].switch.startx,
                                      platform.bridges[x].switch.starty);
        //add switch to an external array
        switchArray.push(platformArray[x].switch);
    }
}

drawWires = function(platformArray, graphics){
    //draw connecting wires from fasteners to bridges
    graphics.clear();   //remove current wire drawings so that they can be redrawn
    for(var x = 0; x < platformArray.length; x++){
        //determine x and y endpoints of wire
        if(platformArray[x].direction){
            this.xCenter = platformArray[x].gear.sprite.body.x - 100;  //this calculation places the wire at the x coordinate of the gear (phaser physics creates offsets)
            this.xVal = Math.cos((platformArray[x].gear.sprite.body.angle * Math.PI) / 180) * platformArray[x].platformBody.sprite.width;   //x position of the wire endpoint relative to the center point
            this.xEnd = this.xCenter-(this.xVal*2);

            this.yCenter = platformArray[x].gear.sprite.body.y - 100;  //halfway down the sprite
            this.yVal = Math.sin((platformArray[x].gear.sprite.body.angle * Math.PI) / 180) * platformArray[x].platformBody.sprite.width;   //y position of the wire endpoint relative to the center point
            this.yEnd = this.yCenter-(this.yVal*2);
        }
        else{
            this.xCenter = platformArray[x].platformBody.sprite.body.x - 100;  //this calculation places the wire at the x coordinate of the gear (phaser physics creates offsets)
            this.xVal = Math.cos((platformArray[x].gear.sprite.body.angle * Math.PI) / 180) * platformArray[x].platformBody.sprite.width;   //x position of the wire endpoint relative to the center point
            this.xEnd = this.xCenter+(this.xVal/2);

            this.yCenter = platformArray[x].gear.sprite.body.y - 100;  //halfway down the sprite
            this.yVal = Math.sin((platformArray[x].gear.sprite.body.angle * Math.PI) / 180) * platformArray[x].platformBody.sprite.width;   //y position of the wire endpoint relative to the center point
            this.yEnd = this.yCenter+(this.yVal*2);
        }
        
        //draw the wire
        graphics.beginFill(0x000000);
        graphics.lineStyle(1, 0x000000, 1);
        
        //subtract 100 from x and y to position the start of the line at the top of the fastener sprite
        graphics.moveTo(platformArray[x].fastener.sprite.x-100, platformArray[x].fastener.sprite.y-94);
        graphics.lineTo(this.xEnd, this.yEnd);
        window.graphics = graphics;
    }
}