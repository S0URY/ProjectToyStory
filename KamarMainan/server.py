import http.server
import socket
import sys

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

PORT = 8085

class NoCacheHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

class DualStackServer(http.server.ThreadingHTTPServer):
    address_family = socket.AF_INET6
    def server_bind(self):
        try:
            self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        except (AttributeError, OSError):
            pass
        return super().server_bind()

if __name__ == '__main__':
    try:
        httpd = DualStackServer(('::', PORT), NoCacheHTTPRequestHandler)
    except Exception:
        # Fallback to standard IPv4 if IPv6 dual-stack is unavailable
        httpd = http.server.ThreadingHTTPServer(('0.0.0.0', PORT), NoCacheHTTPRequestHandler)

    print(f"=======================================================")
    print(f"Server Wheezy Penguin WebGL AKTIF!")
    print(f"Akses browser di: http://localhost:{PORT}/index.html")
    print(f"Atau alternatif:  http://127.0.0.1:{PORT}/index.html")
    print(f"=======================================================")
    sys.stdout.flush()

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()
