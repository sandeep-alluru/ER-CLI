"""Read configured fleet sources and emit one normalized snapshot on stdout."""
import hashlib
import json
from pathlib import Path
import re
import sqlite3
import sys
import time
from datetime import datetime, timezone


def iso(seconds):
    return datetime.fromtimestamp(seconds, timezone.utc).isoformat()


def clean(value, limit=500):
    return re.sub(r"[\x00-\x1f\x7f]", " ", str(value or "")).strip()[:limit]


def rows(text):
    table = []
    headers = None
    for line in text.splitlines():
        if not line.startswith("|"):
            continue
        cells = [x.strip().strip("`") for x in re.split(r"(?<!\\)\|", line)[1:-1]]
        if headers is None:
            headers = cells
        elif cells and not all(re.fullmatch(r"[: -]+", x) for x in cells):
            if len(cells) != len(headers):
                raise ValueError("board table column count changed")
            table.append(dict(zip(headers, cells)))
    if not headers or not {"Session", "State", "Task", "Transcript"}.issubset(headers):
        raise ValueError("board requires Session, State, Task and Transcript columns")
    return table


def file_evidence(path):
    p = Path(path).expanduser()
    if not p.is_file():
        return None
    st = p.stat()
    return {"name": p.name, "updated_at": iso(st.st_mtime), "bytes": st.st_size}


def transcript_state(path, fallback):
    """Project explicit lifecycle events; retain the recorded state otherwise."""
    p = Path(path).expanduser()
    if not p.is_file():
        return None
    state, timestamp, event_kind, decision, output = fallback, None, None, None, None
    with p.open("rb") as f:
        f.seek(max(0, p.stat().st_size - 256_000))
        tail = f.read().decode("utf-8", errors="replace")
    for line in tail.splitlines():
        try:
            event = json.loads(line)
        except ValueError:
            continue
        payload = event.get("payload", {})
        if not isinstance(payload, dict):
            continue
        kind = payload.get("type") or event.get("subtype")
        if event.get("type") == "response_item" and payload.get("type") == "function_call":
            state, event_kind = "working", "tool_call"
        elif kind in ("task_started", "turn_started"):
            state, event_kind = "working", kind
        elif kind in ("task_complete", "turn_complete", "turn_duration"):
            state, event_kind = ("done" if fallback == "done" else "parked"), kind
            output = clean(payload.get("last_agent_message")) or output
        elif kind in ("task_failed", "turn_failed"):
            state, event_kind = "failed", kind
        elif kind in ("turn_aborted", "task_cancelled"):
            state, event_kind = "parked", kind
        elif kind in ("request_user_input", "approval_requested"):
            state, event_kind = "needs-decision", kind
            decision = clean(payload.get("question") or payload.get("message")) or None
        if event_kind:
            value = event.get("timestamp")
            if isinstance(value, str):
                try:
                    timestamp = datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()
                except ValueError:
                    pass
    return {"state": state, "timestamp": timestamp, "event_kind": event_kind, "decision": decision, "output": output} if event_kind else None


