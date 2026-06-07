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
import json
from collections import OrderedDict

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
API_TARGET = "http://localhost:8000"
STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist")


class DashboardHandler(http.server.SimpleHTTPRequestHandler):
    mongo_client = None

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=STATIC_DIR, **kwargs)

    @classmethod
    def _get_mongo(cls):
        if cls.mongo_client is None:
            from pymongo import MongoClient
            cls.mongo_client = MongoClient("mongodb://localhost:27017")
        return cls.mongo_client["openf1-livetiming"]

    def do_GET(self):
        if self.path.startswith("/v1/"):
            return self._proxy_api()
        if self.path == "/api/location/current":
            return self._get_latest_locations()
        if not self._is_static_path():
            self.path = "/"
        return super().do_GET()

    def _get_latest_locations(self):
        """Returns the latest X/Y/Z location for each driver in the current session."""
        try:
            import urllib.request
            # First get the current session key
            req = urllib.request.Request(f"{API_TARGET}/v1/sessions?session_key=latest")
            with urllib.request.urlopen(req, timeout=10) as resp:
                sessions = json.loads(resp.read().decode())
            if not sessions:
                self._send_json([])
                return
            session_key = sessions[0]["session_key"]

            # Query MongoDB directly (bypass slow OpenF1 aggregation pipeline)
            db = self._get_mongo()
            pipeline = [
                {"$match": {"session_key": session_key, "x": {"$ne": 0}, "y": {"$ne": 0}}},
                {"$sort": {"date": -1}},
                {"$group": {"_id": "$driver_number", "doc": {"$first": "$$ROOT"}}},
                {"$replaceRoot": {"newRoot": "$doc"}},
                {"$project": {"_id": 0, "_key": 0, "meeting_key": 0, "session_key": 0}}
            ]
            results = list(db.location.aggregate(pipeline, maxTimeMS=10000))
            # Convert dates to ISO strings
            for r in results:
                if "date" in r and hasattr(r["date"], "isoformat"):
                    r["date"] = r["date"].isoformat()
            self._send_json(results)
        except Exception as e:
            self._send_json({"error": str(e)}, status=500)

    def _send_json(self, data, status=200):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

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
