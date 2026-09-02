from collections.abc import Hashable
from typing import Any


def replace_nested(payload: dict, path: tuple[Hashable, ...], value: Any) -> dict:
    current = dict(payload)
    root = current
    for key in path[:-1]:
        next_value = current[key]
        copied = list(next_value) if isinstance(next_value, list) else dict(next_value)
        current[key] = copied
        current = copied
    current[path[-1]] = value
    return root


def add_nested(payload: dict, path: tuple[Hashable, ...], key: Hashable, value: Any) -> dict:
    current = dict(payload)
    root = current
    for path_key in path:
        next_value = current[path_key]
        copied = list(next_value) if isinstance(next_value, list) else dict(next_value)
        current[path_key] = copied
        current = copied
    current[key] = value
    return root


def project_document(document: dict, projection: dict) -> dict:
    excluded = {key for key, value in projection.items() if value == 0}
    included = {key for key, value in projection.items() if value == 1}
    if included:
        return {key: document[key] for key in included if key in document and key not in excluded}
    return {key: value for key, value in document.items() if key not in excluded}
