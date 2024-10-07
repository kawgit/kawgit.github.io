importScripts("chess.js");

onmessage = function(event) {
	let root = new Pos(event.data.fen);
	let tt = new TT(16);
	tt.searching = true;
	let start_time = Date.now();
	for (let depth = 1; depth <= 63; depth++) {
		search(root, depth, -INF, INF, tt);
		let entry = tt.probe(root.hashkey);
		let line = "info depth " + depth + " cp " + entry.get_evaluation() + " bestmove " + get_SAN(entry.get_move()) + " time " + (Date.now()-start_time).toString() + " hashfull " + tt.hashfull();
		postMessage(line);
	}
}