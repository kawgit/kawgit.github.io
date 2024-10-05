let boardElement = document.getElementById("board");
let boardPosition = new Pos();

function isUserTurn() {
    const flipChecked = document.getElementById("checkbox_flip").checked;
    return (!flipChecked && boardPosition.turn === WHITE) ||
           (flipChecked && boardPosition.turn === BLACK);
}

function undoMove() {
    if (boardPosition.move_log.length !== 0) {
        boardPosition.undo_move();
        if (document.getElementById("checkbox_play").checked && !isUserTurn()) {
            boardPosition.undo_move();
        }
        clearBoard();
        displayBoardPosition(boardPosition);
        updateEnginePosition();
    }
}

function getSquareElement(squareIndex) {
    return document.getElementById("square" + (squareIndex + 1).toString().padStart(2, '0'));
}

function placePieceOnSquare(element, squareIndex) {
    let col = squareIndex % 8;
    let row = Math.floor(squareIndex / 8);
    if (document.getElementById("checkbox_flip").checked) {
        row = 7 - row;
        col = 7 - col;
    }
    element.style.marginLeft = (col / 8 * 100).toString() + "%";
    element.style.marginTop = ((7 - row) / 8 * 100).toString() + "%";
}

window.onload = function() {
    boardElement = document.getElementById("board");

    for (let i = 0; i < 64; i++) {
        placePieceOnSquare(getSquareElement(i), i);
    }

    displayBoardPosition(boardPosition);
    checkEngineThinking();
    checkOutput();
    checkArrowDisplay();
    checkPlayMode();
}

function getPieceImagePath(piece) {
    const pieceColor = (piece & WHITE) !== 0 ? "w" : "b";
    return "pieces/" + pieceColor + piece_to_char.get(piece).toLowerCase() + ".png";
}

let fromRow = SQUARENONE;
let fromCol = SQUARENONE;

function highlightSquare(squareIndex, color = "yellow", id = "") {
    let highlightElement = document.createElement("div");
    highlightElement.classList.add("highlight");
    highlightElement.style.background = color;
    highlightElement.draggable = false;
    highlightElement.id = id;
    boardElement.appendChild(highlightElement);
    placePieceOnSquare(highlightElement, squareIndex);
}

function executeMove(moveString) {
    clearBoard();
    boardPosition.do_str_move(moveString);
    displayBoardPosition(boardPosition);
    updateEnginePosition();
    if (!isUserTurn()) {
        setTimeout(playLoop, parseInt(document.getElementById("thinktime").value));
    }
}

function dragPiece(pieceId) {
    fromCol = Math.floor(parseFloat(document.getElementById(pieceId).style.marginLeft) / 100 * 8);
    fromRow = 7 - Math.floor(parseFloat(document.getElementById(pieceId).style.marginTop) / 100 * 8);

    if (document.getElementById("checkbox_flip").checked) {
        fromRow = 7 - fromRow;
        fromCol = 7 - fromCol;
    }

    let fromSquare = rc(fromRow, fromCol);
    let legalMoves = boardPosition.get_legal_moves();

    legalMoves.forEach(move => {
        if (get_from(move) === fromSquare) {
            let toSquare = get_to(move);
            highlightSquare(toSquare);
        }
    });

    const pieceElement = document.getElementById(pieceId);
	
    document.onmousemove = function(event) {
		pieceElement.classList.add("grabbed");
        pieceElement.style.marginLeft = Math.round(event.clientX - boardElement.getBoundingClientRect().left) + "px";
        pieceElement.style.marginTop = Math.round(event.clientY - boardElement.getBoundingClientRect().top) + "px";
    }

    document.onmouseup = function(event) {
        pieceElement.classList.remove("grabbed");
        document.onmousemove = null;
        document.onmouseup = null;

        let toCol = Math.floor((event.clientX - boardElement.getBoundingClientRect().left) / parseInt(boardElement.getBoundingClientRect().width) * 8);
        let toRow = 7 - Math.floor((event.clientY - boardElement.getBoundingClientRect().top) / parseInt(boardElement.getBoundingClientRect().height) * 8);

        if (document.getElementById("checkbox_flip").checked) {
            toRow = 7 - toRow;
            toCol = 7 - toCol;
        }

        let toSquare = rc(toRow, toCol);
        executeMove(get_sq_SAN(fromSquare) + get_sq_SAN(toSquare));
    }
}

function clearBoard() {
    document.querySelectorAll('.piece').forEach(piece => piece.remove());
    document.querySelectorAll('.highlight').forEach(highlight => highlight.remove());
}

