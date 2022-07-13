class Storage extends ScreenState {

	constructor() {

		super()
		this.type = 'storage'
		this.index = 0

		this.slotCount = 24
		this.objects = (new Array(this.slotCount)).fill(null)
		this.selectedObjectIndex = -1

		this.x = 40
		this.y = 40
		this.width = 6
		this.height = 4
		this.slotWidth = 40
		this.slotHeight = 40

		//what does this even do lol
		this.inventoryIsVisible = true

	}

	setup() {
	}

	open(planetIndex) {

		this.index = planetIndex

	}

	close() {
	}

	draw() {

		let x = mouseX / CANVAS_SCALE
		let y = mouseY / CANVAS_SCALE

		image(spaceButtonForStorageImg, 3, WORLD_HEIGHT + 3)

		if (
			x >= spaceButton.x && x < spaceButton.x + spaceButton.width &&
			y >= spaceButton.y && y < spaceButton.y + spaceButton.height
		) {
			image(planets[this.index].sprite, 4, SCREEN_HEIGHT - 30)
		} else {
			image(planets[this.index].sprite, 4, SCREEN_HEIGHT - 28)
		}

		image(storageBG, 0, 0)

		// draw mute button
      		if (MUTE) image(unmuteButtonImg, muteButton.x, muteButton.y)
        	else image(muteButtonImg, muteButton.x, muteButton.y)
        
        	// draw pause button
        	if (this.isPaused) image(unpauseButtonImg, pauseButton.x, pauseButton.y)
        	else image(pauseButtonImg, pauseButton.x, pauseButton.y)

		


		// draw each object
		this.objects.forEach((obj, i) => {
			let { slotX, slotY } = this.getSlotPos(i)
			if (obj) {
				if (obj.isBeingDragged) {
					obj.pos.x = x
					obj.pos.y = y + obj.height / 2
				} else {
					obj.pos.x = slotX + this.slotWidth / 2
					obj.pos.y = slotY + this.slotHeight / 2 + obj.height / 2
				}
				if (i === this.selectedObjectIndex && !obj.isBeingDragged) {
					image(selectedStorageSlotImg, slotX, slotY-5)
				}
				
				obj.draw()
			}
		})


		// draw hotbar
        	inventory.objects.forEach(obj => {
        	    if (obj) {
        	        obj.isInInventory = true
        	        obj.draw()
        	    }
        	})

		// draw selected object's name
		let selectedObject = this.objects[this.selectedObjectIndex]
		if (selectedObject && !selectedObject.isBeingDragged) {
			fill('#444')
			stroke('white')
			strokeWeight(1)
			let selectionX = floor(selectedObject.pos.x)
			let selectionY = floor(selectedObject.pos.y - selectedObject.height - 3)
			triangle(selectionX, selectionY + 2, selectionX - 3, selectionY - 4, selectionX + 3, selectionY - 4)
			strokeWeight(2)
			text(selectedObject.name, selectionX, selectionY - 5)
		}
		


		// draw bunbon stats
        	if (selectedObject && selectedObject instanceof Bunbon) {
        	    let normalizedScore = selectedObject.score / selectedObject.maxScore
        	    let scoreImageIndex = floor(normalizedScore * 11)
            	image(scoreButtonImgs[scoreImageIndex], WORLD_WIDTH - 36, WORLD_HEIGHT + 4)
            	if (DEBUG) selectedObject.drawStatOrb()
	        }


		// draw upload button
		if (!this.isFull()) {
			image(uploadButtonImg, uploadButton.x, uploadButton.y)
		} else {
			image(disabledUploadButtonImg, uploadButton.x, uploadButton.y)
		}

		// draw download button
		if (selectedObject && selectedObject instanceof Bunbon) {
			image(downloadButtonImg, downloadButton.x, downloadButton.y)
		} else {
			image(disabledDownloadButtonImg, downloadButton.x, downloadButton.y)
		}

		// draw delete button
		if (selectedObject && !(selectedObject instanceof Bunbon)) {
			image(deleteButtonImg, deleteButton.x, deleteButton.y)
		} else {
			image(disabledDeleteButtonImg, deleteButton.x, deleteButton.y)
		}
        	

	}

	mousePressed(x, y) {

		if (MODAL_OPEN) return

		this.objects.forEach((obj, i) => {
			let { slotX, slotY } = this.getSlotPos(i)
			if (
				x >= slotX && x < slotX + this.slotWidth &&
				y >= slotY && y < slotY + this.slotHeight
			) {
				if (obj) {
					this.selectedObjectIndex = i
				} else {
					this.selectedObjectIndex = -1
				}
			}
		})
		
	}

	mouseDragged(x, y, dx, dy) {

		if (MODAL_OPEN) return

		let selectedObject = this.objects[this.selectedObjectIndex]
		if (selectedObject) {
			let distSquared = dx * dx + dy * dy
			if (distSquared >= 64) {
				selectedObject.isBeingDragged = true
			}
		}

	}

	mouseReleased(x, y) {

		if (MODAL_OPEN) return

		let selectedObject = this.objects[this.selectedObjectIndex]
		if (selectedObject && selectedObject.isBeingDragged) {

			selectedObject.isBeingDragged = false

			if (
				x >= spaceButton.x && x < spaceButton.x + spaceButton.width &&
				y >= spaceButton.y && y < spaceButton.y + spaceButton.height
			) {

				this.putObjectInWorld(selectedObject)

			} else {

				this.objects.forEach((obj, i) => {
					if (!obj) {
						let { slotX, slotY } = this.getSlotPos(i)
						if (
							x >= slotX && x < slotX + this.slotWidth &&
							y >= slotY && y < slotY + this.slotHeight
						) {
							this.moveObject(selectedObject, this.selectedObjectIndex, i)
							this.selectedObjectIndex = i
						}
					}
				})

			}
				
		} else if (
			x >= uploadButton.x && x < uploadButton.x + uploadButton.width &&
			y >= uploadButton.y && y < uploadButton.y + uploadButton.height
		) {
			this.importMenu()

		} else if (
			x >= downloadButton.x && x < downloadButton.x + downloadButton.width &&
			y >= downloadButton.y && y < downloadButton.y + downloadButton.height
		) {
			let selectedObject = this.objects[this.selectedObjectIndex]
			if (selectedObject && selectedObject instanceof Bunbon) {
				downloadBunbon(selectedObject)
			}

		} else if (
			x >= deleteButton.x && x < deleteButton.x + deleteButton.width &&
			y >= deleteButton.y && y < deleteButton.y + deleteButton.height
		) {
			this.deleteObject()

		}else if (
            		x >= pauseButton.x && x < pauseButton.x + pauseButton.width &&
            		y >= pauseButton.y && y < pauseButton.y + pauseButton.height
        		) {
       			     togglePause()
            
        	} else if (
            		x >= muteButton.x && x < muteButton.x + muteButton.width &&
            		y >= muteButton.y && y < muteButton.y + muteButton.height &&
            		!this.isPaused
        		) {
            			toggleMute()    
		} else if (
			x >= spaceButton.x && x < spaceButton.x + spaceButton.width &&
			y >= spaceButton.y && y < spaceButton.y + spaceButton.height
		) {
			openScreen('planet', this.index)

		}

	}

	keyPressed() {

		if (key === 'm') {
			muteSounds()
        } else if (key === 'p') {
           	togglePause()
		} else if (key === '~') {
            DEBUG = !DEBUG
            if (DEBUG) {
                console.log('~ DEBUG MODE ON ~')
                printDebugCommands()
            } else {
                console.log('~ DEBUG MODE OFF ~')
            }
		}
	}

	firstOpenSlotIndex() {

	let freeStorageSlotIndex = -1
   	this.objects.forEach((obj, index) => {
        if (!obj && freeStorageSlotIndex === -1) freeStorageSlotIndex = index
    })
    return freeStorageSlotIndex

	}

	isFull() {

		return this.firstOpenSlotIndex() === -1

	}

	addObject(obj) {

		let slotIndex = this.firstOpenSlotIndex()
		if (slotIndex >= 0) {
			obj.isInInventory = true
			this.objects[slotIndex] = obj
			this.selectedObjectIndex = slotIndex
		}

	}

	moveObject(obj, oldSlotIndex, newSlotIndex) {

		if (!this.objects[newSlotIndex]) {
			this.objects[newSlotIndex] = obj
			this.objects[oldSlotIndex] = null
		}

	}

	deleteObject() {

		let obj = this.objects[this.selectedObjectIndex]
		if (obj && !(obj instanceof Bunbon)) {
			openModal('delete-modal')
			let modal = document.getElementById('delete-modal-contents')
			modal.innerHTML = `
				are you sure you want to delete this ${obj.name}?
				<br><br><br><br>
				<button id='confirm-delete'>yes</button>
				<br><br>
				<button onclick='closeModal();'>cancel</button>
			`

			document.getElementById('confirm-delete').onclick = () => {
				this.objects[this.selectedObjectIndex] = null
				saveState()
				closeModal()
			}

			document.getElementById('confirm-delete').focus()
		}

	}
	
	importMenu() {

		openModal('import-modal')
		let modal = document.getElementById('import-modal-contents')
		modal.innerHTML = `
			<button id='open-import-item'>import item</button>
			<br><br>
			<button id='open-import-bunbon'>import bunbon</button>
			<br><br><br><br>
			<button onclick='closeModal();'>cancel</button>
		`

		document.getElementById('open-import-item').onclick = () => {
			this.importItem()
		}

		document.getElementById('open-import-bunbon').onclick = () => {
			uploadBunbon()
		}

		document.getElementById('open-import-item').focus()

	}

	importItem() {

		openModal('import-item-modal')
		let modal = document.getElementById('import-item-modal-contents')
		modal.innerHTML = ''

		//let introBunbonColors = ['grey', 'black', 'dust', 'chocolate', 'cream']
		let eggList = ['intro', 'deer', 'bee', 'alicorn', 'alien', 'leafcat', 'snail', 'sheep', 'fish', 'lizard', 'randomegg']
		let eggColors = {
			'intro': 'chocolate',
			'deer': 'dust',
			'bee': 'yellow',
			'alicorn': 'purple',
			'alien': 'pink',
			'leafcat': 'gold',
			'snail': 'blush',
			'sheep': 'cream',
			'fish': 'aqua',
			'lizard': 'green',
			'mousepunk' : 'grey',
			'dragonegg' : 'green',
			'randomegg' : 'black'
		}

		let specialEggList = ['']
		let specialEggs = {
			//'intro': 1,
			//'randomegg' : 2
		}

		let addItem = itemName => {
			
			let imageEl = document.createElement('img')
			imageEl.width = 64
			imageEl.height = 64
			imageEl.alt = itemName
			//console.log({colorSpritesheets,bunbonEggs}, this.objects)
			let eggSprite = bunbonEggs[0]
			//let spriteIndex = foodList.includes(itemName) ? foodSprites[itemName] : toyList.includes(itemName) ? toySprites[itemName] : eggSprite
			
			//let specialEgg= toySprites[toyType]

			
			let spriteIndex
				if (foodList.includes(itemName)){

					spriteIndex = foodSprites[itemName]
				} 
				else if (toyList.includes(itemName)) {
					spriteIndex = toySprites[itemName]
				} else if (eggList.includes(itemName)) {
					spriteIndex = eggSprite
				} else if (specialEggList.includes(itemName)) {
					spriteIndex = specialEggs[itemName]
			  	}	
			

			//{
			//console.log(colorSpritesheets[eggColors[itemName]].getSprite(eggSprite))
			//Spritesheet(spritesheetImg, 32, 32)
			//toys list egg as toy?
			//bunbonEggs = egg sprites
			//called egg, no sprite, on add has sprites
			//console.log(eggColors())
			//let itemSprite = foodList.includes(itemName) || toyList.includes(itemName) ? baseSpritesheet.getSprite(spriteIndex) : colorSpritesheets[eggColors()[itemName]].getSprite(eggSprite)
			//let itemSprite = baseSpritesheet.getSprite(spriteIndex)
			//console.log({spriteIndex})
			//}


			
			
			if (eggList.includes(itemName)) itemSprite = colorSpritesheets[eggColors[itemName]].getSprite(eggSprite)
			else itemSprite = baseSpritesheet.getSprite(spriteIndex)
			//let itemSprite = foodList.includes(itemName) || toyList.includes(itemName) ? baseSpritesheet.getSprite(spriteIndex) : colorSpritesheets[eggColors[itemName]].getSprite(eggSprite)
			
			
			if (spriteIndex=eggSprite) {this.color}
			

			imageEl.src = itemSprite.canvas.toDataURL()
			let buttonEl = document.createElement('button')
			buttonEl.className = 'image-button'
			buttonEl.onclick = () => {
				let item = foodList.includes(itemName) ? new Food(this.randomPoint(), itemName) : toyList.includes(itemName) ? new Toy(this.randomPoint(), itemName)  :new Egg(this.randomPoint(), itemName)				

				this.addObject(item)
				saveState()
				closeModal()
			}
			buttonEl.appendChild(imageEl)
			modal.appendChild(buttonEl)
		}

		let addNewItem = itemName => {
			
			let imageEl = document.createElement('img')
			imageEl.width = 64
			imageEl.height = 64
			imageEl.alt = itemName
			//console.log({colorSpritesheets,bunbonEggs}, this.objects)
			let eggSprite = 4
			let spriteIndex = foodList.includes(itemName) ? foodSprites[itemName] : toyList.includes(itemName) ? toySprites[itemName] : eggSprite

			//{
			//console.log(colorSpritesheets[eggColors[itemName]].getSprite(eggSprite)
			//Spritesheet(spritesheetImg, 32, 32)
			//toys list egg as toy?
			//bunbonEggs = egg sprites
			//called egg, no sprite, on add has sprites
			//console.log(eggColors())
			//let itemSprite = foodList.includes(itemName) || toyList.includes(itemName) ? baseSpritesheet.getSprite(spriteIndex) : colorSpritesheets[eggColors()[itemName]].getSprite(eggSprite)
			//}

			let itemSprite = foodList.includes(itemName) || toyList.includes(itemName) ? baseSpritesheet.getSprite(spriteIndex) : colorSpritesheets[eggColors[itemName]].getSprite(eggSprite)
			
			//let itemSprite = baseSpritesheet.getSprite(spriteIndex)
			//console.log({spriteIndex})
			if (spriteIndex=eggSprite) {this.color}

			//----------------------cant get already got sprite sheet



			imageEl.src = itemSprite.canvas.toDataURL()
			let buttonEl = document.createElement('button')
			buttonEl.className = 'image-button'
			buttonEl.onclick = () => {
				let item = foodList.includes(itemName) ? new Food(this.randomPoint(), itemName) : toyList.includes(itemName) ? new Toy(this.randomPoint(), itemName)  : new Egg(this.randomPoint(), itemName)				

				this.addObject(item)
				saveState()
				closeModal()
			}
			buttonEl.appendChild(imageEl)
			modal.appendChild(buttonEl)
		
		}

		if (planets[0].isUnlocked) { // park
			addItem('bundoll')
			addItem('sandwich')
			if (DEBUG) {addItem('intro')}
		}
		if (planets[1].isUnlocked) { // mossyforest
			addItem('mossball')
			addItem('mushrooms')
			if (DEBUG) {addItem('deer')}
		}
		if (planets[2].isUnlocked) { // flowertown
			addItem('dancingflower')
			addItem('flowers')
			if (DEBUG) {addItem('bee')}
		}
		if (planets[3].isUnlocked) { // volcano
			addItem('butterfly')
			addItem('dragonfruit')
			if (DEBUG) {addItem('leafcat')}
		}
		if (planets[4].isUnlocked) { // bubbledome
			addItem('beachball')
			addItem('seaweed')
			if (DEBUG) {addItem('fish')}
		}
		if (planets[5].isUnlocked) { // desert
			addItem('pullturtle')
			addItem('succulent')
			if (DEBUG) {addItem('lizard')}
		}
		if (planets[6].isUnlocked) { // snowymountain
			addItem('sled')
			addItem('icecream')
			if (DEBUG) {addItem('sheep')}
		}
		if (planets[7].isUnlocked) { // cloudland
			addItem('glider')
			addItem('dumplings')
			if (DEBUG) {addItem('alicorn')}
		}
		if (planets[8].isUnlocked) { // crystalcave
			addItem('magicwand')
			addItem('rockcandy')
			if (DEBUG) {addItem('snail')}
		}
		if (planets[9].isUnlocked) { // asteroid
			addItem('robot')
			addItem('juiceorb')
			if (DEBUG) {addItem('alien')}
		}
		if (DEBUG) {
			//since they arent added to planet it gives sprite error

			//---------------------try specify all Trates
//--------------------------------try copy working egg then change 
//---------------------------try egg colors before calls

			//this.objects.push(new Egg(this.randomPoint(), 'lizard'))
			//storageScreen.addObject('mousepunk')
			//addItem('mousepunk')
			addItem('mousepunk')
			addItem('dragonegg')

			addItem('randomegg')
		}

		//if (spriteIndex=eggSprite) {this.bunbonDNA.color}

		modal.appendChild(document.createElement('br'))
		modal.appendChild(document.createElement('br'))
		modal.appendChild(document.createElement('br'))
		modal.appendChild(document.createElement('br'))

		let cancelButtonEl = document.createElement('button')
		cancelButtonEl.innerText = 'cancel'
		cancelButtonEl.onclick = () => {
			document.getElementById('import-item-modal').className = 'modal'
		}
		modal.appendChild(cancelButtonEl)	

	}

	putObjectInWorld(obj) {

		if (obj) {
			this.objects[this.selectedObjectIndex] = null
			let planet = planets[this.index]
			planet.objects.push(obj)
			obj.isBeingDragged = false
			obj.isInInventory = false
			obj.pos = planet.randomPoint()
			obj.onDrop(planet.objects)
			openScreen('planet', this.index)
		}

	}

	getSlotPos(slotIndex) {

		let col = Math.floor(slotIndex % this.width)
		let row = Math.floor(slotIndex / this.width)
		let slotX = col * this.slotWidth + this.x
		let slotY = row * this.slotHeight + this.y
		return { slotX, slotY }

	}
	
}
