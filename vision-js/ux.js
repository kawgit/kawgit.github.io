let board;
let pos = new Pos();
let checkedFlip = false;
let checkedPlayMode = true;
let checkedThink = false;
let checkedArrow = false;
let checkedOutput = true;
let fen = "";
let thinkTime = 3000;
let engineWorker = null;
let currentWorkerFen = "";

function updateSettings() {
    checkedFlip = document.getElementById("checkboxFlip").checked;
    checkedPlayMode = document.getElementById("checkboxPlayMode").checked;
    checkedThink = document.getElementById("checkboxThink").checked;
    checkedArrow = document.getElementById("checkboxArrow").checked;
    checkedOutput = document.getElementById("checkboxOutput").checked;
    fen = document.getElementById("fen").value;
    thinkTime = parseInt(document.getElementById("thinktime").value, 10);
}

function getSquareElement(squareIndex) {
    return document.getElementById(`square${String(squareIndex + 1).padStart(2, '0')}`);
}

function getPieceElement(squareIndex) {
    return document.getElementById(`piece${String(squareIndex + 1).padStart(2, '0')}`);
}

function placeElementOnSquare(element, squareIndex) {
    let col = squareIndex % 8;
    let row = Math.floor(squareIndex / 8);
    if (checkedFlip) {
        row = 7 - row;
        col = 7 - col;
    }
    element.style.marginLeft = `${(col / 8) * 100}%`;
    element.style.marginTop = `${((7 - row) / 8) * 100}%`;
}

function getPieceImage(piece) {
    const color = (piece & WHITE) !== 0 ? "w" : "b";
    return `pieces/${color}${piece_to_char.get(piece).toLowerCase()}.png`;
}

function clearBoard() {
    document.querySelectorAll('.piece').forEach(piece => piece.remove());
    document.querySelectorAll('.highlight').forEach(highlight => highlight.remove());
}

function drawPosition(position) {
    for (let squareIndex = 0; squareIndex < 64; squareIndex++) {
        const piece = position.mailboxes[squareIndex];
        
        if (piece === PIECENONE) {
            continue;
        }
        
        const img = document.createElement("img");
        img.src = getPieceImage(piece);
        img.classList.add("piece");
        img.id = `piece${String(squareIndex + 1).padStart(2, '0')}`;
        img.addEventListener('mousedown', dragPiece);
        img.draggable = false;
        board.appendChild(img);
        placeElementOnSquare(img, squareIndex);
    }
}

function highlight(squareIndex, color = "yellow", id = "") {
    const svgns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgns, "svg");
    svg.setAttribute("viewBox", "0 0 100 100");
    svg.classList.add("highlight");
    if (id) svg.id = id;
    const circle = document.createElementNS(svgns, "circle");
    circle.setAttribute("cx", "50");
    circle.setAttribute("cy", "50");
    circle.setAttribute("r", "10");
    circle.setAttribute("fill", color);
    circle.setAttribute("opacity", "0.7");
    svg.appendChild(circle);
    board.appendChild(svg);
    placeElementOnSquare(svg, squareIndex);
}

function squareIndexToString(squareIndex) {
    const file = 'abcdefgh'[squareIndex % 8];
    const rank = (Math.floor(squareIndex / 8) + 1).toString();
    return file + rank;
}

function stringToSquareIndex(squareString) {
    const file = squareString.charCodeAt(0) - 'a'.charCodeAt(0);
    const rank = parseInt(squareString.charAt(1), 10) - 1;
    return rank * 8 + file;
}

function lastEngineOutput() {
    const outputElement = document.getElementById("output");
    return outputElement.innerHTML.split("<br>")[0];
}

function lastEngineStat(token) {
    const output = lastEngineOutput().split(" ");
    const index = output.indexOf(token);
    if (index !== -1 && index + 1 < output.length) {
        return output[index + 1];
    }
    return null;
}

function isUserTurn() {
    return (!checkedFlip && pos.turn === WHITE) || (checkedFlip && pos.turn === BLACK);
}

