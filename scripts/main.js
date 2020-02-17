/*

TODO:
- breeding
- little icons above bunbons when talking and sleeping
- bunbon thoughts? maybe instead of the little meter thing
- save progress to localhost
- longer egg hatching time
- longer childhood
- confirm before blasting off
- import/export bunbons (as a binary-encoded string)

*/

let DEBUG = true

let FRAME_RATE = 30

let CANVAS_SCALE = 2

let SPACE_WIDTH = 640
let SPACE_HEIGHT = 480

let WORLD_WIDTH = 320
let WORLD_HEIGHT = 200
let WORLD_DIST = Math.sqrt(WORLD_WIDTH * WORLD_WIDTH + WORLD_HEIGHT * WORLD_HEIGHT)

let SCREEN_WIDTH = 320
let SCREEN_HEIGHT = 240

let inventory = {
    x: 40,
    y: WORLD_HEIGHT + 4,
    slotCount: 6,
    slotWidth: 40,
    width: 40 * 6,
    height: 32
}

let spaceButton = {
    x: 4,
    y: WORLD_HEIGHT + 4,
    width: 32,
    height: 32
}

let blastOffButton = {
    x: WORLD_WIDTH - 36,
    y: WORLD_HEIGHT + 4,
    width: 32,
    height: 32
}

let lastX = 0
let lastY = 0
let startX = 0
let startY = 0
let mouseVelocity = 0
let isDragging = false

// p5.disableFriendlyErrors = true
let Vector = p5.Vector

let spritesheet, spritesheetImg
let colorSpritesheets = {}

let basePalette = [
    [104, 43, 130],
    [191, 63, 179],
    [255, 128, 170]
]

let spritesheetColors = {
    'pink': [
        [104, 43, 130],
        [191, 63, 179],
        [255, 128, 170]
    ],
    'yellow': [
        [196, 77, 41],
        [255, 191, 54],
        [255, 242, 117]
    ],
    'green': [
        [57, 133, 90],
        [131, 224, 76],
        [220, 255, 112]
    ]
}

let gameObjects = []
let inventoryObjects = Array(inventory.slotCount)
let blastedOffBunbons = []
let selectedBunbon = null
let selectedObject = null

let spaceScreen = new Space()
let planets = Array(16).fill(0).map((x, i) => (new Planet(i)))

let planetBGs = []
let planetMasks = []
let planetBG = null
let planetMask = null

let currentScreen = spaceScreen

let myFont

function openScreen(type, index, arg) {
    currentScreen.close()
    if (type === 'space') {
        currentScreen = spaceScreen
    }
    else if (type === 'planet') {
        currentScreen = planets[index]
    }
    currentScreen.open(index, arg)
}

function isPointPassable(x, y) {
    x = floor(x)
    y = floor(y)

    // out of bounds
    if (x < 0 || x >= WORLD_WIDTH) return false
    if (y < 0 || y >= WORLD_HEIGHT) return false

    // masked area
    let pixel = planetMask.get(x, y)
    if (pixel[0] >= 128) return false

    return true
}

function randomPoint() {
    let pos = null
    while (!pos) {
        let x = floor(random(0, WORLD_WIDTH))
        let y = floor(random(0, WORLD_HEIGHT))
        if (isPointPassable(x, y)) {
            pos = createVector(x, y)
        }
    }
    return pos
}

function isInInventory(x, y) {
    return (
        x >= inventory.x && x < inventory.x + inventory.width &&
        y >= inventory.y && y < inventory.y + inventory.height
    )
}

function getInventorySlot(x) {
    return min(max(floor((x - inventory.x) / inventory.slotWidth), 0), inventory.slotCount - 1)
}

function inventorySlotX(slot) {
    return inventory.x + (slot * inventory.slotWidth) + floor(inventory.slotWidth / 2)
}

function inventorySlotY() {
    return inventory.y + floor(inventory.height / 2) 
}

