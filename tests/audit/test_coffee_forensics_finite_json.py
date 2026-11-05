"""Isolated original-source forensic JSON decoding regression; no downloads or credentials."""
import ast
import json
import math
from pathlib import Path
import unittest

SOURCE = Path(__file__).resolve().parents[2] / "scripts/audit/coffee-reviewed-change-forensics.py"
tree = ast.parse(SOURCE.read_text(encoding="utf-8"), filename=str(SOURCE))
nodes = [node for node in tree.body if isinstance(node, ast.FunctionDef)
         and node.name in ("require", "decode_json")]
if len(nodes) != 2:
    raise AssertionError("Expected exactly one require and decode_json source function")
scope = {"json": json, "math": math}
exec(compile(ast.Module(body=nodes, type_ignores=[]), str(SOURCE), "exec"), scope)
decode_json = scope["decode_json"]


class FiniteForensicJsonTest(unittest.TestCase):
    def test_nonfinite_literals_and_exponent_overflows_rejected(self):
        for raw in (b"NaN", b"Infinity", b"-Infinity", b"1e999", b"-1e999",
                    b'[1e999]', b'{"nested":{"x":-1e999}}'):
            with self.subTest(raw=raw), self.assertRaisesRegex(ValueError, "nonfinite JSON number"):
                decode_json(raw)

    def test_finite_numbers_and_duplicate_key_integrity_preserved(self):
        value = decode_json(b'{"x":1.25,"a":[1e308,-1e-308],"i":9007199254740993}')
        self.assertEqual(value, {"x": 1.25, "a": [1e308, -1e-308], "i": 9007199254740993})
        with self.assertRaisesRegex(ValueError, "duplicate JSON property"):
            decode_json(b'{"x":1,"x":2}')


if __name__ == "__main__":
    unittest.main()
