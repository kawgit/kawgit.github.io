
// CONSTANTS FOR BOARD AND PIECE REPRESENTATION
const SQUARENONE = 64;
const EPNONE = 8;
function rc(row, col) { return row*8+col; }

const COLORMASK = 0b11000;
const PIECEMASK = 0b00111;

const PAWN = 	0b000;
const KNIGHT =  0b001;
const BISHOP =  0b010;
const ROOK =    0b011;
const QUEEN =   0b100;
const KING =    0b101;

const WHITE = 0b10000;
const BLACK = 0b01000;

function not_color(color) { return (color == WHITE ? BLACK : WHITE); }

const BLACK_PAWN   = BLACK | PAWN;
const BLACK_KNIGHT = BLACK | KNIGHT;
const BLACK_BISHOP = BLACK | BISHOP;
const BLACK_ROOK   = BLACK | ROOK;
const BLACK_QUEEN  = BLACK | QUEEN;
const BLACK_KING   = BLACK | KING;
const WHITE_PAWN   = WHITE | PAWN;
const WHITE_KNIGHT = WHITE | KNIGHT;
const WHITE_BISHOP = WHITE | BISHOP;
const WHITE_ROOK   = WHITE | ROOK;
const WHITE_QUEEN  = WHITE | QUEEN;
const WHITE_KING   = WHITE | KING;

const PIECENONE = (WHITE | BLACK | KING) + 1;

function index_pc(pc) {
	return (PIECEMASK & pc) + (((pc & BLACK) != 0) ? 6 : 0);
}

function get_sq_SAN(sq) {
	return String.fromCharCode((sq % 8)+97) + String.fromCharCode(Math.floor(sq / 8)+49);
}

//	castle rights

//castle rights indexes
const I_WKS = 0;
const I_WQS = 1;
const I_BKS = 2;
const I_BQS = 3;

const F_WKS = 1<<I_WKS;
const F_WQS = 1<<I_WQS;
const F_BKS = 1<<I_BKS;
const F_BQS = 1<<I_BQS;

//	MOVE REPRESENTATION

const MOVENONE = 0;

//  ->MOVE FLAGS
const F_QUIET = 			0b0000; 	// quiet moves
const F_DOUBLE_PAWN_PUSH = 	0b0001; 	// double pawn push
const F_KINGCASTLE = 		0b0010; 	// king castle
const F_QUEENCASTLE = 		0b0011; 	// queen castle
const F_CAPTURE = 			0b0100; 	// captures
const F_EP = 				0b0101; 	// ep-capture
const F_PROM = 				0b1000; 	// promotion, promotion piece is encoded in latter two bits starting with KNIGHT at 00

function make_move(from_sq, to_sq, flags) {
	return (flags << 12) | (from_sq << 6) | to_sq;
}

function get_flags(move) 	{ return (move & 0xF000) >> 12; 		}
function get_from(move) 	{ return (move & 0b111111000000) >> 6;  }
function get_to(move) 		{ return  move & 0b000000111111;		}
function get_promotion_piece(move) { return (get_flags(move) & 0b11) + KNIGHT; }

function get_SAN(move) {
	return get_sq_SAN(get_from(move)) + get_sq_SAN(get_to(move));// + ((get_flags & F_PROM) != 0 ?  piece_to_char.get(get_promotion_piece(move)+ BLACK_KNIGHT) : "");
}

//	->PIECE MOVEMENT DATA
const knight_directions = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
const bishop_directions = [[1, 1], [1, -1], [-1, -1], [-1, 1]];
const rook_directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
const queen_directions = [[0, 1], [1, 0], [0, -1], [-1, 0], [1, 1], [1, -1], [-1, -1], [-1, 1]];

//	MAPS FOR IO

let char_to_piece = new Map(); char_to_piece.set(" ",PIECENONE); char_to_piece.set("p",BLACK_PAWN); char_to_piece.set("n",BLACK_KNIGHT); char_to_piece.set("b",BLACK_BISHOP); char_to_piece.set("r",BLACK_ROOK); char_to_piece.set("q",BLACK_QUEEN); char_to_piece.set("k",BLACK_KING); char_to_piece.set("P",WHITE_PAWN); char_to_piece.set("N",WHITE_KNIGHT); char_to_piece.set("B",WHITE_BISHOP); char_to_piece.set("R",WHITE_ROOK); char_to_piece.set("Q",WHITE_QUEEN); char_to_piece.set("K",WHITE_KING);

let piece_to_char = new Map(); piece_to_char.set(PIECENONE, " "); piece_to_char.set(BLACK_PAWN, "p"); piece_to_char.set(BLACK_KNIGHT, "n"); piece_to_char.set(BLACK_BISHOP, "b"); piece_to_char.set(BLACK_ROOK, "r"); piece_to_char.set(BLACK_QUEEN, "q"); piece_to_char.set(BLACK_KING, "k"); piece_to_char.set(WHITE_PAWN, "P"); piece_to_char.set(WHITE_KNIGHT, "N"); piece_to_char.set(WHITE_BISHOP, "B"); piece_to_char.set(WHITE_ROOK, "R"); piece_to_char.set(WHITE_QUEEN, "Q"); piece_to_char.set(WHITE_KING, "K");

//	POSITION HASHING VARIABLES

const HASHLENGTH = 32;
const HASHMAX = 1<<HASHLENGTH - 1;
function get_rand_hash() {
	let hash = 0;
	for (let i = 0; i < 10; i++) hash ^= Math.floor(Math.random() * HASHMAX);
	return hash;
}
let sq_pc_hashes = new Array(64);
let ep_hashes = new Array(9).fill(0);
let cr_hashes = new Array(4).fill(0);
let turn_hash = get_rand_hash();

for (let sq = 0; sq < 64; sq++) {
	sq_pc_hashes[sq] = new Array(13).fill(0);
	for (let pc = 0; pc < 12; pc++) { //purposely leave PIECENONE hash as 0
		sq_pc_hashes[sq][pc] = get_rand_hash();
	}
}

for (let col = 0; col < 8; col++) ep_hashes[col] = get_rand_hash();

for (let i = 0; i < 4; i++) cr_hashes[i] = get_rand_hash();

//	POSITION evaluationUATION CONSTANTS

const material_values = [100, 320, 330, 500, 900, 0];

const INF = 32767;

