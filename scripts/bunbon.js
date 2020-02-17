let bunbonEars = {
    long: 2,
    short: 3,
    round: 4,
    lop: 5
}

let bunbonFaces = {
    blank: 20,
    blink: 21,
    smile: 22,
    grin: 23,
    laugh: 24,
    gasp: 25,
    blush: 26,
    moue: 27,
    angry: 28,
    frown: 29,
    sleep1: 30,
    sleep2: 31,
    eat1: 32,
    eat2: 33
}

class BunBon extends GameObject {
    constructor(pos, bunbonDNA) {
        super(24, 22)

        if (!bunbonDNA) bunbonDNA = BunBon.randomDNA()
        this.parents = bunbonDNA.parents

        this.name = NameGenerator.generate()
        this.pos = pos || randomPoint()

        this.offsetX = -4
        this.offsetY = -8
        this.animationTimer = 0
        this.animationFrame = 0
        this.faceTimer = 0

        this.color = bunbonDNA.color
        this.ears = bunbonDNA.ears
        this.face = random(Object.keys(bunbonFaces))

        this.isBaby = true
        this.age = 0
        this.ageTimer = 0
        this.ageToAdulthood = bunbonDNA.ageToAdulthood

        this.score = 0
        this.maxScore = 600

        this.canBlastOff = false
        this.isBlastingOff = false

        this.speed = 0
        this.maxSpeed = bunbonDNA.maxSpeed

        this.isResting = false
        this.restChance = bunbonDNA.restChance
        this.maxRestLength = 500

        this.isSleeping = false
        this.maxSleepLength = 1000

        this.isJumping = false
        this.jumpChance = bunbonDNA.jumpChance
        this.maxJumpHeight = 20

        this.isChatting = false
        this.maxChatLength = 500
        this.chatPartner = null
    
        this.nearGoal = this.pos
        this.farGoal = this.pos
        this.timesBlocked = 0
        this.wanderCounter = 0
        this.goalType = 'wander'

        this.drives = {
            hunger: 0,
            boredom: 0,
            loneliness: 0,
            sleepiness: 0
        }

        this.rates = {
            hunger: bunbonDNA.hungerRate,
            boredom: bunbonDNA.boredomRate,
            loneliness: bunbonDNA.lonelinessRate,
            sleepiness: bunbonDNA.sleepinessRate
        }

        this.foodOpinions = {}
        this.toyOpinions = {}
        this.friendOpinions = {}
    }

    static randomDNA() {
        return {
            parents: [],
            color: random(Object.keys(colorSpritesheets)),
            ears: random(Object.keys(bunbonEars)),
            // other body parts
            ageToAdulthood: random(30, 120),
            maxSpeed: random(0.2, 0.8),
            restChance: random(0.001, 0.02),
            jumpChance: random(0.01, 0.1),
            hungerRate: floor(random() * 100),
            boredomRate: floor(random() * 100),
            lonelinessRate: floor(random() * 100),
            sleepinessRate: floor(random() * 100)
        }
    }

    static canBreed(parent1, parent2) {
        if (parent1.isBaby || parent2.isBaby) {
            if (DEBUG) console.log('PROBLEM:', parent1.name, 'and', parent2.name, 'are not both fully grown')
            return false
        }
        let sharedParents = parent1.parents.filter(p => parent2.parents.includes(p))
        if (
            sharedParents.length >= 1 ||
            parent1.parents.includes(parent2.name) ||
            parent2.parents.includes(parent1.name) ||
            parent1.name === parent2.name
        ) {
            if (DEBUG) console.log('PROBLEM:', parent1.name, 'and', parent2.name, 'are too closely related')
            return false
        }
        return true
    }

    static breed(parent1, parent2) {
        let combinedDNA = {}
        let dna1 = parent1.getDNA()
        let dna2 = parent2.getDNA()
        Object.keys(dna1).forEach(geneName => {
            let whichParent = random([1, 2])
            if (whichParent === 1) {
                combinedDNA[geneName] = dna1[geneName]
            } else {
                combinedDNA[geneName] = dna2[geneName]
            }
        })
        combinedDNA.parents = [parent1.name, parent2.name]
        return combinedDNA
    }

