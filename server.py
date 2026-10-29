#!/usr/bin/env python3
"""Static file server for the poster-maker web UI. No third-party dependencies."""

import argparse
import functools
import http.server
import os
import socketserver
import threading
import webbrowser

WEB_ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "web")


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # The UI is served from a local file tree; never let the browser cache a stale build.
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def main():
    parser = argparse.ArgumentParser(description="poster-maker local server")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--no-browser", action="store_true", help="do not open a browser window")
    args = parser.parse_args()

    socketserver.TCPServer.allow_reuse_address = True
    handler = functools.partial(Handler, directory=WEB_ROOT)
    with socketserver.TCPServer(("127.0.0.1", args.port), handler) as httpd:
        url = "http://127.0.0.1:%d/" % args.port
        print("poster-maker running at %s  (Ctrl+C to stop)" % url)
        if not args.no_browser:
            threading.Timer(0.5, webbrowser.open, args=[url]).start()
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nstopped")


if __name__ == "__main__":
    main()