const evaluation_maps = [
		[
			0,  0,  0,  0,  0,  0,  0,  0,
			5, 10, 10,-30,-30, 10, 10,  5,
			5, -5,-10,  0,  0,-10, -5,  5,
			5,  5, 10, 25, 25, 10,  5,  5,
			0,  0,  0, 20, 20,  0,  0,  0,
			10, 10, 20, 30, 30, 20, 10, 10,
			50, 50, 50, 50, 50, 50, 50, 50,
			0,  0,  0,  0,  0,  0,  0,  0,
		],
		[
			-50,-40,-30,-30,-30,-30,-40,-50,
			-40,-20,  0,  5,  5,  0,-20,-40,
			-30,  5, 10, 15, 15, 10,  5,-30,
			-30,  5, 15, 20, 20, 15,  5,-30,
			-30,  0, 15, 20, 20, 15,  0,-30,
			-30,  0, 10, 15, 15, 10,  0,-30,
			-40,-20,  0,  0,  0,  0,-20,-40,
			-50,-40,-30,-30,-30,-30,-40,-50,
		],
		[
			-20,-10,-10,-10,-10,-10,-10,-20,
			-10,  5,  0,  0,  0,  0,  5,-10,
			-10, 10, 10, 10, 10, 10, 10,-10,
			-10,  5,  5, 10, 10,  5,  5,-10,
			-10,  0, 10, 10, 10, 10,  0,-10,
			-10,  0,  5, 10, 10,  5,  0,-10,
			-10,  0,  0,  0,  0,  0,  0,-10,
			-20,-10,-10,-10,-10,-10,-10,-20,
		],
		[
			0,  0,  0,  8,  8,  0,  0,  0,
			-5,  0,  0,  0,  0,  0,  0, -5,
			-5,  0,  0,  0,  0,  0,  0, -5,
			-5,  0,  0,  0,  0,  0,  0, -5,
			-5,  0,  0,  0,  0,  0,  0, -5,
			-5,  0,  0,  0,  0,  0,  0, -5,
			5, 15, 15, 15, 15, 15, 15,  5,
			0,  0,  0,  0,  0,  0,  0,  0,
		],
		[
			-20,-10,-10, -5, -5,-10,-10,-20,
			-10,  0,  5,  0,  0,  0,  0,-10,
			-10,  5,  5,  5,  5,  5,  0,-10,
			-5,  0,  5,  5,  5,  5,  0, -5,
			0,  0,  5,  5,  5,  5,  0, -5,
			-10,  0,  5,  5,  5,  5,  0,-10,
			-10,  0,  0,  0,  0,  0,  0,-10,
			-20,-10,-10, -5, -5,-10,-10,-20,
		],
		[
			[
			-30,-40,-40,-50,-50,-40,-40,-30,
			-30,-40,-40,-50,-50,-40,-40,-30,
			-30,-40,-40,-50,-50,-40,-40,-30,
			-30,-40,-40,-50,-50,-40,-40,-30,
			-20,-30,-30,-40,-40,-30,-30,-20,
			-10,-20,-20,-20,-20,-20,-20,-10,
			20, 20,  0,  0,  0,  0, 20, 20,
			20, 30, 10,  0,  0, 10, 30, 20
			],
			[
				-20,-10,-10, -5, -5,-10,-10,-20,
				-10,  0,  0,  0,  0,  0,  0,-10,
				-10,  0,  5,  5,  5,  5,  0,-10,
				-5,  0,  5,  5,  5,  5,  0, -5,
				0,  0,  5,  5,  5,  5,  0, -5,
				-10,  5,  5,  5,  5,  5,  0,-10,
				-10,  0,  5,  0,  0,  0,  0,-10,
				-20,-10,-10, -5, -5,-10,-10,-20
			]
		],
		[
			0,  0,  0,  0,  0,  0,  0,  0,
			50, 50, 50, 50, 50, 50, 50, 50,
			10, 10, 20, 30, 30, 20, 10, 10,
			5,  5, 10, 25, 25, 10,  5,  5,
			0,  0,  0, 20, 20,  0,  0,  0,
			5, -5,-10,  0,  0,-10, -5,  5,
			5, 10, 10,-30,-30, 10, 10,  5,
			0,  0,  0,  0,  0,  0,  0,  0
		],
		[
			-50,-40,-30,-30,-30,-30,-40,-50,
			-40,-20,  0,  0,  0,  0,-20,-40,
			-30,  0, 10, 15, 15, 10,  0,-30,
			-30,  5, 15, 20, 20, 15,  5,-30,
			-30,  0, 15, 20, 20, 15,  0,-30,
			-30,  5, 10, 15, 15, 10,  5,-30,
			-40,-20,  0,  5,  5,  0,-20,-40,
			-50,-40,-30,-30,-30,-30,-40,-50,
		],
		[
			-20,-10,-10,-10,-10,-10,-10,-20,
			-10,  0,  0,  0,  0,  0,  0,-10,
			-10,  0,  5, 10, 10,  5,  0,-10,
			-10,  5,  5, 10, 10,  5,  5,-10,
			-10,  0, 10, 10, 10, 10,  0,-10,
			-10, 10, 10, 10, 10, 10, 10,-10,
			-10,  5,  0,  0,  0,  0,  5,-10,
			-20,-10,-10,-10,-10,-10,-10,-20,
		],
		[
			0,  0,  0,  0,  0,  0,  0,  0,
			5, 15, 15, 15, 15, 15, 15,  5,
			-5,  0,  0,  0,  0,  0,  0, -5,
			-5,  0,  0,  0,  0,  0,  0, -5,
			-5,  0,  0,  0,  0,  0,  0, -5,
			-5,  0,  0,  0,  0,  0,  0, -5,
			-5,  0,  0,  0,  0,  0,  0, -5,
			0,  0,  0,  8,  8,  0,  0,  0
		],
		[
			-20,-10,-10, -5, -5,-10,-10,-20,
			-10,  0,  0,  0,  0,  0,  0,-10,
			-10,  0,  5,  5,  5,  5,  0,-10,
			-5,  0,  5,  5,  5,  5,  0, -5,
			0,  0,  5,  5,  5,  5,  0, -5,
			-10,  5,  5,  5,  5,  5,  0,-10,
			-10,  0,  5,  0,  0,  0,  0,-10,
			-20,-10,-10, -5, -5,-10,-10,-20
		],
		[
			[
			-30,-40,-40,-50,-50,-40,-40,-30,
			-30,-40,-40,-50,-50,-40,-40,-30,
			-30,-40,-40,-50,-50,-40,-40,-30,
			-30,-40,-40,-50,-50,-40,-40,-30,
			-20,-30,-30,-40,-40,-30,-30,-20,
			-10,-20,-20,-20,-20,-20,-20,-10,
			20, 20,  0,  0,  0,  0, 20, 20,
			20, 30, 10,  0,  0, 10, 30, 20
			],
			[
				-20,-10,-10, -5, -5,-10,-10,-20,
				-10,  0,  0,  0,  0,  0,  0,-10,
				-10,  0,  5,  5,  5,  5,  0,-10,
				-5,  0,  5,  5,  5,  5,  0, -5,
				0,  0,  5,  5,  5,  5,  0, -5,
				-10,  5,  5,  5,  5,  5,  0,-10,
				-10,  0,  5,  0,  0,  0,  0,-10,
				-20,-10,-10, -5, -5,-10,-10,-20
			]
		]
	];

//	TT CONSTANTS

const LB = 0;
const EXACT = 1;
const UB = 2;

class Pos {
	