    getDNA() {
        return {
            color: this.color,
            ears: this.ears,
            // other body parts
            ageToAdulthood: this.ageToAdulthood,
            maxSpeed: this.maxSpeed,
            restChance: this.restChance,
            jumpChance: this.jumpChance,
            hungerRate: this.rates.hunger,
            boredomRate: this.rates.boredom,
            lonelinessRate: this.rates.loneliness,
            sleepinessRate: this.rates.sleepiness
        }
    }

    highestDrive() {
        let highestDrive
        Object.keys(this.drives).forEach(drive => {
            if (!highestDrive || this.drives[drive] > this.drives[highestDrive]) {
                highestDrive = drive
            }
        })
        return highestDrive
    }

    updateDrive(drive) {
        let rate = this.rates[drive] / 10000
        if (random() < rate) {
            this.drives[drive] = constrain(this.drives[drive] + 1, 0, 100)
        }
    }

    reduceDrive(drive, amt) {
        this.drives[drive] = constrain(this.drives[drive] - amt, 0, 100)
    }

    pickFarGoal(setGoal, specialObj) {
        if (DEBUG && setGoal) console.log('user set ' + this.name + '\'s goal to:', setGoal)

        this.goalType = null
        this.goalObject = null

        let drives = Object.keys(this.drives)
        drives.sort((a, b) => {
            if (this.drives[a] < this.drives[b]) return -1
            if (this.drives[a] > this.drives[b]) return 1
            return 0
        })

        let chooseGoalObj = (type, opinions, goalType, message) => {
            let bestGoal
            let bestScore = 0
            gameObjects.forEach(obj => {
                if (obj !== this && obj instanceof type && !obj.isRefilling) {
                    let opinion = opinions[obj.name] || 50
                    let distance = Vector.dist(obj.pos, this.pos)
                    let normalizedDistance = 100 - floor(distance / WORLD_DIST * 100)
                    let special = specialObj === obj ? 50 : 0
                    let score = opinion + normalizedDistance + special
                    if (!bestGoal || score > bestScore) {
                        bestGoal = obj
                        bestScore = score
                    }
                }
            })
            if (bestGoal) {
                if (DEBUG) console.log(this.name, message, bestGoal.name)
                this.goalType = goalType
                this.goalObject = bestGoal
                this.farGoal = bestGoal.pos
            }
        }
        
        let foodGoal = (ignoreChance) => {
            let chanceOfFood = random() * 100
            if (specialObj instanceof Food) chanceOfFood /= 5
            if (chanceOfFood < this.drives.hunger || ignoreChance) {
                chooseGoalObj(Food, this.foodOpinions, 'food', 'is going to eat')
            }
        }
        
        let toyGoal = (ignoreChance) => {
            let chanceOfToy = random() * 100
            if (specialObj instanceof Toy) chanceOfToy /= 5
            if (chanceOfToy < this.drives.boredom || ignoreChance) {
                chooseGoalObj(Toy, this.toyOpinions, 'toy', 'is going to play with')
            }
        }

        let friendGoal = (ignoreChance) => {
            let chanceOfFriend = random() * 100
            if (specialObj instanceof BunBon) chanceOfFriend /= 5
            if (chanceOfFriend < this.drives.loneliness || ignoreChance) {
                chooseGoalObj(BunBon, this.friendOpinions, 'friend', 'is going to say hi to')
            }
        }

        let sleepGoal = (ignoreChance) => {
            if (this.isChatting) return
            let chanceOfSleep = random() * 100
            if (chanceOfSleep < this.drives.sleepiness || ignoreChance) {
                this.startSleep()
                this.goalType = 'sleep'
            }
        }

        let randomGoal = () => {
            let newGoal
            while (!newGoal) {
                let goalX = floor(random(0, WORLD_WIDTH))
                let goalY = floor(random(this.height, WORLD_HEIGHT))
                if (isPointPassable(goalX, goalY)) {
                    newGoal = createVector(goalX, goalY)
                }
            }
            // console.log(this.name, 'is wandering')
            this.goalType = 'wander'
            this.farGoal = newGoal
        }

        drives.forEach(drive => {
            if (!this.goalType) {
                if (drive === 'hunger' || setGoal === 'food') {
                    foodGoal(setGoal === 'food')
                }
                else if (drive === 'boredom' || setGoal === 'toy') {
                    toyGoal(setGoal === 'toy')
                }
                else if (drive === 'loneliness' || setGoal === 'friend') {
                    friendGoal(setGoal === 'friend')
                }
                else if (drive === 'sleepiness' || setGoal === 'sleep') {
                    sleepGoal(setGoal === 'sleep')
                }
            }
        })
        
        if (!this.goalType) randomGoal()
    }

