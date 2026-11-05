"""Isolated public OCR image URL-gate regression tests without URL fetches."""
import ast
import ipaddress
from pathlib import Path
import re
import unittest
import urllib.parse

SOURCE = Path(__file__).resolve().parents[2] / 'scripts/audit/coffee-corpus-image-audit.py'
tree = ast.parse(SOURCE.read_text(encoding='utf-8'), filename=str(SOURCE))
nodes = [node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == 'target']
if len(nodes) != 1:
    raise AssertionError('Missing or duplicated original source target()')
scope = {'ipaddress': ipaddress, 're': re, 'urllib': urllib}
exec(compile(ast.Module(body=nodes, type_ignores=[]), str(SOURCE), 'exec'), scope)
target = scope['target']


class SourceImageUrlGateTest(unittest.TestCase):
    def test_allowed_https_and_metadata(self):
        self.assertEqual(target('https://example.com/coffee.png'), 'https://example.com/coffee.png')
        self.assertEqual(target('//example.com/coffee.png'), 'https://example.com/coffee.png')
        self.assertEqual(target({'src': 'https://example.com/coffee.png'}), 'https://example.com/coffee.png')
        self.assertEqual(target({'contentUrl': 'https://example.com/coffee.png'}), 'https://example.com/coffee.png')

    def test_invalid_ports_and_ipv6_never_throw(self):
        for url in ('https://example.com:notaport/coffee.png',
                    'https://example.com:99999/coffee.png',
                    'https://example.com:0/coffee.png',
                    'https://example.com:443/coffee.png',
                    'https://[::1/coffee.png'):
            with self.subTest(url=url):
                self.assertIsNone(target(url))

    def test_existing_disallowed_hosts_and_schemes(self):
        for url in ('http://example.com/coffee.png',
                    'https://user:password@example.com/coffee.png',
                    'https://127.0.0.1/coffee.png',
                    'https://service.internal/coffee.png',
                    'https://localhost/coffee.png', None):
            with self.subTest(url=url):
                self.assertIsNone(target(url))

    def test_trailing_dot_private_hosts_rejected_without_network(self):
        for url in ('https://localhost./coffee.png',
                    'https://localhost.../coffee.png',
                    'https://service.internal./coffee.png',
                    'https://host.local./coffee.png',
                    'https://127.0.0.1./coffee.png'):
            with self.subTest(url=url):
                self.assertIsNone(target(url))
        # Absolute-form public DNS names remain acceptable.
        self.assertEqual(target('https://public.example./coffee.png'), 'https://public.example./coffee.png')

    def test_target_isolation_has_no_download_calls(self):
        self.assertFalse(any(isinstance(node, ast.Call)
                             and isinstance(node.func, ast.Attribute)
                             and node.func.attr in ('urlopen', 'open')
                             for node in ast.walk(nodes[0])))


if __name__ == '__main__':
    unittest.main()