	constructor(fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1") {
		
		this.mailboxes = new Array(64).fill(PIECENONE);
		this.ledger = new Array(12);
		for (let i = 0; i < 12; i++) this.ledger[i] = [];
		this.turn = WHITE;
		this.notturn = not_color(WHITE);
		this.cr = 0;
		this.ep = EPNONE;
		this.hashkey = 0;
		this.m_clock = 0;
		this.hm_clock = 0;

		this.move_log = [];
		this.to_pc_log = [];
		this.cr_log = [];
		this.ep_log = [];
		this.hm_clock_log = [];
		this.hashkey_log = [];

		let row = 7;
		let col = 0;
		let i = 0;

		while (row >= 0) {
			if (fen.charCodeAt(i) >= 48 && fen.charCodeAt(i) <= 57) {
				col += fen.charCodeAt(i)-48;
			}
			else if (fen[i] != '/') {
				let sq = row*8+col;
				let pc = char_to_piece.get(fen[i]);
				this.mailboxes[sq] = pc;
				this.hashkey ^= sq_pc_hashes[sq][index_pc(pc)];
				this.ledger[index_pc(this.mailboxes[sq])].push(sq);
				col++;
			}
			if (col > 7) {
				row--;
				col = 0;
			}
			i++;
		}

		fen = fen.substring(fen.indexOf(' ')+1, fen.length);

		if (fen.indexOf("w") == -1) {
			this.turn = BLACK;
			this.notturn = WHITE;
			this.hashkey ^= turn_hash;
		}

		fen = fen.substring(fen.indexOf(' ')+1, fen.length);

		if (fen.indexOf("K") != -1) {
			this.cr |= F_WKS;
			this.hashkey ^= cr_hashes[I_WKS];
		}
		if (fen.indexOf("Q") != -1) {
			this.cr |= F_WQS;
			this.hashkey ^= cr_hashes[I_WQS];
		}
		if (fen.indexOf("k") != -1) {
			this.cr |= F_BKS;
			this.hashkey ^= cr_hashes[I_BKS];
		}
		if (fen.indexOf("q") != -1) {
			this.cr |= F_BQS;
			this.hashkey ^= cr_hashes[I_BQS];
		}

		fen = fen.substring(fen.indexOf(' ')+1, fen.length);

		if (fen[0] != '-') {
			let col = fen.charCodeAt(0)-97;
			this.ep = col;
			this.hashkey ^= ep_hashes[this.ep];
		}

		fen = fen.substring(fen.indexOf(' ')+1, fen.length);

		this.hm_clock = parseInt(fen.substring(0, fen.indexOf(' ')));
		this.m_clock = parseInt(fen.substring(fen.indexOf(' ') + 1, fen.length));
	}

	set_piece(sq, pc) {

		//update ledger

		if (this.mailboxes[sq] != PIECENONE) this.ledger[index_pc(this.mailboxes[sq])].splice(this.ledger[index_pc(this.mailboxes[sq])].indexOf(sq), 1);

		//	update mailboxes and update hash
		
		this.hashkey ^= sq_pc_hashes[sq][index_pc(this.mailboxes[sq])];
		this.mailboxes[sq] = pc;
		this.hashkey ^= sq_pc_hashes[sq][index_pc(this.mailboxes[sq])];

		if (this.mailboxes[sq] != PIECENONE) this.ledger[index_pc(this.mailboxes[sq])].push(sq);
	}

	set_ep(col) {
		this.hashkey ^= ep_hashes[this.ep];
		this.ep = col;
		this.hashkey ^= ep_hashes[this.ep];
	}

	switch_turn() {
		this.turn = this.notturn;
		this.notturn = not_color(this.turn);
		this.hashkey ^= turn_hash;
	}

	switch_cr(index) {
		this.cr ^= 1<<index;
		this.hashkey ^= cr_hashes[index];
	}
	
	get_fen() {
		let fen = "";
		for (let row = 7; row >= 0; row--) {
			
			let cnt = 0;
			
			for (let col = 0; col < 8; col++) {
				let piece = this.mailboxes[row*8+col];
				if (piece == PIECENONE) {
					cnt++
				}
				else {	
					if (cnt != 0) fen += cnt.toString();
					cnt = 0;
					fen += piece_to_char.get(piece);
				}
			}

			if (cnt != 0) fen += cnt.toString();
			if (row != 0) fen += "/";
		}

		fen += this.turn == WHITE ? " w " : " b ";

		if ((this.cr & F_WKS) != 0) fen += "K";
		if ((this.cr & F_WQS) != 0) fen += "Q";
		if ((this.cr & F_BKS) != 0) fen += "k";
		if ((this.cr & F_BQS) != 0) fen += "q";

		fen += " ";

		if (this.ep == EPNONE) {
			fen += "-";
		}
		else {
			fen += get_sq_SAN(rc(this.turn == WHITE ? 5 : 2, this.ep));
		}

		fen += " " + this.hm_clock.toString() + " " + this.m_clock.toString();
		
		return fen;
	}

	print() {
		let msg = "";
		
		for (let row = 7; row >= 0; row--) {
			msg += "+---+---+---+---+---+---+---+---+\n";
			for (let col = 0; col < 8; col++) {
				let piece = this.mailboxes[row*8+col];
				msg += "| " + piece_to_char.get(piece) + " ";
			}
			msg += "|\n";
		}
		msg += "+---+---+---+---+---+---+---+---+\n";
		msg += "turn: " + (this.turn == WHITE ? "white" : "black") + "\n";
		msg += "castle rights: ";
		if ((this.cr & F_WKS) != 0) msg += "K";
		if ((this.cr & F_WQS) != 0) msg += "Q";
		if ((this.cr & F_BKS) != 0) msg += "k";
		if ((this.cr & F_BQS) != 0) msg += "q";
		msg += "\n";

		msg += "ep: " + (this.ep == EPNONE ? "-" :  String.fromCharCode(this.ep+97)) + "\n";

		msg += "move clock: " + this.m_clock.toString() + "\n";
		msg += "half move clock: " + this.hm_clock.toString() + "\n";
		
		msg += "hashkey: " + this.hashkey.toString(16) + "\n";

		msg += "fen: " + this.get_fen() + "\n";
		
		console.log(msg);
	}