    pickNearGoal() {
        if (this.goalType === 'wander') {
            if (!this.isJumping && random() < this.restChance) {
                this.startRest()
                return
            }
            if (!this.isJumping && random() < this.jumpChance) {
                this.startJump()
            }
        }

        this.speed = random(this.maxSpeed / 2, this.maxSpeed)

        if (this.wanderCounter) {
            let newGoal
            while (!newGoal) {
                let oldAngle = Vector.sub(this.nearGoal, this.pos).heading()
                let newAngle = (oldAngle + random(-PI / 4, PI / 4))
                let dist = random(0, this.width)
                let testVec = Vector.fromAngle(newAngle, dist)
                let testGoal = Vector.add(this.pos, testVec)
                if (isPointPassable(testGoal.x, testGoal.y)) {
                    newGoal = testGoal
                }
            }
            this.nearGoal = newGoal
            return
        }

        let newGoalMag = floor(random(0, this.width))
        let newGoalVec = Vector.random2D().setMag(newGoalMag)
        let newGoal = Vector.add(this.pos, newGoalVec)
        if (this.isCloser(newGoal, this.nearGoal, this.farGoal)) {
            if (isPointPassable(newGoal.x, newGoal.y)) {
                this.nearGoal = newGoal
                if (this.timesBlocked > 0) this.timesBlocked--
            } else {
                this.timesBlocked++
                if (this.timesBlocked > 10) {
                    this.wanderCounter = 20
                }
            }
        }
    }

    isCloser(pointA, pointB, goal) {
        let distA = Vector.dist(pointA, goal)
        let distB = Vector.dist(pointB, goal)
        return distA < distB
    }

    isAtGoal(goal) {
        if (this.goalType === 'friend') {
            return Vector.dist(this.pos, goal) <= this.width
        } else {
            if (this.pos === goal) return true
            return Vector.dist(this.pos, goal) <= this.width / 4
        }
    }

    moveToGoal() {
        // update moving goal
        if (this.goalObject) {
            this.farGoal = this.goalObject.pos
        }

        let d = Vector.sub(this.nearGoal, this.pos)
        if (d.x < -2) this.isFlipped = true
        if (d.x > 2) this.isFlipped = false
        d.setMag(this.speed)
        this.pos = Vector.add(this.pos, d)

        // don't check goals while jumping
        if (this.isJumping) return

        // check goals
        if (this.isAtGoal(this.nearGoal)) {
            this.pickNearGoal()
            if (this.wanderCounter) this.wanderCounter--
        }
        if (this.isAtGoal(this.farGoal)) {
            this.onReachingGoal()
        }
        if (this.goalObject && (this.goalObject.isRefilling || !isPointPassable(this.goalObject.pos.x, this.goalObject.pos.y))) {
            if (DEBUG) console.log(this.name, 'goal no longer available')
            this.pickFarGoal()
        }
    }

    onReachingGoal() {
        let goalName = this.goalObject ? this.goalObject.name : ''

        if (this.goalType === 'food') {
            if (!this.goalObject.isRefilling) {
                this.startEat()
                this.goalObject.onPush()
                if (!this.foodOpinions[goalName]) {
                    this.foodOpinions[goalName] = floor(random(0, 100))
                    if (DEBUG) console.log(this.name, 'tried new food,', goalName, '(opinion', this.foodOpinions[goalName] + '%)')
                }
                let opinion = this.foodOpinions[goalName]
                let rate = opinion >= 50 ? 2 : 1
                this.reduceDrive('hunger', this.goalObject.driveReduction * rate)
            }
        }

        else if (this.goalType === 'toy') {
            this.startPlay()
            this.goalObject.onPush()
            if (!this.toyOpinions[goalName]) {
                this.toyOpinions[goalName] = floor(random(0, 100))
                if (DEBUG) console.log(this.name, 'tried new toy,', goalName, '(opinion', this.toyOpinions[goalName] + '%)')
            }
            let opinion = this.toyOpinions[goalName]
            let rate = opinion >= 50 ? 2 : 1
            this.reduceDrive('boredom', this.goalObject.driveReduction * rate)
        }

        else if (this.goalType === 'friend') {
            if (!this.friendOpinions[goalName]) {
                this.friendOpinions[goalName] = floor(random(0, 100))
                if (DEBUG) console.log(this.name, 'met a new friend,', goalName, '(opinion', this.friendOpinions[goalName] + '%)')
            } else if (this.friendOpinions[goalName] > 50 && this.goalObject.friendOpinions[this.name] > 50) {
                console.log('MAYBE BREED???')
            }
            this.startChat(this.goalObject)
        }

        this.pickFarGoal()
    }

