"""Flask API. On Vercel this file is the Python serverless function; locally: flask --app api/index run"""
import os
import sys

from flask import Flask, jsonify, request

sys.path.insert(0, os.path.dirname(__file__))
from _compiler.pipeline import compile_source  # noqa: E402

MAX_SOURCE_CHARS = 10_000

app = Flask(__name__)


@app.post("/api/compile")
def compile_route():
    body = request.get_json(silent=True) or {}
    src = body.get("source")
    if not isinstance(src, str):
        return jsonify(ok=False, phase="request", error={"msg": 'Send JSON like {"source": "int a;"}'}), 400
    if len(src) > MAX_SOURCE_CHARS:
        return jsonify(ok=False, phase="request",
                       error={"msg": f"Program too long (max {MAX_SOURCE_CHARS} characters)"}), 413
    try:
        return jsonify(compile_source(src))
    except Exception:
        app.logger.exception("compiler crashed")
        return jsonify(ok=False, phase="internal", error={"msg": "Internal compiler error"}), 500