	do_move(move) {
		// 	define some important variables for making the move
		let flags = get_flags(move);
		let from = get_from(move);
		let to = get_to(move);
		let from_pc = this.mailboxes[from] & PIECEMASK;
		let to_pc = this.mailboxes[to] != PIECENONE ? this.mailboxes[to] & PIECEMASK : PIECENONE;
		
		// 	log any lost information so that we can undo any moves made
		this.move_log.push(move);
		this.cr_log.push(this.cr);
		this.ep_log.push(this.ep);
		this.hm_clock_log.push(this.hm_clock);
		this.to_pc_log.push(to_pc);
		this.hashkey_log.push(this.hashkey);

		//	update move clocks
		if (flags & F_CAPTURE != 0 || from_pc == PAWN) this.hm_clock = 0;
		else this.hm_clock++;
		if (this.turn == BLACK) this.m_clock++;

		//	by defualt set en passant rule to none
		this.set_ep(EPNONE);

		// 	starts the logic to handle re-arranging pieces

		this.set_piece(from, PIECENONE); //	remove piece from previous square

		if ((flags & F_PROM) != 0) this.set_piece(to, get_promotion_piece(move) | this.turn) //	if its a pawn promotion, put down whatever the promotion type is
		else this.set_piece(to, from_pc | this.turn) // else put down the from-piece

		//	time to handle special cases like double pawn pushes, en passant, and castling
		if (flags != F_QUIET) {
			if (flags == F_EP) this.set_piece(to + (this.turn == WHITE ? -8 : 8), PIECENONE); // if its an en-passant, remove pawn
			else if (flags == F_DOUBLE_PAWN_PUSH) {
				let to_col = to % 8;
				if ((to_col != 7 && this.mailboxes[to+1] == (PAWN | this.notturn)) || (to_col != 0 && this.mailboxes[to-1] == (PAWN | this.notturn)))
					this.set_ep(to % 8);	// if its a double pawn push and some pawn is in a position to en-passant, set the en-passant
			}
			else if (flags == F_KINGCASTLE) {
				if (this.turn == WHITE) {
					this.set_piece(7, PIECENONE);
					this.set_piece(5, ROOK | this.turn);
				}
				else {
					this.set_piece(63, PIECENONE);
					this.set_piece(61, ROOK | this.turn);
				}
			}
			else if (flags == F_QUEENCASTLE) {
				if (this.turn == WHITE) {
					this.set_piece(0, PIECENONE);
					this.set_piece(3, ROOK | this.turn);
				}
				else {
					this.set_piece(56, PIECENONE);
					this.set_piece(59, ROOK | this.turn);
				}
			}
		}

		//	update castling rights 
		if (this.cr != 0) {
			if (this.turn == WHITE) {
				if (from_pc == ROOK) {
					if ((this.cr & F_WKS) != 0 && from == 7) this.switch_cr(I_WKS);
					if ((this.cr & F_WQS) != 0 && from == 0) this.switch_cr(I_WQS);
				}
				if (from_pc == KING) {
					if ((this.cr & F_WKS) != 0) this.switch_cr(I_WKS);
					if ((this.cr & F_WQS) != 0) this.switch_cr(I_WQS);
				}
				if (to_pc == ROOK) {
					if ((this.cr & F_BKS) != 0 && to == 63) this.switch_cr(I_BKS);
					if ((this.cr & F_BQS) != 0 && to == 56) this.switch_cr(I_BQS);
				}
			}
			else {
				if (from_pc == ROOK) {
					if ((this.cr & F_BKS) != 0 && from == 63) this.switch_cr(I_BKS);
					if ((this.cr & F_BQS) != 0 && from == 56) this.switch_cr(I_BQS);
				}
				if (from_pc == KING) {
					if ((this.cr & F_BKS) != 0) this.switch_cr(I_BKS);
					if ((this.cr & F_BQS) != 0) this.switch_cr(I_BQS);
				}
				if (to_pc == ROOK) {
					if ((this.cr & F_WKS) != 0 && to == 7) this.switch_cr(I_WKS);
					if ((this.cr & F_WQS) != 0 && to == 0) this.switch_cr(I_WQS);
				}
			}
		}

		this.switch_turn();
	}

	undo_move() {
		this.switch_turn();
		
		let move = this.move_log.pop();
		
		// 	define some important variables for undoing the move
		let flags = get_flags(move);
		let from = get_from(move);
		let to = get_to(move);
		let from_pc = (((flags & F_PROM) != 0) ? PAWN : (this.mailboxes[to] & PIECEMASK));
		let to_pc = this.to_pc_log.pop();

		//	add piece to from-square

		this.set_piece(from, from_pc | this.turn);

		//	add captured piece to to-square
		
		this.set_piece(to, to_pc | this.notturn);

		//	special cases for castling and en passant

		if (flags != 0) {
			if (flags == F_EP) {
				this.set_piece(to+(this.turn == WHITE ? -8 : 8), PIECENONE);
			}
			else if (flags == F_KINGCASTLE) {
				if (this.turn == WHITE) {
					this.set_piece(7, ROOK | this.turn);
					this.set_piece(5, PIECENONE);
				}
				else {
					this.set_piece(63, ROOK | this.turn);
					this.set_piece(61, PIECENONE);
				}
			}
			else if (flags == F_QUEENCASTLE) {
				if (this.turn == WHITE) {
					this.set_piece(0, ROOK | this.turn);
					this.set_piece(3, PIECENONE);
				}
				else {
					this.set_piece(56, ROOK | this.turn);
					this.set_piece(59, PIECENONE);
				}
			}
		}
		
		if (this.turn == BLACK) this.m_clock--;
		this.set_ep(this.ep_log.pop());
		this.hm_clock = this.hm_clock_log.pop();
		this.cr = this.cr_log.pop();		
		this.hashkey = this.hashkey_log.pop();
	}

	is_in_check(color) {
		return this.does_color_atk_sq(not_color(color), this.ledger[index_pc(KING | color)][0]);
	}

	get_pins_and_checks() {
		let pnc = {checks: 0, moveable: new Array(64).fill(false), pinned: new Array(64).fill(false),pins: new Array, is_ep_pinned: false}; //pnc = pins 'n checks

		let ksq = this.ledger[index_pc(KING | this.turn)][0];
		
		let ksq_col = ksq % 8;
		let ksq_row = Math.floor(ksq / 8);

		//	check for pawn check

		if (this.turn == WHITE) {
			if (ksq_col != 7 && this.mailboxes[ksq + 9] == BLACK_PAWN) {
				pnc.checks++;
				pnc.moveable[ksq + 9] = true;
			}
			else if (ksq_col != 0 && this.mailboxes[ksq + 7] == BLACK_PAWN) {
				pnc.checks++;
				pnc.moveable[ksq + 7] = true;
			}
		}
		else {
			if (ksq_col != 0 && this.mailboxes[ksq - 9] == WHITE_PAWN) {
				pnc.checks++;
				pnc.moveable[ksq - 9] = true;
			}
			else if (ksq_col != 7 && this.mailboxes[ksq - 7] == WHITE_PAWN) {
				pnc.checks++;
				pnc.moveable[ksq - 7] = true;
			}
		}
		
		//	check for knight check

		for (let d = 0; d < 8; d++) {
			let c = ksq_col + knight_directions[d][0];
			let r = ksq_row + knight_directions[d][1];
			if (c >= 0 && c <= 7 && r >= 0 && r <= 7) {
				let sq = rc(r, c);
				if (this.mailboxes[sq] == (KNIGHT | this.notturn)) {
					pnc.checks++;
					pnc.moveable[sq] = true;
					if (pnc.checks == 2) return pnc;
				}
			}
		}

		
		
		//	check for sliding piece (bishop, rook, and queen) checks and pins
		
		for (let d = 0; d < 8; d++) { //	direction
			let pinned = SQUARENONE;
			let found_squares = [];
	
			for (let m = 1; m <= 7; m++) { //	magnitude
				let c = ksq_col + queen_directions[d][0] * m;
				let r = ksq_row + queen_directions[d][1] * m;
			
				if (c >= 0 && c <= 7 && r >= 0 && r <= 7) {
					let sq = rc(r, c);
					found_squares.push(sq);
					let pc = this.mailboxes[sq];
					if (pc != PIECENONE) {
						
						let pc_type = pc & PIECEMASK;
						let pc_color = pc & COLORMASK;
						if (pinned == SQUARENONE) {
							if (pc_color == this.turn) {
								pinned = sq;
							}
							else {
								if ((d < 4 && (pc_type == QUEEN || pc_type == ROOK)) || (d >= 4 && (pc_type == QUEEN || pc_type == BISHOP))) {
									pnc.checks++;
									for (let i in found_squares) pnc.moveable[found_squares[i]] = true;
									if (pnc.checks == 2) return pnc;
								}
								break;
							}
						}
						else {
							if (pc_color == this.notturn && ((d < 4 && (pc_type == QUEEN || pc_type == ROOK)) || (d >= 4 && (pc_type == QUEEN || pc_type == BISHOP)))) {
								pnc.pinned[pinned] = true;
								pnc.pins.push({pinned: pinned, squares: found_squares});
							}
							break;
						}
					}
				}
				else break;
			}
		}

		if (pnc.checks == 2) return pnc;

		// en passant special case pin

		if (this.ep != EPNONE) {
			this.is_ep_pinned = true; //not technically correct but only causes problems in a few select positions
		}

		if (pnc.checks == 0) for (let i = 0; i < 64; i++) pnc.moveable[i] = true;

		return pnc;
	}

	

