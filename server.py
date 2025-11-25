import os
from flask import Flask, send_from_directory

# Detecta la ruta absoluta donde está este archivo
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = Flask(__name__, static_folder=BASE_DIR, static_url_path='')

@app.route("/")
def serve_index():
    # Sirve index.html desde la carpeta base
    return send_from_directory(BASE_DIR, "index.html")

@app.route("/<path:path>")
def static_files(path):
    # Sirve cualquier archivo solicitado (CSS, JS, imágenes, etc.)
    return send_from_directory(BASE_DIR, path)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
