#!/usr/bin/env python3
import os
import struct
import re
import ast

def parse_po_string(raw):
    # Find all quoted segments in the msgid/msgstr block and concatenate evaluated strings
    parts = re.findall(r'"((?:\\.|[^"\\])*)"', raw)
    res = []
    for p in parts:
        res.append(ast.literal_eval(f'"{p}"'))
    return "".join(res)

def compile_po_to_mo(po_path, mo_path):
    entries = {}
    with open(po_path, 'r', encoding='utf-8') as f:
        content = f.read()

    pattern = re.compile(r'msgid\s+(".*?"(?:\s+".*?")*)\s+msgstr\s+(".*?"(?:\s+".*?")*)', re.DOTALL)
    for match in pattern.finditer(content):
        msgid = parse_po_string(match.group(1))
        msgstr = parse_po_string(match.group(2))
        if msgstr:
            entries[msgid] = msgstr

    keys = sorted(entries.keys())
    offsets = []
    ids = b''
    strs = b''
    for key in keys:
        val = entries[key]
        key_bytes = key.encode('utf-8')
        val_bytes = val.encode('utf-8')
        offsets.append((len(ids), len(key_bytes), len(strs), len(val_bytes)))
        ids += key_bytes + b'\x00'
        strs += val_bytes + b'\x00'

    keystart = 7 * 4 + 16 * len(keys)
    valstart = keystart + len(ids)
    koff = []
    voff = []
    for o1, l1, o2, l2 in offsets:
        koff.append((l1, o1 + keystart))
        voff.append((l2, o2 + valstart))

    output = struct.pack('Iiiiiii', 0x950412de, 0, len(keys), 7 * 4, 7 * 4 + 8 * len(keys), 0, 0)
    for l, o in koff:
        output += struct.pack('ii', l, o)
    for l, o in voff:
        output += struct.pack('ii', l, o)
    output += ids + strs

    os.makedirs(os.path.dirname(mo_path), exist_ok=True)
    with open(mo_path, 'wb') as f:
        f.write(output)
    print(f"Compiled {len(keys)} translations into {mo_path}")

if __name__ == '__main__':
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    po_file = os.path.join(base_dir, 'po', 'ru.po')
    for locale in ['ru', 'ru_RU']:
        mo_file = os.path.join(base_dir, 'extension', 'locale', locale, 'LC_MESSAGES', 'switchback.mo')
        compile_po_to_mo(po_file, mo_file)
