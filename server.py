from flask import Flask, send_from_directory

# Flask servirá tus archivos estáticos (index.html, script.js, styles.css, imágenes, etc.)
app = Flask(__name__, static_folder='.', static_url_path='')

@app.route('/')
def serve_index():
    # Sirve el archivo principal
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    # Sirve cualquier otro archivo solicitado por el navegador
    return send_from_directory('.', path)

if __name__ == '__main__':
    # Modo local para pruebas
    app.run(host='0.0.0.0', port=5000, debug=True)
