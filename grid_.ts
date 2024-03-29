//var canvas = document.getElementById("canvas");
/*	this is because getElementById() can return other type than HTMLCanvasElement like null or whatever.
	So now it can only return HTMLCanvasElement else trow exeption. */
	const getCanvasElementById = (id: string): HTMLCanvasElement => {
		const canvas = document.getElementById(id); // CHECK BACKWARD COMPABILITY
	
		if (!(canvas instanceof HTMLCanvasElement))
			throw new Error(`The element of id "${id}" is not a HTMLCanvasElement. Make sure a <canvas id="${id}""> element is present in the document.`);
	
		return canvas;
	}
	
	//var ctx: = canvas.getContext("2d");
	/* same as above */
	const getCanvasRenderingContext2D = (canvas: HTMLCanvasElement): CanvasRenderingContext2D => {
		const context = canvas.getContext('2d'); // CHECK BACKWARD COMPABILITY
	
		if (context === null)
			throw new Error('This browser does not support 2-dimensional canvas rendering contexts.');
	
		return context;
	}
	
	const canvas:HTMLCanvasElement = getCanvasElementById('canvas');
	const ctx: CanvasRenderingContext2D = getCanvasRenderingContext2D(canvas);
		//ctx.translate(0.5, 0.5); // Move the canvas by 0.5px to fix blurring
		//ctx.font = 'bold 48px serif';
	
	/*const PNGSpecular:HTMLImageElement = new Image();
		PNGSpecular.src = 'tile.png';
	
	const PNGEmptyTile = new Image();
		PNGEmptyTile.src = 'tile2.png';*/
	
	enum TileState {Blank, Color, Hint}
	enum Orientation {Vertical, Horizontal}

	function max(array:Array<number>):number {
			let max:number = -Infinity;
			for(let i=0; i < array.length; ++i)
				if(array[i] > max)
					max = array[i];
			return max;
	}

	function min(array:Array<number>):number {
		let min:number = +Infinity;
		for(let i=0; i < array.length; ++i)
			if(array[i] < min)
				min = array[i];
		return min;
	}
	
	class XY {
		x:number;
		y:number;

		constructor(x:number, y:number){
			this.x = x;
			this.y = y;
		}
	}
	
	class Color {
		//private rgb: string;
		private r:number;
		private g:number;
		private b:number;
		
		constructor(r:number, g:number, b:number){
			this.setRgb(r, g, b);
		}
	
		setRgb(r:number, g:number, b:number):void {
			//this.rgb = "rgb("+r+","+g+","+b+")";
			this.r = r;
			this.g = g;
			this.b = b;
		}
	
		getRgb():string {
			return "rgb("+this.r+","+this.g+","+this.b+")";
		}

		toString():string {
			return this.r+";"+this.g+";"+this.b;
		}
	}
	
	class State {
		readonly state: TileState;
		readonly color: Color;
		private next: State;
	
		constructor(state:TileState, color:Color, next:State){
			this.state = state;
			this.color = color;
			this.next = next;
		}

		setNext(next:State):void {
			this.next = next;
		}
	
		getNext():State {
			return this.next;
		}
	}

	class Tile {
		state: State;
		
		constructor(state:State){
			this.state = state
		}
	
		nextState():void {
			this.state = this.state.getNext();
		}

		/*getState():State {
			return this.state;
		}

		getTileState():TileState {
			return this.state.state;
		}*/
	}
	
	class Header {
		//public static invalideColor:Color = new Color(255, 0, 0); 
		//public static valideColor:Color = new Color(0, 0, 0);
		nums:Array<number>;
		//colors:Array<Color>;
		states:Array<State>;
		check:Array<boolean>;
		increase_method:(xy:XY)=>void;
		XYtoHeaderID_method:(xy:XY)=>number;
		validity:boolean;

		constructor(nums:Array<number>/*, colors:Array<Color>*/, states:Array<State>, increase_method:(xy:XY)=>void, XYtoHeaderID_method:(xy:XY)=>number){
			this.nums = nums;
			//this.colors = colors;
			this.states = states;
			this.check = Array(nums.length).fill(false);
			this.increase_method = increase_method;
			this.XYtoHeaderID_method = XYtoHeaderID_method;
			this.validity = false;
		}
	}

	class Grid {
		/*private*/ public tiles: Array<Tile>;
		private nonogram: Array<Tile>;
		private scoreToVictory: number;
		
		readonly rows: number; // number of rows
		readonly cols: number; // number of cols
		readonly size: number; // size in px of a Tile (a Tile is always a square)
		readonly offsetX: number; // coord of the top left corner of the grid relative to the top left corner of the canvas
		readonly offsetY: number; // coord of the top left corner of the grid relative to the top left corner of the canvas
		
		public colors: Array<Color>; // Contain all different colors avaible for tiles.
		private backgroundColor: Color;
		private fontColor: Color;

		private states: Array<State>; // Contain all possible states of a tiles.

		/*private*/ cols_headers: Array<Header>;
		/*private*/ rows_headers: Array<Header>;

		//some fake static variable for some methods...
		private lastIndexMouseOver: number;

		constructor(cols:number, rows:number, size:number, backgroundColor:Color, fontColor:Color, colors:Array<Color>, hintsFollowColors:boolean, nonogramStates:Array<number>, saveStates:Array<number>){
			this.lastIndexMouseOver = undefined;
			this.size = size //(size > 0 ? size : 1); // avoid division by 0
			this.rows = rows //(rows > 0 ? rows : 1); // avoid division by 0
			this.cols = cols //(cols > 0 ? cols : 1); // avoid division by 0
			this.colors = colors;
				this.backgroundColor = backgroundColor;
				this.fontColor = fontColor;

			//Init the states array
			this.states = Array(this.colors.length* 2 +1); // same numbers of color and hint (*2). (+1) Because of the blank states.
				//create the blank state with the background color
				this.states[0] = new State(TileState.Blank, this.backgroundColor, null);

				// run in decreasing way because each one must refer to an existing one.
				// with : colorID=this.colors.length-1 (end of the colors array)
				// with : state=this.states.length-1 (end of the states array)
				
				for(let colorID=this.colors.length-1, state=this.states.length-1; colorID >= 0; --colorID, --state){
						this.states[state] = new State(TileState.Hint, this.colors[colorID], this.states[(state+1)%this.states.length]); // i % length. if we've gone too high, start from `0` again
						console.log(state +"(hint) linked with "+(state+1)%this.states.length);
					}

				// with : state=(this.states.length-1)-(colors.length-1) (end of the states array minus the color already attributed)

				for(let colorID=this.colors.length-1, state=this.states.length-1-this.colors.length; colorID >= 0; --colorID, --state){
						this.states[state] = new State(TileState.Color, this.colors[colorID], this.states[(state+1)%this.states.length]); // i % length. if we've gone too high, start from `0` again
						console.log(state +"(color) linked with "+(state+1)%this.states.length);
				}

				this.states['firstColor'] = this.states[1]; // add property to the array
				this.states['firstHint'] = this.states[this.colors.length]; // add property to the array
				this.states['lastColor'] = this.states['firstHint']-1; // add property to the array
				this.states['lastHint'] = this.states.length-1; // add property to the array

				if(hintsFollowColors){
					//Empty -> Colors -> ... -> Hint -> ... -> Empty
					this.states[0].setNext(this.states['firstColor']);
				}
				else { 
					//Empty -> nothing (depending of the action)
					//Colors -> ... -> Empty
					//Hint -> ...-> Empty
					this.states[0].setNext(this.states[0]);
					this.states['lastColor'].setNext(this.states[0]);
					this.states['lastHint'].setNext(this.states[0]);
				}

				for(let i=0; i < this.states.length; ++i){
					console.log(this.states[i]);
				}		
			
			//Init the nonogram array and scoretovictory TODO ERROR GESTION
			this.nonogram = Array(rows * cols);
			//this.scoreToVictory = this.nonogram.length;
				if(nonogramStates.length > 0 && nonogramStates.length == cols * rows && max(nonogramStates) < this.states.length && min(nonogramStates) >= 0){ //check
					for(let i=0; i <nonogramStates.length; ++i){
						this.nonogram[i] = new Tile(this.states[nonogramStates[i]]);
						//if(this.nonogram[i].state.state == TileState.Blank)
							//--this.scoreToVictory;
					}
				}
				else {
					for(let i=0; i < this.nonogram.length; ++i)
						this.nonogram[i] = new Tile(this.states[0]);
					this.scoreToVictory = -1;
				}

			//Init the tiles array with the save
			this.tiles = Array(rows * cols);
				if(saveStates.length > 0 && saveStates.length == cols * rows && max(saveStates) < this.states.length && min(saveStates) >= 0){ //check
					for(let i=0; i < saveStates.length; ++i)
						this.tiles[i] = new Tile(this.states[saveStates[i]]);
				}
				else {
					for(let i=0; i < this.tiles.length; ++i)
						this.tiles[i] = new Tile(this.states[0]);
				}

			//Init headers TODO MINIMISE Index2dToNono() CALLS
			this.cols_headers = new Array(this.cols);
			this.rows_headers = new Array(this.rows);
			for(let i=0; i < this.cols_headers.length; ++i){
				let numberOfNums = 0;
				for(let j=0, precedent:State = undefined; j < this.rows_headers.length; ++j){
					if(this.Index2dToNono(i, j).state.state == TileState.Color){
						if(this.Index2dToNono(i, j).state != precedent){
							precedent = this.Index2dToNono(i, j).state;
							++numberOfNums;
						}
					} else
						precedent = this.states[0];
				}
				console.log("col"+i+":"+numberOfNums);
				let nums:Array<number> = Array(numberOfNums).fill(0);
				//let colors:Array<Color> = Array(numberOfNums);
				let states:Array<State> = Array(numberOfNums);
				for(let j=0, k=-1, precedent:State = undefined; j < this.rows_headers.length; ++j){
					if(this.Index2dToNono(i, j).state.state == TileState.Color){
						if(this.Index2dToNono(i, j).state != precedent){
							precedent = this.Index2dToNono(i, j).state;
							++k;
							//colors[k] = precedent.color;
							states[k] = precedent;
							//++nums[k];
						}
						/*else	
							++nums[k];*/
						++nums[k];
					} else precedent = this.states[0];
				}
				console.log(nums);
				this.cols_headers[i] = new Header(nums/*, colors*/, states, this.increase_vertical, this.XYtoVerticalHeaderID);
			}
			this.offsetY = 0
			for(let i=0; i < this.cols_headers.length; i++){
				if(this.cols_headers[i].nums.length > this.offsetY)
					this.offsetY = this.cols_headers[i].nums.length;
			}
			this.offsetY *= this.size;
			
			for(let i=0; i < this.rows_headers.length; ++i){
				let numberOfNums = 0;
				for(let j=0, precedent:State = this.states[0]; j < this.cols_headers.length; ++j){
					if(this.Index2dToNono(j, i).state.state == TileState.Color){
						if(this.Index2dToNono(j, i).state != precedent){
							precedent = this.Index2dToNono(j, i).state;
							++numberOfNums;
						}
					} else
						precedent = this.states[0];
				}
				console.log("row"+i+":"+numberOfNums); 
				let nums:Array<number> = Array(numberOfNums).fill(0);
				//let colors:Array<Color> = Array(numberOfNums);
				let states:Array<State> = Array(numberOfNums);
				for(let j=0, k=-1, precedent:State = undefined; j < this.cols_headers.length; ++j){
					if(this.Index2dToNono(j, i).state.state == TileState.Color){
						if(this.Index2dToNono(j, i).state != precedent){
							precedent = this.Index2dToNono(j, i).state;
							++k;
							//colors[k] = precedent.color;
							states[k] = precedent;
							//++nums[k];
						}
						/*else	
							++nums[k];*/
						++nums[k];
					} else precedent = this.states[0];
				}
				console.log(nums);
				this.rows_headers[i] = new Header(nums/*, colors*/, states, this.increase_horizontal, this.XYtoHorizontalHeaderID);
			}
			this.offsetX = 0;
			for(let i=0; i < this.rows_headers.length; i++){
				if(this.rows_headers[i].nums.length > this.offsetX)
					this.offsetX = this.rows_headers[i].nums.length;
			}
			this.offsetX *= this.size;

			// INIT SCORE TO VICTORY
			this.scoreToVictory = this.cols + this.rows;

			// INVALID ALL
			for(let i=0; i < this.cols_headers.length; ++i)
				this.invalid(i, this.cols_headers);
			for(let i=0; i < this.rows_headers.length; ++i)
				this.invalid(i, this.rows_headers);
		}
	
		 IndexToX(i:number):number {
			return (i%this.cols)*this.size + this.offsetX;
		}
	
		 IndexToY(i:number):number {
			return (Math.trunc(i/this.cols))*this.size + this.offsetY;
		}
	
		 XyToTile(x:number, y:number):Tile {
			return this.tiles[this.XyToIndex(x, y)];
		}
	
		 XyToIndex(x:number, y:number):number {
			return Math.trunc((x-this.offsetX)/this.size) + Math.trunc((y-this.offsetY)/this.size)*this.cols; // %size
		}

		 Index2dToIndex(i:number, j:number):number {
			return i + j*this.cols;
		}

		 Index2dToTile(i:number, j:number):Tile {
			return this.tiles[this.Index2dToIndex(i, j)];
		}
		 Index2dToNono(i:number, j:number):Tile {
			return this.nonogram[this.Index2dToIndex(i, j)];
		}

		headerToXY(headerID:number, headers:Array<Header>, at:number):XY {
			switch(headers){
				case this.cols_headers:
					return new XY(headerID, at);
				case this.rows_headers:
					return new XY(at, headerID);
				default:
					return new XY(0, 0);
			}
		}

		XYtoVerticalHeaderID(coord:XY):number {
			return coord.y;
		}

		XYtoHorizontalHeaderID(coord:XY):number {
			return coord.x;
		}

		XyToVerticalHeaderIndex(x:number, y:number):number {
			return Math.trunc((x-this.offsetX)/this.size);
		}

		XyToHorizontalHeaderIndex(x:number, y:number):number {
			return Math.trunc((y-this.offsetY)/this.size);
		}

		XyIsOnGrid(x:number, y:number):boolean {
			return (x > this.offsetX && y > this.offsetY) && (x < this.IndexToX(this.tiles.length-1)+this.size && y < this.IndexToY(this.tiles.length-1)+this.size);
		}

		/*indexOfFirstState(headerID:number, headers:Array<Header>, state:State):number {
			let index:number = undefined;
			switch(headers){
				case this.cols_headers:
					for(let i=0; i < this.cols; ++i)
						if(this.Index2dToTile(headerID, i).state == state){
							index = i; break; }
					break;
				case this.rows_headers:
					for(let i=0; i < this.rows; ++i)
						if(this.Index2dToTile(i, headerID).state == state){
							index = i; break; }
					break;
				default:
					index = undefined;
					break;
			}
			//console.log("indexOfFirstColor"+index);
			return index;
		}*/
		
		/*indexOfFirstNextState(headerID:number, headers:Array<Header>, from:number):number {
			let index:number = undefined;
			switch(headers){
				case this.cols_headers:
					for(let i=from+1; i < this.rows; ++i){
						if(this.Index2dToTile(headerID, i).state != this.Index2dToTile(headerID, from).state){
							index = i; break; }
					}
					break;
				case this.rows_headers:
					for(let i=from+1; i < this.cols; ++i)
						if(this.Index2dToTile(i, headerID).state != this.Index2dToTile(from, headerID).state){
							index = i; break; }
					break;
				default:
					index = undefined;
					break;
			}
			return index;
		}*/

		/*indexOfNextState(headerID:number, headers:Array<Header>, from:number, state:State):number {
			let index:number = undefined;
			switch(headers){
				case this.cols_headers:
					for(let i=this.indexOfFirstNextState(headerID, headers, from); i < this.cols; ++i)
						if(this.Index2dToTile(headerID, i).state == state){
							index = i; break; }
					break;
				case this.rows_headers:
					for(let i=this.indexOfFirstNextState(headerID, headers, from); i < this.rows; ++i)
						if(this.Index2dToTile(i, headerID).state == state){
							index = i; break; }
					break;
				default:
					index = undefined;
					break;
			}
			//console.log("indexOfFirstColor"+index);
			return index;
		}*/

		/*indexOfFirstTileState(headerID:number, headers:Array<Header>, state:TileState):number {
			let index:number = undefined;
			switch(headers){
				case this.cols_headers:
					for(let i=0; i < this.cols; i=this.indexOfFirstNextState(headerID, headers, i))
						if(this.Index2dToTile(headerID, i).state.state == state){
							index = i; break; }
					break;
				case this.rows_headers:
					for(let i=0; i < this.rows; i=this.indexOfFirstNextState(headerID, headers, i))
						if(this.Index2dToTile(i, headerID).state.state == state){
							index = i; break; }
					break;
				default:
					index = undefined;
					break;
			}
			console.log("indexOfFirstColor"+index);
			return index;
		}

		indexOfFirstNextTileState(headerID:number, headers:Array<Header>, from:number):number {
			let index:number = undefined;
			switch(headers){
				case this.cols_headers:
					for(let i=from; i < this.cols; i=this.indexOfFirstNextState(headerID, headers, i))
						if(this.Index2dToTile(headerID, i).state.state != this.tiles[from].state.state){
							index = i; break; }
					break;
				case this.rows_headers:
					for(let i=from; i < this.rows; i=this.indexOfFirstNextState(headerID, headers, i))
						if(this.Index2dToTile(i, headerID).state.state != this.tiles[from].state.state){
							index = i; break; }
					break;
				default:
					index = undefined;
					break;
			}
			console.log("indexOfFirstColor"+index);
			return index;
		}

		indexOfFirstColor(headerID:number, headers:Array<Header>):number {
			return this.indexOfFirstTileState(headerID, headers, TileState.Color);
		}*/
		
		/*indexOfNextColor(headerID:number, from:number, headers:Array<Header>):number {
			this.indexOfNextTile
		}*/

		invalid(headerID:number, headers:Array<Header>):void {	
			let coord:XY = this.headerToXY(headerID, headers, 0);
			let start:XY = this.headerToXY(headerID, headers, 0);;
			let end:XY = this.headerToXY(headerID, headers, 0);;
			
			headers[headerID].check.fill(false);

			console.log("-----");
			for(let i=headers[headerID].XYtoHeaderID_method(coord), currentnum=0; /*currentnum < headers[headerID].nums.length &&*/ coord.x < this.cols && coord.y < this.rows; i=headers[headerID].XYtoHeaderID_method(end)){
				console.log("SEARCH FOR NEXT INDICE");
				/*start = grid.find(coord.x, coord.y, headers[headerID].increase_method, grid.isSame, grid.getTileStateOfTile, TileState.Color);
				if(start.x < this.cols && start.y < this.rows){
					end = grid.nextSate(start.x, start.y, headers[headerID].increase_method);
					coord = end;
					console.log("segment"+(headers[headerID].XYtoHeaderID_method(end)-headers[headerID].XYtoHeaderID_method(start)));
				} else {
					end = new XY(this.cols, this.rows);
					break;
				}*/
				/*start = grid.find(coord.x, coord.y, headers[headerID].increase_method, grid.isSame, grid.getStateOfTile, headers[headerID].states[currentnum]);
				if(start.x < this.cols && start.y < this.rows){
					end = grid.nextSate(start.x, start.y, headers[headerID].increase_method);
					coord = end;
					if((headers[headerID].XYtoHeaderID_method(end)-headers[headerID].XYtoHeaderID_method(start)) == headers[headerID].nums[currentnum]){
						headers[headerID].check[currentnum] = true; currentnum++; console.log("true")}
					else break;
					console.log("segment"+(headers[headerID].XYtoHeaderID_method(end)-headers[headerID].XYtoHeaderID_method(start)));
				} else {
					//end = new XY(this.cols, this.rows);
					break;
				}*/
				start = this.find(coord.x, coord.y, headers[headerID].increase_method, this.isSame, this.getTileStateOfTile, TileState.Color);
				if(start.x < this.cols && start.y < this.rows){
					end = this.nextSate(start.x, start.y, headers[headerID].increase_method);
					coord = end;
					if(currentnum < headers[headerID].nums.length){
						if(this.Index2dToTile(start.x, start.y).state == headers[headerID].states[currentnum]){
							if((headers[headerID].XYtoHeaderID_method(end)-headers[headerID].XYtoHeaderID_method(start)) == headers[headerID].nums[currentnum]){
								headers[headerID].check[currentnum] = true; currentnum++;
								console.log("true");
							} else {console.log("false"); headers[headerID].check.fill(false); break;}
						} else {console.log("false"); headers[headerID].check.fill(false); break;}
					} else {console.log("more"); headers[headerID].check.fill(false); break;}
				} else {console.log("over"); break;}
			}
			console.log("stop");

			let validity:boolean = true;
			for(var i=0,n=headers[headerID].check.length; i<n; ++i)
				validity = validity && headers[headerID].check[i];
			if(validity == true && headers[headerID].validity == false) {
				this.scoreToVictory--
				headers[headerID].validity = true;
			}
			else if(validity == false && headers[headerID].validity == true) {
				this.scoreToVictory++
				headers[headerID].validity = false;
			}
		}

		DrawAll():void { // Draw the entire grid.
			for(let i=0; i < this.tiles.length; i++)
				this.DrawTile(i);
			for(let i=0; i < this.cols_headers.length; i++)
				this.DrawHeader(i, this.cols_headers);
			for(let i=0; i < this.rows_headers.length; i++)
				this.DrawHeader(i, this.rows_headers);
		}
	
		DrawTile(tileID:number):void { // Draw a Tile
			let tile:Tile = this.tiles[tileID];
			let x:number = this.IndexToX(tileID);
			let y:number = this.IndexToY(tileID);
			
			switch(tile.state.state){
				case TileState.Color:
					ctx.fillStyle = tile.state.color.getRgb();
					ctx.fillRect(x, y, this.size, this.size);
					break;
				case TileState.Blank:
					ctx.fillStyle = this.backgroundColor.getRgb();
					ctx.strokeStyle = this.fontColor.getRgb();
					ctx.fillRect(x, y, this.size, this.size);
					ctx.strokeRect(x+1, y+1, this.size-2, this.size-2);
					break;
				case TileState.Hint:
					ctx.fillStyle = this.backgroundColor.getRgb();
					ctx.strokeStyle = tile.state.color.getRgb();
					ctx.fillRect(x, y, this.size, this.size);
					ctx.strokeRect(x+1, y+1, this.size-2, this.size-2);
					break;
				default :
					break;
			}
		}

		DrawTileShadow(tileID:number):void {
			let x:number = this.IndexToX(tileID);
			let y:number = this.IndexToY(tileID);

			ctx.fillStyle = "rgba(50, 50, 50, 0.2)";
			ctx.fillRect(x, y, this.size, this.size);
		}

		DrawNum(headerID:number, numID:number, headers:Array<Header>):void {
			let x:number = 0;
			let y:number = 0;
			switch(headers){
				case this.cols_headers:
					x = this.offsetX + headerID*this.size;
					y = this.offsetY - (this.cols_headers[headerID].nums.length-numID)*this.size;
					break;
				case this.rows_headers:
					x = this.offsetX - (this.rows_headers[headerID].nums.length-numID)*this.size;
					y = this.offsetY + headerID*this.size;
					break;
				default:
					break;
			}

			//ctx.fillStyle = headers[headerID].colors[numID].getRgb();
			ctx.fillStyle = headers[headerID].states[numID].color.getRgb();
			ctx.strokeStyle = '#000000';
			ctx.fillRect(x, y, this.size, this.size);
			ctx.strokeRect(x+1, y+1, this.size-2, this.size-2);
			ctx.font = "32px monospace";
			ctx.textBaseline = "middle";
			ctx.textAlign = "center";
			if(headers[headerID].check[numID] == true)
				ctx.fillStyle = "#00FF00";
			else
				ctx.fillStyle = this.fontColor.getRgb();
			ctx.fillText(headers[headerID].nums[numID].toString(), x+this.size/2, y+this.size/2, this.size);
		}

		DrawHeader(headerID:number, headers:Array<Header>):void {
			// Draw each nums of this header
			for(let i=0; i < headers[headerID].nums.length; ++i) 
				this.DrawNum(headerID, i, headers);
		}
	
		onClick(x:number, y:number):void {
			//console.clear();
			if(this.XyIsOnGrid(x, y)){
				let tileID:number = this.XyToIndex(x, y);
				let colID = this.XyToVerticalHeaderIndex(x,y);
				let rowID = this.XyToHorizontalHeaderIndex(x,y);
				console.log("col"+colID+"row"+rowID);
				
				//if(this.tiles[tileID].state == this.nonogram[tileID].state)
					//++this.scoreToVictory;
				this.tiles[tileID].nextState();
				console.log("---VERTICAL---");
				this.invalid(colID, this.cols_headers);
				console.log("---HORIZONTAL---");
				this.invalid(rowID, this.rows_headers);
				//if(this.tiles[tileID].state == this.nonogram[tileID].state)
					//--this.scoreToVictory;
				this.DrawTile(tileID);
				this.DrawHeader(colID, this.cols_headers);
				this.DrawHeader(rowID, this.rows_headers);
				if(this.scoreToVictory == 0)
					alert("You Win !");
				else
					console.log("SCORE"+this.scoreToVictory);
			}
		}

		onMove(x:number, y:number):void {
		}

		saveTilesStates():void {
			let states:Array<number> = new Array(this.tiles.length);
			
			for(let i=0; i < this.states.length; ++i)
				this.states[i]["id"] = i; // add an id property to the colors

			for(let i=0; i < this.tiles.length; ++i)
				states[i] = this.tiles[i].state["id"];

			console.log("["+states+"]");
			for(let i=0; i < this.colors.length; i++)
				console.log(this.colors[i].toString());
		}

		increase_vertical(xy:XY):void {
			console.log("++y");
			xy.y++;
		}

		increase_horizontal(xy:XY):void {
			console.log("++x");
			xy.x++;
		}

		compare_TileState(tile:Tile, value:TileState):boolean {
			return tile.state.state == value;
		}

		compare_State(tile:Tile, value:State):boolean {
			return tile.state == value;
		}

		getStateOfTile(tile:Tile):State {
			return tile.state;
		}

		getTileStateOfTile(tile:Tile):TileState {
			return tile.state.state;
		}

		isSame(a:any, b:any):boolean {
			return a == b;
		}

		isNotSame(a:any, b:any):boolean {
			return a != b;
		}

		find(fromX:number, fromY:number, increase_function:(xy:XY)=>void, method:(a:any, b:any)=>boolean, compare:(tile:Tile)=>TileState|State, avec:TileState|State):XY {
			let xy = new XY(fromX, fromY);	
			console.log("search");
			for(; xy.x < this.cols && xy.y < this.rows; increase_function(xy)){
				if(method(compare(this.Index2dToTile(xy.x, xy.y)), avec)){
					console.log("find"+xy.x+";"+xy.y); break; }
				else console.log("next"+xy.x+";"+xy.y);
			}
			console.log("return"+xy.x+";"+xy.y);
			return xy;
		}

		nextSate(fromX:number, fromY:number, increase_function:(xy:XY)=>void):XY {
			console.log("search for next State");
			return this.find(fromX, fromY, increase_function, this.isNotSame, this.getStateOfTile, this.tiles[this.Index2dToIndex(fromX, fromY)].state);
		}

		nextTileSate(fromX:number, fromY:number, increase_function:(xy:XY)=>void):XY {
			console.log("search for next TileState");
			return this.find(fromX, fromY, increase_function, this.isNotSame, this.getTileStateOfTile, this.tiles[this.Index2dToIndex(fromX, fromY)].state.state);
		}
	}
	
	//const grid:Grid = new Grid(4, 6, 32, new Color(255, 255, 255), new Color(0, 0, 0), [new Color(255, 0, 255), new Color(255, 255, 0), new Color(0, 255, 0)], true, [0, 2, 0, 0, 0, 0, 2, 3, 1, 1, 0, 2, 1, 2, 0, 3, 1, 2, 0, 3, 0, 0, 0, 0], []);
	const grid:Grid = new Grid(15, 15, 24, new Color(255, 255, 255), new Color(0, 0, 0), [new Color(70, 70, 70)], true, [0,0,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,1,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,1,1,1,0,0,0,1,0,0,0,0,1,0,0,1,1,1,1,1,0,0,1,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,0,0], []);
	//const grid:Grid = new Grid(15, 15, 24, new Color(255, 255, 255), new Color(200, 200, 200), [new Color(0, 0, 0)], true, [0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,1,1,1,2,1,0,1,1,1,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,1,1,1,1,0,1,0,1,1,1,1,0,0,0,0,0,1,1,0,0,1,0,0,1,1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,0,0,0,0], []);
	//const grid:Grid = new Grid(5, 5, 24, new Color(255, 255, 255), new Color(200, 200, 200), [new Color(0, 0, 0)], true, [0,1,0,0,0,1,1,1,0,1,1,1,1,1,0,1,0,1,0,0,1,0,1,0,0], []);

	canvas.onmousedown = (e) => {
		/* le padding n'est pas pris en compte avec offsetXY */
		/* if click is outside the grid but in the canvas. so canvas must fit the grid, or XY must be check */
		grid.onClick(e.offsetX, e.offsetY);
	}

	canvas.onmousemove = (e) => {
		if(grid.XyIsOnGrid(e.offsetX, e.offsetY)){
			let index:number = grid.XyToIndex(e.offsetX, e.offsetY)	
			if(this.lastIndexMouseOver != index) {
				if(this.lastIndexMouseOver != undefined){
					//move on grid
					//console.log("redraw"+this.lastIndexMouseOver+"grey"+index);
					//grid.DrawTile(this.lastIndexMouseOver);
					for(let i=this.lastIndexMouseOver; i >= 0; i-=grid.cols)
						grid.DrawTile(i);
					for(let i=this.lastIndexMouseOver%grid.cols; i >= 0; --i)
						grid.DrawTile(this.lastIndexMouseOver-i);
					//grid.DrawTileShadow(index);
					for(let i=index; i >= 0; i-=grid.cols)
						grid.DrawTileShadow(i);
					for(let i=index%grid.cols; i >= 0; --i)
						grid.DrawTileShadow(index-i);
				}
				else {
					//enter grid
					//console.log("grey"+index);
					for(let i=index; i >= 0; i-=grid.cols)
						grid.DrawTileShadow(i);
					for(let i=index%grid.cols; i >= 0; --i)
						grid.DrawTileShadow(index-i);
				}
			}
			this.lastIndexMouseOver = index;
		}
		else if (this.lastIndexMouseOver != undefined) {
			//exit grid
			//console.log("redraw"+this.lastIndexMouseOver);
			for(let i=this.lastIndexMouseOver; i >= 0; i-=grid.cols)
				grid.DrawTile(i);
			for(let i=this.lastIndexMouseOver%grid.cols; i >= 0; --i)
				grid.DrawTile(this.lastIndexMouseOver-i);
			this.lastIndexMouseOver = undefined;
		}
	}


	/*canvas.ondblclick = (e) => {
		grid.saveTilesStates();
	}*/

	canvas.oncontextmenu = (e) => {
		grid.saveTilesStates();
	}
	
	window.onload = () => { // CHECK BACKWARD COMPABILITY
		// Here, all Image() as completly loaded, and we can draw them on canvas
			//console.log("index"+grid.Index2dToIndex(3,4));
			grid.DrawAll();
			if(grid.Index2dToTile(0, 3).state == grid.tiles[8].state)
				console.log("same state");
			else
				console.log("diff");
			if(grid.cols_headers[0].states[0] == grid.Index2dToTile(0, 3).state)
				console.log("same state");
			else
				console.log("diff");

			//console.clear();
			console.log(grid.offsetX);
			console.log(grid.offsetY);
			//grid.invalid(0, grid.cols_headers);
			//grid.nextSate(0, 2, grid.increase_vertical);
			//grid.find(1, 2, grid.increase_vertical, grid.isSame, grid.getTileStateOfTile, TileState.Color)
			//grid.colors[1].setRgb(0, 0, 255);
			//grid.DrawAll();
			//console.log(Header.invalideColor.getRgb());
	}