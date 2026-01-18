from typing import List, Optional, Tuple


Board = List[str]


WIN_LINES: Tuple[Tuple[int, int, int], ...] = (
    (0, 1, 2),
    (3, 4, 5),
    (6, 7, 8),
    (0, 3, 6),
    (1, 4, 7),
    (2, 5, 8),
    (0, 4, 8),
    (2, 4, 6),
)


def render_board(board: Board) -> str:
    rows = []
    for row in range(3):
        start = row * 3
        cells = [board[start + col] for col in range(3)]
        rows.append(" | ".join(cells))
    return "\n---------\n".join(rows)


def check_winner(board: Board) -> Optional[str]:
    for a, b, c in WIN_LINES:
        if board[a] != " " and board[a] == board[b] == board[c]:
            return board[a]
    return None


def board_full(board: Board) -> bool:
    return all(cell != " " for cell in board)


def parse_move(raw: str) -> Optional[int]:
    try:
        value = int(raw.strip())
    except ValueError:
        return None
    if 1 <= value <= 9:
        return value - 1
    return None


def prompt_move(player: str, board: Board) -> int:
    while True:
        move = input(f"Player {player}, pick a square (1-9): ")
        index = parse_move(move)
        if index is None:
            print("Please enter a number from 1 to 9.")
            continue
        if board[index] != " ":
            print("That square is already taken. Try again.")
            continue
        return index


def play_game() -> None:
    board: Board = [" "] * 9
    current_player = "X"
    while True:
        print()
        print(render_board(board))
        print()
        move_index = prompt_move(current_player, board)
        board[move_index] = current_player
        winner = check_winner(board)
        if winner:
            print()
            print(render_board(board))
            print()
            print(f"Player {winner} wins!")
            return
        if board_full(board):
            print()
            print(render_board(board))
            print()
            print("It's a draw!")
            return
        current_player = "O" if current_player == "X" else "X"


if __name__ == "__main__":
    print("Welcome to Tic-Tac-Toe!")
    print("Squares are numbered 1-9 left-to-right, top-to-bottom.")
    play_game()