function validFen(fenString) {
    const parts = fenString.trim().split(/\s+/);
    if (parts.length !== 6) return false;

    const rows = parts[0].split('/');
    if (rows.length !== 8) return false;

    for (let row of rows) {
        let count = 0;
        for (let char of row) {
            if (/[1-8]/.test(char)) {
                count += parseInt(char, 10);
            } else if (char_to_piece.has(char)) {
                count += 1;
            } else {
                return false;
            }
        }
        if (count !== 8) return false;
    }
    return true;
}

function setFen(fenString) {
    if (!validFen(fenString)) return;
    pos = new Pos(fenString);
    clearBoard();
    drawPosition(pos);
    requestEnginePosition();
}

function updateOutputVisibility() {
    const outputElement = document.getElementById("output");
    outputElement.style.visibility = checkedOutput ? "visible" : "hidden";
}

function updateArrowDisplay() {
    document.getElementById('arrow_start')?.remove();
    document.getElementById('arrow_end')?.remove();

    if (checkedThink && checkedArrow) {
        if (!checkedPlayMode || !isUserTurn()) {
            const moveString = lastEngineStat("bestmove");
            if (moveString) {
                const fromSquareIndex = stringToSquareIndex(moveString.substring(0, 2));
                const toSquareIndex = stringToSquareIndex(moveString.substring(2, 4));
                highlight(fromSquareIndex, "red", "arrow_start");
                highlight(toSquareIndex, "red", "arrow_end");
            }
        }
        window.requestAnimationFrame(updateArrowDisplay);
    }
}

function updateEngineThinking() {
    if (checkedThink) {
        requestEngineStart();
        updateArrowDisplay();
    } else {
        requestEngineStop();
    }
}

function updatePlayMode() {
    const elementsToToggle = ["checkboxArrow", "checkboxThink", "checkboxOutput", "checkboxFlip", "fen"];
    elementsToToggle.forEach(id => {
        document.getElementById(id).style.visibility = checkedPlayMode ? "hidden" : "visible";
    });

    if (checkedPlayMode) {
        document.getElementById("checkboxThink").checked = true;
        document.getElementById("checkboxArrow").checked = true;
        updateSettings();
        updateArrowDisplay();
        updateEngineThinking();
        if (!isUserTurn()) {
            setTimeout(playLoop, thinkTime);
        }
    } else {
        updateOutputVisibility();
        updateEngineThinking();
        updateArrowDisplay();
    }
}

function doMove(moveString) {
    pos.do_str_move(moveString);

    requestEnginePosition();
    if (!isUserTurn()) {
        setTimeout(playLoop, thinkTime);
    }

    if (!checkedPlayMode || !isUserTurn()) {
        clearBoard();
        drawPosition(pos);
        return;
    }

    const moveEncoding = pos.move_log[pos.move_log.length - 1];

    const fromSquareIndex = get_from(moveEncoding);
    const toSquareIndex = get_to(moveEncoding);
    const flags = get_flags(moveEncoding);

    console.log(fromSquareIndex)

    const fromPieceElement = getPieceElement(fromSquareIndex)
    const toPieceElement = getPieceElement(toSquareIndex)

    if (toPieceElement) {
        toPieceElement.remove();
    }

    fromPieceElement.id = `piece${String(toSquareIndex).padStart(2, '0')}`;
    placeElementOnSquare(fromPieceElement, toSquareIndex);

    if (flags != F_QUIET) {
        if (flags == F_EP) {
            const victimSquareIndex = toSquareIndex + (this.turn == WHITE ? -8 : 8);
            getPieceElement(victimSquareIndex).remove()
        }
        else if (flags == F_KINGCASTLE || flags == F_QUEENCASTLE) {
            let rookFromSquareIndex;
            let rookToSquareIndex;

            if (flags == F_KINGCASTLE) {
                if (this.turn == WHITE) {
                    rookFromSquareIndex = 7;
                    rookToSquareIndex = 5;
                }
                else {
                    rookFromSquareIndex = 63;
                    rookToSquareIndex = 61;
                }
            }
            else {
                if (this.turn == WHITE) {
                    rookFromSquareIndex = 0;
                    rookToSquareIndex = 3;
                }
                else {
                    rookFromSquareIndex = 56;
                    rookToSquareIndex = 59;
                }
            }

            const rookElement = getPieceElement(rookFromSquareIndex);
            rookElement.id = `piece${String(rookToSquareIndex).padStart(2, '0')}`;
            placeElementOnSquare(rookElement, rookToSquareIndex)
        }
    }
}

