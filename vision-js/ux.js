let board = document.getElementById("board");
let board_pos = new Pos;

function is_user_turn() {
	return (!document.getElementById("checkbox_flip").checked && board_pos.turn == WHITE)
		|| (document.getElementById("checkbox_flip").checked && board_pos.turn == BLACK);
}

function ux_undo() {
	if (board_pos.move_log.length != 0) {
		board_pos.undo_move();
		if (document.getElementById("checkbox_play").checked && !is_user_turn()) {
			board_pos.undo_move();
		}
		clear_position();
		display_position(board_pos);

		request_engine_updpos();
	}
}

function get_sq_element(sq) {
    return document.getElementById("square" + (sq+1).toString().padStart(2, '0'));
}

function place_on_square(elem, sq) {
    let c = sq % 8;
    let r = Math.floor(sq / 8);
	if (document.getElementById("checkbox_flip").checked) {
		r = 7 - r;
		c = 7 - c;
	}
    elem.style.marginLeft = (c/8*100 + 6.25).toString() + "%";
    elem.style.marginTop = ((7-r)/8*100 + 6.25).toString() + "%";
}

window.onload = function() {
	board = document.getElementById("board");

	window.onresize();
    
	for (let i = 0; i < 64; i++) {
        place_on_square(get_sq_element(i), i);
    }

	display_position(board_pos);

	checkthink();
	checkoutput();
	checkarrow();
}

window.onresize = function() {
	let size = Math.floor(Math.min(board.parentElement.clientWidth, board.parentElement.clientHeight) * .9);
	console.log(size);
	board.style.width = size.toString() + "px";
	board.style.height = size.toString() + "px";
	board.style.marginLeft = -Math.floor(size/2).toString() + "px";
	board.style.fontSize = Math.floor(size/12).toString() + "px";
}

function get_path(pc) { // CREDIT FOR IMAGES TO CHESS.COM
	return "pieces/" + (((pc & WHITE) != 0) ? "w" : "b") + piece_to_char.get(pc).toLowerCase() + ".png";
}

let from_row = SQUARENONE;
let from_col = SQUARENONE;

function highlight_sq(sq, color="yellow", id="") {
	let elem = document.createElement("div");
	elem.classList.add("highlight");
	elem.style.background=color;
	elem.draggable = false;
	elem.id = id;
	board.appendChild(elem);
	place_on_square(elem, sq);
}

function ux_do(move_str) {
	clear_position();
	board_pos.do_str_move(move_str);
	display_position(board_pos);

	request_engine_updpos();
	if (!is_user_turn()) {
		setTimeout(playloop, parseInt(document.getElementById("thinktime").value));
	}
}

function drag_piece(id) {
	from_col = Math.floor(parseFloat(document.getElementById(id).style.marginLeft)/100 * 8);
	from_row = 7-Math.floor(parseFloat(document.getElementById(id).style.marginTop)/100 * 8);
	if (document.getElementById("checkbox_flip").checked) {
		from_row = 7 - from_row;
		from_col = 7 - from_col;
	}
	let from = rc(from_row, from_col);
	
	let moves = board_pos.get_legal_moves();

	for (let i in moves) {
		if (get_from(moves[i]) == from) {
			let to = get_to(moves[i]);
			highlight_sq(to);
		}
	}
	
	document.onmousemove = function(event) {
		document.getElementById(id).style.marginLeft = Math.round(event.clientX - board.getBoundingClientRect().left).toString() + "px";
		document.getElementById(id).style.marginTop = Math.round(event.clientY - board.getBoundingClientRect().top).toString() + "px";
	}
	
	document.onmouseup = function(event) {
		let to_col = Math.floor(((event.clientX - board.getBoundingClientRect().left)/parseInt(board.style.width)) * 8);
		let to_row = 7-Math.floor(((event.clientY - board.getBoundingClientRect().top)/parseInt(board.style.height)) * 8);
		
		if (document.getElementById("checkbox_flip").checked) {
			to_row = 7 - to_row;
			to_col = 7 - to_col;
		}
		
		document.onmousemove = null;
		document.onmouseup = null;
		let to = rc(to_row, to_col);
		
		console.log("from: " + get_sq_SAN(from));
		console.log("to:   " + get_sq_SAN(to));

		ux_do(get_sq_SAN(from) + get_sq_SAN(to));
	}
}

function clear_position() {
	const pieces = document.querySelectorAll('.piece');
	pieces.forEach(sq => {
	  sq.remove();
	});

	const highlights = document.querySelectorAll('.highlight');
	highlights.forEach(sq => {
	  sq.remove();
	});
}