	add_pawn_moves(moves, pnc) {
		
		let ledger_index = index_pc(PAWN | this.turn);
		let num = this.ledger[ledger_index].length;

		let lcol = 0;
		let rcol = 7;
		let p1 = 8;
		let rt = 9;
		let lt = 7;
		let right = 1;
		let pawn_start_rank = 1;
		let ep_rank = 4;
		let promotion_rank = 6;
		if (this.turn == BLACK) {
			lcol = 7;
			rcol = 0;
			p1 = -8;
			rt = -9;
			lt = -7;
			right = -1;
			pawn_start_rank = 6;
			ep_rank = 3;
			promotion_rank = 1;
		}
		
		for (let i = 0; i < num; i++) {
			let from = this.ledger[ledger_index][i];

			let col = from % 8;
			let row = Math.floor(from / 8);

			let pinned = pnc.pinned[from];
			let pin = null;

			if (pinned) {
				for (let j in pnc.pins) {
					if (pnc.pins[j].pinned == from) {
						pin = pnc.pins[j];
					}
				}	
			}

			if (row == promotion_rank) {
				if (this.mailboxes[from+p1] == PIECENONE && (pnc.checks == 0 || pnc.moveable[from+p1]) && (!pinned || pin.squares.includes(from+p1))) for (let pc = 3; pc >= 0; pc--) moves.push(make_move(from, from+p1, F_PROM | pc));
				if (col != rcol && (this.mailboxes[from+rt] & COLORMASK) == this.notturn && (pnc.checks == 0 || pnc.moveable[from+rt]) && (!pinned || pin.squares.includes(from+rt))) for (let pc = 3; pc >= 0; pc--) moves.push(make_move(from, from+rt, F_CAPTURE | F_PROM | pc));
				if (col != lcol && (this.mailboxes[from+lt] & COLORMASK) == this.notturn && (pnc.checks == 0 || pnc.moveable[from+lt]) && (!pinned || pin.squares.includes(from+lt))) for (let pc = 3; pc >= 0; pc--) moves.push(make_move(from, from+lt, F_CAPTURE | F_PROM | pc));
			}
			else {
				if (this.mailboxes[from+p1] == PIECENONE && (!pinned || pin.squares.includes(from+p1))) {
					if (pnc.checks == 0 || pnc.moveable[from+p1]) moves.push(make_move(from, from+p1, F_QUIET));
					if (row == pawn_start_rank && this.mailboxes[from+p1+p1] == PIECENONE && (pnc.checks == 0 || pnc.moveable[from+p1+p1])) {
						moves.push(make_move(from, from+p1+p1, F_DOUBLE_PAWN_PUSH));
					}
				}
				if (col != rcol && (this.mailboxes[from+rt] != PIECENONE && (this.mailboxes[from+rt] & this.notturn) != 0) && (!pinned || pin.squares.includes(from+rt)) && (pnc.checks == 0 || pnc.moveable[from+rt])) moves.push(make_move(from, from+rt, F_CAPTURE));
				if (col != lcol && (this.mailboxes[from+lt] != PIECENONE && (this.mailboxes[from+lt] & this.notturn) != 0) && (!pinned || pin.squares.includes(from+lt)) && (pnc.checks == 0 || pnc.moveable[from+lt])) moves.push(make_move(from, from+lt, F_CAPTURE));	
	
				if (this.ep != EPNONE && row == ep_rank) {
					if (col + right == this.ep && col != rcol && !this.is_ep_pinned && (!pinned || (pin.squares.includes(from+rt)))) moves.push(make_move(from, from+rt, F_EP));
					if (col - right == this.ep && col != lcol && !this.is_ep_pinned && (!pinned || (pin.squares.includes(from+lt)))) moves.push(make_move(from, from+lt, F_EP));
				}
			}
		}
	}

	add_knight_moves(moves, pnc) {
		let index = index_pc(KNIGHT | this.turn);
		let size = this.ledger[index].length;
		for (let pc = 0; pc < size; pc++) {
			let from = this.ledger[index][pc];
			let from_row = Math.floor(from / 8);
			let from_col = from % 8;

			let pinned = pnc.pinned[from];
			let pin = null;

			if (pinned) {
				for (let j in pnc.pins) {
					if (pnc.pins[j].pinned == from) {
						pin = pnc.pins[j];
					}
				}	
			}
			
			for (let d = 0; d < 8; d++) {
				let to_col = from_col + knight_directions[d][0];
				let to_row = from_row + knight_directions[d][1];

				if (to_row >= 0 && to_row <= 7 && to_col >= 0 && to_col <= 7) {
					let to = rc(to_row, to_col);
					
					if ((!pinned || pin.squares.includes(to)) && (pnc.checks == 0 || pnc.moveable[to])) {
						if (this.mailboxes[to] == PIECENONE) {
							moves.push(make_move(from, to, F_QUIET));
						}
						else if ((this.mailboxes[to] & this.notturn) != 0) {
							moves.push(make_move(from, to, F_CAPTURE));
						}
					}
				}
			}
		}
	}

	add_bishop_moves(moves, pnc) {
		let index = index_pc(BISHOP | this.turn);
		let size = this.ledger[index].length;
		for (let pc = 0; pc < size; pc++) {
			let from = this.ledger[index][pc];
			let from_row = Math.floor(from / 8);
			let from_col = from % 8;

			let pinned = pnc.pinned[from];
			let pin = null;

			if (pinned) {
				for (let j in pnc.pins) {
					if (pnc.pins[j].pinned == from) {
						pin = pnc.pins[j];
					}
				}	
			}
			
			for (let d = 0; d < 4; d++) {
				for (let m = 1; m <= 7; m++) {
					let to_col = from_col + bishop_directions[d][0] * m;
					let to_row = from_row + bishop_directions[d][1] * m;
	
					if (to_row >= 0 && to_row <= 7 && to_col >= 0 && to_col <= 7) {
						let to = rc(to_row, to_col);
						
						if (pinned && !pin.squares.includes(to)) break;
						
						if (this.mailboxes[to] == PIECENONE) {
							if (pnc.checks == 0 || pnc.moveable[to]) moves.push(make_move(from, to, F_QUIET));
						}
						else if ((this.mailboxes[to] & this.notturn) != 0) {
							if (pnc.checks == 0 || pnc.moveable[to]) moves.push(make_move(from, to, F_CAPTURE));
							break;
						}
						else break;
					}
					else break;				
				}
			}
		}
	}

