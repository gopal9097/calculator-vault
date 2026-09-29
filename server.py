#!/usr/bin/env python3
import http.server
import socketserver
import os
import sys
import mimetypes

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("application/javascript", ".mjs")
mimetypes.add_type("text/css", ".css")
mimetypes.add_type("image/svg+xml", ".svg")
mimetypes.add_type("application/json", ".json")

class SecureHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache, must-revalidate")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "SAMEORIGIN")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

    def log_message(self, format, *args):
        sys.stdout.write(f"[{self.log_date_time_string()}] {format % args}\n")
        sys.stdout.flush()

def run_server():
    port = PORT
    max_port = PORT + 10

    while port <= max_port:
        try:
            socketserver.TCPServer.allow_reuse_address = True
            with socketserver.TCPServer(("", port), SecureHTTPRequestHandler) as httpd:
                print(f"Serving at http://localhost:{port}/ (Press Ctrl+C to stop)")
                httpd.serve_forever()
        except OSError as e:
            if e.errno == 48:
                port += 1
            else:
                print(f"Error: {e}")
                sys.exit(1)
        except KeyboardInterrupt:
            print("\nServer stopped.")
            sys.exit(0)

if __name__ == "__main__":
    run_server()