function boundPosition(obj) {
    if (obj.pos.x < 0) obj.pos.x = 0
    if (obj.pos.x > WORLD_WIDTH) obj.pos.x = WORLD_WIDTH
    if (obj.pos.y < 0) obj.pos.y = 0
    if (obj.pos.y > WORLD_HEIGHT) obj.pos.y = WORLD_HEIGHT
}

function recolor(baseImage, oldPalette, newPalette) {
    let img = baseImage.get()
    img.loadPixels()
    let pixelCount = 4 * img.width * img.height
    for (let i = 0; i < pixelCount; i += 4) {
        oldPalette.forEach((oldColor, j) => {
            rDiff = abs(oldColor[0] - img.pixels[i])
            gDiff = abs(oldColor[1] - img.pixels[i + 1])
            bDiff = abs(oldColor[2] - img.pixels[i + 2])
            if (rDiff < 25 && gDiff < 25 && bDiff < 25) {
                let newColor = newPalette[j]
                img.pixels[i] = newColor[0]
                img.pixels[i + 1] = newColor[1]
                img.pixels[i + 2] = newColor[2]
            }
        })
    }
    img.updatePixels()
    return img
}

function preload() {
    myFont = loadFont('fonts/UbuntuMono-Bold.woff')

    spritesheetImg = loadImage('../images/spritesheet.png')

    for (let i = 0; i < planets.length; i++) {
        planetBGs.push(loadImage('../images/planet00-bg.png'))
        planetMasks.push(loadImage('../images/planet00-mask.png'))
    }
}

function setup() {
    frameRate(FRAME_RATE)

    createCanvas(SCREEN_WIDTH * 2, SCREEN_HEIGHT * 2)
    noSmooth()
    strokeCap(ROUND)
    strokeJoin(ROUND)
    strokeWeight(1)
    
    textFont(myFont)
    textSize(7)
    textAlign(CENTER, BASELINE)

    Object.keys(spritesheetColors).forEach(colorName => {
        let newPalette = spritesheetColors[colorName]
        let colorSpritesheetImg = recolor(spritesheetImg, basePalette, newPalette)
        let colorSpritesheet = new Spritesheet(colorSpritesheetImg, 32, 32)
        colorSpritesheets[colorName] = colorSpritesheet
    })

    planetBG = planetBGs[0]
    planetMask = planetMasks[0]

    spaceScreen.setup()
    planets.forEach(planet => planet.setup())
    planets[0].isUnlocked = true

    openScreen('space', 0)
}

function draw() {
    let dx = abs(mouseX - lastX)
    let dy = abs(mouseY - lastY)
    lastX = mouseX
    lastY = mouseY
    mouseVelocity = (mouseVelocity + sqrt(dx * dx + dy * dy)) / 2

    clear()
    scale(CANVAS_SCALE)
    currentScreen.draw()
}

function touchStarted() {
    // duplicating mousePressed here because p5js has a bug in it
    let x = mouseX / CANVAS_SCALE
    let y = mouseY / CANVAS_SCALE

    startX = x
    startY = y

    currentScreen.mousePressed(x, y)
}

function mousePressed() {
    let x = mouseX / CANVAS_SCALE
    let y = mouseY / CANVAS_SCALE

    startX = x
    startY = y

    currentScreen.mousePressed(x, y)
}

function mouseDragged() {
    let x = mouseX / CANVAS_SCALE
    let y = mouseY / CANVAS_SCALE

    let dx = startX - x
    let dy = startY - y

    currentScreen.mouseDragged(x, y, dx, dy)
}

function mouseReleased() {
    let x = mouseX / CANVAS_SCALE
    let y = mouseY / CANVAS_SCALE

    let dx = startX - x
    let dy = startY - y

    currentScreen.mouseReleased(x, y, dx, dy)
}

function keyPressed() {
    currentScreen.keyPressed()
}