	add_rook_moves(moves, pnc) {
		let index = index_pc(ROOK | this.turn);
		let size = this.ledger[index].length;
		for (let pc = 0; pc < size; pc++) {
			let from = this.ledger[index][pc];
			let from_row = Math.floor(from / 8);
			let from_col = from % 8;

			let pinned = pnc.pinned[from];
			let pin = null;

			if (pinned) {
				for (let j in pnc.pins) {
					if (pnc.pins[j].pinned == from) {
						pin = pnc.pins[j];
					}
				}	
			}
			
			for (let d = 0; d < 4; d++) {
				for (let m = 1; m <= 7; m++) {
					let to_col = from_col + rook_directions[d][0] * m;
					let to_row = from_row + rook_directions[d][1] * m;
	
					if (to_row >= 0 && to_row <= 7 && to_col >= 0 && to_col <= 7) {
						let to = rc(to_row, to_col);

						if (pinned && !pin.squares.includes(to)) break;
						
						if (this.mailboxes[to] == PIECENONE) {
							if (pnc.checks == 0 || pnc.moveable[to]) moves.push(make_move(from, to, F_QUIET));
						}
						else if ((this.mailboxes[to] & this.notturn) != 0) {
							if (pnc.checks == 0 || pnc.moveable[to]) moves.push(make_move(from, to, F_CAPTURE));
							break;
						}
						else break;
					}
					else break;	
				}
			}
		}
	}

	add_queen_moves(moves, pnc) {
		let index = index_pc(QUEEN | this.turn);
		let size = this.ledger[index].length;
		for (let pc = 0; pc < size; pc++) {
			let from = this.ledger[index][pc];
			let from_row = Math.floor(from / 8);
			let from_col = from % 8;

			let pinned = pnc.pinned[from];
			let pin = null;

			if (pinned) {
				for (let j in pnc.pins) {
					if (pnc.pins[j].pinned == from) {
						pin = pnc.pins[j];
					}
				}	
			}
			
			for (let d = 0; d < 8; d++) {
				for (let m = 1; m <= 7; m++) {
					let to_col = from_col + queen_directions[d][0] * m;
					let to_row = from_row + queen_directions[d][1] * m;
	
					if (to_row >= 0 && to_row <= 7 && to_col >= 0 && to_col <= 7) {
						let to = rc(to_row, to_col);

						if (pinned && !pin.squares.includes(to)) break;
						
						if (this.mailboxes[to] == PIECENONE) {
							if (pnc.checks == 0 || pnc.moveable[to]) moves.push(make_move(from, to, F_QUIET));
						}
						else if ((this.mailboxes[to] & this.notturn) != 0) {
							if (pnc.checks == 0 || pnc.moveable[to]) moves.push(make_move(from, to, F_CAPTURE));
							break;
						}
						else break;
					}
					else break;				
				}
			}
		}
	}

	does_color_atk_sq(color, sq) {
		let col = sq % 8;
		let row = Math.floor(sq / 8);
		

		if (color == BLACK) {
			if ((col != 7 && this.mailboxes[sq + 9] == BLACK_PAWN) || (col != 0 && this.mailboxes[sq + 7] == BLACK_PAWN))
				return true;
		}
		else {
			if ((col != 0 && this.mailboxes[sq - 9] == WHITE_PAWN) || (col != 7 && this.mailboxes[sq - 7] == WHITE_PAWN))
				return true;
		}
		
		for (let d = 0; d < 8; d++) {
			let to_col = col + knight_directions[d][0];
			let to_row = row + knight_directions[d][1];
			if (to_col >= 0 && to_col <= 7 && to_row >= 0 && to_row <= 7) {
				let to = rc(to_row, to_col);
				if (this.mailboxes[to] == (KNIGHT | color)) return true;
			}
		}

		for (let d = 0; d < 8; d++) {
			for (let m = 1; m <= 7; m++) {
				let to_col = col + queen_directions[d][0] * m;
				let to_row = row + queen_directions[d][1] * m;
				if (to_col >= 0 && to_col <= 7 && to_row >= 0 && to_row <= 7) {
					let to = rc(to_row, to_col);
					let pc = this.mailboxes[to];
					if (pc != PIECENONE && pc != (KING | not_color(color))) {
						let pc_type = pc & PIECEMASK;
						let pc_color = pc & COLORMASK;
						if (pc_color == color && ((d < 4 && (pc_type == QUEEN || pc_type == ROOK)) || (d >= 4 && (pc_type == QUEEN || pc_type == BISHOP)) || (m == 1 && pc_type == KING))) return true;
						
						break;
					}
				}
				else break;
			}
		}

		return false;
	}

	add_king_moves(moves, pnc) {
		let from = this.ledger[index_pc(KING | this.turn)][0];
		let from_row = Math.floor(from / 8);
		let from_col = from % 8;
		for (let d = 0; d < 8; d++) {
			let to_col = from_col + queen_directions[d][0];
			let to_row = from_row + queen_directions[d][1];

			if (to_row >= 0 && to_row <= 7 && to_col >= 0 && to_col <= 7) {
				let to = rc(to_row, to_col);
				if ((this.mailboxes[to] == PIECENONE) && !this.does_color_atk_sq(this.notturn, to)) {
					moves.push(make_move(from, to, F_QUIET));
				}
				else if (((this.mailboxes[to] & this.notturn) != 0) && !this.does_color_atk_sq(this.notturn, to)) {
					moves.push(make_move(from, to, F_CAPTURE));
				}
			}		
		}

		if (pnc.checks == 0 && this.cr != 0) {
			if (this.turn == WHITE) {
				if ((F_WKS & this.cr) != 0 && 
					this.mailboxes[5] == PIECENONE && 
					this.mailboxes[6] == PIECENONE && 
					!this.does_color_atk_sq(this.notturn, 5) && 
					!this.does_color_atk_sq(this.notturn, 6)) {
					moves.push(make_move(from, 6, F_KINGCASTLE));
				}
				if ((F_WQS & this.cr) != 0 && 
					this.mailboxes[1] == PIECENONE && 
					this.mailboxes[2] == PIECENONE && 
					this.mailboxes[3] == PIECENONE && 
					!this.does_color_atk_sq(this.notturn, 2) && 
					!this.does_color_atk_sq(this.notturn, 3)) {	
					moves.push(make_move(from, 2, F_QUEENCASTLE));
				}
			}
			else {
				if ((F_BKS & this.cr) != 0 && 
					this.mailboxes[61] == PIECENONE && 
					this.mailboxes[62] == PIECENONE && 
					!this.does_color_atk_sq(this.notturn, 61) && 
					!this.does_color_atk_sq(this.notturn, 62)) {
					moves.push(make_move(from, 62, F_KINGCASTLE));
				}
				if ((F_BQS & this.cr) != 0 && 
					this.mailboxes[57] == PIECENONE && 
					this.mailboxes[58] == PIECENONE && 
					this.mailboxes[59] == PIECENONE && 
					!this.does_color_atk_sq(this.notturn, 58) && 
					!this.does_color_atk_sq(this.notturn, 59)) {	
					moves.push(make_move(from, 58, F_QUEENCASTLE));
				}
			}
		}
	}

