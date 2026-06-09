#!/usr/bin/env python3
"""
F1 Dashboard + API Proxy Server (React SPA)
Serves the React build from dist/ and proxies /v1/* to the OpenF1 API.
All non-API, non-static routes -> index.html for client-side routing.
"""
import http.server
import urllib.request
import urllib.error
import os
import sys
import subprocess

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
API_TARGET = "http://localhost:8000"
STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist")


class DashboardHandler(http.server.SimpleHTTPRequestHandler):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=STATIC_DIR, **kwargs)

    def do_GET(self):
        if self.path.startswith("/v1/radio-proxy/"):
            return self._proxy_team_radio()
        if self.path.startswith("/v1/"):
            return self._proxy_api()
        if not self._is_static_path():
            self.path = "/"
        return super().do_GET()

    def _is_static_path(self):
        if self.path in ("/", ""):
            return True
        path = self.path.split("?")[0].split("#")[0]
        filepath = os.path.join(STATIC_DIR, path.lstrip("/"))
        if os.path.isfile(filepath):
            return True
        if os.path.isfile(os.path.join(filepath, "index.html")):
            return True
        return False

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.end_headers()

    def _proxy_team_radio(self):
        """Proxy team radio audio through the SSH tunnel using curl --connect-to."""
        path = self.path[len("/v1/radio-proxy/"):]
        url = f"https://livetiming.formula1.com/static/{path}"
        cmd = [
            "curl", "-s",
            "--connect-to", "livetiming.formula1.com:443:localhost:1443",
            url,
        ]
        try:
            proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            self.send_response(200)
            self.send_header("Content-Type", "audio/mpeg")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            while True:
                chunk = proc.stdout.read(65536)
                if not chunk:
                    break
                self.wfile.write(chunk)
            proc.wait()
        except Exception as e:
            self.send_response(502)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(f'{{"error": "Radio proxy failed: {str(e)}"}}'.encode())

    def _proxy_api(self):
        target_url = f"{API_TARGET}{self.path}"
        for attempt in range(3):
            try:
                req = urllib.request.Request(target_url)
                with urllib.request.urlopen(req, timeout=15) as resp:
                    data = resp.read()
                    self.send_response(resp.status)
                    self.send_header("Content-Type", resp.headers.get("Content-Type", "application/json"))
                    self.send_header("Content-Length", str(len(data)))
                    self.send_header("Access-Control-Allow-Origin", "*")
                    self.end_headers()
                    self.wfile.write(data)
                    return
            except urllib.error.HTTPError as e:
                if e.code == 429 and attempt < 2:
                    import time
                    time.sleep(0.5 * (attempt + 1))
                    continue
                self.send_response(e.code)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(f'{{"error": "OpenF1 API returned {e.code}: {e.reason}"}}'.encode())
                return
            except urllib.error.URLError as e:
                self.send_response(502)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(f'{{"error": "OpenF1 API unreachable: {e.reason}"}}'.encode())
                return
            except Exception as e:
                self.send_response(502)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(f'{{"error": "Proxy error: {str(e)}"}}'.encode())
                return

    def log_message(self, format, *args):
        method, path, code = args[0], args[1], args[2]
        if path.startswith("/v1/") or path.startswith("/assets/"):
            return
        print(f"[{self.address_string()}] {method} {path} {code}")


if __name__ == "__main__":
    print(f"🏎️  F1 Dashboard (React SPA) + API Proxy")
    print(f"   URL:  http://localhost:{PORT}")
    print(f"   API:  {API_TARGET}")
    print(f"   Dir:  {STATIC_DIR}")
    print()
    print(f"   Live:     http://localhost:{PORT}/")
    print(f"   History:  http://localhost:{PORT}/historical")
    print()

    if not os.path.isdir(STATIC_DIR):
        print(f"⚠️  Build directory not found: {STATIC_DIR}")
        print(f"   Run: pnpm build")
        sys.exit(1)

    server = http.server.HTTPServer(("0.0.0.0", PORT), DashboardHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down...")
        server.shutdown()