    startEat() {
        this.isEating = true
        this.eatTimer = 0
        this.eatLength = floor(random(30, 60))
    }

    eat() {
        this.eatTimer++
        if (this.eatTimer > this.eatLength) {
            this.isEating = false
        }
    }

    startPlay() {
        this.isPlaying = true
        this.playTimer = 0
        this.playLength = floor(random(30, 60))
        this.playFace = random(['smile', 'grin', 'laugh'].filter(x => x !== this.face))
    }

    play() {
        this.playTimer++
        if (this.playTimer > this.playLength) {
            this.isPlaying = false
        }
    }

    startRest() {
        this.isResting = true
        this.restTimer = 0
        this.originalPos = this.pos
        this.restLength = floor(random(this.maxRestLength / 2, this.maxRestLength))
    }

    rest() {
        this.restTimer++
        if (this.restTimer > this.restLength) {
            this.isResting = false
            this.pos = this.originalPos
        }
    }

    startSleep() {
        if (DEBUG) console.log(this.name, 'went to sleep')
        this.isSleeping = true
        this.sleepTimer = 0
        this.originalPos = this.pos
        this.sleepLength = floor(random(this.maxSleepLength / 2, this.maxSleepLength))
    }

    sleep() {
        this.reduceDrive('sleepiness', 0.1)
        this.sleepTimer++
        if (this.sleepTimer > this.sleepLength) { //} || this.drives.sleepiness <= 0) {
            if (DEBUG) console.log(this.name, 'woke up')
            this.isSleeping = false
            this.pos = this.originalPos
        }
    }

    startJump() {
        this.isJumping = true
        this.jumpTimer = 0
        this.jumpHeight = floor(random(this.maxJumpHeight / 2, this.maxJumpHeight))
        this.jumpY = 0
    }

    jump() {
        this.jumpTimer++
        this.jumpY = this.jumpHeight * sin(this.jumpTimer * 0.15)
        if (this.jumpY <= 0) {
            this.isJumping = false
            this.jumpY = 0
        }
    }

    startChat(chatPartner) {
        if (this.isChatting || chatPartner.isSleeping) return
        this.chatPartner = chatPartner
        if (DEBUG) console.log(this.name, 'is chatting with', this.chatPartner.name)
        this.isChatting = true
        this.chatTimer = 0
        this.chatLength = floor(random(this.maxChatLength / 2, this.maxChatLength))
        this.isFlipped = this.chatPartner.pos.x < this.pos.x
        this.chatPartner.startChat(this)
    }

    chat() {
        let opinion = this.chatPartner ? this.friendOpinions[this.chatPartner.name] : 0
        let rate = opinion >= 50 ? 2 : 1
        this.reduceDrive('loneliness', 0.1 * rate)
        this.chatTimer++
        if (this.chatTimer > this.chatLength || !this.chatPartner || this.chatPartner.isInInventory || !this.chatPartner.isChatting) {
            this.endChat()
        }
    }

    endChat() {
        // console.log(this.name, 'stopped chatting')
        let chatPartner = this.chatPartner
        this.chatPartner = null
        this.isChatting = false
        if (chatPartner && chatPartner.chatPartner === this) {
            if (this.friendOpinions[chatPartner.name]) {
                let opinionBoost = floor(random(0, 11))
                let newOpinion = min(this.friendOpinions[chatPartner.name] + opinionBoost, 100)
                if (DEBUG && opinionBoost) {
                    console.log(
                        this.name + '\'s opinion of', chatPartner.name, 'went from',
                        this.friendOpinions[chatPartner.name] + '%', 'to', newOpinion + '%'
                    )
                }
                this.friendOpinions[chatPartner.name] = newOpinion
            }
            chatPartner.endChat()
        }
    }

    layEgg(bunbonDNA) {
        let egg = new Egg(bunbonDNA)
        gameObjects.push(egg)
    }

    startBlastOff() {
        if (DEBUG) console.log(this.name, 'is blasting off!')
        this.isBlastingOff = true
        this.blastOffTimer = 0
    }