	get_legal_moves() {
		let pnc = this.get_pins_and_checks();

		let moves = [];
		
		if (pnc.checks != 2) {
			this.add_pawn_moves(moves, pnc);			
			this.add_knight_moves(moves, pnc);			
			this.add_bishop_moves(moves, pnc);
			this.add_rook_moves(moves, pnc);
			this.add_queen_moves(moves, pnc);
		}
	
		this.add_king_moves(moves, pnc);

		return moves;
	}

	do_str_move(str) {
		let moves = this.get_legal_moves();
		for (let i in moves) {
			if (str == get_SAN(moves[i])) {
				this.do_move(moves[i]);
				return true;
			}
		}
		return false;
	}

	evaluate_material(color) {
		return  material_values[PAWN] * this.ledger[index_pc(PAWN | color)].length + 
				material_values[KNIGHT] * this.ledger[index_pc(KNIGHT | color)].length + 
				material_values[BISHOP] * this.ledger[index_pc(BISHOP | color)].length + 
				material_values[ROOK] * this.ledger[index_pc(ROOK | color)].length + 
				material_values[QUEEN] * this.ledger[index_pc(QUEEN | color)].length;
	}

	evaluate(color, alpha, beta) {
		
		let turn_mat = this.evaluate_material(color);
		let notturn_mat = this.evaluate_material(not_color(color));
		let mat = turn_mat - notturn_mat;
		
		if (mat + 100 < alpha || mat - 100 > beta) return mat;

		//assume white to move
		
		let pos = 0;

		for (let pc = 0; pc < 5; pc++) {
			for (let i in this.ledger[pc]) {
				pos += evaluation_maps[pc][this.ledger[pc][i]];
			}

			for (let i in this.ledger[pc+6]) {
				pos -= evaluation_maps[pc+6][this.ledger[pc+6][i]];
			}
		}

		if (notturn_mat > 1500) pos += evaluation_maps[KING][0][this.ledger[KING][0]];
		else 					pos += evaluation_maps[KING][1][this.ledger[KING][0]];
		if (turn_mat > 1500)	pos -= evaluation_maps[KING+6][0][this.ledger[KING+6][0]];
		else 					pos -= evaluation_maps[KING+6][1][this.ledger[KING+6][0]];

		//correct for assumption

		if (color == BLACK) pos = -pos;
		
		return mat + pos;
	}
}

class TTEntry {
	constructor(hashkey, evaluation, bound, depth, gen, move) {
		// for memory efficiency
		this.e = evaluation;
		this.p1 = (hashkey & 0xFFFF0000) | ((evaluation + INF) & 0xFFFF);
		this.p2 = (bound << 30) | ((depth & 0x3F) << 24) | ((gen & 0xFF) << 16) | (move);
	}

	get_hashkey16() { return this.p1 >> 16; };
	get_evaluation() { return (this.p1 & 0xFFFF) - INF; };
	get_bound() { return this.p2 >> 30; };
	get_depth() { return (this.p2 >> 24) & 0x3F; };
	get_gen() { return (this.p2 >> 16) & 0xFF; };
	get_move() { return this.p2 & 0xFFFF; };

	matches_hashkey(hashkey) { return this.get_hashkey16() == (hashkey >> 16); };

	save(hashkey, evaluation, bound, depth, gen, move) {
		if (this.p1 == 0 ||
			(gen >= this.get_gen() + 2 || (gen == this.get_gen() + 1 && this.get_depth() - depth < 3)) || 
			(this.get_bound() != EXACT && (bound == EXACT || this.get_depth() < depth)) ||
			(this.get_bound() == EXACT && (bound == EXACT && this.get_depth() < depth))) {

			this.p1 = (hashkey & 0xFFFF0000) | ((evaluation + INF) & 0xFFFF);
			this.p2 = (bound << 30) | ((depth & 0x3F) << 24) | ((gen & 0xFF) << 16) | (move);
		}
	}

	forcesave(hashkey, evaluation, bound, depth, gen, move) {
		this.p1 = (hashkey & 0xFFFF0000) | ((evaluation + INF) & 0xFFFF);
		this.p2 = (bound << 30) | ((depth & 0x3F) << 24) | ((gen & 0xFF) << 16) | (move);
	}
}

class TT { //	transposition table
	constructor(hashsize=16) {
		if (hashsize > 31) {
			console.warn("HASHSIZE > 31, NOT ALLOWED DUE TO MAX INT SIZE");
			hashsize = 31;
		}
		
		this.hashsize = hashsize;
		this.length = 1<<hashsize;
		this.hashmask = this.length-1;

		this.gen = 0;

		this.table = new Array(this.length);
		for (let i = 0; i < this.length; i++) {
			this.table[i] = new TTEntry(0, 0, 0, 0, 0, 0);
		}
		
		this.counter_hueristic = new Array(12);
		this.history_hueristic = new Array(12);
		
		for (let i = 0; i < 12; i++) this.counter_hueristic[i] = new Array(64).fill(MOVENONE);
		for (let i = 0; i < 12; i++) this.history_hueristic[i] = new Array(64).fill(0);
	}

	probe(hashkey) {
		return this.table[hashkey & this.hashmask];
	}

	hashfull() {
		let checksize = Math.min(this.length, 1000);
		let emptycnt = 0;
		for (let i = 0; i < checksize; i++) {
			if (this.probe(i).get_hashkey16() == 0) emptycnt++;
		}
		return Math.round(1000-emptycnt/checksize*1000);
	}

	update_status() {
		this.searching = this.searching;
	}
}

function perft(pos, depth, divide = false) {
	if (depth == 0) return 1;
	let moves = pos.get_legal_moves();
	if (depth == 1 && !divide) return moves.length;

	let count = 0;
	
	for (let i in moves) {
		pos.do_move(moves[i]);
		let local = perft(pos, depth-1, false);
		pos.undo_move(moves[i]);

		if (divide) console.log(get_SAN(moves[i]) + ": " + local.toString());

		count += local;
	}

	if (divide) console.log("total: " + count.toString());

	return count;
}

function get_best_move(pos, depth) {
	if (depth > 63) depth = 63;
	
	let moves = pos.get_legal_moves();

	let tt = new TT;

	for (let d = 1; d <= depth; d++) {
		search(pos, d, -INF, INF, tt);
		let entry = tt.probe(pos.hashkey);
		console.log("info", "depth", d, "cp", entry.get_evaluation(), "bestmove", get_SAN(entry.get_move()), "hashfull", tt.hashfull());
	}

	return tt.probe(pos.hashkey).get_move();
}

const mvvlva_table = [
	[600, 477, 475, 460, 420, 310],
	[2022, 600, 497, 482, 442, 332],
	[2025, 2002, 600, 485, 445, 335],
	[2040, 2017, 2015, 600, 460, 350],
	[2080, 2057, 2055, 2040, 601, 390],
	[2690, 2667, 2665, 2650, 2610, 2600]
];
	
