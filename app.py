#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Servidor Web para Sistema de Reconocimiento Facial
Ejecuta este archivo para levantar el servidor local
"""

import os
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler
import webbrowser
from pathlib import Path

class CustomHandler(SimpleHTTPRequestHandler):
    """Handler personalizado con mejor manejo de MIME types"""
    
    def end_headers(self):
        # Agregar headers para evitar problemas de CORS
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()
    
    def guess_type(self, path):
        """Mejorar detección de tipos MIME"""
        mimetype = super().guess_type(path)
        
        # Correcciones específicas
        if path.endswith('.js'):
            return 'application/javascript'
        elif path.endswith('.css'):
            return 'text/css'
        elif path.endswith('.html'):
            return 'text/html'
        elif path.endswith('.json'):
            return 'application/json'
        
        return mimetype
    
    def log_message(self, format, *args):
        """Personalizar mensajes de log"""
        print(f"📡 {self.address_string()} - {format % args}")


def main():
    # Configuración del servidor
    HOST = 'localhost'
    PORT = 8000
    
    # Verificar que los archivos existen
    required_files = ['index.html', 'script.js', 'styles.css']
    missing_files = [f for f in required_files if not os.path.exists(f)]
    
    if missing_files:
        print("❌ ERROR: Faltan los siguientes archivos:")
        for file in missing_files:
            print(f"   - {file}")
        print(f"\n💡 Asegúrate de ejecutar este script en la carpeta:")
        print(f"   C:\\Users\\Usuario\\Downloads\\proyecto reconocimiento facial\\")
        sys.exit(1)
    
    print("=" * 60)
    print("🔐 SISTEMA DE RECONOCIMIENTO FACIAL")
    print("=" * 60)
    print()
    print(f"✅ Archivos encontrados:")
    for file in required_files:
        size = os.path.getsize(file) / 1024  # KB
        print(f"   📄 {file} ({size:.1f} KB)")
    print()
    print(f"🚀 Iniciando servidor web...")
    print(f"📍 Host: {HOST}")
    print(f"🔌 Puerto: {PORT}")
    print(f"🌐 URL: http://{HOST}:{PORT}")
    print()
    print("=" * 60)
    print("💡 INSTRUCCIONES:")
    print("=" * 60)
    print("1. El servidor se está ejecutando")
    print("2. Abre tu navegador en: http://localhost:8000")
    print("3. Para detener el servidor: presiona Ctrl+C")
    print()
    print("🔒 Asegúrate de permitir el acceso a la cámara")
    print()
    print("=" * 60)
    print()
    
    # Crear servidor
    try:
        server = HTTPServer((HOST, PORT), CustomHandler)
        
        # Abrir navegador automáticamente
        print("🌐 Abriendo navegador automáticamente...")
        webbrowser.open(f'http://{HOST}:{PORT}')
        
        print()
        print("✅ Servidor iniciado correctamente!")
        print("⏳ Esperando conexiones...")
        print()
        print("-" * 60)
        print()
        
        # Iniciar servidor
        server.serve_forever()
        
    except KeyboardInterrupt:
        print()
        print()
        print("=" * 60)
        print("🛑 Deteniendo servidor...")
        print("=" * 60)
        server.shutdown()
        print("✅ Servidor detenido correctamente")
        print("👋 ¡Hasta pronto!")
        print()
        sys.exit(0)
        
    except OSError as e:
        if e.errno == 48 or e.errno == 10048:  # Puerto en uso
            print()
            print("❌ ERROR: El puerto 8000 ya está en uso")
            print()
            print("💡 Soluciones:")
            print("   1. Cierra otros servidores que estén corriendo")
            print("   2. O cambia el PORT en este archivo a otro número (ej: 8080)")
            print()
        else:
            print(f"❌ ERROR: {e}")
        sys.exit(1)
    
    except Exception as e:
        print(f"❌ ERROR inesperado: {e}")
        sys.exit(1)


if __name__ == '__main__':
    # Cambiar al directorio del script
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    main()