    blastOff() {
        this.blastOffTimer++
        this.pos.y -= floor(this.blastOffTimer)
        this.pos.x += floor(this.blastOffTimer / 2)
        if (this.pos.y < -this.height) {
            currentScreen.unlockConnections()
            blastedOffBunbons.push(this)
            this.removeMe = true
        }
    }

    pet() {
        this.reduceDrive('loneliness', 0.1)
    }

    lookAt(obj) {
        if (DEBUG) console.log(this.name, 'looked at', obj.name)
        this.pickFarGoal(null, obj)
        this.pickNearGoal()
        if (obj instanceof BunBon) {
            if (BunBon.canBreed(this, obj)) {
                let combinedDNA = BunBon.breed(this, obj)
                this.layEgg(combinedDNA)
                if (DEBUG) console.log(this.name, 'and', obj.name, 'laid an egg')
            }
        }
    }

    update() {
        // update age
        this.ageTimer++
        if (this.ageTimer >= FRAME_RATE) {
            this.age++
            this.ageTimer = 0
            if (this.isBaby && this.age >= this.ageToAdulthood) {
                if (DEBUG) console.log(this.name, 'has grown up')
                this.isBaby = false
            }
        }

        // update drives
        Object.keys(this.drives).forEach(drive => this.updateDrive(drive))
        let highestDrive = this.highestDrive()
        let highestDriveValue = this.drives[highestDrive]
        let averageDriveValue = (this.drives.hunger + this.drives.boredom + this.drives.loneliness + this.drives.sleepiness) / 4

        // update score
        if (!this.isBaby && !this.canBlastOff && averageDriveValue < 33 && highestDriveValue < 50) {
            this.score += 1 / FRAME_RATE
            this.scoreIncreased = true
            if (this.score > this.maxScore) {
                this.score = this.maxScore
                this.canBlastOff = true
                if (DEBUG) console.log(this.name, 'is ready to blast off!')
            }
        } else {
            this.scoreIncreased = false
        }

        // update facial expression
        this.faceTimer--
        if (this.isBlastingOff) {
            this.face = 'laugh'
        }
        else if (selectedObject === this && mouseIsPressed && !isDragging && !this.isSleeping) {
            // getting petted!
            if (mouseVelocity < 0.1) {
                this.face = 'blank'
            } else {
                this.face = 'blink'
            }
        }
        else if (this.isSleeping) {
            if (this.animationFrame === 1) this.face = 'sleep1'
            else this.face = 'sleep2'
        }
        else if (this.isEating) {
            if (this.animationFrame === 1) this.face = 'eat1'
            else this.face = 'eat2'
        }
        else if (this.faceTimer <= 0) {
            this.faceTimer = 30
            if (this.isChatting && this.chatPartner) {
                let opinion = this.friendOpinions[this.chatPartner.name]
                if (opinion > random() * 100) {
                    this.face = random(['smile', 'grin', 'laugh'])
                } else if (opinion < random() * 50) {
                    this.face = random(['blank', 'blink', 'moue'])
                } else {
                    this.face = random(['gasp', 'blush'])
                }
                this.faceTimer = floor(random(10, 30))
            } else if (random() < 0.2) {
                this.face = 'blink'
                this.faceTimer = 10
            } else if (highestDriveValue < 10 || (random() < 0.1 && averageDriveValue < 30)) {
                this.face = 'grin'
            } else if (highestDriveValue < 30 || (random() < 0.1 && averageDriveValue < 60)) {
                this.face = 'smile'
            } else if (highestDriveValue > 80 || (random() < 0.1 && averageDriveValue > 60)) {
                if (highestDrive === 'hunger' || highestDrive === 'boredom') {
                    this.face = 'angry'
                } else {
                    this.face = 'frown'
                }
            } else if (highestDriveValue > 60 || (random() < 0.1 && averageDriveValue > 30)) {
                this.face = 'moue'
            } else {
                this.face = 'blank'
            }
        }
        else if (this.isPlaying) {
            this.face = this.playFace
        }

        // check state
        if (this.isBlastingOff) {
            this.blastOff()
        }
        else if (selectedObject === this && mouseIsPressed && isDragging) {
            // do nothing
        }
        else if (this.isEating) {
            this.eat()
            this.animationTimer += 6
        }
        else if (this.isChatting) {
            this.chat()
        }
        else if (this.isSleeping) {
            this.sleep()
            this.animationTimer += 1
        }
        else if (selectedObject === this && mouseIsPressed) {
            this.pet()
            this.animationTimer += min(8, round(mouseVelocity) * 2)
        }
        else if (this.isPlaying) {
            this.play()
        }
        else if (this.isResting) {
            this.rest()
            this.animationTimer += 2
        }
        else if (this.isJumping) {
            this.jump()
        }
        else {
            this.moveToGoal()
            this.animationTimer += 6
        }

        // update animation
        if (this.animationTimer >= 60) {
            this.animationTimer = 0
            this.animationFrame = this.animationFrame === 0 ? 1 : 0
        }
    }