function sort_moves(moves, pos, entry_move, tt) {
	let counter = MOVENONE;
	
	if (pos.move_log.length != 0) {
		let prev_move = pos.move_log[pos.move_log.length-1];
		counter = tt.counter_hueristic[index_pc(pos.mailboxes[get_to(prev_move)])][get_to(prev_move)];
	}

	let scores = new Array(moves.length).fill(0);

	for (let i in moves) {
		let move = moves[i];
		let flags = get_flags(move);

		let from_pc = pos.mailboxes[get_from(move)] & PIECEMASK;
		let to_pc = ((flags == F_EP) ? PAWN : (pos.mailboxes[get_to(move)] & PIECEMASK));
		
		if (move == entry_move) {
			scores[i] += 100000;
		}
		else if ((move & 0xFFF) == (counter & 0xFFF)) {
			scores[i] += 20000;
		}
		else {
			if ((flags & F_PROM) != 0) {
				scores[i] += 5000 + get_promotion_piece(move);
				if (get_promotion_piece(move) == KNIGHT || get_promotion_piece(move) == QUEEN) scores[i] += 10;
			}
			if ((flags & F_CAPTURE) != 0) {
				scores[i] += mvvlva_table[to_pc][from_pc];
			}
		}
	}

	let sorted_moves = new Array();
	let sorted_scores = new Array();

	for (let m in moves) {
		if (scores[m] != 0) {
			let move = moves[m];
			let score = scores[m];

			sorted_moves.push(move);
			sorted_scores.push(score);

			let i = sorted_moves.length-1;
			while (i != -1) {
				i--;
				if (sorted_scores[i] < score) {
					sorted_moves[i+1] = sorted_moves[i];
					sorted_scores[i+1] = sorted_scores[i];
				}
				else break;
			}
			sorted_moves[i+1] = move;
			sorted_scores[i+1] = score;
		}
	}

	let num_interesting_moves = sorted_moves.length;

	for (let m in moves) {
		if (scores[m] == 0) {
			let move = moves[m];
			let score = tt.history_hueristic[index_pc(pos.mailboxes[get_from(move)])][get_to(move)];

			sorted_moves.push(move);
			sorted_scores.push(score);

			let i = sorted_moves.length-1;
			while (i != num_interesting_moves-1) {
				i--;
				if (sorted_scores[i] < score) {
					sorted_moves[i+1] = sorted_moves[i];
					sorted_scores[i+1] = sorted_scores[i];
				}
				else break;
			}
			sorted_moves[i+1] = move;
			sorted_scores[i+1] = score;
		}
	}

	return sorted_moves;
}

function sort_loud_moves(moves, pos, tt) {
	let counter = MOVENONE;
	
	if (pos.move_log.length != 0) {
		let prev_move = pos.move_log[pos.move_log.length-1];
		counter = tt.counter_hueristic[index_pc(pos.mailboxes[get_to(prev_move)])][get_to(prev_move)];
	}

	let scores = new Array(moves.length).fill(0);

	for (let i in moves) {
		let move = moves[i];
		let flags = get_flags(move);

		if ((flags & 0b1100) != 0) {
			
			let from_pc = pos.mailboxes[get_from(move)] & PIECEMASK;
			let to_pc = ((flags == F_EP) ? PAWN : (pos.mailboxes[get_to(move)] & PIECEMASK));
			
			if ((move & 0xFFF) == (counter & 0xFFF)) {
				scores[i] += 20000;
			}
			else {
				if ((flags & F_PROM) != 0) {
					scores[i] += 5000 + get_promotion_piece(move);
					if (get_promotion_piece(move) == KNIGHT || get_promotion_piece(move) == QUEEN) scores[i] += 10;
				}
				if ((flags & F_CAPTURE) != 0) {
					scores[i] += mvvlva_table[to_pc][from_pc];
				}
			}
		}
	}

	let sorted_moves = new Array();
	let sorted_scores = new Array();

	for (let m in moves) {
		if (scores[m] != 0) {
			let move = moves[m];
			let score = scores[m];

			sorted_moves.push(move);
			sorted_scores.push(score);

			let i = sorted_moves.length-1;
			while (i != -1) {
				i--;
				if (sorted_scores[i] < score) {
					sorted_moves[i+1] = sorted_moves[i];
					sorted_scores[i+1] = sorted_scores[i];
				}
				else break;
			}
			sorted_moves[i+1] = move;
			sorted_scores[i+1] = score;
		}
	}

	return sorted_moves;
}

function search(pos, depth, alpha, beta, tt) {
	if (depth <= 0) return qsearch(pos, alpha, beta, tt);

	let entry = null;
	let found = false;
	let entry_move = MOVENONE;

	entry = tt.probe(pos.hashkey);
	found = entry.matches_hashkey(pos.hashkey);
	if (found) {
		let entry_evaluation = entry.get_evaluation();
		let entry_depth = entry.get_depth();
		let entry_bound = entry.get_bound();
		
		if (entry_depth >= depth) {
			if (entry_bound == EXACT) return entry_evaluation;
			else if (entry_bound == UB && entry_evaluation < beta) beta = entry_evaluation;
			else if (entry_bound == LB && entry_evaluation > alpha) alpha = entry_evaluation;
			if (alpha >= beta) return beta;
		}
		
		entry_move = entry.get_move();
	}

	let moves = pos.get_legal_moves();
	
	if (moves.length == 0) {
		if (pos.is_in_check(pos.turn)) return -INF;
		else return 0;
	}

	moves = sort_moves(moves, pos, entry_move, tt);
	
	let besteval = -INF;
	let bestmove = moves[0];
	
	for (let i in moves) {
		let move = moves[i];
		pos.do_move(move);

		let evaluation = -search(pos, (i >= (found ? 4 : 10) ? depth-2 : depth - 1), -beta, -Math.max(alpha, besteval), tt);

		pos.undo_move();

		if (evaluation > besteval) {
			besteval = evaluation;
			bestmove = move;
			
			if (besteval >= beta) {
				if (tt != null) {
					if (pos.move_log.length != 0) {
						let prev_move = pos.move_log[pos.move_log.length-1];
						tt.counter_hueristic[index_pc(pos.mailboxes[get_to(prev_move)])][get_to(prev_move)] = move;
					}
					tt.history_hueristic[index_pc(pos.mailboxes[get_from(move)])][get_to(move)]++;
					break;
				}
			}
		}
	}
	
	if (besteval <= alpha) 	  entry.save(pos.hashkey, besteval, UB   , depth, tt.gen, bestmove);
	else if (besteval < beta) entry.save(pos.hashkey, besteval, EXACT, depth, tt.gen, bestmove);
	else if (besteval == INF) entry.save(pos.hashkey, besteval, EXACT, depth, tt.gen, bestmove);
	else 					  entry.save(pos.hashkey, besteval, LB   , depth, tt.gen, bestmove);

	return besteval;
}

function qsearch(pos, alpha, beta, tt) {
    let stand_pat = pos.evaluate(pos.turn, alpha, beta);
    if (stand_pat >= beta) return beta;
    if (stand_pat > alpha) alpha = stand_pat;

	let moves = pos.get_legal_moves();
	
	if (moves.length == 0) {
		if (pos.is_in_check(pos.turn)) return -INF;
		else return 0;
	}

	moves = sort_loud_moves(moves, pos, tt);
	
	for (let i in moves) {
		let move = moves[i];
			
			pos.do_move(move);
			
			let evaluation = -qsearch(pos, -beta, -alpha, tt);
			alpha = Math.max(evaluation, alpha)
			
			pos.undo_move();
	
			if (alpha >= beta) {
				return beta;
			}
	}

	return alpha;
}