function displayBoardPosition(position) {
	
	for (let i = 0; i < 64; i++) {
		let piece = position.mailboxes[i];
        if (piece !== PIECENONE) {
            let pieceElement = document.createElement("img");
            pieceElement.src = getPieceImagePath(piece);
            pieceElement.classList.add("piece");
            pieceElement.id = "piece" + i.toString().padStart(2, '0');
            pieceElement.onmousedown = function() {
                dragPiece(this.id);
            }
            pieceElement.draggable = false;
            boardElement.appendChild(pieceElement);
            placePieceOnSquare(pieceElement, i);
        }
    }
}

function isValidFen(fen) {
    const parts = fen.split(" ");
    if (fen.split("/").length !== 8 || parts.length !== 6) return false;

    for (let i = 0; i < fen.length; i++) {
        const char = fen[i];
        if (char === ' ') break;
        if (char === '/' || (char >= '1' && char <= '8') || char_to_piece.get(char) != null) {
            continue;
        }
        return false;
    }
    return true;
}

function setBoardFen(fen) {
    if (!isValidFen(fen)) return;
    boardPosition = new Pos(fen);
    clearBoard();
    displayBoardPosition(boardPosition);
    requestNewEnginePosition();
}

function getLastEngineOutput() {
    return document.getElementById("output").innerHTML.split("<br>")[0];
}

function getLastEngineStat(token) {
    let output = getLastEngineOutput().split(" ");
    return output[output.indexOf(token) + 1];
}

function strToSquare(squareString) {
    return rc(squareString.charCodeAt(1) - 49, squareString.charCodeAt(0) - 97);
}

function checkArrowDisplay() {
    ["arrow_start", "arrow_end"].forEach(id => {
        const arrowElem = document.getElementById(id);
        if (arrowElem) boardElement.removeChild(arrowElem);
    });

    if (document.getElementById("checkbox_think").checked && document.getElementById("checkbox_arrow").checked) {
        if (!document.getElementById("checkbox_play").checked || !isUserTurn()) {
            const moveString = getLastEngineStat("bestmove");
            highlightSquare(strToSquare(moveString.substring(0, 2)), "red", "arrow_start");
            highlightSquare(strToSquare(moveString.substring(2, 4)), "red", "arrow_end");
        }
        window.requestAnimationFrame(checkArrowDisplay);
    }
}

function checkEngineThinking() {
    if (document.getElementById("checkbox_think").checked) {
        requestEngineStart();
        checkArrowDisplay();
    } else {
        requestEngineStop();
    }
}

function checkOutput() {
    const outputElement = document.getElementById("output");
    outputElement.style.visibility = document.getElementById("checkbox_output").checked ? "visible" : "hidden";
}

function checkPlayMode() {
    const playChecked = document.getElementById("checkbox_play").checked;
    ["checkbox_arrow", "checkbox_think", "checkbox_output", "checkbox_flip", "fen"].forEach(id => {
        document.getElementById(id).style.visibility = playChecked ? "hidden" : "visible";
    });
    if (playChecked) {
        document.getElementById("checkbox_think").checked = true;
        document.getElementById("checkbox_arrow").checked = true;
        checkArrowDisplay();
        checkEngineThinking();
        if (!isUserTurn()) {
            setTimeout(playLoop, parseInt(document.getElementById("thinktime").value));
        }
    } else {
        checkOutput();
        checkEngineThinking();
        checkArrowDisplay();
    }
}

function playLoop() {
    if (document.getElementById("checkbox_play").checked && !isUserTurn()) {
        const moveString = getLastEngineStat("bestmove");
        executeMove(moveString);
    }
}

function checkFlip() {
    clearBoard();
    displayBoardPosition(boardPosition);
}

let engineWorker = null;
let currentWorkerFen = "";

function requestEngineStart() {
	return
    if (engineWorker !== null && currentWorkerFen === boardPosition.get_fen()) return;
    requestEngineStop();
    engineWorker = new Worker("worker.js");
    engineWorker.onmessage = function(event) {
        document.getElementById("output").innerHTML = event.data + "<br>" + document.getElementById("output").innerHTML;
    }
    engineWorker.postMessage({ status: "start", fen: boardPosition.get_fen() });
    currentWorkerFen = boardPosition.get_fen();
}

function requestNewEnginePosition() {
	return
    if (document.getElementById("checkbox_think").checked) {
        requestEngineStart();
    }
}

function updateEnginePosition() {
	return
    if (document.getElementById("checkbox_think").checked) {
        requestEngineStart();
    }
}

function requestEngineStop() {
	return
    if (engineWorker !== null) engineWorker.terminate();
    engineWorker = null;
}