def collect(config):
    now = time.time()
    stale_after = config.get("stale_after_seconds", 900)
    records, sources, errors = [], [], []
    board_sessions = set()
    board = config.get("board_registry")
    if board:
        try:
            p = Path(board).expanduser()
            st = p.stat()
            text = p.read_text()
            stale = now - st.st_mtime > stale_after
            parsed = rows(text)
            for row in parsed:
                name = clean(row["Session"], 120)
                if not name:
                    raise ValueError("board session name is empty")
                sid = re.findall(r"[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}", row["Transcript"])
                if sid:
                    board_sessions.add(sid[-1])
                state = re.sub(r"[\s-]+", "_", row["State"].upper())
                normalized = {
                    "ACTIVE": "working", "RUNNING": "working", "WORKING": "working",
                    "OUTPUT_READY": "done", "CLOSED": "done", "DONE": "done",
                    "FAILED": "failed", "ERROR": "failed",
                    "NEEDS_DECISION": "needs-decision", "WAITING_INPUT": "needs-decision",
                }.get(state, "parked")
                activity = transcript_state(row["Transcript"], normalized)
                updated = activity["timestamp"] if activity and activity["timestamp"] else st.st_mtime
                if activity:
                    normalized = activity["state"]
                record_stale = now - updated > stale_after
                records.append({
                    "id": "board:" + name,
                    "name": name, "state": normalized,
                    "current_task": clean(row["Task"]),
                    "last_artifact": file_evidence(row.get("Expected output", "")),
                    "last_output": activity["output"] if activity else None,
                    "pending_decision": (activity["decision"] if activity and activity["decision"] else clean(row.get("Decision")) or None) if normalized == "needs-decision" else None,
                    "updated_at": iso(updated), "source": "board+harness" if activity else "board",
                    "source_state": activity["event_kind"] if activity else state, "source_stale": record_stale,
                })
            sources.append({"name": "board", "updated_at": iso(st.st_mtime), "stale": stale, "records": len(parsed), "sha256": hashlib.sha256(text.encode()).hexdigest()})
        except (OSError, ValueError) as e:
            errors.append({"source": "board", "error": type(e).__name__})

    index = config.get("harness_index")
    if index:
        try:
            p = Path(index).expanduser().resolve()
            with sqlite3.connect(p.as_uri() + "?mode=ro", uri=True) as con:
                con.row_factory = sqlite3.Row
                data = con.execute("SELECT session_id, session_name, title, session_log_path, updated_at_us FROM sessions ORDER BY updated_at_us DESC LIMIT 1000").fetchall()
            count = 0
            for row in data:
                if row["session_id"] in board_sessions:
                    continue
                updated = (row["updated_at_us"] or 0) / 1_000_000
                state, decision, output, last_output = "parked", None, None, None
                log = Path(row["session_log_path"] or "")
                if log.is_file():
                    with log.open("rb") as f:
                        f.seek(max(0, log.stat().st_size - 512_000))
                        tail = f.read().decode("utf-8", errors="replace")
                    for line in tail.splitlines():
                        try:
                            event = json.loads(line)
                        except ValueError:
                            continue
                        payload = event.get("payload", {})
                        inner = payload.get("event", {}) if isinstance(payload, dict) else {}
                        if not isinstance(inner, dict):
                            continue
                        kind = inner.get("kind")
                        if kind == "terminal":
                            terminal = inner.get("terminal")
                            state = {"failed": "failed", "completed": "done", "succeeded": "done", "cancelled": "parked"}.get(terminal, "parked")
                            last_output = clean(inner.get("reason")) or last_output
                        elif kind in ("needs_input", "decision_requested"):
                            state, decision = "needs-decision", clean(inner.get("question") or inner.get("reason"))
                        elif kind in ("started", "turn_started"):
                            state = "working" if now - updated <= stale_after else "parked"
                        if inner.get("artifact"):
                            output = {"name": clean(inner["artifact"]), "updated_at": iso(updated), "bytes": None}
                records.append({
                    "id": "harness:" + row["session_id"],
                    "name": clean(row["session_name"] or row["title"] or row["session_id"], 120),
                    "state": state, "current_task": clean(row["title"]),
                    "last_artifact": output, "last_output": last_output, "pending_decision": decision,
                    "updated_at": iso(updated) if updated else None,
                    "source": "harness", "source_state": state,
                    "source_stale": now - updated > stale_after,
                })
                count += 1
            sources.append({"name": "harness", "updated_at": iso(p.stat().st_mtime), "records": count})
        except (OSError, sqlite3.Error) as e:
            errors.append({"source": "harness", "error": type(e).__name__})

    if not sources:
        raise ValueError("configure an accessible board registry or harness index")
    seen = set()
    for record in records:
        if record["id"] in seen:
            raise ValueError("duplicate session identifier")
        seen.add(record["id"])
    priority = {"needs-decision": 0, "failed": 1, "working": 2, "parked": 3, "done": 4}
    records.sort(key=lambda r: (priority[r["state"]], r["name"]))
    digest = hashlib.sha256(json.dumps({"records": records, "sources": sources}, sort_keys=True).encode()).hexdigest()
    return {"schema_version": 1, "snapshot_id": digest, "generated_at": iso(now), "records": records, "sources": sources, "source_errors": errors}


if __name__ == "__main__":
    try:
        print(json.dumps(collect(json.load(sys.stdin))))
    except Exception as e:
        print(json.dumps({"error": "fleet source unavailable", "kind": type(e).__name__}))
        sys.exit(1)