    draw() {
        push()

        // find upper-left corner of sprite
        let jumpOffset = this.isInInventory ? 0 : this.jumpY
        let x = floor(this.pos.x - (this.width / 2) + this.offsetX)
        let y = floor(this.pos.y - this.height + this.offsetY - jumpOffset)
        translate(x, y)

        // flip sprite if moving left
        if (this.isFlipped) {
            scale(-1, 1)
            translate(this.offsetX * 2 - this.width, 0)
        }

        // draw base
        let decorationY = this.animationFrame === 0 ? 0 : 1
        let frame = this.animationFrame === 0 ? 0 : 1
        if (this.isBaby) {
            frame += 16
            if (this.face === 'blink' || this.face.startsWith('sleep') || this.face.startsWith('eat')) frame += 2
        }

        image(colorSpritesheets[this.color].get(frame), 0, 0)

        // draw layers
        if (!this.isBaby) {
            image(colorSpritesheets[this.color].get(bunbonEars[this.ears]), 0, decorationY)
            image(colorSpritesheets[this.color].get(bunbonFaces[this.face]), 0, decorationY)
        }

        pop()

        if (this.isInInventory && !(selectedObject === this && mouseIsPressed)) return

        // draw selection info
        if (selectedBunbon === this) {
            push()
            fill('#444')
            stroke('white')
            strokeWeight(1)
            translate(this.pos.x, this.pos.y - this.height - this.jumpY - 3)
            triangle(0, 2, -3, -4, 3, -4)
            strokeWeight(2)
            text(this.name, 0, -5)
            pop()
        }
        
        // draw debug lines
        if (DEBUG) {
            noFill()
            strokeWeight(0.5)
            stroke('lightblue')
            rect(x - this.offsetX, y - this.offsetY, this.width, this.height)
            stroke('lightblue')
            line(this.pos.x, this.pos.y, this.nearGoal.x, this.nearGoal.y)
            stroke('blue')
            line(this.pos.x, this.pos.y, this.farGoal.x, this.farGoal.y)
        }
    }

    drawScore() {
        let percentScore = this.score / this.maxScore
        let normalizedScore = log(percentScore * (Math.E - 1) + 1)
        let scoreSize = (normalizedScore * 29) + 3

        push()
        translate(SCREEN_WIDTH - 36, SCREEN_HEIGHT - 36)

        fill('#ccc')
        circle(16, 16, 32)

        if (this.canBlastOff) {
            fill('magenta')
        } else if (this.scoreIncreased) {
            fill('#444')
        } else {
            fill('#888')
        }
        circle(16, 32 - (scoreSize / 2), scoreSize)

        if (!this.canBlastOff) {
            noFill()
            stroke('#444')
            circle(16, 16, 32)
        }

        pop()
    }

    drawStatOrb() {
        let barLength = (drive) => {
            let normalized = log((drive / 100) * (Math.E - 1) + 1)
            let length = max(2, floor(normalized * 16))
            return length
        }

        let hungerBar = barLength(this.drives.hunger)
        let boredomBar = barLength(this.drives.boredom)
        let lonelinessBar = barLength(this.drives.loneliness)
        let sleepinessBar = barLength(this.drives.sleepiness)

        push()
        translate(18, 18)

        stroke('white')
        noFill()
        ellipse(0, 0, 32, 32)

        noStroke()
        fill('white')
        quad(
            -sleepinessBar, 0,
            0, -hungerBar,
            boredomBar, 0,
            0, lonelinessBar
        )
        
        pop()
    }

    drawIcon(x, y) {
        if (this.isBaby) {
            x -= 16
            y -= 16
            image(colorSpritesheets[this.color].get(384), x, y)
        } else {
            x -= 16
            y -= 16
            image(colorSpritesheets[this.color].get(383), x, y)
        }
    }
}