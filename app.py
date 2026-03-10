from flask import Flask, render_template, request, jsonify, session
import random
import os

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "wordle-secret-key")

WORDS = [
    "apple", "brave", "crane", "delta", "eagle", "flame", "grace", "happy",
    "igloo", "juice", "knack", "lemon", "magic", "ocean", "piano", "queen",
    "river", "snake", "tiger", "ultra", "vivid", "whale", "yacht", "zebra",
    "blaze", "chess", "drift", "earth", "fiber", "giant", "haste", "ideal",
    "joker", "kneel", "lunar", "maple", "noble", "olive", "pixel", "quest",
    "reset", "storm", "taste", "vibes", "water", "angel", "brick", "cloud",
    "dance", "elder", "frost", "globe", "honor", "jewel", "karma", "lance",
    "night", "ozone", "pearl", "quirk", "reign", "sword", "truce", "venom",
    "yearn", "bench", "chirp", "drape", "epoch", "groan", "hinge", "lusty",
    "nurse", "orbit", "plume", "rainy", "scone", "thumb", "valve", "woven",
    "yield", "abyss", "blunt", "crisp", "depth", "fresh", "grind", "irony",
    "light", "media", "nerve", "oxide", "relic", "spice", "thorn", "unite",
    "yummy", "zesty", "slope", "champ", "brisk", "ember", "scout", "bliss",
    "flair", "grasp", "prism", "stomp", "crave", "dwell", "gleam", "infer",
]

MAX_ATTEMPTS = 6
WORD_LENGTH = 5

def evaluate_guess(guess, target):
    result = []
    target_chars = list(target)
    guess_chars = list(guess)
    statuses = [""] * WORD_LENGTH
    for i in range(WORD_LENGTH):
        if guess_chars[i] == target_chars[i]:
            statuses[i] = "correct"
            target_chars[i] = None
            guess_chars[i] = None
    for i in range(WORD_LENGTH):
        if guess_chars[i] is None:
            continue
        if guess_chars[i] in target_chars:
            statuses[i] = "present"
            target_chars[target_chars.index(guess_chars[i])] = None
        else:
            statuses[i] = "absent"
    for i in range(WORD_LENGTH):
        result.append({"letter": guess[i], "status": statuses[i]})
    return result

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/new-game", methods=["POST"])
def new_game():
    session["target"] = random.choice(WORDS)
    session["attempts"] = 0
    session["game_over"] = False
    session["won"] = False
    return jsonify({"status": "ok", "max_attempts": MAX_ATTEMPTS, "word_length": WORD_LENGTH})

@app.route("/api/guess", methods=["POST"])
def guess():
    data = request.get_json()
    if not data or "guess" not in data:
        return jsonify({"error": "No guess provided"}), 400
    player_guess = data["guess"].strip().lower()
    if len(player_guess) != WORD_LENGTH:
        return jsonify({"error": f"Guess must be {WORD_LENGTH} letters"}), 400
    if not player_guess.isalpha():
        return jsonify({"error": "Only letters allowed"}), 400
    if session.get("game_over"):
        return jsonify({"error": "Game is over. Start a new game!"}), 400
    target = session.get("target")
    if not target:
        return jsonify({"error": "No active game. Start a new game!"}), 400
    evaluation = evaluate_guess(player_guess, target)
    session["attempts"] = session.get("attempts", 0) + 1
    won = player_guess == target
    attempts_used = session["attempts"]
    game_over = won or attempts_used >= MAX_ATTEMPTS
    session["game_over"] = game_over
    session["won"] = won
    response = {
        "evaluation": evaluation,
        "attempts_used": attempts_used,
        "max_attempts": MAX_ATTEMPTS,
        "won": won,
        "game_over": game_over,
    }
    if game_over:
        response["target"] = target
    return jsonify(response)

@app.route("/api/state", methods=["GET"])
def state():
    return jsonify({
        "active": "target" in session,
        "attempts_used": session.get("attempts", 0),
        "game_over": session.get("game_over", False),
        "won": session.get("won", False),
    })

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=True, host="0.0.0.0", port=port)