function playLoop() {
    if (checkedPlayMode && !isUserTurn()) {
        const moveString = lastEngineStat("bestmove");
        if (moveString) {
            doMove(moveString);
        }
    }
}

function dragPiece(event) {
    const pieceElement = event.target;
    let fromCol = Math.floor(parseFloat(pieceElement.style.marginLeft) / 100 * 8);
    let fromRow = 7 - Math.floor(parseFloat(pieceElement.style.marginTop) / 100 * 8);

    if (checkedFlip) {
        fromRow = 7 - fromRow;
        fromCol = 7 - fromCol;
    }

    const fromSquareIndex = fromRow * 8 + fromCol;
    const legalMoves = pos.get_legal_moves();

    legalMoves.forEach(moveEncoding => {
        if (get_from(moveEncoding) === fromSquareIndex) {
            const toSquareIndex = get_to(moveEncoding);
            highlight(toSquareIndex);
        }
    });

    function onMouseMove(event) {
        pieceElement.classList.add("grabbed");
        pieceElement.style.marginLeft = `${Math.round(event.clientX - board.getBoundingClientRect().left)}px`;
        pieceElement.style.marginTop = `${Math.round(event.clientY - board.getBoundingClientRect().top)}px`;
    }

    function onMouseUp(event) {
        pieceElement.classList.remove("grabbed");
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);

        let toCol = Math.floor((event.clientX - board.getBoundingClientRect().left) / board.getBoundingClientRect().width * 8);
        let toRow = 7 - Math.floor((event.clientY - board.getBoundingClientRect().top) / board.getBoundingClientRect().height * 8);

        if (checkedFlip) {
            toRow = 7 - toRow;
            toCol = 7 - toCol;
        }

        const toSquareIndex = toRow * 8 + toCol;
        const fromSquareString = squareIndexToString(fromSquareIndex);
        const toSquareString = squareIndexToString(toSquareIndex);
        doMove(fromSquareString + toSquareString);
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
}

function requestEngineStart() {
    const currentFen = pos.get_fen();
    if (engineWorker !== null && currentWorkerFen === currentFen) return;

    requestEngineStop();
    engineWorker = new Worker("worker.js");
    engineWorker.onmessage = function(event) {
        const outputElement = document.getElementById("output");
        outputElement.innerHTML = `${event.data}<br>${outputElement.innerHTML}`;
    };
    engineWorker.postMessage({ status: "start", fen: currentFen });
    currentWorkerFen = currentFen;
}

function requestEngineStop() {
    if (engineWorker !== null) {
        engineWorker.terminate();
        engineWorker = null;
    }
}

function requestEnginePosition() {
    if (checkedThink) {
        requestEngineStart();
    }
}

window.addEventListener('load', function() {
    board = document.getElementById("board");

    for (let i = 0; i < 64; i++) {
        placeElementOnSquare(getSquareElement(i), i);
    }

    drawPosition(pos);
    updateEngineThinking();
    updateOutputVisibility();
    updateArrowDisplay();
    updatePlayMode();

    document.getElementById("checkboxFlip").addEventListener('change', function() {
        updateSettings();
        clearBoard();
        drawPosition(pos);
    });
    document.getElementById("checkboxPlayMode").addEventListener('change', function() {
        updateSettings();
        updatePlayMode();
    });
    document.getElementById("checkboxThink").addEventListener('change', function() {
        updateSettings();
        updateEngineThinking();
    });
    document.getElementById("checkboxArrow").addEventListener('change', function() {
        updateSettings();
        updateArrowDisplay();
    });
    document.getElementById("checkboxOutput").addEventListener('change', function() {
        updateSettings();
        updateOutputVisibility();
    });
    document.getElementById("fen").addEventListener('input', function() {
        updateSettings();
        setFen(fen);
    });
    document.getElementById("thinktime").addEventListener('input', updateSettings);

    updateSettings();
});