function display_position(pos) {
    for (let i = 0; i < 64; i++) {
		let pc = pos.mailboxes[i];
		if (pc != PIECENONE) {
			
			let elem = document.createElement("img");
			elem.src = get_path(pc);
			elem.classList.add("piece");
			elem.id = "piece" + i.toString().padStart(2, '0');
			elem.onmousedown = function() { drag_piece(this.id); }
			elem.draggable = false;
			
			board.appendChild(elem);
			place_on_square(elem, i);
		}
    }
}

function is_valid_fen(fen) {
	
	if (fen.split("/").length != 8) return false;
	if (fen.split(" ").length != 6) return false;

	let i = 0;
	while (true) {
		if (fen[i] == ' ') break;
		
		if (fen[i] == '/') {}
		else if (fen.charCodeAt(i) >= 48 && fen.charCodeAt(i) <= 57) {}
		else if (char_to_piece.get(fen[i]) != null) {}
		else return false;
		
		i++;
	}

	return true;
}

function set_board_fen(fen) {
	if (!is_valid_fen(fen)) return;
	
	board_pos = new Pos(fen);
	clear_position();
	display_position(board_pos);

	request_engine_newpos();
}

function get_last_engine_out() {
	return document.getElementById("output").innerHTML.split("<br>")[0];
}

function get_last_engine_stat(token) {
	let list = get_last_engine_out().split(" "); 
	return list[list.indexOf(token)+1];
}

function str_to_sq(str) {
	return rc(str.charCodeAt(1)-49, str.charCodeAt(0)-97);
}

function checkarrow() {
	if (document.getElementById("arrow_start") != null) board.removeChild(document.getElementById("arrow_start"));
	if (document.getElementById("arrow_end") != null) board.removeChild(document.getElementById("arrow_end"));

	if (document.getElementById("checkbox_think").checked && document.getElementById("checkbox_arrow").checked) {

		if (!document.getElementById("checkbox_play").checked || !is_user_turn()) {
			
			let movestr = get_last_engine_stat("bestmove");
			
			highlight_sq(str_to_sq(movestr.substring(0, 2)), "red", "arrow_start");
			highlight_sq(str_to_sq(movestr.substring(2, 4)), "red", "arrow_end");
		}
	
		window.requestAnimationFrame(checkarrow);
	}
}

function checkthink() {
	if (document.getElementById("checkbox_think").checked) {
		request_engine_start();
		checkarrow();
	}
	else {
		request_engine_stop();
	}
}

function checkoutput() {
	if (document.getElementById("checkbox_output").checked) {
		document.getElementById("output").style.visibility = "visible";
	}
	else {
		document.getElementById("output").style.visibility = "hidden";
	}
}

function checkplay() {
	if (document.getElementById("checkbox_play").checked) {
		document.getElementById("checkbox_arrow").style.visibility = "hidden";
		document.getElementById("checkbox_think").style.visibility = "hidden";
		document.getElementById("checkbox_output").style.visibility = "hidden";
		document.getElementById("checkbox_flip").style.visibility = "hidden";
		document.getElementById("fen").style.visibility = "hidden";

		document.getElementById("output").style.visibility = "hidden";

		document.getElementById("checkbox_think").checked = true;
		document.getElementById("checkbox_arrow").checked = true;
		checkarrow();
		checkthink();

		if (!is_user_turn()) setTimeout(playloop(), parseInt(document.getElementById("thinktime").value));
	}
	else {
		document.getElementById("checkbox_arrow").style.visibility = "visible";
		document.getElementById("checkbox_think").style.visibility = "visible";
		document.getElementById("checkbox_output").style.visibility = "visible";
		document.getElementById("checkbox_flip").style.visibility = "visible";
		document.getElementById("fen").style.visibility = "visible";
		
		checkoutput();
		checkthink();
		checkarrow();
	}
}

function playloop() {
	if (document.getElementById("checkbox_play").checked && !is_user_turn()) {

		let movestr = get_last_engine_stat("bestmove");
		ux_do(movestr);
	}
}

function checkflip() {
	clear_position();
	display_position(board_pos);
}

let worker = null;
let current_worker_fen = "";

function request_engine_start() {
	if (worker != null && current_worker_fen == board_pos.get_fen()) return;
	
	request_engine_stop();
	worker = new Worker("worker.js");
	worker.onmessage = function(event) {
		document.getElementById("output").innerHTML = event.data + "<br>" + 	document.getElementById("output").innerHTML;
	}
	worker.postMessage({status: "start", fen: board_pos.get_fen()});
	current_worker_fen = board_pos.get_fen();
}

function request_engine_newpos() {
	if (document.getElementById("checkbox_think").checked) {
		request_engine_start();
	}
	//worker.postMessage({status: "newpos", fen: board_pos.get_fen()});
}

function request_engine_updpos() {
	if (document.getElementById("checkbox_think").checked) {
		request_engine_start();
	}
	//worker.postMessage({status: "update", fen: board_pos.get_fen()});
}

function request_engine_stop() {
	if (worker != null) worker.terminate();
	worker = null;
}

