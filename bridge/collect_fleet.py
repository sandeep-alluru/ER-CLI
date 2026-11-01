"""Read configured fleet sources and emit one normalized snapshot on stdout."""
import hashlib
import json
from pathlib import Path
import re
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


def transcript_activity(path):
    """Read activity and output; the board alone supplies session state."""
    p = Path(path).expanduser()
    if not p.is_file():
        return None
    timestamp, decision, output = None, None, None
    with p.open("rb") as f:
        f.seek(max(0, p.stat().st_size - 256_000))
        tail = f.read().decode("utf-8", errors="replace")
    for line in tail.splitlines():
        try:
            event = json.loads(line)
        except ValueError:
            continue
        value = event.get("timestamp")
        if isinstance(value, str):
            try:
                value = datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()
                timestamp = max(timestamp or value, value)
            except ValueError:
                pass
        payload = event.get("payload", {})
        if not isinstance(payload, dict):
            continue
        kind = payload.get("type") or event.get("subtype")
        if kind in ("request_user_input", "approval_requested"):
            decision = clean(payload.get("question") or payload.get("message")) or None
        output = clean(payload.get("last_agent_message")) or output
    return {"timestamp": timestamp, "decision": decision, "output": output}


def collect(config):
    now = time.time()
    stale_after = config.get("stale_after_seconds", 900)
    records, sources, errors = [], [], []
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
                state = re.sub(r"[\s-]+", "_", row["State"].upper())
                normalized = {
                    "ACTIVE": "working", "RUNNING": "working", "WORKING": "working",
                    "OUTPUT_READY": "done", "CLOSED": "done", "DONE": "done",
                    "FAILED": "failed", "ERROR": "failed",
                    "NEEDS_DECISION": "needs-decision", "WAITING_INPUT": "needs-decision",
                    "PARKED": "parked", "IDLE": "parked", "WAITING": "parked",
                }.get(state)
                if normalized not in ("working", "parked", "needs-decision"):
                    continue
                activity = transcript_activity(row["Transcript"])
                updated = activity["timestamp"] if activity and activity["timestamp"] else st.st_mtime
                record_stale = now - updated > stale_after
                if record_stale:
                    continue
                records.append({
                    "id": "board:" + name,
                    "name": name, "state": normalized,
                    "current_task": clean(row["Task"]),
                    "last_artifact": file_evidence(row.get("Expected output", "")),
                    "last_output": activity["output"] if activity else None,
                    "pending_decision": (activity["decision"] if activity and activity["decision"] else clean(row.get("Decision")) or None) if normalized == "needs-decision" else None,
                    "updated_at": iso(updated), "source": "board",
                    "source_state": state, "source_stale": record_stale,
                })
            sources.append({"name": "board", "updated_at": iso(st.st_mtime), "stale": stale, "records": len(records), "inspected_records": len(parsed), "sha256": hashlib.sha256(text.encode()).hexdigest()})
        except (OSError, ValueError) as e:
            errors.append({"source": "board", "error": type(e).__name__})

    if not sources:
        raise ValueError("configure an accessible board registry")
    seen = set()
    for record in records:
        if record["id"] in seen:
            raise ValueError("duplicate session identifier")
        seen.add(record["id"])
    priority = {"working": 0, "parked": 1, "needs-decision": 1}
    records.sort(key=lambda r: (priority[r["state"]], -datetime.fromisoformat(r["updated_at"]).timestamp(), r["id"]))
    digest = hashlib.sha256(json.dumps({"records": records, "sources": sources}, sort_keys=True).encode()).hexdigest()
    return {"schema_version": 1, "snapshot_id": digest, "generated_at": iso(now), "records": records, "sources": sources, "source_errors": errors}


if __name__ == "__main__":
    try:
        print(json.dumps(collect(json.load(sys.stdin))))
    except Exception as e:
        print(json.dumps({"error": "fleet source unavailable", "kind": type(e).__name__}))
        sys.exit(1)
